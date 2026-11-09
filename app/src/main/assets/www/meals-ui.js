import {allocateMeals,lunchAdjustment,transferCalories,validMealPlan} from './meal-plan.js';
import {renameMealEntries} from './data.js';
import {icon} from './icons.js';
export function mountMeals({getState,persist,refresh,fmt,esc}){
  const $=id=>document.getElementById(id),date=()=>$('date').value;
  const allocated=(day=date())=>allocateMeals(getState().goals.k,getState().mealPlans?.[day]);
  const spent=(name,day=date())=>getState().entries.filter(e=>e.date===day&&(e.meal||'Приём пищи')===name).reduce((sum,e)=>sum+e.result.k.mid,0);
  const names=()=>[...new Set([...allocated().map(m=>m.name),...getState().entries.filter(e=>e.date===date()).map(e=>e.meal||'Приём пищи'),'Полдник','Перекус'])];
  const options=(selected='Обед')=>names().map(n=>`<option ${n===selected?'selected':''} value="${esc(n)}">${esc(n)}</option>`).join('');
  const save=(day,plan)=>{const state=getState();state.mealPlans={...(state.mealPlans||{}),[day]:plan};persist();refresh()};
  function render(){
    const plan=allocated();
    const logged=new Set(getState().entries.filter(entry=>entry.date===date()).map(entry=>entry.meal||'Приём пищи'));
    const unplanned=[...logged].filter(name=>!plan.some(meal=>meal.name===name)).map(name=>({name,budget:0}));
    $('mealCards').innerHTML = [...plan, ...unplanned].map((meal, index) => {
      const eaten = spent(meal.name);
      const left = meal.budget - eaten;
      const canTransfer = Math.floor(left) >= 1;
      return `<article class="meal-card">
        <div class="meal-name"><strong>${esc(meal.name)}</strong><small>${index < plan.length ? (logged.has(meal.name) ? 'Съедено ≈ ' + fmt(eaten) : 'Нет записей') : 'Съедено ≈ ' + fmt(eaten) + ' · вне плана'}</small></div>
        <span class="meal-target" aria-label="Цель ${fmt(meal.budget)} ккал">${fmt(meal.budget)}</span>
        <span class="meal-left${left < 0 ? ' over' : ''}" aria-label="${left < 0 ? 'Сверх цели' : 'Осталось'} ${fmt(Math.abs(left))} ккал">${left < 0 ? '−' : ''}${fmt(Math.abs(left))}</span>
        ${index < plan.length ? `<button type="button" class="icon-button transfer-button" data-transfer="${index}" title="Перенести остаток" aria-label="Перенести остаток: ${esc(meal.name)}" ${canTransfer ? '' : 'disabled'}>${icon('transfer')}</button>` : '<span></span>'}
      </article>`;
    }).join('');
    $('mealPlanTotal').textContent=`Всего ${fmt(Math.round(getState().goals.k))} ккал на выбранную дату.`;
    if($('meal')){const selected=$('meal').value;$('meal').innerHTML=options(selected)}
  }
  let editingDay='',draft=[],transferDay='',sourceName='';
  function readDraft(){draft=[...$('mealPlanRows').children].map(row=>({original:row.dataset.original,name:row.querySelector('[data-meal-name]').value.trim(),weight:Number(row.querySelector('[data-meal-budget]').value)}))}
  function showDraft(){
    $('mealPlanRows').innerHTML=draft.map((m,i)=>`<div class="meal-plan-row" data-original="${esc(m.original||'')}"><label>Название<input data-meal-name value="${esc(m.name)}" maxlength="40" required aria-label="Название приёма ${i+1}"></label><label>Ккал<input data-meal-budget value="${m.weight}" type="number" min="0" max="100000" step="1" required aria-label="Калории приёма ${i+1}"></label><button type="button" data-remove-meal="${i}" aria-label="Удалить приём ${i+1}">×</button></div>`).join('');showSum();
  }
  function showSum(){const total=draft.reduce((sum,m)=>sum+m.weight,0),goal=Math.round(getState().goals.k);$('mealPlanSum').textContent=`Распределено ${fmt(total)} из ${fmt(goal)} ккал. ${total<goal?'Ещё распределить '+fmt(goal-total)+' ккал.':total>goal?'Уберите '+fmt(total-goal)+' ккал.':'Бюджет соблюдён.'}`}
  $('editMealPlan').onclick=()=>{editingDay=date();draft=allocated().map(m=>({original:m.name,name:m.name,weight:m.budget}));$('mealPlanError').textContent='';showDraft();$('mealPlanDialog').showModal()};
  $('mealPlanRows').oninput=()=>{readDraft();showSum();$('mealPlanError').textContent=''};
  $('mealPlanRows').onclick=e=>{if(e.target.dataset.removeMeal!==undefined){readDraft();draft.splice(+e.target.dataset.removeMeal,1);showDraft()}};
  $('addMealRow').onclick=()=>{readDraft();if(draft.length>=8){$('mealPlanError').textContent='Можно добавить не больше 8 приёмов.';return}draft.push({name:draft.some(m=>m.name==='Полдник')?'':'Полдник',weight:0});showDraft()};
  $('cancelMealPlan').onclick=()=>$('mealPlanDialog').close();
  $('mealPlanForm').onsubmit=e=>{e.preventDefault();readDraft();const goal=Math.round(getState().goals.k);if(!validMealPlan(draft)||draft.some(m=>!Number.isInteger(m.weight))||draft.reduce((sum,m)=>sum+m.weight,0)!==goal){$('mealPlanError').textContent='Укажите уникальные названия и целые калории. Сумма должна совпадать с дневной целью.';return}const renames=Object.fromEntries(draft.filter(m=>m.original&&m.original!==m.name).map(m=>[m.original,m.name]));getState().entries=renameMealEntries(getState().entries,editingDay,renames);save(editingDay,draft.map(({name,weight})=>({name,weight})));$('mealPlanDialog').close()};
  $('mealCards').onclick=e=>{const button=e.target.closest('[data-transfer]');if(!button)return;const plan=allocated();sourceName=plan[+button.dataset.transfer].name;transferDay=date();const left=Math.floor(plan.find(m=>m.name===sourceName).budget-spent(sourceName));if(left<1)return;$('transferDescription').textContent=`Из приёма «${sourceName}» доступно ${fmt(left)} ккал по центральной оценке съеденного.`;$('transferAmount').value=left;$('transferAmount').max=left;const sourceIndex=plan.findIndex(m=>m.name===sourceName);const defaultTarget=plan[sourceIndex+1]?.name||plan.find(m=>m.name!==sourceName)?.name||'Полдник';$('transferTarget').innerHTML=names().filter(n=>n!==sourceName).map(n=>`<option value="${esc(n)}" ${n===defaultTarget?'selected':''}>${esc(n)}</option>`).join('');$('transferError').textContent='';$('transferDialog').showModal()};
  $('cancelTransfer').onclick=()=>$('transferDialog').close();
  $('transferForm').onsubmit=e=>{e.preventDefault();try{const plan=transferCalories(allocated(transferDay),sourceName,$('transferTarget').value,+$('transferAmount').value,spent(sourceName,transferDay));save(transferDay,plan);$('transferDialog').close()}catch(err){$('transferError').textContent=err.message}};
  function offerLunchAdjustment(day) {
    const adjustment = () => lunchAdjustment(allocated(day), spent('Обед',day), spent('Ужин',day));
    const proposal = adjustment();
    if (!proposal) return;
    const dialog = $('lunchAdjustment');
    $('lunchAdjustmentText').textContent = `Обед выше плана примерно на ${fmt(proposal.excess)} ккал. ` +
      `Можно перенести ${fmt(proposal.amount)} ккал из цели ужина в цель обеда. Цель ужина станет ${fmt(proposal.dinnerBudget)} ккал.`;
    $('lunchAdjustmentCancel').onclick = () => dialog.close();
    $('lunchAdjustmentApply').onclick = () => {
      const current = adjustment();
      if (current) save(day, transferCalories(allocated(day), 'Ужин', 'Обед', current.amount, spent('Ужин',day)));
      dialog.close();
    };
    dialog.showModal();
  }
  return {render,options,names,offerLunchAdjustment};
}
