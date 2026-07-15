import React from "react";
import {
  useGetIngestionSnapshot,
  useGetRelevanceFilter,
  useLiveIngestSearch,
  useLiveIngestAccept,
} from "@workspace/api-client-react";
import type {
  QuarantineDoc,
  LiveIngestCandidate,
  LiveIngestFilterInput,
  LiveIngestAcceptResult,
} from "@workspace/api-client-react";
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
  ButtonSecondary,
  Callout,
  Checkbox,
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
import { clearanceTagType, clearanceLabel, fieldLabel, localeFor } from "./helpers";
import { useApp } from "../app-provider";
import { DATA_I18N } from "../../i18n/data";

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

function parseTerms(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function LiveCaptureSection() {
  const { lang, roleId } = useApp();
  const t = DATA_I18N[lang];
  const L = t.ingestion.live;
  const [keywords, setKeywords] = React.useState("Telefónica, Movistar");
  const [competitors, setCompetitors] = React.useState("");
  const [executives, setExecutives] = React.useState("");
  const [topics, setTopics] = React.useState("");
  const [candidates, setCandidates] = React.useState<LiveIngestCandidate[] | null>(null);
  const [lastFilter, setLastFilter] = React.useState<LiveIngestFilterInput | null>(null);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [acceptError, setAcceptError] = React.useState<string | null>(null);
  const [lastIngest, setLastIngest] = React.useState<LiveIngestAcceptResult | null>(null);

  const searchMutation = useLiveIngestSearch();
  const acceptMutation = useLiveIngestAccept();

  const filter: LiveIngestFilterInput = {
    keywords: parseTerms(keywords),
    competitors: parseTerms(competitors),
    executives: parseTerms(executives),
    topics: parseTerms(topics),
  };
  const termCount =
    filter.keywords.length +
    filter.competitors.length +
    filter.executives.length +
    filter.topics.length;

  const selectedCount = (candidates ?? []).filter((c) => selected[c.id]).length;

  async function runSearch() {
    setSearchError(null);
    setAcceptError(null);
    setLastIngest(null);
    try {
      const result = await searchMutation.mutateAsync({ data: { filter, roleId } });
      setCandidates(result.items);
      setLastFilter(result.filter);
      const seed: Record<string, boolean> = {};
      result.items.forEach((i) => {
        seed[i.id] = true;
      });
      setSelected(seed);
    } catch {
      setSearchError(L.searchError);
    }
  }

  async function runAccept() {
    if (!candidates || !lastFilter) return;
    const accepted = candidates.filter((c) => selected[c.id]);
    if (accepted.length === 0) return;
    setAcceptError(null);
    try {
      const result = await acceptMutation.mutateAsync({
        data: { acceptedIds: accepted.map((c) => c.id), roleId },
      });
      setLastIngest(result);
      setCandidates(null);
      setSelected({});
    } catch {
      setAcceptError(L.acceptError);
    }
  }

  return (
    <Boxed>
      <Box padding={24}>
        <Stack space={24}>
          <Inline space="between" alignItems="center">
            <Inline space={8} alignItems="center">
              <IconAiRegular size={20} color={skinVars.colors.brand} />
              <Title2>{L.title}</Title2>
            </Inline>
            <Tag type="info">{L.filterBeforeIngest}</Tag>
          </Inline>

          <Text2 regular color={skinVars.colors.textSecondary}>
            {L.desc}
          </Text2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <TextField
                name="live-keywords"
                label={L.keywords}
                value={keywords}
                onChangeValue={setKeywords}
              />
            </div>
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <TextField
                name="live-competitors"
                label={L.competitors}
                value={competitors}
                onChangeValue={setCompetitors}
              />
            </div>
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <TextField
                name="live-executives"
                label={L.executives}
                value={executives}
                onChangeValue={setExecutives}
              />
            </div>
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <TextField
                name="live-topics"
                label={L.topics}
                value={topics}
                onChangeValue={setTopics}
              />
            </div>
          </div>

          <Inline space={12} alignItems="center">
            <ButtonPrimary
              small
              onPress={runSearch}
              disabled={termCount === 0 || searchMutation.isPending}
              showSpinner={searchMutation.isPending}
            >
              {searchMutation.isPending ? L.searching : L.runCapture}
            </ButtonPrimary>
            {termCount === 0 && (
              <Text1 regular color={skinVars.colors.textSecondary}>
                {L.atLeastOne}
              </Text1>
            )}
          </Inline>

          {searchError && (
            <Callout
              asset={<IconAlertRegular color={skinVars.colors.error} />}
              title={L.captureFailed}
              description={searchError}
            />
          )}

          {candidates && candidates.length === 0 && (
            <Callout
              asset={<IconSearchRegular color={skinVars.colors.textSecondary} />}
              title={L.noMatchTitle}
              description={L.noMatchDesc}
            />
          )}

          {candidates && candidates.length > 0 && (
            <Stack space={12}>
              <Divider />
              <Inline space="between" alignItems="center">
                <Title3>{L.candidatesTitle(selectedCount, candidates.length)}</Title3>
                <ButtonSecondary
                  small
                  onPress={runAccept}
                  disabled={selectedCount === 0 || acceptMutation.isPending}
                  showSpinner={acceptMutation.isPending}
                >
                  {acceptMutation.isPending
                    ? L.embedding
                    : L.ingestAccepted(selectedCount)}
                </ButtonSecondary>
              </Inline>
              {candidates.map((c) => {
                const sign = sentimentSign(c.sentiment);
                return (
                  <Boxed key={c.id}>
                    <Box padding={16}>
                      <Inline space={16} alignItems="center">
                        <Checkbox
                          name={`accept-${c.id}`}
                          checked={selected[c.id] ?? false}
                          onChange={(checked) =>
                            setSelected((prev) => ({ ...prev, [c.id]: checked }))
                          }
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Stack space={4}>
                            <Inline space={8} alignItems="center" wrap>
                              <Text2 medium color={skinVars.colors.textPrimary}>
                                {c.title}
                              </Text2>
                              <Text2 medium color={sign.color}>
                                {sign.label}
                              </Text2>
                              <Tag type="inactive">{t.sentiment[c.sentiment] ?? c.sentiment}</Tag>
                            </Inline>
                            <Text1 regular color={skinVars.colors.textSecondary}>
                              {c.source}
                              {c.date ? ` · ${c.date}` : ""}
                            </Text1>
                            <Text2 regular color={skinVars.colors.textPrimary}>
                              {c.excerpt}
                            </Text2>
                            <Inline space={4} alignItems="center" wrap>
                              <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                                {L.matched}
                              </Text1>
                              {c.matchedTerms.map((t) => (
                                <Tag key={t} type="info">
                                  {t}
                                </Tag>
                              ))}
                            </Inline>
                          </Stack>
                        </div>
                      </Inline>
                    </Box>
                  </Boxed>
                );
              })}
            </Stack>
          )}

          {acceptError && (
            <Callout
              asset={<IconAlertRegular color={skinVars.colors.error} />}
              title={L.ingestionFailed}
              description={acceptError}
            />
          )}

          {lastIngest && (
            <Callout
              asset={<IconCheckedRegular color={skinVars.colors.success} />}
              title={L.ingestedTitle(lastIngest.createdDocs.length)}
              description={L.ingestedDesc(
                lastIngest.createdDocs.map((d) => d.title).join("; "),
                lastIngest.upsertedChunks,
                lastIngest.pointsBefore,
                lastIngest.pointsAfter,
              )}
            />
          )}
        </Stack>
      </Box>
    </Boxed>
  );
}

function RelevanceFilterSection() {
  const { lang } = useApp();
  const t = DATA_I18N[lang];
  const R = t.ingestion.relevance;
  const { data: filter } = useGetRelevanceFilter();
  if (!filter) return null;

  return (
    <Boxed>
      <Box padding={24}>
        <Stack space={24}>
          <Inline space="between" alignItems="center">
            <Inline space={8} alignItems="center">
              <IconSearchRegular size={20} color={skinVars.colors.brand} />
              <Title2>{R.title}</Title2>
            </Inline>
            <Inline space={8} alignItems="center">
              <Tag type="success">{R.kept(filter.keptCount)}</Tag>
              <Tag type="inactive">{R.dropped(filter.droppedCount)}</Tag>
            </Inline>
          </Inline>

          <Text2 regular color={skinVars.colors.textSecondary}>
            {R.desc}
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
            <Title3>{R.recentDecisions}</Title3>
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
                        {m.matchedRule ? ` · ${R.matchedRule(m.matchedRule)}` : ` · ${R.noRuleMatched}`}
                      </Text1>
                    </Stack>
                  </div>
                  <Text2 medium color={sign.color}>
                    {sign.label}
                  </Text2>
                  <Tag type={kept ? "success" : "inactive"}>{t.decision[m.decision] ?? m.decision}</Tag>
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
  const { lang } = useApp();
  const t = DATA_I18N[lang];
  const P = t.ingestion.pipeline;
  const Q = t.ingestion.quarantine;
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
    const filled = active.missingFields.map((f) => fieldLabel(f, lang)).join(", ");
    releaseQuarantine(
      active.id,
      active.title,
      Q.releasedDetail(filled, active.stage),
    );
    setActive(null);
  }

  return (
    <Stack space={24}>
      <LiveCaptureSection />
      <RelevanceFilterSection />

      <Boxed>
        <Box padding={24}>
          <Stack space={24}>
            <Inline space="between" alignItems="center">
              <Inline space={8} alignItems="center">
                <IconBoxRegular size={20} color={skinVars.colors.brand} />
                <Title2>{P.title}</Title2>
              </Inline>
              <Inline space={8} alignItems="center">
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {P.taxonomy}
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
                                {stage.count.toLocaleString(localeFor(lang))}
                              </Text2>
                            </Inline>
                            <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                              {P.stage(i + 1)}
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
                      {P.validatedLive}
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
                    {P.validatedNote}
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
              ? Q.titleOpen(openItems.length)
              : Q.titleClear}
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
                <Title3>{Q.nothingWaiting}</Title3>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {releasedCount > 0
                    ? Q.clearedThisSession(releasedCount)
                    : Q.everyDocHasMeta}
                </Text2>
              </Stack>
            ) : (
              <Stack space={16}>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {Q.stalledNote}
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
                                {clearanceLabel(q.confidentiality, lang)}
                              </Tag>
                            </Inline>
                            <Text1 regular color={skinVars.colors.textSecondary}>
                              {Q.heldAt(q.source, q.stage, String(q.taxonomyVersion))}
                            </Text1>
                            <Inline space={8} alignItems="center" wrap>
                              <Text1 medium color={skinVars.colors.error} transform="uppercase">
                                {Q.missing}
                              </Text1>
                              {q.missingFields.map((f) => (
                                <Tag key={f} type="error">
                                  {fieldLabel(f, lang)}
                                </Tag>
                              ))}
                            </Inline>
                          </Stack>
                        </div>
                        <ButtonPrimary small onPress={() => openResolve(q)}>
                          {Q.resolve}
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
          title={Q.resolveTitle}
          description={Q.resolveDesc(active.title, active.stage)}
          onClose={() => setActive(null)}
          onDismiss={() => setActive(null)}
          button={{
            text: Q.releaseToPipeline,
            onPress: commitRelease,
            disabled: !allFilled,
          }}
          secondaryButton={{ text: Q.cancel, onPress: () => setActive(null) }}
        >
          <Stack space={16}>
            {active.missingFields.map((f) =>
              f === "confidentiality" ? (
                <Select
                  key={f}
                  name={f}
                  label={fieldLabel(f, lang)}
                  value={fixes[f] ?? ""}
                  onChangeValue={(v) => setFixes((prev) => ({ ...prev, [f]: v }))}
                  options={CLEARANCES.map((c) => ({ value: c, text: clearanceLabel(c, lang) }))}
                />
              ) : (
                <TextField
                  key={f}
                  name={f}
                  label={fieldLabel(f, lang)}
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
