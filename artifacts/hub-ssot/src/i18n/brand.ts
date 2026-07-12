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
  tabs: {
    templates: string;
    tone: string;
    resources: string;
    design: string;
    guardian: string;
  };
  designIntro: string;
  openDesignSite: string;
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
  uploadFile: string;
  uploadUnsupported: string;
  agentActivity: string;
  editSkill: string;
  skillSheetTitle: string;
  skillSheetSub: string;
  skillContentLabel: string;
  saveSkill: string;
  savingSkill: string;
  resetSkill: string;
  skillVersion: (v: number) => string;
  skillDefaultTag: string;
  skillEditedTag: string;
  guardianError: string;
}

export const BRAND_I18N: Record<Lang, BrandStrings> = {
  EN: {
    intro:
      "The brand team's control room — governed templates, the tone of voice every drafter follows, corporate resources, and a live Brand Guardian that checks copy before it ships.",
    tabs: {
      templates: "Templates",
      tone: "Tone of voice",
      resources: "Resources",
      design: "Design system",
      guardian: "Brand Guardian",
    },
    designIntro:
      "Mística — Telefónica's official design system, embedded live from the public component catalogue. Every surface in this Hub is built with these components and tokens.",
    openDesignSite: "Open in a new tab",
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
      "Paste any copy — a caption, an intro, a tweet — and the Brand Guardian agent checks it live: deterministic hard rules first, then a Claude review of voice and register against the editable agent skill. Every violation is flagged inline.",
    pasteLabel: "Paste copy to check",
    checking: "Checking…",
    runGuardian: "Run Brand Guardian",
    loadSample: "Load a sample",
    clear: "Clear",
    checkedText: "Checked text",
    legendBlocks: "Blocks",
    legendAdvises: "Advises",
    uploadFile: "Upload a file",
    uploadUnsupported: "Only plain-text files (.txt, .md) can be checked.",
    agentActivity: "Agent activity",
    editSkill: "Edit agent skill",
    skillSheetTitle: "Brand Guardian skill",
    skillSheetSub:
      "The instruction document the agent works from. Edits apply to the next check immediately.",
    skillContentLabel: "Skill document",
    saveSkill: "Save skill",
    savingSkill: "Saving…",
    resetSkill: "Reset to default",
    skillVersion: (v) => `Version ${v}`,
    skillDefaultTag: "Governed default",
    skillEditedTag: "Edited",
    guardianError: "The Brand Guardian could not complete this check. Try again.",
  },
  ES: {
    intro:
      "La sala de control del equipo de marca — plantillas gobernadas, el tono de voz que sigue quien redacta, recursos corporativos y un Brand Guardian en vivo que revisa el texto antes de publicarlo.",
    tabs: {
      templates: "Plantillas",
      tone: "Tono de voz",
      resources: "Recursos",
      design: "Sistema de diseño",
      guardian: "Brand Guardian",
    },
    designIntro:
      "Mística — el sistema de diseño oficial de Telefónica, incrustado en vivo desde el catálogo público de componentes. Cada superficie de este Hub está construida con estos componentes y tokens.",
    openDesignSite: "Abrir en una pestaña nueva",
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
      "Pega cualquier texto — un pie de foto, una introducción, un tuit — y el agente Brand Guardian lo revisa en vivo: primero las reglas duras deterministas y después una revisión de voz y registro con Claude según la skill editable del agente. Cada infracción se marca en línea.",
    pasteLabel: "Pega el texto para comprobar",
    checking: "Comprobando…",
    runGuardian: "Ejecutar Brand Guardian",
    loadSample: "Cargar un ejemplo",
    clear: "Limpiar",
    checkedText: "Texto comprobado",
    legendBlocks: "Bloquea",
    legendAdvises: "Aconseja",
    uploadFile: "Subir un archivo",
    uploadUnsupported: "Solo se pueden comprobar archivos de texto plano (.txt, .md).",
    agentActivity: "Actividad del agente",
    editSkill: "Editar la skill del agente",
    skillSheetTitle: "Skill del Brand Guardian",
    skillSheetSub:
      "El documento de instrucciones con el que trabaja el agente. Los cambios se aplican en la siguiente comprobación.",
    skillContentLabel: "Documento de la skill",
    saveSkill: "Guardar skill",
    savingSkill: "Guardando…",
    resetSkill: "Restaurar el valor por defecto",
    skillVersion: (v) => `Versión ${v}`,
    skillDefaultTag: "Estándar gobernado",
    skillEditedTag: "Editada",
    guardianError: "El Brand Guardian no pudo completar esta comprobación. Inténtalo de nuevo.",
  },
  DE: {
    intro:
      "Der Kontrollraum des Markenteams — kontrollierte Vorlagen, der Tonfall, dem alle Verfassenden folgen, Unternehmensressourcen und ein Live-Brand-Guardian, der Texte vor der Veröffentlichung prüft.",
    tabs: {
      templates: "Vorlagen",
      tone: "Tonfall",
      resources: "Ressourcen",
      design: "Designsystem",
      guardian: "Brand Guardian",
    },
    designIntro:
      "Mística — das offizielle Designsystem von Telefónica, live aus dem öffentlichen Komponentenkatalog eingebettet. Jede Oberfläche dieses Hubs ist mit diesen Komponenten und Tokens gebaut.",
    openDesignSite: "In neuem Tab öffnen",
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
      "Fügen Sie beliebigen Text ein — eine Bildunterschrift, eine Einleitung, einen Tweet — und der Brand-Guardian-Agent prüft ihn live: zuerst die deterministischen Grundregeln, danach eine Claude-Prüfung von Stimme und Register anhand des editierbaren Agenten-Skills. Jeder Verstoß wird inline markiert.",
    pasteLabel: "Text zum Prüfen einfügen",
    checking: "Wird geprüft…",
    runGuardian: "Brand Guardian ausführen",
    loadSample: "Beispiel laden",
    clear: "Zurücksetzen",
    checkedText: "Geprüfter Text",
    legendBlocks: "Blockiert",
    legendAdvises: "Rät",
    uploadFile: "Datei hochladen",
    uploadUnsupported: "Nur Klartextdateien (.txt, .md) können geprüft werden.",
    agentActivity: "Agentenaktivität",
    editSkill: "Agenten-Skill bearbeiten",
    skillSheetTitle: "Brand-Guardian-Skill",
    skillSheetSub:
      "Das Anweisungsdokument, mit dem der Agent arbeitet. Änderungen gelten sofort für die nächste Prüfung.",
    skillContentLabel: "Skill-Dokument",
    saveSkill: "Skill speichern",
    savingSkill: "Wird gespeichert…",
    resetSkill: "Auf Standard zurücksetzen",
    skillVersion: (v) => `Version ${v}`,
    skillDefaultTag: "Governance-Standard",
    skillEditedTag: "Bearbeitet",
    guardianError: "Der Brand Guardian konnte diese Prüfung nicht abschließen. Bitte erneut versuchen.",
  },
  PT: {
    intro:
      "A sala de controle da equipe de marca — modelos governados, o tom de voz que todos que redigem seguem, recursos corporativos e um Brand Guardian ao vivo que verifica o texto antes de publicá-lo.",
    tabs: {
      templates: "Modelos",
      tone: "Tom de voz",
      resources: "Recursos",
      design: "Sistema de design",
      guardian: "Brand Guardian",
    },
    designIntro:
      "Mística — o sistema de design oficial da Telefónica, incorporado ao vivo do catálogo público de componentes. Cada superfície deste Hub é construída com esses componentes e tokens.",
    openDesignSite: "Abrir em nova guia",
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
      "Cole qualquer texto — uma legenda, uma introdução, um tweet — e o agente Brand Guardian o verifica ao vivo: primeiro as regras rígidas determinísticas e depois uma revisão de voz e registro com Claude segundo a skill editável do agente. Cada violação é marcada em linha.",
    pasteLabel: "Cole o texto para verificar",
    checking: "Verificando…",
    runGuardian: "Executar Brand Guardian",
    loadSample: "Carregar um exemplo",
    clear: "Limpar",
    checkedText: "Texto verificado",
    legendBlocks: "Bloqueia",
    legendAdvises: "Aconselha",
    uploadFile: "Carregar um arquivo",
    uploadUnsupported: "Somente arquivos de texto simples (.txt, .md) podem ser verificados.",
    agentActivity: "Atividade do agente",
    editSkill: "Editar a skill do agente",
    skillSheetTitle: "Skill do Brand Guardian",
    skillSheetSub:
      "O documento de instruções com que o agente trabalha. As alterações se aplicam na próxima verificação.",
    skillContentLabel: "Documento da skill",
    saveSkill: "Salvar skill",
    savingSkill: "Salvando…",
    resetSkill: "Redefinir para o padrão",
    skillVersion: (v) => `Versão ${v}`,
    skillDefaultTag: "Padrão governado",
    skillEditedTag: "Editada",
    guardianError: "O Brand Guardian não conseguiu concluir esta verificação. Tente novamente.",
  },
};
