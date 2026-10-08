import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categories, categoryMeta, currencies, money, type Currency, type Snapshot } from "./lib/portfolio";
import type { valueAsset } from "./lib/portfolio";

type Row = ReturnType<typeof valueAsset>;
const DAY = 86400000;
const MILESTONES_SGD = [50_000, 100_000, 150_000, 200_000, 250_000, 300_000, 400_000, 500_000, 750_000, 1_000_000];
const RANGES = [{ id: 30, label: "1 月" }, { id: 90, label: "3 月" }, { id: 365, label: "1 年" }, { id: 0, label: "全部" }];
const day = (t: number) => new Date(t).toISOString().slice(0, 10);
const month = (t: number) => new Date(t).toISOString().slice(0, 7);
const short = (v: number, c: Currency) => {
  const sign = v < 0 ? "−" : "";
  const a = Math.abs(v);
  const unit = a >= 1_000_000 ? `${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M` : a >= 1000 ? `${(a / 1000).toFixed(a >= 100_000 ? 0 : 1)}k` : a.toFixed(0);
  return `${sign}${c === "SGD" ? "S$" : c === "USD" ? "$" : c === "CNY" ? "¥" : "HK$"}${unit}`;
};

function Card({ title, meta, actions, children, className = "" }: { title: string; meta?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-[10px] border border-border bg-card ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
        <div className="flex min-w-0 items-baseline gap-2"><h2 className="m-0 text-sm font-semibold">{title}</h2>{meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}</div>
        {actions}
      </div>
      <div className="px-4 pb-3 pt-2">{children}</div>
    </section>
  );
}

function Seg<T extends string | number>({ items, value, onChange, label }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-lg bg-muted p-0.5">
      {items.map(i => (
        <button key={String(i.id)} type="button" aria-pressed={i.id === value} onClick={() => onChange(i.id)}
          className={`h-6 rounded-md px-2 text-xs ${i.id === value ? "bg-card font-semibold text-accent-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]" : "text-muted-foreground hover:text-foreground"}`}>{i.label}</button>
      ))}
    </div>
  );
}

function Tip({ active, payload, label, render }: { active?: boolean; payload?: { value: number; name: string; color?: string; payload: Record<string, unknown> }[]; label?: string | number; render: (p: { value: number; name: string; color?: string; payload: Record<string, unknown> }[], label?: string | number) => React.ReactNode }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg">{render(payload, label)}</div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="grid h-[180px] place-items-center px-6 text-center text-xs text-muted-foreground">{children}</div>;
}

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };

export default function PortfolioInsights({ rows, history, currency, missing, demo }: { rows: Row[]; history: Snapshot[]; currency: Currency; missing: number; demo: boolean; refreshing?: boolean }) {
  const navigate = useNavigate();
  const [range, setRange] = useState(365);
  const [table, setTable] = useState(false);
  const points = useMemo(() => history.map(p => ({ t: Date.parse(p.at), v: p.totals[currency], sgd: p.totals.SGD, categories: p.categories })).filter(p => Number.isFinite(p.t)).sort((a, b) => a.t - b.t), [history, currency]);
  const visible = useMemo(() => {
    if (!range || !points.length) return points;
    const from = points[points.length - 1].t - range * DAY;
    return points.filter(p => p.t >= from);
  }, [points, range]);

  // Milestone lines are defined in SGD; convert with the latest observed ratio.
  const ratio = points.length ? points[points.length - 1].v / (points[points.length - 1].sgd || 1) : 1;
  const [lo, hi] = visible.length ? [Math.min(...visible.map(p => p.v)), Math.max(...visible.map(p => p.v))] : [0, 0];
  const lines = MILESTONES_SGD.map(m => ({ m, y: m * ratio })).filter(l => l.y >= lo * 0.9 && l.y <= hi * 1.1);
  const firstCross = MILESTONES_SGD.map(m => points.find(p => p.sgd >= m)).filter((p): p is (typeof points)[number] => !!p && (!visible.length || p.t >= visible[0].t));

  const monthly = useMemo(() => {
    const ends = new Map<string, (typeof points)[number]>();
    for (const p of points) ends.set(month(p.t), p);
    const list = [...ends.entries()];
    return list.slice(1).map(([m, p], i) => ({ month: m, label: `${Number(m.slice(5))}月`, value: p.v, change: p.v - list[i][1].v })).slice(-12);
  }, [points]);
  const extremes = monthly.length ? [Math.max(...monthly.map(m => m.change)), Math.min(...monthly.map(m => m.change))] : [];

  const composition = useMemo(() => {
    const ends = new Map<string, Record<string, number | string>>();
    for (const p of points) {
      if (!p.categories) continue;
      const sum = categories.reduce((s, c) => s + p.categories![c], 0);
      if (sum <= 0) continue;
      ends.set(month(p.t), { month: month(p.t), ...Object.fromEntries(categories.map(c => [c, p.categories![c] / sum])) });
    }
    return [...ends.values()].slice(-36);
  }, [points]);

  const valued = rows.filter(r => r.value !== null && r.value > 0) as (Row & { value: number })[];
  const total = valued.reduce((s, r) => s + r.value, 0);
  const exposure = currencies.map(c => ({ c, v: valued.filter(r => r.nativeCurrency === c).reduce((s, r) => s + r.value, 0) })).filter(e => e.v > 0).sort((a, b) => b.v - a.v);
  const ranked = [...valued].sort((a, b) => b.value - a.value);
  const top10 = ranked.slice(0, 10);
  const share = (n: number) => total ? ranked.slice(0, n).reduce((s, r) => s + r.value, 0) / total : 0;
  const [top3, top10Share] = [share(3), share(10)];

  return (
    <div className="flex flex-col gap-3">
      {missing > 0 && <p className="m-0 text-xs text-muted-foreground">{missing} 项资产暂无报价，以下比例只含已估值部分。</p>}

      <Card title="资产走势" meta={demo ? "示例模式只记录当前页面的观察点" : "虚线为里程碑，圆点为首次达到"} actions={
        <div className="flex items-center gap-1.5">
          <Seg label="时间范围" items={RANGES} value={range} onChange={setRange} />
          <button type="button" onClick={() => setTable(v => !v)} className="h-7 rounded-md border border-border bg-card px-2 text-xs hover:bg-muted">{table ? "隐藏数据表" : "数据表"}</button>
        </div>}>
        {visible.length < 2 ? <Empty>记录点不足。完整估值后会自动记录，至少两个点才能画出走势。</Empty> : (
          <div className="h-[240px]" role="img" aria-label={`资产走势，从 ${short(visible[0].v, currency)} 到 ${short(visible[visible.length - 1].v, currency)}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visible} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={t => (range && range <= 90 ? day(t).slice(5) : month(t))} tick={axis} axisLine={false} tickLine={false} minTickGap={40} />
                <YAxis width={56} tickFormatter={v => short(v, currency)} tick={axis} axisLine={false} tickLine={false} domain={[(d: number) => d * 0.97, (d: number) => d * 1.02]} />
                {lines.map(l => <ReferenceLine key={l.m} y={l.y} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: short(l.m, "SGD"), position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }} />)}
                <Area type="monotone" dataKey="v" stroke="var(--cat-stock)" strokeWidth={2} fill="var(--chart-area)" isAnimationActive={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
                {firstCross.map(p => <ReferenceDot key={p.t} x={p.t} y={p.v} r={5} fill="var(--cat-gold)" stroke="var(--card)" strokeWidth={2} />)}
                <Tooltip content={<Tip render={(pl, l) => <><span className="text-muted-foreground">{day(Number(l))}</span><br /><strong className="tabular">{money(pl[0].value, currency)}</strong></>} />} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {table && monthly.length > 0 && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead><tr className="text-muted-foreground"><th className="py-1 text-left font-normal">月末</th><th className="py-1 text-right font-normal">总资产</th><th className="py-1 text-right font-normal">较上月</th></tr></thead>
              <tbody>{[...monthly].reverse().map(m => <tr key={m.month} className="border-t border-border"><td className="tabular py-1">{m.month}</td><td className="tabular py-1 text-right">{money(m.value, currency, 0)}</td><td className="tabular py-1 text-right">{m.change >= 0 ? "+" : "−"}{money(Math.abs(m.change), currency, 0)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
        <Card title="类别构成" meta="月末占比">
          <div className="mb-1 flex flex-wrap gap-3">{categories.map(c => <span key={c} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><i className="size-2 rounded-[2px]" style={{ background: categoryMeta[c].color }} />{categoryMeta[c].name}</span>)}</div>
          {composition.length < 2 ? <Empty>新的记录点开始按类别保存，积累两个月后显示构成变化。</Empty> : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={composition} stackOffset="expand" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis width={36} tickFormatter={v => `${Math.round(v * 100)}%`} tick={axis} axisLine={false} tickLine={false} />
                  {categories.map(c => <Area key={c} type="monotone" dataKey={c} name={categoryMeta[c].name} stackId="1" stroke="var(--card)" strokeWidth={1.5} fill={categoryMeta[c].color} fillOpacity={0.9} isAnimationActive={false} />)}
                  <Tooltip content={<Tip render={(pl, l) => <><span className="text-muted-foreground">{l}</span>{[...pl].reverse().map(e => <div key={e.name} className="flex justify-between gap-3"><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-[2px]" style={{ background: e.color }} />{e.name}</span><strong className="tabular">{(e.value * 100).toFixed(1)}%</strong></div>)}</>} />} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="币种敞口与集中度" meta="按原币计价">
          {!total ? <Empty>暂无已估值资产。</Empty> : <>
            <div className="flex flex-col gap-1.5">
              {exposure.map(e => (
                <div key={e.c} className="grid grid-cols-[48px_minmax(0,1fr)_96px] items-center gap-2.5" title={`${e.c} ${money(e.v, currency, 0)}`}>
                  <span className="tabular">{e.c}</span>
                  <span className="h-2.5"><i className="block h-full rounded-r" style={{ width: `${(e.v / exposure[0].v) * 100}%`, background: "var(--cat-stock)" }} /></span>
                  <span className="tabular text-right">{(e.v / total * 100).toFixed(1)}% <span className="text-muted-foreground">{short(e.v, currency)}</span></span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>持仓集中度</span><span>前 3 项 {(top3 * 100).toFixed(1)}% · 前 10 项 {(top10Share * 100).toFixed(1)}%</span></div>
              <div className="flex h-5 gap-0.5 overflow-hidden rounded text-[11px]" role="img" aria-label={`前 3 项占 ${(top3 * 100).toFixed(1)}%，第 4 至 10 项占 ${((top10Share - top3) * 100).toFixed(1)}%，其余 ${((1 - top10Share) * 100).toFixed(1)}%`}>
                <span className="flex items-center bg-primary pl-1.5 text-primary-foreground" style={{ flex: top3 || 0.0001 }}>前 3</span>
                {top10Share - top3 > 0.001 && <span className="flex items-center bg-accent pl-1.5 text-accent-foreground" style={{ flex: top10Share - top3 }}>4–10</span>}
                {1 - top10Share > 0.001 && <span className="flex items-center bg-muted pl-1.5 text-muted-foreground" style={{ flex: 1 - top10Share }}>其余</span>}
              </div>
            </div>
          </>}
        </Card>

        <Card title="前 10 项持仓" meta="点击在明细中查看">
          {!top10.length ? <Empty>暂无已估值资产。</Empty> : <div className="flex flex-col gap-0.5">
            {top10.map(r => (
              <button key={r.asset.id} type="button" onClick={() => navigate(`/portfolio?q=${encodeURIComponent(r.asset.name)}`)}
                className="grid h-7 grid-cols-[minmax(0,128px)_minmax(0,1fr)_88px] items-center gap-2.5 rounded px-1 text-left hover:bg-muted" title={`${r.asset.name} · ${categoryMeta[r.asset.category].name} · ${money(r.value, currency)}`}>
                <span className="truncate">{r.asset.name}</span>
                <span className="h-2.5"><i className="block h-full rounded-r" style={{ width: `${(r.value / top10[0].value) * 100}%`, background: categoryMeta[r.asset.category].color }} /></span>
                <span className="tabular text-right">{short(r.value, currency)} <span className="text-muted-foreground">{(r.value / total * 100).toFixed(1)}%</span></span>
              </button>
            ))}
          </div>}
        </Card>

        <Card title="月度变化" meta="月末较上月，含波动与新增投入">
          {monthly.length < 2 ? <Empty>至少需要跨两个月的记录点。</Empty> : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 16, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval={0} />
                  <YAxis width={56} tickFormatter={v => short(v, currency)} tick={axis} axisLine={false} tickLine={false} />
                  <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                  <Bar dataKey="change" radius={[3, 3, 3, 3]} isAnimationActive={false} label={({ x, y, width, height, value }: { x?: unknown; y?: unknown; width?: unknown; height?: unknown; value?: unknown }) => {
                    const v = Number(value);
                    if (!extremes.includes(v)) return <g />;
                    const top = Number(y) + (v < 0 ? Number(height) + 12 : -4);
                    return <text x={Number(x) + Number(width) / 2} y={top} textAnchor="middle" fontSize={11} fill="var(--foreground)">{short(v, currency)}</text>;
                  }}>
                    {monthly.map(m => <Cell key={m.month} fill={m.change >= 0 ? "var(--cat-stock)" : "color-mix(in srgb, var(--cat-stock) 35%, transparent)"} />)}
                  </Bar>
                  <Tooltip cursor={{ fill: "var(--muted)" }} content={<Tip render={pl => <><span className="text-muted-foreground">{String(pl[0].payload.month)}</span><br /><strong className="tabular">{pl[0].value >= 0 ? "+" : "−"}{money(Math.abs(pl[0].value), currency, 0)}</strong></>} />} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
