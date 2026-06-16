import { Router, type IRouter } from "express";
import { db, resourcesTable, neighborhoodUsersTable, eq, desc } from "@workspace/db";
import { CreateResourceBody, ListResourcesQueryParams } from "@workspace/api-zod";
import { getOrCreateNeighborhoodUser } from "./users.js";

const router = Router();

function formatResource(r: any, offerer: any) {
  return {
    id: r.id,
    offererId: r.offererId,
    offerer: {
      id: offerer.id,
      replitId: offerer.replitId,
      name: offerer.name,
      username: offerer.username,
      bio: offerer.bio,
      apartment: offerer.apartment,
      avatarUrl: offerer.avatarUrl,
      phone: offerer.phone,
      isVerified: offerer.isVerified,
      joinedAt: offerer.joinedAt,
    },
    title: r.title,
    description: r.description,
    type: r.type,
    isAvailable: r.isAvailable,
    createdAt: r.createdAt,
  };
}

router.get("/resources", async (req, res) => {
  const params = ListResourcesQueryParams.parse(req.query);
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser || !nbUser.colonyId) {
    res.json([]);
    return;
  }

  const resources = await db.select({
    resource: resourcesTable,
    offerer: neighborhoodUsersTable
  })
  .from(resourcesTable)
  .innerJoin(neighborhoodUsersTable, eq(resourcesTable.offererId, neighborhoodUsersTable.id))
  .where(eq(neighborhoodUsersTable.colonyId, nbUser.colonyId))
  .orderBy(desc(resourcesTable.createdAt));

  const filtered = resources.filter(r => !params.type || r.resource.type === params.type);
  res.json(filtered.map(r => formatResource(r.resource, r.offerer)));
});

router.post("/resources", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const body = CreateResourceBody.parse(req.body);
  const [resource] = await db.insert(resourcesTable).values({
    offererId: nbUser.id,
    ...body,
  }).returning();

  res.status(201).json(formatResource(resource, nbUser));
});

router.delete("/resources/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = Number(req.params.id);
  const resource = await db.query.resourcesTable.findFirst({ where: eq(resourcesTable.id, id), with: { offerer: true } });
  if (!resource) { res.status(404).json({ error: "Resource not found" }); return; }

  const isOfferer = resource.offererId === nbUser.id;
  const isColonyAdmin = nbUser.isColonyAdmin && nbUser.colonyId === (resource as any).offerer.colonyId;

  if (!isOfferer && !isColonyAdmin) {
    res.status(403).json({ error: "Forbidden: Only the offerer or a colony admin can delete this resource" });
    return;
  }

  await db.delete(resourcesTable).where(eq(resourcesTable.id, id));
  res.status(204).send();
});

export default router;
