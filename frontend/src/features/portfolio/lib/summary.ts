import { categories, currencies, fxSchema, keyOf, quoteSchema, valueAsset, type Category, type Currency, type Quote } from "./portfolio";
import { sharedSchema } from "./shared-portfolio";

export interface PortfolioSummary {
  currency: Currency;
  total: number;
  assetCount: number;
  missing: number;
  byCategory: { category: Category; value: number; count: number }[];
  empty: boolean;
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
  if (!assets.length) return { currency, total: 0, assetCount: 0, missing: 0, byCategory: [], empty: true };
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
      return { category, value: items.reduce((sum, r) => sum + (r.value ?? 0), 0), count: items.length };
    })
    .filter(c => c.count > 0);
  return {
    currency,
    total: rows.reduce((sum, r) => sum + (r.value ?? 0), 0),
    assetCount: assets.length,
    missing: rows.filter(r => r.value === null).length,
    byCategory,
    empty: false,
  };
}
