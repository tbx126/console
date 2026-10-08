
import { useId, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { money, type Currency, type Snapshot } from "./lib/portfolio";

const ranges = [{ days: 7, label: "7 天" }, { days: 30, label: "30 天" }, { days: 90, label: "90 天" }, { days: 0, label: "全部" }];
const dateLabel = (at: number, full = false) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Singapore", month: "2-digit", day: "2-digit", ...(full ? { year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false } : {}) }).format(at);
function HistoryTip({ active, payload, currency }: { active?: boolean; payload?: readonly { payload?: { at: number; value: number; cached: boolean } }[]; currency: Currency }) {
  const point = payload?.[0]?.payload;
  return active && point ? <div className="visual-tooltip"><strong>{dateLabel(point.at, true)}</strong><span>{money(point.value, currency)}</span>{point.cached && <small>含最近可用缓存行情</small>}</div> : null;
}
export default function AssetHistory({ history, currency, demo, refreshing }: { history: Snapshot[]; currency: Currency; demo: boolean; refreshing: boolean }) {
  const [days, setDays] = useState(30);
  const gradient = useId().replace(/:/g, "");
  const cutoff = days ? Date.now() - days * 86400000 : 0;
  const data = history.filter(p => Date.parse(p.at) >= cutoff).map(p => ({ at: Date.parse(p.at), value: p.totals[currency], cached: p.cached }));
  const first = data[0], last = data.at(-1);
  const domain: [number, number] | ["dataMin", "dataMax"] = data.length === 1 ? [first.at - 3600000, first.at + 3600000] : ["dataMin", "dataMax"];
  const sameDay = first && last && dateLabel(first.at, true).slice(0, 10) === dateLabel(last.at, true).slice(0, 10);
  return <section className="visual-card history-card" aria-label="总资产时间曲线">
    <div className="history-heading"><div><h2>资产金额走势</h2><p className="visual-caption">{demo ? "示例持仓的本次观察记录" : "按实际记录时间查看总资产"} · {currency}</p></div><div className="chart-toggle" aria-label="资产走势时间范围">{ranges.map(r => <button key={r.days} aria-pressed={days === r.days} onClick={() => setDays(r.days)}>{r.label}</button>)}</div></div>
    <div className="history-summary"><strong>{last ? money(last.value, currency) : "等待首次记录"}</strong><span>{last ? `${dateLabel(last.at, true)} · ${data.length} 个记录点` : refreshing ? "完整估值后自动记录" : "添加资产并获取完整报价后自动记录"}</span></div>
    <div className="history-chart" role="img" aria-label={`横轴为时间，纵轴为总资产金额（${currency}）。${data.length} 个记录点。${last ? `最近总资产 ${money(last.value, currency)}` : "暂无记录"}`}>
      {data.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 14, right: 18, left: 0, bottom: 10 }}><defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={.24}/><stop offset="100%" stopColor="var(--primary)" stopOpacity={.015}/></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4"/><XAxis dataKey="at" type="number" scale="time" domain={domain} tickFormatter={at => sameDay ? new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit", hour12: false }).format(at) : dateLabel(at)} minTickGap={40} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false}/><YAxis width={76} tickFormatter={n => new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(n)} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} axisLine={false}/><Tooltip content={<HistoryTip currency={currency}/>}/><Area type="linear" dataKey="value" stroke="var(--primary)" strokeWidth={2.5} fill={`url(#${gradient})`} dot={{ r: data.length === 1 ? 5 : 2, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false}/></AreaChart></ResponsiveContainer> : <div className="visual-empty">{history.length ? "此时间范围没有记录，可切换“全部”查看" : "尚无历史记录，首次完整估值后显示第一个记录点"}</div>}
    </div>
    <div className="history-footnote"><span>时间（新加坡）</span><span>资产金额（{currency}）</span></div>
    <p className="visual-caption">{demo ? "虚拟持仓记录，不写入你的资产历史。" : "打开页面或刷新行情后记录完整估值；每分钟保留最后一次记录，最多 2,000 个点。"}{data.length === 1 && " 当前只有一个记录点，后续记录会形成曲线。"} 历史金额使用记录时的汇率，持仓调整也会影响总额。</p>
  </section>;
}
