// Бот для тестування балансу: інжектується в сторінку гри й проходить її справжнім кодом (час прискорено).
// Використання: див. tools/balance-sim.js. Бот — середній гравець, не ідеальний: реакція з ймовірністю, помилки наведення.
(function () {
  const DT = 1 / 30, PREF = ['dmg', 'hp', 'as', 'vamp', 'crit', 'cdr', 'alch', 'spd', 'roll', 'soul'];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  function bfs(tx, ty) {
    const w = map.w, h = map.h, d = new Int16Array(w * h).fill(-1), q = [ty * w + tx];
    if (solid(tx, ty)) return d; d[q[0]] = 0;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], cx = c % w, cy = (c / w) | 0;
      for (const [nx, ny] of DIRS) {
        const X = cx + nx, Y = cy + ny; if (solid(X, Y) || d[Y * w + X] >= 0) continue;
        if (nx && ny && (solid(cx + nx, cy) || solid(cx, cy + ny))) continue;
        d[Y * w + X] = d[c] + 1; q.push(Y * w + X);
      }
    }
    return d;
  }
  function stepToward(field) {
    const cx = Math.floor(P.x / TS), cy = Math.floor(P.y / TS); let best = field[cy * map.w + cx] < 0 ? 1e9 : field[cy * map.w + cx], bx = -1, by = -1;
    for (const [nx, ny] of DIRS) {
      const X = cx + nx, Y = cy + ny; if (solid(X, Y)) continue; if (nx && ny && (solid(cx + nx, cy) || solid(cx, cy + ny))) continue;
      const v = field[Y * map.w + X]; if (v >= 0 && v < best) { best = v; bx = X; by = Y; }
    }
    if (bx < 0) return null; const a = Math.atan2((by + 0.5) * TS - P.y, (bx + 0.5) * TS - P.x); return { x: Math.cos(a), y: Math.sin(a) };
  }
  function pathTo(B, goal) {
    const key = Math.floor(goal.x / TS) + ',' + Math.floor(goal.y / TS);
    if (B.fieldKey !== key || !B.field) { B.field = bfs(Math.floor(goal.x / TS), Math.floor(goal.y / TS)); B.fieldKey = key; }
    return stepToward(B.field);
  }
  const free = (x, y) => !hitsWall(x, y, P.r * 0.85);
  function safeDir(v) { // якщо шлях заблокований стіною — пробуємо повернути
    for (const rot of [0, 0.6, -0.6, 1.2, -1.2, 2]) { const a = Math.atan2(v.y, v.x) + rot, x = Math.cos(a), y = Math.sin(a); if (free(P.x + x * 14, P.y + y * 14)) return { x, y }; }
    return v;
  }

  window.runBot = function (clsId, seed, opt = {}) {
    Math.random = mulberry32(seed);
    const cls = CLASSES.find((c) => c.id === clsId); createPlayer(cls);
    Object.assign(G, { time: 0, kills: 0, deaths: 0, seen: {} }); G.tut = { on: false, done: true, tips: {} };
    const skill = opt.skill === undefined ? 0.85 : opt.skill;
    const M = { skill, dmgLv: [0, 0, 0], cls: clsId, seed, win: false, fail: null, deaths: 0, deathLog: [], levelTimes: [], dmg: 0, potions: 0, kills: 0, time: 0, plevel: 1, bossTime: null, bossTries: 0 };
    const origHurt = hurtPlayer; let lastSrc = '?';
    hurtPlayer = function (d, from) { const b = P.hp; lastSrc = from ? (from.type || (from.from ? 'снаряд' : '?')) : '?'; origHurt(d, from); M.dmg += Math.max(0, b - P.hp); M.dmgLv[G.level] += Math.max(0, b - P.hp); };
    startLevel(0); G.state = 'play'; let levelStart = 0, tick = 0;
    const B = { lapse: 0, lapseCd: 3, field: null, fieldKey: '', fieldT: 0, strafe: 1, strafeT: 0, stuckT: 0, lastX: P.x, lastY: P.y, wander: 0, wdir: null, dodgeCool: 0, reactT: 0 };
    const maxTicks = 30 * (opt.maxSeconds || 2400);
    while (tick < maxTicks) {
      tick++;
      if (G.state === 'dialog') { if (D.choices) { M.win = true; break; } D.pos = D.full.length; dlgAdvance(); continue; }
      if (G.state === 'talents') { spendTalents(); closeTalents(); continue; }
      if (G.state === 'play') spendTalents();
      if (G.state === 'dead') {
        M.deaths++; M.deathLog.push({ lvl: G.level, by: lastSrc, t: Math.round(G.time), boss: !!(G.boss && !G.boss.dead) });
        if (LEVELS[G.level].boss) M.bossTries++;
        if (M.deaths >= (opt.maxDeaths || 8)) { M.fail = 'deaths'; break; }
        startLevel(G.level, G.cp); P.inv = 1.5; B.field = null; continue;
      }
      if (G.state !== 'play') { M.fail = 'state:' + G.state; break; }
      if (G.time - levelStart > (opt.levelCap || 900)) { M.fail = 'stuck-level-' + G.level; break; }
      if (LEVELS[G.level].boss && G.boss && G.boss.dead) { M.win = true; M.bossTime = G.time; break; }
      control(B, M); update(DT); Input.endFrame();
    }
    // portal transitions happen inside control(); record final
    M.time = Math.round(G.time); M.kills = G.kills; M.plevel = P.level; M.maxHp = P.maxHp; M.sub = P.sub; M.asc = P.asc; M.talents = P.talents.length; M.potionsLeft = P.potions;
    hurtPlayer = origHurt; return M;

    function spendTalents() {
      const t = TALENTS[P.cls.id], order = [0, 1, 2].map((i) => t.branches[(i + seed) % 3]);
      let guard = 0;
      while (P.points > 0 && guard++ < 20) { let bought = false; for (const b of order) { for (const n of b.nodes) { if (nodeState(n) === 'available') { buyTalent(n.id); bought = true; break; } } if (bought) break; } if (!bought) break; }
      if (needSub()) chooseSub(t.subs[seed % 2].id);
      if (needAsc()) chooseAsc(SUB_BY_ID[P.sub].ascs[(seed >> 1) % 2].id);
    }
    function nextLevel() { M.levelTimes.push(Math.round(G.time - levelStart)); levelStart = G.time; const n = G.level + 1; startLevel(n); introLevel(n); B.field = null; }
    function control(B, M) {
      const live = enemies.filter((e) => !e.dead && !e.dummy), K = new Set(); Input.keys.clear(); Input.mouse.down = false; Input.mouse.rEdge = false;
      const ranged = cls.id !== 'knight', wd = 48 + 8;
      B.dodgeCool -= DT; B.strafeT -= DT; B.reactT -= DT; if (B.strafeT <= 0) { B.strafe = Math.random() < 0.5 ? 1 : -1; B.strafeT = rand(0.8, 1.8); }
      let near = null, nd = 1e9; live.forEach((e) => { const d = dist(e, P); if (d < nd) { nd = d; near = e; } });
      const engage = near && (near.aggro ? nd < 420 : nd < 220);
      let mv = null, atk = false, aimT = null, dodge = false, abil = false, pot = false;
      // --- загрози: снаряди та замахи ---
      let danger = 0, dodgeV = null;
      projs.forEach((p) => { if (p.from !== 'e') return; const rx = P.x - p.x, ry = P.y - p.y, d = Math.hypot(rx, ry); if (d < 95 && (p.vx * rx + p.vy * ry) > 0) { danger = Math.max(danger, 1 - d / 95); const sx = -p.vy, sy = p.vx, s = Math.hypot(sx, sy) || 1, side = (sx * rx + sy * ry) >= 0 ? 1 : -1; dodgeV = { x: side * sx / s, y: side * sy / s }; if (d < 48) dodge = true; } });
      live.forEach((e) => { const d = dist(e, P);
        if (e.atk && e.ai === 'melee' && d < e.range + e.r + P.r + 26 && e.atk.t < 0.24) dodge = true;
        if (e.ai === 'boss') { if (e.state === 'slam' && e.st < 0.3 && d < 130) { dodge = true; } if (e.state === 'charge' && e.st < 0.3 && d < 260) dodge = true; }
      });
      if (dodge && (B.dodgeCool > 0 || P.dodgeCdT > 0 || B.reactT > 0 || Math.random() < 0.05 + (1 - skill) * 0.9)) dodge = false; // реакція людини: не завжди й не миттєво
      B.lapseCd -= DT; if (B.lapseCd <= 0) { B.lapse = Math.random() < (1 - skill) * 1.1 ? rand(0.5, 1.1) : 0; B.lapseCd = rand(2, 4); } if (B.lapse > 0) B.lapse -= DT;
      // --- бій ---
      if (engage) {
        const t = near, d = nd;
        aimT = { x: t.x, y: t.y }; const vis = los(P, t);
        if (!vis) { mv = pathTo(B, t); }
        else if (ranged) {
          const want = cls.id === 'ranger' ? 210 : cls.id === 'pyro' ? 220 : 190; let fx = 0, fy = 0, close = 0;
          live.forEach((e) => { const dd = dist(e, P); if (dd < 125 && (e.aggro || dd < 70)) { fx += (P.x - e.x) / dd; fy += (P.y - e.y) / dd; close++; } });
          if (close) { const m = Math.hypot(fx, fy) || 1; mv = { x: fx / m, y: fy / m }; }
          else if (d > want + 70) mv = { x: (t.x - P.x) / d, y: (t.y - P.y) / d };
          else { const a = Math.atan2(t.y - P.y, t.x - P.x) + Math.PI / 2 * B.strafe; mv = { x: Math.cos(a), y: Math.sin(a) * 1 }; }
          atk = los(P, t) && d < 400;
        } else {
          if (d > 40 + t.r) mv = { x: (t.x - P.x) / d, y: (t.y - P.y) / d }; else { const a = Math.atan2(t.y - P.y, t.x - P.x) + Math.PI / 2 * B.strafe * 0.6; mv = { x: Math.cos(a), y: Math.sin(a) }; }
          atk = d < wd + t.r;
        }
        // здібності
        if (P.abT <= 0) {
          const n100 = live.filter((e) => dist(e, P) < 120).length, n150 = live.filter((e) => dist(e, P) < 160).length;
          if (cls.id === 'knight') abil = n100 >= 2 || (t.ai === 'boss' && d < 110) || (t.elite && d < 100);
          else if (cls.id === 'pyro') abil = n150 >= 2 || ((t.elite || t.ai === 'boss') && d < 150);
          else if (cls.id === 'ranger') abil = d < 330 && (live.filter((e) => e.aggro).length >= 2 || t.elite || t.ai === 'boss');
          else abil = live.filter((e) => e.aggro).length >= 1 && d < 320;
        }
        if (danger > 0.3 && dodgeV && (!mv || Math.random() < 0.7) && Math.random() > (1 - skill) * 0.8) mv = dodgeV;
        if (B.lapse > 0 && vis) mv = null; // мить неуважності: стоїть і б'є
      } else {
        // --- дослідження: до найближчого ворога / зілля / порталу ---
        let goal = null;
        const pk = pickups.filter((p) => p.type === 'potion' && dist(p, P) < 260).sort((a, b) => dist(a, P) - dist(b, P))[0];
        if (pk && P.potions < P.maxPotions) goal = { x: pk.x, y: pk.y };
        else if (live.length) { B.fieldT -= DT; const fP = bfs(Math.floor(P.x / TS), Math.floor(P.y / TS)); let best = 1e9; live.forEach((e) => { const v = fP[Math.floor(e.y / TS) * map.w + Math.floor(e.x / TS)]; if (v >= 0 && v < best) { best = v; goal = { x: e.x, y: e.y }; } }); if (!goal) goal = { x: near.x, y: near.y }; }
        else { const portal = props.find((p) => p.type === 'portal'); if (portal && G.portalOpen) { if (dist(portal, P) < 40) { nextLevel(); return; } goal = { x: portal.x, y: portal.y }; } else if (G.boss) goal = { x: G.boss.x, y: G.boss.y }; }
        // лікуватись біля вогнища, якщо зовсім погано і вогнище поруч
        if (goal) mv = pathTo(B, goal);
      }
      // антизастрягання
      if (Math.hypot(P.x - B.lastX, P.y - B.lastY) < 4) B.stuckT += DT; else { B.stuckT = 0; B.lastX = P.x; B.lastY = P.y; }
      if (B.stuckT > 1.6) { B.wander = 1.1; const an = rand(0, 6.28); B.wdir = { x: Math.cos(an), y: Math.sin(an) }; B.stuckT = 0; B.field = null; B.fieldKey = ''; }
      if (B.wander > 0) { B.wander -= DT; mv = B.wdir; }
      // зілля
      if (P.hp < P.maxHp * 0.4 && P.potions > 0 && P.hp > 0) { pot = true; }
      // застосування
      if (mv) { mv = safeDir(mv); if (mv.x > 0.3) K.add('KeyD'); if (mv.x < -0.3) K.add('KeyA'); if (mv.y > 0.3) K.add('KeyS'); if (mv.y < -0.3) K.add('KeyW'); }
      Input.keys = K;
      if (aimT) { const jit = 6 + (1 - skill) * 26; Input.mouse.x = W / 2 + (aimT.x - cam.x) + rand(-jit, jit); Input.mouse.y = H / 2 + (aimT.y - cam.y) + rand(-jit, jit); } else { Input.mouse.x = W / 2 + (mv ? mv.x * 100 : 0); Input.mouse.y = H / 2 + (mv ? mv.y * 100 : 0); }
      Input.mouse.down = atk;
      if (dodge) { Input.edge.add('Space'); B.dodgeCool = 0.3; B.reactT = rand(0.05, 0.25); if (dodgeV && !mv) { /* напрям кувирка задається рухом */ } }
      if (abil) Input.edge.add('KeyQ');
      if (pot) { Input.edge.add('KeyF'); M.potions++; }
    }
  };
})();
