import React from "react";
import { clearanceLabel, validityLabel } from "./helpers";
import { useApp } from "../app-provider";
import { DATA_I18N } from "../../i18n/data";
import {
  useListDocuments,
  useGetCorpusStats,
  useGetDocument,
} from "@workspace/api-client-react";
import {
  Box,
  Stack,
  Inline,
  Grid,
  GridItem,
  Boxed,
  BoxedRowList,
  BoxedRow,
  Drawer,
  Circle,
  Tag,
  Divider,
  Text1,
  Text2,
  Text3,
  Text7,
  Title2,
  Title3,
  Spinner,
  Touchable,
  TextField,
  Chip,
  Menu,
  MenuItem,
  ButtonPrimary,
  ButtonSecondary,
  skinVars,
  IconDatabaseRegular,
  IconWorldDeviceRegular,
  IconShieldRegular,
  IconDocumentOtherRegular,
  IconCheckedRegular,
  IconCloseRegular,
  IconCloudUploadRegular,
} from "@telefonica/mistica";
import { UploadDrawer } from "./upload-drawer";
import { EditTagsDrawer, type EditTagsDoc } from "./edit-tags-drawer";

type ChunkBlock =
  | { kind: "prose"; text: string }
  | { kind: "table"; header: string[]; rows: string[][] };

function parseChunkBlocks(text: string): ChunkBlock[] {
  const blocks: ChunkBlock[] = [];
  let prose: string[] = [];
  let table: string[][] = [];
  const flushProse = () => {
    if (prose.length > 0) {
      blocks.push({ kind: "prose", text: prose.join("\n").trim() });
      prose = [];
    }
  };
  const flushTable = () => {
    if (table.length > 0) {
      const [header, ...rows] = table;
      blocks.push({ kind: "table", header, rows });
      table = [];
    }
  };
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length > 2) {
      flushProse();
      table.push(
        trimmed
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim()),
      );
    } else {
      flushTable();
      if (trimmed.length > 0) prose.push(trimmed);
    }
  }
  flushProse();
  flushTable();
  return blocks;
}

function ChunkTable({
  header,
  rows,
}: {
  header: string[];
  rows: string[][];
}) {
  const cellStyle: React.CSSProperties = {
    padding: "6px 12px",
    textAlign: "left",
    borderBottom: `1px solid ${skinVars.colors.divider}`,
    fontSize: 14,
    color: skinVars.colors.textSecondary,
    whiteSpace: "nowrap",
  };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {header.map((h, i) => (
              <th
                key={i}
                style={{
                  ...cellStyle,
                  color: skinVars.colors.textPrimary,
                  fontWeight: 500,
                  borderBottom: `2px solid ${skinVars.colors.divider}`,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} style={cellStyle}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChunkText({ text }: { text: string }) {
  const blocks = parseChunkBlocks(text);
  if (blocks.length === 1 && blocks[0].kind === "prose") {
    return (
      <Text2 regular color={skinVars.colors.textSecondary}>
        "{text}"
      </Text2>
    );
  }
  return (
    <Stack space={8}>
      {blocks.map((b, i) =>
        b.kind === "prose" ? (
          <Text2 key={i} regular color={skinVars.colors.textSecondary}>
            {b.text}
          </Text2>
        ) : (
          <ChunkTable key={i} header={b.header} rows={b.rows} />
        ),
      )}
    </Stack>
  );
}

function StatCard({
  icon: Icon,
  iconColor,
  iconBackground,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  iconBackground: string;
  label: string;
  value: number;
}) {
  return (
    <Boxed>
      <Box padding={24}>
        <Inline space={16} alignItems="center">
          <Circle size={48} backgroundColor={iconBackground}>
            <Icon size={24} color={iconColor} />
          </Circle>
          <Stack space={4}>
            <Text1
              medium
              color={skinVars.colors.textSecondary}
              transform="uppercase"
            >
              {label}
            </Text1>
            <Text7>{value}</Text7>
          </Stack>
        </Inline>
      </Box>
    </Boxed>
  );
}

const ALL = "__all__";

// Standard Mística filter pattern: a compact Chip that opens a Menu of
// checkbox items — one chip per facet instead of a wall of full-size Selects.
function FilterChip({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  const isActive = value !== ALL;
  const selectedLabel = options.find((o) => o.value === value)?.label;
  return (
    <Menu
      renderTarget={({ ref, onPress, isMenuOpen }) => (
        <div ref={ref} style={{ display: "inline-flex" }}>
          <Chip active={isActive || isMenuOpen} onPress={onPress}>
            {isActive && selectedLabel ? `${label}: ${selectedLabel}` : label}
          </Chip>
        </div>
      )}
      renderMenu={({ ref, className, close }) => (
        <div ref={ref} className={className}>
          <MenuItem
            label={allLabel}
            controlType="checkbox"
            checked={!isActive}
            onPress={() => {
              onChange(ALL);
              close();
            }}
          />
          {options.map((o) => (
            <MenuItem
              key={o.value}
              label={o.label}
              controlType="checkbox"
              checked={value === o.value}
              onPress={() => {
                onChange(o.value);
                close();
              }}
            />
          ))}
        </div>
      )}
    />
  );
}

type SortKey = "newest" | "oldest" | "title" | "chunks";

// "Q3 2025" → sortable rank; unknown formats sink to the bottom.
function quarterRank(quarter: string): number {
  const m = /Q([1-4])\s*(\d{4})/.exec(quarter);
  return m ? Number(m[2]) * 4 + Number(m[1]) : 0;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export default function CorpusArea() {
  const { lang } = useApp();
  const t = DATA_I18N[lang];
  const c = t.corpus;
  const { data: stats } = useGetCorpusStats();
  const { data: documents } = useListDocuments();
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(null);
  const [editDoc, setEditDoc] = React.useState<EditTagsDoc | null>(null);

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState(ALL);
  const [country, setCountry] = React.useState(ALL);
  const [brand, setBrand] = React.useState(ALL);
  const [clearance, setClearance] = React.useState(ALL);
  const [validity, setValidity] = React.useState(ALL);
  const [connector, setConnector] = React.useState(ALL);
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [uploadOpen, setUploadOpen] = React.useState(false);

  const { data: docDetail, isLoading: isLoadingDetail } = useGetDocument(
    selectedDocId || "",
    {
      query: {
        enabled: !!selectedDocId,
        queryKey: ["document", selectedDocId],
      },
    },
  );

  const categoryLabel = React.useCallback(
    (cat: string) =>
      cat === "A"
        ? c.categoryA
        : cat === "B"
          ? c.categoryB
          : cat === "E"
            ? c.categoryE
            : cat,
    [c],
  );
  const sentimentLabel = React.useCallback(
    (s: string) => t.sentiment[s] ?? s,
    [t],
  );

  const titleOf = React.useCallback(
    (docId: string) => documents?.find((d) => d.id === docId)?.title ?? docId,
    [documents],
  );

  const facets = React.useMemo(() => {
    const docs = documents ?? [];
    return {
      categories: uniqueSorted(docs.map((d) => d.category)),
      countries: uniqueSorted(docs.map((d) => d.country)),
      brands: uniqueSorted(docs.map((d) => d.brand)),
      clearances: uniqueSorted(docs.map((d) => d.confidentiality)),
      validities: uniqueSorted(docs.map((d) => d.validity)),
      connectors: uniqueSorted(docs.map((d) => d.connector)),
    };
  }, [documents]);

  const filteredDocuments = React.useMemo(() => {
    const docs = documents ?? [];
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (category !== ALL && d.category !== category) return false;
      if (country !== ALL && d.country !== country) return false;
      if (brand !== ALL && d.brand !== brand) return false;
      if (clearance !== ALL && d.confidentiality !== clearance) return false;
      if (validity !== ALL && d.validity !== validity) return false;
      if (connector !== ALL && d.connector !== connector) return false;
      if (q.length > 0) {
        const haystack = [d.title, d.summary, d.owner, d.type, ...d.topics]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    documents,
    search,
    category,
    country,
    brand,
    clearance,
    validity,
    connector,
  ]);

  const sortedDocuments = React.useMemo(() => {
    const docs = [...filteredDocuments];
    // Same-quarter ties are broken by the real ingestion timestamp, so a
    // document uploaded a minute ago surfaces above the seed corpus.
    const addedRank = (d: { addedAt?: string | null }) =>
      d.addedAt ? Date.parse(d.addedAt) || 0 : 0;
    switch (sort) {
      case "newest":
        docs.sort(
          (a, b) =>
            quarterRank(b.quarter) - quarterRank(a.quarter) ||
            addedRank(b) - addedRank(a),
        );
        break;
      case "oldest":
        docs.sort(
          (a, b) =>
            quarterRank(a.quarter) - quarterRank(b.quarter) ||
            addedRank(a) - addedRank(b),
        );
        break;
      case "title":
        docs.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "chunks":
        docs.sort((a, b) => b.chunkCount - a.chunkCount);
        break;
    }
    return docs;
  }, [filteredDocuments, sort]);

  const sortLabels: Record<SortKey, string> = {
    newest: c.sortNewest,
    oldest: c.sortOldest,
    title: c.sortTitle,
    chunks: c.sortChunks,
  };

  const anyFilterActive =
    search.trim() !== "" ||
    category !== ALL ||
    country !== ALL ||
    brand !== ALL ||
    clearance !== ALL ||
    validity !== ALL ||
    connector !== ALL;

  function clearFilters() {
    setSearch("");
    setCategory(ALL);
    setCountry(ALL);
    setBrand(ALL);
    setClearance(ALL);
    setValidity(ALL);
    setConnector(ALL);
  }

  return (
    <Stack space={24}>
      <Grid columns={4} gap={16}>
        <GridItem>
          <StatCard
            icon={IconDatabaseRegular}
            iconColor={skinVars.colors.brand}
            iconBackground={skinVars.colors.brandLow}
            label={c.totalDocuments}
            value={stats?.totalDocuments || 0}
          />
        </GridItem>
        <GridItem>
          <StatCard
            icon={IconCheckedRegular}
            iconColor={skinVars.colors.success}
            iconBackground={skinVars.colors.successLow}
            label={c.totalChunks}
            value={stats?.totalChunks || 0}
          />
        </GridItem>
        <GridItem>
          <StatCard
            icon={IconWorldDeviceRegular}
            iconColor={skinVars.colors.warning}
            iconBackground={skinVars.colors.warningLow}
            label={c.countries}
            value={stats?.byCountry?.length || 0}
          />
        </GridItem>
        <GridItem>
          <StatCard
            icon={IconShieldRegular}
            iconColor={skinVars.colors.error}
            iconBackground={skinVars.colors.errorLow}
            label={c.needsReview}
            value={stats?.quarantined || 0}
          />
        </GridItem>
      </Grid>

      <Boxed>
        <Box padding={24}>
          <Inline space={16} alignItems="center" wrap>
            <Circle size={56} backgroundColor={skinVars.colors.brandLow}>
              <IconCloudUploadRegular size={28} color={skinVars.colors.brand} />
            </Circle>
            <div style={{ flex: 1, minWidth: 260 }}>
              <Stack space={4}>
                <Title3>{c.uploadCardTitle}</Title3>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {c.uploadCardDesc}
                </Text2>
              </Stack>
            </div>
            <ButtonPrimary onPress={() => setUploadOpen(true)}>
              {c.uploadButton}
            </ButtonPrimary>
          </Inline>
        </Box>
      </Boxed>

      <Stack space={16}>
        <Inline space="between" alignItems="center">
          <Inline space={8} alignItems="center">
            <IconDocumentOtherRegular size={20} color={skinVars.colors.brand} />
            <Title2>{c.governedCorpus}</Title2>
          </Inline>
        </Inline>

        <TextField
          name="corpus-search"
          label={c.searchLabel}
          value={search}
          onChangeValue={setSearch}
          fullWidth
        />
        <Inline space="between" alignItems="center">
          <Inline space={8} alignItems="center" wrap>
            <FilterChip
              label={c.filterCategory}
              allLabel={c.allLabel}
              value={category}
              onChange={setCategory}
              options={facets.categories.map((v) => ({
                value: v,
                label: categoryLabel(v),
              }))}
            />
            <FilterChip
              label={c.filterCountry}
              allLabel={c.allLabel}
              value={country}
              onChange={setCountry}
              options={facets.countries.map((v) => ({ value: v, label: v }))}
            />
            <FilterChip
              label={c.filterBrand}
              allLabel={c.allLabel}
              value={brand}
              onChange={setBrand}
              options={facets.brands.map((v) => ({ value: v, label: v }))}
            />
            <FilterChip
              label={c.filterClearance}
              allLabel={c.allLabel}
              value={clearance}
              onChange={setClearance}
              options={facets.clearances.map((v) => ({
                value: v,
                label: clearanceLabel(v, lang),
              }))}
            />
            <FilterChip
              label={c.filterValidity}
              allLabel={c.allLabel}
              value={validity}
              onChange={setValidity}
              options={facets.validities.map((v) => ({
                value: v,
                label: validityLabel(v, lang),
              }))}
            />
            <FilterChip
              label={c.filterSource}
              allLabel={c.allLabel}
              value={connector}
              onChange={setConnector}
              options={facets.connectors.map((v) => ({ value: v, label: v }))}
            />
            {anyFilterActive && (
              <Chip onClose={clearFilters}>{c.clearFilters}</Chip>
            )}
          </Inline>
          <Menu
            position="right"
            renderTarget={({ ref, onPress, isMenuOpen }) => (
              <div ref={ref} style={{ display: "inline-flex", flexShrink: 0 }}>
                <Chip active={isMenuOpen} onPress={onPress}>
                  {`${c.sortLabel}: ${sortLabels[sort]}`}
                </Chip>
              </div>
            )}
            renderMenu={({ ref, className, close }) => (
              <div ref={ref} className={className}>
                {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                  <MenuItem
                    key={key}
                    label={sortLabels[key]}
                    controlType="checkbox"
                    checked={sort === key}
                    onPress={() => {
                      setSort(key);
                      close();
                    }}
                  />
                ))}
              </div>
            )}
          />
        </Inline>

        <Text1 regular color={skinVars.colors.textSecondary}>
          {c.matchCount(filteredDocuments.length, (documents ?? []).length)}
        </Text1>

        {filteredDocuments.length === 0 ? (
          <Boxed>
            <Box padding={24}>
              <Text2 regular color={skinVars.colors.textSecondary}>
                {c.noMatches}
              </Text2>
            </Box>
          </Boxed>
        ) : (
          <BoxedRowList>
            {sortedDocuments.map((doc) => (
              <BoxedRow
                key={doc.id}
                title={doc.title}
                description={c.rowDesc(
                  doc.brand,
                  doc.chunkCount,
                  doc.sourceFormat,
                  doc.connector,
                  doc.language.toUpperCase(),
                )}
                onPress={() => setSelectedDocId(doc.id)}
                right={
                  <Inline space={8} alignItems="center">
                    <Tag
                      type={
                        doc.category === "A"
                          ? "info"
                          : doc.category === "B"
                            ? "active"
                            : "promo"
                      }
                    >
                      {categoryLabel(doc.category)}
                    </Tag>
                    {doc.ingestFilter && (
                      <Tag
                        type={
                          doc.ingestFilter.sentiment === "negative"
                            ? "warning"
                            : "info"
                        }
                      >
                        {c.filteredSentiment(
                          sentimentLabel(doc.ingestFilter.sentiment),
                        )}
                      </Tag>
                    )}
                    {doc.version && <Tag type="info">{doc.version}</Tag>}
                    <Tag
                      type={
                        doc.confidentiality === "public" ? "inactive" : "error"
                      }
                    >
                      {clearanceLabel(doc.confidentiality, lang)}
                    </Tag>
                    <Tag
                      type={
                        doc.validity === "approved" ? "success" : "inactive"
                      }
                    >
                      {validityLabel(doc.validity, lang)}
                    </Tag>
                  </Inline>
                }
              />
            ))}
          </BoxedRowList>
        )}
      </Stack>

      {selectedDocId && (
        <Drawer
          onClose={() => setSelectedDocId(null)}
          onDismiss={() => setSelectedDocId(null)}
          title={docDetail?.document.title ?? c.documentFallback}
        >
          {isLoadingDetail ? (
            <Box paddingY={40}>
              <Inline space={0} alignItems="center">
                <Spinner />
              </Inline>
            </Box>
          ) : docDetail ? (
            <Stack space={24}>
              <Stack space={12}>
                <Inline space="between" alignItems="center">
                  <Inline space={8} alignItems="center">
                    <Tag type="info">{docDetail.document.type}</Tag>
                    <Tag
                      type={
                        docDetail.document.category === "A"
                          ? "info"
                          : docDetail.document.category === "B"
                            ? "active"
                            : "promo"
                      }
                    >
                      {categoryLabel(docDetail.document.category)}
                    </Tag>
                  </Inline>
                  <Inline space={8} alignItems="center">
                    <Tag
                      type={
                        docDetail.document.validity === "approved"
                          ? "success"
                          : "inactive"
                      }
                    >
                      {validityLabel(docDetail.document.validity, lang)}
                    </Tag>
                    <Tag
                      type={
                        docDetail.document.confidentiality === "public"
                          ? "inactive"
                          : "error"
                      }
                    >
                      {clearanceLabel(docDetail.document.confidentiality, lang)}
                    </Tag>
                  </Inline>
                </Inline>
                <Inline space={8} alignItems="center">
                  <IconShieldRegular
                    size={16}
                    color={skinVars.colors.textSecondary}
                  />
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    {c.confidentialityInherited(
                      clearanceLabel(docDetail.document.confidentiality, lang),
                      docDetail.document.connector,
                    )}
                  </Text1>
                </Inline>
                <Inline space={8} alignItems="center">
                  <ButtonSecondary
                    small
                    onPress={() => {
                      const d = docDetail.document;
                      setSelectedDocId(null);
                      setEditDoc({
                        id: d.id,
                        title: d.title,
                        axisIds: d.axisIds,
                        topics: d.topics,
                      });
                    }}
                  >
                    {t.governance.editTags.open}
                  </ButtonSecondary>
                </Inline>
                <Inline space={16} alignItems="center" wrap>
                  <Text2 regular color={skinVars.colors.textPrimary}>
                    {docDetail.document.country} • {docDetail.document.brand}
                  </Text2>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {c.owner(docDetail.document.owner)}
                  </Text2>
                </Inline>
                <Inline space={16} alignItems="center" wrap>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {c.format(docDetail.document.sourceFormat)}
                  </Text2>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {c.source(docDetail.document.connector)}
                  </Text2>
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    {c.language(docDetail.document.language.toUpperCase())}
                  </Text2>
                  {docDetail.document.frequency && (
                    <Text2 regular color={skinVars.colors.textSecondary}>
                      {c.refresh(docDetail.document.frequency)}
                    </Text2>
                  )}
                  {docDetail.document.version && (
                    <Text2 regular color={skinVars.colors.textSecondary}>
                      {c.version(docDetail.document.version)}
                    </Text2>
                  )}
                </Inline>
                {(docDetail.document.supersedes ||
                  docDetail.document.supersededBy ||
                  (docDetail.document.lineageSourceDocIds ?? []).length >
                    0) && (
                  <Boxed>
                    <Box padding={16}>
                      <Stack space={8}>
                        <Text1
                          medium
                          color={skinVars.colors.textSecondary}
                          transform="uppercase"
                        >
                          {c.versionLineage}
                        </Text1>
                        {docDetail.document.supersededBy && (
                          <Inline space={8} alignItems="center" wrap>
                            <Tag type="warning">{c.supersededBy}</Tag>
                            <Touchable
                              onPress={() =>
                                setSelectedDocId(
                                  docDetail.document.supersededBy!,
                                )
                              }
                            >
                              <Text2 medium color={skinVars.colors.textLink}>
                                {titleOf(docDetail.document.supersededBy)}
                              </Text2>
                            </Touchable>
                          </Inline>
                        )}
                        {docDetail.document.supersedes && (
                          <Inline space={8} alignItems="center" wrap>
                            <Tag type="success">{c.replaces}</Tag>
                            <Touchable
                              onPress={() =>
                                setSelectedDocId(docDetail.document.supersedes!)
                              }
                            >
                              <Text2 medium color={skinVars.colors.textLink}>
                                {titleOf(docDetail.document.supersedes)}
                              </Text2>
                            </Touchable>
                          </Inline>
                        )}
                        {(docDetail.document.lineageSourceDocIds ?? []).length >
                          0 && (
                          <Stack space={4}>
                            <Text1
                              regular
                              color={skinVars.colors.textSecondary}
                            >
                              {c.generatedFrom}
                            </Text1>
                            {(docDetail.document.lineageSourceDocIds ?? []).map(
                              (srcId) => (
                                <Touchable
                                  key={srcId}
                                  onPress={() => setSelectedDocId(srcId)}
                                >
                                  <Text2
                                    medium
                                    color={skinVars.colors.textLink}
                                  >
                                    {titleOf(srcId)}
                                  </Text2>
                                </Touchable>
                              ),
                            )}
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  </Boxed>
                )}
                {docDetail.document.ingestFilter && (
                  <Boxed>
                    <Box padding={16}>
                      <Stack space={8}>
                        <Text1
                          medium
                          color={skinVars.colors.textSecondary}
                          transform="uppercase"
                        >
                          {c.filterMatch(
                            sentimentLabel(
                              docDetail.document.ingestFilter.sentiment,
                            ),
                          )}
                        </Text1>
                        <Inline space={8} alignItems="center" wrap>
                          {docDetail.document.ingestFilter.keywords.map((k) => (
                            <Tag key={`kw-${k}`} type="info">
                              {c.keyword(k)}
                            </Tag>
                          ))}
                          {docDetail.document.ingestFilter.competitors.map(
                            (k) => (
                              <Tag key={`co-${k}`} type="warning">
                                {c.competitor(k)}
                              </Tag>
                            ),
                          )}
                          {docDetail.document.ingestFilter.executives.map(
                            (k) => (
                              <Tag key={`ex-${k}`} type="active">
                                {c.executive(k)}
                              </Tag>
                            ),
                          )}
                          {docDetail.document.ingestFilter.topics.map((k) => (
                            <Tag key={`to-${k}`} type="inactive">
                              {c.topic(k)}
                            </Tag>
                          ))}
                        </Inline>
                        <Text1 regular color={skinVars.colors.textSecondary}>
                          {c.filterNote}
                        </Text1>
                      </Stack>
                    </Box>
                  </Boxed>
                )}
              </Stack>

              <Divider />

              <Boxed>
                <Box padding={20}>
                  <Text2 regular color={skinVars.colors.textPrimary}>
                    {docDetail.document.summary}
                  </Text2>
                </Box>
              </Boxed>

              <Stack space={16}>
                <Text1
                  medium
                  color={skinVars.colors.textSecondary}
                  transform="uppercase"
                >
                  {c.chunksCount(docDetail.chunks.length)}
                </Text1>
                <Stack space={12}>
                  {docDetail.chunks.map((chunk, chunkIndex) => (
                    <Boxed key={chunk.id}>
                      <Box padding={16}>
                        <Stack space={8}>
                          {docDetail.document.sourceFormat ===
                            "Self-explanatory PPT" && (
                            <Tag type="inactive">
                              {c.slideLabel(
                                chunkIndex + 1,
                                docDetail.chunks.length,
                              )}
                            </Tag>
                          )}
                          <Text1
                            medium
                            color={skinVars.colors.textSecondary}
                            transform="uppercase"
                          >
                            {chunk.breadcrumb}
                          </Text1>
                          <Text3 medium color={skinVars.colors.textPrimary}>
                            {chunk.heading}
                          </Text3>
                          <ChunkText text={chunk.text} />
                        </Stack>
                      </Box>
                    </Boxed>
                  ))}
                </Stack>
              </Stack>
            </Stack>
          ) : (
            <Box paddingY={40}>
              <Stack space={16}>
                <Inline space={0} alignItems="center">
                  <Circle size={56} backgroundColor={skinVars.colors.errorLow}>
                    <IconCloseRegular size={28} color={skinVars.colors.error} />
                  </Circle>
                </Inline>
                <Title3>{c.failedToLoad}</Title3>
              </Stack>
            </Box>
          )}
        </Drawer>
      )}

      {editDoc && (
        <EditTagsDrawer doc={editDoc} onClose={() => setEditDoc(null)} />
      )}

      {uploadOpen && <UploadDrawer onClose={() => setUploadOpen(false)} />}
    </Stack>
  );
}
