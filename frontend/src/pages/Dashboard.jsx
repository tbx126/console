import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatStrip } from '../components/ui/StatStrip';
import { Section } from '../components/ui/Section';
import { SegmentedTabs } from '../components/ui/SegmentedTabs';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import EmojiPicker from '../components/dashboard/EmojiPicker';
import { useApi } from '../services/api';
import { invalidate, useQuery } from '../lib/query';
import { loadPortfolioSummary } from '../features/portfolio/lib/summary';
import { categoryMeta, money } from '../features/portfolio/lib/portfolio';

const number = new Intl.NumberFormat('zh-CN');
const MODULES = { portfolio: '资产', travel: '旅行', gaming: '游戏' };
const FILTERS = [{ id: 'all', label: '全部' }, ...Object.entries(MODULES).map(([id, label]) => ({ id, label }))];
const today = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());

function Sparkline({ points }) {
  if (points.length < 2) return null;
  const vs = points.map((p) => p.v);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const xy = points.map((p) => [((p.t - t0) / (t1 - t0 || 1)) * 200, 44 - ((p.v - lo) / (hi - lo || 1)) * 40]);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const rising = vs[vs.length - 1] >= vs[0];
  return (
    <svg viewBox="0 0 200 48" preserveAspectRatio="none" className="h-12 min-w-[120px] flex-1" role="img" aria-label={`近 90 天资产走势，整体${rising ? '上升' : '下降'}`}>
      <path d={`M0,48 L${line.replaceAll(' ', ' L')} L200,48 Z`} fill="var(--chart-area)" />
      <polyline points={line} fill="none" stroke="var(--cat-stock)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ProgressBar({ value, className, label }) {
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className={`block h-1.5 overflow-hidden rounded-full bg-muted ${className ?? ''}`}
    >
      <i className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, value * 100)}%` }} />
    </span>
  );
}

const pct = (v) => `${(v * 100).toFixed(1)}%`;

export default function Dashboard() {
  const [filter, setFilter] = useState('all');
  const summaryQuery = useQuery('/portfolio/summary', () => loadPortfolioSummary(), { ttl: 60_000 });
  const milestonesQuery = useApi('/milestones', { ttl: 60_000 });
  const travel = useApi('/travel/statistics');
  const gaming = useApi('/gaming/statistics', { ttl: 10 * 60_000 });
  const flights = useApi('/travel/flights');
  const games = useApi('/gaming/games', { ttl: 10 * 60_000 });

  const summary = summaryQuery.data;
  const milestones = milestonesQuery.data;
  const currency = summary?.currency ?? 'SGD';
  const keep = (m) => filter === 'all' || m.module === filter;
  const upcoming = (milestones?.upcoming ?? []).filter(keep);
  const achieved = (milestones?.achieved ?? []).filter(keep);
  const next = (milestones?.upcoming ?? []).find((m) => m.module === 'portfolio') ?? milestones?.upcoming?.[0];

  const activity = useMemo(() => {
    const items = [];
    for (const f of [...(flights.data ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)) {
      items.push({ module: '旅行', to: '/travel', text: `${f.flight_number} ${f.origin} → ${f.destination}`, date: f.date.slice(0, 10) });
    }
    for (const a of summary?.recent ?? []) {
      items.push({ module: '资产', to: '/portfolio', text: `更新 ${a.name}`, date: a.updatedAt.slice(0, 10) });
    }
    for (const g of [...(games.data?.games ?? [])].filter((g) => g.rtime_last_played).sort((a, b) => b.rtime_last_played - a.rtime_last_played).slice(0, 3)) {
      items.push({ module: '游戏', to: '/gaming', text: `最近在玩 ${g.name}`, date: new Date(g.rtime_last_played * 1000).toISOString().slice(0, 10) });
    }
    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  }, [flights.data, games.data, summary?.recent]);

  const refresh = () => {
    invalidate();
  };

  const total = summary?.total ?? 0;
  const loadingSummary = summaryQuery.isLoading;

  return (
    <div className="page">
      <PageHeader
        title="总览"
        meta={today}
        actions={
          <Button variant="outline" onClick={refresh} isLoading={summaryQuery.isFetching || milestonesQuery.isFetching}>
            {!(summaryQuery.isFetching || milestonesQuery.isFetching) && <RefreshCw />}
            刷新
          </Button>
        }
      />

      <section className="flex flex-wrap overflow-hidden rounded-[10px] border border-border bg-card">
        <Link to="/portfolio/insights" className="flex flex-[1_1_380px] flex-wrap items-end gap-4 px-4 py-3.5 text-foreground hover:bg-muted/50">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">总资产 · {currency}</span>
            {loadingSummary ? (
              <Skeleton className="h-9 w-48" />
            ) : (
              <strong className="tabular text-[28px] font-semibold leading-tight tracking-tight">
                {summaryQuery.error ? '暂不可用' : summary?.empty ? '尚无持仓' : money(total, currency, 0)}
              </strong>
            )}
            <span className="text-xs text-muted-foreground">
              {summary?.change30 != null && (
                <strong className="tabular font-semibold text-foreground">
                  {summary.change30 >= 0 ? '+' : '−'}
                  {money(Math.abs(summary.change30), currency, 0)}{' '}
                </strong>
              )}
              {summary?.change30 != null ? '近 30 天 · ' : ''}
              {summary ? `${summary.assetCount} 项资产${summary.missing ? ` · ${summary.missing} 项待估值` : ''}` : ''}
            </span>
          </div>
          <Sparkline points={summary?.trend ?? []} />
        </Link>
        <a href="#milestones" className="flex flex-[1_1_300px] flex-col justify-center gap-1.5 border-l border-border bg-accent px-4 py-3.5 text-foreground">
          {next ? (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span>
                  <span className="text-xs text-accent-foreground">下一个里程碑</span>
                  <br />
                  <strong className="text-[15px] font-semibold">{next.title}</strong>
                </span>
                <strong className="tabular text-xl font-semibold text-accent-foreground">{pct(next.progress)}</strong>
              </div>
              <ProgressBar value={next.progress} label={`距离${next.title}`} className="bg-card" />
              <span className="text-xs text-muted-foreground">
                {next.detail}
                {next.eta ? ` · 按近 90 天增速约 ${next.eta} 达成` : ''}
              </span>
            </>
          ) : milestonesQuery.isLoading ? (
            <Skeleton className="h-14" />
          ) : (
            <span className="text-xs text-muted-foreground">记录资产、航班或同步游戏后，这里会显示下一个里程碑。</span>
          )}
        </a>
      </section>

      <StatStrip
        label="模块指标"
        loading={travel.isLoading && gaming.isLoading}
        items={[
          { label: '今年飞行', value: travel.data ? `${travel.data.this_year_flights} 段` : '—', hint: travel.data ? `累计 ${number.format(travel.data.total_flights)} 段` : '暂无数据', to: '/travel' },
          { label: '飞行里程', value: travel.data ? `${number.format(Math.round(travel.data.total_km))} km` : '—', hint: travel.data ? `${travel.data.airlines_used} 家航司` : '', to: '/travel' },
          { label: '到访地点', value: travel.data ? number.format(travel.data.airports_visited) : '—', hint: travel.data?.favorite_airline ? `常飞 ${travel.data.favorite_airline}` : '', to: '/travel' },
          { label: '游戏库', value: gaming.data ? `${number.format(gaming.data.total_games)} 款` : '—', hint: gaming.data ? `近两周 ${Math.round((gaming.data.recent_playtime ?? 0) / 60)} 小时` : '暂无数据', to: '/gaming' },
        ]}
      />

      <div className="flex flex-wrap items-start gap-3">
        <Section
          id="milestones"
          className="flex-[999_1_520px] scroll-mt-16"
          title="里程碑"
          meta={milestones ? `${achieved.length} 个已达成 · ${upcoming.length} 个进行中` : ''}
          actions={<SegmentedTabs size="sm" label="按模块筛选" tabs={FILTERS} value={filter} onChange={setFilter} />}
        >
          {milestonesQuery.isLoading ? (
            <Skeleton className="h-40" />
          ) : milestonesQuery.error ? (
            <p className="py-6 text-center text-muted-foreground">里程碑暂不可用。</p>
          ) : (
            <div className="grid gap-x-7" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              <div>
                <div className="py-1 text-xs text-muted-foreground">进行中</div>
                {upcoming.slice(0, 5).map((m) => (
                  <div key={m.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2.5 border-t border-border py-2">
                    <span className="mx-auto mt-1 size-3 rounded-full border-2 border-dashed border-muted-foreground" aria-hidden="true" />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span>
                        <strong className="font-semibold">{m.title}</strong>
                        <span className="ml-1.5 rounded bg-muted px-1.5 py-px text-[11px] text-muted-foreground">{MODULES[m.module]}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {m.detail}
                        {m.eta ? ` · 预计 ${m.eta}` : ''}
                      </span>
                      <ProgressBar value={m.progress} label={`${m.title} 进度`} />
                    </span>
                    <span className="tabular text-right font-semibold">{pct(m.progress)}</span>
                  </div>
                ))}
                {!upcoming.length && <p className="border-t border-border py-4 text-xs text-muted-foreground">暂无进行中的里程碑。</p>}
              </div>
              <div>
                <div className="py-1 text-xs text-muted-foreground">已达成</div>
                {achieved.slice(0, 6).map((m) => (
                  <div key={m.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2.5 border-t border-border py-2">
                    <EmojiPicker milestone={m} />
                    <span className="min-w-0">
                      <strong className="font-semibold">{m.title}</strong>
                      <span className="ml-1.5 rounded bg-muted px-1.5 py-px text-[11px] text-muted-foreground">{MODULES[m.module]}</span>
                      <span className="block truncate text-xs text-muted-foreground">{m.detail}</span>
                    </span>
                    <span className="tabular text-right text-xs text-muted-foreground">{m.date ?? '已达成'}</span>
                  </div>
                ))}
                {!achieved.length && <p className="border-t border-border py-4 text-xs text-muted-foreground">还没有达成的里程碑。</p>}
              </div>
            </div>
          )}
        </Section>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3">
          <Section title="资产分布" actions={<Link to="/portfolio/insights" className="text-xs font-medium text-accent-foreground hover:underline">分析 →</Link>}>
            {loadingSummary ? (
              <Skeleton className="h-28" />
            ) : summary && total > 0 ? (
              <>
                <div className="mb-1 mt-1 flex h-2 gap-0.5 overflow-hidden rounded" aria-hidden="true">
                  {summary.byCategory.filter((c) => c.value > 0).map((c) => (
                    <i key={c.category} style={{ flex: c.value, background: categoryMeta[c.category].color }} />
                  ))}
                </div>
                <ul className="m-0 list-none p-0">
                  {summary.byCategory.map((c) => (
                    <li key={c.category} className="flex items-center gap-2.5 border-t border-border py-1.5 first:border-t-0">
                      <i className="size-2 rounded-[2px]" style={{ background: categoryMeta[c.category].color }} />
                      <span className="flex-1">{categoryMeta[c.category].name}</span>
                      {c.missing === c.count ? (
                        <span className="text-xs text-muted-foreground">待估值</span>
                      ) : (
                        <>
                          <span className="tabular text-xs text-muted-foreground">{money(c.value, currency, 0)}</span>
                          <strong className="tabular w-12 text-right font-medium">{((c.value / total) * 100).toFixed(1)}%</strong>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="py-4 text-xs text-muted-foreground">{summaryQuery.error ? '资产数据暂不可用。' : '还没有可估值的持仓。'}</p>
            )}
          </Section>

          <Section title="最近动态" meta="跨模块">
            {activity.length ? (
              <ul className="m-0 list-none p-0">
                {activity.map((item) => (
                  <li key={`${item.module}-${item.text}-${item.date}`} className="border-t border-border first:border-t-0">
                    <Link to={item.to} className="flex items-center gap-2.5 py-1.5 text-foreground hover:text-accent-foreground">
                      <span className="w-8 shrink-0 rounded bg-muted py-px text-center text-[11px] text-muted-foreground">{item.module}</span>
                      <span className="min-w-0 flex-1 truncate">{item.text}</span>
                      <span className="tabular text-xs text-muted-foreground">{item.date.slice(5)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-xs text-muted-foreground">暂无动态。</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
