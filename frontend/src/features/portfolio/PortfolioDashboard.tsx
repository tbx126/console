
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Search, Landmark, ChartNoAxesCombined, Layers, Gem, Bitcoin, CircleHelp, Upload, ShieldCheck, Plus, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/shadcn/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/shadcn/dialog";
import { categories, categoryMeta, currencies, sample, valueAsset, money, quantity, portfolioSchema, keyOf, type Currency, type Category, type Portfolio, type Asset } from "./lib/portfolio";
import { usePortfolio } from "./lib/use-portfolio";
import "./portfolio.css";
import AssetEditor from "./asset-editor";
import AssetIcon from "./asset-icon";
import PortfolioInsights from "./insights";
import { Link, useSearchParams } from "react-router-dom";
import FundOverview from "./fund-overview";
import FundHoldingRows from "./fund-holding-rows";
import { groupOf } from "./lib/funds";
import { fundGroups } from "./lib/portfolio";
const icons = { cash: Landmark, stock: ChartNoAxesCombined, fund: Layers, gold: Gem, crypto: Bitcoin };
const dateText = (d: string | number, time = false) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit", ...(time ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}) }).format(new Date(d));
function download(data: Portfolio, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.style.display = "none"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export default function PortfolioDashboard({ view = "holdings" }: { view?: "holdings" | "insights" }) {
  const p = usePortfolio(); const { portfolio, demo, currency, setCurrency, quotes, fx, refreshing, ready } = p;
  const [filter, setFilter] = useState<Category | "all">("all"); const [params] = useSearchParams(); const [search, setSearch] = useState(() => params.get("q") ?? "");
  useEffect(() => { const q = params.get("q"); if (q !== null) { setSearch(q); setFilter("all"); } }, [params]);
  const [editor, setEditor] = useState<{ asset: Asset | null; key: number; revision: number } | null>(null);
  const [fundEditing, setFundEditing] = useState(false); const [exportOpen, setExportOpen] = useState(false); const [importRevision, setImportRevision] = useState(0);
  const [importOpen, setImportOpen] = useState(false); const [helpOpen, setHelpOpen] = useState(false);
  const [candidate, setCandidate] = useState<Portfolio | null>(null); const [filename, setFilename] = useState(""); const [importError, setImportError] = useState(""); const [reading, setReading] = useState(false);
  const exportData: Portfolio = demo ? portfolio : { ...portfolio, history: p.history };
  const rows = portfolio.assets.map(a => valueAsset(a, currency, quotes, fx));
  const missing = rows.filter(r => r.value === null).length;
  const total = rows.reduce((v, r) => v + (r.value ?? 0), 0);
  const percent = (value: number) => total > 0 ? value / total * 100 : 0;
  const activeCategories = new Set(portfolio.assets.map(a => a.category)).size;
  const groups = categories.map(c => { const items = rows.filter(r => r.asset.category === c); return { category: c, ...categoryMeta[c], value: items.reduce((v,r) => v+(r.value??0),0), count: items.length, missing: items.filter(r => r.value === null).length }; });
  const shown = rows.filter(r => (filter === "all" || r.asset.category === filter) && (r.asset.name + ("symbol" in r.asset ? r.asset.symbol : "") + (r.asset.category === "fund" ? fundGroups[groupOf(r.asset)] : "")).toLowerCase().includes(search.trim().toLowerCase()));
  const knownStale = rows.some(r => r.quote && (r.quote.stale || (r.quote.fetchedAt > 0 && Date.now() - r.quote.fetchedAt > 300000)));
  const demoFallback = demo && (rows.some(r => keyOf(r.asset) && r.quote?.fetchedAt === 0) || fx?.fetchedAt === 0);
  async function chooseFile(file?: File) {
    if (!file) return; setCandidate(null); setFilename(file.name); setImportError(""); setReading(true);
    try {
      if (file.size > 1024 * 1024) throw new Error("文件不能超过 1 MB。");
      let data: unknown; try { data = JSON.parse((await file.text()).replace(/^\uFEFF/, "")); } catch { throw new Error("无法解析 JSON，请检查括号、逗号和引号。"); }
      const result = portfolioSchema.safeParse(data);
      if (!result.success) { const issue = result.error.issues[0]; throw new Error(`字段 ${issue.path.join(".") || "文件"} 无效。请使用模板格式；数量和金额须为非负数字，QDII 币种须为 CNY，资产 id 不可重复。`); }
      setCandidate(result.data);
    } catch(e) { setImportError(e instanceof Error ? e.message : "无法读取文件"); } finally { setReading(false); }
  }
  async function saveAsset(asset: Asset) {
    const existing = demo ? [] : portfolio.assets.map(a=>({ ...a, updatedAt: a.updatedAt ?? portfolio.asOf }));
    const assets = existing.some(a=>a.id===asset.id) ? existing.map(a=>a.id===asset.id?asset:a) : [...existing,asset];
    if(assets.length>200){toast.error("最多可保存 200 项资产");return;}
    const saved = await p.savePortfolio({ version:1, asOf:new Date().toISOString(), assets },"资产已保存到 NAS",editor?.revision);
    if(!saved){setEditor(previous=>previous?{...previous,revision:p.currentRevision()}:null);return;}
    setEditor(null);setFilter("all");setSearch("");
  }
  function startImport() { setImportRevision(p.revision); setCandidate(null); setFilename(""); setImportError(""); setImportOpen(true); }
  async function deleteAsset(asset: Asset) {
    if (demo || !editor || !portfolio.assets.some(a => a.id === asset.id)) return false;
    const saved = await p.savePortfolio({ ...portfolio, asOf: new Date().toISOString(), assets: portfolio.assets.filter(a => a.id !== asset.id) }, "资产已从 NAS 删除", editor.revision);
    if (saved) { setEditor(null); setSearch(""); }
    return saved;
  }
  useEffect(() => {
    const context = (document as unknown as { modelContext?: { registerTool: (tool: unknown, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const abort = new AbortController();
    Promise.resolve(context.registerTool({ name: "get_asset_overview", title: "读取当前资产总览", description: "读取当前页面的资产市值、币种、示例状态与缺价数量，不修改持仓。", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: (input: unknown) => { if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) throw new Error("不接受参数"); return { currency, isDemo: demo, valuedTotal: total, missingCount: missing, assetCount: portfolio.assets.length }; } }, { signal: abort.signal })).catch(() => {});
    return () => abort.abort();
  }, [currency, demo, total, missing, portfolio.assets.length]);
  useEffect(()=>{p.setEditing(!!editor || importOpen || fundEditing);},[editor,importOpen,fundEditing]);
  const syncText = p.syncState === "loading" ? "正在连接 NAS…" : p.syncState === "saving" ? "正在保存…" : p.syncState === "offline" ? "NAS 离线 · 显示本机缓存" : demo ? "示例数据" : "已同步";
  const syncTone = p.syncState === "offline" ? "#c84444" : p.syncState === "connected" && !demo ? "#1f9d63" : "var(--muted-foreground)";
  return <div className="folio">
    <main className="workspace">
    <header className="folio-header">
      <div className="folio-header-main">
        <h1>资产</h1>
        <nav className="folio-views" aria-label="资产视图"><Link to="/portfolio" aria-current={view === "holdings" ? "page" : undefined}>明细</Link><Link to="/portfolio/insights" aria-current={view === "insights" ? "page" : undefined}>分析</Link></nav>
        <button className="sync-pill" disabled={p.syncState === "saving" || !ready} onClick={()=>void p.sync()} title="同步最新持仓"><i style={{background:syncTone}}/>{syncText}{p.attempt && !refreshing ? ` · 行情 ${dateText(p.attempt, true).slice(-5)}` : refreshing ? " · 行情更新中" : ""}</button>
      </div>
      <div className="actions">
        <button className="button" disabled={refreshing || !ready} onClick={()=>void p.refresh()}><RefreshCw size={14} className={refreshing ? "spin" : ""}/>{refreshing ? "更新中" : "刷新行情"}</button>
        <button className="button" disabled={!ready} onClick={startImport}><ArrowUpFromLine size={14}/>导入</button>
        <button className="button" disabled={!ready} onClick={() => setExportOpen(true)}><ArrowDownToLine size={14}/>导出</button>
        <button className="icon-only" aria-label="数据与估值说明" title="数据与估值说明" onClick={()=>setHelpOpen(true)}><CircleHelp size={15}/></button>
        <button className="button primary" disabled={!ready} onClick={()=>setEditor({asset:null,key:Date.now(),revision:p.revision})}><Plus size={14}/>添加资产</button>
      </div>
    </header>
    {demo && <div className="demo-banner"><span><span className="demo-pill">示例数据</span>当前为虚拟持仓。添加资产或导入 JSON，开始记录你的持有。</span></div>}
    {!demo && missing > 0 && <div className="notice" role="status">{missing} 项资产暂无可用报价或汇率，未计入合计。下方显示已估值部分，非完整总资产。</div>}
    {!demo && !refreshing && (p.errors.length > 0 || knownStale || fx?.stale) && <div className="notice" role="status">部分行情未能更新或已超过缓存有效期，仍按最近可用价格估值。请留意每项报价时间。{p.errors.length > 0 ? ` 未更新：${p.errors.join("、")}。` : ""}</div>}
    {view === "holdings" ? <>
    <section className="summary-card">
      <div className="summary-total">
        <label className="summary-label">{missing ? "已估值资产合计" : "总资产"}<Select value={currency} onValueChange={v => setCurrency(v as Currency)}><SelectTrigger aria-label="显示币种" className="currency-select"><SelectValue/></SelectTrigger><SelectContent>{currencies.map(c => <SelectItem value={c} key={c}>{c}</SelectItem>)}</SelectContent></Select></label>
        <div className="total-value" aria-live="polite">{money(rows.length > 0 && missing === rows.length ? null : total,currency)}</div>
        <span className="summary-caption">{demo ? "示例持仓估值" : missing ? `${rows.length-missing} / ${rows.length} 项已估值` : `持仓日期 ${dateText(portfolio.asOf)}`}{demoFallback ? " · 含示例报价" : ""}</span>
      </div>
      <div className="summary-stats">
        <div><span>持有</span><strong>{portfolio.assets.length} 项</strong></div>
        <div><span>类别</span><strong>{activeCategories} 类</strong></div>
        <div><span>汇率</span><strong>{fx ? fx.asOf.slice(5) : "—"}</strong></div>
      </div>
      <div className="summary-bar" role="img" aria-label={groups.filter(g=>g.value>0).map(g=>`${g.name} ${percent(g.value).toFixed(1)}%`).join("，")}>{groups.filter(g=>g.value>0).map(g=><i key={g.category} style={{flex:g.value,background:g.color}}/>)}</div>
    </section>
    <FundOverview portfolio={portfolio} demo={demo} ready={ready} revision={p.revision} onEditing={setFundEditing} onSave={(data,revision)=>p.savePortfolio(data,"基金已批量保存到 NAS",revision)}/>
    <section className="holdings" id="holdings"><div className="holdings-heading"><div className="filters" aria-label="资产类别">{["all",...categories].map(c=>{const g=groups.find(x=>x.category===c);if(c!=="all"&&!g?.count)return null;return <button key={c} aria-pressed={filter===c} onClick={()=>setFilter(c as Category|"all")} className={filter===c?"active":""}>{c==="all"?<>全部 <small>{portfolio.assets.length}</small></>:<><i style={{background:g!.color}}/>{g!.name} <small>{percent(g!.value).toFixed(0)}%</small></>}</button>;})}</div><label className="search"><Search size={17}/><input placeholder="搜索名称或代码" value={search} onChange={e=>setSearch(e.target.value)} aria-label="搜索资产"/></label></div>
    {shown.length ? <div className="holding-groups">{categories.map(category=>{const items=shown.filter(r=>r.asset.category===category); if(!items.length)return null;return <div className="holding-group" key={category}><Table className="asset-table"><TableHeader><TableRow><TableHead><span className="group-title"><i style={{background:categoryMeta[category].color}}/>{categoryMeta[category].name}<small>{items.length} 项</small></span></TableHead><TableHead className="numeric">原币市值</TableHead><TableHead className="numeric">折合 {currency}</TableHead><TableHead className="numeric">{missing ? "已估值占比" : "占比"}</TableHead><TableHead><span className="sr-only">编辑</span></TableHead></TableRow></TableHeader><TableBody>{category === "fund" ? <FundHoldingRows rows={items} currency={currency} search={search} demo={demo} asOf={portfolio.asOf} percent={percent} onEdit={asset=>setEditor({asset,key:Date.now(),revision:p.revision})}/> : items.map(r=>{const a=r.asset;const manual=a.category==="cash"||a.category==="fund";return <TableRow key={a.id}><TableCell><div className="asset-name"><AssetIcon asset={a}/><div><strong>{a.name}</strong><small>{"symbol" in a && a.symbol ? `${a.symbol} · ${quantity(a)}` : a.category==="gold"?`${quantity(a)} · ICBC 参考估值`:a.category==="fund"?"QDII · 手动人民币市值":"现金余额"}</small></div></div></TableCell><TableCell className="numeric">{money(r.native,r.nativeCurrency)}<span className="quote-note" title={r.quote?.source}>{manual ? `${demo ? "示例" : "手动"} · ${dateText(a.updatedAt ?? portfolio.asOf)}` : r.quote ? `${r.quote.fetchedAt===0 ? "示例" : r.quote.stale ? "缓存" : a.category==="gold" ? "参考" : "报价"} · ${dateText(r.quote.asOf,true)}` : "暂无报价"}</span></TableCell><TableCell className="numeric value-cell">{money(r.value,currency)}{r.native!==null && r.value===null && <span className="quote-note">缺少汇率</span>}{r.quote && a.category!=="gold" && "currency" in a && r.quote.currency!==a.currency && <span className="quote-note">报价币种与导入不一致</span>}</TableCell><TableCell className="numeric">{r.value === null ? "—" : `${percent(r.value).toFixed(1)}%`}</TableCell><TableCell><button className="edit-button" aria-label={`编辑${a.name}`} onClick={()=>setEditor({asset:a,key:Date.now(),revision:p.revision})}><Pencil size={15}/></button></TableCell></TableRow>;})}</TableBody></Table></div>;})}</div> : <div className="empty-state">{portfolio.assets.length ? "没有匹配的资产，试试其他名称或类别。" : "还没有资产，点击“添加资产”记录第一份持仓。"}</div>}
    <div className="table-footer">显示 {shown.length} / {portfolio.assets.length} 项资产<span>{fx ? `${fx.fetchedAt===0?"示例汇率":"汇率日期"} ${fx.asOf}${fx.stale?" · 使用缓存":""}` : "暂无可用汇率"} · 时间为新加坡时间</span></div></section>
    </> : <PortfolioInsights rows={rows} history={p.history} currency={currency} missing={missing} demo={demo} refreshing={refreshing}/>}</main>
    {editor && <AssetEditor key={editor.key} asset={editor.asset} snapshotDate={portfolio.asOf} demo={demo} open onClose={()=>setEditor(null)} onSave={saveAsset} onDelete={deleteAsset}/>}
    <Dialog open={exportOpen} onOpenChange={setExportOpen}><DialogContent className="dialog-content"><DialogHeader><DialogTitle>导出资产</DialogTitle><DialogDescription>保存当前 {portfolio.assets.length} 项资产，或复制 JSON 到本地文件。</DialogDescription></DialogHeader><textarea aria-label="导出 JSON" className="json-export" readOnly value={JSON.stringify(exportData,null,2)}/><div className="dialog-buttons"><button className="button" onClick={async()=>{try{await navigator.clipboard.writeText(JSON.stringify(exportData,null,2));toast.success("JSON 已复制");}catch{toast.warning("无法访问剪贴板，请在文本框中全选复制。");}}}>复制 JSON</button><button className="button primary" onClick={()=>{download(exportData,demo?"folio-example.json":"folio-assets.json");toast("已发起下载；若未保存，请使用复制 JSON。");}}><ArrowDownToLine size={16}/>下载 JSON</button></div><p className="dialog-text">导出包含持仓数量、手动市值及已记录的资产曲线，不包含缓存行情。请妥善保存文件。</p></DialogContent></Dialog>
    <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent className="dialog-content"><DialogHeader><DialogTitle>导入资产</DialogTitle><DialogDescription>导入 JSON 持仓快照，确认后替换 NAS 上的全部资产，所有设备都会同步。</DialogDescription></DialogHeader><div className="dialog-text">股票与加密货币填写代码和数量；积存金填写克数；现金填写余额；QDII 填写份额及人民币当前市值。</div><label className="file-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void chooseFile(e.dataTransfer.files[0]);}}><Upload size={21}/>{reading?"正在读取…":filename||"点击选择或拖入 JSON 文件"}<input type="file" accept=".json,application/json" className="sr-only" aria-label="选择资产 JSON 文件" disabled={reading} onChange={e=>{void chooseFile(e.target.files?.[0]);e.target.value="";}}/></label>{importError && <p className="error-text" role="alert">{importError}</p>}{candidate && <div className="import-preview">已通过格式检查 · <strong>{candidate.assets.length} 项资产</strong><br/>数据日期：{dateText(candidate.asOf)}<br/>{categories.map(c=>`${categoryMeta[c].name} ${candidate.assets.filter(a=>a.category===c).length} 项`).join(" · ")}<br/><span className="dialog-text">{candidate.assets.slice(0,4).map(a=>a.name).join("、")}{candidate.assets.length>4?"…":""}</span></div>}<div className="dialog-buttons"><button className="button" onClick={()=>download(sample,"folio-template.json")}>下载示例模板</button><button className="button primary" disabled={!candidate||reading||p.syncState==="saving"} onClick={async()=>{if(candidate){const saved=await p.importPortfolio(candidate,importRevision);if(saved){setFilter("all");setSearch("");setImportOpen(false);}else setImportRevision(p.currentRevision());}}}>确认替换并导入</button></div><p className="dialog-text">最多 200 项资产，文件不超过 1 MB。请先导出备份；导入文件与持仓数量保存到 NAS，不会发给行情提供商。</p></DialogContent></Dialog>
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent className="dialog-content"><DialogHeader><DialogTitle>数据与估值说明</DialogTitle><DialogDescription>了解当前市值如何计算，以及数据如何保存。</DialogDescription></DialogHeader><div className="help-details"><p><strong>股票、加密货币：</strong>数量 × 最新可用报价。使用 <a href="https://finance.yahoo.com/" target="_blank" rel="noreferrer">Yahoo Finance</a> 免费延迟行情接口，可能受限或中断；交易休市时使用最后报价。美股 <code>AAPL</code>、港股 <code>0700.HK</code>、沪市 <code>600519.SS</code>、深市 <code>000001.SZ</code>、新加坡 <code>D05.SI</code>、加密货币 <code>BTC-USD</code>。</p><p><strong>基金：</strong>直接使用导入的 <code>marketValue</code> 人民币市值；份额仅作展示，不使用指数价格推算。</p><p><strong>工行积存金：</strong>克数 × <a href="https://gold-api.com/docs" target="_blank" rel="noreferrer">Gold API</a> 国际金价（美元/金衡盎司 ÷ 31.1034768），再换算币种。属于参考估值，并非工行赎回报价。</p><p><strong>汇率：</strong><a href="https://frankfurter.dev/" target="_blank" rel="noreferrer">Frankfurter</a> 每日参考汇率，缓存 24 小时。行情缓存 5 分钟。打开页面会检查缓存，点击刷新会重新请求；有效的服务端缓存仍可能复用。获取失败时保留旧值，并注明状态；没有报价的资产不计入合计。</p><p><strong>直接填写：</strong>点击“添加资产”录入持仓，点击明细右侧的编辑按钮修改；保存后立即更新总额。金额日期独立保留。<br/><strong>JSON 与保存：</strong>顶层包含 <code>version: 1</code>、<code>asOf</code>（含时区的日期时间）和 <code>assets</code>。下载模板即可查看所有字段。持仓与曲线保存在 NAS，跨设备共享；浏览器保留副本供断线时查看。显示币种、主题和行情缓存仍按浏览器保存。此网站不设登录，能访问网站的人可读取或修改持仓，请留意链接的分享范围。曲线从首次完整估值开始记录，不补造过去的金额；历史记录随 JSON 导出，导入时合并。</p><p><strong>示例模式：</strong>所有数量和现金、基金金额均为虚拟数据。会尝试获取行情，未成功的项目使用明确标记的示例报价。导入真实数据后，绝不使用示例报价填补缺价。</p></div><button className="button" onClick={()=>download(sample,"folio-template.json")}><ArrowDownToLine size={16}/>下载 JSON 模板</button></DialogContent></Dialog>
  </div>;
}



