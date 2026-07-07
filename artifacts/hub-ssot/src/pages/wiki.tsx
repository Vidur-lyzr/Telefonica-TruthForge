import React, { useMemo } from "react";
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
import {
  Box,
  Stack,
  Inline,
  Grid,
  Boxed,
  Divider,
  Circle,
  Touchable,
  Tabs,
  Tag,
  Drawer,
  Select,
  ButtonPrimary,
  ButtonSecondary,
  ButtonLink,
  IconButton,
  TextField,
  Text1,
  Text2,
  Text3,
  Text5,
  Text6,
  Title2,
  Title3,
  skinVars,
  applyAlpha,
  IconShareRegular,
  IconBookRegular,
  IconDocumentsRegular,
  IconLockClosedRegular,
  IconSearchRegular,
  IconSendRegular,
  IconFileTextRegular,
  IconWaitClockRegular,
  IconShieldRegular,
  IconAlertRegular,
  IconCheckedRegular,
  IconStarRegular,
  IconArrowRightRegular,
  IconCloseRegular,
  IconArrowUpDownRegular,
} from "@telefonica/mistica";

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

const BLUE = skinVars.colors.brand;
const NAVY = skinVars.colors.textPrimary;
const MUTED = skinVars.colors.textSecondary;
const BORDER = skinVars.colors.border;
const SURFACE = skinVars.colors.backgroundContainer;
const ALT = skinVars.colors.backgroundAlternative;
const BLUE_TINT = applyAlpha(skinVars.rawColors.brand, 0.1);
const RADIUS = skinVars.borderRadii.container;

function useAxisColors() {
  const { data: axes } = useListAxes();
  return useMemo(() => {
    const m = new Map<string, string>();
    axes?.forEach((a) => m.set(a.id, a.color || BLUE));
    return m;
  }, [axes]);
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Text1 medium transform="uppercase" color={MUTED}>
      {children}
    </Text1>
  );
}

function ConfidentialityBadge({ value }: { value: string }) {
  return <Tag type={value === "public" ? "success" : "error"}>{value.toUpperCase()}</Tag>;
}

function ValidityChip({ value }: { value: string }) {
  const historic = value === "historic" || value === "superseded";
  return <Tag type={historic ? "warning" : "success"}>{value.toUpperCase()}</Tag>;
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <Boxed>
      <Box paddingX={16} paddingY={12}>
        <Stack space={2}>
          <Text6>{String(value)}</Text6>
          <Eyebrow>{label}</Eyebrow>
        </Stack>
      </Box>
    </Boxed>
  );
}

function EvidenceRow({ ev, onOpen }: { ev: WikiEvidenceRef; onOpen: () => void }) {
  return (
    <Touchable
      onPress={onOpen}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: 12,
        width: "100%",
        textAlign: "left",
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: RADIUS,
      }}
    >
      <div
        style={{
          background: BLUE_TINT,
          color: BLUE,
          padding: "4px 8px",
          borderRadius: skinVars.borderRadii.chip,
          flexShrink: 0,
        }}
      >
        <Text1 medium color={BLUE}>
          {ev.marker}
        </Text1>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Stack space={2}>
          <Text2 medium color={NAVY} truncate>
            {ev.docTitle}
          </Text2>
          <Text1 regular color={MUTED} truncate>
            {ev.sourceLoc}
          </Text1>
          {ev.note && (
            <Text1 regular color={MUTED} truncate>
              {ev.note}
            </Text1>
          )}
        </Stack>
      </div>
      <div style={{ flexShrink: 0 }}>
        <ValidityChip value={ev.validity} />
      </div>
    </Touchable>
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
    <div style={{ width: 150, flexShrink: 0 }}>
      <Select
        name={`filter-${label}`}
        label={label}
        value={value}
        onChangeValue={onChange}
        options={[
          { value: "all", text: `All ${label.toLowerCase() === "axis" ? "axes" : `${label.toLowerCase()}s`}` },
          ...options.map((o) => ({ value: o.value, text: o.label })),
        ]}
      />
    </div>
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
    <Text3 regular color={NAVY}>
      {parts.map((part, i) => {
        const wiki = /^\[\[([^\]]+)\]\]$/.exec(part);
        if (wiki) {
          const title = wiki[1].trim();
          const target = pageByTitle.get(title.toLowerCase());
          if (target) {
            return (
              <Touchable
                key={i}
                onPress={() => onWiki(title)}
                style={{
                  display: "inline",
                  color: BLUE,
                  textDecoration: "underline",
                }}
              >
                <Text3 medium color={BLUE}>
                  {title}
                </Text3>
              </Touchable>
            );
          }
          return <span key={i}>{title}</span>;
        }
        const ev = /^\[(E\d+(?:,\s*E\d+)*)\]$/.exec(part);
        if (ev) {
          const markers = ev[1].split(/,\s*/);
          return (
            <span key={i} style={{ display: "inline-flex", gap: 2, verticalAlign: "baseline" }}>
              {markers.map((m, j) => {
                const ref = evByMarker.get(m);
                if (!ref) return null;
                return (
                  <Touchable
                    key={j}
                    onPress={() => onEvidence(ref)}
                    aria-label={ref.docTitle}
                    style={{
                      display: "inline-flex",
                      background: BLUE_TINT,
                      borderRadius: skinVars.borderRadii.chip,
                      padding: "0 4px",
                      verticalAlign: "super",
                    }}
                  >
                    <Text1 medium color={BLUE}>
                      {m}
                    </Text1>
                  </Touchable>
                );
              })}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </Text3>
  );
}

export default function Wiki() {
  const { roleId } = useApp();
  const axisColors = useAxisColors();
  const [tab, setTab] = React.useState<Tab>("map");

  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [openPageId, setOpenPageId] = React.useState<string | null>(null);
  const [openLineageDoc, setOpenLineageDoc] = React.useState<WikiLineage | null>(null);
  const [snippet, setSnippet] = React.useState<WikiEvidenceRef | null>(null);

  const [question, setQuestion] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<Record<FilterKey, string>>(FILTER_DEFAULT);

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

  const tabs = [
    { id: "map" as Tab, label: "Map", Icon: IconShareRegular },
    { id: "pages" as Tab, label: "Pages", Icon: IconBookRegular },
    { id: "sources" as Tab, label: "Sources", Icon: IconDocumentsRegular },
  ];
  const tabIndex = tabs.findIndex((t) => t.id === tab);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          padding: "24px 32px 16px",
          borderBottom: `1px solid ${BORDER}`,
          background: SURFACE,
        }}
      >
        <Inline space={24} alignItems="flex-start" wrap>
          <div style={{ flex: 1, minWidth: 280 }}>
            <Stack space={4}>
              <Title2 as="h1">Knowledge Wiki</Title2>
              <Text2 regular color={MUTED}>
                The compiled corporate memory. Every page, figure and claim is
                traced to governed sources and filtered to your clearance.
              </Text2>
            </Stack>
          </div>
          {stats && (
            <Inline space={12} alignItems="center">
              <StatTile value={stats.factsResolved} label="Facts resolved" />
              <StatTile value={stats.conflictsSettled} label="Conflicts settled" />
              <StatTile value={stats.pagesRefined} label="Pages refined" />
              <Eyebrow>{stats.windowLabel}</Eyebrow>
            </Inline>
          )}
        </Inline>

        <Box paddingTop={16}>
          <Tabs
            selectedIndex={tabIndex}
            onChange={(i) => setTab(tabs[i].id)}
            tabs={tabs.map((t) => ({ text: t.label, Icon: t.Icon }))}
          />
        </Box>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {tab === "map" && (
          <div style={{ display: "flex", height: "100%" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              {/* Filter bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  padding: "12px 16px",
                  borderBottom: `1px solid ${BORDER}`,
                  background: SURFACE,
                }}
              >
                <Inline space={4} alignItems="center">
                  <IconArrowUpDownRegular size={14} color={MUTED} />
                  <Eyebrow>Filter</Eyebrow>
                </Inline>
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
                  <ButtonLink onPress={clearFilters}>
                    {`Clear (${activeFilterCount})`}
                  </ButtonLink>
                )}
                <div style={{ marginLeft: "auto" }}>
                  <Text2 regular color={MUTED}>
                    {`${filteredGraph.nodes.length} nodes`}
                  </Text2>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  position: "relative",
                  background: applyAlpha(skinVars.rawColors.brand, 0.04),
                }}
              >
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
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                    }}
                  >
                    <Stack space={12}>
                      <Inline space={0} alignItems="center">
                        <div style={{ margin: "0 auto" }}>
                          <IconShareRegular size={40} color={MUTED} />
                        </div>
                      </Inline>
                      <Text2 regular color={MUTED}>
                        No governed material matches these filters. Clear a filter to
                        widen the view.
                      </Text2>
                    </Stack>
                  </div>
                )}
                {/* Legend */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 16,
                    left: 16,
                    background: applyAlpha(skinVars.rawColors.backgroundContainer, 0.9),
                    border: `1px solid ${BORDER}`,
                    borderRadius: RADIUS,
                    padding: 12,
                  }}
                >
                  <Stack space={4}>
                    <Eyebrow>Legend</Eyebrow>
                    <Inline space={8} alignItems="center">
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: skinVars.borderRadii.avatar,
                          background: BLUE,
                          display: "inline-block",
                        }}
                      />
                      <Text1 regular color={NAVY}>
                        Axis / page
                      </Text1>
                    </Inline>
                    <Inline space={8} alignItems="center">
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: skinVars.borderRadii.avatar,
                          background: skinVars.colors.brandHigh,
                          display: "inline-block",
                        }}
                      />
                      <Text1 regular color={NAVY}>
                        Figure / entity
                      </Text1>
                    </Inline>
                    <Inline space={8} alignItems="center">
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: skinVars.borderRadii.avatar,
                          background: skinVars.colors.neutralMedium,
                          display: "inline-block",
                        }}
                      />
                      <IconLockClosedRegular size={12} color={NAVY} />
                      <Text1 regular color={NAVY}>
                        Restricted
                      </Text1>
                    </Inline>
                    <Inline space={8} alignItems="center">
                      <svg width="24" height="6">
                        <line x1="0" y1="3" x2="24" y2="3" stroke={BLUE} strokeWidth="2" />
                      </svg>
                      <Text1 regular color={NAVY}>
                        Citation
                      </Text1>
                    </Inline>
                    <Inline space={8} alignItems="center">
                      <svg width="24" height="6">
                        <line
                          x1="0"
                          y1="3"
                          x2="24"
                          y2="3"
                          stroke={skinVars.colors.neutralMedium}
                          strokeWidth="2"
                          strokeDasharray="4 3"
                        />
                      </svg>
                      <Text1 regular color={NAVY}>
                        Relationship
                      </Text1>
                    </Inline>
                  </Stack>
                </div>
              </div>
            </div>

            {/* Info panel */}
            <div
              style={{
                width: 320,
                flexShrink: 0,
                borderLeft: `1px solid ${BORDER}`,
                background: SURFACE,
                overflowY: "auto",
              }}
            >
              {selectedNode ? (
                <Box padding={24}>
                  <Stack space={16}>
                    <Inline space={0} alignItems="center">
                      <div style={{ flex: 1 }}>
                        <Eyebrow>{selectedNode.kind.replace("_", " ")}</Eyebrow>
                      </div>
                      <IconButton
                        aria-label="Close"
                        onPress={() => setSelectedNodeId(null)}
                        Icon={IconCloseRegular}
                      />
                    </Inline>
                    <Inline space={8} alignItems="center">
                      {selectedNode.locked && (
                        <IconLockClosedRegular size={16} color={MUTED} />
                      )}
                      <Title3>{selectedNode.name}</Title3>
                    </Inline>
                    <Inline space={8} wrap>
                      {selectedNode.confidentiality && (
                        <ConfidentialityBadge value={selectedNode.confidentiality} />
                      )}
                      {selectedNode.validity && <ValidityChip value={selectedNode.validity} />}
                    </Inline>

                    {selectedNode.figure && (
                      <div
                        style={{
                          background: BLUE_TINT,
                          padding: 16,
                          borderRadius: RADIUS,
                        }}
                      >
                        <Stack space={2}>
                          <Inline space={4} alignItems="baseline">
                            <Text5>{selectedNode.figure.value}</Text5>
                            <Text3 regular color={BLUE}>
                              {selectedNode.figure.unit}
                            </Text3>
                          </Inline>
                          <Eyebrow>{selectedNode.figure.period}</Eyebrow>
                        </Stack>
                      </div>
                    )}

                    {selectedNode.figure && selectedNode.figure.sources.length > 0 && (
                      <Stack space={8}>
                        <Eyebrow>Agreeing sources</Eyebrow>
                        {selectedNode.figure.sources.map((s) => (
                          <Touchable
                            key={s.docId}
                            onPress={() => {
                              if (s.locked) return;
                              const doc = lineageQuery.data?.find(
                                (l) => l.docId === s.docId,
                              );
                              if (doc) {
                                setTab("sources");
                                setOpenLineageDoc(doc);
                                setSelectedNodeId(`doc-node:${s.docId}`);
                              }
                            }}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              padding: 10,
                              borderRadius: RADIUS,
                              border: `1px solid ${BORDER}`,
                              background: SURFACE,
                              opacity: s.locked ? 0.7 : 1,
                              cursor: s.locked ? "not-allowed" : "pointer",
                            }}
                          >

                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                minWidth: 0,
                              }}
                            >
                              {s.locked ? (
                                <IconLockClosedRegular size={14} color={MUTED} />
                              ) : (
                                <IconFileTextRegular size={14} color={BLUE} />
                              )}
                              <Text2 regular color={NAVY} truncate>
                                {s.locked ? "Restricted source" : s.docTitle}
                              </Text2>
                            </span>
                            <span
                              style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
                            >
                              <span
                                style={{
                                  width: 48,
                                  height: 6,
                                  borderRadius: skinVars.borderRadii.bar,
                                  background: ALT,
                                  overflow: "hidden",
                                }}
                              >
                                <span
                                  style={{
                                    display: "block",
                                    height: "100%",
                                    background: BLUE,
                                    width: `${Math.round(s.confidence * 100)}%`,
                                  }}
                                />
                              </span>
                              <Text1 medium color={BLUE}>
                                {`${Math.round(s.confidence * 100)}%`}
                              </Text1>
                            </span>
                          </Touchable>
                        ))}
                      </Stack>
                    )}

                    {selectedNode.locked && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          background: ALT,
                          padding: 12,
                          borderRadius: RADIUS,
                        }}
                      >
                        <IconShieldRegular size={16} color={MUTED} />
                        <Text2 regular color={MUTED}>
                          This node is above your clearance. Only its existence is shown.
                        </Text2>
                      </div>
                    )}

                    {selectedNode.pageId && !selectedNode.locked && (
                      <ButtonPrimary
                        onPress={() => setOpenPageId(selectedNode.pageId ?? null)}
                        EndIcon={IconArrowRightRegular}
                      >
                        Open compiled page
                      </ButtonPrimary>
                    )}
                    {selectedNode.docId && !selectedNode.locked && (
                      <ButtonSecondary
                        onPress={() => {
                          const doc = lineageQuery.data?.find(
                            (l) => l.docId === selectedNode.docId,
                          );
                          if (doc) {
                            setTab("sources");
                            setOpenLineageDoc(doc);
                          }
                        }}
                        EndIcon={IconDocumentsRegular}
                      >
                        Inspect source
                      </ButtonSecondary>
                    )}
                  </Stack>
                </Box>
              ) : (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: 24,
                  }}
                >
                  <Stack space={12}>
                    <Inline space={0} alignItems="center">
                      <div style={{ margin: "0 auto" }}>
                        <IconShareRegular size={40} color={MUTED} />
                      </div>
                    </Inline>
                    <Text2 regular color={MUTED}>
                      Select any node to inspect its governance, figures and links.
                      Drag nodes to explore the web of corporate memory.
                    </Text2>
                  </Stack>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "pages" && (
          <div style={{ height: "100%", overflowY: "auto" }}>
            <Box padding={32}>
              <Grid columns={{ minSize: 280 }} gap={16}>
                {pagesQuery.data?.map((p: WikiPageSummary) => (
                  <Touchable
                    key={p.id}
                    onPress={() => {
                      if (!p.locked) openPage(p.id, p.nodeId);
                    }}
                    style={{
                      textAlign: "left",
                      padding: 20,
                      borderRadius: RADIUS,
                      border: p.locked ? `1px dashed ${BORDER}` : `1px solid ${BORDER}`,
                      background: SURFACE,
                      position: "relative",
                      overflow: "hidden",
                      opacity: p.locked ? 0.7 : 1,
                      cursor: p.locked ? "not-allowed" : "pointer",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: 4,
                        backgroundColor: axisColors.get(p.axisId) || BLUE,
                      }}
                    />
                    <Stack space={12}>
                      <Inline space={8} alignItems="center">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Inline space={8} alignItems="center">
                            {p.locked && <IconLockClosedRegular size={16} color={MUTED} />}
                            <Title3>{p.title}</Title3>
                          </Inline>
                        </div>
                        {p.refined && !p.locked && (
                          <Tag type="promo" Icon={IconStarRegular}>
                            Refined
                          </Tag>
                        )}
                      </Inline>
                      <Text2 regular color={MUTED}>
                        {p.summary}
                      </Text2>
                      <Divider />
                      <Inline space={8} alignItems="center">
                        <div style={{ flex: 1 }}>
                          <Inline space={8} alignItems="center">
                            <ConfidentialityBadge value={p.confidentiality} />
                            <ValidityChip value={p.validity} />
                          </Inline>
                        </div>
                        <Inline space={4} alignItems="center">
                          <IconFileTextRegular size={14} color={MUTED} />
                          <Text1 regular color={MUTED}>
                            {String(p.sourceCount)}
                          </Text1>
                        </Inline>
                      </Inline>
                      {!p.locked && p.lastRefinedBy && (
                        <Eyebrow>{`${p.lastRefinedBy} • ${p.lastRefinedAt}`}</Eyebrow>
                      )}
                    </Stack>
                  </Touchable>
                ))}
              </Grid>
            </Box>
          </div>
        )}

        {tab === "sources" && (
          <div style={{ height: "100%", overflowY: "auto" }}>
            <Box padding={32}>
              <Stack space={8}>
                {lineageQuery.data?.map((l) => (
                  <Touchable
                    key={l.docId}
                    onPress={() => {
                      if (l.locked) return;
                      setOpenLineageDoc(l);
                      setSelectedNodeId(`doc-node:${l.docId}`);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: 16,
                      borderRadius: RADIUS,
                      border: l.locked ? `1px dashed ${BORDER}` : `1px solid ${BORDER}`,
                      background: SURFACE,
                      textAlign: "left",
                      opacity: l.locked ? 0.7 : 1,
                      cursor: l.locked ? "not-allowed" : "pointer",
                    }}
                  >
                    <Circle size={40} backgroundColor={BLUE_TINT}>
                      {l.locked ? (
                        <IconLockClosedRegular size={20} color={BLUE} />
                      ) : (
                        <IconFileTextRegular size={20} color={BLUE} />
                      )}
                    </Circle>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Stack space={2}>
                        <Text2 medium color={NAVY} truncate>
                          {l.title}
                        </Text2>
                        <Text1 regular color={MUTED} truncate>
                          {l.locked
                            ? "Restricted — above your clearance"
                            : `${l.sourceFile ?? ""} • ${l.chunkCount ?? 0} chunks • ${l.owner}`}
                        </Text1>
                      </Stack>
                    </div>
                    <Inline space={8} alignItems="center">
                      <ConfidentialityBadge value={l.confidentiality} />
                      <ValidityChip value={l.validity} />
                    </Inline>
                  </Touchable>
                ))}
              </Stack>
            </Box>
          </div>
        )}
      </div>

      {/* Persistent compiled-layer Ask bar */}
      <div
        style={{
          borderTop: `1px solid ${BORDER}`,
          background: SURFACE,
          padding: "16px 32px",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <Inline space={8} alignItems="center" expand={0}>
            <div
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
            >
              <TextField
                name="ask"
                label="Ask the compiled memory"
                value={question}
                onChangeValue={setQuestion}
                fullWidth
              />
            </div>
            <IconButton
              aria-label="Ask"
              Icon={IconSendRegular}
              onPress={handleAsk}
              disabled={!question.trim() || searching || !roleId}
            />
          </Inline>
        </div>
      </div>

      {/* Search results drawer */}
      {searchOpen && (
        <Drawer
          title="Compiled memory"
          description={question}
          onClose={() => setSearchOpen(false)}
          onDismiss={() => setSearchOpen(false)}
        >
          {searching && (
            <Box paddingY={40}>
              <Stack space={12}>
                <Inline space={0} alignItems="center">
                  <div style={{ margin: "0 auto" }}>
                    <Circle size={48} backgroundColor={BLUE_TINT}>
                      <IconSearchRegular size={24} color={BLUE} />
                    </Circle>
                  </div>
                </Inline>
                <Text2 medium color={NAVY} textAlign="center">
                  Searching compiled pages...
                </Text2>
              </Stack>
            </Box>
          )}

          {searchResult && !searching && (
            <Stack space={24}>
              {searchResult.status === "no_evidence" && (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    background: applyAlpha(skinVars.rawColors.warning, 0.15),
                    padding: 20,
                    borderRadius: RADIUS,
                  }}
                >
                  <IconAlertRegular size={24} color={skinVars.colors.warning} />
                  <Stack space={4}>
                    <Text3 medium color={NAVY}>
                      No Evidence Found
                    </Text3>
                    <Text2 regular color={NAVY}>
                      {searchResult.answer}
                    </Text2>
                  </Stack>
                </div>
              )}

              {searchResult.status === "permission_blocked" && (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    background: applyAlpha(skinVars.rawColors.error, 0.15),
                    padding: 20,
                    borderRadius: RADIUS,
                  }}
                >
                  <IconShieldRegular size={24} color={skinVars.colors.error} />
                  <Stack space={4}>
                    <Text3 medium color={NAVY}>
                      Permission Restricted
                    </Text3>
                    <Text2 regular color={NAVY}>
                      {searchResult.answer}
                    </Text2>
                    {searchResult.permissionNote && (
                      <div
                        style={{
                          background: applyAlpha(skinVars.rawColors.backgroundContainer, 0.6),
                          padding: "8px 12px",
                          borderRadius: RADIUS,
                        }}
                      >
                        <Text2 medium color={NAVY}>
                          {searchResult.permissionNote}
                        </Text2>
                      </div>
                    )}
                  </Stack>
                </div>
              )}

              {searchResult.status === "answered" && (
                <>
                  {searchResult.historic && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: applyAlpha(skinVars.rawColors.warning, 0.15),
                        padding: "12px 16px",
                        borderRadius: RADIUS,
                      }}
                    >
                      <IconWaitClockRegular size={20} color={skinVars.colors.warning} />
                      <Text2 medium color={NAVY}>
                        This answer draws on historic or superseded material.
                      </Text2>
                    </div>
                  )}
                  <Stack space={8}>
                    {searchResult.answer.split("\n").map((para, i) => (
                      <Text3 regular color={NAVY} key={i}>
                        {para}
                      </Text3>
                    ))}
                  </Stack>

                  {searchResult.wikiLinks.length > 0 && (
                    <Inline space={8} alignItems="center" wrap>
                      <Eyebrow>Pages:</Eyebrow>
                      {searchResult.wikiLinks.map((w) => (
                        <Touchable
                          key={w.id}
                          onPress={() => {
                            if (w.locked) return;
                            setSearchOpen(false);
                            openPage(w.id, w.nodeId);
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 12px",
                            borderRadius: skinVars.borderRadii.chip,
                            border: w.locked ? `1px dashed ${BORDER}` : `1px solid ${applyAlpha(skinVars.rawColors.brand, 0.3)}`,
                            background: w.locked ? "transparent" : BLUE_TINT,
                            color: w.locked ? MUTED : BLUE,
                            cursor: w.locked ? "not-allowed" : "pointer",
                          }}
                        >
                          {w.locked && <IconLockClosedRegular size={12} color={MUTED} />}
                          <Text2 medium color={w.locked ? MUTED : BLUE}>
                            {w.title}
                          </Text2>
                        </Touchable>
                      ))}
                    </Inline>
                  )}

                  {searchResult.evidence.length > 0 && (
                    <Stack space={12}>
                      <Divider />
                      <Inline space={8} alignItems="center">
                        <IconFileTextRegular size={16} color={MUTED} />
                        <Eyebrow>Evidence</Eyebrow>
                      </Inline>
                      {searchResult.evidence.map((ev, i) => (
                        <EvidenceRow key={i} ev={ev} onOpen={() => setSnippet(ev)} />
                      ))}
                    </Stack>
                  )}
                </>
              )}
            </Stack>
          )}
        </Drawer>
      )}

      {/* Page detail drawer */}
      {openPageId && (
        <Drawer
          title={pageQuery.data?.page?.title ?? "Compiled page"}
          onClose={() => setOpenPageId(null)}
          onDismiss={() => setOpenPageId(null)}
        >
          {pageQuery.isLoading && (
            <Box paddingY={40}>
              <Text2 regular color={MUTED} textAlign="center">
                Loading page...
              </Text2>
            </Box>
          )}
          {pageQuery.data?.locked && (
            <div
              style={{
                display: "flex",
                gap: 12,
                background: applyAlpha(skinVars.rawColors.error, 0.15),
                padding: 24,
                borderRadius: RADIUS,
              }}
            >
              <IconLockClosedRegular size={24} color={skinVars.colors.error} />
              <Stack space={4}>
                <Text3 medium color={NAVY}>
                  Restricted page
                </Text3>
                <Text2 regular color={NAVY}>
                  {`This compiled page requires ${(
                    pageQuery.data.requiredClearance ?? ""
                  ).toUpperCase()} clearance.`}
                </Text2>
              </Stack>
            </div>
          )}
          {pageQuery.data?.page && (
            <Stack space={24}>
              <Stack space={8}>
                <Inline space={8} alignItems="center" wrap>
                  <ConfidentialityBadge value={pageQuery.data.page.confidentiality} />
                  <ValidityChip value={pageQuery.data.page.validity} />
                  {pageQuery.data.page.refined && (
                    <Tag type="promo" Icon={IconStarRegular}>
                      Refined
                    </Tag>
                  )}
                </Inline>
                <Text2 regular color={MUTED}>
                  {pageQuery.data.page.summary}
                </Text2>
              </Stack>

              <div
                style={{
                  background: applyAlpha(skinVars.rawColors.brand, 0.06),
                  border: `1px solid ${applyAlpha(skinVars.rawColors.brand, 0.1)}`,
                  padding: 20,
                  borderRadius: RADIUS,
                }}
              >
                <Stack space={8}>
                  <Text1 medium transform="uppercase" color={BLUE}>
                    Position
                  </Text1>
                  <PositionText
                    text={pageQuery.data.page.position}
                    pageByTitle={pageByTitle}
                    evidence={pageQuery.data.page.evidence}
                    onWiki={openWikiLink}
                    onEvidence={setSnippet}
                  />
                </Stack>
              </div>

              {pageQuery.data.page.resolvedFacts.length > 0 && (
                <Stack space={12}>
                  <Eyebrow>Resolved facts</Eyebrow>
                  {pageQuery.data.page.resolvedFacts.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        background: SURFACE,
                        border: `1px solid ${BORDER}`,
                        borderRadius: RADIUS,
                        padding: 16,
                      }}
                    >
                      <Stack space={8}>
                        <Text2 medium color={NAVY}>
                          {f.claim}
                        </Text2>
                        <Inline space={12} alignItems="center">
                          <Inline space={4} alignItems="center">
                            <IconCheckedRegular size={16} color={skinVars.colors.success} />
                            <Text2 medium color={skinVars.colors.success}>
                              {f.resolvedValue}
                            </Text2>
                          </Inline>
                          <Text2 regular color={MUTED} decoration="line-through">
                            {f.supersededValue}
                          </Text2>
                        </Inline>
                        <Text1 regular color={MUTED}>
                          {f.resolution}
                        </Text1>
                        <Eyebrow>{`Current: ${f.currentDocTitle} • Historic: ${f.historicDocTitle}`}</Eyebrow>
                      </Stack>
                    </div>
                  ))}
                </Stack>
              )}

              {pageQuery.data.page.evidence.length > 0 && (
                <Stack space={12}>
                  <Inline space={8} alignItems="center">
                    <IconFileTextRegular size={16} color={MUTED} />
                    <Eyebrow>Evidence</Eyebrow>
                  </Inline>
                  {pageQuery.data.page.evidence.map((ev, i) => (
                    <EvidenceRow key={i} ev={ev} onOpen={() => setSnippet(ev)} />
                  ))}
                </Stack>
              )}

              {pageQuery.data.page.openItems.length > 0 && (
                <Stack space={8}>
                  <Eyebrow>Open items & watch list</Eyebrow>
                  {pageQuery.data.page.openItems.map((o) => (
                    <div
                      key={o.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        background: ALT,
                        padding: 12,
                        borderRadius: RADIUS,
                      }}
                    >
                      <Tag type={o.kind === "open" ? "warning" : "info"}>{o.kind}</Tag>
                      <Stack space={2}>
                        <Text2 regular color={NAVY}>
                          {o.text}
                        </Text2>
                        <Eyebrow>{o.owner}</Eyebrow>
                      </Stack>
                    </div>
                  ))}
                </Stack>
              )}

              {pageQuery.data.page.relatedPages.length > 0 && (
                <Stack space={8}>
                  <Eyebrow>Related pages</Eyebrow>
                  <Inline space={8} wrap>
                    {pageQuery.data.page.relatedPages.map((rel) => (
                      <Touchable
                        key={rel.id}
                        onPress={() => {
                          if (rel.locked) return;
                          openPageFromRelated(rel);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "6px 12px",
                          borderRadius: skinVars.borderRadii.chip,
                          border: rel.locked
                            ? `1px dashed ${BORDER}`
                            : `1px solid ${applyAlpha(skinVars.rawColors.brand, 0.3)}`,
                          background: "transparent",
                          color: rel.locked ? MUTED : BLUE,
                          cursor: rel.locked ? "not-allowed" : "pointer",
                        }}
                      >
                        {rel.locked && <IconLockClosedRegular size={12} color={MUTED} />}
                        <Text2 medium color={rel.locked ? MUTED : BLUE}>
                          {rel.title}
                        </Text2>
                      </Touchable>
                    ))}
                  </Inline>
                </Stack>
              )}

              {pageQuery.data.page.changeLog.length > 0 && (
                <Stack space={8}>
                  <Eyebrow>Change log</Eyebrow>
                  <Stack space={8}>
                    {pageQuery.data.page.changeLog.map((c) => (
                      <Inline key={c.id} space={12} alignItems="flex-start">
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: skinVars.borderRadii.avatar,
                            background: BLUE,
                            marginTop: 6,
                            flexShrink: 0,
                          }}
                        />
                        <Inline space={8} alignItems="baseline" wrap>
                          <Text2 regular color={NAVY}>
                            {c.summary}
                          </Text2>
                          <Eyebrow>{`${c.by} • ${c.at}`}</Eyebrow>
                        </Inline>
                      </Inline>
                    ))}
                  </Stack>
                </Stack>
              )}
            </Stack>
          )}
        </Drawer>
      )}

      {/* Lineage detail drawer */}
      {openLineageDoc && (
        <Drawer
          title={openLineageDoc.title}
          description={`${openLineageDoc.sourceFile} • ${openLineageDoc.taxonomyVersion} • ${openLineageDoc.chunkCount} chunks`}
          onClose={() => setOpenLineageDoc(null)}
          onDismiss={() => setOpenLineageDoc(null)}
        >
          <Stack space={24}>
            <Inline space={8} alignItems="center">
              <ConfidentialityBadge value={openLineageDoc.confidentiality} />
              <ValidityChip value={openLineageDoc.validity} />
            </Inline>

            {openLineageDoc.ingestion && openLineageDoc.ingestion.length > 0 && (
              <Stack space={12}>
                <Eyebrow>Ingestion lineage</Eyebrow>
                <div
                  style={{
                    position: "relative",
                    paddingLeft: 24,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 8,
                      top: 4,
                      bottom: 4,
                      width: 1,
                      background: BORDER,
                    }}
                  />
                  <Stack space={16}>
                    {openLineageDoc.ingestion.map((s, i) => (
                      <div key={i} style={{ position: "relative" }}>
                        <div
                          style={{
                            position: "absolute",
                            left: -18,
                            top: 4,
                            width: 12,
                            height: 12,
                            borderRadius: skinVars.borderRadii.avatar,
                            background: BLUE,
                            border: `2px solid ${SURFACE}`,
                          }}
                        />
                        <Stack space={2}>
                          <Text2 medium color={NAVY}>
                            {s.stage}
                          </Text2>
                          <Text2 regular color={MUTED}>
                            {s.detail}
                          </Text2>
                          <Eyebrow>{`${s.actor} • ${s.at}`}</Eyebrow>
                        </Stack>
                      </div>
                    ))}
                  </Stack>
                </div>
              </Stack>
            )}

            {openLineageDoc.validation && openLineageDoc.validation.length > 0 && (
              <Stack space={12}>
                <Eyebrow>Human validation</Eyebrow>
                {openLineageDoc.validation.map((v, i) => (
                  <div
                    key={i}
                    style={{
                      background: SURFACE,
                      border: `1px solid ${BORDER}`,
                      borderRadius: RADIUS,
                      padding: 16,
                    }}
                  >
                    <Stack space={8}>
                      <Inline space={8} alignItems="center">
                        <div style={{ flex: 1 }}>
                          <Text2 medium color={NAVY}>
                            {v.field}
                          </Text2>
                        </div>
                        <Tag type={v.status === "accepted" ? "success" : "warning"}>
                          {v.status}
                        </Tag>
                      </Inline>
                      <Inline space={12} alignItems="center">
                        {v.status === "corrected" && (
                          <Text2 regular color={MUTED} decoration="line-through">
                            {v.proposed}
                          </Text2>
                        )}
                        <Text2 medium color={NAVY}>
                          {v.approved}
                        </Text2>
                      </Inline>
                      <Eyebrow>{`${v.by} • ${v.at}`}</Eyebrow>
                    </Stack>
                  </div>
                ))}
              </Stack>
            )}
          </Stack>
        </Drawer>
      )}

      {/* Snippet drawer */}
      {snippet && (
        <Drawer
          title={snippet.docTitle}
          description={snippet.sourceLoc}
          onClose={() => setSnippet(null)}
          onDismiss={() => setSnippet(null)}
        >
          <Stack space={16}>
            <Inline space={8} alignItems="center">
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "inline-block",
                    background: BLUE_TINT,
                    padding: "4px 12px",
                    borderRadius: skinVars.borderRadii.chip,
                  }}
                >
                  <Text2 medium color={BLUE}>
                    {snippet.marker}
                  </Text2>
                </div>
              </div>
              <Inline space={8} alignItems="center">
                <ValidityChip value={snippet.validity} />
                <ConfidentialityBadge value={snippet.confidentiality} />
              </Inline>
            </Inline>
            <div
              style={{
                background: ALT,
                padding: 24,
                borderRadius: RADIUS,
                border: `1px solid ${BORDER}`,
              }}
            >
              <Stack space={12}>
                <Eyebrow>Extracted snippet</Eyebrow>
                <Text3 regular color={NAVY}>
                  {`"${snippet.snippet}"`}
                </Text3>
              </Stack>
            </div>
          </Stack>
        </Drawer>
      )}
    </div>
  );
}
