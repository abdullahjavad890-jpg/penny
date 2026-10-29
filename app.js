'use strict';
(() => {

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const round2 = n => Math.round(n * 100) / 100;
const sum = arr => arr.reduce((s, n) => s + n, 0);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoDate(new Date());
const thisMonth = () => today().slice(0, 7);
const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
const shiftMonth = (mk, n) => { const d = parseDate(mk + '-01'); d.setMonth(d.getMonth() + n); return isoDate(d).slice(0, 7); };
const monthName = mk => parseDate(mk + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const monthShort = mk => parseDate(mk + '-01').toLocaleDateString(undefined, { month: 'long' });
function dayLabel(ds) {
  if (ds === today()) return 'Today';
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (ds === isoDate(y)) return 'Yesterday';
  const d = parseDate(ds);
  const opts = { weekday: 'short', day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString(undefined, opts);
}
function ago(ts) {
  const days = Math.floor((Date.now() - ts) / 864e5);
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
}

/* ---------- constants ---------- */
const KEY = 'penny:v1';
const TYPES = ['expense', 'income', 'transfer'];
const CURRENCIES = [
  ['PKR', 'Rs', 'Pakistani Rupee'], ['USD', '$', 'US Dollar'], ['EUR', '€', 'Euro'],
  ['GBP', '£', 'British Pound'], ['INR', '₹', 'Indian Rupee'], ['AED', 'AED', 'UAE Dirham'],
  ['SAR', 'SAR', 'Saudi Riyal'], ['CAD', 'C$', 'Canadian Dollar'], ['AUD', 'A$', 'Australian Dollar'],
  ['TRY', '₺', 'Turkish Lira'], ['BDT', '৳', 'Bangladeshi Taka'], ['MYR', 'RM', 'Malaysian Ringgit'],
];
const REGION_CURRENCY = { PK: 'PKR', US: 'USD', GB: 'GBP', IN: 'INR', AE: 'AED', SA: 'SAR', CA: 'CAD', AU: 'AUD', TR: 'TRY', BD: 'BDT', MY: 'MYR',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', IE: 'EUR', PT: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR' };
const KINDS = {
  bank: { e: '🏦', n: 'Bank' }, cash: { e: '💵', n: 'Cash' }, card: { e: '💳', n: 'Card' },
  wallet: { e: '📱', n: 'Wallet' }, savings: { e: '🐷', n: 'Savings' },
};
const kindOf = a => KINDS[a.kind] || KINDS.bank;
const COLORS = ['#2F4560', '#F2622E', '#2E8A57', '#B9773A', '#6C5A9C', '#C2412E', '#2E7F8F', '#3A3A3A'];
const nextColor = list => COLORS.find(c => !list.some(a => a.color === c)) || COLORS[list.length % COLORS.length];
const EMOJIS = ['🍜', '🍔', '🛒', '☕', '🍕', '🎁', '💊', '🏥', '🏠', '🛋️', '🚌', '🚗', '⛽', '🧴', '👕', '💇',
  '🐾', '💡', '📶', '📱', '✈️', '🏖️', '💳', '🏦', '📦', '🎮', '🎬', '📚', '🎓', '👶', '💪', '🎉',
  '🧾', '🔧', '🌱', '🕌', '💼', '✨', '📈', '🪙', '🐷', '💰', '🎯', '❤️', '🍿', '🧸', '🚕', '🏋️'];
const DEFAULT_CATS = {
  expense: [['food', 'Food', '🍜'], ['gifts', 'Gifts', '🎁'], ['health', 'Health/medical', '💊'], ['home', 'Home', '🏠'],
    ['transport', 'Transportation', '🚌'], ['personal', 'Personal', '🧴'], ['pets', 'Pets', '🐾'], ['utilities', 'Utilities', '💡'],
    ['travel', 'Travel', '✈️'], ['debt', 'Debt', '💳'], ['other', 'Other', '📦']],
  income: [['savings', 'Savings', '🐷'], ['paycheck', 'Paycheck', '💼'], ['bonus', 'Bonus', '✨'],
    ['interest', 'Interest', '📈'], ['other-in', 'Other', '🪙']],
};
const JAR_QUIPS = ['Clink.', 'Shake shake.', "Coins don't grow on trees. They grow in jars.", 'Still counting.',
  'Every small save counts.', 'Careful, I bruise easily.', 'The jar sees everything.', 'Feed me coins.'];
const WAVE = 'M0 0 Q15 -7 30 0 T60 0 T90 0 T120 0 T150 0 T180 0 T210 0 T240 0 V160 H0 Z';
const JAR_PATH = 'M28 36h64a8 8 0 0 1 8 8v70a20 20 0 0 1-20 20H40a20 20 0 0 1-20-20V44a8 8 0 0 1 8-8z';

/* ---------- state ---------- */
function freshState() {
  const cats = {};
  for (const t of ['expense', 'income']) cats[t] = DEFAULT_CATS[t].map(([id, name, emoji]) => ({ id, name, emoji }));
  return { v: 1, onboarded: false, name: '', currency: 'USD', symbol: '$', theme: 'auto', accounts: [], cats,
    budgets: {}, tx: [], lastAccount: null, celebrated: false, hideInstall: false, lastBackup: null };
}
function load() {
  try { const raw = localStorage.getItem(KEY); return raw ? Object.assign(freshState(), JSON.parse(raw)) : null; }
  catch (e) { return null; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Could not save', 'Your phone is blocking storage for Penny.', { kind: 'bad' }); }
}
let S = load() || freshState();

const accById = id => S.accounts.find(a => a.id === id);
const catById = (type, id) => (S.cats[type] || []).find(c => c.id === id);
const usage = (type, id) => S.tx.filter(t => t.type === type && t.cat === id).length;

function txEffect(t, accId) {
  if (t.type === 'expense') return t.account === accId ? -t.amount : 0;
  if (t.type === 'income') return t.account === accId ? t.amount : 0;
  return (t.to === accId ? t.amount : 0) - (t.account === accId ? t.amount : 0);
}
const accBalance = a => round2(S.tx.reduce((s, t) => s + txEffect(t, a.id), a.start));
const totalBalance = () => round2(sum(S.accounts.map(accBalance)));

function balanceAtMonthStart(mk) {
  let s = sum(S.accounts.map(a => a.start));
  for (const t of S.tx) {
    if (t.date.slice(0, 7) >= mk) continue;
    if (t.type === 'income') s += t.amount;
    else if (t.type === 'expense') s -= t.amount;
  }
  return s;
}

// A month without its own plan borrows the latest earlier month's plan.
function getBudget(mk) {
  if (S.budgets[mk]) return S.budgets[mk];
  const prev = Object.keys(S.budgets).filter(k => k < mk).sort().pop();
  return prev ? S.budgets[prev] : { expense: {}, income: {} };
}
function setPlanned(mk, type, cat, val) {
  if (!S.budgets[mk]) S.budgets[mk] = JSON.parse(JSON.stringify(getBudget(mk)));
  S.budgets[mk][type] = S.budgets[mk][type] || {};
  S.budgets[mk][type][cat] = val;
  save();
}

function monthStats(mk) {
  const b = getBudget(mk);
  const plan = { expense: b.expense || {}, income: b.income || {} };
  const act = { expense: {}, income: {} };
  let inc = 0, exp = 0;
  for (const t of S.tx) {
    if (t.type === 'transfer' || !t.date.startsWith(mk)) continue;
    act[t.type][t.cat] = (act[t.type][t.cat] || 0) + t.amount;
    if (t.type === 'income') inc += t.amount; else exp += t.amount;
  }
  const plannedExp = sum(S.cats.expense.map(c => plan.expense[c.id] || 0));
  const plannedInc = sum(S.cats.income.map(c => plan.income[c.id] || 0));
  const start = round2(balanceAtMonthStart(mk));
  const end = round2(start + inc - exp);
  return { plan, act, inc: round2(inc), exp: round2(exp), plannedExp, plannedInc, start, end, saved: round2(end - start) };
}

function streak() {
  const days = new Set(S.tx.map(t => isoDate(new Date(t.created))));
  const d = new Date(); let n = 0;
  if (!days.has(isoDate(d))) d.setDate(d.getDate() - 1);
  while (days.has(isoDate(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const sortedTx = list => list.slice().sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);

function money(n, plus) {
  const v = round2(Math.abs(n));
  const body = v.toLocaleString(undefined, { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const sym = /^[A-Za-z]/.test(S.symbol) ? S.symbol + ' ' : S.symbol;
  const sign = n <= -0.005 ? '−' : (plus && n >= 0.005 ? '+' : '');
  return sign + sym + body;
}
function setCurrency(code) {
  const c = CURRENCIES.find(x => x[0] === code) || CURRENCIES[1];
  S.currency = c[0]; S.symbol = c[1]; save();
}
function guessCurrency() {
  const region = (navigator.language || '').split('-')[1];
  return REGION_CURRENCY[(region || '').toUpperCase()] || 'USD';
}

/* ---------- rendering ---------- */
const UI = { tab: 'home', month: thisMonth(), filter: 'all', q: '', flash: null, jarY: null };
const lastNums = {};

function render(animate = true) {
  const v = $('#view');
  v.innerHTML = SCREENS[UI.tab]();
  $$('#nav [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === UI.tab));
  const scr = $('.screen', v);
  if (scr) [...scr.children].forEach((c, i) => c.style.setProperty('--stagger', Math.min(i, 8)));
  v.classList.remove('enter');
  if (animate) { void v.offsetWidth; v.classList.add('enter'); }
  hydrate(v);
  UI.flash = null;
}

function hydrate(root) {
  $$('[data-n]', root).forEach(el => {
    const to = +el.dataset.n, k = el.dataset.k, plus = el.hasAttribute('data-plus');
    const from = k in lastNums ? lastNums[k] : 0;
    lastNums[k] = to;
    if (reduceMotion || from === to) { el.textContent = money(to, plus); return; }
    const whole = Number.isInteger(from) && Number.isInteger(to);
    const t0 = performance.now(), dur = 900;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      const val = from + (to - from) * e;
      el.textContent = money(p < 1 && whole ? Math.round(val) : (p < 1 ? val : to), plus);
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = money(from, plus);
    requestAnimationFrame(step);
  });
  $$('.liquid[data-y]', root).forEach(g => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      g.style.transform = `translateY(${g.dataset.y}px)`;
      if (g.hasAttribute('data-home')) UI.jarY = +g.dataset.y;
    }));
  });
}

function jarSVG(f, id, startY = 140, home = false) {
  const y = (134 - clamp(f, 0, 1) * 100 + (f > 0 ? 0 : 8)).toFixed(1);
  return `<svg class="jar" viewBox="0 0 120 140" aria-hidden="true">
    <defs><clipPath id="${id}"><path d="${JAR_PATH}"/></clipPath></defs>
    <g clip-path="url(#${id})">
      <rect width="120" height="140" class="jar-glass"/>
      <g class="liquid" data-y="${y}" ${home ? 'data-home' : ''} style="transform:translateY(${startY}px)">
        <path class="wave w2" d="${WAVE}"/><path class="wave w1" d="${WAVE}"/>
      </g>
    </g>
    <path class="jar-line" d="${JAR_PATH}"/>
    <path class="jar-shine" d="M33 58v40"/>
    <rect class="jar-lid" x="30" y="20" width="60" height="14" rx="6"/>
    <rect class="jar-slot" x="47" y="25" width="26" height="4" rx="2"/>
  </svg>`;
}

const monthSwitch = () => `<div class="month-switch">
  <button data-act="month" data-d="-1" aria-label="Previous month">‹</button>
  <button class="m" data-act="monthNow">${monthName(UI.month)}</button>
  <button data-act="month" data-d="1" aria-label="Next month">›</button></div>`;

function emptyState(emoji, title, text) {
  return `<div class="empty"><span class="big-emoji">${emoji}</span><b>${title}</b><p>${text}</p></div>`;
}

function txRow(t, ctxAcc) {
  const acc = accById(t.account);
  let icon, title, sub, amt, cls;
  if (t.type === 'transfer') {
    const to = accById(t.to);
    icon = '↔'; title = t.note || 'Transfer';
    sub = `${acc?.name ?? '?'} → ${to?.name ?? '?'}`;
    if (ctxAcc) { const e = txEffect(t, ctxAcc); amt = money(e, true); cls = e > 0 ? 'in' : 'ex'; }
    else { amt = money(t.amount); cls = 'tr'; }
  } else {
    const c = catById(t.type, t.cat);
    icon = c?.emoji || '•';
    title = t.note || c?.name || 'Uncategorized';
    sub = [t.note ? c?.name : null, acc?.name].filter(Boolean).join(' · ');
    amt = money(t.type === 'expense' ? -t.amount : t.amount, true);
    cls = t.type === 'expense' ? 'ex' : 'in';
  }
  return `<button class="tx-row ${UI.flash === t.id ? 'flash' : ''}" data-act="tx" data-id="${t.id}">
    <span class="tx-ic">${icon}</span>
    <span class="tx-mid"><b>${esc(title)}</b><small>${esc(sub)}</small></span>
    <span class="tx-amt ${cls}">${amt}</span></button>`;
}

function progress(a, p) {
  if (!p) return { w: a ? 100 : 0, cls: a ? 'none' : '' };
  const r = a / p;
  return { w: clamp(r * 100, 0, 100), cls: r > 1 ? 'over' : r >= .8 ? 'warn' : 'ok' };
}

/* ---------- screens ---------- */
function screenHome() {
  const mk = thisMonth(), st = monthStats(mk), total = totalBalance(), sk = streak();
  const hr = new Date().getHours();
  const greet = hr < 5 ? 'Up late' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const net = round2(st.inc - st.exp);
  const recent = sortedTx(S.tx).slice(0, 5);
  return `<div class="screen">
    <header class="top">
      <div><p class="eyebrow">${esc(new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
      <h1 class="title">${greet}${S.name ? ', ' + esc(S.name) : ''}</h1></div>
      ${sk >= 2 ? `<span class="streak" title="Days in a row you logged something">🔥 ${sk}</span>` : ''}
    </header>
    ${installBanner()}
    <section class="hero">
      <p class="hero-label">Total balance</p>
      <p class="hero-num ${money(total).length > 12 ? 'sm' : ''} ${total < 0 ? 'neg' : ''}"><span data-n="${total}" data-k="total">${money(total)}</span></p>
      <span class="pill ${net >= 0 ? 'up' : 'down'}">${net >= 0 ? '▲' : '▼'} <span data-n="${net}" data-k="net" data-plus>${money(net, true)}</span>&nbsp;in ${monthShort(mk)}</span>
      <div class="hero-split"><div><span>In</span><b>${money(st.inc)}</b></div><div><span>Out</span><b>${money(st.exp)}</b></div></div>
    </section>
    <section>
      <div class="sec-head"><h2>Accounts</h2><button class="link" data-act="addAccount">+ Add</button></div>
      <div class="acc-rail">${S.accounts.map(a => {
        const b = accBalance(a);
        return `<button class="acc-card" style="--c:${a.color}" data-act="account" data-id="${a.id}">
          <span class="acc-emoji">${kindOf(a).e}</span><span class="acc-name">${esc(a.name)}</span>
          <span class="acc-bal"><span data-n="${b}" data-k="acc-${a.id}">${money(b)}</span></span></button>`;
      }).join('')}<button class="acc-card add" data-act="addAccount"><span>+</span>New account</button></div>
    </section>
    ${jarCard(st)}
    ${pulseCard(st)}
    <section>
      <div class="sec-head"><h2>Recent</h2>${S.tx.length ? '<button class="link" data-act="goto" data-to="activity">See all</button>' : ''}</div>
      ${recent.length ? `<div class="list">${recent.map(t => txRow(t)).join('')}</div>`
        : emptyState('🪺', 'Nothing logged yet', 'Tap the orange + below to add your first expense or income.')}
    </section>
  </div>`;
}

function installBanner() {
  if (standalone || !isIOS || S.hideInstall) return '';
  return `<div class="install" data-act="installHelp"><span class="ic">📲</span>
    <div class="grow"><b>Put Penny on your Home Screen</b><small>It opens like a real app. Tap to see how.</small></div>
    <button class="x" data-act="hideInstall" aria-label="Dismiss">✕</button></div>`;
}

function jarCard(st) {
  const r = st.inc > 0 ? (st.inc - st.exp) / st.inc : 0;
  const msg = st.inc <= 0
    ? (st.exp > 0 ? "No income logged this month, so the jar's dry." : 'Empty jar. Log some income and watch it fill.')
    : r < 0 ? "The jar's leaking. Spending is ahead of income this month."
    : r < .1 ? 'A little something stays in the jar.'
    : r < .3 ? 'Solid. The jar is filling up.'
    : 'Look at that jar. Future you says thanks.';
  return `<section class="card jar-card" data-act="jar">
    ${jarSVG(st.inc > 0 ? r : 0, 'homejar', UI.jarY ?? 140, true)}
    <div><p class="eyebrow">Kept this month</p><p class="jar-pct ${r < 0 ? 'down' : ''}">${st.inc > 0 ? Math.round(r * 100) + '%' : '0%'}</p><p class="muted">${msg}</p></div>
  </section>`;
}

function pulseCard(st) {
  const rows = S.cats.expense.map(c => ({ c, p: st.plan.expense[c.id] || 0, a: st.act.expense[c.id] || 0 }))
    .filter(r => r.p || r.a).sort((x, y) => y.a - x.a).slice(0, 4);
  if (!rows.some(r => r.p)) return `<section class="card nudge" data-act="goto" data-to="budget">
    <span class="nudge-emoji">🎯</span><div><b>Make a plan</b><p class="muted">Decide how much you want to spend on each thing this month.</p></div><span class="chev">›</span></section>`;
  return `<section class="card"><div class="sec-head"><h2>Budget check</h2><button class="link" data-act="goto" data-to="budget">Open</button></div>
    ${rows.map(({ c, p, a }) => { const pr = progress(a, p); return `<div class="mini">
      <div class="mini-top"><span>${c.emoji} ${esc(c.name)}</span><span class="muted">${money(a)}${p ? ' of ' + money(p) : ''}</span></div>
      <span class="bar ${pr.cls}"><i style="--w:${pr.w}%"></i></span></div>`; }).join('')}
  </section>`;
}

function screenBudget() {
  const st = monthStats(UI.month);
  const up = st.saved >= 0;
  const pct = st.start > 0 ? Math.round((st.end / st.start - 1) * 100) : null;
  const maxCol = Math.max(Math.abs(st.start), Math.abs(st.end)) || 1;
  const h = v => (Math.max(v, 0) / maxCol * 100).toFixed(1);
  return `<div class="screen">
    <header class="top"><div><p class="eyebrow">Plan vs. real life</p><h1 class="title">Budget</h1></div></header>
    ${monthSwitch()}
    <section class="card glance">
      <div class="glance-head">
        <div><p class="big ${up ? 'up' : 'down'}">${pct === null ? '0%' : (pct >= 0 ? '+' : '−') + Math.abs(pct) + '%'}</p>
          <p class="muted small">${up ? 'Increase' : 'Decrease'} in total savings</p></div>
        <div class="glance-saved"><b class="${up ? 'up' : 'down'}"><span data-n="${Math.abs(st.saved)}" data-k="saved">${money(Math.abs(st.saved))}</span></b>
          <span class="muted small">${up ? 'Saved' : 'Spent'} this month</span></div>
      </div>
      <div class="cols">
        <div class="col"><div class="col-track"><i class="col-bar navy" style="--h:${h(st.start)}%"></i></div><span class="muted small">Start balance</span><b>${money(st.start)}</b></div>
        <div class="col"><div class="col-track"><i class="col-bar orange" style="--h:${h(st.end)}%"></i></div><span class="muted small">End balance</span><b>${money(st.end)}</b></div>
      </div>
    </section>
    <section class="card">${cmp('Expenses', st.plannedExp, st.exp)}${cmp('Income', st.plannedInc, st.inc)}</section>
    ${catTable('expense', st)}
    ${catTable('income', st)}
    <p class="muted small center">Plans carry over to the next month until you change them.</p>
  </div>`;
}

function cmp(label, p, a) {
  const m = Math.max(p, a) || 1;
  return `<div class="cmp"><h3>${label}</h3>
    <div class="cmp-row"><span class="muted">Planned</span><div class="hbar"><i class="plan" style="--w:${p / m * 100}%"></i></div><b>${money(p)}</b></div>
    <div class="cmp-row"><span class="muted">Actual</span><div class="hbar"><i class="act" style="--w:${a / m * 100}%"></i></div><b>${money(a)}</b></div></div>`;
}

function catTable(type, st) {
  const isExp = type === 'expense';
  const P = isExp ? st.plannedExp : st.plannedInc, A = isExp ? st.exp : st.inc;
  const D = round2(isExp ? P - A : A - P);
  const rows = S.cats[type].map(c => {
    const p = st.plan[type][c.id] || 0, a = st.act[type][c.id] || 0, diff = round2(isExp ? p - a : a - p);
    const pr = isExp ? progress(a, p) : { w: p ? clamp(a / p * 100, 0, 100) : (a ? 100 : 0), cls: 'inc' };
    const line = p ? `${money(a)} of ${money(p)}` : a ? `${money(a)} · no plan` : 'No plan yet';
    return `<button class="cat-row ${!p && !a ? 'zero' : ''}" data-act="plan" data-type="${type}" data-id="${c.id}">
      <span class="cat-ic">${c.emoji}</span>
      <span class="cat-mid"><b>${esc(c.name)}</b><small>${line}</small>${p || a ? `<span class="bar ${pr.cls}"><i style="--w:${pr.w}%"></i></span>` : ''}</span>
      <span class="diff ${diff > 0 ? 'up' : diff < 0 ? 'down' : 'zero'}">${money(diff, true)}</span></button>`;
  }).join('');
  return `<section class="card">
    <div class="sec-head"><h2>${isExp ? 'Expenses' : 'Income'}</h2><button class="link" data-act="newCat" data-type="${type}">+ Category</button></div>
    <div class="totals"><div><span>Planned</span><b>${money(P)}</b></div><div><span>Actual</span><b>${money(A)}</b></div>
      <div><span>Diff.</span><b class="${D > 0 ? 'up' : D < 0 ? 'down' : ''}">${money(D, true)}</b></div></div>
    ${rows}</section>`;
}

function screenActivity() {
  const st = monthStats(UI.month);
  const filters = [['all', 'All'], ['expense', 'Spent'], ['income', 'Earned'], ['transfer', 'Moved']];
  const fi = filters.findIndex(f => f[0] === UI.filter);
  return `<div class="screen">
    <header class="top"><div><p class="eyebrow">Every coin, accounted for</p><h1 class="title">Activity</h1></div></header>
    ${monthSwitch()}
    <div class="totals"><div><span>Spent</span><b>${money(st.exp)}</b></div><div><span>Earned</span><b class="up">${money(st.inc)}</b></div>
      <div><span>Net</span><b class="${st.inc - st.exp >= 0 ? 'up' : 'down'}">${money(st.inc - st.exp, true)}</b></div></div>
    <div class="seg plain" style="--n:4;--i:${fi}"><i class="seg-pill"></i>${filters.map(([f, l]) =>
      `<button data-act="filter" data-f="${f}" class="${f === UI.filter ? 'on' : ''}">${l}</button>`).join('')}</div>
    <input id="q" class="field" type="search" placeholder="Search notes, categories, accounts" value="${esc(UI.q)}" autocomplete="off">
    <div id="act-list">${activityList()}</div>
  </div>`;
}

function activityList() {
  const q = UI.q.trim().toLowerCase();
  const hay = t => [t.note, catById(t.type, t.cat)?.name, accById(t.account)?.name, accById(t.to)?.name, String(t.amount)].join(' ').toLowerCase();
  const list = sortedTx(S.tx.filter(t => t.date.startsWith(UI.month) && (UI.filter === 'all' || t.type === UI.filter) && (!q || hay(t).includes(q))));
  if (!list.length) {
    if (q) return emptyState('🔍', 'No matches', 'Try a different word.');
    const any = S.tx.some(t => t.date.startsWith(UI.month));
    return any ? emptyState('🫥', 'Nothing in this filter', 'Switch back to All to see everything.')
      : emptyState('🍃', 'Quiet month', 'Your wallet is suspiciously calm. Tap + to log something.');
  }
  const groups = [];
  for (const t of list) {
    if (!groups.length || groups[groups.length - 1].date !== t.date) groups.push({ date: t.date, items: [] });
    groups[groups.length - 1].items.push(t);
  }
  return groups.map(g => {
    const net = round2(sum(g.items.map(t => t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0)));
    return `<div class="day-group"><div class="day-head"><span>${dayLabel(g.date)}</span><span>${net ? money(net, true) : ''}</span></div>
      <div class="list">${g.items.map(t => txRow(t)).join('')}</div></div>`;
  }).join('');
}

function screenMore() {
  const cur = CURRENCIES.find(c => c[0] === S.currency) || CURRENCIES[1];
  const themes = ['auto', 'light', 'dark'];
  return `<div class="screen">
    <header class="top"><div><p class="eyebrow">Settings and backups</p><h1 class="title">More</h1></div></header>
    <p class="group-label">You</p>
    <div class="group">
      <button class="row" data-act="setName"><span class="ri">🙂</span><span class="rt">Name</span><span class="rv">${esc(S.name) || 'Not set'}</span><span class="chev">›</span></button>
      <button class="row" data-act="setCurrency"><span class="ri">💱</span><span class="rt">Currency</span><span class="rv">${esc(cur[1])} · ${cur[0]}</span><span class="chev">›</span></button>
      <div class="row"><span class="ri">🌗</span><span class="rt">Look</span>
        <div class="seg plain mini" style="--n:3;--i:${themes.indexOf(S.theme)}"><i class="seg-pill"></i>${themes.map(v =>
          `<button data-act="theme" data-v="${v}" class="${S.theme === v ? 'on' : ''}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div></div>
    </div>
    <p class="group-label">Money</p>
    <div class="group">
      <button class="row" data-act="accounts"><span class="ri">🏦</span><span class="rt">Accounts</span><span class="rv">${S.accounts.length}</span><span class="chev">›</span></button>
      <button class="row" data-act="cats" data-type="expense"><span class="ri">🧾</span><span class="rt">Expense categories</span><span class="rv">${S.cats.expense.length}</span><span class="chev">›</span></button>
      <button class="row" data-act="cats" data-type="income"><span class="ri">💼</span><span class="rt">Income categories</span><span class="rv">${S.cats.income.length}</span><span class="chev">›</span></button>
    </div>
    <p class="group-label">Backup</p>
    <div class="group">
      <button class="row" data-act="export"><span class="ri">💾</span><span class="rt">Save a backup</span><span class="rv">${S.lastBackup ? ago(S.lastBackup) : 'Never'}</span><span class="chev">›</span></button>
      <button class="row" data-act="import"><span class="ri">📂</span><span class="rt">Restore a backup</span><span class="chev">›</span></button>
      <button class="row" data-act="csv"><span class="ri">📊</span><span class="rt">Export to spreadsheet</span><span class="chev">›</span></button>
    </div>
    <p class="muted small pad">Penny keeps everything on this phone only. Save a backup to Files or iCloud Drive now and then, so your history is safe if you ever change phones.</p>
    <div class="group">
      ${standalone ? '' : '<button class="row" data-act="installHelp"><span class="ri">📲</span><span class="rt">Add to Home Screen</span><span class="chev">›</span></button>'}
      <button class="row danger" data-act="erase"><span class="ri">🧨</span><span class="rt">Erase everything</span></button>
    </div>
    <p class="foot">Penny, made for ${esc(S.name) || 'you'}.</p>
  </div>`;
}

const SCREENS = { home: screenHome, budget: screenBudget, activity: screenActivity, more: screenMore };

/* ---------- sheets ---------- */
const sheets = [];
function openSheet(html, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="backdrop"></div><div class="sheet ${opts.cls || ''}" role="dialog" aria-modal="true"><div class="grab"><i></i></div><div class="sheet-body">${html}</div></div>`;
  $('#sheets').appendChild(wrap);
  const rec = { wrap, sheet: $('.sheet', wrap), onClose: opts.onClose };
  sheets.push(rec);
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
  $('.backdrop', wrap).addEventListener('click', () => closeSheet(rec));
  dragToClose(rec);
  return rec;
}
function closeSheet(rec = sheets[sheets.length - 1]) {
  if (!rec || rec.closing) return;
  rec.closing = true;
  const i = sheets.indexOf(rec);
  if (i > -1) sheets.splice(i, 1);
  rec.sheet.style.transform = '';
  rec.wrap.classList.remove('open');
  rec.wrap.classList.add('closing');
  setTimeout(() => rec.wrap.remove(), 450);
  if (rec.onClose) rec.onClose();
}
const closeAllSheets = () => { while (sheets.length) closeSheet(sheets[sheets.length - 1]); };

function dragToClose(rec) {
  const { sheet } = rec;
  let y0 = null, dy = 0;
  sheet.addEventListener('touchstart', e => {
    const onGrab = e.target.closest('.grab, .sheet-title');
    if (!onGrab && (sheet.scrollTop > 0 || e.target.closest('input, .keypad, .chips, .emoji-grid, button'))) { y0 = null; return; }
    y0 = e.touches[0].clientY; dy = 0;
  }, { passive: true });
  sheet.addEventListener('touchmove', e => {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    if (dy > 0) { sheet.style.transition = 'none'; sheet.style.transform = `translateY(${dy}px)`; }
  }, { passive: true });
  sheet.addEventListener('touchend', () => {
    if (y0 === null) return;
    sheet.style.transition = '';
    if (dy > 110) closeSheet(rec); else sheet.style.transform = '';
    y0 = null;
  });
}

function bump(el) { if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
function shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

const keypad = () => `<div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'].map(k =>
  `<button class="key" data-key="${k}" aria-label="${k === 'back' ? 'Delete' : k}">${k === 'back' ? '⌫' : k}</button>`).join('')}</div>`;

function applyKey(s, k) {
  if (k === 'back') return s.slice(0, -1);
  if (k === '.') return s.includes('.') ? s : (s || '0') + '.';
  if (s.includes('.')) return s.split('.')[1].length >= 2 ? s : s + k;
  if (s.replace(/^0+/, '').length >= 10) return s;
  return s === '0' ? k : s + k;
}
const strToNum = s => { const n = parseFloat(s); return isNaN(n) ? 0 : round2(n); };
function prettyAmt(s) {
  const [i, d] = (s || '0').split('.');
  return Number(i || 0).toLocaleString('en-US') + (d !== undefined ? '.' + d : '');
}
function sizeAmt(el) {
  const len = el.textContent.length;
  el.style.fontSize = len > 12 ? '34px' : len > 9 ? '42px' : '';
}

function amountSheet({ title, sub = '', value = 0, allowNeg = false, cta = 'Done', extra, onDone }) {
  let s = value ? String(Math.abs(value)) : '';
  let neg = value < 0;
  const rec = openSheet(`<h3 class="sheet-title">${esc(title)}</h3>${sub ? `<p class="muted center small">${esc(sub)}</p>` : ''}
    <div class="amount-display"><span class="cur">${esc(S.symbol)}</span><span class="amt"></span><span class="caret"></span></div>
    ${allowNeg ? `<div class="center"><button class="chip ${neg ? 'on' : ''}" data-x="neg">${neg ? '✓ ' : ''}This is money I owe</button></div>` : ''}
    ${keypad()}
    <button class="btn primary block" data-x="done">${esc(cta)}</button>
    ${extra ? `<div class="center" style="margin-top:12px"><button class="link" data-x="extra">${esc(extra.label)}</button></div>` : ''}`);
  const disp = $('.amount-display', rec.sheet), amt = $('.amt', rec.sheet);
  const upd = () => { amt.textContent = (neg ? '−' : '') + prettyAmt(s); sizeAmt(amt); };
  rec.sheet.addEventListener('click', e => {
    const k = e.target.closest('[data-key]');
    if (k) { s = applyKey(s, k.dataset.key); upd(); bump(disp); return; }
    const x = e.target.closest('[data-x]');
    if (!x) return;
    if (x.dataset.x === 'neg') { neg = !neg; x.classList.toggle('on', neg); x.textContent = (neg ? '✓ ' : '') + 'This is money I owe'; upd(); }
    if (x.dataset.x === 'done') { closeSheet(rec); onDone(round2(strToNum(s) * (neg ? -1 : 1))); }
    if (x.dataset.x === 'extra') { closeSheet(rec); extra.fn(); }
  });
  upd();
  return rec;
}

/* ---------- add / edit transaction ---------- */
function txSheet(existing, preset = {}) {
  if (!S.accounts.length) {
    toast('Add an account first', 'Penny needs to know where the money lives.');
    return accountSheet(null);
  }
  const d = existing
    ? { type: existing.type, s: String(existing.amount), cat: existing.cat, account: existing.account, to: existing.to, date: existing.date, note: existing.note || '' }
    : { type: 'expense', s: '', cat: null, account: accById(S.lastAccount) ? S.lastAccount : S.accounts[0].id, to: null, date: today(), note: '', ...preset };
  const rec = openSheet(`<div class="seg" style="--i:${TYPES.indexOf(d.type)}"><i class="seg-pill"></i>${TYPES.map(t =>
    `<button data-x="type" data-t="${t}" class="${t === d.type ? 'on' : ''}">${{ expense: 'Expense', income: 'Income', transfer: 'Transfer' }[t]}</button>`).join('')}</div>
    <div class="txb"></div>`, { onClose: () => document.body.classList.remove('adding') });
  document.body.classList.add('adding');
  rec.sheet.dataset.type = d.type;
  const seg = $('.seg', rec.sheet), body = $('.txb', rec.sheet);

  const accChips = (field, sel) => S.accounts.map(a =>
    `<button class="chip acc ${a.id === sel ? 'on' : ''}" data-x="${field}" data-id="${a.id}" style="--c:${a.color}">${kindOf(a).e} ${esc(a.name)} <small>${money(accBalance(a))}</small></button>`).join('');

  const draw = () => {
    body.innerHTML = `
      <div class="amount-display"><span class="cur">${esc(S.symbol)}</span><span class="amt">${prettyAmt(d.s)}</span><span class="caret"></span></div>
      ${d.type !== 'transfer' ? `<p class="label">Category</p><div class="chips cats">${S.cats[d.type].map(c =>
        `<button class="chip ${c.id === d.cat ? 'on' : ''}" data-x="cat" data-id="${c.id}">${c.emoji} ${esc(c.name)}</button>`).join('')}<button class="chip ghost" data-x="newcat">+ New</button></div>` : ''}
      <p class="label">${d.type === 'expense' ? 'Paid from' : d.type === 'income' ? 'Goes into' : 'Move from'}</p>
      <div class="chips accs">${accChips('account', d.account)}</div>
      ${d.type === 'transfer' ? `<p class="label">Move to</p><div class="chips accs-to">${accChips('to', d.to)}</div>` : ''}
      <div class="tx-meta">
        <label class="date-pill">📅 <span class="date-txt">${dayLabel(d.date)}</span><input type="date" value="${d.date}" data-x="date"></label>
        <input class="field" placeholder="Note (optional)" value="${esc(d.note)}" maxlength="60" data-x="note" enterkeyhint="done">
      </div>
      ${keypad()}
      <div class="row-btns">${existing ? '<button class="btn ghost danger" data-x="del">Delete</button>' : ''}
        <button class="btn primary block" data-x="save">${existing ? 'Save changes' : 'Save'}</button></div>`;
    sizeAmt($('.amt', body));
    $$('.chips .chip.on', body).forEach(c => c.parentElement.scrollLeft = Math.max(0, c.offsetLeft - 40));
  };
  draw();

  const select = x => $$('.chip', x.parentElement).forEach(c => c.classList.toggle('on', c === x));
  const fail = (sel, msg) => { shake($(sel, rec.sheet)); toast(msg, '', { kind: 'warn' }); };

  const submit = () => {
    const amount = strToNum(d.s);
    if (amount <= 0) return fail('.amount-display', 'Type an amount first');
    if (d.type !== 'transfer' && !catById(d.type, d.cat)) return fail('.cats', 'Pick a category');
    if (!accById(d.account)) return fail('.accs', 'Pick an account');
    if (d.type === 'transfer' && (!accById(d.to) || d.to === d.account)) return fail('.accs-to', 'Pick a different account to move money to');
    const t = {
      id: existing?.id || uid(), type: d.type, amount,
      cat: d.type === 'transfer' ? null : d.cat, account: d.account, to: d.type === 'transfer' ? d.to : null,
      date: d.date || today(), note: d.note.trim(), created: existing?.created || Date.now(),
    };
    if (existing) S.tx[S.tx.findIndex(x => x.id === existing.id)] = t;
    else S.tx.push(t);
    S.lastAccount = d.account;
    UI.flash = t.id;
    save();
    closeAllSheets();
    render(false);
    afterSave(t, !existing);
  };

  rec.sheet.addEventListener('click', e => {
    const k = e.target.closest('[data-key]');
    if (k) { d.s = applyKey(d.s, k.dataset.key); const a = $('.amt', body); a.textContent = prettyAmt(d.s); sizeAmt(a); bump($('.amount-display', body)); return; }
    const x = e.target.closest('[data-x]');
    if (!x) return;
    switch (x.dataset.x) {
      case 'type':
        if (d.type === x.dataset.t) return;
        d.type = x.dataset.t;
        rec.sheet.dataset.type = d.type;
        seg.style.setProperty('--i', TYPES.indexOf(d.type));
        $$('button', seg).forEach(b => b.classList.toggle('on', b === x));
        if (d.type !== 'transfer' && !catById(d.type, d.cat)) d.cat = null;
        if (d.type === 'transfer' && (!d.to || d.to === d.account)) d.to = S.accounts.find(a => a.id !== d.account)?.id || null;
        draw();
        break;
      case 'cat': d.cat = x.dataset.id; select(x); break;
      case 'account': d.account = x.dataset.id; select(x); break;
      case 'to': d.to = x.dataset.id; select(x); break;
      case 'newcat': catEditSheet(d.type, null, c => { if (c) { d.cat = c.id; draw(); } }); break;
      case 'save': submit(); break;
      case 'del': deleteTx(existing.id); break;
    }
  });
  rec.sheet.addEventListener('input', e => { if (e.target.dataset.x === 'note') d.note = e.target.value; });
  rec.sheet.addEventListener('change', e => {
    if (e.target.dataset.x !== 'date') return;
    d.date = e.target.value || today();
    $('.date-txt', body).textContent = dayLabel(d.date);
  });
  rec.sheet.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.x === 'note') e.target.blur(); });
}

function afterSave(t, isNew) {
  const acc = accById(t.account);
  if (t.type === 'expense') {
    toast(`${money(t.amount)} spent`, `${acc.name} is now ${money(accBalance(acc))}`, { icon: catById('expense', t.cat)?.emoji });
    if (isNew) budgetCheck(t);
  } else if (t.type === 'income') {
    toast(`${money(t.amount)} came in`, `${acc.name} is now ${money(accBalance(acc))}`, { icon: '🪙' });
    if (isNew) confetti(70, { y: innerHeight * .3 });
  } else {
    toast(`Moved ${money(t.amount)}`, `${acc.name} → ${accById(t.to).name}`, { icon: '↔' });
  }
  if (isNew && !S.celebrated) {
    S.celebrated = true; save();
    confetti(170);
    setTimeout(() => toast('First one logged!', "That's how it starts. Penny's got it from here.", { icon: '🎉' }), 700);
  }
}

function budgetCheck(t) {
  const mk = t.date.slice(0, 7), st = monthStats(mk);
  const p = st.plan.expense[t.cat] || 0, a = st.act.expense[t.cat] || 0, before = a - t.amount;
  const c = catById('expense', t.cat);
  if (!p || !c) return;
  if (a > p && before <= p) {
    setTimeout(() => toast(`${c.name} just went over plan`, `Over by ${money(a - p)} in ${monthShort(mk)}. It happens.`, { kind: 'warn', icon: '😬' }), 800);
  } else if (a >= p * .8 && before < p * .8) {
    setTimeout(() => toast(`${Math.round(a / p * 100)}% of ${c.name} used`, `${money(p - a)} left for ${monthShort(mk)}.`, { icon: '👀' }), 800);
  }
}

function deleteTx(id) {
  const i = S.tx.findIndex(t => t.id === id);
  if (i < 0) return;
  const [t] = S.tx.splice(i, 1);
  save(); closeAllSheets(); render(false);
  toast('Deleted', `${money(t.amount)} ${t.type === 'transfer' ? 'transfer' : t.type}`, {
    icon: '🗑️', action: { label: 'Undo', fn: () => { S.tx.push(t); UI.flash = t.id; save(); render(false); } },
  });
}

/* ---------- accounts ---------- */
function accountSheet(acc, opts = {}) {
  const isNew = !acc;
  const cur = acc ? accBalance(acc) : 0;
  const d = acc
    ? { name: acc.name, kind: acc.kind, color: acc.color, bal: cur }
    : { name: '', kind: 'bank', color: nextColor(opts.siblings || S.accounts), bal: 0, ...(opts.draft || {}) };
  const rec = openSheet(`<h3 class="sheet-title">${isNew ? 'New account' : 'Edit account'}</h3>
    <div class="acc-card big preview" style="--c:${d.color}"><span class="acc-emoji">${KINDS[d.kind].e}</span><span class="acc-name"></span><span class="acc-bal"></span></div>
    <p class="label">Name</p><input class="field" data-x="name" maxlength="24" placeholder="e.g. Main bank" value="${esc(d.name)}">
    <p class="label">Type</p><div class="chips wrap">${Object.entries(KINDS).map(([k, v]) =>
      `<button class="chip ${k === d.kind ? 'on' : ''}" data-x="kind" data-k="${k}">${v.e} ${v.n}</button>`).join('')}</div>
    <p class="label">Color</p><div class="swatches">${COLORS.map(c =>
      `<button class="sw ${c === d.color ? 'on' : ''}" data-x="color" data-c="${c}" style="--c:${c}" aria-label="Color ${c}"></button>`).join('')}</div>
    <p class="label">Balance right now</p><button class="field amount-btn" data-x="bal"></button>
    ${!isNew && !opts.onSave ? `<p class="hint">Fixing this won't touch your transactions. Penny just adjusts where this account started.</p>` : ''}
    <div class="row-btns" style="margin-top:18px">${!isNew ? '<button class="btn ghost danger" data-x="del">Delete</button>' : ''}
      <button class="btn primary block" data-x="save">${isNew ? 'Add account' : 'Save'}</button></div>`);
  const pv = $('.preview', rec.sheet);
  const refresh = () => {
    pv.style.setProperty('--c', d.color);
    $('.acc-emoji', pv).textContent = KINDS[d.kind].e;
    $('.acc-name', pv).textContent = d.name.trim() || KINDS[d.kind].n;
    $('.acc-bal', pv).textContent = money(d.bal);
    $('[data-x=bal]', rec.sheet).textContent = money(d.bal);
  };
  refresh();
  $('[data-x=name]', rec.sheet).addEventListener('input', e => { d.name = e.target.value; refresh(); });
  rec.sheet.addEventListener('click', async e => {
    const x = e.target.closest('[data-x]');
    if (!x) return;
    switch (x.dataset.x) {
      case 'kind': d.kind = x.dataset.k; $$('[data-x=kind]', rec.sheet).forEach(b => b.classList.toggle('on', b === x)); refresh(); bump(pv); break;
      case 'color': d.color = x.dataset.c; $$('.sw', rec.sheet).forEach(b => b.classList.toggle('on', b === x)); refresh(); bump(pv); break;
      case 'bal':
        amountSheet({ title: 'Balance right now', sub: d.kind === 'card' ? 'For a credit card, turn on "money I owe" and enter what you owe.' : 'How much is in it today?',
          value: d.bal, allowNeg: true, onDone: n => { d.bal = n; refresh(); bump(pv); } });
        break;
      case 'save': {
        const name = d.name.trim() || KINDS[d.kind].n;
        const out = { id: acc?.id || uid(), name, kind: d.kind, color: d.color, start: acc ? round2(acc.start + (d.bal - cur)) : d.bal };
        closeSheet(rec);
        if (opts.onSave) return opts.onSave(out);
        if (acc) Object.assign(acc, out); else S.accounts.push(out);
        if (!accById(S.lastAccount)) S.lastAccount = out.id;
        save(); closeAllSheets(); render(false);
        toast(acc ? 'Account updated' : 'Account added', `${name}: ${money(d.bal)}`, { icon: KINDS[d.kind].e });
        break;
      }
      case 'del': {
        if (opts.onDelete) { closeSheet(rec); return opts.onDelete(); }
        const n = S.tx.filter(t => t.account === acc.id || t.to === acc.id).length;
        const ok = await confirmSheet(`Delete ${acc.name}?`, n ? `Its ${n} transaction${n === 1 ? '' : 's'} will be deleted too.` : 'It has no transactions, so nothing else changes.', 'Delete');
        if (!ok) return;
        S.tx = S.tx.filter(t => t.account !== acc.id && t.to !== acc.id);
        S.accounts = S.accounts.filter(a => a.id !== acc.id);
        save(); closeAllSheets(); render(false);
        toast('Account deleted', acc.name, { icon: '🗑️' });
        break;
      }
    }
  });
}

function accountDetail(id) {
  const a = accById(id);
  if (!a) return;
  const list = sortedTx(S.tx.filter(t => t.account === id || t.to === id));
  const mk = thisMonth();
  let inn = 0, out = 0;
  for (const t of list) if (t.date.startsWith(mk)) { const e = txEffect(t, id); if (e > 0) inn += e; else out -= e; }
  const rec = openSheet(`
    <div class="acc-card big" style="--c:${a.color}"><span class="acc-emoji">${kindOf(a).e}</span><span class="acc-name">${esc(a.name)}</span><span class="acc-bal">${money(accBalance(a))}</span></div>
    <div class="totals two"><div><span>In this month</span><b class="up">${money(inn)}</b></div><div><span>Out this month</span><b>${money(out)}</b></div></div>
    <div class="row-btns"><button class="btn ghost block" data-x="edit">Edit</button><button class="btn primary block" data-x="add">Add expense</button></div>
    <p class="label">History</p>
    ${list.length ? `<div class="list flat">${list.slice(0, 50).map(t => txRow(t, id)).join('')}</div>` : emptyState('🌱', 'Fresh account', 'Nothing logged here yet.')}`);
  rec.sheet.addEventListener('click', e => {
    const x = e.target.closest('[data-x]');
    if (!x) return;
    closeSheet(rec);
    if (x.dataset.x === 'edit') accountSheet(a);
    if (x.dataset.x === 'add') txSheet(null, { account: id });
  });
}

function accountsListSheet() {
  const rec = openSheet(`<h3 class="sheet-title">Accounts</h3><p class="muted center small">Together: ${money(totalBalance())}</p>
    <div class="list flat" style="margin-top:14px">${S.accounts.map(a => `<button class="tx-row" data-x="edit" data-id="${a.id}">
      <span class="tx-ic" style="background:${a.color}">${kindOf(a).e}</span><span class="tx-mid"><b>${esc(a.name)}</b><small>${kindOf(a).n}</small></span>
      <span class="tx-amt">${money(accBalance(a))}</span></button>`).join('') || emptyState('🏦', 'No accounts', 'Add where your money lives.')}</div>
    <button class="btn ghost block" data-x="add" style="margin-top:12px">+ Add account</button>`);
  rec.sheet.addEventListener('click', e => {
    const x = e.target.closest('[data-x]');
    if (!x) return;
    if (x.dataset.x === 'add') accountSheet(null);
    else accountSheet(accById(x.dataset.id));
  });
}

/* ---------- categories ---------- */
function catListSheet(type) {
  const rec = openSheet(`<h3 class="sheet-title">${type === 'expense' ? 'Expense' : 'Income'} categories</h3>
    <p class="muted center small">Tap one to rename it or change its icon.</p>
    <div class="list flat cl" style="margin-top:14px"></div>
    <button class="btn ghost block" data-x="add" style="margin-top:12px">+ Add category</button>`);
  const fill = () => {
    $('.cl', rec.sheet).innerHTML = S.cats[type].map(c => {
      const n = usage(type, c.id);
      return `<button class="tx-row" data-x="edit" data-id="${c.id}"><span class="tx-ic">${c.emoji}</span>
        <span class="tx-mid"><b>${esc(c.name)}</b><small>${n ? `${n} transaction${n === 1 ? '' : 's'}` : 'Not used yet'}</small></span><span class="chev">›</span></button>`;
    }).join('');
  };
  fill();
  rec.sheet.addEventListener('click', e => {
    const x = e.target.closest('[data-x]');
    if (!x) return;
    if (x.dataset.x === 'add') catEditSheet(type, null, fill);
    if (x.dataset.x === 'edit') catEditSheet(type, catById(type, x.dataset.id), fill);
  });
}

function catEditSheet(type, cat, after) {
  const d = cat ? { ...cat } : { id: uid(), name: '', emoji: type === 'expense' ? '🧾' : '💰' };
  const rec = openSheet(`<h3 class="sheet-title">${cat ? 'Edit category' : 'New category'}</h3>
    <div class="cat-preview"><span class="tx-ic big">${d.emoji}</span></div>
    <p class="label">Name</p><input class="field" data-x="name" maxlength="24" placeholder="e.g. Groceries" value="${esc(d.name)}">
    <p class="label">Icon</p><div class="emoji-grid">${EMOJIS.map(e => `<button data-x="emoji" data-e="${e}" class="${e === d.emoji ? 'on' : ''}">${e}</button>`).join('')}</div>
    <div class="row-btns" style="margin-top:18px">${cat ? '<button class="btn ghost danger" data-x="del">Delete</button>' : ''}
      <button class="btn primary block" data-x="save">${cat ? 'Save' : 'Add category'}</button></div>`);
  const nameEl = $('[data-x=name]', rec.sheet);
  nameEl.addEventListener('input', () => { d.name = nameEl.value; });
  rec.sheet.addEventListener('click', async e => {
    const x = e.target.closest('[data-x]');
    if (!x) return;
    if (x.dataset.x === 'emoji') {
      d.emoji = x.dataset.e;
      $$('.emoji-grid button', rec.sheet).forEach(b => b.classList.toggle('on', b === x));
      const pv = $('.cat-preview .tx-ic', rec.sheet); pv.textContent = d.emoji; bump(pv);
    }
    if (x.dataset.x === 'save') {
      d.name = d.name.trim();
      if (!d.name) { shake(nameEl); return toast('Give it a name', '', { kind: 'warn' }); }
      if (cat) Object.assign(catById(type, cat.id), d); else S.cats[type].push(d);
      save(); closeSheet(rec); render(false);
      if (after) after(d);
    }
    if (x.dataset.x === 'del') {
      const n = usage(type, cat.id);
      if (n) return toast("Can't delete this one yet", `${n} transaction${n === 1 ? ' uses' : 's use'} it. Rename it instead.`, { kind: 'warn' });
      if (!await confirmSheet(`Delete ${cat.name}?`, 'Its planned amounts go with it.', 'Delete')) return;
      S.cats[type] = S.cats[type].filter(c => c.id !== cat.id);
      save(); closeSheet(rec); render(false);
      if (after) after(null);
    }
  });
}

function planSheet(type, id) {
  const c = catById(type, id);
  if (!c) return;
  const mk = UI.month, st = monthStats(mk);
  const a = st.act[type][id] || 0;
  amountSheet({
    title: `${c.emoji} ${c.name}`,
    sub: `Plan for ${monthName(mk)}. ${type === 'expense' ? 'Spent' : 'Received'} ${money(a)} so far.`,
    value: st.plan[type][id] || 0, cta: 'Save plan',
    extra: { label: 'Rename or change icon', fn: () => catEditSheet(type, c) },
    onDone: n => { setPlanned(mk, type, id, Math.max(0, n)); render(false); toast('Plan saved', `${c.name}: ${money(Math.max(0, n))} for ${monthShort(mk)}`, { icon: '🎯' }); },
  });
}

/* ---------- small dialogs ---------- */
function confirmSheet(title, body, ok = 'Delete', danger = true) {
  return new Promise(res => {
    let done = false;
    const rec = openSheet(`<h3 class="sheet-title">${esc(title)}</h3><p class="muted center" style="margin:6px 8px 20px">${esc(body)}</p>
      <div class="row-btns"><button class="btn ghost block" data-x="no">Cancel</button><button class="btn block ${danger ? 'red' : 'primary'}" data-x="yes">${esc(ok)}</button></div>`,
      { onClose: () => { if (!done) res(false); } });
    rec.sheet.addEventListener('click', e => {
      const x = e.target.closest('[data-x]');
      if (!x) return;
      done = true; closeSheet(rec); res(x.dataset.x === 'yes');
    });
  });
}

function textSheet({ title, value, placeholder, onDone }) {
  const rec = openSheet(`<h3 class="sheet-title">${esc(title)}</h3>
    <input class="field" style="margin-top:14px" maxlength="30" placeholder="${esc(placeholder)}" value="${esc(value)}" enterkeyhint="done">
    <button class="btn primary block" data-x="ok" style="margin-top:14px">Save</button>`);
  const inp = $('input', rec.sheet);
  const done = () => { closeSheet(rec); onDone(inp.value.trim()); };
  $('[data-x=ok]', rec.sheet).addEventListener('click', done);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') done(); });
}

const curGrid = sel => CURRENCIES.map(([c, s, n]) => `<button class="cur-opt ${c === sel ? 'on' : ''}" data-c="${c}"><b>${esc(s)}</b><span>${n}</span></button>`).join('');
function currencySheet() {
  const rec = openSheet(`<h3 class="sheet-title">Currency</h3><div class="cur-grid">${curGrid(S.currency)}</div>`);
  rec.sheet.addEventListener('click', e => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    setCurrency(b.dataset.c); closeSheet(rec); render(false);
    toast('Currency updated', `Amounts now show in ${S.symbol}.`, { icon: '💱' });
  });
}

function installSheet() {
  const share = '<svg viewBox="0 0 24 24" class="ios-share"><path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const rec = openSheet(`<h3 class="sheet-title">Put Penny on your Home Screen</h3>
    <p class="muted center small">Then it opens full screen like any other app, even with no internet.</p>
    <ol class="steps">
      <li><span><b>Open this page in Safari.</b> On iPhone, only Safari can do this.</span></li>
      <li><span><b>Tap the Share button</b> ${share} at the bottom of the screen. If you don't see it, tap the <b>•••</b> button first, then Share.</span></li>
      <li><span>Scroll down and tap <b>Add to Home Screen</b>.</span></li>
      <li><span>Tap <b>Add</b>. Look for the orange Penny jar on your Home Screen.</span></li>
    </ol>
    <button class="btn primary block" data-x="ok">Got it</button>`);
  $('[data-x=ok]', rec.sheet).addEventListener('click', () => closeSheet(rec));
}

/* ---------- backup ---------- */
async function shareFile(text, name, type) {
  const file = new File([text], name, { type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return true; }
    catch (e) { if (e.name === 'AbortError') return false; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  return true;
}

async function exportBackup() {
  const ok = await shareFile(JSON.stringify(S), `penny-backup-${today()}.json`, 'application/json');
  if (!ok) return;
  S.lastBackup = Date.now(); save(); render(false);
  toast('Backup ready', 'Pick "Save to Files" to keep it safe.', { icon: '💾' });
}

function exportCSV() {
  const rows = [['Date', 'Type', 'Amount', 'Category', 'Account', 'To account', 'Note']];
  for (const t of sortedTx(S.tx).reverse()) {
    rows.push([t.date, t.type, t.amount, t.cat ? catById(t.type, t.cat)?.name || '' : '', accById(t.account)?.name || '', t.to ? accById(t.to)?.name || '' : '', t.note || '']);
  }
  const csv = rows.map(r => r.map(v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')).join('\n');
  shareFile(csv, `penny-transactions-${today()}.csv`, 'text/csv');
}

function importBackup() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.addEventListener('change', async () => {
    const f = inp.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.accounts) || !Array.isArray(data.tx) || !data.cats) throw new Error('not a backup');
      const onboarding = document.body.classList.contains('onboarding');
      if (!onboarding && !await confirmSheet('Restore this backup?', `It has ${data.accounts.length} accounts and ${data.tx.length} transactions. It replaces everything on this phone now.`, 'Restore', false)) return;
      S = Object.assign(freshState(), data, { onboarded: true });
      save(); applyTheme();
      if (onboarding) finishOnboarding(true); else render();
      toast('Backup restored', `${data.tx.length} transactions are back.`, { icon: '📦' });
    } catch (e) {
      toast("That file didn't work", 'Pick a backup file that Penny saved.', { kind: 'bad' });
    }
  });
  inp.click();
}

/* ---------- toasts & confetti ---------- */
function toast(title, sub = '', opts = {}) {
  const box = $('#toasts');
  while (box.children.length > 2) box.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = `toast ${opts.kind || ''}`;
  el.innerHTML = `${opts.icon ? `<span class="t-ic">${opts.icon}</span>` : ''}<div class="t-body"><b>${esc(title)}</b>${sub ? `<span class="t-sub">${esc(sub)}</span>` : ''}</div>${opts.action ? `<button>${esc(opts.action.label)}</button>` : ''}`;
  box.appendChild(el);
  let gone = false;
  const dismiss = () => { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  if (opts.action) $('button', el).addEventListener('click', () => { opts.action.fn(); dismiss(); });
  el.addEventListener('click', e => { if (!e.target.closest('button')) dismiss(); });
  setTimeout(dismiss, opts.action ? 5500 : 3400);
}

const parts = [];
let confettiRunning = false;
function confetti(n = 120, origin = {}) {
  if (reduceMotion) return;
  const c = $('#confetti'), ctx = c.getContext('2d');
  if (!confettiRunning) {
    const dpr = devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const cols = ['#F2622E', '#2F4560', '#2E8A57', '#F2B33D', '#E9DCC6', '#8EA8C8'];
  const ox = origin.x ?? innerWidth / 2, oy = origin.y ?? innerHeight * .38;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
    parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 7, g: .32 + Math.random() * .12,
      w: 6 + Math.random() * 6, h: 9 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - .5) * .35,
      c: pick(cols), t: Math.random() * 10, round: Math.random() < .3 });
  }
  if (confettiRunning) return;
  confettiRunning = true;
  const tick = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += p.g; p.vx *= .985; p.vy *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.t += .15;
      if (p.y > innerHeight + 40) { parts.splice(i, 1); continue; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2 * Math.abs(Math.cos(p.t)), p.w, p.h * Math.abs(Math.cos(p.t)) + 1);
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(tick);
    else { confettiRunning = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  };
  requestAnimationFrame(tick);
}

/* ---------- onboarding ---------- */
const OB = { step: 0, name: '', accounts: [] };
const obNav = label => `<div class="ob-nav"><button class="btn ghost" data-ob="back" aria-label="Back">←</button><button class="btn primary block" data-ob="next">${label}</button></div>`;
const obName = () => OB.name.trim() ? ', ' + esc(OB.name.trim()) : '';
const OB_STEPS = [
  () => `<div class="ob-hero">${jarSVG(.62, 'obj1')}</div>
    <h1 class="ob-title">Hi, I'm <em>Penny</em>.</h1>
    <p class="ob-text">I keep an eye on where your money goes, so you don't have to hold it all in your head.</p>
    <div class="ob-actions"><button class="btn primary block" data-ob="next">Let's set things up</button><button class="link" data-ob="import">I have a backup file</button></div>`,
  () => `<h1 class="ob-title">First things first. What should I call you?</h1>
    <input class="field big" id="ob-name" placeholder="Your first name" value="${esc(OB.name)}" maxlength="30" autocomplete="given-name" enterkeyhint="next">
    <div class="ob-actions">${obNav('Next')}</div>`,
  () => `<h1 class="ob-title">Which currency do you use${obName()}?</h1>
    <p class="ob-text">You can change this later.</p>
    <div class="cur-grid">${curGrid(S.currency)}</div>
    <div class="ob-actions">${obNav('Next')}</div>`,
  () => `<h1 class="ob-title">Where does your money live?</h1>
    <p class="ob-text">Add every place you keep money, and how much is in it right now. Tap one to change it.</p>
    <div class="ob-accs">${OB.accounts.map(a => `<div class="ob-acc" style="--c:${a.color}" data-ob="edit" data-id="${a.id}">
      <span class="acc-emoji">${KINDS[a.kind].e}</span><span class="nm">${esc(a.name)}</span><span class="bal">${money(a.start)}</span>
      <button class="x" data-ob="remove" data-id="${a.id}" aria-label="Remove">✕</button></div>`).join('') || '<p class="muted">No accounts yet. Add one below.</p>'}</div>
    <p class="label">Add another</p>
    <div class="chips wrap">${Object.entries(KINDS).map(([k, v]) => `<button class="chip" data-ob="addkind" data-k="${k}">+ ${v.e} ${v.n}</button>`).join('')}</div>
    <div class="ob-actions">${obNav('Next')}</div>`,
  () => {
    const tot = sum(OB.accounts.map(a => a.start));
    return `<div class="ob-hero">${jarSVG(.88, 'obj2')}</div>
      <h1 class="ob-title">You're all set${obName()}.</h1>
      <p class="ob-text">You're starting with <b>${money(tot)}</b> across ${OB.accounts.length} account${OB.accounts.length === 1 ? '' : 's'}. Whenever you spend, tap the orange <b>+</b> and Penny takes it off the right account.</p>
      <div class="ob-actions"><button class="btn primary block" data-ob="finish">Open Penny</button><button class="link" data-ob="back">Go back</button></div>`;
  },
];

function startOnboarding() {
  document.body.classList.add('onboarding');
  setCurrency(guessCurrency());
  OB.accounts = [
    { id: uid(), name: 'Bank', kind: 'bank', color: COLORS[0], start: 0 },
    { id: uid(), name: 'Cash', kind: 'cash', color: COLORS[2], start: 0 },
  ];
  drawOB(1);
}
function drawOB(dir) {
  const el = $('#onboard');
  el.innerHTML = `<div class="ob-dots">${OB_STEPS.map((_, i) => `<i class="${i === OB.step ? 'on' : i < OB.step ? 'done' : ''}"></i>`).join('')}</div>
    <div class="ob-step ${dir > 0 ? 'fwd' : dir < 0 ? 'back' : ''}">${OB_STEPS[OB.step]()}</div>`;
  hydrate(el);
}
function finishOnboarding(restored) {
  if (!restored) {
    S.name = OB.name.trim(); S.accounts = OB.accounts; S.onboarded = true;
    S.lastAccount = S.accounts[0]?.id || null;
    save();
  }
  const ob = $('#onboard');
  ob.classList.add('leaving');
  UI.tab = 'home';
  render();
  setTimeout(() => { document.body.classList.remove('onboarding'); ob.classList.remove('leaving'); ob.innerHTML = ''; }, 480);
  if (!restored) setTimeout(() => confetti(170), 250);
}

$('#onboard').addEventListener('click', e => {
  const c = e.target.closest('[data-c]');
  if (c) { setCurrency(c.dataset.c); $$('.cur-opt', $('#onboard')).forEach(b => b.classList.toggle('on', b === c)); return; }
  const el = e.target.closest('[data-ob]');
  if (!el) return;
  switch (el.dataset.ob) {
    case 'next':
      if (OB.step === 3 && !OB.accounts.length) { shake($('.ob-accs')); return toast('Add at least one account', 'Even a Cash one with 0 in it is fine.', { kind: 'warn' }); }
      OB.step++; drawOB(1);
      if (OB.step === 4) setTimeout(() => confetti(60), 200);
      break;
    case 'back': OB.step--; drawOB(-1); break;
    case 'import': importBackup(); break;
    case 'finish': finishOnboarding(false); break;
    case 'addkind': {
      const k = el.dataset.k;
      accountSheet(null, { draft: { kind: k }, siblings: OB.accounts, onSave: acc => { OB.accounts.push(acc); drawOB(0); } });
      break;
    }
    case 'edit': {
      const acc = OB.accounts.find(x => x.id === el.dataset.id);
      accountSheet(acc, {
        onSave: v => { Object.assign(acc, v); drawOB(0); },
        onDelete: () => { OB.accounts = OB.accounts.filter(x => x !== acc); drawOB(0); },
      });
      break;
    }
    case 'remove': OB.accounts = OB.accounts.filter(x => x.id !== el.dataset.id); drawOB(0); break;
  }
});
$('#onboard').addEventListener('input', e => { if (e.target.id === 'ob-name') OB.name = e.target.value; });
$('#onboard').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'ob-name') { e.target.blur(); OB.step++; drawOB(1); }
});

/* ---------- global actions ---------- */
const ACT = {
  tab: el => {
    const t = el.dataset.tab;
    if (t === UI.tab) return window.scrollTo({ top: 0, behavior: 'smooth' });
    UI.tab = t; window.scrollTo(0, 0); render();
  },
  goto: el => { UI.tab = el.dataset.to; window.scrollTo(0, 0); render(); },
  add: () => txSheet(),
  tx: el => { const t = S.tx.find(x => x.id === el.dataset.id); if (t) txSheet(t); },
  month: el => {
    const dir = +el.dataset.d;
    UI.month = shiftMonth(UI.month, dir); render(false);
    $('.month-switch .m')?.classList.add(dir > 0 ? 'next' : 'prev');
  },
  monthNow: () => { if (UI.month === thisMonth()) return; UI.month = thisMonth(); render(false); $('.month-switch .m')?.classList.add('prev'); },
  filter: el => {
    UI.filter = el.dataset.f;
    const seg = el.parentElement;
    seg.style.setProperty('--i', $$('button', seg).indexOf(el));
    $$('button', seg).forEach(b => b.classList.toggle('on', b === el));
    $('#act-list').innerHTML = activityList();
  },
  account: el => accountDetail(el.dataset.id),
  addAccount: () => accountSheet(null),
  plan: el => planSheet(el.dataset.type, el.dataset.id),
  newCat: el => catEditSheet(el.dataset.type, null),
  jar: el => {
    const j = $('.jar', el);
    j.classList.remove('jiggle'); void j.getBoundingClientRect(); j.classList.add('jiggle');
    toast(pick(JAR_QUIPS), '', { icon: '🫙' });
  },
  installHelp: () => installSheet(),
  hideInstall: () => { S.hideInstall = true; save(); render(false); },
  setName: () => textSheet({ title: 'What should I call you?', value: S.name, placeholder: 'Your first name', onDone: v => { S.name = v; save(); render(false); } }),
  setCurrency: () => currencySheet(),
  theme: el => {
    S.theme = el.dataset.v; save(); applyTheme();
    const seg = el.parentElement;
    seg.style.setProperty('--i', $$('button', seg).indexOf(el));
    $$('button', seg).forEach(b => b.classList.toggle('on', b === el));
  },
  accounts: () => accountsListSheet(),
  cats: el => catListSheet(el.dataset.type),
  export: () => exportBackup(),
  import: () => importBackup(),
  csv: () => exportCSV(),
  erase: async () => {
    if (!await confirmSheet('Erase everything?', 'All accounts, transactions and plans on this phone will be gone. Save a backup first if you might want them back.', 'Erase')) return;
    localStorage.removeItem(KEY);
    location.reload();
  },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act];
  if (fn) fn(el, e);
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { UI.q = e.target.value; $('#act-list').innerHTML = activityList(); }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.onboarded && !sheets.length) render(false);
});

function applyTheme() {
  const r = document.documentElement;
  if (S.theme === 'auto') delete r.dataset.theme; else r.dataset.theme = S.theme;
  const dark = S.theme === 'dark' || (S.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $$('meta[name="theme-color"]').forEach(m => m.setAttribute('content', dark ? '#111315' : '#F5F0E6'));
}

/* ---------- boot ---------- */
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
if (S.onboarded) render(); else startOnboarding();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

})();
