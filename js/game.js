'use strict';
// ===== ГРА: світ, бій, рендер, UI =====
const cv = $('#game'), ctx = cv.getContext('2d');
const lightCv = document.createElement('canvas'), lctx = lightCv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  lightCv.width = Math.ceil(W / 2); lightCv.height = Math.ceil(H / 2);
}
addEventListener('resize', resize); resize();

const G = { state: 'menu', cls: null, level: 0, time: 0, kills: 0, deaths: 0, shake: 0, titleT: 0, pendingPerks: 0, portalOpen: false, seen: {}, msg: '', msgT: 0, boss: null };
let P, map, enemies, projs, parts, pickups, texts, allies, props, effects, inter, explored, flow, flowT, cam = { x: 0, y: 0 };
const embers = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), s: rand(0.02, 0.08), r: rand(1, 3) }));

// ---------- Карта ----------
const solid = (tx, ty) => tx < 0 || ty < 0 || tx >= map.w || ty >= map.h || map.t[ty * map.w + tx] === 1;
function hitsWall(x, y, r) {
  const x0 = Math.floor((x - r) / TS), x1 = Math.floor((x + r) / TS), y0 = Math.floor((y - r) / TS), y1 = Math.floor((y + r) / TS);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) return true;
  return false;
}
function moveEntity(e, dx, dy) {
  const r = e.r * 0.85;
  if (dx && !hitsWall(e.x + dx, e.y, r)) e.x += dx;
  if (dy && !hitsWall(e.x, e.y + dy, r)) e.y += dy;
}
function los(a, b) {
  const d = dist(a, b), n = Math.ceil(d / 10);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (solid(Math.floor((a.x + (b.x - a.x) * t) / TS), Math.floor((a.y + (b.y - a.y) * t) / TS))) return false;
  }
  return true;
}

function genMap(cfg, rng) {
  const w = cfg.w, h = cfg.h, t = new Uint8Array(w * h).fill(1), rooms = [];
  const rr = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const carve = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x > 0 && y > 0 && x < w - 1 && y < h - 1) t[y * w + x] = 0; };
  if (cfg.boss) {
    carve(3, 3, w - 4, h - 4);
    [[10, 9], [10, 17], [24, 9], [24, 17]].forEach(([x, y]) => { t[y * w + x] = t[y * w + x + 1] = t[(y + 1) * w + x] = t[(y + 1) * w + x + 1] = 1; });
    rooms.push({ x: 3, y: 3, w: w - 6, h: h - 6, cx: w >> 1, cy: h >> 1 });
    return { w, h, t, rooms };
  }
  let tries = 0;
  while (rooms.length < cfg.rooms && tries++ < 600) {
    const rw = rr(6, 12), rh = rr(5, 9), x = rr(2, w - rw - 3), y = rr(2, h - rh - 3);
    if (rooms.some((r) => x < r.x + r.w + 3 && x + rw + 3 > r.x && y < r.y + r.h + 3 && y + rh + 3 > r.y)) continue;
    carve(x, y, x + rw - 1, y + rh - 1);
    const room = { x, y, w: rw, h: rh, cx: x + (rw >> 1), cy: y + (rh >> 1) };
    if (rooms.length) {
      const p = rooms[rooms.length - 1];
      if (rng() < 0.5) { carve(Math.min(p.cx, room.cx), p.cy, Math.max(p.cx, room.cx), p.cy + 1); carve(room.cx, Math.min(p.cy, room.cy), room.cx + 1, Math.max(p.cy, room.cy)); }
      else { carve(p.cx, Math.min(p.cy, room.cy), p.cx + 1, Math.max(p.cy, room.cy)); carve(Math.min(p.cx, room.cx), room.cy, Math.max(p.cx, room.cx), room.cy + 1); }
    }
    rooms.push(room);
  }
  // додаткові з'єднання (петлі) та колони
  for (let k = 0; k < 2 && rooms.length > 4; k++) {
    const a = rooms[rr(0, rooms.length - 1)], b = rooms[rr(0, rooms.length - 1)];
    carve(Math.min(a.cx, b.cx), a.cy, Math.max(a.cx, b.cx), a.cy + 1); carve(b.cx, Math.min(a.cy, b.cy), b.cx + 1, Math.max(a.cy, b.cy));
  }
  rooms.forEach((r, i) => {
    if (i && r.w >= 8 && r.h >= 7) for (let k = 0; k < 2; k++) {
      const px = rr(r.x + 2, r.x + r.w - 3), py = rr(r.y + 2, r.y + r.h - 3);
      if (Math.abs(px - r.cx) > 1 || Math.abs(py - r.cy) > 1) t[py * w + px] = 1;
    }
  });
  return { w, h, t, rooms };
}

function roomPos(room, rng) {
  for (let i = 0; i < 30; i++) {
    const x = (room.x + 1 + rng() * (room.w - 2)) * TS, y = (room.y + 1 + rng() * (room.h - 2)) * TS;
    if (!hitsWall(x, y, 14)) return { x, y };
  }
  return { x: (room.cx + 0.5) * TS, y: (room.cy + 0.5) * TS };
}

// ---------- Створення сутностей ----------
function createPlayer(c) {
  P = {
    cls: c, x: 0, y: 0, r: 10, hp: c.hp, maxHp: c.hp, speed: c.speed, dmg: c.dmg, atkT: 0, dodgeT: 0, dodgeCdT: 0, dodgeDir: { x: 0, y: 1 },
    inv: 0, abT: 0, potions: 3, maxPotions: 3, potionHeal: 0.4, level: 1, xp: 0, xpNext: 40, crit: 0.05, lifesteal: 0, face: 0, flash: 0,
    dmgMul: 1, spdMul: 1, asMul: 1, cdr: 0, dodgeMul: 1, xpMul: 1, magnet: 110, perks: {}, vx: 0, vy: 0, animT: 0,
  };
}

function makeEnemy(type, x, y, elite, cfg) {
  const d = ENEMIES[type], s = cfg ? cfg.scale : 1;
  const e = {
    type, name: d.name, x, y, r: d.r * (elite ? (cfg && cfg.elite.big ? 1.5 : 1.3) : 1), hp: d.hp * s * (elite ? 3.4 : 1), speed: d.speed, dmg: d.dmg * s * (elite ? 1.3 : 1),
    range: d.range, wind: d.wind, cd: 0.5 + Math.random(), atkCd: d.cd, xp: d.xp * (elite ? 4 : 1), ai: d.ai, kbRes: d.kbRes || 0, elite: !!elite,
    aggro: false, atk: null, flash: 0, stun: 0, burn: 0, kx: 0, ky: 0, face: 0, t: Math.random() * 5, dead: false, minion: false,
  };
  e.maxHp = e.hp;
  if (elite) e.name = cfg.elite.name;
  return e;
}

function startLevel(i) {
  G.level = i; const cfg = LEVELS[i], rng = mulberry32(cfg.seed);
  map = genMap(cfg, rng);
  enemies = []; projs = []; parts = []; pickups = []; texts = []; allies = []; props = []; effects = []; inter = [];
  explored = new Uint8Array(map.w * map.h); flow = null; flowT = 0; G.boss = null; G.portalOpen = false; G.shake = 0;
  const rooms = map.rooms, first = rooms[0], last = rooms[rooms.length - 1];
  P.x = (first.cx + 0.5) * TS; P.y = (first.cy + 0.5) * TS + (cfg.boss ? 6 * TS : 0);
  P.hp = P.maxHp; P.potions = P.maxPotions; P.inv = 1; P.abT = 0; P.dodgeCdT = 0;
  cam.x = P.x; cam.y = P.y;

  // смолоскипи
  rooms.forEach((r) => {
    const n = cfg.boss ? 8 : 2 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) {
      const tx = cfg.boss ? r.x + 3 + k * 3.6 : r.x + 1 + Math.floor(rng() * (r.w - 2)), ty = r.y - 1;
      const px = Math.floor(tx);
      if (solid(px, ty)) props.push({ type: 'torch', x: (px + 0.5) * TS, y: (ty + 0.5) * TS + 6, ph: rng() * 6 });
    }
    // декор
    for (let k = 0; k < (cfg.boss ? 14 : 6); k++) {
      const p = roomPos(r, rng);
      props.push({ type: ['bones', 'blood', 'crack', 'grave'][Math.floor(rng() * 4)], x: p.x, y: p.y, s: 0.6 + rng() * 0.8, a: rng() * 6 });
    }
  });

  // вогнище й NPC
  const bx = (first.cx + 0.5) * TS + (cfg.boss ? 0 : 0), by = (first.cy + 0.5) * TS + (cfg.boss ? 6 * TS : 0) - 44;
  const bonfire = { type: 'bonfire', x: bx, y: by, ph: 0 }; props.push(bonfire);
  inter.push({ x: bx, y: by, r: 44, label: 'Спочити біля вогнища', act: () => {
    P.hp = P.maxHp; P.potions = P.maxPotions; float(P.x, P.y - 24, 'Жар відновлює сили', '#ffb347'); Sfx.play('potion');
    burst(bx, by, '#ffb347', 20, 90, 3);
  } });
  if (cfg.npc) {
    const p = { x: (first.cx + 3.2) * TS, y: (first.cy + 0.5) * TS };
    props.push({ type: 'npc', x: p.x, y: p.y, ph: 0 });
    inter.push({ x: p.x, y: p.y, r: 46, label: 'Поговорити: ' + cfg.npc.name, act: () => showDialog(cfg.npc.lines.map((l) => ({ who: l[0], text: l[1] }))) });
  }

  // вороги
  if (cfg.boss) {
    const b = makeEnemy('boss', (map.w / 2) * TS, 6.5 * TS, false, cfg);
    b.hp = b.maxHp = ENEMIES.boss.hp * (1 + (P.level - 1) * 0.05); b.state = 'idle'; b.st = 1; b.summonCd = 6; b.phase = 1; b.name = ENEMIES.boss.name;
    enemies.push(b); G.boss = b;
  } else {
    const total = cfg.spawn.reduce((a, s) => a + s[1], 0);
    const pick = () => { let r = rng() * total; for (const s of cfg.spawn) { if ((r -= s[1]) < 0) return s[0]; } return cfg.spawn[0][0]; };
    rooms.forEach((r, idx) => {
      if (idx === 0) return;
      const n = idx === rooms.length - 1 ? 2 : cfg.perRoom[0] + Math.floor(rng() * (cfg.perRoom[1] - cfg.perRoom[0] + 1));
      for (let k = 0; k < n; k++) { const p = roomPos(r, rng); enemies.push(makeEnemy(pick(), p.x, p.y, false, cfg)); }
    });
    const ep = roomPos(last, rng);
    enemies.push(makeEnemy(cfg.elite.type, (last.cx + 0.5) * TS, (last.cy + 0.5) * TS, true, cfg));
    // портал
    const portal = { type: 'portal', x: (last.x + last.w - 2) * TS, y: (last.y + 1.5) * TS, ph: 0 };
    if (hitsWall(portal.x, portal.y, 14)) { portal.x = ep.x; portal.y = ep.y; }
    props.push(portal);
    inter.push({ x: portal.x, y: portal.y, r: 50, label: 'Увійти в портал', act: () => {
      if (!G.portalOpen) { float(P.x, P.y - 24, 'Портал замкнено — здолай вартового', '#cc6666'); return; }
      const next = G.level + 1; startLevel(next); introLevel(next);
    }, dyn: () => (G.portalOpen ? 'Увійти в портал' : 'Портал замкнено') });
    // сувої лору
    cfg.lore.forEach((text, k) => {
      const r = rooms[1 + Math.floor(rng() * (rooms.length - 2))], p = roomPos(r, rng);
      const it = { x: p.x, y: p.y, r: 30, label: 'Прочитати сувій', act: () => { showDialog([{ who: 'Сувій', text }]); it.gone = true; props.splice(props.findIndex((q) => q.ref === it), 1); Sfx.play('pickup'); }, lore: true };
      inter.push(it); props.push({ type: 'scroll', x: p.x, y: p.y, ref: it, ph: k });
    });
  }
  G.titleT = 3.5; G.state = 'play';
}

function introLevel(i) {
  if (i === 1 && !G.seen[1]) showDialog(STORY.level2.map((l) => ({ who: l[0], text: l[1] })));
  if (i === 2 && !G.seen[2]) showDialog(STORY.level3.map((l) => ({ who: l[0], text: l[1] })));
  G.seen[i] = true;
}

// ---------- Ефекти ----------
function burst(x, y, color, n, sp, size, life = 0.6) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = rand(sp * 0.3, sp);
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: rand(size * 0.5, size), color });
  }
}
function float(x, y, text, color = '#fff', big = false) { texts.push({ x, y, text, color, t: 0, big }); }
function say(m) { G.msg = m; G.msgT = 3.5; }

// ---------- Урон ----------
function hurtPlayer(dmg, from) {
  if (P.inv > 0 || G.state !== 'play') return;
  P.hp -= dmg; P.inv = 0.45; P.flash = 0.15; G.shake = Math.max(G.shake, 7);
  float(P.x, P.y - 16, Math.round(dmg), '#ff5050', true); Sfx.play('hurt'); burst(P.x, P.y, '#a02020', 8, 120, 3);
  if (from) { const a = angTo(from, P); moveEntity(P, Math.cos(a) * 10, Math.sin(a) * 10); }
  if (P.hp <= 0) playerDie();
}
function damageTarget(t, dmg, src) {
  if (t === P) hurtPlayer(dmg, src);
  else { t.hp -= dmg; t.flash = 0.1; float(t.x, t.y - 12, Math.round(dmg), '#ff9090'); }
}
function hitEnemy(e, base, ang, knock = 60, opt = {}) {
  if (e.dead) return;
  const crit = Math.random() < P.crit, dmg = Math.round(base * P.dmgMul * (crit ? 2 : 1) * (opt.mul || 1));
  e.hp -= dmg; e.flash = 0.12; e.aggro = true;
  const kb = knock * (1 - e.kbRes); e.kx += Math.cos(ang) * kb * 5; e.ky += Math.sin(ang) * kb * 5;
  float(e.x + rand(-6, 6), e.y - e.r - 6, dmg + (crit ? '!' : ''), crit ? '#ffd24a' : '#fff', crit);
  burst(e.x, e.y, e.ai === 'boss' ? '#a02020' : '#8a1a1a', 4, 100, 2.5, 0.4);
  if (P.lifesteal) P.hp = Math.min(P.maxHp, P.hp + dmg * P.lifesteal);
  Sfx.play('hit');
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  if (e.dead) return; e.dead = true; G.kills++;
  burst(e.x, e.y, '#7a1010', 14, 140, 3.5, 0.8); burst(e.x, e.y, '#333', 6, 60, 4, 1);
  const orbs = Math.min(6, Math.ceil(e.xp / 8));
  for (let i = 0; i < orbs; i++) pickups.push({ type: 'soul', x: e.x, y: e.y, v: e.xp / orbs, vx: rand(-80, 80), vy: rand(-80, 80), t: 0 });
  if (!e.minion && Math.random() < (e.elite ? 1 : 0.12)) pickups.push({ type: 'potion', x: e.x, y: e.y, vx: 0, vy: 0, t: 0 });
  if (e.elite) { G.portalOpen = true; say(LEVELS[G.level].portalMsg); Sfx.play('level'); G.shake = 10; }
  if (e.ai === 'boss') bossDefeated();
}

function bossDefeated() {
  enemies.forEach((e) => { if (e !== G.boss && !e.dead) { e.hp = 0; killEnemy(e); } });
  G.shake = 18; Sfx.play('boss');
  showDialog(STORY.bossDown.map((l) => ({ who: l[0], text: l[1] })), () => {
    showChoice('Корона пульсує в твоїх руках. Що ти зробиш?', [
      { text: '💥 Розбити Корону', cb: () => endGame('destroy') },
      { text: '👑 Вдягнути Корону', cb: () => endGame('wear') },
    ]);
  });
}

function gainXp(n) {
  P.xp += n * P.xpMul;
  while (P.xp >= P.xpNext) { P.xp -= P.xpNext; P.level++; P.xpNext = Math.round(P.xpNext * 1.35 + 15); G.pendingPerks++; P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.3); Sfx.play('level'); float(P.x, P.y - 30, 'РІВЕНЬ ' + P.level + '!', '#ffd24a', true); }
}

// ---------- Атаки гравця ----------
function spawnProj(o) {
  projs.push(Object.assign({ x: P.x, y: P.y, vx: 0, vy: 0, r: 5, dmg: 10, from: 'p', life: 1.4, pierce: 0, color: '#fff', hit: new Set(), homing: 0, aoe: 0, t: 0 }, o));
}
function playerAttack(ang) {
  const c = P.cls.id, cd = P.cls.atkCd / P.asMul; P.atkT = cd; P.face = ang;
  if (c === 'knight') {
    Sfx.play('swing');
    const range = 52, arc = Math.PI * 0.72;
    effects.push({ k: 'slash', x: P.x, y: P.y, a: ang, r: range, arc, t: 0, life: 0.18 });
    enemies.forEach((e) => {
      if (e.dead || dist(P, e) > range + e.r) return;
      if (Math.abs(angDiff(angTo(P, e), ang)) < arc / 2) hitEnemy(e, P.dmg, ang, 55);
    });
    moveEntity(P, Math.cos(ang) * 3, Math.sin(ang) * 3);
  } else if (c === 'pyro') {
    Sfx.play('fire');
    spawnProj({ vx: Math.cos(ang) * 430, vy: Math.sin(ang) * 430, dmg: P.dmg, color: '#ff8a2a', r: 6, aoe: 42, fire: true });
  } else if (c === 'ranger') {
    Sfx.play('arrow');
    spawnProj({ vx: Math.cos(ang) * 660, vy: Math.sin(ang) * 660, dmg: P.dmg, color: '#d8e8c0', r: 4, pierce: 1, arrow: true });
  } else if (c === 'necro') {
    Sfx.play('magic');
    spawnProj({ vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, dmg: P.dmg, color: '#7dffc0', r: 6, homing: 4.5, soul: true, life: 2 });
  }
}
function playerAbility(ang) {
  const c = P.cls.id; P.abT = P.cls.ability.cd * (1 - P.cdr);
  if (c === 'knight') {
    Sfx.play('slam'); G.shake = 9;
    effects.push({ k: 'ring', x: P.x, y: P.y, r: 120, t: 0, life: 0.4, color: '#d8b26a' });
    enemies.forEach((e) => { if (!e.dead && dist(P, e) < 120 + e.r) { hitEnemy(e, P.dmg * 1.8, angTo(P, e), 130); if (e.ai !== 'boss') e.stun = 1.5; } });
  } else if (c === 'pyro') {
    Sfx.play('fire'); G.shake = 6;
    effects.push({ k: 'ring', x: P.x, y: P.y, r: 150, t: 0, life: 0.5, color: '#ff7a1a' });
    burst(P.x, P.y, '#ff8a2a', 40, 260, 4, 0.8);
    enemies.forEach((e) => { if (!e.dead && dist(P, e) < 150 + e.r) { hitEnemy(e, P.dmg * 2.4, angTo(P, e), 60); e.burn = 4; } });
  } else if (c === 'ranger') {
    Sfx.play('arrow');
    for (let i = -3; i <= 3; i++) {
      const a = ang + i * 0.11;
      spawnProj({ vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, dmg: P.dmg * 1.2, color: '#a6e0b0', r: 4, pierce: 3, arrow: true });
    }
  } else if (c === 'necro') {
    Sfx.play('magic'); allies.length = 0;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * 6.283;
      allies.push({ x: P.x + Math.cos(a) * 30, y: P.y + Math.sin(a) * 30, r: 9, hp: 45, maxHp: 45, life: 15, dmg: P.dmg * 0.9, cd: 0, speed: 120, face: 0, flash: 0 });
    }
    burst(P.x, P.y, '#7dffc0', 24, 140, 3, 0.7);
    effects.push({ k: 'ring', x: P.x, y: P.y, r: 70, t: 0, life: 0.5, color: '#7dffc0' });
  }
}

// ---------- Оновлення ----------
function updatePlayer(dt) {
  P.atkT -= dt; P.dodgeCdT -= dt; P.abT -= dt; P.inv -= dt; P.flash -= dt; P.animT += dt;
  const mwx = Input.mouse.x - W / 2 + cam.x, mwy = Input.mouse.y - H / 2 + cam.y, aim = Math.atan2(mwy - P.y, mwx - P.x);
  let dx = (Input.down('KeyD') ? 1 : 0) - (Input.down('KeyA') ? 1 : 0), dy = (Input.down('KeyS') ? 1 : 0) - (Input.down('KeyW') ? 1 : 0);
  const m = Math.hypot(dx, dy); if (m) { dx /= m; dy /= m; }
  if (P.dodgeT > 0) {
    P.dodgeT -= dt; moveEntity(P, P.dodgeDir.x * 400 * dt, P.dodgeDir.y * 400 * dt);
    if (Math.random() < 0.6) parts.push({ x: P.x, y: P.y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 6, color: 'rgba(200,200,220,0.35)' });
  } else {
    const sp = P.speed * P.spdMul; moveEntity(P, dx * sp * dt, dy * sp * dt);
    P.moving = !!m;
    if (Input.pressed('Space') && P.dodgeCdT <= 0) {
      P.dodgeT = 0.2; P.inv = Math.max(P.inv, 0.32); P.dodgeCdT = P.cls.dodgeCd * P.dodgeMul;
      P.dodgeDir = m ? { x: dx, y: dy } : { x: Math.cos(aim), y: Math.sin(aim) }; Sfx.play('dodge');
    }
    if (Input.mouse.down && P.atkT <= 0) playerAttack(aim);
    if ((Input.pressed('KeyQ') || Input.mouse.rEdge) && P.abT <= 0) playerAbility(aim);
  }
  P.face = aim;
  if (Input.pressed('KeyF') && P.potions > 0 && P.hp < P.maxHp) {
    P.potions--; P.hp = Math.min(P.maxHp, P.hp + P.maxHp * P.potionHeal); Sfx.play('potion'); burst(P.x, P.y, '#55ff88', 12, 70, 3); float(P.x, P.y - 20, '+', '#55ff88', true);
  }
  // мапа: розвідка
  const tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS);
  for (let y = ty - 7; y <= ty + 7; y++) for (let x = tx - 7; x <= tx + 7; x++) if (x >= 0 && y >= 0 && x < map.w && y < map.h && (x - tx) ** 2 + (y - ty) ** 2 < 50) explored[y * map.w + x] = 1;
}

function computeFlow() {
  const w = map.w, h = map.h, d = new Int16Array(w * h).fill(-1), q = [];
  const s = Math.floor(P.y / TS) * w + Math.floor(P.x / TS); d[s] = 0; q.push(s);
  for (let i = 0; i < q.length; i++) {
    const c = q[i], cx = c % w, cy = (c / w) | 0;
    for (let ny = -1; ny <= 1; ny++) for (let nx = -1; nx <= 1; nx++) {
      if (!nx && !ny) continue;
      const X = cx + nx, Y = cy + ny; if (solid(X, Y) || d[Y * w + X] >= 0) continue;
      if (nx && ny && (solid(cx + nx, cy) || solid(cx, cy + ny))) continue;
      d[Y * w + X] = d[c] + 1; q.push(Y * w + X);
    }
  }
  flow = d;
}
function steer(e, tgt, sp, dt) {
  let tx = tgt.x, ty = tgt.y;
  if (tgt === P && flow && !los(e, tgt)) {
    const cx = Math.floor(e.x / TS), cy = Math.floor(e.y / TS); let best = flow[cy * map.w + cx] < 0 ? 1e9 : flow[cy * map.w + cx], bx = -1, by = -1;
    for (let ny = -1; ny <= 1; ny++) for (let nx = -1; nx <= 1; nx++) {
      const X = cx + nx, Y = cy + ny; if ((!nx && !ny) || solid(X, Y)) continue;
      if (nx && ny && (solid(cx + nx, cy) || solid(cx, cy + ny))) continue;
      const v = flow[Y * map.w + X]; if (v >= 0 && v < best) { best = v; bx = X; by = Y; }
    }
    if (bx >= 0) { tx = (bx + 0.5) * TS; ty = (by + 0.5) * TS; }
  }
  const a = Math.atan2(ty - e.y, tx - e.x); moveEntity(e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
}
function pickTarget(e) {
  let t = P, d = dist(e, P);
  for (const a of allies) { const ad = dist(e, a); if (ad < d * 0.8 && ad < 260) { t = a; d = ad; } }
  return t;
}

function enemyShoot(e, ang, spd = 190, dmg = e.dmg, r = 6, color = '#b04aff') {
  projs.push({ x: e.x, y: e.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r, dmg, from: 'e', life: 4, color, hit: new Set(), t: 0, pierce: 0 });
}

function updateEnemy(e, dt) {
  e.t += dt; e.flash -= dt;
  if (e.burn > 0) { e.burn -= dt; e.hp -= 6 * dt * (P.dmgMul); if (Math.random() < dt * 8) parts.push({ x: e.x + rand(-6, 6), y: e.y + rand(-6, 6), vx: 0, vy: -30, life: 0.5, max: 0.5, size: 3, color: '#ff8a2a' }); if (e.hp <= 0) { killEnemy(e); return; } }
  moveEntity(e, e.kx * dt, e.ky * dt); e.kx *= Math.pow(0.02, dt); e.ky *= Math.pow(0.02, dt);
  if (e.stun > 0) { e.stun -= dt; return; }
  const tgt = pickTarget(e), d = dist(e, tgt);
  if (!e.aggro) { if (d < 300 && los(e, P) && tgt === P) e.aggro = true; else return; }
  if (e.ai === 'boss') return updateBoss(e, dt, tgt, d);
  e.face = angTo(e, tgt);
  if (e.ai === 'melee') {
    if (e.atk) {
      e.atk.t -= dt;
      if (e.atk.t <= 0) {
        if (dist(e, tgt) < e.range + tgt.r + 10) damageTarget(tgt, e.dmg, e);
        if (e.type === 'ghoul') moveEntity(e, Math.cos(e.face) * 14, Math.sin(e.face) * 14);
        e.atk = null; e.cd = e.atkCd; Sfx.play('swing');
      }
    } else {
      steer(e, tgt, e.speed, dt); e.cd -= dt;
      if (d < e.range + tgt.r && e.cd <= 0) e.atk = { t: e.wind };
    }
  } else if (e.ai === 'ranged') {
    const vis = los(e, tgt);
    if (d < 150) { const a = angTo(tgt, e); moveEntity(e, Math.cos(a) * e.speed * dt, Math.sin(a) * e.speed * dt); }
    else if (d > 230 || !vis) steer(e, tgt, e.speed, dt);
    else { const a = e.face + Math.PI / 2; moveEntity(e, Math.cos(a) * e.speed * 0.5 * dt * (Math.sin(e.t) > 0 ? 1 : -1), Math.sin(a) * e.speed * 0.5 * dt * (Math.sin(e.t) > 0 ? 1 : -1)); }
    e.cd -= dt;
    if (e.atk) { e.atk.t -= dt; if (e.atk.t <= 0) { const n = e.elite ? 5 : 1; for (let i = 0; i < n; i++) enemyShoot(e, e.face + (i - (n - 1) / 2) * 0.22, e.elite ? 170 : 190); e.atk = null; e.cd = e.atkCd; } }
    else if (e.cd <= 0 && vis && d < 320) e.atk = { t: e.wind };
  }
}

function updateBoss(b, dt, tgt, d) {
  const frac = b.hp / b.maxHp, phase2 = frac < 0.5;
  if (phase2 && b.phase === 1) { b.phase = 2; say('Мальгорат розлючений!'); Sfx.play('boss'); G.shake = 12; b.state = 'idle'; b.st = 0.6; }
  b.face = angTo(b, P); b.summonCd -= dt; b.st -= dt;
  const sp = b.speed * (phase2 ? 1.25 : 1);
  switch (b.state) {
    case 'idle':
      steer(b, P, sp, dt);
      if (b.st <= 0) {
        const opts = ['burst'];
        if (d < 170) opts.push('slam', 'slam'); else opts.push('charge');
        if (b.summonCd <= 0 && enemies.filter((e) => e.minion && !e.dead).length < 4) opts.push('summon', 'summon');
        b.state = opts[Math.floor(Math.random() * opts.length)]; b.st = b.state === 'burst' ? 1.6 : b.state === 'charge' ? 0.8 : 0.9; b.n = 0;
        b.chargeA = b.face;
      }
      break;
    case 'slam':
      if (b.st <= 0) {
        Sfx.play('slam'); G.shake = 14; effects.push({ k: 'ring', x: b.x, y: b.y, r: 110, t: 0, life: 0.4, color: '#a02a2a' });
        if (dist(b, P) < 110 + P.r) hurtPlayer(b.dmg * 1.2, b);
        if (phase2) for (let i = 0; i < 10; i++) enemyShoot(b, (i / 10) * 6.283, 200, b.dmg * 0.5, 6, '#ff5030');
        b.state = 'idle'; b.st = 1.1;
      }
      break;
    case 'burst': {
      const per = phase2 ? 0.4 : 0.5;
      if (b.st < 1.6 - per * (b.n + 1) + 0.0 && b.n < 3) {
        const n = phase2 ? 16 : 12, off = b.n * 0.25 + Math.random() * 0.2;
        for (let i = 0; i < n; i++) enemyShoot(b, (i / n) * 6.283 + off, 170, b.dmg * 0.45, 6, '#c03aff');
        Sfx.play('magic'); b.n++;
      }
      if (b.st <= 0) { b.state = 'idle'; b.st = 1.0; }
      break;
    }
    case 'summon':
      if (b.st <= 0) {
        Sfx.play('boss'); b.summonCd = 14;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * 6.283 + Math.random(), sx = b.x + Math.cos(a) * 70, sy = b.y + Math.sin(a) * 70;
          if (hitsWall(sx, sy, 10)) continue;
          const m = makeEnemy('skeleton', sx, sy, false, LEVELS[G.level]); m.minion = true; m.aggro = true; m.hp = m.maxHp = 30; m.xp = 4; enemies.push(m);
          burst(sx, sy, '#c03aff', 10, 80, 3);
        }
        b.state = 'idle'; b.st = 1.2;
      }
      break;
    case 'charge':
      if (b.st > 0) { b.chargeA = b.face; } else {
        if (!b.dashing) { b.dashing = 0.5; Sfx.play('slam'); }
        b.dashing -= dt;
        const s = 460 * dt; moveEntity(b, Math.cos(b.chargeA) * s, Math.sin(b.chargeA) * s);
        if (dist(b, P) < b.r + P.r + 4) hurtPlayer(b.dmg * 1.1, b);
        if (b.dashing <= 0 || hitsWall(b.x + Math.cos(b.chargeA) * 30, b.y + Math.sin(b.chargeA) * 30, 10)) { b.dashing = 0; b.state = 'idle'; b.st = 1.3; G.shake = 8; }
      }
      break;
  }
}

function updateAllies(dt) {
  allies.forEach((a) => {
    a.life -= dt; a.cd -= dt; a.flash -= dt;
    let t = null, bd = 320;
    enemies.forEach((e) => { if (!e.dead) { const d = dist(a, e); if (d < bd) { bd = d; t = e; } } });
    if (t) {
      a.face = angTo(a, t);
      if (bd > 20 + t.r) moveEntity(a, Math.cos(a.face) * a.speed * dt, Math.sin(a.face) * a.speed * dt);
      else if (a.cd <= 0) { a.cd = 0.7; hitEnemy(t, a.dmg / P.dmgMul, a.face, 30); }
    } else if (dist(a, P) > 60) { const an = angTo(a, P); moveEntity(a, Math.cos(an) * a.speed * dt, Math.sin(an) * a.speed * dt); }
  });
  allies = allies.filter((a) => a.life > 0 && a.hp > 0);
}

function updateProjs(dt) {
  for (const p of projs) {
    p.t += dt; p.life -= dt;
    if (p.homing && p.from === 'p') {
      let t = null, bd = 260; enemies.forEach((e) => { if (!e.dead) { const d = dist(p, e); if (d < bd) { bd = d; t = e; } } });
      if (t) { const sp = Math.hypot(p.vx, p.vy), da = angDiff(angTo(p, t), Math.atan2(p.vy, p.vx)), a = Math.atan2(p.vy, p.vx) + clamp(da, -p.homing * dt, p.homing * dt); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; }
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (solid(Math.floor(p.x / TS), Math.floor(p.y / TS))) { p.life = 0; if (p.aoe) explode(p); burst(p.x, p.y, p.color, 4, 60, 2, 0.3); continue; }
    if (p.from === 'p') {
      for (const e of enemies) {
        if (e.dead || p.hit.has(e) || dist(p, e) > e.r + p.r) continue;
        p.hit.add(e); hitEnemy(e, p.dmg, Math.atan2(p.vy, p.vx), 40);
        if (p.aoe) { explode(p); p.life = 0; break; }
        if (p.pierce-- <= 0) { p.life = 0; break; }
      }
    } else {
      if (dist(p, P) < P.r + p.r) { hurtPlayer(p.dmg, p); p.life = 0; }
      else for (const a of allies) if (dist(p, a) < a.r + p.r) { damageTarget(a, p.dmg); p.life = 0; break; }
    }
    if (Math.random() < 0.5) parts.push({ x: p.x, y: p.y, vx: rand(-15, 15), vy: rand(-15, 15), life: 0.25, max: 0.25, size: p.r * 0.7, color: p.color });
  }
  projs = projs.filter((p) => p.life > 0);
}
function explode(p) {
  effects.push({ k: 'ring', x: p.x, y: p.y, r: p.aoe, t: 0, life: 0.25, color: '#ff8a2a' }); burst(p.x, p.y, '#ff8a2a', 12, 140, 3.5, 0.5);
  enemies.forEach((e) => { if (!e.dead && !p.hit.has(e) && dist(p, e) < p.aoe + e.r) { p.hit.add(e); hitEnemy(e, p.dmg * 0.6, angTo(p, e), 30); e.burn = Math.max(e.burn, 2); } });
}

function updatePickups(dt) {
  for (const p of pickups) {
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.05, dt); p.vy *= Math.pow(0.05, dt);
    const d = dist(p, P);
    if (p.type === 'soul') {
      if (p.t > 0.4 && d < P.magnet) { const a = angTo(p, P), s = 220 + (P.magnet - d) * 4; p.x += Math.cos(a) * s * dt; p.y += Math.sin(a) * s * dt; }
      if (d < 14) { p.done = true; gainXp(p.v); Sfx.play('pickup'); }
    } else if (p.type === 'potion' && d < 18) {
      p.done = true; if (P.potions < P.maxPotions) P.potions++; Sfx.play('pickup'); float(P.x, P.y - 20, '+ зілля', '#55ff88');
    }
  }
  pickups = pickups.filter((p) => !p.done);
}

function update(dt) {
  G.time += dt; G.titleT -= dt; G.msgT -= dt; G.shake = Math.max(0, G.shake - dt * 30);
  updatePlayer(dt);
  flowT -= dt; if (flowT <= 0) { computeFlow(); flowT = 0.3; }
  enemies.forEach((e) => { if (!e.dead) updateEnemy(e, dt); });
  enemies = enemies.filter((e) => !e.dead);
  updateAllies(dt); updateProjs(dt); updatePickups(dt);
  parts.forEach((p) => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }); parts = parts.filter((p) => p.life > 0);
  texts.forEach((t) => { t.t += dt; t.y -= 26 * dt; }); texts = texts.filter((t) => t.t < 1);
  effects.forEach((e) => { e.t += dt; }); effects = effects.filter((e) => e.t < e.life);
  cam.x += (P.x - cam.x) * Math.min(1, dt * 8); cam.y += (P.y - cam.y) * Math.min(1, dt * 8);

  // босс: тригер
  if (G.boss && !G.boss.aggro && !G.boss.dead && dist(P, G.boss) < 340 && G.state === 'play') {
    G.boss.aggro = true; G.boss.st = 1.5; Sfx.play('boss');
    showDialog(STORY.bossIntro.map((l) => ({ who: l[0], text: l[1] })));
  }
  // взаємодія
  let near = null, nd = 1e9;
  inter.forEach((it) => { if (it.gone) return; const d = Math.hypot(it.x - P.x, it.y - P.y); if (d < it.r && d < nd) { nd = d; near = it; } });
  G.near = near;
  if (near && Input.pressed('KeyE')) near.act();
  if (G.pendingPerks > 0 && G.state === 'play') openPerks();
}

function playerDie() {
  G.deaths++; G.state = 'dead'; Sfx.play('die'); burst(P.x, P.y, '#a02020', 30, 200, 4, 1);
  setTimeout(() => $('#dead').classList.remove('hidden'), 700);
}

// ---------- Діалоги ----------
const D = { lines: [], i: 0, cb: null, full: '', pos: 0, choices: null };
function showDialog(lines, cb) {
  D.lines = lines; D.i = 0; D.cb = cb || null; D.choices = null; G.prevState = G.state === 'dialog' ? G.prevState : G.state; G.state = 'dialog';
  $('#dialog').classList.remove('hidden'); dlgLine();
}
function showChoice(prompt, options) {
  D.lines = [{ who: '', text: prompt }]; D.i = 0; D.cb = null; D.choices = options; G.prevState = G.state === 'dialog' ? G.prevState : G.state; G.state = 'dialog';
  $('#dialog').classList.remove('hidden'); dlgLine();
}
function dlgLine() {
  const l = D.lines[D.i]; D.full = l.text; D.pos = 0;
  $('#dialog .who').textContent = l.who; $('#dialog .txt').className = 'txt' + (l.who ? '' : ' narr');
  const ch = $('#dialog .choices'); ch.innerHTML = '';
  $('#dialog .hint').style.display = D.choices ? 'none' : '';
}
function dlgAdvance() {
  if (D.pos < D.full.length) { D.pos = D.full.length; renderDlgText(); return; }
  if (D.choices) return;
  Sfx.play('click');
  if (D.i < D.lines.length - 1) { D.i++; dlgLine(); return; }
  $('#dialog').classList.add('hidden'); G.state = G.prevState === 'dead' ? 'play' : 'play';
  const cb = D.cb; D.cb = null; if (cb) cb();
}
function renderDlgText() {
  $('#dialog .txt').textContent = D.full.slice(0, Math.floor(D.pos));
  if (D.choices && D.pos >= D.full.length) {
    const ch = $('#dialog .choices');
    if (!ch.children.length) D.choices.forEach((o) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = o.text; b.onclick = (ev) => { ev.stopPropagation(); $('#dialog').classList.add('hidden'); o.cb(); }; ch.appendChild(b); });
  }
}
$('#dialog').addEventListener('click', dlgAdvance);

// ---------- Перки ----------
function openPerks() {
  G.pendingPerks--; G.state = 'perk';
  const pool = PERKS.slice().sort(() => Math.random() - 0.5).slice(0, 3), box = $('#perkCards'); box.innerHTML = '';
  pool.forEach((pk, i) => {
    const c = document.createElement('div'); c.className = 'card perk';
    c.innerHTML = `<div class="key">${i + 1}</div><div class="ic">${pk.icon}</div><h3>${pk.name}</h3><p>${pk.desc}</p>`;
    c.onclick = () => choosePerk(pk); box.appendChild(c); c.dataset.i = i;
  });
  G.perkPool = pool; $('#perks').classList.remove('hidden');
}
function choosePerk(pk) {
  P.perks[pk.id] = (P.perks[pk.id] || 0) + 1;
  switch (pk.id) {
    case 'dmg': P.dmgMul += 0.2; break;
    case 'hp': P.maxHp += 25; P.hp = Math.min(P.maxHp, P.hp + 40); break;
    case 'spd': P.spdMul += 0.12; break;
    case 'as': P.asMul += 0.15; break;
    case 'crit': P.crit += 0.1; break;
    case 'vamp': P.lifesteal += 0.05; break;
    case 'cdr': P.cdr = Math.min(0.6, P.cdr + 0.15); break;
    case 'alch': P.maxPotions++; P.potions++; P.potionHeal += 0.1; break;
    case 'roll': P.dodgeMul *= 0.75; break;
    case 'soul': P.xpMul += 0.2; P.magnet += 50; break;
  }
  Sfx.play('level'); $('#perks').classList.add('hidden'); G.state = 'play';
}

// ---------- Меню / потік гри ----------
let selClass = null;
function buildClassCards() {
  const box = $('#classCards'); box.innerHTML = '';
  const bar = (n, v, max) => `<div class="bar"><span>${n}</span><i><b style="width:${Math.min(100, (v / max) * 100)}%"></b></i></div>`;
  CLASSES.forEach((c) => {
    const el = document.createElement('div'); el.className = 'card';
    el.innerHTML = `<div class="ic">${c.icon}</div><h3>${c.name}</h3><div class="sub">${c.title} · ${c.style}</div><p>${c.desc}</p>` +
      bar('Здоров’я', c.hp, 150) + bar('Шкода', c.dmg / c.atkCd, 35) + bar('Швидкість', c.speed, 120) +
      `<div class="ab"><b>ПКМ · ${c.ability.name}</b><br>${c.ability.desc}</div>`;
    el.onclick = () => { selClass = c; document.querySelectorAll('#classCards .card').forEach((x) => x.classList.remove('sel')); el.classList.add('sel'); $('#btnStart').disabled = false; Sfx.play('click'); };
    box.appendChild(el);
  });
}
$('#btnNew').onclick = () => { Sfx.init(); Sfx.play('click'); $('#menu').classList.add('hidden'); $('#classes').classList.remove('hidden'); buildClassCards(); };
$('#btnStart').onclick = () => {
  if (!selClass) return; Sfx.play('click'); $('#classes').classList.add('hidden');
  createPlayer(selClass); Object.assign(G, { time: 0, kills: 0, deaths: 0, seen: {}, pendingPerks: 0 });
  startLevel(0); G.state = 'play';
  showDialog([...STORY.prologue.map((l) => ({ who: l[0], text: l[1] })), { who: '', text: selClass.intro }]);
};
$('#btnResume').onclick = () => { $('#pause').classList.add('hidden'); G.state = 'play'; };
$('#btnRevive').onclick = () => { $('#dead').classList.add('hidden'); P.inv = 1.5; startLevel(G.level); say('Ти воскрес біля вогнища.'); };
$('#btnAgain').onclick = () => { $('#ending').classList.add('hidden'); $('#menu').classList.remove('hidden'); G.state = 'menu'; };
function endGame(k) {
  const e = STORY.endings[k]; G.state = 'end';
  $('#endTitle').textContent = e.title; $('#endText').textContent = e.text;
  const m = Math.floor(G.time / 60), s = Math.floor(G.time % 60);
  $('#endStats').textContent = `${P.cls.name} · рівень ${P.level} · вбито ворогів: ${G.kills} · смертей: ${G.deaths} · час: ${m}:${String(s).padStart(2, '0')}`;
  $('#ending').classList.remove('hidden');
}

addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') Sfx.toggle();
  if (e.code === 'Escape' && !e.repeat) {
    if (G.state === 'pause') $('#btnResume').click();
    else if (G.state === 'play') { G.state = 'pause'; $('#pause').classList.remove('hidden'); }
  }
  if (G.state === 'perk') { const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code); if (i >= 0 && G.perkPool[i]) choosePerk(G.perkPool[i]); }
});

// ---------- Рендер ----------
function drawTiles() {
  const th = LEVELS[G.level].theme, x0 = Math.max(0, Math.floor((cam.x - W / 2) / TS)), x1 = Math.min(map.w - 1, Math.floor((cam.x + W / 2) / TS)),
    y0 = Math.max(0, Math.floor((cam.y - H / 2) / TS)), y1 = Math.min(map.h - 1, Math.floor((cam.y + H / 2) / TS));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x * TS, py = y * TS;
    if (map.t[y * map.w + x] === 1) {
      const below = !solid(x, y + 1);
      ctx.fillStyle = th.wall; ctx.fillRect(px, py, TS, TS);
      if (below) { ctx.fillStyle = th.face; ctx.fillRect(px, py + TS - 12, TS, 12); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(px, py + TS - 2, TS, 2); }
      if (!solid(x, y + 1) || !solid(x, y - 1) || !solid(x - 1, y) || !solid(x + 1, y)) { ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(px, py, TS, 2); }
    } else {
      const h = hash2(x, y);
      ctx.fillStyle = th.floor[Math.floor(h * 3)]; ctx.fillRect(px, py, TS, TS);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(px, py, TS, 1); ctx.fillRect(px, py, 1, TS);
      if (h > 0.9) { ctx.fillStyle = th.accent; ctx.globalAlpha = 0.25; ctx.fillRect(px + h * 40 % 22, py + (h * 900) % 22, 5, 3); ctx.globalAlpha = 1; }
    }
  }
}
function drawProp(p, t) {
  ctx.save(); ctx.translate(p.x, p.y);
  switch (p.type) {
    case 'bones': ctx.rotate(p.a); ctx.fillStyle = '#b9b19c'; ctx.fillRect(-8 * p.s, -1, 16 * p.s, 3); ctx.beginPath(); ctx.arc(5 * p.s, -3, 4 * p.s, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.fillRect(4 * p.s, -4, 1.5, 2); break;
    case 'blood': ctx.fillStyle = 'rgba(90,10,14,.55)'; ctx.beginPath(); ctx.ellipse(0, 0, 12 * p.s, 8 * p.s, p.a, 0, 7); ctx.fill(); break;
    case 'crack': ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5; ctx.rotate(p.a); ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-2, 3); ctx.lineTo(3, -2); ctx.lineTo(11, 2); ctx.stroke(); break;
    case 'grave': ctx.fillStyle = '#4a4a52'; ctx.fillRect(-7, -8, 14, 14); ctx.beginPath(); ctx.arc(0, -8, 7, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#2a2a30'; ctx.fillRect(-1, -8, 2, 8); ctx.fillRect(-4, -5, 8, 2); break;
    case 'torch': ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-2, -2, 4, 12); { const f = 1 + Math.sin(t * 12 + p.ph) * 0.15; ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.ellipse(0, -6, 4 * f, 8 * f, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.ellipse(0, -4, 2, 4 * f, 0, 0, 7); ctx.fill(); } break;
    case 'bonfire': ctx.fillStyle = '#3a2416'; ctx.save(); ctx.rotate(0.5); ctx.fillRect(-14, -3, 28, 6); ctx.restore(); ctx.save(); ctx.rotate(-0.5); ctx.fillRect(-14, -3, 28, 6); ctx.restore();
      { const f = 1 + Math.sin(t * 10) * 0.12 + Math.sin(t * 23) * 0.06; ctx.fillStyle = '#ff6a1a'; ctx.beginPath(); ctx.ellipse(0, -8, 9 * f, 16 * f, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ffc04a'; ctx.beginPath(); ctx.ellipse(0, -6, 5, 10 * f, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.ellipse(0, -4, 2.5, 5, 0, 0, 7); ctx.fill(); } break;
    case 'npc': ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(0, 10, 11, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = G.level === 1 ? 'rgba(160,190,255,.7)' : '#5a4a3a'; ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(0, -12); ctx.lineTo(10, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d8c0a0'; ctx.beginPath(); ctx.arc(0, -10, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#e8c04a'; ctx.font = 'bold 16px Georgia'; ctx.textAlign = 'center'; ctx.fillText('!', 0, -24 + Math.sin(t * 4) * 2); break;
    case 'scroll': ctx.fillStyle = '#d8c48a'; ctx.fillRect(-7, -4, 14, 8); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(-8, -5, 3, 10); ctx.fillRect(5, -5, 3, 10); ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.3; ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.globalAlpha = 0.15; ctx.fill(); ctx.globalAlpha = 1; break;
    case 'portal': { const open = G.portalOpen, col = open ? '#a25aff' : '#555'; ctx.strokeStyle = col; ctx.lineWidth = 4; for (let i = 0; i < 3; i++) { ctx.globalAlpha = open ? 0.8 - i * 0.2 : 0.4; ctx.beginPath(); ctx.ellipse(0, 0, 18 - i * 4 + Math.sin(t * 3 + i) * 2, 24 - i * 5, t * (open ? 1 : 0.1) + i, 0, 6); ctx.stroke(); } ctx.globalAlpha = 1; if (open) { ctx.fillStyle = 'rgba(160,90,255,.3)'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill(); } break; }
  }
  ctx.restore();
}
function shadow(x, y, r) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, r, r * 0.45, 0, 0, 7); ctx.fill(); }

function drawEnemy(e, t) {
  ctx.save(); ctx.translate(e.x, e.y); shadow(0, 0, e.r);
  const fl = e.flash > 0, r = e.r, wob = Math.sin(t * 8 + e.t) * 1.5, tel = e.atk ? 1 - e.atk.t / e.wind : 0;
  if (e.atk && e.ai === 'melee') { ctx.fillStyle = `rgba(255,40,40,${0.15 + tel * 0.3})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, e.range + r + 8, e.face - 0.8, e.face + 0.8); ctx.fill(); }
  if (e.stun > 0) { ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -r - 8, 6, t * 8, t * 8 + 4); ctx.stroke(); }
  const face = e.face, fx = Math.cos(face), fy = Math.sin(face);
  switch (e.type) {
    case 'skeleton': ctx.fillStyle = fl ? '#fff' : '#cfc8b4'; ctx.beginPath(); ctx.arc(0, wob * 0.3, r, 0, 7); ctx.fill(); ctx.fillStyle = '#1a1414'; ctx.beginPath(); ctx.arc(-3 + fx * 2, -2 + fy * 2, 2.2, 0, 7); ctx.arc(3 + fx * 2, -2 + fy * 2, 2.2, 0, 7); ctx.fill(); ctx.strokeStyle = '#8a8474'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx * r, fy * r); ctx.lineTo(fx * (r + 14), fy * (r + 14)); ctx.stroke(); break;
    case 'ghoul': ctx.fillStyle = fl ? '#fff' : '#6a7a5a'; ctx.beginPath(); ctx.ellipse(0, wob, r, r * 0.9, face, 0, 7); ctx.fill(); ctx.fillStyle = '#ff3030'; ctx.beginPath(); ctx.arc(fx * 4 - 3, fy * 4 - 2, 1.8, 0, 7); ctx.arc(fx * 4 + 3, fy * 4 - 2, 1.8, 0, 7); ctx.fill(); ctx.strokeStyle = '#3a4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx * r, fy * r - 4); ctx.lineTo(fx * (r + 8), fy * (r + 8) - 4); ctx.moveTo(fx * r, fy * r + 4); ctx.lineTo(fx * (r + 8), fy * (r + 8) + 4); ctx.stroke(); break;
    case 'cultist': ctx.fillStyle = fl ? '#fff' : (e.elite ? '#6a1a5a' : '#3a1a4a'); ctx.beginPath(); ctx.moveTo(-r, r); ctx.lineTo(0, -r * 1.2); ctx.lineTo(r, r); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#c03aff'; ctx.beginPath(); ctx.arc(-2, -r * 0.4, 1.6, 0, 7); ctx.arc(2, -r * 0.4, 1.6, 0, 7); ctx.fill(); if (e.atk) { ctx.fillStyle = '#c03aff'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(fx * r, fy * r, 3 + tel * 6, 0, 7); ctx.fill(); ctx.globalAlpha = 1; } break;
    case 'brute': ctx.fillStyle = fl ? '#fff' : '#9a6a5a'; ctx.beginPath(); ctx.arc(0, wob * 0.4, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#4a2a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.3); ctx.lineTo(r * 0.6, r * 0.3); ctx.moveTo(-r * 0.3, r * 0.6); ctx.lineTo(r * 0.3, -r * 0.6); ctx.stroke(); ctx.fillStyle = '#ffdd44'; ctx.beginPath(); ctx.arc(fx * 6 - 3, fy * 6 - 2, 2, 0, 7); ctx.arc(fx * 6 + 3, fy * 6 - 2, 2, 0, 7); ctx.fill(); ctx.fillStyle = '#5a3a30'; ctx.beginPath(); ctx.arc(fx * r * 0.9, fy * r * 0.9, r * 0.45, 0, 7); ctx.fill(); break;
    case 'boss': {
      const p2 = e.phase === 2;
      if (e.state === 'slam') { ctx.fillStyle = `rgba(255,30,30,${0.12 + (1 - e.st / 0.9) * 0.3})`; ctx.beginPath(); ctx.arc(0, 0, 110, 0, 7); ctx.fill(); }
      if (e.state === 'charge' && e.st > 0) { ctx.fillStyle = 'rgba(255,30,30,.25)'; ctx.save(); ctx.rotate(e.chargeA); ctx.fillRect(0, -e.r, 240, e.r * 2); ctx.restore(); }
      ctx.fillStyle = p2 ? 'rgba(255,40,20,.25)' : 'rgba(160,40,255,.2)'; ctx.beginPath(); ctx.arc(0, 0, r + 10 + Math.sin(t * 5) * 3, 0, 7); ctx.fill();
      ctx.fillStyle = fl ? '#fff' : '#22161e'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.strokeStyle = p2 ? '#ff4020' : '#8a3a9a'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#e0b040'; ctx.beginPath(); ctx.moveTo(-14, -r + 4); for (let i = 0; i < 5; i++) { ctx.lineTo(-14 + i * 7, -r - 8 + (i % 2 ? 6 : 0)); ctx.lineTo(-10.5 + i * 7, -r + 2); } ctx.lineTo(14, -r + 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = p2 ? '#ff3020' : '#c03aff'; ctx.beginPath(); ctx.arc(fx * 8 - 5, fy * 8 - 3, 3, 0, 7); ctx.arc(fx * 8 + 5, fy * 8 - 3, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#7a7a8a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(fx * r, fy * r); ctx.lineTo(fx * (r + 30), fy * (r + 30)); ctx.stroke();
      break;
    }
  }
  if (e.elite) { ctx.strokeStyle = 'rgba(255,200,60,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, 7); ctx.stroke(); }
  if (e.burn > 0) { ctx.fillStyle = 'rgba(255,120,20,.4)'; ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, 7); ctx.fill(); }
  if (e.ai !== 'boss' && e.hp < e.maxHp) { ctx.fillStyle = '#000'; ctx.fillRect(-r, -r - 10, r * 2, 4); ctx.fillStyle = e.elite ? '#e0a020' : '#c02020'; ctx.fillRect(-r + 1, -r - 9, (r * 2 - 2) * Math.max(0, e.hp / e.maxHp), 2); }
  ctx.restore();
}

function drawPlayer(t) {
  const c = P.cls; ctx.save(); ctx.translate(P.x, P.y); shadow(0, 0, P.r + 2);
  if (P.inv > 0 && P.dodgeT <= 0 && Math.floor(t * 20) % 2) ctx.globalAlpha = 0.5;
  if (P.dodgeT > 0) ctx.globalAlpha = 0.6;
  const fx = Math.cos(P.face), fy = Math.sin(P.face), bob = P.moving ? Math.sin(P.animT * 14) * 1.3 : 0;
  const body = P.flash > 0 ? '#fff' : c.color;
  ctx.fillStyle = body; ctx.beginPath(); ctx.arc(0, bob, P.r, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#e2c9a6'; ctx.beginPath(); ctx.arc(fx * 3, fy * 3 + bob, 5, 0, 7); ctx.fill();
  ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.arc(fx * 5 - fy * 2, fy * 5 + fx * 2 + bob, 1.3, 0, 7); ctx.arc(fx * 5 + fy * 2, fy * 5 - fx * 2 + bob, 1.3, 0, 7); ctx.fill();
  ctx.save(); ctx.rotate(P.face);
  const swing = P.atkT > 0 ? Math.max(0, P.atkT / (c.atkCd / P.asMul)) : 0;
  if (c.id === 'knight') { ctx.rotate(-swing * 1.2 + 0.4 * swing); ctx.strokeStyle = '#cfd6e0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(8, 7); ctx.lineTo(30, 7); ctx.stroke(); ctx.strokeStyle = c.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(9, 3); ctx.lineTo(9, 11); ctx.stroke(); ctx.fillStyle = '#6a5a3a'; ctx.beginPath(); ctx.arc(6, -8, 7, 0, 7); ctx.fill(); ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.stroke(); }
  else if (c.id === 'pyro') { ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(24, 8); ctx.stroke(); ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.arc(26, 8, 5 + Math.sin(t * 10) * 1, 0, 7); ctx.fill(); ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(26, 8, 2.5, 0, 7); ctx.fill(); }
  else if (c.id === 'ranger') { ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(14, 0, 14, -1.1 - swing, 1.1 + swing); ctx.stroke(); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(14 + Math.cos(-1.1) * 14, Math.sin(-1.1) * 14); ctx.lineTo(swing ? 14 : 8, 0); ctx.lineTo(14 + Math.cos(1.1) * 14, Math.sin(1.1) * 14); ctx.stroke(); }
  else { ctx.strokeStyle = '#4a4a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(24, 8); ctx.stroke(); ctx.fillStyle = '#d8ffe8'; ctx.beginPath(); ctx.arc(26, 8, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#0a2a1a'; ctx.fillRect(24, 6, 1.6, 1.6); ctx.fillRect(27, 6, 1.6, 1.6); ctx.fillRect(25, 9, 3, 1.4); }
  ctx.restore(); ctx.restore();
}

function drawAlly(a) {
  ctx.save(); ctx.translate(a.x, a.y); shadow(0, 0, a.r); ctx.globalAlpha = a.life < 2 ? 0.4 + Math.sin(G.time * 20) * 0.3 : 1;
  ctx.fillStyle = a.flash > 0 ? '#fff' : '#8affc8'; ctx.beginPath(); ctx.arc(0, 0, a.r, 0, 7); ctx.fill(); ctx.fillStyle = '#0a2a1a'; ctx.beginPath(); ctx.arc(-3, -2, 2, 0, 7); ctx.arc(3, -2, 2, 0, 7); ctx.fill();
  ctx.strokeStyle = '#a8ffd8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Math.cos(a.face) * a.r, Math.sin(a.face) * a.r); ctx.lineTo(Math.cos(a.face) * (a.r + 10), Math.sin(a.face) * (a.r + 10)); ctx.stroke(); ctx.restore();
}

function drawWorld(t) {
  const sh = G.shake, sx = Math.round(W / 2 - cam.x + rand(-sh, sh)), sy = Math.round(H / 2 - cam.y + rand(-sh, sh));
  ctx.save(); ctx.translate(sx, sy);
  drawTiles();
  props.filter((p) => p.type !== 'npc' && p.type !== 'portal' && p.type !== 'bonfire' && p.type !== 'scroll').forEach((p) => drawProp(p, t));
  props.filter((p) => ['npc', 'portal', 'bonfire', 'scroll'].includes(p.type)).forEach((p) => drawProp(p, t));
  pickups.forEach((p) => {
    if (p.type === 'soul') { ctx.fillStyle = 'rgba(120,220,255,.9)'; ctx.beginPath(); ctx.arc(p.x, p.y + Math.sin(p.t * 6) * 2, 3.5, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(120,220,255,.25)'; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = '#a02a4a'; ctx.beginPath(); ctx.arc(p.x, p.y + Math.sin(p.t * 5) * 2, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#ddd'; ctx.fillRect(p.x - 2, p.y - 10 + Math.sin(p.t * 5) * 2, 4, 5); }
  });
  const list = [...enemies.map((e) => ({ y: e.y, f: () => drawEnemy(e, t) })), ...allies.map((a) => ({ y: a.y, f: () => drawAlly(a) })), { y: P.y, f: () => drawPlayer(t) }].sort((a, b) => a.y - b.y);
  list.forEach((o) => o.f());
  effects.forEach((e) => {
    const k = e.t / e.life;
    if (e.k === 'ring') { ctx.strokeStyle = e.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 6 * (1 - k) + 1; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.2 + k * 0.8), 0, 7); ctx.stroke(); ctx.fillStyle = e.color; ctx.globalAlpha = (1 - k) * 0.15; ctx.fill(); ctx.globalAlpha = 1; }
    else if (e.k === 'slash') { ctx.strokeStyle = '#fff'; ctx.globalAlpha = 1 - k; ctx.lineWidth = 8 * (1 - k) + 1; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.85, e.a - e.arc / 2 + k * 0.6, e.a + e.arc / 2 - 0.2 + k * 0.6); ctx.stroke(); ctx.globalAlpha = 1; }
  });
  projs.forEach((p) => {
    ctx.fillStyle = p.color; ctx.beginPath();
    if (p.arrow) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.fillRect(-9, -1, 14, 2); ctx.restore(); }
    else { ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.45, 0, 7); ctx.fill(); }
  });
  parts.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }); ctx.globalAlpha = 1;
  ctx.restore();
  return { sx, sy };
}

function drawLighting(t, sx, sy) {
  const th = LEVELS[G.level].theme, lw = lightCv.width, lh = lightCv.height;
  lctx.globalCompositeOperation = 'source-over'; lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.fillStyle = `rgba(3,2,7,${th.ambient})`; lctx.fillRect(0, 0, lw, lh);
  lctx.globalCompositeOperation = 'destination-out'; lctx.setTransform(0.5, 0, 0, 0.5, sx / 2, sy / 2);
  const light = (x, y, r, a = 1) => {
    if (x + r < cam.x - W / 2 || x - r > cam.x + W / 2 || y + r < cam.y - H / 2 || y - r > cam.y + H / 2) return;
    const g = lctx.createRadialGradient(x, y, r * 0.1, x, y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.6, `rgba(0,0,0,${a * 0.5})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.beginPath(); lctx.arc(x, y, r, 0, 7); lctx.fill();
  };
  light(P.x, P.y, 250 + Math.sin(t * 3) * 6);
  props.forEach((p) => { if (p.type === 'torch') light(p.x, p.y, 150 + Math.sin(t * 12 + p.ph) * 8, 0.95); else if (p.type === 'bonfire') light(p.x, p.y, 210 + Math.sin(t * 10) * 10); else if (p.type === 'portal' && G.portalOpen) light(p.x, p.y, 130, 0.8); else if (p.type === 'scroll') light(p.x, p.y, 45, 0.7); });
  projs.forEach((p) => light(p.x, p.y, 55, 0.9));
  effects.forEach((e) => { if (e.k === 'ring') light(e.x, e.y, e.r * 1.2, 1 - e.t / e.life); });
  pickups.forEach((p) => { if (p.type === 'soul') light(p.x, p.y, 40, 0.7); });
  enemies.forEach((e) => { if (e.ai === 'boss') light(e.x, e.y, 170, 0.8); else if (e.elite) light(e.x, e.y, 80, 0.8); });
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.drawImage(lightCv, 0, 0, W, H);
  // тепле світіння навколо гравця
  const g = ctx.createRadialGradient(W / 2 + (P.x - cam.x), H / 2 + (P.y - cam.y), 10, W / 2 + (P.x - cam.x), H / 2 + (P.y - cam.y), 240);
  g.addColorStop(0, 'rgba(255,150,60,0.12)'); g.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
  // віньєтка
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.65)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  if (P.hp < P.maxHp * 0.3) { ctx.fillStyle = `rgba(160,0,0,${0.12 + Math.sin(t * 6) * 0.05})`; ctx.fillRect(0, 0, W, H); }
}

function drawHUD(t, sx, sy) {
  ctx.textAlign = 'left'; ctx.font = '14px Georgia, serif';
  // HP
  const bw = 260; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(16, 16, bw + 4, 26); ctx.fillStyle = '#3a0a0e'; ctx.fillRect(18, 18, bw, 22);
  ctx.fillStyle = '#b02030'; ctx.fillRect(18, 18, bw * Math.max(0, P.hp / P.maxHp), 22); ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(18, 18, bw * Math.max(0, P.hp / P.maxHp), 8);
  ctx.fillStyle = '#fff'; ctx.fillText(`${Math.ceil(P.hp)} / ${P.maxHp}`, 26, 34);
  // XP
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(16, 46, bw + 4, 12); ctx.fillStyle = '#12303a'; ctx.fillRect(18, 48, bw, 8); ctx.fillStyle = '#4ac0e0'; ctx.fillRect(18, 48, bw * (P.xp / P.xpNext), 8);
  ctx.fillStyle = '#c9a35a'; ctx.fillText(`${P.cls.name} · Рівень ${P.level}`, 18, 76);
  // Кулдауни
  const slots = [
    { k: 'ЛКМ', n: 'Атака', v: 1 - Math.max(0, P.atkT) / (P.cls.atkCd / P.asMul), ic: P.cls.icon },
    { k: 'ПКМ', n: 'Здібність', v: 1 - Math.max(0, P.abT) / (P.cls.ability.cd * (1 - P.cdr)), ic: '✦' },
    { k: '␣', n: 'Ухил.', v: 1 - Math.max(0, P.dodgeCdT) / (P.cls.dodgeCd * P.dodgeMul), ic: '💨' },
    { k: 'F', n: 'Зілля ×' + P.potions, v: P.potions > 0 ? 1 : 0, ic: '🧪' },
  ];
  slots.forEach((s, i) => {
    const x = W / 2 - 150 + i * 80, y = H - 78;
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x, y, 64, 64); ctx.strokeStyle = s.v >= 1 ? '#c9a35a' : '#443'; ctx.lineWidth = 2; ctx.strokeRect(x, y, 64, 64);
    ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.globalAlpha = s.v >= 1 ? 1 : 0.4; ctx.fillText(s.ic, x + 32, y + 38); ctx.globalAlpha = 1;
    if (s.v < 1) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x, y + 64 * s.v, 64, 64 * (1 - s.v)); }
    ctx.font = '11px Georgia'; ctx.fillStyle = '#c9a35a'; ctx.fillText(s.k, x + 32, y - 4); ctx.fillStyle = '#aaa'; ctx.fillText(s.n, x + 32, y + 58);
  });
  ctx.textAlign = 'left';
  // Мінікарта
  const mw = map.w * 3, mh = map.h * 3, mx = W - mw - 16, my = 16;
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (explored[y * map.w + x]) { ctx.fillStyle = map.t[y * map.w + x] ? '#2a2630' : '#5a5060'; ctx.fillRect(mx + x * 3, my + y * 3, 3, 3); }
  ctx.fillStyle = '#ffd24a'; ctx.fillRect(mx + (P.x / TS) * 3 - 2, my + (P.y / TS) * 3 - 2, 4, 4);
  enemies.forEach((e) => { const tx = Math.floor(e.x / TS), ty = Math.floor(e.y / TS); if (explored[ty * map.w + tx] && (e.aggro || e.elite)) { ctx.fillStyle = e.elite ? '#ff9020' : '#e03030'; ctx.fillRect(mx + (e.x / TS) * 3 - 1, my + (e.y / TS) * 3 - 1, 3, 3); } });
  // Ціль
  ctx.textAlign = 'center'; ctx.font = '15px Georgia';
  const cfg = LEVELS[G.level];
  ctx.fillStyle = 'rgba(217,207,192,.85)';
  ctx.fillText(cfg.boss ? 'Здолай Короля Мальгората' : G.portalOpen ? 'Знайди портал' : `Знайди й здолай: ${cfg.elite.name}`, W / 2, 26);
  // Босс-бар
  if (G.boss && G.boss.aggro && !G.boss.dead) {
    const bw2 = Math.min(600, W - 80), bx = W / 2 - bw2 / 2, by = H - 108;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx - 3, by - 3, bw2 + 6, 20); ctx.fillStyle = '#2a0a12'; ctx.fillRect(bx, by, bw2, 14);
    ctx.fillStyle = G.boss.phase === 2 ? '#e03018' : '#a02a6a'; ctx.fillRect(bx, by, bw2 * Math.max(0, G.boss.hp / G.boss.maxHp), 14);
    ctx.fillStyle = '#e0c080'; ctx.font = '13px Georgia'; ctx.fillText(G.boss.name, W / 2, by - 8);
  }
  // Елітний бар
  enemies.forEach((e) => { if (e.elite && e.aggro) { const bw2 = Math.min(400, W - 80), bx = W / 2 - bw2 / 2, by = 46; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx - 2, by - 2, bw2 + 4, 12); ctx.fillStyle = '#e0a020'; ctx.fillRect(bx, by, bw2 * Math.max(0, e.hp / e.maxHp), 8); ctx.font = '12px Georgia'; ctx.fillStyle = '#e0c080'; ctx.fillText(e.name, W / 2, by + 24); } });
  // Підказка взаємодії
  if (G.near && G.state === 'play') { ctx.font = '16px Georgia'; ctx.fillStyle = '#ffe08a'; ctx.fillText('[E] ' + (G.near.dyn ? G.near.dyn() : G.near.label), W / 2, H / 2 + 60); }
  // Повідомлення
  if (G.msgT > 0) { ctx.globalAlpha = Math.min(1, G.msgT); ctx.font = 'italic 20px Georgia'; ctx.fillStyle = '#e8d8b0'; ctx.fillText(G.msg, W / 2, 110); ctx.globalAlpha = 1; }
  // Плаваючий текст
  ctx.save(); ctx.translate(sx, sy);
  texts.forEach((tx) => { ctx.globalAlpha = 1 - tx.t; ctx.font = (tx.big ? 'bold 20px' : '14px') + ' Georgia'; ctx.fillStyle = '#000'; ctx.fillText(tx.text, tx.x + 1, tx.y + 1); ctx.fillStyle = tx.color; ctx.fillText(tx.text, tx.x, tx.y); }); ctx.globalAlpha = 1; ctx.restore();
  // Заголовок рівня
  if (G.titleT > 0) {
    const a = Math.min(1, G.titleT, (3.5 - G.titleT) * 2); ctx.globalAlpha = a; ctx.fillStyle = '#c9a35a'; ctx.font = '16px Georgia'; ctx.fillText(cfg.sub.toUpperCase(), W / 2, H * 0.3 - 30);
    ctx.font = 'bold 44px Georgia'; ctx.fillStyle = '#d9cfc0'; ctx.shadowColor = '#000'; ctx.shadowBlur = 12; ctx.fillText(cfg.name, W / 2, H * 0.3 + 14); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}

function drawMenuBg(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#07050a'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H * 1.05, 20, W / 2, H * 1.05, H * 0.9); g.addColorStop(0, 'rgba(200,70,20,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  embers.forEach((e) => { e.y -= e.s * 0.01; e.x += Math.sin(t + e.r * 5) * 0.0004; if (e.y < 0) { e.y = 1; e.x = Math.random(); } ctx.fillStyle = `rgba(255,${120 + e.r * 30},40,${0.3 + e.r / 6})`; ctx.fillRect(e.x * W, e.y * H, e.r, e.r); });
}

let last = performance.now(), clock = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.state === 'menu' || !map) drawMenuBg(clock);
  else {
    if (G.state === 'play') update(dt);
    else if (G.state === 'dialog') {
      if (D.pos < D.full.length) { D.pos = Math.min(D.full.length, D.pos + dt * 55); renderDlgText(); } else if (D.choices) renderDlgText();
      if (Input.pressed('KeyE') || Input.pressed('Space') || Input.pressed('Enter')) dlgAdvance();
      cam.x += (P.x - cam.x) * Math.min(1, dt * 8); cam.y += (P.y - cam.y) * Math.min(1, dt * 8);
    }
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const { sx, sy } = drawWorld(G.time);
    drawLighting(G.time, sx, sy);
    drawHUD(G.time, sx, sy);
  }
  Input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
