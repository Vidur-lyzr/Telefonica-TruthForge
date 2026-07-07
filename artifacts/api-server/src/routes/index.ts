import { Router, type IRouter } from "express";
import healthRouter from "./health";
import askRouter from "./ask";
import knowledgeRouter from "./knowledge";
import adminRouter from "./admin";
import kpisRouter from "./kpis";

const router: IRouter = Router();

router.use(healthRouter);
router.use(askRouter);
router.use(knowledgeRouter);
router.use(adminRouter);
router.use(kpisRouter);

export default router;
