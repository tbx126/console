import { useState, useEffect } from 'react';
import { Plane, MapPin, Award, DollarSign, Building2 } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { Skeleton } from '../ui/Skeleton';
import travelApi from '../../services/travelApi';

export default function TravelStats({ refresh }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 仅首次加载时显示 loading 状态
        if (!stats) setLoading(true);
        const data = await travelApi.getStatistics();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch travel stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
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
        title="Total Flights"
        value={totalFlights}
        description="All time"
        icon={Plane}
      />
      <StatCard
        title="Total Distance"
        value={`${totalKm.toLocaleString()} km`}
        description="KM flown"
        icon={MapPin}
      />
      <StatCard
        title="Total Spent"
        value={`$${totalCost.toLocaleString()}`}
        description="On flights"
        icon={DollarSign}
      />
      <StatCard
        title="Airlines"
        value={uniqueAirlines}
        description="Different carriers"
        icon={Award}
      />
      <StatCard
        title="Cities"
        value={citiesVisited}
        description="Visited"
        icon={Building2}
      />
      <StatCard
        title="Airports"
        value={airportsVisited}
        description="Visited"
        icon={MapPin}
      />
    </div>
  );
}
