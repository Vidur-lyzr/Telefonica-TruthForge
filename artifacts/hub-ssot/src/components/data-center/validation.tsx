import React from "react";
import { useListValidationItems, useListAxes } from "@workspace/api-client-react";
import type { ValidationItem } from "@workspace/api-client-react";
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
  ButtonPrimary,
  ButtonSecondary,
  ButtonLink,
  TextField,
  Select,
  Drawer,
  Text1,
  Text2,
  Text3,
  Title2,
  Title3,
  skinVars,
  IconShieldRegular,
  IconCheckedRegular,
  IconLayersRegular,
  IconAiRegular,
  IconWorldDeviceRegular,
  IconTimeRegular,
  IconEditPencilRegular,
  IconCloseRegular,
  IconArchiveRegular,
} from "@telefonica/mistica";
import { useDataCenter } from "./state";
import { clearanceTagType, confidenceTagType } from "./helpers";

function Dot({ color }: { color: string }) {
  return (
    <div
      aria-hidden
      style={{ width: 8, height: 8, borderRadius: skinVars.borderRadii.avatar, backgroundColor: color, flexShrink: 0 }}
    />
  );
}

function ConfidenceLegend() {
  return (
    <Inline space={24} alignItems="center" wrap>
      <Inline space={8} alignItems="center">
        <Dot color={skinVars.colors.success} />
        <Text1 regular color={skinVars.colors.textSecondary}>
          High — auto-validated upstream
        </Text1>
      </Inline>
      <Inline space={8} alignItems="center">
        <Dot color={skinVars.colors.warning} />
        <Text1 regular color={skinVars.colors.textSecondary}>
          Medium — shown here for a quick check
        </Text1>
      </Inline>
      <Inline space={8} alignItems="center">
        <Dot color={skinVars.colors.error} />
        <Text1 regular color={skinVars.colors.textSecondary}>
          Low — flagged, needs a human
        </Text1>
      </Inline>
    </Inline>
  );
}

function LayerCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Inline space={12} alignItems="center">
      <Circle size={36} backgroundColor={skinVars.colors.brandLow}>
        <Icon size={16} color={skinVars.colors.brand} />
      </Circle>
      <Stack space={2}>
        <Text2 medium color={skinVars.colors.textPrimary}>
          {title}
        </Text2>
        <Text1 regular color={skinVars.colors.textSecondary}>
          {description}
        </Text1>
      </Stack>
    </Inline>
  );
}

export default function ValidationArea() {
  const { data: items } = useListValidationItems();
  const { data: axes } = useListAxes();
  const { resolvedValidations, resolveValidation, resolveConflict } = useDataCenter();

  const [editing, setEditing] = React.useState<ValidationItem | null>(null);
  const [editMeta, setEditMeta] = React.useState<{
    confidentiality: string;
    owner: string;
    country: string;
    brand: string;
  } | null>(null);

  const axisName = (id: string) => axes?.find((a) => a.id === id)?.name ?? id;

  const openItems = React.useMemo(
    () => (items ?? []).filter((it) => !resolvedValidations[it.id]),
    [items, resolvedValidations],
  );
  const resolvedItems = React.useMemo(
    () => (items ?? []).filter((it) => resolvedValidations[it.id]),
    [items, resolvedValidations],
  );

  function startEdit(it: ValidationItem) {
    setEditMeta({
      confidentiality: it.metadata.confidentiality,
      owner: it.metadata.owner,
      country: it.metadata.country,
      brand: it.metadata.brand,
    });
    setEditing(it);
  }

  function saveEdit() {
    if (!editing || !editMeta) return;
    const changed: string[] = [];
    if (editMeta.confidentiality !== editing.metadata.confidentiality)
      changed.push(`confidentiality → ${editMeta.confidentiality}`);
    if (editMeta.owner !== editing.metadata.owner) changed.push(`owner → ${editMeta.owner}`);
    if (editMeta.country !== editing.metadata.country) changed.push(`country → ${editMeta.country}`);
    if (editMeta.brand !== editing.metadata.brand) changed.push(`brand → ${editMeta.brand}`);
    const detail = changed.length
      ? `Corrected ${changed.join(", ")}. ${editing.refinedNote}`
      : editing.refinedNote;
    resolveValidation(editing.id, "edited", editing.title, detail);
    setEditing(null);
    setEditMeta(null);
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
          <Inline space={8} alignItems="center">
            <IconShieldRegular size={20} color={skinVars.colors.inverse} />
            <Text3 medium color={skinVars.colors.textPrimaryInverse}>
              Three-layer classification, always closed by a human
            </Text3>
          </Inline>
        </Box>
      </div>

      <Boxed>
        <Box padding={24}>
          <Stack space={16}>
            <Grid columns={3} gap={16}>
              <GridItem>
                <LayerCard
                  icon={IconLayersRegular}
                  title="Deterministic"
                  description="Rule-based type from source, format and structure."
                />
              </GridItem>
              <GridItem>
                <LayerCard
                  icon={IconAiRegular}
                  title="Semantic"
                  description="Topics and entities inferred from the content."
                />
              </GridItem>
              <GridItem>
                <LayerCard
                  icon={IconWorldDeviceRegular}
                  title="Strategic"
                  description="Mapped onto a Telefónica strategic axis."
                />
              </GridItem>
            </Grid>
            <Divider />
            <ConfidenceLegend />
          </Stack>
        </Box>
      </Boxed>

      <Stack space={16}>
        <Inline space={8} alignItems="center">
          {openItems.length > 0 ? (
            <IconShieldRegular size={20} color={skinVars.colors.brand} />
          ) : (
            <IconCheckedRegular size={20} color={skinVars.colors.success} />
          )}
          <Title2>
            {openItems.length > 0
              ? `Validation queue — ${openItems.length} awaiting a decision`
              : "Validation queue clear"}
          </Title2>
        </Inline>

        {openItems.length === 0 ? (
          <Boxed>
            <Box padding={24}>
              <Stack space={12}>
                <Inline space={0} alignItems="center">
                  <Circle size={56} backgroundColor={skinVars.colors.successLow}>
                    <IconArchiveRegular size={28} color={skinVars.colors.success} />
                  </Circle>
                </Inline>
                <Title3>All caught up</Title3>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {resolvedItems.length > 0
                    ? `You cleared ${resolvedItems.length} ${resolvedItems.length === 1 ? "item" : "items"} this session. High-confidence classifications were validated automatically upstream.`
                    : "No medium- or low-confidence classifications are waiting on a human."}
                </Text2>
              </Stack>
            </Box>
          </Boxed>
        ) : (
          <Stack space={16}>
            {openItems.map((it) => (
              <Boxed key={it.id}>
                <Box padding={20}>
                  <Stack space={16}>
                    <Inline space="between" alignItems="center">
                      <div style={{ minWidth: 0 }}>
                        <Inline space={8} alignItems="center" wrap>
                          <Text3 medium color={skinVars.colors.textPrimary}>
                            {it.title}
                          </Text3>
                          {it.kind === "conflict" && <Tag type="warning">Source conflict</Tag>}
                        </Inline>
                        <Text1 regular color={skinVars.colors.textSecondary}>
                          {it.source}
                        </Text1>
                      </div>
                      <Tag type={confidenceTagType(it.confidence)}>
                        {`${it.confidence} · ${Math.round(it.confidenceScore * 100)}%`}
                      </Tag>
                    </Inline>

                    {it.kind === "conflict" && it.conflict ? (
                      <Boxed>
                        <Box padding={16}>
                          <Stack space={12}>
                            <Text2 medium color={skinVars.colors.textPrimary}>
                              A fresher source disagrees with the value already in the core.
                            </Text2>
                            <Grid columns={2} gap={12}>
                              <GridItem>
                                <Boxed>
                                  <Box padding={12}>
                                    <Stack space={4}>
                                      <Inline space={8} alignItems="center">
                                        <IconTimeRegular
                                          size={14}
                                          color={skinVars.colors.textSecondary}
                                        />
                                        <Text1
                                          medium
                                          color={skinVars.colors.textSecondary}
                                          transform="uppercase"
                                        >
                                          Currently live
                                        </Text1>
                                      </Inline>
                                      <Text2 medium color={skinVars.colors.textPrimary}>
                                        {it.conflict.metric}: {it.conflict.oldValue}
                                      </Text2>
                                      <Text1 regular color={skinVars.colors.textSecondary}>
                                        {it.conflict.oldSource} · {it.conflict.oldDate}
                                      </Text1>
                                    </Stack>
                                  </Box>
                                </Boxed>
                              </GridItem>
                              <GridItem>
                                <Boxed>
                                  <Box padding={12}>
                                    <Stack space={4}>
                                      <Inline space={8} alignItems="center">
                                        <IconAiRegular
                                          size={14}
                                          color={skinVars.colors.success}
                                        />
                                        <Text1
                                          medium
                                          color={skinVars.colors.success}
                                          transform="uppercase"
                                        >
                                          Fresher source
                                        </Text1>
                                      </Inline>
                                      <Text2 medium color={skinVars.colors.textPrimary}>
                                        {it.conflict.metric}: {it.conflict.freshValue}
                                      </Text2>
                                      <Text1 regular color={skinVars.colors.textSecondary}>
                                        {it.conflict.freshSource} · {it.conflict.freshDate}
                                      </Text1>
                                    </Stack>
                                  </Box>
                                </Boxed>
                              </GridItem>
                            </Grid>
                            <Text1 regular color={skinVars.colors.textSecondary}>
                              Promoting the fresher value keeps the older figure as a dated, historic
                              record — it is never silently overwritten.
                            </Text1>
                            <Inline space={8} wrap>
                              <ButtonPrimary
                                small
                                onPress={() =>
                                  resolveConflict(
                                    it.id,
                                    it.title,
                                    `Promoted ${it.conflict!.freshValue} (${it.conflict!.freshSource}, ${it.conflict!.freshDate}); ${it.conflict!.oldValue} retained as historic.`,
                                  )
                                }
                              >
                                Promote fresher value
                              </ButtonPrimary>
                              <ButtonSecondary
                                small
                                onPress={() =>
                                  resolveValidation(
                                    it.id,
                                    "approved",
                                    it.title,
                                    `Kept ${it.conflict!.oldValue} (${it.conflict!.oldSource}); fresher figure logged but not promoted.`,
                                  )
                                }
                              >
                                Keep current value
                              </ButtonSecondary>
                            </Inline>
                          </Stack>
                        </Box>
                      </Boxed>
                    ) : (
                      <>
                        <Grid columns={3} gap={12}>
                          <GridItem>
                            <Boxed>
                              <Box padding={12}>
                                <Stack space={4}>
                                  <Text1
                                    medium
                                    color={skinVars.colors.textSecondary}
                                    transform="uppercase"
                                  >
                                    Deterministic
                                  </Text1>
                                  <Text2 medium color={skinVars.colors.textPrimary}>
                                    {it.classification.deterministic}
                                  </Text2>
                                </Stack>
                              </Box>
                            </Boxed>
                          </GridItem>
                          <GridItem>
                            <Boxed>
                              <Box padding={12}>
                                <Stack space={4}>
                                  <Text1
                                    medium
                                    color={skinVars.colors.textSecondary}
                                    transform="uppercase"
                                  >
                                    Semantic
                                  </Text1>
                                  <Inline space={4} wrap>
                                    {it.classification.semantic.map((s) => (
                                      <Tag key={s} type="promo">
                                        {s}
                                      </Tag>
                                    ))}
                                  </Inline>
                                </Stack>
                              </Box>
                            </Boxed>
                          </GridItem>
                          <GridItem>
                            <Boxed>
                              <Box padding={12}>
                                <Stack space={4}>
                                  <Text1
                                    medium
                                    color={skinVars.colors.textSecondary}
                                    transform="uppercase"
                                  >
                                    Strategic axis
                                  </Text1>
                                  <Text2 medium color={skinVars.colors.textPrimary}>
                                    {axisName(it.classification.strategicAxisId)}
                                  </Text2>
                                </Stack>
                              </Box>
                            </Boxed>
                          </GridItem>
                        </Grid>

                        <Inline space={8} alignItems="center" wrap>
                          <Text1 regular color={skinVars.colors.textSecondary}>
                            Proposed metadata:
                          </Text1>
                          <Tag type={clearanceTagType(it.metadata.confidentiality)}>
                            {it.metadata.confidentiality}
                          </Tag>
                          <Text2 medium color={skinVars.colors.textPrimary}>
                            {it.metadata.owner}
                          </Text2>
                          <Text1 regular color={skinVars.colors.textSecondary}>
                            ·
                          </Text1>
                          <Text2 medium color={skinVars.colors.textPrimary}>
                            {it.metadata.country}
                          </Text2>
                          <Text1 regular color={skinVars.colors.textSecondary}>
                            ·
                          </Text1>
                          <Text2 medium color={skinVars.colors.textPrimary}>
                            {it.metadata.brand}
                          </Text2>
                        </Inline>

                        <Inline space={8} wrap>
                          <ButtonPrimary
                            small
                            onPress={() =>
                              resolveValidation(
                                it.id,
                                "approved",
                                it.title,
                                `Confirmed the proposed classification. ${it.refinedNote}`,
                              )
                            }
                          >
                            Validate
                          </ButtonPrimary>
                          <ButtonSecondary small onPress={() => startEdit(it)}>
                            Correct
                          </ButtonSecondary>
                          <ButtonLink
                            onPress={() =>
                              resolveValidation(
                                it.id,
                                "rejected",
                                it.title,
                                "Rejected — returned to the pipeline for re-processing.",
                              )
                            }
                          >
                            Reject
                          </ButtonLink>
                        </Inline>
                      </>
                    )}
                  </Stack>
                </Box>
              </Boxed>
            ))}
          </Stack>
        )}
      </Stack>

      {resolvedItems.length > 0 && (
        <Stack space={16}>
          <Inline space={8} alignItems="center">
            <IconCheckedRegular size={20} color={skinVars.colors.success} />
            <Title2>Resolved this session</Title2>
          </Inline>
          <Boxed>
            <Box padding={16}>
              <Stack space={8}>
                {resolvedItems.map((it, i) => {
                  const action = resolvedValidations[it.id];
                  const label =
                    action === "approved"
                      ? "Validated"
                      : action === "edited"
                        ? "Corrected"
                        : "Rejected";
                  return (
                    <React.Fragment key={it.id}>
                      {i > 0 && <Divider />}
                      <Box paddingY={8}>
                        <Inline space={12} alignItems="center">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Stack space={2}>
                              <Text2 medium color={skinVars.colors.textPrimary}>
                                {it.title}
                              </Text2>
                              <Text1 regular color={skinVars.colors.textSecondary}>
                                {it.refinedNote}
                              </Text1>
                            </Stack>
                          </div>
                          <Tag type={action === "rejected" ? "error" : "success"}>{label}</Tag>
                        </Inline>
                      </Box>
                    </React.Fragment>
                  );
                })}
              </Stack>
            </Box>
          </Boxed>
        </Stack>
      )}

      {editing && editMeta && (
        <Drawer
          title="Correct classification"
          description={`${editing.title} — adjust the governed metadata before validating. Your correction is recorded as the human decision. Session-only for the demo.`}
          onClose={() => setEditing(null)}
          button={{ text: "Save and validate", onPress: saveEdit }}
          secondaryButton={{ text: "Cancel", onPress: () => setEditing(null) }}
        >
          <Stack space={16}>
            <Select
              name="confidentiality"
              label="Confidentiality"
              value={editMeta.confidentiality}
              onChangeValue={(v) => setEditMeta((m) => (m ? { ...m, confidentiality: v } : m))}
              options={["public", "internal", "confidential", "restricted"].map((c) => ({
                value: c,
                text: c,
              }))}
            />
            <TextField
              name="owner"
              label="Owner"
              value={editMeta.owner}
              onChangeValue={(v) => setEditMeta((m) => (m ? { ...m, owner: v } : m))}
            />
            <Inline space={16}>
              <div style={{ flex: 1 }}>
                <TextField
                  name="country"
                  label="Country"
                  value={editMeta.country}
                  onChangeValue={(v) => setEditMeta((m) => (m ? { ...m, country: v } : m))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  name="brand"
                  label="Brand"
                  value={editMeta.brand}
                  onChangeValue={(v) => setEditMeta((m) => (m ? { ...m, brand: v } : m))}
                />
              </div>
            </Inline>
          </Stack>
        </Drawer>
      )}
    </Stack>
  );
}
