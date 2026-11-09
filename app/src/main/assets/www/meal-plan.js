export const defaultMeals=[{name:'Завтрак',weight:30},{name:'Обед',weight:40},{name:'Ужин',weight:30}];
export function validMealPlan(plan){
  return Array.isArray(plan)&&plan.length>=1&&plan.length<=8&&plan.every(m=>m&&typeof m.name==='string'&&m.name.trim()===m.name&&m.name.length>0&&m.name.length<=40&&Number.isFinite(m.weight)&&m.weight>=0&&m.weight<=100000)&&new Set(plan.map(m=>m.name)).size===plan.length&&plan.reduce((sum,m)=>sum+m.weight,0)>0;
}
export function validMealPlans(plans){return plans===undefined||!!(plans&&typeof plans==='object'&&!Array.isArray(plans)&&Object.keys(plans).length<=10000&&Object.entries(plans).every(([date,plan])=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&validMealPlan(plan)))}
export function allocateMeals(goal,plan=defaultMeals){
  if(!Number.isFinite(goal)||goal<1||goal>100000||!validMealPlan(plan))throw Error('Некорректный план питания.');
  const total=Math.round(goal),sum=plan.reduce((s,m)=>s+m.weight,0);
  const rows=plan.map((m,index)=>{const exact=total*m.weight/sum;return {name:m.name,budget:Math.floor(exact),fraction:exact-Math.floor(exact),index}});
  let left=total-rows.reduce((s,m)=>s+m.budget,0);
  for(const row of [...rows].sort((a,b)=>b.fraction-a.fraction||a.index-b.index)){if(left--<=0)break;row.budget++}
  return rows.map(({name,budget})=>({name,budget}));
}
export function transferCalories(allocated,source,target,amount,spent){
  const from=allocated.find(m=>m.name===source);
  if(!from||typeof target!=='string'||!target.trim()||target.trim()!==target||target.length>40||source===target||!Number.isInteger(amount)||amount<1||!Number.isFinite(spent)||spent<0||amount>Math.floor(from.budget-spent))throw Error('Можно перенести только целое число неиспользованных калорий.');
  const out=allocated.map(m=>({name:m.name,weight:m.budget}));
  if(!out.some(m=>m.name===target)){if(out.length>=8)throw Error('В плане может быть не больше 8 приёмов пищи.');out.push({name:target,weight:0})}
  out.find(m=>m.name===source).weight-=amount;out.find(m=>m.name===target).weight+=amount;
  return out;
}

export function lunchAdjustment(plan, lunchSpent, dinnerSpent) {
  const lunch = plan.find(meal => meal.name === 'Обед');
  const dinner = plan.find(meal => meal.name === 'Ужин');
  if (!lunch || !dinner) return null;
  const excess = Math.ceil(lunchSpent - lunch.budget);
  const available = Math.floor(dinner.budget - dinnerSpent);
  const amount = Math.min(excess, available);
  if (amount < 1) return null;
  return {amount, excess, dinnerBudget: dinner.budget - amount};
}
