import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calorieNeeds, validNeedsProfile} from '../app/src/main/assets/www/needs.js';
const input = {height:180, weight:80, age:30, sex:'male', activity:1.2};
test('80 kg, 180 cm, 30 years: resting 1780, maintenance 2136', () => {
  assert.deepEqual(calorieNeeds(input), {resting:1780, maintenance:2136, rounded:2140});
});
test('Female equation and moderate activity: 60 kg, 165 cm, 30 years', () => {
  const result = calorieNeeds({height:165, weight:60, age:30, sex:'female', activity:1.55});
  assert.equal(result.resting, 1320.25);
  assert.equal(result.maintenance, 2046.3875);
  assert.equal(result.rounded, 2050);
});
test('Activity changes maintenance, without changing resting expenditure', () => {
  const low = calorieNeeds(input), high = calorieNeeds({...input, activity:1.9});
  assert.equal(low.resting, high.resting);
  assert.ok(high.maintenance > low.maintenance);
});
test('Rejects children, non-finite numbers, unsupported choices and empty profiles', () => {
  for (const change of [{age:17},{age:30.5},{weight:NaN},{height:Infinity},{weight:0},{sex:''},{activity:0},{activity:2.5}])
    assert.throws(() => calorieNeeds({...input, ...change}));
  assert.equal(validNeedsProfile(null), false);
  assert.equal(validNeedsProfile({}), false);
  assert.equal(validNeedsProfile(input), true);
});
