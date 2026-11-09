import {foods} from './model.js';

const modes = {rank: 'Доля', pieces: 'Штуки', grams: 'Граммы'};
const ranks = [[1, 'Немного'], [3, 'Много'], [6, 'Основа']];

export function mountIngredientRows(root, {allowGrams, onChange, removable = true}) {
  let items = [];

  function render() {
    root.innerHTML = items.length
      ? items.map((item, index) => {
          const food = foods[item.id];
          const mode = item.mode ?? 'rank';
          const available = ['rank'];
          if (food.pieceGrams) available.push('pieces');
          if (allowGrams() || mode === 'grams') available.push('grams');
          const modeField = available.length > 1
            ? `<select data-mode="${index}" aria-label="Способ ввода: ${food.name}">${available.map(value =>
                `<option value="${value}" ${mode === value ? 'selected' : ''}>${modes[value]}</option>`
              ).join('')}</select>`
            : '';
          const amount = Number.isFinite(item.amount) ? item.amount : '';
          const quantity = mode === 'rank'
            ? `<select aria-label="Доля ${food.name}" data-rank="${index}">${ranks.map(([value, title]) =>
                `<option value="${value}" ${item.rank === value ? 'selected' : ''}>${title}</option>`
              ).join('')}</select>`
            : `<input type="number" required aria-label="${mode === 'pieces' ? 'Штук' : 'Граммов'}: ${food.name}" data-amount="${index}" value="${amount}"
                min="${mode === 'pieces' ? '1' : '0.1'}" max="100000" step="${mode === 'pieces' ? '1' : '0.1'}"
                inputmode="${mode === 'pieces' ? 'numeric' : 'decimal'}" placeholder="${mode === 'pieces' ? 'Шт.' : 'Граммы'}">`;
          return `<div class="ingredient">
            <div class="ingredient-name"><strong>${food.name}</strong>
              ${mode === 'pieces' ? `<small>1 шт. ≈ ${food.pieceGrams} г</small>` : ''}
            </div>
            ${removable ? `<button type="button" data-remove-ingredient="${index}" aria-label="Удалить ${food.name}">×</button>` : ''}
            <div class="ingredient-quantity">${modeField}${quantity}</div>
          </div>`;
        }).join('')
      : '<p class="ingredient-empty">Ингредиенты пока не добавлены.</p>';
  }

  root.addEventListener('change', event => {
    const control = event.target;
    if (control.dataset.mode !== undefined) {
      const index = Number(control.dataset.mode);
      const item = items[index];
      const mode = control.value;
      items[index] = mode === 'rank'
        ? {id: item.id, rank: 1}
        : {id: item.id, mode, amount: mode === 'pieces' ? 1 : undefined};
      render();
      root.querySelector('[data-amount="' + index + '"]')?.focus();
    } else if (control.dataset.rank !== undefined) {
      items[Number(control.dataset.rank)].rank = Number(control.value);
    } else {
      return;
    }
    onChange();
  });

  root.addEventListener('input', event => {
    const {amount} = event.target.dataset;
    if (amount === undefined) return;
    items[Number(amount)].amount = event.target.valueAsNumber;
    onChange();
  });

  root.addEventListener('click', event => {
    const remove = event.target.closest('[data-remove-ingredient]');
    if (!remove) return;
    items.splice(Number(remove.dataset.removeIngredient), 1);
    render();
    onChange();
  });

  render();
  return {
    render,
    getItems: () => structuredClone(items),
    setItems(value) {
      items = structuredClone(value);
      render();
    },
    add(id) {
      const food = foods[id];
      if (!food || items.some(item => item.id === id)) return;
      items.push(food.pieceGrams ? {id, mode: 'pieces', amount: 1} : {id, rank: 1});
      render();
      onChange();
    },
  };
}

export function hasEditableIngredients(input) {
  const items = input?.items;
  return Array.isArray(items) && items.length > 0 && items.length <= foods.length &&
    items.every(item => {
      if (!Number.isInteger(item?.id) || !foods[item.id]) return false;
      if ((item.mode ?? 'rank') === 'rank') return ranks.some(([value]) => value === item.rank);
      if (item.mode === 'pieces') return foods[item.id].pieceGrams && Number.isInteger(item.amount) && item.amount >= 1;
      return item.mode === 'grams' && Number.isFinite(item.amount) && item.amount > 0;
    });
}
