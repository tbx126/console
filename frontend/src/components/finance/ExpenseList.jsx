import { useState, useEffect, useMemo } from 'react';
import { Trash2, Edit } from 'lucide-react';
import financeApi from '../../services/financeApi';

const ExpenseList = ({ refresh, filters, searchQuery, sortBy, viewMode, onEdit, displayCurrency = 'CNY', currencySymbol = '¥', exchangeRates }) => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [refresh]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expensesData, categoriesData] = await Promise.all([
        financeApi.getExpenses(),
        financeApi.getCategories()
      ]);
      setExpenses(expensesData);
      setCategories(categoriesData);
    } catch (err) {
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await financeApi.deleteExpense(id);
      loadData();
    } catch (err) {
      alert('Failed to delete expense');
    }
  };

  const getCategoryInfo = (categoryId) => {
    return categories.find(cat => cat.id === categoryId) || { name: categoryId, icon: '💰', color: '#6B7280' };
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { USD: '$', EUR: '€', CNY: '¥', JPY: '¥', GBP: '£', SGD: 'S$' };
    return symbols[currency] || currency;
  };

  // 货币转换函数
  const convertAmount = (amount, fromCurrency = 'USD') => {
    if (!exchangeRates || !amount) return null;
    if (fromCurrency === displayCurrency) return null; // 相同货币不显示转换
    const fromRate = exchangeRates[fromCurrency] || 1;
    const toRate = exchangeRates[displayCurrency] || 1;
    return amount * (toRate / fromRate);
  };

  // Filter, search and sort expenses
  const processedExpenses = useMemo(() => {
    let result = [...expenses];

    // Apply category filter
    if (filters?.categories && filters.categories.length > 0) {
      result = result.filter(exp => filters.categories.includes(exp.category));
    }

    // Apply amount filter
    if (filters?.maxAmount) {
      result = result.filter(exp => exp.amount <= filters.maxAmount);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(exp =>
        exp.merchant?.toLowerCase().includes(query) ||
        exp.notes?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        switch (sortBy) {
          case 'date-desc':
            return new Date(b.date) - new Date(a.date);
          case 'date-asc':
            return new Date(a.date) - new Date(b.date);
          case 'amount-desc':
            return b.amount - a.amount;
          case 'amount-asc':
            return a.amount - b.amount;
          default:
            return 0;
        }
      });
    }

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
        <div className="grid grid-cols-4 gap-3">
          {processedExpenses.map(expense => {
            const category = getCategoryInfo(expense.category);
            return (
              <div
                key={expense.id}
                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                {/* Top: Icon + Category Label + Amount */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{category.icon}</span>
                    <span className="inline-block px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: category.color + '20', color: category.color }}>
                      {category.name}
                    </span>
                  </div>
                  <div className="text-right relative">
                    <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {getCurrencySymbol(expense.currency || 'USD')}{expense.amount.toFixed(2)}
                    </div>
                    {(() => {
                      const converted = convertAmount(expense.amount, expense.currency || 'USD');
                      if (converted !== null) {
                        return (
                          <div className="text-xs text-zinc-400 italic absolute right-0 top-full">
                            ≈ {currencySymbol}{converted.toFixed(2)}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Middle: Merchant Name */}
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1 truncate">
                  {expense.merchant}
                </div>

                {/* Notes (if exists) */}
                {expense.notes && (
                  <div className="text-xs text-zinc-500 italic mb-2 truncate" title={expense.notes}>
                    {expense.notes}
                  </div>
                )}

                {/* Bottom: Date + Edit + Delete */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">{new Date(expense.date).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit && onEdit(expense)}
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
