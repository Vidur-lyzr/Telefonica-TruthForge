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

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function RetrievalLogSection() {
  const [docInput, setDocInput] = React.useState("");
  const [roleInput, setRoleInput] = React.useState("");
  const [applied, setApplied] = React.useState<{ docId?: string; roleId?: string }>({});
  const [detail, setDetail] = React.useState<RetrievalLogEntry | null>(null);

  const logQ = useListRetrievalLog({ ...applied, limit: 30 });
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
          <Title3>Retrieval audit log</Title3>
        </Inline>
        <Text2 regular color={skinVars.colors.textSecondary}>
          Every retrieval the agents ran: who asked, under which governance filter, which chunks
          were considered and which were blocked. Ids and scores only — never chunk text.
        </Text2>
      </Stack>

      <Inline space={12} alignItems="flex-end" wrap>
        <TextField
          name="retrieval-doc-filter"
          label="Filter by document id"
          value={docInput}
          onChangeValue={setDocInput}
        />
        <TextField
          name="retrieval-role-filter"
          label="Filter by persona id"
          value={roleInput}
          onChangeValue={setRoleInput}
        />
        <ButtonSecondary small onPress={applyFilters}>
          Apply
        </ButtonSecondary>
        {(applied.docId || applied.roleId) && (
          <ButtonLink small onPress={clearFilters}>
            Clear
          </ButtonLink>
        )}
      </Inline>

      {entries.length === 0 ? (
        <Boxed>
          <Box padding={24}>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {applied.docId || applied.roleId
                ? "No retrievals match these filters."
                : "No retrievals logged yet. Ask a question in Ask or generate a draft and the events will appear here."}
            </Text2>
          </Box>
        </Boxed>
      ) : (
        <Table
          heading={["When", "Surface", "Persona", "Outcome", "Query", "Retrieval"]}
          content={entries.map((e) => {
            const hits = e.events.reduce((n, ev) => n + ev.hits.length, 0);
            const blocked = e.events.reduce(
              (n, ev) => n + ev.hits.filter((h) => !h.accessible).length,
              0,
            );
            return [
              <Text2 regular color={skinVars.colors.textSecondary} key={`${e.id}-when`}>
                {formatTimestamp(e.timestamp)}
              </Text2>,
              <Tag type={e.surface === "ask" ? "info" : "promo"} key={`${e.id}-surface`}>
                {e.surface}
              </Tag>,
              <Stack space={2} key={`${e.id}-persona`}>
                <Text2 medium color={skinVars.colors.textPrimary}>
                  {e.roleLabel ?? "System"}
                </Text2>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {e.clearance}
                  {e.area ? ` · ${e.area}` : ""}
                </Text1>
              </Stack>,
              <Tag type={statusTagType(e.status)} key={`${e.id}-status`}>
                {e.status ?? "in flight"}
              </Tag>,
              <Text2 regular color={skinVars.colors.textSecondary} key={`${e.id}-query`}>
                {e.events[0]?.query ?? ""}
              </Text2>,
              <Inline space={8} alignItems="center" key={`${e.id}-hits`}>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {hits} hit{hits === 1 ? "" : "s"}
                  {blocked > 0 ? ` · ${blocked} blocked` : ""}
                </Text2>
                <ButtonLink small onPress={() => setDetail(e)}>
                  Detail
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
                  <Title2>Retrieval detail</Title2>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {detail.roleLabel ?? "System"} · {detail.clearance}
                    {detail.area ? ` · ${detail.area}` : ""} · {formatTimestamp(detail.timestamp)} ·
                    outcome {detail.status ?? "in flight"}
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
                          Filter: {ev.filterExpr}
                        </Text1>
                        <Table
                          heading={["Chunk", "Document", "Score", "Access"]}
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
                              {h.accessible ? "Permitted" : "Blocked"}
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
