import React from "react";
import {
  skinVars,
  Stack,
  Inline,
  Box,
  Text1,
  Text2,
  Text3,
  Text5,
  Tag,
  Touchable,
  ButtonSecondary,
  Spinner,
  IconChevronLeftRegular,
  IconEyeRegular,
} from "@telefonica/mistica";
import {
  useGetAuthMe,
  useGetObservatoryOverview,
  useListObservatorySessions,
  useListObservatoryEvents,
  type ObservatoryEvent,
  type ObservatorySession,
} from "@workspace/api-client-react";

const KIND_LABELS: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  page_view: "Page view",
  ask: "Ask",
  generate: "Generate",
  export: "Export",
  download: "Download",
  ingest: "Ingest",
  config_change: "Change",
};

const KIND_FILTERS = [
  "all",
  "ask",
  "generate",
  "export",
  "ingest",
  "config_change",
  "page_view",
  "login",
] as const;

function kindTagType(kind: string): "success" | "warning" | "error" | "info" | "inactive" | "active" {
  switch (kind) {
    case "ask":
      return "info";
    case "generate":
      return "active";
    case "export":
    case "download":
      return "warning";
    case "ingest":
      return "success";
    case "config_change":
      return "active";
    case "login":
      return "success";
    case "logout":
      return "inactive";
    default:
      return "inactive";
  }
}

function statusTagType(status: string): "success" | "warning" | "error" | "info" | "inactive" | "active" {
  switch (status) {
    case "answered":
    case "approved":
      return "success";
    case "permission_blocked":
      return "error";
    case "conflict":
    case "blocked":
      return "warning";
    case "no_evidence":
    case "cancelled":
      return "inactive";
    default:
      return "info";
  }
}

function formatSeconds(total: number): string {
  if (total < 60) return `${total}s`;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  const s = total % 60;
  return s > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${m}m`;
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const cardStyle: React.CSSProperties = {
  backgroundColor: skinVars.colors.backgroundContainer,
  border: `1px solid ${skinVars.colors.divider}`,
  borderRadius: skinVars.borderRadii.container,
};

function EventRow({ event }: { event: ObservatoryEvent }) {
  const [expanded, setExpanded] = React.useState(false);
  const hasBody = Boolean(event.summary || event.response);
  return (
    <div style={{ borderBottom: `1px solid ${skinVars.colors.divider}` }}>
      <Touchable
        onPress={() => {
          if (hasBody) setExpanded((v) => !v);
        }}
      >
        <Box paddingY={12} paddingX={16}>
          <Inline space={12} alignItems="center">
            <div style={{ width: 96, flexShrink: 0 }}>
              <Tag type={kindTagType(event.kind)}>{KIND_LABELS[event.kind] ?? event.kind}</Tag>
            </div>
            <div style={{ width: 118, flexShrink: 0 }}>
              <Text1 regular color={skinVars.colors.textSecondary}>
                {formatTs(event.ts)}
              </Text1>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text2 regular color={skinVars.colors.textPrimary}>
                {event.kind === "page_view"
                  ? (event.page ?? "—")
                  : (event.summary ?? event.page ?? "—")}
              </Text2>
            </div>
            {event.roleId ? (
              <Text1 regular color={skinVars.colors.textSecondary}>
                {event.roleId}
              </Text1>
            ) : null}
            {event.status ? <Tag type={statusTagType(event.status)}>{event.status}</Tag> : null}
          </Inline>
        </Box>
      </Touchable>
      {expanded && hasBody && (
        <Box paddingX={16} paddingBottom={16}>
          <div
            style={{
              backgroundColor: skinVars.colors.background,
              borderRadius: skinVars.borderRadii.container,
              padding: 16,
            }}
          >
            <Stack space={8}>
              {event.summary && (
                <Stack space={2}>
                  <Text1 medium color={skinVars.colors.textSecondary}>
                    {event.kind === "ask" ? "Question" : "Subject"}
                  </Text1>
                  <Text2 regular color={skinVars.colors.textPrimary}>
                    {event.summary}
                  </Text2>
                </Stack>
              )}
              {event.response && (
                <Stack space={2}>
                  <Text1 medium color={skinVars.colors.textSecondary}>
                    Response shown
                  </Text1>
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    <Text2 regular color={skinVars.colors.textPrimary}>
                      {event.response}
                    </Text2>
                  </div>
                </Stack>
              )}
              <Inline space={16}>
                {event.docIds.length > 0 && (
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    Citations: {event.docIds.join(", ")}
                  </Text1>
                )}
                {event.retrievalAuditId && (
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    Retrieval audit: {event.retrievalAuditId}
                  </Text1>
                )}
                {event.detail &&
                  Object.entries(event.detail).map(([k, v]) => (
                    <Text1 key={k} regular color={skinVars.colors.textSecondary}>
                      {k}: {v}
                    </Text1>
                  ))}
              </Inline>
            </Stack>
          </div>
        </Box>
      )}
    </div>
  );
}

function SessionCard({ session }: { session: ObservatorySession }) {
  const total = Object.values(session.secondsByPage).reduce((a, b) => a + b, 0);
  const pages = Object.entries(session.secondsByPage).sort((a, b) => b[1] - a[1]);
  return (
    <div style={cardStyle}>
      <Box padding={16}>
        <Stack space={8}>
          <Inline space={12} alignItems="center">
            <Text2 medium color={skinVars.colors.textPrimary}>
              {formatTs(session.firstSeenTs)} — {formatTs(session.lastSeenTs)}
            </Text2>
            <Tag type={session.endedTs ? "inactive" : "success"}>
              {session.endedTs ? "Ended" : "Open"}
            </Tag>
            <Text1 regular color={skinVars.colors.textSecondary}>
              Active {formatSeconds(total)}
            </Text1>
          </Inline>
          {pages.length > 0 ? (
            <Inline space={12}>
              {pages.map(([page, secs]) => (
                <Text1 key={page} regular color={skinVars.colors.textSecondary}>
                  {page} · {formatSeconds(secs)}
                </Text1>
              ))}
            </Inline>
          ) : (
            <Text1 regular color={skinVars.colors.textSecondary}>
              No page time recorded yet.
            </Text1>
          )}
        </Stack>
      </Box>
    </div>
  );
}

function UserDetail({ email, onBack }: { email: string; onBack: () => void }) {
  const sessions = useListObservatorySessions({ email });
  const [kind, setKind] = React.useState<(typeof KIND_FILTERS)[number]>("all");
  const events = useListObservatoryEvents(
    kind === "all" ? { email, limit: 200 } : { email, kind, limit: 200 },
  );

  return (
    <Stack space={24}>
      <Inline space={12} alignItems="center">
        <ButtonSecondary small onPress={onBack}>
          <IconChevronLeftRegular size={16} />
          All users
        </ButtonSecondary>
        <Text3 medium color={skinVars.colors.textPrimary}>
          {email}
        </Text3>
      </Inline>

      <Stack space={8}>
        <Text2 medium color={skinVars.colors.textSecondary}>
          Sessions
        </Text2>
        {sessions.isLoading ? (
          <Spinner size={24} />
        ) : (sessions.data?.sessions.length ?? 0) === 0 ? (
          <Text2 regular color={skinVars.colors.textSecondary}>
            No sessions recorded.
          </Text2>
        ) : (
          <Stack space={8}>
            {sessions.data!.sessions.map((s) => (
              <SessionCard key={s.sid} session={s} />
            ))}
          </Stack>
        )}
      </Stack>

      <Stack space={8}>
        <Inline space={12} alignItems="center">
          <Text2 medium color={skinVars.colors.textSecondary}>
            Activity
          </Text2>
          <Inline space={8}>
            {KIND_FILTERS.map((k) => (
              <Touchable key={k} onPress={() => setKind(k)}>
                <div
                  style={{
                    padding: "4px 12px",
                    borderRadius: 999,
                    border: `1px solid ${kind === k ? skinVars.colors.brand : skinVars.colors.divider}`,
                    backgroundColor: kind === k ? skinVars.colors.brandLow : "transparent",
                  }}
                >
                  <Text1
                    medium
                    color={kind === k ? skinVars.colors.brand : skinVars.colors.textSecondary}
                  >
                    {k === "all" ? "All" : (KIND_LABELS[k] ?? k)}
                  </Text1>
                </div>
              </Touchable>
            ))}
          </Inline>
        </Inline>
        <div style={cardStyle}>
          {events.isLoading ? (
            <Box padding={24}>
              <Spinner size={24} />
            </Box>
          ) : (events.data?.items.length ?? 0) === 0 ? (
            <Box padding={24}>
              <Text2 regular color={skinVars.colors.textSecondary}>
                No events for this filter.
              </Text2>
            </Box>
          ) : (
            events.data!.items.map((e) => <EventRow key={e.id} event={e} />)
          )}
        </div>
      </Stack>
    </Stack>
  );
}

const OVERVIEW_COLUMNS =
  "minmax(220px, 2fr) 90px 80px 100px 70px 80px 80px 90px 70px 80px 150px";

export default function ObservatoryPage() {
  const me = useGetAuthMe();
  const [selected, setSelected] = React.useState<string | null>(null);
  const isAuditTeam = me.data?.team === "lyzr" || me.data?.team === "accenture";
  const overview = useGetObservatoryOverview();

  if (me.isLoading) {
    return (
      <Box padding={48}>
        <Spinner size={32} />
      </Box>
    );
  }

  if (!isAuditTeam) {
    return (
      <Box padding={48}>
        <Stack space={12}>
          <IconEyeRegular size={32} color={skinVars.colors.neutralMedium} />
          <Text3 medium color={skinVars.colors.textPrimary}>
            Platform Audit access is restricted
          </Text3>
          <Text2 regular color={skinVars.colors.textSecondary}>
            This audit panel is only available to the Lyzr and Accenture teams.
          </Text2>
        </Stack>
      </Box>
    );
  }

  return (
    <Box paddingY={32} paddingX={32}>
      <Stack space={24}>
        <Stack space={4}>
          <Text5 color={skinVars.colors.textPrimary}>Platform Audit</Text5>
          <Text2 regular color={skinVars.colors.textSecondary}>
            Full audit trail of platform usage: who signed in, what they asked, the exact
            answers they were shown, what they generated and exported, and where they spent
            their time. Data is captured server-side against the verified session.
          </Text2>
        </Stack>

        {selected ? (
          <UserDetail email={selected} onBack={() => setSelected(null)} />
        ) : (
          <Stack space={12}>
            <Inline space={16} alignItems="center">
              <ButtonSecondary
                small
                onPress={() => {
                  void overview.refetch();
                }}
              >
                Refresh
              </ButtonSecondary>
            </Inline>

            <div style={{ ...cardStyle, overflowX: "auto" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: OVERVIEW_COLUMNS,
                  gap: 8,
                  padding: "12px 16px",
                  borderBottom: `1px solid ${skinVars.colors.divider}`,
                  minWidth: 980,
                }}
              >
                {["User", "Sessions", "Time", "Questions", "Docs", "Exports", "Ingests", "Changes", "Pages", "Blocked", "Last seen"].map(
                  (h) => (
                    <Text1 key={h} medium color={skinVars.colors.textSecondary}>
                      {h}
                    </Text1>
                  ),
                )}
              </div>
              {overview.isLoading ? (
                <Box padding={24}>
                  <Spinner size={24} />
                </Box>
              ) : (overview.data?.users.length ?? 0) === 0 ? (
                <Box padding={24}>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    No tracked activity yet. Events appear as soon as users sign in
                    and start working.
                  </Text2>
                </Box>
              ) : (
                overview.data!.users.map((u) => (
                  <Touchable key={u.email} onPress={() => setSelected(u.email)}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: OVERVIEW_COLUMNS,
                        gap: 8,
                        padding: "12px 16px",
                        borderBottom: `1px solid ${skinVars.colors.divider}`,
                        alignItems: "center",
                        minWidth: 980,
                      }}
                    >
                      <Inline space={8} alignItems="center">
                        <Text2 medium color={skinVars.colors.textPrimary}>
                          {u.email}
                        </Text2>
                        <Tag type={u.team === "lyzr" ? "active" : "info"}>{u.team}</Tag>
                      </Inline>
                      <Text2 regular color={skinVars.colors.textPrimary}>
                        {String(u.sessionCount)}
                      </Text2>
                      <Text2 regular color={skinVars.colors.textPrimary}>
                        {formatSeconds(u.totalSeconds)}
                      </Text2>
                      <Text2 regular color={skinVars.colors.textPrimary}>
                        {String(u.askCount)}
                      </Text2>
                      <Text2 regular color={skinVars.colors.textPrimary}>
                        {String(u.generateCount)}
                      </Text2>
                      <Text2 regular color={skinVars.colors.textPrimary}>
                        {String(u.exportCount)}
                      </Text2>
                      <Text2 regular color={skinVars.colors.textPrimary}>
                        {String(u.ingestCount)}
                      </Text2>
                      <Text2 regular color={skinVars.colors.textPrimary}>
                        {String(u.changeCount)}
                      </Text2>
                      <Text2 regular color={skinVars.colors.textPrimary}>
                        {String(u.pageViewCount)}
                      </Text2>
                      <Text2
                        regular
                        color={
                          u.blockedCount > 0
                            ? skinVars.colors.errorHigh
                            : skinVars.colors.textPrimary
                        }
                      >
                        {String(u.blockedCount)}
                      </Text2>
                      <Text2 regular color={skinVars.colors.textSecondary}>
                        {u.lastSeenTs ? formatTs(u.lastSeenTs) : "—"}
                      </Text2>
                    </div>
                  </Touchable>
                ))
              )}
            </div>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
