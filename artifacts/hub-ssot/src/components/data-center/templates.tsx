// Templates area — master-deck intake. A documentalist uploads the slimmed
// corporate master deck (as one or more parts), the extraction pipeline runs
// asynchronously, and the resulting layout proposals wait for Brand-admin
// review. This view covers intake and job monitoring; the review drawer
// hangs off each ready job.

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  requestMasterDeckUploadUrl,
  createMasterDeckJob,
  useListMasterDeckJobs,
  getListMasterDeckJobsQueryKey,
} from "@workspace/api-client-react";
import type { MasterDeckJobSummary } from "@workspace/api-client-react";
import {
  Box,
  Stack,
  Inline,
  Boxed,
  Circle,
  Callout,
  ButtonPrimary,
  ButtonSecondary,
  TextField,
  Select,
  Text1,
  Text2,
  Title3,
  skinVars,
  IconCloudUploadRegular,
  IconDownloadRegular,
  IconLayersRegular,
  IconInformationRegular,
} from "@telefonica/mistica";
import { useApp } from "../app-provider";
import { formatTimestamp } from "./helpers";
import { DATA_I18N } from "../../i18n/data";
import { DeckReviewDrawer } from "./deck-review";

const MAX_PART_BYTES = 800 * 1024 * 1024;
const MAX_TOTAL_BYTES = 800 * 1024 * 1024;
const MAX_PARTS = 8;
const ACTIVE_STATUSES = ["uploaded", "parsing", "clustering", "proposing"];

function errorMessageOf(err: unknown): string | null {
  if (err && typeof err === "object") {
    const rec = err as Record<string, unknown>;
    if (typeof rec["error"] === "string") return rec["error"];
    if (typeof rec["message"] === "string") return rec["message"];
  }
  return null;
}

function statusColor(status: MasterDeckJobSummary["status"]): string {
  if (status === "ready") return skinVars.colors.success;
  if (status === "failed") return skinVars.colors.error;
  return skinVars.colors.warning;
}

function JobCard({
  job,
  onReview,
}: {
  job: MasterDeckJobSummary;
  onReview: (job: MasterDeckJobSummary) => void;
}) {
  const { lang } = useApp();
  const t = DATA_I18N[lang].deckIntake;

  const summaryBits: string[] = [t.partCount(job.partCount)];
  if (typeof job.slideCount === "number") summaryBits.push(t.slideCount(job.slideCount));
  if (job.familyCount > 0) summaryBits.push(t.familiesSummary(job.familyCount, job.pendingFamilies));
  if (job.harvestCount > 0) summaryBits.push(t.harvestSummary(job.harvestCount, job.pendingHarvest));

  return (
    <Boxed>
      <Box padding={16}>
        <Stack space={8}>
          <Inline space={8} alignItems="center">
            <Circle size={10} backgroundColor={statusColor(job.status)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text2 medium color={skinVars.colors.textPrimary}>
                {job.deckName}
              </Text2>
            </div>
            <Text1 medium color={statusColor(job.status)}>
              {t.status[job.status] ?? job.status}
            </Text1>
          </Inline>
          <Text1 regular color={job.status === "failed" ? skinVars.colors.error : skinVars.colors.textSecondary}>
            {job.status === "failed" && job.error ? job.error : job.progress}
          </Text1>
          <Inline space={8} alignItems="center" wrap>
            <Text1 regular color={skinVars.colors.textSecondary}>
              {job.kind.toUpperCase()} · {summaryBits.join(" · ")}
            </Text1>
            <div style={{ flex: 1 }} />
            <Text1 regular color={skinVars.colors.textSecondary}>
              {t.byUser(job.createdBy)} · {formatTimestamp(job.updatedAt, lang)}
            </Text1>
          </Inline>
          {job.status === "ready" && (
            <Inline space={12}>
              <ButtonSecondary small onPress={() => onReview(job)}>
                {t.review.open}
              </ButtonSecondary>
            </Inline>
          )}
        </Stack>
      </Box>
    </Boxed>
  );
}

export default function TemplatesArea() {
  const { lang, roleId } = useApp();
  const t = DATA_I18N[lang].deckIntake;
  const queryClient = useQueryClient();

  const [deckName, setDeckName] = React.useState("");
  const [kind, setKind] = React.useState<"pptx" | "pdf" | "zip">("pptx");
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [step, setStep] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reviewJob, setReviewJob] = React.useState<{ id: string; deckName: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const { data } = useListMasterDeckJobs({
    query: {
      queryKey: getListMasterDeckJobsQueryKey(),
      refetchInterval: (query) => {
        const jobs = query.state.data?.jobs ?? [];
        return jobs.some((j) => ACTIVE_STATUSES.includes(j.status)) ? 2500 : false;
      },
    },
  });
  const jobs = data?.jobs ?? [];

  const onFilesPicked = (list: FileList | null) => {
    setError(null);
    const picked = Array.from(list ?? []).slice(0, MAX_PARTS);
    for (const f of picked) {
      if (f.size > MAX_PART_BYTES) {
        setError(t.fileTooLarge(f.name));
        return;
      }
    }
    if (picked.reduce((acc, f) => acc + f.size, 0) > MAX_TOTAL_BYTES) {
      setError(t.totalTooLarge);
      return;
    }
    setFiles(picked);
  };

  const reset = () => {
    setDeckName("");
    setFiles([]);
    setStep(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!deckName.trim() || files.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const parts: { objectPath: string; filename: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStep(t.uploadingPart(i + 1, files.length));
        const { uploadURL, objectPath } = await requestMasterDeckUploadUrl({
          roleId,
          filename: file.name,
          size: file.size,
          kind,
        });
        const put = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": "application/octet-stream" },
        });
        if (!put.ok) throw new Error(`upload failed: ${put.status}`);
        parts.push({ objectPath, filename: file.name });
      }
      setStep(t.creatingJob);
      await createMasterDeckJob({ roleId, deckName: deckName.trim(), kind, parts });
      reset();
      await queryClient.invalidateQueries({ queryKey: getListMasterDeckJobsQueryKey() });
    } catch (err) {
      setError(errorMessageOf(err) ?? t.uploadFailed);
      setStep(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack space={24}>
      <Callout
        asset={<IconLayersRegular color={skinVars.colors.brand} />}
        title={t.introTitle}
        description={t.introDesc}
        button={
          <ButtonSecondary
            small
            StartIcon={IconDownloadRegular}
            onPress={() => {
              window.open(`${import.meta.env.BASE_URL}api/data/master-decks/guide`, "_blank");
            }}
          >
            {t.guideButton}
          </ButtonSecondary>
        }
      />

      <Boxed>
        <Box padding={24}>
          <Stack space={16}>
            <Title3>{t.uploadTitle}</Title3>
            <Inline space={16} wrap>
              <div style={{ flex: 2, minWidth: 220 }}>
                <TextField
                  name="deckName"
                  label={t.deckNameLabel}
                  placeholder={t.deckNamePlaceholder}
                  value={deckName}
                  onChangeValue={setDeckName}
                  maxLength={120}
                  fullWidth
                  disabled={busy}
                />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Select
                  name="deckKind"
                  label={t.formatLabel}
                  value={kind}
                  onChangeValue={(v) => {
                    setKind(v === "pdf" ? "pdf" : v === "zip" ? "zip" : "pptx");
                    setFiles([]);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  options={[
                    { value: "pptx", text: t.formatPptx },
                    { value: "pdf", text: t.formatPdf },
                    { value: "zip", text: t.formatZip },
                  ]}
                  fullWidth
                  disabled={busy}
                />
              </div>
            </Inline>

            <input
              ref={fileRef}
              type="file"
              multiple
              accept={kind === "pptx" ? ".pptx" : kind === "pdf" ? ".pdf" : ".zip"}
              style={{ display: "none" }}
              onChange={(e) => onFilesPicked(e.target.files)}
            />
            <Inline space={12} alignItems="center" wrap>
              <ButtonSecondary
                small
                StartIcon={IconCloudUploadRegular}
                onPress={() => fileRef.current?.click()}
                disabled={busy}
              >
                {t.chooseFiles}
              </ButtonSecondary>
              <Text1 regular color={skinVars.colors.textSecondary}>
                {files.length > 0 ? t.selectedFiles(files.length) : t.filesHint}
              </Text1>
            </Inline>
            {files.length > 0 && (
              <Stack space={4}>
                {files.map((f) => (
                  <Text1 key={f.name} regular color={skinVars.colors.textSecondary}>
                    {f.name} · {(f.size / (1024 * 1024)).toFixed(1)} MB
                  </Text1>
                ))}
              </Stack>
            )}

            {error && (
              <Callout
                asset={<IconInformationRegular color={skinVars.colors.error} />}
                title={t.uploadFailed}
                description={error}
              />
            )}

            <Inline space={12} alignItems="center">
              <ButtonPrimary
                small
                onPress={handleUpload}
                disabled={busy || !deckName.trim() || files.length === 0}
              >
                {t.startExtraction}
              </ButtonPrimary>
              {busy && step && (
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {step}
                </Text1>
              )}
            </Inline>
          </Stack>
        </Box>
      </Boxed>

      <Stack space={12}>
        <Title3>{t.jobsTitle}</Title3>
        {jobs.length === 0 ? (
          <Boxed>
            <Box padding={24}>
              <Stack space={8}>
                <Text2 medium color={skinVars.colors.textPrimary}>
                  {t.noJobs}
                </Text2>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {t.noJobsDesc}
                </Text1>
              </Stack>
            </Box>
          </Boxed>
        ) : (
          <Stack space={12}>
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onReview={(j) => setReviewJob({ id: j.id, deckName: j.deckName })}
              />
            ))}
          </Stack>
        )}
      </Stack>

      {reviewJob && (
        <DeckReviewDrawer
          jobId={reviewJob.id}
          deckName={reviewJob.deckName}
          onClose={() => setReviewJob(null)}
        />
      )}
    </Stack>
  );
}
