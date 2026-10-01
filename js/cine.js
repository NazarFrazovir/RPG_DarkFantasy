'use strict';
// ===== КІНЕМАТОГРАФІЧНИЙ ПРОЛОГ =====
// Малюється в низькій «віртуальній» роздільності з цілим масштабом S (кожен піксель — S×S пікселів екрана),
// зверху — чорні кінематографічні смуги, титри та плівкове зерно. Пропуск: Esc / Пробіл / Enter.

const CINE_SEQ = {
  prologue: {
    dur: [6, 7, 6.5, 13], fn: ['s1', 's2', 's3', 's4'], tg: [0, 0.5, 0.95, 0.2], music: ['cine', 'cine', 'cine', 'cine'],
    caps: [
      [[0.7, 5.3, 'Королівство Ашторн колись сяяло від гір до моря.']],
      [[0.6, 3.7, 'Але король Мальгорат, що боявся смерті більше за ворогів, уклав угоду з Безоддю.'], [3.95, 6.5, 'Ціною стала Корона Попелу — і кожна душа в його землях.']],
      [[0.6, 2.9, 'Так прийшла Скверна.'], [3.1, 6.1, 'Мертві встали. Живі — стали гіршими.']],
      [[0.9, 3.7, 'Ти прокидаєшся у Ямі, серед тіл.'], [3.9, 6.6, 'Жар усе ще тліє в твоїх кістках.'], [6.9, 9.6, 'Ти — Пробуджений. Може, останній.'], [9.9, 12.6, null]],
    ],
  },
  destroy: {
    dur: [6.8, 7.2, 8, 9.5], fn: ['d1', 'd2', 'd3', 'd4'], tg: [0.35, 0, 0, 0], music: ['cine', 'end_good', 'end_good', 'end_good'],
    title: 'СВІТАНОК ПОПЕЛУ', tcol: '#ffd890',
    caps: [
      [[0.6, 3.0, 'Корона пульсує в твоїх руках.'], [3.2, 6.4, 'Ти розбиваєш її об кам’яні плити.']],
      [[0.9, 3.7, 'Скверна розсіюється.'], [3.9, 6.9, 'Мертві падають — нарешті вільні.']],
      [[0.7, 3.8, 'Жар залишає твоє тіло — і разом із ним сили.'], [4.4, 7.4, 'Ти усміхаєшся.']],
      [[0.8, 4.0, 'Крізь дірки в склепінні пробивається перше за століття сонце.'], [4.2, 6.0, 'Ашторн житиме.']],
    ],
  },
  wear: {
    dur: [7, 7, 7, 9.5], fn: ['w1', 'w2', 'w3', 'w4'], tg: [0.4, 0.7, 0.95, 0.3], music: ['cine', 'end_dark', 'end_dark', 'end_dark'],
    title: 'НОВИЙ КОРОЛЬ ПОПЕЛУ', tcol: '#d8a0ff',
    caps: [
      [[0.7, 3.4, 'Ти піднімаєш Корону й надягаєш її.'], [4.6, 6.8, 'Біль триває мить.']],
      [[0.8, 5.8, 'Далі лишається лише тиша — і влада.']],
      [[0.7, 3.5, 'Скверна вклоняється тобі.'], [3.8, 6.6, 'Мертві встають у стрій.']],
      [[0.8, 3.8, 'Ти більше не пам’ятаєш, ким був.'], [4.0, 6.0, 'Але Ашторн… Ашторн знову має короля.']],
    ],
  },
};
const hexRGB = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mixc = (a, b, k) => { const A = hexRGB(a), B = hexRGB(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };
const LAND0 = { top: '#3a2a5a', mid: '#c0605a', low: '#ffc070', far: '#7a4a6a', near: '#5a3a5a', body: '#4a2a3a', edge: '#ffc070', g1: '#3a4a2a', g2: '#2a3a1e' };
const LAND1 = { top: '#04020a', mid: '#1a0a1e', low: '#4a1418', far: '#140a1a', near: '#0d0612', body: '#09040d', edge: '#2a1830', g1: '#0d0a10', g2: '#07050a' };

const FIRE = { f: '#ff9a2a', t: '#ffe08a', g: '#ff8a2a' }, PURPLE = { f: '#a040ff', t: '#ecc8ff', g: '#a030ff' };
const MONS = [[0.06, 'skeleton', 0.4], [0.15, 'ghoul', 1.2], [0.24, 'skeleton', 2.0], [0.33, 'ghoul', 0.8], [0.42, 'skeleton', 1.7], [0.5, 'ghoul', 2.6], [0.58, 'skeleton', 1.0], [0.67, 'ghoul', 3.0], [0.76, 'skeleton', 3.3], [0.85, 'ghoul', 2.2], [0.94, 'skeleton', 1.4], [0.2, 'ghoul', 3.6], [0.72, 'skeleton', 0.2]];

const Cine = {
  active: false, t: 0, cls: null, done: null, S: 3, vw: 0, vh: 0, flags: {}, skipA: 0, skipping: false, bodies: [], seq: null, total: 0, shk: 0, curMus: null,
  start(cls, done, name = 'prologue') {
    this.seq = CINE_SEQ[name]; this.total = this.seq.dur.reduce((a, b) => a + b, 0); this.curMus = null;
    this.active = true; this.t = 0; this.cls = cls; this.done = done; this.flags = {}; this.skipA = 0; this.skipping = false; this.shk = 0;
    const kinds = ['skeleton', 'knight', 'necro', 'pyro', 'ranger', 'cultist', 'ghoul', 'skeleton', 'knight', 'ghoul', 'necro', 'skeleton'];
    this.bodies = kinds.map((k, i) => ({ k, x: [0.07, 0.16, 0.26, 0.35, 0.62, 0.71, 0.8, 0.9, 0.12, 0.31, 0.67, 0.86][i], y: [-4, 3, -1, 5, -3, 4, 0, -4, 8, 9, 8, 7][i], r: (i % 2 ? 1 : -1) * (1.2 + (i % 3) * 0.2) }));
    Music.target = 0;
  },
  finish() {
    this.active = false; const d = this.done; this.done = null; Music.target = 0;
    fadeEl.style.transitionDuration = '0ms'; fadeEl.classList.add('on');
    if (d) d();
    setTimeout(() => { fadeEl.style.transitionDuration = '900ms'; fadeEl.classList.remove('on'); }, 60);
  },
  once(k, fn) { if (!this.flags[k]) { this.flags[k] = 1; fn(); } },
  frame(dt) {
    this.t += dt; this.shk = Math.max(0, this.shk - dt);
    if (this.t > 1.2 && !this.skipping && (Input.pressed('Space') || Input.pressed('Enter') || Input.pressed('Escape'))) this.skipping = true;
    if (this.skipping) { this.skipA += dt / 0.55; if (this.skipA >= 1) return this.finish(); }
    if (this.t >= this.total) return this.finish();
    this.draw();
  },
  draw() {
    const seq = this.seq, last = seq.dur.length - 1;
    const S = this.S = Math.max(2, Math.round(H * DPR / 190)), vw = this.vw = Math.ceil(W * DPR / S), vh = this.vh = Math.ceil(H * DPR / S);
    let si = 0, lt = this.t; while (si < last && lt >= seq.dur[si]) { lt -= seq.dur[si]; si++; }
    const dur = seq.dur[si], p = lt / dur;
    ctx.setTransform(S, 0, 0, S, 0, 0); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, vw, vh);
    Music.target = seq.tg[si]; if (this.curMus !== seq.music[si]) { this.curMus = seq.music[si]; Music.play(this.curMus); }
    ctx.save();
    if (this.shk > 0) ctx.translate(Math.round(rand(-2, 2)), Math.round(rand(-2, 2)));
    this[seq.fn[si]](lt, p, vw, vh);
    ctx.restore();
    const ta = seq.title && si === last ? ease((lt - (dur - 4.6)) / 1.3) : 0;
    if (ta > 0) { ctx.fillStyle = `rgba(0,0,0,${0.55 * ta})`; ctx.fillRect(0, 0, vw, vh); }
    for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(255,255,255,${rand(0.02, 0.08)})`; ctx.fillRect(Math.floor(rand(0, vw)), Math.floor(rand(0, vh)), 1, 1); }
    const dip = clamp(1 - lt / (si === 0 ? 0.9 : 0.55), 0, 1);
    const out = clamp(1 - (dur - lt) / 0.55, 0, 1), endFade = si === last ? clamp(1 - (dur - lt) / 1.0, 0, 1) : out;
    ctx.fillStyle = `rgba(0,0,0,${Math.max(dip, endFade, this.skipA)})`; ctx.fillRect(0, 0, vw, vh);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const bh = Math.round(H * 0.13 * ease(Math.min(1, this.t / 1.1)));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
    this.captions(si, lt, bh);
    if (ta > 0) this.titleCard(ta, lt, dur, endFade);
    if (this.t > 1.6 && !this.skipping) { ctx.font = `${Math.max(11, Math.round(H * 0.018))}px Georgia, serif`; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(217,207,192,.45)'; ctx.fillText('Esc — пропустити', W - 18, H - 14); ctx.textAlign = 'left'; }
  },
  titleCard(ta, lt, dur, endFade) {
    const fs = Math.round(H * 0.085), cy = H * 0.46, a = ta * (1 - endFade * 0.0);
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
    ctx.font = `${Math.round(fs * 0.22)}px Cinzel, Georgia, serif`; ctx.fillStyle = '#a8895a'; ctx.fillText('К І Н Е Ц Ь', W / 2, cy - fs * 0.95);
    ctx.font = `700 ${fs}px Cinzel, Georgia, serif`; const g = ctx.createLinearGradient(0, cy - fs, 0, cy + fs * 0.2); g.addColorStop(0, '#fff4d8'); g.addColorStop(0.5, this.seq.tcol); g.addColorStop(1, '#8a5a2a');
    ctx.shadowColor = this.seq.tcol; ctx.shadowBlur = 28; ctx.fillStyle = g; ctx.fillText(this.seq.title, W / 2, cy); ctx.shadowBlur = 0;
    const lw = Math.min(W * 0.5, ctx.measureText(this.seq.title).width), y2 = cy + fs * 0.35; const ln = ctx.createLinearGradient(W / 2 - lw / 2, 0, W / 2 + lw / 2, 0); ln.addColorStop(0, 'rgba(201,163,90,0)'); ln.addColorStop(0.5, '#c9a35a'); ln.addColorStop(1, 'rgba(201,163,90,0)');
    ctx.fillStyle = ln; ctx.fillRect(W / 2 - lw / 2, y2, lw, 2);
    ctx.restore();
  },
  captions(si, lt, bh) {
    const fs = clamp(Math.round(H * 0.034), 15, 36);
    this.seq.caps[si].forEach(([a, b, txt]) => {
      if (lt < a || lt > b) return;
      const al = Math.min(1, (lt - a) / 0.6, (b - lt) / 0.6), text = txt || this.cls.intro, last = txt === null;
      ctx.globalAlpha = al; ctx.textAlign = 'center';
      ctx.font = `italic ${last ? Math.round(fs * 0.82) : fs}px Cinzel, Georgia, serif`;
      const maxw = W * 0.74, words = text.split(' '), lines = []; let cur = '';
      words.forEach((w) => { const t2 = cur ? cur + ' ' + w : w; if (ctx.measureText(t2).width > maxw && cur) { lines.push(cur); cur = w; } else cur = t2; }); lines.push(cur);
      const lh = fs * 1.3, y0 = H - bh / 2 - ((lines.length - 1) * lh) / 2 + fs * 0.3;
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
  hall(lt, vw, vh, pal = FIRE, win = '#2a3a6a') {
    const fl = Math.round(vh * 0.7), cx = Math.round(vw / 2);
    ctx.fillStyle = '#0a050c'; ctx.fillRect(0, 0, vw, vh);
    const wall = ctx.createLinearGradient(0, 0, 0, fl); wall.addColorStop(0, '#0c060e'); wall.addColorStop(1, '#241228'); ctx.fillStyle = wall; ctx.fillRect(0, 0, vw, fl);
    [0.3, 0.7].forEach((fx) => { const x = Math.round(vw * fx - 7); ctx.fillStyle = win; ctx.fillRect(x, fl - 74, 14, 38); ctx.fillRect(x + 2, fl - 80, 10, 6); ctx.fillStyle = 'rgba(160,190,255,.25)'; ctx.fillRect(x + 2, fl - 72, 3, 34); ctx.fillStyle = '#12091a'; ctx.fillRect(x + 6, fl - 74, 2, 38); ctx.fillRect(x, fl - 56, 14, 2); });
    ctx.fillStyle = '#16091a'; ctx.fillRect(cx - 18, fl - 70, 36, 70); ctx.fillStyle = '#c9a35a'; ctx.fillRect(cx - 18, fl - 70, 2, 70); ctx.fillRect(cx + 16, fl - 70, 2, 70); for (let k = 0; k < 5; k++) ctx.fillRect(cx - 18 + k * 9, fl - 76, 2, 6);
    ctx.fillStyle = '#1a0c1e'; ctx.fillRect(0, fl, vw, vh - fl); for (let y = fl; y < vh; y += 6) { ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fillRect(0, y, vw, 1); }
    for (let y = fl; y < vh; y++) { const hw = 14 + (y - fl) * 0.95; ctx.fillStyle = '#5a1020'; ctx.fillRect(Math.round(cx - hw), y, Math.round(hw * 2), 1); ctx.fillStyle = '#c9a35a'; ctx.fillRect(Math.round(cx - hw), y, 1, 1); ctx.fillRect(Math.round(cx + hw), y, 1, 1); }
    [0.06, 0.2, 0.8, 0.94].forEach((fx, i) => {
      const x = Math.round(vw * fx), w = i % 3 === 0 ? 20 : 16; ctx.fillStyle = '#2a1630'; ctx.fillRect(x - w / 2, 0, w, fl + 6); ctx.fillStyle = '#3e2248'; ctx.fillRect(x - w / 2, 0, 2, fl + 6); ctx.fillStyle = '#12081a'; ctx.fillRect(x + w / 2 - 3, 0, 3, fl + 6); ctx.fillStyle = '#3a2a4a'; ctx.fillRect(x - w / 2 - 2, fl + 2, w + 4, 4);
      const fy = fl - 40, fh = 7 + Math.round(Math.sin(lt * 12 + i) * 1.5); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 1, fy, 3, 8); ctx.fillStyle = pal.f; ctx.fillRect(x - 2, fy - fh, 5, fh); ctx.fillStyle = pal.t; ctx.fillRect(x - 1, fy - fh / 2, 3, fh / 2); this.glow(x, fy - 4, 38, pal.g, 0.3);
    });
    return { fl, cx };
  },
  birds(lt, vw, vh) {
    for (let i = 0; i < 5; i++) { const x = ((lt * 14 + i * 70) % (vw + 60)) - 30, y = vh * 0.2 + Math.sin(lt * 1.2 + i) * 6 + i * 5, f = Math.sin(lt * 12 + i) > 0; ctx.fillStyle = '#2a1424'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); ctx.fillRect(Math.round(x - 2), Math.round(y - (f ? 2 : 0)), 2, 1); ctx.fillRect(Math.round(x + 1), Math.round(y - (f ? 2 : 0)), 2, 1); }
  },
  // ---------- СЦЕНА 1: золоте королівство ----------
  land(lt, p, vw, vh, mood, opt = {}) {
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
    if (mood > 0.1 && opt.crownOn !== false) { const cg = opt.cg || ['#b040ff', '#ff9a3a']; this.glow(crx, cry, 46 * (opt.big || 1), cg[0], 0.5 * mood); this.glow(crx, cry, 22 * (opt.big || 1), cg[1], 0.4 * mood); this.crown(crx, cry, 1, lt); ctx.globalAlpha = 0.35 * mood * (opt.big || 1); ctx.fillStyle = cg[0]; ctx.fillRect(Math.round(crx) - 1, 0, 2, Math.round(cry) - 6); ctx.globalAlpha = 1; }
    return { hy, pan, cx, gy, crx, cry, u };
  },
  s1(lt, p, vw, vh) {
    this.land(lt, p, vw, vh, 0);
    this.birds(lt, vw, vh);
  },
  // ---------- СЦЕНА 2: угода ----------
  s2(lt, p, vw, vh) {
    const { fl, cx } = this.hall(lt, vw, vh, FIRE), rift = { x: cx, y: Math.round(fl - vh * 0.3) };
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
      this.once('land', () => { Sfx.play('boss'); Sfx.noise(0.7, 0.2, 400); this.shk = 0.7; });
      const f = clamp(1 - (lt - land) / 0.6, 0, 1); if (f > 0) { ctx.fillStyle = `rgba(230,200,255,${f * 0.85})`; ctx.fillRect(0, 0, vw, vh); }
      const pulse = 0.4 + Math.sin(lt * 5) * 0.1; this.glow(king.x, king.y - 30, 50, '#b030ff', pulse); this.glow(king.x, king.y - 46, 22, '#ff2a2a', pulse * 0.8);
      for (let i = 0; i < 14; i++) { const k = (lt * 0.4 + i / 14) % 1; ctx.fillStyle = i % 2 ? '#e060ff' : '#ff6a3a'; ctx.fillRect(Math.round(king.x + Math.sin(i * 7) * 14), Math.round(king.y - 20 - k * 40), 1, 1); }
    }
    for (let i = 0; i < 30; i++) { const k = (lt * 0.08 + hash2(i, 5)) % 1; ctx.fillStyle = 'rgba(255,200,140,.25)'; ctx.fillRect(Math.floor(hash2(i, 6) * vw), Math.floor(k * fl), 1, 1); }
  },
  // ---------- СЦЕНА 3: Скверна ----------
  s3(lt, p, vw, vh) {
    const mood = clamp(0.25 + p * 1.0, 0, 1), L = this.land(lt, p, vw, vh, mood), hy = L.hy;
    const mon = MONS;
    const gyG = hy + 20;
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
  // ======================= ФІНАЛ «РОЗБИТИ КОРОНУ» =======================
  d1(lt, p, vw, vh) {
    const { fl, cx } = this.hall(lt, vw, vh, FIRE), hy = fl + 26, head = hy - 50, py = fl + 22, hit = 3.55;
    ctx.fillStyle = '#1a1420'; ctx.fillRect(cx - 22, py - 1, 44, 5); ctx.fillStyle = '#2a2030'; ctx.fillRect(cx - 14, py - 3, 28, 3);
    let anim = 'idle', idx = Math.floor(lt * 2.2) % 4;
    if (lt >= 1.6 && lt < 3.1) { anim = 'cast'; idx = lt < 2.3 ? 0 : 1; } else if (lt >= 3.1 && lt < hit) { anim = 'atk'; idx = 0; } else if (lt >= hit && lt < hit + 0.6) { anim = 'atk'; idx = 1; }
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(cx - 14, hy - 1, 28, 4);
    drawChar(this.cls.id, cx, hy, { anim, idx, face: Math.PI / 2, scale: 2 });
    let cy = null;
    if (lt < 1.5) cy = py - 8 + Math.sin(lt * 3) * 0.8;
    else if (lt < 3.1) { const k = ease((lt - 1.5) / 1.5); cy = py - 8 + (head - 16 - (py - 8)) * k + Math.sin(lt * 6) * 0.6; }
    else if (lt < hit) { const k = (lt - 3.1) / (hit - 3.1); cy = head - 16 + (py - 8 - (head - 16)) * k * k; }
    if (cy !== null) {
      this.glow(cx, cy, 22, '#b040ff', 0.55 + Math.sin(lt * 6) * 0.1);
      if (lt > 1.2 && lt < 3.1) for (let i = 0; i < 10; i++) { const kk = i / 10; ctx.fillStyle = i % 2 ? '#c060ff' : '#8030d0'; ctx.fillRect(Math.round(cx + Math.sin(lt * 4 + i) * (4 + kk * 6)), Math.round(cy + 2 + kk * (hy - 24 - cy)), 1, 1); }
      this.crown(cx, cy, 1.4, lt);
    }
    if (lt >= hit) {
      const d = lt - hit; this.once('hit', () => { Sfx.play('slam'); Sfx.tone(1500, 0.45, 'triangle', 0.14, -1000); Sfx.noise(0.5, 0.2, 2500); this.shk = 0.9; });
      const f = clamp(1 - d / 0.5, 0, 1); if (f > 0) { ctx.fillStyle = `rgba(235,210,255,${f * 0.9})`; ctx.fillRect(0, 0, vw, vh); }
      this.glow(cx, py - 2, 50 * Math.min(1, d * 3), '#c060ff', 0.7 * clamp(1 - d / 1.8, 0, 1));
      for (let i = 0; i < 8; i++) { const a = i * 0.785 + 0.2, len = Math.min(70, d * 150); for (let s = 4; s < len; s += 2) { ctx.fillStyle = s % 4 ? '#c060ff' : '#ffffff'; ctx.fillRect(Math.round(cx + Math.cos(a) * s), Math.round(py + 2 + Math.sin(a) * s * 0.32), 1, 1); } }
      const ba = clamp(1 - d / 1.4, 0, 1), bhh = 90 * Math.min(1, d * 2); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const g = ctx.createLinearGradient(0, py, 0, py - bhh); g.addColorStop(0, `rgba(190,100,255,${ba * 0.7})`); g.addColorStop(1, 'rgba(190,100,255,0)'); ctx.fillStyle = g; ctx.fillRect(Math.round(cx + (i - 2) * 9) - 1, py - bhh, 3, bhh); }
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 16; i++) { const a = i * 0.7, sp = 36 + (i % 5) * 14, x = cx + Math.cos(a) * sp * d, y = py - 2 - Math.abs(Math.sin(a)) * sp * 1.1 * d + 95 * d * d; if (y > vh + 4 || d > 2.6) continue; ctx.globalAlpha = clamp(1 - (d - 1.6), 0, 1); ctx.fillStyle = i % 3 ? '#e0b040' : '#c060ff'; ctx.fillRect(Math.round(x), Math.round(y), 2 + (i % 2), 2); }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 26; i++) { const k = (d * 0.3 + hash2(i, 2)) % 1; ctx.fillStyle = `rgba(255,225,255,${(1 - k) * clamp(d / 0.6, 0, 1) * 0.7})`; ctx.fillRect(Math.round(cx + Math.sin(i * 5 + d) * (10 + k * 40)), Math.round(py - k * 110), 1, 1); }
    }
  },
  d2(lt, p, vw, vh) {
    const mood = 1 - ease((lt - 0.8) / 5.6), L = this.land(lt, p, vw, vh, mood, { crownOn: lt < 0.7 });
    if (lt >= 0.7) {
      this.once('sh', () => { Sfx.tone(1700, 0.5, 'triangle', 0.12, -1100); Sfx.noise(0.6, 0.15, 3000); this.shk = 0.5; });
      const d = lt - 0.7, f = clamp(1 - d / 0.45, 0, 1); if (f > 0) { ctx.fillStyle = `rgba(230,200,255,${f * 0.7})`; ctx.fillRect(0, 0, vw, vh); this.glow(L.crx, L.cry, 60, '#c060ff', f); }
      for (let i = 0; i < 12; i++) { const a = i * 0.9, sp = 18 + (i % 4) * 10, x = L.crx + Math.cos(a) * sp * d, y = L.cry + Math.sin(a) * sp * d * 0.6 + 70 * d * d; if (y > vh || d > 2.2) continue; ctx.globalAlpha = clamp(1.8 - d, 0, 1); ctx.fillStyle = i % 2 ? '#e0b040' : '#c060ff'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); } ctx.globalAlpha = 1;
    }
    MONS.forEach(([fx, k, st], i) => {
      const x = Math.round(fx * vw + L.pan * 1.4), y = Math.round(L.hy + 26 + (i % 3) * 8), c = clamp((lt - (0.9 + st)) / 1.3, 0, 1);
      if (c >= 1) return; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, vw, y + 1); ctx.clip(); ctx.globalAlpha = 1 - c;
      drawChar(k, x, y + c * 22, { anim: c > 0 ? 'hurt' : 'idle', idx: Math.floor(lt * 2 + i) % 4, face: Math.PI / 2, scale: 1 }); ctx.restore(); ctx.globalAlpha = 1;
      if (c > 0) for (let m = 0; m < 5; m++) { const kk = (c * 0.8 + m * 0.17) % 1; ctx.fillStyle = `rgba(255,240,200,${(1 - c) * 0.9})`; ctx.fillRect(Math.round(x + Math.sin(m * 3 + lt * 2) * 7), Math.round(y - 8 - kk * 36), 1, 1); }
    });
    for (let i = 0; i < 40; i++) { const k = (lt * 0.1 + hash2(i, 3)) % 1; ctx.fillStyle = `rgba(255,235,190,${0.5 * (1 - mood)})`; ctx.fillRect(Math.floor(hash2(i, 4) * vw), Math.round(vh * 0.8 - k * vh * 0.7), 1, 1); }
  },
  d3(lt, p, vw, vh) {
    const L = this.land(lt, p, vw, vh, 0, { crownOn: false }), hx = Math.round(vw * 0.3), hy = Math.round(vh * 0.855), sunX = vw * 0.3;
    this.ridge(vh * 0.86, 3, 6.3, '#0b0a12', 0, vw, vh);
    for (let i = 0; i < 46; i++) { const k = (lt * (0.18 + hash2(i, 3) * 0.12) + hash2(i, 7)) % 1; if (hash2(i, 5) > 1 - p * 0.9) continue; ctx.fillStyle = i % 3 ? '#ff9a3a' : '#ffd24a'; ctx.globalAlpha = (1 - k); ctx.fillRect(Math.round(hx + Math.sin(i * 5 + lt * 2) * (5 + k * 14) + k * 26), Math.round(hy - 20 - k * 80), 1 + (i % 4 === 0 ? 1 : 0), 1); } ctx.globalAlpha = 1;
    const turn = lt >= 3.9, anim = lt > 3.0 && lt < 3.9 ? 'hurt' : 'idle';
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(hx - 14, hy - 1, 28, 4);
    drawChar(this.cls.id, hx, hy, { anim, idx: Math.floor(lt * 2) % 4, face: turn ? Math.PI / 2 : -Math.PI / 2, scale: 2, outline: '#ffc070', outlineA: turn ? 0 : 0.55 * (1 - p * 0.5) });
    this.glow(sunX, L.hy - 20, 70, '#ffd890', 0.25);
  },
  d4(lt, p, vw, vh) {
    this.land(lt + 6, p, vw, vh, 0, { crownOn: false }); this.birds(lt, vw, vh);
    this.once('bell', () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => setTimeout(() => Sfx.tone(f, 1.1, 'sine', 0.08), i * 420)));
    for (let i = 0; i < 40; i++) { const k = (lt * 0.07 + hash2(i, 3)) % 1; ctx.fillStyle = 'rgba(255,240,180,.55)'; ctx.fillRect(Math.round(hash2(i, 4) * vw + Math.sin(lt + i) * 6), Math.round(vh * 0.85 - k * vh * 0.6), 1, 1); }
    this.glow(vw * 0.3, vh * 0.42, 90, '#ffe0a0', 0.18);
  },
  // ======================= ФІНАЛ «ВДЯГНУТИ КОРОНУ» =======================
  w1(lt, p, vw, vh) {
    const worn = lt >= 4.2, { fl, cx } = this.hall(lt, vw, vh, worn ? PURPLE : FIRE, worn ? '#6a1a3a' : '#2a3a6a'), hy = fl + 26, head = hy - 50, py = fl + 22;
    ctx.fillStyle = '#1a1420'; ctx.fillRect(cx - 22, py - 1, 44, 5); ctx.fillStyle = '#2a2030'; ctx.fillRect(cx - 14, py - 3, 28, 3);
    let anim = 'idle', idx = Math.floor(lt * 2.2) % 4, ox = 0;
    if (lt >= 1.4 && lt < 4.2) { anim = 'cast'; idx = lt < 2.2 ? 0 : 1; } else if (lt >= 4.2 && lt < 5.6) { anim = 'hurt'; idx = 0; ox = Math.round(rand(-1.5, 1.5)); }
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(cx - 14, hy - 1, 28, 4);
    drawChar(this.cls.id, cx, hy, { anim, idx, face: Math.PI / 2, scale: 2, ox, outline: worn ? '#c060ff' : null, outlineA: 0.5 + Math.sin(lt * 6) * 0.3 });
    let cy;
    if (lt < 1.5) cy = py - 8 + Math.sin(lt * 3) * 0.8; else if (lt < 3.4) { const k = ease((lt - 1.5) / 1.4); cy = py - 8 + (head - 18 - (py - 8)) * Math.min(1, k) + Math.sin(lt * 6) * 0.6; } else if (lt < 4.2) cy = head - 18 + (head - 4 - (head - 18)) * ease((lt - 3.4) / 0.8); else cy = head - 4;
    this.glow(cx, cy, 24 + (worn ? 20 : 0), '#b040ff', 0.55);
    if (lt > 1.2 && lt < 4.2) for (let i = 0; i < 12; i++) { const kk = i / 12; ctx.fillStyle = i % 2 ? '#c060ff' : '#8030d0'; ctx.fillRect(Math.round(cx + Math.sin(lt * 4 + i) * (4 + kk * 8)), Math.round(cy + 2 + kk * (hy - 24 - cy)), 1, 1); }
    this.crown(cx, cy, 1.4, lt);
    if (worn) {
      const d = lt - 4.2; this.once('wear', () => { Sfx.play('boss'); Sfx.noise(0.8, 0.22, 300); this.shk = 1; });
      const f = clamp(1 - d / 0.7, 0, 1); if (f > 0) { ctx.fillStyle = `rgba(210,150,255,${f * 0.85})`; ctx.fillRect(0, 0, vw, vh); }
      this.glow(cx, hy - 24, 40 + Math.min(40, d * 25), '#a030ff', 0.5);
      for (let i = 0; i < 28; i++) { const k = (d * 0.4 + hash2(i, 2)) % 1; ctx.fillStyle = i % 2 ? '#e060ff' : '#7a20c0'; ctx.fillRect(Math.round(cx + Math.sin(i * 5 + d * 2) * (8 + k * 30)), Math.round(hy - 8 - k * 80), 1, 1); }
    }
  },
  w2(lt, p, vw, vh) {
    const { fl, cx } = this.hall(lt, vw, vh, PURPLE, '#6a1a3a'), hy = fl + 28, grow = ease(Math.min(1, lt / 2.2));
    [22, 34, 46].forEach((r0, ri) => { const r = r0 * grow, n = Math.max(8, Math.round(r)); for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + lt * (ri % 2 ? -1 : 1) * 0.6; ctx.fillStyle = i % 3 ? '#c060ff' : '#5a1a90'; ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(hy - 2 + Math.sin(a) * r * 0.3), 1, 1); } });
    for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283, len = grow * vw * 0.5; for (let s = 6; s < len; s += 2) { ctx.fillStyle = (s + i) % 5 ? '#2a0c40' : '#8030d0'; ctx.fillRect(Math.round(cx + Math.cos(a) * s), Math.round(hy - 2 + Math.sin(a) * s * 0.28 + Math.sin(s * 0.15 + lt * 3 + i) * 2), 2, 1); } }
    [0.06, 0.2, 0.8, 0.94].forEach((fx, i) => { for (let y = 0; y < grow * 80; y += 2) { ctx.fillStyle = y % 6 ? '#2a0c40' : '#8030d0'; ctx.fillRect(Math.round(vw * fx + Math.sin(y * 0.2 + lt * 2 + i) * 2 + (i % 2 ? -8 : 8)), fl + 4 - y, 1, 2); } });
    this.glow(cx, hy - 34, 70, '#9020e0', 0.38 + Math.sin(lt * 3) * 0.06);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(cx - 20, hy - 1, 40, 5);
    drawChar(this.cls.id, cx, hy, { anim: 'idle', idx: Math.floor(lt * 2) % 4, face: Math.PI / 2, scale: 3, outline: '#c060ff', outlineA: 0.45 + Math.sin(lt * 4) * 0.25 });
    this.crown(cx, hy - 71, 1.8, lt);
    for (let i = 0; i < 30; i++) { const k = (lt * 0.15 + hash2(i, 3)) % 1; ctx.fillStyle = `rgba(200,120,255,${(1 - k) * 0.7})`; ctx.fillRect(Math.round(cx + Math.sin(i * 7) * (20 + k * 60)), Math.round(hy - k * 120), 1, 1); }
  },
  w3(lt, p, vw, vh) {
    const L = this.land(lt, p, vw, vh, 1, { cg: ['#d030a0', '#ff4a2a'], big: 1.6 }), units = [];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) { const n = r * 9 + i, kind = i % 4 === 0 ? 'cultist' : i % 2 ? 'skeleton' : 'ghoul'; units.push({ n, i, kind, x: ((lt * 16 + i * 34 + r * 11) % (vw + 90)) - 45, y: L.hy + 22 + r * 8 }); }
    units.sort((a, b) => a.y - b.y).forEach((u) => {
      const x = Math.round(u.x), y = Math.round(u.y); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x - 5, y - 1, 10, 2);
      drawChar(u.kind, x, y, { anim: 'walk', idx: Math.floor(lt * 7 + u.n) % 6, face: 0, scale: 1 });
      if (u.i % 4 === 1) { ctx.fillStyle = '#2a1a1a'; ctx.fillRect(x + 4, y - 30, 1, 20); ctx.fillStyle = '#a01830'; for (let k = 0; k < 7; k++) ctx.fillRect(x + 5 + k, y - 30 + Math.round(Math.sin(lt * 6 + k * 0.7 + u.n)), 1, 5 - (k > 4 ? 1 : 0)); }
    });
    for (let i = 0; i < 4; i++) { const x = ((i * vw / 3 + lt * 6) % (vw + 160)) - 80; ctx.save(); ctx.translate(x, L.hy + 22 + i * 4); ctx.scale(5, 1); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 22); g.addColorStop(0, 'rgba(140,100,170,.14)'); g.addColorStop(1, 'rgba(140,100,170,0)'); ctx.fillStyle = g; ctx.fillRect(-22, -22, 44, 44); ctx.restore(); }
    const d = lt - 2.8; if (d > 0 && d < 0.5) { this.once('th', () => Sfx.noise(1.3, 0.2, 140)); if (Math.sin(d * 40) > -0.1) { ctx.fillStyle = `rgba(220,160,255,${(1 - d / 0.5) * 0.5})`; ctx.fillRect(0, 0, vw, vh); } }
  },
  w4(lt, p, vw, vh) {
    const cx = Math.round(vw / 2), fl = Math.round(vh * 0.76), hy = fl + 8;
    const bg = ctx.createLinearGradient(0, 0, 0, vh); bg.addColorStop(0, '#08030c'); bg.addColorStop(1, '#220c26'); ctx.fillStyle = bg; ctx.fillRect(0, 0, vw, vh);
    [0.08, 0.92].forEach((fx, i) => { const x = Math.round(vw * fx), fh = 12 + Math.round(Math.sin(lt * 11 + i) * 2); ctx.fillStyle = '#2a1630'; ctx.fillRect(x - 7, 0, 14, vh); ctx.fillStyle = '#a040ff'; ctx.fillRect(x - 3, fl - 60 - fh, 6, fh); ctx.fillStyle = '#ecc8ff'; ctx.fillRect(x - 1, fl - 60 - fh / 2, 2, fh / 2); this.glow(x, fl - 64, 60, '#a030ff', 0.3); });
    this.glow(cx, fl - 60, 110, '#8a20d0', 0.35 + Math.sin(lt * 3) * 0.05);
    ctx.fillStyle = '#16081c'; ctx.fillRect(cx - 36, fl - 112, 72, 112); ctx.fillStyle = '#c9a35a'; ctx.fillRect(cx - 36, fl - 112, 3, 112); ctx.fillRect(cx + 33, fl - 112, 3, 112); ctx.fillRect(cx - 36, fl - 112, 72, 3);
    for (let i = 0; i < 7; i++) { ctx.fillStyle = '#c9a35a'; ctx.fillRect(cx - 36 + i * 12, fl - 122 - (i % 2 ? 0 : 6), 3, 10 + (i % 2 ? 0 : 6)); }
    ctx.fillStyle = '#2a1030'; ctx.fillRect(cx - 28, fl - 104, 56, 100); ctx.fillStyle = '#3a1848'; ctx.fillRect(cx - 28, fl - 104, 2, 100);
    drawChar(this.cls.id, cx, hy, { anim: 'idle', idx: Math.floor(lt * 1.6) % 4, face: Math.PI / 2, scale: 3, outline: '#c060ff', outlineA: 0.4 + Math.sin(lt * 3) * 0.2, tint: '#2a0840', tintA: ease((lt - 0.8) / 4.5) * 0.7 });
    this.crown(cx, hy - 71, 1.8, lt);
    ctx.fillStyle = '#241028'; ctx.fillRect(cx - 32, fl - 6, 64, 30); ctx.fillStyle = '#c9a35a'; ctx.fillRect(cx - 32, fl - 6, 64, 2); ctx.fillStyle = '#1a0a1e'; ctx.fillRect(cx - 42, fl - 30, 10, 36); ctx.fillRect(cx + 32, fl - 30, 10, 36); ctx.fillStyle = '#c9a35a'; ctx.fillRect(cx - 42, fl - 30, 10, 2); ctx.fillRect(cx + 32, fl - 30, 10, 2);
    ctx.fillStyle = '#0c0510'; ctx.fillRect(0, fl + 24, vw, vh);
    for (let i = 0; i < 34; i++) { const k = (lt * 0.1 + hash2(i, 3)) % 1; ctx.fillStyle = `rgba(200,120,255,${(1 - k) * 0.7})`; ctx.fillRect(Math.round(hash2(i, 4) * vw), Math.round(vh * 0.9 - k * vh * 0.8), 1, 1); }
  },
};
