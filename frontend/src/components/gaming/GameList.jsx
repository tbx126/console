import { useState, useEffect, useRef } from 'react';
import { Loader2, RefreshCw, Search, Download, LayoutGrid, LayoutList, Sparkles } from 'lucide-react';
import GameCardV2 from './GameCardV2';
import gamingApi from '../../services/gamingApi';
import { Button } from '../ui/Button';

export default function GameList({ refresh, onGameSelect }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('playtime');
  const [cacheStatus, setCacheStatus] = useState(null);
  const [viewMode, setViewMode] = useState('masonry'); // 'grid' | 'masonry' | 'compact'
  const pollRef = useRef(null);

  useEffect(() => {
    fetchGames();
  }, [refresh]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const response = await gamingApi.getGames();
      setGames(response.data.games || []);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await gamingApi.syncGames();
      await fetchGames();

      // Start polling if caching started
      if (res.data.caching_started) {
        startCachePolling();
      }
    } catch (error) {
      console.error('Failed to sync games:', error);
    } finally {
      setSyncing(false);
    }
  };

  const startCachePolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await gamingApi.getCacheSyncStatus();
        setCacheStatus(res.data);
        if (!res.data.running) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch (e) {
        console.error('Failed to get cache status:', e);
      }
    }, 2000);
  };

  useEffect(() => {
    // Check if caching is already running on mount
    gamingApi.getCacheSyncStatus().then(res => {
      if (res.data.running) {
        setCacheStatus(res.data);
        startCachePolling();
      }
    }).catch(() => {});

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const filteredGames = games
    .filter(game =>
      game.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'playtime') return b.playtime_forever - a.playtime_forever;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'recent') return (b.playtime_2weeks || 0) - (a.playtime_2weeks || 0);
      return 0;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-zinc-700/50'}`}
              title="Grid View (V1)"
            >
              <LayoutGrid className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={() => setViewMode('masonry')}
              className={`p-1.5 rounded ${viewMode === 'masonry' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-zinc-700/50'}`}
              title="Masonry View (V2)"
            >
              <Sparkles className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-zinc-700/50'}`}
              title="Compact View"
            >
              <LayoutList className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
          >
            <option value="playtime">Most Played</option>
            <option value="recent">Recently Played</option>
            <option value="name">Name</option>
          </select>
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>
      </div>

      {/* Cache Progress */}
      {cacheStatus?.running && (
        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-4 border border-violet-200 dark:border-violet-800">
          <div className="flex items-center gap-3 mb-2">
            <Download className="h-4 w-4 text-violet-600 dark:text-violet-400 animate-pulse" />
            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
              Caching game data...
            </span>
            <span className="text-xs text-violet-600 dark:text-violet-400 ml-auto">
              {cacheStatus.completed} / {cacheStatus.total}
            </span>
          </div>
          <div className="h-2 bg-violet-200 dark:bg-violet-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${(cacheStatus.completed / cacheStatus.total) * 100}%` }}
            />
          </div>
          {cacheStatus.current_game && (
            <p className="text-xs text-violet-600 dark:text-violet-400 mt-2 truncate">
              {cacheStatus.current_game}
            </p>
          )}
        </div>
      )}

      {/* Games Grid */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          <p>No games found. Click Sync to fetch from Steam.</p>
        </div>
      ) : viewMode === 'grid' ? (
        // V1: Vertical card grid layout
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredGames.map((game, index) => (
            <GameCardV2 key={game.appid} game={game} onClick={onGameSelect} index={index} viewMode="grid" />
          ))}
        </div>
      ) : viewMode === 'compact' ? (
        // Compact list layout
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {filteredGames.map((game, index) => (
            <GameCardV2 key={game.appid} game={game} onClick={onGameSelect} index={index} viewMode="compact" />
          ))}
        </div>
      ) : (
        // V2: Masonry layout with CSS columns (true masonry, no stretching)
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {filteredGames.map((game, index) => (
            <GameCardV2 key={game.appid} game={game} onClick={onGameSelect} index={index} viewMode="masonry" />
          ))}
        </div>
      )}
    </div>
  );
}
