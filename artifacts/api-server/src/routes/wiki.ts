import { Router, type IRouter } from "express";
import {
  GetWikiGraphQueryParams,
  GetWikiGraphResponse,
  ListWikiPagesQueryParams,
  ListWikiPagesResponse,
  GetWikiPageQueryParams,
  GetWikiPageResponse,
  ListWikiLineageQueryParams,
  ListWikiLineageResponse,
  GetWikiStatsResponse,
  SearchWikiBody,
  SearchWikiResponse,
} from "@workspace/api-zod";
import {
  ROLES,
  DOCS,
  COMPILED_PAGES,
  DOC_LINEAGE,
  WIKI_STATS,
  CLEARANCE_RANK,
  getDoc,
  type Clearance,
} from "../data/corpus";
import { buildWikiGraph } from "../adapters/kg";
import { runWikiSearch } from "../agent/wikiSearchAgent";

const router: IRouter = Router();

function clearanceForRole(roleId: string): Clearance {
  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0];
  return role.clearance;
}

router.get("/wiki/graph", (req, res) => {
  const params = GetWikiGraphQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const clearance = clearanceForRole(params.data.roleId);
  res.json(GetWikiGraphResponse.parse(buildWikiGraph(clearance)));
});

router.get("/wiki/pages", (req, res) => {
  const params = ListWikiPagesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const clearance = clearanceForRole(params.data.roleId);
  const roleRank = CLEARANCE_RANK[clearance];

  const items = COMPILED_PAGES.map((p) => {
    const locked = CLEARANCE_RANK[p.confidentiality] > roleRank;
    return {
      id: p.id,
      nodeId: p.nodeId,
      title: locked ? "Restricted page" : p.title,
      axisId: p.axisId,
      summary: locked
        ? "This compiled page is above your clearance."
        : p.summary,
      confidentiality: p.confidentiality,
      validity: p.validity,
      sourceCount: p.sourceDocIds.length,
      owners: locked ? [] : p.owners,
      lastRefinedBy: locked ? "" : p.lastRefinedBy,
      lastRefinedAt: locked ? "" : p.lastRefinedAt,
      refined: locked ? false : p.refined,
      locked,
    };
  });
  res.json(ListWikiPagesResponse.parse(items));
});

router.get("/wiki/page", (req, res) => {
  const params = GetWikiPageQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const clearance = clearanceForRole(params.data.roleId);
  const roleRank = CLEARANCE_RANK[clearance];
  const page = COMPILED_PAGES.find((p) => p.id === params.data.id);
  if (!page) {
    res.status(404).json({ error: "Page not found" });
    return;
  }

  if (CLEARANCE_RANK[page.confidentiality] > roleRank) {
    res.json(
      GetWikiPageResponse.parse({
        locked: true,
        requiredClearance: page.confidentiality,
        title: null,
        page: null,
      }),
    );
    return;
  }

  const titleById = new Map(COMPILED_PAGES.map((p) => [p.id, p.title]));
  const evidence = page.evidence
    .filter((ev) => {
      const doc = getDoc(ev.docId);
      return doc && CLEARANCE_RANK[doc.confidentiality] <= roleRank; // fail closed
    })
    .map((ev) => {
      const doc = getDoc(ev.docId);
      const chunk = doc?.chunks.find((c) => c.id === ev.chunkId) ?? doc?.chunks[0];
      return {
        marker: ev.marker,
        docId: ev.docId,
        docTitle: doc?.title ?? ev.docId,
        sourceLoc: chunk?.breadcrumb ?? doc?.title ?? ev.docId,
        snippet: chunk?.text ?? "",
        confidentiality: doc?.confidentiality ?? "public",
        validity: doc?.validity ?? "approved",
        note: ev.note,
      };
    });

  const resolvedFacts = page.resolvedFacts.map((f) => ({
    id: f.id,
    claim: f.claim,
    resolvedValue: f.resolvedValue,
    supersededValue: f.supersededValue,
    resolution: f.resolution,
    currentDocId: f.currentDocId,
    currentDocTitle: getDoc(f.currentDocId)?.title ?? f.currentDocId,
    historicDocId: f.historicDocId,
    historicDocTitle: getDoc(f.historicDocId)?.title ?? f.historicDocId,
    resolvedBy: f.resolvedBy,
    resolvedAt: f.resolvedAt,
  }));

  const relatedPages = page.relatedPageIds.map((rid) => {
    const rp = COMPILED_PAGES.find((p) => p.id === rid);
    const locked = rp ? CLEARANCE_RANK[rp.confidentiality] > roleRank : true;
    return {
      id: rid,
      nodeId: rp?.nodeId ?? rid,
      title: locked ? "Restricted page" : (titleById.get(rid) ?? rid),
      locked,
    };
  });

  res.json(
    GetWikiPageResponse.parse({
      locked: false,
      requiredClearance: null,
      title: page.title,
      page: {
        id: page.id,
        nodeId: page.nodeId,
        title: page.title,
        axisId: page.axisId,
        confidentiality: page.confidentiality,
        validity: page.validity,
        summary: page.summary,
        position: page.position,
        evidence,
        resolvedFacts,
        openItems: page.openItems,
        relatedPages,
        changeLog: page.changeLog,
        owners: page.owners,
        sourceDocIds: page.sourceDocIds,
        lastRefinedBy: page.lastRefinedBy,
        lastRefinedAt: page.lastRefinedAt,
        refined: page.refined,
      },
    }),
  );
});

router.get("/wiki/lineage", (req, res) => {
  const params = ListWikiLineageQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const clearance = clearanceForRole(params.data.roleId);
  const roleRank = CLEARANCE_RANK[clearance];
  const lineageByDoc = new Map(DOC_LINEAGE.map((l) => [l.docId, l]));

  const items = DOCS.map((d) => {
    const locked = CLEARANCE_RANK[d.confidentiality] > roleRank;
    const lineage = lineageByDoc.get(d.id);
    if (locked) {
      return {
        docId: d.id,
        title: "Restricted document",
        confidentiality: d.confidentiality,
        validity: d.validity,
        axisIds: d.axisIds,
        owner: "",
        locked: true,
        sourceFile: null,
        taxonomyVersion: null,
        chunkCount: null,
        ingestion: [],
        validation: [],
      };
    }
    return {
      docId: d.id,
      title: d.title,
      confidentiality: d.confidentiality,
      validity: d.validity,
      axisIds: d.axisIds,
      owner: d.owner,
      locked: false,
      sourceFile: lineage?.sourceFile ?? null,
      taxonomyVersion: lineage?.taxonomyVersion ?? null,
      chunkCount: d.chunks.length,
      ingestion: lineage?.ingestion ?? [],
      validation: lineage?.validation ?? [],
    };
  });
  res.json(ListWikiLineageResponse.parse(items));
});

router.get("/wiki/stats", (_req, res) => {
  res.json(GetWikiStatsResponse.parse(WIKI_STATS));
});

router.post("/wiki/search", async (req, res) => {
  const parsed = SearchWikiBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  try {
    const result = await runWikiSearch(parsed.data, req.log);
    res.json(SearchWikiResponse.parse(result));
    return;
  } catch (err) {
    req.log.error({ err }, "wiki search route failed");
    res.status(500).json({ error: "The Hub could not complete this request." });
    return;
  }
});

export default router;
