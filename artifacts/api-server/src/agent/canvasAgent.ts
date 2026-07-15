// Canvas agent — governed, block-scoped editing for the Generate canvas.
//
// The edit path is a side channel of its own, so it enforces the same chain
// as Generate itself ("one resolver, no side doors"):
//
//  - Retrieval goes through the shared kb adapter (resolveDocAccess inside),
//    at the persona's clearance capped by the DESTINATION — an external
//    audience retrieves public-only material BEFORE the model runs.
//  - The model rewrites ONLY the addressed block; every other block of the
//    draft stays byte-identical.
//  - Citation markers are verified against actually retrieved sources.
//    Surviving [S#] ids stay stable (no renumber — that would touch other
//    blocks); new sources are appended with the next free numbers; sources no
//    longer referenced anywhere in the draft are pruned.
//  - Brand Guardian re-runs on the edited block BEFORE the edit is applied:
//    an error-severity finding blocks it deterministically, outside the model.
//  - Every edit is audited: persona, block id, instruction, the filter
//    expression in force, sources retrieved with access decisions, and the
//    before/after content.

import { meteredCreate } from "./metering";
import { retrieveGoverned, resolveDoc } from "../adapters/kb";
import {
  beginRetrievalAudit,
  finalizeRetrievalAudit,
} from "../data/retrievalLog";
import { queryAll as numericQueryAll } from "../adapters/numeric";
import {
  CLEARANCE_RANK,
  ROLES,
  DOCS,
  NUMERIC_FACTS,
  type Clearance,
} from "../data/corpus";
import { getTemplate, DISCLAIMERS } from "../data/assets";
import { runBrandGuardian, checkBrandText } from "./brandGuardian";
import { sanitizeSectionBody } from "./bodyText";
import type {
  GeneratedDraft,
  DraftSection,
  DraftCitation,
  GuardianResult,
} from "./generateAgent";

const MODEL = "claude-sonnet-4-6";
const COVERAGE_MIN = 0.33;

// Block kinds the agent may never rewrite. Locked in the UI as well — this is
// the server-authoritative backstop.
export const LOCKED_BLOCK_KINDS = new Set(["boilerplate", "contact", "logo", "image"]);

export class BlockLockedError extends Error {
  readonly kind: string;
  constructor(kind: string) {
    super(`Block kind "${kind}" is a locked corporate asset and cannot be edited by the agent.`);
    this.kind = kind;
  }
}

interface Logger {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
}

// ── Edit audit (brief §6.6) ─────────────────────────────────────────────────
// In-memory, capped — same tier as the rest of the demo persistence. The
// retrieval itself ALSO lands in the F3 retrieval log via the kb adapter;
// this store adds the block scope and before/after content.

export interface CanvasEditAuditEntry {
  id: string;
  timestamp: string;
  roleId: string;
  roleLabel: string;
  sectionId: string;
  blockKind: string;
  instruction: string;
  filterExpr: string;
  sources: { docId: string; docTitle: string; accessible: boolean; confidentiality: string }[];
  before: string;
  after: string;
  status: "applied" | "blocked" | "no_change" | "locked";
}

const MAX_EDIT_AUDIT = 300;
const editAudit: CanvasEditAuditEntry[] = [];
let editCounter = 0;

function recordEditAudit(entry: Omit<CanvasEditAuditEntry, "id" | "timestamp">): void {
  editCounter += 1;
  editAudit.push({
    id: `cedit-${Date.now()}-${editCounter}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (editAudit.length > MAX_EDIT_AUDIT) editAudit.splice(0, editAudit.length - MAX_EDIT_AUDIT);
}

export function listCanvasEditAudit(): CanvasEditAuditEntry[] {
  return [...editAudit].reverse();
}

// ── Shared governance derivation ────────────────────────────────────────────

function bodyClearanceFor(draft: GeneratedDraft, clearance: Clearance): { bodyRank: number; bodyClearance: Clearance; filterExpr: string } {
  const destRank =
    CLEARANCE_RANK[draft.confidentiality as Clearance] ?? CLEARANCE_RANK[clearance];
  const bodyRank = Math.min(
    CLEARANCE_RANK[clearance],
    destRank,
    draft.audience === "external" ? CLEARANCE_RANK.public : CLEARANCE_RANK[clearance],
  );
  const bodyClearance: Clearance =
    (Object.entries(CLEARANCE_RANK).find(([, r]) => r === bodyRank)?.[0] as
      | Clearance
      | undefined) ?? "public";
  const filterExpr = `confidentiality<=${bodyClearance} (persona ${clearance} ∩ destination ${draft.confidentiality}${
    draft.audience === "external" ? " ∩ external→public" : ""
  })`;
  return { bodyRank, bodyClearance, filterExpr };
}

function extractJson(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ── Block-scoped edit ───────────────────────────────────────────────────────

export interface CanvasEditInput {
  draft: GeneratedDraft;
  sectionId: string;
  instruction: string;
  roleId: string;
}

export interface CanvasEditOutcome {
  status: "applied" | "blocked" | "no_change";
  draft: GeneratedDraft;
  section: DraftSection | null;
  guardian: GuardianResult | null;
  note: string | null;
}

export async function editCanvasBlock(
  input: CanvasEditInput,
  log: Logger,
): Promise<CanvasEditOutcome> {
  const { draft, sectionId, instruction } = input;
  const role = ROLES.find((r) => r.id === input.roleId) ?? ROLES[0];
  const clearance: Clearance = role.clearance;
  const section = draft.sections.find((s) => s.id === sectionId);
  if (!section) {
    throw new Error(`Unknown section "${sectionId}" in draft ${draft.id}.`);
  }
  if (LOCKED_BLOCK_KINDS.has(section.kind)) {
    recordEditAudit({
      roleId: role.id,
      roleLabel: role.label,
      sectionId,
      blockKind: section.kind,
      instruction,
      filterExpr: "n/a — locked block, no retrieval performed",
      sources: [],
      before: section.body,
      after: section.body,
      status: "locked",
    });
    throw new BlockLockedError(section.kind);
  }

  const { bodyRank, bodyClearance, filterExpr } = bodyClearanceFor(draft, clearance);

  const auditId = beginRetrievalAudit({
    surface: "generate",
    roleId: role.id,
    roleLabel: role.label,
    clearance,
    area: role.area,
  });

  // Two coverage-gated passes, never folded together (coverage is a ratio —
  // mixing block context with the instruction would dilute both):
  //  1. the block's own topical context (draft topic + block heading)
  //  2. the instruction itself, so newly requested material can enter.
  // Both run at the PERSONA clearance so exclusions can be explained honestly,
  // and are then capped to the destination rank before anything reaches the
  // model — identical to the Generate dual filter.
  const contextQuery = [draft.params.topic, section.heading].filter(Boolean).join(" ");
  const passes = (
    await Promise.all([
      retrieveGoverned({ question: contextQuery, clearance, topK: 8, audit: { id: auditId } }),
      retrieveGoverned({ question: instruction, clearance, topK: 6, audit: { id: auditId } }),
    ])
  ).map((r) => r.chunks);
  const seen = new Set<string>();
  const relevant = passes
    .flat()
    .filter((c) => c.coverage >= COVERAGE_MIN)
    .filter((c) => (seen.has(c.chunkId) ? false : (seen.add(c.chunkId), true)));
  const permitted = relevant.filter(
    (c) =>
      c.accessible &&
      CLEARANCE_RANK[(resolveDoc(c.docId)?.confidentiality as Clearance) ?? "off_the_record"] <=
        bodyRank,
  );
  const excluded = relevant.filter((c) => !permitted.includes(c));

  const auditSources = relevant.map((c) => {
    const doc = resolveDoc(c.docId);
    return {
      docId: c.docId,
      docTitle: doc?.title ?? c.docId,
      accessible: permitted.includes(c),
      confidentiality: doc?.confidentiality ?? "off_the_record",
    };
  });

  // ---- Stable citation numbering -------------------------------------------
  // Existing citations keep their ids (renumbering would touch other blocks).
  // Candidate NEW sources get the next free numbers.
  const existingByDoc = new Map(draft.citations.map((c) => [c.docId, c]));
  const maxExisting = draft.citations.reduce(
    (m, c) => Math.max(m, Number(c.id.replace(/\D/g, "")) || 0),
    0,
  );
  const candidates: { marker: string; docId: string; chunk: (typeof permitted)[number] }[] = [];
  let next = maxExisting;
  const candidateByDoc = new Map<string, string>();
  for (const c of permitted.slice(0, 6)) {
    const existing = existingByDoc.get(c.docId);
    if (existing) {
      if (!candidateByDoc.has(c.docId)) {
        candidateByDoc.set(c.docId, existing.id);
        candidates.push({ marker: existing.id, docId: c.docId, chunk: c });
      }
      continue;
    }
    if (!candidateByDoc.has(c.docId)) {
      next += 1;
      candidateByDoc.set(c.docId, `S${next}`);
      candidates.push({ marker: `S${next}`, docId: c.docId, chunk: c });
    }
  }

  const sourceBlock = candidates
    .map((s) => {
      const doc = resolveDoc(s.docId);
      return `[${s.marker}] ${doc?.title ?? s.docId} — ${s.chunk.breadcrumb}\n${s.chunk.text}`;
    })
    .join("\n\n");
  const existingList = draft.citations
    .map((c) => `[${c.id}] ${c.docTitle} — ${c.sourceLoc}`)
    .join("\n");

  const systemPrompt = [
    "You are the block editor of Telefónica's Hub SSoT governed canvas.",
    "You rewrite EXACTLY ONE block of a corporate document following the user's instruction.",
    "Every factual claim must carry a source marker like [S1]. You may only use markers listed as existing citations or provided as numbered sources. Never invent a marker, figure, quote or fact.",
    "If the instruction asks for material none of the provided sources support, do NOT fabricate: return the block unchanged and explain honestly in the note field what could not be done and why.",
    "Voice: clear, human, confident. Sentence case. No emoji. No unapproved superlatives ('European leader', 'the largest', 'number one').",
    "The body is plain prose with optional '-' bullet lists, **bold** and *italic*. NEVER draw charts or tables in text: no ASCII art, no pipe '|' column layouts, no markdown tables, no fenced code blocks (```), no horizontal rules.",
    `Write in the same language as the current block (document language: ${draft.language}).`,
    "Return ONLY a single JSON object: { \"body\": string, \"note\": string | null }.",
  ].join(" ");

  const userPrompt = `Document: "${draft.title}" (${draft.shape}, audience ${draft.audience}, destination confidentiality ${draft.confidentiality}).
Block being edited — kind: ${section.kind}, heading: "${section.heading}".

Current block content:
${section.body}

Instruction: ${instruction}

Existing citations already in the document (you may keep citing them where still true):
${existingList || "(none)"}

Numbered sources retrieved for this edit (the ONLY evidence for new claims):
${sourceBlock || "(none retrieved at your permission level)"}${
    excluded.length > 0
      ? `\n\nNote: ${excluded.length} relevant source(s) were excluded by governance (above the permitted level "${bodyClearance}" for this destination). If the instruction depends on them, say so honestly in the note.`
      : ""
  }

Rewrite ONLY this block. Return JSON: { "body": string, "note": string | null }`;

  let raw = "";
  try {
    const message = await meteredCreate("generate", {
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    raw = message.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  } catch (err) {
    log.error({ err }, "canvas edit: model call failed");
    finalizeRetrievalAudit(auditId, "edit_failed");
    recordEditAudit({
      roleId: role.id,
      roleLabel: role.label,
      sectionId,
      blockKind: section.kind,
      instruction,
      filterExpr,
      sources: auditSources,
      before: section.body,
      after: section.body,
      status: "no_change",
    });
    return {
      status: "no_change",
      draft,
      section,
      guardian: null,
      note: "The editing engine could not be reached. The block was left unchanged.",
    };
  }

  const parsed = extractJson(raw) as { body?: string; note?: string | null } | null;
  let newBody = (parsed?.body ?? "").trim();
  const modelNote = parsed?.note ? String(parsed.note).trim() : null;

  // ---- Verify markers against real sources; strip anything unverified ------
  const validMarkers = new Set<string>([
    ...draft.citations.map((c) => c.id),
    ...candidates.map((c) => c.marker),
  ]);
  newBody = newBody
    .replace(/\[([^\]]*)\]/g, (whole, inner: string) => {
      if (!/S\s*\d/i.test(inner)) return whole;
      const kept = [...inner.matchAll(/S\s*(\d+)/gi)]
        .map((m) => `S${Number(m[1])}`)
        .filter((id) => validMarkers.has(id));
      const uniq = [...new Set(kept)];
      if (uniq.length === 0) return "";
      return `[${uniq.join(", ")}]`;
    })
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  newBody = sanitizeSectionBody(newBody);

  if (!newBody || newBody === section.body.trim()) {
    finalizeRetrievalAudit(auditId, "edit_no_change");
    recordEditAudit({
      roleId: role.id,
      roleLabel: role.label,
      sectionId,
      blockKind: section.kind,
      instruction,
      filterExpr,
      sources: auditSources,
      before: section.body,
      after: section.body,
      status: "no_change",
    });
    return {
      status: "no_change",
      draft,
      section,
      guardian: null,
      note:
        modelNote ??
        "No governed source supports that change, so the block was left unchanged rather than inventing content.",
    };
  }

  // ---- Deterministic Guardian gate on the edited block BEFORE applying -----
  const blockCheck = checkBrandText(newBody);
  if (blockCheck.status === "block") {
    finalizeRetrievalAudit(auditId, "edit_blocked");
    recordEditAudit({
      roleId: role.id,
      roleLabel: role.label,
      sectionId,
      blockKind: section.kind,
      instruction,
      filterExpr,
      sources: auditSources,
      before: section.body,
      after: newBody,
      status: "blocked",
    });
    return {
      status: "blocked",
      draft,
      section,
      guardian: blockCheck,
      note: "Brand Guardian blocked this edit — the proposed text breaks a hard brand rule. Nothing was applied.",
    };
  }

  // ---- Apply: replace ONLY this section; every other block byte-identical --
  const usedMarkers = [
    ...new Set([...newBody.matchAll(/S\s*(\d+)/gi)].map((m) => `S${Number(m[1])}`)),
  ];
  const newSection: DraftSection = {
    ...section,
    body: newBody,
    citationIds: usedMarkers,
  };

  // Append citations for newly used sources.
  const topScore = permitted[0]?.score ?? 1;
  const addedCitations: DraftCitation[] = candidates
    .filter((c) => usedMarkers.includes(c.marker) && !existingByDoc.has(c.docId))
    .map((c) => {
      const doc = resolveDoc(c.docId);
      const fact = numericQueryAll(instruction).find((f) => f.docId === c.docId);
      const rel = topScore > 0 ? c.chunk.score / topScore : 0.5;
      return {
        id: c.marker,
        docId: c.docId,
        docTitle: doc?.title ?? c.docId,
        sourceLoc: c.chunk.breadcrumb,
        version: doc?.quarter ?? "",
        owner: doc?.owner ?? "",
        validUntil: doc?.validUntil ?? null,
        confidence: Number(Math.min(0.98, Math.max(0.5, 0.55 + rel * 0.43)).toFixed(2)),
        confidentiality: doc?.confidentiality ?? "public",
        validity: doc?.validity ?? "approved",
        snippet: c.chunk.text,
        value: fact ? `${fact.value}${fact.unit ? " " + fact.unit : ""}` : null,
        country: doc?.country ?? null,
        brand: doc?.brand ?? null,
        axisIds: doc?.axisIds ?? [],
      };
    });

  const sections = draft.sections.map((s) => (s.id === sectionId ? newSection : s));

  // Prune sources no longer referenced ANYWHERE (sections, umbrella, charts,
  // tables) — "deleting the last reference removes it from the sources panel".
  const referenced = new Set<string>();
  for (const s of sections) for (const id of s.citationIds) referenced.add(id);
  for (const m of (draft.umbrella ?? "").matchAll(/S\s*(\d+)/gi)) referenced.add(`S${Number(m[1])}`);
  for (const c of draft.charts) if (c.citationId) referenced.add(c.citationId);
  for (const t of draft.tables) if (t.citationId) referenced.add(t.citationId);
  const citations = [...draft.citations, ...addedCitations].filter((c) =>
    referenced.has(c.id),
  );

  const citedDocs = citations.map((c) => resolveDoc(c.docId));
  const historicDocs = citedDocs.filter(
    (d) => d && (d.validity === "historic" || d.validity === "superseded"),
  );
  const historic = historicDocs.length > 0;

  const updated: GeneratedDraft = {
    ...draft,
    sections,
    citations,
    historic,
    historicNote: historic
      ? `This draft draws on ${historicDocs.length === 1 ? "a source" : "sources"} marked ${[
          ...new Set(historicDocs.map((d) => `"${d?.validity}"`)),
        ].join(" / ")}. Treat the figures as historic and verify against the current release.`
      : null,
    // Any edit invalidates a prior approval, same rule as recompose.
    approved: false,
  };
  updated.guardian = runBrandGuardian(updated);

  finalizeRetrievalAudit(auditId, "edited");
  recordEditAudit({
    roleId: role.id,
    roleLabel: role.label,
    sectionId,
    blockKind: section.kind,
    instruction,
    filterExpr,
    sources: auditSources,
    before: section.body,
    after: newBody,
    status: "applied",
  });
  log.info(
    { draftId: draft.id, sectionId, kind: section.kind, added: addedCitations.length },
    "canvas edit: applied",
  );

  return {
    status: "applied",
    draft: updated,
    section: newSection,
    guardian: updated.guardian,
    note: modelNote,
  };
}

// ── Governed contextual suggestions ─────────────────────────────────────────
// Each button renders ONLY when its condition is true in the live corpus.
// Labels are specific and generated from real data — never generic.

export interface CanvasSuggestion {
  id: string;
  kind:
    | "period_swap"
    | "update_version"
    | "resolve_conflict"
    | "add_citation"
    | "external_safe"
    | "add_disclaimer";
  label: string;
  instruction: string;
  detail: string | null;
}

export function suggestionsForBlock(
  draft: GeneratedDraft,
  sectionId: string,
): CanvasSuggestion[] {
  const section = draft.sections.find((s) => s.id === sectionId);
  if (!section || LOCKED_BLOCK_KINDS.has(section.kind)) return [];

  const out: CanvasSuggestion[] = [];
  const citedDocIds = new Set(
    section.citationIds
      .map((id) => draft.citations.find((c) => c.id === id)?.docId)
      .filter((d): d is string => Boolean(d)),
  );

  // 1. Period swap — a figure in this block has a sibling period in the
  //    numeric store (same label, different period).
  for (const docId of citedDocIds) {
    const factsHere = NUMERIC_FACTS.filter((f) => f.docId === docId);
    for (const fact of factsHere) {
      if (!section.body.includes(fact.value)) continue;
      const sibling = NUMERIC_FACTS.find(
        (f) => f.label === fact.label && f.period !== fact.period && f.docId !== fact.docId,
      );
      if (!sibling) continue;
      const unit = sibling.unit === "€M" ? `€${sibling.value}M` : `${sibling.value}${sibling.unit}`;
      out.push({
        id: `sugg-period-${fact.id}-${sibling.id}`,
        kind: "period_swap",
        label: `Use ${sibling.period} figure (${unit}) instead of ${fact.period}`,
        instruction: `Replace the ${fact.label} figure ${fact.value}${fact.unit} (${fact.period}) with the ${sibling.period} figure ${sibling.value}${sibling.unit} from "${sibling.source}", and cite that source for it.`,
        detail: `${fact.label}: ${fact.period} ${fact.value}${fact.unit} → ${sibling.period} ${sibling.value}${sibling.unit}`,
      });
    }
  }

  // 2. Update to current version — a cited source is historic/superseded and a
  //    superseding document exists in the corpus.
  for (const docId of citedDocIds) {
    const doc = resolveDoc(docId);
    if (!doc || (doc.validity !== "historic" && doc.validity !== "superseded")) continue;
    const successor = DOCS.find((d) => d.supersedes === docId);
    out.push({
      id: `sugg-version-${docId}`,
      kind: "update_version",
      label: successor
        ? `Update to current version (${successor.title})`
        : `Flag "${doc.title}" as ${doc.validity}`,
      instruction: successor
        ? `The cited source "${doc.title}" is ${doc.validity}. Re-base the affected claims on the current document "${successor.title}" and cite it instead.`
        : `The cited source "${doc.title}" is ${doc.validity} and no successor exists. Add an honest caveat that the figure is ${doc.validity}.`,
      detail: `"${doc.title}" is marked ${doc.validity}.`,
    });
  }

  // 3. Resolve conflict — a cited doc materially contradicts another corpus doc.
  for (const docId of citedDocIds) {
    const doc = resolveDoc(docId);
    const conflicts = [
      ...(doc?.contradicts ?? []),
      ...DOCS.filter((d) => (d.contradicts ?? []).includes(docId)).map((d) => d.id),
    ];
    for (const otherId of new Set(conflicts)) {
      const other = resolveDoc(otherId);
      if (!other) continue;
      const factA = NUMERIC_FACTS.find((f) => f.docId === docId && section.body.includes(f.value));
      const factB = factA
        ? NUMERIC_FACTS.find((f) => f.docId === otherId && f.label === factA.label)
        : null;
      out.push({
        id: `sugg-conflict-${docId}-${otherId}`,
        kind: "resolve_conflict",
        label: `Resolve conflict: "${doc?.title}" vs "${other.title}"`,
        instruction: `The cited source "${doc?.title}" conflicts with "${other.title}". Rewrite the affected claim to rest on the approved, current source and note the discrepancy honestly if it matters.`,
        detail:
          factA && factB
            ? `${factA.label}: ${factA.value}${factA.unit} (${factA.period}, ${doc?.title}) vs ${factB.value}${factB.unit} (${factB.period}, ${other.title})`
            : `These two sources materially contradict each other.`,
      });
    }
  }

  // 4. Add citation — the block contains a figure with no [S#] marker at all,
  //    or the deterministic Guardian flags uncited-figure findings for it.
  const hasFigure = /\d[\d.,]*\s*(%|€|M\b|pts?|points|million|billion)/i.test(section.body);
  const hasMarker = /\[S\s*\d/i.test(section.body);
  if (hasFigure && !hasMarker && section.kind !== "quote") {
    out.push({
      id: `sugg-cite-${section.id}`,
      kind: "add_citation",
      label: "Add citation for the uncited figure",
      instruction:
        "This block contains a figure without a source marker. Find a permitted governed source that supports it and cite it; if none exists, say honestly that the figure is not covered by approved material.",
      detail: null,
    });
  }

  // 5. Make external-safe — the block cites non-public sources while the
  //    document is aimed at (or destined for) an external audience.
  const nonPublic = [...citedDocIds]
    .map((id) => resolveDoc(id))
    .filter((d) => d && d.confidentiality !== "public");
  if (nonPublic.length > 0 && draft.audience === "external") {
    out.push({
      id: `sugg-external-${section.id}`,
      kind: "external_safe",
      label: `Make external-safe (${nonPublic.length} non-public source${nonPublic.length > 1 ? "s" : ""} cited)`,
      instruction:
        "Rewrite this block using ONLY public, approved evidence. Where a claim rests solely on non-public material, drop it and state honestly what cannot be said externally.",
      detail: nonPublic.map((d) => `"${d?.title}" (${d?.confidentiality})`).join(" · "),
    });
  }

  // 6. Add required disclaimer — the rulebook requires one for this shape and
  //    the draft does not carry it.
  const template = getTemplate(draft.shape);
  const present = new Set(draft.disclaimers.map((d) => d.id));
  const required = new Set([
    ...(template?.requiredDisclaimerIds ?? []),
    ...DISCLAIMERS.filter((d) => d.appliesTo.includes(draft.shape)).map((d) => d.id),
  ]);
  for (const id of required) {
    if (present.has(id)) continue;
    const d = DISCLAIMERS.find((x) => x.id === id);
    if (!d) continue;
    out.push({
      id: `sugg-disclaimer-${id}`,
      kind: "add_disclaimer",
      label: `Add required disclaimer: ${d.name}`,
      instruction: `__add_disclaimer:${id}`,
      detail: d.text,
    });
  }

  return out.slice(0, 6);
}

// Deterministic disclaimer insertion — no model call needed.
export function addDisclaimerToDraft(draft: GeneratedDraft, disclaimerId: string): GeneratedDraft | null {
  const d = DISCLAIMERS.find((x) => x.id === disclaimerId);
  if (!d) return null;
  if (draft.disclaimers.some((x) => x.id === d.id)) return null;
  const updated: GeneratedDraft = {
    ...draft,
    disclaimers: [...draft.disclaimers, { id: d.id, name: d.name, text: d.text }],
    approved: false,
  };
  updated.guardian = runBrandGuardian(updated);
  return updated;
}
