import {test} from 'node:test';import assert from 'node:assert/strict';
import {allocateMeals,lunchAdjustment,transferCalories,validMealPlans} from '../app/src/main/assets/www/meal-plan.js';
test('Default split conserves the daily budget, including rounding',()=>{assert.deepEqual(allocateMeals(2450),[{name:'Завтрак',budget:735},{name:'Обед',budget:980},{name:'Ужин',budget:735}]);for(const goal of [1,2,1001,2140,2451])assert.equal(allocateMeals(goal).reduce((s,m)=>s+m.budget,0),goal)});
test('Uneaten lunch calories can move to a new afternoon meal, without changing the day',()=>{const plan=transferCalories(allocateMeals(2450),'Обед','Полдник',280,700);assert.deepEqual(allocateMeals(2450,plan),[{name:'Завтрак',budget:735},{name:'Обед',budget:700},{name:'Ужин',budget:735},{name:'Полдник',budget:280}]);assert.equal(plan.reduce((s,m)=>s+m.weight,0),2450)});
test('Transfer cannot move eaten calories or exceed remaining calories',()=>{const plan=allocateMeals(2450);for(const amount of [281,0,-1,1.5])assert.throws(()=>transferCalories(plan,'Обед','Полдник',amount,700));assert.throws(()=>transferCalories(plan,'Обед','Обед',1,700));assert.throws(()=>transferCalories(plan,'Обед','Ужин',1,1000))});
test('Existing target and fractional consumption preserve whole-calorie limit',()=>{const out=transferCalories(allocateMeals(2450),'Обед','Ужин',279,700.3);assert.equal(out.find(m=>m.name==='Ужин').weight,1014);assert.throws(()=>transferCalories(allocateMeals(2450),'Обед','Ужин',280,700.3))});
test('Plans rescale with the daily goal and reject invalid imported plans',()=>{const plan=[{name:'Завтрак',weight:500},{name:'Обед',weight:1000},{name:'Ужин',weight:500}];assert.equal(allocateMeals(3000,plan)[1].budget,1500);assert.equal(validMealPlans(undefined),true);assert.equal(validMealPlans({'2026-11-08':plan}),true);for(const bad of [null,[],{'bad':plan},{'2026-11-08':[{name:'Обед',weight:0}]},{'2026-11-08':[{name:'Обед',weight:1},{name:'Обед',weight:1}]}])assert.equal(validMealPlans(bad),false)});

test('Lunch overage can use only the remaining dinner budget and preserves the daily total', () => {
  const plan = allocateMeals(2450);
  assert.deepEqual(lunchAdjustment(plan, 1080, 0), {amount:100, excess:100, dinnerBudget:635});
  const partial = lunchAdjustment(plan, 1080, 710.5);
  assert.deepEqual(partial, {amount:24, excess:100, dinnerBudget:711});
  assert.deepEqual(transferCalories(plan,'Ужин','Обед',partial.amount,710.5).map(meal=>meal.weight), [735,1004,711]);
  assert.equal(lunchAdjustment(plan,980,0), null);
  assert.equal(lunchAdjustment(plan,1080,735), null);
  assert.equal(lunchAdjustment(plan.slice(0,2),1080,0), null);
});
