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
  IconAiRegular,
  IconTimeRegular,
  IconArchiveRegular,
} from "@telefonica/mistica";
import { useDataCenter } from "./state";
import {
  clearanceTagType,
  clearanceLabel,
  confidenceTagType,
  confidenceLabel,
  fieldLabel,
} from "./helpers";
import { useApp } from "../app-provider";
import { DATA_I18N } from "../../i18n/data";

export default function ValidationArea() {
  const { lang } = useApp();
  const t = DATA_I18N[lang].validation;
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
      changed.push(
        t.fieldArrow(fieldLabel("confidentiality", lang), clearanceLabel(editMeta.confidentiality, lang)),
      );
    if (editMeta.owner !== editing.metadata.owner)
      changed.push(t.fieldArrow(fieldLabel("owner", lang), editMeta.owner));
    if (editMeta.country !== editing.metadata.country)
      changed.push(t.fieldArrow(fieldLabel("country", lang), editMeta.country));
    if (editMeta.brand !== editing.metadata.brand)
      changed.push(t.fieldArrow(fieldLabel("brand", lang), editMeta.brand));
    const detail = changed.length
      ? t.correctedDetail(changed.join(", "), editing.refinedNote)
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
              {t.bannerTitle}
            </Text3>
          </Inline>
        </Box>
      </div>

      <Stack space={16}>
        <Inline space={8} alignItems="center">
          {openItems.length > 0 ? (
            <IconShieldRegular size={20} color={skinVars.colors.brand} />
          ) : (
            <IconCheckedRegular size={20} color={skinVars.colors.success} />
          )}
          <Title2>
            {openItems.length > 0 ? t.queueTitleOpen(openItems.length) : t.queueTitleClear}
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
                <Title3>{t.allCaughtUp}</Title3>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {resolvedItems.length > 0
                    ? t.clearedThisSession(resolvedItems.length)
                    : t.noneWaiting}
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
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Stack space={2}>
                          <Inline space={8} alignItems="center" wrap>
                            <Text3 medium color={skinVars.colors.textPrimary}>
                              {it.title}
                            </Text3>
                            {it.kind === "conflict" && <Tag type="warning">{t.sourceConflict}</Tag>}
                          </Inline>
                          <Text1 regular color={skinVars.colors.textSecondary}>
                            {it.source}
                          </Text1>
                        </Stack>
                      </div>
                      <Tag type={confidenceTagType(it.confidence)}>
                        {`${confidenceLabel(it.confidence, lang)} · ${Math.round(it.confidenceScore * 100)}%`}
                      </Tag>
                    </Inline>

                    <div
                      style={{
                        borderLeft: `2px solid ${skinVars.colors.warning}`,
                        paddingLeft: 12,
                      }}
                    >
                      <Stack space={2}>
                        <Text1 medium transform="uppercase" color={skinVars.colors.textSecondary}>
                          {t.whyQueued}
                        </Text1>
                        <Text2 regular color={skinVars.colors.textPrimary}>
                          {it.reason}
                        </Text2>
                      </Stack>
                    </div>

                    {it.kind === "conflict" && it.conflict ? (
                      <Boxed>
                        <Box padding={16}>
                          <Stack space={12}>
                            <Text2 medium color={skinVars.colors.textPrimary}>
                              {t.conflictHeadline}
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
                                          {t.currentlyLive}
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
                                          {t.fresherSource}
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
                              {t.conflictNote}
                            </Text1>
                            <Inline space={8} wrap>
                              <ButtonPrimary
                                small
                                onPress={() =>
                                  resolveConflict(
                                    it.id,
                                    it.title,
                                    t.promotedDetail(
                                      it.conflict!.freshValue,
                                      it.conflict!.freshSource,
                                      it.conflict!.freshDate,
                                      it.conflict!.oldValue,
                                    ),
                                  )
                                }
                              >
                                {t.promoteFresher}
                              </ButtonPrimary>
                              <ButtonSecondary
                                small
                                onPress={() =>
                                  resolveValidation(
                                    it.id,
                                    "approved",
                                    it.title,
                                    t.keptDetail(it.conflict!.oldValue, it.conflict!.oldSource),
                                  )
                                }
                              >
                                {t.keepCurrent}
                              </ButtonSecondary>
                            </Inline>
                          </Stack>
                        </Box>
                      </Boxed>
                    ) : (
                      <Stack space={12}>
                        <Inline space={8} alignItems="center" wrap>
                          <Tag type="promo">{it.classification.deterministic}</Tag>
                          <Tag type={clearanceTagType(it.metadata.confidentiality)}>
                            {clearanceLabel(it.metadata.confidentiality, lang)}
                          </Tag>
                          <Text1 regular color={skinVars.colors.textSecondary}>
                            {axisName(it.classification.strategicAxisId)}
                          </Text1>
                        </Inline>

                        <Inline space={8} wrap>
                          <ButtonPrimary
                            small
                            onPress={() =>
                              resolveValidation(
                                it.id,
                                "approved",
                                it.title,
                                t.confirmedDetail(it.refinedNote),
                              )
                            }
                          >
                            {t.validate}
                          </ButtonPrimary>
                          <ButtonSecondary small onPress={() => startEdit(it)}>
                            {t.correct}
                          </ButtonSecondary>
                          <ButtonLink
                            onPress={() =>
                              resolveValidation(it.id, "rejected", it.title, t.rejectedDetail)
                            }
                          >
                            {t.reject}
                          </ButtonLink>
                        </Inline>
                      </Stack>
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
            <Title2>{t.resolvedThisSession}</Title2>
          </Inline>
          <Boxed>
            <Box padding={16}>
              <Stack space={8}>
                {resolvedItems.map((it, i) => {
                  const action = resolvedValidations[it.id];
                  const label =
                    action === "approved"
                      ? t.actionValidated
                      : action === "edited"
                        ? t.actionCorrected
                        : t.actionRejected;
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
          title={t.editTitle}
          description={t.editDesc(editing.title)}
          onClose={() => setEditing(null)}
          onDismiss={() => setEditing(null)}
          button={{ text: t.saveValidate, onPress: saveEdit }}
          secondaryButton={{ text: t.cancel, onPress: () => setEditing(null) }}
        >
          <Stack space={16}>
            <Select
              name="confidentiality"
              label={fieldLabel("confidentiality", lang)}
              value={editMeta.confidentiality}
              onChangeValue={(v) => setEditMeta((m) => (m ? { ...m, confidentiality: v } : m))}
              options={["public", "private", "confidential", "off_the_record"].map((c) => ({
                value: c,
                text: clearanceLabel(c, lang),
              }))}
            />
            <TextField
              name="owner"
              label={fieldLabel("owner", lang)}
              value={editMeta.owner}
              onChangeValue={(v) => setEditMeta((m) => (m ? { ...m, owner: v } : m))}
            />
            <Inline space={16}>
              <div style={{ flex: 1 }}>
                <TextField
                  name="country"
                  label={fieldLabel("country", lang)}
                  value={editMeta.country}
                  onChangeValue={(v) => setEditMeta((m) => (m ? { ...m, country: v } : m))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  name="brand"
                  label={fieldLabel("brand", lang)}
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
