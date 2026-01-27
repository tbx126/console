import { useState, useEffect, useMemo } from 'react';
import { Trash2, Edit } from 'lucide-react';
import travelApi from '../../services/travelApi';

// 航空公司 Logo 组件
const AirlineLogo = ({ airlineCode, airlineName }) => {
  const [imgError, setImgError] = useState(false);

  // 获取航空公司首字母作为 fallback
  const initials = (airlineName || 'XX').substring(0, 2).toUpperCase();

  if (imgError || !airlineCode) {
    return (
      <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={`https://pics.avs.io/60/60/${airlineCode}.png`}
      alt={airlineName}
      className="w-8 h-8 object-contain"
      onError={() => setImgError(true)}
    />
  );
};

const FlightList = ({ refresh, filters, searchQuery, sortBy, viewMode, onEdit, onAirlinesLoaded }) => {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFlights();
  }, [refresh]);

  const loadFlights = async () => {
    try {
      setLoading(true);
      const data = await travelApi.getFlights();
      setFlights(data);

      // 提取航空公司列表供筛选器使用
      if (onAirlinesLoaded) {
        const airlines = [...new Set(data.map(f => f.airline).filter(Boolean))];
        onAirlinesLoaded(airlines);
      }
    } catch (err) {
      setError('Failed to load flights');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this flight?')) return;

    try {
      await travelApi.deleteFlight(id);
      loadFlights();
    } catch (err) {
      alert('Failed to delete flight');
    }
  };

  // Filter, search and sort flights
  const processedFlights = useMemo(() => {
    let result = [...flights];

    // Apply airline filter
    if (filters?.airlines && filters.airlines.length > 0) {
      result = result.filter(flight => filters.airlines.includes(flight.airline));
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(flight =>
        flight.airline?.toLowerCase().includes(query) ||
        flight.origin?.toLowerCase().includes(query) ||
        flight.destination?.toLowerCase().includes(query) ||
        flight.flight_number?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        switch (sortBy) {
          case 'date-desc':
            return new Date(b.date) - new Date(a.date);
          case 'date-asc':
            return new Date(a.date) - new Date(b.date);
          case 'airline-asc':
            return (a.airline || '').localeCompare(b.airline || '');
          case 'airline-desc':
            return (b.airline || '').localeCompare(a.airline || '');
          default:
            return 0;
        }
      });
    }

    return result;
  }, [flights, filters, searchQuery, sortBy]);

  if (loading) {
    return <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">Loading flights...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>;
  }

  if (processedFlights.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
        No flights found. Try adjusting your filters.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-4 gap-3">
        {processedFlights.map(flight => {
          return (
            <div
              key={flight.id}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 hover:shadow-md transition-shadow"
            >
              {/* Top: Logo + Airline + Cost */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AirlineLogo airlineCode={flight.airline_code} airlineName={flight.airline} />
                  <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[100px]">
                    {flight.airline}
                  </span>
                </div>
                {flight.cost && (
                  <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    ${flight.cost.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Middle: Flight Number & Route */}
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1 truncate">
                {flight.flight_number}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                {flight.origin} → {flight.destination}
              </div>

              {/* Notes (if exists) */}
              {flight.notes && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 italic mb-2 truncate" title={flight.notes}>
                  {flight.notes}
                </div>
              )}

              {/* Bottom: Date + Edit + Delete */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400">{new Date(flight.date).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit && onEdit(flight)}
                    className="text-zinc-400 hover:text-violet-600 transition-colors"
                    title="Edit"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(flight.id)}
                    className="text-zinc-400 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FlightList;
