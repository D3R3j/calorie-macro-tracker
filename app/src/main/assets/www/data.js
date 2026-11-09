import {validNeedsProfile} from './needs.js';
import {validMealPlans} from './meal-plan.js';
import {validRecipeLibrary} from './recipes.js';
const keys=['k','p','f','c'];
export function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function validState(s){
  return !!(s&&s.version===1&&validRecipeLibrary(s)&&validMealPlans(s.mealPlans)&&(s.needsProfile===undefined||validNeedsProfile(s.needsProfile))&&keys.every(k=>Number.isFinite(s.goals?.[k])&&s.goals[k]>0&&s.goals[k]<=100000)&&Array.isArray(s.entries)&&s.entries.length<=10000&&new Set(s.entries.map(e=>e?.id)).size===s.entries.length&&s.entries.every(e=>e&&typeof e.id==='string'&&e.id.length>0&&typeof e.name==='string'&&e.name.length<=100&&validDate(e.date)&&Number.isFinite(e.portion)&&e.portion>0&&e.portion<=100000&&(e.meal===undefined||(typeof e.meal==='string'&&e.meal.length<=40))&&keys.every(k=>['low','mid','high'].every(b=>Number.isFinite(e.result?.[k]?.[b])&&e.result[k][b]>=0)&&e.result[k].low<=e.result[k].mid&&e.result[k].mid<=e.result[k].high)));
}
export function resizeEntry(entry,{name,portion,meal}){
  const max=entry.input?.weight??100000;
  if(typeof name!=='string'||!name.trim()||name.trim().length>100||!Number.isFinite(portion)||portion<=0||portion>max||typeof meal!=='string'||!meal.trim()||meal.trim().length>40)throw Error('Проверьте название, приём пищи и порцию. Порция не должна превышать вес блюда.');
  const ratio=portion/entry.portion,result={};
  for(const key of keys){result[key]={};for(const band of ['low','mid','high'])result[key][band]=entry.result[key][band]*ratio;}
  return {...entry,name:name.trim(),portion,meal:meal.trim(),result,...(entry.input?{input:{...entry.input,portion}}:{})};
}
export function renameMealEntries(entries,date,renames){return entries.map(e=>e.date===date&&Object.hasOwn(renames,e.meal)?{...e,meal:renames[e.meal]}:e);}
