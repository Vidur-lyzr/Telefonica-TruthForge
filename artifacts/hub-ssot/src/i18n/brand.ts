// Localized strings for the Brand Room page (templates, tone of voice,
// resources, and the live Brand Guardian). Server-provided content — template
// names, tone principles, prohibited phrases, resource details, guardian
// summaries and findings — stays as-is; this dictionary covers the static
// chrome, status labels and framing. Proper nouns (Telefónica, Brand Room,
// Brand Guardian, Marca) are kept unchanged.

import type { Lang } from "../components/app-provider";

export type BrandNoun = "template" | "resource";

export interface BrandStrings {
  intro: string;
  tabs: { templates: string; tone: string; resources: string; guardian: string };
  loading: string;
  blockedNote: (count: number, noun: BrandNoun) => string;
  permissionBlockedTitle: string;
  permissionBlocked: (count: number, noun: BrandNoun) => string;
  templatesIntro: string;
  meta: { owner: string; format: string; version: string; sections: string };
  viewStructure: string;
  openTemplateAria: (name: string) => string;
  templateFallbackName: string;
  governedBrandTemplate: string;
  sectionStructure: string;
  requiredDisclaimers: string;
  perAxis: string;
  validity: (v: string) => string;
  toneIntro: string;
  hardRules: string;
  hardRulesSub: string;
  ruleSeverity: { error: string; warning: string };
  prohibitedClaims: string;
  prohibitedSub: string;
  europeanEnglish: string;
  europeanEnglishSub: string;
  resourcesIntro: string;
  categories: { identity: string; messaging: string; legal: string; reference: string };
  openResourceAria: (name: string) => string;
  onBrand: string;
  needsWork: string;
  findingSeverity: { error: string; warning: string };
  fixPrefix: string;
  guardianIntro: string;
  pasteLabel: string;
  checking: string;
  runGuardian: string;
  loadSample: string;
  clear: string;
  checkedText: string;
  legendBlocks: string;
  legendAdvises: string;
}

export const BRAND_I18N: Record<Lang, BrandStrings> = {
  EN: {
    intro:
      "The brand team's control room — governed templates, the tone of voice every drafter follows, corporate resources, and a live Brand Guardian that checks copy before it ships.",
    tabs: {
      templates: "Templates",
      tone: "Tone of voice",
      resources: "Resources",
      guardian: "Brand Guardian",
    },
    loading: "Loading…",
    blockedNote: (count, noun) => {
      const forms = {
        template: ["template", "templates"],
        resource: ["resource", "resources"],
      } as const;
      const w = forms[noun][count === 1 ? 0 : 1];
      return `${count} ${w} hidden by your persona's clearance.`;
    },
    permissionBlockedTitle: "Permission blocked",
    permissionBlocked: (count, noun) => {
      const forms = {
        template: ["template", "templates"],
        resource: ["resource", "resources"],
      } as const;
      const w = forms[noun][count === 1 ? 0 : 1];
      return `${count} ${w} ${count === 1 ? "is" : "are"} governed above your persona's clearance. Switch to a higher-clearance persona to view ${count === 1 ? "it" : "them"}.`;
    },
    templatesIntro:
      "Governed document blueprints — each with its owner, format, version and validity. Select a template to see the section structure and required disclaimers every published document must follow.",
    meta: { owner: "Owner", format: "Format", version: "Version", sections: "Sections" },
    viewStructure: "View structure",
    openTemplateAria: (name) => `Open template ${name}`,
    templateFallbackName: "Template",
    governedBrandTemplate: "Governed brand template",
    sectionStructure: "Section structure",
    requiredDisclaimers: "Required disclaimers",
    perAxis: "per axis",
    validity: (v) =>
      (({
        approved: "Approved",
        historic: "Historic",
        review: "In review",
        superseded: "Superseded",
      }) as Record<string, string>)[v] ?? v,
    toneIntro:
      "How Telefónica sounds — six principles the Brand Guardian and every drafter work to.",
    hardRules: "Hard rules",
    hardRulesSub: "Enforced automatically by the Brand Guardian.",
    ruleSeverity: { error: "blocks", warning: "advises" },
    prohibitedClaims: "Prohibited claims",
    prohibitedSub: "Unapproved superlatives and the approved rewrite to use instead.",
    europeanEnglish: "European English",
    europeanEnglishSub: "Preferred spellings across every surface.",
    resourcesIntro: "Governed brand assets — filtered to what your persona's clearance permits.",
    categories: {
      identity: "Identity",
      messaging: "Messaging",
      legal: "Legal",
      reference: "Reference",
    },
    openResourceAria: (name) => `Open resource ${name}`,
    onBrand: "On brand",
    needsWork: "Needs work",
    findingSeverity: { error: "Error", warning: "Warning" },
    fixPrefix: "Fix:",
    guardianIntro:
      "Paste any copy — a caption, an intro, a tweet — and the Brand Guardian checks it against the same rules that gate document export. Every violation is flagged inline. Deterministic, and no text leaves the governed core.",
    pasteLabel: "Paste copy to check",
    checking: "Checking…",
    runGuardian: "Run Brand Guardian",
    loadSample: "Load a sample",
    clear: "Clear",
    checkedText: "Checked text",
    legendBlocks: "Blocks",
    legendAdvises: "Advises",
  },
  ES: {
    intro:
      "La sala de control del equipo de marca — plantillas gobernadas, el tono de voz que sigue quien redacta, recursos corporativos y un Brand Guardian en vivo que revisa el texto antes de publicarlo.",
    tabs: {
      templates: "Plantillas",
      tone: "Tono de voz",
      resources: "Recursos",
      guardian: "Brand Guardian",
    },
    loading: "Cargando…",
    blockedNote: (count, noun) => {
      const forms = {
        template: ["plantilla", "plantillas"],
        resource: ["recurso", "recursos"],
      } as const;
      const w = forms[noun][count === 1 ? 0 : 1];
      return `Tu nivel de acceso oculta ${count} ${w}.`;
    },
    permissionBlockedTitle: "Acceso restringido",
    permissionBlocked: (count, noun) => {
      const forms = {
        template: ["plantilla", "plantillas"],
        resource: ["recurso", "recursos"],
      } as const;
      const w = forms[noun][count === 1 ? 0 : 1];
      return `Hay ${count} ${w} por encima del nivel de acceso de tu persona. Cambia a una persona con mayor nivel de acceso para consultar este contenido gobernado.`;
    },
    templatesIntro:
      "Planos de documentos gobernados — cada uno con su responsable, formato, versión y validez. Selecciona una plantilla para ver la estructura de secciones y los avisos legales obligatorios que todo documento publicado debe seguir.",
    meta: { owner: "Responsable", format: "Formato", version: "Versión", sections: "Secciones" },
    viewStructure: "Ver estructura",
    openTemplateAria: (name) => `Abrir plantilla ${name}`,
    templateFallbackName: "Plantilla",
    governedBrandTemplate: "Plantilla de marca gobernada",
    sectionStructure: "Estructura de secciones",
    requiredDisclaimers: "Avisos legales obligatorios",
    perAxis: "por eje",
    validity: (v) =>
      (({
        approved: "Aprobado",
        historic: "Histórico",
        review: "En revisión",
        superseded: "Reemplazado",
      }) as Record<string, string>)[v] ?? v,
    toneIntro:
      "Cómo suena Telefónica — seis principios que guían al Brand Guardian y a quien redacta.",
    hardRules: "Reglas estrictas",
    hardRulesSub: "Aplicadas automáticamente por el Brand Guardian.",
    ruleSeverity: { error: "bloquea", warning: "aconseja" },
    prohibitedClaims: "Afirmaciones prohibidas",
    prohibitedSub:
      "Superlativos no aprobados y la reescritura aprobada que debes usar en su lugar.",
    europeanEnglish: "Inglés europeo",
    europeanEnglishSub: "Ortografía preferida en todas las superficies.",
    resourcesIntro:
      "Activos de marca gobernados — filtrados según lo que permite el nivel de acceso de tu persona.",
    categories: {
      identity: "Identidad",
      messaging: "Mensajes",
      legal: "Legal",
      reference: "Referencia",
    },
    openResourceAria: (name) => `Abrir recurso ${name}`,
    onBrand: "Fiel a la marca",
    needsWork: "Necesita ajustes",
    findingSeverity: { error: "Error", warning: "Advertencia" },
    fixPrefix: "Corrección:",
    guardianIntro:
      "Pega cualquier texto — un pie de foto, una introducción, un tuit — y el Brand Guardian lo comprueba con las mismas reglas que controlan la exportación de documentos. Cada infracción se marca en línea. Determinista, y ningún texto sale del núcleo gobernado.",
    pasteLabel: "Pega el texto para comprobar",
    checking: "Comprobando…",
    runGuardian: "Ejecutar Brand Guardian",
    loadSample: "Cargar un ejemplo",
    clear: "Limpiar",
    checkedText: "Texto comprobado",
    legendBlocks: "Bloquea",
    legendAdvises: "Aconseja",
  },
  DE: {
    intro:
      "Der Kontrollraum des Markenteams — kontrollierte Vorlagen, der Tonfall, dem alle Verfassenden folgen, Unternehmensressourcen und ein Live-Brand-Guardian, der Texte vor der Veröffentlichung prüft.",
    tabs: {
      templates: "Vorlagen",
      tone: "Tonfall",
      resources: "Ressourcen",
      guardian: "Brand Guardian",
    },
    loading: "Wird geladen…",
    blockedNote: (count, noun) => {
      const forms = {
        template: ["Vorlage", "Vorlagen"],
        resource: ["Ressource", "Ressourcen"],
      } as const;
      const w = forms[noun][count === 1 ? 0 : 1];
      return `Ihre Berechtigungsstufe blendet ${count} ${w} aus.`;
    },
    permissionBlockedTitle: "Zugriff gesperrt",
    permissionBlocked: (count, noun) => {
      const forms = {
        template: ["Vorlage", "Vorlagen"],
        resource: ["Ressource", "Ressourcen"],
      } as const;
      const w = forms[noun][count === 1 ? 0 : 1];
      return `${count} ${w} ${count === 1 ? "liegt" : "liegen"} über der Berechtigungsstufe Ihrer Persona. Wechseln Sie zu einer Persona mit höherer Berechtigungsstufe, um sie anzuzeigen.`;
    },
    templatesIntro:
      "Kontrollierte Dokumentvorlagen — jeweils mit Verantwortlichem, Format, Version und Gültigkeit. Wählen Sie eine Vorlage, um die Abschnittsstruktur und die erforderlichen Hinweise zu sehen, die jedes veröffentlichte Dokument befolgen muss.",
    meta: { owner: "Verantwortlich", format: "Format", version: "Version", sections: "Abschnitte" },
    viewStructure: "Struktur ansehen",
    openTemplateAria: (name) => `Vorlage ${name} öffnen`,
    templateFallbackName: "Vorlage",
    governedBrandTemplate: "Kontrollierte Markenvorlage",
    sectionStructure: "Abschnittsstruktur",
    requiredDisclaimers: "Erforderliche Hinweise",
    perAxis: "pro Achse",
    validity: (v) =>
      (({
        approved: "Freigegeben",
        historic: "Historisch",
        review: "In Prüfung",
        superseded: "Ersetzt",
      }) as Record<string, string>)[v] ?? v,
    toneIntro:
      "Wie Telefónica klingt — sechs Prinzipien, an denen sich der Brand Guardian und alle Verfassenden orientieren.",
    hardRules: "Feste Regeln",
    hardRulesSub: "Automatisch vom Brand Guardian durchgesetzt.",
    ruleSeverity: { error: "blockiert", warning: "rät" },
    prohibitedClaims: "Unzulässige Aussagen",
    prohibitedSub:
      "Nicht freigegebene Superlative und die freigegebene Alternative, die stattdessen zu verwenden ist.",
    europeanEnglish: "Europäisches Englisch",
    europeanEnglishSub: "Bevorzugte Schreibweisen auf allen Oberflächen.",
    resourcesIntro:
      "Kontrollierte Markenressourcen — gefiltert nach dem, was die Berechtigungsstufe Ihrer Persona zulässt.",
    categories: {
      identity: "Identität",
      messaging: "Botschaften",
      legal: "Rechtliches",
      reference: "Referenz",
    },
    openResourceAria: (name) => `Ressource ${name} öffnen`,
    onBrand: "Markenkonform",
    needsWork: "Nachbesserung nötig",
    findingSeverity: { error: "Fehler", warning: "Warnung" },
    fixPrefix: "Korrektur:",
    guardianIntro:
      "Fügen Sie beliebigen Text ein — eine Bildunterschrift, eine Einleitung, einen Tweet — und der Brand Guardian prüft ihn anhand derselben Regeln, die den Dokumentexport steuern. Jeder Verstoß wird inline markiert. Deterministisch, und kein Text verlässt den kontrollierten Kern.",
    pasteLabel: "Text zum Prüfen einfügen",
    checking: "Wird geprüft…",
    runGuardian: "Brand Guardian ausführen",
    loadSample: "Beispiel laden",
    clear: "Zurücksetzen",
    checkedText: "Geprüfter Text",
    legendBlocks: "Blockiert",
    legendAdvises: "Rät",
  },
  PT: {
    intro:
      "A sala de controle da equipe de marca — modelos governados, o tom de voz que todos que redigem seguem, recursos corporativos e um Brand Guardian ao vivo que verifica o texto antes de publicá-lo.",
    tabs: {
      templates: "Modelos",
      tone: "Tom de voz",
      resources: "Recursos",
      guardian: "Brand Guardian",
    },
    loading: "Carregando…",
    blockedNote: (count, noun) => {
      const forms = {
        template: ["modelo", "modelos"],
        resource: ["recurso", "recursos"],
      } as const;
      const w = forms[noun][count === 1 ? 0 : 1];
      return `Seu nível de acesso oculta ${count} ${w}.`;
    },
    permissionBlockedTitle: "Acesso bloqueado",
    permissionBlocked: (count, noun) => {
      const forms = {
        template: ["modelo", "modelos"],
        resource: ["recurso", "recursos"],
      } as const;
      const w = forms[noun][count === 1 ? 0 : 1];
      return `${count} ${w} ${count === 1 ? "está" : "estão"} acima do nível de acesso da sua persona. Mude para uma persona com nível de acesso maior para ${count === 1 ? "consultá-lo" : "consultá-los"}.`;
    },
    templatesIntro:
      "Modelos de documentos governados — cada um com seu responsável, formato, versão e validade. Selecione um modelo para ver a estrutura de seções e os avisos obrigatórios que todo documento publicado deve seguir.",
    meta: { owner: "Responsável", format: "Formato", version: "Versão", sections: "Seções" },
    viewStructure: "Ver estrutura",
    openTemplateAria: (name) => `Abrir modelo ${name}`,
    templateFallbackName: "Modelo",
    governedBrandTemplate: "Modelo de marca governado",
    sectionStructure: "Estrutura de seções",
    requiredDisclaimers: "Avisos obrigatórios",
    perAxis: "por eixo",
    validity: (v) =>
      (({
        approved: "Aprovado",
        historic: "Histórico",
        review: "Em revisão",
        superseded: "Substituído",
      }) as Record<string, string>)[v] ?? v,
    toneIntro:
      "Como a Telefónica soa — seis princípios que orientam o Brand Guardian e quem redige.",
    hardRules: "Regras rígidas",
    hardRulesSub: "Aplicadas automaticamente pelo Brand Guardian.",
    ruleSeverity: { error: "bloqueia", warning: "aconselha" },
    prohibitedClaims: "Afirmações proibidas",
    prohibitedSub: "Superlativos não aprovados e a reescrita aprovada a usar em vez deles.",
    europeanEnglish: "Inglês europeu",
    europeanEnglishSub: "Grafias preferidas em todas as superfícies.",
    resourcesIntro:
      "Ativos de marca governados — filtrados conforme o que o nível de acesso da sua persona permite.",
    categories: {
      identity: "Identidade",
      messaging: "Mensagens",
      legal: "Jurídico",
      reference: "Referência",
    },
    openResourceAria: (name) => `Abrir recurso ${name}`,
    onBrand: "Fiel à marca",
    needsWork: "Precisa de ajustes",
    findingSeverity: { error: "Erro", warning: "Aviso" },
    fixPrefix: "Correção:",
    guardianIntro:
      "Cole qualquer texto — uma legenda, uma introdução, um tweet — e o Brand Guardian o verifica com as mesmas regras que controlam a exportação de documentos. Cada violação é marcada em linha. Determinístico, e nenhum texto sai do núcleo governado.",
    pasteLabel: "Cole o texto para verificar",
    checking: "Verificando…",
    runGuardian: "Executar Brand Guardian",
    loadSample: "Carregar um exemplo",
    clear: "Limpar",
    checkedText: "Texto verificado",
    legendBlocks: "Bloqueia",
    legendAdvises: "Aconselha",
  },
};
