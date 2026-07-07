import type { StrategicAxis } from "@workspace/api-client-react";

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

export function formatDay(iso: string): string {
  return parseDate(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDayShort(iso: string): string {
  return parseDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatMonthTitle(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

const AXIS_FALLBACK = "#0066FF";

export function axisColor(axes: StrategicAxis[] | undefined, axisId: string): string {
  const axis = axes?.find((a) => a.id === axisId);
  return axis?.color || AXIS_FALLBACK;
}

export function axisName(axes: StrategicAxis[] | undefined, axisId: string): string {
  return axes?.find((a) => a.id === axisId)?.name || "Unassigned axis";
}

export const TYPE_LABEL: Record<string, string> = {
  campaign: "Campaign",
  milestone: "Milestone",
  event: "Event",
  publication: "Publication",
};

export const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  planned: { label: "Planned", className: "bg-tf-grey-100 text-tf-grey-600" },
  in_progress: { label: "In progress", className: "bg-tf-blue-tint text-tf-blue" },
  live: { label: "Live", className: "bg-tf-success-bg text-tf-success" },
  done: { label: "Done", className: "bg-tf-grey-100 text-tf-grey-500" },
  at_risk: { label: "At risk", className: "bg-tf-warning-bg text-tf-warning" },
};
