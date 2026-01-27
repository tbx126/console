import { useState, useEffect } from 'react';
import { Plus, Filter, RefreshCw } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/common/Modal';
import ExpenseForm from '../components/finance/ExpenseForm';
import ExpenseList from '../components/finance/ExpenseList';
import BudgetOverview from '../components/finance/BudgetOverview';
import SpendingChart from '../components/finance/SpendingChart';
import FinanceStats from '../components/finance/FinanceStats';
import ExpenseFilters from '../components/finance/ExpenseFilters';
import ExpenseToolbar from '../components/finance/ExpenseToolbar';
import financeApi from '../services/financeApi';

const CURRENCIES = ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'SGD'];
const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', CNY: '¥', JPY: '¥', GBP: '£', SGD: 'S$'
};

const FinancePage = () => {
  const [activeTab, setActiveTab] = useState('expenses');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [displayCurrency, setDisplayCurrency] = useState(() =>
    localStorage.getItem('displayCurrency') || 'CNY'
  );
  const [exchangeRates, setExchangeRates] = useState(null);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const currencySymbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;

  // Filter and search states
  const [filters, setFilters] = useState({
    dateRange: 'thisMonth',
    categories: [],
    minAmount: 0,
    maxAmount: 10000
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState('list');

  const handleExpenseSuccess = () => {
    setShowExpenseModal(false);
    setEditingExpense(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  const handleCloseModal = () => {
    setShowExpenseModal(false);
    setEditingExpense(null);
  };

  // 监听AI数据更新事件
  useEffect(() => {
    const handleDataUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('ai-data-updated', handleDataUpdate);
    return () => window.removeEventListener('ai-data-updated', handleDataUpdate);
  }, []);

  // 获取汇率
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const ratesData = await financeApi.getExchangeRates('USD');
        setExchangeRates(ratesData.rates);
      } catch (e) {
        console.error('Failed to fetch exchange rates:', e);
      }
    };
    fetchRates();
  }, []);

  // 刷新汇率
  const refreshRates = async () => {
    setRefreshingRates(true);
    try {
      const ratesData = await financeApi.getExchangeRates('USD');
      setExchangeRates(ratesData.rates);
    } catch (e) {
      console.error('Failed to refresh rates:', e);
    } finally {
      setRefreshingRates(false);
    }
  };

  // 切换货币
  const handleCurrencyChange = (currency) => {
    setDisplayCurrency(currency);
    localStorage.setItem('displayCurrency', currency);
  };

  // 货币转换函数
  const convertAmount = (amount, fromCurrency = 'USD') => {
    if (!exchangeRates || !amount) return amount;
    if (fromCurrency === displayCurrency) return amount;
    const fromRate = exchangeRates[fromCurrency] || 1;
    const toRate = exchangeRates[displayCurrency] || 1;
    return amount * (toRate / fromRate);
  };

  const tabs = [
    { id: 'expenses', label: 'Expenses' },
    { id: 'budget', label: 'Budget' },
    { id: 'charts', label: 'Charts' }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Page Header */}
      <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Finance</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Track your expenses and budgets</p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-2">
                <select
                  value={displayCurrency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="px-3 py-2 border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshRates}
                  disabled={refreshingRates}
                  className="rounded-xl"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshingRates ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <Button onClick={() => setShowExpenseModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-6 py-6">
        <FinanceStats
          refresh={refreshKey}
          displayCurrency={displayCurrency}
          currencySymbol={currencySymbol}
          exchangeRates={exchangeRates}
        />
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="container mx-auto px-6">
          <nav className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters - Desktop */}
          {activeTab === 'expenses' && (
            <div className="hidden md:block">
              <ExpenseFilters
                filters={filters}
                onFilterChange={setFilters}
                currencySymbol={currencySymbol}
                categories={[
                  { id: 'food', name: 'Food & Dining' },
                  { id: 'transport', name: 'Transportation' },
                  { id: 'shopping', name: 'Shopping' },
                  { id: 'entertainment', name: 'Entertainment' },
                  { id: 'bills', name: 'Bills & Utilities' },
                  { id: 'health', name: 'Health & Fitness' },
                  { id: 'other', name: 'Other' }
                ]}
              />
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 space-y-6">
            {/* Toolbar for Expenses Tab */}
            {activeTab === 'expenses' && (
              <>
                {/* Mobile Filter Button */}
                <div className="md:hidden">
                  <Button
                    variant="outline"
                    onClick={() => setShowMobileFilters(true)}
                    className="w-full"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>

                <ExpenseToolbar
                  searchQuery={searchQuery}
                  sortBy={sortBy}
                  viewMode={viewMode}
                  onSearchChange={setSearchQuery}
                  onSortChange={setSortBy}
                  onViewModeChange={setViewMode}
                />
              </>
            )}

            {/* Tab Content */}
            {activeTab === 'expenses' && (
              <Card className="shadow-sm">
                <ExpenseList
                  refresh={refreshKey}
                  filters={filters}
                  searchQuery={searchQuery}
                  sortBy={sortBy}
                  viewMode={viewMode}
                  onEdit={handleEditExpense}
                  displayCurrency={displayCurrency}
                  currencySymbol={currencySymbol}
                  exchangeRates={exchangeRates}
                />
              </Card>
            )}

            {activeTab === 'budget' && (
              <Card className="shadow-sm">
                <BudgetOverview />
              </Card>
            )}

            {activeTab === 'charts' && (
              <Card className="shadow-sm">
                <SpendingChart />
              </Card>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showExpenseModal}
        onClose={handleCloseModal}
        title={editingExpense ? "Edit Expense" : "Add New Expense"}
      >
        <ExpenseForm
          expense={editingExpense}
          onSuccess={handleExpenseSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
};

export default FinancePage;
