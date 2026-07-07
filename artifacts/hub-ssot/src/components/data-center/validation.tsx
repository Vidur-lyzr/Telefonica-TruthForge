import React, { useMemo, useState } from "react";
import { useListValidationItems, useListAxes } from "@workspace/api-client-react";
import type { ValidationItem } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  CheckCircle2,
  Layers,
  Sparkles,
  Compass,
  History,
  PencilLine,
  X,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataCenter } from "./state";
import { clearanceBadgeClass, confidenceClass } from "./helpers";

const CLEARANCES = ["public", "internal", "confidential", "restricted"];

function ConfidenceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-tf-success" /> High — auto-validated upstream
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-tf-warning" /> Medium — shown here for a quick check
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-tf-error" /> Low — flagged, needs a human
      </span>
    </div>
  );
}

export default function ValidationArea() {
  const { data: items } = useListValidationItems();
  const { data: axes } = useListAxes();
  const { resolvedValidations, resolveValidation, resolveConflict } = useDataCenter();

  const [editing, setEditing] = useState<ValidationItem | null>(null);
  const [editMeta, setEditMeta] = useState<{
    confidentiality: string;
    owner: string;
    country: string;
    brand: string;
  } | null>(null);

  const axisName = (id: string) => axes?.find((a) => a.id === id)?.name ?? id;

  const openItems = useMemo(
    () => (items ?? []).filter((it) => !resolvedValidations[it.id]),
    [items, resolvedValidations],
  );
  const resolvedItems = useMemo(
    () => (items ?? []).filter((it) => resolvedValidations[it.id]),
    [items, resolvedValidations],
  );

  function startEdit(it: ValidationItem) {
    setEditMeta({
      confidentiality: it.metadata.confidentiality,
      owner: it.metadata.owner,
      country: it.metadata.country,
      brand: it.metadata.brand,
    });
    setEditing(it);
  }

  function saveEdit() {
    if (!editing || !editMeta) return;
    const changed: string[] = [];
    if (editMeta.confidentiality !== editing.metadata.confidentiality)
      changed.push(`confidentiality → ${editMeta.confidentiality}`);
    if (editMeta.owner !== editing.metadata.owner) changed.push(`owner → ${editMeta.owner}`);
    if (editMeta.country !== editing.metadata.country) changed.push(`country → ${editMeta.country}`);
    if (editMeta.brand !== editing.metadata.brand) changed.push(`brand → ${editMeta.brand}`);
    const detail = changed.length
      ? `Corrected ${changed.join(", ")}. ${editing.refinedNote}`
      : editing.refinedNote;
    resolveValidation(editing.id, "edited", editing.title, detail);
    setEditing(null);
    setEditMeta(null);
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border">
        <CardHeader className="bg-tf-navy text-white">
          <CardTitle className="flex items-center space-x-2 text-white text-lg">
            <ShieldCheck className="w-5 h-5 text-tf-blue-light" />
            <span>Three-layer classification, always closed by a human</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-tf-blue-tint text-tf-blue shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-tf-navy text-sm">Deterministic</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Rule-based type from source, format and structure.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-tf-blue-tint text-tf-blue shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-tf-navy text-sm">Semantic</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Topics and entities inferred from the content.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-tf-blue-tint text-tf-blue shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-tf-navy text-sm">Strategic</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mapped onto a Telefónica strategic axis.
                </p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-border">
            <ConfidenceLegend />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader
          className={cn(
            "border-b border-border",
            openItems.length > 0 ? "bg-muted/30" : "bg-tf-success-bg",
          )}
        >
          <CardTitle className="flex items-center space-x-2 text-tf-navy text-lg">
            {openItems.length > 0 ? (
              <ShieldCheck className="w-5 h-5 text-tf-blue" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-tf-success" />
            )}
            <span>
              {openItems.length > 0
                ? `Validation queue — ${openItems.length} awaiting a decision`
                : "Validation queue clear"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {openItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="p-3 rounded-full bg-tf-success-bg text-tf-success mb-3">
                <Inbox className="w-7 h-7" />
              </div>
              <p className="font-bold text-tf-navy">All caught up</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                {resolvedItems.length > 0
                  ? `You cleared ${resolvedItems.length} ${resolvedItems.length === 1 ? "item" : "items"} this session. High-confidence classifications were validated automatically upstream.`
                  : "No medium- or low-confidence classifications are waiting on a human."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {openItems.map((it) => (
                <div key={it.id} className="rounded-xl border border-border p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-tf-navy">{it.title}</p>
                        {it.kind === "conflict" && (
                          <Badge className="bg-tf-warning-bg text-tf-warning rounded-full text-[10px] uppercase tracking-eyebrow font-bold">
                            Source conflict
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{it.source}</p>
                    </div>
                    <Badge
                      className={cn(
                        "uppercase text-[10px] tracking-eyebrow rounded-full font-bold shrink-0",
                        confidenceClass(it.confidence),
                      )}
                    >
                      {it.confidence} · {Math.round(it.confidenceScore * 100)}%
                    </Badge>
                  </div>

                  {it.kind === "conflict" && it.conflict ? (
                    <div className="rounded-lg border border-tf-warning/40 bg-tf-warning-bg/40 p-4">
                      <p className="text-sm font-semibold text-tf-navy mb-3">
                        A fresher source disagrees with the value already in the core.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border bg-card p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <History className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
                              Currently live
                            </span>
                          </div>
                          <p className="font-bold text-tf-navy">
                            {it.conflict.metric}: {it.conflict.oldValue}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {it.conflict.oldSource} · {it.conflict.oldDate}
                          </p>
                        </div>
                        <div className="rounded-lg border border-tf-success/40 bg-tf-success-bg/50 p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-tf-success" />
                            <span className="text-[10px] uppercase tracking-eyebrow font-bold text-tf-success">
                              Fresher source
                            </span>
                          </div>
                          <p className="font-bold text-tf-navy">
                            {it.conflict.metric}: {it.conflict.freshValue}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {it.conflict.freshSource} · {it.conflict.freshDate}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Promoting the fresher value keeps the older figure as a dated, historic
                        record — it is never silently overwritten.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button
                          size="sm"
                          className="rounded-pill bg-tf-success hover:bg-tf-success/90 text-white font-semibold"
                          onClick={() =>
                            resolveConflict(
                              it.id,
                              it.title,
                              `Promoted ${it.conflict!.freshValue} (${it.conflict!.freshSource}, ${it.conflict!.freshDate}); ${it.conflict!.oldValue} retained as historic.`,
                            )
                          }
                        >
                          Promote fresher value
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-pill font-semibold"
                          onClick={() =>
                            resolveValidation(
                              it.id,
                              "approved",
                              it.title,
                              `Kept ${it.conflict!.oldValue} (${it.conflict!.oldSource}); fresher figure logged but not promoted.`,
                            )
                          }
                        >
                          Keep current value
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground mb-1">
                            Deterministic
                          </p>
                          <p className="text-sm font-semibold text-tf-navy">
                            {it.classification.deterministic}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground mb-1">
                            Semantic
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {it.classification.semantic.map((s) => (
                              <Badge
                                key={s}
                                className="bg-tf-blue-tint text-tf-blue rounded-full text-[10px] font-bold"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground mb-1">
                            Strategic axis
                          </p>
                          <p className="text-sm font-semibold text-tf-navy">
                            {axisName(it.classification.strategicAxisId)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-muted-foreground">Proposed metadata:</span>
                        <Badge
                          className={cn(
                            "uppercase text-[10px] tracking-eyebrow rounded-full font-bold",
                            clearanceBadgeClass(it.metadata.confidentiality),
                          )}
                        >
                          {it.metadata.confidentiality}
                        </Badge>
                        <span className="text-tf-navy font-medium">{it.metadata.owner}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-tf-navy font-medium">{it.metadata.country}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-tf-navy font-medium">{it.metadata.brand}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          size="sm"
                          className="rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white font-semibold"
                          onClick={() =>
                            resolveValidation(
                              it.id,
                              "approved",
                              it.title,
                              `Confirmed the proposed classification. ${it.refinedNote}`,
                            )
                          }
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Validate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-pill font-semibold"
                          onClick={() => startEdit(it)}
                        >
                          <PencilLine className="w-4 h-4 mr-1.5" /> Correct
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-pill font-semibold text-tf-error hover:text-tf-error hover:bg-tf-error-bg"
                          onClick={() =>
                            resolveValidation(
                              it.id,
                              "rejected",
                              it.title,
                              "Rejected — returned to the pipeline for re-processing.",
                            )
                          }
                        >
                          <X className="w-4 h-4 mr-1.5" /> Reject
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {resolvedItems.length > 0 && (
        <Card className="shadow-sm border-border">
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle className="flex items-center space-x-2 text-tf-navy text-lg">
              <CheckCircle2 className="w-5 h-5 text-tf-success" />
              <span>Resolved this session</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-2">
            {resolvedItems.map((it) => {
              const action = resolvedValidations[it.id];
              const label =
                action === "approved"
                  ? "Validated"
                  : action === "edited"
                    ? "Corrected"
                    : "Rejected";
              return (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-tf-navy truncate">{it.title}</p>
                    <p className="text-xs text-muted-foreground">{it.refinedNote}</p>
                  </div>
                  <Badge
                    className={cn(
                      "uppercase text-[10px] tracking-eyebrow rounded-full font-bold shrink-0",
                      action === "rejected"
                        ? "bg-tf-error-bg text-tf-error"
                        : "bg-tf-success-bg text-tf-success",
                    )}
                  >
                    {label}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-tf-navy">Correct classification</DialogTitle>
            <DialogDescription>
              {editing?.title} — adjust the governed metadata before validating. Your correction is
              recorded as the human decision. Session-only for the demo.
            </DialogDescription>
          </DialogHeader>
          {editMeta && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Confidentiality</Label>
                <Select
                  value={editMeta.confidentiality}
                  onValueChange={(v) => setEditMeta((m) => (m ? { ...m, confidentiality: v } : m))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLEARANCES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Owner</Label>
                <Input
                  value={editMeta.owner}
                  onChange={(e) => setEditMeta((m) => (m ? { ...m, owner: e.target.value } : m))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input
                    value={editMeta.country}
                    onChange={(e) => setEditMeta((m) => (m ? { ...m, country: e.target.value } : m))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Brand</Label>
                  <Input
                    value={editMeta.brand}
                    onChange={(e) => setEditMeta((m) => (m ? { ...m, brand: e.target.value } : m))}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-pill font-semibold"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white font-semibold"
              onClick={saveEdit}
            >
              Save and validate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
