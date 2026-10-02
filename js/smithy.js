'use strict';
// ===== КУЗНЯ: горн з живим вогнем, ковадло з іскрами, точило, стійки зі зброєю й обладунками =====

function bigFire(x, y, t, s, ph) { // полум'я горна: x,y — основа
  for (let i = 0; i < 7; i++) {
    const o = Math.sin(t * 8 + i * 1.7 + ph) * 0.5 + Math.sin(t * 13 + i * 2.3) * 0.5, w = 7 * s, h = Math.round((14 + o * 5 + (i % 3) * 3) * s), fx = x + (i - 3) * 6 * s + Math.round(o * 2);
    ctx.fillStyle = '#c8381a'; ctx.fillRect(fx - w / 2, y - h, w, h); ctx.fillStyle = '#ff7a2a'; ctx.fillRect(fx - w / 2 + 1, y - h + 3, w - 2, h - 3); ctx.fillStyle = '#ffd24a'; ctx.fillRect(fx - w / 2 + 2, y - h + 7, w - 4, Math.max(2, h - 8)); ctx.fillStyle = '#fff6c8'; ctx.fillRect(fx - 1, y - Math.round(h * 0.45), 2, Math.round(h * 0.4));
  }
}
function glow(x, y, r, a, col = '255,150,60') {
  const g = ctx.createRadialGradient(x, y, 4, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}

ZB.prototype.bigForge = function (tx, ty) { // горн 5×1, висока піч із димарем у стіну
  const c = spr('bigforge', 88, 66, (R) => {
    R(0, 20, 88, 46, '#4a4852'); R(0, 20, 88, 3, '#7a7886'); for (let y = 24; y < 66; y += 6) { R(0, y, 88, 1, '#2a2832'); for (let x = (y % 12 ? 7 : 0); x < 88; x += 14) R(x, y, 1, 6, '#2a2832'); }
    R(14, 0, 60, 24, '#3e3c46'); R(14, 0, 60, 3, '#6a6876'); for (let y = 5; y < 24; y += 6) R(14, y, 60, 1, '#22202a'); R(30, 0, 28, 6, '#2a2832'); // димар
    R(8, 30, 72, 30, '#0e0a08'); R(6, 28, 76, 4, '#8a8896'); R(6, 28, 76, 1, '#b0aebc'); R(8, 54, 72, 6, '#2a1a10'); // пащека
    for (let i = 0; i < 18; i++) R(10 + (i * 4) % 68, 54 + (i * 3) % 5, 3, 2, i % 2 ? '#a02a10' : '#5a1a0a');
    R(0, 60, 88, 6, '#2a2832'); R(0, 60, 88, 1, '#5a5866');
  });
  const x = tx * TS - 8, y = (ty + 1) * TS - 132;
  this.block(tx, ty, 5, 1, 2);
  this.cust(x, y - 20, x + 176, y + 140, (ty + 1) * TS, () => {
    blit(c, x, y); const t = G.time; ctx.fillStyle = '#ff6a1a'; ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 5); ctx.fillRect(x + 24, y + 108, 128, 8); ctx.globalAlpha = 1;
    ctx.save(); ctx.beginPath(); ctx.rect(x + 16, y + 62, 144, 58); ctx.clip(); bigFire(x + 88, y + 112, t, 1.6, 0); ctx.restore();
    glow(x + 88, y + 100, 190 + 10 * Math.sin(t * 7), 0.34);
  });
  this.light(x + 88, y + 110, 300, 1);
};
ZB.prototype.bellows = function (tx, ty) {
  const c = spr('bellows', 22, 26, (R) => { R(2, 14, 18, 12, '#5a3e22'); R(2, 14, 18, 2, '#8a6a3c'); R(2, 16, 18, 8, '#6a4426'); R(4, 8, 14, 6, '#3a2814'); R(0, 2, 6, 4, '#4a4852'); R(18, 14, 4, 6, '#2a2832'); R(8, 22, 6, 2, '#2a1a0c'); for (let i = 0; i < 4; i++) R(4 + i * 4, 15, 1, 8, '#2a1a0c'); });
  const x = tx * TS + 2, y = (ty + 1) * TS - 52; this.block(tx, ty, 1, 1, 2);
  this.cust(x, y, x + 44, y + 52, (ty + 1) * TS, () => { const k = Math.max(0, Math.sin(G.time * 2.2)); ctx.save(); ctx.translate(x, y + k * 4); ctx.drawImage(c, 0, 0, 22 * 2, 26 * 2); ctx.restore(); });
};
ZB.prototype.smithAnvil = function (tx, ty) {
  const c = spr('anvil2', 24, 26, (R) => { R(1, 6, 22, 6, '#4a4a56'); R(1, 6, 22, 2, '#a0a0ae'); R(17, 5, 7, 4, '#4a4a56'); R(21, 6, 3, 2, '#6a6a76'); R(7, 12, 10, 5, '#34343e'); R(4, 17, 16, 5, '#2a2a34'); R(4, 17, 16, 1, '#4a4a56'); R(5, 22, 14, 4, '#3a2814'); R(5, 22, 14, 1, '#5a3e22'); R(6, 3, 8, 3, '#ff7a2a'); R(8, 2, 4, 1, '#ffd24a'); });
  const x = tx * TS + 4, y = (ty + 1) * TS - 52; this.block(tx, ty, 1, 1, 2);
  this.cust(x, y, x + 48, y + 52, (ty + 1) * TS, () => { blit(c, x, y); const ph = (G.time * 1.4) % 3, hit = ph < 0.18 ? 1 - ph / 0.18 : 0; if (hit > 0) glow(x + 16, y + 14, 70, 0.6 * hit, '255,200,120'); });
  this.light(x + 16, y + 20, 110, 0.7);
  this.door((tx + 0.5) * TS, (ty + 1) * TS + 14, 50, 'Ковадло', () => showDialog([{ who: '', text: 'Важке ковадло з вм’ятинами від тисяч ударів. На боці витесано клеймо: «Б» і крива лінія, наче підпис, що розтікається.' }, { who: '', text: 'Кузня ще вчиться нових слів. Незабаром тут можна буде перековувати знайдене.' }]));
};
ZB.prototype.trough = function (tx, ty) {
  const c = spr('trough', 36, 22, (R) => { R(0, 6, 36, 16, '#4a2e18'); R(0, 6, 36, 2, '#7a5632'); R(2, 8, 32, 11, '#1a3a58'); R(2, 8, 32, 2, '#2a5a88'); R(4, 12, 9, 1, '#6ab0e0'); R(20, 15, 8, 1, '#6ab0e0'); R(0, 14, 36, 1, '#3a2410'); R(2, 20, 4, 2, '#2a1a0c'); R(30, 20, 4, 2, '#2a1a0c'); });
  const x = tx * TS, y = (ty + 1) * TS - 44; this.block(tx, ty, 2, 1, 2);
  this.cust(x, y, x + 72, y + 44, (ty + 1) * TS, () => { blit(c, x, y); ctx.fillStyle = 'rgba(190,200,210,.18)'; const t = G.time; for (let i = 0; i < 3; i++) { const k = (t * 0.6 + i * 0.33) % 1; ctx.fillRect(x + 14 + i * 20 + Math.sin(t * 2 + i) * 3, y + 14 - k * 36, 8, 6); } });
};
ZB.prototype.grindstone = function (tx, ty) {
  const base = spr('grind', 30, 30, (R) => { R(2, 18, 4, 12, '#4a3220'); R(24, 18, 4, 12, '#4a3220'); R(0, 28, 30, 2, '#2a1a0c'); R(2, 16, 26, 3, '#5a3e22'); R(10, 21, 10, 8, '#6a4a28'); R(10, 21, 10, 2, '#8a6a3c'); });
  const x = tx * TS, y = (ty + 1) * TS - 60; this.block(tx, ty, 1, 1, 2);
  this.cust(x, y, x + 60, y + 60, (ty + 1) * TS, () => { blit(base, x, y); const cx = x + 30, cy = y + 24, a = G.time * 2.5; ctx.fillStyle = '#8a8896'; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 7); ctx.fill(); ctx.fillStyle = '#a8a6b4'; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 7); ctx.fill(); ctx.fillStyle = '#5a5866'; for (let i = 0; i < 4; i++) { const an = a + i * 1.571; ctx.fillRect(cx + Math.cos(an) * 9 - 1, cy + Math.sin(an) * 9 - 1, 3, 3); } ctx.fillStyle = '#3a2814'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fill(); });
  this.door((tx + 0.5) * TS, (ty + 1) * TS + 14, 50, 'Точило', () => showDialog([{ who: '', text: 'Колесо ще крутиться: хтось тільки-но його штовхнув. Лезо, що торкнеться каменя, стане гострішим — або зникне зовсім.' }]));
};
ZB.prototype.weaponRack = function (tx, ty, w) {
  const items = ['sword', 'axe', 'spear', 'sword', 'mace', 'axe', 'spear', 'sword'];
  const c = spr('wrack' + w, w * 16, 36, (R) => {
    R(0, 0, w * 16, 36, '#3a2814'); R(0, 0, w * 16, 2, '#6a4a2a'); R(0, 14, w * 16, 2, '#4a3220'); R(0, 30, w * 16, 4, '#2a1a0c');
    for (let i = 0; i < w * 2 - 1; i++) {
      const x = 5 + i * 8, k = items[i % items.length];
      if (k === 'sword') { R(x, 3, 2, 22, '#c8ccd8'); R(x, 3, 1, 22, '#f0f4ff'); R(x - 2, 24, 6, 2, '#c9a35a'); R(x, 26, 2, 5, '#5a3e22'); R(x - 1, 31, 4, 1, '#c9a35a'); }
      else if (k === 'axe') { R(x, 4, 2, 26, '#5a3e22'); R(x - 3, 4, 8, 8, '#9a9ca8'); R(x - 3, 4, 3, 8, '#c8ccd8'); R(x + 2, 6, 3, 4, '#6a6c78'); }
      else if (k === 'spear') { R(x, 6, 2, 26, '#7a5632'); R(x - 1, 0, 4, 8, '#b0b4c0'); R(x, 0, 2, 4, '#e8ecf8'); }
      else { R(x, 10, 2, 20, '#5a3e22'); disc(R, x + 1, 8, 4, '#6a6c78'); R(x - 3, 7, 8, 2, '#8a8c98'); }
    }
  });
  const x = tx * TS, y = (ty + 1) * TS - 72; this.block(tx, ty, w, 1, 2);
  this.obj({ x0: x, y0: y, x1: x + w * 32, y1: y + 72, y: (ty + 1) * TS - 2, draw: () => blit(c, x, y) });
};
ZB.prototype.armorStand = function (tx, ty, v) {
  const col = ['#7a7e8e', '#8a6a3a'][v % 2];
  const c = spr('astand' + (v % 2), 22, 46, (R) => {
    R(10, 38, 2, 8, '#3a2814'); R(4, 44, 14, 2, '#2a1a0c'); R(5, 14, 12, 16, col); R(5, 14, 4, 16, zsh(col, 1.3)); R(13, 14, 4, 16, zsh(col, 0.7)); R(2, 14, 4, 8, zsh(col, 1.1)); R(16, 14, 4, 8, zsh(col, 0.8)); R(5, 28, 12, 3, '#3a2814');
    R(6, 3, 10, 11, zsh(col, 1.1)); R(6, 3, 3, 11, zsh(col, 1.4)); R(8, 8, 6, 2, '#14100c'); R(10, 0, 2, 4, '#a82a34'); R(5, 30, 12, 8, zsh(col, 0.85)); R(10, 30, 2, 8, zsh(col, 0.6));
  });
  const x = tx * TS + 5, y = (ty + 1) * TS - 92; this.block(tx, ty, 1, 1, 2);
  this.obj({ x0: x, y0: y, x1: x + 48, y1: y + 94, y: (ty + 1) * TS, draw: () => blit(c, x, y) });
  this.door((tx + 0.5) * TS, (ty + 1) * TS + 12, 46, 'Обладунок', () => showDialog([{ who: '', text: 'Обладунок на манекені — з вм’ятиною на нагруднику, глибокою, наче від булави. Бран каже: «Той, хто його носив, пішов у Катакомби. Обладунок повернувся сам».' }]));
};
ZB.prototype.wallShield = function (px, py, col) { const c = spr('wshield' + col, 16, 18, (R) => { disc(R, 8, 8, 8, '#3a2814'); disc(R, 8, 8, 7, col); R(7, 1, 2, 14, zsh(col, 1.3)); R(1, 7, 14, 2, zsh(col, 1.3)); disc(R, 8, 8, 2, '#e0b040'); }); this.cust(px, py, px + 32, py + 36, -10, () => blit(c, px, py)); };
ZB.prototype.ingots = function (tx, ty) { this.deco(tx, ty, 1, 1, 'ingots', 18, 18, (R) => { for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) { const x = 1 + i * 5 + r * 2, y = 12 - r * 4; R(x, y, 5, 4, '#9a9aa8'); R(x, y, 5, 1, '#d0d0dc'); R(x, y + 3, 5, 1, '#5a5a68'); } }, { ox: 0, solid: true }); };
ZB.prototype.coalPile = function (tx, ty) { this.deco(tx, ty, 2, 1, 'coal', 32, 22, (R) => { disc(R, 16, 14, 11, '#14100e'); disc(R, 15, 12, 9, '#26201e'); for (let i = 0; i < 14; i++) R(6 + (i * 5) % 20, 6 + (i * 3) % 12, 3, 2, i % 3 ? '#3a322e' : '#5a4a42'); R(10, 8, 2, 1, '#ff7a2a'); R(20, 11, 2, 1, '#ff7a2a'); }, { solid: true }); };

interior('smithy', 'Кузня', 22, 16, {
  exit: 'smithy', music: 'tavern', base: GK.STONE, ambient: 0.22, tint: '20,10,6', centerLight: false,
  tiles: { floor: ['#4c4a52'], wall: '#161012', face: '#4a3a34', accent: '#8a5a2a' },
  fx: () => {
    const t = G.time, ph = (t * 1.4) % 3;
    if (ph < 0.18 && Math.random() < 0.7) for (let i = 0; i < 3; i++) parts.push({ x: 11 * TS + 20 + zrand(-4, 4), y: 8 * TS - 8, vx: zrand(-70, 70), vy: zrand(-90, -20), life: 0.6, max: 0.6, size: 2, color: Math.random() < 0.5 ? '#ffd24a' : '#ff8a2a' });
    if (Math.random() < 0.5) parts.push({ x: 3 * TS + zrand(20, 130), y: 4 * TS - 18, vx: zrand(-6, 6), vy: zrand(-40, -14), life: 1.4, max: 1.4, size: 2, color: 'rgba(255,130,40,.8)' });
  },
}, (B) => {
  const W = 22, H = 16;
  B.block(1, 1, W - 2, 2, 1); // задня стіна
  B.fill(GK.SOOT, 2, 3, 8, 4); B.fill(GK.SOOT, 9, 6, 5, 4);
  B.spawn('door', 11, 14); B.spawn('default', 11, 14);
  // горн і міхи
  B.bigForge(2, 3); B.bellows(7, 3);
  // стінний декор
  B.wallShield(11 * TS, 20, '#7a2430'); B.wallShield(13 * TS, 20, '#2a4a8a'); B.wallShield(15 * TS, 20, '#7a2430');
  B.cust(11 * TS, 4, 17 * TS, 60, -10, () => {}); B.cust(18 * TS, 6, 20 * TS, 76, -10, () => { ctx.fillStyle = '#2a2a30'; for (let i = 0; i < 4; i++) { ctx.fillRect(18 * TS + 8 + i * 10, 6, 2, 30 + i * 6); ctx.fillStyle = '#3a3a42'; ctx.fillRect(18 * TS + 5 + i * 10, 36 + i * 6, 8, 4); ctx.fillStyle = '#2a2a30'; } });
  B.weaponRack(10, 3, 4); B.armorStand(15, 3, 0); B.armorStand(16, 3, 1); B.weaponRack(18, 3, 3);
  // ковадло, балія, точило
  B.smithAnvil(11, 7); B.trough(7, 7); B.grindstone(15, 7);
  // майстерня зліва та склад
  B.table(2, 9, 3); B.table(2, 12, 2);
  B.cust(2 * TS + 4, 9 * TS - 14, 4 * TS, 10 * TS, 10 * TS, () => { ctx.fillStyle = '#9a9aa8'; ctx.fillRect(2 * TS + 14, 9 * TS - 6, 28, 3); ctx.fillStyle = '#5a3e22'; ctx.fillRect(2 * TS + 42, 9 * TS - 8, 3, 8); ctx.fillStyle = '#c8ccd8'; ctx.fillRect(2 * TS + 62, 9 * TS - 10, 3, 10); ctx.fillStyle = '#7a5632'; ctx.fillRect(2 * TS + 62, 9 * TS - 1, 3, 3); });
  B.coalPile(18, 9); B.barrel(20, 9); B.barrel(20, 10); B.crate(18, 11); B.crate(19, 11); B.ingots(8, 12); B.ingots(14, 11);
  B.lamp(1, 13); B.light(15 * TS, 6 * TS, 280, 0.8); B.light(11 * TS, 12 * TS, 220, 0.6); B.light(19 * TS, 8 * TS, 170, 0.55);
  // персонажі
  B.npc({ id: 'bran', name: 'Бран, коваль', look: 'smith', x: 10, y: 7, look0: 0, ir: 70, vendor: { id: 'bran', name: 'Кузня Брана', slots: ['weapon', 'armor', 'helmet'], rar: [18, 38, 30, 12, 2], count: 6, potions: false },
    talks: [L('Меч, броня, шолом — усе, що тримає людину в світі. А що більше нічого не тримає — те ковалю не під силу.', 'Хочеш викувати щось краще з того, що маєш? Приходь пізніше: кузня ще вчиться нових слів. А поки — купуй або продавай.'), L('Залізо пам’ятає удари. Люди — ні. Тому я довіряю залізу.'), L('Колись я кував для замку. Для когось із золотою короною. Ай, не згадаю.'), L('Чуєш, як співає метал? Не відповідай. Він не любить, коли йому відповідають.')] });
  B.npc({ id: 'boy', name: 'Підмайстер Тім', look: 'child2', x: 9, y: 4, scale: 1.55, mode: 'wander', radius: 1.5, speed: 24, talks: [L('Я качаю міх! Дві години! Рука відпадає! Але Бран каже — мускули.'), L('Одного дня й я кую меч. Власний. Тільки б не забути, як він має виглядати.')] });
  B.npc({ id: 'cust', name: 'Мисливець Орк', look: 'hunter', x: 13, y: 11, look0: 3.14, talks: [L('Чекаю на меч. Замовив ще весною. Бран каже — «майже готовий». Я вже й весну забув.')] });
});
