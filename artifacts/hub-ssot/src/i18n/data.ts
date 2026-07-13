// Localized strings for the Data Center — the documentalist's desk. Document
// titles, corpus content, owner/country/brand values, axis names and other
// server-provided data are never translated here; this dictionary covers the
// static chrome, framing, table headers, drawer labels, queue states and the
// session activity log labels.

import type { Lang } from "../components/app-provider";

export interface DataStrings {
  // Shell
  areas: {
    validation: string;
    sources: string;
    ingestion: string;
    governance: string;
    corpus: string;
  };
  sessionActivity: string;
  sessionActivityCount: (n: number) => string;
  activityDrawerDesc: string;
  noActionsYet: string;
  pageTitle: string;
  pageSubtitle: string;
  allCaughtUp: string;
  itemsNeedDocumentalist: (n: number) => string;
  corpusNeedsAttention: string;
  allClearDesc: string;
  statusInQueue: (n: number) => string;
  statusInQuarantine: (n: number) => string;
  statusPastSla: (n: number) => string;

  // Shared enums (display only; underlying values are unchanged)
  confidence: Record<string, string>;
  sentiment: Record<string, string>;
  decision: Record<string, string>;

  // Session activity log labels
  activity: {
    validatedClassification: string;
    correctedClassification: string;
    rejectedClassification: string;
    resolvedConflict: string;
    releasedFromQuarantine: string;
    manualUpload: string;
    reclassifiedCorpus: string;
    taxonomyConfiguration: string;
    addedViaForm: (source: string) => string;
  };

  validation: {
    bannerTitle: string;
    layers: {
      deterministic: { title: string; desc: string };
      semantic: { title: string; desc: string };
      strategic: { title: string; desc: string };
    };
    legend: { high: string; medium: string; low: string };
    queueTitleOpen: (n: number) => string;
    queueTitleClear: string;
    allCaughtUp: string;
    clearedThisSession: (n: number) => string;
    noneWaiting: string;
    sourceConflict: string;
    conflictHeadline: string;
    currentlyLive: string;
    fresherSource: string;
    conflictNote: string;
    promoteFresher: string;
    keepCurrent: string;
    deterministicLabel: string;
    semanticLabel: string;
    strategicAxisLabel: string;
    proposedMetadata: string;
    validate: string;
    correct: string;
    reject: string;
    resolvedThisSession: string;
    actionValidated: string;
    actionCorrected: string;
    actionRejected: string;
    editTitle: string;
    editDesc: (title: string) => string;
    saveValidate: string;
    cancel: string;
    confirmedDetail: (note: string) => string;
    rejectedDetail: string;
    correctedDetail: (changes: string, note: string) => string;
    fieldArrow: (field: string, value: string) => string;
    promotedDetail: (
      freshValue: string,
      freshSource: string,
      freshDate: string,
      oldValue: string,
    ) => string;
    keptDetail: (oldValue: string, oldSource: string) => string;
  };

  sources: {
    bannerTitle: string;
    bannerDesc: string;
    documents: string;
    cadence: string;
    lastSync: string;
    manualUpload: string;
    connectorPlanned: string;
    addedThisSession: string;
    queuedToIntake: string;
    uploadTitle: string;
    uploadDesc: string;
    addToIntake: string;
    cancel: string;
    title: string;
    owner: string;
    country: string;
    brand: string;
    confidentiality: string;
    area: string;
  };

  ingestion: {
    live: {
      title: string;
      filterBeforeIngest: string;
      desc: string;
      keywords: string;
      competitors: string;
      executives: string;
      topics: string;
      searching: string;
      runCapture: string;
      atLeastOne: string;
      searchError: string;
      captureFailed: string;
      noMatchTitle: string;
      noMatchDesc: string;
      candidatesTitle: (sel: number, total: number) => string;
      embedding: string;
      ingestAccepted: (n: number) => string;
      matched: string;
      acceptError: string;
      ingestionFailed: string;
      ingestedTitle: (n: number) => string;
      ingestedDesc: (
        docTitles: string,
        chunks: number,
        before: number,
        after: number,
      ) => string;
    };
    relevance: {
      title: string;
      kept: (n: number) => string;
      dropped: (n: number) => string;
      desc: string;
      recentDecisions: string;
      matchedRule: (rule: string) => string;
      noRuleMatched: string;
    };
    pipeline: {
      title: string;
      taxonomy: string;
      stage: (n: number) => string;
      validatedLive: string;
      validatedNote: string;
    };
    quarantine: {
      titleOpen: (n: number) => string;
      titleClear: string;
      nothingWaiting: string;
      clearedThisSession: (n: number) => string;
      everyDocHasMeta: string;
      stalledNote: string;
      heldAt: (source: string, stage: string, version: string) => string;
      missing: string;
      resolve: string;
      resolveTitle: string;
      resolveDesc: (title: string, stage: string) => string;
      releaseToPipeline: string;
      cancel: string;
      releasedDetail: (filled: string, stage: string) => string;
    };
  };

  governance: {
    bannerTitle: string;
    taxonomyVersion: (v: number) => string;
    reclassify: string;
    bannerDesc: string;
    liveTitle: (v: number) => string;
    liveDesc: (
      applied: number,
      rejected: number,
      qdrant:
        | { updatedDocs: number; pointsBefore: number; pointsAfter: number }
        | null
        | undefined,
    ) => string;
    axis: (n: number) => string;
    historyTitle: string;
    historyDesc: string;
    historyHeadings: [string, string, string, string, string];
    versionActive: (v: number) => string;
    version: (v: number) => string;
    freshnessTitle: string;
    withinSla: (pct: number) => string;
    freshnessDesc: string;
    pastSla: (n: number) => string;
    dueRefresh: string;
    freshnessHeadings: [string, string, string, string, string];
    everyMonths: (n: number) => string;
    monthsStatus: (months: number, overdue: boolean) => string;
    wizard: {
      steps: [string, string, string, string];
      title: string;
      desc: string;
      continue: string;
      applying: string;
      confirmApply: string;
      back: string;
      cancel: string;
      step0Desc: string;
      axisToEdit: string;
      newName: string;
      newDescription: string;
      building: string;
      proposalFailed: string;
      affected: (n: number, fromName: string) => string;
      engineLlm: string;
      engineFallback: string;
      engineLlmDesc: (n: number) => string;
      engineFallbackDesc: (n: number) => string;
      proposalHeadings: [string, string, string];
      humanConfirmTitle: string;
      humanConfirmDesc: string;
      applyFailed: string;
      staysUnder: (name: string) => string;
      leaves: (name: string) => string;
      accepted: (a: number, total: number) => string;
      proposeError: string;
      applyError: string;
      actor: string;
      applyNote: (from: string, to: string) => string;
      reclassifiedDetail: (
        from: string,
        to: string,
        version: number,
        applied: number,
        rejected: number,
      ) => string;
    };
  };

  corpus: {
    categoryA: string;
    categoryB: string;
    categoryE: string;
    totalDocuments: string;
    totalChunks: string;
    countries: string;
    needsReview: string;
    governedCorpus: string;
    rowDesc: (
      brand: string,
      chunks: number,
      format: string,
      connector: string,
      language: string,
    ) => string;
    filteredSentiment: (s: string) => string;
    documentFallback: string;
    confidentialityInherited: (label: string, connector: string) => string;
    owner: (v: string) => string;
    format: (v: string) => string;
    source: (v: string) => string;
    language: (v: string) => string;
    refresh: (v: string) => string;
    version: (v: string) => string;
    versionLineage: string;
    supersededBy: string;
    replaces: string;
    generatedFrom: string;
    filterMatch: (s: string) => string;
    keyword: (k: string) => string;
    competitor: (k: string) => string;
    executive: (k: string) => string;
    topic: (k: string) => string;
    filterNote: string;
    chunksCount: (n: number) => string;
    failedToLoad: string;
    searchLabel: string;
    filterCategory: string;
    filterCountry: string;
    filterBrand: string;
    filterClearance: string;
    filterValidity: string;
    filterSource: string;
    allLabel: string;
    matchCount: (shown: number, total: number) => string;
    noMatches: string;
  };
}

export const DATA_I18N: Record<Lang, DataStrings> = {
  EN: {
    areas: {
      validation: "Validation queue",
      sources: "Sources",
      ingestion: "Ingestion",
      governance: "Governance",
      corpus: "Corpus",
    },
    sessionActivity: "Session activity",
    sessionActivityCount: (n) => `Session activity (${n})`,
    activityDrawerDesc:
      "Every documentalist decision made here feeds the platform audit trail. This session is in-memory only for the demo.",
    noActionsYet: "No actions yet this session.",
    pageTitle: "Data Center",
    pageSubtitle:
      "The documentalist's desk — where sources, ingestion, validation and taxonomy are governed so every answer rests on trusted ground.",
    allCaughtUp: "Everything is caught up",
    itemsNeedDocumentalist: (n) =>
      `${n} ${n === 1 ? "item needs" : "items need"} a documentalist`,
    corpusNeedsAttention: "Corpus needs attention",
    allClearDesc:
      "Nothing in quarantine, no classifications awaiting a human, and every document within its review SLA.",
    statusInQueue: (n) => `${n} in the validation queue`,
    statusInQuarantine: (n) => `${n} held in quarantine`,
    statusPastSla: (n) => `${n} past review SLA`,
    confidence: { high: "High", medium: "Medium", low: "Low" },
    sentiment: {
      positive: "positive",
      negative: "negative",
      neutral: "neutral",
    },
    decision: { kept: "kept", dropped: "dropped" },
    activity: {
      validatedClassification: "Validated classification",
      correctedClassification: "Corrected classification",
      rejectedClassification: "Rejected classification",
      resolvedConflict: "Resolved source conflict",
      releasedFromQuarantine: "Released from quarantine",
      manualUpload: "Manual upload",
      reclassifiedCorpus: "Re-classified corpus",
      taxonomyConfiguration: "Taxonomy configuration",
      addedViaForm: (source) => `Added via guided form from ${source}.`,
    },
    validation: {
      bannerTitle: "Three-layer classification, always closed by a human",
      layers: {
        deterministic: {
          title: "Deterministic",
          desc: "Rule-based type from source, format and structure.",
        },
        semantic: {
          title: "Semantic",
          desc: "Topics and entities inferred from the content.",
        },
        strategic: {
          title: "Strategic",
          desc: "Mapped onto a Telefónica strategic axis.",
        },
      },
      legend: {
        high: "High — auto-validated upstream",
        medium: "Medium — shown here for a quick check",
        low: "Low — flagged, needs a human",
      },
      queueTitleOpen: (n) => `Validation queue — ${n} awaiting a decision`,
      queueTitleClear: "Validation queue clear",
      allCaughtUp: "All caught up",
      clearedThisSession: (n) =>
        `You cleared ${n} ${n === 1 ? "item" : "items"} this session. High-confidence classifications were validated automatically upstream.`,
      noneWaiting:
        "No medium- or low-confidence classifications are waiting on a human.",
      sourceConflict: "Source conflict",
      conflictHeadline:
        "A fresher source disagrees with the value already in the core.",
      currentlyLive: "Currently live",
      fresherSource: "Fresher source",
      conflictNote:
        "Promoting the fresher value keeps the older figure as a dated, historic record — it is never silently overwritten.",
      promoteFresher: "Promote fresher value",
      keepCurrent: "Keep current value",
      deterministicLabel: "Deterministic",
      semanticLabel: "Semantic",
      strategicAxisLabel: "Strategic axis",
      proposedMetadata: "Proposed metadata:",
      validate: "Validate",
      correct: "Correct",
      reject: "Reject",
      resolvedThisSession: "Resolved this session",
      actionValidated: "Validated",
      actionCorrected: "Corrected",
      actionRejected: "Rejected",
      editTitle: "Correct classification",
      editDesc: (title) =>
        `${title} — adjust the governed metadata before validating. Your correction is recorded as the human decision. Session-only for the demo.`,
      saveValidate: "Save and validate",
      cancel: "Cancel",
      confirmedDetail: (note) =>
        `Confirmed the proposed classification. ${note}`,
      rejectedDetail: "Rejected — returned to the pipeline for re-processing.",
      correctedDetail: (changes, note) => `Corrected ${changes}. ${note}`,
      fieldArrow: (field, value) => `${field} → ${value}`,
      promotedDetail: (freshValue, freshSource, freshDate, oldValue) =>
        `Promoted ${freshValue} (${freshSource}, ${freshDate}); ${oldValue} retained as historic.`,
      keptDetail: (oldValue, oldSource) =>
        `Kept ${oldValue} (${oldSource}); fresher figure logged but not promoted.`,
    },
    sources: {
      bannerTitle: "Sources feed the core before the model ever runs",
      bannerDesc:
        "Quality starts here, not at the model. External sources are filtered before ingestion — by keywords, tracked competitors, named executives and priority topics — so only relevant mentions ever enter the knowledge core. Internal documents arrive with the sensitivity label that becomes their governed confidentiality tier.",
      documents: "Documents",
      cadence: "Cadence",
      lastSync: "Last sync",
      manualUpload: "Manual upload",
      connectorPlanned: "Connector planned — no documents ingested yet.",
      addedThisSession: "Added this session",
      queuedToIntake: "Queued to intake",
      uploadTitle: "Manual upload",
      uploadDesc:
        "Mandatory metadata is captured up front so the document never enters the pipeline underspecified. This is session-only for the demo.",
      addToIntake: "Add to intake",
      cancel: "Cancel",
      title: "Title",
      owner: "Owner",
      country: "Country",
      brand: "Brand",
      confidentiality: "Confidentiality",
      area: "Area",
    },
    ingestion: {
      live: {
        title: "Live public-data capture (B channel)",
        filterBeforeIngest: "Filter before ingest",
        desc: "Define the agreed rule first — keywords, tracked competitors, named executives, priority topics. The live search only surfaces public coverage matching the rule, a human reviews every candidate with its mention flag, and only accepted items enter the knowledge core as external (B) documents with full provenance.",
        keywords: "Keywords (comma-separated)",
        competitors: "Competitors",
        executives: "Executives",
        topics: "Topics",
        searching: "Searching public coverage",
        runCapture: "Run filtered capture",
        atLeastOne:
          "At least one filter term is required — nothing is captured without a rule.",
        searchError:
          "The live capture search could not be completed. Nothing has been ingested.",
        captureFailed: "Capture failed",
        noMatchTitle: "No matching coverage",
        noMatchDesc:
          "The live search found no public coverage matching the filter. Nothing was ingested.",
        candidatesTitle: (sel, total) =>
          `Candidates — human review (${sel} of ${total} accepted)`,
        embedding: "Embedding and indexing",
        ingestAccepted: (n) => `Ingest ${n} accepted`,
        matched: "Matched",
        acceptError:
          "The accepted mentions could not be ingested. The core is unchanged.",
        ingestionFailed: "Ingestion failed",
        ingestedTitle: (n) =>
          `${n} external document${n === 1 ? "" : "s"} ingested into the core`,
        ingestedDesc: (docTitles, chunks, before, after) =>
          `${docTitles}. ${chunks} chunk${chunks === 1 ? "" : "s"} embedded once and upserted to the vector index (${before} points before, ${after} after). Ask can cite them immediately; the ingest-filter provenance is on each document in the corpus browser.`,
      },
      relevance: {
        title: "Pre-ingestion relevance filter",
        kept: (n) => `${n} kept`,
        dropped: (n) => `${n} dropped`,
        desc: "External mentions are screened against agreed rules before ingestion — keywords, tracked competitors, named executives and priority topics. Dropped mentions never reach the knowledge core.",
        recentDecisions: "Recent decisions",
        matchedRule: (rule) => `matched ${rule}`,
        noRuleMatched: "no rule matched",
      },
      pipeline: {
        title: "The seven-stage pipeline",
        taxonomy: "Taxonomy",
        stage: (n) => `Stage ${n}`,
        validatedLive: "Validated and live in the core",
        validatedNote:
          "Nothing reaches the model until it passes validation. The remainder is held in quarantine below — never silently dropped, never silently guessed.",
      },
      quarantine: {
        titleOpen: (n) => `Quarantine — ${n} held for a documentalist`,
        titleClear: "Quarantine clear",
        nothingWaiting: "Nothing waiting",
        clearedThisSession: (n) =>
          `You cleared ${n} ${n === 1 ? "document" : "documents"} this session. Each re-entered the pipeline where it left off.`,
        everyDocHasMeta:
          "Every ingested document has the metadata the core requires.",
        stalledNote:
          "These documents stalled because a required field is missing or their taxonomy version is behind. They are held — not dropped — so the core is never polluted. Complete the metadata to release them.",
        heldAt: (source, stage, version) =>
          `${source} · held at ${stage} stage · taxonomy ${version}`,
        missing: "Missing",
        resolve: "Resolve",
        resolveTitle: "Resolve quarantine",
        resolveDesc: (title, stage) =>
          `${title} — complete the required metadata. Once released, the document re-enters the pipeline at the ${stage} stage. Session-only for the demo.`,
        releaseToPipeline: "Release to pipeline",
        cancel: "Cancel",
        releasedDetail: (filled, stage) =>
          `Completed ${filled}. Re-entered the pipeline at ${stage}.`,
      },
    },
    governance: {
      bannerTitle: "Taxonomy is configuration, not code",
      taxonomyVersion: (v) => `Taxonomy v${v}`,
      reclassify: "Re-classify",
      bannerDesc:
        "The strategic axes below are the shared vocabulary every document is mapped to. When the strategy shifts, a documentalist updates the taxonomy and re-classifies the corpus against it — a governed configuration change, not an engineering release. No re-embedding, no IT ticket, no redeploy.",
      liveTitle: (v) => `Taxonomy version ${v} is live`,
      liveDesc: (applied, rejected, qdrant) =>
        `${applied} document${applied === 1 ? "" : "s"} re-tagged, ${rejected} proposal${rejected === 1 ? "" : "s"} rejected by human review. The change took effect immediately across retrieval and browsing.${
          qdrant
            ? ` Qdrant proof: ${qdrant.updatedDocs} document payload${qdrant.updatedDocs === 1 ? "" : "s"} updated in place via set_payload — vector count unchanged (${qdrant.pointsBefore} before, ${qdrant.pointsAfter} after). No re-embedding, no re-ingestion.`
            : ""
        }`,
      axis: (n) => `Axis ${n}`,
      historyTitle: "Taxonomy version history",
      historyDesc:
        "Every applied re-classification is a persisted, versioned configuration change with an actor and a note — the audit trail of the vocabulary itself.",
      historyHeadings: [
        "Version",
        "When",
        "Actor",
        "Change",
        "Documents re-tagged",
      ],
      versionActive: (v) => `v${v} · active`,
      version: (v) => `v${v}`,
      freshnessTitle: "Freshness and review SLA",
      withinSla: (pct) => `${pct}% within SLA`,
      freshnessDesc:
        'Every governed document carries a review SLA. Once it lapses, the document is flagged for a refresh so answers are never quietly built on stale ground — the honest "historic source" state depends on this discipline.',
      pastSla: (n) =>
        `${n} ${n === 1 ? "document is" : "documents are"} past review SLA`,
      dueRefresh: "These are due a refresh.",
      freshnessHeadings: [
        "Document",
        "Owner",
        "Last reviewed",
        "SLA",
        "Status",
      ],
      everyMonths: (n) => `every ${n} mo`,
      monthsStatus: (months, overdue) =>
        `${months} mo · ${overdue ? "overdue" : "on track"}`,
      wizard: {
        steps: [
          "Edit taxonomy",
          "Review mapping",
          "Assisted re-classify",
          "Human validation",
        ],
        title: "Re-classify against the taxonomy",
        desc: "A four-step governed change. Nothing is re-embedded or redeployed — the taxonomy is edited, the corpus is re-classified against it with model assistance, and a human validates every proposal before it becomes a new persisted version.",
        continue: "Continue",
        applying: "Applying…",
        confirmApply: "Confirm and apply",
        back: "Back",
        cancel: "Cancel",
        step0Desc:
          "Rename or refine a strategic axis. This mirrors a strategy shift — for example folding a legacy theme into a current strategic axis.",
        axisToEdit: "Axis to edit",
        newName: "New name",
        newDescription: "New description (optional)",
        building:
          "Building the mapping table and asking the engine to re-classify each affected document against the edited axis…",
        proposalFailed: "Proposal failed",
        affected: (n, fromName) =>
          `${n} ${n === 1 ? "document currently maps" : "documents currently map"} to "${fromName}". They will be reviewed against the new definition.`,
        engineLlm: "Model-assisted zero-shot",
        engineFallback: "Deterministic fallback",
        engineLlmDesc: (n) =>
          `The engine classified each of the ${n} affected documents zero-shot against the edited axis. Existing embeddings are reused — this is a metadata re-mapping, not a re-index.`,
        engineFallbackDesc: (n) =>
          `The model was unavailable, so each of the ${n} affected documents keeps its current mapping under the renamed label — clearly labelled, never silent. A human still validates every row.`,
        proposalHeadings: ["Document", "Proposal", "Confidence"],
        humanConfirmTitle:
          "A human confirms every re-classification before it becomes live",
        humanConfirmDesc:
          "Untick any proposal to reject it — rejected documents keep their current tags. Nothing is applied automatically.",
        applyFailed: "Apply failed",
        staysUnder: (name) => `Stays under "${name}"`,
        leaves: (name) => `Leaves "${name}"`,
        accepted: (a, total) =>
          `${a} of ${total} proposals accepted. Confirm to apply as a new persisted taxonomy version — the change takes effect immediately.`,
        proposeError:
          "The re-tagging engine could not produce proposals. Nothing has been changed.",
        applyError:
          "The taxonomy version could not be applied. Nothing has been changed.",
        actor: "You (documentalist)",
        applyNote: (from, to) =>
          `Renamed "${from}" to "${to}" and re-classified the affected documents.`,
        reclassifiedDetail: (from, to, version, applied, rejected) =>
          `Renamed "${from}" to "${to}". Applied taxonomy version ${version}: ${applied} accepted, ${rejected} rejected by human review — no re-embedding, no redeploy.`,
      },
    },
    corpus: {
      categoryA: "A · Internal",
      categoryB: "B · External",
      categoryE: "E · SSoT output",
      totalDocuments: "Total documents",
      totalChunks: "Total chunks",
      countries: "Countries",
      needsReview: "Needs review",
      governedCorpus: "Governed corpus",
      rowDesc: (brand, chunks, format, connector, language) =>
        `${brand} · ${chunks} chunks · ${format} · via ${connector} · ${language}`,
      filteredSentiment: (s) => `filtered · ${s}`,
      documentFallback: "Document",
      confidentialityInherited: (label, connector) =>
        `Confidentiality "${label}" is inherited from the source sensitivity label (${connector} — simulated Purview/MIP), not assigned by hand.`,
      owner: (v) => `Owner: ${v}`,
      format: (v) => `Format: ${v}`,
      source: (v) => `Source: ${v}`,
      language: (v) => `Language: ${v}`,
      refresh: (v) => `Refresh: ${v}`,
      version: (v) => `Version: ${v}`,
      versionLineage: "Version lineage",
      supersededBy: "superseded by",
      replaces: "replaces",
      generatedFrom: "Generated from governed sources:",
      filterMatch: (s) => `Pre-ingest filter match · ${s} mentions`,
      keyword: (k) => `keyword: ${k}`,
      competitor: (k) => `competitor: ${k}`,
      executive: (k) => `executive: ${k}`,
      topic: (k) => `topic: ${k}`,
      filterNote:
        "Only material matching the configured keyword, competitor, executive and topic filters was ingested — never a raw dump.",
      chunksCount: (n) => `Document chunks (${n})`,
      failedToLoad: "Failed to load document",
      searchLabel: "Search documents",
      filterCategory: "Category",
      filterCountry: "Country",
      filterBrand: "Brand",
      filterClearance: "Confidentiality",
      filterValidity: "Validity",
      filterSource: "Source",
      allLabel: "All",
      matchCount: (shown, total) => `Showing ${shown} of ${total} documents`,
      noMatches: "No documents match the current filters.",
    },
  },
  ES: {
    areas: {
      validation: "Cola de validación",
      sources: "Fuentes",
      ingestion: "Ingesta",
      governance: "Gobernanza",
      corpus: "Corpus",
    },
    sessionActivity: "Actividad de la sesión",
    sessionActivityCount: (n) => `Actividad de la sesión (${n})`,
    activityDrawerDesc:
      "Cada decisión del documentalista tomada aquí alimenta el registro de auditoría de la plataforma. Esta sesión es solo en memoria para la demo.",
    noActionsYet: "Aún no hay acciones en esta sesión.",
    pageTitle: "Centro de datos",
    pageSubtitle:
      "El escritorio del documentalista — donde se gobiernan las fuentes, la ingesta, la validación y la taxonomía para que cada respuesta se apoye en una base fiable.",
    allCaughtUp: "Todo está al día",
    itemsNeedDocumentalist: (n) =>
      `${n} ${n === 1 ? "elemento necesita" : "elementos necesitan"} un documentalista`,
    corpusNeedsAttention: "El corpus necesita atención",
    allClearDesc:
      "Nada en cuarentena, ninguna clasificación pendiente de una persona y cada documento dentro de su SLA de revisión.",
    statusInQueue: (n) => `${n} en la cola de validación`,
    statusInQuarantine: (n) => `${n} retenidos en cuarentena`,
    statusPastSla: (n) => `${n} fuera del SLA de revisión`,
    confidence: { high: "Alta", medium: "Media", low: "Baja" },
    sentiment: {
      positive: "positivo",
      negative: "negativo",
      neutral: "neutral",
    },
    decision: { kept: "conservado", dropped: "descartado" },
    activity: {
      validatedClassification: "Clasificación validada",
      correctedClassification: "Clasificación corregida",
      rejectedClassification: "Clasificación rechazada",
      resolvedConflict: "Conflicto de fuentes resuelto",
      releasedFromQuarantine: "Liberado de cuarentena",
      manualUpload: "Carga manual",
      reclassifiedCorpus: "Corpus reclasificado",
      taxonomyConfiguration: "Configuración de taxonomía",
      addedViaForm: (source) =>
        `Añadido mediante formulario guiado desde ${source}.`,
    },
    validation: {
      bannerTitle:
        "Clasificación en tres capas, siempre cerrada por una persona",
      layers: {
        deterministic: {
          title: "Determinista",
          desc: "Tipo basado en reglas según la fuente, el formato y la estructura.",
        },
        semantic: {
          title: "Semántica",
          desc: "Temas y entidades inferidos del contenido.",
        },
        strategic: {
          title: "Estratégica",
          desc: "Asignada a un eje estratégico de Telefónica.",
        },
      },
      legend: {
        high: "Alta — autovalidada aguas arriba",
        medium: "Media — mostrada aquí para una comprobación rápida",
        low: "Baja — marcada, requiere una persona",
      },
      queueTitleOpen: (n) =>
        `Cola de validación — ${n} a la espera de una decisión`,
      queueTitleClear: "Cola de validación vacía",
      allCaughtUp: "Todo al día",
      clearedThisSession: (n) =>
        `Has resuelto ${n} ${n === 1 ? "elemento" : "elementos"} en esta sesión. Las clasificaciones de alta confianza se validaron automáticamente aguas arriba.`,
      noneWaiting:
        "No hay clasificaciones de confianza media o baja a la espera de una persona.",
      sourceConflict: "Conflicto de fuentes",
      conflictHeadline:
        "Una fuente más reciente discrepa del valor que ya está en el núcleo.",
      currentlyLive: "Actualmente en vivo",
      fresherSource: "Fuente más reciente",
      conflictNote:
        "Promover el valor más reciente conserva la cifra anterior como registro histórico fechado — nunca se sobrescribe en silencio.",
      promoteFresher: "Promover el valor más reciente",
      keepCurrent: "Mantener el valor actual",
      deterministicLabel: "Determinista",
      semanticLabel: "Semántica",
      strategicAxisLabel: "Eje estratégico",
      proposedMetadata: "Metadatos propuestos:",
      validate: "Validar",
      correct: "Corregir",
      reject: "Rechazar",
      resolvedThisSession: "Resueltos en esta sesión",
      actionValidated: "Validado",
      actionCorrected: "Corregido",
      actionRejected: "Rechazado",
      editTitle: "Corregir clasificación",
      editDesc: (title) =>
        `${title} — ajusta los metadatos gobernados antes de validar. Tu corrección queda registrada como la decisión humana. Solo para la sesión de la demo.`,
      saveValidate: "Guardar y validar",
      cancel: "Cancelar",
      confirmedDetail: (note) =>
        `Se confirmó la clasificación propuesta. ${note}`,
      rejectedDetail: "Rechazado — devuelto al pipeline para reprocesarlo.",
      correctedDetail: (changes, note) => `Se corrigió ${changes}. ${note}`,
      fieldArrow: (field, value) => `${field} → ${value}`,
      promotedDetail: (freshValue, freshSource, freshDate, oldValue) =>
        `Se promovió ${freshValue} (${freshSource}, ${freshDate}); ${oldValue} se conserva como histórico.`,
      keptDetail: (oldValue, oldSource) =>
        `Se mantuvo ${oldValue} (${oldSource}); la cifra más reciente se registró pero no se promovió.`,
    },
    sources: {
      bannerTitle:
        "Las fuentes alimentan el núcleo antes de que el modelo se ejecute",
      bannerDesc:
        "La calidad empieza aquí, no en el modelo. Las fuentes externas se filtran antes de la ingesta — por palabras clave, competidores vigilados, directivos nombrados y temas prioritarios — de modo que solo las menciones relevantes entran en el núcleo de conocimiento. Los documentos internos llegan con la etiqueta de sensibilidad que se convierte en su nivel de confidencialidad gobernado.",
      documents: "Documentos",
      cadence: "Cadencia",
      lastSync: "Última sincronización",
      manualUpload: "Carga manual",
      connectorPlanned:
        "Conector planificado — todavía no se han ingerido documentos.",
      addedThisSession: "Añadidos en esta sesión",
      queuedToIntake: "En cola para admisión",
      uploadTitle: "Carga manual",
      uploadDesc:
        "Los metadatos obligatorios se capturan de antemano para que el documento nunca entre en el pipeline sin la información necesaria. Solo para la sesión de la demo.",
      addToIntake: "Añadir a la admisión",
      cancel: "Cancelar",
      title: "Título",
      owner: "Responsable",
      country: "País",
      brand: "Marca",
      confidentiality: "Confidencialidad",
      area: "Área",
    },
    ingestion: {
      live: {
        title: "Captura de datos públicos en vivo (canal B)",
        filterBeforeIngest: "Filtrar antes de ingerir",
        desc: "Define primero la regla acordada — palabras clave, competidores vigilados, directivos nombrados, temas prioritarios. La búsqueda en vivo solo muestra cobertura pública que coincide con la regla, una persona revisa cada candidato con su marca de mención, y solo los elementos aceptados entran en el núcleo de conocimiento como documentos externos (B) con procedencia completa.",
        keywords: "Palabras clave (separadas por comas)",
        competitors: "Competidores",
        executives: "Directivos",
        topics: "Temas",
        searching: "Buscando cobertura pública",
        runCapture: "Ejecutar captura filtrada",
        atLeastOne:
          "Se requiere al menos un término de filtro — no se captura nada sin una regla.",
        searchError:
          "No se pudo completar la búsqueda de captura en vivo. No se ha ingerido nada.",
        captureFailed: "La captura falló",
        noMatchTitle: "Sin cobertura coincidente",
        noMatchDesc:
          "La búsqueda en vivo no encontró cobertura pública que coincida con el filtro. No se ingirió nada.",
        candidatesTitle: (sel, total) =>
          `Candidatos — revisión humana (${sel} de ${total} aceptados)`,
        embedding: "Generando embeddings e indexando",
        ingestAccepted: (n) => `Ingerir ${n} aceptados`,
        matched: "Coincide",
        acceptError:
          "No se pudieron ingerir las menciones aceptadas. El núcleo no ha cambiado.",
        ingestionFailed: "La ingesta falló",
        ingestedTitle: (n) =>
          `${n} documento${n === 1 ? "" : "s"} externo${n === 1 ? "" : "s"} ingerido${n === 1 ? "" : "s"} en el núcleo`,
        ingestedDesc: (docTitles, chunks, before, after) =>
          `${docTitles}. ${chunks} fragmento${chunks === 1 ? "" : "s"} embebido${chunks === 1 ? "" : "s"} una vez e insertado${chunks === 1 ? "" : "s"} en el índice vectorial (${before} puntos antes, ${after} después). Preguntar puede citarlos de inmediato; la procedencia del filtro de ingesta está en cada documento del explorador de corpus.`,
      },
      relevance: {
        title: "Filtro de relevancia previo a la ingesta",
        kept: (n) => `${n} conservados`,
        dropped: (n) => `${n} descartados`,
        desc: "Las menciones externas se contrastan con reglas acordadas antes de la ingesta — palabras clave, competidores vigilados, directivos nombrados y temas prioritarios. Las menciones descartadas nunca llegan al núcleo de conocimiento.",
        recentDecisions: "Decisiones recientes",
        matchedRule: (rule) => `coincide con ${rule}`,
        noRuleMatched: "ninguna regla coincidió",
      },
      pipeline: {
        title: "El pipeline de siete etapas",
        taxonomy: "Taxonomía",
        stage: (n) => `Etapa ${n}`,
        validatedLive: "Validado y en vivo en el núcleo",
        validatedNote:
          "Nada llega al modelo hasta que supera la validación. El resto se retiene en cuarentena más abajo — nunca se descarta en silencio, nunca se adivina en silencio.",
      },
      quarantine: {
        titleOpen: (n) => `Cuarentena — ${n} retenidos para un documentalista`,
        titleClear: "Cuarentena vacía",
        nothingWaiting: "Nada en espera",
        clearedThisSession: (n) =>
          `Has resuelto ${n} ${n === 1 ? "documento" : "documentos"} en esta sesión. Cada uno volvió al pipeline donde se quedó.`,
        everyDocHasMeta:
          "Cada documento ingerido tiene los metadatos que el núcleo requiere.",
        stalledNote:
          "Estos documentos se detuvieron porque falta un campo obligatorio o su versión de taxonomía está desactualizada. Se retienen — no se descartan — para que el núcleo nunca se contamine. Completa los metadatos para liberarlos.",
        heldAt: (source, stage, version) =>
          `${source} · retenido en la etapa ${stage} · taxonomía ${version}`,
        missing: "Falta",
        resolve: "Resolver",
        resolveTitle: "Resolver cuarentena",
        resolveDesc: (title, stage) =>
          `${title} — completa los metadatos requeridos. Una vez liberado, el documento vuelve al pipeline en la etapa ${stage}. Solo para la sesión de la demo.`,
        releaseToPipeline: "Liberar al pipeline",
        cancel: "Cancelar",
        releasedDetail: (filled, stage) =>
          `Se completó ${filled}. Volvió al pipeline en la etapa ${stage}.`,
      },
    },
    governance: {
      bannerTitle: "La taxonomía es configuración, no código",
      taxonomyVersion: (v) => `Taxonomía v${v}`,
      reclassify: "Reclasificar",
      bannerDesc:
        "Los ejes estratégicos siguientes son el vocabulario compartido al que se asigna cada documento. Cuando cambia la estrategia, un documentalista actualiza la taxonomía y reclasifica el corpus contra ella — un cambio de configuración gobernado, no una versión de ingeniería. Sin regenerar embeddings, sin ticket de TI, sin redespliegue.",
      liveTitle: (v) => `La versión ${v} de la taxonomía está activa`,
      liveDesc: (applied, rejected, qdrant) =>
        `${applied} documento${applied === 1 ? "" : "s"} reetiquetado${applied === 1 ? "" : "s"}, ${rejected} propuesta${rejected === 1 ? "" : "s"} rechazada${rejected === 1 ? "" : "s"} por revisión humana. El cambio tuvo efecto de inmediato en la recuperación y la navegación.${
          qdrant
            ? ` Prueba de Qdrant: ${qdrant.updatedDocs} payload${qdrant.updatedDocs === 1 ? "" : "s"} de documento actualizado${qdrant.updatedDocs === 1 ? "" : "s"} in situ mediante set_payload — el recuento de vectores no cambia (${qdrant.pointsBefore} antes, ${qdrant.pointsAfter} después). Sin regenerar embeddings, sin reingesta.`
            : ""
        }`,
      axis: (n) => `Eje ${n}`,
      historyTitle: "Historial de versiones de taxonomía",
      historyDesc:
        "Cada reclasificación aplicada es un cambio de configuración persistido y versionado con un actor y una nota — el registro de auditoría del propio vocabulario.",
      historyHeadings: [
        "Versión",
        "Cuándo",
        "Actor",
        "Cambio",
        "Documentos reetiquetados",
      ],
      versionActive: (v) => `v${v} · activa`,
      version: (v) => `v${v}`,
      freshnessTitle: "Frescura y SLA de revisión",
      withinSla: (pct) => `${pct}% dentro del SLA`,
      freshnessDesc:
        'Cada documento gobernado lleva un SLA de revisión. Una vez que caduca, el documento se marca para una actualización, de modo que las respuestas nunca se construyan en silencio sobre una base obsoleta — el estado honesto de "fuente histórica" depende de esta disciplina.',
      pastSla: (n) =>
        `${n} ${n === 1 ? "documento está" : "documentos están"} fuera del SLA de revisión`,
      dueRefresh: "Estos necesitan una actualización.",
      freshnessHeadings: [
        "Documento",
        "Responsable",
        "Última revisión",
        "SLA",
        "Estado",
      ],
      everyMonths: (n) => `cada ${n} m`,
      monthsStatus: (months, overdue) =>
        `${months} m · ${overdue ? "vencido" : "en plazo"}`,
      wizard: {
        steps: [
          "Editar taxonomía",
          "Revisar mapeo",
          "Reclasificación asistida",
          "Validación humana",
        ],
        title: "Reclasificar contra la taxonomía",
        desc: "Un cambio gobernado en cuatro pasos. No se regeneran embeddings ni se redespliega — se edita la taxonomía, el corpus se reclasifica contra ella con asistencia del modelo, y una persona valida cada propuesta antes de que se convierta en una nueva versión persistida.",
        continue: "Continuar",
        applying: "Aplicando…",
        confirmApply: "Confirmar y aplicar",
        back: "Atrás",
        cancel: "Cancelar",
        step0Desc:
          "Renombra o refina un eje estratégico. Esto refleja un cambio de estrategia — por ejemplo, integrar un tema heredado en un eje estratégico actual.",
        axisToEdit: "Eje a editar",
        newName: "Nombre nuevo",
        newDescription: "Descripción nueva (opcional)",
        building:
          "Construyendo la tabla de mapeo y pidiendo al motor que reclasifique cada documento afectado contra el eje editado…",
        proposalFailed: "La propuesta falló",
        affected: (n, fromName) =>
          `${n} ${n === 1 ? "documento se asigna actualmente" : "documentos se asignan actualmente"} a "${fromName}". Se revisarán contra la nueva definición.`,
        engineLlm: "Zero-shot asistido por modelo",
        engineFallback: "Alternativa determinista",
        engineLlmDesc: (n) =>
          `El motor clasificó cada uno de los ${n} documentos afectados en modo zero-shot contra el eje editado. Se reutilizan los embeddings existentes — esto es un remapeo de metadatos, no una reindexación.`,
        engineFallbackDesc: (n) =>
          `El modelo no estaba disponible, por lo que cada uno de los ${n} documentos afectados mantiene su mapeo actual bajo la etiqueta renombrada — claramente indicado, nunca en silencio. Una persona sigue validando cada fila.`,
        proposalHeadings: ["Documento", "Propuesta", "Confianza"],
        humanConfirmTitle:
          "Una persona confirma cada reclasificación antes de que se active",
        humanConfirmDesc:
          "Desmarca cualquier propuesta para rechazarla — los documentos rechazados conservan sus etiquetas actuales. Nada se aplica automáticamente.",
        applyFailed: "La aplicación falló",
        staysUnder: (name) => `Permanece bajo "${name}"`,
        leaves: (name) => `Sale de "${name}"`,
        accepted: (a, total) =>
          `${a} de ${total} propuestas aceptadas. Confirma para aplicar como una nueva versión persistida de la taxonomía — el cambio tiene efecto de inmediato.`,
        proposeError:
          "El motor de reetiquetado no pudo generar propuestas. No se ha cambiado nada.",
        applyError:
          "No se pudo aplicar la versión de taxonomía. No se ha cambiado nada.",
        actor: "Tú (documentalista)",
        applyNote: (from, to) =>
          `Se renombró "${from}" a "${to}" y se reclasificaron los documentos afectados.`,
        reclassifiedDetail: (from, to, version, applied, rejected) =>
          `Se renombró "${from}" a "${to}". Se aplicó la versión ${version} de la taxonomía: ${applied} aceptadas, ${rejected} rechazadas por revisión humana — sin regenerar embeddings, sin redespliegue.`,
      },
    },
    corpus: {
      categoryA: "A · Interno",
      categoryB: "B · Externo",
      categoryE: "E · Salida SSoT",
      totalDocuments: "Total de documentos",
      totalChunks: "Total de fragmentos",
      countries: "Países",
      needsReview: "Requiere revisión",
      governedCorpus: "Corpus gobernado",
      rowDesc: (brand, chunks, format, connector, language) =>
        `${brand} · ${chunks} fragmentos · ${format} · vía ${connector} · ${language}`,
      filteredSentiment: (s) => `filtrado · ${s}`,
      documentFallback: "Documento",
      confidentialityInherited: (label, connector) =>
        `La confidencialidad "${label}" se hereda de la etiqueta de sensibilidad de la fuente (${connector} — Purview/MIP simulado), no se asigna a mano.`,
      owner: (v) => `Responsable: ${v}`,
      format: (v) => `Formato: ${v}`,
      source: (v) => `Fuente: ${v}`,
      language: (v) => `Idioma: ${v}`,
      refresh: (v) => `Actualización: ${v}`,
      version: (v) => `Versión: ${v}`,
      versionLineage: "Linaje de versiones",
      supersededBy: "sustituido por",
      replaces: "reemplaza a",
      generatedFrom: "Generado a partir de fuentes gobernadas:",
      filterMatch: (s) =>
        `Coincidencia del filtro previo a la ingesta · menciones ${s}`,
      keyword: (k) => `palabra clave: ${k}`,
      competitor: (k) => `competidor: ${k}`,
      executive: (k) => `directivo: ${k}`,
      topic: (k) => `tema: ${k}`,
      filterNote:
        "Solo se ingirió el material que coincide con los filtros configurados de palabra clave, competidor, directivo y tema — nunca un volcado en bruto.",
      chunksCount: (n) => `Fragmentos del documento (${n})`,
      failedToLoad: "No se pudo cargar el documento",
      searchLabel: "Buscar documentos",
      filterCategory: "Categoría",
      filterCountry: "País",
      filterBrand: "Marca",
      filterClearance: "Confidencialidad",
      filterValidity: "Vigencia",
      filterSource: "Fuente",
      allLabel: "Todos",
      matchCount: (shown, total) => `Mostrando ${shown} de ${total} documentos`,
      noMatches: "Ningún documento coincide con los filtros actuales.",
    },
  },
  DE: {
    areas: {
      validation: "Validierungswarteschlange",
      sources: "Quellen",
      ingestion: "Ingestion",
      governance: "Governance",
      corpus: "Korpus",
    },
    sessionActivity: "Sitzungsaktivität",
    sessionActivityCount: (n) => `Sitzungsaktivität (${n})`,
    activityDrawerDesc:
      "Jede hier getroffene Entscheidung der Dokumentar:innen fließt in den Prüfpfad der Plattform ein. Diese Sitzung liegt in der Demo nur im Arbeitsspeicher.",
    noActionsYet: "Noch keine Aktionen in dieser Sitzung.",
    pageTitle: "Datenzentrum",
    pageSubtitle:
      "Der Schreibtisch der Dokumentar:innen — hier werden Quellen, Ingestion, Validierung und Taxonomie kontrolliert, damit jede Antwort auf vertrauenswürdigem Boden steht.",
    allCaughtUp: "Alles ist erledigt",
    itemsNeedDocumentalist: (n) =>
      `${n} ${n === 1 ? "Element benötigt" : "Elemente benötigen"} Dokumentar:innen`,
    corpusNeedsAttention: "Der Korpus benötigt Aufmerksamkeit",
    allClearDesc:
      "Nichts in Quarantäne, keine Klassifikation wartet auf einen Menschen, und jedes Dokument liegt innerhalb seines Prüf-SLA.",
    statusInQueue: (n) => `${n} in der Validierungswarteschlange`,
    statusInQuarantine: (n) => `${n} in Quarantäne gehalten`,
    statusPastSla: (n) => `${n} über dem Prüf-SLA`,
    confidence: { high: "Hoch", medium: "Mittel", low: "Niedrig" },
    sentiment: { positive: "positiv", negative: "negativ", neutral: "neutral" },
    decision: { kept: "behalten", dropped: "verworfen" },
    activity: {
      validatedClassification: "Klassifikation validiert",
      correctedClassification: "Klassifikation korrigiert",
      rejectedClassification: "Klassifikation abgelehnt",
      resolvedConflict: "Quellenkonflikt gelöst",
      releasedFromQuarantine: "Aus Quarantäne freigegeben",
      manualUpload: "Manueller Upload",
      reclassifiedCorpus: "Korpus neu klassifiziert",
      taxonomyConfiguration: "Taxonomie-Konfiguration",
      addedViaForm: (source) =>
        `Über das geführte Formular aus ${source} hinzugefügt.`,
    },
    validation: {
      bannerTitle:
        "Dreischichtige Klassifikation, immer von einem Menschen abgeschlossen",
      layers: {
        deterministic: {
          title: "Deterministisch",
          desc: "Regelbasierter Typ aus Quelle, Format und Struktur.",
        },
        semantic: {
          title: "Semantisch",
          desc: "Aus dem Inhalt abgeleitete Themen und Entitäten.",
        },
        strategic: {
          title: "Strategisch",
          desc: "Einer strategischen Achse von Telefónica zugeordnet.",
        },
      },
      legend: {
        high: "Hoch — vorgelagert automatisch validiert",
        medium: "Mittel — hier zur schnellen Prüfung angezeigt",
        low: "Niedrig — markiert, benötigt einen Menschen",
      },
      queueTitleOpen: (n) =>
        `Validierungswarteschlange — ${n} warten auf eine Entscheidung`,
      queueTitleClear: "Validierungswarteschlange leer",
      allCaughtUp: "Alles erledigt",
      clearedThisSession: (n) =>
        `Sie haben in dieser Sitzung ${n} ${n === 1 ? "Element" : "Elemente"} bearbeitet. Klassifikationen mit hoher Konfidenz wurden vorgelagert automatisch validiert.`,
      noneWaiting:
        "Keine Klassifikationen mit mittlerer oder niedriger Konfidenz warten auf einen Menschen.",
      sourceConflict: "Quellenkonflikt",
      conflictHeadline:
        "Eine neuere Quelle widerspricht dem Wert, der bereits im Kern liegt.",
      currentlyLive: "Derzeit live",
      fresherSource: "Neuere Quelle",
      conflictNote:
        "Wird der neuere Wert übernommen, bleibt die ältere Zahl als datierter, historischer Datensatz erhalten — sie wird nie stillschweigend überschrieben.",
      promoteFresher: "Neueren Wert übernehmen",
      keepCurrent: "Aktuellen Wert behalten",
      deterministicLabel: "Deterministisch",
      semanticLabel: "Semantisch",
      strategicAxisLabel: "Strategische Achse",
      proposedMetadata: "Vorgeschlagene Metadaten:",
      validate: "Validieren",
      correct: "Korrigieren",
      reject: "Ablehnen",
      resolvedThisSession: "In dieser Sitzung gelöst",
      actionValidated: "Validiert",
      actionCorrected: "Korrigiert",
      actionRejected: "Abgelehnt",
      editTitle: "Klassifikation korrigieren",
      editDesc: (title) =>
        `${title} — passen Sie die kontrollierten Metadaten vor der Validierung an. Ihre Korrektur wird als menschliche Entscheidung erfasst. Nur für die Demo-Sitzung.`,
      saveValidate: "Speichern und validieren",
      cancel: "Abbrechen",
      confirmedDetail: (note) =>
        `Die vorgeschlagene Klassifikation wurde bestätigt. ${note}`,
      rejectedDetail:
        "Abgelehnt — zur erneuten Verarbeitung an die Pipeline zurückgegeben.",
      correctedDetail: (changes, note) => `${changes} korrigiert. ${note}`,
      fieldArrow: (field, value) => `${field} → ${value}`,
      promotedDetail: (freshValue, freshSource, freshDate, oldValue) =>
        `${freshValue} übernommen (${freshSource}, ${freshDate}); ${oldValue} als historisch beibehalten.`,
      keptDetail: (oldValue, oldSource) =>
        `${oldValue} beibehalten (${oldSource}); die neuere Zahl wurde protokolliert, aber nicht übernommen.`,
    },
    sources: {
      bannerTitle: "Quellen speisen den Kern, bevor das Modell überhaupt läuft",
      bannerDesc:
        "Qualität beginnt hier, nicht beim Modell. Externe Quellen werden vor der Ingestion gefiltert — nach Schlüsselwörtern, beobachteten Wettbewerbern, benannten Führungskräften und Prioritätsthemen — sodass nur relevante Erwähnungen in den Wissenskern gelangen. Interne Dokumente treffen mit dem Sensibilitätslabel ein, das zu ihrer kontrollierten Vertraulichkeitsstufe wird.",
      documents: "Dokumente",
      cadence: "Frequenz",
      lastSync: "Letzte Synchronisierung",
      manualUpload: "Manueller Upload",
      connectorPlanned: "Konnektor geplant — noch keine Dokumente aufgenommen.",
      addedThisSession: "In dieser Sitzung hinzugefügt",
      queuedToIntake: "Für die Aufnahme eingereiht",
      uploadTitle: "Manueller Upload",
      uploadDesc:
        "Pflicht-Metadaten werden vorab erfasst, damit das Dokument nie unvollständig in die Pipeline gelangt. Nur für die Demo-Sitzung.",
      addToIntake: "Zur Aufnahme hinzufügen",
      cancel: "Abbrechen",
      title: "Titel",
      owner: "Verantwortlich",
      country: "Land",
      brand: "Marke",
      confidentiality: "Vertraulichkeit",
      area: "Bereich",
    },
    ingestion: {
      live: {
        title: "Live-Erfassung öffentlicher Daten (Kanal B)",
        filterBeforeIngest: "Vor der Ingestion filtern",
        desc: "Definieren Sie zuerst die vereinbarte Regel — Schlüsselwörter, beobachtete Wettbewerber, benannte Führungskräfte, Prioritätsthemen. Die Live-Suche zeigt nur öffentliche Berichterstattung, die der Regel entspricht, ein Mensch prüft jeden Kandidaten mit seiner Erwähnungsmarkierung, und nur angenommene Einträge gelangen als externe (B) Dokumente mit vollständiger Herkunft in den Wissenskern.",
        keywords: "Schlüsselwörter (durch Komma getrennt)",
        competitors: "Wettbewerber",
        executives: "Führungskräfte",
        topics: "Themen",
        searching: "Suche in öffentlicher Berichterstattung",
        runCapture: "Gefilterte Erfassung ausführen",
        atLeastOne:
          "Mindestens ein Filterbegriff ist erforderlich — ohne Regel wird nichts erfasst.",
        searchError:
          "Die Live-Erfassungssuche konnte nicht abgeschlossen werden. Es wurde nichts aufgenommen.",
        captureFailed: "Erfassung fehlgeschlagen",
        noMatchTitle: "Keine passende Berichterstattung",
        noMatchDesc:
          "Die Live-Suche fand keine öffentliche Berichterstattung, die dem Filter entspricht. Es wurde nichts aufgenommen.",
        candidatesTitle: (sel, total) =>
          `Kandidaten — menschliche Prüfung (${sel} von ${total} angenommen)`,
        embedding: "Einbetten und indexieren",
        ingestAccepted: (n) => `${n} angenommene aufnehmen`,
        matched: "Treffer",
        acceptError:
          "Die angenommenen Erwähnungen konnten nicht aufgenommen werden. Der Kern ist unverändert.",
        ingestionFailed: "Ingestion fehlgeschlagen",
        ingestedTitle: (n) =>
          `${n} externe${n === 1 ? "s" : ""} Dokument${n === 1 ? "" : "e"} in den Kern aufgenommen`,
        ingestedDesc: (docTitles, chunks, before, after) =>
          `${docTitles}. ${chunks} Chunk${chunks === 1 ? "" : "s"} einmal eingebettet und in den Vektorindex eingefügt (${before} Punkte vorher, ${after} nachher). Fragen kann sie sofort zitieren; die Herkunft des Ingest-Filters steht bei jedem Dokument im Korpus-Browser.`,
      },
      relevance: {
        title: "Relevanzfilter vor der Ingestion",
        kept: (n) => `${n} behalten`,
        dropped: (n) => `${n} verworfen`,
        desc: "Externe Erwähnungen werden vor der Ingestion gegen vereinbarte Regeln geprüft — Schlüsselwörter, beobachtete Wettbewerber, benannte Führungskräfte und Prioritätsthemen. Verworfene Erwähnungen erreichen den Wissenskern nie.",
        recentDecisions: "Jüngste Entscheidungen",
        matchedRule: (rule) => `Treffer bei ${rule}`,
        noRuleMatched: "keine Regel getroffen",
      },
      pipeline: {
        title: "Die siebenstufige Pipeline",
        taxonomy: "Taxonomie",
        stage: (n) => `Stufe ${n}`,
        validatedLive: "Validiert und live im Kern",
        validatedNote:
          "Nichts erreicht das Modell, bevor es die Validierung besteht. Der Rest wird unten in Quarantäne gehalten — nie stillschweigend verworfen, nie stillschweigend geraten.",
      },
      quarantine: {
        titleOpen: (n) =>
          `Quarantäne — ${n} für Dokumentar:innen zurückgehalten`,
        titleClear: "Quarantäne leer",
        nothingWaiting: "Nichts wartet",
        clearedThisSession: (n) =>
          `Sie haben in dieser Sitzung ${n} ${n === 1 ? "Dokument" : "Dokumente"} bearbeitet. Jedes ist an der Stelle wieder in die Pipeline eingetreten, an der es aufgehört hatte.`,
        everyDocHasMeta:
          "Jedes aufgenommene Dokument hat die Metadaten, die der Kern verlangt.",
        stalledNote:
          "Diese Dokumente sind stehen geblieben, weil ein Pflichtfeld fehlt oder ihre Taxonomie-Version veraltet ist. Sie werden zurückgehalten — nicht verworfen — damit der Kern nie verunreinigt wird. Vervollständigen Sie die Metadaten, um sie freizugeben.",
        heldAt: (source, stage, version) =>
          `${source} · in Stufe ${stage} gehalten · Taxonomie ${version}`,
        missing: "Fehlt",
        resolve: "Beheben",
        resolveTitle: "Quarantäne beheben",
        resolveDesc: (title, stage) =>
          `${title} — vervollständigen Sie die erforderlichen Metadaten. Nach der Freigabe tritt das Dokument in Stufe ${stage} wieder in die Pipeline ein. Nur für die Demo-Sitzung.`,
        releaseToPipeline: "In die Pipeline freigeben",
        cancel: "Abbrechen",
        releasedDetail: (filled, stage) =>
          `${filled} vervollständigt. In Stufe ${stage} wieder in die Pipeline eingetreten.`,
      },
    },
    governance: {
      bannerTitle: "Taxonomie ist Konfiguration, kein Code",
      taxonomyVersion: (v) => `Taxonomie v${v}`,
      reclassify: "Neu klassifizieren",
      bannerDesc:
        "Die strategischen Achsen unten sind das gemeinsame Vokabular, dem jedes Dokument zugeordnet wird. Verschiebt sich die Strategie, aktualisieren Dokumentar:innen die Taxonomie und klassifizieren den Korpus dagegen neu — eine kontrollierte Konfigurationsänderung, kein technisches Release. Kein erneutes Einbetten, kein IT-Ticket, kein Redeployment.",
      liveTitle: (v) => `Taxonomie-Version ${v} ist live`,
      liveDesc: (applied, rejected, qdrant) =>
        `${applied} Dokument${applied === 1 ? "" : "e"} neu getaggt, ${rejected} Vorschlag${rejected === 1 ? "" : "e"} durch menschliche Prüfung abgelehnt. Die Änderung wurde sofort über Abruf und Durchsuchen wirksam.${
          qdrant
            ? ` Qdrant-Nachweis: ${qdrant.updatedDocs} Dokument-Payload${qdrant.updatedDocs === 1 ? "" : "s"} per set_payload direkt aktualisiert — die Vektoranzahl bleibt unverändert (${qdrant.pointsBefore} vorher, ${qdrant.pointsAfter} nachher). Kein erneutes Einbetten, keine erneute Ingestion.`
            : ""
        }`,
      axis: (n) => `Achse ${n}`,
      historyTitle: "Versionsverlauf der Taxonomie",
      historyDesc:
        "Jede angewandte Neuklassifikation ist eine persistierte, versionierte Konfigurationsänderung mit Akteur und Notiz — der Prüfpfad des Vokabulars selbst.",
      historyHeadings: [
        "Version",
        "Wann",
        "Akteur",
        "Änderung",
        "Neu getaggte Dokumente",
      ],
      versionActive: (v) => `v${v} · aktiv`,
      version: (v) => `v${v}`,
      freshnessTitle: "Aktualität und Prüf-SLA",
      withinSla: (pct) => `${pct}% innerhalb des SLA`,
      freshnessDesc:
        'Jedes kontrollierte Dokument trägt ein Prüf-SLA. Läuft es ab, wird das Dokument zur Aktualisierung markiert, damit Antworten nie stillschweigend auf veraltetem Boden entstehen — der ehrliche Zustand "historische Quelle" hängt von dieser Disziplin ab.',
      pastSla: (n) =>
        `${n} ${n === 1 ? "Dokument ist" : "Dokumente sind"} über dem Prüf-SLA`,
      dueRefresh: "Diese sind zur Aktualisierung fällig.",
      freshnessHeadings: [
        "Dokument",
        "Verantwortlich",
        "Zuletzt geprüft",
        "SLA",
        "Status",
      ],
      everyMonths: (n) => `alle ${n} Mon.`,
      monthsStatus: (months, overdue) =>
        `${months} Mon. · ${overdue ? "überfällig" : "im Plan"}`,
      wizard: {
        steps: [
          "Taxonomie bearbeiten",
          "Zuordnung prüfen",
          "Assistierte Neuklassifikation",
          "Menschliche Validierung",
        ],
        title: "Gegen die Taxonomie neu klassifizieren",
        desc: "Eine kontrollierte Änderung in vier Schritten. Nichts wird neu eingebettet oder neu ausgerollt — die Taxonomie wird bearbeitet, der Korpus wird mit Modellunterstützung dagegen neu klassifiziert, und ein Mensch validiert jeden Vorschlag, bevor er zu einer neuen persistierten Version wird.",
        continue: "Weiter",
        applying: "Wird angewendet…",
        confirmApply: "Bestätigen und anwenden",
        back: "Zurück",
        cancel: "Abbrechen",
        step0Desc:
          "Benennen oder verfeinern Sie eine strategische Achse. Dies spiegelt eine Strategieverschiebung wider — zum Beispiel das Zusammenführen eines Alt-Themas in eine aktuelle strategische Achse.",
        axisToEdit: "Zu bearbeitende Achse",
        newName: "Neuer Name",
        newDescription: "Neue Beschreibung (optional)",
        building:
          "Die Zuordnungstabelle wird erstellt und die Engine gebeten, jedes betroffene Dokument gegen die bearbeitete Achse neu zu klassifizieren…",
        proposalFailed: "Vorschlag fehlgeschlagen",
        affected: (n, fromName) =>
          `${n} ${n === 1 ? "Dokument ist derzeit" : "Dokumente sind derzeit"} "${fromName}" zugeordnet. Sie werden gegen die neue Definition geprüft.`,
        engineLlm: "Modellgestützt zero-shot",
        engineFallback: "Deterministischer Rückfall",
        engineLlmDesc: (n) =>
          `Die Engine klassifizierte jedes der ${n} betroffenen Dokumente zero-shot gegen die bearbeitete Achse. Bestehende Einbettungen werden wiederverwendet — dies ist eine Metadaten-Neuzuordnung, keine Neuindexierung.`,
        engineFallbackDesc: (n) =>
          `Das Modell war nicht verfügbar, daher behält jedes der ${n} betroffenen Dokumente seine aktuelle Zuordnung unter dem umbenannten Label — klar gekennzeichnet, nie stillschweigend. Ein Mensch validiert weiterhin jede Zeile.`,
        proposalHeadings: ["Dokument", "Vorschlag", "Konfidenz"],
        humanConfirmTitle:
          "Ein Mensch bestätigt jede Neuklassifikation, bevor sie live geht",
        humanConfirmDesc:
          "Deaktivieren Sie einen Vorschlag, um ihn abzulehnen — abgelehnte Dokumente behalten ihre aktuellen Tags. Nichts wird automatisch angewendet.",
        applyFailed: "Anwendung fehlgeschlagen",
        staysUnder: (name) => `Bleibt unter "${name}"`,
        leaves: (name) => `Verlässt "${name}"`,
        accepted: (a, total) =>
          `${a} von ${total} Vorschlägen angenommen. Bestätigen Sie, um sie als neue persistierte Taxonomie-Version anzuwenden — die Änderung wird sofort wirksam.`,
        proposeError:
          "Die Re-Tagging-Engine konnte keine Vorschläge erzeugen. Es wurde nichts geändert.",
        applyError:
          "Die Taxonomie-Version konnte nicht angewendet werden. Es wurde nichts geändert.",
        actor: "Sie (Dokumentar:in)",
        applyNote: (from, to) =>
          `"${from}" in "${to}" umbenannt und die betroffenen Dokumente neu klassifiziert.`,
        reclassifiedDetail: (from, to, version, applied, rejected) =>
          `"${from}" in "${to}" umbenannt. Taxonomie-Version ${version} angewendet: ${applied} angenommen, ${rejected} durch menschliche Prüfung abgelehnt — kein erneutes Einbetten, kein Redeployment.`,
      },
    },
    corpus: {
      categoryA: "A · Intern",
      categoryB: "B · Extern",
      categoryE: "E · SSoT-Ausgabe",
      totalDocuments: "Dokumente gesamt",
      totalChunks: "Chunks gesamt",
      countries: "Länder",
      needsReview: "Prüfung nötig",
      governedCorpus: "Kontrollierter Korpus",
      rowDesc: (brand, chunks, format, connector, language) =>
        `${brand} · ${chunks} Chunks · ${format} · über ${connector} · ${language}`,
      filteredSentiment: (s) => `gefiltert · ${s}`,
      documentFallback: "Dokument",
      confidentialityInherited: (label, connector) =>
        `Die Vertraulichkeit "${label}" wird vom Sensibilitätslabel der Quelle geerbt (${connector} — simuliertes Purview/MIP), nicht von Hand vergeben.`,
      owner: (v) => `Verantwortlich: ${v}`,
      format: (v) => `Format: ${v}`,
      source: (v) => `Quelle: ${v}`,
      language: (v) => `Sprache: ${v}`,
      refresh: (v) => `Aktualisierung: ${v}`,
      version: (v) => `Version: ${v}`,
      versionLineage: "Versionsherkunft",
      supersededBy: "ersetzt durch",
      replaces: "ersetzt",
      generatedFrom: "Erzeugt aus kontrollierten Quellen:",
      filterMatch: (s) => `Treffer des Vor-Ingest-Filters · ${s} Erwähnungen`,
      keyword: (k) => `Schlüsselwort: ${k}`,
      competitor: (k) => `Wettbewerber: ${k}`,
      executive: (k) => `Führungskraft: ${k}`,
      topic: (k) => `Thema: ${k}`,
      filterNote:
        "Nur Material, das den konfigurierten Schlüsselwort-, Wettbewerber-, Führungskraft- und Themenfiltern entspricht, wurde aufgenommen — nie ein Rohabzug.",
      chunksCount: (n) => `Dokument-Chunks (${n})`,
      failedToLoad: "Dokument konnte nicht geladen werden",
      searchLabel: "Dokumente durchsuchen",
      filterCategory: "Kategorie",
      filterCountry: "Land",
      filterBrand: "Marke",
      filterClearance: "Vertraulichkeit",
      filterValidity: "Gültigkeit",
      filterSource: "Quelle",
      allLabel: "Alle",
      matchCount: (shown, total) =>
        `${shown} von ${total} Dokumenten angezeigt`,
      noMatches: "Keine Dokumente entsprechen den aktuellen Filtern.",
    },
  },
  PT: {
    areas: {
      validation: "Fila de validação",
      sources: "Fontes",
      ingestion: "Ingestão",
      governance: "Governança",
      corpus: "Corpus",
    },
    sessionActivity: "Atividade da sessão",
    sessionActivityCount: (n) => `Atividade da sessão (${n})`,
    activityDrawerDesc:
      "Cada decisão do documentalista tomada aqui alimenta a trilha de auditoria da plataforma. Esta sessão é apenas em memória para a demonstração.",
    noActionsYet: "Ainda não há ações nesta sessão.",
    pageTitle: "Central de dados",
    pageSubtitle:
      "A mesa do documentalista — onde fontes, ingestão, validação e taxonomia são governadas para que cada resposta se apoie em terreno confiável.",
    allCaughtUp: "Tudo em dia",
    itemsNeedDocumentalist: (n) =>
      `${n} ${n === 1 ? "item precisa" : "itens precisam"} de um documentalista`,
    corpusNeedsAttention: "O corpus precisa de atenção",
    allClearDesc:
      "Nada em quarentena, nenhuma classificação aguardando uma pessoa e cada documento dentro do seu SLA de revisão.",
    statusInQueue: (n) => `${n} na fila de validação`,
    statusInQuarantine: (n) => `${n} retidos em quarentena`,
    statusPastSla: (n) => `${n} fora do SLA de revisão`,
    confidence: { high: "Alta", medium: "Média", low: "Baixa" },
    sentiment: {
      positive: "positivo",
      negative: "negativo",
      neutral: "neutro",
    },
    decision: { kept: "mantido", dropped: "descartado" },
    activity: {
      validatedClassification: "Classificação validada",
      correctedClassification: "Classificação corrigida",
      rejectedClassification: "Classificação rejeitada",
      resolvedConflict: "Conflito de fontes resolvido",
      releasedFromQuarantine: "Liberado da quarentena",
      manualUpload: "Envio manual",
      reclassifiedCorpus: "Corpus reclassificado",
      taxonomyConfiguration: "Configuração de taxonomia",
      addedViaForm: (source) =>
        `Adicionado pelo formulário guiado a partir de ${source}.`,
    },
    validation: {
      bannerTitle:
        "Classificação em três camadas, sempre encerrada por uma pessoa",
      layers: {
        deterministic: {
          title: "Determinística",
          desc: "Tipo baseado em regras a partir da fonte, do formato e da estrutura.",
        },
        semantic: {
          title: "Semântica",
          desc: "Temas e entidades inferidos do conteúdo.",
        },
        strategic: {
          title: "Estratégica",
          desc: "Mapeada para um eixo estratégico da Telefónica.",
        },
      },
      legend: {
        high: "Alta — validada automaticamente a montante",
        medium: "Média — exibida aqui para uma verificação rápida",
        low: "Baixa — sinalizada, precisa de uma pessoa",
      },
      queueTitleOpen: (n) => `Fila de validação — ${n} aguardando uma decisão`,
      queueTitleClear: "Fila de validação vazia",
      allCaughtUp: "Tudo em dia",
      clearedThisSession: (n) =>
        `Você resolveu ${n} ${n === 1 ? "item" : "itens"} nesta sessão. As classificações de alta confiança foram validadas automaticamente a montante.`,
      noneWaiting:
        "Nenhuma classificação de confiança média ou baixa aguarda uma pessoa.",
      sourceConflict: "Conflito de fontes",
      conflictHeadline:
        "Uma fonte mais recente diverge do valor que já está no núcleo.",
      currentlyLive: "Atualmente ativo",
      fresherSource: "Fonte mais recente",
      conflictNote:
        "Promover o valor mais recente mantém o número anterior como um registro histórico datado — ele nunca é sobrescrito em silêncio.",
      promoteFresher: "Promover o valor mais recente",
      keepCurrent: "Manter o valor atual",
      deterministicLabel: "Determinística",
      semanticLabel: "Semântica",
      strategicAxisLabel: "Eixo estratégico",
      proposedMetadata: "Metadados propostos:",
      validate: "Validar",
      correct: "Corrigir",
      reject: "Rejeitar",
      resolvedThisSession: "Resolvidos nesta sessão",
      actionValidated: "Validado",
      actionCorrected: "Corrigido",
      actionRejected: "Rejeitado",
      editTitle: "Corrigir classificação",
      editDesc: (title) =>
        `${title} — ajuste os metadados governados antes de validar. Sua correção é registrada como a decisão humana. Apenas para a sessão da demonstração.`,
      saveValidate: "Salvar e validar",
      cancel: "Cancelar",
      confirmedDetail: (note) =>
        `A classificação proposta foi confirmada. ${note}`,
      rejectedDetail: "Rejeitado — devolvido ao pipeline para reprocessamento.",
      correctedDetail: (changes, note) => `Corrigido ${changes}. ${note}`,
      fieldArrow: (field, value) => `${field} → ${value}`,
      promotedDetail: (freshValue, freshSource, freshDate, oldValue) =>
        `Promovido ${freshValue} (${freshSource}, ${freshDate}); ${oldValue} mantido como histórico.`,
      keptDetail: (oldValue, oldSource) =>
        `Mantido ${oldValue} (${oldSource}); o número mais recente foi registrado, mas não promovido.`,
    },
    sources: {
      bannerTitle:
        "As fontes alimentam o núcleo antes de o modelo sequer rodar",
      bannerDesc:
        "A qualidade começa aqui, não no modelo. As fontes externas são filtradas antes da ingestão — por palavras-chave, concorrentes monitorados, executivos nomeados e temas prioritários — de modo que apenas menções relevantes entrem no núcleo de conhecimento. Os documentos internos chegam com o rótulo de sensibilidade que se torna seu nível de confidencialidade governado.",
      documents: "Documentos",
      cadence: "Cadência",
      lastSync: "Última sincronização",
      manualUpload: "Envio manual",
      connectorPlanned: "Conector planejado — nenhum documento ingerido ainda.",
      addedThisSession: "Adicionados nesta sessão",
      queuedToIntake: "Na fila para admissão",
      uploadTitle: "Envio manual",
      uploadDesc:
        "Os metadados obrigatórios são capturados antecipadamente para que o documento nunca entre no pipeline subespecificado. Apenas para a sessão da demonstração.",
      addToIntake: "Adicionar à admissão",
      cancel: "Cancelar",
      title: "Título",
      owner: "Responsável",
      country: "País",
      brand: "Marca",
      confidentiality: "Confidencialidade",
      area: "Área",
    },
    ingestion: {
      live: {
        title: "Captura de dados públicos ao vivo (canal B)",
        filterBeforeIngest: "Filtrar antes de ingerir",
        desc: "Defina primeiro a regra acordada — palavras-chave, concorrentes monitorados, executivos nomeados, temas prioritários. A busca ao vivo só exibe cobertura pública que corresponde à regra, uma pessoa revisa cada candidato com sua marcação de menção, e apenas os itens aceitos entram no núcleo de conhecimento como documentos externos (B) com procedência completa.",
        keywords: "Palavras-chave (separadas por vírgula)",
        competitors: "Concorrentes",
        executives: "Executivos",
        topics: "Temas",
        searching: "Buscando cobertura pública",
        runCapture: "Executar captura filtrada",
        atLeastOne:
          "É necessário pelo menos um termo de filtro — nada é capturado sem uma regra.",
        searchError:
          "Não foi possível concluir a busca de captura ao vivo. Nada foi ingerido.",
        captureFailed: "A captura falhou",
        noMatchTitle: "Sem cobertura correspondente",
        noMatchDesc:
          "A busca ao vivo não encontrou cobertura pública correspondente ao filtro. Nada foi ingerido.",
        candidatesTitle: (sel, total) =>
          `Candidatos — revisão humana (${sel} de ${total} aceitos)`,
        embedding: "Gerando embeddings e indexando",
        ingestAccepted: (n) => `Ingerir ${n} aceitos`,
        matched: "Correspondência",
        acceptError:
          "Não foi possível ingerir as menções aceitas. O núcleo permanece inalterado.",
        ingestionFailed: "A ingestão falhou",
        ingestedTitle: (n) =>
          `${n} documento${n === 1 ? "" : "s"} externo${n === 1 ? "" : "s"} ingerido${n === 1 ? "" : "s"} no núcleo`,
        ingestedDesc: (docTitles, chunks, before, after) =>
          `${docTitles}. ${chunks} fragmento${chunks === 1 ? "" : "s"} embutido${chunks === 1 ? "" : "s"} uma vez e inserido${chunks === 1 ? "" : "s"} no índice vetorial (${before} pontos antes, ${after} depois). Perguntar pode citá-los imediatamente; a procedência do filtro de ingestão está em cada documento no navegador de corpus.`,
      },
      relevance: {
        title: "Filtro de relevância pré-ingestão",
        kept: (n) => `${n} mantidos`,
        dropped: (n) => `${n} descartados`,
        desc: "As menções externas são avaliadas contra regras acordadas antes da ingestão — palavras-chave, concorrentes monitorados, executivos nomeados e temas prioritários. As menções descartadas nunca chegam ao núcleo de conhecimento.",
        recentDecisions: "Decisões recentes",
        matchedRule: (rule) => `correspondeu a ${rule}`,
        noRuleMatched: "nenhuma regra correspondeu",
      },
      pipeline: {
        title: "O pipeline de sete etapas",
        taxonomy: "Taxonomia",
        stage: (n) => `Etapa ${n}`,
        validatedLive: "Validado e ativo no núcleo",
        validatedNote:
          "Nada chega ao modelo antes de passar pela validação. O restante é retido em quarentena abaixo — nunca descartado em silêncio, nunca adivinhado em silêncio.",
      },
      quarantine: {
        titleOpen: (n) => `Quarentena — ${n} retidos para um documentalista`,
        titleClear: "Quarentena vazia",
        nothingWaiting: "Nada aguardando",
        clearedThisSession: (n) =>
          `Você resolveu ${n} ${n === 1 ? "documento" : "documentos"} nesta sessão. Cada um voltou ao pipeline de onde parou.`,
        everyDocHasMeta:
          "Cada documento ingerido tem os metadados que o núcleo exige.",
        stalledNote:
          "Estes documentos ficaram parados porque um campo obrigatório está faltando ou sua versão de taxonomia está desatualizada. Eles são retidos — não descartados — para que o núcleo nunca seja poluído. Complete os metadados para liberá-los.",
        heldAt: (source, stage, version) =>
          `${source} · retido na etapa ${stage} · taxonomia ${version}`,
        missing: "Faltando",
        resolve: "Resolver",
        resolveTitle: "Resolver quarentena",
        resolveDesc: (title, stage) =>
          `${title} — complete os metadados obrigatórios. Uma vez liberado, o documento volta ao pipeline na etapa ${stage}. Apenas para a sessão da demonstração.`,
        releaseToPipeline: "Liberar para o pipeline",
        cancel: "Cancelar",
        releasedDetail: (filled, stage) =>
          `${filled} concluído. Voltou ao pipeline na etapa ${stage}.`,
      },
    },
    governance: {
      bannerTitle: "Taxonomia é configuração, não código",
      taxonomyVersion: (v) => `Taxonomia v${v}`,
      reclassify: "Reclassificar",
      bannerDesc:
        "Os eixos estratégicos abaixo são o vocabulário compartilhado ao qual cada documento é mapeado. Quando a estratégia muda, um documentalista atualiza a taxonomia e reclassifica o corpus contra ela — uma mudança de configuração governada, não uma versão de engenharia. Sem regerar embeddings, sem ticket de TI, sem novo deploy.",
      liveTitle: (v) => `A versão ${v} da taxonomia está ativa`,
      liveDesc: (applied, rejected, qdrant) =>
        `${applied} documento${applied === 1 ? "" : "s"} reetiquetado${applied === 1 ? "" : "s"}, ${rejected} proposta${rejected === 1 ? "" : "s"} rejeitada${rejected === 1 ? "" : "s"} por revisão humana. A mudança teve efeito imediato na recuperação e na navegação.${
          qdrant
            ? ` Prova do Qdrant: ${qdrant.updatedDocs} payload${qdrant.updatedDocs === 1 ? "" : "s"} de documento atualizado${qdrant.updatedDocs === 1 ? "" : "s"} no local via set_payload — a contagem de vetores permanece inalterada (${qdrant.pointsBefore} antes, ${qdrant.pointsAfter} depois). Sem regerar embeddings, sem reingestão.`
            : ""
        }`,
      axis: (n) => `Eixo ${n}`,
      historyTitle: "Histórico de versões da taxonomia",
      historyDesc:
        "Cada reclassificação aplicada é uma mudança de configuração persistida e versionada com um ator e uma nota — a trilha de auditoria do próprio vocabulário.",
      historyHeadings: [
        "Versão",
        "Quando",
        "Ator",
        "Mudança",
        "Documentos reetiquetados",
      ],
      versionActive: (v) => `v${v} · ativa`,
      version: (v) => `v${v}`,
      freshnessTitle: "Atualidade e SLA de revisão",
      withinSla: (pct) => `${pct}% dentro do SLA`,
      freshnessDesc:
        'Cada documento governado carrega um SLA de revisão. Uma vez expirado, o documento é sinalizado para atualização, de modo que as respostas nunca sejam construídas em silêncio sobre terreno desatualizado — o estado honesto de "fonte histórica" depende dessa disciplina.',
      pastSla: (n) =>
        `${n} ${n === 1 ? "documento está" : "documentos estão"} fora do SLA de revisão`,
      dueRefresh: "Estes precisam de uma atualização.",
      freshnessHeadings: [
        "Documento",
        "Responsável",
        "Última revisão",
        "SLA",
        "Status",
      ],
      everyMonths: (n) => `a cada ${n} m`,
      monthsStatus: (months, overdue) =>
        `${months} m · ${overdue ? "vencido" : "no prazo"}`,
      wizard: {
        steps: [
          "Editar taxonomia",
          "Revisar mapeamento",
          "Reclassificação assistida",
          "Validação humana",
        ],
        title: "Reclassificar contra a taxonomia",
        desc: "Uma mudança governada em quatro etapas. Nada é reembutido ou reimplantado — a taxonomia é editada, o corpus é reclassificado contra ela com assistência do modelo, e uma pessoa valida cada proposta antes de ela se tornar uma nova versão persistida.",
        continue: "Continuar",
        applying: "Aplicando…",
        confirmApply: "Confirmar e aplicar",
        back: "Voltar",
        cancel: "Cancelar",
        step0Desc:
          "Renomeie ou refine um eixo estratégico. Isso reflete uma mudança de estratégia — por exemplo, integrar um tema legado a um eixo estratégico atual.",
        axisToEdit: "Eixo a editar",
        newName: "Novo nome",
        newDescription: "Nova descrição (opcional)",
        building:
          "Construindo a tabela de mapeamento e pedindo ao motor que reclassifique cada documento afetado contra o eixo editado…",
        proposalFailed: "A proposta falhou",
        affected: (n, fromName) =>
          `${n} ${n === 1 ? "documento é mapeado atualmente" : "documentos são mapeados atualmente"} para "${fromName}". Eles serão revisados contra a nova definição.`,
        engineLlm: "Zero-shot assistido por modelo",
        engineFallback: "Alternativa determinística",
        engineLlmDesc: (n) =>
          `O motor classificou cada um dos ${n} documentos afetados em zero-shot contra o eixo editado. Os embeddings existentes são reutilizados — isto é um remapeamento de metadados, não uma reindexação.`,
        engineFallbackDesc: (n) =>
          `O modelo estava indisponível, então cada um dos ${n} documentos afetados mantém seu mapeamento atual sob o rótulo renomeado — claramente indicado, nunca em silêncio. Uma pessoa ainda valida cada linha.`,
        proposalHeadings: ["Documento", "Proposta", "Confiança"],
        humanConfirmTitle:
          "Uma pessoa confirma cada reclassificação antes de ela entrar no ar",
        humanConfirmDesc:
          "Desmarque qualquer proposta para rejeitá-la — os documentos rejeitados mantêm suas etiquetas atuais. Nada é aplicado automaticamente.",
        applyFailed: "A aplicação falhou",
        staysUnder: (name) => `Permanece sob "${name}"`,
        leaves: (name) => `Sai de "${name}"`,
        accepted: (a, total) =>
          `${a} de ${total} propostas aceitas. Confirme para aplicar como uma nova versão persistida da taxonomia — a mudança tem efeito imediato.`,
        proposeError:
          "O motor de reetiquetagem não conseguiu gerar propostas. Nada foi alterado.",
        applyError:
          "Não foi possível aplicar a versão da taxonomia. Nada foi alterado.",
        actor: "Você (documentalista)",
        applyNote: (from, to) =>
          `"${from}" renomeado para "${to}" e os documentos afetados reclassificados.`,
        reclassifiedDetail: (from, to, version, applied, rejected) =>
          `"${from}" renomeado para "${to}". Versão ${version} da taxonomia aplicada: ${applied} aceitas, ${rejected} rejeitadas por revisão humana — sem regerar embeddings, sem novo deploy.`,
      },
    },
    corpus: {
      categoryA: "A · Interno",
      categoryB: "B · Externo",
      categoryE: "E · Saída SSoT",
      totalDocuments: "Total de documentos",
      totalChunks: "Total de fragmentos",
      countries: "Países",
      needsReview: "Precisa de revisão",
      governedCorpus: "Corpus governado",
      rowDesc: (brand, chunks, format, connector, language) =>
        `${brand} · ${chunks} fragmentos · ${format} · via ${connector} · ${language}`,
      filteredSentiment: (s) => `filtrado · ${s}`,
      documentFallback: "Documento",
      confidentialityInherited: (label, connector) =>
        `A confidencialidade "${label}" é herdada do rótulo de sensibilidade da fonte (${connector} — Purview/MIP simulado), não atribuída manualmente.`,
      owner: (v) => `Responsável: ${v}`,
      format: (v) => `Formato: ${v}`,
      source: (v) => `Fonte: ${v}`,
      language: (v) => `Idioma: ${v}`,
      refresh: (v) => `Atualização: ${v}`,
      version: (v) => `Versão: ${v}`,
      versionLineage: "Linhagem de versões",
      supersededBy: "substituído por",
      replaces: "substitui",
      generatedFrom: "Gerado a partir de fontes governadas:",
      filterMatch: (s) =>
        `Correspondência do filtro pré-ingestão · menções ${s}`,
      keyword: (k) => `palavra-chave: ${k}`,
      competitor: (k) => `concorrente: ${k}`,
      executive: (k) => `executivo: ${k}`,
      topic: (k) => `tema: ${k}`,
      filterNote:
        "Apenas material que corresponde aos filtros configurados de palavra-chave, concorrente, executivo e tema foi ingerido — nunca um despejo bruto.",
      chunksCount: (n) => `Fragmentos do documento (${n})`,
      failedToLoad: "Falha ao carregar o documento",
      searchLabel: "Pesquisar documentos",
      filterCategory: "Categoria",
      filterCountry: "País",
      filterBrand: "Marca",
      filterClearance: "Confidencialidade",
      filterValidity: "Validade",
      filterSource: "Fonte",
      allLabel: "Todos",
      matchCount: (shown, total) => `A mostrar ${shown} de ${total} documentos`,
      noMatches: "Nenhum documento corresponde aos filtros atuais.",
    },
  },
};
