import React from "react";
import {
  useGetAskDocumentPreview,
  type Citation,
} from "@workspace/api-client-react";
import {
  Box,
  Stack,
  Inline,
  Divider,
  Text1,
  Text2,
  Text3,
  Title1,
  ButtonLink,
  IconButton,
  Tag,
  Spinner,
  Circle,
  skinVars,
  IconDocumentsRegular,
  IconCloseRegular,
  IconDownloadRegular,
  IconShieldCrossRegular,
  IconWaitClockRegular,
} from "@telefonica/mistica";
import { AnswerMarkdown } from "./answer-markdown";
import type { AskStrings } from "@/i18n/ask";

// Download one rendered format (or the full ZIP pack) of a document the
// doc-gen Superflow registered during this conversation. The server re-runs
// every export governance gate before a single byte is sent.
export async function downloadAskDocument(
  documentId: string,
  format?: string,
): Promise<void> {
  const isPack = !format;
  const res = await fetch(
    isPack ? "/api/ask/documents/export-pack" : "/api/ask/documents/export",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(isPack ? { documentId } : { documentId, format }),
    },
  );
  if (!res.ok) {
    let message = "";
    try {
      message = ((await res.json()) as { error?: string }).error ?? "";
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message || `export failed: ${res.status}`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename =
    match?.[1] ?? (isPack ? `${documentId}-pack.zip` : `${documentId}.${format}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Workspace artifact panel: renders a generated document beside the chat, the
// way a real working document reads — title, governance meta, sections with
// live citation chips, and the same governed download actions as the file
// card. Content comes from the server-registered draft (never chat text);
// downloads stay gated server-side, so a Guardian-blocked document is
// readable here with its findings while its downloads remain locked.
export function ArtifactPanel({
  documentId,
  onClose,
  onOpenCitation,
  t,
}: {
  documentId: string;
  onClose: () => void;
  onOpenCitation: (c: Citation) => void;
  t: AskStrings;
}) {
  const { data: doc, isLoading, isError } = useGetAskDocumentPreview(documentId);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  // Reset transient download state when another document is opened.
  React.useEffect(() => {
    setBusy(null);
    setDownloadError(null);
  }, [documentId]);

  const download = async (format?: string) => {
    if (busy) return;
    setDownloadError(null);
    setBusy(format ?? "pack");
    try {
      await downloadAskDocument(documentId, format);
    } catch (err) {
      setDownloadError(
        err instanceof Error && err.message
          ? err.message
          : t.documents.downloadFailed,
      );
    } finally {
      setBusy(null);
    }
  };

  const blocked = doc?.guardianStatus === "block";

  return (
    <div
      style={{
        width: "clamp(360px, 42vw, 620px)",
        flexShrink: 0,
        borderLeft: `1px solid ${skinVars.colors.divider}`,
        backgroundColor: skinVars.colors.backgroundContainer,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        style={{
          borderBottom: `1px solid ${skinVars.colors.divider}`,
          padding: "12px 16px 12px 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <Circle
          size={36}
          backgroundColor={
            blocked ? skinVars.colors.errorLow : skinVars.colors.brandLow
          }
        >
          <IconDocumentsRegular
            size={18}
            color={blocked ? skinVars.colors.error : skinVars.colors.brand}
          />
        </Circle>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Stack space={2}>
            <Text3 medium truncate={1}>
              {doc?.title ?? t.panel.loading}
            </Text3>
            {doc && (
              <Text1 regular color={skinVars.colors.textSecondary} truncate={1}>
                {doc.templateName} · {doc.language.toUpperCase()} ·{" "}
                {doc.audience} · {doc.confidentiality}
              </Text1>
            )}
          </Stack>
        </div>
        <IconButton
          aria-label={t.panel.close}
          Icon={IconCloseRegular}
          onPress={onClose}
          small
        />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 32px 48px" }}>
          {isLoading && (
            <Inline space={12} alignItems="center">
              <Spinner size={20} />
              <Text2 regular color={skinVars.colors.textSecondary}>
                {t.panel.loading}
              </Text2>
            </Inline>
          )}

          {isError && (
            <div
              style={{
                backgroundColor: skinVars.colors.warningLow,
                borderRadius: skinVars.borderRadii.container,
                padding: 20,
              }}
            >
              <Inline space={12} alignItems="center">
                <IconWaitClockRegular
                  size={22}
                  color={skinVars.colors.warning}
                />
                <Text2 regular>{t.panel.unavailable}</Text2>
              </Inline>
            </div>
          )}

          {doc && (
            <Stack space={24}>
              <Stack space={8}>
                <Title1>{doc.title}</Title1>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {doc.templateName} ·{" "}
                  {t.documents.citationsCount(doc.citations.length)} ·{" "}
                  {new Date(doc.createdAt).toLocaleString()}
                </Text1>
              </Stack>

              {blocked && (
                <div
                  style={{
                    backgroundColor: skinVars.colors.errorLow,
                    borderRadius: skinVars.borderRadii.container,
                    padding: 20,
                  }}
                >
                  <Stack space={12}>
                    <Inline space={12} alignItems="center">
                      <IconShieldCrossRegular
                        size={22}
                        color={skinVars.colors.error}
                      />
                      <Text2 medium>{t.documents.guardianBlocked}</Text2>
                    </Inline>
                    <Text2 regular>{doc.guardianSummary}</Text2>
                    {doc.guardianFindings.length > 0 && (
                      <Stack space={8}>
                        <Text1
                          medium
                          color={skinVars.colors.textSecondary}
                          transform="uppercase"
                        >
                          {t.panel.guardianFindings}
                        </Text1>
                        {doc.guardianFindings.map((f, i) => (
                          <Text1 regular key={`${f.rule}-${i}`}>
                            {f.rule}: {f.message}
                            {f.suggestion ? ` — ${f.suggestion}` : ""}
                          </Text1>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </div>
              )}

              {doc.note && (
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {doc.note}
                </Text2>
              )}

              <Divider />

              <Stack space={32}>
                {doc.sections.map((section) => (
                  <Stack space={8} key={section.id}>
                    <Inline space={8} alignItems="center">
                      <Text3 medium>{section.heading}</Text3>
                      {section.internalOnly && (
                        <Tag type="warning">{t.panel.internalOnly}</Tag>
                      )}
                    </Inline>
                    <AnswerMarkdown
                      text={section.body}
                      citations={doc.citations}
                      onOpenCitation={onOpenCitation}
                    />
                  </Stack>
                ))}
              </Stack>
            </Stack>
          )}
        </div>
      </div>

      {doc && (
        <div
          style={{
            borderTop: `1px solid ${skinVars.colors.divider}`,
            padding: "12px 24px",
            flexShrink: 0,
          }}
        >
          <Stack space={8}>
            <Text1
              medium
              color={skinVars.colors.textSecondary}
              transform="uppercase"
            >
              {t.panel.downloads}
            </Text1>
            {blocked ? (
              <Text1 regular color={skinVars.colors.error}>
                {t.documents.guardianBlocked}
              </Text1>
            ) : (
              <Inline space={12} wrap alignItems="center">
                {doc.formats.map((format) => (
                  <ButtonLink
                    key={format}
                    small
                    disabled={busy !== null}
                    onPress={() => download(format)}
                  >
                    {busy === format ? "…" : `.${format}`}
                  </ButtonLink>
                ))}
                {doc.formats.length > 1 && (
                  <ButtonLink
                    small
                    disabled={busy !== null}
                    onPress={() => download()}
                    StartIcon={IconDownloadRegular}
                  >
                    {busy === "pack" ? "…" : t.documents.downloadPack}
                  </ButtonLink>
                )}
              </Inline>
            )}
            {downloadError && (
              <Text1 regular color={skinVars.colors.error}>
                {downloadError}
              </Text1>
            )}
          </Stack>
        </div>
      )}
    </div>
  );
}
