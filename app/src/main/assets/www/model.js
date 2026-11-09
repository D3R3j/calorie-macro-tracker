import {foods} from './foods.js';
export {foods};

export const defaults={k:2450,p:150,f:70,c:305};
export const energy=v=>4*v.p+9*v.f+4*v.c;
const foodEnergy = food => food.k ?? energy(food);
const oilEnergy = 9;
const oilLimits = {raw: .03, boil: .015, stew: .04, bake: .05, fry: .10};
const macroKeys = ['p', 'f', 'c'];
const massTolerance = .001;

export function validCustomFood(food) {
  return !!food && /^custom-[0-9a-f-]{36}$/.test(food.id) &&
    typeof food.name === 'string' && food.name.trim().length > 0 && food.name.length <= 100 &&
    (food.k === undefined || (Number.isFinite(food.k) && food.k >= 0 && food.k <= 900)) &&
    macroKeys.every(key => Number.isFinite(food[key]) && food[key] >= 0 && food[key] <= 100) &&
    food.p + food.f + food.c <= 100.5;
}

export function ingredientFood(item) {
  if (Number.isInteger(item?.id)) return foods[item.id];
  return item?.id === item?.food?.id && validCustomFood(item?.food) ? item.food : undefined;
}

function prepareIngredient(item) {
  const food = ingredientFood(item);
  if (!food) throw Error('Выберите продукт из справочника.');
  const mode = item.mode ?? 'rank';
  if (mode === 'rank' && [1, 3, 6].includes(item.rank)) {
    return {food, mode, amount: item.rank};
  }
  if (mode === 'grams' && Number.isFinite(item.amount) && item.amount > 0 && item.amount <= 100000) {
    return {food, mode, amount: item.amount};
  }
  if (mode === 'pieces' && food.pieceGrams) {
    if (!Number.isInteger(item.amount) || item.amount < 1 || item.amount > 100000) {
      throw Error('Укажите целое количество штук.');
    }
    return {food, mode, amount: item.amount * food.pieceGrams};
  }
  throw Error('Проверьте вес или способ ввода ингредиента.');
}

export function estimate({weight,portion,items,oil,oilGrams,method,water}) {
 if(!Number.isFinite(weight)||weight<=0||weight>100000||!Number.isFinite(portion)||portion<=0||portion>weight) throw Error('Укажите вес блюда и порцию от 1 г до веса блюда.');
 if(!Array.isArray(items)||!items.length) throw Error('Добавьте хотя бы один ингредиент.');
 if(!['none','known','unknown'].includes(oil)||!Object.hasOwn(oilLimits,method)) throw Error('Проверьте способ приготовления и масло.');
 if(!Number.isFinite(water)||water<0||water>90) throw Error('Доля воды должна быть от 0 до 90%.');
 const solidMass = weight * (1 - water / 100);
 if(oil==='known'&&(!Number.isFinite(oilGrams)||oilGrams<0||oilGrams>=solidMass)) throw Error('Масло должно весить меньше пищевой части блюда.');

 const recipe = items.map(prepareIngredient);
 const hasRank = recipe.some(ingredient => ingredient.mode === 'rank');
 // With no rough shares, the weighed dish refines the reference sizes of the pieces.
 const fixed = recipe.filter(ingredient => ingredient.mode === 'grams' || (hasRank && ingredient.mode === 'pieces'));
 const variable = recipe.filter(ingredient => ingredient.mode === 'rank' || (!hasRank && ingredient.mode === 'pieces'));
 const fixedMass = fixed.reduce((sum, ingredient) => sum + ingredient.amount, 0);
 const remaining = solidMass - fixedMass;
 let fixedOil = oil === 'known' ? oilGrams : 0;
 const oilCap = Math.min(weight * oilLimits[method], Math.max(0, remaining));

 if (remaining < fixedOil - massTolerance || (variable.length && remaining <= fixedOil)) {
   throw Error('Указанный вес не помещается в готовое блюдо с учётом масла и воды.');
 }
 if (!variable.length) {
   if (oil === 'unknown' && remaining <= oilCap + massTolerance) fixedOil = Math.max(0, remaining);
   if (Math.abs(remaining - fixedOil) > massTolerance) {
     throw Error('Вес ингредиентов, масла и воды должен совпадать с весом готового блюда.');
   }
 }
 const fixedMacros = {k: 0, p: 0, f: 0, c: 0};
 for (const {food, amount} of fixed) {
   for (const key of macroKeys) fixedMacros[key] += food[key] * amount / 100;
   fixedMacros.k += foodEnergy(food) * amount / 100;
 }
 let seed=42;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return(seed+.5)/4294967296};
 const samples=[];
 for(let s=0;s<3000;s++) {
  const weights = variable.map(({amount}) => hasRank ? -Math.log(rand()) * amount : amount);
  const sum = weights.reduce((a, b) => a + b, 0);
  const grams = oil === 'unknown' && variable.length ? oilCap * rand() : fixedOil;
  const solid = remaining - grams;
  const v = {...fixedMacros, k: fixedMacros.k + oilEnergy * grams, f: fixedMacros.f + grams};
  variable.forEach(({food}, n) => {
    const hundredsOfGrams = solid * weights[n] / sum / 100;
    for (const key of macroKeys) v[key] += food[key] * hundredsOfGrams;
    v.k += foodEnergy(food) * hundredsOfGrams;
  });
  for(const key of ['k','p','f','c'])v[key]*=portion/weight;samples.push(v);
 }
 const result={};for(const key of ['k','p','f','c']){const sorted=samples.map(v=>v[key]).sort((a,b)=>a-b);result[key]={low:sorted[150],mid:sorted[1500],high:sorted[2849]}}
 return result;
}
export function totals(entries){const out={};for(const key of ['k','p','f','c'])out[key]=['low','mid','high'].reduce((r,band)=>({...r,[band]:entries.reduce((s,e)=>s+e.result[key][band],0)}),{});return out}
