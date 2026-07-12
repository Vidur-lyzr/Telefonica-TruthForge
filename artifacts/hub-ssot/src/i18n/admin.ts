// UI strings for the Administration page and its sections (cost model, source
// sync, retrieval log). Server-provided content (user names, emails, KPI names,
// document titles, audit-entry detail text, connector names, source ids) stays
// as-is; this dictionary covers the static chrome so the page follows the
// global language selector.

import type { Lang } from "../components/app-provider";

export function localeFor(lang: Lang): string {
  switch (lang) {
    case "ES":
      return "es-ES";
    case "DE":
      return "de-DE";
    case "PT":
      return "pt-BR";
    default:
      return "en-GB";
  }
}

const ADMIN_EN = {
  clearanceLabels: {
    public: "Public",
    private: "Private",
    confidential: "Confidential",
    off_the_record: "Off the record",
  } as Record<string, string>,

  title: "Administration",
  intro:
    "Run the platform without a vendor: register users, assign profiles, manage permissions by area and confidentiality, and schedule recurring documents. This is the backend that proves the platform is operable after implementation.",

  accessBanner: "Access = area × confidentiality",
  setHere: "Set here",
  whoYouAre: "Who you are",
  whoYouAreBody:
    "User → area (Comunicación / Marca / Gabinete) and profile. Managed on this page.",
  inherited: "Inherited",
  howSensitive: "How sensitive the content is",
  howSensitiveBody:
    "Confidentiality label inherited from each document's Microsoft sensitivity label — not set here.",
  effectiveAccess: "Effective access",
  whatEachSees: "What each person sees",
  whatEachSeesBody:
    "Enforced at the index (early-binding) — the model never sees a chunk the user cannot access.",

  accessProfiles: "Access profiles",
  profilesNote:
    "Profiles can be added or unified as the organisation evolves — the four above are the RFP baseline, not a fixed ceiling.",

  platformUsers: "Platform users",
  registerUser: "Register user",
  colName: "Name",
  colArea: "Area",
  colProfile: "Profile",
  colConfidentialityTier: "Confidentiality tier",
  edit: "Edit",

  visibilityTitle: "Document visibility by user",
  visibilityIntro:
    "Resolved live by the same access engine that filters retrieval — area and confidentiality intersect, and every blocked row names which axis blocks it.",
  inspectUser: "Inspect user",
  userSelectOption: (name: string, area: string, clearance: string) =>
    `${name} — ${area} · ${clearance}`,
  visibilitySummary: (name: string, visible: number, total: number) =>
    `${name} can see ${visible} of ${total} governed documents. The rest never reach the model for this user.`,
  resolvingVisibility: "Resolving visibility…",
  colDocument: "Document",
  colConfidentiality: "Confidentiality",
  colAreaScope: "Area scope",
  colAccess: "Access",
  colWhy: "Why",
  allAreas: "All areas",
  visible: "visible",
  blockedBy: (axis: string) => `blocked · ${axis}`,
  blockedAxisLabels: {
    clearance: "clearance",
    area: "area",
  } as Record<string, string>,

  scheduledDocuments: "Scheduled documents",
  scheduleDocument: "Schedule document",
  humanGate:
    "Human gate: every generated document lands in the owner's review folder and never auto-publishes. A person always reviews before anything is released.",
  orphanWarning: (n: number) =>
    `${n} schedule${n > 1 ? "s are" : " is"} orphaned — the source document is missing. These are flagged rather than run silently, so no output is generated from a broken source.`,
  colTemplate: "Template",
  colFrequency: "Frequency",
  colLanguages: "Language(s)",
  colOwner: "Owner",
  colReviewFolder: "Review folder",
  colStatus: "Status",
  sourceMissing: (id: string) => `Source missing: ${id}`,
  sourcePrefix: (title: string) => `Source: ${title}`,
  noBoundSource: "No bound source",
  scheduleStatusLabels: {
    active: "active",
    paused: "paused",
    orphaned: "orphaned",
  } as Record<string, string>,
  frequencyOptions: {
    Daily: "Daily",
    Weekly: "Weekly",
    Monthly: "Monthly",
    Quarterly: "Quarterly",
  } as Record<string, string>,

  kpiDefinitions: "KPI definitions",
  newKpi: "New KPI",
  kpiIntro:
    "The governed KPI catalogue behind the KPIs page. Every edit appends a new version — nothing is overwritten — and the calculation engine picks up the latest definition on the next query. Thresholds drive amber/critical status and the alert trail.",
  colKpi: "KPI",
  colVersion: "Version",
  colTarget: "Target",
  colAmberBelow: "Amber below",
  colCriticalBelow: "Critical below",
  history: "History",

  auditTrail: "Audit trail",
  auditIntro:
    "Read-only — this is exactly what the Audit profile sees: every permission change and scheduled run, with actor, target and time.",
  colWhen: "When",
  colActor: "Actor",
  colAction: "Action",
  colTargetHdr: "Target",
  colDetail: "Detail",

  editUser: "Edit user",
  userDialogIntro:
    "Set who the person is — area and profile. Confidentiality is enforced at the index from inherited document labels.",
  fieldEmail: "Email",
  confidentialityTierMax: "Confidentiality tier (max access)",
  effectiveAccessPreview: "Effective access preview",
  previewIn: "In ",
  previewAs: ", as ",
  previewMid:
    ", this person would see documents in their area up to and including ",
  previewSuffix: " sensitivity.",
  appliedAtRetrieval:
    "Applied at retrieval (early-binding). Higher-sensitivity documents stay invisible.",
  saveChanges: "Save changes",
  cancel: "Cancel",

  confirmElevated: "Confirm elevated access",
  elevatedPre: "Granting ",
  elevatedMid1:
    " access exposes sensitive material — for example, Finance-DE ",
  elevatedMid2: " documents — to ",
  elevatedPost:
    ". This widens what they can see across their area. Continue?",
  thisUser: "this user",
  grantAccess: "Grant access",

  newKpiDefinition: "New KPI definition",
  editKpiDefinition: "Edit KPI definition",
  kpiCreateIntro:
    "Creates version 1 of a new governed KPI. The calculation engine starts tracking it immediately.",
  kpiEditIntro: (version: number) =>
    `Saving appends version ${version}. Earlier versions stay in the history and the calculation engine uses the latest definition.`,
  fieldDescription: "Description",
  fieldUnit: "Unit",
  fieldAmber: "Amber below (% of target)",
  fieldCritical: "Critical below (% of target)",
  fieldOwner: "Owner (notified on threshold alerts)",
  fieldConfidentiality: "Confidentiality",
  fieldObjective: "Objective",
  objectiveOption: (name: string, area: string) => `${name} (${area})`,
  fieldAxis: "Strategic axis",
  fieldMarket: "Market",
  fieldBrand: "Brand",
  fieldInitiativeType: "Initiative type",
  fieldDirection: "Direction",
  directionHigher: "Higher is better",
  directionLower: "Lower is better",
  visibleToAreas: "Visible to areas",
  selectAtLeastOneArea: "Select at least one area.",
  sourcesAndWeights: "Sources and weights",
  addSource: "Add source",
  weightsHelp:
    "Weights (0–1) set how much each source contributes to the blended figure. Sources linked to a governed document keep their document link.",
  linkedDocument: (id: string) => `Linked document: ${id}`,
  remove: "Remove",
  fieldLabel: "Label",
  fieldWeight: "Weight (0–1)",
  fieldNoteOptional: "Note (optional)",
  sourcesInvalid: "Each source needs a label and a weight between 0 and 1.",
  fieldChangeNote: "Change note (required)",
  createKpi: "Create KPI",
  saveAsVersion: (version: number) => `Save as v${version}`,
  sourceKindLabels: {
    internal: "internal",
    external: "external",
  } as Record<string, string>,

  versionHistory: "Version history",
  historyIntro: (name: string) =>
    `${name} — every definition change, newest first. Nothing is deleted.`,
  live: "live",
  versionSummary: (
    target: number | string,
    unit: string,
    amber: number,
    critical: number,
    owner: string,
    clearance: string,
  ) =>
    `Target ${target}${unit} · amber below ${amber}% · critical below ${critical}% · owner ${owner} · ${clearance}`,

  scheduleDialogTitle: "Schedule document",
  scheduleDialogIntro:
    "Define a recurring document. Output always lands in the review folder and never auto-publishes.",
  fieldTemplate: "Template",
  fieldFrequency: "Frequency",
  fieldReviewFolder: "Review folder",
  createSchedule: "Create schedule",

  cost: {
    title: "Cost model",
    intro:
      "Three blocks — one-time implementation, platform licence and usage — driven by the seat bracket and editable assumptions. All prices are illustrative: the RFP marks real figures as pending. The usage block is grounded in this platform's own metered agent calls.",
    liveEstimatorInput: (
      calls: number,
      callsStr: string,
      tokensStr: string,
      since: string,
      avgStr: string,
    ) =>
      `Live estimator input: ${callsStr} metered agent call${calls === 1 ? "" : "s"} totalling ${tokensStr} tokens since ${since} — an average of ${avgStr} tokens per interaction.`,
    noCalls:
      "No agent calls metered yet — the estimator uses a stated default of 1,500 tokens per interaction until real usage accumulates.",
    seats: "Seats",
    volumeDiscountTag: (pct: number) => `volume discount ${pct}%`,
    block1Label: "Block 1 · Set-up",
    block2Label: "Block 2 · Platform",
    block3Label: "Block 3 · Usage",
    cadenceOneTime: "one-time",
    cadenceAnnual: "annual",
    cadenceAmortised: (years: number) => `amortised / ${years} yr`,
    perYear: (amount: string) => `${amount} / yr`,
    block1DetailAmort: (setup: string, years: number) =>
      `Run-only packaging: the ${setup} implementation is folded into the annual fee across ${years} year${years === 1 ? "" : "s"}.`,
    block1Detail:
      "Implementation, ingestion of the governed corpus, connectors and go-live. Paid once.",
    block2Detail: (seats: number, seatAmount: string, discountPct: number) =>
      `${seats} seats at ${seatAmount}/seat/month${discountPct > 0 ? `, less ${discountPct}% volume discount` : ""}.`,
    block3Detail: (
      seats: number,
      interactions: number,
      avgStr: string,
      tokensM: string,
      millionAmount: string,
    ) =>
      `${seats} seats making ${interactions} interactions/month at about ${avgStr} tokens each — roughly ${tokensM}M tokens/year at ${millionAmount} per million.`,
    totalRunOnlyTitle: "Annual fee (run-only)",
    totalFirstYearTitle: "First year total",
    totalRunOnlySub:
      "No upfront payment — set-up amortised into the annual fee.",
    totalFirstYearSub: (fromYearTwo: string) =>
      `Set-up plus first annual platform and usage. From year two: ${fromYearTwo} / yr.`,
    assumptions: "Assumptions (editable, illustrative)",
    runOnlyCheckbox: "Run-only packaging (no upfront set-up)",
    fieldSetupFee: "Set-up fee (EUR, one-time)",
    fieldPerSeat: "Licence per seat (EUR/month)",
    fieldTokenPrice: "Price per 1M tokens (EUR)",
    fieldInteractions: "Interactions per user / month",
    fieldAmortYears: "Amortisation period (years)",
    assumptionsNote:
      "Volume discounts by bracket are fixed for the illustration: 50 seats 0%, 100 seats 5%, 150 seats 10%, 200 seats 15%. Tokens per interaction come from the live meter above, never from a manual entry. Where the provider does not report exact token counts, the meter records a conservative estimate, so treat the usage figure as indicative rather than invoice-precise.",
  },

  sync: {
    title: "Source-system sync",
    defaultConnector: "Simulated source connector",
    intro: (connector: string) =>
      `${connector} — change a document's confidentiality in the source system and watch it propagate to retrieval. Upgrades (more restrictive) apply immediately, like a source webhook. Downgrades (less restrictive) wait for the next batch sync run — the index fails closed, never open.`,
    syncRefused: "Sync refused",
    labelChangeError: "The label change could not be applied.",
    batchSyncError: "The batch sync could not be run.",
    colDocument: "Document",
    colCategory: "Category",
    colIndexEnforces: "Index enforces",
    colSourceAsserts: "Source asserts",
    colStatus: "Status",
    sourceLabelField: "Source label",
    pendingBatchSync: "Pending batch sync",
    inSync: "In sync",
    pendingDeltas: (n: number) => `Pending downgrade deltas (${n})`,
    nothingWaiting:
      "Nothing waiting. Downgrades queue here until a batch sync run applies them.",
    pendingBody:
      "These documents are still served under their stricter label until the batch sync runs.",
    runningSync: "Running sync",
    runBatchSyncNow: "Run batch sync now",
    to: "to",
    requestedBy: (by: string, when: string) => `requested by ${by} · ${when}`,
    batchRun: (when: string, actor: string, count: number) =>
      `Batch run ${when} by ${actor} — ${count} delta${count === 1 ? "" : "s"} applied.`,
    appliedDelta: (
      title: string,
      from: string,
      to: string,
      mode: string,
      when: string,
    ) => `${title}: ${from} to ${to} via ${mode}${when ? ` · ${when}` : ""}`,
    modeWebhook: "webhook (immediate)",
    modeBatch: "batch sync",
  },

  log: {
    title: "Retrieval audit log",
    intro:
      "Every retrieval the agents ran: who asked, under which governance filter, which chunks were considered and which were blocked. Ids and scores only — never chunk text.",
    filterDocId: "Filter by document id",
    filterPersonaId: "Filter by persona id",
    apply: "Apply",
    clear: "Clear",
    noMatch: "No retrievals match these filters.",
    noneYet:
      "No retrievals logged yet. Ask a question in Ask or generate a draft and the events will appear here.",
    colWhen: "When",
    colSurface: "Surface",
    colPersona: "Persona",
    colOutcome: "Outcome",
    colQuery: "Query",
    colRetrieval: "Retrieval",
    system: "System",
    inFlight: "in flight",
    statusLabels: {
      answered: "answered",
      drafted: "drafted",
      no_evidence: "no evidence",
      permission_blocked: "permission blocked",
      conflict: "conflict",
    } as Record<string, string>,
    surfaceLabels: {
      ask: "ask",
      generate: "generate",
    } as Record<string, string>,
    hits: (n: number) => `${n} hit${n === 1 ? "" : "s"}`,
    blockedCount: (n: number) => ` · ${n} blocked`,
    detail: "Detail",
    retrievalDetail: "Retrieval detail",
    detailSubtitle: (
      persona: string,
      clearance: string,
      area: string,
      when: string,
      outcome: string,
    ) =>
      `${persona} · ${clearance}${area ? ` · ${area}` : ""} · ${when} · outcome ${outcome}`,
    filterPrefix: (expr: string) => `Filter: ${expr}`,
    colChunk: "Chunk",
    colScore: "Score",
    colAccessHdr: "Access",
    permitted: "Permitted",
    blocked: "Blocked",
  },
};

export type AdminStrings = typeof ADMIN_EN;

export const ADMIN_I18N: Record<Lang, AdminStrings> = {
  EN: ADMIN_EN,
  ES: {
    clearanceLabels: {
      public: "Público",
      private: "Privado",
      confidential: "Confidencial",
      off_the_record: "Extraoficial",
    },

    title: "Administración",
    intro:
      "Opera la plataforma sin proveedor: registra usuarios, asigna perfiles, gestiona permisos por área y confidencialidad, y programa documentos recurrentes. Este es el backend que demuestra que la plataforma es operable tras la implementación.",

    accessBanner: "Acceso = área × confidencialidad",
    setHere: "Definido aquí",
    whoYouAre: "Quién eres",
    whoYouAreBody:
      "Usuario → área (Comunicación / Marca / Gabinete) y perfil. Se gestiona en esta página.",
    inherited: "Heredado",
    howSensitive: "Cómo de sensible es el contenido",
    howSensitiveBody:
      "La etiqueta de confidencialidad se hereda de la etiqueta de sensibilidad de Microsoft de cada documento — no se define aquí.",
    effectiveAccess: "Acceso efectivo",
    whatEachSees: "Qué ve cada persona",
    whatEachSeesBody:
      "Se aplica en el índice (vinculación temprana): el modelo nunca ve un fragmento al que el usuario no puede acceder.",

    accessProfiles: "Perfiles de acceso",
    profilesNote:
      "Los perfiles pueden añadirse o unificarse a medida que evoluciona la organización — los cuatro anteriores son la base del RFP, no un techo fijo.",

    platformUsers: "Usuarios de la plataforma",
    registerUser: "Registrar usuario",
    colName: "Nombre",
    colArea: "Área",
    colProfile: "Perfil",
    colConfidentialityTier: "Nivel de confidencialidad",
    edit: "Editar",

    visibilityTitle: "Visibilidad de documentos por usuario",
    visibilityIntro:
      "Se resuelve en vivo con el mismo motor de acceso que filtra la recuperación — el área y la confidencialidad se cruzan, y cada fila bloqueada indica qué eje la bloquea.",
    inspectUser: "Inspeccionar usuario",
    userSelectOption: (name, area, clearance) => `${name} — ${area} · ${clearance}`,
    visibilitySummary: (name, visible, total) =>
      `${name} puede ver ${visible} de ${total} documentos gobernados. El resto nunca llega al modelo para este usuario.`,
    resolvingVisibility: "Resolviendo visibilidad…",
    colDocument: "Documento",
    colConfidentiality: "Confidencialidad",
    colAreaScope: "Alcance de área",
    colAccess: "Acceso",
    colWhy: "Motivo",
    allAreas: "Todas las áreas",
    visible: "visible",
    blockedBy: (axis) => `bloqueado · ${axis}`,
    blockedAxisLabels: {
      clearance: "confidencialidad",
      area: "área",
    },

    scheduledDocuments: "Documentos programados",
    scheduleDocument: "Programar documento",
    humanGate:
      "Control humano: cada documento generado llega a la carpeta de revisión del responsable y nunca se publica automáticamente. Una persona siempre revisa antes de publicar nada.",
    orphanWarning: (n) =>
      `${n} ${n > 1 ? "programaciones están" : "programación está"} huérfana${n > 1 ? "s" : ""} — falta el documento de origen. Se marcan en lugar de ejecutarse en silencio, por lo que no se genera ninguna salida desde un origen roto.`,
    colTemplate: "Plantilla",
    colFrequency: "Frecuencia",
    colLanguages: "Idioma(s)",
    colOwner: "Responsable",
    colReviewFolder: "Carpeta de revisión",
    colStatus: "Estado",
    sourceMissing: (id) => `Origen ausente: ${id}`,
    sourcePrefix: (title) => `Origen: ${title}`,
    noBoundSource: "Sin origen vinculado",
    scheduleStatusLabels: {
      active: "activo",
      paused: "en pausa",
      orphaned: "huérfano",
    },
    frequencyOptions: {
      Daily: "Diario",
      Weekly: "Semanal",
      Monthly: "Mensual",
      Quarterly: "Trimestral",
    },

    kpiDefinitions: "Definiciones de KPI",
    newKpi: "Nuevo KPI",
    kpiIntro:
      "El catálogo gobernado de KPIs que respalda la página de KPIs. Cada edición añade una nueva versión — nada se sobrescribe — y el motor de cálculo toma la última definición en la siguiente consulta. Los umbrales determinan el estado ámbar/crítico y el registro de alertas.",
    colKpi: "KPI",
    colVersion: "Versión",
    colTarget: "Objetivo",
    colAmberBelow: "Ámbar por debajo de",
    colCriticalBelow: "Crítico por debajo de",
    history: "Historial",

    auditTrail: "Registro de auditoría",
    auditIntro:
      "Solo lectura — esto es exactamente lo que ve el perfil de Auditoría: cada cambio de permiso y ejecución programada, con actor, objetivo y hora.",
    colWhen: "Cuándo",
    colActor: "Actor",
    colAction: "Acción",
    colTargetHdr: "Objetivo",
    colDetail: "Detalle",

    editUser: "Editar usuario",
    userDialogIntro:
      "Define quién es la persona — área y perfil. La confidencialidad se aplica en el índice a partir de las etiquetas heredadas de los documentos.",
    fieldEmail: "Correo electrónico",
    confidentialityTierMax: "Nivel de confidencialidad (acceso máximo)",
    effectiveAccessPreview: "Vista previa del acceso efectivo",
    previewIn: "En ",
    previewAs: ", como ",
    previewMid:
      ", esta persona vería documentos de su área hasta e incluyendo la sensibilidad ",
    previewSuffix: ".",
    appliedAtRetrieval:
      "Se aplica en la recuperación (vinculación temprana). Los documentos de mayor sensibilidad permanecen invisibles.",
    saveChanges: "Guardar cambios",
    cancel: "Cancelar",

    confirmElevated: "Confirmar acceso elevado",
    elevatedPre: "Conceder acceso ",
    elevatedMid1:
      " expone material sensible — por ejemplo, documentos Finance-DE ",
    elevatedMid2: " — a ",
    elevatedPost:
      ". Esto amplía lo que puede ver en toda su área. ¿Continuar?",
    thisUser: "este usuario",
    grantAccess: "Conceder acceso",

    newKpiDefinition: "Nueva definición de KPI",
    editKpiDefinition: "Editar definición de KPI",
    kpiCreateIntro:
      "Crea la versión 1 de un nuevo KPI gobernado. El motor de cálculo empieza a rastrearlo de inmediato.",
    kpiEditIntro: (version) =>
      `Al guardar se añade la versión ${version}. Las versiones anteriores permanecen en el historial y el motor de cálculo usa la última definición.`,
    fieldDescription: "Descripción",
    fieldUnit: "Unidad",
    fieldAmber: "Ámbar por debajo de (% del objetivo)",
    fieldCritical: "Crítico por debajo de (% del objetivo)",
    fieldOwner: "Responsable (notificado en alertas de umbral)",
    fieldConfidentiality: "Confidencialidad",
    fieldObjective: "Objetivo",
    objectiveOption: (name, area) => `${name} (${area})`,
    fieldAxis: "Eje estratégico",
    fieldMarket: "Mercado",
    fieldBrand: "Marca",
    fieldInitiativeType: "Tipo de iniciativa",
    fieldDirection: "Dirección",
    directionHigher: "Cuanto más alto, mejor",
    directionLower: "Cuanto más bajo, mejor",
    visibleToAreas: "Visible para áreas",
    selectAtLeastOneArea: "Selecciona al menos un área.",
    sourcesAndWeights: "Fuentes y pesos",
    addSource: "Añadir fuente",
    weightsHelp:
      "Los pesos (0–1) definen cuánto aporta cada fuente a la cifra combinada. Las fuentes vinculadas a un documento gobernado conservan su enlace al documento.",
    linkedDocument: (id) => `Documento vinculado: ${id}`,
    remove: "Eliminar",
    fieldLabel: "Etiqueta",
    fieldWeight: "Peso (0–1)",
    fieldNoteOptional: "Nota (opcional)",
    sourcesInvalid: "Cada fuente necesita una etiqueta y un peso entre 0 y 1.",
    fieldChangeNote: "Nota de cambio (obligatoria)",
    createKpi: "Crear KPI",
    saveAsVersion: (version) => `Guardar como v${version}`,
    sourceKindLabels: {
      internal: "interna",
      external: "externa",
    },

    versionHistory: "Historial de versiones",
    historyIntro: (name) =>
      `${name} — cada cambio de definición, del más reciente al más antiguo. No se elimina nada.`,
    live: "en vivo",
    versionSummary: (target, unit, amber, critical, owner, clearance) =>
      `Objetivo ${target}${unit} · ámbar por debajo del ${amber}% · crítico por debajo del ${critical}% · responsable ${owner} · ${clearance}`,

    scheduleDialogTitle: "Programar documento",
    scheduleDialogIntro:
      "Define un documento recurrente. La salida siempre llega a la carpeta de revisión y nunca se publica automáticamente.",
    fieldTemplate: "Plantilla",
    fieldFrequency: "Frecuencia",
    fieldReviewFolder: "Carpeta de revisión",
    createSchedule: "Crear programación",

    cost: {
      title: "Modelo de costes",
      intro:
        "Tres bloques — implementación única, licencia de plataforma y uso — impulsados por el tramo de licencias y supuestos editables. Todos los precios son ilustrativos: el RFP marca las cifras reales como pendientes. El bloque de uso se basa en las llamadas al agente medidas de esta plataforma.",
      liveEstimatorInput: (calls, callsStr, tokensStr, since, avgStr) =>
        `Entrada del estimador en vivo: ${callsStr} llamada${calls === 1 ? "" : "s"} al agente medida${calls === 1 ? "" : "s"} que suman ${tokensStr} tokens desde el ${since} — una media de ${avgStr} tokens por interacción.`,
      noCalls:
        "Aún no se han medido llamadas al agente — el estimador usa un valor por defecto declarado de 1.500 tokens por interacción hasta que se acumule uso real.",
      seats: "Licencias",
      volumeDiscountTag: (pct) => `descuento por volumen del ${pct}%`,
      block1Label: "Bloque 1 · Implementación",
      block2Label: "Bloque 2 · Plataforma",
      block3Label: "Bloque 3 · Uso",
      cadenceOneTime: "único",
      cadenceAnnual: "anual",
      cadenceAmortised: (years) => `amortizado / ${years} años`,
      perYear: (amount) => `${amount} / año`,
      block1DetailAmort: (setup, years) =>
        `Paquete solo de operación: la implementación de ${setup} se reparte en la cuota anual a lo largo de ${years} año${years === 1 ? "" : "s"}.`,
      block1Detail:
        "Implementación, ingesta del corpus gobernado, conectores y puesta en marcha. Pago único.",
      block2Detail: (seats, seatAmount, discountPct) =>
        `${seats} licencias a ${seatAmount}/licencia/mes${discountPct > 0 ? `, menos un ${discountPct}% de descuento por volumen` : ""}.`,
      block3Detail: (seats, interactions, avgStr, tokensM, millionAmount) =>
        `${seats} licencias con ${interactions} interacciones/mes de unos ${avgStr} tokens cada una — aproximadamente ${tokensM}M tokens/año a ${millionAmount} por millón.`,
      totalRunOnlyTitle: "Cuota anual (solo operación)",
      totalFirstYearTitle: "Total del primer año",
      totalRunOnlySub:
        "Sin pago inicial — implementación amortizada en la cuota anual.",
      totalFirstYearSub: (fromYearTwo) =>
        `Implementación más la primera anualidad de plataforma y uso. A partir del segundo año: ${fromYearTwo} / año.`,
      assumptions: "Supuestos (editables, ilustrativos)",
      runOnlyCheckbox: "Paquete solo de operación (sin implementación inicial)",
      fieldSetupFee: "Cuota de implementación (EUR, única)",
      fieldPerSeat: "Licencia por puesto (EUR/mes)",
      fieldTokenPrice: "Precio por 1M de tokens (EUR)",
      fieldInteractions: "Interacciones por usuario / mes",
      fieldAmortYears: "Periodo de amortización (años)",
      assumptionsNote:
        "Los descuentos por volumen por tramo son fijos en la ilustración: 50 licencias 0%, 100 licencias 5%, 150 licencias 10%, 200 licencias 15%. Los tokens por interacción provienen del medidor en vivo de arriba, nunca de una entrada manual. Cuando el proveedor no informa recuentos exactos de tokens, el medidor registra una estimación conservadora, así que trata la cifra de uso como indicativa y no como precisa a nivel de factura.",
    },

    sync: {
      title: "Sincronización con el sistema de origen",
      defaultConnector: "Conector de origen simulado",
      intro: (connector) =>
        `${connector} — cambia la confidencialidad de un documento en el sistema de origen y observa cómo se propaga a la recuperación. Las subidas (más restrictivas) se aplican de inmediato, como un webhook de origen. Las bajadas (menos restrictivas) esperan a la siguiente ejecución de sincronización por lotes — el índice falla en cerrado, nunca en abierto.`,
      syncRefused: "Sincronización rechazada",
      labelChangeError: "No se pudo aplicar el cambio de etiqueta.",
      batchSyncError: "No se pudo ejecutar la sincronización por lotes.",
      colDocument: "Documento",
      colCategory: "Categoría",
      colIndexEnforces: "El índice aplica",
      colSourceAsserts: "El origen declara",
      colStatus: "Estado",
      sourceLabelField: "Etiqueta de origen",
      pendingBatchSync: "Pendiente de sincronización por lotes",
      inSync: "Sincronizado",
      pendingDeltas: (n) => `Cambios de bajada pendientes (${n})`,
      nothingWaiting:
        "Nada en espera. Las bajadas se encolan aquí hasta que una ejecución de sincronización por lotes las aplica.",
      pendingBody:
        "Estos documentos se siguen sirviendo con su etiqueta más estricta hasta que se ejecuta la sincronización por lotes.",
      runningSync: "Sincronizando",
      runBatchSyncNow: "Ejecutar sincronización por lotes ahora",
      to: "a",
      requestedBy: (by, when) => `solicitado por ${by} · ${when}`,
      batchRun: (when, actor, count) =>
        `Ejecución por lotes ${when} por ${actor} — ${count} cambio${count === 1 ? "" : "s"} aplicado${count === 1 ? "" : "s"}.`,
      appliedDelta: (title, from, to, mode, when) =>
        `${title}: de ${from} a ${to} vía ${mode}${when ? ` · ${when}` : ""}`,
      modeWebhook: "webhook (inmediato)",
      modeBatch: "sincronización por lotes",
    },

    log: {
      title: "Registro de auditoría de recuperación",
      intro:
        "Cada recuperación que ejecutaron los agentes: quién preguntó, con qué filtro de gobierno, qué fragmentos se consideraron y cuáles se bloquearon. Solo identificadores y puntuaciones — nunca el texto del fragmento.",
      filterDocId: "Filtrar por id de documento",
      filterPersonaId: "Filtrar por id de persona",
      apply: "Aplicar",
      clear: "Limpiar",
      noMatch: "Ninguna recuperación coincide con estos filtros.",
      noneYet:
        "Aún no hay recuperaciones registradas. Haz una pregunta en Preguntar o genera un borrador y los eventos aparecerán aquí.",
      colWhen: "Cuándo",
      colSurface: "Superficie",
      colPersona: "Persona",
      colOutcome: "Resultado",
      colQuery: "Consulta",
      colRetrieval: "Recuperación",
      system: "Sistema",
      inFlight: "en curso",
      statusLabels: {
        answered: "respondida",
        drafted: "redactada",
        no_evidence: "sin evidencia",
        permission_blocked: "bloqueada por permisos",
        conflict: "conflicto",
      },
      surfaceLabels: {
        ask: "preguntar",
        generate: "generar",
      },
      hits: (n) => `${n} resultado${n === 1 ? "" : "s"}`,
      blockedCount: (n) => ` · ${n} bloqueado${n === 1 ? "" : "s"}`,
      detail: "Detalle",
      retrievalDetail: "Detalle de recuperación",
      detailSubtitle: (persona, clearance, area, when, outcome) =>
        `${persona} · ${clearance}${area ? ` · ${area}` : ""} · ${when} · resultado ${outcome}`,
      filterPrefix: (expr) => `Filtro: ${expr}`,
      colChunk: "Fragmento",
      colScore: "Puntuación",
      colAccessHdr: "Acceso",
      permitted: "Permitido",
      blocked: "Bloqueado",
    },
  },
  DE: {
    clearanceLabels: {
      public: "Öffentlich",
      private: "Privat",
      confidential: "Vertraulich",
      off_the_record: "Vertraulich (inoffiziell)",
    },

    title: "Administration",
    intro:
      "Betreiben Sie die Plattform ohne Anbieter: Nutzer registrieren, Profile zuweisen, Berechtigungen nach Bereich und Vertraulichkeit verwalten und wiederkehrende Dokumente planen. Dies ist das Backend, das belegt, dass die Plattform nach der Implementierung betriebsfähig ist.",

    accessBanner: "Zugriff = Bereich × Vertraulichkeit",
    setHere: "Hier festgelegt",
    whoYouAre: "Wer Sie sind",
    whoYouAreBody:
      "Nutzer → Bereich (Comunicación / Marca / Gabinete) und Profil. Wird auf dieser Seite verwaltet.",
    inherited: "Übernommen",
    howSensitive: "Wie sensibel der Inhalt ist",
    howSensitiveBody:
      "Die Vertraulichkeitskennzeichnung wird aus der Microsoft-Sensitivitätskennzeichnung jedes Dokuments übernommen — nicht hier festgelegt.",
    effectiveAccess: "Effektiver Zugriff",
    whatEachSees: "Was jede Person sieht",
    whatEachSeesBody:
      "Am Index durchgesetzt (Early-Binding) — das Modell sieht nie einen Abschnitt, auf den der Nutzer keinen Zugriff hat.",

    accessProfiles: "Zugriffsprofile",
    profilesNote:
      "Profile können hinzugefügt oder zusammengeführt werden, während sich die Organisation weiterentwickelt — die vier oben sind die RFP-Basis, keine feste Obergrenze.",

    platformUsers: "Plattformnutzer",
    registerUser: "Nutzer registrieren",
    colName: "Name",
    colArea: "Bereich",
    colProfile: "Profil",
    colConfidentialityTier: "Vertraulichkeitsstufe",
    edit: "Bearbeiten",

    visibilityTitle: "Dokumentsichtbarkeit nach Nutzer",
    visibilityIntro:
      "Live aufgelöst durch dieselbe Zugriffs-Engine, die die Abrufe filtert — Bereich und Vertraulichkeit überschneiden sich, und jede blockierte Zeile nennt die blockierende Achse.",
    inspectUser: "Nutzer prüfen",
    userSelectOption: (name, area, clearance) => `${name} — ${area} · ${clearance}`,
    visibilitySummary: (name, visible, total) =>
      `${name} kann ${visible} von ${total} kontrollierten Dokumenten sehen. Der Rest erreicht das Modell für diesen Nutzer nie.`,
    resolvingVisibility: "Sichtbarkeit wird aufgelöst…",
    colDocument: "Dokument",
    colConfidentiality: "Vertraulichkeit",
    colAreaScope: "Bereichsumfang",
    colAccess: "Zugriff",
    colWhy: "Grund",
    allAreas: "Alle Bereiche",
    visible: "sichtbar",
    blockedBy: (axis) => `blockiert · ${axis}`,
    blockedAxisLabels: {
      clearance: "Vertraulichkeit",
      area: "Bereich",
    },

    scheduledDocuments: "Geplante Dokumente",
    scheduleDocument: "Dokument planen",
    humanGate:
      "Menschliche Kontrolle: Jedes generierte Dokument landet im Prüfordner des Verantwortlichen und wird nie automatisch veröffentlicht. Eine Person prüft immer, bevor etwas freigegeben wird.",
    orphanWarning: (n) =>
      `${n} ${n > 1 ? "Planungen sind" : "Planung ist"} verwaist — das Quelldokument fehlt. Diese werden markiert statt stillschweigend ausgeführt, sodass aus einer defekten Quelle keine Ausgabe erzeugt wird.`,
    colTemplate: "Vorlage",
    colFrequency: "Häufigkeit",
    colLanguages: "Sprache(n)",
    colOwner: "Verantwortlich",
    colReviewFolder: "Prüfordner",
    colStatus: "Status",
    sourceMissing: (id) => `Quelle fehlt: ${id}`,
    sourcePrefix: (title) => `Quelle: ${title}`,
    noBoundSource: "Keine verknüpfte Quelle",
    scheduleStatusLabels: {
      active: "aktiv",
      paused: "pausiert",
      orphaned: "verwaist",
    },
    frequencyOptions: {
      Daily: "Täglich",
      Weekly: "Wöchentlich",
      Monthly: "Monatlich",
      Quarterly: "Vierteljährlich",
    },

    kpiDefinitions: "KPI-Definitionen",
    newKpi: "Neuer KPI",
    kpiIntro:
      "Der kontrollierte KPI-Katalog hinter der KPI-Seite. Jede Bearbeitung fügt eine neue Version hinzu — nichts wird überschrieben — und die Berechnungs-Engine übernimmt bei der nächsten Abfrage die neueste Definition. Schwellenwerte steuern den Amber-/Kritisch-Status und den Alarmverlauf.",
    colKpi: "KPI",
    colVersion: "Version",
    colTarget: "Ziel",
    colAmberBelow: "Amber unter",
    colCriticalBelow: "Kritisch unter",
    history: "Verlauf",

    auditTrail: "Prüfprotokoll",
    auditIntro:
      "Schreibgeschützt — genau das sieht das Audit-Profil: jede Berechtigungsänderung und jeden geplanten Lauf, mit Akteur, Ziel und Zeit.",
    colWhen: "Wann",
    colActor: "Akteur",
    colAction: "Aktion",
    colTargetHdr: "Ziel",
    colDetail: "Detail",

    editUser: "Nutzer bearbeiten",
    userDialogIntro:
      "Legen Sie fest, wer die Person ist — Bereich und Profil. Die Vertraulichkeit wird am Index aus den übernommenen Dokumentkennzeichnungen durchgesetzt.",
    fieldEmail: "E-Mail",
    confidentialityTierMax: "Vertraulichkeitsstufe (maximaler Zugriff)",
    effectiveAccessPreview: "Vorschau des effektiven Zugriffs",
    previewIn: "Im Bereich ",
    previewAs: ", als ",
    previewMid:
      ", würde diese Person Dokumente in ihrem Bereich bis einschließlich der Vertraulichkeitsstufe ",
    previewSuffix: " sehen.",
    appliedAtRetrieval:
      "Beim Abruf durchgesetzt (Early-Binding). Dokumente höherer Vertraulichkeit bleiben unsichtbar.",
    saveChanges: "Änderungen speichern",
    cancel: "Abbrechen",

    confirmElevated: "Erweiterten Zugriff bestätigen",
    elevatedPre: "Die Gewährung des Zugriffs ",
    elevatedMid1:
      " legt sensibles Material offen — zum Beispiel Finance-DE-Dokumente der Stufe ",
    elevatedMid2: " — gegenüber ",
    elevatedPost:
      ". Dies erweitert, was diese Person in ihrem gesamten Bereich sehen kann. Fortfahren?",
    thisUser: "diesem Nutzer",
    grantAccess: "Zugriff gewähren",

    newKpiDefinition: "Neue KPI-Definition",
    editKpiDefinition: "KPI-Definition bearbeiten",
    kpiCreateIntro:
      "Erstellt Version 1 eines neuen kontrollierten KPI. Die Berechnungs-Engine beginnt sofort mit der Verfolgung.",
    kpiEditIntro: (version) =>
      `Beim Speichern wird Version ${version} hinzugefügt. Frühere Versionen bleiben im Verlauf, und die Berechnungs-Engine verwendet die neueste Definition.`,
    fieldDescription: "Beschreibung",
    fieldUnit: "Einheit",
    fieldAmber: "Amber unter (% des Ziels)",
    fieldCritical: "Kritisch unter (% des Ziels)",
    fieldOwner: "Verantwortlich (bei Schwellenwert-Alarmen benachrichtigt)",
    fieldConfidentiality: "Vertraulichkeit",
    fieldObjective: "Ziel",
    objectiveOption: (name, area) => `${name} (${area})`,
    fieldAxis: "Strategische Achse",
    fieldMarket: "Markt",
    fieldBrand: "Marke",
    fieldInitiativeType: "Initiativentyp",
    fieldDirection: "Richtung",
    directionHigher: "Höher ist besser",
    directionLower: "Niedriger ist besser",
    visibleToAreas: "Sichtbar für Bereiche",
    selectAtLeastOneArea: "Wählen Sie mindestens einen Bereich.",
    sourcesAndWeights: "Quellen und Gewichtungen",
    addSource: "Quelle hinzufügen",
    weightsHelp:
      "Gewichtungen (0–1) legen fest, wie stark jede Quelle zum gemischten Wert beiträgt. Quellen, die mit einem kontrollierten Dokument verknüpft sind, behalten ihre Dokumentverknüpfung.",
    linkedDocument: (id) => `Verknüpftes Dokument: ${id}`,
    remove: "Entfernen",
    fieldLabel: "Bezeichnung",
    fieldWeight: "Gewichtung (0–1)",
    fieldNoteOptional: "Notiz (optional)",
    sourcesInvalid:
      "Jede Quelle benötigt eine Bezeichnung und eine Gewichtung zwischen 0 und 1.",
    fieldChangeNote: "Änderungsnotiz (erforderlich)",
    createKpi: "KPI erstellen",
    saveAsVersion: (version) => `Als v${version} speichern`,
    sourceKindLabels: {
      internal: "intern",
      external: "extern",
    },

    versionHistory: "Versionsverlauf",
    historyIntro: (name) =>
      `${name} — jede Definitionsänderung, neueste zuerst. Nichts wird gelöscht.`,
    live: "live",
    versionSummary: (target, unit, amber, critical, owner, clearance) =>
      `Ziel ${target}${unit} · Amber unter ${amber}% · Kritisch unter ${critical}% · Verantwortlich ${owner} · ${clearance}`,

    scheduleDialogTitle: "Dokument planen",
    scheduleDialogIntro:
      "Definieren Sie ein wiederkehrendes Dokument. Die Ausgabe landet immer im Prüfordner und wird nie automatisch veröffentlicht.",
    fieldTemplate: "Vorlage",
    fieldFrequency: "Häufigkeit",
    fieldReviewFolder: "Prüfordner",
    createSchedule: "Planung erstellen",

    cost: {
      title: "Kostenmodell",
      intro:
        "Drei Blöcke — einmalige Implementierung, Plattformlizenz und Nutzung — gesteuert durch das Lizenzsegment und editierbare Annahmen. Alle Preise sind illustrativ: Das RFP kennzeichnet die realen Zahlen als ausstehend. Der Nutzungsblock beruht auf den eigenen gemessenen Agentenaufrufen dieser Plattform.",
      liveEstimatorInput: (calls, callsStr, tokensStr, since, avgStr) =>
        `Live-Eingabe des Schätzers: ${callsStr} gemessene${calls === 1 ? "r" : ""} Agentenaufruf${calls === 1 ? "" : "e"} mit insgesamt ${tokensStr} Tokens seit ${since} — durchschnittlich ${avgStr} Tokens pro Interaktion.`,
      noCalls:
        "Noch keine Agentenaufrufe gemessen — der Schätzer verwendet einen angegebenen Standardwert von 1.500 Tokens pro Interaktion, bis reale Nutzung anfällt.",
      seats: "Lizenzen",
      volumeDiscountTag: (pct) => `Mengenrabatt ${pct}%`,
      block1Label: "Block 1 · Einrichtung",
      block2Label: "Block 2 · Plattform",
      block3Label: "Block 3 · Nutzung",
      cadenceOneTime: "einmalig",
      cadenceAnnual: "jährlich",
      cadenceAmortised: (years) => `amortisiert / ${years} J.`,
      perYear: (amount) => `${amount} / Jahr`,
      block1DetailAmort: (setup, years) =>
        `Run-only-Paket: Die Implementierung von ${setup} wird über ${years} Jahr${years === 1 ? "" : "e"} in die Jahresgebühr eingerechnet.`,
      block1Detail:
        "Implementierung, Einlesen des kontrollierten Korpus, Konnektoren und Go-live. Einmalig zu zahlen.",
      block2Detail: (seats, seatAmount, discountPct) =>
        `${seats} Lizenzen zu ${seatAmount}/Lizenz/Monat${discountPct > 0 ? `, abzüglich ${discountPct}% Mengenrabatt` : ""}.`,
      block3Detail: (seats, interactions, avgStr, tokensM, millionAmount) =>
        `${seats} Lizenzen mit ${interactions} Interaktionen/Monat zu je etwa ${avgStr} Tokens — rund ${tokensM}M Tokens/Jahr zu ${millionAmount} pro Million.`,
      totalRunOnlyTitle: "Jahresgebühr (Run-only)",
      totalFirstYearTitle: "Gesamtsumme erstes Jahr",
      totalRunOnlySub:
        "Keine Vorauszahlung — Einrichtung in die Jahresgebühr amortisiert.",
      totalFirstYearSub: (fromYearTwo) =>
        `Einrichtung plus erste Jahresgebühr für Plattform und Nutzung. Ab dem zweiten Jahr: ${fromYearTwo} / Jahr.`,
      assumptions: "Annahmen (editierbar, illustrativ)",
      runOnlyCheckbox: "Run-only-Paket (keine Vorabeinrichtung)",
      fieldSetupFee: "Einrichtungsgebühr (EUR, einmalig)",
      fieldPerSeat: "Lizenz pro Platz (EUR/Monat)",
      fieldTokenPrice: "Preis pro 1M Tokens (EUR)",
      fieldInteractions: "Interaktionen pro Nutzer / Monat",
      fieldAmortYears: "Amortisationszeitraum (Jahre)",
      assumptionsNote:
        "Mengenrabatte je Segment sind für die Illustration fest: 50 Lizenzen 0%, 100 Lizenzen 5%, 150 Lizenzen 10%, 200 Lizenzen 15%. Tokens pro Interaktion stammen aus dem Live-Zähler oben, nie aus einer manuellen Eingabe. Wo der Anbieter keine exakten Token-Zahlen meldet, erfasst der Zähler eine konservative Schätzung; behandeln Sie die Nutzungszahl daher als Richtwert und nicht als rechnungsgenau.",
    },

    sync: {
      title: "Quellsystem-Synchronisierung",
      defaultConnector: "Simulierter Quellkonnektor",
      intro: (connector) =>
        `${connector} — ändern Sie die Vertraulichkeit eines Dokuments im Quellsystem und beobachten Sie, wie sie sich auf den Abruf auswirkt. Höherstufungen (restriktiver) gelten sofort, wie ein Quell-Webhook. Herabstufungen (weniger restriktiv) warten auf den nächsten Batch-Sync-Lauf — der Index scheitert geschlossen, nie offen.`,
      syncRefused: "Synchronisierung abgelehnt",
      labelChangeError: "Die Kennzeichnungsänderung konnte nicht angewendet werden.",
      batchSyncError: "Die Batch-Synchronisierung konnte nicht ausgeführt werden.",
      colDocument: "Dokument",
      colCategory: "Kategorie",
      colIndexEnforces: "Index setzt durch",
      colSourceAsserts: "Quelle deklariert",
      colStatus: "Status",
      sourceLabelField: "Quellkennzeichnung",
      pendingBatchSync: "Ausstehende Batch-Synchronisierung",
      inSync: "Synchron",
      pendingDeltas: (n) => `Ausstehende Herabstufungs-Deltas (${n})`,
      nothingWaiting:
        "Nichts in der Warteschlange. Herabstufungen reihen sich hier ein, bis ein Batch-Sync-Lauf sie anwendet.",
      pendingBody:
        "Diese Dokumente werden weiterhin unter ihrer strengeren Kennzeichnung ausgeliefert, bis die Batch-Synchronisierung läuft.",
      runningSync: "Synchronisierung läuft",
      runBatchSyncNow: "Batch-Synchronisierung jetzt ausführen",
      to: "auf",
      requestedBy: (by, when) => `angefordert von ${by} · ${when}`,
      batchRun: (when, actor, count) =>
        `Batch-Lauf ${when} von ${actor} — ${count} Delta${count === 1 ? "" : "s"} angewendet.`,
      appliedDelta: (title, from, to, mode, when) =>
        `${title}: von ${from} auf ${to} über ${mode}${when ? ` · ${when}` : ""}`,
      modeWebhook: "Webhook (sofort)",
      modeBatch: "Batch-Synchronisierung",
    },

    log: {
      title: "Abruf-Prüfprotokoll",
      intro:
        "Jeder Abruf, den die Agenten ausgeführt haben: wer gefragt hat, unter welchem Governance-Filter, welche Abschnitte berücksichtigt und welche blockiert wurden. Nur IDs und Scores — nie Abschnittstext.",
      filterDocId: "Nach Dokument-ID filtern",
      filterPersonaId: "Nach Persona-ID filtern",
      apply: "Anwenden",
      clear: "Zurücksetzen",
      noMatch: "Keine Abrufe entsprechen diesen Filtern.",
      noneYet:
        "Noch keine Abrufe protokolliert. Stellen Sie eine Frage unter Fragen oder erzeugen Sie einen Entwurf, dann erscheinen die Ereignisse hier.",
      colWhen: "Wann",
      colSurface: "Oberfläche",
      colPersona: "Persona",
      colOutcome: "Ergebnis",
      colQuery: "Abfrage",
      colRetrieval: "Abruf",
      system: "System",
      inFlight: "läuft",
      statusLabels: {
        answered: "beantwortet",
        drafted: "entworfen",
        no_evidence: "kein Beleg",
        permission_blocked: "durch Berechtigung blockiert",
        conflict: "Konflikt",
      },
      surfaceLabels: {
        ask: "Fragen",
        generate: "Erstellen",
      },
      hits: (n) => `${n} Treffer`,
      blockedCount: (n) => ` · ${n} blockiert`,
      detail: "Detail",
      retrievalDetail: "Abrufdetail",
      detailSubtitle: (persona, clearance, area, when, outcome) =>
        `${persona} · ${clearance}${area ? ` · ${area}` : ""} · ${when} · Ergebnis ${outcome}`,
      filterPrefix: (expr) => `Filter: ${expr}`,
      colChunk: "Abschnitt",
      colScore: "Score",
      colAccessHdr: "Zugriff",
      permitted: "Erlaubt",
      blocked: "Blockiert",
    },
  },
  PT: {
    clearanceLabels: {
      public: "Público",
      private: "Privado",
      confidential: "Confidencial",
      off_the_record: "Extraoficial",
    },

    title: "Administração",
    intro:
      "Opere a plataforma sem fornecedor: registre usuários, atribua perfis, gerencie permissões por área e confidencialidade e agende documentos recorrentes. Este é o backend que comprova que a plataforma é operável após a implementação.",

    accessBanner: "Acesso = área × confidencialidade",
    setHere: "Definido aqui",
    whoYouAre: "Quem você é",
    whoYouAreBody:
      "Usuário → área (Comunicación / Marca / Gabinete) e perfil. Gerenciado nesta página.",
    inherited: "Herdado",
    howSensitive: "Quão sensível é o conteúdo",
    howSensitiveBody:
      "O rótulo de confidencialidade é herdado do rótulo de sensibilidade da Microsoft de cada documento — não é definido aqui.",
    effectiveAccess: "Acesso efetivo",
    whatEachSees: "O que cada pessoa vê",
    whatEachSeesBody:
      "Aplicado no índice (vinculação antecipada) — o modelo nunca vê um trecho ao qual o usuário não tem acesso.",

    accessProfiles: "Perfis de acesso",
    profilesNote:
      "Os perfis podem ser adicionados ou unificados à medida que a organização evolui — os quatro acima são a base do RFP, não um teto fixo.",

    platformUsers: "Usuários da plataforma",
    registerUser: "Registrar usuário",
    colName: "Nome",
    colArea: "Área",
    colProfile: "Perfil",
    colConfidentialityTier: "Nível de confidencialidade",
    edit: "Editar",

    visibilityTitle: "Visibilidade de documentos por usuário",
    visibilityIntro:
      "Resolvida ao vivo pelo mesmo mecanismo de acesso que filtra a recuperação — área e confidencialidade se cruzam, e cada linha bloqueada indica qual eixo a bloqueia.",
    inspectUser: "Inspecionar usuário",
    userSelectOption: (name, area, clearance) => `${name} — ${area} · ${clearance}`,
    visibilitySummary: (name, visible, total) =>
      `${name} pode ver ${visible} de ${total} documentos governados. O restante nunca chega ao modelo para este usuário.`,
    resolvingVisibility: "Resolvendo visibilidade…",
    colDocument: "Documento",
    colConfidentiality: "Confidencialidade",
    colAreaScope: "Escopo de área",
    colAccess: "Acesso",
    colWhy: "Motivo",
    allAreas: "Todas as áreas",
    visible: "visível",
    blockedBy: (axis) => `bloqueado · ${axis}`,
    blockedAxisLabels: {
      clearance: "confidencialidade",
      area: "área",
    },

    scheduledDocuments: "Documentos agendados",
    scheduleDocument: "Agendar documento",
    humanGate:
      "Controle humano: cada documento gerado chega à pasta de revisão do responsável e nunca é publicado automaticamente. Uma pessoa sempre revisa antes de qualquer publicação.",
    orphanWarning: (n) =>
      `${n} ${n > 1 ? "agendamentos estão" : "agendamento está"} órfão${n > 1 ? "s" : ""} — o documento de origem está ausente. Eles são sinalizados em vez de executados silenciosamente, de modo que nenhuma saída é gerada a partir de uma origem quebrada.`,
    colTemplate: "Modelo",
    colFrequency: "Frequência",
    colLanguages: "Idioma(s)",
    colOwner: "Responsável",
    colReviewFolder: "Pasta de revisão",
    colStatus: "Status",
    sourceMissing: (id) => `Origem ausente: ${id}`,
    sourcePrefix: (title) => `Origem: ${title}`,
    noBoundSource: "Sem origem vinculada",
    scheduleStatusLabels: {
      active: "ativo",
      paused: "pausado",
      orphaned: "órfão",
    },
    frequencyOptions: {
      Daily: "Diário",
      Weekly: "Semanal",
      Monthly: "Mensal",
      Quarterly: "Trimestral",
    },

    kpiDefinitions: "Definições de KPI",
    newKpi: "Novo KPI",
    kpiIntro:
      "O catálogo governado de KPIs por trás da página de KPIs. Cada edição adiciona uma nova versão — nada é sobrescrito — e o mecanismo de cálculo adota a definição mais recente na próxima consulta. Os limiares determinam o status âmbar/crítico e o histórico de alertas.",
    colKpi: "KPI",
    colVersion: "Versão",
    colTarget: "Meta",
    colAmberBelow: "Âmbar abaixo de",
    colCriticalBelow: "Crítico abaixo de",
    history: "Histórico",

    auditTrail: "Trilha de auditoria",
    auditIntro:
      "Somente leitura — é exatamente o que o perfil de Auditoria vê: cada alteração de permissão e execução agendada, com ator, alvo e horário.",
    colWhen: "Quando",
    colActor: "Ator",
    colAction: "Ação",
    colTargetHdr: "Alvo",
    colDetail: "Detalhe",

    editUser: "Editar usuário",
    userDialogIntro:
      "Defina quem é a pessoa — área e perfil. A confidencialidade é aplicada no índice a partir dos rótulos herdados dos documentos.",
    fieldEmail: "E-mail",
    confidentialityTierMax: "Nível de confidencialidade (acesso máximo)",
    effectiveAccessPreview: "Prévia do acesso efetivo",
    previewIn: "Em ",
    previewAs: ", como ",
    previewMid:
      ", esta pessoa veria documentos de sua área até e incluindo a sensibilidade ",
    previewSuffix: ".",
    appliedAtRetrieval:
      "Aplicado na recuperação (vinculação antecipada). Documentos de maior sensibilidade permanecem invisíveis.",
    saveChanges: "Salvar alterações",
    cancel: "Cancelar",

    confirmElevated: "Confirmar acesso elevado",
    elevatedPre: "Conceder acesso ",
    elevatedMid1:
      " expõe material sensível — por exemplo, documentos Finance-DE ",
    elevatedMid2: " — a ",
    elevatedPost:
      ". Isso amplia o que essa pessoa pode ver em toda a sua área. Continuar?",
    thisUser: "este usuário",
    grantAccess: "Conceder acesso",

    newKpiDefinition: "Nova definição de KPI",
    editKpiDefinition: "Editar definição de KPI",
    kpiCreateIntro:
      "Cria a versão 1 de um novo KPI governado. O mecanismo de cálculo começa a rastreá-lo imediatamente.",
    kpiEditIntro: (version) =>
      `Ao salvar, a versão ${version} é adicionada. As versões anteriores permanecem no histórico e o mecanismo de cálculo usa a definição mais recente.`,
    fieldDescription: "Descrição",
    fieldUnit: "Unidade",
    fieldAmber: "Âmbar abaixo de (% da meta)",
    fieldCritical: "Crítico abaixo de (% da meta)",
    fieldOwner: "Responsável (notificado em alertas de limiar)",
    fieldConfidentiality: "Confidencialidade",
    fieldObjective: "Objetivo",
    objectiveOption: (name, area) => `${name} (${area})`,
    fieldAxis: "Eixo estratégico",
    fieldMarket: "Mercado",
    fieldBrand: "Marca",
    fieldInitiativeType: "Tipo de iniciativa",
    fieldDirection: "Direção",
    directionHigher: "Quanto mais alto, melhor",
    directionLower: "Quanto mais baixo, melhor",
    visibleToAreas: "Visível para áreas",
    selectAtLeastOneArea: "Selecione pelo menos uma área.",
    sourcesAndWeights: "Fontes e pesos",
    addSource: "Adicionar fonte",
    weightsHelp:
      "Os pesos (0–1) definem quanto cada fonte contribui para o valor combinado. Fontes vinculadas a um documento governado mantêm seu vínculo com o documento.",
    linkedDocument: (id) => `Documento vinculado: ${id}`,
    remove: "Remover",
    fieldLabel: "Rótulo",
    fieldWeight: "Peso (0–1)",
    fieldNoteOptional: "Nota (opcional)",
    sourcesInvalid: "Cada fonte precisa de um rótulo e de um peso entre 0 e 1.",
    fieldChangeNote: "Nota de alteração (obrigatória)",
    createKpi: "Criar KPI",
    saveAsVersion: (version) => `Salvar como v${version}`,
    sourceKindLabels: {
      internal: "interna",
      external: "externa",
    },

    versionHistory: "Histórico de versões",
    historyIntro: (name) =>
      `${name} — cada alteração de definição, da mais recente à mais antiga. Nada é excluído.`,
    live: "ao vivo",
    versionSummary: (target, unit, amber, critical, owner, clearance) =>
      `Meta ${target}${unit} · âmbar abaixo de ${amber}% · crítico abaixo de ${critical}% · responsável ${owner} · ${clearance}`,

    scheduleDialogTitle: "Agendar documento",
    scheduleDialogIntro:
      "Defina um documento recorrente. A saída sempre chega à pasta de revisão e nunca é publicada automaticamente.",
    fieldTemplate: "Modelo",
    fieldFrequency: "Frequência",
    fieldReviewFolder: "Pasta de revisão",
    createSchedule: "Criar agendamento",

    cost: {
      title: "Modelo de custos",
      intro:
        "Três blocos — implementação única, licença da plataforma e uso — orientados pela faixa de licenças e por premissas editáveis. Todos os preços são ilustrativos: o RFP marca os valores reais como pendentes. O bloco de uso baseia-se nas próprias chamadas de agente medidas desta plataforma.",
      liveEstimatorInput: (calls, callsStr, tokensStr, since, avgStr) =>
        `Entrada do estimador ao vivo: ${callsStr} chamada${calls === 1 ? "" : "s"} de agente medida${calls === 1 ? "" : "s"} totalizando ${tokensStr} tokens desde ${since} — média de ${avgStr} tokens por interação.`,
      noCalls:
        "Nenhuma chamada de agente medida ainda — o estimador usa um valor padrão declarado de 1.500 tokens por interação até que haja uso real acumulado.",
      seats: "Licenças",
      volumeDiscountTag: (pct) => `desconto por volume de ${pct}%`,
      block1Label: "Bloco 1 · Implementação",
      block2Label: "Bloco 2 · Plataforma",
      block3Label: "Bloco 3 · Uso",
      cadenceOneTime: "único",
      cadenceAnnual: "anual",
      cadenceAmortised: (years) => `amortizado / ${years} anos`,
      perYear: (amount) => `${amount} / ano`,
      block1DetailAmort: (setup, years) =>
        `Pacote somente de operação: a implementação de ${setup} é diluída na taxa anual ao longo de ${years} ano${years === 1 ? "" : "s"}.`,
      block1Detail:
        "Implementação, ingestão do corpus governado, conectores e go-live. Pago uma vez.",
      block2Detail: (seats, seatAmount, discountPct) =>
        `${seats} licenças a ${seatAmount}/licença/mês${discountPct > 0 ? `, menos ${discountPct}% de desconto por volume` : ""}.`,
      block3Detail: (seats, interactions, avgStr, tokensM, millionAmount) =>
        `${seats} licenças fazendo ${interactions} interações/mês de cerca de ${avgStr} tokens cada — aproximadamente ${tokensM}M tokens/ano a ${millionAmount} por milhão.`,
      totalRunOnlyTitle: "Taxa anual (somente operação)",
      totalFirstYearTitle: "Total do primeiro ano",
      totalRunOnlySub:
        "Sem pagamento inicial — implementação amortizada na taxa anual.",
      totalFirstYearSub: (fromYearTwo) =>
        `Implementação mais a primeira anuidade de plataforma e uso. A partir do segundo ano: ${fromYearTwo} / ano.`,
      assumptions: "Premissas (editáveis, ilustrativas)",
      runOnlyCheckbox: "Pacote somente de operação (sem implementação inicial)",
      fieldSetupFee: "Taxa de implementação (EUR, única)",
      fieldPerSeat: "Licença por assento (EUR/mês)",
      fieldTokenPrice: "Preço por 1M de tokens (EUR)",
      fieldInteractions: "Interações por usuário / mês",
      fieldAmortYears: "Período de amortização (anos)",
      assumptionsNote:
        "Os descontos por volume por faixa são fixos na ilustração: 50 licenças 0%, 100 licenças 5%, 150 licenças 10%, 200 licenças 15%. Os tokens por interação vêm do medidor ao vivo acima, nunca de uma entrada manual. Quando o provedor não informa contagens exatas de tokens, o medidor registra uma estimativa conservadora, então trate o valor de uso como indicativo, e não como preciso a nível de fatura.",
    },

    sync: {
      title: "Sincronização com o sistema de origem",
      defaultConnector: "Conector de origem simulado",
      intro: (connector) =>
        `${connector} — altere a confidencialidade de um documento no sistema de origem e observe a propagação para a recuperação. Elevações (mais restritivas) se aplicam imediatamente, como um webhook de origem. Rebaixamentos (menos restritivos) aguardam a próxima execução de sincronização em lote — o índice falha fechado, nunca aberto.`,
      syncRefused: "Sincronização recusada",
      labelChangeError: "Não foi possível aplicar a alteração de rótulo.",
      batchSyncError: "Não foi possível executar a sincronização em lote.",
      colDocument: "Documento",
      colCategory: "Categoria",
      colIndexEnforces: "O índice aplica",
      colSourceAsserts: "A origem declara",
      colStatus: "Status",
      sourceLabelField: "Rótulo de origem",
      pendingBatchSync: "Sincronização em lote pendente",
      inSync: "Sincronizado",
      pendingDeltas: (n) => `Alterações de rebaixamento pendentes (${n})`,
      nothingWaiting:
        "Nada em espera. Os rebaixamentos são enfileirados aqui até que uma execução de sincronização em lote os aplique.",
      pendingBody:
        "Esses documentos continuam servidos sob seu rótulo mais estrito até que a sincronização em lote seja executada.",
      runningSync: "Sincronizando",
      runBatchSyncNow: "Executar sincronização em lote agora",
      to: "para",
      requestedBy: (by, when) => `solicitado por ${by} · ${when}`,
      batchRun: (when, actor, count) =>
        `Execução em lote ${when} por ${actor} — ${count} alteração${count === 1 ? "" : "ões"} aplicada${count === 1 ? "" : "s"}.`,
      appliedDelta: (title, from, to, mode, when) =>
        `${title}: de ${from} para ${to} via ${mode}${when ? ` · ${when}` : ""}`,
      modeWebhook: "webhook (imediato)",
      modeBatch: "sincronização em lote",
    },

    log: {
      title: "Registro de auditoria de recuperação",
      intro:
        "Cada recuperação que os agentes executaram: quem perguntou, sob qual filtro de governança, quais trechos foram considerados e quais foram bloqueados. Apenas identificadores e pontuações — nunca o texto do trecho.",
      filterDocId: "Filtrar por id de documento",
      filterPersonaId: "Filtrar por id de persona",
      apply: "Aplicar",
      clear: "Limpar",
      noMatch: "Nenhuma recuperação corresponde a estes filtros.",
      noneYet:
        "Nenhuma recuperação registrada ainda. Faça uma pergunta em Perguntar ou gere um rascunho e os eventos aparecerão aqui.",
      colWhen: "Quando",
      colSurface: "Superfície",
      colPersona: "Persona",
      colOutcome: "Resultado",
      colQuery: "Consulta",
      colRetrieval: "Recuperação",
      system: "Sistema",
      inFlight: "em andamento",
      statusLabels: {
        answered: "respondida",
        drafted: "rascunhada",
        no_evidence: "sem evidência",
        permission_blocked: "bloqueada por permissão",
        conflict: "conflito",
      },
      surfaceLabels: {
        ask: "perguntar",
        generate: "gerar",
      },
      hits: (n) => `${n} resultado${n === 1 ? "" : "s"}`,
      blockedCount: (n) => ` · ${n} bloqueado${n === 1 ? "" : "s"}`,
      detail: "Detalhe",
      retrievalDetail: "Detalhe da recuperação",
      detailSubtitle: (persona, clearance, area, when, outcome) =>
        `${persona} · ${clearance}${area ? ` · ${area}` : ""} · ${when} · resultado ${outcome}`,
      filterPrefix: (expr) => `Filtro: ${expr}`,
      colChunk: "Trecho",
      colScore: "Pontuação",
      colAccessHdr: "Acesso",
      permitted: "Permitido",
      blocked: "Bloqueado",
    },
  },
};
