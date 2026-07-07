import React, { useState } from "react";
import {
  useGetBrandTemplates,
  useGetBrandTone,
  useGetBrandResources,
  useCheckBrandText,
  type BrandTemplate,
  type TonePrinciple,
  type BrandRule,
  type ProhibitedPhrase,
  type SpellingPref,
  type BrandResource,
  type GuardianResult,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app-provider";
import {
  FileText,
  Megaphone,
  Library,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Check,
  X,
  Palette,
  MessageSquareQuote,
  Scale,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

type IconType = React.ComponentType<{ className?: string }>;
type TabId = "templates" | "tone" | "resources" | "guardian";

const TABS: { id: TabId; label: string; icon: IconType }[] = [
  { id: "templates", label: "Templates", icon: FileText },
  { id: "tone", label: "Tone of voice", icon: Megaphone },
  { id: "resources", label: "Resources", icon: Library },
  { id: "guardian", label: "Brand Guardian", icon: ShieldCheck },
];

// ---- Shared pieces ----------------------------------------------------------

function IntroLine({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground max-w-3xl">{children}</p>;
}

function Loading() {
  return <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>;
}

function ClearanceBadge({ clearance }: { clearance: string }) {
  return (
    <Badge
      variant="outline"
      className="uppercase tracking-eyebrow text-[9px] border-border text-muted-foreground shrink-0"
    >
      {clearance}
    </Badge>
  );
}

function ValidityBadge({ validity }: { validity: string }) {
  const tone =
    validity === "approved"
      ? "text-tf-success border-tf-success/40"
      : validity === "review"
        ? "text-tf-warning border-tf-warning/40"
        : "text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("uppercase tracking-eyebrow text-[9px]", tone)}>
      {validity}
    </Badge>
  );
}

function BlockedNote({ count, noun }: { count: number; noun: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-tf-warning bg-tf-warning-bg px-4 py-2.5 rounded-xl border border-tf-warning/20">
      <Lock className="w-4 h-4 shrink-0" />
      <span>
        {count} {noun}
        {count === 1 ? "" : "s"} hidden by your persona's clearance.
      </span>
    </div>
  );
}

function PermissionBlocked({ count, noun }: { count: number; noun: string }) {
  return (
    <div className="rounded-2xl border border-tf-error/20 bg-tf-error-bg p-6 flex items-start gap-4">
      <div className="p-2.5 rounded-full bg-tf-error text-white shrink-0">
        <Lock className="w-5 h-5" />
      </div>
      <div>
        <p className="font-bold text-tf-navy">Permission blocked</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {count} {noun}
          {count === 1 ? " is" : "s are"} governed above your persona's clearance. Switch to a
          higher-clearance persona to view {count === 1 ? "it" : "them"}.
        </p>
      </div>
    </div>
  );
}

// ---- Templates --------------------------------------------------------------

function TemplateCard({ t }: { t: BrandTemplate }) {
  return (
    <div className="rounded-2xl border border-border p-6 space-y-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-tf-navy text-lg">{t.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
        </div>
        <Badge
          variant="outline"
          className="uppercase tracking-eyebrow text-[9px] border-tf-blue/30 text-tf-blue shrink-0"
        >
          {t.shape}
        </Badge>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-eyebrow text-muted-foreground mb-2">
          Sections
        </p>
        <ul className="space-y-1.5">
          {t.sections.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-sm flex-wrap">
              <span className="w-1.5 h-1.5 rounded-full bg-tf-blue shrink-0" />
              <span className="text-foreground">{s.label}</span>
              <span className="text-xs text-muted-foreground">· {s.kind}</span>
              {s.perAxis && (
                <Badge
                  variant="outline"
                  className="uppercase tracking-eyebrow text-[9px] border-border text-muted-foreground"
                >
                  per axis
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </div>
      {t.disclaimers.length > 0 && (
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs font-bold uppercase tracking-eyebrow text-muted-foreground mb-1.5">
            Required disclaimers
          </p>
          <ul className="space-y-1.5">
            {t.disclaimers.map((d) => (
              <li key={d.id} className="text-xs text-foreground/80 leading-snug">
                <span className="font-semibold text-tf-navy">{d.name}.</span> {d.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TemplatesArea({ roleId }: { roleId?: string }) {
  const { data, isLoading } = useGetBrandTemplates(roleId ? { roleId } : undefined);
  if (isLoading) return <Loading />;
  if (!data) return null;
  return (
    <div className="space-y-5">
      <IntroLine>
        Governed document blueprints — the sections, per-axis fields and required disclaimers every
        published document must follow.
      </IntroLine>
      {data.templates.length === 0 ? (
        <PermissionBlocked count={data.blockedCount} noun="template" />
      ) : (
        <>
          {data.blockedCount > 0 && <BlockedNote count={data.blockedCount} noun="template" />}
          <div className="grid gap-5 md:grid-cols-2">
            {data.templates.map((t) => (
              <TemplateCard key={t.id} t={t} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---- Tone of voice ----------------------------------------------------------

function PrincipleCard({ p }: { p: TonePrinciple }) {
  return (
    <div className="rounded-2xl border border-border p-5 space-y-3 bg-white">
      <h3 className="font-bold text-tf-navy">{p.title}</h3>
      <p className="text-sm text-muted-foreground">{p.guidance}</p>
      <div className="space-y-1.5 pt-1">
        {p.dos.map((d, i) => (
          <div key={`do-${i}`} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-tf-success mt-0.5 shrink-0" />
            <span className="text-foreground/80">{d}</span>
          </div>
        ))}
        {p.donts.map((d, i) => (
          <div key={`dont-${i}`} className="flex items-start gap-2 text-sm">
            <X className="w-4 h-4 text-tf-error mt-0.5 shrink-0" />
            <span className="text-foreground/80">{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RulesPanel({ rules }: { rules: BrandRule[] }) {
  return (
    <div className="rounded-2xl border border-border p-6 bg-white">
      <h3 className="font-bold text-tf-navy mb-1">Hard rules</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Enforced automatically by the Brand Guardian.
      </p>
      <ul className="space-y-3">
        {rules.map((r) => (
          <li key={r.id} className="flex items-start gap-3">
            <Badge
              variant="outline"
              className={cn(
                "uppercase tracking-eyebrow text-[9px] mt-0.5 shrink-0",
                r.severity === "error"
                  ? "text-tf-error border-tf-error/40"
                  : "text-tf-warning border-tf-warning/40",
              )}
            >
              {r.severity === "error" ? "blocks" : "advises"}
            </Badge>
            <div>
              <p className="text-sm font-semibold text-foreground">{r.rule}</p>
              <p className="text-sm text-muted-foreground">{r.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProhibitedPanel({ prohibited }: { prohibited: ProhibitedPhrase[] }) {
  return (
    <div className="rounded-2xl border border-border p-6 bg-white">
      <h3 className="font-bold text-tf-navy mb-1">Prohibited claims</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Unapproved superlatives and the approved rewrite to use instead.
      </p>
      <ul className="space-y-3">
        {prohibited.map((p) => (
          <li key={p.id} className="text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="line-through text-tf-error font-medium">{p.phrase}</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-tf-success font-medium">{p.rewrite}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{p.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpellingPanel({ spelling }: { spelling: SpellingPref[] }) {
  return (
    <div className="rounded-2xl border border-border p-6 bg-white">
      <h3 className="font-bold text-tf-navy mb-1">European English</h3>
      <p className="text-sm text-muted-foreground mb-4">Preferred spellings across every surface.</p>
      <div className="flex flex-wrap gap-2">
        {spelling.map((s) => (
          <div
            key={s.american}
            className="inline-flex items-center gap-2 rounded-pill border border-border px-3 py-1.5 text-sm"
          >
            <span className="line-through text-muted-foreground">{s.american}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="font-semibold text-tf-navy">{s.european}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToneArea() {
  const { data, isLoading } = useGetBrandTone();
  if (isLoading) return <Loading />;
  if (!data) return null;
  return (
    <div className="space-y-8">
      <IntroLine>
        How Telefónica sounds — six principles the Brand Guardian and every drafter work to.
      </IntroLine>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.principles.map((p) => (
          <PrincipleCard key={p.id} p={p} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <RulesPanel rules={data.rules} />
        <div className="space-y-6">
          <ProhibitedPanel prohibited={data.prohibited} />
          <SpellingPanel spelling={data.spelling} />
        </div>
      </div>
    </div>
  );
}

// ---- Resources --------------------------------------------------------------

const CATEGORY_META: Record<string, { label: string; icon: IconType }> = {
  identity: { label: "Identity", icon: Palette },
  messaging: { label: "Messaging", icon: MessageSquareQuote },
  legal: { label: "Legal", icon: Scale },
  reference: { label: "Reference", icon: BookOpen },
};
const CATEGORY_ORDER = ["identity", "messaging", "legal", "reference"];

function ResourcesArea({ roleId }: { roleId?: string }) {
  const { data, isLoading } = useGetBrandResources(roleId ? { roleId } : undefined);
  const [selected, setSelected] = useState<BrandResource | null>(null);
  if (isLoading) return <Loading />;
  if (!data) return null;
  return (
    <div className="space-y-6">
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
            <div key={cat} className="space-y-3">
              <div className="flex items-center gap-2 text-tf-navy">
                <Icon className="w-4 h-4 text-tf-blue" />
                <h3 className="font-bold">{meta.label}</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="text-left rounded-2xl border border-border p-5 bg-white hover:border-tf-blue/40 hover:shadow-sm transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-tf-navy">{r.name}</h4>
                      <ClearanceBadge clearance={r.clearance} />
                    </div>
                    <p className="text-sm text-muted-foreground">{r.description}</p>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-muted-foreground">{r.format}</span>
                      <ValidityBadge validity={r.validity} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })
      )}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-tf-navy">{selected.name}</SheetTitle>
                <SheetDescription>{selected.description}</SheetDescription>
              </SheetHeader>
              <div className="flex items-center gap-2 mt-3">
                <ClearanceBadge clearance={selected.clearance} />
                <ValidityBadge validity={selected.validity} />
                <span className="text-xs text-muted-foreground">{selected.format}</span>
              </div>
              <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed pb-6">
                  {selected.detail}
                </p>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ---- Brand Guardian ---------------------------------------------------------

const GUARDIAN_SAMPLE =
  "We are the number one operator in Europe. Our new color program reached 12% growth last year.";

function GuardianVerdict({ result }: { result: GuardianResult }) {
  const pass = result.status === "pass";
  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        pass ? "bg-tf-success-bg border-tf-success/20" : "bg-tf-error-bg border-tf-error/20",
      )}
    >
      <div className="flex items-start gap-3">
        {pass ? (
          <ShieldCheck className="w-5 h-5 text-tf-success mt-0.5 shrink-0" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-tf-error mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">Brand Guardian</span>
            <Badge
              className={cn(
                "uppercase tracking-eyebrow text-[10px]",
                pass ? "bg-tf-success text-white" : "bg-tf-error text-white",
              )}
            >
              {pass ? "On brand" : "Needs work"}
            </Badge>
          </div>
          <p className="text-sm text-foreground/80 mt-1">{result.summary}</p>
          {result.findings.length > 0 && (
            <ul className="mt-3 space-y-2">
              {result.findings.map((f, i) => (
                <li
                  key={i}
                  className="text-sm bg-white/60 rounded-lg p-3 border border-black/5"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "uppercase tracking-eyebrow text-[9px]",
                        f.severity === "error"
                          ? "text-tf-error border-tf-error/40"
                          : "text-tf-warning border-tf-warning/40",
                      )}
                    >
                      {f.severity}
                    </Badge>
                    <span className="font-semibold text-foreground">{f.rule}</span>
                  </div>
                  <p className="text-foreground/80 mt-1">{f.message}</p>
                  {f.suggestion && (
                    <p className="text-tf-blue mt-1 font-medium">Fix: {f.suggestion}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function GuardianArea() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<GuardianResult | null>(null);
  const check = useCheckBrandText();
  const run = () => {
    check.mutate({ data: { text } }, { onSuccess: (g) => setResult(g) });
  };
  return (
    <div className="space-y-5 max-w-3xl">
      <IntroLine>
        Paste any copy — a caption, an intro, a tweet — and the Brand Guardian checks it against the
        same rules that gate document export. Deterministic, and no text leaves the governed core.
      </IntroLine>
      <div className="rounded-2xl border border-border p-6 bg-white space-y-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste copy to check…"
          className="min-h-40 resize-y rounded-xl"
        />
        <div className="flex items-center gap-4 flex-wrap">
          <Button
            onClick={run}
            disabled={check.isPending || text.trim().length === 0}
            className="rounded-pill bg-tf-blue hover:bg-tf-blue/90 text-white font-semibold"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            {check.isPending ? "Checking…" : "Run Brand Guardian"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setText(GUARDIAN_SAMPLE);
              setResult(null);
            }}
            className="text-sm text-tf-blue font-medium hover:underline"
          >
            Load a sample
          </button>
          {(text || result) && (
            <button
              type="button"
              onClick={() => {
                setText("");
                setResult(null);
              }}
              className="text-sm text-muted-foreground hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {result && <GuardianVerdict result={result} />}
    </div>
  );
}

// ---- Page -------------------------------------------------------------------

export default function BrandPage() {
  const { roleId } = useApp();
  const [tab, setTab] = useState<TabId>("templates");
  const scopedRole = roleId || undefined;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-eyebrow text-tf-blue font-bold">Backend · Marca</p>
        <h1 className="text-title-lg text-tf-navy">Brand Room</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          The brand team's control room — governed templates, the tone of voice every drafter
          follows, corporate resources, and a live Brand Guardian that checks copy before it ships.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap border-b border-border pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-tf-navy text-white"
                  : "text-muted-foreground hover:text-tf-navy hover:bg-muted",
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div>
        {tab === "templates" && <TemplatesArea roleId={scopedRole} />}
        {tab === "tone" && <ToneArea />}
        {tab === "resources" && <ResourcesArea roleId={scopedRole} />}
        {tab === "guardian" && <GuardianArea />}
      </div>
    </div>
  );
}
