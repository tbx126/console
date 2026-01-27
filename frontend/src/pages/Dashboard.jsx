import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Plane, Briefcase, TrendingUp, ArrowRight } from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import financeApi from '../services/financeApi';
import travelApi from '../services/travelApi';
import portfolioApi from '../services/portfolioApi';

const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', CNY: '¥', JPY: '¥', GBP: '£', SGD: 'S$'
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    finance: null,
    travel: null,
    portfolio: null,
  });
  const displayCurrency = 'CNY'; // Fixed to CNY
  const [exchangeRates, setExchangeRates] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [financeStats, travelStats, portfolioStats, ratesData] = await Promise.all([
          financeApi.getStatistics(),
          travelApi.getStatistics(),
          portfolioApi.getStatistics(),
          financeApi.getExchangeRates('USD'),
        ]);

        setStats({
          finance: financeStats,
          travel: travelStats,
          portfolio: portfolioStats,
        });
        setExchangeRates(ratesData.rates);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // 货币转换函数
  const convertAmount = (amount, fromCurrency = 'USD') => {
    if (!exchangeRates || !amount) return amount;
    if (fromCurrency === displayCurrency) return amount;
    const fromRate = exchangeRates[fromCurrency] || 1;
    const toRate = exchangeRates[displayCurrency] || 1;
    return amount * (toRate / fromRate);
  };

  const currencySymbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 animate-in">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">Welcome back! Here's your overview.</p>
        </div>
      </div>

      {/* Stats & Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 animate-in animate-delay-100 bg-white dark:bg-zinc-800 rounded-2xl shadow-air p-6 hover:shadow-air-hover transition-shadow duration-300">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Total Expenses</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
                {currencySymbol}{convertAmount(stats.finance?.total_expenses || 0).toFixed(2)}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">This month</p>
            </div>
            <div className="ml-4 p-3 bg-violet-50 dark:bg-violet-900/30 rounded-xl">
              <Wallet className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
          </div>

          {/* Category breakdown */}
          {stats.finance?.expenses_by_category && Object.keys(stats.finance.expenses_by_category).length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-700">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3">Top Categories</p>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(stats.finance.expenses_by_category)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([category, amount]) => (
                    <div key={category} className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-2">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 capitalize truncate">{category}</p>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                        {currencySymbol}{convertAmount(amount).toFixed(2)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <StatCard
          className="animate-in animate-delay-200"
          title="Flights Logged"
          value={stats.travel?.total_flights || 0}
          description="Total journeys"
          icon={Plane}
        />

        <StatCard
          className="animate-in animate-delay-300"
          title="Portfolio Value"
          value={`${currencySymbol}${convertAmount(stats.portfolio?.total_value || 0).toFixed(2)}`}
          description="Current investments"
          icon={Briefcase}
          trend={
            stats.portfolio?.total_gain_loss
              ? {
                  value: `${stats.portfolio.total_gain_loss >= 0 ? '+' : ''}${currencySymbol}${convertAmount(stats.portfolio.total_gain_loss).toFixed(2)}`,
                  isPositive: stats.portfolio.total_gain_loss >= 0,
                }
              : null
          }
        />

        {/* Quick Actions */}
        <Card className="md:col-span-2 animate-in animate-delay-400 bg-gradient-to-br from-violet-50/50 to-zinc-50/50 dark:from-violet-900/20 dark:to-zinc-800/50 border-violet-100/50 dark:border-violet-800/50">
        <CardHeader>
          <CardTitle className="text-violet-900 dark:text-violet-300">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link to="/finance">
              <Button variant="outline" className="w-full justify-between h-12 border-violet-200 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-300 dark:hover:border-violet-600 transition-all">
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  Add Expense
                </span>
                <ArrowRight className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </Button>
            </Link>
            <Link to="/travel">
              <Button variant="outline" className="w-full justify-between h-12 border-violet-200 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-300 dark:hover:border-violet-600 transition-all">
                <span className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  Log Flight
                </span>
                <ArrowRight className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </Button>
            </Link>
            <Link to="/portfolio">
              <Button variant="outline" className="w-full justify-between h-12 border-violet-200 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-300 dark:hover:border-violet-600 transition-all">
                <span className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  Add Investment
                </span>
                <ArrowRight className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Section Header */}
      <div className="mt-12 mb-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Modules</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Explore your tracking modules</p>
      </div>

      {/* Module Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="h-5 w-5 text-violet-600" />
              <span>Finance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4">
              Track your expenses, income, and budgets
            </p>
            <Link to="/finance">
              <Button variant="ghost" size="sm" className="w-full">
                View Details
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plane className="h-5 w-5 text-violet-600" />
              <span>Travel</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4">
              Log your flights and track travel statistics
            </p>
            <Link to="/travel">
              <Button variant="ghost" size="sm" className="w-full">
                View Details
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-violet-600" />
              <span>Portfolio</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4">
              Manage your investments and projects
            </p>
            <Link to="/portfolio">
              <Button variant="ghost" size="sm" className="w-full">
                View Details
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
