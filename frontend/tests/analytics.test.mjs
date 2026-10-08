import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
await build({ entryPoints: ['src/features/portfolio/lib/analytics.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'node_modules/.cache/portfolio-tests/analytics-test.mjs' });
const { assetAnalytics } = await import('../node_modules/.cache/portfolio-tests/analytics-test.mjs');
const row = (id, value, nativeCurrency = 'CNY') => ({ asset: { id, name: id, category: 'cash', amount: value ?? 0, currency: nativeCurrency }, native: value, nativeCurrency, value });
test('allocation uses converted values and excludes missing valuations from totals and rank', () => {
  const result = assetAnalytics([row('cash', 100), row('gold', 300, 'USD'), row('unknown', null, 'USD'), row('empty', 0)]);
  assert.equal(result.total, 400);
  assert.equal(result.missingCount, 1);
  assert.equal(result.valuedCount, 3);
  assert.deepEqual(result.ranked.map(r => r.asset.id), ['gold', 'cash']);
  assert.deepEqual(result.exposure.filter(e => e.value).map(e => [e.currency, e.value]), [['USD', 300], ['CNY', 100]]);
  assert.equal(result.topShare, 100);
});
test('concentration is limited to three holdings and empty portfolios produce finite metrics', () => {
  assert.equal(assetAnalytics([row('a', 40), row('b', 30), row('c', 20), row('d', 10)]).topShare, 90);
  const empty = assetAnalytics([row('missing', null), row('zero', 0)]);
  assert.equal(empty.topShare, 0); assert.equal(empty.total, 0); assert.deepEqual(empty.ranked, []);
});
test('fund charts aggregate converted market values by direction without exposing fund names', () => {
  const fund = (id, name, value, group) => ({ ...row(id, value), asset: { id, name, category: 'fund', currency: 'CNY', quantity: 10, marketValue: 100, ...(group ? { group } : {}) } });
  const result = assetAnalytics([fund('a', '甲标普500基金', 40), fund('b', '乙标普500基金', 60), fund('c', '纳斯达克100基金', 30), fund('d', '标普500但改分组', 20, 'other'), fund('missing', '未知基金', null), row('cash', 50)]);
  assert.equal(result.total, 200);
  assert.equal(result.missingCount, 1);
  assert.equal(result.valuedCount, 5);
  assert.deepEqual(result.ranked.map(r => [r.asset.name, r.value]), [['标普 500', 100], ['cash', 50], ['纳斯达克 100', 30], ['标普500但改分组', 20]]);
  assert.equal(result.topShare, 90);
  assert.equal(result.exposure.find(e => e.currency === 'CNY').value, 200);
});

test('other funds remain individual holdings while index funds are grouped', () => {
  const fund = (id, name, value) => ({ ...row(id, value), asset: { id, name, category: 'fund', currency: 'CNY', quantity: 1, marketValue: value } });
  const result = assetAnalytics([fund('bond', '债券基金', 100), fund('mixed', '混合基金', 200), fund('s1', '标普500基金A', 50), fund('s2', '标普500基金C', 70)]);
  assert.equal(result.total, 420);
  assert.deepEqual(result.ranked.map(r => [r.asset.name, r.value]), [['混合基金', 200], ['标普 500', 120], ['债券基金', 100]]);
  assert.equal(result.topShare, 100);
});
