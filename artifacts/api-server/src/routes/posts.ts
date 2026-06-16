import { Router, type IRouter } from "express";
import { db, postsTable, neighborhoodUsersTable, postLikesTable, eq, desc, and } from "@workspace/db";
import { CreatePostBody, ListPostsQueryParams } from "@workspace/api-zod";
import { getOrCreateNeighborhoodUser } from "./users.js";

const router = Router();

function formatPost(post: any, author: any, isLikedByMe: boolean) {
  return {
    id: post.id,
    authorId: post.authorId,
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
    title: post.title,
    content: post.content,
    category: post.category,
    imageUrl: post.imageUrl,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    isLikedByMe,
    createdAt: post.createdAt,
  };
}

router.get("/posts", async (req, res) => {
  const params = ListPostsQueryParams.parse(req.query);
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser || !nbUser.colonyId) {
    res.json([]);
    return;
  }
  const myId = nbUser.id;

  const posts = await db.select({
    post: postsTable,
    author: neighborhoodUsersTable
  })
  .from(postsTable)
  .innerJoin(neighborhoodUsersTable, eq(postsTable.authorId, neighborhoodUsersTable.id))
  .where(eq(neighborhoodUsersTable.colonyId, nbUser.colonyId))
  .orderBy(desc(postsTable.createdAt))
  .limit(params.limit ?? 50)
  .offset(params.offset ?? 0);

  const postIds = posts.map(p => p.post.id);
  const myLikes = myId && postIds.length > 0
    ? await db.select({ postId: postLikesTable.postId }).from(postLikesTable)
        .where(eq(postLikesTable.userId, myId))
    : [];
  const likedSet = new Set(myLikes.map(l => l.postId));

  const result = posts
    .filter(p => !params.category || p.post.category === params.category)
    .map(p => formatPost(p.post, p.author, likedSet.has(p.post.id)));

  res.json(result);
});

router.post("/posts", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const body = CreatePostBody.parse(req.body);
  const [post] = await db.insert(postsTable).values({
    authorId: nbUser.id,
    ...body,
  }).returning();

  res.status(201).json(formatPost(post, nbUser, false));
});

router.get("/posts/:id", async (req, res) => {
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }
  const myId = nbUser.id;
  const id = Number(req.params.id);

  const post = await db.query.postsTable.findFirst({
    where: eq(postsTable.id, id),
    with: { author: true },
  });

  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  if ((post as any).author.colonyId !== nbUser.colonyId) {
    res.status(403).json({ error: "Forbidden: Post belongs to another colony" });
    return;
  }

  const liked = myId
    ? !!(await db.query.postLikesTable.findFirst({ where: and(eq(postLikesTable.postId, id), eq(postLikesTable.userId, myId)) }))
    : false;

  res.json(formatPost(post, (post as any).author, liked));
});

router.delete("/posts/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = Number(req.params.id);
  const post = await db.query.postsTable.findFirst({
    where: eq(postsTable.id, id),
    with: { author: true },
  });

  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const isAuthor = post.authorId === nbUser.id;
  const isColonyAdmin = nbUser.isColonyAdmin && nbUser.colonyId === (post as any).author.colonyId;

  if (!isAuthor && !isColonyAdmin) {
    res.status(403).json({ error: "Forbidden: Only the author or a colony admin can delete this post" });
    return;
  }

  await db.delete(postsTable).where(eq(postsTable.id, id));
  res.status(204).send();
});

router.post("/posts/:id/like", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = Number(req.params.id);
  const existing = await db.query.postLikesTable.findFirst({
    where: and(eq(postLikesTable.postId, id), eq(postLikesTable.userId, nbUser.id)),
  });

  if (existing) {
    await db.delete(postLikesTable).where(eq(postLikesTable.id, existing.id));
    const [post] = await db.update(postsTable).set({ likesCount: Math.max(0, (await db.query.postsTable.findFirst({ where: eq(postsTable.id, id) }))!.likesCount - 1) }).where(eq(postsTable.id, id)).returning();
    res.json({ liked: false, likesCount: post.likesCount });
  } else {
    await db.insert(postLikesTable).values({ postId: id, userId: nbUser.id });
    const [post] = await db.update(postsTable).set({ likesCount: ((await db.query.postsTable.findFirst({ where: eq(postsTable.id, id) }))!.likesCount + 1) }).where(eq(postsTable.id, id)).returning();
    res.json({ liked: true, likesCount: post.likesCount });
  }
});

export default router;
