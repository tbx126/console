import { Clock, Trophy, Calendar } from 'lucide-react';

// Card size based on position pattern (not playtime)
const getCardSize = (index) => {
  // Pattern: every 5th card is vertical (medium), others are horizontal (small)
  // First card is large (spans 2 cols)
  if (index === 0) return 'large';
  if (index % 5 === 1 || index % 5 === 3) return 'medium';
  return 'small';
};

export default function GameCardV2({ game, onClick, index = 0, viewMode = 'masonry' }) {
  const formatPlaytime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    if (hours < 1) return `${minutes}m`;
    if (hours < 100) return `${hours}h`;
    return `${Math.floor(hours / 10) * 10}h+`;
  };

  const formatLastPlayed = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const formatLastPlayedDate = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  // Steam images
  const headerUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`;
  const capsuleUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/library_600x900.jpg`;
  const heroUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/library_hero.jpg`;

  const size = viewMode === 'masonry' ? getCardSize(index) : 'uniform';
  const lastPlayed = formatLastPlayed(game.rtime_last_played);

  // Compact view - Steam store list style
  if (viewMode === 'compact') {
    return (
      <div
        onClick={() => onClick?.(game)}
        className="group flex items-center gap-4 p-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-violet-400 dark:hover:border-violet-500 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-all cursor-pointer"
      >
        {/* Game cover - larger horizontal image */}
        <img
          src={headerUrl}
          alt={game.name}
          className="w-28 h-14 object-cover rounded flex-shrink-0"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        {/* Game info - name and last played */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            {game.name}
          </h3>
          {game.rtime_last_played && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {formatLastPlayedDate(game.rtime_last_played)}
            </p>
          )}
        </div>
        {/* Playtime - right aligned */}
        <div className="flex-shrink-0 text-right">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {formatPlaytime(game.playtime_forever)}
          </span>
        </div>
      </div>
    );
  }

  // Grid view - vertical cards with compact info
  if (viewMode === 'grid') {
    return (
      <div
        onClick={() => onClick?.(game)}
        className="group bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden hover:shadow-xl hover:border-violet-400 dark:hover:border-violet-500 transition-all cursor-pointer"
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-zinc-900">
          <img
            src={capsuleUrl}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.target.src = headerUrl; }}
          />
          {game.playtime_2weeks > 0 && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              Active
            </div>
          )}
        </div>
        <div className="p-2">
          <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            {game.name}
          </h3>
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {game.rtime_last_played && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatLastPlayedDate(game.rtime_last_played)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatPlaytime(game.playtime_forever)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Masonry view - mixed horizontal/vertical cards
  // medium: vertical card (keep current design), large/small: horizontal card
  const isVertical = size === 'medium';

  // Vertical card (medium) - compact info layout
  if (isVertical) {
    return (
      <div
        onClick={() => onClick?.(game)}
        className="group bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden hover:shadow-xl hover:border-violet-400 dark:hover:border-violet-500 transition-all cursor-pointer break-inside-avoid mb-4"
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-zinc-900">
          <img
            src={capsuleUrl}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.target.src = headerUrl; }}
          />
          {game.playtime_2weeks > 0 && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              Active
            </div>
          )}
        </div>
        <div className="p-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate flex-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              {game.name}
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatPlaytime(game.playtime_forever)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Horizontal card (large/small)
  return (
    <div
      onClick={() => onClick?.(game)}
      className="group bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden hover:shadow-xl hover:border-violet-400 dark:hover:border-violet-500 transition-all cursor-pointer break-inside-avoid mb-4"
    >
      <div className="relative aspect-[460/215] overflow-hidden bg-zinc-900">
        <img
          src={headerUrl}
          alt={game.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {game.playtime_2weeks > 0 && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            Active
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate flex-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            {game.name}
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatPlaytime(game.playtime_forever)}
          </span>
        </div>
      </div>
    </div>
  );
}
