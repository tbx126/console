import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import financeApi from '../../services/financeApi';

const SpendingChart = () => {
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
      console.error('Failed to load spending data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading chart...</div>;
  }

  if (!statistics || Object.keys(statistics.expenses_by_category || {}).length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No spending data available. Add expenses to see the chart!
      </div>
    );
  }

  const chartData = Object.entries(statistics.expenses_by_category).map(([categoryId, amount]) => {
    const category = categories.find(cat => cat.id === categoryId) || { name: categoryId, color: '#6B7280' };
    return {
      name: category.name,
      value: amount,
      color: category.color
    };
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Spending by Category</h3>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {chartData.map((item) => (
          <div key={item.name} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-medium text-gray-700">{item.name}</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              ${item.value.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpendingChart;
