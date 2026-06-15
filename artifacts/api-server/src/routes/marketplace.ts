import { Router, type IRouter } from "express";
import { db, listingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateListingBody, ListListingsQueryParams, UpdateListingBody } from "@workspace/api-zod";
import { getOrCreateNeighborhoodUser } from "./users";

const router: IRouter = Router();

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
  const listings = await db.query.listingsTable.findMany({
    with: { seller: true },
  });

  const filtered = listings
    .filter(l => !params.category || l.category === params.category)
    .filter(l => !params.type || l.type === params.type);

  res.json(filtered.map(l => formatListing(l, (l as any).seller)));
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
  const id = Number(req.params.id);
  const listing = await db.query.listingsTable.findFirst({
    where: eq(listingsTable.id, id),
    with: { seller: true },
  });
  if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }
  res.json(formatListing(listing, (listing as any).seller));
});

router.put("/marketplace/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
  const body = UpdateListingBody.parse(req.body);

  const updateData: any = { ...body };
  if (body.price !== undefined) updateData.price = body.price.toString();

  const listing = await db.query.listingsTable.findFirst({ where: eq(listingsTable.id, id), with: { seller: true } });
  if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }

  const [updated] = await db.update(listingsTable).set(updateData).where(eq(listingsTable.id, id)).returning();
  res.json(formatListing(updated, (listing as any).seller));
});

router.delete("/marketplace/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.delete(listingsTable).where(eq(listingsTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
