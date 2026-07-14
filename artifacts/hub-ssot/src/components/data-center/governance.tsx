import React from "react";
import {
  useListAxes,
  useListDocumentFreshness,
  useGetTaxonomyState,
  useProposeRetag,
  useApplyRetag,
  useRollbackTaxonomy,
  useListAxisAffectedDocuments,
  getListAxisAffectedDocumentsQueryKey,
  RetagProposeResult,
  RetagApplyResult,
  TaxonomyAxisOp,
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
  ButtonPrimary,
  ButtonSecondary,
  ButtonDanger,
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
type RetagKind = "rename" | "split" | "merge";

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
  const rollbackMutation = useRollbackTaxonomy();
  const { runReclassification } = useDataCenter();

  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>(0);
  const [kind, setKind] = React.useState<RetagKind>("rename");
  const [axisId, setAxisId] = React.useState("");
  const [renameTo, setRenameTo] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [splitName, setSplitName] = React.useState("");
  const [splitDescription, setSplitDescription] = React.useState("");
  const [mergeTargetId, setMergeTargetId] = React.useState("");
  const [proposal, setProposal] = React.useState<RetagProposeResult | null>(null);
  const [proposeError, setProposeError] = React.useState<string | null>(null);
  const [decisions, setDecisions] = React.useState<Record<string, boolean>>({});
  const [applying, setApplying] = React.useState(false);
  const [applyError, setApplyError] = React.useState<string | null>(null);
  const [lastApplied, setLastApplied] = React.useState<RetagApplyResult | null>(null);
  const [revertTarget, setRevertTarget] = React.useState<number | null>(null);
  const [reverting, setReverting] = React.useState(false);
  const [revertError, setRevertError] = React.useState<string | null>(null);
  const [lastRevert, setLastRevert] = React.useState<null | {
    toVersion: number;
    newVersion: number;
    docs: number;
    qdrant?: { updatedDocs: number; pointsBefore: number; pointsAfter: number } | null;
  }>(null);

  const overdue = React.useMemo(() => (freshness ?? []).filter((f) => f.overdue), [freshness]);
  const onTrack = (freshness?.length ?? 0) - overdue.length;
  const compliancePct = freshness?.length ? Math.round((onTrack / freshness.length) * 100) : 100;

  const activeAxes = axes ?? [];
  const allAxes = taxonomy?.axes ?? activeAxes;
  const effectiveAxisId = axisId || (activeAxes.length > 0 ? activeAxes[0].id : "");
  const selectedAxis = activeAxes.find((a) => a.id === effectiveAxisId);
  const mergeCandidates = activeAxes.filter((a) => a.id !== effectiveAxisId);
  const effectiveMergeTargetId =
    mergeTargetId && mergeTargetId !== effectiveAxisId
      ? mergeTargetId
      : mergeCandidates.length > 0
        ? mergeCandidates[0].id
        : "";
  const acceptedCount = proposal
    ? proposal.proposals.filter((p) => decisions[p.docId] !== false).length
    : 0;

  const axisNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    allAxes.forEach((a) => map.set(a.id, a.name));
    activeAxes.forEach((a) => map.set(a.id, a.name));
    if (proposal?.newAxis) map.set(proposal.newAxis.id, proposal.newAxis.name);
    return map;
  }, [allAxes, activeAxes, proposal]);

  const affectedQuery = useListAxisAffectedDocuments(effectiveAxisId, {
    query: {
      queryKey: getListAxisAffectedDocumentsQueryKey(effectiveAxisId),
      enabled: wizardOpen && step === 1 && effectiveAxisId.length > 0,
    },
  });
  const affected = affectedQuery.data;

  function resetWizard() {
    setStep(0);
    setKind("rename");
    setAxisId("");
    setRenameTo("");
    setNewDescription("");
    setSplitName("");
    setSplitDescription("");
    setMergeTargetId("");
    setProposal(null);
    setProposeError(null);
    setDecisions({});
    setApplyError(null);
  }

  const continueDisabled =
    !selectedAxis ||
    (kind === "rename" && renameTo.trim().length === 0) ||
    (kind === "split" && (renameTo.trim().length === 0 || splitName.trim().length === 0)) ||
    (kind === "merge" && effectiveMergeTargetId.length === 0);

  async function startProposal() {
    setStep(1);
    setProposal(null);
    setProposeError(null);
    try {
      const result = await proposeMutation.mutateAsync({
        data: {
          axisId: effectiveAxisId,
          kind,
          newName: kind === "merge" ? (selectedAxis?.name ?? "") : renameTo.trim(),
          newDescription: newDescription.trim() ? newDescription.trim() : null,
          splitNewAxisName: kind === "split" ? splitName.trim() : null,
          splitNewAxisDescription:
            kind === "split" && splitDescription.trim() ? splitDescription.trim() : null,
          mergeIntoAxisId: kind === "merge" ? effectiveMergeTargetId : null,
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

  function proposalRowLabel(p: { proposedAxisIds: string[] }): string {
    if (!proposal) return "";
    const pKind = (proposal.kind ?? "rename") as RetagKind;
    if (pKind === "split" && proposal.newAxis) {
      const inOriginal = p.proposedAxisIds.includes(proposal.axisId);
      const inNew = p.proposedAxisIds.includes(proposal.newAxis.id);
      if (inOriginal && inNew) return W.bothUnder(proposal.toName, proposal.newAxis.name);
      if (inNew) return W.movedTo(proposal.newAxis.name);
      if (inOriginal) return W.staysUnder(proposal.toName);
      return W.leaves(proposal.fromName);
    }
    if (pKind === "merge") {
      const targetName = proposal.mergeIntoName ?? proposal.toName;
      if (proposal.mergeIntoAxisId && p.proposedAxisIds.includes(proposal.mergeIntoAxisId)) {
        return W.movedTo(targetName);
      }
      return W.leaves(proposal.fromName);
    }
    return p.proposedAxisIds.includes(proposal.axisId)
      ? W.staysUnder(proposal.toName)
      : W.leaves(proposal.toName);
  }

  async function finishWizard() {
    if (!proposal) return;
    const pKind = (proposal.kind ?? "rename") as RetagKind;
    setApplying(true);
    setApplyError(null);
    try {
      const axisOps: TaxonomyAxisOp[] | undefined =
        pKind === "split" && proposal.newAxis
          ? [{ op: "create", axis: proposal.newAxis }]
          : pKind === "merge"
            ? [{ op: "retire", axisId: proposal.axisId }]
            : undefined;
      const note =
        pKind === "split" && proposal.newAxis
          ? W.applyNoteSplit(proposal.fromName, proposal.toName, proposal.newAxis.name)
          : pKind === "merge"
            ? W.applyNoteMerge(proposal.fromName, proposal.mergeIntoName ?? proposal.toName)
            : W.applyNote(proposal.fromName, proposal.toName);
      const result = await applyMutation.mutateAsync({
        data: {
          actor: W.actor,
          note,
          kind: pKind,
          axisEdit:
            pKind === "merge"
              ? null
              : {
                  axisId: proposal.axisId,
                  name: proposal.toName,
                  description: newDescription.trim() ? newDescription.trim() : null,
                },
          axisOps,
          decisions: proposal.proposals.map((p) => ({
            docId: p.docId,
            accept: decisions[p.docId] !== false,
            axisIds: p.proposedAxisIds,
            topics: p.proposedTopics,
          })),
        },
      });
      setLastRevert(null);
      setLastApplied(result);
      const detailTo =
        pKind === "split" && proposal.newAxis
          ? `${proposal.toName} + ${proposal.newAxis.name}`
          : pKind === "merge"
            ? (proposal.mergeIntoName ?? proposal.toName)
            : proposal.toName;
      runReclassification(
        W.reclassifiedDetail(
          proposal.fromName,
          detailTo,
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

  async function confirmRevert() {
    if (revertTarget === null) return;
    setReverting(true);
    setRevertError(null);
    try {
      const result = await rollbackMutation.mutateAsync({
        data: { toVersion: revertTarget, actor: W.actor },
      });
      setLastApplied(null);
      setLastRevert({
        toVersion: result.toVersion,
        newVersion: result.version,
        docs: result.revertedDocs,
        qdrant: result.qdrant,
      });
      runReclassification(G.revertedDetail(result.toVersion, result.version, result.revertedDocs));
      await Promise.all([refetchAxes(), refetchTaxonomy()]);
      setRevertTarget(null);
    } catch {
      setRevertError(G.revertError);
    } finally {
      setReverting(false);
    }
  }

  const stepLabels = W.steps;
  const proposing = proposeMutation.isPending;

  const lastAppliedDescription = lastApplied
    ? `${G.liveDesc(lastApplied.appliedCount, lastApplied.rejectedCount, lastApplied.qdrant)}${
        lastApplied.proof
          ? ` ${G.proofSummary({
              embedCallsDelta: lastApplied.proof.embedCallsDelta,
              hashesIdentical: lastApplied.proof.vectorHashes.every((h) => h.identical),
              checksPassed: lastApplied.proof.filterChecks.filter((c) => c.passed).length,
              checksTotal: lastApplied.proof.filterChecks.length,
            })}`
          : ""
      }`
    : "";

  const sortedVersions = taxonomy ? [...taxonomy.versions].sort((a, b) => b.version - a.version) : [];

  function kindLabelFor(k: string | null | undefined): string | null {
    if (k === "rename") return G.kindLabels.rename;
    if (k === "split") return G.kindLabels.split;
    if (k === "merge") return G.kindLabels.merge;
    if (k === "rollback") return G.kindLabels.rollback;
    return null;
  }

  function historyRow(
    version: number,
    when: string | null,
    actor: string,
    kindKey: string | null | undefined,
    note: string,
    retagged: string,
  ) {
    const isActive = taxonomy != null && version === taxonomy.activeVersion;
    const canRevert = taxonomy != null && version < taxonomy.activeVersion;
    const kindLabel = kindLabelFor(kindKey);
    return [
      <Tag type={isActive ? "success" : "inactive"} key={`${version}-v`}>
        {isActive ? G.versionActive(version) : G.version(version)}
      </Tag>,
      <Text2 regular color={skinVars.colors.textPrimary} key={`${version}-w`}>
        {when ? formatDate(when, lang) : "—"}
      </Text2>,
      <Text2 regular color={skinVars.colors.textSecondary} key={`${version}-a`}>
        {actor}
      </Text2>,
      <Inline space={8} alignItems="center" key={`${version}-c`}>
        {kindLabel && <Tag type="info">{kindLabel}</Tag>}
        <Text2 regular color={skinVars.colors.textSecondary}>
          {note}
        </Text2>
      </Inline>,
      <Text2 medium color={skinVars.colors.textPrimary} key={`${version}-n`}>
        {retagged}
      </Text2>,
      canRevert ? (
        <ButtonSecondary
          small
          key={`${version}-r`}
          onPress={() => {
            setRevertError(null);
            setRevertTarget(version);
          }}
        >
          {G.revert}
        </ButtonSecondary>
      ) : (
        <Text2 regular color={skinVars.colors.textSecondary} key={`${version}-r`}>
          {""}
        </Text2>
      ),
    ];
  }

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
          description={lastAppliedDescription}
        />
      )}

      {lastRevert && (
        <Callout
          asset={<IconRefreshRegular color={skinVars.colors.success} />}
          title={G.liveTitle(lastRevert.newVersion)}
          description={G.revertedDetail(lastRevert.toVersion, lastRevert.newVersion, lastRevert.docs)}
        />
      )}

      <Grid columns={3} gap={12}>
        {allAxes.map((axis, i) => (
          <GridItem key={axis.id}>
            <div
              style={{
                backgroundColor: applyAlpha(axis.color, axis.retired ? 0.04 : 0.1),
                borderRadius: skinVars.borderRadii.container,
                border: `1px solid ${applyAlpha(axis.color, axis.retired ? 0.15 : 0.3)}`,
                height: "100%",
                opacity: axis.retired ? 0.75 : 1,
              }}
            >
              <Box padding={16}>
                <Stack space={4}>
                  <Inline space="between" alignItems="center">
                    <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                      {G.axis(i + 1)}
                    </Text1>
                    <Inline space={8} alignItems="center">
                      {axis.retired && <Tag type="inactive">{G.axisRetired}</Tag>}
                      <IconWorldDeviceRegular size={16} color={axis.color} />
                    </Inline>
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

      {taxonomy && (
        <Stack space={16}>
          <Inline space={8} alignItems="center">
            <IconListRegular size={20} color={skinVars.colors.brand} />
            <Title2>{G.historyTitle}</Title2>
          </Inline>
          <Text2 regular color={skinVars.colors.textSecondary}>
            {G.historyDesc}
          </Text2>
          {revertTarget !== null && (
            <Boxed>
              <Box padding={16}>
                <Stack space={12}>
                  <Text2 medium color={skinVars.colors.textPrimary}>
                    {G.revertConfirmTitle(revertTarget)}
                  </Text2>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {G.revertConfirmDesc}
                  </Text2>
                  {revertError && (
                    <Callout
                      asset={<IconAlertRegular color={skinVars.colors.error} />}
                      title={G.revertError}
                      description={revertError}
                    />
                  )}
                  <Inline space={12}>
                    <ButtonDanger small onPress={() => void confirmRevert()} disabled={reverting}>
                      {reverting ? W.applying : G.revertConfirm}
                    </ButtonDanger>
                    <ButtonSecondary
                      small
                      onPress={() => setRevertTarget(null)}
                      disabled={reverting}
                    >
                      {G.revertCancel}
                    </ButtonSecondary>
                  </Inline>
                </Stack>
              </Box>
            </Boxed>
          )}
          <Table
            heading={G.historyHeadings}
            columnTextAlign={["left", "left", "left", "left", "right", "right"]}
            content={[
              ...sortedVersions.map((v) =>
                historyRow(
                  v.version,
                  v.createdAt,
                  v.actor,
                  v.kind ?? "rename",
                  v.note,
                  String(v.retaggedCount),
                ),
              ),
              historyRow(taxonomy.seedVersion, null, G.seedActor, null, G.seedNote, "—"),
            ]}
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
                  name="retag-kind"
                  label={W.kindLabel}
                  value={kind}
                  onChangeValue={(v) => setKind(v as RetagKind)}
                  options={[
                    { value: "rename", text: W.kindRename },
                    { value: "split", text: W.kindSplit },
                    { value: "merge", text: W.kindMerge },
                  ]}
                  fullWidth
                />
                <Select
                  name="retag-axis"
                  label={W.axisToEdit}
                  value={effectiveAxisId}
                  onChangeValue={setAxisId}
                  options={activeAxes.map((a) => ({ value: a.id, text: a.name }))}
                  fullWidth
                />
                {kind !== "merge" && (
                  <TextField
                    name="renameTo"
                    label={W.newName}
                    value={renameTo}
                    onChangeValue={setRenameTo}
                    fullWidth
                  />
                )}
                {kind !== "merge" && (
                  <TextField
                    name="newDescription"
                    label={W.newDescription}
                    value={newDescription}
                    onChangeValue={setNewDescription}
                    fullWidth
                  />
                )}
                {kind === "split" && (
                  <TextField
                    name="splitName"
                    label={W.splitNewAxisName}
                    value={splitName}
                    onChangeValue={setSplitName}
                    fullWidth
                  />
                )}
                {kind === "split" && (
                  <TextField
                    name="splitDescription"
                    label={W.splitNewAxisDescription}
                    value={splitDescription}
                    onChangeValue={setSplitDescription}
                    fullWidth
                  />
                )}
                {kind === "merge" && (
                  <Select
                    name="mergeInto"
                    label={W.mergeInto}
                    value={effectiveMergeTargetId}
                    onChangeValue={setMergeTargetId}
                    options={mergeCandidates.map((a) => ({ value: a.id, text: a.name }))}
                    fullWidth
                  />
                )}
              </Stack>
            )}

            {step === 1 && (
              <Stack space={16}>
                <Stack space={8}>
                  <Inline space={8} alignItems="center">
                    <Text2 medium color={skinVars.colors.textPrimary}>
                      {W.liveMappingTitle}
                    </Text2>
                    {affected && (
                      <Tag type={affected.source === "qdrant" ? "success" : "warning"}>
                        {affected.source === "qdrant" ? W.liveFromQdrant : W.liveFromMemory}
                      </Tag>
                    )}
                    {affected && affected.qdrantDocCount !== null && (
                      <Tag type={affected.countsMatch ? "success" : "error"}>
                        {affected.countsMatch ? W.countsMatch : W.countsMismatch}
                      </Tag>
                    )}
                  </Inline>
                  {affected && (
                    <Text2 regular color={skinVars.colors.textSecondary}>
                      {W.liveCounts(
                        affected.memoryDocCount,
                        affected.qdrantDocCount,
                        affected.totalPoints,
                      )}
                    </Text2>
                  )}
                </Stack>
                {affected && affected.docs.length > 0 && (
                  <Table
                    heading={W.mappingHeadings}
                    columnTextAlign={["left", "left", "right"]}
                    content={affected.docs.map((d) => [
                      <Text2 medium color={skinVars.colors.textPrimary} key={`${d.docId}-t`}>
                        {d.title}
                      </Text2>,
                      <Text1 regular color={skinVars.colors.textSecondary} key={`${d.docId}-a`}>
                        {d.axisIds.map((id) => axisNameById.get(id) ?? id).join(" · ")}
                      </Text1>,
                      <Text2 medium color={skinVars.colors.textPrimary} key={`${d.docId}-p`}>
                        {String(d.pointCount)}
                      </Text2>,
                    ])}
                  />
                )}
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {W.sparseNote}
                </Text1>
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
                        {(proposal.kind ?? "rename") === "split" && proposal.newAxis ? (
                          <Text2 regular color={skinVars.colors.textSecondary}>
                            {W.splitPreview(proposal.toName, proposal.newAxis.name)}
                          </Text2>
                        ) : (proposal.kind ?? "rename") === "merge" ? (
                          <Text2 regular color={skinVars.colors.textSecondary}>
                            {W.mergePreview(
                              proposal.fromName,
                              proposal.mergeIntoName ?? proposal.toName,
                            )}
                          </Text2>
                        ) : (
                          <Inline space={12} alignItems="center">
                            <Text2 regular color={skinVars.colors.textSecondary}>
                              {proposal.fromName}
                            </Text2>
                            <IconArrowLineRightRegular size={16} color={skinVars.colors.brand} />
                            <Text2 medium color={skinVars.colors.textPrimary}>
                              {proposal.toName}
                            </Text2>
                          </Inline>
                        )}
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
                  {proposal.proposals.map((p) => (
                    <Boxed key={p.docId}>
                      <Box padding={12}>
                        <Checkbox
                          name={`accept-${p.docId}`}
                          checked={decisions[p.docId] !== false}
                          onChange={(checked) =>
                            setDecisions((prev) => ({ ...prev, [p.docId]: checked }))
                          }
                          dataAttributes={{ testid: `accept-${p.docId}` }}
                        >
                          <Stack space={2}>
                            <Text2 medium color={skinVars.colors.textPrimary}>
                              {p.title}
                            </Text2>
                            <Text1 regular color={skinVars.colors.textSecondary}>
                              {proposalRowLabel(p)} · {p.rationale}
                            </Text1>
                          </Stack>
                        </Checkbox>
                      </Box>
                    </Boxed>
                  ))}
                </Stack>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {W.accepted(acceptedCount, proposal.proposals.length)}
                </Text2>
              </Stack>
            )}

            {/* Mística Drawer action buttons always close the drawer before
                running onPress (close().then(onPress)), which would kill a
                multi-step wizard — so the step navigation lives in the
                content instead. */}
            <Divider />
            <Inline space={16} alignItems="center">
              {step === 0 ? (
                <ButtonPrimary
                  small
                  onPress={() => void startProposal()}
                  disabled={continueDisabled}
                >
                  {W.continue}
                </ButtonPrimary>
              ) : step < 3 ? (
                <ButtonPrimary
                  small
                  onPress={() => setStep((s) => (s + 1) as Step)}
                  disabled={proposing || !proposal}
                >
                  {W.continue}
                </ButtonPrimary>
              ) : (
                <ButtonPrimary
                  small
                  onPress={() => void finishWizard()}
                  disabled={applying || !proposal}
                >
                  {applying ? W.applying : W.confirmApply}
                </ButtonPrimary>
              )}
              {step > 0 ? (
                <ButtonSecondary
                  small
                  onPress={() => setStep((s) => (s - 1) as Step)}
                  disabled={applying}
                >
                  {W.back}
                </ButtonSecondary>
              ) : (
                <ButtonSecondary small onPress={() => setWizardOpen(false)}>
                  {W.cancel}
                </ButtonSecondary>
              )}
            </Inline>
          </Stack>
        </Drawer>
      )}
    </Stack>
  );
}
