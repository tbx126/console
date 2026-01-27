import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { Skeleton } from '../ui/Skeleton';
import financeApi from '../../services/financeApi';

export default function FinanceStats({ refresh, displayCurrency = 'CNY', currencySymbol = '¥', exchangeRates }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // 货币转换函数
  const convertAmount = (amount, fromCurrency = 'USD') => {
    if (!exchangeRates || !amount) return amount;
    if (fromCurrency === displayCurrency) return amount;
    const fromRate = exchangeRates[fromCurrency] || 1;
    const toRate = exchangeRates[displayCurrency] || 1;
    return amount * (toRate / fromRate);
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 仅首次加载时显示 loading 状态
        if (!stats) setLoading(true);
        const data = await financeApi.getStatistics();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch finance stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [refresh]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const totalExpenses = convertAmount(stats?.total_expenses || 0);
  const totalIncome = convertAmount(stats?.total_income || 0);
  const balance = totalIncome - totalExpenses;
  const budgetUsage = stats?.budget_usage || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
      <StatCard
        title="Total Expenses"
        value={`${currencySymbol}${totalExpenses.toFixed(2)}`}
        description="This month"
        icon={TrendingDown}
        trend={stats?.expense_trend && {
          value: stats.expense_trend,
          isPositive: false
        }}
      />
      <StatCard
        title="Total Income"
        value={`${currencySymbol}${totalIncome.toFixed(2)}`}
        description="This month"
        icon={TrendingUp}
        trend={stats?.income_trend && {
          value: stats.income_trend,
          isPositive: true
        }}
      />
      <StatCard
        title="Balance"
        value={`${currencySymbol}${balance.toFixed(2)}`}
        description={balance >= 0 ? 'Surplus' : 'Deficit'}
        icon={Wallet}
      />
      <StatCard
        title="Budget Usage"
        value={`${budgetUsage.toFixed(0)}%`}
        description="Of monthly budget"
        icon={PiggyBank}
        trend={budgetUsage > 100 && {
          value: 'Over budget',
          isPositive: false
        }}
      />
    </div>
  );
}
