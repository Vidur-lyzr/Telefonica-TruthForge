import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListQualityRuns,
  useGetQualityRun,
  useListQualityGoldens,
  useListQualityFeedback,
  useGetQualityFeedbackItem,
  useStartQualityRun,
  useClassifyQualityFeedback,
  useStartQualityReeval,
  type QualityEvalRunSummary,
  type QualityEvalResultRow,
  type QualityFeedbackEntry,
} from "@workspace/api-client-react";
import {
  Box,
  Boxed,
  Stack,
  Inline,
  Grid,
  Table,
  Tag,
  Sheet,
  TextField,
  Select,
  ButtonPrimary,
  ButtonSecondary,
  ButtonLink,
  Text1,
  Text2,
  Text3,
  Title2,
  Title3,
  skinVars,
  applyAlpha,
  IconTachometerRegular,
  IconDocumentsRegular,
  IconMessageRegular,
} from "@telefonica/mistica";
import { ResponsiveContainer, AreaChart, Area, YAxis } from "recharts";
import { useApp } from "@/components/app-provider";
import { ADMIN_I18N, localeFor } from "@/i18n/admin";

type TagType =
  | "promo"
  | "info"
  | "active"
  | "inactive"
  | "success"
  | "warning"
  | "error";

function verdictTagType(v: string): TagType {
  switch (v) {
    case "correct":
      return "success";
    case "partial":
      return "warning";
    case "incorrect":
      return "error";
    case "fabricated":
      return "error";
    default:
      return "inactive";
  }
}

function stateTagType(s: string): TagType {
  switch (s) {
    case "open":
      return "warning";
    case "classified":
      return "info";
    case "resolved":
      return "success";
    default:
      return "inactive";
  }
}

function triggerTagType(tr: string): TagType {
  switch (tr) {
    case "scheduled":
      return "info";
    case "manual":
      return "promo";
    case "reeval":
      return "active";
    default:
      return "inactive";
  }
}

function runStatusTagType(s: string): TagType {
  switch (s) {
    case "running":
      return "active";
    case "completed":
      return "success";
    case "failed":
      return "error";
    default:
      return "inactive";
  }
}

function answerStatusTagType(s: string): TagType {
  switch (s) {
    case "answered":
    case "drafted":
      return "success";
    case "no_evidence":
      return "warning";
    case "permission_blocked":
      return "error";
    case "conflict":
      return "promo";
    default:
      return "inactive";
  }
}

function formatTimestamp(ts: string, locale: string): string {
  return new Date(ts).toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function errorMessageOf(err: unknown): string | null {
  if (!err) return null;
  const data = (err as { data?: { error?: string } | null }).data;
  if (data && typeof data.error === "string") return data.error;
  if (err instanceof Error) return err.message;
  return null;
}

// Approved sparkline style: solid 2px status-color line, flat uniform-alpha
// tint underneath, dot on the latest value, padded Y domain.
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return null;
  const chartData = data.map((value, i) => ({ i, value }));
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pad = Math.max((max - min) * 0.35, Math.abs(max) * 0.02, 0.02);
  const lastIndex = data.length - 1;
  return (
    <ResponsiveContainer width="100%" height={56}>
      <AreaChart
        data={chartData}
        margin={{ top: 6, right: 5, left: 5, bottom: 2 }}
      >
        <YAxis hide domain={[min - pad, max + pad]} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={applyAlpha(color, 0.1)}
          fillOpacity={1}
          isAnimationActive={false}
          dot={(props: { cx?: number; cy?: number; index?: number }) =>
            props.index === lastIndex ? (
              <circle
                key={`spark-dot-${props.index}`}
                cx={props.cx}
                cy={props.cy}
                r={3}
                fill={color}
              />
            ) : (
              <circle
                key={`spark-dot-${props.index}`}
                cx={props.cx}
                cy={props.cy}
                r={0}
                fill="none"
              />
            )
          }
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Boxed>
      <Box padding={16}>
        <Stack space={4}>
          <Text1
            medium
            color={skinVars.colors.textSecondary}
            transform="uppercase"
          >
            {label}
          </Text1>
          <Text3 medium color={skinVars.colors.textPrimary}>
            {value}
          </Text3>
        </Stack>
      </Box>
    </Boxed>
  );
}

export default function QualitySection() {
  const { lang, roleId: viewerRoleId } = useApp();
  const t = ADMIN_I18N[lang].quality;
  const tLog = ADMIN_I18N[lang].log;
  const locale = localeFor(lang);
  const queryClient = useQueryClient();

  const [polling, setPolling] = React.useState(false);
  const [openRunId, setOpenRunId] = React.useState<string | null>(null);
  const [openFeedbackId, setOpenFeedbackId] = React.useState<string | null>(
    null,
  );
  const [showGoldens, setShowGoldens] = React.useState(false);
  const [errorClass, setErrorClass] = React.useState("retrieval_miss");
  const [corrective, setCorrective] = React.useState("");

  const enabled = viewerRoleId.length > 0;

  const runsQ = useListQualityRuns(
    { viewerRoleId },
    {
      query: {
        enabled,
        queryKey: ["quality-runs", viewerRoleId],
        refetchInterval: polling ? 2500 : undefined,
      },
    },
  );
  const running = runsQ.data?.running ?? false;
  React.useEffect(() => {
    setPolling(running);
  }, [running]);

  const runQ = useGetQualityRun(
    { viewerRoleId, runId: openRunId ?? "" },
    {
      query: {
        enabled: enabled && openRunId !== null,
        queryKey: ["quality-run", viewerRoleId, openRunId],
        refetchInterval: polling ? 2500 : undefined,
      },
    },
  );

  const goldensQ = useListQualityGoldens(
    { viewerRoleId },
    {
      query: {
        enabled,
        queryKey: ["quality-goldens", viewerRoleId],
      },
    },
  );

  const feedbackQ = useListQualityFeedback(
    { viewerRoleId },
    {
      query: {
        enabled,
        queryKey: ["quality-feedback", viewerRoleId],
        refetchInterval: polling ? 2500 : undefined,
      },
    },
  );

  const feedbackItemQ = useGetQualityFeedbackItem(
    { viewerRoleId, feedbackId: openFeedbackId ?? "" },
    {
      query: {
        enabled: enabled && openFeedbackId !== null,
        queryKey: ["quality-feedback-item", viewerRoleId, openFeedbackId],
        refetchInterval: polling ? 2500 : undefined,
      },
    },
  );

  const startRunM = useStartQualityRun();
  const classifyM = useClassifyQualityFeedback();
  const reevalM = useStartQualityReeval();

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["quality-runs"] });
    queryClient.invalidateQueries({ queryKey: ["quality-run"] });
    queryClient.invalidateQueries({ queryKey: ["quality-feedback"] });
    queryClient.invalidateQueries({ queryKey: ["quality-feedback-item"] });
  }

  const runs = React.useMemo(() => {
    const items = runsQ.data?.items ?? [];
    return [...items].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
  }, [runsQ.data]);

  const completedAsc = React.useMemo(
    () =>
      [...runs]
        .filter((r) => r.status === "completed" && r.metrics)
        .sort(
          (a, b) =>
            new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
        ),
    [runs],
  );
  const latest = completedAsc[completedAsc.length - 1] ?? null;
  const accuracySeries = completedAsc.map((r) => r.metrics!.accuracy);

  const goldens = goldensQ.data?.items ?? [];
  const feedback = feedbackQ.data?.items ?? [];
  const detail = feedbackItemQ.data ?? null;
  const openRun = runQ.data ?? null;

  const pct = (x: number | null | undefined) =>
    x == null ? t.notMeasured : `${(x * 100).toFixed(1)}%`;

  const listError = errorMessageOf(runsQ.error);

  const sortedRows: QualityEvalResultRow[] = React.useMemo(() => {
    if (!openRun) return [];
    return [...openRun.results].sort((a, b) => {
      if (a.pass !== b.pass) return a.pass ? 1 : -1;
      return a.goldenId.localeCompare(b.goldenId);
    });
  }, [openRun]);

  function openFeedback(entry: QualityFeedbackEntry) {
    setOpenFeedbackId(entry.id);
    setErrorClass(entry.triage.errorClass ?? "retrieval_miss");
    setCorrective(entry.triage.correctiveAction ?? "");
  }

  function submitClassify() {
    if (!openFeedbackId || corrective.trim().length === 0) return;
    classifyM.mutate(
      {
        data: {
          roleId: viewerRoleId,
          feedbackId: openFeedbackId,
          errorClass,
          correctiveAction: corrective.trim(),
        },
      },
      { onSuccess: invalidateAll },
    );
  }

  function submitReeval() {
    if (!openFeedbackId) return;
    reevalM.mutate(
      { data: { roleId: viewerRoleId, feedbackId: openFeedbackId } },
      { onSuccess: invalidateAll },
    );
  }

  function startRun() {
    startRunM.mutate(
      { data: { roleId: viewerRoleId } },
      { onSuccess: invalidateAll },
    );
  }

  return (
    <Stack space={32}>
      {/* Scorecard */}
      <Stack space={16}>
        <Stack space={4}>
          <Inline space={8} alignItems="center">
            <IconTachometerRegular color={skinVars.colors.brand} />
            <Title3>{t.title}</Title3>
          </Inline>
          <Text2 regular color={skinVars.colors.textSecondary}>
            {t.intro}
          </Text2>
        </Stack>

        {listError && (
          <Boxed>
            <Box padding={16}>
              <Text2 regular color={skinVars.colors.error}>
                {listError}
              </Text2>
            </Box>
          </Boxed>
        )}

        {!listError && (
          <Stack space={16}>
            <Inline space={12} alignItems="center" wrap>
              <ButtonSecondary small onPress={startRun} disabled={running}>
                {t.runNow}
              </ButtonSecondary>
              {running && (
                <Tag type="active">{t.runInFlight}</Tag>
              )}
              {runsQ.data?.nextEvalAt && (
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {t.nextEval(formatTimestamp(runsQ.data.nextEvalAt, locale))}
                </Text2>
              )}
            </Inline>
            {errorMessageOf(startRunM.error) && (
              <Text2 regular color={skinVars.colors.error}>
                {errorMessageOf(startRunM.error)}
              </Text2>
            )}

            {latest?.metrics ? (
              <Stack space={16}>
                <Grid columns={3} gap={16}>
                  <MetricCard
                    label={t.accuracy}
                    value={pct(latest.metrics.accuracy)}
                  />
                  <MetricCard
                    label={t.citationCorrectness}
                    value={pct(latest.metrics.citationCorrectness)}
                  />
                  <MetricCard
                    label={t.hallucinationRate}
                    value={pct(latest.metrics.hallucinationRate)}
                  />
                  <MetricCard
                    label={t.latencyP50}
                    value={`${latest.metrics.p50LatencyMs} ms`}
                  />
                  <MetricCard
                    label={t.latencyP95}
                    value={`${latest.metrics.p95LatencyMs} ms`}
                  />
                  <Boxed>
                    <Box padding={16}>
                      <Stack space={4}>
                        <Text1
                          medium
                          color={skinVars.colors.textSecondary}
                          transform="uppercase"
                        >
                          {t.accuracyTrend}
                        </Text1>
                        {accuracySeries.length > 1 ? (
                          <Sparkline
                            data={accuracySeries}
                            color={skinVars.rawColors.success}
                          />
                        ) : (
                          <Text3 medium color={skinVars.colors.textPrimary}>
                            {pct(latest.metrics.accuracy)}
                          </Text3>
                        )}
                      </Stack>
                    </Box>
                  </Boxed>
                </Grid>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {t.goldensPassed(latest.metrics.passed, latest.metrics.total)}
                </Text2>
              </Stack>
            ) : (
              <Boxed>
                <Box padding={24}>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {t.noRuns}
                  </Text2>
                </Box>
              </Boxed>
            )}
          </Stack>
        )}
      </Stack>

      {/* Run history */}
      {!listError && runs.length > 0 && (
        <Stack space={16}>
          <Title3>{t.runHistory}</Title3>
          <Table
            heading={[t.colRun, t.colTrigger, t.colStarted, t.colStatus, t.colResult, ""]}
            content={runs.map((r: QualityEvalRunSummary) => [
              <Text2 medium color={skinVars.colors.textPrimary} key={`${r.id}-id`}>
                {r.id}
              </Text2>,
              <Tag type={triggerTagType(r.trigger)} key={`${r.id}-tr`}>
                {t.triggerLabels[r.trigger] ?? r.trigger}
              </Tag>,
              <Text2 regular color={skinVars.colors.textSecondary} key={`${r.id}-st`}>
                {formatTimestamp(r.startedAt, locale)}
              </Text2>,
              <Inline space={8} alignItems="center" key={`${r.id}-status`}>
                <Tag type={runStatusTagType(r.status)}>
                  {t.runStatusLabels[r.status] ?? r.status}
                </Tag>
                {r.status === "running" && (
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    {r.progressDone}/{r.progressTotal}
                  </Text1>
                )}
              </Inline>,
              <Text2 regular color={skinVars.colors.textSecondary} key={`${r.id}-res`}>
                {r.metrics ? pct(r.metrics.accuracy) : (r.error ?? "—")}
              </Text2>,
              <ButtonLink small onPress={() => setOpenRunId(r.id)} key={`${r.id}-d`}>
                {t.detail}
              </ButtonLink>,
            ])}
          />
        </Stack>
      )}

      {/* Golden set */}
      {!listError && (
        <Stack space={16}>
          <Stack space={4}>
            <Inline space={8} alignItems="center">
              <IconDocumentsRegular color={skinVars.colors.brand} />
              <Title3>{t.goldensTitle}</Title3>
            </Inline>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {t.goldensIntro}
            </Text2>
          </Stack>
          <Inline space={8} alignItems="center">
            <ButtonLink small onPress={() => setShowGoldens((v) => !v)}>
              {showGoldens ? t.hideGoldens : t.showGoldens(goldens.length)}
            </ButtonLink>
          </Inline>
          {showGoldens && goldens.length > 0 && (
            <Table
              heading={[t.colQuestion, t.colPersona, t.colLang, t.colExpectedStatus]}
              content={goldens.map((g) => [
                <Text2 regular color={skinVars.colors.textPrimary} key={`${g.id}-q`}>
                  {g.question}
                </Text2>,
                <Text2 regular color={skinVars.colors.textSecondary} key={`${g.id}-p`}>
                  {g.roleId}
                </Text2>,
                <Text2 regular color={skinVars.colors.textSecondary} key={`${g.id}-l`}>
                  {g.lang.toUpperCase()}
                </Text2>,
                <Tag type={answerStatusTagType(g.expectedStatus)} key={`${g.id}-s`}>
                  {tLog.statusLabels[g.expectedStatus] ?? g.expectedStatus}
                </Tag>,
              ])}
            />
          )}
        </Stack>
      )}

      {/* Triage queue */}
      {!listError && (
        <Stack space={16}>
          <Stack space={4}>
            <Inline space={8} alignItems="center">
              <IconMessageRegular color={skinVars.colors.brand} />
              <Title3>{t.triageTitle}</Title3>
            </Inline>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {t.triageIntro}
            </Text2>
          </Stack>
          {feedback.length === 0 ? (
            <Boxed>
              <Box padding={24}>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {t.triageEmpty}
                </Text2>
              </Box>
            </Boxed>
          ) : (
            <Table
              heading={[t.colWhen, t.colVerdict, t.colQuestion, t.colPersona, t.colState, ""]}
              content={feedback.map((f) => [
                <Text2 regular color={skinVars.colors.textSecondary} key={`${f.id}-w`}>
                  {formatTimestamp(f.createdAt, locale)}
                </Text2>,
                <Tag type={verdictTagType(f.verdict)} key={`${f.id}-v`}>
                  {t.verdictLabels[f.verdict] ?? f.verdict}
                </Tag>,
                <Text2 regular color={skinVars.colors.textPrimary} key={`${f.id}-q`}>
                  {f.question}
                </Text2>,
                <Text2 regular color={skinVars.colors.textSecondary} key={`${f.id}-p`}>
                  {f.roleId}
                </Text2>,
                <Tag type={stateTagType(f.triage.state)} key={`${f.id}-s`}>
                  {t.stateLabels[f.triage.state] ?? f.triage.state}
                </Tag>,
                <ButtonLink small onPress={() => openFeedback(f)} key={`${f.id}-d`}>
                  {t.detail}
                </ButtonLink>,
              ])}
            />
          )}
        </Stack>
      )}

      {/* Run detail sheet */}
      {openRunId && (
        <Sheet onClose={() => setOpenRunId(null)}>
          {() => (
            <Box paddingBottom={24}>
              <Stack space={16}>
                <Stack space={4}>
                  <Title2>
                    {t.runDetailTitle} {openRunId}
                  </Title2>
                  {openRun?.metrics && (
                    <Text2 regular color={skinVars.colors.textSecondary}>
                      {t.goldensPassed(openRun.metrics.passed, openRun.metrics.total)} ·{" "}
                      {t.accuracy} {pct(openRun.metrics.accuracy)} ·{" "}
                      {t.hallucinationRate} {pct(openRun.metrics.hallucinationRate)}
                    </Text2>
                  )}
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    {t.failedFirst}
                  </Text1>
                </Stack>
                {openRun && (
                  <Table
                    heading={[
                      t.colGolden,
                      `${t.colExpected} \u2192 ${t.colActual}`,
                      t.colCitations,
                      t.colOutcomeHdr,
                    ]}
                    content={sortedRows.map((row) => [
                      <Stack space={2} key={`${row.goldenId}-g`}>
                        <Text1 medium color={skinVars.colors.textPrimary}>
                          {row.goldenId}
                        </Text1>
                        <Text1 regular color={skinVars.colors.textSecondary}>
                          {row.question}
                        </Text1>
                        <Text1 regular color={skinVars.colors.textSecondary}>
                          {row.roleId} · {row.lang.toUpperCase()}
                        </Text1>
                      </Stack>,
                      <Stack space={4} key={`${row.goldenId}-ea`}>
                        <Tag type={answerStatusTagType(row.expectedStatus)}>
                          {tLog.statusLabels[row.expectedStatus] ?? row.expectedStatus}
                        </Tag>
                        {row.actualStatus ? (
                          <Tag type={answerStatusTagType(row.actualStatus)}>
                            {tLog.statusLabels[row.actualStatus] ?? row.actualStatus}
                          </Tag>
                        ) : (
                          <Text1 regular color={skinVars.colors.textSecondary}>
                            {row.error ?? t.notMeasured}
                          </Text1>
                        )}
                      </Stack>,
                      <Text1 regular color={skinVars.colors.textSecondary} key={`${row.goldenId}-c`}>
                        {row.citationsTotal > 0
                          ? t.groundedOf(row.citationsGrounded, row.citationsTotal)
                          : t.none}
                      </Text1>,
                      <Inline space={4} alignItems="center" key={`${row.goldenId}-o`}>
                        <Tag type={row.pass ? "success" : "error"}>
                          {row.pass ? t.passLabel : t.failLabel}
                        </Tag>
                        {row.hallucinated && (
                          <Tag type="error">{t.hallucinatedTag}</Tag>
                        )}
                      </Inline>,
                    ])}
                  />
                )}
              </Stack>
            </Box>
          )}
        </Sheet>
      )}

      {/* Feedback detail sheet */}
      {openFeedbackId && (
        <Sheet onClose={() => setOpenFeedbackId(null)}>
          {() => (
            <Box paddingBottom={24}>
              <Stack space={16}>
                <Stack space={4}>
                  <Title2>{t.feedbackDetail}</Title2>
                  {detail && (
                    <Inline space={8} alignItems="center" wrap>
                      <Tag type={verdictTagType(detail.verdict)}>
                        {t.verdictLabels[detail.verdict] ?? detail.verdict}
                      </Tag>
                      <Tag type={stateTagType(detail.triage.state)}>
                        {t.stateLabels[detail.triage.state] ?? detail.triage.state}
                      </Tag>
                      <Text2 regular color={skinVars.colors.textSecondary}>
                        {detail.roleId}
                        {detail.lang ? ` · ${detail.lang.toUpperCase()}` : ""} ·{" "}
                        {formatTimestamp(detail.createdAt, locale)}
                      </Text2>
                    </Inline>
                  )}
                </Stack>

                {detail && (
                  <Stack space={16}>
                    <Boxed>
                      <Box padding={16}>
                        <Stack space={12}>
                          <Text3 medium color={skinVars.colors.textPrimary}>
                            {detail.question}
                          </Text3>
                          <Stack space={4}>
                            <Text1
                              medium
                              color={skinVars.colors.textSecondary}
                              transform="uppercase"
                            >
                              {t.answerShown}
                            </Text1>
                            <Text2 regular color={skinVars.colors.textPrimary}>
                              {detail.answerPreview}
                            </Text2>
                          </Stack>
                          <Inline space={8} alignItems="center" wrap>
                            <Tag type={answerStatusTagType(detail.answerStatus)}>
                              {tLog.statusLabels[detail.answerStatus] ??
                                detail.answerStatus}
                            </Tag>
                            <Text1 regular color={skinVars.colors.textSecondary}>
                              {t.citedDocs}:{" "}
                              {detail.citedDocIds.length > 0
                                ? detail.citedDocIds.join(", ")
                                : t.none}
                            </Text1>
                          </Inline>
                          {detail.note && (
                            <Stack space={4}>
                              <Text1
                                medium
                                color={skinVars.colors.textSecondary}
                                transform="uppercase"
                              >
                                {t.reporterNote}
                              </Text1>
                              <Text2 regular color={skinVars.colors.textPrimary}>
                                {detail.note}
                              </Text2>
                            </Stack>
                          )}
                        </Stack>
                      </Box>
                    </Boxed>

                    {/* Retrieval trace */}
                    <Stack space={8}>
                      <Title3>{t.traceTitle}</Title3>
                      {detail.retrievalTrace ? (
                        <Stack space={12}>
                          <Text1 regular color={skinVars.colors.textSecondary}>
                            {t.traceSummary(
                              detail.retrievalTrace.events.reduce(
                                (n, ev) =>
                                  n + ev.hits.filter((h) => h.accessible).length,
                                0,
                              ),
                              detail.retrievalTrace.events.reduce(
                                (n, ev) =>
                                  n + ev.hits.filter((h) => !h.accessible).length,
                                0,
                              ),
                            )}
                          </Text1>
                          {detail.retrievalTrace.events.map((ev, i) => (
                            <Boxed key={`trace-ev-${i}`}>
                              <Box padding={16}>
                                <Stack space={12}>
                                  <Inline space={8} alignItems="center" wrap>
                                    <Tag
                                      type={
                                        ev.engine === "qdrant" ? "info" : "inactive"
                                      }
                                    >
                                      {ev.engine}
                                    </Tag>
                                    <Text2 medium color={skinVars.colors.textPrimary}>
                                      "{ev.query}"
                                    </Text2>
                                  </Inline>
                                  <Text1 regular color={skinVars.colors.textSecondary}>
                                    {tLog.filterPrefix(ev.filterExpr)}
                                  </Text1>
                                  <Table
                                    heading={[
                                      tLog.colChunk,
                                      tLog.colScore,
                                      tLog.colAccessHdr,
                                    ]}
                                    content={ev.hits.map((h) => [
                                      <Stack space={2} key={`${h.chunkId}-c`}>
                                        <Text1
                                          regular
                                          color={skinVars.colors.textSecondary}
                                        >
                                          {h.chunkId}
                                        </Text1>
                                        <Text1
                                          regular
                                          color={skinVars.colors.textPrimary}
                                        >
                                          {h.docId}
                                        </Text1>
                                      </Stack>,
                                      <Text1
                                        regular
                                        color={skinVars.colors.textSecondary}
                                        key={`${h.chunkId}-s`}
                                      >
                                        {h.score.toFixed(3)}
                                      </Text1>,
                                      <Tag
                                        type={h.accessible ? "success" : "error"}
                                        key={`${h.chunkId}-a`}
                                      >
                                        {h.accessible ? tLog.permitted : tLog.blocked}
                                      </Tag>,
                                    ])}
                                  />
                                </Stack>
                              </Box>
                            </Boxed>
                          ))}
                        </Stack>
                      ) : (
                        <Text2 regular color={skinVars.colors.textSecondary}>
                          {t.noTrace}
                        </Text2>
                      )}
                    </Stack>

                    {/* Triage lifecycle */}
                    <Stack space={12}>
                      <Title3>{t.classifyHeading}</Title3>
                      {detail.triage.classifiedByRoleId &&
                        detail.triage.classifiedAt && (
                          <Text2 regular color={skinVars.colors.textSecondary}>
                            {t.classifiedByLine(
                              detail.triage.classifiedByRoleId,
                              formatTimestamp(detail.triage.classifiedAt, locale),
                            )}
                          </Text2>
                        )}
                      {detail.triage.state === "resolved" ? (
                        <Stack space={8}>
                          {detail.triage.errorClass && (
                            <Inline space={8} alignItems="center">
                              <Tag type="info">
                                {t.errorClassLabels[detail.triage.errorClass] ??
                                  detail.triage.errorClass}
                              </Tag>
                            </Inline>
                          )}
                          {detail.triage.correctiveAction && (
                            <Text2 regular color={skinVars.colors.textPrimary}>
                              {detail.triage.correctiveAction}
                            </Text2>
                          )}
                          {detail.triage.reevalRunId && (
                            <Text2 regular color={skinVars.colors.textSecondary}>
                              {t.reevalRunLabel}: {detail.triage.reevalRunId}
                            </Text2>
                          )}
                          {detail.triage.resolvedAt && (
                            <Tag type="success">
                              {t.resolvedLine(
                                formatTimestamp(detail.triage.resolvedAt, locale),
                              )}
                            </Tag>
                          )}
                        </Stack>
                      ) : (
                        <Stack space={12}>
                          <Select
                            name="quality-error-class"
                            label={t.errorClassLabel}
                            value={errorClass}
                            onChangeValue={setErrorClass}
                            options={Object.entries(t.errorClassLabels).map(
                              ([value, label]) => ({ value, text: label }),
                            )}
                          />
                          <TextField
                            name="quality-corrective-action"
                            label={t.correctiveActionLabel}
                            placeholder={t.correctiveActionPlaceholder}
                            value={corrective}
                            onChangeValue={setCorrective}
                          />
                          <Inline space={12} alignItems="center" wrap>
                            <ButtonPrimary
                              small
                              onPress={submitClassify}
                              disabled={
                                corrective.trim().length === 0 ||
                                classifyM.isPending
                              }
                            >
                              {t.classifySubmit}
                            </ButtonPrimary>
                            {detail.triage.state === "classified" && (
                              <ButtonSecondary
                                small
                                onPress={submitReeval}
                                disabled={reevalM.isPending || running}
                              >
                                {t.reeval}
                              </ButtonSecondary>
                            )}
                          </Inline>
                          {detail.triage.state === "classified" && (
                            <Text1 regular color={skinVars.colors.textSecondary}>
                              {t.reevalHint}
                            </Text1>
                          )}
                          {detail.triage.reevalRunId && (
                            <Text2 regular color={skinVars.colors.textSecondary}>
                              {t.reevalRunLabel}: {detail.triage.reevalRunId}
                            </Text2>
                          )}
                          {(errorMessageOf(classifyM.error) ||
                            errorMessageOf(reevalM.error)) && (
                            <Text2 regular color={skinVars.colors.error}>
                              {errorMessageOf(classifyM.error) ??
                                errorMessageOf(reevalM.error)}
                            </Text2>
                          )}
                        </Stack>
                      )}
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </Box>
          )}
        </Sheet>
      )}
    </Stack>
  );
}
