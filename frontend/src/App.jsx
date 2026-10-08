import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import AppShell from './components/layout/AppShell';
import { Toaster } from './components/shadcn/sonner';
import Dashboard from './pages/Dashboard';

const TravelPage = lazy(() => import('./pages/TravelPage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'));
const GamingPage = lazy(() => import('./pages/GamingPage'));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      加载中…
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppShell>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/travel" element={<TravelPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/gaming" element={<GamingPage />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
