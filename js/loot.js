'use strict';
// ===== ЛУТ: 5 слотів, 5 рідкостей, афікси, дропи, інвентар [I] =====

const SLOTS = [
  { id: 'weapon', name: 'Зброя' }, { id: 'helmet', name: 'Шолом' }, { id: 'armor', name: 'Броня' },
  { id: 'amulet', name: 'Амулет' }, { id: 'ring', name: 'Кільце' },
];
const RARITY = [
  { name: 'Звичайний', color: '#9a9a9a', aff: 0, mul: 1.0, w: 50 },
  { name: 'Незвичайний', color: '#4ac05a', aff: 1, mul: 1.1, w: 32 },
  { name: 'Рідкісний', color: '#4a8ae0', aff: 2, mul: 1.2, w: 14 },
  { name: 'Епічний', color: '#b060e0', aff: 3, mul: 1.35, w: 3.5 },
  { name: 'Легендарний', color: '#f0b030', aff: 4, mul: 1.5, w: 0.5 },
];
const BAG_SIZE = 12;

// стат: підпис, формат, застосування до модифікаторів, діапазон при ilvl 0
const pc = (v) => '+' + Math.round(v * 100) + '%';
const STAT = {
  dmg:   { label: 'Шкода',               fmt: pc,                          lo: 0.04, hi: 0.08, apply: (m, v) => { m.dmgMul *= 1 + v; } },
  hp:    { label: 'Здоров’я',            fmt: pc,                          lo: 0.05, hi: 0.10, apply: (m, v) => { m.hpMul *= 1 + v; } },
  hpf:   { label: 'Здоров’я',            fmt: (v) => '+' + Math.round(v),  lo: 12,   hi: 24,   apply: (m, v) => { m.hpAdd += v; }, flat: true },
  crit:  { label: 'Шанс крита',          fmt: pc,                          lo: 0.02, hi: 0.04, apply: (m, v) => { m.crit += v; } },
  critd: { label: 'Шкода крита',         fmt: pc,                          lo: 0.10, hi: 0.20, apply: (m, v) => { m.critDmg += v; } },
  as:    { label: 'Швидкість атаки',     fmt: pc,                          lo: 0.04, hi: 0.08, apply: (m, v) => { m.asMul *= 1 + v; } },
  spd:   { label: 'Швидкість руху',      fmt: pc,                          lo: 0.03, hi: 0.06, apply: (m, v) => { m.spdMul *= 1 + v; } },
  ls:    { label: 'Вампіризм',           fmt: (v) => '+' + (v * 100).toFixed(1) + '%', lo: 0.01, hi: 0.025, apply: (m, v) => { m.lifesteal += v; } },
  cdr:   { label: 'Перезарядка',         fmt: (v) => '−' + Math.round(v * 100) + '%',  lo: 0.04, hi: 0.08, apply: (m, v) => { m.cdr += v; } },
  arm:   { label: 'Менше шкоди',         fmt: (v) => '−' + Math.round(v * 100) + '%',  lo: 0.03, hi: 0.06, apply: (m, v) => { m.taken *= 1 - v; } },
  xp:    { label: 'Досвід',              fmt: pc,                          lo: 0.05, hi: 0.10, apply: (m, v) => { m.xpMul += v; } },
  heal:  { label: 'Сила зілля',          fmt: pc,                          lo: 0.05, hi: 0.10, apply: (m, v) => { m.potionHeal += v; } },
  mag:   { label: 'Радіус збору',        fmt: (v) => '+' + Math.round(v),  lo: 20,   hi: 40,   apply: (m, v) => { m.magnet += v; }, flat: true },
  thorn: { label: 'Шипи',                fmt: (v) => '+' + Math.round(v),  lo: 3,    hi: 6,    apply: (m, v) => { m.thorns += v; }, flat: true },
};
// основна характеристика слота
const BASE = { weapon: ['dmg', 0.06, 0.10], helmet: ['hpf', 20, 34], armor: ['arm', 0.05, 0.08], amulet: ['crit', 0.03, 0.05], ring: ['as', 0.05, 0.08] };
const POOL = {
  weapon: ['crit', 'critd', 'as', 'ls', 'dmg', 'cdr'],
  helmet: ['hp', 'hpf', 'cdr', 'xp', 'heal', 'arm'],
  armor:  ['hp', 'hpf', 'thorn', 'spd', 'heal', 'arm'],
  amulet: ['dmg', 'critd', 'cdr', 'xp', 'mag', 'ls', 'hp'],
  ring:   ['crit', 'critd', 'ls', 'spd', 'xp', 'dmg', 'mag'],
};
const WEAPON_NOUN = { knight: 'Меч', pyro: 'Посох', ranger: 'Лук', necro: 'Жезл' };
const NOUN = { helmet: 'Шолом', armor: 'Обладунок', amulet: 'Амулет', ring: 'Перстень' };
const PREFIX = ['Іржавий', 'Міцний', 'Вишуканий', 'Давній', 'Проклятий'];
const SUFFIX = ['Попелу', 'Скверни', 'Жару', 'Забутих Королів', 'Плачучих', 'Крижаної Вежі', 'Безодні', 'Пробудженого'];

let ITEM_UID = 1;
const rr = (a, b) => a + Math.random() * (b - a);
function rollRarity(w) { const tot = w.reduce((a, b) => a + b, 0); let r = Math.random() * tot; for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; } return 0; }
// ilvl 0..4 (за номером рівня гри) → +22% до значень за кожен
const ilvlMul = (i) => 1 + 0.22 * i;
function roundStat(k, v) { return STAT[k].flat ? Math.round(v) : Math.round(v * 1000) / 1000; }

function genItem(ilvl, rar, slotId) {
  const slot = slotId || SLOTS[Math.floor(Math.random() * SLOTS.length)].id, R = RARITY[rar], f = ilvlMul(ilvl) * R.mul;
  const b = BASE[slot], base = { k: b[0], v: roundStat(b[0], rr(b[1], b[2]) * f) };
  const pool = POOL[slot].filter((k) => k !== b[0]), aff = [];
  while (aff.length < R.aff && pool.length) {
    const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0], s = STAT[k];
    aff.push({ k, v: roundStat(k, rr(s.lo, s.hi) * ilvlMul(ilvl) * (rar >= 3 ? 1.15 : 1)) });
  }
  const noun = slot === 'weapon' ? WEAPON_NOUN[P.cls.id] || 'Зброя' : NOUN[slot];
  const name = rar === 0 ? `${PREFIX[0]} ${noun.toLowerCase()}` : rar === 4 ? `${noun} ${SUFFIX[Math.floor(Math.random() * SUFFIX.length)]}` : `${PREFIX[rar]} ${noun.toLowerCase()} ${SUFFIX[Math.floor(Math.random() * SUFFIX.length)]}`;
  return { id: ITEM_UID++, slot, rar, ilvl, name, base, aff };
}
const validItem = (it) => it && SLOTS.some((s) => s.id === it.slot) && RARITY[it.rar] && it.base && STAT[it.base.k] && Array.isArray(it.aff) && it.aff.every((a) => STAT[a.k]);
function itemStats(it) { return [it.base, ...it.aff]; }

// ---------- Застосування до гравця ----------
function applyItems(m) {
  if (!P || !P.equip) return;
  SLOTS.forEach((s) => { const it = P.equip[s.id]; if (validItem(it)) itemStats(it).forEach((a) => STAT[a.k].apply(m, a.v)); });
}

// ---------- Сумка й одягання ----------
function lootInit() { stashInit(); questInit(); if (!Array.isArray(P.bag)) P.bag = []; if (!P.equip || typeof P.equip !== 'object') P.equip = {}; P.bag = P.bag.filter(validItem); SLOTS.forEach((s) => { if (!validItem(P.equip[s.id])) delete P.equip[s.id]; }); }
function equipItem(it) {
  const i = P.bag.indexOf(it); if (i < 0) return false;
  const old = P.equip[it.slot]; P.bag.splice(i, 1); if (old) P.bag.push(old); P.equip[it.slot] = it;
  const r = P.hp / P.maxHp; recalcPlayer(); P.hp = Math.max(1, Math.min(P.maxHp, r * P.maxHp)); return true;
}
function unequipItem(slot) {
  const it = P.equip[slot]; if (!it || P.bag.length >= BAG_SIZE) return false;
  delete P.equip[slot]; P.bag.push(it); const r = P.hp / P.maxHp; recalcPlayer(); P.hp = Math.max(1, Math.min(P.maxHp, r * P.maxHp)); return true;
}
function discardItem(it) { const i = P.bag.indexOf(it); if (i >= 0) P.bag.splice(i, 1); }
function pickupItem(it) {
  if (!P.equip[it.slot]) { P.bag.push(it); equipItem(it); return 'equip'; }
  if (P.bag.length >= BAG_SIZE) return false;
  P.bag.push(it); return 'bag';
}

// ---------- Дропи ----------
function dropLoot(e) {
  if (e.minion || e.ai === 'boss') return;
  const lv = Math.min(4, G.level), tune = (typeof TUNE !== 'undefined' && TUNE.lootDrop) || 0.07;
  let it = null;
  if (e.elite) it = genItem(lv, rollRarity([0, 0, 52, 38, 10]));
  else if (Math.random() < tune * (e.ai === 'melee' && e.maxHp > 100 ? 2 : 1)) it = genItem(lv, rollRarity([50 - lv * 6, 32, 14 + lv * 3, 3.5 + lv, 0.5 + lv * 0.25]));
  if (!it) return;
  pickups.push({ type: 'item', item: it, x: e.x, y: e.y, vx: rand(-60, 60), vy: rand(-60, 60), t: 0 });
}
function updateItemDrop(p, d) {
  if (p.t < 0.5 || d > 22) return;
  const r = pickupItem(p.item);
  if (r) { p.done = true; Sfx.play('pickup'); float(P.x, P.y - 24, p.item.name, RARITY[p.item.rar].color, p.item.rar >= 3); if (!G.lootHint) { G.lootHint = true; toast('Предмет! Відкрий інвентар [' + keyLabel(Settings.binds.inv[0]) + ']'); } }
  else if (!p.warn || p.warn < G.time - 2) { p.warn = G.time; float(P.x, P.y - 24, 'Сумка повна', '#ff8a6a'); }
}
function drawItemDrop(p, bx, by) {
  const c = RARITY[p.item.rar].color, r = p.item.rar;
  if (r >= 2) { ctx.save(); ctx.globalAlpha = 0.18 + 0.1 * Math.sin(p.t * 4); ctx.fillStyle = c; ctx.fillRect(bx - 3, by - 40 - r * 6, 6, 40 + r * 6); ctx.restore(); }
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(bx - 7, by + 5, 14, 3);
  ctx.save(); ctx.translate(bx, by - 3); ctx.scale(1.4, 1.4); drawItemIcon(ctx, p.item, -8, -8, 1); ctx.restore();
}

// ---------- Піксельні іконки ----------
// o — контур, m — основний, h — світлий, d — темний
const ICONS = {
  weapon_knight: ['......oo....', '.....ohho...', '....ohhmo...', '...ohhmo....', '..ohhmo.....', '.ohhmo......', 'odhmo.......', 'oddo........', '.oddo.......', 'oo.oo.......'],
  weapon_pyro: ['......ooo...', '.....ohhmo..', '.....ohmmo..', '......ooo...', '.....odo....', '....odo.....', '...odo......', '..odo.......', '.odo........', 'ooo.........'],
  weapon_ranger: ['...oo.......', '..ohmo......', '.ohmo.o.....', 'ohmo..ho....', 'ohmo..hmo...', 'ohmo..hmo...', 'ohmo..ho....', '.ohmo.o.....', '..ohmo......', '...oo.......'],
  weapon_necro: ['....oooo....', '...ohhhho...', '...ohmmmo...', '....ommo....', '.....oo.....', '.....od.....', '.....od.....', '.....od.....', '.....od.....', '.....oo.....'],
  helmet: ['...oooooo...', '..ohhhhhmo..', '.ohmmmmmmdo.', '.ohmmmmmmdo.', '.ohmoooomdo.', '.ohmo..omdo.', '.ohmo..omdo.', '.oddo..oddo.', '.oo......oo.', '............'],
  armor: ['.oo......oo.', 'ohhoooooohho', 'ohmmmhhmmmdo', '.ohmmmmmmdo.', '.ohmmmmmmdo.', '.ohmmhhmmdo.', '.ohmmmmmmdo.', '.ohmmmmmmdo.', '..oddddddo..', '...oooooo...'],
  amulet: ['.o........o.', '.oo......oo.', '..oo....oo..', '...oo..oo...', '....oooo....', '....ohho....', '...ohhmmo...', '...ohmmdo...', '....oddo....', '.....oo.....'],
  ring: ['............', '....oooo....', '...ohhhmo...', '..ohoooomo..', '..homo.omdo.', '..homo.omdo.', '..omdooodo..', '...omdddo...', '....oooo....', '............'],
};
const ICON_CACHE = {};
function itemIconKey(it) { return it.slot === 'weapon' ? 'weapon_' + (P && P.cls ? P.cls.id : 'knight') : it.slot; }
function drawItemIcon(c, it, x, y, s) {
  const key = itemIconKey(it) + '|' + it.rar;
  let cv = ICON_CACHE[key];
  if (!cv) {
    const base = RARITY[it.rar].color, pal = { o: '#14100c', m: base, h: shade(base, 1.45), d: shade(base, 0.6) };
    const pat = ICONS[itemIconKey(it)] || ICONS.ring; cv = document.createElement('canvas'); cv.width = 12; cv.height = 12; const g = cv.getContext('2d');
    pat.forEach((row, j) => { for (let i = 0; i < 12; i++) { const ch = row[i]; if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(i, j, 1, 1); } } });
    ICON_CACHE[key] = cv;
  }
  const w = 16 * s; c.imageSmoothingEnabled = false; c.drawImage(cv, x, y, w, w);
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }

// ---------- Інтерфейс ----------
const invEl = $('#inv');
let invSel = null;
function iconEl(it, px) { const c = document.createElement('canvas'); c.width = c.height = 16 * px; c.className = 'itemIcon'; drawItemIcon(c.getContext('2d'), it, 0, 0, px); return c; }
function itemHtml(it, title) {
  const R = RARITY[it.rar];
  const line = (a, cls) => `<div class="${cls || ''}">${STAT[a.k].fmt(a.v)} ${STAT[a.k].label}</div>`;
  return `<div class="tipBox" style="border-color:${R.color}">${title ? `<em>${title}</em>` : ''}<b style="color:${R.color}">${it.name}</b><small>${R.name} · ${SLOTS.find((s) => s.id === it.slot).name} · рів. предмета ${it.ilvl + 1}</small>${line(it.base, 'base')}${it.aff.map((a) => line(a, 'aff')).join('')}</div>`;
}
function renderInv() {
  const eq = $('#invEquip'), bag = $('#invBag'); eq.innerHTML = ''; bag.innerHTML = '';
  SLOTS.forEach((s) => {
    const it = P.equip[s.id], d = document.createElement('div'); d.className = 'slot' + (it ? ' full' : ''); d.style.setProperty('--rc', it ? RARITY[it.rar].color : '#3a2a22');
    d.innerHTML = `<span class="sn">${s.name}</span>`;
    if (it) { d.appendChild(iconEl(it, 3)); d.onclick = () => { if (!unequipItem(s.id)) toast('Сумка повна'); else Sfx.play('click'); invSel = null; renderInv(); }; }
    d.onmouseenter = () => showTip(it, null); d.onmouseleave = () => showTip(null);
    eq.appendChild(d);
  });
  const tabs = $('#invTabs'); tabs.innerHTML = '';
  CATS.forEach((c) => { const b = document.createElement('button'); b.className = 'invTab' + (invTab === c.id ? ' on' : ''); const n = c.id === 'gear' ? P.bag.length : Object.keys(P.stash).filter((k) => ITEMS[k].cat === c.id).length; b.textContent = c.name + (n ? ' · ' + n : ''); b.onclick = () => { invTab = c.id; Sfx.play('click'); showTip(null); renderInv(); }; tabs.appendChild(b); });
  if (invTab !== 'gear') renderStash(bag);
  else for (let i = 0; i < BAG_SIZE; i++) {
    const it = P.bag[i], d = document.createElement('div'); d.className = 'cell' + (it ? ' full' : ''); if (it) d.style.setProperty('--rc', RARITY[it.rar].color);
    if (it) {
      d.appendChild(iconEl(it, 3));
      d.onclick = () => { equipItem(it); Sfx.play('click'); renderInv(); };
      d.oncontextmenu = (e) => { e.preventDefault(); discardItem(it); Sfx.play('hit'); showTip(null); renderInv(); };
      d.onmouseenter = () => showTip(it, P.equip[it.slot]); d.onmouseleave = () => showTip(null);
    }
    bag.appendChild(d);
  }
  const m = P.m, pct = (v) => Math.round(v * 100) + '%';
  $('#invStats').innerHTML = `<div>Здоров’я <b>${P.maxHp}</b></div><div>Шкода ×<b>${P.dmgMul.toFixed(2)}</b></div><div>Крит <b>${pct(P.crit)}</b> (×${(2 + m.critDmg).toFixed(1)})</div><div>Швидк. атаки ×<b>${(P.asMul).toFixed(2)}</b></div><div>Менше шкоди <b>${pct(1 - m.taken)}</b></div><div>Вампіризм <b>${(P.lifesteal * 100).toFixed(1)}%</b></div>`;
  $('#invCount').textContent = invTab === 'gear' ? `Сумка ${P.bag.length}/${BAG_SIZE}` : CATS.find((c) => c.id === invTab).name;
}
let invTab = 'gear';
function stashTip(id) {
  const it = ITEMS[id], c = CATS.find((x) => x.id === it.cat);
  return `<div class="tipBox" style="border-color:#c9a35a"><b style="color:#e8dcc0">${it.name}</b><small>${c.name} · ціна ${it.val}</small><div>${it.desc}</div>${it.heal ? `<div class="base">Лікує ${Math.round(it.heal * 100)}% здоров’я</div><div class="aff">Клік — з’їсти</div>` : ''}${it.tool ? '<div class="aff">Інструмент (не витрачається)</div>' : ''}</div>`;
}
function renderStash(bag) {
  const ids = Object.keys(P.stash).filter((k) => ITEMS[k].cat === invTab).sort();
  const N = Math.max(12, Math.ceil(ids.length / 4) * 4);
  for (let i = 0; i < N; i++) {
    const id = ids[i], d = document.createElement('div'); d.className = 'cell' + (id ? ' full' : ''); if (id) d.style.setProperty('--rc', '#8a7a52');
    if (id) {
      d.appendChild(matIconEl(id, 3, P.stash[id]));
      d.onclick = () => { if (ITEMS[id].cat === 'food') { eatItem(id); renderInv(); showTip(null); } };
      d.onmouseenter = () => { $('#invTip').innerHTML = stashTip(id); }; d.onmouseleave = () => showTip(null);
    }
    bag.appendChild(d);
  }
}
function showTip(it, cmp) {
  const t = $('#invTip');
  t.innerHTML = it ? itemHtml(it, cmp ? 'Предмет' : 'Одягнено') + (cmp ? itemHtml(cmp, 'Зараз одягнено') : '') : '<div class="tipHint">Клік по предмету в сумці — одягнути<br>ПКМ — викинути<br>Клік по слоту — зняти</div>';
}
function openInv() {
  if (G.state !== 'play') return;
  questEvent('ui', 'inv'); G.state = 'inv'; renderInv(); showTip(null); invEl.classList.remove('hidden'); Sfx.play('click');
}
function closeInv() { invEl.classList.add('hidden'); G.state = 'play'; }
$('#invClose').onclick = closeInv;
