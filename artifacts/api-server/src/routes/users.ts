import { Router, type IRouter } from "express";
import { db, neighborhoodUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateUserBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrCreateNeighborhoodUser(req: any) {
  if (!req.isAuthenticated()) return null;
  const user = req.user;

  let nbUser = await db.query.neighborhoodUsersTable.findFirst({
    where: eq(neighborhoodUsersTable.replitId, user.id),
  });

  if (!nbUser) {
    const [created] = await db.insert(neighborhoodUsersTable).values({
      replitId: user.id,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Neighbor",
      username: user.username || user.id,
      avatarUrl: user.profileImageUrl,
      isVerified: true,
    }).returning();
    nbUser = created;
  }

  return nbUser;
}

export { getOrCreateNeighborhoodUser };

router.get("/users", async (req, res) => {
  const users = await db.select().from(neighborhoodUsersTable).orderBy(neighborhoodUsersTable.joinedAt);
  const mapped = users.map(u => ({
    id: u.id,
    replitId: u.replitId,
    name: u.name,
    username: u.username,
    bio: u.bio,
    apartment: u.apartment,
    avatarUrl: u.avatarUrl,
    phone: u.phone,
    isVerified: u.isVerified,
    joinedAt: u.joinedAt,
  }));
  res.json(mapped);
});

router.get("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const user = await db.query.neighborhoodUsersTable.findFirst({
    where: eq(neighborhoodUsersTable.id, id),
  });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({
    id: user.id,
    replitId: user.replitId,
    name: user.name,
    username: user.username,
    bio: user.bio,
    apartment: user.apartment,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    isVerified: user.isVerified,
    joinedAt: user.joinedAt,
  });
});

router.put("/users/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  const body = UpdateUserBody.parse(req.body);

  const [updated] = await db.update(neighborhoodUsersTable)
    .set({ ...body })
    .where(eq(neighborhoodUsersTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json({
    id: updated.id,
    replitId: updated.replitId,
    name: updated.name,
    username: updated.username,
    bio: updated.bio,
    apartment: updated.apartment,
    avatarUrl: updated.avatarUrl,
    phone: updated.phone,
    isVerified: updated.isVerified,
    joinedAt: updated.joinedAt,
  });
});

router.get("/auth/me", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  res.json({
    id: nbUser.id,
    replitId: nbUser.replitId,
    name: nbUser.name,
    username: nbUser.username,
    bio: nbUser.bio,
    apartment: nbUser.apartment,
    avatarUrl: nbUser.avatarUrl,
    phone: nbUser.phone,
    isVerified: nbUser.isVerified,
    joinedAt: nbUser.joinedAt,
  });
});

export default router;
