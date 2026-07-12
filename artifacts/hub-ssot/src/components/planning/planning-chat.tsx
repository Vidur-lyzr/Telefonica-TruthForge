import React from "react";
import { clearanceLabel } from "@/components/data-center/helpers";
import {
  usePlanningAsk,
  useListAxes,
  type Citation,
  type PlanningAskResult,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { PLANNING_I18N } from "@/i18n/planning";
import {
  Sheet,
  Box,
  Stack,
  Inline,
  Grid,
  Text1,
  Text2,
  Text3,
  Text6,
  TextField,
  IconButton,
  Touchable,
  Tag,
  Spinner,
  skinVars,
  applyAlpha,
  IconSendRegular,
  IconSearchRegular,
  IconAlertRegular,
  IconShieldRegular,
  IconFileTextRegular,
  IconArrowRightRegular,
} from "@telefonica/mistica";

function EvidenceChip({ citation, onOpen }: { citation: Citation; onOpen: () => void }) {
  const { lang } = useApp();
  const t = PLANNING_I18N[lang];
  return (
    <div style={{ flexShrink: 0, width: 280 }}>
      <Touchable onPress={onOpen} aria-label={t.evidenceAria(citation.id, citation.docTitle)}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: 12,
            backgroundColor: skinVars.colors.backgroundContainer,
            border: `1px solid ${skinVars.colors.divider}`,
            borderRadius: skinVars.borderRadii.container,
          }}
        >
          <div
            style={{
              backgroundColor: applyAlpha(skinVars.rawColors.brand, 0.12),
              borderRadius: skinVars.borderRadii.chip,
              padding: "4px 8px",
              flexShrink: 0,
            }}
          >
            <Text1 medium color={skinVars.colors.brand}>
              {citation.id}
            </Text1>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <Text2 medium color={skinVars.colors.textPrimary}>
                {citation.docTitle}
              </Text2>
            </div>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <Text1 regular color={skinVars.colors.textSecondary}>{citation.sourceLoc}</Text1>
            </div>
            <Box paddingTop={4}>
              <Text1 regular color={skinVars.colors.textSecondary} transform="uppercase">
                {citation.owner}
              </Text1>
            </Box>
          </div>
        </div>
      </Touchable>
    </div>
  );
}

export function PlanningChat() {
  const { area, roleId, lang } = useApp();
  const t = PLANNING_I18N[lang];
  const [question, setQuestion] = React.useState("");
  const [selected, setSelected] = React.useState<Citation | null>(null);
  const { data: axes } = useListAxes();
  const { mutate, isPending, data: result, reset } = usePlanningAsk();

  const ask = (text: string) => {
    if (!text.trim() || !roleId) return;
    setQuestion(text);
    reset();
    mutate({ data: { question: text, area, roleId } });
  };

  const answerAxes =
    axes?.filter((a) => (result as PlanningAskResult | undefined)?.axisIds?.includes(a.id)) || [];

  return (
    <div
      style={{
        backgroundColor: skinVars.colors.backgroundContainer,
        border: `1px solid ${skinVars.colors.divider}`,
        borderRadius: skinVars.borderRadii.container,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      <Box padding={20}>
        <Stack space={12}>
          <Inline space={8} alignItems="center">
            <IconSearchRegular size={16} color={skinVars.colors.brand} />
            <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
              {t.askCalendar}
            </Text1>
          </Inline>

          <div style={{ flex: 1, overflowY: "auto", minHeight: 120 }}>
            {!result && !isPending && (
              <Stack space={8}>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {t.chatIntro}
                </Text2>
                {t.prompts.map((p) => (
                  <Touchable key={p} onPress={() => ask(p)} aria-label={p}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: 12,
                        borderRadius: skinVars.borderRadii.container,
                        border: `1px solid ${skinVars.colors.divider}`,
                        backgroundColor: skinVars.colors.backgroundAlternative,
                      }}
                    >
                      <Text2 medium color={skinVars.colors.textPrimary}>
                        {p}
                      </Text2>
                      <IconArrowRightRegular size={16} color={skinVars.colors.textSecondary} />
                    </div>
                  </Touchable>
                ))}
              </Stack>
            )}

            {isPending && (
              <Box paddingY={24}>
                <Inline space={12} alignItems="center">
                  <Spinner size={20} />
                  <Text2 medium color={skinVars.colors.textPrimary}>
                    {t.accessingCalendar}
                  </Text2>
                </Inline>
              </Box>
            )}

            {result && !isPending && (
              <Stack space={16}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      backgroundColor: skinVars.colors.backgroundAlternative,
                      borderRadius: skinVars.borderRadii.container,
                      padding: "10px 16px",
                      maxWidth: "90%",
                    }}
                  >
                    <Text2 medium color={skinVars.colors.textPrimary}>
                      {question}
                    </Text2>
                  </div>
                </div>

                {result.status === "no_evidence" && (
                  <div
                    style={{
                      backgroundColor: applyAlpha(skinVars.rawColors.warning, 0.12),
                      borderRadius: skinVars.borderRadii.container,
                      padding: 16,
                    }}
                  >
                    <Inline space={12}>
                      <IconAlertRegular size={20} color={skinVars.colors.warning} />
                      <Stack space={4}>
                        <Text2 medium color={skinVars.colors.textPrimary}>
                          {t.noEvidence}
                        </Text2>
                        <Text2 regular color={skinVars.colors.textPrimary}>
                          {result.answer}
                        </Text2>
                      </Stack>
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
                    <Inline space={12}>
                      <IconShieldRegular size={20} color={skinVars.colors.error} />
                      <Stack space={4}>
                        <Text2 medium color={skinVars.colors.textPrimary}>
                          {t.permissionRestricted}
                        </Text2>
                        <Text2 regular color={skinVars.colors.textPrimary}>
                          {result.answer}
                        </Text2>
                        {result.permissionNote && (
                          <div
                            style={{
                              backgroundColor: applyAlpha(skinVars.rawColors.inverse, 0.5),
                              borderRadius: skinVars.borderRadii.button,
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
                  <Stack space={16}>
                    <Stack space={8}>
                      {result.answer.split("\n").map((p, i) => (
                        <Text2 key={i} regular color={skinVars.colors.textPrimary}>
                          {p}
                        </Text2>
                      ))}
                    </Stack>

                    {answerAxes.length > 0 && (
                      <Inline space={8} wrap>
                        {answerAxes.map((axis) => (
                          <div
                            key={axis.id}
                            style={{
                              backgroundColor: axis.color || skinVars.colors.brand,
                              borderRadius: skinVars.borderRadii.button,
                              padding: "4px 10px",
                            }}
                          >
                            <Text1 medium color={skinVars.colors.textPrimaryInverse}>
                              {axis.name}
                            </Text1>
                          </div>
                        ))}
                      </Inline>
                    )}

                    {result.suggestedActions && result.suggestedActions.length > 0 && (
                      <div
                        style={{
                          backgroundColor: applyAlpha(skinVars.rawColors.brand, 0.1),
                          borderRadius: skinVars.borderRadii.container,
                          padding: 12,
                        }}
                      >
                        <Stack space={8}>
                          <Text1 medium color={skinVars.colors.brand} transform="uppercase">
                            {t.suggestedNextSteps}
                          </Text1>
                          {result.suggestedActions.map((a, i) => (
                            <Text2 key={i} regular color={skinVars.colors.textPrimary}>
                              {a}
                            </Text2>
                          ))}
                        </Stack>
                      </div>
                    )}

                    {result.citations && result.citations.length > 0 && (
                      <Box paddingTop={12}>
                        <Stack space={8}>
                          <Inline space={8} alignItems="center">
                            <IconFileTextRegular size={14} color={skinVars.colors.textSecondary} />
                            <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                              {t.evidence}
                            </Text1>
                          </Inline>
                          <div style={{ display: "flex", overflowX: "auto", gap: 12, paddingBottom: 8 }}>
                            {result.citations.map((c, i) => (
                              <EvidenceChip key={i} citation={c} onOpen={() => setSelected(c)} />
                            ))}
                          </div>
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                )}
              </Stack>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            <Inline space={8} alignItems="center" expand={0}>
              <TextField
                name="planning-question"
                label={t.askPlaceholder}
                value={question}
                onChangeValue={setQuestion}
                fullWidth
              />
              <IconButton
                aria-label={t.send}
                Icon={IconSendRegular}
                onPress={() => ask(question)}
                disabled={!question.trim() || isPending || !roleId}
              />
            </Inline>
          </form>
        </Stack>
      </Box>

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
                      {t.citationLabel(selected.id)}
                    </Text2>
                  </div>
                  <Tag type={selected.confidentiality === "public" ? "success" : "error"}>
                    {clearanceLabel(selected.confidentiality)}
                  </Tag>
                </Inline>
                <Text6 id={modalTitleId}>{selected.docTitle}</Text6>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {selected.sourceLoc}
                </Text2>
                <div
                  style={{
                    backgroundColor: skinVars.colors.backgroundAlternative,
                    border: `1px solid ${skinVars.colors.divider}`,
                    borderRadius: skinVars.borderRadii.container,
                    padding: 24,
                  }}
                >
                  <Stack space={12}>
                    <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                      {t.extractedSnippet}
                    </Text1>
                    <Text3 regular color={skinVars.colors.textPrimary}>
                      "{selected.snippet}"
                    </Text3>
                  </Stack>
                </div>
                <Grid columns={{ minSize: 140 }} gap={16}>
                  <Stack space={4}>
                    <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                      {t.owner}
                    </Text1>
                    <Text2 medium color={skinVars.colors.textPrimary}>
                      {selected.owner}
                    </Text2>
                  </Stack>
                  <Stack space={4}>
                    <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                      {t.confidence}
                    </Text1>
                    <Text2 medium color={skinVars.colors.textPrimary}>
                      {Math.round(selected.confidence * 100)}%
                    </Text2>
                  </Stack>
                  {selected.country && (
                    <Stack space={4}>
                      <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                        {t.market}
                      </Text1>
                      <Text2 medium color={skinVars.colors.textPrimary}>
                        {selected.country}
                      </Text2>
                    </Stack>
                  )}
                </Grid>
              </Stack>
            </Box>
          )}
        </Sheet>
      )}
    </div>
  );
}
