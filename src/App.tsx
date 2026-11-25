import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';

const LandingPage = lazy(() => import('@/pages/LandingPage').then((module) => ({ default: module.LandingPage })));
const AuthPage = lazy(() => import('@/pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const GISExplorerPage = lazy(() => import('@/pages/GISExplorerPage').then((module) => ({ default: module.GISExplorerPage })));
const FarmsPage = lazy(() => import('@/pages/FarmsPage').then((module) => ({ default: module.FarmsPage })));
const CropManagementPage = lazy(() => import('@/pages/CropManagementPage').then((module) => ({ default: module.CropManagementPage })));
const IrrigationPage = lazy(() => import('@/pages/IrrigationPage').then((module) => ({ default: module.IrrigationPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-forest-500" role="status">Loading page...</div>}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="gis" element={<GISExplorerPage />} />
                  <Route path="farms" element={<FarmsPage />} />
                  <Route path="crops" element={<CropManagementPage />} />
                  <Route path="irrigation" element={<IrrigationPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
