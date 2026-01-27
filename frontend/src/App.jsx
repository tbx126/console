import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/common/Navbar';
import Dashboard from './pages/Dashboard';
import FinancePage from './pages/FinancePage';
import TravelPage from './pages/TravelPage';
import PortfolioPage from './pages/PortfolioPage';
import SettingsPage from './pages/SettingsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import GamingPage from './pages/GamingPage';

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
        <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/travel" element={<TravelPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/gaming" element={<GamingPage />} />
        <Route path="/ai-assistant" element={<AIAssistantPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
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
