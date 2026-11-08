import {allocateMeals,transferCalories,validMealPlan} from './meal-plan.js';
export function mountMeals({getState,persist,refresh,fmt,esc}){
  const $=id=>document.getElementById(id),date=()=>$('date').value;
  const allocated=(day=date())=>allocateMeals(getState().goals.k,getState().mealPlans?.[day]);
  const spent=(name,day=date())=>getState().entries.filter(e=>e.date===day&&(e.meal||'Приём пищи')===name).reduce((sum,e)=>sum+e.result.k.mid,0);
  const names=()=>[...new Set([...allocated().map(m=>m.name),...getState().entries.filter(e=>e.date===date()).map(e=>e.meal||'Приём пищи'),'Полдник','Перекус'])];
  const options=(selected='Обед')=>names().map(n=>`<option ${n===selected?'selected':''} value="${esc(n)}">${esc(n)}</option>`).join('');
  const save=(day,plan)=>{const state=getState();state.mealPlans={...(state.mealPlans||{}),[day]:plan};persist();refresh()};
  function render(){
    const plan=allocated(),unplanned=names().filter(n=>!plan.some(m=>m.name===n)&&spent(n)>0).map(name=>({name,budget:0}));
    $('mealCards').innerHTML=[...plan,...unplanned].map((m,index)=>{const eaten=spent(m.name),left=m.budget-eaten;return `<article class="meal-card"><strong>${esc(m.name)}</strong><span class="meal-target">Цель <b>${fmt(m.budget)} ккал</b></span><span>Съедено ≈ ${fmt(eaten)} ккал</span><p>${left>=0?'Осталось':'Сверх цели'} <b>${fmt(Math.abs(left))} ккал</b></p>${index<plan.length?`<button type="button" class="quiet" data-transfer="${index}" ${Math.floor(left)<1?'disabled':''}>Перенести остаток ↗</button>`:'<small class="hint">Вне плана — добавьте цель через редактор.</small>'}</article>`}).join('');
    $('mealPlanTotal').textContent=`Всего ${fmt(Math.round(getState().goals.k))} ккал. План относится к выбранной дате. При изменении дневной цели доли пересчитываются.`;
    if($('meal')){const selected=$('meal').value;$('meal').innerHTML=options(selected)}
  }
  let editingDay='',draft=[],transferDay='',sourceName='';
  function readDraft(){draft=[...$('mealPlanRows').children].map(row=>({name:row.querySelector('[data-meal-name]').value.trim(),weight:Number(row.querySelector('[data-meal-budget]').value)}))}
  function showDraft(){
    $('mealPlanRows').innerHTML=draft.map((m,i)=>`<div class="meal-plan-row"><label>Название<input data-meal-name value="${esc(m.name)}" maxlength="40" required aria-label="Название приёма ${i+1}"></label><label>Ккал<input data-meal-budget value="${m.weight}" type="number" min="0" max="100000" step="1" required aria-label="Калории приёма ${i+1}"></label><button type="button" data-remove-meal="${i}" aria-label="Удалить приём ${i+1}">×</button></div>`).join('');showSum();
  }
  function showSum(){const total=draft.reduce((sum,m)=>sum+m.weight,0),goal=Math.round(getState().goals.k);$('mealPlanSum').textContent=`Распределено ${fmt(total)} из ${fmt(goal)} ккал. ${total<goal?'Ещё распределить '+fmt(goal-total)+' ккал.':total>goal?'Уберите '+fmt(total-goal)+' ккал.':'Бюджет соблюдён.'}`}
  $('editMealPlan').onclick=()=>{editingDay=date();draft=allocated().map(m=>({name:m.name,weight:m.budget}));$('mealPlanError').textContent='';showDraft();$('mealPlanDialog').showModal()};
  $('mealPlanRows').oninput=()=>{readDraft();showSum();$('mealPlanError').textContent=''};
  $('mealPlanRows').onclick=e=>{if(e.target.dataset.removeMeal!==undefined){readDraft();draft.splice(+e.target.dataset.removeMeal,1);showDraft()}};
  $('addMealRow').onclick=()=>{readDraft();if(draft.length>=8){$('mealPlanError').textContent='Можно добавить не больше 8 приёмов.';return}draft.push({name:draft.some(m=>m.name==='Полдник')?'':'Полдник',weight:0});showDraft()};
  $('cancelMealPlan').onclick=()=>$('mealPlanDialog').close();
  $('mealPlanForm').onsubmit=e=>{e.preventDefault();readDraft();const goal=Math.round(getState().goals.k);if(!validMealPlan(draft)||draft.some(m=>!Number.isInteger(m.weight))||draft.reduce((sum,m)=>sum+m.weight,0)!==goal){$('mealPlanError').textContent='Укажите уникальные названия и целые калории. Сумма должна совпадать с дневной целью.';return}save(editingDay,draft);$('mealPlanDialog').close()};
  $('mealCards').onclick=e=>{if(e.target.dataset.transfer===undefined)return;const plan=allocated();sourceName=plan[+e.target.dataset.transfer].name;transferDay=date();const left=Math.floor(plan.find(m=>m.name===sourceName).budget-spent(sourceName));if(left<1)return;$('transferDescription').textContent=`Из приёма «${sourceName}» доступно ${fmt(left)} ккал по центральной оценке съеденного.`;$('transferAmount').value=left;$('transferAmount').max=left;const sourceIndex=plan.findIndex(m=>m.name===sourceName);const defaultTarget=plan[sourceIndex+1]?.name||plan.find(m=>m.name!==sourceName)?.name||'Полдник';$('transferTarget').innerHTML=names().filter(n=>n!==sourceName).map(n=>`<option value="${esc(n)}" ${n===defaultTarget?'selected':''}>${esc(n)}</option>`).join('');$('transferError').textContent='';$('transferDialog').showModal()};
  $('cancelTransfer').onclick=()=>$('transferDialog').close();
  $('transferForm').onsubmit=e=>{e.preventDefault();try{const plan=transferCalories(allocated(transferDay),sourceName,$('transferTarget').value,+$('transferAmount').value,spent(sourceName,transferDay));save(transferDay,plan);$('transferDialog').close()}catch(err){$('transferError').textContent=err.message}};
  return {render,options};
}
