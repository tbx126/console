import { useState, useEffect } from 'react';
import financeApi from '../../services/financeApi';

const BudgetOverview = () => {
  const [statistics, setStatistics] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stats, cats] = await Promise.all([
        financeApi.getStatistics(),
        financeApi.getCategories()
      ]);
      setStatistics(stats);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load budget data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (categoryId) => {
    return categories.find(cat => cat.id === categoryId) || { name: categoryId, icon: '💰', color: '#6B7280' };
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading budget data...</div>;
  }

  if (!statistics) {
    return <div className="text-center py-8 text-gray-500">No budget data available</div>;
  }

  const budgetEntries = Object.entries(statistics.budget_status || {});

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Total Income</div>
          <div className="text-2xl font-bold text-blue-900">
            ${statistics.total_income.toFixed(2)}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-red-600 font-medium">Total Expenses</div>
          <div className="text-2xl font-bold text-red-900">
            ${statistics.total_expenses.toFixed(2)}
          </div>
        </div>
        <div className={`rounded-lg p-4 ${statistics.net_balance >= 0 ? 'bg-green-50' : 'bg-orange-50'}`}>
          <div className={`text-sm font-medium ${statistics.net_balance >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
            Net Balance
          </div>
          <div className={`text-2xl font-bold ${statistics.net_balance >= 0 ? 'text-green-900' : 'text-orange-900'}`}>
            ${statistics.net_balance.toFixed(2)}
          </div>
        </div>
      </div>

      {budgetEntries.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Budget Progress</h3>
          {budgetEntries.map(([categoryId, budget]) => {
            const category = getCategoryInfo(categoryId);
            const percentage = budget.percentage;
            const isOverBudget = percentage > 100;
            const isNearLimit = percentage > 80 && percentage <= 100;

            return (
              <div key={categoryId} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{category.icon}</span>
                    <span className="font-medium text-gray-800">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      ${budget.spent.toFixed(2)} / ${budget.limit.toFixed(2)}
                    </div>
                    <div className={`text-xs font-medium ${isOverBudget ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-green-600'}`}>
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${isOverBudget ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                {isOverBudget && (
                  <div className="mt-2 text-xs text-red-600">
                    Over budget by ${(budget.spent - budget.limit).toFixed(2)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No budgets set. Create budgets to track your spending!
        </div>
      )}
    </div>
  );
};

export default BudgetOverview;
