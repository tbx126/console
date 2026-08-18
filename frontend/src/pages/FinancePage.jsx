import { useState, useEffect, useCallback } from 'react';
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
import { CURRENCIES, getCurrencySymbol } from '../lib/currency';
import { useAIDataRefresh } from '../hooks/useAIDataRefresh';

const expenseCategories = [
  { id: 'food', name: 'Food & Dining' },
  { id: 'transport', name: 'Transportation' },
  { id: 'shopping', name: 'Shopping' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'bills', name: 'Bills & Utilities' },
  { id: 'health', name: 'Health & Fitness' },
  { id: 'other', name: 'Other' }
];

const tabs = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'budget', label: 'Budget' },
  { id: 'charts', label: 'Charts' }
];

const FinancePage = () => {
  const [activeTab, setActiveTab] = useState('expenses');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [displayCurrency, setDisplayCurrency] = useState(() => localStorage.getItem('displayCurrency') || 'CNY');
  const [exchangeRates, setExchangeRates] = useState(null);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'thisMonth',
    categories: [],
    minAmount: 0,
    maxAmount: null
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState('list');

  const currencySymbol = getCurrencySymbol(displayCurrency);

  const handleExpenseSuccess = () => {
    setShowExpenseModal(false);
    setEditingExpense(null);
    setRefreshKey((previous) => previous + 1);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  const handleCloseModal = () => {
    setShowExpenseModal(false);
    setEditingExpense(null);
  };

  const handleDataUpdate = useCallback(() => {
    setRefreshKey((previous) => previous + 1);
  }, []);

  useAIDataRefresh(handleDataUpdate);

  useEffect(() => {
    let cancelled = false;

    const fetchRates = async () => {
      try {
        const ratesData = await financeApi.getExchangeRates('USD');
        if (!cancelled) {
          setExchangeRates(ratesData.rates);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
      }
    };

    void fetchRates();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshRates = async () => {
    setRefreshingRates(true);

    try {
      const ratesData = await financeApi.getExchangeRates('USD');
      setExchangeRates(ratesData.rates);
    } catch (error) {
      console.error('Failed to refresh rates:', error);
    } finally {
      setRefreshingRates(false);
    }
  };

  const handleCurrencyChange = (currency) => {
    setDisplayCurrency(currency);
    localStorage.setItem('displayCurrency', currency);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
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
                  onChange={(event) => handleCurrencyChange(event.target.value)}
                  className="px-3 py-2 border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>{currency}</option>
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

      <div className="container mx-auto px-6 py-6">
        <FinanceStats
          refresh={refreshKey}
          displayCurrency={displayCurrency}
          currencySymbol={currencySymbol}
          exchangeRates={exchangeRates}
        />
      </div>

      <div className="bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="container mx-auto px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
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

      <div className="container mx-auto px-6 py-6">
        <div className="flex gap-6">
          {activeTab === 'expenses' && (
            <div className="hidden md:block">
              <ExpenseFilters
                filters={filters}
                onFilterChange={setFilters}
                currencySymbol={currencySymbol}
                categories={expenseCategories}
              />
            </div>
          )}

          <div className="flex-1 space-y-6">
            {activeTab === 'expenses' && (
              <>
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
                <BudgetOverview refresh={refreshKey} currencySymbol={currencySymbol} />
              </Card>
            )}

            {activeTab === 'charts' && (
              <Card className="shadow-sm">
                <SpendingChart refresh={refreshKey} currencySymbol={currencySymbol} />
              </Card>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showExpenseModal}
        onClose={handleCloseModal}
        title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
      >
        <ExpenseForm
          expense={editingExpense}
          onSuccess={handleExpenseSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>

      <Modal
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        title="Expense Filters"
      >
        <ExpenseFilters
          filters={filters}
          onFilterChange={setFilters}
          currencySymbol={currencySymbol}
          categories={expenseCategories}
        />
      </Modal>
    </div>
  );
};

export default FinancePage;
