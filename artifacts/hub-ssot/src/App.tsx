import React from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { trackActivity } from "@workspace/api-client-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeContextProvider, getTelefonicaSkin, skinVars } from "@telefonica/mistica";
import type { ThemeConfig } from "@telefonica/mistica";
import NotFound from "@/pages/not-found";
import { AppProvider } from "@/components/app-provider";
import { AuthGate } from "@/components/auth-gate";
import { AppLayout } from "@/components/layout";
import Home from "@/pages/home";
import Ask from "@/pages/ask";
import DataPage from "@/pages/data";
import AdminPage from "@/pages/admin";
import KpisPage from "@/pages/kpis";
import Planning from "@/pages/planning";
import Generate from "@/pages/generate";
import Wiki from "@/pages/wiki";
import BrandPage from "@/pages/brand";
import ObservatoryPage from "@/pages/observatory";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const misticaTheme: ThemeConfig = {
  skin: getTelefonicaSkin(),
  colorScheme: "light",
  i18n: { locale: "en-US", phoneNumberFormattingRegionCode: "ES" },
};

function GlobalStyles() {
  return (
    <style>{`
      body {
        font-family: 'Telefonica Sans', 'Hanken Grotesk', 'Helvetica', 'Arial', sans-serif;
        background-color: ${skinVars.colors.background};
      }
      input, textarea, pre, code {
        font: inherit;
      }
    `}</style>
  );
}

// Presence beacon: reports route changes immediately and, while the tab is
// visible, a heartbeat every 60s so the server can attribute time-on-page.
// Fire-and-forget — tracking must never disturb the user.
function ActivityBeacon() {
  const [location] = useLocation();
  const locationRef = React.useRef(location);
  locationRef.current = location;

  React.useEffect(() => {
    trackActivity({ kind: "page_view", page: location }).catch(() => {});
  }, [location]);

  React.useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        trackActivity({ kind: "heartbeat", page: locationRef.current }).catch(() => {});
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return null;
}

function Router() {
  return (
    <AppLayout>
      <ActivityBeacon />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/ask" component={Ask} />
        <Route path="/data" component={DataPage} />
        <Route path="/generate" component={Generate} />
        <Route path="/kpis" component={KpisPage} />
        <Route path="/planning" component={Planning} />
        <Route path="/wiki" component={Wiki} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/brand" component={BrandPage} />
        <Route path="/observatory" component={ObservatoryPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeContextProvider theme={misticaTheme}>
      <GlobalStyles />
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <AppProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </AppProvider>
        </AuthGate>
      </QueryClientProvider>
    </ThemeContextProvider>
  );
}

export default App;
