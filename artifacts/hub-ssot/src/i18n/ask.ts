// Localized strings for the Ask page (pages/ask.tsx). Chrome strings for the
// header/filters toggle stay in ../i18n (UI[lang].ask); everything else that is
// user-facing and static lives here so switching language changes the whole
// page. Server-provided dynamic content (answers, citations, step labels,
// permission notes) is never translated here.

import type { Lang } from "../components/app-provider";

export interface AskStrings {
  sessions: {
    newConversation: string;
    conversations: string;
    noConversations: string;
    savedInsights: string;
    turnsCount: (n: number) => string;
  };
  time: {
    justNow: string;
    minutesAgo: (n: number) => string;
    hoursAgo: (n: number) => string;
    daysAgo: (n: number) => string;
  };
  filters: {
    scope: string;
    all: string;
    market: string;
    brand: string;
    period: string;
    source: string;
    axis: string;
    clear: string;
  };
  firstRun: {
    title: string;
    body: string;
  };
  kind: Record<string, string>;
  run: {
    contacting: string;
    showActions: string;
    hideActions: string;
    doneActions: (n: number) => string;
    agentActions: string;
  };
  turnError: string;
  answer: {
    noEvidence: string;
    closestDatum: string;
    datumSuffix: string;
    permissionBlocked: string;
    sourcesDisagree: string;
    resolveIn: (path: string) => string;
    lowConfidence: string;
    lowConfidenceFallback: string;
    historicMaterial: string;
    historicFallback: string;
    corroborated: string;
    attachment: string;
    evidence: string;
    sources: string;
    exportToGenerate: string;
    saved: string;
    saveInsight: string;
    drillIntoData: string;
    suggestedNext: string;
  };
  validity: Record<string, string>;
  evidence: {
    conflict: string;
    agree: (n: number) => string;
  };
  composer: {
    workingContext: string;
    willIngest: string;
    ingestToCorpus: string;
    removeAttachment: string;
    attachDocument: string;
    placeholderScoped: string;
    placeholderDefault: string;
    sendQuestion: string;
    permissionNote: string;
  };
  documents: {
    heading: string;
    workspace: string;
    downloadPack: string;
    guardianBlocked: string;
    downloadFailed: string;
    citationsCount: (n: number) => string;
  };
  drawer: {
    citation: (id: string) => string;
    governance: string;
    version: string;
    owner: string;
    confidence: string;
    validUntil: string;
    relevance: string;
    corroboration: string;
    corroborationSources: (n: number) => string;
    conflict: string;
    disagrees: string;
    evidence: string;
    semanticLayer: string;
    topics: string;
    entities: string;
    axes: string;
    scope: string;
  };
}

export const ASK_I18N: Record<Lang, AskStrings> = {
  EN: {
    sessions: {
      newConversation: "New conversation",
      conversations: "Conversations",
      noConversations: "No conversations for this persona yet.",
      savedInsights: "Saved insights",
      turnsCount: (n) => `${n} turn${n === 1 ? "" : "s"}`,
    },
    time: {
      justNow: "just now",
      minutesAgo: (n) => `${n}m ago`,
      hoursAgo: (n) => `${n}h ago`,
      daysAgo: (n) => `${n}d ago`,
    },
    filters: {
      scope: "Retrieval scope",
      all: "All",
      market: "Market",
      brand: "Brand",
      period: "Period",
      source: "Source",
      axis: "Axis",
      clear: "Clear",
    },
    firstRun: {
      title: "Ask the governed source of truth",
      body: "Every answer is backed by cited evidence — or an honest no-evidence, permission-blocked, conflict or historic response. Nothing is fabricated.",
    },
    kind: {
      cited: "Cited",
      no_evidence: "No evidence",
      permission: "Permission",
      historic: "Historic",
    },
    run: {
      contacting: "Contacting the governed agent…",
      showActions: "Show agent actions",
      hideActions: "Hide agent actions",
      doneActions: (n) => `Done · ${n} agent action${n === 1 ? "" : "s"}`,
      agentActions: "Agent actions",
    },
    turnError: "The Hub could not complete this request. Please try again.",
    answer: {
      noEvidence: "No evidence",
      closestDatum: "Closest governed datum:",
      datumSuffix: "— offered as context, not an answer.",
      permissionBlocked: "Permission blocked",
      sourcesDisagree: "Sources disagree",
      resolveIn: (path) => `Resolve in ${path}`,
      lowConfidence: "Low confidence",
      lowConfidenceFallback:
        "Low confidence: this rests on a single, unverified source.",
      historicMaterial: "Historic material",
      historicFallback: "This answer draws on historic or superseded material.",
      corroborated: "Corroborated",
      attachment: "Attachment",
      evidence: "Evidence",
      sources: "Sources",
      exportToGenerate: "Export to Generate",
      saved: "Saved",
      saveInsight: "Save insight",
      drillIntoData: "Drill into Data",
      suggestedNext: "Suggested next",
    },
    validity: {
      approved: "Approved",
      historic: "Historic",
      review: "Review",
      superseded: "Superseded",
    },
    evidence: {
      conflict: "conflict",
      agree: (n) => `+${n} agree`,
    },
    composer: {
      workingContext: "working context",
      willIngest: "Will ingest as E-data",
      ingestToCorpus: "Ingest to corpus",
      removeAttachment: "Remove attachment",
      attachDocument: "Attach a working document",
      placeholderScoped: "Ask within the active retrieval scope…",
      placeholderDefault: "Ask about strategy, brand, or corporate facts…",
      sendQuestion: "Send question",
      permissionNote:
        "Answers are permission-filtered before the model sees any source.",
    },
    drawer: {
      citation: (id) => `Citation [${id}]`,
      governance: "Governance",
      version: "Version",
      owner: "Owner",
      confidence: "Confidence",
      validUntil: "Valid until",
      relevance: "Relevance",
      corroboration: "Corroboration",
      corroborationSources: (n) => `${n} sources`,
      conflict: "Conflict",
      disagrees: "Disagrees",
      evidence: "Evidence",
      semanticLayer: "Semantic layer",
      topics: "Topics",
      entities: "Entities",
      axes: "Axes",
      scope: "Scope",
    },
    documents: {
      heading: "Generated documents",
      workspace: "Documents in this conversation",
      downloadPack: "Download all (ZIP)",
      guardianBlocked: "Blocked by the Brand Guardian — downloads locked",
      downloadFailed: "Download failed",
      citationsCount: (n) => `${n} citation${n === 1 ? "" : "s"}`,
    },
  },
  ES: {
    sessions: {
      newConversation: "Nueva conversación",
      conversations: "Conversaciones",
      noConversations: "Aún no hay conversaciones para esta persona.",
      savedInsights: "Ideas guardadas",
      turnsCount: (n) => `${n} turno${n === 1 ? "" : "s"}`,
    },
    time: {
      justNow: "ahora mismo",
      minutesAgo: (n) => `hace ${n} min`,
      hoursAgo: (n) => `hace ${n} h`,
      daysAgo: (n) => `hace ${n} d`,
    },
    filters: {
      scope: "Ámbito de recuperación",
      all: "Todos",
      market: "Mercado",
      brand: "Marca",
      period: "Periodo",
      source: "Fuente",
      axis: "Eje",
      clear: "Limpiar",
    },
    firstRun: {
      title: "Pregunta a la fuente única de la verdad gobernada",
      body: "Cada respuesta se respalda con evidencia citada — o con una respuesta honesta de sin evidencia, bloqueada por permisos, en conflicto o histórica. Nada se inventa.",
    },
    kind: {
      cited: "Citada",
      no_evidence: "Sin evidencia",
      permission: "Permisos",
      historic: "Histórica",
    },
    run: {
      contacting: "Contactando con el agente gobernado…",
      showActions: "Mostrar acciones del agente",
      hideActions: "Ocultar acciones del agente",
      doneActions: (n) =>
        `Listo · ${n} acción${n === 1 ? "" : "es"} del agente`,
      agentActions: "Acciones del agente",
    },
    turnError: "El Hub no pudo completar esta solicitud. Inténtalo de nuevo.",
    answer: {
      noEvidence: "Sin evidencia",
      closestDatum: "Dato gobernado más cercano:",
      datumSuffix: "— ofrecido como contexto, no como respuesta.",
      permissionBlocked: "Bloqueado por permisos",
      sourcesDisagree: "Las fuentes no coinciden",
      resolveIn: (path) => `Resolver en ${path}`,
      lowConfidence: "Confianza baja",
      lowConfidenceFallback:
        "Confianza baja: se basa en una única fuente sin verificar.",
      historicMaterial: "Material histórico",
      historicFallback:
        "Esta respuesta se basa en material histórico o reemplazado.",
      corroborated: "Corroborado",
      attachment: "Adjunto",
      evidence: "Evidencia",
      sources: "Fuentes",
      exportToGenerate: "Exportar a Generar",
      saved: "Guardado",
      saveInsight: "Guardar idea",
      drillIntoData: "Explorar en el Centro de datos",
      suggestedNext: "Siguiente sugerido",
    },
    validity: {
      approved: "Aprobado",
      historic: "Histórico",
      review: "En revisión",
      superseded: "Reemplazado",
    },
    evidence: {
      conflict: "conflicto",
      agree: (n) => `+${n} coinciden`,
    },
    composer: {
      workingContext: "contexto de trabajo",
      willIngest: "Se ingerirá como E-data",
      ingestToCorpus: "Ingerir al corpus",
      removeAttachment: "Quitar adjunto",
      attachDocument: "Adjuntar un documento de trabajo",
      placeholderScoped: "Pregunta dentro del ámbito de recuperación activo…",
      placeholderDefault:
        "Pregunta sobre estrategia, marca o datos corporativos…",
      sendQuestion: "Enviar pregunta",
      permissionNote:
        "Las respuestas se filtran por permisos antes de que el modelo vea cualquier fuente.",
    },
    drawer: {
      citation: (id) => `Cita [${id}]`,
      governance: "Gobernanza",
      version: "Versión",
      owner: "Responsable",
      confidence: "Confianza",
      validUntil: "Válido hasta",
      relevance: "Relevancia",
      corroboration: "Corroboración",
      corroborationSources: (n) => `${n} fuentes`,
      conflict: "Conflicto",
      disagrees: "No coincide",
      evidence: "Evidencia",
      semanticLayer: "Capa semántica",
      topics: "Temas",
      entities: "Entidades",
      axes: "Ejes",
      scope: "Ámbito",
    },
    documents: {
      heading: "Documentos generados",
      workspace: "Documentos de esta conversación",
      downloadPack: "Descargar todo (ZIP)",
      guardianBlocked: "Bloqueado por el Brand Guardian — descargas bloqueadas",
      downloadFailed: "La descarga ha fallado",
      citationsCount: (n) => `${n} cita${n === 1 ? "" : "s"}`,
    },
  },
  DE: {
    sessions: {
      newConversation: "Neue Unterhaltung",
      conversations: "Unterhaltungen",
      noConversations: "Für diese Persona gibt es noch keine Unterhaltungen.",
      savedInsights: "Gespeicherte Erkenntnisse",
      turnsCount: (n) => `${n} Runde${n === 1 ? "" : "n"}`,
    },
    time: {
      justNow: "gerade eben",
      minutesAgo: (n) => `vor ${n} Min.`,
      hoursAgo: (n) => `vor ${n} Std.`,
      daysAgo: (n) => `vor ${n} ${n === 1 ? "Tag" : "Tagen"}`,
    },
    filters: {
      scope: "Abrufbereich",
      all: "Alle",
      market: "Markt",
      brand: "Marke",
      period: "Zeitraum",
      source: "Quelle",
      axis: "Achse",
      clear: "Zurücksetzen",
    },
    firstRun: {
      title: "Fragen Sie die kontrollierte Single Source of Truth",
      body: "Jede Antwort ist durch zitierte Belege gestützt — oder durch eine ehrliche Antwort ohne Belege, mit Berechtigungssperre, mit Widerspruch oder mit historischem Bezug. Nichts wird erfunden.",
    },
    kind: {
      cited: "Zitiert",
      no_evidence: "Keine Belege",
      permission: "Berechtigung",
      historic: "Historisch",
    },
    run: {
      contacting: "Verbindung zum kontrollierten Agenten…",
      showActions: "Agentenaktionen anzeigen",
      hideActions: "Agentenaktionen ausblenden",
      doneActions: (n) =>
        `Fertig · ${n} Agentenaktion${n === 1 ? "" : "en"}`,
      agentActions: "Agentenaktionen",
    },
    turnError:
      "Der Hub konnte diese Anfrage nicht abschließen. Bitte versuchen Sie es erneut.",
    answer: {
      noEvidence: "Keine Belege",
      closestDatum: "Nächstgelegener kontrollierter Datenpunkt:",
      datumSuffix: "— als Kontext angeboten, nicht als Antwort.",
      permissionBlocked: "Durch Berechtigung gesperrt",
      sourcesDisagree: "Quellen widersprechen sich",
      resolveIn: (path) => `In ${path} auflösen`,
      lowConfidence: "Geringe Konfidenz",
      lowConfidenceFallback:
        "Geringe Konfidenz: Dies beruht auf einer einzigen, ungeprüften Quelle.",
      historicMaterial: "Historisches Material",
      historicFallback:
        "Diese Antwort stützt sich auf historisches oder ersetztes Material.",
      corroborated: "Bestätigt",
      attachment: "Anhang",
      evidence: "Belege",
      sources: "Quellen",
      exportToGenerate: "Nach Erstellen exportieren",
      saved: "Gespeichert",
      saveInsight: "Erkenntnis speichern",
      drillIntoData: "Im Datenzentrum vertiefen",
      suggestedNext: "Nächster Vorschlag",
    },
    validity: {
      approved: "Freigegeben",
      historic: "Historisch",
      review: "In Prüfung",
      superseded: "Ersetzt",
    },
    evidence: {
      conflict: "Widerspruch",
      agree: (n) => `+${n} stimmen zu`,
    },
    composer: {
      workingContext: "Arbeitskontext",
      willIngest: "Wird als E-data aufgenommen",
      ingestToCorpus: "In Korpus aufnehmen",
      removeAttachment: "Anhang entfernen",
      attachDocument: "Arbeitsdokument anhängen",
      placeholderScoped: "Fragen Sie innerhalb des aktiven Abrufbereichs…",
      placeholderDefault:
        "Fragen Sie zu Strategie, Marke oder Unternehmensfakten…",
      sendQuestion: "Frage senden",
      permissionNote:
        "Antworten werden nach Berechtigungen gefiltert, bevor das Modell eine Quelle sieht.",
    },
    drawer: {
      citation: (id) => `Zitat [${id}]`,
      governance: "Governance",
      version: "Version",
      owner: "Verantwortlich",
      confidence: "Konfidenz",
      validUntil: "Gültig bis",
      relevance: "Relevanz",
      corroboration: "Bestätigung",
      corroborationSources: (n) => `${n} Quellen`,
      conflict: "Widerspruch",
      disagrees: "Widerspricht",
      evidence: "Belege",
      semanticLayer: "Semantische Ebene",
      topics: "Themen",
      entities: "Entitäten",
      axes: "Achsen",
      scope: "Bereich",
    },
    documents: {
      heading: "Erstellte Dokumente",
      workspace: "Dokumente in diesem Gespräch",
      downloadPack: "Alles herunterladen (ZIP)",
      guardianBlocked: "Vom Brand Guardian blockiert — Downloads gesperrt",
      downloadFailed: "Download fehlgeschlagen",
      citationsCount: (n) => `${n} Zitat${n === 1 ? "" : "e"}`,
    },
  },
  PT: {
    sessions: {
      newConversation: "Nova conversa",
      conversations: "Conversas",
      noConversations: "Ainda não há conversas para esta persona.",
      savedInsights: "Insights salvos",
      turnsCount: (n) => `${n} turno${n === 1 ? "" : "s"}`,
    },
    time: {
      justNow: "agora mesmo",
      minutesAgo: (n) => `há ${n} min`,
      hoursAgo: (n) => `há ${n} h`,
      daysAgo: (n) => `há ${n} d`,
    },
    filters: {
      scope: "Escopo de recuperação",
      all: "Todos",
      market: "Mercado",
      brand: "Marca",
      period: "Período",
      source: "Fonte",
      axis: "Eixo",
      clear: "Limpar",
    },
    firstRun: {
      title: "Pergunte à fonte única da verdade governada",
      body: "Cada resposta é sustentada por evidências citadas — ou por uma resposta honesta de sem evidência, bloqueada por permissão, em conflito ou histórica. Nada é inventado.",
    },
    kind: {
      cited: "Citada",
      no_evidence: "Sem evidência",
      permission: "Permissão",
      historic: "Histórica",
    },
    run: {
      contacting: "Contatando o agente governado…",
      showActions: "Mostrar ações do agente",
      hideActions: "Ocultar ações do agente",
      doneActions: (n) =>
        `Concluído · ${n} ação${n === 1 ? "" : "ões"} do agente`,
      agentActions: "Ações do agente",
    },
    turnError:
      "O Hub não conseguiu concluir esta solicitação. Tente novamente.",
    answer: {
      noEvidence: "Sem evidência",
      closestDatum: "Dado governado mais próximo:",
      datumSuffix: "— oferecido como contexto, não como resposta.",
      permissionBlocked: "Bloqueado por permissão",
      sourcesDisagree: "As fontes divergem",
      resolveIn: (path) => `Resolver em ${path}`,
      lowConfidence: "Baixa confiança",
      lowConfidenceFallback:
        "Baixa confiança: baseia-se em uma única fonte não verificada.",
      historicMaterial: "Material histórico",
      historicFallback:
        "Esta resposta se baseia em material histórico ou substituído.",
      corroborated: "Corroborado",
      attachment: "Anexo",
      evidence: "Evidência",
      sources: "Fontes",
      exportToGenerate: "Exportar para Gerar",
      saved: "Salvo",
      saveInsight: "Salvar insight",
      drillIntoData: "Explorar na Central de dados",
      suggestedNext: "Próximo sugerido",
    },
    validity: {
      approved: "Aprovado",
      historic: "Histórico",
      review: "Em revisão",
      superseded: "Substituído",
    },
    evidence: {
      conflict: "conflito",
      agree: (n) => `+${n} concordam`,
    },
    composer: {
      workingContext: "contexto de trabalho",
      willIngest: "Será ingerido como E-data",
      ingestToCorpus: "Ingerir no corpus",
      removeAttachment: "Remover anexo",
      attachDocument: "Anexar um documento de trabalho",
      placeholderScoped: "Pergunte dentro do escopo de recuperação ativo…",
      placeholderDefault:
        "Pergunte sobre estratégia, marca ou fatos corporativos…",
      sendQuestion: "Enviar pergunta",
      permissionNote:
        "As respostas são filtradas por permissão antes de o modelo ver qualquer fonte.",
    },
    drawer: {
      citation: (id) => `Citação [${id}]`,
      governance: "Governança",
      version: "Versão",
      owner: "Responsável",
      confidence: "Confiança",
      validUntil: "Válido até",
      relevance: "Relevância",
      corroboration: "Corroboração",
      corroborationSources: (n) => `${n} fontes`,
      conflict: "Conflito",
      disagrees: "Diverge",
      evidence: "Evidência",
      semanticLayer: "Camada semântica",
      topics: "Tópicos",
      entities: "Entidades",
      axes: "Eixos",
      scope: "Escopo",
    },
    documents: {
      heading: "Documentos gerados",
      workspace: "Documentos desta conversa",
      downloadPack: "Transferir tudo (ZIP)",
      guardianBlocked: "Bloqueado pelo Brand Guardian — transferências bloqueadas",
      downloadFailed: "A transferência falhou",
      citationsCount: (n) => `${n} citação${n === 1 ? "" : "s"}`,
    },
  },
};

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

// Display label for a server-provided citation validity enum, with a safe
// fallback to the raw value for any status not covered by the dictionary.
export function validityLabel(value: string, t: AskStrings): string {
  return t.validity[value] ?? value;
}

// Display label for a server-provided suggestion kind, falling back to the raw
// (underscore-normalized) value when a kind isn't in the dictionary.
export function kindLabel(kind: string, t: AskStrings): string {
  return t.kind[kind] ?? kind.replace("_", " ");
}
