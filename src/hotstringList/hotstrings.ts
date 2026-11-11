import { hotstringSections } from '../hotstringCatalog';

type MaxBridge = { outlet: (...args: string[]) => void };

const max = (window as { max?: MaxBridge }).max;

const field = byId('field');
const input = byId('search') as HTMLInputElement;
const count = byId('count');
const clear = byId('clear');
const fade = byId('fade');
const list = byId('list');

const sections = hotstringSections().map(section => {
  const combos = section.title === 'Hotkeys';
  const entries = section.items.map(item => ({
    keys: combos ? item.key.split(/[+ ]/) : [item.key],
    desc: item.desc,
    bind: item.bind,
    keyText: item.key.toLowerCase(),
    search: `${item.key} ${item.desc}`.toLowerCase(),
  }));
  return { title: section.title, search: section.title.toLowerCase(), entries };
});
const totalCount = sections.reduce((n, section) => n + section.entries.length, 0);

let actions: HTMLElement[] = [];
let selected = -1;

function byId(id: string) {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`missing #${id}`);
  }
  return el;
}

function el(tag: string, className: string, ...children: (Node | string)[]) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  node.append(...children);
  return node;
}

function highlighted(text: string, q: string) {
  const at = q === '' ? -1 : text.toLowerCase().indexOf(q);
  if (at < 0) {
    return [text];
  }
  return [
    text.slice(0, at),
    el('mark', '', text.slice(at, at + q.length)),
    text.slice(at + q.length),
  ];
}

function render() {
  const raw = input.value;
  const q = raw.trim().toLowerCase();
  const rows: HTMLElement[] = [];
  actions = [];
  let matches = 0;
  for (const section of sections) {
    const entries =
      q === '' || section.search.includes(q)
        ? section.entries
        : section.entries.filter(entry => entry.search.includes(q));
    if (entries.length === 0) {
      continue;
    }
    matches += entries.length;
    rows.push(el('div', 'group', section.title, el('span', '', String(entries.length))));
    for (const entry of entries) {
      const keyMatch = q !== '' && entry.keyText.includes(q);
      const row = el(
        'div',
        keyMatch ? 'item match' : 'item',
        el('span', 'desc', ...highlighted(entry.desc, q)),
        el('span', 'keys', ...entry.keys.map(key => el('kbd', '', key)))
      );
      if (entry.bind) {
        row.classList.add('action');
        row.dataset.bind = entry.bind;
        actions.push(row);
      }
      rows.push(row);
    }
  }
  if (rows.length === 0) {
    rows.push(
      el(
        'div',
        'empty',
        `No matches for "${raw.trim()}"`,
        el('small', '', 'Press Esc to close the list')
      )
    );
  }
  const active = raw !== '';
  field.classList.toggle('active', active);
  count.textContent = active ? `${matches} of ${totalCount}` : String(totalCount);
  list.replaceChildren(...rows);
  list.scrollTop = 0;
  select(q !== '' && actions.length > 0 ? 0 : -1);
  onScroll();
}

function select(index: number) {
  actions[selected]?.classList.remove('selected');
  selected = index;
  const row = actions[selected];
  if (!row) {
    return;
  }
  row.classList.add('selected');
  if (selected === 0) {
    list.scrollTop = 0;
  } else {
    row.scrollIntoView({ block: 'nearest' });
  }
}

function move(step: number) {
  if (actions.length === 0) {
    return;
  }
  select(Math.min(actions.length - 1, Math.max(0, selected + step)));
}

function pageSize() {
  const row = actions[0];
  return row ? Math.max(1, Math.floor(list.clientHeight / (row.offsetHeight + 2)) - 1) : 1;
}

function close() {
  setQuery('');
  max?.outlet('closeList');
}

function fire(bind: string) {
  max?.outlet(bind);
  close();
}

function setQuery(next: string) {
  input.value = next;
  render();
  input.focus();
}

function onScroll() {
  fade.classList.toggle('on', list.scrollTop > 0);
}

input.addEventListener('input', render);
list.addEventListener('scroll', onScroll);
list.addEventListener('click', event => {
  const row = (event.target as Element).closest<HTMLElement>('.item[data-bind]');
  if (row?.dataset.bind) {
    fire(row.dataset.bind);
  }
});
clear.addEventListener('click', event => {
  event.preventDefault();
  setQuery('');
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    move(event.key === 'ArrowDown' ? 1 : -1);
  } else if (event.key === 'PageDown' || event.key === 'PageUp') {
    event.preventDefault();
    move(event.key === 'PageDown' ? pageSize() : -pageSize());
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const bind = actions[selected]?.dataset.bind;
    if (bind) {
      fire(bind);
    }
  } else if (document.activeElement !== input) {
    input.focus();
  }
});
window.addEventListener('focus', () => input.focus());

render();
input.focus();
