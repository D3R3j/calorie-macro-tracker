import {test} from 'node:test';import assert from 'node:assert/strict';
import {estimate,totals} from '../app/src/main/assets/www/model.js';
const input={weight:1000,portion:250,items:[{id:0,rank:1}],oil:'none',oilGrams:0,method:'boil',water:0};
test('Cooked chicken uses the four USDA values per 100 g, including its reported energy',()=>{const r=estimate(input);assert.ok(Math.abs(r.p.mid-77.55)<1e-8);assert.ok(Math.abs(r.f.mid-8.925)<1e-8);assert.ok(Math.abs(r.k.mid-412.5)<1e-8)});
test('Oil replaces solid mass and free water dilutes macros',()=>{const r=estimate({...input,oil:'known',oilGrams:20});assert.ok(Math.abs(r.f.mid-(980*.0357+20)*.25)<1e-8);assert.ok(Math.abs(estimate({...input,water:50}).k.mid-206.25)<1e-8)});
test('Portion scaling, deterministic ranges and daily sums remain consistent',()=>{const mixed={...input,items:[{id:0,rank:3},{id:8,rank:6}],oil:'unknown'};const one=estimate(mixed),two=estimate({...mixed,portion:500});assert.deepEqual(one,estimate(mixed));for(const k of ['k','p','f','c']){for(const band of ['low','mid','high'])assert.equal(two[k][band],one[k][band]*2);assert.ok(one[k].low<=one[k].mid&&one[k].mid<=one[k].high);assert.equal(totals([{result:one},{result:one}])[k].mid,two[k].mid)}assert.equal(totals([]).k.mid,0)});
test('Invalid recipes and mass balances are rejected',()=>{for(const overrides of [{portion:1001},{items:[]},{weight:0},{water:91},{oil:'known',oilGrams:1000}])assert.throws(()=>estimate({...input,...overrides}))});

test('Two eggs and 150 g of rice leave 50 g for the estimated onion in a 300 g dish', () => {
  const result = estimate({
    ...input, weight: 300, portion: 150,
    items: [{id: 7, mode: 'pieces', amount: 2}, {id: 8, mode: 'grams', amount: 150}, {id: 16, rank: 1}],
  });
  assert.ok(Math.abs(result.k.mid - 185) < 1e-8);
  assert.ok(Math.abs(result.p.mid - 8.5825) < 1e-8);
});

test('Measured ingredient weights stay fixed and the actual dish weight can refine counted pieces', () => {
  const result = estimate({
    ...input, weight: 245, portion: 245,
    items: [{id: 7, mode: 'pieces', amount: 2}, {id: 8, mode: 'grams', amount: 150}],
  });
  assert.ok(Math.abs(result.p.mid - 15.986) < 1e-8);
});

test('Measured recipes reject unassigned mass, excessive weights and fractional counts', () => {
  const measured = {...input, weight: 300, portion: 100};
  assert.throws(() => estimate({...measured, items: [{id: 8, mode: 'grams', amount: 100}]}), /вес/iu);
  assert.throws(() => estimate({...measured, items: [{id: 8, mode: 'grams', amount: 301}, {id: 16, rank: 1}]}), /вес/iu);
  assert.throws(() => estimate({...measured, items: [{id: 7, mode: 'pieces', amount: 1.5}]}), /целое/iu);
});
