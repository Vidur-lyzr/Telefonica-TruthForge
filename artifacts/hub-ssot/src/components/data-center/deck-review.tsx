// Review drawer for a master-deck extraction job. Brand admins compare the
// source wireframe against the branded proposal preview, adjust the name and
// purpose, then approve (registers the layout in the live catalogue) or
// reject with a reason. Harvested images are confirmed into the brand
// library or dismissed from the same drawer.

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMasterDeckJob,
  getGetMasterDeckJobQueryKey,
  getListMasterDeckJobsQueryKey,
  approveMasterDeckProposal,
  rejectMasterDeckProposal,
  confirmMasterDeckHarvestItem,
  dismissMasterDeckHarvestItem,
} from "@workspace/api-client-react";
import type {
  MasterDeckFamily,
  MasterDeckHarvestItem,
  MasterDeckSlotSpec,
} from "@workspace/api-client-react";
import {
  Box,
  Stack,
  Inline,
  Boxed,
  Callout,
  ButtonPrimary,
  ButtonSecondary,
  ButtonDanger,
  TextField,
  Drawer,
  Tag,
  Text1,
  Text2,
  Text3,
  skinVars,
  IconInformationRegular,
} from "@telefonica/mistica";
import { useApp } from "../app-provider";
import { DATA_I18N } from "../../i18n/data";

function assetUrl(jobId: string, key: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}api/data/master-decks/asset?jobId=${encodeURIComponent(jobId)}&key=${encodeURIComponent(key)}`;
}

function errorMessageOf(err: unknown): string | null {
  if (err && typeof err === "object") {
    const rec = err as Record<string, unknown>;
    if (typeof rec["error"] === "string") return rec["error"];
    if (typeof rec["message"] === "string") return rec["message"];
  }
  return null;
}

function formatSlides(indexes: number[]): string {
  return indexes.join(", ");
}

type ReviewStrings = (typeof DATA_I18N)["EN"]["deckIntake"]["review"];

function slotDetail(slot: MasterDeckSlotSpec, R: ReviewStrings): string {
  if (slot.kind === "bullets" && slot.maxItems && slot.maxCharsPerItem) {
    return R.slotItems(slot.maxItems, slot.maxCharsPerItem);
  }
  if (slot.maxChars) return R.slotLimit(slot.maxChars);
  return "";
}

function SlotRow({ slot, R }: { slot: MasterDeckSlotSpec; R: ReviewStrings }) {
  const detail = slotDetail(slot, R);
  return (
    <Inline space={8} alignItems="center">
      <Tag type="inactive">{R.slotKind[slot.kind] ?? slot.kind}</Tag>
      <Text2 medium color={skinVars.colors.textPrimary}>
        {slot.label}
      </Text2>
      {detail && (
        <Text1 regular color={skinVars.colors.textSecondary}>
          {detail}
        </Text1>
      )}
    </Inline>
  );
}

function FamilyCard({
  jobId,
  family,
  onChanged,
}: {
  jobId: string;
  family: MasterDeckFamily;
  onChanged: () => Promise<void>;
}) {
  const { lang, roleId } = useApp();
  const R = DATA_I18N[lang].deckIntake.review;

  const [name, setName] = React.useState(family.proposal.name);
  const [purpose, setPurpose] = React.useState(family.proposal.purpose);
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const purposeValid = purpose.trim().length >= 20 && purpose.trim().length <= 400;
  const nameValid = name.trim().length >= 1 && name.trim().length <= 80;

  const approve = async () => {
    if (busy || !purposeValid || !nameValid) return;
    setBusy(true);
    setError(null);
    try {
      await approveMasterDeckProposal({
        roleId,
        jobId,
        familyId: family.id,
        ...(name.trim() !== family.proposal.name ? { name: name.trim() } : {}),
        ...(purpose.trim() !== family.proposal.purpose ? { purpose: purpose.trim() } : {}),
      });
      await onChanged();
    } catch (err) {
      setError(errorMessageOf(err) ?? R.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (busy || !reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await rejectMasterDeckProposal({
        roleId,
        jobId,
        familyId: family.id,
        reason: reason.trim(),
      });
      await onChanged();
    } catch (err) {
      setError(errorMessageOf(err) ?? R.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Boxed>
      <Box padding={16}>
        <Stack space={16}>
          <Inline space={8} alignItems="center" wrap>
            <Text3 medium color={skinVars.colors.textPrimary}>
              {family.label}
            </Text3>
            <div style={{ flex: 1 }} />
            {family.status === "approved" && <Tag type="success">{R.approvedBadge}</Tag>}
            {family.status === "rejected" && <Tag type="error">{R.rejectedBadge}</Tag>}
          </Inline>
          <Text1 regular color={skinVars.colors.textSecondary}>
            {R.slides(formatSlides(family.slideIndexes))}
          </Text1>

          <Inline space={12} wrap>
            {family.thumbKey && (
              <Stack space={4}>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {R.source}
                </Text1>
                <img
                  src={assetUrl(jobId, family.thumbKey)}
                  alt={R.source}
                  style={{
                    width: 280,
                    maxWidth: "100%",
                    borderRadius: 8,
                    border: `1px solid ${skinVars.colors.border}`,
                    display: "block",
                  }}
                />
              </Stack>
            )}
            {family.previewKey && (
              <Stack space={4}>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {R.preview}
                </Text1>
                <img
                  src={assetUrl(jobId, family.previewKey)}
                  alt={R.preview}
                  style={{
                    width: 280,
                    maxWidth: "100%",
                    borderRadius: 8,
                    border: `1px solid ${skinVars.colors.border}`,
                    display: "block",
                  }}
                />
              </Stack>
            )}
          </Inline>

          <Stack space={8}>
            <Text2 medium color={skinVars.colors.textPrimary}>
              {R.slotsTitle}
            </Text2>
            {family.proposal.slots.map((slot) => (
              <SlotRow key={slot.key} slot={slot} R={R} />
            ))}
          </Stack>

          {family.confidenceNotes.length > 0 && (
            <Stack space={8}>
              <Text2 medium color={skinVars.colors.textPrimary}>
                {R.notesTitle}
              </Text2>
              {family.confidenceNotes.map((note, i) => (
                <Text1 key={i} regular color={skinVars.colors.textSecondary}>
                  {note}
                </Text1>
              ))}
            </Stack>
          )}

          {family.status === "pending" ? (
            <Stack space={12}>
              <TextField
                name={`family-name-${family.id}`}
                label={R.nameLabel}
                value={name}
                onChangeValue={setName}
                maxLength={80}
                fullWidth
                disabled={busy}
              />
              <TextField
                name={`family-purpose-${family.id}`}
                label={R.purposeLabel}
                helperText={R.purposeHelper}
                value={purpose}
                onChangeValue={setPurpose}
                maxLength={400}
                multiline
                fullWidth
                disabled={busy}
                error={!purposeValid}
              />
              {error && (
                <Callout
                  asset={<IconInformationRegular color={skinVars.colors.error} />}
                  description={error}
                />
              )}
              {rejecting ? (
                <Stack space={12}>
                  <TextField
                    name={`family-reason-${family.id}`}
                    label={R.rejectReasonLabel}
                    value={reason}
                    onChangeValue={setReason}
                    maxLength={300}
                    fullWidth
                    disabled={busy}
                  />
                  <Inline space={12}>
                    <ButtonDanger small onPress={reject} disabled={busy || !reason.trim()}>
                      {R.rejectConfirm}
                    </ButtonDanger>
                    <ButtonSecondary
                      small
                      onPress={() => {
                        setRejecting(false);
                        setReason("");
                      }}
                      disabled={busy}
                    >
                      {R.cancel}
                    </ButtonSecondary>
                  </Inline>
                </Stack>
              ) : (
                <Inline space={12}>
                  <ButtonPrimary
                    small
                    onPress={approve}
                    disabled={busy || !purposeValid || !nameValid}
                  >
                    {busy ? R.approving : R.approve}
                  </ButtonPrimary>
                  <ButtonSecondary small onPress={() => setRejecting(true)} disabled={busy}>
                    {R.reject}
                  </ButtonSecondary>
                </Inline>
              )}
            </Stack>
          ) : (
            <Stack space={4}>
              {family.decidedBy && (
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {R.decidedBy(family.decidedBy)}
                </Text1>
              )}
              {family.status === "approved" && family.layoutId && (
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {R.registeredAs(family.layoutId)}
                </Text1>
              )}
              {family.status === "rejected" && family.rejectReason && (
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {R.rejectedReason(family.rejectReason)}
                </Text1>
              )}
            </Stack>
          )}
        </Stack>
      </Box>
    </Boxed>
  );
}

function HarvestCard({
  jobId,
  item,
  onChanged,
}: {
  jobId: string;
  item: MasterDeckHarvestItem;
  onChanged: () => Promise<void>;
}) {
  const { lang, roleId } = useApp();
  const R = DATA_I18N[lang].deckIntake.review;

  const [label, setLabel] = React.useState(item.suggestedLabel);
  const [tagsText, setTagsText] = React.useState(item.suggestedTags.join(", "));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const tags = tagsText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  const canAdd = label.trim().length >= 1 && tags.length >= 1 && !busy;

  const confirm = async () => {
    if (!canAdd) return;
    setBusy(true);
    setError(null);
    try {
      await confirmMasterDeckHarvestItem({
        roleId,
        jobId,
        itemId: item.id,
        label: label.trim(),
        tags,
      });
      await onChanged();
    } catch (err) {
      setError(errorMessageOf(err) ?? R.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await dismissMasterDeckHarvestItem({ roleId, jobId, itemId: item.id });
      await onChanged();
    } catch (err) {
      setError(errorMessageOf(err) ?? R.actionFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Boxed>
      <Box padding={16}>
        <Stack space={12}>
          <Inline space={12} wrap>
            <img
              src={assetUrl(jobId, item.key)}
              alt={item.filename}
              style={{
                width: 160,
                borderRadius: 8,
                border: `1px solid ${skinVars.colors.border}`,
                display: "block",
                objectFit: "cover",
              }}
            />
            <div style={{ flex: 1, minWidth: 200 }}>
              <Stack space={8}>
                <Inline space={8} alignItems="center" wrap>
                  <Text2 medium color={skinVars.colors.textPrimary}>
                    {item.filename}
                  </Text2>
                  {item.status === "added" && <Tag type="success">{R.addedBadge}</Tag>}
                  {item.status === "dismissed" && <Tag type="inactive">{R.dismissedBadge}</Tag>}
                </Inline>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {R.harvestMeta(item.width, item.height, item.sourceSlide)}
                </Text1>
                {item.status === "pending" && (
                  <Stack space={12}>
                    <TextField
                      name={`harvest-label-${item.id}`}
                      label={R.labelLabel}
                      value={label}
                      onChangeValue={setLabel}
                      maxLength={80}
                      fullWidth
                      disabled={busy}
                    />
                    <TextField
                      name={`harvest-tags-${item.id}`}
                      label={R.tagsLabel}
                      helperText={R.tagsHelper}
                      value={tagsText}
                      onChangeValue={setTagsText}
                      fullWidth
                      disabled={busy}
                    />
                    {error && (
                      <Callout
                        asset={<IconInformationRegular color={skinVars.colors.error} />}
                        description={error}
                      />
                    )}
                    <Inline space={12}>
                      <ButtonPrimary small onPress={confirm} disabled={!canAdd}>
                        {busy ? R.addingImage : R.addImage}
                      </ButtonPrimary>
                      <ButtonSecondary small onPress={dismiss} disabled={busy}>
                        {R.dismissImage}
                      </ButtonSecondary>
                    </Inline>
                  </Stack>
                )}
              </Stack>
            </div>
          </Inline>
        </Stack>
      </Box>
    </Boxed>
  );
}

export function DeckReviewDrawer({
  jobId,
  deckName,
  onClose,
}: {
  jobId: string;
  deckName: string;
  onClose: () => void;
}) {
  const { lang } = useApp();
  const R = DATA_I18N[lang].deckIntake.review;
  const queryClient = useQueryClient();

  const { data: job } = useGetMasterDeckJob(
    { id: jobId },
    { query: { queryKey: getGetMasterDeckJobQueryKey({ id: jobId }) } },
  );

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetMasterDeckJobQueryKey({ id: jobId }) }),
      queryClient.invalidateQueries({ queryKey: getListMasterDeckJobsQueryKey() }),
    ]);
  };

  const families = job?.families ?? [];
  const harvest = job?.harvest ?? [];
  const pendingFamilies = families.filter((f) => f.status === "pending").length;

  return (
    <Drawer onClose={onClose} onDismiss={onClose} title={R.title(deckName)} width={720}>
      <Stack space={24}>
        {!job ? (
          <Text2 regular color={skinVars.colors.textSecondary}>
            {R.loading}
          </Text2>
        ) : (
          <>
            {pendingFamilies === 0 && families.length > 0 && (
              <Callout
                asset={<IconInformationRegular color={skinVars.colors.brand} />}
                description={R.allDecided}
              />
            )}
            <Stack space={12}>
              {families.map((family) => (
                <FamilyCard key={family.id} jobId={jobId} family={family} onChanged={refresh} />
              ))}
            </Stack>

            <Stack space={12}>
              <Text3 medium color={skinVars.colors.textPrimary}>
                {R.harvestTitle}
              </Text3>
              {harvest.length === 0 ? (
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {R.noHarvest}
                </Text1>
              ) : (
                harvest.map((item) => (
                  <HarvestCard key={item.id} jobId={jobId} item={item} onChanged={refresh} />
                ))
              )}
            </Stack>
          </>
        )}
        <Box paddingBottom={8} />
      </Stack>
    </Drawer>
  );
}
