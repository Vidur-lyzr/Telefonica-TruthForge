import React from "react";
import {
  useListAxes,
  useRetagDocuments,
  useSuggestDocumentTags,
  getListDocumentsQueryKey,
  getListAxesQueryKey,
  getGetTaxonomyStateQueryKey,
  getGetCorpusStatsQueryKey,
  RetagApplyResult,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Stack,
  Inline,
  Callout,
  Checkbox,
  TextField,
  ButtonPrimary,
  ButtonSecondary,
  Drawer,
  Text1,
  Text2,
  skinVars,
} from "@telefonica/mistica";
import { useDataCenter } from "./state";
import { useApp } from "../app-provider";
import { DATA_I18N } from "../../i18n/data";

export interface EditTagsDoc {
  id: string;
  title: string;
  axisIds: string[];
  topics: string[];
}

export function EditTagsDrawer({
  doc,
  onClose,
  onApplied,
}: {
  doc: EditTagsDoc;
  onClose: () => void;
  onApplied?: (result: RetagApplyResult) => void;
}) {
  const { lang, roleId } = useApp();
  const t = DATA_I18N[lang];
  const G = t.governance;
  const E = G.editTags;
  const queryClient = useQueryClient();
  const { data: axes } = useListAxes();
  const retagMutation = useRetagDocuments();
  const suggestMutation = useSuggestDocumentTags();
  const { runReclassification } = useDataCenter();

  const activeAxes = axes ?? [];
  const [selectedAxes, setSelectedAxes] = React.useState<Set<string>>(
    () => new Set(doc.axisIds),
  );
  const [topicsText, setTopicsText] = React.useState(doc.topics.join(", "));
  const [suggestion, setSuggestion] = React.useState<null | {
    engine: string;
    rationale: string;
    confidence: number;
  }>(null);
  const [suggestErr, setSuggestErr] = React.useState(false);
  const [applyErr, setApplyErr] = React.useState(false);
  const [applying, setApplying] = React.useState(false);

  const parsedTopics = topicsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const canApply = selectedAxes.size > 0 && !applying;

  function toggleAxis(id: string, checked: boolean) {
    setSelectedAxes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function requestSuggestion() {
    setSuggestErr(false);
    setSuggestion(null);
    try {
      const result = await suggestMutation.mutateAsync({
        data: { docIds: [doc.id], roleId },
      });
      const s = result.suggestions.find((p) => p.docId === doc.id);
      if (!s) {
        setSuggestErr(true);
        return;
      }
      const activeIds = new Set(activeAxes.map((a) => a.id));
      setSelectedAxes(new Set(s.proposedAxisIds.filter((id) => activeIds.has(id))));
      setTopicsText(s.proposedTopics.join(", "));
      setSuggestion({
        engine: result.engine,
        rationale: s.rationale,
        confidence: s.confidence,
      });
    } catch {
      setSuggestErr(true);
    }
  }

  async function apply() {
    if (selectedAxes.size === 0) return;
    setApplying(true);
    setApplyErr(false);
    try {
      const result = await retagMutation.mutateAsync({
        data: {
          roleId,
          actor: G.wizard.actor,
          note: E.note(doc.title),
          docs: [
            {
              docId: doc.id,
              axisIds: [...selectedAxes],
              topics: parsedTopics,
            },
          ],
        },
      });
      runReclassification(E.appliedDetail(doc.title, result.version));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListAxesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetTaxonomyStateQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetCorpusStatsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: ["document", doc.id] }),
      ]);
      onApplied?.(result);
      onClose();
    } catch {
      setApplyErr(true);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Drawer onClose={onClose} onDismiss={onClose} title={E.title(doc.title)}>
      <Stack space={24}>
        <Text2 regular color={skinVars.colors.textSecondary}>
          {E.desc}
        </Text2>

        <Inline space={8} alignItems="center">
          <ButtonSecondary
            small
            onPress={requestSuggestion}
            disabled={suggestMutation.isPending || applying}
          >
            {suggestMutation.isPending ? E.suggesting : E.suggest}
          </ButtonSecondary>
        </Inline>

        {suggestErr && <Callout description={E.suggestError} />}
        {suggestion && (
          <Callout
            title={
              suggestion.engine === "llm"
                ? E.suggestionEngineLlm
                : E.suggestionEngineFallback
            }
            description={E.suggestionNote(suggestion.rationale, suggestion.confidence)}
          />
        )}

        <Stack space={12}>
          <Text1 medium color={skinVars.colors.textPrimary}>
            {E.axesLabel}
          </Text1>
          <Stack space={8}>
            {activeAxes.map((axis) => (
              <Checkbox
                key={axis.id}
                name={`edit-tags-axis-${axis.id}`}
                checked={selectedAxes.has(axis.id)}
                onChange={(checked) => toggleAxis(axis.id, checked)}
              >
                <Text2 regular color={skinVars.colors.textPrimary}>
                  {axis.name}
                </Text2>
              </Checkbox>
            ))}
          </Stack>
          {selectedAxes.size === 0 && (
            <Text1 regular color={skinVars.colors.error}>
              {E.noAxes}
            </Text1>
          )}
        </Stack>

        <TextField
          fullWidth
          name="edit-tags-topics"
          label={E.topicsLabel}
          helperText={E.topicsHelper}
          value={topicsText}
          onChangeValue={setTopicsText}
        />

        {applyErr && <Callout description={E.applyError} />}

        <Inline space={12}>
          <ButtonPrimary onPress={apply} disabled={!canApply}>
            {applying ? E.applying : E.apply}
          </ButtonPrimary>
          <ButtonSecondary onPress={onClose} disabled={applying}>
            {E.cancel}
          </ButtonSecondary>
        </Inline>
        <Box paddingBottom={8} />
      </Stack>
    </Drawer>
  );
}
