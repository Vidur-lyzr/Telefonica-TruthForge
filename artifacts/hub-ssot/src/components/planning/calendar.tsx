import React from "react";
import type { PlanningEvent, PlanningGap, StrategicAxis } from "@workspace/api-client-react";
import { Lock, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addDays,
  axisColor,
  endOfMonth,
  endOfWeek,
  isWithin,
  parseDate,
  sameDay,
  startOfMonth,
  startOfWeek,
  toISO,
  TYPE_LABEL,
} from "./utils";

export type CalendarView = "month" | "week" | "day";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function EventBlock({
  event,
  axes,
  onOpen,
}: {
  event: PlanningEvent;
  axes: StrategicAxis[] | undefined;
  onOpen: (id: string) => void;
}) {
  if (event.restricted) {
    return (
      <button
        onClick={() => onOpen(event.id)}
        className="w-full flex items-center space-x-1.5 px-2 py-1 rounded-md text-left text-xs bg-tf-grey-100 text-tf-grey-500 border border-dashed border-tf-grey-300 hover:bg-tf-grey-200 transition-colors"
        title="Restricted — outside your clearance or area"
      >
        <Lock className="w-3 h-3 flex-shrink-0" />
        <span className="truncate font-medium">Restricted</span>
      </button>
    );
  }
  const color = axisColor(axes, event.axisId);
  const context = [event.market, event.brand].filter(Boolean).join(" · ");
  return (
    <button
      onClick={() => onOpen(event.id)}
      className="w-full flex flex-col px-2 py-1 rounded-md text-left text-xs text-white hover:brightness-110 transition-all shadow-sm"
      style={{ backgroundColor: color }}
      title={`${event.title} — ${TYPE_LABEL[event.type] ?? event.type} · ${context} · synced from ${event.source} (read-only)`}
    >
      <div className="flex items-center space-x-1.5">
        {event.conflict && (
          <TriangleAlert className="w-3 h-3 flex-shrink-0 text-tf-warning" />
        )}
        <span className="truncate font-semibold">{event.title}</span>
      </div>
      <div className="flex items-center space-x-1 mt-0.5 min-w-0">
        {event.source && (
          <span className="flex-shrink-0 px-1 rounded-sm bg-white/25 text-[9px] font-bold uppercase tracking-wide leading-tight">
            {event.source}
          </span>
        )}
        {context && (
          <span className="truncate text-[10px] text-white/90">{context}</span>
        )}
      </div>
    </button>
  );
}

function eventsOnDay(events: PlanningEvent[], day: Date): PlanningEvent[] {
  return events
    .filter((e) => isWithin(day, e.startDate, e.endDate))
    .sort((a, b) => (a.startDate < b.startDate ? -1 : a.title < b.title ? -1 : 1));
}

function gapOnDay(gaps: PlanningGap[], day: Date): boolean {
  return gaps.some((g) => isWithin(day, g.start, g.end));
}

function MonthView({
  anchor,
  events,
  gaps,
  axes,
  today,
  onOpen,
}: {
  anchor: Date;
  events: PlanningEvent[];
  gaps: PlanningGap[];
  axes: StrategicAxis[] | undefined;
  today: Date;
  onOpen: (id: string) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(anchor));
  const gridEnd = endOfWeek(endOfMonth(anchor));
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(new Date(d));

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card">
      <div className="grid grid-cols-7 bg-muted/50 border-b border-border">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="px-3 py-2 text-xs uppercase tracking-eyebrow font-bold text-muted-foreground text-center"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === anchor.getMonth();
          const dayEvents = eventsOnDay(events, day);
          const isToday = sameDay(day, today);
          const isGap = inMonth && gapOnDay(gaps, day);
          return (
            <div
              key={i}
              className={cn(
                "min-h-[124px] border-b border-r border-border p-1.5 flex flex-col space-y-1",
                (i + 1) % 7 === 0 && "border-r-0",
                !inMonth && "bg-muted/30",
                isGap && "bg-tf-warning-bg/40",
              )}
            >
              <div className="flex items-center justify-between px-1">
                <span
                  className={cn(
                    "text-xs font-semibold",
                    inMonth ? "text-foreground" : "text-muted-foreground/50",
                    isToday &&
                      "bg-tf-blue text-white rounded-full w-5 h-5 flex items-center justify-center",
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-1 overflow-hidden">
                {dayEvents.slice(0, 2).map((e) => (
                  <EventBlock key={e.id + toISO(day)} event={e} axes={axes} onOpen={onOpen} />
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[10px] text-muted-foreground px-1 font-medium">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  anchor,
  events,
  axes,
  today,
  onOpen,
}: {
  anchor: Date;
  events: PlanningEvent[];
  axes: StrategicAxis[] | undefined;
  today: Date;
  onOpen: (id: string) => void;
}) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
      {days.map((day, i) => {
        const dayEvents = eventsOnDay(events, day);
        const isToday = sameDay(day, today);
        return (
          <div
            key={i}
            className={cn(
              "border border-border rounded-xl bg-card p-3 min-h-[160px] flex flex-col",
              isToday && "ring-2 ring-tf-blue",
            )}
          >
            <div className="mb-2">
              <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
                {WEEKDAYS[i]}
              </div>
              <div className={cn("text-lg font-bold", isToday ? "text-tf-blue" : "text-foreground")}>
                {day.getDate()}
              </div>
            </div>
            <div className="space-y-1.5 flex-1">
              {dayEvents.length === 0 && (
                <div className="text-[11px] text-muted-foreground/60 italic pt-2">No activity</div>
              )}
              {dayEvents.map((e) => (
                <EventBlock key={e.id} event={e} axes={axes} onOpen={onOpen} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({
  anchor,
  events,
  axes,
  onOpen,
}: {
  anchor: Date;
  events: PlanningEvent[];
  axes: StrategicAxis[] | undefined;
  onOpen: (id: string) => void;
}) {
  const dayEvents = eventsOnDay(events, anchor);
  return (
    <div className="border border-border rounded-2xl bg-card p-6 space-y-3 max-w-3xl">
      {dayEvents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No activity scheduled for this day.
        </div>
      )}
      {dayEvents.map((e) => {
        if (e.restricted) {
          return (
            <button
              key={e.id}
              onClick={() => onOpen(e.id)}
              className="w-full flex items-center space-x-3 p-4 rounded-xl border border-dashed border-tf-grey-300 bg-tf-grey-50 hover:bg-tf-grey-100 transition-colors text-left"
            >
              <Lock className="w-5 h-5 text-tf-grey-500" />
              <span className="font-medium text-tf-grey-600">Restricted activity</span>
            </button>
          );
        }
        return (
          <button
            key={e.id}
            onClick={() => onOpen(e.id)}
            className="w-full flex items-start space-x-4 p-4 rounded-xl border border-border bg-white hover:shadow-sm transition-all text-left"
          >
            <span
              className="w-1.5 self-stretch rounded-full flex-shrink-0"
              style={{ backgroundColor: axisColor(axes, e.axisId) }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-foreground">{e.title}</span>
                {e.conflict && <TriangleAlert className="w-4 h-4 text-tf-warning" />}
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">
                {TYPE_LABEL[e.type] ?? e.type} · {e.market} · {e.brand} · {e.owner}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function PlanningCalendar({
  view,
  anchor,
  events,
  gaps,
  axes,
  todayISO,
  onOpen,
}: {
  view: CalendarView;
  anchor: Date;
  events: PlanningEvent[];
  gaps: PlanningGap[];
  axes: StrategicAxis[] | undefined;
  todayISO: string;
  onOpen: (id: string) => void;
}) {
  const today = parseDate(todayISO);
  if (view === "week")
    return <WeekView anchor={anchor} events={events} axes={axes} today={today} onOpen={onOpen} />;
  if (view === "day")
    return <DayView anchor={anchor} events={events} axes={axes} onOpen={onOpen} />;
  return (
    <MonthView
      anchor={anchor}
      events={events}
      gaps={gaps}
      axes={axes}
      today={today}
      onOpen={onOpen}
    />
  );
}
