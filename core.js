/* Penny core: pure money logic, no DOM. Loaded by the app and by the unit tests. */
(function (root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  else root.PennyCore = core;
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

/* ---------- helpers ---------- */
const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = arr => arr.reduce((s, n) => s + n, 0);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
const shiftMonth = (mk, n) => { const d = parseDate(mk + '-01'); d.setMonth(d.getMonth() + n); return isoDate(d).slice(0, 7); };
const daysInMonth = mk => { const [y, m] = mk.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const DAY = 864e5;

function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseDate(s);
  return isoDate(d) === s;
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
const KINDS = {
  bank: { e: '🏦', n: 'Bank' }, cash: { e: '💵', n: 'Cash' }, card: { e: '💳', n: 'Card' },
  wallet: { e: '📱', n: 'Wallet' }, savings: { e: '🐷', n: 'Savings' },
};
const COLORS = ['#2F4560', '#F2622E', '#2E8A57', '#B9773A', '#6C5A9C', '#C2412E', '#2E7F8F', '#3A3A3A'];
const DEFAULT_CATS = {
  expense: [['food', 'Food', '🍜'], ['gifts', 'Gifts', '🎁'], ['health', 'Health/medical', '💊'], ['home', 'Home', '🏠'],
    ['transport', 'Transportation', '🚌'], ['personal', 'Personal', '🧴'], ['pets', 'Pets', '🐾'], ['utilities', 'Utilities', '💡'],
    ['travel', 'Travel', '✈️'], ['debt', 'Debt', '💳'], ['other', 'Other', '📦']],
  income: [['savings', 'Savings', '🐷'], ['paycheck', 'Paycheck', '💼'], ['bonus', 'Bonus', '✨'],
    ['interest', 'Interest', '📈'], ['other-in', 'Other', '🪙']],
};
const BACKUP_EVERY = [0, 7, 14, 30];
const MAX_AMOUNT = 9999999999.99;

const nextColor = list => COLORS.find(c => !list.some(a => a.color === c)) || COLORS[list.length % COLORS.length];

/* ---------- state ---------- */
function freshState() {
  const cats = {};
  for (const t of ['expense', 'income']) cats[t] = DEFAULT_CATS[t].map(([id, name, emoji]) => ({ id, name, emoji }));
  return {
    v: 1, onboarded: false, name: '', currency: 'USD', symbol: '$', theme: 'auto',
    accounts: [], cats, budgets: {}, tx: [], lastAccount: null,
    celebrated: false, hideInstall: false, lastBackup: null, createdAt: Date.now(),
    hideAmounts: false, hideOnOpen: false, backupEvery: 14, backupSnooze: null,
    nudgeDaily: true, nudgeDismissed: null, recapSeen: {},
  };
}

const str = (v, max, fallback = '') => (typeof v === 'string' ? v.trim().slice(0, max) : fallback) || fallback;
const num = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const idOk = v => typeof v === 'string' && v.length > 0 && v.length <= 64;

/* Cleans anything loaded from storage or a backup file. Never throws. */
function normalize(raw) {
  const S = freshState();
  const report = { droppedTx: 0, fixed: 0 };
  if (!raw || typeof raw !== 'object') return { state: S, report };

  S.onboarded = !!raw.onboarded;
  S.name = str(raw.name, 30);
  const cur = CURRENCIES.find(c => c[0] === raw.currency) || CURRENCIES[1];
  S.currency = cur[0]; S.symbol = cur[1];
  S.theme = ['auto', 'light', 'dark'].includes(raw.theme) ? raw.theme : 'auto';
  S.celebrated = !!raw.celebrated;
  S.hideInstall = !!raw.hideInstall;
  S.hideAmounts = !!raw.hideAmounts;
  S.hideOnOpen = !!raw.hideOnOpen;
  S.nudgeDaily = raw.nudgeDaily !== false;
  S.nudgeDismissed = isValidDate(raw.nudgeDismissed) ? raw.nudgeDismissed : null;
  S.backupEvery = BACKUP_EVERY.includes(raw.backupEvery) ? raw.backupEvery : 14;
  S.lastBackup = num(raw.lastBackup, null);
  S.backupSnooze = num(raw.backupSnooze, null);
  S.recapSeen = {};
  if (raw.recapSeen && typeof raw.recapSeen === 'object') {
    for (const k of Object.keys(raw.recapSeen)) if (/^\d{4}-\d{2}$/.test(k)) S.recapSeen[k] = true;
  }

  // accounts
  const seenAcc = new Set();
  S.accounts = [];
  for (const a of Array.isArray(raw.accounts) ? raw.accounts : []) {
    if (!a || typeof a !== 'object') { report.fixed++; continue; }
    let id = idOk(a.id) ? a.id : uid();
    if (seenAcc.has(id)) { report.fixed++; continue; }
    seenAcc.add(id);
    const kind = KINDS[a.kind] ? a.kind : 'bank';
    S.accounts.push({
      id, kind,
      name: str(a.name, 24, KINDS[kind].n),
      color: /^#[0-9a-fA-F]{6}$/.test(a.color) ? a.color : nextColor(S.accounts),
      start: round2(clamp(num(a.start), -MAX_AMOUNT, MAX_AMOUNT)),
    });
  }

  // categories
  if (raw.cats && typeof raw.cats === 'object') {
    for (const t of ['expense', 'income']) {
      if (!Array.isArray(raw.cats[t])) continue;
      const seen = new Set(), list = [];
      for (const c of raw.cats[t]) {
        if (!c || !idOk(c.id) || seen.has(c.id)) { report.fixed++; continue; }
        seen.add(c.id);
        list.push({ id: c.id, name: str(c.name, 24, 'Untitled'), emoji: str(c.emoji, 16, '•') });
      }
      if (list.length) S.cats[t] = list;
    }
  }
  const fallbackCat = t => (S.cats[t].find(c => /^other/.test(c.id)) || S.cats[t][S.cats[t].length - 1]).id;

  // budgets
  if (raw.budgets && typeof raw.budgets === 'object') {
    for (const mk of Object.keys(raw.budgets)) {
      if (!/^\d{4}-\d{2}$/.test(mk)) continue;
      const b = raw.budgets[mk] || {}, out = { expense: {}, income: {} };
      for (const t of ['expense', 'income']) {
        if (!b[t] || typeof b[t] !== 'object') continue;
        for (const [cid, v] of Object.entries(b[t])) {
          const n = num(v, -1);
          if (n >= 0) out[t][cid] = round2(Math.min(n, MAX_AMOUNT));
        }
      }
      S.budgets[mk] = out;
    }
  }

  // transactions
  const accIds = new Set(S.accounts.map(a => a.id)), txIds = new Set();
  for (const t of Array.isArray(raw.tx) ? raw.tx : []) {
    const bad = !t || typeof t !== 'object' || !TYPES.includes(t.type) || !isValidDate(t.date) || !accIds.has(t.account)
      || !(num(t.amount) > 0) || (t.type === 'transfer' && (!accIds.has(t.to) || t.to === t.account));
    if (bad) { report.droppedTx++; continue; }
    let id = idOk(t.id) && !txIds.has(t.id) ? t.id : uid();
    txIds.add(id);
    let cat = null;
    if (t.type !== 'transfer') {
      cat = S.cats[t.type].some(c => c.id === t.cat) ? t.cat : fallbackCat(t.type);
      if (cat !== t.cat) report.fixed++;
    }
    S.tx.push({
      id, type: t.type, amount: round2(Math.min(t.amount, MAX_AMOUNT)), cat, account: t.account,
      to: t.type === 'transfer' ? t.to : null, date: t.date, note: str(t.note, 60),
      created: num(t.created, parseDate(t.date).getTime()),
    });
  }

  S.lastAccount = accIds.has(raw.lastAccount) ? raw.lastAccount : (S.accounts[0]?.id || null);
  const firstTx = S.tx.reduce((m, t) => Math.min(m, t.created), Date.now());
  S.createdAt = num(raw.createdAt, firstTx);
  return { state: S, report };
}

function isBackup(data) {
  return !!data && typeof data === 'object' && Array.isArray(data.accounts) && Array.isArray(data.tx) && !!data.cats;
}

/* ---------- queries ---------- */
function txEffect(t, accId) {
  if (t.type === 'expense') return t.account === accId ? -t.amount : 0;
  if (t.type === 'income') return t.account === accId ? t.amount : 0;
  return (t.to === accId ? t.amount : 0) - (t.account === accId ? t.amount : 0);
}

function balances(S) {
  const out = {};
  for (const a of S.accounts) out[a.id] = a.start;
  for (const t of S.tx) {
    if (t.type === 'expense') { if (t.account in out) out[t.account] -= t.amount; }
    else if (t.type === 'income') { if (t.account in out) out[t.account] += t.amount; }
    else {
      if (t.account in out) out[t.account] -= t.amount;
      if (t.to in out) out[t.to] += t.amount;
    }
  }
  for (const k in out) out[k] = round2(out[k]);
  return out;
}
const totalBalance = S => round2(sum(Object.values(balances(S))));

function balanceAtMonthStart(S, mk) {
  let s = sum(S.accounts.map(a => a.start));
  for (const t of S.tx) {
    if (t.date.slice(0, 7) >= mk) continue;
    if (t.type === 'income') s += t.amount;
    else if (t.type === 'expense') s -= t.amount;
  }
  return round2(s);
}

// A month without its own plan borrows the latest earlier month's plan.
function getBudget(S, mk) {
  if (S.budgets[mk]) return S.budgets[mk];
  const prev = Object.keys(S.budgets).filter(k => k < mk).sort().pop();
  return prev ? S.budgets[prev] : { expense: {}, income: {} };
}
function setPlanned(S, mk, type, cat, val) {
  if (!S.budgets[mk]) S.budgets[mk] = JSON.parse(JSON.stringify(getBudget(S, mk)));
  S.budgets[mk][type] = S.budgets[mk][type] || {};
  S.budgets[mk][type][cat] = round2(clamp(num(val), 0, MAX_AMOUNT));
}

function monthStats(S, mk) {
  const b = getBudget(S, mk);
  const plan = { expense: b.expense || {}, income: b.income || {} };
  const act = { expense: {}, income: {} };
  let inc = 0, exp = 0, count = 0;
  for (const t of S.tx) {
    if (t.type === 'transfer' || t.date.slice(0, 7) !== mk) continue;
    act[t.type][t.cat] = round2((act[t.type][t.cat] || 0) + t.amount);
    if (t.type === 'income') inc += t.amount; else exp += t.amount;
    count++;
  }
  const plannedExp = round2(sum(S.cats.expense.map(c => plan.expense[c.id] || 0)));
  const plannedInc = round2(sum(S.cats.income.map(c => plan.income[c.id] || 0)));
  const start = balanceAtMonthStart(S, mk);
  inc = round2(inc); exp = round2(exp);
  const end = round2(start + inc - exp);
  return { plan, act, inc, exp, count, plannedExp, plannedInc, start, end, saved: round2(end - start) };
}

function streak(S, now = new Date()) {
  const days = new Set(S.tx.map(t => isoDate(new Date(t.created))));
  const d = new Date(now); let n = 0;
  if (!days.has(isoDate(d))) d.setDate(d.getDate() - 1);
  while (days.has(isoDate(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

const sortedTx = list => list.slice().sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);

function backupDue(S, now = Date.now()) {
  if (!S.backupEvery || !S.tx.length) return null;
  if (S.backupSnooze && now < S.backupSnooze) return null;
  const since = S.lastBackup || S.createdAt || now;
  const days = Math.floor((now - since) / DAY);
  return days >= S.backupEvery ? { days, never: !S.lastBackup } : null;
}

/* ---------- monthly recap ---------- */
function recap(S, mk, now = new Date()) {
  const st = monthStats(S, mk), prev = monthStats(S, shiftMonth(mk, -1));
  const txs = S.tx.filter(t => t.type !== 'transfer' && t.date.slice(0, 7) === mk);
  const expenses = txs.filter(t => t.type === 'expense');
  const top = Object.entries(st.act.expense)
    .map(([id, amt]) => ({ cat: S.cats.expense.find(c => c.id === id), amt }))
    .filter(r => r.cat).sort((a, b) => b.amt - a.amt).slice(0, 3)
    .map(r => ({ ...r, pct: st.exp ? Math.round(r.amt / st.exp * 100) : 0 }));
  const biggest = expenses.slice().sort((a, b) => b.amount - a.amount || a.date.localeCompare(b.date))[0] || null;
  const curMonth = isoDate(now).slice(0, 7);
  const lastDay = mk === curMonth ? now.getDate() : (mk > curMonth ? 0 : daysInMonth(mk));
  const spendDays = new Set(expenses.map(t => t.date));
  let noSpend = 0;
  for (let d = 1; d <= lastDay; d++) if (!spendDays.has(`${mk}-${pad(d)}`)) noSpend++;
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const t of expenses) byWeekday[parseDate(t.date).getDay()] += t.amount;
  const busiestWeekday = expenses.length ? byWeekday.indexOf(Math.max(...byWeekday)) : null;
  const planned = S.cats.expense.filter(c => st.plan.expense[c.id] > 0);
  const under = planned.filter(c => (st.act.expense[c.id] || 0) <= st.plan.expense[c.id]).length;
  const vsPrev = prev.exp > 0 ? Math.round((st.exp / prev.exp - 1) * 100) : null;
  return {
    mk, inc: st.inc, exp: st.exp, saved: round2(st.inc - st.exp),
    keptPct: st.inc > 0 ? Math.round((st.inc - st.exp) / st.inc * 100) : null,
    count: txs.length, top, biggest, noSpend, daysCounted: lastDay, busiestWeekday,
    plannedCount: planned.length, underCount: under, vsPrev, prevExp: prev.exp,
  };
}

/* ---------- formatting & input ---------- */
function formatMoney(n, { symbol = '$', plus = false, hidden = false } = {}) {
  const v = round2(Math.abs(n));
  const sym = /^[A-Za-z]/.test(symbol) ? symbol + ' ' : symbol;
  const sign = n <= -0.005 ? '−' : (plus && n >= 0.005 ? '+' : '');
  if (hidden) return sign + sym + '•••••';
  const body = v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return sign + sym + body;
}

function applyKey(s, k) {
  if (k === 'back') return s.slice(0, -1);
  if (k === '.') return s.includes('.') ? s : (s || '0') + '.';
  if (!/^\d$/.test(k)) return s;
  if (s.includes('.')) return s.split('.')[1].length >= 2 ? s : s + k;
  if (s.replace(/^0+/, '').length >= 10) return s;
  return s === '0' ? k : s + k;
}
const strToNum = s => { const n = parseFloat(s); return Number.isFinite(n) ? round2(Math.min(n, MAX_AMOUNT)) : 0; };
function prettyAmt(s) {
  const [i, d] = (s || '0').split('.');
  return Number(i || 0).toLocaleString('en-US') + (d !== undefined ? '.' + d : '');
}

function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = "'" + s; // stop spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCSV(S) {
  const cat = (t) => t.cat ? (S.cats[t.type].find(c => c.id === t.cat)?.name || '') : '';
  const acc = id => S.accounts.find(a => a.id === id)?.name || '';
  const rows = [['Date', 'Type', 'Amount', 'Category', 'Account', 'To account', 'Note']];
  for (const t of sortedTx(S.tx).reverse()) rows.push([t.date, t.type, t.amount, cat(t), acc(t.account), t.to ? acc(t.to) : '', t.note || '']);
  return rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}

return {
  round2, sum, clamp, uid, pad, isoDate, parseDate, shiftMonth, daysInMonth, isValidDate, DAY,
  KEY, TYPES, CURRENCIES, KINDS, COLORS, DEFAULT_CATS, BACKUP_EVERY, MAX_AMOUNT, nextColor,
  freshState, normalize, isBackup, txEffect, balances, totalBalance, balanceAtMonthStart,
  getBudget, setPlanned, monthStats, streak, sortedTx, backupDue, recap,
  formatMoney, applyKey, strToNum, prettyAmt, csvCell, toCSV,
};
});
