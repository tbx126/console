import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2, Edit } from 'lucide-react';
import financeApi from '../../services/financeApi';
import { convertAmount as convertCurrency, getCurrencySymbol } from '../../lib/currency';
import { isWithinDateRange } from '../../lib/dateFilters';

const ExpenseList = ({
  refresh,
  filters,
  searchQuery,
  sortBy,
  viewMode,
  onEdit,
  displayCurrency = 'CNY',
  currencySymbol = getCurrencySymbol(displayCurrency),
  exchangeRates
}) => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [expensesData, categoriesData] = await Promise.all([
        financeApi.getExpenses(),
        financeApi.getCategories()
      ]);

      setExpenses(expensesData);
      setCategories(categoriesData);
    } catch {
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData, refresh]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await financeApi.deleteExpense(id);
      await loadData();
    } catch {
      alert('Failed to delete expense');
    }
  };

  const getCategoryInfo = (categoryId) => {
    return categories.find((category) => category.id === categoryId) || {
      name: categoryId,
      icon: '?',
      color: '#6B7280'
    };
  };

  const getConvertedDisplay = (amount, fromCurrency = 'USD') => {
    if (!exchangeRates || !amount || fromCurrency === displayCurrency) {
      return null;
    }

    return convertCurrency(amount, fromCurrency, displayCurrency, exchangeRates);
  };

  const processedExpenses = useMemo(() => {
    let result = [...expenses];

    if (filters?.categories?.length > 0) {
      result = result.filter((expense) => filters.categories.includes(expense.category));
    }

    if (filters?.dateRange) {
      result = result.filter((expense) => isWithinDateRange(expense.date, filters.dateRange));
    }

    if (typeof filters?.minAmount === 'number' && filters.minAmount > 0) {
      result = result.filter((expense) => expense.amount >= filters.minAmount);
    }

    if (typeof filters?.maxAmount === 'number') {
      result = result.filter((expense) => expense.amount <= filters.maxAmount);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((expense) =>
        expense.merchant?.toLowerCase().includes(query) ||
        expense.notes?.toLowerCase().includes(query)
      );
    }

    result.sort((left, right) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(right.date) - new Date(left.date);
        case 'date-asc':
          return new Date(left.date) - new Date(right.date);
        case 'amount-desc':
          return right.amount - left.amount;
        case 'amount-asc':
          return left.amount - right.amount;
        default:
          return 0;
      }
    });

    return result;
  }, [expenses, filters, searchQuery, sortBy]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading expenses...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6">
      {processedExpenses.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          No expenses found. Try adjusting your filters.
        </div>
      ) : (
        <div className={viewMode === 'list' ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'}>
          {processedExpenses.map((expense) => {
            const category = getCategoryInfo(expense.category);
            const converted = getConvertedDisplay(expense.amount, expense.currency || 'USD');

            return (
              <div
                key={expense.id}
                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{category.icon}</span>
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-xs"
                      style={{ backgroundColor: `${category.color}20`, color: category.color }}
                    >
                      {category.name}
                    </span>
                  </div>
                  <div className="text-right relative">
                    <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {getCurrencySymbol(expense.currency || 'USD')}{expense.amount.toFixed(2)}
                    </div>
                    {converted !== null && (
                      <div className="text-xs text-zinc-400 italic absolute right-0 top-full">
                        ~{currencySymbol}{converted.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1 truncate">
                  {expense.merchant}
                </div>

                {expense.notes && (
                  <div className="text-xs text-zinc-500 italic mb-2 truncate" title={expense.notes}>
                    {expense.notes}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">{new Date(expense.date).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit?.(expense)}
                      className="text-zinc-400 hover:text-violet-600 transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-zinc-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
