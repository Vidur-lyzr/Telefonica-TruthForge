import React from "react";
import {
  useGetSourceSyncState,
  useSetSourceLabel,
  useRunSourceSync,
} from "@workspace/api-client-react";
import {
  Box,
  Boxed,
  Stack,
  Inline,
  Table,
  Tag,
  Select,
  Callout,
  ButtonPrimary,
  Text1,
  Text2,
  Title3,
  skinVars,
  IconRefreshRegular,
  IconAlertRegular,
} from "@telefonica/mistica";

type TagType = "promo" | "info" | "active" | "inactive" | "success" | "warning" | "error";

const CLEARANCES = ["public", "private", "confidential", "off_the_record"] as const;
const CLEARANCE_LABEL: Record<string, string> = {
  public: "Public",
  private: "Private",
  confidential: "Confidential",
  off_the_record: "Off the record",
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

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SourceSyncSection() {
  const syncQ = useGetSourceSyncState();
  const label = useSetSourceLabel();
  const run = useRunSourceSync();
  const [error, setError] = React.useState<string | null>(null);

  const state = syncQ.data;
  const pending = state?.pendingDeltas ?? [];
  const applied = state?.appliedDeltas ?? [];
  const runs = state?.runs ?? [];

  function changeLabel(docId: string, confidentiality: string) {
    setError(null);
    label.mutate(
      { data: { docId, confidentiality } },
      {
        onSuccess: () => syncQ.refetch(),
        onError: (err) => {
          const data = (err as { data?: { error?: string } | null }).data;
          setError(data?.error ?? "The label change could not be applied.");
        },
      },
    );
  }

  function runSync() {
    setError(null);
    run.mutate(undefined, {
      onSuccess: () => syncQ.refetch(),
      onError: (err) => {
        const data = (err as { data?: { error?: string } | null }).data;
        setError(data?.error ?? "The batch sync could not be run.");
      },
    });
  }

  return (
    <Stack space={16}>
      <Stack space={4}>
        <Inline space={8} alignItems="center">
          <IconRefreshRegular color={skinVars.colors.brand} />
          <Title3>Source-system sync</Title3>
        </Inline>
        <Text2 regular color={skinVars.colors.textSecondary}>
          {state?.connector ?? "Simulated source connector"} — change a document's confidentiality
          in the source system and watch it propagate to retrieval. Upgrades (more restrictive)
          apply immediately, like a source webhook. Downgrades (less restrictive) wait for the next
          batch sync run — the index fails closed, never open.
        </Text2>
      </Stack>

      {error && (
        <Callout
          asset={<IconAlertRegular color={skinVars.colors.error} />}
          title="Sync refused"
          description={error}
        />
      )}

      <Table
        heading={["Document", "Category", "Index enforces", "Source asserts", "Status"]}
        content={(state?.docs ?? []).map((d) => [
          <Stack space={2} key={`${d.docId}-title`}>
            <Text2 medium color={skinVars.colors.textPrimary}>
              {d.title}
            </Text2>
            <Text1 regular color={skinVars.colors.textSecondary}>
              {d.docId} · {d.type}
            </Text1>
          </Stack>,
          <Tag type={d.category === "A" ? "info" : "inactive"} key={`${d.docId}-cat`}>
            {d.category}
          </Tag>,
          <Tag type={clearanceTagType(d.indexLabel)} key={`${d.docId}-index`}>
            {CLEARANCE_LABEL[d.indexLabel] ?? d.indexLabel}
          </Tag>,
          <Select
            key={`${d.docId}-source`}
            name={`source-label-${d.docId}`}
            label="Source label"
            value={d.sourceLabel}
            disabled={label.isPending}
            onChangeValue={(v) => {
              if (v !== d.sourceLabel) changeLabel(d.docId, v);
            }}
            options={CLEARANCES.map((cl) => ({ value: cl, text: CLEARANCE_LABEL[cl] }))}
          />,
          d.pending ? (
            <Tag type="warning" key={`${d.docId}-status`}>
              Pending batch sync
            </Tag>
          ) : (
            <Tag type="success" key={`${d.docId}-status`}>
              In sync
            </Tag>
          ),
        ])}
      />

      <Boxed>
        <Box padding={16}>
          <Stack space={12}>
            <Inline space={16} alignItems="center">
              <div style={{ flex: 1, minWidth: 0 }}>
                <Stack space={4}>
                  <Text2 medium color={skinVars.colors.textPrimary}>
                    Pending downgrade deltas ({pending.length})
                  </Text2>
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    {pending.length === 0
                      ? "Nothing waiting. Downgrades queue here until a batch sync run applies them."
                      : "These documents are still served under their stricter label until the batch sync runs."}
                  </Text1>
                </Stack>
              </div>
              <ButtonPrimary small onPress={runSync} disabled={run.isPending || pending.length === 0}>
                {run.isPending ? "Running sync" : "Run batch sync now"}
              </ButtonPrimary>
            </Inline>
            {pending.map((d) => (
              <Inline space={8} alignItems="center" key={d.id} wrap>
                <Text2 medium color={skinVars.colors.textPrimary}>
                  {d.docTitle}
                </Text2>
                <Tag type={clearanceTagType(d.from)}>{CLEARANCE_LABEL[d.from] ?? d.from}</Tag>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  to
                </Text2>
                <Tag type={clearanceTagType(d.to)}>{CLEARANCE_LABEL[d.to] ?? d.to}</Tag>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  requested by {d.requestedBy} · {formatTimestamp(d.requestedAt)}
                </Text1>
              </Inline>
            ))}
            {(applied.length > 0 || runs.length > 0) && (
              <Stack space={4}>
                {runs.slice(0, 3).map((r) => (
                  <Text1 regular color={skinVars.colors.textSecondary} key={r.id}>
                    Batch run {formatTimestamp(r.ranAt)} by {r.actor} — {r.appliedCount} delta
                    {r.appliedCount === 1 ? "" : "s"} applied.
                  </Text1>
                ))}
                {applied.slice(0, 5).map((d) => (
                  <Text1 regular color={skinVars.colors.textSecondary} key={d.id}>
                    {d.docTitle}: {CLEARANCE_LABEL[d.from] ?? d.from} to {CLEARANCE_LABEL[d.to] ?? d.to}{" "}
                    via {d.mode === "webhook" ? "webhook (immediate)" : "batch sync"}
                    {d.appliedAt ? ` · ${formatTimestamp(d.appliedAt)}` : ""}
                  </Text1>
                ))}
              </Stack>
            )}
          </Stack>
        </Box>
      </Boxed>
    </Stack>
  );
}
