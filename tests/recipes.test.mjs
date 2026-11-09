import {test} from 'node:test';
import assert from 'node:assert/strict';
import {foods, estimate, defaults} from '../app/src/main/assets/www/model.js';
import {dishTypeGroups, dishTypes, findFoods} from '../app/src/main/assets/www/recipes.js';
import {validState, resizeEntry} from '../app/src/main/assets/www/data.js';

test('Search suggests seasonings and sports nutrition after typing, with categories', () => {
  assert.deepEqual(findFoods(foods, '', 'main'), []);
  assert.equal(findFoods(foods, 'чеснок', 'main')[0].category, 'Приправы');
  assert.equal(findFoods(foods, 'протеин', 'shake')[0].category, 'Спортивное питание');
  assert.equal(findFoods(foods, 'креатин', 'smoothie')[0].food.p, 0);
});

test('Search excludes already used ingredients before applying its result limit', () => {
  const candidates = Array.from({length: 40}, (_, id) => ({id, name:'Рис ' + String(id).padStart(2, '0')}));
  const excluded = new Set(candidates.slice(0, 25).map(food => food.id));
  assert.equal(findFoods(candidates, 'рис', 'main', excluded).length, 15);
});

test('Catalog contains 300 unique sourced profiles and keeps prior ingredient IDs', () => {
  assert.ok(foods.length >= 300);
  assert.equal(new Set(foods.map(food => food.source)).size, foods.length);
  assert.ok(foods.every(({k,p,f,c}) => [k,p,f,c].every(value => Number.isFinite(value) && value >= 0) && p+f+c <= 100.5));
  assert.equal(foods[7].pieceGrams, 50);
  assert.equal(foods[8].source, 'fdc:169757');
  assert.deepEqual([foods[9].k, foods[9].p, foods[9].f, foods[9].c], [92, 3.38, 0.62, 19.94]);
  assert.equal(foods[75].source, 'pure:creatine');
});

test('Russian chicken fillet queries find separate raw, boiled and baked profiles', () => {
  for (const query of ['куриное филе', 'филе курицы', 'куринного филе', 'филе куриной грудки']) {
    const results = findFoods(foods, query, 'main').map(({food})=>food.source);
    for (const source of ['fdc:171077','fdc:171478','fdc:171477']) assert.ok(results.includes(source), query);
  }
  assert.equal(foods[0].source, 'fdc:171477');
  assert.equal(findFoods(foods, 'сырое куриное филе', 'main')[0].food.k, 120);
  assert.equal(findFoods(foods, 'куриное филе вареное', 'main')[0].food.source, 'fdc:171478');
});

test('Everyday Russian cereals and pantry foods are discoverable by their common names', () => {
  const queries = {
    'гречневая ядрица':'fdc:170685', 'гречневая каша на воде':'fdc:170686',
    'овсяная крупа':'fdc:169705', 'геркулес сухой':'fdc:173904', 'овсяная каша на воде':'fdc:173905',
    'круглый рис сухой':'fdc:168931', 'рис вареный':'fdc:169757', 'перловка сухая':'fdc:170284',
    'перловая каша':'fdc:170285', 'пшено сухое':'fdc:169702', 'пшенная каша на воде':'fdc:168871',
    'кукурузная крупа':'fdc:171670', 'кукурузная каша':'fdc:171672', 'манка':'fdc:168933',
    'полба сухая':'fdc:169745', 'полба вареная':'fdc:169746', 'булгур сухой':'fdc:170688',
    'горох колотый сухой':'fdc:172428', 'гороховая каша':'fdc:172429',
    'картофель сырой':'fdc:170026', 'яйца перепелиные':'fdc:172191',
    'сгущенка':'fdc:171275', 'соль поваренная':'fdc:173468',
  };
  for (const [query, source] of Object.entries(queries)) {
    assert.ok(findFoods(foods, query, 'main').some(({food})=>food.source === source), query);
  }
  for (const query of ['ячневая крупа', 'ячневая каша', 'каша дружба', 'полтавская крупа', 'пшеничная каша',
    'манная каша на молоке', 'манная каша на воде', 'хлеб бородинский', 'ряженка']) {
    assert.ok(findFoods(foods, query, 'main').length, query);
  }
  assert.ok(findFoods(foods, 'каша', 'main')[0].food.name.includes('каша'));
});

test('Nested dish types retain every existing saved type exactly once', () => {
  assert.deepEqual(dishTypes.map(([type])=>type).sort(), ['dessert','main','other','salad','shake','smoothie','snack','soup']);
  assert.deepEqual(dishTypeGroups.find(([title])=>title === 'Напитки')[1].map(([type])=>type), ['shake','smoothie']);
});

test('A saved recipe is portable and a diary portion uses an independent snapshot', () => {
  const food = {id:'custom-1a1a1a1a-1234-1234-1234-123456789abc',name:'Свой протеин',p:80,f:2,c:5};
  const input = {weight:300,portion:300,method:'raw',oil:'none',water:90,items:[{id:food.id,food,mode:'grams',amount:30}]};
  const recipe = {id:'r1',type:'shake',name:'Коктейль',input,result:estimate(input)};
  const backup = {version:1,goals:defaults,entries:[],recipes:[recipe],customFoods:[food]};
  assert.equal(validState(JSON.parse(JSON.stringify(backup))), true);
  const entry = resizeEntry({...recipe, id:'e1', portion:300,date:'2026-11-09'}, {name:recipe.name,portion:150,meal:'Обед'});
  assert.equal(entry.result.p.mid, 12);
  assert.equal(entry.result.k.mid, 53.7);
  assert.equal(recipe.input.portion, 300);
  assert.equal(validState({...backup,recipes:[],customFoods:[],entries:[entry]}), true);
  assert.equal(validState({...backup,recipes:[recipe,recipe]}), false);
  const labeled = {...input,items:[{...input.items[0],food:{...food,k:371}}]};
  assert.equal(estimate(labeled).k.mid, 111.3);
});
