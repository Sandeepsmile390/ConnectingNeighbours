import { Router, type IRouter } from "express";
import { db, listingsTable, neighborhoodUsersTable, eq, desc } from "@workspace/db";
import { CreateListingBody, ListListingsQueryParams, UpdateListingBody } from "@workspace/api-zod";
import { getOrCreateNeighborhoodUser } from "./users.js";

const router = Router();

function formatListing(l: any, seller: any) {
  return {
    id: l.id,
    sellerId: l.sellerId,
    seller: {
      id: seller.id,
      replitId: seller.replitId,
      name: seller.name,
      username: seller.username,
      bio: seller.bio,
      apartment: seller.apartment,
      avatarUrl: seller.avatarUrl,
      phone: seller.phone,
      isVerified: seller.isVerified,
      joinedAt: seller.joinedAt,
    },
    title: l.title,
    description: l.description,
    price: l.price ? Number(l.price) : null,
    type: l.type,
    category: l.category,
    imageUrl: l.imageUrl,
    isAvailable: l.isAvailable,
    createdAt: l.createdAt,
  };
}

router.get("/marketplace", async (req, res) => {
  const params = ListListingsQueryParams.parse(req.query);
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser || !nbUser.colonyId) {
    res.json([]);
    return;
  }

  const listings = await db.select({
    listing: listingsTable,
    seller: neighborhoodUsersTable
  })
  .from(listingsTable)
  .innerJoin(neighborhoodUsersTable, eq(listingsTable.sellerId, neighborhoodUsersTable.id))
  .where(eq(neighborhoodUsersTable.colonyId, nbUser.colonyId))
  .orderBy(desc(listingsTable.createdAt));

  const filtered = listings
    .filter(l => !params.category || l.listing.category === params.category)
    .filter(l => !params.type || l.listing.type === params.type);

  res.json(filtered.map(l => formatListing(l.listing, l.seller)));
});

router.post("/marketplace", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const body = CreateListingBody.parse(req.body);
  const [listing] = await db.insert(listingsTable).values({
    sellerId: nbUser.id,
    ...body,
    price: body.price?.toString(),
  }).returning();

  res.status(201).json(formatListing(listing, nbUser));
});

router.get("/marketplace/:id", async (req, res) => {
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = Number(req.params.id);
  const listing = await db.query.listingsTable.findFirst({
    where: eq(listingsTable.id, id),
    with: { seller: true },
  });
  if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }

  if ((listing as any).seller.colonyId !== nbUser.colonyId) {
    res.status(403).json({ error: "Forbidden: Listing belongs to another colony" });
    return;
  }

  res.json(formatListing(listing, (listing as any).seller));
});

router.put("/marketplace/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = Number(req.params.id);
  const body = UpdateListingBody.parse(req.body);

  const updateData: any = { ...body };
  if (body.price !== undefined) updateData.price = body.price.toString();

  const listing = await db.query.listingsTable.findFirst({ where: eq(listingsTable.id, id), with: { seller: true } });
  if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }

  if (listing.sellerId !== nbUser.id) {
    res.status(403).json({ error: "Forbidden: Only the seller can update this listing" });
    return;
  }

  const [updated] = await db.update(listingsTable).set(updateData).where(eq(listingsTable.id, id)).returning();
  res.json(formatListing(updated, (listing as any).seller));
});

router.delete("/marketplace/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = Number(req.params.id);
  const listing = await db.query.listingsTable.findFirst({ where: eq(listingsTable.id, id), with: { seller: true } });
  if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }

  const isSeller = listing.sellerId === nbUser.id;
  const isColonyAdmin = nbUser.isColonyAdmin && nbUser.colonyId === (listing as any).seller.colonyId;

  if (!isSeller && !isColonyAdmin) {
    res.status(403).json({ error: "Forbidden: Only the seller or a colony admin can delete this listing" });
    return;
  }

  await db.delete(listingsTable).where(eq(listingsTable.id, id));
  res.status(204).send();
});

export default router;
