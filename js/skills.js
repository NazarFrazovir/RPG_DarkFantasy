'use strict';
// ===== БОЙОВІ ГАЧКИ ТАЛАНТІВ: статуси, зони, пастки, слуги, здібності підкласів =====
// Читає P.m (див. talents.js → recalcPlayer). Викликається з game.js у ключових місцях бою.

let zones = [], traps = [];
const free = (x, y) => !hitsWall(x, y, P.r * 0.85);
const edm = (e) => e.dmg * (e.weakT > 0 ? e.weakV : 1); // шкода ворога з урахуванням послаблення

// ---------- Допоміжне ----------
function heal(amt) { if (amt <= 0) return; const h = Math.min(P.maxHp - P.hp, amt); if (h > 0.5) { P.hp += h; dmgFloat(P.x, P.y - 22, '+' + Math.round(h), '#55ff88', false); } else P.hp = Math.min(P.maxHp, P.hp + h); }
function mouseWorld() { return { x: Input.mouse.x - W / 2 + cam.x, y: Input.mouse.y - H / 2 + cam.y }; }
function ignite(e, t = 3.5) {
  if (e.dead || e.dummy) return; const was = e.burn > 0; e.burn = Math.max(e.burn, t);
  if (!was && P.m.burnSpread) enemies.forEach((o) => { if (o !== e && !o.dead && !o.dummy && !(o.burn > 0) && dist(o, e) < 60) o.burn = 2.5; });
}
function dotDamage(e, amt) { e.hp -= amt; if (e.hp <= 0) killEnemy(e); }
// вибух із шкодою «як є» (без повторного множення бонусами гравця): amount — підсумкова шкода
function boom(x, y, r, amount, o = {}) {
  if (G.boomDepth > 2) return; G.boomDepth = (G.boomDepth || 0) + 1;
  effects.push({ k: 'ring', x, y, r, t: 0, life: 0.3, color: o.color || '#ff8a2a' }); burst(x, y, o.color || '#ff8a2a', 14, 150, 3.5, 0.5);
  enemies.slice().forEach((e) => { if (e.dead || e.dummy || dist({ x, y }, e) > r + e.r) return; hitEnemy(e, amount / P.dmgMul, angTo({ x, y }, e), 50, { noExtra: true }); if (o.burn) ignite(e, 3); if (o.stun && e.ai !== 'boss') e.stun = Math.max(e.stun, o.stun); });
  G.boomDepth--;
}
function pushZone(o) { zones.push(Object.assign({ x: P.x, y: P.y, r: 80, t: 0, life: 4, slow: 0, weak: 0, dps: 0, burn: false, block: false, follow: false, color: '#9a8aa8' }, o)); }

// ---------- Статуси ворогів ----------
function statusTick(e, dt) {
  if (e.bleedT > 0) { e.bleedT -= dt; dotDamage(e, e.bleedDps * dt); if (Math.random() < dt * 6) parts.push({ x: e.x + rand(-5, 5), y: e.y + rand(-5, 5), vx: 0, vy: 20, life: 0.4, max: 0.4, size: 2, color: '#c02030' }); }
  if (!e.dead && e.poisT > 0) { e.poisT -= dt; dotDamage(e, e.poisDps * dt); if (Math.random() < dt * 5) parts.push({ x: e.x + rand(-5, 5), y: e.y + rand(-5, 5), vx: 0, vy: -15, life: 0.4, max: 0.4, size: 2, color: '#6adf5a' }); }
  ['markT', 'ashT', 'weakT', 'slowT'].forEach((k) => { if (e[k] > 0) e[k] -= dt; });
  return e.dead;
}
function enemySpeedMul(e) {
  let s = 0; if (e.slowT > 0) s = Math.max(s, e.slowV || 0); if (e.burn > 0 && P.m.burnSlow) s = Math.max(s, P.m.burnSlow); s = Math.max(s, e.zs || 0);
  if (e.ai === 'boss') s *= 0.5; return 1 - clamp(s, 0, 0.7);
}
// Накладання ефектів при влучанні (після шкоди)
function onHitStatus(e, dmg, crit, opt) {
  const m = P.m; if (e.dead || e.dummy) return;
  if (m.bleed && opt.melee !== false) { e.bleedT = 3; e.bleedDps = Math.max(e.bleedDps || 0, dmg * m.bleed / 3); }
  if (m.poison && opt.ranged) { e.poisT = 4; e.poisDps = Math.max(e.poisDps || 0, dmg * m.poison / 4); }
  if (m.burnOn && Math.random() < m.burnOn) ignite(e, 3);
  if (m.slowOn && opt.ranged) { e.slowT = 2; e.slowV = m.slowOn; }
  if (m.markOn && !(e.markT > 0)) { e.markT = 5; e.markV = m.markOn; }
  if (m.critMark && crit) { e.markT = 3; e.markV = Math.max(e.markV || 0, m.critMark); }
  if (m.weakOn && e.ai !== 'boss') { e.weakT = 4; e.weakV = m.weakOn; }
  if (m.ashMark) { e.ashT = 4; e.ashV = m.ashMark; }
  if (P.parryT > 0 && opt.melee !== false) { if (e.ai !== 'boss') e.stun = Math.max(e.stun, m.parry); P.parryT = 0; }
  if (m.deathMark && (e.elite || e.ai === 'boss')) { e.dmarks = (e.dmarks || 0) + 1; if (e.dmarks >= 5) { e.dmarks = 0; const ex = e.maxHp * 0.15; e.hp -= ex; dmgFloat(e.x, e.y - 30, Math.round(ex), '#ff2a2a', true); effects.push({ k: 'ring', x: e.x, y: e.y, r: 44, t: 0, life: 0.3, color: '#ff2a2a' }); if (e.hp <= 0) killEnemy(e); } }
}

// ---------- Вбивство ворога ----------
function onKill(e) {
  const m = P.m; if (e.dummy) return;
  if (m.killHeal) heal(P.maxHp * m.killHeal);
  if (m.killBoom && e.burn > 0) boom(e.x, e.y, 80, P.dmg * P.dmgMul * 1.4, { burn: true });
  if (m.ashBoom && e.ashT > 0) boom(e.x, e.y, 70, P.dmg * P.dmgMul * 1.2, { color: '#a89ab8' });
  if (m.killZone && e.burn > 0) pushZone({ x: e.x, y: e.y, r: 70, life: 3.5, slow: 0.45, color: '#888' });
  if (m.souls && !e.minion) { P.souls = Math.min(5, P.souls + 1); P.soulCount = (P.soulCount || 0) + 1; if (m.soulHeal && P.soulCount % 3 === 0) heal(P.maxHp * m.soulHeal); }
  if (m.headhunter && e.markT > 0) { P.abT *= 1 - m.headhunter; P.dodgeCdT *= 1 - m.headhunter; }
}

// ---------- Отримання шкоди ----------
// повертає залишок шкоди після модифікаторів і щитів
function mitigate(dmg, from) {
  const m = P.m; dmg *= P.cls.armor || 1; dmg *= m.taken; if (P.hp < P.maxHp * 0.3) dmg *= m.lowTaken;
  if (m.frontCut && from && from.x !== undefined) { if (Math.abs(angDiff(angTo(P, from), P.face)) < Math.PI / 3) dmg *= 1 - m.frontCut; }
  if (P.shield > 0) { const a = Math.min(P.shield, dmg); P.shield -= a; dmg -= a; }
  if (P.bShield > 0 && dmg > 0) { const a = Math.min(P.bShield, dmg); P.bShield -= a; dmg -= a; }
  if (dmg > 0 && m.thorns && from && from.type && from.hp !== undefined && !from.dummy) { from.hp -= m.thorns; if (from.hp <= 0) killEnemy(from); }
  return dmg;
}
// воскресіння/незламність замість смерті: true, якщо врятовано
function tryRevive() {
  const m = P.m, L = G.lethal || (G.lethal = {});
  if (m.immortal && !L.immortal) { L.immortal = true; P.hp = 1; P.inv = 3; toast('Незламний: ти вижив!'); effects.push({ k: 'ring', x: P.x, y: P.y, r: 80, t: 0, life: 0.5, color: '#d8b26a' }); return true; }
  if (m.phoenix && !L.phoenix) { L.phoenix = true; P.hp = Math.max(1, P.maxHp * m.phoenix); P.inv = 2; toast('Ти воскрес із попелу!'); boom(P.x, P.y, 110, P.dmg * P.dmgMul * 2.5, { burn: true }); return true; }
  return false;
}

// ---------- Ухилення ----------
function onDodge(dir) {
  const m = P.m;
  if (m.parry) P.parryT = 0.9;
  if (m.blink || m.dashStrike) {
    const len = m.blink || 0, ox = P.x, oy = P.y;
    for (let d = len; d > 0; d -= 10) { if (free(P.x + dir.x * d, P.y + dir.y * d)) { P.x += dir.x * d; P.y += dir.y * d; break; } }
    burst(ox, oy, '#8a6aff', 8, 100, 3, 0.4);
  }
  if (m.dashStrike) enemies.forEach((e) => { if (e.dead || e.dummy) return; const t = ((e.x - P.x) * dir.x + (e.y - P.y) * dir.y), px = P.x + dir.x * t, py = P.y + dir.y * t; if (t > -70 && t < 160 && Math.hypot(e.x - px, e.y - py) < e.r + 22) { hitEnemy(e, 30 + P.dmg * 1.5, Math.atan2(dir.y, dir.x), 60, { noExtra: true }); e.bleedT = 3; e.bleedDps = P.dmg * P.dmgMul * 0.4; } });
  if (m.invis) { P.invisT = m.invis; if (m.ghostShot) P.ghostT = m.invis + 1; }
  if (m.dodgeClear) { projs.forEach((p) => { if (p.from === 'e' && dist(p, P) < 95) { p.life = 0; burst(p.x, p.y, '#bbb', 4, 60, 2, 0.3); } }); effects.push({ k: 'ring', x: P.x, y: P.y, r: 95, t: 0, life: 0.3, color: '#bbbbbb' }); }
  if (m.dodgeNova) boom(P.x, P.y, 72, P.dmg * P.dmgMul * m.dodgeNova, { color: '#ffb347' });
  if (m.dodgeRing) pushZone({ x: P.x, y: P.y, r: 60, life: 3, dps: P.dmg * P.dmgMul * 0.7, burn: true, color: '#ff7a1a' });
  if (m.dodgeZone) pushZone({ x: P.x, y: P.y, r: 80, life: 3, slow: 0.5, block: true, color: '#cfc8b0' });
  if (m.trap) { const mine = traps.filter((t) => t.own); if (mine.length >= m.trapN) traps.splice(traps.indexOf(mine[0]), 1); traps.push({ x: P.x, y: P.y, life: 25, own: true, hits: m.trapN > 2 ? 2 : 1 }); }
}

// ---------- Зони та пастки ----------
function zonesTick(dt) {
  enemies.forEach((e) => { e.zs = 0; });
  for (const z of zones) {
    z.t += dt; if (z.follow) { z.x = P.x; z.y = P.y; }
    enemies.forEach((e) => {
      if (e.dead || e.dummy || dist(z, e) > z.r + e.r) return;
      if (z.slow) e.zs = Math.max(e.zs, z.slow); if (z.weak && e.ai !== 'boss') { e.weakT = 0.3; e.weakV = z.weak; }
      if (z.dps) dotDamage(e, z.dps * dt); if (z.burn && !e.dead) e.burn = Math.max(e.burn, 1);
    });
    if (z.block) projs.forEach((p) => { if (p.from === 'e' && dist(z, p) < z.r) { p.life = 0; } });
    if (Math.random() < dt * 10) parts.push({ x: z.x + rand(-z.r, z.r) * 0.8, y: z.y + rand(-z.r, z.r) * 0.5, vx: 0, vy: -20, life: 0.6, max: 0.6, size: 3, color: z.burn ? '#ff8a2a' : z.color });
  }
  zones = zones.filter((z) => z.t < z.life);
  for (const tr of traps) {
    tr.life -= dt;
    for (const e of enemies) {
      if (e.dead || e.dummy || tr.done || dist(tr, e) > 24 + e.r * 0.5) continue;
      hitEnemy(e, 35 + P.dmg * 2.2, 0, 0, { noExtra: true }); if (e.ai !== 'boss') e.stun = Math.max(e.stun, 1.2); effects.push({ k: 'ring', x: tr.x, y: tr.y, r: 40, t: 0, life: 0.25, color: '#a6e0b0' }); Sfx.play('hit');
      if (--tr.hits <= 0) tr.done = true; break;
    }
  }
  traps = traps.filter((t) => t.life > 0 && !t.done);
}

// ---------- Слуги ----------
function spawnMinion(x, y, life = 15, o = {}) {
  const m = P.m, hp = 45 * m.minionHp * (1 + 0.04 * (P.level - 1));
  allies.push(Object.assign({ x, y, r: 9, hp, maxHp: hp, life: life * m.minionLife, dmg: P.dmg * 0.9 * m.minionDmg, cd: 0, speed: 120, face: 0, flash: 0 }, o));
}
function spawnGolem() {
  const m = P.m, hp = 220 * m.minionHp * (1 + 0.04 * (P.level - 1));
  allies.push({ x: P.x + 24, y: P.y, r: 15, hp, maxHp: hp, life: 22 * m.minionLife, dmg: P.dmg * 2.6 * m.minionDmg, cd: 0, speed: 92, face: 0, flash: 0, golem: true });
}
function spawnHound() { allies.push({ x: P.x - 20, y: P.y, r: 9, hp: 80, maxHp: 80, life: 9999, dmg: P.dmg * 0.9 * (P.m.trapN > 2 ? 1.4 : 1), cd: 0, speed: 150, face: 0, flash: 0, hound: true }); }
function allyDeath(a) {
  if (P.m.minionBoom && !a.hound && a.hp <= 0) boom(a.x, a.y, 50, P.dmg * P.dmgMul * 1.2, { color: '#7dffc0' });
  if (a.hound) P.houndT = 15;
}

// ---------- Постійні ефекти гравця ----------
function playerSpeedMul() {
  const m = P.m; let s = P.spdMul;
  if (m.fireSpeed && enemies.some((e) => e.burn > 0 && dist(e, P) < 220)) s *= 1 + m.fireSpeed;
  return s;
}
function tickPlayerExt(dt) {
  const m = P.m;
  ['parryT', 'shieldT', 'invisT', 'wallT', 'ghostT'].forEach((k) => { if (P[k] > 0) P[k] -= dt; });
  if (P.shieldT <= 0) P.shield = 0;
  if (m.boneShield) { if (P.bShield < m.boneShield) { P.bRegen -= dt; if (P.bRegen <= 0) { P.bShield = m.boneShield; P.bRegen = 12; } } } else { P.bShield = 0; P.bRegen = 6; }
  if (m.autoMinions) { P.autoT -= dt; const n = allies.filter((a) => !a.golem && !a.hound).length; if (P.autoT <= 0 && n < m.autoMinions) { spawnMinion(P.x + rand(-30, 30), P.y + rand(-30, 30), 25); P.autoT = 4; } }
  if (m.hound) { if (!allies.some((a) => a.hound)) { P.houndT -= dt; if (P.houndT <= 0) { spawnHound(); P.houndT = 15; } } } else allies = allies.filter((a) => !a.hound);
  if (m.burnLeech) { const n = Math.min(3, enemies.filter((e) => e.burn > 0 && dist(e, P) < 300).length); if (n && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + 0.9 * n * dt); }
}

// ---------- Здібності ----------
const ABIL = {
  k_a: { name: 'Стіна щитів', cd: 10, run: () => {
    Sfx.play('slam'); P.wallT = 4; if (P.m.abShield) { P.shield = P.m.abShield; P.shieldT = 3; } effects.push({ k: 'ring', x: P.x, y: P.y, r: 60, t: 0, life: 0.4, color: '#d8b26a' });
  } },
  k_b: { name: 'Вогняна хвиля', cd: 7, run: (ang) => {
    Sfx.play('fire'); G.shake = 6; effects.push({ k: 'slash', x: P.x, y: P.y, a: ang, r: 150, arc: 1.5, t: 0, life: 0.35 });
    for (let i = 0; i < 26; i++) { const a = ang + rand(-0.75, 0.75), d = rand(20, 150); parts.push({ x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.5, max: 0.5, size: 4, color: Math.random() < 0.5 ? '#ff8a2a' : '#ffd24a' }); }
    enemies.forEach((e) => { if (e.dead || dist(P, e) > 150 + e.r || Math.abs(angDiff(angTo(P, e), ang)) > 0.75) return; hitEnemy(e, P.dmg * 2.2, ang, 90, { noExtra: true }); ignite(e, 4); });
    if (P.m.abShield) { P.shield = P.m.abShield; P.shieldT = 3; }
  } },
  p_a: { name: 'Вогняний стовп', cd: 8, run: () => {
    const mw = mouseWorld(), d = Math.min(380, dist(P, mw)), a = angTo(P, mw), tx = P.x + Math.cos(a) * d, ty = P.y + Math.sin(a) * d;
    Sfx.play('fire'); effects.push({ k: 'ring', x: tx, y: ty, r: 62, t: 0, life: 0.55, color: '#ff4a1a' });
    later(0.55, () => { if (G.state === 'dead') return; Sfx.play('slam'); G.shake = 6; boom(tx, ty, 62, P.dmg * P.dmgMul * 3.4, { burn: true, color: '#ff7a1a' }); if (P.m.pillarZone) pushZone({ x: tx, y: ty, r: 62, life: 4, dps: P.dmg * P.dmgMul * 0.9, burn: true, color: '#ff7a1a' }); });
  } },
  p_b: { name: 'Хмара попелу', cd: 10, run: () => {
    Sfx.play('magic'); pushZone({ x: P.x, y: P.y, r: 95, life: 5.5, slow: 0.4, weak: 0.7, follow: !!P.m.cloudFollow, color: '#a89ab8' }); effects.push({ k: 'ring', x: P.x, y: P.y, r: 95, t: 0, life: 0.5, color: '#a89ab8' });
  } },
  r_a: { name: 'Сальто-вистріл', cd: 6, run: (ang) => {
    Sfx.play('arrow'); const back = ang + Math.PI, bx = Math.cos(back), by = Math.sin(back);
    for (let d = 120; d > 0; d -= 10) { if (free(P.x + bx * d, P.y + by * d)) { burst(P.x, P.y, '#8a6aff', 8, 100, 3, 0.4); P.x += bx * d; P.y += by * d; break; } }
    let t = null, bd = 420; enemies.forEach((e) => { if (!e.dead && !e.dummy) { const d = dist(P, e); if (d < bd) { bd = d; t = e; } } }); const a0 = t ? angTo(P, t) : ang;
    for (let i = -1; i <= 1; i++) { const a = a0 + i * 0.12; spawnProj(arrowProj(a, P.dmg * 1.2, 2)); }
  } },
  r_b: { name: 'Злива ловця', cd: 9, run: () => {
    const mw = mouseWorld(), d = Math.min(420, dist(P, mw)), a = angTo(P, mw), tx = P.x + Math.cos(a) * d, ty = P.y + Math.sin(a) * d; Sfx.play('arrow');
    effects.push({ k: 'ring', x: tx, y: ty, r: 85, t: 0, life: 0.6, color: '#a6e0b0' });
    for (let i = 0; i < 12; i++) later(0.2 + i * 0.16, () => { if (G.state === 'dead') return; const ax = tx + rand(-80, 80), ay = ty + rand(-80, 80); effects.push({ k: 'ring', x: ax, y: ay, r: 22, t: 0, life: 0.2, color: '#d8e8c0' }); burst(ax, ay, '#a6e0b0', 5, 80, 2, 0.3);
      enemies.forEach((e) => { if (!e.dead && !e.dummy && dist({ x: ax, y: ay }, e) < 34 + e.r) { hitEnemy(e, P.dmg * 1.1, 0, 20, { noExtra: true, ranged: true }); e.poisT = 4; e.poisDps = P.dmg * P.dmgMul * 0.08; } }); });
  } },
  n_a: { name: 'Кістяний голем', cd: 14, run: () => { Sfx.play('magic'); allies = allies.filter((a) => !a.golem); spawnGolem(); burst(P.x, P.y, '#7dffc0', 24, 140, 3, 0.7); effects.push({ k: 'ring', x: P.x, y: P.y, r: 70, t: 0, life: 0.5, color: '#7dffc0' }); } },
  n_b: { name: 'Жнива', cd: 8, run: () => {
    Sfx.play('slam'); G.shake = 6; effects.push({ k: 'ring', x: P.x, y: P.y, r: 135, t: 0, life: 0.45, color: '#9cf0c8' }); let n = 0;
    enemies.forEach((e) => { if (!e.dead && !e.dummy && dist(P, e) < 135 + e.r) { hitEnemy(e, P.dmg * 3, angTo(P, e), 60, { noExtra: true }); n++; } }); heal(P.maxHp * 0.05 * Math.min(n, 4));
    if (P.m.soulBlast && P.souls) { boom(P.x, P.y, 150, 16 * P.souls * P.dmgMul + 10, { color: '#9cf0c8' }); P.souls = 0; }
  } },
};
function arrowProj(a, dmg, pierce) {
  const m = P.m; return { vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, dmg, color: '#a6e0b0', r: 4, pierce: pierce + m.pierce, arrow: true, bounce: m.bounce, ranged: true, life: 1.5 };
}
function abKnight() {
  const m = P.m; Sfx.play('slam'); G.shake = 9; effects.push({ k: 'ring', x: P.x, y: P.y, r: 120, t: 0, life: 0.4, color: '#d8b26a' });
  enemies.forEach((e) => { if (!e.dead && dist(P, e) < 120 + e.r) { hitEnemy(e, P.dmg * 1.8, angTo(P, e), 130, { noExtra: true }); if (e.ai !== 'boss') e.stun = 1.5; if (m.abBurn) ignite(e, 3.5); } });
  if (m.abShield) { P.shield = m.abShield; P.shieldT = 3; }
}
function abPyro() {
  const m = P.m; Sfx.play('fire'); G.shake = 6; effects.push({ k: 'ring', x: P.x, y: P.y, r: 150, t: 0, life: 0.5, color: '#ff7a1a' }); burst(P.x, P.y, '#ff8a2a', 40, 260, 4, 0.8);
  enemies.forEach((e) => { if (!e.dead && dist(P, e) < 150 + e.r) { hitEnemy(e, P.dmg * 2.4, angTo(P, e), 60, { noExtra: true }); ignite(e, 4); if (m.abWeak && e.ai !== 'boss') { e.weakT = 3; e.weakV = m.abWeak; } if (m.abStun && e.ai !== 'boss') e.stun = Math.max(e.stun, m.abStun); } });
  if (m.meteors) { const t = enemies.filter((e) => !e.dead && !e.dummy && dist(P, e) < 280); for (let i = 0; i < m.meteors; i++) { const e = t.length ? t[Math.floor(Math.random() * t.length)] : null, tx = e ? e.x : P.x + rand(-120, 120), ty = e ? e.y : P.y + rand(-120, 120); effects.push({ k: 'ring', x: tx, y: ty, r: 50, t: 0, life: 0.5 + i * 0.25, color: '#ff4a1a' }); later(0.5 + i * 0.25, () => { if (G.state !== 'dead') boom(tx, ty, 52, P.dmg * P.dmgMul * 1.8, { burn: true }); }); } }
}
function abRanger() {
  const m = P.m, n = m.volley, ang = P.face, st = n > 7 ? 0.085 : 0.11; Sfx.play('arrow');
  for (let i = 0; i < n; i++) { const a = ang + (i - (n - 1) / 2) * st; spawnProj(Object.assign(arrowProj(a, P.dmg * 1.2, 3), { color: '#a6e0b0' })); }
}
function abNecro() {
  const m = P.m; Sfx.play('magic'); allies = allies.filter((a) => a.hound);
  for (let i = 0; i < m.minionN; i++) { const a = (i / m.minionN) * 6.283; spawnMinion(P.x + Math.cos(a) * 30, P.y + Math.sin(a) * 30, 15); }
  burst(P.x, P.y, '#7dffc0', 24, 140, 3, 0.7); effects.push({ k: 'ring', x: P.x, y: P.y, r: 70, t: 0, life: 0.5, color: '#7dffc0' });
  if (m.abZone) pushZone({ x: P.x, y: P.y, r: 100, life: 5, slow: 0.5, color: '#9cf0c8' });
  if (m.healPerMinion) heal(P.maxHp * m.abHeal * m.minionN);
  if (m.soulBlast && P.souls) { boom(P.x, P.y, 150, 16 * P.souls * P.dmgMul + 10, { color: '#9cf0c8' }); P.souls = 0; }
}
function runAbility(ang) {
  const m = P.m, v = ABIL[m.sub], c = P.cls.id;
  P.abT = (v ? v.cd : P.cls.ability.cd) * (1 - P.cdr) * m.abCd;
  if (v) v.run(ang); else ({ knight: abKnight, pyro: abPyro, ranger: abRanger, necro: abNecro })[c](ang);
  if (m.abInv) P.inv = Math.max(P.inv, m.abInv);
  if (m.abHeal && c === 'pyro') heal(P.maxHp * m.abHeal);
}
const abilityName = () => (ABIL[P.m.sub] ? ABIL[P.m.sub].name : P.cls.ability.name);
const abilityCd = () => (ABIL[P.m.sub] ? ABIL[P.m.sub].cd : P.cls.ability.cd) * (1 - P.cdr) * P.m.abCd;

// ---------- Малювання ----------
function drawExt(t) {
  zones.forEach((z) => {
    const a = clamp(Math.min(1, (z.life - z.t) / 0.6, z.t / 0.3 + 0.2), 0, 1);
    ctx.globalAlpha = 0.16 * a; ctx.fillStyle = z.burn ? '#ff6a1a' : z.color; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.6 * a; pxArc(z.x, z.y, z.r, 0, 6.283, 2, z.burn ? '#ff9a3a' : z.color); ctx.globalAlpha = 1;
  });
  traps.forEach((tr) => { ctx.fillStyle = '#3a4a2a'; ctx.fillRect(Math.round(tr.x) - 7, Math.round(tr.y) - 2, 14, 4); ctx.fillStyle = '#a6e0b0'; for (let i = -2; i <= 2; i++) ctx.fillRect(Math.round(tr.x) + i * 3 - 1, Math.round(tr.y) - 5, 2, 4); });
}
function drawPlayerAura() {
  const m = P.m;
  if (P.shield > 0 || P.bShield > 0) { ctx.globalAlpha = 0.55; pxArc(0, -6, 17, 0, 6.283, 2, P.shield > 0 ? '#d8b26a' : '#cfc8b0'); ctx.globalAlpha = 1; }
  if (P.wallT > 0) { const a = P.face; ctx.save(); ctx.rotate(a); ctx.globalAlpha = 0.8; ctx.fillStyle = '#d8b26a'; ctx.fillRect(22, -16, 4, 32); ctx.fillStyle = '#fff2c8'; ctx.fillRect(22, -16, 2, 32); ctx.globalAlpha = 1; ctx.restore(); }
  if (m.souls && P.souls) for (let i = 0; i < P.souls; i++) { const a = G.time * 2 + (i / P.souls) * 6.283; ctx.fillStyle = '#9cf0c8'; ctx.fillRect(Math.round(Math.cos(a) * 20), Math.round(-8 + Math.sin(a) * 8), 3, 3); }
}
function drawStatusIcons(e) {
  let x = -6;
  [[e.bleedT, '#c02030'], [e.poisT, '#6adf5a'], [e.burn, '#ff8a2a'], [e.markT, '#ffd24a'], [e.weakT, '#8a8aa8'], [e.slowT, '#6ab0ff'], [e.ashT, '#a89ab8']].forEach(([v, c]) => { if (v > 0) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), -e.r - 16, 3, 3); x += 5; } });
}
