import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeContextProvider, getTelefonicaSkin, skinVars } from "@telefonica/mistica";
import type { ThemeConfig } from "@telefonica/mistica";
import NotFound from "@/pages/not-found";
import { AppProvider } from "@/components/app-provider";
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

function Router() {
  return (
    <AppLayout>
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
        <AppProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AppProvider>
      </QueryClientProvider>
    </ThemeContextProvider>
  );
}

export default App;
