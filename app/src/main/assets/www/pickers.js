function fieldLabel(field) {
  const label = field.getAttribute('aria-label');
  if (label) return label;
  const text = [...(field.labels?.[0]?.childNodes ?? [])]
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent.trim()).filter(Boolean).join(' ');
  return text || 'Выберите значение';
}

export function mountPickers() {
  const sheet = document.getElementById('pickerSheet');
  const heading = document.getElementById('pickerHeading');
  const body = document.getElementById('pickerBody');
  const triggers = new WeakMap();
  let field = null;
  let openedBy = null;
  let month = null;

  function setValue(value) {
    const current = field;
    sheet.close();
    if (!current || current.value === value) return;
    current.value = value;
    current.dispatchEvent(new Event('input', {bubbles: true}));
    current.dispatchEvent(new Event('change', {bubbles: true}));
    sync();
  }

  function renderOptions(select) {
    body.className = 'picker-options';
    body.replaceChildren(...Array.from(select.options, option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'picker-option';
      button.textContent = option.label;
      button.disabled = option.disabled || option.parentElement?.disabled === true;
      button.setAttribute('aria-pressed', String(option.selected));
      button.addEventListener('click', () => setValue(option.value));
      return button;
    }));
  }

  function renderCalendar() {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    body.className = 'picker-calendar';
    const toolbar = document.createElement('div');
    toolbar.className = 'calendar-toolbar';
    const label = document.createElement('strong');
    label.textContent = month.toLocaleDateString('ru-RU', {month: 'long', year: 'numeric'});
    const page = (text, description, delta) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quiet';
      button.textContent = text;
      button.setAttribute('aria-label', description);
      const next = calendarDate(year, monthIndex + delta, 1);
      button.disabled = next.getFullYear() < 1 || next.getFullYear() > 9999;
      button.onclick = () => {
        month = next;
        renderCalendar();
        body.querySelector('[aria-label="' + description + '"]')?.focus();
      };
      return button;
    };
    toolbar.append(page('«', 'Предыдущий год', -12), page('‹', 'Предыдущий месяц', -1), label,
      page('›', 'Следующий месяц', 1), page('»', 'Следующий год', 12));

    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    for (const name of ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']) {
      const day = document.createElement('span');
      day.textContent = name;
      grid.append(day);
    }
    const blankCells = (month.getDay() + 6) % 7;
    for (let blank = 0; blank < blankCells; blank++) grid.append(document.createElement('span'));
    const lastDay = calendarDate(year, monthIndex + 1, 0).getDate();
    for (let day = 1; day <= lastDay; day++) {
      const date = calendarDate(year, monthIndex, day);
      const value = dateValue(date);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'calendar-day';
      button.textContent = String(day);
      button.setAttribute('aria-label', date.toLocaleDateString('ru-RU', {day:'numeric', month:'long', year:'numeric'}));
      button.setAttribute('aria-pressed', String(field.value === value));
      button.onclick = () => setValue(value);
      grid.append(button);
    }
    const today = document.createElement('button');
    today.type = 'button';
    today.className = 'quiet calendar-today';
    today.textContent = 'Сегодня';
    today.onclick = () => setValue(dateValue(new Date()));
    body.replaceChildren(toolbar, grid, today);
  }

  function dateValue(date) {
    return String(date.getFullYear()).padStart(4, '0') + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function calendarDate(year, monthIndex, day) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setFullYear(year, monthIndex, day);
    return date;
  }

  function open(next, trigger) {
    if (sheet.open || next.disabled) return;
    field = next;
    openedBy = trigger;
    heading.textContent = fieldLabel(field);
    if (field.tagName === 'SELECT') {
      renderOptions(field);
    } else {
      const selected = field.value ? new Date(field.value + 'T12:00:00') : new Date();
      month = calendarDate(selected.getFullYear(), selected.getMonth(), 1);
      renderCalendar();
    }
    trigger.setAttribute('aria-expanded', 'true');
    sheet.showModal();
    (body.querySelector('button[aria-pressed="true"]:not(:disabled)') ?? body.querySelector('button:not(:disabled)'))?.focus();
  }

  function sync() {
    for (const control of document.querySelectorAll('select, input[type="date"]')) {
      let trigger = triggers.get(control);
      if (!trigger) {
        trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = control.type === 'date' ? 'picker-trigger picker-date' : 'picker-trigger';
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-controls', 'pickerSheet');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.addEventListener('click', () => open(control, trigger));
        control.addEventListener('invalid', event => {
          event.preventDefault();
          if (!sheet.open) open(control, trigger);
        });
        control.hidden = true;
        control.after(trigger);
        triggers.set(control, trigger);
      }
      const text = control.tagName === 'SELECT'
        ? control.selectedOptions[0]?.label || 'Выбрать'
        : control.value ? new Date(control.value + 'T12:00:00').toLocaleDateString('ru-RU') : 'Выбрать дату';
      if (trigger.textContent !== text) trigger.textContent = text;
      trigger.disabled = control.disabled;
      trigger.setAttribute('aria-label', fieldLabel(control) + ': ' + text);
    }
  }

  document.getElementById('pickerClose').onclick = () => sheet.close();
  sheet.addEventListener('click', event => {
    if (event.target !== sheet) return;
    const bounds = sheet.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) sheet.close();
  });
  sheet.addEventListener('close', () => {
    openedBy?.setAttribute('aria-expanded', 'false');
    openedBy = null;
    field = null;
  });
  body.addEventListener('keydown', event => {
    if (body.className !== 'picker-options' || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const options = [...body.querySelectorAll('button:not(:disabled)')];
    if (!options.length) return;
    const index = options.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
      : Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
    event.preventDefault();
    options[next].focus();
  });

  const observer = new MutationObserver(changes => {
    if (changes.some(change => change.target.matches?.('select, option') ||
      [...change.addedNodes].some(node => node.matches?.('select, input[type="date"]') || node.querySelector?.('select, input[type="date"]')))) sync();
  });
  observer.observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'selected']});
  sync();
  return sync;
}
