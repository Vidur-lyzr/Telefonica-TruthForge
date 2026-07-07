import React, { useMemo, useState } from "react";
import {
  useGetPlanningOverview,
  useListPlanningEvents,
  useGetPlanningInsights,
  useListAxes,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Calendar as CalendarIcon,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanningCalendar, type CalendarView } from "@/components/planning/calendar";
import { EventDrawer } from "@/components/planning/event-drawer";
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

type FilterKey = "area" | "market" | "brand" | "axis";
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
    <div className="flex items-center space-x-2">
      <span className="text-xs uppercase tracking-eyebrow text-muted-foreground font-bold">
        {label}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="rounded-pill h-8 px-3 font-semibold border-border bg-white hover:bg-muted"
          >
            {value === ALL ? "All" : (render ? render(value) : value)}
            <ChevronDown className="w-3.5 h-3.5 ml-1.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="rounded-xl max-h-72 overflow-y-auto">
          <DropdownMenuItem
            onClick={() => onChange(ALL)}
            className="rounded-lg font-medium cursor-pointer"
          >
            <span className="flex-1">All</span>
            {value === ALL && <Check className="w-4 h-4 text-tf-blue" />}
          </DropdownMenuItem>
          {options.map((o) => (
            <DropdownMenuItem
              key={o}
              onClick={() => onChange(o)}
              className="rounded-lg font-medium cursor-pointer"
            >
              <span className="flex-1">{render ? render(o) : o}</span>
              {value === o && <Check className="w-4 h-4 text-tf-blue" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
  const [anchor, setAnchor] = useState<Date | null>(null);
  const currentAnchor = anchor ?? parseDate(todayISO);

  const [view, setView] = useState<CalendarView>("month");
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    area: ALL,
    market: ALL,
    brand: ALL,
    axis: ALL,
  });
  const [openEvent, setOpenEvent] = useState<string | null>(null);
  const disconnected = !!overview && overview.sources.length === 0;

  const range = useMemo(() => {
    if (view === "month") {
      return { from: toISO(startOfWeek(startOfMonth(currentAnchor))), to: toISO(endOfWeek(endOfMonth(currentAnchor))) };
    }
    if (view === "week") {
      return { from: toISO(startOfWeek(currentAnchor)), to: toISO(endOfWeek(currentAnchor)) };
    }
    return { from: toISO(currentAnchor), to: toISO(currentAnchor) };
  }, [view, currentAnchor]);

  const queryFilters = useMemo(
    () => ({
      roleId,
      from: range.from,
      to: range.to,
      area: filters.area === ALL ? undefined : filters.area,
      market: filters.market === ALL ? undefined : filters.market,
      brand: filters.brand === ALL ? undefined : filters.brand,
      axis: filters.axis === ALL ? undefined : filters.axis,
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

  // Derive filter options from the full permitted event set (unfiltered would
  // require a second query; deriving from current results is honest enough for
  // a demo-tier facet).
  const options = useMemo(() => {
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

  const rangeLabel = useMemo(() => {
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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-title-lg text-tf-navy">Unified planning</h1>
          <p className="text-muted-foreground mt-1">
            Governed calendar across Communication and Brand — every block scoped to your persona.
          </p>
        </div>
        {overview && overview.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-eyebrow text-muted-foreground font-bold flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1.5" /> Sources
            </span>
            {overview.sources.map((s) => (
              <span
                key={s.id}
                className="text-xs font-medium bg-white border border-border rounded-pill px-3 py-1 text-tf-navy"
                title={s.description}
              >
                {s.name}
                <span className="ml-1.5 text-[10px] uppercase tracking-eyebrow text-tf-grey-400">
                  {s.status === "read_only" ? "read-only" : s.status}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-border"
              onClick={() => step(-1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-border"
              onClick={() => step(1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="font-bold text-tf-navy text-lg min-w-[180px]">{rangeLabel}</div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-pill h-8 px-3 text-tf-blue hover:bg-tf-blue-tint font-semibold"
            onClick={() => setAnchor(parseDate(todayISO))}
          >
            <CalendarIcon className="w-3.5 h-3.5 mr-1.5" /> Today
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
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

          <div className="flex items-center rounded-pill border border-border bg-muted/50 p-0.5">
            {(["month", "week", "day"] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1 rounded-pill text-xs font-bold uppercase tracking-eyebrow transition-colors",
                  view === v
                    ? "bg-tf-blue text-white shadow-sm"
                    : "text-muted-foreground hover:text-tf-navy",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar + side rail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {disconnected ? (
            <div className="border border-dashed border-border rounded-2xl bg-card p-16 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Layers className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-tf-navy text-lg">No calendars connected</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                This workspace has no governed planning sources yet. Once a read-only calendar
                (Asana, Jira, Google Calendar, Confluence or Excel) is connected, its activity will
                appear here, scoped to your persona.
              </p>
            </div>
          ) : eventsLoading ? (
            <div className="border border-border rounded-2xl bg-card p-16 text-center text-muted-foreground">
              Loading governed calendar…
            </div>
          ) : eventList.length === 0 ? (
            <div className="border border-border rounded-2xl bg-card p-16 text-center">
              <h3 className="font-bold text-tf-navy text-lg">Nothing to show here</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                No activity matches these filters at your clearance. Adjust the filters, or switch to
                a higher-clearance persona to see restricted slots.
              </p>
            </div>
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
            <div className="flex flex-wrap items-center gap-3 px-1">
              <span className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
                Axis legend
              </span>
              {axes.map((a) => (
                <span key={a.id} className="flex items-center space-x-1.5 text-xs text-foreground">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: a.color || "var(--tf-blue)" }}
                  />
                  <span>{a.name}</span>
                </span>
              ))}
            </div>
          )}

          {!disconnected && insights && (
            <PredictiveStrip insights={insights} onOpenEvent={setOpenEvent} />
          )}
        </div>

        <div className="space-y-6">
          <ForecastPanel />
          <div className="min-h-[420px] flex">
            <PlanningChat />
          </div>
        </div>
      </div>

      <EventDrawer eventId={openEvent} axes={axes} onClose={() => setOpenEvent(null)} />
    </div>
  );
}
