import { Router, type IRouter } from "express";
import { db, postsTable, neighborhoodUsersTable, postLikesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { CreatePostBody, ListPostsQueryParams } from "@workspace/api-zod";
import { getOrCreateNeighborhoodUser } from "./users";

const router: IRouter = Router();

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
  const myId = nbUser?.id;

  const posts = await db.query.postsTable.findMany({
    orderBy: [desc(postsTable.createdAt)],
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
    with: { author: true },
  });

  const postIds = posts.map(p => p.id);
  const myLikes = myId && postIds.length > 0
    ? await db.select({ postId: postLikesTable.postId }).from(postLikesTable)
        .where(eq(postLikesTable.userId, myId))
    : [];
  const likedSet = new Set(myLikes.map(l => l.postId));

  const result = posts
    .filter(p => !params.category || p.category === params.category)
    .map(p => formatPost(p, (p as any).author, likedSet.has(p.id)));

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
  const id = Number(req.params.id);
  const nbUser = await getOrCreateNeighborhoodUser(req);
  const myId = nbUser?.id;

  const post = await db.query.postsTable.findFirst({
    where: eq(postsTable.id, id),
    with: { author: true },
  });

  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const liked = myId
    ? !!(await db.query.postLikesTable.findFirst({ where: and(eq(postLikesTable.postId, id), eq(postLikesTable.userId, myId)) }))
    : false;

  res.json(formatPost(post, (post as any).author, liked));
});

router.delete("/posts/:id", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = Number(req.params.id);
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
