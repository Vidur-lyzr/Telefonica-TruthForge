import React, { useMemo, useState } from "react";
import {
  useGetIngestionSnapshot,
  useListValidationItems,
  useListDocumentFreshness,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Server,
  Boxes,
  Compass,
  Library,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataCenterProvider, useDataCenter } from "@/components/data-center/state";
import { formatTimestamp } from "@/components/data-center/helpers";
import ValidationArea from "@/components/data-center/validation";
import SourcesArea from "@/components/data-center/sources";
import IngestionArea from "@/components/data-center/ingestion";
import GovernanceArea from "@/components/data-center/governance";
import CorpusArea from "@/components/data-center/corpus";

type AreaId = "validation" | "sources" | "ingestion" | "governance" | "corpus";

const AREAS: {
  id: AreaId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "validation", label: "Validation queue", icon: ShieldCheck },
  { id: "sources", label: "Sources", icon: Server },
  { id: "ingestion", label: "Ingestion", icon: Boxes },
  { id: "governance", label: "Governance", icon: Compass },
  { id: "corpus", label: "Corpus", icon: Library },
];

function ActivityDrawer() {
  const { activity } = useDataCenter();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="rounded-pill font-semibold border-border relative"
        >
          <Activity className="w-4 h-4 mr-2" /> Session activity
          {activity.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-tf-blue text-white text-[11px] font-bold">
              {activity.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-tf-navy">Session activity</SheetTitle>
          <SheetDescription>
            Every documentalist decision made here feeds the platform audit trail. This session is
            in-memory only for the demo.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Activity className="w-8 h-8 mb-3 opacity-50" />
              <p className="text-sm">No actions yet this session.</p>
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {activity.map((a) => (
                <div key={a.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-tf-navy">{a.action}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatTimestamp(a.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-tf-blue mt-0.5">{a.target}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{a.detail}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function DataCenterShell() {
  const [area, setArea] = useState<AreaId>("validation");

  const { data: snapshot } = useGetIngestionSnapshot();
  const { data: validationItems } = useListValidationItems();
  const { data: freshness } = useListDocumentFreshness();
  const { resolvedValidations, releasedQuarantine } = useDataCenter();

  const openQuarantine = useMemo(
    () => (snapshot?.quarantine ?? []).filter((q) => !releasedQuarantine[q.id]).length,
    [snapshot, releasedQuarantine],
  );
  const openValidations = useMemo(
    () => (validationItems ?? []).filter((it) => !resolvedValidations[it.id]).length,
    [validationItems, resolvedValidations],
  );
  const overdue = useMemo(
    () => (freshness ?? []).filter((f) => f.overdue).length,
    [freshness],
  );

  const totalBacklog = openQuarantine + openValidations;
  const allClear = totalBacklog === 0 && overdue === 0;

  const badgeFor = (id: AreaId) => {
    if (id === "validation" && openValidations > 0) return openValidations;
    if (id === "ingestion" && openQuarantine > 0) return openQuarantine;
    if (id === "governance" && overdue > 0) return overdue;
    return null;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-title-lg text-tf-navy">Data Center</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            The documentalist's desk — where sources, ingestion, validation and taxonomy are
            governed so every answer rests on trusted ground.
          </p>
        </div>
        <ActivityDrawer />
      </div>

      <div
        className={cn(
          "rounded-2xl border p-5 flex items-start gap-4",
          allClear ? "bg-tf-success-bg border-tf-success/30" : "bg-tf-blue-tint border-tf-blue/20",
        )}
      >
        <div
          className={cn(
            "p-2.5 rounded-full shrink-0",
            allClear ? "bg-tf-success text-white" : "bg-tf-blue text-white",
          )}
        >
          {allClear ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0">
          {allClear ? (
            <>
              <p className="font-bold text-tf-navy">Everything is caught up</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Nothing in quarantine, no classifications awaiting a human, and every document within
                its review SLA.
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-tf-navy">
                {totalBacklog > 0
                  ? `${totalBacklog} ${totalBacklog === 1 ? "item needs" : "items need"} a documentalist`
                  : "Corpus needs attention"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5 flex flex-wrap gap-x-4 gap-y-1">
                {openValidations > 0 && (
                  <span>
                    <span className="font-semibold text-tf-navy">{openValidations}</span> in the
                    validation queue
                  </span>
                )}
                {openQuarantine > 0 && (
                  <span>
                    <span className="font-semibold text-tf-navy">{openQuarantine}</span> held in
                    quarantine
                  </span>
                )}
                {overdue > 0 && (
                  <span>
                    <span className="font-semibold text-tf-navy">{overdue}</span> past review SLA
                  </span>
                )}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap border-b border-border pb-1">
        {AREAS.map((a) => {
          const Icon = a.icon;
          const badge = badgeFor(a.id);
          const active = area === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setArea(a.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-tf-navy text-white"
                  : "text-muted-foreground hover:text-tf-navy hover:bg-muted",
              )}
            >
              <Icon className="w-4 h-4" />
              {a.label}
              {badge !== null && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold",
                    active ? "bg-white/20 text-white" : "bg-tf-blue text-white",
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div>
        {area === "validation" && <ValidationArea />}
        {area === "sources" && <SourcesArea />}
        {area === "ingestion" && <IngestionArea />}
        {area === "governance" && <GovernanceArea />}
        {area === "corpus" && <CorpusArea />}
      </div>
    </div>
  );
}

export default function DataPage() {
  return (
    <DataCenterProvider>
      <DataCenterShell />
    </DataCenterProvider>
  );
}
