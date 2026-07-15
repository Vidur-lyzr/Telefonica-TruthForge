// Localized strings for the rich-text document editor chrome: the selection
// toolbar buttons and the citation-chip tooltip. Document content itself is
// user/agent authored and is never translated here.

import type { Lang } from "../components/app-provider";

export interface DocumentEditorStrings {
  bold: string;
  italic: string;
  strikethrough: string;
  heading: string;
  subheading: string;
  normalText: string;
  normalTextShort: string;
  bulletList: string;
  numberedList: string;
  listLabel: string;
  undo: string;
  redo: string;
  clearFormatting: string;
  askAgentTooltip: string;
  askAgent: string;
  openCitation: string;
  toolbarHint: string;
  editDocument: string;
  doneEditing: string;
}

export const DOCUMENT_EDITOR_I18N: Record<Lang, DocumentEditorStrings> = {
  EN: {
    bold: "Bold",
    italic: "Italic",
    strikethrough: "Strikethrough",
    heading: "Heading",
    subheading: "Subheading",
    normalText: "Normal text",
    normalTextShort: "Normal",
    bulletList: "Bullet list",
    numberedList: "Numbered list",
    listLabel: "List",
    undo: "Undo",
    redo: "Redo",
    clearFormatting: "Clear formatting",
    askAgentTooltip: "Ask the agent about this passage",
    askAgent: "Ask agent",
    openCitation: "Open citation",
    toolbarHint: "Click anywhere in the document to edit",
    editDocument: "Edit document",
    doneEditing: "Done editing",
  },
  ES: {
    bold: "Negrita",
    italic: "Cursiva",
    strikethrough: "Tachado",
    heading: "Encabezado",
    subheading: "Subencabezado",
    normalText: "Texto normal",
    normalTextShort: "Normal",
    bulletList: "Lista con viñetas",
    numberedList: "Lista numerada",
    listLabel: "Lista",
    undo: "Deshacer",
    redo: "Rehacer",
    clearFormatting: "Borrar formato",
    askAgentTooltip: "Pregunta al agente sobre este pasaje",
    askAgent: "Preguntar al agente",
    openCitation: "Abrir cita",
    toolbarHint: "Haz clic en cualquier parte del documento para editar",
    editDocument: "Editar documento",
    doneEditing: "Terminar edición",
  },
  DE: {
    bold: "Fett",
    italic: "Kursiv",
    strikethrough: "Durchgestrichen",
    heading: "Überschrift",
    subheading: "Zwischenüberschrift",
    normalText: "Normaler Text",
    normalTextShort: "Normal",
    bulletList: "Aufzählungsliste",
    numberedList: "Nummerierte Liste",
    listLabel: "Liste",
    undo: "Rückgängig",
    redo: "Wiederholen",
    clearFormatting: "Formatierung entfernen",
    askAgentTooltip: "Den Agenten zu dieser Passage fragen",
    askAgent: "Agent fragen",
    openCitation: "Zitat öffnen",
    toolbarHint: "Klicken Sie an eine beliebige Stelle im Dokument, um zu bearbeiten",
    editDocument: "Dokument bearbeiten",
    doneEditing: "Bearbeitung beenden",
  },
  PT: {
    bold: "Negrito",
    italic: "Itálico",
    strikethrough: "Tachado",
    heading: "Título",
    subheading: "Subtítulo",
    normalText: "Texto normal",
    normalTextShort: "Normal",
    bulletList: "Lista com marcadores",
    numberedList: "Lista numerada",
    listLabel: "Lista",
    undo: "Desfazer",
    redo: "Refazer",
    clearFormatting: "Limpar formatação",
    askAgentTooltip: "Pergunte ao agente sobre este trecho",
    askAgent: "Perguntar ao agente",
    openCitation: "Abrir citação",
    toolbarHint: "Clique em qualquer parte do documento para editar",
    editDocument: "Editar documento",
    doneEditing: "Concluir edição",
  },
};
