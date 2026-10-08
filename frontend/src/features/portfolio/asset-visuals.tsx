
import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Treemap } from "recharts";
import { assetAnalytics, type ValuedAsset } from "./lib/analytics";
import { categoryMeta, money, type Currency } from "./lib/portfolio";

const currencyColors: Record<Currency, string> = { SGD: "#5189dc", USD: "#555ce4", CNY: "#49a995", HKD: "#d6a647" };
function ChartTip({ active, payload, currency }: { active?: boolean; payload?: readonly { name?: string | number; value?: string | number; payload?: { name?: string } }[]; currency: Currency }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return <div className="visual-tooltip"><strong>{item.payload?.name ?? item.name}</strong><span>{money(Number(item.value), currency)}</span></div>;
}
function Tile(props: { x?: number; y?: number; width?: number; height?: number; name?: string; color?: string; depth?: number; value?: number; currency: Currency }) {
  const { x = 0, y = 0, width = 0, height = 0, name, color, depth, value = 0, currency } = props;
  if (depth !== 1 || width < 1 || height < 1) return null;
  const label = name && width > 68 && height > 42;
  const short = name ? name.slice(0, Math.max(2, Math.floor((width - 22) / 13))) : "";
  return <g><rect x={x + 2} y={y + 2} width={Math.max(0, width - 4)} height={Math.max(0, height - 4)} rx={7} fill={color ?? "#555ce4"}/><title>{name} · {money(value, currency)}</title>{label && <><text x={x + 12} y={y + 25} fill="white" fontSize={13} fontWeight={500}>{short}{short !== name ? "…" : ""}</text>{width > 120 && height > 64 && <text x={x + 12} y={y + 46} fill="white" opacity={.85} fontSize={12}>{money(value, currency, 0)}</text>}</>}</g>;
}
export default function AssetVisuals({ rows, currency, missing, onInspect }: { rows: ValuedAsset[]; currency: Currency; missing: number; onInspect: (name: string) => void }) {
  const [limit, setLimit] = useState<5 | 10>(5);
  const data = assetAnalytics(rows);
  const ranked = data.ranked.slice(0, limit).map(r => ({ name: r.asset.name, value: r.value, color: categoryMeta[r.asset.category].color }));
  const exposure = data.exposure.filter(e => e.value > 0).map(e => ({ ...e, name: e.currency, color: currencyColors[e.currency] }));
  const tiles = data.ranked.map(r => ({ name: r.asset.name, value: r.value, color: categoryMeta[r.asset.category].color }));
  const note = missing ? "仅含已估值资产" : `当前市值 · ${currency}`;
  return <section className="visual-section" aria-label="资产可视化">
    <div className="visual-heading"><div><h2>看清资产结构</h2><p>从币种、持仓与集中度查看当前资产；标普、纳指基金按投资方向合并</p></div><span>{note}</span></div>
    <div className="visual-grid">
      <article className="visual-card"><div className="section-title"><h3>原币敞口</h3><span>统一折合 {currency}</span></div><p className="visual-caption">按资产计价币种划分；黄金按美元参考价归类</p>
        {data.total > 0 ? <><div className="currency-chart" role="img" aria-label={exposure.map(e=>`${e.name} ${(e.value/data.total*100).toFixed(1)}%`).join("，")}><ResponsiveContainer width="100%" height={205}><PieChart><Pie data={exposure} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3} stroke="none" isAnimationActive={false}>{exposure.map(e=><Cell key={e.name} fill={e.color}/>)}</Pie><Tooltip content={<ChartTip currency={currency}/>}/></PieChart></ResponsiveContainer></div><div className="currency-breakdown">{exposure.map(e=><div key={e.name}><span><i style={{background:e.color}}/>{e.name}</span><strong>{(e.value/data.total*100).toFixed(1)}%</strong><small>{money(e.value,currency,0)}</small></div>)}</div></> : <div className="visual-empty">有可用市值后显示币种分布</div>}
      </article>
      <article className="visual-card"><div className="section-title"><h3>最大持仓</h3><div className="chart-toggle" aria-label="排行数量">{([5,10] as const).map(n=><button key={n} aria-pressed={limit===n} onClick={()=>setLimit(n)}>前 {n} 项</button>)}</div></div><p className="visual-caption">按市值排序，点击下方名称查看对应持仓</p>
        {ranked.length ? <><div className="rank-chart" role="img" aria-label={ranked.map(r=>`${r.name} ${money(r.value,currency)}`).join("，")} style={{height:Math.max(190,ranked.length*34)}}><ResponsiveContainer width="100%" height="100%"><BarChart data={ranked} layout="vertical" margin={{left:0,right:12,top:8,bottom:5}}><XAxis type="number" hide/><YAxis type="category" dataKey="name" width={112} tickLine={false} axisLine={false} tick={{fontSize:12,fill:"var(--muted-foreground)"}} tickFormatter={v=>String(v).length>9?`${String(v).slice(0,9)}…`:String(v)}/><Tooltip cursor={{fill:"var(--muted)"}} content={<ChartTip currency={currency}/>}/><Bar dataKey="value" radius={[0,5,5,0]} barSize={17} isAnimationActive={false}>{ranked.map(r=><Cell key={r.name} fill={r.color}/>)}</Bar></BarChart></ResponsiveContainer></div><div className="rank-links">{ranked.map((r,i)=><button key={`${r.name}-${i}`} onClick={()=>onInspect(r.name)}><span>{i+1}. {r.name}</span><strong>{(r.value/data.total*100).toFixed(1)}%</strong></button>)}</div></> : <div className="visual-empty">有可用市值后显示持仓排行</div>}
      </article>
      <article className="visual-card visual-wide"><div className="section-title"><h3>持仓全景</h3><span>面积代表市值占比</span></div><div className="concentration"><div><span>前三项持仓合计</span><strong>{data.topShare.toFixed(1)}<small>%</small></strong></div><p>标普、纳指基金按投资方向合并，其他基金及资产逐项显示；颜色对应资产类别。{missing > 0 && ` ${missing} 项缺价资产未计入。`}</p></div>
        {tiles.length ? <div className="treemap-chart" role="img" aria-label={tiles.map(t=>`${t.name} ${(t.value/data.total*100).toFixed(1)}%`).join("，")}><ResponsiveContainer width="100%" height="100%"><Treemap data={tiles} dataKey="value" nameKey="name" aspectRatio={1.5} content={<Tile currency={currency}/>} isAnimationActive={false}><Tooltip content={<ChartTip currency={currency}/>}/></Treemap></ResponsiveContainer></div> : <div className="visual-empty">添加资产并获取报价后，查看持仓全景</div>}
        <div className="visual-key">{Object.entries(categoryMeta).map(([key,c])=><span key={key}><i style={{background:c.color}}/>{c.name}</span>)}</div>
      </article>
    </div>
  </section>;
}
