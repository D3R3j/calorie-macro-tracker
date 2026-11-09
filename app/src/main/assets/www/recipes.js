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

const normalize = text => text.toLowerCase().replaceAll('ё','е').trim();
const russian = new Intl.Collator('ru');

export function findFoods(catalog, query, type, excluded = new Set()) {
  const text = normalize(query);
  if (!text) return [];
  const words = text.split(/\s+/);
  const order = ['Мои продукты', ...(preferences[type] ?? [])];
  const matches = [];
  for (const food of catalog) {
    if (excluded.has(food.id)) continue;
    // Normalize once per name, even when a query has several words.
    const name = normalize(food.name);
    if (!words.every(word => name.includes(word))) continue;
    const category = food.category ?? 'Мои продукты';
    const orderIndex = order.indexOf(category);
    const priority = orderIndex < 0 ? order.length : orderIndex;
    const relevance = name === text ? 0 : name.startsWith(text) ? 1 : 2;
    matches.push({food, category, priority, relevance});
  }
  return matches.sort((a,b) => a.relevance-b.relevance || a.priority-b.priority ||
    russian.compare(a.category,b.category) || russian.compare(a.food.name,b.food.name)).slice(0, 24);
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
