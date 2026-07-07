import React from "react";
import {
  useGetBrandTemplates,
  useGetBrandTemplate,
  useGetBrandTone,
  useGetBrandResources,
  useCheckBrandText,
  type BrandTemplateSummary,
  type TonePrinciple,
  type BrandRule,
  type ProhibitedPhrase,
  type SpellingPref,
  type BrandResource,
  type GuardianResult,
  type GuardianFinding,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
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
  IconCloseRegular,
  IconArrowLineRightRegular,
  IconImageRegular,
  IconBalanceRegular,
  IconBookRegular,
} from "@telefonica/mistica";

type IconType = (props: { size?: number; color?: string }) => React.ReactElement;
type TabId = "templates" | "tone" | "resources" | "guardian";

const TABS: { id: TabId; label: string; icon: IconType }[] = [
  { id: "templates", label: "Templates", icon: IconFileTextRegular },
  { id: "tone", label: "Tone of voice", icon: IconChatRegular },
  { id: "resources", label: "Resources", icon: IconLibraryRegular },
  { id: "guardian", label: "Brand Guardian", icon: IconShieldCheckedOkRegular },
];

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
  return (
    <Box paddingY={64}>
      <Inline space={12} alignItems="center">
        <Spinner />
        <Text2 regular color={skinVars.colors.textSecondary}>
          Loading…
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
  const type = validity === "approved" ? "success" : validity === "review" ? "warning" : "inactive";
  return <Tag type={type}>{validity}</Tag>;
}

function BlockedNote({ count, noun }: { count: number; noun: string }) {
  return (
    <Callout
      variant="default"
      asset={<IconLockClosedRegular color={skinVars.colors.warning} />}
      title=""
      description={`${count} ${noun}${count === 1 ? "" : "s"} hidden by your persona's clearance.`}
    />
  );
}

function PermissionBlocked({ count, noun }: { count: number; noun: string }) {
  return (
    <Callout
      variant="default"
      asset={<IconLockClosedRegular color={skinVars.colors.error} />}
      title="Permission blocked"
      description={`${count} ${noun}${count === 1 ? " is" : "s are"} governed above your persona's clearance. Switch to a higher-clearance persona to view ${count === 1 ? "it" : "them"}.`}
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
  return (
    <Boxed>
      <Touchable onPress={onOpen} aria-label={`Open template ${t.name}`}>
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
              <TemplateMeta label="Owner" value={t.owner} />
              <TemplateMeta label="Format" value={t.format} />
              <TemplateMeta label="Version" value={t.version} />
              <TemplateMeta label="Sections" value={String(t.sectionCount)} />
            </Grid>
            <Divider />
            <Inline space="between" alignItems="center">
              <Inline space={8} alignItems="center">
                <ClearanceBadge clearance={t.clearance} />
                <ValidityBadge validity={t.validity} />
              </Inline>
              <Inline space={4} alignItems="center">
                <Text2 medium color={skinVars.colors.textLink}>
                  View structure
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
  const { data, isLoading } = useGetBrandTemplate(
    roleId ? { templateId, roleId } : { templateId },
  );
  if (isLoading) return <Loading />;
  if (!data) return null;
  if (data.blocked || !data.template) {
    return (
      <Stack space={16}>
        <Stack space={4}>
          <Title2>Template</Title2>
          <Text2 regular color={skinVars.colors.textSecondary}>
            Governed brand template
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
        <TemplateMeta label="Owner" value={t.owner} />
        <TemplateMeta label="Format" value={t.format} />
        <TemplateMeta label="Version" value={t.version} />
      </Grid>
      <Text2 regular color={skinVars.colors.textSecondary}>
        {t.description}
      </Text2>
      <Stack space={8}>
        <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
          Section structure
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
                    {s.perAxis && <Tag type="inactive">per axis</Tag>}
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
                Required disclaimers
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
  const { data, isLoading } = useGetBrandTemplates(roleId ? { roleId } : undefined);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  if (isLoading) return <Loading />;
  if (!data) return null;
  return (
    <Stack space={24}>
      <IntroLine>
        Governed document blueprints — each with its owner, format, version and validity. Select a
        template to see the section structure and required disclaimers every published document must
        follow.
      </IntroLine>
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
            <Box paddingBottom={24}>
              <TemplateDetail templateId={selectedId} roleId={roleId} />
            </Box>
          )}
        </Sheet>
      )}
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
  return (
    <Boxed>
      <Box padding={24}>
        <Stack space={16}>
          <Stack space={4}>
            <Title3>Hard rules</Title3>
            <Text2 regular color={skinVars.colors.textSecondary}>
              Enforced automatically by the Brand Guardian.
            </Text2>
          </Stack>
          <Stack space={12}>
            {rules.map((r) => (
              <Inline key={r.id} space={12} alignItems="center">
                <Tag type={r.severity === "error" ? "error" : "warning"}>
                  {r.severity === "error" ? "blocks" : "advises"}
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
  return (
    <Boxed>
      <Box padding={24}>
        <Stack space={16}>
          <Stack space={4}>
            <Title3>Prohibited claims</Title3>
            <Text2 regular color={skinVars.colors.textSecondary}>
              Unapproved superlatives and the approved rewrite to use instead.
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
  return (
    <Boxed>
      <Box padding={24}>
        <Stack space={16}>
          <Stack space={4}>
            <Title3>European English</Title3>
            <Text2 regular color={skinVars.colors.textSecondary}>
              Preferred spellings across every surface.
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
  const { data, isLoading } = useGetBrandTone();
  if (isLoading) return <Loading />;
  if (!data) return null;
  return (
    <Stack space={32}>
      <IntroLine>
        How Telefónica sounds — six principles the Brand Guardian and every drafter work to.
      </IntroLine>
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

const CATEGORY_META: Record<string, { label: string; icon: IconType }> = {
  identity: { label: "Identity", icon: IconImageRegular },
  messaging: { label: "Messaging", icon: IconChatRegular },
  legal: { label: "Legal", icon: IconBalanceRegular },
  reference: { label: "Reference", icon: IconBookRegular },
};
const CATEGORY_ORDER = ["identity", "messaging", "legal", "reference"];

function ResourceCard({ r, onOpen }: { r: BrandResource; onOpen: () => void }) {
  return (
    <Boxed>
      <Touchable onPress={onOpen} aria-label={`Open resource ${r.name}`}>
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
  const { data, isLoading } = useGetBrandResources(roleId ? { roleId } : undefined);
  const [selected, setSelected] = React.useState<BrandResource | null>(null);
  if (isLoading) return <Loading />;
  if (!data) return null;
  return (
    <Stack space={24}>
      <IntroLine>
        Governed brand assets — filtered to what your persona's clearance permits.
      </IntroLine>
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
                <Title3>{meta.label}</Title3>
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
            <Box paddingBottom={24}>
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

// ---- Brand Guardian ---------------------------------------------------------

const GUARDIAN_SAMPLE =
  "We are the number one operator in Europe. Our new color program reached 12% growth last year.";

function GuardianVerdict({ result }: { result: GuardianResult }) {
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
            <Tag type={pass ? "success" : "error"}>{pass ? "On brand" : "Needs work"}</Tag>
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
                      <Tag type={f.severity === "error" ? "error" : "warning"}>{f.severity}</Tag>
                      <Text2 medium color={skinVars.colors.textPrimary}>
                        {f.rule}
                      </Text2>
                    </Inline>
                    <Text2 regular color={skinVars.colors.textSecondary}>
                      {f.message}
                    </Text2>
                    {f.suggestion && (
                      <Text2 medium color={skinVars.colors.textLink}>
                        Fix: {f.suggestion}
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

function GuardianArea() {
  const [text, setText] = React.useState("");
  const [checked, setChecked] = React.useState<{ text: string; result: GuardianResult } | null>(
    null,
  );
  const check = useCheckBrandText();
  const run = () => {
    const snapshot = text;
    check.mutate(
      { data: { text: snapshot } },
      { onSuccess: (g) => setChecked({ text: snapshot, result: g }) },
    );
  };
  const hasHighlights = !!checked && checked.result.findings.some((f) => f.location);
  return (
    <div style={{ maxWidth: 768 }}>
      <Stack space={24}>
        <IntroLine>
          Paste any copy — a caption, an intro, a tweet — and the Brand Guardian checks it against the
          same rules that gate document export. Every violation is flagged inline. Deterministic, and
          no text leaves the governed core.
        </IntroLine>
        <Boxed>
          <Box padding={24}>
            <Stack space={16}>
              <TextField
                multiline
                name="guardian-text"
                label="Paste copy to check"
                value={text}
                onChangeValue={(v) => setText(v)}
                fullWidth
              />
              <Inline space={16} alignItems="center" wrap>
                <ButtonPrimary
                  onPress={run}
                  disabled={check.isPending || text.trim().length === 0}
                  StartIcon={IconShieldCheckedOkRegular}
                  showSpinner={check.isPending}
                >
                  {check.isPending ? "Checking…" : "Run Brand Guardian"}
                </ButtonPrimary>
                <ButtonLink
                  onPress={() => {
                    setText(GUARDIAN_SAMPLE);
                    setChecked(null);
                  }}
                >
                  Load a sample
                </ButtonLink>
                {(text || checked) && (
                  <ButtonLink
                    onPress={() => {
                      setText("");
                      setChecked(null);
                    }}
                  >
                    Clear
                  </ButtonLink>
                )}
              </Inline>
            </Stack>
          </Box>
        </Boxed>
        {hasHighlights && checked && (
          <Boxed>
            <Box padding={20}>
              <Stack space={12}>
                <Inline space={12} alignItems="center" wrap>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                      Checked text
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
                        Blocks
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
                        Advises
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
      </Stack>
    </div>
  );
}

// ---- Page -------------------------------------------------------------------

export default function BrandPage() {
  const { roleId } = useApp();
  const [tab, setTab] = React.useState<TabId>("templates");
  const scopedRole = roleId || undefined;
  const selectedIndex = TABS.findIndex((t) => t.id === tab);

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
              The brand team's control room — governed templates, the tone of voice every drafter
              follows, corporate resources, and a live Brand Guardian that checks copy before it
              ships.
            </Text3>
          </div>
        </Stack>

        <Tabs
          selectedIndex={selectedIndex < 0 ? 0 : selectedIndex}
          onChange={(index) => setTab(TABS[index].id)}
          tabs={TABS.map((t) => ({ text: t.label, Icon: t.icon }))}
        />

        <div>
          {tab === "templates" && <TemplatesArea roleId={scopedRole} />}
          {tab === "tone" && <ToneArea />}
          {tab === "resources" && <ResourcesArea roleId={scopedRole} />}
          {tab === "guardian" && <GuardianArea />}
        </div>
      </Stack>
    </Box>
  );
}
