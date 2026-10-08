import { useState } from 'react';
import { Search } from 'lucide-react';
import { Select } from '../ui/Select';
import { cn } from '../../lib/utils';
import { formatHours, lastPlayed } from './format';

const SORTS = [
  { value: 'playtime', label: '游玩最多' },
  { value: 'recent', label: '最近游玩' },
  { value: 'name', label: '名称' },
];
const PAGE = 40;


function Capsule({ appid }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="h-[34px] w-[92px] shrink-0 rounded-[5px] bg-muted" />
  ) : (
    <img
      src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_184x69.jpg`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-[34px] w-[92px] shrink-0 rounded-[5px] object-cover"
    />
  );
}

/** 紧凑游戏列表：一行一款，右侧条形表示相对时长 */
export default function GameList({ games, selectedId, onSelect }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('playtime');
  const [limit, setLimit] = useState(PAGE);

  const q = query.trim().toLowerCase();
  const shown = games
    .filter((g) => !q || g.name.toLowerCase().includes(q))
    .sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : sort === 'recent' ? (b.rtime_last_played || 0) - (a.rtime_last_played || 0) : (b.playtime_forever || 0) - (a.playtime_forever || 0),
    );
  const max = Math.max(1, ...games.map((g) => g.playtime_forever || 0));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-5 py-2.5">
        <label className="flex h-9 max-w-[300px] flex-[1_1_200px] items-center gap-1.5 rounded-[10px] border border-input bg-card px-2 text-muted-foreground focus-within:border-ring">
          <Search className="size-3.5" aria-hidden="true" />
          <span className="sr-only">搜索游戏</span>
          <input value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} placeholder="搜索游戏" className="w-full min-w-0 bg-transparent text-[15px] text-foreground outline-none" />
        </label>
        <label className="sr-only" htmlFor="game-sort">排序</label>
        <Select id="game-sort" value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
          {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">{shown.length} 款</span>
      </div>
      {shown.length ? (
        <ul className="m-0 grid list-none gap-x-4 border-t border-border px-2 py-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))' }}>
          {shown.slice(0, limit).map((game) => (
            <li key={game.appid}>
              <button
                type="button"
                aria-pressed={game.appid === selectedId}
                onClick={() => onSelect(game)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left',
                  game.appid === selectedId ? 'bg-accent' : 'hover:bg-muted/60',
                )}
              >
                <Capsule appid={game.appid} />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate font-medium">{game.name}</strong>
                  <span className="text-xs text-muted-foreground">
                    {lastPlayed(game) ? `最近 ${lastPlayed(game)}` : '未记录游玩时间'}
                    {game.playtime_2weeks ? ` · 近两周 ${formatHours(game.playtime_2weeks)}` : ''}
                  </span>
                </span>
                <span className="flex w-24 shrink-0 flex-col items-end gap-1">
                  <span className="tabular text-xs">{formatHours(game.playtime_forever)}</span>
                  <span className="block h-1 w-20 overflow-hidden rounded-full bg-muted">
                    <i className="block h-full rounded-full bg-primary" style={{ width: `${((game.playtime_forever || 0) / max) * 100}%` }} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-border px-5 py-10 text-center text-muted-foreground">
          {games.length ? '没有匹配的游戏。' : '没有找到游戏。点击“同步”从 Steam 获取。'}
        </p>
      )}
      {limit < shown.length && (
        <div className="border-t border-border px-5 py-2.5 text-right">
          <button type="button" onClick={() => setLimit((n) => n + PAGE)} className="text-xs font-medium text-accent-foreground hover:underline">加载更多</button>
        </div>
      )}
    </div>
  );
}
