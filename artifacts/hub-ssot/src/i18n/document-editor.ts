// Localized strings for the rich-text document editor chrome: the selection
// toolbar buttons and the citation-chip tooltip. Document content itself is
// user/agent authored and is never translated here.

import type { Lang } from "../components/app-provider";

export interface DocumentEditorStrings {
  bold: string;
  italic: string;
  heading: string;
  subheading: string;
  bulletList: string;
  listLabel: string;
  askAgentTooltip: string;
  askAgent: string;
  openCitation: string;
}

export const DOCUMENT_EDITOR_I18N: Record<Lang, DocumentEditorStrings> = {
  EN: {
    bold: "Bold",
    italic: "Italic",
    heading: "Heading",
    subheading: "Subheading",
    bulletList: "Bullet list",
    listLabel: "List",
    askAgentTooltip: "Ask the agent about this passage",
    askAgent: "Ask agent",
    openCitation: "Open citation",
  },
  ES: {
    bold: "Negrita",
    italic: "Cursiva",
    heading: "Encabezado",
    subheading: "Subencabezado",
    bulletList: "Lista con viñetas",
    listLabel: "Lista",
    askAgentTooltip: "Pregunta al agente sobre este pasaje",
    askAgent: "Preguntar al agente",
    openCitation: "Abrir cita",
  },
  DE: {
    bold: "Fett",
    italic: "Kursiv",
    heading: "Überschrift",
    subheading: "Zwischenüberschrift",
    bulletList: "Aufzählungsliste",
    listLabel: "Liste",
    askAgentTooltip: "Den Agenten zu dieser Passage fragen",
    askAgent: "Agent fragen",
    openCitation: "Zitat öffnen",
  },
  PT: {
    bold: "Negrito",
    italic: "Itálico",
    heading: "Título",
    subheading: "Subtítulo",
    bulletList: "Lista com marcadores",
    listLabel: "Lista",
    askAgentTooltip: "Pergunte ao agente sobre este trecho",
    askAgent: "Perguntar ao agente",
    openCitation: "Abrir citação",
  },
};
