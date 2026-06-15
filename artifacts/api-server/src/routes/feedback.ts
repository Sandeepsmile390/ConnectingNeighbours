import { Router } from "express";
import { db, feedbacksTable } from "@workspace/db";
import { SubmitFeedbackBody } from "@workspace/api-zod";
import { getOrCreateNeighborhoodUser } from "./users.js";

const router = Router();

router.post("/feedback", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const nbUser = await getOrCreateNeighborhoodUser(req);
  if (!nbUser) { res.status(401).json({ error: "Unauthorized" }); return; }

  const body = SubmitFeedbackBody.parse(req.body);

  const [feedback] = await db.insert(feedbacksTable).values({
    userId: nbUser.id,
    category: body.category,
    rating: body.rating,
    comment: body.comment,
  }).returning();

  res.status(201).json(feedback);
});

export default router;
