import { Router } from "express";
import { db, messagesTable, neighborhoodUsersTable, eq, desc, and, or } from "@workspace/db";
import { SendMessageBody, EditMessageBody, EditMessageParams, DeleteMessageParams } from "@workspace/api-zod";
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
          isEdited: msg.isEdited,
          isDeleted: msg.isDeleted,
          messageType: msg.messageType,
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
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

// DELETE /messages/clear/:neighborId - Clear chat history
router.delete("/messages/clear/:neighborId", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const myId = nbUser.id;
    const neighborId = Number(req.params.neighborId);

    if (isNaN(neighborId)) {
      res.status(400).json({ error: "Invalid neighbor ID" });
      return;
    }

    // Delete all messages between these two users
    await db.delete(messagesTable)
      .where(
        or(
          and(eq(messagesTable.senderId, myId), eq(messagesTable.receiverId, neighborId)),
          and(eq(messagesTable.senderId, neighborId), eq(messagesTable.receiverId, myId))
        )
      );

    res.json({ success: true, message: "Chat history cleared" });
  } catch (err: any) {
    req.log.error({ err }, "Failed to clear chat history");
    res.status(500).json({ error: err.message || "Failed to clear chat history" });
  }
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
    messageType: body.messageType || "text",
    fileUrl: body.fileUrl || null,
    fileName: body.fileName || null,
  }).returning();

  res.status(201).json({
    id: msg.id,
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    content: msg.content,
    isRead: msg.isRead,
    isEdited: msg.isEdited,
    isDeleted: msg.isDeleted,
    messageType: msg.messageType,
    fileUrl: msg.fileUrl,
    fileName: msg.fileName,
    createdAt: msg.createdAt,
  });
});

// PATCH /messages/:messageId - Edit a message
router.patch("/messages/:messageId", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const myId = nbUser.id;
    const params = EditMessageParams.parse({ messageId: req.params.messageId });
    const body = EditMessageBody.parse(req.body);

    // Retrieve message to check ownership
    const [existingMsg] = await db.select().from(messagesTable).where(eq(messagesTable.id, params.messageId)).limit(1);
    if (!existingMsg) { res.status(404).json({ error: "Message not found" }); return; }
    if (existingMsg.senderId !== myId) { res.status(403).json({ error: "Forbidden: You can only edit your own messages" }); return; }
    if (existingMsg.isDeleted) { res.status(400).json({ error: "Cannot edit a deleted message" }); return; }

    const [updatedMsg] = await db.update(messagesTable)
      .set({
        content: body.content,
        isEdited: true,
      })
      .where(eq(messagesTable.id, params.messageId))
      .returning();

    if (!updatedMsg) {
      res.status(500).json({ error: "Failed to update message" });
      return;
    }

    res.json({
      id: updatedMsg.id,
      senderId: updatedMsg.senderId,
      receiverId: updatedMsg.receiverId,
      content: updatedMsg.content,
      isRead: updatedMsg.isRead,
      isEdited: updatedMsg.isEdited,
      isDeleted: updatedMsg.isDeleted,
      messageType: updatedMsg.messageType,
      fileUrl: updatedMsg.fileUrl,
      fileName: updatedMsg.fileName,
      createdAt: updatedMsg.createdAt,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to edit message");
    res.status(400).json({ error: err.message || "Failed to edit message" });
  }
});

// DELETE /messages/:messageId - Soft delete a message (WhatsApp style)
router.delete("/messages/:messageId", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const myId = nbUser.id;
    const params = DeleteMessageParams.parse({ messageId: req.params.messageId });

    // Retrieve message to check ownership
    const [existingMsg] = await db.select().from(messagesTable).where(eq(messagesTable.id, params.messageId)).limit(1);
    if (!existingMsg) { res.status(404).json({ error: "Message not found" }); return; }
    if (existingMsg.senderId !== myId) { res.status(403).json({ error: "Forbidden: You can only delete your own messages" }); return; }

    const [deletedMsg] = await db.update(messagesTable)
      .set({
        content: "This message was deleted",
        isDeleted: true,
        fileUrl: null,
        fileName: null,
      })
      .where(eq(messagesTable.id, params.messageId))
      .returning();

    if (!deletedMsg) {
      res.status(500).json({ error: "Failed to delete message" });
      return;
    }

    res.json({
      id: deletedMsg.id,
      senderId: deletedMsg.senderId,
      receiverId: deletedMsg.receiverId,
      content: deletedMsg.content,
      isRead: deletedMsg.isRead,
      isEdited: deletedMsg.isEdited,
      isDeleted: deletedMsg.isDeleted,
      messageType: deletedMsg.messageType,
      fileUrl: deletedMsg.fileUrl,
      fileName: deletedMsg.fileName,
      createdAt: deletedMsg.createdAt,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to delete message");
    res.status(400).json({ error: err.message || "Failed to delete message" });
  }
});

export default router;
