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

export default function NotFound() {
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
                  <Title2>404 page not found</Title2>
                </Inline>
                <Text3 regular color={skinVars.colors.textSecondary}>
                  Did you forget to add the page to the router?
                </Text3>
              </Stack>
            </Box>
          </Boxed>
        </div>
      </div>
    </Box>
  );
}
