import React, { useMemo, useState } from "react";
import {
  useListAdminProfiles,
  useListPlatformUsers,
  useListScheduledDocuments,
  useListAuditEntries,
  PlatformUser,
  ScheduledDocument,
  AuditEntry,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Users,
  CalendarClock,
  ScrollText,
  Crown,
  SlidersHorizontal,
  PenSquare,
  Eye,
  UserPlus,
  Plus,
  AlertTriangle,
  ArrowRight,
  FolderClock,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Area = "Comunicación" | "Marca" | "Gabinete";
type Clearance = "public" | "internal" | "confidential" | "restricted";
type ProfileId = "superadmin" | "admin" | "editor" | "audit";

const AREAS: Area[] = ["Comunicación", "Marca", "Gabinete"];
const CLEARANCES: Clearance[] = ["public", "internal", "confidential", "restricted"];
const CLEARANCE_RANK: Record<Clearance, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

const PROFILE_ICON: Record<ProfileId, React.ComponentType<{ className?: string }>> = {
  superadmin: Crown,
  admin: SlidersHorizontal,
  editor: PenSquare,
  audit: Eye,
};

function clearanceBadgeClass(c: string) {
  switch (c) {
    case "public":
      return "bg-muted text-muted-foreground";
    case "internal":
      return "bg-tf-info-bg text-tf-info";
    case "confidential":
      return "bg-tf-warning-bg text-tf-warning";
    case "restricted":
      return "bg-tf-error-bg text-tf-error";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function scheduleStatusClass(s: string) {
  switch (s) {
    case "active":
      return "bg-tf-success text-white";
    case "paused":
      return "bg-muted text-muted-foreground";
    case "orphaned":
      return "bg-tf-error text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function auditKindClass(k: string) {
  switch (k) {
    case "permission":
      return "bg-tf-warning-bg text-tf-warning";
    case "user":
      return "bg-tf-info-bg text-tf-info";
    case "schedule":
      return "bg-tf-blue-tint text-tf-blue";
    case "run":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
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
  const [sessionUsers, setSessionUsers] = useState<SessionUser[]>([]);
  const [userEdits, setUserEdits] = useState<Record<string, Partial<PlatformUser>>>({});
  const [sessionSchedules, setSessionSchedules] = useState<SessionSchedule[]>([]);
  const [sessionAudit, setSessionAudit] = useState<AuditEntry[]>([]);

  const profileLabel = useMemo(() => {
    const map: Record<string, string> = {};
    (profiles ?? []).forEach((p) => (map[p.id] = p.label));
    return map;
  }, [profiles]);

  const users: PlatformUser[] = useMemo(() => {
    const merged = [...(seedUsers ?? []), ...sessionUsers];
    return merged.map((u) => ({ ...u, ...userEdits[u.id] }));
  }, [seedUsers, sessionUsers, userEdits]);

  const schedules: ScheduledDocument[] = useMemo(
    () => [...(seedSchedules ?? []), ...sessionSchedules],
    [seedSchedules, sessionSchedules],
  );

  const auditEntries: AuditEntry[] = useMemo(() => {
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
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userDraft, setUserDraft] = useState({ ...emptyUserDraft });
  const [pendingUser, setPendingUser] = useState<null | { isEdit: boolean }>(null);

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
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState({
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-title-lg text-tf-navy">Administration</h1>
        <p className="text-muted-foreground text-lg max-w-3xl">
          Run the platform without a vendor: register users, assign profiles, manage permissions by
          area and confidentiality, and schedule recurring documents. This is the backend that
          proves the platform is operable after implementation.
        </p>
      </div>

      {/* Access model explainer */}
      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="bg-tf-navy text-white">
          <CardTitle className="flex items-center space-x-2 text-white text-lg">
            <Shield className="w-5 h-5 text-tf-blue-light" />
            <span>Access = area × confidentiality</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-stretch">
            <div className="rounded-xl border border-border p-5 bg-tf-blue-tint/40">
              <div className="text-xs uppercase tracking-eyebrow font-bold text-tf-blue mb-2">
                Set here
              </div>
              <p className="font-bold text-tf-navy">Who you are</p>
              <p className="text-sm text-muted-foreground mt-1">
                User → area (Comunicación / Marca / Gabinete) and profile. Managed on this page.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center text-2xl font-bold text-muted-foreground">
              ×
            </div>
            <div className="rounded-xl border border-border p-5 bg-muted/40">
              <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground mb-2">
                Inherited
              </div>
              <p className="font-bold text-tf-navy">How sensitive the content is</p>
              <p className="text-sm text-muted-foreground mt-1">
                Confidentiality label inherited from each document's Microsoft sensitivity label —
                not set here.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center text-muted-foreground">
              <ArrowRight className="w-6 h-6" />
            </div>
            <div className="rounded-xl border border-tf-blue p-5 bg-white">
              <div className="text-xs uppercase tracking-eyebrow font-bold text-tf-blue mb-2">
                Effective access
              </div>
              <p className="font-bold text-tf-navy">What each person sees</p>
              <p className="text-sm text-muted-foreground mt-1">
                Enforced at the index (early-binding) — the model never sees a chunk the user cannot
                access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profiles overview */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Layers className="w-5 h-5 text-tf-blue" />
          <h2 className="text-title-sm font-bold text-tf-navy">Access profiles</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(profiles ?? []).map((p) => {
            const Icon = PROFILE_ICON[p.id as ProfileId] ?? Shield;
            return (
              <Card key={p.id} className="shadow-sm border-border">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-tf-blue-tint rounded-lg text-tf-blue">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-tf-navy">{p.label}</h3>
                  </div>
                  <p className="text-xs uppercase tracking-eyebrow font-bold text-tf-blue">
                    {p.scope}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.detail}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Profiles can be added or unified as the organisation evolves — the four above are the RFP
          baseline, not a fixed ceiling.
        </p>
      </div>

      {/* Users */}
      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center space-x-2 text-tf-navy text-lg">
            <Users className="w-5 h-5 text-tf-blue" />
            <span>Platform users</span>
          </CardTitle>
          <Button
            onClick={openRegister}
            size="sm"
            className="rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white font-semibold"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Register user
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">Name</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">Area</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">Profile</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">
                  Confidentiality tier
                </TableHead>
                <TableHead className="w-[80px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="font-semibold text-tf-navy">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-medium">{u.area}</TableCell>
                  <TableCell className="font-medium text-tf-navy">
                    {profileLabel[u.profileId] ?? u.profileId}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "uppercase text-[10px] tracking-eyebrow rounded-full font-bold",
                        clearanceBadgeClass(u.clearance),
                      )}
                    >
                      {u.clearance}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-pill font-semibold text-tf-blue hover:bg-tf-blue-tint"
                      onClick={() => openEdit(u)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Scheduled documents */}
      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center space-x-2 text-tf-navy text-lg">
            <CalendarClock className="w-5 h-5 text-tf-blue" />
            <span>Scheduled documents</span>
          </CardTitle>
          <Button
            onClick={() => setScheduleDialogOpen(true)}
            size="sm"
            className="rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" /> Schedule document
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start space-x-3 rounded-xl bg-tf-blue-tint/40 border border-border p-4">
            <FolderClock className="w-5 h-5 text-tf-blue mt-0.5 shrink-0" />
            <p className="text-sm text-tf-navy font-medium">
              Human gate: every generated document lands in the owner's review folder and never
              auto-publishes. A person always reviews before anything is released.
            </p>
          </div>
          {orphanedCount > 0 && (
            <div className="flex items-start space-x-3 rounded-xl bg-tf-error-bg border border-tf-error/30 p-4">
              <AlertTriangle className="w-5 h-5 text-tf-error mt-0.5 shrink-0" />
              <p className="text-sm text-tf-navy font-medium">
                {orphanedCount} schedule{orphanedCount > 1 ? "s are" : " is"} orphaned — the source
                document is missing. These are flagged rather than run silently, so no output is
                generated from a broken source.
              </p>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">
                  Template
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">
                  Frequency
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">
                  Language(s)
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">Owner</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">
                  Review folder
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="font-semibold text-tf-navy">{s.template}</div>
                    {s.status === "orphaned" ? (
                      <div className="text-xs text-tf-error font-medium">
                        Source missing: {s.sourceDocId}
                      </div>
                    ) : s.sourceTitle ? (
                      <div className="text-xs text-muted-foreground">Source: {s.sourceTitle}</div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No bound source</div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-medium">{s.frequency}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {s.languages.map((l) => (
                        <Badge
                          key={l}
                          variant="secondary"
                          className="uppercase text-[10px] tracking-eyebrow rounded-full font-bold"
                        >
                          {l}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-medium">{s.owner}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.reviewFolder}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "uppercase text-[10px] tracking-eyebrow rounded-full font-bold",
                        scheduleStatusClass(s.status),
                      )}
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Audit trail */}
      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border">
          <CardTitle className="flex items-center space-x-2 text-tf-navy text-lg">
            <ScrollText className="w-5 h-5 text-tf-blue" />
            <span>Audit trail</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Read-only — this is exactly what the Audit profile sees: every permission change and
            scheduled run, with actor, target and time.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">When</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">Actor</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">Action</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">Target</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditEntries.map((a) => (
                <TableRow key={a.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatTimestamp(a.timestamp)}
                  </TableCell>
                  <TableCell className="font-medium text-tf-navy whitespace-nowrap">
                    {a.actor}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "text-[10px] tracking-eyebrow rounded-full font-bold",
                        auditKindClass(a.kind),
                      )}
                    >
                      {a.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-tf-navy">{a.target}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[360px]">
                    {a.detail}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Register / Edit user dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-tf-navy">
              {editingUserId ? "Edit user" : "Register user"}
            </DialogTitle>
            <DialogDescription>
              Set who the person is — area and profile. Confidentiality is enforced at the index from
              inherited document labels.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Name</Label>
                <Input
                  id="user-name"
                  value={userDraft.name}
                  onChange={(e) => setUserDraft({ ...userDraft, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  value={userDraft.email}
                  onChange={(e) => setUserDraft({ ...userDraft, email: e.target.value })}
                  placeholder="name@telefonica.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Area</Label>
                <Select
                  value={userDraft.area}
                  onValueChange={(v) => setUserDraft({ ...userDraft, area: v as Area })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AREAS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profile</Label>
                <Select
                  value={userDraft.profileId}
                  onValueChange={(v) => setUserDraft({ ...userDraft, profileId: v as ProfileId })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(profiles ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confidentiality tier (max access)</Label>
              <Select
                value={userDraft.clearance}
                onValueChange={(v) => setUserDraft({ ...userDraft, clearance: v as Clearance })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLEARANCES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Effective access preview */}
            <div className="rounded-xl border border-tf-blue/30 bg-tf-blue-tint/30 p-4">
              <div className="text-xs uppercase tracking-eyebrow font-bold text-tf-blue mb-2">
                Effective access preview
              </div>
              <p className="text-sm text-tf-navy">
                In <span className="font-bold">{userDraft.area}</span>, as{" "}
                <span className="font-bold">
                  {profileLabel[userDraft.profileId] ?? userDraft.profileId}
                </span>
                , this person would see documents in their area up to and including{" "}
                <span className="font-bold capitalize">{userDraft.clearance}</span> sensitivity.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Applied at retrieval (early-binding). Higher-sensitivity documents stay invisible.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-pill" onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white font-semibold"
              disabled={!draftValid}
              onClick={handleSaveUser}
            >
              {editingUserId ? "Save changes" : "Register user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Over-permissioning confirmation */}
      <AlertDialog open={!!pendingUser} onOpenChange={(open) => !open && setPendingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2 text-tf-navy">
              <AlertTriangle className="w-5 h-5 text-tf-warning" />
              <span>Confirm elevated access</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Granting <span className="font-bold capitalize">{userDraft.clearance}</span> access
              exposes sensitive material — for example, Finance-DE {userDraft.clearance} documents —
              to {userDraft.name || "this user"}. This widens what they can see across their area.
              Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-pill">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-pill bg-tf-warning hover:bg-tf-warning/90 text-tf-navy font-semibold"
              onClick={commitUser}
            >
              Grant access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule document dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-tf-navy">Schedule document</DialogTitle>
            <DialogDescription>
              Define a recurring document. Output always lands in the review folder and never
              auto-publishes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sched-template">Template</Label>
              <Input
                id="sched-template"
                value={scheduleDraft.template}
                onChange={(e) => setScheduleDraft({ ...scheduleDraft, template: e.target.value })}
                placeholder="e.g. Weekly press digest"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={scheduleDraft.frequency}
                  onValueChange={(v) => setScheduleDraft({ ...scheduleDraft, frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Daily", "Weekly", "Monthly", "Quarterly"].map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sched-langs">Language(s)</Label>
                <Input
                  id="sched-langs"
                  value={scheduleDraft.languages}
                  onChange={(e) => setScheduleDraft({ ...scheduleDraft, languages: e.target.value })}
                  placeholder="es, en"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sched-owner">Owner</Label>
              <Input
                id="sched-owner"
                value={scheduleDraft.owner}
                onChange={(e) => setScheduleDraft({ ...scheduleDraft, owner: e.target.value })}
                placeholder="e.g. Media Relations"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sched-folder">Review folder</Label>
              <Input
                id="sched-folder"
                value={scheduleDraft.reviewFolder}
                onChange={(e) =>
                  setScheduleDraft({ ...scheduleDraft, reviewFolder: e.target.value })
                }
                placeholder="e.g. Comunicación / Review / Press digest"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-pill"
              onClick={() => setScheduleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white font-semibold"
              disabled={!scheduleValid}
              onClick={commitSchedule}
            >
              Create schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
