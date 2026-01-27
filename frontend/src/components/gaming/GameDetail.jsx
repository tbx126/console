import { useState, useEffect, useRef } from 'react';
import { X, Clock, Loader2, Calendar, Building2, Tag, ExternalLink, Star, Newspaper, ChevronLeft, ChevronRight } from 'lucide-react';
import gamingApi from '../../services/gamingApi';
import MediaCarousel from './MediaCarousel';

const toFullUrl = (localPath, fallback) => {
  if (localPath?.startsWith('/cache/')) {
    return localPath;
  }
  return fallback;
};

export default function GameDetail({ game, onClose }) {
  const [details, setDetails] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (game) {
      fetchData();
    }
  }, [game]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [detailsRes, achievementsRes, newsRes] = await Promise.all([
        gamingApi.getGameDetails(game.appid).catch(() => ({ data: null })),
        gamingApi.getDetailedAchievements(game.appid).catch(() => ({ data: { achievements: [] } })),
        gamingApi.getGameNews(game.appid, 8).catch(() => ({ data: { news: [] } }))
      ]);
      setDetails(detailsRes.data);
      setAchievements(achievementsRes.data.achievements || []);
      setNews(newsRes.data.news || []);
    } catch (error) {
      console.error('Failed to fetch game data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPlaytime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    if (hours < 1) return `${minutes} min`;
    return `${hours.toLocaleString()} hrs`;
  };

  const formatUnlockTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  const formatReleaseDate = (dateStr) => {
    if (!dateStr) return '';
    // Try to parse various date formats and convert to yyyy.mm.dd
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  if (!game) return null;

  const unlockedCount = achievements.filter(a => a.achieved === 1).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{game.name}</h2>
            {details?.developers && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{details.developers.join(', ')}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <X className="h-5 w-5 text-zinc-500" />
          </button>
        </div>

        {/* Content - No scroll on container */}
        <div className="h-[calc(90vh-5rem)]">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row h-full">
              <LeftColumn game={game} details={details} formatPlaytime={formatPlaytime} formatReleaseDate={formatReleaseDate} />
              <RightColumn
                details={details}
                achievements={achievements}
                unlockedCount={unlockedCount}
                formatUnlockTime={formatUnlockTime}
                news={news}
                appid={game.appid}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeftColumn({ game, details, formatPlaytime, formatReleaseDate }) {
  return (
    <div className="lg:w-2/5 p-6 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-700 flex flex-col h-full">
      {/* Fixed Media Carousel */}
      <div className="flex-shrink-0">
        <MediaCarousel
          screenshots={details?.screenshots || []}
          movies={details?.movies || []}
        />
      </div>

      {/* About & Info Section */}
      <div className="flex-1 mt-4 space-y-3 overflow-y-auto">
        {details?.short_description && (
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1 text-sm">About</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-4">
              {details.short_description}
            </p>
          </div>
        )}
        <div className="space-y-2">
          {details?.developers && (
            <InfoRowCompact icon={Building2} label="Developer" value={details.developers.join(', ')} />
          )}
          {details?.publishers && (
            <InfoRowCompact icon={Building2} label="Publisher" value={details.publishers.join(', ')} />
          )}
          {details?.genres && (
            <InfoRowCompact icon={Tag} label="Genres" value={details.genres.map(g => g.description).join(', ')} />
          )}
        </div>
      </div>

      {/* Stats at Bottom */}
      <div className="flex-shrink-0 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <div className="grid grid-cols-2 gap-2">
          <StatBoxCompact icon={Clock} label="Total" value={formatPlaytime(game.playtime_forever)} />
          <StatBoxCompact icon={Clock} label="2 Weeks" value={formatPlaytime(game.playtime_2weeks || 0)} />
          {details?.metacritic && (
            <StatBoxCompact icon={Star} label="Score" value={details.metacritic.score} />
          )}
          {details?.release_date && (
            <StatBoxCompact icon={Calendar} label="Released" value={formatReleaseDate(details.release_date.date)} />
          )}
        </div>
        <a
          href={`https://store.steampowered.com/app/${game.appid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400"
        >
          View on Steam <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function RightColumn({ details, achievements, unlockedCount, formatUnlockTime, news, appid }) {
  return (
    <div className="lg:w-3/5 p-6 flex flex-col h-full">
      {/* News Timeline - Horizontal Scroll */}
      <div className="flex-shrink-0 mb-4">
        <NewsTimeline news={news} appid={appid} />
      </div>

      {/* Achievements - Two columns, scrollable */}
      <div className="flex-1 min-h-0">
        <AchievementsSection
          achievements={achievements}
          unlockedCount={unlockedCount}
          formatUnlockTime={formatUnlockTime}
        />
      </div>
    </div>
  );
}

function AchievementsSection({ achievements, unlockedCount, formatUnlockTime }) {
  if (achievements.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
        <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No achievements available</p>
      </div>
    );
  }

  const unlocked = achievements.filter(a => a.achieved === 1);
  const locked = achievements.filter(a => a.achieved !== 1);
  const allAchievements = [...unlocked, ...locked];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <Star className="h-4 w-4 text-amber-500" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Achievements</h3>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-auto">
          {unlockedCount}/{achievements.length}
        </span>
      </div>
      <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full mb-3 overflow-hidden flex-shrink-0">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
          style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
        />
      </div>
      {/* Two-column scrollable grid - hidden scrollbar */}
      <div
        className="flex-1 overflow-y-auto pr-1 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="grid grid-cols-2 gap-2">
          {allAchievements.map((ach, idx) => (
            <AchievementCard
              key={idx}
              achievement={ach}
              unlocked={ach.achieved === 1}
              formatUnlockTime={formatUnlockTime}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AchievementCard({ achievement, unlocked, formatUnlockTime }) {
  const iconUrl = unlocked
    ? toFullUrl(achievement.local_icon, achievement.icon)
    : toFullUrl(achievement.local_icon_gray, achievement.icon_gray);

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${
      unlocked ? 'bg-green-50 dark:bg-green-900/20' : 'bg-zinc-50 dark:bg-zinc-900'
    }`}>
      <img
        src={iconUrl}
        alt={achievement.name}
        className="w-12 h-12 rounded flex-shrink-0"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs font-medium truncate ${
            unlocked ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'
          }`}>
            {achievement.name}
          </p>
          {unlocked && achievement.unlock_time > 0 && (
            <span className="text-[10px] text-green-600 dark:text-green-400 flex-shrink-0">
              {formatUnlockTime(achievement.unlock_time)}
            </span>
          )}
        </div>
        {achievement.description && (
          <p className={`text-[10px] mt-0.5 line-clamp-2 ${
            unlocked ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-500'
          }`}>
            {achievement.description}
          </p>
        )}
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-1">{value}</p>
    </div>
  );
}

function StatBoxCompact({ icon: Icon, label, value }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{value}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
      <Icon className="h-4 w-4 text-zinc-400 mt-0.5" />
      <div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="text-sm text-zinc-900 dark:text-zinc-100">{value}</p>
      </div>
    </div>
  );
}

function InfoRowCompact({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3 w-3 text-zinc-400 flex-shrink-0" />
      <span className="text-zinc-500 dark:text-zinc-400">{label}:</span>
      <span className="text-zinc-900 dark:text-zinc-100 truncate">{value}</span>
    </div>
  );
}

function NewsTimeline({ news, appid }) {
  const scrollRef = useRef(null);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction * 200, behavior: 'smooth' });
    }
  };

  // Handle wheel event for horizontal scrolling with non-passive listener
  // React's onWheel is passive by default, so we use native addEventListener
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  if (news.length === 0) {
    return (
      <div className="text-center py-4 text-zinc-500 dark:text-zinc-400">
        <Newspaper className="h-6 w-6 mx-auto mb-1 opacity-50" />
        <p className="text-xs">No news available</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-violet-500" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">News & Updates</h3>
        </div>
        <div className="flex gap-1">
          <button onClick={() => scroll(-1)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700">
            <ChevronLeft className="h-4 w-4 text-zinc-500" />
          </button>
          <button onClick={() => scroll(1)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700">
            <ChevronRight className="h-4 w-4 text-zinc-500" />
          </button>
        </div>
      </div>
      {/* Horizontal scroll with wheel support */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {news.map((item, idx) => (
          <NewsTimelineCard key={idx} item={item} formatDate={formatDate} appid={appid} />
        ))}
      </div>
    </div>
  );
}

function NewsTimelineCard({ item, formatDate, appid }) {
  // Game header image as fallback
  const gameHeaderUrl = appid
    ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`
    : null;

  // Use cached local image or extract from content
  const getImageUrl = () => {
    // Prefer cached local image
    if (item.local_image) {
      return item.local_image;
    }
    // Fallback to extracted image URL
    if (item.image_url) {
      return item.image_url;
    }
    // Extract from content as last resort (supports HTML and BBCode)
    const contents = item.contents || '';

    // Try BBCode: [img]{STEAM_CLAN_IMAGE}/clan_id/hash.ext[/img]
    const bbcodeMatch = contents.match(/\[img\]\{STEAM_CLAN_IMAGE\}\/([^/]+)\/([^\[]+)\[\/img\]/);
    if (bbcodeMatch) {
      return `https://clan.akamai.steamstatic.com/images/${bbcodeMatch[1]}/${bbcodeMatch[2]}`;
    }

    // Try HTML: <img src="...">
    const htmlMatch = contents.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (htmlMatch) return htmlMatch[1];

    // Try direct BBCode: [img]https://...[/img]
    const directMatch = contents.match(/\[img\](https?:\/\/[^\[]+)\[\/img\]/);
    if (directMatch) return directMatch[1];

    // Fallback to game header image
    return gameHeaderUrl;
  };

  const imageUrl = getImageUrl();

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-44 group"
    >
      {/* Image from cache or placeholder */}
      <div className="h-24 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-700 mb-1">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-violet-600/20 flex items-center justify-center">
            <Newspaper className="h-6 w-6 text-zinc-400" />
          </div>
        )}
      </div>
      {/* Title below image */}
      <p className="text-xs text-zinc-900 dark:text-zinc-100 font-medium line-clamp-2 mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
        {item.title}
      </p>
      {/* Date */}
      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{formatDate(item.date)}</span>
    </a>
  );
}
