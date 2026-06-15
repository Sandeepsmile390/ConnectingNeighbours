import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import postsRouter from "./posts";
import marketplaceRouter from "./marketplace";
import eventsRouter from "./events";
import alertsRouter from "./alerts";
import resourcesRouter from "./resources";
import feedRouter from "./feed";

const router: IRouter = Router();

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
