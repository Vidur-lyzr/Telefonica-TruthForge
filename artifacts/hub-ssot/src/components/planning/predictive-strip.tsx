import React from "react";
import type { PlanningInsights } from "@workspace/api-client-react";
import {
  TriangleAlert,
  CalendarClock,
  Gauge,
  Signal,
  CalendarX2,
  Lightbulb,
  Shuffle,
} from "lucide-react";
import { formatDayShort } from "./utils";

function Card({
  icon: Icon,
  tone,
  title,
  children,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "warning" | "info" | "neutral";
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const toneClass =
    tone === "warning"
      ? "text-tf-warning"
      : tone === "info"
        ? "text-tf-blue"
        : "text-tf-grey-600";
  const body = (
    <>
      <div className={`flex items-center space-x-2 ${toneClass}`}>
        <Icon className="w-4 h-4" />
        <span className="text-xs uppercase tracking-eyebrow font-bold">{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </>
  );
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="min-w-[260px] max-w-[320px] shrink-0 snap-start bg-card border border-border rounded-xl p-4 space-y-2 text-left hover:border-tf-blue hover:shadow-sm transition-all cursor-pointer"
      >
        {body}
      </button>
    );
  }
  return (
    <div className="min-w-[260px] max-w-[320px] shrink-0 snap-start bg-card border border-border rounded-xl p-4 space-y-2">
      {body}
    </div>
  );
}

export function PredictiveStrip({
  insights,
  onOpenEvent,
}: {
  insights: PlanningInsights;
  onOpenEvent?: (id: string) => void;
}) {
  const { conflicts, gaps, predictions, signals } = insights;
  const hasAny =
    conflicts.length > 0 ||
    gaps.length > 0 ||
    signals.length > 0 ||
    predictions.workloadPeriods.length > 0 ||
    predictions.suggestedDates.length > 0 ||
    predictions.futureConflicts.length > 0 ||
    predictions.signalWarnings.length > 0 ||
    predictions.cascade != null;

  if (!hasAny) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground">
        No predictive signals for the current filter. The Hub only surfaces heuristics it can back
        with governed activity.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center space-x-2 mb-3">
        <Lightbulb className="w-4 h-4 text-tf-blue" />
        <h3 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
          Predictive signals — suggestions, not decisions
        </h3>
      </div>
      <div className="flex overflow-x-auto pb-3 space-x-3 snap-x -mx-1 px-1">
        {conflicts.map((c) => (
          <Card
            key={c.id}
            icon={TriangleAlert}
            tone="warning"
            title={`Conflict · ${c.market}`}
            onClick={
              onOpenEvent && c.eventIds.length > 0
                ? () => onOpenEvent(c.eventIds[0])
                : undefined
            }
          >
            <p className="text-sm font-medium text-foreground">{formatDayShort(c.date)}</p>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
                What collides
              </p>
              {c.events.map((e) => (
                <p key={e.id} className="text-xs text-foreground leading-snug">
                  {e.title}
                </p>
              ))}
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
                Suggested resolution
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.suggestion}</p>
            </div>
            {onOpenEvent && c.eventIds.length > 0 && (
              <p className="text-xs font-semibold text-tf-blue">Open activity to review →</p>
            )}
          </Card>
        ))}

        {predictions.cascade && (
          <Card icon={Shuffle} tone="info" title="Move preview">
            <p className="text-sm font-medium text-foreground">
              {predictions.cascade.eventTitle}: {formatDayShort(predictions.cascade.fromDate)} →{" "}
              {formatDayShort(predictions.cascade.toDate)}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {predictions.cascade.note}
            </p>
            {predictions.cascade.shifts.length > 0 && (
              <ul className="space-y-1 pt-1">
                {predictions.cascade.shifts.map((s) => (
                  <li key={s.eventId} className="text-xs text-muted-foreground leading-relaxed">
                    {s.note}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {predictions.signalWarnings.map((w) => (
          <Card key={w.id} icon={Signal} tone="warning" title={`Signal · ${w.market}`}>
            <p className="text-sm font-medium text-foreground">{formatDayShort(w.date)}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{w.note}</p>
          </Card>
        ))}

        {predictions.futureConflicts.map((f) => (
          <Card key={f.id} icon={CalendarClock} tone="warning" title={`Watch · ${f.market}`}>
            <p className="text-sm font-medium text-foreground">{formatDayShort(f.date)}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.note}</p>
          </Card>
        ))}

        {predictions.workloadPeriods.map((p) => (
          <Card key={p.id} icon={Gauge} tone="info" title={p.label}>
            <p className="text-sm font-medium text-foreground">{p.count} activities</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.note}</p>
          </Card>
        ))}

        {gaps.map((g, i) => (
          <Card key={`gap-${i}`} icon={CalendarX2} tone="neutral" title="Activity gap">
            <p className="text-sm font-medium text-foreground">
              {formatDayShort(g.start)} – {formatDayShort(g.end)} · {g.days} days
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">{g.note}</p>
          </Card>
        ))}

        {predictions.suggestedDates.map((s, i) => (
          <Card key={`sug-${i}`} icon={Lightbulb} tone="info" title="Suggested window">
            <p className="text-sm font-medium text-foreground">{formatDayShort(s.date)}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.note}</p>
          </Card>
        ))}

        {signals.map((s) => (
          <Card key={s.id} icon={Signal} tone="neutral" title={`External · ${s.market}`}>
            <p className="text-sm font-medium text-foreground">
              {s.title} · {formatDayShort(s.date)}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
