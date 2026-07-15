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
  ButtonPrimary,
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
import { useDataCenter } from "./state";
import { SOURCE_LOGOS } from "./source-logos";
import { sourceStatusTagType, sourceStatusLabel, localeFor } from "./helpers";
import { UploadDrawer } from "./upload-drawer";
import { useApp } from "../app-provider";
import { DATA_I18N } from "../../i18n/data";

type IconType = React.ComponentType<{ size?: number; color?: string }>;

const SOURCE_ICON: Record<string, IconType> = {
  live: IconAntennaRegular,
  filtered: IconTagRegular,
  manual: IconCloudUploadRegular,
  to_configure: IconSettingsRegular,
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
  const { lang } = useApp();
  const t = DATA_I18N[lang];
  const s2 = t.sources;
  const { data: sources } = useListDataSources();
  const { uploads } = useDataCenter();

  const [dialogOpen, setDialogOpen] = React.useState(false);

  const sessionUploadCount = uploads.length;

  const sourcesWithSession = React.useMemo(() => {
    return (sources ?? []).map((s) =>
      s.id === "src-manual" ? { ...s, docCount: s.docCount + sessionUploadCount } : s,
    );
  }, [sources, sessionUploadCount]);

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
                {s2.bannerTitle}
              </Text3>
            </Inline>
            <Text2 regular color={skinVars.colors.textSecondaryInverse}>
              {s2.bannerDesc}
            </Text2>
          </Stack>
        </Box>
      </div>

      <Grid columns={2} gap={16}>
        {sourcesWithSession.map((s) => {
          const Logo = SOURCE_LOGOS[s.id];
          const Icon = SOURCE_ICON[s.status] ?? IconDatabaseConnectedRegular;
          return (
            <GridItem key={s.id}>
              <Boxed>
                <Box padding={24}>
                  <Stack space={16}>
                    <Inline space="between" alignItems="center">
                      <Inline space={12} alignItems="center">
                        <Circle
                          size={44}
                          backgroundColor={
                            Logo ? skinVars.colors.neutralLow : skinVars.colors.brandLow
                          }
                        >
                          {Logo ? (
                            <Logo size={22} />
                          ) : (
                            <Icon size={20} color={skinVars.colors.brand} />
                          )}
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
                      <SourceMeta label={s2.documents} value={s.docCount.toLocaleString(localeFor(lang))} />
                      <SourceMeta label={s2.cadence} value={s.cadence} />
                      <SourceMeta label={s2.lastSync} value={s.lastSync ?? "—"} />
                    </Inline>

                    {s.status === "manual" && (
                      <ButtonPrimary small onPress={() => setDialogOpen(true)}>
                        {s2.manualUpload}
                      </ButtonPrimary>
                    )}
                    {s.status === "to_configure" && (
                      <Inline space={8} alignItems="center">
                        <IconSettingsRegular size={16} color={skinVars.colors.warning} />
                        <Text2 medium color={skinVars.colors.warning}>
                          {s2.connectorPlanned}
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
            <Title2>{s2.addedThisSession}</Title2>
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
                            {u.owner} · {u.country} · {u.brand} · {u.docId}
                          </Text1>
                          {u.pointsAfter > u.pointsBefore && (
                            <Text1 regular color={skinVars.colors.textSecondary}>
                              {s2.indexProof(u.pointsBefore, u.pointsAfter)}
                            </Text1>
                          )}
                        </Stack>
                        <Tag type="success">{s2.inCorpus(u.chunkCount)}</Tag>
                      </Inline>
                    </Box>
                  </React.Fragment>
                ))}
              </Stack>
            </Box>
          </Boxed>
        </Stack>
      )}

      {dialogOpen && <UploadDrawer onClose={() => setDialogOpen(false)} />}
    </Stack>
  );
}
