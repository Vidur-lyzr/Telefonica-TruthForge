import React from "react";
import { useListDataSources } from "@workspace/api-client-react";
import type { ManualUploadResult } from "@workspace/api-client-react";
import {
  Box,
  Stack,
  Inline,
  Grid,
  GridItem,
  Boxed,
  Divider,
  Circle,
  Tag,
  Callout,
  ButtonPrimary,
  ButtonSecondary,
  TextField,
  Select,
  Drawer,
  Text1,
  Text2,
  Text3,
  Title2,
  Title3,
  skinVars,
  IconDatabaseConnectedRegular,
  IconTagRegular,
  IconCloudUploadRegular,
  IconSettingsRegular,
  IconAntennaRegular,
  IconCheckedRegular,
} from "@telefonica/mistica";
import { useDataCenter, type UploadedDoc } from "./state";
import { SOURCE_LOGOS } from "./source-logos";
import { sourceStatusTagType, sourceStatusLabel, clearanceLabel, localeFor } from "./helpers";
import { useApp } from "../app-provider";
import { DATA_I18N } from "../../i18n/data";

type IconType = React.ComponentType<{ size?: number; color?: string }>;

const SOURCE_ICON: Record<string, IconType> = {
  live: IconAntennaRegular,
  filtered: IconTagRegular,
  manual: IconCloudUploadRegular,
  to_configure: IconSettingsRegular,
};

const AREAS = ["Comunicación", "Marca", "Gabinete"];
const CLEARANCES = ["public", "private", "confidential", "off_the_record"];

const emptyUpload = {
  title: "",
  owner: "",
  country: "Group",
  brand: "Telefónica",
  confidentiality: "private",
  area: "",
  language: "en",
};

const UPLOAD_LANGUAGES = [
  { value: "en", text: "English" },
  { value: "es", text: "Español" },
  { value: "de", text: "Deutsch" },
  { value: "pt", text: "Português" },
];

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.txt,.md,.markdown";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SourceMeta({ label, value }: { label: string; value: string }) {
  return (
    <Stack space={2}>
      <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
        {label}
      </Text1>
      <Text2 medium color={skinVars.colors.textPrimary}>
        {value}
      </Text2>
    </Stack>
  );
}

export default function SourcesArea() {
  const { lang } = useApp();
  const t = DATA_I18N[lang];
  const s2 = t.sources;
  const { data: sources } = useListDataSources();
  const { uploads, addUpload } = useDataCenter();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({ ...emptyUpload });
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const sessionUploadCount = uploads.length;

  const sourcesWithSession = React.useMemo(() => {
    return (sources ?? []).map((s) =>
      s.id === "src-manual" ? { ...s, docCount: s.docCount + sessionUploadCount } : s,
    );
  }, [sources, sessionUploadCount]);

  const draftValid =
    draft.title.trim().length > 0 && draft.owner.trim().length > 0 && file !== null;

  function onFilePicked(picked: File | null) {
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

  function closeDialog() {
    if (uploading) return;
    setDialogOpen(false);
    setUploadError(null);
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
      setDraft({ ...emptyUpload });
      setFile(null);
      setDialogOpen(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : s2.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Stack space={24}>
      <div
        style={{
          backgroundColor: skinVars.colors.navigationBarBackground,
          borderRadius: skinVars.borderRadii.container,
        }}
      >
        <Box padding={24}>
          <Stack space={16}>
            <Inline space={8} alignItems="center">
              <IconDatabaseConnectedRegular size={20} color={skinVars.colors.inverse} />
              <Text3 medium color={skinVars.colors.textPrimaryInverse}>
                {s2.bannerTitle}
              </Text3>
            </Inline>
            <Text2 regular color={skinVars.colors.textSecondaryInverse}>
              {s2.bannerDesc}
            </Text2>
          </Stack>
        </Box>
      </div>

      <Grid columns={2} gap={16}>
        {sourcesWithSession.map((s) => {
          const Logo = SOURCE_LOGOS[s.id];
          const Icon = SOURCE_ICON[s.status] ?? IconDatabaseConnectedRegular;
          return (
            <GridItem key={s.id}>
              <Boxed>
                <Box padding={24}>
                  <Stack space={16}>
                    <Inline space="between" alignItems="center">
                      <Inline space={12} alignItems="center">
                        <Circle
                          size={44}
                          backgroundColor={
                            Logo ? skinVars.colors.neutralLow : skinVars.colors.brandLow
                          }
                        >
                          {Logo ? (
                            <Logo size={22} />
                          ) : (
                            <Icon size={20} color={skinVars.colors.brand} />
                          )}
                        </Circle>
                        <Stack space={2}>
                          <Title3>{s.name}</Title3>
                          <Text1 regular color={skinVars.colors.textSecondary}>
                            {s.type}
                          </Text1>
                        </Stack>
                      </Inline>
                      <Tag type={sourceStatusTagType(s.status)}>{sourceStatusLabel(s.status)}</Tag>
                    </Inline>

                    <Text2 regular color={skinVars.colors.textSecondary}>
                      {s.description}
                    </Text2>

                    {s.externalFilter && s.filterNote && (
                      <Boxed>
                        <Box padding={12}>
                          <Inline space={8} alignItems="center">
                            <IconTagRegular size={16} color={skinVars.colors.brand} />
                            <Text2 medium color={skinVars.colors.textPrimary}>
                              {s.filterNote}
                            </Text2>
                          </Inline>
                        </Box>
                      </Boxed>
                    )}

                    <Divider />

                    <Inline space="between">
                      <SourceMeta label={s2.documents} value={s.docCount.toLocaleString(localeFor(lang))} />
                      <SourceMeta label={s2.cadence} value={s.cadence} />
                      <SourceMeta label={s2.lastSync} value={s.lastSync ?? "—"} />
                    </Inline>

                    {s.status === "manual" && (
                      <ButtonPrimary
                        small
                        onPress={() => {
                          setFile(null);
                          setUploadError(null);
                          setDialogOpen(true);
                        }}
                      >
                        {s2.manualUpload}
                      </ButtonPrimary>
                    )}
                    {s.status === "to_configure" && (
                      <Inline space={8} alignItems="center">
                        <IconSettingsRegular size={16} color={skinVars.colors.warning} />
                        <Text2 medium color={skinVars.colors.warning}>
                          {s2.connectorPlanned}
                        </Text2>
                      </Inline>
                    )}
                  </Stack>
                </Box>
              </Boxed>
            </GridItem>
          );
        })}
      </Grid>

      {uploads.length > 0 && (
        <Stack space={16}>
          <Inline space={8} alignItems="center">
            <IconCheckedRegular size={20} color={skinVars.colors.success} />
            <Title2>{s2.addedThisSession}</Title2>
          </Inline>
          <Boxed>
            <Box padding={16}>
              <Stack space={8}>
                {uploads.map((u, i) => (
                  <React.Fragment key={u.id}>
                    {i > 0 && <Divider />}
                    <Box paddingY={8}>
                      <Inline space="between" alignItems="center">
                        <Stack space={2}>
                          <Text2 medium color={skinVars.colors.textPrimary}>
                            {u.title}
                          </Text2>
                          <Text1 regular color={skinVars.colors.textSecondary}>
                            {u.owner} · {u.country} · {u.brand} · {u.docId}
                          </Text1>
                          {u.pointsAfter > u.pointsBefore && (
                            <Text1 regular color={skinVars.colors.textSecondary}>
                              {s2.indexProof(u.pointsBefore, u.pointsAfter)}
                            </Text1>
                          )}
                        </Stack>
                        <Tag type="success">{s2.inCorpus(u.chunkCount)}</Tag>
                      </Inline>
                    </Box>
                  </React.Fragment>
                ))}
              </Stack>
            </Box>
          </Boxed>
        </Stack>
      )}

      {dialogOpen && (
        <Drawer
          title={s2.uploadTitle}
          description={s2.uploadDesc}
          onClose={closeDialog}
          onDismiss={closeDialog}
        >
          <Stack space={16}>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              style={{ display: "none" }}
              onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
            />
            <Stack space={8}>
              <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                {s2.file}
              </Text1>
              <Inline space={12} alignItems="center">
                <ButtonSecondary
                  small
                  onPress={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {s2.chooseFile}
                </ButtonSecondary>
                <Text2
                  regular
                  color={
                    file ? skinVars.colors.textPrimary : skinVars.colors.textSecondary
                  }
                >
                  {file ? `${file.name} · ${formatFileSize(file.size)}` : s2.fileHint}
                </Text2>
              </Inline>
            </Stack>
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
              onChangeValue={(v) => setDraft((d) => ({ ...d, owner: v }))}
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
              <ButtonSecondary onPress={closeDialog} disabled={uploading}>
                {s2.cancel}
              </ButtonSecondary>
            </Inline>
          </Stack>
        </Drawer>
      )}
    </Stack>
  );
}
