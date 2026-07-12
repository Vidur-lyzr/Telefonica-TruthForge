import type { StrategicAxis } from "@workspace/api-client-react";
import { skinVars } from "@telefonica/mistica";
import type { Lang } from "../app-provider";
import { localeFor, PLANNING_I18N } from "../../i18n/planning";

// Dates are governed as plain YYYY-MM-DD strings. Parse in local time (no TZ
// shift) so calendar cells line up with the anchor date exactly.
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// Monday-first week start (European convention).
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

// Sunday-end of the Monday-first week (European convention).
export function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6);
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isWithin(day: Date, startISO: string, endISO: string): boolean {
  const t = day.getTime();
  return t >= parseDate(startISO).getTime() && t <= parseDate(endISO).getTime();
}

export function formatDay(iso: string, lang: Lang = "EN"): string {
  return parseDate(iso).toLocaleDateString(localeFor(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDayShort(iso: string, lang: Lang = "EN"): string {
  return parseDate(iso).toLocaleDateString(localeFor(lang), { day: "numeric", month: "short" });
}

export function formatMonthTitle(date: Date, lang: Lang = "EN"): string {
  return date.toLocaleDateString(localeFor(lang), { month: "long", year: "numeric" });
}

// Monday-first short weekday names for the active language, via Intl.
// 2024-01-01 is a Monday, so we format seven consecutive days from it.
export function weekdayShortNames(lang: Lang): string[] {
  const fmt = new Intl.DateTimeFormat(localeFor(lang), { weekday: "short" });
  return Array.from({ length: 7 }, (_, i) => {
    const label = fmt.format(new Date(2024, 0, 1 + i));
    return label.charAt(0).toUpperCase() + label.slice(1);
  });
}

export function axisColor(axes: StrategicAxis[] | undefined, axisId: string): string {
  const axis = axes?.find((a) => a.id === axisId);
  return axis?.color || skinVars.colors.brand;
}

export function axisName(
  axes: StrategicAxis[] | undefined,
  axisId: string,
  lang: Lang = "EN",
): string {
  return axes?.find((a) => a.id === axisId)?.name || PLANNING_I18N[lang].unassignedAxis;
}

export type TagTone = "promo" | "info" | "active" | "inactive" | "success" | "warning" | "error";

export const STATUS_TONE: Record<string, TagTone> = {
  planned: "inactive",
  in_progress: "info",
  live: "success",
  done: "inactive",
  at_risk: "warning",
};
