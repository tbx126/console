import { z } from "zod";
export const currencies = ["SGD", "USD", "CNY", "HKD"] as const;
export type Currency = typeof currencies[number];
export const categories = ["cash", "stock", "fund", "gold", "crypto"] as const;
export type Category = typeof categories[number];
export const categoryMeta = {
  cash: { name: "现金", color: "#5189dc" }, stock: { name: "股票", color: "#555ce4" },
  fund: { name: "基金", color: "#a17be4" }, gold: { name: "黄金", color: "#d6a647" }, crypto: { name: "加密货币", color: "#49a995" },
};
const finite = z.number().finite().nonnegative().max(1e15);
const date = z.string().datetime({ offset: true });
const base = { id: z.string().min(1).max(80), name: z.string().min(1).max(80), updatedAt: date.optional() };
const securitySymbol = z.string().regex(/^[A-Z0-9][A-Z0-9.^=-]{0,23}$/);
export const fundGroups = { sp500: "标普 500", nasdaq100: "纳斯达克 100", other: "其他基金" } as const;
export type FundGroup = keyof typeof fundGroups;
export const dcaFrequencies = { weekday: "每个交易日", weekly: "每周", monthly: "每月" } as const;
export const dcaSchema = z.object({ enabled: z.boolean(), amount: finite, frequency: z.enum(["weekday", "weekly", "monthly"]) });
const assetSchema = z.discriminatedUnion("category", [
  z.object({ ...base, category: z.literal("cash"), currency: z.enum(currencies), amount: finite }),
  z.object({ ...base, category: z.literal("stock"), currency: z.enum(currencies), symbol: securitySymbol, quantity: finite }),
  z.object({ ...base, category: z.literal("fund"), currency: z.literal("CNY"), quantity: finite, marketValue: finite, symbol: z.string().max(24).optional(), group: z.enum(["sp500", "nasdaq100", "other"]).optional(), dca: dcaSchema.optional() }),
  z.object({ ...base, category: z.literal("gold"), quantity: finite }),
  z.object({ ...base, category: z.literal("crypto"), currency: z.literal("USD"), symbol: securitySymbol.regex(/^[A-Z0-9]+-USD$/), quantity: finite }),
]);
export const snapshotSchema = z.object({ at: date, totals: z.object({ SGD: finite, USD: finite, CNY: finite, HKD: finite }), cached: z.boolean() });
export const historySchema = z.array(snapshotSchema).max(2000);
export type Snapshot = z.infer<typeof snapshotSchema>;
export const portfolioSchema = z.object({ version: z.literal(1), asOf: date, assets: z.array(assetSchema).max(200), history: historySchema.optional() }).superRefine((v, ctx) => {
  if (new Set(v.assets.map(a => a.id)).size !== v.assets.length) ctx.addIssue({ code: "custom", message: "资产 id 不能重复", path: ["assets"] });
});
export type Portfolio = z.infer<typeof portfolioSchema>;
export type Asset = Portfolio["assets"][number];
export interface Quote { price: number; currency: Currency; asOf: string; fetchedAt: number; source: string; stale?: boolean }
export interface Fx { rates: Record<Currency, number>; asOf: string; fetchedAt: number; source: string; stale?: boolean }
export const quoteSchema = z.object({ price: z.number().positive().finite(), currency: z.enum(currencies), asOf: date, fetchedAt: finite, source: z.string().max(100), stale: z.boolean().optional() });
export const fxSchema = z.object({ rates: z.object({ USD: z.literal(1), SGD: z.number().positive().finite(), CNY: z.number().positive().finite(), HKD: z.number().positive().finite() }), asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), fetchedAt: finite, source: z.string(), stale: z.boolean().optional() });
export const sample: Portfolio = {
  version: 1, asOf: "2026-10-03T00:00:00+08:00", assets: [
    { id: "cash-sgd", name: "新加坡元现金", category: "cash", currency: "SGD", amount: 42500 },
    { id: "cash-cny", name: "人民币现金", category: "cash", currency: "CNY", amount: 86000 },
    { id: "cash-usd", name: "美元现金", category: "cash", currency: "USD", amount: 8500 },
    { id: "aapl", name: "苹果", category: "stock", symbol: "AAPL", currency: "USD", quantity: 80 },
    { id: "nvda", name: "英伟达", category: "stock", symbol: "NVDA", currency: "USD", quantity: 100 },
    { id: "tencent", name: "腾讯控股", category: "stock", symbol: "0700.HK", currency: "HKD", quantity: 200 },
    { id: "csi", name: "贵州茅台", category: "stock", symbol: "600519.SS", currency: "CNY", quantity: 100 },
    { id: "dbs", name: "星展集团", category: "stock", symbol: "D05.SI", currency: "SGD", quantity: 300 },
    { id: "sp500", name: "标普 500 指数 QDII", category: "fund", currency: "CNY", quantity: 18250, marketValue: 68400 },
    { id: "nasdaq", name: "纳斯达克 100 指数 QDII", category: "fund", currency: "CNY", quantity: 12000, marketValue: 52700 },
    { id: "icbc", name: "工商银行积存金", category: "gold", quantity: 100 },
    { id: "btc", name: "比特币", category: "crypto", symbol: "BTC-USD", currency: "USD", quantity: 0.12 },
    { id: "eth", name: "以太坊", category: "crypto", symbol: "ETH-USD", currency: "USD", quantity: 2.5 },
  ],
};
// Demo prices never enter the real cache or exported holdings.
export const sampleFx: Fx = { rates: { USD: 1, SGD: 1.28, CNY: 6.7, HKD: 7.85 }, asOf: "2026-10-03", fetchedAt: 0, source: "示例汇率" };
export const sampleQuotes: Record<string, Quote> = Object.fromEntries([
  ["AAPL", 330, "USD"], ["NVDA", 190, "USD"], ["0700.HK", 620, "HKD"], ["600519.SS", 1450, "CNY"], ["D05.SI", 76, "SGD"], ["XAU", 4100 / 31.1034768, "USD"], ["BTC-USD", 110000, "USD"], ["ETH-USD", 3900, "USD"],
].map(([symbol, price, currency]) => [symbol, { price, currency, asOf: "2026-10-03T00:00:00Z", fetchedAt: 0, source: "示例报价" }])) as Record<string, Quote>;
export function keyOf(a: Asset): string | null { return a.category === "gold" ? "XAU" : a.category === "stock" || a.category === "crypto" ? a.symbol : null; }
export function convert(amount: number, from: Currency, to: Currency, fx: Fx | null): number | null { if (from === to) return amount; return fx ? amount / fx.rates[from] * fx.rates[to] : null; }
export function valueAsset(a: Asset, currency: Currency, quotes: Record<string, Quote>, fx: Fx | null) {
  const key = keyOf(a); const quote = key ? quotes[key] : undefined;
  const native = a.category === "cash" ? a.amount : a.category === "fund" ? a.marketValue : quote && (a.category === "gold" || quote.currency === a.currency) ? a.quantity * quote.price : null;
  const nativeCurrency: Currency = a.category === "gold" ? "USD" : a.currency;
  return { asset: a, quote, native, nativeCurrency, value: native === null ? null : convert(native, nativeCurrency, currency, fx) };
}
export function money(value: number | null, currency: Currency, digits = 2) { return value === null ? "—" : new Intl.NumberFormat("en-SG", { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value); }
export function quantity(a: Asset) { return a.category === "cash" ? "—" : `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(a.quantity)} ${a.category === "gold" ? "克" : a.category === "stock" ? "股" : a.category === "fund" ? "份" : a.symbol.split("-")[0]}`; }
