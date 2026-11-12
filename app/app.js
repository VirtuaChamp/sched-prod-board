import { fetchIncidents, ack } from './api.js';

const REFRESH_MS = 2000;
const board = document.querySelector('[data-testid="board"]');
const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const status = document.querySelector('[data-role="status"]');
const newBar = document.querySelector('[data-testid="new-bar"]');
newBar.addEventListener('click', showNew);

const rows = new Map();
const acked = new Map();

const dayFirstZone = (tz) => /^Europe\//.test(tz ?? '');
const viewerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const timeFormat = (() => {
  const base = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' };
  const locale = navigator.languages?.[0] ?? navigator.language;
  const fmt = new Intl.DateTimeFormat(locale, base);
  const order = fmt.formatToParts(new Date(Date.UTC(2026, 10, 30))).filter((p) => p.type === 'day' || p.type === 'month').map((p) => p.type);
  return order[0] === 'month' && dayFirstZone(viewerZone()) ? new Intl.DateTimeFormat('en-GB', base) : fmt;
})();

const formatTime = (iso) => timeFormat.format(new Date(iso));

const el = (tag, attrs = {}, text) => {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (text !== undefined) node.textContent = text;
  return node;
};

function markAcked(row, reply) {
  row.classList.add('is-acked');
  row.querySelector('[data-testid="ack"]')?.remove();
  if (!row.querySelector('[data-testid="acked"]')) {
    const mark = el('span', { 'data-testid': 'acked', class: 'acked' }, 'Acked');
    mark.title = `acked ${reply.ackedAt}`;
    row.querySelector('.act').append(mark);
  }
}

async function onAck(id, button) {
  button.disabled = true;
  button.textContent = 'Acking…';
  try {
    const reply = await ack(id);
    acked.set(id, reply);
    const row = rows.get(id);
    if (row) markAcked(row, reply);
  } catch (err) {
    button.disabled = false;
    button.textContent = 'Ack';
    setStatus(`Ack failed for ${id}: ${err.message}`);
  }
}

function buildRow(i) {
  const row = el('li', { 'data-testid': 'incident-row', 'data-id': i.id, class: `row ${i.severity}` });
  row.append(
    el('span', { class: 'id' }, i.id),
    el('span', { class: 'sev' }, i.severity),
    el('span', { class: 'what' }, `${i.service} · ${i.region} · ${i.summary}`),
    el('time', { datetime: i.openedAt, title: i.openedAt }, formatTime(i.openedAt)),
  );
  const act = el('span', { class: 'act' });
  const button = el('button', { type: 'button', 'data-testid': 'ack', 'aria-label': `Ack ${i.id}` }, 'Ack');
  button.addEventListener('click', () => onAck(i.id, button));
  act.append(button);
  row.append(act);
  if (acked.has(i.id)) markAcked(row, acked.get(i.id));
  return row;
}

function updateRow(row, i) {
  const time = row.querySelector('time');
  if (time.getAttribute('datetime') !== i.openedAt) {
    time.setAttribute('datetime', i.openedAt);
    time.title = i.openedAt;
    time.textContent = formatTime(i.openedAt);
  }
  row.className = `row ${i.severity}${acked.has(i.id) ? ' is-acked' : ''}`;
  row.querySelector('.sev').textContent = i.severity;
  row.querySelector('.what').textContent = `${i.service} · ${i.region} · ${i.summary}`;
}

let latest = [];

const place = (incidents) => {
  const ids = new Set(incidents.map((i) => i.id));
  [...rows.keys()].filter((id) => !ids.has(id)).forEach((id) => {
    rows.get(id).remove();
    rows.delete(id);
  });
  incidents.forEach((i, index) => {
    const row = rows.get(i.id) ?? buildRow(i);
    if (rows.has(i.id)) updateRow(row, i);
    rows.set(i.id, row);
    if (list.children[index] !== row) list.insertBefore(row, list.children[index] ?? null);
  });
};

function showBar(pending) {
  const count = pending.length;
  const sev1 = pending.filter((i) => i.severity === 'sev1').length;
  newBar.hidden = count === 0;
  newBar.classList.toggle('has-sev1', sev1 > 0);
  newBar.textContent = count === 0 ? '' : `${count} new incident${count === 1 ? '' : 's'}${sev1 ? ` (${sev1} sev1)` : ''} · show`;
}

function render(incidents) {
  latest = incidents;
  const holdStill = rows.size > 0 && !document.hidden;
  if (!holdStill) {
    place(incidents);
    showBar([]);
  } else {
    incidents.filter((i) => rows.has(i.id)).forEach((i) => updateRow(rows.get(i.id), i));
    showBar(incidents.filter((i) => !rows.has(i.id)));
  }
  empty.hidden = rows.size > 0 || incidents.length > 0;
}

function showNew() {
  place(latest);
  showBar([]);
  empty.hidden = latest.length > 0;
}

function setStatus(text) {
  status.textContent = text;
}

const byNewest = (a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt);

async function refresh() {
  try {
    const page = await fetchIncidents();
    render([...page.incidents].sort(byNewest));
    board.setAttribute('aria-busy', 'false');
    loader.hidden = true;
    loader.remove?.();
    setStatus(`Updated ${new Date(page.updatedAt).toLocaleTimeString()}`);
  } catch (err) {
    setStatus(`Could not load incidents: ${err.message}`);
  }
}

async function loop() {
  await refresh();
  setTimeout(loop, REFRESH_MS);
}

loop();
