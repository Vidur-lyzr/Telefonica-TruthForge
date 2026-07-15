import React from "react";
import {
  useListRetrievalLog,
  type RetrievalLogEntry,
} from "@workspace/api-client-react";
import {
  Box,
  Boxed,
  Stack,
  Inline,
  Table,
  Tag,
  Sheet,
  TextField,
  ButtonSecondary,
  ButtonLink,
  Text1,
  Text2,
  Title2,
  Title3,
  skinVars,
  IconSearchRegular,
} from "@telefonica/mistica";
import { useApp } from "@/components/app-provider";
import { ADMIN_I18N, localeFor } from "@/i18n/admin";

type TagType = "promo" | "info" | "active" | "inactive" | "success" | "warning" | "error";

function statusTagType(s: string | null): TagType {
  switch (s) {
    case "answered":
    case "drafted":
      return "success";
    case "no_evidence":
      return "warning";
    case "permission_blocked":
      return "error";
    case "conflict":
      return "promo";
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
    second: "2-digit",
  });
}

export default function RetrievalLogSection() {
  const { lang, roleId: viewerRoleId } = useApp();
  const t = ADMIN_I18N[lang].log;
  const locale = localeFor(lang);
  const [docInput, setDocInput] = React.useState("");
  const [roleInput, setRoleInput] = React.useState("");
  const [applied, setApplied] = React.useState<{ docId?: string; roleId?: string }>({});
  const [detail, setDetail] = React.useState<RetrievalLogEntry | null>(null);

  const logQ = useListRetrievalLog(
    { ...applied, viewerRoleId, limit: 30 },
    {
      query: {
        enabled: viewerRoleId.length > 0,
        queryKey: ["retrieval-log", viewerRoleId, applied.docId, applied.roleId],
      },
    },
  );
  const entries = logQ.data?.items ?? [];

  function applyFilters() {
    setApplied({
      docId: docInput.trim() || undefined,
      roleId: roleInput.trim() || undefined,
    });
  }

  function clearFilters() {
    setDocInput("");
    setRoleInput("");
    setApplied({});
  }

  return (
    <Stack space={16}>
      <Stack space={4}>
        <Inline space={8} alignItems="center">
          <IconSearchRegular color={skinVars.colors.brand} />
          <Title3>{t.title}</Title3>
        </Inline>
        <Text2 regular color={skinVars.colors.textSecondary}>
          {t.intro}
        </Text2>
      </Stack>

      <Inline space={12} alignItems="flex-end" wrap>
        <TextField
          name="retrieval-doc-filter"
          label={t.filterDocId}
          value={docInput}
          onChangeValue={setDocInput}
        />
        <TextField
          name="retrieval-role-filter"
          label={t.filterPersonaId}
          value={roleInput}
          onChangeValue={setRoleInput}
        />
        <ButtonSecondary small onPress={applyFilters}>
          {t.apply}
        </ButtonSecondary>
        {(applied.docId || applied.roleId) && (
          <ButtonLink small onPress={clearFilters}>
            {t.clear}
          </ButtonLink>
        )}
      </Inline>

      {entries.length === 0 ? (
        <Boxed>
          <Box padding={24}>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {applied.docId || applied.roleId ? t.noMatch : t.noneYet}
            </Text2>
          </Box>
        </Boxed>
      ) : (
        <Table
          heading={[t.colWhen, t.colSurface, t.colPersona, t.colOutcome, t.colQuery, t.colRetrieval]}
          content={entries.map((e) => {
            const hits = e.events.reduce((n, ev) => n + ev.hits.length, 0);
            const blocked = e.events.reduce(
              (n, ev) => n + ev.hits.filter((h) => !h.accessible).length,
              0,
            );
            return [
              <Text2 regular color={skinVars.colors.textSecondary} key={`${e.id}-when`}>
                {formatTimestamp(e.timestamp, locale)}
              </Text2>,
              <Tag type={e.surface === "ask" ? "info" : "promo"} key={`${e.id}-surface`}>
                {t.surfaceLabels[e.surface] ?? e.surface}
              </Tag>,
              <Stack space={2} key={`${e.id}-persona`}>
                <Text2 medium color={skinVars.colors.textPrimary}>
                  {e.roleLabel ?? t.system}
                </Text2>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {e.clearance}
                  {e.area ? ` · ${e.area}` : ""}
                </Text1>
              </Stack>,
              <Tag type={statusTagType(e.status)} key={`${e.id}-status`}>
                {e.status ? (t.statusLabels[e.status] ?? e.status) : t.inFlight}
              </Tag>,
              <Text2 regular color={skinVars.colors.textSecondary} key={`${e.id}-query`}>
                {e.events[0]?.query ?? ""}
              </Text2>,
              <Inline space={8} alignItems="center" key={`${e.id}-hits`}>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {t.hits(hits)}
                  {blocked > 0 ? t.blockedCount(blocked) : ""}
                </Text2>
                <ButtonLink small onPress={() => setDetail(e)}>
                  {t.detail}
                </ButtonLink>
              </Inline>,
            ];
          })}
        />
      )}

      {detail && (
        <Sheet onClose={() => setDetail(null)}>
          {() => (
            <Box paddingBottom={24}>
              <Stack space={16}>
                <Stack space={4}>
                  <Title2>{t.retrievalDetail}</Title2>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {t.detailSubtitle(
                      detail.roleLabel ?? t.system,
                      detail.clearance,
                      detail.area ?? "",
                      formatTimestamp(detail.timestamp, locale),
                      detail.status ? (t.statusLabels[detail.status] ?? detail.status) : t.inFlight,
                    )}
                  </Text2>
                </Stack>
                {detail.events.map((ev, i) => (
                  <Boxed key={`${detail.id}-ev-${i}`}>
                    <Box padding={16}>
                      <Stack space={12}>
                        <Inline space={8} alignItems="center" wrap>
                          <Tag type={ev.engine === "qdrant" ? "info" : "inactive"}>{ev.engine}</Tag>
                          <Text2 medium color={skinVars.colors.textPrimary}>
                            "{ev.query}"
                          </Text2>
                        </Inline>
                        <Text1 regular color={skinVars.colors.textSecondary}>
                          {t.filterPrefix(ev.filterExpr)}
                        </Text1>
                        <Table
                          heading={[t.colChunk, ADMIN_I18N[lang].colDocument, t.colScore, t.colAccessHdr]}
                          content={ev.hits.map((h) => [
                            <Text1 regular color={skinVars.colors.textSecondary} key={`${h.chunkId}-c`}>
                              {h.chunkId}
                            </Text1>,
                            <Text1 regular color={skinVars.colors.textPrimary} key={`${h.chunkId}-d`}>
                              {h.docId}
                            </Text1>,
                            <Text1 regular color={skinVars.colors.textSecondary} key={`${h.chunkId}-s`}>
                              {h.score.toFixed(3)}
                            </Text1>,
                            <Tag type={h.accessible ? "success" : "error"} key={`${h.chunkId}-a`}>
                              {h.accessible ? t.permitted : t.blocked}
                            </Tag>,
                          ])}
                        />
                      </Stack>
                    </Box>
                  </Boxed>
                ))}
              </Stack>
            </Box>
          )}
        </Sheet>
      )}
    </Stack>
  );
}
