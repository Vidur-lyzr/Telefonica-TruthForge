import React from "react";
import { createPortal } from "react-dom";
import {
  useSaveVersion,
  useListRoles,
  type GeneratedDraft,
  type Citation,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { PLANNING_I18N } from "@/i18n/planning";
import { GENERATE_I18N } from "@/i18n/generate";
import {
  RichTextEditor,
  EditorFocusProvider,
  DocumentToolbar,
} from "@/components/document-editor";
import {
  Box,
  Stack,
  Inline,
  Text1,
  Text2,
  Text3,
  Title3,
  ButtonPrimary,
  ButtonSecondary,
  Tag,
  skinVars,
  applyAlpha,
  IconLockClosedRegular,
} from "@telefonica/mistica";

// Centered popup editor for the planning forecast draft, rendered through a
// portal on document.body so no transformed ancestor can offset it. The
// draft itself is always built server-side; this dialog only lets the user
// edit section bodies and save through the existing version pipeline, where
// the Brand Guardian re-checks the document before anything is persisted.
export function ForecastEditor({
  draft: initial,
  onClose,
  onOpenCitation,
  onSaved,
}: {
  draft: GeneratedDraft;
  onClose: () => void;
  onOpenCitation: (citation: Citation) => void;
  onSaved?: () => void;
}) {
  const { roleId, lang } = useApp();
  const t = PLANNING_I18N[lang];
  const te = GENERATE_I18N[lang].editor;
  const { data: roles } = useListRoles();
  const [draft, setDraft] = React.useState<GeneratedDraft>(initial);
  const save = useSaveVersion();
  const [notice, setNotice] = React.useState<{ kind: "success" | "error"; text: string } | null>(
    null,
  );

  // Reset local state when a different draft is opened in the same overlay.
  React.useEffect(() => {
    setDraft(initial);
    setNotice(null);
  }, [initial]);

  const updateSection = (id: string, body: string) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === id ? { ...s, body } : s)),
    }));

  const openCitationId = (cid: string) => {
    const c = draft.citations.find((x) => x.id === cid);
    if (c) onOpenCitation(c);
  };

  const handleSave = () => {
    const savedBy = roles?.find((r) => r.id === roleId)?.label ?? "Hub user";
    setNotice(null);
    save.mutate(
      { data: { draft, savedBy } },
      {
        onSuccess: (record) => {
          setNotice({ kind: "success", text: t.versionSaved(record.title) });
          onSaved?.();
        },
        onError: (err) => {
          const data = (err as { data?: { error?: string } | null }).data;
          setNotice({ kind: "error", text: data?.error ?? t.saveError });
        },
      },
    );
  };

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Close only on a true backdrop click: the press must start AND end on the
  // backdrop itself, so a text-selection drag that starts inside the editor
  // and releases outside can never silently discard unsaved edits.
  const backdropPress = React.useRef(false);

  return createPortal(
    <div
      onMouseDown={(e) => {
        backdropPress.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (backdropPress.current && e.target === e.currentTarget) onClose();
        backdropPress.current = false;
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        backgroundColor: skinVars.colors.backgroundOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={draft.title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(880px, 100%)",
          maxHeight: "calc(100vh - 64px)",
          overflowY: "auto",
          backgroundColor: skinVars.colors.background,
          borderRadius: skinVars.borderRadii.container,
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.24)",
        }}
      >
      <EditorFocusProvider>
        <div style={{ padding: "24px 24px 32px" }}>
          <Stack space={16}>
            <Inline space="between" alignItems="center">
              <Text3 medium color={skinVars.colors.textPrimary}>
                {draft.title}
              </Text3>
              <Inline space={8}>
                <ButtonSecondary small onPress={onClose}>
                  {t.closeEditor}
                </ButtonSecondary>
                <ButtonPrimary small onPress={handleSave} disabled={save.isPending}>
                  {save.isPending ? t.savingVersion : t.saveVersionBtn}
                </ButtonPrimary>
              </Inline>
            </Inline>

            <Text1 regular color={skinVars.colors.textSecondary}>
              {t.editorHint}
            </Text1>

            {notice && (
              <div
                style={{
                  backgroundColor: applyAlpha(
                    notice.kind === "error"
                      ? skinVars.rawColors.error
                      : skinVars.rawColors.success,
                    0.1,
                  ),
                  borderRadius: skinVars.borderRadii.container,
                  padding: 12,
                }}
              >
                <Text2
                  regular
                  color={
                    notice.kind === "error" ? skinVars.colors.error : skinVars.colors.success
                  }
                >
                  {notice.text}
                </Text2>
              </div>
            )}

            <DocumentToolbar />

            <div
              style={{
                backgroundColor: skinVars.colors.backgroundContainer,
                border: `1px solid ${skinVars.colors.divider}`,
                borderRadius: skinVars.borderRadii.container,
              }}
            >
              <Box padding={24}>
                <Stack space={24}>
                  {draft.sections.map((s) => (
                    <Stack key={s.id} space={8}>
                      <Inline space={8} alignItems="center">
                        <Title3>{s.heading}</Title3>
                        {s.internalOnly && (
                          <Tag type="warning" Icon={IconLockClosedRegular}>
                            {te.internalOnly}
                          </Tag>
                        )}
                      </Inline>
                      <RichTextEditor
                        value={s.body}
                        onChange={(body) => updateSection(s.id, body)}
                        onOpenCitation={openCitationId}
                        ariaLabel={te.sectionBodyAria(s.heading)}
                      />
                    </Stack>
                  ))}

                  {draft.disclaimers.length > 0 && (
                    <Stack space={8}>
                      <Text1
                        medium
                        color={skinVars.colors.textSecondary}
                        transform="uppercase"
                      >
                        {t.disclaimersTitle}
                      </Text1>
                      <Stack space={8}>
                        {draft.disclaimers.map((d) => (
                          <div
                            key={d.id}
                            style={{
                              backgroundColor: skinVars.colors.backgroundAlternative,
                              borderRadius: skinVars.borderRadii.container,
                              padding: 12,
                            }}
                          >
                            <Text1 regular color={skinVars.colors.textSecondary}>
                              {d.text}
                            </Text1>
                          </div>
                        ))}
                      </Stack>
                    </Stack>
                  )}
                </Stack>
              </Box>
            </div>
          </Stack>
        </div>
      </EditorFocusProvider>
      </div>
    </div>,
    document.body,
  );
}
