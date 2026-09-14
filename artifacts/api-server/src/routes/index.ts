import { Router, type IRouter } from "express";
import healthRouter from "./health";
import keysRouter from "./keys";
import adminsRouter from "./admins";
import warningsRouter from "./warnings";
import adminRouter from "./admin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(keysRouter);
router.use(adminsRouter);
router.use(warningsRouter);
router.use(adminRouter);

export default router;
