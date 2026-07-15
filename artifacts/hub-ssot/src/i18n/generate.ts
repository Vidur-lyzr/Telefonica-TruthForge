// Localized strings for the Generate page. Covers the brief-capture form (the
// structured brief + guided-chat toggle, the natural-language set-up panel, and
// every field, option label and helper inside the form), the guided chat, the
// draft editor view (canvas, Brand Guardian bar, exclusions, drafting pipeline,
// compose sidebar and refine chat) and the review/approval + export dialogs
// (scheduled, review inbox, versions, notifications, citation and asset
// drawers). Server-returned content (draft body, citations, review verdict text
// and folder names) is never localized here.

import type { Lang } from "../components/app-provider";

type FormShape = "messaging" | "press" | "multiformat";

export interface GenerateStrings {
  form: {
    title: string;
    subtitle: string;
    modeStructured: string;
    modeGuided: string;

    nlPanelTitle: string;
    nlLabel: string;
    nlPlaceholder: string;
    nlThinking: string;
    nlSuggest: string;
    nlUse: string;
    nlDismiss: string;

    shapes: Record<FormShape, { name: string; blurb: string }>;

    briefLabel: string;
    briefPlaceholder: string;

    kpiPanelAttached: (summary: string) => string;
    kpiRange: (from: string, to: string) => string;
    kpiHelper: string;

    askAttached: string;
    askDetach: string;
    askConflict: string;
    askHistoric: string;
    askLowConfidence: string;
    askCitedSources: string;
    askRecheckHelper: string;

    audienceLabel: string;
    audienceInternal: string;
    audienceExternal: string;
    audienceExternalHelper: string;

    languageLabel: string;
    languageOptions: Record<string, string>;

    confidentialityLabel: string;
    confidentialityOptions: Record<string, string>;
    confidentialityExternalHelper: string;

    formatLabel: string;
    formatOptions: Record<string, string>;

    spokespersonLabel: string;
    spokespersonField: string;
    spokespersonPlaceholder: string;
    spokespersonHelper: string;

    eventDateLabel: string;
    eventDateField: string;
    eventDatePlaceholder: string;
    eventDateHelper: string;

    axesLabel: string;

    attachmentsTitle: string;
    attachmentsTextLabel: string;
    attachmentsTextPlaceholder: string;
    attachmentsLinksLabel: string;
    attachmentsLinksPlaceholder: string;
    attachmentsHelper: string;

    followUpTitle: string;
    followUpLabel: string;
    followUpPlaceholder: string;
    followUpGenerate: string;
    followUpSkip: string;
    followUpQuestions: Record<FormShape, string>;

    generateDraft: string;
  };

  chat: {
    title: string;
    subtitle: string;
    initialQuestion: string;
    thinking: string;
    answerLabel: string;
    answerPlaceholder: string;
    sendAnswer: string;
  };

  editor: {
    // Localized labels for machine codes shown in tags/chips.
    audience: Record<string, string>;
    validity: Record<string, string>;
    frequency: Record<string, string>;
    channel: Record<string, string>;
    severity: Record<string, string>;

    // Brand Guardian bar
    guardianName: string;
    guardianCleared: string;
    guardianBlocked: string;
    fixPrefix: string;

    // Section + Q&A blocks
    internalOnly: string;
    sectionBodyAria: (heading: string) => string;
    answerAria: (question: string) => string;
    validUntil: (date: string) => string;
    noGovernedSource: string;
    internalNoteLabel: string;
    internalNotePlaceholder: string;
    saveNote: string;
    cancel: string;
    internalNotExportable: string;
    editNote: string;
    remove: string;
    addInternalNote: string;

    // Document canvas
    historicDefault: string;
    askFlaggedTitle: string;
    sourcesConflict: string;
    lowConfidence: string;
    historicSource: string;
    umbrellaMessage: string;
    evidenceAndCitations: string;

    // Exclusions panel
    exclusionsTitle: string;
    exclusionsBlurb: string;
    reasonClearance: string;
    reasonDestination: string;

    // Drafting pipeline
    pipelineRefineTitle: string;
    pipelineGenerateTitle: string;
    pipelineSubtitle: string;
    pipelineRefineSteps: { retrieving: string; composing: string; guardian: string };
    pipelineGenerateSteps: { retrieving: string; composing: string; guardian: string };

    // Refine outcomes + export errors
    refineAppliedPass: string;
    refineAppliedFlagged: string;
    refineFailed: string;
    exportReviewRequiredError: string;
    exportRefusedError: string;

    // Compose sidebar
    saveVersion: string;
    assets: string;
    liveEditHint: string;
    exportHeading: string;
    formatLabel: string;
    exporting: string;
    exportButton: string;
    exportPack: string;
    exportingPack: string;
    editorialReview: string;
    reviewCompleted: string;
    reviewRequired: string;
    reviewedHint: string;
    reviewNeededHint: string;
    recording: string;
    markReviewComplete: string;
    approving: string;
    approveDraft: string;
    lockedScheduled: string;
    lockedGuardian: string;
    spokespersonNotes: string;
    internal: string;
    doNotSay: (text: string) => string;
    chartsBuilt: (n: number) => string;

    // Refine chat
    editWithAgent: string;
    expand: string;
    collapse: string;
    rePrefix: (snippet: string) => string;
    recomposing: string;
    selectedPassage: (snippet: string) => string;
    clear: string;
    refineLabelSelection: string;
    refineLabelDefault: string;
    refinePlaceholder: string;
    sendInstruction: string;
    startNewBrief: string;

    // Governed canvas block editor
    canvas: {
      editBlock: string;
      lockedBlock: string;
      lockedBlockHint: string;
      blockTypeLabels: Record<string, string>;
      blockPanelContext: string;
      contentLabel: string;
      improveWithAgent: string;
      genericShorten: string;
      genericSharpen: string;
      genericFixTone: string;
      genericRetune: string;
      describeChange: string;
      describePlaceholder: string;
      improveButton: string;
      improving: string;
      reset: string;
      save: string;
      close: string;
      suggestionsLoading: string;
      editApplied: string;
      editBlocked: string;
      editNoChange: string;
      editFailed: string;
      sourcesPaneTitle: string;
      sourcesPaneEmpty: string;
      backToDocument: string;
    };
  };

  dialogs: {
    // Main tabs + top bar
    tabCompose: string;
    tabScheduled: string;
    tabInbox: string;
    tabVersions: string;
    notifications: string;
    notificationsUnread: (n: number) => string;

    // Blocked states
    noEvidenceTitle: string;
    permissionRestrictedTitle: string;
    adjustBrief: string;

    // Notifications drawer
    notificationsTitle: string;
    notificationsDesc: string;
    notificationsEmpty: string;
    notifApproved: string;
    notifReady: string;
    openInbox: string;

    // Citation drawer
    citationSubtitle: (id: string) => string;
    extractedSnippet: string;
    version: string;
    owner: string;
    confidence: string;

    // Assets drawer
    assetsTitle: string;
    assetsDesc: string;
    approvedClaims: string;
    approvedQuotes: string;
    disclaimers: string;
    glossary: string;

    // Scheduled tab
    scheduledTitle: string;
    scheduledBlurb: string;
    newSchedule: string;
    scheduleNameLabel: string;
    scheduleNamePlaceholder: string;
    shapeLabel: string;
    standingBriefLabel: string;
    standingBriefPlaceholder: string;
    frequencyLabel: string;
    audienceLabel: string;
    audienceInternal: string;
    audienceExternal: string;
    ownerClearanceLabel: string;
    ownerLabel: string;
    reviewFolderLabel: string;
    reviewFolderPlaceholder: string;
    queriesLabel: string;
    queriesPlaceholder: string;
    queriesHelper: string;
    axesLabel: string;
    createSchedule: string;
    noSchedules: string;
    sourcesPrefix: (list: string) => string;
    ownerPrefix: (owner: string) => string;
    lastRun: (when: string) => string;
    neverRun: string;
    nextRun: (when: string) => string;
    runNow: string;
    deliveryLog: string;
    deliveryLogBlurb: string;
    noDeliveries: string;
    deliveryMeta: (recipient: string, schedule: string, when: string) => string;

    // Inbox tab
    inboxTitle: string;
    inboxBlurb: string;
    inboxEmpty: string;
    approved: string;
    pending: string;
    published: string;
    guardianCleared: string;
    guardianBlocked: string;
    open: string;
    approve: string;
    publishing: string;
    publishToCorpus: string;
    publishSuccess: (args: {
      docId: string;
      version: string | number;
      chunks: number;
      superseded?: string | null;
    }) => string;
    publishError: string;

    // Versions tab
    versionsTitle: string;
    versionsBlurb: string;
    noVersions: string;
    versionMeta: (savedBy: string, when: string, owner: string) => string;
  };
}

export const GENERATE_I18N: Record<Lang, GenerateStrings> = {
  EN: {
    form: {
      title: "Generate a governed document",
      subtitle:
        "One engine, three shapes. Every claim is cited from the governed corpus, and the Brand Guardian must clear it before export.",
      modeStructured: "Structured brief",
      modeGuided: "Guided chat",

      nlPanelTitle: "Describe what you need and the engine suggests a set-up",
      nlLabel: "What do you need?",
      nlPlaceholder:
        "e.g. An external announcement of the Q1 results for the press, quoting the CEO",
      nlThinking: "Thinking...",
      nlSuggest: "Suggest a set-up",
      nlUse: "Use this set-up",
      nlDismiss: "Dismiss",

      shapes: {
        messaging: {
          name: "Messaging house",
          blurb: "Umbrella message and per-axis proof points for internal alignment.",
        },
        press: {
          name: "Press release + Q&A",
          blurb: "External announcement with an on-the-record Q&A holding line.",
        },
        multiformat: {
          name: "Multi-format pack",
          blurb: "One governed narrative, several channel-ready cuts.",
        },
      },

      briefLabel: "Brief",
      briefPlaceholder:
        "e.g. Q1 2026 results readout for the internal leadership call, covering Transform & Grow",

      kpiPanelAttached: (summary) => `KPI panel attached: ${summary}`,
      kpiRange: (from, to) => `${from} to ${to}`,
      kpiHelper:
        "Governed KPI figures for this selection will be recomputed and injected into the report.",

      askAttached: "Ask answer attached",
      askDetach: "Detach",
      askConflict: "Sources conflict",
      askHistoric: "Historic source",
      askLowConfidence: "Low confidence",
      askCitedSources: "Cited sources",
      askRecheckHelper:
        "The engine will re-check every cited source against your current persona and the destination before drafting; anything you can no longer access is excluded and reported.",

      audienceLabel: "Audience",
      audienceInternal: "Internal",
      audienceExternal: "External",
      audienceExternalHelper: "External caps sources to public material before retrieval.",

      languageLabel: "Language",
      languageOptions: { en: "English", es: "Spanish", de: "German", pt: "Portuguese" },

      confidentialityLabel: "Destination confidentiality",
      confidentialityOptions: {
        public: "Public",
        private: "Private",
        confidential: "Confidential",
        off_the_record: "Off the record",
      },
      confidentialityExternalHelper: "External work is held to public and cannot be raised here.",

      formatLabel: "Format",
      formatOptions: {
        messaging_house: "Messaging house",
        talking_points: "Talking points",
        leadership_brief: "Leadership brief",
        press_release: "Press release",
        qa_holding_line: "Q&A holding line",
        media_statement: "Media statement",
        multichannel_pack: "Multi-channel pack",
        social_pack: "Social pack",
        email_and_web: "Email and web",
      },

      spokespersonLabel: "Spokesperson (optional)",
      spokespersonField: "Spokesperson",
      spokespersonPlaceholder: "e.g. María García, Chief Communications Officer",
      spokespersonHelper: "Quotes and spokesperson notes are attributed to this person.",

      eventDateLabel: "Event date (optional)",
      eventDateField: "Event date",
      eventDatePlaceholder: "e.g. 12 May 2026",
      eventDateHelper: "The date the announcement or event takes place.",

      axesLabel: "Strategic axes (optional)",

      attachmentsTitle: "Brief attachments (optional)",
      attachmentsTextLabel: "Pasted brief or data",
      attachmentsTextPlaceholder:
        "Paste an existing brief, notes or figures the engine should be aware of",
      attachmentsLinksLabel: "Source links (one per line)",
      attachmentsLinksPlaceholder: "e.g. https://intranet.telefonica.com/brand/q1-brief",
      attachmentsHelper:
        "Attachments are given to the engine as background context only. They are never cited and never enter the governed evidence — only approved corpus sources back the draft's claims.",

      followUpTitle: "One quick thing",
      followUpLabel: "Missing detail",
      followUpPlaceholder:
        "Add the missing detail so the draft is framed correctly (optional)",
      followUpGenerate: "Generate with this",
      followUpSkip: "Skip",
      followUpQuestions: {
        messaging: "What is the single key message you want this to land?",
        press: "What exactly are we announcing — the news hook in one line?",
        multiformat: "What is the core message, and which channel matters most?",
      },

      generateDraft: "Generate draft",
    },

    chat: {
      title: "Guided brief",
      subtitle: "A few questions, then the form is filled in for you.",
      initialQuestion:
        "What do you need to produce? Describe the document in your own words — the shape, the topic, who it is for, the language, any spokesperson and the event date.",
      thinking: "Working out what is still missing...",
      answerLabel: "Your answer",
      answerPlaceholder: "Type your answer",
      sendAnswer: "Send answer",
    },

    editor: {
      audience: { internal: "Internal", external: "External" },
      validity: { approved: "Approved", historic: "Historic", expired: "Expired" },
      frequency: { daily: "Daily", weekly: "Weekly", monthly: "Monthly" },
      channel: { teams: "Teams", email: "Email" },
      severity: { error: "Error", warning: "Warning" },

      guardianName: "Brand Guardian",
      guardianCleared: "Cleared for export",
      guardianBlocked: "Export blocked",
      fixPrefix: "Fix:",

      internalOnly: "Internal only",
      sectionBodyAria: (heading) => `Section body: ${heading}`,
      answerAria: (question) => `Answer: ${question}`,
      validUntil: (date) => `valid until ${date}`,
      noGovernedSource:
        "Not covered by approved material — this answer carries no governed source.",
      internalNoteLabel: "Internal note",
      internalNotePlaceholder: "Working context for this answer — never exported externally",
      saveNote: "Save note",
      cancel: "Cancel",
      internalNotExportable: "Internal — not exportable",
      editNote: "Edit note",
      remove: "Remove",
      addInternalNote: "Add internal note",

      historicDefault: "This draft draws on historic material.",
      askFlaggedTitle: "Started from an Ask answer with flagged evidence",
      sourcesConflict: "Sources conflict",
      lowConfidence: "Low confidence",
      historicSource: "Historic source",
      umbrellaMessage: "Umbrella message",
      evidenceAndCitations: "Evidence and citations",

      exclusionsTitle: "Sources excluded by governance",
      exclusionsBlurb:
        "Two filters run before anything reaches the engine: your clearance, then the destination confidentiality of this document.",
      reasonClearance: "Your clearance",
      reasonDestination: "Destination",

      pipelineRefineTitle: "Refining under governance",
      pipelineGenerateTitle: "Composing from governed evidence",
      pipelineSubtitle:
        "Permission-filtered sources only. Every claim is cited before it reaches you.",
      pipelineRefineSteps: {
        retrieving: "Re-checking governed evidence",
        composing: "Applying your refinement with citations",
        guardian: "Brand Guardian re-checking claims and tone",
      },
      pipelineGenerateSteps: {
        retrieving: "Retrieving governed evidence",
        composing: "Composing the document with citations",
        guardian: "Brand Guardian checking claims and tone",
      },

      refineAppliedPass:
        "Applied. All claims re-cited and the Brand Guardian cleared the revision.",
      refineAppliedFlagged:
        "Applied, but the Brand Guardian flagged the revision — check the findings before exporting.",
      refineFailed: "The Hub could not apply that change.",
      exportReviewRequiredError:
        "Press material needs a completed editorial review before it can be exported. Mark the review below, then export again.",
      exportRefusedError: "The export was refused. Check the Guardian verdict and try again.",

      saveVersion: "Save version",
      assets: "Assets",
      liveEditHint:
        "The document is live — click anywhere in it to edit. The Guardian rechecks as you type.",
      exportHeading: "Export",
      formatLabel: "Format",
      exporting: "Exporting...",
      exportButton: "Export",
      exportPack: "Download pack (ZIP)",
      exportingPack: "Building pack...",
      editorialReview: "Editorial review",
      reviewCompleted: "Completed",
      reviewRequired: "Required",
      reviewedHint: "This exact version has been reviewed. Any further edit voids the review.",
      reviewNeededHint:
        "Press material must be read and signed off by a person before it can be exported.",
      recording: "Recording...",
      markReviewComplete: "Mark review complete",
      approving: "Approving...",
      approveDraft: "Approve draft",
      lockedScheduled:
        "Scheduled draft: adjust it here, then Approve draft (or approve it in the Review inbox) before export or versioning.",
      lockedGuardian: "Export and versioning are locked until the Guardian passes.",
      spokespersonNotes: "Spokesperson notes",
      internal: "Internal",
      doNotSay: (text) => `Do not say: ${text}`,
      chartsBuilt: (n) => `${n} chart${n > 1 ? "s" : ""} built from governed series.`,

      editWithAgent: "Edit with the agent",
      expand: "Expand",
      collapse: "Collapse",
      rePrefix: (snippet) => `Re: "${snippet}"`,
      recomposing: "Re-composing under governance...",
      selectedPassage: (snippet) => `Selected passage: "${snippet}"`,
      clear: "Clear",
      refineLabelSelection: "What should change in this passage?",
      refineLabelDefault: "Ask for a change",
      refinePlaceholder: "e.g. Tighten the B2B section and add the dividend figure",
      sendInstruction: "Send edit instruction",
      startNewBrief: "Start a new brief",

      canvas: {
        editBlock: "EDIT",
        lockedBlock: "Locked",
        lockedBlockHint: "Corporate asset — the agent cannot edit this block.",
        blockTypeLabels: {
          umbrella: "Umbrella message",
          key_message: "Key message",
          headline: "Headline",
          lead: "Standfirst",
          body: "Body paragraph",
          quote: "Executive quote",
          boilerplate: "Boilerplate",
          contact: "Press contact",
          qa: "Q&A",
          summary: "Executive summary",
        },
        blockPanelContext: "Block editor",
        contentLabel: "Block content",
        improveWithAgent: "IMPROVE WITH THE AGENT",
        genericShorten: "Shorten",
        genericSharpen: "Sharpen",
        genericFixTone: "Fix tone",
        genericRetune: "Retune audience",
        describeChange: "Or describe the change",
        describePlaceholder: "e.g. use the Q1 figure instead of Q4",
        improveButton: "Improve",
        improving: "Improving under governance...",
        reset: "Reset",
        save: "Save",
        close: "Close",
        suggestionsLoading: "Reading corpus state...",
        editApplied: "Edit applied — only this block changed.",
        editBlocked: "Brand Guardian blocked this edit. Nothing was applied.",
        editNoChange: "No governed source supports that change — block left unchanged.",
        editFailed: "The edit could not be completed.",
        sourcesPaneTitle: "Sources",
        sourcesPaneEmpty: "No cited sources yet.",
        backToDocument: "Back to document",
      },
    },

    dialogs: {
      tabCompose: "Compose",
      tabScheduled: "Scheduled",
      tabInbox: "Review inbox",
      tabVersions: "Versions",
      notifications: "Notifications",
      notificationsUnread: (n) => `Notifications, ${n} unread`,

      noEvidenceTitle: "No governed evidence",
      permissionRestrictedTitle: "Permission restricted",
      adjustBrief: "Adjust the brief",

      notificationsTitle: "Notifications",
      notificationsDesc: "Scheduled drafts arriving for review and approvals as they happen.",
      notificationsEmpty:
        "Nothing yet. Run a schedule and its drafts will announce themselves here.",
      notifApproved: "Approved",
      notifReady: "Ready for review",
      openInbox: "Open inbox",

      citationSubtitle: (id) => `Citation [${id}]`,
      extractedSnippet: "Extracted snippet",
      version: "Version",
      owner: "Owner",
      confidence: "Confidence",

      assetsTitle: "Governed assets",
      assetsDesc: "Approved claims, quotes, boilerplate and disclaimers available to the engine.",
      approvedClaims: "Approved claims",
      approvedQuotes: "Approved quotes",
      disclaimers: "Disclaimers",
      glossary: "Glossary",

      scheduledTitle: "Scheduled documents",
      scheduledBlurb:
        "Recurring briefs run under the owner's clearance and land in the review inbox for a human approval gate before anyone can export them.",
      newSchedule: "New schedule",
      scheduleNameLabel: "Schedule name",
      scheduleNamePlaceholder: "e.g. Weekly brand pulse",
      shapeLabel: "Shape",
      standingBriefLabel: "Standing brief",
      standingBriefPlaceholder: "e.g. Weekly readout of Transform & Grow progress",
      frequencyLabel: "Frequency",
      audienceLabel: "Audience",
      audienceInternal: "Internal",
      audienceExternal: "External",
      ownerClearanceLabel: "Owner (runs under this clearance)",
      ownerLabel: "Owner",
      reviewFolderLabel: "Review folder",
      reviewFolderPlaceholder: "e.g. Brand pulse",
      queriesLabel: "Governed source queries (optional, one per line)",
      queriesPlaceholder: "e.g. Transform & Grow KPI targets\nCustomer NPS trend",
      queriesHelper:
        "Each recurring run retrieves against these governed queries in addition to the standing brief.",
      axesLabel: "Strategic axes (optional)",
      createSchedule: "Create schedule",
      noSchedules: "No schedules yet.",
      sourcesPrefix: (list) => `Sources: ${list}`,
      ownerPrefix: (owner) => `Owner: ${owner}`,
      lastRun: (when) => ` • Last run ${when}`,
      neverRun: " • Never run",
      nextRun: (when) => ` • Next automatic run ${when}`,
      runNow: "Run now",
      deliveryLog: "Delivery log",
      deliveryLogBlurb:
        "When a scheduled run lands in the review inbox, the Hub records a simulated Teams message and email to the schedule owner. No real message leaves the system.",
      noDeliveries: "No deliveries yet — they appear here after a scheduled run completes.",
      deliveryMeta: (recipient, schedule, when) => `To ${recipient} • ${schedule} • ${when}`,

      inboxTitle: "Review inbox",
      inboxBlurb:
        "Scheduled drafts wait here for a human approval gate. Approval requires a passing Brand Guardian verdict.",
      inboxEmpty: "The inbox is empty. Run a schedule to populate it.",
      approved: "Approved",
      pending: "Pending",
      published: "Published",
      guardianCleared: "Guardian cleared",
      guardianBlocked: "Guardian blocked",
      open: "Open",
      approve: "Approve",
      publishing: "Publishing",
      publishToCorpus: "Publish to corpus",
      publishSuccess: ({ docId, version, chunks, superseded }) =>
        `Published to the knowledge core as ${docId} (v${version}, ${chunks} chunk${chunks === 1 ? "" : "s"})${superseded ? `. Supersedes ${superseded}` : ""}. It is now retrievable and citable in Ask.`,
      publishError: "The draft could not be published to the knowledge core.",

      versionsTitle: "Saved versions",
      versionsBlurb:
        "In-memory version history of Guardian-cleared documents. Resets when the server restarts.",
      noVersions: "No versions saved yet.",
      versionMeta: (savedBy, when, owner) => `Saved by ${savedBy} • ${when} • Owner ${owner}`,
    },
  },
  ES: {
    form: {
      title: "Genera un documento gobernado",
      subtitle:
        "Un motor, tres formatos. Cada afirmación se cita del corpus gobernado, y el Brand Guardian debe aprobarla antes de exportar.",
      modeStructured: "Brief estructurado",
      modeGuided: "Chat guiado",

      nlPanelTitle: "Describe lo que necesitas y el motor sugiere una configuración",
      nlLabel: "¿Qué necesitas?",
      nlPlaceholder:
        "p. ej. Un anuncio externo de los resultados del Q1 para la prensa, citando al CEO",
      nlThinking: "Pensando...",
      nlSuggest: "Sugerir una configuración",
      nlUse: "Usar esta configuración",
      nlDismiss: "Descartar",

      shapes: {
        messaging: {
          name: "Casa de mensajes",
          blurb: "Mensaje paraguas y puntos de prueba por eje para la alineación interna.",
        },
        press: {
          name: "Nota de prensa + Q&A",
          blurb: "Anuncio externo con una línea de contención de Q&A on the record.",
        },
        multiformat: {
          name: "Pack multiformato",
          blurb: "Una narrativa gobernada, varios cortes listos para cada canal.",
        },
      },

      briefLabel: "Brief",
      briefPlaceholder:
        "p. ej. Lectura de resultados del Q1 2026 para la reunión interna de liderazgo, cubriendo Transform & Grow",

      kpiPanelAttached: (summary) => `Panel de KPI adjunto: ${summary}`,
      kpiRange: (from, to) => `${from} a ${to}`,
      kpiHelper:
        "Las cifras de KPI gobernadas para esta selección se recalcularán e inyectarán en el informe.",

      askAttached: "Respuesta de Preguntar adjunta",
      askDetach: "Quitar",
      askConflict: "Fuentes en conflicto",
      askHistoric: "Fuente histórica",
      askLowConfidence: "Confianza baja",
      askCitedSources: "Fuentes citadas",
      askRecheckHelper:
        "El motor volverá a verificar cada fuente citada según tu perfil actual y el destino antes de redactar; todo lo que ya no puedas acceder se excluye y se informa.",

      audienceLabel: "Audiencia",
      audienceInternal: "Interna",
      audienceExternal: "Externa",
      audienceExternalHelper:
        "El destino externo limita las fuentes a material público antes de la recuperación.",

      languageLabel: "Idioma",
      languageOptions: { en: "Inglés", es: "Español", de: "Alemán", pt: "Portugués" },

      confidentialityLabel: "Confidencialidad del destino",
      confidentialityOptions: {
        public: "Público",
        private: "Privado",
        confidential: "Confidencial",
        off_the_record: "Off the record",
      },
      confidentialityExternalHelper:
        "El trabajo externo se limita a público y no puede elevarse aquí.",

      formatLabel: "Formato",
      formatOptions: {
        messaging_house: "Casa de mensajes",
        talking_points: "Argumentario",
        leadership_brief: "Brief de liderazgo",
        press_release: "Nota de prensa",
        qa_holding_line: "Línea de contención Q&A",
        media_statement: "Declaración a medios",
        multichannel_pack: "Pack multicanal",
        social_pack: "Pack social",
        email_and_web: "Correo y web",
      },

      spokespersonLabel: "Portavoz (opcional)",
      spokespersonField: "Portavoz",
      spokespersonPlaceholder: "p. ej. María García, Directora de Comunicación",
      spokespersonHelper: "Las citas y notas del portavoz se atribuyen a esta persona.",

      eventDateLabel: "Fecha del evento (opcional)",
      eventDateField: "Fecha del evento",
      eventDatePlaceholder: "p. ej. 12 de mayo de 2026",
      eventDateHelper: "La fecha en que tiene lugar el anuncio o el evento.",

      axesLabel: "Ejes estratégicos (opcional)",

      attachmentsTitle: "Adjuntos del brief (opcional)",
      attachmentsTextLabel: "Brief o datos pegados",
      attachmentsTextPlaceholder:
        "Pega un brief existente, notas o cifras que el motor deba conocer",
      attachmentsLinksLabel: "Enlaces de fuentes (uno por línea)",
      attachmentsLinksPlaceholder: "p. ej. https://intranet.telefonica.com/brand/q1-brief",
      attachmentsHelper:
        "Los adjuntos se entregan al motor solo como contexto de fondo. Nunca se citan ni entran en la evidencia gobernada — solo las fuentes aprobadas del corpus respaldan las afirmaciones del borrador.",

      followUpTitle: "Una cosa rápida",
      followUpLabel: "Detalle que falta",
      followUpPlaceholder:
        "Añade el detalle que falta para que el borrador se enfoque correctamente (opcional)",
      followUpGenerate: "Generar con esto",
      followUpSkip: "Omitir",
      followUpQuestions: {
        messaging: "¿Cuál es el mensaje clave único que quieres que cale?",
        press: "¿Qué anunciamos exactamente — el gancho de la noticia en una línea?",
        multiformat: "¿Cuál es el mensaje central y qué canal importa más?",
      },

      generateDraft: "Generar borrador",
    },

    chat: {
      title: "Brief guiado",
      subtitle: "Unas pocas preguntas y el formulario se rellena por ti.",
      initialQuestion:
        "¿Qué necesitas producir? Describe el documento con tus propias palabras — el formato, el tema, para quién es, el idioma, cualquier portavoz y la fecha del evento.",
      thinking: "Averiguando qué falta todavía...",
      answerLabel: "Tu respuesta",
      answerPlaceholder: "Escribe tu respuesta",
      sendAnswer: "Enviar respuesta",
    },

    editor: {
      audience: { internal: "Interna", external: "Externa" },
      validity: { approved: "Aprobado", historic: "Histórico", expired: "Caducado" },
      frequency: { daily: "Diario", weekly: "Semanal", monthly: "Mensual" },
      channel: { teams: "Teams", email: "Correo" },
      severity: { error: "Error", warning: "Advertencia" },

      guardianName: "Brand Guardian",
      guardianCleared: "Aprobado para exportar",
      guardianBlocked: "Exportación bloqueada",
      fixPrefix: "Corrección:",

      internalOnly: "Solo interno",
      sectionBodyAria: (heading) => `Cuerpo de la sección: ${heading}`,
      answerAria: (question) => `Respuesta: ${question}`,
      validUntil: (date) => `válido hasta ${date}`,
      noGovernedSource:
        "No cubierto por material aprobado — esta respuesta no tiene una fuente gobernada.",
      internalNoteLabel: "Nota interna",
      internalNotePlaceholder: "Contexto de trabajo para esta respuesta — nunca se exporta externamente",
      saveNote: "Guardar nota",
      cancel: "Cancelar",
      internalNotExportable: "Interno — no exportable",
      editNote: "Editar nota",
      remove: "Eliminar",
      addInternalNote: "Añadir nota interna",

      historicDefault: "Este borrador se basa en material histórico.",
      askFlaggedTitle: "Iniciado desde una respuesta de Preguntar con evidencia marcada",
      sourcesConflict: "Fuentes en conflicto",
      lowConfidence: "Confianza baja",
      historicSource: "Fuente histórica",
      umbrellaMessage: "Mensaje paraguas",
      evidenceAndCitations: "Evidencia y citas",

      exclusionsTitle: "Fuentes excluidas por gobernanza",
      exclusionsBlurb:
        "Se aplican dos filtros antes de que algo llegue al motor: tu autorización y luego la confidencialidad del destino de este documento.",
      reasonClearance: "Tu autorización",
      reasonDestination: "Destino",

      pipelineRefineTitle: "Refinando bajo gobernanza",
      pipelineGenerateTitle: "Componiendo a partir de evidencia gobernada",
      pipelineSubtitle:
        "Solo fuentes filtradas por permisos. Cada afirmación se cita antes de llegar a ti.",
      pipelineRefineSteps: {
        retrieving: "Reverificando evidencia gobernada",
        composing: "Aplicando tu refinamiento con citas",
        guardian: "Brand Guardian reverificando afirmaciones y tono",
      },
      pipelineGenerateSteps: {
        retrieving: "Recuperando evidencia gobernada",
        composing: "Componiendo el documento con citas",
        guardian: "Brand Guardian verificando afirmaciones y tono",
      },

      refineAppliedPass:
        "Aplicado. Todas las afirmaciones se han vuelto a citar y el Brand Guardian aprobó la revisión.",
      refineAppliedFlagged:
        "Aplicado, pero el Brand Guardian marcó la revisión — revisa los hallazgos antes de exportar.",
      refineFailed: "El Hub no pudo aplicar ese cambio.",
      exportReviewRequiredError:
        "El material de prensa necesita una revisión editorial completada antes de poder exportarse. Marca la revisión abajo y vuelve a exportar.",
      exportRefusedError:
        "La exportación fue rechazada. Revisa el veredicto del Guardian e inténtalo de nuevo.",

      saveVersion: "Guardar versión",
      assets: "Activos",
      liveEditHint:
        "El documento está en vivo — haz clic en cualquier parte para editar. El Guardian vuelve a verificar mientras escribes.",
      exportHeading: "Exportar",
      formatLabel: "Formato",
      exporting: "Exportando...",
      exportButton: "Exportar",
      exportPack: "Descargar pack (ZIP)",
      exportingPack: "Creando pack...",
      editorialReview: "Revisión editorial",
      reviewCompleted: "Completada",
      reviewRequired: "Requerida",
      reviewedHint: "Esta versión exacta ha sido revisada. Cualquier edición adicional anula la revisión.",
      reviewNeededHint:
        "El material de prensa debe ser leído y aprobado por una persona antes de poder exportarse.",
      recording: "Registrando...",
      markReviewComplete: "Marcar revisión como completa",
      approving: "Aprobando...",
      approveDraft: "Aprobar borrador",
      lockedScheduled:
        "Borrador programado: ajústalo aquí y luego Aprobar borrador (o apruébalo en la bandeja de revisión) antes de exportar o versionar.",
      lockedGuardian: "La exportación y el versionado están bloqueados hasta que el Guardian apruebe.",
      spokespersonNotes: "Notas del portavoz",
      internal: "Interno",
      doNotSay: (text) => `No decir: ${text}`,
      chartsBuilt: (n) =>
        `${n} gráfico${n > 1 ? "s" : ""} creado${n > 1 ? "s" : ""} a partir de series gobernadas.`,

      editWithAgent: "Editar con el agente",
      expand: "Expandir",
      collapse: "Contraer",
      rePrefix: (snippet) => `Re: "${snippet}"`,
      recomposing: "Recomponiendo bajo gobernanza...",
      selectedPassage: (snippet) => `Pasaje seleccionado: "${snippet}"`,
      clear: "Borrar",
      refineLabelSelection: "¿Qué debería cambiar en este pasaje?",
      refineLabelDefault: "Pide un cambio",
      refinePlaceholder: "p. ej. Ajusta la sección B2B y añade la cifra del dividendo",
      sendInstruction: "Enviar instrucción de edición",
      startNewBrief: "Empezar un nuevo brief",

      canvas: {
        editBlock: "EDITAR",
        lockedBlock: "Bloqueado",
        lockedBlockHint: "Activo corporativo — el agente no puede editar este bloque.",
        blockTypeLabels: {
          umbrella: "Mensaje paraguas",
          key_message: "Mensaje clave",
          headline: "Titular",
          lead: "Entradilla",
          body: "Párrafo de cuerpo",
          quote: "Cita del directivo",
          boilerplate: "Boilerplate",
          contact: "Contacto de prensa",
          qa: "Preguntas y respuestas",
          summary: "Resumen ejecutivo",
        },
        blockPanelContext: "Editor de bloque",
        contentLabel: "Contenido del bloque",
        improveWithAgent: "MEJORAR CON EL AGENTE",
        genericShorten: "Acortar",
        genericSharpen: "Afinar",
        genericFixTone: "Ajustar el tono",
        genericRetune: "Adaptar a la audiencia",
        describeChange: "O describe el cambio",
        describePlaceholder: "p. ej. usa la cifra del Q1 en vez de la del Q4",
        improveButton: "Mejorar",
        improving: "Mejorando bajo gobernanza...",
        reset: "Restablecer",
        save: "Guardar",
        close: "Cerrar",
        suggestionsLoading: "Leyendo el estado del corpus...",
        editApplied: "Cambio aplicado — solo ha cambiado este bloque.",
        editBlocked: "El Brand Guardian ha bloqueado este cambio. No se ha aplicado nada.",
        editNoChange: "Ninguna fuente gobernada respalda ese cambio — el bloque no se ha modificado.",
        editFailed: "No se ha podido completar el cambio.",
        sourcesPaneTitle: "Fuentes",
        sourcesPaneEmpty: "Aún no hay fuentes citadas.",
        backToDocument: "Volver al documento",
      },
    },

    dialogs: {
      tabCompose: "Componer",
      tabScheduled: "Programados",
      tabInbox: "Bandeja de revisión",
      tabVersions: "Versiones",
      notifications: "Notificaciones",
      notificationsUnread: (n) => `Notificaciones, ${n} sin leer`,

      noEvidenceTitle: "Sin evidencia gobernada",
      permissionRestrictedTitle: "Permiso restringido",
      adjustBrief: "Ajustar el brief",

      notificationsTitle: "Notificaciones",
      notificationsDesc:
        "Borradores programados que llegan para revisión y aprobaciones a medida que ocurren.",
      notificationsEmpty:
        "Nada todavía. Ejecuta una programación y sus borradores se anunciarán aquí.",
      notifApproved: "Aprobado",
      notifReady: "Listo para revisar",
      openInbox: "Abrir bandeja",

      citationSubtitle: (id) => `Cita [${id}]`,
      extractedSnippet: "Fragmento extraído",
      version: "Versión",
      owner: "Propietario",
      confidence: "Confianza",

      assetsTitle: "Activos gobernados",
      assetsDesc:
        "Afirmaciones, citas, boilerplate y descargos aprobados disponibles para el motor.",
      approvedClaims: "Afirmaciones aprobadas",
      approvedQuotes: "Citas aprobadas",
      disclaimers: "Descargos de responsabilidad",
      glossary: "Glosario",

      scheduledTitle: "Documentos programados",
      scheduledBlurb:
        "Los briefs recurrentes se ejecutan bajo la autorización del propietario y llegan a la bandeja de revisión para una aprobación humana antes de que nadie pueda exportarlos.",
      newSchedule: "Nueva programación",
      scheduleNameLabel: "Nombre de la programación",
      scheduleNamePlaceholder: "p. ej. Pulso de marca semanal",
      shapeLabel: "Formato",
      standingBriefLabel: "Brief permanente",
      standingBriefPlaceholder: "p. ej. Lectura semanal del progreso de Transform & Grow",
      frequencyLabel: "Frecuencia",
      audienceLabel: "Audiencia",
      audienceInternal: "Interna",
      audienceExternal: "Externa",
      ownerClearanceLabel: "Propietario (se ejecuta bajo esta autorización)",
      ownerLabel: "Propietario",
      reviewFolderLabel: "Carpeta de revisión",
      reviewFolderPlaceholder: "p. ej. Pulso de marca",
      queriesLabel: "Consultas de fuentes gobernadas (opcional, una por línea)",
      queriesPlaceholder: "p. ej. Objetivos de KPI de Transform & Grow\nTendencia del NPS de clientes",
      queriesHelper:
        "Cada ejecución recurrente recupera contra estas consultas gobernadas además del brief permanente.",
      axesLabel: "Ejes estratégicos (opcional)",
      createSchedule: "Crear programación",
      noSchedules: "Aún no hay programaciones.",
      sourcesPrefix: (list) => `Fuentes: ${list}`,
      ownerPrefix: (owner) => `Propietario: ${owner}`,
      lastRun: (when) => ` • Última ejecución ${when}`,
      neverRun: " • Nunca ejecutado",
      nextRun: (when) => ` • Próxima ejecución automática ${when}`,
      runNow: "Ejecutar ahora",
      deliveryLog: "Registro de entregas",
      deliveryLogBlurb:
        "Cuando una ejecución programada llega a la bandeja de revisión, el Hub registra un mensaje de Teams y un correo simulados al propietario de la programación. Ningún mensaje real sale del sistema.",
      noDeliveries:
        "Aún no hay entregas — aparecen aquí después de que se complete una ejecución programada.",
      deliveryMeta: (recipient, schedule, when) => `Para ${recipient} • ${schedule} • ${when}`,

      inboxTitle: "Bandeja de revisión",
      inboxBlurb:
        "Los borradores programados esperan aquí una aprobación humana. La aprobación requiere un veredicto favorable del Brand Guardian.",
      inboxEmpty: "La bandeja está vacía. Ejecuta una programación para poblarla.",
      approved: "Aprobado",
      pending: "Pendiente",
      published: "Publicado",
      guardianCleared: "Guardian aprobó",
      guardianBlocked: "Guardian bloqueó",
      open: "Abrir",
      approve: "Aprobar",
      publishing: "Publicando",
      publishToCorpus: "Publicar al corpus",
      publishSuccess: ({ docId, version, chunks, superseded }) =>
        `Publicado en el núcleo de conocimiento como ${docId} (v${version}, ${chunks} fragmento${chunks === 1 ? "" : "s"})${superseded ? `. Reemplaza a ${superseded}` : ""}. Ahora es recuperable y citable en Preguntar.`,
      publishError: "El borrador no pudo publicarse en el núcleo de conocimiento.",

      versionsTitle: "Versiones guardadas",
      versionsBlurb:
        "Historial de versiones en memoria de documentos aprobados por el Guardian. Se reinicia cuando el servidor se reinicia.",
      noVersions: "Aún no hay versiones guardadas.",
      versionMeta: (savedBy, when, owner) =>
        `Guardado por ${savedBy} • ${when} • Propietario ${owner}`,
    },
  },
  DE: {
    form: {
      title: "Ein kontrolliertes Dokument erstellen",
      subtitle:
        "Eine Engine, drei Formate. Jede Aussage wird aus dem kontrollierten Korpus zitiert, und der Brand Guardian muss sie vor dem Export freigeben.",
      modeStructured: "Strukturiertes Briefing",
      modeGuided: "Geführter Chat",

      nlPanelTitle: "Beschreiben Sie, was Sie brauchen, und die Engine schlägt eine Konfiguration vor",
      nlLabel: "Was brauchen Sie?",
      nlPlaceholder:
        "z. B. Eine externe Ankündigung der Q1-Ergebnisse für die Presse, mit Zitat des CEO",
      nlThinking: "Denke nach...",
      nlSuggest: "Konfiguration vorschlagen",
      nlUse: "Diese Konfiguration verwenden",
      nlDismiss: "Verwerfen",

      shapes: {
        messaging: {
          name: "Messaging-House",
          blurb: "Übergreifende Botschaft und Belegpunkte je Achse für die interne Ausrichtung.",
        },
        press: {
          name: "Pressemitteilung + Q&A",
          blurb: "Externe Ankündigung mit einer offiziellen Q&A-Sprachregelung.",
        },
        multiformat: {
          name: "Multiformat-Paket",
          blurb: "Ein kontrolliertes Narrativ, mehrere kanalfertige Zuschnitte.",
        },
      },

      briefLabel: "Briefing",
      briefPlaceholder:
        "z. B. Ergebnisbericht Q1 2026 für den internen Führungscall, mit Transform & Grow",

      kpiPanelAttached: (summary) => `KPI-Panel angehängt: ${summary}`,
      kpiRange: (from, to) => `${from} bis ${to}`,
      kpiHelper:
        "Die kontrollierten KPI-Werte für diese Auswahl werden neu berechnet und in den Bericht eingefügt.",

      askAttached: "Fragen-Antwort angehängt",
      askDetach: "Lösen",
      askConflict: "Quellen widersprechen sich",
      askHistoric: "Historische Quelle",
      askLowConfidence: "Geringe Konfidenz",
      askCitedSources: "Zitierte Quellen",
      askRecheckHelper:
        "Die Engine prüft vor dem Entwurf jede zitierte Quelle erneut anhand Ihrer aktuellen Rolle und des Ziels; alles, worauf Sie keinen Zugriff mehr haben, wird ausgeschlossen und gemeldet.",

      audienceLabel: "Zielgruppe",
      audienceInternal: "Intern",
      audienceExternal: "Extern",
      audienceExternalHelper:
        "Extern begrenzt die Quellen vor dem Abruf auf öffentliches Material.",

      languageLabel: "Sprache",
      languageOptions: { en: "Englisch", es: "Spanisch", de: "Deutsch", pt: "Portugiesisch" },

      confidentialityLabel: "Vertraulichkeit des Ziels",
      confidentialityOptions: {
        public: "Öffentlich",
        private: "Privat",
        confidential: "Vertraulich",
        off_the_record: "Off the record",
      },
      confidentialityExternalHelper:
        "Externe Arbeit ist auf öffentlich beschränkt und kann hier nicht höhergestuft werden.",

      formatLabel: "Format",
      formatOptions: {
        messaging_house: "Messaging-House",
        talking_points: "Sprechpunkte",
        leadership_brief: "Führungs-Briefing",
        press_release: "Pressemitteilung",
        qa_holding_line: "Q&A-Sprachregelung",
        media_statement: "Medienerklärung",
        multichannel_pack: "Multichannel-Paket",
        social_pack: "Social-Paket",
        email_and_web: "E-Mail und Web",
      },

      spokespersonLabel: "Sprecher (optional)",
      spokespersonField: "Sprecher",
      spokespersonPlaceholder: "z. B. María García, Leiterin Unternehmenskommunikation",
      spokespersonHelper: "Zitate und Sprecherhinweise werden dieser Person zugeschrieben.",

      eventDateLabel: "Ereignisdatum (optional)",
      eventDateField: "Ereignisdatum",
      eventDatePlaceholder: "z. B. 12. Mai 2026",
      eventDateHelper: "Das Datum, an dem die Ankündigung oder das Ereignis stattfindet.",

      axesLabel: "Strategische Achsen (optional)",

      attachmentsTitle: "Briefing-Anhänge (optional)",
      attachmentsTextLabel: "Eingefügtes Briefing oder Daten",
      attachmentsTextPlaceholder:
        "Fügen Sie ein bestehendes Briefing, Notizen oder Zahlen ein, die die Engine kennen sollte",
      attachmentsLinksLabel: "Quelllinks (einer pro Zeile)",
      attachmentsLinksPlaceholder: "z. B. https://intranet.telefonica.com/brand/q1-brief",
      attachmentsHelper:
        "Anhänge werden der Engine nur als Hintergrundkontext übergeben. Sie werden nie zitiert und gelangen nie in die kontrollierten Belege — nur freigegebene Korpusquellen stützen die Aussagen des Entwurfs.",

      followUpTitle: "Eine kurze Sache",
      followUpLabel: "Fehlendes Detail",
      followUpPlaceholder:
        "Ergänzen Sie das fehlende Detail, damit der Entwurf korrekt ausgerichtet ist (optional)",
      followUpGenerate: "Damit generieren",
      followUpSkip: "Überspringen",
      followUpQuestions: {
        messaging: "Was ist die eine Kernbotschaft, die ankommen soll?",
        press: "Was genau kündigen wir an — der Nachrichtenaufhänger in einer Zeile?",
        multiformat: "Was ist die Kernbotschaft, und welcher Kanal ist am wichtigsten?",
      },

      generateDraft: "Entwurf generieren",
    },

    chat: {
      title: "Geführtes Briefing",
      subtitle: "Ein paar Fragen, dann wird das Formular für Sie ausgefüllt.",
      initialQuestion:
        "Was möchten Sie erstellen? Beschreiben Sie das Dokument in Ihren eigenen Worten — das Format, das Thema, für wen es bestimmt ist, die Sprache, einen möglichen Sprecher und das Ereignisdatum.",
      thinking: "Ermittele, was noch fehlt...",
      answerLabel: "Ihre Antwort",
      answerPlaceholder: "Geben Sie Ihre Antwort ein",
      sendAnswer: "Antwort senden",
    },

    editor: {
      audience: { internal: "Intern", external: "Extern" },
      validity: { approved: "Freigegeben", historic: "Historisch", expired: "Abgelaufen" },
      frequency: { daily: "Täglich", weekly: "Wöchentlich", monthly: "Monatlich" },
      channel: { teams: "Teams", email: "E-Mail" },
      severity: { error: "Fehler", warning: "Warnung" },

      guardianName: "Brand Guardian",
      guardianCleared: "Für Export freigegeben",
      guardianBlocked: "Export blockiert",
      fixPrefix: "Korrektur:",

      internalOnly: "Nur intern",
      sectionBodyAria: (heading) => `Abschnittstext: ${heading}`,
      answerAria: (question) => `Antwort: ${question}`,
      validUntil: (date) => `gültig bis ${date}`,
      noGovernedSource:
        "Nicht durch freigegebenes Material abgedeckt — diese Antwort hat keine kontrollierte Quelle.",
      internalNoteLabel: "Interne Notiz",
      internalNotePlaceholder: "Arbeitskontext für diese Antwort — wird nie extern exportiert",
      saveNote: "Notiz speichern",
      cancel: "Abbrechen",
      internalNotExportable: "Intern — nicht exportierbar",
      editNote: "Notiz bearbeiten",
      remove: "Entfernen",
      addInternalNote: "Interne Notiz hinzufügen",

      historicDefault: "Dieser Entwurf stützt sich auf historisches Material.",
      askFlaggedTitle: "Ausgehend von einer Fragen-Antwort mit markierten Belegen",
      sourcesConflict: "Quellen widersprechen sich",
      lowConfidence: "Geringe Konfidenz",
      historicSource: "Historische Quelle",
      umbrellaMessage: "Übergreifende Botschaft",
      evidenceAndCitations: "Belege und Zitate",

      exclusionsTitle: "Durch Governance ausgeschlossene Quellen",
      exclusionsBlurb:
        "Zwei Filter laufen, bevor etwas die Engine erreicht: Ihre Berechtigung, dann die Ziel-Vertraulichkeit dieses Dokuments.",
      reasonClearance: "Ihre Berechtigung",
      reasonDestination: "Ziel",

      pipelineRefineTitle: "Verfeinerung unter Governance",
      pipelineGenerateTitle: "Erstellung aus kontrollierten Belegen",
      pipelineSubtitle:
        "Nur berechtigungsgefilterte Quellen. Jede Aussage wird zitiert, bevor sie Sie erreicht.",
      pipelineRefineSteps: {
        retrieving: "Kontrollierte Belege werden erneut geprüft",
        composing: "Ihre Verfeinerung wird mit Zitaten angewendet",
        guardian: "Brand Guardian prüft Aussagen und Ton erneut",
      },
      pipelineGenerateSteps: {
        retrieving: "Kontrollierte Belege werden abgerufen",
        composing: "Das Dokument wird mit Zitaten erstellt",
        guardian: "Brand Guardian prüft Aussagen und Ton",
      },

      refineAppliedPass:
        "Angewendet. Alle Aussagen wurden neu zitiert und der Brand Guardian hat die Überarbeitung freigegeben.",
      refineAppliedFlagged:
        "Angewendet, aber der Brand Guardian hat die Überarbeitung markiert — prüfen Sie die Befunde vor dem Export.",
      refineFailed: "Der Hub konnte diese Änderung nicht anwenden.",
      exportReviewRequiredError:
        "Pressematerial benötigt eine abgeschlossene redaktionelle Prüfung, bevor es exportiert werden kann. Markieren Sie die Prüfung unten und exportieren Sie erneut.",
      exportRefusedError:
        "Der Export wurde abgelehnt. Prüfen Sie das Guardian-Urteil und versuchen Sie es erneut.",

      saveVersion: "Version speichern",
      assets: "Assets",
      liveEditHint:
        "Das Dokument ist live — klicken Sie an eine beliebige Stelle, um zu bearbeiten. Der Guardian prüft erneut, während Sie tippen.",
      exportHeading: "Export",
      formatLabel: "Format",
      exporting: "Exportiere...",
      exportButton: "Exportieren",
      exportPack: "Paket herunterladen (ZIP)",
      exportingPack: "Paket wird erstellt...",
      editorialReview: "Redaktionelle Prüfung",
      reviewCompleted: "Abgeschlossen",
      reviewRequired: "Erforderlich",
      reviewedHint: "Genau diese Version wurde geprüft. Jede weitere Bearbeitung hebt die Prüfung auf.",
      reviewNeededHint:
        "Pressematerial muss von einer Person gelesen und freigegeben werden, bevor es exportiert werden kann.",
      recording: "Wird erfasst...",
      markReviewComplete: "Prüfung als abgeschlossen markieren",
      approving: "Wird genehmigt...",
      approveDraft: "Entwurf genehmigen",
      lockedScheduled:
        "Geplanter Entwurf: Passen Sie ihn hier an, dann Entwurf genehmigen (oder im Prüfeingang genehmigen), bevor Sie exportieren oder versionieren.",
      lockedGuardian: "Export und Versionierung sind gesperrt, bis der Guardian freigibt.",
      spokespersonNotes: "Sprecherhinweise",
      internal: "Intern",
      doNotSay: (text) => `Nicht sagen: ${text}`,
      chartsBuilt: (n) => `${n} Diagramm${n > 1 ? "e" : ""} aus kontrollierten Reihen erstellt.`,

      editWithAgent: "Mit dem Agenten bearbeiten",
      expand: "Ausklappen",
      collapse: "Einklappen",
      rePrefix: (snippet) => `Betr.: "${snippet}"`,
      recomposing: "Neuerstellung unter Governance...",
      selectedPassage: (snippet) => `Ausgewählte Passage: "${snippet}"`,
      clear: "Löschen",
      refineLabelSelection: "Was soll sich in dieser Passage ändern?",
      refineLabelDefault: "Um eine Änderung bitten",
      refinePlaceholder: "z. B. Straffen Sie den B2B-Abschnitt und ergänzen Sie die Dividendenzahl",
      sendInstruction: "Bearbeitungsanweisung senden",
      startNewBrief: "Ein neues Briefing beginnen",

      canvas: {
        editBlock: "BEARBEITEN",
        lockedBlock: "Gesperrt",
        lockedBlockHint: "Corporate-Asset — der Agent kann diesen Block nicht bearbeiten.",
        blockTypeLabels: {
          umbrella: "Dachbotschaft",
          key_message: "Kernbotschaft",
          headline: "Überschrift",
          lead: "Vorspann",
          body: "Textabsatz",
          quote: "Zitat der Führungskraft",
          boilerplate: "Boilerplate",
          contact: "Pressekontakt",
          qa: "Fragen und Antworten",
          summary: "Executive Summary",
        },
        blockPanelContext: "Block-Editor",
        contentLabel: "Blockinhalt",
        improveWithAgent: "MIT DEM AGENTEN VERBESSERN",
        genericShorten: "Kürzen",
        genericSharpen: "Schärfen",
        genericFixTone: "Tonalität anpassen",
        genericRetune: "Auf Zielgruppe abstimmen",
        describeChange: "Oder beschreibe die Änderung",
        describePlaceholder: "z. B. die Q1-Zahl statt der Q4-Zahl verwenden",
        improveButton: "Verbessern",
        improving: "Wird unter Governance verbessert...",
        reset: "Zurücksetzen",
        save: "Speichern",
        close: "Schließen",
        suggestionsLoading: "Korpusstatus wird gelesen...",
        editApplied: "Änderung übernommen — nur dieser Block wurde geändert.",
        editBlocked: "Der Brand Guardian hat diese Änderung blockiert. Nichts wurde übernommen.",
        editNoChange: "Keine governte Quelle stützt diese Änderung — der Block blieb unverändert.",
        editFailed: "Die Änderung konnte nicht abgeschlossen werden.",
        sourcesPaneTitle: "Quellen",
        sourcesPaneEmpty: "Noch keine zitierten Quellen.",
        backToDocument: "Zurück zum Dokument",
      },
    },

    dialogs: {
      tabCompose: "Verfassen",
      tabScheduled: "Geplant",
      tabInbox: "Prüfeingang",
      tabVersions: "Versionen",
      notifications: "Benachrichtigungen",
      notificationsUnread: (n) => `Benachrichtigungen, ${n} ungelesen`,

      noEvidenceTitle: "Keine kontrollierten Belege",
      permissionRestrictedTitle: "Berechtigung eingeschränkt",
      adjustBrief: "Briefing anpassen",

      notificationsTitle: "Benachrichtigungen",
      notificationsDesc:
        "Geplante Entwürfe, die zur Prüfung eintreffen, und Genehmigungen, sobald sie erfolgen.",
      notificationsEmpty:
        "Noch nichts. Führen Sie eine Planung aus, und ihre Entwürfe melden sich hier.",
      notifApproved: "Genehmigt",
      notifReady: "Bereit zur Prüfung",
      openInbox: "Eingang öffnen",

      citationSubtitle: (id) => `Zitat [${id}]`,
      extractedSnippet: "Extrahierter Ausschnitt",
      version: "Version",
      owner: "Eigentümer",
      confidence: "Konfidenz",

      assetsTitle: "Kontrollierte Assets",
      assetsDesc:
        "Freigegebene Aussagen, Zitate, Textbausteine und Haftungsausschlüsse, die der Engine zur Verfügung stehen.",
      approvedClaims: "Freigegebene Aussagen",
      approvedQuotes: "Freigegebene Zitate",
      disclaimers: "Haftungsausschlüsse",
      glossary: "Glossar",

      scheduledTitle: "Geplante Dokumente",
      scheduledBlurb:
        "Wiederkehrende Briefings laufen unter der Berechtigung des Eigentümers und landen im Prüfeingang für eine menschliche Genehmigung, bevor sie jemand exportieren kann.",
      newSchedule: "Neue Planung",
      scheduleNameLabel: "Name der Planung",
      scheduleNamePlaceholder: "z. B. Wöchentlicher Marken-Puls",
      shapeLabel: "Format",
      standingBriefLabel: "Dauerhaftes Briefing",
      standingBriefPlaceholder: "z. B. Wöchentlicher Bericht zum Fortschritt von Transform & Grow",
      frequencyLabel: "Häufigkeit",
      audienceLabel: "Zielgruppe",
      audienceInternal: "Intern",
      audienceExternal: "Extern",
      ownerClearanceLabel: "Eigentümer (läuft unter dieser Berechtigung)",
      ownerLabel: "Eigentümer",
      reviewFolderLabel: "Prüfordner",
      reviewFolderPlaceholder: "z. B. Marken-Puls",
      queriesLabel: "Kontrollierte Quellabfragen (optional, eine pro Zeile)",
      queriesPlaceholder: "z. B. Transform & Grow KPI-Ziele\nKunden-NPS-Trend",
      queriesHelper:
        "Jeder wiederkehrende Lauf ruft zusätzlich zum dauerhaften Briefing gegen diese kontrollierten Abfragen ab.",
      axesLabel: "Strategische Achsen (optional)",
      createSchedule: "Planung erstellen",
      noSchedules: "Noch keine Planungen.",
      sourcesPrefix: (list) => `Quellen: ${list}`,
      ownerPrefix: (owner) => `Eigentümer: ${owner}`,
      lastRun: (when) => ` • Letzter Lauf ${when}`,
      neverRun: " • Nie ausgeführt",
      nextRun: (when) => ` • Nächster automatischer Lauf ${when}`,
      runNow: "Jetzt ausführen",
      deliveryLog: "Zustellungsprotokoll",
      deliveryLogBlurb:
        "Wenn ein geplanter Lauf im Prüfeingang landet, erfasst der Hub eine simulierte Teams-Nachricht und E-Mail an den Eigentümer der Planung. Keine echte Nachricht verlässt das System.",
      noDeliveries:
        "Noch keine Zustellungen — sie erscheinen hier, nachdem ein geplanter Lauf abgeschlossen ist.",
      deliveryMeta: (recipient, schedule, when) => `An ${recipient} • ${schedule} • ${when}`,

      inboxTitle: "Prüfeingang",
      inboxBlurb:
        "Geplante Entwürfe warten hier auf eine menschliche Genehmigung. Die Genehmigung erfordert ein positives Brand-Guardian-Urteil.",
      inboxEmpty: "Der Eingang ist leer. Führen Sie eine Planung aus, um ihn zu füllen.",
      approved: "Genehmigt",
      pending: "Ausstehend",
      published: "Veröffentlicht",
      guardianCleared: "Guardian freigegeben",
      guardianBlocked: "Guardian blockiert",
      open: "Öffnen",
      approve: "Genehmigen",
      publishing: "Wird veröffentlicht",
      publishToCorpus: "Im Korpus veröffentlichen",
      publishSuccess: ({ docId, version, chunks, superseded }) =>
        `Im Wissenskern veröffentlicht als ${docId} (v${version}, ${chunks} Chunk${chunks === 1 ? "" : "s"})${superseded ? `. Ersetzt ${superseded}` : ""}. Es ist nun in Fragen abrufbar und zitierbar.`,
      publishError: "Der Entwurf konnte nicht im Wissenskern veröffentlicht werden.",

      versionsTitle: "Gespeicherte Versionen",
      versionsBlurb:
        "In-Memory-Versionsverlauf von Guardian-freigegebenen Dokumenten. Wird beim Neustart des Servers zurückgesetzt.",
      noVersions: "Noch keine Versionen gespeichert.",
      versionMeta: (savedBy, when, owner) =>
        `Gespeichert von ${savedBy} • ${when} • Eigentümer ${owner}`,
    },
  },
  PT: {
    form: {
      title: "Gere um documento governado",
      subtitle:
        "Um motor, três formatos. Cada afirmação é citada do corpus governado, e o Brand Guardian deve aprová-la antes da exportação.",
      modeStructured: "Brief estruturado",
      modeGuided: "Chat guiado",

      nlPanelTitle: "Descreva o que você precisa e o motor sugere uma configuração",
      nlLabel: "Do que você precisa?",
      nlPlaceholder:
        "ex.: Um anúncio externo dos resultados do Q1 para a imprensa, citando o CEO",
      nlThinking: "Pensando...",
      nlSuggest: "Sugerir uma configuração",
      nlUse: "Usar esta configuração",
      nlDismiss: "Descartar",

      shapes: {
        messaging: {
          name: "Casa de mensagens",
          blurb: "Mensagem guarda-chuva e pontos de prova por eixo para o alinhamento interno.",
        },
        press: {
          name: "Comunicado de imprensa + Q&A",
          blurb: "Anúncio externo com uma linha de contenção de Q&A oficial.",
        },
        multiformat: {
          name: "Pacote multiformato",
          blurb: "Uma narrativa governada, vários cortes prontos para cada canal.",
        },
      },

      briefLabel: "Brief",
      briefPlaceholder:
        "ex.: Leitura de resultados do Q1 2026 para a reunião interna de liderança, cobrindo Transform & Grow",

      kpiPanelAttached: (summary) => `Painel de KPI anexado: ${summary}`,
      kpiRange: (from, to) => `${from} a ${to}`,
      kpiHelper:
        "Os números de KPI governados para esta seleção serão recalculados e inseridos no relatório.",

      askAttached: "Resposta de Perguntar anexada",
      askDetach: "Remover",
      askConflict: "Fontes em conflito",
      askHistoric: "Fonte histórica",
      askLowConfidence: "Baixa confiança",
      askCitedSources: "Fontes citadas",
      askRecheckHelper:
        "O motor irá reverificar cada fonte citada de acordo com o seu perfil atual e o destino antes de redigir; tudo o que você não puder mais acessar é excluído e reportado.",

      audienceLabel: "Público",
      audienceInternal: "Interno",
      audienceExternal: "Externo",
      audienceExternalHelper:
        "O destino externo limita as fontes a material público antes da recuperação.",

      languageLabel: "Idioma",
      languageOptions: { en: "Inglês", es: "Espanhol", de: "Alemão", pt: "Português" },

      confidentialityLabel: "Confidencialidade do destino",
      confidentialityOptions: {
        public: "Público",
        private: "Privado",
        confidential: "Confidencial",
        off_the_record: "Off the record",
      },
      confidentialityExternalHelper:
        "O trabalho externo é limitado a público e não pode ser elevado aqui.",

      formatLabel: "Formato",
      formatOptions: {
        messaging_house: "Casa de mensagens",
        talking_points: "Argumentos",
        leadership_brief: "Brief de liderança",
        press_release: "Comunicado de imprensa",
        qa_holding_line: "Linha de contenção Q&A",
        media_statement: "Declaração à imprensa",
        multichannel_pack: "Pacote multicanal",
        social_pack: "Pacote social",
        email_and_web: "E-mail e web",
      },

      spokespersonLabel: "Porta-voz (opcional)",
      spokespersonField: "Porta-voz",
      spokespersonPlaceholder: "ex.: María García, Diretora de Comunicação",
      spokespersonHelper: "Citações e notas do porta-voz são atribuídas a esta pessoa.",

      eventDateLabel: "Data do evento (opcional)",
      eventDateField: "Data do evento",
      eventDatePlaceholder: "ex.: 12 de maio de 2026",
      eventDateHelper: "A data em que o anúncio ou evento ocorre.",

      axesLabel: "Eixos estratégicos (opcional)",

      attachmentsTitle: "Anexos do brief (opcional)",
      attachmentsTextLabel: "Brief ou dados colados",
      attachmentsTextPlaceholder:
        "Cole um brief existente, notas ou números que o motor deva conhecer",
      attachmentsLinksLabel: "Links de fontes (um por linha)",
      attachmentsLinksPlaceholder: "ex.: https://intranet.telefonica.com/brand/q1-brief",
      attachmentsHelper:
        "Os anexos são fornecidos ao motor apenas como contexto de fundo. Nunca são citados nem entram na evidência governada — apenas fontes aprovadas do corpus sustentam as afirmações do rascunho.",

      followUpTitle: "Uma coisa rápida",
      followUpLabel: "Detalhe em falta",
      followUpPlaceholder:
        "Adicione o detalhe em falta para que o rascunho seja enquadrado corretamente (opcional)",
      followUpGenerate: "Gerar com isto",
      followUpSkip: "Pular",
      followUpQuestions: {
        messaging: "Qual é a única mensagem-chave que você quer que fique?",
        press: "O que exatamente estamos anunciando — o gancho da notícia em uma linha?",
        multiformat: "Qual é a mensagem central e qual canal importa mais?",
      },

      generateDraft: "Gerar rascunho",
    },

    chat: {
      title: "Brief guiado",
      subtitle: "Algumas perguntas e o formulário é preenchido para você.",
      initialQuestion:
        "O que você precisa produzir? Descreva o documento com suas próprias palavras — o formato, o tema, para quem é, o idioma, qualquer porta-voz e a data do evento.",
      thinking: "Descobrindo o que ainda está faltando...",
      answerLabel: "Sua resposta",
      answerPlaceholder: "Digite sua resposta",
      sendAnswer: "Enviar resposta",
    },

    editor: {
      audience: { internal: "Interno", external: "Externo" },
      validity: { approved: "Aprovado", historic: "Histórico", expired: "Expirado" },
      frequency: { daily: "Diário", weekly: "Semanal", monthly: "Mensal" },
      channel: { teams: "Teams", email: "E-mail" },
      severity: { error: "Erro", warning: "Aviso" },

      guardianName: "Brand Guardian",
      guardianCleared: "Aprovado para exportação",
      guardianBlocked: "Exportação bloqueada",
      fixPrefix: "Correção:",

      internalOnly: "Somente interno",
      sectionBodyAria: (heading) => `Corpo da seção: ${heading}`,
      answerAria: (question) => `Resposta: ${question}`,
      validUntil: (date) => `válido até ${date}`,
      noGovernedSource:
        "Não coberto por material aprovado — esta resposta não tem uma fonte governada.",
      internalNoteLabel: "Nota interna",
      internalNotePlaceholder: "Contexto de trabalho para esta resposta — nunca exportado externamente",
      saveNote: "Salvar nota",
      cancel: "Cancelar",
      internalNotExportable: "Interno — não exportável",
      editNote: "Editar nota",
      remove: "Remover",
      addInternalNote: "Adicionar nota interna",

      historicDefault: "Este rascunho se baseia em material histórico.",
      askFlaggedTitle: "Iniciado a partir de uma resposta de Perguntar com evidência sinalizada",
      sourcesConflict: "Fontes em conflito",
      lowConfidence: "Baixa confiança",
      historicSource: "Fonte histórica",
      umbrellaMessage: "Mensagem guarda-chuva",
      evidenceAndCitations: "Evidência e citações",

      exclusionsTitle: "Fontes excluídas pela governança",
      exclusionsBlurb:
        "Dois filtros são aplicados antes de qualquer coisa chegar ao motor: a sua autorização e, em seguida, a confidencialidade de destino deste documento.",
      reasonClearance: "Sua autorização",
      reasonDestination: "Destino",

      pipelineRefineTitle: "Refinando sob governança",
      pipelineGenerateTitle: "Compondo a partir de evidência governada",
      pipelineSubtitle:
        "Apenas fontes filtradas por permissão. Cada afirmação é citada antes de chegar a você.",
      pipelineRefineSteps: {
        retrieving: "Reverificando evidência governada",
        composing: "Aplicando o seu refinamento com citações",
        guardian: "Brand Guardian reverificando afirmações e tom",
      },
      pipelineGenerateSteps: {
        retrieving: "Recuperando evidência governada",
        composing: "Compondo o documento com citações",
        guardian: "Brand Guardian verificando afirmações e tom",
      },

      refineAppliedPass:
        "Aplicado. Todas as afirmações foram recitadas e o Brand Guardian aprovou a revisão.",
      refineAppliedFlagged:
        "Aplicado, mas o Brand Guardian sinalizou a revisão — verifique os achados antes de exportar.",
      refineFailed: "O Hub não conseguiu aplicar essa alteração.",
      exportReviewRequiredError:
        "O material de imprensa precisa de uma revisão editorial concluída antes de poder ser exportado. Marque a revisão abaixo e exporte novamente.",
      exportRefusedError:
        "A exportação foi recusada. Verifique o veredito do Guardian e tente novamente.",

      saveVersion: "Salvar versão",
      assets: "Ativos",
      liveEditHint:
        "O documento está ativo — clique em qualquer lugar dele para editar. O Guardian reverifica enquanto você digita.",
      exportHeading: "Exportar",
      formatLabel: "Formato",
      exporting: "Exportando...",
      exportButton: "Exportar",
      exportPack: "Baixar pacote (ZIP)",
      exportingPack: "Criando pacote...",
      editorialReview: "Revisão editorial",
      reviewCompleted: "Concluída",
      reviewRequired: "Obrigatória",
      reviewedHint: "Esta versão exata foi revisada. Qualquer edição adicional anula a revisão.",
      reviewNeededHint:
        "O material de imprensa deve ser lido e aprovado por uma pessoa antes de poder ser exportado.",
      recording: "Registrando...",
      markReviewComplete: "Marcar revisão como concluída",
      approving: "Aprovando...",
      approveDraft: "Aprovar rascunho",
      lockedScheduled:
        "Rascunho agendado: ajuste-o aqui e depois Aprovar rascunho (ou aprove-o na caixa de revisão) antes de exportar ou versionar.",
      lockedGuardian: "A exportação e o versionamento ficam bloqueados até o Guardian aprovar.",
      spokespersonNotes: "Notas do porta-voz",
      internal: "Interno",
      doNotSay: (text) => `Não dizer: ${text}`,
      chartsBuilt: (n) =>
        `${n} gráfico${n > 1 ? "s" : ""} criado${n > 1 ? "s" : ""} a partir de séries governadas.`,

      editWithAgent: "Editar com o agente",
      expand: "Expandir",
      collapse: "Recolher",
      rePrefix: (snippet) => `Re: "${snippet}"`,
      recomposing: "Recompondo sob governança...",
      selectedPassage: (snippet) => `Trecho selecionado: "${snippet}"`,
      clear: "Limpar",
      refineLabelSelection: "O que deve mudar neste trecho?",
      refineLabelDefault: "Peça uma alteração",
      refinePlaceholder: "ex.: Enxugue a seção B2B e adicione o valor do dividendo",
      sendInstruction: "Enviar instrução de edição",
      startNewBrief: "Iniciar um novo brief",

      canvas: {
        editBlock: "EDITAR",
        lockedBlock: "Bloqueado",
        lockedBlockHint: "Ativo corporativo — o agente não pode editar este bloco.",
        blockTypeLabels: {
          umbrella: "Mensagem-chapéu",
          key_message: "Mensagem-chave",
          headline: "Título",
          lead: "Entrada",
          body: "Parágrafo de corpo",
          quote: "Citação do executivo",
          boilerplate: "Boilerplate",
          contact: "Contacto de imprensa",
          qa: "Perguntas e respostas",
          summary: "Resumo executivo",
        },
        blockPanelContext: "Editor de bloco",
        contentLabel: "Conteúdo do bloco",
        improveWithAgent: "MELHORAR COM O AGENTE",
        genericShorten: "Encurtar",
        genericSharpen: "Afinar",
        genericFixTone: "Ajustar o tom",
        genericRetune: "Adaptar à audiência",
        describeChange: "Ou descreve a alteração",
        describePlaceholder: "p. ex. usar o valor do Q1 em vez do Q4",
        improveButton: "Melhorar",
        improving: "A melhorar sob governação...",
        reset: "Repor",
        save: "Guardar",
        close: "Fechar",
        suggestionsLoading: "A ler o estado do corpus...",
        editApplied: "Alteração aplicada — só este bloco mudou.",
        editBlocked: "O Brand Guardian bloqueou esta alteração. Nada foi aplicado.",
        editNoChange: "Nenhuma fonte governada sustenta essa alteração — o bloco ficou inalterado.",
        editFailed: "Não foi possível concluir a alteração.",
        sourcesPaneTitle: "Fontes",
        sourcesPaneEmpty: "Ainda não há fontes citadas.",
        backToDocument: "Voltar ao documento",
      },
    },

    dialogs: {
      tabCompose: "Compor",
      tabScheduled: "Agendados",
      tabInbox: "Caixa de revisão",
      tabVersions: "Versões",
      notifications: "Notificações",
      notificationsUnread: (n) => `Notificações, ${n} não lidas`,

      noEvidenceTitle: "Sem evidência governada",
      permissionRestrictedTitle: "Permissão restrita",
      adjustBrief: "Ajustar o brief",

      notificationsTitle: "Notificações",
      notificationsDesc: "Rascunhos agendados chegando para revisão e aprovações conforme acontecem.",
      notificationsEmpty:
        "Nada ainda. Execute um agendamento e seus rascunhos se anunciarão aqui.",
      notifApproved: "Aprovado",
      notifReady: "Pronto para revisão",
      openInbox: "Abrir caixa",

      citationSubtitle: (id) => `Citação [${id}]`,
      extractedSnippet: "Trecho extraído",
      version: "Versão",
      owner: "Proprietário",
      confidence: "Confiança",

      assetsTitle: "Ativos governados",
      assetsDesc:
        "Afirmações, citações, boilerplate e avisos legais aprovados disponíveis para o motor.",
      approvedClaims: "Afirmações aprovadas",
      approvedQuotes: "Citações aprovadas",
      disclaimers: "Avisos legais",
      glossary: "Glossário",

      scheduledTitle: "Documentos agendados",
      scheduledBlurb:
        "Briefs recorrentes são executados sob a autorização do proprietário e chegam à caixa de revisão para um portão de aprovação humana antes que alguém possa exportá-los.",
      newSchedule: "Novo agendamento",
      scheduleNameLabel: "Nome do agendamento",
      scheduleNamePlaceholder: "ex.: Pulso de marca semanal",
      shapeLabel: "Formato",
      standingBriefLabel: "Brief permanente",
      standingBriefPlaceholder: "ex.: Leitura semanal do progresso de Transform & Grow",
      frequencyLabel: "Frequência",
      audienceLabel: "Público",
      audienceInternal: "Interno",
      audienceExternal: "Externo",
      ownerClearanceLabel: "Proprietário (executa sob esta autorização)",
      ownerLabel: "Proprietário",
      reviewFolderLabel: "Pasta de revisão",
      reviewFolderPlaceholder: "ex.: Pulso de marca",
      queriesLabel: "Consultas de fontes governadas (opcional, uma por linha)",
      queriesPlaceholder: "ex.: Metas de KPI de Transform & Grow\nTendência de NPS de clientes",
      queriesHelper:
        "Cada execução recorrente recupera com base nessas consultas governadas além do brief permanente.",
      axesLabel: "Eixos estratégicos (opcional)",
      createSchedule: "Criar agendamento",
      noSchedules: "Nenhum agendamento ainda.",
      sourcesPrefix: (list) => `Fontes: ${list}`,
      ownerPrefix: (owner) => `Proprietário: ${owner}`,
      lastRun: (when) => ` • Última execução ${when}`,
      neverRun: " • Nunca executado",
      nextRun: (when) => ` • Próxima execução automática ${when}`,
      runNow: "Executar agora",
      deliveryLog: "Registro de entregas",
      deliveryLogBlurb:
        "Quando uma execução agendada chega à caixa de revisão, o Hub registra uma mensagem simulada do Teams e um e-mail ao proprietário do agendamento. Nenhuma mensagem real sai do sistema.",
      noDeliveries:
        "Nenhuma entrega ainda — elas aparecem aqui após a conclusão de uma execução agendada.",
      deliveryMeta: (recipient, schedule, when) => `Para ${recipient} • ${schedule} • ${when}`,

      inboxTitle: "Caixa de revisão",
      inboxBlurb:
        "Rascunhos agendados aguardam aqui por um portão de aprovação humana. A aprovação exige um veredito favorável do Brand Guardian.",
      inboxEmpty: "A caixa está vazia. Execute um agendamento para preenchê-la.",
      approved: "Aprovado",
      pending: "Pendente",
      published: "Publicado",
      guardianCleared: "Guardian aprovou",
      guardianBlocked: "Guardian bloqueou",
      open: "Abrir",
      approve: "Aprovar",
      publishing: "Publicando",
      publishToCorpus: "Publicar no corpus",
      publishSuccess: ({ docId, version, chunks, superseded }) =>
        `Publicado no núcleo de conhecimento como ${docId} (v${version}, ${chunks} bloco${chunks === 1 ? "" : "s"})${superseded ? `. Substitui ${superseded}` : ""}. Agora está recuperável e citável em Perguntar.`,
      publishError: "O rascunho não pôde ser publicado no núcleo de conhecimento.",

      versionsTitle: "Versões salvas",
      versionsBlurb:
        "Histórico de versões em memória de documentos aprovados pelo Guardian. É redefinido quando o servidor reinicia.",
      noVersions: "Nenhuma versão salva ainda.",
      versionMeta: (savedBy, when, owner) =>
        `Salvo por ${savedBy} • ${when} • Proprietário ${owner}`,
    },
  },
};
