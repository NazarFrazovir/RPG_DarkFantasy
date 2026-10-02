'use strict';
// ===== МІСТО ЕЙРИ: хаб із брамами до підземель, ринок, гільдія =====

const DUNGEON_REC = [1, 3, 5, 7, 9]; // рекомендований рівень героя
const GATE_STYLE = [
  { stone: ['#6a5a48', '#4a3e30', '#8a7a62'], inner: 'wood' }, // 0 Цвинтар
  { stone: ['#5a5a66', '#3a3a46', '#7a7a88'], inner: 'stairs' }, // 1 Катакомби
  { stone: ['#7a7088', '#544a66', '#9a90ac'], inner: 'doors' }, // 2 Собор
  { stone: ['#8aa8c0', '#5a7890', '#b4d0e4'], inner: 'ice' }, // 3 Вежа
  { stone: ['#3a3040', '#241c2a', '#5a4a62'], inner: 'throne' }, // 4 Трон
];
function gateSprite(kind) {
  const gs = GATE_STYLE[kind], st = gs.stone;
  return spr('dgate' + kind, 96, 60, (R) => {
    R(14, 14, 68, 46, '#08060c'); // отвір
    if (gs.inner === 'wood') { for (let i = 0; i < 68; i += 7) { R(14 + i, 14, 6, 46, i % 14 ? '#4a3220' : '#5a3e28'); R(14 + i, 14, 1, 46, '#6a4a30'); } R(14, 26, 68, 3, '#2a2a30'); R(14, 46, 68, 3, '#2a2a30'); R(46, 14, 4, 46, '#14100c'); for (let i = 18; i < 80; i += 12) R(i, 26, 2, 3, '#8a8a96'); }
    else if (gs.inner === 'stairs') { for (let i = 0; i < 8; i++) R(18 + i * 2, 18 + i * 5, 60 - i * 4, 4, `rgb(${40 - i * 4},${40 - i * 4},${52 - i * 5})`); R(14, 14, 68, 4, '#000'); }
    else if (gs.inner === 'doors') { R(14, 14, 34, 46, '#3a2a4a'); R(48, 14, 34, 46, '#3a2a4a'); R(47, 14, 2, 46, '#14101c'); disc(R, 48, 24, 10, '#7a3ac8'); disc(R, 48, 24, 7, '#c890ff'); R(47, 17, 2, 14, '#3a2060'); R(41, 23, 14, 2, '#3a2060'); R(20, 36, 22, 2, '#6a5a88'); R(54, 36, 22, 2, '#6a5a88'); }
    else if (gs.inner === 'ice') { R(14, 14, 68, 46, '#a8d0ec'); for (let i = 0; i < 68; i += 4) R(14 + i, 14, 3, 8 + ((i * 7) % 16), '#e4f4ff'); R(14, 38, 68, 22, '#5a88b0'); for (let i = 0; i < 12; i++) R(20 + ((i * 17) % 56), 30 + ((i * 11) % 26), 2, 2, '#fff'); }
    else { R(14, 14, 68, 46, '#1a0408'); for (let i = 0; i < 10; i++) R(20 + i * 6, 14, 2, 46, '#2a1018'); R(22, 28, 52, 20, 'rgba(160,20,30,.35)'); R(32, 36, 32, 10, 'rgba(255,60,60,.25)'); }
    // арка
    R(0, 10, 16, 50, st[0]); R(80, 10, 16, 50, st[0]); R(0, 10, 3, 50, st[2]); R(13, 10, 3, 50, st[1]); R(80, 10, 3, 50, st[2]); R(93, 10, 3, 50, st[1]);
    for (let y = 14; y < 60; y += 7) { R(0, y, 16, 1, st[1]); R(80, y, 16, 1, st[1]); }
    R(0, 0, 96, 14, st[0]); R(0, 0, 96, 3, st[2]); R(0, 12, 96, 2, st[1]); for (let x = 4; x < 92; x += 11) R(x, 3, 1, 9, st[1]);
    R(-0, 56, 96, 4, 'rgba(0,0,0,.3)');
    // емблема над аркою
    if (kind === 0) { R(44, 3, 8, 8, '#d8d0b8'); R(46, 6, 2, 2, '#14100c'); R(50, 6, 2, 2, '#14100c'); R(47, 9, 4, 1, '#14100c'); }
    else if (kind === 4) { R(40, 5, 16, 6, '#e0b040'); for (let i = 0; i < 4; i++) R(40 + i * 5, 2, 3, 4, '#e0b040'); R(46, 6, 4, 2, '#c03aff'); }
    else if (kind === 3) { for (let i = 0; i < 6; i++) R(34 + i * 5, 10, 2, 4 + (i % 2) * 3, '#e4f4ff'); }
    else if (kind === 2) { R(47, 2, 2, 9, '#c9a35a'); R(43, 5, 10, 2, '#c9a35a'); }
    else { R(42, 4, 12, 7, st[1]); R(44, 6, 8, 3, st[2]); }
  });
}
ZB.prototype.dungeonGate = function (cx, ty, idx, spawnName) {
  const c = gateSprite(idx), x = (cx + 0.5) * TS - 96, y = (ty + 1) * TS - 120;
  this.block(cx - 2, ty, 5, 1, 2);
  this.obj({ x0: x, y0: y - 40, x1: x + 192, y1: y + 124, y: (ty + 1) * TS, draw: () => {
    blit(c, x, y);
    const locked = idx > (G.unlocked || 0);
    if (locked) { ctx.fillStyle = 'rgba(8,6,12,.55)'; ctx.fillRect(x + 28, y + 28, 136, 92); ctx.strokeStyle = '#5a5a66'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 28, y + 40); ctx.lineTo(x + 164, y + 100); ctx.moveTo(x + 164, y + 40); ctx.lineTo(x + 28, y + 100); ctx.stroke(); ctx.fillStyle = '#c9a35a'; ctx.fillRect(x + 84, y + 62, 24, 20); ctx.fillStyle = '#7a5a20'; ctx.fillRect(x + 90, y + 52, 12, 12); ctx.fillStyle = '#14100c'; ctx.fillRect(x + 94, y + 68, 4, 8); }
    ctx.textAlign = 'center'; ctx.font = 'bold 14px Georgia'; const nm = LEVELS[idx].name, w = ctx.measureText(nm).width + 16;
    ctx.fillStyle = 'rgba(8,6,10,.75)'; ctx.fillRect(x + 96 - w / 2, y + 128, w, 36); ctx.fillStyle = locked ? '#8a8a96' : '#e8dcc0'; ctx.fillText(nm, x + 96, y + 146);
    ctx.font = '11px Georgia'; ctx.fillStyle = locked ? '#a05a5a' : '#c9a35a'; ctx.fillText(locked ? 'зачинено' : 'рекомендовано рівень ' + DUNGEON_REC[idx], x + 96, y + 160);
  } });
  this.light((cx + 0.5) * TS, (ty + 1) * TS - 30, 110, 0.9);
  this.spawn(spawnName, cx, ty + 3);
  this.door((cx + 0.5) * TS, (ty + 1) * TS + 34, 70, 'Брама', () => {
    const locked = idx > (G.unlocked || 0);
    if (locked) { showDialog([{ who: '', text: 'Брама зачинена. Спершу пройди ' + (idx > 0 ? '«' + LEVELS[idx - 1].name + '»' : 'інше підземелля') + '.' }]); return; }
    const done = idx < (G.unlocked || 0);
    showChoice(`«${LEVELS[idx].name}». Рекомендований рівень героя — ${DUNGEON_REC[idx]} (у тебе ${P.level}). ${done ? 'Ти вже проходив це підземелля.' : ''} Увійти?`, [
      { text: 'Увійти', cb: () => { G.state = 'play'; enterDungeon(idx); } },
      { text: 'Ще ні', cb: () => { G.state = 'play'; } },
    ]);
  });
  this.inter[this.inter.length - 1].dyn = () => (idx > (G.unlocked || 0) ? 'Брама зачинена' : `Увійти: ${LEVELS[idx].name}`);
};
ZB.prototype.fountain = function (tx, ty) {
  this.deco(tx, ty, 2, 2, 'fountain', 32, 36, (R) => { disc(R, 16, 26, 15, '#6a6a76'); disc(R, 16, 26, 13, '#8a8a96'); disc(R, 16, 26, 11, '#2a5a88'); R(14, 8, 4, 16, '#9a9aa6'); R(12, 6, 8, 3, '#b0b0bc'); R(10, 10, 2, 8, '#6ab0e0'); R(20, 10, 2, 8, '#6ab0e0'); R(14, 2, 4, 6, '#8ad0f0'); R(6, 24, 4, 1, '#8ad0f0'); R(22, 28, 5, 1, '#8ad0f0'); }, { light: [120, 0.7] });
};
ZB.prototype.statue = function (tx, ty, text) {
  this.deco(tx, ty, 2, 1, 'statue', 32, 62, (R) => { R(2, 48, 28, 12, '#5a5a66'); R(2, 48, 28, 3, '#8a8a96'); R(6, 38, 20, 10, '#6a6a76'); R(11, 16, 10, 24, '#8a8a96'); R(11, 16, 3, 24, '#a8a8b4'); R(7, 18, 4, 16, '#8a8a96'); R(21, 18, 4, 16, '#7a7a86'); R(12, 8, 8, 9, '#b0b0bc'); R(12, 8, 8, 9, '#a0a0ac'); R(10, 4, 12, 4, '#c9a35a'); for (let i = 0; i < 3; i++) R(10 + i * 5, 1, 2, 4, '#c9a35a'); R(13, 11, 6, 4, '#8a8a96'); R(14, 40, 4, 1, '#3a3a44'); }, { ox: 0 });
  if (text) this.door((tx + 1) * TS, (ty + 1) * TS + 16, 60, 'Оглянути статую', () => showDialog(text.map((l) => ({ who: '', text: l }))));
};
ZB.prototype.bench = function (tx, ty) { this.deco(tx, ty, 2, 1, 'bench', 32, 14, (R) => { R(0, 2, 32, 4, '#6a4a28'); R(0, 2, 32, 1, '#8a6a3c'); R(2, 6, 3, 7, '#3a2814'); R(27, 6, 3, 7, '#3a2814'); R(0, 7, 32, 2, '#5a3e22'); }); };
ZB.prototype.banner = function (tx, ty, col) { this.deco(tx, ty, 1, 1, 'banner' + col, 12, 40, (R) => { R(5, 0, 2, 40, '#3a2814'); R(0, 4, 12, 24, col); R(0, 4, 12, 2, zsh(col, 1.3)); R(3, 12, 6, 6, '#e0c060'); R(0, 26, 4, 4, zsh(col, 0.7)); R(8, 26, 4, 4, zsh(col, 0.7)); }, { solid: false, ox: 4 }); };

// ---------- Місто ----------
function buildCity(B) {
  const W = 80, H = 60, rng = mulberry32(7771);
  B.fill(GK.COBBLE, 0, 0, W, H);
  B.fill(GK.STONE, 37, 3, 6, 54); B.fill(GK.STONE, 3, 27, 74, 6); B.ellipse(GK.STONE, 40, 30, 9, 8);
  // парки
  B.fill(GK.GRASS, 5, 5, 18, 12); B.fill(GK.GRASS, 46, 4, 28, 11);
  B.ellipse(GK.SAND, 60, 9, 8, 4.5); B.ellipse(GK.WATER, 60, 9, 5.5, 3, 2);
  // мур
  B.fill(GK.WALL, 0, 0, W, 3); B.fill(GK.WALL, 0, 57, W, 3); B.fill(GK.WALL, 0, 0, 3, H); B.fill(GK.WALL, 77, 0, 3, H);
  B.block(0, 0, W, 3); B.block(0, 57, W, 3); B.block(0, 0, 3, H); B.block(77, 0, 3, H);
  B.fill(GK.STONE, 37, 0, 6, 4); B.free(37, 0, 6, 3);
  [[33, 0], [43, 0]].forEach(([x, y]) => B.house(x, y, 4, 5, { wall: 'stone', roof: 'slate', blank: true }));
  [[0, 0], [75, 0], [0, 55], [75, 55]].forEach(([x, y]) => B.house(x, y, 5, 5, { wall: 'stone', roof: 'slate', blank: true }));
  B.spawn('village', 40, 6); B.spawn('default', 40, 6); B.bonfire = { x: 35, y: 40 };
  B.door(40 * TS, 2.2 * TS, 80, 'Вийти до селища Попіл', () => zoneGo('village', 'south'));
  B.sign(36, 5, ['«Північна брама. Дорога на селище Попіл.»', 'Під написом: «Вартові — не жебраки. Не просіть.»']);
  // будинки
  B.house(5, 19, 7, 7, { wall: 'stone', roof: 'blue' }); B.house(13, 20, 6, 6, { wall: 'plaster', roof: 'red' }); B.house(20, 19, 7, 7, { wall: 'stone', roof: 'slate' }); B.house(28, 20, 6, 6, { wall: 'plaster', roof: 'moss' });
  B.house(46, 17, 10, 9, { wall: 'stone', roof: 'slate', sign: 'coin', door: 5, enter: 'guild', name: 'Гільдія Шукачів', spawn: 'guild', enterSpawn: 'door' });
  B.house(57, 19, 7, 7, { wall: 'plaster', roof: 'red' }); B.house(65, 20, 6, 6, { wall: 'stone', roof: 'blue' }); B.house(72, 20, 5, 6, { wall: 'white', roof: 'red', sign: 'bread', door: 2 });
  B.house(6, 50, 9, 6, { wall: 'stone', roof: 'slate', sign: 'anvil', door: 4 }); B.house(18, 50, 7, 6, { wall: 'plaster', roof: 'red', sign: 'herb', door: 3 }); B.house(28, 50, 6, 6, { wall: 'log', roof: 'thatch' });
  // центр
  B.fountain(39, 29); B.statue(39, 22, ['Статуя короля на троні: корона на місці, плечі розправлені. А обличчя стерте — гладка кам’яна пластина.', 'На постаменті: «Мальгорат IX. Той, хто дав нам час.» Нижче хтось видряпав: «…і забрав усе інше.»']);
  B.bench(33, 28); B.bench(45, 28); B.bench(33, 33); B.bench(45, 33);
  // ринок (SW)
  B.fill(GK.STONE, 5, 35, 29, 14);
  B.stall(7, 36, 3, { awning: '#8a2a2a', goods: 'weapon' }); B.stall(13, 36, 3, { awning: '#2a4a8a', goods: 'potion' }); B.stall(19, 36, 3, { awning: '#c8a038', goods: 'fruit' }); B.stall(25, 36, 3, { awning: '#6a3a8a', goods: 'cloth' });
  B.stall(9, 43, 3, { awning: '#2a6a5a', goods: 'weapon' }); B.stall(16, 43, 3, { awning: '#a03a2a', goods: 'cloth' }); B.stall(23, 43, 3, { awning: '#8a6a2a', goods: 'potion' });
  B.barrel(5, 40); B.barrel(5, 41); B.crate(31, 40); B.crate(32, 40); B.crate(31, 46);
  // брами підземель (SE)
  B.fill(GK.STONE, 44, 39, 33, 17); B.fill(GK.WALL, 44, 33, 33, 6); B.block(44, 33, 33, 6);
  [47, 53, 59, 65, 71].forEach((cx, i) => B.dungeonGate(cx, 38, i, 'gate' + i));
  B.banner(45, 41, '#7a2430'); B.banner(74, 41, '#7a2430');
  B.sign(42, 40, ['«Площа Брам. Підземелля Ейри.»', 'Кожна брама — окремий шлях. Зачинені відкриваються, коли здолано попередню. Рекомендований рівень вказано.']);
  // ліхтарі
  for (let y = 6; y <= 54; y += 6) { B.lamp(36, y); B.lamp(43, y); }
  [[10, 26], [24, 26], [50, 26], [68, 26], [10, 34], [24, 48], [48, 42], [74, 42], [74, 50]].forEach(([x, y]) => B.lamp(x, y));
  // дерева та кущі в парках
  for (let i = 0; i < 22; i++) { const x = 6 + Math.floor(rng() * 16), y = 6 + Math.floor(rng() * 10); if (!B.t[y * W + x] && B.g[y * W + x] === GK.GRASS && i % 2 === 0) B.tree(x, y, i % 4 === 0 ? 'autumn' : 'oak'); else if (!B.t[y * W + x]) B.bush(x, y); }
  for (let i = 0; i < 26; i++) { const x = 47 + Math.floor(rng() * 26), y = 5 + Math.floor(rng() * 9); if (!B.t[y * W + x] && B.g[y * W + x] === GK.GRASS) (i % 3 ? B.tree(x, y, i % 5 === 0 ? 'autumn' : 'oak') : B.bush(x, y)); }
  [[7, 17], [10, 17], [20, 17], [48, 15], [70, 14]].forEach(([x, y], i) => B.flowers(x, y, ['#e86a8a', '#e8d048', '#a08af0'][i % 3]));
  B.bench(12, 12); B.bench(50, 12); B.bench(66, 10);
  cityNpcs(B);
}
function cityNpcs(B) {
  B.npc({ id: 'cg1', name: 'Вартовий брами', look: 'guard', x: 37, y: 4, look0: 1.57, talks: [L('Стій. Місто Ейри. Куди й навіщо? А, до Площі Брам — прямо й вправо.', 'Тут усе просто: чотири проспекти й п’ять брам. Живим повертаються не всі.')] });
  B.npc({ id: 'cg2', name: 'Вартовий брами', look: 'guard', x: 42, y: 4, look0: 1.57, talks: [L('Ти з Попелу? Ого. Там давно не було гостей. Вітаю в столиці — що від неї лишилось.')] });
  B.npc({ id: 'garth', name: 'Ґарт, зброяр', look: 'smith', x: 8, y: 35, look0: 1.57, ir: 70, vendor: { id: 'garth', name: 'Зброярня Ґарта', slots: ['weapon', 'armor', 'helmet'], rar: [8, 28, 38, 20, 6], count: 6, potions: false }, talks: [L('Міська зброя — не сільська. Загартована, перевірена, з клеймом гільдії. Бери.'), L('Дорого? Метал дорогий. Життя — дорожче.')] });
  B.npc({ id: 'selin', name: 'Селін, чарівниця', look: 'alchemist', x: 14, y: 35, look0: 1.57, ir: 70, vendor: { id: 'selin', name: 'Лавка Селін', slots: ['amulet', 'ring', 'amulet', 'ring'], rar: [6, 24, 38, 26, 6], count: 5, potions: true, potionOff: 0.85 }, talks: [L('Обереги, перстені, чари. Усе, що тримає розум цілим серед підземної пітьми.'), L('Холод їсть не лише імена. І спогади, і сили. Мої обереги його відганяють. Трохи.')] });
  B.npc({ id: 'morgan', name: 'Морган, скупник', look: 'merchant', x: 20, y: 35, look0: 1.57, ir: 70, vendor: { id: 'morgan', name: 'Лавка Моргана', slots: ['weapon', 'helmet', 'armor', 'amulet', 'ring'], rar: [30, 40, 22, 7, 1], count: 7, potions: true, potionOff: 0.9 }, talks: [L('Скуповую, продаю, не питаю, звідки. Попіл не пахне.'), L('Знаєш Коста з Попелу? Мій колишній учень. Лічить краще, ніж краде.')] });
  B.npc({ id: 'wyl', name: 'Вайла, торговка', look: 'farmwife', x: 26, y: 35, look0: 1.57, talks: [L('Тканини! З самого заходу, де ще не вмерла мода. Хоча тут вона вмерла давно.')] });
  B.npc({ id: 'bro', name: 'Брат Ілько', look: 'priest', x: 10, y: 44, look0: -1.57, talks: [L('Я продаю благословення. Недорого. Ну, якщо не забуду, скільки просив.')] });
  B.npc({ id: 'tamar', name: 'Тамара, пекарка', look: 'baker', x: 17, y: 44, look0: -1.57, talks: [L('Хліб, пироги, коржики. Усе гаряче. Усе з пам’яті — інших рецептів не маю.')] });
  B.npc({ id: 'oden', name: 'Оден, зілляр', look: 'alchemist', x: 24, y: 44, look0: -1.57, talks: [L('Зілля, що працюють. Якщо ні — скарг не приймаю. Бо покупець мертвий.')] });
  B.npc({ id: 'stef', name: 'Жебрак Стеф', look: 'oldwoman', x: 41, y: 24, look0: 1.57, talks: [
    L('Подивись на статую. Обличчя стерте — чому? Я знаю. Бо ніхто не пам’ятав, яким воно було.', 'Хлопчиком він бігав тут босоніж. Я його бачив. Принц, що не був принцом. Ніхто мені не вірить.'),
    L('Король не помер. Він знову починає. Як хліб: місиш, печеш, їси. І знову.'),
  ] });
  B.npc({ id: 'rev', name: 'Гільдмайстер Ревн', look: 'elder', x: 51, y: 27, look0: 1.57, talks: [L('Гільдія в будинку попереду. Там дошка завдань, поради досвідчених шукачів. Заходь.')] });
  ['Сердар', 'Лана', 'Бруно', 'Іма', 'Томек'].forEach((nm, i) => B.npc({ id: 'cit' + i, name: nm, look: ['farmer', 'farmwife', 'hunter', 'baker', 'bard'][i], x: 30 + i * 4, y: 30 + (i % 2) * 2, mode: 'wander', radius: 8, speed: 28, talks: [L(['Ейра колись була столицею. Тепер — просто місто. З брамами.', 'Мого чоловіка забрало підземелля. Я пам’ятаю його вуса. Імені — ні.', 'Я мисливець на нечисть. Платять погано, зате розваги вистачає.', 'Хліб тут дешевший за правду. Бери хліб.', '♪ Ейро, Ейро, де твоя корона… ♪'][i]), L(FORGOT[i % 3])] }));
  B.npc({ id: 'ckid1', name: 'Мілка', look: 'child2', x: 44, y: 31, mode: 'wander', radius: 6, speed: 56, scale: 1.55, talks: [L('Ловлю голуби! Ну, курей. Голубів тут нема. Мама казала, їх з’їли.')] });
  B.npc({ id: 'ckid2', name: 'Дан', look: 'child1', x: 34, y: 31, mode: 'wander', radius: 6, speed: 56, scale: 1.55, talks: [L('Я колись був у Підземеллі! Ну, біля брами. Там холодно.')] });
  ['Вартовий Площі Брам', 'Вартовий Площі Брам', 'Вартовий Площі Брам'].forEach((nm, i) => B.npc({ id: 'dgs' + i, name: nm, look: 'guard', x: [50, 62, 68][i], y: 47, look0: -1.57, talks: [L(['Цвинтар — для початківців. Катакомби — для тих, хто вміє дихати в темряві.', 'Собор і Вежа — вже не жарти. Бери найкраще спорядження й таланти.', 'Трон відчиняється останнім. І, кажуть, відчиняє тільки тих, хто вже бував там.'][i])] }));
  B.animal({ kind: 'dog', x: 38, y: 33, radius: 8, speed: 36, col: '#8a6a42' });
  B.animal({ kind: 'cat', x: 31, y: 28, radius: 5, speed: 28, col: '#c88a3a' }); B.animal({ kind: 'cat', x: 60, y: 30, radius: 6, speed: 28, col: '#3a3a42' });
  for (let i = 0; i < 4; i++) B.animal({ kind: 'chicken', x: 12 + i * 3, y: 47, radius: 4, col: '#9a9aa6' });
}
ZONES.city = { name: 'Місто Ейри', w: 80, h: 60, base: GK.COBBLE, music: 'city', theme: { ambient: 0 }, build: buildCity };

interior('guild', 'Гільдія Шукачів', 22, 14, { exit: 'guild', exitZone: 'city', music: 'tavern', ambient: 0.3 }, (B) => {
  B.fill(GK.RUG, 8, 4, 6, 6); B.hearth(15, 1); B.shelf(2, 1, 3); B.shelf(6, 1, 3, false); B.rack(10, 1, 3);
  B.board(2, 5, ['Дошка завдань:', '— Цвинтар: Ворон просить вбити Вартового. Нагорода: Попіл.', '— Катакомби: знайти саркофаги з іменами.', '— Собор: Сестра Мара шукає нічну свічку.', '(Квести будуть додано пізніше.)']);
  B.table(8, 6, 3); B.stool(7, 6); B.stool(11, 6); B.table(15, 9, 2); B.table(3, 10, 2); B.crate(19, 6); B.barrel(19, 7);
  B.npc({ id: 'revn', name: 'Гільдмайстер Ревн', look: 'elder', x: 10, y: 3, look0: 1.57, talks: [
    L('Гільдія Шукачів. Кожен, хто йде у підземелля, колись стоїть тут. Хто повертається — стоїть знову.', 'П’ять брам. Кожна — важча за попередню. Рівень героя біля брами вказано: дивись на нього. Не соромся повертатись у Місто — тут є і торгівля, і відпочинок.'),
    L('Порада: спершу Цвинтар, потім Катакомби. Не пробуй Собор раніше за п’ятий рівень. Талант на підкласи відкривається на п’ятому, а вознесіння — на десятому.'),
    L('Ходять чутки про шостий шлях — не підземелля, а пам’ять. Не знаю, що це значить.'),
  ] });
  B.npc({ id: 'vet', name: 'Ветеран Орен', look: 'hunter', x: 15, y: 6, look0: 3.14, talks: [L('Три рази в Катакомбах. Двічі виповз. Третій раз — рахунок за тебе.'), L('Найбільше вбиває не бос. Втома. Не забувай про зілля [F].')] });
});
