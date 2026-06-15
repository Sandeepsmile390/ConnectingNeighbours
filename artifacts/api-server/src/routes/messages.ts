import { Router } from "express";
import { db, messagesTable, neighborhoodUsersTable, eq, desc, and, or } from "@workspace/db";
import { SendMessageBody } from "@workspace/api-zod";
import { getOrCreateNeighborhoodUser } from "./users.js";

const router = Router();

// GET /messages/conversations - List chats
router.get("/messages/conversations", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const myId = nbUser.id;

  // Find all messages involving current user
  const userMessages = await db.query.messagesTable.findMany({
    where: or(
      eq(messagesTable.senderId, myId),
      eq(messagesTable.receiverId, myId)
    ),
    orderBy: [desc(messagesTable.createdAt)],
    with: { sender: true, receiver: true },
  });

  // Group by neighbor
  const conversationsMap = new Map<number, any>();
  for (const msg of userMessages) {
    const neighbor = msg.senderId === myId ? msg.receiver : msg.sender;
    if (!conversationsMap.has(neighbor.id)) {
      conversationsMap.set(neighbor.id, {
        neighbor: {
          id: neighbor.id,
          replitId: neighbor.replitId,
          name: neighbor.name,
          username: neighbor.username,
          bio: neighbor.bio,
          apartment: neighbor.apartment,
          avatarUrl: neighbor.avatarUrl,
          phone: neighbor.phone,
          isVerified: neighbor.isVerified,
          joinedAt: neighbor.joinedAt,
        },
        lastMessage: {
          id: msg.id,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          content: msg.content,
          isRead: msg.isRead,
          createdAt: msg.createdAt,
        },
        unreadCount: 0,
      });
    }
  }

  // Count unread messages
  for (const [neighborId, conv] of conversationsMap.entries()) {
    const unreadMsgs = await db.query.messagesTable.findMany({
      where: and(
        eq(messagesTable.senderId, neighborId),
        eq(messagesTable.receiverId, myId),
        eq(messagesTable.isRead, false)
      ),
    });
    conv.unreadCount = unreadMsgs.length;
  }

  res.json(Array.from(conversationsMap.values()));
});

// GET /messages/:neighborId - Chat messages
router.get("/messages/:neighborId", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const myId = nbUser.id;
  const neighborId = Number(req.params.neighborId);

  // Fetch messages between these two users
  const messages = await db.query.messagesTable.findMany({
    where: or(
      and(eq(messagesTable.senderId, myId), eq(messagesTable.receiverId, neighborId)),
      and(eq(messagesTable.senderId, neighborId), eq(messagesTable.receiverId, myId))
    ),
    orderBy: [desc(messagesTable.createdAt)],
  });

  // Mark neighbor's messages as read
  await db.update(messagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(messagesTable.senderId, neighborId),
        eq(messagesTable.receiverId, myId),
        eq(messagesTable.isRead, false)
      )
    );

  res.json(messages.reverse());
});

// POST /messages - Send message
router.post("/messages", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const myId = nbUser.id;
  const body = SendMessageBody.parse(req.body);

  const receiver = await db.query.neighborhoodUsersTable.findFirst({
    where: eq(neighborhoodUsersTable.id, body.receiverId),
  });
  if (!receiver) { res.status(404).json({ error: "Receiver not found" }); return; }

  const [msg] = await db.insert(messagesTable).values({
    senderId: myId,
    receiverId: body.receiverId,
    content: body.content,
  }).returning();

  res.status(201).json({
    id: msg.id,
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    content: msg.content,
    isRead: msg.isRead,
    createdAt: msg.createdAt,
  });
});

export default router;
