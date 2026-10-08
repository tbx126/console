
import { useEffect, useRef, useState, type RefObject } from "react";
import { Combobox as Primitive } from "@base-ui/react";
import { Combobox, ComboboxInput, ComboboxList, ComboboxItem } from "@/components/shadcn/combobox";
import { LoaderCircle } from "lucide-react";
import { localInstruments, mergeInstruments, type Instrument } from "./lib/instruments";
import AssetIcon from "./asset-icon";
import type { Category } from "./lib/portfolio";
import { z } from "zod";
const responseSchema = z.object({ items: z.array(z.object({ symbol: z.string().max(24), name: z.string().max(180), currency: z.enum(["USD","SGD","CNY","HKD"]), market: z.string().max(80), category: z.enum(["cash","stock","fund","gold","crypto"]) })).max(20), partial: z.boolean() });
export default function InstrumentPicker({ category, container, onSelect }: { category: Category; container: RefObject<HTMLDivElement | null>; onSelect: (item: Instrument) => void }) {
  const [query, setQuery] = useState(""); const [selected, setSelected] = useState<Instrument | null>(null); const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Instrument[]>(localInstruments(category,""));
  const [loading, setLoading] = useState(false); const [partial, setPartial] = useState(false); const [composing, setComposing] = useState(false);
  const requestId = useRef(0);
  useEffect(() => {
    const id = ++requestId.current; const controller = new AbortController(); const local = selected ? [selected] : localInstruments(category, query);
    setItems(local); setPartial(false); setLoading(false);
    if (!open || composing || selected || category === "cash" || category === "gold" || (!query.trim() && category !== "fund")) return;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/portfolio/search?category=${category}&q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        if (!r.ok) throw new Error("暂不可用"); const result = responseSchema.parse(await r.json());
        if (id !== requestId.current) return;
        setItems(mergeInstruments(local, result.items.filter(i=>i.category===category))); setPartial(result.partial);
      } catch { if (id === requestId.current && !controller.signal.aborted) setPartial(true); }
      finally { if (id === requestId.current) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); requestId.current++; };
  }, [category, query, open, composing, selected]);
  return <div className="form-field instrument-field"><label htmlFor="asset-search">搜索标的</label>
    <Combobox<Instrument> items={items} filter={null} value={selected} inputValue={query} open={open} onOpenChange={setOpen} itemToStringLabel={i=>`${i.symbol} · ${i.name}`} isItemEqualToValue={(a,b)=>a.symbol===b.symbol}
      onInputValueChange={(v,details)=>{setQuery(v); if(details.reason === "input-change" || details.reason === "input-clear" || details.reason === "clear-press") {setSelected(null);setOpen(true);}}}
      onValueChange={item=>{setSelected(item); if(item){onSelect(item);setQuery(`${item.symbol} · ${item.name}`);setOpen(false);}}}>
      <ComboboxInput id="asset-search" aria-label="搜索标的" placeholder={category==="fund"?"输入基金名称或代码，如 标普500":category==="stock"?"输入名称或代码，如 腾讯 / AAPL":"输入名称或代码"} autoComplete="off" maxLength={80} onFocus={()=>setOpen(true)} onCompositionStart={()=>setComposing(true)} onCompositionEnd={()=>setComposing(false)}/>
      {/* Portal stays inside the Radix dialog's focus and pointer boundary. */}
      <Primitive.Portal container={container}><Primitive.Positioner side="bottom" align="start" sideOffset={5} className="instrument-positioner"><Primitive.Popup className="instrument-popup">
        <div className="instrument-status" role="status">{loading ? <><LoaderCircle size={14} className="spin"/>正在搜索…</> : selected ? "已选择，可继续修改下方资料" : query.trim() ? `${items.length} 个匹配标的` : "可选标的 · 输入名称或代码搜索"}</div>
        <ComboboxList className="instrument-list">{(item: Instrument)=><ComboboxItem key={item.symbol} value={item} className="instrument-item"><AssetIcon asset={item}/><div><strong>{item.name}</strong><span>{item.symbol} · {item.market} · {item.currency}</span></div></ComboboxItem>}</ComboboxList>
        {!loading && !items.length && <div className="instrument-empty">{partial ? "搜索服务暂不可用，请稍后重试或手动填写。" : "没有匹配的标的，换个关键词或直接手动填写。"}</div>}
        {partial && items.length > 0 && <p className="instrument-warning">部分搜索源暂不可用，显示已有候选。</p>}
      </Primitive.Popup></Primitive.Positioner></Primitive.Portal>
    </Combobox><p className="field-hint">选中后自动填写名称、代码和币种，也可在下方手动修改。</p>
  </div>;
}
