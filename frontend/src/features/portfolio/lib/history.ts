import { categories, currencies, keyOf, valueAsset, snapshotSchema, type Portfolio, type Quote, type Fx, type Snapshot } from "./portfolio";

// Capture only complete valuations, using exchange rates available at capture time.
export function captureSnapshot(p: Portfolio, quotes: Record<string, Quote>, fx: Fx | null, now = Date.now()): Snapshot | null {
  if (p.assets.some(a => { const key = keyOf(a); return key && (!quotes[key] || quotes[key].fetchedAt <= 0); })) return null;
  if (p.assets.length && (!fx || fx.fetchedAt <= 0)) return null;
  const totals = {} as Snapshot["totals"];
  for (const currency of currencies) {
    const rows = p.assets.map(a => valueAsset(a, currency, quotes, fx));
    if (rows.some(r => r.value === null)) return null;
    totals[currency] = rows.reduce((sum, r) => sum + r.value!, 0);
  }
  const cached = !!fx?.stale || (!!fx && now - fx.fetchedAt > 86400000) || p.assets.some(a => {
    const key = keyOf(a), q = key ? quotes[key] : null;
    return !!q && (!!q.stale || now - q.fetchedAt > 300000);
  });
  // Per-category SGD values feed the composition-over-time chart.
  const categoryTotals = Object.fromEntries(categories.map(c => [c, p.assets.filter(a => a.category === c).reduce((sum, a) => sum + (valueAsset(a, "SGD", quotes, fx).value ?? 0), 0)]));
  const result = snapshotSchema.safeParse({ at: new Date(now).toISOString(), totals, cached, categories: categoryTotals });
  return result.success ? result.data : null;
}

// Keep the latest actual observation per minute, with bounded browser storage.
export function mergeHistory(existing: Snapshot[], incoming: Snapshot[], now = Date.now()): Snapshot[] {
  const minutes = new Map<number, Snapshot>();
  for (const point of [...existing, ...incoming].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    const time = Date.parse(point.at);
    if (Number.isFinite(time) && time <= now + 60000) minutes.set(Math.floor(time / 60000), point);
  }
  return [...minutes.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(-2000);
}
