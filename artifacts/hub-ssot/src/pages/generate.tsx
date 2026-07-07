import React, { useMemo, useState, useEffect } from "react";
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
  type GeneratedDraft,
  type DraftSection,
  type ChartSpec,
  type Citation,
  type GuardianResult,
  type DocumentShape,
  type Schedule,
  type ReviewItem,
  type SavedVersion,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Sparkles,
  FileText,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Clock,
  Send,
  Printer,
  Save,
  Wand2,
  CalendarClock,
  Inbox,
  History,
  Check,
  Lock,
  MessageSquareQuote,
  BarChart3,
  BookMarked,
  Pencil,
  RefreshCw,
  CheckCircle2,
  Search,
  ListChecks,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  { value: "internal", label: "Internal" },
  { value: "confidential", label: "Confidential" },
  { value: "restricted", label: "Restricted" },
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

function statusTone(status: string): string {
  if (status === "drafted") return "text-tf-success";
  if (status === "permission_blocked") return "text-tf-error";
  return "text-tf-warning";
}

// ---- Brand Guardian bar ------------------------------------------------------
function GuardianBar({ guardian }: { guardian: GuardianResult }) {
  const pass = guardian.status === "pass";
  return (
    <div
      className={cn(
        "rounded-xl border p-4 print-hide",
        pass ? "bg-tf-success-bg border-tf-success/20" : "bg-tf-error-bg border-tf-error/20",
      )}
    >
      <div className="flex items-start space-x-3">
        {pass ? (
          <ShieldCheck className="w-5 h-5 text-tf-success mt-0.5 flex-shrink-0" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-tf-error mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-foreground">Brand Guardian</span>
            <Badge
              className={cn(
                "uppercase tracking-eyebrow text-[10px]",
                pass ? "bg-tf-success text-white" : "bg-tf-error text-white",
              )}
            >
              {pass ? "Cleared for export" : "Export blocked"}
            </Badge>
          </div>
          <p className="text-sm text-foreground/80 mt-1">{guardian.summary}</p>
          {guardian.findings.length > 0 && (
            <ul className="mt-3 space-y-2">
              {guardian.findings.map((f, i) => (
                <li
                  key={i}
                  className="text-sm bg-white/60 rounded-lg p-3 border border-black/5"
                >
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "uppercase tracking-eyebrow text-[9px]",
                        f.severity === "error" ? "text-tf-error border-tf-error/40" : "text-tf-warning border-tf-warning/40",
                      )}
                    >
                      {f.severity}
                    </Badge>
                    <span className="font-semibold text-foreground">{f.rule}</span>
                  </div>
                  <p className="text-foreground/80 mt-1">{f.message}</p>
                  {f.suggestion && (
                    <p className="text-tf-blue mt-1 font-medium">Fix: {f.suggestion}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Chart -------------------------------------------------------------------
function DraftChart({ chart }: { chart: ChartSpec }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-bold text-tf-navy">{chart.title}</div>
          <div className="text-[10px] uppercase tracking-eyebrow text-muted-foreground mt-0.5">
            {chart.unit} • {chart.source}
          </div>
        </div>
        {chart.citationId && (
          <span className="bg-tf-blue-tint text-tf-blue font-bold px-2 py-1 rounded text-xs">
            {chart.citationId}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        {chart.type === "line" ? (
          <LineChart data={chart.points} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E4E4EA" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#7C7C88" />
            <YAxis tick={{ fontSize: 11 }} stroke="#7C7C88" />
            <RechartsTooltip />
            <Line type="monotone" dataKey="value" stroke="#0066FF" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        ) : (
          <BarChart data={chart.points} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E4E4EA" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#7C7C88" />
            <YAxis tick={{ fontSize: 11 }} stroke="#7C7C88" />
            <RechartsTooltip />
            <Bar dataKey="value" fill="#0066FF" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// ---- Inline-editable section -------------------------------------------------
function SectionBlock({
  section,
  editing,
  onChange,
}: {
  section: DraftSection;
  editing: boolean;
  onChange: (body: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <h3 className="text-title-sm text-tf-navy font-bold">{section.heading}</h3>
        {section.internalOnly && (
          <Badge variant="outline" className="uppercase tracking-eyebrow text-[9px] text-tf-warning border-tf-warning/40 print-hide">
            <Lock className="w-3 h-3 mr-1" /> Internal only
          </Badge>
        )}
      </div>
      {editing ? (
        <Textarea
          value={section.body}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[120px] text-base leading-relaxed rounded-xl"
        />
      ) : (
        <div className="prose prose-blue max-w-none text-foreground leading-relaxed">
          {section.body.split("\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- The document canvas -----------------------------------------------------
function DocumentCanvas({
  draft,
  editing,
  onSectionChange,
  onUmbrellaChange,
  onOpenCitation,
}: {
  draft: GeneratedDraft;
  editing: boolean;
  onSectionChange: (id: string, body: string) => void;
  onUmbrellaChange: (body: string) => void;
  onOpenCitation: (c: Citation) => void;
}) {
  const externalStripped = draft.audience === "external";
  const visibleSections = externalStripped
    ? draft.sections.filter((s) => !s.internalOnly)
    : draft.sections;

  return (
    <div className="print-document bg-card border border-border rounded-2xl shadow-sm p-10 space-y-8 max-w-3xl">
      <div className="space-y-3 border-b border-border pb-6">
        <div className="flex items-center space-x-2 print-hide">
          <Badge className="uppercase tracking-eyebrow text-[10px] bg-tf-blue-tint text-tf-blue">
            {SHAPE_META[draft.shape as Shape]?.name ?? draft.shape}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "uppercase tracking-eyebrow text-[10px]",
              draft.audience === "external"
                ? "text-tf-success border-tf-success/40"
                : "text-tf-navy border-border",
            )}
          >
            {draft.audience}
          </Badge>
          <Badge variant="outline" className="uppercase tracking-eyebrow text-[10px] border-border">
            {draft.confidentiality}
          </Badge>
          <Badge variant="outline" className="uppercase tracking-eyebrow text-[10px] border-border">
            {draft.language}
          </Badge>
        </div>
        <h1 className="text-display-sm text-tf-navy">{draft.title}</h1>
      </div>

      {draft.historic && (
        <div className="flex items-center space-x-2 text-tf-warning bg-tf-warning-bg px-4 py-3 rounded-xl text-sm font-medium border border-tf-warning/20">
          <Clock className="w-5 h-5 flex-shrink-0" />
          <span>{draft.historicNote || "This draft draws on historic material."}</span>
        </div>
      )}

      {draft.umbrella && (
        <div className="bg-tf-navy text-white p-6 rounded-xl">
          <div className="text-[10px] uppercase tracking-eyebrow text-tf-blue-lighter mb-2 font-bold">
            Umbrella message
          </div>
          {editing ? (
            <Textarea
              value={draft.umbrella}
              onChange={(e) => onUmbrellaChange(e.target.value)}
              className="min-h-[80px] text-lg bg-white/10 border-white/20 text-white rounded-xl"
            />
          ) : (
            <p className="text-title-sm font-bold leading-snug">{draft.umbrella}</p>
          )}
        </div>
      )}

      <div className="space-y-8">
        {visibleSections.map((s) => (
          <SectionBlock
            key={s.id}
            section={s}
            editing={editing}
            onChange={(body) => onSectionChange(s.id, body)}
          />
        ))}
      </div>

      {draft.charts.length > 0 && (
        <div className="space-y-4 pt-2">
          {draft.charts.map((c) => (
            <DraftChart key={c.id} chart={c} />
          ))}
        </div>
      )}

      {draft.citations.length > 0 && (
        <div className="pt-6 border-t border-border space-y-4">
          <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground flex items-center">
            <FileText className="w-4 h-4 mr-2" /> Evidence & citations
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {draft.citations.map((c) => (
              <button
                key={c.id}
                onClick={() => onOpenCitation(c)}
                className="flex items-start space-x-3 p-3 bg-white border border-border rounded-xl hover:shadow-sm transition-all text-left print-hide"
              >
                <div className="bg-tf-blue-tint text-tf-blue font-bold px-2 py-1 rounded text-xs flex-shrink-0">
                  {c.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground">{c.docTitle}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {c.sourceLoc} • v{c.version}
                  </div>
                </div>
                {c.value && <span className="text-xs font-bold text-tf-success">{c.value}</span>}
              </button>
            ))}
          </div>
          {/* Print-only plain citation list */}
          <ol className="hidden print:block list-decimal ml-4 text-sm space-y-1">
            {draft.citations.map((c) => (
              <li key={c.id}>
                [{c.id}] {c.docTitle} — {c.sourceLoc} (v{c.version}, {c.owner})
              </li>
            ))}
          </ol>
        </div>
      )}

      {draft.disclaimers.length > 0 && (
        <div className="pt-4 border-t border-border space-y-2">
          {draft.disclaimers.map((d) => (
            <p key={d.id} className="text-xs text-muted-foreground italic leading-relaxed">
              {d.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Brief form --------------------------------------------------------------
function BriefForm({
  shapes,
  onGenerate,
  isPending,
}: {
  shapes: DocumentShape[] | undefined;
  onGenerate: (v: {
    shape: Shape;
    topic: string;
    audience: Audience;
    language: string;
    axisIds: string[];
    confidentiality: string;
    format: string;
  }) => void;
  isPending: boolean;
}) {
  const { data: axes } = useListAxes();
  const [shape, setShape] = useState<Shape>("messaging");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState<Audience>("internal");
  const [language, setLanguage] = useState("en");
  const [axisIds, setAxisIds] = useState<string[]>([]);
  // Destination sensitivity and deliverable format are part of the brief so the
  // engine frames the document correctly. Confidentiality defaults from the
  // audience (external work must land as public), format is shape-aware.
  const [confidentiality, setConfidentiality] = useState("internal");
  const formatOptions = FORMAT_OPTIONS[shape];
  const [format, setFormat] = useState(formatOptions[0].value);

  useEffect(() => {
    setConfidentiality(audience === "external" ? "public" : "internal");
  }, [audience]);

  useEffect(() => {
    setFormat(FORMAT_OPTIONS[shape][0].value);
  }, [shape]);
  // Smart follow-up: when the brief is missing the one thing the engine needs to
  // frame the document (its angle / key message), ask a single shape-aware
  // question before generating instead of guessing. Only ever asked once.
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [askedFollowUp, setAskedFollowUp] = useState(false);

  const FOLLOW_UP: Record<Shape, string> = {
    messaging: "What is the single key message you want this to land?",
    press: "What exactly are we announcing — the news hook in one line?",
    multiformat: "What is the core message, and which channel matters most?",
  };

  const toggleAxis = (id: string) =>
    setAxisIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const briefIsThin = topic.trim().split(/\s+/).filter(Boolean).length < 6;

  const submitBrief = () => {
    if (!askedFollowUp && briefIsThin) {
      setFollowUp(FOLLOW_UP[shape]);
      return;
    }
    onGenerate({ shape, topic, audience, language, axisIds, confidentiality, format });
  };

  const submitFollowUp = (skip: boolean) => {
    setAskedFollowUp(true);
    setFollowUp(null);
    const finalTopic =
      !skip && followUpAnswer.trim() ? `${topic.trim()} — ${followUpAnswer.trim()}` : topic;
    onGenerate({ shape, topic: finalTopic, audience, language, axisIds, confidentiality, format });
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-tf-blue-tint text-tf-blue flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7" />
        </div>
        <h1 className="text-display-sm text-tf-navy">Generate a governed document</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          One engine, three shapes. Every claim is cited from the governed corpus, and the Brand
          Guardian must clear it before export.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.keys(SHAPE_META) as Shape[]).map((s) => (
          <button
            key={s}
            onClick={() => setShape(s)}
            className={cn(
              "text-left p-4 rounded-xl border transition-all",
              shape === s
                ? "border-tf-blue bg-tf-blue-tint shadow-sm"
                : "border-border bg-card hover:bg-muted/50",
            )}
          >
            <div className="font-bold text-tf-navy text-sm">{SHAPE_META[s].name}</div>
            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {SHAPE_META[s].blurb}
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
          Brief
        </label>
        <Textarea
          placeholder="e.g. Q1 2026 results readout for the internal leadership call, covering Transform & Grow"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="min-h-[90px] rounded-xl text-base"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
            Audience
          </label>
          <div className="flex rounded-pill bg-muted p-1">
            {(["internal", "external"] as Audience[]).map((a) => (
              <button
                key={a}
                onClick={() => setAudience(a)}
                className={cn(
                  "flex-1 py-2 rounded-pill text-sm font-semibold capitalize transition-all",
                  audience === a ? "bg-white text-tf-navy shadow-sm" : "text-muted-foreground",
                )}
              >
                {a}
              </button>
            ))}
          </div>
          {audience === "external" && (
            <p className="text-xs text-tf-blue flex items-center mt-1">
              <Lock className="w-3 h-3 mr-1" /> External caps sources to public material before retrieval.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
            Language
          </label>
          <div className="flex rounded-pill bg-muted p-1">
            {[
              { code: "en", label: "English" },
              { code: "es", label: "Español" },
            ].map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={cn(
                  "flex-1 py-2 rounded-pill text-sm font-semibold transition-all",
                  language === l.code ? "bg-white text-tf-navy shadow-sm" : "text-muted-foreground",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
            Destination confidentiality
          </label>
          <select
            value={confidentiality}
            onChange={(e) => setConfidentiality(e.target.value)}
            disabled={audience === "external"}
            className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-tf-navy disabled:opacity-60"
          >
            {CONFIDENTIALITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {audience === "external" && (
            <p className="text-xs text-muted-foreground">
              External work is held to public and cannot be raised here.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
            Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-tf-navy"
          >
            {formatOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
          Strategic axes (optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {axes?.map((a) => (
            <button
              key={a.id}
              onClick={() => toggleAxis(a.id)}
              className={cn(
                "px-3 py-1.5 rounded-pill text-xs font-semibold border transition-all",
                axisIds.includes(a.id)
                  ? "text-white border-transparent shadow-sm"
                  : "text-muted-foreground border-border bg-card hover:bg-muted/50",
              )}
              style={axisIds.includes(a.id) ? { backgroundColor: a.color || "var(--tf-blue)" } : undefined}
            >
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {followUp ? (
        <div className="rounded-xl border border-tf-blue bg-tf-blue-tint p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center space-x-2 text-tf-blue">
            <MessageSquareQuote className="w-4 h-4" />
            <span className="text-xs uppercase tracking-eyebrow font-bold">One quick thing</span>
          </div>
          <p className="text-tf-navy font-semibold">{followUp}</p>
          <Textarea
            autoFocus
            placeholder="Add the missing detail so the draft is framed correctly (optional)"
            value={followUpAnswer}
            onChange={(e) => setFollowUpAnswer(e.target.value)}
            className="min-h-[70px] rounded-xl bg-white"
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={() => submitFollowUp(false)}
              disabled={isPending}
              className="flex-1 h-11 rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white font-semibold"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Generate with this
            </Button>
            <Button
              variant="outline"
              onClick={() => submitFollowUp(true)}
              disabled={isPending}
              className="h-11 rounded-pill font-semibold"
            >
              Skip
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={submitBrief}
          disabled={!topic.trim() || isPending}
          className="w-full h-12 rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white font-semibold text-base"
        >
          <Sparkles className="w-4 h-4 mr-2" /> Generate draft
        </Button>
      )}
    </div>
  );
}

// ---- Watchable drafting pipeline --------------------------------------------
// The pipeline mirrors the real phases the backend job runs through. The client
// polls the job and drives these steps from the server-reported stage, so what
// the user sees is the actual work happening, not a timed animation.
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
          { key: "retrieving", icon: Search, label: "Re-checking governed evidence" },
          { key: "composing", icon: PenLine, label: "Applying your refinement with citations" },
          { key: "guardian", icon: ShieldCheck, label: "Brand Guardian re-checking claims and tone" },
        ]
      : [
          { key: "retrieving", icon: Search, label: "Retrieving governed evidence" },
          { key: "composing", icon: PenLine, label: "Composing the document with citations" },
          { key: "guardian", icon: ShieldCheck, label: "Brand Guardian checking claims and tone" },
        ];
  // Map the reported stage onto the visible step index. "done" means every step
  // is complete.
  const order = ["retrieving", "composing", "guardian", "done"];
  const active = stage === "done" ? steps.length : order.indexOf(stage);

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6 animate-in fade-in duration-500">
        <div className="text-center space-y-1">
          <div className="text-tf-navy font-semibold text-lg tracking-tight">
            {variant === "refine" ? "Refining under governance" : "Composing from governed evidence"}
          </div>
          <p className="text-sm text-muted-foreground">
            Permission-filtered sources only. Every claim is cited before it reaches you.
          </p>
        </div>
        <ol className="space-y-2">
          {steps.map((s, i) => {
            const done = i < active;
            const current = i === active;
            const Icon = s.icon;
            return (
              <li
                key={s.label}
                className={cn(
                  "flex items-center space-x-3 rounded-xl border px-4 py-3 transition-all duration-300",
                  current
                    ? "border-tf-blue bg-tf-blue-tint"
                    : done
                      ? "border-border bg-card"
                      : "border-border bg-card opacity-45",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                    done
                      ? "bg-tf-success-bg text-tf-success"
                      : current
                        ? "bg-tf-blue text-white"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className={cn("w-4 h-4", current && "animate-pulse")} />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    current ? "text-tf-navy" : done ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export default function Generate() {
  const { roleId } = useApp();
  const [tab, setTab] = useState<Tab>("compose");
  const [draft, setDraft] = useState<GeneratedDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [showAssets, setShowAssets] = useState(false);

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

  // Observable job: we start a generate/refine job on the server and poll it so
  // the pipeline reflects the real backend phase, not a timer.
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobVariant, setJobVariant] = useState<"generate" | "refine">("generate");
  const jobQ = useGetGenerationJob(jobId ?? "", {
    query: {
      enabled: !!jobId,
      queryKey: ["generation-job", jobId],
      refetchInterval: (query) =>
        query.state.data?.status === "running" ? 500 : false,
    },
  });

  useEffect(() => {
    const job = jobQ.data;
    if (!job || !jobId) return;
    if (job.status === "done" && job.draft) {
      setDraft(job.draft as GeneratedDraft);
      if (jobVariant === "refine") setInstruction("");
      setJobId(null);
    } else if (job.status === "error") {
      setJobId(null);
    }
  }, [jobQ.data, jobId, jobVariant]);

  const stage = (jobQ.data?.stage ?? "retrieving") as PipelineStage;
  const busy =
    startGenerate.isPending ||
    startRefine.isPending ||
    (!!jobId && jobQ.data?.status !== "done" && jobQ.data?.status !== "error");

  const handleGenerate = (v: {
    shape: Shape;
    topic: string;
    audience: Audience;
    language: string;
    axisIds: string[];
    confidentiality: string;
    format: string;
  }) => {
    if (!roleId) return;
    setEditing(false);
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
        },
      },
      { onSuccess: (job) => setJobId(job.id) },
    );
  };

  const handleRefine = () => {
    if (!draft || !instruction.trim() || !roleId) return;
    setJobVariant("refine");
    startRefine.mutate(
      { data: { draft, instruction, roleId } },
      { onSuccess: (job) => setJobId(job.id) },
    );
  };

  const recheck = (next: GeneratedDraft) => {
    check.mutate(
      { data: { draft: next } },
      { onSuccess: (g) => setDraft({ ...next, guardian: g }) },
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

  const finishEditing = () => {
    setEditing(false);
    if (draft) recheck(draft);
  };

  const handleSaveVersion = () => {
    if (!draft) return;
    const savedBy = roles?.find((r) => r.id === roleId)?.label ?? "Hub user";
    saveVersion.mutate(
      { data: { draft, savedBy } },
      { onSuccess: () => versionsQ.refetch() },
    );
  };

  // Export is not just a print: it persists a governed, versioned copy (with the
  // 3-layer governance tags captured server-side) and only then opens the
  // print-ready view, so every exported document is traceable in Versions.
  const handleExport = () => {
    if (!draft) return;
    const savedBy = roles?.find((r) => r.id === roleId)?.label ?? "Hub user";
    saveVersion.mutate(
      { data: { draft, savedBy } },
      {
        onSuccess: () => {
          versionsQ.refetch();
          window.print();
        },
      },
    );
  };

  // Approve the draft currently open in Canvas (after any Canvas edits/refine),
  // not the stale copy in the inbox list. The server binds approval to this
  // exact content hash, so this is what unlocks export/versioning.
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
  // Scheduled drafts require a human approval in the review inbox before they can
  // be exported or versioned, even when the Guardian passes.
  const scheduledLocked = draft?.origin === "scheduled" && draft?.approved !== true;
  const canExport = guardianPass && !scheduledLocked;

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="border-b border-border bg-white px-6 flex items-center space-x-1 flex-shrink-0 print-hide">
        {[
          { id: "compose" as Tab, label: "Compose", icon: Sparkles },
          { id: "scheduled" as Tab, label: "Scheduled", icon: CalendarClock },
          { id: "inbox" as Tab, label: "Review inbox", icon: Inbox, count: inboxQ.data?.filter((i) => i.status === "pending").length },
          { id: "versions" as Tab, label: "Versions", icon: History, count: versionsQ.data?.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px",
              tab === t.id
                ? "border-tf-blue text-tf-blue"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
            {typeof t.count === "number" && t.count > 0 && (
              <span className="bg-tf-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "compose" && (
        <div className="flex-1 overflow-hidden flex">
          {/* Left: canvas / brief */}
          <div className="flex-1 overflow-y-auto p-6">
            {busy ? (
              <DraftingPipeline variant={jobVariant} stage={stage} />
            ) : !draft ? (
              <BriefForm shapes={shapes} onGenerate={handleGenerate} isPending={busy} />
            ) : draft.status === "no_evidence" ? (
              <div className="max-w-2xl mx-auto mt-10">
                <div className="flex items-start space-x-4 text-tf-warning bg-tf-warning-bg p-6 rounded-xl border border-tf-warning/20">
                  <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg text-foreground">No governed evidence</h3>
                    <p className="text-foreground mt-2 leading-relaxed">{draft.note}</p>
                    <Button variant="outline" className="mt-4 rounded-pill" onClick={() => setDraft(null)}>
                      Adjust the brief
                    </Button>
                  </div>
                </div>
              </div>
            ) : draft.status === "permission_blocked" ? (
              <div className="max-w-2xl mx-auto mt-10">
                <div className="flex items-start space-x-4 text-tf-error bg-tf-error-bg p-6 rounded-xl border border-tf-error/20">
                  <ShieldAlert className="w-6 h-6 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg text-foreground">Permission restricted</h3>
                    <p className="text-foreground mt-2 leading-relaxed">{draft.permissionNote}</p>
                    <Button variant="outline" className="mt-4 rounded-pill" onClick={() => setDraft(null)}>
                      Adjust the brief
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <DocumentCanvas
                draft={draft}
                editing={editing}
                onSectionChange={updateSection}
                onUmbrellaChange={updateUmbrella}
                onOpenCitation={setSelectedCitation}
              />
            )}
          </div>

          {/* Right: control panel */}
          {draft && draft.status === "drafted" && (
            <div className="w-[380px] border-l border-border bg-tf-grey-50 flex flex-col flex-shrink-0 print-hide">
              <ScrollArea className="flex-1">
                <div className="p-5 space-y-5">
                  <GuardianBar guardian={draft.guardian} />

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="rounded-pill"
                      onClick={() => (editing ? finishEditing() : setEditing(true))}
                    >
                      {editing ? (
                        <>
                          <Check className="w-4 h-4 mr-1" /> Done
                        </>
                      ) : (
                        <>
                          <Pencil className="w-4 h-4 mr-1" /> Edit
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-pill"
                      onClick={handleExport}
                      disabled={!canExport || saveVersion.isPending}
                      title={
                        canExport
                          ? "Save a governed version and open the print-ready view"
                          : scheduledLocked
                            ? "Approve in the review inbox before export"
                            : "Guardian must pass before export"
                      }
                    >
                      <Printer className="w-4 h-4 mr-1" /> Export
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-pill"
                      onClick={handleSaveVersion}
                      disabled={!canExport || saveVersion.isPending}
                      title="Save a governed version without exporting"
                    >
                      <Save className="w-4 h-4 mr-1" /> Save version
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-pill"
                      onClick={() => setShowAssets(true)}
                    >
                      <BookMarked className="w-4 h-4 mr-1" /> Assets
                    </Button>
                    {scheduledLocked && (
                      <Button
                        className="rounded-pill col-span-2 bg-tf-blue text-white hover:bg-tf-blue/90"
                        onClick={handleApproveFromCanvas}
                        disabled={!guardianPass || approve.isPending}
                        title={
                          guardianPass
                            ? "Approve this draft (including your Canvas edits) so it can be exported and versioned"
                            : "The Brand Guardian must pass before approval"
                        }
                      >
                        <Check className="w-4 h-4 mr-1" />
                        {approve.isPending ? "Approving..." : "Approve draft"}
                      </Button>
                    )}
                  </div>
                  {!canExport && (
                    <p className="text-xs text-tf-error flex items-center">
                      <Lock className="w-3 h-3 mr-1" />
                      {scheduledLocked
                        ? "Scheduled draft: adjust it here, then Approve draft (or approve it in the Review inbox) before export or versioning."
                        : "Export and versioning are locked until the Guardian passes."}
                    </p>
                  )}

                  {/* Spokesperson notes (internal only) */}
                  {draft.spokesperson.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <MessageSquareQuote className="w-4 h-4 text-tf-navy" />
                        <span className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
                          Spokesperson notes
                        </span>
                        <Badge variant="outline" className="uppercase tracking-eyebrow text-[9px] text-tf-warning border-tf-warning/40">
                          Internal
                        </Badge>
                      </div>
                      {draft.spokesperson.map((n, i) => (
                        <div key={i} className="bg-white border border-border rounded-xl p-3">
                          <div className="font-semibold text-sm text-tf-navy">{n.question}</div>
                          <p className="text-sm text-foreground/80 mt-1">{n.guidance}</p>
                          {n.doNotSay && (
                            <p className="text-xs text-tf-error mt-2 font-medium flex items-start">
                              <ShieldAlert className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" /> Do not say: {n.doNotSay}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {draft.charts.length > 0 && (
                    <div className="text-xs text-muted-foreground flex items-center">
                      <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                      {draft.charts.length} chart{draft.charts.length > 1 ? "s" : ""} built from governed series.
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Refine chat */}
              <div className="border-t border-border p-4 bg-white space-y-2">
                <div className="flex items-center space-x-2">
                  <Wand2 className="w-4 h-4 text-tf-blue" />
                  <span className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
                    Refine
                  </span>
                </div>
                <div className="relative">
                  <Textarea
                    placeholder="e.g. Tighten the B2B section and add the dividend figure"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleRefine();
                      }
                    }}
                    className="min-h-[56px] max-h-[140px] resize-none rounded-xl pr-12 text-sm"
                  />
                  <Button
                    size="icon"
                    aria-label="Send refine instruction"
                    className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-tf-blue hover:bg-tf-blue-hover text-white"
                    onClick={handleRefine}
                    disabled={!instruction.trim() || busy}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground w-full"
                  onClick={() => {
                    setDraft(null);
                    setEditing(false);
                  }}
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Start a new brief
                </Button>
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

      {/* Citation drawer */}
      <Drawer open={!!selectedCitation} onOpenChange={(open) => !open && setSelectedCitation(null)}>
        <DrawerContent className="max-h-[85vh]">
          <div className="mx-auto w-full max-w-2xl px-6 pb-8 pt-4">
            {selectedCitation && (
              <>
                <DrawerHeader className="px-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-tf-blue-tint text-tf-blue font-bold px-3 py-1 rounded text-sm">
                      Citation [{selectedCitation.id}]
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={cn("uppercase tracking-eyebrow text-[10px]", selectedCitation.validity === "approved" ? "bg-tf-success text-white" : "")}>
                        {selectedCitation.validity}
                      </Badge>
                      <Badge variant={selectedCitation.confidentiality === "public" ? "secondary" : "destructive"} className="uppercase tracking-eyebrow text-[10px]">
                        {selectedCitation.confidentiality}
                      </Badge>
                    </div>
                  </div>
                  <DrawerTitle className="text-2xl font-bold text-tf-navy mt-2">
                    {selectedCitation.docTitle}
                  </DrawerTitle>
                  <DrawerDescription className="text-base mt-1">
                    {selectedCitation.sourceLoc}
                  </DrawerDescription>
                </DrawerHeader>
                <div className="bg-muted p-6 rounded-xl border border-border">
                  <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground mb-3">
                    Extracted snippet
                  </h4>
                  <p className="text-foreground leading-relaxed font-serif text-lg">
                    "{selectedCitation.snippet}"
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">Version</div>
                    <div className="font-medium text-sm">{selectedCitation.version}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">Owner</div>
                    <div className="font-medium text-sm">{selectedCitation.owner}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">Confidence</div>
                    <div className="font-medium text-sm flex items-center space-x-1">
                      <span>{Math.round(selectedCitation.confidence * 100)}%</span>
                      {selectedCitation.confidence > 0.8 && <CheckCircle2 className="w-4 h-4 text-tf-success" />}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Assets drawer */}
      <Drawer open={showAssets} onOpenChange={setShowAssets}>
        <DrawerContent className="max-h-[85vh]">
          <div className="mx-auto w-full max-w-3xl px-6 pb-8 pt-4">
            <DrawerHeader className="px-0">
              <DrawerTitle className="text-2xl font-bold text-tf-navy">Governed assets</DrawerTitle>
              <DrawerDescription>
                Approved claims, quotes, boilerplate and disclaimers available to the engine.
              </DrawerDescription>
            </DrawerHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {assets?.claims && assets.claims.length > 0 && (
                  <AssetGroup title="Approved claims">
                    {assets.claims.map((c) => (
                      <div key={c.id} className="bg-muted rounded-xl p-3 text-sm">
                        <p className="text-foreground">{c.text}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="uppercase tracking-eyebrow text-[9px]">{c.confidentiality}</Badge>
                          <Badge variant="outline" className="uppercase tracking-eyebrow text-[9px]">{c.validity}</Badge>
                        </div>
                      </div>
                    ))}
                  </AssetGroup>
                )}
                {assets?.quotes && assets.quotes.length > 0 && (
                  <AssetGroup title="Approved quotes">
                    {assets.quotes.map((q) => (
                      <div key={q.id} className="bg-muted rounded-xl p-3 text-sm">
                        <p className="text-foreground font-serif italic">"{q.text}"</p>
                        <p className="text-xs text-muted-foreground mt-1">— {q.attribution}</p>
                      </div>
                    ))}
                  </AssetGroup>
                )}
                {assets?.disclaimers && assets.disclaimers.length > 0 && (
                  <AssetGroup title="Disclaimers">
                    {assets.disclaimers.map((d) => (
                      <div key={d.id} className="bg-muted rounded-xl p-3 text-sm">
                        <div className="font-semibold text-tf-navy">{d.name}</div>
                        <p className="text-foreground/80 mt-1">{d.text}</p>
                      </div>
                    ))}
                  </AssetGroup>
                )}
                {assets?.glossary && assets.glossary.length > 0 && (
                  <AssetGroup title="Glossary">
                    {assets.glossary.map((g) => (
                      <div key={g.id} className="bg-muted rounded-xl p-3 text-sm">
                        <span className="font-semibold text-tf-navy">{g.term}:</span>{" "}
                        <span className="text-foreground/80">{g.definition}</span>
                      </div>
                    ))}
                  </AssetGroup>
                )}
              </div>
            </ScrollArea>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function AssetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ---- Scheduled tab -----------------------------------------------------------
function ScheduledTab({
  shapes,
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
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [shape, setShape] = useState<Shape>("messaging");
  const [frequency, setFrequency] = useState("weekly");
  const [audience, setAudience] = useState<Audience>("internal");
  // The schedule runs under an owner's clearance and lands in a named review
  // folder in the inbox. Owner defaults to the current persona but can be any
  // role; axes steer retrieval the same way they do in the brief.
  const [ownerRoleId, setOwnerRoleId] = useState("");
  const [reviewFolder, setReviewFolder] = useState("");
  const [queriesText, setQueriesText] = useState("");
  const [axisIds, setAxisIds] = useState<string[]>([]);

  useEffect(() => {
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
        confidentiality: audience === "external" ? "public" : "internal",
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
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-title-lg text-tf-navy">Scheduled documents</h2>
          <p className="text-muted-foreground mt-1">
            Recurring briefs run under the owner's clearance and land in the review inbox for a human
            approval gate before anyone can export them.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-tf-navy">New schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Schedule name, e.g. Weekly brand pulse" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
            <select value={shape} onChange={(e) => setShape(e.target.value as Shape)} className="rounded-xl border border-input bg-background px-3 h-10 text-sm">
              {(Object.keys(SHAPE_META) as Shape[]).map((s) => (
                <option key={s} value={s}>{SHAPE_META[s].name}</option>
              ))}
            </select>
          </div>
          <Textarea placeholder="Standing brief, e.g. Weekly readout of Transform & Grow progress" value={topic} onChange={(e) => setTopic(e.target.value)} className="rounded-xl min-h-[70px]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="rounded-xl border border-input bg-background px-3 h-10 text-sm">
              {["daily", "weekly", "monthly"].map((f) => (
                <option key={f} value={f} className="capitalize">{f}</option>
              ))}
            </select>
            <select value={audience} onChange={(e) => setAudience(e.target.value as Audience)} className="rounded-xl border border-input bg-background px-3 h-10 text-sm">
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">Owner (runs under this clearance)</label>
              <select value={ownerRoleId} onChange={(e) => setOwnerRoleId(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 h-10 text-sm">
                {roles?.map((r) => (
                  <option key={r.id} value={r.id}>{r.label} • {r.clearance}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">Review folder</label>
              <Input placeholder="e.g. Brand pulse" value={reviewFolder} onChange={(e) => setReviewFolder(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">Governed source queries (optional, one per line)</label>
            <Textarea
              placeholder={"e.g. Transform & Grow KPI targets\nCustomer NPS trend"}
              value={queriesText}
              onChange={(e) => setQueriesText(e.target.value)}
              className="rounded-xl min-h-[60px]"
            />
            <p className="text-xs text-muted-foreground">
              Each recurring run retrieves against these governed queries in addition to the standing brief.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">Strategic axes (optional)</label>
            <div className="flex flex-wrap gap-2">
              {axes?.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAxis(a.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-pill text-xs font-semibold border transition-all",
                    axisIds.includes(a.id)
                      ? "text-white border-transparent shadow-sm"
                      : "text-muted-foreground border-border bg-card hover:bg-muted/50",
                  )}
                  style={axisIds.includes(a.id) ? { backgroundColor: a.color || "var(--tf-blue)" } : undefined}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={submit} disabled={!name.trim() || !topic.trim() || creating} className="rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white">
            <CalendarClock className="w-4 h-4 mr-2" /> Create schedule
          </Button>
        </div>

        <div className="space-y-3">
          {(!schedules || schedules.length === 0) && (
            <div className="text-center text-muted-foreground py-10">No schedules yet.</div>
          )}
          {schedules?.map((s) => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-tf-navy">{s.name}</span>
                  <Badge variant="outline" className="uppercase tracking-eyebrow text-[9px] capitalize">{s.frequency}</Badge>
                  <Badge variant="outline" className="uppercase tracking-eyebrow text-[9px]">{s.audience}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">{s.topic}</p>
                {s.queries.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Sources: {s.queries.join(" · ")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Owner: {s.ownerLabel}
                  {s.lastRunAt ? ` • Last run ${new Date(s.lastRunAt).toLocaleString()}` : " • Never run"}
                </p>
              </div>
              <Button variant="outline" className="rounded-pill flex-shrink-0" onClick={() => onRun(s.id)} disabled={running}>
                <RefreshCw className="w-4 h-4 mr-2" /> Run now
              </Button>
            </div>
          ))}
        </div>
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
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-title-lg text-tf-navy">Review inbox</h2>
          <p className="text-muted-foreground mt-1">
            Scheduled drafts wait here for a human approval gate. Approval requires a passing Brand
            Guardian verdict.
          </p>
        </div>

        {(!items || items.length === 0) && (
          <div className="text-center text-muted-foreground py-10">
            The inbox is empty. Run a schedule to populate it.
          </div>
        )}

        <div className="space-y-3">
          {items?.map((item) => {
            const pass = item.draft.guardian.status === "pass" && item.draft.status === "drafted";
            return (
              <div key={item.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-tf-navy">{item.draft.title}</span>
                      {item.status === "approved" ? (
                        <Badge className="uppercase tracking-eyebrow text-[9px] bg-tf-success text-white">Approved</Badge>
                      ) : (
                        <Badge variant="outline" className="uppercase tracking-eyebrow text-[9px] text-tf-warning border-tf-warning/40">Pending</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.scheduleName} • {item.reviewFolder} • {item.ownerLabel}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      {pass ? (
                        <span className="text-xs text-tf-success flex items-center"><ShieldCheck className="w-3.5 h-3.5 mr-1" /> Guardian cleared</span>
                      ) : (
                        <span className="text-xs text-tf-error flex items-center"><ShieldAlert className="w-3.5 h-3.5 mr-1" /> Guardian blocked</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Button variant="outline" size="sm" className="rounded-pill" onClick={() => onOpen(item.draft)}>
                      Open
                    </Button>
                    {item.status !== "approved" && (
                      <Button
                        size="sm"
                        className="rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white"
                        onClick={() => onApprove(item)}
                        disabled={!pass || approving}
                        title={pass ? "Approve" : "Guardian must pass first"}
                      >
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---- Versions tab ------------------------------------------------------------
function VersionsTab({ versions, onOpen }: { versions: SavedVersion[] | undefined; onOpen: (d: GeneratedDraft) => void }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-title-lg text-tf-navy">Saved versions</h2>
          <p className="text-muted-foreground mt-1">
            In-memory version history of Guardian-cleared documents. Resets when the server restarts.
          </p>
        </div>

        {(!versions || versions.length === 0) && (
          <div className="text-center text-muted-foreground py-10">No versions saved yet.</div>
        )}

        <div className="space-y-3">
          {versions?.map((v) => (
            <div key={v.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-tf-navy">{v.title}</span>
                  <Badge variant="outline" className="uppercase tracking-eyebrow text-[9px]">v{v.version}</Badge>
                  <Badge variant="outline" className="uppercase tracking-eyebrow text-[9px]">{v.confidentiality}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Saved by {v.savedBy} • {new Date(v.savedAt).toLocaleString()} • Owner {v.governance.owner}
                </p>
              </div>
              <Button variant="outline" size="sm" className="rounded-pill flex-shrink-0" onClick={() => onOpen(v.draft)}>
                Open
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
