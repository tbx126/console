import { useState, useEffect } from 'react';
import { Gamepad2, Clock, Trophy, TrendingUp } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { Skeleton } from '../ui/Skeleton';
import gamingApi from '../../services/gamingApi';

export default function GamingStats({ refresh }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!stats) setLoading(true);
        const response = await gamingApi.getStatistics();
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch gaming stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
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
        title="Total Games"
        value={stats?.total_games || 0}
        description="In library"
        icon={Gamepad2}
      />
      <StatCard
        title="Total Playtime"
        value={formatPlaytime(stats?.total_playtime || 0)}
        description="All time"
        icon={Clock}
      />
      <StatCard
        title="Recent Playtime"
        value={formatPlaytime(stats?.recent_playtime || 0)}
        description="Last 2 weeks"
        icon={TrendingUp}
      />
      <StatCard
        title="Most Played"
        value={stats?.most_played_game || 'N/A'}
        description={formatPlaytime(stats?.most_played_time || 0)}
        icon={Trophy}
      />
    </div>
  );
}
