import { Router, type IRouter } from "express";
import {
  ListSuggestionsResponse,
  ListAxesResponse,
  ListRolesResponse,
  ListDocumentsResponse,
  GetCorpusStatsResponse,
  GetHomeSummaryResponse,
  ListRadarResponse,
  GetDocumentParams,
  GetDocumentResponse,
} from "@workspace/api-zod";
import { AXES, ROLES, DOCS, SUGGESTIONS, getDoc, type Area } from "../data/corpus";
import { corpusStatsFor, homeSummaryFor, radarFor } from "../adapters/home";

const router: IRouter = Router();

function roleIdParam(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

const AREAS: readonly Area[] = ["Comunicación", "Marca", "Gabinete"];

function areaParam(value: unknown): Area | undefined {
  return typeof value === "string" && (AREAS as readonly string[]).includes(value)
    ? (value as Area)
    : undefined;
}

router.get("/suggestions", (_req, res) => {
  res.json(ListSuggestionsResponse.parse(SUGGESTIONS));
});

router.get("/axes", (_req, res) => {
  res.json(ListAxesResponse.parse(AXES));
});

router.get("/roles", (_req, res) => {
  res.json(ListRolesResponse.parse(ROLES));
});

router.get("/documents", (_req, res) => {
  const items = DOCS.map((d) => ({
    id: d.id,
    title: d.title,
    country: d.country,
    brand: d.brand,
    entity: d.entity,
    quarter: d.quarter,
    type: d.type,
    confidentiality: d.confidentiality,
    owner: d.owner,
    validity: d.validity,
    validUntil: d.validUntil,
    language: d.language,
    topics: d.topics,
    axisIds: d.axisIds,
    summary: d.summary,
    chunkCount: d.chunks.length,
    sourceFormat: d.sourceFormat,
    connector: d.connector,
  }));
  res.json(ListDocumentsResponse.parse(items));
});

router.get("/corpus/stats", (req, res) => {
  const stats = corpusStatsFor(roleIdParam(req.query.roleId));
  res.json(GetCorpusStatsResponse.parse(stats));
});

router.get("/home/summary", (req, res) => {
  const summary = homeSummaryFor(
    roleIdParam(req.query.roleId),
    areaParam(req.query.area),
  );
  res.json(GetHomeSummaryResponse.parse(summary));
});

router.get("/radar", (req, res) => {
  const items = radarFor(roleIdParam(req.query.roleId), areaParam(req.query.area));
  res.json(ListRadarResponse.parse(items));
});

router.get("/documents/:id", (req, res) => {
  const params = GetDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid document id" });
    return;
  }
  const doc = getDoc(params.data.id);
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  const data = {
    document: {
      id: doc.id,
      title: doc.title,
      country: doc.country,
      brand: doc.brand,
      entity: doc.entity,
      quarter: doc.quarter,
      type: doc.type,
      confidentiality: doc.confidentiality,
      owner: doc.owner,
      validity: doc.validity,
      validUntil: doc.validUntil,
      language: doc.language,
      topics: doc.topics,
      axisIds: doc.axisIds,
      summary: doc.summary,
      chunkCount: doc.chunks.length,
      sourceFormat: doc.sourceFormat,
      connector: doc.connector,
    },
    chunks: doc.chunks.map((c) => ({
      id: c.id,
      breadcrumb: c.breadcrumb,
      heading: c.heading,
      text: c.text,
    })),
  };
  res.json(GetDocumentResponse.parse(data));
});

export default router;
