import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
await build({ entryPoints: ['src/features/portfolio/lib/history.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'node_modules/.cache/portfolio-tests/history-test.mjs' });
const { captureSnapshot, mergeHistory } = await import('../node_modules/.cache/portfolio-tests/history-test.mjs');
const now = Date.parse('2026-10-04T12:00:00Z');
const fx = { rates: { USD: 1, SGD: 1.3, CNY: 7, HKD: 7.8 }, fetchedAt: now, asOf: '2026-10-04', source: 'test' };
const p = { version: 1, asOf: new Date(now).toISOString(), assets: [{ id: 'cash', name: 'cash', category: 'cash', currency: 'USD', amount: 100 }] };
test('capture freezes totals in all currencies at the observation exchange rate', () => {
  const point = captureSnapshot(p, {}, fx, now);
  assert.deepEqual(point.totals, { SGD: 130, USD: 100, CNY: 700, HKD: 780 });
  fx.rates.CNY = 8;
  assert.equal(point.totals.CNY, 700);
  fx.rates.CNY = 7;
  assert.equal(point.cached, false);
  assert.equal(captureSnapshot(p, {}, { ...fx, stale: true }, now).cached, true);
});
test('incomplete and demo-priced valuations cannot become history records', () => {
  const stock = { ...p, assets: [{ id: 'a', name: 'a', category: 'stock', currency: 'USD', symbol: 'AAPL', quantity: 2 }] };
  assert.equal(captureSnapshot(p, {}, null, now), null);
  assert.equal(captureSnapshot(stock, {}, fx, now), null);
  const q = { price: 100, currency: 'USD', fetchedAt: 0, asOf: p.asOf, source: 'demo' };
  assert.equal(captureSnapshot(stock, { AAPL: q }, fx, now), null);
  assert.equal(captureSnapshot(stock, { AAPL: { ...q, fetchedAt: now, currency: 'HKD' } }, fx, now), null);
  assert.equal(captureSnapshot(stock, { AAPL: { ...q, fetchedAt: now } }, fx, now).totals.USD, 200);
});
test('merge retains last real observation per minute, orders dates and bounds storage', () => {
  const point = captureSnapshot(p, {}, fx, now);
  const older = { ...point, at: new Date(now - 60000).toISOString() };
  const latest = { ...point, at: new Date(now + 1000).toISOString(), totals: { ...point.totals, USD: 120 } };
  const future = { ...point, at: new Date(now + 120000).toISOString() };
  const merged = mergeHistory([point, older], [latest, future], now);
  assert.deepEqual(merged, [older, latest]);
  const many = Array.from({ length: 2100 }, (_, i) => ({ ...point, at: new Date(now - i * 60000).toISOString() }));
  assert.equal(mergeHistory([], many, now).length, 2000);
  assert.equal(mergeHistory([], many, now).at(-1).at, point.at);
});
