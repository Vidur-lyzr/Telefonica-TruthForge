import React from "react";
import {
  useGetBrandTemplates,
  useGetBrandTemplate,
  useGetExportTemplates,
  type ExportTemplate,
  useGetBrandTone,
  useGetBrandResources,
  useGetBrandSkill,
  useUpdateBrandSkill,
  useResetBrandSkill,
  getGetBrandSkillQueryKey,
  type BrandTemplateSummary,
  type TonePrinciple,
  type BrandRule,
  type ProhibitedPhrase,
  type SpellingPref,
  type BrandResource,
  type GuardianResult,
  type GuardianFinding,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/components/app-provider";
import { BRAND_I18N, type BrandStrings } from "@/i18n/brand";
import { streamGuardianCheck, type GuardianStep } from "@/hooks/guardian-stream";
import {
  Box,
  Boxed,
  Stack,
  Inline,
  Grid,
  Divider,
  Tabs,
  Tag,
  Callout,
  Sheet,
  Touchable,
  Circle,
  TextField,
  ButtonPrimary,
  ButtonSecondary,
  ButtonLink,
  Spinner,
  Text1,
  Text2,
  Text3,
  Title2,
  Title3,
  skinVars,
  IconFileTextRegular,
  IconChatRegular,
  IconLibraryRegular,
  IconShieldCheckedOkRegular,
  IconAlertRegular,
  IconLockClosedRegular,
  IconCheckRegular,
  IconCheckedRegular,
  IconCloseRegular,
  IconArrowLineRightRegular,
  IconImageRegular,
  IconBalanceRegular,
  IconBookRegular,
  IconAppsRegular,
  IconOpenRegular,
} from "@telefonica/mistica";

type IconType = (props: { size?: number; color?: string }) => React.ReactElement;
type TabId = "templates" | "tone" | "resources" | "design" | "guardian";

const TABS: { id: TabId; icon: IconType }[] = [
  { id: "templates", icon: IconFileTextRegular },
  { id: "tone", icon: IconChatRegular },
  { id: "resources", icon: IconLibraryRegular },
  { id: "design", icon: IconAppsRegular },
  { id: "guardian", icon: IconShieldCheckedOkRegular },
];

const DESIGN_SYSTEM_URL = "https://mistica-web.vercel.app";

// ---- Shared pieces ----------------------------------------------------------

function IntroLine({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 768 }}>
      <Text3 regular color={skinVars.colors.textSecondary}>
        {children}
      </Text3>
    </div>
  );
}

function Loading() {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  return (
    <Box paddingY={64}>
      <Inline space={12} alignItems="center">
        <Spinner />
        <Text2 regular color={skinVars.colors.textSecondary}>
          {t.loading}
        </Text2>
      </Inline>
    </Box>
  );
}

function ClearanceBadge({ clearance }: { clearance: string }) {
  return (
    <Tag type="inactive">{clearance}</Tag>
  );
}

function ValidityBadge({ validity }: { validity: string }) {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  const type = validity === "approved" ? "success" : validity === "review" ? "warning" : "inactive";
  return <Tag type={type}>{t.validity(validity)}</Tag>;
}

function BlockedNote({ count, noun }: { count: number; noun: "template" | "resource" }) {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  return (
    <Callout
      variant="default"
      asset={<IconLockClosedRegular color={skinVars.colors.warning} />}
      title=""
      description={t.blockedNote(count, noun)}
    />
  );
}

function PermissionBlocked({ count, noun }: { count: number; noun: "template" | "resource" }) {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  return (
    <Callout
      variant="default"
      asset={<IconLockClosedRegular color={skinVars.colors.error} />}
      title={t.permissionBlockedTitle}
      description={t.permissionBlocked(count, noun)}
    />
  );
}

// ---- Templates --------------------------------------------------------------

function TemplateMeta({ label, value }: { label: string; value: string }) {
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

function TemplateCard({ t, onOpen }: { t: BrandTemplateSummary; onOpen: () => void }) {
  const { lang } = useApp();
  const s = BRAND_I18N[lang];
  return (
    <Boxed>
      <Touchable onPress={onOpen} aria-label={s.openTemplateAria(t.name)}>
        <Box padding={24}>
          <Stack space={16}>
            <Inline space={12} alignItems="center">
              <div style={{ flex: 1, minWidth: 0 }}>
                <Stack space={4}>
                  <Title3>{t.name}</Title3>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {t.purpose}
                  </Text2>
                </Stack>
              </div>
              <Tag type="info">{t.shape}</Tag>
            </Inline>
            <Grid columns={2} gap={12}>
              <TemplateMeta label={s.meta.owner} value={t.owner} />
              <TemplateMeta label={s.meta.format} value={t.format} />
              <TemplateMeta label={s.meta.version} value={t.version} />
              <TemplateMeta label={s.meta.sections} value={String(t.sectionCount)} />
            </Grid>
            <Divider />
            <Inline space="between" alignItems="center">
              <Inline space={8} alignItems="center">
                <ClearanceBadge clearance={t.clearance} />
                <ValidityBadge validity={t.validity} />
              </Inline>
              <Inline space={4} alignItems="center">
                <Text2 medium color={skinVars.colors.textLink}>
                  {s.viewStructure}
                </Text2>
                <IconArrowLineRightRegular size={16} color={skinVars.colors.textLink} />
              </Inline>
            </Inline>
          </Stack>
        </Box>
      </Touchable>
    </Boxed>
  );
}

function TemplateDetail({ templateId, roleId }: { templateId: string; roleId?: string }) {
  const { lang } = useApp();
  const tx = BRAND_I18N[lang];
  const { data, isLoading } = useGetBrandTemplate(
    roleId ? { templateId, roleId } : { templateId },
  );
  if (isLoading) return <Loading />;
  if (!data) return null;
  if (data.blocked || !data.template) {
    return (
      <Stack space={16}>
        <Stack space={4}>
          <Title2>{tx.templateFallbackName}</Title2>
          <Text2 regular color={skinVars.colors.textSecondary}>
            {tx.governedBrandTemplate}
          </Text2>
        </Stack>
        <PermissionBlocked count={1} noun="template" />
      </Stack>
    );
  }
  const t = data.template;
  return (
    <Stack space={16}>
      <Stack space={4}>
        <Title2>{t.name}</Title2>
        <Text2 regular color={skinVars.colors.textSecondary}>
          {t.purpose}
        </Text2>
      </Stack>
      <Inline space={8} alignItems="center" wrap>
        <Tag type="info">{t.shape}</Tag>
        <ClearanceBadge clearance={t.clearance} />
        <ValidityBadge validity={t.validity} />
      </Inline>
      <Grid columns={2} gap={12}>
        <TemplateMeta label={tx.meta.owner} value={t.owner} />
        <TemplateMeta label={tx.meta.format} value={t.format} />
        <TemplateMeta label={tx.meta.version} value={t.version} />
      </Grid>
      <Text2 regular color={skinVars.colors.textSecondary}>
        {t.description}
      </Text2>
      <Stack space={8}>
        <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
          {tx.sectionStructure}
        </Text1>
        <Stack space={8}>
          {t.sections.map((s, i) => (
            <Boxed key={s.key}>
              <Box padding={12}>
                <Inline space={12} alignItems="center">
                  <Text2 medium color={skinVars.colors.textLink}>
                    {i + 1}
                  </Text2>
                  <Inline space={8} alignItems="center" wrap>
                    <Text2 medium color={skinVars.colors.textPrimary}>
                      {s.label}
                    </Text2>
                    <Text2 regular color={skinVars.colors.textSecondary}>
                      · {s.kind}
                    </Text2>
                    {s.perAxis && <Tag type="inactive">{tx.perAxis}</Tag>}
                  </Inline>
                </Inline>
              </Box>
            </Boxed>
          ))}
        </Stack>
      </Stack>
      {t.disclaimers.length > 0 && (
        <Boxed>
          <Box padding={16}>
            <Stack space={8}>
              <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                {tx.requiredDisclaimers}
              </Text1>
              <Stack space={8}>
                {t.disclaimers.map((d) => (
                  <Text2 key={d.id} regular color={skinVars.colors.textSecondary}>
                    <Text2 as="span" medium color={skinVars.colors.textPrimary}>
                      {d.name}.
                    </Text2>{" "}
                    {d.text}
                  </Text2>
                ))}
              </Stack>
            </Stack>
          </Box>
        </Boxed>
      )}
    </Stack>
  );
}

function TemplatesArea({ roleId }: { roleId?: string }) {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  const { data, isLoading } = useGetBrandTemplates(roleId ? { roleId } : undefined);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  if (isLoading) return <Loading />;
  if (!data) return null;
  return (
    <Stack space={24}>
      <IntroLine>{t.templatesIntro}</IntroLine>
      {data.templates.length === 0 ? (
        <PermissionBlocked count={data.blockedCount} noun="template" />
      ) : (
        <Stack space={24}>
          {data.blockedCount > 0 && <BlockedNote count={data.blockedCount} noun="template" />}
          <Grid columns={2} gap={24}>
            {data.templates.map((t) => (
              <TemplateCard key={t.id} t={t} onOpen={() => setSelectedId(t.id)} />
            ))}
          </Grid>
        </Stack>
      )}
      {selectedId && (
        <Sheet onClose={() => setSelectedId(null)}>
          {() => (
            <Box paddingX={24} paddingTop={40} paddingBottom={32}>
              <TemplateDetail templateId={selectedId} roleId={roleId} />
            </Box>
          )}
        </Sheet>
      )}
      <ExportTemplateGallery />
    </Stack>
  );
}

// ---- Corporate export templates ---------------------------------------------

function exportPreviewUrl(templateId: string, page: "cover" | "body"): string {
  return `${import.meta.env.BASE_URL}api/brand/export-template-preview?templateId=${encodeURIComponent(templateId)}&page=${page}`;
}

function ExportTemplateCard({ tpl }: { tpl: ExportTemplate }) {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  const [page, setPage] = React.useState<"cover" | "body">("cover");
  return (
    <Boxed>
      <Box padding={16}>
        <Stack space={12}>
          <div
            style={{
              borderRadius: 8,
              overflow: "hidden",
              border: `1px solid ${skinVars.colors.border}`,
              background: skinVars.colors.backgroundAlternative,
              lineHeight: 0,
            }}
          >
            <img
              src={exportPreviewUrl(tpl.id, page)}
              alt={t.exportPreviewAria(tpl.name)}
              loading="lazy"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
          <Inline space={8}>
            <Touchable onPress={() => setPage("cover")} aria-pressed={page === "cover"}>
              <Tag type={page === "cover" ? "active" : "inactive"}>{t.exportCoverLabel}</Tag>
            </Touchable>
            <Touchable onPress={() => setPage("body")} aria-pressed={page === "body"}>
              <Tag type={page === "body" ? "active" : "inactive"}>{t.exportBodyLabel}</Tag>
            </Touchable>
          </Inline>
          <Stack space={4}>
            <Title3>{tpl.name}</Title3>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {tpl.description}
            </Text2>
          </Stack>
          <Inline space={8}>
            {tpl.formats.map((f) => (
              <Tag key={f} type="inactive">
                {f.toUpperCase()}
              </Tag>
            ))}
          </Inline>
        </Stack>
      </Box>
    </Boxed>
  );
}

function ExportTemplateGallery() {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  const { data, isLoading } = useGetExportTemplates();
  if (isLoading || !data || data.length === 0) return null;
  return (
    <Stack space={16}>
      <Stack space={4}>
        <Title2>{t.exportTemplatesTitle}</Title2>
        <Text2 regular color={skinVars.colors.textSecondary}>
          {t.exportTemplatesIntro}
        </Text2>
      </Stack>
      <Grid columns={3} gap={24}>
        {data.map((tpl) => (
          <ExportTemplateCard key={tpl.id} tpl={tpl} />
        ))}
      </Grid>
    </Stack>
  );
}

// ---- Tone of voice ----------------------------------------------------------

function PrincipleCard({ p }: { p: TonePrinciple }) {
  return (
    <Boxed>
      <Box padding={20}>
        <Stack space={12}>
          <Title3>{p.title}</Title3>
          <Text2 regular color={skinVars.colors.textSecondary}>
            {p.guidance}
          </Text2>
          <Stack space={8}>
            {p.dos.map((d, i) => (
              <Inline key={`do-${i}`} space={8} alignItems="center">
                <IconCheckRegular size={16} color={skinVars.colors.success} />
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {d}
                </Text2>
              </Inline>
            ))}
            {p.donts.map((d, i) => (
              <Inline key={`dont-${i}`} space={8} alignItems="center">
                <IconCloseRegular size={16} color={skinVars.colors.error} />
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {d}
                </Text2>
              </Inline>
            ))}
          </Stack>
        </Stack>
      </Box>
    </Boxed>
  );
}

function RulesPanel({ rules }: { rules: BrandRule[] }) {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  return (
    <Boxed>
      <Box padding={24}>
        <Stack space={16}>
          <Stack space={4}>
            <Title3>{t.hardRules}</Title3>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {t.hardRulesSub}
            </Text2>
          </Stack>
          <Stack space={12}>
            {rules.map((r) => (
              <Inline key={r.id} space={12} alignItems="center">
                <Tag type={r.severity === "error" ? "error" : "warning"}>
                  {r.severity === "error" ? t.ruleSeverity.error : t.ruleSeverity.warning}
                </Tag>
                <Stack space={2}>
                  <Text2 medium color={skinVars.colors.textPrimary}>
                    {r.rule}
                  </Text2>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {r.detail}
                  </Text2>
                </Stack>
              </Inline>
            ))}
          </Stack>
        </Stack>
      </Box>
    </Boxed>
  );
}

function ProhibitedPanel({ prohibited }: { prohibited: ProhibitedPhrase[] }) {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  return (
    <Boxed>
      <Box padding={24}>
        <Stack space={16}>
          <Stack space={4}>
            <Title3>{t.prohibitedClaims}</Title3>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {t.prohibitedSub}
            </Text2>
          </Stack>
          <Stack space={12}>
            {prohibited.map((p) => (
              <Stack key={p.id} space={2}>
                <Inline space={8} alignItems="center" wrap>
                  <Text2 medium color={skinVars.colors.error} decoration="line-through">
                    {p.phrase}
                  </Text2>
                  <IconArrowLineRightRegular size={16} color={skinVars.colors.textSecondary} />
                  <Text2 medium color={skinVars.colors.success}>
                    {p.rewrite}
                  </Text2>
                </Inline>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {p.reason}
                </Text1>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Box>
    </Boxed>
  );
}

function SpellingPanel({ spelling }: { spelling: SpellingPref[] }) {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  return (
    <Boxed>
      <Box padding={24}>
        <Stack space={16}>
          <Stack space={4}>
            <Title3>{t.europeanEnglish}</Title3>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {t.europeanEnglishSub}
            </Text2>
          </Stack>
          <Inline space={8} wrap>
            {spelling.map((s) => (
              <Boxed key={s.american}>
                <Box paddingX={12} paddingY={8}>
                  <Inline space={8} alignItems="center">
                    <Text2 regular color={skinVars.colors.textSecondary} decoration="line-through">
                      {s.american}
                    </Text2>
                    <IconArrowLineRightRegular size={12} color={skinVars.colors.textSecondary} />
                    <Text2 medium color={skinVars.colors.textPrimary}>
                      {s.european}
                    </Text2>
                  </Inline>
                </Box>
              </Boxed>
            ))}
          </Inline>
        </Stack>
      </Box>
    </Boxed>
  );
}

function ToneArea() {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  const { data, isLoading } = useGetBrandTone();
  if (isLoading) return <Loading />;
  if (!data) return null;
  return (
    <Stack space={32}>
      <IntroLine>{t.toneIntro}</IntroLine>
      <Grid columns={3} gap={24}>
        {data.principles.map((p) => (
          <PrincipleCard key={p.id} p={p} />
        ))}
      </Grid>
      <Grid columns={2} gap={24}>
        <RulesPanel rules={data.rules} />
        <Stack space={24}>
          <ProhibitedPanel prohibited={data.prohibited} />
          <SpellingPanel spelling={data.spelling} />
        </Stack>
      </Grid>
    </Stack>
  );
}

// ---- Resources --------------------------------------------------------------

const CATEGORY_META: Record<string, { icon: IconType }> = {
  identity: { icon: IconImageRegular },
  messaging: { icon: IconChatRegular },
  legal: { icon: IconBalanceRegular },
  reference: { icon: IconBookRegular },
};
const CATEGORY_ORDER = ["identity", "messaging", "legal", "reference"] as const;

function ResourceCard({ r, onOpen }: { r: BrandResource; onOpen: () => void }) {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  return (
    <Boxed>
      <Touchable onPress={onOpen} aria-label={t.openResourceAria(r.name)}>
        <Box padding={20}>
          <Stack space={8}>
            <Inline space={8} alignItems="center">
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text3 medium color={skinVars.colors.textPrimary}>
                  {r.name}
                </Text3>
              </div>
              <ClearanceBadge clearance={r.clearance} />
            </Inline>
            <Text2 regular color={skinVars.colors.textSecondary}>
              {r.description}
            </Text2>
            <Inline space="between" alignItems="center">
              <Text1 regular color={skinVars.colors.textSecondary}>
                {r.format}
              </Text1>
              <ValidityBadge validity={r.validity} />
            </Inline>
          </Stack>
        </Box>
      </Touchable>
    </Boxed>
  );
}

function ResourcesArea({ roleId }: { roleId?: string }) {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  const { data, isLoading } = useGetBrandResources(roleId ? { roleId } : undefined);
  const [selected, setSelected] = React.useState<BrandResource | null>(null);
  if (isLoading) return <Loading />;
  if (!data) return null;
  return (
    <Stack space={24}>
      <IntroLine>{t.resourcesIntro}</IntroLine>
      {data.blockedCount > 0 && <BlockedNote count={data.blockedCount} noun="resource" />}
      {data.resources.length === 0 ? (
        <PermissionBlocked count={data.blockedCount} noun="resource" />
      ) : (
        CATEGORY_ORDER.map((cat) => {
          const items = data.resources.filter((r) => r.category === cat);
          if (items.length === 0) return null;
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;
          return (
            <Stack key={cat} space={12}>
              <Inline space={8} alignItems="center">
                <Icon size={18} color={skinVars.colors.brand} />
                <Title3>{t.categories[cat]}</Title3>
              </Inline>
              <Grid columns={3} gap={16}>
                {items.map((r) => (
                  <ResourceCard key={r.id} r={r} onOpen={() => setSelected(r)} />
                ))}
              </Grid>
            </Stack>
          );
        })
      )}
      {selected && (
        <Sheet onClose={() => setSelected(null)}>
          {() => (
            <Box paddingX={24} paddingTop={40} paddingBottom={32}>
              <Stack space={16}>
                <Stack space={4}>
                  <Title2>{selected.name}</Title2>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {selected.description}
                  </Text2>
                </Stack>
                <Inline space={8} alignItems="center" wrap>
                  <ClearanceBadge clearance={selected.clearance} />
                  <ValidityBadge validity={selected.validity} />
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    {selected.format}
                  </Text1>
                </Inline>
                <div style={{ whiteSpace: "pre-wrap" }}>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {selected.detail}
                  </Text2>
                </div>
              </Stack>
            </Box>
          )}
        </Sheet>
      )}
    </Stack>
  );
}

// ---- Design system ----------------------------------------------------------

function DesignSystemArea() {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  return (
    <Stack space={16}>
      <Inline space={16} alignItems="center" wrap>
        <div style={{ flex: 1, minWidth: 280 }}>
          <IntroLine>{t.designIntro}</IntroLine>
        </div>
        <ButtonLink
          onPress={() => {
            window.open(DESIGN_SYSTEM_URL, "_blank", "noopener");
          }}
          StartIcon={IconOpenRegular}
        >
          {t.openDesignSite}
        </ButtonLink>
      </Inline>
      <div
        style={{
          borderRadius: skinVars.borderRadii.container,
          border: `1px solid ${skinVars.colors.border}`,
          overflow: "hidden",
          height: "72vh",
          minHeight: 480,
          backgroundColor: skinVars.colors.backgroundContainer,
        }}
      >
        <iframe
          src={DESIGN_SYSTEM_URL}
          title="Mística design system"
          style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        />
      </div>
    </Stack>
  );
}

// ---- Brand Guardian ---------------------------------------------------------

const GUARDIAN_SAMPLE =
  "We are the number one operator in Europe. Our new color program reached 12% growth last year.";

function GuardianVerdict({ result }: { result: GuardianResult }) {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  const pass = result.status === "pass";
  return (
    <div
      style={{
        borderRadius: skinVars.borderRadii.container,
        border: `1px solid ${pass ? skinVars.colors.successLow : skinVars.colors.errorLow}`,
        backgroundColor: pass ? skinVars.colors.successLow : skinVars.colors.errorLow,
        padding: 20,
      }}
    >
      <Inline space={12} alignItems="center">
        {pass ? (
          <IconShieldCheckedOkRegular size={20} color={skinVars.colors.success} />
        ) : (
          <IconAlertRegular size={20} color={skinVars.colors.error} />
        )}
        <Stack space={8}>
          <Inline space={8} alignItems="center">
            <Text2 medium color={skinVars.colors.textPrimary}>
              Brand Guardian
            </Text2>
            <Tag type={pass ? "success" : "error"}>{pass ? t.onBrand : t.needsWork}</Tag>
          </Inline>
          <Text2 regular color={skinVars.colors.textSecondary}>
            {result.summary}
          </Text2>
          {result.findings.length > 0 && (
            <Stack space={8}>
              {result.findings.map((f, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: skinVars.borderRadii.container,
                    backgroundColor: skinVars.colors.backgroundContainer,
                    padding: 12,
                  }}
                >
                  <Stack space={4}>
                    <Inline space={8} alignItems="center">
                      <Tag type={f.severity === "error" ? "error" : "warning"}>
                        {f.severity === "error" ? t.findingSeverity.error : t.findingSeverity.warning}
                      </Tag>
                      <Text2 medium color={skinVars.colors.textPrimary}>
                        {f.rule}
                      </Text2>
                    </Inline>
                    <Text2 regular color={skinVars.colors.textSecondary}>
                      {f.message}
                    </Text2>
                    {f.suggestion && (
                      <Text2 medium color={skinVars.colors.textLink}>
                        {t.fixPrefix} {f.suggestion}
                      </Text2>
                    )}
                  </Stack>
                </div>
              ))}
            </Stack>
          )}
        </Stack>
      </Inline>
    </div>
  );
}

function HighlightedText({ text, findings }: { text: string; findings: GuardianFinding[] }) {
  // Per-character severity so overlapping/nested spans never drop text; error (2)
  // always wins over warning (1) where highlights overlap.
  const severity = new Array<0 | 1 | 2>(text.length).fill(0);
  findings.forEach((f) => {
    if (!f.location) return;
    const rank = f.severity === "error" ? 2 : 1;
    const from = Math.max(0, f.location.start);
    const to = Math.min(text.length, f.location.end);
    for (let i = from; i < to; i++) {
      if (rank > severity[i]) severity[i] = rank as 1 | 2;
    }
  });

  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const cur = severity[i];
    let j = i + 1;
    while (j < text.length && severity[j] === cur) j++;
    const chunk = text.slice(i, j);
    if (cur === 0) {
      nodes.push(<span key={key++}>{chunk}</span>);
    } else {
      const isError = cur === 2;
      nodes.push(
        <mark
          key={key++}
          style={{
            borderRadius: skinVars.borderRadii.chip,
            padding: "0 2px",
            backgroundColor: isError ? skinVars.colors.errorLow : skinVars.colors.warningLow,
            color: isError ? skinVars.colors.error : skinVars.colors.warning,
            textDecoration: "underline",
            textDecorationColor: isError ? skinVars.colors.error : skinVars.colors.warning,
            textUnderlineOffset: 2,
          }}
        >
          {chunk}
        </mark>,
      );
    }
    i = j;
  }
  return (
    <div style={{ whiteSpace: "pre-wrap" }}>
      <Text2 regular color={skinVars.colors.textPrimary}>
        {nodes}
      </Text2>
    </div>
  );
}

// Live activity feed for a Guardian run — every row is a real milestone
// streamed from the agent, never simulated.
function GuardianActivity({ steps, t }: { steps: GuardianStep[]; t: BrandStrings }) {
  return (
    <Boxed>
      <Box padding={20}>
        <Stack space={12}>
          <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
            {t.agentActivity}
          </Text1>
          <Stack space={8}>
            {steps.map((s) => (
              <Inline space={8} alignItems="center" key={s.id}>
                {s.state === "done" ? (
                  <IconCheckedRegular size={16} color={skinVars.colors.success} />
                ) : (
                  <Spinner size={16} />
                )}
                <Text2
                  regular
                  color={
                    s.state === "done" ? skinVars.colors.textSecondary : skinVars.colors.textPrimary
                  }
                >
                  {s.label}
                  {s.detail ? ` — ${s.detail}` : ""}
                </Text2>
              </Inline>
            ))}
          </Stack>
        </Stack>
      </Box>
    </Boxed>
  );
}

// Editor for the agent's instruction document. Saves through the server so
// the very next check runs on the edited skill.
function SkillSheet({ onClose, t }: { onClose: () => void; t: BrandStrings }) {
  const queryClient = useQueryClient();
  const skillQuery = useGetBrandSkill();
  const update = useUpdateBrandSkill();
  const reset = useResetBrandSkill();
  const [draft, setDraft] = React.useState<string | null>(null);
  const skill = skillQuery.data;
  const value = draft ?? skill?.content ?? "";
  const busy = update.isPending || reset.isPending;
  const applySkill = (next: { content: string; version: number }) => {
    queryClient.setQueryData(getGetBrandSkillQueryKey(), next);
    setDraft(null);
  };
  return (
    <Sheet onClose={onClose}>
      {() => (
        <Box paddingX={24} paddingTop={40} paddingBottom={32}>
          <Stack space={16}>
            <Stack space={8}>
              <Inline space={8} alignItems="center" wrap>
                <Title3>{t.skillSheetTitle}</Title3>
                {skill && (
                  <Tag type={skill.isDefault ? "inactive" : "active"}>
                    {skill.isDefault ? t.skillDefaultTag : t.skillEditedTag}
                  </Tag>
                )}
              </Inline>
              <Text2 regular color={skinVars.colors.textSecondary}>
                {t.skillSheetSub}
                {skill ? ` ${t.skillVersion(skill.version)}.` : ""}
              </Text2>
            </Stack>
            {skillQuery.isLoading ? (
              <Inline space={12} alignItems="center">
                <Spinner size={20} />
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {t.loading}
                </Text2>
              </Inline>
            ) : (
              <>
                <TextField
                  multiline
                  name="guardian-skill"
                  label={t.skillContentLabel}
                  value={value}
                  onChangeValue={(v) => setDraft(v)}
                  fullWidth
                />
                <Inline space={16} alignItems="center" wrap>
                  <ButtonPrimary
                    onPress={() => {
                      update.mutate(
                        { data: { content: value } },
                        { onSuccess: applySkill },
                      );
                    }}
                    disabled={busy || value.trim().length === 0}
                    showSpinner={update.isPending}
                  >
                    {update.isPending ? t.savingSkill : t.saveSkill}
                  </ButtonPrimary>
                  <ButtonSecondary
                    onPress={() => {
                      reset.mutate(undefined, { onSuccess: applySkill });
                    }}
                    disabled={busy}
                    showSpinner={reset.isPending}
                  >
                    {t.resetSkill}
                  </ButtonSecondary>
                </Inline>
              </>
            )}
          </Stack>
        </Box>
      )}
    </Sheet>
  );
}

function GuardianArea() {
  const { lang } = useApp();
  const t = BRAND_I18N[lang];
  const [text, setText] = React.useState("");
  const [checked, setChecked] = React.useState<{ text: string; result: GuardianResult } | null>(
    null,
  );
  const [steps, setSteps] = React.useState<GuardianStep[]>([]);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [skillOpen, setSkillOpen] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => () => abortRef.current?.abort(), []);

  const run = async () => {
    const snapshot = text;
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setRunning(true);
    setError(null);
    setChecked(null);
    setSteps([]);
    const stepList: GuardianStep[] = [];
    try {
      const result = await streamGuardianCheck(
        { text: snapshot },
        {
          onStep: (step) => {
            const i = stepList.findIndex((s) => s.id === step.id);
            if (i === -1) stepList.push(step);
            else stepList[i] = step;
            setSteps([...stepList]);
          },
        },
        abort.signal,
      );
      setChecked({ text: snapshot, result });
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      if (!aborted) setError(t.guardianError);
    } finally {
      if (abortRef.current === abort) setRunning(false);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const supported = /\.(txt|md|markdown)$/i.test(file.name) || file.type.startsWith("text/");
    if (!supported) {
      setUploadError(t.uploadUnsupported);
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setChecked(null);
      setSteps([]);
      setError(null);
    };
    reader.readAsText(file);
  };

  const hasHighlights = !!checked && checked.result.findings.some((f) => f.location);
  return (
    <div style={{ maxWidth: 768 }}>
      <Stack space={24}>
        <IntroLine>{t.guardianIntro}</IntroLine>
        <Boxed>
          <Box padding={24}>
            <Stack space={16}>
              <TextField
                multiline
                name="guardian-text"
                label={t.pasteLabel}
                value={text}
                onChangeValue={(v) => setText(v)}
                fullWidth
              />
              <Inline space={16} alignItems="center" wrap>
                <ButtonPrimary
                  onPress={() => {
                    void run();
                  }}
                  disabled={running || text.trim().length === 0}
                  StartIcon={IconShieldCheckedOkRegular}
                  showSpinner={running}
                >
                  {running ? t.checking : t.runGuardian}
                </ButtonPrimary>
                <ButtonLink
                  onPress={() => {
                    fileInputRef.current?.click();
                  }}
                >
                  {t.uploadFile}
                </ButtonLink>
                <ButtonLink
                  onPress={() => {
                    setText(GUARDIAN_SAMPLE);
                    setChecked(null);
                    setSteps([]);
                    setError(null);
                  }}
                >
                  {t.loadSample}
                </ButtonLink>
                {(text || checked) && (
                  <ButtonLink
                    onPress={() => {
                      setText("");
                      setChecked(null);
                      setSteps([]);
                      setError(null);
                      setUploadError(null);
                    }}
                  >
                    {t.clear}
                  </ButtonLink>
                )}
                <ButtonLink
                  onPress={() => {
                    setSkillOpen(true);
                  }}
                >
                  {t.editSkill}
                </ButtonLink>
              </Inline>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown,text/plain,text/markdown"
                onChange={onFile}
                style={{ display: "none" }}
              />
              {uploadError && (
                <Text2 regular color={skinVars.colors.error}>
                  {uploadError}
                </Text2>
              )}
            </Stack>
          </Box>
        </Boxed>
        {steps.length > 0 && (running || checked || error) && (
          <GuardianActivity steps={steps} t={t} />
        )}
        {error && (
          <Callout
            asset={<IconAlertRegular size={24} color={skinVars.colors.error} />}
            title={t.tabs.guardian}
            description={error}
          />
        )}
        {hasHighlights && checked && (
          <Boxed>
            <Box padding={20}>
              <Stack space={12}>
                <Inline space={12} alignItems="center" wrap>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                      {t.checkedText}
                    </Text1>
                  </div>
                  <Inline space={12} alignItems="center">
                    <Inline space={8} alignItems="center">
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: skinVars.borderRadii.chip,
                          backgroundColor: skinVars.colors.errorLow,
                          border: `1px solid ${skinVars.colors.error}`,
                        }}
                      />
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        {t.legendBlocks}
                      </Text1>
                    </Inline>
                    <Inline space={8} alignItems="center">
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: skinVars.borderRadii.chip,
                          backgroundColor: skinVars.colors.warningLow,
                          border: `1px solid ${skinVars.colors.warning}`,
                        }}
                      />
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        {t.legendAdvises}
                      </Text1>
                    </Inline>
                  </Inline>
                </Inline>
                <HighlightedText text={checked.text} findings={checked.result.findings} />
              </Stack>
            </Box>
          </Boxed>
        )}
        {checked && <GuardianVerdict result={checked.result} />}
        {skillOpen && (
          <SkillSheet
            onClose={() => {
              setSkillOpen(false);
            }}
            t={t}
          />
        )}
      </Stack>
    </div>
  );
}

// ---- Page -------------------------------------------------------------------

export default function BrandPage() {
  const { roleId, lang } = useApp();
  const t = BRAND_I18N[lang];
  const [tab, setTab] = React.useState<TabId>("templates");
  const scopedRole = roleId || undefined;
  const selectedIndex = TABS.findIndex((tb) => tb.id === tab);

  return (
    <Box padding={24}>
      <Stack space={24}>
        <Stack space={8}>
          <Text1 medium color={skinVars.colors.brand} transform="uppercase">
            Backend · Marca
          </Text1>
          <Title2>Brand Room</Title2>
          <div style={{ maxWidth: 640 }}>
            <Text3 regular color={skinVars.colors.textSecondary}>
              {t.intro}
            </Text3>
          </div>
        </Stack>

        <Tabs
          selectedIndex={selectedIndex < 0 ? 0 : selectedIndex}
          onChange={(index) => setTab(TABS[index].id)}
          tabs={TABS.map((tb) => ({ text: t.tabs[tb.id], Icon: tb.icon }))}
        />

        <div>
          {tab === "templates" && <TemplatesArea roleId={scopedRole} />}
          {tab === "tone" && <ToneArea />}
          {tab === "resources" && <ResourcesArea roleId={scopedRole} />}
          {tab === "design" && <DesignSystemArea />}
          {tab === "guardian" && <GuardianArea />}
        </div>
      </Stack>
    </Box>
  );
}
