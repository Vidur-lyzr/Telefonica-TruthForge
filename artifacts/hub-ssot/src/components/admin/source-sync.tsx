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
import { useApp } from "@/components/app-provider";
import { ADMIN_I18N, localeFor } from "@/i18n/admin";

type TagType = "promo" | "info" | "active" | "inactive" | "success" | "warning" | "error";

const CLEARANCES = ["public", "private", "confidential", "off_the_record"] as const;

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

function formatTimestamp(ts: string, locale: string): string {
  return new Date(ts).toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SourceSyncSection() {
  const { lang, roleId } = useApp();
  const full = ADMIN_I18N[lang];
  const t = full.sync;
  const locale = localeFor(lang);
  const syncQ = useGetSourceSyncState(
    { roleId },
    { query: { enabled: roleId.length > 0, queryKey: ["source-sync-state", roleId] } },
  );
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
      { data: { docId, confidentiality, roleId } },
      {
        onSuccess: () => syncQ.refetch(),
        onError: (err) => {
          const data = (err as { data?: { error?: string } | null }).data;
          setError(data?.error ?? t.labelChangeError);
        },
      },
    );
  }

  function runSync() {
    setError(null);
    run.mutate({ data: { roleId } }, {
      onSuccess: () => syncQ.refetch(),
      onError: (err) => {
        const data = (err as { data?: { error?: string } | null }).data;
        setError(data?.error ?? t.batchSyncError);
      },
    });
  }

  return (
    <Stack space={16}>
      <Stack space={4}>
        <Inline space={8} alignItems="center">
          <IconRefreshRegular color={skinVars.colors.brand} />
          <Title3>{t.title}</Title3>
        </Inline>
        <Text2 regular color={skinVars.colors.textSecondary}>
          {t.intro(state?.connector ?? t.defaultConnector)}
        </Text2>
      </Stack>

      {error && (
        <Callout
          asset={<IconAlertRegular color={skinVars.colors.error} />}
          title={t.syncRefused}
          description={error}
        />
      )}

      <Table
        heading={[t.colDocument, t.colCategory, t.colIndexEnforces, t.colSourceAsserts, t.colStatus]}
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
            {full.clearanceLabels[d.indexLabel] ?? d.indexLabel}
          </Tag>,
          <Select
            key={`${d.docId}-source`}
            name={`source-label-${d.docId}`}
            label={t.sourceLabelField}
            value={d.sourceLabel}
            disabled={label.isPending}
            onChangeValue={(v) => {
              if (v !== d.sourceLabel) changeLabel(d.docId, v);
            }}
            options={CLEARANCES.map((cl) => ({ value: cl, text: full.clearanceLabels[cl] ?? cl }))}
          />,
          d.pending ? (
            <Tag type="warning" key={`${d.docId}-status`}>
              {t.pendingBatchSync}
            </Tag>
          ) : (
            <Tag type="success" key={`${d.docId}-status`}>
              {t.inSync}
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
                    {t.pendingDeltas(pending.length)}
                  </Text2>
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    {pending.length === 0 ? t.nothingWaiting : t.pendingBody}
                  </Text1>
                </Stack>
              </div>
              <ButtonPrimary small onPress={runSync} disabled={run.isPending || pending.length === 0}>
                {run.isPending ? t.runningSync : t.runBatchSyncNow}
              </ButtonPrimary>
            </Inline>
            {pending.map((d) => (
              <Inline space={8} alignItems="center" key={d.id} wrap>
                <Text2 medium color={skinVars.colors.textPrimary}>
                  {d.docTitle}
                </Text2>
                <Tag type={clearanceTagType(d.from)}>{full.clearanceLabels[d.from] ?? d.from}</Tag>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {t.to}
                </Text2>
                <Tag type={clearanceTagType(d.to)}>{full.clearanceLabels[d.to] ?? d.to}</Tag>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {t.requestedBy(d.requestedBy, formatTimestamp(d.requestedAt, locale))}
                </Text1>
              </Inline>
            ))}
            {(applied.length > 0 || runs.length > 0) && (
              <Stack space={4}>
                {runs.slice(0, 3).map((r) => (
                  <Text1 regular color={skinVars.colors.textSecondary} key={r.id}>
                    {t.batchRun(formatTimestamp(r.ranAt, locale), r.actor, r.appliedCount)}
                  </Text1>
                ))}
                {applied.slice(0, 5).map((d) => (
                  <Text1 regular color={skinVars.colors.textSecondary} key={d.id}>
                    {t.appliedDelta(
                      d.docTitle,
                      full.clearanceLabels[d.from] ?? d.from,
                      full.clearanceLabels[d.to] ?? d.to,
                      d.mode === "webhook" ? t.modeWebhook : t.modeBatch,
                      d.appliedAt ? formatTimestamp(d.appliedAt, locale) : "",
                    )}
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
