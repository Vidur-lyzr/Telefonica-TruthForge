import React, { useState } from "react";
import {
  useGetAgentOverview,
  useGetAgentTools,
  useListAgentFiles,
  useGetAgentFile,
  getGetAgentFileQueryKey,
} from "@workspace/api-client-react";
import {
  Box,
  Boxed,
  Stack,
  Inline,
  Grid,
  Divider,
  Table,
  Tag,
  Callout,
  ButtonLink,
  Text1,
  Text2,
  Text3,
  Title3,
  skinVars,
  IconRobotRegular,
  IconInformationUserRegular,
  IconAlertRegular,
} from "@telefonica/mistica";
import { useApp } from "@/components/app-provider";
import { ADMIN_I18N, localeFor } from "@/i18n/admin";

// Everything on this tab is read live from the agent repo on disk via the
// /admin/agent/* endpoints — nothing is hardcoded in the frontend.

function formatBytes(size: number, locale: string): string {
  if (size < 1024) return `${size} B`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(size / 1024)} KB`;
}

function LabelValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack space={2}>
      <Text1 regular color={skinVars.colors.textSecondary}>
        {label}
      </Text1>
      <Text2 medium color={skinVars.colors.textPrimary}>
        {value}
      </Text2>
    </Stack>
  );
}

export default function AgentSection(): React.JSX.Element {
  const { lang, roleId } = useApp();
  const t = ADMIN_I18N[lang].agent;
  const locale = localeFor(lang);

  const overviewQuery = useGetAgentOverview(
    { roleId },
    { query: { enabled: roleId.length > 0, queryKey: ["agent-overview", roleId] } },
  );
  const toolsQuery = useGetAgentTools(
    { roleId },
    { query: { enabled: roleId.length > 0, queryKey: ["agent-tools", roleId] } },
  );
  const filesQuery = useListAgentFiles(
    { roleId },
    { query: { enabled: roleId.length > 0, queryKey: ["agent-files", roleId] } },
  );

  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const fileParams = { path: selectedPath ?? "", roleId };
  const fileQuery = useGetAgentFile(fileParams, {
    query: {
      queryKey: getGetAgentFileQueryKey(fileParams),
      enabled: Boolean(selectedPath) && Boolean(roleId),
      retry: false,
    },
  });

  const overview = overviewQuery.data;
  const tools = toolsQuery.data?.tools ?? [];
  const files = filesQuery.data?.files ?? [];
  const rootLabel = filesQuery.data?.rootLabel ?? "";

  const fileError = fileQuery.error as
    | { status?: number; data?: { error?: string; code?: string } }
    | null;
  const fileRestricted =
    fileError != null &&
    (fileError.status === 403 || fileError.data?.code === "agent_repo_restricted");

  if (overviewQuery.isError || toolsQuery.isError || filesQuery.isError) {
    return (
      <Callout
        variant="default"
        asset={<IconAlertRegular color={skinVars.colors.error} />}
        title={t.title}
        description={t.loadError}
      />
    );
  }

  if (!overview) {
    return (
      <Box paddingY={24}>
        <Text2 regular color={skinVars.colors.textSecondary}>
          …
        </Text2>
      </Box>
    );
  }

  return (
    <Stack space={24}>
      <Stack space={8}>
        <Inline space={8} alignItems="center">
          <IconRobotRegular size={20} color={skinVars.colors.brand} />
          <Title3>{t.title}</Title3>
        </Inline>
        <Text2 regular color={skinVars.colors.textSecondary}>
          {t.intro}
        </Text2>
      </Stack>

      <Grid columns={3} gap={16}>
        <Boxed>
          <Box padding={16}>
            <Stack space={12}>
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                {t.identity}
              </Text1>
              <LabelValue label={overview.name} value={overview.description} />
              <Inline space={8}>
                <Tag type="active">{`${t.gapSpec} ${overview.specVersion}`}</Tag>
                <Tag type="inactive">{`v${overview.version}`}</Tag>
              </Inline>
              <LabelValue label={t.brainDir} value={overview.brainDir} />
            </Stack>
          </Box>
        </Boxed>

        <Boxed>
          <Box padding={16}>
            <Stack space={12}>
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                {t.modelHeading}
              </Text1>
              <LabelValue label={t.modelHeading} value={overview.model.preferred} />
              <Inline space={16}>
                <LabelValue
                  label={t.temperature}
                  value={new Intl.NumberFormat(locale).format(
                    overview.model.temperature,
                  )}
                />
                <LabelValue
                  label={t.maxTokens}
                  value={new Intl.NumberFormat(locale).format(
                    overview.model.maxTokens,
                  )}
                />
              </Inline>
              <Divider />
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                {t.sessionHeading}
              </Text1>
              {overview.session ? (
                <Stack space={4}>
                  <Text2 medium color={skinVars.colors.textPrimary}>
                    {overview.session.sessionId}
                  </Text2>
                  <Text1 regular color={skinVars.colors.textSecondary}>
                    {`${t.startedAt}: ${new Date(overview.session.startedAt).toLocaleString(locale)}`}
                  </Text1>
                </Stack>
              ) : (
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {t.sessionNone}
                </Text1>
              )}
            </Stack>
          </Box>
        </Boxed>

        <Boxed>
          <Box padding={16}>
            <Stack space={12}>
              <Text1
                medium
                color={skinVars.colors.textSecondary}
                transform="uppercase"
              >
                {t.runtimeHeading}
              </Text1>
              <Inline space={16}>
                <LabelValue
                  label={t.maxTurns}
                  value={String(overview.runtime.maxTurns)}
                />
                <LabelValue
                  label={t.timeoutSeconds}
                  value={`${overview.runtime.timeoutSeconds}s`}
                />
              </Inline>
              <LabelValue
                label={t.permissionBinding}
                value={overview.runtime.permissionBinding}
              />
              <Inline space={16}>
                <LabelValue
                  label={t.citationRequired}
                  value={overview.runtime.citationRequired ? t.yes : t.no}
                />
                <LabelValue label={t.trace} value={overview.runtime.trace} />
              </Inline>
              <Stack space={4}>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {t.disallowedTools}
                </Text1>
                <Inline space={8}>
                  {overview.runtime.disallowedTools.map((tool) => (
                    <Tag key={tool} type="error">
                      {tool}
                    </Tag>
                  ))}
                </Inline>
              </Stack>
              <Stack space={4}>
                <Text1 regular color={skinVars.colors.textSecondary}>
                  {t.honestStates}
                </Text1>
                <Inline space={8}>
                  {overview.runtime.honestStates.map((state) => (
                    <Tag key={state} type="warning">
                      {state}
                    </Tag>
                  ))}
                </Inline>
              </Stack>
            </Stack>
          </Box>
        </Boxed>
      </Grid>

      <Stack space={12}>
        <Title3>{t.skillsHeading}</Title3>
        <Table
          fullWidth
          heading={[t.colSkill, t.colLoadWhen, t.colBody]}
          content={overview.skills.map((skill) => [
            skill.id,
            skill.loadWhen ?? "—",
            skill.bodyPath,
          ])}
        />
      </Stack>

      <Stack space={12}>
        <Title3>{t.toolsHeading}</Title3>
        <Text1 regular color={skinVars.colors.textSecondary}>
          {t.toolsNote}
        </Text1>
        <Table
          fullWidth
          heading={[t.colTool, t.colOrigin, t.colDescription]}
          content={tools.map((tool) => [
            tool.name,
            tool.origin === "injected" ? t.originInjected : t.originDeclared,
            tool.description,
          ])}
        />
      </Stack>

      <Stack space={12}>
        <Title3>{`${t.filesHeading}${rootLabel ? ` — ${rootLabel}` : ""}`}</Title3>
        <Callout
          variant="default"
          asset={<IconInformationUserRegular color={skinVars.colors.brand} />}
          title=""
          description={t.filesNote}
        />
        <Grid columns={2} gap={16}>
          <Boxed>
            <Box padding={16}>
              <Stack space={8}>
                {files.map((file) => (
                  <Inline key={file.path} space="between" alignItems="center">
                    <ButtonLink
                      small
                      onPress={() => setSelectedPath(file.path)}
                    >
                      {file.path}
                    </ButtonLink>
                    <Text1 regular color={skinVars.colors.textSecondary}>
                      {formatBytes(file.size, locale)}
                    </Text1>
                  </Inline>
                ))}
              </Stack>
            </Box>
          </Boxed>
          <Boxed>
            <Box padding={16}>
              {selectedPath == null ? (
                <Text2 regular color={skinVars.colors.textSecondary}>
                  {t.selectFile}
                </Text2>
              ) : fileRestricted ? (
                <Callout
                  variant="default"
                  asset={<IconAlertRegular color={skinVars.colors.error} />}
                  title={t.restricted}
                  description={fileError?.data?.error ?? t.filesNote}
                />
              ) : fileQuery.isError ? (
                <Callout
                  variant="default"
                  asset={<IconAlertRegular color={skinVars.colors.error} />}
                  title=""
                  description={t.loadError}
                />
              ) : fileQuery.data ? (
                <Stack space={8}>
                  <Inline space="between" alignItems="center">
                    <Text3 medium color={skinVars.colors.textPrimary}>
                      {fileQuery.data.path}
                    </Text3>
                    <Text1 regular color={skinVars.colors.textSecondary}>
                      {formatBytes(fileQuery.data.size, locale)}
                    </Text1>
                  </Inline>
                  {fileQuery.data.truncated && (
                    <Text1 regular color={skinVars.colors.textSecondary}>
                      {t.truncatedNote}
                    </Text1>
                  )}
                  <pre
                    style={{
                      margin: 0,
                      padding: 12,
                      background: skinVars.colors.backgroundAlternative,
                      borderRadius: 8,
                      maxHeight: 480,
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: skinVars.colors.textPrimary,
                    }}
                  >
                    {fileQuery.data.content}
                  </pre>
                </Stack>
              ) : (
                <Text2 regular color={skinVars.colors.textSecondary}>
                  …
                </Text2>
              )}
            </Box>
          </Boxed>
        </Grid>
      </Stack>
    </Stack>
  );
}
