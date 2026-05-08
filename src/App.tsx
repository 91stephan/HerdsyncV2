import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { FarmProvider } from "@/hooks/useFarm";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { EmployeePermissionsProvider } from "@/hooks/useEmployeePermissions";
import { SupportChat } from "@/components/SupportChat";
import { AndroidBackButtonHandler } from "@/components/AndroidBackButtonHandler";
import { useKeyboardScroll } from "@/hooks/useKeyboardScroll";
import { CookieConsent } from "@/components/CookieConsent";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageSkeleton } from "@/components/PageSkeleton";
import Landing from "./pages/Landing";
import { AdminProvider } from "@/hooks/useAdmin";

// Lazy-loaded routes — keeps the initial bundle small (especially on mobile)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Livestock = lazy(() => import("./pages/Livestock"));
const Feeding = lazy(() => import("./pages/Feeding"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Health = lazy(() => import("./pages/Health"));
const Reports = lazy(() => import("./pages/Reports"));
const Tracking = lazy(() => import("./pages/Tracking"));
const Audit = lazy(() => import("./pages/Audit"));
const Auth = lazy(() => import("./pages/Auth"));
const MarketArea = lazy(() => import("./pages/MarketArea"));
const ComplianceDashboard = lazy(() => import("./pages/ComplianceDashboard"));
const DocumentVault = lazy(() => import("./pages/DocumentVault"));
const LabourOHS = lazy(() => import("./pages/LabourOHS"));
const ChemicalsRemedies = lazy(() => import("./pages/ChemicalsRemedies"));
const AuditPackBuilder = lazy(() => import("./pages/AuditPackBuilder"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Employees = lazy(() => import("./pages/Employees"));
const EmployeeTasks = lazy(() => import("./pages/EmployeeTasks"));
const AnimalSale = lazy(() => import("./pages/AnimalSale"));
const FarmExpenses = lazy(() => import("./pages/FarmExpenses"));
const Contact = lazy(() => import("./pages/Contact"));
const About = lazy(() => import("./pages/About"));
const Terms = lazy(() => import("./pages/Terms"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const AskAPro = lazy(() => import("./pages/AskAPro"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Settings = lazy(() => import("./pages/Settings"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TrialExpired = lazy(() => import("./pages/TrialExpired"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const queryClient = new QueryClient();

const AppShell = () => {
  useKeyboardScroll();
  return null;
};

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <FarmProvider>
        <SubscriptionProvider>
         <AdminProvider>
           <EmployeePermissionsProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/livestock" element={<Livestock />} />
                  <Route path="/feeding" element={<Feeding />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/health" element={<Health />} />
                  <Route path="/audit" element={<Audit />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/tracking" element={<Tracking />} />
                  <Route path="/market" element={<MarketArea />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/compliance" element={<ComplianceDashboard />} />
                  <Route path="/compliance/audit-pack" element={<AuditPackBuilder />} />
                  <Route path="/compliance/documents" element={<DocumentVault />} />
                  <Route path="/compliance/labour-ohs" element={<LabourOHS />} />
                  <Route path="/compliance/chemicals" element={<ChemicalsRemedies />} />
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/employee-tasks" element={<EmployeeTasks />} />
                  <Route path="/animal-sale" element={<AnimalSale />} />
                  <Route path="/expenses" element={<FarmExpenses />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/disclaimer" element={<Disclaimer />} />
                  <Route path="/ask-a-pro" element={<AskAPro />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/trial-expired" element={<TrialExpired />} />
                  <Route path="/delete-account" element={<DeleteAccount />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <SupportChat />
                <CookieConsent />
                <AndroidBackButtonHandler />
                <AppShell />
              </BrowserRouter>
            </TooltipProvider>
           </EmployeePermissionsProvider>
         </AdminProvider>
        </SubscriptionProvider>
      </FarmProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
