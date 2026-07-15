import { Router, type IRouter } from "express";
import {
  GetTaxonomyStateResponse,
  ProposeRetagBody,
  ProposeRetagResponse,
  ApplyRetagBody,
  ApplyRetagResponse,
  ListAxisAffectedDocumentsResponse,
  RollbackTaxonomyBody,
  RollbackTaxonomyResponse,
} from "@workspace/api-zod";
import { AXES, getDoc } from "../data/corpus";
import {
  currentTaxonomyVersion,
  listTaxonomyVersions,
  applyRetag,
  retagCandidatesForAxis,
  planRollback,
  commitRollback,
  type AxisOp,
  type TaxonomyVersionKind,
} from "../data/governance";
import { proposeRetag, RetagInputError } from "../agent/retagAgent";
import {
  isQdrantConfigured,
  setDocPayloads,
  setDocGovernancePayload,
  collectionStatus,
  scrollDocsByAxis,
  vectorHashForDoc,
  countDocAxisPoints,
  getEmbedCallCount,
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
        kind: v.kind ?? null,
        rolledBackTo: v.rolledBackTo ?? null,
        axisOps: v.axisOps ?? [],
      })),
    }),
  );
});

// Live mapping table: the documents shown in the wizard come from a Qdrant
// payload-index scroll, not from a static in-memory list. The in-memory count
// is returned alongside so the UI can prove index and working set agree.
router.get("/governance/axes/:axisId/affected", async (req, res) => {
  const axisId = req.params.axisId;
  const axis = AXES.find((a) => a.id === axisId);
  if (!axis) {
    res.status(404).json({ error: "Unknown axis" });
    return;
  }
  const memory = retagCandidatesForAxis(axisId);
  try {
    if (isQdrantConfigured()) {
      const scroll = await scrollDocsByAxis(axisId);
      const docs = scroll.docs
        .map((d) => {
          const doc = getDoc(d.docId);
          return {
            docId: d.docId,
            title: doc?.title ?? d.docId,
            type: doc?.type ?? "document",
            confidentiality: doc?.confidentiality ?? "public",
            axisIds: d.axisIds,
            topics: d.topics,
            pointCount: d.pointCount,
          };
        })
        .sort((a, b) => a.title.localeCompare(b.title));
      res.json(
        ListAxisAffectedDocumentsResponse.parse({
          axisId,
          axisName: axis.name,
          source: "qdrant",
          docs,
          memoryDocCount: memory.length,
          qdrantDocCount: docs.length,
          totalPoints: scroll.totalPoints,
          countsMatch: docs.length === memory.length,
        }),
      );
      return;
    }
    res.json(
      ListAxisAffectedDocumentsResponse.parse({
        axisId,
        axisName: axis.name,
        source: "memory",
        docs: memory
          .map((c) => ({
            docId: c.docId,
            title: c.title,
            type: c.type,
            confidentiality: getDoc(c.docId)?.confidentiality ?? "public",
            axisIds: c.axisIds,
            topics: c.topics,
            pointCount: 0,
          }))
          .sort((a, b) => a.title.localeCompare(b.title)),
        memoryDocCount: memory.length,
        qdrantDocCount: null,
        totalPoints: null,
        countsMatch: true,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "governance: affected documents scroll failed");
    res.status(500).json({ error: "The Hub could not read the vector index." });
  }
});

router.post("/governance/retag/propose", async (req, res) => {
  const parsed = ProposeRetagBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  try {
    const result = await proposeRetag(
      {
        axisId: parsed.data.axisId,
        newName: parsed.data.newName,
        newDescription: parsed.data.newDescription,
        kind: (parsed.data.kind ?? null) as "rename" | "split" | "merge" | null,
        splitNewAxisName: parsed.data.splitNewAxisName,
        splitNewAxisDescription: parsed.data.splitNewAxisDescription,
        mergeIntoAxisId: parsed.data.mergeIntoAxisId,
      },
      req.log,
    );
    if (!result) {
      res.status(404).json({ error: "Unknown axis" });
      return;
    }
    res.json(ProposeRetagResponse.parse(result));
  } catch (err) {
    if (err instanceof RetagInputError) {
      res.status(400).json({ error: err.message, code: "invalid_taxonomy_edit" });
      return;
    }
    req.log.error({ err }, "governance: propose retag failed");
    res.status(500).json({ error: "The Hub could not build re-tagging proposals." });
  }
});

// Instrumented docs cap: hashing every vector of every accepted document is
// exact but slow on large batches; the proof samples the CHANGED documents
// first (where faking would hide), capped to keep Apply responsive.
const PROOF_DOC_CAP = 8;

interface FilterExpectation {
  docId: string;
  axisId: string;
  expectation: "removed" | "added" | "kept";
}

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
    // creating a split-brain between taxonomy and index.
    const nextVersion = currentTaxonomyVersion() + 1;
    const axisOps = (parsed.data.axisOps ?? []) as AxisOp[];
    const kind = (parsed.data.kind ?? undefined) as TaxonomyVersionKind | undefined;
    const accepted = parsed.data.decisions.filter((d) => d.accept && getDoc(d.docId));

    let qdrant: { updatedDocs: number; pointsBefore: number; pointsAfter: number } | null =
      null;
    let proof: {
      embedCallsBefore: number;
      embedCallsAfter: number;
      embedCallsDelta: number;
      vectorHashes: {
        docId: string;
        pointCount: number;
        before: string;
        after: string;
        identical: boolean;
      }[];
      filterChecks: {
        docId: string;
        axisId: string;
        expectation: "removed" | "added" | "kept";
        beforeCount: number;
        afterCount: number;
        passed: boolean;
      }[];
    } | null = null;

    if (isQdrantConfigured()) {
      // Axes whose membership this apply is about: the edited axis plus any
      // axis created or retired by the structural ops (split sibling, merge
      // source/target).
      const interestAxes = new Set<string>();
      if (parsed.data.axisEdit?.axisId) interestAxes.add(parsed.data.axisEdit.axisId);
      for (const op of axisOps) {
        if (op.axisId) interestAxes.add(op.axisId);
        if (op.axis?.id) interestAxes.add(op.axis.id);
      }
      for (const d of accepted) {
        const doc = getDoc(d.docId)!;
        for (const a of d.axisIds) if (!doc.axisIds.includes(a)) interestAxes.add(a);
        for (const a of doc.axisIds) if (!d.axisIds.includes(a)) interestAxes.add(a);
      }

      // Sample changed documents first — that is where faking would hide.
      const changed = accepted.filter((d) => {
        const doc = getDoc(d.docId)!;
        const before = new Set(doc.axisIds);
        const after = new Set(d.axisIds);
        return (
          doc.axisIds.length !== d.axisIds.length ||
          [...before].some((a) => !after.has(a)) ||
          [...after].some((a) => !before.has(a))
        );
      });
      const unchanged = accepted.filter((d) => !changed.includes(d));
      const sampled = [...changed, ...unchanged].slice(0, PROOF_DOC_CAP);

      const expectations: FilterExpectation[] = [];
      for (const d of sampled) {
        const doc = getDoc(d.docId)!;
        for (const axisId of interestAxes) {
          const before = doc.axisIds.includes(axisId);
          const after = d.axisIds.includes(axisId);
          if (!before && !after) continue;
          expectations.push({
            docId: d.docId,
            axisId,
            expectation: before && after ? "kept" : before ? "removed" : "added",
          });
        }
      }

      const embedCallsBefore = getEmbedCallCount();
      const statusBefore = await collectionStatus();
      const hashesBefore = new Map<string, { pointCount: number; hash: string }>();
      for (const d of sampled) hashesBefore.set(d.docId, await vectorHashForDoc(d.docId));
      const countsBefore = new Map<string, number>();
      for (const e of expectations) {
        countsBefore.set(
          `${e.docId}:${e.axisId}`,
          await countDocAxisPoints(e.docId, e.axisId),
        );
      }

      await setDocPayloads(
        accepted.map((d) => ({ docId: d.docId, axisIds: d.axisIds, topics: d.topics })),
        nextVersion,
      );

      // Live-ingested docs rehydrate from their durable `liveDoc` blob at boot.
      // Refresh the blob for re-tagged live docs BEFORE the local commit so a
      // failure here leaves local governance untouched, and the point payload
      // and the blob always agree (a restart never resurrects pre-retag tags).
      for (const d of accepted) {
        if (!d.docId.startsWith("doc-live-")) continue;
        const doc = getDoc(d.docId);
        if (doc) {
          await setDocGovernancePayload(d.docId, {
            liveDoc: { ...doc, axisIds: d.axisIds, topics: d.topics },
          });
        }
      }
      const statusAfter = await collectionStatus();
      const vectorHashes = [];
      for (const d of sampled) {
        const before = hashesBefore.get(d.docId)!;
        const after = await vectorHashForDoc(d.docId);
        vectorHashes.push({
          docId: d.docId,
          pointCount: after.pointCount,
          before: before.hash,
          after: after.hash,
          identical: before.hash === after.hash && before.pointCount === after.pointCount,
        });
      }
      const filterChecks = [];
      for (const e of expectations) {
        const beforeCount = countsBefore.get(`${e.docId}:${e.axisId}`) ?? 0;
        const afterCount = await countDocAxisPoints(e.docId, e.axisId);
        const passed =
          e.expectation === "removed"
            ? beforeCount > 0 && afterCount === 0
            : e.expectation === "added"
              ? afterCount > 0
              : beforeCount > 0 && afterCount === beforeCount;
        filterChecks.push({
          docId: e.docId,
          axisId: e.axisId,
          expectation: e.expectation,
          beforeCount,
          afterCount,
          passed,
        });
      }
      const embedCallsAfter = getEmbedCallCount();

      qdrant = {
        updatedDocs: accepted.length,
        pointsBefore: statusBefore.pointsCount,
        pointsAfter: statusAfter.pointsCount,
      };
      proof = {
        embedCallsBefore,
        embedCallsAfter,
        embedCallsDelta: embedCallsAfter - embedCallsBefore,
        vectorHashes,
        filterChecks,
      };
    }

    const result = applyRetag({
      actor: parsed.data.actor,
      note: parsed.data.note,
      axisEdit: parsed.data.axisEdit ?? null,
      decisions: parsed.data.decisions,
      kind,
      axisOps,
    });
    req.log.info({ ...result, qdrant, proof: proof ? {
      embedCallsDelta: proof.embedCallsDelta,
      hashesIdentical: proof.vectorHashes.every((h) => h.identical),
      filterChecksPassed: proof.filterChecks.every((c) => c.passed),
    } : null }, "governance: taxonomy version applied");
    res.json(ApplyRetagResponse.parse({ ...result, qdrant, proof }));
  } catch (err) {
    req.log.error({ err }, "governance: apply retag failed");
    res.status(500).json({ error: "The Hub could not apply the re-tagging." });
  }
});

router.post("/governance/rollback", async (req, res) => {
  const parsed = RollbackTaxonomyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  try {
    const plan = planRollback(parsed.data.toVersion);
    if (!plan) {
      res.status(400).json({
        error: "Unknown or invalid target version — rollback must target an earlier applied version or the seed.",
        code: "invalid_rollback_target",
      });
      return;
    }
    // Same commit order as Apply: the vector index is updated FIRST
    // (payload-only), the local version is committed only if Qdrant accepted
    // the reverted tags.
    const nextVersion = currentTaxonomyVersion() + 1;
    let qdrant: { updatedDocs: number; pointsBefore: number; pointsAfter: number } | null =
      null;
    if (isQdrantConfigured() && plan.overrides.length > 0) {
      const before = await collectionStatus();
      await setDocPayloads(
        plan.overrides.map((o) => ({ docId: o.docId, axisIds: o.axisIds, topics: o.topics })),
        nextVersion,
      );
      const after = await collectionStatus();
      qdrant = {
        updatedDocs: plan.overrides.length,
        pointsBefore: before.pointsCount,
        pointsAfter: after.pointsCount,
      };
    }
    const result = commitRollback(plan, parsed.data.actor);
    req.log.info({ ...result, qdrant }, "governance: taxonomy rollback applied");
    res.json(RollbackTaxonomyResponse.parse({ ...result, qdrant }));
  } catch (err) {
    req.log.error({ err }, "governance: rollback failed");
    res.status(500).json({ error: "The Hub could not roll the taxonomy back." });
  }
});

export default router;
