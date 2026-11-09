import {ingredientFood, validCustomFood} from './model.js';

export const dishTypes = [
  ['soup', 'Первое'], ['main', 'Второе'], ['salad', 'Салат'],
  ['dessert', 'Десерт'], ['shake', 'Коктейль'], ['smoothie', 'Смузи'],
  ['snack', 'Перекус'], ['other', 'Другое'],
];
const preferences = {
  soup: ['Овощи и зелень', 'Приправы', 'Мясо, рыба и яйца', 'Крупы и бобовые'],
  main: ['Мясо, рыба и яйца', 'Крупы и бобовые', 'Овощи и зелень', 'Соусы', 'Приправы'],
  salad: ['Овощи и зелень', 'Соусы', 'Приправы'],
  dessert: ['Фрукты и орехи', 'Молочное', 'Для напитков'],
  shake: ['Спортивное питание', 'Молочное', 'Для напитков', 'Фрукты и орехи'],
  smoothie: ['Фрукты и орехи', 'Молочное', 'Овощи и зелень', 'Спортивное питание'],
  snack: ['Фрукты и орехи', 'Молочное'],
};

function group(food) {
  if (food.category) return food.category;
  const {id} = food;
  if (typeof id === 'string') return 'Мои продукты';
  if (id <= 7 || [43,44].includes(id)) return 'Мясо, рыба и яйца';
  if ((id >= 8 && id <= 13 && id !== 11) || (id >= 35 && id <= 39) || id === 42) return 'Крупы и бобовые';
  if ((id >= 20 && id <= 24) || id === 45) return 'Молочное';
  if ([46,47,48,49,52,53,54].includes(id)) return 'Фрукты и орехи';
  if ([25,26,27,28].includes(id)) return 'Для выпечки';
  return 'Овощи и зелень';
}
const normalize = text => text.toLocaleLowerCase('ru-RU').replaceAll('ё','е').trim();

export function findFoods(catalog, query, type) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const order = ['Мои продукты', ...(preferences[type] ?? [])];
  const priority = category => order.includes(category) ? order.indexOf(category) : order.length;
  return catalog.filter(food => words.every(word => normalize(food.name).includes(word)))
    .map(food => ({food, category:group(food)}))
    .sort((a,b) => priority(a.category)-priority(b.category) || a.category.localeCompare(b.category,'ru') ||
      a.food.name.localeCompare(b.food.name,'ru')).slice(0, 24);
}

export function validRecipeLibrary(state) {
  const custom = state.customFoods ?? [];
  const recipes = state.recipes ?? [];
  return Array.isArray(custom) && custom.length <= 500 && custom.every(validCustomFood) &&
    new Set(custom.map(food => food.id)).size === custom.length &&
    Array.isArray(recipes) && recipes.length <= 500 && recipes.every(recipe => {
      const input = recipe?.input;
      return typeof recipe?.id === 'string' && recipe.id.length > 0 &&
        typeof recipe.name === 'string' && recipe.name.trim().length > 0 && recipe.name.length <= 100 &&
        dishTypes.some(([type]) => type === recipe.type) && input &&
        Number.isFinite(input.weight) && input.weight > 0 && input.weight <= 100000 &&
        input.portion === input.weight && Array.isArray(input.items) &&
        input.items.length > 0 && input.items.length <= 500 && input.items.every(ingredientFood) &&
        ['k','p','f','c'].every(key => {
          const band = recipe.result?.[key];
          return [band?.low, band?.mid, band?.high].every(value => Number.isFinite(value) && value >= 0) &&
            band.low <= band.mid && band.mid <= band.high;
        });
    }) && new Set(recipes.map(recipe => recipe.id)).size === recipes.length;
}
