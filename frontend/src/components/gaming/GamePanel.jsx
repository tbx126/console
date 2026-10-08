import { useState } from 'react';
import { ExternalLink, Maximize2 } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { useApi } from '../../services/api';
import { formatHours, lastPlayed } from './format';

const fullUrl = (local, remote) => (local?.startsWith('/cache/') ? local : remote);
const day = (ts) => (ts ? new Date(ts * 1000).toISOString().slice(0, 10) : '');

/** 选中游戏的侧栏摘要；完整媒体、成就与新闻在详情弹窗中 */
export default function GamePanel({ game, onOpen }) {
  const [imgFailed, setImgFailed] = useState(false);
  const details = useApi(`/gaming/games/${game.appid}/details`, { ttl: 10 * 60_000 });
  const achievements = useApi(`/gaming/games/${game.appid}/achievements-detailed`, { ttl: 10 * 60_000 });
  const list = achievements.data?.achievements ?? [];
  const unlocked = list.filter((a) => a.achieved === 1);
  const recent = [...unlocked].sort((a, b) => (b.unlock_time || 0) - (a.unlock_time || 0)).slice(0, 4);
  const d = details.data;

  return (
    <aside aria-label="游戏详情" className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
      {imgFailed ? (
        <div className="aspect-[460/215] w-full bg-muted" />
      ) : (
        <img
          src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
          alt=""
          onError={() => setImgFailed(true)}
          className="aspect-[460/215] w-full object-cover"
        />
      )}
      <div className="flex flex-col gap-3 px-5 py-3">
        <div>
          <strong className="block text-[15px] font-semibold">{game.name}</strong>
          {details.isLoading ? (
            <Skeleton className="mt-1 h-4 w-40" />
          ) : (
            <span className="text-xs text-muted-foreground">
              {[d?.developers?.join(', '), d?.release_date?.date].filter(Boolean).join(' · ') || '暂无商店信息'}
            </span>
          )}
        </div>
        <dl className="m-0 grid grid-cols-3 gap-2">
          <div><dt className="text-xs text-muted-foreground">总时长</dt><dd className="tabular m-0 font-semibold">{formatHours(game.playtime_forever)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">近两周</dt><dd className="tabular m-0 font-semibold">{formatHours(game.playtime_2weeks || 0)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">成就</dt><dd className="tabular m-0 font-semibold">{list.length ? `${unlocked.length} / ${list.length}` : '—'}</dd></div>
        </dl>
        {d?.short_description && <p className="m-0 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{d.short_description}</p>}
        {recent.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-2.5">
            <span className="text-xs text-muted-foreground">最近解锁</span>
            {recent.map((a) => (
              <div key={a.name} className="flex items-center gap-2">
                <img src={fullUrl(a.local_icon, a.icon)} alt="" className="size-6 shrink-0 rounded" loading="lazy" />
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                <span className="tabular text-xs text-muted-foreground">{day(a.unlock_time)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-2.5 text-xs">
          <button type="button" onClick={onOpen} className="inline-flex items-center gap-1.5 font-medium text-accent-foreground hover:underline">
            <Maximize2 className="size-3.5" aria-hidden="true" />
            媒体、全部成就与新闻
          </button>
          <a href={`https://store.steampowered.com/app/${game.appid}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            Steam <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </div>
        {lastPlayed(game) && <span className="text-xs text-muted-foreground">最近游玩 {lastPlayed(game)}</span>}
      </div>
    </aside>
  );
}
