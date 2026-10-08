
import { useState, type FormEvent } from "react";
import { ChevronDown, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/shadcn/dialog";
import { fundGroups, dcaFrequencies, categoryMeta, money, quantity, portfolioSchema, type Asset, type Portfolio, type FundGroup } from "./lib/portfolio";
import AssetIcon from "./asset-icon";
import { summarizeFunds, groupOf, type Fund } from "./lib/funds";
const dateOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
type Draft = { id: string; name: string; quantity: string; value: string; date: string; group: FundGroup; enabled: boolean; amount: string; frequency: keyof typeof dcaFrequencies };
function BatchFunds({ portfolio, revision, onSave, onClose }: { portfolio: Portfolio; revision: number; onSave: (p: Portfolio, revision: number) => Promise<boolean>; onClose: () => void }) {
  const [drafts, setDrafts] = useState<Draft[]>(() => portfolio.assets.filter((a): a is Fund => a.category === "fund").map(f => ({ id: f.id, name: f.name, quantity: String(f.quantity), value: String(f.marketValue), date: dateOf(f.updatedAt ?? portfolio.asOf), group: groupOf(f), enabled: f.dca?.enabled ?? false, amount: String(f.dca?.amount ?? 0), frequency: f.dca?.frequency ?? "monthly" })));
  const [date, setDate] = useState(dateOf(new Date().toISOString())); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const change = (id: string, patch: Partial<Draft>) => setDrafts(rows => rows.map(r => r.id === id ? { ...r, ...patch } : r));
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      const assets: Asset[] = portfolio.assets.map(a => {
        if (a.category !== "fund") return a;
        const row = drafts.find(r => r.id === a.id)!;
        if (!row.quantity.trim() || !row.value.trim() || (row.enabled && !row.amount.trim())) throw new Error(`${a.name}：请填写份额、市值和定投金额。`);
        const changedValue = Number(row.quantity) !== a.quantity || Number(row.value) !== a.marketValue || row.date !== dateOf(a.updatedAt ?? portfolio.asOf);
        return { ...a, quantity: Number(row.quantity), marketValue: Number(row.value), group: row.group, dca: { enabled: row.enabled, amount: Number(row.amount), frequency: row.frequency }, ...(changedValue ? { updatedAt: new Date(`${row.date}T00:00:00+08:00`).toISOString() } : {}) };
      });
      const checked = portfolioSchema.safeParse({ ...portfolio, asOf: new Date().toISOString(), assets });
      if (!checked.success) throw new Error("请检查所有基金的份额、金额和日期，数值须为非负数字。");
      if (await onSave(checked.data, revision)) onClose(); else setError("保存未完成，填写内容仍保留。如果另一设备已修改，请复制填写内容后重新打开批量更新。");
    } catch (e) { setError(e instanceof Error ? e.message : "保存失败，请重试。"); } finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}><DialogContent className="dialog-content fund-batch"><DialogHeader><DialogTitle>批量更新基金</DialogTitle><DialogDescription>更新原有基金的总份额与人民币当前市值，一次保存到 NAS。定投计划单独统计，不会自动增加持仓。</DialogDescription></DialogHeader>
    <form onSubmit={submit}><div className="fund-date-all"><label>统一市值日期<input type="date" required value={date} max={dateOf(new Date().toISOString())} onChange={e => setDate(e.target.value)}/></label><button type="button" className="button" onClick={() => setDrafts(rows => rows.map(row => ({ ...row, date })))}>应用到全部基金</button></div>
      <div className="fund-batch-list">{drafts.map(row => <fieldset className="fund-draft" key={row.id} disabled={saving}><legend>{row.name}</legend><div className="fund-fields"><label>投资方向<select aria-label={`${row.name}投资方向`} value={row.group} onChange={e => change(row.id, { group: e.target.value as FundGroup })}>{Object.entries(fundGroups).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label>总份额<input aria-label={`${row.name}总份额`} type="number" min="0" step="any" required value={row.quantity} onChange={e => change(row.id, { quantity: e.target.value })}/></label><label>当前市值（CNY）<input aria-label={`${row.name}当前市值`} type="number" min="0" step="any" required value={row.value} onChange={e => change(row.id, { value: e.target.value })}/></label><label>市值日期<input aria-label={`${row.name}市值日期`} type="date" required value={row.date} max={dateOf(new Date().toISOString())} onChange={e => change(row.id, { date: e.target.value })}/></label></div>
      <details className="fund-plan-edit"><summary>定投计划{row.enabled ? " · 定投中" : "（选填）"}</summary><div className="fund-fields fund-plan-fields"><label className="fund-check"><input type="checkbox" checked={row.enabled} onChange={e => change(row.id, { enabled: e.target.checked })}/>定投中</label><label>每期金额（CNY）<input aria-label={`${row.name}每期定投金额`} type="number" min="0" step="any" required={row.enabled} disabled={!row.enabled} value={row.amount} onChange={e => change(row.id, { amount: e.target.value })}/></label><label>频率<select aria-label={`${row.name}定投频率`} disabled={!row.enabled} value={row.frequency} onChange={e => change(row.id, { frequency: e.target.value as Draft["frequency"] })}>{Object.entries(dcaFrequencies).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label></div></details></fieldset>)}</div>
      {error && <p className="error-text" role="alert">{error}</p>}<div className="dialog-buttons"><button className="button" type="button" disabled={saving} onClick={onClose}>取消</button><button className="button primary" disabled={saving} type="submit">{saving ? "保存中…" : `保存 ${drafts.length} 只基金`}</button></div>
    </form></DialogContent></Dialog>;
}
export default function FundOverview({ portfolio, demo, ready, revision, onSave, onEditing }: { portfolio: Portfolio; demo: boolean; ready: boolean; revision: number; onSave: (p: Portfolio, revision: number) => Promise<boolean>; onEditing: (editing: boolean) => void }) {
  const summary = summarizeFunds(portfolio.assets); const [batch, setBatch] = useState<{ portfolio: Portfolio; revision: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const cards = summary.groups.flatMap(group => group.key === "other"
    ? group.funds.map(fund => ({ key: `fund:${fund.id}`, name: fund.name, funds: [fund], value: fund.marketValue, grouped: false }))
    : [{ key: `group:${group.key}`, name: group.name, funds: group.funds, value: group.value, grouped: true }]);
  const activeCard = cards.find(card => card.key === selected);
  const fundColor = categoryMeta.fund.color;
  function close() { setBatch(null); onEditing(false); }
  if (!summary.funds.length) return null;
  return <section className="visual-card fund-overview" aria-label="基金同类汇总"><div className="history-heading"><div><h2>基金汇总</h2><p className="visual-caption">标普、纳指按投资方向合并；其他基金逐只显示，份额不相加</p></div><button className="button" disabled={demo || !ready} onClick={() => { setBatch({ portfolio, revision }); onEditing(true); }}>批量更新基金</button></div>
    <div className="fund-totals"><div><span>基金合计 · CNY</span><strong>{money(summary.total, "CNY")}</strong></div><div><span>每月计划投入 · CNY</span><strong>{money(summary.monthly, "CNY")}</strong><small>{summary.active} 只定投中</small></div></div>
    <div className="fund-card-grid">{cards.map(card => <button key={card.key} className={`category-card fund-summary-card ${selected === card.key ? "selected" : ""}`} aria-expanded={selected === card.key} aria-controls="fund-card-details" onClick={() => setSelected(previous => previous === card.key ? null : card.key)}>
      <div className="category-top"><AssetIcon className="category-icon" asset={card.funds[0] ?? {category:"fund",name:card.name}} group={card.grouped ? card.key.slice(6) as FundGroup : undefined}/><span>{card.name}</span><small>{card.grouped ? `${card.funds.length} 只` : "单只基金"}</small></div>
      <strong>{money(card.value, "CNY")}</strong><div className="category-track"><i style={{ width: `${summary.total ? card.value / summary.total * 100 : 0}%`, background: fundColor }}/></div>
      <span className="category-share">占基金市值 {summary.total ? (card.value / summary.total * 100).toFixed(1) : "0.0"}%<ChevronDown size={14} className={selected === card.key ? "fund-chevron-open" : ""}/></span>
    </button>)}</div>
    <div id="fund-card-details" hidden={!activeCard}>
      {activeCard && <section className="fund-detail-panel" aria-label={`${activeCard.name}持仓详情`}><div className="fund-detail-heading"><div><h3>{activeCard.name} · 持仓详情</h3><p>{activeCard.funds.length} 只基金 · 人民币市值 {money(activeCard.value, "CNY")}</p></div><button className="icon-button" aria-label="收起基金详情" onClick={() => setSelected(null)}><X size={16}/></button></div>
        {activeCard.funds.length ? <div className="fund-detail-list">{activeCard.funds.map(fund => <article className="fund-detail-item" key={fund.id}><div className="fund-detail-identity"><AssetIcon asset={fund}/><div><strong>{fund.name}</strong><small>{fund.symbol || "手动人民币市值"} · {dateOf(fund.updatedAt ?? portfolio.asOf)}</small>{fund.dca?.enabled && <span className="fund-detail-plan">{dcaFrequencies[fund.dca.frequency]}定投 {money(fund.dca.amount, "CNY")}</span>}</div></div><div className="fund-detail-metrics"><span>持有份额<strong>{quantity(fund)}</strong></span><span>当前市值<strong>{money(fund.marketValue, "CNY")}</strong></span></div></article>)}</div> : <p className="visual-caption">暂无此类基金</p>}
      </section>}
    </div>
    <p className="visual-caption">分组可在批量更新中调整。每月计划按 21 个交易日或 52 ÷ 12 周估算，不代表实际扣款，也不计入资产总额。{demo && "示例模式请先添加真实基金，随后即可批量更新。"}</p>
    {batch && <BatchFunds portfolio={batch.portfolio} revision={batch.revision} onSave={onSave} onClose={close}/>}
  </section>;
}
