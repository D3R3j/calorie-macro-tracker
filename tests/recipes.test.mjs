import {test} from 'node:test';
import assert from 'node:assert/strict';
import {foods, estimate, defaults} from '../app/src/main/assets/www/model.js';
import {findFoods} from '../app/src/main/assets/www/recipes.js';
import {validState, resizeEntry} from '../app/src/main/assets/www/data.js';

test('Search suggests seasonings and sports nutrition after typing, with categories', () => {
  assert.deepEqual(findFoods(foods, '', 'main'), []);
  assert.equal(findFoods(foods, 'чеснок', 'main')[0].category, 'Приправы');
  assert.equal(findFoods(foods, 'протеин', 'shake')[0].category, 'Спортивное питание');
  assert.equal(findFoods(foods, 'креатин', 'smoothie')[0].food.p, 0);
});

test('A saved recipe is portable and a diary portion uses an independent snapshot', () => {
  const food = {id:'custom-1a1a1a1a-1234-1234-1234-123456789abc',name:'Свой протеин',p:80,f:2,c:5};
  const input = {weight:300,portion:300,method:'raw',oil:'none',water:90,items:[{id:food.id,food,mode:'grams',amount:30}]};
  const recipe = {id:'r1',type:'shake',name:'Коктейль',input,result:estimate(input)};
  const backup = {version:1,goals:defaults,entries:[],recipes:[recipe],customFoods:[food]};
  assert.equal(validState(JSON.parse(JSON.stringify(backup))), true);
  const entry = resizeEntry({...recipe, id:'e1', portion:300,date:'2026-11-09'}, {name:recipe.name,portion:150,meal:'Обед'});
  assert.equal(entry.result.p.mid, 12);
  assert.equal(recipe.input.portion, 300);
  assert.equal(validState({...backup,recipes:[],customFoods:[],entries:[entry]}), true);
  assert.equal(validState({...backup,recipes:[recipe,recipe]}), false);
});
