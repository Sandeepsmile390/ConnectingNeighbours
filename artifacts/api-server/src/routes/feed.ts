import { Router, type IRouter } from "express";
import { db, neighborhoodUsersTable, postsTable, listingsTable, eventsTable, alertsTable, resourcesTable, eq, desc, sql, and } from "@workspace/db";
import { getOrCreateNeighborhoodUser } from "./users.js";

const router = Router();

router.get("/feed/stats", async (req, res) => {
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser || !nbUser.colonyId) {
    res.json({
      totalMembers: 0,
      totalPosts: 0,
      activeListings: 0,
      upcomingEvents: 0,
      activeAlerts: 0,
      availableResources: 0,
    });
    return;
  }
  const colonyId = nbUser.colonyId;

  const [totalMembers] = await db.select({ count: sql<number>`count(*)` })
    .from(neighborhoodUsersTable)
    .where(eq(neighborhoodUsersTable.colonyId, colonyId));

  const [totalPosts] = await db.select({ count: sql<number>`count(*)` })
    .from(postsTable)
    .innerJoin(neighborhoodUsersTable, eq(postsTable.authorId, neighborhoodUsersTable.id))
    .where(eq(neighborhoodUsersTable.colonyId, colonyId));

  const [activeListings] = await db.select({ count: sql<number>`count(*)` })
    .from(listingsTable)
    .innerJoin(neighborhoodUsersTable, eq(listingsTable.sellerId, neighborhoodUsersTable.id))
    .where(and(eq(neighborhoodUsersTable.colonyId, colonyId), eq(listingsTable.isAvailable, true)));

  const [upcomingEvents] = await db.select({ count: sql<number>`count(*)` })
    .from(eventsTable)
    .innerJoin(neighborhoodUsersTable, eq(eventsTable.organizerId, neighborhoodUsersTable.id))
    .where(eq(neighborhoodUsersTable.colonyId, colonyId));

  const [activeAlerts] = await db.select({ count: sql<number>`count(*)` })
    .from(alertsTable)
    .innerJoin(neighborhoodUsersTable, eq(alertsTable.reporterId, neighborhoodUsersTable.id))
    .where(and(eq(neighborhoodUsersTable.colonyId, colonyId), eq(alertsTable.isResolved, false)));

  const [availableResources] = await db.select({ count: sql<number>`count(*)` })
    .from(resourcesTable)
    .innerJoin(neighborhoodUsersTable, eq(resourcesTable.offererId, neighborhoodUsersTable.id))
    .where(and(eq(neighborhoodUsersTable.colonyId, colonyId), eq(resourcesTable.isAvailable, true)));

  res.json({
    totalMembers: Number(totalMembers.count),
    totalPosts: Number(totalPosts.count),
    activeListings: Number(activeListings.count),
    upcomingEvents: Number(upcomingEvents.count),
    activeAlerts: Number(activeAlerts.count),
    availableResources: Number(availableResources.count),
  });
});

router.get("/feed/activity", async (req, res) => {
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser || !nbUser.colonyId) {
    res.json([]);
    return;
  }
  const colonyId = nbUser.colonyId;

  const posts = await db.select({
    post: postsTable,
    author: neighborhoodUsersTable
  })
  .from(postsTable)
  .innerJoin(neighborhoodUsersTable, eq(postsTable.authorId, neighborhoodUsersTable.id))
  .where(eq(neighborhoodUsersTable.colonyId, colonyId))
  .orderBy(desc(postsTable.createdAt))
  .limit(5);

  const listings = await db.select({
    listing: listingsTable,
    seller: neighborhoodUsersTable
  })
  .from(listingsTable)
  .innerJoin(neighborhoodUsersTable, eq(listingsTable.sellerId, neighborhoodUsersTable.id))
  .where(eq(neighborhoodUsersTable.colonyId, colonyId))
  .orderBy(desc(listingsTable.createdAt))
  .limit(5);

  const events = await db.select({
    event: eventsTable,
    organizer: neighborhoodUsersTable
  })
  .from(eventsTable)
  .innerJoin(neighborhoodUsersTable, eq(eventsTable.organizerId, neighborhoodUsersTable.id))
  .where(eq(neighborhoodUsersTable.colonyId, colonyId))
  .orderBy(desc(eventsTable.createdAt))
  .limit(5);

  const alerts = await db.select({
    alert: alertsTable,
    reporter: neighborhoodUsersTable
  })
  .from(alertsTable)
  .innerJoin(neighborhoodUsersTable, eq(alertsTable.reporterId, neighborhoodUsersTable.id))
  .where(eq(neighborhoodUsersTable.colonyId, colonyId))
  .orderBy(desc(alertsTable.createdAt))
  .limit(3);

  const resources = await db.select({
    resource: resourcesTable,
    offerer: neighborhoodUsersTable
  })
  .from(resourcesTable)
  .innerJoin(neighborhoodUsersTable, eq(resourcesTable.offererId, neighborhoodUsersTable.id))
  .where(eq(neighborhoodUsersTable.colonyId, colonyId))
  .orderBy(desc(resourcesTable.createdAt))
  .limit(3);

  const activity = [
    ...posts.map(p => ({ id: `post-${p.post.id}`, type: "post" as const, title: p.post.title || p.post.content.slice(0, 60), description: p.post.content.slice(0, 100), actorName: p.author.name || "Neighbor", actorAvatar: p.author.avatarUrl || null, createdAt: p.post.createdAt })),
    ...listings.map(l => ({ id: `listing-${l.listing.id}`, type: "listing" as const, title: l.listing.title, description: l.listing.description.slice(0, 100), actorName: l.seller.name || "Neighbor", actorAvatar: l.seller.avatarUrl || null, createdAt: l.listing.createdAt })),
    ...events.map(e => ({ id: `event-${e.event.id}`, type: "event" as const, title: e.event.title, description: e.event.description.slice(0, 100), actorName: e.organizer.name || "Neighbor", actorAvatar: e.organizer.avatarUrl || null, createdAt: e.event.createdAt })),
    ...alerts.map(a => ({ id: `alert-${a.alert.id}`, type: "alert" as const, title: a.alert.title, description: a.alert.description.slice(0, 100), actorName: a.reporter.name || "Neighbor", actorAvatar: a.reporter.avatarUrl || null, createdAt: a.alert.createdAt })),
    ...resources.map(r => ({ id: `resource-${r.resource.id}`, type: "resource" as const, title: r.resource.title, description: r.resource.description.slice(0, 100), actorName: r.offerer.name || "Neighbor", actorAvatar: r.offerer.avatarUrl || null, createdAt: r.resource.createdAt })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);

  res.json(activity);
});

export default router;
