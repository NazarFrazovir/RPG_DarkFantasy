'use strict';
// ===== СІРЕ УЗЛІССЯ: ліс із тваринами, розбійниками, ресурсами (збір вузлів, скрині, табори) =====

// ---------- Вузли збору ----------
const NODES = {
  tree:     { tool: 'axe', label: 'Рубати дерево', yield: [['wood', [2, 3]]], respawn: 240, fx: '#8a5a2a' },
  apple:    { label: 'Збирати яблука', yield: [['apple', [1, 3]]], respawn: 200, fx: '#e04a3a' },
  iron:     { tool: 'pickaxe', label: 'Добувати залізо', yield: [['iron_ore', [1, 2]], ['stone', [1, 1], 0.5]], respawn: 300, fx: '#c0603a' },
  coal:     { tool: 'pickaxe', label: 'Добувати вугілля', yield: [['coal', [1, 3]]], respawn: 300, fx: '#3a3238' },
  gold:     { tool: 'pickaxe', label: 'Добувати золото', yield: [['gold_ore', [1, 1]], ['gem', [1, 1], 0.2]], respawn: 420, fx: '#f0c040' },
  stone:    { tool: 'pickaxe', label: 'Добувати камінь', yield: [['stone', [1, 3]]], respawn: 240, fx: '#9a9aa6' },
  herb:     { label: 'Зібрати траву', yield: [['herb', [1, 2]]], sickle: true, respawn: 150, fx: '#4aa84a' },
  berry:    { label: 'Зібрати ягоди', yield: [['berries', [2, 4]]], respawn: 150, fx: '#8a3ac8' },
  mushroom: { label: 'Зібрати гриби', yield: [['mushroom', [1, 3]]], respawn: 150, fx: '#c8603a' },
  fish:     { tool: 'fishing_rod', label: 'Ловити рибу', fish: true, yield: [['fish', [1, 1]]], respawn: 5, fx: '#8ad0f0' },
};
function gatherNode(n, K, x, y) {
  if (G.time < n.cd) { float(P.x, P.y - 24, 'Тут порожньо', '#aaa'); return; }
  if (K.tool && !hasTool(K.tool)) { float(P.x, P.y - 26, 'Потрібна: ' + ITEMS[K.tool].name, '#e07070'); Sfx.play('hit'); return; }
  P.face = angTo(P, { x, y }); Sfx.play(K.tool === 'axe' || K.tool === 'pickaxe' ? 'hit' : 'pickup'); burst(x, y - 8, K.fx, 8, 80, 3, 0.5);
  if (K.fish) { n.cd = G.time + K.respawn; if (Math.random() < 0.55) gain('fish'); else float(P.x, P.y - 24, 'Зірвалась…', '#aab'); return; }
  K.yield.forEach(([id, r, ch]) => { if (ch === undefined || Math.random() < ch) { let k = r[0] + Math.floor(Math.random() * (r[1] - r[0] + 1)); if (K.sickle && hasTool('sickle')) k *= 2; if (k > 0) gain(id, k); } });
  n.cd = G.time + K.respawn;
}
function nodeSprites(kind, v) {
  const key = 'node' + kind + v;
  if (kind === 'tree' || kind === 'apple') {
    const full = kind === 'apple' ? spr(key, 36, 46, (R, c) => { c.drawImage(treeSprite('oak', v), 0, 0); [[10, 12], [20, 8], [24, 18], [14, 20], [18, 14], [8, 18]].forEach(([a, b]) => { R(a, b, 3, 3, '#d83a2a'); R(a, b, 1, 1, '#ff9a8a'); }); }) : treeSprite(v % 2 ? 'pine' : 'oak', v);
    const stump = spr('stump' + kind, 36, 46, (R) => { R(14, 36, 8, 8, '#4a3320'); R(14, 36, 8, 2, '#c8a070'); R(15, 37, 6, 1, '#8a6a40'); R(12, 42, 12, 2, '#3a2818'); R(10, 41, 3, 1, '#4a3320'); });
    return { full, dep: stump, w: 36, h: 46 };
  }
  const rock = (vein, dark) => spr(key, 22, 18, (R) => { disc(R, 11, 11, 9, '#4a4a54'); disc(R, 10, 10, 8, '#6a6a76'); R(5, 5, 5, 2, '#9a9aa6'); for (let i = 0; i < 6; i++) R(5 + (i * 5) % 12, 6 + (i * 7) % 8, 3, 2, i % 2 ? vein : dark); R(2, 15, 18, 2, '#34343e'); });
  const rubble = spr('rubble' + v, 22, 18, (R) => { disc(R, 7, 14, 3, '#5a5a66'); disc(R, 13, 13, 4, '#6a6a76'); disc(R, 17, 15, 2, '#4a4a54'); });
  if (kind === 'iron') return { full: rock('#c0603a', '#8a4a30'), dep: rubble, w: 22, h: 18 };
  if (kind === 'coal') return { full: rock('#14100e', '#2a2420'), dep: rubble, w: 22, h: 18 };
  if (kind === 'gold') return { full: rock('#f0c040', '#fff0a0'), dep: rubble, w: 22, h: 18 };
  if (kind === 'stone') return { full: rock('#8a8a96', '#7a7a86'), dep: rubble, w: 22, h: 18 };
  const plantFull = { herb: (R) => { for (let i = 0; i < 5; i++) { R(2 + i * 3, 4 + (i % 2) * 2, 2, 8 - (i % 2) * 2, '#2a6a2c'); R(1 + i * 3, 3 + (i % 2) * 2, 4, 3, '#4aa84a'); } R(5, 2, 2, 2, '#f0f0f0'); R(11, 4, 2, 2, '#f0f0f0'); },
    berry: (R) => { disc(R, 8, 8, 6, '#26441e'); disc(R, 7, 7, 5, '#34602a'); [[4, 6], [9, 5], [7, 9], [11, 8], [5, 10]].forEach(([a, b]) => { R(a, b, 2, 2, '#8a3ac8'); R(a, b, 1, 1, '#d8a0ff'); }); },
    mushroom: (R) => { [[3, 6, 6], [9, 7, 5], [6, 3, 4]].forEach(([a, b, w]) => { R(a + 1, b + 2, 2, 5, '#e8dcc0'); R(a - 1, b, w, 3, '#c8503a'); R(a, b, 1, 1, '#fff'); }); R(2, 11, 12, 1, '#2a4a1c'); } }[kind];
  const plantDep = { herb: (R) => { for (let i = 0; i < 5; i++) R(2 + i * 3, 9, 1, 3, '#3a6a2c'); }, berry: (R) => { disc(R, 8, 8, 6, '#26441e'); disc(R, 7, 7, 5, '#34602a'); }, mushroom: (R) => { [[4, 9], [10, 9]].forEach(([a, b]) => R(a, b, 2, 3, '#b8ac90')); } }[kind];
  return { full: spr(key, 16, 14, plantFull), dep: spr(key + 'd', 16, 14, plantDep), w: 16, h: 14 };
}
ZB.prototype.node = function (tx, ty, kind, v = 0) {
  const K = NODES[kind], n = { cd: 0 }, x = (tx + 0.5) * TS, y = (ty + 0.5) * TS;
  if (kind === 'fish') {
    this.obj({ x0: x - 40, y0: y - 30, x1: x + 40, y1: y + 30, y: y - 100, draw: () => { const t = G.time, dp = G.time < n.cd; ctx.strokeStyle = dp ? 'rgba(160,200,230,.2)' : 'rgba(210,240,255,.55)'; ctx.lineWidth = 2; for (let i = 0; i < 2; i++) { const r = 5 + ((t * 8 + i * 8) % 16); ctx.globalAlpha = 1 - (r - 5) / 16; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, 7); ctx.stroke(); } ctx.globalAlpha = 1; } });
  } else {
    const sp = nodeSprites(kind, v % 3), big = kind === 'tree' || kind === 'apple', rock = ['iron', 'coal', 'gold', 'stone'].includes(kind);
    if (big || rock) this.block(tx, ty, 1, 1, 2);
    const px = big ? x - 36 : rock ? x - 22 : x - 16, py = big ? (ty + 1) * TS - 90 : rock ? (ty + 1) * TS - 36 : (ty + 1) * TS - 28 - 2, s = 2;
    this.obj({ x0: px, y0: py, x1: px + sp.w * s, y1: py + sp.h * s, y: (ty + 1) * TS - (big || rock ? 0 : 6), draw: () => blit(G.time < n.cd ? sp.dep : sp.full, px, py) });
  }
  const it = { x, y: y + (kind === 'fish' ? 0 : 6), r: kind === 'fish' ? 90 : 56, label: K.label, act: () => gatherNode(n, K, x, y), dyn: () => (G.time < n.cd ? 'Тут порожньо' : K.label + (K.tool && !hasTool(K.tool) ? ` (потрібна ${ITEMS[K.tool].name.toLowerCase()})` : '')) };
  this.inter.push(it); return n;
};
// скриня зі здобиччю (відкривається один раз за заходження)
ZB.prototype.treasure = function (tx, ty, key, loot) {
  const x = (tx + 0.5) * TS, py = (ty + 1) * TS - 32, c0 = spr('tchest', 16, 16, (R) => { R(1, 4, 14, 11, '#6a4424'); R(1, 4, 14, 4, '#8a5e30'); R(1, 8, 14, 1, '#3a2410'); R(6, 7, 4, 4, '#e0c060'); R(1, 4, 1, 11, '#c9a35a'); R(14, 4, 1, 11, '#c9a35a'); });
  const c1 = spr('tchesto', 16, 16, (R) => { R(1, 7, 14, 8, '#5a3a1c'); R(1, 7, 14, 1, '#2a1808'); R(2, 3, 12, 4, '#8a5e30'); R(2, 3, 12, 1, '#c9a35a'); R(3, 8, 10, 3, '#e0c060'); R(5, 8, 2, 1, '#fff'); });
  const open = () => !!(G.opened && G.opened[key]);
  this.block(tx, ty, 1, 1, 2); this.obj({ x0: x - 16, y0: py, x1: x + 16, y1: py + 32, y: (ty + 1) * TS, draw: () => { blit(open() ? c1 : c0, x - 16, py); if (!open()) { ctx.globalAlpha = 0.5 + Math.sin(G.time * 4) * 0.3; ctx.fillStyle = '#ffe08a'; ctx.fillRect(x + 8, py + 4, 3, 3); ctx.globalAlpha = 1; } } });
  this.inter.push({ x, y: (ty + 1) * TS + 8, r: 48, label: 'Відкрити скриню', dyn: () => (open() ? 'Скриня порожня' : 'Відкрити скриню'), act: () => {
    if (open()) { float(P.x, P.y - 24, 'Порожньо', '#aaa'); return; }
    G.opened = G.opened || {}; G.opened[key] = true; Sfx.play('level'); burst(x, py + 8, '#ffe08a', 14, 100, 3, 0.7);
    const lines = []; (loot.items || []).forEach(([id, n]) => { gain(id, n, true); lines.push(`${n > 1 ? n + '× ' : ''}${ITEMS[id].name}`); });
    if (loot.ash) { P.ash += loot.ash; lines.push(`${loot.ash} Попелу`); }
    if (loot.gear) { const it = genItem(Math.min(4, G.level), loot.gear); const r = pickupItem(it); lines.push(it.name + (r ? '' : ' (сумка повна — залишено)')); if (!r) pickups.push({ type: 'item', item: it, x: x, y: (ty + 1) * TS + 20, vx: 0, vy: 0, t: 1 }); }
    showDialog([{ who: '', text: (loot.text ? loot.text + ' ' : '') + 'Ти знаходиш: ' + lines.join(', ') + '.' }]);
  } });
};
ZB.prototype.tent = function (tx, ty, col) {
  const c = spr('tent' + col, 48, 40, (R) => { for (let y = 0; y < 34; y++) { const hw = Math.round(2 + (y * 22) / 34); R(24 - hw, y + 2, hw * 2, 1, y < 3 ? zsh(col, 1.4) : y % 8 === 0 ? zsh(col, 0.7) : col); R(24 - hw, y + 2, 2, 1, zsh(col, 1.25)); R(24 + hw - 2, y + 2, 2, 1, zsh(col, 0.65)); } R(18, 22, 12, 14, '#14100c'); R(20, 20, 8, 3, '#14100c'); R(23, 22, 2, 14, '#3a2814'); R(23, 0, 2, 4, '#5a3e22'); R(24, 0, 6, 3, '#a02a34'); R(0, 35, 48, 3, 'rgba(0,0,0,.3)'); });
  this.block(tx, ty, 3, 2, 2); const x = tx * TS - 8, y = (ty + 2) * TS - 76;
  this.obj({ x0: x, y0: y, x1: x + 96, y1: y + 80, y: (ty + 2) * TS, draw: () => blit(c, x, y) });
};
ZB.prototype.campfire = function (tx, ty) {
  const x = (tx + 0.5) * TS, y = (ty + 0.5) * TS; this.block(tx, ty, 1, 1, 2);
  const st = spr('fstones', 24, 14, (R) => { for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283; R(12 + Math.round(Math.cos(a) * 9), 7 + Math.round(Math.sin(a) * 4), 4, 3, i % 2 ? '#6a6a76' : '#8a8a96'); } R(8, 6, 8, 3, '#3a2814'); R(9, 5, 6, 1, '#5a3e22'); });
  this.obj({ x0: x - 40, y0: y - 60, x1: x + 40, y1: y + 20, y: y + 8, draw: () => { blit(st, x - 24, y - 12); ctx.save(); ctx.beginPath(); ctx.rect(x - 24, y - 50, 48, 46); ctx.clip(); bigFire(x, y - 2, G.time, 0.8, x); ctx.restore(); glow(x, y - 10, 90, 0.2); if (Math.random() < 0.15) parts.push({ x: x + zrand(-6, 6), y: y - 14, vx: zrand(-6, 6), vy: -zrand(30, 60), life: 1.2, max: 1.2, size: 2, color: 'rgba(255,150,50,.8)' }); } });
  this.light(x, y - 6, 210, 1);
};
ZB.prototype.cave = function (tx, ty) {
  const c = spr('cave', 64, 46, (R) => { disc(R, 32, 36, 30, '#3a3a44'); disc(R, 32, 34, 28, '#52525e'); R(0, 36, 64, 10, '#3a3a44'); R(10, 12, 44, 3, '#6a6a76'); disc(R, 32, 38, 18, '#06040a'); R(14, 38, 36, 8, '#06040a'); R(8, 26, 6, 3, '#7a7a86'); R(50, 22, 7, 3, '#7a7a86'); R(18, 10, 3, 2, '#9a9aa6'); [[28, 36], [36, 36]].forEach(([a, b]) => { R(a, b, 3, 2, '#ff3a2a'); R(a, b, 1, 1, '#ffd0a0'); }); R(2, 42, 12, 3, '#d8d0b8'); R(52, 43, 9, 2, '#d8d0b8'); R(4, 40, 3, 3, '#e8e0c8'); });
  this.block(tx - 2, ty, 5, 1, 2); const x = (tx + 0.5) * TS - 64, y = (ty + 1) * TS - 92;
  this.obj({ x0: x, y0: y, x1: x + 128, y1: y + 96, y: (ty + 1) * TS, draw: () => blit(c, x, y) });
};
ZB.prototype.logFall = function (tx, ty) { this.deco(tx, ty, 3, 1, 'logfall', 48, 16, (R) => { R(0, 4, 48, 11, '#5a3e22'); R(0, 4, 48, 2, '#8a6a3c'); R(0, 13, 48, 2, '#3a2814'); R(0, 5, 3, 9, '#c8a070'); R(1, 7, 1, 5, '#8a6a40'); R(10, 7, 6, 1, '#3a2814'); R(26, 9, 8, 1, '#3a2814'); R(36, 1, 3, 5, '#2a6a2c'); R(40, 2, 3, 3, '#3a8a3a'); }); };
ZB.prototype.bones = function (tx, ty) { this.deco(tx, ty, 1, 1, 'bonesd', 16, 12, (R) => { R(1, 6, 12, 2, '#d8d0b8'); R(2, 4, 2, 6, '#d8d0b8'); R(10, 4, 2, 6, '#d8d0b8'); disc(R, 12, 4, 3, '#e8e0c8'); R(11, 3, 1, 1, '#2a1a10'); R(13, 3, 1, 1, '#2a1a10'); R(5, 9, 6, 1, '#b8b0a0'); }, { solid: false }); };

// ---------- Карта лісу ----------
function buildForest(B) {
  const W = 96, H = 72, rng = mulberry32(5150), idx = (x, y) => y * W + x;
  B.fill(GK.GRASS, 0, 0, W, H);
  for (let i = 0; i < 70; i++) B.ellipse(GK.DGRASS, rng() * W, rng() * H, 3 + rng() * 5, 2 + rng() * 4);
  const trail = (pts, w) => { B.line(GK.DIRT, pts, w); pts.forEach(([x, y]) => B.clear(x, y, 3, 3)); };
  // стежки
  trail([[95, 36], [88, 36], [80, 36], [70, 37], [62, 38], [54, 37], [44, 37], [34, 37]], 3);
  trail([[56, 37], [54, 28], [50, 20], [47, 14]], 2); trail([[48, 37], [46, 46], [44, 51]], 2); trail([[62, 38], [64, 46], [66, 51]], 2);
  trail([[36, 37], [31, 27], [24, 21], [18, 16]], 2); trail([[18, 16], [15, 12], [14, 10]], 2);
  // галявини й табори
  [[80, 36, 7, 5, GK.DIRT], [24, 37, 8, 7, GK.DIRT], [16, 18, 10, 6, GK.DIRT], [66, 51, 9, 6, GK.GRASS], [46, 13, 6, 5, GK.DGRASS], [42, 58, 12, 7, GK.SAND]].forEach(([x, y, rx, ry, k]) => { B.ellipse(k, x, y, rx, ry); B.clear(x, y, rx + 1, ry + 1); });
  // озеро й річка
  B.ellipse(GK.WATER, 42, 58, 9, 4.5, 2);
  B.line(GK.WATER, [[64, 3], [62, 12], [63, 22], [60, 32], [61, 40], [57, 48], [51, 52]], 3);
  for (let i = 0; i < W * H; i++) if (B.g[i] === GK.WATER) B.t[i] = 2;
  B.fill(GK.WOOD, 57, 36, 8, 3); B.free(57, 36, 8, 3);
  B.cust(57 * TS, 36 * TS, 65 * TS, 39 * TS, 36 * TS - 5, () => { ctx.fillStyle = '#4a3220'; ctx.fillRect(57 * TS, 36 * TS - 2, 8 * TS, 6); ctx.fillRect(57 * TS, 39 * TS - 4, 8 * TS, 6); ctx.fillStyle = '#7a5632'; ctx.fillRect(57 * TS, 36 * TS - 2, 8 * TS, 2); for (let i = 0; i <= 8; i++) { ctx.fillStyle = '#3a2814'; ctx.fillRect(57 * TS + i * TS - 2, 36 * TS - 14, 4, 18); } });
  // межа лісу (вхід на сході)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const ring = x < 3 || x > 92 || y < 3 || y > 68; if (ring && !(x > 92 && y >= 33 && y <= 39)) { B.block(x, y, 1, 1, 2); B.g[idx(x, y)] = GK.DGRASS; if ((x + y) % 2 === 0) B.tree(x, y, y < 3 || x < 3 || (x + y) % 6 === 0 ? 'pine' : 'oak'); } }
  B.spawn('village', 91, 36); B.spawn('default', 91, 36); B.spawn('revive', 79, 38);
  B.door(94 * TS, 36.5 * TS, 90, 'Повернутись до селища Попіл', () => zoneGo('village', 'west'));
  // --- табір мисливців (відродження)
  B.bonfire = { x: 80, y: 36 };
  B.house(72, 27, 7, 7, { wall: 'log', roof: 'moss', chimney: true, door: 3 });
  B.treasure(75, 35, 'lodge', { items: [['axe', 1], ['knife', 1], ['bread', 3], ['apple', 2]], text: 'У скрині під лавою — старі, але справні інструменти.' });
  B.tent(84, 30, '#6a7a3a'); B.tent(84, 40, '#7a5a3a'); B.barrel(77, 40); B.barrel(78, 40); B.crate(76, 40); B.lamp(78, 33); B.lamp(83, 37); B.bench(79, 38);
  B.sign(90, 34, ['«Сіре Узлісся. Мисливський табір «Привал».»', 'Нижче: «Вовки — на півночі. Ведмеді — на північному заході. Ельфи-розбійники — на заході. Ліси не прощають поспіху.»']);
  B.npc({ id: 'taras', name: 'Мисливець Тарас', look: 'hunter', x: 78, y: 37, look0: 1.57, ir: 70, vendor: { id: 'taras', name: 'Табір «Привал»', slots: [], goods: [{ id: 'bread', price: 10 }, { id: 'cooked_meat', price: 22 }, { id: 'apple', price: 6 }, { id: 'honey', price: 18 }, { id: 'fishing_rod', price: 55 }, { id: 'knife', price: 40 }, { id: 'arrows', price: 5 }], count: 0, potions: true, potionOff: 0.9 },
    talks: [L('Привал — єдине місце в Узліссі, де можна спати без одного ока. Я Тарас. Годую, лікую, продаю, що маю.', 'Вовки — на півночі, зграєю. Ведмеді — десь біля скель, на північному заході. А ельфи… Ельфи-розбійники обжили табір на заході. Колись були нашими. Тепер — не наші.'), L('Ліс щедрий: ягоди, трави, гриби. Сокира й кирка — тут твої друзі. Сокира в скрині біля хати — бери, не питай.'), L('Хочеш зловити рибу — озеро на півдні. З вудкою, звісно.'), L('Олень швидкий, заєць швидший. Але обидва — хороша вечеря.')] });
  // --- табір розбійників
  B.fence(16, 29, 32, 29); B.fence(16, 45, 32, 45); B.fence(16, 29, 16, 45); B.fence(32, 29, 32, 45, [7, 8]);
  B.campfire(24, 37); B.tent(18, 31, '#3a5a34'); B.tent(18, 40, '#4a3a2a'); B.tent(27, 41, '#3a5a34'); B.barrel(29, 31); B.barrel(30, 31); B.crate(28, 33); B.logFall(22, 40);
  B.treasure(21, 34, 'bandit', { items: [['gold_ingot', 1], ['gem', 1], ['arrows', 8]], ash: 120, gear: 3, text: 'Схованка ватажка розбійників.' });
  B.sign(34, 34, ['«РОЗШУКУЄТЬСЯ: хто забирає наші речі.»', 'Підпис — стрілою, не чорнилом.']); B.banner(31, 35, '#2e5a34'); B.banner(31, 39, '#2e5a34');
  [[20, 31], [30, 31], [20, 43], [30, 43]].forEach(([x, y]) => B.foe('elfArcher', x, y)); [[22, 36], [26, 40], [27, 34], [24, 43], [20, 38]].forEach(([x, y]) => B.foe('elfRogue', x, y));
  B.foe('elfRogue', 21, 36, { elite: true, name: 'Ватажок Ільвар' }); B.foe('elfRogue', 38, 33); B.foe('elfArcher', 40, 41);
  // --- вовче лігво
  [[43, 12], [49, 12], [46, 17]].forEach(([x, y]) => B.bones(x, y)); B.logFall(44, 14);
  [[46, 11], [44, 15], [49, 14], [47, 17]].forEach(([x, y]) => B.foe('wolf', x, y)); B.foe('wolf', 45, 9, { elite: true, name: 'Вожак зграї' }); B.foe('wolf', 48, 27); B.foe('wolf', 30, 52);
  // --- скелі, руда, ведмеді
  B.cave(14, 9); [[12, 10], [16, 10]].forEach(([x, y]) => B.bones(x, y));
  [[11, 17, 'iron'], [14, 20, 'iron'], [19, 20, 'iron'], [22, 17, 'iron'], [10, 20, 'coal'], [20, 14, 'coal'], [23, 20, 'coal'], [13, 15, 'stone'], [17, 22, 'stone'], [24, 15, 'stone'], [9, 14, 'gold']].forEach(([x, y, k], i) => B.node(x, y, k, i));
  B.foe('bear', 13, 12); B.foe('bear', 18, 11); B.foe('bear', 11, 8, { elite: true, name: 'Старий ведмідь' });
  // --- озеро: риба й очерет
  [[38, 55], [46, 56], [42, 54], [34, 58]].forEach(([x, y]) => B.node(x, y, 'fish')); [[33, 55], [51, 57], [44, 63], [38, 62]].forEach(([x, y]) => B.flowers(x, y, '#f0f0f0'));
  // --- галявина оленів
  [[64, 50], [68, 54], [62, 55], [70, 49]].forEach(([x, y]) => B.foe('deer', x, y)); [[52, 30], [58, 26], [40, 46], [70, 30], [30, 50], [66, 44], [44, 28], [76, 50]].forEach(([x, y]) => B.foe('rabbit', x, y));
  for (let i = 0; i < 14; i++) B.flowers(58 + Math.floor(rng() * 16), 46 + Math.floor(rng() * 10), ['#e8d048', '#e86a8a', '#a08af0'][i % 3]);
  // --- ресурси: яблуні, трави, ягоди, гриби
  [[60, 47], [72, 53], [58, 54], [74, 47], [34, 44], [56, 30]].forEach(([x, y], i) => B.node(x, y, 'apple', i));
  const spots = []; for (let tries = 0; tries < 900 && spots.length < 70; tries++) { const x = 5 + Math.floor(rng() * 86), y = 5 + Math.floor(rng() * 62); if (!B.t[idx(x, y)] && (B.g[idx(x, y)] === GK.GRASS || B.g[idx(x, y)] === GK.DGRASS)) spots.push([x, y]); }
  spots.forEach(([x, y], i) => { if (!B.t[idx(x, y)]) B.node(x, y, ['herb', 'berry', 'mushroom', 'herb', 'berry'][i % 5], i); });
  // --- густий ліс: дерева на сітці з кроком 2 (проходи гарантовані)
  let treeN = 0;
  for (let gy = 4; gy < H - 4; gy += 2) for (let gx = 4; gx < W - 4; gx += 2) {
    const x = gx + (rng() < 0.4 ? 1 : 0), y = gy + (rng() < 0.4 ? 1 : 0); if (rng() > 0.82) continue;
    let ok = true; for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) { ok = false; break; } const k = idx(xx, yy); if (B.t[k] || B.noTree[k] || (B.g[k] !== GK.GRASS && B.g[k] !== GK.DGRASS)) { ok = false; break; } }
    if (!ok) continue;
    const r = rng(), kind = y < 24 || x < 20 ? (r < 0.7 ? 'pine' : 'oak') : (r < 0.1 ? 'autumn' : r < 0.72 ? 'oak' : 'pine');
    if (rng() < 0.16) B.node(x, y, 'tree', treeN++); else B.tree(x, y, kind);
  }
  for (let i = 0; i < 50; i++) { const x = 4 + Math.floor(rng() * 88), y = 4 + Math.floor(rng() * 64), k = idx(x, y); if (!B.t[k] && !B.noTree[k] && B.g[k] === GK.GRASS) (rng() < 0.55 ? B.bush(x, y) : B.rock(x, y)); }
}
ZONES.forest = { name: 'Сіре Узлісся', w: 96, h: 72, base: GK.GRASS, music: 'forest', theme: { ambient: 0.2, tint: '8,18,16', sight: 780 }, cfg: { scale: 1.5, xpMul: 1.15, elite: { name: 'Вожак', big: true } }, build: buildForest };
