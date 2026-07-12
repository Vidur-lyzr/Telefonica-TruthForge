import React from "react";
import { useListPlanningAlerts } from "@workspace/api-client-react";
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
  IconBellRegular,
  IconWarningRegular,
  IconCalendarEventRegular,
  IconShuffleRegular,
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

export function AlertsPanel({ onOpenEvent }: { onOpenEvent?: (id: string) => void }) {
  const { roleId, lang } = useApp();
  const t = PLANNING_I18N[lang];
  const { data: alerts } = useListPlanningAlerts(
    { roleId },
    { query: { enabled: !!roleId, queryKey: ["planning-alerts", roleId] } },
  );

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
            <Stack space={8}>
              {alerts.map((a) => {
                const Icon = KIND_ICON[a.kind] ?? KIND_ICON.milestone;
                const kindLabel =
                  (t.alertKinds as Record<string, string>)[a.kind] ?? t.alertKinds.milestone;
                const tone =
                  a.severity === "warning" ? skinVars.colors.warning : skinVars.colors.brand;
                const body = (
                  <div
                    style={{
                      border: `1px solid ${skinVars.colors.divider}`,
                      borderRadius: skinVars.borderRadii.container,
                      padding: 12,
                    }}
                  >
                    <Stack space={4}>
                      <Inline space={8} alignItems="center">
                        <Icon size={14} color={tone} />
                        <Text1 medium color={tone} transform="uppercase">
                          {kindLabel} · {formatDayShort(a.date, lang)}
                        </Text1>
                      </Inline>
                      <Text2 medium color={skinVars.colors.textPrimary}>
                        {a.eventTitle}
                      </Text2>
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        {a.note}
                      </Text1>
                    </Stack>
                  </div>
                );
                return onOpenEvent ? (
                  <Touchable
                    key={a.id}
                    onPress={() => onOpenEvent(a.eventId)}
                    aria-label={t.alertAria(a.eventTitle)}
                  >
                    {body}
                  </Touchable>
                ) : (
                  <div key={a.id}>{body}</div>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Box>
    </div>
  );
}
