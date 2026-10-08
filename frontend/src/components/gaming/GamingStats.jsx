import { useEffect, useState } from 'react';
import { Gamepad2, Clock, Trophy, TrendingUp } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { Skeleton } from '../ui/Skeleton';
import gamingApi from '../../services/gamingApi';

export default function GamingStats({ refresh }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await gamingApi.getStatistics();
        if (!cancelled) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch gaming stats:', error);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  const formatPlaytime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    return `${hours.toLocaleString()} hrs`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="游戏总数"
        value={stats?.total_games || 0}
        description="游戏库"
        icon={Gamepad2}
      />
      <StatCard
        title="总游玩时长"
        value={formatPlaytime(stats?.total_playtime || 0)}
        description="全部记录"
        icon={Clock}
      />
      <StatCard
        title="近期游玩"
        value={formatPlaytime(stats?.recent_playtime || 0)}
        description="近两周"
        icon={TrendingUp}
      />
      <StatCard
        title="最常游玩"
        value={stats?.most_played_game || 'N/A'}
        description={formatPlaytime(stats?.most_played_time || 0)}
        icon={Trophy}
      />
    </div>
  );
}
