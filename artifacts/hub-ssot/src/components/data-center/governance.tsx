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

type Step = 0 | 1 | 2 | 3;

export default function GovernanceArea() {
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
      setProposeError(
        "The re-tagging engine could not produce proposals. Nothing has been changed.",
      );
    }
  }

  async function finishWizard() {
    if (!proposal) return;
    setApplying(true);
    setApplyError(null);
    try {
      const result = await applyMutation.mutateAsync({
        data: {
          actor: "You (documentalist)",
          note: `Renamed "${proposal.fromName}" to "${proposal.toName}" and re-classified the affected documents.`,
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
        `Renamed "${proposal.fromName}" to "${proposal.toName}". Applied taxonomy version ${result.version}: ${result.appliedCount} accepted, ${result.rejectedCount} rejected by human review — no re-embedding, no redeploy.`,
      );
      await Promise.all([refetchAxes(), refetchTaxonomy()]);
      setWizardOpen(false);
      resetWizard();
    } catch {
      setApplyError("The taxonomy version could not be applied. Nothing has been changed.");
    } finally {
      setApplying(false);
    }
  }

  const stepLabels = [
    "Edit taxonomy",
    "Review mapping",
    "Assisted re-classify",
    "Human validation",
  ];

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
                  Taxonomy is configuration, not code
                </Text3>
              </Inline>
              <Inline space={12} alignItems="center">
                {taxonomy && (
                  <Tag type="info">{`Taxonomy v${taxonomy.activeVersion}`}</Tag>
                )}
                <ButtonSecondary
                  small
                  onPress={() => {
                    resetWizard();
                    setWizardOpen(true);
                  }}
                >
                  Re-classify
                </ButtonSecondary>
              </Inline>
            </Inline>
            <Text2 regular color={skinVars.colors.textSecondaryInverse}>
              The strategic axes below are the shared vocabulary every document is mapped to. When
              the strategy shifts, a documentalist updates the taxonomy and re-classifies the corpus
              against it — a governed configuration change, not an engineering release. No
              re-embedding, no IT ticket, no redeploy.
            </Text2>
          </Stack>
        </Box>
      </div>

      {lastApplied && (
        <Callout
          asset={<IconShieldRegular color={skinVars.colors.success} />}
          title={`Taxonomy version ${lastApplied.version} is live`}
          description={`${lastApplied.appliedCount} document${lastApplied.appliedCount === 1 ? "" : "s"} re-tagged, ${lastApplied.rejectedCount} proposal${lastApplied.rejectedCount === 1 ? "" : "s"} rejected by human review. The change took effect immediately across retrieval and browsing.`}
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
                      Axis {i + 1}
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
            <Title2>Taxonomy version history</Title2>
          </Inline>
          <Text2 regular color={skinVars.colors.textSecondary}>
            Every applied re-classification is a persisted, versioned configuration change with an
            actor and a note — the audit trail of the vocabulary itself.
          </Text2>
          <Table
            heading={["Version", "When", "Actor", "Change", "Documents re-tagged"]}
            columnTextAlign={["left", "left", "left", "left", "right"]}
            content={[...taxonomy.versions]
              .sort((a, b) => b.version - a.version)
              .map((v) => [
                <Tag
                  type={v.version === taxonomy.activeVersion ? "success" : "inactive"}
                  key={`${v.version}-v`}
                >
                  {`v${v.version}${v.version === taxonomy.activeVersion ? " · active" : ""}`}
                </Tag>,
                <Text2 regular color={skinVars.colors.textPrimary} key={`${v.version}-w`}>
                  {formatDate(v.createdAt)}
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
            <Title2>Freshness and review SLA</Title2>
          </Inline>
          <Inline space={12} alignItems="center">
            <Text2 regular color={skinVars.colors.textSecondary}>
              {compliancePct}% within SLA
            </Text2>
            <div style={{ width: 128 }}>
              <ProgressBar progressPercent={compliancePct} color={skinVars.colors.success} />
            </div>
          </Inline>
        </Inline>

        <Text2 regular color={skinVars.colors.textSecondary}>
          Every governed document carries a review SLA. Once it lapses, the document is flagged for a
          refresh so answers are never quietly built on stale ground — the honest "historic source"
          state depends on this discipline.
        </Text2>

        {overdue.length > 0 && (
          <Callout
            asset={<IconAlertRegular color={skinVars.colors.warning} />}
            title={`${overdue.length} ${overdue.length === 1 ? "document is" : "documents are"} past review SLA`}
            description="These are due a refresh."
          />
        )}

        <Table
          heading={["Document", "Owner", "Last reviewed", "SLA", "Status"]}
          columnTextAlign={["left", "left", "left", "left", "right"]}
          content={(freshness ?? []).map((f) => [
            <Text2 medium color={skinVars.colors.textPrimary} key={`${f.docId}-t`}>
              {f.title}
            </Text2>,
            <Text2 regular color={skinVars.colors.textSecondary} key={`${f.docId}-o`}>
              {f.owner}
            </Text2>,
            <Text2 regular color={skinVars.colors.textPrimary} key={`${f.docId}-r`}>
              {formatDate(f.lastReviewed)}
            </Text2>,
            <Text2 regular color={skinVars.colors.textSecondary} key={`${f.docId}-s`}>
              every {f.slaMonths} mo
            </Text2>,
            <Inline space={0} alignItems="center" key={`${f.docId}-st`}>
              <Tag type={f.overdue ? "warning" : "success"}>
                {`${f.monthsSinceReview} mo · ${f.overdue ? "overdue" : "on track"}`}
              </Tag>
            </Inline>,
          ])}
        />
      </Stack>

      {wizardOpen && (
        <Drawer
          title="Re-classify against the taxonomy"
          description="A four-step governed change. Nothing is re-embedded or redeployed — the taxonomy is edited, the corpus is re-classified against it with model assistance, and a human validates every proposal before it becomes a new persisted version."
          onClose={() => setWizardOpen(false)}
          button={
            step === 0
              ? {
                  text: "Continue",
                  onPress: () => void startProposal(),
                  disabled: renameTo.trim().length === 0 || !selectedAxis,
                }
              : step < 3
                ? {
                    text: "Continue",
                    onPress: () => setStep((s) => (s + 1) as Step),
                    disabled: proposing || !proposal,
                  }
                : {
                    text: applying ? "Applying…" : "Confirm and apply",
                    onPress: () => void finishWizard(),
                    disabled: applying || !proposal,
                  }
          }
          secondaryButton={
            step > 0
              ? {
                  text: "Back",
                  onPress: () => setStep((s) => (s - 1) as Step),
                  disabled: applying,
                }
              : { text: "Cancel", onPress: () => setWizardOpen(false) }
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
                  Rename or refine a strategic axis. This mirrors a strategy shift — for example
                  folding a legacy theme into a current strategic axis.
                </Text2>
                <Select
                  name="retag-axis"
                  label="Axis to edit"
                  value={effectiveAxisId}
                  onChangeValue={setAxisId}
                  options={(axes ?? []).map((a) => ({ value: a.id, text: a.name }))}
                  fullWidth
                />
                <TextField
                  name="renameTo"
                  label="New name"
                  value={renameTo}
                  onChangeValue={setRenameTo}
                  fullWidth
                />
                <TextField
                  name="newDescription"
                  label="New description (optional)"
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
                      Building the mapping table and asking the engine to re-classify each affected
                      document against the edited axis…
                    </Text2>
                    <ProgressBar progressPercent={66} color={skinVars.colors.brand} />
                  </Stack>
                )}
                {proposeError && (
                  <Callout
                    asset={<IconAlertRegular color={skinVars.colors.error} />}
                    title="Proposal failed"
                    description={proposeError}
                  />
                )}
                {proposal && (
                  <Stack space={12}>
                    <Text2 regular color={skinVars.colors.textSecondary}>
                      {proposal.affectedCount}{" "}
                      {proposal.affectedCount === 1 ? "document currently maps" : "documents currently map"}{" "}
                      to "{proposal.fromName}". They will be reviewed against the new definition.
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
                      ? "Model-assisted zero-shot"
                      : "Deterministic fallback"}
                  </Tag>
                </Inline>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {proposal.engine === "llm"
                    ? `The engine classified each of the ${proposal.affectedCount} affected documents zero-shot against the edited axis. Existing embeddings are reused — this is a metadata re-mapping, not a re-index.`
                    : `The model was unavailable, so each of the ${proposal.affectedCount} affected documents keeps its current mapping under the renamed label — clearly labelled, never silent. A human still validates every row.`}
                </Text2>
                <Table
                  heading={["Document", "Proposal", "Confidence"]}
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
                  title="A human confirms every re-classification before it becomes live"
                  description="Untick any proposal to reject it — rejected documents keep their current tags. Nothing is applied automatically."
                />
                {applyError && (
                  <Callout
                    asset={<IconAlertRegular color={skinVars.colors.error} />}
                    title="Apply failed"
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
                                  ? `Stays under "${proposal.toName}"`
                                  : `Leaves "${proposal.toName}"`}{" "}
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
                  {acceptedCount} of {proposal.proposals.length} proposals accepted. Confirm to
                  apply as a new persisted taxonomy version — the change takes effect immediately.
                </Text2>
              </Stack>
            )}
          </Stack>
        </Drawer>
      )}
    </Stack>
  );
}
