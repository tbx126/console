import type { Category, Currency } from "./portfolio";
export interface Instrument { symbol: string; name: string; currency: Currency; market: string; category: Category }
export const commonInstruments: Instrument[] = [
  { category: "cash", symbol: "SGD", name: "新加坡元现金", currency: "SGD", market: "现金" },
  { category: "cash", symbol: "CNY", name: "人民币现金", currency: "CNY", market: "现金" },
  { category: "cash", symbol: "USD", name: "美元现金", currency: "USD", market: "现金" },
  { category: "cash", symbol: "HKD", name: "港币现金", currency: "HKD", market: "现金" },
  { category: "stock", symbol: "AAPL", name: "苹果 Apple", currency: "USD", market: "美股" },
  { category: "stock", symbol: "NVDA", name: "英伟达 NVIDIA", currency: "USD", market: "美股" },
  { category: "stock", symbol: "0700.HK", name: "腾讯控股", currency: "HKD", market: "港股" },
  { category: "stock", symbol: "600519.SS", name: "贵州茅台", currency: "CNY", market: "A 股 · 沪市" },
  { category: "stock", symbol: "D05.SI", name: "星展集团 DBS", currency: "SGD", market: "新加坡" },
  { category: "stock", symbol: "SPY", name: "SPDR S&P 500 ETF", currency: "USD", market: "美股 ETF" },
  { category: "stock", symbol: "QQQ", name: "Invesco QQQ Trust", currency: "USD", market: "美股 ETF" },
  { category: "fund", symbol: "006075", name: "博时标普500ETF联接(QDII)C", currency: "CNY", market: "场外基金 · 人民币" },
  { category: "gold", symbol: "XAU", name: "工商银行积存金", currency: "USD", market: "克 · 国际金价参考" },
  { category: "crypto", symbol: "BTC-USD", name: "比特币 Bitcoin", currency: "USD", market: "加密货币" },
  { category: "crypto", symbol: "ETH-USD", name: "以太坊 Ethereum", currency: "USD", market: "加密货币" },
];
export function localInstruments(category: Category, query: string) {
  const key = query.replace(/\s/g, "").toLowerCase();
  return commonInstruments.filter(i => i.category === category && (i.symbol + i.name).replace(/\s/g, "").toLowerCase().includes(key));
}
export function mergeInstruments(...lists: Instrument[][]): Instrument[] {
  const unique = new Map<string, Instrument>();
  for (const list of lists) for (const i of list) if (!unique.has(i.symbol)) unique.set(i.symbol, i);
  return [...unique.values()].slice(0, 20);
}
