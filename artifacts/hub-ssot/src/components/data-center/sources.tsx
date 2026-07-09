import React from "react";
import { useListDataSources } from "@workspace/api-client-react";
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
  IconDatabaseConnectedRegular,
  IconTagRegular,
  IconCloudUploadRegular,
  IconSettingsRegular,
  IconAntennaRegular,
  IconCheckedRegular,
} from "@telefonica/mistica";
import { useDataCenter, type UploadedDoc } from "./state";
import { sourceStatusTagType, sourceStatusLabel, clearanceLabel } from "./helpers";

type IconType = React.ComponentType<{ size?: number; color?: string }>;

const SOURCE_ICON: Record<string, IconType> = {
  live: IconAntennaRegular,
  filtered: IconTagRegular,
  manual: IconCloudUploadRegular,
  to_configure: IconSettingsRegular,
};

const AREAS = ["Comunicación", "Marca", "Gabinete"];
const CLEARANCES = ["public", "private", "confidential", "off_the_record"];

const emptyUpload = {
  title: "",
  owner: "",
  country: "Group",
  brand: "Telefónica",
  confidentiality: "private",
  area: "Comunicación",
};

function SourceMeta({ label, value }: { label: string; value: string }) {
  return (
    <Stack space={2}>
      <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
        {label}
      </Text1>
      <Text2 medium color={skinVars.colors.textPrimary}>
        {value}
      </Text2>
    </Stack>
  );
}

export default function SourcesArea() {
  const { data: sources } = useListDataSources();
  const { uploads, addUpload } = useDataCenter();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({ ...emptyUpload });

  const sessionUploadCount = uploads.length;

  const sourcesWithSession = React.useMemo(() => {
    return (sources ?? []).map((s) =>
      s.id === "src-manual" ? { ...s, docCount: s.docCount + sessionUploadCount } : s,
    );
  }, [sources, sessionUploadCount]);

  const draftValid = draft.title.trim().length > 0 && draft.owner.trim().length > 0;

  function commitUpload() {
    const doc: UploadedDoc = {
      id: `upload-${Date.now()}`,
      title: draft.title,
      source: "Manual upload",
      owner: draft.owner,
      confidentiality: draft.confidentiality,
      country: draft.country,
      brand: draft.brand,
    };
    addUpload(doc);
    setDraft({ ...emptyUpload });
    setDialogOpen(false);
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
            <Inline space={8} alignItems="center">
              <IconDatabaseConnectedRegular size={20} color={skinVars.colors.inverse} />
              <Text3 medium color={skinVars.colors.textPrimaryInverse}>
                Sources feed the core before the model ever runs
              </Text3>
            </Inline>
            <Text2 regular color={skinVars.colors.textSecondaryInverse}>
              Quality starts here, not at the model. External sources are filtered before ingestion —
              by keywords, tracked competitors, named executives and priority topics — so only
              relevant mentions ever enter the knowledge core. Internal documents arrive with the
              sensitivity label that becomes their governed confidentiality tier.
            </Text2>
          </Stack>
        </Box>
      </div>

      <Grid columns={2} gap={16}>
        {sourcesWithSession.map((s) => {
          const Icon = SOURCE_ICON[s.status] ?? IconDatabaseConnectedRegular;
          return (
            <GridItem key={s.id}>
              <Boxed>
                <Box padding={24}>
                  <Stack space={16}>
                    <Inline space="between" alignItems="center">
                      <Inline space={12} alignItems="center">
                        <Circle size={44} backgroundColor={skinVars.colors.brandLow}>
                          <Icon size={20} color={skinVars.colors.brand} />
                        </Circle>
                        <Stack space={2}>
                          <Title3>{s.name}</Title3>
                          <Text1 regular color={skinVars.colors.textSecondary}>
                            {s.type}
                          </Text1>
                        </Stack>
                      </Inline>
                      <Tag type={sourceStatusTagType(s.status)}>{sourceStatusLabel(s.status)}</Tag>
                    </Inline>

                    <Text2 regular color={skinVars.colors.textSecondary}>
                      {s.description}
                    </Text2>

                    {s.externalFilter && s.filterNote && (
                      <Boxed>
                        <Box padding={12}>
                          <Inline space={8} alignItems="center">
                            <IconTagRegular size={16} color={skinVars.colors.brand} />
                            <Text2 medium color={skinVars.colors.textPrimary}>
                              {s.filterNote}
                            </Text2>
                          </Inline>
                        </Box>
                      </Boxed>
                    )}

                    <Divider />

                    <Inline space="between">
                      <SourceMeta label="Documents" value={s.docCount.toLocaleString("en-GB")} />
                      <SourceMeta label="Cadence" value={s.cadence} />
                      <SourceMeta label="Last sync" value={s.lastSync ?? "—"} />
                    </Inline>

                    {s.status === "manual" && (
                      <ButtonPrimary small onPress={() => setDialogOpen(true)}>
                        Manual upload
                      </ButtonPrimary>
                    )}
                    {s.status === "to_configure" && (
                      <Inline space={8} alignItems="center">
                        <IconSettingsRegular size={16} color={skinVars.colors.warning} />
                        <Text2 medium color={skinVars.colors.warning}>
                          Connector planned — no documents ingested yet.
                        </Text2>
                      </Inline>
                    )}
                  </Stack>
                </Box>
              </Boxed>
            </GridItem>
          );
        })}
      </Grid>

      {uploads.length > 0 && (
        <Stack space={16}>
          <Inline space={8} alignItems="center">
            <IconCheckedRegular size={20} color={skinVars.colors.success} />
            <Title2>Added this session</Title2>
          </Inline>
          <Boxed>
            <Box padding={16}>
              <Stack space={8}>
                {uploads.map((u, i) => (
                  <React.Fragment key={u.id}>
                    {i > 0 && <Divider />}
                    <Box paddingY={8}>
                      <Inline space="between" alignItems="center">
                        <Stack space={2}>
                          <Text2 medium color={skinVars.colors.textPrimary}>
                            {u.title}
                          </Text2>
                          <Text1 regular color={skinVars.colors.textSecondary}>
                            {u.owner} · {u.country} · {u.brand}
                          </Text1>
                        </Stack>
                        <Tag type="promo">Queued to intake</Tag>
                      </Inline>
                    </Box>
                  </React.Fragment>
                ))}
              </Stack>
            </Box>
          </Boxed>
        </Stack>
      )}

      {dialogOpen && (
        <Drawer
          title="Manual upload"
          description="Mandatory metadata is captured up front so the document never enters the pipeline underspecified. This is session-only for the demo."
          onClose={() => setDialogOpen(false)}
          button={{
            text: "Add to intake",
            onPress: commitUpload,
            disabled: !draftValid,
          }}
          secondaryButton={{ text: "Cancel", onPress: () => setDialogOpen(false) }}
        >
          <Stack space={16}>
            <TextField
              name="up-title"
              label="Title"
              value={draft.title}
              onChangeValue={(v) => setDraft((d) => ({ ...d, title: v }))}
            />
            <TextField
              name="up-owner"
              label="Owner"
              value={draft.owner}
              onChangeValue={(v) => setDraft((d) => ({ ...d, owner: v }))}
            />
            <Inline space={16}>
              <div style={{ flex: 1 }}>
                <TextField
                  name="up-country"
                  label="Country"
                  value={draft.country}
                  onChangeValue={(v) => setDraft((d) => ({ ...d, country: v }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  name="up-brand"
                  label="Brand"
                  value={draft.brand}
                  onChangeValue={(v) => setDraft((d) => ({ ...d, brand: v }))}
                />
              </div>
            </Inline>
            <Inline space={16}>
              <div style={{ flex: 1 }}>
                <Select
                  name="up-confidentiality"
                  label="Confidentiality"
                  value={draft.confidentiality}
                  onChangeValue={(v) => setDraft((d) => ({ ...d, confidentiality: v }))}
                  options={CLEARANCES.map((c) => ({ value: c, text: clearanceLabel(c) }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  name="up-area"
                  label="Area"
                  value={draft.area}
                  onChangeValue={(v) => setDraft((d) => ({ ...d, area: v }))}
                  options={AREAS.map((a) => ({ value: a, text: a }))}
                />
              </div>
            </Inline>
          </Stack>
        </Drawer>
      )}
    </Stack>
  );
}
