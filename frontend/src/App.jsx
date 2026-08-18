import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/common/Navbar';
import Dashboard from './pages/Dashboard';

const FinancePage = lazy(() => import('./pages/FinancePage'));
const TravelPage = lazy(() => import('./pages/TravelPage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'));
const GamingPage = lazy(() => import('./pages/GamingPage'));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
      Loading…
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
        <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/travel" element={<TravelPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/gaming" element={<GamingPage />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Suspense>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            borderRadius: '0.75rem',
            padding: '1rem',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#fff',
            },
          },
        }}
      />
      </div>
    </ThemeProvider>
  );
}

export default App;
