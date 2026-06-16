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

export default router;
