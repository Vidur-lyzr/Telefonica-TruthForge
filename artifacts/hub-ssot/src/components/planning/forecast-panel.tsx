import React, { useState } from "react";
import {
  usePlanningForecast,
  type Citation,
  type PlanningForecast,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Radio, TriangleAlert, ShieldAlert, FileText } from "lucide-react";
import { formatDay } from "./utils";

function Stat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "info" | "warning" | "success";
}) {
  const color =
    tone === "warning"
      ? "text-tf-warning"
      : tone === "success"
        ? "text-tf-success"
        : "text-tf-blue";
  return (
    <div className="text-center px-3">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}

export function ForecastPanel() {
  const { area, roleId } = useApp();
  const [selected, setSelected] = useState<Citation | null>(null);
  const { mutate, isPending, data } = usePlanningForecast();
  const forecast = data as PlanningForecast | undefined;

  return (
    <div className="bg-gradient-to-br from-tf-navy to-tf-navy-tint text-white rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-tf-blue-lighter" />
          <h3 className="text-sm uppercase tracking-eyebrow font-bold text-tf-blue-lighter">
            10-day forecast
          </h3>
        </div>
        <Button
          size="sm"
          className="rounded-pill bg-tf-blue hover:bg-tf-blue-hover text-white h-8 px-4 font-semibold"
          onClick={() => mutate({ data: { area, roleId } })}
          disabled={isPending || !roleId}
        >
          {isPending ? "Generating…" : forecast ? "Refresh" : "Generate"}
        </Button>
      </div>

      {!forecast && !isPending && (
        <p className="text-tf-grey-200 text-sm leading-relaxed">
          Generate a cited outlook of what is live, upcoming, and at risk in the next 10 days —
          scoped to your persona.
        </p>
      )}

      {isPending && (
        <div className="flex items-center space-x-3 text-tf-grey-100 py-4">
          <Sparkles className="w-5 h-5 animate-pulse text-tf-blue-lighter" />
          <span>Composing forecast from governed activity…</span>
        </div>
      )}

      {forecast && !isPending && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="text-xs text-tf-grey-200">
            {formatDay(forecast.rangeStart)} – {formatDay(forecast.rangeEnd)}
          </div>

          {forecast.status === "no_activity" ? (
            <div className="flex items-start space-x-3 bg-white/10 p-4 rounded-xl">
              <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0 text-tf-warning" />
              <p className="text-sm leading-relaxed text-tf-grey-100">{forecast.summary}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-around bg-white/10 rounded-xl py-3">
                <Stat value={forecast.highlights.liveCount} label="Live" tone="success" />
                <div className="w-px h-8 bg-white/20" />
                <Stat value={forecast.highlights.conflictCount} label="Conflicts" tone="warning" />
                <div className="w-px h-8 bg-white/20" />
                <Stat value={forecast.highlights.riskCount} label="Risks" tone="warning" />
              </div>

              <div className="text-sm leading-relaxed text-tf-grey-50 space-y-2">
                {forecast.summary.split("\n").map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {forecast.citations.length > 0 && (
                <div className="pt-2">
                  <div className="text-[10px] uppercase tracking-eyebrow font-bold text-tf-blue-lighter mb-2 flex items-center">
                    <FileText className="w-3.5 h-3.5 mr-1.5" /> Cited activity
                  </div>
                  <div className="flex overflow-x-auto pb-2 space-x-2 snap-x">
                    {forecast.citations.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => setSelected(c)}
                        className="shrink-0 snap-start bg-white/10 hover:bg-white/20 transition-colors rounded-lg p-2.5 text-left w-[220px]"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="bg-tf-blue text-white font-bold px-1.5 py-0.5 rounded text-[10px]">
                            {c.id}
                          </span>
                          <span className="text-xs font-semibold truncate">{c.docTitle}</span>
                        </div>
                        <div className="text-[10px] text-tf-grey-300 mt-1 truncate">
                          {c.sourceLoc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Drawer open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent className="max-h-[85vh]">
          <div className="mx-auto w-full max-w-2xl px-6 pb-8 pt-4 text-foreground">
            {selected && (
              <>
                <DrawerHeader className="px-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-tf-blue-tint text-tf-blue font-bold px-3 py-1 rounded text-sm">
                      Citation [{selected.id}]
                    </div>
                    <Badge
                      variant={selected.confidentiality === "public" ? "secondary" : "destructive"}
                      className="uppercase tracking-eyebrow text-[10px]"
                    >
                      {selected.confidentiality}
                    </Badge>
                  </div>
                  <DrawerTitle className="text-2xl font-bold text-tf-navy mt-2">
                    {selected.docTitle}
                  </DrawerTitle>
                  <DrawerDescription className="text-base mt-1 flex items-center space-x-2">
                    <Radio className="w-4 h-4" />
                    <span>{selected.sourceLoc}</span>
                  </DrawerDescription>
                </DrawerHeader>
                <div className="bg-muted p-6 rounded-xl border border-border">
                  <p className="text-foreground leading-relaxed font-serif text-lg">
                    "{selected.snippet}"
                  </p>
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
