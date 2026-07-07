import React from "react";
import { useGetPlanningEvent, type StrategicAxis } from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import {
  Sheet,
  Box,
  Stack,
  Inline,
  Grid,
  Text1,
  Text2,
  Text3,
  Text5,
  Tag,
  Spinner,
  skinVars,
  applyAlpha,
  IconLockClosedRegular,
  IconWarningRegular,
  IconLocationRegular,
  IconUserAccountRegular,
  IconAntennaRegular,
} from "@telefonica/mistica";
import { axisColor, axisName, formatDay, STATUS_STYLE, TYPE_LABEL } from "./utils";

export function EventDrawer({
  eventId,
  axes,
  onClose,
}: {
  eventId: string | null;
  axes: StrategicAxis[] | undefined;
  onClose: () => void;
}) {
  const { roleId } = useApp();
  const { data, isLoading } = useGetPlanningEvent(
    { id: eventId ?? "", roleId },
    {
      query: {
        enabled: !!eventId && !!roleId,
        queryKey: ["planning-event", eventId, roleId],
      },
    },
  );

  const ev = data?.event;

  if (!eventId) return null;

  return (
    <Sheet onClose={onClose}>
      {({ modalTitleId }) => (
        <Box paddingX={24} paddingBottom={32} paddingTop={16}>
          {isLoading && (
            <Box paddingY={64}>
              <Inline space={12} alignItems="center">
                <Spinner size={24} />
                <Text2 regular color={skinVars.colors.textSecondary}>
                  Loading event…
                </Text2>
              </Inline>
            </Box>
          )}

          {ev && ev.restricted && (
            <Stack space={16}>
              <Stack space={8}>
                <Inline space={8} alignItems="center">
                  <IconLockClosedRegular size={20} color={skinVars.colors.error} />
                  <Text1 medium color={skinVars.colors.error} transform="uppercase">
                    Restricted
                  </Text1>
                </Inline>
                <Text5 id={modalTitleId}>Blocked activity</Text5>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {formatDay(ev.startDate)}
                  {ev.endDate !== ev.startDate ? ` – ${formatDay(ev.endDate)}` : ""} · {ev.market}
                </Text2>
              </Stack>
              <div
                style={{
                  backgroundColor: applyAlpha(skinVars.rawColors.error, 0.12),
                  borderRadius: skinVars.borderRadii.container,
                  padding: 24,
                }}
              >
                <Text2 regular color={skinVars.colors.textPrimary}>
                  There is activity in this slot, but it is classified{" "}
                  <Text2 as="span" medium color={skinVars.colors.textPrimary}>
                    {ev.confidentiality}
                  </Text2>{" "}
                  — above your current clearance. The Hub shows the slot as busy without revealing
                  its contents. Switch to a higher-clearance persona or request access.
                </Text2>
              </div>
            </Stack>
          )}

          {ev && !ev.restricted && (
            <Stack space={24}>
              <Stack space={8}>
                <Inline space="between" alignItems="center">
                  <div
                    style={{
                      backgroundColor: axisColor(axes, ev.axisId),
                      borderRadius: skinVars.borderRadii.button,
                      padding: "4px 12px",
                    }}
                  >
                    <Text1 medium color={skinVars.colors.textPrimaryInverse} transform="uppercase">
                      {TYPE_LABEL[ev.type] ?? ev.type}
                    </Text1>
                  </div>
                  <Inline space={8} alignItems="center">
                    <Tag type={STATUS_STYLE[ev.status]?.type ?? "inactive"}>
                      {STATUS_STYLE[ev.status]?.label ?? ev.status}
                    </Tag>
                    <Tag type={ev.confidentiality === "public" ? "success" : "error"}>
                      {ev.confidentiality}
                    </Tag>
                  </Inline>
                </Inline>
                <Text5 id={modalTitleId}>{ev.title}</Text5>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {formatDay(ev.startDate)}
                  {ev.endDate !== ev.startDate ? ` – ${formatDay(ev.endDate)}` : ""}
                </Text2>
              </Stack>

              <Text3 regular color={skinVars.colors.textPrimary}>
                {ev.description}
              </Text3>

              <Grid columns={{ minSize: 160 }} gap={16}>
                <Meta Icon={IconLocationRegular} label="Market">
                  {ev.market}
                </Meta>
                <Meta Icon={IconAntennaRegular} label="Brand">
                  {ev.brand}
                </Meta>
                <Meta Icon={IconUserAccountRegular} label="Owner">
                  {ev.owner}
                </Meta>
                <Meta label="Source">{ev.source}</Meta>
                <Meta label="Area">{ev.area}</Meta>
                <Stack space={4}>
                  <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                    Axis
                  </Text1>
                  <Inline space={8} alignItems="center">
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: skinVars.borderRadii.avatar,
                        backgroundColor: axisColor(axes, ev.axisId),
                      }}
                    />
                    <Text2 medium color={skinVars.colors.textPrimary}>
                      {axisName(axes, ev.axisId)}
                    </Text2>
                  </Inline>
                </Stack>
              </Grid>

              {data && data.conflictsWith.length > 0 && (
                <div
                  style={{
                    backgroundColor: applyAlpha(skinVars.rawColors.warning, 0.12),
                    border: `1px solid ${applyAlpha(skinVars.rawColors.warning, 0.2)}`,
                    borderRadius: skinVars.borderRadii.container,
                    padding: 20,
                  }}
                >
                  <Stack space={12}>
                    <Inline space={8} alignItems="center">
                      <IconWarningRegular size={20} color={skinVars.colors.warning} />
                      <Text1 medium color={skinVars.colors.warning} transform="uppercase">
                        Timing conflict
                      </Text1>
                    </Inline>
                    <Text2 regular color={skinVars.colors.textPrimary}>
                      This clashes in the same market and window with:
                    </Text2>
                    <Stack space={8}>
                      {data.conflictsWith.map((c) => (
                        <Text2 key={c.id} medium color={skinVars.colors.textPrimary}>
                          {c.title}{" "}
                          <Text2 as="span" regular color={skinVars.colors.textSecondary}>
                            ({c.brand} · {TYPE_LABEL[c.type] ?? c.type})
                          </Text2>
                        </Text2>
                      ))}
                    </Stack>
                  </Stack>
                </div>
              )}
            </Stack>
          )}
        </Box>
      )}
    </Sheet>
  );
}

function Meta({
  Icon,
  label,
  children,
}: {
  Icon?: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Stack space={4}>
      <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
        {label}
      </Text1>
      <Inline space={8} alignItems="center">
        {Icon && <Icon size={14} color={skinVars.colors.textSecondary} />}
        <Text2 medium color={skinVars.colors.textPrimary}>
          {children}
        </Text2>
      </Inline>
    </Stack>
  );
}
