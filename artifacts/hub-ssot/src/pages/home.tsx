import React from "react";
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
import telefonicaLogo from "@/assets/telefonica-logo.png";
import {
  Box,
  Stack,
  Inline,
  Boxed,
  Divider,
  ResponsiveLayout,
  Circle,
  Touchable,
  TextField,
  ButtonPrimary,
  IconButton,
  Text1,
  Text2,
  Text3,
  Text6,
  Title2,
  SkeletonLine,
  ProgressBar,
  skinVars,
  IconSendRegular,
  IconAiRegular,
  IconBarChartRegular,
  IconCalendarRegular,
  IconChatRegular,
  IconAntennaRegular,
  IconBookRegular,
  IconListRegular,
  IconArrowLineUpRegular,
  IconShieldCheckedOkRegular,
  IconAlertRegular,
  IconWorldDeviceRegular,
  IconDataCheckedRegular,
  IconTimeRegular,
} from "@telefonica/mistica";

type AppKey = "generate" | "kpis" | "planning" | "ask";

type IconType = React.ComponentType<{ size?: number; color?: string }>;

const CARD_META: Record<
  AppKey,
  { title: string; path: string; icon: IconType; blurb: string }
> = {
  generate: {
    title: "Generate",
    path: "/generate",
    icon: IconAiRegular,
    blurb: "Draft governed communications with cited evidence.",
  },
  kpis: {
    title: "KPIs",
    path: "/kpis",
    icon: IconBarChartRegular,
    blurb: "Track the metrics that back every corporate claim.",
  },
  planning: {
    title: "Planning",
    path: "/planning",
    icon: IconCalendarRegular,
    blurb: "See what is scheduled and where plans collide.",
  },
  ask: {
    title: "Ask",
    path: "/ask",
    icon: IconChatRegular,
    blurb: "Question the corpus and get cited, honest answers.",
  },
};

const RADAR_KIND_META: Record<string, { label: string; icon: IconType }> = {
  external_signal: { label: "External signal", icon: IconAntennaRegular },
  knowledge_event: { label: "Knowledge event", icon: IconBookRegular },
  your_queue: { label: "Your queue", icon: IconListRegular },
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
  const [text, setText] = React.useState("");
  const [rotation, setRotation] = React.useState(0);

  // Rotate real example prompts drawn from the governed suggestions endpoint.
  // Only cited/answerable prompts are used as invitations; rotation pauses once
  // the user starts typing so it never fights their input.
  const prompts = React.useMemo(
    () => suggestions.filter((s) => s.kind === "cited").map((s) => s.text),
    [suggestions],
  );

  React.useEffect(() => {
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Enter on an empty bar accepts the currently shown example prompt.
      submit(text.trim() ? text : rotatingPrompt);
    }
  };

  const disabled = (!text.trim() && !rotatingPrompt) || !roleId;

  return (
    <Stack space={12}>
      <div style={{ position: "relative" }} onKeyDown={onKeyDown}>
        <TextField
          key={placeholder}
          name="ask"
          fullWidth
          label={placeholder}
          value={text}
          onChangeValue={setText}
          endIcon={
            <IconButton
              aria-label="Ask"
              onPress={() => submit(text.trim() ? text : rotatingPrompt)}
              disabled={disabled}
              Icon={IconSendRegular}
              type="brand"
              small
            />
          }
        />
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Inline space={8} alignItems="center">
          <IconShieldCheckedOkRegular size={16} color={skinVars.colors.brand} />
          <Text2 regular color={skinVars.colors.textSecondary}>
            {COPY[lang].honesty}
          </Text2>
        </Inline>
      </div>
    </Stack>
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
    <Touchable onPress={() => navigate(meta.path)} aria-label={meta.title}>
      <Boxed>
        <Box padding={16}>
          <Inline space={12} alignItems="center">
            <Circle
              size={32}
              backgroundColor={warning ? skinVars.colors.warningLow : skinVars.colors.brandLow}
            >
              <Icon size={16} color={warning ? skinVars.colors.warning : skinVars.colors.brand} />
            </Circle>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Stack space={2}>
                <Text1
                  medium
                  color={skinVars.colors.textSecondary}
                  transform="uppercase"
                >
                  {meta.title}
                </Text1>
                {loading || !stat ? (
                  <SkeletonLine width="60%" />
                ) : (
                  <Inline space={4} alignItems="baseline">
                    <Text3
                      medium
                      color={warning ? skinVars.colors.warning : axisColor || skinVars.colors.textPrimary}
                    >
                      {stat.value}
                    </Text3>
                    <Text1 regular color={skinVars.colors.textSecondary}>
                      {stat.caption}
                    </Text1>
                  </Inline>
                )}
              </Stack>
            </div>
          </Inline>
        </Box>
      </Boxed>
    </Touchable>
  );
}

function RadarRow({ item, axisColor }: { item: RadarItem; axisColor?: string }) {
  const [, navigate] = useLocation();
  const meta = RADAR_KIND_META[item.kind] ?? RADAR_KIND_META.knowledge_event;
  const Icon = meta.icon;
  const warning = item.tone === "warning";

  return (
    <Touchable onPress={() => navigate(item.href)} aria-label={item.title}>
      <Box padding={16}>
        <Inline space={16} alignItems="center">
          <Circle
            size={36}
            backgroundColor={warning ? skinVars.colors.warningLow : skinVars.colors.brandLow}
          >
            <Icon size={16} color={warning ? skinVars.colors.warning : skinVars.colors.brand} />
          </Circle>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Stack space={4}>
              <Inline space={8} alignItems="center">
                <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                  {meta.label}
                </Text1>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  ·
                </Text1>
                <Inline space={4} alignItems="center">
                  <IconTimeRegular size={12} color={skinVars.colors.textSecondary} />
                  <Text1 regular color={skinVars.colors.textSecondary} transform="uppercase">
                    {relativeTime(item.timestamp)}
                  </Text1>
                </Inline>
              </Inline>
              <Text2 medium color={skinVars.colors.textPrimary}>
                {item.title}
              </Text2>
              {item.detail && (
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {item.detail}
                </Text2>
              )}
              {item.evidenceDocTitle && (
                <div style={{ display: "inline-flex" }}>
                  <Boxed>
                    <Box paddingX={12} paddingY={4}>
                      <Inline space={8} alignItems="center">
                        <IconDataCheckedRegular size={12} color={skinVars.colors.brand} />
                        <Text1 medium color={skinVars.colors.brand}>
                          {item.evidenceDocTitle}
                        </Text1>
                      </Inline>
                    </Box>
                  </Boxed>
                </div>
              )}
            </Stack>
          </div>
          {axisColor && (
            <div
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: skinVars.borderRadii.avatar,
                backgroundColor: axisColor,
                flexShrink: 0,
              }}
            />
          )}
        </Inline>
      </Box>
    </Touchable>
  );
}

function HealthStat({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: IconType;
  label: string;
  value: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Inline space={12} alignItems="center">
      <Circle size={40} backgroundColor={skinVars.colors.brandLow}>
        <Icon size={20} color={skinVars.colors.brand} />
      </Circle>
      <div style={{ minWidth: 0 }}>
        <Stack space={2}>
          <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
            {label}
          </Text1>
          {loading ? (
            <SkeletonLine width="60%" />
          ) : (
            <Text3 medium color={skinVars.colors.textPrimary}>
              {value}
            </Text3>
          )}
        </Stack>
      </div>
    </Inline>
  );
}

export default function Home() {
  const { roleId, area } = useApp();
  const [, navigate] = useLocation();
  const params = React.useMemo(
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

  const lang = React.useMemo(detectLang, []);

  const activeRole = roles?.find((r) => r.id === roleId);
  const clearance = activeRole?.clearance ?? "public";
  const roleArea = activeRole?.area;
  const leadership = clearance === "confidential" || clearance === "off_the_record";

  const axisColor = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const a of axes ?? []) map.set(a.id, a.color);
    return (id?: string | null) => (id ? map.get(id) : undefined);
  }, [axes]);

  // Persona re-weighting by *role*, not clearance alone:
  //  - Marca (brand) personas lead with Generate — brand activity is their day job.
  //  - Comunicación validators/analysts lead with their queue (Planning, KPIs).
  //  - Gabinete / leadership lead with the radar-adjacent apps (KPIs, Planning).
  // Ask is always first: it is the front door's primary action for everyone.
  const cardOrder = React.useMemo<AppKey[]>(() => {
    if (roleArea === "Marca") return ["ask", "generate", "kpis", "planning"];
    if (leadership) return ["ask", "kpis", "planning", "generate"];
    if (clearance === "private") return ["ask", "planning", "kpis", "generate"];
    return ["ask", "kpis", "generate", "planning"];
  }, [roleArea, leadership, clearance]);

  // Radar is capped at five on the front door. Ordering follows the persona:
  //  - Brand personas surface knowledge events (brand/campaign activity) first.
  //  - Internal validators surface their own queue first.
  //  - Leadership surfaces external signals first.
  const radarItems = React.useMemo<RadarItem[]>(() => {
    const items = radar ?? [];
    const weight = (r: RadarItem) => {
      if (roleArea === "Marca")
        return r.kind === "knowledge_event" ? 0 : r.kind === "your_queue" ? 1 : 2;
      if (leadership)
        return r.kind === "external_signal" ? 0 : r.kind === "your_queue" ? 1 : 2;
      if (clearance === "private") return r.kind === "your_queue" ? 0 : 1;
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

  const radarPanel = (
    <Stack space={16}>
      <Inline space="between" alignItems="center">
        <Inline space={8} alignItems="center">
          <IconAntennaRegular size={20} color={skinVars.colors.brand} />
          <Title2>Radar</Title2>
        </Inline>
        <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
          What changed for you
        </Text1>
      </Inline>

      <Boxed>
        {radarLoad ? (
          <Stack space={0}>
            {Array.from({ length: 4 }).map((_, i) => (
              <React.Fragment key={i}>
                {i > 0 && <Divider />}
                <Box padding={16}>
                  <Inline space={16} alignItems="center">
                    <SkeletonLine width={36} />
                    <div style={{ flex: 1 }}>
                      <Stack space={8}>
                        <SkeletonLine width="40%" />
                        <SkeletonLine width="75%" />
                        <SkeletonLine width="50%" />
                      </Stack>
                    </div>
                  </Inline>
                </Box>
              </React.Fragment>
            ))}
          </Stack>
        ) : radarItems.length > 0 ? (
          <Stack space={0}>
            {radarItems.map((item, i) => (
              <React.Fragment key={item.id}>
                {i > 0 && <Divider />}
                <RadarRow item={item} axisColor={axisColor(item.axisId)} />
              </React.Fragment>
            ))}
          </Stack>
        ) : (
          <Box padding={40}>
            <Stack space={16}>
              <Inline space={0} alignItems="center">
                <Circle size={48} backgroundColor={skinVars.colors.brandLow}>
                  <IconAntennaRegular size={24} color={skinVars.colors.brand} />
                </Circle>
              </Inline>
              <Stack space={4}>
                <Text3 medium color={skinVars.colors.textPrimary}>
                  Your radar is calm
                </Text3>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  Nothing needs your attention right now. Ask a question to explore the governed
                  corpus.
                </Text2>
              </Stack>
            </Stack>
          </Box>
        )}
      </Boxed>
    </Stack>
  );

  const healthPanel = (
    <Stack space={16}>
      <Inline space={8} alignItems="center">
        <IconShieldCheckedOkRegular size={20} color={skinVars.colors.brand} />
        <Title2>Knowledge health</Title2>
      </Inline>

      <Boxed>
        <Box padding={24}>
          <Stack space={24}>
            <HealthStat
              icon={IconDataCheckedRegular}
              label="Sources you can cite"
              value={`${stats?.totalDocuments ?? 0} documents`}
              loading={statsLoad}
            />
            <Divider />
            <Stack space={8}>
              <Inline space="between" alignItems="center">
                <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                  Validated
                </Text1>
                {!statsLoad && (
                  <Text2 medium color={skinVars.colors.textPrimary}>
                    {stats?.validatedPercent ?? 0}%
                  </Text2>
                )}
              </Inline>
              {statsLoad ? (
                <SkeletonLine width="100%" />
              ) : (
                <ProgressBar
                  progressPercent={stats?.validatedPercent ?? 0}
                  color={skinVars.colors.success}
                />
              )}
            </Stack>
            <Divider />
            <HealthStat
              icon={IconWorldDeviceRegular}
              label="Languages"
              value={languages || "—"}
              loading={statsLoad}
            />
            <Divider />
            <HealthStat
              icon={IconTimeRegular}
              label="Last updated"
              value={lastUpdated}
              loading={statsLoad}
            />
            {!statsLoad && (stats?.quarantined ?? 0) > 0 && (
              <>
                <Divider />
                <Inline space={12} alignItems="center">
                  <Circle size={40} backgroundColor={skinVars.colors.warningLow}>
                    <IconAlertRegular size={20} color={skinVars.colors.warning} />
                  </Circle>
                  <div>
                    <Stack space={2}>
                      <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                        Quarantined
                      </Text1>
                      <Text3 medium color={skinVars.colors.textPrimary}>
                        {stats?.quarantined} held from answers
                      </Text3>
                    </Stack>
                  </div>
                </Inline>
              </>
            )}
            <Divider />
            <Touchable onPress={() => navigate("/data")} aria-label="Browse the governed corpus">
              <Inline space={8} alignItems="center">
                <Text2 medium color={skinVars.colors.brand}>
                  Browse the governed corpus
                </Text2>
                <IconArrowLineUpRegular size={16} color={skinVars.colors.brand} />
              </Inline>
            </Touchable>
          </Stack>
        </Box>
      </Boxed>
    </Stack>
  );

  return (
    <ResponsiveLayout>
      <Box paddingY={64}>
        <Stack space={48}>
          {/* Front door — centred, contained column */}
          <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
            <Stack space={24}>
              <Stack space={12}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <img
                    src={telefonicaLogo}
                    alt="Telefónica"
                    style={{ height: 32, width: "auto" }}
                  />
                </div>
                <div style={{ textAlign: "center" }}>
                  <Text6>Welcome back</Text6>
                </div>
                <div style={{ textAlign: "center" }}>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {COPY[lang].subtitle}
                  </Text2>
                </div>
              </Stack>
              <HeroAskBar lang={lang} suggestions={suggestions ?? []} />
            </Stack>
          </div>

          {corpusEmpty ? (
            <Boxed>
              <Box padding={48}>
                <Stack space={24}>
                  <Inline space={0} alignItems="center">
                    <Circle size={56} backgroundColor={skinVars.colors.brandLow}>
                      <IconBookRegular size={28} color={skinVars.colors.brand} />
                    </Circle>
                  </Inline>
                  <Stack space={8}>
                    <Title2>No governed sources yet</Title2>
                    <Text2 regular color={skinVars.colors.textSecondary}>
                      Hub SSoT answers only from a governed knowledge core. Connect your first
                      document to start getting cited, permission-aware answers.
                    </Text2>
                  </Stack>
                  <Inline space={0}>
                    <ButtonPrimary
                      onPress={() => navigate("/data")}
                      EndIcon={IconArrowLineUpRegular}
                    >
                      Connect the first document
                    </ButtonPrimary>
                  </Inline>
                </Stack>
              </Box>
            </Boxed>
          ) : (
            <Stack space={48}>
              {/* Radar + health — plain CSS grid so the row grows with the
                  taller panel and never overlaps the cards below */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
                  gap: 24,
                  alignItems: "start",
                }}
              >
                {radarPanel}
                {healthPanel}
              </div>

              {/* Compact metric cards — wraps to fewer columns on narrow screens */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                }}
              >
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
            </Stack>
          )}
        </Stack>
      </Box>
    </ResponsiveLayout>
  );
}
