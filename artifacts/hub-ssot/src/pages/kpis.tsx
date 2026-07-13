import React from "react";
import { clearanceLabel } from "@/components/data-center/helpers";
import {
  useQueryKpis,
  useGetKpiDetail,
  useAskKpis,
  useListKpiAlerts,
  useAcknowledgeKpiAlert,
  KpiCard as KpiCardType,
  KpiDetail,
  KpiSource,
  KpiAlert,
  Citation,
  AskResult,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { KPIS_I18N, localeFor } from "@/i18n/kpis";
import { useLocation } from "wouter";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Box,
  Stack,
  Inline,
  Grid,
  Boxed,
  Divider,
  Text1,
  Text2,
  Text3,
  Text5,
  Text8,
  Title1,
  Tag,
  Touchable,
  IconButton,
  ButtonSecondary,
  Select,
  DateField,
  Drawer,
  Spinner,
  skinVars,
  applyAlpha,
  IconTargetRegular,
  IconTrendUpRegular,
  IconTrendDownRegular,
  IconShieldCrossRegular,
  IconTimeRegular,
  IconAlertRegular,
  IconSendRegular,
  IconMessageRegular,
  IconFileTextRegular,
  IconArrowRightRegular,
  IconAiRegular,
  IconLayersRegular,
  IconCheckedRegular,
  IconShieldCheckedOkRegular,
  IconBellRegular,
  IconUserAccountRegular,
} from "@telefonica/mistica";

type PeriodType = "week" | "month" | "quarter" | "custom";

const PERIOD_TYPES: PeriodType[] = ["week", "month", "quarter", "custom"];

const STATUS_TAG: Record<
  KpiCardType["status"],
  "success" | "warning" | "error"
> = {
  "on-track": "success",
  amber: "warning",
  "off-track": "error",
};

function statusInkColor(status: KpiCardType["status"]): string {
  return status === "on-track"
    ? skinVars.colors.successHigh
    : status === "amber"
      ? skinVars.colors.warningHigh
      : skinVars.colors.errorHigh;
}

function Sparkline({
  data,
  color,
  gradId,
}: {
  data: number[];
  color: string;
  gradId: string;
}) {
  const chartData = data.map((value, i) => ({ i, value }));
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart
        data={chartData}
        margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id={`spark-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#spark-${gradId})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function VariationBadge({ kpi }: { kpi: KpiCardType }) {
  const improving =
    kpi.direction === "higher-better" ? kpi.variation >= 0 : kpi.variation <= 0;
  const flat = kpi.variation === 0;
  const tone = flat
    ? skinVars.colors.textSecondary
    : improving
      ? skinVars.colors.successHigh
      : skinVars.colors.errorHigh;
  return (
    <Inline space={4} alignItems="center">
      {flat ? (
        <Text1 medium color={tone}>
          –
        </Text1>
      ) : improving ? (
        <IconTrendUpRegular size={14} color={tone} />
      ) : (
        <IconTrendDownRegular size={14} color={tone} />
      )}
      <Text1 medium color={tone}>
        {kpi.variation > 0 ? "+" : ""}
        {kpi.variation}
        {kpi.unit} ({kpi.variationPct > 0 ? "+" : ""}
        {kpi.variationPct}%)
      </Text1>
    </Inline>
  );
}

function AxisPill({ name, color }: { name: string; color: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: color,
        borderRadius: skinVars.borderRadii.button,
        padding: "4px 10px",
      }}
    >
      <Text1
        medium
        color={skinVars.colors.textPrimaryInverse}
        transform="uppercase"
      >
        {name}
      </Text1>
    </div>
  );
}

function validityTagType(validity: string): "success" | "warning" | "inactive" {
  if (validity === "approved") return "success";
  if (validity === "historic" || validity === "superseded") return "warning";
  return "inactive";
}

function CardEvidenceChip({ kpi }: { kpi: KpiCardType }) {
  const { lang } = useApp();
  const t = KPIS_I18N[lang];
  const primary = kpi.sources[0];
  const extra = kpi.sources.length - 1;
  const validity = kpi.validity ?? "approved";
  return (
    <div
      style={{
        backgroundColor: skinVars.colors.backgroundAlternative,
        border: `1px solid ${skinVars.colors.divider}`,
        borderRadius: skinVars.borderRadii.container,
        padding: "8px 12px",
      }}
    >
      <Stack space={4}>
        <Inline space={8} alignItems="center">
          <IconFileTextRegular size={14} color={skinVars.colors.brand} />
          <div
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <Text2 medium color={skinVars.colors.textPrimary}>
              {primary ? primary.label : t.noSource}
              {extra > 0 ? ` +${extra}` : ""}
            </Text2>
          </div>
          <div style={{ marginLeft: "auto", flexShrink: 0 }}>
            <Tag type={validityTagType(validity)}>
              {t.validityLabels[validity] ?? t.validityLabels.approved}
            </Tag>
          </div>
        </Inline>
        <Inline space={8} alignItems="center">
          <Inline space={4} alignItems="center">
            <IconShieldCheckedOkRegular
              size={12}
              color={skinVars.colors.textSecondary}
            />
            <Text1 regular color={skinVars.colors.textSecondary}>
              {t.confidencePct(Math.round(kpi.confidence * 100))}
            </Text1>
          </Inline>
          <Text1 regular color={skinVars.colors.textSecondary}>
            ·
          </Text1>
          <div
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <Text1 regular color={skinVars.colors.textSecondary}>
              {kpi.composite ? kpi.blend : t.singleSource}
            </Text1>
          </div>
        </Inline>
      </Stack>
    </div>
  );
}

function KpiCardTile({
  kpi,
  onOpen,
}: {
  kpi: KpiCardType;
  onOpen: () => void;
}) {
  const { lang } = useApp();
  const t = KPIS_I18N[lang];
  const progressClamped = Math.max(0, Math.min(100, kpi.progress));
  return (
    <Touchable onPress={onOpen} aria-label={t.openKpi(kpi.name)}>
      <Boxed>
        <Box padding={16}>
          <Stack space={16}>
            <Inline space={12} alignItems="center">
              <div style={{ minWidth: 0 }}>
                <Stack space={4}>
                  <div
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Text1
                      medium
                      color={skinVars.colors.textSecondary}
                      transform="uppercase"
                    >
                      {kpi.market} · {kpi.brand}
                    </Text1>
                  </div>
                  <Text3 medium color={skinVars.colors.textPrimary}>
                    {kpi.name}
                  </Text3>
                </Stack>
              </div>
              <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: skinVars.borderRadii.avatar,
                    backgroundColor: statusInkColor(kpi.status),
                  }}
                  title={t.statusLabels[kpi.status]}
                />
              </div>
            </Inline>

            <Inline space={8} alignItems="center">
              <div>
                <Inline space={2} alignItems="baseline">
                  <Text8>{String(kpi.current)}</Text8>
                  <Text3 regular color={skinVars.colors.textSecondary}>
                    {kpi.unit}
                  </Text3>
                </Inline>
                <Box paddingTop={4}>
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    {t.target} {kpi.target}
                    {kpi.unit}
                  </Text1>
                </Box>
              </div>
              <div style={{ marginLeft: "auto", width: 96, flexShrink: 0 }}>
                <Sparkline
                  data={kpi.spark}
                  color={statusInkColor(kpi.status)}
                  gradId={kpi.id}
                />
              </div>
            </Inline>

            <Stack space={8}>
              <div
                style={{
                  height: 6,
                  width: "100%",
                  borderRadius: skinVars.borderRadii.indicator,
                  backgroundColor: skinVars.colors.backgroundAlternative,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progressClamped}%`,
                    borderRadius: skinVars.borderRadii.indicator,
                    backgroundColor: statusInkColor(kpi.status),
                  }}
                />
              </div>
              <Inline space="between" alignItems="center">
                <Text1
                  medium
                  color={statusInkColor(kpi.status)}
                  transform="uppercase"
                >
                  {t.statusLabels[kpi.status]} · {kpi.progress}%
                </Text1>
                <VariationBadge kpi={kpi} />
              </Inline>
            </Stack>

            <CardEvidenceChip kpi={kpi} />

            <Divider />

            <Inline space={8} alignItems="center" wrap>
              <AxisPill name={kpi.axisName} color={kpi.axisColor} />
              <div style={{ marginLeft: "auto" }}>
                <Inline space={8} alignItems="center" wrap>
                  {kpi.composite && (
                    <Tag type="info" Icon={IconLayersRegular}>
                      {t.blend}
                    </Tag>
                  )}
                  {kpi.conflict && (
                    <Tag type="warning" Icon={IconAlertRegular}>
                      {t.conflict}
                    </Tag>
                  )}
                  {kpi.historic && (
                    <Tag type="warning" Icon={IconTimeRegular}>
                      {t.historic}
                    </Tag>
                  )}
                </Inline>
              </div>
            </Inline>
          </Stack>
        </Box>
      </Boxed>
    </Touchable>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <div style={{ minWidth: 150 }}>
      <Select
        name={`filter-${label}`}
        label={label}
        value={value}
        onChangeValue={onChange}
        options={[
          { value: "__all__", text: allLabel },
          ...options.map((o) => ({ value: o.value, text: o.label })),
        ]}
      />
    </div>
  );
}

function SourceRow({
  source,
  index,
  onOpen,
}: {
  source: KpiSource;
  index: number;
  onOpen: () => void;
}) {
  const { lang } = useApp();
  const t = KPIS_I18N[lang];
  return (
    <Touchable onPress={onOpen} aria-label={t.viewCitationAria(index + 1)}>
      <div
        style={{
          border: `1px solid ${source.accessible ? skinVars.colors.divider : applyAlpha(skinVars.rawColors.error, 0.3)}`,
          backgroundColor: source.accessible
            ? skinVars.colors.backgroundContainer
            : applyAlpha(skinVars.rawColors.error, 0.08),
          borderRadius: skinVars.borderRadii.container,
          padding: 16,
        }}
      >
        <Stack space={8}>
          <Inline space={8} alignItems="center">
            <div
              style={{
                backgroundColor: skinVars.colors.brandLow,
                borderRadius: skinVars.borderRadii.chip,
                padding: "2px 8px",
                flexShrink: 0,
              }}
            >
              <Text1 medium color={skinVars.colors.brand}>
                S{index + 1}
              </Text1>
            </div>
            <div
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <Text2 medium color={skinVars.colors.textPrimary}>
                {source.docTitle}
              </Text2>
            </div>
            <div style={{ marginLeft: "auto", flexShrink: 0 }}>
              <Inline space={8} alignItems="center">
                <Tag type="inactive">{source.kind}</Tag>
                {source.conflict && <Tag type="warning">{t.conflict}</Tag>}
              </Inline>
            </div>
          </Inline>

          {source.sourceLoc && (
            <Text1
              medium
              color={skinVars.colors.textSecondary}
              transform="uppercase"
            >
              {source.sourceLoc}
            </Text1>
          )}

          {source.accessible ? (
            source.snippet && (
              <Text2 regular color={skinVars.colors.textPrimary}>
                "{source.snippet}"
              </Text2>
            )
          ) : (
            <Inline space={8} alignItems="center">
              <IconShieldCrossRegular size={16} color={skinVars.colors.error} />
              <Text2 medium color={skinVars.colors.error}>
                {t.evidenceWithheld}
              </Text2>
            </Inline>
          )}

          <Inline space="between" alignItems="center">
            <Inline space={16} alignItems="center" wrap>
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                {t.weight} {Math.round(source.weight * 100)}%
              </Text1>
              {source.owner && (
                <Text1
                  medium
                  color={skinVars.colors.textSecondary}
                  transform="uppercase"
                >
                  {source.owner}
                </Text1>
              )}
              {source.confidentiality && (
                <Text1
                  medium
                  color={skinVars.colors.textSecondary}
                  transform="uppercase"
                >
                  {clearanceLabel(source.confidentiality, lang)}
                </Text1>
              )}
            </Inline>
            <Inline space={4} alignItems="center">
              <Text1 medium color={skinVars.colors.brand}>
                {t.viewCitation}
              </Text1>
              <IconArrowRightRegular size={12} color={skinVars.colors.brand} />
            </Inline>
          </Inline>
        </Stack>
      </div>
    </Touchable>
  );
}

function SourceDetailDrawer({
  source,
  index,
  onClose,
}: {
  source: KpiSource;
  index: number;
  onClose: () => void;
}) {
  const { lang } = useApp();
  const t = KPIS_I18N[lang];
  const validity = source.validity ?? "approved";
  return (
    <Drawer
      onClose={onClose}
      onDismiss={onClose}
      width={600}
      title={source.docTitle ?? source.label}
      subtitle={source.sourceLoc ?? undefined}
    >
      <Stack space={24}>
        <Inline space={8} alignItems="center" wrap>
          <div
            style={{
              backgroundColor: skinVars.colors.brandLow,
              borderRadius: skinVars.borderRadii.button,
              padding: "4px 12px",
            }}
          >
            <Text2 medium color={skinVars.colors.brand}>
              {t.citationLabel(index + 1)}
            </Text2>
          </div>
          <Tag type={validityTagType(validity)}>
            {t.validityLabels[validity] ?? t.validityLabels.approved}
          </Tag>
          {source.confidentiality && (
            <Tag
              type={source.confidentiality === "public" ? "inactive" : "error"}
            >
              {clearanceLabel(source.confidentiality, lang)}
            </Tag>
          )}
        </Inline>

        {source.accessible ? (
          source.snippet ? (
            <div
              style={{
                backgroundColor: skinVars.colors.backgroundAlternative,
                border: `1px solid ${skinVars.colors.divider}`,
                borderRadius: skinVars.borderRadii.container,
                padding: 20,
              }}
            >
              <Stack space={8}>
                <Text1
                  medium
                  color={skinVars.colors.textSecondary}
                  transform="uppercase"
                >
                  {t.extractedSnippet}
                </Text1>
                <Text3 regular color={skinVars.colors.textPrimary}>
                  "{source.snippet}"
                </Text3>
              </Stack>
            </div>
          ) : (
            <Text2 regular color={skinVars.colors.textSecondary}>
              {t.noSnippet}
            </Text2>
          )
        ) : (
          <div
            style={{
              backgroundColor: applyAlpha(skinVars.rawColors.error, 0.12),
              borderRadius: skinVars.borderRadii.container,
              padding: 20,
            }}
          >
            <Inline space={12} alignItems="center">
              <IconShieldCrossRegular size={20} color={skinVars.colors.error} />
              <Text2 regular color={skinVars.colors.textPrimary}>
                {t.evidenceAboveClearance}
              </Text2>
            </Inline>
          </div>
        )}

        <Grid columns={{ minSize: 120 }} gap={16}>
          <Stack space={4}>
            <Text1
              medium
              color={skinVars.colors.textSecondary}
              transform="uppercase"
            >
              {t.weight}
            </Text1>
            <Text2 regular color={skinVars.colors.textPrimary}>
              {Math.round(source.weight * 100)}%
            </Text2>
          </Stack>
          {source.version && (
            <Stack space={4}>
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                {t.version}
              </Text1>
              <Text2 regular color={skinVars.colors.textPrimary}>
                {source.version}
              </Text2>
            </Stack>
          )}
          {source.owner && (
            <Stack space={4}>
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                {t.owner}
              </Text1>
              <Text2 regular color={skinVars.colors.textPrimary}>
                {source.owner}
              </Text2>
            </Stack>
          )}
          <Stack space={4}>
            <Text1
              medium
              color={skinVars.colors.textSecondary}
              transform="uppercase"
            >
              {t.confidence}
            </Text1>
            <Inline space={8} alignItems="center">
              <Text2 regular color={skinVars.colors.textPrimary}>
                {Math.round(source.confidence * 100)}%
              </Text2>
              {source.confidence > 0.8 && (
                <IconCheckedRegular size={16} color={skinVars.colors.success} />
              )}
            </Inline>
          </Stack>
        </Grid>
      </Stack>
    </Drawer>
  );
}

function KpiChat({
  kpiIds,
  heading,
  intro,
  placeholder,
  rangeFrom = null,
  rangeTo = null,
}: {
  kpiIds: string[];
  heading?: string;
  intro?: string;
  placeholder?: string;
  rangeFrom?: string | null;
  rangeTo?: string | null;
}) {
  const { area, roleId, lang } = useApp();
  const t = KPIS_I18N[lang];
  const headingText = heading ?? t.chatHeading;
  const introText = intro ?? t.chatIntro;
  const placeholderText = placeholder ?? t.chatPlaceholder;
  const [question, setQuestion] = React.useState("");
  const [asked, setAsked] = React.useState("");
  const { mutate, data, isPending, reset } = useAskKpis();

  const submit = () => {
    if (!question.trim() || !roleId || kpiIds.length === 0) return;
    setAsked(question);
    reset();
    mutate({ data: { question, area, roleId, kpiIds, rangeFrom, rangeTo } });
  };

  const result = data as AskResult | undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box paddingBottom={12}>
        <Inline space={8} alignItems="center">
          <IconMessageRegular size={16} color={skinVars.colors.brand} />
          <Text1
            medium
            color={skinVars.colors.textSecondary}
            transform="uppercase"
          >
            {headingText}
          </Text1>
        </Inline>
      </Box>

      <div
        style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 12 }}
      >
        {!result && !isPending && (
          <Text2 regular color={skinVars.colors.textSecondary}>
            {introText}
          </Text2>
        )}
        {isPending && (
          <Inline space={12} alignItems="center">
            <Spinner size={20} />
            <Text2 medium color={skinVars.colors.textPrimary}>
              {t.readingEvidence}
            </Text2>
          </Inline>
        )}
        {result && !isPending && (
          <Stack space={16}>
            <div
              style={{
                backgroundColor: skinVars.colors.backgroundAlternative,
                borderRadius: skinVars.borderRadii.container,
                padding: "8px 16px",
                alignSelf: "flex-start",
                display: "inline-block",
                maxWidth: "100%",
              }}
            >
              <Text2 medium color={skinVars.colors.textPrimary}>
                {asked}
              </Text2>
            </div>

            {result.status === "no_evidence" && (
              <div
                style={{
                  backgroundColor: applyAlpha(skinVars.rawColors.warning, 0.12),
                  borderRadius: skinVars.borderRadii.container,
                  padding: 16,
                }}
              >
                <Inline space={12} alignItems="center">
                  <IconAlertRegular size={20} color={skinVars.colors.warning} />
                  <Text2 regular color={skinVars.colors.textPrimary}>
                    {result.answer}
                  </Text2>
                </Inline>
              </div>
            )}
            {result.status === "permission_blocked" && (
              <div
                style={{
                  backgroundColor: applyAlpha(skinVars.rawColors.error, 0.12),
                  borderRadius: skinVars.borderRadii.container,
                  padding: 16,
                }}
              >
                <Inline space={12} alignItems="center">
                  <IconShieldCrossRegular
                    size={20}
                    color={skinVars.colors.error}
                  />
                  <Stack space={8}>
                    <Text2 regular color={skinVars.colors.textPrimary}>
                      {result.answer}
                    </Text2>
                    {result.permissionNote && (
                      <div
                        style={{
                          backgroundColor: skinVars.colors.backgroundContainer,
                          borderRadius: skinVars.borderRadii.container,
                          padding: "8px 12px",
                        }}
                      >
                        <Text1 medium color={skinVars.colors.textPrimary}>
                          {result.permissionNote}
                        </Text1>
                      </div>
                    )}
                  </Stack>
                </Inline>
              </div>
            )}
            {result.status === "answered" && (
              <Stack space={12}>
                {result.historic && (
                  <div
                    style={{
                      backgroundColor: applyAlpha(
                        skinVars.rawColors.warning,
                        0.12,
                      ),
                      borderRadius: skinVars.borderRadii.container,
                      padding: "8px 12px",
                    }}
                  >
                    <Inline space={8} alignItems="center">
                      <IconTimeRegular
                        size={16}
                        color={skinVars.colors.warning}
                      />
                      <Text1 medium color={skinVars.colors.textPrimary}>
                        {result.historicNote || t.drawsHistoric}
                      </Text1>
                    </Inline>
                  </div>
                )}
                <Stack space={8}>
                  {result.answer.split("\n").map((p, i) => (
                    <Text2 key={i} regular color={skinVars.colors.textPrimary}>
                      {p}
                    </Text2>
                  ))}
                </Stack>
                {result.citations && result.citations.length > 0 && (
                  <>
                    <Divider />
                    <Stack space={8}>
                      {result.citations.map((c: Citation) => (
                        <div
                          key={c.id}
                          style={{
                            backgroundColor:
                              skinVars.colors.backgroundAlternative,
                            borderRadius: skinVars.borderRadii.container,
                            padding: 10,
                          }}
                        >
                          <Inline space={8} alignItems="center">
                            <div
                              style={{
                                backgroundColor: skinVars.colors.brandLow,
                                borderRadius: skinVars.borderRadii.chip,
                                padding: "2px 6px",
                                flexShrink: 0,
                              }}
                            >
                              <Text1 medium color={skinVars.colors.brand}>
                                {c.id}
                              </Text1>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Text1
                                  medium
                                  color={skinVars.colors.textPrimary}
                                >
                                  {c.docTitle}
                                </Text1>
                              </div>
                              <div
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Text1
                                  regular
                                  color={skinVars.colors.textSecondary}
                                >
                                  {c.sourceLoc}
                                </Text1>
                              </div>
                            </div>
                          </Inline>
                        </div>
                      ))}
                    </Stack>
                  </>
                )}
              </Stack>
            )}
          </Stack>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          border: `1px solid ${skinVars.colors.divider}`,
          borderRadius: skinVars.borderRadii.container,
          backgroundColor: skinVars.colors.background,
          padding: "8px 8px 8px 12px",
        }}
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholderText}
          rows={1}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            resize: "none",
            minHeight: 40,
            maxHeight: 140,
            backgroundColor: "transparent",
            color: skinVars.colors.textPrimary,
            fontFamily: "inherit",
            fontSize: 16,
            lineHeight: "24px",
            padding: "8px 0",
          }}
        />
        <IconButton
          aria-label={t.sendQuestion}
          type="brand"
          onPress={submit}
          disabled={!question.trim() || isPending || !roleId}
          Icon={IconSendRegular}
        />
      </div>
    </div>
  );
}

function DetailDrawerBody({
  detail,
  rangeFrom = null,
  rangeTo = null,
}: {
  detail: KpiDetail;
  rangeFrom?: string | null;
  rangeTo?: string | null;
}) {
  const { lang } = useApp();
  const t = KPIS_I18N[lang];
  const kpi = detail.kpi;
  const seriesData = detail.series.map((p) => ({ ...p, target: kpi.target }));
  const [selectedSource, setSelectedSource] = React.useState<{
    source: KpiSource;
    index: number;
  } | null>(null);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
      <div style={{ flex: "1 1 420px", minWidth: 0 }}>
        <Stack space={24}>
          <Stack space={8}>
            <Inline space="between" alignItems="center" wrap>
              <AxisPill name={kpi.axisName} color={kpi.axisColor} />
              <Inline space={8} alignItems="center">
                <Tag type={STATUS_TAG[kpi.status]}>
                  {t.statusLabels[kpi.status]}
                </Tag>
                {kpi.historic && <Tag type="warning">{t.historic}</Tag>}
              </Inline>
            </Inline>
            <Text5>{kpi.name}</Text5>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {kpi.objectiveName} · {kpi.market} · {kpi.brand}
            </Text2>
            <Inline space={16} alignItems="center" wrap>
              <Inline space={4} alignItems="center">
                <IconUserAccountRegular
                  size={14}
                  color={skinVars.colors.textSecondary}
                />
                <Text1
                  medium
                  color={skinVars.colors.textSecondary}
                  transform="uppercase"
                >
                  {t.owner} {kpi.owner}
                </Text1>
              </Inline>
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                {t.definition} v{kpi.definitionVersion}
              </Text1>
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                {t.amberBelow} {Math.round(kpi.thresholds.amberBelow * 100)}% ·{" "}
                {t.criticalBelow}{" "}
                {Math.round(kpi.thresholds.criticalBelow * 100)}%
              </Text1>
            </Inline>
          </Stack>

          <Text2 regular color={skinVars.colors.textPrimary}>
            {kpi.description}
          </Text2>

          <Grid columns={3} gap={12}>
            {[
              {
                label: t.current,
                value: `${kpi.current}${kpi.unit}`,
                color: skinVars.colors.textPrimary,
              },
              {
                label: t.target,
                value: `${kpi.target}${kpi.unit}`,
                color: skinVars.colors.textPrimary,
              },
              {
                label: t.progress,
                value: `${kpi.progress}%`,
                color: statusInkColor(kpi.status),
              },
            ].map((m) => (
              <div
                key={m.label}
                style={{
                  backgroundColor: skinVars.colors.backgroundAlternative,
                  borderRadius: skinVars.borderRadii.container,
                  padding: 16,
                }}
              >
                <Stack space={4}>
                  <Text1
                    medium
                    color={skinVars.colors.textSecondary}
                    transform="uppercase"
                  >
                    {m.label}
                  </Text1>
                  <Text5>
                    <span style={{ color: m.color }}>{m.value}</span>
                  </Text5>
                </Stack>
              </div>
            ))}
          </Grid>

          {kpi.conflict && (
            <div
              style={{
                backgroundColor: applyAlpha(skinVars.rawColors.warning, 0.12),
                borderRadius: skinVars.borderRadii.container,
                padding: 16,
              }}
            >
              <Inline space={12} alignItems="center">
                <IconAlertRegular size={20} color={skinVars.colors.warning} />
                <Text2 regular color={skinVars.colors.textPrimary}>
                  {t.conflictBody}
                </Text2>
              </Inline>
            </div>
          )}

          <Stack space={12}>
            <Text1
              medium
              color={skinVars.colors.textSecondary}
              transform="uppercase"
            >
              {t.trendVsTarget}
            </Text1>
            <div style={{ height: 224, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={seriesData}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={skinVars.colors.divider}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    stroke={skinVars.colors.textSecondary}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke={skinVars.colors.textSecondary}
                  />
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${skinVars.colors.divider}`,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke={skinVars.colors.textSecondary}
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    dot={false}
                    name={t.target}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={statusInkColor(kpi.status)}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    name={kpi.name}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Stack>

          {detail.breakdowns.map((bd) => (
            <Stack key={bd.dimension} space={12}>
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                {t.breakdownBy} {bd.dimension}
              </Text1>
              <div style={{ height: 176, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={bd.points}
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={skinVars.colors.divider}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      stroke={skinVars.colors.textSecondary}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke={skinVars.colors.textSecondary}
                    />
                    <RTooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: `1px solid ${skinVars.colors.divider}`,
                        fontSize: 12,
                      }}
                      cursor={{
                        fill: applyAlpha(skinVars.rawColors.brand, 0.08),
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill={skinVars.colors.brand}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Stack>
          ))}

          <div
            style={{
              backgroundColor: kpi.forecast.deviationRisk
                ? applyAlpha(skinVars.rawColors.warning, 0.12)
                : applyAlpha(skinVars.rawColors.success, 0.12),
              borderRadius: skinVars.borderRadii.container,
              padding: 16,
            }}
          >
            <Inline space={12} alignItems="center">
              <IconAiRegular
                size={20}
                color={
                  kpi.forecast.deviationRisk
                    ? skinVars.colors.warning
                    : skinVars.colors.success
                }
              />
              <Stack space={4}>
                <Text1
                  medium
                  color={skinVars.colors.textSecondary}
                  transform="uppercase"
                >
                  {t.forecast} ·{" "}
                  {t.confidencePct(Math.round(kpi.forecast.confidence * 100))}
                </Text1>
                <Text2 regular color={skinVars.colors.textPrimary}>
                  {kpi.forecast.note}
                </Text2>
              </Stack>
            </Inline>
          </div>

          <Stack space={12}>
            <Inline space={8} alignItems="center" wrap>
              <IconFileTextRegular
                size={16}
                color={skinVars.colors.textSecondary}
              />
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                {t.composingSources} ({kpi.sources.length})
              </Text1>
              <div style={{ marginLeft: "auto" }}>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {t.blendPrefix} {kpi.blend}
                </Text1>
              </div>
            </Inline>
            <Stack space={12}>
              {kpi.sources.map((s, i) => (
                <SourceRow
                  key={s.id}
                  source={s}
                  index={i}
                  onOpen={() => setSelectedSource({ source: s, index: i })}
                />
              ))}
            </Stack>
          </Stack>
        </Stack>
      </div>

      <div style={{ flex: "1 1 320px", minWidth: 0, minHeight: 360 }}>
        <KpiChat kpiIds={[kpi.id]} rangeFrom={rangeFrom} rangeTo={rangeTo} />
      </div>

      {selectedSource && (
        <SourceDetailDrawer
          source={selectedSource.source}
          index={selectedSource.index}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </div>
  );
}

const SEVERITY_TAG: Record<string, "warning" | "error" | "info"> = {
  amber: "warning",
  critical: "error",
  forecast: "info",
};

function AlertRow({
  alert,
  onAcknowledge,
  acknowledging,
}: {
  alert: KpiAlert;
  onAcknowledge: () => void;
  acknowledging: boolean;
}) {
  const { lang } = useApp();
  const t = KPIS_I18N[lang];
  return (
    <div
      style={{
        border: `1px solid ${skinVars.colors.divider}`,
        borderRadius: skinVars.borderRadii.container,
        backgroundColor: alert.acknowledged
          ? skinVars.colors.backgroundAlternative
          : skinVars.colors.backgroundContainer,
        padding: 16,
      }}
    >
      <Stack space={8}>
        <Inline space={8} alignItems="center" wrap>
          <Tag type={SEVERITY_TAG[alert.severity] ?? "info"}>
            {t.severityLabels[alert.severity] ?? alert.severity}
          </Tag>
          <Text2 medium color={skinVars.colors.textPrimary}>
            {alert.kpiName}
          </Text2>
          <div style={{ marginLeft: "auto" }}>
            {alert.acknowledged ? (
              <Inline space={4} alignItems="center">
                <IconCheckedRegular size={14} color={skinVars.colors.success} />
                <Text1
                  medium
                  color={skinVars.colors.success}
                  transform="uppercase"
                >
                  {t.acknowledged}
                </Text1>
              </Inline>
            ) : (
              <ButtonSecondary
                small
                onPress={onAcknowledge}
                disabled={acknowledging}
              >
                {t.acknowledge}
              </ButtonSecondary>
            )}
          </div>
        </Inline>
        <Text2 regular color={skinVars.colors.textPrimary}>
          {alert.message}
        </Text2>
        <Inline space={16} alignItems="center" wrap>
          <Inline space={4} alignItems="center">
            <IconUserAccountRegular
              size={12}
              color={skinVars.colors.textSecondary}
            />
            <Text1 regular color={skinVars.colors.textSecondary}>
              {t.notified} {alert.owner}
            </Text1>
          </Inline>
          <Text1 regular color={skinVars.colors.textSecondary}>
            {alert.channel}
          </Text1>
          <Text1 regular color={skinVars.colors.textSecondary}>
            {new Date(alert.createdAt).toLocaleString(localeFor(lang), {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text1>
          {alert.acknowledged && alert.acknowledgedBy && (
            <Text1 regular color={skinVars.colors.textSecondary}>
              {t.by} {alert.acknowledgedBy}
              {alert.acknowledgedAt
                ? ` · ${new Date(alert.acknowledgedAt).toLocaleString(
                    localeFor(lang),
                    {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}`
                : ""}
            </Text1>
          )}
        </Inline>
      </Stack>
    </div>
  );
}

export default function KpisPage() {
  const { area, roleId, lang } = useApp();
  const t = KPIS_I18N[lang];
  const [, navigate] = useLocation();
  const [period, setPeriod] = React.useState<PeriodType>("quarter");
  const [rangeFrom, setRangeFrom] = React.useState("");
  const [rangeTo, setRangeTo] = React.useState("");
  const [axisId, setAxisId] = React.useState("__all__");
  const [market, setMarket] = React.useState("__all__");
  const [brand, setBrand] = React.useState("__all__");
  const [source, setSource] = React.useState("__all__");
  const [initiativeType, setInitiativeType] = React.useState("__all__");
  const [objectiveId, setObjectiveId] = React.useState("__all__");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [alertsOpen, setAlertsOpen] = React.useState(false);

  const { mutate: runQuery, data: queryData, isPending } = useQueryKpis();

  const val = (v: string) => (v === "__all__" ? null : v);

  // A custom range only takes effect once both dates are set and ordered.
  const customRangeReady =
    period === "custom" && !!rangeFrom && !!rangeTo && rangeFrom <= rangeTo;
  const customRangeInvalid =
    period === "custom" && !!rangeFrom && !!rangeTo && rangeFrom > rangeTo;
  const activeRangeFrom = customRangeReady ? rangeFrom : null;
  const activeRangeTo = customRangeReady ? rangeTo : null;

  React.useEffect(() => {
    if (!roleId) return;
    if (period === "custom" && !customRangeReady) return;
    runQuery({
      data: {
        area,
        roleId,
        period,
        rangeFrom: activeRangeFrom,
        rangeTo: activeRangeTo,
        axisId: val(axisId),
        market: val(market),
        brand: val(brand),
        source: val(source),
        initiativeType: val(initiativeType),
        objectiveId: val(objectiveId),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    area,
    roleId,
    period,
    activeRangeFrom,
    activeRangeTo,
    axisId,
    market,
    brand,
    source,
    initiativeType,
    objectiveId,
  ]);

  const {
    mutate: fetchAlerts,
    data: alertsData,
    isPending: alertsLoading,
  } = useListKpiAlerts();
  const ackAlert = useAcknowledgeKpiAlert();

  React.useEffect(() => {
    if (!roleId) return;
    fetchAlerts({ data: { roleId, area } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId, area]);

  const alerts = alertsData ?? [];
  const unacknowledged = alerts.filter((a) => !a.acknowledged).length;

  const handleAcknowledge = (alertId: string) => {
    if (!roleId) return;
    ackAlert.mutate(
      { data: { id: alertId, roleId, area } },
      { onSuccess: () => fetchAlerts({ data: { roleId, area } }) },
    );
  };

  const {
    mutate: fetchDetail,
    data: detail,
    isPending: detailLoading,
    reset: resetDetail,
  } = useGetKpiDetail();

  React.useEffect(() => {
    if (!openId || !roleId) return;
    if (period === "custom" && !customRangeReady) return;
    resetDetail();
    fetchDetail({
      data: {
        id: openId,
        area,
        roleId,
        period,
        rangeFrom: activeRangeFrom,
        rangeTo: activeRangeTo,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, area, roleId, period, activeRangeFrom, activeRangeTo]);

  const kpis = queryData?.kpis ?? [];
  const facets = queryData?.facets;
  const visibleKpiIds = React.useMemo(() => kpis.map((k) => k.id), [kpis]);

  const summary = React.useMemo(() => {
    const total = kpis.length;
    const onTrack = kpis.filter((k) => k.status === "on-track").length;
    const atRisk = kpis.filter((k) => k.status === "amber").length;
    const offTrack = kpis.filter((k) => k.status === "off-track").length;
    return { total, onTrack, atRisk, offTrack };
  }, [kpis]);

  return (
    <Box padding={32}>
      <Stack space={32}>
        <Inline space={16} alignItems="center" wrap>
          <Stack space={8}>
            <Inline space={12} alignItems="center">
              <IconTargetRegular size={28} color={skinVars.colors.brand} />
              <Title1>{t.pageTitle}</Title1>
            </Inline>
            <Text3 regular color={skinVars.colors.textSecondary}>
              {t.pageSubtitle(area)}
            </Text3>
          </Stack>
          <div style={{ marginLeft: "auto" }}>
            <Inline space={12} alignItems="center" wrap>
              <ButtonSecondary
                small
                StartIcon={IconBellRegular}
                onPress={() => setAlertsOpen(true)}
              >
                {unacknowledged > 0 ? t.alertsCount(unacknowledged) : t.alerts}
              </ButtonSecondary>
              <ButtonSecondary
                small
                StartIcon={IconFileTextRegular}
                onPress={() => {
                  const offTrack = kpis.filter((k) => k.status !== "on-track");
                  const names = kpis
                    .map((k) => k.name)
                    .slice(0, 6)
                    .join(", ");
                  const periodPhrase =
                    period === "custom" && activeRangeFrom && activeRangeTo
                      ? t.reportRangePhrase(
                          area,
                          activeRangeFrom,
                          activeRangeTo,
                        )
                      : t.reportPeriodPhrase(t.periodLabels[period], area);
                  const topic = `${periodPhrase}${t.reportSummary(summary.total, summary.onTrack, summary.atRisk, summary.offTrack, names, kpis.length > 6)}${offTrack.length > 0 ? t.reportFocus(offTrack.map((k) => k.name).join(", ")) : ""}`;
                  sessionStorage.setItem(
                    "hub-kpi-report-prefill",
                    JSON.stringify({
                      topic,
                      audience: "internal",
                      confidentiality: "private",
                      kpiContext: {
                        period,
                        rangeFrom: activeRangeFrom,
                        rangeTo: activeRangeTo,
                        area,
                        axisId: axisId === "__all__" ? null : axisId,
                        market: market === "__all__" ? null : market,
                        brand: brand === "__all__" ? null : brand,
                        source: source === "__all__" ? null : source,
                        initiativeType:
                          initiativeType === "__all__" ? null : initiativeType,
                        objectiveId:
                          objectiveId === "__all__" ? null : objectiveId,
                      },
                    }),
                  );
                  navigate("/generate");
                }}
                disabled={kpis.length === 0}
              >
                {t.generateReport}
              </ButtonSecondary>
              <div style={{ minWidth: 150 }}>
                <Select
                  name="period"
                  label={t.period}
                  value={period}
                  onChangeValue={(v) => setPeriod(v as PeriodType)}
                  options={PERIOD_TYPES.map((p) => ({
                    value: p,
                    text: t.periodLabels[p],
                  }))}
                />
              </div>
              {period === "custom" && (
                <>
                  <div style={{ minWidth: 170 }}>
                    <DateField
                      name="range-from"
                      label={t.from}
                      value={rangeFrom}
                      onChangeValue={setRangeFrom}
                    />
                  </div>
                  <div style={{ minWidth: 170 }}>
                    <DateField
                      name="range-to"
                      label={t.to}
                      value={rangeTo}
                      onChangeValue={setRangeTo}
                    />
                  </div>
                </>
              )}
            </Inline>
          </div>
        </Inline>

        {period === "custom" && !customRangeReady && (
          <div
            style={{
              backgroundColor: customRangeInvalid
                ? applyAlpha(skinVars.rawColors.error, 0.12)
                : skinVars.colors.backgroundAlternative,
              border: `1px solid ${skinVars.colors.divider}`,
              borderRadius: skinVars.borderRadii.container,
              padding: 12,
            }}
          >
            <Inline space={8} alignItems="center">
              <IconAlertRegular
                size={16}
                color={
                  customRangeInvalid
                    ? skinVars.colors.error
                    : skinVars.colors.textSecondary
                }
              />
              <Text2 regular color={skinVars.colors.textSecondary}>
                {customRangeInvalid ? t.rangeInvalid : t.rangePrompt}
              </Text2>
            </Inline>
          </div>
        )}

        {kpis.length > 0 && (
          <Grid columns={{ minSize: 160 }} gap={12}>
            {[
              {
                label: t.tracked,
                value: summary.total,
                color: skinVars.colors.textPrimary,
                bg: skinVars.colors.backgroundContainer,
              },
              {
                label: t.statusLabels["on-track"],
                value: summary.onTrack,
                color: skinVars.colors.success,
                bg: applyAlpha(skinVars.rawColors.success, 0.12),
              },
              {
                label: t.statusLabels.amber,
                value: summary.atRisk,
                color: skinVars.colors.warning,
                bg: applyAlpha(skinVars.rawColors.warning, 0.12),
              },
              {
                label: t.statusLabels["off-track"],
                value: summary.offTrack,
                color: skinVars.colors.error,
                bg: applyAlpha(skinVars.rawColors.error, 0.12),
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  backgroundColor: s.bg,
                  border: `1px solid ${skinVars.colors.divider}`,
                  borderRadius: skinVars.borderRadii.container,
                  padding: 20,
                }}
              >
                <Stack space={4}>
                  <Text1
                    medium
                    color={skinVars.colors.textSecondary}
                    transform="uppercase"
                  >
                    {s.label}
                  </Text1>
                  <Text8>
                    <span style={{ color: s.color }}>{String(s.value)}</span>
                  </Text8>
                </Stack>
              </div>
            ))}
          </Grid>
        )}

        {facets && (
          <div
            style={{
              backgroundColor: skinVars.colors.backgroundAlternative,
              border: `1px solid ${skinVars.colors.divider}`,
              borderRadius: skinVars.borderRadii.container,
              padding: 12,
            }}
          >
            <Inline space={12} alignItems="center" wrap>
              <FilterSelect
                label={t.filterAxis}
                allLabel={t.allAxes}
                value={axisId}
                onChange={setAxisId}
                options={facets.axes.map((a) => ({
                  value: a.id,
                  label: a.name,
                }))}
              />
              <FilterSelect
                label={t.filterMarket}
                allLabel={t.allMarkets}
                value={market}
                onChange={setMarket}
                options={facets.markets.map((m) => ({ value: m, label: m }))}
              />
              <FilterSelect
                label={t.filterBrand}
                allLabel={t.allBrands}
                value={brand}
                onChange={setBrand}
                options={facets.brands.map((b) => ({ value: b, label: b }))}
              />
              <FilterSelect
                label={t.filterSource}
                allLabel={t.allSources}
                value={source}
                onChange={setSource}
                options={facets.sources.map((s) => ({ value: s, label: s }))}
              />
              <FilterSelect
                label={t.filterInitiative}
                allLabel={t.allInitiatives}
                value={initiativeType}
                onChange={setInitiativeType}
                options={facets.initiativeTypes.map((it) => ({
                  value: it,
                  label: it,
                }))}
              />
              {facets.objectives && facets.objectives.length > 0 && (
                <FilterSelect
                  label={t.filterObjective}
                  allLabel={t.allObjectives}
                  value={objectiveId}
                  onChange={setObjectiveId}
                  options={facets.objectives.map((o) => ({
                    value: o.id,
                    label: o.name,
                  }))}
                />
              )}
            </Inline>
          </div>
        )}

        {isPending && kpis.length === 0 && (
          <Grid columns={{ minSize: 300 }} gap={16}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 224,
                  borderRadius: skinVars.borderRadii.container,
                  backgroundColor: skinVars.colors.backgroundAlternative,
                }}
              />
            ))}
          </Grid>
        )}

        {!isPending && kpis.length === 0 && (
          <div
            style={{
              border: `1px dashed ${skinVars.colors.divider}`,
              borderRadius: skinVars.borderRadii.container,
              padding: 64,
            }}
          >
            <Stack space={16}>
              <Inline space={0} alignItems="center">
                <div style={{ margin: "0 auto" }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: skinVars.borderRadii.avatar,
                      backgroundColor: skinVars.colors.backgroundAlternative,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconTargetRegular
                      size={28}
                      color={skinVars.colors.textSecondary}
                    />
                  </div>
                </div>
              </Inline>
              <Text5>
                <span style={{ display: "block", textAlign: "center" }}>
                  {t.emptyTitle}
                </span>
              </Text5>
              <Text2
                regular
                color={skinVars.colors.textSecondary}
                textAlign="center"
              >
                {t.emptyBody}
              </Text2>
            </Stack>
          </div>
        )}

        {kpis.length > 0 && (
          <Grid columns={{ minSize: 300 }} gap={16}>
            {kpis.map((kpi) => (
              <KpiCardTile
                key={kpi.id}
                kpi={kpi}
                onOpen={() => setOpenId(kpi.id)}
              />
            ))}
          </Grid>
        )}

        {kpis.length > 0 && (
          <Boxed>
            <div
              style={{
                borderBottom: `1px solid ${skinVars.colors.divider}`,
                backgroundColor: skinVars.colors.backgroundAlternative,
              }}
            >
              <Box paddingX={20} paddingY={16}>
                <Inline space={12} alignItems="center">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: skinVars.borderRadii.avatar,
                      backgroundColor: skinVars.colors.brandLow,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconMessageRegular
                      size={16}
                      color={skinVars.colors.brand}
                    />
                  </div>
                  <Stack space={2}>
                    <Text3 medium color={skinVars.colors.textPrimary}>
                      {t.askAboutKpis}
                    </Text3>
                    <Text1 regular color={skinVars.colors.textSecondary}>
                      {t.answeredFrom(kpis.length)}
                    </Text1>
                  </Stack>
                </Inline>
              </Box>
            </div>
            <Box padding={20}>
              <div style={{ height: 320 }}>
                <KpiChat
                  key={visibleKpiIds.join(",")}
                  kpiIds={visibleKpiIds}
                  rangeFrom={activeRangeFrom}
                  rangeTo={activeRangeTo}
                  heading={t.chatViewHeading}
                  intro={t.chatViewIntro}
                  placeholder={t.chatViewPlaceholder}
                />
              </div>
            </Box>
          </Boxed>
        )}

        <Inline space={8} alignItems="center">
          <IconArrowRightRegular
            size={14}
            color={skinVars.colors.textSecondary}
          />
          <Text1 regular color={skinVars.colors.textSecondary}>
            {t.openAnyKpi}
          </Text1>
        </Inline>
      </Stack>

      {alertsOpen && (
        <Drawer
          onClose={() => setAlertsOpen(false)}
          onDismiss={() => setAlertsOpen(false)}
          width={560}
          title={t.thresholdAlerts}
        >
          <Stack space={16}>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {t.alertsDrawerBody}
            </Text2>
            {alertsLoading && (
              <Inline space={12} alignItems="center">
                <Spinner size={20} />
                <Text2 medium color={skinVars.colors.textPrimary}>
                  {t.checkingThresholds}
                </Text2>
              </Inline>
            )}
            {!alertsLoading && alerts.length === 0 && (
              <div
                style={{
                  border: `1px dashed ${skinVars.colors.divider}`,
                  borderRadius: skinVars.borderRadii.container,
                  padding: 32,
                }}
              >
                <Stack space={8}>
                  <Inline space={0} alignItems="center">
                    <div style={{ margin: "0 auto" }}>
                      <IconCheckedRegular
                        size={28}
                        color={skinVars.colors.success}
                      />
                    </div>
                  </Inline>
                  <Text2
                    regular
                    color={skinVars.colors.textSecondary}
                    textAlign="center"
                  >
                    {t.noThresholdAlerts}
                  </Text2>
                </Stack>
              </div>
            )}
            {!alertsLoading &&
              alerts.map((a) => (
                <AlertRow
                  key={a.id}
                  alert={a}
                  onAcknowledge={() => handleAcknowledge(a.id)}
                  acknowledging={ackAlert.isPending}
                />
              ))}
          </Stack>
        </Drawer>
      )}

      {openId && (
        <Drawer
          onClose={() => setOpenId(null)}
          onDismiss={() => setOpenId(null)}
          width={1024}
          title={t.kpiDetail}
        >
          {detailLoading && (
            <Box paddingY={64}>
              <Inline space={0} alignItems="center">
                <div style={{ margin: "0 auto" }}>
                  <Spinner size={32} />
                </div>
              </Inline>
            </Box>
          )}
          {!detailLoading && detail && (
            <DetailDrawerBody
              detail={detail}
              rangeFrom={activeRangeFrom}
              rangeTo={activeRangeTo}
            />
          )}
          {!detailLoading && !detail && (
            <Box paddingY={64}>
              <Stack space={16}>
                <Inline space={0} alignItems="center">
                  <div style={{ margin: "0 auto" }}>
                    <IconShieldCrossRegular
                      size={48}
                      color={skinVars.colors.error}
                    />
                  </div>
                </Inline>
                <Text5>
                  <span style={{ display: "block", textAlign: "center" }}>
                    {t.kpiRestricted}
                  </span>
                </Text5>
                <Text2
                  regular
                  color={skinVars.colors.textSecondary}
                  textAlign="center"
                >
                  {t.kpiRestrictedBody}
                </Text2>
              </Stack>
            </Box>
          )}
        </Drawer>
      )}
    </Box>
  );
}
