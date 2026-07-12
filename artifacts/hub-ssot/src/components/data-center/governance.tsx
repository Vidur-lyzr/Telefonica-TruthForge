import React from "react";
import {
  useListAxes,
  useListDocumentFreshness,
  useGetTaxonomyState,
  useProposeRetag,
  useApplyRetag,
  RetagProposeResult,
} from "@workspace/api-client-react";
import {
  Box,
  Stack,
  Inline,
  Grid,
  GridItem,
  Boxed,
  Divider,
  Circle,
  Tag,
  Callout,
  ProgressBar,
  Table,
  Checkbox,
  ButtonSecondary,
  TextField,
  Select,
  Drawer,
  Text1,
  Text2,
  Text3,
  Title2,
  skinVars,
  applyAlpha,
  IconWorldDeviceRegular,
  IconTimeRegular,
  IconAlertRegular,
  IconRefreshRegular,
  IconShieldRegular,
  IconArrowLineRightRegular,
  IconListRegular,
} from "@telefonica/mistica";
import { useDataCenter } from "./state";
import { formatDate } from "./helpers";
import { useApp } from "../app-provider";
import { DATA_I18N } from "../../i18n/data";

type Step = 0 | 1 | 2 | 3;

export default function GovernanceArea() {
  const { lang } = useApp();
  const t = DATA_I18N[lang];
  const G = t.governance;
  const W = G.wizard;
  const { data: axes, refetch: refetchAxes } = useListAxes();
  const { data: freshness } = useListDocumentFreshness();
  const { data: taxonomy, refetch: refetchTaxonomy } = useGetTaxonomyState();
  const proposeMutation = useProposeRetag();
  const applyMutation = useApplyRetag();
  const { runReclassification } = useDataCenter();

  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>(0);
  const [axisId, setAxisId] = React.useState("");
  const [renameTo, setRenameTo] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [proposal, setProposal] = React.useState<RetagProposeResult | null>(null);
  const [proposeError, setProposeError] = React.useState<string | null>(null);
  const [decisions, setDecisions] = React.useState<Record<string, boolean>>({});
  const [applying, setApplying] = React.useState(false);
  const [applyError, setApplyError] = React.useState<string | null>(null);
  const [lastApplied, setLastApplied] = React.useState<null | {
    version: number;
    appliedCount: number;
    rejectedCount: number;
    qdrant?: { updatedDocs: number; pointsBefore: number; pointsAfter: number } | null;
  }>(null);

  const overdue = React.useMemo(() => (freshness ?? []).filter((f) => f.overdue), [freshness]);
  const onTrack = (freshness?.length ?? 0) - overdue.length;
  const compliancePct = freshness?.length ? Math.round((onTrack / freshness.length) * 100) : 100;

  const effectiveAxisId = axisId || (axes && axes.length > 0 ? axes[0].id : "");
  const selectedAxis = (axes ?? []).find((a) => a.id === effectiveAxisId);
  const acceptedCount = proposal
    ? proposal.proposals.filter((p) => decisions[p.docId] !== false).length
    : 0;

  function resetWizard() {
    setStep(0);
    setAxisId("");
    setRenameTo("");
    setNewDescription("");
    setProposal(null);
    setProposeError(null);
    setDecisions({});
    setApplyError(null);
  }

  async function startProposal() {
    setStep(1);
    setProposal(null);
    setProposeError(null);
    try {
      const result = await proposeMutation.mutateAsync({
        data: {
          axisId: effectiveAxisId,
          newName: renameTo.trim(),
          newDescription: newDescription.trim() ? newDescription.trim() : null,
        },
      });
      setProposal(result);
      const initial: Record<string, boolean> = {};
      result.proposals.forEach((p) => (initial[p.docId] = true));
      setDecisions(initial);
    } catch {
      setProposeError(W.proposeError);
    }
  }

  async function finishWizard() {
    if (!proposal) return;
    setApplying(true);
    setApplyError(null);
    try {
      const result = await applyMutation.mutateAsync({
        data: {
          actor: W.actor,
          note: W.applyNote(proposal.fromName, proposal.toName),
          axisEdit: {
            axisId: proposal.axisId,
            name: proposal.toName,
            description: newDescription.trim() ? newDescription.trim() : null,
          },
          decisions: proposal.proposals.map((p) => ({
            docId: p.docId,
            accept: decisions[p.docId] !== false,
            axisIds: p.proposedAxisIds,
            topics: p.proposedTopics,
          })),
        },
      });
      setLastApplied(result);
      runReclassification(
        W.reclassifiedDetail(
          proposal.fromName,
          proposal.toName,
          result.version,
          result.appliedCount,
          result.rejectedCount,
        ),
      );
      await Promise.all([refetchAxes(), refetchTaxonomy()]);
      setWizardOpen(false);
      resetWizard();
    } catch {
      setApplyError(W.applyError);
    } finally {
      setApplying(false);
    }
  }

  const stepLabels = W.steps;

  const proposing = proposeMutation.isPending;

  return (
    <Stack space={24}>
      <div
        style={{
          backgroundColor: skinVars.colors.navigationBarBackground,
          borderRadius: skinVars.borderRadii.container,
        }}
      >
        <Box padding={24}>
          <Stack space={16}>
            <Inline space="between" alignItems="center">
              <Inline space={8} alignItems="center">
                <IconWorldDeviceRegular size={20} color={skinVars.colors.inverse} />
                <Text3 medium color={skinVars.colors.textPrimaryInverse}>
                  {G.bannerTitle}
                </Text3>
              </Inline>
              <Inline space={12} alignItems="center">
                {taxonomy && (
                  <Tag type="info">{G.taxonomyVersion(taxonomy.activeVersion)}</Tag>
                )}
                <ButtonSecondary
                  small
                  onPress={() => {
                    resetWizard();
                    setWizardOpen(true);
                  }}
                >
                  {G.reclassify}
                </ButtonSecondary>
              </Inline>
            </Inline>
            <Text2 regular color={skinVars.colors.textSecondaryInverse}>
              {G.bannerDesc}
            </Text2>
          </Stack>
        </Box>
      </div>

      {lastApplied && (
        <Callout
          asset={<IconShieldRegular color={skinVars.colors.success} />}
          title={G.liveTitle(lastApplied.version)}
          description={G.liveDesc(lastApplied.appliedCount, lastApplied.rejectedCount, lastApplied.qdrant)}
        />
      )}

      <Grid columns={3} gap={12}>
        {axes?.map((axis, i) => (
          <GridItem key={axis.id}>
            <div
              style={{
                backgroundColor: applyAlpha(axis.color, 0.1),
                borderRadius: skinVars.borderRadii.container,
                border: `1px solid ${applyAlpha(axis.color, 0.3)}`,
                height: "100%",
              }}
            >
              <Box padding={16}>
                <Stack space={4}>
                  <Inline space="between" alignItems="center">
                    <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                      {G.axis(i + 1)}
                    </Text1>
                    <IconWorldDeviceRegular size={16} color={axis.color} />
                  </Inline>
                  <Text2 medium color={skinVars.colors.textPrimary}>
                    {axis.name}
                  </Text2>
                  {axis.description && (
                    <Text1 regular color={skinVars.colors.textSecondary}>
                      {axis.description}
                    </Text1>
                  )}
                </Stack>
              </Box>
            </div>
          </GridItem>
        ))}
      </Grid>

      {taxonomy && taxonomy.versions.length > 0 && (
        <Stack space={16}>
          <Inline space={8} alignItems="center">
            <IconListRegular size={20} color={skinVars.colors.brand} />
            <Title2>{G.historyTitle}</Title2>
          </Inline>
          <Text2 regular color={skinVars.colors.textSecondary}>
            {G.historyDesc}
          </Text2>
          <Table
            heading={G.historyHeadings}
            columnTextAlign={["left", "left", "left", "left", "right"]}
            content={[...taxonomy.versions]
              .sort((a, b) => b.version - a.version)
              .map((v) => [
                <Tag
                  type={v.version === taxonomy.activeVersion ? "success" : "inactive"}
                  key={`${v.version}-v`}
                >
                  {v.version === taxonomy.activeVersion ? G.versionActive(v.version) : G.version(v.version)}
                </Tag>,
                <Text2 regular color={skinVars.colors.textPrimary} key={`${v.version}-w`}>
                  {formatDate(v.createdAt, lang)}
                </Text2>,
                <Text2 regular color={skinVars.colors.textSecondary} key={`${v.version}-a`}>
                  {v.actor}
                </Text2>,
                <Text2 regular color={skinVars.colors.textSecondary} key={`${v.version}-c`}>
                  {v.note}
                </Text2>,
                <Text2 medium color={skinVars.colors.textPrimary} key={`${v.version}-n`}>
                  {String(v.retaggedCount)}
                </Text2>,
              ])}
          />
        </Stack>
      )}

      <Stack space={16}>
        <Inline space="between" alignItems="center">
          <Inline space={8} alignItems="center">
            <IconTimeRegular size={20} color={skinVars.colors.brand} />
            <Title2>{G.freshnessTitle}</Title2>
          </Inline>
          <Inline space={12} alignItems="center">
            <Text2 regular color={skinVars.colors.textSecondary}>
              {G.withinSla(compliancePct)}
            </Text2>
            <div style={{ width: 128 }}>
              <ProgressBar progressPercent={compliancePct} color={skinVars.colors.success} />
            </div>
          </Inline>
        </Inline>

        <Text2 regular color={skinVars.colors.textSecondary}>
          {G.freshnessDesc}
        </Text2>

        {overdue.length > 0 && (
          <Callout
            asset={<IconAlertRegular color={skinVars.colors.warning} />}
            title={G.pastSla(overdue.length)}
            description={G.dueRefresh}
          />
        )}

        <Table
          heading={G.freshnessHeadings}
          columnTextAlign={["left", "left", "left", "left", "right"]}
          content={(freshness ?? []).map((f) => [
            <Text2 medium color={skinVars.colors.textPrimary} key={`${f.docId}-t`}>
              {f.title}
            </Text2>,
            <Text2 regular color={skinVars.colors.textSecondary} key={`${f.docId}-o`}>
              {f.owner}
            </Text2>,
            <Text2 regular color={skinVars.colors.textPrimary} key={`${f.docId}-r`}>
              {formatDate(f.lastReviewed, lang)}
            </Text2>,
            <Text2 regular color={skinVars.colors.textSecondary} key={`${f.docId}-s`}>
              {G.everyMonths(f.slaMonths)}
            </Text2>,
            <Inline space={0} alignItems="center" key={`${f.docId}-st`}>
              <Tag type={f.overdue ? "warning" : "success"}>
                {G.monthsStatus(f.monthsSinceReview, f.overdue)}
              </Tag>
            </Inline>,
          ])}
        />
      </Stack>

      {wizardOpen && (
        <Drawer
          title={W.title}
          description={W.desc}
          onClose={() => setWizardOpen(false)}
          onDismiss={() => setWizardOpen(false)}
          button={
            step === 0
              ? {
                  text: W.continue,
                  onPress: () => void startProposal(),
                  disabled: renameTo.trim().length === 0 || !selectedAxis,
                }
              : step < 3
                ? {
                    text: W.continue,
                    onPress: () => setStep((s) => (s + 1) as Step),
                    disabled: proposing || !proposal,
                  }
                : {
                    text: applying ? W.applying : W.confirmApply,
                    onPress: () => void finishWizard(),
                    disabled: applying || !proposal,
                  }
          }
          secondaryButton={
            step > 0
              ? {
                  text: W.back,
                  onPress: () => setStep((s) => (s - 1) as Step),
                  disabled: applying,
                }
              : { text: W.cancel, onPress: () => setWizardOpen(false) }
          }
        >
          <Stack space={24}>
            <Inline space={8} alignItems="center">
              {stepLabels.map((label, i) => (
                <React.Fragment key={label}>
                  <Inline space={8} alignItems="center">
                    <Circle
                      size={24}
                      backgroundColor={i <= step ? skinVars.colors.brand : skinVars.colors.neutralLow}
                    >
                      <Text1
                        medium
                        color={
                          i <= step ? skinVars.colors.inverse : skinVars.colors.textSecondary
                        }
                      >
                        {i + 1}
                      </Text1>
                    </Circle>
                    <Text1
                      medium
                      color={i <= step ? skinVars.colors.textPrimary : skinVars.colors.textSecondary}
                    >
                      {label}
                    </Text1>
                  </Inline>
                  {i < 3 && (
                    <div style={{ flex: 1, height: 1, backgroundColor: skinVars.colors.divider }} />
                  )}
                </React.Fragment>
              ))}
            </Inline>

            <Divider />

            {step === 0 && (
              <Stack space={16}>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {W.step0Desc}
                </Text2>
                <Select
                  name="retag-axis"
                  label={W.axisToEdit}
                  value={effectiveAxisId}
                  onChangeValue={setAxisId}
                  options={(axes ?? []).map((a) => ({ value: a.id, text: a.name }))}
                  fullWidth
                />
                <TextField
                  name="renameTo"
                  label={W.newName}
                  value={renameTo}
                  onChangeValue={setRenameTo}
                  fullWidth
                />
                <TextField
                  name="newDescription"
                  label={W.newDescription}
                  value={newDescription}
                  onChangeValue={setNewDescription}
                  fullWidth
                />
              </Stack>
            )}

            {step === 1 && (
              <Stack space={12}>
                {proposing && (
                  <Stack space={12}>
                    <Text2 regular color={skinVars.colors.textSecondary}>
                      {W.building}
                    </Text2>
                    <ProgressBar progressPercent={66} color={skinVars.colors.brand} />
                  </Stack>
                )}
                {proposeError && (
                  <Callout
                    asset={<IconAlertRegular color={skinVars.colors.error} />}
                    title={W.proposalFailed}
                    description={proposeError}
                  />
                )}
                {proposal && (
                  <Stack space={12}>
                    <Text2 regular color={skinVars.colors.textSecondary}>
                      {W.affected(proposal.affectedCount, proposal.fromName)}
                    </Text2>
                    <Boxed>
                      <Box padding={16}>
                        <Inline space={12} alignItems="center">
                          <Text2 regular color={skinVars.colors.textSecondary}>
                            {proposal.fromName}
                          </Text2>
                          <IconArrowLineRightRegular size={16} color={skinVars.colors.brand} />
                          <Text2 medium color={skinVars.colors.textPrimary}>
                            {proposal.toName}
                          </Text2>
                        </Inline>
                      </Box>
                    </Boxed>
                  </Stack>
                )}
              </Stack>
            )}

            {step === 2 && proposal && (
              <Stack space={16}>
                <Inline space={12} alignItems="center">
                  <Circle size={56} backgroundColor={skinVars.colors.brandLow}>
                    <IconRefreshRegular size={28} color={skinVars.colors.brand} />
                  </Circle>
                  <Tag type={proposal.engine === "llm" ? "success" : "warning"}>
                    {proposal.engine === "llm"
                      ? W.engineLlm
                      : W.engineFallback}
                  </Tag>
                </Inline>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {proposal.engine === "llm"
                    ? W.engineLlmDesc(proposal.affectedCount)
                    : W.engineFallbackDesc(proposal.affectedCount)}
                </Text2>
                <Table
                  heading={W.proposalHeadings}
                  columnTextAlign={["left", "left", "right"]}
                  content={proposal.proposals.map((p) => [
                    <Text2 medium color={skinVars.colors.textPrimary} key={`${p.docId}-d`}>
                      {p.title}
                    </Text2>,
                    <Text1 regular color={skinVars.colors.textSecondary} key={`${p.docId}-r`}>
                      {p.rationale}
                    </Text1>,
                    <Tag
                      type={p.confidence >= 0.75 ? "success" : "warning"}
                      key={`${p.docId}-c`}
                    >
                      {`${Math.round(p.confidence * 100)}%`}
                    </Tag>,
                  ])}
                />
              </Stack>
            )}

            {step === 3 && proposal && (
              <Stack space={12}>
                <Callout
                  asset={<IconShieldRegular color={skinVars.colors.brand} />}
                  title={W.humanConfirmTitle}
                  description={W.humanConfirmDesc}
                />
                {applyError && (
                  <Callout
                    asset={<IconAlertRegular color={skinVars.colors.error} />}
                    title={W.applyFailed}
                    description={applyError}
                  />
                )}
                <Stack space={8}>
                  {proposal.proposals.map((p) => {
                    const keepsAxis = p.proposedAxisIds.includes(proposal.axisId);
                    return (
                      <Boxed key={p.docId}>
                        <Box padding={12}>
                          <Inline space={12} alignItems="center">
                            <Checkbox
                              name={`accept-${p.docId}`}
                              checked={decisions[p.docId] !== false}
                              onChange={(checked) =>
                                setDecisions((prev) => ({ ...prev, [p.docId]: checked }))
                              }
                            />
                            <Stack space={2}>
                              <Text2 medium color={skinVars.colors.textPrimary}>
                                {p.title}
                              </Text2>
                              <Text1 regular color={skinVars.colors.textSecondary}>
                                {keepsAxis
                                  ? W.staysUnder(proposal.toName)
                                  : W.leaves(proposal.toName)}{" "}
                                · {p.rationale}
                              </Text1>
                            </Stack>
                          </Inline>
                        </Box>
                      </Boxed>
                    );
                  })}
                </Stack>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {W.accepted(acceptedCount, proposal.proposals.length)}
                </Text2>
              </Stack>
            )}
          </Stack>
        </Drawer>
      )}
    </Stack>
  );
}
