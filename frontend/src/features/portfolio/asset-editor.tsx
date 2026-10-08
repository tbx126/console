
import { useRef, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import InstrumentPicker from "./instrument-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/shadcn/dialog";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/shadcn/select";
import { Input } from "@/components/shadcn/input";
import { categories, categoryMeta, currencies, portfolioSchema, type Asset, type Category, type Currency } from "./lib/portfolio";

function localDate(iso?: string) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit" }).format(iso ? new Date(iso) : new Date()); }
export default function AssetEditor({ asset, snapshotDate, demo, open, onClose, onSave, onDelete }: { asset: Asset | null; snapshotDate: string; demo: boolean; open: boolean; onClose: () => void; onSave: (asset: Asset) => Promise<void>; onDelete: (asset: Asset) => Promise<boolean> }) {
  const [category, setCategory] = useState<Category>(asset?.category ?? "cash");
  const [name, setName] = useState(asset?.name ?? ""); const [currency, setCurrency] = useState<Currency>(asset && "currency" in asset ? asset.currency : "SGD");
  const [symbol, setSymbol] = useState(asset && "symbol" in asset ? asset.symbol ?? "" : "");
  const [quantity, setQuantity] = useState(asset && "quantity" in asset ? String(asset.quantity) : "");
  const [value, setValue] = useState(asset?.category === "cash" ? String(asset.amount) : asset?.category === "fund" ? String(asset.marketValue) : "");
  const [asOf, setAsOf] = useState(localDate(asset?.updatedAt ?? (asset ? snapshotDate : undefined)));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  async function remove() {
    if (!asset || demo || saving || deleting) return;
    setError(""); setDeleting(true);
    try { if (!await onDelete(asset)) setError("删除未完成。如果另一设备已修改持仓，请关闭后重新打开编辑窗口再试。"); }
    catch { setError("删除未完成，请检查 NAS 连接后重试。"); }
    finally { setDeleting(false); }
  }
  const container = useRef<HTMLDivElement>(null);
  function chooseCategory(c: Category) { setCategory(c); setCurrency(c === "fund" ? "CNY" : c === "cash" ? "SGD" : "USD"); setSymbol(""); setError(""); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving || deleting || confirmDelete) return; setError("");
    try {
      const base = { id: asset?.id ?? crypto.randomUUID(), name: name.trim(), category, updatedAt: new Date(`${asOf}T00:00:00+08:00`).toISOString() };
      const data = category === "cash" ? { ...base, currency, amount: Number(value) }
        : category === "fund" ? { ...(asset?.category === "fund" ? { group: asset.group, dca: asset.dca } : {}), ...base, currency: "CNY", quantity: Number(quantity), marketValue: Number(value), ...(symbol.trim() ? { symbol: symbol.trim() } : {}) }
        : category === "gold" ? { ...base, quantity: Number(quantity) }
        : { ...base, currency: category === "crypto" ? "USD" : currency, quantity: Number(quantity), symbol: symbol.trim().toUpperCase() };
      const result = portfolioSchema.safeParse({ version: 1, asOf: new Date().toISOString(), assets: [data] });
      if (!result.success) { setError("请检查名称、数量和金额。股票需有效代码（如 AAPL、0700.HK）；加密货币请使用 BTC-USD 形式。"); return; }
      setSaving(true); await onSave(result.data.assets[0]);
    } catch { setError("保存未完成，请检查填写的数据后重试。"); } finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={v=>{if(!v && !saving && !deleting)onClose();}}><DialogContent ref={container} className="dialog-content asset-editor"><DialogHeader><DialogTitle>{asset ? "编辑资产" : "添加资产"}</DialogTitle><DialogDescription>{demo ? "保存后将移除全部示例持仓，只保留你填写的这项资产。" : "填写当前持有情况，保存后立即重新计算资产总额。"}</DialogDescription></DialogHeader><form onSubmit={submit} className="asset-form">
    <div className="form-field"><label htmlFor="asset-category">资产类别</label><Select value={category} onValueChange={v=>chooseCategory(v as Category)}><SelectTrigger id="asset-category" className="form-select" aria-label="资产类别"><SelectValue/></SelectTrigger><SelectContent>{categories.map(c=><SelectItem key={c} value={c}>{categoryMeta[c].name}</SelectItem>)}</SelectContent></Select></div>
    <InstrumentPicker key={category} category={category} container={container} onSelect={item=>{setName(item.name.slice(0,80));setSymbol(item.symbol);setCurrency(item.currency);setError("");}}/>
    <div className="form-field"><label htmlFor="asset-name">资产名称</label><Input id="asset-name" value={name} onChange={e=>setName(e.target.value)} required maxLength={80} placeholder={category === "gold" ? "例如：工商银行积存金" : category === "fund" ? "例如：标普 500 QDII" : "填写资产名称"}/></div>
    {(category === "stock" || category === "crypto" || category === "fund") && <div className="form-field"><label htmlFor="asset-symbol">{category === "fund" ? "基金代码（选填）" : "行情代码"}</label><Input id="asset-symbol" value={symbol} onChange={e=>setSymbol(e.target.value)} required={category!=="fund"} maxLength={24} spellCheck={false} autoCapitalize="characters" placeholder={category === "crypto" ? "BTC-USD / ETH-USD" : category === "fund" ? "六位基金代码" : "AAPL / 0700.HK / 600519.SS / D05.SI"}/>{category === "stock" && <p className="field-hint">沪市后缀 .SS，深市 .SZ，港股 .HK，新加坡 .SI；美股直接填写代码。</p>}</div>}
    {(category === "cash" || category === "stock") && <div className="form-field"><label htmlFor="asset-currency">{category === "cash" ? "余额币种" : "交易币种"}</label><Select value={currency} onValueChange={v=>setCurrency(v as Currency)}><SelectTrigger id="asset-currency" className="form-select" aria-label="资产币种"><SelectValue/></SelectTrigger><SelectContent>{currencies.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>}
    {category !== "cash" && <div className="form-field"><label htmlFor="asset-quantity">持有数量（{category === "gold" ? "克" : category === "fund" ? "份" : category === "stock" ? "股" : "币"}）</label><Input id="asset-quantity" type="number" min="0" max="1000000000000000" step="any" inputMode="decimal" required value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder="0"/></div>}
    {(category === "cash" || category === "fund") && <div className="form-field"><label htmlFor="asset-value">{category === "fund" ? "当前市值（人民币 CNY）" : `当前余额（${currency}）`}</label><Input id="asset-value" type="number" min="0" max="1000000000000000" step="any" inputMode="decimal" required value={value} onChange={e=>setValue(e.target.value)} placeholder="0.00"/>{category === "fund" && <p className="field-hint">填写支付宝中显示的当前市值，份额仅作记录。</p>}</div>}
    <div className="form-field"><label htmlFor="asset-date">{category === "cash" || category === "fund" ? "金额日期" : "持仓日期"}</label><Input id="asset-date" type="date" required value={asOf} max={localDate()} onChange={e=>setAsOf(e.target.value)} onInput={e=>setAsOf(e.currentTarget.value)}/></div>
    {category === "gold" && <p className="field-hint">按国际金价自动计算参考市值，不代表工行积存金赎回报价。</p>}
    {(category === "stock" || category === "crypto") && <p className="field-hint">保存后自动获取行情。首次获取失败会标为缺价，不会以零计价。</p>}
    {error && <p className="error-text" role="alert">{error}</p>}
    {confirmDelete && <div className="asset-delete-confirm" role="group" aria-label="确认删除资产"><strong>删除“{asset?.name}”？</strong><p>将从 NAS 共享持仓移除这项资产及其定投计划，手机和电脑都会同步。已记录的历史资产曲线保留。</p><div className="dialog-buttons"><button type="button" className="button" disabled={deleting} onClick={()=>setConfirmDelete(false)}>保留资产</button><button type="button" className="button danger" disabled={saving || deleting} onClick={()=>void remove()}>{deleting ? "删除中…" : "确认删除"}</button></div></div>}
    <div className="dialog-buttons asset-editor-actions">{asset && !demo && !confirmDelete && <button type="button" className="button delete-asset-button" disabled={saving || deleting} onClick={()=>{setError("");setConfirmDelete(true);}}><Trash2 size={16}/>删除资产</button>}<button type="button" className="button" disabled={saving || deleting} onClick={onClose}>取消</button><button type="submit" className="button primary" disabled={saving || deleting || confirmDelete}>{saving ? "保存到 NAS…" : "保存资产"}</button></div>
  </form></DialogContent></Dialog>;
}

