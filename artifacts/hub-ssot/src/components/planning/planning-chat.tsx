import React from "react";
import { clearanceLabel } from "@/components/data-center/helpers";
import { useListAxes, type Citation } from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { PLANNING_I18N } from "@/i18n/planning";
import {
  streamPlanningAsk,
  type PlanningAskStep,
  type PlanningAskStreamResult,
} from "@/hooks/planning-ask-stream";
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
  IconCheckRegular,
  IconTrashCanRegular,
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

// Live agent steps for a turn. While the turn is pending the last step shows
// a spinner; once a step is reported done (or the turn finished) it gets a
// check mark. This surfaces the real pipeline: scope -> retrieve -> decide.
function StepTrail({ steps, pending, label }: { steps: PlanningAskStep[]; pending: boolean; label: string }) {
  if (steps.length === 0) return null;
  return (
    <div
      style={{
        border: `1px solid ${skinVars.colors.divider}`,
        borderRadius: skinVars.borderRadii.container,
        backgroundColor: skinVars.colors.backgroundAlternative,
        padding: 12,
      }}
    >
      <Stack space={8}>
        <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
          {label}
        </Text1>
        {steps.map((s) => {
          const active = pending && s.state === "active";
          return (
            <Inline key={s.id} space={8} alignItems="center">
              <div style={{ display: "flex", flexShrink: 0, width: 16, justifyContent: "center" }}>
                {active ? (
                  <Spinner size={14} />
                ) : (
                  <IconCheckRegular size={14} color={skinVars.colors.success} />
                )}
              </div>
              <Text2
                regular
                color={active ? skinVars.colors.textPrimary : skinVars.colors.textSecondary}
              >
                {s.label}
                {s.detail ? ` — ${s.detail}` : ""}
              </Text2>
            </Inline>
          );
        })}
      </Stack>
    </div>
  );
}

interface ChatTurn {
  id: number;
  question: string;
  steps: PlanningAskStep[];
  result: PlanningAskStreamResult | null;
  error: string | null;
  pending: boolean;
}

export function PlanningChat() {
  const { area, roleId, lang } = useApp();
  const t = PLANNING_I18N[lang];
  const [draft, setDraft] = React.useState("");
  const [turns, setTurns] = React.useState<ChatTurn[]>([]);
  const [selected, setSelected] = React.useState<Citation | null>(null);
  const { data: axes } = useListAxes();
  const nextId = React.useRef(1);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const pending = turns.some((turn) => turn.pending);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  // Cancel any in-flight stream when the panel unmounts so the server can
  // abort its Claude call instead of composing for a closed socket.
  React.useEffect(() => () => abortRef.current?.abort(), []);

  const patchTurn = React.useCallback((id: number, patch: (turn: ChatTurn) => ChatTurn) => {
    setTurns((prev) => prev.map((turn) => (turn.id === id ? patch(turn) : turn)));
  }, []);

  const ask = (text: string) => {
    const question = text.trim();
    if (!question || !roleId || pending) return;
    const id = nextId.current++;
    setDraft("");
    setTurns((prev) => [
      ...prev,
      { id, question, steps: [], result: null, error: null, pending: true },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;
    streamPlanningAsk(
      { question, area, roleId },
      {
        onStep: (step) =>
          patchTurn(id, (turn) => {
            const existing = turn.steps.findIndex((s) => s.id === step.id);
            const steps =
              existing >= 0
                ? turn.steps.map((s, i) => (i === existing ? step : s))
                : [
                    // A new step becoming active implies earlier steps are done.
                    ...turn.steps.map((s) =>
                      s.state === "active" ? { ...s, state: "done" as const } : s,
                    ),
                    step,
                  ];
            return { ...turn, steps };
          }),
      },
      controller.signal,
    )
      .then((result) =>
        patchTurn(id, (turn) => ({
          ...turn,
          result,
          pending: false,
          steps: turn.steps.map((s) => ({ ...s, state: "done" as const })),
        })),
      )
      .catch(() =>
        patchTurn(id, (turn) => ({ ...turn, error: t.chatError, pending: false })),
      );
  };

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
          <Inline space="between" alignItems="center">
            <Inline space={8} alignItems="center">
              <IconSearchRegular size={16} color={skinVars.colors.brand} />
              <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                {t.askCalendar}
              </Text1>
            </Inline>
            {turns.length > 0 && (
              <IconButton
                aria-label={t.clearChat}
                Icon={IconTrashCanRegular}
                onPress={() => setTurns([])}
                small
                disabled={pending}
              />
            )}
          </Inline>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", minHeight: 120, maxHeight: 480 }}>
            {turns.length === 0 && (
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

            <Stack space={24}>
              {turns.map((turn) => {
                const result = turn.result;
                const answerAxes = axes?.filter((a) => result?.axisIds?.includes(a.id)) || [];
                return (
                  <Stack key={turn.id} space={16}>
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
                          {turn.question}
                        </Text2>
                      </div>
                    </div>

                    <StepTrail steps={turn.steps} pending={turn.pending} label={t.agentActivity} />

                    {turn.pending && turn.steps.length === 0 && (
                      <Inline space={12} alignItems="center">
                        <Spinner size={20} />
                        <Text2 medium color={skinVars.colors.textPrimary}>
                          {t.accessingCalendar}
                        </Text2>
                      </Inline>
                    )}

                    {turn.error && (
                      <div
                        style={{
                          backgroundColor: applyAlpha(skinVars.rawColors.error, 0.12),
                          borderRadius: skinVars.borderRadii.container,
                          padding: 16,
                        }}
                      >
                        <Inline space={12}>
                          <IconAlertRegular size={20} color={skinVars.colors.error} />
                          <Text2 regular color={skinVars.colors.textPrimary}>
                            {turn.error}
                          </Text2>
                        </Inline>
                      </div>
                    )}

                    {result?.status === "conversational" && (
                      <Stack space={8}>
                        {result.answer.split("\n").map((p, i) => (
                          <Text2 key={i} regular color={skinVars.colors.textPrimary}>
                            {p}
                          </Text2>
                        ))}
                      </Stack>
                    )}

                    {result?.status === "no_evidence" && (
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

                    {result?.status === "permission_blocked" && (
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

                    {result?.status === "answered" && (
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
                );
              })}
            </Stack>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
          >
            <Inline space={8} alignItems="center" expand={0}>
              <TextField
                name="planning-question"
                label={t.askPlaceholder}
                value={draft}
                onChangeValue={setDraft}
                fullWidth
              />
              <IconButton
                aria-label={t.send}
                Icon={IconSendRegular}
                onPress={() => ask(draft)}
                disabled={!draft.trim() || pending || !roleId}
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
