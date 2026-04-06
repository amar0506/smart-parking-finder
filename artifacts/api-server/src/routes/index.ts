import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import locationsRouter from "./locations";
import slotsRouter from "./slots";
import bookingsRouter from "./bookings";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(locationsRouter);
router.use(slotsRouter);
router.use(bookingsRouter);
router.use(dashboardRouter);
router.use(adminRouter);

export default router;
