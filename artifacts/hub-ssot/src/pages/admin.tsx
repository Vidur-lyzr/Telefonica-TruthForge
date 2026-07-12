import React from "react";
import {
  useListAdminProfiles,
  useListPlatformUsers,
  useListScheduledDocuments,
  useListAuditEntries,
  useGetUserVisibilityMatrix,
  useListKpiDefinitions,
  useListKpiDefinitionOptions,
  useUpsertKpiDefinition,
  PlatformUser,
  ScheduledDocument,
  AuditEntry,
  KpiDefinitionRecord,
  KpiDefinitionVersion,
  KpiSourceConfig,
} from "@workspace/api-client-react";
import { useApp, type Lang } from "@/components/app-provider";
import { ADMIN_I18N, localeFor } from "@/i18n/admin";
import CostModelSection from "@/components/admin/cost-model";
import SourceSyncSection from "@/components/admin/source-sync";
import RetrievalLogSection from "@/components/admin/retrieval-log";
import {
  Box,
  Boxed,
  Stack,
  Inline,
  Grid,
  Divider,
  Table,
  Tag,
  Sheet,
  Callout,
  Circle,
  TextField,
  Select,
  Checkbox,
  ButtonPrimary,
  ButtonSecondary,
  ButtonLink,
  Text1,
  Text2,
  Text3,
  Title2,
  Title3,
  skinVars,
  IconUserAccountRegular,
  IconSettingsRegular,
  IconEditPencilRegular,
  IconEyeRegular,
  IconAddUserRegular,
  IconCalendarRegular,
  IconListRegular,
  IconFolderRegular,
  IconLayersRegular,
  IconShieldCheckedOkRegular,
  IconAlertRegular,
  IconArrowLineRightRegular,
  IconTrophyRegular,
  IconTargetRegular,
  IconTimeRegular,
} from "@telefonica/mistica";

type IconType = (props: { size?: number; color?: string }) => React.ReactElement;
type Area = "Comunicación" | "Marca" | "Gabinete";
type Clearance = "public" | "private" | "confidential" | "off_the_record";
type ProfileId = "superadmin" | "admin" | "editor" | "audit";

type TagType = "promo" | "info" | "active" | "inactive" | "success" | "warning" | "error";

const AREAS: Area[] = ["Comunicación", "Marca", "Gabinete"];
const CLEARANCES: Clearance[] = ["public", "private", "confidential", "off_the_record"];
const CLEARANCE_RANK: Record<Clearance, number> = {
  public: 0,
  private: 1,
  confidential: 2,
  off_the_record: 3,
};
const CLEARANCE_LABEL: Record<Clearance, string> = {
  public: "Public",
  private: "Private",
  confidential: "Confidential",
  off_the_record: "Off the record",
};

const PROFILE_ICON: Record<ProfileId, IconType> = {
  superadmin: IconTrophyRegular,
  admin: IconSettingsRegular,
  editor: IconEditPencilRegular,
  audit: IconEyeRegular,
};

function clearanceTagType(c: string): TagType {
  switch (c) {
    case "public":
      return "inactive";
    case "private":
      return "info";
    case "confidential":
      return "warning";
    case "off_the_record":
      return "error";
    default:
      return "inactive";
  }
}

function scheduleTagType(s: string): TagType {
  switch (s) {
    case "active":
      return "success";
    case "paused":
      return "inactive";
    case "orphaned":
      return "error";
    default:
      return "inactive";
  }
}

function auditTagType(k: string): TagType {
  switch (k) {
    case "permission":
      return "warning";
    case "user":
      return "info";
    case "schedule":
      return "promo";
    case "run":
      return "inactive";
    default:
      return "inactive";
  }
}

function formatTimestamp(iso: string, lang: Lang) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(localeFor(lang), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface SessionUser extends PlatformUser {}
interface SessionSchedule extends ScheduledDocument {}

const emptyUserDraft = {
  name: "",
  email: "",
  area: "Comunicación" as Area,
  profileId: "editor" as ProfileId,
  clearance: "private" as Clearance,
};

export default function AdminPage() {
  const { lang } = useApp();
  const t = ADMIN_I18N[lang];
  const { data: profiles } = useListAdminProfiles();
  const { data: seedUsers } = useListPlatformUsers();
  const { data: seedSchedules } = useListScheduledDocuments();
  const { data: seedAudit } = useListAuditEntries();

  // Session-only overlays layered on the seeded data (no database).
  const [sessionUsers, setSessionUsers] = React.useState<SessionUser[]>([]);
  const [userEdits, setUserEdits] = React.useState<Record<string, Partial<PlatformUser>>>({});
  const [sessionSchedules, setSessionSchedules] = React.useState<SessionSchedule[]>([]);
  const [sessionAudit, setSessionAudit] = React.useState<AuditEntry[]>([]);

  const profileLabel = React.useMemo(() => {
    const map: Record<string, string> = {};
    (profiles ?? []).forEach((p) => (map[p.id] = p.label));
    return map;
  }, [profiles]);

  const users: PlatformUser[] = React.useMemo(() => {
    const merged = [...(seedUsers ?? []), ...sessionUsers];
    return merged.map((u) => ({ ...u, ...userEdits[u.id] }));
  }, [seedUsers, sessionUsers, userEdits]);

  const schedules: ScheduledDocument[] = React.useMemo(
    () => [...(seedSchedules ?? []), ...sessionSchedules],
    [seedSchedules, sessionSchedules],
  );

  const auditEntries: AuditEntry[] = React.useMemo(() => {
    const merged = [...sessionAudit, ...(seedAudit ?? [])];
    return merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [seedAudit, sessionAudit]);

  const orphanedCount = schedules.filter((s) => s.status === "orphaned").length;

  function pushAudit(entry: Omit<AuditEntry, "id" | "timestamp">) {
    setSessionAudit((prev) => [
      {
        ...entry,
        id: `audit-session-${Date.now()}-${prev.length}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  // ---- User register / edit ----
  const [userDialogOpen, setUserDialogOpen] = React.useState(false);
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
  const [userDraft, setUserDraft] = React.useState({ ...emptyUserDraft });
  const [pendingUser, setPendingUser] = React.useState<null | { isEdit: boolean }>(null);

  function openRegister() {
    setEditingUserId(null);
    setUserDraft({ ...emptyUserDraft });
    setUserDialogOpen(true);
  }

  function openEdit(u: PlatformUser) {
    setEditingUserId(u.id);
    setUserDraft({
      name: u.name,
      email: u.email,
      area: u.area as Area,
      profileId: u.profileId as ProfileId,
      clearance: u.clearance as Clearance,
    });
    setUserDialogOpen(true);
  }

  function commitUser() {
    if (editingUserId) {
      setUserEdits((prev) => ({
        ...prev,
        [editingUserId]: {
          name: userDraft.name,
          email: userDraft.email,
          area: userDraft.area,
          profileId: userDraft.profileId,
          clearance: userDraft.clearance,
        },
      }));
      pushAudit({
        actor: "You (session)",
        action: "Permission change",
        target: userDraft.name,
        kind: "permission",
        detail: `Set ${userDraft.area} · ${profileLabel[userDraft.profileId] ?? userDraft.profileId} · ${CLEARANCE_LABEL[userDraft.clearance]} clearance.`,
      });
    } else {
      const id = `user-session-${Date.now()}`;
      setSessionUsers((prev) => [
        ...prev,
        {
          id,
          name: userDraft.name,
          email: userDraft.email,
          area: userDraft.area,
          profileId: userDraft.profileId,
          clearance: userDraft.clearance,
        },
      ]);
      pushAudit({
        actor: "You (session)",
        action: "Registered user",
        target: userDraft.name,
        kind: "user",
        detail: `New ${profileLabel[userDraft.profileId] ?? userDraft.profileId} in ${userDraft.area} with ${CLEARANCE_LABEL[userDraft.clearance]} clearance.`,
      });
    }
    setUserDialogOpen(false);
    setPendingUser(null);
    setEditingUserId(null);
  }

  function handleSaveUser() {
    const overPermissioned = CLEARANCE_RANK[userDraft.clearance] >= CLEARANCE_RANK.confidential;
    if (overPermissioned) {
      setPendingUser({ isEdit: !!editingUserId });
      return;
    }
    commitUser();
  }

  const draftValid = userDraft.name.trim().length > 0 && userDraft.email.trim().length > 0;

  // ---- Schedule create ----
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false);
  const [scheduleDraft, setScheduleDraft] = React.useState({
    template: "",
    frequency: "Weekly",
    languages: "es, en",
    owner: "",
    reviewFolder: "",
  });

  function commitSchedule() {
    const id = `sched-session-${Date.now()}`;
    setSessionSchedules((prev) => [
      ...prev,
      {
        id,
        template: scheduleDraft.template,
        frequency: scheduleDraft.frequency,
        languages: scheduleDraft.languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
        owner: scheduleDraft.owner,
        reviewFolder: scheduleDraft.reviewFolder,
        sourceDocId: null,
        sourceTitle: null,
        status: "active",
      },
    ]);
    pushAudit({
      actor: "You (session)",
      action: "Schedule created",
      target: scheduleDraft.template,
      kind: "schedule",
      detail: `Recurring ${scheduleDraft.frequency.toLowerCase()} document routed to ${scheduleDraft.reviewFolder || "review folder"}. Never auto-published.`,
    });
    setScheduleDialogOpen(false);
    setScheduleDraft({ template: "", frequency: "Weekly", languages: "es, en", owner: "", reviewFolder: "" });
  }

  const scheduleValid =
    scheduleDraft.template.trim().length > 0 && scheduleDraft.owner.trim().length > 0;

  // ---- Visibility matrix (resolved server-side by the real access engine) ----
  const [visibilityUserId, setVisibilityUserId] = React.useState<string>("");
  const effectiveVisibilityUserId =
    visibilityUserId || (seedUsers && seedUsers.length > 0 ? seedUsers[0].id : "");
  const { data: visibility, isLoading: visibilityLoading } = useGetUserVisibilityMatrix(
    effectiveVisibilityUserId,
    {
      query: {
        enabled: effectiveVisibilityUserId.length > 0,
        queryKey: ["visibility-matrix", effectiveVisibilityUserId],
      },
    },
  );

  // ---- KPI definitions (versioned, server-side store) ----
  const { data: kpiDefs, refetch: refetchKpiDefs } = useListKpiDefinitions({
    query: { queryKey: ["kpi-definitions"] },
  });
  const upsertKpi = useUpsertKpiDefinition();

  const latestOf = (r: KpiDefinitionRecord): KpiDefinitionVersion =>
    r.versions.find((v) => v.version === r.latestVersion) ?? r.versions[r.versions.length - 1];

  const { data: kpiOptions } = useListKpiDefinitionOptions({
    query: { queryKey: ["kpi-definition-options"] },
  });

  // kpiEditId: null = closed, "__new__" = create mode, otherwise the KPI id being edited.
  const [kpiEditId, setKpiEditId] = React.useState<string | null>(null);
  const [kpiHistoryId, setKpiHistoryId] = React.useState<string | null>(null);
  const emptyKpiDraft = {
    name: "",
    description: "",
    unit: "",
    target: "",
    owner: "",
    amberPct: "100",
    criticalPct: "92",
    confidentiality: "private",
    objectiveId: "",
    axisId: "",
    market: "",
    brand: "",
    initiativeType: "",
    direction: "higher-better",
    areas: [] as string[],
    sources: [] as KpiSourceConfig[],
    changeNote: "",
  };
  const [kpiDraft, setKpiDraft] = React.useState({ ...emptyKpiDraft });

  const kpiCreateMode = kpiEditId === "__new__";
  const kpiEditRecord = kpiCreateMode
    ? null
    : ((kpiDefs ?? []).find((r) => r.id === kpiEditId) ?? null);
  const kpiSheetOpen = kpiCreateMode || kpiEditRecord !== null;
  const kpiHistoryRecord = (kpiDefs ?? []).find((r) => r.id === kpiHistoryId) ?? null;

  function openKpiEdit(r: KpiDefinitionRecord) {
    const v = latestOf(r);
    setKpiDraft({
      name: v.name,
      description: v.description,
      unit: v.unit,
      target: String(v.target),
      owner: v.owner,
      amberPct: String(Math.round(v.thresholds.amberBelow * 100)),
      criticalPct: String(Math.round(v.thresholds.criticalBelow * 100)),
      confidentiality: v.confidentiality,
      objectiveId: v.objectiveId,
      axisId: v.axisId,
      market: v.market,
      brand: v.brand,
      initiativeType: v.initiativeType,
      direction: v.direction,
      areas: [...v.areas],
      sources: v.sources.map((s) => ({ ...s })),
      changeNote: "",
    });
    setKpiEditId(r.id);
  }

  function openKpiCreate() {
    setKpiDraft({
      ...emptyKpiDraft,
      objectiveId: kpiOptions?.objectives[0]?.id ?? "",
      axisId: kpiOptions?.axes[0]?.id ?? "",
      market: kpiOptions?.markets[0] ?? "",
      brand: kpiOptions?.brands[0] ?? "",
      initiativeType: kpiOptions?.initiativeTypes[0] ?? "",
      direction: kpiOptions?.directions[0] ?? "higher-better",
      areas: kpiOptions?.areas ? [kpiOptions.areas[0]] : [],
      sources: [
        {
          id: `src-custom-${Date.now()}`,
          label: "",
          kind: "external",
          weight: 1,
          docId: null,
          note: null,
          conflict: false,
        },
      ],
    });
    setKpiEditId("__new__");
  }

  const toggleKpiArea = (area: string) =>
    setKpiDraft((d) => ({
      ...d,
      areas: d.areas.includes(area) ? d.areas.filter((a) => a !== area) : [...d.areas, area],
    }));

  const updateKpiSource = (idx: number, patch: Partial<KpiSourceConfig>) =>
    setKpiDraft((d) => ({
      ...d,
      sources: d.sources.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));

  const removeKpiSource = (idx: number) =>
    setKpiDraft((d) => ({ ...d, sources: d.sources.filter((_, i) => i !== idx) }));

  const addKpiSource = () =>
    setKpiDraft((d) => ({
      ...d,
      sources: [
        ...d.sources,
        {
          id: `src-custom-${Date.now()}`,
          label: "",
          kind: "external",
          weight: 0.5,
          docId: null,
          note: null,
          conflict: false,
        },
      ],
    }));

  const kpiTarget = Number(kpiDraft.target);
  const kpiAmber = Number(kpiDraft.amberPct);
  const kpiCritical = Number(kpiDraft.criticalPct);
  const kpiSourcesValid =
    kpiDraft.sources.length > 0 &&
    kpiDraft.sources.every(
      (s) => s.label.trim().length > 0 && Number.isFinite(s.weight) && s.weight > 0 && s.weight <= 1,
    );
  const kpiDraftValid =
    kpiDraft.name.trim().length > 0 &&
    Number.isFinite(kpiTarget) &&
    kpiTarget > 0 &&
    Number.isFinite(kpiAmber) &&
    Number.isFinite(kpiCritical) &&
    kpiCritical > 0 &&
    kpiCritical <= kpiAmber &&
    kpiDraft.owner.trim().length > 0 &&
    kpiDraft.objectiveId.length > 0 &&
    kpiDraft.axisId.length > 0 &&
    kpiDraft.market.trim().length > 0 &&
    kpiDraft.brand.trim().length > 0 &&
    kpiDraft.areas.length > 0 &&
    kpiSourcesValid &&
    kpiDraft.changeNote.trim().length > 0;

  function commitKpiDefinition() {
    if (!kpiDraftValid || (!kpiCreateMode && !kpiEditRecord)) return;
    upsertKpi.mutate(
      {
        data: {
          id: kpiCreateMode ? null : kpiEditRecord!.id,
          name: kpiDraft.name.trim(),
          description: kpiDraft.description.trim(),
          unit: kpiDraft.unit.trim(),
          objectiveId: kpiDraft.objectiveId,
          axisId: kpiDraft.axisId,
          market: kpiDraft.market.trim(),
          brand: kpiDraft.brand.trim(),
          initiativeType: kpiDraft.initiativeType,
          confidentiality: kpiDraft.confidentiality,
          areas: kpiDraft.areas,
          direction: kpiDraft.direction,
          target: kpiTarget,
          thresholds: {
            amberBelow: kpiAmber / 100,
            criticalBelow: kpiCritical / 100,
          },
          owner: kpiDraft.owner.trim(),
          sources: kpiDraft.sources.map((s) => ({
            ...s,
            label: s.label.trim(),
            note: s.note?.trim() || null,
          })),
          editedBy: "You (session)",
          changeNote: kpiDraft.changeNote.trim(),
        },
      },
      {
        onSuccess: (updated) => {
          pushAudit({
            actor: "You (session)",
            action: kpiCreateMode ? "KPI definition created" : "KPI definition updated",
            target: kpiDraft.name.trim(),
            kind: "permission",
            detail: `Version ${updated.latestVersion}: target ${kpiTarget}${kpiDraft.unit}, amber below ${kpiAmber}%, critical below ${kpiCritical}%, owner ${kpiDraft.owner.trim()}. ${kpiDraft.changeNote.trim()}`,
          });
          setKpiEditId(null);
          refetchKpiDefs();
        },
      },
    );
  }

  return (
    <Box padding={24}>
      <Stack space={32}>
        {/* Header */}
        <Stack space={8}>
          <Title2>{t.title}</Title2>
          <div style={{ maxWidth: 768 }}>
            <Text3 regular color={skinVars.colors.textSecondary}>
              {t.intro}
            </Text3>
          </div>
        </Stack>

        {/* Access model explainer */}
        <Boxed>
          <Stack space={0}>
            <div
              style={{
                backgroundColor: skinVars.colors.brand,
                padding: 16,
                borderTopLeftRadius: skinVars.borderRadii.container,
                borderTopRightRadius: skinVars.borderRadii.container,
              }}
            >
              <Inline space={8} alignItems="center">
                <IconShieldCheckedOkRegular color={skinVars.colors.inverse} />
                <Text3 medium color={skinVars.colors.inverse}>
                  {t.accessBanner}
                </Text3>
              </Inline>
            </div>
            <Box padding={24}>
              <Grid columns={3} gap={16}>
                <Boxed>
                  <Box padding={20}>
                    <Stack space={4}>
                      <Text1 medium color={skinVars.colors.brand} transform="uppercase">
                        {t.setHere}
                      </Text1>
                      <Text3 medium color={skinVars.colors.textPrimary}>
                        {t.whoYouAre}
                      </Text3>
                      <Text2 regular color={skinVars.colors.textSecondary}>
                        {t.whoYouAreBody}
                      </Text2>
                    </Stack>
                  </Box>
                </Boxed>
                <Boxed>
                  <Box padding={20}>
                    <Stack space={4}>
                      <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                        {t.inherited}
                      </Text1>
                      <Text3 medium color={skinVars.colors.textPrimary}>
                        {t.howSensitive}
                      </Text3>
                      <Text2 regular color={skinVars.colors.textSecondary}>
                        {t.howSensitiveBody}
                      </Text2>
                    </Stack>
                  </Box>
                </Boxed>
                <Boxed>
                  <Box padding={20}>
                    <Stack space={4}>
                      <Inline space={4} alignItems="center">
                        <Text1 medium color={skinVars.colors.brand} transform="uppercase">
                          {t.effectiveAccess}
                        </Text1>
                        <IconArrowLineRightRegular size={14} color={skinVars.colors.brand} />
                      </Inline>
                      <Text3 medium color={skinVars.colors.textPrimary}>
                        {t.whatEachSees}
                      </Text3>
                      <Text2 regular color={skinVars.colors.textSecondary}>
                        {t.whatEachSeesBody}
                      </Text2>
                    </Stack>
                  </Box>
                </Boxed>
              </Grid>
            </Box>
          </Stack>
        </Boxed>

        {/* Profiles overview */}
        <Stack space={16}>
          <Inline space={8} alignItems="center">
            <IconLayersRegular color={skinVars.colors.brand} />
            <Title3>{t.accessProfiles}</Title3>
          </Inline>
          <Grid columns={4} gap={16}>
            {(profiles ?? []).map((p) => {
              const Icon = PROFILE_ICON[p.id as ProfileId] ?? IconShieldCheckedOkRegular;
              return (
                <Boxed key={p.id}>
                  <Box padding={20}>
                    <Stack space={12}>
                      <Inline space={8} alignItems="center">
                        <Circle size={36} backgroundColor={skinVars.colors.brandLow}>
                          <Icon size={20} color={skinVars.colors.brand} />
                        </Circle>
                        <Text3 medium color={skinVars.colors.textPrimary}>
                          {p.label}
                        </Text3>
                      </Inline>
                      <Text1 medium color={skinVars.colors.brand} transform="uppercase">
                        {p.scope}
                      </Text1>
                      <Text2 regular color={skinVars.colors.textSecondary}>
                        {p.detail}
                      </Text2>
                    </Stack>
                  </Box>
                </Boxed>
              );
            })}
          </Grid>
          <Text2 regular color={skinVars.colors.textSecondary}>
            {t.profilesNote}
          </Text2>
        </Stack>

        {/* Users */}
        <Stack space={16}>
          <Inline space="between" alignItems="center">
            <Inline space={8} alignItems="center">
              <IconUserAccountRegular color={skinVars.colors.brand} />
              <Title3>{t.platformUsers}</Title3>
            </Inline>
            <ButtonPrimary small onPress={openRegister} StartIcon={IconAddUserRegular}>
              {t.registerUser}
            </ButtonPrimary>
          </Inline>
          <Table
            heading={[t.colName, t.colArea, t.colProfile, t.colConfidentialityTier, ""]}
            content={users.map((u) => [
              <Stack space={2} key={`${u.id}-name`}>
                <Text2 medium color={skinVars.colors.textPrimary}>
                  {u.name}
                </Text2>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {u.email}
                </Text1>
              </Stack>,
              <Text2 regular color={skinVars.colors.textSecondary} key={`${u.id}-area`}>
                {u.area}
              </Text2>,
              <Text2 medium color={skinVars.colors.textPrimary} key={`${u.id}-profile`}>
                {profileLabel[u.profileId] ?? u.profileId}
              </Text2>,
              <Tag type={clearanceTagType(u.clearance)} key={`${u.id}-clearance`}>
                {t.clearanceLabels[u.clearance] ?? u.clearance}
              </Tag>,
              <ButtonLink small onPress={() => openEdit(u)} key={`${u.id}-edit`}>
                {t.edit}
              </ButtonLink>,
            ])}
          />
        </Stack>

        {/* Visibility matrix */}
        <Stack space={16}>
          <Inline space="between" alignItems="center">
            <Stack space={4}>
              <Inline space={8} alignItems="center">
                <IconEyeRegular color={skinVars.colors.brand} />
                <Title3>{t.visibilityTitle}</Title3>
              </Inline>
              <Text2 regular color={skinVars.colors.textSecondary}>
                {t.visibilityIntro}
              </Text2>
            </Stack>
            <div style={{ minWidth: 260 }}>
              <Select
                name="visibility-user"
                label={t.inspectUser}
                value={effectiveVisibilityUserId}
                onChangeValue={setVisibilityUserId}
                options={(seedUsers ?? []).map((u) => ({
                  value: u.id,
                  text: t.userSelectOption(
                    u.name,
                    u.area,
                    t.clearanceLabels[u.clearance] ?? u.clearance,
                  ),
                }))}
                fullWidth
              />
            </div>
          </Inline>
          {visibility && (
            <Callout
              variant="default"
              asset={<IconShieldCheckedOkRegular color={skinVars.colors.brand} />}
              title=""
              description={t.visibilitySummary(
                visibility.user.name,
                visibility.visibleCount,
                visibility.totalCount,
              )}
            />
          )}
          {visibilityLoading && !visibility && (
            <Text2 regular color={skinVars.colors.textSecondary}>
              {t.resolvingVisibility}
            </Text2>
          )}
          {visibility && (
            <Table
              heading={[t.colDocument, t.colConfidentiality, t.colAreaScope, t.colAccess, t.colWhy]}
              content={visibility.rows.map((r) => [
                <Stack space={2} key={`${r.docId}-doc`}>
                  <Text2 medium color={skinVars.colors.textPrimary}>
                    {r.title}
                  </Text2>
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    {r.type}
                  </Text1>
                </Stack>,
                <Tag type={clearanceTagType(r.confidentiality)} key={`${r.docId}-conf`}>
                  {t.clearanceLabels[r.confidentiality] ?? r.confidentiality}
                </Tag>,
                <Text2 regular color={skinVars.colors.textSecondary} key={`${r.docId}-areas`}>
                  {r.areas.length > 0 ? r.areas.join(" / ") : t.allAreas}
                </Text2>,
                <Tag
                  type={r.visible ? "success" : r.blockedBy === "clearance" ? "error" : "warning"}
                  key={`${r.docId}-access`}
                >
                  {r.visible
                    ? t.visible
                    : t.blockedBy(t.blockedAxisLabels[r.blockedBy ?? ""] ?? r.blockedBy)}
                </Tag>,
                <Text1 regular color={skinVars.colors.textSecondary} key={`${r.docId}-why`}>
                  {r.explanation}
                </Text1>,
              ])}
            />
          )}
        </Stack>

        {/* Scheduled documents */}
        <Stack space={16}>
          <Inline space="between" alignItems="center">
            <Inline space={8} alignItems="center">
              <IconCalendarRegular color={skinVars.colors.brand} />
              <Title3>{t.scheduledDocuments}</Title3>
            </Inline>
            <ButtonPrimary small onPress={() => setScheduleDialogOpen(true)} StartIcon={IconCalendarRegular}>
              {t.scheduleDocument}
            </ButtonPrimary>
          </Inline>
          <Callout
            variant="default"
            asset={<IconFolderRegular color={skinVars.colors.brand} />}
            title=""
            description={t.humanGate}
          />
          {orphanedCount > 0 && (
            <Callout
              variant="default"
              asset={<IconAlertRegular color={skinVars.colors.error} />}
              title=""
              description={t.orphanWarning(orphanedCount)}
            />
          )}
          <Table
            heading={[t.colTemplate, t.colFrequency, t.colLanguages, t.colOwner, t.colReviewFolder, t.colStatus]}
            content={schedules.map((s) => [
              <Stack space={2} key={`${s.id}-template`}>
                <Text2 medium color={skinVars.colors.textPrimary}>
                  {s.template}
                </Text2>
                {s.status === "orphaned" ? (
                  <Text1 medium color={skinVars.colors.error}>
                    {t.sourceMissing(s.sourceDocId ?? "")}
                  </Text1>
                ) : s.sourceTitle ? (
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    {t.sourcePrefix(s.sourceTitle)}
                  </Text1>
                ) : (
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    {t.noBoundSource}
                  </Text1>
                )}
              </Stack>,
              <Text2 regular color={skinVars.colors.textSecondary} key={`${s.id}-freq`}>
                {t.frequencyOptions[s.frequency] ?? s.frequency}
              </Text2>,
              <Inline space={4} wrap key={`${s.id}-langs`}>
                {s.languages.map((l) => (
                  <Tag type="inactive" key={l}>
                    {l}
                  </Tag>
                ))}
              </Inline>,
              <Text2 regular color={skinVars.colors.textSecondary} key={`${s.id}-owner`}>
                {s.owner}
              </Text2>,
              <Text2 regular color={skinVars.colors.textSecondary} key={`${s.id}-folder`}>
                {s.reviewFolder}
              </Text2>,
              <Tag type={scheduleTagType(s.status)} key={`${s.id}-status`}>
                {t.scheduleStatusLabels[s.status] ?? s.status}
              </Tag>,
            ])}
          />
        </Stack>

        {/* KPI definitions */}
        <Stack space={16}>
          <Inline space="between" alignItems="center">
            <Inline space={8} alignItems="center">
              <IconTargetRegular size={20} color={skinVars.colors.brand} />
              <Title3>{t.kpiDefinitions}</Title3>
            </Inline>
            <ButtonPrimary small onPress={openKpiCreate} StartIcon={IconTargetRegular}>
              {t.newKpi}
            </ButtonPrimary>
          </Inline>
          <Text2 regular color={skinVars.colors.textSecondary}>
            {t.kpiIntro}
          </Text2>
          <Table
            heading={[t.colKpi, t.colVersion, t.colTarget, t.colAmberBelow, t.colCriticalBelow, t.colOwner, t.colConfidentiality, ""]}
            content={(kpiDefs ?? []).map((r) => {
              const v = latestOf(r);
              return [
                <Stack space={2} key={`${r.id}-name`}>
                  <Text2 medium color={skinVars.colors.textPrimary}>
                    {v.name}
                  </Text2>
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    {v.market} · {v.brand}
                  </Text1>
                </Stack>,
                <Tag type={r.latestVersion > 1 ? "info" : "inactive"} key={`${r.id}-v`}>
                  {`v${r.latestVersion}`}
                </Tag>,
                <Text2 medium color={skinVars.colors.textPrimary} key={`${r.id}-target`}>
                  {v.target}
                  {v.unit}
                </Text2>,
                <Text2 regular color={skinVars.colors.textSecondary} key={`${r.id}-amber`}>
                  {Math.round(v.thresholds.amberBelow * 100)}%
                </Text2>,
                <Text2 regular color={skinVars.colors.textSecondary} key={`${r.id}-crit`}>
                  {Math.round(v.thresholds.criticalBelow * 100)}%
                </Text2>,
                <Text2 regular color={skinVars.colors.textSecondary} key={`${r.id}-owner`}>
                  {v.owner}
                </Text2>,
                <Tag type={clearanceTagType(v.confidentiality)} key={`${r.id}-conf`}>
                  {t.clearanceLabels[v.confidentiality] ?? v.confidentiality}
                </Tag>,
                <Inline space={8} alignItems="center" key={`${r.id}-actions`}>
                  <ButtonLink small onPress={() => openKpiEdit(r)}>
                    {t.edit}
                  </ButtonLink>
                  <ButtonLink small onPress={() => setKpiHistoryId(r.id)}>
                    {t.history}
                  </ButtonLink>
                </Inline>,
              ];
            })}
          />
        </Stack>

        {/* Cost model */}
        <CostModelSection />

        {/* Source-system sync (D5) */}
        <SourceSyncSection />

        {/* Retrieval audit log (F3) */}
        <RetrievalLogSection />

        {/* Audit trail */}
        <Stack space={16}>
          <Stack space={4}>
            <Inline space={8} alignItems="center">
              <IconListRegular color={skinVars.colors.brand} />
              <Title3>{t.auditTrail}</Title3>
            </Inline>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {t.auditIntro}
            </Text2>
          </Stack>
          <Table
            heading={[t.colWhen, t.colActor, t.colAction, t.colTargetHdr, t.colDetail]}
            content={auditEntries.map((a) => [
              <Text2 regular color={skinVars.colors.textSecondary} key={`${a.id}-when`}>
                {formatTimestamp(a.timestamp, lang)}
              </Text2>,
              <Text2 medium color={skinVars.colors.textPrimary} key={`${a.id}-actor`}>
                {a.actor}
              </Text2>,
              <Tag type={auditTagType(a.kind)} key={`${a.id}-action`}>
                {a.action}
              </Tag>,
              <Text2 medium color={skinVars.colors.textPrimary} key={`${a.id}-target`}>
                {a.target}
              </Text2>,
              <Text2 regular color={skinVars.colors.textSecondary} key={`${a.id}-detail`}>
                {a.detail}
              </Text2>,
            ])}
          />
        </Stack>
      </Stack>

      {/* Register / Edit user dialog */}
      {userDialogOpen && (
        <Sheet onClose={() => setUserDialogOpen(false)}>
          {({ closeModal }) => (
            <Box paddingBottom={24}>
              <Stack space={16}>
                <Stack space={4}>
                  <Title2>{editingUserId ? t.editUser : t.registerUser}</Title2>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {t.userDialogIntro}
                  </Text2>
                </Stack>
                <Grid columns={2} gap={16}>
                  <TextField
                    name="user-name"
                    label={t.colName}
                    value={userDraft.name}
                    onChangeValue={(v) => setUserDraft({ ...userDraft, name: v })}
                    fullWidth
                  />
                  <TextField
                    name="user-email"
                    label={t.fieldEmail}
                    value={userDraft.email}
                    onChangeValue={(v) => setUserDraft({ ...userDraft, email: v })}
                    fullWidth
                  />
                </Grid>
                <Grid columns={2} gap={16}>
                  <Select
                    name="user-area"
                    label={t.colArea}
                    value={userDraft.area}
                    onChangeValue={(v) => setUserDraft({ ...userDraft, area: v as Area })}
                    options={AREAS.map((a) => ({ value: a, text: a }))}
                    fullWidth
                  />
                  <Select
                    name="user-profile"
                    label={t.colProfile}
                    value={userDraft.profileId}
                    onChangeValue={(v) => setUserDraft({ ...userDraft, profileId: v as ProfileId })}
                    options={(profiles ?? []).map((p) => ({ value: p.id, text: p.label }))}
                    fullWidth
                  />
                </Grid>
                <Select
                  name="user-clearance"
                  label={t.confidentialityTierMax}
                  value={userDraft.clearance}
                  onChangeValue={(v) => setUserDraft({ ...userDraft, clearance: v as Clearance })}
                  options={CLEARANCES.map((c) => ({ value: c, text: t.clearanceLabels[c] ?? c }))}
                  fullWidth
                />

                {/* Effective access preview */}
                <Boxed>
                  <Box padding={16}>
                    <Stack space={8}>
                      <Text1 medium color={skinVars.colors.brand} transform="uppercase">
                        {t.effectiveAccessPreview}
                      </Text1>
                      <Text2 regular color={skinVars.colors.textSecondary}>
                        {t.previewIn}
                        <Text2 as="span" medium color={skinVars.colors.textPrimary}>
                          {userDraft.area}
                        </Text2>
                        {t.previewAs}
                        <Text2 as="span" medium color={skinVars.colors.textPrimary}>
                          {profileLabel[userDraft.profileId] ?? userDraft.profileId}
                        </Text2>
                        {t.previewMid}
                        <Text2 as="span" medium color={skinVars.colors.textPrimary}>
                          {t.clearanceLabels[userDraft.clearance] ?? userDraft.clearance}
                        </Text2>
                        {t.previewSuffix}
                      </Text2>
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        {t.appliedAtRetrieval}
                      </Text1>
                    </Stack>
                  </Box>
                </Boxed>

                <Inline space={16} alignItems="center">
                  <ButtonPrimary disabled={!draftValid} onPress={handleSaveUser}>
                    {editingUserId ? t.saveChanges : t.registerUser}
                  </ButtonPrimary>
                  <ButtonSecondary onPress={closeModal}>{t.cancel}</ButtonSecondary>
                </Inline>
              </Stack>
            </Box>
          )}
        </Sheet>
      )}

      {/* Over-permissioning confirmation */}
      {pendingUser && (
        <Sheet onClose={() => setPendingUser(null)}>
          {({ closeModal }) => (
            <Box paddingBottom={24}>
              <Stack space={16}>
                <Inline space={8} alignItems="center">
                  <IconAlertRegular color={skinVars.colors.warning} />
                  <Title2>{t.confirmElevated}</Title2>
                </Inline>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {t.elevatedPre}
                  <Text2 as="span" medium color={skinVars.colors.textPrimary}>
                    {t.clearanceLabels[userDraft.clearance] ?? userDraft.clearance}
                  </Text2>
                  {t.elevatedMid1}
                  {t.clearanceLabels[userDraft.clearance] ?? userDraft.clearance}
                  {t.elevatedMid2}
                  {userDraft.name || t.thisUser}
                  {t.elevatedPost}
                </Text2>
                <Inline space={16} alignItems="center">
                  <ButtonPrimary onPress={commitUser}>{t.grantAccess}</ButtonPrimary>
                  <ButtonSecondary onPress={closeModal}>{t.cancel}</ButtonSecondary>
                </Inline>
              </Stack>
            </Box>
          )}
        </Sheet>
      )}

      {/* KPI definition create/edit dialog (appends a new version) */}
      {kpiSheetOpen && (
        <Sheet onClose={() => setKpiEditId(null)}>
          {({ closeModal }) => (
            <Box paddingBottom={24}>
              <Stack space={16}>
                <Stack space={4}>
                  <Title2>{kpiCreateMode ? t.newKpiDefinition : t.editKpiDefinition}</Title2>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {kpiCreateMode
                      ? t.kpiCreateIntro
                      : t.kpiEditIntro((kpiEditRecord?.latestVersion ?? 0) + 1)}
                  </Text2>
                </Stack>
                <TextField
                  name="kpi-name"
                  label={t.colName}
                  value={kpiDraft.name}
                  onChangeValue={(v) => setKpiDraft({ ...kpiDraft, name: v })}
                  fullWidth
                />
                <TextField
                  name="kpi-description"
                  label={t.fieldDescription}
                  value={kpiDraft.description}
                  onChangeValue={(v) => setKpiDraft({ ...kpiDraft, description: v })}
                  fullWidth
                />
                <Grid columns={2} gap={16}>
                  <TextField
                    name="kpi-target"
                    label={t.colTarget}
                    value={kpiDraft.target}
                    onChangeValue={(v) => setKpiDraft({ ...kpiDraft, target: v })}
                    fullWidth
                  />
                  <TextField
                    name="kpi-unit"
                    label={t.fieldUnit}
                    value={kpiDraft.unit}
                    onChangeValue={(v) => setKpiDraft({ ...kpiDraft, unit: v })}
                    fullWidth
                  />
                </Grid>
                <Grid columns={2} gap={16}>
                  <TextField
                    name="kpi-amber"
                    label={t.fieldAmber}
                    value={kpiDraft.amberPct}
                    onChangeValue={(v) => setKpiDraft({ ...kpiDraft, amberPct: v })}
                    fullWidth
                  />
                  <TextField
                    name="kpi-critical"
                    label={t.fieldCritical}
                    value={kpiDraft.criticalPct}
                    onChangeValue={(v) => setKpiDraft({ ...kpiDraft, criticalPct: v })}
                    fullWidth
                  />
                </Grid>
                <Grid columns={2} gap={16}>
                  <TextField
                    name="kpi-owner"
                    label={t.fieldOwner}
                    value={kpiDraft.owner}
                    onChangeValue={(v) => setKpiDraft({ ...kpiDraft, owner: v })}
                    fullWidth
                  />
                  <Select
                    name="kpi-confidentiality"
                    label={t.fieldConfidentiality}
                    value={kpiDraft.confidentiality}
                    onChangeValue={(v) => setKpiDraft({ ...kpiDraft, confidentiality: v })}
                    options={CLEARANCES.map((c) => ({ value: c, text: t.clearanceLabels[c] ?? c }))}
                    fullWidth
                  />
                </Grid>
                <Grid columns={2} gap={16}>
                  <Select
                    name="kpi-objective"
                    label={t.fieldObjective}
                    value={kpiDraft.objectiveId}
                    onChangeValue={(v) => setKpiDraft({ ...kpiDraft, objectiveId: v })}
                    options={(kpiOptions?.objectives ?? []).map((o) => ({
                      value: o.id,
                      text: t.objectiveOption(o.name, o.area),
                    }))}
                    fullWidth
                  />
                  <Select
                    name="kpi-axis"
                    label={t.fieldAxis}
                    value={kpiDraft.axisId}
                    onChangeValue={(v) => setKpiDraft({ ...kpiDraft, axisId: v })}
                    options={(kpiOptions?.axes ?? []).map((a) => ({ value: a.id, text: a.name }))}
                    fullWidth
                  />
                </Grid>
                <Grid columns={2} gap={16}>
                  <Select
                    name="kpi-market"
                    label={t.fieldMarket}
                    value={kpiDraft.market}
                    onChangeValue={(v) => setKpiDraft({ ...kpiDraft, market: v })}
                    options={(kpiOptions?.markets ?? []).map((m) => ({ value: m, text: m }))}
                    fullWidth
                  />
                  <Select
                    name="kpi-brand"
                    label={t.fieldBrand}
                    value={kpiDraft.brand}
                    onChangeValue={(v) => setKpiDraft({ ...kpiDraft, brand: v })}
                    options={(kpiOptions?.brands ?? []).map((b) => ({ value: b, text: b }))}
                    fullWidth
                  />
                </Grid>
                <Grid columns={2} gap={16}>
                  <Select
                    name="kpi-initiative-type"
                    label={t.fieldInitiativeType}
                    value={kpiDraft.initiativeType}
                    onChangeValue={(v) => setKpiDraft({ ...kpiDraft, initiativeType: v })}
                    options={(kpiOptions?.initiativeTypes ?? []).map((it) => ({ value: it, text: it }))}
                    fullWidth
                  />
                  <Select
                    name="kpi-direction"
                    label={t.fieldDirection}
                    value={kpiDraft.direction}
                    onChangeValue={(v) => setKpiDraft({ ...kpiDraft, direction: v })}
                    options={(kpiOptions?.directions ?? ["higher-better", "lower-better"]).map(
                      (dir) => ({
                        value: dir,
                        text: dir === "higher-better" ? t.directionHigher : t.directionLower,
                      }),
                    )}
                    fullWidth
                  />
                </Grid>
                <Stack space={8}>
                  <Text2 medium color={skinVars.colors.textPrimary}>
                    {t.visibleToAreas}
                  </Text2>
                  <Inline space={16} alignItems="center">
                    {(kpiOptions?.areas ?? []).map((area) => (
                      <Checkbox
                        key={area}
                        name={`kpi-area-${area}`}
                        checked={kpiDraft.areas.includes(area)}
                        onChange={() => toggleKpiArea(area)}
                      >
                        <Text2 regular color={skinVars.colors.textPrimary}>
                          {area}
                        </Text2>
                      </Checkbox>
                    ))}
                  </Inline>
                  {kpiDraft.areas.length === 0 && (
                    <Text1 regular color={skinVars.colors.error}>
                      {t.selectAtLeastOneArea}
                    </Text1>
                  )}
                </Stack>
                <Stack space={8}>
                  <Inline space="between" alignItems="center">
                    <Text2 medium color={skinVars.colors.textPrimary}>
                      {t.sourcesAndWeights}
                    </Text2>
                    <ButtonLink small onPress={addKpiSource}>
                      {t.addSource}
                    </ButtonLink>
                  </Inline>
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    {t.weightsHelp}
                  </Text1>
                  {kpiDraft.sources.map((s, idx) => (
                    <Boxed key={s.id}>
                      <Box padding={12}>
                        <Stack space={12}>
                          <Inline space="between" alignItems="center">
                            <Inline space={8} alignItems="center">
                              <Tag type={s.kind === "internal" ? "info" : "inactive"}>{t.sourceKindLabels[s.kind] ?? s.kind}</Tag>
                              {s.docId && (
                                <Text1 regular color={skinVars.colors.textSecondary}>
                                  {t.linkedDocument(s.docId)}
                                </Text1>
                              )}
                            </Inline>
                            {kpiDraft.sources.length > 1 && (
                              <ButtonLink small onPress={() => removeKpiSource(idx)}>
                                {t.remove}
                              </ButtonLink>
                            )}
                          </Inline>
                          <Grid columns={2} gap={16}>
                            <TextField
                              name={`kpi-source-label-${idx}`}
                              label={t.fieldLabel}
                              value={s.label}
                              onChangeValue={(v) => updateKpiSource(idx, { label: v })}
                              fullWidth
                            />
                            <TextField
                              name={`kpi-source-weight-${idx}`}
                              label={t.fieldWeight}
                              value={String(s.weight)}
                              onChangeValue={(v) =>
                                updateKpiSource(idx, { weight: Number(v) })
                              }
                              fullWidth
                            />
                          </Grid>
                          {!s.docId && (
                            <TextField
                              name={`kpi-source-note-${idx}`}
                              label={t.fieldNoteOptional}
                              value={s.note ?? ""}
                              onChangeValue={(v) => updateKpiSource(idx, { note: v || null })}
                              fullWidth
                            />
                          )}
                        </Stack>
                      </Box>
                    </Boxed>
                  ))}
                  {!kpiSourcesValid && (
                    <Text1 regular color={skinVars.colors.error}>
                      {t.sourcesInvalid}
                    </Text1>
                  )}
                </Stack>
                <TextField
                  name="kpi-change-note"
                  label={t.fieldChangeNote}
                  value={kpiDraft.changeNote}
                  onChangeValue={(v) => setKpiDraft({ ...kpiDraft, changeNote: v })}
                  fullWidth
                />
                <Inline space={16} alignItems="center">
                  <ButtonPrimary
                    disabled={!kpiDraftValid || upsertKpi.isPending}
                    onPress={commitKpiDefinition}
                  >
                    {kpiCreateMode
                      ? t.createKpi
                      : t.saveAsVersion((kpiEditRecord?.latestVersion ?? 0) + 1)}
                  </ButtonPrimary>
                  <ButtonSecondary onPress={closeModal}>{t.cancel}</ButtonSecondary>
                </Inline>
              </Stack>
            </Box>
          )}
        </Sheet>
      )}

      {/* KPI definition version history */}
      {kpiHistoryRecord && (
        <Sheet onClose={() => setKpiHistoryId(null)}>
          {() => (
            <Box paddingBottom={24}>
              <Stack space={16}>
                <Stack space={4}>
                  <Title2>{t.versionHistory}</Title2>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {t.historyIntro(latestOf(kpiHistoryRecord).name)}
                  </Text2>
                </Stack>
                {[...kpiHistoryRecord.versions]
                  .sort((a, b) => b.version - a.version)
                  .map((v) => (
                    <div
                      key={v.version}
                      style={{
                        border: `1px solid ${skinVars.colors.divider}`,
                        borderRadius: skinVars.borderRadii.container,
                        backgroundColor:
                          v.version === kpiHistoryRecord.latestVersion
                            ? skinVars.colors.backgroundContainer
                            : skinVars.colors.backgroundAlternative,
                        padding: 16,
                      }}
                    >
                      <Stack space={8}>
                        <Inline space={8} alignItems="center" wrap>
                          <Tag
                            type={
                              v.version === kpiHistoryRecord.latestVersion ? "success" : "inactive"
                            }
                          >
                            {`v${v.version}${v.version === kpiHistoryRecord.latestVersion ? ` · ${t.live}` : ""}`}
                          </Tag>
                          <Text2 medium color={skinVars.colors.textPrimary}>
                            {v.name}
                          </Text2>
                          <div style={{ marginLeft: "auto" }}>
                            <Inline space={4} alignItems="center">
                              <IconTimeRegular size={12} color={skinVars.colors.textSecondary} />
                              <Text1 regular color={skinVars.colors.textSecondary}>
                                {formatTimestamp(v.editedAt, lang)}
                              </Text1>
                            </Inline>
                          </div>
                        </Inline>
                        <Text2 regular color={skinVars.colors.textSecondary}>
                          {t.versionSummary(
                            v.target,
                            v.unit,
                            Math.round(v.thresholds.amberBelow * 100),
                            Math.round(v.thresholds.criticalBelow * 100),
                            v.owner,
                            t.clearanceLabels[v.confidentiality] ?? v.confidentiality,
                          )}
                        </Text2>
                        <Text1 regular color={skinVars.colors.textSecondary}>
                          {v.editedBy}: {v.changeNote}
                        </Text1>
                      </Stack>
                    </div>
                  ))}
              </Stack>
            </Box>
          )}
        </Sheet>
      )}

      {/* Schedule document dialog */}
      {scheduleDialogOpen && (
        <Sheet onClose={() => setScheduleDialogOpen(false)}>
          {({ closeModal }) => (
            <Box paddingBottom={24}>
              <Stack space={16}>
                <Stack space={4}>
                  <Title2>{t.scheduleDialogTitle}</Title2>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {t.scheduleDialogIntro}
                  </Text2>
                </Stack>
                <TextField
                  name="sched-template"
                  label={t.fieldTemplate}
                  value={scheduleDraft.template}
                  onChangeValue={(v) => setScheduleDraft({ ...scheduleDraft, template: v })}
                  fullWidth
                />
                <Grid columns={2} gap={16}>
                  <Select
                    name="sched-frequency"
                    label={t.fieldFrequency}
                    value={scheduleDraft.frequency}
                    onChangeValue={(v) => setScheduleDraft({ ...scheduleDraft, frequency: v })}
                    options={["Daily", "Weekly", "Monthly", "Quarterly"].map((f) => ({
                      value: f,
                      text: t.frequencyOptions[f] ?? f,
                    }))}
                    fullWidth
                  />
                  <TextField
                    name="sched-langs"
                    label={t.colLanguages}
                    value={scheduleDraft.languages}
                    onChangeValue={(v) => setScheduleDraft({ ...scheduleDraft, languages: v })}
                    fullWidth
                  />
                </Grid>
                <TextField
                  name="sched-owner"
                  label={t.colOwner}
                  value={scheduleDraft.owner}
                  onChangeValue={(v) => setScheduleDraft({ ...scheduleDraft, owner: v })}
                  fullWidth
                />
                <TextField
                  name="sched-folder"
                  label={t.fieldReviewFolder}
                  value={scheduleDraft.reviewFolder}
                  onChangeValue={(v) => setScheduleDraft({ ...scheduleDraft, reviewFolder: v })}
                  fullWidth
                />
                <Inline space={16} alignItems="center">
                  <ButtonPrimary disabled={!scheduleValid} onPress={commitSchedule}>
                    {t.createSchedule}
                  </ButtonPrimary>
                  <ButtonSecondary onPress={closeModal}>{t.cancel}</ButtonSecondary>
                </Inline>
              </Stack>
            </Box>
          )}
        </Sheet>
      )}
    </Box>
  );
}
