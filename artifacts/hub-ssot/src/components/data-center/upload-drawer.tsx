import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListRoles,
  useListAxes,
  getListDocumentsQueryKey,
  getGetCorpusStatsQueryKey,
} from "@workspace/api-client-react";
import type { ManualUploadResult } from "@workspace/api-client-react";
import {
  Stack,
  Inline,
  Chip,
  Callout,
  ButtonPrimary,
  ButtonSecondary,
  TextField,
  Select,
  Drawer,
  Text1,
  Text2,
  Title3,
  skinVars,
  IconCloudUploadRegular,
  IconDocumentOtherRegular,
} from "@telefonica/mistica";
import { useDataCenter, type UploadedDoc } from "./state";
import { clearanceLabel } from "./helpers";
import { useApp } from "../app-provider";
import { DATA_I18N } from "../../i18n/data";

const AREAS = ["Comunicación", "Marca", "Gabinete"];
const CLEARANCES = ["public", "private", "confidential", "off_the_record"];

const DOC_TYPES = [
  "Uploaded document",
  "Report",
  "Briefing",
  "Guideline",
  "Strategy",
  "Memo",
  "Note",
  "Press release",
  "Market update",
  "Plan",
  "Playbook",
  "Messaging",
  "Internal comms",
];

const UPLOAD_LANGUAGES = [
  { value: "en", text: "English" },
  { value: "es", text: "Español" },
  { value: "de", text: "Deutsch" },
  { value: "pt", text: "Português" },
];

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".markdown"];
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");

function hasAcceptedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const emptyDraft = {
  title: "",
  owner: "",
  country: "Group",
  brand: "Telefónica",
  confidentiality: "private",
  area: "",
  language: "en",
  docType: "Uploaded document",
};

export function UploadDrawer({ onClose }: { onClose: () => void }) {
  const { lang, roleId } = useApp();
  const t = DATA_I18N[lang];
  const s2 = t.sources;
  const { addUpload } = useDataCenter();
  const queryClient = useQueryClient();
  const { data: roles } = useListRoles();
  const { data: axes } = useListAxes();
  const activeAxes = React.useMemo(
    () => (axes ?? []).filter((a) => !a.retired),
    [axes],
  );

  const [draft, setDraft] = React.useState({ ...emptyDraft });
  const [topics, setTopics] = React.useState<string[]>([]);
  const [topicInput, setTopicInput] = React.useState("");
  const [axisIds, setAxisIds] = React.useState<string[]>([]);
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const ownerEditedRef = React.useRef(false);

  // Prefill the owner with the active persona; keep respecting manual edits.
  React.useEffect(() => {
    if (ownerEditedRef.current) return;
    const active = (roles ?? []).find((r) => r.id === roleId);
    if (active) setDraft((d) => (d.owner === active.name ? d : { ...d, owner: active.name }));
  }, [roles, roleId]);

  const draftValid =
    draft.title.trim().length > 0 && draft.owner.trim().length > 0 && file !== null;

  function onFilePicked(picked: File | null) {
    if (picked && !hasAcceptedExtension(picked.name)) {
      setUploadError(s2.unsupportedType);
      return;
    }
    setFile(picked);
    setUploadError(null);
    if (picked && draft.title.trim().length === 0) {
      const base = picked.name
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]+/g, " ")
        .trim();
      if (base) setDraft((d) => ({ ...d, title: base }));
    }
  }

  function addTopic() {
    const value = topicInput.trim().toLowerCase().replace(/,/g, " ").trim();
    setTopicInput("");
    if (!value) return;
    setTopics((prev) =>
      prev.includes(value) || prev.length >= 12 ? prev : [...prev, value],
    );
  }

  function toggleAxis(id: string) {
    setAxisIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }

  function close() {
    if (uploading) return;
    onClose();
  }

  async function commitUpload() {
    if (!file || uploading) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", draft.title.trim());
      form.append("owner", draft.owner.trim());
      form.append("country", draft.country.trim());
      form.append("brand", draft.brand.trim());
      form.append("confidentiality", draft.confidentiality);
      form.append("area", draft.area);
      form.append("language", draft.language);
      form.append("docType", draft.docType);
      form.append("topics", topics.join(","));
      form.append("axisIds", axisIds.join(","));

      const response = await fetch("/api/data/upload", { method: "POST", body: form });
      const payload = (await response.json().catch(() => null)) as
        | (ManualUploadResult & { error?: string })
        | null;
      if (!response.ok || !payload || typeof payload.docId !== "string") {
        throw new Error(payload?.error || s2.uploadFailed);
      }

      const doc: UploadedDoc = {
        id: payload.docId,
        docId: payload.docId,
        title: payload.title,
        source: "Manual upload",
        owner: draft.owner.trim(),
        confidentiality: draft.confidentiality,
        country: draft.country.trim(),
        brand: draft.brand.trim(),
        chunkCount: payload.chunkCount,
        pointsBefore: payload.pointsBefore,
        pointsAfter: payload.pointsAfter,
      };
      addUpload(doc);
      // The new document is part of the governed corpus now — refresh lists.
      void queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getGetCorpusStatsQueryKey() });
      onClose();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : s2.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Drawer
      title={s2.uploadTitle}
      description={s2.uploadDesc}
      onClose={close}
      onDismiss={close}
    >
      <Stack space={16}>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          style={{ display: "none" }}
          onChange={(e) => {
            onFilePicked(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <div
          role="button"
          tabIndex={0}
          aria-label={s2.chooseFile}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !uploading) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            // Ignore dragleave fired when moving over child elements.
            if (
              event.relatedTarget instanceof Node &&
              event.currentTarget.contains(event.relatedTarget)
            ) {
              return;
            }
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (uploading) return;
            onFilePicked(e.dataTransfer.files?.[0] ?? null);
          }}
          style={{
            border: `2px dashed ${
              dragActive ? skinVars.colors.controlActivated : skinVars.colors.border
            }`,
            borderRadius: skinVars.borderRadii.container,
            backgroundColor: dragActive
              ? skinVars.colors.brandLow
              : skinVars.colors.backgroundAlternative,
            padding: 24,
            textAlign: "center",
            cursor: uploading ? "default" : "pointer",
            transition: "background-color 150ms ease, border-color 150ms ease",
          }}
        >
          <Stack space={8}>
            <Inline space={0} alignItems="center">
              {file ? (
                <IconDocumentOtherRegular size={28} color={skinVars.colors.brand} />
              ) : (
                <IconCloudUploadRegular
                  size={28}
                  color={
                    dragActive ? skinVars.colors.controlActivated : skinVars.colors.neutralMedium
                  }
                />
              )}
            </Inline>
            {file ? (
              <Stack space={4}>
                <Text2 medium color={skinVars.colors.textPrimary}>
                  {file.name} · {formatFileSize(file.size)}
                </Text2>
                <Inline space={0} alignItems="center">
                  <Chip
                    onClose={() => {
                      if (!uploading) setFile(null);
                    }}
                  >
                    {s2.removeFile}
                  </Chip>
                </Inline>
              </Stack>
            ) : (
              <Stack space={4}>
                <Text2 medium color={skinVars.colors.textPrimary}>
                  {dragActive ? s2.dropActive : s2.dropHint}
                </Text2>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {s2.fileHint}
                </Text1>
              </Stack>
            )}
          </Stack>
        </div>

        <TextField
          name="up-title"
          label={s2.title}
          value={draft.title}
          onChangeValue={(v) => setDraft((d) => ({ ...d, title: v }))}
        />
        <TextField
          name="up-owner"
          label={s2.owner}
          value={draft.owner}
          onChangeValue={(v) => {
            ownerEditedRef.current = true;
            setDraft((d) => ({ ...d, owner: v }));
          }}
        />
        <Inline space={16}>
          <div style={{ flex: 1 }}>
            <TextField
              name="up-country"
              label={s2.country}
              value={draft.country}
              onChangeValue={(v) => setDraft((d) => ({ ...d, country: v }))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <TextField
              name="up-brand"
              label={s2.brand}
              value={draft.brand}
              onChangeValue={(v) => setDraft((d) => ({ ...d, brand: v }))}
            />
          </div>
        </Inline>
        <Inline space={16}>
          <div style={{ flex: 1 }}>
            <Select
              name="up-confidentiality"
              label={s2.confidentiality}
              value={draft.confidentiality}
              onChangeValue={(v) => setDraft((d) => ({ ...d, confidentiality: v }))}
              options={CLEARANCES.map((c) => ({ value: c, text: clearanceLabel(c, lang) }))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Select
              name="up-area"
              label={s2.area}
              value={draft.area}
              onChangeValue={(v) => setDraft((d) => ({ ...d, area: v }))}
              options={[
                { value: "", text: s2.allAreas },
                ...AREAS.map((a) => ({ value: a, text: a })),
              ]}
            />
          </div>
        </Inline>
        <Select
          name="up-language"
          label={s2.language}
          value={draft.language}
          onChangeValue={(v) => setDraft((d) => ({ ...d, language: v }))}
          options={UPLOAD_LANGUAGES}
        />

        <Stack space={12}>
          <Title3>{s2.taggingTitle}</Title3>
          <Select
            name="up-doctype"
            label={s2.docType}
            value={draft.docType}
            onChangeValue={(v) => setDraft((d) => ({ ...d, docType: v }))}
            options={DOC_TYPES.map((d) => ({ value: d, text: d }))}
          />
          <Stack space={8}>
            <Inline space={12} alignItems="center">
              <div style={{ flex: 1 }}>
                <TextField
                  name="up-topic"
                  label={s2.topicsLabel}
                  value={topicInput}
                  onChangeValue={setTopicInput}
                />
              </div>
              <ButtonSecondary
                small
                onPress={addTopic}
                disabled={topicInput.trim().length === 0}
              >
                {s2.addTopic}
              </ButtonSecondary>
            </Inline>
            {topics.length > 0 ? (
              <Inline space={8} wrap>
                {topics.map((topic) => (
                  <Chip
                    key={topic}
                    onClose={() => setTopics((prev) => prev.filter((x) => x !== topic))}
                  >
                    {topic}
                  </Chip>
                ))}
              </Inline>
            ) : (
              <Text1 regular color={skinVars.colors.textSecondary}>
                {s2.topicsHint}
              </Text1>
            )}
          </Stack>
          {activeAxes.length > 0 && (
            <Stack space={8}>
              <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                {s2.axesLabel}
              </Text1>
              <Inline space={8} wrap>
                {activeAxes.map((axis) => (
                  <Chip
                    key={axis.id}
                    active={axisIds.includes(axis.id)}
                    onPress={() => toggleAxis(axis.id)}
                  >
                    {axis.name}
                  </Chip>
                ))}
              </Inline>
            </Stack>
          )}
        </Stack>

        {uploadError && (
          <Callout
            title={s2.uploadFailed}
            description={uploadError}
            onClose={() => setUploadError(null)}
          />
        )}
        <Inline space={12}>
          <ButtonPrimary onPress={commitUpload} disabled={!draftValid || uploading}>
            {uploading ? s2.uploading : s2.uploadAndIndex}
          </ButtonPrimary>
          <ButtonSecondary onPress={close} disabled={uploading}>
            {s2.cancel}
          </ButtonSecondary>
        </Inline>
      </Stack>
    </Drawer>
  );
}
