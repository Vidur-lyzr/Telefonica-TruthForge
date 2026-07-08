import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { skinVars } from "@telefonica/mistica";

// ---- Serialization: plain text (with [Sn] markers and markdown emphasis) <-> TipTap doc

const CITATION_RE = /\[(\s*S\s*\d+(?:\s*,\s*S\s*\d+)*\s*)\]/g;

function normalizeIds(inner: string): string {
  return inner
    .split(",")
    .map((p) => "S" + (p.match(/\d+/)?.[0] ?? ""))
    .filter((p) => p !== "S")
    .join(", ");
}

type InlineNode = JSONContent;

function parseEmphasis(text: string): InlineNode[] {
  const out: InlineNode[] = [];
  // **bold** first, then *italic* inside remaining segments.
  const boldRe = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const pushItalicised = (seg: string) => {
    const italRe = /(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g;
    let l = 0;
    let im: RegExpExecArray | null;
    while ((im = italRe.exec(seg)) !== null) {
      const before = seg.slice(l, im.index) + im[1];
      if (before) out.push({ type: "text", text: before });
      out.push({ type: "text", text: im[2], marks: [{ type: "italic" }] });
      l = im.index + im[0].length;
    }
    const rest = seg.slice(l);
    if (rest) out.push({ type: "text", text: rest });
  };
  while ((m = boldRe.exec(text)) !== null) {
    const before = text.slice(last, m.index);
    if (before) pushItalicised(before);
    out.push({ type: "text", text: m[1], marks: [{ type: "bold" }] });
    last = m.index + m[0].length;
  }
  const rest = text.slice(last);
  if (rest) pushItalicised(rest);
  return out;
}

function parseInline(line: string): InlineNode[] {
  const out: InlineNode[] = [];
  let last = 0;
  CITATION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CITATION_RE.exec(line)) !== null) {
    const before = line.slice(last, m.index);
    if (before) out.push(...parseEmphasis(before));
    out.push({ type: "citationChip", attrs: { ids: normalizeIds(m[1]) } });
    last = m.index + m[0].length;
  }
  const rest = line.slice(last);
  if (rest) out.push(...parseEmphasis(rest));
  return out;
}

export function textToDoc(text: string): JSONContent {
  const lines = text.split("\n");
  const content: JSONContent[] = [];
  let bullets: JSONContent[] | null = null;
  const flushBullets = () => {
    if (bullets && bullets.length > 0) content.push({ type: "bulletList", content: bullets });
    bullets = null;
  };
  for (const line of lines) {
    const bulletMatch = line.match(/^\s*[-•]\s+(.*)$/);
    if (bulletMatch) {
      const inline = parseInline(bulletMatch[1]);
      bullets = bullets ?? [];
      bullets.push({
        type: "listItem",
        content: [{ type: "paragraph", content: inline.length ? inline : undefined }],
      });
      continue;
    }
    flushBullets();
    const inline = parseInline(line);
    content.push({ type: "paragraph", content: inline.length ? inline : undefined });
  }
  flushBullets();
  if (content.length === 0) content.push({ type: "paragraph" });
  return { type: "doc", content };
}

function inlineToText(nodes: JSONContent[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((n) => {
      if (n.type === "citationChip") return `[${(n.attrs?.ids as string) ?? ""}]`;
      if (n.type === "hardBreak") return "\n";
      if (n.type === "text") {
        let t = n.text ?? "";
        const marks = new Set((n.marks ?? []).map((mk) => mk.type));
        if (marks.has("bold") && marks.has("italic")) t = `***${t}***`;
        else if (marks.has("bold")) t = `**${t}**`;
        else if (marks.has("italic")) t = `*${t}*`;
        return t;
      }
      return "";
    })
    .join("");
}

export function docToText(doc: JSONContent): string {
  const lines: string[] = [];
  for (const block of doc.content ?? []) {
    if (block.type === "paragraph") {
      lines.push(inlineToText(block.content));
    } else if (block.type === "bulletList" || block.type === "orderedList") {
      for (const item of block.content ?? []) {
        const inner = (item.content ?? [])
          .map((p) => inlineToText(p.content))
          .join(" ")
          .trim();
        lines.push(`- ${inner}`);
      }
    } else if (block.type === "heading") {
      lines.push(inlineToText(block.content));
    }
  }
  // Trim trailing empty lines the editor tends to accumulate.
  while (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

// ---- Citation chip node --------------------------------------------------------

const CitationChip = Node.create({
  name: "citationChip",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      ids: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-citation-ids]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-citation-ids": node.attrs.ids as string,
        class: "hub-citation-chip",
        role: "button",
        tabindex: "0",
        title: "Open citation",
      }),
      node.attrs.ids as string,
    ];
  },
});

// ---- Bubble toolbar --------------------------------------------------------------

function ToolbarButton({
  label,
  active,
  onPress,
  children,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      style={{
        border: "none",
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 13,
        lineHeight: "18px",
        cursor: "pointer",
        fontFamily: "inherit",
        backgroundColor: active ? skinVars.colors.brand : "transparent",
        color: active ? skinVars.colors.textPrimaryInverse : skinVars.colors.textPrimary,
      }}
    >
      {children}
    </button>
  );
}

// ---- Editor ----------------------------------------------------------------------

export function RichTextEditor({
  value,
  onChange,
  onOpenCitation,
  onAskSelection,
  inverse = false,
  ariaLabel,
}: {
  value: string;
  onChange: (text: string) => void;
  onOpenCitation: (citationId: string) => void;
  onAskSelection?: (passage: string) => void;
  // Umbrella card renders on the brand background with inverse text.
  inverse?: boolean;
  ariaLabel: string;
}) {
  const lastEmitted = React.useRef<string>(value);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = React.useState<{ top: number; left: number } | null>(null);

  const openCitationRef = React.useRef(onOpenCitation);
  openCitationRef.current = onOpenCitation;
  const askSelectionRef = React.useRef(onAskSelection);
  askSelectionRef.current = onAskSelection;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        strike: false,
        horizontalRule: false,
        link: false,
        underline: false,
      }),
      CitationChip,
    ],
    content: textToDoc(value),
    editorProps: {
      attributes: {
        class: "hub-doc-editor",
        "aria-label": ariaLabel,
      },
      handleClickOn: (_view, _pos, node) => {
        if (node.type.name === "citationChip") {
          const ids = String(node.attrs.ids ?? "");
          const first = ids.split(",")[0]?.trim();
          if (first) openCitationRef.current(first);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const text = docToText(ed.getJSON());
      if (text !== lastEmitted.current) {
        lastEmitted.current = text;
        onChange(text);
      }
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to, empty } = ed.state.selection;
      if (empty || !wrapperRef.current) {
        setToolbar(null);
        return;
      }
      const start = ed.view.coordsAtPos(from);
      const end = ed.view.coordsAtPos(to);
      const rect = wrapperRef.current.getBoundingClientRect();
      setToolbar({
        top: Math.min(start.top, end.top) - rect.top - 40,
        left: Math.max(0, (start.left + end.left) / 2 - rect.left - 90),
      });
    },
    onBlur: () => {
      // Delay so toolbar button mousedown fires first.
      window.setTimeout(() => setToolbar((t) => t), 0);
    },
  });

  // Sync external changes (refine result, opening another draft) into the editor
  // without clobbering the caret during the user's own typing.
  React.useEffect(() => {
    if (!editor) return;
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      editor.commands.setContent(textToDoc(value));
      setToolbar(null);
    }
  }, [value, editor]);

  const selectedText = React.useCallback(() => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, "\n", (node) =>
      node.type.name === "citationChip" ? `[${node.attrs.ids}]` : "",
    );
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      ref={wrapperRef}
      className={inverse ? "hub-doc-editor-wrap hub-doc-editor-inverse" : "hub-doc-editor-wrap"}
      style={{ position: "relative" }}
    >
      <EditorContent editor={editor} />
      {toolbar && !editor.state.selection.empty && (
        <div
          style={{
            position: "absolute",
            top: toolbar.top,
            left: toolbar.left,
            zIndex: 10,
            display: "flex",
            gap: 2,
            alignItems: "center",
            padding: 4,
            borderRadius: 8,
            backgroundColor: skinVars.colors.backgroundContainer,
            border: `1px solid ${skinVars.colors.divider}`,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
          }}
        >
          <ToolbarButton
            label="Bold"
            active={editor.isActive("bold")}
            onPress={() => editor.chain().focus().toggleBold().run()}
          >
            <span style={{ fontWeight: 700 }}>B</span>
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor.isActive("italic")}
            onPress={() => editor.chain().focus().toggleItalic().run()}
          >
            <span style={{ fontStyle: "italic" }}>I</span>
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            active={editor.isActive("bulletList")}
            onPress={() => editor.chain().focus().toggleBulletList().run()}
          >
            <span>&bull; List</span>
          </ToolbarButton>
          {askSelectionRef.current && (
            <>
              <div
                style={{
                  width: 1,
                  alignSelf: "stretch",
                  backgroundColor: skinVars.colors.divider,
                  margin: "0 2px",
                }}
              />
              <ToolbarButton
                label="Ask the agent about this passage"
                onPress={() => {
                  const passage = selectedText().trim();
                  if (passage) askSelectionRef.current?.(passage);
                  setToolbar(null);
                }}
              >
                <span style={{ color: skinVars.colors.brand, fontWeight: 500 }}>Ask agent</span>
              </ToolbarButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}
