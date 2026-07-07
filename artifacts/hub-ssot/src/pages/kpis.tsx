import React, { useMemo, useState } from "react";
import {
  useQueryKpis,
  useGetKpiDetail,
  useAskKpis,
  KpiCard as KpiCardType,
  KpiDetail,
  KpiSource,
  Citation,
  AskResult,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Send,
  MessageSquare,
  FileText,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PeriodType = "week" | "month" | "quarter";

const PERIOD_LABELS: Record<PeriodType, string> = {
  week: "Weekly",
  month: "Monthly",
  quarter: "Quarterly",
};

const STATUS_STYLES: Record<
  KpiCardType["status"],
  { dot: string; label: string; text: string; bg: string }
> = {
  "on-track": { dot: "bg-tf-success", label: "On track", text: "text-tf-success", bg: "bg-tf-success-bg" },
  amber: { dot: "bg-tf-warning", label: "At risk", text: "text-tf-warning", bg: "bg-tf-warning-bg" },
  "off-track": { dot: "bg-tf-error", label: "Off track", text: "text-tf-error", bg: "bg-tf-error-bg" },
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((value, i) => ({ i, value }));
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#spark-${color.replace("#", "")})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function VariationBadge({ kpi }: { kpi: KpiCardType }) {
  const improving =
    kpi.direction === "higher-better" ? kpi.variation >= 0 : kpi.variation <= 0;
  const flat = kpi.variation === 0;
  const Icon = flat ? Minus : improving ? TrendingUp : TrendingDown;
  const tone = flat
    ? "text-muted-foreground"
    : improving
    ? "text-tf-success"
    : "text-tf-error";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-bold", tone)}>
      <Icon className="w-3.5 h-3.5" />
      {kpi.variation > 0 ? "+" : ""}
      {kpi.variation}
      {kpi.unit}
      <span className="opacity-60">({kpi.variationPct > 0 ? "+" : ""}{kpi.variationPct}%)</span>
    </span>
  );
}

function AxisPill({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-sm"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  );
}

const VALIDITY_STYLES: Record<string, { label: string; cls: string }> = {
  approved: { label: "Approved", cls: "text-tf-success bg-tf-success-bg" },
  historic: { label: "Historic", cls: "text-tf-warning bg-tf-warning-bg" },
  superseded: { label: "Superseded", cls: "text-tf-warning bg-tf-warning-bg" },
  draft: { label: "Draft", cls: "text-muted-foreground bg-muted" },
};

// Card-level evidence chip: the number is only as good as what backs it, so every
// card surfaces its primary source, its validity state, the composite blend and a
// confidence read — the "every figure is cited" promise, visible before drill-down.
function CardEvidenceChip({ kpi }: { kpi: KpiCardType }) {
  const primary = kpi.sources[0];
  const extra = kpi.sources.length - 1;
  const validity = VALIDITY_STYLES[kpi.validity] ?? VALIDITY_STYLES.approved;
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="w-3.5 h-3.5 text-tf-blue shrink-0" />
        <span className="text-xs font-semibold text-tf-navy truncate">
          {primary ? primary.label : "No source"}
          {extra > 0 && (
            <span className="text-muted-foreground font-medium"> +{extra}</span>
          )}
        </span>
        <span
          className={cn(
            "ml-auto shrink-0 text-[9px] uppercase tracking-eyebrow font-bold px-1.5 py-0.5 rounded",
            validity.cls,
          )}
        >
          {validity.label}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          {Math.round(kpi.confidence * 100)}% confidence
        </span>
        <span className="opacity-40">•</span>
        <span className="truncate" title={kpi.blend}>
          {kpi.composite ? kpi.blend : "Single source"}
        </span>
      </div>
    </div>
  );
}

function KpiCardTile({ kpi, onOpen }: { kpi: KpiCardType; onOpen: () => void }) {
  const status = STATUS_STYLES[kpi.status];
  const progressClamped = Math.max(0, Math.min(100, kpi.progress));
  return (
    <button
      onClick={onOpen}
      className="text-left bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-tf-blue/30 transition-all flex flex-col gap-4 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground truncate">
            {kpi.market} • {kpi.brand}
          </div>
          <h3 className="font-bold text-tf-navy leading-snug mt-1 line-clamp-2">{kpi.name}</h3>
        </div>
        <span className={cn("shrink-0 w-2.5 h-2.5 rounded-full mt-1.5", status.dot)} title={status.label} />
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-display-sm text-tf-navy leading-none">
            {kpi.current}
            <span className="text-lg text-muted-foreground font-medium ml-0.5">{kpi.unit}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1.5 font-medium">
            Target {kpi.target}
            {kpi.unit}
          </div>
        </div>
        <div className="w-24 shrink-0">
          <Sparkline data={kpi.spark} color={kpi.axisColor} />
        </div>
      </div>

      <div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full", status.dot)}
            style={{ width: `${progressClamped}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className={cn("text-[10px] uppercase tracking-eyebrow font-bold", status.text)}>
            {status.label} • {kpi.progress}%
          </span>
          <VariationBadge kpi={kpi} />
        </div>
      </div>

      <CardEvidenceChip kpi={kpi} />

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
        <AxisPill name={kpi.axisName} color={kpi.axisColor} />
        <div className="flex items-center gap-1.5">
          {kpi.composite && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-tf-blue bg-tf-blue-tint px-2 py-1 rounded-full">
              <Layers className="w-3 h-3" /> Blend
            </span>
          )}
          {kpi.conflict && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-tf-warning bg-tf-warning-bg px-2 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" /> Conflict
            </span>
          )}
          {kpi.historic && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-tf-warning bg-tf-warning-bg px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" /> Historic
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[130px] rounded-full border-border bg-card text-sm font-medium">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SourceRow({
  source,
  index,
  onOpen,
}: {
  source: KpiSource;
  index: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full text-left border rounded-xl p-4 bg-card transition-all hover:shadow-sm hover:border-tf-blue/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tf-blue/40",
        source.accessible ? "border-border" : "border-tf-error/30 bg-tf-error-bg/40",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-tf-blue-tint text-tf-blue font-bold px-2 py-0.5 rounded text-xs shrink-0">
            S{index + 1}
          </span>
          <span className="font-semibold text-sm text-tf-navy truncate">{source.docTitle}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="secondary" className="uppercase text-[10px] tracking-eyebrow">
            {source.kind}
          </Badge>
          {source.conflict && (
            <Badge className="bg-tf-warning text-white hover:bg-tf-warning uppercase text-[10px] tracking-eyebrow">
              conflict
            </Badge>
          )}
        </div>
      </div>
      {source.sourceLoc && (
        <div className="text-[10px] uppercase tracking-eyebrow text-muted-foreground font-bold mb-2">
          {source.sourceLoc}
        </div>
      )}
      {source.accessible ? (
        source.snippet && (
          <p className="text-sm text-foreground/80 leading-relaxed font-serif line-clamp-2">"{source.snippet}"</p>
        )
      ) : (
        <p className="text-sm text-tf-error font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Evidence withheld — above your clearance.
        </p>
      )}
      <div className="flex items-center justify-between gap-4 mt-3">
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-eyebrow text-muted-foreground font-bold">
          <span>Weight {Math.round(source.weight * 100)}%</span>
          {source.owner && <span>{source.owner}</span>}
          {source.confidentiality && <span>{source.confidentiality}</span>}
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-tf-blue shrink-0">
          View citation <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}

// Source citation detail — mirrors the Ask/Data citation drawer so the KPI panel
// speaks the same "click a marker, see the governed snippet" language. Fails closed:
// a source above clearance shows the block, never the snippet.
function SourceDetailDialog({
  source,
  index,
  open,
  onOpenChange,
}: {
  source: KpiSource | null;
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const validity = source
    ? VALIDITY_STYLES[source.validity ?? "approved"] ?? VALIDITY_STYLES.approved
    : VALIDITY_STYLES.approved;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {source && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="bg-tf-blue-tint text-tf-blue font-bold px-3 py-1 rounded text-sm">
                  Citation S{index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn("uppercase tracking-eyebrow text-[10px] font-bold px-2 py-0.5 rounded", validity.cls)}>
                    {validity.label}
                  </span>
                  {source.confidentiality && (
                    <Badge
                      variant={source.confidentiality === "public" ? "secondary" : "destructive"}
                      className="uppercase tracking-eyebrow text-[10px]"
                    >
                      {source.confidentiality}
                    </Badge>
                  )}
                </div>
              </div>
              <DialogTitle className="text-2xl font-bold text-tf-navy text-left">
                {source.docTitle ?? source.label}
              </DialogTitle>
              {source.sourceLoc && (
                <DialogDescription className="text-left">{source.sourceLoc}</DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-5 mt-2">
              {source.accessible ? (
                source.snippet ? (
                  <div className="bg-muted p-5 rounded-xl border border-border">
                    <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground mb-3">
                      Extracted snippet
                    </h4>
                    <p className="text-foreground leading-relaxed font-serif text-lg">"{source.snippet}"</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">This external signal has no extracted snippet.</p>
                )
              ) : (
                <div className="bg-tf-error-bg p-5 rounded-xl border border-tf-error/30 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-tf-error mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground leading-relaxed">
                    This evidence is above your current clearance, so the Hub will not reveal its snippet. Its
                    contribution to the blend is still governed and fails closed.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">Weight</div>
                  <div className="font-medium text-sm">{Math.round(source.weight * 100)}%</div>
                </div>
                {source.version && (
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">Version</div>
                    <div className="font-medium text-sm">{source.version}</div>
                  </div>
                )}
                {source.owner && (
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">Owner</div>
                    <div className="font-medium text-sm">{source.owner}</div>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">Confidence</div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    <span>{Math.round(source.confidence * 100)}%</span>
                    {source.confidence > 0.8 && <CheckCircle2 className="w-4 h-4 text-tf-success" />}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KpiChat({
  kpiIds,
  heading = "Ask about this KPI",
  intro = "Ask why this metric moved, what is driving it, or how it compares — answered only from the governed evidence behind this KPI, with citations.",
  placeholder = "Why did this move?",
}: {
  kpiIds: string[];
  heading?: string;
  intro?: string;
  placeholder?: string;
}) {
  const { area, roleId } = useApp();
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const { mutate, data, isPending, reset } = useAskKpis();

  const submit = () => {
    if (!question.trim() || !roleId || kpiIds.length === 0) return;
    setAsked(question);
    reset();
    mutate({ data: { question, area, roleId, kpiIds } });
  };

  const result = data as AskResult | undefined;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <MessageSquare className="w-4 h-4 text-tf-blue" />
        <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
          {heading}
        </h4>
      </div>

      <ScrollArea className="flex-1 -mx-1 px-1 mb-3">
        {!result && !isPending && (
          <p className="text-sm text-muted-foreground leading-relaxed">{intro}</p>
        )}
        {isPending && (
          <div className="flex items-center gap-3 text-tf-navy py-4">
            <div className="w-5 h-5 rounded-full border-2 border-tf-blue border-t-transparent animate-spin" />
            <span className="text-sm font-medium">Reading the evidence...</span>
          </div>
        )}
        {result && !isPending && (
          <div className="space-y-4">
            <div className="bg-muted px-4 py-2 rounded-xl rounded-tr-sm text-sm font-medium text-foreground inline-block max-w-full">
              {asked}
            </div>

            {result.status === "no_evidence" && (
              <div className="flex items-start gap-3 text-tf-warning bg-tf-warning-bg p-4 rounded-xl">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <p className="text-sm text-foreground leading-relaxed">{result.answer}</p>
              </div>
            )}
            {result.status === "permission_blocked" && (
              <div className="flex items-start gap-3 text-tf-error bg-tf-error-bg p-4 rounded-xl">
                <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-foreground leading-relaxed">{result.answer}</p>
                  {result.permissionNote && (
                    <p className="text-xs mt-2 font-semibold bg-white/60 px-3 py-2 rounded-lg">
                      {result.permissionNote}
                    </p>
                  )}
                </div>
              </div>
            )}
            {result.status === "answered" && (
              <div className="space-y-3">
                {result.historic && (
                  <div className="flex items-center gap-2 text-tf-warning bg-tf-warning-bg px-3 py-2 rounded-lg text-xs font-medium">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>{result.historicNote || "Draws on historic material."}</span>
                  </div>
                )}
                <div className="text-sm text-foreground leading-relaxed space-y-2">
                  {result.answer.split("\n").map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                {result.citations && result.citations.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    {result.citations.map((c: Citation) => (
                      <div key={c.id} className="flex items-start gap-2 text-xs bg-muted/60 rounded-lg p-2.5">
                        <span className="bg-tf-blue-tint text-tf-blue font-bold px-1.5 py-0.5 rounded shrink-0">
                          {c.id}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-tf-navy truncate">{c.docTitle}</div>
                          <div className="text-muted-foreground truncate">{c.sourceLoc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="relative shrink-0">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="min-h-[52px] max-h-[140px] rounded-xl resize-none pr-12 text-sm border-border focus-visible:ring-tf-blue"
        />
        <Button
          size="icon"
          className="absolute bottom-2.5 right-2 h-8 w-8 rounded-full bg-tf-blue hover:bg-tf-blue-hover text-white"
          onClick={submit}
          disabled={!question.trim() || isPending || !roleId}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function DetailDrawerBody({ detail }: { detail: KpiDetail }) {
  const kpi = detail.kpi;
  const status = STATUS_STYLES[kpi.status];
  const seriesData = detail.series.map((p) => ({ ...p, target: kpi.target }));
  const [selectedSource, setSelectedSource] = useState<{ source: KpiSource; index: number } | null>(
    null,
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <DrawerHeader className="px-0 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <AxisPill name={kpi.axisName} color={kpi.axisColor} />
            <div className="flex items-center gap-2">
              <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full", status.bg, status.text)}>
                <span className={cn("w-2 h-2 rounded-full", status.dot)} />
                {status.label}
              </span>
              {kpi.historic && (
                <Badge className="bg-tf-warning text-white hover:bg-tf-warning uppercase text-[10px] tracking-eyebrow">historic</Badge>
              )}
            </div>
          </div>
          <DrawerTitle className="text-2xl font-bold text-tf-navy">{kpi.name}</DrawerTitle>
          <DrawerDescription className="text-sm mt-1">
            {kpi.objectiveName} • {kpi.market} • {kpi.brand}
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            <p className="text-sm text-foreground/80 leading-relaxed">{kpi.description}</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">Current</div>
                <div className="text-2xl font-bold text-tf-navy mt-1">{kpi.current}{kpi.unit}</div>
              </div>
              <div className="bg-muted rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">Target</div>
                <div className="text-2xl font-bold text-tf-navy mt-1">{kpi.target}{kpi.unit}</div>
              </div>
              <div className="bg-muted rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">Progress</div>
                <div className={cn("text-2xl font-bold mt-1", status.text)}>{kpi.progress}%</div>
              </div>
            </div>

            {kpi.conflict && (
              <div className="flex items-start gap-3 text-tf-warning bg-tf-warning-bg p-4 rounded-xl text-sm">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <span className="text-foreground">
                  Composing sources disagree on this metric. The headline uses the weighted blend; open the
                  sources below to see the divergence.
                </span>
              </div>
            )}

            <div>
              <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground mb-3">
                Trend vs target
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={seriesData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <RTooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="var(--muted-foreground)"
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      dot={false}
                      name="Target"
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={kpi.axisColor}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      name={kpi.name}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {detail.breakdowns.map((bd) => (
              <div key={bd.dimension}>
                <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground mb-3">
                  Breakdown by {bd.dimension}
                </h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bd.points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <RTooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }}
                        cursor={{ fill: "var(--muted)" }}
                      />
                      <Bar dataKey="value" fill={kpi.axisColor} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}

            <div
              className={cn(
                "rounded-xl p-4 flex items-start gap-3",
                kpi.forecast.deviationRisk ? "bg-tf-warning-bg" : "bg-tf-success-bg",
              )}
            >
              <Sparkles className={cn("w-5 h-5 mt-0.5 shrink-0", kpi.forecast.deviationRisk ? "text-tf-warning" : "text-tf-success")} />
              <div>
                <div className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
                  Forecast • {Math.round(kpi.forecast.confidence * 100)}% confidence
                </div>
                <p className="text-sm text-foreground mt-1 leading-relaxed">{kpi.forecast.note}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Composing sources ({kpi.sources.length})
                <span className="ml-auto font-medium normal-case tracking-normal text-muted-foreground">
                  Blend: {kpi.blend}
                </span>
              </h4>
              <div className="space-y-3">
                {kpi.sources.map((s, i) => (
                  <SourceRow
                    key={s.id}
                    source={s}
                    index={i}
                    onOpen={() => setSelectedSource({ source: s, index: i })}
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="lg:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-border lg:pl-6 pt-4 lg:pt-0 flex flex-col min-h-[360px]">
        <KpiChat kpiIds={[kpi.id]} />
      </div>

      <SourceDetailDialog
        source={selectedSource?.source ?? null}
        index={selectedSource?.index ?? 0}
        open={!!selectedSource}
        onOpenChange={(open) => !open && setSelectedSource(null)}
      />
    </div>
  );
}

export default function KpisPage() {
  const { area, roleId } = useApp();
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<PeriodType>("quarter");
  const [axisId, setAxisId] = useState("__all__");
  const [market, setMarket] = useState("__all__");
  const [brand, setBrand] = useState("__all__");
  const [source, setSource] = useState("__all__");
  const [initiativeType, setInitiativeType] = useState("__all__");
  const [openId, setOpenId] = useState<string | null>(null);

  const { mutate: runQuery, data: queryData, isPending } = useQueryKpis();

  const val = (v: string) => (v === "__all__" ? null : v);

  React.useEffect(() => {
    if (!roleId) return;
    runQuery({
      data: {
        area,
        roleId,
        period,
        axisId: val(axisId),
        market: val(market),
        brand: val(brand),
        source: val(source),
        initiativeType: val(initiativeType),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, roleId, period, axisId, market, brand, source, initiativeType]);

  const {
    mutate: fetchDetail,
    data: detail,
    isPending: detailLoading,
    reset: resetDetail,
  } = useGetKpiDetail();

  React.useEffect(() => {
    if (!openId || !roleId) return;
    resetDetail();
    fetchDetail({ data: { id: openId, area, roleId, period } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, area, roleId, period]);

  const kpis = queryData?.kpis ?? [];
  const facets = queryData?.facets;
  const visibleKpiIds = useMemo(() => kpis.map((k) => k.id), [kpis]);

  const summary = useMemo(() => {
    const total = kpis.length;
    const onTrack = kpis.filter((k) => k.status === "on-track").length;
    const atRisk = kpis.filter((k) => k.status === "amber").length;
    const offTrack = kpis.filter((k) => k.status === "off-track").length;
    return { total, onTrack, atRisk, offTrack };
  }, [kpis]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-title-lg text-tf-navy flex items-center gap-3">
            <Target className="w-7 h-7 text-tf-blue" /> KPIs & Objectives
          </h1>
          <p className="text-muted-foreground text-lg">
            Governed objective tracking for {area}. Every figure is a cited blend of governed sources,
            scoped to your clearance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-full border-border bg-card font-semibold gap-2"
            onClick={() => navigate("/generate")}
            disabled={kpis.length === 0}
            title={
              kpis.length === 0
                ? "No KPIs in scope to report on"
                : "Draft a cited KPI report in Generate"
            }
          >
            <FileText className="w-4 h-4" /> Generate KPI report
          </Button>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="h-10 w-[150px] rounded-full border-border bg-card font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Tracked", value: summary.total, tone: "text-tf-navy", bg: "bg-card" },
            { label: "On track", value: summary.onTrack, tone: "text-tf-success", bg: "bg-tf-success-bg" },
            { label: "At risk", value: summary.atRisk, tone: "text-tf-warning", bg: "bg-tf-warning-bg" },
            { label: "Off track", value: summary.offTrack, tone: "text-tf-error", bg: "bg-tf-error-bg" },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-2xl border border-border p-5", s.bg)}>
              <div className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
                {s.label}
              </div>
              <div className={cn("text-3xl font-bold mt-1", s.tone)}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {facets && (
        <div className="flex items-center gap-2 flex-wrap bg-muted/40 border border-border rounded-2xl p-3">
          <FilterSelect
            label="Axis"
            allLabel="All axes"
            value={axisId}
            onChange={setAxisId}
            options={facets.axes.map((a) => ({ value: a.id, label: a.name }))}
          />
          <FilterSelect
            label="Market"
            allLabel="All markets"
            value={market}
            onChange={setMarket}
            options={facets.markets.map((m) => ({ value: m, label: m }))}
          />
          <FilterSelect
            label="Brand"
            allLabel="All brands"
            value={brand}
            onChange={setBrand}
            options={facets.brands.map((b) => ({ value: b, label: b }))}
          />
          <FilterSelect
            label="Source"
            allLabel="All sources"
            value={source}
            onChange={setSource}
            options={facets.sources.map((s) => ({ value: s, label: s }))}
          />
          <FilterSelect
            label="Initiative"
            allLabel="All initiatives"
            value={initiativeType}
            onChange={setInitiativeType}
            options={facets.initiativeTypes.map((t) => ({ value: t, label: t }))}
          />
        </div>
      )}

      {isPending && kpis.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {!isPending && kpis.length === 0 && (
        <div className="border border-dashed border-border rounded-2xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Target className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-tf-navy">No objectives in scope</h3>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            There are no governed KPIs for this persona and filter combination. Clear a filter, switch
            reporting period, or change persona to see tracked objectives.
          </p>
        </div>
      )}

      {kpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <KpiCardTile key={kpi.id} kpi={kpi} onOpen={() => setOpenId(kpi.id)} />
          ))}
        </div>
      )}

      {kpis.length > 0 && (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-tf-blue-tint flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-tf-blue" />
            </div>
            <div>
              <h3 className="font-bold text-tf-navy leading-snug">Ask about these KPIs</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Answered only from the governed evidence behind the {kpis.length}{" "}
                {kpis.length === 1 ? "objective" : "objectives"} in view, scoped to your clearance.
              </p>
            </div>
          </div>
          <div className="p-5 h-[320px]">
            <KpiChat
              key={visibleKpiIds.join(",")}
              kpiIds={visibleKpiIds}
              heading="Ask about the objectives in view"
              intro="Ask across every KPI currently on screen — what is on track, what is slipping, and why — answered only from the governed evidence behind them, with citations."
              placeholder="Which objectives are off track, and why?"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
        <ArrowRight className="w-3.5 h-3.5" />
        Open any KPI to see its trend, breakdowns, composing sources and a scoped, cited chat.
      </div>

      <Drawer open={!!openId} onOpenChange={(open) => !open && setOpenId(null)}>
        <DrawerContent className="max-h-[92vh]">
          <div className="mx-auto w-full max-w-5xl px-6 pb-8 pt-4 flex flex-col h-[85vh] overflow-hidden">
            {detailLoading && (
              <div className="py-20 flex justify-center items-center flex-1">
                <div className="w-8 h-8 rounded-full border-2 border-tf-blue border-t-transparent animate-spin" />
              </div>
            )}
            {!detailLoading && detail && <DetailDrawerBody detail={detail} />}
            {!detailLoading && !detail && openId && (
              <div className="py-20 flex flex-col items-center justify-center flex-1 text-tf-error">
                <ShieldAlert className="w-12 h-12 mb-4" />
                <h3 className="font-bold text-xl text-tf-navy">This KPI is restricted</h3>
                <p className="text-muted-foreground mt-2 text-center max-w-sm">
                  Your current persona is not cleared to open this objective or its evidence.
                </p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
