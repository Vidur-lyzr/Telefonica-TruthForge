import React from "react";
import { useListAxes, useListDocumentFreshness } from "@workspace/api-client-react";
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
  ButtonPrimary,
  ButtonSecondary,
  TextField,
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
} from "@telefonica/mistica";
import { useDataCenter } from "./state";
import { formatDate } from "./helpers";

type Step = 0 | 1 | 2 | 3;

export default function GovernanceArea() {
  const { data: axes } = useListAxes();
  const { data: freshness } = useListDocumentFreshness();
  const { reclassifyRuns, runReclassification } = useDataCenter();

  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>(0);
  const [renameFrom, setRenameFrom] = React.useState("");
  const [renameTo, setRenameTo] = React.useState("");

  const overdue = React.useMemo(() => (freshness ?? []).filter((f) => f.overdue), [freshness]);
  const onTrack = (freshness?.length ?? 0) - overdue.length;
  const compliancePct = freshness?.length ? Math.round((onTrack / freshness.length) * 100) : 100;

  const affectedCount = 42;

  function resetWizard() {
    setStep(0);
    setRenameFrom("");
    setRenameTo("");
  }

  function finishWizard() {
    runReclassification(
      `Renamed "${renameFrom || "a taxonomy label"}" to "${renameTo || "an updated label"}". Re-classified ${affectedCount} documents against the current taxonomy — no re-embedding, no redeploy.`,
    );
    setWizardOpen(false);
    resetWizard();
  }

  const stepLabels = [
    "Edit taxonomy",
    "Review mapping",
    "Assisted re-classify",
    "Human validation",
  ];

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
            <Text2 regular color={skinVars.colors.textSecondaryInverse}>
              The strategic axes below are the shared vocabulary every document is mapped to. When
              the strategy shifts, a documentalist updates the taxonomy and re-classifies the corpus
              against it — a governed configuration change, not an engineering release. No
              re-embedding, no IT ticket, no redeploy.
              {reclassifyRuns > 0 &&
                ` ${reclassifyRuns} re-classification ${reclassifyRuns === 1 ? "run" : "runs"} applied this session.`}
            </Text2>
          </Stack>
        </Box>
      </div>

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
          description="A four-step governed change. Nothing is re-embedded or redeployed — you are re-applying the current taxonomy to existing documents. Session-only for the demo."
          onClose={() => setWizardOpen(false)}
          button={
            step < 3
              ? {
                  text: "Continue",
                  onPress: () => setStep((s) => (s + 1) as Step),
                  disabled: step === 0 && renameTo.trim().length === 0,
                }
              : { text: "Confirm and apply", onPress: finishWizard }
          }
          secondaryButton={
            step > 0
              ? { text: "Back", onPress: () => setStep((s) => (s - 1) as Step) }
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
                  Rename or refine a taxonomy label. This mirrors a strategy shift — for example
                  folding a legacy theme into a current strategic axis.
                </Text2>
                <TextField
                  name="renameFrom"
                  label="Current label"
                  value={renameFrom}
                  onChangeValue={setRenameFrom}
                />
                <TextField
                  name="renameTo"
                  label="New label"
                  value={renameTo}
                  onChangeValue={setRenameTo}
                />
              </Stack>
            )}

            {step === 1 && (
              <Stack space={12}>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {affectedCount} documents currently map to {renameFrom || "the current label"}.
                  They will be re-pointed to {renameTo || "the new label"}.
                </Text2>
                <Boxed>
                  <Box padding={16}>
                    <Inline space={12} alignItems="center">
                      <Text2 regular color={skinVars.colors.textSecondary}>
                        {renameFrom || "Current label"}
                      </Text2>
                      <IconArrowLineRightRegular size={16} color={skinVars.colors.brand} />
                      <Text2 medium color={skinVars.colors.textPrimary}>
                        {renameTo || "New label"}
                      </Text2>
                    </Inline>
                  </Box>
                </Boxed>
              </Stack>
            )}

            {step === 2 && (
              <Stack space={16}>
                <Inline space={0} alignItems="center">
                  <Circle size={56} backgroundColor={skinVars.colors.brandLow}>
                    <IconRefreshRegular size={28} color={skinVars.colors.brand} />
                  </Circle>
                </Inline>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  The engine re-classifies the {affectedCount} affected documents against the updated
                  taxonomy. Existing embeddings are reused — this is a metadata re-mapping, not a
                  re-index.
                </Text2>
                <ProgressBar progressPercent={100} color={skinVars.colors.brand} />
              </Stack>
            )}

            {step === 3 && (
              <Stack space={12}>
                <Callout
                  asset={<IconShieldRegular color={skinVars.colors.brand} />}
                  title="A human confirms the re-classification before it becomes live"
                  description="Nothing is applied automatically — the documentalist owns the final decision."
                />
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {affectedCount} documents re-classified from {renameFrom || "the current label"} to{" "}
                  {renameTo || "the new label"}. Confirm to apply for this session.
                </Text2>
              </Stack>
            )}
          </Stack>
        </Drawer>
      )}
    </Stack>
  );
}
