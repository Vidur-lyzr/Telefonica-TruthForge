import React, { useMemo, useState } from "react";
import {
  useGetWikiGraph,
  useListWikiPages,
  useGetWikiPage,
  useListWikiLineage,
  useGetWikiStats,
  useListAxes,
  useSearchWiki,
  type WikiGraph,
  type WikiNode,
  type WikiPageSummary,
  type WikiLineage,
  type WikiEvidenceRef,
  type WikiRelatedPage,
} from "@workspace/api-client-react";
import { useApp } from "@/components/app-provider";
import { KnowledgeGraph } from "@/components/wiki/knowledge-graph";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lock,
  Search,
  Send,
  FileText,
  GitBranch,
  Network,
  BookOpen,
  Clock,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  X,
  ScrollText,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "map" | "pages" | "sources";

type FilterKey = "axis" | "market" | "brand" | "confidentiality" | "language";

const FILTER_DEFAULT: Record<FilterKey, string> = {
  axis: "all",
  market: "all",
  brand: "all",
  confidentiality: "all",
  language: "all",
};

const WIKI_LINK_SPLIT = /(\[\[[^\]]+\]\]|\[E\d+(?:,\s*E\d+)*\])/g;

function useAxisColors() {
  const { data: axes } = useListAxes();
  return useMemo(() => {
    const m = new Map<string, string>();
    axes?.forEach((a) => m.set(a.id, a.color || "#0066FF"));
    return m;
  }, [axes]);
}

function ConfidentialityBadge({ value }: { value: string }) {
  return (
    <Badge
      variant={value === "public" ? "secondary" : "destructive"}
      className="uppercase tracking-eyebrow text-[10px]"
    >
      {value}
    </Badge>
  );
}

function ValidityChip({ value }: { value: string }) {
  const historic = value === "historic" || value === "superseded";
  return (
    <span
      className={cn(
        "uppercase tracking-eyebrow text-[10px] font-bold px-2 py-0.5 rounded-sm",
        historic ? "bg-tf-warning-bg text-tf-warning" : "bg-tf-success-bg text-tf-success",
      )}
    >
      {value}
    </span>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col px-4 py-2 rounded-xl bg-white border border-border min-w-[120px]">
      <span className="text-2xl font-bold text-tf-navy leading-none">{value}</span>
      <span className="text-[10px] uppercase tracking-eyebrow text-muted-foreground font-bold mt-1">
        {label}
      </span>
    </div>
  );
}

function EvidenceRow({
  ev,
  onOpen,
}: {
  ev: WikiEvidenceRef;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="flex items-start space-x-3 p-3 bg-white border border-border rounded-xl hover:shadow-sm transition-all text-left w-full"
    >
      <div className="bg-tf-blue-tint text-tf-blue font-bold px-2 py-1 rounded text-xs flex-shrink-0">
        {ev.marker}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground truncate">{ev.docTitle}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">{ev.sourceLoc}</div>
        {ev.note && (
          <div className="text-xs text-tf-navy/70 mt-1 italic truncate">{ev.note}</div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <ValidityChip value={ev.validity} />
      </div>
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-8 w-auto min-w-[130px] rounded-pill text-xs font-semibold",
          value !== "all" && "border-tf-blue text-tf-blue bg-tf-blue-tint",
        )}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}s</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Renders compiled-page position text with inline, interactive [[wiki-links]] and
// [E#] evidence markers, keeping the Map and evidence drawer in sync with prose.
function PositionText({
  text,
  pageByTitle,
  evidence,
  onWiki,
  onEvidence,
}: {
  text: string;
  pageByTitle: Map<string, WikiPageSummary>;
  evidence: WikiEvidenceRef[];
  onWiki: (title: string) => void;
  onEvidence: (ev: WikiEvidenceRef) => void;
}) {
  const evByMarker = new Map(evidence.map((e) => [e.marker, e]));
  const parts = text.split(WIKI_LINK_SPLIT);
  return (
    <p className="text-foreground leading-relaxed">
      {parts.map((part, i) => {
        const wiki = /^\[\[([^\]]+)\]\]$/.exec(part);
        if (wiki) {
          const title = wiki[1].trim();
          const target = pageByTitle.get(title.toLowerCase());
          if (target) {
            return (
              <button
                key={i}
                onClick={() => onWiki(title)}
                className="font-semibold text-tf-blue underline decoration-tf-blue/30 underline-offset-2 hover:decoration-tf-blue"
              >
                {title}
              </button>
            );
          }
          return <span key={i}>{title}</span>;
        }
        const ev = /^\[(E\d+(?:,\s*E\d+)*)\]$/.exec(part);
        if (ev) {
          const markers = ev[1].split(/,\s*/);
          return (
            <span key={i} className="inline-flex gap-0.5 align-baseline">
              {markers.map((m, j) => {
                const ref = evByMarker.get(m);
                if (!ref) return null;
                return (
                  <button
                    key={j}
                    onClick={() => onEvidence(ref)}
                    className="text-[10px] font-bold text-tf-blue bg-tf-blue-tint rounded px-1 align-super hover:bg-tf-blue hover:text-white transition-colors"
                    title={ref.docTitle}
                  >
                    {m}
                  </button>
                );
              })}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

export default function Wiki() {
  const { roleId } = useApp();
  const axisColors = useAxisColors();
  const [tab, setTab] = useState<Tab>("map");

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [openPageId, setOpenPageId] = useState<string | null>(null);
  const [openLineageDoc, setOpenLineageDoc] = useState<WikiLineage | null>(null);
  const [snippet, setSnippet] = useState<WikiEvidenceRef | null>(null);

  const [question, setQuestion] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filters, setFilters] = useState<Record<FilterKey, string>>(FILTER_DEFAULT);

  const graphQuery = useGetWikiGraph(
    { roleId },
    { query: { enabled: !!roleId, queryKey: ["wiki-graph", roleId] } },
  );
  const pagesQuery = useListWikiPages(
    { roleId },
    { query: { enabled: !!roleId, queryKey: ["wiki-pages", roleId] } },
  );
  const lineageQuery = useListWikiLineage(
    { roleId },
    { query: { enabled: !!roleId, queryKey: ["wiki-lineage", roleId] } },
  );
  const { data: stats } = useGetWikiStats();
  const pageQuery = useGetWikiPage(
    { id: openPageId ?? "", roleId },
    {
      query: {
        enabled: !!openPageId && !!roleId,
        queryKey: ["wiki-page", openPageId, roleId],
      },
    },
  );
  const {
    mutate: runSearch,
    data: searchResult,
    isPending: searching,
    reset: resetSearch,
  } = useSearchWiki();

  const selectedNode = useMemo(
    () => graphQuery.data?.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [graphQuery.data, selectedNodeId],
  );

  // Distinct filter options are derived live from the permission-filtered graph,
  // so a persona only ever sees facets that exist in material it may access.
  const filterOptions = useMemo(() => {
    const nodes = graphQuery.data?.nodes ?? [];
    const distinct = (pick: (n: WikiNode) => string | null | undefined) =>
      Array.from(
        new Set(nodes.map(pick).filter((v): v is string => !!v)),
      ).sort((a, b) => a.localeCompare(b));
    return {
      axis: nodes
        .filter((n) => n.kind === "axis")
        .map((n) => ({ value: n.id, label: n.name })),
      market: distinct((n) => n.market),
      brand: distinct((n) => n.brand),
      confidentiality: distinct((n) => n.confidentiality),
      language: distinct((n) => n.language),
    };
  }, [graphQuery.data]);

  // Client-side reshape of the governed graph. Axis focus keeps only the chosen
  // axis skeleton plus its material; facet filters keep matching material plus
  // the axis skeleton so the map never loses its structural anchors.
  const filteredGraph = useMemo<WikiGraph>(() => {
    const data = graphQuery.data;
    if (!data) return { nodes: [], edges: [] };
    const pass = (n: WikiNode): boolean => {
      if (n.kind === "axis") {
        return filters.axis === "all" || n.id === filters.axis;
      }
      if (filters.axis !== "all" && n.axisId !== filters.axis) return false;
      if (filters.market !== "all" && n.market !== filters.market) return false;
      if (filters.brand !== "all" && n.brand !== filters.brand) return false;
      if (filters.language !== "all" && n.language !== filters.language) {
        return false;
      }
      if (
        filters.confidentiality !== "all" &&
        n.confidentiality !== filters.confidentiality
      ) {
        return false;
      }
      return true;
    };
    const nodes = data.nodes.filter(pass);
    const ids = new Set(nodes.map((n) => n.id));
    const edges = data.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
    return { nodes, edges };
  }, [graphQuery.data, filters]);

  const activeFilterCount = useMemo(
    () =>
      (Object.keys(FILTER_DEFAULT) as FilterKey[]).filter(
        (k) => filters[k] !== "all",
      ).length,
    [filters],
  );

  const pageByTitle = useMemo(() => {
    const m = new Map<string, WikiPageSummary>();
    pagesQuery.data?.forEach((p) => {
      if (!p.locked) m.set(p.title.toLowerCase(), p);
    });
    return m;
  }, [pagesQuery.data]);

  // Nodes lit up on the Map by the current focus: the selected node, the open
  // page's related pages, and any wiki-links surfaced by the compiled-layer Ask.
  const highlightIds = useMemo(() => {
    const s = new Set<string>();
    if (selectedNodeId) s.add(selectedNodeId);
    pageQuery.data?.page?.relatedPages.forEach((r) => {
      if (!r.locked) s.add(r.nodeId);
    });
    if (searchResult?.status === "answered") {
      searchResult.wikiLinks.forEach((w) => {
        if (!w.locked) s.add(w.nodeId);
      });
    }
    return s;
  }, [selectedNodeId, pageQuery.data, searchResult]);

  const setFilter = (key: FilterKey, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const clearFilters = () => setFilters(FILTER_DEFAULT);

  // Bidirectional link: opening a page always selects its Map node so the graph,
  // Pages list and page drawer stay in sync regardless of entry point.
  const openPage = (id: string, nodeId?: string | null) => {
    setOpenPageId(id);
    if (nodeId) setSelectedNodeId(nodeId);
  };

  const handleNodeSelect = (node: WikiNode) => {
    setSelectedNodeId(node.id);
    // Clicking an axis focuses the Map on that axis's neighbourhood.
    if (node.kind === "axis") {
      setFilter("axis", filters.axis === node.id ? "all" : node.id);
      return;
    }
    if (node.pageId) {
      setOpenPageId(node.pageId);
    }
  };

  const openPageFromRelated = (rel: WikiRelatedPage) => {
    if (rel.locked) return;
    openPage(rel.id, rel.nodeId);
  };

  // Resolve an inline [[Title]] wiki-link from compiled page text to a Map node.
  const openWikiLink = (title: string) => {
    const page = pageByTitle.get(title.trim().toLowerCase());
    if (page) openPage(page.id, page.nodeId);
  };

  const handleAsk = () => {
    if (!question.trim() || !roleId) return;
    resetSearch();
    setSearchOpen(true);
    runSearch({ data: { question, roleId } });
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "map", label: "Map", icon: Network },
    { id: "pages", label: "Pages", icon: BookOpen },
    { id: "sources", label: "Sources", icon: GitBranch },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-6 pb-4 border-b border-border bg-white">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-title-lg text-tf-navy">Knowledge Wiki</h1>
            <p className="text-muted-foreground mt-1 max-w-xl">
              The compiled corporate memory. Every page, figure and claim is
              traced to governed sources and filtered to your clearance.
            </p>
          </div>
          {stats && (
            <div className="flex items-center gap-3">
              <StatTile value={stats.factsResolved} label="Facts resolved" />
              <StatTile value={stats.conflictsSettled} label="Conflicts settled" />
              <StatTile value={stats.pagesRefined} label="Pages refined" />
              <span className="text-[10px] uppercase tracking-eyebrow text-muted-foreground font-bold self-end pb-2">
                {stats.windowLabel}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 mt-5">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-semibold transition-colors",
                  active
                    ? "bg-tf-blue text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "map" && (
          <div className="flex h-full">
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Filter bar */}
              <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-border bg-white">
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground mr-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
                </span>
                <FilterSelect
                  label="Axis"
                  value={filters.axis}
                  onChange={(v) => setFilter("axis", v)}
                  options={filterOptions.axis}
                />
                <FilterSelect
                  label="Market"
                  value={filters.market}
                  onChange={(v) => setFilter("market", v)}
                  options={filterOptions.market.map((v) => ({ value: v, label: v }))}
                />
                <FilterSelect
                  label="Brand"
                  value={filters.brand}
                  onChange={(v) => setFilter("brand", v)}
                  options={filterOptions.brand.map((v) => ({ value: v, label: v }))}
                />
                <FilterSelect
                  label="Clearance"
                  value={filters.confidentiality}
                  onChange={(v) => setFilter("confidentiality", v)}
                  options={filterOptions.confidentiality.map((v) => ({
                    value: v,
                    label: v.charAt(0).toUpperCase() + v.slice(1),
                  }))}
                />
                <FilterSelect
                  label="Language"
                  value={filters.language}
                  onChange={(v) => setFilter("language", v)}
                  options={filterOptions.language.map((v) => ({
                    value: v,
                    label: v.toUpperCase(),
                  }))}
                />
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs font-semibold text-tf-blue hover:text-tf-blue-hover ml-1"
                  >
                    <X className="w-3.5 h-3.5" /> Clear ({activeFilterCount})
                  </button>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {filteredGraph.nodes.length} nodes
                </span>
              </div>
              <div className="flex-1 min-w-0 relative bg-tf-blue-tint/20">
              {graphQuery.data && (
                <KnowledgeGraph
                  graph={filteredGraph}
                  axisColors={axisColors}
                  selectedId={selectedNodeId}
                  highlightIds={highlightIds}
                  onSelect={handleNodeSelect}
                />
              )}
              {filteredGraph.nodes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <Network className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm max-w-xs">
                    No governed material matches these filters. Clear a filter to
                    widen the view.
                  </p>
                </div>
              )}
              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-border rounded-xl p-3 text-xs space-y-1.5 shadow-sm">
                <div className="font-bold uppercase tracking-eyebrow text-[10px] text-muted-foreground mb-1">
                  Legend
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-tf-blue inline-block" /> Axis / page
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#00C1B5] inline-block" /> Figure / entity
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
                  <Lock className="w-3 h-3" /> Restricted
                </div>
                <div className="flex items-center gap-2">
                  <svg width="24" height="6">
                    <line x1="0" y1="3" x2="24" y2="3" stroke="#0066FF" strokeWidth="2" />
                  </svg>
                  Citation
                </div>
                <div className="flex items-center gap-2">
                  <svg width="24" height="6">
                    <line
                      x1="0"
                      y1="3"
                      x2="24"
                      y2="3"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  </svg>
                  Relationship
                </div>
              </div>
              </div>
            </div>

            {/* Info panel */}
            <div className="w-80 flex-shrink-0 border-l border-border bg-white overflow-y-auto">
              {selectedNode ? (
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
                      {selectedNode.kind.replace("_", " ")}
                    </span>
                    <button
                      onClick={() => setSelectedNodeId(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-tf-navy flex items-center gap-2">
                    {selectedNode.locked && <Lock className="w-4 h-4 text-slate-400" />}
                    {selectedNode.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedNode.confidentiality && (
                      <ConfidentialityBadge value={selectedNode.confidentiality} />
                    )}
                    {selectedNode.validity && <ValidityChip value={selectedNode.validity} />}
                  </div>

                  {selectedNode.figure && (
                    <div className="bg-tf-blue-tint text-tf-navy p-4 rounded-xl">
                      <div className="text-display-sm">
                        {selectedNode.figure.value}
                        <span className="text-lg text-tf-blue font-medium ml-1">
                          {selectedNode.figure.unit}
                        </span>
                      </div>
                      <div className="text-xs text-tf-navy/60 uppercase tracking-eyebrow mt-1">
                        {selectedNode.figure.period}
                      </div>
                    </div>
                  )}

                  {selectedNode.figure &&
                    selectedNode.figure.sources.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-eyebrow font-bold text-muted-foreground">
                          Agreeing sources
                        </div>
                        {selectedNode.figure.sources.map((s) => (
                          <button
                            key={s.docId}
                            disabled={s.locked}
                            onClick={() => {
                              const doc = lineageQuery.data?.find(
                                (l) => l.docId === s.docId,
                              );
                              if (doc) {
                                setTab("sources");
                                setOpenLineageDoc(doc);
                                setSelectedNodeId(`doc-node:${s.docId}`);
                              }
                            }}
                            className={cn(
                              "w-full text-left flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-card",
                              s.locked
                                ? "opacity-70 cursor-not-allowed"
                                : "hover:border-tf-blue/40 hover:shadow-sm",
                            )}
                          >
                            <span className="flex items-center gap-1.5 text-sm text-tf-navy min-w-0">
                              {s.locked ? (
                                <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-tf-blue flex-shrink-0" />
                              )}
                              <span className="truncate">
                                {s.locked ? "Restricted source" : s.docTitle}
                              </span>
                            </span>
                            <span className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                <span
                                  className="block h-full bg-tf-blue"
                                  style={{ width: `${Math.round(s.confidence * 100)}%` }}
                                />
                              </span>
                              <span className="text-[10px] font-bold text-tf-blue tabular-nums">
                                {Math.round(s.confidence * 100)}%
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                  {selectedNode.locked && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      This node is above your clearance. Only its existence is
                      shown.
                    </div>
                  )}

                  {selectedNode.pageId && !selectedNode.locked && (
                    <Button
                      className="w-full rounded-pill bg-tf-blue hover:bg-tf-blue-hover"
                      onClick={() => setOpenPageId(selectedNode.pageId ?? null)}
                    >
                      Open compiled page <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  {selectedNode.docId && !selectedNode.locked && (
                    <Button
                      variant="outline"
                      className="w-full rounded-pill"
                      onClick={() => {
                        const doc = lineageQuery.data?.find(
                          (l) => l.docId === selectedNode.docId,
                        );
                        if (doc) {
                          setTab("sources");
                          setOpenLineageDoc(doc);
                        }
                      }}
                    >
                      Inspect source <GitBranch className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-6 h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                  <Network className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">
                    Select any node to inspect its governance, figures and links.
                    Drag nodes to explore the web of corporate memory.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "pages" && (
          <ScrollArea className="h-full">
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 max-w-7xl">
              {pagesQuery.data?.map((p: WikiPageSummary) => (
                <button
                  key={p.id}
                  disabled={p.locked}
                  onClick={() => !p.locked && openPage(p.id, p.nodeId)}
                  className={cn(
                    "text-left p-5 rounded-2xl border bg-card shadow-sm transition-all relative overflow-hidden",
                    p.locked
                      ? "opacity-70 cursor-not-allowed border-dashed"
                      : "hover:shadow-md hover:border-tf-blue/30",
                  )}
                >
                  <div
                    className="absolute top-0 left-0 w-full h-1"
                    style={{ backgroundColor: axisColors.get(p.axisId) || "#0066FF" }}
                  />
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-tf-navy text-lg leading-tight flex items-center gap-2">
                      {p.locked && <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                      {p.title}
                    </h3>
                    {p.refined && !p.locked && (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-eyebrow font-bold text-tf-blue bg-tf-blue-tint px-2 py-0.5 rounded-full flex-shrink-0">
                        <Sparkles className="w-3 h-3" /> Refined
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 min-h-[60px]">
                    {p.summary}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <ConfidentialityBadge value={p.confidentiality} />
                      <ValidityChip value={p.validity} />
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {p.sourceCount}
                    </span>
                  </div>
                  {!p.locked && p.lastRefinedBy && (
                    <div className="text-[10px] text-muted-foreground mt-2 uppercase tracking-eyebrow">
                      {p.lastRefinedBy} • {p.lastRefinedAt}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {tab === "sources" && (
          <ScrollArea className="h-full">
            <div className="p-8 space-y-2 max-w-5xl">
              {lineageQuery.data?.map((l) => (
                <button
                  key={l.docId}
                  disabled={l.locked}
                  onClick={() => {
                    if (l.locked) return;
                    setOpenLineageDoc(l);
                    setSelectedNodeId(`doc-node:${l.docId}`);
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border bg-card text-left transition-all",
                    l.locked
                      ? "opacity-70 cursor-not-allowed border-dashed"
                      : "hover:shadow-sm hover:border-tf-blue/30",
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-tf-blue-tint text-tf-blue flex items-center justify-center flex-shrink-0">
                    {l.locked ? <Lock className="w-5 h-5" /> : <ScrollText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-tf-navy truncate">{l.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {l.locked
                        ? "Restricted — above your clearance"
                        : `${l.sourceFile ?? ""} • ${l.chunkCount ?? 0} chunks • ${l.owner}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ConfidentialityBadge value={l.confidentiality} />
                    <ValidityChip value={l.validity} />
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Persistent compiled-layer Ask bar */}
      <div className="border-t border-border bg-white px-8 py-4">
        <div className="max-w-4xl mx-auto relative">
          <Textarea
            placeholder="Ask the compiled memory — answers cite compiled pages and their sources..."
            className="min-h-[52px] max-h-[160px] rounded-2xl resize-none pr-14 py-3.5 shadow-sm border-border focus-visible:ring-tf-blue"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
          />
          <Button
            size="icon"
            className="absolute bottom-2.5 right-2 h-9 w-9 rounded-full bg-tf-blue hover:bg-tf-blue-hover text-white shadow-md"
            onClick={handleAsk}
            disabled={!question.trim() || searching || !roleId}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search results drawer */}
      <Drawer open={searchOpen} onOpenChange={setSearchOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="mx-auto w-full max-w-3xl px-6 pb-10 pt-2 overflow-y-auto">
            <DrawerHeader className="px-0">
              <DrawerTitle className="text-tf-navy flex items-center gap-2">
                <Search className="w-5 h-5 text-tf-blue" /> Compiled memory
              </DrawerTitle>
              <DrawerDescription>{question}</DrawerDescription>
            </DrawerHeader>

            {searching && (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="w-12 h-12 rounded-full bg-tf-blue-tint text-tf-blue flex items-center justify-center animate-pulse">
                  <Search className="w-6 h-6" />
                </div>
                <span className="text-tf-navy font-semibold">Searching compiled pages...</span>
              </div>
            )}

            {searchResult && !searching && (
              <div className="space-y-6">
                {searchResult.status === "no_evidence" && (
                  <div className="flex items-start gap-3 text-tf-warning bg-tf-warning-bg p-5 rounded-xl">
                    <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-foreground">No Evidence Found</h3>
                      <p className="text-foreground mt-1">{searchResult.answer}</p>
                    </div>
                  </div>
                )}

                {searchResult.status === "permission_blocked" && (
                  <div className="flex items-start gap-3 text-tf-error bg-tf-error-bg p-5 rounded-xl">
                    <ShieldAlert className="w-6 h-6 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-foreground">Permission Restricted</h3>
                      <p className="text-foreground mt-1">{searchResult.answer}</p>
                      {searchResult.permissionNote && (
                        <p className="text-sm mt-2 font-semibold px-3 py-2 bg-white/60 rounded-lg">
                          {searchResult.permissionNote}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {searchResult.status === "answered" && (
                  <>
                    {searchResult.historic && (
                      <div className="flex items-center gap-2 text-tf-warning bg-tf-warning-bg px-4 py-3 rounded-xl text-sm font-medium">
                        <Clock className="w-5 h-5 flex-shrink-0" />
                        This answer draws on historic or superseded material.
                      </div>
                    )}
                    <div className="prose max-w-none text-foreground text-lg leading-relaxed">
                      {searchResult.answer.split("\n").map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>

                    {searchResult.wikiLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground py-1">
                          Pages:
                        </span>
                        {searchResult.wikiLinks.map((w) => (
                          <button
                            key={w.id}
                            disabled={w.locked}
                            onClick={() => {
                              if (w.locked) return;
                              setSearchOpen(false);
                              openPage(w.id, w.nodeId);
                            }}
                            className={cn(
                              "text-sm font-medium px-3 py-1 rounded-full border",
                              w.locked
                                ? "text-muted-foreground border-dashed cursor-not-allowed"
                                : "text-tf-blue border-tf-blue/30 bg-tf-blue-tint hover:bg-tf-blue hover:text-white transition-colors",
                            )}
                          >
                            {w.locked && <Lock className="w-3 h-3 inline mr-1" />}
                            {w.title}
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResult.evidence.length > 0 && (
                      <div className="pt-4 border-t space-y-3">
                        <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground flex items-center">
                          <FileText className="w-4 h-4 mr-2" /> Evidence
                        </h4>
                        {searchResult.evidence.map((ev, i) => (
                          <EvidenceRow key={i} ev={ev} onOpen={() => setSnippet(ev)} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Page detail drawer */}
      <Drawer open={!!openPageId} onOpenChange={(o) => !o && setOpenPageId(null)}>
        <DrawerContent className="max-h-[90vh]">
          <div className="mx-auto w-full max-w-3xl px-6 pb-10 pt-2 overflow-y-auto">
            {pageQuery.isLoading && (
              <div className="py-16 text-center text-muted-foreground">Loading page...</div>
            )}
            {pageQuery.data?.locked && (
              <div className="flex items-start gap-3 text-tf-error bg-tf-error-bg p-6 rounded-xl my-6">
                <Lock className="w-6 h-6 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-foreground text-lg">Restricted page</h3>
                  <p className="text-foreground mt-1">
                    This compiled page requires{" "}
                    <span className="font-bold uppercase">
                      {pageQuery.data.requiredClearance}
                    </span>{" "}
                    clearance.
                  </p>
                </div>
              </div>
            )}
            {pageQuery.data?.page && (
              <div className="space-y-7">
                <DrawerHeader className="px-0">
                  <div className="flex items-center gap-2 mb-2">
                    <ConfidentialityBadge value={pageQuery.data.page.confidentiality} />
                    <ValidityChip value={pageQuery.data.page.validity} />
                    {pageQuery.data.page.refined && (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-eyebrow font-bold text-tf-blue bg-tf-blue-tint px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3" /> Refined
                      </span>
                    )}
                  </div>
                  <DrawerTitle className="text-2xl font-bold text-tf-navy">
                    {pageQuery.data.page.title}
                  </DrawerTitle>
                  <DrawerDescription className="text-base">
                    {pageQuery.data.page.summary}
                  </DrawerDescription>
                </DrawerHeader>

                <div className="bg-tf-blue-tint/40 border border-tf-blue/10 p-5 rounded-xl">
                  <h4 className="text-xs uppercase tracking-eyebrow font-bold text-tf-blue mb-2">
                    Position
                  </h4>
                  <PositionText
                    text={pageQuery.data.page.position}
                    pageByTitle={pageByTitle}
                    evidence={pageQuery.data.page.evidence}
                    onWiki={openWikiLink}
                    onEvidence={setSnippet}
                  />
                </div>

                {pageQuery.data.page.resolvedFacts.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
                      Resolved facts
                    </h4>
                    {pageQuery.data.page.resolvedFacts.map((f) => (
                      <div key={f.id} className="bg-white border border-border rounded-xl p-4">
                        <div className="font-semibold text-tf-navy">{f.claim}</div>
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <span className="font-bold text-tf-success flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> {f.resolvedValue}
                          </span>
                          <span className="text-muted-foreground line-through">
                            {f.supersededValue}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{f.resolution}</p>
                        <div className="text-[10px] uppercase tracking-eyebrow text-muted-foreground mt-2">
                          Current: {f.currentDocTitle} • Historic: {f.historicDocTitle}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {pageQuery.data.page.evidence.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground flex items-center">
                      <FileText className="w-4 h-4 mr-2" /> Evidence
                    </h4>
                    {pageQuery.data.page.evidence.map((ev, i) => (
                      <EvidenceRow key={i} ev={ev} onOpen={() => setSnippet(ev)} />
                    ))}
                  </div>
                )}

                {pageQuery.data.page.openItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
                      Open items & watch list
                    </h4>
                    {pageQuery.data.page.openItems.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-start gap-3 bg-muted p-3 rounded-lg text-sm"
                      >
                        <span
                          className={cn(
                            "uppercase tracking-eyebrow text-[9px] font-bold px-2 py-0.5 rounded-sm mt-0.5",
                            o.kind === "open"
                              ? "bg-tf-warning-bg text-tf-warning"
                              : "bg-tf-blue-tint text-tf-blue",
                          )}
                        >
                          {o.kind}
                        </span>
                        <div>
                          <div className="text-foreground">{o.text}</div>
                          <div className="text-[10px] uppercase tracking-eyebrow text-muted-foreground mt-0.5">
                            {o.owner}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {pageQuery.data.page.relatedPages.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
                      Related pages
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {pageQuery.data.page.relatedPages.map((rel) => (
                        <button
                          key={rel.id}
                          disabled={rel.locked}
                          onClick={() => openPageFromRelated(rel)}
                          className={cn(
                            "text-sm font-medium px-3 py-1.5 rounded-full border",
                            rel.locked
                              ? "text-muted-foreground border-dashed cursor-not-allowed"
                              : "text-tf-blue border-tf-blue/30 hover:bg-tf-blue-tint transition-colors",
                          )}
                        >
                          {rel.locked && <Lock className="w-3 h-3 inline mr-1" />}
                          {rel.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {pageQuery.data.page.changeLog.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
                      Change log
                    </h4>
                    <div className="space-y-2">
                      {pageQuery.data.page.changeLog.map((c) => (
                        <div key={c.id} className="flex items-start gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-tf-blue mt-1.5 flex-shrink-0" />
                          <div>
                            <span className="text-foreground">{c.summary}</span>
                            <span className="text-[10px] uppercase tracking-eyebrow text-muted-foreground ml-2">
                              {c.by} • {c.at}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Lineage detail drawer */}
      <Drawer open={!!openLineageDoc} onOpenChange={(o) => !o && setOpenLineageDoc(null)}>
        <DrawerContent className="max-h-[88vh]">
          <div className="mx-auto w-full max-w-3xl px-6 pb-10 pt-2 overflow-y-auto">
            {openLineageDoc && (
              <>
                <DrawerHeader className="px-0">
                  <div className="flex items-center gap-2 mb-2">
                    <ConfidentialityBadge value={openLineageDoc.confidentiality} />
                    <ValidityChip value={openLineageDoc.validity} />
                  </div>
                  <DrawerTitle className="text-2xl font-bold text-tf-navy">
                    {openLineageDoc.title}
                  </DrawerTitle>
                  <DrawerDescription>
                    {openLineageDoc.sourceFile} • {openLineageDoc.taxonomyVersion} •{" "}
                    {openLineageDoc.chunkCount} chunks
                  </DrawerDescription>
                </DrawerHeader>

                {openLineageDoc.ingestion && openLineageDoc.ingestion.length > 0 && (
                  <div className="space-y-3 mt-2">
                    <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
                      Ingestion lineage
                    </h4>
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-border">
                      {openLineageDoc.ingestion.map((s, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-tf-blue border-2 border-white" />
                          <div className="font-semibold text-tf-navy text-sm">{s.stage}</div>
                          <div className="text-sm text-muted-foreground">{s.detail}</div>
                          <div className="text-[10px] uppercase tracking-eyebrow text-muted-foreground mt-0.5">
                            {s.actor} • {s.at}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {openLineageDoc.validation && openLineageDoc.validation.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground">
                      Human validation
                    </h4>
                    {openLineageDoc.validation.map((v, i) => (
                      <div key={i} className="bg-white border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-tf-navy text-sm">{v.field}</span>
                          <span
                            className={cn(
                              "uppercase tracking-eyebrow text-[9px] font-bold px-2 py-0.5 rounded-sm",
                              v.status === "accepted"
                                ? "bg-tf-success-bg text-tf-success"
                                : "bg-tf-warning-bg text-tf-warning",
                            )}
                          >
                            {v.status}
                          </span>
                        </div>
                        <div className="text-sm mt-2 flex items-center gap-3">
                          {v.status === "corrected" && (
                            <span className="text-muted-foreground line-through">
                              {v.proposed}
                            </span>
                          )}
                          <span className="font-bold text-tf-navy">{v.approved}</span>
                        </div>
                        <div className="text-[10px] uppercase tracking-eyebrow text-muted-foreground mt-2">
                          {v.by} • {v.at}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Snippet drawer */}
      <Drawer open={!!snippet} onOpenChange={(o) => !o && setSnippet(null)}>
        <DrawerContent className="max-h-[70vh]">
          <div className="mx-auto w-full max-w-2xl px-6 pb-10 pt-4">
            {snippet && (
              <>
                <DrawerHeader className="px-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-tf-blue-tint text-tf-blue font-bold px-3 py-1 rounded text-sm">
                      {snippet.marker}
                    </div>
                    <div className="flex items-center gap-2">
                      <ValidityChip value={snippet.validity} />
                      <ConfidentialityBadge value={snippet.confidentiality} />
                    </div>
                  </div>
                  <DrawerTitle className="text-2xl font-bold text-tf-navy mt-2">
                    {snippet.docTitle}
                  </DrawerTitle>
                  <DrawerDescription>{snippet.sourceLoc}</DrawerDescription>
                </DrawerHeader>
                <div className="bg-muted p-6 rounded-xl border border-border mt-2">
                  <h4 className="text-xs uppercase tracking-eyebrow font-bold text-muted-foreground mb-3">
                    Extracted snippet
                  </h4>
                  <p className="text-foreground leading-relaxed font-serif text-lg">
                    "{snippet.snippet}"
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
