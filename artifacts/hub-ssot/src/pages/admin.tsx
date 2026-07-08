import React from "react";
import {
  useListAdminProfiles,
  useListPlatformUsers,
  useListScheduledDocuments,
  useListAuditEntries,
  useGetUserVisibilityMatrix,
  PlatformUser,
  ScheduledDocument,
  AuditEntry,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
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
} from "@telefonica/mistica";

type IconType = (props: { size?: number; color?: string }) => React.ReactElement;
type Area = "Comunicación" | "Marca" | "Gabinete";
type Clearance = "public" | "internal" | "confidential" | "restricted";
type ProfileId = "superadmin" | "admin" | "editor" | "audit";

type TagType = "promo" | "info" | "active" | "inactive" | "success" | "warning" | "error";

const AREAS: Area[] = ["Comunicación", "Marca", "Gabinete"];
const CLEARANCES: Clearance[] = ["public", "internal", "confidential", "restricted"];
const CLEARANCE_RANK: Record<Clearance, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
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
    case "internal":
      return "info";
    case "confidential":
      return "warning";
    case "restricted":
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

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
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
  clearance: "internal" as Clearance,
};

export default function AdminPage() {
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
        detail: `Set ${userDraft.area} · ${profileLabel[userDraft.profileId] ?? userDraft.profileId} · ${userDraft.clearance} clearance.`,
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
        detail: `New ${profileLabel[userDraft.profileId] ?? userDraft.profileId} in ${userDraft.area} with ${userDraft.clearance} clearance.`,
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

  return (
    <Box padding={24}>
      <Stack space={32}>
        {/* Header */}
        <Stack space={8}>
          <Title2>Administration</Title2>
          <div style={{ maxWidth: 768 }}>
            <Text3 regular color={skinVars.colors.textSecondary}>
              Run the platform without a vendor: register users, assign profiles, manage permissions
              by area and confidentiality, and schedule recurring documents. This is the backend that
              proves the platform is operable after implementation.
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
                  Access = area × confidentiality
                </Text3>
              </Inline>
            </div>
            <Box padding={24}>
              <Grid columns={3} gap={16}>
                <Boxed>
                  <Box padding={20}>
                    <Stack space={4}>
                      <Text1 medium color={skinVars.colors.brand} transform="uppercase">
                        Set here
                      </Text1>
                      <Text3 medium color={skinVars.colors.textPrimary}>
                        Who you are
                      </Text3>
                      <Text2 regular color={skinVars.colors.textSecondary}>
                        User → area (Comunicación / Marca / Gabinete) and profile. Managed on this
                        page.
                      </Text2>
                    </Stack>
                  </Box>
                </Boxed>
                <Boxed>
                  <Box padding={20}>
                    <Stack space={4}>
                      <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                        Inherited
                      </Text1>
                      <Text3 medium color={skinVars.colors.textPrimary}>
                        How sensitive the content is
                      </Text3>
                      <Text2 regular color={skinVars.colors.textSecondary}>
                        Confidentiality label inherited from each document's Microsoft sensitivity
                        label — not set here.
                      </Text2>
                    </Stack>
                  </Box>
                </Boxed>
                <Boxed>
                  <Box padding={20}>
                    <Stack space={4}>
                      <Inline space={4} alignItems="center">
                        <Text1 medium color={skinVars.colors.brand} transform="uppercase">
                          Effective access
                        </Text1>
                        <IconArrowLineRightRegular size={14} color={skinVars.colors.brand} />
                      </Inline>
                      <Text3 medium color={skinVars.colors.textPrimary}>
                        What each person sees
                      </Text3>
                      <Text2 regular color={skinVars.colors.textSecondary}>
                        Enforced at the index (early-binding) — the model never sees a chunk the user
                        cannot access.
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
            <Title3>Access profiles</Title3>
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
            Profiles can be added or unified as the organisation evolves — the four above are the RFP
            baseline, not a fixed ceiling.
          </Text2>
        </Stack>

        {/* Users */}
        <Stack space={16}>
          <Inline space="between" alignItems="center">
            <Inline space={8} alignItems="center">
              <IconUserAccountRegular color={skinVars.colors.brand} />
              <Title3>Platform users</Title3>
            </Inline>
            <ButtonPrimary small onPress={openRegister} StartIcon={IconAddUserRegular}>
              Register user
            </ButtonPrimary>
          </Inline>
          <Table
            heading={["Name", "Area", "Profile", "Confidentiality tier", ""]}
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
                {u.clearance}
              </Tag>,
              <ButtonLink small onPress={() => openEdit(u)} key={`${u.id}-edit`}>
                Edit
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
                <Title3>Document visibility by user</Title3>
              </Inline>
              <Text2 regular color={skinVars.colors.textSecondary}>
                Resolved live by the same access engine that filters retrieval — area and
                confidentiality intersect, and every blocked row names which axis blocks it.
              </Text2>
            </Stack>
            <div style={{ minWidth: 260 }}>
              <Select
                name="visibility-user"
                label="Inspect user"
                value={effectiveVisibilityUserId}
                onChangeValue={setVisibilityUserId}
                options={(seedUsers ?? []).map((u) => ({
                  value: u.id,
                  text: `${u.name} — ${u.area} · ${u.clearance}`,
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
              description={`${visibility.user.name} can see ${visibility.visibleCount} of ${visibility.totalCount} governed documents. The rest never reach the model for this user.`}
            />
          )}
          {visibilityLoading && !visibility && (
            <Text2 regular color={skinVars.colors.textSecondary}>
              Resolving visibility…
            </Text2>
          )}
          {visibility && (
            <Table
              heading={["Document", "Confidentiality", "Area scope", "Access", "Why"]}
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
                  {r.confidentiality}
                </Tag>,
                <Text2 regular color={skinVars.colors.textSecondary} key={`${r.docId}-areas`}>
                  {r.areas.length > 0 ? r.areas.join(" / ") : "All areas"}
                </Text2>,
                <Tag
                  type={r.visible ? "success" : r.blockedBy === "clearance" ? "error" : "warning"}
                  key={`${r.docId}-access`}
                >
                  {r.visible ? "visible" : `blocked · ${r.blockedBy}`}
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
              <Title3>Scheduled documents</Title3>
            </Inline>
            <ButtonPrimary small onPress={() => setScheduleDialogOpen(true)} StartIcon={IconCalendarRegular}>
              Schedule document
            </ButtonPrimary>
          </Inline>
          <Callout
            variant="default"
            asset={<IconFolderRegular color={skinVars.colors.brand} />}
            title=""
            description="Human gate: every generated document lands in the owner's review folder and never auto-publishes. A person always reviews before anything is released."
          />
          {orphanedCount > 0 && (
            <Callout
              variant="default"
              asset={<IconAlertRegular color={skinVars.colors.error} />}
              title=""
              description={`${orphanedCount} schedule${orphanedCount > 1 ? "s are" : " is"} orphaned — the source document is missing. These are flagged rather than run silently, so no output is generated from a broken source.`}
            />
          )}
          <Table
            heading={["Template", "Frequency", "Language(s)", "Owner", "Review folder", "Status"]}
            content={schedules.map((s) => [
              <Stack space={2} key={`${s.id}-template`}>
                <Text2 medium color={skinVars.colors.textPrimary}>
                  {s.template}
                </Text2>
                {s.status === "orphaned" ? (
                  <Text1 medium color={skinVars.colors.error}>
                    Source missing: {s.sourceDocId}
                  </Text1>
                ) : s.sourceTitle ? (
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    Source: {s.sourceTitle}
                  </Text1>
                ) : (
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    No bound source
                  </Text1>
                )}
              </Stack>,
              <Text2 regular color={skinVars.colors.textSecondary} key={`${s.id}-freq`}>
                {s.frequency}
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
                {s.status}
              </Tag>,
            ])}
          />
        </Stack>

        {/* Audit trail */}
        <Stack space={16}>
          <Stack space={4}>
            <Inline space={8} alignItems="center">
              <IconListRegular color={skinVars.colors.brand} />
              <Title3>Audit trail</Title3>
            </Inline>
            <Text2 regular color={skinVars.colors.textSecondary}>
              Read-only — this is exactly what the Audit profile sees: every permission change and
              scheduled run, with actor, target and time.
            </Text2>
          </Stack>
          <Table
            heading={["When", "Actor", "Action", "Target", "Detail"]}
            content={auditEntries.map((a) => [
              <Text2 regular color={skinVars.colors.textSecondary} key={`${a.id}-when`}>
                {formatTimestamp(a.timestamp)}
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
                  <Title2>{editingUserId ? "Edit user" : "Register user"}</Title2>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    Set who the person is — area and profile. Confidentiality is enforced at the
                    index from inherited document labels.
                  </Text2>
                </Stack>
                <Grid columns={2} gap={16}>
                  <TextField
                    name="user-name"
                    label="Name"
                    value={userDraft.name}
                    onChangeValue={(v) => setUserDraft({ ...userDraft, name: v })}
                    fullWidth
                  />
                  <TextField
                    name="user-email"
                    label="Email"
                    value={userDraft.email}
                    onChangeValue={(v) => setUserDraft({ ...userDraft, email: v })}
                    fullWidth
                  />
                </Grid>
                <Grid columns={2} gap={16}>
                  <Select
                    name="user-area"
                    label="Area"
                    value={userDraft.area}
                    onChangeValue={(v) => setUserDraft({ ...userDraft, area: v as Area })}
                    options={AREAS.map((a) => ({ value: a, text: a }))}
                    fullWidth
                  />
                  <Select
                    name="user-profile"
                    label="Profile"
                    value={userDraft.profileId}
                    onChangeValue={(v) => setUserDraft({ ...userDraft, profileId: v as ProfileId })}
                    options={(profiles ?? []).map((p) => ({ value: p.id, text: p.label }))}
                    fullWidth
                  />
                </Grid>
                <Select
                  name="user-clearance"
                  label="Confidentiality tier (max access)"
                  value={userDraft.clearance}
                  onChangeValue={(v) => setUserDraft({ ...userDraft, clearance: v as Clearance })}
                  options={CLEARANCES.map((c) => ({ value: c, text: c }))}
                  fullWidth
                />

                {/* Effective access preview */}
                <Boxed>
                  <Box padding={16}>
                    <Stack space={8}>
                      <Text1 medium color={skinVars.colors.brand} transform="uppercase">
                        Effective access preview
                      </Text1>
                      <Text2 regular color={skinVars.colors.textSecondary}>
                        In{" "}
                        <Text2 as="span" medium color={skinVars.colors.textPrimary}>
                          {userDraft.area}
                        </Text2>
                        , as{" "}
                        <Text2 as="span" medium color={skinVars.colors.textPrimary}>
                          {profileLabel[userDraft.profileId] ?? userDraft.profileId}
                        </Text2>
                        , this person would see documents in their area up to and including{" "}
                        <Text2 as="span" medium color={skinVars.colors.textPrimary}>
                          {userDraft.clearance}
                        </Text2>{" "}
                        sensitivity.
                      </Text2>
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        Applied at retrieval (early-binding). Higher-sensitivity documents stay
                        invisible.
                      </Text1>
                    </Stack>
                  </Box>
                </Boxed>

                <Inline space={16} alignItems="center">
                  <ButtonPrimary disabled={!draftValid} onPress={handleSaveUser}>
                    {editingUserId ? "Save changes" : "Register user"}
                  </ButtonPrimary>
                  <ButtonSecondary onPress={closeModal}>Cancel</ButtonSecondary>
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
                  <Title2>Confirm elevated access</Title2>
                </Inline>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  Granting{" "}
                  <Text2 as="span" medium color={skinVars.colors.textPrimary}>
                    {userDraft.clearance}
                  </Text2>{" "}
                  access exposes sensitive material — for example, Finance-DE {userDraft.clearance}{" "}
                  documents — to {userDraft.name || "this user"}. This widens what they can see across
                  their area. Continue?
                </Text2>
                <Inline space={16} alignItems="center">
                  <ButtonPrimary onPress={commitUser}>Grant access</ButtonPrimary>
                  <ButtonSecondary onPress={closeModal}>Cancel</ButtonSecondary>
                </Inline>
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
                  <Title2>Schedule document</Title2>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    Define a recurring document. Output always lands in the review folder and never
                    auto-publishes.
                  </Text2>
                </Stack>
                <TextField
                  name="sched-template"
                  label="Template"
                  value={scheduleDraft.template}
                  onChangeValue={(v) => setScheduleDraft({ ...scheduleDraft, template: v })}
                  fullWidth
                />
                <Grid columns={2} gap={16}>
                  <Select
                    name="sched-frequency"
                    label="Frequency"
                    value={scheduleDraft.frequency}
                    onChangeValue={(v) => setScheduleDraft({ ...scheduleDraft, frequency: v })}
                    options={["Daily", "Weekly", "Monthly", "Quarterly"].map((f) => ({
                      value: f,
                      text: f,
                    }))}
                    fullWidth
                  />
                  <TextField
                    name="sched-langs"
                    label="Language(s)"
                    value={scheduleDraft.languages}
                    onChangeValue={(v) => setScheduleDraft({ ...scheduleDraft, languages: v })}
                    fullWidth
                  />
                </Grid>
                <TextField
                  name="sched-owner"
                  label="Owner"
                  value={scheduleDraft.owner}
                  onChangeValue={(v) => setScheduleDraft({ ...scheduleDraft, owner: v })}
                  fullWidth
                />
                <TextField
                  name="sched-folder"
                  label="Review folder"
                  value={scheduleDraft.reviewFolder}
                  onChangeValue={(v) => setScheduleDraft({ ...scheduleDraft, reviewFolder: v })}
                  fullWidth
                />
                <Inline space={16} alignItems="center">
                  <ButtonPrimary disabled={!scheduleValid} onPress={commitSchedule}>
                    Create schedule
                  </ButtonPrimary>
                  <ButtonSecondary onPress={closeModal}>Cancel</ButtonSecondary>
                </Inline>
              </Stack>
            </Box>
          )}
        </Sheet>
      )}
    </Box>
  );
}
