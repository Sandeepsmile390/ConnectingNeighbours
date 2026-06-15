import { Router, type IRouter } from "express";
import { db, resourcesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateResourceBody, ListResourcesQueryParams } from "@workspace/api-zod";
import { getOrCreateNeighborhoodUser } from "./users";

const router: IRouter = Router();

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
  const resources = await db.query.resourcesTable.findMany({
    with: { offerer: true },
  });
  const filtered = resources.filter(r => !params.type || r.type === params.type);
  res.json(filtered.map(r => formatResource(r, (r as any).offerer)));
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
  await db.delete(resourcesTable).where(eq(resourcesTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
