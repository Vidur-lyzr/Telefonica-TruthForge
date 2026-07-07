import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import PlaceholderPage from "@/pages/placeholder";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AppProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
