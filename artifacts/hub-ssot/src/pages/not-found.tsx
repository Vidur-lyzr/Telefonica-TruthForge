import React from "react";
import {
  Box,
  Boxed,
  Inline,
  Stack,
  Text3,
  Title2,
  skinVars,
  IconAlertRegular,
} from "@telefonica/mistica";
import { useApp } from "@/components/app-provider";
import { HOME_I18N } from "@/i18n/home";

export default function NotFound() {
  const { lang } = useApp();
  const t = HOME_I18N[lang];
  return (
    <Box padding={24}>
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 448 }}>
          <Boxed>
            <Box padding={24}>
              <Stack space={16}>
                <Inline space={8} alignItems="center">
                  <IconAlertRegular color={skinVars.colors.error} />
                  <Title2>{t.notFound.title}</Title2>
                </Inline>
                <Text3 regular color={skinVars.colors.textSecondary}>
                  {t.notFound.body}
                </Text3>
              </Stack>
            </Box>
          </Boxed>
        </div>
      </div>
    </Box>
  );
}
