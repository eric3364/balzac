import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/hooks/useAuth';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';

// Pages
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import AuthCallback from '@/pages/AuthCallback';
import SetPassword from '@/pages/SetPassword';
import Dashboard from '@/pages/Dashboard';
import Admin from '@/pages/Admin';
import AdminAuth from '@/pages/AdminAuth';
import Test from '@/pages/Test';
import SessionTest from '@/pages/SessionTest';
import SessionProgress from '@/pages/SessionProgress';
import Payment from '@/pages/Payment';
import Pricing from '@/pages/Pricing';
import { LegalPage } from '@/pages/LegalPage';
import VerifyCertification from '@/pages/VerifyCertification';
import AlternativeIndex from '@/pages/AlternativeIndex';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-background font-sans antialiased">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/set-password" element={<SetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />

                <Route path="/admin" element={<Admin />} />
                {/* si tu gardes une page d'auth admin dédiée */}
                <Route path="/admin/auth" element={<AdminAuth />} />

                {/* compat : toute tentative vers /admin-auth redirige vers /auth */}
                <Route path="/admin-auth" element={<Navigate to="/auth" replace />} />

                <Route path="/test" element={<Test />} />
                <Route path="/session-test" element={<SessionTest />} />
                <Route path="/session-progress" element={<SessionProgress />} />
                <Route path="/payment" element={<Payment />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/legal/:slug" element={<LegalPage />} />
                <Route path="/verify-certification" element={<VerifyCertification />} />
                <Route path="/alternative" element={<AlternativeIndex />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <Toaster />
            <Sonner />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
