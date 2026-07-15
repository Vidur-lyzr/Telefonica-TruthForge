// UI chrome strings for the product-level language switcher. The corpus and
// answers are handled server-side; this dictionary covers the app shell so
// switching language visibly changes the product, not just the answers.

import type { Lang } from "./components/app-provider";

export interface ChromeStrings {
  navGroups: { workspace: string; knowledge: string; backend: string };
  nav: {
    home: string;
    ask: string;
    generate: string;
    kpis: string;
    planning: string;
    wiki: string;
    data: string;
    admin: string;
    brand: string;
  };
  topbar: { area: string; persona: string; language: string };
  ask: {
    assistant: string;
    scopeLine: (area: string) => string;
    filters: string;
  };
  a11y: {
    mainNavigation: string;
    goHome: string;
    expandMenu: string;
    collapseMenu: string;
  };
}

export const UI: Record<Lang, ChromeStrings> = {
  EN: {
    navGroups: { workspace: "Workspace", knowledge: "Knowledge", backend: "Backend" },
    nav: {
      home: "Home",
      ask: "Ask",
      generate: "Generate",
      kpis: "KPIs",
      planning: "Planning",
      wiki: "Knowledge Graph",
      data: "Data Center",
      admin: "Admin",
      brand: "Brand",
    },
    topbar: { area: "Area", persona: "Persona", language: "Language" },
    ask: {
      assistant: "Governed assistant",
      scopeLine: (area) => `Scope: ${area} · answers are cited, permission-aware and honest`,
      filters: "Filters",
    },
    a11y: {
      mainNavigation: "Main navigation",
      goHome: "Go to Home",
      expandMenu: "Expand menu",
      collapseMenu: "Collapse menu",
    },
  },
  ES: {
    navGroups: { workspace: "Espacio de trabajo", knowledge: "Conocimiento", backend: "Backend" },
    nav: {
      home: "Inicio",
      ask: "Preguntar",
      generate: "Generar",
      kpis: "KPIs",
      planning: "Planificación",
      wiki: "Grafo de conocimiento",
      data: "Centro de datos",
      admin: "Administración",
      brand: "Marca",
    },
    topbar: { area: "Área", persona: "Persona", language: "Idioma" },
    ask: {
      assistant: "Asistente gobernado",
      scopeLine: (area) => `Ámbito: ${area} · respuestas citadas, con permisos y honestas`,
      filters: "Filtros",
    },
    a11y: {
      mainNavigation: "Navegación principal",
      goHome: "Ir al inicio",
      expandMenu: "Expandir menú",
      collapseMenu: "Contraer menú",
    },
  },
  DE: {
    navGroups: { workspace: "Arbeitsbereich", knowledge: "Wissen", backend: "Backend" },
    nav: {
      home: "Start",
      ask: "Fragen",
      generate: "Erstellen",
      kpis: "KPIs",
      planning: "Planung",
      wiki: "Wissensgraph",
      data: "Datenzentrum",
      admin: "Verwaltung",
      brand: "Marke",
    },
    topbar: { area: "Bereich", persona: "Persona", language: "Sprache" },
    ask: {
      assistant: "Governance-gesicherter Assistent",
      scopeLine: (area) => `Bereich: ${area} · Antworten sind zitiert, berechtigungsbewusst und ehrlich`,
      filters: "Filter",
    },
    a11y: {
      mainNavigation: "Hauptnavigation",
      goHome: "Zur Startseite",
      expandMenu: "Menü ausklappen",
      collapseMenu: "Menü einklappen",
    },
  },
  PT: {
    navGroups: { workspace: "Espaço de trabalho", knowledge: "Conhecimento", backend: "Backend" },
    nav: {
      home: "Início",
      ask: "Perguntar",
      generate: "Gerar",
      kpis: "KPIs",
      planning: "Planejamento",
      wiki: "Grafo de conhecimento",
      data: "Central de dados",
      admin: "Administração",
      brand: "Marca",
    },
    topbar: { area: "Área", persona: "Persona", language: "Idioma" },
    ask: {
      assistant: "Assistente governado",
      scopeLine: (area) => `Escopo: ${area} · respostas citadas, cientes de permissões e honestas`,
      filters: "Filtros",
    },
    a11y: {
      mainNavigation: "Navegação principal",
      goHome: "Ir para o início",
      expandMenu: "Expandir menu",
      collapseMenu: "Recolher menu",
    },
  },
};

// Lowercase code the API expects (AskInput.lang).
export function apiLang(lang: Lang): "es" | "en" | "de" | "pt" {
  return lang.toLowerCase() as "es" | "en" | "de" | "pt";
}
