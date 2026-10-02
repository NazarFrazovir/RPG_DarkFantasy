'use strict';
// ===== ПРЕДМЕТИ: їжа, інструменти, матеріали (склад гравця P.stash) =====
// Спорядження (зброя/броня з афіксами) живе в loot.js; тут — стекові речі для виживання й крафту.

const CATS = [
  { id: 'gear', name: 'Спорядження' }, { id: 'food', name: 'Їжа' }, { id: 'tool', name: 'Інструменти' }, { id: 'mat', name: 'Матеріали' },
];
// ic: [малювальник, колір1, колір2]
const ITEMS = {
  // --- їжа (heal — частка максимального здоров'я)
  berries:      { name: 'Лісові ягоди', cat: 'food', heal: 0.06, val: 3, ic: ['berry', '#7a2ac8', '#c88aff'], desc: 'Кислуваті й соковиті. Трохи лікують.' },
  mushroom:     { name: 'Лісовий гриб', cat: 'food', heal: 0.05, val: 3, ic: ['mushroom', '#b0562a', '#e8dcc0'], desc: 'Їстівний гриб із лісової підстилки.' },
  apple:        { name: 'Яблуко', cat: 'food', heal: 0.08, val: 4, ic: ['apple', '#c83a2a', '#ff9a8a'], desc: 'Хрумке й солодке.' },
  raw_meat:     { name: 'Сире м’ясо', cat: 'food', heal: 0.03, val: 5, ic: ['meat', '#b83a3a', '#e8e0c8'], desc: 'Краще посмажити біля вогнища (скоро).' },
  cooked_meat:  { name: 'Смажене м’ясо', cat: 'food', heal: 0.3, val: 14, ic: ['meat', '#8a4a22', '#e8e0c8'], desc: 'Ситне й гаряче: добре лікує.' },
  fish:         { name: 'Свіжа риба', cat: 'food', heal: 0.03, val: 5, ic: ['fish', '#7a9ab0', '#d8e8f0'], desc: 'Блищить на сонці. Сирою — так собі.' },
  cooked_fish:  { name: 'Печена риба', cat: 'food', heal: 0.25, val: 12, ic: ['fish', '#c8884a', '#f0d8a8'], desc: 'Золотава скоринка, запах з дитинства.' },
  bread:        { name: 'Хліб', cat: 'food', heal: 0.2, val: 8, ic: ['bread', '#c8883a', '#8a5a1a'], desc: 'Простий селянський хліб.' },
  egg:          { name: 'Яйце', cat: 'food', heal: 0.06, val: 3, ic: ['egg', '#f0e8d0', '#d8c8a0'], desc: 'Ще тепле.' },
  mushroom_soup:{ name: 'Грибний суп', cat: 'food', heal: 0.35, val: 18, ic: ['soup', '#b08a5a', '#e8d8b0'], desc: 'Густий суп із лісових грибів і трав.' },
  berry_pie:    { name: 'Ягідний пиріг', cat: 'food', heal: 0.3, val: 16, ic: ['pie', '#c8883a', '#7a2ac8'], desc: 'Солодкий пиріг із лісових ягід.' },
  hunter_stew:  { name: 'Мисливське рагу', cat: 'food', heal: 0.5, val: 28, ic: ['soup', '#8a4a22', '#c8a070'], desc: 'М’ясо, гриби й трави в одному казані. Лікує найсильніше.' },
  balm:         { name: 'Трав’яний бальзам', cat: 'food', heal: 0.45, val: 24, ic: ['flask', '#3aa84a', '#c8ffc8'], desc: 'Алхімічний настій: швидко ставить на ноги.' },
  honey:        { name: 'Мед', cat: 'food', heal: 0.15, val: 12, ic: ['honey', '#e8a020', '#8a5a1a'], desc: 'Густий і золотий.' },
  // --- інструменти (не витрачаються; потрібні для збору й ремесла)
  knife:        { name: 'Мисливський ніж', cat: 'tool', tool: 'knife', val: 35, ic: ['knife', '#c8ccd8', '#5a3e22'], desc: 'Для обробки здобичі та різання трав.' },
  axe:          { name: 'Сокира дроворуба', cat: 'tool', tool: 'axe', val: 45, ic: ['axe', '#aab0bc', '#7a5632'], desc: 'Дозволяє рубати дерева на деревину.' },
  pickaxe:      { name: 'Кирка', cat: 'tool', tool: 'pickaxe', val: 55, ic: ['pickaxe', '#9a9ca8', '#7a5632'], desc: 'Дозволяє добувати руду й камінь.' },
  sickle:       { name: 'Серп', cat: 'tool', tool: 'sickle', val: 30, ic: ['sickle', '#c8ccd8', '#7a5632'], desc: 'Збирає цілющі трави вдвічі більше.' },
  fishing_rod:  { name: 'Вудка', cat: 'tool', tool: 'fishing_rod', val: 40, ic: ['rod', '#8a6a3a', '#cfd4e0'], desc: 'Для риболовлі біля води.' },
  hammer:       { name: 'Ковальський молот', cat: 'tool', tool: 'hammer', val: 60, ic: ['hammer', '#8a8c98', '#5a3e22'], desc: 'Потрібен для ковальства (крафт).' },
  tongs:        { name: 'Кліщі', cat: 'tool', tool: 'tongs', val: 40, ic: ['tongs', '#7a7c88', '#3a3a42'], desc: 'Тримати розпечений метал (крафт).' },
  mortar:       { name: 'Ступка', cat: 'tool', tool: 'mortar', val: 35, ic: ['mortar', '#8a8a96', '#d8d0b8'], desc: 'Для зілля й настоїв (крафт).' },
  // --- матеріали
  wood:         { name: 'Деревина', cat: 'mat', val: 3, ic: ['wood', '#7a5632', '#c8a070'], desc: 'Колоди для ремесла й вогню.' },
  stone:        { name: 'Камінь', cat: 'mat', val: 2, ic: ['stone', '#8a8a96', '#b0b0bc'], desc: 'Звичайний будівельний камінь.' },
  coal:         { name: 'Вугілля', cat: 'mat', val: 5, ic: ['coal', '#26201e', '#5a5058'], desc: 'Паливо для горна.' },
  iron_ore:     { name: 'Залізна руда', cat: 'mat', val: 8, ic: ['ore', '#6a6a76', '#c0603a'], desc: 'Треба виплавити в злиток.' },
  iron_ingot:   { name: 'Залізний злиток', cat: 'mat', val: 22, ic: ['ingot', '#9a9aa8', '#d0d0dc'], desc: 'Основа для зброї й броні.' },
  gold_ore:     { name: 'Золота руда', cat: 'mat', val: 20, ic: ['ore', '#6a6a76', '#f0c040'], desc: 'Блищить крізь породу.' },
  gold_ingot:   { name: 'Золотий злиток', cat: 'mat', val: 55, ic: ['ingot', '#e0b040', '#fff0a0'], desc: 'Рідкісний і важкий.' },
  gem:          { name: 'Самоцвіт', cat: 'mat', val: 40, ic: ['gem', '#40c8e0', '#c8f4ff'], desc: 'Вогонь усередині.' },
  leather:      { name: 'Шкура', cat: 'mat', val: 9, ic: ['leather', '#8a5a32', '#c89a62'], desc: 'Для броні та сумок.' },
  fur:          { name: 'Хутро', cat: 'mat', val: 12, ic: ['fur', '#6a4a30', '#a07850'], desc: 'Тепле й густе.' },
  fang:         { name: 'Ікло', cat: 'mat', val: 10, ic: ['fang', '#f0ead8', '#c8c0a8'], desc: 'Гостре, як голка.' },
  claw:         { name: 'Кіготь', cat: 'mat', val: 12, ic: ['claw', '#2a2420', '#5a5048'], desc: 'Ведмежий кіготь.' },
  horn:         { name: 'Оленячий ріг', cat: 'mat', val: 12, ic: ['fang', '#c8b090', '#8a7458'], desc: 'Для прикрас і зілля.' },
  feather:      { name: 'Пір’я', cat: 'mat', val: 2, ic: ['feather', '#e8e8f0', '#9a9ab0'], desc: 'Для стріл.' },
  herb:         { name: 'Цілюща трава', cat: 'mat', val: 4, ic: ['herb', '#3aa84a', '#8ae88a'], desc: 'Основа зілля.' },
  cloth:        { name: 'Тканина', cat: 'mat', val: 6, ic: ['cloth', '#8a6aa8', '#c8a8e0'], desc: 'Шматок міцного полотна.' },
  arrows:       { name: 'Стріли', cat: 'mat', val: 3, ic: ['arrows', '#c8a070', '#e8e8f0'], desc: 'В’язка стріл.' },
};

// ---------- Піксельні іконки 16×16 ----------
const PAINT = {
  soup: (R, a, b) => { R(2, 7, 12, 7, '#4a4852'); R(3, 13, 10, 2, '#3a3842'); R(2, 6, 12, 2, '#8a8a96'); R(3, 7, 10, 3, a); R(5, 8, 3, 1, b); R(9, 9, 3, 1, b); R(6, 2, 1, 3, 'rgba(255,255,255,.4)'); R(9, 1, 1, 4, 'rgba(255,255,255,.35)'); },
  pie: (R, a, b) => { R(1, 8, 14, 6, a); R(1, 8, 14, 2, zsh(a, 1.3)); R(1, 13, 14, 1, zsh(a, 0.6)); for (let i = 0; i < 5; i++) R(2 + i * 3, 7, 2, 2, zsh(a, 1.4)); R(5, 10, 2, 2, b); R(9, 10, 2, 2, b); },
  flask: (R, a, b) => { R(6, 1, 4, 3, '#d8d0b8'); R(5, 4, 6, 2, '#c8d0d8'); R(3, 7, 10, 7, '#c8d0d8'); R(4, 8, 8, 6, a); R(4, 8, 8, 1, b); R(5, 6, 1, 2, 'rgba(255,255,255,.5)'); R(7, 10, 1, 2, b); },
  berry: (R, a, b) => { R(7, 1, 2, 3, '#3a6a2c'); [[4, 9], [10, 8], [7, 5]].forEach(([x, y]) => { disc(R, x + 1, y + 1, 3, a); R(x, y - 1, 2, 2, b); }); },
  mushroom: (R, a, b) => { disc(R, 8, 7, 6, a); R(0, 8, 16, 8, 'rgba(0,0,0,0)'); R(5, 9, 6, 6, b); R(5, 9, 6, 1, 'rgba(0,0,0,.2)'); R(4, 4, 2, 2, '#fff'); R(9, 3, 3, 2, '#fff'); R(7, 6, 2, 1, '#fff'); R(2, 9, 12, 2, zsh(a, 0.7)); },
  apple: (R, a, b) => { disc(R, 8, 9, 6, a); R(7, 1, 2, 4, '#5a3a1a'); R(9, 2, 4, 2, '#3a8a2c'); R(4, 6, 3, 2, b); R(3, 11, 2, 1, zsh(a, 0.7)); },
  meat: (R, a, b) => { disc(R, 7, 7, 5, a); disc(R, 6, 6, 3, zsh(a, 1.25)); R(10, 9, 5, 2, b); R(14, 8, 2, 4, b); R(10, 9, 5, 1, '#fff'); R(5, 10, 3, 1, zsh(a, 0.6)); },
  fish: (R, a, b) => { disc(R, 7, 8, 5, a); R(1, 8, 5, 1, a); R(2, 5, 3, 3, a); R(2, 9, 3, 3, a); R(12, 6, 3, 2, a); R(12, 9, 3, 2, a); R(4, 7, 8, 2, b); R(10, 6, 1, 1, '#14100c'); R(7, 11, 5, 1, zsh(a, 0.7)); },
  bread: (R, a, b) => { R(3, 6, 10, 7, a); R(2, 8, 12, 4, a); R(3, 6, 10, 1, zsh(a, 1.3)); R(5, 6, 1, 3, b); R(8, 6, 1, 3, b); R(11, 6, 1, 3, b); R(3, 12, 10, 1, zsh(a, 0.6)); },
  egg: (R, a, b) => { disc(R, 8, 9, 5, a); R(6, 3, 5, 3, a); R(6, 6, 3, 2, '#fff'); R(5, 12, 6, 1, b); },
  honey: (R, a, b) => { R(4, 5, 8, 10, a); R(4, 5, 8, 2, zsh(a, 1.3)); R(3, 3, 10, 3, b); R(3, 3, 10, 1, zsh(b, 1.3)); R(6, 9, 4, 3, '#f8e8b0'); R(11, 6, 1, 7, zsh(a, 0.7)); },
  knife: (R, a, b) => { for (let i = 0; i < 9; i++) R(3 + i, 10 - i, 2, 2, a); R(3, 9, 2, 2, zsh(a, 1.4)); R(9, 3, 2, 2, zsh(a, 0.7)); R(2, 11, 4, 3, b); R(1, 13, 3, 2, '#c9a35a'); R(5, 9, 2, 2, '#c9a35a'); },
  axe: (R, a, b) => { R(7, 3, 2, 13, b); R(7, 3, 1, 13, zsh(b, 1.3)); R(2, 2, 6, 7, a); R(2, 2, 6, 1, zsh(a, 1.4)); R(1, 3, 1, 5, zsh(a, 1.3)); R(8, 4, 3, 3, zsh(a, 0.7)); },
  pickaxe: (R, a, b) => { R(7, 3, 2, 13, b); R(7, 3, 1, 13, zsh(b, 1.3)); R(2, 3, 12, 2, a); R(1, 4, 3, 2, a); R(12, 4, 3, 2, a); R(2, 3, 12, 1, zsh(a, 1.4)); R(0, 5, 2, 2, zsh(a, 0.7)); R(14, 5, 2, 2, zsh(a, 0.7)); },
  sickle: (R, a, b) => { R(3, 10, 3, 5, b); R(3, 14, 3, 1, '#c9a35a'); R(3, 4, 2, 7, a); R(4, 2, 4, 2, a); R(7, 1, 5, 2, a); R(11, 2, 3, 2, a); R(13, 3, 2, 2, zsh(a, 0.7)); R(3, 5, 1, 5, zsh(a, 1.4)); },
  rod: (R, a, b) => { for (let i = 0; i < 12; i++) R(2 + i, 13 - i, 2, 2, a); R(12, 2, 1, 8, b); R(11, 10, 3, 1, '#c8c8d8'); R(11, 10, 1, 3, '#c8c8d8'); R(2, 12, 3, 3, '#5a3e22'); },
  hammer: (R, a, b) => { R(7, 5, 2, 11, b); R(7, 5, 1, 11, zsh(b, 1.3)); R(3, 1, 10, 5, a); R(3, 1, 10, 1, zsh(a, 1.4)); R(3, 5, 10, 1, zsh(a, 0.6)); R(12, 2, 2, 3, zsh(a, 0.8)); },
  tongs: (R, a, b) => { for (let i = 0; i < 10; i++) { R(3 + i, 2 + i, 2, 2, a); R(12 - i, 2 + i, 2, 2, b); } R(6, 10, 4, 4, '#2a2a30'); R(7, 11, 2, 2, '#ff7a2a'); },
  mortar: (R, a, b) => { R(3, 8, 10, 7, a); R(3, 8, 10, 2, zsh(a, 1.3)); R(4, 9, 8, 2, '#2a2a30'); R(3, 14, 10, 1, zsh(a, 0.6)); R(9, 1, 3, 9, b); R(8, 0, 5, 2, zsh(b, 0.8)); },
  ore: (R, a, b) => { disc(R, 8, 9, 6, a); disc(R, 7, 8, 4, zsh(a, 1.25)); R(3, 9, 2, 2, b); R(8, 5, 3, 2, b); R(10, 10, 2, 3, b); R(6, 11, 2, 2, b); R(5, 6, 1, 1, '#fff'); R(2, 13, 12, 1, zsh(a, 0.5)); },
  ingot: (R, a, b) => { R(2, 8, 12, 5, a); R(3, 6, 10, 3, zsh(a, 1.2)); R(3, 6, 10, 1, b); R(2, 12, 12, 1, zsh(a, 0.6)); R(5, 8, 3, 1, b); },
  wood: (R, a, b) => { R(2, 6, 12, 7, a); R(2, 6, 12, 1, zsh(a, 1.3)); R(2, 12, 12, 1, zsh(a, 0.6)); R(11, 6, 4, 7, b); R(12, 8, 2, 3, zsh(b, 0.8)); R(13, 9, 1, 1, zsh(b, 0.5)); R(4, 8, 5, 1, zsh(a, 0.7)); },
  stone: (R, a, b) => { disc(R, 8, 9, 6, a); disc(R, 7, 8, 4, b); R(4, 6, 3, 1, '#d8d8e0'); R(9, 12, 3, 1, zsh(a, 0.5)); },
  coal: (R, a, b) => { disc(R, 8, 9, 6, a); R(4, 5, 3, 2, b); R(10, 8, 2, 2, b); R(6, 11, 2, 1, b); R(11, 5, 2, 1, '#8a8090'); },
  gem: (R, a, b) => { R(5, 2, 6, 2, a); R(3, 4, 10, 3, a); R(5, 7, 6, 3, zsh(a, 0.8)); R(7, 10, 2, 3, zsh(a, 0.6)); R(4, 4, 3, 2, b); R(9, 5, 3, 1, zsh(a, 1.3)); R(7, 2, 2, 1, '#fff'); },
  leather: (R, a, b) => { R(3, 2, 10, 12, a); R(2, 4, 12, 8, a); R(3, 2, 10, 1, b); R(4, 4, 8, 1, zsh(a, 0.7)); R(4, 10, 8, 1, zsh(a, 0.7)); for (let i = 0; i < 4; i++) R(4 + i * 2, 12, 1, 1, '#e8d8b0'); },
  fur: (R, a, b) => { disc(R, 8, 8, 6, a); disc(R, 7, 7, 4, b); for (let i = 0; i < 8; i++) R(2 + (i * 5) % 12, 2 + ((i * 7) % 11), 2, 2, i % 2 ? b : zsh(a, 0.7)); },
  fang: (R, a, b) => { R(5, 2, 6, 3, a); R(6, 5, 5, 3, a); R(7, 8, 3, 3, a); R(8, 11, 2, 3, a); R(5, 2, 2, 3, '#fff'); R(10, 4, 1, 5, b); },
  claw: (R, a, b) => { for (let i = 0; i < 3; i++) { R(3 + i * 4, 2 + i, 2, 8, a); R(3 + i * 4, 10 + i, 2, 3, a); R(3 + i * 4, 2 + i, 1, 8, b); } R(2, 13, 12, 2, b); },
  feather: (R, a, b) => { for (let i = 0; i < 11; i++) { R(2 + i, 13 - i, 2, 2, a); } R(5, 7, 2, 4, b); R(8, 4, 3, 2, b); R(10, 3, 3, 2, a); R(3, 12, 2, 3, b); },
  herb: (R, a, b) => { R(7, 6, 2, 9, '#2a6a2c'); disc(R, 4, 6, 3, a); disc(R, 12, 6, 3, a); disc(R, 8, 3, 3, a); R(3, 5, 2, 1, b); R(11, 5, 2, 1, b); R(7, 2, 2, 1, b); },
  cloth: (R, a, b) => { R(2, 4, 12, 9, a); R(2, 4, 12, 2, b); R(2, 9, 12, 1, zsh(a, 0.7)); R(2, 12, 12, 1, zsh(a, 0.6)); R(4, 6, 1, 6, zsh(a, 0.8)); R(8, 6, 1, 6, zsh(a, 0.8)); },
  arrows: (R, a, b) => { for (let i = 0; i < 3; i++) { R(3 + i * 3, 3 + i, 1, 11, a); R(2 + i * 3, 12 + i, 3, 2, b); R(3 + i * 3, 1 + i, 1, 3, '#b0b8c8'); } },
};
function itemCanvas(id) {
  const it = ITEMS[id]; if (!it) return null;
  return spr('item_' + id, 16, 16, (R) => { (PAINT[it.ic[0]] || PAINT.stone)(R, it.ic[1], it.ic[2]); });
}
function matIconEl(id, px, count) {
  const w = document.createElement('div'); w.className = 'matIcon';
  const c = document.createElement('canvas'); c.width = c.height = 16 * px; c.className = 'itemIcon'; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(itemCanvas(id), 0, 0, 16 * px, 16 * px); w.appendChild(c);
  if (count > 1) { const b = document.createElement('span'); b.className = 'cnt'; b.textContent = count; w.appendChild(b); }
  return w;
}

// ---------- Склад ----------
function stashInit() { if (!P.stash || typeof P.stash !== 'object' || Array.isArray(P.stash)) P.stash = {}; Object.keys(P.stash).forEach((k) => { if (!ITEMS[k] || !(P.stash[k] > 0)) delete P.stash[k]; }); }
const hasTool = (t) => !!(P.stash && P.stash[t] > 0);
const countItem = (id) => (P.stash && P.stash[id]) || 0;
function addItem(id, n = 1) { const it = ITEMS[id]; if (!it) return; P.stash[id] = it.cat === 'tool' ? 1 : Math.min(99, (P.stash[id] || 0) + n); }
function takeItem(id, n = 1) { if (countItem(id) < n) return false; P.stash[id] -= n; if (P.stash[id] <= 0) delete P.stash[id]; return true; }
function gain(id, n = 1, silent) { addItem(id, n); if (!silent) { float(P.x, P.y - 26 - Math.random() * 10, `+${n > 1 ? n + ' ' : ''}${ITEMS[id].name}`, '#d8e8b0'); Sfx.play('pickup'); } }
function eatItem(id) {
  const it = ITEMS[id]; if (!it || it.cat !== 'food' || !takeItem(id)) return false;
  if (P.hp >= P.maxHp) { addItem(id); toast('Здоров’я повне'); return false; }
  P.hp = Math.min(P.maxHp, P.hp + P.maxHp * it.heal); Sfx.play('potion'); burst(P.x, P.y, '#9be07a', 8, 60, 2.5); float(P.x, P.y - 20, '+' + Math.round(P.maxHp * it.heal), '#7aff9a'); return true;
}

// ---------- Дроп матеріалів зі здобичі ----------
function dropMats(e) {
  const d = ENEMIES[e.type] && ENEMIES[e.type].drops; if (!d || e.minion) return;
  d.forEach(([id, ch, n]) => { if (Math.random() < ch * (e.elite ? 1.6 : 1)) { const k = n ? n[0] + Math.floor(Math.random() * (n[1] - n[0] + 1)) : 1; pickups.push({ type: 'mat', id, n: k, x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), vx: rand(-70, 70), vy: rand(-70, 70), t: 0 }); } });
}
function updateMatDrop(p, d) {
  if (p.t > 0.35 && d < P.magnet * 0.6) { const a = angTo(p, P); p.x += Math.cos(a) * 150 / 30; p.y += Math.sin(a) * 150 / 30; }
  if (d < 20 && p.t > 0.3) { p.done = true; gain(p.id, p.n); }
}
function drawMatDrop(p, bx, by) {
  const c = itemCanvas(p.id); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(bx - 7, by + 6, 14, 3); ctx.drawImage(c, bx - 12, by - 14, 24, 24);
}
// ---------- Склад: збереження підтримує game.js (SAVE_FIELDS) ----------
