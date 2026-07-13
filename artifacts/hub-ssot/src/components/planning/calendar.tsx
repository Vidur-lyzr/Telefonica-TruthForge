import React from "react";
import type { PlanningEvent, PlanningGap, StrategicAxis } from "@workspace/api-client-react";
import {
  Touchable,
  Text1,
  Text2,
  Text3,
  Box,
  Stack,
  Inline,
  skinVars,
  applyAlpha,
  IconLockClosedRegular,
  IconWarningRegular,
} from "@telefonica/mistica";
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
  weekdayShortNames,
} from "./utils";
import { useApp } from "@/components/app-provider";
import { PLANNING_I18N } from "@/i18n/planning";

export type CalendarView = "month" | "week" | "day";

function EventBlock({
  event,
  axes,
  onOpen,
}: {
  event: PlanningEvent;
  axes: StrategicAxis[] | undefined;
  onOpen: (id: string) => void;
}) {
  const { lang } = useApp();
  const t = PLANNING_I18N[lang];
  if (event.restricted) {
    return (
      <Touchable onPress={() => onOpen(event.id)} aria-label={t.restrictedAria}>
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 8px",
            borderRadius: skinVars.borderRadii.button,
            backgroundColor: skinVars.colors.backgroundAlternative,
            border: `1px dashed ${skinVars.colors.divider}`,
          }}
        >
          <IconLockClosedRegular size={12} color={skinVars.colors.textSecondary} />
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <Text1 medium color={skinVars.colors.textSecondary}>
              {t.restricted}
            </Text1>
          </div>
        </div>
      </Touchable>
    );
  }
  const color = axisColor(axes, event.axisId);
  const context = [event.market, event.brand].filter(Boolean).join(" · ");
  return (
    <Touchable
      onPress={() => onOpen(event.id)}
      aria-label={t.eventAria({
        title: event.title,
        type: t.types[event.type] ?? event.type,
        context,
        source: event.source,
      })}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "4px 8px",
          borderRadius: skinVars.borderRadii.button,
          backgroundColor: color,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {event.conflict && (
            <IconWarningRegular size={12} color={skinVars.colors.textPrimaryInverse} />
          )}
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <Text1 medium color={skinVars.colors.textPrimaryInverse}>
              {event.title}
            </Text1>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, marginTop: 2 }}>
          {event.source && (
            <div
              style={{
                flexShrink: 0,
                padding: "0 4px",
                borderRadius: skinVars.borderRadii.chip,
                backgroundColor: applyAlpha(skinVars.rawColors.inverse, 0.25),
              }}
            >
              <Text1 medium color={skinVars.colors.textPrimaryInverse}>
                {event.source}
              </Text1>
            </div>
          )}
          {context && (
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <Text1 regular color={applyAlpha(skinVars.rawColors.inverse, 0.9)}>{context}</Text1>
            </div>
          )}
        </div>
      </div>
    </Touchable>
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
  const { lang } = useApp();
  const t = PLANNING_I18N[lang];
  const weekdays = weekdayShortNames(lang);
  const gridStart = startOfWeek(startOfMonth(anchor));
  const gridEnd = endOfWeek(endOfMonth(anchor));
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(new Date(d));

  return (
    <div
      style={{
        border: `1px solid ${skinVars.colors.divider}`,
        borderRadius: skinVars.borderRadii.container,
        overflow: "hidden",
        backgroundColor: skinVars.colors.backgroundContainer,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          backgroundColor: skinVars.colors.backgroundAlternative,
          borderBottom: `1px solid ${skinVars.colors.divider}`,
        }}
      >
        {weekdays.map((w) => (
          <div key={w} style={{ padding: "8px 12px", textAlign: "center" }}>
            <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
              {w}
            </Text1>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {days.map((day, i) => {
          const inMonth = day.getMonth() === anchor.getMonth();
          const dayEvents = eventsOnDay(events, day);
          const isToday = sameDay(day, today);
          const isGap = inMonth && gapOnDay(gaps, day);
          return (
            <div
              key={i}
              style={{
                minHeight: 96,
                borderBottom: `1px solid ${skinVars.colors.divider}`,
                borderRight:
                  (i + 1) % 7 === 0 ? "none" : `1px solid ${skinVars.colors.divider}`,
                padding: 6,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                backgroundColor: !inMonth
                  ? skinVars.colors.backgroundAlternative
                  : isGap
                    ? applyAlpha(skinVars.rawColors.warning, 0.16)
                    : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
                {isToday ? (
                  <div
                    style={{
                      backgroundColor: skinVars.colors.brand,
                      borderRadius: skinVars.borderRadii.avatar,
                      width: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text1 medium color={skinVars.colors.textPrimaryInverse}>
                      {day.getDate()}
                    </Text1>
                  </div>
                ) : (
                  <Text1
                    medium
                    color={inMonth ? skinVars.colors.textPrimary : skinVars.colors.textSecondary}
                  >
                    {day.getDate()}
                  </Text1>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
                {dayEvents.slice(0, 2).map((e) => (
                  <EventBlock key={e.id + toISO(day)} event={e} axes={axes} onOpen={onOpen} />
                ))}
                {dayEvents.length > 2 && (
                  <div style={{ padding: "0 4px" }}>
                    <Text1 regular color={skinVars.colors.textSecondary}>
                      {t.moreCount(dayEvents.length - 2)}
                    </Text1>
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
  const { lang } = useApp();
  const t = PLANNING_I18N[lang];
  const weekdays = weekdayShortNames(lang);
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12,
      }}
    >
      {days.map((day, i) => {
        const dayEvents = eventsOnDay(events, day);
        const isToday = sameDay(day, today);
        return (
          <div
            key={i}
            style={{
              border: isToday
                ? `2px solid ${skinVars.colors.brand}`
                : `1px solid ${skinVars.colors.divider}`,
              borderRadius: skinVars.borderRadii.container,
              backgroundColor: skinVars.colors.backgroundContainer,
              padding: 12,
              minHeight: 160,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box paddingBottom={8}>
              <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                {weekdays[i]}
              </Text1>
              <Text3
                medium
                color={isToday ? skinVars.colors.brand : skinVars.colors.textPrimary}
              >
                {day.getDate()}
              </Text3>
            </Box>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              {dayEvents.length === 0 && (
                <Box paddingTop={8}>
                  <Text1 regular color={skinVars.colors.textSecondary}>No activity</Text1>
                </Box>
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
  const { lang } = useApp();
  const t = PLANNING_I18N[lang];
  const dayEvents = eventsOnDay(events, anchor);
  return (
    <div
      style={{
        border: `1px solid ${skinVars.colors.divider}`,
        borderRadius: skinVars.borderRadii.container,
        backgroundColor: skinVars.colors.backgroundContainer,
        maxWidth: 768,
      }}
    >
      <Box padding={24}>
        <Stack space={12}>
          {dayEvents.length === 0 && (
            <Box paddingY={24}>
              <Text2 regular color={skinVars.colors.textSecondary} textAlign="center">
                {t.noActivityDay}
              </Text2>
            </Box>
          )}
          {dayEvents.map((e) => {
            if (e.restricted) {
              return (
                <Touchable key={e.id} onPress={() => onOpen(e.id)} aria-label={t.restrictedActivity}>
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 16,
                      borderRadius: skinVars.borderRadii.container,
                      border: `1px dashed ${skinVars.colors.divider}`,
                      backgroundColor: skinVars.colors.backgroundAlternative,
                    }}
                  >
                    <IconLockClosedRegular size={20} color={skinVars.colors.textSecondary} />
                    <Text2 medium color={skinVars.colors.textSecondary}>
                      {t.restrictedActivity}
                    </Text2>
                  </div>
                </Touchable>
              );
            }
            return (
              <Touchable key={e.id} onPress={() => onOpen(e.id)} aria-label={e.title}>
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    padding: 16,
                    borderRadius: skinVars.borderRadii.container,
                    border: `1px solid ${skinVars.colors.divider}`,
                    backgroundColor: skinVars.colors.backgroundContainer,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      alignSelf: "stretch",
                      borderRadius: skinVars.borderRadii.button,
                      flexShrink: 0,
                      backgroundColor: axisColor(axes, e.axisId),
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Inline space={8} alignItems="center">
                      <Text2 medium color={skinVars.colors.textPrimary}>
                        {e.title}
                      </Text2>
                      {e.conflict && (
                        <IconWarningRegular size={16} color={skinVars.colors.warning} />
                      )}
                    </Inline>
                    <Box paddingTop={2}>
                      <Text2 regular color={skinVars.colors.textSecondary}>
                        {t.types[e.type] ?? e.type} · {e.area} · {e.market} · {e.brand} ·{" "}
                        {e.owner}
                      </Text2>
                    </Box>
                    <Box paddingTop={2}>
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        {e.startDate}
                        {e.endDate !== e.startDate ? ` – ${e.endDate}` : ""} · {t.statusPrefix}{" "}
                        {t.statuses[e.status] ?? e.status} · {t.sourcePrefix} {e.source} ({t.readOnly}
                        )
                      </Text1>
                    </Box>
                  </div>
                </div>
              </Touchable>
            );
          })}
        </Stack>
      </Box>
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
