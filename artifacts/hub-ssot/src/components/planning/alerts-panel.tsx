import React from "react";
import { useListPlanningAlerts } from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
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

const KIND_META: Record<
  string,
  { label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }
> = {
  milestone: { label: "Milestone", Icon: IconCalendarEventRegular },
  conflict: { label: "Conflict", Icon: IconWarningRegular },
  deviation: { label: "Deviation", Icon: IconShuffleRegular },
};

export function AlertsPanel({ onOpenEvent }: { onOpenEvent?: (id: string) => void }) {
  const { roleId } = useApp();
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
              Personalised alerts
            </Text1>
          </Inline>

          {!alerts || alerts.length === 0 ? (
            <Text2 regular color={skinVars.colors.textSecondary}>
              Nothing needs your attention right now. Alerts appear here when a milestone is close,
              a conflict emerges, or a plan deviates for an owner you follow.
            </Text2>
          ) : (
            <Stack space={8}>
              {alerts.map((a) => {
                const meta = KIND_META[a.kind] ?? KIND_META.milestone;
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
                        <meta.Icon size={14} color={tone} />
                        <Text1 medium color={tone} transform="uppercase">
                          {meta.label} · {formatDayShort(a.date)}
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
                    aria-label={`Alert: ${a.eventTitle}`}
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
