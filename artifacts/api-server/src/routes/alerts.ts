import { Router, type IRouter } from "express";
import { db, alertsTable, neighborhoodUsersTable, eq, desc } from "@workspace/db";
import { CreateAlertBody } from "@workspace/api-zod";
import { getOrCreateNeighborhoodUser } from "./users.js";

const router = Router();

function formatAlert(a: any, reporter: any) {
  return {
    id: a.id,
    reporterId: a.reporterId,
    reporter: {
      id: reporter.id,
      replitId: reporter.replitId,
      name: reporter.name,
      username: reporter.username,
      bio: reporter.bio,
      apartment: reporter.apartment,
      avatarUrl: reporter.avatarUrl,
      phone: reporter.phone,
      isVerified: reporter.isVerified,
      joinedAt: reporter.joinedAt,
    },
    title: a.title,
    description: a.description,
    severity: a.severity,
    isResolved: a.isResolved,
    createdAt: a.createdAt,
  };
}

router.get("/alerts", async (req, res) => {
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser || !nbUser.colonyId) {
    res.json([]);
    return;
  }

  const alerts = await db.select({
    alert: alertsTable,
    reporter: neighborhoodUsersTable
  })
  .from(alertsTable)
  .innerJoin(neighborhoodUsersTable, eq(alertsTable.reporterId, neighborhoodUsersTable.id))
  .where(eq(neighborhoodUsersTable.colonyId, nbUser.colonyId))
  .orderBy(desc(alertsTable.createdAt));

  res.json(alerts.map(a => formatAlert(a.alert, a.reporter)));
});

router.post("/alerts", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const body = CreateAlertBody.parse(req.body);
  const [alert] = await db.insert(alertsTable).values({
    reporterId: nbUser.id,
    ...body,
  }).returning();

  res.status(201).json(formatAlert(alert, nbUser));
});

// POST /alerts/:id/resolve - Resolve safety alert
router.post("/alerts/:id/resolve", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const alertId = Number(req.params.id);
    const [alert] = await db.select().from(alertsTable).where(eq(alertsTable.id, alertId)).limit(1);
    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    const [reporter] = await db.select().from(neighborhoodUsersTable).where(eq(neighborhoodUsersTable.id, alert.reporterId)).limit(1);
    if (!reporter) {
      res.status(500).json({ error: "Reporter not found" });
      return;
    }

    const isReporter = alert.reporterId === nbUser.id;
    const isColonyAdmin = nbUser.isColonyAdmin && nbUser.colonyId === reporter.colonyId;

    if (!isReporter && !isColonyAdmin) {
      res.status(403).json({ error: "Forbidden: Only the reporter or a colony admin can resolve this alert" });
      return;
    }

    const [updatedAlert] = await db.update(alertsTable)
      .set({ isResolved: true })
      .where(eq(alertsTable.id, alertId))
      .returning();

    res.json(formatAlert(updatedAlert, reporter));
  } catch (err: any) {
    req.log.error({ err }, "Failed to resolve alert");
    res.status(500).json({ error: "Failed to resolve alert" });
  }
});

export default router;
