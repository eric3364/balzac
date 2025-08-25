import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import AlternativeIndex from "./pages/AlternativeIndex";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import Payment from "./pages/Payment";
import Test from "./pages/Test";
import SessionTest from "./pages/SessionTest";
import SessionProgress from "./pages/SessionProgress";
import Admin from "./pages/Admin";
import AdminAuth from "./pages/AdminAuth";
import NotFound from "./pages/NotFound";
import { LegalPage } from "./pages/LegalPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      {/* Toaster Sonner (notifications) */}
      <Toaster richColors position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/alternative" element={<AlternativeIndex />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/test" element={<Test />} />
          <Route path="/session-test" element={<SessionTest />} />
          <Route path="/session-progress" element={<SessionProgress />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin-auth" element={<AdminAuth />} />
          <Route path="/legal/:slug" element={<LegalPage />} />
          {/* catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
