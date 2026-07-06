import React, { useState } from "react";
import { useAsk, useListSuggestions, useListAxes, AskResult, SuggestedQuery, Citation } from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Send, AlertCircle, ShieldAlert, Clock, Search, ExternalLink, FileText, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function EvidenceChip({ citation, onOpen }: { citation: Citation, onOpen: () => void }) {
  return (
    <button 
      onClick={onOpen}
      className="flex items-start space-x-3 p-3 bg-white border border-border rounded-xl hover:shadow-sm transition-all text-left w-full sm:w-[320px] shrink-0"
    >
      <div className="bg-tf-blue-tint text-tf-blue font-bold px-2 py-1 rounded text-xs flex-shrink-0">
        {citation.id}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground truncate">{citation.docTitle}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">{citation.sourceLoc} • v{citation.version}</div>
        <div className="flex items-center space-x-2 mt-2">
          {citation.value && (
            <span className="text-xs font-bold text-tf-success">{citation.value}</span>
          )}
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{citation.owner}</span>
        </div>
      </div>
    </button>
  );
}

export default function Ask() {
  const { area, roleId } = useApp();
  const [question, setQuestion] = useState("");
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  const { data: suggestions } = useListSuggestions();
  const { data: axes } = useListAxes();
  const { mutate: askQuery, isPending, data: result, reset } = useAsk();

  const handleAsk = (text: string) => {
    if (!text.trim() || !roleId) return;
    setQuestion(text);
    reset(); // clear previous result
    askQuery({ data: { question: text, area, roleId } });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk(question);
    }
  };

  const answerAxes = axes?.filter(a => result?.axisIds?.includes(a.id)) || [];

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-6 relative">
      {!result && !isPending && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-tf-navy">How can I help you today?</h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Ask anything about Telefónica's strategy, brand, and corporate facts. Every answer is backed by our governed knowledge core.
            </p>
          </div>

          <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions?.map((s: SuggestedQuery) => (
              <button
                key={s.id}
                onClick={() => handleAsk(s.text)}
                className="text-left p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors shadow-sm hover:shadow-md text-sm text-card-foreground group"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="secondary" className="uppercase text-[10px] tracking-widest bg-tf-blue-tint text-tf-blue">{s.kind.replace('_', ' ')}</Badge>
                </div>
                <span className="line-clamp-2 font-medium leading-relaxed">{s.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isPending && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-tf-blue-tint text-tf-blue flex items-center justify-center animate-pulse">
            <Search className="w-8 h-8 animate-spin-slow" />
          </div>
          <div className="text-tf-navy font-semibold text-lg tracking-tight">Accessing governed corpus...</div>
        </div>
      )}

      {result && !isPending && (
        <ScrollArea className="flex-1 pr-4 mb-4">
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="bg-muted p-4 px-6 rounded-2xl rounded-tr-sm inline-block max-w-[85%] self-end ml-auto float-right text-foreground font-medium text-lg shadow-sm">
              {question}
            </div>
            <div className="clear-both" />

            <div className="bg-card border border-border p-8 rounded-2xl shadow-sm max-w-[95%] space-y-8 relative">
              
              {result.status === "no_evidence" && (
                <div className="flex items-start space-x-4 text-tf-warning bg-tf-warning-bg p-6 rounded-xl">
                  <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg text-foreground">No Evidence Found</h3>
                    <p className="text-foreground mt-2 leading-relaxed">{result.answer}</p>
                  </div>
                </div>
              )}

              {result.status === "permission_blocked" && (
                <div className="flex items-start space-x-4 text-tf-error bg-tf-error-bg p-6 rounded-xl">
                  <ShieldAlert className="w-6 h-6 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg text-foreground">Permission Restricted</h3>
                    <p className="text-foreground mt-2 leading-relaxed">{result.answer}</p>
                    {result.permissionNote && (
                      <p className="text-sm mt-3 font-semibold px-3 py-2 bg-white/50 rounded-lg">{result.permissionNote}</p>
                    )}
                  </div>
                </div>
              )}

              {result.status === "answered" && (
                <>
                  {result.historic && (
                    <div className="flex items-center space-x-2 text-tf-warning bg-tf-warning-bg px-4 py-3 rounded-xl text-sm font-medium border border-tf-warning/20">
                      <Clock className="w-5 h-5 flex-shrink-0" />
                      <span>{result.historicNote || "This answer draws on historic or superseded material."}</span>
                    </div>
                  )}

                  {result.numeric && (
                    <div className="bg-tf-blue-tint text-tf-navy p-6 rounded-xl border border-tf-blue/10 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-tf-blue mb-2">{result.numeric.label}</div>
                        <div className="text-5xl font-bold tracking-tight">
                          {result.numeric.value} <span className="text-2xl text-tf-blue font-medium ml-1">{result.numeric.unit}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm font-medium space-y-1">
                        <div className="bg-white/60 px-3 py-1 rounded-full text-tf-blue">{result.numeric.period}</div>
                        <div className="text-tf-navy/60 uppercase tracking-widest text-[10px] mt-2">{result.numeric.source}</div>
                      </div>
                    </div>
                  )}

                  <div className="prose prose-blue max-w-none text-foreground text-lg leading-relaxed">
                    {result.answer.split('\n').map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>

                  {answerAxes.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {answerAxes.map(axis => (
                        <div key={axis.id} className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm" style={{ backgroundColor: axis.color || 'var(--tf-blue)' }}>
                          <span>{axis.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {result.relatedEntities && result.relatedEntities.length > 0 && (
                    <div className="pt-4 flex flex-wrap gap-3">
                      <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground py-1">Related:</span>
                      {result.relatedEntities.map(ent => (
                        <span key={ent.id} className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                          {ent.name} <span className="opacity-50 text-xs ml-1">({ent.kind})</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {result.citations && result.citations.length > 0 && (
                    <div className="pt-6 border-t space-y-4">
                      <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground flex items-center">
                        <FileText className="w-4 h-4 mr-2" /> Evidence & Citations
                      </h4>
                      <div className="flex overflow-x-auto pb-4 space-x-4 -mx-1 px-1 snap-x">
                        {result.citations.map((cit, idx) => (
                          <div key={idx} className="snap-start shrink-0">
                            <EvidenceChip citation={cit} onOpen={() => setSelectedCitation(cit)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </ScrollArea>
      )}

      <div className="mt-auto pt-4 relative bg-background">
        <Textarea
          placeholder="Ask about Telefónica..."
          className="min-h-[60px] max-h-[200px] rounded-2xl resize-none pr-14 pb-4 pt-4 shadow-sm border-border focus-visible:ring-tf-blue text-base"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button 
          size="icon" 
          className="absolute bottom-6 right-2 h-10 w-10 rounded-full bg-tf-blue hover:bg-tf-blue-hover text-white shadow-md transition-all"
          onClick={() => handleAsk(question)}
          disabled={!question.trim() || isPending || !roleId}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <Drawer open={!!selectedCitation} onOpenChange={(open) => !open && setSelectedCitation(null)}>
        <DrawerContent className="max-h-[85vh]">
          <div className="mx-auto w-full max-w-2xl px-6 pb-8 pt-4">
            {selectedCitation && (
              <>
                <DrawerHeader className="px-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-tf-blue-tint text-tf-blue font-bold px-3 py-1 rounded text-sm">
                      Citation [{selectedCitation.id}]
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={selectedCitation.validity === 'approved' ? 'default' : 'secondary'} className={cn(
                        "uppercase tracking-widest text-[10px]",
                        selectedCitation.validity === 'approved' ? "bg-tf-success text-white" : ""
                      )}>
                        {selectedCitation.validity}
                      </Badge>
                      <Badge variant={selectedCitation.confidentiality === 'public' ? 'secondary' : 'destructive'} className="uppercase tracking-widest text-[10px]">
                        {selectedCitation.confidentiality}
                      </Badge>
                    </div>
                  </div>
                  <DrawerTitle className="text-2xl font-bold text-tf-navy mt-2">{selectedCitation.docTitle}</DrawerTitle>
                  <DrawerDescription className="text-base mt-1">
                    {selectedCitation.sourceLoc}
                  </DrawerDescription>
                </DrawerHeader>

                <div className="space-y-6 mt-4">
                  <div className="bg-muted p-6 rounded-xl border border-border">
                    <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3">Extracted Snippet</h4>
                    <p className="text-foreground leading-relaxed font-serif text-lg">"{selectedCitation.snippet}"</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Version</div>
                      <div className="font-medium text-sm">{selectedCitation.version}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Owner</div>
                      <div className="font-medium text-sm">{selectedCitation.owner}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Confidence</div>
                      <div className="font-medium text-sm flex items-center space-x-2">
                        <span>{Math.round(selectedCitation.confidence * 100)}%</span>
                        {selectedCitation.confidence > 0.8 && <CheckCircle2 className="w-4 h-4 text-tf-success" />}
                      </div>
                    </div>
                    {selectedCitation.validUntil && (
                      <div className="space-y-1">
                        <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Valid Until</div>
                        <div className="font-medium text-sm">{selectedCitation.validUntil}</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
