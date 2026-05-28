import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import companionRouter from "./companion";
import companionsDbRouter from "./companions-db";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(companionRouter);
router.use(companionsDbRouter);
router.use(notificationsRouter);

export default router;
