import React from "react";
import {
  useListUserUsage,
  useGetUserUsageDetail,
  useSetUserAllocation,
  useResetUserUsage,
} from "@workspace/api-client-react";
import {
  Box,
  Boxed,
  Stack,
  Inline,
  Table,
  Tag,
  Drawer,
  Callout,
  TextField,
  ButtonPrimary,
  ButtonSecondary,
  ButtonDanger,
  ButtonLink,
  Text1,
  Text2,
  Text3,
  Title2,
  Title3,
  skinVars,
  IconBarChartRegular,
  IconAlertRegular,
} from "@telefonica/mistica";
import { useApp } from "@/components/app-provider";
import { ADMIN_I18N, localeFor } from "@/i18n/admin";

type TagType = "promo" | "info" | "active" | "inactive" | "success" | "warning" | "error";

function quotaTagType(state: string): TagType {
  switch (state) {
    case "exceeded":
      return "error";
    case "warning":
      return "warning";
    default:
      return "success";
  }
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: unknown }).data;
    if (data && typeof data === "object" && "error" in data) {
      const msg = (data as { error?: unknown }).error;
      if (typeof msg === "string" && msg.length > 0) return msg;
    }
  }
  return fallback;
}

export default function UsageQuotasSection() {
  const { lang, roleId } = useApp();
  const full = ADMIN_I18N[lang];
  const t = full.usage;
  const locale = localeFor(lang);
  const fmt = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const usageQ = useListUserUsage(
    { roleId },
    { query: { enabled: roleId.length > 0, queryKey: ["user-usage", roleId] } },
  );

  const [ledgerEmail, setLedgerEmail] = React.useState<string | null>(null);
  const [editEmail, setEditEmail] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState("");
  const [resetTarget, setResetTarget] = React.useState<string | null>(null);
  const [mutationError, setMutationError] = React.useState<string | null>(null);

  const detailQ = useGetUserUsageDetail(
    { roleId, email: ledgerEmail ?? "" },
    {
      query: {
        enabled: roleId.length > 0 && ledgerEmail !== null,
        queryKey: ["user-usage-detail", roleId, ledgerEmail],
      },
    },
  );

  const setAllocation = useSetUserAllocation();
  const resetUsage = useResetUserUsage();

  const data = usageQ.data;

  function refresh() {
    void usageQ.refetch();
    if (ledgerEmail) void detailQ.refetch();
  }

  function formatWhen(iso: string | null | undefined): string {
    if (!iso) return t.never;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return t.never;
    return d.toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function saveAllocation() {
    if (!editEmail) return;
    const value = Number(editValue.replace(/[^\d]/g, ""));
    if (!Number.isFinite(value) || value < 0) return;
    setMutationError(null);
    setAllocation.mutate(
      { data: { roleId, email: editEmail, allocation: value } },
      {
        onSuccess: () => {
          setEditEmail(null);
          refresh();
        },
        onError: (err) => setMutationError(apiErrorMessage(err, t.loadFailed)),
      },
    );
  }

  function confirmReset() {
    if (!resetTarget) return;
    setMutationError(null);
    resetUsage.mutate(
      { data: { roleId, email: resetTarget } },
      {
        onSuccess: () => {
          setResetTarget(null);
          refresh();
        },
        onError: (err) => setMutationError(apiErrorMessage(err, t.loadFailed)),
      },
    );
  }

  const detailSummary = detailQ.data?.summary;

  return (
    <Stack space={16}>
      <Inline space={8} alignItems="center">
        <IconBarChartRegular color={skinVars.colors.brand} />
        <Title3>{t.title}</Title3>
      </Inline>
      <div style={{ maxWidth: 768 }}>
        <Text2 regular color={skinVars.colors.textSecondary}>
          {t.intro}
        </Text2>
      </div>

      {data && (
        <Inline space={16} alignItems="center">
          <Text2 medium color={skinVars.colors.textPrimary}>
            {t.period}: {data.period}
          </Text2>
          <Text2 regular color={skinVars.colors.textSecondary}>
            {t.defaultAllocationNote}: {fmt.format(data.defaultAllocation)}
          </Text2>
        </Inline>
      )}

      {usageQ.isError && (
        <Callout
          asset={<IconAlertRegular color={skinVars.colors.error} />}
          title={t.loadFailed}
          description=""
        />
      )}

      {mutationError && (
        <Callout
          asset={<IconAlertRegular color={skinVars.colors.error} />}
          title={mutationError}
          description=""
        />
      )}

      {data && data.users.length === 0 && (
        <Text2 regular color={skinVars.colors.textSecondary}>
          {t.empty}
        </Text2>
      )}

      {data && data.users.length > 0 && (
        <Table
          heading={[
            t.colUser,
            t.colUsed,
            t.colAllocation,
            t.colRemaining,
            t.colStatus,
            t.colLastActivity,
            t.colActions,
          ]}
          content={data.users.map((u) => [
            <Stack space={2} key={`${u.email}-id`}>
              <Text2 medium color={skinVars.colors.textPrimary}>
                {u.name ?? u.email}
              </Text2>
              <Inline space={8} alignItems="center">
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {u.email}
                </Text1>
                {!u.managed && <Tag type="inactive">{t.unmanagedTag}</Tag>}
              </Inline>
            </Stack>,
            <Text2 regular color={skinVars.colors.textPrimary} key={`${u.email}-used`}>
              {fmt.format(u.usedTokens)}
            </Text2>,
            <Inline space={8} alignItems="center" key={`${u.email}-alloc`}>
              <Text2 regular color={skinVars.colors.textPrimary}>
                {fmt.format(u.allocation)}
              </Text2>
              <Tag type={u.isDefaultAllocation ? "inactive" : "info"}>
                {u.isDefaultAllocation ? t.defaultTag : t.customTag}
              </Tag>
            </Inline>,
            <Text2 regular color={skinVars.colors.textPrimary} key={`${u.email}-rem`}>
              {fmt.format(u.remainingTokens)}
            </Text2>,
            <Tag type={quotaTagType(u.quotaState)} key={`${u.email}-state`}>
              {u.quotaState === "exceeded"
                ? t.statusExceeded
                : u.quotaState === "warning"
                  ? t.statusWarning
                  : t.statusOk}
            </Tag>,
            <Text2 regular color={skinVars.colors.textSecondary} key={`${u.email}-last`}>
              {formatWhen(u.lastActivityAt)}
            </Text2>,
            <Inline space={8} key={`${u.email}-actions`}>
              <ButtonLink
                small
                onPress={() => {
                  setLedgerEmail(u.email);
                }}
              >
                {t.viewDetail}
              </ButtonLink>
              <ButtonLink
                small
                onPress={() => {
                  setEditEmail(u.email);
                  setEditValue(String(u.allocation));
                  setMutationError(null);
                }}
              >
                {t.editAllocation}
              </ButtonLink>
            </Inline>,
          ])}
        />
      )}

      {/* Allocation editor */}
      {editEmail !== null && (
        <Drawer
          onClose={() => setEditEmail(null)}
          onDismiss={() => setEditEmail(null)}
          width={480}
        >
          <Box paddingBottom={8}>
            <Stack space={16}>
              <Stack space={4}>
                <Title2>{t.editAllocation}</Title2>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {editEmail}
                </Text2>
              </Stack>
              <TextField
                name="allocation"
                label={t.allocationLabel}
                value={editValue}
                onChangeValue={(v) => setEditValue(v.replace(/[^\d]/g, ""))}
              />
              {mutationError && (
                <Text2 regular color={skinVars.colors.error}>
                  {mutationError}
                </Text2>
              )}
              <Inline space={8}>
                <ButtonPrimary
                  small
                  onPress={saveAllocation}
                  showSpinner={setAllocation.isPending}
                >
                  {t.save}
                </ButtonPrimary>
                <ButtonSecondary small onPress={() => setEditEmail(null)}>
                  {t.cancel}
                </ButtonSecondary>
              </Inline>
            </Stack>
          </Box>
        </Drawer>
      )}

      {/* Reset confirmation */}
      {resetTarget !== null && (
        <Drawer
          onClose={() => setResetTarget(null)}
          onDismiss={() => setResetTarget(null)}
          width={480}
        >
          <Box paddingBottom={8}>
            <Stack space={16}>
              <Inline space={8} alignItems="center">
                <IconAlertRegular color={skinVars.colors.warning} />
                <Title2>{t.resetConfirmTitle}</Title2>
              </Inline>
              <Text2 regular color={skinVars.colors.textSecondary}>
                {resetTarget}
              </Text2>
              <Text2 regular color={skinVars.colors.textSecondary}>
                {t.resetConfirmText}
              </Text2>
              {mutationError && (
                <Text2 regular color={skinVars.colors.error}>
                  {mutationError}
                </Text2>
              )}
              <Inline space={8}>
                <ButtonDanger small onPress={confirmReset} showSpinner={resetUsage.isPending}>
                  {t.reset}
                </ButtonDanger>
                <ButtonSecondary small onPress={() => setResetTarget(null)}>
                  {t.cancel}
                </ButtonSecondary>
              </Inline>
            </Stack>
          </Box>
        </Drawer>
      )}

      {/* Ledger drill-down */}
      {ledgerEmail !== null && (
        <Drawer
          onClose={() => setLedgerEmail(null)}
          onDismiss={() => setLedgerEmail(null)}
          width={720}
        >
          <Box paddingBottom={8}>
            <Stack space={16}>
              <Stack space={4}>
                <Title2>{t.ledgerTitle}</Title2>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {ledgerEmail}
                </Text2>
              </Stack>

              {detailSummary && (
                <Boxed>
                  <Box padding={16}>
                    <Inline space={24} alignItems="center">
                      <Stack space={2}>
                        <Text1 regular color={skinVars.colors.textSecondary}>
                          {t.colUsed}
                        </Text1>
                        <Text3 medium color={skinVars.colors.textPrimary}>
                          {fmt.format(detailSummary.usedTokens)}
                        </Text3>
                      </Stack>
                      <Stack space={2}>
                        <Text1 regular color={skinVars.colors.textSecondary}>
                          {t.colAllocation}
                        </Text1>
                        <Text3 medium color={skinVars.colors.textPrimary}>
                          {fmt.format(detailSummary.allocation)}
                        </Text3>
                      </Stack>
                      <Stack space={2}>
                        <Text1 regular color={skinVars.colors.textSecondary}>
                          {t.colStatus}
                        </Text1>
                        <Tag type={quotaTagType(detailSummary.quotaState)}>
                          {detailSummary.quotaState === "exceeded"
                            ? t.statusExceeded
                            : detailSummary.quotaState === "warning"
                              ? t.statusWarning
                              : t.statusOk}
                        </Tag>
                      </Stack>
                      <Stack space={2}>
                        <Text1 regular color={skinVars.colors.textSecondary}>
                          {t.colCalls}
                        </Text1>
                        <Text3 medium color={skinVars.colors.textPrimary}>
                          {fmt.format(detailSummary.calls)}
                        </Text3>
                      </Stack>
                    </Inline>
                  </Box>
                </Boxed>
              )}

              {detailQ.data && detailQ.data.byModule.length > 0 && (
                <Stack space={8}>
                  <Title3>{t.byModule}</Title3>
                  <Table
                    heading={[t.colModule, t.colCalls, t.colInput, t.colOutput]}
                    content={detailQ.data.byModule.map((m) => [
                      <Text2 medium color={skinVars.colors.textPrimary} key={`${m.module}-m`}>
                        {m.module}
                      </Text2>,
                      fmt.format(m.calls),
                      fmt.format(m.inputTokens),
                      fmt.format(m.outputTokens),
                    ])}
                  />
                </Stack>
              )}

              {detailQ.data && detailQ.data.entries.length > 0 ? (
                <Stack space={8}>
                  <Title3>{t.entriesTitle}</Title3>
                  <Table
                    heading={[t.colWhen, t.colModule, t.colInput, t.colOutput]}
                    content={detailQ.data.entries.slice(0, 50).map((e) => [
                      <Text2
                        regular
                        color={skinVars.colors.textSecondary}
                        key={`${e.id}-when`}
                      >
                        {formatWhen(e.ts)}
                      </Text2>,
                      e.module,
                      fmt.format(e.inputTokens),
                      fmt.format(e.outputTokens),
                    ])}
                  />
                </Stack>
              ) : (
                detailQ.data && (
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {t.empty}
                  </Text2>
                )
              )}

              <Inline space={8}>
                <ButtonDanger
                  small
                  onPress={() => {
                    setResetTarget(ledgerEmail);
                    setMutationError(null);
                  }}
                >
                  {t.reset}
                </ButtonDanger>
              </Inline>
            </Stack>
          </Box>
        </Drawer>
      )}
    </Stack>
  );
}
