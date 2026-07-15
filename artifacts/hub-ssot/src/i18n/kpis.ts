// UI strings for the KPIs & Objectives page. Server-provided content (KPI
// names, descriptions, source titles, answers, owner names, blend text) stays
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

type PeriodKey = "week" | "month" | "quarter" | "custom";

const KPIS_EN = {
  periodLabels: {
    week: "Weekly",
    month: "Monthly",
    quarter: "Quarterly",
    custom: "Custom range",
  } as Record<PeriodKey, string>,
  statusLabels: {
    "on-track": "On track",
    amber: "At risk",
    "off-track": "Off track",
  } as Record<string, string>,
  validityLabels: {
    approved: "Approved",
    historic: "Historic",
    superseded: "Superseded",
    draft: "Draft",
  } as Record<string, string>,
  severityLabels: {
    amber: "At risk",
    critical: "Critical",
    forecast: "Forecast risk",
  } as Record<string, string>,

  pageTitle: "KPIs & Objectives",
  pageSubtitle: (area: string) =>
    `Governed objective tracking for ${area}. Every figure is a cited blend of governed sources, scoped to your clearance.`,
  alerts: "Alerts",
  alertsCount: (n: number) => `Alerts (${n})`,
  generateReport: "Generate KPI report",
  reportRangePhrase: (area: string, from: string, to: string) =>
    `KPI report for ${area} covering ${from} to ${to}`,
  reportPeriodPhrase: (periodLabel: string, area: string) =>
    `${periodLabel} KPI report for ${area}`,
  reportSummary: (
    total: number,
    onTrack: number,
    atRisk: number,
    offTrack: number,
    names: string,
    hasMore: boolean,
  ) =>
    `: ${total} tracked objectives, ${onTrack} on track, ${atRisk} at risk, ${offTrack} off track. Covering ${names}${hasMore ? " and others" : ""}.`,
  reportFocus: (names: string) => ` Focus on deviations: ${names}.`,
  period: "Period",
  from: "From",
  to: "To",

  rangeInvalid:
    "The start date is after the end date — swap the dates to apply the range.",
  rangePrompt:
    "Pick a from and to date to apply the custom range. Cards, drill-downs and the scoped chat will recalculate for that window.",

  tracked: "Tracked",

  filterAxis: "Axis",
  allAxes: "All axes",
  filterMarket: "Market",
  allMarkets: "All markets",
  filterBrand: "Brand",
  allBrands: "All brands",
  filterSource: "Source",
  allSources: "All sources",
  filterInitiative: "Initiative",
  allInitiatives: "All initiatives",
  filterObjective: "Objective",
  allObjectives: "All objectives",

  emptyTitle: "No objectives in scope",
  emptyBody:
    "There are no governed KPIs for this persona and filter combination. Clear a filter, switch reporting period, or change persona to see tracked objectives.",

  openKpi: (name: string) => `Open ${name}`,
  target: "Target",
  blend: "Blend",
  conflict: "Conflict",
  historic: "Historic",
  noSource: "No source",
  confidencePct: (n: number) => `${n}% confidence`,
  singleSource: "Single source",

  viewCitationAria: (n: number) => `View citation S${n}`,
  evidenceWithheld: "Evidence withheld — above your clearance.",
  weight: "Weight",
  viewCitation: "View citation",
  citationLabel: (n: number) => `Citation S${n}`,
  extractedSnippet: "Extracted snippet",
  noSnippet: "This external signal has no extracted snippet.",
  evidenceAboveClearance:
    "This evidence is above your current clearance, so the Hub will not reveal its snippet. Its contribution to the blend is still governed and fails closed.",
  version: "Version",
  owner: "Owner",
  confidence: "Confidence",

  chatHeading: "Ask about this KPI",
  chatIntro:
    "Ask why this metric moved, what is driving it, or how it compares — answered only from the governed evidence behind this KPI, with citations.",
  chatPlaceholder: "Why did this move?",
  chatViewHeading: "Ask about the objectives in view",
  chatViewIntro:
    "Ask across every KPI currently on screen — what is on track, what is slipping, and why — answered only from the governed evidence behind them, with citations.",
  chatViewPlaceholder: "Which objectives are off track, and why?",
  readingEvidence: "Reading the evidence...",
  chatError: "Something went wrong while answering. Please try again.",
  agentActionsDone: (n: number) => `Done · ${n} agent action${n === 1 ? "" : "s"}`,
  showAgentActions: "Show agent actions",
  hideAgentActions: "Hide agent actions",
  sendQuestion: "Send question",
  drawsHistoric: "Draws on historic material.",

  definition: "Definition",
  amberBelow: "Amber below",
  criticalBelow: "Critical below",
  current: "Current",
  progress: "% of target",
  conflictBody:
    "Composing sources disagree on this metric. The headline uses the weighted blend; open the sources below to see the divergence.",
  trendVsTarget: "Trend vs target",
  breakdownBy: "Breakdown by",
  forecast: "Forecast",
  composingSources: "Composing sources",
  blendPrefix: "Blend:",

  acknowledged: "Acknowledged",
  acknowledge: "Acknowledge",
  notified: "Notified",
  by: "By",

  thresholdAlerts: "Threshold alerts",
  alertsDrawerBody:
    "Raised when a governed KPI crosses its configured amber or critical threshold, or its forecast points at a miss. Each alert records who was notified, on which channel, and who acknowledged it — scoped to your clearance.",
  checkingThresholds: "Checking thresholds...",
  noThresholdAlerts:
    "No threshold alerts for the objectives visible to this persona.",

  kpiDetail: "KPI detail",
  kpiRestricted: "This KPI is restricted",
  kpiRestrictedBody:
    "Your current persona is not cleared to open this objective or its evidence.",

  askAboutKpis: "Ask about these KPIs",
  answeredFrom: (n: number) =>
    `Answered only from the governed evidence behind the ${n} ${n === 1 ? "objective" : "objectives"} in view, scoped to your clearance.`,
  openAnyKpi:
    "Open any KPI to see its trend, breakdowns, composing sources and a scoped, cited chat.",
};

export type KpisStrings = typeof KPIS_EN;

export const KPIS_I18N: Record<Lang, KpisStrings> = {
  EN: KPIS_EN,
  ES: {
    periodLabels: {
      week: "Semanal",
      month: "Mensual",
      quarter: "Trimestral",
      custom: "Rango personalizado",
    },
    statusLabels: {
      "on-track": "En objetivo",
      amber: "En riesgo",
      "off-track": "Desviado",
    },
    validityLabels: {
      approved: "Aprobado",
      historic: "Histórico",
      superseded: "Reemplazado",
      draft: "Borrador",
    },
    severityLabels: {
      amber: "En riesgo",
      critical: "Crítico",
      forecast: "Riesgo previsto",
    },

    pageTitle: "KPIs y objetivos",
    pageSubtitle: (area) =>
      `Seguimiento gobernado de objetivos para ${area}. Cada cifra es una combinación citada de fuentes gobernadas, ajustada a tu nivel de acceso.`,
    alerts: "Alertas",
    alertsCount: (n) => `Alertas (${n})`,
    generateReport: "Generar informe de KPIs",
    reportRangePhrase: (area: string, from: string, to: string) =>
      `Informe de KPIs de ${area} del ${from} al ${to}`,
    reportPeriodPhrase: (periodLabel: string, area: string) =>
      `Informe ${periodLabel.toLowerCase()} de KPIs de ${area}`,
    reportSummary: (
      total: number,
      onTrack: number,
      atRisk: number,
      offTrack: number,
      names: string,
      hasMore: boolean,
    ) =>
      `: ${total} objetivos seguidos, ${onTrack} en curso, ${atRisk} en riesgo, ${offTrack} desviados. Incluye ${names}${hasMore ? " y otros" : ""}.`,
    reportFocus: (names: string) => ` Atención a las desviaciones: ${names}.`,
    period: "Periodo",
    from: "Desde",
    to: "Hasta",

    rangeInvalid:
      "La fecha de inicio es posterior a la de fin: intercambia las fechas para aplicar el rango.",
    rangePrompt:
      "Elige una fecha de inicio y de fin para aplicar el rango personalizado. Las tarjetas, los desgloses y el chat contextual se recalcularán para esa ventana.",

    tracked: "En seguimiento",

    filterAxis: "Eje",
    allAxes: "Todos los ejes",
    filterMarket: "Mercado",
    allMarkets: "Todos los mercados",
    filterBrand: "Marca",
    allBrands: "Todas las marcas",
    filterSource: "Fuente",
    allSources: "Todas las fuentes",
    filterInitiative: "Iniciativa",
    allInitiatives: "Todas las iniciativas",
    filterObjective: "Objetivo",
    allObjectives: "Todos los objetivos",

    emptyTitle: "No hay objetivos en el ámbito",
    emptyBody:
      "No hay KPIs gobernados para esta persona y esta combinación de filtros. Quita un filtro, cambia el periodo de informe o cambia de persona para ver los objetivos en seguimiento.",

    openKpi: (name) => `Abrir ${name}`,
    target: "Meta",
    blend: "Combinación",
    conflict: "Conflicto",
    historic: "Histórico",
    noSource: "Sin fuente",
    confidencePct: (n) => `${n}% de confianza`,
    singleSource: "Fuente única",

    viewCitationAria: (n) => `Ver cita S${n}`,
    evidenceWithheld:
      "Evidencia no mostrada: por encima de tu nivel de acceso.",
    weight: "Peso",
    viewCitation: "Ver cita",
    citationLabel: (n) => `Cita S${n}`,
    extractedSnippet: "Fragmento extraído",
    noSnippet: "Esta señal externa no tiene fragmento extraído.",
    evidenceAboveClearance:
      "Esta evidencia está por encima de tu nivel de acceso actual, por lo que el Hub no mostrará su fragmento. Su contribución a la combinación sigue estando gobernada y falla de forma segura.",
    version: "Versión",
    owner: "Responsable",
    confidence: "Confianza",

    chatHeading: "Pregunta sobre este KPI",
    chatIntro:
      "Pregunta por qué se ha movido esta métrica, qué la impulsa o cómo se compara: se responde solo con la evidencia gobernada de este KPI, con citas.",
    chatPlaceholder: "¿Por qué se ha movido?",
    chatViewHeading: "Pregunta sobre los objetivos visibles",
    chatViewIntro:
      "Pregunta sobre todos los KPIs en pantalla: qué va bien, qué se está desviando y por qué; se responde solo con la evidencia gobernada que los respalda, con citas.",
    chatViewPlaceholder: "¿Qué objetivos están desviados y por qué?",
    readingEvidence: "Leyendo la evidencia...",
    chatError: "Algo ha fallado al responder. Inténtalo de nuevo.",
    agentActionsDone: (n: number) =>
      `Hecho · ${n} ${n === 1 ? "acción" : "acciones"} del agente`,
    showAgentActions: "Mostrar acciones del agente",
    hideAgentActions: "Ocultar acciones del agente",
    sendQuestion: "Enviar pregunta",
    drawsHistoric: "Se basa en material histórico.",

    definition: "Definición",
    amberBelow: "Ámbar por debajo de",
    criticalBelow: "Crítico por debajo de",
    current: "Actual",
    progress: "% del objetivo",
    conflictBody:
      "Las fuentes que la componen no coinciden en esta métrica. La cifra principal usa la combinación ponderada; abre las fuentes de abajo para ver la divergencia.",
    trendVsTarget: "Tendencia frente al objetivo",
    breakdownBy: "Desglose por",
    forecast: "Previsión",
    composingSources: "Fuentes que la componen",
    blendPrefix: "Combinación:",

    acknowledged: "Confirmada",
    acknowledge: "Confirmar",
    notified: "Notificado",
    by: "Por",

    thresholdAlerts: "Alertas de umbral",
    alertsDrawerBody:
      "Se generan cuando un KPI gobernado supera su umbral ámbar o crítico configurado, o cuando su previsión apunta a un incumplimiento. Cada alerta registra a quién se notificó, por qué canal y quién la confirmó, según tu nivel de acceso.",
    checkingThresholds: "Comprobando umbrales...",
    noThresholdAlerts:
      "No hay alertas de umbral para los objetivos visibles para esta persona.",

    kpiDetail: "Detalle del KPI",
    kpiRestricted: "Este KPI está restringido",
    kpiRestrictedBody:
      "Tu persona actual no tiene permiso para abrir este objetivo ni su evidencia.",

    askAboutKpis: "Pregunta sobre estos KPIs",
    answeredFrom: (n) =>
      `Respondido solo con la evidencia gobernada de ${n} ${n === 1 ? "objetivo" : "objetivos"} en vista, según tu nivel de acceso.`,
    openAnyKpi:
      "Abre cualquier KPI para ver su tendencia, sus desgloses, las fuentes que lo componen y un chat contextual con citas.",
  },
  DE: {
    periodLabels: {
      week: "Wöchentlich",
      month: "Monatlich",
      quarter: "Quartalsweise",
      custom: "Benutzerdefinierter Zeitraum",
    },
    statusLabels: {
      "on-track": "Auf Kurs",
      amber: "Gefährdet",
      "off-track": "Nicht auf Kurs",
    },
    validityLabels: {
      approved: "Freigegeben",
      historic: "Historisch",
      superseded: "Ersetzt",
      draft: "Entwurf",
    },
    severityLabels: {
      amber: "Gefährdet",
      critical: "Kritisch",
      forecast: "Prognoserisiko",
    },

    pageTitle: "KPIs & Ziele",
    pageSubtitle: (area) =>
      `Governance-gesichertes Zieltracking für ${area}. Jede Kennzahl ist eine zitierte Kombination kontrollierter Quellen, begrenzt auf Ihre Berechtigung.`,
    alerts: "Warnungen",
    alertsCount: (n) => `Warnungen (${n})`,
    generateReport: "KPI-Bericht erstellen",
    reportRangePhrase: (area: string, from: string, to: string) =>
      `KPI-Bericht für ${area} vom ${from} bis ${to}`,
    reportPeriodPhrase: (periodLabel: string, area: string) =>
      `KPI-Bericht (${periodLabel.toLowerCase()}) für ${area}`,
    reportSummary: (
      total: number,
      onTrack: number,
      atRisk: number,
      offTrack: number,
      names: string,
      hasMore: boolean,
    ) =>
      `: ${total} verfolgte Ziele, ${onTrack} im Plan, ${atRisk} gefährdet, ${offTrack} abweichend. Umfasst ${names}${hasMore ? " und weitere" : ""}.`,
    reportFocus: (names: string) => ` Fokus auf Abweichungen: ${names}.`,
    period: "Zeitraum",
    from: "Von",
    to: "Bis",

    rangeInvalid:
      "Das Startdatum liegt nach dem Enddatum – tauschen Sie die Daten, um den Zeitraum anzuwenden.",
    rangePrompt:
      "Wählen Sie ein Start- und Enddatum, um den benutzerdefinierten Zeitraum anzuwenden. Karten, Detailansichten und der kontextbezogene Chat werden für dieses Fenster neu berechnet.",

    tracked: "Erfasst",

    filterAxis: "Achse",
    allAxes: "Alle Achsen",
    filterMarket: "Markt",
    allMarkets: "Alle Märkte",
    filterBrand: "Marke",
    allBrands: "Alle Marken",
    filterSource: "Quelle",
    allSources: "Alle Quellen",
    filterInitiative: "Initiative",
    allInitiatives: "Alle Initiativen",
    filterObjective: "Ziel",
    allObjectives: "Alle Ziele",

    emptyTitle: "Keine Ziele im Bereich",
    emptyBody:
      "Für diese Persona und Filterkombination gibt es keine kontrollierten KPIs. Entfernen Sie einen Filter, ändern Sie den Berichtszeitraum oder wechseln Sie die Persona, um erfasste Ziele zu sehen.",

    openKpi: (name) => `${name} öffnen`,
    target: "Zielwert",
    blend: "Kombination",
    conflict: "Konflikt",
    historic: "Historisch",
    noSource: "Keine Quelle",
    confidencePct: (n) => `${n}% Konfidenz`,
    singleSource: "Einzelquelle",

    viewCitationAria: (n) => `Zitat S${n} ansehen`,
    evidenceWithheld: "Nachweis zurückgehalten – über Ihrer Berechtigung.",
    weight: "Gewicht",
    viewCitation: "Zitat ansehen",
    citationLabel: (n) => `Zitat S${n}`,
    extractedSnippet: "Extrahierter Auszug",
    noSnippet: "Für dieses externe Signal liegt kein extrahierter Auszug vor.",
    evidenceAboveClearance:
      "Dieser Nachweis liegt über Ihrer aktuellen Berechtigung, daher zeigt der Hub den Auszug nicht an. Sein Beitrag zur Kombination bleibt kontrolliert und fällt sicher aus.",
    version: "Version",
    owner: "Verantwortlich",
    confidence: "Konfidenz",

    chatHeading: "Fragen zu diesem KPI",
    chatIntro:
      "Fragen Sie, warum sich diese Kennzahl verändert hat, was sie treibt oder wie sie im Vergleich abschneidet – beantwortet ausschließlich aus dem kontrollierten Nachweis hinter diesem KPI, mit Zitaten.",
    chatPlaceholder: "Warum hat sich das verändert?",
    chatViewHeading: "Fragen zu den sichtbaren Zielen",
    chatViewIntro:
      "Fragen Sie über alle aktuell sichtbaren KPIs – was auf Kurs ist, was abweicht und warum – beantwortet ausschließlich aus dem kontrollierten Nachweis dahinter, mit Zitaten.",
    chatViewPlaceholder: "Welche Ziele sind vom Kurs ab und warum?",
    readingEvidence: "Nachweise werden gelesen …",
    chatError:
      "Beim Antworten ist ein Fehler aufgetreten. Bitte erneut versuchen.",
    agentActionsDone: (n: number) =>
      `Fertig · ${n} Agentenaktion${n === 1 ? "" : "en"}`,
    showAgentActions: "Agentenaktionen anzeigen",
    hideAgentActions: "Agentenaktionen ausblenden",
    sendQuestion: "Frage senden",
    drawsHistoric: "Stützt sich auf historisches Material.",

    definition: "Definition",
    amberBelow: "Gelb unter",
    criticalBelow: "Kritisch unter",
    current: "Aktuell",
    progress: "% des Ziels",
    conflictBody:
      "Die zusammensetzenden Quellen sind sich bei dieser Kennzahl uneinig. Der Hauptwert nutzt die gewichtete Kombination; öffnen Sie die Quellen unten, um die Abweichung zu sehen.",
    trendVsTarget: "Trend vs. Zielwert",
    breakdownBy: "Aufschlüsselung nach",
    forecast: "Prognose",
    composingSources: "Zusammensetzende Quellen",
    blendPrefix: "Kombination:",

    acknowledged: "Bestätigt",
    acknowledge: "Bestätigen",
    notified: "Benachrichtigt",
    by: "Von",

    thresholdAlerts: "Schwellenwert-Warnungen",
    alertsDrawerBody:
      "Werden ausgelöst, wenn ein kontrollierter KPI seinen konfigurierten gelben oder kritischen Schwellenwert überschreitet oder seine Prognose auf eine Zielverfehlung hindeutet. Jede Warnung erfasst, wer über welchen Kanal benachrichtigt wurde und wer sie bestätigt hat – begrenzt auf Ihre Berechtigung.",
    checkingThresholds: "Schwellenwerte werden geprüft …",
    noThresholdAlerts:
      "Keine Schwellenwert-Warnungen für die dieser Persona sichtbaren Ziele.",

    kpiDetail: "KPI-Detail",
    kpiRestricted: "Dieser KPI ist eingeschränkt",
    kpiRestrictedBody:
      "Ihre aktuelle Persona ist nicht berechtigt, dieses Ziel oder seinen Nachweis zu öffnen.",

    askAboutKpis: "Fragen zu diesen KPIs",
    answeredFrom: (n) =>
      `Beantwortet ausschließlich aus dem kontrollierten Nachweis hinter ${n} ${n === 1 ? "sichtbaren Ziel" : "sichtbaren Zielen"}, begrenzt auf Ihre Berechtigung.`,
    openAnyKpi:
      "Öffnen Sie einen beliebigen KPI, um Trend, Aufschlüsselungen, zusammensetzende Quellen und einen kontextbezogenen, zitierten Chat zu sehen.",
  },
  PT: {
    periodLabels: {
      week: "Semanal",
      month: "Mensal",
      quarter: "Trimestral",
      custom: "Intervalo personalizado",
    },
    statusLabels: {
      "on-track": "No alvo",
      amber: "Em risco",
      "off-track": "Fora do alvo",
    },
    validityLabels: {
      approved: "Aprovado",
      historic: "Histórico",
      superseded: "Substituído",
      draft: "Rascunho",
    },
    severityLabels: {
      amber: "Em risco",
      critical: "Crítico",
      forecast: "Risco previsto",
    },

    pageTitle: "KPIs e objetivos",
    pageSubtitle: (area) =>
      `Acompanhamento governado de objetivos para ${area}. Cada número é uma combinação citada de fontes governadas, ajustada ao seu nível de acesso.`,
    alerts: "Alertas",
    alertsCount: (n) => `Alertas (${n})`,
    generateReport: "Gerar relatório de KPIs",
    reportRangePhrase: (area: string, from: string, to: string) =>
      `Relatório de KPIs de ${area} de ${from} a ${to}`,
    reportPeriodPhrase: (periodLabel: string, area: string) =>
      `Relatório ${periodLabel.toLowerCase()} de KPIs de ${area}`,
    reportSummary: (
      total: number,
      onTrack: number,
      atRisk: number,
      offTrack: number,
      names: string,
      hasMore: boolean,
    ) =>
      `: ${total} objetivos acompanhados, ${onTrack} no plano, ${atRisk} em risco, ${offTrack} fora do plano. Abrange ${names}${hasMore ? " e outros" : ""}.`,
    reportFocus: (names: string) => ` Foco nos desvios: ${names}.`,
    period: "Período",
    from: "De",
    to: "Até",

    rangeInvalid:
      "A data de início é posterior à de término — troque as datas para aplicar o intervalo.",
    rangePrompt:
      "Escolha uma data de início e de término para aplicar o intervalo personalizado. Os cartões, os detalhamentos e o chat contextual serão recalculados para essa janela.",

    tracked: "Monitorados",

    filterAxis: "Eixo",
    allAxes: "Todos os eixos",
    filterMarket: "Mercado",
    allMarkets: "Todos os mercados",
    filterBrand: "Marca",
    allBrands: "Todas as marcas",
    filterSource: "Fonte",
    allSources: "Todas as fontes",
    filterInitiative: "Iniciativa",
    allInitiatives: "Todas as iniciativas",
    filterObjective: "Objetivo",
    allObjectives: "Todos os objetivos",

    emptyTitle: "Nenhum objetivo no escopo",
    emptyBody:
      "Não há KPIs governados para esta persona e combinação de filtros. Remova um filtro, altere o período do relatório ou mude de persona para ver os objetivos monitorados.",

    openKpi: (name) => `Abrir ${name}`,
    target: "Meta",
    blend: "Combinação",
    conflict: "Conflito",
    historic: "Histórico",
    noSource: "Sem fonte",
    confidencePct: (n) => `${n}% de confiança`,
    singleSource: "Fonte única",

    viewCitationAria: (n) => `Ver citação S${n}`,
    evidenceWithheld: "Evidência retida — acima do seu nível de acesso.",
    weight: "Peso",
    viewCitation: "Ver citação",
    citationLabel: (n) => `Citação S${n}`,
    extractedSnippet: "Trecho extraído",
    noSnippet: "Este sinal externo não tem trecho extraído.",
    evidenceAboveClearance:
      "Esta evidência está acima do seu nível de acesso atual, portanto o Hub não exibirá seu trecho. Sua contribuição para a combinação continua governada e falha de forma segura.",
    version: "Versão",
    owner: "Responsável",
    confidence: "Confiança",

    chatHeading: "Pergunte sobre este KPI",
    chatIntro:
      "Pergunte por que esta métrica mudou, o que a impulsiona ou como ela se compara — respondido apenas com a evidência governada por trás deste KPI, com citações.",
    chatPlaceholder: "Por que isto mudou?",
    chatViewHeading: "Pergunte sobre os objetivos exibidos",
    chatViewIntro:
      "Pergunte sobre todos os KPIs na tela — o que está no caminho, o que está desviando e por quê — respondido apenas com a evidência governada por trás deles, com citações.",
    chatViewPlaceholder: "Quais objetivos estão fora do alvo e por quê?",
    readingEvidence: "Lendo a evidência...",
    chatError: "Algo deu errado ao responder. Tente novamente.",
    agentActionsDone: (n: number) =>
      `Concluído · ${n} ${n === 1 ? "ação" : "ações"} do agente`,
    showAgentActions: "Mostrar ações do agente",
    hideAgentActions: "Ocultar ações do agente",
    sendQuestion: "Enviar pergunta",
    drawsHistoric: "Baseia-se em material histórico.",

    definition: "Definição",
    amberBelow: "Âmbar abaixo de",
    criticalBelow: "Crítico abaixo de",
    current: "Atual",
    progress: "% da meta",
    conflictBody:
      "As fontes que a compõem divergem nesta métrica. O número principal usa a combinação ponderada; abra as fontes abaixo para ver a divergência.",
    trendVsTarget: "Tendência vs. meta",
    breakdownBy: "Detalhamento por",
    forecast: "Previsão",
    composingSources: "Fontes que a compõem",
    blendPrefix: "Combinação:",

    acknowledged: "Confirmada",
    acknowledge: "Confirmar",
    notified: "Notificado",
    by: "Por",

    thresholdAlerts: "Alertas de limite",
    alertsDrawerBody:
      "Geradas quando um KPI governado cruza seu limite âmbar ou crítico configurado, ou quando sua previsão aponta para uma falha. Cada alerta registra quem foi notificado, por qual canal e quem a confirmou — conforme o seu nível de acesso.",
    checkingThresholds: "Verificando limites...",
    noThresholdAlerts:
      "Nenhum alerta de limite para os objetivos visíveis a esta persona.",

    kpiDetail: "Detalhe do KPI",
    kpiRestricted: "Este KPI está restrito",
    kpiRestrictedBody:
      "Sua persona atual não tem permissão para abrir este objetivo ou sua evidência.",

    askAboutKpis: "Pergunte sobre estes KPIs",
    answeredFrom: (n) =>
      `Respondido apenas com a evidência governada por trás de ${n} ${n === 1 ? "objetivo" : "objetivos"} em exibição, conforme o seu nível de acesso.`,
    openAnyKpi:
      "Abra qualquer KPI para ver sua tendência, detalhamentos, fontes que o compõem e um chat contextual com citações.",
  },
};
