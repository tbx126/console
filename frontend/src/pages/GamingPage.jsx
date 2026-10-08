import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { StatStrip } from '../components/ui/StatStrip';
import { Skeleton } from '../components/ui/Skeleton';
import GameList from '../components/gaming/GameList';
import GamePanel from '../components/gaming/GamePanel';
import GameDetail from '../components/gaming/GameDetail';
import { useApi } from '../services/api';
import gamingApi from '../services/gamingApi';

const number = new Intl.NumberFormat('zh-CN');
const hours = (minutes = 0) => `${number.format(Math.round(minutes / 60))} 小时`;

export default function GamingPage() {
  const games = useApi('/gaming/games', { ttl: 10 * 60_000 });
  const stats = useApi('/gaming/statistics', { ttl: 10 * 60_000 });
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cacheStatus, setCacheStatus] = useState(null);
  const poll = useRef(null);

  const list = games.data?.games ?? [];
  const current = selected ?? list.reduce((best, g) => (!best || (g.playtime_forever || 0) > (best.playtime_forever || 0) ? g : best), null);

  const watchCache = () => {
    clearInterval(poll.current);
    poll.current = setInterval(async () => {
      try {
        const status = await gamingApi.getCacheSyncStatus();
        setCacheStatus(status);
        if (!status.running) {
          clearInterval(poll.current);
          poll.current = null;
        }
      } catch {
        clearInterval(poll.current);
      }
    }, 2000);
  };

  useEffect(() => {
    gamingApi.getCacheSyncStatus().then((status) => {
      if (status.running) {
        setCacheStatus(status);
        watchCache();
      }
    }).catch(() => {});
    return () => clearInterval(poll.current);
  }, []);

  const sync = async () => {
    setSyncing(true);
    try {
      const result = await gamingApi.syncGames();
      toast.success('已从 Steam 同步');
      if (result.caching_started) watchCache();
    } catch {
      toast.error('同步失败，请检查 Steam API 密钥');
    } finally {
      setSyncing(false);
    }
  };

  const s = stats.data;
  const caching = cacheStatus?.running;

  return (
    <div className="page">
      <PageHeader
        title="游戏"
        meta={caching ? `正在缓存游戏数据 ${cacheStatus.completed ?? 0} / ${cacheStatus.total ?? '?'}` : list.length ? `Steam 游戏库 ${list.length} 款` : ''}
        actions={
          <Button variant="outline" onClick={sync} isLoading={syncing}>
            {!syncing && <RefreshCw />}
            同步
          </Button>
        }
      />

      <StatStrip
        label="游戏统计"
        loading={stats.isLoading}
        items={[
          { label: '游戏', value: s ? `${number.format(s.total_games)} 款` : '—' },
          { label: '总时长', value: s ? hours(s.total_playtime) : '—' },
          { label: '近两周', value: s ? hours(s.recent_playtime) : '—' },
          { label: '最常玩', value: s?.most_played_game || '—', hint: s?.most_played_time ? hours(s.most_played_time) : '' },
        ]}
      />

      <div className="flex flex-wrap items-start gap-3">
        <section className="min-w-0 flex-[999_1_560px] overflow-hidden rounded-[10px] border border-border bg-card">
          {games.isLoading ? <Skeleton className="m-4 h-64" /> : <GameList games={list} selectedId={current?.appid} onSelect={setSelected} />}
        </section>
        <div className="flex-[1_1_320px] md:sticky md:top-[calc(var(--topbar-height)+16px)]">
          {current ? (
            <GamePanel key={current.appid} game={current} onOpen={() => setDetailOpen(true)} />
          ) : (
            !games.isLoading && <p className="rounded-[10px] border border-border bg-card px-4 py-8 text-center text-muted-foreground">同步后选择一款游戏查看详情。</p>
          )}
        </div>
      </div>

      {detailOpen && current && <GameDetail game={current} onClose={() => setDetailOpen(false)} />}
    </div>
  );
}
