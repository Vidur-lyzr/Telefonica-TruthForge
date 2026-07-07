import React from "react";
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
  Menu,
  Spinner,
  Touchable,
  Circle,
  skinVars,
  applyAlpha,
  IconSendRegular,
  IconAlertRegular,
  IconShieldCrossRegular,
  IconWaitClockRegular,
  IconSearchRegular,
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
  IconLightningRegular,
  IconArrowRightRegular,
  IconWorldDeviceRegular,
  IconShieldCheckedOkRegular,
  IconDatabaseRegular,
  IconNeuralNetworkRegular,
  IconTachometerRegular,
  IconMessageRegular,
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
  const [insights, setInsights] = React.useState<SavedInsight[]>(() =>
    loadInsights(),
  );

  const fileRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const autoRanRef = React.useRef<string | null>(null);

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

  // On persona switch, surface that persona's most recent conversation (or a
  // clean slate). A conversation from another persona must never stay active, so
  // a lower-clearance persona can never see or resume a higher-clearance thread.
  React.useEffect(() => {
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
  React.useEffect(() => {
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

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }} ref={scrollRef}>
        <div
          style={{
            maxWidth: 896,
            margin: "0 auto",
            padding: "32px 24px",
          }}
        >
          {isEmpty && !isPending && (
            <FirstRun suggestions={suggestions} onPick={(t) => handleAsk(t)} />
          )}

          <Stack space={40}>
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
      />

      {selectedCitation && (
        <CitationDrawer
          citation={selectedCitation}
          axes={axes ?? []}
          onClose={() => setSelectedCitation(null)}
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
          <Text3 medium>Governed assistant</Text3>
          <Text1 regular color={skinVars.colors.textSecondary}>
            Scope: {area} · answers are cited, permission-aware and honest
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
          Filters
        </Chip>

        <Menu
          renderTarget={({ ref, onPress }) => (
            <span ref={ref}>
              <ButtonSecondary small onPress={onPress}>
                History
              </ButtonSecondary>
            </span>
          )}
          renderMenu={({ ref, className, close }) => (
            <div ref={ref} className={className}>
              <div style={{ width: 320, padding: 8 }}>
                <Stack space={4}>
                  <Touchable
                    disabled={!canReset}
                    onPress={() => {
                      onNew();
                      close();
                    }}
                  >
                    <Box paddingX={8} paddingY={8}>
                      <Inline space={8} alignItems="center">
                        <IconAddMoreCircleRegular
                          size={18}
                          color={skinVars.colors.brand}
                        />
                        <Text2 medium>New conversation</Text2>
                      </Inline>
                    </Box>
                  </Touchable>

                  <Divider />

                  <Box paddingX={8} paddingY={4}>
                    <Text1
                      medium
                      color={skinVars.colors.textSecondary}
                      transform="uppercase"
                    >
                      Conversations ({conversations.length})
                    </Text1>
                  </Box>

                  {conversations.length === 0 && (
                    <Box paddingX={8} paddingY={8}>
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        No prior conversations for this persona yet.
                      </Text1>
                    </Box>
                  )}

                  {conversations.slice(0, 8).map((c) => {
                    const first = c.turns[0]?.question ?? "New conversation";
                    const isActive = c.id === activeId;
                    return (
                      <Touchable
                        key={c.id}
                        onPress={() => {
                          onResume(c.id);
                          close();
                        }}
                      >
                        <div
                          style={{
                            borderRadius: skinVars.borderRadii.container,
                            backgroundColor: isActive
                              ? skinVars.colors.brandLow
                              : "transparent",
                            padding: "8px",
                          }}
                        >
                          <Inline space={8} alignItems="center">
                            <IconMessageRegular
                              size={16}
                              color={skinVars.colors.brand}
                            />
                            <Stack space={2}>
                              <Text2 regular truncate={1}>
                                {first}
                              </Text2>
                              <Text1
                                regular
                                color={skinVars.colors.textSecondary}
                              >
                                {c.turns.length} turn
                                {c.turns.length === 1 ? "" : "s"} ·{" "}
                                {formatRelativeTime(c.updatedAt)}
                              </Text1>
                            </Stack>
                          </Inline>
                        </div>
                      </Touchable>
                    );
                  })}

                  <Divider />

                  <Box paddingX={8} paddingY={4}>
                    <Text1
                      medium
                      color={skinVars.colors.textSecondary}
                      transform="uppercase"
                    >
                      Saved insights ({insights.length})
                    </Text1>
                  </Box>

                  {insights.length === 0 && (
                    <Box paddingX={8} paddingY={8}>
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        Save an answer to pin it here.
                      </Text1>
                    </Box>
                  )}

                  {insights.slice(0, 6).map((i) => (
                    <Box key={i.id} paddingX={8} paddingY={8}>
                      <Inline space={8} alignItems="center">
                        <IconBookmarkRegular
                          size={16}
                          color={skinVars.colors.brand}
                        />
                        <Text2 regular truncate={2}>
                          {i.question}
                        </Text2>
                      </Inline>
                    </Box>
                  ))}
                </Stack>
              </div>
            </div>
          )}
        />
      </Inline>
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
}: {
  filters: AskFilters;
  setFilters: (f: AskFilters) => void;
  options: { market: string[]; brand: string[]; period: string[]; source: string[] };
  axes: { id: string; name: string }[];
  onClear: () => void;
}) {
  const set = (k: keyof AskFilters, v: string | null) =>
    setFilters({ ...filters, [k]: v });
  const opt = (arr: string[]) => [
    { value: "", text: "All" },
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
          Retrieval scope
        </Text1>
        <div style={{ width: 160 }}>
          <Select
            name="market"
            label="Market"
            value={filters.market ?? ""}
            onChangeValue={(v) => set("market", v || null)}
            options={opt(options.market)}
            fullWidth
          />
        </div>
        <div style={{ width: 160 }}>
          <Select
            name="brand"
            label="Brand"
            value={filters.brand ?? ""}
            onChangeValue={(v) => set("brand", v || null)}
            options={opt(options.brand)}
            fullWidth
          />
        </div>
        <div style={{ width: 160 }}>
          <Select
            name="period"
            label="Period"
            value={filters.period ?? ""}
            onChangeValue={(v) => set("period", v || null)}
            options={opt(options.period)}
            fullWidth
          />
        </div>
        <div style={{ width: 160 }}>
          <Select
            name="source"
            label="Source"
            value={filters.source ?? ""}
            onChangeValue={(v) => set("source", v || null)}
            options={opt(options.source)}
            fullWidth
          />
        </div>
        <div style={{ width: 180 }}>
          <Select
            name="axis"
            label="Axis"
            value={filters.axis ?? ""}
            onChangeValue={(v) => set("axis", v || null)}
            options={[
              { value: "", text: "All" },
              ...axes.map((a) => ({ value: a.id, text: a.name })),
            ]}
            fullWidth
          />
        </div>
        {hasActiveFilters(filters) && (
          <ButtonLink onPress={onClear}>Clear</ButtonLink>
        )}
      </Inline>
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
    <Box paddingY={40}>
      <Stack space={32}>
        <Stack space={12}>
          <Text8>Ask the governed source of truth</Text8>
          <Text3 regular color={skinVars.colors.textSecondary}>
            Every answer is backed by cited evidence — or an honest no-evidence,
            permission-blocked, conflict or historic response. Nothing is
            fabricated.
          </Text3>
        </Stack>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 12,
          }}
        >
          {suggestions?.map((s) => (
            <Touchable key={s.id} onPress={() => onPick(s.text)}>
              <Boxed>
                <Box padding={16}>
                  <Stack space={8}>
                    <Tag type="info">{s.kind.replace("_", " ")}</Tag>
                    <Text2 medium>{s.text}</Text2>
                  </Stack>
                </Box>
              </Boxed>
            </Touchable>
          ))}
        </div>
      </Stack>
    </Box>
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
    <Stack space={24}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
      </div>

      {turn.pending && <Thinking />}

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
            <Text2 regular>
              The Hub could not complete this request. Please try again.
            </Text2>
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
        />
      )}
    </Stack>
  );
}

function Thinking() {
  return (
    <Inline space={12} alignItems="center">
      <Spinner size={32} />
      <Text2 medium color={skinVars.colors.brand}>
        Retrieving governed evidence…
      </Text2>
    </Inline>
  );
}

/* ---------------------------------------------------------------- Answer */

function renderAnswer(
  text: string,
  citations: Citation[],
  onOpenCitation: (c: Citation) => void,
) {
  const byId = new Map(citations.map((c) => [c.id, c]));
  return (
    <Stack space={12}>
      {text.split("\n").map((para, pi) => {
        if (!para.trim()) return null;
        const parts = para.split(/(\[[^\]]*\])/g);
        return (
          <Text3 regular key={pi} as="p">
            {parts.map((part, idx) => {
              const m = part.match(/^\[([^\]]*)\]$/);
              if (m && /S\s*\d/i.test(m[1])) {
                const ids = [...m[1].matchAll(/S\s*(\d+)/gi)].map(
                  (x) => `S${x[1]}`,
                );
                return (
                  <span
                    key={idx}
                    style={{ display: "inline-flex", gap: 2, margin: "0 2px" }}
                  >
                    {ids.map((id) => {
                      const cit = byId.get(id);
                      return (
                        <Touchable
                          key={id}
                          onPress={() => cit && onOpenCitation(cit)}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              backgroundColor: skinVars.colors.brandLow,
                              borderRadius: skinVars.borderRadii.indicator,
                              padding: "1px 6px",
                            }}
                          >
                            <Text1 medium color={skinVars.colors.brand}>
                              {id}
                            </Text1>
                          </span>
                        </Touchable>
                      );
                    })}
                  </span>
                );
              }
              return <React.Fragment key={idx}>{part}</React.Fragment>;
            })}
          </Text3>
        );
      })}
    </Stack>
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
      <Stack space={16}>
        <StateBanner
          icon={
            <IconAlertRegular size={24} color={skinVars.colors.warning} />
          }
          tone="warning"
          title="No evidence"
          body={result.answer}
        />
        {result.adjacentDatum && (
          <Boxed>
            <Box padding={16}>
              <Text2 regular color={skinVars.colors.textSecondary}>
                Closest governed datum:{" "}
                <Text2 medium as="span">
                  {result.adjacentDatum.label} {result.adjacentDatum.value}
                  {result.adjacentDatum.unit
                    ? ` ${result.adjacentDatum.unit}`
                    : ""}
                </Text2>{" "}
                ({result.adjacentDatum.period}) — offered as context, not an
                answer.
              </Text2>
            </Box>
          </Boxed>
        )}
        <RetrievalModes modes={result.retrievalModes} />
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
          title="Permission blocked"
          body={result.answer}
          note={result.permissionNote}
        />
        <RetrievalModes modes={result.retrievalModes} />
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
                <Title3>Sources disagree</Title3>
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
                          <Tag type="warning">{c.validity}</Tag>
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
                Resolve in {result.resolutionPath}
              </ButtonSecondary>
            )}
            <RetrievalModes modes={result.retrievalModes} />
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
              title="Low confidence"
              description={
                result.lowConfidenceNote ??
                "Low confidence: this rests on a single, unverified source."
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
              title="Historic material"
              description={`${
                result.historicNote ??
                "This answer draws on historic or superseded material."
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
              title="Corroborated"
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
              title="Attachment"
              description={result.attachmentAck}
            />
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
                  Evidence
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
                  />
                ))}
              </div>
            </Stack>
          )}

          <RetrievalModes modes={result.retrievalModes} />

          <Divider />

          <Inline space={8} wrap alignItems="center">
            <ButtonLink
              disabled={result.citations.length === 0}
              onPress={() =>
                result.citations[0] && onOpenCitation(result.citations[0])
              }
            >
              Sources
            </ButtonLink>
            <ButtonLink onPress={onExport}>Export to Generate</ButtonLink>
            <ButtonLink onPress={onSave}>
              {saved ? "Saved" : "Save insight"}
            </ButtonLink>
            <ButtonLink onPress={onDrillIn}>Drill into Data</ButtonLink>
          </Inline>

          {result.suggestedNext && result.suggestedNext.length > 0 && (
            <Stack space={8}>
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                Suggested next
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
}: {
  citation: Citation;
  onOpen: () => void;
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
                  <Tag type="inactive">{citation.confidentiality}</Tag>
                  {citation.conflicting && (
                    <Tag type="warning">conflict</Tag>
                  )}
                  {typeof citation.corroboration === "number" &&
                    citation.corroboration >= 2 && (
                      <Text1 medium color={skinVars.colors.success}>
                        +{citation.corroboration} agree
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

function RetrievalModes({
  modes,
}: {
  modes?: AskResult["retrievalModes"];
}) {
  if (!modes || modes.length === 0) return null;
  const iconFor = (mode: string, color: string) => {
    if (mode === "graph")
      return <IconNeuralNetworkRegular size={14} color={color} />;
    if (mode === "agentic")
      return <IconTachometerRegular size={14} color={color} />;
    if (mode === "keyword")
      return <IconSearchRegular size={14} color={color} />;
    return <IconLayersRegular size={14} color={color} />;
  };
  return (
    <Inline space={8} wrap alignItems="center">
      <Text1
        medium
        color={skinVars.colors.textSecondary}
        transform="uppercase"
      >
        Retrieval
      </Text1>
      {modes.map((m) => {
        const color = m.used
          ? skinVars.colors.brand
          : skinVars.colors.textSecondary;
        return (
          <div
            key={m.mode}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: m.used
                ? skinVars.colors.brandLow
                : skinVars.colors.backgroundAlternative,
              borderRadius: skinVars.borderRadii.indicator,
              padding: "4px 8px",
              opacity: m.used ? 1 : 0.6,
            }}
          >
            {iconFor(m.mode, color)}
            <Text1 medium color={color}>
              {m.label}
            </Text1>
          </div>
        );
      })}
    </Inline>
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
                  working context
                </Text1>
              </Inline>
              <Inline space={12} alignItems="center">
                <Chip active={attachment.ingest} onPress={onToggleIngest}>
                  {attachment.ingest
                    ? "Will ingest as E-data"
                    : "Ingest to corpus"}
                </Chip>
                <IconButton
                  aria-label="Remove attachment"
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
              aria-label="Attach a working document"
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
                  ? "Ask within the active retrieval scope…"
                  : "Ask about strategy, brand, or corporate facts…"
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
              aria-label="Send question"
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
                Answers are permission-filtered before the model sees any source.
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
}: {
  citation: Citation;
  axes: { id: string; name: string }[];
  onClose: () => void;
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
            Citation [{citation.id}]
          </div>
          <Tag type={citation.validity === "approved" ? "success" : "warning"}>
            {citation.validity}
          </Tag>
          <Tag
            type={citation.confidentiality === "public" ? "inactive" : "error"}
          >
            {citation.confidentiality}
          </Tag>
        </Inline>

        {/* Layer 1 — governance */}
        <DrawerLayer
          index={1}
          title="Governance"
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
          title="Semantic layer"
          icon={
            <IconNeuralNetworkRegular
              size={16}
              color={skinVars.colors.brand}
            />
          }
        >
          <Stack space={12}>
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
