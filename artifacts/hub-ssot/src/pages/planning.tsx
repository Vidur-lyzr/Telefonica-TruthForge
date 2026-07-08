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
  TYPE_LABEL,
} from "@/components/planning/utils";

type FilterKey = "area" | "market" | "brand" | "axis" | "type";
const ALL = "__all__";

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  render,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  render?: (v: string) => React.ReactNode;
}) {
  return (
    <Inline space={8} alignItems="center">
      <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
        {label}
      </Text1>
      <Menu
        renderTarget={({ ref, onPress }) => (
          <Touchable ref={ref} onPress={onPress} aria-label={`${label} filter`}>
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
                {value === ALL ? "All" : render ? render(value) : value}
              </Text2>
              <IconChevronDownRegular size={14} color={skinVars.colors.textSecondary} />
            </div>
          </Touchable>
        )}
        renderMenu={({ ref, className }) => (
          <div ref={ref} className={className}>
            <MenuSection>
              <MenuItem
                label="All"
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
  const { roleId } = useApp();
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
  const [openEvent, setOpenEvent] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
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

  const queryFilters = React.useMemo(
    () => ({
      roleId,
      from: range.from,
      to: range.to,
      area: filters.area === ALL ? undefined : filters.area,
      market: filters.market === ALL ? undefined : filters.market,
      brand: filters.brand === ALL ? undefined : filters.brand,
      axis: filters.axis === ALL ? undefined : filters.axis,
      type: filters.type === ALL ? undefined : filters.type,
    }),
    [roleId, filters, range],
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
    if (view === "month") return formatMonthTitle(currentAnchor);
    if (view === "week") {
      const start = startOfWeek(currentAnchor);
      const end = addDays(start, 6);
      return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return formatDay(
      `${currentAnchor.getFullYear()}-${String(currentAnchor.getMonth() + 1).padStart(2, "0")}-${String(currentAnchor.getDate()).padStart(2, "0")}`,
    );
  }, [view, currentAnchor]);

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
                <Title1 as="h1">Unified planning</Title1>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  Governed calendar across Communication and Brand — every block scoped to your
                  persona.
                </Text2>
              </Stack>
            </div>
            {overview && overview.sources.length > 0 && (
              <Inline space={8} alignItems="center" wrap>
                <Inline space={8} alignItems="center">
                  <IconLayersRegular size={14} color={skinVars.colors.textSecondary} />
                  <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                    Sources
                  </Text1>
                </Inline>
                {overview.sources.map((s) => (
                  <div
                    key={s.id}
                    title={s.description}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: skinVars.colors.backgroundContainer,
                      border: `1px solid ${skinVars.colors.divider}`,
                      borderRadius: skinVars.borderRadii.button,
                      padding: "4px 12px",
                    }}
                  >
                    <Text1 medium color={skinVars.colors.textPrimary}>
                      {s.name}
                    </Text1>
                    <Text1 regular color={skinVars.colors.textSecondary} transform="uppercase">
                      {s.status === "read_only" ? "read-only" : s.status}
                    </Text1>
                  </div>
                ))}
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
                        aria-label="Previous"
                        Icon={IconChevronLeftRegular}
                        onPress={() => step(-1)}
                        small
                      />
                      <IconButton
                        aria-label="Next"
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
                      Today
                    </ButtonLink>
                    <ButtonPrimary small onPress={() => setCreating(true)} disabled={!roleId}>
                      New activity
                    </ButtonPrimary>
                  </Inline>
                </div>

                <Inline space={16} alignItems="center" wrap>
                  <FilterDropdown
                    label="Area"
                    value={filters.area}
                    options={options.area}
                    onChange={(v) => setFilters((f) => ({ ...f, area: v }))}
                  />
                  <FilterDropdown
                    label="Market"
                    value={filters.market}
                    options={options.market}
                    onChange={(v) => setFilters((f) => ({ ...f, market: v }))}
                  />
                  <FilterDropdown
                    label="Brand"
                    value={filters.brand}
                    options={options.brand}
                    onChange={(v) => setFilters((f) => ({ ...f, brand: v }))}
                  />
                  <FilterDropdown
                    label="Axis"
                    value={filters.axis}
                    options={options.axis}
                    onChange={(v) => setFilters((f) => ({ ...f, axis: v }))}
                    render={(v) => axes?.find((a) => a.id === v)?.name ?? "Axis"}
                  />
                  <FilterDropdown
                    label="Type"
                    value={filters.type}
                    options={["campaign", "milestone", "event", "publication"]}
                    onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
                    render={(v) => TYPE_LABEL[v] ?? v}
                  />

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      borderRadius: skinVars.borderRadii.button,
                      border: `1px solid ${skinVars.colors.divider}`,
                      backgroundColor: skinVars.colors.backgroundAlternative,
                      padding: 2,
                    }}
                  >
                    {(["month", "week", "day"] as CalendarView[]).map((v) => (
                      <Touchable key={v} onPress={() => setView(v)} aria-label={v}>
                        <div
                          style={{
                            padding: "4px 12px",
                            borderRadius: skinVars.borderRadii.button,
                            backgroundColor: view === v ? skinVars.colors.brand : "transparent",
                          }}
                        >
                          <Text1
                            medium
                            transform="uppercase"
                            color={
                              view === v
                                ? skinVars.colors.textPrimaryInverse
                                : skinVars.colors.textSecondary
                            }
                          >
                            {v}
                          </Text1>
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
                    title="No calendars connected"
                    description="This workspace has no governed planning sources yet. Once a read-only calendar (Asana, Jira, Google Calendar, Confluence or Excel) is connected, its activity will appear here, scoped to your persona."
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
                        Loading governed calendar…
                      </Text2>
                    </Box>
                  </div>
                ) : eventList.length === 0 ? (
                  <EmptyStateCard
                    asset={<IconCalendarRegular size={48} color={skinVars.colors.brand} />}
                    title="Nothing to show here"
                    description="No activity matches these filters at your clearance. Adjust the filters, or switch to a higher-clearance persona to see restricted slots."
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
                        Axis legend
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

                {!disconnected && insights && (
                  <PredictiveStrip insights={insights} onOpenEvent={setOpenEvent} />
                )}
              </Stack>
            </GridSpan>

            <Stack space={24}>
              <ForecastPanel />
              {!disconnected && <AlertsPanel onOpenEvent={setOpenEvent} />}
              <div style={{ minHeight: 420, display: "flex" }}>
                <PlanningChat />
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
