import React from "react";
import type { PlanningInsights } from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { PLANNING_I18N } from "@/i18n/planning";
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

// When the strip renders as a vertical list (right-column "Signals" tab) the
// cards stretch to the full column width instead of the fixed strip sizing.
const FluidContext = React.createContext(false);

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
  const fluid = React.useContext(FluidContext);
  const body = (
    <div
      style={{
        ...(fluid
          ? { width: "100%" }
          : { minWidth: 260, maxWidth: 320, flexShrink: 0 }),
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
  layout = "row",
}: {
  insights: PlanningInsights;
  onOpenEvent?: (id: string) => void;
  layout?: "row" | "column";
}) {
  const { lang } = useApp();
  const t = PLANNING_I18N[lang];
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
          {t.noPredictive}
        </Text2>
      </div>
    );
  }

  return (
    <Stack space={12}>
      <Inline space={8} alignItems="center">
        <IconInformationRegular size={16} color={skinVars.colors.brand} />
        <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
          {t.predictiveHeader}
        </Text1>
      </Inline>
      <FluidContext.Provider value={layout === "column"}>
      <div
        style={
          layout === "column"
            ? { display: "flex", flexDirection: "column", gap: 12 }
            : { display: "flex", overflowX: "auto", gap: 12, paddingBottom: 12 }
        }
      >
        {conflicts.map((c) => (
          <Card
            key={c.id}
            Icon={IconWarningRegular}
            tone="warning"
            title={t.conflictCard(c.market)}
            onClick={
              onOpenEvent && c.eventIds.length > 0 ? () => onOpenEvent(c.eventIds[0]) : undefined
            }
          >
            <Text2 medium color={skinVars.colors.textPrimary}>
              {formatDayShort(c.date, lang)}
            </Text2>
            <Stack space={2}>
              <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                {t.whatCollides}
              </Text1>
              {c.events.map((e) => (
                <Text1 key={e.id} regular color={skinVars.colors.textPrimary}>
                  {e.title}
                </Text1>
              ))}
            </Stack>
            <Stack space={2}>
              <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                {t.suggestedResolution}
              </Text1>
              <Text2 regular color={skinVars.colors.textSecondary}>
                {c.suggestion}
              </Text2>
            </Stack>
            {onOpenEvent && c.eventIds.length > 0 && (
              <Text1 medium color={skinVars.colors.brand}>
                {t.openToReview}
              </Text1>
            )}
          </Card>
        ))}

        {predictions.cascade && (
          <Card Icon={IconShuffleRegular} tone="info" title={t.movePreview}>
            <Text2 medium color={skinVars.colors.textPrimary}>
              {predictions.cascade.eventTitle}: {formatDayShort(predictions.cascade.fromDate, lang)} →{" "}
              {formatDayShort(predictions.cascade.toDate, lang)}
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
            title={t.delayRiskCard(r.level)}
            onClick={onOpenEvent ? () => onOpenEvent(r.eventId) : undefined}
          >
            <Text2 medium color={skinVars.colors.textPrimary}>
              {r.title} · {formatDayShort(r.date, lang)}
            </Text2>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {r.note}
            </Text2>
            {onOpenEvent && (
              <Text1 medium color={skinVars.colors.brand}>
                {t.openToReview}
              </Text1>
            )}
          </Card>
        ))}

        {predictions.signalWarnings.map((w) => (
          <Card key={w.id} Icon={IconAntennaRegular} tone="warning" title={t.signalCard(w.market)}>
            <Text2 medium color={skinVars.colors.textPrimary}>
              {formatDayShort(w.date, lang)}
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
            title={t.watchCard(f.market)}
          >
            <Text2 medium color={skinVars.colors.textPrimary}>
              {formatDayShort(f.date, lang)}
            </Text2>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {f.note}
            </Text2>
          </Card>
        ))}

        {predictions.workloadPeriods.map((p) => (
          <Card key={p.id} Icon={IconTrendUpRegular} tone="info" title={p.label}>
            <Text2 medium color={skinVars.colors.textPrimary}>
              {t.activitiesCount(p.count)}
            </Text2>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {p.note}
            </Text2>
          </Card>
        ))}

        {gaps.map((g, i) => (
          <Card key={`gap-${i}`} Icon={IconCalendarRegular} tone="neutral" title={t.activityGap}>
            <Text2 medium color={skinVars.colors.textPrimary}>
              {formatDayShort(g.start, lang)} – {formatDayShort(g.end, lang)} · {t.gapDays(g.days)}
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
            title={t.suggestedWindow}
          >
            <Text2 medium color={skinVars.colors.textPrimary}>
              {formatDayShort(s.date, lang)}
            </Text2>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {s.note}
            </Text2>
          </Card>
        ))}

        {signals.map((s) => (
          <Card key={s.id} Icon={IconAntennaRegular} tone="neutral" title={t.externalCard(s.market)}>
            <Text2 medium color={skinVars.colors.textPrimary}>
              {s.title} · {formatDayShort(s.date, lang)}
            </Text2>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {s.description}
            </Text2>
          </Card>
        ))}
      </div>
      </FluidContext.Provider>
    </Stack>
  );
}
