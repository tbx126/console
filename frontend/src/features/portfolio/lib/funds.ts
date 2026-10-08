import { fundGroups, type Asset, type FundGroup } from "./portfolio";
export type Fund = Extract<Asset, { category: "fund" }>;
export function groupOf(fund: Fund): FundGroup {
  if (fund.group) return fund.group;
  if (/标普\s*500|s\s*&\s*p\s*500|sp\s*500/i.test(fund.name)) return "sp500";
  if (/纳斯达克\s*100|纳指\s*100|nasdaq\s*100/i.test(fund.name)) return "nasdaq100";
  return "other";
}
export function monthlyPlan(fund: Fund): number {
  if (!fund.dca?.enabled) return 0;
  return fund.dca.amount * ({ weekday: 21, weekly: 52 / 12, monthly: 1 }[fund.dca.frequency]);
}
export function summarizeFunds(assets: Asset[]) {
  const funds = assets.filter((a): a is Fund => a.category === "fund");
  const total = funds.reduce((sum, fund) => sum + fund.marketValue, 0);
  return { funds, total, monthly: funds.reduce((sum, fund) => sum + monthlyPlan(fund), 0), active: funds.filter(fund => fund.dca?.enabled).length,
    groups: (Object.keys(fundGroups) as FundGroup[]).map(key => {
      const items = funds.filter(fund => groupOf(fund) === key);
      return { key, name: fundGroups[key], funds: items, value: items.reduce((sum, fund) => sum + fund.marketValue, 0) };
    }) };
}
