import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { logError } from "@/lib/telemetry";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProfileProvider } from "@/hooks/useProfile";
import { AndroidBackButtonHandler } from "@/components/AndroidBackButtonHandler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageSkeleton } from "@/components/PageSkeleton";
import { DevToolbar } from "@/components/DevToolbar";
import { isDevMode } from "@/lib/testMode";
import Landing from "./pages/Landing";

// Lesotho National Breeding System — lazy-loaded routes
const Dashboard            = lazy(() => import("./pages/Dashboard"));
const Livestock            = lazy(() => import("./pages/Livestock"));
const Health               = lazy(() => import("./pages/Health"));
const Audit                = lazy(() => import("./pages/Audit"));
const DocumentVault        = lazy(() => import("./pages/DocumentVault"));
const Settings             = lazy(() => import("./pages/Settings"));
const Auth                 = lazy(() => import("./pages/Auth"));
const ResetPassword        = lazy(() => import("./pages/ResetPassword"));
const NotFound             = lazy(() => import("./pages/NotFound"));

// Lesotho-specific modules
const BreedingExpertDashboard = lazy(() => import("./pages/BreedingExpertDashboard"));
const CullingExchange         = lazy(() => import("./pages/CullingExchange"));
const RFIDSettings            = lazy(() => import("./pages/RFIDSettings"));
const WoahReports             = lazy(() => import("./pages/WoahReports"));
const FarmersRegistry         = lazy(() => import("./pages/FarmersRegistry"));
const BreedingRecordsPage     = lazy(() => import("./pages/BreedingRecordsPage"));
const ReproductiveIndices     = lazy(() => import("./pages/ReproductiveIndices"));
const UserManagement          = lazy(() => import("./pages/UserManagement"));
const EmployeeTasks           = lazy(() => import("./pages/EmployeeTasks"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      const msg = error instanceof Error ? error.message : String(error);
      void logError({
        message: msg,
        stack: error instanceof Error ? error.stack : null,
        source: "react-query.query",
        severity: "warning",
        context: { queryKey: query.queryKey as unknown as Record<string, unknown> },
      });
      if (query.state.data !== undefined) {
        toast.error("Something went wrong loading data. Please try again.");
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      const msg = error instanceof Error ? error.message : String(error);
      void logError({
        message: msg,
        stack: error instanceof Error ? error.stack : null,
        source: "react-query.mutation",
        context: { mutationKey: (mutation.options.mutationKey ?? null) as unknown as Record<string, unknown> },
      });
      toast.error(msg || "Action failed. Please try again.");
    },
  }),
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProfileProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  {/* Public */}
                  <Route path="/"              element={<Landing />} />
                  <Route path="/auth"          element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Core operations */}
                  <Route path="/dashboard"    element={<Dashboard />} />
                  <Route path="/livestock"    element={<Livestock />} />
                  <Route path="/health"       element={<Health />} />
                  <Route path="/audit"        element={<Audit />} />
                  <Route path="/documents"    element={<DocumentVault />} />
                  <Route path="/settings"     element={<Settings />} />
                  <Route path="/tasks"        element={<EmployeeTasks />} />

                  {/* Lesotho National Breeding System modules */}
                  <Route path="/farmers"               element={<FarmersRegistry />} />
                  <Route path="/breeding"              element={<BreedingRecordsPage />} />
                  <Route path="/culling-exchange"      element={<CullingExchange />} />
                  <Route path="/breeding-dashboard"    element={<BreedingExpertDashboard />} />
                  <Route path="/reproductive-indices"  element={<ReproductiveIndices />} />
                  <Route path="/woah-reports"          element={<WoahReports />} />
                  <Route path="/rfid-settings"         element={<RFIDSettings />} />
                  <Route path="/users"                 element={<UserManagement />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <AndroidBackButtonHandler />
              {isDevMode && <DevToolbar />}
            </BrowserRouter>
          </TooltipProvider>
        </ProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
