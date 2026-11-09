/* Reference values per 100 g of prepared edible product, approximate. */
// Standard edible portions from USDA SR Legacy. Actual pieces vary in size.
const pieceWeights = new Map([[7, 50], [15, 61], [16, 110], [17, 123], [47, 182], [48, 118], [51, 119]]);
export const foods = [
 ['Куриная грудка',31,3.6,0],['Куриное бедро',25,11,0],['Говядина',26,15,0],['Свинина',25,22,0],['Индейка',29,4,0],['Рыба белая',23,2,0],['Лосось',22,12,0],['Яйцо',12.6,10.6,1.1],['Рис варёный',2.7,.3,28],['Гречка варёная',3.6,1.1,20],['Макароны варёные',5,1.1,30],['Картофель варёный',2,.1,17],['Фасоль варёная',8.7,.5,22],['Чечевица варёная',9,.4,20],['Капуста',1.5,.2,5],['Морковь',.9,.2,8],['Лук',1.1,.1,9],['Помидор',.9,.2,3.9],['Кабачок',1.2,.3,3],['Грибы',3.1,.3,3],['Сыр',25,27,1],['Сметана 20%',2.8,20,3.2],['Сливки 10%',3,10,4],['Молоко 2,5%',3,2.5,4.7],['Творог 5%',17,5,3],['Хлеб',8,3,49],['Мука',10,1,76],['Сахар',0,0,100],['Сливочное масло',.5,82,.8]
,
 // USDA FoodData Central, SR Legacy (FDC IDs in comments).
 ['Брокколи варёная',2.38,0.41,7.18], // 169967
 ['Цветная капуста варёная',1.84,0.45,4.11], // 170397
 ['Свёкла варёная',1.68,0.18,9.96], // 169146
 ['Шпинат варёный',2.97,0.26,3.75], // 168463
 ['Зелёный горошек варёный',5.36,0.22,15.63], // 170420
 ['Кукуруза варёная',3.41,1.5,20.98], // 169999
 ['Нут варёный',8.86,2.59,27.42], // 173757
 ['Киноа варёная',4.4,1.92,21.3], // 168917
 ['Булгур варёный',3.08,0.24,18.58], // 170287
 ['Перловка варёная',2.26,0.44,28.22], // 170285
 ['Бурый рис варёный',2.74,0.97,25.58], // 169704
 ['Батат запечённый',2.01,0.15,20.71], // 168483
 ['Баклажан варёный',0.83,0.23,8.73], // 169229
 ['Тофу плотный',17.27,8.72,2.78], // 172475
 ['Треска запечённая',22.83,0.86,0], // 171956
 ['Тунец в собственном соку',25.51,0.82,0], // 171986
 ['Йогурт натуральный нежирный',5.25,1.55,7.04], // 170886
 ['Авокадо',2,14.66,8.53], // 171705
 ['Яблоко с кожурой',0.26,0.17,13.81], // 171688
 ['Банан',1.09,0.33,22.84], // 173944
 ['Апельсин',0.94,0.12,11.75], // 169097
 ['Огурец с кожурой',0.65,0.11,3.63], // 168409
 ['Перец сладкий красный',0.99,0.3,6.03], // 170108
 ['Миндаль',21.15,49.93,21.55], // 170567
 ['Грецкий орех',15.23,65.21,13.71], // 170187
 ['Кунжут',17.73,49.67,23.45], // 170150

 // Дополнение USDA и TempoLife (CC BY 4.0).
 ['Чеснок',6.36,0.5,33.06,'Приправы'], // 169230
 ['Чёрный перец',10.39,3.26,63.95,'Приправы'], // 170931
 ['Паприка',14.14,12.89,53.99,'Приправы'], // 171329
 ['Куркума',9.68,3.25,67.14,'Приправы'], // 172231
 ['Корица',3.99,1.24,80.59,'Приправы'], // 171320
 ['Какао без сахара',19.6,13.7,57.9,'Для напитков'], // 169593
 ['Мёд',0.3,0.0,82.4,'Для напитков'], // 169640
 ['Кетчуп',1.04,0.1,27.4,'Соусы'], // 168556
 ['Майонез',0.96,74.85,0.57,'Соусы'], // 171009
 ['Соевый соус',8.14,0.57,4.93,'Соусы'], // 174277
 ['Горчица',3.74,3.34,5.83,'Соусы'], // 172234
 ['Томатная паста',4.32,0.47,18.91,'Соусы'], // 170459
 ['Вустерский соус',0.0,0.0,19.17,'Соусы'], // 171610
 ['Кефир 2,5%',3.4,2.5,4.8,'Молочное'], // TempoLife 1289
 ['Протеин соевый (справочный)',55.6,5.6,28.9,'Спортивное питание'], // TempoLife 16688
 ['Протеин сывороточный (справочный)',78.1,1.6,6.3,'Спортивное питание'], // TempoLife 16687
 ['Изолят сывороточного протеина (справочный)',58.1,1.2,29.1,'Спортивное питание'], // TempoLife 16684
 ['Медовая горчица',1.3,4.2,40.3,'Соусы'], // TempoLife 567
 ['Дижонская горчица',3.7,4.0,5.3,'Соусы'], // TempoLife 565
 ['Песто с базиликом',4.2,36.4,6.9,'Соусы'], // TempoLife 15180
 ['Креатин моногидрат без добавок',0,0,0,'Спортивное питание'], // Без белка, жира и углеводов
].map(([name,p,f,c,category],id)=>({id,name,p,f,c,category,pieceGrams:pieceWeights.get(id)}));
export const defaults={k:2450,p:150,f:70,c:305};
export const energy=v=>4*v.p+9*v.f+4*v.c;
const oilLimits = {raw: .03, boil: .015, stew: .04, bake: .05, fry: .10};
const macroKeys = ['p', 'f', 'c'];
const massTolerance = .001;

export function validCustomFood(food) {
  return !!food && /^custom-[0-9a-f-]{36}$/.test(food.id) &&
    typeof food.name === 'string' && food.name.trim().length > 0 && food.name.length <= 100 &&
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
 const fixedMacros = {p: 0, f: 0, c: 0};
 for (const {food, amount} of fixed) {
   for (const key of macroKeys) fixedMacros[key] += food[key] * amount / 100;
 }
 let seed=42;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return(seed+.5)/4294967296};
 const samples=[];
 for(let s=0;s<3000;s++) {
  const weights = variable.map(({amount}) => hasRank ? -Math.log(rand()) * amount : amount);
  const sum = weights.reduce((a, b) => a + b, 0);
  const grams = oil === 'unknown' && variable.length ? oilCap * rand() : fixedOil;
  const solid = remaining - grams;
  const v = {...fixedMacros, f: fixedMacros.f + grams};
  variable.forEach(({food}, n) => {
    for (const key of macroKeys) v[key] += food[key] * solid * weights[n] / sum / 100;
  });
  v.k=energy(v);for(const key of ['k','p','f','c'])v[key]*=portion/weight;samples.push(v);
 }
 const result={};for(const key of ['k','p','f','c']){const sorted=samples.map(v=>v[key]).sort((a,b)=>a-b);result[key]={low:sorted[150],mid:sorted[1500],high:sorted[2849]}}
 return result;
}
export function totals(entries){const out={};for(const key of ['k','p','f','c'])out[key]=['low','mid','high'].reduce((r,band)=>({...r,[band]:entries.reduce((s,e)=>s+e.result[key][band],0)}),{});return out}
