import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { Skeleton } from '../ui/Skeleton';
import financeApi from '../../services/financeApi';

// Backend already returns all values in CNY — no conversion needed here
export default function FinanceStats({ refresh, currencySymbol = '¥' }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await financeApi.getStatistics();
        if (!cancelled) {
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch finance stats:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchStats();

    return () => {
      cancelled = true;
    };
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

  const totalExpenses = stats?.total_expenses || 0;
  const totalIncome = stats?.total_income || 0;
  const balance = stats?.net_balance ?? (totalIncome - totalExpenses);
  const budgetUsage = stats?.budget_usage || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
      <StatCard
        title="Total Expenses"
        value={`${currencySymbol}${totalExpenses.toFixed(2)}`}
        description="All time"
        icon={TrendingDown}
        trend={stats?.expense_trend && {
          value: stats.expense_trend,
          isPositive: false
        }}
      />
      <StatCard
        title="Total Income"
        value={`${currencySymbol}${totalIncome.toFixed(2)}`}
        description="All time"
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
