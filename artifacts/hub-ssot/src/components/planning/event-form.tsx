import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreatePlanningEvent,
  type StrategicAxis,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { PLANNING_I18N } from "@/i18n/planning";
import {
  Sheet,
  Box,
  Stack,
  Inline,
  Text1,
  Text2,
  Text5,
  TextField,
  DateField,
  Select,
  ButtonPrimary,
  ButtonSecondary,
  skinVars,
  applyAlpha,
  IconLockClosedRegular,
} from "@telefonica/mistica";

const SOURCES = ["Asana", "Jira", "Google Calendar", "Confluence", "Excel"];

export function EventForm({
  axes,
  todayISO,
  onClose,
  onCreated,
}: {
  axes: StrategicAxis[] | undefined;
  todayISO: string;
  onClose: () => void;
  onCreated: (eventId: string) => void;
}) {
  const { roleId, area, lang } = useApp();
  const t = PLANNING_I18N[lang];
  const queryClient = useQueryClient();
  const { mutate, isPending, error, reset } = useCreatePlanningEvent();

  const [title, setTitle] = React.useState("");
  const [startDate, setStartDate] = React.useState(todayISO);
  const [endDate, setEndDate] = React.useState(todayISO);
  const [type, setType] = React.useState("campaign");
  const [owner, setOwner] = React.useState("");
  const [axisId, setAxisId] = React.useState(axes?.[0]?.id ?? "");
  const [market, setMarket] = React.useState("Spain");
  const [brand, setBrand] = React.useState("Movistar");
  const [source, setSource] = React.useState("Asana");
  const [confidentiality, setConfidentiality] = React.useState("private");
  const [description, setDescription] = React.useState("");

  const valid =
    title.trim().length > 0 &&
    owner.trim().length > 0 &&
    description.trim().length > 0 &&
    !!axisId &&
    !!startDate &&
    !!endDate &&
    endDate >= startDate;

  const serverError = error
    ? (error.data?.error ?? t.formErrorFallback)
    : null;

  const submit = () => {
    mutate(
      {
        data: {
          roleId,
          title: title.trim(),
          startDate,
          endDate,
          area,
          type,
          owner: owner.trim(),
          axisId,
          market,
          brand,
          source,
          confidentiality,
          description: description.trim(),
        },
      },
      {
        onSuccess: (result) => {
          void queryClient.invalidateQueries({ queryKey: ["planning-events"] });
          void queryClient.invalidateQueries({ queryKey: ["planning-insights"] });
          void queryClient.invalidateQueries({ queryKey: ["planning-alerts"] });
          void queryClient.invalidateQueries({ queryKey: ["planning-overview"] });
          onCreated(result.event.id);
        },
      },
    );
  };

  return (
    <Sheet onClose={onClose}>
      {({ modalTitleId, closeModal }) => (
        <Box paddingX={24} paddingBottom={32} paddingTop={16}>
          <Stack space={24}>
            <Stack space={8}>
              <Text5 id={modalTitleId}>{t.newActivity}</Text5>
              <Text2 regular color={skinVars.colors.textSecondary}>
                {t.formIntro(area)}
              </Text2>
            </Stack>

            <TextField
              name="title"
              label={t.fieldTitle}
              value={title}
              onChangeValue={(v) => {
                reset();
                setTitle(v);
              }}
              fullWidth
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              <DateField
                name="startDate"
                label={t.fieldStartDate}
                value={startDate}
                onChangeValue={setStartDate}
                fullWidth
              />
              <DateField
                name="endDate"
                label={t.fieldEndDate}
                value={endDate}
                onChangeValue={setEndDate}
                error={!!endDate && !!startDate && endDate < startDate}
                helperText={
                  endDate && startDate && endDate < startDate
                    ? t.endBeforeStart
                    : undefined
                }
                fullWidth
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              <Select
                name="type"
                label={t.fieldType}
                value={type}
                onChangeValue={setType}
                options={[
                  { value: "campaign", text: t.types.campaign },
                  { value: "milestone", text: t.types.milestone },
                  { value: "event", text: t.types.event },
                  { value: "publication", text: t.types.publication },
                ]}
                fullWidth
              />
              <Select
                name="axis"
                label={t.fieldAxis}
                value={axisId}
                onChangeValue={setAxisId}
                options={(axes ?? []).map((a) => ({ value: a.id, text: a.name }))}
                fullWidth
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              <TextField
                name="owner"
                label={t.fieldOwner}
                placeholder={t.ownerPlaceholder}
                value={owner}
                onChangeValue={setOwner}
                fullWidth
              />
              <TextField
                name="market"
                label={t.fieldMarket}
                value={market}
                onChangeValue={setMarket}
                fullWidth
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              <TextField
                name="brand"
                label={t.fieldBrand}
                value={brand}
                onChangeValue={setBrand}
                fullWidth
              />
              <Select
                name="source"
                label={t.fieldSource}
                value={source}
                onChangeValue={setSource}
                options={SOURCES.map((s) => ({ value: s, text: s }))}
                fullWidth
              />
            </div>

            <Stack space={8}>
              <Select
                name="confidentiality"
                label={t.fieldConfidentiality}
                value={confidentiality}
                onChangeValue={(v) => {
                  reset();
                  setConfidentiality(v);
                }}
                options={[
                  { value: "public", text: t.confidentialityOptions.public },
                  { value: "private", text: t.confidentialityOptions.private },
                  { value: "confidential", text: t.confidentialityOptions.confidential },
                  { value: "off_the_record", text: t.confidentialityOptions.off_the_record },
                ]}
                fullWidth
              />
              <Inline space={4} alignItems="center">
                <IconLockClosedRegular size={12} color={skinVars.colors.textSecondary} />
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {t.clearanceHint}
                </Text1>
              </Inline>
            </Stack>

            <TextField
              name="description"
              label={t.fieldDescription}
              value={description}
              onChangeValue={setDescription}
              multiline
              fullWidth
            />

            {serverError && (
              <div
                style={{
                  backgroundColor: applyAlpha(skinVars.rawColors.error, 0.12),
                  borderRadius: skinVars.borderRadii.container,
                  padding: 16,
                }}
              >
                <Text2 regular color={skinVars.colors.textPrimary}>
                  {serverError}
                </Text2>
              </div>
            )}

            <Inline space={16}>
              <ButtonPrimary onPress={submit} disabled={!valid || isPending || !roleId}>
                {isPending ? t.creating : t.createActivity}
              </ButtonPrimary>
              <ButtonSecondary onPress={closeModal} disabled={isPending}>
                {t.cancel}
              </ButtonSecondary>
            </Inline>
          </Stack>
        </Box>
      )}
    </Sheet>
  );
}
