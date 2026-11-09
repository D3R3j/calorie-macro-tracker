import {foods,defaults,estimate,totals} from './model.js';
import {calorieNeeds} from './needs.js';
import {mountMeals} from './meals-ui.js';
import {icon} from './icons.js';
import {mountNavigation} from './navigation.js';
import {validState,resizeEntry} from './data.js';
const $=id=>document.getElementById(id),keys=['k','p','f','c'],labels={k:'Калории',p:'Белки',f:'Жиры',c:'Углеводы'},unit=k=>k==='k'?'ккал':'г',fmt=n=>Math.round(Number(n.toFixed(8))).toLocaleString('ru-RU'),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderTheme(){const dark=document.documentElement.dataset.theme==='dark';$('themeToggle').innerHTML=icon(dark?'sun':'moon');$('themeToggle').setAttribute('aria-pressed',String(dark));$('themeToggle').setAttribute('aria-label',dark?'Включить светлую тему':'Включить тёмную тему');$('themeToggle').title=dark?'Светлая тема':'Тёмная тема';$('menuThemeText').textContent=dark?'Светлая тема':'Тёмная тема';$('menuThemeIcon').innerHTML=icon(dark?'sun':'moon');document.querySelector('meta[name="theme-color"]').content=dark?'#000000':'#f2f2f7';try{window.AndroidFiles?.setDarkMode?.(dark)}catch{}}
$('themeToggle').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('home-balance-theme',theme)}catch{$('status').textContent='Выбор темы действует до закрытия страницы: сохранение в браузере недоступно.'}renderTheme()};renderTheme();
const welcome=$('welcome');
welcome.addEventListener('close',()=>{try{localStorage.setItem('home-balance-welcome-seen','1')}catch{$('status').textContent='Браузер не разрешает сохранять настройки: знакомство может появиться снова.'}});
$('closeWelcome').onclick=$('startWelcome').onclick=()=>welcome.close();$('helpBtn').onclick=()=>{if($('appMenu').open)$('appMenu').close();welcome.showModal()};
let showWelcome=true;try{showWelcome=localStorage.getItem('home-balance-welcome-seen')!=='1'}catch{}
if(showWelcome)welcome.showModal();
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
let state={version:1,goals:{...defaults},entries:[]},items=[],last=null;
const valid=validState;
try{const saved=localStorage.getItem('home-balance-v1');if(saved){const parsed=JSON.parse(saved);if(!valid(parsed))throw Error();state=parsed}}catch{$('status').textContent='Не удалось прочитать сохранённые данные. Импортируйте резервную копию.'}
function persist(){try{localStorage.setItem('home-balance-v1',JSON.stringify(state));$('status').textContent=''}catch{$('status').textContent='Не удалось сохранить данные. Экспортируйте копию, прежде чем закрывать страницу.'}}
$('date').value=today();$('food').innerHTML=foods.map(f=>`<option value="${f.id}">${f.name}</option>`).join('');
function invalidate(){
  last=null;
  $('result').innerHTML='<p class="empty">Рассчитайте порцию, чтобы увидеть калории, БЖУ и диапазон оценки.</p>';
}
function renderItems(){
  $('ingredients').innerHTML = items.length ? items.map((i,n)=>`<div class="ingredient"><span>${foods[i.id].name}</span><select aria-label="Доля ${foods[i.id].name}" data-rank="${n}">${[[1,'Немного'],[3,'Много'],[6,'Основа']].map(([v,t])=>`<option value="${v}" ${v===i.rank?'selected':''}>${t}</option>`).join('')}</select><button type="button" data-remove="${n}" aria-label="Удалить ${foods[i.id].name}">×</button></div>`).join('') : '<p class="ingredient-empty">Ингредиенты пока не добавлены.</p>';
}
$('addFood').onclick=()=>{const id=+$('food').value;if(items.some(i=>i.id===id))return;items.push({id,rank:1});renderItems();invalidate()};
$('ingredients').onchange=e=>{if(e.target.dataset.rank!==undefined){items[+e.target.dataset.rank].rank=+e.target.value;invalidate()}};
$('ingredients').onclick=e=>{if(e.target.dataset.remove!==undefined){items.splice(+e.target.dataset.remove,1);renderItems();invalidate()}};
$('dishForm').oninput=invalidate;$('oil').onchange=()=>{$('oilLabel').hidden=$('oil').value!=='known';invalidate()};
$('dishForm').onsubmit = (event) => {
  event.preventDefault();
  $('error').textContent = '';

  try {
    const input = {
      weight: Number($('weight').value),
      portion: Number($('portion').value),
      items: structuredClone(items),
      method: $('method').value,
      oil: $('oil').value,
      oilGrams: Number($('oilGrams').value),
      water: Number($('water').value),
    };
    const result = estimate(input);
    last = {
      id: crypto.randomUUID(),
      name: $('name').value.trim() || 'Домашнее блюдо',
      date: $('date').value || today(),
      portion: input.portion,
      result,
      input,
    };

    const energy = result.k;
    const delta = Math.max(energy.mid - energy.low, energy.high - energy.mid);
    const spread = fmt(delta) === '0'
      ? 'Разброс модели меньше 1 ккал'
      : `Разброс модели до ±${fmt(delta)} ккал`;
    const macros = keys.slice(1).map((key) => {
      const { low, mid, high } = result[key];
      return `<div>
        <span>${labels[key]}</span>
        <strong>${fmt(mid)} г</strong>
        ${fmt(low) === fmt(high) ? '' : `<small>${fmt(low)}–${fmt(high)} г</small>`}
      </div>`;
    }).join('');

    $('result').innerHTML = `
      <div class="result-main">
        <span class="result-dish">${esc(last.name)} · ${fmt(input.portion)} г</span>
        <div class="big">≈ ${fmt(energy.mid)} <small>ккал</small></div>
        ${fmt(energy.low) === fmt(energy.high) ? '' : `<div class="range">Диапазон ${fmt(energy.low)}–${fmt(energy.high)} ккал</div>`}
        <p>${spread}</p>
      </div>
      <div class="macro-result">${macros}</div>
      <p class="notice">Это оценка по составу. Реальное значение может отличаться.</p>
      <p class="hint">На 100 г: около ${fmt(energy.mid / input.portion * 100)} ккал. Всё блюдо: около ${fmt(energy.mid / input.portion * input.weight)} ккал.</p>
      <label>Приём пищи<select id="meal">${mealUI.options()}</select></label>
      <button type="button" id="saveEntry" class="primary">Добавить в дневник</button>`;

    $('saveEntry').onclick = () => {
      if (!last) return;
      state.entries.push({ ...last, date: $('date').value || today(), meal: $('meal').value });
      persist();
      renderDay();
      last = null;
      $('saveEntry').disabled = true;
      $('saveEntry').textContent = 'Порция добавлена';
      navigation.showScreen('diary');
    };

    const resultPanel = $('result').closest('.result-card');
    resultPanel.focus({ preventScroll: true });
    if (matchMedia('(max-width: 759px)').matches) resultPanel.scrollIntoView({ block: 'start' });
  } catch (error) {
    $('error').textContent = error.message;
  }
};
function renderBudget(consumed, goals, hasEntries) {
  const remaining = goals.k - consumed.k.mid;
  const fraction = consumed.k.mid / goals.k;
  const consumedPercent = Math.min(100, fraction * 100);
  let band = 'target';
  if (fraction < 0.4) band = 'low';
  else if (fraction < 0.8) band = 'mid';
  else if (fraction > 1.1) band = 'over';
  const progress = fraction.toLocaleString('ru-RU', { style: 'percent', maximumFractionDigits: 1 });
  const macros = keys.slice(1).map((key) => {
    const left = goals[key] - consumed[key].mid;
    const percent = Math.min(100, consumed[key].mid / goals[key] * 100);
    const low = fmt(goals[key] - consumed[key].high);
    const high = fmt(goals[key] - consumed[key].low);
    return `<div class="macro-cell ${key}">
      <span class="macro-name">${icon(({p:'protein', f:'fat', c:'carbs'})[key])}${labels[key]}</span>
      <div class="macro-value"><strong>${fmt(consumed[key].mid)}</strong><span> / ${fmt(goals[key])} г</span></div>
      <div class="macro-track" aria-hidden="true"><i style="width:${percent}%"></i></div>
      <small>${left >= 0 ? 'Осталось' : 'Сверх'} ${fmt(Math.abs(left))} г</small>
      ${low === high ? '' : `<small class="macro-range">Оценка остатка ${low}…${high} г</small>`}
    </div>`;
  }).join('');
  const low = fmt(goals.k - consumed.k.high);
  const high = fmt(goals.k - consumed.k.low);
  const range = low === high ? low : `${low}…${high}`;
  $('budget').innerHTML = `
    <article class="energy-card" data-band="${band}">
      <div class="energy-heading"><span>${icon('flame')} Калории</span><span>${progress} дневной цели</span></div>
      <p class="energy-label">${remaining >= 0 ? 'Осталось' : 'Сверх цели'}</p>
      <p class="energy-number">${fmt(Math.abs(remaining))} <small>ккал</small></p>
      <div class="energy-scale" aria-hidden="true"><i style="width:${consumedPercent}%"></i></div>
      <div class="energy-caption"><span>Съедено ${hasEntries ? '≈ ' : ''}<b>${fmt(consumed.k.mid)}</b></span><span>Цель <b>${fmt(goals.k)} ккал</b></span></div>
      ${hasEntries ? `<p class="energy-range">Оценка остатка: ${range} ккал</p>` : ''}
    </article>
    <section class="macro-panel" aria-label="Белки, жиры и углеводы">${macros}</section>`;
}
function renderDay(){
  if(!$('date').value)$('date').value=today();$('diaryDate').value=$('date').value;
  $('pageDate').textContent=new Date($('date').value+'T12:00:00').toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
  const entries=state.entries.filter(e=>e.date===$('date').value),t=totals(entries);
  renderBudget(t,state.goals,entries.length>0);
  $('entryCount').textContent=entries.length+' '+({one:'запись',few:'записи',many:'записей',other:'записи'}[new Intl.PluralRules('ru').select(entries.length)]);
  $('diaryTotal').innerHTML='<span>За выбранный день</span><strong>≈ '+fmt(t.k.mid)+' <small>ккал</small></strong><p>'+fmt(t.k.low)+'–'+fmt(t.k.high)+' ккал · Б '+fmt(t.p.mid)+' / Ж '+fmt(t.f.mid)+' / У '+fmt(t.c.mid)+'</p>';
  const groups=[...new Set(entries.map(e=>e.meal||'Приём пищи'))];
  $('entries').innerHTML=entries.length?groups.map(meal=>'<div class="diary-group"><h3>'+esc(meal)+'</h3>'+entries.filter(e=>(e.meal||'Приём пищи')===meal).map(e=>'<article class="entry"><div class="entry-name"><strong>'+esc(e.name)+'</strong><small>'+fmt(e.portion)+' г · '+fmt(e.result.k.low)+'–'+fmt(e.result.k.high)+' ккал</small></div><div><strong>≈ '+fmt(e.result.k.mid)+' ккал</strong><small>Б '+fmt(e.result.p.mid)+' / Ж '+fmt(e.result.f.mid)+' / У '+fmt(e.result.c.mid)+'</small></div><div class="entry-actions"><button type="button" data-edit="'+esc(e.id)+'" aria-label="Изменить '+esc(e.name)+'">Изменить</button><button type="button" data-delete="'+esc(e.id)+'" aria-label="Удалить '+esc(e.name)+'">×</button></div></article>').join('')+'</div>').join(''):'<div class="empty-diary"><p>На этот день ещё нет записей.</p><button type="button" class="quiet" data-open-screen="dish">Рассчитать и добавить порцию</button></div>';
  mealUI.render();
}
let pendingDeletion=null,deleteTimer=null,editingId=null;
function openEntry(id){const e=state.entries.find(e=>e.id===id);if(!e)return;editingId=id;$('entryName').value=e.name;$('entryPortion').value=e.portion;$('entryPortion').max=e.input?.weight??100000;$('entryMeal').innerHTML=mealUI.options(e.meal||'Приём пищи');if(![...$('entryMeal').options].some(o=>o.value===e.meal))$('entryMeal').add(new Option(e.meal||'Приём пищи',e.meal||'Приём пищи',true,true));$('entryError').textContent='';$('entryDialog').showModal()}
$('date').onchange=renderDay;$('diaryDate').onchange=()=>{$('date').value=$('diaryDate').value||today();renderDay()};
$('entries').onclick=e=>{const edit=e.target.closest('[data-edit]'),remove=e.target.closest('[data-delete]');if(edit){openEntry(edit.dataset.edit);return}if(remove){const index=state.entries.findIndex(x=>x.id===remove.dataset.delete);if(index<0)return;pendingDeletion={entry:state.entries[index],index};state.entries.splice(index,1);persist();renderDay();$('snackbarText').textContent='Запись удалена';$('snackbar').hidden=false;clearTimeout(deleteTimer);deleteTimer=setTimeout(()=>{pendingDeletion=null;$('snackbar').hidden=true},15000)}};
$('undoDelete').onclick=()=>{if(!pendingDeletion)return;state.entries.splice(Math.min(pendingDeletion.index,state.entries.length),0,pendingDeletion.entry);pendingDeletion=null;clearTimeout(deleteTimer);$('snackbar').hidden=true;persist();renderDay()};
$('cancelEntry').onclick=()=>$('entryDialog').close();
$('entryForm').onsubmit=e=>{e.preventDefault();try{const index=state.entries.findIndex(e=>e.id===editingId);if(index<0)throw Error('Запись больше не существует.');state.entries[index]=resizeEntry(state.entries[index],{name:$('entryName').value,portion:+$('entryPortion').value,meal:$('entryMeal').value});persist();renderDay();$('entryDialog').close()}catch(err){$('entryError').textContent=err.message}};

$('goalBtn').onclick=()=>{$('goalFields').innerHTML=keys.map(k=>`<label>${labels[k]}, ${unit(k)}<input name="${k}" type="number" min="1" max="100000" required value="${state.goals[k]}"></label>`).join('');$('goals').showModal()};$('cancelGoals').onclick=()=>$('goals').close();$('goalsForm').onsubmit=e=>{e.preventDefault();const data=new FormData(e.target);for(const k of keys)state.goals[k]=+data.get(k);persist();renderDay();$('goals').close()};
$('export').onclick=()=>{const json=JSON.stringify(state,null,2);if(window.AndroidFiles?.exportJson){window.AndroidFiles.exportJson(json);return}const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='domashniy-balans-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
function confirmImport(data){$('importSummary').textContent='В копии '+data.entries.length+' записей. Цель: '+fmt(data.goals.k)+' ккал в день.';const dialog=$('importDialog');dialog.returnValue='';dialog.showModal();return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='apply'),{once:true}))}
$('applyImport').onclick=()=>$('importDialog').close('apply');$('cancelImport').onclick=()=>$('importDialog').close('cancel');
async function importData(text){
  try{if(typeof text!=='string'||text.length>10000000)throw Error('Слишком большой файл.');const data=JSON.parse(text);if(!valid(data))throw Error('Неподходящий формат резервной копии.');navigation.showScreen('diary');if(!(await confirmImport(data)))return false;state=data;pendingDeletion=null;$('snackbar').hidden=true;persist();renderDay();restoreNeedsProfile();return true}catch(err){$('status').textContent='Импорт не выполнен: '+err.message;return false}
}
$('import').addEventListener('click',e=>{if(window.AndroidFiles?.importJson){e.preventDefault();window.AndroidFiles.importJson()}});
$('import').onchange=async e=>{try{const file=e.target.files[0];if(file)await importData(await file.text())}finally{e.target.value=''}};

let needsResult=null;
function clearNeedsResult(){needsResult=null;$('needsResult').hidden=true;$('needsPlaceholder').hidden=false;$('needsError').textContent=''}
function restoreNeedsProfile(){const p=state.needsProfile;for(const key of ['height','weight','age','sex','activity'])$('needs-'+key).value=p?.[key]??'';clearNeedsResult()}
restoreNeedsProfile();
$('needsForm').addEventListener('input',clearNeedsResult);
$('needsForm').addEventListener('change',clearNeedsResult);
$('needsForm').onsubmit=e=>{e.preventDefault();clearNeedsResult();try{
  const profile={height:+$('needs-height').value,weight:+$('needs-weight').value,age:+$('needs-age').value,sex:$('needs-sex').value,activity:+$('needs-activity').value};
  needsResult=calorieNeeds(profile);state.needsProfile=profile;persist();
  $('needsResting').textContent=fmt(needsResult.resting)+' ккал';
  $('needsDaily').textContent=fmt(needsResult.rounded)+' ккал / день';
  $('needsApply').disabled=false;$('needsApply').textContent='Применить к дневной цели';
  $('needsResult').hidden=false;$('needsPlaceholder').hidden=true;
}catch(err){$('needsError').textContent=err.message}};
$('needsApply').onclick=()=>{if(!needsResult)return;state.goals.k=needsResult.rounded;persist();renderDay();$('needsApply').disabled=true;$('needsApply').textContent='✓ Цель по калориям обновлена'};
const mealUI=mountMeals({getState:()=>state,persist,refresh:renderDay,fmt,esc});
const navigation=mountNavigation();window.BalanceApp={...navigation,importData};renderItems();renderDay();try{window.AndroidFiles?.pageReady?.()}catch{}


