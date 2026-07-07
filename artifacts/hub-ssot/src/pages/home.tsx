import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  useGetHomeSummary,
  useListRadar,
  useGetCorpusStats,
  useListAxes,
  useListRoles,
  useListSuggestions,
  HomeCardStat,
  RadarItem,
  SuggestedQuery,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Send,
  Sparkles,
  LineChart,
  Calendar,
  MessageSquare,
  Radar,
  Radio,
  BookMarked,
  ClipboardCheck,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Languages,
  FileCheck2,
  Clock,
} from "lucide-react";

type AppKey = "generate" | "kpis" | "planning" | "ask";

const CARD_META: Record<
  AppKey,
  { title: string; path: string; icon: React.ComponentType<{ className?: string }>; blurb: string }
> = {
  generate: {
    title: "Generate",
    path: "/generate",
    icon: Sparkles,
    blurb: "Draft governed communications with cited evidence.",
  },
  kpis: {
    title: "KPIs",
    path: "/kpis",
    icon: LineChart,
    blurb: "Track the metrics that back every corporate claim.",
  },
  planning: {
    title: "Planning",
    path: "/planning",
    icon: Calendar,
    blurb: "See what is scheduled and where plans collide.",
  },
  ask: {
    title: "Ask",
    path: "/ask",
    icon: MessageSquare,
    blurb: "Question the corpus and get cited, honest answers.",
  },
};

const RADAR_KIND_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  external_signal: { label: "External signal", icon: Radio },
  knowledge_event: { label: "Knowledge event", icon: BookMarked },
  your_queue: { label: "Your queue", icon: ClipboardCheck },
};

// Language-aware front-door copy. The corpus is multilingual (ES/EN/DE/PT), so
// the hero adapts to the reader's browser language and falls back to English.
type Lang = "es" | "en" | "de" | "pt";

const COPY: Record<Lang, { placeholder: string; honesty: string; subtitle: string }> = {
  es: {
    placeholder: "Pregunta lo que quieras sobre Telefónica…",
    honesty: "Las respuestas citan su fuente. Si no hay evidencia, lo diré.",
    subtitle:
      "Haz una pregunta y obtén una respuesta respaldada por evidencia citada y gobernada — o una respuesta honesta de sin-evidencia, permiso o fuente histórica.",
  },
  en: {
    placeholder: "Ask anything about Telefónica…",
    honesty: "Answers cite their source. If there's no evidence, I'll say so.",
    subtitle:
      "Ask a question and get an answer backed by cited, governed evidence — or an honest no-evidence, permission, or historic-source response.",
  },
  de: {
    placeholder: "Frag alles über Telefónica…",
    honesty: "Antworten nennen ihre Quelle. Ohne Beleg sage ich es ehrlich.",
    subtitle:
      "Stelle eine Frage und erhalte eine Antwort mit zitierten, geprüften Belegen — oder eine ehrliche Antwort ohne Beleg, mit Berechtigungshinweis oder historischer Quelle.",
  },
  pt: {
    placeholder: "Pergunte qualquer coisa sobre a Telefónica…",
    honesty: "As respostas citam a fonte. Se não houver evidência, eu direi.",
    subtitle:
      "Faça uma pergunta e receba uma resposta apoiada por evidência citada e governada — ou uma resposta honesta de sem-evidência, permissão ou fonte histórica.",
  },
};

function detectLang(): Lang {
  const raw =
    typeof navigator !== "undefined" && navigator.language
      ? navigator.language.slice(0, 2).toLowerCase()
      : "en";
  return raw === "es" || raw === "de" || raw === "pt" ? (raw as Lang) : "en";
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function HeroAskBar({
  lang,
  suggestions,
}: {
  lang: Lang;
  suggestions: SuggestedQuery[];
}) {
  const { roleId } = useApp();
  const [, navigate] = useLocation();
  const [text, setText] = useState("");
  const [rotation, setRotation] = useState(0);

  // Rotate real example prompts drawn from the governed suggestions endpoint.
  // Only cited/answerable prompts are used as invitations; rotation pauses once
  // the user starts typing so it never fights their input.
  const prompts = useMemo(
    () => suggestions.filter((s) => s.kind === "cited").map((s) => s.text),
    [suggestions],
  );

  useEffect(() => {
    if (prompts.length < 2 || text) return;
    const id = window.setInterval(() => {
      setRotation((r) => (r + 1) % prompts.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [prompts.length, text]);

  const rotatingPrompt = prompts.length > 0 ? prompts[rotation % prompts.length] : "";
  const placeholder = rotatingPrompt || COPY[lang].placeholder;

  const submit = (value?: string) => {
    const q = (value ?? text).trim();
    if (!q) return;
    navigate(`/ask?q=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Enter on an empty bar accepts the currently shown example prompt.
      submit(text.trim() ? text : rotatingPrompt);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          key={placeholder}
          placeholder={placeholder}
          className="min-h-[68px] max-h-[220px] rounded-2xl resize-none pr-16 pt-5 pb-5 pl-6 shadow-sm border-border focus-visible:ring-tf-blue text-lg transition-[color] placeholder:transition-opacity"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button
          size="icon"
          className="absolute bottom-4 right-3 h-11 w-11 rounded-full bg-tf-blue hover:bg-tf-blue-hover text-white shadow-md transition-all"
          onClick={() => submit(text.trim() ? text : rotatingPrompt)}
          disabled={(!text.trim() && !rotatingPrompt) || !roleId}
          aria-label="Ask"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5 text-tf-blue" />
        <span>{COPY[lang].honesty}</span>
      </p>
    </div>
  );
}

function AppCard({
  stat,
  loading,
  axisColor,
}: {
  stat?: HomeCardStat;
  loading: boolean;
  axisColor?: string;
}) {
  const [, navigate] = useLocation();
  const key = (stat?.app ?? "ask") as AppKey;
  const meta = CARD_META[key] ?? CARD_META.ask;
  const Icon = meta.icon;
  const warning = stat?.tone === "warning";

  return (
    <button
      onClick={() => navigate(meta.path)}
      className={cn(
        "group text-left bg-card border rounded-xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full",
        warning ? "border-tf-warning/40" : "border-border hover:border-tf-blue/30",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "w-11 h-11 rounded-lg flex items-center justify-center",
            warning ? "bg-tf-warning-bg text-tf-warning" : "bg-tf-blue-tint text-tf-blue",
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <ArrowUpRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="mt-6">
        <div className="text-title-sm font-bold text-tf-navy tracking-tight">{meta.title}</div>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{meta.blurb}</p>
      </div>

      <div className="mt-5 flex items-baseline space-x-2">
        {loading || !stat ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <>
            <span
              className="text-display-sm font-bold tracking-tight"
              style={{ color: warning ? "var(--tf-warning)" : axisColor || "var(--tf-navy)" }}
            >
              {stat.value}
            </span>
            <span className="text-sm text-muted-foreground font-medium">{stat.caption}</span>
          </>
        )}
      </div>
    </button>
  );
}

function RadarRow({ item, axisColor }: { item: RadarItem; axisColor?: string }) {
  const [, navigate] = useLocation();
  const meta = RADAR_KIND_META[item.kind] ?? RADAR_KIND_META.knowledge_event;
  const Icon = meta.icon;
  const warning = item.tone === "warning";

  return (
    <button
      onClick={() => navigate(item.href)}
      className="w-full text-left flex items-start space-x-4 p-4 rounded-xl hover:bg-muted/60 transition-colors group"
    >
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
          warning ? "bg-tf-warning-bg text-tf-warning" : "bg-tf-blue-tint text-tf-blue",
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
            {meta.label}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-[10px] uppercase tracking-eyebrow text-muted-foreground flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {relativeTime(item.timestamp)}
          </span>
        </div>
        <div className="font-semibold text-sm text-foreground leading-snug group-hover:text-tf-blue transition-colors">
          {item.title}
        </div>
        {item.detail && (
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">{item.detail}</p>
        )}
        {item.evidenceDocTitle && (
          <div className="mt-2 inline-flex items-center space-x-1.5 text-xs font-medium text-tf-blue bg-tf-blue-tint px-2.5 py-1 rounded-full">
            <FileCheck2 className="w-3 h-3" />
            <span className="truncate max-w-[240px]">{item.evidenceDocTitle}</span>
          </div>
        )}
      </div>
      {axisColor && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
          style={{ backgroundColor: axisColor }}
          aria-hidden
        />
      )}
    </button>
  );
}

function HealthStat({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-eyebrow text-tf-grey-200 font-bold">{label}</div>
        {loading ? (
          <Skeleton className="h-5 w-24 mt-1 bg-white/20" />
        ) : (
          <div className="text-white font-bold text-base tracking-tight truncate">{value}</div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { roleId, area } = useApp();
  const [, navigate] = useLocation();
  const params = useMemo(
    () => (roleId ? { roleId, area } : undefined),
    [roleId, area],
  );

  const { data: summary, isLoading: summaryLoading } = useGetHomeSummary(params);
  const { data: radar, isLoading: radarLoading } = useListRadar(params);
  const { data: stats, isLoading: statsLoading } = useGetCorpusStats(
    roleId ? { roleId } : undefined,
  );
  const { data: axes } = useListAxes();
  const { data: roles } = useListRoles();
  const { data: suggestions } = useListSuggestions();

  const lang = useMemo(detectLang, []);

  const activeRole = roles?.find((r) => r.id === roleId);
  const clearance = activeRole?.clearance ?? "public";
  const roleArea = activeRole?.area;
  const leadership = clearance === "confidential" || clearance === "restricted";

  const axisColor = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of axes ?? []) map.set(a.id, a.color);
    return (id?: string | null) => (id ? map.get(id) : undefined);
  }, [axes]);

  // Persona re-weighting by *role*, not clearance alone:
  //  - Marca (brand) personas lead with Generate — brand activity is their day job.
  //  - Comunicación validators/analysts lead with their queue (Planning, KPIs).
  //  - Gabinete / leadership lead with the radar-adjacent apps (KPIs, Planning).
  // Ask is always first: it is the front door's primary action for everyone.
  const cardOrder = useMemo<AppKey[]>(() => {
    if (roleArea === "Marca") return ["ask", "generate", "kpis", "planning"];
    if (leadership) return ["ask", "kpis", "planning", "generate"];
    if (clearance === "internal") return ["ask", "planning", "kpis", "generate"];
    return ["ask", "kpis", "generate", "planning"];
  }, [roleArea, leadership, clearance]);

  // Radar is capped at five on the front door. Ordering follows the persona:
  //  - Brand personas surface knowledge events (brand/campaign activity) first.
  //  - Internal validators surface their own queue first.
  //  - Leadership surfaces external signals first.
  const radarItems = useMemo<RadarItem[]>(() => {
    const items = radar ?? [];
    const weight = (r: RadarItem) => {
      if (roleArea === "Marca")
        return r.kind === "knowledge_event" ? 0 : r.kind === "your_queue" ? 1 : 2;
      if (leadership)
        return r.kind === "external_signal" ? 0 : r.kind === "your_queue" ? 1 : 2;
      if (clearance === "internal") return r.kind === "your_queue" ? 0 : 1;
      return 0;
    };
    return [...items].sort((a, b) => weight(a) - weight(b)).slice(0, 5);
  }, [radar, roleArea, leadership, clearance]);

  const summaryLoad = summaryLoading;
  const radarLoad = radarLoading;
  const statsLoad = statsLoading;

  // First-run / empty-corpus state: when the governed corpus has no documents
  // there is nothing to cite, so we invite the persona to connect a source
  // rather than render zero-value metrics that read like a broken dashboard.
  const corpusEmpty = !statsLoad && (stats?.totalDocuments ?? 0) === 0;

  const lastUpdated = stats?.lastUpdated ? relativeTime(stats.lastUpdated) : "—";
  const languages = (stats?.byLanguage ?? [])
    .map((l) => l.key.toUpperCase())
    .join(" · ");

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-12">
      {/* Front door */}
      <section className="text-center space-y-6 pt-6">
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-eyebrow font-bold text-tf-blue">
            Single source of truth
          </div>
          <h1 className="text-display-md text-tf-navy tracking-tight">
            {activeRole ? `Welcome, ${activeRole.label}` : "Welcome to Hub SSoT"}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            {COPY[lang].subtitle}
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <HeroAskBar lang={lang} suggestions={suggestions ?? []} />
        </div>
      </section>

      {corpusEmpty ? (
        <section>
          <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center max-w-2xl mx-auto">
            <div className="w-14 h-14 rounded-full bg-tf-blue-tint text-tf-blue flex items-center justify-center mx-auto mb-5">
              <BookMarked className="w-7 h-7" />
            </div>
            <h2 className="text-title-md font-bold text-tf-navy tracking-tight">
              No governed sources yet
            </h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
              Hub SSoT answers only from a governed knowledge core. Connect your first document to
              start getting cited, permission-aware answers.
            </p>
            <Button
              className="mt-6 bg-tf-blue hover:bg-tf-blue-hover text-white"
              onClick={() => navigate("/data")}
            >
              Connect the first document
              <ArrowUpRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </section>
      ) : (
      <>
      {/* App cards */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {cardOrder.map((key) => {
            const stat = summary?.[key];
            return (
              <AppCard
                key={key}
                stat={stat}
                loading={summaryLoad}
                axisColor={axisColor(stat?.axisId)}
              />
            );
          })}
        </div>
      </section>

      {/* Radar + health */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Radar className="w-5 h-5 text-tf-blue" />
              <h2 className="text-title-sm font-bold text-tf-navy tracking-tight">Radar</h2>
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-eyebrow font-bold">
              What changed for you
            </span>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-xs divide-y divide-border/60 overflow-hidden">
            {radarLoad ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-4 p-4">
                  <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : radarItems.length > 0 ? (
              radarItems.map((item) => (
                <RadarRow key={item.id} item={item} axisColor={axisColor(item.axisId)} />
              ))
            ) : (
              <div className="p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-tf-blue-tint text-tf-blue flex items-center justify-center mx-auto mb-4">
                  <Radar className="w-6 h-6" />
                </div>
                <p className="text-foreground font-semibold">Your radar is calm</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Nothing needs your attention right now. Ask a question to explore the governed
                  corpus.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Knowledge health */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-tf-blue" />
            <h2 className="text-title-sm font-bold text-tf-navy tracking-tight">Knowledge health</h2>
          </div>

          <div className="bg-tf-navy rounded-xl p-6 shadow-sm space-y-5">
            <HealthStat
              icon={FileCheck2}
              label="Sources you can cite"
              value={`${stats?.totalDocuments ?? 0} documents`}
              loading={statsLoad}
            />
            <div className="h-px bg-white/10" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-eyebrow text-tf-grey-200 font-bold">
                  Validated
                </span>
                {!statsLoad && (
                  <span className="text-white font-bold text-sm">{stats?.validatedPercent ?? 0}%</span>
                )}
              </div>
              {statsLoad ? (
                <Skeleton className="h-2 w-full bg-white/20" />
              ) : (
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-tf-success transition-all"
                    style={{ width: `${stats?.validatedPercent ?? 0}%` }}
                  />
                </div>
              )}
            </div>
            <div className="h-px bg-white/10" />
            <HealthStat
              icon={Languages}
              label="Languages"
              value={languages || "—"}
              loading={statsLoad}
            />
            <div className="h-px bg-white/10" />
            <HealthStat
              icon={Clock}
              label="Last updated"
              value={lastUpdated}
              loading={statsLoad}
            />
            {!statsLoad && (stats?.quarantined ?? 0) > 0 && (
              <>
                <div className="h-px bg-white/10" />
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-tf-warning/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-tf-warning" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-eyebrow text-tf-grey-200 font-bold">
                      Quarantined
                    </div>
                    <div className="text-white font-bold text-base tracking-tight">
                      {stats?.quarantined} held from answers
                    </div>
                  </div>
                </div>
              </>
            )}
            <button
              onClick={() => navigate("/data")}
              className="w-full mt-2 text-sm font-semibold text-white/90 hover:text-white flex items-center justify-center space-x-1.5 pt-1 transition-colors"
            >
              <span>Browse the governed corpus</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
      </>
      )}
    </div>
  );
}
