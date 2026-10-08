import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
await build({ entryPoints: ['src/features/portfolio/lib/funds.ts', 'src/features/portfolio/lib/portfolio.ts'], bundle: true, platform: 'node', format: 'esm', outdir: 'node_modules/.cache/portfolio-tests/funds' });
const { summarizeFunds, groupOf, monthlyPlan } = await import('../node_modules/.cache/portfolio-tests/funds/funds.js');
const { portfolioSchema } = await import('../node_modules/.cache/portfolio-tests/funds/portfolio.js');
const fund = (id, name, value, extra = {}) => ({ id, name, category: 'fund', currency: 'CNY', quantity: 500, marketValue: value, ...extra });
test('funds aggregate market values by direction without summing unrelated shares', () => {
  const result = summarizeFunds([fund('a','标普500 QDII A',100),fund('b','标普 500 QDII C',200),fund('c','纳斯达克100',300),fund('d','标普500',50,{group:'other'}),{id:'cash',name:'cash',category:'cash',currency:'CNY',amount:1000}]);
  assert.equal(result.total,650); assert.deepEqual(result.groups.map(g=>g.value),[300,300,50]);
  assert.equal(result.groups[0].funds.length,2); assert.equal(groupOf(fund('x','未识别基金',1)),'other');
  assert.equal('quantity' in result.groups[0],false);
});
test('monthly plan estimates are separate from valuation and paused plans contribute zero', () => {
  const daily=fund('a','a',100,{dca:{enabled:true,amount:10,frequency:'weekday'}});
  const weekly=fund('b','b',200,{dca:{enabled:true,amount:12,frequency:'weekly'}});
  const paused=fund('c','c',300,{dca:{enabled:false,amount:500,frequency:'monthly'}});
  assert.equal(monthlyPlan(daily),210); assert.equal(monthlyPlan(weekly),52); assert.equal(monthlyPlan(paused),0);
  const result=summarizeFunds([daily,weekly,paused]); assert.equal(result.monthly,262); assert.equal(result.active,2); assert.equal(result.total,600);
});
test('old JSON remains compatible and grouping/plan fields survive import/export validation', () => {
  const p={version:1,asOf:new Date().toISOString(),assets:[fund('a','a',100)]};
  assert.equal(portfolioSchema.safeParse(p).success,true);
  p.assets[0].group='nasdaq100';p.assets[0].dca={enabled:true,amount:100,frequency:'monthly'};
  assert.deepEqual(portfolioSchema.parse(JSON.parse(JSON.stringify(p))).assets[0],p.assets[0]);
  p.assets[0].dca.amount=-1;assert.equal(portfolioSchema.safeParse(p).success,false);
});
