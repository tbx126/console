import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2, Edit } from 'lucide-react';
import travelApi from '../../services/travelApi';
import { isWithinDateRange } from '../../lib/dateFilters';

const AirlineLogo = ({ airlineCode, airlineName }) => {
  const [imgError, setImgError] = useState(false);
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

  const loadFlights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await travelApi.getFlights();
      setFlights(data);

      if (onAirlinesLoaded) {
        const airlines = [...new Set(data.map((flight) => flight.airline).filter(Boolean))];
        onAirlinesLoaded(airlines);
      }
    } catch {
      setError('航班加载失败');
    } finally {
      setLoading(false);
    }
  }, [onAirlinesLoaded]);

  useEffect(() => {
    void loadFlights();
  }, [loadFlights, refresh]);

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条航班记录吗？')) return;

    try {
      await travelApi.deleteFlight(id);
      await loadFlights();
    } catch {
      alert('删除航班失败');
    }
  };

  const processedFlights = useMemo(() => {
    let result = [...flights];

    if (filters?.airlines?.length > 0) {
      result = result.filter((flight) => filters.airlines.includes(flight.airline));
    }

    if (filters?.dateRange) {
      result = result.filter((flight) => isWithinDateRange(flight.date, filters.dateRange));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((flight) =>
        flight.airline?.toLowerCase().includes(query) ||
        flight.origin?.toLowerCase().includes(query) ||
        flight.destination?.toLowerCase().includes(query) ||
        flight.flight_number?.toLowerCase().includes(query)
      );
    }

    result.sort((left, right) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(right.date) - new Date(left.date);
        case 'date-asc':
          return new Date(left.date) - new Date(right.date);
        case 'airline-asc':
          return (left.airline || '').localeCompare(right.airline || '');
        case 'airline-desc':
          return (right.airline || '').localeCompare(left.airline || '');
        default:
          return 0;
      }
    });

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
        没有符合条件的航班，请调整筛选条件。
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className={viewMode === 'list' ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'}>
        {processedFlights.map((flight) => (
          <div
            key={flight.id}
            className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 hover:shadow-md transition-shadow"
          >
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

            <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-1 truncate">
              {flight.flight_number}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
              {flight.origin} -&gt; {flight.destination}
            </div>

            {flight.notes && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 italic mb-2 truncate" title={flight.notes}>
                {flight.notes}
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">{new Date(flight.date).toLocaleDateString()}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit?.(flight)}
                  className="text-zinc-400 hover:text-violet-600 transition-colors"
                  title="编辑" aria-label="编辑"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(flight.id)}
                  className="text-zinc-400 hover:text-red-600 transition-colors"
                  title="删除" aria-label="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlightList;
