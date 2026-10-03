'use strict';
// ===== КРАФТ: верстаки в локаціях (кухня, горн, ковадло, алхімія, швацтво) =====

const STATIONS = {
  cook:   { name: 'Похідне вогнище', hint: 'Готуй їжу з того, що здобув у лісі.' },
  forge:  { name: 'Горн', hint: 'Виплавляй метал у злитки. Потрібні кліщі й вугілля.' },
  anvil:  { name: 'Ковадло', hint: 'Куй зброю, броню й прикраси. Потрібні молот і кліщі.' },
  alch:   { name: 'Алхімічний стіл', hint: 'Зілля й настої з трав. Потрібна ступка.' },
  tailor: { name: 'Швацький верстак', hint: 'Шкіряна броня й стріли. Потрібен ніж.' },
};
// out: {item, n} | {potion: 1} | {gear: {slot, rar:[ваги], bonus?}}
const RECIPES = [
  { st: 'cook', name: 'Смажене м’ясо', in: [['raw_meat', 1]], out: { item: 'cooked_meat', n: 1 } },
  { st: 'cook', name: 'Печена риба', in: [['fish', 1]], out: { item: 'cooked_fish', n: 1 } },
  { st: 'cook', name: 'Грибний суп', in: [['mushroom', 3], ['herb', 1]], out: { item: 'mushroom_soup', n: 1 } },
  { st: 'cook', name: 'Ягідний пиріг', in: [['berries', 4], ['egg', 1], ['bread', 1]], out: { item: 'berry_pie', n: 1 } },
  { st: 'cook', name: 'Мисливське рагу', in: [['raw_meat', 2], ['mushroom', 1], ['herb', 1]], tools: ['knife'], out: { item: 'hunter_stew', n: 1 } },
  { st: 'forge', name: 'Залізний злиток', in: [['iron_ore', 2], ['coal', 1]], tools: ['tongs'], out: { item: 'iron_ingot', n: 1 } },
  { st: 'forge', name: 'Золотий злиток', in: [['gold_ore', 2], ['coal', 1]], tools: ['tongs'], out: { item: 'gold_ingot', n: 1 } },
  { st: 'anvil', name: 'Залізна зброя', in: [['iron_ingot', 3], ['wood', 1]], tools: ['hammer', 'tongs'], out: { gear: { slot: 'weapon', rar: [0, 45, 40, 13, 2] } } },
  { st: 'anvil', name: 'Залізний шолом', in: [['iron_ingot', 2], ['leather', 1]], tools: ['hammer', 'tongs'], out: { gear: { slot: 'helmet', rar: [0, 45, 40, 13, 2] } } },
  { st: 'anvil', name: 'Залізний обладунок', in: [['iron_ingot', 4], ['leather', 2]], tools: ['hammer', 'tongs'], out: { gear: { slot: 'armor', rar: [0, 40, 42, 16, 2] } } },
  { st: 'anvil', name: 'Золотий перстень', in: [['gold_ingot', 1], ['gem', 1]], tools: ['hammer', 'tongs'], out: { gear: { slot: 'ring', rar: [0, 8, 45, 38, 9] } } },
  { st: 'anvil', name: 'Золотий амулет', in: [['gold_ingot', 2], ['gem', 1], ['fang', 1]], tools: ['hammer', 'tongs'], out: { gear: { slot: 'amulet', rar: [0, 5, 40, 43, 12] } } },
  { st: 'anvil', name: 'Клинок чемпіона', in: [['iron_ingot', 5], ['gold_ingot', 1], ['claw', 1]], tools: ['hammer', 'tongs'], out: { gear: { slot: 'weapon', rar: [0, 0, 35, 50, 15] } } },
  { st: 'alch', name: 'Цілюще зілля', in: [['herb', 3]], tools: ['mortar'], out: { potion: 1 } },
  { st: 'alch', name: 'Трав’яний бальзам', in: [['herb', 2], ['honey', 1], ['berries', 2]], tools: ['mortar'], out: { item: 'balm', n: 1 } },
  { st: 'tailor', name: 'Шкіряний шолом', in: [['leather', 3], ['cloth', 1]], tools: ['knife'], out: { gear: { slot: 'helmet', rar: [0, 50, 40, 10, 0] } } },
  { st: 'tailor', name: 'Хутряна броня', in: [['leather', 4], ['fur', 2], ['cloth', 2]], tools: ['knife'], out: { gear: { slot: 'armor', rar: [0, 35, 45, 18, 2] } } },
  { st: 'tailor', name: 'Амулет із іклом', in: [['fang', 2], ['fur', 1]], tools: ['knife'], out: { gear: { slot: 'amulet', rar: [0, 40, 45, 13, 2] } } },
  { st: 'tailor', name: 'Стріли', in: [['wood', 1], ['feather', 3]], tools: ['knife'], out: { item: 'arrows', n: 5 } },
];
const RAR_TXT = ['сіра', 'зелена', 'синя', 'фіолетова', 'золота'];
function canCraft(r) { return r.in.every(([id, n]) => countItem(id) >= n) && (r.tools || []).every(hasTool); }
function craftIlvl(r) { return Math.min(4, Math.floor(P.level / 2) + (r.in.some(([id]) => id === 'gold_ingot') ? 1 : 0)); }
function doCraft(r) {
  if (!canCraft(r)) { Sfx.play('hit'); return null; }
  if (r.out.potion && P.potions >= P.maxPotions) { toast('Зілля вже повне'); return null; }
  r.in.forEach(([id, n]) => takeItem(id, n));
  let msg, col = '#d8e8b0';
  if (r.out.item) { addItem(r.out.item, r.out.n); msg = `${ITEMS[r.out.item].name}${r.out.n > 1 ? ' ×' + r.out.n : ''}`; }
  else if (r.out.potion) { P.potions++; msg = 'Цілюще зілля'; }
  else { const it = genItem(craftIlvl(r), rollRarity(r.out.gear.rar), r.out.gear.slot), got = pickupItem(it); col = RARITY[it.rar].color; msg = it.name + ' · ' + RARITY[it.rar].name + (got ? '' : ' (сумка повна — лежить поруч)'); if (!got) pickups.push({ type: 'item', item: it, x: P.x, y: P.y + 18, vx: 0, vy: 0, t: 1 }); }
  questEvent('craft', r.name); Sfx.play('level'); burst(P.x, P.y - 6, '#ffd24a', 14, 90, 3, 0.6); return { msg, col };
}

// ---------- Інтерфейс ----------
const craftEl = $('#craft');
let craftSt = 'cook';
function recipeIcon(r) {
  if (r.out.item) return matIconEl(r.out.item, 2);
  if (r.out.potion) { const w = document.createElement('div'); w.className = 'matIcon'; const c = document.createElement('canvas'); c.width = c.height = 32; c.className = 'itemIcon'; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.font = '24px serif'; g.textAlign = 'center'; g.fillText('🧪', 16, 26); w.appendChild(c); return w; }
  return iconEl({ slot: r.out.gear.slot, rar: 2 }, 2);
}
function renderCraft(msg) {
  const S = STATIONS[craftSt], list = $('#craftList'); $('#craftTitle').textContent = S.name; $('#craftHint').textContent = S.hint; list.innerHTML = '';
  RECIPES.filter((r) => r.st === craftSt).forEach((r) => {
    const ok = canCraft(r), d = document.createElement('div'); d.className = 'craftRow' + (ok ? ' ok' : '');
    d.appendChild(recipeIcon(r));
    const need = r.in.map(([id, n]) => `<span class="${countItem(id) >= n ? 'yes' : 'no'}">${ITEMS[id].name} ${Math.min(countItem(id), 99)}/${n}</span>`).join(' · ');
    const tools = (r.tools || []).map((t) => `<span class="${hasTool(t) ? 'yes' : 'no'}">🔧 ${ITEMS[t].name}</span>`).join(' ');
    const outTxt = r.out.gear ? `${SLOTS.find((s) => s.id === r.out.gear.slot).name} · ${RAR_TXT.slice(0, 5).filter((_, i) => r.out.gear.rar[i] > 0).join(' – ')}` : r.out.potion ? '+1 зілля' : (ITEMS[r.out.item].heal ? `Лікує ${Math.round(ITEMS[r.out.item].heal * 100)}%` : ITEMS[r.out.item].desc);
    const t = document.createElement('div'); t.className = 'craftTxt'; t.innerHTML = `<b>${r.name}</b><small>${outTxt}</small><div class="need">${need} ${tools}</div>`; d.appendChild(t);
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Створити'; b.disabled = !ok;
    b.onclick = () => { const res = doCraft(r); renderCraft(res); }; d.appendChild(b); list.appendChild(d);
  });
  $('#craftMsg').innerHTML = msg ? `Створено: <b style="color:${msg.col}">${msg.msg}</b>` : '';
}
function openCraft(st) {
  if (G.state !== 'play') return; craftSt = st; G.state = 'craft'; renderCraft(null); craftEl.classList.remove('hidden'); Sfx.play('click');
}
function closeCraft() { craftEl.classList.add('hidden'); G.state = 'play'; saveGame(); }
$('#craftClose').onclick = closeCraft;

// ---------- Верстаки у світі ----------
ZB.prototype.workbench = function (tx, ty, st) {
  const alch = st === 'alch', key = 'bench' + st;
  const c = spr(key, 32, 34, (R) => {
    R(0, 12, 32, 6, '#9a7442'); R(0, 12, 32, 1, '#c09a5c'); R(1, 18, 30, 12, '#5a3a1e'); R(1, 18, 30, 1, '#3a2410'); R(3, 30, 3, 4, '#2a1a0c'); R(26, 30, 3, 4, '#2a1a0c');
    if (alch) { R(3, 4, 5, 8, '#c8d0d8'); R(4, 7, 3, 5, '#d0304e'); R(11, 2, 4, 10, '#c8d0d8'); R(12, 6, 2, 6, '#3aa84a'); R(18, 6, 6, 6, '#c8d0d8'); R(19, 8, 4, 4, '#4ac8e0'); R(26, 8, 5, 4, '#8a8a96'); R(27, 5, 2, 4, '#d8d0b8'); R(7, 14, 3, 2, '#2a2a30'); }
    else { R(2, 2, 8, 10, '#8a6aa8'); R(2, 2, 8, 2, '#b08ac8'); R(12, 3, 7, 9, '#3a5a8a'); R(12, 3, 7, 2, '#5a7aaa'); R(21, 5, 9, 7, '#c8a050'); R(21, 5, 9, 2, '#e8c878'); R(11, 12, 12, 2, '#c8c8d8'); R(24, 1, 1, 6, '#c8c8d8'); R(0, 8, 3, 2, '#e8e0c8'); }
  });
  const x = tx * TS, y = (ty + 1) * TS - 68; this.block(tx, ty, 2, 1, 2);
  this.obj({ x0: x, y0: y, x1: x + 64, y1: y + 70, y: (ty + 1) * TS, draw: () => { blit(c, x, y); if (alch && Math.random() < 0.05) parts.push({ x: x + 36, y: y + 24, vx: zrand(-6, 6), vy: -zrand(14, 30), life: 1, max: 1, size: 3, color: 'rgba(120,230,170,.6)' }); } });
  if (alch) this.light(x + 32, y + 30, 70, 0.5);
  this.inter.push({ x: x + 32, y: (ty + 1) * TS + 14, r: 52, label: STATIONS[st].name, act: () => openCraft(st) });
};
ZB.prototype.cookSpot = function (px, py) {
  const c = spr('cookpot', 24, 26, (R) => { R(3, 20, 2, 6, '#3a2814'); R(19, 20, 2, 6, '#3a2814'); R(11, 20, 2, 6, '#3a2814'); R(2, 2, 20, 2, '#2a2a30'); R(1, 5, 22, 13, '#34343e'); R(1, 5, 22, 2, '#5a5a66'); R(3, 7, 18, 3, '#7a4a22'); R(2, 18, 20, 2, '#1e1e26'); R(5, 8, 2, 1, '#c89a62'); R(12, 8, 3, 1, '#d8b080'); });
  this.obj({ x0: px - 30, y0: py - 40, x1: px + 30, y1: py + 20, y: py + 10, draw: () => { blit(c, px - 24, py - 40); if (Math.random() < 0.06) parts.push({ x: px + zrand(-8, 8), y: py - 36, vx: zrand(-4, 4), vy: -zrand(16, 30), life: 1.1, max: 1.1, size: 4, color: 'rgba(230,230,235,.3)' }); } });
  this.inter.push({ x: px, y: py + 8, r: 40, label: 'Готувати їжу', act: () => openCraft('cook') });
};
