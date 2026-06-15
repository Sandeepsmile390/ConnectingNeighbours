import { Router, type IRouter } from "express";
import { db, eventsTable, eventRsvpsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateEventBody } from "@workspace/api-zod";
import { getOrCreateNeighborhoodUser } from "./users";

const router: IRouter = Router();

function formatEvent(e: any, organizer: any, isRsvpedByMe: boolean) {
  return {
    id: e.id,
    organizerId: e.organizerId,
    organizer: {
      id: organizer.id,
      replitId: organizer.replitId,
      name: organizer.name,
      username: organizer.username,
      bio: organizer.bio,
      apartment: organizer.apartment,
      avatarUrl: organizer.avatarUrl,
      phone: organizer.phone,
      isVerified: organizer.isVerified,
      joinedAt: organizer.joinedAt,
    },
    title: e.title,
    description: e.description,
    location: e.location,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    rsvpCount: e.rsvpCount,
    isRsvpedByMe,
    createdAt: e.createdAt,
  };
}

router.get("/events", async (req, res) => {
  const nbUser = await getOrCreateNeighborhoodUser(req);
  const myId = nbUser?.id;

  const events = await db.query.eventsTable.findMany({
    with: { organizer: true },
  });

  const eventIds = events.map(e => e.id);
  const myRsvps = myId && eventIds.length > 0
    ? await db.select({ eventId: eventRsvpsTable.eventId }).from(eventRsvpsTable).where(eq(eventRsvpsTable.userId, myId))
    : [];
  const rsvpedSet = new Set(myRsvps.map(r => r.eventId));

  res.json(events.map(e => formatEvent(e, (e as any).organizer, rsvpedSet.has(e.id))));
});

router.post("/events", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const body = CreateEventBody.parse(req.body);
  const [event] = await db.insert(eventsTable).values({
    organizerId: nbUser.id,
    ...body,
  }).returning();

  res.status(201).json(formatEvent(event, nbUser, false));
});

router.get("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  const nbUser = await getOrCreateNeighborhoodUser(req);
  const myId = nbUser?.id;

  const event = await db.query.eventsTable.findFirst({
    where: eq(eventsTable.id, id),
    with: { organizer: true },
  });

  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const rsvped = myId
    ? !!(await db.query.eventRsvpsTable.findFirst({ where: and(eq(eventRsvpsTable.eventId, id), eq(eventRsvpsTable.userId, myId)) }))
    : false;

  res.json(formatEvent(event, (event as any).organizer, rsvped));
});

router.post("/events/:id/rsvp", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = Number(req.params.id);
  const existing = await db.query.eventRsvpsTable.findFirst({
    where: and(eq(eventRsvpsTable.eventId, id), eq(eventRsvpsTable.userId, nbUser.id)),
  });

  if (existing) {
    await db.delete(eventRsvpsTable).where(eq(eventRsvpsTable.id, existing.id));
    const [event] = await db.update(eventsTable).set({ rsvpCount: Math.max(0, (await db.query.eventsTable.findFirst({ where: eq(eventsTable.id, id) }))!.rsvpCount - 1) }).where(eq(eventsTable.id, id)).returning();
    res.json({ rsvped: false, rsvpCount: event.rsvpCount });
  } else {
    await db.insert(eventRsvpsTable).values({ eventId: id, userId: nbUser.id });
    const [event] = await db.update(eventsTable).set({ rsvpCount: ((await db.query.eventsTable.findFirst({ where: eq(eventsTable.id, id) }))!.rsvpCount + 1) }).where(eq(eventsTable.id, id)).returning();
    res.json({ rsvped: true, rsvpCount: event.rsvpCount });
  }
});

export default router;
