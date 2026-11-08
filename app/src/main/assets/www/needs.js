// Mifflin–St Jeor (1990): resting energy expenditure, kcal/day.
// Activity multipliers are approximate UI assumptions, not part of the equation.
export const activities = [1.2, 1.375, 1.55, 1.725, 1.9];
export function calorieNeeds({height, weight, age, sex, activity}) {
  if (!Number.isFinite(height) || height < 100 || height > 250)
    throw Error('Укажите рост от 100 до 250 см.');
  if (!Number.isFinite(weight) || weight < 30 || weight > 350)
    throw Error('Укажите вес от 30 до 350 кг.');
  if (!Number.isInteger(age) || age < 18 || age > 100)
    throw Error('Калькулятор предназначен для взрослых от 18 до 100 лет.');
  if (!['male', 'female'].includes(sex) || !activities.includes(activity))
    throw Error('Выберите пол для формулы и уровень активности.');
  const resting = 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161);
  const maintenance = resting * activity;
  return {resting, maintenance, rounded: Math.round(maintenance / 10) * 10};
}
export function validNeedsProfile(profile) {
  try { calorieNeeds(profile); return true; } catch { return false; }
}
