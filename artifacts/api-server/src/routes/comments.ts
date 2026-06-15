import { Router } from "express";
import { db, commentsTable, postsTable, eq, desc } from "@workspace/db";
import { CreateCommentBody } from "@workspace/api-zod";
import { getOrCreateNeighborhoodUser } from "./users.js";

const router = Router();

function formatComment(comment: any, author: any) {
  return {
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    author: {
      id: author.id,
      replitId: author.replitId,
      name: author.name,
      username: author.username,
      bio: author.bio,
      apartment: author.apartment,
      avatarUrl: author.avatarUrl,
      phone: author.phone,
      isVerified: author.isVerified,
      joinedAt: author.joinedAt,
    },
    content: comment.content,
    createdAt: comment.createdAt,
  };
}

// GET /posts/:postId/comments
router.get("/posts/:postId/comments", async (req, res) => {
  const postId = Number(req.params.postId);
  
  const comments = await db.query.commentsTable.findMany({
    where: eq(commentsTable.postId, postId),
    orderBy: [desc(commentsTable.createdAt)],
    with: { author: true },
  });

  const result = comments.map(c => formatComment(c, (c as any).author));
  res.json(result);
});

// POST /posts/:postId/comments
router.post("/posts/:postId/comments", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const postId = Number(req.params.postId);
  const body = CreateCommentBody.parse(req.body);

  const post = await db.query.postsTable.findFirst({
    where: eq(postsTable.id, postId),
  });
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  // Insert comment
  const [comment] = await db.insert(commentsTable).values({
    postId,
    authorId: nbUser.id,
    content: body.content,
  }).returning();

  // Increment comments count on post
  await db.update(postsTable)
    .set({ commentsCount: post.commentsCount + 1 })
    .where(eq(postsTable.id, postId));

  res.status(201).json(formatComment(comment, nbUser));
});

// DELETE /comments/:id
router.delete("/comments/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = Number(req.params.id);
  const comment = await db.query.commentsTable.findFirst({
    where: eq(commentsTable.id, id),
  });
  if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }

  // Only the author can delete the comment
  if (comment.authorId !== nbUser.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.id, id));

  // Decrement comments count on post
  const post = await db.query.postsTable.findFirst({
    where: eq(postsTable.id, comment.postId),
  });
  if (post) {
    await db.update(postsTable)
      .set({ commentsCount: Math.max(0, post.commentsCount - 1) })
      .where(eq(postsTable.id, post.id));
  }

  res.status(204).send();
});

export default router;
