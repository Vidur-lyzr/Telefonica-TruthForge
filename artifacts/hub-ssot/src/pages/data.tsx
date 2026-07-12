import React from "react";
import {
  useGetIngestionSnapshot,
  useListValidationItems,
  useListDocumentFreshness,
} from "@workspace/api-client-react";
import {
  Box,
  Stack,
  Inline,
  Boxed,
  Divider,
  ResponsiveLayout,
  Circle,
  Tabs,
  Callout,
  ButtonSecondary,
  Drawer,
  Text1,
  Text2,
  Text3,
  Text8,
  Title3,
  skinVars,
  IconShieldRegular,
  IconDatabaseConnectedRegular,
  IconBoxRegular,
  IconWorldDeviceRegular,
  IconBookRegular,
  IconCheckedRegular,
  IconAlertRegular,
  IconStatusChartRegular,
} from "@telefonica/mistica";
import type { IconProps } from "@telefonica/mistica";
import { DataCenterProvider, useDataCenter } from "@/components/data-center/state";
import { formatTimestamp } from "@/components/data-center/helpers";
import ValidationArea from "@/components/data-center/validation";
import SourcesArea from "@/components/data-center/sources";
import IngestionArea from "@/components/data-center/ingestion";
import GovernanceArea from "@/components/data-center/governance";
import CorpusArea from "@/components/data-center/corpus";
import { useApp } from "@/components/app-provider";
import { DATA_I18N } from "@/i18n/data";

type AreaId = "validation" | "sources" | "ingestion" | "governance" | "corpus";

type IconType = (props: IconProps) => React.JSX.Element;

const AREA_DEFS: {
  id: AreaId;
  Icon: IconType;
}[] = [
  { id: "validation", Icon: IconShieldRegular },
  { id: "sources", Icon: IconDatabaseConnectedRegular },
  { id: "ingestion", Icon: IconBoxRegular },
  { id: "governance", Icon: IconWorldDeviceRegular },
  { id: "corpus", Icon: IconBookRegular },
];

function ActivityDrawer() {
  const { activity } = useDataCenter();
  const { lang } = useApp();
  const t = DATA_I18N[lang];
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <ButtonSecondary
        small
        onPress={() => setOpen(true)}
        StartIcon={IconStatusChartRegular}
      >
        {activity.length > 0 ? t.sessionActivityCount(activity.length) : t.sessionActivity}
      </ButtonSecondary>

      {open && (
        <Drawer
          title={t.sessionActivity}
          description={t.activityDrawerDesc}
          onClose={() => setOpen(false)}
        >
          {activity.length === 0 ? (
            <Box paddingY={40}>
              <Stack space={12}>
                <Inline space={0} alignItems="center">
                  <Circle size={48} backgroundColor={skinVars.colors.neutralLow}>
                    <IconStatusChartRegular size={24} color={skinVars.colors.textSecondary} />
                  </Circle>
                </Inline>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {t.noActionsYet}
                </Text2>
              </Stack>
            </Box>
          ) : (
            <Stack space={12}>
              {activity.map((a) => (
                <Boxed key={a.id}>
                  <Box padding={16}>
                    <Stack space={4}>
                      <Inline space={8} alignItems="center">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text2 medium color={skinVars.colors.textPrimary}>
                            {a.action}
                          </Text2>
                        </div>
                        <Text1 regular color={skinVars.colors.textSecondary}>
                          {formatTimestamp(a.timestamp, lang)}
                        </Text1>
                      </Inline>
                      <Text1 medium color={skinVars.colors.brand}>
                        {a.target}
                      </Text1>
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        {a.detail}
                      </Text1>
                    </Stack>
                  </Box>
                </Boxed>
              ))}
            </Stack>
          )}
        </Drawer>
      )}
    </>
  );
}

function DataCenterShell() {
  const { lang } = useApp();
  const t = DATA_I18N[lang];
  const [areaIndex, setAreaIndex] = React.useState(0);
  const area = AREA_DEFS[areaIndex].id;

  const { data: snapshot } = useGetIngestionSnapshot();
  const { data: validationItems } = useListValidationItems();
  const { data: freshness } = useListDocumentFreshness();
  const { resolvedValidations, releasedQuarantine } = useDataCenter();

  const openQuarantine = React.useMemo(
    () => (snapshot?.quarantine ?? []).filter((q) => !releasedQuarantine[q.id]).length,
    [snapshot, releasedQuarantine],
  );
  const openValidations = React.useMemo(
    () => (validationItems ?? []).filter((it) => !resolvedValidations[it.id]).length,
    [validationItems, resolvedValidations],
  );
  const overdue = React.useMemo(() => (freshness ?? []).filter((f) => f.overdue).length, [freshness]);

  const totalBacklog = openQuarantine + openValidations;
  const allClear = totalBacklog === 0 && overdue === 0;

  const badgeFor = (id: AreaId): number | null => {
    if (id === "validation" && openValidations > 0) return openValidations;
    if (id === "ingestion" && openQuarantine > 0) return openQuarantine;
    if (id === "governance" && overdue > 0) return overdue;
    return null;
  };

  const statusDescriptionParts: string[] = [];
  if (openValidations > 0) statusDescriptionParts.push(t.statusInQueue(openValidations));
  if (openQuarantine > 0) statusDescriptionParts.push(t.statusInQuarantine(openQuarantine));
  if (overdue > 0) statusDescriptionParts.push(t.statusPastSla(overdue));

  return (
    <ResponsiveLayout>
      <Box paddingY={32}>
        <Stack space={24}>
          <Inline space={16} alignItems="center" wrap>
            <div style={{ flex: 1, minWidth: 240 }}>
              <Stack space={8}>
                <Text8>{t.pageTitle}</Text8>
                <Text3 regular color={skinVars.colors.textSecondary}>
                  {t.pageSubtitle}
                </Text3>
              </Stack>
            </div>
            <ActivityDrawer />
          </Inline>

          <Callout
            asset={
              allClear ? (
                <IconCheckedRegular color={skinVars.colors.success} />
              ) : (
                <IconAlertRegular color={skinVars.colors.warning} />
              )
            }
            title={
              allClear
                ? t.allCaughtUp
                : totalBacklog > 0
                  ? t.itemsNeedDocumentalist(totalBacklog)
                  : t.corpusNeedsAttention
            }
            description={
              allClear ? t.allClearDesc : statusDescriptionParts.join(" · ")
            }
          />

          <Stack space={8}>
            <Tabs
              selectedIndex={areaIndex}
              onChange={setAreaIndex}
              tabs={AREA_DEFS.map((a) => {
                const badge = badgeFor(a.id);
                const label = t.areas[a.id];
                return {
                  text: badge !== null ? `${label} (${badge})` : label,
                  Icon: a.Icon,
                };
              })}
            />
            <Divider />
          </Stack>

          <Box>
            {area === "validation" && <ValidationArea />}
            {area === "sources" && <SourcesArea />}
            {area === "ingestion" && <IngestionArea />}
            {area === "governance" && <GovernanceArea />}
            {area === "corpus" && <CorpusArea />}
          </Box>
        </Stack>
      </Box>
    </ResponsiveLayout>
  );
}

export default function DataPage() {
  return (
    <DataCenterProvider>
      <DataCenterShell />
    </DataCenterProvider>
  );
}
