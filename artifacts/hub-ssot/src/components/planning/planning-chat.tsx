import React, { useState } from "react";
import {
  usePlanningAsk,
  useListAxes,
  type Citation,
  type PlanningAskResult,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { Send, Search, AlertCircle, ShieldAlert, FileText, ArrowRight } from "lucide-react";

const PROMPTS = [
  "What is live in Spain over the next two weeks?",
  "Are there any timing conflicts I should know about?",
  "What Movistar activity is planned this summer?",
];

function EvidenceChip({ citation, onOpen }: { citation: Citation; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="flex items-start space-x-3 p-3 bg-white border border-border rounded-xl hover:shadow-sm transition-all text-left w-[280px] shrink-0"
    >
      <div className="bg-tf-blue-tint text-tf-blue font-bold px-2 py-1 rounded text-xs flex-shrink-0">
        {citation.id}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground truncate">{citation.docTitle}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">{citation.sourceLoc}</div>
        <div className="text-[10px] uppercase tracking-eyebrow text-muted-foreground mt-1.5">
          {citation.owner}
        </div>
      </div>
    </button>
  );
}

export function PlanningChat() {
  const { area, roleId } = useApp();
  const [question, setQuestion] = useState("");
  const [selected, setSelected] = useState<Citation | null>(null);
  const { data: axes } = useListAxes();
  const { mutate, isPending, data: result, reset } = usePlanningAsk();

  const ask = (text: string) => {
    if (!text.trim() || !roleId) return;
    setQuestion(text);
    reset();
    mutate({ data: { question: text, area, roleId } });
  };

  const answerAxes = axes?.filter((a) => (result as PlanningAskResult | undefined)?.axisIds?.includes(a.id)) || [];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col h-full">
      <div className="flex items-center space-x-2 mb-3">
        <Search className="w-4 h-4 text-tf-blue" />
        <h3 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
          Ask the calendar
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[120px]">
        {!result && !isPending && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Every answer is scoped to your persona and cited to governed activity.
            </p>
            {PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => ask(p)}
                className="w-full flex items-center justify-between text-left text-sm p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted transition-colors group"
              >
                <span className="font-medium text-foreground">{p}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        )}

        {isPending && (
          <div className="flex items-center space-x-3 text-tf-navy font-medium py-6">
            <Search className="w-5 h-5 animate-spin-slow text-tf-blue" />
            <span>Accessing governed calendar…</span>
          </div>
        )}

        {result && !isPending && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-muted px-4 py-2.5 rounded-2xl rounded-tr-sm inline-block max-w-[90%] font-medium text-foreground text-sm ml-auto">
              {question}
            </div>

            {result.status === "no_evidence" && (
              <div className="flex items-start space-x-3 text-tf-warning bg-tf-warning-bg p-4 rounded-xl">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-foreground">No evidence found</h4>
                  <p className="text-foreground text-sm mt-1 leading-relaxed">{result.answer}</p>
                </div>
              </div>
            )}

            {result.status === "permission_blocked" && (
              <div className="flex items-start space-x-3 text-tf-error bg-tf-error-bg p-4 rounded-xl">
                <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-foreground">Permission restricted</h4>
                  <p className="text-foreground text-sm mt-1 leading-relaxed">{result.answer}</p>
                  {result.permissionNote && (
                    <p className="text-xs mt-2 font-semibold px-3 py-2 bg-white/50 rounded-lg">
                      {result.permissionNote}
                    </p>
                  )}
                </div>
              </div>
            )}

            {result.status === "answered" && (
              <>
                <div className="text-foreground leading-relaxed space-y-2">
                  {result.answer.split("\n").map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>

                {answerAxes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {answerAxes.map((axis) => (
                      <span
                        key={axis.id}
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: axis.color || "var(--tf-blue)" }}
                      >
                        {axis.name}
                      </span>
                    ))}
                  </div>
                )}

                {result.suggestedActions && result.suggestedActions.length > 0 && (
                  <div className="bg-tf-blue-tint/60 rounded-xl p-3 space-y-1.5">
                    <div className="text-[10px] uppercase tracking-eyebrow font-bold text-tf-blue">
                      Suggested next steps
                    </div>
                    {result.suggestedActions.map((a, i) => (
                      <p key={i} className="text-sm text-tf-navy">
                        {a}
                      </p>
                    ))}
                  </div>
                )}

                {result.citations && result.citations.length > 0 && (
                  <div className="pt-3 border-t space-y-2">
                    <h4 className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground flex items-center">
                      <FileText className="w-3.5 h-3.5 mr-1.5" /> Evidence
                    </h4>
                    <div className="flex overflow-x-auto pb-2 space-x-3 snap-x">
                      {result.citations.map((c, i) => (
                        <div key={i} className="snap-start">
                          <EvidenceChip citation={c} onOpen={() => setSelected(c)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 relative">
        <Textarea
          placeholder="Ask about this calendar…"
          className="min-h-[52px] max-h-[140px] rounded-2xl resize-none pr-12 pt-3.5 text-sm border-border focus-visible:ring-tf-blue"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(question);
            }
          }}
        />
        <Button
          size="icon"
          className="absolute bottom-2.5 right-2 h-8 w-8 rounded-full bg-tf-blue hover:bg-tf-blue-hover text-white"
          onClick={() => ask(question)}
          disabled={!question.trim() || isPending || !roleId}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <Drawer open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent className="max-h-[85vh]">
          <div className="mx-auto w-full max-w-2xl px-6 pb-8 pt-4">
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
                  <DrawerDescription className="text-base mt-1">
                    {selected.sourceLoc}
                  </DrawerDescription>
                </DrawerHeader>
                <div className="bg-muted p-6 rounded-xl border border-border mt-2">
                  <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground mb-3">
                    Extracted snippet
                  </h4>
                  <p className={cn("text-foreground leading-relaxed font-serif text-lg")}>
                    "{selected.snippet}"
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
                      Owner
                    </div>
                    <div className="font-medium text-sm">{selected.owner}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
                      Confidence
                    </div>
                    <div className="font-medium text-sm">
                      {Math.round(selected.confidence * 100)}%
                    </div>
                  </div>
                  {selected.country && (
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
                        Market
                      </div>
                      <div className="font-medium text-sm">{selected.country}</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
