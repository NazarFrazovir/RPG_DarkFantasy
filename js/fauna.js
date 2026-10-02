'use strict';
// ===== ФАУНА Й РОЗБІЙНИКИ: вовк, ведмідь, олень, заєць, ельфи (спрайти в стилі rig.js) =====
// Чотириногі малюються збоку (праворуч), дзеркалення — у drawChar. p: bob, legL, legR, sq, lean.

function drawWolf({ R }, p) {
  const g = tone('#868692'), dk = tone('#4e4e58'), by = p.bob, lx = p.lean;
  R(0, 8 + by, 2, 4, g.d); R(1, 7 + by, 4, 3, g.b); R(0, 7 + by, 1, 2, g.l); // хвіст
  [[5, p.legL], [8, p.legR]].forEach(([x, l], i) => { R(x, 15 + by, 2, 5 - l, i ? dk.d : dk.b); R(x - 1, 19 - l, 4, 2, dk.x); });
  [[14, p.legR], [17, p.legL]].forEach(([x, l], i) => { R(x, 15 + by, 2, 5 - l, i ? dk.d : dk.b); R(x - 1, 19 - l, 4, 2, dk.x); });
  R(4, 9 + by, 15, 7, g.b); R(4, 9 + by, 15, 2, g.l); R(4, 14 + by, 15, 2, g.d); R(15, 8 + by, 4, 3, g.l); R(6, 11 + by, 6, 2, g.d);
  R(18 + lx, 8 + by, 5, 6, g.b); R(18 + lx, 8 + by, 5, 1, g.l); R(21 + lx, 10 + by, 3, 4, g.d); R(23 + lx, 10 + by, 1, 1, '#14100c'); R(21 + lx, 13 + by, 3, 1, '#e8e0d0');
  R(18 + lx, 5 + by, 2, 4, g.d); R(21 + lx, 5 + by, 2, 4, g.b); R(20 + lx, 9 + by, 1, 1, '#ffd24a');
}
function drawBear({ R }, p) {
  const g = tone('#6a4a30'), dk = tone('#3e2a1a'), by = p.bob, lx = p.lean;
  R(1, 10 + by, 3, 3, g.d); // хвіст
  [[5, p.legL], [10, p.legR]].forEach(([x, l], i) => { R(x, 18 + by, 4, 7 - l, i ? dk.d : dk.b); R(x - 1, 24 - l, 6, 3, dk.x); R(x - 1, 26 - l, 1, 1, '#e8e0c8'); R(x + 3, 26 - l, 1, 1, '#e8e0c8'); });
  [[17, p.legR], [21, p.legL]].forEach(([x, l], i) => { R(x, 18 + by, 4, 7 - l, i ? dk.d : dk.b); R(x - 1, 24 - l, 6, 3, dk.x); R(x - 1, 26 - l, 1, 1, '#e8e0c8'); R(x + 3, 26 - l, 1, 1, '#e8e0c8'); });
  R(3, 8 + by, 20, 13, g.b); R(3, 8 + by, 20, 3, g.l); R(3, 18 + by, 20, 3, g.d); R(15, 5 + by, 8, 6, g.l); R(5, 12 + by, 8, 3, g.d); // горб
  R(21 + lx, 8 + by, 6, 8, g.b); R(21 + lx, 8 + by, 6, 2, g.l); R(25 + lx, 11 + by, 3, 5, '#8a6a4a'); R(27 + lx, 11 + by, 1, 2, '#14100c'); R(21 + lx, 5 + by, 2, 3, g.d); R(25 + lx, 5 + by, 2, 3, g.b);
  R(23 + lx, 9 + by, 1, 1, '#ff6a3a'); R(25 + lx, 15 + by, 3, 1, '#e8e0d0');
}
function drawDeer({ R }, p) {
  const g = tone('#b0824e'), wh = '#f0e8d4', by = p.bob, lx = p.lean;
  R(1, 9 + by, 3, 3, g.l); R(1, 9 + by, 2, 1, wh);
  [[6, p.legL], [9, p.legR], [14, p.legR], [17, p.legL]].forEach(([x, l], i) => { R(x, 15 + by, 2, 6 - l, i % 2 ? '#8a6038' : '#6a4a2a'); R(x, 20 - l, 2, 2, '#2a1e14'); });
  R(5, 9 + by, 15, 7, g.b); R(5, 9 + by, 15, 2, g.l); R(5, 14 + by, 15, 2, wh); [[8, 11], [12, 10], [15, 12]].forEach(([x, y]) => R(x, y + by, 1, 1, wh));
  R(17, 5 + by, 3, 6, g.b); R(18 + lx, 3 + by, 5, 5, g.b); R(22 + lx, 5 + by, 2, 3, '#e8c8a0'); R(23 + lx, 5 + by, 1, 1, '#14100c'); R(20 + lx, 4 + by, 1, 1, '#14100c');
  R(17 + lx, 1 + by, 1, 3, '#d8c8a0'); R(16 + lx, 0 + by, 2, 1, '#d8c8a0'); R(20 + lx, 0 + by, 1, 4, '#d8c8a0'); R(21 + lx, -1 + by, 2, 1, '#d8c8a0');
}
function drawRabbit({ R }, p) {
  const g = tone('#a89a86'), by = p.bob, hop = p.legL > 0 ? -2 : 0;
  R(7, 17 + by + hop, 4, 3, '#e8e0d4'); // хвіст
  R(9, 14 + by + hop, 8, 6, g.b); R(9, 14 + by + hop, 8, 1, g.l); R(9, 19 + by + hop, 8, 1, g.d); R(14, 17 + by + hop, 3, 3, '#c8baa4');
  R(15, 11 + by + hop, 5, 5, g.b); R(19, 13 + by + hop, 2, 2, '#e8c0b0'); R(20, 13 + by + hop, 1, 1, '#14100c'); R(17, 12 + by + hop, 1, 1, '#14100c'); R(15, 6 + by + hop, 2, 6, g.b); R(18, 7 + by + hop, 2, 5, g.d); R(15, 7 + by + hop, 1, 3, '#e8b0a8');
  R(10, 19, 3, 2, '#8a7a66'); R(15, 19, 3, 2, '#8a7a66');
}
function initFauna() {
  defChar('wolf', 24, 2, drawWolf); defChar('bear', 28, 2, drawBear); defChar('deer', 24, 2, drawDeer); defChar('rabbit', 24, 2, drawRabbit);
  const rb = (o) => (h, p, v, idx) => drawRobe(h, p, v, idx, o);
  const base = { skin: '#eadfce', eye: '#a6ffb0', short: true, elf: true };
  defChar('elfArcher', 24, 2, rb(Object.assign({}, base, { robe: '#2e4a30', hood: '#3a6a3a', trim: '#c9a35a', quiver: true })));
  defChar('elfRogue', 24, 2, rb(Object.assign({}, base, { robe: '#3a3a48', hood: '#25252f', trim: '#8a8a9a', eye: '#ff8a8a' })));
}

// ---------- Поведінка мирних тварин: втеча від гравця, блукання ----------
function updateFlee(e, dt) {
  const d = dist(e, P), scare = e.hp < e.maxHp ? 340 : 190;
  e.moving = false;
  if (d < scare) {
    const a = angTo(P, e) + Math.sin(e.t * 2.4) * 0.5, sp = e.speed * (e.hp < e.maxHp ? 1.15 : 1);
    const ox = e.x, oy = e.y; e.face = a; moveEntity(e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
    if (Math.hypot(e.x - ox, e.y - oy) < sp * dt * 0.3) { e.wa = (e.wa || 0) + 1.9 + Math.random(); moveEntity(e, Math.cos(e.wa) * sp * dt, Math.sin(e.wa) * sp * dt); }
    e.mvT = 1; return;
  }
  e.wt = (e.wt || 0) - dt;
  if (e.wt <= 0) { e.wt = 1.5 + Math.random() * 3; e.wa = Math.random() < 0.4 ? null : Math.random() * 6.283; }
  if (e.wa != null) { const ox = e.x, oy = e.y; e.face = e.wa; moveEntity(e, Math.cos(e.wa) * 34 * dt, Math.sin(e.wa) * 34 * dt); if (Math.hypot(e.x - ox, e.y - oy) < 34 * dt * 0.3) e.wt = 0; }
}
