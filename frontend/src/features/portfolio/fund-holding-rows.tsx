
import { Fragment, useState } from "react";
import AssetIcon from "./asset-icon";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { TableRow, TableCell } from "@/components/shadcn/table";
import { fundGroups, money, quantity, type Asset, type Currency, type FundGroup } from "./lib/portfolio";
import { groupOf } from "./lib/funds";
import type { ValuedAsset } from "./lib/analytics";

export default function FundHoldingRows({ rows, currency, search, demo, asOf, percent, onEdit }: {
  rows: ValuedAsset[]; currency: Currency; search: string; demo: boolean; asOf: string;
  percent: (value: number) => number; onEdit: (asset: Asset) => void;
}) {
  const [expanded, setExpanded] = useState<Partial<Record<FundGroup, boolean>>>({});
  function fundRow(r: ValuedAsset, group?: FundGroup, open = true) {
    const a = r.asset;
    return <TableRow key={a.id} id={group ? `fund-holdings-${group}-${a.id}` : undefined} hidden={!open} className={group ? "fund-child-row" : undefined}>
      <TableCell><div className="asset-name"><AssetIcon asset={a}/><div><strong>{a.name}</strong><small>{"symbol" in a && a.symbol ? a.symbol : "QDII · 手动人民币市值"}</small></div></div></TableCell>
      <TableCell className="numeric">{quantity(a)}</TableCell>
      <TableCell className="numeric">{money(r.native, "CNY")}<span className="quote-note">{demo ? "示例" : "手动"} · {new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(a.updatedAt ?? asOf))}</span></TableCell>
      <TableCell className="numeric value-cell">{money(r.value, currency)}{r.value === null && <span className="quote-note">缺少汇率</span>}</TableCell>
      <TableCell className="numeric">{r.value === null ? "—" : `${percent(r.value).toFixed(1)}%`}</TableCell>
      <TableCell><button className="edit-button" aria-label={`编辑${a.name}`} onClick={() => onEdit(a)}><Pencil size={15}/></button></TableCell>
    </TableRow>;
  }
  return (Object.keys(fundGroups) as FundGroup[]).map(group => {
    const items = rows.filter(r => r.asset.category === "fund" && groupOf(r.asset) === group);
    if (!items.length) return null;
    if (group === "other") return <Fragment key={group}>{items.map(r => fundRow(r))}</Fragment>;
    const value = items.every(r => r.value === null) ? null : items.reduce((sum, r) => sum + (r.value ?? 0), 0);
    const native = items.reduce((sum, r) => sum + (r.native ?? 0), 0);
    const missing = items.filter(r => r.value === null).length;
    const term = search.trim();
    const open = expanded[group] ?? (term.length > 0 && term !== fundGroups[group]);
    const childrenId = `fund-holdings-${group}`;
    return <Fragment key={group}>
      <TableRow className="fund-parent-row">
        <TableCell><button className="fund-row-toggle" aria-expanded={open} aria-controls={items.map(r => `${childrenId}-${r.asset.id}`).join(" ")} onClick={() => setExpanded(previous => ({ ...previous, [group]: !open }))}>
          <AssetIcon asset={{category:"fund",name:fundGroups[group]}} group={group}/><span><strong>{fundGroups[group]}</strong><small>{items.length} 只基金{term && term !== fundGroups[group] ? " · 搜索结果" : ""}</small></span>{open ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
        </button></TableCell>
        <TableCell className="numeric">—<span className="quote-note">份额不合并</span></TableCell>
        <TableCell className="numeric">{money(native, "CNY")}</TableCell>
        <TableCell className="numeric value-cell">{money(value, currency)}{missing > 0 && <span className="quote-note">{missing} 项缺少汇率</span>}</TableCell>
        <TableCell className="numeric">{value === null ? "—" : `${percent(value).toFixed(1)}%`}</TableCell><TableCell/>
      </TableRow>
      {items.map(r => fundRow(r, group, open))}
    </Fragment>;
  });
}
