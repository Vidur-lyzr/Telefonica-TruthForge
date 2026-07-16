import React from "react";
import {
  skinVars,
  Stack,
  Box,
  Text2,
  Text5,
  EmailField,
  PasswordField,
  ButtonPrimary,
  Callout,
  IconShieldRegular,
  IconLockClosedRegular,
  Spinner,
} from "@telefonica/mistica";
import { useGetAuthMe, useLogin } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

function LoginPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const login = useLogin();

  const submit = () => {
    if (!email.trim() || !password) return;
    setError(null);
    login.mutate(
      { data: { email: email.trim(), password } },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries();
        },
        onError: (err: unknown) => {
          const status = (err as { status?: number })?.status;
          setError(
            status === 429
              ? "Too many attempts. Please wait a few minutes and try again."
              : "Invalid email or password.",
          );
        },
      },
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: skinVars.colors.background,
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Stack space={24}>
          <Stack space={8}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconShieldRegular size={28} color={skinVars.colors.brand} />
              <Text5 color={skinVars.colors.textPrimary}>Hub SSoT</Text5>
            </div>
            <Text2 regular color={skinVars.colors.textSecondary}>
              Governed Single Source of Truth. Access is restricted to
              authorized Telefónica, Accenture and Lyzr team members.
            </Text2>
          </Stack>
          <div
            style={{
              backgroundColor: skinVars.colors.backgroundContainer,
              border: `1px solid ${skinVars.colors.divider}`,
              borderRadius: skinVars.borderRadii.container,
            }}
          >
            <Box padding={24}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <Stack space={16}>
                  <EmailField
                    name="email"
                    label="Work email"
                    value={email}
                    onChangeValue={setEmail}
                    fullWidth
                    autoComplete="username"
                  />
                  <PasswordField
                    name="password"
                    label="Password"
                    value={password}
                    onChangeValue={setPassword}
                    fullWidth
                    autoComplete="current-password"
                  />
                  {error && (
                    <Callout
                      asset={<IconLockClosedRegular color={skinVars.colors.error} />}
                      title=""
                      description={error}
                    />
                  )}
                  <ButtonPrimary
                    submit
                    disabled={!email.trim() || !password || login.isPending}
                  >
                    {login.isPending ? "Signing in…" : "Sign in"}
                  </ButtonPrimary>
                </Stack>
              </form>
            </Box>
          </div>
          <Text2 regular color={skinVars.colors.textSecondary}>
            Access credentials are distributed individually. Contact the
            platform owner if you need access.
          </Text2>
        </Stack>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const me = useGetAuthMe();

  if (me.isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spinner size={32} />
      </div>
    );
  }

  if (!me.data) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
