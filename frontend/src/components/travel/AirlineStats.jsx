import { useState, useEffect, useMemo } from 'react';
import { Trophy, Plane, MapPin, Globe, Building, Route } from 'lucide-react';
import travelApi from '../../services/travelApi';

// 成就分类配置
const CATEGORY_CONFIG = {
  flights: { label: 'Flights', icon: Plane, color: 'violet' },
  distance: { label: 'Distance', icon: Route, color: 'blue' },
  airlines: { label: 'Airlines', icon: Building, color: 'emerald' },
  countries: { label: 'Countries', icon: Globe, color: 'amber' },
  continents: { label: 'Continents', icon: MapPin, color: 'rose' },
  airports: { label: 'Airports', icon: Building, color: 'cyan' },
};

const AirlineStats = () => {
  const [airlines, setAirlines] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [airlinesData, achievementsData] = await Promise.all([
        travelApi.getAirlineStats(),
        travelApi.getAchievements()
      ]);
      setAirlines(airlinesData);
      setAchievements(achievementsData);
    } catch (err) {
      console.error('Failed to load travel data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 按类别分组成就
  const groupedAchievements = useMemo(() => {
    const groups = {};
    achievements.forEach(ach => {
      const cat = ach.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ach);
    });
    return groups;
  }, [achievements]);

  if (loading) {
    return <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">Loading statistics...</div>;
  }

  return (
    <div className="p-6 space-y-8">
      {/* Achievements by Category */}
      {achievements.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Achievements</h3>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              ({achievements.filter(a => a.achieved).length}/{achievements.length})
            </span>
          </div>

          {Object.entries(groupedAchievements).map(([category, items]) => {
            const config = CATEGORY_CONFIG[category] || { label: category, color: 'zinc' };
            const Icon = config.icon || Trophy;
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 text-${config.color}-500`} />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{config.label}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {items.map(achievement => (
                    <div
                      key={achievement.id}
                      className={`p-3 rounded-xl text-center transition-all ${
                        achievement.achieved
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-500'
                          : 'bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 opacity-50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{achievement.icon}</div>
                      <div className="text-xs font-medium text-zinc-800 dark:text-zinc-100">{achievement.title}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{achievement.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Airline Statistics */}
      {airlines.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Plane className="h-5 w-5 text-violet-500" />
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Airlines</h3>
          </div>
          <div className="space-y-3">
            {airlines.map(airline => (
              <div
                key={airline.airline}
                className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-zinc-800 dark:text-zinc-100">{airline.airline}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {airline.total_flights} flight{airline.total_flights !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                  <div>
                    <span className="font-medium">Distance:</span> {airline.total_km.toLocaleString()} km
                  </div>
                  {airline.total_cost > 0 && (
                    <div>
                      <span className="font-medium">Cost:</span> ${airline.total_cost.toFixed(2)}
                    </div>
                  )}
                  {airline.favorite_route && (
                    <div>
                      <span className="font-medium">Top Route:</span> {airline.favorite_route}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          No airline statistics yet. Log flights to see stats!
        </div>
      )}
    </div>
  );
};

export default AirlineStats;
