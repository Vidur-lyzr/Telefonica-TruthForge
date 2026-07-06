import { Router, type IRouter } from "express";
import healthRouter from "./health";
import askRouter from "./ask";
import knowledgeRouter from "./knowledge";

const router: IRouter = Router();

router.use(healthRouter);
router.use(askRouter);
router.use(knowledgeRouter);

export default router;
