import { useState, useCallback } from 'react';
import { Plus, Filter, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import portfolioApi from '../services/portfolioApi';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/common/Modal';
import InvestmentForm from '../components/portfolio/InvestmentForm';
import InvestmentList from '../components/portfolio/InvestmentList';
import PortfolioStats from '../components/portfolio/PortfolioStats';
import PortfolioCharts from '../components/portfolio/PortfolioCharts';
import InvestmentFilters from '../components/portfolio/InvestmentFilters';
import PortfolioToolbar from '../components/portfolio/PortfolioToolbar';
import { useAIDataRefresh } from '../hooks/useAIDataRefresh';

const PortfolioPage = () => {
  const [activeTab, setActiveTab] = useState('investments');
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and search states
  const [filters, setFilters] = useState({
    types: [],
    status: [],
    gainLoss: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('value-desc');
  const [viewMode, setViewMode] = useState('grid');
  const [refreshingAll, setRefreshingAll] = useState(false);

  const handleInvestmentSuccess = () => {
    setShowInvestmentModal(false);
    setEditingInvestment(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleEditInvestment = (investment) => {
    setEditingInvestment(investment);
    setShowInvestmentModal(true);
  };

  const handleCloseInvestmentModal = () => {
    setShowInvestmentModal(false);
    setEditingInvestment(null);
  };

  const handleDataUpdate = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);
  useAIDataRefresh(handleDataUpdate);

  const handleRefreshAllPrices = async () => {
    setRefreshingAll(true);
    try {
      const result = await portfolioApi.refreshAllPrices();
      if (result.updated.length > 0) {
        toast.success(`Updated ${result.updated.length} prices`);
        setRefreshKey(prev => prev + 1);
      }
      if (result.failed.length > 0) {
        toast.error(`Failed: ${result.failed.join(', ')}`);
      }
      if (result.updated.length === 0 && result.failed.length === 0) {
        toast('No investments to refresh');
      }
    } catch {
      toast.error('Failed to refresh prices');
    } finally {
      setRefreshingAll(false);
    }
  };

  const tabs = [
    { id: 'investments', label: 'Holdings' },
    { id: 'analytics', label: 'Analytics' }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Page Header */}
      <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Portfolio</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Manage your investments</p>
            </div>
            {activeTab === 'investments' && (
              <div className="flex gap-2 mt-1">
                <Button variant="outline" onClick={handleRefreshAllPrices} disabled={refreshingAll}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshingAll ? 'animate-spin' : ''}`} />
                  Refresh Prices
                </Button>
                <Button onClick={() => setShowInvestmentModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Investment
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="container mx-auto px-4">
          <nav className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-violet-600 text-violet-600'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto px-4 py-6">
        {activeTab === 'investments' && (
          <div className="flex gap-6">
            {/* Sidebar Filters - Desktop */}
            <div className="hidden lg:block">
              <InvestmentFilters
                filters={filters}
                onFilterChange={setFilters}
              />
            </div>

            {/* Main Content */}
            <div className="flex-1 space-y-4">
              {/* Mobile Filter Button */}
              <div className="lg:hidden">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
              </div>

              {/* Mobile Filters */}
              {showFilters && (
                <div className="lg:hidden">
                  <InvestmentFilters
                    filters={filters}
                    onFilterChange={setFilters}
                  />
                </div>
              )}

              {/* Toolbar */}
              <PortfolioToolbar
                searchQuery={searchQuery}
                sortBy={sortBy}
                viewMode={viewMode}
                onSearchChange={setSearchQuery}
                onSortChange={setSortBy}
                onViewModeChange={setViewMode}
              />

              {/* Investment List */}
              <InvestmentList
                refresh={refreshKey}
                filters={filters}
                searchQuery={searchQuery}
                sortBy={sortBy}
                viewMode={viewMode}
                onEdit={handleEditInvestment}
              />
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <PortfolioStats refresh={refreshKey} />
            <PortfolioCharts refresh={refreshKey} />
          </div>
        )}
      </div>

      {/* Investment Modal */}
      <Modal
        isOpen={showInvestmentModal}
        onClose={handleCloseInvestmentModal}
        title={editingInvestment ? "Edit Investment" : "Add New Investment"}
      >
        <InvestmentForm
          investment={editingInvestment}
          onSuccess={handleInvestmentSuccess}
          onCancel={handleCloseInvestmentModal}
        />
      </Modal>
    </div>
  );
};

export default PortfolioPage;
