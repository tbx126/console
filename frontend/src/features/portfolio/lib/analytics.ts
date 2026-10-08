import { currencies, fundGroups, type Currency, type valueAsset } from "./portfolio";
import { groupOf } from "./funds";

export type ValuedAsset = ReturnType<typeof valueAsset>;
export function assetAnalytics(rows: ValuedAsset[]) {
  const valued = rows.filter((r): r is ValuedAsset & { value: number } => r.value !== null);
  const total = valued.reduce((sum, r) => sum + r.value, 0);
  const grouped: (ValuedAsset & { value: number })[] = [];
  for (const row of valued) {
    if (row.asset.category !== "fund") { grouped.push(row); continue; }
    const group = groupOf(row.asset);
    if (group === "other") { grouped.push(row); continue; }
    const existing = grouped.find(r => r.asset.category === "fund" && r.asset.id === `fund-group:${group}`);
    if (existing) existing.value += row.value;
    else grouped.push({ ...row, asset: { ...row.asset, id: `fund-group:${group}`, name: fundGroups[group], group } });
  }
  const ranked = grouped.filter(r => r.value > 0).sort((a, b) => b.value - a.value);
  const exposure = currencies.map(currency => ({ currency, value: valued.filter(r => r.nativeCurrency === currency).reduce((sum, r) => sum + r.value, 0) }));
  const topShare = total ? ranked.slice(0, 3).reduce((sum, r) => sum + r.value, 0) / total * 100 : 0;
  return { total, ranked, exposure, topShare, valuedCount: valued.length, missingCount: rows.length - valued.length };
}
