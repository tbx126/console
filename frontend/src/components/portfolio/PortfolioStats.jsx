import { useEffect, useState } from 'react';
import { TrendingUp, Briefcase, Wallet, Target } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { Skeleton } from '../ui/Skeleton';
import portfolioApi from '../../services/portfolioApi';

export default function PortfolioStats({ refresh }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await portfolioApi.getStatistics();
        if (!cancelled) {
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch portfolio stats:', error);
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

  const totalValue = stats?.total_investment_value || 0;
  const totalGain = stats?.total_gain_loss || 0;
  const gainPercentage = stats?.total_gain_loss_percentage || 0;
  const activeProjects = stats?.active_projects || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
      <StatCard
        title="Total Value"
        value={`¥${totalValue.toLocaleString()}`}
        description="Portfolio value"
        icon={Wallet}
      />
      <StatCard
        title="Total Gain"
        value={`¥${totalGain.toLocaleString()}`}
        description={`${gainPercentage >= 0 ? '+' : ''}${gainPercentage.toFixed(2)}%`}
        icon={TrendingUp}
        trend={totalGain !== 0 && {
          value: `${gainPercentage >= 0 ? '+' : ''}${gainPercentage.toFixed(2)}%`,
          isPositive: gainPercentage >= 0
        }}
      />
      <StatCard
        title="Investments"
        value={stats?.total_investments || 0}
        description="Active positions"
        icon={Target}
      />
      <StatCard
        title="Projects"
        value={activeProjects}
        description="In progress"
        icon={Briefcase}
      />
    </div>
  );
}
