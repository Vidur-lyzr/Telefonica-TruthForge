import React from "react";
import {
  useStartGenerateJob,
  useStartRefineJob,
  useGetGenerationJob,
  useCheckDocument,
  useListShapes,
  useListAssets,
  useListAxes,
  useListRoles,
  useListSchedules,
  useCreateSchedule,
  useRunSchedule,
  useListReviewItems,
  useApproveReviewItem,
  usePublishReviewItem,
  useListVersions,
  useSaveVersion,
  useSuggestTemplate,
  useBriefChat,
  useListNotifications,
  useMarkNotificationsRead,
  useListDeliveries,
  useRecordEditorialReview,
  useExportDocument,
  useExportDocumentPack,
  exportDocumentPreview,
  type ExportPreviewGates,
  useGetExportTemplates,
  useCanvasSuggestions,
  useCanvasEditBlock,
  useGetBrandTemplates,
  useGetBrandTemplate,
  type BrandTemplateSummary,
  type CanvasSuggestion,
  type GeneratedDraft,
  type DraftExclusion,
  type TemplateSuggestion,
  type BriefChatTurn,
  type BriefChatQuestion,
  type SuggestedBrief,
  type NotificationRecord,
  type DraftSection,
  type ChartSpec,
  type TableSpec,
  type BriefAttachments,
  type Citation,
  type GuardianResult,
  type DocumentShape,
  type Schedule,
  type ReviewItem,
  type SavedVersion,
  type KpiReportContext,
  type AskHandoffContext,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { GENERATE_I18N } from "@/i18n/generate";
import { localeFor } from "@/i18n/planning";
import { RichTextEditor, EditorFocusProvider, DocumentToolbar } from "@/components/document-editor";
import { DOCUMENT_EDITOR_I18N } from "@/i18n/document-editor";
import {
  Box,
  Stack,
  Inline,
  Boxed,
  Divider,
  Text1,
  Text2,
  Text3,
  Title2,
  Title3,
  ButtonPrimary,
  ButtonSecondary,
  ButtonLink,
  IconButton,
  Tag,
  Chip,
  Callout,
  Tabs,
  TextField,
  Select,
  Spinner,
  Touchable,
  Drawer,
  RadioGroup,
  RadioButton,
  Checkbox,
  skinVars,
  applyAlpha,
  IconRobotRegular,
  IconDocumentOtherRegular,
  IconShieldCheckedOkRegular,
  IconAlertRegular,
  IconTimeRegular,
  IconSendRegular,
  IconPrinterRegular,
  IconDownloadRegular,
  IconCalendarRegular,
  IconListDocumentRegular,
  IconCheckRegular,
  IconCheckedRegular,
  IconLockClosedRegular,
  IconMessageRegular,
  IconBarChartRegular,
  IconBookmarkRegular,
  IconEditPencilRegular,
  IconCloseRegular,
  IconRefreshRegular,
  IconSearchRegular,
  IconPenRegular,
  IconBellRegular,
  IconChatRegular,
  IconStarRegular,
  IconUserAccountRegular,
} from "@telefonica/mistica";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

type Shape = "messaging" | "press" | "multiformat";
type Audience = "internal" | "external";
type Tab = "compose" | "scheduled" | "inbox" | "versions";

const c = skinVars.colors;

const SHAPE_META: Record<Shape, { name: string; blurb: string }> = {
  messaging: {
    name: "Messaging house",
    blurb: "Umbrella message and per-axis proof points for internal alignment.",
  },
  press: {
    name: "Press release + Q&A",
    blurb: "External announcement with an on-the-record Q&A holding line.",
  },
  multiformat: {
    name: "Multi-format pack",
    blurb: "One governed narrative, several channel-ready cuts.",
  },
};

// Destination sensitivity of the document being produced. Ordered low to high;
// external audiences are held to public.
const CONFIDENTIALITY_OPTIONS: { value: string; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "confidential", label: "Confidential" },
  { value: "off_the_record", label: "Off the record" },
];

// Shape-aware deliverable formats surfaced in the brief so the engine frames the
// output correctly.
const FORMAT_OPTIONS: Record<Shape, { value: string; label: string }[]> = {
  messaging: [
    { value: "messaging_house", label: "Messaging house" },
    { value: "talking_points", label: "Talking points" },
    { value: "leadership_brief", label: "Leadership brief" },
  ],
  press: [
    { value: "press_release", label: "Press release" },
    { value: "qa_holding_line", label: "Q&A holding line" },
    { value: "media_statement", label: "Media statement" },
  ],
  multiformat: [
    { value: "multichannel_pack", label: "Multi-channel pack" },
    { value: "social_pack", label: "Social pack" },
    { value: "email_and_web", label: "Email and web" },
  ],
};

const LANGUAGE_OPTIONS: { value: string; text: string }[] = [
  { value: "en", text: "English" },
  { value: "es", text: "Español" },
  { value: "de", text: "Deutsch" },
  { value: "pt", text: "Português" },
];

type BriefValues = {
  shape: Shape;
  topic: string;
  audience: Audience;
  language: string;
  axisIds: string[];
  confidentiality: string;
  format: string;
  spokesperson: string | null;
  eventDate: string | null;
  kpiContext: KpiReportContext | null;
  askContext: AskHandoffContext | null;
  attachments: BriefAttachments | null;
};

// Ask → Generate handoff payload written by the Ask page under
// `hub-generate-draft`. Everything here is display-only on this side: the
// server re-validates every cited docId under the CURRENT persona and the
// destination gate before any of it can influence a draft.
type AskDraftHandoff = {
  question: string;
  answer: string;
  citations: Citation[];
  status?: string;
  historic?: boolean;
  historicNote?: string | null;
  conflictNote?: string | null;
  lowConfidence?: boolean;
  lowConfidenceNote?: string | null;
  axisIds?: string[];
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text2 medium color={c.textSecondary}>
      {children}
    </Text2>
  );
}

// ---- Brand Guardian bar ------------------------------------------------------
function GuardianBar({ guardian }: { guardian: GuardianResult }) {
  const { lang } = useApp();
  const te = GENERATE_I18N[lang].editor;
  const pass = guardian.status === "pass";
  return (
    <div
      style={{
        borderRadius: skinVars.borderRadii.container,
        border: `1px solid ${applyAlpha(pass ? skinVars.rawColors.success : skinVars.rawColors.error, 0.2)}`,
        backgroundColor: pass ? c.successLow : c.errorLow,
        padding: 16,
      }}
    >
      <Inline space={12} alignItems="center">
        {pass ? (
          <IconShieldCheckedOkRegular size={20} color={c.success} />
        ) : (
          <IconAlertRegular size={20} color={c.error} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Stack space={4}>
            <Inline space={8} alignItems="center">
              <Text2 medium color={c.textPrimary}>
                {te.guardianName}
              </Text2>
              <Tag type={pass ? "success" : "error"}>
                {pass ? te.guardianCleared : te.guardianBlocked}
              </Tag>
            </Inline>
            <Text2 regular color={c.textPrimary}>
              {guardian.summary}
            </Text2>
          </Stack>
        </div>
      </Inline>
      {guardian.findings.length > 0 && (
        <Box paddingTop={12}>
          <Stack space={8}>
            {guardian.findings.map((f, i) => (
              <Boxed key={i}>
                <Box padding={12}>
                  <Stack space={4}>
                    <Inline space={8} alignItems="center">
                      <Tag type={f.severity === "error" ? "error" : "warning"}>{te.severity[f.severity] ?? f.severity}</Tag>
                      <Text2 medium color={c.textPrimary}>
                        {f.rule}
                      </Text2>
                    </Inline>
                    <Text2 regular color={c.textSecondary}>
                      {f.message}
                    </Text2>
                    {f.suggestion && (
                      <Text2 medium color={c.brand}>
                        {te.fixPrefix} {f.suggestion}
                      </Text2>
                    )}
                  </Stack>
                </Box>
              </Boxed>
            ))}
          </Stack>
        </Box>
      )}
    </div>
  );
}

// ---- Chart -------------------------------------------------------------------
function DraftChart({ chart }: { chart: ChartSpec }) {
  return (
    <Boxed>
      <Box padding={16}>
        <Stack space={12}>
          <Inline space={8} alignItems="center">
            <div style={{ flex: 1 }}>
              <Stack space={2}>
                <Text2 medium color={c.textPrimary}>
                  {chart.title}
                </Text2>
                <Text1 regular color={c.textSecondary}>
                  {chart.unit} • {chart.source}
                </Text1>
              </Stack>
            </div>
            {chart.citationId && <Tag type="promo">{chart.citationId}</Tag>}
          </Inline>
          <ResponsiveContainer width="100%" height={200}>
            {chart.type === "line" ? (
              <LineChart data={chart.points} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.divider} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke={c.textSecondary} />
                <YAxis tick={{ fontSize: 11 }} stroke={c.textSecondary} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="value" stroke={c.brand} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            ) : (
              <BarChart data={chart.points} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.divider} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke={c.textSecondary} />
                <YAxis tick={{ fontSize: 11 }} stroke={c.textSecondary} />
                <RechartsTooltip />
                <Bar dataKey="value" fill={c.brand} radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </Stack>
      </Box>
    </Boxed>
  );
}

// ---- Cited data table ----------------------------------------------------------
function DraftTable({
  table,
  onCellChange,
}: {
  table: TableSpec;
  onCellChange?: (rowIdx: number, colIdx: number, value: string) => void;
}) {
  return (
    <Boxed>
      <Box padding={16}>
        <Stack space={12}>
          <Inline space={8} alignItems="center">
            <div style={{ flex: 1 }}>
              <Stack space={2}>
                <Text2 medium color={c.textPrimary}>
                  {table.title}
                </Text2>
                <Text1 regular color={c.textSecondary}>
                  {table.unit} • {table.source}
                </Text1>
              </Stack>
            </div>
            {table.citationId && <Tag type="promo">{table.citationId}</Tag>}
          </Inline>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {table.columns.map((col, i) => (
                    <th
                      key={i}
                      style={{
                        textAlign: i === 0 ? "left" : "right",
                        padding: "8px 12px",
                        backgroundColor: c.backgroundAlternative,
                        borderBottom: `2px solid ${c.divider}`,
                      }}
                    >
                      <Text1 medium color={c.textSecondary}>
                        {col}
                      </Text1>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((value, ci) => (
                      <td
                        key={ci}
                        style={{
                          textAlign: ci === 0 ? "left" : "right",
                          padding: "8px 12px",
                          borderBottom: `1px solid ${c.divider}`,
                        }}
                      >
                        {onCellChange ? (
                          <input
                            value={value}
                            onChange={(e) => onCellChange(ri, ci, e.target.value)}
                            aria-label={`${table.title} — ${table.columns[ci] ?? ""} ${ri + 1}`}
                            style={{
                              width: "100%",
                              minWidth: 64,
                              border: "none",
                              outline: "none",
                              background: "transparent",
                              fontFamily: "inherit",
                              fontSize: 14,
                              fontWeight: ci === 0 ? 500 : 400,
                              color: c.textPrimary,
                              textAlign: ci === 0 ? "left" : "right",
                              padding: 0,
                            }}
                          />
                        ) : ci === 0 ? (
                          <Text2 medium color={c.textPrimary}>
                            {value}
                          </Text2>
                        ) : (
                          <Text2 regular color={c.textPrimary}>
                            {value}
                          </Text2>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Stack>
      </Box>
    </Boxed>
  );
}

// ---- Inline-editable section (always-live rich editor) ------------------------
function SectionBlock({
  section,
  onChange,
  onOpenCitationId,
  onAskSelection,
  editable = true,
}: {
  section: DraftSection;
  onChange: (body: string) => void;
  onOpenCitationId: (id: string) => void;
  onAskSelection: (passage: string) => void;
  editable?: boolean;
}) {
  const { lang } = useApp();
  const te = GENERATE_I18N[lang].editor;
  return (
    <Stack space={8}>
      <Inline space={8} alignItems="center">
        <Title3>{section.heading}</Title3>
        {section.internalOnly && (
          <Tag type="warning" Icon={IconLockClosedRegular}>
            {te.internalOnly}
          </Tag>
        )}
      </Inline>
      <RichTextEditor
        value={section.body}
        onChange={onChange}
        onOpenCitation={onOpenCitationId}
        onAskSelection={onAskSelection}
        editable={editable}
        ariaLabel={te.sectionBodyAria(section.heading)}
      />
    </Stack>
  );
}

// ---- Hover -> EDIT block wrapper (governed canvas interaction) ------------------
// Hovering any block outlines it and reveals an EDIT affordance at its
// top-right. Locked blocks (boilerplate, contact) are visibly locked instead
// of merely rejecting on save — the server enforces the same rule with 409.
const LOCKED_BLOCK_KINDS = new Set(["boilerplate", "contact", "logo", "image"]);

function HoverBlock({
  section,
  active,
  onEdit,
  enabled = true,
  children,
}: {
  section: DraftSection;
  active: boolean;
  onEdit: () => void;
  // Reading view: no hover outline or EDIT affordance.
  enabled?: boolean;
  children: React.ReactNode;
}) {
  const { lang } = useApp();
  const tc = GENERATE_I18N[lang].editor.canvas;
  const [hovered, setHovered] = React.useState(false);
  const locked = LOCKED_BLOCK_KINDS.has(section.kind);
  const outlined = enabled && (hovered || active);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: skinVars.borderRadii.container,
        outline: outlined
          ? `2px solid ${active ? c.controlActivated : applyAlpha(skinVars.rawColors.controlActivated, 0.45)}`
          : "2px solid transparent",
        outlineOffset: 6,
        transition: "outline-color 120ms ease",
      }}
    >
      {outlined && (
        <div style={{ position: "absolute", top: -14, right: 0, zIndex: 2 }}>
          {locked ? (
            <Tag type="inactive" Icon={IconLockClosedRegular}>
              {tc.lockedBlock}
            </Tag>
          ) : (
            <Touchable onPress={onEdit} aria-label={`${tc.editBlock}: ${section.heading}`}>
              <div
                style={{
                  backgroundColor: c.buttonPrimaryBackground,
                  color: c.textButtonPrimary,
                  borderRadius: skinVars.borderRadii.button,
                  padding: "2px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <IconEditPencilRegular size={12} color="currentColor" />
                {tc.editBlock}
              </div>
            </Touchable>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ---- Left sources pane -----------------------------------------------------------
function SourcesPane({
  citations,
  onOpenCitation,
}: {
  citations: Citation[];
  onOpenCitation: (cit: Citation) => void;
}) {
  const { lang } = useApp();
  const tc = GENERATE_I18N[lang].editor.canvas;
  const td = GENERATE_I18N[lang].dialogs;
  return (
    <div
      style={{
        width: 264,
        flexShrink: 0,
        borderRight: `1px solid ${c.divider}`,
        backgroundColor: c.backgroundAlternative,
        overflowY: "auto",
        padding: 16,
      }}
    >
      <Stack space={12}>
        <Inline space={8} alignItems="center">
          <IconDocumentOtherRegular size={16} color={c.textSecondary} />
          <Text2 medium color={c.textSecondary}>
            {tc.sourcesPaneTitle}
          </Text2>
        </Inline>
        {citations.length === 0 ? (
          <Text1 regular color={c.textSecondary}>
            {tc.sourcesPaneEmpty}
          </Text1>
        ) : (
          <Stack space={8}>
            {citations.map((cit) => (
              <Touchable key={cit.id} onPress={() => onOpenCitation(cit)}>
                <Boxed>
                  <Box padding={12}>
                    <Stack space={4}>
                      <Inline space={8} alignItems="center">
                        <Tag type="promo">{cit.id}</Tag>
                        <Tag type={cit.confidentiality === "public" ? "success" : "warning"}>
                          {cit.confidentiality}
                        </Tag>
                      </Inline>
                      <Text2 medium color={c.textPrimary}>
                        {cit.docTitle}
                      </Text2>
                      <Text1 regular color={c.textSecondary}>
                        {[cit.sourceLoc, cit.version ? `v${cit.version}` : "", cit.owner]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text1>
                      <Text1 regular color={c.textSecondary}>
                        {[cit.validity, `${td.confidence} ${Math.round(cit.confidence * 100)}%`]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text1>
                    </Stack>
                  </Box>
                </Boxed>
              </Touchable>
            ))}
          </Stack>
        )}
      </Stack>
    </div>
  );
}

// ---- Block-scoped agent panel ----------------------------------------------------
function BlockEditPanel({
  draft,
  section,
  roleId,
  onClose,
  onDraftUpdated,
  onLocalSave,
  onOpenCitationId,
}: {
  draft: GeneratedDraft;
  section: DraftSection;
  roleId: string;
  onClose: () => void;
  onDraftUpdated: (draft: GeneratedDraft) => void;
  onLocalSave: (body: string) => void;
  onOpenCitationId: (id: string) => void;
}) {
  const { lang } = useApp();
  const t = GENERATE_I18N[lang];
  const tc = t.editor.canvas;
  const [body, setBody] = React.useState(section.body);
  const [freeform, setFreeform] = React.useState("");
  const [feedback, setFeedback] = React.useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(null);
  const [suggestions, setSuggestions] = React.useState<CanvasSuggestion[] | null>(null);

  const suggest = useCanvasSuggestions();
  const editBlock = useCanvasEditBlock();

  // Reload local state + suggestions whenever the addressed block changes.
  const sectionKey = `${draft.id}:${section.id}:${section.body}`;
  React.useEffect(() => {
    setBody(section.body);
    setFeedback(null);
    setSuggestions(null);
    suggest.mutate(
      { data: { draft, sectionId: section.id, roleId } },
      {
        onSuccess: (res) => setSuggestions(res.suggestions),
        onError: () => setSuggestions([]),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey]);

  const runInstruction = (instruction: string) => {
    if (!instruction.trim() || editBlock.isPending) return;
    setFeedback(null);
    editBlock.mutate(
      { data: { draft, sectionId: section.id, instruction, roleId } },
      {
        onSuccess: (res) => {
          if (res.status === "applied") {
            onDraftUpdated(res.draft);
            if (res.section) setBody(res.section.body);
            setFeedback({ tone: "ok", text: res.note ?? tc.editApplied });
            setFreeform("");
          } else if (res.status === "blocked") {
            setFeedback({
              tone: "error",
              text: res.guardian?.findings?.find((f) => f.severity === "error")?.message ?? tc.editBlocked,
            });
          } else {
            setFeedback({ tone: "warn", text: res.note ?? tc.editNoChange });
          }
        },
        onError: () => setFeedback({ tone: "error", text: tc.editFailed }),
      },
    );
  };

  const generic: { label: string; instruction: string }[] = [
    { label: tc.genericShorten, instruction: "Shorten this block while keeping every cited claim and its [S#] markers intact." },
    { label: tc.genericSharpen, instruction: "Sharpen the wording of this block — tighter sentences, stronger verbs, same facts and citations." },
    { label: tc.genericFixTone, instruction: "Fix the tone of this block to Telefónica's voice: clear, human, confident, no hype." },
    { label: tc.genericRetune, instruction: `Retune this block for a ${draft.audience} audience without adding or dropping any cited claim.` },
  ];

  const shapeName = GENERATE_I18N[lang].form.shapes[draft.shape as Shape]?.name ?? draft.shape;
  const dirty = body !== section.body;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
      <Stack space={16}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconEditPencilRegular size={16} color={c.brand} />
          <div style={{ flex: 1 }}>
            <Text2 medium color={c.textPrimary}>
              {tc.blockPanelContext}
            </Text2>
          </div>
          <IconButton
            aria-label={tc.backToDocument}
            onPress={onClose}
            Icon={IconCloseRegular}
            small
          />
        </div>
        <Inline space={8} alignItems="center" wrap>
          <Tag type="active">{tc.blockTypeLabels[section.kind] ?? section.kind}</Tag>
          <Tag type="promo">{shapeName.toUpperCase()}</Tag>
        </Inline>
        <Stack space={8}>
          <Text1 medium color={c.textSecondary}>
            {tc.contentLabel}
          </Text1>
          <div
            style={{
              backgroundColor: c.background,
              border: `1px solid ${c.divider}`,
              borderRadius: skinVars.borderRadii.container,
              padding: "4px 12px",
            }}
          >
            <RichTextEditor
              value={body}
              onChange={setBody}
              onOpenCitation={onOpenCitationId}
              ariaLabel={tc.contentLabel}
            />
          </div>
        </Stack>
        <Inline space={8}>
          <ButtonSecondary small onPress={() => setBody(section.body)} disabled={!dirty}>
            {tc.reset}
          </ButtonSecondary>
          <ButtonPrimary
            small
            onPress={() => {
              onLocalSave(body);
              setFeedback({ tone: "ok", text: tc.editApplied });
            }}
            disabled={!dirty}
          >
            {tc.save}
          </ButtonPrimary>
        </Inline>
        <Divider />
        <Stack space={8}>
          <Text1 medium color={c.textSecondary}>
            {tc.improveWithAgent}
          </Text1>
          <Inline space={8} wrap>
            {generic.map((g) => (
              <Chip key={g.label} onPress={() => runInstruction(g.instruction)}>
                {g.label}
              </Chip>
            ))}
          </Inline>
          {suggestions === null ? (
            <Inline space={8} alignItems="center">
              <Spinner size={16} />
              <Text1 regular color={c.textSecondary}>
                {tc.suggestionsLoading}
              </Text1>
            </Inline>
          ) : suggestions.length > 0 ? (
            <Stack space={8}>
              {suggestions.map((s) => (
                <Touchable key={s.id} onPress={() => runInstruction(s.instruction)}>
                  <div
                    style={{
                      borderRadius: skinVars.borderRadii.container,
                      border: `1px solid ${applyAlpha(skinVars.rawColors.controlActivated, 0.4)}`,
                      backgroundColor: c.brandLow,
                      padding: "8px 12px",
                    }}
                  >
                    <Stack space={2}>
                      <Text2 medium color={c.textLink}>
                        {s.label}
                      </Text2>
                      {s.detail && (
                        <Text1 regular color={c.textSecondary}>
                          {s.detail}
                        </Text1>
                      )}
                    </Stack>
                  </div>
                </Touchable>
              ))}
            </Stack>
          ) : null}
        </Stack>
        <Stack space={8}>
          <TextField
            name="blockInstruction"
            label={tc.describeChange}
            placeholder={tc.describePlaceholder}
            value={freeform}
            onChangeValue={setFreeform}
            fullWidth
          />
          <Inline space={8} alignItems="center">
            <ButtonPrimary
              small
              onPress={() => runInstruction(freeform)}
              disabled={!freeform.trim() || editBlock.isPending}
            >
              {tc.improveButton}
            </ButtonPrimary>
            <ButtonLink small onPress={onClose}>
              {tc.backToDocument}
            </ButtonLink>
          </Inline>
        </Stack>
        {editBlock.isPending && (
          <Inline space={8} alignItems="center">
            <Spinner size={16} />
            <Text1 regular color={c.textSecondary}>
              {tc.improving}
            </Text1>
          </Inline>
        )}
        {feedback && (
          <div
            style={{
              borderRadius: skinVars.borderRadii.container,
              backgroundColor:
                feedback.tone === "ok" ? c.successLow : feedback.tone === "warn" ? c.warningLow : c.errorLow,
              padding: "8px 12px",
            }}
          >
            <Text1
              regular
              color={feedback.tone === "ok" ? c.success : feedback.tone === "warn" ? c.warning : c.error}
            >
              {feedback.text}
            </Text1>
          </div>
        )}
      </Stack>
    </div>
  );
}

// ---- Q&A structure helpers -----------------------------------------------------
// The Q&A section body is the single source of truth, stored in canonical
// "Q: ... / A: ..." blocks (the server rewrites the model output into this
// format). Parsing and re-serialising here keeps the structured editor, the
// Guardian checks and the export all reading the same text.
type QaPair = { question: string; answer: string };
type QaNote = { question: string; note: string };

const QA_Q_START = /^\s*(?:\*\*)?\s*Q(?:uestion)?\s*\d*\s*(?:\*\*)?\s*[:.)\-–]\s*/i;
const QA_A_START = /^\s*(?:\*\*)?\s*A(?:nswer)?\s*\d*\s*(?:\*\*)?\s*[:.)\-–]\s*/i;

function parseQaBody(body: string): QaPair[] {
  const pairs: QaPair[] = [];
  let question: string[] | null = null;
  let answer: string[] | null = null;
  const flush = () => {
    if (question && answer) {
      const q = question
        .join(" ")
        .replace(/\s+/g, " ")
        .replace(/^\*+|\*+$/g, "")
        .trim();
      const a = answer.join("\n").trim();
      if (q && a) pairs.push({ question: q, answer: a });
    }
    question = null;
    answer = null;
  };
  // Mirrors the server-side parser: models often bold the question and omit
  // the "A:" prefix; once the question looks terminated, the next non-marker
  // line starts the answer.
  const questionComplete = (q: string[]): boolean => {
    const last = (q[q.length - 1] ?? "").trim();
    return /[?.!:]\**$/.test(last) || /\*\*$/.test(last);
  };
  for (const line of body.split("\n")) {
    if (QA_Q_START.test(line)) {
      flush();
      question = [line.replace(QA_Q_START, "").trim()];
      answer = null;
    } else if (QA_A_START.test(line) && question) {
      answer = [line.replace(QA_A_START, "").trim()];
    } else if (answer) {
      answer.push(line.trim());
    } else if (question) {
      const t = line.trim();
      if (!t) continue;
      if (questionComplete(question)) {
        answer = [t];
      } else {
        question.push(t);
      }
    }
  }
  flush();
  return pairs;
}

function serializeQaPairs(pairs: QaPair[]): string {
  return pairs.map((p) => `Q: ${p.question}\nA: ${p.answer}`).join("\n\n");
}

function normalizeQuestion(q: string): string {
  return q.replace(/\s+/g, " ").trim().toLowerCase();
}

// ---- Q&A section: per-answer traceability and internal notes -------------------
function QaBlock({
  section,
  citations,
  notes,
  onChange,
  onNotesChange,
  onOpenCitation,
  onAskSelection,
  editable = true,
}: {
  section: DraftSection;
  citations: Citation[];
  notes: QaNote[];
  onChange: (body: string) => void;
  onNotesChange: (notes: QaNote[]) => void;
  onOpenCitation: (c: Citation) => void;
  onAskSelection: (passage: string) => void;
  editable?: boolean;
}) {
  const { lang } = useApp();
  const te = GENERATE_I18N[lang].editor;
  const items = parseQaBody(section.body);
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [noteText, setNoteText] = React.useState("");

  const noteFor = (question: string): QaNote | undefined =>
    notes.find((n) => normalizeQuestion(n.question) === normalizeQuestion(question));

  const saveNote = (question: string) => {
    const text = noteText.trim();
    const rest = notes.filter((n) => normalizeQuestion(n.question) !== normalizeQuestion(question));
    onNotesChange(text ? [...rest, { question, note: text }] : rest);
    setEditingKey(null);
    setNoteText("");
  };

  const removeNote = (question: string) => {
    onNotesChange(notes.filter((n) => normalizeQuestion(n.question) !== normalizeQuestion(question)));
    if (editingKey === normalizeQuestion(question)) setEditingKey(null);
  };

  const updateAnswer = (idx: number, answer: string) => {
    const next = items.map((p, i) => (i === idx ? { ...p, answer } : p));
    onChange(serializeQaPairs(next));
  };

  return (
    <Stack space={16}>
      <Inline space={8} alignItems="center">
        <Title3>{section.heading}</Title3>
        {section.internalOnly && (
          <Tag type="warning" Icon={IconLockClosedRegular}>
            {te.internalOnly}
          </Tag>
        )}
      </Inline>
      {items.map((item, idx) => {
        const key = normalizeQuestion(item.question);
        const answerCitations = [
          ...new Set([...item.answer.matchAll(/S\s*(\d+)/gi)].map((m) => `S${Number(m[1])}`)),
        ]
          .map((id) => citations.find((cit) => cit.id === id))
          .filter((cit): cit is Citation => Boolean(cit));
        const note = noteFor(item.question);
        const editing = editingKey === key;
        return (
          <div
            key={key}
            style={{
              borderRadius: skinVars.borderRadii.container,
              border: `1px solid ${c.divider}`,
              padding: 16,
            }}
          >
            <Stack space={8}>
              <Text3 medium color={c.textPrimary}>
                {item.question}
              </Text3>
              <RichTextEditor
                value={item.answer}
                onChange={(bodyText) => updateAnswer(idx, bodyText)}
                onOpenCitation={(id) => {
                  const cit = citations.find((x) => x.id === id);
                  if (cit) onOpenCitation(cit);
                }}
                onAskSelection={onAskSelection}
                editable={editable}
                ariaLabel={te.answerAria(item.question)}
              />
              {answerCitations.length > 0 ? (
                <Stack space={4}>
                  {answerCitations.map((cit) => (
                    <Touchable key={cit.id} onPress={() => onOpenCitation(cit)}>
                      <Inline space={4} alignItems="center" wrap>
                        <IconDocumentOtherRegular size={12} color={c.textSecondary} />
                        <Text1 regular color={c.textSecondary}>
                          {[
                            cit.docTitle,
                            cit.version,
                            cit.validUntil ? te.validUntil(cit.validUntil) : "",
                            cit.owner,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text1>
                      </Inline>
                    </Touchable>
                  ))}
                </Stack>
              ) : (
                <Inline space={4} alignItems="center">
                  <IconAlertRegular size={12} color={c.warning} />
                  <Text1 regular color={c.warning}>
                    {te.noGovernedSource}
                  </Text1>
                </Inline>
              )}
              {editable && editing ? (
                <Stack space={8}>
                  <TextField
                    name={`qaNote-${idx}`}
                    label={te.internalNoteLabel}
                    placeholder={te.internalNotePlaceholder}
                    value={noteText}
                    onChangeValue={setNoteText}
                    multiline
                    fullWidth
                  />
                  <Inline space={8}>
                    <ButtonPrimary small onPress={() => saveNote(item.question)}>
                      {te.saveNote}
                    </ButtonPrimary>
                    <ButtonSecondary
                      small
                      onPress={() => {
                        setEditingKey(null);
                        setNoteText("");
                      }}
                    >
                      {te.cancel}
                    </ButtonSecondary>
                  </Inline>
                </Stack>
              ) : note ? (
                <div
                  style={{
                    borderRadius: skinVars.borderRadii.container,
                    border: `1px solid ${applyAlpha(skinVars.rawColors.warning, 0.25)}`,
                    backgroundColor: c.warningLow,
                    padding: 12,
                  }}
                >
                  <Stack space={4}>
                    <Inline space={8} alignItems="center">
                      <IconLockClosedRegular size={12} color={c.warning} />
                      <Tag type="warning">{te.internalNotExportable}</Tag>
                    </Inline>
                    <Text2 regular color={c.textPrimary}>
                      {note.note}
                    </Text2>
                    {editable && (
                      <Inline space={8}>
                        <ButtonLink
                          small
                          onPress={() => {
                            setEditingKey(key);
                            setNoteText(note.note);
                          }}
                        >
                          {te.editNote}
                        </ButtonLink>
                        <ButtonLink small onPress={() => removeNote(item.question)}>
                          {te.remove}
                        </ButtonLink>
                      </Inline>
                    )}
                  </Stack>
                </div>
              ) : editable ? (
                <Inline space={8}>
                  <ButtonLink
                    small
                    onPress={() => {
                      setEditingKey(key);
                      setNoteText("");
                    }}
                    StartIcon={IconPenRegular}
                  >
                    {te.addInternalNote}
                  </ButtonLink>
                </Inline>
              ) : null}
            </Stack>
          </div>
        );
      })}
    </Stack>
  );
}

// ---- WYSIWYG export rendition preview ---------------------------------------
// Renders exactly what the download produces: the server runs the same export
// pipeline (same template, gates and confidentiality checks) and returns a PDF
// rendition of the chosen format. PDF previews are byte-exact; DOCX/PPTX are
// print renditions of the same layout engine.
function ExportRenditionPreview({
  draft,
  format,
  destination,
  templateId,
}: {
  draft: GeneratedDraft;
  format: "pdf" | "docx" | "pptx";
  destination: "internal" | "external";
  templateId: string | null;
}) {
  const { lang } = useApp();
  const tp = GENERATE_I18N[lang].editor.preview;

  type PreviewState =
    | { kind: "loading" }
    | { kind: "error" }
    | { kind: "refused"; message: string; gates: ExportPreviewGates }
    | { kind: "ok"; url: string; exact: boolean; gates: ExportPreviewGates };
  const [state, setState] = React.useState<PreviewState>({ kind: "loading" });
  const urlRef = React.useRef<string | null>(null);

  // Re-render the preview only when something that reaches the exported file
  // changes; debounced so live edits don't spam the renderer.
  const requestSignature = JSON.stringify([
    format,
    destination,
    templateId,
    draft.id,
    draft.title,
    draft.umbrella,
    draft.audience,
    draft.confidentiality,
    draft.language,
    draft.sections.map((s) => [s.id, s.heading, s.body, s.internalOnly]),
    draft.tables ?? [],
    draft.qaNotes ?? [],
    draft.disclaimers,
    draft.spokesperson ?? null,
    draft.charts,
    draft.citations,
  ]);

  React.useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    const t = window.setTimeout(() => {
      exportDocumentPreview({ draft, format, destination, templateId })
        .then((res) => {
          if (cancelled) return;
          if (res.status === "refused") {
            setState({
              kind: "refused",
              message: res.refusedMessage ?? "",
              gates: res.gates,
            });
            return;
          }
          if (!res.pdfBase64) {
            setState({ kind: "error" });
            return;
          }
          const bin = atob(res.pdfBase64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = url;
          setState({ kind: "ok", url, exact: res.exact === true, gates: res.gates });
        })
        .catch(() => {
          if (!cancelled) setState({ kind: "error" });
        });
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestSignature]);

  React.useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const gateChips = (gates: ExportPreviewGates) => (
    <Inline space={8} alignItems="center" wrap>
      <Text2 medium color={c.textSecondary}>
        {tp.gatesLabel}
      </Text2>
      {[
        { label: tp.gateGuardian, gate: gates.guardian },
        { label: tp.gateApproval, gate: gates.approval },
        { label: tp.gateEditorial, gate: gates.editorial },
      ].map(({ label, gate }) => (
        <Tag key={label} type={gate.blocked ? "error" : "success"}>
          {`${label}: ${gate.blocked ? tp.gateBlocked : tp.gateClear}`}
        </Tag>
      ))}
    </Inline>
  );

  if (state.kind === "loading") {
    return (
      <Boxed>
        <Box padding={32}>
          <Inline space={12} alignItems="center">
            <Spinner size={24} />
            <Text2 regular color={c.textSecondary}>
              {tp.rendering}
            </Text2>
          </Inline>
        </Box>
      </Boxed>
    );
  }

  if (state.kind === "error") {
    return (
      <Boxed>
        <Box padding={32}>
          <Inline space={8} alignItems="center">
            <IconAlertRegular size={20} color={c.error} />
            <Text2 regular color={c.textSecondary}>
              {tp.renderFailed}
            </Text2>
          </Inline>
        </Box>
      </Boxed>
    );
  }

  if (state.kind === "refused") {
    return (
      <Boxed>
        <Box padding={32}>
          <Stack space={16}>
            <Inline space={8} alignItems="center">
              <IconLockClosedRegular size={20} color={c.error} />
              <Text3 medium>{tp.blockedTitle}</Text3>
            </Inline>
            {state.message && (
              <Text2 regular color={c.textSecondary}>
                {state.message}
              </Text2>
            )}
            {gateChips(state.gates)}
          </Stack>
        </Box>
      </Boxed>
    );
  }

  return (
    <Stack space={16}>
      <Inline space={8} alignItems="center">
        <IconDocumentOtherRegular size={16} color={c.textSecondary} />
        <Text2 regular color={c.textSecondary}>
          {state.exact ? tp.exactNote : tp.approxNote}
        </Text2>
      </Inline>
      {gateChips(state.gates)}
      <div
        style={{
          borderRadius: skinVars.borderRadii.container,
          border: `1px solid ${c.divider}`,
          overflow: "hidden",
          backgroundColor: c.backgroundAlternative,
        }}
      >
        <iframe
          src={state.url}
          title={tp.frameTitle(format.toUpperCase())}
          style={{
            display: "block",
            width: "100%",
            height: format === "pptx" ? 480 : 760,
            border: "none",
          }}
        />
      </div>
    </Stack>
  );
}

// ---- The document canvas -----------------------------------------------------
function DocumentCanvas({
  draft,
  onSectionChange,
  onUmbrellaChange,
  onQaNotesChange,
  onTableChange,
  onOpenCitation,
  onAskSelection,
  editingSectionId,
  onEditBlock,
  destination,
  templateId,
}: {
  draft: GeneratedDraft;
  onSectionChange: (id: string, body: string) => void;
  onUmbrellaChange: (body: string) => void;
  onQaNotesChange: (notes: QaNote[]) => void;
  onTableChange: (tableId: string, rowIdx: number, colIdx: number, value: string) => void;
  onOpenCitation: (c: Citation) => void;
  onAskSelection: (passage: string) => void;
  editingSectionId: string | null;
  onEditBlock: (id: string) => void;
  destination: "internal" | "external";
  templateId: string | null;
}) {
  const { lang } = useApp();
  const te = GENERATE_I18N[lang].editor;
  const tp = te.preview;
  const tde = DOCUMENT_EDITOR_I18N[lang];
  // Reading view by default; the Edit toggle switches the whole document
  // into full editing format (toolbar, live editors, table inputs).
  const [editMode, setEditMode] = React.useState(false);
  // WYSIWYG rendition tabs: the Editor tab is the live document; the PDF,
  // DOCX and PPTX tabs show a server-rendered preview of the actual export.
  const viewModes = ["editor", "pdf", "docx", "pptx"] as const;
  const [viewMode, setViewMode] = React.useState<(typeof viewModes)[number]>("editor");
  const externalStripped = draft.audience === "external";
  const visibleSections = externalStripped
    ? draft.sections.filter((s) => !s.internalOnly)
    : draft.sections;

  const openCitationById = (id: string) => {
    const cit = draft.citations.find((x) => x.id === id);
    if (cit) onOpenCitation(cit);
  };

  return (
    <EditorFocusProvider>
      <div style={{ maxWidth: 768 }}>
        <Stack space={16}>
        <Tabs
          selectedIndex={viewModes.indexOf(viewMode)}
          onChange={(idx) => {
            const next = viewModes[idx];
            setViewMode(next);
            if (next !== "editor") setEditMode(false);
          }}
          tabs={[
            { text: tp.tabEditor },
            { text: "PDF" },
            { text: "DOCX" },
            { text: "PPTX" },
          ]}
        />
        {viewMode !== "editor" ? (
          <ExportRenditionPreview
            draft={draft}
            format={viewMode}
            destination={destination}
            templateId={templateId}
          />
        ) : (
        <Boxed>
          <Box padding={32}>
            <Stack space={32}>
              <Stack space={12}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <Inline space={8} alignItems="center" wrap>
                    <Tag type="promo">{GENERATE_I18N[lang].form.shapes[draft.shape as Shape]?.name ?? draft.shape}</Tag>
                    <Tag type={draft.audience === "external" ? "success" : "info"}>{te.audience[draft.audience] ?? draft.audience}</Tag>
                    <Tag type="inactive">{draft.confidentiality}</Tag>
                    <Tag type="inactive">{draft.language}</Tag>
                  </Inline>
                  {editMode ? (
                    <ButtonPrimary small onPress={() => setEditMode(false)}>
                      {tde.doneEditing}
                    </ButtonPrimary>
                  ) : (
                    <ButtonSecondary
                      small
                      onPress={() => setEditMode(true)}
                      StartIcon={IconEditPencilRegular}
                    >
                      {tde.editDocument}
                    </ButtonSecondary>
                  )}
                </div>
                <Title2>{draft.title}</Title2>
                <Divider />
              </Stack>

              {editMode && <DocumentToolbar />}

            {draft.historic && (
              <div
                style={{
                  borderRadius: skinVars.borderRadii.container,
                  border: `1px solid ${applyAlpha(skinVars.rawColors.warning, 0.2)}`,
                  backgroundColor: c.warningLow,
                  padding: 16,
                }}
              >
                <Inline space={8} alignItems="center">
                  <IconTimeRegular size={20} color={c.warning} />
                  <Text2 medium color={c.warning}>
                    {draft.historicNote || te.historicDefault}
                  </Text2>
                </Inline>
              </div>
            )}

            {draft.askSignals &&
              (draft.askSignals.conflict ||
                draft.askSignals.lowConfidence ||
                draft.askSignals.historic) && (
                <div
                  style={{
                    borderRadius: skinVars.borderRadii.container,
                    border: `1px solid ${applyAlpha(skinVars.rawColors.warning, 0.2)}`,
                    backgroundColor: c.warningLow,
                    padding: 16,
                  }}
                >
                  <Stack space={8}>
                    <Inline space={8} alignItems="center" wrap>
                      <IconAlertRegular size={20} color={c.warning} />
                      <Text2 medium color={c.warning}>
                        {te.askFlaggedTitle}
                      </Text2>
                      {draft.askSignals.conflict && <Tag type="error">{te.sourcesConflict}</Tag>}
                      {draft.askSignals.lowConfidence && <Tag type="warning">{te.lowConfidence}</Tag>}
                      {draft.askSignals.historic && <Tag type="warning">{te.historicSource}</Tag>}
                    </Inline>
                    {draft.askSignals.note && (
                      <Text1 regular color={c.textSecondary}>
                        {draft.askSignals.note}
                      </Text1>
                    )}
                  </Stack>
                </div>
              )}

            {draft.umbrella && (
              <div
                style={{
                  backgroundColor: c.brand,
                  borderRadius: skinVars.borderRadii.container,
                  padding: 24,
                }}
              >
                <Stack space={8}>
                  <Text1 medium color={c.textPrimaryInverse}>
                    {te.umbrellaMessage}
                  </Text1>
                  <div style={{ color: c.textPrimaryInverse }}>
                    <RichTextEditor
                      value={draft.umbrella}
                      onChange={onUmbrellaChange}
                      onOpenCitation={openCitationById}
                      onAskSelection={onAskSelection}
                      inverse
                      editable={editMode}
                      ariaLabel={te.umbrellaMessage}
                    />
                  </div>
                </Stack>
              </div>
            )}

            <Stack space={32}>
              {visibleSections.map((s) => (
                <HoverBlock
                  key={s.id}
                  section={s}
                  active={editingSectionId === s.id}
                  onEdit={() => onEditBlock(s.id)}
                  enabled={editMode}
                >
                  {s.kind === "qa" && parseQaBody(s.body).length > 0 ? (
                    <QaBlock
                      section={s}
                      citations={draft.citations}
                      notes={draft.qaNotes ?? []}
                      onChange={(body) => onSectionChange(s.id, body)}
                      onNotesChange={onQaNotesChange}
                      onOpenCitation={onOpenCitation}
                      onAskSelection={onAskSelection}
                      editable={editMode}
                    />
                  ) : (
                    <SectionBlock
                      section={s}
                      onChange={(body) => onSectionChange(s.id, body)}
                      onOpenCitationId={openCitationById}
                      onAskSelection={onAskSelection}
                      editable={editMode}
                    />
                  )}
                </HoverBlock>
              ))}
            </Stack>

            {draft.charts.length > 0 && (
              <Stack space={16}>
                {draft.charts.map((ch) => (
                  <DraftChart key={ch.id} chart={ch} />
                ))}
              </Stack>
            )}

            {(draft.tables ?? []).length > 0 && (
              <Stack space={16}>
                {(draft.tables ?? []).map((t) => (
                  <DraftTable
                    key={t.id}
                    table={t}
                    onCellChange={
                      editMode ? (ri, ci, v) => onTableChange(t.id, ri, ci, v) : undefined
                    }
                  />
                ))}
              </Stack>
            )}

            {draft.citations.length > 0 && (
              <Stack space={16}>
                <Divider />
                <Inline space={8} alignItems="center">
                  <IconDocumentOtherRegular size={16} color={c.textSecondary} />
                  <Text2 medium color={c.textSecondary}>
                    {te.evidenceAndCitations}
                  </Text2>
                </Inline>
                <Stack space={12}>
                  {draft.citations.map((cit) => (
                    <Touchable key={cit.id} onPress={() => onOpenCitation(cit)}>
                      <Boxed>
                        <Box padding={12}>
                          <Inline space={12} alignItems="center">
                            <Tag type="promo">{cit.id}</Tag>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Stack space={2}>
                                <Text2 medium color={c.textPrimary}>
                                  {cit.docTitle}
                                </Text2>
                                <Text1 regular color={c.textSecondary}>
                                  {cit.sourceLoc} • v{cit.version}
                                </Text1>
                              </Stack>
                            </div>
                            {cit.value && (
                              <Text2 medium color={c.success}>
                                {cit.value}
                              </Text2>
                            )}
                          </Inline>
                        </Box>
                      </Boxed>
                    </Touchable>
                  ))}
                </Stack>
              </Stack>
            )}

            {draft.disclaimers.length > 0 && (
              <Stack space={8}>
                <Divider />
                {draft.disclaimers.map((d) => (
                  <Text1 regular key={d.id} color={c.textSecondary}>
                    {d.text}
                  </Text1>
                ))}
              </Stack>
            )}
          </Stack>
        </Box>
      </Boxed>
        )}
        </Stack>
      </div>
    </EditorFocusProvider>
  );
}

// ---- Start-from-template preview (Brand Room library) -------------------------
function TemplateStartPreview({
  templateId,
  roleId,
  onUse,
}: {
  templateId: string;
  roleId?: string;
  onUse: (shape: string) => void;
}) {
  const { lang } = useApp();
  const t = GENERATE_I18N[lang].form;
  const { data, isLoading } = useGetBrandTemplate(
    roleId ? { templateId, roleId } : { templateId },
  );
  if (isLoading) {
    return (
      <Text2 regular color={c.textSecondary}>
        {t.tplLoading}
      </Text2>
    );
  }
  if (!data || data.blocked || !data.template) return null;
  const tpl = data.template;
  return (
    <Boxed>
      <Box padding={16}>
        <Stack space={12}>
          <Stack space={4}>
            <Inline space={8} alignItems="center" wrap>
              <Text2 medium color={c.textPrimary}>
                {tpl.name}
              </Text2>
              <Tag type="inactive">{tpl.format}</Tag>
              <Tag type="inactive">{`v${tpl.version}`}</Tag>
              <Tag type="inactive">{tpl.owner}</Tag>
            </Inline>
            <Text1 regular color={c.textSecondary}>
              {tpl.description}
            </Text1>
          </Stack>
          <Stack space={4}>
            <Text1 medium color={c.textSecondary}>
              {t.tplSections}
            </Text1>
            {tpl.sections.map((s) => (
              <Text1 key={s.key} regular color={c.textPrimary}>
                {`- ${s.label}`}
              </Text1>
            ))}
          </Stack>
          <Inline space={8}>
            <ButtonPrimary small onPress={() => onUse(tpl.shape)}>
              {t.tplUse}
            </ButtonPrimary>
          </Inline>
        </Stack>
      </Box>
    </Boxed>
  );
}

// ---- Brief form --------------------------------------------------------------
function BriefForm({
  onGenerate,
  isPending,
}: {
  shapes: DocumentShape[] | undefined;
  onGenerate: (v: BriefValues) => void;
  isPending: boolean;
}) {
  const { lang: globalLang, roleId } = useApp();
  const t = GENERATE_I18N[globalLang].form;
  const { data: axes } = useListAxes();
  const brandTemplatesQ = useGetBrandTemplates(roleId ? { roleId } : undefined);
  const [pickedTemplateId, setPickedTemplateId] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"form" | "chat">("form");
  const [shape, setShape] = React.useState<Shape>("messaging");
  const [topic, setTopic] = React.useState("");
  const [audience, setAudience] = React.useState<Audience>("internal");
  const [language, setLanguage] = React.useState(() => globalLang.toLowerCase());
  // The brief's output language follows the UI language until the user picks
  // one explicitly (or a suggestion sets it) — then their choice wins.
  const languageTouchedRef = React.useRef(false);
  React.useEffect(() => {
    if (!languageTouchedRef.current) setLanguage(globalLang.toLowerCase());
  }, [globalLang]);
  const [axisIds, setAxisIds] = React.useState<string[]>([]);
  const [confidentiality, setConfidentiality] = React.useState("private");
  const [spokesperson, setSpokesperson] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const formatOptions = FORMAT_OPTIONS[shape];
  const [format, setFormat] = React.useState(formatOptions[0].value);
  const [kpiContext, setKpiContext] = React.useState<KpiReportContext | null>(null);
  const [askDraft, setAskDraft] = React.useState<AskDraftHandoff | null>(null);
  const [attachmentText, setAttachmentText] = React.useState("");
  const [attachmentLinksText, setAttachmentLinksText] = React.useState("");

  const changeAudience = (a: Audience) => {
    setAudience(a);
    setConfidentiality(a === "external" ? "public" : "private");
  };

  React.useEffect(() => {
    setFormat(FORMAT_OPTIONS[shape][0].value);
  }, [shape]);

  // Prefill handed over from the KPIs page ("Generate KPI report").
  React.useEffect(() => {
    const raw = sessionStorage.getItem("hub-kpi-report-prefill");
    if (!raw) return;
    sessionStorage.removeItem("hub-kpi-report-prefill");
    try {
      const prefill = JSON.parse(raw) as {
        topic?: string;
        audience?: string;
        confidentiality?: string;
        kpiContext?: KpiReportContext | null;
      };
      if (prefill.topic) setTopic(prefill.topic);
      if (prefill.audience === "internal" || prefill.audience === "external") {
        setAudience(prefill.audience);
      }
      if (prefill.confidentiality) setConfidentiality(prefill.confidentiality);
      if (prefill.kpiContext && typeof prefill.kpiContext === "object") {
        setKpiContext(prefill.kpiContext);
      }
    } catch {
      // Malformed handoff payloads are ignored; the form simply starts empty.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill handed over from the Ask page ("Export to Generate"). The payload
  // is consumed exactly once (removed on read, mirroring the KPI handoff) and
  // only prefills the brief — the server re-validates every cited source under
  // the current persona before anything reaches the model.
  React.useEffect(() => {
    const raw = localStorage.getItem("hub-generate-draft");
    if (!raw) return;
    localStorage.removeItem("hub-generate-draft");
    try {
      const d = JSON.parse(raw) as AskDraftHandoff;
      if (typeof d.question !== "string" || !Array.isArray(d.citations)) return;
      setAskDraft(d);
      setTopic(d.question);
      if (Array.isArray(d.axisIds) && d.axisIds.length > 0) {
        setAxisIds(d.axisIds.filter((a) => typeof a === "string"));
      }
    } catch {
      // Malformed handoff payloads are ignored; the form simply starts empty.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Natural-language set-up suggestion.
  const suggestTemplate = useSuggestTemplate();
  const [nlDescription, setNlDescription] = React.useState("");
  const [suggestion, setSuggestion] = React.useState<TemplateSuggestion | null>(null);

  const applySuggested = (b: SuggestedBrief) => {
    if (b.shape && b.shape in SHAPE_META) setShape(b.shape as Shape);
    if (b.topic) setTopic(b.topic);
    if (b.audience === "internal" || b.audience === "external") {
      setAudience(b.audience);
      setConfidentiality(
        b.confidentiality ?? (b.audience === "external" ? "public" : "private"),
      );
    } else if (b.confidentiality) {
      setConfidentiality(b.confidentiality);
    }
    if (b.language && LANGUAGE_OPTIONS.some((l) => l.value === b.language)) {
      languageTouchedRef.current = true;
      setLanguage(b.language);
    }
    if (b.axisIds.length > 0) setAxisIds(b.axisIds);
    if (b.spokesperson) setSpokesperson(b.spokesperson);
    if (b.eventDate) setEventDate(b.eventDate);
  };

  const requestSuggestion = () => {
    if (!nlDescription.trim()) return;
    suggestTemplate.mutate(
      { data: { description: nlDescription.trim() } },
      { onSuccess: (s) => setSuggestion(s) },
    );
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    if (suggestion.shape in SHAPE_META) setShape(suggestion.shape as Shape);
    applySuggested(suggestion.brief);
    setSuggestion(null);
  };

  const [followUp, setFollowUp] = React.useState<string | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = React.useState("");
  const [askedFollowUp, setAskedFollowUp] = React.useState(false);

  const FOLLOW_UP: Record<Shape, string> = t.followUpQuestions;

  const toggleAxis = (id: string) =>
    setAxisIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const briefIsThin = topic.trim().split(/\s+/).filter(Boolean).length < 6;

  const buildValues = (finalTopic: string, overrides: Partial<BriefValues> = {}): BriefValues => ({
    shape,
    topic: finalTopic,
    audience,
    language,
    axisIds,
    confidentiality,
    format,
    spokesperson: spokesperson.trim() || null,
    eventDate: eventDate.trim() || null,
    kpiContext,
    askContext: askDraft
      ? {
          question: askDraft.question,
          citedDocIds: [...new Set(askDraft.citations.map((ct) => ct.docId))],
          status: askDraft.status ?? null,
          historic: askDraft.historic ?? null,
          lowConfidence: askDraft.lowConfidence ?? null,
        }
      : null,
    attachments: buildAttachments(),
    ...overrides,
  });

  const buildAttachments = (): BriefAttachments | null => {
    const pastedText = attachmentText.trim();
    const links = attachmentLinksText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!pastedText && links.length === 0) return null;
    return { pastedText: pastedText || null, links };
  };

  const submitBrief = () => {
    if (!askedFollowUp && briefIsThin) {
      setFollowUp(FOLLOW_UP[shape]);
      return;
    }
    onGenerate(buildValues(topic));
  };

  const submitFollowUp = (skip: boolean) => {
    setAskedFollowUp(true);
    setFollowUp(null);
    const finalTopic =
      !skip && followUpAnswer.trim() ? `${topic.trim()} — ${followUpAnswer.trim()}` : topic;
    onGenerate(buildValues(finalTopic));
  };

  // Chat completion: the guided chat shows a "Generate" CTA once the brief is
  // captured. Values are built directly from the captured fields (state set by
  // applySuggested is async and would not be visible yet in this render).
  const handleChatGenerate = (fields: SuggestedBrief) => {
    applySuggested(fields);
    const chatShape: Shape =
      fields.shape && fields.shape in SHAPE_META ? (fields.shape as Shape) : shape;
    const chatAudience: Audience = fields.audience === "external" ? "external" : "internal";
    const chatConfidentiality =
      chatAudience === "external"
        ? "public"
        : fields.confidentiality &&
            CONFIDENTIALITY_OPTIONS.some((o) => o.value === fields.confidentiality)
          ? fields.confidentiality
          : "private";
    const chatLanguage =
      fields.language && LANGUAGE_OPTIONS.some((l) => l.value === fields.language)
        ? fields.language
        : language;
    setMode("form");
    onGenerate(
      buildValues(fields.topic?.trim() || topic, {
        shape: chatShape,
        audience: chatAudience,
        language: chatLanguage,
        confidentiality: chatConfidentiality,
        axisIds: fields.axisIds.length > 0 ? fields.axisIds : axisIds,
        format: FORMAT_OPTIONS[chatShape][0].value,
        spokesperson: fields.spokesperson?.trim() || null,
        eventDate: fields.eventDate?.trim() || null,
      }),
    );
  };

  // Brief attachments panel — shared between the structured form and the
  // guided chat. Attachments travel as labeled prompt context only: they are
  // never cited and never enter governed retrieval.
  const attachmentsPanel = (
    <div
      style={{
        borderRadius: skinVars.borderRadii.container,
        border: `1px solid ${c.divider}`,
        backgroundColor: c.backgroundContainer,
        padding: 20,
      }}
    >
      <Stack space={12}>
        <Inline space={8} alignItems="center">
          <IconDocumentOtherRegular size={16} color={c.brand} />
          <Text2 medium color={c.textPrimary}>
            {t.attachmentsTitle}
          </Text2>
        </Inline>
        <TextField
          name="attachmentText"
          label={t.attachmentsTextLabel}
          placeholder={t.attachmentsTextPlaceholder}
          value={attachmentText}
          onChangeValue={setAttachmentText}
          multiline
          fullWidth
        />
        <TextField
          name="attachmentLinks"
          label={t.attachmentsLinksLabel}
          placeholder={t.attachmentsLinksPlaceholder}
          value={attachmentLinksText}
          onChangeValue={setAttachmentLinksText}
          multiline
          fullWidth
        />
        <Text1 regular color={c.textSecondary}>
          {t.attachmentsHelper}
        </Text1>
      </Stack>
    </div>
  );

  return (
    <div style={{ maxWidth: 768, margin: "0 auto", width: "100%" }}>
      <Stack space={32}>
        <Stack space={12}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: skinVars.borderRadii.container,
                backgroundColor: c.brandLow,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconRobotRegular size={28} color={c.brand} />
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <Title2>{t.title}</Title2>
          </div>
          <div style={{ textAlign: "center" }}>
            <Text3 regular color={c.textSecondary} textAlign="center">
              {t.subtitle}
            </Text3>
          </div>
        </Stack>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <Inline space={8}>
            <Chip active={mode === "form"} onPress={() => setMode("form")} Icon={IconListDocumentRegular}>
              {t.modeStructured}
            </Chip>
            <Chip active={mode === "chat"} onPress={() => setMode("chat")} Icon={IconChatRegular}>
              {t.modeGuided}
            </Chip>
          </Inline>
        </div>

        {mode === "chat" ? (
          <Stack space={24}>
            <GuidedChat onGenerate={handleChatGenerate} isGenerating={isPending} />
            {attachmentsPanel}
          </Stack>
        ) : (
        <Stack space={32}>
        <div
          style={{
            borderRadius: skinVars.borderRadii.container,
            border: `1px solid ${c.divider}`,
            backgroundColor: c.backgroundAlternative,
            padding: 20,
          }}
        >
          <Stack space={12}>
            <Inline space={8} alignItems="center">
              <IconStarRegular size={16} color={c.brand} />
              <Text2 medium color={c.textPrimary}>
                {t.nlPanelTitle}
              </Text2>
            </Inline>
            <TextField
              name="nlDescription"
              label={t.nlLabel}
              placeholder={t.nlPlaceholder}
              value={nlDescription}
              onChangeValue={setNlDescription}
              fullWidth
            />
            <Inline space={8}>
              <ButtonSecondary
                small
                onPress={requestSuggestion}
                disabled={!nlDescription.trim() || suggestTemplate.isPending}
              >
                {suggestTemplate.isPending ? t.nlThinking : t.nlSuggest}
              </ButtonSecondary>
            </Inline>
            {suggestion && (
              <Boxed>
                <Box padding={16}>
                  <Stack space={8}>
                    <Inline space={8} alignItems="center">
                      <Tag type="promo">{suggestion.templateName}</Tag>
                    </Inline>
                    <Text2 regular color={c.textSecondary}>
                      {suggestion.rationale}
                    </Text2>
                    <Inline space={8}>
                      <ButtonPrimary small onPress={applySuggestion}>
                        {t.nlUse}
                      </ButtonPrimary>
                      <ButtonSecondary small onPress={() => setSuggestion(null)}>
                        {t.nlDismiss}
                      </ButtonSecondary>
                    </Inline>
                  </Stack>
                </Box>
              </Boxed>
            )}
          </Stack>
        </div>

        {(brandTemplatesQ.data?.templates ?? []).length > 0 && (
          <div
            style={{
              borderRadius: skinVars.borderRadii.container,
              border: `1px solid ${c.divider}`,
              backgroundColor: c.backgroundAlternative,
              padding: 20,
            }}
          >
            <Stack space={12}>
              <Inline space={8} alignItems="center">
                <IconListDocumentRegular size={16} color={c.brand} />
                <Text2 medium color={c.textPrimary}>
                  {t.tplPanelTitle}
                </Text2>
              </Inline>
              <Inline space={8} wrap>
                {(brandTemplatesQ.data?.templates ?? []).map((bt: BrandTemplateSummary) => (
                  <Chip
                    key={bt.id}
                    active={pickedTemplateId === bt.id}
                    onPress={() =>
                      setPickedTemplateId((curr) => (curr === bt.id ? null : bt.id))
                    }
                  >
                    {bt.name}
                  </Chip>
                ))}
              </Inline>
              {pickedTemplateId && (
                <TemplateStartPreview
                  templateId={pickedTemplateId}
                  roleId={roleId ?? undefined}
                  onUse={(s) => {
                    if (s in SHAPE_META) setShape(s as Shape);
                    setPickedTemplateId(null);
                  }}
                />
              )}
            </Stack>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {(Object.keys(SHAPE_META) as Shape[]).map((s) => {
            const selected = shape === s;
            return (
              <Touchable key={s} onPress={() => setShape(s)}>
                <div
                  style={{
                    textAlign: "left",
                    padding: 16,
                    borderRadius: skinVars.borderRadii.container,
                    border: `1px solid ${selected ? c.brand : c.divider}`,
                    backgroundColor: selected ? c.brandLow : c.backgroundContainer,
                  }}
                >
                  <Stack space={4}>
                    <Text2 medium color={c.textPrimary}>
                      {t.shapes[s].name}
                    </Text2>
                    <Text1 regular color={c.textSecondary}>
                      {t.shapes[s].blurb}
                    </Text1>
                  </Stack>
                </div>
              </Touchable>
            );
          })}
        </div>

        <Stack space={8}>
          <FieldLabel>{t.briefLabel}</FieldLabel>
          <TextField
            name="brief"
            label={t.briefLabel}
            placeholder={t.briefPlaceholder}
            value={topic}
            onChangeValue={setTopic}
            multiline
            fullWidth
          />
          {kpiContext && (
            <Inline space={8} alignItems="center">
              <Chip onClose={() => setKpiContext(null)}>
                {t.kpiPanelAttached(
                  `${kpiContext.area}, ${
                    kpiContext.period === "custom" && kpiContext.rangeFrom && kpiContext.rangeTo
                      ? t.kpiRange(kpiContext.rangeFrom, kpiContext.rangeTo)
                      : kpiContext.period
                  }${kpiContext.market ? `, ${kpiContext.market}` : ""}`,
                )}
              </Chip>
              <Text1 regular color={c.textSecondary}>
                {t.kpiHelper}
              </Text1>
            </Inline>
          )}
          {askDraft && (
            <Boxed>
              <Box padding={16}>
                <Stack space={12}>
                  <Inline space="between" alignItems="center">
                    <Inline space={8} alignItems="center">
                      <IconMessageRegular size={20} color={c.brand} />
                      <Text2 medium>{t.askAttached}</Text2>
                    </Inline>
                    <Chip onClose={() => setAskDraft(null)}>{t.askDetach}</Chip>
                  </Inline>
                  {(askDraft.status === "conflict" ||
                    askDraft.historic ||
                    askDraft.lowConfidence) && (
                    <Inline space={8}>
                      {askDraft.status === "conflict" && <Tag type="error">{t.askConflict}</Tag>}
                      {askDraft.historic && <Tag type="warning">{t.askHistoric}</Tag>}
                      {askDraft.lowConfidence && <Tag type="warning">{t.askLowConfidence}</Tag>}
                    </Inline>
                  )}
                  {askDraft.status === "conflict" && askDraft.conflictNote && (
                    <Text1 regular color={c.textSecondary}>
                      {askDraft.conflictNote}
                    </Text1>
                  )}
                  {askDraft.historic && askDraft.historicNote && (
                    <Text1 regular color={c.textSecondary}>
                      {askDraft.historicNote}
                    </Text1>
                  )}
                  {askDraft.lowConfidence && askDraft.lowConfidenceNote && (
                    <Text1 regular color={c.textSecondary}>
                      {askDraft.lowConfidenceNote}
                    </Text1>
                  )}
                  <Text1 regular color={c.textSecondary}>
                    {askDraft.answer.length > 280
                      ? `${askDraft.answer.slice(0, 280).trimEnd()}…`
                      : askDraft.answer}
                  </Text1>
                  {askDraft.citations.length > 0 && (
                    <Stack space={4}>
                      <Text1 medium color={c.textSecondary}>
                        {t.askCitedSources}
                      </Text1>
                      {[...new Map(askDraft.citations.map((ct) => [ct.docId, ct])).values()].map(
                        (ct) => (
                          <Inline space={8} alignItems="center" key={ct.docId}>
                            <IconDocumentOtherRegular size={16} color={c.textSecondary} />
                            <Text1 regular>{ct.docTitle}</Text1>
                          </Inline>
                        ),
                      )}
                    </Stack>
                  )}
                  <Text1 regular color={c.textSecondary}>
                    {t.askRecheckHelper}
                  </Text1>
                </Stack>
              </Box>
            </Boxed>
          )}
        </Stack>

        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}
        >
          <Stack space={8}>
            <FieldLabel>{t.audienceLabel}</FieldLabel>
            <Select
              name="audience"
              label={t.audienceLabel}
              value={audience}
              onChangeValue={(v) => changeAudience(v as Audience)}
              options={[
                { value: "internal", text: t.audienceInternal },
                { value: "external", text: t.audienceExternal },
              ]}
              fullWidth
            />
            {audience === "external" && (
              <Inline space={4} alignItems="center">
                <IconLockClosedRegular size={12} color={c.brand} />
                <Text1 regular color={c.brand}>
                  {t.audienceExternalHelper}
                </Text1>
              </Inline>
            )}
          </Stack>
          <Stack space={8}>
            <FieldLabel>{t.languageLabel}</FieldLabel>
            <Select
              name="language"
              label={t.languageLabel}
              value={language}
              onChangeValue={(v) => {
                languageTouchedRef.current = true;
                setLanguage(v);
              }}
              options={LANGUAGE_OPTIONS.map((o) => ({
                value: o.value,
                text: t.languageOptions[o.value] ?? o.text,
              }))}
              fullWidth
            />
          </Stack>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}
        >
          <Stack space={8}>
            <FieldLabel>{t.confidentialityLabel}</FieldLabel>
            <Select
              name="confidentiality"
              label={t.confidentialityLabel}
              value={confidentiality}
              onChangeValue={setConfidentiality}
              disabled={audience === "external"}
              options={CONFIDENTIALITY_OPTIONS.map((o) => ({
                value: o.value,
                text: t.confidentialityOptions[o.value] ?? o.label,
              }))}
              fullWidth
            />
            {audience === "external" && (
              <Text1 regular color={c.textSecondary}>
                {t.confidentialityExternalHelper}
              </Text1>
            )}
          </Stack>
          <Stack space={8}>
            <FieldLabel>{t.formatLabel}</FieldLabel>
            <Select
              name="format"
              label={t.formatLabel}
              value={format}
              onChangeValue={setFormat}
              options={formatOptions.map((o) => ({
                value: o.value,
                text: t.formatOptions[o.value] ?? o.label,
              }))}
              fullWidth
            />
          </Stack>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}
        >
          <Stack space={8}>
            <FieldLabel>{t.spokespersonLabel}</FieldLabel>
            <TextField
              name="spokesperson"
              label={t.spokespersonField}
              placeholder={t.spokespersonPlaceholder}
              value={spokesperson}
              onChangeValue={setSpokesperson}
              fullWidth
            />
            <Text1 regular color={c.textSecondary}>
              {t.spokespersonHelper}
            </Text1>
          </Stack>
          <Stack space={8}>
            <FieldLabel>{t.eventDateLabel}</FieldLabel>
            <TextField
              name="eventDate"
              label={t.eventDateField}
              placeholder={t.eventDatePlaceholder}
              value={eventDate}
              onChangeValue={setEventDate}
              fullWidth
            />
            <Text1 regular color={c.textSecondary}>
              {t.eventDateHelper}
            </Text1>
          </Stack>
        </div>

        <Stack space={8}>
          <FieldLabel>{t.axesLabel}</FieldLabel>
          <Inline space={8} wrap>
            {axes?.map((a) => (
              <Chip key={a.id} active={axisIds.includes(a.id)} onPress={() => toggleAxis(a.id)}>
                {a.name}
              </Chip>
            ))}
          </Inline>
        </Stack>

        {attachmentsPanel}

        {followUp ? (
          <div
            style={{
              borderRadius: skinVars.borderRadii.container,
              border: `1px solid ${c.brand}`,
              backgroundColor: c.brandLow,
              padding: 20,
            }}
          >
            <Stack space={12}>
              <Inline space={8} alignItems="center">
                <IconMessageRegular size={16} color={c.brand} />
                <Text2 medium color={c.brand}>
                  {t.followUpTitle}
                </Text2>
              </Inline>
              <Text2 medium color={c.textPrimary}>
                {followUp}
              </Text2>
              <TextField
                name="followUpAnswer"
                label={t.followUpLabel}
                placeholder={t.followUpPlaceholder}
                value={followUpAnswer}
                onChangeValue={setFollowUpAnswer}
                fullWidth
              />
              <Inline space={8}>
                <ButtonPrimary onPress={() => submitFollowUp(false)} disabled={isPending} StartIcon={IconRobotRegular}>
                  {t.followUpGenerate}
                </ButtonPrimary>
                <ButtonSecondary onPress={() => submitFollowUp(true)} disabled={isPending}>
                  {t.followUpSkip}
                </ButtonSecondary>
              </Inline>
            </Stack>
          </div>
        ) : (
          <ButtonPrimary onPress={submitBrief} disabled={!topic.trim() || isPending} StartIcon={IconRobotRegular}>
            {t.generateDraft}
          </ButtonPrimary>
        )}
        </Stack>
        )}
      </Stack>
    </div>
  );
}

// ---- Dual-filter exclusions panel ---------------------------------------------
function ExclusionsPanel({ exclusions }: { exclusions: DraftExclusion[] }) {
  const { lang } = useApp();
  const te = GENERATE_I18N[lang].editor;
  return (
    <div
      style={{
        borderRadius: skinVars.borderRadii.container,
        border: `1px solid ${applyAlpha(skinVars.rawColors.warning, 0.25)}`,
        backgroundColor: c.warningLow,
        padding: 16,
      }}
    >
      <Stack space={12}>
        <Inline space={8} alignItems="center">
          <IconLockClosedRegular size={16} color={c.warning} />
          <Text2 medium color={c.textPrimary}>
            {te.exclusionsTitle}
          </Text2>
        </Inline>
        <Text1 regular color={c.textSecondary}>
          {te.exclusionsBlurb}
        </Text1>
        <Stack space={8}>
          {exclusions.map((x, i) => (
            <Boxed key={i}>
              <Box padding={12}>
                <Stack space={4}>
                  <Inline space={8} alignItems="center" wrap>
                    <Tag type={x.reason === "clearance" ? "error" : "warning"}>
                      {x.reason === "clearance" ? te.reasonClearance : te.reasonDestination}
                    </Tag>
                    <Tag type="inactive">{x.confidentiality}</Tag>
                    {x.docTitle && (
                      <Text2 medium color={c.textPrimary}>
                        {x.docTitle}
                      </Text2>
                    )}
                  </Inline>
                  <Text1 regular color={c.textSecondary}>
                    {x.note}
                  </Text1>
                </Stack>
              </Box>
            </Boxed>
          ))}
        </Stack>
      </Stack>
    </div>
  );
}

// ---- Guided-chat brief capture -------------------------------------------------
// Ask-like chat: a fixed-height scrollable transcript, structured answer
// controls driven by the server's question metadata (radio buttons for single
// choice, checkboxes for multi-choice, a text field with Enter-to-send), and a
// final summary card with a "Generate the document" CTA once the brief is
// complete — no lingering free-text input.
function GuidedChat({
  onGenerate,
  isGenerating,
}: {
  onGenerate: (fields: SuggestedBrief) => void;
  isGenerating: boolean;
}) {
  const { lang: globalLang } = useApp();
  const all = GENERATE_I18N[globalLang];
  const t = all.chat;
  const tf = all.form;
  const briefChat = useBriefChat();
  const { data: axes } = useListAxes();
  const [turns, setTurns] = React.useState<BriefChatTurn[]>([]);
  const [input, setInput] = React.useState("");
  const [question, setQuestion] = React.useState<BriefChatQuestion | null>(null);
  const [multiSelection, setMultiSelection] = React.useState<string[]>([]);
  const [completed, setCompleted] = React.useState<SuggestedBrief | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, briefChat.isPending, completed]);

  // Option VALUES from the server are machine codes; labels are resolved
  // client-side so they follow the UI language.
  const labelFor = (field: string, value: string): string => {
    switch (field) {
      case "shape":
        return tf.shapes[value as Shape]?.name ?? value;
      case "audience":
        return value === "internal" ? tf.audienceInternal : tf.audienceExternal;
      case "confidentiality":
        return tf.confidentialityOptions[value] ?? value;
      case "language":
        return tf.languageOptions[value] ?? value;
      case "axisIds":
        return axes?.find((a) => a.id === value)?.name ?? value;
      default:
        return value;
    }
  };

  const send = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || briefChat.isPending || completed) return;
    const current = question;
    const nextTurns: BriefChatTurn[] = [...turns, { role: "user", content: trimmed }];
    setTurns(nextTurns);
    setInput("");
    setMultiSelection([]);
    setQuestion(null);
    briefChat.mutate(
      { data: { turns: nextTurns } },
      {
        onSuccess: (r) => {
          if (r.complete || !r.nextQuestion) {
            setCompleted(r.fields);
          } else {
            setTurns([...nextTurns, { role: "assistant", content: r.nextQuestion.text }]);
            setQuestion(r.nextQuestion);
          }
        },
        // Keep the current question (and its controls) if the round trip fails.
        onError: () => setQuestion(current),
      },
    );
  };

  const sendMultiSelection = () => {
    if (!question || multiSelection.length === 0) return;
    send(multiSelection.map((v) => labelFor(question.field, v)).join(", "));
  };

  const kind = question?.kind ?? "text";
  const summaryRows: { label: string; value: string }[] = completed
    ? [
        completed.shape ? { label: tf.formatLabel, value: labelFor("shape", completed.shape) } : null,
        completed.topic ? { label: tf.briefLabel, value: completed.topic } : null,
        completed.audience
          ? { label: tf.audienceLabel, value: labelFor("audience", completed.audience) }
          : null,
        completed.confidentiality
          ? {
              label: tf.confidentialityLabel,
              value: labelFor("confidentiality", completed.confidentiality),
            }
          : null,
        completed.language
          ? { label: tf.languageLabel, value: labelFor("language", completed.language) }
          : null,
        completed.axisIds.length > 0
          ? {
              label: tf.axesLabel,
              value: completed.axisIds.map((a) => labelFor("axisIds", a)).join(", "),
            }
          : null,
        completed.spokesperson
          ? { label: tf.spokespersonField, value: completed.spokesperson }
          : null,
      ].filter((r): r is { label: string; value: string } => r !== null)
    : [];

  return (
    <div
      style={{
        borderRadius: skinVars.borderRadii.container,
        border: `1px solid ${c.divider}`,
        backgroundColor: c.backgroundContainer,
      }}
    >
      <div style={{ padding: 20 }}>
        <Stack space={16}>
          <Inline space={8} alignItems="center">
            <IconChatRegular size={16} color={c.brand} />
            <Text2 medium color={c.textPrimary}>
              {t.title}
            </Text2>
            <Text1 regular color={c.textSecondary}>
              {t.subtitle}
            </Text1>
          </Inline>

          {/* Fixed-height scrollable transcript — the panel never grows with the conversation. */}
          <div
            ref={scrollRef}
            style={{
              height: 380,
              overflowY: "auto",
              borderRadius: skinVars.borderRadii.container,
              border: `1px solid ${c.divider}`,
              padding: 16,
            }}
          >
            <Stack space={12}>
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    maxWidth: "80%",
                    borderRadius: skinVars.borderRadii.container,
                    backgroundColor: c.brandLow,
                    padding: "12px 16px",
                  }}
                >
                  <Text2 regular color={c.textPrimary}>
                    {t.initialQuestion}
                  </Text2>
                </div>
              </div>

              {turns.map((turn, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: turn.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      borderRadius: skinVars.borderRadii.container,
                      backgroundColor: turn.role === "user" ? c.brand : c.brandLow,
                      padding: "12px 16px",
                    }}
                  >
                    <Text2
                      regular
                      color={turn.role === "user" ? c.textPrimaryInverse : c.textPrimary}
                    >
                      {turn.content}
                    </Text2>
                  </div>
                </div>
              ))}

              {briefChat.isPending && (
                <Inline space={8} alignItems="center">
                  <Spinner size={16} />
                  <Text1 regular color={c.textSecondary}>
                    {t.thinking}
                  </Text1>
                </Inline>
              )}
            </Stack>
          </div>

          {/* Answer area: summary + CTA once complete, otherwise the control for the current question. */}
          {completed ? (
            <div
              style={{
                borderRadius: skinVars.borderRadii.container,
                backgroundColor: c.brandLow,
                padding: 16,
              }}
            >
              <Stack space={12}>
                <Text2 medium color={c.textPrimary}>
                  {t.summaryTitle}
                </Text2>
                <Text1 regular color={c.textSecondary}>
                  {t.summaryHelper}
                </Text1>
                <Stack space={4}>
                  {summaryRows.map((row) => (
                    <Inline space={8} key={row.label} alignItems="center">
                      <Text1 medium color={c.textSecondary}>
                        {row.label}
                      </Text1>
                      <Text1 regular color={c.textPrimary}>
                        {row.value}
                      </Text1>
                    </Inline>
                  ))}
                </Stack>
                <ButtonPrimary
                  onPress={() => onGenerate(completed)}
                  disabled={isGenerating}
                  StartIcon={IconRobotRegular}
                >
                  {t.generateCta}
                </ButtonPrimary>
              </Stack>
            </div>
          ) : briefChat.isPending ? null : kind === "choice" && question ? (
            <Stack space={8}>
              <RadioGroup name="chat-choice" aria-label={t.answerLabel} onChange={(v) => send(labelFor(question.field, v))}>
                <Stack space={8}>
                  {question.optionValues.map((v) => (
                    <RadioButton key={v} value={v}>
                      <Text2 regular color={c.textPrimary}>
                        {labelFor(question.field, v)}
                      </Text2>
                    </RadioButton>
                  ))}
                </Stack>
              </RadioGroup>
              {question.skippable && (
                <ButtonLink small onPress={() => send(t.skipMessage)}>
                  {t.skip}
                </ButtonLink>
              )}
            </Stack>
          ) : kind === "multichoice" && question ? (
            <Stack space={12}>
              <Stack space={8}>
                {question.optionValues.map((v) => (
                  <Checkbox
                    key={v}
                    name={`chat-multi-${v}`}
                    checked={multiSelection.includes(v)}
                    onChange={(checked) =>
                      setMultiSelection((prev) =>
                        checked ? [...prev, v] : prev.filter((x) => x !== v),
                      )
                    }
                  >
                    <Text2 regular color={c.textPrimary}>
                      {labelFor(question.field, v)}
                    </Text2>
                  </Checkbox>
                ))}
              </Stack>
              <Inline space={8} alignItems="center">
                <ButtonPrimary small onPress={sendMultiSelection} disabled={multiSelection.length === 0}>
                  {t.confirmSelection}
                </ButtonPrimary>
                {question.skippable && (
                  <ButtonLink small onPress={() => send(t.skipMessage)}>
                    {t.skip}
                  </ButtonLink>
                )}
              </Inline>
            </Stack>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <Stack space={8}>
                <Inline space={8} alignItems="center" fullWidth>
                  <div style={{ flex: 1 }}>
                    <TextField
                      name="chatInput"
                      label={t.answerLabel}
                      placeholder={t.answerPlaceholder}
                      value={input}
                      onChangeValue={setInput}
                      fullWidth
                    />
                  </div>
                  <IconButton
                    aria-label={t.sendAnswer}
                    onPress={() => send(input)}
                    disabled={!input.trim() || briefChat.isPending}
                    Icon={IconSendRegular}
                  />
                </Inline>
                {question?.skippable && (
                  <ButtonLink small onPress={() => send(t.skipMessage)}>
                    {t.skip}
                  </ButtonLink>
                )}
              </Stack>
            </form>
          )}
        </Stack>
      </div>
    </div>
  );
}

// ---- Watchable drafting pipeline --------------------------------------------
type PipelineStage = "retrieving" | "composing" | "guardian" | "done";

function DraftingPipeline({
  variant,
  stage,
}: {
  variant: "generate" | "refine";
  stage: PipelineStage;
}) {
  const { lang } = useApp();
  const te = GENERATE_I18N[lang].editor;
  const steps =
    variant === "refine"
      ? [
          { key: "retrieving", icon: IconSearchRegular, label: te.pipelineRefineSteps.retrieving },
          { key: "composing", icon: IconPenRegular, label: te.pipelineRefineSteps.composing },
          { key: "guardian", icon: IconShieldCheckedOkRegular, label: te.pipelineRefineSteps.guardian },
        ]
      : [
          { key: "retrieving", icon: IconSearchRegular, label: te.pipelineGenerateSteps.retrieving },
          { key: "composing", icon: IconPenRegular, label: te.pipelineGenerateSteps.composing },
          { key: "guardian", icon: IconShieldCheckedOkRegular, label: te.pipelineGenerateSteps.guardian },
        ];
  const order = ["retrieving", "composing", "guardian", "done"];
  const active = stage === "done" ? steps.length : order.indexOf(stage);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 448 }}>
        <Stack space={24}>
          <Stack space={4}>
            <div style={{ textAlign: "center" }}>
              <Title3>
                {variant === "refine" ? te.pipelineRefineTitle : te.pipelineGenerateTitle}
              </Title3>
            </div>
            <div style={{ textAlign: "center" }}>
              <Text2 regular color={c.textSecondary} textAlign="center">
                {te.pipelineSubtitle}
              </Text2>
            </div>
          </Stack>
          <Stack space={8}>
            {steps.map((s, i) => {
              const done = i < active;
              const current = i === active;
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    borderRadius: skinVars.borderRadii.container,
                    border: `1px solid ${current ? c.brand : c.divider}`,
                    backgroundColor: current ? c.brandLow : c.backgroundContainer,
                    padding: "12px 16px",
                    opacity: !done && !current ? 0.45 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: skinVars.borderRadii.container,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      backgroundColor: done ? c.successLow : current ? c.brand : c.backgroundAlternative,
                    }}
                  >
                    {done ? (
                      <IconCheckRegular size={16} color={c.success} />
                    ) : (
                      <Icon size={16} color={current ? c.textPrimaryInverse : c.textSecondary} />
                    )}
                  </div>
                  <Text2 medium color={current ? c.textPrimary : done ? c.textPrimary : c.textSecondary}>
                    {s.label}
                  </Text2>
                </div>
              );
            })}
          </Stack>
        </Stack>
      </div>
    </div>
  );
}

export default function Generate() {
  const { roleId, lang } = useApp();
  const te = GENERATE_I18N[lang].editor;
  const td = GENERATE_I18N[lang].dialogs;
  const [tab, setTab] = React.useState<Tab>("compose");
  const [draft, setDraft] = React.useState<GeneratedDraft | null>(null);
  const [instruction, setInstruction] = React.useState("");
  const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = React.useState<string | null>(null);
  const [chatCollapsed, setChatCollapsed] = React.useState<boolean>(
    () => window.localStorage.getItem("hub-generate-chat-collapsed") === "1",
  );
  const toggleChatCollapsed = () => {
    setChatCollapsed((v) => {
      window.localStorage.setItem("hub-generate-chat-collapsed", v ? "0" : "1");
      return !v;
    });
  };
  const [chatMessages, setChatMessages] = React.useState<
    { role: "user" | "agent"; text: string; selection?: string | null; tone?: "error" }[]
  >([]);
  const [selectedCitation, setSelectedCitation] = React.useState<Citation | null>(null);
  const [showAssets, setShowAssets] = React.useState(false);

  const { data: shapes } = useListShapes();
  const { data: assets } = useListAssets();
  const { data: roles } = useListRoles();

  const startGenerate = useStartGenerateJob();
  const startRefine = useStartRefineJob();
  const check = useCheckDocument();
  const saveVersion = useSaveVersion();

  const schedulesQ = useListSchedules();
  const createSchedule = useCreateSchedule();
  const runSchedule = useRunSchedule();
  const inboxQ = useListReviewItems();
  const approve = useApproveReviewItem();
  const publish = usePublishReviewItem();
  const versionsQ = useListVersions();
  // Per-item publish outcome (session-only): success confirmation with the new
  // corpus doc id, or the server's refusal message.
  const [publishNotices, setPublishNotices] = React.useState<
    Record<string, { kind: "success" | "error"; message: string }>
  >({});

  // Notifications for scheduled drafts and approvals.
  const [showNotifications, setShowNotifications] = React.useState(false);
  const notificationsQ = useListNotifications({
    query: { queryKey: ["notifications"], refetchInterval: 20000 },
  });
  const markRead = useMarkNotificationsRead();
  const unreadCount = notificationsQ.data?.filter((n) => !n.read).length ?? 0;

  const openNotifications = () => {
    setShowNotifications(true);
    if (unreadCount > 0) {
      markRead.mutate(undefined, { onSuccess: () => notificationsQ.refetch() });
    }
  };

  const [jobId, setJobId] = React.useState<string | null>(null);
  const [jobVariant, setJobVariant] = React.useState<"generate" | "refine">("generate");
  const jobQ = useGetGenerationJob(jobId ?? "", {
    query: {
      enabled: !!jobId,
      queryKey: ["generation-job", jobId],
      refetchInterval: (query) => (query.state.data?.status === "running" ? 500 : false),
    },
  });

  React.useEffect(() => {
    const job = jobQ.data;
    if (!job || !jobId) return;
    if (job.status === "done" && job.draft) {
      const next = job.draft as GeneratedDraft;
      setDraft(next);
      if (jobVariant === "refine") {
        setInstruction("");
        setChatMessages((prev) => [
          ...prev,
          {
            role: "agent",
            text:
              next.guardian.status === "pass"
                ? "Applied. All claims re-cited and the Brand Guardian cleared the revision."
                : "Applied, but the Brand Guardian flagged the revision — check the findings before exporting.",
          },
        ]);
      }
      setJobId(null);
    } else if (job.status === "error") {
      if (jobVariant === "refine") {
        setChatMessages((prev) => [
          ...prev,
          { role: "agent", text: job.error ?? "The Hub could not apply that change.", tone: "error" },
        ]);
      }
      setJobId(null);
    }
  }, [jobQ.data, jobId, jobVariant]);

  const stage = (jobQ.data?.stage ?? "retrieving") as PipelineStage;
  const busy =
    startGenerate.isPending ||
    startRefine.isPending ||
    (!!jobId && jobQ.data?.status !== "done" && jobQ.data?.status !== "error");

  const handleGenerate = (v: BriefValues) => {
    if (!roleId) return;
    setChatMessages([]);
    setPendingSelection(null);
    setJobVariant("generate");
    startGenerate.mutate(
      {
        data: {
          shape: v.shape,
          topic: v.topic,
          roleId,
          audience: v.audience,
          language: v.language,
          axisIds: v.axisIds,
          confidentiality: v.confidentiality,
          format: v.format,
          spokesperson: v.spokesperson,
          eventDate: v.eventDate,
          kpiContext: v.kpiContext,
          askContext: v.askContext,
          attachments: v.attachments,
        },
      },
      { onSuccess: (job) => setJobId(job.id) },
    );
  };

  const handleRefine = () => {
    if (!draft || !instruction.trim() || !roleId) return;
    const selection = pendingSelection?.trim() || null;
    setChatMessages((prev) => [...prev, { role: "user", text: instruction.trim(), selection }]);
    setPendingSelection(null);
    setJobVariant("refine");
    startRefine.mutate(
      { data: { draft, instruction, roleId, selection } },
      { onSuccess: (job) => setJobId(job.id) },
    );
  };

  const recheck = (next: GeneratedDraft) => {
    // Only merge the guardian verdict into the CURRENT draft, and only if the
    // body has not changed since this check was issued — a slow response must
    // never overwrite newer typing with a stale snapshot.
    const issuedSignature = JSON.stringify([next.id, next.umbrella, next.sections.map((s) => s.body)]);
    check.mutate(
      { data: { draft: next } },
      {
        onSuccess: (g) =>
          setDraft((curr) => {
            if (!curr || curr.id !== next.id) return curr;
            const currSignature = JSON.stringify([curr.id, curr.umbrella, curr.sections.map((s) => s.body)]);
            if (currSignature !== issuedSignature) return curr;
            return { ...curr, guardian: g };
          }),
      },
    );
  };

  const updateSection = (id: string, body: string) => {
    if (!draft) return;
    const citationIds = [...new Set([...body.matchAll(/S\s*(\d+)/gi)].map((m) => `S${Number(m[1])}`))];
    setDraft({
      ...draft,
      sections: draft.sections.map((s) => (s.id === id ? { ...s, body, citationIds } : s)),
    });
  };

  const updateUmbrella = (body: string) => {
    if (!draft) return;
    setDraft({ ...draft, umbrella: body });
  };

  // Internal Q&A notes live on the draft, so they ride along with refine
  // payloads, saved versions and version restores. They are not part of the
  // guarded body signature — annotating an answer does not void a review.
  const updateQaNotes = (qaNotes: QaNote[]) => {
    setDraft((curr) => (curr ? { ...curr, qaNotes } : curr));
  };

  // Inline table editing: cell edits merge into the CURRENT draft via a
  // functional set, so they can never clobber a concurrent async update.
  const updateTableCell = (tableId: string, rowIdx: number, colIdx: number, value: string) => {
    setDraft((curr) => {
      if (!curr) return curr;
      return {
        ...curr,
        tables: (curr.tables ?? []).map((tb) =>
          tb.id === tableId
            ? {
                ...tb,
                rows: tb.rows.map((r, i) =>
                  i === rowIdx ? r.map((cell, j) => (j === colIdx ? value : cell)) : r,
                ),
              }
            : tb,
        ),
      };
    });
  };

  // Debounced Brand Guardian recheck: the canvas is always live, so any manual
  // edit re-runs the Guardian shortly after typing pauses.
  const bodySignature = draft
    ? JSON.stringify([draft.id, draft.umbrella, draft.sections.map((s) => s.body)])
    : null;
  const lastCheckedRef = React.useRef<string | null>(null);
  const lastDraftIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!draft || !bodySignature) {
      lastCheckedRef.current = null;
      lastDraftIdRef.current = null;
      return;
    }
    if (lastDraftIdRef.current !== draft.id || lastCheckedRef.current === null) {
      // New draft arrived (generate/refine/open) — its guardian verdict is fresh.
      lastDraftIdRef.current = draft.id;
      lastCheckedRef.current = bodySignature;
      return;
    }
    if (bodySignature === lastCheckedRef.current || busy || check.isPending) return;
    const t = window.setTimeout(() => {
      lastCheckedRef.current = bodySignature;
      recheck(draft);
    }, 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodySignature, busy]);

  const handleSaveVersion = () => {
    if (!draft) return;
    const savedBy = roles?.find((r) => r.id === roleId)?.label ?? "Hub user";
    saveVersion.mutate(
      { data: { draft, savedBy } },
      { onSuccess: () => versionsQ.refetch() },
    );
  };

  // Export with an editorial-review gate for press material.
  const exportDoc = useExportDocument();
  const exportPack = useExportDocumentPack();
  const recordReview = useRecordEditorialReview();
  const [exportFormat, setExportFormat] = React.useState<"docx" | "pptx" | "pdf" | "txt" | "md">("docx");
  const [exportTemplateId, setExportTemplateId] = React.useState<string>("auto");
  const [reviewedDraft, setReviewedDraft] = React.useState<string | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);

  // Corporate export templates: "auto" keeps the draft shape's default; the
  // picker only offers templates that support the chosen format.
  const exportTemplatesQ = useGetExportTemplates();
  const exportTemplates = exportTemplatesQ.data ?? [];
  const formatTemplates = exportTemplates.filter((tpl) => tpl.formats.includes(exportFormat));
  const chosenTemplate = formatTemplates.find((tpl) => tpl.id === exportTemplateId);
  const effectiveTemplateId = chosenTemplate ? chosenTemplate.id : null;

  const draftSignature = draft
    ? JSON.stringify([draft.id, draft.umbrella, draft.sections.map((s) => s.body)])
    : null;
  const editorialReviewed = !!draftSignature && reviewedDraft === draftSignature;
  const needsEditorialReview = draft?.shape === "press" && !editorialReviewed;

  const handleMarkReviewed = () => {
    if (!draft || !draftSignature) return;
    setExportError(null);
    const reviewedBy = roles?.find((r) => r.id === roleId)?.label ?? "Hub user";
    recordReview.mutate(
      { data: { draft, reviewedBy } },
      { onSuccess: () => setReviewedDraft(draftSignature) },
    );
  };

  const handleExport = () => {
    if (!draft) return;
    setExportError(null);
    const savedBy = roles?.find((r) => r.id === roleId)?.label ?? "Hub user";
    exportDoc.mutate(
      {
        data: {
          draft,
          format: exportFormat,
          destination: draft.audience === "external" ? "external" : "internal",
          templateId: effectiveTemplateId,
        },
      },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${draft.title.replace(/[^\w\d-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "document"}.${exportFormat}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          saveVersion.mutate({ data: { draft, savedBy } }, { onSuccess: () => versionsQ.refetch() });
        },
        onError: (err) => {
          const data = (err as { data?: { code?: string; error?: string } | null }).data;
          const reviewRefused =
            data?.code === "editorial_review_required" ||
            (data?.error ?? "").toLowerCase().includes("editorial review");
          if (reviewRefused) {
            setReviewedDraft(null);
            setExportError(te.exportReviewRequiredError);
          } else {
            setExportError(data?.error ?? te.exportRefusedError);
          }
        },
      },
    );
  };

  // Pack export: one action renders every format the template offers and
  // bundles them into a single ZIP. Every per-format governance gate reruns
  // server-side for each entry in the pack.
  const handleExportPack = () => {
    if (!draft) return;
    setExportError(null);
    const savedBy = roles?.find((r) => r.id === roleId)?.label ?? "Hub user";
    exportPack.mutate(
      {
        data: {
          draft,
          destination: draft.audience === "external" ? "external" : "internal",
          templateId: effectiveTemplateId,
        },
      },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${draft.title.replace(/[^\w\d-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "document"}-pack.zip`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          saveVersion.mutate({ data: { draft, savedBy } }, { onSuccess: () => versionsQ.refetch() });
        },
        onError: (err) => {
          const data = (err as { data?: { code?: string; error?: string } | null }).data;
          const reviewRefused =
            data?.code === "editorial_review_required" ||
            (data?.error ?? "").toLowerCase().includes("editorial review");
          if (reviewRefused) {
            setReviewedDraft(null);
            setExportError(te.exportReviewRequiredError);
          } else {
            setExportError(data?.error ?? te.exportRefusedError);
          }
        },
      },
    );
  };

  const handleApproveFromCanvas = () => {
    if (!draft || !draft.reviewItemId) return;
    approve.mutate(
      { id: draft.reviewItemId, data: { draft } },
      {
        onSuccess: (item) => {
          setDraft(item.draft);
          inboxQ.refetch();
        },
      },
    );
  };

  const guardianPass = draft?.guardian.status === "pass" && draft.status === "drafted";
  const scheduledLocked = draft?.origin === "scheduled" && draft?.approved !== true;
  const canExport = guardianPass && !scheduledLocked;

  const tabDefs: { id: Tab; label: string; icon: React.FC<{ size?: number; color?: string }>; count?: number }[] = [
    { id: "compose", label: td.tabCompose, icon: IconRobotRegular },
    { id: "scheduled", label: td.tabScheduled, icon: IconCalendarRegular },
    { id: "inbox", label: td.tabInbox, icon: IconListDocumentRegular, count: inboxQ.data?.filter((i) => i.status === "pending").length },
    { id: "versions", label: td.tabVersions, icon: IconTimeRegular, count: versionsQ.data?.length },
  ];
  const tabIndex = tabDefs.findIndex((t) => t.id === tab);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          borderBottom: `1px solid ${c.divider}`,
          backgroundColor: c.backgroundContainer,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Tabs
            selectedIndex={tabIndex}
            onChange={(idx) => setTab(tabDefs[idx].id)}
            tabs={tabDefs.map((t) => ({
              text: typeof t.count === "number" && t.count > 0 ? `${t.label} (${t.count})` : t.label,
              Icon: t.icon,
            }))}
          />
        </div>
        <div style={{ flexShrink: 0, padding: "0 12px", position: "relative" }}>
          <IconButton
            aria-label={unreadCount > 0 ? td.notificationsUnread(unreadCount) : td.notifications}
            onPress={openNotifications}
            Icon={IconBellRegular}
          />
          {unreadCount > 0 && (
            <div
              style={{
                position: "absolute",
                top: 2,
                right: 10,
                minWidth: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: c.error,
                color: c.textPrimaryInverse,
                fontSize: 11,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 5px",
                pointerEvents: "none",
              }}
            >
              {unreadCount}
            </div>
          )}
        </div>
      </div>

      {tab === "compose" && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          {draft && draft.status === "drafted" && !busy && (
            <SourcesPane citations={draft.citations} onOpenCitation={setSelectedCitation} />
          )}
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            {busy ? (
              <DraftingPipeline variant={jobVariant} stage={stage} />
            ) : !draft ? (
              <BriefForm shapes={shapes} onGenerate={handleGenerate} isPending={busy} />
            ) : draft.status === "no_evidence" ? (
              <div style={{ maxWidth: 672, margin: "40px auto 0" }}>
                <Stack space={16}>
                  <Callout
                    asset={<IconAlertRegular color={c.warning} />}
                    title={td.noEvidenceTitle}
                    description={draft.note ?? ""}
                    button={<ButtonSecondary onPress={() => setDraft(null)}>{td.adjustBrief}</ButtonSecondary>}
                  />
                  {draft.exclusions && draft.exclusions.length > 0 && (
                    <ExclusionsPanel exclusions={draft.exclusions} />
                  )}
                </Stack>
              </div>
            ) : draft.status === "permission_blocked" ? (
              <div style={{ maxWidth: 672, margin: "40px auto 0" }}>
                <Stack space={16}>
                  <Callout
                    asset={<IconAlertRegular color={c.error} />}
                    title={td.permissionRestrictedTitle}
                    description={draft.permissionNote ?? ""}
                    button={<ButtonSecondary onPress={() => setDraft(null)}>{td.adjustBrief}</ButtonSecondary>}
                  />
                  {draft.exclusions && draft.exclusions.length > 0 && (
                    <ExclusionsPanel exclusions={draft.exclusions} />
                  )}
                </Stack>
              </div>
            ) : (
              <DocumentCanvas
                draft={draft}
                onSectionChange={updateSection}
                onUmbrellaChange={updateUmbrella}
                onQaNotesChange={updateQaNotes}
                onTableChange={updateTableCell}
                onOpenCitation={setSelectedCitation}
                onAskSelection={(passage) => setPendingSelection(passage)}
                editingSectionId={editingSectionId}
                onEditBlock={setEditingSectionId}
                destination={draft.audience === "external" ? "external" : "internal"}
                templateId={effectiveTemplateId}
              />
            )}
          </div>

          {draft && draft.status === "drafted" && (
            <div
              style={{
                width: 380,
                borderLeft: `1px solid ${c.divider}`,
                backgroundColor: c.backgroundAlternative,
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
              }}
            >
              {editingSectionId && draft.sections.find((s) => s.id === editingSectionId) && roleId ? (
                <BlockEditPanel
                  draft={draft}
                  section={draft.sections.find((s) => s.id === editingSectionId)!}
                  roleId={roleId}
                  onClose={() => setEditingSectionId(null)}
                  onDraftUpdated={setDraft}
                  onLocalSave={(body) => updateSection(editingSectionId, body)}
                  onOpenCitationId={(id) => {
                    const cit = draft.citations.find((x) => x.id === id);
                    if (cit) setSelectedCitation(cit);
                  }}
                />
              ) : (
              <>
              <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                <Stack space={24}>
                  <GuardianBar guardian={draft.guardian} />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <ButtonSecondary
                      small
                      onPress={handleSaveVersion}
                      disabled={!canExport || saveVersion.isPending}
                      StartIcon={IconDownloadRegular}
                    >
                      {te.saveVersion}
                    </ButtonSecondary>
                    <ButtonSecondary small onPress={() => setShowAssets(true)} StartIcon={IconBookmarkRegular}>
                      {te.assets}
                    </ButtonSecondary>
                  </div>
                  <Inline space={4} alignItems="center">
                    <IconEditPencilRegular size={12} color={c.textSecondary} />
                    <Text1 regular color={c.textSecondary}>
                      {te.liveEditHint}
                    </Text1>
                  </Inline>

                  <Stack space={8}>
                    <FieldLabel>{te.exportHeading}</FieldLabel>
                    <Inline space={8} alignItems="center" fullWidth>
                      <div style={{ flex: 1 }}>
                        <Select
                          name="exportFormat"
                          label={te.formatLabel}
                          value={exportFormat}
                          onChangeValue={(v) => setExportFormat(v as "docx" | "pptx" | "pdf" | "txt" | "md")}
                          options={[
                            { value: "docx", text: "Word (.docx)" },
                            { value: "pptx", text: "PowerPoint (.pptx)" },
                            { value: "pdf", text: "PDF (.pdf)" },
                            { value: "txt", text: "Text (.txt)" },
                            { value: "md", text: "Markdown (.md)" },
                          ]}
                          fullWidth
                        />
                      </div>
                      <ButtonPrimary
                        small
                        onPress={handleExport}
                        disabled={!canExport || needsEditorialReview || exportDoc.isPending || exportPack.isPending}
                        StartIcon={IconPrinterRegular}
                      >
                        {exportDoc.isPending ? te.exporting : te.exportButton}
                      </ButtonPrimary>
                    </Inline>
                    {formatTemplates.length > 0 && (
                      <Select
                        name="exportTemplate"
                        label={te.templateLabel}
                        value={chosenTemplate ? chosenTemplate.id : "auto"}
                        onChangeValue={(v) => setExportTemplateId(v)}
                        options={[
                          { value: "auto", text: te.templateAuto },
                          ...formatTemplates.map((tpl) => ({ value: tpl.id, text: tpl.name })),
                        ]}
                        fullWidth
                      />
                    )}
                    <ButtonSecondary
                      small
                      onPress={handleExportPack}
                      disabled={!canExport || needsEditorialReview || exportDoc.isPending || exportPack.isPending}
                      StartIcon={IconDownloadRegular}
                    >
                      {exportPack.isPending ? te.exportingPack : te.exportPack}
                    </ButtonSecondary>
                    {draft.shape === "press" && (
                      <div
                        style={{
                          borderRadius: skinVars.borderRadii.container,
                          border: `1px solid ${editorialReviewed ? applyAlpha(skinVars.rawColors.success, 0.3) : c.divider}`,
                          backgroundColor: editorialReviewed ? c.successLow : c.backgroundContainer,
                          padding: 12,
                        }}
                      >
                        <Stack space={8}>
                          <Inline space={8} alignItems="center">
                            <IconUserAccountRegular
                              size={16}
                              color={editorialReviewed ? c.success : c.textSecondary}
                            />
                            <Text2 medium color={c.textPrimary}>
                              {te.editorialReview}
                            </Text2>
                            <Tag type={editorialReviewed ? "success" : "warning"}>
                              {editorialReviewed ? te.reviewCompleted : te.reviewRequired}
                            </Tag>
                          </Inline>
                          <Text1 regular color={c.textSecondary}>
                            {editorialReviewed
                              ? te.reviewedHint
                              : te.reviewNeededHint}
                          </Text1>
                          {!editorialReviewed && (
                            <ButtonSecondary
                              small
                              onPress={handleMarkReviewed}
                              disabled={recordReview.isPending}
                              StartIcon={IconCheckedRegular}
                            >
                              {recordReview.isPending ? te.recording : te.markReviewComplete}
                            </ButtonSecondary>
                          )}
                        </Stack>
                      </div>
                    )}
                    {exportError && (
                      <Inline space={4} alignItems="center">
                        <IconAlertRegular size={12} color={c.error} />
                        <Text1 regular color={c.error}>
                          {exportError}
                        </Text1>
                      </Inline>
                    )}
                  </Stack>

                  {draft.exclusions && draft.exclusions.length > 0 && (
                    <ExclusionsPanel exclusions={draft.exclusions} />
                  )}
                  {scheduledLocked && (
                    <ButtonPrimary
                      onPress={handleApproveFromCanvas}
                      disabled={!guardianPass || approve.isPending}
                      StartIcon={IconCheckRegular}
                    >
                      {approve.isPending ? te.approving : te.approveDraft}
                    </ButtonPrimary>
                  )}
                  {!canExport && (
                    <Stack space={4}>
                      <Inline space={4} alignItems="center">
                        <IconLockClosedRegular size={12} color={c.error} />
                        <Text1 regular color={c.error}>
                          {scheduledLocked
                            ? te.lockedScheduled
                            : te.lockedGuardian}
                        </Text1>
                      </Inline>
                      {!scheduledLocked && draft.guardian.status === "block" && (
                        <Text1 regular color={c.textSecondary}>
                          {draft.guardian.findings.find((f) => f.severity === "error")
                            ?.message ?? draft.guardian.summary}
                        </Text1>
                      )}
                    </Stack>
                  )}

                  {draft.spokesperson.length > 0 && (
                    <Stack space={12}>
                      <Inline space={8} alignItems="center">
                        <IconMessageRegular size={16} color={c.textPrimary} />
                        <Text2 medium color={c.textSecondary}>
                          {te.spokespersonNotes}
                        </Text2>
                        <Tag type="warning">{te.internal}</Tag>
                      </Inline>
                      {draft.spokesperson.map((n, i) => (
                        <Boxed key={i}>
                          <Box padding={12}>
                            <Stack space={4}>
                              <Text2 medium color={c.textPrimary}>
                                {n.question}
                              </Text2>
                              <Text2 regular color={c.textSecondary}>
                                {n.guidance}
                              </Text2>
                              {n.doNotSay && (
                                <Inline space={4} alignItems="center">
                                  <IconAlertRegular size={12} color={c.error} />
                                  <Text1 medium color={c.error}>
                                    {te.doNotSay(n.doNotSay)}
                                  </Text1>
                                </Inline>
                              )}
                            </Stack>
                          </Box>
                        </Boxed>
                      ))}
                    </Stack>
                  )}

                  {draft.charts.length > 0 && (
                    <Inline space={8} alignItems="center">
                      <IconBarChartRegular size={14} color={c.textSecondary} />
                      <Text1 regular color={c.textSecondary}>
                        {te.chartsBuilt(draft.charts.length)}
                      </Text1>
                    </Inline>
                  )}
                </Stack>
              </div>

              <div
                style={{
                  borderTop: `1px solid ${c.divider}`,
                  backgroundColor: c.backgroundContainer,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  maxHeight: 340,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Inline space={8} alignItems="center">
                    <IconRobotRegular size={16} color={c.brand} />
                    <Text2 medium color={c.textSecondary}>
                      {te.editWithAgent}
                    </Text2>
                  </Inline>
                  <ButtonLink small onPress={toggleChatCollapsed}>
                    {chatCollapsed ? te.expand : te.collapse}
                  </ButtonLink>
                </div>
                {!chatCollapsed && chatMessages.length > 0 && (
                  <div style={{ overflowY: "auto", margin: "8px 0", flex: 1 }}>
                    <Stack space={8}>
                      {chatMessages.map((m, i) => (
                        <div
                          key={i}
                          style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
                        >
                          <div
                            style={{
                              maxWidth: "88%",
                              borderRadius: skinVars.borderRadii.container,
                              backgroundColor:
                                m.role === "user" ? c.brand : m.tone === "error" ? c.errorLow : c.brandLow,
                              padding: "8px 12px",
                            }}
                          >
                            <Stack space={4}>
                              {m.selection && (
                                <Text1
                                  regular
                                  color={m.role === "user" ? c.textPrimaryInverse : c.textSecondary}
                                >
                                  {te.rePrefix(m.selection.length > 90 ? `${m.selection.slice(0, 90)}...` : m.selection)}
                                </Text1>
                              )}
                              <Text2
                                regular
                                color={
                                  m.role === "user"
                                    ? c.textPrimaryInverse
                                    : m.tone === "error"
                                      ? c.error
                                      : c.textPrimary
                                }
                              >
                                {m.text}
                              </Text2>
                            </Stack>
                          </div>
                        </div>
                      ))}
                      {busy && jobVariant === "refine" && (
                        <Inline space={8} alignItems="center">
                          <Spinner size={16} />
                          <Text1 regular color={c.textSecondary}>
                            {te.recomposing}
                          </Text1>
                        </Inline>
                      )}
                    </Stack>
                  </div>
                )}
                {!chatCollapsed && (
                <Stack space={8}>
                  {pendingSelection && (
                    <div
                      style={{
                        borderRadius: skinVars.borderRadii.container,
                        border: `1px solid ${c.divider}`,
                        backgroundColor: c.backgroundAlternative,
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text1 regular color={c.textSecondary}>
                          {te.selectedPassage(pendingSelection.length > 80 ? `${pendingSelection.slice(0, 80)}...` : pendingSelection)}
                        </Text1>
                      </div>
                      <ButtonLink small onPress={() => setPendingSelection(null)}>
                        {te.clear}
                      </ButtonLink>
                    </div>
                  )}
                  <TextField
                    name="instruction"
                    label={pendingSelection ? te.refineLabelSelection : te.refineLabelDefault}
                    placeholder={te.refinePlaceholder}
                    value={instruction}
                    onChangeValue={setInstruction}
                    fullWidth
                  />
                  <Inline space={8} alignItems="center">
                    <IconButton
                      aria-label={te.sendInstruction}
                      onPress={handleRefine}
                      disabled={!instruction.trim() || busy}
                      Icon={IconSendRegular}
                      small
                    />
                    <ButtonLink
                      onPress={() => {
                        setDraft(null);
                        setChatMessages([]);
                        setPendingSelection(null);
                      }}
                      StartIcon={IconRefreshRegular}
                    >
                      {te.startNewBrief}
                    </ButtonLink>
                  </Inline>
                </Stack>
                )}
              </div>
              </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "scheduled" && (
        <ScheduledTab
          shapes={shapes}
          roles={roles}
          schedules={schedulesQ.data}
          onCreate={(data, cb) => createSchedule.mutate({ data }, { onSuccess: () => { schedulesQ.refetch(); cb(); } })}
          onRun={(id) =>
            runSchedule.mutate(
              { id },
              {
                onSuccess: () => {
                  schedulesQ.refetch();
                  inboxQ.refetch();
                  setTab("inbox");
                },
              },
            )
          }
          creating={createSchedule.isPending}
          running={runSchedule.isPending}
        />
      )}

      {tab === "inbox" && (
        <InboxTab
          items={inboxQ.data}
          onApprove={(item) =>
            approve.mutate(
              { id: item.id, data: { draft: item.draft } },
              { onSuccess: () => inboxQ.refetch() },
            )
          }
          onPublish={(item) =>
            publish.mutate(
              { id: item.id },
              {
                onSuccess: (r) => {
                  setPublishNotices((prev) => ({
                    ...prev,
                    [item.id]: {
                      kind: "success",
                      message: td.publishSuccess({
                        docId: r.docId,
                        version: r.version,
                        chunks: r.upsertedChunks,
                        superseded: r.supersededDocId,
                      }),
                    },
                  }));
                },
                onError: (err) => {
                  const data = (err as { data?: { error?: string } | null }).data;
                  setPublishNotices((prev) => ({
                    ...prev,
                    [item.id]: {
                      kind: "error",
                      message: data?.error ?? td.publishError,
                    },
                  }));
                },
              },
            )
          }
          onOpen={(d) => {
            setDraft(d);
            setTab("compose");
          }}
          approving={approve.isPending}
          publishing={publish.isPending}
          publishNotices={publishNotices}
        />
      )}

      {tab === "versions" && <VersionsTab versions={versionsQ.data} onOpen={(d) => { setDraft(d); setTab("compose"); }} />}

      {showNotifications && (
        <Drawer
          width={480}
          onClose={() => setShowNotifications(false)}
          onDismiss={() => setShowNotifications(false)}
          title={td.notificationsTitle}
          description={td.notificationsDesc}
        >
          <Stack space={12}>
            {(!notificationsQ.data || notificationsQ.data.length === 0) && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Text2 regular color={c.textSecondary}>
                  {td.notificationsEmpty}
                </Text2>
              </div>
            )}
            {notificationsQ.data?.map((n: NotificationRecord) => (
              <Boxed key={n.id}>
                <Box padding={16}>
                  <Stack space={4}>
                    <Inline space={8} alignItems="center" wrap>
                      {n.kind === "review_approved" ? (
                        <IconCheckRegular size={16} color={c.success} />
                      ) : (
                        <IconListDocumentRegular size={16} color={c.brand} />
                      )}
                      <Tag type={n.kind === "review_approved" ? "success" : "promo"}>
                        {n.kind === "review_approved" ? td.notifApproved : td.notifReady}
                      </Tag>
                      <Tag type="inactive">{n.reviewFolder}</Tag>
                    </Inline>
                    <Text2 regular color={c.textPrimary}>
                      {n.message}
                    </Text2>
                    <Inline space={8} alignItems="center">
                      <Text1 regular color={c.textSecondary}>
                        {n.ownerLabel} • {new Date(n.createdAt).toLocaleString(localeFor(lang))}
                      </Text1>
                      {n.kind !== "review_approved" && (
                        <ButtonLink
                          small
                          onPress={() => {
                            setShowNotifications(false);
                            setTab("inbox");
                          }}
                        >
                          {td.openInbox}
                        </ButtonLink>
                      )}
                    </Inline>
                  </Stack>
                </Box>
              </Boxed>
            ))}
          </Stack>
        </Drawer>
      )}

      {selectedCitation && (
        <Drawer
          width={640}
          onClose={() => setSelectedCitation(null)}
          onDismiss={() => setSelectedCitation(null)}
          title={selectedCitation.docTitle}
          subtitle={td.citationSubtitle(selectedCitation.id)}
          description={selectedCitation.sourceLoc}
        >
          <Stack space={16}>
            <Inline space={8} alignItems="center">
              <Tag type={selectedCitation.validity === "approved" ? "success" : "inactive"}>
                {selectedCitation.validity}
              </Tag>
              <Tag type={selectedCitation.confidentiality === "public" ? "info" : "error"}>
                {selectedCitation.confidentiality}
              </Tag>
            </Inline>
            <div
              style={{
                backgroundColor: c.backgroundAlternative,
                borderRadius: skinVars.borderRadii.container,
                border: `1px solid ${c.divider}`,
                padding: 24,
              }}
            >
              <Stack space={12}>
                <Text2 medium color={c.textSecondary}>
                  {td.extractedSnippet}
                </Text2>
                <Text3 regular color={c.textPrimary}>
                  "{selectedCitation.snippet}"
                </Text3>
              </Stack>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <Stack space={2}>
                <Text2 medium color={c.textSecondary}>
                  {td.version}
                </Text2>
                <Text2 regular color={c.textPrimary}>
                  {selectedCitation.version}
                </Text2>
              </Stack>
              <Stack space={2}>
                <Text2 medium color={c.textSecondary}>
                  {td.owner}
                </Text2>
                <Text2 regular color={c.textPrimary}>
                  {selectedCitation.owner}
                </Text2>
              </Stack>
              <Stack space={2}>
                <Text2 medium color={c.textSecondary}>
                  {td.confidence}
                </Text2>
                <Inline space={4} alignItems="center">
                  <Text2 regular color={c.textPrimary}>
                    {Math.round(selectedCitation.confidence * 100)}%
                  </Text2>
                  {selectedCitation.confidence > 0.8 && <IconCheckedRegular size={16} color={c.success} />}
                </Inline>
              </Stack>
            </div>
          </Stack>
        </Drawer>
      )}

      {showAssets && (
        <Drawer
          width={720}
          onClose={() => setShowAssets(false)}
          onDismiss={() => setShowAssets(false)}
          title={td.assetsTitle}
          description={td.assetsDesc}
        >
          <Stack space={24}>
            {assets?.claims && assets.claims.length > 0 && (
              <AssetGroup title={td.approvedClaims}>
                {assets.claims.map((cl) => (
                  <Boxed key={cl.id}>
                    <Box padding={12}>
                      <Stack space={8}>
                        <Text2 regular color={c.textPrimary}>
                          {cl.text}
                        </Text2>
                        <Inline space={8} alignItems="center">
                          <Tag type="inactive">{cl.confidentiality}</Tag>
                          <Tag type="inactive">{cl.validity}</Tag>
                        </Inline>
                      </Stack>
                    </Box>
                  </Boxed>
                ))}
              </AssetGroup>
            )}
            {assets?.quotes && assets.quotes.length > 0 && (
              <AssetGroup title={td.approvedQuotes}>
                {assets.quotes.map((q) => (
                  <Boxed key={q.id}>
                    <Box padding={12}>
                      <Stack space={4}>
                        <Text2 regular color={c.textPrimary}>
                          "{q.text}"
                        </Text2>
                        <Text1 regular color={c.textSecondary}>
                          — {q.attribution}
                        </Text1>
                      </Stack>
                    </Box>
                  </Boxed>
                ))}
              </AssetGroup>
            )}
            {assets?.disclaimers && assets.disclaimers.length > 0 && (
              <AssetGroup title={td.disclaimers}>
                {assets.disclaimers.map((d) => (
                  <Boxed key={d.id}>
                    <Box padding={12}>
                      <Stack space={4}>
                        <Text2 medium color={c.textPrimary}>
                          {d.name}
                        </Text2>
                        <Text2 regular color={c.textSecondary}>
                          {d.text}
                        </Text2>
                      </Stack>
                    </Box>
                  </Boxed>
                ))}
              </AssetGroup>
            )}
            {assets?.glossary && assets.glossary.length > 0 && (
              <AssetGroup title={td.glossary}>
                {assets.glossary.map((g) => (
                  <Boxed key={g.id}>
                    <Box padding={12}>
                      <Text2 regular color={c.textPrimary}>
                        <Text2 as="span" medium color={c.textPrimary}>
                          {g.term}:
                        </Text2>{" "}
                        {g.definition}
                      </Text2>
                    </Box>
                  </Boxed>
                ))}
              </AssetGroup>
            )}
          </Stack>
        </Drawer>
      )}
    </div>
  );
}

function AssetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack space={8}>
      <Text2 medium color={c.textSecondary}>
        {title}
      </Text2>
      <Stack space={8}>{children}</Stack>
    </Stack>
  );
}

// ---- Scheduled tab -----------------------------------------------------------
function ScheduledTab({
  roles,
  schedules,
  onCreate,
  onRun,
  creating,
  running,
}: {
  shapes: DocumentShape[] | undefined;
  roles: { id: string; label: string; clearance: string }[] | undefined;
  schedules: Schedule[] | undefined;
  onCreate: (
    data: {
      name: string;
      shape: string;
      topic: string;
      queries: string[];
      audience: string;
      frequency: string;
      timeOfDay: string;
      ownerRoleId: string;
      language: string;
      confidentiality: string;
      reviewFolder: string;
      axisIds: string[];
    },
    cb: () => void,
  ) => void;
  onRun: (id: string) => void;
  creating: boolean;
  running: boolean;
}) {
  const { roleId, lang } = useApp();
  const td = GENERATE_I18N[lang].dialogs;
  const te = GENERATE_I18N[lang].editor;
  const tf = GENERATE_I18N[lang].form;
  const { data: axes } = useListAxes();
  const { data: deliveries } = useListDeliveries();
  const [name, setName] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [shape, setShape] = React.useState<Shape>("messaging");
  const [frequency, setFrequency] = React.useState("weekly");
  const [timeOfDay, setTimeOfDay] = React.useState("09:00");
  const [audience, setAudience] = React.useState<Audience>("internal");
  const [ownerRoleId, setOwnerRoleId] = React.useState("");
  const [reviewFolder, setReviewFolder] = React.useState("");
  const [queriesText, setQueriesText] = React.useState("");
  const [axisIds, setAxisIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (roleId && !ownerRoleId) setOwnerRoleId(roleId);
  }, [roleId, ownerRoleId]);

  const toggleAxis = (id: string) =>
    setAxisIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const submit = () => {
    const owner = ownerRoleId || roleId;
    if (!name.trim() || !topic.trim() || !owner) return;
    onCreate(
      {
        name,
        shape,
        topic,
        queries: queriesText
          .split("\n")
          .map((q) => q.trim())
          .filter(Boolean),
        audience,
        frequency,
        timeOfDay,
        ownerRoleId: owner,
        language: "en",
        confidentiality: audience === "external" ? "public" : "private",
        reviewFolder: reviewFolder.trim() || "General",
        axisIds,
      },
      () => {
        setName("");
        setTopic("");
        setReviewFolder("");
        setQueriesText("");
        setAxisIds([]);
      },
    );
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      <div style={{ maxWidth: 896, margin: "0 auto" }}>
        <Stack space={32}>
          <Stack space={4}>
            <Title2>{td.scheduledTitle}</Title2>
            <Text2 regular color={c.textSecondary}>
              {td.scheduledBlurb}
            </Text2>
          </Stack>

          <Boxed>
            <Box padding={24}>
              <Stack space={16}>
                <Title3>{td.newSchedule}</Title3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                  <TextField name="scheduleName" label={td.scheduleNameLabel} placeholder={td.scheduleNamePlaceholder} value={name} onChangeValue={setName} fullWidth />
                  <Select
                    name="scheduleShape"
                    label={td.shapeLabel}
                    value={shape}
                    onChangeValue={(v) => setShape(v as Shape)}
                    options={(Object.keys(SHAPE_META) as Shape[]).map((s) => ({ value: s, text: tf.shapes[s].name }))}
                    fullWidth
                  />
                </div>
                <TextField name="scheduleTopic" label={td.standingBriefLabel} placeholder={td.standingBriefPlaceholder} value={topic} onChangeValue={setTopic} fullWidth />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                  <Select
                    name="frequency"
                    label={td.frequencyLabel}
                    value={frequency}
                    onChangeValue={setFrequency}
                    options={(["daily", "weekly", "monthly"] as const).map((f) => ({ value: f, text: te.frequency[f] ?? f }))}
                    fullWidth
                  />
                  <Select
                    name="scheduleTimeOfDay"
                    label={td.timeOfDayLabel}
                    value={timeOfDay}
                    onChangeValue={setTimeOfDay}
                    helperText={td.timeOfDayHelper}
                    options={Array.from({ length: 48 }, (_, i) => {
                      const v = `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
                      return { value: v, text: v };
                    })}
                    fullWidth
                  />
                  <Select
                    name="scheduleAudience"
                    label={td.audienceLabel}
                    value={audience}
                    onChangeValue={(v) => setAudience(v as Audience)}
                    options={[
                      { value: "internal", text: td.audienceInternal },
                      { value: "external", text: td.audienceExternal },
                    ]}
                    fullWidth
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                  <Stack space={4}>
                    <FieldLabel>{td.ownerClearanceLabel}</FieldLabel>
                    <Select
                      name="ownerRole"
                      label={td.ownerLabel}
                      value={ownerRoleId}
                      onChangeValue={setOwnerRoleId}
                      options={(roles ?? []).map((r) => ({ value: r.id, text: `${r.label} • ${r.clearance}` }))}
                      fullWidth
                    />
                  </Stack>
                  <Stack space={4}>
                    <FieldLabel>{td.reviewFolderLabel}</FieldLabel>
                    <TextField name="reviewFolder" label={td.reviewFolderLabel} placeholder={td.reviewFolderPlaceholder} value={reviewFolder} onChangeValue={setReviewFolder} fullWidth />
                  </Stack>
                </div>
                <Stack space={4}>
                  <FieldLabel>{td.queriesLabel}</FieldLabel>
                  <TextField
                    name="queries"
                    label={td.queriesLabel}
                    placeholder={td.queriesPlaceholder}
                    value={queriesText}
                    onChangeValue={setQueriesText}
                    multiline
                    fullWidth
                  />
                  <Text1 regular color={c.textSecondary}>
                    {td.queriesHelper}
                  </Text1>
                </Stack>
                <Stack space={4}>
                  <FieldLabel>{td.axesLabel}</FieldLabel>
                  <Inline space={8} wrap>
                    {axes?.map((a) => (
                      <Chip key={a.id} active={axisIds.includes(a.id)} onPress={() => toggleAxis(a.id)}>
                        {a.name}
                      </Chip>
                    ))}
                  </Inline>
                </Stack>
                <ButtonPrimary onPress={submit} disabled={!name.trim() || !topic.trim() || creating} StartIcon={IconCalendarRegular}>
                  {td.createSchedule}
                </ButtonPrimary>
              </Stack>
            </Box>
          </Boxed>

          <Stack space={12}>
            {(!schedules || schedules.length === 0) && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Text2 regular color={c.textSecondary}>
                  {td.noSchedules}
                </Text2>
              </div>
            )}
            {schedules?.map((s) => (
              <Boxed key={s.id}>
                <Box padding={20}>
                  <Inline space={16} alignItems="center">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Stack space={4}>
                        <Inline space={8} alignItems="center" wrap>
                          <Text2 medium color={c.textPrimary}>
                            {s.name}
                          </Text2>
                          <Tag type="inactive">{te.frequency[s.frequency] ?? s.frequency}</Tag>
                          {s.timeOfDay ? <Tag type="inactive">{s.timeOfDay}</Tag> : null}
                          <Tag type="inactive">{te.audience[s.audience] ?? s.audience}</Tag>
                        </Inline>
                        <Text2 regular color={c.textSecondary}>
                          {s.topic}
                        </Text2>
                        {s.queries.length > 0 && (
                          <Text1 regular color={c.textSecondary}>
                            {td.sourcesPrefix(s.queries.join(" · "))}
                          </Text1>
                        )}
                        <Text1 regular color={c.textSecondary}>
                          {td.ownerPrefix(s.ownerLabel)}
                          {s.lastRunAt ? td.lastRun(new Date(s.lastRunAt).toLocaleString(localeFor(lang))) : td.neverRun}
                          {s.nextRunAt ? td.nextRun(new Date(s.nextRunAt).toLocaleString(localeFor(lang))) : ""}
                        </Text1>
                      </Stack>
                    </div>
                    <ButtonSecondary small onPress={() => onRun(s.id)} disabled={running} StartIcon={IconRefreshRegular}>
                      {td.runNow}
                    </ButtonSecondary>
                  </Inline>
                </Box>
              </Boxed>
            ))}
          </Stack>

          <Stack space={12}>
            <Stack space={4}>
              <Title3>{td.deliveryLog}</Title3>
              <Text2 regular color={c.textSecondary}>
                {td.deliveryLogBlurb}
              </Text2>
            </Stack>
            {(!deliveries || deliveries.length === 0) && (
              <Text1 regular color={c.textSecondary}>
                {td.noDeliveries}
              </Text1>
            )}
            {deliveries?.map((d) => (
              <Boxed key={d.id}>
                <Box padding={16}>
                  <Stack space={4}>
                    <Inline space={8} alignItems="center" wrap>
                      <Tag type={d.channel === "teams" ? "promo" : "info"}>
                        {te.channel[d.channel] ?? d.channel}
                      </Tag>
                      <Text2 medium color={c.textPrimary}>
                        {d.subject}
                      </Text2>
                    </Inline>
                    <Text1 regular color={c.textSecondary}>
                      {td.deliveryMeta(d.recipientLabel, d.scheduleName, new Date(d.createdAt).toLocaleString(localeFor(lang)))}
                    </Text1>
                    <Text2 regular color={c.textSecondary}>
                      {d.message}
                    </Text2>
                  </Stack>
                </Box>
              </Boxed>
            ))}
          </Stack>
        </Stack>
      </div>
    </div>
  );
}

// ---- Inbox tab ---------------------------------------------------------------
function InboxTab({
  items,
  onApprove,
  onPublish,
  onOpen,
  approving,
  publishing,
  publishNotices,
}: {
  items: ReviewItem[] | undefined;
  onApprove: (item: ReviewItem) => void;
  onPublish: (item: ReviewItem) => void;
  onOpen: (d: GeneratedDraft) => void;
  approving: boolean;
  publishing: boolean;
  publishNotices: Record<string, { kind: "success" | "error"; message: string }>;
}) {
  const { lang } = useApp();
  const td = GENERATE_I18N[lang].dialogs;
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      <div style={{ maxWidth: 896, margin: "0 auto" }}>
        <Stack space={24}>
          <Stack space={4}>
            <Title2>{td.inboxTitle}</Title2>
            <Text2 regular color={c.textSecondary}>
              {td.inboxBlurb}
            </Text2>
          </Stack>

          {(!items || items.length === 0) && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Text2 regular color={c.textSecondary}>
                {td.inboxEmpty}
              </Text2>
            </div>
          )}

          <Stack space={12}>
            {items?.map((item) => {
              const pass = item.draft.guardian.status === "pass" && item.draft.status === "drafted";
              const notice = publishNotices[item.id];
              const published = notice?.kind === "success";
              return (
                <Boxed key={item.id}>
                  <Box padding={20}>
                    <Stack space={12}>
                      <Inline space={16} alignItems="center">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Stack space={8}>
                            <Inline space={8} alignItems="center" wrap>
                              <Text2 medium color={c.textPrimary}>
                                {item.draft.title}
                              </Text2>
                              {item.status === "approved" ? (
                                <Tag type="success">{td.approved}</Tag>
                              ) : (
                                <Tag type="warning">{td.pending}</Tag>
                              )}
                              {published && <Tag type="promo">{td.published}</Tag>}
                            </Inline>
                            <Text2 regular color={c.textSecondary}>
                              {item.scheduleName} • {item.reviewFolder} • {item.ownerLabel}
                            </Text2>
                            <Inline space={4} alignItems="center">
                              {pass ? (
                                <IconShieldCheckedOkRegular size={14} color={c.success} />
                              ) : (
                                <IconAlertRegular size={14} color={c.error} />
                              )}
                              <Text1 regular color={pass ? c.success : c.error}>
                                {pass ? td.guardianCleared : td.guardianBlocked}
                              </Text1>
                            </Inline>
                          </Stack>
                        </div>
                        <Inline space={8} alignItems="center">
                          <ButtonSecondary small onPress={() => onOpen(item.draft)}>
                            {td.open}
                          </ButtonSecondary>
                          {item.status !== "approved" && (
                            <ButtonPrimary
                              small
                              onPress={() => onApprove(item)}
                              disabled={!pass || approving}
                              StartIcon={IconCheckRegular}
                            >
                              {td.approve}
                            </ButtonPrimary>
                          )}
                          {item.status === "approved" && !published && (
                            <ButtonPrimary
                              small
                              onPress={() => onPublish(item)}
                              disabled={publishing}
                            >
                              {publishing ? td.publishing : td.publishToCorpus}
                            </ButtonPrimary>
                          )}
                        </Inline>
                      </Inline>
                      {notice && (
                        <Text1
                          regular
                          color={notice.kind === "success" ? c.success : c.error}
                        >
                          {notice.message}
                        </Text1>
                      )}
                    </Stack>
                  </Box>
                </Boxed>
              );
            })}
          </Stack>
        </Stack>
      </div>
    </div>
  );
}

// ---- Versions tab ------------------------------------------------------------
function VersionsTab({ versions, onOpen }: { versions: SavedVersion[] | undefined; onOpen: (d: GeneratedDraft) => void }) {
  const { lang } = useApp();
  const td = GENERATE_I18N[lang].dialogs;
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      <div style={{ maxWidth: 896, margin: "0 auto" }}>
        <Stack space={24}>
          <Stack space={4}>
            <Title2>{td.versionsTitle}</Title2>
            <Text2 regular color={c.textSecondary}>
              {td.versionsBlurb}
            </Text2>
          </Stack>

          {(!versions || versions.length === 0) && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Text2 regular color={c.textSecondary}>
                {td.noVersions}
              </Text2>
            </div>
          )}

          <Stack space={12}>
            {versions?.map((v) => (
              <Boxed key={v.id}>
                <Box padding={20}>
                  <Inline space={16} alignItems="center">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Stack space={4}>
                        <Inline space={8} alignItems="center" wrap>
                          <Text2 medium color={c.textPrimary}>
                            {v.title}
                          </Text2>
                          <Tag type="inactive">{`v${v.version}`}</Tag>
                          <Tag type="inactive">{v.confidentiality}</Tag>
                        </Inline>
                        <Text1 regular color={c.textSecondary}>
                          {td.versionMeta(v.savedBy, new Date(v.savedAt).toLocaleString(localeFor(lang)), v.governance.owner)}
                        </Text1>
                      </Stack>
                    </div>
                    <ButtonSecondary small onPress={() => onOpen(v.draft)}>
                      {td.open}
                    </ButtonSecondary>
                  </Inline>
                </Box>
              </Boxed>
            ))}
          </Stack>
        </Stack>
      </div>
    </div>
  );
}
