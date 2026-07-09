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
  useListVersions,
  useSaveVersion,
  useSuggestTemplate,
  useBriefChat,
  useListNotifications,
  useMarkNotificationsRead,
  useRecordEditorialReview,
  useExportDocument,
  type GeneratedDraft,
  type DraftExclusion,
  type TemplateSuggestion,
  type BriefChatTurn,
  type SuggestedBrief,
  type NotificationRecord,
  type DraftSection,
  type ChartSpec,
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
import { RichTextEditor } from "@/components/document-editor";
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
                Brand Guardian
              </Text2>
              <Tag type={pass ? "success" : "error"}>
                {pass ? "Cleared for export" : "Export blocked"}
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
                      <Tag type={f.severity === "error" ? "error" : "warning"}>{f.severity}</Tag>
                      <Text2 medium color={c.textPrimary}>
                        {f.rule}
                      </Text2>
                    </Inline>
                    <Text2 regular color={c.textSecondary}>
                      {f.message}
                    </Text2>
                    {f.suggestion && (
                      <Text2 medium color={c.brand}>
                        Fix: {f.suggestion}
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

// ---- Inline-editable section (always-live rich editor) ------------------------
function SectionBlock({
  section,
  onChange,
  onOpenCitationId,
  onAskSelection,
}: {
  section: DraftSection;
  onChange: (body: string) => void;
  onOpenCitationId: (id: string) => void;
  onAskSelection: (passage: string) => void;
}) {
  return (
    <Stack space={8}>
      <Inline space={8} alignItems="center">
        <Title3>{section.heading}</Title3>
        {section.internalOnly && (
          <Tag type="warning" Icon={IconLockClosedRegular}>
            Internal only
          </Tag>
        )}
      </Inline>
      <RichTextEditor
        value={section.body}
        onChange={onChange}
        onOpenCitation={onOpenCitationId}
        onAskSelection={onAskSelection}
        ariaLabel={`Section body: ${section.heading}`}
      />
    </Stack>
  );
}

// ---- The document canvas -----------------------------------------------------
function DocumentCanvas({
  draft,
  onSectionChange,
  onUmbrellaChange,
  onOpenCitation,
  onAskSelection,
}: {
  draft: GeneratedDraft;
  onSectionChange: (id: string, body: string) => void;
  onUmbrellaChange: (body: string) => void;
  onOpenCitation: (c: Citation) => void;
  onAskSelection: (passage: string) => void;
}) {
  const externalStripped = draft.audience === "external";
  const visibleSections = externalStripped
    ? draft.sections.filter((s) => !s.internalOnly)
    : draft.sections;

  const openCitationById = (id: string) => {
    const cit = draft.citations.find((x) => x.id === id);
    if (cit) onOpenCitation(cit);
  };

  return (
    <div style={{ maxWidth: 768 }}>
      <Boxed>
        <Box padding={32}>
          <Stack space={32}>
            <Stack space={12}>
              <Inline space={8} alignItems="center" wrap>
                <Tag type="promo">{SHAPE_META[draft.shape as Shape]?.name ?? draft.shape}</Tag>
                <Tag type={draft.audience === "external" ? "success" : "info"}>{draft.audience}</Tag>
                <Tag type="inactive">{draft.confidentiality}</Tag>
                <Tag type="inactive">{draft.language}</Tag>
              </Inline>
              <Title2>{draft.title}</Title2>
              <Divider />
            </Stack>

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
                    {draft.historicNote || "This draft draws on historic material."}
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
                        Started from an Ask answer with flagged evidence
                      </Text2>
                      {draft.askSignals.conflict && <Tag type="error">Sources conflict</Tag>}
                      {draft.askSignals.lowConfidence && <Tag type="warning">Low confidence</Tag>}
                      {draft.askSignals.historic && <Tag type="warning">Historic source</Tag>}
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
                    Umbrella message
                  </Text1>
                  <div style={{ color: c.textPrimaryInverse }}>
                    <RichTextEditor
                      value={draft.umbrella}
                      onChange={onUmbrellaChange}
                      onOpenCitation={openCitationById}
                      onAskSelection={onAskSelection}
                      inverse
                      ariaLabel="Umbrella message"
                    />
                  </div>
                </Stack>
              </div>
            )}

            <Stack space={32}>
              {visibleSections.map((s) => (
                <SectionBlock
                  key={s.id}
                  section={s}
                  onChange={(body) => onSectionChange(s.id, body)}
                  onOpenCitationId={openCitationById}
                  onAskSelection={onAskSelection}
                />
              ))}
            </Stack>

            {draft.charts.length > 0 && (
              <Stack space={16}>
                {draft.charts.map((ch) => (
                  <DraftChart key={ch.id} chart={ch} />
                ))}
              </Stack>
            )}

            {draft.citations.length > 0 && (
              <Stack space={16}>
                <Divider />
                <Inline space={8} alignItems="center">
                  <IconDocumentOtherRegular size={16} color={c.textSecondary} />
                  <Text2 medium color={c.textSecondary}>
                    Evidence and citations
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
    </div>
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
  const { data: axes } = useListAxes();
  const [mode, setMode] = React.useState<"form" | "chat">("form");
  const [shape, setShape] = React.useState<Shape>("messaging");
  const [topic, setTopic] = React.useState("");
  const [audience, setAudience] = React.useState<Audience>("internal");
  const [language, setLanguage] = React.useState("en");
  const [axisIds, setAxisIds] = React.useState<string[]>([]);
  const [confidentiality, setConfidentiality] = React.useState("private");
  const [spokesperson, setSpokesperson] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const formatOptions = FORMAT_OPTIONS[shape];
  const [format, setFormat] = React.useState(formatOptions[0].value);
  const [kpiContext, setKpiContext] = React.useState<KpiReportContext | null>(null);
  const [askDraft, setAskDraft] = React.useState<AskDraftHandoff | null>(null);

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
    if (b.language && LANGUAGE_OPTIONS.some((l) => l.value === b.language)) setLanguage(b.language);
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

  const FOLLOW_UP: Record<Shape, string> = {
    messaging: "What is the single key message you want this to land?",
    press: "What exactly are we announcing — the news hook in one line?",
    multiformat: "What is the core message, and which channel matters most?",
  };

  const toggleAxis = (id: string) =>
    setAxisIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const briefIsThin = topic.trim().split(/\s+/).filter(Boolean).length < 6;

  const buildValues = (finalTopic: string): BriefValues => ({
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
  });

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

  const handleChatComplete = (fields: SuggestedBrief) => {
    applySuggested(fields);
    setMode("form");
  };

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
            <Title2>Generate a governed document</Title2>
          </div>
          <div style={{ textAlign: "center" }}>
            <Text3 regular color={c.textSecondary} textAlign="center">
              One engine, three shapes. Every claim is cited from the governed corpus, and the Brand
              Guardian must clear it before export.
            </Text3>
          </div>
        </Stack>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <Inline space={8}>
            <Chip active={mode === "form"} onPress={() => setMode("form")} Icon={IconListDocumentRegular}>
              Structured brief
            </Chip>
            <Chip active={mode === "chat"} onPress={() => setMode("chat")} Icon={IconChatRegular}>
              Guided chat
            </Chip>
          </Inline>
        </div>

        {mode === "chat" ? (
          <GuidedChat onComplete={handleChatComplete} />
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
                Describe what you need and the engine suggests a set-up
              </Text2>
            </Inline>
            <TextField
              name="nlDescription"
              label="What do you need?"
              placeholder="e.g. An external announcement of the Q1 results for the press, quoting the CEO"
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
                {suggestTemplate.isPending ? "Thinking..." : "Suggest a set-up"}
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
                        Use this set-up
                      </ButtonPrimary>
                      <ButtonSecondary small onPress={() => setSuggestion(null)}>
                        Dismiss
                      </ButtonSecondary>
                    </Inline>
                  </Stack>
                </Box>
              </Boxed>
            )}
          </Stack>
        </div>

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
                      {SHAPE_META[s].name}
                    </Text2>
                    <Text1 regular color={c.textSecondary}>
                      {SHAPE_META[s].blurb}
                    </Text1>
                  </Stack>
                </div>
              </Touchable>
            );
          })}
        </div>

        <Stack space={8}>
          <FieldLabel>Brief</FieldLabel>
          <TextField
            name="brief"
            label="Brief"
            placeholder="e.g. Q1 2026 results readout for the internal leadership call, covering Transform & Grow"
            value={topic}
            onChangeValue={setTopic}
            multiline
            fullWidth
          />
          {kpiContext && (
            <Inline space={8} alignItems="center">
              <Chip onClose={() => setKpiContext(null)}>
                {`KPI panel attached: ${kpiContext.area}, ${kpiContext.period}${kpiContext.market ? `, ${kpiContext.market}` : ""}`}
              </Chip>
              <Text1 regular color={c.textSecondary}>
                Governed KPI figures for this selection will be recomputed and injected into the report.
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
                      <Text2 medium>Ask answer attached</Text2>
                    </Inline>
                    <Chip onClose={() => setAskDraft(null)}>Detach</Chip>
                  </Inline>
                  {(askDraft.status === "conflict" ||
                    askDraft.historic ||
                    askDraft.lowConfidence) && (
                    <Inline space={8}>
                      {askDraft.status === "conflict" && <Tag type="error">Sources conflict</Tag>}
                      {askDraft.historic && <Tag type="warning">Historic source</Tag>}
                      {askDraft.lowConfidence && <Tag type="warning">Low confidence</Tag>}
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
                        Cited sources
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
                    The engine will re-check every cited source against your current persona and the
                    destination before drafting; anything you can no longer access is excluded and
                    reported.
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
            <FieldLabel>Audience</FieldLabel>
            <Select
              name="audience"
              label="Audience"
              value={audience}
              onChangeValue={(v) => changeAudience(v as Audience)}
              options={[
                { value: "internal", text: "Internal" },
                { value: "external", text: "External" },
              ]}
              fullWidth
            />
            {audience === "external" && (
              <Inline space={4} alignItems="center">
                <IconLockClosedRegular size={12} color={c.brand} />
                <Text1 regular color={c.brand}>
                  External caps sources to public material before retrieval.
                </Text1>
              </Inline>
            )}
          </Stack>
          <Stack space={8}>
            <FieldLabel>Language</FieldLabel>
            <Select
              name="language"
              label="Language"
              value={language}
              onChangeValue={setLanguage}
              options={LANGUAGE_OPTIONS}
              fullWidth
            />
          </Stack>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}
        >
          <Stack space={8}>
            <FieldLabel>Destination confidentiality</FieldLabel>
            <Select
              name="confidentiality"
              label="Destination confidentiality"
              value={confidentiality}
              onChangeValue={setConfidentiality}
              disabled={audience === "external"}
              options={CONFIDENTIALITY_OPTIONS.map((o) => ({ value: o.value, text: o.label }))}
              fullWidth
            />
            {audience === "external" && (
              <Text1 regular color={c.textSecondary}>
                External work is held to public and cannot be raised here.
              </Text1>
            )}
          </Stack>
          <Stack space={8}>
            <FieldLabel>Format</FieldLabel>
            <Select
              name="format"
              label="Format"
              value={format}
              onChangeValue={setFormat}
              options={formatOptions.map((o) => ({ value: o.value, text: o.label }))}
              fullWidth
            />
          </Stack>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}
        >
          <Stack space={8}>
            <FieldLabel>Spokesperson (optional)</FieldLabel>
            <TextField
              name="spokesperson"
              label="Spokesperson"
              placeholder="e.g. María García, Chief Communications Officer"
              value={spokesperson}
              onChangeValue={setSpokesperson}
              fullWidth
            />
            <Text1 regular color={c.textSecondary}>
              Quotes and spokesperson notes are attributed to this person.
            </Text1>
          </Stack>
          <Stack space={8}>
            <FieldLabel>Event date (optional)</FieldLabel>
            <TextField
              name="eventDate"
              label="Event date"
              placeholder="e.g. 12 May 2026"
              value={eventDate}
              onChangeValue={setEventDate}
              fullWidth
            />
            <Text1 regular color={c.textSecondary}>
              The date the announcement or event takes place.
            </Text1>
          </Stack>
        </div>

        <Stack space={8}>
          <FieldLabel>Strategic axes (optional)</FieldLabel>
          <Inline space={8} wrap>
            {axes?.map((a) => (
              <Chip key={a.id} active={axisIds.includes(a.id)} onPress={() => toggleAxis(a.id)}>
                {a.name}
              </Chip>
            ))}
          </Inline>
        </Stack>

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
                  One quick thing
                </Text2>
              </Inline>
              <Text2 medium color={c.textPrimary}>
                {followUp}
              </Text2>
              <TextField
                name="followUpAnswer"
                label="Missing detail"
                placeholder="Add the missing detail so the draft is framed correctly (optional)"
                value={followUpAnswer}
                onChangeValue={setFollowUpAnswer}
                fullWidth
              />
              <Inline space={8}>
                <ButtonPrimary onPress={() => submitFollowUp(false)} disabled={isPending} StartIcon={IconRobotRegular}>
                  Generate with this
                </ButtonPrimary>
                <ButtonSecondary onPress={() => submitFollowUp(true)} disabled={isPending}>
                  Skip
                </ButtonSecondary>
              </Inline>
            </Stack>
          </div>
        ) : (
          <ButtonPrimary onPress={submitBrief} disabled={!topic.trim() || isPending} StartIcon={IconRobotRegular}>
            Generate draft
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
            Sources excluded by governance
          </Text2>
        </Inline>
        <Text1 regular color={c.textSecondary}>
          Two filters run before anything reaches the engine: your clearance, then the destination
          confidentiality of this document.
        </Text1>
        <Stack space={8}>
          {exclusions.map((x, i) => (
            <Boxed key={i}>
              <Box padding={12}>
                <Stack space={4}>
                  <Inline space={8} alignItems="center" wrap>
                    <Tag type={x.reason === "clearance" ? "error" : "warning"}>
                      {x.reason === "clearance" ? "Your clearance" : "Destination"}
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
function GuidedChat({ onComplete }: { onComplete: (fields: SuggestedBrief) => void }) {
  const briefChat = useBriefChat();
  const [turns, setTurns] = React.useState<BriefChatTurn[]>([]);
  const [input, setInput] = React.useState("");
  const [pendingQuestion, setPendingQuestion] = React.useState<string>(
    "What do you need to produce? Describe the document in your own words — the shape, the topic, who it is for, the language, any spokesperson and the event date.",
  );

  const send = () => {
    const content = input.trim();
    if (!content || briefChat.isPending) return;
    const nextTurns: BriefChatTurn[] = [...turns, { role: "user", content }];
    setTurns(nextTurns);
    setInput("");
    briefChat.mutate(
      { data: { turns: nextTurns } },
      {
        onSuccess: (r) => {
          if (r.complete) {
            onComplete(r.fields);
          } else if (r.nextQuestion) {
            setTurns([...nextTurns, { role: "assistant", content: r.nextQuestion }]);
            setPendingQuestion(r.nextQuestion);
          }
        },
      },
    );
  };

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
              Guided brief
            </Text2>
            <Text1 regular color={c.textSecondary}>
              A few questions, then the form is filled in for you.
            </Text1>
          </Inline>

          {turns.length === 0 && (
            <div
              style={{
                borderRadius: skinVars.borderRadii.container,
                backgroundColor: c.brandLow,
                padding: 16,
              }}
            >
              <Text2 regular color={c.textPrimary}>
                {pendingQuestion}
              </Text2>
            </div>
          )}

          {turns.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: t.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  borderRadius: skinVars.borderRadii.container,
                  backgroundColor: t.role === "user" ? c.brand : c.brandLow,
                  padding: "12px 16px",
                }}
              >
                <Text2 regular color={t.role === "user" ? c.textPrimaryInverse : c.textPrimary}>
                  {t.content}
                </Text2>
              </div>
            </div>
          ))}

          {briefChat.isPending && (
            <Inline space={8} alignItems="center">
              <Spinner size={16} />
              <Text1 regular color={c.textSecondary}>
                Working out what is still missing...
              </Text1>
            </Inline>
          )}

          <Inline space={8} alignItems="center" fullWidth>
            <div style={{ flex: 1 }}>
              <TextField
                name="chatInput"
                label="Your answer"
                placeholder="Type your answer"
                value={input}
                onChangeValue={setInput}
                fullWidth
              />
            </div>
            <IconButton
              aria-label="Send answer"
              onPress={send}
              disabled={!input.trim() || briefChat.isPending}
              Icon={IconSendRegular}
            />
          </Inline>
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
  const steps =
    variant === "refine"
      ? [
          { key: "retrieving", icon: IconSearchRegular, label: "Re-checking governed evidence" },
          { key: "composing", icon: IconPenRegular, label: "Applying your refinement with citations" },
          { key: "guardian", icon: IconShieldCheckedOkRegular, label: "Brand Guardian re-checking claims and tone" },
        ]
      : [
          { key: "retrieving", icon: IconSearchRegular, label: "Retrieving governed evidence" },
          { key: "composing", icon: IconPenRegular, label: "Composing the document with citations" },
          { key: "guardian", icon: IconShieldCheckedOkRegular, label: "Brand Guardian checking claims and tone" },
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
                {variant === "refine" ? "Refining under governance" : "Composing from governed evidence"}
              </Title3>
            </div>
            <div style={{ textAlign: "center" }}>
              <Text2 regular color={c.textSecondary} textAlign="center">
                Permission-filtered sources only. Every claim is cited before it reaches you.
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
  const { roleId } = useApp();
  const [tab, setTab] = React.useState<Tab>("compose");
  const [draft, setDraft] = React.useState<GeneratedDraft | null>(null);
  const [instruction, setInstruction] = React.useState("");
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
  const versionsQ = useListVersions();

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
  const recordReview = useRecordEditorialReview();
  const [exportFormat, setExportFormat] = React.useState<"docx" | "pptx" | "pdf">("docx");
  const [reviewedDraft, setReviewedDraft] = React.useState<string | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);

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
            setExportError(
              "Press material needs a completed editorial review before it can be exported. Mark the review below, then export again.",
            );
          } else {
            setExportError(data?.error ?? "The export was refused. Check the Guardian verdict and try again.");
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
    { id: "compose", label: "Compose", icon: IconRobotRegular },
    { id: "scheduled", label: "Scheduled", icon: IconCalendarRegular },
    { id: "inbox", label: "Review inbox", icon: IconListDocumentRegular, count: inboxQ.data?.filter((i) => i.status === "pending").length },
    { id: "versions", label: "Versions", icon: IconTimeRegular, count: versionsQ.data?.length },
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
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
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
                    title="No governed evidence"
                    description={draft.note ?? ""}
                    button={<ButtonSecondary onPress={() => setDraft(null)}>Adjust the brief</ButtonSecondary>}
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
                    title="Permission restricted"
                    description={draft.permissionNote ?? ""}
                    button={<ButtonSecondary onPress={() => setDraft(null)}>Adjust the brief</ButtonSecondary>}
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
                onOpenCitation={setSelectedCitation}
                onAskSelection={(passage) => setPendingSelection(passage)}
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
                      Save version
                    </ButtonSecondary>
                    <ButtonSecondary small onPress={() => setShowAssets(true)} StartIcon={IconBookmarkRegular}>
                      Assets
                    </ButtonSecondary>
                  </div>
                  <Inline space={4} alignItems="center">
                    <IconEditPencilRegular size={12} color={c.textSecondary} />
                    <Text1 regular color={c.textSecondary}>
                      The document is live — click anywhere in it to edit. The Guardian rechecks as you type.
                    </Text1>
                  </Inline>

                  <Stack space={8}>
                    <FieldLabel>Export</FieldLabel>
                    <Inline space={8} alignItems="center" fullWidth>
                      <div style={{ flex: 1 }}>
                        <Select
                          name="exportFormat"
                          label="Format"
                          value={exportFormat}
                          onChangeValue={(v) => setExportFormat(v as "docx" | "pptx" | "pdf")}
                          options={[
                            { value: "docx", text: "Word (.docx)" },
                            { value: "pptx", text: "PowerPoint (.pptx)" },
                            { value: "pdf", text: "PDF (.pdf)" },
                          ]}
                          fullWidth
                        />
                      </div>
                      <ButtonPrimary
                        small
                        onPress={handleExport}
                        disabled={!canExport || needsEditorialReview || exportDoc.isPending}
                        StartIcon={IconPrinterRegular}
                      >
                        {exportDoc.isPending ? "Exporting..." : "Export"}
                      </ButtonPrimary>
                    </Inline>
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
                              Editorial review
                            </Text2>
                            <Tag type={editorialReviewed ? "success" : "warning"}>
                              {editorialReviewed ? "Completed" : "Required"}
                            </Tag>
                          </Inline>
                          <Text1 regular color={c.textSecondary}>
                            {editorialReviewed
                              ? "This exact version has been reviewed. Any further edit voids the review."
                              : "Press material must be read and signed off by a person before it can be exported."}
                          </Text1>
                          {!editorialReviewed && (
                            <ButtonSecondary
                              small
                              onPress={handleMarkReviewed}
                              disabled={recordReview.isPending}
                              StartIcon={IconCheckedRegular}
                            >
                              {recordReview.isPending ? "Recording..." : "Mark review complete"}
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
                      {approve.isPending ? "Approving..." : "Approve draft"}
                    </ButtonPrimary>
                  )}
                  {!canExport && (
                    <Inline space={4} alignItems="center">
                      <IconLockClosedRegular size={12} color={c.error} />
                      <Text1 regular color={c.error}>
                        {scheduledLocked
                          ? "Scheduled draft: adjust it here, then Approve draft (or approve it in the Review inbox) before export or versioning."
                          : "Export and versioning are locked until the Guardian passes."}
                      </Text1>
                    </Inline>
                  )}

                  {draft.spokesperson.length > 0 && (
                    <Stack space={12}>
                      <Inline space={8} alignItems="center">
                        <IconMessageRegular size={16} color={c.textPrimary} />
                        <Text2 medium color={c.textSecondary}>
                          Spokesperson notes
                        </Text2>
                        <Tag type="warning">Internal</Tag>
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
                                    Do not say: {n.doNotSay}
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
                        {draft.charts.length} chart{draft.charts.length > 1 ? "s" : ""} built from governed series.
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
                      Edit with the agent
                    </Text2>
                  </Inline>
                  <ButtonLink small onPress={toggleChatCollapsed}>
                    {chatCollapsed ? "Expand" : "Collapse"}
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
                                  Re: "{m.selection.length > 90 ? `${m.selection.slice(0, 90)}...` : m.selection}"
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
                            Re-composing under governance...
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
                          Selected passage: "
                          {pendingSelection.length > 80 ? `${pendingSelection.slice(0, 80)}...` : pendingSelection}"
                        </Text1>
                      </div>
                      <ButtonLink small onPress={() => setPendingSelection(null)}>
                        Clear
                      </ButtonLink>
                    </div>
                  )}
                  <TextField
                    name="instruction"
                    label={pendingSelection ? "What should change in this passage?" : "Ask for a change"}
                    placeholder="e.g. Tighten the B2B section and add the dividend figure"
                    value={instruction}
                    onChangeValue={setInstruction}
                    fullWidth
                  />
                  <Inline space={8} alignItems="center">
                    <IconButton
                      aria-label="Send edit instruction"
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
                      Start a new brief
                    </ButtonLink>
                  </Inline>
                </Stack>
                )}
              </div>
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
          onOpen={(d) => {
            setDraft(d);
            setTab("compose");
          }}
          approving={approve.isPending}
        />
      )}

      {tab === "versions" && <VersionsTab versions={versionsQ.data} onOpen={(d) => { setDraft(d); setTab("compose"); }} />}

      {showNotifications && (
        <Drawer
          width={480}
          onClose={() => setShowNotifications(false)}
          onDismiss={() => setShowNotifications(false)}
          title="Notifications"
          description="Scheduled drafts arriving for review and approvals as they happen."
        >
          <Stack space={12}>
            {(!notificationsQ.data || notificationsQ.data.length === 0) && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Text2 regular color={c.textSecondary}>
                  Nothing yet. Run a schedule and its drafts will announce themselves here.
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
                        {n.kind === "review_approved" ? "Approved" : "Ready for review"}
                      </Tag>
                      <Tag type="inactive">{n.reviewFolder}</Tag>
                    </Inline>
                    <Text2 regular color={c.textPrimary}>
                      {n.message}
                    </Text2>
                    <Inline space={8} alignItems="center">
                      <Text1 regular color={c.textSecondary}>
                        {n.ownerLabel} • {new Date(n.createdAt).toLocaleString()}
                      </Text1>
                      {n.kind !== "review_approved" && (
                        <ButtonLink
                          small
                          onPress={() => {
                            setShowNotifications(false);
                            setTab("inbox");
                          }}
                        >
                          Open inbox
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
          subtitle={`Citation [${selectedCitation.id}]`}
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
                  Extracted snippet
                </Text2>
                <Text3 regular color={c.textPrimary}>
                  "{selectedCitation.snippet}"
                </Text3>
              </Stack>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <Stack space={2}>
                <Text2 medium color={c.textSecondary}>
                  Version
                </Text2>
                <Text2 regular color={c.textPrimary}>
                  {selectedCitation.version}
                </Text2>
              </Stack>
              <Stack space={2}>
                <Text2 medium color={c.textSecondary}>
                  Owner
                </Text2>
                <Text2 regular color={c.textPrimary}>
                  {selectedCitation.owner}
                </Text2>
              </Stack>
              <Stack space={2}>
                <Text2 medium color={c.textSecondary}>
                  Confidence
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
          title="Governed assets"
          description="Approved claims, quotes, boilerplate and disclaimers available to the engine."
        >
          <Stack space={24}>
            {assets?.claims && assets.claims.length > 0 && (
              <AssetGroup title="Approved claims">
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
              <AssetGroup title="Approved quotes">
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
              <AssetGroup title="Disclaimers">
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
              <AssetGroup title="Glossary">
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
  const { roleId } = useApp();
  const { data: axes } = useListAxes();
  const [name, setName] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [shape, setShape] = React.useState<Shape>("messaging");
  const [frequency, setFrequency] = React.useState("weekly");
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
            <Title2>Scheduled documents</Title2>
            <Text2 regular color={c.textSecondary}>
              Recurring briefs run under the owner's clearance and land in the review inbox for a human
              approval gate before anyone can export them.
            </Text2>
          </Stack>

          <Boxed>
            <Box padding={24}>
              <Stack space={16}>
                <Title3>New schedule</Title3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                  <TextField name="scheduleName" label="Schedule name" placeholder="e.g. Weekly brand pulse" value={name} onChangeValue={setName} fullWidth />
                  <Select
                    name="scheduleShape"
                    label="Shape"
                    value={shape}
                    onChangeValue={(v) => setShape(v as Shape)}
                    options={(Object.keys(SHAPE_META) as Shape[]).map((s) => ({ value: s, text: SHAPE_META[s].name }))}
                    fullWidth
                  />
                </div>
                <TextField name="scheduleTopic" label="Standing brief" placeholder="e.g. Weekly readout of Transform & Grow progress" value={topic} onChangeValue={setTopic} fullWidth />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                  <Select
                    name="frequency"
                    label="Frequency"
                    value={frequency}
                    onChangeValue={setFrequency}
                    options={["daily", "weekly", "monthly"].map((f) => ({ value: f, text: f.charAt(0).toUpperCase() + f.slice(1) }))}
                    fullWidth
                  />
                  <Select
                    name="scheduleAudience"
                    label="Audience"
                    value={audience}
                    onChangeValue={(v) => setAudience(v as Audience)}
                    options={[
                      { value: "internal", text: "Internal" },
                      { value: "external", text: "External" },
                    ]}
                    fullWidth
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                  <Stack space={4}>
                    <FieldLabel>Owner (runs under this clearance)</FieldLabel>
                    <Select
                      name="ownerRole"
                      label="Owner"
                      value={ownerRoleId}
                      onChangeValue={setOwnerRoleId}
                      options={(roles ?? []).map((r) => ({ value: r.id, text: `${r.label} • ${r.clearance}` }))}
                      fullWidth
                    />
                  </Stack>
                  <Stack space={4}>
                    <FieldLabel>Review folder</FieldLabel>
                    <TextField name="reviewFolder" label="Review folder" placeholder="e.g. Brand pulse" value={reviewFolder} onChangeValue={setReviewFolder} fullWidth />
                  </Stack>
                </div>
                <Stack space={4}>
                  <FieldLabel>Governed source queries (optional, one per line)</FieldLabel>
                  <TextField
                    name="queries"
                    label="Governed source queries"
                    placeholder={"e.g. Transform & Grow KPI targets\nCustomer NPS trend"}
                    value={queriesText}
                    onChangeValue={setQueriesText}
                    multiline
                    fullWidth
                  />
                  <Text1 regular color={c.textSecondary}>
                    Each recurring run retrieves against these governed queries in addition to the standing brief.
                  </Text1>
                </Stack>
                <Stack space={4}>
                  <FieldLabel>Strategic axes (optional)</FieldLabel>
                  <Inline space={8} wrap>
                    {axes?.map((a) => (
                      <Chip key={a.id} active={axisIds.includes(a.id)} onPress={() => toggleAxis(a.id)}>
                        {a.name}
                      </Chip>
                    ))}
                  </Inline>
                </Stack>
                <ButtonPrimary onPress={submit} disabled={!name.trim() || !topic.trim() || creating} StartIcon={IconCalendarRegular}>
                  Create schedule
                </ButtonPrimary>
              </Stack>
            </Box>
          </Boxed>

          <Stack space={12}>
            {(!schedules || schedules.length === 0) && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Text2 regular color={c.textSecondary}>
                  No schedules yet.
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
                          <Tag type="inactive">{s.frequency}</Tag>
                          <Tag type="inactive">{s.audience}</Tag>
                        </Inline>
                        <Text2 regular color={c.textSecondary}>
                          {s.topic}
                        </Text2>
                        {s.queries.length > 0 && (
                          <Text1 regular color={c.textSecondary}>
                            Sources: {s.queries.join(" · ")}
                          </Text1>
                        )}
                        <Text1 regular color={c.textSecondary}>
                          Owner: {s.ownerLabel}
                          {s.lastRunAt ? ` • Last run ${new Date(s.lastRunAt).toLocaleString()}` : " • Never run"}
                        </Text1>
                      </Stack>
                    </div>
                    <ButtonSecondary small onPress={() => onRun(s.id)} disabled={running} StartIcon={IconRefreshRegular}>
                      Run now
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

// ---- Inbox tab ---------------------------------------------------------------
function InboxTab({
  items,
  onApprove,
  onOpen,
  approving,
}: {
  items: ReviewItem[] | undefined;
  onApprove: (item: ReviewItem) => void;
  onOpen: (d: GeneratedDraft) => void;
  approving: boolean;
}) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      <div style={{ maxWidth: 896, margin: "0 auto" }}>
        <Stack space={24}>
          <Stack space={4}>
            <Title2>Review inbox</Title2>
            <Text2 regular color={c.textSecondary}>
              Scheduled drafts wait here for a human approval gate. Approval requires a passing Brand
              Guardian verdict.
            </Text2>
          </Stack>

          {(!items || items.length === 0) && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Text2 regular color={c.textSecondary}>
                The inbox is empty. Run a schedule to populate it.
              </Text2>
            </div>
          )}

          <Stack space={12}>
            {items?.map((item) => {
              const pass = item.draft.guardian.status === "pass" && item.draft.status === "drafted";
              return (
                <Boxed key={item.id}>
                  <Box padding={20}>
                    <Inline space={16} alignItems="center">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Stack space={8}>
                          <Inline space={8} alignItems="center" wrap>
                            <Text2 medium color={c.textPrimary}>
                              {item.draft.title}
                            </Text2>
                            {item.status === "approved" ? (
                              <Tag type="success">Approved</Tag>
                            ) : (
                              <Tag type="warning">Pending</Tag>
                            )}
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
                              {pass ? "Guardian cleared" : "Guardian blocked"}
                            </Text1>
                          </Inline>
                        </Stack>
                      </div>
                      <Inline space={8} alignItems="center">
                        <ButtonSecondary small onPress={() => onOpen(item.draft)}>
                          Open
                        </ButtonSecondary>
                        {item.status !== "approved" && (
                          <ButtonPrimary
                            small
                            onPress={() => onApprove(item)}
                            disabled={!pass || approving}
                            StartIcon={IconCheckRegular}
                          >
                            Approve
                          </ButtonPrimary>
                        )}
                      </Inline>
                    </Inline>
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
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
      <div style={{ maxWidth: 896, margin: "0 auto" }}>
        <Stack space={24}>
          <Stack space={4}>
            <Title2>Saved versions</Title2>
            <Text2 regular color={c.textSecondary}>
              In-memory version history of Guardian-cleared documents. Resets when the server restarts.
            </Text2>
          </Stack>

          {(!versions || versions.length === 0) && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Text2 regular color={c.textSecondary}>
                No versions saved yet.
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
                          Saved by {v.savedBy} • {new Date(v.savedAt).toLocaleString()} • Owner {v.governance.owner}
                        </Text1>
                      </Stack>
                    </div>
                    <ButtonSecondary small onPress={() => onOpen(v.draft)}>
                      Open
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
