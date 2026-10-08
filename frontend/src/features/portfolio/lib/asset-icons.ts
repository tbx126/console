import type { Asset, Category, Currency, FundGroup } from "./portfolio";
export type IconAsset = { category: Category; name: string; symbol?: string; currency?: Currency };
const stocks: Record<string, string> = {
  AAPL:"apple", NVDA:"nvidia", "0700.HK":"tencent", "600519.SS":"moutai", "D05.SI":"dbs", "S61.SI":"sbs", "O39.SI":"ocbc", "1810.HK":"xiaomi", GOOG:"alphabet", GOOGL:"alphabet", AMZN:"amazon", AVGO:"broadcom", "BRK-B":"berkshire", "BRK-A":"berkshire", SNDK:"sandisk", TSM:"tsmc", "002714.SZ":"muyuan", "600036.SS":"cmb",
};
const providers: [RegExp,string][] = [[/摩根|JPMorgan/i,"jpmorgan"],[/广发/,"guangfa"],[/招商/,"zhaoshang"],[/华安/,"huaan"],[/南方/,"nanfang"],[/建信/,"jianxin"],[/汇添富/,"huitianfu"],[/宝盈/,"baoying"],[/万家/,"wanjia"],[/华泰柏瑞/,"huatai"],[/大成/,"dacheng"],[/兴全|兴证全球/,"xingquan"]];
export function assetIconKey(asset: IconAsset | Asset, group?: FundGroup): string | null {
  if (group && group !== "other") return group;
  if (asset.category === "stock") return stocks[asset.symbol?.toUpperCase() ?? ""] ?? null;
  if (asset.category === "crypto") { const key = asset.symbol?.split("-")[0].toLowerCase(); return key && ["btc","eth","sol","doge","aave","bnb","usdt","ar"].includes(key) ? key : null; }
  if (asset.category === "gold") return /工行|工商银行|ICBC/i.test(asset.name) ? "icbc" : null;
  if (asset.category === "fund") return providers.find(([pattern]) => pattern.test(asset.name))?.[1] ?? null;
  return null;
}
