import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import postsRouter from "./posts.js";
import marketplaceRouter from "./marketplace.js";
import eventsRouter from "./events.js";
import alertsRouter from "./alerts.js";
import resourcesRouter from "./resources.js";
import feedRouter from "./feed.js";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(postsRouter);
router.use(marketplaceRouter);
router.use(eventsRouter);
router.use(alertsRouter);
router.use(resourcesRouter);
router.use(feedRouter);

export default router;
