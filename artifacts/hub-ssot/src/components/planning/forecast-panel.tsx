import React from "react";
import { clearanceLabel } from "@/components/data-center/helpers";
import {
  usePlanningForecast,
  useSchedulePlanningForecast,
  type Citation,
  type PlanningForecast,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import {
  Sheet,
  ThemeVariant,
  Box,
  Stack,
  Inline,
  Grid,
  Text1,
  Text2,
  Text3,
  Text6,
  Touchable,
  ButtonPrimary,
  Tag,
  skinVars,
  applyAlpha,
  IconAiRegular,
  IconAntennaRegular,
  IconShieldRegular,
  IconFileTextRegular,
} from "@telefonica/mistica";
import { formatDay } from "./utils";

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
        : skinVars.colors.textPrimaryInverse;
  return (
    <div style={{ textAlign: "center", padding: "0 12px" }}>
      <Text6 color={color}>{value}</Text6>
      <Box paddingTop={4}>
        <Text1 medium color={applyAlpha(skinVars.rawColors.inverse, 0.72)} transform="uppercase">
          {label}
        </Text1>
      </Box>
    </div>
  );
}

export function ForecastPanel() {
  const { area, roleId } = useApp();
  const [selected, setSelected] = React.useState<Citation | null>(null);
  const { mutate, isPending, data } = usePlanningForecast();
  const forecast = data as PlanningForecast | undefined;
  const {
    mutate: schedule,
    isPending: scheduling,
    data: scheduled,
    reset: resetScheduled,
  } = useSchedulePlanningForecast();

  return (
    <ThemeVariant variant="brand">
      <div
        style={{
          backgroundColor: skinVars.colors.backgroundBrand,
          borderRadius: skinVars.borderRadii.container,
        }}
      >
        <Box padding={24}>
          <Stack space={16}>
            <Inline space="between" alignItems="center">
              <Inline space={8} alignItems="center">
                <IconAiRegular size={20} color={skinVars.colors.textPrimaryInverse} />
                <Text2 medium color={skinVars.colors.textPrimaryInverse} transform="uppercase">
                  10-day forecast
                </Text2>
              </Inline>
              <ButtonPrimary
                small
                onPress={() => {
                  resetScheduled();
                  mutate({ data: { area, roleId } });
                }}
                disabled={isPending || !roleId}
              >
                {isPending ? "Generating…" : forecast ? "Refresh" : "Generate"}
              </ButtonPrimary>
            </Inline>

            {!forecast && !isPending && (
              <Text2 regular color={applyAlpha(skinVars.rawColors.inverse, 0.8)}>
                Generate a cited outlook of what is live, upcoming, and at risk in the next 10 days —
                scoped to your persona.
              </Text2>
            )}

            {isPending && (
              <Inline space={12} alignItems="center">
                <IconAiRegular size={20} color={skinVars.colors.textPrimaryInverse} />
                <Text2 regular color={applyAlpha(skinVars.rawColors.inverse, 0.85)}>
                  Composing forecast from governed activity…
                </Text2>
              </Inline>
            )}

            {forecast && !isPending && (
              <Stack space={16}>
                <Text1 regular color={applyAlpha(skinVars.rawColors.inverse, 0.72)}>
                  {formatDay(forecast.rangeStart)} – {formatDay(forecast.rangeEnd)}
                </Text1>

                {forecast.status === "no_activity" ? (
                  <div
                    style={{
                      backgroundColor: applyAlpha(skinVars.rawColors.inverse, 0.1),
                      borderRadius: skinVars.borderRadii.container,
                      padding: 16,
                    }}
                  >
                    <Inline space={12} alignItems="center">
                      <IconShieldRegular size={20} color={skinVars.colors.warning} />
                      <Text2 regular color={applyAlpha(skinVars.rawColors.inverse, 0.85)}>
                        {forecast.summary}
                      </Text2>
                    </Inline>
                  </div>
                ) : (
                  <Stack space={16}>
                    <div
                      style={{
                        backgroundColor: applyAlpha(skinVars.rawColors.inverse, 0.1),
                        borderRadius: skinVars.borderRadii.container,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-around",
                        padding: "12px 0",
                      }}
                    >
                      <Stat value={forecast.highlights.liveCount} label="Live" tone="success" />
                      <div
                        style={{
                          width: 1,
                          height: 32,
                          backgroundColor: applyAlpha(skinVars.rawColors.inverse, 0.2),
                        }}
                      />
                      <Stat
                        value={forecast.highlights.conflictCount}
                        label="Conflicts"
                        tone="warning"
                      />
                      <div
                        style={{
                          width: 1,
                          height: 32,
                          backgroundColor: applyAlpha(skinVars.rawColors.inverse, 0.2),
                        }}
                      />
                      <Stat value={forecast.highlights.riskCount} label="Risks" tone="warning" />
                    </div>

                    <Stack space={8}>
                      {forecast.summary.split("\n").map((p, i) => (
                        <Text2 key={i} regular color={applyAlpha(skinVars.rawColors.inverse, 0.9)}>
                          {p}
                        </Text2>
                      ))}
                    </Stack>

                    {forecast.citations.length > 0 && (
                      <Stack space={8}>
                        <Inline space={8} alignItems="center">
                          <IconFileTextRegular
                            size={14}
                            color={skinVars.colors.textPrimaryInverse}
                          />
                          <Text1
                            medium
                            color={skinVars.colors.textPrimaryInverse}
                            transform="uppercase"
                          >
                            Cited activity
                          </Text1>
                        </Inline>
                        <div style={{ display: "flex", overflowX: "auto", gap: 8, paddingBottom: 8 }}>
                          {forecast.citations.map((c, i) => (
                            <div key={i} style={{ flexShrink: 0, width: 220 }}>
                              <Touchable
                                onPress={() => setSelected(c)}
                                aria-label={`Citation ${c.id}: ${c.docTitle}`}
                              >
                                <div
                                  style={{
                                    backgroundColor: applyAlpha(skinVars.rawColors.inverse, 0.1),
                                    borderRadius: skinVars.borderRadii.container,
                                    padding: 10,
                                  }}
                                >
                                  <Inline space={8} alignItems="center">
                                    <div
                                      style={{
                                        backgroundColor: skinVars.colors.backgroundContainer,
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
                                      <Text1 medium color={skinVars.colors.textPrimaryInverse}>
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
                                      <Text1 regular color={applyAlpha(skinVars.rawColors.inverse, 0.6)}>
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
                  </Stack>
                )}

                {forecast.status !== "no_activity" && (
                  <Stack space={8}>
                    {scheduled ? (
                      <div
                        style={{
                          backgroundColor: applyAlpha(skinVars.rawColors.inverse, 0.1),
                          borderRadius: skinVars.borderRadii.container,
                          padding: 12,
                        }}
                      >
                        <Text2 regular color={applyAlpha(skinVars.rawColors.inverse, 0.9)}>
                          Sent to the "{scheduled.reviewItem.reviewFolder}" review folder as "
                          {scheduled.reviewItem.draft.title}". It is waiting for approval in
                          Generate.
                        </Text2>
                      </div>
                    ) : (
                      <ButtonPrimary
                        small
                        onPress={() => schedule({ data: { area, roleId } })}
                        disabled={scheduling || !roleId}
                      >
                        {scheduling ? "Scheduling…" : "Schedule to review folder"}
                      </ButtonPrimary>
                    )}
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
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
    </ThemeVariant>
  );
}
