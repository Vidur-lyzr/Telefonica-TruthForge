import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  useAsk,
  useListSuggestions,
  useListAxes,
  useListDocuments,
  AskResult,
  AskFilters,
  AskTurn,
  SuggestedQuery,
  Citation,
} from "@workspace/api-client-react";
import { useApp, type Lang } from "@/components/app-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  AlertCircle,
  ShieldAlert,
  Clock,
  Search,
  FileText,
  CheckCircle2,
  GitCompareArrows,
  Filter,
  Plus,
  Paperclip,
  X,
  BookmarkPlus,
  Bookmark,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowRight,
  Globe,
  Check,
  History,
  ShieldCheck,
  Database,
  Network,
  Gauge,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LANGS: Lang[] = ["ES", "EN", "DE", "PT"];
// Bumped schema version: conversations are now persona-scoped sessions, not a
// single flat thread. Older `hub-ssot-thread` state is intentionally ignored.
const CONVOS_KEY = "hub-ssot-conversations-v2";
const INSIGHTS_KEY = "hub-ssot-insights";
const GENERATE_DRAFT_KEY = "hub-generate-draft";
const MAX_CONVERSATIONS = 30;

interface Turn {
  id: string;
  // The persona the turn was asked under. History sent to the model is filtered
  // by the current persona so a lower-clearance persona can never inherit a
  // higher-clearance persona's answers as governed memory.
  roleId: string;
  question: string;
  filters: AskFilters | null;
  attachmentName?: string | null;
  result: AskResult | null;
  pending: boolean;
  error?: boolean;
}

interface Conversation {
  id: string;
  roleId: string;
  turns: Turn[];
  createdAt: number;
  updatedAt: number;
}

interface SavedInsight {
  id: string;
  question: string;
  answer: string;
  ts: number;
}

const EMPTY_FILTERS: AskFilters = {
  market: null,
  brand: null,
  period: null,
  source: null,
  axis: null,
};

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed)) return [];
    // Defensive: drop anything that doesn't look like a persona-scoped session so
    // a legacy/corrupt entry can't crash the page or leak an unscoped turn.
    return parsed.filter(
      (c) => c && typeof c.id === "string" && typeof c.roleId === "string" && Array.isArray(c.turns),
    );
  } catch {
    return [];
  }
}

function loadInsights(): SavedInsight[] {
  try {
    const raw = localStorage.getItem(INSIGHTS_KEY);
    return raw ? (JSON.parse(raw) as SavedInsight[]) : [];
  } catch {
    return [];
  }
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

function hasActiveFilters(f: AskFilters | null): boolean {
  if (!f) return false;
  return Boolean(f.market || f.brand || f.period || f.source || f.axis);
}

export default function Ask() {
  const { area, roleId, lang, setLang } = useApp();
  const [, navigate] = useLocation();

  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadConversations(),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [filters, setFilters] = useState<AskFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [attachment, setAttachment] = useState<{
    name: string;
    content: string;
    ingest: boolean;
  } | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(
    null,
  );
  const [insights, setInsights] = useState<SavedInsight[]>(() => loadInsights());

  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoRanRef = useRef<string | null>(null);

  const search = useSearch();

  const { data: suggestions } = useListSuggestions();
  const { data: axes } = useListAxes();
  const { data: documents } = useListDocuments();
  const { mutateAsync: askQuery, isPending } = useAsk();

  // Conversations for the current persona, most-recent first. Switching persona
  // switches which conversations are visible and resumable.
  const personaConversations = useMemo(
    () =>
      conversations
        .filter((c) => c.roleId === roleId)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations, roleId],
  );

  const activeConvo =
    conversations.find((c) => c.id === activeId && c.roleId === roleId) ?? null;
  const thread = activeConvo?.turns ?? [];

  // On persona switch, surface that persona's most recent conversation (or a
  // clean slate). A conversation from another persona must never stay active, so
  // a lower-clearance persona can never see or resume a higher-clearance thread.
  useEffect(() => {
    setActiveId((current) => {
      const cur = conversations.find((c) => c.id === current);
      if (cur && cur.roleId === roleId) return current;
      const latest = conversations
        .filter((c) => c.roleId === roleId)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];
      return latest ? latest.id : null;
    });
  }, [roleId, conversations]);

  // Persist conversations and saved insights so a demo survives a refresh (no DB).
  useEffect(() => {
    try {
      localStorage.setItem(CONVOS_KEY, JSON.stringify(conversations));
    } catch {
      /* storage full — non-fatal for a demo */
    }
  }, [conversations]);
  useEffect(() => {
    try {
      localStorage.setItem(INSIGHTS_KEY, JSON.stringify(insights));
    } catch {
      /* non-fatal */
    }
  }, [insights]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread, isPending]);

  const filterOptions = useMemo(() => {
    const uniq = (vals: (string | undefined)[] | undefined) =>
      Array.from(
        new Set((vals ?? []).filter((v): v is string => Boolean(v))),
      ).sort();
    return {
      market: uniq(documents?.map((d) => d.country)),
      brand: uniq(documents?.map((d) => d.brand)),
      period: uniq(documents?.map((d) => d.quarter)),
      source: uniq(documents?.map((d) => d.type)),
    };
  }, [documents]);

  // Governed memory: only turns asked under the CURRENT persona are ever sent as
  // history. Even though a conversation is persona-scoped, we re-filter here as a
  // hard guard so memory can never grant access a fresh query wouldn't.
  const buildHistory = (): AskTurn[] => {
    const turns: AskTurn[] = [];
    for (const t of thread) {
      if (t.roleId !== roleId) continue;
      if (!t.result || t.result.status !== "answered") continue;
      turns.push({ role: "user", content: t.question });
      turns.push({ role: "assistant", content: t.result.answer });
    }
    return turns;
  };

  const handleAsk = async (text: string) => {
    const q = text.trim();
    if (!q || !roleId || isPending) return;

    const activeFilters = hasActiveFilters(filters) ? { ...filters } : null;
    const history = buildHistory();
    const turnId = crypto.randomUUID();
    const attachmentPayload = attachment
      ? {
          name: attachment.name,
          content: attachment.content,
          ingest: attachment.ingest,
        }
      : null;

    const now = Date.now();
    const newTurn: Turn = {
      id: turnId,
      roleId,
      question: q,
      filters: activeFilters,
      attachmentName: attachment?.name ?? null,
      result: null,
      pending: true,
    };

    // Append to the active persona conversation, or start a new one for this
    // persona. convoId is resolved outside the state updater so it stays pure.
    const reuse = activeConvo && activeConvo.roleId === roleId;
    const convoId = reuse ? activeConvo.id : crypto.randomUUID();
    setConversations((prev) => {
      const next = reuse
        ? prev.map((c) =>
            c.id === convoId
              ? { ...c, turns: [...c.turns, newTurn], updatedAt: now }
              : c,
          )
        : [
            {
              id: convoId,
              roleId,
              turns: [newTurn],
              createdAt: now,
              updatedAt: now,
            },
            ...prev,
          ];
      return next.slice(0, MAX_CONVERSATIONS);
    });
    if (!reuse) setActiveId(convoId);
    setInput("");
    const sentAttachment = attachmentPayload;
    setAttachment(null);

    const patchTurn = (patch: Partial<Turn>) =>
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convoId
            ? {
                ...c,
                turns: c.turns.map((t) =>
                  t.id === turnId ? { ...t, ...patch } : t,
                ),
              }
            : c,
        ),
      );

    try {
      const result = await askQuery({
        data: {
          question: q,
          area,
          roleId,
          history,
          filters: activeFilters,
          attachment: sentAttachment,
        },
      });
      patchTurn({ result, pending: false });
    } catch {
      patchTurn({ pending: false, error: true });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk(input);
    }
  };

  // Home front door handoff: a `?q=` param (e.g. from the Home ask bar) is
  // auto-run once per distinct query, but only once a persona is selected so the
  // request is governed. Guarded by a ref so re-renders never re-fire it.
  useEffect(() => {
    if (!roleId) return;
    const q = new URLSearchParams(search).get("q")?.trim();
    if (!q || autoRanRef.current === q) return;
    autoRanRef.current = q;
    handleAsk(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleId]);

  const newConversation = () => {
    setActiveId(null);
    setInput("");
    setAttachment(null);
    setFilters(EMPTY_FILTERS);
  };

  const resumeConversation = (id: string) => {
    setActiveId(id);
    setInput("");
    setAttachment(null);
    setFilters(EMPTY_FILTERS);
  };

  const saveInsight = (turn: Turn) => {
    if (!turn.result) return;
    setInsights((prev) => {
      if (prev.some((i) => i.question === turn.question)) return prev;
      return [
        {
          id: turn.id,
          question: turn.question,
          answer: turn.result!.answer,
          ts: Date.now(),
        },
        ...prev,
      ];
    });
  };

  const exportToGenerate = (turn: Turn) => {
    if (!turn.result) return;
    try {
      localStorage.setItem(
        GENERATE_DRAFT_KEY,
        JSON.stringify({
          question: turn.question,
          answer: turn.result.answer,
          citations: turn.result.citations,
        }),
      );
    } catch {
      /* non-fatal */
    }
    navigate("/generate");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setAttachment({ name: file.name, content, ingest: false });
    if (fileRef.current) fileRef.current.value = "";
  };

  const isEmpty = thread.length === 0;

  return (
    <div className="flex flex-col h-full">
      <ConversationHeader
        area={area}
        lang={lang}
        setLang={setLang}
        showFilters={showFilters}
        toggleFilters={() => setShowFilters((s) => !s)}
        filtersActive={hasActiveFilters(filters)}
        onNew={newConversation}
        canReset={!isEmpty}
        insights={insights}
        conversations={personaConversations}
        activeId={activeId}
        onResume={resumeConversation}
      />

      {showFilters && (
        <FiltersBar
          filters={filters}
          setFilters={setFilters}
          options={filterOptions}
          axes={axes ?? []}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />
      )}

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div
            ref={scrollRef}
            className="max-w-4xl mx-auto px-6 py-8 h-full"
          >
            {isEmpty && !isPending && (
              <FirstRun
                suggestions={suggestions}
                onPick={(t) => handleAsk(t)}
              />
            )}

            <div className="space-y-10">
              {thread.map((turn) => (
                <TurnBlock
                  key={turn.id}
                  turn={turn}
                  axes={axes ?? []}
                  onOpenCitation={setSelectedCitation}
                  onAskFollowup={(t) => handleAsk(t)}
                  onSave={() => saveInsight(turn)}
                  saved={insights.some((i) => i.question === turn.question)}
                  onExport={() => exportToGenerate(turn)}
                  onDrillIn={() => navigate("/data")}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      <Composer
        input={input}
        setInput={setInput}
        onSend={() => handleAsk(input)}
        onKeyDown={handleKeyDown}
        disabled={!roleId || isPending}
        attachment={attachment}
        onAttach={() => fileRef.current?.click()}
        onRemoveAttachment={() => setAttachment(null)}
        onToggleIngest={() =>
          setAttachment((a) => (a ? { ...a, ingest: !a.ingest } : a))
        }
        filtersActive={hasActiveFilters(filters)}
        fileRef={fileRef}
        onFile={onFile}
      />

      <CitationDrawer
        citation={selectedCitation}
        axes={axes ?? []}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- Header */

function ConversationHeader({
  area,
  lang,
  setLang,
  showFilters,
  toggleFilters,
  filtersActive,
  onNew,
  canReset,
  insights,
  conversations,
  activeId,
  onResume,
}: {
  area: string;
  lang: Lang;
  setLang: (l: Lang) => void;
  showFilters: boolean;
  toggleFilters: () => void;
  filtersActive: boolean;
  onNew: () => void;
  canReset: boolean;
  insights: SavedInsight[];
  conversations: Conversation[];
  activeId: string | null;
  onResume: (id: string) => void;
}) {
  return (
    <div className="border-b border-border bg-white px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-tf-blue-tint text-tf-blue flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-tf-navy leading-tight">
            Governed Assistant
          </div>
          <div className="text-xs text-muted-foreground">
            Scope: <span className="font-semibold text-foreground">{area}</span>{" "}
            · answers are cited, permission-aware and honest
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="hidden sm:flex items-center rounded-pill bg-muted/60 p-0.5">
          <Globe className="w-3.5 h-3.5 text-muted-foreground ml-2 mr-1" />
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cn(
                "px-2.5 py-1 rounded-pill text-xs font-bold transition-colors",
                lang === l
                  ? "bg-tf-blue text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>

        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={toggleFilters}
          className={cn(
            "rounded-pill h-8 font-semibold",
            showFilters && "bg-tf-blue hover:bg-tf-blue-hover text-white",
          )}
        >
          <Filter className="w-4 h-4 mr-1.5" />
          Filters
          {filtersActive && (
            <span className="ml-1.5 w-2 h-2 rounded-full bg-tf-success" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-pill h-8 font-semibold"
            >
              <History className="w-4 h-4 mr-1.5" />
              History
              <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl">
            <DropdownMenuItem
              onClick={onNew}
              disabled={!canReset}
              className="rounded-lg font-medium cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              New conversation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs uppercase tracking-eyebrow text-muted-foreground">
              Conversations ({conversations.length})
            </DropdownMenuLabel>
            {conversations.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                No prior conversations for this persona yet.
              </div>
            )}
            {conversations.slice(0, 8).map((c) => {
              const first = c.turns[0]?.question ?? "New conversation";
              return (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => onResume(c.id)}
                  className={cn(
                    "rounded-lg cursor-pointer flex items-start space-x-2 py-2",
                    c.id === activeId && "bg-tf-blue-tint",
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-tf-blue flex-shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-foreground line-clamp-1 leading-snug">
                      {first}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {c.turns.length} turn{c.turns.length === 1 ? "" : "s"} ·{" "}
                      {formatRelativeTime(c.updatedAt)}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs uppercase tracking-eyebrow text-muted-foreground">
              Saved insights ({insights.length})
            </DropdownMenuLabel>
            {insights.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                Save an answer to pin it here.
              </div>
            )}
            {insights.slice(0, 6).map((i) => (
              <div
                key={i.id}
                className="px-2 py-2 text-sm text-foreground flex items-start space-x-2"
              >
                <Bookmark className="w-3.5 h-3.5 mt-0.5 text-tf-blue flex-shrink-0" />
                <span className="line-clamp-2 leading-snug">{i.question}</span>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Filters */

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string | null) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "rounded-pill h-8 font-medium",
            value && "border-tf-blue text-tf-blue bg-tf-blue-tint",
          )}
        >
          <span className="text-muted-foreground mr-1.5 text-xs uppercase tracking-eyebrow">
            {label}
          </span>
          {value ?? "All"}
          <ChevronDown className="w-3.5 h-3.5 ml-1.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="rounded-xl max-h-72 overflow-y-auto">
        <DropdownMenuItem
          onClick={() => onChange(null)}
          className="rounded-lg cursor-pointer"
        >
          <span className="flex-1">All</span>
          {!value && <Check className="w-4 h-4 text-tf-blue" />}
        </DropdownMenuItem>
        {options.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onClick={() => onChange(o.value)}
            className="rounded-lg cursor-pointer"
          >
            <span className="flex-1">{o.label}</span>
            {value === o.value && <Check className="w-4 h-4 text-tf-blue" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FiltersBar({
  filters,
  setFilters,
  options,
  axes,
  onClear,
}: {
  filters: AskFilters;
  setFilters: (f: AskFilters) => void;
  options: { market: string[]; brand: string[]; period: string[]; source: string[] };
  axes: { id: string; name: string }[];
  onClear: () => void;
}) {
  const set = (k: keyof AskFilters, v: string | null) =>
    setFilters({ ...filters, [k]: v });
  const opt = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));
  return (
    <div className="border-b border-border bg-muted/30 px-6 py-3 flex flex-wrap items-center gap-2 flex-shrink-0">
      <span className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground mr-1">
        Retrieval scope
      </span>
      <FilterSelect
        label="Market"
        value={filters.market}
        options={opt(options.market)}
        onChange={(v) => set("market", v)}
      />
      <FilterSelect
        label="Brand"
        value={filters.brand}
        options={opt(options.brand)}
        onChange={(v) => set("brand", v)}
      />
      <FilterSelect
        label="Period"
        value={filters.period}
        options={opt(options.period)}
        onChange={(v) => set("period", v)}
      />
      <FilterSelect
        label="Source"
        value={filters.source}
        options={opt(options.source)}
        onChange={(v) => set("source", v)}
      />
      <FilterSelect
        label="Axis"
        value={
          axes.find((a) => a.id === filters.axis)?.name ?? filters.axis ?? null
        }
        options={axes.map((a) => ({ value: a.id, label: a.name }))}
        onChange={(v) => set("axis", v)}
      />
      {hasActiveFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="rounded-pill h-8 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- First run */

function FirstRun({
  suggestions,
  onPick,
}: {
  suggestions?: SuggestedQuery[];
  onPick: (t: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-8 py-10 animate-in fade-in duration-500">
      <div className="space-y-3 max-w-xl">
        <h1 className="text-display-sm text-tf-navy">
          Ask the governed source of truth
        </h1>
        <p className="text-muted-foreground text-lg">
          Every answer is backed by cited evidence — or an honest no-evidence,
          permission-blocked, conflict or historic response. Nothing is
          fabricated.
        </p>
      </div>
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions?.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.text)}
            className="text-left p-4 rounded-xl border bg-card hover:border-tf-blue hover:shadow-md transition-all text-sm group"
          >
            <Badge
              variant="secondary"
              className="uppercase text-[10px] tracking-eyebrow bg-tf-blue-tint text-tf-blue mb-2"
            >
              {s.kind.replace("_", " ")}
            </Badge>
            <span className="line-clamp-2 font-medium leading-relaxed block">
              {s.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Turn */

function TurnBlock({
  turn,
  axes,
  onOpenCitation,
  onAskFollowup,
  onSave,
  saved,
  onExport,
  onDrillIn,
}: {
  turn: Turn;
  axes: { id: string; name: string; color: string }[];
  onOpenCitation: (c: Citation) => void;
  onAskFollowup: (t: string) => void;
  onSave: () => void;
  saved: boolean;
  onExport: () => void;
  onDrillIn: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <div className="bg-tf-navy text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[85%] font-medium shadow-sm">
          {turn.question}
          {(turn.filters || turn.attachmentName) && (
            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-white/15">
              {turn.filters &&
                Object.entries(turn.filters)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <span
                      key={k}
                      className="text-[10px] uppercase tracking-eyebrow bg-white/15 px-2 py-0.5 rounded-full"
                    >
                      {k}: {v}
                    </span>
                  ))}
              {turn.attachmentName && (
                <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full flex items-center">
                  <Paperclip className="w-3 h-3 mr-1" />
                  {turn.attachmentName}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {turn.pending && <Thinking />}

      {turn.error && (
        <div className="flex items-start space-x-3 text-tf-error bg-tf-error-bg p-4 rounded-xl">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-foreground">
            The Hub could not complete this request. Please try again.
          </p>
        </div>
      )}

      {turn.result && (
        <AnswerCard
          result={turn.result}
          axes={axes}
          onOpenCitation={onOpenCitation}
          onAskFollowup={onAskFollowup}
          onSave={onSave}
          saved={saved}
          onExport={onExport}
          onDrillIn={onDrillIn}
        />
      )}
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center space-x-3 text-tf-blue animate-in fade-in duration-300">
      <div className="w-9 h-9 rounded-full bg-tf-blue-tint flex items-center justify-center">
        <Search className="w-4 h-4 animate-spin-slow" />
      </div>
      <span className="font-semibold text-tf-navy">
        Retrieving governed evidence…
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- Answer */

function renderAnswer(
  text: string,
  citations: Citation[],
  onOpenCitation: (c: Citation) => void,
) {
  const byId = new Map(citations.map((c) => [c.id, c]));
  return text.split("\n").map((para, pi) => {
    if (!para.trim()) return null;
    const parts = para.split(/(\[[^\]]*\])/g);
    return (
      <p key={pi} className="mb-3 last:mb-0">
        {parts.map((part, idx) => {
          const m = part.match(/^\[([^\]]*)\]$/);
          if (m && /S\s*\d/i.test(m[1])) {
            const ids = [...m[1].matchAll(/S\s*(\d+)/gi)].map((x) => `S${x[1]}`);
            return (
              <span key={idx} className="inline-flex gap-0.5 align-baseline mx-0.5">
                {ids.map((id) => {
                  const cit = byId.get(id);
                  return (
                    <button
                      key={id}
                      onClick={() => cit && onOpenCitation(cit)}
                      className="text-[11px] font-bold text-tf-blue bg-tf-blue-tint px-1.5 py-0.5 rounded hover:bg-tf-blue hover:text-white transition-colors"
                    >
                      {id}
                    </button>
                  );
                })}
              </span>
            );
          }
          return <React.Fragment key={idx}>{part}</React.Fragment>;
        })}
      </p>
    );
  });
}

function AnswerCard({
  result,
  axes,
  onOpenCitation,
  onAskFollowup,
  onSave,
  saved,
  onExport,
  onDrillIn,
}: {
  result: AskResult;
  axes: { id: string; name: string; color: string }[];
  onOpenCitation: (c: Citation) => void;
  onAskFollowup: (t: string) => void;
  onSave: () => void;
  saved: boolean;
  onExport: () => void;
  onDrillIn: () => void;
}) {
  const answerAxes = axes.filter((a) => result.axisIds?.includes(a.id));

  if (result.status === "no_evidence") {
    return (
      <div className="space-y-4">
        <StateBanner
          icon={<AlertCircle className="w-6 h-6" />}
          tone="warning"
          title="No evidence"
          body={result.answer}
        />
        {result.adjacentDatum && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-4 border border-border">
            Closest governed datum:{" "}
            <span className="font-mono font-semibold text-foreground">
              {result.adjacentDatum.label} {result.adjacentDatum.value}
              {result.adjacentDatum.unit ? ` ${result.adjacentDatum.unit}` : ""}
            </span>{" "}
            ({result.adjacentDatum.period}) — offered as context, not an answer.
          </div>
        )}
        <RetrievalModes modes={result.retrievalModes} />
      </div>
    );
  }

  if (result.status === "permission_blocked") {
    return (
      <div className="space-y-4">
        <StateBanner
          icon={<ShieldAlert className="w-6 h-6" />}
          tone="error"
          title="Permission blocked"
          body={result.answer}
          note={result.permissionNote}
        />
        <RetrievalModes modes={result.retrievalModes} />
      </div>
    );
  }

  if (result.status === "conflict") {
    return (
      <div className="bg-card border border-tf-warning/40 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex items-start space-x-3">
          <div className="w-11 h-11 rounded-xl bg-tf-warning-bg text-tf-warning flex items-center justify-center flex-shrink-0">
            <GitCompareArrows className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">
              Sources disagree
            </h3>
            <div className="text-foreground mt-1 leading-relaxed">
              {renderAnswer(result.answer, result.citations, onOpenCitation)}
            </div>
          </div>
        </div>
        {result.conflictNote && (
          <p className="text-sm font-medium bg-tf-warning-bg/60 text-foreground px-4 py-3 rounded-xl">
            {result.conflictNote}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {result.citations.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpenCitation(c)}
              className="text-left p-4 rounded-xl border border-tf-warning/30 bg-white hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-tf-blue bg-tf-blue-tint px-1.5 py-0.5 rounded">
                  {c.id}
                </span>
                <Badge
                  variant="secondary"
                  className="uppercase text-[10px] tracking-eyebrow"
                >
                  {c.validity}
                </Badge>
              </div>
              <div className="font-semibold text-sm text-foreground">
                {c.docTitle}
              </div>
              {c.value && (
                <div className="font-mono text-lg font-bold text-tf-navy mt-1">
                  {c.value}
                </div>
              )}
            </button>
          ))}
        </div>
        {result.resolutionPath && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDrillIn}
            className="rounded-pill"
          >
            <ExternalLink className="w-4 h-4 mr-1.5" />
            Resolve in {result.resolutionPath}
          </Button>
        )}
        <RetrievalModes modes={result.retrievalModes} />
      </div>
    );
  }

  // answered
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-6">
      {result.lowConfidence && (
        <Callout tone="warning" icon={<Gauge className="w-4 h-4" />}>
          {result.lowConfidenceNote ??
            "Low confidence: this rests on a single, unverified source."}
        </Callout>
      )}
      {result.historic && (
        <Callout tone="warning" icon={<Clock className="w-4 h-4" />}>
          {result.historicNote ??
            "This answer draws on historic or superseded material."}
          {result.historicPointer && (
            <span className="block mt-1 font-semibold">
              {result.historicPointer}
            </span>
          )}
        </Callout>
      )}
      {result.corroborationNote && (
        <Callout tone="success" icon={<CheckCircle2 className="w-4 h-4" />}>
          {result.corroborationNote}
        </Callout>
      )}

      {result.numeric && <NumericFigure numeric={result.numeric} />}

      <div className="text-foreground text-lg leading-relaxed">
        {renderAnswer(result.answer, result.citations, onOpenCitation)}
      </div>

      {answerAxes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {answerAxes.map((axis) => (
            <span
              key={axis.id}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: axis.color || "var(--tf-blue)" }}
            >
              <Layers className="w-3 h-3" />
              <span>{axis.name}</span>
            </span>
          ))}
        </div>
      )}

      {result.attachmentAck && (
        <Callout tone="info" icon={<Paperclip className="w-4 h-4" />}>
          {result.attachmentAck}
        </Callout>
      )}

      {result.citations.length > 0 && (
        <div className="pt-5 border-t space-y-3">
          <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground flex items-center">
            <FileText className="w-4 h-4 mr-2" /> Evidence
          </h4>
          <div className="flex overflow-x-auto pb-2 gap-3 snap-x">
            {result.citations.map((cit) => (
              <EvidenceChip
                key={cit.id}
                citation={cit}
                onOpen={() => onOpenCitation(cit)}
              />
            ))}
          </div>
        </div>
      )}

      <RetrievalModes modes={result.retrievalModes} />

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
        <AnswerAction
          icon={<FileText className="w-4 h-4" />}
          label="Sources"
          onClick={() =>
            result.citations[0] && onOpenCitation(result.citations[0])
          }
          disabled={result.citations.length === 0}
        />
        <AnswerAction
          icon={<Sparkles className="w-4 h-4" />}
          label="Export to Generate"
          onClick={onExport}
        />
        <AnswerAction
          icon={saved ? <Bookmark className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
          label={saved ? "Saved" : "Save insight"}
          onClick={onSave}
          active={saved}
        />
        <AnswerAction
          icon={<Database className="w-4 h-4" />}
          label="Drill into Data"
          onClick={onDrillIn}
        />
      </div>

      {result.suggestedNext && result.suggestedNext.length > 0 && (
        <div className="pt-2 space-y-2">
          <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
            Suggested next
          </div>
          <div className="flex flex-wrap gap-2">
            {result.suggestedNext.map((s) => (
              <button
                key={s.id}
                onClick={() => onAskFollowup(s.text)}
                title={s.rationale ?? undefined}
                className="group flex items-center gap-1.5 text-sm font-medium text-tf-blue bg-tf-blue-tint hover:bg-tf-blue hover:text-white px-3 py-1.5 rounded-full transition-colors"
              >
                {s.text}
                <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ small parts */

function StateBanner({
  icon,
  tone,
  title,
  body,
  note,
}: {
  icon: React.ReactNode;
  tone: "warning" | "error";
  title: string;
  body: string;
  note?: string | null;
}) {
  const toneCls =
    tone === "error"
      ? "text-tf-error bg-tf-error-bg"
      : "text-tf-warning bg-tf-warning-bg";
  return (
    <div className={cn("flex items-start space-x-4 p-6 rounded-2xl", toneCls)}>
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <h3 className="font-bold text-lg text-foreground">{title}</h3>
        <p className="text-foreground mt-2 leading-relaxed">{body}</p>
        {note && (
          <p className="text-sm mt-3 font-semibold px-3 py-2 bg-white/60 rounded-lg">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

function Callout({
  tone,
  icon,
  children,
}: {
  tone: "warning" | "success" | "info";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const cls = {
    warning: "text-tf-warning bg-tf-warning-bg border-tf-warning/20",
    success: "text-tf-success bg-tf-success-bg border-tf-success/20",
    info: "text-tf-blue bg-tf-blue-tint border-tf-blue/20",
  }[tone];
  return (
    <div
      className={cn(
        "flex items-start space-x-2 px-4 py-3 rounded-xl text-sm font-medium border",
        cls,
      )}
    >
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

function NumericFigure({
  numeric,
}: {
  numeric: NonNullable<AskResult["numeric"]>;
}) {
  return (
    <div className="bg-tf-blue-tint p-6 rounded-xl border border-tf-blue/10 flex items-center justify-between">
      <div>
        <div className="text-xs font-bold uppercase tracking-eyebrow text-tf-blue mb-2">
          {numeric.label}
        </div>
        <div className="font-mono text-display-md text-tf-navy tabular-nums">
          {numeric.value}
          <span className="text-2xl text-tf-blue font-medium ml-1">
            {numeric.unit}
          </span>
        </div>
      </div>
      <div className="text-right text-sm font-medium space-y-1">
        <div className="bg-white/60 px-3 py-1 rounded-full text-tf-blue">
          {numeric.period}
        </div>
        <div className="text-tf-navy/60 uppercase tracking-eyebrow text-[10px] mt-2">
          {numeric.source}
        </div>
      </div>
    </div>
  );
}

function EvidenceChip({
  citation,
  onOpen,
}: {
  citation: Citation;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="flex items-start space-x-3 p-3 bg-white border border-border rounded-xl hover:border-tf-blue hover:shadow-sm transition-all text-left w-[300px] shrink-0 snap-start"
    >
      <div className="bg-tf-blue-tint text-tf-blue font-bold px-2 py-1 rounded text-xs flex-shrink-0">
        {citation.id}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground truncate">
          {citation.docTitle}
        </div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">
          {citation.sourceLoc}
        </div>
        <div className="flex items-center flex-wrap gap-1.5 mt-2">
          {citation.value && (
            <span className="text-xs font-mono font-bold text-tf-success">
              {citation.value}
            </span>
          )}
          <Badge
            variant="secondary"
            className="uppercase text-[9px] tracking-eyebrow py-0"
          >
            {citation.confidentiality}
          </Badge>
          {citation.conflicting && (
            <Badge className="uppercase text-[9px] tracking-eyebrow py-0 bg-tf-warning text-white">
              conflict
            </Badge>
          )}
          {typeof citation.corroboration === "number" &&
            citation.corroboration >= 2 && (
              <span className="text-[10px] font-semibold text-tf-success">
                +{citation.corroboration} agree
              </span>
            )}
        </div>
      </div>
    </button>
  );
}

function RetrievalModes({
  modes,
}: {
  modes?: AskResult["retrievalModes"];
}) {
  if (!modes || modes.length === 0) return null;
  const iconFor = (mode: string) => {
    if (mode === "graph") return <Network className="w-3.5 h-3.5" />;
    if (mode === "agentic") return <Gauge className="w-3.5 h-3.5" />;
    if (mode === "keyword") return <Search className="w-3.5 h-3.5" />;
    return <Layers className="w-3.5 h-3.5" />;
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
        Retrieval
      </span>
      {modes.map((m) => (
        <span
          key={m.mode}
          title={m.detail ?? undefined}
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border",
            m.used
              ? "text-tf-blue bg-tf-blue-tint border-tf-blue/20"
              : "text-muted-foreground bg-muted/40 border-transparent opacity-60",
          )}
        >
          {iconFor(m.mode)}
          {m.label}
        </span>
      ))}
    </div>
  );
}

function AnswerAction({
  icon,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-pill h-8 text-sm font-medium text-muted-foreground hover:text-tf-blue hover:bg-tf-blue-tint",
        active && "text-tf-blue bg-tf-blue-tint",
      )}
    >
      <span className="mr-1.5">{icon}</span>
      {label}
    </Button>
  );
}

/* ------------------------------------------------------------ Composer */

function Composer({
  input,
  setInput,
  onSend,
  onKeyDown,
  disabled,
  attachment,
  onAttach,
  onRemoveAttachment,
  onToggleIngest,
  filtersActive,
  fileRef,
  onFile,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  attachment: { name: string; ingest: boolean } | null;
  onAttach: () => void;
  onRemoveAttachment: () => void;
  onToggleIngest: () => void;
  filtersActive: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="border-t border-border bg-white px-6 py-4 flex-shrink-0">
      <div className="max-w-4xl mx-auto">
        {attachment && (
          <div className="mb-2 flex items-center justify-between bg-muted/60 rounded-xl px-3 py-2 text-sm">
            <div className="flex items-center space-x-2 min-w-0">
              <Paperclip className="w-4 h-4 text-tf-blue flex-shrink-0" />
              <span className="truncate font-medium">{attachment.name}</span>
              <span className="text-xs text-muted-foreground">
                working context
              </span>
            </div>
            <div className="flex items-center space-x-3 flex-shrink-0">
              <button
                onClick={onToggleIngest}
                className={cn(
                  "text-xs font-semibold px-2 py-1 rounded-full transition-colors",
                  attachment.ingest
                    ? "bg-tf-success text-white"
                    : "bg-white text-muted-foreground border border-border",
                )}
              >
                {attachment.ingest ? "Will ingest as E-data" : "Ingest to corpus"}
              </button>
              <button onClick={onRemoveAttachment}>
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </div>
        )}
        <div className="relative">
          <Textarea
            placeholder={
              filtersActive
                ? "Ask within the active retrieval scope…"
                : "Ask about strategy, brand, or corporate facts…"
            }
            className="min-h-[56px] max-h-[200px] rounded-2xl resize-none pl-12 pr-14 py-4 shadow-sm border-border focus-visible:ring-tf-blue text-base"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.csv,.json"
            className="hidden"
            onChange={onFile}
          />
          <button
            onClick={onAttach}
            className="absolute bottom-4 left-3 text-muted-foreground hover:text-tf-blue transition-colors"
            title="Attach a working document"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <Button
            size="icon"
            className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-tf-blue hover:bg-tf-blue-hover text-white shadow-md"
            onClick={onSend}
            disabled={!input.trim() || disabled}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center justify-center mt-2">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Answers are permission-filtered before the model sees any source.
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Drawer */

function CitationDrawer({
  citation,
  axes,
  onClose,
}: {
  citation: Citation | null;
  axes: { id: string; name: string }[];
  onClose: () => void;
}) {
  return (
    <Drawer open={!!citation} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[88vh]">
        <div className="mx-auto w-full max-w-2xl px-6 pb-8 pt-4 overflow-y-auto">
          {citation && (
            <>
              <DrawerHeader className="px-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-tf-blue-tint text-tf-blue font-bold px-3 py-1 rounded text-sm">
                    Citation [{citation.id}]
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      className={cn(
                        "uppercase tracking-eyebrow text-[10px]",
                        citation.validity === "approved"
                          ? "bg-tf-success text-white"
                          : "bg-tf-warning text-white",
                      )}
                    >
                      {citation.validity}
                    </Badge>
                    <Badge
                      variant={
                        citation.confidentiality === "public"
                          ? "secondary"
                          : "destructive"
                      }
                      className="uppercase tracking-eyebrow text-[10px]"
                    >
                      {citation.confidentiality}
                    </Badge>
                  </div>
                </div>
                <DrawerTitle className="text-2xl font-bold text-tf-navy mt-2">
                  {citation.docTitle}
                </DrawerTitle>
                <DrawerDescription className="text-base mt-1">
                  {citation.sourceLoc}
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-6 mt-4">
                {/* Layer 1 — governance */}
                <DrawerLayer
                  index={1}
                  title="Governance"
                  icon={<ShieldCheck className="w-4 h-4" />}
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Field label="Version" value={citation.version} />
                    <Field label="Owner" value={citation.owner} />
                    <Field
                      label="Confidence"
                      value={`${Math.round(citation.confidence * 100)}%`}
                    />
                    {citation.validUntil && (
                      <Field label="Valid until" value={citation.validUntil} />
                    )}
                    {typeof citation.relevance === "number" && (
                      <Field
                        label="Relevance"
                        value={`${Math.round(citation.relevance * 100)}%`}
                      />
                    )}
                    {typeof citation.corroboration === "number" &&
                      citation.corroboration >= 2 && (
                        <Field
                          label="Corroboration"
                          value={`${citation.corroboration} sources`}
                        />
                      )}
                    {citation.conflicting && (
                      <Field label="Conflict" value="Disagrees" />
                    )}
                  </div>
                </DrawerLayer>

                {/* Layer 2 — evidence snippet */}
                <DrawerLayer
                  index={2}
                  title="Evidence"
                  icon={<FileText className="w-4 h-4" />}
                >
                  <div className="bg-muted p-5 rounded-xl border border-border">
                    <p className="text-foreground leading-relaxed font-serif text-lg">
                      “{citation.snippet}”
                    </p>
                    {citation.value && (
                      <div className="mt-3 font-mono text-xl font-bold text-tf-navy">
                        {citation.value}
                        {citation.period ? (
                          <span className="text-sm font-sans font-medium text-muted-foreground ml-2">
                            {citation.period}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </DrawerLayer>

                {/* Layer 3 — semantic layer */}
                <DrawerLayer
                  index={3}
                  title="Semantic layer"
                  icon={<Network className="w-4 h-4" />}
                >
                  <div className="space-y-3">
                    {citation.topics && citation.topics.length > 0 && (
                      <TagRow label="Topics" tags={citation.topics} />
                    )}
                    {citation.entities && citation.entities.length > 0 && (
                      <TagRow label="Entities" tags={citation.entities} />
                    )}
                    {citation.axisIds && citation.axisIds.length > 0 && (
                      <TagRow
                        label="Axes"
                        tags={citation.axisIds.map(
                          (id) => axes.find((a) => a.id === id)?.name ?? id,
                        )}
                      />
                    )}
                    {(citation.country || citation.brand) && (
                      <TagRow
                        label="Scope"
                        tags={[citation.country, citation.brand].filter(
                          (v): v is string => Boolean(v),
                        )}
                      />
                    )}
                  </div>
                </DrawerLayer>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function DrawerLayer({
  index,
  title,
  icon,
  children,
}: {
  index: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center space-x-2 mb-3">
        <span className="w-6 h-6 rounded-full bg-tf-navy text-white text-xs font-bold flex items-center justify-center">
          {index}
        </span>
        <span className="text-tf-blue">{icon}</span>
        <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
        {label}
      </div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground w-16 flex-shrink-0 pt-1">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <span
            key={i}
            className="text-xs font-medium bg-muted text-foreground px-2 py-1 rounded-md"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
