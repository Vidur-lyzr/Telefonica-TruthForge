import { Router, type IRouter } from "express";
import healthRouter from "./health";
import askRouter from "./ask";
import knowledgeRouter from "./knowledge";
import adminRouter from "./admin";
import kpisRouter from "./kpis";
import planningRouter from "./planning";
import generateRouter from "./generate";
import wikiRouter from "./wiki";
import dataRouter from "./data";
import brandRouter from "./brand";
import governanceRouter from "./governance";
import qualityRouter from "./quality";

const router: IRouter = Router();

router.use(healthRouter);
router.use(askRouter);
router.use(knowledgeRouter);
router.use(adminRouter);
router.use(kpisRouter);
router.use(planningRouter);
router.use(generateRouter);
router.use(wikiRouter);
router.use(dataRouter);
router.use(brandRouter);
router.use(governanceRouter);
router.use(qualityRouter);

export default router;
