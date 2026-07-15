import React from "react";
import { clearanceLabel } from "@/components/data-center/helpers";
import { useQueryClient } from "@tanstack/react-query";
import {
  useSchedulePlanningForecast,
  useListPlanningForecastSchedules,
  useCreatePlanningForecastSchedule,
  useCancelPlanningForecastSchedule,
  useListVersions,
  type Citation,
  type PlanningForecast,
  type GeneratedDraft,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { streamPlanningForecast } from "@/hooks/planning-forecast-stream";
import type { PlanningAskStep } from "@/hooks/planning-ask-stream";
import { PLANNING_I18N, localeFor } from "@/i18n/planning";
import { AnswerMarkdown } from "@/components/answer-markdown";
import { ForecastEditor } from "./forecast-editor";
import {
  Sheet,
  ThemeVariant,
  Box,
  Stack,
  Inline,
  Text1,
  Text2,
  Text3,
  Text6,
  Touchable,
  ButtonPrimary,
  ButtonSecondary,
  Tag,
  Spinner,
  skinVars,
  applyAlpha,
  IconStatusChartRegular,
  IconCalendarEventRegular,
  IconCalendarRepeatRegular,
  IconAntennaRegular,
  IconShieldRegular,
  IconFileTextRegular,
  IconWarningRegular,
  IconTimeRegular,
  IconEditPencilRegular,
  IconFolderRegular,
  IconCheckRegular,
  IconChevronDownRegular,
} from "@telefonica/mistica";
import { formatDay, formatDayShort } from "./utils";
import { AlertsPanel } from "./alerts-panel";

function Stat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "info" | "warning" | "success";
}) {
  const color =
    tone === "warning"
      ? skinVars.colors.warning
      : tone === "success"
        ? skinVars.colors.success
        : skinVars.colors.brand;
  return (
    <div style={{ textAlign: "center", padding: "0 12px" }}>
      <Text6 color={color}>{value}</Text6>
      <Box paddingTop={4}>
        <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
          {label}
        </Text1>
      </Box>
    </div>
  );
}

function CitationChip({
  id,
  onPress,
  ariaLabel,
}: {
  id: string;
  onPress: () => void;
  ariaLabel: string;
}) {
  return (
    <Touchable onPress={onPress} aria-label={ariaLabel}>
      <div
        style={{
          backgroundColor: applyAlpha(skinVars.rawColors.brand, 0.12),
          borderRadius: skinVars.borderRadii.chip,
          padding: "1px 6px",
          display: "inline-block",
        }}
      >
        <Text1 medium color={skinVars.colors.brand}>
          {id}
        </Text1>
      </div>
    </Touchable>
  );
}

// Live agent steps while the forecast is being generated: the real pipeline
// (scope -> evidence -> risks -> compose) streamed from the server as it
// happens, with a spinner on the active step. After the run, the trail
// collapses into a one-line summary that expands on demand.
function ForecastStepList({ steps, pending }: { steps: PlanningAskStep[]; pending: boolean }) {
  return (
    <div style={{ paddingLeft: 4 }}>
      <Stack space={8}>
        {steps.map((s) => {
          const active = pending && s.state === "active";
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  flexShrink: 0,
                  width: 14,
                  justifyContent: "center",
                  paddingTop: 2,
                }}
              >
                {active ? (
                  <Spinner size={12} />
                ) : (
                  <IconCheckRegular size={12} color={skinVars.colors.success} />
                )}
              </div>
              <Text1
                regular
                color={active ? skinVars.colors.textPrimary : skinVars.colors.textSecondary}
              >
                {s.label}
                {s.detail ? ` — ${s.detail}` : ""}
              </Text1>
            </div>
          );
        })}
      </Stack>
    </div>
  );
}

function ForecastStepTrail({ steps }: { steps: PlanningAskStep[] }) {
  const { lang } = useApp();
  const t = PLANNING_I18N[lang];
  const [open, setOpen] = React.useState(false);
  if (steps.length === 0) return null;
  return (
    <Stack space={8}>
      <Touchable
        onPress={() => setOpen((v) => !v)}
        aria-label={open ? t.hideAgentActions : t.showAgentActions}
      >
        <Inline space={8} alignItems="center">
          <IconCheckRegular size={14} color={skinVars.colors.success} />
          <Text1 regular color={skinVars.colors.textSecondary}>
            {t.agentActionsDone(steps.length)}
          </Text1>
          <div
            aria-hidden
            style={{
              display: "inline-flex",
              transition: "transform 0.15s ease",
              transform: open ? "rotate(180deg)" : "none",
            }}
          >
            <IconChevronDownRegular size={14} color={skinVars.colors.textSecondary} />
          </div>
        </Inline>
      </Touchable>
      {open && <ForecastStepList steps={steps} pending={false} />}
    </Stack>
  );
}

const FREQUENCIES = ["daily", "weekly", "monthly"] as const;
type Frequency = (typeof FREQUENCIES)[number];

const RISK_TONE: Record<string, string> = {
  conflict: "warning",
  risk: "error",
  signal: "brand",
};

export function ForecastSection({ onOpenEvent }: { onOpenEvent?: (id: string) => void }) {
  const { area, roleId, lang } = useApp();
  const t = PLANNING_I18N[lang];
  const queryClient = useQueryClient();
  const [selected, setSelected] = React.useState<Citation | null>(null);
  const [frequency, setFrequency] = React.useState<Frequency>("weekly");
  const [editorDraft, setEditorDraft] = React.useState<GeneratedDraft | null>(null);
  // Forecast generation streams over SSE so the user watches the real agent
  // pipeline (scope -> evidence -> risks -> compose) instead of a blind wait.
  const [forecast, setForecast] = React.useState<PlanningForecast | undefined>(undefined);
  const [isPending, setIsPending] = React.useState(false);
  const [genSteps, setGenSteps] = React.useState<PlanningAskStep[]>([]);
  const [genError, setGenError] = React.useState<string | null>(null);
  const genAbort = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => genAbort.current?.abort(), []);

  const generate = () => {
    if (isPending || !roleId) return;
    genAbort.current?.abort();
    const ctrl = new AbortController();
    genAbort.current = ctrl;
    setGenError(null);
    setGenSteps([]);
    setIsPending(true);
    streamPlanningForecast(
      { area, roleId },
      {
        onStep: (step) =>
          setGenSteps((prev) => {
            const i = prev.findIndex((s) => s.id === step.id);
            if (i !== -1) return prev.map((s, j) => (j === i ? step : s));
            // A new step becoming active implies earlier steps are done.
            return [...prev.map((s) => ({ ...s, state: "done" as const })), step];
          }),
      },
      ctrl.signal,
    )
      .then((result) => {
        if (ctrl.signal.aborted) return;
        setForecast(result);
        setGenSteps((prev) => prev.map((s) => ({ ...s, state: "done" as const })));
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setGenError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setIsPending(false);
      });
  };
  const {
    mutate: schedule,
    isPending: scheduling,
    data: scheduled,
    reset: resetScheduled,
  } = useSchedulePlanningForecast();

  const schedulesKey = ["planning-forecast-schedules", roleId] as const;
  const { data: recurringSchedules } = useListPlanningForecastSchedules(
    { roleId },
    { query: { enabled: !!roleId, queryKey: [...schedulesKey] } },
  );
  const activeSchedule = (recurringSchedules ?? [])[0];
  const invalidateSchedules = () =>
    void queryClient.invalidateQueries({ queryKey: [...schedulesKey] });
  const { mutate: createRecurring, isPending: creatingRecurring } =
    useCreatePlanningForecastSchedule({
      mutation: { onSuccess: invalidateSchedules },
    });
  const { mutate: cancelRecurring, isPending: cancellingRecurring } =
    useCancelPlanningForecastSchedule({
      mutation: { onSuccess: invalidateSchedules },
    });

  // Persona-scoped on the server: only versions authored under the active
  // persona's own drafts come back, so switching to a lower-clearance persona
  // can never surface (or reopen) a higher-clearance forecast.
  const versionsQ = useListVersions(
    { roleId },
    { query: { enabled: !!roleId, queryKey: ["saved-versions", roleId] } },
  );
  const forecastVersions = (versionsQ.data ?? []).filter(
    (v) => (v.draft as GeneratedDraft | undefined)?.params?.format === "planning-forecast",
  );

  const openCitationById = (cid: string) => {
    const c = forecast?.citations.find((x) => x.id === cid);
    if (c) setSelected(c);
  };

  const statusColor = (status: string) =>
    status === "live" || status === "in_progress"
      ? skinVars.colors.success
      : status === "at_risk"
        ? skinVars.colors.warning
        : skinVars.colors.textSecondary;

  const generated = forecast && forecast.status === "generated";

  return (
    <>
      <div
        style={{
          backgroundColor: skinVars.colors.backgroundContainer,
          border: `1px solid ${skinVars.colors.divider}`,
          borderRadius: skinVars.borderRadii.container,
          overflow: "hidden",
        }}
      >
        {/* Brand header band */}
        <ThemeVariant variant="brand">
          <div style={{ backgroundColor: skinVars.colors.backgroundBrand }}>
            <Box padding={24}>
              <Stack space={16}>
                <Inline space="between" alignItems="center">
                  <Inline space={8} alignItems="center">
                    <IconStatusChartRegular
                      size={20}
                      color={skinVars.colors.textPrimaryInverse}
                    />
                    <Text3 medium color={skinVars.colors.textPrimaryInverse}>
                      {t.forecastTitle}
                    </Text3>
                    {generated && (
                      <Inline space={8} alignItems="center">
                        <IconCalendarEventRegular
                          size={14}
                          color={applyAlpha(skinVars.rawColors.inverse, 0.72)}
                        />
                        <Text1 medium color={applyAlpha(skinVars.rawColors.inverse, 0.72)}>
                          {formatDay(forecast.rangeStart, lang)} –{" "}
                          {formatDay(forecast.rangeEnd, lang)}
                        </Text1>
                      </Inline>
                    )}
                  </Inline>
                  <Inline space={8}>
                    {generated && forecast.draft && (
                      <ButtonSecondary
                        small
                        onPress={() => setEditorDraft(forecast.draft as GeneratedDraft)}
                      >
                        {t.openInEditor}
                      </ButtonSecondary>
                    )}
                    <ButtonPrimary
                      small
                      showSpinner={isPending}
                      onPress={() => {
                        if (isPending) return;
                        resetScheduled();
                        generate();
                      }}
                      disabled={!roleId}
                    >
                      {isPending ? t.generating : forecast ? t.refresh : t.generate}
                    </ButtonPrimary>
                  </Inline>
                </Inline>
                {!forecast && !isPending && (
                  <Text2 regular color={applyAlpha(skinVars.rawColors.inverse, 0.8)}>
                    {t.forecastIntro}
                  </Text2>
                )}
              </Stack>
            </Box>
          </div>
        </ThemeVariant>

        <Box padding={24}>
          {genError && !isPending && (
            <Box paddingBottom={16}>
              <div
                style={{
                  backgroundColor: applyAlpha(skinVars.rawColors.error, 0.08),
                  borderRadius: skinVars.borderRadii.container,
                  padding: 16,
                }}
              >
                <Inline space={12} alignItems="center">
                  <IconWarningRegular size={20} color={skinVars.colors.error} />
                  <Text2 regular color={skinVars.colors.textPrimary}>
                    {genError}
                  </Text2>
                </Inline>
              </div>
            </Box>
          )}
          {isPending ? (
            <Box paddingY={16}>
              <Stack space={16}>
                <Inline space={12} alignItems="center">
                  <Spinner size={24} />
                  <Text2 medium color={skinVars.colors.textPrimary}>
                    {t.composingForecast}
                  </Text2>
                </Inline>
                <ForecastStepList steps={genSteps} pending />
              </Stack>
            </Box>
          ) : forecast && forecast.status === "no_activity" ? (
            <div
              style={{
                backgroundColor: applyAlpha(skinVars.rawColors.warning, 0.12),
                borderRadius: skinVars.borderRadii.container,
                padding: 16,
              }}
            >
              <Inline space={12} alignItems="center">
                <IconShieldRegular size={20} color={skinVars.colors.warning} />
                <Text2 regular color={skinVars.colors.textPrimary}>
                  {forecast.summary}
                </Text2>
              </Inline>
            </div>
          ) : generated ? (
            <Stack space={24}>
              <ForecastStepTrail steps={genSteps} />
              {/* Stat strip */}
              <div
                style={{
                  backgroundColor: skinVars.colors.backgroundAlternative,
                  borderRadius: skinVars.borderRadii.container,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-around",
                  padding: "12px 0",
                }}
              >
                <Stat value={forecast.highlights.liveCount} label={t.statLive} tone="success" />
                <div
                  style={{ width: 1, height: 32, backgroundColor: skinVars.colors.divider }}
                />
                <Stat
                  value={forecast.highlights.conflictCount}
                  label={t.statConflicts}
                  tone="warning"
                />
                <div
                  style={{ width: 1, height: 32, backgroundColor: skinVars.colors.divider }}
                />
                <Stat value={forecast.highlights.riskCount} label={t.statRisks} tone="warning" />
              </div>

              {/* Outlook narrative */}
              <Stack space={8}>
                <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                  {t.outlookTitle}
                </Text1>
                <AnswerMarkdown
                  text={forecast.summary}
                  citations={forecast.citations}
                  onOpenCitation={setSelected}
                />
              </Stack>

              {/* Day-by-day timeline */}
              <Stack space={8}>
                <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                  {t.dayByDay}
                </Text1>
                <div style={{ display: "flex", overflowX: "auto", gap: 8, paddingBottom: 8 }}>
                  {forecast.days.map((d) => (
                    <div
                      key={d.date}
                      style={{
                        flexShrink: 0,
                        width: 210,
                        border: `1px solid ${skinVars.colors.divider}`,
                        borderRadius: skinVars.borderRadii.container,
                        backgroundColor: d.clear
                          ? skinVars.colors.backgroundAlternative
                          : skinVars.colors.backgroundContainer,
                        padding: 12,
                      }}
                    >
                      <Stack space={8}>
                        <Text1
                          medium
                          color={skinVars.colors.textSecondary}
                          transform="uppercase"
                        >
                          {formatDayShort(d.date, lang)}
                        </Text1>
                        {d.clear ? (
                          <Text1 regular color={skinVars.colors.textSecondary}>
                            {t.clearDay}
                          </Text1>
                        ) : (
                          <Stack space={12}>
                            {d.entries.map((en) => (
                              <Stack key={`${d.date}-${en.eventId}`} space={4}>
                                <Inline space={8} alignItems="center">
                                  <div
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: "50%",
                                      flexShrink: 0,
                                      backgroundColor: statusColor(en.status),
                                    }}
                                  />
                                  {onOpenEvent ? (
                                    <Touchable
                                      onPress={() => onOpenEvent(en.eventId)}
                                      aria-label={en.title}
                                    >
                                      <Text1 medium color={skinVars.colors.textPrimary}>
                                        {en.title}
                                      </Text1>
                                    </Touchable>
                                  ) : (
                                    <Text1 medium color={skinVars.colors.textPrimary}>
                                      {en.title}
                                    </Text1>
                                  )}
                                </Inline>
                                <Inline space={8} alignItems="center" wrap>
                                  {en.isStart && (
                                    <Tag type="success">{t.startsLabel}</Tag>
                                  )}
                                  <Text1 regular color={skinVars.colors.textSecondary}>
                                    {en.market}/{en.brand} · {en.owner}
                                  </Text1>
                                  <CitationChip
                                    id={en.citationId}
                                    onPress={() => openCitationById(en.citationId)}
                                    ariaLabel={t.citationLabel(en.citationId)}
                                  />
                                </Inline>
                              </Stack>
                            ))}
                          </Stack>
                        )}
                      </Stack>
                    </div>
                  ))}
                </div>
              </Stack>

              {/* Risk callouts */}
              <Stack space={8}>
                <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                  {t.risksTitle}
                </Text1>
                {forecast.risks.length === 0 ? (
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {t.noRisks}
                  </Text2>
                ) : (
                  <Stack space={8}>
                    {forecast.risks.map((r, i) => {
                      const tone = RISK_TONE[r.kind] ?? "warning";
                      const color =
                        tone === "warning"
                          ? skinVars.colors.warning
                          : tone === "error"
                            ? skinVars.colors.error
                            : skinVars.colors.brand;
                      const raw =
                        tone === "warning"
                          ? skinVars.rawColors.warning
                          : tone === "error"
                            ? skinVars.rawColors.error
                            : skinVars.rawColors.brand;
                      const Icon =
                        r.kind === "signal" ? IconAntennaRegular : IconWarningRegular;
                      return (
                        <div
                          key={i}
                          style={{
                            backgroundColor: applyAlpha(raw, 0.08),
                            borderLeft: `3px solid ${color}`,
                            borderRadius: skinVars.borderRadii.container,
                            padding: 12,
                          }}
                        >
                          <Stack space={4}>
                            <Inline space={8} alignItems="center">
                              <Icon size={14} color={color} />
                              <Text1 medium color={color} transform="uppercase">
                                {t.riskKinds[r.kind as keyof typeof t.riskKinds] ??
                                  t.riskKinds.risk}
                              </Text1>
                            </Inline>
                            <Text2 regular color={skinVars.colors.textPrimary}>
                              {r.text}
                            </Text2>
                            <Inline space={4} wrap>
                              {r.citationIds.map((cid) => (
                                <CitationChip
                                  key={cid}
                                  id={cid}
                                  onPress={() => openCitationById(cid)}
                                  ariaLabel={t.citationLabel(cid)}
                                />
                              ))}
                            </Inline>
                          </Stack>
                        </div>
                      );
                    })}
                  </Stack>
                )}
              </Stack>

              {/* Prepared lines */}
              {forecast.preparedLines.length > 0 && (
                <Stack space={8}>
                  <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                    {t.preparedLinesTitle}
                  </Text1>
                  <Stack space={8}>
                    {forecast.preparedLines.map((line, i) => (
                      <div
                        key={i}
                        style={{
                          backgroundColor: skinVars.colors.backgroundAlternative,
                          borderRadius: skinVars.borderRadii.container,
                          padding: 12,
                        }}
                      >
                        <AnswerMarkdown
                          text={line}
                          citations={forecast.citations}
                          onOpenCitation={setSelected}
                        />
                      </div>
                    ))}
                  </Stack>
                </Stack>
              )}

              {/* Citation chips row */}
              {forecast.citations.length > 0 && (
                <Stack space={8}>
                  <Inline space={8} alignItems="center">
                    <IconFileTextRegular size={14} color={skinVars.colors.textSecondary} />
                    <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                      {t.citedActivity}
                    </Text1>
                  </Inline>
                  <div style={{ display: "flex", overflowX: "auto", gap: 8, paddingBottom: 8 }}>
                    {forecast.citations.map((c, i) => (
                      <div key={i} style={{ flexShrink: 0, width: 220 }}>
                        <Touchable
                          onPress={() => setSelected(c)}
                          aria-label={t.evidenceAria(c.id, c.docTitle)}
                        >
                          <div
                            style={{
                              backgroundColor: skinVars.colors.backgroundAlternative,
                              border: `1px solid ${skinVars.colors.divider}`,
                              borderRadius: skinVars.borderRadii.container,
                              padding: 10,
                            }}
                          >
                            <Inline space={8} alignItems="center">
                              <div
                                style={{
                                  backgroundColor: applyAlpha(skinVars.rawColors.brand, 0.12),
                                  borderRadius: skinVars.borderRadii.chip,
                                  padding: "2px 6px",
                                }}
                              >
                                <Text1 medium color={skinVars.colors.brand}>
                                  {c.id}
                                </Text1>
                              </div>
                              <div
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Text1 medium color={skinVars.colors.textPrimary}>
                                  {c.docTitle}
                                </Text1>
                              </div>
                            </Inline>
                            <Box paddingTop={4}>
                              <div
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Text1 regular color={skinVars.colors.textSecondary}>
                                  {c.sourceLoc}
                                </Text1>
                              </div>
                            </Box>
                          </div>
                        </Touchable>
                      </div>
                    ))}
                  </div>
                </Stack>
              )}

              {/* Disclaimers */}
              {forecast.disclaimers.length > 0 && (
                <Stack space={8}>
                  <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                    {t.disclaimersTitle}
                  </Text1>
                  <Stack space={8}>
                    {forecast.disclaimers.map((d) => (
                      <Text1 key={d.id} regular color={skinVars.colors.textSecondary}>
                        {d.text}
                      </Text1>
                    ))}
                  </Stack>
                </Stack>
              )}

              {/* Schedule to review */}
              {scheduled ? (
                <div
                  style={{
                    backgroundColor: skinVars.colors.backgroundAlternative,
                    borderRadius: skinVars.borderRadii.container,
                    padding: 12,
                  }}
                >
                  <Text2 regular color={skinVars.colors.textPrimary}>
                    {t.scheduledNote(
                      scheduled.reviewItem.reviewFolder,
                      scheduled.reviewItem.draft.title,
                    )}
                  </Text2>
                </div>
              ) : (
                <div>
                  <ButtonSecondary
                    small
                    onPress={() => schedule({ data: { area, roleId } })}
                    disabled={scheduling || !roleId}
                  >
                    {scheduling ? t.scheduling : t.scheduleToReview}
                  </ButtonSecondary>
                </div>
              )}
            </Stack>
          ) : null}

          {/* Footer: recurring controls, saved versions and alerts */}
          <Box paddingTop={24}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 24,
                borderTop: `1px solid ${skinVars.colors.divider}`,
                paddingTop: 24,
              }}
            >
              {/* Recurring schedule */}
              <Stack space={12}>
                <Inline space={8} alignItems="center">
                  <IconCalendarRepeatRegular size={14} color={skinVars.colors.textSecondary} />
                  <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                    {t.recurringForecast}
                  </Text1>
                </Inline>
                {activeSchedule ? (
                  <Stack space={8}>
                    <Text2 regular color={skinVars.colors.textPrimary}>
                      {t.recurringActive(
                        activeSchedule.name,
                        t.freqEvery[
                          (activeSchedule.frequency === "daily" ||
                          activeSchedule.frequency === "weekly" ||
                          activeSchedule.frequency === "monthly"
                            ? activeSchedule.frequency
                            : "monthly") as "daily" | "weekly" | "monthly"
                        ],
                        activeSchedule.reviewFolder,
                      )}
                    </Text2>
                    <Inline space={8} alignItems="center">
                      <IconTimeRegular size={14} color={skinVars.colors.textSecondary} />
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        {t.lastRun}{" "}
                        {activeSchedule.lastRunAt
                          ? new Date(activeSchedule.lastRunAt).toLocaleString(localeFor(lang))
                          : t.notYet}
                      </Text1>
                    </Inline>
                    <div>
                      <ButtonSecondary
                        small
                        onPress={() =>
                          cancelRecurring({
                            data: { roleId, scheduleId: activeSchedule.id },
                          })
                        }
                        disabled={cancellingRecurring}
                      >
                        {cancellingRecurring ? t.cancelling : t.cancelRecurring}
                      </ButtonSecondary>
                    </div>
                  </Stack>
                ) : (
                  <Stack space={8}>
                    <Text2 regular color={skinVars.colors.textSecondary}>
                      {t.recurringIntro}
                    </Text2>
                    <Inline space={8} alignItems="center" wrap>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          borderRadius: skinVars.borderRadii.button,
                          border: `1px solid ${skinVars.colors.divider}`,
                          padding: 2,
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {FREQUENCIES.map((f) => (
                          <Touchable
                            key={f}
                            onPress={() => setFrequency(f)}
                            aria-label={t.frequencyAria(t.frequencies[f])}
                          >
                            <div
                              style={{
                                padding: "4px 12px",
                                borderRadius: skinVars.borderRadii.button,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                backgroundColor:
                                  frequency === f ? skinVars.colors.brand : "transparent",
                              }}
                            >
                              <Text2
                                medium
                                wordBreak={false}
                                color={
                                  frequency === f
                                    ? skinVars.colors.textPrimaryInverse
                                    : skinVars.colors.textSecondary
                                }
                              >
                                {t.frequencies[f]}
                              </Text2>
                            </div>
                          </Touchable>
                        ))}
                      </div>
                      <ButtonPrimary
                        small
                        onPress={() =>
                          createRecurring({ data: { area, roleId, frequency } })
                        }
                        disabled={creatingRecurring || !roleId}
                      >
                        {creatingRecurring ? t.creating : t.createRecurring}
                      </ButtonPrimary>
                    </Inline>
                  </Stack>
                )}
              </Stack>

              {/* Saved forecast versions */}
              <Stack space={12}>
                <Inline space={8} alignItems="center">
                  <IconFolderRegular size={14} color={skinVars.colors.textSecondary} />
                  <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                    {t.savedVersions}
                  </Text1>
                </Inline>
                {forecastVersions.length === 0 ? (
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {t.noSavedVersions}
                  </Text2>
                ) : (
                  <Stack space={8}>
                    {forecastVersions.slice(0, 5).map((v) => (
                      <Touchable
                        key={v.id}
                        onPress={() => setEditorDraft(v.draft as GeneratedDraft)}
                        aria-label={t.openVersionAria(v.title)}
                      >
                        <div
                          style={{
                            border: `1px solid ${skinVars.colors.divider}`,
                            borderRadius: skinVars.borderRadii.container,
                            padding: 12,
                          }}
                        >
                          <Stack space={4}>
                            <Inline space={8} alignItems="center">
                              <IconEditPencilRegular
                                size={14}
                                color={skinVars.colors.brand}
                              />
                              <Text1 medium color={skinVars.colors.textPrimary}>
                                {v.title}
                              </Text1>
                            </Inline>
                            <Text1 regular color={skinVars.colors.textSecondary}>
                              v{v.version} · {v.savedBy} ·{" "}
                              {new Date(v.savedAt).toLocaleString(localeFor(lang))}
                            </Text1>
                          </Stack>
                        </div>
                      </Touchable>
                    ))}
                  </Stack>
                )}
              </Stack>

              {/* Upgraded alerts */}
              <AlertsPanel onOpenEvent={onOpenEvent} />
            </div>
          </Box>
        </Box>
      </div>

      {selected && (
        <Sheet onClose={() => setSelected(null)}>
          {({ modalTitleId }) => (
            <Box paddingX={24} paddingBottom={32} paddingTop={16}>
              <Stack space={16}>
                <Inline space="between" alignItems="center">
                  <div
                    style={{
                      backgroundColor: applyAlpha(skinVars.rawColors.brand, 0.12),
                      borderRadius: skinVars.borderRadii.button,
                      padding: "4px 12px",
                    }}
                  >
                    <Text2 medium color={skinVars.colors.brand}>
                      Citation [{selected.id}]
                    </Text2>
                  </div>
                  <Tag type={selected.confidentiality === "public" ? "success" : "error"}>
                    {clearanceLabel(selected.confidentiality)}
                  </Tag>
                </Inline>
                <Text6 id={modalTitleId}>{selected.docTitle}</Text6>
                <Inline space={8} alignItems="center">
                  <IconAntennaRegular size={16} color={skinVars.colors.textSecondary} />
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {selected.sourceLoc}
                  </Text2>
                </Inline>
                <div
                  style={{
                    backgroundColor: skinVars.colors.backgroundAlternative,
                    border: `1px solid ${skinVars.colors.divider}`,
                    borderRadius: skinVars.borderRadii.container,
                    padding: 24,
                  }}
                >
                  <Text3 regular color={skinVars.colors.textPrimary}>
                    "{selected.snippet}"
                  </Text3>
                </div>
              </Stack>
            </Box>
          )}
        </Sheet>
      )}

      {editorDraft && (
        <ForecastEditor
          draft={editorDraft}
          onClose={() => setEditorDraft(null)}
          onOpenCitation={setSelected}
          onSaved={() => void versionsQ.refetch()}
        />
      )}
    </>
  );
}
