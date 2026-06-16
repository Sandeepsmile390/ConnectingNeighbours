import { Router } from "express";
import { db, coloniesTable, neighborhoodUsersTable, eq, and } from "@workspace/db";
import { CreateColonyBody, JoinColonyBody, VerifyColonyMemberBody } from "@workspace/api-zod";
import { getOrCreateNeighborhoodUser } from "./users.js";

const router = Router();

// GET /colonies - List all colonies
router.get("/colonies", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const colonies = await db.select().from(coloniesTable);
    res.json(colonies);
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch colonies");
    res.status(500).json({ error: "Failed to fetch colonies" });
  }
});

// POST /colonies - Create a new colony
router.post("/colonies", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const body = CreateColonyBody.parse(req.body);

    // 1. Insert new colony record
    const [colony] = await db.insert(coloniesTable).values({
      name: body.name,
      description: body.description,
      address: body.address,
      createdById: nbUser.id,
    }).returning();

    // 2. Update user to be part of the colony and promote to admin
    await db.update(neighborhoodUsersTable)
      .set({
        colonyId: colony.id,
        isColonyAdmin: true,
        isColonyApproved: true,
        isVerified: true, // Auto-verified since they created the colony
      })
      .where(eq(neighborhoodUsersTable.id, nbUser.id));

    res.status(201).json(colony);
  } catch (err: any) {
    req.log.error({ err }, "Failed to create colony");
    res.status(500).json({ error: "Failed to create colony" });
  }
});

// POST /colonies/join - Request to join a colony
router.post("/colonies/join", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const body = JoinColonyBody.parse(req.body);

    if (body.colonyId === 0) {
      // Leave current colony
      const [updatedUser] = await db.update(neighborhoodUsersTable)
        .set({
          colonyId: null,
          isColonyAdmin: false,
          isColonyApproved: false,
          isVerified: false,
        })
        .where(eq(neighborhoodUsersTable.id, nbUser.id))
        .returning();
      res.json(updatedUser);
      return;
    }

    // Verify colony exists
    const [colony] = await db.select().from(coloniesTable).where(eq(coloniesTable.id, body.colonyId)).limit(1);
    if (!colony) {
      res.status(404).json({ error: "Colony not found" });
      return;
    }

    // Update user: put on pending status for new colony (unless they are already an admin)
    const isUserAdmin = nbUser.isColonyAdmin === true;
    const [updatedUser] = await db.update(neighborhoodUsersTable)
      .set({
        colonyId: body.colonyId,
        isColonyAdmin: isUserAdmin,
        isColonyApproved: isUserAdmin ? true : false, // Auto-approve if they are admin
        isVerified: isUserAdmin ? true : false,       // Auto-verify if they are admin
      })
      .where(eq(neighborhoodUsersTable.id, nbUser.id))
      .returning();

    res.json(updatedUser);
  } catch (err: any) {
    req.log.error({ err }, "Failed to join colony");
    res.status(500).json({ error: "Failed to join colony" });
  }
});

// GET /colonies/pending-members - Get pending members for current admin's colony
router.get("/colonies/pending-members", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  if (!nbUser.isColonyAdmin || !nbUser.colonyId) {
    res.status(403).json({ error: "Forbidden: Only colony admins can view pending members" });
    return;
  }

  try {
    const pendingMembers = await db.select()
      .from(neighborhoodUsersTable)
      .where(
        and(
          eq(neighborhoodUsersTable.colonyId, nbUser.colonyId),
          eq(neighborhoodUsersTable.isColonyApproved, false)
        )
      );
    res.json(pendingMembers);
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch pending members");
    res.status(500).json({ error: "Failed to fetch pending members" });
  }
});

// POST /colonies/verify-member - Approve and verify a member (admin-only)
router.post("/colonies/verify-member", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  if (!nbUser.isColonyAdmin || !nbUser.colonyId) {
    res.status(403).json({ error: "Forbidden: Only colony admins can verify members" });
    return;
  }

  try {
    const body = VerifyColonyMemberBody.parse(req.body);

    // Verify target user is in the same colony
    const [targetUser] = await db.select()
      .from(neighborhoodUsersTable)
      .where(eq(neighborhoodUsersTable.id, body.memberId))
      .limit(1);

    if (!targetUser || targetUser.colonyId !== nbUser.colonyId) {
      res.status(400).json({ error: "User is not a member of your colony" });
      return;
    }

    const [updatedUser] = await db.update(neighborhoodUsersTable)
      .set({
        isColonyApproved: true,
        isVerified: true, // Member gets verified badge!
      })
      .where(eq(neighborhoodUsersTable.id, body.memberId))
      .returning();

    res.json(updatedUser);
  } catch (err: any) {
    req.log.error({ err }, "Failed to verify member");
    res.status(500).json({ error: "Failed to verify member" });
  }
});

export default router;
