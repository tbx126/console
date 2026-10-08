import { useEffect, useState } from 'react';
import { Plane, MapPin, Award, DollarSign, Building2 } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { Skeleton } from '../ui/Skeleton';
import travelApi from '../../services/travelApi';

export default function TravelStats({ refresh }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await travelApi.getStatistics();
        if (!cancelled) {
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch travel stats:', error);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  const totalFlights = stats?.total_flights || 0;
  const totalKm = stats?.total_km || 0;
  const uniqueAirlines = stats?.airlines_used || stats?.unique_airlines || 0;
  const airportsVisited = stats?.airports_visited || 0;
  const totalCost = stats?.total_cost || 0;
  const citiesVisited = stats?.cities_visited || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
      <StatCard
        title="航班总数"
        value={totalFlights}
        description="全部记录"
        icon={Plane}
      />
      <StatCard
        title="总里程"
        value={`${totalKm.toLocaleString()} km`}
        description="飞行公里数"
        icon={MapPin}
      />
      <StatCard
        title="总花费"
        value={`$${totalCost.toLocaleString()}`}
        description="机票支出"
        icon={DollarSign}
      />
      <StatCard
        title="航司"
        value={uniqueAirlines}
        description="不同航司"
        icon={Award}
      />
      <StatCard
        title="城市"
        value={citiesVisited}
        description="已到访"
        icon={Building2}
      />
      <StatCard
        title="机场"
        value={airportsVisited}
        description="已到访"
        icon={MapPin}
      />
    </div>
  );
}
