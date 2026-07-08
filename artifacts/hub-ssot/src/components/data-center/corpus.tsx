import React from "react";
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
  skinVars,
  IconDatabaseRegular,
  IconWorldDeviceRegular,
  IconShieldRegular,
  IconDocumentOtherRegular,
  IconCheckedRegular,
  IconCloseRegular,
} from "@telefonica/mistica";

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
            <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
              {label}
            </Text1>
            <Text7>{value}</Text7>
          </Stack>
        </Inline>
      </Box>
    </Boxed>
  );
}

export default function CorpusArea() {
  const { data: stats } = useGetCorpusStats();
  const { data: documents } = useListDocuments();
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(null);

  const { data: docDetail, isLoading: isLoadingDetail } = useGetDocument(selectedDocId || "", {
    query: { enabled: !!selectedDocId, queryKey: ["document", selectedDocId] },
  });

  return (
    <Stack space={24}>
      <Grid columns={4} gap={16}>
        <GridItem>
          <StatCard
            icon={IconDatabaseRegular}
            iconColor={skinVars.colors.brand}
            iconBackground={skinVars.colors.brandLow}
            label="Total documents"
            value={stats?.totalDocuments || 0}
          />
        </GridItem>
        <GridItem>
          <StatCard
            icon={IconCheckedRegular}
            iconColor={skinVars.colors.success}
            iconBackground={skinVars.colors.successLow}
            label="Total chunks"
            value={stats?.totalChunks || 0}
          />
        </GridItem>
        <GridItem>
          <StatCard
            icon={IconWorldDeviceRegular}
            iconColor={skinVars.colors.warning}
            iconBackground={skinVars.colors.warningLow}
            label="Countries"
            value={stats?.byCountry?.length || 0}
          />
        </GridItem>
        <GridItem>
          <StatCard
            icon={IconShieldRegular}
            iconColor={skinVars.colors.error}
            iconBackground={skinVars.colors.errorLow}
            label="Needs review"
            value={stats?.quarantined || 0}
          />
        </GridItem>
      </Grid>

      <Stack space={16}>
        <Inline space={8} alignItems="center">
          <IconDocumentOtherRegular size={20} color={skinVars.colors.brand} />
          <Title2>Governed corpus</Title2>
        </Inline>

        <BoxedRowList>
          {(documents ?? []).map((doc) => (
            <BoxedRow
              key={doc.id}
              title={doc.title}
              description={`${doc.brand} · ${doc.chunkCount} chunks · ${doc.sourceFormat} · via ${doc.connector} · ${doc.language.toUpperCase()}`}
              onPress={() => setSelectedDocId(doc.id)}
              right={
                <Inline space={8} alignItems="center">
                  {doc.ingestFilter && (
                    <Tag type={doc.ingestFilter.sentiment === "negative" ? "warning" : "info"}>
                      {`filtered · ${doc.ingestFilter.sentiment}`}
                    </Tag>
                  )}
                  {doc.version && <Tag type="info">{doc.version}</Tag>}
                  <Tag type={doc.confidentiality === "public" ? "inactive" : "error"}>
                    {doc.confidentiality}
                  </Tag>
                  <Tag type={doc.validity === "approved" ? "success" : "inactive"}>
                    {doc.validity}
                  </Tag>
                </Inline>
              }
            />
          ))}
        </BoxedRowList>
      </Stack>

      {selectedDocId && (
        <Drawer
          onClose={() => setSelectedDocId(null)}
          title={docDetail?.document.title ?? "Document"}
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
                <Tag type="info">{docDetail.document.type}</Tag>
                <Inline space={8} alignItems="center">
                  <Tag type={docDetail.document.validity === "approved" ? "success" : "inactive"}>
                    {docDetail.document.validity}
                  </Tag>
                  <Tag type={docDetail.document.confidentiality === "public" ? "inactive" : "error"}>
                    {docDetail.document.confidentiality}
                  </Tag>
                </Inline>
              </Inline>
              <Inline space={16} alignItems="center" wrap>
                <Text2 regular color={skinVars.colors.textPrimary}>
                  {docDetail.document.country} • {docDetail.document.brand}
                </Text2>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  Owner: {docDetail.document.owner}
                </Text2>
              </Inline>
              <Inline space={16} alignItems="center" wrap>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  Format: {docDetail.document.sourceFormat}
                </Text2>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  Source: {docDetail.document.connector}
                </Text2>
                <Text2 regular color={skinVars.colors.textSecondary}>
                  Language: {docDetail.document.language.toUpperCase()}
                </Text2>
                {docDetail.document.frequency && (
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    Refresh: {docDetail.document.frequency}
                  </Text2>
                )}
                {docDetail.document.version && (
                  <Text2 regular color={skinVars.colors.textSecondary}>
                    Version: {docDetail.document.version}
                  </Text2>
                )}
              </Inline>
              {docDetail.document.ingestFilter && (
                <Boxed>
                  <Box padding={16}>
                    <Stack space={8}>
                      <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                        Pre-ingest filter match · {docDetail.document.ingestFilter.sentiment} mentions
                      </Text1>
                      <Inline space={8} alignItems="center" wrap>
                        {docDetail.document.ingestFilter.keywords.map((k) => (
                          <Tag key={`kw-${k}`} type="info">{`keyword: ${k}`}</Tag>
                        ))}
                        {docDetail.document.ingestFilter.competitors.map((k) => (
                          <Tag key={`co-${k}`} type="warning">{`competitor: ${k}`}</Tag>
                        ))}
                        {docDetail.document.ingestFilter.executives.map((k) => (
                          <Tag key={`ex-${k}`} type="active">{`executive: ${k}`}</Tag>
                        ))}
                        {docDetail.document.ingestFilter.topics.map((k) => (
                          <Tag key={`to-${k}`} type="inactive">{`topic: ${k}`}</Tag>
                        ))}
                      </Inline>
                      <Text1 regular color={skinVars.colors.textSecondary}>
                        Only material matching the configured keyword, competitor, executive and
                        topic filters was ingested — never a raw dump.
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
              <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                Document chunks ({docDetail.chunks.length})
              </Text1>
              <Stack space={12}>
                {docDetail.chunks.map((chunk) => (
                  <Boxed key={chunk.id}>
                    <Box padding={16}>
                      <Stack space={8}>
                        <Text1 medium color={skinVars.colors.textSecondary} transform="uppercase">
                          {chunk.breadcrumb}
                        </Text1>
                        <Text3 medium color={skinVars.colors.textPrimary}>
                          {chunk.heading}
                        </Text3>
                        <Text2 regular color={skinVars.colors.textSecondary}>
                          "{chunk.text}"
                        </Text2>
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
              <Title3>Failed to load document</Title3>
            </Stack>
          </Box>
        )}
        </Drawer>
      )}
    </Stack>
  );
}
