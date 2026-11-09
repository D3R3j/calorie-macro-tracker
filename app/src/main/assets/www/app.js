import {foods,defaults,estimate,totals,validCustomFood} from './model.js';
import {calorieNeeds} from './needs.js';
import {mountMeals} from './meals-ui.js';
import {icon} from './icons.js';
import {mountNavigation} from './navigation.js';
import {validState,resizeEntry} from './data.js';
import {mountIngredientRows,hasEditableIngredients} from './ingredients-ui.js';
import {mountPickers} from './pickers.js';
import {dishTypes,findFoods} from './recipes.js';
const $=id=>document.getElementById(id),keys=['k','p','f','c'],labels={k:'Калории',p:'Белки',f:'Жиры',c:'Углеводы'},unit=k=>k==='k'?'ккал':'г',fmt=n=>Math.round(Number(n.toFixed(8))).toLocaleString('ru-RU'),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderTheme(){const dark=document.documentElement.dataset.theme==='dark';$('themeToggle').innerHTML=icon(dark?'sun':'moon');$('themeToggle').setAttribute('aria-pressed',String(dark));$('themeToggle').setAttribute('aria-label',dark?'Включить светлую тему':'Включить тёмную тему');$('themeToggle').title=dark?'Светлая тема':'Тёмная тема';$('menuThemeText').textContent=dark?'Светлая тема':'Тёмная тема';$('menuThemeIcon').innerHTML=icon(dark?'sun':'moon');document.querySelector('meta[name="theme-color"]').content=dark?'#000000':'#f2f2f7';try{window.AndroidFiles?.setDarkMode?.(dark)}catch{}}
$('themeToggle').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('home-balance-theme',theme)}catch{$('status').textContent='Выбор темы действует до закрытия страницы: сохранение в браузере недоступно.'}renderTheme()};renderTheme();
const welcome=$('welcome');
welcome.addEventListener('close',()=>{try{localStorage.setItem('home-balance-welcome-seen','1')}catch{$('status').textContent='Браузер не разрешает сохранять настройки: знакомство может появиться снова.'}});
$('closeWelcome').onclick=$('startWelcome').onclick=()=>welcome.close();$('helpBtn').onclick=()=>{if($('appMenu').open)$('appMenu').close();welcome.showModal()};
let showWelcome=true;try{showWelcome=localStorage.getItem('home-balance-welcome-seen')!=='1'}catch{}
if(showWelcome)welcome.showModal();
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
let state={version:1,goals:{...defaults},entries:[]},last=null;
let syncPickers = () => {};
const valid=validState;
try{const saved=localStorage.getItem('home-balance-v1');if(saved){const parsed=JSON.parse(saved);if(!valid(parsed))throw Error();state=parsed}}catch{$('status').textContent='Не удалось прочитать сохранённые данные. Импортируйте резервную копию.'}
function persist(){try{localStorage.setItem('home-balance-v1',JSON.stringify(state));$('status').textContent=''}catch{$('status').textContent='Не удалось сохранить данные. Экспортируйте копию, прежде чем закрывать страницу.'}}
$('date').value=today();
function invalidate(){
  last=null;
  $('error').textContent='';
  $('result').innerHTML='<p class="empty">Рассчитайте порцию, чтобы увидеть калории, БЖУ и диапазон оценки.</p>';
}
const gramSetting = $('allowIngredientGrams');
const allowGrams = () => gramSetting.checked;
try { gramSetting.checked = localStorage.getItem('home-balance-ingredient-grams') === '1'; } catch {}
let recipeEdited = false;
const dishIngredients = mountIngredientRows($('ingredients'), {allowGrams, esc, onChange: invalidate});
const entryIngredients = mountIngredientRows($('entryIngredients'), {
  allowGrams,
  removable: false,
  esc,
  onChange: () => { recipeEdited = true; $('entryError').textContent = ''; },
});
$('entryIngredients').addEventListener('invalid', () => { $('entryRecipe').open = true; }, true);
function renderIngredientSetting() {
  $('recipeInputHelp').textContent = allowGrams()
    ? 'Для каждого продукта выберите долю, граммы или штуки, если они доступны.'
    : 'Для некоторых продуктов можно указать штуки. Граммы включаются в настройках.';
}
renderIngredientSetting();
gramSetting.onchange = () => {
  try { localStorage.setItem('home-balance-ingredient-grams', gramSetting.checked ? '1' : '0'); }
  catch { $('status').textContent = 'Выбор способа ввода сохранится до закрытия приложения.'; }
  dishIngredients.render();
  entryIngredients.render();
  renderIngredientSetting();
};
$('recipeSettingsClose').onclick = () => $('recipeSettings').close();
let recipeStep = 0;
let recipeType = '';
let editedRecipeId = null;
let selectedRecipe = null;
let recipeDate = '';
const recipeForm = $('dishForm');
const recipes = () => state.recipes ?? [];
const typeName = type => dishTypes.find(([key]) => key === type)?.[1] ?? 'Другое';
$('recipeFilter').innerHTML = '<option value="">Все блюда</option>' +
  dishTypes.map(([key, name]) => `<option value="${key}">${name}</option>`).join('');
$('recipeTypes').innerHTML = dishTypes.map(([key, name]) =>
  `<button type="button" class="secondary" data-type="${key}" aria-pressed="false">${name}</button>`).join('');

function renderRecipeList() {
  const filter = $('recipeFilter').value;
  const visible = recipes().filter(recipe => !filter || recipe.type === filter);
  $('recipeList').innerHTML = visible.length ? visible.map(recipe => `
    <article class="recipe-card">
      <div><p class="hint">${typeName(recipe.type)}</p><h3>${esc(recipe.name)}</h3>
      <p class="hint">${fmt(recipe.input.weight)} г · ≈ ${fmt(recipe.result.k.mid / recipe.input.weight * 100)} ккал на 100 г</p></div>
      <div class="actions"><button type="button" class="primary" data-add-recipe="${esc(recipe.id)}">Записать порцию</button>
      <button type="button" class="quiet" data-edit-recipe="${esc(recipe.id)}">Изменить</button>
      <button type="button" class="quiet" data-delete-recipe="${esc(recipe.id)}">Удалить</button></div>
    </article>`).join('') : `<p class="empty">${filter ? 'Блюд этого типа пока нет.' : 'Здесь будут ваши блюда. Добавьте первое, чтобы записывать порции повторно.'}</p>`;
}

function showRecipeStep(step) {
  recipeStep = step;
  for (const panel of recipeForm.querySelectorAll('[data-recipe-step]')) panel.hidden = Number(panel.dataset.recipeStep) !== step;
  $('recipeStepCount').textContent = 'Шаг ' + (step + 1) + ' из 3';
  $('recipeBack').hidden = step === 0;
  $('recipeNext').textContent = step === 2 ? 'Рассчитать блюдо' : 'Далее';
  $('error').textContent = '';
  $('recipeTypes').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.type === recipeType)));
  if (step === 1) renderSuggestions();
  window.scrollTo(0,0);
}

function openRecipe(recipe) {
  editedRecipeId = recipe?.id ?? null;
  recipeType = recipe?.type ?? '';
  recipeForm.reset();
  $('recipeTitle').textContent = recipe ? 'Изменить блюдо' : 'Новое блюдо';
  $('name').value = recipe?.name ?? '';
  $('weight').value = recipe?.input.weight ?? '';
  $('method').value = recipe?.input.method ?? 'stew';
  $('oil').value = recipe?.input.oil ?? 'unknown';
  $('oilGrams').value = recipe?.input.oilGrams ?? 15;
  $('water').value = recipe?.input.water ?? 0;
  $('oilLabel').hidden = $('oil').value !== 'known';
  dishIngredients.setItems(hasEditableIngredients(recipe?.input) ? recipe.input.items : []);
  invalidate();
  $('recipeLibrary').hidden = true;
  recipeForm.hidden = false;
  showRecipeStep(0);
  syncPickers();
}

function closeRecipe() {
  recipeForm.hidden = true;
  $('recipeLibrary').hidden = false;
  last = null;
  renderRecipeList();
}

function renderSuggestions() {
  const query = $('foodSearch').value;
  const used = new Set(dishIngredients.getItems().map(item => item.id));
  const matches = findFoods([...foods, ...(state.customFoods ?? [])], query, recipeType).filter(({food}) => !used.has(food.id));
  const groups = [...new Set(matches.map(item => item.category))];
  $('foodSuggestions').innerHTML = groups.map(category => `<section>
    <p class="hint">${esc(category)}</p>
    ${matches.filter(item => item.category === category).map(({food}) =>
      `<button type="button" class="picker-option" data-food-id="${esc(food.id)}">${esc(food.name)}</button>`).join('')}
  </section>`).join('') || (query.trim() ? '<p class="hint">Нет новых совпадений. Можно добавить свой ингредиент.</p>' : '');
}
$('foodSearch').oninput = renderSuggestions;
$('foodSuggestions').onclick = event => {
  const id = event.target.closest('[data-food-id]')?.dataset.foodId;
  const food = id?.startsWith('custom-') ? state.customFoods?.find(item => item.id === id) : foods[Number(id)];
  if (!food) return;
  dishIngredients.add(food);
  $('foodSearch').value = '';
  renderSuggestions();
  $('foodSearch').focus();
};
$('recipeTypes').onclick = event => {
  const type = event.target.closest('[data-type]')?.dataset.type;
  if (!type) return;
  recipeType = type;
  if (!editedRecipeId) {
    const noHeat = ['shake','smoothie','salad'].includes(type);
    $('method').value = noHeat ? 'raw' : 'stew';
    $('oil').value = noHeat ? 'none' : 'unknown';
    $('oilLabel').hidden = true;
    syncPickers();
  }
  invalidate();
  showRecipeStep(1);
  $('name').focus();
};
$('newRecipe').onclick = () => openRecipe();
$('recipeFilter').onchange = renderRecipeList;
$('recipeCancel').onclick = closeRecipe;
$('recipeBack').onclick = () => showRecipeStep(recipeStep - 1);
$('dishForm').oninput = invalidate;
$('oil').onchange = () => { $('oilLabel').hidden = $('oil').value !== 'known'; invalidate(); };

$('customFood').onclick = () => {
  $('customFoodForm').reset();
  $('customFoodName').value = $('foodSearch').value.trim();
  $('customFoodError').textContent = '';
  $('customFoodDialog').showModal();
};
$('customFoodCancel').onclick = () => $('customFoodDialog').close();
$('customFoodForm').onsubmit = event => {
  event.preventDefault();
  const form = new FormData(event.target);
  const food = {
    id: 'custom-' + crypto.randomUUID(), name: $('customFoodName').value.trim(),
    p: Number(form.get('p')), f: Number(form.get('f')), c: Number(form.get('c')),
  };
  if (!validCustomFood(food)) {
    $('customFoodError').textContent = 'Проверьте название и БЖУ. Сумма значений должна помещаться в 100 г продукта.';
    return;
  }
  if ($('keepCustomFood').checked) {
    if ((state.customFoods?.length ?? 0) >= 500) {
      $('customFoodError').textContent = 'В «Моих продуктах» уже 500 записей. Снимите отметку, чтобы добавить только в блюдо.';
      return;
    }
    state.customFoods = [...(state.customFoods ?? []), food];
    persist();
  }
  dishIngredients.add(food);
  $('foodSearch').value = '';
  renderSuggestions();
  $('customFoodDialog').close();
};

$('recipeList').onclick = event => {
  const button = event.target.closest('button');
  if (!button) return;
  const {editRecipe, deleteRecipe, addRecipe} = button.dataset;
  const recipe = recipes().find(item => item.id === (editRecipe ?? deleteRecipe ?? addRecipe));
  if (!recipe) return;
  if (editRecipe) { openRecipe(recipe); return; }
  selectedRecipe = recipe;
  if (deleteRecipe) {
    $('recipeDeleteName').textContent = recipe.name;
    $('recipeDeleteDialog').showModal();
    return;
  }
  recipeDate = $('date').value || today();
  $('recipePortionTitle').textContent = recipe.name;
  $('recipePortionDate').textContent = 'Дата записи: ' + new Date(recipeDate + 'T12:00:00').toLocaleDateString('ru-RU');
  $('recipePortion').value = '';
  $('recipePortion').max = recipe.input.weight;
  $('recipeMeal').innerHTML = mealUI.options();
  $('recipePortionError').textContent = '';
  syncPickers();
  $('recipePortionDialog').showModal();
};
$('recipeDeleteCancel').onclick = () => $('recipeDeleteDialog').close();
$('recipeDeleteApply').onclick = () => {
  state.recipes = recipes().filter(recipe => recipe.id !== selectedRecipe?.id);
  persist();
  renderRecipeList();
  $('recipeDeleteDialog').close();
};
$('recipePortionCancel').onclick = () => $('recipePortionDialog').close();
$('recipePortionForm').onsubmit = event => {
  event.preventDefault();
  try {
    if (!selectedRecipe) return;
    const recipe = selectedRecipe;
    const entry = resizeEntry({
      ...recipe, id: crypto.randomUUID(), date: recipeDate, portion: recipe.input.weight,
    }, {name:recipe.name, portion:Number($('recipePortion').value), meal:$('recipeMeal').value});
    state.entries.push(entry);
    persist();
    renderDay();
    $('recipePortionDialog').close();
    navigation.showScreen('diary');
  } catch (error) { $('recipePortionError').textContent = error.message; }
};

recipeForm.noValidate = true;
recipeForm.onsubmit = event => {
  event.preventDefault();
  if (!recipeType) { $('error').textContent = 'Выберите тип блюда.'; return; }
  const active = recipeForm.querySelector('[data-recipe-step="' + recipeStep + '"]');
  for (const input of active.querySelectorAll('input')) {
    if (!input.closest('[hidden]') && !input.reportValidity()) {
      input.closest('details')?.setAttribute('open', '');
      $('error').textContent = 'Проверьте обязательные поля и значения на этом шаге.';
      return;
    }
  }
  if (recipeStep === 1 && (!$('name').value.trim() || !dishIngredients.getItems().length)) {
    $('error').textContent = 'Введите название и добавьте хотя бы один ингредиент.';
    return;
  }
  if (recipeStep < 2) { showRecipeStep(recipeStep + 1); return; }
  try {
    const weight = Number($('weight').value);
    const input = {
      weight, portion: weight, items: dishIngredients.getItems(),
      method: $('method').value, oil: $('oil').value,
      oilGrams: Number($('oilGrams').value), water: Number($('water').value),
    };
    const result = estimate(input);
    last = {id: editedRecipeId ?? crypto.randomUUID(), type: recipeType, name:$('name').value.trim(), input, result};
    const energy = result.k;
    const macros = keys.slice(1).map(key => {
      const band = result[key];
      return `<div><span>${labels[key]}</span><strong>${fmt(band.mid)} г</strong>${fmt(band.low) === fmt(band.high) ? '' : `<small>${fmt(band.low)}–${fmt(band.high)} г</small>`}</div>`;
    }).join('');
    $('result').innerHTML = `
      <div class="result-main"><span>Всё блюдо · ${fmt(weight)} г</span>
      <div class="big">≈ ${fmt(energy.mid)} <small>ккал</small></div>
      <p>${fmt(energy.low) === fmt(energy.high) ? 'Разброс модели меньше 1 ккал' : 'Диапазон ' + fmt(energy.low) + '–' + fmt(energy.high) + ' ккал'} · ≈ ${fmt(energy.mid / weight * 100)} ккал на 100 г</p></div>
      <div class="macro-result">${macros}</div>
      <button type="button" id="saveRecipe" class="primary">Сохранить блюдо</button>`;
    $('saveRecipe').onclick = () => {
      if (!last) return;
      if (!editedRecipeId && recipes().length >= 500) { $('error').textContent = 'В книге уже 500 блюд.'; return; }
      state.recipes = editedRecipeId ? recipes().map(recipe => recipe.id === editedRecipeId ? last : recipe) : [...recipes(), last];
      persist();
      $('recipeFilter').value = '';
      closeRecipe();
      syncPickers();
      $('newRecipe').focus();
    };
    $('saveRecipe').focus();
  } catch (error) { $('error').textContent = error.message; }
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
  syncPickers();
}
let pendingDeletion=null,deleteTimer=null,editingId=null;
function openEntry(id) {
  const entry = state.entries.find(item => item.id === id);
  if (!entry) return;
  editingId = id;
  $('entryName').value = entry.name;
  $('entryPortion').value = entry.portion;
  $('entryPortion').max = entry.input?.weight ?? 100000;
  const meal = entry.meal || 'Приём пищи';
  $('entryMeal').innerHTML = mealUI.options(meal);
  if (!$('entryMeal').value || ![...$('entryMeal').options].some(option => option.value === meal)) {
    $('entryMeal').add(new Option(meal, meal, true, true));
  }
  const editable = hasEditableIngredients(entry.input);
  $('entryRecipe').hidden = !editable;
  $('entryRecipe').open = false;
  $('entryRecipeMass').textContent = editable ? 'Готовое блюдо: ' + entry.input.weight + ' г' : '';
  entryIngredients.setItems(editable ? entry.input.items : []);
  recipeEdited = false;
  $('entryError').textContent = '';
  syncPickers();
  $('entryDialog').showModal();
}
$('date').onchange=renderDay;$('diaryDate').onchange=()=>{$('date').value=$('diaryDate').value||today();renderDay()};
$('entries').onclick=e=>{const edit=e.target.closest('[data-edit]'),remove=e.target.closest('[data-delete]');if(edit){openEntry(edit.dataset.edit);return}if(remove){const index=state.entries.findIndex(x=>x.id===remove.dataset.delete);if(index<0)return;pendingDeletion={entry:state.entries[index],index};state.entries.splice(index,1);persist();renderDay();$('snackbarText').textContent='Запись удалена';$('snackbar').hidden=false;clearTimeout(deleteTimer);deleteTimer=setTimeout(()=>{pendingDeletion=null;$('snackbar').hidden=true},15000)}};
$('undoDelete').onclick=()=>{if(!pendingDeletion)return;state.entries.splice(Math.min(pendingDeletion.index,state.entries.length),0,pendingDeletion.entry);pendingDeletion=null;clearTimeout(deleteTimer);$('snackbar').hidden=true;persist();renderDay()};
$('cancelEntry').onclick=()=>$('entryDialog').close();
$('entryForm').onsubmit = event => {
  event.preventDefault();
  try {
    const index = state.entries.findIndex(entry => entry.id === editingId);
    if (index < 0) throw Error('Запись больше не существует.');
    const entry = resizeEntry(state.entries[index], {
      name: $('entryName').value,
      portion: Number($('entryPortion').value),
      meal: $('entryMeal').value,
    });
    if (recipeEdited) {
      entry.input.items = entryIngredients.getItems();
      entry.result = estimate(entry.input);
    }
    state.entries[index] = entry;
    persist();
    renderDay();
    $('entryDialog').close();
  } catch (error) {
    $('entryError').textContent = error.message;
  }
};

$('goalBtn').onclick=()=>{$('goalFields').innerHTML=keys.map(k=>`<label>${labels[k]}, ${unit(k)}<input name="${k}" type="number" min="1" max="100000" required value="${state.goals[k]}"></label>`).join('');$('goals').showModal()};$('cancelGoals').onclick=()=>$('goals').close();$('goalsForm').onsubmit=e=>{e.preventDefault();const data=new FormData(e.target);for(const k of keys)state.goals[k]=+data.get(k);persist();renderDay();$('goals').close()};
$('export').onclick=()=>{const json=JSON.stringify(state,null,2);if(window.AndroidFiles?.exportJson){window.AndroidFiles.exportJson(json);return}const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='domashniy-balans-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
function confirmImport(data){$('importSummary').textContent='В копии '+data.entries.length+' записей. Цель: '+fmt(data.goals.k)+' ккал в день.';const dialog=$('importDialog');dialog.returnValue='';dialog.showModal();return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='apply'),{once:true}))}
$('applyImport').onclick=()=>$('importDialog').close('apply');$('cancelImport').onclick=()=>$('importDialog').close('cancel');
async function importData(text){
  try{if(typeof text!=='string'||text.length>10000000)throw Error('Слишком большой файл.');const data=JSON.parse(text);if(!valid(data))throw Error('Неподходящий формат резервной копии.');navigation.showScreen('diary');if(!(await confirmImport(data)))return false;state=data;closeRecipe();pendingDeletion=null;$('snackbar').hidden=true;persist();renderDay();restoreNeedsProfile();return true}catch(err){$('status').textContent='Импорт не выполнен: '+err.message;return false}
}
$('import').addEventListener('click',e=>{if(window.AndroidFiles?.importJson){e.preventDefault();window.AndroidFiles.importJson()}});
$('import').onchange=async e=>{try{const file=e.target.files[0];if(file)await importData(await file.text())}finally{e.target.value=''}};

let needsResult=null;
function clearNeedsResult(){needsResult=null;$('needsResult').hidden=true;$('needsPlaceholder').hidden=false;$('needsError').textContent=''}
function restoreNeedsProfile(){const p=state.needsProfile;for(const key of ['height','weight','age','sex','activity'])$('needs-'+key).value=p?.[key]??'';clearNeedsResult();syncPickers()}
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
const navigation=mountNavigation({onScreen(screen){if(screen==='dish'&&recipeForm.hidden&&!recipes().length)openRecipe();},onBack(){if(recipeForm.hidden)return false;if(recipeStep>0)showRecipeStep(recipeStep-1);else closeRecipe();return true;}});window.BalanceApp={...navigation,importData};syncPickers=mountPickers();renderRecipeList();renderDay();try{window.AndroidFiles?.pageReady?.()}catch{}


