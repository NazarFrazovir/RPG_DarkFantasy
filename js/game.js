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

initSprites(); Music.play('menu');
const G = { state: 'menu', cls: null, level: 0, time: 0, kills: 0, deaths: 0, shake: 0, titleT: 0, pendingPerks: 0, portalOpen: false, seen: {}, msg: '', msgT: 0, boss: null };
let P, map, enemies, projs, parts, pickups, texts, allies, props, effects, corpses = [], inter, explored, flow, flowT, cam = { x: 0, y: 0 };

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
    aggro: false, atk: null, strike: 0, flash: 0, stun: 0, burn: 0, kx: 0, ky: 0, face: Math.random() * 6.283, dust: 0, t: Math.random() * 5, dead: false, minion: false,
  };
  e.maxHp = e.hp;
  if (elite) e.name = cfg.elite.name;
  return e;
}

function startLevel(i) {
  G.level = i; const cfg = LEVELS[i], rng = mulberry32(cfg.seed);
  map = genMap(cfg, rng); TILES = buildTiles(cfg.theme, cfg.seed);
  Music.play(['lvl1', 'lvl2', 'boss'][i]); Music.target = 0; Music.phase2 = false;
  enemies = []; projs = []; parts = []; pickups = []; texts = []; allies = []; props = []; effects = []; inter = []; corpses = []; G.timers = []; G.noPerk = false; G.stop = 0; G.pcorpse = null; P.castT = 0;
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
      if (G.fading) return; const next = G.level + 1; Sfx.play('level'); fade(() => { startLevel(next); introLevel(next); }, { out: 550, hold: 200, inn: 800 });
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
function later(sec, fn) { G.timers.push({ t: sec, fn }); }
function say(m) { G.msg = m; G.msgT = 3.5; }

// ---------- Урон ----------
function hurtPlayer(dmg, from) {
  if (P.inv > 0 || G.state !== 'play') return;
  P.hp -= dmg; P.inv = 0.45; P.flash = 0.15; G.shake = Math.max(G.shake, 7); G.stop = 0.07; P.hitDir = from ? Math.cos(angTo(from, P)) : 1;
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
  e.hp -= dmg; e.flash = 0.12; e.aggro = true; e.hitAng = ang; if (crit) G.stop = Math.max(G.stop, 0.05);
  const kb = knock * (1 - e.kbRes); e.kx += Math.cos(ang) * kb * 5; e.ky += Math.sin(ang) * kb * 5;
  float(e.x + rand(-6, 6), e.y - e.r - 6, dmg + (crit ? '!' : ''), crit ? '#ffd24a' : '#fff', crit);
  burst(e.x, e.y, e.ai === 'boss' ? '#a02020' : '#8a1a1a', 4, 100, 2.5, 0.4);
  if (P.lifesteal) P.hp = Math.min(P.maxHp, P.hp + dmg * P.lifesteal);
  Sfx.play('hit');
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  if (e.dead) return; e.dead = true; G.kills++; G.stop = Math.max(G.stop, e.elite || e.ai === 'boss' ? 0.14 : 0.05);
  corpses.push(makeCorpse(e, e.hitAng)); if (corpses.length > 45) corpses.shift();
  if (e.ai !== 'boss' && e.type !== 'skeleton') burst(e.x, e.y, e.type === 'ghoul' ? '#4a6a2a' : '#7a1010', 12, 140, 3.5, 0.8);
  const orbs = Math.min(6, Math.ceil(e.xp / 8));
  for (let i = 0; i < orbs; i++) pickups.push({ type: 'soul', x: e.x, y: e.y, v: e.xp / orbs, vx: rand(-80, 80), vy: rand(-80, 80), t: 0 });
  if (!e.minion && Math.random() < (e.elite ? 1 : 0.12)) pickups.push({ type: 'potion', x: e.x, y: e.y, vx: 0, vy: 0, t: 0 });
  if (e.elite) { G.portalOpen = true; say(LEVELS[G.level].portalMsg); Sfx.play('level'); G.shake = 10; }
  if (e.ai === 'boss') bossDefeated();
}

function bossDefeated() {
  enemies.forEach((e) => { if (e !== G.boss && !e.dead) { e.hp = 0; killEnemy(e); } });
  G.shake = 14; Sfx.play('boss'); P.inv = 6; Music.target = 0; G.noPerk = true;
  later(4.2, () => showDialog(STORY.bossDown.map((l) => ({ who: l[0], text: l[1] })), () => {
    showChoice('Корона пульсує в твоїх руках. Що ти зробиш?', [
      { text: '💥 Розбити Корону', cb: () => endGame('destroy') },
      { text: '👑 Вдягнути Корону', cb: () => endGame('wear') },
    ]);
  }));
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
  const c = P.cls.id; P.abT = P.cls.ability.cd * (1 - P.cdr); P.castT = 0.4;
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
  P.atkT -= dt; P.dodgeCdT -= dt; P.abT -= dt; P.inv -= dt; P.flash -= dt; P.animT += dt; P.castT -= dt;
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
  e.t += dt; e.flash -= dt; e.strike -= dt;
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
        e.atk = null; e.cd = e.atkCd; e.strike = 0.25; Sfx.play('swing');
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
    if (e.atk) { e.atk.t -= dt; if (e.atk.t <= 0) { const n = e.elite ? 5 : 1; for (let i = 0; i < n; i++) enemyShoot(e, e.face + (i - (n - 1) / 2) * 0.22, e.elite ? 170 : 190); e.atk = null; e.cd = e.atkCd; e.strike = 0.3; } }
    else if (e.cd <= 0 && vis && d < 320) e.atk = { t: e.wind };
  }
}

function updateBoss(b, dt, tgt, d) {
  const frac = b.hp / b.maxHp, phase2 = frac < 0.5;
  if (phase2 && b.phase === 1) { b.phase = 2; Music.phase2 = true; say('Мальгорат розлючений!'); Sfx.play('boss'); G.shake = 12; b.state = 'idle'; b.st = 0.6; }
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
        b.strike = 0.35;
        b.state = 'idle'; b.st = 1.1;
      }
      break;
    case 'burst': {
      const per = phase2 ? 0.4 : 0.5;
      if (b.st < 1.6 - per * (b.n + 1) + 0.0 && b.n < 3) {
        const n = phase2 ? 16 : 12, off = b.n * 0.25 + Math.random() * 0.2;
        for (let i = 0; i < n; i++) enemyShoot(b, (i / n) * 6.283 + off, 170, b.dmg * 0.45, 6, '#c03aff');
        Sfx.play('magic'); b.n++; b.strike = 0.25;
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
        b.state = 'idle'; b.st = 1.2; b.strike = 0.4;
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
  allies.forEach((a) => { if (a.life <= 0 || a.hp <= 0) corpses.push({ kind: 'minion', key: 'minion', x: a.x, y: a.y, r: a.r, face: a.face, scale: 2, t: 0, dir: Math.random() < 0.5 ? 1 : -1, life: 5, seed: 0 }); });
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

function tickFx(dt) {
  parts.forEach((p) => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }); parts = parts.filter((p) => p.life > 0);
  texts.forEach((t) => { t.t += dt; t.y -= 26 * dt; }); texts = texts.filter((t) => t.t < 1);
  effects.forEach((e) => { e.t += dt; }); effects = effects.filter((e) => e.t < e.life);
  corpses.forEach((c) => updateCorpse(c, dt)); corpses = corpses.filter((c) => c.t < c.life);
  if (G.pcorpse) updateCorpse(G.pcorpse, dt);
  G.shake = Math.max(0, G.shake - dt * 30);
  const tm = G.timers; for (let i = tm.length - 1; i >= 0; i--) { tm[i].t -= dt; if (tm[i].t <= 0) { const f = tm[i].fn; tm.splice(i, 1); f(); } }
}
function dust(x, y, big) {
  for (let i = 0; i < (big ? 4 : 2); i++) parts.push({ x: x + rand(-4, 4), y: y + 8 + rand(-1, 2), vx: rand(-18, 18), vy: rand(-14, -2), life: 0.35, max: 0.35, size: big ? 4 : 3, color: 'rgba(150,140,130,.5)' });
}
function update(dt) {
  if (G.stop > 0) { G.stop -= dt; return; }
  G.time += dt; G.titleT -= dt; G.msgT -= dt;
  updatePlayer(dt);
  flowT -= dt; if (flowT <= 0) { computeFlow(); flowT = 0.3; }
  enemies.forEach((e) => { if (!e.dead) updateEnemy(e, dt); });
  enemies = enemies.filter((e) => !e.dead);
  updateAllies(dt); updateProjs(dt); updatePickups(dt);
  Music.target = enemies.some((e) => e.aggro && dist(e, P) < 420) ? 1 : 0;
  tickFx(dt);
  enemies.forEach((e) => { const px = e.px === undefined ? e.x : e.px, py = e.py === undefined ? e.y : e.py, d = Math.hypot(e.x - px, e.y - py); e.px = e.x; e.py = e.y; if (d > 0.4 && e.type !== 'cultist' && (e.dust -= dt) <= 0) { e.dust = 0.2; dust(e.x, e.y, e.ai === 'boss' || e.type === 'brute'); } });
  if (P.moving && P.dodgeT <= 0 && (P.dust = (P.dust || 0) - dt) <= 0) { P.dust = 0.18; dust(P.x, P.y, false); }
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
  if (G.pendingPerks > 0 && G.state === 'play' && !G.noPerk) openPerks();
}

function playerDie() {
  G.deaths++; G.state = 'dead'; Sfx.play('die'); Music.target = 0; burst(P.x, P.y - 6, '#a02020', 26, 190, 4, 1);
  G.pcorpse = { kind: 'human', key: P.cls.id, x: P.x, y: P.y, r: P.r, face: P.face, scale: 2, t: 0, dir: P.hitDir >= 0 ? 1 : -1, life: 9999, seed: 0 };
  setTimeout(() => $('#dead').classList.remove('hidden'), 1900);
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
const fadeEl = $('#fade');
// затемнення: pre — затримка до чорного, out — згасання, hold — пауза в чорному, inn — проявлення
function fade(cb, o = {}) {
  const { pre = 0, out = 600, hold = 150, inn = 700 } = o;
  if (G.fading) return; G.fading = true;
  setTimeout(() => {
    fadeEl.style.transitionDuration = out + 'ms'; fadeEl.classList.add('on');
    setTimeout(() => { cb(); setTimeout(() => { fadeEl.style.transitionDuration = inn + 'ms'; fadeEl.classList.remove('on'); setTimeout(() => { G.fading = false; }, inn); }, hold); }, out);
  }, pre);
}
const clsCards = () => [...document.querySelectorAll('#classCards .card')];
function syncHeroCards() { clsCards().forEach((c, k) => c.classList.toggle('hl', k === MENU.hlHero)); }
function selectClass(i) {
  selClass = CLASSES[i]; clsCards().forEach((x, k) => x.classList.toggle('sel', k === i)); $('#btnStart').disabled = false; Sfx.play('click');
}
function buildClassCards() {
  const box = $('#classCards'); box.innerHTML = '';
  const bar = (n, v, max) => `<div class="bar"><span>${n}</span><i><b style="width:${Math.min(100, (v / max) * 100)}%"></b></i></div>`;
  CLASSES.forEach((c, i) => {
    const el = document.createElement('div'); el.className = 'card';
    el.innerHTML = `<div class="ic">${c.icon}</div><h3>${c.name}</h3><div class="sub">${c.title} · ${c.style}</div><p>${c.desc}</p>` +
      bar('Здоров’я', c.hp, 150) + bar('Шкода', c.dmg / c.atkCd, 35) + bar('Швидкість', c.speed, 120) +
      `<div class="ab"><b>ПКМ · ${c.ability.name}</b><br>${c.ability.desc}</div>`;
    el.onclick = () => selectClass(i);
    el.onmouseenter = () => { MENU.hlCard = i; }; el.onmouseleave = () => { MENU.hlCard = null; };
    box.appendChild(el);
  });
}
// «Нова гра»: меню відлітає, сцена наближається до вогнища, екран темніє — і з'являється вибір класу
function goClasses(pre) {
  if (G.fading) return; Sfx.init(); Sfx.play('click');
  $('#menu').classList.add('leaving'); MENU.leaving = true; MENU.leaveT = clock; document.body.style.cursor = '';
  fade(() => {
    $('#menu').classList.add('hidden'); $('#menu').classList.remove('leaving'); MENU.leaving = false;
    selClass = null; buildClassCards(); $('#btnStart').disabled = true; MENU.hlHero = MENU.hlCard = null;
    $('#classes').classList.remove('hidden'); if (pre !== undefined) selectClass(pre);
  }, { pre: 650, out: 550, hold: 200, inn: 900 });
}
function backToMenu() {
  if (G.fading) return; Sfx.play('click');
  fade(() => { $('#classes').classList.add('hidden'); $('#menu').classList.remove('hidden'); selClass = null; MENU.hlHero = MENU.hlCard = null; }, { out: 380, hold: 100, inn: 500 });
}
$('#btnNew').onclick = () => goClasses();
$('#btnBackCls').onclick = backToMenu;
// --- головне меню: керування, звук, клавіатура ---
const menuBtns = () => [...document.querySelectorAll('#menu .mbtn')];
let menuSel = 0;
function menuSelect(i) { const b = menuBtns(); menuSel = (i + b.length) % b.length; b.forEach((x, k) => x.classList.toggle('sel', k === menuSel)); }
function syncSound() { $('#btnSound').textContent = 'Звук: ' + (Sfx.muted ? 'вимк.' : 'увімк.'); }
menuBtns().forEach((b, i) => b.addEventListener('mouseenter', () => { menuSelect(i); Sfx.tone(880, 0.05, 'square', 0.025); }));
$('#btnHow').onclick = () => { Sfx.play('click'); $('#menu').classList.add('hidden'); $('#howto').classList.remove('hidden'); };
$('#btnBack').onclick = () => { Sfx.play('click'); $('#howto').classList.add('hidden'); $('#menu').classList.remove('hidden'); };
$('#btnSound').onclick = () => { Sfx.init(); Sfx.toggle(); syncSound(); Sfx.play('click'); };
const firstGesture = () => { Sfx.init(); $('#audioHint').classList.add('hidden'); };
addEventListener('pointerdown', firstGesture, { once: true }); addEventListener('keydown', firstGesture, { once: true });
addEventListener('keydown', (e) => {
  if (!$('#howto').classList.contains('hidden')) { if (e.code === 'Escape' || e.code === 'Enter') $('#btnBack').click(); return; }
  if (!$('#classes').classList.contains('hidden') && e.code === 'Escape') { backToMenu(); return; }
  if ($('#menu').classList.contains('hidden') || G.state !== 'menu') return;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') { menuSelect(menuSel + 1); e.preventDefault(); }
  else if (e.code === 'ArrowUp' || e.code === 'KeyW') { menuSelect(menuSel - 1); e.preventDefault(); }
  else if (e.code === 'Enter' || e.code === 'Space') { menuBtns()[menuSel].click(); e.preventDefault(); }
});
menuSelect(0);
addEventListener('mousemove', (e) => { MENU.overUI = !!(e.target.closest && e.target.closest('button, .card, .keys')); });
addEventListener('click', () => { if (G.state === 'cine' && Cine.t > 1.5) Cine.skipping = true; });
addEventListener('click', (e) => {
  if (G.state !== 'menu' || MENU.hlHero === null || G.fading || (e.target.closest && e.target.closest('button, .card'))) return;
  const i = MENU.hlHero; if (!$('#classes').classList.contains('hidden')) selectClass(i); else if (!$('#menu').classList.contains('hidden')) goClasses(i);
});
$('#btnStart').onclick = () => {
  if (!selClass || G.fading) return; Sfx.play('click'); const cls = selClass;
  fade(() => {
    $('#classes').classList.add('hidden'); MENU.hlHero = MENU.hlCard = null; document.body.style.cursor = '';
    createPlayer(cls); Object.assign(G, { time: 0, kills: 0, deaths: 0, seen: {}, pendingPerks: 0 });
    startLevel(0); G.state = 'cine';
    Cine.start(cls, () => { G.state = 'play'; Music.play('lvl1'); });
  }, { out: 750, hold: 300, inn: 1000 });
};
$('#btnRevive').onclick = () => { $('#dead').classList.add('hidden'); P.inv = 1.5; startLevel(G.level); say('Ти воскрес біля вогнища.'); };
$('#btnAgain').onclick = () => { Music.play('menu'); $('#ending').classList.add('hidden'); $('#menu').classList.remove('hidden'); G.state = 'menu'; };
function endGame(k) {
  const e = STORY.endings[k];
  fade(() => {
    $('#dialog').classList.add('hidden'); G.state = 'cine'; Music.target = 0;
    Cine.start(P.cls, () => {
      G.state = 'end'; Music.play(k === 'destroy' ? 'end_good' : 'end_dark');
      $('#endTitle').textContent = e.title; $('#endText').textContent = e.text;
      const m = Math.floor(G.time / 60), s = Math.floor(G.time % 60);
      $('#endStats').textContent = `${P.cls.name} · рівень ${P.level} · вбито ворогів: ${G.kills} · смертей: ${G.deaths} · час: ${m}:${String(s).padStart(2, '0')}`;
      $('#ending').classList.remove('hidden');
    }, k);
  }, { out: 900, hold: 250, inn: 900 });
}

function toggleFs() {
  if (!document.fullscreenElement) (document.documentElement.requestFullscreen || (() => Promise.resolve())).call(document.documentElement).catch(() => {});
  else document.exitFullscreen();
}
document.querySelectorAll('.fsBtn').forEach((b) => (b.onclick = () => { toggleFs(); b.blur(); }));
addEventListener('keydown', (e) => {
  if (e.code === 'KeyG') toggleFs();
  if (e.code === 'KeyM') { Sfx.toggle(); syncSound(); }
  if (e.code === 'Escape' && !e.repeat) {
    if (G.state === 'pause') $('#btnResume').click();
    else if (G.state === 'play') { G.state = 'pause'; $('#pause').classList.remove('hidden'); }
  }
  if (G.state === 'perk') { const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code); if (i >= 0 && G.perkPool[i]) choosePerk(G.perkPool[i]); }
});

// ---------- Рендер ----------
let TILES = null;
// піксельні примітиви
function pxc(x, y, r, col, st = 2) {
  ctx.fillStyle = col;
  for (let j = -r; j <= r; j += st) for (let i = -r; i <= r; i += st) if (i * i + j * j <= r * r) ctx.fillRect(Math.round(x + i - st / 2), Math.round(y + j - st / 2), st, st);
}
function pxArc(x, y, r, a0, a1, size, col) {
  ctx.fillStyle = col; const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * r / 3));
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); ctx.fillRect(Math.round(x + Math.cos(a) * r - size / 2), Math.round(y + Math.sin(a) * r - size / 2), size, size); }
}
function drawTiles() {
  const x0 = Math.max(0, Math.floor((cam.x - W / 2) / TS)), x1 = Math.min(map.w - 1, Math.floor((cam.x + W / 2) / TS)),
    y0 = Math.max(0, Math.floor((cam.y - H / 2) / TS)), y1 = Math.min(map.h - 1, Math.floor((cam.y + H / 2) / TS));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x * TS, py = y * TS, h = hash2(x, y);
    if (map.t[y * map.w + x] === 1) {
      ctx.drawImage((!solid(x, y + 1) ? TILES.face : TILES.top)[Math.floor(h * 3)], px, py, TS, TS);
    } else {
      ctx.drawImage(TILES.floor[Math.floor(h * TILES.floor.length)], px, py, TS, TS);
      if (solid(x, y - 1)) { ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillRect(px, py, TS, 6); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(px, py + 6, TS, 4); }
    }
  }
}
function drawProp(p, t) {
  const px = Math.round(p.x), py = Math.round(p.y);
  ctx.save(); ctx.translate(px, py);
  switch (p.type) {
    case 'bones': ctx.rotate(p.a); ctx.fillStyle = '#b9b19c'; ctx.fillRect(-8, -1, 14, 2); ctx.fillRect(-9, -3, 2, 2); ctx.fillRect(-9, 1, 2, 2); ctx.fillRect(6, -4, 6, 6); ctx.fillStyle = '#15100c'; ctx.fillRect(7, -2, 2, 2); ctx.fillRect(10, -2, 1, 2); break;
    case 'blood': ctx.fillStyle = 'rgba(90,10,14,.6)'; ctx.fillRect(-8 * p.s, -4, 16 * p.s, 8); ctx.fillRect(-4, -8 * p.s, 8, 16 * p.s); ctx.fillStyle = 'rgba(60,4,8,.6)'; ctx.fillRect(-2, -2, 4, 4); break;
    case 'crack': ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(-10, 0, 6, 2); ctx.fillRect(-4, 2, 4, 2); ctx.fillRect(0, 0, 6, 2); ctx.fillRect(6, -2, 4, 2); break;
    case 'grave': ctx.drawImage(SPR.grave, -SPR.grave.width, -SPR.grave.height * 2 + 6, SPR.grave.width * 2, SPR.grave.height * 2); break;
    case 'torch': { ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-2, -2, 4, 12); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-4, -2, 8, 2);
      const f = Math.sin(t * 12 + p.ph), h = 8 + Math.round(f * 2);
      ctx.fillStyle = '#c8501a'; ctx.fillRect(-4, -4 - h, 8, h + 2); ctx.fillStyle = '#ff9a2a'; ctx.fillRect(-2, -6 - h, 4, h + 2); ctx.fillStyle = '#ffe08a'; ctx.fillRect(-2, -4 - (h >> 1), 2, (h >> 1) + 1); break; }
    case 'bonfire': { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-14, 8, 28, 4); ctx.fillStyle = '#3a2416'; ctx.fillRect(-14, 2, 28, 6); ctx.fillStyle = '#5a3a24'; ctx.fillRect(-12, 0, 24, 4); ctx.fillStyle = '#20120a'; ctx.fillRect(-14, 6, 28, 2);
      const f = Math.sin(t * 10) + Math.sin(t * 23) * 0.5, h = 18 + Math.round(f * 3);
      ctx.fillStyle = '#c8401a'; ctx.fillRect(-10, -h + 6, 20, h - 4); ctx.fillStyle = '#ff6a1a'; ctx.fillRect(-8, -h + 2, 16, h - 2); ctx.fillStyle = '#ffa030'; ctx.fillRect(-6, -h + 6, 12, h - 8); ctx.fillStyle = '#ffe08a'; ctx.fillRect(-3, -h + 12, 6, h - 12); break; }
    case 'npc': { const ghost = G.level === 1, near = Math.hypot(P.x - p.x, P.y - p.y) < 170, face = near ? angTo(p, P) : 1.2, fl = ghost ? Math.round(Math.sin(t * 2) * 2) : 0;
      ctx.globalAlpha = ghost ? 0.75 + Math.sin(t * 2) * 0.1 : 1; shadow(0, 0, 11);
      drawChar(ghost ? 'eira' : 'raven', 0, 9 - fl - (ghost ? 3 : 0), { anim: 'idle', idx: Math.floor(t * 2.2 + p.x) % 4, face });
      ctx.globalAlpha = 1; ctx.fillStyle = '#e8c04a'; ctx.font = 'bold 18px Georgia'; ctx.textAlign = 'center'; ctx.fillText('!', 0, -46 + Math.sin(t * 4) * 2); break; }
    case 'scroll': ctx.fillStyle = '#d8c48a'; ctx.fillRect(-7, -4, 14, 8); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(-8, -5, 3, 10); ctx.fillRect(5, -5, 3, 10); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-3, -2, 6, 1); ctx.fillRect(-3, 1, 6, 1);
      if (Math.floor(t * 3 + p.ph) % 2) { ctx.fillStyle = '#ffe08a'; ctx.fillRect(9, -9, 2, 2); ctx.fillRect(-11, -3, 2, 2); } break;
    case 'portal': { const open = G.portalOpen, col = open ? '#a25aff' : '#666a76', col2 = open ? '#e0c0ff' : '#888';
      for (let i = 0; i < 3; i++) { const rx = 18 - i * 4, ry = 26 - i * 5, n = 22, rot = t * (open ? 1.2 : 0.1) * (i % 2 ? -1 : 1);
        ctx.fillStyle = i === 0 ? col : i === 1 ? col2 : col; for (let k = 0; k < n; k++) { const a = (k / n) * 6.283 + rot; ctx.fillRect(Math.round(Math.cos(a) * rx / 2) * 2, Math.round(Math.sin(a) * ry / 2) * 2, 3, 3); } }
      if (open) { ctx.fillStyle = 'rgba(160,90,255,.35)'; ctx.fillRect(-10, -14, 20, 28); } break; }
  }
  ctx.restore();
}
function shadow(x, y, r) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(Math.round(x - r), Math.round(y + r * 0.55), Math.round(r * 2), Math.max(4, Math.round(r * 0.5))); }

function drawSword(x, y, ang, scale, alpha = 1) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(ang); ctx.globalAlpha = alpha; ctx.drawImage(SPR.sword, 0, -SPR.sword.height * scale / 2, SPR.sword.width * scale, SPR.sword.height * scale); ctx.restore();
}

// ---------- Анімації персонажів ----------
const ease = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const ENEMY_BASE = { skeleton: 2, ghoul: 2, cultist: 2, brute: 2, boss: 3 };
const enemyKey = (e) => (e.type === 'cultist' && e.elite ? 'cultistElite' : e.type);
const enemyScale = (e) => Math.floor(ENEMY_BASE[e.type] * (e.elite ? 1.5 : 1) + 0.4);

function bossAnim(b, fx, fy) {
  const s = b.state, caster = s === 'burst' || s === 'summon';
  if (b.strike > 0) return { anim: caster ? 'cast' : 'atk', idx: caster ? 2 : (b.strike > 0.18 ? 1 : 2), ox: fx * 4, oy: fy * 4 };
  if (s === 'slam') return { anim: 'atk', idx: 0, ox: rand(-1, 1), oy: -2 };
  if (caster) return { anim: 'cast', idx: Math.floor(b.t * 7) % 2, ox: 0, oy: Math.sin(b.t * 9) * 1.5 };
  if (s === 'charge') return b.st > 0 ? { anim: 'atk', idx: 0, ox: -fx * 4 + rand(-1, 1), oy: -fy * 4 } : { anim: 'atk', idx: 1, ox: fx * 4, oy: fy * 4 };
  return null;
}

function drawEnemy(e, t) {
  ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y));
  const r = e.r, face = e.face, fx = Math.cos(face), fy = Math.sin(face), tel = e.atk ? 1 - e.atk.t / e.wind : 0;
  const mvd = Math.hypot(e.x - (e.lx === undefined ? e.x : e.lx), e.y - (e.ly === undefined ? e.y : e.ly)); e.lx = e.x; e.ly = e.y; e.mv = (e.mv || 0) * 0.85 + (mvd > 0.2 ? 0.15 : 0);
  shadow(0, 0, r);
  if (e.atk && e.ai === 'melee') { ctx.fillStyle = `rgba(255,40,40,${0.15 + tel * 0.3})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, e.range + r + 8, face - 0.8, face + 0.8); ctx.fill(); }
  if (e.ai === 'boss') {
    if (e.state === 'slam') { ctx.fillStyle = `rgba(255,30,30,${0.12 + (1 - e.st / 0.9) * 0.3})`; ctx.beginPath(); ctx.arc(0, 0, 110, 0, 7); ctx.fill(); }
    if (e.state === 'charge' && e.st > 0) { ctx.fillStyle = 'rgba(255,30,30,.25)'; ctx.save(); ctx.rotate(e.chargeA); ctx.fillRect(0, -e.r, 240, e.r * 2); ctx.restore(); }
    ctx.globalAlpha = 0.22 + Math.sin(t * 5) * 0.05; pxc(0, 0, r + 12, e.phase === 2 ? '#ff4020' : '#a03aff', 4); ctx.globalAlpha = 1;
  }
  let anim = 'idle', idx = Math.floor(e.t * 2.5) % 4, ox = 0, oy = 0;
  const ba = e.ai === 'boss' ? bossAnim(e, fx, fy) : null;
  if (e.flash > 0.04) { anim = 'hurt'; idx = 0; ox = -fx * 2; oy = -fy * 2; }
  else if (ba) ({ anim, idx, ox, oy } = ba);
  else if (e.strike > 0) { anim = e.ai === 'ranged' ? 'cast' : 'atk'; idx = e.ai === 'ranged' ? 2 : (e.strike > 0.12 ? 1 : 2); const k = Math.min(1, e.strike / 0.25); ox = fx * 5 * k; oy = fy * 5 * k; }
  else if (e.atk) { anim = e.ai === 'ranged' ? 'cast' : 'atk'; idx = e.ai === 'ranged' ? Math.min(1, Math.floor(tel * 2)) : 0; ox = -fx * 3 * tel + rand(-0.6, 0.6) * tel; oy = -fy * 3 * tel; }
  else if (e.mv > 0.4) { anim = 'walk'; idx = Math.floor(e.t * e.speed / 60 * 6) % 6; }
  const isSword = e.type === 'skeleton' || e.ai === 'boss', ss = e.ai === 'boss' ? 2.4 : 1;
  const swing = e.strike > 0 ? (0.25 - e.strike) * 8 - 1 : e.atk ? -1.1 - tel * 0.5 : 0.3;
  if (isSword && fy < 0) drawSword(fx * 8 + ox, fy * 8 + 2 + oy, face + swing, ss);
  drawChar(enemyKey(e), 0, r * 0.9 + (e.type === 'cultist' ? -4 : 0), { anim, idx, face, scale: enemyScale(e), flash: e.flash > 0, ox, oy });
  if (isSword && fy >= 0) drawSword(fx * 8 + ox, fy * 8 + 2 + oy, face + swing, ss);
  if (e.type === 'cultist' && e.atk) { pxc(fx * (r + 4), fy * (r + 4) - 6, 2 + tel * 6, '#c03aff', 2); }
  if (e.stun > 0) pxArc(0, -r - 22, 7, t * 8, t * 8 + 4, 3, '#ffe066');
  if (e.elite) { ctx.globalAlpha = 0.5 + Math.sin(t * 6) * 0.2; pxArc(0, 0, r + 6, 0, 6.283, 3, '#ffc83c'); ctx.globalAlpha = 1; }
  if (e.burn > 0) { ctx.fillStyle = 'rgba(255,120,20,.4)'; ctx.fillRect(-r, -r - 8, r * 2, r * 2 + 8); }
  if (e.ai !== 'boss' && e.hp < e.maxHp) { const bw = Math.round(r * 2); ctx.fillStyle = '#000'; ctx.fillRect(-r - 1, -r - 34, bw + 2, 6); ctx.fillStyle = e.elite ? '#e0a020' : '#c02020'; ctx.fillRect(-r, -r - 33, Math.round(bw * Math.max(0, e.hp / e.maxHp)), 4); }
  ctx.restore();
}

function drawPlayer(t) {
  const c = P.cls, id = c.id; ctx.save(); ctx.translate(Math.round(P.x), Math.round(P.y));
  const fx = Math.cos(P.face), fy = Math.sin(P.face), cd = c.atkCd / P.asMul, sw = P.atkT > 0 ? 1 - P.atkT / cd : -1, melee = id === 'knight' || id === 'ranger';
  shadow(0, 0, P.r + 2);
  let anim = 'idle', idx = Math.floor(P.animT * 2.5) % 4, ox = 0, oy = 0, rot = 0, sy = 1, showWeapon = true;
  if (P.dodgeT > 0) {
    const pr = 1 - P.dodgeT / 0.2, dir = P.dodgeDir.x >= 0 ? 1 : -1;
    rot = pr * Math.PI * 2 * dir; sy = 0.86; anim = 'hurt'; showWeapon = false; oy = -4;
    for (let i = 1; i <= 2; i++) drawChar(id, -P.dodgeDir.x * i * 11, P.r * 0.9 - P.dodgeDir.y * i * 11 - 4, { anim: 'hurt', idx: 0, face: P.face, rot: rot - dir * i * 0.7, alpha: 0.28 / i, sy });
  } else if (P.castT > 0) { anim = 'cast'; idx = Math.min(2, Math.floor((1 - P.castT / 0.4) * 3)); oy = idx === 1 ? -2 : 0; }
  else if (P.flash > 0.08) { anim = 'hurt'; idx = 0; ox = -fx * 3; oy = -fy * 3; }
  else if (sw >= 0 && sw < 1) {
    if (id === 'knight' || id === 'ranger') { anim = 'atk'; idx = [1, 2, 3, 3][Math.floor(sw * 4)]; } else { anim = 'cast'; idx = [1, 2, 2][Math.floor(sw * 3)]; }
    const k = Math.sin(clamp(sw / 0.45, 0, 1) * Math.PI); const lunge = id === 'knight' ? 6 : -2; ox = fx * lunge * k; oy = fy * lunge * k;
  } else if (P.moving) { anim = 'walk'; idx = Math.floor(P.animT * 12) % 6; }
  const swing = sw >= 0 ? Math.max(0, 1 - sw) : 0;
  const weapon = () => {
    if (!showWeapon) return;
    ctx.save(); ctx.translate(Math.round(fx * 8 + ox), Math.round(fy * 8 - 3 + oy)); ctx.rotate(P.face);
    if (id === 'knight') { ctx.restore(); drawSword(fx * 8 + ox, fy * 8 - 3 + oy, P.face + (sw >= 0 ? (sw - 0.5) * 2.8 * (sw < 0.5 ? -1 : 1) * 0.6 + (0.5 - sw) * 1.4 : -0.35), 1.5); ctx.save(); }
    else if (id === 'pyro' || id === 'necro') {
      ctx.fillStyle = id === 'pyro' ? '#5a3a1a' : '#4a4a3a'; ctx.fillRect(-4, -1, 30, 3); ctx.fillStyle = id === 'pyro' ? '#8a5a2a' : '#6a6a52'; ctx.fillRect(-4, -1, 30, 1);
      ctx.restore(); ctx.save(); ctx.translate(Math.round(fx * 8 + fx * 30 + ox), Math.round(fy * 8 - 3 + fy * 30 + oy));
      const pulse = swing > 0 ? 2 : 0;
      if (id === 'pyro') { pxc(0, 0, 6 + pulse + (Math.sin(t * 10) > 0 ? 1 : 0), '#ff7a1a', 2); pxc(0, 0, 3, '#ffe08a', 2); }
      else { pxc(0, 0, 5 + pulse, '#d8ffe8', 2); ctx.fillStyle = '#0a2a1a'; ctx.fillRect(-3, -2, 2, 2); ctx.fillRect(1, -2, 2, 2); ctx.fillRect(-1, 2, 2, 2); }
    } else {
      ctx.fillStyle = '#8a6a3a'; for (let a = -1.25; a <= 1.25; a += 0.25) ctx.fillRect(Math.round(8 + Math.cos(a) * 13 - 1) + (swing ? -2 : 0), Math.round(Math.sin(a) * 13 - 1), 3, 3);
      ctx.fillStyle = '#ddd'; ctx.fillRect(8 + (swing ? -6 : 0), -12, 1, 24); if (!swing) { ctx.fillStyle = '#d8e8c0'; ctx.fillRect(2, -1, 18, 2); }
    }
    ctx.restore();
  };
  ctx.globalAlpha = P.inv > 0 && P.dodgeT <= 0 && Math.floor(t * 20) % 2 ? 0.55 : 1;
  if (fy < -0.3) weapon();
  drawChar(id, 0, P.r * 0.9, { anim, idx, face: P.face, flash: P.flash > 0.12, ox, oy, rot, sy });
  if (fy >= -0.3) weapon();
  ctx.restore();
}

function drawAlly(a) {
  ctx.save(); ctx.translate(Math.round(a.x), Math.round(a.y)); shadow(0, 0, a.r);
  const mvd = Math.hypot(a.x - (a.lx === undefined ? a.x : a.lx), a.y - (a.ly === undefined ? a.y : a.ly)); a.lx = a.x; a.ly = a.y; a.mv = (a.mv || 0) * 0.85 + (mvd > 0.2 ? 0.15 : 0);
  const fx = Math.cos(a.face), fy = Math.sin(a.face), atk = a.cd > 0.45;
  ctx.globalAlpha = a.life < 2 ? 0.4 + Math.sin(G.time * 20) * 0.3 : 0.92;
  drawChar('minion', 0, a.r * 0.9, { anim: a.flash > 0 ? 'hurt' : atk ? 'atk' : a.mv > 0.4 ? 'walk' : 'idle', idx: atk ? (a.cd > 0.58 ? 1 : 2) : Math.floor(G.time * 9) % 6, face: a.face, flash: a.flash > 0, ox: atk ? fx * 3 : 0, oy: atk ? fy * 3 : 0 });
  drawSword(fx * 6, fy * 6, a.face + (atk ? 0.4 : 0.9), 0.8, 0.9); ctx.restore();
}

// ---------- Трупи й анімації смерті ----------
function makeCorpse(e, ang) {
  const kind = e.ai === 'boss' ? 'boss' : e.type;
  return { kind, key: enemyKey(e), x: e.x, y: e.y, r: e.r, face: e.face, scale: enemyScale(e), t: 0, dir: Math.cos(ang || 0) >= 0 ? 1 : -1, elite: e.elite, seed: Math.random() * 9,
    life: { skeleton: 8, ghoul: 7, cultist: 2.4, brute: 9, boss: 14 }[kind] || 7 };
}
function updateCorpse(c, dt) {
  const t0 = c.t; c.t += dt; const t = c.t, at = (x) => t0 < x && t >= x;
  if (c.kind === 'skeleton' || c.kind === 'minion') { if (at(0.18)) { burst(c.x, c.y - 8, c.kind === 'minion' ? '#9affd0' : '#dcd4bc', 18, 170, 3, 0.9); G.shake = Math.max(G.shake, 3); } }
  else if (c.kind === 'ghoul') { if (at(0.1)) burst(c.x, c.y, '#6a8a3a', 14, 110, 3, 0.7); }
  else if (c.kind === 'cultist') { if (t < 0.9 && Math.random() < dt * 60) parts.push({ x: c.x + rand(-10, 10), y: c.y - rand(0, 40) , vx: rand(-20, 20), vy: rand(-90, -30), life: 0.8, max: 0.8, size: 4, color: Math.random() < 0.5 ? '#c03aff' : '#5a2a70' }); }
  else if (c.kind === 'brute') { if (at(0.9)) { G.shake = Math.max(G.shake, 11); burst(c.x, c.y + 8, '#8a7a6a', 22, 190, 4, 0.8); effects.push({ k: 'ring', x: c.x, y: c.y + 6, r: 60, t: 0, life: 0.35, color: '#aaa' }); Sfx.play('slam'); } }
  else if (c.kind === 'boss') {
    if (t < 2.5 && Math.random() < dt * 45) parts.push({ x: c.x + rand(-26, 26), y: c.y + rand(-60, 10), vx: rand(-70, 70), vy: rand(-130, -40), life: 0.8, max: 0.8, size: 4, color: Math.random() < 0.5 ? '#c03aff' : '#ff4020' });
    if (t < 2.5 && Math.floor(t * 12) !== Math.floor(t0 * 12)) G.shake = Math.max(G.shake, 4);
    if (at(2.5)) { for (let i = 0; i < 3; i++) effects.push({ k: 'ring', x: c.x, y: c.y - 10, r: 140 + i * 50, t: -i * 0.12, life: 0.6, color: i % 2 ? '#ff4020' : '#c03aff' }); burst(c.x, c.y - 10, '#ffb0ff', 70, 330, 5, 1.2); burst(c.x, c.y - 10, '#ff6040', 50, 260, 4, 1); G.shake = 22; Sfx.play('boss'); }
  } else if (c.kind === 'human') { if (t < 1.8 && Math.random() < dt * 25) parts.push({ x: c.x + rand(-8, 8), y: c.y - rand(0, 14), vx: rand(-14, 14), vy: rand(-70, -30), life: 1.1, max: 1.1, size: 3, color: Math.random() < 0.6 ? '#ff9a3a' : '#ffd24a' }); }
}
function bonePile(c, minion) {
  const lt = minion ? '#9affd0' : '#dcd4bc', dk = minion ? '#4aaa80' : '#9a927c', r = c.r * 0.9;
  ctx.fillStyle = dk; ctx.fillRect(-9, r - 6, 18, 4); ctx.fillRect(-6, r - 9, 12, 3);
  ctx.fillStyle = lt; ctx.fillRect(-10, r - 5, 8, 2); ctx.fillRect(2, r - 4, 8, 2); ctx.fillRect(-4, r - 8, 8, 2); ctx.fillRect(6, r - 9, 5, 2); ctx.fillRect(-12, r - 3, 3, 2);
  ctx.fillRect(-2, r - 13, 8, 6); ctx.fillStyle = dk; ctx.fillRect(-2, r - 8, 8, 1); ctx.fillStyle = '#14100c'; ctx.fillRect(0, r - 11, 2, 2); ctx.fillRect(4, r - 11, 2, 2);
}
function drawCorpse(c) {
  const t = c.t, r = c.r, gy = r * 0.9, fade = t > c.life - 1.5 ? Math.max(0, (c.life - t) / 1.5) : 1, dir = c.dir, o = { anim: 'hurt', idx: 0, face: c.face, scale: c.scale };
  ctx.save(); ctx.translate(Math.round(c.x), Math.round(c.y)); ctx.globalAlpha = fade;
  switch (c.kind) {
    case 'skeleton': case 'minion':
      if (t < 0.22) drawChar(c.key, 0, gy, { ...o, flash: t < 0.1, ox: -dir * t * 26, rot: -dir * t * 1.6 });
      else bonePile(c, c.kind === 'minion');
      break;
    case 'ghoul': {
      const k = ease(t / 0.8); ctx.fillStyle = '#3a5a22'; const w = 6 + k * 18; ctx.fillRect(-w, gy - 4, w * 2, 6); ctx.fillStyle = '#5a7a34'; ctx.fillRect(-w + 3, gy - 5, w * 2 - 6, 2);
      if (k < 1) drawChar(c.key, 0, gy, { ...o, flash: t < 0.1, sy: 1 - 0.85 * k, sx: 1 + 0.4 * k, alpha: 1 - k * 0.6 });
      break; }
    case 'cultist': {
      const k = clamp(t / 0.85, 0, 0.92); drawChar(c.key, rand(-1, 1) * (1 - k), gy - 4, { ...o, cut: k, flash: t < 0.1, alpha: 1 - k * 0.3 });
      break; }
    case 'brute': {
      if (t < 0.3) drawChar(c.key, 0, gy, { ...o, flash: t < 0.12, ox: -dir * t * 14 + rand(-1, 1) });
      else { const k = ease((t - 0.3) / 0.65); drawChar(c.key, -dir * 5 * k, gy, { ...o, rot: dir * k * Math.PI / 2, sy: 1 - 0.12 * k }); }
      break; }
    case 'boss': {
      if (t < 2.5) { const k = t / 2.5; drawChar(c.key, 0, gy, { ...o, flash: Math.floor(t * 9) % 2 === 0, ox: Math.sin(t * 70) * 3 * k, sy: 1 - 0.08 * ease(k), rot: dir * 0.05 * k }); }
      else { ctx.fillStyle = '#1a1420'; ctx.fillRect(-26, gy - 5, 52, 8); ctx.fillStyle = '#2a2030'; ctx.fillRect(-18, gy - 8, 36, 4); ctx.fillStyle = '#e0b040'; ctx.fillRect(-7, gy - 12, 14, 5); ctx.fillStyle = '#ffe08a'; ctx.fillRect(-7, gy - 12, 14, 1); [-6, -2, 2, 5].forEach((x) => ctx.fillRect(x, gy - 15, 2, 3)); }
      break; }
    default: { // людина (герой)
      if (t < 0.25) drawChar(c.key, 0, gy, { ...o, flash: t < 0.12, ox: -dir * t * 20 });
      else { const k = ease((t - 0.25) / 0.55); drawChar(c.key, -dir * 6 * k, gy, { ...o, rot: dir * k * Math.PI / 2, sy: 1 - 0.1 * k }); }
    }
  }
  ctx.restore();
}

function drawWorld(t) {
  const sh = G.shake, sx = Math.round(W / 2 - cam.x + rand(-sh, sh)), sy = Math.round(H / 2 - cam.y + rand(-sh, sh));
  ctx.save(); ctx.translate(sx, sy);
  drawTiles();
  props.filter((p) => p.type !== 'npc' && p.type !== 'portal' && p.type !== 'bonfire' && p.type !== 'scroll').forEach((p) => drawProp(p, t));
  props.filter((p) => ['npc', 'portal', 'bonfire', 'scroll'].includes(p.type)).forEach((p) => drawProp(p, t));
  pickups.forEach((p) => {
    const by = Math.round(p.y + Math.sin(p.t * 6) * 2), bx = Math.round(p.x);
    if (p.type === 'soul') { ctx.fillStyle = 'rgba(120,220,255,.25)'; ctx.fillRect(bx - 6, by - 6, 12, 12); ctx.fillStyle = '#7adcff'; ctx.fillRect(bx - 3, by - 3, 6, 6); ctx.fillStyle = '#eaffff'; ctx.fillRect(bx - 1, by - 1, 2, 2); }
    else { ctx.fillStyle = '#ddd'; ctx.fillRect(bx - 2, by - 9, 4, 4); ctx.fillStyle = '#7a1a34'; ctx.fillRect(bx - 5, by - 5, 10, 10); ctx.fillStyle = '#d0304e'; ctx.fillRect(bx - 4, by - 4, 8, 6); ctx.fillStyle = '#ff90a0'; ctx.fillRect(bx - 3, by - 3, 2, 2); }
  });
  corpses.forEach(drawCorpse);
  const list = [...enemies.map((e) => ({ y: e.y, f: () => drawEnemy(e, t) })), ...allies.map((a) => ({ y: a.y, f: () => drawAlly(a) })), { y: P.y, f: () => (G.pcorpse ? drawCorpse(G.pcorpse) : drawPlayer(t)) }].sort((a, b) => a.y - b.y);
  list.forEach((o) => o.f());
  effects.forEach((e) => {
    if (e.t < 0) return; const k = e.t / e.life;
    if (e.k === 'ring') { ctx.globalAlpha = 1 - k; pxArc(e.x, e.y, e.r * (0.2 + k * 0.8), 0, 6.283, 4 - Math.round(k * 2), e.color); ctx.fillStyle = e.color; ctx.globalAlpha = (1 - k) * 0.12; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.2 + k * 0.8), 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    else if (e.k === 'slash') { ctx.globalAlpha = 1 - k; pxArc(e.x, e.y, e.r * 0.85, e.a - e.arc / 2 + k * 0.6, e.a + e.arc / 2 - 0.2 + k * 0.6, 5 - Math.round(k * 3), '#fff'); ctx.globalAlpha = 1; }
  });
  projs.forEach((p) => {
    if (p.arrow) { ctx.fillStyle = p.color; ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y)); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.fillRect(-10, -1, 16, 2); ctx.fillStyle = '#fff'; ctx.fillRect(4, -2, 4, 4); ctx.restore(); }
    else { pxc(p.x, p.y, p.r + 1, p.color, 2); pxc(p.x, p.y, Math.max(2, p.r * 0.5), '#fff', 2); }
  });
  parts.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; const sz = Math.max(2, Math.round(p.size / 2) * 2); ctx.fillRect(Math.round(p.x / 2) * 2, Math.round(p.y / 2) * 2, sz, sz); }); ctx.globalAlpha = 1;
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
  ctx.imageSmoothingEnabled = true; ctx.drawImage(lightCv, 0, 0, W, H); ctx.imageSmoothingEnabled = false;
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
  const us = clamp(Math.min(W / 1280, H / 720), 0.85, 2.2), vw = W / us, vh = H / us;
  ctx.save(); ctx.scale(us, us);
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
    { k: 'ПКМ', n: 'Здібність', v: 1 - Math.max(0, P.abT) / (P.cls.ability.cd * (1 - P.cdr)), ic: '✨' },
    { k: '␣', n: 'Ухил.', v: 1 - Math.max(0, P.dodgeCdT) / (P.cls.dodgeCd * P.dodgeMul), ic: '💨' },
    { k: 'F', n: 'Зілля ×' + P.potions, v: P.potions > 0 ? 1 : 0, ic: '🧪' },
  ];
  slots.forEach((s, i) => {
    const x = vw / 2 - 150 + i * 80, y = vh - 78;
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x, y, 64, 64); ctx.strokeStyle = s.v >= 1 ? '#c9a35a' : '#443'; ctx.lineWidth = 2; ctx.strokeRect(x, y, 64, 64);
    ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.globalAlpha = s.v >= 1 ? 1 : 0.4; ctx.fillText(s.ic, x + 32, y + 38); ctx.globalAlpha = 1;
    if (s.v < 1) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x, y + 64 * s.v, 64, 64 * (1 - s.v)); }
    ctx.font = '11px Georgia'; ctx.fillStyle = '#c9a35a'; ctx.fillText(s.k, x + 32, y - 4); ctx.fillStyle = '#aaa'; ctx.fillText(s.n, x + 32, y + 58);
  });
  ctx.textAlign = 'left';
  // Мінікарта
  const mw = map.w * 3, mh = map.h * 3, mx = vw - mw - 16, my = 16;
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (explored[y * map.w + x]) { ctx.fillStyle = map.t[y * map.w + x] ? '#2a2630' : '#5a5060'; ctx.fillRect(mx + x * 3, my + y * 3, 3, 3); }
  ctx.fillStyle = '#ffd24a'; ctx.fillRect(mx + (P.x / TS) * 3 - 2, my + (P.y / TS) * 3 - 2, 4, 4);
  enemies.forEach((e) => { const tx = Math.floor(e.x / TS), ty = Math.floor(e.y / TS); if (explored[ty * map.w + tx] && (e.aggro || e.elite)) { ctx.fillStyle = e.elite ? '#ff9020' : '#e03030'; ctx.fillRect(mx + (e.x / TS) * 3 - 1, my + (e.y / TS) * 3 - 1, 3, 3); } });
  // Ціль
  ctx.textAlign = 'center'; ctx.font = '15px Georgia';
  const cfg = LEVELS[G.level];
  ctx.fillStyle = 'rgba(217,207,192,.85)';
  ctx.fillText(cfg.boss ? 'Здолай Короля Мальгората' : G.portalOpen ? 'Знайди портал' : `Знайди й здолай: ${cfg.elite.name}`, vw / 2, 26);
  // Босс-бар
  if (G.boss && G.boss.aggro && !G.boss.dead) {
    const bw2 = Math.min(600, vw - 80), bx = vw / 2 - bw2 / 2, by = vh - 108;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx - 3, by - 3, bw2 + 6, 20); ctx.fillStyle = '#2a0a12'; ctx.fillRect(bx, by, bw2, 14);
    ctx.fillStyle = G.boss.phase === 2 ? '#e03018' : '#a02a6a'; ctx.fillRect(bx, by, bw2 * Math.max(0, G.boss.hp / G.boss.maxHp), 14);
    ctx.fillStyle = '#e0c080'; ctx.font = '13px Georgia'; ctx.fillText(G.boss.name, vw / 2, by - 8);
  }
  // Елітний бар
  enemies.forEach((e) => { if (e.elite && e.aggro) { const bw2 = Math.min(400, vw - 80), bx = vw / 2 - bw2 / 2, by = 46; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx - 2, by - 2, bw2 + 4, 12); ctx.fillStyle = '#e0a020'; ctx.fillRect(bx, by, bw2 * Math.max(0, e.hp / e.maxHp), 8); ctx.font = '12px Georgia'; ctx.fillStyle = '#e0c080'; ctx.fillText(e.name, vw / 2, by + 24); } });
  // Підказка взаємодії
  if (G.near && G.state === 'play') { ctx.font = '16px Georgia'; ctx.fillStyle = '#ffe08a'; ctx.fillText('[E] ' + (G.near.dyn ? G.near.dyn() : G.near.label), vw / 2, vh / 2 + 60); }
  // Повідомлення
  if (G.msgT > 0) { ctx.globalAlpha = Math.min(1, G.msgT); ctx.font = 'italic 20px Georgia'; ctx.fillStyle = '#e8d8b0'; ctx.fillText(G.msg, vw / 2, 110); ctx.globalAlpha = 1; }
  // Плаваючий текст
  ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.translate(sx, sy);
  texts.forEach((tx) => { ctx.globalAlpha = 1 - tx.t; ctx.font = (tx.big ? 'bold 20px' : '14px') + ' Georgia'; ctx.fillStyle = '#000'; ctx.fillText(tx.text, tx.x + 1, tx.y + 1); ctx.fillStyle = tx.color; ctx.fillText(tx.text, tx.x, tx.y); }); ctx.globalAlpha = 1; ctx.restore();
  // Заголовок рівня
  if (G.titleT > 0) {
    const a = Math.min(1, G.titleT, (3.5 - G.titleT) * 2); ctx.globalAlpha = a; ctx.fillStyle = '#c9a35a'; ctx.font = '16px Georgia'; ctx.fillText(cfg.sub.toUpperCase(), vw / 2, vh * 0.3 - 30);
    ctx.font = 'bold 44px Georgia'; ctx.fillStyle = '#d9cfc0'; ctx.shadowColor = '#000'; ctx.shadowBlur = 12; ctx.fillText(cfg.name, vw / 2, vh * 0.3 + 14); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
  ctx.restore();
}

// ---------- Фон головного меню: піксельна сцена ----------
const MENU = {
  stars: Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random() * 0.5, s: Math.random() < 0.12 ? 3 : 2, p: Math.random() * 6 })),
  emb: Array.from({ length: 90 }, () => ({ p: Math.random(), v: rand(0.1, 0.28), dx: rand(-1, 1), r: Math.random() < 0.3 ? 4 : 2, c: Math.random() })),
  cr: Array.from({ length: 30 }, () => ({ p: Math.random(), v: rand(0.12, 0.3), dx: rand(-1, 1) })),
  trees: [0.1, 0.27, 0.92].map((x, i) => ({ x, h: [15, 10, 13][i], s: i % 2 ? 1 : -1 })),
  flashT: 0, nextFlash: 4, lt: 0, hlHero: null, hlCard: null, overUI: false, leaving: false, leaveT: 0, heroes: [], active: true,
};
function menuRidge(base, amp, seed, col, px, step = 4) {
  ctx.fillStyle = col;
  for (let x = -8; x < W + 8; x += step) {
    const h = base + amp * (Math.sin((x + px) * 0.004 + seed) + 0.55 * Math.sin((x + px) * 0.011 + seed * 2) + 0.25 * Math.sin((x + px) * 0.029 + seed * 3));
    ctx.fillRect(x, Math.round(h), step, H - h + 2);
  }
}
function menuRoof(R, x, w, top, c) { for (let r = 0; r < w; r++) R(x + r * 0.5, top + (r + 1) * 1.4, w - r, 1.5, c); }
function menuCastle(cx, gy, u, t, fl, pal) {
  const R = (x, top, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(cx + x * u), Math.round(gy - top * u), Math.max(1, Math.round(w * u)), Math.max(1, Math.round(h * u))); };
  const body = pal ? pal.body : fl > 0 ? '#1a1630' : '#0b0610', edge = pal ? pal.edge : fl > 0 ? '#6a6a9a' : '#241632';
  R(-8, 16, 16, 16, body); for (let i = 0; i < 8; i++) R(-8 + i * 2, 17.3, 1, 1.4, body);
  R(-14, 26, 6, 26, body); menuRoof(R, -14, 6, 26, body);
  R(8, 34, 6, 34, body); menuRoof(R, 8, 6, 34, body);
  R(-2.5, 38, 5, 38, body); menuRoof(R, -2.5, 5, 38, body);
  R(-24, 9, 9, 9, body); R(-24, 11, 2, 2, body); R(-20, 12, 2, 3, body); R(-17, 10, 2, 1, body); R(14, 12, 8, 12, body); R(20, 15, 2, 3, body);
  [[-14, 26, 26], [-8, 16, 16], [-2.5, 38, 38], [8, 34, 34], [-24, 9, 9]].forEach(([x, top, h]) => R(x, top, 0.35, h, edge));
  [[-5.5, 12], [3.5, 12], [-12, 21], [10.5, 28], [-1, 32], [-1, 24]].forEach(([x, y], i) => {
    const f = 0.65 + Math.sin(t * 5 + i * 2.1) * 0.2 + (Math.sin(t * 13 + i) > 0.9 ? -0.3 : 0);
    R(x, y, 1, 1.7, `rgba(255,${150 + i * 8},50,${f})`); R(x - 0.2, y + 0.2, 1.4, 2.1, `rgba(255,140,40,${f * 0.18})`);
  });
}
function menuTree(x, gy, h, s, u, col) {
  ctx.fillStyle = col; const tw = Math.max(2, Math.round(u * 0.8)); ctx.fillRect(Math.round(x), gy - h * u, tw, h * u + 2);
  [[0.9, 3, 1], [0.7, 4, -1], [0.5, 3, 1], [0.35, 4, -1]].forEach(([f, n, d]) => {
    const dir = d * s; for (let i = 0; i < n * 2; i++) ctx.fillRect(Math.round(x + dir * i * u * 0.55), Math.round(gy - h * u * f - i * u * 0.4), Math.max(2, Math.round(u * 0.6)), Math.max(2, Math.round(u * 0.6)));
    for (let k = 0; k < 2; k++) ctx.fillRect(Math.round(x + dir * (n * 2 - 2 + k * 2) * u * 0.55), Math.round(gy - h * u * f - (n * 2 - 3 - k * 2) * u * 0.4 - u), Math.max(2, Math.round(u * 0.5)), Math.max(2, Math.round(u * 0.5)));
  });
}
function drawMenuScene(t) {
  const dt = Math.min(0.05, t - MENU.lt); MENU.lt = t;
  const mx = clamp(Input.mouse.x / W - 0.5, -0.5, 0.5), unit = Math.max(4, Math.round(H / 90));
  if (t > MENU.nextFlash) { MENU.flashT = 0.45; MENU.nextFlash = t + rand(9, 16); Sfx.noise(1.4, 0.18, 140); }
  MENU.flashT -= dt; const fl = MENU.flashT > 0 && Math.sin(MENU.flashT * 38) > -0.2 ? MENU.flashT / 0.45 : 0;
  // небо
  const sk = ctx.createLinearGradient(0, 0, 0, H * 0.8); sk.addColorStop(0, '#04020a'); sk.addColorStop(0.5, '#160a1e'); sk.addColorStop(0.86, '#3c1216'); sk.addColorStop(1, '#5a2012');
  ctx.fillStyle = sk; ctx.fillRect(0, 0, W, H);
  if (fl > 0) { ctx.fillStyle = `rgba(190,180,255,${fl * 0.34})`; ctx.fillRect(0, 0, W, H * 0.85); }
  MENU.stars.forEach((s) => { ctx.fillStyle = `rgba(255,240,220,${0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.6 + s.p))})`; ctx.fillRect(Math.round(s.x * W - mx * 8), Math.round(s.y * H), s.s, s.s); });
  // місяць
  const mr = Math.max(26, Math.round(H * 0.075 / 4) * 4), mcx = W * 0.17 - mx * 14, mcy = H * 0.22;
  const mg = ctx.createRadialGradient(mcx, mcy, mr * 0.8, mcx, mcy, mr * 4); mg.addColorStop(0, 'rgba(200,190,255,.28)'); mg.addColorStop(1, 'rgba(200,190,255,0)'); ctx.fillStyle = mg; ctx.fillRect(mcx - mr * 4, mcy - mr * 4, mr * 8, mr * 8);
  pxc(mcx, mcy, mr, '#e6e0d0', 4); pxc(mcx + mr * 0.3, mcy - mr * 0.2, mr * 0.28, '#c8c0b0', 4); pxc(mcx - mr * 0.35, mcy + mr * 0.3, mr * 0.2, '#c8c0b0', 4); pxc(mcx - mr * 0.2, mcy - mr * 0.45, mr * 0.14, '#d0c8b8', 4);
  // гори, замок, Корона
  menuRidge(H * 0.6, H * 0.05, 1.3, '#120817', -mx * 18);
  menuRidge(H * 0.69, H * 0.05, 4.1, '#0d0612', -mx * 34);
  const cu = unit * 0.85, ccx = W * 0.82 - mx * 46, cgy = H * 0.77;
  ctx.fillStyle = '#09040d'; ctx.fillRect(ccx - 30 * cu, cgy - 1, 60 * cu, H);
  menuCastle(ccx, cgy, cu, t, fl);
  const crx = ccx, cry = cgy - 49 * cu + Math.sin(t * 1.4) * cu * 0.7, pu = Math.max(2, Math.round(cu * 0.8));
  const ag = ctx.createRadialGradient(crx, cry, 4, crx, cry, cu * 20); ag.addColorStop(0, `rgba(255,160,60,${0.5 + Math.sin(t * 3) * 0.1})`); ag.addColorStop(0.35, 'rgba(180,60,255,.22)'); ag.addColorStop(1, 'rgba(120,40,200,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = ag; ctx.fillRect(crx - cu * 20, cry - cu * 20, cu * 40, cu * 40); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#e0b040'; ctx.fillRect(crx - 5 * pu, cry, 10 * pu, 2 * pu); [-4, -2, 0, 2, 4].forEach((o, i) => ctx.fillRect(crx + (o - 0.5) * pu, cry - (i % 2 ? 2 : 4) * pu, pu, (i % 2 ? 2 : 4) * pu));
  ctx.fillStyle = '#ffe08a'; ctx.fillRect(crx - 5 * pu, cry, 10 * pu, pu * 0.6); ctx.fillStyle = '#c03aff'; ctx.fillRect(crx - pu * 0.7, cry + pu * 0.3, pu * 1.4, pu * 1.4);
  for (let i = 0; i < 5; i++) { const a = t * 1.3 + i * 1.256; ctx.fillStyle = i % 2 ? '#ff9a3a' : '#d080ff'; ctx.fillRect(Math.round(crx + Math.cos(a) * pu * 9), Math.round(cry + pu + Math.sin(a) * pu * 3), pu, pu); }
  MENU.cr.forEach((p) => { const k = (t * p.v + p.p) % 1; ctx.fillStyle = `rgba(${p.dx > 0 ? '255,160,60' : '200,110,255'},${1 - k})`; ctx.fillRect(Math.round(crx + p.dx * k * pu * 9), Math.round(cry - k * pu * 14), 3, 3); });
  // туман
  [[0.66, 0.5, 0.07, 14], [0.78, 0.8, 0.09, 24], [0.9, 1.2, 0.1, 36]].forEach(([yy, sp, a, ph], li) => {
    for (let i = 0; i < 6; i++) {
      const x = ((i * W / 4 + t * 14 * sp * (li + 1) + ph * 40) % (W + 500)) - 250 - mx * (30 + li * 20), y = H * yy + Math.sin(t * 0.3 + i + li) * 6;
      ctx.save(); ctx.translate(x, y); ctx.scale(4, 1); const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, H * 0.16); fg.addColorStop(0, `rgba(150,130,170,${a})`); fg.addColorStop(1, 'rgba(150,130,170,0)'); ctx.fillStyle = fg; ctx.fillRect(-H * 0.16, -H * 0.16, H * 0.32, H * 0.32); ctx.restore();
    }
  });
  // передній план: гора, дерева
  menuRidge(H * 0.84, H * 0.012, 7.7, '#07030a', -mx * 60);
  MENU.trees.forEach((tr) => menuTree(tr.x * W - mx * 70, H * 0.86, tr.h, tr.s, unit * 0.9, '#050208'));
  ctx.fillStyle = '#050208'; ctx.fillRect(0, Math.round(H * 0.86), W, H);
  for (let i = 0; i < 60; i++) { const h = hash2(i, 7); ctx.fillStyle = h > 0.5 ? '#0b0612' : '#0f0a16'; ctx.fillRect(Math.round(h * W), Math.round(H * 0.87 + hash2(i, 3) * H * 0.12), 6 + (i % 3) * 4, 2); }
  // вогнище і герої
  const fx = W / 2, fy = H * 0.945, sc = Math.max(3, Math.round(H / 180)), sp = clamp(W * 0.1, 64, 190);
  ctx.save(); ctx.translate(fx, fy); ctx.scale(Math.max(2, Math.round(sc * 0.8)), Math.max(2, Math.round(sc * 0.8))); drawProp({ type: 'bonfire', x: 0, y: 0 }, t); ctx.restore();
  // герої: позиції, наведення, підсвічування
  const pos = CLASSES.map((c, i) => ({ x: fx + [-3, -1.5, 1.5, 3][i] * sp, y: fy }));
  MENU.active = !$('#menu').classList.contains('hidden') || !$('#classes').classList.contains('hidden');
  let hit = null;
  if (MENU.active && !MENU.overUI && !MENU.leaving && !G.fading) pos.forEach((p, i) => { if (Math.abs(Input.mouse.x - p.x) < 8 * sc && Input.mouse.y < p.y + 6 && Input.mouse.y > p.y - 25 * sc) hit = i; });
  if (hit !== MENU.hlHero) { MENU.hlHero = hit; if (hit !== null) Sfx.tone(660, 0.07, 'triangle', 0.04, 220); document.body.style.cursor = hit !== null ? 'pointer' : ''; syncHeroCards(); }
  const hlI = MENU.hlHero !== null ? MENU.hlHero : MENU.hlCard, selI = selClass ? CLASSES.indexOf(selClass) : -1, inCls = !$('#classes').classList.contains('hidden');
  CLASSES.forEach((c, i) => {
    const p = pos[i], left = i < 2, isHl = hlI === i, isSel = selI === i, hop = isHl ? Math.abs(Math.sin(t * 7)) * sc * 1.1 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(Math.round(p.x - 6 * sc), Math.round(fy - 2), 12 * sc, sc * 2);
    if (isSel) { ctx.fillStyle = `rgba(201,163,90,${0.55 + Math.sin(t * 4) * 0.2})`; ctx.fillRect(Math.round(p.x - 8 * sc), Math.round(fy - 1), 16 * sc, Math.max(2, sc * 0.6)); }
    if (isHl || isSel) {
      const gr = ctx.createRadialGradient(p.x, fy - 12 * sc, 4, p.x, fy - 12 * sc, 22 * sc), cc = isHl ? c.accent : '#c9a35a', n = parseInt(cc.slice(1), 16);
      gr.addColorStop(0, `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${isHl ? 0.5 : 0.28})`); gr.addColorStop(1, `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},0)`);
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(p.x - 22 * sc, fy - 36 * sc, 44 * sc, 44 * sc); ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = hlI !== null && !isHl && !isSel ? 0.55 : 1;
    drawChar(c.id, p.x, fy - hop, { anim: 'idle', idx: Math.floor(t * (isHl ? 4 : 2.2) + i * 1.3) % 4, face: isHl ? Math.PI / 2 : left ? 0.2 : Math.PI - 0.2, scale: sc, outline: isHl ? c.accent : isSel ? '#c9a35a' : null, outlineA: 0.75 + Math.sin(t * 8) * 0.25 });
    ctx.globalAlpha = 1;
    if (isHl) {
      ctx.textAlign = 'center'; const ty = fy - 25 * sc - 30 - hop;
      ctx.font = `700 ${Math.max(16, Math.round(sc * 5))}px Cinzel, Georgia, serif`; ctx.fillStyle = '#000'; ctx.fillText(c.name, p.x + 2, ty + 2); ctx.fillStyle = c.accent; ctx.fillText(c.name, p.x, ty);
      ctx.font = `italic ${Math.max(12, Math.round(sc * 3.2))}px Georgia, serif`; ctx.fillStyle = '#d9cfc0'; ctx.fillText(c.title + ' · ' + c.style, p.x, ty + Math.max(16, sc * 4.2));
      ctx.font = `${Math.max(11, Math.round(sc * 2.8))}px Georgia, serif`; ctx.fillStyle = '#c9a35a'; ctx.fillText(inCls ? (isSel ? '✔ обрано' : 'клікни, щоб обрати') : 'клікни, щоб вибрати героя', p.x, ty + Math.max(32, sc * 8)); ctx.textAlign = 'left';
    } else if (isSel) { ctx.fillStyle = '#ffd24a'; const dy = fy - 25 * sc - 10 + Math.sin(t * 4) * 3; ctx.fillRect(Math.round(p.x - 4), Math.round(dy), 8, 8); ctx.fillStyle = '#7a5a1a'; ctx.fillRect(Math.round(p.x - 2), Math.round(dy + 2), 4, 4); }
  });
  const oh = Math.ceil(H * 0.36), oy = H - oh;
  if (!MENU.o || MENU.o.width !== W || MENU.o.height !== oh) {
    MENU.o = document.createElement('canvas'); MENU.o.width = W; MENU.o.height = oh; const g = MENU.o.getContext('2d');
    const dg = g.createRadialGradient(fx, fy - 30 - oy, 40, fx, fy - 30 - oy, W * 0.42); dg.addColorStop(0, 'rgba(4,2,8,0)'); dg.addColorStop(1, 'rgba(4,2,8,.62)'); g.fillStyle = dg; g.fillRect(0, 0, W, oh);
    g.globalCompositeOperation = 'destination-in'; const vg = g.createLinearGradient(0, 0, 0, oh * 0.5); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = vg; g.fillRect(0, 0, W, oh);
  }
  ctx.drawImage(MENU.o, 0, oy);
  const fg2 = ctx.createRadialGradient(fx, fy - 20, 10, fx, fy - 20, W * 0.3 + Math.sin(t * 9) * 12); fg2.addColorStop(0, `rgba(255,140,50,${0.42 + Math.sin(t * 13) * 0.06})`); fg2.addColorStop(1, 'rgba(255,100,20,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = fg2; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
  MENU.emb.forEach((e) => { const k = (t * e.v + e.p) % 1, x = fx + e.dx * k * W * 0.12 + Math.sin(t * 2 + e.p * 9) * 8 * k, y = fy - 30 - k * H * 0.5; ctx.fillStyle = `rgba(255,${110 + e.c * 120 | 0},40,${(1 - k) * 0.9})`; ctx.fillRect(Math.round(x), Math.round(y), e.r, e.r); });
}

function drawMenuBg(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (MENU.leaving) { const k = ease((t - MENU.leaveT) / 1.15), s0 = 1 + 0.5 * k; ctx.translate(W / 2, H * 0.88); ctx.scale(s0, s0); ctx.translate(-W / 2, -H * 0.88); }
  drawMenuScene(t);
  ctx.restore();
}

let last = performance.now(), clock = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.imageSmoothingEnabled = false;
  if (G.state === 'cine') { Cine.frame(dt); Input.endFrame(); requestAnimationFrame(frame); return; }
  if (G.state === 'menu' || !map) drawMenuBg(clock);
  else {
    if (G.state === 'play') update(dt);
    else if (G.state === 'dead') tickFx(dt);
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
