import React from "react";
import { clearanceLabel } from "@/components/data-center/helpers";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPlanningEvent,
  useSimulatePlanningMove,
  useUpdatePlanningEvent,
  useListPlanningSync,
  type StrategicAxis,
  type PlanningMoveSimulation,
} from "@workspace/api-client-react";
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
  DateField,
  ButtonPrimary,
  ButtonSecondary,
  skinVars,
  applyAlpha,
  IconLockClosedRegular,
  IconWarningRegular,
  IconLocationRegular,
  IconUserAccountRegular,
  IconAntennaRegular,
  IconShuffleRegular,
  IconTimeRegular,
} from "@telefonica/mistica";
import { axisColor, axisName, formatDay, formatDayShort, STATUS_TONE } from "./utils";
import { PLANNING_I18N } from "@/i18n/planning";

export function EventDrawer({
  eventId,
  axes,
  onClose,
}: {
  eventId: string | null;
  axes: StrategicAxis[] | undefined;
  onClose: () => void;
}) {
  const { roleId, lang } = useApp();
  const t = PLANNING_I18N[lang];
  const queryClient = useQueryClient();
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

  const [moveOpen, setMoveOpen] = React.useState(false);
  const [toStart, setToStart] = React.useState("");
  const {
    mutate: simulate,
    isPending: simulating,
    data: simulation,
    reset: resetSimulation,
  } = useSimulatePlanningMove();
  const {
    mutate: applyMove,
    isPending: applying,
    error: moveError,
    reset: resetMove,
  } = useUpdatePlanningEvent();

  const { data: syncRecords } = useListPlanningSync(
    { roleId, eventId: eventId ?? "" },
    {
      query: {
        enabled: !!eventId && !!roleId,
        queryKey: ["planning-sync", eventId, roleId],
      },
    },
  );

  React.useEffect(() => {
    setMoveOpen(false);
    setToStart("");
    resetSimulation();
    resetMove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  if (!eventId) return null;

  const moveErrorText = moveError
    ? (moveError.data?.error ?? t.moveErrorFallback)
    : null;

  const runSimulation = () => {
    if (!toStart) return;
    resetMove();
    simulate({ data: { roleId, eventId, toStart } });
  };

  const confirmMove = () => {
    if (!toStart) return;
    applyMove(
      { data: { roleId, id: eventId, startDate: toStart } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ["planning-events"] });
          void queryClient.invalidateQueries({ queryKey: ["planning-insights"] });
          void queryClient.invalidateQueries({ queryKey: ["planning-alerts"] });
          void queryClient.invalidateQueries({ queryKey: ["planning-event", eventId, roleId] });
          void queryClient.invalidateQueries({ queryKey: ["planning-sync", eventId, roleId] });
          setMoveOpen(false);
          setToStart("");
          resetSimulation();
        },
      },
    );
  };

  return (
    <Sheet onClose={onClose}>
      {({ modalTitleId }) => (
        <Box paddingX={24} paddingBottom={32} paddingTop={16}>
          {isLoading && (
            <Box paddingY={64}>
              <Inline space={12} alignItems="center">
                <Spinner size={24} />
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {t.loadingEvent}
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
                    {t.restricted}
                  </Text1>
                </Inline>
                <Text5 id={modalTitleId}>{t.blockedActivity}</Text5>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {formatDay(ev.startDate, lang)}
                  {ev.endDate !== ev.startDate ? ` – ${formatDay(ev.endDate, lang)}` : ""} ·{" "}
                  {ev.market}
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
                  {t.restrictedNoteBefore}{" "}
                  <Text2 as="span" medium color={skinVars.colors.textPrimary}>
                    {clearanceLabel(ev.confidentiality)}
                  </Text2>{" "}
                  {t.restrictedNoteAfter}
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
                      {t.types[ev.type] ?? ev.type}
                    </Text1>
                  </div>
                  <Inline space={8} alignItems="center">
                    <Tag type={STATUS_TONE[ev.status] ?? "inactive"}>
                      {t.statuses[ev.status] ?? ev.status}
                    </Tag>
                    <Tag type={ev.confidentiality === "public" ? "success" : "error"}>
                      {clearanceLabel(ev.confidentiality)}
                    </Tag>
                  </Inline>
                </Inline>
                <Text5 id={modalTitleId}>{ev.title}</Text5>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {formatDay(ev.startDate, lang)}
                  {ev.endDate !== ev.startDate ? ` – ${formatDay(ev.endDate, lang)}` : ""}
                </Text2>
              </Stack>

              <Text3 regular color={skinVars.colors.textPrimary}>
                {ev.description}
              </Text3>

              <Grid columns={{ minSize: 160 }} gap={16}>
                <Meta Icon={IconLocationRegular} label={t.metaMarket}>
                  {ev.market}
                </Meta>
                <Meta Icon={IconAntennaRegular} label={t.metaBrand}>
                  {ev.brand}
                </Meta>
                <Meta Icon={IconUserAccountRegular} label={t.metaOwner}>
                  {ev.owner}
                </Meta>
                <Meta label={t.metaSource}>{ev.source}</Meta>
                <Meta label={t.metaArea}>{ev.area}</Meta>
                <Stack space={4}>
                  <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                    {t.metaAxis}
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
                      {axisName(axes, ev.axisId, lang)}
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
                        {t.timingConflict}
                      </Text1>
                    </Inline>
                    <Text2 regular color={skinVars.colors.textPrimary}>
                      {t.clashesWith}
                    </Text2>
                    <Stack space={8}>
                      {data.conflictsWith.map((c) => (
                        <Text2 key={c.id} medium color={skinVars.colors.textPrimary}>
                          {c.title}{" "}
                          <Text2 as="span" regular color={skinVars.colors.textSecondary}>
                            ({c.brand} · {t.types[c.type] ?? c.type})
                          </Text2>
                        </Text2>
                      ))}
                    </Stack>
                  </Stack>
                </div>
              )}

              {/* Move with what-if simulation */}
              <div
                style={{
                  border: `1px solid ${skinVars.colors.divider}`,
                  borderRadius: skinVars.borderRadii.container,
                  padding: 20,
                }}
              >
                <Stack space={16}>
                  <Inline space="between" alignItems="center">
                    <Inline space={8} alignItems="center">
                      <IconShuffleRegular size={16} color={skinVars.colors.brand} />
                      <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                        {t.moveActivity}
                      </Text1>
                    </Inline>
                    {!moveOpen && (
                      <ButtonSecondary small onPress={() => setMoveOpen(true)}>
                        {t.pickNewDate}
                      </ButtonSecondary>
                    )}
                  </Inline>

                  {moveOpen && (
                    <Stack space={16}>
                      <Text2 regular color={skinVars.colors.textSecondary}>
                        {t.moveInstructions(ev.source)}
                      </Text2>
                      <Inline space={16} alignItems="center" wrap>
                        <div style={{ minWidth: 200 }}>
                          <DateField
                            name="toStart"
                            label={t.newStartDate}
                            value={toStart}
                            onChangeValue={(v) => {
                              setToStart(v);
                              resetSimulation();
                              resetMove();
                            }}
                            fullWidth
                          />
                        </div>
                        <ButtonSecondary
                          small
                          onPress={runSimulation}
                          disabled={!toStart || simulating}
                        >
                          {simulating ? t.simulating : t.simulateImpact}
                        </ButtonSecondary>
                      </Inline>

                      {simulation && <SimulationResult simulation={simulation} />}

                      {moveErrorText && (
                        <div
                          style={{
                            backgroundColor: applyAlpha(skinVars.rawColors.error, 0.12),
                            borderRadius: skinVars.borderRadii.container,
                            padding: 16,
                          }}
                        >
                          <Text2 regular color={skinVars.colors.textPrimary}>
                            {moveErrorText}
                          </Text2>
                        </div>
                      )}

                      <Inline space={16}>
                        <ButtonPrimary
                          small
                          onPress={confirmMove}
                          disabled={!toStart || applying || !simulation}
                        >
                          {applying ? t.moving : t.confirmMove}
                        </ButtonPrimary>
                        <ButtonSecondary
                          small
                          onPress={() => {
                            setMoveOpen(false);
                            setToStart("");
                            resetSimulation();
                            resetMove();
                          }}
                          disabled={applying}
                        >
                          {t.cancel}
                        </ButtonSecondary>
                      </Inline>
                      {!simulation && (
                        <Text1 regular color={skinVars.colors.textSecondary}>
                          {t.simulateFirst}
                        </Text1>
                      )}
                    </Stack>
                  )}
                </Stack>
              </div>

              {/* Sync records */}
              {syncRecords && syncRecords.length > 0 && (
                <Stack space={12}>
                  <Inline space={8} alignItems="center">
                    <IconTimeRegular size={16} color={skinVars.colors.textSecondary} />
                    <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                      {t.writeBackLog}
                    </Text1>
                  </Inline>
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    {t.writeBackNote}
                  </Text1>
                  <Stack space={8}>
                    {syncRecords.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          border: `1px solid ${skinVars.colors.divider}`,
                          borderRadius: skinVars.borderRadii.container,
                          padding: 12,
                        }}
                      >
                        <Stack space={4}>
                          <Inline space="between" alignItems="center">
                            <Text1 medium color={skinVars.colors.textPrimary} transform="uppercase">
                              {r.action} · {r.source}
                            </Text1>
                            <Tag type="warning">{t.pendingConfirmation}</Tag>
                          </Inline>
                          <Text1 regular color={skinVars.colors.textSecondary}>
                            {r.detail}
                          </Text1>
                          <Text1 regular color={skinVars.colors.textSecondary}>
                            {t.requestedBy(r.requestedBy, formatDayShort(r.requestedAt.slice(0, 10), lang))}
                          </Text1>
                        </Stack>
                      </div>
                    ))}
                  </Stack>
                </Stack>
              )}
            </Stack>
          )}
        </Box>
      )}
    </Sheet>
  );
}

function SimulationResult({ simulation }: { simulation: PlanningMoveSimulation }) {
  const { lang } = useApp();
  const t = PLANNING_I18N[lang];
  const hasIssues =
    simulation.newConflicts.length > 0 ||
    simulation.nearMisses.length > 0 ||
    simulation.signalWarnings.length > 0;
  const tone = simulation.newConflicts.length > 0 ? "error" : hasIssues ? "warning" : "success";
  const raw =
    tone === "error"
      ? skinVars.rawColors.error
      : tone === "warning"
        ? skinVars.rawColors.warning
        : skinVars.rawColors.success;

  return (
    <div
      style={{
        backgroundColor: applyAlpha(raw, 0.1),
        border: `1px solid ${applyAlpha(raw, 0.2)}`,
        borderRadius: skinVars.borderRadii.container,
        padding: 16,
      }}
    >
      <Stack space={12}>
        <Text2 medium color={skinVars.colors.textPrimary}>
          {formatDayShort(simulation.fromStart, lang)} → {formatDayShort(simulation.toStart, lang)}{" "}
          {t.endsAt(formatDayShort(simulation.toEnd, lang))}
        </Text2>
        <Text2 regular color={skinVars.colors.textPrimary}>
          {simulation.verdict}
        </Text2>

        {simulation.resolved.length > 0 && (
          <ImpactList label={t.impactResolves} items={simulation.resolved.map((i) => i.note)} />
        )}
        {simulation.newConflicts.length > 0 && (
          <ImpactList label={t.impactNewConflicts} items={simulation.newConflicts.map((i) => i.note)} />
        )}
        {simulation.nearMisses.length > 0 && (
          <ImpactList label={t.impactNearMisses} items={simulation.nearMisses.map((i) => i.note)} />
        )}
        {simulation.signalWarnings.length > 0 && (
          <ImpactList label={t.impactExternalSignals} items={simulation.signalWarnings.map((i) => i.note)} />
        )}
      </Stack>
    </div>
  );
}

function ImpactList({ label, items }: { label: string; items: string[] }) {
  return (
    <Stack space={4}>
      <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
        {label}
      </Text1>
      {items.map((n, i) => (
        <Text1 key={i} regular color={skinVars.colors.textPrimary}>
          {n}
        </Text1>
      ))}
    </Stack>
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
