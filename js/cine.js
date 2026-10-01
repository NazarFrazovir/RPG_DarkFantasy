'use strict';
// ===== КІНЕМАТОГРАФІЧНИЙ ПРОЛОГ =====
// Малюється в низькій «віртуальній» роздільності з цілим масштабом S (кожен піксель — S×S пікселів екрана),
// зверху — чорні кінематографічні смуги, титри та плівкове зерно. Пропуск: Esc / Пробіл / Enter.

const CINE_D = [6, 7, 6.5, 13];
const CINE_CAP = [
  [[0.7, 5.3, 'Королівство Ашторн колись сяяло від гір до моря.']],
  [[0.6, 3.7, 'Але король Мальгорат, що боявся смерті більше за ворогів, уклав угоду з Безоддю.'], [3.95, 6.5, 'Ціною стала Корона Попелу — і кожна душа в його землях.']],
  [[0.6, 2.9, 'Так прийшла Скверна.'], [3.1, 6.1, 'Мертві встали. Живі — стали гіршими.']],
  [[0.9, 3.7, 'Ти прокидаєшся у Ямі, серед тіл.'], [3.9, 6.6, 'Жар усе ще тліє в твоїх кістках.'], [6.9, 9.6, 'Ти — Пробуджений. Може, останній.'], [9.9, 12.6, null]],
];
const hexRGB = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mixc = (a, b, k) => { const A = hexRGB(a), B = hexRGB(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };
const LAND0 = { top: '#3a2a5a', mid: '#c0605a', low: '#ffc070', far: '#7a4a6a', near: '#5a3a5a', body: '#4a2a3a', edge: '#ffc070', g1: '#3a4a2a', g2: '#2a3a1e' };
const LAND1 = { top: '#04020a', mid: '#1a0a1e', low: '#4a1418', far: '#140a1a', near: '#0d0612', body: '#09040d', edge: '#2a1830', g1: '#0d0a10', g2: '#07050a' };

const Cine = {
  active: false, t: 0, cls: null, done: null, S: 3, vw: 0, vh: 0, flags: {}, skipA: 0, skipping: false, bodies: [], total: CINE_D.reduce((a, b) => a + b, 0),
  start(cls, done) {
    this.active = true; this.t = 0; this.cls = cls; this.done = done; this.flags = {}; this.skipA = 0; this.skipping = false;
    const kinds = ['skeleton', 'knight', 'necro', 'pyro', 'ranger', 'cultist', 'ghoul', 'skeleton', 'knight', 'ghoul', 'necro', 'skeleton'];
    this.bodies = kinds.map((k, i) => ({ k, x: [0.07, 0.16, 0.26, 0.35, 0.62, 0.71, 0.8, 0.9, 0.12, 0.31, 0.67, 0.86][i], y: [-4, 3, -1, 5, -3, 4, 0, -4, 8, 9, 8, 7][i], r: (i % 2 ? 1 : -1) * (1.2 + (i % 3) * 0.2) }));
    Music.play('cine'); Music.target = 0;
  },
  finish() {
    this.active = false; const d = this.done; this.done = null; Music.target = 0;
    fadeEl.style.transitionDuration = '0ms'; fadeEl.classList.add('on');
    if (d) d();
    setTimeout(() => { fadeEl.style.transitionDuration = '900ms'; fadeEl.classList.remove('on'); }, 60);
  },
  once(k, fn) { if (!this.flags[k]) { this.flags[k] = 1; fn(); } },
  frame(dt) {
    this.t += dt;
    if (this.t > 1.2 && !this.skipping && (Input.pressed('Space') || Input.pressed('Enter') || Input.pressed('Escape'))) this.skipping = true;
    if (this.skipping) { this.skipA += dt / 0.55; if (this.skipA >= 1) return this.finish(); }
    if (this.t >= this.total) return this.finish();
    this.draw();
  },
  draw() {
    const S = this.S = Math.max(2, Math.round(H * DPR / 190)), vw = this.vw = Math.ceil(W * DPR / S), vh = this.vh = Math.ceil(H * DPR / S);
    let si = 0, lt = this.t; while (si < 3 && lt >= CINE_D[si]) { lt -= CINE_D[si]; si++; }
    const dur = CINE_D[si], p = lt / dur;
    ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, vw, vh);
    Music.target = [0, 0.5, 0.95, 0.2][si];
    ctx.save();
    if (si === 1 && lt > 4.2 && lt < 4.9) ctx.translate(Math.round(rand(-2, 2)), Math.round(rand(-2, 2)));
    [this.s1, this.s2, this.s3, this.s4][si].call(this, lt, p, vw, vh);
    ctx.restore();
    // зерно
    for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(255,255,255,${rand(0.02, 0.08)})`; ctx.fillRect(Math.floor(rand(0, vw)), Math.floor(rand(0, vh)), 1, 1); }
    // чорний «провал» між сценами
    const dip = clamp(1 - lt / (si === 0 ? 0.9 : 0.55), 0, 1);
    const out = clamp(1 - (dur - lt) / 0.55, 0, 1), endFade = si === 3 ? clamp(1 - (dur - lt) / 1.0, 0, 1) : out;
    const black = Math.max(dip, endFade, this.skipA);
    ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, vw, vh);
    // екранний простір: смуги, титри, віньєтка
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const bh = Math.round(H * 0.13 * ease(Math.min(1, this.t / 1.1)));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
    this.captions(si, lt, bh);
    if (this.t > 1.6 && !this.skipping) { ctx.font = `${Math.max(11, Math.round(H * 0.018))}px Georgia, serif`; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(217,207,192,.45)'; ctx.fillText('Esc — пропустити', W - 18, H - 14); ctx.textAlign = 'left'; }
  },
  captions(si, lt, bh) {
    const fs = clamp(Math.round(H * 0.034), 15, 36);
    CINE_CAP[si].forEach(([a, b, txt]) => {
      if (lt < a || lt > b) return;
      const al = Math.min(1, (lt - a) / 0.6, (b - lt) / 0.6), text = txt || this.cls.intro, last = txt === null;
      ctx.globalAlpha = al; ctx.textAlign = 'center';
      ctx.font = `italic ${last ? Math.round(fs * 0.82) : fs}px Cinzel, Georgia, serif`;
      const maxw = W * 0.74, words = text.split(' '), lines = []; let cur = '';
      words.forEach((w) => { const t2 = cur ? cur + ' ' + w : w; if (ctx.measureText(t2).width > maxw && cur) { lines.push(cur); cur = w; } else cur = t2; }); lines.push(cur);
      const lh = fs * 1.3, y0 = H - bh / 2 - ((lines.length - 1) * lh) / 2 + fs * 0.3 - (1 - al) * -6;
      lines.forEach((l, i) => { ctx.fillStyle = '#000'; ctx.fillText(l, W / 2 + 2, y0 + i * lh + 2); ctx.fillStyle = last ? '#c9a35a' : '#efe4c8'; ctx.fillText(l, W / 2, y0 + i * lh); });
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    });
  },
  // ---------- спільні шматки ----------
  ridge(base, amp, seed, col, off, vw, vh) {
    ctx.fillStyle = col;
    for (let x = 0; x < vw; x++) { const h = Math.round(base + amp * (Math.sin((x + off) * 0.03 + seed) + 0.55 * Math.sin((x + off) * 0.08 + seed * 2) + 0.25 * Math.sin((x + off) * 0.21 + seed * 3))); ctx.fillRect(x, h, 1, vh - h + 1); }
  },
  glow(x, y, r, col, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r), n = hexRGB(col); g.addColorStop(0, `rgba(${n[0]},${n[1]},${n[2]},${a})`); g.addColorStop(1, `rgba(${n[0]},${n[1]},${n[2]},0)`);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over';
  },
  crown(x, y, s, t) {
    const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + a * s), Math.round(y + b * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))); };
    R(-6, 0, 12, 3, '#e0b040'); R(-6, 0, 12, 1, '#ffe08a'); [-6, -3, 0, 3, 5].forEach((o, i) => R(o, i % 2 ? -3 : -5, 1.4, i % 2 ? 3 : 5, '#e0b040')); R(-1, 0.5, 2, 2, Math.sin(t * 6) > 0 ? '#e060ff' : '#b030e0');
  },
  // ---------- СЦЕНА 1: золоте королівство ----------
  land(lt, p, vw, vh, mood, ground) {
    const hy = Math.round(vh * 0.64), pan = -Math.round(lt * 2.2);
    const c = (k) => mixc(LAND0[k], LAND1[k], mood);
    const sk = ctx.createLinearGradient(0, 0, 0, hy + 6); sk.addColorStop(0, c('top')); sk.addColorStop(0.55, c('mid')); sk.addColorStop(1, c('low')); ctx.fillStyle = sk; ctx.fillRect(0, 0, vw, hy + 8);
    for (let i = 0; i < 80; i++) { const a = mood * (0.3 + 0.5 * Math.abs(Math.sin(lt * 1.5 + i))); if (a > 0.05) { ctx.fillStyle = `rgba(255,240,220,${a})`; ctx.fillRect(Math.floor(hash2(i, 1) * vw), Math.floor(hash2(i, 2) * hy * 0.7), 1, 1); } }
    if (mood < 0.85) { const sy = hy - 26 + (1 - ease(Math.min(1, lt / 4))) * 14 + mood * 60, sx = vw * 0.3; this.glow(sx, sy, 60, '#ffd890', 0.55 * (1 - mood)); pxc(sx, sy, 8, mixc('#fff0b0', '#c08060', mood), 1); }
    if (mood < 0.7) for (let i = 0; i < 5; i++) { const x = ((i * 90 + lt * 5) % (vw + 100)) - 50, y = hy * (0.25 + 0.12 * i % 0.5); ctx.fillStyle = `rgba(255,170,140,${0.35 * (1 - mood)})`; ctx.fillRect(Math.round(x), Math.round(y), 40, 2); ctx.fillRect(Math.round(x + 8), Math.round(y - 2), 22, 2); }
    this.ridge(hy - 24, 14, 1.3, c('far'), pan * 0.3, vw, vh); this.ridge(hy - 12, 9, 4.1, c('near'), pan * 0.6, vw, vh);
    const u = vh / 160, cx = vw * 0.62 + pan * 0.4, gy = hy + 4;
    ctx.fillStyle = c('near'); ctx.fillRect(cx - 28 * u, gy, 56 * u, vh);
    menuCastle(cx, gy, u, lt, 0, { body: c('body'), edge: c('edge') });
    if (mood < 0.6) { [[11, 43], [-11, 27]].forEach(([dx, top], i) => { const px = Math.round(cx + dx * u), py = Math.round(gy - top * u - 8); ctx.fillStyle = '#2a1a1a'; ctx.fillRect(px, py, 1, 10); ctx.fillStyle = '#c0302a'; for (let k = 0; k < 6; k++) ctx.fillRect(px + 1 + k, py + Math.round(Math.sin(lt * 6 + k * 0.7 + i) * 1), 1, 3 - (k > 3 ? 1 : 0)); }); }
    ctx.fillStyle = c('g1'); this.ridge(hy + 10, 4, 2.2, c('g1'), pan, vw, vh); this.ridge(hy + 26, 5, 5.1, c('g2'), pan * 1.5, vw, vh);
    // дорога до замку
    for (let y = hy + 8; y < vh; y++) { const k = (y - hy - 8) / (vh - hy), xx = cx - 6 * u + k * (vw * 0.05 - cx + 6 * u) * 0.9, w = 3 + k * 26; ctx.fillStyle = mixc('#9a7a4a', '#1a1018', mood); ctx.fillRect(Math.round(xx - w / 2), y, Math.round(w), 1); }
    // дерева
    [0.08, 0.2, 0.9, 0.97].forEach((fx, i) => {
      const x = Math.round(fx * vw + pan * 1.6), y = Math.round(hy + 24 + (i % 2) * 8);
      if (mood < 0.45) { ctx.fillStyle = '#2a1e12'; ctx.fillRect(x, y - 10, 2, 12); pxc(x + 1, y - 14, 8, mixc('#4a6a2a', '#1a2a14', mood * 2), 1); pxc(x - 2, y - 11, 5, mixc('#5a7a30', '#1a2a14', mood * 2), 1); }
      else { ctx.fillStyle = '#05030a'; ctx.fillRect(x, y - 18, 2, 20); for (let k = 0; k < 6; k++) { ctx.fillRect(x + (k % 2 ? 2 + k : -k), y - 16 + k * 2 - (k % 2) * 4, 3 + (k % 3), 1); } }
    });
    // Корона над замком
    const crx = cx, cry = gy - 50 * u - 6 + Math.sin(lt * 1.4) * 1.5;
    if (mood > 0.1) { this.glow(crx, cry, 46, '#b040ff', 0.5 * mood); this.glow(crx, cry, 22, '#ff9a3a', 0.4 * mood); this.crown(crx, cry, 1, lt); ctx.globalAlpha = 0.35 * mood; ctx.fillStyle = '#b040ff'; ctx.fillRect(Math.round(crx) - 1, 0, 2, Math.round(cry) - 6); ctx.globalAlpha = 1; }
    return { hy, pan, cx, gy };
  },
  s1(lt, p, vw, vh) {
    this.land(lt, p, vw, vh, 0);
    for (let i = 0; i < 5; i++) { const x = ((lt * 14 + i * 70) % (vw + 60)) - 30, y = vh * 0.2 + Math.sin(lt * 1.2 + i) * 6 + i * 5, f = Math.sin(lt * 12 + i) > 0; ctx.fillStyle = '#2a1424'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); ctx.fillRect(Math.round(x - 2), Math.round(y - (f ? 2 : 0)), 2, 1); ctx.fillRect(Math.round(x + 1), Math.round(y - (f ? 2 : 0)), 2, 1); }
  },
  // ---------- СЦЕНА 2: угода ----------
  s2(lt, p, vw, vh) {
    const fl = Math.round(vh * 0.7), cx = Math.round(vw / 2), rift = { x: cx, y: Math.round(fl - vh * 0.3) };
    ctx.fillStyle = '#0a050c'; ctx.fillRect(0, 0, vw, vh);
    const wall = ctx.createLinearGradient(0, 0, 0, fl); wall.addColorStop(0, '#0c060e'); wall.addColorStop(1, '#241228'); ctx.fillStyle = wall; ctx.fillRect(0, 0, vw, fl);
    [0.3, 0.7].forEach((fx) => { const x = Math.round(vw * fx - 7); ctx.fillStyle = '#2a3a6a'; ctx.fillRect(x, fl - 74, 14, 38); ctx.fillRect(x + 2, fl - 80, 10, 6); ctx.fillStyle = 'rgba(160,190,255,.25)'; ctx.fillRect(x + 2, fl - 72, 3, 34); ctx.fillStyle = '#12091a'; ctx.fillRect(x + 6, fl - 74, 2, 38); ctx.fillRect(x, fl - 56, 14, 2); });
    ctx.fillStyle = '#16091a'; ctx.fillRect(cx - 18, fl - 70, 36, 70); ctx.fillStyle = '#c9a35a'; ctx.fillRect(cx - 18, fl - 70, 2, 70); ctx.fillRect(cx + 16, fl - 70, 2, 70); for (let k = 0; k < 5; k++) ctx.fillRect(cx - 18 + k * 9, fl - 76, 2, 6);
    ctx.fillStyle = '#1a0c1e'; ctx.fillRect(0, fl, vw, vh - fl); for (let y = fl; y < vh; y += 6) { ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fillRect(0, y, vw, 1); }
    for (let y = fl; y < vh; y++) { const hw = 14 + (y - fl) * 0.95; ctx.fillStyle = '#5a1020'; ctx.fillRect(Math.round(cx - hw), y, Math.round(hw * 2), 1); ctx.fillStyle = '#c9a35a'; ctx.fillRect(Math.round(cx - hw), y, 1, 1); ctx.fillRect(Math.round(cx + hw), y, 1, 1); }
    [0.06, 0.2, 0.8, 0.94].forEach((fx, i) => {
      const x = Math.round(vw * fx), w = i % 3 === 0 ? 20 : 16; ctx.fillStyle = '#2a1630'; ctx.fillRect(x - w / 2, 0, w, fl + 6); ctx.fillStyle = '#3e2248'; ctx.fillRect(x - w / 2, 0, 2, fl + 6); ctx.fillStyle = '#12081a'; ctx.fillRect(x + w / 2 - 3, 0, 3, fl + 6); ctx.fillStyle = '#3a2a4a'; ctx.fillRect(x - w / 2 - 2, fl + 2, w + 4, 4);
      const fy = fl - 40, fh = 7 + Math.round(Math.sin(lt * 12 + i) * 1.5); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 1, fy, 3, 8); ctx.fillStyle = '#ff9a2a'; ctx.fillRect(x - 2, fy - fh, 5, fh); ctx.fillStyle = '#ffe08a'; ctx.fillRect(x - 1, fy - fh / 2, 3, fh / 2); this.glow(x, fy - 4, 38, '#ff8a2a', 0.3);
    });
    // розлом
    const open = ease(Math.min(1, lt / 1.4)), rr = 4 + open * 22, spin = lt * 1.6;
    this.glow(rift.x, rift.y, rr * 3, '#a030ff', 0.45 * open);
    for (let k = 0; k < 3; k++) for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.283 + spin * (k % 2 ? -1 : 1), rd = rr * (1 - k * 0.22); ctx.fillStyle = k === 2 ? '#e0a0ff' : k === 1 ? '#a030ff' : '#5a1a90'; ctx.fillRect(Math.round(rift.x + Math.cos(a) * rd), Math.round(rift.y + Math.sin(a) * rd * 1.15), 2, 2); }
    ctx.fillStyle = '#05020a'; for (let j = -rr * 0.6; j <= rr * 0.6; j += 2) { const w = Math.sqrt(Math.max(0, (rr * 0.6) ** 2 - j * j)); ctx.fillRect(Math.round(rift.x - w), Math.round(rift.y + j), Math.round(w * 2), 2); }
    // король
    const king = { x: cx, y: fl + 24 }, head = king.y - 58, land = 4.2, face = lt < land ? -Math.PI / 2 : Math.PI / 2;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(king.x - 18, king.y - 2, 36, 5);
    drawChar('boss', king.x, king.y, { anim: lt < land ? 'idle' : lt < land + 0.6 ? 'hurt' : 'idle', idx: Math.floor(lt * 2.2) % 4, face, scale: 2, ox: 0 });
    // Корона опускається
    if (lt > 1.4 && lt < land + 0.05) {
      const k = ease((lt - 1.4) / (land - 1.4)), x = rift.x + Math.sin(lt * 2.5) * 3 * (1 - k), y = rift.y + (head - 8 - rift.y) * k;
      for (let i = 0; i < 26; i++) { const kk = i / 26, tx = rift.x + (x - rift.x) * kk + Math.sin(lt * 7 + i) * 3 * (1 - kk), ty = rift.y + (y - rift.y) * kk; ctx.fillStyle = i % 2 ? '#c060ff' : '#8030d0'; ctx.fillRect(Math.round(tx), Math.round(ty), 1, 1); }
      this.glow(x, y, 26, '#ff9a3a', 0.5); this.crown(x, y, 1.4, lt);
    }
    if (lt >= land) {
      this.once('land', () => { Sfx.play('boss'); Sfx.noise(0.7, 0.2, 400); });
      const f = clamp(1 - (lt - land) / 0.6, 0, 1); if (f > 0) { ctx.fillStyle = `rgba(230,200,255,${f * 0.85})`; ctx.fillRect(0, 0, vw, vh); }
      const pulse = 0.4 + Math.sin(lt * 5) * 0.1; this.glow(king.x, king.y - 30, 50, '#b030ff', pulse); this.glow(king.x, king.y - 46, 22, '#ff2a2a', pulse * 0.8);
      for (let i = 0; i < 14; i++) { const k = (lt * 0.4 + i / 14) % 1; ctx.fillStyle = i % 2 ? '#e060ff' : '#ff6a3a'; ctx.fillRect(Math.round(king.x + Math.sin(i * 7) * 14), Math.round(king.y - 20 - k * 40), 1, 1); }
    }
    for (let i = 0; i < 30; i++) { const k = (lt * 0.08 + hash2(i, 5)) % 1; ctx.fillStyle = 'rgba(255,200,140,.25)'; ctx.fillRect(Math.floor(hash2(i, 6) * vw), Math.floor(k * fl), 1, 1); }
  },
  // ---------- СЦЕНА 3: Скверна ----------
  s3(lt, p, vw, vh) {
    const mood = clamp(0.25 + p * 1.0, 0, 1), L = this.land(lt, p, vw, vh, mood), hy = L.hy;
    const mon = [[0.06, 'skeleton', 0.4], [0.15, 'ghoul', 1.2], [0.24, 'skeleton', 2.0], [0.33, 'ghoul', 0.8], [0.42, 'skeleton', 1.7], [0.5, 'ghoul', 2.6], [0.58, 'skeleton', 1.0], [0.67, 'ghoul', 3.0], [0.76, 'skeleton', 3.3], [0.85, 'ghoul', 2.2], [0.94, 'skeleton', 1.4], [0.2, 'ghoul', 3.6], [0.72, 'skeleton', 0.2]];
    const gyG = hy + 30;
    mon.forEach(([fx, k, st], i) => {
      const x = Math.round(fx * vw + L.pan * 1.4), y = Math.round(gyG + 6 + (i % 3) * 8), rise = ease((lt - st) / 1.3);
      if (lt < st) { ctx.drawImage(SPR.grave, x - 4, y - 14); return; }
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, vw, y + 1); ctx.clip();
      const dy = (1 - rise) * 26; ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x - 5, y - 1, 10, 2);
      drawChar(k, x, y + dy, { anim: rise < 1 ? 'hurt' : 'idle', idx: Math.floor(lt * 2 + i) % 4, face: Math.PI / 2, scale: 1 }); ctx.restore();
      if (rise < 1 && Math.random() < 0.4) { ctx.fillStyle = '#3a2a22'; ctx.fillRect(x + Math.round(rand(-8, 8)), y - Math.round(rand(0, 4)), 2, 2); }
    });
    // туман і блискавки
    for (let i = 0; i < 4; i++) { const x = ((i * vw / 3 + lt * 6) % (vw + 160)) - 80; ctx.save(); ctx.translate(x, hy + 22 + i * 4); ctx.scale(5, 1); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 22); g.addColorStop(0, `rgba(140,120,170,${0.12 * mood})`); g.addColorStop(1, 'rgba(140,120,170,0)'); ctx.fillStyle = g; ctx.fillRect(-22, -22, 44, 44); ctx.restore(); }
    [2.3, 4.5].forEach((ft, i) => { const d = lt - ft; if (d > 0 && d < 0.5) { this.once('th' + i, () => Sfx.noise(1.3, 0.2, 140)); if (Math.sin(d * 40) > -0.1) { ctx.fillStyle = `rgba(200,190,255,${(1 - d / 0.5) * 0.5})`; ctx.fillRect(0, 0, vw, vh); } } });
  },
  // ---------- СЦЕНА 4: Яма ----------
  s4(lt, p, vw, vh) {
    const gy = Math.round(vh * 0.74), cx = Math.round(vw / 2), cl = this.cls.id;
    const bg = ctx.createLinearGradient(0, 0, 0, vh); bg.addColorStop(0, '#05030a'); bg.addColorStop(1, '#120a14'); ctx.fillStyle = bg; ctx.fillRect(0, 0, vw, vh);
    for (let x = 0; x < vw; x++) { const edge = 28 + 22 * Math.sin(x * 0.07) + 14 * Math.sin(x * 0.19 + 1); ctx.fillStyle = '#07040a'; ctx.fillRect(x, 0, 1, Math.round(vh * 0.04 + edge * 0.1)); }
    // стіни ями
    for (let y = 0; y < gy; y++) { const w = 36 + 22 * Math.sin(y * 0.09) + 10 * Math.sin(y * 0.27) + y * 0.12; ctx.fillStyle = y % 7 === 0 ? '#1a1018' : '#0e0812'; ctx.fillRect(0, y, Math.round(w), 1); ctx.fillRect(vw - Math.round(w), y, Math.round(w), 1); }
    // місячний промінь згори
    const beam = ctx.createLinearGradient(0, 0, 0, gy); beam.addColorStop(0, 'rgba(170,190,255,.32)'); beam.addColorStop(1, 'rgba(170,190,255,0)');
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(cx - 26, 0); ctx.lineTo(cx + 26, 0); ctx.lineTo(cx + 62, gy); ctx.lineTo(cx - 62, gy); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 40; i++) { const k = (lt * 0.06 + hash2(i, 9)) % 1; ctx.fillStyle = 'rgba(200,210,255,.35)'; ctx.fillRect(Math.round(cx + (hash2(i, 4) - 0.5) * (40 + k * 80)), Math.round(k * gy), 1, 1); }
    ctx.fillStyle = '#0c0710'; ctx.fillRect(0, gy, vw, vh);
    // тіла
    this.bodies.slice().sort((a, b) => a.y - b.y).forEach((b, i) => { const x = Math.round(b.x * vw), y = gy + b.y + 4; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - 12, y - 1, 24, 3); drawChar(b.k, x, y, { anim: 'hurt', idx: 0, face: Math.PI / 2, scale: 2, rot: b.r > 0 ? Math.PI / 2 + b.r * 0.2 : -Math.PI / 2 + b.r * 0.2, alpha: 0.9 }); });
    const dk = ctx.createRadialGradient(cx, gy - 10, 10, cx, gy - 10, vw * 0.5); dk.addColorStop(0, 'rgba(5,3,10,0)'); dk.addColorStop(1, 'rgba(5,3,10,.78)'); ctx.fillStyle = dk; ctx.fillRect(0, 0, vw, vh);
    // герой: серцебиття, підйом
    const rise = ease((lt - 5.2) / 2.6), rot = -Math.PI / 2 * (1 - rise), beat = Math.max(0, Math.sin(lt * 5.2)) ** 6, chest = { x: cx - (1 - rise) * 20, y: gy - 14 - rise * 6 };
    if (lt < 7.4) this.once('hb' + Math.floor((lt * 5.2 - 1.5708) / 6.2832), () => { Sfx.tone(58, 0.25, 'sine', 0.35, -25); setTimeout(() => Sfx.tone(52, 0.25, 'sine', 0.25, -20), 190); });
    this.glow(chest.x, chest.y, 22 + beat * 8 + rise * 22, '#ff7a1a', 0.22 + beat * 0.2 + rise * 0.12);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(cx - 14, gy + 2, 28, 4);
    drawChar(cl, cx, gy + 6, { anim: rise < 0.7 ? 'hurt' : rise < 1 ? 'walk' : 'idle', idx: Math.floor(lt * 4) % 6, face: Math.PI / 2, scale: 2, rot, ox: -rot * 4, oy: 0 });
    if (lt > 7.6) this.once('rise', () => { Sfx.play('level'); });
    for (let i = 0; i < 26; i++) { const k = (lt * (0.18 + hash2(i, 3) * 0.15) + hash2(i, 7)) % 1; ctx.fillStyle = i % 3 ? '#ff9a3a' : '#ffd24a'; ctx.globalAlpha = (1 - k) * (0.3 + rise * 0.7); ctx.fillRect(Math.round(chest.x + Math.sin(i * 5 + lt * 2) * (6 + k * 16)), Math.round(chest.y - k * 70), 1 + (i % 4 === 0 ? 1 : 0), 1); ctx.globalAlpha = 1; }
  },
};
