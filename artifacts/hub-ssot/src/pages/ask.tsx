import React from "react";
import { clearanceLabel } from "@/components/data-center/helpers";
import { useLocation, useSearch } from "wouter";
import {
  useAsk,
  useListSuggestions,
  useListAxes,
  useListDocuments,
  useSubmitQualityFeedback,
  AskResult,
  AskFilters,
  AskTurn,
  AskDocumentSummary,
  SuggestedQuery,
  Citation,
} from "@workspace/api-client-react";
import { useApp, type Lang } from "@/components/app-provider";
import { UI, apiLang } from "@/i18n";
import {
  ASK_I18N,
  localeFor,
  validityLabel,
  type AskStrings,
} from "@/i18n/ask";
import { streamAsk, type AskStep } from "@/hooks/ask-stream";
import {
  ArtifactPanel,
  downloadAskDocument,
} from "@/components/artifact-panel";
import { Streamdown } from "streamdown";
import {
  Box,
  Stack,
  Inline,
  Boxed,
  Divider,
  Text1,
  Text2,
  Text3,
  Text5,
  Text8,
  Title1,
  Title3,
  ButtonPrimary,
  ButtonSecondary,
  ButtonLink,
  IconButton,
  Chip,
  Tag,
  Callout,
  Select,
  Drawer,
  Spinner,
  Touchable,
  Circle,
  skinVars,
  applyAlpha,
  IconSendRegular,
  IconAlertRegular,
  IconShieldCrossRegular,
  IconWaitClockRegular,
  IconDocumentsRegular,
  IconCheckedRegular,
  IconWarningRegular,
  IconFunnelRegular,
  IconAddMoreCircleRegular,
  IconClipRegular,
  IconCloseRegular,
  IconBookmarkRegular,
  IconLinkRegular,
  IconLayersRegular,
  IconRobotRegular,
  IconUserAccountRegular,
  IconLightningRegular,
  IconArrowRightRegular,
  IconWorldDeviceRegular,
  IconShieldCheckedOkRegular,
  IconDatabaseRegular,
  IconNeuralNetworkRegular,
  IconTachometerRegular,
  IconMessageRegular,
  IconChevronDownRegular,
  IconDownloadRegular,
} from "@telefonica/mistica";

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
  // Live run progress, streamed from the agent as it genuinely happens.
  steps?: AskStep[];
  streamText?: string | null;
  // The four-way quality verdict the user recorded for this answer, if any.
  // Persisted with the conversation so chips stay resolved across reloads.
  feedbackVerdict?: string | null;
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

function formatRelativeTime(ts: number, t: AskStrings, lang: Lang): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return t.time.justNow;
  if (min < 60) return t.time.minutesAgo(min);
  const hr = Math.round(min / 60);
  if (hr < 24) return t.time.hoursAgo(hr);
  const day = Math.round(hr / 24);
  if (day < 7) return t.time.daysAgo(day);
  return new Date(ts).toLocaleDateString(localeFor(lang));
}

function hasActiveFilters(f: AskFilters | null): boolean {
  if (!f) return false;
  return Boolean(f.market || f.brand || f.period || f.source || f.axis);
}

// Below this width the sessions rail yields its space to the artifact panel
// so the chat column stays readable when a document is open.
const NARROW_QUERY = "(max-width: 1199px)";
function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia(NARROW_QUERY).matches,
  );
  React.useEffect(() => {
    const mql = window.matchMedia(NARROW_QUERY);
    const onChange = () => setNarrow(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

export default function Ask() {
  const { area, roleId, lang, setLang } = useApp();
  const t = ASK_I18N[lang];
  const [, navigate] = useLocation();

  const [conversations, setConversations] = React.useState<Conversation[]>(() =>
    loadConversations(),
  );
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [filters, setFilters] = React.useState<AskFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = React.useState(false);
  const [attachment, setAttachment] = React.useState<{
    name: string;
    content: string;
    ingest: boolean;
  } | null>(null);
  const [selectedCitation, setSelectedCitation] = React.useState<Citation | null>(
    null,
  );
  // The document open in the workspace artifact panel. Opened ONLY from
  // explicit events (a fresh generation landing, or an Open action on a
  // document card) — never derived from the thread, so a localStorage
  // rehydration can never pop the panel open on page load.
  const [openDocId, setOpenDocId] = React.useState<string | null>(null);
  const narrow = useNarrowViewport();
  // Live view of the active conversation id, so a doc-generating run that
  // completes AFTER the user moved to another conversation can be detected
  // and never auto-opens its document over the wrong thread.
  const activeIdRef = React.useRef<string | null>(null);
  activeIdRef.current = activeId;
  const [insights, setInsights] = React.useState<SavedInsight[]>(() =>
    loadInsights(),
  );

  const fileRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const autoRanRef = React.useRef<string | null>(null);
  const askAbortRef = React.useRef<AbortController | null>(null);

  // Cancel any in-flight streamed run when the page unmounts.
  React.useEffect(
    () => () => {
      askAbortRef.current?.abort();
    },
    [],
  );

  const search = useSearch();

  const { data: suggestions } = useListSuggestions();
  const { data: axes } = useListAxes();
  const { data: documents } = useListDocuments();
  const { mutateAsync: askQuery, isPending } = useAsk();

  // Conversations for the current persona, most-recent first. Switching persona
  // switches which conversations are visible and resumable.
  const personaConversations = React.useMemo(
    () =>
      conversations
        .filter((c) => c.roleId === roleId)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations, roleId],
  );

  const activeConvo =
    conversations.find((c) => c.id === activeId && c.roleId === roleId) ?? null;
  const thread = activeConvo?.turns ?? [];

  // Opening Ask always starts on a clean new-conversation screen; past
  // conversations stay resumable from the sidebar. On persona switch, any active
  // conversation from another persona is cleared so a lower-clearance persona
  // can never see or resume a higher-clearance thread.
  React.useEffect(() => {
    setActiveId((current) => {
      const cur = conversations.find((c) => c.id === current);
      return cur && cur.roleId === roleId ? current : null;
    });
  }, [roleId, conversations]);

  // Persist conversations and saved insights so a demo survives a refresh (no DB).
  React.useEffect(() => {
    try {
      localStorage.setItem(CONVOS_KEY, JSON.stringify(conversations));
    } catch {
      /* storage full — non-fatal for a demo */
    }
  }, [conversations]);
  React.useEffect(() => {
    try {
      localStorage.setItem(INSIGHTS_KEY, JSON.stringify(insights));
    } catch {
      /* non-fatal */
    }
  }, [insights]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread, isPending]);

  const filterOptions = React.useMemo(() => {
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
      // citedDocIds seed the doc-gen Superflow's retrieval with what this
      // conversation actually cited; the server re-validates every id against
      // the current persona's clearance before use.
      const citedDocIds = Array.from(
        new Set(t.result.citations.map((c) => c.docId)),
      );
      turns.push({
        role: "assistant",
        content: t.result.answer,
        ...(citedDocIds.length > 0 ? { citedDocIds } : {}),
      });
    }
    return turns;
  };

  const handleAsk = async (text: string, opts?: { fresh?: boolean }) => {
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
    const reuse = !opts?.fresh && activeConvo && activeConvo.roleId === roleId;
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

    const body = {
      question: q,
      area,
      roleId,
      history,
      filters: activeFilters,
      attachment: sentAttachment,
      lang: apiLang(lang),
    };

    // Stream the run: real step events and token deltas as they happen, then
    // the full result (citations land last). Falls back to the plain request
    // if streaming is unavailable.
    const steps: AskStep[] = [];
    let streamText = "";
    // Cancel any in-flight run before starting a new one, and never fall back
    // to a duplicate non-stream request when a run was intentionally aborted.
    askAbortRef.current?.abort();
    const abort = new AbortController();
    askAbortRef.current = abort;
    try {
      const result = await streamAsk(
        body,
        {
          onStep: (step) => {
            const i = steps.findIndex((s) => s.id === step.id);
            if (i === -1) steps.push(step);
            else steps[i] = step;
            patchTurn({ steps: [...steps] });
          },
          onToken: (content) => {
            streamText += content;
            patchTurn({ streamText });
          },
        },
        abort.signal,
      );
      patchTurn({ result, pending: false, streamText: null });
      // A turn that generated documents opens the newest one in the artifact
      // panel immediately — the two-panel workspace moment. Guarded: only if
      // this turn's conversation is still the one on screen, so a slow run
      // can never pop its document over a different conversation.
      const docs = result.documents ?? [];
      if (docs.length > 0 && activeIdRef.current === convoId)
        setOpenDocId(docs[docs.length - 1].id);
    } catch (err) {
      if (abort.signal.aborted) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      try {
        const result = await askQuery({ data: body });
        patchTurn({ result, pending: false, streamText: null });
        const docs = result.documents ?? [];
        if (docs.length > 0 && activeIdRef.current === convoId)
          setOpenDocId(docs[docs.length - 1].id);
      } catch {
        patchTurn({ pending: false, error: true, streamText: null });
      }
    } finally {
      if (askAbortRef.current === abort) askAbortRef.current = null;
    }
  };

  // Persist a recorded quality verdict onto its turn (any conversation) so the
  // feedback chips stay resolved across reloads.
  const markTurnFeedback = (turnId: string, verdict: string) =>
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        turns: c.turns.map((t) =>
          t.id === turnId ? { ...t, feedbackVerdict: verdict } : t,
        ),
      })),
    );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk(input);
    }
  };

  // Home front door handoff: a `?q=` param (e.g. from the Home ask bar) is
  // auto-run once per distinct query, but only once a persona is selected so the
  // request is governed. Guarded by a ref so re-renders never re-fire it.
  React.useEffect(() => {
    if (!roleId) return;
    const q = new URLSearchParams(search).get("q")?.trim();
    if (!q || autoRanRef.current === q) return;
    autoRanRef.current = q;
    // A question arriving from the Home front door always opens a fresh
    // conversation, so the user is never dropped into an older thread.
    handleAsk(q, { fresh: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleId]);

  const newConversation = () => {
    setActiveId(null);
    setInput("");
    setAttachment(null);
    setFilters(EMPTY_FILTERS);
    setOpenDocId(null);
  };

  const resumeConversation = (id: string) => {
    setActiveId(id);
    setInput("");
    setAttachment(null);
    setFilters(EMPTY_FILTERS);
    setOpenDocId(null);
  };

  // Persona switch closes the artifact panel AND aborts any in-flight run:
  // a lower-clearance persona must never keep reading — or receive — a
  // document generated under a higher clearance.
  React.useEffect(() => {
    setOpenDocId(null);
    askAbortRef.current?.abort();
    askAbortRef.current = null;
  }, [roleId]);

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
      const r = turn.result;
      localStorage.setItem(
        GENERATE_DRAFT_KEY,
        JSON.stringify({
          question: turn.question,
          answer: r.answer,
          citations: r.citations,
          status: r.status,
          historic: r.historic,
          historicNote: r.historicNote ?? null,
          conflictNote: r.conflictNote ?? null,
          lowConfidence: r.lowConfidence ?? false,
          lowConfidenceNote: r.lowConfidenceNote ?? null,
          axisIds: r.axisIds,
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

  // Per-conversation workspace: every document the Superflow generated across
  // this conversation's turns, newest last, deduped by id.
  const workspaceDocs = React.useMemo(() => {
    const seen = new Set<string>();
    const docs: AskDocumentSummary[] = [];
    for (const turn of thread) {
      for (const doc of turn.result?.documents ?? []) {
        if (seen.has(doc.id)) continue;
        seen.add(doc.id);
        docs.push(doc);
      }
    }
    return docs;
  }, [thread]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: skinVars.colors.background,
      }}
    >
      <ConversationHeader
        area={area}
        lang={lang}
        setLang={setLang}
        showFilters={showFilters}
        toggleFilters={() => setShowFilters((s) => !s)}
        filtersActive={hasActiveFilters(filters)}
      />

      {showFilters && (
        <FiltersBar
          filters={filters}
          setFilters={setFilters}
          options={filterOptions}
          axes={axes ?? []}
          onClear={() => setFilters(EMPTY_FILTERS)}
          t={t}
        />
      )}

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {!(openDocId && narrow) && (
          <SessionsPanel
            conversations={personaConversations}
            activeId={activeId}
            onNew={newConversation}
            onResume={resumeConversation}
            insights={insights}
            workspaceDocs={workspaceDocs}
            onOpenDocument={setOpenDocId}
            t={t}
            lang={lang}
          />
        )}

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }} ref={scrollRef}>
            <div
              style={{
                maxWidth: 896,
                margin: "0 auto",
                padding: "32px 24px",
              }}
            >
              {isEmpty && !isPending && (
                <FirstRun
                  suggestions={suggestions}
                  onPick={(text) => handleAsk(text)}
                  t={t}
                />
              )}

              <Stack space={40}>
                {thread.map((turn) => (
                  <TurnBlock
                    key={turn.id}
                    turn={turn}
                    axes={axes ?? []}
                    onOpenCitation={setSelectedCitation}
                    onAskFollowup={(text) => handleAsk(text)}
                    onSave={() => saveInsight(turn)}
                    saved={insights.some((i) => i.question === turn.question)}
                    onExport={() => exportToGenerate(turn)}
                    onDrillIn={() => navigate("/data")}
                    onOpenDocument={setOpenDocId}
                    onFeedback={(verdict) => markTurnFeedback(turn.id, verdict)}
                    t={t}
                    lang={lang}
                  />
                ))}
              </Stack>
            </div>
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
            t={t}
          />
        </div>

        {openDocId && (
          <ArtifactPanel
            documentId={openDocId}
            onClose={() => setOpenDocId(null)}
            onOpenCitation={setSelectedCitation}
            t={t}
          />
        )}
      </div>

      {selectedCitation && (
        <CitationDrawer
          citation={selectedCitation}
          axes={axes ?? []}
          onClose={() => setSelectedCitation(null)}
          t={t}
          lang={lang}
        />
      )}
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
}: {
  area: string;
  lang: Lang;
  setLang: (l: Lang) => void;
  showFilters: boolean;
  toggleFilters: () => void;
  filtersActive: boolean;
}) {
  return (
    <div
      style={{
        borderBottom: `1px solid ${skinVars.colors.divider}`,
        backgroundColor: skinVars.colors.backgroundContainer,
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        gap: 16,
      }}
    >
      <Inline space={12} alignItems="center">
        <Circle size={36} backgroundColor={skinVars.colors.brandLow}>
          <IconRobotRegular size={20} color={skinVars.colors.brand} />
        </Circle>
        <Stack space={2}>
          <Text3 medium>{UI[lang].ask.assistant}</Text3>
          <Text1 regular color={skinVars.colors.textSecondary}>
            {UI[lang].ask.scopeLine(area)}
          </Text1>
        </Stack>
      </Inline>

      <Inline space={8} alignItems="center">
        <Inline space={4} alignItems="center">
          <IconWorldDeviceRegular
            size={16}
            color={skinVars.colors.textSecondary}
          />
          {LANGS.map((l) => (
            <Chip key={l} active={lang === l} onPress={() => setLang(l)}>
              {l}
            </Chip>
          ))}
        </Inline>

        <Chip
          active={showFilters}
          onPress={toggleFilters}
          Icon={IconFunnelRegular}
          badge={filtersActive}
        >
          {UI[lang].ask.filters}
        </Chip>
      </Inline>
    </div>
  );
}

/* ------------------------------------------------------------ Sessions panel */

// Persistent side panel: every conversation for the current persona, newest
// first, plus saved insights. Selecting a row resumes that session in place.
function SessionsPanel({
  conversations,
  activeId,
  onNew,
  onResume,
  insights,
  workspaceDocs,
  onOpenDocument,
  t,
  lang,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onNew: () => void;
  onResume: (id: string) => void;
  insights: SavedInsight[];
  workspaceDocs: AskDocumentSummary[];
  onOpenDocument: (id: string) => void;
  t: AskStrings;
  lang: Lang;
}) {
  return (
    <div
      style={{
        width: 264,
        flexShrink: 0,
        borderRight: `1px solid ${skinVars.colors.divider}`,
        backgroundColor: skinVars.colors.backgroundContainer,
        overflowY: "auto",
        padding: 12,
      }}
    >
      <Stack space={8}>
        <Touchable onPress={onNew}>
          <div
            style={{
              borderRadius: skinVars.borderRadii.container,
              border: `1px solid ${skinVars.colors.borderHigh}`,
              padding: "10px 12px",
            }}
          >
            <Inline space={8} alignItems="center">
              <IconAddMoreCircleRegular size={18} color={skinVars.colors.brand} />
              <Text2 medium>{t.sessions.newConversation}</Text2>
            </Inline>
          </div>
        </Touchable>

        <Box paddingX={4} paddingTop={8}>
          <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
            {t.sessions.conversations}
          </Text1>
        </Box>

        {conversations.length === 0 && (
          <Box paddingX={4} paddingY={4}>
            <Text1 regular color={skinVars.colors.textSecondary}>
              {t.sessions.noConversations}
            </Text1>
          </Box>
        )}

        {conversations.map((c) => {
          const first = c.turns[0]?.question ?? t.sessions.newConversation;
          const isActive = c.id === activeId;
          return (
            <Touchable key={c.id} onPress={() => onResume(c.id)}>
              <div
                style={{
                  borderRadius: skinVars.borderRadii.container,
                  backgroundColor: isActive
                    ? skinVars.colors.brandLow
                    : "transparent",
                  padding: "8px 10px",
                }}
              >
                <Inline space={8} alignItems="center">
                  <IconMessageRegular
                    size={16}
                    color={
                      isActive ? skinVars.colors.brand : skinVars.colors.textSecondary
                    }
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Stack space={2}>
                      {isActive ? (
                        <Text2 medium truncate={1}>
                          {first}
                        </Text2>
                      ) : (
                        <Text2 regular truncate={1}>
                          {first}
                        </Text2>
                      )}
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        {t.sessions.turnsCount(c.turns.length)} ·{" "}
                        {formatRelativeTime(c.updatedAt, t, lang)}
                      </Text1>
                    </Stack>
                  </div>
                </Inline>
              </div>
            </Touchable>
          );
        })}

        {workspaceDocs.length > 0 && (
          <>
            <Box paddingX={4} paddingTop={8}>
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                {t.documents.workspace}
              </Text1>
            </Box>
            <Stack space={8}>
              {workspaceDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  compact
                  onOpen={() => onOpenDocument(doc.id)}
                  t={t}
                />
              ))}
            </Stack>
          </>
        )}

        {insights.length > 0 && (
          <>
            <Box paddingX={4} paddingTop={8}>
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                {t.sessions.savedInsights}
              </Text1>
            </Box>
            {insights.slice(0, 6).map((i) => (
              <Box key={i.id} paddingX={4} paddingY={4}>
                <Inline space={8} alignItems="center">
                  <IconBookmarkRegular size={16} color={skinVars.colors.brand} />
                  <Text1 regular truncate={2}>
                    {i.question}
                  </Text1>
                </Inline>
              </Box>
            ))}
          </>
        )}
      </Stack>
    </div>
  );
}

/* ---------------------------------------------------------------- Filters */

function FiltersBar({
  filters,
  setFilters,
  options,
  axes,
  onClear,
  t,
}: {
  filters: AskFilters;
  setFilters: (f: AskFilters) => void;
  options: { market: string[]; brand: string[]; period: string[]; source: string[] };
  axes: { id: string; name: string }[];
  onClear: () => void;
  t: AskStrings;
}) {
  const set = (k: keyof AskFilters, v: string | null) =>
    setFilters({ ...filters, [k]: v });
  const opt = (arr: string[]) => [
    { value: "", text: t.filters.all },
    ...arr.map((v) => ({ value: v, text: v })),
  ];
  return (
    <div
      style={{
        borderBottom: `1px solid ${skinVars.colors.divider}`,
        backgroundColor: skinVars.colors.backgroundAlternative,
        padding: "12px 24px",
        flexShrink: 0,
      }}
    >
      <Inline space={12} alignItems="center" wrap>
        <Text1
          medium
          color={skinVars.colors.textSecondary}
          transform="uppercase"
        >
          {t.filters.scope}
        </Text1>
        <div style={{ width: 160 }}>
          <Select
            name="market"
            label={t.filters.market}
            value={filters.market ?? ""}
            onChangeValue={(v) => set("market", v || null)}
            options={opt(options.market)}
            fullWidth
          />
        </div>
        <div style={{ width: 160 }}>
          <Select
            name="brand"
            label={t.filters.brand}
            value={filters.brand ?? ""}
            onChangeValue={(v) => set("brand", v || null)}
            options={opt(options.brand)}
            fullWidth
          />
        </div>
        <div style={{ width: 160 }}>
          <Select
            name="period"
            label={t.filters.period}
            value={filters.period ?? ""}
            onChangeValue={(v) => set("period", v || null)}
            options={opt(options.period)}
            fullWidth
          />
        </div>
        <div style={{ width: 160 }}>
          <Select
            name="source"
            label={t.filters.source}
            value={filters.source ?? ""}
            onChangeValue={(v) => set("source", v || null)}
            options={opt(options.source)}
            fullWidth
          />
        </div>
        <div style={{ width: 180 }}>
          <Select
            name="axis"
            label={t.filters.axis}
            value={filters.axis ?? ""}
            onChangeValue={(v) => set("axis", v || null)}
            options={[
              { value: "", text: t.filters.all },
              ...axes.map((a) => ({ value: a.id, text: a.name })),
            ]}
            fullWidth
          />
        </div>
        {hasActiveFilters(filters) && (
          <ButtonLink onPress={onClear}>{t.filters.clear}</ButtonLink>
        )}
      </Inline>
    </div>
  );
}

/* ---------------------------------------------------------------- First run */

function FirstRun({
  suggestions,
  onPick,
  t,
}: {
  suggestions?: SuggestedQuery[];
  onPick: (text: string) => void;
  t: AskStrings;
}) {
  // A handful of chips instead of a wall of nudge cards: one suggestion per
  // answer kind (cited, conflict, permission, no-evidence, historic) so the
  // few that remain still showcase the honest answer states.
  const chips = React.useMemo(() => {
    const picked: SuggestedQuery[] = [];
    const seen = new Set<string>();
    for (const s of suggestions ?? []) {
      if (!seen.has(s.kind)) {
        seen.add(s.kind);
        picked.push(s);
      }
      if (picked.length >= 5) break;
    }
    return picked;
  }, [suggestions]);

  return (
    <div
      style={{
        minHeight: "55vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Stack space={24}>
        <div style={{ textAlign: "center" }}>
          <Stack space={12}>
            <Text8>{t.firstRun.title}</Text8>
            <Text3 regular color={skinVars.colors.textSecondary}>
              {t.firstRun.body}
            </Text3>
          </Stack>
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
            maxWidth: 680,
            margin: "0 auto",
          }}
        >
          {chips.map((s) => (
            <Touchable key={s.id} onPress={() => onPick(s.text)}>
              <Chip>{s.text}</Chip>
            </Touchable>
          ))}
        </div>
      </Stack>
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
  onOpenDocument,
  onFeedback,
  t,
  lang,
}: {
  turn: Turn;
  axes: { id: string; name: string; color: string }[];
  onOpenCitation: (c: Citation) => void;
  onAskFollowup: (text: string) => void;
  onSave: () => void;
  saved: boolean;
  onExport: () => void;
  onDrillIn: () => void;
  onOpenDocument: (id: string) => void;
  onFeedback: (verdict: string) => void;
  t: AskStrings;
  lang: Lang;
}) {
  return (
    <Stack space={24}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div
          style={{
            backgroundColor: skinVars.colors.backgroundBrand,
            borderRadius: skinVars.borderRadii.container,
            padding: "12px 20px",
            maxWidth: "85%",
          }}
        >
          <Stack space={8}>
            <Text2 medium color={skinVars.colors.textPrimaryInverse}>
              {turn.question}
            </Text2>
            {(turn.filters || turn.attachmentName) && (
              <Inline space={8} wrap alignItems="center">
                {turn.filters &&
                  Object.entries(turn.filters)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          backgroundColor: applyAlpha(
                            skinVars.rawColors.inverse,
                            0.16,
                          ),
                          borderRadius: skinVars.borderRadii.indicator,
                          padding: "2px 8px",
                        }}
                      >
                        <Text1
                          regular
                          color={skinVars.colors.textPrimaryInverse}
                          transform="uppercase"
                        >
                          {k}: {v}
                        </Text1>
                      </div>
                    ))}
                {turn.attachmentName && (
                  <div
                    style={{
                      backgroundColor: applyAlpha(
                        skinVars.rawColors.inverse,
                        0.16,
                      ),
                      borderRadius: skinVars.borderRadii.indicator,
                      padding: "2px 8px",
                    }}
                  >
                    <Inline space={4} alignItems="center">
                      <IconClipRegular
                        size={12}
                        color={skinVars.colors.textPrimaryInverse}
                      />
                      <Text1
                        regular
                        color={skinVars.colors.textPrimaryInverse}
                      >
                        {turn.attachmentName}
                      </Text1>
                    </Inline>
                  </div>
                )}
              </Inline>
            )}
          </Stack>
        </div>
        <TurnAvatar kind="user" />
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <TurnAvatar kind="agent" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Stack space={24}>
            {turn.pending && (
              <RunProgress
                steps={turn.steps ?? []}
                streamText={turn.streamText}
                t={t}
              />
            )}

            {!turn.pending && turn.result && (turn.steps?.length ?? 0) > 0 && (
              <RunStepsSummary steps={turn.steps!} t={t} />
            )}

            {turn.error && (
              <div
                style={{
                  backgroundColor: skinVars.colors.errorLow,
                  borderRadius: skinVars.borderRadii.container,
                  padding: 16,
                }}
              >
                <Inline space={12} alignItems="center">
                  <IconAlertRegular size={20} color={skinVars.colors.error} />
                  <Text2 regular>{t.turnError}</Text2>
                </Inline>
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
                onOpenDocument={onOpenDocument}
                t={t}
                lang={lang}
              />
            )}

            {!turn.pending && turn.result && (
              <FeedbackChips turn={turn} onRecorded={onFeedback} t={t} lang={lang} />
            )}
          </Stack>
        </div>
      </div>
    </Stack>
  );
}

// Four-way answer feedback (L2 quality loop). A verdict below "correct" opens
// a triage item in the admin Quality tab, carrying the turn's retrieval-audit
// id so the exact governed trace is reproducible.
function FeedbackChips({
  turn,
  onRecorded,
  t,
  lang,
}: {
  turn: Turn;
  onRecorded: (verdict: string) => void;
  t: AskStrings;
  lang: Lang;
}) {
  const { mutate, isPending, error } = useSubmitQualityFeedback();
  const result = turn.result;
  if (!result) return null;

  const labels: Record<string, string> = {
    correct: t.feedback.correct,
    partial: t.feedback.partial,
    incorrect: t.feedback.incorrect,
    fabricated: t.feedback.fabricated,
  };

  if (turn.feedbackVerdict) {
    return (
      <Inline space={8} alignItems="center" wrap>
        <Tag type={turn.feedbackVerdict === "correct" ? "success" : "warning"}>
          {labels[turn.feedbackVerdict] ?? turn.feedbackVerdict}
        </Tag>
        <Text1 regular color={skinVars.colors.textSecondary}>
          {t.feedback.thanks}
        </Text1>
      </Inline>
    );
  }

  const submit = (verdict: string) => {
    if (isPending) return;
    const citedDocIds = Array.from(
      new Set((result.citations ?? []).map((c) => c.docId)),
    );
    mutate(
      {
        data: {
          roleId: turn.roleId,
          verdict,
          question: turn.question,
          answer: result.answer,
          status: result.status,
          citedDocIds,
          auditId: result.auditId ?? null,
          lang: apiLang(lang),
        },
      },
      { onSuccess: () => onRecorded(verdict) },
    );
  };

  return (
    <Stack space={8}>
      <Inline space={8} alignItems="center" wrap>
        <Text1 regular color={skinVars.colors.textSecondary}>
          {t.feedback.prompt}
        </Text1>
        {(["correct", "partial", "incorrect", "fabricated"] as const).map(
          (v) => (
            <Chip key={v} onPress={() => submit(v)}>
              {labels[v]}
            </Chip>
          ),
        )}
      </Inline>
      {error != null && (
        <Text1 regular color={skinVars.colors.error}>
          {t.feedback.error}
        </Text1>
      )}
    </Stack>
  );
}

// Small round avatar distinguishing the human from the governed agent.
function TurnAvatar({ kind }: { kind: "user" | "agent" }) {
  const isUser = kind === "user";
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isUser
          ? skinVars.colors.backgroundBrand
          : skinVars.colors.brandLow,
      }}
    >
      {isUser ? (
        <IconUserAccountRegular
          size={20}
          color={skinVars.colors.textPrimaryInverse}
        />
      ) : (
        <IconRobotRegular size={20} color={skinVars.colors.brand} />
      )}
    </div>
  );
}

// Live step list while the agent runs. Every row is a real milestone streamed
// from the backend — nothing here is simulated.
function RunProgress({
  steps,
  streamText,
  t,
}: {
  steps: AskStep[];
  streamText?: string | null;
  t: AskStrings;
}) {
  return (
    <Stack space={12}>
      {steps.length === 0 ? (
        <Inline space={12} alignItems="center">
          <Spinner size={24} />
          <Text2 medium color={skinVars.colors.brand}>
            {t.run.contacting}
          </Text2>
        </Inline>
      ) : (
        <Stack space={8}>
          {steps.map((s) => (
            <Inline space={8} alignItems="center" key={s.id}>
              {s.state === "done" ? (
                <IconCheckedRegular
                  size={16}
                  color={skinVars.colors.success}
                />
              ) : (
                <Spinner size={16} />
              )}
              <Text2
                regular
                color={
                  s.state === "done"
                    ? skinVars.colors.textSecondary
                    : skinVars.colors.textPrimary
                }
              >
                {s.label}
                {s.detail ? ` — ${s.detail}` : ""}
              </Text2>
            </Inline>
          ))}
        </Stack>
      )}
      {streamText ? (
        <div className="answer-markdown answer-markdown-muted">
          <Streamdown>
            {streamText.replace(/\[[^\]]*$/, "").replace(/\[[^\]]*S\s*\d[^\]]*\]/gi, "")}
          </Streamdown>
        </div>
      ) : null}
    </Stack>
  );
}

// After the answer lands, the step trail collapses into a quiet dropdown that
// expands to reveal every real agent action taken during the run.
function RunStepsSummary({ steps, t }: { steps: AskStep[]; t: AskStrings }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Stack space={8}>
      <Touchable
        onPress={() => setOpen((v) => !v)}
        aria-label={open ? t.run.hideActions : t.run.showActions}
      >
        <Inline space={8} alignItems="center">
          <IconCheckedRegular size={14} color={skinVars.colors.success} />
          <Text1 regular color={skinVars.colors.textSecondary}>
            {t.run.doneActions(steps.length)}
          </Text1>
          <div
            aria-hidden
            style={{
              display: "inline-flex",
              transition: "transform 0.15s ease",
              transform: open ? "rotate(180deg)" : "none",
            }}
          >
            <IconChevronDownRegular size={14} color={skinVars.colors.textSecondary} />
          </div>
        </Inline>
      </Touchable>
      {open && (
        <div style={{ maxWidth: 480 }}>
          <Boxed>
            <Box padding={16}>
              <Stack space={12}>
                <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                  {t.run.agentActions}
                </Text1>
                <Stack space={8}>
                  {steps.map((s, i) => (
                    <Inline space={12} alignItems="center" key={s.id}>
                      <Circle size={24} backgroundColor={skinVars.colors.brandLow}>
                        <Text1 medium color={skinVars.colors.brand}>
                          {i + 1}
                        </Text1>
                      </Circle>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Stack space={0}>
                          <Text2 medium color={skinVars.colors.textPrimary}>
                            {s.label}
                          </Text2>
                          {s.detail && (
                            <Text1 regular color={skinVars.colors.textSecondary}>
                              {s.detail}
                            </Text1>
                          )}
                        </Stack>
                      </div>
                      <IconCheckedRegular size={16} color={skinVars.colors.success} />
                    </Inline>
                  ))}
                </Stack>
              </Stack>
            </Box>
          </Boxed>
        </div>
      )}
    </Stack>
  );
}

/* ---------------------------------------------------------------- Answer */

// Answers are governed markdown. Citation markers ([S1], [S1, S2]) are
// rewritten into cite: links before rendering so Streamdown can hand them to
// a custom anchor that draws the familiar citation chip.
function renderAnswer(
  text: string,
  citations: Citation[],
  onOpenCitation: (c: Citation) => void,
) {
  const byId = new Map(citations.map((c) => [c.id, c]));
  const processed = text.replace(/\[([^\]]*)\](?!\()/g, (full, inner: string) => {
    if (!/S\s*\d/i.test(inner)) return full;
    const ids = [...inner.matchAll(/S\s*(\d+)/gi)].map((x) => `S${x[1]}`);
    return ids.map((id) => `[${id}](#cite-${id})`).join(" ");
  });
  return (
    <div className="answer-markdown">
      <Streamdown
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("#cite-")) {
              const id = href.slice(6);
              const cit = byId.get(id);
              return (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => cit && onOpenCitation(cit)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && cit) onOpenCitation(cit);
                  }}
                  style={{
                    display: "inline-flex",
                    backgroundColor: skinVars.colors.brandLow,
                    color: skinVars.colors.brand,
                    borderRadius: skinVars.borderRadii.indicator,
                    padding: "1px 6px",
                    margin: "0 2px",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    verticalAlign: "baseline",
                  }}
                >
                  {id}
                </span>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {processed}
      </Streamdown>
    </div>
  );
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
  onOpenDocument,
  t,
  lang,
}: {
  result: AskResult;
  axes: { id: string; name: string; color: string }[];
  onOpenCitation: (c: Citation) => void;
  onAskFollowup: (text: string) => void;
  onSave: () => void;
  saved: boolean;
  onExport: () => void;
  onDrillIn: () => void;
  onOpenDocument: (id: string) => void;
  t: AskStrings;
  lang: Lang;
}) {
  const answerAxes = axes.filter((a) => result.axisIds?.includes(a.id));

  if (result.status === "no_evidence") {
    return (
      <Stack space={16}>
        <StateBanner
          icon={
            <IconAlertRegular size={24} color={skinVars.colors.warning} />
          }
          tone="warning"
          title={t.answer.noEvidence}
          body={result.answer}
        />
        {result.adjacentDatum && (
          <Boxed>
            <Box padding={16}>
              <Text2 regular color={skinVars.colors.textSecondary}>
                {t.answer.closestDatum}{" "}
                <Text2 medium as="span">
                  {result.adjacentDatum.label} {result.adjacentDatum.value}
                  {result.adjacentDatum.unit
                    ? ` ${result.adjacentDatum.unit}`
                    : ""}
                </Text2>{" "}
                ({result.adjacentDatum.period}) {t.answer.datumSuffix}
              </Text2>
            </Box>
          </Boxed>
        )}
      </Stack>
    );
  }

  if (result.status === "permission_blocked") {
    return (
      <Stack space={16}>
        <StateBanner
          icon={
            <IconShieldCrossRegular size={24} color={skinVars.colors.error} />
          }
          tone="error"
          title={t.answer.permissionBlocked}
          body={result.answer}
          note={result.permissionNote}
        />
      </Stack>
    );
  }

  if (result.status === "conflict") {
    return (
      <Boxed>
        <Box padding={24}>
          <Stack space={24}>
            <Inline space={12} alignItems="center">
              <Circle size={44} backgroundColor={skinVars.colors.warningLow}>
                <IconWarningRegular
                  size={24}
                  color={skinVars.colors.warning}
                />
              </Circle>
              <Stack space={4}>
                <Title3>{t.answer.sourcesDisagree}</Title3>
                {renderAnswer(
                  result.answer,
                  result.citations,
                  onOpenCitation,
                )}
              </Stack>
            </Inline>
            {result.conflictNote && (
              <div
                style={{
                  backgroundColor: skinVars.colors.warningLow,
                  borderRadius: skinVars.borderRadii.container,
                  padding: "12px 16px",
                }}
              >
                <Text2 medium>{result.conflictNote}</Text2>
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 12,
              }}
            >
              {result.citations.map((c) => (
                <Touchable key={c.id} onPress={() => onOpenCitation(c)}>
                  <Boxed>
                    <Box padding={16}>
                      <Stack space={4}>
                        <Inline space="between" alignItems="center">
                          <div
                            style={{
                              backgroundColor: skinVars.colors.brandLow,
                              color: skinVars.colors.brand,
                              borderRadius: skinVars.borderRadii.indicator,
                              padding: "1px 6px",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {c.id}
                          </div>
                          <Tag type="warning">{validityLabel(c.validity, t)}</Tag>
                        </Inline>
                        <Text2 medium>{c.docTitle}</Text2>
                        {c.value && (
                          <Text5>{c.value}</Text5>
                        )}
                      </Stack>
                    </Box>
                  </Boxed>
                </Touchable>
              ))}
            </div>
            {result.resolutionPath && (
              <ButtonSecondary
                small
                onPress={onDrillIn}
                StartIcon={IconLinkRegular}
              >
                {t.answer.resolveIn(result.resolutionPath)}
              </ButtonSecondary>
            )}
          </Stack>
        </Box>
      </Boxed>
    );
  }

  // answered
  return (
    <Boxed>
      <Box padding={24}>
        <Stack space={24}>
          {result.lowConfidence && (
            <Callout
              asset={
                <IconTachometerRegular
                  size={24}
                  color={skinVars.colors.warning}
                />
              }
              title={t.answer.lowConfidence}
              description={
                result.lowConfidenceNote ?? t.answer.lowConfidenceFallback
              }
            />
          )}
          {result.historic && (
            <Callout
              asset={
                <IconWaitClockRegular
                  size={24}
                  color={skinVars.colors.warning}
                />
              }
              title={t.answer.historicMaterial}
              description={`${
                result.historicNote ?? t.answer.historicFallback
              }${result.historicPointer ? ` ${result.historicPointer}` : ""}`}
            />
          )}
          {result.corroborationNote && (
            <Callout
              asset={
                <IconCheckedRegular
                  size={24}
                  color={skinVars.colors.success}
                />
              }
              title={t.answer.corroborated}
              description={result.corroborationNote}
            />
          )}

          {result.numeric && <NumericFigure numeric={result.numeric} />}

          {renderAnswer(result.answer, result.citations, onOpenCitation)}

          {answerAxes.length > 0 && (
            <Inline space={8} wrap>
              {answerAxes.map((axis) => (
                <div
                  key={axis.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: axis.color || skinVars.colors.brand,
                    color: skinVars.colors.textPrimaryInverse,
                    borderRadius: skinVars.borderRadii.indicator,
                    padding: "4px 12px",
                  }}
                >
                  <IconLayersRegular
                    size={12}
                    color={skinVars.colors.textPrimaryInverse}
                  />
                  <Text1 medium color={skinVars.colors.textPrimaryInverse}>
                    {axis.name}
                  </Text1>
                </div>
              ))}
            </Inline>
          )}

          {result.attachmentAck && (
            <Callout
              asset={
                <IconClipRegular size={24} color={skinVars.colors.brand} />
              }
              title={t.answer.attachment}
              description={result.attachmentAck}
            />
          )}

          {result.documents && result.documents.length > 0 && (
            <Stack space={12}>
              <Divider />
              <Inline space={8} alignItems="center">
                <IconDocumentsRegular
                  size={16}
                  color={skinVars.colors.textSecondary}
                />
                <Text1
                  medium
                  color={skinVars.colors.textSecondary}
                  transform="uppercase"
                >
                  {t.documents.heading}
                </Text1>
              </Inline>
              <Stack space={12}>
                {result.documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onOpen={() => onOpenDocument(doc.id)}
                    t={t}
                  />
                ))}
              </Stack>
            </Stack>
          )}

          {result.externalSources && result.externalSources.length > 0 && (
            <Stack space={12}>
              <Divider />
              <Inline space={8} alignItems="center">
                <IconWorldDeviceRegular
                  size={16}
                  color={skinVars.colors.textSecondary}
                />
                <Text1
                  medium
                  color={skinVars.colors.textSecondary}
                  transform="uppercase"
                >
                  {t.answer.externalCoverage}
                </Text1>
              </Inline>
              <Text1 regular color={skinVars.colors.textSecondary}>
                {t.answer.externalCoverageNote}
              </Text1>
              <Stack space={8}>
                {result.externalSources.map((src, i) => (
                  <Boxed key={`ext-${i}`}>
                    <Box padding={16}>
                      <Stack space={4}>
                        {src.url ? (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: skinVars.colors.textLink,
                              textDecoration: "none",
                            }}
                          >
                            <Text2 medium color={skinVars.colors.textLink}>
                              {src.title}
                            </Text2>
                          </a>
                        ) : (
                          <Text2 medium color={skinVars.colors.textPrimary}>
                            {src.title}
                          </Text2>
                        )}
                        <Text1 regular color={skinVars.colors.textSecondary}>
                          {src.source}
                          {src.date ? ` · ${src.date}` : ""}
                        </Text1>
                        <Text2 regular color={skinVars.colors.textSecondary}>
                          {src.excerpt}
                        </Text2>
                      </Stack>
                    </Box>
                  </Boxed>
                ))}
              </Stack>
            </Stack>
          )}

          {result.citations.length > 0 && (
            <Stack space={12}>
              <Divider />
              <Inline space={8} alignItems="center">
                <IconDocumentsRegular
                  size={16}
                  color={skinVars.colors.textSecondary}
                />
                <Text1
                  medium
                  color={skinVars.colors.textSecondary}
                  transform="uppercase"
                >
                  {t.answer.evidence}
                </Text1>
              </Inline>
              <div
                style={{
                  display: "flex",
                  overflowX: "auto",
                  gap: 12,
                  paddingBottom: 8,
                }}
              >
                {result.citations.map((cit) => (
                  <EvidenceChip
                    key={cit.id}
                    citation={cit}
                    onOpen={() => onOpenCitation(cit)}
                    t={t}
                    lang={lang}
                  />
                ))}
              </div>
            </Stack>
          )}

          <Divider />

          <Inline space={8} wrap alignItems="center">
            <ButtonLink
              disabled={result.citations.length === 0}
              onPress={() =>
                result.citations[0] && onOpenCitation(result.citations[0])
              }
            >
              {t.answer.sources}
            </ButtonLink>
            <ButtonLink onPress={onExport}>{t.answer.exportToGenerate}</ButtonLink>
            <ButtonLink onPress={onSave}>
              {saved ? t.answer.saved : t.answer.saveInsight}
            </ButtonLink>
            <ButtonLink onPress={onDrillIn}>{t.answer.drillIntoData}</ButtonLink>
          </Inline>

          {result.suggestedNext && result.suggestedNext.length > 0 && (
            <Stack space={8}>
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                {t.answer.suggestedNext}
              </Text1>
              <Inline space={8} wrap>
                {result.suggestedNext.map((s) => (
                  <Chip
                    key={s.id}
                    Icon={IconArrowRightRegular}
                    onPress={() => onAskFollowup(s.text)}
                  >
                    {s.text}
                  </Chip>
                ))}
              </Inline>
            </Stack>
          )}
        </Stack>
      </Box>
    </Boxed>
  );
}

/* ------------------------------------------------------- generated documents */

// A branded file card for one generated document: template + governance meta,
// an Open action into the workspace artifact panel, one download affordance
// per offered format, and a ZIP pack download. A Guardian-blocked document
// renders with downloads locked and the server's own explanation — the
// buttons are never silently dead, and its content stays reviewable in the
// panel alongside the Guardian findings.
function DocumentCard({
  doc,
  compact,
  onOpen,
  t,
}: {
  doc: AskDocumentSummary;
  compact?: boolean;
  onOpen?: () => void;
  t: AskStrings;
}) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const blocked = doc.guardianStatus === "block";

  const download = async (format?: string) => {
    if (busy) return;
    setError(null);
    setBusy(format ?? "pack");
    try {
      await downloadAskDocument(doc.id, format);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : t.documents.downloadFailed,
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <Boxed>
      <Box padding={compact ? 12 : 16}>
        <Stack space={12}>
          <Inline space={12} alignItems="center">
            <Circle
              size={40}
              backgroundColor={
                blocked ? skinVars.colors.errorLow : skinVars.colors.brandLow
              }
            >
              <IconDocumentsRegular
                size={20}
                color={blocked ? skinVars.colors.error : skinVars.colors.brand}
              />
            </Circle>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Stack space={2}>
                <Text2 medium truncate={compact ? 1 : 2}>
                  {doc.title}
                </Text2>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {doc.templateName} · {doc.confidentiality} ·{" "}
                  {t.documents.citationsCount(doc.citationsCount)}
                </Text1>
              </Stack>
            </div>
            {blocked && <Tag type="error">{t.documents.guardianBlocked}</Tag>}
          </Inline>

          {blocked ? (
            <Stack space={8}>
              <Text1 regular color={skinVars.colors.textSecondary}>
                {doc.note ?? doc.guardianSummary}
              </Text1>
              {onOpen && (
                <Inline space={12}>
                  <ButtonLink small onPress={onOpen}>
                    {t.documents.open}
                  </ButtonLink>
                </Inline>
              )}
            </Stack>
          ) : (
            <Inline space={12} wrap alignItems="center">
              {onOpen && (
                <ButtonLink small onPress={onOpen}>
                  {t.documents.open}
                </ButtonLink>
              )}
              {doc.formats.map((format) => (
                <ButtonLink
                  key={format}
                  small
                  disabled={busy !== null}
                  onPress={() => download(format)}
                >
                  {busy === format ? "…" : `.${format}`}
                </ButtonLink>
              ))}
              {doc.formats.length > 1 && (
                <ButtonLink
                  small
                  disabled={busy !== null}
                  onPress={() => download()}
                  StartIcon={IconDownloadRegular}
                >
                  {busy === "pack" ? "…" : t.documents.downloadPack}
                </ButtonLink>
              )}
            </Inline>
          )}

          {error && (
            <Text1 regular color={skinVars.colors.error}>
              {error}
            </Text1>
          )}
        </Stack>
      </Box>
    </Boxed>
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
  const bg =
    tone === "error" ? skinVars.colors.errorLow : skinVars.colors.warningLow;
  return (
    <div
      style={{
        backgroundColor: bg,
        borderRadius: skinVars.borderRadii.container,
        padding: 24,
      }}
    >
      <Inline space={16} alignItems="center">
        <div style={{ flexShrink: 0 }}>{icon}</div>
        <Stack space={8}>
          <Title3>{title}</Title3>
          <Text2 regular>{body}</Text2>
          {note && (
            <div
              style={{
                backgroundColor: applyAlpha(skinVars.rawColors.inverse, 0.6),
                borderRadius: skinVars.borderRadii.container,
                padding: "8px 12px",
              }}
            >
              <Text2 medium>{note}</Text2>
            </div>
          )}
        </Stack>
      </Inline>
    </div>
  );
}

function NumericFigure({
  numeric,
}: {
  numeric: NonNullable<AskResult["numeric"]>;
}) {
  return (
    <div
      style={{
        backgroundColor: skinVars.colors.brandLow,
        borderRadius: skinVars.borderRadii.container,
        padding: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <Stack space={8}>
        <Text1
          medium
          color={skinVars.colors.brand}
          transform="uppercase"
        >
          {numeric.label}
        </Text1>
        <Inline space={4} alignItems="baseline">
          <Text8>{numeric.value}</Text8>
          <Text3 medium color={skinVars.colors.brand}>
            {numeric.unit}
          </Text3>
        </Inline>
      </Stack>
      <div style={{ textAlign: "right" }}>
        <Stack space={8}>
          <div
            style={{
              backgroundColor: applyAlpha(skinVars.rawColors.inverse, 0.6),
              borderRadius: skinVars.borderRadii.indicator,
              padding: "4px 12px",
            }}
          >
            <Text1 medium color={skinVars.colors.brand}>
              {numeric.period}
            </Text1>
          </div>
          <Text1
            regular
            color={skinVars.colors.textSecondary}
            transform="uppercase"
          >
            {numeric.source}
          </Text1>
        </Stack>
      </div>
    </div>
  );
}

function EvidenceChip({
  citation,
  onOpen,
  t,
  lang,
}: {
  citation: Citation;
  onOpen: () => void;
  t: AskStrings;
  lang: Lang;
}) {
  return (
    <div style={{ width: 300, flexShrink: 0 }}>
      <Touchable onPress={onOpen}>
        <Boxed>
          <Box padding={12}>
            <Inline space={12} alignItems="center">
              <div
                style={{
                  backgroundColor: skinVars.colors.brandLow,
                  color: skinVars.colors.brand,
                  borderRadius: skinVars.borderRadii.indicator,
                  padding: "4px 8px",
                  fontWeight: 700,
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {citation.id}
              </div>
              <Stack space={4}>
                <Text2 medium truncate={1}>
                  {citation.docTitle}
                </Text2>
                <Text1
                  regular
                  color={skinVars.colors.textSecondary}
                  truncate={1}
                >
                  {citation.sourceLoc}
                </Text1>
                <Inline space={8} wrap alignItems="center">
                  {citation.value && (
                    <Text1 medium color={skinVars.colors.success}>
                      {citation.value}
                    </Text1>
                  )}
                  <Tag type="inactive">{clearanceLabel(citation.confidentiality, lang)}</Tag>
                  {citation.conflicting && (
                    <Tag type="warning">{t.evidence.conflict}</Tag>
                  )}
                  {typeof citation.corroboration === "number" &&
                    citation.corroboration >= 2 && (
                      <Text1 medium color={skinVars.colors.success}>
                        {t.evidence.agree(citation.corroboration)}
                      </Text1>
                    )}
                </Inline>
              </Stack>
            </Inline>
          </Box>
        </Boxed>
      </Touchable>
    </div>
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
  t,
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
  t: AskStrings;
}) {
  return (
    <div
      style={{
        borderTop: `1px solid ${skinVars.colors.divider}`,
        backgroundColor: skinVars.colors.backgroundContainer,
        padding: "16px 24px",
        flexShrink: 0,
      }}
    >
      <div style={{ maxWidth: 896, margin: "0 auto" }}>
        <Stack space={8}>
          {attachment && (
            <div
              style={{
                backgroundColor: skinVars.colors.backgroundAlternative,
                borderRadius: skinVars.borderRadii.container,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Inline space={8} alignItems="center">
                <IconClipRegular size={16} color={skinVars.colors.brand} />
                <Text2 medium>{attachment.name}</Text2>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {t.composer.workingContext}
                </Text1>
              </Inline>
              <Inline space={12} alignItems="center">
                <Chip active={attachment.ingest} onPress={onToggleIngest}>
                  {attachment.ingest
                    ? t.composer.willIngest
                    : t.composer.ingestToCorpus}
                </Chip>
                <IconButton
                  aria-label={t.composer.removeAttachment}
                  onPress={onRemoveAttachment}
                  Icon={IconCloseRegular}
                  small
                />
              </Inline>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              border: `1px solid ${skinVars.colors.divider}`,
              borderRadius: skinVars.borderRadii.container,
              backgroundColor: skinVars.colors.background,
              padding: "8px 8px 8px 12px",
            }}
          >
            <IconButton
              aria-label={t.composer.attachDocument}
              onPress={onAttach}
              Icon={IconClipRegular}
              small
            />
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,.json"
              style={{ display: "none" }}
              onChange={onFile}
            />
            <textarea
              placeholder={
                filtersActive
                  ? t.composer.placeholderScoped
                  : t.composer.placeholderDefault
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                resize: "none",
                minHeight: 40,
                maxHeight: 200,
                backgroundColor: "transparent",
                color: skinVars.colors.textPrimary,
                fontFamily: "inherit",
                fontSize: 16,
                lineHeight: "24px",
                padding: "8px 0",
              }}
            />
            <IconButton
              aria-label={t.composer.sendQuestion}
              type="brand"
              onPress={onSend}
              disabled={!input.trim() || disabled}
              Icon={IconSendRegular}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <Inline space={4} alignItems="center">
              <IconShieldCheckedOkRegular
                size={12}
                color={skinVars.colors.textSecondary}
              />
              <Text1 regular color={skinVars.colors.textSecondary}>
                {t.composer.permissionNote}
              </Text1>
            </Inline>
          </div>
        </Stack>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Drawer */

function CitationDrawer({
  citation,
  axes,
  onClose,
  t,
  lang,
}: {
  citation: Citation;
  axes: { id: string; name: string }[];
  onClose: () => void;
  t: AskStrings;
  lang: Lang;
}) {
  return (
    <Drawer
      onClose={onClose}
      onDismiss={onClose}
      width={720}
      title={citation.docTitle}
      subtitle={citation.sourceLoc}
    >
      <Stack space={24}>
        <Inline space={8} alignItems="center" wrap>
          <div
            style={{
              backgroundColor: skinVars.colors.brandLow,
              color: skinVars.colors.brand,
              borderRadius: skinVars.borderRadii.indicator,
              padding: "4px 12px",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {t.drawer.citation(citation.id)}
          </div>
          <Tag type={citation.validity === "approved" ? "success" : "warning"}>
            {validityLabel(citation.validity, t)}
          </Tag>
          <Tag
            type={citation.confidentiality === "public" ? "inactive" : "error"}
          >
            {clearanceLabel(citation.confidentiality, lang)}
          </Tag>
        </Inline>

        {/* Layer 1 — governance */}
        <DrawerLayer
          index={1}
          title={t.drawer.governance}
          icon={
            <IconShieldCheckedOkRegular
              size={16}
              color={skinVars.colors.brand}
            />
          }
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 16,
            }}
          >
            <Field label={t.drawer.version} value={citation.version} />
            <Field label={t.drawer.owner} value={citation.owner} />
            <Field
              label={t.drawer.confidence}
              value={`${Math.round(citation.confidence * 100)}%`}
            />
            {citation.validUntil && (
              <Field label={t.drawer.validUntil} value={citation.validUntil} />
            )}
            {typeof citation.relevance === "number" && (
              <Field
                label={t.drawer.relevance}
                value={`${Math.round(citation.relevance * 100)}%`}
              />
            )}
            {typeof citation.corroboration === "number" &&
              citation.corroboration >= 2 && (
                <Field
                  label={t.drawer.corroboration}
                  value={t.drawer.corroborationSources(citation.corroboration)}
                />
              )}
            {citation.conflicting && (
              <Field label={t.drawer.conflict} value={t.drawer.disagrees} />
            )}
          </div>
        </DrawerLayer>

        {/* Layer 2 — evidence snippet */}
        <DrawerLayer
          index={2}
          title={t.drawer.evidence}
          icon={
            <IconDocumentsRegular size={16} color={skinVars.colors.brand} />
          }
        >
          <div
            style={{
              backgroundColor: skinVars.colors.backgroundAlternative,
              borderRadius: skinVars.borderRadii.container,
              padding: 20,
            }}
          >
            <Stack space={12}>
              <Text3 regular>“{citation.snippet}”</Text3>
              {citation.value && (
                <Inline space={8} alignItems="baseline">
                  <Text5>{citation.value}</Text5>
                  {citation.period ? (
                    <Text2 regular color={skinVars.colors.textSecondary}>
                      {citation.period}
                    </Text2>
                  ) : null}
                </Inline>
              )}
            </Stack>
          </div>
        </DrawerLayer>

        {/* Layer 3 — semantic layer */}
        <DrawerLayer
          index={3}
          title={t.drawer.semanticLayer}
          icon={
            <IconNeuralNetworkRegular
              size={16}
              color={skinVars.colors.brand}
            />
          }
        >
          <Stack space={12}>
            {citation.topics && citation.topics.length > 0 && (
              <TagRow label={t.drawer.topics} tags={citation.topics} />
            )}
            {citation.entities && citation.entities.length > 0 && (
              <TagRow label={t.drawer.entities} tags={citation.entities} />
            )}
            {citation.axisIds && citation.axisIds.length > 0 && (
              <TagRow
                label={t.drawer.axes}
                tags={citation.axisIds.map(
                  (id) => axes.find((a) => a.id === id)?.name ?? id,
                )}
              />
            )}
            {(citation.country || citation.brand) && (
              <TagRow
                label={t.drawer.scope}
                tags={[citation.country, citation.brand].filter(
                  (v): v is string => Boolean(v),
                )}
              />
            )}
          </Stack>
        </DrawerLayer>
      </Stack>
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
    <Stack space={12}>
      <Inline space={8} alignItems="center">
        <Circle size={24} backgroundColor={skinVars.colors.backgroundBrand}>
          <Text1 medium color={skinVars.colors.textPrimaryInverse}>
            {index}
          </Text1>
        </Circle>
        {icon}
        <Text1
          medium
          color={skinVars.colors.textSecondary}
          transform="uppercase"
        >
          {title}
        </Text1>
      </Inline>
      {children}
    </Stack>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack space={4}>
      <Text1
        medium
        color={skinVars.colors.textSecondary}
        transform="uppercase"
      >
        {label}
      </Text1>
      <Text2 medium>{value}</Text2>
    </Stack>
  );
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  return (
    <Inline space={8} alignItems="center">
      <div style={{ width: 64, flexShrink: 0 }}>
        <Text1
          medium
          color={skinVars.colors.textSecondary}
          transform="uppercase"
        >
          {label}
        </Text1>
      </div>
      <Inline space={8} wrap>
        {tags.map((t, i) => (
          <div
            key={i}
            style={{
              backgroundColor: skinVars.colors.backgroundAlternative,
              borderRadius: skinVars.borderRadii.indicator,
              padding: "4px 8px",
            }}
          >
            <Text1 regular>{t}</Text1>
          </div>
        ))}
      </Inline>
    </Inline>
  );
}
