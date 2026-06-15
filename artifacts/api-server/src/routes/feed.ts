import { Router, type IRouter } from "express";
import { db, neighborhoodUsersTable, postsTable, listingsTable, eventsTable, alertsTable, resourcesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/feed/stats", async (req, res) => {
  const [totalMembers] = await db.select({ count: sql<number>`count(*)` }).from(neighborhoodUsersTable);
  const [totalPosts] = await db.select({ count: sql<number>`count(*)` }).from(postsTable);
  const [activeListings] = await db.select({ count: sql<number>`count(*)` }).from(listingsTable).where(eq(listingsTable.isAvailable, true));
  const [upcomingEvents] = await db.select({ count: sql<number>`count(*)` }).from(eventsTable);
  const [activeAlerts] = await db.select({ count: sql<number>`count(*)` }).from(alertsTable).where(eq(alertsTable.isResolved, false));
  const [availableResources] = await db.select({ count: sql<number>`count(*)` }).from(resourcesTable).where(eq(resourcesTable.isAvailable, true));

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
  const posts = await db.query.postsTable.findMany({ orderBy: [desc(postsTable.createdAt)], limit: 5, with: { author: true } });
  const listings = await db.query.listingsTable.findMany({ orderBy: [desc(listingsTable.createdAt)], limit: 5, with: { seller: true } });
  const events = await db.query.eventsTable.findMany({ orderBy: [desc(eventsTable.createdAt)], limit: 5, with: { organizer: true } });
  const alerts = await db.query.alertsTable.findMany({ orderBy: [desc(alertsTable.createdAt)], limit: 3, with: { reporter: true } });
  const resources = await db.query.resourcesTable.findMany({ orderBy: [desc(resourcesTable.createdAt)], limit: 3, with: { offerer: true } });

  const activity = [
    ...posts.map(p => ({ id: `post-${p.id}`, type: "post" as const, title: p.title || p.content.slice(0, 60), description: p.content.slice(0, 100), actorName: (p as any).author?.name || "Neighbor", actorAvatar: (p as any).author?.avatarUrl || null, createdAt: p.createdAt })),
    ...listings.map(l => ({ id: `listing-${l.id}`, type: "listing" as const, title: l.title, description: l.description.slice(0, 100), actorName: (l as any).seller?.name || "Neighbor", actorAvatar: (l as any).seller?.avatarUrl || null, createdAt: l.createdAt })),
    ...events.map(e => ({ id: `event-${e.id}`, type: "event" as const, title: e.title, description: e.description.slice(0, 100), actorName: (e as any).organizer?.name || "Neighbor", actorAvatar: (e as any).organizer?.avatarUrl || null, createdAt: e.createdAt })),
    ...alerts.map(a => ({ id: `alert-${a.id}`, type: "alert" as const, title: a.title, description: a.description.slice(0, 100), actorName: (a as any).reporter?.name || "Neighbor", actorAvatar: (a as any).reporter?.avatarUrl || null, createdAt: a.createdAt })),
    ...resources.map(r => ({ id: `resource-${r.id}`, type: "resource" as const, title: r.title, description: r.description.slice(0, 100), actorName: (r as any).offerer?.name || "Neighbor", actorAvatar: (r as any).offerer?.avatarUrl || null, createdAt: r.createdAt })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);

  res.json(activity);
});

export default router;
