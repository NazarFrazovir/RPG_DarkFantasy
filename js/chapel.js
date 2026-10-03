'use strict';
// ===== КАПЛИЦЯ СВІЧОК: вітражі з променями, колони, лавки, святі, свічники, люстри =====

function glassSprite(kind) { // готичне вікно-вітраж 24×44
  const pal = [['#3a5ac8', '#c83a4a', '#e0b040'], ['#e0b040', '#3aa86a', '#8a3ac8'], ['#c83a4a', '#3a5ac8', '#e0b040'], ['#3aa86a', '#e0b040', '#3a5ac8']][kind % 4];
  return spr('glass' + kind, 24, 44, (R) => {
    R(0, 0, 24, 44, '#1a1822'); R(1, 1, 22, 43, '#4a4658');
    const inside = (x, y) => (y >= 12 && x >= 3 && x < 21 && y < 42) || (x - 12) ** 2 + (y - 12) ** 2 <= 81;
    for (let y = 0; y < 44; y++) for (let x = 0; x < 24; x++) if (inside(x, y)) {
      const cx = Math.floor(x / 6), cy = Math.floor(y / 6), c = pal[(cx * 2 + cy + kind) % 3], lead = x % 6 === 0 || y % 6 === 0;
      R(x, y, 1, 1, lead ? '#14121a' : (x + y) % 7 === 0 ? zsh(c, 1.35) : c);
    }
    R(11, 4, 2, 38, '#14121a'); R(3, 22, 18, 1, '#14121a'); R(0, 0, 24, 1, '#7a768a'); R(0, 0, 1, 44, '#7a768a'); R(23, 0, 1, 44, '#2a2834');
  });
}
function roseSprite() { // розетка-вітраж 40×40
  return spr('rose', 40, 40, (R) => {
    const pal = ['#3a5ac8', '#c83a4a', '#e0b040', '#8a3ac8', '#3aa86a', '#c83a4a', '#e0b040', '#3a5ac8'];
    for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
      const dx = x - 19.5, dy = y - 19.5, r = Math.hypot(dx, dy), a = (Math.atan2(dy, dx) + Math.PI) / (Math.PI / 4), fa = a - Math.floor(a);
      if (r > 20) continue;
      let col;
      if (r > 18) col = '#4a4658'; else if (r > 17) col = '#14121a';
      else if (r < 3.5) col = '#fff2b0'; else if (r < 5) col = '#14121a';
      else if (fa < 0.07 || fa > 0.93) col = '#14121a';
      else if (r > 12 && r < 13) col = '#14121a';
      else if (r <= 12) col = pal[Math.floor(a) % 8]; else col = pal[(Math.floor(a) + 3) % 8];
      R(x, y, 1, 1, (x + y) % 6 === 0 && col !== '#14121a' ? zsh(col, 1.3) : col);
    }
  });
}
function columnSprite() {
  return spr('column', 16, 54, (R) => {
    R(0, 48, 16, 6, '#5a586a'); R(0, 48, 16, 2, '#8a889a'); R(1, 44, 14, 5, '#6a687a'); R(4, 8, 8, 38, '#7a788a'); R(4, 8, 3, 38, '#a8a6b8'); R(10, 8, 2, 38, '#52506a');
    for (let y = 10; y < 44; y += 6) { R(6, y, 1, 4, '#8a889a'); R(9, y, 1, 4, '#6a687a'); }
    R(1, 4, 14, 5, '#6a687a'); R(0, 2, 16, 3, '#8a889a'); R(0, 0, 16, 2, '#a8a6b8'); R(0, 4, 16, 1, '#3a384a');
  });
}
function saintSprite(v) {
  const rb = ['#5a6a9a', '#8a4a4a', '#4a7a5a', '#8a6a3a'][v % 4];
  return spr('saint' + (v % 4), 20, 52, (R) => {
    R(1, 42, 18, 10, '#5a586a'); R(1, 42, 18, 2, '#9a98aa'); R(4, 38, 12, 4, '#6a687a');
    R(5, 16, 10, 24, rb); R(5, 16, 3, 24, zsh(rb, 1.3)); R(12, 16, 3, 24, zsh(rb, 0.7)); R(3, 18, 3, 14, zsh(rb, 0.85)); R(14, 18, 3, 14, zsh(rb, 0.85)); R(2, 30, 3, 3, '#d8c8b0'); R(15, 30, 3, 3, '#d8c8b0');
    R(7, 7, 6, 9, '#d8c8b0'); R(7, 7, 6, 2, zsh('#5a4030', 1)); R(8, 11, 1, 1, '#2a1a10'); R(11, 11, 1, 1, '#2a1a10'); R(5, 3, 10, 1, '#e0b040'); R(4, 4, 1, 6, '#e0b040'); R(15, 4, 1, 6, '#e0b040'); R(5, 10, 1, 1, '#e0b040'); R(14, 10, 1, 1, '#e0b040');
  });
}
function flame(x, y, t, ph, s = 1) {
  const f = Math.sin(t * 9 + ph) * 0.5 + Math.sin(t * 15 + ph * 2) * 0.5, h = Math.round((5 + f * 1.5) * s);
  ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x - Math.round(s), y - h, Math.round(2 * s) + 1, h); ctx.fillStyle = '#ffd24a'; ctx.fillRect(x - Math.round(s) + 1, y - h + 2, Math.max(1, Math.round(s)), h - 2); ctx.fillStyle = '#fff6c8'; ctx.fillRect(x, y - 3, 1, 2);
}
function beam(x0, y0, x1, y1, w0, w1, col, a) {
  const g = ctx.createLinearGradient(0, y0, 0, y1), rgb = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)].join(',');
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x0 - w0 / 2, y0); ctx.lineTo(x0 + w0 / 2, y0); ctx.lineTo(x1 + w1 / 2, y1); ctx.lineTo(x1 - w1 / 2, y1); ctx.closePath(); ctx.fill();
}

ZB.prototype.pewC = function (tx, ty, w) { this.deco(tx, ty, w, 1, 'pewc' + w, w * 16, 24, (R) => { R(0, 4, w * 16, 5, '#4a2e18'); R(0, 4, w * 16, 1, '#7a5632'); R(0, 9, w * 16, 9, '#6a4426'); R(0, 9, w * 16, 2, '#8a5e30'); R(1, 14, w * 16 - 2, 1, '#3a2410'); R(0, 18, 3, 4, '#2a1a0c'); R(w * 16 - 3, 18, 3, 4, '#2a1a0c'); R(0, 2, 3, 8, '#3a2410'); R(w * 16 - 3, 2, 3, 8, '#3a2410'); }); };
ZB.prototype.votive = function (tx, ty, label, flip) {
  const base = spr('votive', 30, 40, (R) => { R(2, 38, 26, 2, '#14100c'); R(4, 4, 2, 36, '#2a2a30'); R(24, 4, 2, 36, '#2a2a30'); [10, 22, 34].forEach((y) => { R(2, y, 26, 3, '#3a3a42'); R(2, y, 26, 1, '#6a6a76'); }); R(4, 0, 22, 4, '#3a3a42'); });
  const x = tx * TS + 2, y = (ty + 1) * TS - 80, flames = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) if ((r * 5 + c + (flip ? 1 : 0)) % 4 !== 3) flames.push([6 + c * 5, 10 + r * 12 + 2, r * 7 + c]);
  this.block(tx, ty, 1, 1, 2);
  this.cust(x, y, x + 60, y + 80, (ty + 1) * TS, () => { blit(base, x, y); flames.forEach(([a, b, p]) => { ctx.fillStyle = '#e8e0c8'; ctx.fillRect(x + a * 2 - 1, y + b * 2 - 6, 4, 8); flame(x + a * 2 + 1, y + b * 2 - 6, G.time, p); }); });
  this.light(x + 30, y + 40, 130, 0.9);
  this.door(x + 30, (ty + 1) * TS + 14, 52, 'Запалити свічку (10 Попелу)', () => {
    if (P.ash < 10) { showDialog([{ who: '', text: 'У тебе нема навіть десяти монет Попелу. Свічка чекає.' }]); return; }
    P.ash -= 10; G.candles = (G.candles || 0) + 1; Sfx.play('potion'); float(P.x, P.y - 24, 'Свічка запалена', '#ffd24a');
    showDialog([{ who: '', text: label || 'Ти запалюєш свічку за того, чиє ім’я лишилось лише відчуттям. На мить воно майже виринає в пам’яті — і гасне разом з диханням полум’я.' }]);
  });
};
ZB.prototype.chandelier = function (px, py) {
  this.cust(px - 60, py - 60, px + 60, py + 40, 9999, () => {
    const t = G.time, sw = Math.sin(t * 0.8 + px) * 1.5;
    ctx.fillStyle = '#2a2a30'; ctx.fillRect(px - 1 + sw * 0.3, py - 56, 3, 40); ctx.fillStyle = '#3a3a42'; ctx.fillRect(px - 26 + sw, py - 18, 52, 4); ctx.fillRect(px - 24 + sw, py - 14, 48, 3);
    for (let i = 0; i < 6; i++) { const cx = px - 22 + i * 9 + sw; ctx.fillStyle = '#e8e0c8'; ctx.fillRect(cx - 1, py - 26, 3, 8); flame(cx, py - 26, t, i * 1.3 + px); }
    const g = ctx.createRadialGradient(px, py - 14, 4, px, py - 14, 60); g.addColorStop(0, 'rgba(255,190,90,.22)'); g.addColorStop(1, 'rgba(255,190,90,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(px - 60, py - 70, 120, 100); ctx.globalCompositeOperation = 'source-over';
  });
  this.light(px, py + 10, 170, 0.9);
};

const CHAPEL_WIN = [{ x: 4, c: '#6a8aff', k: 0 }, { x: 7, c: '#ffc860', k: 1 }, { x: 17, c: '#ffc860', k: 2 }, { x: 20, c: '#6a8aff', k: 3 }];
interior('chapel', 'Каплиця Свічок', 24, 20, {
  exit: 'chapel', music: 'tavern', base: GK.MARBLE, ambient: 0.2, tint: '10,8,26', centerLight: false,
  tiles: { floor: ['#4a4858'], wall: '#14121a', face: '#4a4658', accent: '#8a889a' },
  fx: () => {
    if (Math.random() < 0.18) { const w = CHAPEL_WIN[Math.floor(Math.random() * 4)], f = Math.random(), dir = w.x < 12 ? 1 : -1; parts.push({ x: w.x * TS + 24 + dir * f * 120 + zrand(-18, 18), y: 100 + f * 280, vx: zrand(-3, 3), vy: zrand(2, 8), life: 4, max: 4, size: 2, color: 'rgba(255,236,190,.75)' }); }
  },
}, (B) => {
  const W = 24, H = 20;
  B.block(1, 1, W - 2, 2, 1); // товста задня стіна
  B.fill(GK.DAIS, 6, 3, 12, 3); B.fill(GK.STEP, 6, 6, 12, 1); B.fill(GK.CARPET, 11, 5, 2, 14); B.fill(GK.CARPET, 11, 3, 2, 2);
  B.spawn('door', 12, 18); B.spawn('default', 12, 18);
  // вітражі й розетка на задній стіні
  CHAPEL_WIN.forEach((w) => { const c = glassSprite(w.k), x = w.x * TS - 8, y = 3 * TS - 94; B.cust(x, y, x + 48, y + 90, -10, () => blit(c, x, y)); });
  const rs = roseSprite(), rx = 12 * TS - 40, ry = 6; B.cust(rx, ry, rx + 80, ry + 80, -10, () => blit(rs, rx, ry));
  // промені світла
  B.cust(0, 0, W * TS, H * TS, -9999, () => {
    const t = G.time, fl = 0.9 + 0.1 * Math.sin(t * 0.7); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    CHAPEL_WIN.forEach((w, i) => { const dir = w.x < 12 ? 1 : -1; beam(w.x * TS + 16, 96, w.x * TS + 16 + dir * 130, 96 + 330, 36, 80, w.c, 0.34 * fl * (i % 2 ? 1 : 0.9)); });
    beam(12 * TS, 90, 12 * TS, 90 + 300, 60, 120, '#e8b0ff', 0.26 * fl); ctx.restore();
  });
  [[4, 11, '#6a8aff'], [7, 11, '#ffc860'], [17, 11, '#ffc860'], [20, 11, '#6a8aff']].forEach(([x, y]) => B.light(x * TS + 16 + (x < 12 ? 55 : -55), y * TS, 80, 0.5));
  B.light(12 * TS, 8 * TS, 110, 0.5);
  CHAPEL_WIN.forEach((w) => B.light(w.x * TS + 16, 62, 90, 0.85)); B.light(12 * TS, 46, 120, 0.9);
  // вівтар і сходинки
  B.altar(10, 4);
  B.deco(9, 5, 1, 1, 'cstand', 14, 34, (R) => { R(5, 10, 4, 22, '#c9a35a'); R(3, 30, 8, 3, '#8a6a2a'); R(5, 5, 4, 5, '#f0ead8'); R(3, 9, 8, 2, '#c9a35a'); }, { light: [110, 0.9], ox: 2 });
  B.deco(14, 5, 1, 1, 'cstand', 14, 34, (R) => { R(5, 10, 4, 22, '#c9a35a'); R(3, 30, 8, 3, '#8a6a2a'); R(5, 5, 4, 5, '#f0ead8'); R(3, 9, 8, 2, '#c9a35a'); }, { light: [110, 0.9], ox: 2 });
  B.cust(9 * TS + 4, 5 * TS - 60, 10 * TS, 6 * TS, 6 * TS, () => { flame(9 * TS + 18, 5 * TS + 32 - 30, G.time, 1, 1); flame(14 * TS + 18, 5 * TS + 32 - 30, G.time, 2.2, 1); });
  // кафедра з Книгою Імен
  B.deco(16, 4, 1, 1, 'lectern2', 16, 28, (R) => { R(6, 14, 4, 14, '#5a3e22'); R(2, 18, 12, 6, '#4a2e18'); R(1, 8, 14, 7, '#7a5632'); R(1, 8, 14, 1, '#9a7442'); R(2, 5, 12, 4, '#e8e0c8'); R(3, 6, 10, 1, '#6a5a3a'); R(3, 8, 8, 1, '#6a5a3a'); R(7, 5, 1, 4, '#8a2a2a'); }, { light: [70, 0.6] });
  B.door(16.5 * TS, 5.4 * TS, 48, 'Книга Імен', () => { useEvent('book_names'); addNote('book_names', 'Книга Імен', 'Чорнило тече, слова зникають. Остання сторінка: «Не відпускай імена. Заради нього. Заради них усіх».'); showDialog([{ who: '', text: 'Велика книга з іменами. Сторінки розкриті, але чорнило тече — слова розпливаються й зникають, поки ти дивишся.' }, { who: '', text: 'На останній сторінці — свіжий запис дрібним почерком: «Не відпускай імена. Заради нього. Заради них усіх».' }]); });
  B.door(12.5 * TS, 5.5 * TS + 8, 44, 'Оглянути вівтар', () => showDialog([{ who: '', text: 'На вівтарі — чотири свічки, що ніколи не догоряють до кінця. Під ними — витесане на мармурі: «Поки назвали ім’я — людина жива».' }]));
  // колони, лавки
  [7, 10, 13, 16].forEach((y) => { [6, 17].forEach((x) => B.deco(x, y, 1, 1, 'column', 16, 54, (R, c) => { const cs = columnSprite(); c.drawImage(cs, 0, 0); }, { ox: 0 })); });
  [7, 9, 11, 13, 15].forEach((y) => { B.pewC(8, y, 3); B.pewC(13, y, 3); });
  // святі в нішах уздовж стін
  [[1, 7, 0], [1, 13, 1], [22, 7, 2], [22, 13, 3]].forEach(([x, y, v]) => {
    const c = saintSprite(v); B.deco(x, y, 1, 1, 'saint' + v, 20, 52, (R, cx) => { cx.drawImage(c, 0, 0); }, { ox: 2, light: [80, 0.45] });
  });
  B.door(1.5 * TS, 7.9 * TS, 50, 'Оглянути статую', () => showDialog([{ who: '', text: 'Свята Ориса з келихом: покровителька тих, хто втратив голос. Підніжжя вкрите воском.' }]));
  B.door(1.5 * TS, 13.9 * TS, 50, 'Оглянути статую', () => showDialog([{ who: '', text: 'Святий Мерен із мечем, що не має леза. Кажуть, меч стерли ті, хто молився йому надто завзято.' }]));
  B.door(22.5 * TS, 7.9 * TS, 50, 'Оглянути статую', () => showDialog([{ who: '', text: 'Свята Ейда з вогнем у долоні. Вогонь самий — з воску, але теплий. Не питай, чому.' }]));
  B.door(22.5 * TS, 13.9 * TS, 50, 'Оглянути статую', () => showDialog([{ who: '', text: 'Святий Горан зі стертим обличчям. На табличці лише: «Він зробив більше, ніж просили».' }]));
  // свічники
  B.votive(1, 10, 'Ти запалюєш свічку. На воску хтось нігтем видряпав два слова: «Не забудь». Ти не знаєш, кого.', false); B.votive(22, 10, 'Ти запалюєш свічку. Полум’я нахиляється до тебе — наче впізнає тепло.', true);
  // чаша, сповідальня, скарбничка
  B.deco(3, 17, 1, 1, 'font', 20, 30, (R) => { R(5, 18, 10, 12, '#5a586a'); R(5, 18, 10, 2, '#9a98aa'); R(1, 8, 18, 10, '#6a687a'); R(1, 8, 18, 3, '#a8a6b8'); R(3, 10, 14, 6, '#2a5a88'); R(4, 11, 5, 1, '#8ad0f0'); R(2, 28, 16, 2, '#3a384a'); }, { ox: 6 });
  B.door(3.5 * TS, 18.4 * TS, 50, 'Освячена вода', () => { P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.1); float(P.x, P.y - 24, '+ сили', '#8ad0f0'); Sfx.play('potion'); showDialog([{ who: '', text: 'Холодна вода пахне воском і каменем. Ти змиваєш утому — трохи.' }]); });
  B.deco(19, 15, 2, 1, 'confessional', 32, 58, (R) => { R(0, 14, 32, 44, '#3e2814'); R(0, 14, 32, 3, '#6a4a2a'); R(2, 4, 28, 12, '#4a3018'); R(4, 0, 24, 6, '#5a3e22'); R(15, 0, 2, 6, '#c9a35a'); R(13, 2, 6, 2, '#c9a35a'); R(3, 20, 11, 36, '#2a1a0c'); R(18, 20, 11, 36, '#2a1a0c'); R(14, 20, 4, 36, '#5a3e22'); R(4, 22, 9, 30, '#6a1e2c'); R(19, 22, 9, 30, '#6a1e2c'); R(5, 24, 1, 26, '#8a2e3c'); R(21, 24, 1, 26, '#8a2e3c'); });
  B.door(20 * TS, 16.5 * TS, 52, 'Сповідальня', () => showDialog([{ who: '', text: 'За ґратчастим віконцем — тиша і слабкий запах воску. Ти шепочеш щось, але не пам’ятаєш, що.' }, { who: '', text: 'У відповідь — шерех. «Усе, що ти забув, лежить під цією підлогою, — каже хтось. — Не копай».' }]));
  B.deco(9, 18, 1, 1, 'alms', 12, 18, (R) => { R(1, 4, 10, 14, '#5a3e22'); R(1, 4, 10, 2, '#7a5632'); R(3, 6, 6, 1, '#14100c'); R(4, 10, 4, 3, '#c9a35a'); }, { ox: 4 });
  B.door(9.5 * TS, 18.6 * TS, 44, 'Скарбничка (5 Попелу)', () => { if (P.ash < 5) { toast('Не вистачає Попелу'); return; } P.ash -= 5; Sfx.play('pickup'); float(P.x, P.y - 24, 'Дякуємо', '#ffd24a'); });
  // люстри над бічними нефами
  B.chandelier(3.6 * TS, 11 * TS); B.chandelier(20.4 * TS, 11 * TS);
  // люди
  B.npc({ id: 'ivar', name: 'Отець Івар', look: 'priest', x: 12, y: 6, look0: 1.57, ir: 70, talks: [
    L('Мир тобі, мандрівнику. У цій каплиці ми палимо свічки за тих, чиїх імен уже ніхто не пам’ятає.', 'Кожна свічка — людина. Дві згасли цього тижня. Забули, кого палили.'),
    L('Благословення не зцілює ран, але зігріває душу. Візьми трохи світла з собою.'),
    L('Кажуть, Холод їсть імена. Я кажу: Холод їсть тих, хто забув, що вони були.'),
    L('Подивись угору — вітражі. Їх малювали ті, хто вже нічого не пам’ятав. А вийшло — гарно.'),
  ], onTalk: () => { P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.25); float(P.x, P.y - 24, 'Благословення', '#fff2a0'); Sfx.play('potion'); } });
  B.npc({ id: 'pray1', name: 'Парафіянка', look: 'oldwoman', x: 4, y: 9, look0: 0, noMark: true, talks: [L('Тс-с. Я молюсь. Поки пам’ятаю, за що.')] });
  B.npc({ id: 'pray2', name: 'Старий дзвонар', look: 'elder', x: 19, y: 8, look0: 3.14, noMark: true, talks: [L('Дзвін мовчить, але я чую його щоночі. Кожен удар — чиєсь забуте ім’я.')] });
  B.npc({ id: 'novice', name: 'Послушниця Ліна', look: 'farmwife', x: 8, y: 17, mode: 'wander', radius: 2, speed: 18, talks: [L('Я підмітаю віск. Щодня. Його не меншає — наче свічки горять самі, щоб мені було чим займатись.')] });
});
