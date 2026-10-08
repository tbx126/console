import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, ChartPie, Gamepad2, Plane, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import travelApi from '../services/travelApi';
import gamingApi from '../services/gamingApi';
import { loadPortfolioSummary } from '../features/portfolio/lib/summary';
import { categoryMeta, money } from '../features/portfolio/lib/portfolio';

const number = new Intl.NumberFormat('zh-CN');

function MetricCard({ to, label, value, caption, loading }) {
  const body = (
    <>
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {loading ? (
        <Skeleton className="h-9 w-40" />
      ) : (
        <strong className="tabular text-[28px] font-semibold leading-tight tracking-tight">{value}</strong>
      )}
      <span className="text-xs text-muted-foreground">{caption}</span>
    </>
  );
  const className = 'flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-card px-6 py-5 text-foreground';
  return to ? (
    <Link to={to} className={`${className} transition-colors hover:border-ring`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

const modules = [
  { to: '/portfolio', icon: ChartPie, title: '资产', text: '现金、股票、基金、黄金与加密货币的当前市值' },
  { to: '/travel', icon: Plane, title: '旅行足迹', text: '航班记录、航线地图与航司统计' },
  { to: '/gaming', icon: Gamepad2, title: '游戏库', text: 'Steam 同步、游玩时长与成就' },
  { to: '/ai-assistant', icon: Bot, title: 'AI 助手', text: '用自然语言记录航班、提问与分析' },
];

const Dashboard = () => {
  const [portfolio, setPortfolio] = useState({ loading: true, data: null, error: false });
  const [travel, setTravel] = useState(null);
  const [gaming, setGaming] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    loadPortfolioSummary(controller.signal)
      .then((data) => setPortfolio({ loading: false, data, error: false }))
      .catch(() => { if (!controller.signal.aborted) setPortfolio({ loading: false, data: null, error: true }); });
    travelApi.getStatistics().then(setTravel).catch(() => setTravel(false));
    gamingApi.getStatistics().then((r) => setGaming(r.data)).catch(() => setGaming(false));
    return () => controller.abort();
  }, [reload]);

  const summary = portfolio.data;
  const total = summary?.total ?? 0;
  const portfolioValue = portfolio.error ? '暂不可用' : summary?.empty ? '尚无持仓' : money(total, summary?.currency ?? 'SGD', 0);
  const portfolioCaption = portfolio.error
    ? '无法连接资产数据'
    : summary?.empty
      ? '前往资产页添加或导入'
      : `${summary?.assetCount ?? 0} 项资产${summary?.missing ? ` · ${summary.missing} 项待估值` : ''}`;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Personal Life Console"
        title="总览"
        description="资产、旅行与游戏，在一处查看。"
        actions={
          <button
            type="button"
            onClick={() => {
              setPortfolio((p) => ({ ...p, loading: true }));
              setTravel(null);
              setGaming(null);
              setReload((n) => n + 1);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            刷新
          </button>
        }
      />

      <section aria-label="关键指标" className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <MetricCard
          to="/portfolio"
          label={`总资产 · ${summary?.currency ?? 'SGD'}`}
          value={portfolioValue}
          caption={portfolioCaption}
          loading={portfolio.loading}
        />
        <MetricCard
          to="/travel"
          label="累计飞行"
          value={travel ? `${number.format(travel.total_flights)} 段` : '—'}
          caption={travel ? `${number.format(Math.round(travel.total_km))} km · 今年 ${travel.this_year_flights} 段` : '暂无航班数据'}
          loading={travel === null}
        />
        <MetricCard
          to="/gaming"
          label="游戏库"
          value={gaming ? `${number.format(gaming.total_games)} 款` : '—'}
          caption={gaming ? `近两周游玩 ${Math.round((gaming.recent_playtime ?? 0) / 60)} 小时` : '暂无游戏数据'}
          loading={gaming === null}
        />
      </section>

      <section className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
        <Card className="px-6 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">资产分布</h2>
            <Link to="/portfolio" className="text-[13px] font-medium text-accent-foreground hover:underline">
              查看资产 →
            </Link>
          </div>
          {portfolio.loading ? (
            <Skeleton className="mt-6 h-24" />
          ) : summary && !summary.empty && total > 0 ? (
            <>
              <div className="mb-5 mt-6 flex h-2.5 gap-0.5 overflow-hidden rounded-md" aria-hidden="true">
                {summary.byCategory.filter((c) => c.value > 0).map((c) => (
                  <i key={c.category} style={{ flex: c.value, background: categoryMeta[c.category].color }} />
                ))}
              </div>
              <ul className="grid grid-cols-2 gap-x-7 gap-y-3 text-sm">
                {summary.byCategory.map((c) => (
                  <li key={c.category} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2.5">
                      <i className="size-2 rounded-[3px]" style={{ background: categoryMeta[c.category].color }} />
                      {categoryMeta[c.category].name}
                    </span>
                    <strong className="tabular font-medium">{((c.value / total) * 100).toFixed(1)}%</strong>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              {portfolio.error ? '资产数据暂不可用，请稍后刷新。' : '还没有可估值的持仓。'}
            </p>
          )}
        </Card>

        <Card className="px-6 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold">旅行</h2>
            <Link to="/travel" className="text-[13px] font-medium text-accent-foreground hover:underline">
              全部航班 →
            </Link>
          </div>
          {travel ? (
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {[
                ['到访城市', travel.cities_visited],
                ['到访机场', travel.airports_visited],
                ['乘坐航司', travel.airlines_used],
                ['最常乘坐', travel.favorite_airline || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="tabular mt-1 truncate text-lg font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          ) : travel === null ? (
            <Skeleton className="mt-6 h-24" />
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">旅行数据暂不可用。</p>
          )}
        </Card>
      </section>

      <section aria-label="模块" className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {modules.map(({ to, icon, title, text }) => {
          const Icon = icon;
          return (
          <Link
            key={to}
            to={to}
            className="group flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-card p-5 text-foreground transition-colors hover:border-ring"
          >
            <span className="grid size-9 place-items-center rounded-[9px] bg-accent text-accent-foreground">
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>
            <strong className="flex items-center justify-between text-[15px] font-semibold">
              {title}
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </strong>
            <span className="text-[13px] text-muted-foreground">{text}</span>
          </Link>
          );
        })}
      </section>
    </div>
  );
};

export default Dashboard;
