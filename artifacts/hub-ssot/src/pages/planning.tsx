import React from "react";
import {
  useGetPlanningOverview,
  useListPlanningEvents,
  useGetPlanningInsights,
  useListAxes,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import {
  ResponsiveLayout,
  Box,
  Stack,
  Inline,
  Grid,
  Text1,
  Text2,
  Text4,
  Title1,
  IconButton,
  ButtonLink,
  ButtonPrimary,
  Touchable,
  Menu,
  MenuSection,
  MenuItem,
  EmptyStateCard,
  skinVars,
  applyAlpha,
  IconChevronLeftRegular,
  IconChevronRightRegular,
  IconChevronDownRegular,
  IconCheckRegular,
  IconCalendarRegular,
  IconLayersRegular,
} from "@telefonica/mistica";
import { SOURCE_LOGOS } from "@/components/data-center/source-logos";
import { PlanningCalendar, type CalendarView } from "@/components/planning/calendar";
import { EventDrawer } from "@/components/planning/event-drawer";
import { EventForm } from "@/components/planning/event-form";
import { AlertsPanel } from "@/components/planning/alerts-panel";
import { PredictiveStrip } from "@/components/planning/predictive-strip";
import { PlanningChat } from "@/components/planning/planning-chat";
import { ForecastPanel } from "@/components/planning/forecast-panel";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  formatMonthTitle,
  parseDate,
  startOfMonth,
  startOfWeek,
  toISO,
  formatDay,
} from "@/components/planning/utils";
import { PLANNING_I18N, localeFor } from "@/i18n/planning";

type FilterKey = "area" | "market" | "brand" | "axis" | "type";
const ALL = "__all__";

// Period presets narrow the governed query window from today forward. They
// intersect with the visible calendar range rather than replacing it.
const PERIOD_OPTIONS = ["7", "14", "30", "90"];

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  render,
  allLabel,
  filterWord,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  render?: (v: string) => React.ReactNode;
  allLabel: string;
  filterWord: string;
}) {
  return (
    <Inline space={8} alignItems="center">
      <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
        {label}
      </Text1>
      <Menu
        renderTarget={({ ref, onPress }) => (
          <Touchable ref={ref} onPress={onPress} aria-label={`${label} ${filterWord}`}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 32,
                padding: "0 12px",
                borderRadius: skinVars.borderRadii.button,
                border: `1px solid ${skinVars.colors.divider}`,
                backgroundColor: skinVars.colors.backgroundContainer,
              }}
            >
              <Text2 medium color={skinVars.colors.textPrimary}>
                {value === ALL ? allLabel : render ? render(value) : value}
              </Text2>
              <IconChevronDownRegular size={14} color={skinVars.colors.textSecondary} />
            </div>
          </Touchable>
        )}
        renderMenu={({ ref, className }) => (
          <div ref={ref} className={className}>
            <MenuSection>
              <MenuItem
                label={allLabel}
                controlType="checkbox"
                checked={value === ALL}
                onPress={() => onChange(ALL)}
              />
              {options.map((o) => (
                <MenuItem
                  key={o}
                  label={render ? String(render(o)) : o}
                  controlType="checkbox"
                  checked={value === o}
                  onPress={() => onChange(o)}
                />
              ))}
            </MenuSection>
          </div>
        )}
      />
    </Inline>
  );
}

export default function Planning() {
  const { roleId, lang } = useApp();
  const t = PLANNING_I18N[lang];
  const { data: overview } = useGetPlanningOverview(
    { roleId },
    { query: { enabled: !!roleId, queryKey: ["planning-overview", roleId] } },
  );
  const { data: axes } = useListAxes();

  const todayISO = overview?.today ?? "2026-07-07";
  const [anchor, setAnchor] = React.useState<Date | null>(null);
  const currentAnchor = anchor ?? parseDate(todayISO);

  const [view, setView] = React.useState<CalendarView>("month");
  const [filters, setFilters] = React.useState<Record<FilterKey, string>>({
    area: ALL,
    market: ALL,
    brand: ALL,
    axis: ALL,
    type: ALL,
  });
  const [period, setPeriod] = React.useState<string>(ALL);
  const [openEvent, setOpenEvent] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [sideTab, setSideTab] = React.useState(0);
  const disconnected = !!overview && overview.sources.length === 0;

  const range = React.useMemo(() => {
    if (view === "month") {
      return {
        from: toISO(startOfWeek(startOfMonth(currentAnchor))),
        to: toISO(endOfWeek(endOfMonth(currentAnchor))),
      };
    }
    if (view === "week") {
      return { from: toISO(startOfWeek(currentAnchor)), to: toISO(endOfWeek(currentAnchor)) };
    }
    return { from: toISO(currentAnchor), to: toISO(currentAnchor) };
  }, [view, currentAnchor]);

  // Intersect the visible calendar range with the period preset (today → today
  // + N days). The server honours from/to, so narrowing happens server-side.
  const effectiveRange = React.useMemo(() => {
    if (period === ALL) return range;
    const from = todayISO;
    const to = toISO(addDays(parseDate(todayISO), Number(period)));
    return {
      from: range.from > from ? range.from : from,
      to: range.to < to ? range.to : to,
    };
  }, [range, period, todayISO]);

  const queryFilters = React.useMemo(
    () => ({
      roleId,
      from: effectiveRange.from,
      to: effectiveRange.to,
      area: filters.area === ALL ? undefined : filters.area,
      market: filters.market === ALL ? undefined : filters.market,
      brand: filters.brand === ALL ? undefined : filters.brand,
      axis: filters.axis === ALL ? undefined : filters.axis,
      type: filters.type === ALL ? undefined : filters.type,
    }),
    [roleId, filters, effectiveRange],
  );

  const { data: events, isLoading: eventsLoading } = useListPlanningEvents(queryFilters, {
    query: { enabled: !!roleId, queryKey: ["planning-events", queryFilters] },
  });
  const { data: insights } = useGetPlanningInsights(queryFilters, {
    query: { enabled: !!roleId, queryKey: ["planning-insights", queryFilters] },
  });

  const eventList = events ?? [];

  const options = React.useMemo(() => {
    const markets = new Set<string>();
    const brands = new Set<string>();
    const areas = new Set<string>();
    for (const e of eventList) {
      markets.add(e.market);
      brands.add(e.brand);
      areas.add(e.area);
    }
    return {
      area: [...areas].sort(),
      market: [...markets].sort(),
      brand: [...brands].sort(),
      axis: (axes ?? []).map((a) => a.id),
    };
  }, [eventList, axes]);

  const rangeLabel = React.useMemo(() => {
    if (view === "month") return formatMonthTitle(currentAnchor, lang);
    if (view === "week") {
      const start = startOfWeek(currentAnchor);
      const end = addDays(start, 6);
      return `${start.toLocaleDateString(localeFor(lang), { day: "numeric", month: "short" })} – ${end.toLocaleDateString(localeFor(lang), { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return formatDay(
      `${currentAnchor.getFullYear()}-${String(currentAnchor.getMonth() + 1).padStart(2, "0")}-${String(currentAnchor.getDate()).padStart(2, "0")}`,
      lang,
    );
  }, [view, currentAnchor, lang]);

  const step = (dir: number) => {
    if (view === "month")
      setAnchor(new Date(currentAnchor.getFullYear(), currentAnchor.getMonth() + dir, 1));
    else setAnchor(addDays(currentAnchor, dir * (view === "week" ? 7 : 1)));
  };

  return (
    <ResponsiveLayout>
      <Box paddingY={24}>
        <Stack space={24}>
          <Inline space={16} alignItems="center" wrap>
            <div style={{ flex: 1, minWidth: 240 }}>
              <Stack space={4}>
                <Title1 as="h1">{t.title}</Title1>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {t.subtitle}
                </Text2>
              </Stack>
            </div>
            {overview && overview.sources.length > 0 && (
              <Inline space={8} alignItems="center" wrap>
                <Inline space={8} alignItems="center">
                  <IconLayersRegular size={14} color={skinVars.colors.textSecondary} />
                  <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                    {t.sourcesLabel}
                  </Text1>
                </Inline>
                {overview.sources.map((s) => {
                  const Logo = SOURCE_LOGOS[s.id];
                  return (
                    <div
                      key={s.id}
                      title={s.description}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        backgroundColor: skinVars.colors.backgroundContainer,
                        border: `1px solid ${skinVars.colors.divider}`,
                        borderRadius: skinVars.borderRadii.button,
                        padding: "4px 12px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {Logo && (
                        <span style={{ display: "flex", flexShrink: 0 }}>
                          <Logo size={16} />
                        </span>
                      )}
                      <Text1 medium color={skinVars.colors.textPrimary}>
                        {s.name}
                      </Text1>
                      <Text1 regular color={skinVars.colors.textSecondary} transform="uppercase">
                        {s.status === "read_only" ? t.readOnly : s.status}
                      </Text1>
                    </div>
                  );
                })}
              </Inline>
            )}
          </Inline>

          {/* Controls */}
          <div
            style={{
              backgroundColor: skinVars.colors.backgroundContainer,
              border: `1px solid ${skinVars.colors.divider}`,
              borderRadius: skinVars.borderRadii.container,
            }}
          >
            <Box padding={16}>
              <Inline space={16} alignItems="center" wrap>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <Inline space={12} alignItems="center">
                    <Inline space={4} alignItems="center">
                      <IconButton
                        aria-label={t.prev}
                        Icon={IconChevronLeftRegular}
                        onPress={() => step(-1)}
                        small
                      />
                      <IconButton
                        aria-label={t.next}
                        Icon={IconChevronRightRegular}
                        onPress={() => step(1)}
                        small
                      />
                    </Inline>
                    <div style={{ minWidth: 180 }}>
                      <Text4 medium color={skinVars.colors.textPrimary}>
                        {rangeLabel}
                      </Text4>
                    </div>
                    <ButtonLink
                      small
                      onPress={() => setAnchor(parseDate(todayISO))}
                      StartIcon={IconCalendarRegular}
                    >
                      {t.today}
                    </ButtonLink>
                    <ButtonPrimary small onPress={() => setCreating(true)} disabled={!roleId}>
                      {t.newActivity}
                    </ButtonPrimary>
                  </Inline>
                </div>

                <Inline space={16} alignItems="center" wrap>
                  <FilterDropdown
                    label={t.filterLabels.area}
                    value={filters.area}
                    options={options.area}
                    onChange={(v) => setFilters((f) => ({ ...f, area: v }))}
                    allLabel={t.all}
                    filterWord={t.filterWord}
                  />
                  <FilterDropdown
                    label={t.filterLabels.market}
                    value={filters.market}
                    options={options.market}
                    onChange={(v) => setFilters((f) => ({ ...f, market: v }))}
                    allLabel={t.all}
                    filterWord={t.filterWord}
                  />
                  <FilterDropdown
                    label={t.filterLabels.brand}
                    value={filters.brand}
                    options={options.brand}
                    onChange={(v) => setFilters((f) => ({ ...f, brand: v }))}
                    allLabel={t.all}
                    filterWord={t.filterWord}
                  />
                  <FilterDropdown
                    label={t.filterLabels.axis}
                    value={filters.axis}
                    options={options.axis}
                    onChange={(v) => setFilters((f) => ({ ...f, axis: v }))}
                    render={(v) => axes?.find((a) => a.id === v)?.name ?? t.axisFallback}
                    allLabel={t.all}
                    filterWord={t.filterWord}
                  />
                  <FilterDropdown
                    label={t.filterLabels.type}
                    value={filters.type}
                    options={["campaign", "milestone", "event", "publication"]}
                    onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
                    render={(v) => t.types[v] ?? v}
                    allLabel={t.all}
                    filterWord={t.filterWord}
                  />
                  <FilterDropdown
                    label={t.filterLabels.period}
                    value={period}
                    options={PERIOD_OPTIONS}
                    onChange={setPeriod}
                    render={(v) => t.periodNextDays(Number(v))}
                    allLabel={t.all}
                    filterWord={t.filterWord}
                  />

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      borderRadius: skinVars.borderRadii.button,
                      border: `1px solid ${skinVars.colors.divider}`,
                      backgroundColor: skinVars.colors.backgroundAlternative,
                      padding: 2,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {(["month", "week", "day"] as CalendarView[]).map((v) => (
                      <Touchable key={v} onPress={() => setView(v)} aria-label={t.views[v]}>
                        <div
                          style={{
                            padding: "4px 14px",
                            borderRadius: skinVars.borderRadii.button,
                            backgroundColor: view === v ? skinVars.colors.brand : "transparent",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Text2
                            medium
                            wordBreak={false}
                            color={
                              view === v
                                ? skinVars.colors.textPrimaryInverse
                                : skinVars.colors.textSecondary
                            }
                          >
                            {t.views[v]}
                          </Text2>
                        </div>
                      </Touchable>
                    ))}
                  </div>
                </Inline>
              </Inline>
            </Box>
          </div>

          {/* Calendar + side rail */}
          <Grid columns={3} gap={24}>
            <GridSpan span={2}>
              <Stack space={24}>
                {disconnected ? (
                  <EmptyStateCard
                    asset={<IconLayersRegular size={48} color={skinVars.colors.brand} />}
                    title={t.noCalendarsTitle}
                    description={t.noCalendarsBody}
                  />
                ) : eventsLoading ? (
                  <div
                    style={{
                      backgroundColor: skinVars.colors.backgroundContainer,
                      border: `1px solid ${skinVars.colors.divider}`,
                      borderRadius: skinVars.borderRadii.container,
                    }}
                  >
                    <Box padding={64}>
                      <Text2 regular color={skinVars.colors.textSecondary} textAlign="center">
                        {t.loadingCalendar}
                      </Text2>
                    </Box>
                  </div>
                ) : eventList.length === 0 ? (
                  <EmptyStateCard
                    asset={<IconCalendarRegular size={48} color={skinVars.colors.brand} />}
                    title={t.nothingTitle}
                    description={t.nothingBody}
                  />
                ) : (
                  <PlanningCalendar
                    view={view}
                    anchor={currentAnchor}
                    events={eventList}
                    gaps={insights?.gaps ?? []}
                    axes={axes}
                    todayISO={todayISO}
                    onOpen={setOpenEvent}
                  />
                )}

                {!disconnected && axes && axes.length > 0 && (
                  <Box paddingX={4}>
                    <Inline space={12} alignItems="center" wrap>
                      <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                        {t.axisLegend}
                      </Text1>
                      {axes.map((a) => (
                        <Inline key={a.id} space={8} alignItems="center">
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: skinVars.borderRadii.avatar,
                              backgroundColor: a.color || skinVars.colors.brand,
                            }}
                          />
                          <Text2 regular color={skinVars.colors.textPrimary}>
                            {a.name}
                          </Text2>
                        </Inline>
                      ))}
                    </Inline>
                  </Box>
                )}

              </Stack>
            </GridSpan>

            {/* All three side panels stay mounted so switching tabs never
                discards a running forecast or an in-flight conversation. */}
            <Stack space={16}>
              <div
                role="tablist"
                aria-label={t.rightPanelAria}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  borderRadius: skinVars.borderRadii.button,
                  border: `1px solid ${skinVars.colors.divider}`,
                  backgroundColor: skinVars.colors.backgroundAlternative,
                  padding: 2,
                }}
              >
                {[t.tabForecastAlerts, t.askCalendar, t.tabSignals].map((label, i) => (
                  <div key={i} style={{ flex: 1, display: "flex" }}>
                    <Touchable
                      onPress={() => setSideTab(i)}
                      aria-label={label}
                      role="tab"
                      aria-selected={sideTab === i}
                    >
                      <div
                        style={{
                          padding: "6px 8px",
                          borderRadius: skinVars.borderRadii.button,
                          backgroundColor: sideTab === i ? skinVars.colors.brand : "transparent",
                          textAlign: "center",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text2
                          medium
                          wordBreak={false}
                          color={
                            sideTab === i
                              ? skinVars.colors.textPrimaryInverse
                              : skinVars.colors.textSecondary
                          }
                        >
                          {label}
                        </Text2>
                      </div>
                    </Touchable>
                  </div>
                ))}
              </div>
              <div style={{ display: sideTab === 0 ? "block" : "none" }}>
                <Stack space={24}>
                  <ForecastPanel />
                  {!disconnected && <AlertsPanel onOpenEvent={setOpenEvent} />}
                </Stack>
              </div>
              <div style={{ display: sideTab === 1 ? "flex" : "none", minHeight: 480 }}>
                <PlanningChat />
              </div>
              <div style={{ display: sideTab === 2 ? "block" : "none" }}>
                {!disconnected && insights ? (
                  <PredictiveStrip
                    insights={insights}
                    onOpenEvent={setOpenEvent}
                    layout="column"
                  />
                ) : (
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {t.noPredictive}
                  </Text2>
                )}
              </div>
            </Stack>
          </Grid>
        </Stack>
      </Box>

      <EventDrawer eventId={openEvent} axes={axes} onClose={() => setOpenEvent(null)} />
      {creating && (
        <EventForm
          axes={axes}
          todayISO={todayISO}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setOpenEvent(id);
          }}
        />
      )}
    </ResponsiveLayout>
  );
}

function GridSpan({ span, children }: { span: 2; children: React.ReactNode }) {
  return <div style={{ gridColumn: `span ${span}` }}>{children}</div>;
}
