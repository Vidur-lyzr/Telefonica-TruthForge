import React, { useMemo, useState } from "react";
import { useGetIngestionSnapshot } from "@workspace/api-client-react";
import type { QuarantineDoc } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  ScanLine,
  Tags,
  ShieldCheck,
  Boxes,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataCenter } from "./state";
import { clearanceBadgeClass, fieldLabel } from "./helpers";

const STAGE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  intake: Download,
  extract: ScanLine,
  classify: Tags,
  govern: ShieldCheck,
  chunk: Boxes,
  embed: Sparkles,
  validate: CheckCircle2,
};

const CLEARANCES = ["public", "internal", "confidential", "restricted"];

export default function IngestionArea() {
  const { data: snapshot } = useGetIngestionSnapshot();
  const { releasedQuarantine, releaseQuarantine } = useDataCenter();

  const [active, setActive] = useState<QuarantineDoc | null>(null);
  const [fixes, setFixes] = useState<Record<string, string>>({});

  const quarantine = snapshot?.quarantine ?? [];
  const openItems = useMemo(
    () => quarantine.filter((q) => !releasedQuarantine[q.id]),
    [quarantine, releasedQuarantine],
  );
  const releasedCount = quarantine.length - openItems.length;

  function openResolve(doc: QuarantineDoc) {
    const seed: Record<string, string> = {};
    doc.missingFields.forEach((f) => {
      seed[f] = "";
    });
    setFixes(seed);
    setActive(doc);
  }

  const allFilled =
    active !== null && active.missingFields.every((f) => (fixes[f] ?? "").trim().length > 0);

  function commitRelease() {
    if (!active) return;
    const filled = active.missingFields.map((f) => fieldLabel(f)).join(", ");
    releaseQuarantine(
      active.id,
      active.title,
      `Completed ${filled}. Re-entered the pipeline at ${active.stage}.`,
    );
    setActive(null);
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/30 border-b border-border">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center space-x-2 text-tf-navy text-lg">
              <Boxes className="w-5 h-5 text-tf-blue" />
              <span>The seven-stage pipeline</span>
            </CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Taxonomy</span>
              <Badge className="bg-tf-navy text-white rounded-full text-xs font-bold">
                {snapshot?.taxonomyVersion ?? "—"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-2">
            {snapshot?.stages.map((stage, i) => {
              const Icon = STAGE_ICON[stage.id] ?? Boxes;
              return (
                <React.Fragment key={stage.id}>
                  <div className="flex-1 rounded-xl border border-border p-4 bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-tf-blue-tint text-tf-blue">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-tf-navy tabular-nums">
                        {stage.count.toLocaleString("en-GB")}
                      </span>
                    </div>
                    <p className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
                      Stage {i + 1}
                    </p>
                    <p className="font-bold text-tf-navy text-sm leading-tight mt-0.5">
                      {stage.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
                      {stage.description}
                    </p>
                  </div>
                  {i < (snapshot.stages.length ?? 0) - 1 && (
                    <div className="hidden lg:flex items-center justify-center text-muted-foreground shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div className="rounded-xl bg-muted/40 border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-tf-navy">Validated and live in the core</p>
              <span className="text-sm font-bold text-tf-success tabular-nums">
                {snapshot?.validatedPct ?? 0}%
              </span>
            </div>
            <Progress value={snapshot?.validatedPct ?? 0} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Nothing reaches the model until it passes validation. The remainder is held in
              quarantine below — never silently dropped, never silently guessed.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader
          className={cn(
            "border-b border-border",
            openItems.length > 0 ? "bg-tf-warning-bg" : "bg-tf-success-bg",
          )}
        >
          <CardTitle className="flex items-center space-x-2 text-tf-navy text-lg">
            {openItems.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-tf-warning" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-tf-success" />
            )}
            <span>
              {openItems.length > 0
                ? `Quarantine — ${openItems.length} held for a documentalist`
                : "Quarantine clear"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {openItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="p-3 rounded-full bg-tf-success-bg text-tf-success mb-3">
                <Inbox className="w-7 h-7" />
              </div>
              <p className="font-bold text-tf-navy">Nothing waiting</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                {releasedCount > 0
                  ? `You cleared ${releasedCount} ${releasedCount === 1 ? "document" : "documents"} this session. Each re-entered the pipeline where it left off.`
                  : "Every ingested document has the metadata the core requires."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground max-w-3xl">
                These documents stalled because a required field is missing or their taxonomy version
                is behind. They are held — not dropped — so the core is never polluted. Complete the
                metadata to release them.
              </p>
              {openItems.map((q) => (
                <div
                  key={q.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-border p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-tf-navy truncate">{q.title}</p>
                      <Badge
                        className={cn(
                          "uppercase text-[10px] tracking-eyebrow rounded-full font-bold",
                          clearanceBadgeClass(q.confidentiality),
                        )}
                      >
                        {q.confidentiality}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {q.source} · held at {q.stage} stage · taxonomy {q.taxonomyVersion}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-eyebrow font-bold text-tf-error">
                        Missing
                      </span>
                      {q.missingFields.map((f) => (
                        <Badge
                          key={f}
                          className="bg-tf-error-bg text-tf-error rounded-full text-[10px] font-bold"
                        >
                          {fieldLabel(f)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={() => openResolve(q)}
                    size="sm"
                    className="rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white font-semibold shrink-0"
                  >
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-tf-navy">Resolve quarantine</DialogTitle>
            <DialogDescription>
              {active?.title} — complete the required metadata. Once released, the document re-enters
              the pipeline at the {active?.stage} stage. Session-only for the demo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {active?.missingFields.map((f) => (
              <div key={f} className="space-y-1.5">
                <Label>{fieldLabel(f)}</Label>
                {f === "confidentiality" ? (
                  <Select
                    value={fixes[f] ?? ""}
                    onValueChange={(v) => setFixes((prev) => ({ ...prev, [f]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLEARANCES.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={fixes[f] ?? ""}
                    onChange={(e) => setFixes((prev) => ({ ...prev, [f]: e.target.value }))}
                    placeholder={`Enter ${fieldLabel(f).toLowerCase()}`}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-pill font-semibold"
              onClick={() => setActive(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white font-semibold"
              disabled={!allFilled}
              onClick={commitRelease}
            >
              Release to pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
