import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
await build({ entryPoints: ['src/features/portfolio/lib/portfolio.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'node_modules/.cache/portfolio-tests/portfolio-test.mjs' });
const { portfolioSchema, sample, sampleFx, sampleQuotes, valueAsset, convert } = await import('../node_modules/.cache/portfolio-tests/portfolio-test.mjs');
test('four-currency conversion uses consistent USD base and same-currency works offline', () => {
  assert.equal(convert(100,'USD','SGD',sampleFx),128);
  assert.ok(Math.abs(convert(670,'CNY','SGD',sampleFx)-128)<1e-10);
  assert.equal(convert(50,'CNY','CNY',null),50);
  assert.equal(convert(50,'USD','CNY',null),null);
});
test('QDII uses imported CNY market value, never quantity times an ETF price', () => {
  const a=sample.assets.find(a=>a.id==='sp500');
  const row=valueAsset(a,'CNY',{},null);
  assert.equal(row.native,68400); assert.equal(row.value,68400);
});
test('gold is per gram and missing real quotes never borrow demo values', () => {
  const gold=sample.assets.find(a=>a.category==='gold');
  assert.ok(Math.abs(valueAsset(gold,'USD',sampleQuotes,sampleFx).value-(4100/31.1034768*100))<1e-8);
  const stock=sample.assets.find(a=>a.id==='aapl');
  assert.equal(valueAsset(stock,'SGD',{},sampleFx).value,null);
  assert.equal(valueAsset(stock,'SGD',{AAPL:{...sampleQuotes.AAPL,currency:'HKD'}},sampleFx).value,null);
});
test('schema accepts a round trip, rejects negatives, duplicate ids and wrong QDII currency', () => {
  assert.deepEqual(portfolioSchema.parse(JSON.parse(JSON.stringify(sample))),sample);
  const clone=()=>structuredClone(sample);
  const negative=clone();negative.assets[0].amount=-1;assert.equal(portfolioSchema.safeParse(negative).success,false);
  const duplicate=clone();duplicate.assets[1].id=duplicate.assets[0].id;assert.equal(portfolioSchema.safeParse(duplicate).success,false);
  const wrong=clone();wrong.assets.find(a=>a.category==='fund').currency='USD';assert.equal(portfolioSchema.safeParse(wrong).success,false);
  assert.equal(portfolioSchema.safeParse({...sample,assets:[]}).success,true);
});
