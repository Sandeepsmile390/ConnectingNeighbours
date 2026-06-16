import { Router } from "express";
import { db, hostelsTable, eq } from "@workspace/db";
import { CreateHostelBody } from "@workspace/api-zod";
import { getOrCreateNeighborhoodUser } from "./users.js";

const router = Router();

// GET /hostels - List all hostel listings
router.get("/hostels", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser || !nbUser.colonyId) {
    res.json([]);
    return;
  }

  try {
    const hostels = await db.select().from(hostelsTable).where(eq(hostelsTable.colonyId, nbUser.colonyId));
    res.json(hostels);
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch hostels");
    res.status(500).json({ error: "Failed to fetch hostels" });
  }
});

// POST /hostels - Add a hostel listing
router.post("/hostels", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const body = CreateHostelBody.parse(req.body);

    const [hostel] = await db.insert(hostelsTable).values({
      name: body.name,
      address: body.address,
      description: body.description,
      contactInfo: body.contactInfo,
      price: body.price,
      colonyId: body.colonyId,
      createdById: nbUser.id,
      isAvailable: true,
    }).returning();

    res.status(201).json(hostel);
  } catch (err: any) {
    req.log.error({ err }, "Failed to create hostel listing");
    res.status(500).json({ error: "Failed to create hostel listing" });
  }
});

export default router;
