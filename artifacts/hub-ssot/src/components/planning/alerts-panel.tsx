import React from "react";
import { useListPlanningAlerts, type PlanningAlert } from "@workspace/api-client-react";
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
  applyAlpha,
  IconBellRegular,
  IconWarningRegular,
  IconCalendarEventRegular,
  IconShuffleRegular,
  IconUserAccountRegular,
} from "@telefonica/mistica";
import { formatDayShort } from "./utils";

const KIND_ICON: Record<
  string,
  React.ComponentType<{ size?: number; color?: string }>
> = {
  milestone: IconCalendarEventRegular,
  conflict: IconWarningRegular,
  deviation: IconShuffleRegular,
};

function AlertCard({
  alert,
  onOpenEvent,
}: {
  alert: PlanningAlert;
  onOpenEvent?: (id: string) => void;
}) {
  const { lang } = useApp();
  const t = PLANNING_I18N[lang];
  const Icon = KIND_ICON[alert.kind] ?? KIND_ICON.milestone;
  const kindLabel =
    (t.alertKinds as Record<string, string>)[alert.kind] ?? t.alertKinds.milestone;
  const tone = alert.severity === "warning" ? skinVars.colors.warning : skinVars.colors.brand;
  const rawTone =
    alert.severity === "warning" ? skinVars.rawColors.warning : skinVars.rawColors.brand;
  const body = (
    <div
      style={{
        border: `1px solid ${skinVars.colors.divider}`,
        borderLeft: `3px solid ${tone}`,
        borderRadius: skinVars.borderRadii.container,
        backgroundColor: applyAlpha(rawTone, 0.04),
        padding: 12,
      }}
    >
      <Stack space={4}>
        <Inline space={8} alignItems="center">
          <Icon size={14} color={tone} />
          <Text1 medium color={tone} transform="uppercase">
            {kindLabel} · {formatDayShort(alert.date, lang)}
          </Text1>
        </Inline>
        <Text2 medium color={skinVars.colors.textPrimary}>
          {alert.eventTitle}
        </Text2>
        <Inline space={4} alignItems="center">
          <IconUserAccountRegular size={12} color={skinVars.colors.textSecondary} />
          <Text1 regular color={skinVars.colors.textSecondary}>
            {alert.owner}
          </Text1>
        </Inline>
        <Text1 regular color={skinVars.colors.textSecondary}>
          {alert.note}
        </Text1>
      </Stack>
    </div>
  );
  return onOpenEvent ? (
    <Touchable onPress={() => onOpenEvent(alert.eventId)} aria-label={t.alertAria(alert.eventTitle)}>
      {body}
    </Touchable>
  ) : (
    <div>{body}</div>
  );
}

export function AlertsPanel({ onOpenEvent }: { onOpenEvent?: (id: string) => void }) {
  const { roleId, lang } = useApp();
  const t = PLANNING_I18N[lang];
  const { data: alerts } = useListPlanningAlerts(
    { roleId },
    { query: { enabled: !!roleId, queryKey: ["planning-alerts", roleId] } },
  );

  const sortByDate = (list: PlanningAlert[]) =>
    [...list].sort((a, b) => (a.date < b.date ? -1 : 1));
  const warnings = sortByDate((alerts ?? []).filter((a) => a.severity === "warning"));
  const infos = sortByDate((alerts ?? []).filter((a) => a.severity !== "warning"));

  return (
    <div
      style={{
        backgroundColor: skinVars.colors.backgroundContainer,
        border: `1px solid ${skinVars.colors.divider}`,
        borderRadius: skinVars.borderRadii.container,
      }}
    >
      <Box padding={16}>
        <Stack space={12}>
          <Inline space={8} alignItems="center">
            <IconBellRegular size={16} color={skinVars.colors.brand} />
            <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
              {t.personalisedAlerts}
            </Text1>
          </Inline>

          {!alerts || alerts.length === 0 ? (
            <Text2 regular color={skinVars.colors.textSecondary}>
              {t.noAlerts}
            </Text2>
          ) : (
            <Stack space={16}>
              {warnings.length > 0 && (
                <Stack space={8}>
                  <Text1 medium color={skinVars.colors.warning} transform="uppercase">
                    {t.alertGroupWarning} ({warnings.length})
                  </Text1>
                  <Stack space={8}>
                    {warnings.map((a) => (
                      <AlertCard key={a.id} alert={a} onOpenEvent={onOpenEvent} />
                    ))}
                  </Stack>
                </Stack>
              )}
              {infos.length > 0 && (
                <Stack space={8}>
                  <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                    {t.alertGroupInfo} ({infos.length})
                  </Text1>
                  <Stack space={8}>
                    {infos.map((a) => (
                      <AlertCard key={a.id} alert={a} onOpenEvent={onOpenEvent} />
                    ))}
                  </Stack>
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      </Box>
    </div>
  );
}
