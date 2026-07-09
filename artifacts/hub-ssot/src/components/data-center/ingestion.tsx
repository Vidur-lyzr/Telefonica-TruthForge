import React from "react";
import {
  useGetIngestionSnapshot,
  useGetRelevanceFilter,
} from "@workspace/api-client-react";
import type { QuarantineDoc } from "@workspace/api-client-react";
import {
  Box,
  Stack,
  Inline,
  Boxed,
  Divider,
  Circle,
  Tag,
  ProgressBar,
  ButtonPrimary,
  TextField,
  Select,
  Drawer,
  Text1,
  Text2,
  Text3,
  Title2,
  Title3,
  skinVars,
  IconDownloadRegular,
  IconDocumentOtherRegular,
  IconTagRegular,
  IconShieldRegular,
  IconBoxRegular,
  IconCheckedRegular,
  IconAiRegular,
  IconAlertRegular,
  IconArrowLineRightRegular,
  IconArchiveRegular,
  IconSearchRegular,
  IconThumbUpRegular,
  IconThumbDownRegular,
} from "@telefonica/mistica";
import { useDataCenter } from "./state";
import { clearanceTagType, clearanceLabel, fieldLabel } from "./helpers";

type IconType = React.ComponentType<{ size?: number; color?: string }>;

const STAGE_ICON: Record<string, IconType> = {
  intake: IconDownloadRegular,
  extract: IconDocumentOtherRegular,
  classify: IconTagRegular,
  govern: IconShieldRegular,
  chunk: IconBoxRegular,
  embed: IconAiRegular,
  validate: IconCheckedRegular,
};

const CLEARANCES = ["public", "private", "confidential", "off_the_record"];

function sentimentSign(sentiment: string): { label: string; color: string } {
  if (sentiment === "positive") return { label: "+", color: skinVars.colors.success };
  if (sentiment === "negative") return { label: "−", color: skinVars.colors.error };
  return { label: "·", color: skinVars.colors.textSecondary };
}

function RelevanceFilterSection() {
  const { data: filter } = useGetRelevanceFilter();
  if (!filter) return null;

  return (
    <Boxed>
      <Box padding={24}>
        <Stack space={24}>
          <Inline space="between" alignItems="center">
            <Inline space={8} alignItems="center">
              <IconSearchRegular size={20} color={skinVars.colors.brand} />
              <Title2>Pre-ingestion relevance filter</Title2>
            </Inline>
            <Inline space={8} alignItems="center">
              <Tag type="success">{`${filter.keptCount} kept`}</Tag>
              <Tag type="inactive">{`${filter.droppedCount} dropped`}</Tag>
            </Inline>
          </Inline>

          <Text2 regular color={skinVars.colors.textSecondary}>
            External mentions are screened against agreed rules before ingestion — keywords,
            tracked competitors, named executives and priority topics. Dropped mentions never
            reach the knowledge core.
          </Text2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {filter.rules.map((rule) => (
              <div key={rule.id} style={{ flex: "1 1 220px", minWidth: 0 }}>
                <Boxed>
                  <Box padding={16}>
                    <Stack space={8}>
                      <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                        {rule.category}
                      </Text1>
                      <Inline space={4} alignItems="center" wrap>
                        {rule.terms.map((t) => (
                          <Tag key={t} type="info">
                            {t}
                          </Tag>
                        ))}
                      </Inline>
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        {rule.note}
                      </Text1>
                    </Stack>
                  </Box>
                </Boxed>
              </div>
            ))}
          </div>

          <Divider />

          <Stack space={12}>
            <Title3>Recent decisions</Title3>
            {filter.mentions.map((m) => {
              const sign = sentimentSign(m.sentiment);
              const kept = m.decision === "kept";
              return (
                <Inline key={m.id} space={12} alignItems="center">
                  <Circle
                    size={32}
                    backgroundColor={
                      kept ? skinVars.colors.successLow : skinVars.colors.neutralLow
                    }
                  >
                    {kept ? (
                      <IconThumbUpRegular size={14} color={skinVars.colors.success} />
                    ) : (
                      <IconThumbDownRegular size={14} color={skinVars.colors.textSecondary} />
                    )}
                  </Circle>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Stack space={2}>
                      <Text2 regular color={skinVars.colors.textPrimary}>
                        {m.excerpt}
                      </Text2>
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        {m.source}
                        {m.matchedRule ? ` · matched ${m.matchedRule}` : " · no rule matched"}
                      </Text1>
                    </Stack>
                  </div>
                  <Text2 medium color={sign.color}>
                    {sign.label}
                  </Text2>
                  <Tag type={kept ? "success" : "inactive"}>{m.decision}</Tag>
                </Inline>
              );
            })}
          </Stack>
        </Stack>
      </Box>
    </Boxed>
  );
}

export default function IngestionArea() {
  const { data: snapshot } = useGetIngestionSnapshot();
  const { releasedQuarantine, releaseQuarantine } = useDataCenter();

  const [active, setActive] = React.useState<QuarantineDoc | null>(null);
  const [fixes, setFixes] = React.useState<Record<string, string>>({});

  const quarantine = snapshot?.quarantine ?? [];
  const openItems = React.useMemo(
    () => quarantine.filter((q) => !releasedQuarantine[q.id]),
    [quarantine, releasedQuarantine],
  );
  const releasedCount = quarantine.length - openItems.length;

  function openResolve(doc: QuarantineDoc) {
    const seed: Record<string, string> = {};
    doc.missingFields.forEach((f) => {
      seed[f] = "";
    });
    setFixes(seed);
    setActive(doc);
  }

  const allFilled =
    active !== null && active.missingFields.every((f) => (fixes[f] ?? "").trim().length > 0);

  function commitRelease() {
    if (!active) return;
    const filled = active.missingFields.map((f) => fieldLabel(f)).join(", ");
    releaseQuarantine(
      active.id,
      active.title,
      `Completed ${filled}. Re-entered the pipeline at ${active.stage}.`,
    );
    setActive(null);
  }

  return (
    <Stack space={24}>
      <RelevanceFilterSection />

      <Boxed>
        <Box padding={24}>
          <Stack space={24}>
            <Inline space="between" alignItems="center">
              <Inline space={8} alignItems="center">
                <IconBoxRegular size={20} color={skinVars.colors.brand} />
                <Title2>The seven-stage pipeline</Title2>
              </Inline>
              <Inline space={8} alignItems="center">
                <Text2 regular color={skinVars.colors.textSecondary}>
                  Taxonomy
                </Text2>
                <Tag type="info">{snapshot?.taxonomyVersion ?? "—"}</Tag>
              </Inline>
            </Inline>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "stretch",
                gap: 8,
              }}
            >
              {snapshot?.stages.map((stage, i) => {
                const Icon = STAGE_ICON[stage.id] ?? IconBoxRegular;
                return (
                  <React.Fragment key={stage.id}>
                    <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                      <Boxed>
                        <Box padding={16}>
                          <Stack space={8}>
                            <Inline space="between" alignItems="center">
                              <Circle size={36} backgroundColor={skinVars.colors.brandLow}>
                                <Icon size={16} color={skinVars.colors.brand} />
                              </Circle>
                              <Text2 medium color={skinVars.colors.textPrimary}>
                                {stage.count.toLocaleString("en-GB")}
                              </Text2>
                            </Inline>
                            <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                              Stage {i + 1}
                            </Text1>
                            <Text2 medium color={skinVars.colors.textPrimary}>
                              {stage.name}
                            </Text2>
                            <Text1 regular color={skinVars.colors.textSecondary}>
                              {stage.description}
                            </Text1>
                          </Stack>
                        </Box>
                      </Boxed>
                    </div>
                    {i < (snapshot.stages.length ?? 0) - 1 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <IconArrowLineRightRegular size={16} color={skinVars.colors.textSecondary} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <Boxed>
              <Box padding={16}>
                <Stack space={8}>
                  <Inline space="between" alignItems="center">
                    <Text2 medium color={skinVars.colors.textPrimary}>
                      Validated and live in the core
                    </Text2>
                    <Text2 medium color={skinVars.colors.success}>
                      {snapshot?.validatedPct ?? 0}%
                    </Text2>
                  </Inline>
                  <ProgressBar
                    progressPercent={snapshot?.validatedPct ?? 0}
                    color={skinVars.colors.success}
                  />
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    Nothing reaches the model until it passes validation. The remainder is held in
                    quarantine below — never silently dropped, never silently guessed.
                  </Text1>
                </Stack>
              </Box>
            </Boxed>
          </Stack>
        </Box>
      </Boxed>

      <Stack space={16}>
        <Inline space={8} alignItems="center">
          {openItems.length > 0 ? (
            <IconAlertRegular size={20} color={skinVars.colors.warning} />
          ) : (
            <IconCheckedRegular size={20} color={skinVars.colors.success} />
          )}
          <Title2>
            {openItems.length > 0
              ? `Quarantine — ${openItems.length} held for a documentalist`
              : "Quarantine clear"}
          </Title2>
        </Inline>

        <Boxed>
          <Box padding={24}>
            {openItems.length === 0 ? (
              <Stack space={12}>
                <Inline space={0} alignItems="center">
                  <Circle size={56} backgroundColor={skinVars.colors.successLow}>
                    <IconArchiveRegular size={28} color={skinVars.colors.success} />
                  </Circle>
                </Inline>
                <Title3>Nothing waiting</Title3>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {releasedCount > 0
                    ? `You cleared ${releasedCount} ${releasedCount === 1 ? "document" : "documents"} this session. Each re-entered the pipeline where it left off.`
                    : "Every ingested document has the metadata the core requires."}
                </Text2>
              </Stack>
            ) : (
              <Stack space={16}>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  These documents stalled because a required field is missing or their taxonomy
                  version is behind. They are held — not dropped — so the core is never polluted.
                  Complete the metadata to release them.
                </Text2>
                {openItems.map((q) => (
                  <Boxed key={q.id}>
                    <Box padding={16}>
                      <Inline space={16} alignItems="center">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Stack space={8}>
                            <Inline space={8} alignItems="center" wrap>
                              <Text2 medium color={skinVars.colors.textPrimary}>
                                {q.title}
                              </Text2>
                              <Tag type={clearanceTagType(q.confidentiality)}>
                                {clearanceLabel(q.confidentiality)}
                              </Tag>
                            </Inline>
                            <Text1 regular color={skinVars.colors.textSecondary}>
                              {q.source} · held at {q.stage} stage · taxonomy {q.taxonomyVersion}
                            </Text1>
                            <Inline space={8} alignItems="center" wrap>
                              <Text1 medium color={skinVars.colors.error} transform="uppercase">
                                Missing
                              </Text1>
                              {q.missingFields.map((f) => (
                                <Tag key={f} type="error">
                                  {fieldLabel(f)}
                                </Tag>
                              ))}
                            </Inline>
                          </Stack>
                        </div>
                        <ButtonPrimary small onPress={() => openResolve(q)}>
                          Resolve
                        </ButtonPrimary>
                      </Inline>
                    </Box>
                  </Boxed>
                ))}
              </Stack>
            )}
          </Box>
        </Boxed>
      </Stack>

      {active && (
        <Drawer
          title="Resolve quarantine"
          description={`${active.title} — complete the required metadata. Once released, the document re-enters the pipeline at the ${active.stage} stage. Session-only for the demo.`}
          onClose={() => setActive(null)}
          button={{
            text: "Release to pipeline",
            onPress: commitRelease,
            disabled: !allFilled,
          }}
          secondaryButton={{ text: "Cancel", onPress: () => setActive(null) }}
        >
          <Stack space={16}>
            {active.missingFields.map((f) =>
              f === "confidentiality" ? (
                <Select
                  key={f}
                  name={f}
                  label={fieldLabel(f)}
                  value={fixes[f] ?? ""}
                  onChangeValue={(v) => setFixes((prev) => ({ ...prev, [f]: v }))}
                  options={CLEARANCES.map((c) => ({ value: c, text: c }))}
                />
              ) : (
                <TextField
                  key={f}
                  name={f}
                  label={fieldLabel(f)}
                  value={fixes[f] ?? ""}
                  onChangeValue={(v) => setFixes((prev) => ({ ...prev, [f]: v }))}
                />
              ),
            )}
          </Stack>
        </Drawer>
      )}
    </Stack>
  );
}
