import { categories, currencies, fxSchema, keyOf, quoteSchema, valueAsset, type Category, type Currency, type Quote } from "./portfolio";
import { sharedSchema } from "./shared-portfolio";

export interface PortfolioSummary {
  currency: Currency;
  total: number;
  assetCount: number;
  missing: number;
  byCategory: { category: Category; value: number; count: number; missing: number }[];
  empty: boolean;
  /** 近 90 天记录点（显示币种） */
  trend: { t: number; v: number }[];
  /** 与约 30 天前记录点相比的变化；记录不足时为 null */
  change30: number | null;
  /** 最近更新过的资产（按 updatedAt） */
  recent: { name: string; updatedAt: string }[];
}

function preferredCurrency(): Currency {
  try {
    const settings = JSON.parse(localStorage.getItem("folio.settings.v1") ?? "null");
    if (currencies.includes(settings?.currency)) return settings.currency;
  } catch { /* 使用默认币种 */ }
  return "SGD";
}

async function getJson(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.json();
}

// 总览页使用的轻量估值：只读取 NAS 持仓与行情，不写入任何数据。
export async function loadPortfolioSummary(signal?: AbortSignal): Promise<PortfolioSummary> {
  const currency = preferredCurrency();
  const shared = sharedSchema.parse(await getJson("/api/portfolio", signal));
  const assets = shared.portfolio?.assets ?? [];
  const history = shared.portfolio?.history ?? [];
  const since = Date.now() - 90 * 86400000;
  const trend = history.map(p => ({ t: Date.parse(p.at), v: p.totals[currency] })).filter(p => p.t >= since);
  const recent = assets.filter(a => a.updatedAt).map(a => ({ name: a.name, updatedAt: a.updatedAt as string })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  if (!assets.length) return { currency, total: 0, assetCount: 0, missing: 0, byCategory: [], empty: true, trend: [], change30: null, recent: [] };
  const symbols = [...new Set(assets.map(keyOf).filter((s): s is string => !!s))];
  const [fxResult, ...quoteResults] = await Promise.allSettled([
    getJson("/api/portfolio/fx", signal).then(d => fxSchema.parse(d)),
    ...symbols.map(s => getJson(`/api/portfolio/quote?symbol=${encodeURIComponent(s)}`, signal).then(d => [s, quoteSchema.parse(d)] as const)),
  ]);
  const fx = fxResult.status === "fulfilled" ? fxResult.value : null;
  const quotes: Record<string, Quote> = {};
  for (const r of quoteResults) if (r.status === "fulfilled") { const [symbol, quote] = r.value as readonly [string, Quote]; quotes[symbol] = quote; }
  const rows = assets.map(a => valueAsset(a, currency, quotes, fx));
  const byCategory = categories
    .map(category => {
      const items = rows.filter(r => r.asset.category === category);
      return { category, value: items.reduce((sum, r) => sum + (r.value ?? 0), 0), count: items.length, missing: items.filter(r => r.value === null).length };
    })
    .filter(c => c.count > 0);
  const total = rows.reduce((sum, r) => sum + (r.value ?? 0), 0);
  const monthAgo = Date.now() - 30 * 86400000;
  const base = [...history].reverse().find(p => Date.parse(p.at) <= monthAgo);
  const missing = rows.filter(r => r.value === null).length;
  return {
    currency,
    trend,
    recent,
    change30: base && !missing ? total - base.totals[currency] : null,
    total,
    assetCount: assets.length,
    missing,
    byCategory,
    empty: false,
  };
}
