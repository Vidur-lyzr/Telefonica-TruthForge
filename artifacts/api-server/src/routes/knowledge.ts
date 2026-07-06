import { Router, type IRouter } from "express";
import {
  ListSuggestionsResponse,
  ListAxesResponse,
  ListRolesResponse,
  ListDocumentsResponse,
  GetCorpusStatsResponse,
  GetDocumentParams,
  GetDocumentResponse,
} from "@workspace/api-zod";
import { AXES, ROLES, DOCS, SUGGESTIONS, getDoc } from "../data/corpus";

const router: IRouter = Router();

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
  }));
  res.json(ListDocumentsResponse.parse(items));
});

router.get("/corpus/stats", (_req, res) => {
  const tally = (fn: (d: (typeof DOCS)[number]) => string) => {
    const map = new Map<string, number>();
    for (const d of DOCS) map.set(fn(d), (map.get(fn(d)) ?? 0) + 1);
    return Array.from(map.entries()).map(([key, count]) => ({ key, count }));
  };

  const byAxisMap = new Map<string, number>();
  for (const d of DOCS)
    for (const a of d.axisIds) byAxisMap.set(a, (byAxisMap.get(a) ?? 0) + 1);

  const stats = {
    totalDocuments: DOCS.length,
    totalChunks: DOCS.reduce((sum, d) => sum + d.chunks.length, 0),
    quarantined: DOCS.filter(
      (d) => d.validity === "superseded" || d.validity === "review",
    ).length,
    byCountry: tally((d) => d.country),
    byType: tally((d) => d.type),
    byConfidentiality: tally((d) => d.confidentiality),
    byValidity: tally((d) => d.validity),
    byAxis: Array.from(byAxisMap.entries()).map(([axisId, count]) => ({
      axisId,
      count,
    })),
  };
  res.json(GetCorpusStatsResponse.parse(stats));
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
