import React, { useMemo, useState } from "react";
import { useListAxes, useListDocumentFreshness } from "@workspace/api-client-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Compass,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Wand2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataCenter } from "./state";
import { formatDate } from "./helpers";

const AXIS_TINTS = [
  "bg-axis-1/10 text-axis-1 border-axis-1/30",
  "bg-axis-2/10 text-axis-2 border-axis-2/30",
  "bg-axis-3/10 text-axis-3 border-axis-3/30",
  "bg-axis-4/10 text-axis-4 border-axis-4/30",
  "bg-axis-5/10 text-axis-5 border-axis-5/30",
];

type Step = 0 | 1 | 2 | 3;

export default function GovernanceArea() {
  const { data: axes } = useListAxes();
  const { data: freshness } = useListDocumentFreshness();
  const { reclassifyRuns, runReclassification } = useDataCenter();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");

  const overdue = useMemo(() => (freshness ?? []).filter((f) => f.overdue), [freshness]);
  const onTrack = (freshness?.length ?? 0) - overdue.length;
  const compliancePct = freshness?.length
    ? Math.round((onTrack / freshness.length) * 100)
    : 100;

  const affectedCount = 42;

  function resetWizard() {
    setStep(0);
    setRenameFrom("");
    setRenameTo("");
  }

  function finishWizard() {
    runReclassification(
      `Renamed "${renameFrom || "a taxonomy label"}" to "${renameTo || "an updated label"}". Re-classified ${affectedCount} documents against the current taxonomy — no re-embedding, no redeploy.`,
    );
    setWizardOpen(false);
    resetWizard();
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border">
        <CardHeader className="bg-tf-navy text-white">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center space-x-2 text-white text-lg">
              <Compass className="w-5 h-5 text-tf-blue-light" />
              <span>Taxonomy is configuration, not code</span>
            </CardTitle>
            <Button
              size="sm"
              className="rounded-pill bg-white text-tf-navy hover:bg-white/90 font-semibold"
              onClick={() => {
                resetWizard();
                setWizardOpen(true);
              }}
            >
              <Wand2 className="w-4 h-4 mr-2" /> Re-classify
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            The strategic axes below are the shared vocabulary every document is mapped to. When the
            strategy shifts, a documentalist updates the taxonomy and re-classifies the corpus
            against it — a governed configuration change, not an engineering release. No re-embedding,
            no IT ticket, no redeploy.
            {reclassifyRuns > 0 && (
              <span className="text-tf-success font-medium">
                {" "}
                {reclassifyRuns} re-classification {reclassifyRuns === 1 ? "run" : "runs"} applied
                this session.
              </span>
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {axes?.map((axis, i) => (
              <div
                key={axis.id}
                className={cn("rounded-xl border p-4", AXIS_TINTS[i % AXIS_TINTS.length])}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-eyebrow font-bold opacity-80">
                    Axis {i + 1}
                  </span>
                  <Compass className="w-4 h-4 opacity-60" />
                </div>
                <p className="font-bold leading-tight">{axis.name}</p>
                {axis.description && (
                  <p className="text-xs opacity-80 mt-1 leading-snug">{axis.description}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader
          className={cn(
            "border-b border-border",
            overdue.length > 0 ? "bg-tf-warning-bg" : "bg-tf-success-bg",
          )}
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center space-x-2 text-tf-navy text-lg">
              <Clock className="w-5 h-5 text-tf-blue" />
              <span>Freshness and review SLA</span>
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{compliancePct}% within SLA</span>
              <div className="w-32">
                <Progress value={compliancePct} className="h-2" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground max-w-3xl">
            Every governed document carries a review SLA. Once it lapses, the document is flagged for
            a refresh so answers are never quietly built on stale ground — the honest "historic
            source" state depends on this discipline.
          </p>
          {overdue.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-tf-warning-bg border border-tf-warning/40 p-3">
              <AlertTriangle className="w-4 h-4 text-tf-warning shrink-0" />
              <p className="text-sm text-tf-navy font-medium">
                {overdue.length} {overdue.length === 1 ? "document is" : "documents are"} past review
                SLA and due a refresh.
              </p>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">
                  Document
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">Owner</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">
                  Last reviewed
                </TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow">SLA</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-eyebrow text-right">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {freshness?.map((f) => (
                <TableRow key={f.docId} className="hover:bg-muted/50">
                  <TableCell className="font-semibold text-tf-navy max-w-[280px] truncate">
                    {f.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{f.owner}</TableCell>
                  <TableCell className="text-sm">{formatDate(f.lastReviewed)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    every {f.slaMonths} mo
                  </TableCell>
                  <TableCell className="text-right">
                    {f.overdue ? (
                      <Badge className="bg-tf-warning-bg text-tf-warning rounded-full text-[10px] uppercase tracking-eyebrow font-bold">
                        {f.monthsSinceReview} mo · overdue
                      </Badge>
                    ) : (
                      <Badge className="bg-tf-success-bg text-tf-success rounded-full text-[10px] uppercase tracking-eyebrow font-bold">
                        {f.monthsSinceReview} mo · on track
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={wizardOpen} onOpenChange={(o) => !o && setWizardOpen(false)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-tf-navy">Re-classify against the taxonomy</DialogTitle>
            <DialogDescription>
              A four-step governed change. Nothing is re-embedded or redeployed — you are re-applying
              the current taxonomy to existing documents. Session-only for the demo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 py-1">
            {["Edit taxonomy", "Review mapping", "Assisted re-classify", "Human validation"].map(
              (label, i) => (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                        i <= step ? "bg-tf-blue text-white" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {i + 1}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-medium hidden sm:block",
                        i <= step ? "text-tf-navy" : "text-muted-foreground",
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {i < 3 && <div className="flex-1 h-px bg-border" />}
                </React.Fragment>
              ),
            )}
          </div>

          <div className="py-2 min-h-[180px]">
            {step === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Rename or refine a taxonomy label. This mirrors a strategy shift — for example
                  folding a legacy theme into a current strategic axis.
                </p>
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-eyebrow text-muted-foreground">
                      Current label
                    </label>
                    <input
                      value={renameFrom}
                      onChange={(e) => setRenameFrom(e.target.value)}
                      placeholder="e.g. Digitalisation"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground mb-2.5" />
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-eyebrow text-muted-foreground">
                      New label
                    </label>
                    <input
                      value={renameTo}
                      onChange={(e) => setRenameTo(e.target.value)}
                      placeholder="e.g. AI & digital"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {affectedCount} documents currently map to{" "}
                  <span className="font-semibold text-tf-navy">
                    {renameFrom || "the current label"}
                  </span>
                  . They will be re-pointed to{" "}
                  <span className="font-semibold text-tf-navy">{renameTo || "the new label"}</span>.
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="grid grid-cols-2 bg-muted/40 px-4 py-2 text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
                    <span>From</span>
                    <span>To</span>
                  </div>
                  <div className="grid grid-cols-2 px-4 py-3 text-sm items-center">
                    <span className="text-muted-foreground line-through">
                      {renameFrom || "Current label"}
                    </span>
                    <span className="flex items-center gap-2 font-semibold text-tf-navy">
                      <ArrowRight className="w-3.5 h-3.5 text-tf-blue" />
                      {renameTo || "New label"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col items-center justify-center text-center py-4 space-y-3">
                <div className="p-3 rounded-full bg-tf-blue-tint text-tf-blue">
                  <Wand2 className="w-7 h-7" />
                </div>
                <p className="text-sm text-muted-foreground max-w-sm">
                  The engine re-classifies the {affectedCount} affected documents against the updated
                  taxonomy. Existing embeddings are reused — this is a metadata re-mapping, not a
                  re-index.
                </p>
                <div className="w-full max-w-xs">
                  <Progress value={100} className="h-2" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg bg-tf-blue-tint/50 border border-border p-3">
                  <ShieldCheck className="w-4 h-4 text-tf-blue mt-0.5 shrink-0" />
                  <p className="text-sm text-tf-navy font-medium">
                    A human confirms the re-classification before it becomes live. Nothing is applied
                    automatically — the documentalist owns the final decision.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {affectedCount} documents re-classified from{" "}
                  <span className="font-semibold text-tf-navy">
                    {renameFrom || "the current label"}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-tf-navy">{renameTo || "the new label"}</span>.
                  Confirm to apply for this session.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {step > 0 && (
              <Button
                variant="outline"
                className="rounded-pill font-semibold"
                onClick={() => setStep((s) => (s - 1) as Step)}
              >
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                className="rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white font-semibold"
                disabled={step === 0 && renameTo.trim().length === 0}
                onClick={() => setStep((s) => (s + 1) as Step)}
              >
                Continue
              </Button>
            ) : (
              <Button
                className="rounded-pill bg-tf-success hover:bg-tf-success/90 text-white font-semibold"
                onClick={finishWizard}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirm and apply
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
