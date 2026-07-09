import { Router, type IRouter } from "express";
import {
  GetTaxonomyStateResponse,
  ProposeRetagBody,
  ProposeRetagResponse,
  ApplyRetagBody,
  ApplyRetagResponse,
} from "@workspace/api-zod";
import { AXES } from "../data/corpus";
import {
  currentTaxonomyVersion,
  listTaxonomyVersions,
  applyRetag,
} from "../data/governance";
import { proposeRetag } from "../agent/retagAgent";
import {
  isQdrantConfigured,
  setDocPayloads,
  collectionStatus,
} from "../adapters/qdrant";

const router: IRouter = Router();

const SEED_VERSION = 4;

router.get("/governance/taxonomy", (_req, res) => {
  res.json(
    GetTaxonomyStateResponse.parse({
      activeVersion: currentTaxonomyVersion(),
      seedVersion: SEED_VERSION,
      axes: AXES,
      versions: listTaxonomyVersions().map((v) => ({
        version: v.version,
        createdAt: v.createdAt,
        actor: v.actor,
        note: v.note,
        axisEdit: v.axisEdit,
        retaggedCount: v.overrides.length,
      })),
    }),
  );
});

router.post("/governance/retag/propose", async (req, res) => {
  const parsed = ProposeRetagBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  try {
    const result = await proposeRetag(parsed.data, req.log);
    if (!result) {
      res.status(404).json({ error: "Unknown axis" });
      return;
    }
    res.json(ProposeRetagResponse.parse(result));
  } catch (err) {
    req.log.error({ err }, "governance: propose retag failed");
    res.status(500).json({ error: "The Hub could not build re-tagging proposals." });
  }
});

router.post("/governance/retag/apply", async (req, res) => {
  const parsed = ApplyRetagBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  try {
    // Mirror the accepted overrides into Qdrant FIRST, as payload-only
    // updates (set_payload mutates chunk METADATA in place: vectors are never
    // recomputed, nothing is re-ingested). Only if the vector index accepts
    // the new payloads is the taxonomy version committed locally — a Qdrant
    // failure therefore leaves governance state untouched instead of
    // creating a split-brain between taxonomy and index. The before/after
    // point counts are returned as proof.
    const nextVersion = currentTaxonomyVersion() + 1;
    let qdrant: { updatedDocs: number; pointsBefore: number; pointsAfter: number } | null = null;
    if (isQdrantConfigured()) {
      const accepted = parsed.data.decisions.filter((d) => d.accept);
      const before = await collectionStatus();
      await setDocPayloads(
        accepted.map((d) => ({ docId: d.docId, axisIds: d.axisIds, topics: d.topics })),
        nextVersion,
      );
      const after = await collectionStatus();
      qdrant = {
        updatedDocs: accepted.length,
        pointsBefore: before.pointsCount,
        pointsAfter: after.pointsCount,
      };
    }

    const result = applyRetag({
      actor: parsed.data.actor,
      note: parsed.data.note,
      axisEdit: parsed.data.axisEdit ?? null,
      decisions: parsed.data.decisions,
    });
    req.log.info({ ...result, qdrant }, "governance: taxonomy version applied");
    res.json(ApplyRetagResponse.parse({ ...result, qdrant }));
  } catch (err) {
    req.log.error({ err }, "governance: apply retag failed");
    res.status(500).json({ error: "The Hub could not apply the re-tagging." });
  }
});

export default router;
