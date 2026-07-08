import React from "react";
import type { PlanningInsights } from "@workspace/api-client-react";
import {
  Box,
  Stack,
  Inline,
  Text1,
  Text2,
  Touchable,
  skinVars,
  IconWarningRegular,
  IconCalendarEventRegular,
  IconTrendUpRegular,
  IconAntennaRegular,
  IconCalendarRegular,
  IconInformationRegular,
  IconShuffleRegular,
} from "@telefonica/mistica";
import { formatDayShort } from "./utils";

type Tone = "warning" | "info" | "neutral";

function toneColor(tone: Tone): string {
  return tone === "warning"
    ? skinVars.colors.warning
    : tone === "info"
      ? skinVars.colors.brand
      : skinVars.colors.textSecondary;
}

function Card({
  Icon,
  tone,
  title,
  children,
  onClick,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  tone: Tone;
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <div
      style={{
        minWidth: 260,
        maxWidth: 320,
        flexShrink: 0,
        backgroundColor: skinVars.colors.backgroundContainer,
        border: `1px solid ${skinVars.colors.divider}`,
        borderRadius: skinVars.borderRadii.container,
        padding: 16,
      }}
    >
      <Stack space={8}>
        <Inline space={8} alignItems="center">
          <Icon size={16} color={toneColor(tone)} />
          <Text1 medium color={toneColor(tone)} transform="uppercase">
            {title}
          </Text1>
        </Inline>
        <Stack space={8}>{children}</Stack>
      </Stack>
    </div>
  );
  if (onClick) {
    return (
      <Touchable onPress={onClick} aria-label={title}>
        {body}
      </Touchable>
    );
  }
  return body;
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
    predictions.delayRisks.length > 0 ||
    predictions.suggestedDates.length > 0 ||
    predictions.futureConflicts.length > 0 ||
    predictions.signalWarnings.length > 0 ||
    predictions.cascade != null;

  if (!hasAny) {
    return (
      <div
        style={{
          backgroundColor: skinVars.colors.backgroundContainer,
          border: `1px solid ${skinVars.colors.divider}`,
          borderRadius: skinVars.borderRadii.container,
          padding: 16,
        }}
      >
        <Text2 regular color={skinVars.colors.textSecondary}>
          No predictive signals for the current filter. The Hub only surfaces heuristics it can back
          with governed activity.
        </Text2>
      </div>
    );
  }

  return (
    <Stack space={12}>
      <Inline space={8} alignItems="center">
        <IconInformationRegular size={16} color={skinVars.colors.brand} />
        <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
          Predictive signals — suggestions, not decisions
        </Text1>
      </Inline>
      <div style={{ display: "flex", overflowX: "auto", gap: 12, paddingBottom: 12 }}>
        {conflicts.map((c) => (
          <Card
            key={c.id}
            Icon={IconWarningRegular}
            tone="warning"
            title={`Conflict · ${c.market}`}
            onClick={
              onOpenEvent && c.eventIds.length > 0 ? () => onOpenEvent(c.eventIds[0]) : undefined
            }
          >
            <Text2 medium color={skinVars.colors.textPrimary}>
              {formatDayShort(c.date)}
            </Text2>
            <Stack space={2}>
              <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                What collides
              </Text1>
              {c.events.map((e) => (
                <Text1 key={e.id} regular color={skinVars.colors.textPrimary}>
                  {e.title}
                </Text1>
              ))}
            </Stack>
            <Stack space={2}>
              <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                Suggested resolution
              </Text1>
              <Text2 regular color={skinVars.colors.textSecondary}>
                {c.suggestion}
              </Text2>
            </Stack>
            {onOpenEvent && c.eventIds.length > 0 && (
              <Text1 medium color={skinVars.colors.brand}>
                Open activity to review →
              </Text1>
            )}
          </Card>
        ))}

        {predictions.cascade && (
          <Card Icon={IconShuffleRegular} tone="info" title="Move preview">
            <Text2 medium color={skinVars.colors.textPrimary}>
              {predictions.cascade.eventTitle}: {formatDayShort(predictions.cascade.fromDate)} →{" "}
              {formatDayShort(predictions.cascade.toDate)}
            </Text2>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {predictions.cascade.note}
            </Text2>
            {predictions.cascade.shifts.length > 0 && (
              <Stack space={4}>
                {predictions.cascade.shifts.map((s) => (
                  <Text1 key={s.eventId} regular color={skinVars.colors.textSecondary}>
                    {s.note}
                  </Text1>
                ))}
              </Stack>
            )}
          </Card>
        )}

        {predictions.delayRisks.map((r) => (
          <Card
            key={`risk-${r.eventId}`}
            Icon={IconTrendUpRegular}
            tone={r.level === "high" ? "warning" : "info"}
            title={`Delay risk · ${r.level === "high" ? "High" : "Medium"}`}
            onClick={onOpenEvent ? () => onOpenEvent(r.eventId) : undefined}
          >
            <Text2 medium color={skinVars.colors.textPrimary}>
              {r.title} · {formatDayShort(r.date)}
            </Text2>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {r.note}
            </Text2>
            {onOpenEvent && (
              <Text1 medium color={skinVars.colors.brand}>
                Open activity to review →
              </Text1>
            )}
          </Card>
        ))}

        {predictions.signalWarnings.map((w) => (
          <Card key={w.id} Icon={IconAntennaRegular} tone="warning" title={`Signal · ${w.market}`}>
            <Text2 medium color={skinVars.colors.textPrimary}>
              {formatDayShort(w.date)}
            </Text2>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {w.note}
            </Text2>
          </Card>
        ))}

        {predictions.futureConflicts.map((f) => (
          <Card
            key={f.id}
            Icon={IconCalendarEventRegular}
            tone="warning"
            title={`Watch · ${f.market}`}
          >
            <Text2 medium color={skinVars.colors.textPrimary}>
              {formatDayShort(f.date)}
            </Text2>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {f.note}
            </Text2>
          </Card>
        ))}

        {predictions.workloadPeriods.map((p) => (
          <Card key={p.id} Icon={IconTrendUpRegular} tone="info" title={p.label}>
            <Text2 medium color={skinVars.colors.textPrimary}>
              {p.count} activities
            </Text2>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {p.note}
            </Text2>
          </Card>
        ))}

        {gaps.map((g, i) => (
          <Card key={`gap-${i}`} Icon={IconCalendarRegular} tone="neutral" title="Activity gap">
            <Text2 medium color={skinVars.colors.textPrimary}>
              {formatDayShort(g.start)} – {formatDayShort(g.end)} · {g.days} days
            </Text2>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {g.note}
            </Text2>
          </Card>
        ))}

        {predictions.suggestedDates.map((s, i) => (
          <Card
            key={`sug-${i}`}
            Icon={IconInformationRegular}
            tone="info"
            title="Suggested window"
          >
            <Text2 medium color={skinVars.colors.textPrimary}>
              {formatDayShort(s.date)}
            </Text2>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {s.note}
            </Text2>
          </Card>
        ))}

        {signals.map((s) => (
          <Card key={s.id} Icon={IconAntennaRegular} tone="neutral" title={`External · ${s.market}`}>
            <Text2 medium color={skinVars.colors.textPrimary}>
              {s.title} · {formatDayShort(s.date)}
            </Text2>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {s.description}
            </Text2>
          </Card>
        ))}
      </div>
    </Stack>
  );
}
