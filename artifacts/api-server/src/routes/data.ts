import { Router, type IRouter } from "express";
import {
  ListDataSourcesResponse,
  GetIngestionSnapshotResponse,
  GetRelevanceFilterResponse,
  ListValidationItemsResponse,
  ListDocumentFreshnessResponse,
} from "@workspace/api-zod";
import {
  DATA_SOURCES,
  INGESTION_SNAPSHOT,
  RELEVANCE_FILTER,
  VALIDATION_ITEMS,
  DOC_FRESHNESS,
} from "../data/dataCenter";

const router: IRouter = Router();

router.get("/data/sources", (_req, res) => {
  res.json(ListDataSourcesResponse.parse(DATA_SOURCES));
});

router.get("/data/ingestion", (_req, res) => {
  res.json(GetIngestionSnapshotResponse.parse(INGESTION_SNAPSHOT));
});

router.get("/data/relevance-filter", (_req, res) => {
  res.json(GetRelevanceFilterResponse.parse(RELEVANCE_FILTER));
});

router.get("/data/validation", (_req, res) => {
  res.json(ListValidationItemsResponse.parse(VALIDATION_ITEMS));
});

router.get("/data/freshness", (_req, res) => {
  res.json(ListDocumentFreshnessResponse.parse(DOC_FRESHNESS));
});

export default router;
