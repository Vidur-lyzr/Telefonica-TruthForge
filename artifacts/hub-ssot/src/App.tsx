import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppProvider } from "@/components/app-provider";
import { AppLayout } from "@/components/layout";
import Ask from "@/pages/ask";
import DataPage from "@/pages/data";
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
        <Route path="/" component={Ask} />
        <Route path="/data" component={DataPage} />
        <Route path="/generate" component={PlaceholderPage} />
        <Route path="/kpis" component={PlaceholderPage} />
        <Route path="/planning" component={PlaceholderPage} />
        <Route path="/wiki" component={PlaceholderPage} />
        <Route path="/admin" component={PlaceholderPage} />
        <Route path="/brand" component={PlaceholderPage} />
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
