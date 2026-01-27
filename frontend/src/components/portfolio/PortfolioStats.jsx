import { useState, useEffect } from 'react';
import { TrendingUp, Briefcase, DollarSign, Target } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { Skeleton } from '../ui/Skeleton';
import portfolioApi from '../../services/portfolioApi';

export default function PortfolioStats({ refresh }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 仅首次加载时显示 loading 状态
        if (!stats) setLoading(true);
        const data = await portfolioApi.getStatistics();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch portfolio stats:', error);
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

  const totalValue = stats?.total_value || 0;
  const totalGain = stats?.total_gain || 0;
  const gainPercentage = stats?.gain_percentage || 0;
  const activeProjects = stats?.active_projects || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
      <StatCard
        title="Total Value"
        value={`$${totalValue.toLocaleString()}`}
        description="Portfolio value"
        icon={DollarSign}
      />
      <StatCard
        title="Total Gain"
        value={`$${totalGain.toLocaleString()}`}
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
