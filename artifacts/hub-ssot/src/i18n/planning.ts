// UI strings for the Planning app (page, calendar, event drawer/form, alerts,
// predictive strip, planning chat and forecast panel). Server-provided content
// (event titles, descriptions, answers, citations, owner/market/brand names,
// axis names, forecast summaries) stays as-is; this dictionary covers the
// static chrome so the surface follows the global language selector.

import type { Lang } from "../components/app-provider";

// Locale codes for Intl date/number formatting per app language.
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

export interface PlanningStrings {
  // Page header + controls
  title: string;
  subtitle: string;
  sourcesLabel: string;
  readOnly: string;
  all: string;
  filterWord: string;
  prev: string;
  next: string;
  today: string;
  newActivity: string;
  filterLabels: {
    area: string;
    market: string;
    brand: string;
    axis: string;
    type: string;
    period: string;
  };
  axisFallback: string;
  views: { month: string; week: string; day: string };
  periodNextDays: (n: number) => string;
  noCalendarsTitle: string;
  noCalendarsBody: string;
  loadingCalendar: string;
  nothingTitle: string;
  nothingBody: string;
  axisLegend: string;

  // Types / statuses / axis
  types: Record<string, string>;
  statuses: Record<string, string>;
  statusPrefix: string;
  sourcePrefix: string;
  unassignedAxis: string;

  // Calendar cells
  restricted: string;
  restrictedAria: string;
  eventAria: (a: { title: string; type: string; context: string; source: string }) => string;
  moreCount: (n: number) => string;
  noActivity: string;
  restrictedActivity: string;
  noActivityDay: string;

  // Event drawer
  loadingEvent: string;
  blockedActivity: string;
  restrictedNoteBefore: string;
  restrictedNoteAfter: string;
  metaMarket: string;
  metaBrand: string;
  metaOwner: string;
  metaSource: string;
  metaArea: string;
  metaAxis: string;
  timingConflict: string;
  clashesWith: string;
  moveActivity: string;
  pickNewDate: string;
  moveInstructions: (source: string) => string;
  newStartDate: string;
  simulating: string;
  simulateImpact: string;
  moveErrorFallback: string;
  moving: string;
  confirmMove: string;
  cancel: string;
  simulateFirst: string;
  writeBackLog: string;
  writeBackNote: string;
  pendingConfirmation: string;
  requestedBy: (name: string, date: string) => string;
  impactResolves: string;
  impactNewConflicts: string;
  impactNearMisses: string;
  impactExternalSignals: string;
  endsAt: (date: string) => string;

  // Event form
  formIntro: (area: string) => string;
  fieldTitle: string;
  fieldStartDate: string;
  fieldEndDate: string;
  endBeforeStart: string;
  fieldType: string;
  fieldAxis: string;
  fieldOwner: string;
  ownerPlaceholder: string;
  fieldMarket: string;
  fieldBrand: string;
  fieldSource: string;
  fieldConfidentiality: string;
  confidentialityOptions: {
    public: string;
    private: string;
    confidential: string;
    off_the_record: string;
  };
  clearanceHint: string;
  fieldDescription: string;
  formErrorFallback: string;
  creating: string;
  createActivity: string;

  // Alerts panel
  alertKinds: { milestone: string; conflict: string; deviation: string };
  personalisedAlerts: string;
  noAlerts: string;
  alertAria: (title: string) => string;

  // Predictive strip
  noPredictive: string;
  predictiveHeader: string;
  conflictCard: (market: string) => string;
  whatCollides: string;
  suggestedResolution: string;
  openToReview: string;
  movePreview: string;
  delayRiskCard: (level: string) => string;
  signalCard: (market: string) => string;
  watchCard: (market: string) => string;
  activitiesCount: (n: number) => string;
  activityGap: string;
  gapDays: (n: number) => string;
  suggestedWindow: string;
  externalCard: (market: string) => string;

  // Planning chat
  prompts: string[];
  evidenceAria: (id: string | number, title: string) => string;
  askCalendar: string;
  chatIntro: string;
  accessingCalendar: string;
  agentActivity: string;
  chatError: string;
  clearChat: string;
  noEvidence: string;
  permissionRestricted: string;
  suggestedNextSteps: string;
  evidence: string;
  askPlaceholder: string;
  send: string;
  citationLabel: (id: string | number) => string;
  extractedSnippet: string;
  owner: string;
  confidence: string;
  market: string;

  // Forecast panel
  statLive: string;
  statConflicts: string;
  statRisks: string;
  forecastTitle: string;
  generating: string;
  refresh: string;
  generate: string;
  forecastIntro: string;
  composingForecast: string;
  citedActivity: string;
  scheduledNote: (folder: string, title: string) => string;
  scheduling: string;
  scheduleToReview: string;
  recurringForecast: string;
  recurringActive: (name: string, every: string, folder: string) => string;
  freqEvery: { daily: string; weekly: string; monthly: string };
  lastRun: string;
  notYet: string;
  cancelling: string;
  cancelRecurring: string;
  recurringIntro: string;
  frequencyAria: (f: string) => string;
  frequencies: { daily: string; weekly: string; monthly: string };
  createRecurring: string;
}

export const PLANNING_I18N: Record<Lang, PlanningStrings> = {
  EN: {
    title: "Unified planning",
    subtitle:
      "Governed calendar across Communication and Brand — every block scoped to your persona.",
    sourcesLabel: "Sources",
    readOnly: "read-only",
    all: "All",
    filterWord: "filter",
    prev: "Previous",
    next: "Next",
    today: "Today",
    newActivity: "New activity",
    filterLabels: {
      area: "Area",
      market: "Market",
      brand: "Brand",
      axis: "Axis",
      type: "Type",
      period: "Period",
    },
    axisFallback: "Axis",
    views: { month: "Month", week: "Week", day: "Day" },
    periodNextDays: (n) => `Next ${n} days`,
    noCalendarsTitle: "No calendars connected",
    noCalendarsBody:
      "This workspace has no governed planning sources yet. Once a read-only calendar (Asana, Jira, Google Calendar, Confluence or Excel) is connected, its activity will appear here, scoped to your persona.",
    loadingCalendar: "Loading governed calendar…",
    nothingTitle: "Nothing to show here",
    nothingBody:
      "No activity matches these filters at your clearance. Adjust the filters, or switch to a higher-clearance persona to see restricted slots.",
    axisLegend: "Axis legend",

    types: {
      campaign: "Campaign",
      milestone: "Milestone",
      event: "Event",
      publication: "Publication",
    },
    statuses: {
      planned: "Planned",
      in_progress: "In progress",
      live: "Live",
      done: "Done",
      at_risk: "At risk",
    },
    statusPrefix: "status:",
    sourcePrefix: "source:",
    unassignedAxis: "Unassigned axis",

    restricted: "Restricted",
    restrictedAria: "Restricted — outside your clearance or area",
    eventAria: (a) =>
      `${a.title} — ${a.type} · ${a.context} · synced from ${a.source} (read-only)`,
    moreCount: (n) => `+${n} more`,
    noActivity: "No activity",
    restrictedActivity: "Restricted activity",
    noActivityDay: "No activity scheduled for this day.",

    loadingEvent: "Loading event…",
    blockedActivity: "Blocked activity",
    restrictedNoteBefore: "There is activity in this slot, but it is classified",
    restrictedNoteAfter:
      "— above your current clearance. The Hub shows the slot as busy without revealing its contents. Switch to a higher-clearance persona or request access.",
    metaMarket: "Market",
    metaBrand: "Brand",
    metaOwner: "Owner",
    metaSource: "Source",
    metaArea: "Area",
    metaAxis: "Axis",
    timingConflict: "Timing conflict",
    clashesWith: "This clashes in the same market and window with:",
    moveActivity: "Move this activity",
    pickNewDate: "Pick a new date",
    moveInstructions: (source) =>
      `Choose a new start date and simulate the impact before committing. The duration is preserved and the change is written back to ${source}.`,
    newStartDate: "New start date",
    simulating: "Simulating…",
    simulateImpact: "Simulate impact",
    moveErrorFallback: "The calendar could not apply this move.",
    moving: "Moving…",
    confirmMove: "Confirm move",
    cancel: "Cancel",
    simulateFirst:
      "Simulate the impact first — the Hub only commits moves it has shown you the consequences of.",
    writeBackLog: "Write-back log",
    writeBackNote:
      "In the ideal scenario sync is bidirectional — changes made here write back to the source tool. Write-back is pending confirmation with Telefónica, so each request below is queued, not yet committed at source.",
    pendingConfirmation: "Pending confirmation",
    requestedBy: (name, date) => `Requested by ${name} · ${date}`,
    impactResolves: "Resolves",
    impactNewConflicts: "New conflicts",
    impactNearMisses: "Near misses",
    impactExternalSignals: "External signals",
    endsAt: (date) => `(ends ${date})`,

    formIntro: (area) =>
      `Created in the ${area} area at your clearance. The change is written back to the source system and appears as pending until that system confirms it.`,
    fieldTitle: "Title",
    fieldStartDate: "Start date",
    fieldEndDate: "End date",
    endBeforeStart: "The end date cannot be before the start date.",
    fieldType: "Type",
    fieldAxis: "Strategic axis",
    fieldOwner: "Owner",
    ownerPlaceholder: "e.g. Prensa Madrid",
    fieldMarket: "Market",
    fieldBrand: "Brand",
    fieldSource: "Source system",
    fieldConfidentiality: "Confidentiality",
    confidentialityOptions: {
      public: "Public",
      private: "Private",
      confidential: "Confidential",
      off_the_record: "Off the record",
    },
    clearanceHint: "You can only create activity at or below your own clearance.",
    fieldDescription: "Description",
    formErrorFallback: "The calendar could not accept this activity.",
    creating: "Creating…",
    createActivity: "Create activity",

    alertKinds: { milestone: "Milestone", conflict: "Conflict", deviation: "Deviation" },
    personalisedAlerts: "Personalised alerts",
    noAlerts:
      "Nothing needs your attention right now. Alerts appear here when a milestone is close, a conflict emerges, or a plan deviates for an owner you follow.",
    alertAria: (title) => `Alert: ${title}`,

    noPredictive:
      "No predictive signals for the current filter. The Hub only surfaces heuristics it can back with governed activity.",
    predictiveHeader: "Predictive signals — suggestions, not decisions",
    conflictCard: (market) => `Conflict · ${market}`,
    whatCollides: "What collides",
    suggestedResolution: "Suggested resolution",
    openToReview: "Open activity to review →",
    movePreview: "Move preview",
    delayRiskCard: (level) => `Delay risk · ${level === "high" ? "High" : "Medium"}`,
    signalCard: (market) => `Signal · ${market}`,
    watchCard: (market) => `Watch · ${market}`,
    activitiesCount: (n) => `${n} activities`,
    activityGap: "Activity gap",
    gapDays: (n) => `${n} days`,
    suggestedWindow: "Suggested window",
    externalCard: (market) => `External · ${market}`,

    prompts: [
      "What is live in Spain over the next two weeks?",
      "Are there any timing conflicts I should know about?",
      "What Movistar activity is planned this summer?",
    ],
    evidenceAria: (id, title) => `Citation ${id}: ${title}`,
    askCalendar: "Ask the calendar",
    chatIntro: "Every answer is scoped to your persona and cited to governed activity.",
    accessingCalendar: "Accessing governed calendar…",
    agentActivity: "Agent activity",
    chatError: "The calendar agent could not complete this request. Please try again.",
    clearChat: "Clear conversation",
    noEvidence: "No evidence found",
    permissionRestricted: "Permission restricted",
    suggestedNextSteps: "Suggested next steps",
    evidence: "Evidence",
    askPlaceholder: "Ask about this calendar…",
    send: "Send",
    citationLabel: (id) => `Citation [${id}]`,
    extractedSnippet: "Extracted snippet",
    owner: "Owner",
    confidence: "Confidence",
    market: "Market",

    statLive: "Live",
    statConflicts: "Conflicts",
    statRisks: "Risks",
    forecastTitle: "10-day forecast",
    generating: "Generating…",
    refresh: "Refresh",
    generate: "Generate",
    forecastIntro:
      "Generate a cited outlook of what is live, upcoming, and at risk in the next 10 days — scoped to your persona.",
    composingForecast: "Composing forecast from governed activity…",
    citedActivity: "Cited activity",
    scheduledNote: (folder, title) =>
      `Sent to the "${folder}" review folder as "${title}". It is waiting for approval in Generate.`,
    scheduling: "Scheduling…",
    scheduleToReview: "Schedule to review folder",
    recurringForecast: "Recurring forecast",
    recurringActive: (name, every, folder) =>
      `${name} — ${every}, a fresh cited forecast lands in the "${folder}" review folder for approval.`,
    freqEvery: { daily: "every day", weekly: "every week", monthly: "every month" },
    lastRun: "Last run:",
    notYet: "not yet",
    cancelling: "Cancelling…",
    cancelRecurring: "Cancel recurring forecast",
    recurringIntro:
      'Receive this forecast on a schedule. Each run lands as an approval-gated draft in the "Planning forecasts" review folder.',
    frequencyAria: (f) => `Frequency ${f}`,
    frequencies: { daily: "Daily", weekly: "Weekly", monthly: "Monthly" },
    createRecurring: "Create recurring forecast",
  },
  ES: {
    title: "Planificación unificada",
    subtitle:
      "Calendario gobernado en Comunicación y Marca — cada bloque acotado a tu persona.",
    sourcesLabel: "Fuentes",
    readOnly: "solo lectura",
    all: "Todos",
    filterWord: "filtro",
    prev: "Anterior",
    next: "Siguiente",
    today: "Hoy",
    newActivity: "Nueva actividad",
    filterLabels: {
      area: "Área",
      market: "Mercado",
      brand: "Marca",
      axis: "Eje",
      type: "Tipo",
      period: "Periodo",
    },
    axisFallback: "Eje",
    views: { month: "Mes", week: "Semana", day: "Día" },
    periodNextDays: (n) => `Próximos ${n} días`,
    noCalendarsTitle: "No hay calendarios conectados",
    noCalendarsBody:
      "Este espacio de trabajo aún no tiene fuentes de planificación gobernadas. Una vez conectado un calendario de solo lectura (Asana, Jira, Google Calendar, Confluence o Excel), su actividad aparecerá aquí, acotada a tu persona.",
    loadingCalendar: "Cargando calendario gobernado…",
    nothingTitle: "No hay nada que mostrar aquí",
    nothingBody:
      "Ninguna actividad coincide con estos filtros en tu nivel de acceso. Ajusta los filtros o cambia a una persona con mayor nivel de acceso para ver las franjas restringidas.",
    axisLegend: "Leyenda de ejes",

    types: {
      campaign: "Campaña",
      milestone: "Hito",
      event: "Evento",
      publication: "Publicación",
    },
    statuses: {
      planned: "Planificado",
      in_progress: "En curso",
      live: "Activo",
      done: "Finalizado",
      at_risk: "En riesgo",
    },
    statusPrefix: "estado:",
    sourcePrefix: "fuente:",
    unassignedAxis: "Eje sin asignar",

    restricted: "Restringido",
    restrictedAria: "Restringido — fuera de tu nivel de acceso o área",
    eventAria: (a) =>
      `${a.title} — ${a.type} · ${a.context} · sincronizado desde ${a.source} (solo lectura)`,
    moreCount: (n) => `+${n} más`,
    noActivity: "Sin actividad",
    restrictedActivity: "Actividad restringida",
    noActivityDay: "No hay actividad programada para este día.",

    loadingEvent: "Cargando evento…",
    blockedActivity: "Actividad bloqueada",
    restrictedNoteBefore: "Hay actividad en esta franja, pero está clasificada como",
    restrictedNoteAfter:
      "— por encima de tu nivel de acceso actual. El Hub muestra la franja como ocupada sin revelar su contenido. Cambia a una persona con mayor nivel de acceso o solicita acceso.",
    metaMarket: "Mercado",
    metaBrand: "Marca",
    metaOwner: "Responsable",
    metaSource: "Fuente",
    metaArea: "Área",
    metaAxis: "Eje",
    timingConflict: "Conflicto de fechas",
    clashesWith: "Esto coincide en el mismo mercado y periodo con:",
    moveActivity: "Mover esta actividad",
    pickNewDate: "Elegir nueva fecha",
    moveInstructions: (source) =>
      `Elige una nueva fecha de inicio y simula el impacto antes de confirmar. La duración se mantiene y el cambio se escribe de vuelta en ${source}.`,
    newStartDate: "Nueva fecha de inicio",
    simulating: "Simulando…",
    simulateImpact: "Simular impacto",
    moveErrorFallback: "El calendario no pudo aplicar este movimiento.",
    moving: "Moviendo…",
    confirmMove: "Confirmar movimiento",
    cancel: "Cancelar",
    simulateFirst:
      "Simula primero el impacto — el Hub solo confirma movimientos cuyas consecuencias te ha mostrado.",
    writeBackLog: "Registro de escritura de vuelta",
    writeBackNote:
      "En el escenario ideal la sincronización es bidireccional — los cambios realizados aquí se escriben de vuelta en la herramienta de origen. La escritura de vuelta está pendiente de confirmación con Telefónica, por lo que cada solicitud a continuación está en cola, aún no confirmada en el origen.",
    pendingConfirmation: "Pendiente de confirmación",
    requestedBy: (name, date) => `Solicitado por ${name} · ${date}`,
    impactResolves: "Resuelve",
    impactNewConflicts: "Nuevos conflictos",
    impactNearMisses: "Casi conflictos",
    impactExternalSignals: "Señales externas",
    endsAt: (date) => `(termina ${date})`,

    formIntro: (area) =>
      `Creado en el área ${area} con tu nivel de acceso. El cambio se escribe de vuelta en el sistema de origen y aparece como pendiente hasta que dicho sistema lo confirme.`,
    fieldTitle: "Título",
    fieldStartDate: "Fecha de inicio",
    fieldEndDate: "Fecha de fin",
    endBeforeStart: "La fecha de fin no puede ser anterior a la de inicio.",
    fieldType: "Tipo",
    fieldAxis: "Eje estratégico",
    fieldOwner: "Responsable",
    ownerPlaceholder: "p. ej. Prensa Madrid",
    fieldMarket: "Mercado",
    fieldBrand: "Marca",
    fieldSource: "Sistema de origen",
    fieldConfidentiality: "Confidencialidad",
    confidentialityOptions: {
      public: "Público",
      private: "Privado",
      confidential: "Confidencial",
      off_the_record: "Extraoficial",
    },
    clearanceHint: "Solo puedes crear actividad en tu nivel de acceso o inferior.",
    fieldDescription: "Descripción",
    formErrorFallback: "El calendario no pudo aceptar esta actividad.",
    creating: "Creando…",
    createActivity: "Crear actividad",

    alertKinds: { milestone: "Hito", conflict: "Conflicto", deviation: "Desviación" },
    personalisedAlerts: "Alertas personalizadas",
    noAlerts:
      "Nada requiere tu atención en este momento. Las alertas aparecen aquí cuando un hito se acerca, surge un conflicto o un plan se desvía para un responsable que sigues.",
    alertAria: (title) => `Alerta: ${title}`,

    noPredictive:
      "No hay señales predictivas para el filtro actual. El Hub solo muestra heurísticas que puede respaldar con actividad gobernada.",
    predictiveHeader: "Señales predictivas — sugerencias, no decisiones",
    conflictCard: (market) => `Conflicto · ${market}`,
    whatCollides: "Qué coincide",
    suggestedResolution: "Resolución sugerida",
    openToReview: "Abrir actividad para revisar →",
    movePreview: "Vista previa del movimiento",
    delayRiskCard: (level) => `Riesgo de retraso · ${level === "high" ? "Alto" : "Medio"}`,
    signalCard: (market) => `Señal · ${market}`,
    watchCard: (market) => `Vigilancia · ${market}`,
    activitiesCount: (n) => `${n} actividades`,
    activityGap: "Hueco de actividad",
    gapDays: (n) => `${n} días`,
    suggestedWindow: "Ventana sugerida",
    externalCard: (market) => `Externo · ${market}`,

    prompts: [
      "¿Qué está en marcha en España en las próximas dos semanas?",
      "¿Hay algún conflicto de fechas que deba conocer?",
      "¿Qué actividad de Movistar está prevista este verano?",
    ],
    evidenceAria: (id, title) => `Cita ${id}: ${title}`,
    askCalendar: "Pregunta al calendario",
    chatIntro: "Cada respuesta se acota a tu persona y se cita a actividad gobernada.",
    accessingCalendar: "Accediendo al calendario gobernado…",
    agentActivity: "Actividad del agente",
    chatError: "El agente del calendario no pudo completar esta solicitud. Inténtalo de nuevo.",
    clearChat: "Borrar conversación",
    noEvidence: "No se encontró evidencia",
    permissionRestricted: "Permiso restringido",
    suggestedNextSteps: "Próximos pasos sugeridos",
    evidence: "Evidencia",
    askPlaceholder: "Pregunta sobre este calendario…",
    send: "Enviar",
    citationLabel: (id) => `Cita [${id}]`,
    extractedSnippet: "Fragmento extraído",
    owner: "Responsable",
    confidence: "Confianza",
    market: "Mercado",

    statLive: "Activos",
    statConflicts: "Conflictos",
    statRisks: "Riesgos",
    forecastTitle: "Pronóstico a 10 días",
    generating: "Generando…",
    refresh: "Actualizar",
    generate: "Generar",
    forecastIntro:
      "Genera una perspectiva citada de lo que está en marcha, lo próximo y lo que está en riesgo en los próximos 10 días — acotada a tu persona.",
    composingForecast: "Componiendo el pronóstico a partir de actividad gobernada…",
    citedActivity: "Actividad citada",
    scheduledNote: (folder, title) =>
      `Enviado a la carpeta de revisión «${folder}» como «${title}». Está esperando aprobación en Generar.`,
    scheduling: "Programando…",
    scheduleToReview: "Programar en carpeta de revisión",
    recurringForecast: "Pronóstico recurrente",
    recurringActive: (name, every, folder) =>
      `${name} — ${every}, un nuevo pronóstico citado llega a la carpeta de revisión «${folder}» para su aprobación.`,
    freqEvery: { daily: "cada día", weekly: "cada semana", monthly: "cada mes" },
    lastRun: "Última ejecución:",
    notYet: "aún no",
    cancelling: "Cancelando…",
    cancelRecurring: "Cancelar pronóstico recurrente",
    recurringIntro:
      "Recibe este pronóstico de forma programada. Cada ejecución llega como un borrador sujeto a aprobación en la carpeta de revisión «Planning forecasts».",
    frequencyAria: (f) => `Frecuencia ${f}`,
    frequencies: { daily: "Diario", weekly: "Semanal", monthly: "Mensual" },
    createRecurring: "Crear pronóstico recurrente",
  },
  DE: {
    title: "Einheitliche Planung",
    subtitle:
      "Kontrollierter Kalender über Kommunikation und Marke hinweg — jeder Block auf Ihre Persona zugeschnitten.",
    sourcesLabel: "Quellen",
    readOnly: "schreibgeschützt",
    all: "Alle",
    filterWord: "Filter",
    prev: "Zurück",
    next: "Weiter",
    today: "Heute",
    newActivity: "Neue Aktivität",
    filterLabels: {
      area: "Bereich",
      market: "Markt",
      brand: "Marke",
      axis: "Achse",
      type: "Typ",
      period: "Zeitraum",
    },
    axisFallback: "Achse",
    views: { month: "Monat", week: "Woche", day: "Tag" },
    periodNextDays: (n) => `Nächste ${n} Tage`,
    noCalendarsTitle: "Keine Kalender verbunden",
    noCalendarsBody:
      "Dieser Arbeitsbereich hat noch keine kontrollierten Planungsquellen. Sobald ein schreibgeschützter Kalender (Asana, Jira, Google Calendar, Confluence oder Excel) verbunden ist, erscheint dessen Aktivität hier, zugeschnitten auf Ihre Persona.",
    loadingCalendar: "Kontrollierter Kalender wird geladen…",
    nothingTitle: "Hier gibt es nichts anzuzeigen",
    nothingBody:
      "Keine Aktivität entspricht diesen Filtern in Ihrer Berechtigung. Passen Sie die Filter an oder wechseln Sie zu einer Persona mit höherer Berechtigung, um eingeschränkte Zeitfenster zu sehen.",
    axisLegend: "Achsenlegende",

    types: {
      campaign: "Kampagne",
      milestone: "Meilenstein",
      event: "Ereignis",
      publication: "Veröffentlichung",
    },
    statuses: {
      planned: "Geplant",
      in_progress: "In Bearbeitung",
      live: "Aktiv",
      done: "Abgeschlossen",
      at_risk: "Gefährdet",
    },
    statusPrefix: "Status:",
    sourcePrefix: "Quelle:",
    unassignedAxis: "Nicht zugewiesene Achse",

    restricted: "Eingeschränkt",
    restrictedAria: "Eingeschränkt — außerhalb Ihrer Berechtigung oder Ihres Bereichs",
    eventAria: (a) =>
      `${a.title} — ${a.type} · ${a.context} · synchronisiert aus ${a.source} (schreibgeschützt)`,
    moreCount: (n) => `+${n} weitere`,
    noActivity: "Keine Aktivität",
    restrictedActivity: "Eingeschränkte Aktivität",
    noActivityDay: "Für diesen Tag ist keine Aktivität geplant.",

    loadingEvent: "Ereignis wird geladen…",
    blockedActivity: "Blockierte Aktivität",
    restrictedNoteBefore: "In diesem Zeitfenster gibt es Aktivität, sie ist jedoch als",
    restrictedNoteAfter:
      "eingestuft — über Ihrer aktuellen Berechtigung. Der Hub zeigt das Zeitfenster als belegt an, ohne dessen Inhalt preiszugeben. Wechseln Sie zu einer Persona mit höherer Berechtigung oder fordern Sie Zugriff an.",
    metaMarket: "Markt",
    metaBrand: "Marke",
    metaOwner: "Verantwortlich",
    metaSource: "Quelle",
    metaArea: "Bereich",
    metaAxis: "Achse",
    timingConflict: "Terminkonflikt",
    clashesWith: "Dies überschneidet sich im selben Markt und Zeitraum mit:",
    moveActivity: "Diese Aktivität verschieben",
    pickNewDate: "Neues Datum wählen",
    moveInstructions: (source) =>
      `Wählen Sie ein neues Startdatum und simulieren Sie die Auswirkungen, bevor Sie bestätigen. Die Dauer bleibt erhalten und die Änderung wird in ${source} zurückgeschrieben.`,
    newStartDate: "Neues Startdatum",
    simulating: "Simuliert…",
    simulateImpact: "Auswirkungen simulieren",
    moveErrorFallback: "Der Kalender konnte diese Verschiebung nicht übernehmen.",
    moving: "Wird verschoben…",
    confirmMove: "Verschiebung bestätigen",
    cancel: "Abbrechen",
    simulateFirst:
      "Simulieren Sie zuerst die Auswirkungen — der Hub übernimmt nur Verschiebungen, deren Folgen er Ihnen gezeigt hat.",
    writeBackLog: "Rückschreib-Protokoll",
    writeBackNote:
      "Im Idealfall ist die Synchronisierung bidirektional — hier vorgenommene Änderungen werden in das Quellwerkzeug zurückgeschrieben. Das Zurückschreiben steht noch unter Vorbehalt der Bestätigung mit Telefónica, daher ist jede Anfrage unten in der Warteschlange und am Ursprung noch nicht übernommen.",
    pendingConfirmation: "Bestätigung ausstehend",
    requestedBy: (name, date) => `Angefordert von ${name} · ${date}`,
    impactResolves: "Löst auf",
    impactNewConflicts: "Neue Konflikte",
    impactNearMisses: "Beinahe-Konflikte",
    impactExternalSignals: "Externe Signale",
    endsAt: (date) => `(endet ${date})`,

    formIntro: (area) =>
      `Erstellt im Bereich ${area} mit Ihrer Berechtigung. Die Änderung wird in das Quellsystem zurückgeschrieben und erscheint als ausstehend, bis dieses System sie bestätigt.`,
    fieldTitle: "Titel",
    fieldStartDate: "Startdatum",
    fieldEndDate: "Enddatum",
    endBeforeStart: "Das Enddatum darf nicht vor dem Startdatum liegen.",
    fieldType: "Typ",
    fieldAxis: "Strategische Achse",
    fieldOwner: "Verantwortlich",
    ownerPlaceholder: "z. B. Prensa Madrid",
    fieldMarket: "Markt",
    fieldBrand: "Marke",
    fieldSource: "Quellsystem",
    fieldConfidentiality: "Vertraulichkeit",
    confidentialityOptions: {
      public: "Öffentlich",
      private: "Privat",
      confidential: "Vertraulich",
      off_the_record: "Streng vertraulich",
    },
    clearanceHint:
      "Sie können Aktivitäten nur auf oder unterhalb Ihrer eigenen Berechtigung erstellen.",
    fieldDescription: "Beschreibung",
    formErrorFallback: "Der Kalender konnte diese Aktivität nicht annehmen.",
    creating: "Wird erstellt…",
    createActivity: "Aktivität erstellen",

    alertKinds: { milestone: "Meilenstein", conflict: "Konflikt", deviation: "Abweichung" },
    personalisedAlerts: "Personalisierte Warnungen",
    noAlerts:
      "Im Moment erfordert nichts Ihre Aufmerksamkeit. Warnungen erscheinen hier, wenn ein Meilenstein näher rückt, ein Konflikt entsteht oder ein Plan für eine von Ihnen verfolgte verantwortliche Person abweicht.",
    alertAria: (title) => `Warnung: ${title}`,

    noPredictive:
      "Keine prädiktiven Signale für den aktuellen Filter. Der Hub zeigt nur Heuristiken, die er mit kontrollierter Aktivität belegen kann.",
    predictiveHeader: "Prädiktive Signale — Vorschläge, keine Entscheidungen",
    conflictCard: (market) => `Konflikt · ${market}`,
    whatCollides: "Was kollidiert",
    suggestedResolution: "Vorgeschlagene Lösung",
    openToReview: "Aktivität zur Prüfung öffnen →",
    movePreview: "Verschiebungsvorschau",
    delayRiskCard: (level) => `Verzögerungsrisiko · ${level === "high" ? "Hoch" : "Mittel"}`,
    signalCard: (market) => `Signal · ${market}`,
    watchCard: (market) => `Beobachten · ${market}`,
    activitiesCount: (n) => `${n} Aktivitäten`,
    activityGap: "Aktivitätslücke",
    gapDays: (n) => `${n} Tage`,
    suggestedWindow: "Vorgeschlagenes Zeitfenster",
    externalCard: (market) => `Extern · ${market}`,

    prompts: [
      "Was läuft in Spanien in den nächsten zwei Wochen?",
      "Gibt es Terminkonflikte, die ich kennen sollte?",
      "Welche Movistar-Aktivität ist für diesen Sommer geplant?",
    ],
    evidenceAria: (id, title) => `Beleg ${id}: ${title}`,
    askCalendar: "Kalender fragen",
    chatIntro:
      "Jede Antwort ist auf Ihre Persona zugeschnitten und mit kontrollierter Aktivität belegt.",
    accessingCalendar: "Zugriff auf kontrollierten Kalender…",
    agentActivity: "Agentenaktivität",
    chatError: "Der Kalender-Agent konnte diese Anfrage nicht abschließen. Bitte erneut versuchen.",
    clearChat: "Unterhaltung löschen",
    noEvidence: "Keine Belege gefunden",
    permissionRestricted: "Berechtigung eingeschränkt",
    suggestedNextSteps: "Vorgeschlagene nächste Schritte",
    evidence: "Belege",
    askPlaceholder: "Fragen Sie zu diesem Kalender…",
    send: "Senden",
    citationLabel: (id) => `Beleg [${id}]`,
    extractedSnippet: "Extrahierter Ausschnitt",
    owner: "Verantwortlich",
    confidence: "Konfidenz",
    market: "Markt",

    statLive: "Aktiv",
    statConflicts: "Konflikte",
    statRisks: "Risiken",
    forecastTitle: "10-Tage-Prognose",
    generating: "Wird erstellt…",
    refresh: "Aktualisieren",
    generate: "Erstellen",
    forecastIntro:
      "Erstellen Sie einen zitierten Ausblick auf das, was in den nächsten 10 Tagen aktiv, anstehend und gefährdet ist — zugeschnitten auf Ihre Persona.",
    composingForecast: "Prognose wird aus kontrollierter Aktivität erstellt…",
    citedActivity: "Zitierte Aktivität",
    scheduledNote: (folder, title) =>
      `An den Prüfordner „${folder}“ als „${title}“ gesendet. Es wartet auf Freigabe in Erstellen.`,
    scheduling: "Wird geplant…",
    scheduleToReview: "In Prüfordner planen",
    recurringForecast: "Wiederkehrende Prognose",
    recurringActive: (name, every, folder) =>
      `${name} — ${every} landet eine neue zitierte Prognose zur Freigabe im Prüfordner „${folder}“.`,
    freqEvery: { daily: "täglich", weekly: "wöchentlich", monthly: "monatlich" },
    lastRun: "Letzter Lauf:",
    notYet: "noch nicht",
    cancelling: "Wird abgebrochen…",
    cancelRecurring: "Wiederkehrende Prognose abbrechen",
    recurringIntro:
      "Erhalten Sie diese Prognose nach einem Zeitplan. Jeder Lauf landet als freigabepflichtiger Entwurf im Prüfordner „Planning forecasts“.",
    frequencyAria: (f) => `Häufigkeit ${f}`,
    frequencies: { daily: "Täglich", weekly: "Wöchentlich", monthly: "Monatlich" },
    createRecurring: "Wiederkehrende Prognose erstellen",
  },
  PT: {
    title: "Planejamento unificado",
    subtitle:
      "Calendário governado em Comunicação e Marca — cada bloco restrito à sua persona.",
    sourcesLabel: "Fontes",
    readOnly: "somente leitura",
    all: "Todos",
    filterWord: "filtro",
    prev: "Anterior",
    next: "Próximo",
    today: "Hoje",
    newActivity: "Nova atividade",
    filterLabels: {
      area: "Área",
      market: "Mercado",
      brand: "Marca",
      axis: "Eixo",
      type: "Tipo",
      period: "Período",
    },
    axisFallback: "Eixo",
    views: { month: "Mês", week: "Semana", day: "Dia" },
    periodNextDays: (n) => `Próximos ${n} dias`,
    noCalendarsTitle: "Nenhum calendário conectado",
    noCalendarsBody:
      "Este espaço de trabalho ainda não tem fontes de planejamento governadas. Assim que um calendário somente leitura (Asana, Jira, Google Calendar, Confluence ou Excel) for conectado, sua atividade aparecerá aqui, restrita à sua persona.",
    loadingCalendar: "Carregando calendário governado…",
    nothingTitle: "Nada para mostrar aqui",
    nothingBody:
      "Nenhuma atividade corresponde a estes filtros no seu nível de acesso. Ajuste os filtros ou mude para uma persona com nível de acesso mais alto para ver os horários restritos.",
    axisLegend: "Legenda de eixos",

    types: {
      campaign: "Campanha",
      milestone: "Marco",
      event: "Evento",
      publication: "Publicação",
    },
    statuses: {
      planned: "Planejado",
      in_progress: "Em andamento",
      live: "Ativo",
      done: "Concluído",
      at_risk: "Em risco",
    },
    statusPrefix: "status:",
    sourcePrefix: "fonte:",
    unassignedAxis: "Eixo não atribuído",

    restricted: "Restrito",
    restrictedAria: "Restrito — fora do seu nível de acesso ou área",
    eventAria: (a) =>
      `${a.title} — ${a.type} · ${a.context} · sincronizado de ${a.source} (somente leitura)`,
    moreCount: (n) => `+${n} mais`,
    noActivity: "Sem atividade",
    restrictedActivity: "Atividade restrita",
    noActivityDay: "Nenhuma atividade agendada para este dia.",

    loadingEvent: "Carregando evento…",
    blockedActivity: "Atividade bloqueada",
    restrictedNoteBefore: "Há atividade neste horário, mas está classificada como",
    restrictedNoteAfter:
      "— acima do seu nível de acesso atual. O Hub mostra o horário como ocupado sem revelar seu conteúdo. Mude para uma persona com nível de acesso mais alto ou solicite acesso.",
    metaMarket: "Mercado",
    metaBrand: "Marca",
    metaOwner: "Responsável",
    metaSource: "Fonte",
    metaArea: "Área",
    metaAxis: "Eixo",
    timingConflict: "Conflito de agenda",
    clashesWith: "Isto colide no mesmo mercado e período com:",
    moveActivity: "Mover esta atividade",
    pickNewDate: "Escolher nova data",
    moveInstructions: (source) =>
      `Escolha uma nova data de início e simule o impacto antes de confirmar. A duração é preservada e a alteração é gravada de volta em ${source}.`,
    newStartDate: "Nova data de início",
    simulating: "Simulando…",
    simulateImpact: "Simular impacto",
    moveErrorFallback: "O calendário não pôde aplicar esta movimentação.",
    moving: "Movendo…",
    confirmMove: "Confirmar movimentação",
    cancel: "Cancelar",
    simulateFirst:
      "Simule o impacto primeiro — o Hub só confirma movimentações cujas consequências já mostrou a você.",
    writeBackLog: "Registro de gravação de volta",
    writeBackNote:
      "No cenário ideal, a sincronização é bidirecional — as alterações feitas aqui são gravadas de volta na ferramenta de origem. A gravação de volta está pendente de confirmação com a Telefónica, portanto cada solicitação abaixo está na fila, ainda não confirmada na origem.",
    pendingConfirmation: "Aguardando confirmação",
    requestedBy: (name, date) => `Solicitado por ${name} · ${date}`,
    impactResolves: "Resolve",
    impactNewConflicts: "Novos conflitos",
    impactNearMisses: "Quase conflitos",
    impactExternalSignals: "Sinais externos",
    endsAt: (date) => `(termina ${date})`,

    formIntro: (area) =>
      `Criado na área ${area} com seu nível de acesso. A alteração é gravada de volta no sistema de origem e aparece como pendente até que esse sistema a confirme.`,
    fieldTitle: "Título",
    fieldStartDate: "Data de início",
    fieldEndDate: "Data de término",
    endBeforeStart: "A data de término não pode ser anterior à data de início.",
    fieldType: "Tipo",
    fieldAxis: "Eixo estratégico",
    fieldOwner: "Responsável",
    ownerPlaceholder: "ex.: Prensa Madrid",
    fieldMarket: "Mercado",
    fieldBrand: "Marca",
    fieldSource: "Sistema de origem",
    fieldConfidentiality: "Confidencialidade",
    confidentialityOptions: {
      public: "Público",
      private: "Privado",
      confidential: "Confidencial",
      off_the_record: "Extraoficial",
    },
    clearanceHint: "Você só pode criar atividades no seu nível de acesso ou abaixo dele.",
    fieldDescription: "Descrição",
    formErrorFallback: "O calendário não pôde aceitar esta atividade.",
    creating: "Criando…",
    createActivity: "Criar atividade",

    alertKinds: { milestone: "Marco", conflict: "Conflito", deviation: "Desvio" },
    personalisedAlerts: "Alertas personalizados",
    noAlerts:
      "Nada precisa da sua atenção neste momento. Os alertas aparecem aqui quando um marco se aproxima, surge um conflito ou um plano se desvia para um responsável que você acompanha.",
    alertAria: (title) => `Alerta: ${title}`,

    noPredictive:
      "Nenhum sinal preditivo para o filtro atual. O Hub só exibe heurísticas que pode sustentar com atividade governada.",
    predictiveHeader: "Sinais preditivos — sugestões, não decisões",
    conflictCard: (market) => `Conflito · ${market}`,
    whatCollides: "O que colide",
    suggestedResolution: "Resolução sugerida",
    openToReview: "Abrir atividade para revisar →",
    movePreview: "Prévia da movimentação",
    delayRiskCard: (level) => `Risco de atraso · ${level === "high" ? "Alto" : "Médio"}`,
    signalCard: (market) => `Sinal · ${market}`,
    watchCard: (market) => `Observação · ${market}`,
    activitiesCount: (n) => `${n} atividades`,
    activityGap: "Lacuna de atividade",
    gapDays: (n) => `${n} dias`,
    suggestedWindow: "Janela sugerida",
    externalCard: (market) => `Externo · ${market}`,

    prompts: [
      "O que está no ar na Espanha nas próximas duas semanas?",
      "Há algum conflito de agenda que eu deva conhecer?",
      "Qual atividade da Movistar está planejada para este verão?",
    ],
    evidenceAria: (id, title) => `Citação ${id}: ${title}`,
    askCalendar: "Pergunte ao calendário",
    chatIntro: "Cada resposta é restrita à sua persona e citada a partir de atividade governada.",
    accessingCalendar: "Acessando calendário governado…",
    agentActivity: "Atividade do agente",
    chatError: "O agente do calendário não conseguiu concluir esta solicitação. Tente novamente.",
    clearChat: "Limpar conversa",
    noEvidence: "Nenhuma evidência encontrada",
    permissionRestricted: "Permissão restrita",
    suggestedNextSteps: "Próximos passos sugeridos",
    evidence: "Evidência",
    askPlaceholder: "Pergunte sobre este calendário…",
    send: "Enviar",
    citationLabel: (id) => `Citação [${id}]`,
    extractedSnippet: "Trecho extraído",
    owner: "Responsável",
    confidence: "Confiança",
    market: "Mercado",

    statLive: "Ativos",
    statConflicts: "Conflitos",
    statRisks: "Riscos",
    forecastTitle: "Previsão de 10 dias",
    generating: "Gerando…",
    refresh: "Atualizar",
    generate: "Gerar",
    forecastIntro:
      "Gere uma perspectiva citada do que está no ar, do que está por vir e do que está em risco nos próximos 10 dias — restrita à sua persona.",
    composingForecast: "Compondo a previsão a partir de atividade governada…",
    citedActivity: "Atividade citada",
    scheduledNote: (folder, title) =>
      `Enviado à pasta de revisão "${folder}" como "${title}". Está aguardando aprovação em Gerar.`,
    scheduling: "Agendando…",
    scheduleToReview: "Agendar na pasta de revisão",
    recurringForecast: "Previsão recorrente",
    recurringActive: (name, every, folder) =>
      `${name} — ${every}, uma nova previsão citada chega à pasta de revisão "${folder}" para aprovação.`,
    freqEvery: { daily: "todo dia", weekly: "toda semana", monthly: "todo mês" },
    lastRun: "Última execução:",
    notYet: "ainda não",
    cancelling: "Cancelando…",
    cancelRecurring: "Cancelar previsão recorrente",
    recurringIntro:
      'Receba esta previsão de forma programada. Cada execução chega como um rascunho sujeito a aprovação na pasta de revisão "Planning forecasts".',
    frequencyAria: (f) => `Frequência ${f}`,
    frequencies: { daily: "Diário", weekly: "Semanal", monthly: "Mensal" },
    createRecurring: "Criar previsão recorrente",
  },
};
