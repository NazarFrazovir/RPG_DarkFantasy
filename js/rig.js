'use strict';
// ===== РИГ ПЕРСОНАЖІВ: пікселі малюються кодом по позі, кадри кешуються =====
// Кожен персонаж — функція draw(h, pose, view, idx). Далі postProcess додає контур і світло/тінь.
// Анімації: idle(4) walk(6) atk(4) cast(3) hurt(1). Вид: 'f' — спереду, 'b' — ззаду. Праворуч/ліворуч — віддзеркалення.

const ANIMS = {
  idle: { n: 4, pose: (i) => ({ bob: [0, 0, 1, 1][i], armL: [0, 1, 1, 0][i], armR: [0, 1, 1, 0][i], legL: 0, legR: 0, sq: 0, lean: 0, sway: i % 2 }) },
  walk: {
    n: 6, pose: (i) => {
      const s = Math.sin((i / 6) * Math.PI * 2), lift = (v) => (v > 0.8 ? 2 : v > 0.25 ? 1 : 0);
      return { bob: [1, 0, 0, 1, 0, 0][i], armL: Math.round(-s * 2), armR: Math.round(s * 2), legL: lift(s), legR: lift(-s), sq: 0, lean: 0, sway: Math.round(s) };
    },
  },
  atk: {
    n: 4, pose: (i) => [
      { bob: 0, armL: -2, armR: -4, legL: 0, legR: 0, sq: 0, lean: -1, sway: 0 },
      { bob: 1, armL: 2, armR: 3, legL: 0, legR: 0, sq: 0, lean: 2, sway: 1 },
      { bob: 1, armL: 1, armR: 2, legL: 0, legR: 0, sq: 1, lean: 2, sway: 1 },
      { bob: 0, armL: 0, armR: 0, legL: 0, legR: 0, sq: 0, lean: 1, sway: 0 },
    ][i],
  },
  cast: {
    n: 3, pose: (i) => [
      { bob: 0, armL: -3, armR: -3, legL: 0, legR: 0, sq: 0, lean: 0, sway: 0 },
      { bob: -1, armL: -5, armR: -5, legL: 0, legR: 0, sq: 0, lean: 0, sway: 1 },
      { bob: 1, armL: 1, armR: 1, legL: 0, legR: 0, sq: 1, lean: 1, sway: 0 },
    ][i],
  },
  hurt: { n: 1, pose: () => ({ bob: 1, armL: -2, armR: -1, legL: 0, legR: 0, sq: 1, lean: -2, sway: 0, hurt: true }) },
};

function tone(hex) { return { b: hex, l: shade(hex, 1.3), d: shade(hex, 0.68), x: shade(hex, 0.42) }; }

const CH = {};
function defChar(name, size, scale, fn) { CH[name] = { size, scale, fn, cache: new Map() }; }

function renderFrame(size, fn, pose, view, idx) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x | 0, y | 0, w, h); };
  fn({ R, size }, pose, view, idx);
  return postProcess(c);
}
function frameCanvas(name, anim, idx, view, flash) {
  const ch = CH[name], key = anim + idx + view + (flash ? 'F' : '');
  let c = ch.cache.get(key); if (c) return c;
  c = flash ? whiteVersion(frameCanvas(name, anim, idx, view, false)) : renderFrame(ch.size, ch.fn, ANIMS[anim].pose(idx), view, idx);
  ch.cache.set(key, c); return c;
}

// ---------- Малювання персонажів ----------
function drawKnight({ R }, p, v) {
  const st = tone('#aab4c6'), dk = tone('#59637a'), gd = tone('#d8b26a'), rd = tone('#a82a34'), by = p.bob, lx = p.lean, front = v === 'f';
  [[8, p.legL], [13, p.legR]].forEach(([x, l]) => { R(x, 17, 3, 4 - l, dk.b); R(x, 17, 1, 4 - l, dk.l); R(x + 2, 17, 1, 4 - l, dk.d); R(x - 1, 20 - l, 5, 3, dk.d); R(x - 1, 20 - l, 5, 1, dk.b); });
  R(7 + lx, 10 + by, 10, 7 - p.sq, st.b); R(7 + lx, 10 + by, 2, 7 - p.sq, st.l); R(15 + lx, 10 + by, 2, 7 - p.sq, st.d);
  if (front) { R(10 + lx, 11 + by, 4, 6 - p.sq, rd.b); R(10 + lx, 11 + by, 1, 6 - p.sq, rd.l); R(13 + lx, 11 + by, 1, 6 - p.sq, rd.d); R(11 + lx, 12 + by, 2, 2, gd.b); R(11 + lx, 12 + by, 1, 1, gd.l); }
  R(7 + lx, 16 + by - p.sq, 10, 1, gd.d); R(11 + lx, 16 + by - p.sq, 2, 1, gd.l);
  if (!front) { R(8 + lx, 10 + by, 8, 10, rd.b); R(8 + lx, 10 + by, 2, 10, rd.l); R(14 + lx, 10 + by, 2, 10, rd.d); R(9 + lx, 19 + by, 2, 1, rd.x); R(13 + lx, 19 + by, 2, 1, rd.x); }
  [[4, p.armL], [17, p.armR]].forEach(([x, a]) => { R(x + lx, 11 + by + a, 3, 5, st.d); R(x + lx, 11 + by + a, 1, 5, st.b); R(x + lx, 16 + by + a, 3, 2, dk.x); });
  if (front) { R(1 + lx, 12 + by + p.armL, 4, 7, '#5a4a34'); R(1 + lx, 12 + by + p.armL, 4, 1, gd.b); R(1 + lx, 18 + by + p.armL, 4, 1, gd.d); R(2 + lx, 14 + by + p.armL, 2, 2, gd.l); }
  R(4 + lx, 9 + by, 4, 3, st.l); R(16 + lx, 9 + by, 4, 3, st.l); R(4 + lx, 11 + by, 4, 1, gd.b); R(16 + lx, 11 + by, 4, 1, gd.b);
  R(8 + lx, 3 + by, 8, 7, st.b); R(8 + lx, 3 + by, 2, 7, st.l); R(14 + lx, 3 + by, 2, 7, st.d); R(9 + lx, 2 + by, 6, 1, st.l);
  if (front) {
    R(11 + lx, 4 + by, 2, 3, st.d); R(9 + lx, 6 + by, 6, 2, '#0d0d12');
    if (p.hurt) { R(10 + lx, 7 + by, 2, 1, '#ff5030'); R(13 + lx, 7 + by, 2, 1, '#ff5030'); } else { R(10 + lx, 6 + by, 1, 1, '#ffb050'); R(13 + lx, 6 + by, 1, 1, '#ffb050'); }
    R(9 + lx, 9 + by, 6, 1, dk.d);
  } else R(11 + lx, 3 + by, 2, 7, st.d);
  R(11 + lx, 0 + by, 2, 3, rd.b); R(12 + lx, 0 + by, 1, 2, rd.l); if (!front) R(11 + lx, 2 + by, 2, 5, rd.b);
}

// Універсальна мантія: капюшон/капелюх, обличчя, подол, рукави
function drawRobe({ R }, p, v, idx, o) {
  const rb = tone(o.robe), hd = tone(o.hood), tr = tone(o.trim), skin = tone(o.skin), by = p.bob + (o.float ? Math.round(Math.sin(idx * 1.6) * 1) - 1 : 0), lx = p.lean, front = v === 'f';
  if (o.short) {
    [[8, p.legL], [13, p.legR]].forEach(([x, l]) => { R(x, 17, 3, 4 - l, tone('#4a3a2a').b); R(x, 17, 1, 4 - l, tone('#4a3a2a').l); R(x - 1, 20 - l, 5, 3, '#2a1c12'); R(x - 1, 20 - l, 5, 1, '#4a3424'); });
    for (let y = 14; y <= 18; y++) { const w = y < 16 ? 10 : 12, x = 12 - w / 2 + (y > 16 ? p.sway : 0); R(x, y + by, w, 1, rb.b); R(x, y + by, 1, 1, rb.l); R(x + w - 1, y + by, 1, 1, rb.d); }
    R(6, 18 + by, 12, 1, tr.d);
  } else {
    if (!o.ghost) { R(9, 21 - p.legL, 2, 2, '#241812'); R(13, 21 - p.legR, 2, 2, '#241812'); }
    for (let y = 14; y <= 21; y++) {
      const w = y < 16 ? 10 : 12, x = 12 - w / 2 + (y > 17 ? p.sway : 0) + (y > 19 ? -p.sway : 0);
      for (let i = 0; i < w; i++) {
        if (o.ghost && y >= 19 && (i + y + idx) % 3 === 0) continue;
        R(x + i, y + by * (y < 17 ? 1 : 0), 1, 1, i === 0 ? rb.l : i === w - 1 ? rb.d : ((i + y) % 5 === 0 ? rb.d : rb.b));
      }
      if (y === 21) R(x, y, w, 1, o.ghost ? rb.l : tr.d);
    }
  }
  R(7 + lx, 10 + by, 10, 5 - p.sq, rb.b); R(7 + lx, 10 + by, 2, 5 - p.sq, rb.l); R(15 + lx, 10 + by, 2, 5 - p.sq, rb.d); R(7 + lx, 14 + by - p.sq, 10, 1, tr.b);
  if (front && o.chest) R(11 + lx, 11 + by, 2, 2, o.chest);
  [[4, p.armL], [17, p.armR]].forEach(([x, a]) => { R(x + lx, 11 + by + a, 3, 6, rb.b); R(x + lx, 11 + by + a, 1, 6, rb.l); R(x + lx, 16 + by + a, 3, 1, tr.b); R(x + lx, 17 + by + a, 3, 2, skin.b); });
  if (o.bone) { R(4 + lx, 9 + by, 4, 2, '#dcd4bc'); R(16 + lx, 9 + by, 4, 2, '#dcd4bc'); R(4 + lx, 10 + by, 4, 1, '#9a927c'); R(16 + lx, 10 + by, 4, 1, '#9a927c'); }
  if (o.quiver && !front) { R(15 + lx, 7 + by, 3, 9, '#6a4a2a'); R(15 + lx, 7 + by, 1, 9, '#8a6a3a'); R(15 + lx, 5 + by, 1, 3, '#ddd'); R(17 + lx, 6 + by, 1, 2, '#ddd'); R(16 + lx, 4 + by, 1, 4, '#b04040'); }
  // голова
  if (o.hat) {
    R(7 + lx, 4 + by, 10, 6, hd.b);
    if (front) { R(9 + lx, 5 + by, 6, 5, skin.b); R(9 + lx, 5 + by, 6, 1, hd.x); }
    R(5 + lx, 4 + by, 14, 2, o.hat); R(5 + lx, 4 + by, 14, 1, shade(o.hat, 1.3)); R(8 + lx, 2 + by, 8, 2, o.hat); R(10 + lx, 0 + by, 4, 2, o.hat); R(11 + lx, 0 + by, 2, 1, shade(o.hat, 1.4));
    R(8 + lx, 3 + by, 8, 1, o.trim);
  } else {
    R(9 + lx, 2 + by, 6, 1, hd.l); R(8 + lx, 3 + by, 8, 1, hd.b); R(7 + lx, 4 + by, 10, 6, hd.b); R(7 + lx, 4 + by, 1, 6, hd.l); R(16 + lx, 4 + by, 1, 6, hd.d); R(8 + lx, 10 + by, 8, 1, hd.d);
    if (o.tall) { R(11 + lx, 0 + by, 2, 2, hd.b); R(10 + lx, 2 + by, 4, 1, hd.l); }
    if (front) { R(9 + lx, 5 + by, 6, 5, skin.b); R(9 + lx, 5 + by, 6, 1, hd.x); R(9 + lx, 5 + by, 1, 5, skin.d); }
    else { R(11 + lx, 3 + by, 2, 7, hd.d); }
  }
  if (front) {
    const ey = o.hat ? 7 : 7;
    if (o.skull) { R(9 + lx, 6 + by, 6, 4, '#dcd4bc'); R(9 + lx, 6 + by, 1, 4, '#fff'); R(14 + lx, 6 + by, 1, 4, '#9a927c'); R(10 + lx, 7 + by, 2, 2, '#0a1a14'); R(13 + lx, 7 + by, 2, 2, '#0a1a14'); R(10 + lx, 8 + by, 1, 1, o.eye); R(14 + lx, 8 + by, 1, 1, o.eye); R(11 + lx, 10 + by, 3, 1, '#9a927c'); }
    else if (p.hurt) { R(10 + lx, ey + by, 2, 1, '#201010'); R(13 + lx, ey + by, 2, 1, '#201010'); }
    else { R(10 + lx, ey + by, 1, 1, o.eye); R(13 + lx, ey + by, 1, 1, o.eye); if (o.glow) { R(9 + lx, ey + by, 1, 1, o.glow); R(14 + lx, ey + by, 1, 1, o.glow); } }
    if (o.beard) { R(9 + lx, 8 + by, 6, 3, '#e8e2d4'); R(10 + lx, 11 + by, 4, 1, '#c8c2b4'); R(9 + lx, 8 + by, 1, 3, '#fff'); }
    if (o.ember) { R(5 + lx, 8 + by, 1, 1, '#ff9a2a'); R(18 + lx, 9 + by, 1, 1, '#ffd24a'); }
  }
  if (o.staffStatic) { R(2 + lx, 6 + by, 1, 16, '#6a4a2a'); R(2 + lx, 6 + by, 1, 2, '#8a6a3a'); R(1 + lx, 5 + by, 3, 2, '#9ab0c8'); }
}

function drawSkeleton({ R }, p, v) {
  const bn = tone('#dcd4bc'), by = p.bob, lx = p.lean, front = v === 'f', cl = tone('#6a3a2a');
  [[9, p.legL], [13, p.legR]].forEach(([x, l]) => { R(x, 17, 2, 4 - l, bn.b); R(x, 17, 1, 4 - l, bn.l); R(x - 1, 20 - l, 4, 3, bn.d); R(x - 1, 20 - l, 4, 1, bn.b); });
  R(8, 16 + by, 8, 2, bn.d); R(8, 16 + by, 8, 1, bn.b);
  R(8 + lx, 10 + by, 8, 5, '#241c18'); R(11 + lx, 9 + by, 2, 8, bn.d); [10, 12, 14].forEach((y) => { R(8 + lx, y + by, 8, 1, bn.b); R(8 + lx, y + by, 1, 1, bn.l); });
  if (front) { R(10 + lx, 17 + by, 4, 3, cl.b); R(10 + lx, 17 + by, 1, 3, cl.l); R(13 + lx, 19 + by, 1, 1, cl.d); }
  [[5, p.armL], [17, p.armR]].forEach(([x, a]) => { R(x + lx, 10 + by + a, 2, 7, bn.b); R(x + lx, 10 + by + a, 1, 7, bn.l); R(x - 1 + lx, 16 + by + a, 4, 2, bn.d); });
  R(6 + lx, 9 + by, 3, 2, bn.l); R(15 + lx, 9 + by, 3, 2, bn.l);
  R(8 + lx, 3 + by, 8, 6, bn.b); R(8 + lx, 3 + by, 2, 6, bn.l); R(14 + lx, 3 + by, 2, 6, bn.d); R(9 + lx, 9 + by, 6, 2, bn.d);
  R(8 + lx, 2 + by, 8, 3, '#8a6a46'); R(8 + lx, 2 + by, 8, 1, '#b08a5a'); R(8 + lx, 4 + by, 8, 1, '#5a4430');
  if (front) {
    R(9 + lx, 6 + by, 2, 2, '#14100c'); R(13 + lx, 6 + by, 2, 2, '#14100c'); R(11 + lx, 8 + by, 2, 1, '#14100c');
    if (p.hurt) { R(9 + lx, 7 + by, 2, 1, '#e03030'); R(13 + lx, 7 + by, 2, 1, '#e03030'); } else { R(10 + lx, 7 + by, 1, 1, '#ff4040'); R(13 + lx, 7 + by, 1, 1, '#ff4040'); }
    R(9 + lx, 9 + by, 6, 1, bn.l); [10, 12, 14].forEach((x) => R(x + lx, 9 + by, 1, 1, '#14100c'));
  } else { R(11 + lx, 5 + by, 1, 4, bn.d); }
}

function drawGhoul({ R }, p, v) {
  const gr = tone('#7f9068'), by = p.bob, lx = p.lean + 1, front = v === 'f', rg = tone('#4a3a30');
  [[8, p.legL], [14, p.legR]].forEach(([x, l]) => { R(x, 17, 3, 4 - l, gr.d); R(x, 17, 1, 4 - l, gr.b); R(x - 1, 20 - l, 5, 3, gr.b); R(x - 1, 22 - l, 1, 1, '#d8d0b0'); R(x + 1, 22 - l, 1, 1, '#d8d0b0'); R(x + 3, 22 - l, 1, 1, '#d8d0b0'); });
  R(7, 15 + by, 10, 4, rg.b); R(7, 15 + by, 2, 4, rg.l); R(8, 19 + by, 2, 1, rg.d); R(12, 19 + by, 2, 1, rg.d); R(15, 19 + by, 1, 1, rg.d);
  R(6 + lx, 9 + by, 12, 7, gr.b); R(6 + lx, 9 + by, 3, 7, gr.l); R(15 + lx, 9 + by, 3, 7, gr.d);
  if (front) { [11, 13].forEach((y) => R(9 + lx, y + by, 6, 1, gr.x)); R(11 + lx, 10 + by, 2, 5, gr.d); } else { R(11 + lx, 9 + by, 2, 7, gr.d); R(9 + lx, 10 + by, 1, 1, gr.x); R(14 + lx, 12 + by, 1, 1, gr.x); }
  [[2, p.armL], [17, p.armR]].forEach(([x, a]) => { R(x + lx, 10 + by + a, 4, 9, gr.b); R(x + lx, 10 + by + a, 1, 9, gr.l); R(x + lx, 19 + by + a, 4, 2, gr.d); R(x + lx, 21 + by + a, 1, 1, '#e0d8b8'); R(x + 1 + lx, 21 + by + a, 1, 1, '#e0d8b8'); R(x + 3 + lx, 21 + by + a, 1, 1, '#e0d8b8'); });
  R(8 + lx, 5 + by, 8, 6, gr.b); R(8 + lx, 5 + by, 2, 6, gr.l); R(14 + lx, 5 + by, 2, 6, gr.d); R(7 + lx, 7 + by, 1, 2, gr.d); R(16 + lx, 7 + by, 1, 2, gr.d);
  if (front) {
    R(9 + lx, 7 + by, 2, 1, p.hurt ? '#301010' : '#ff3030'); R(13 + lx, 7 + by, 2, 1, p.hurt ? '#301010' : '#ff3030');
    R(9 + lx, 9 + by, 6, 2, '#2a0a0a'); R(10 + lx, 9 + by, 1, 1, '#e8e0c0'); R(12 + lx, 9 + by, 1, 1, '#e8e0c0'); R(14 + lx, 9 + by, 1, 1, '#e8e0c0');
  } else { R(10 + lx, 5 + by, 4, 1, gr.x); }
}

function drawBrute({ R }, p, v) {
  const fl = tone('#a87a6a'), dk = tone('#6a4a42'), by = p.bob, lx = p.lean, front = v === 'f', ir = tone('#6a6a76'), wd = tone('#6a4a2a'), sc = '#3a1a1a';
  [[8, p.legL], [16, p.legR]].forEach(([x, l]) => { R(x, 19, 5, 5 - l, fl.d); R(x, 19, 2, 5 - l, fl.b); R(x - 1, 23 - l, 7, 4, ir.d); R(x - 1, 23 - l, 7, 1, ir.b); });
  R(5 + lx, 9 + by, 18, 11 - p.sq, fl.b); R(5 + lx, 9 + by, 3, 11 - p.sq, fl.l); R(20 + lx, 9 + by, 3, 11 - p.sq, fl.d);
  if (front) { R(14 + lx, 10 + by, 1, 8, sc); [11, 13, 15, 17].forEach((y) => R(11 + lx, y + by, 7, 1, sc)); R(9 + lx, 11 + by, 2, 2, dk.d); R(18 + lx, 14 + by, 2, 2, dk.d); } else { R(14 + lx, 9 + by, 1, 11, dk.d); R(10 + lx, 12 + by, 8, 1, sc); R(10 + lx, 15 + by, 8, 1, sc); }
  R(5 + lx, 18 + by - p.sq, 18, 2, wd.d); R(5 + lx, 18 + by - p.sq, 18, 1, wd.b); if (front) { R(12 + lx, 18 + by - p.sq, 4, 3, '#d8d0c0'); R(13 + lx, 19 + by - p.sq, 1, 1, '#2a2020'); R(15 + lx, 19 + by - p.sq, 1, 1, '#2a2020'); }
  R(0 + lx, 10 + by + p.armL, 5, 12, fl.b); R(0 + lx, 10 + by + p.armL, 1, 12, fl.l); R(-0 + lx, 20 + by + p.armL, 6, 5, fl.d); R(0 + lx, 20 + by + p.armL, 6, 1, fl.b); R(0 + lx, 12 + by + p.armL, 5, 1, ir.b);
  R(23 + lx, 10 + by + p.armR, 5, 11, fl.b); R(27 + lx, 10 + by + p.armR, 1, 11, fl.d); R(22 + lx, 20 + by + p.armR, 6, 5, fl.d);
  R(24 + lx, 0 + by + p.armR, 3, 21, wd.b); R(24 + lx, 0 + by + p.armR, 1, 21, wd.l); R(23 + lx, -0 + by + p.armR, 5, 7, wd.d); R(23 + lx, 0 + by + p.armR, 5, 1, wd.l); R(22 + lx, 3 + by + p.armR, 1, 2, '#ccc'); R(28 + lx - 1, 5 + by + p.armR, 1, 2, '#ccc');
  R(10 + lx, 3 + by, 8, 7, fl.b); R(10 + lx, 3 + by, 2, 7, fl.l); R(16 + lx, 3 + by, 2, 7, fl.d);
  if (front) {
    R(10 + lx, 5 + by, 8, 1, dk.x); R(11 + lx, 6 + by, 2, 2, p.hurt ? '#301010' : '#ffdd44'); R(15 + lx, 6 + by, 2, 2, p.hurt ? '#301010' : '#ffdd44'); R(12 + lx, 7 + by, 1, 1, '#2a1a00'); R(16 + lx, 7 + by, 1, 1, '#2a1a00');
    R(11 + lx, 9 + by, 6, 2, '#3a1a1a'); R(11 + lx, 8 + by, 1, 2, '#e8e0c0'); R(16 + lx, 8 + by, 1, 2, '#e8e0c0');
  } else R(12 + lx, 3 + by, 4, 1, dk.d);
}

function drawBoss({ R }, p, v) {
  const pl = tone('#3a2f48'), pl2 = tone('#6a5a88'), gd = tone('#e0b040'), cp = tone('#7a1a2a'), by = p.bob, lx = p.lean, front = v === 'f';
  if (front) { R(4 + lx, 10 + by, 20, 15, cp.d); R(4 + lx, 10 + by, 2, 15, cp.b); [5, 9, 13, 17, 21].forEach((x) => R(x + lx, 23, 2, 3, cp.x)); }
  [[8, p.legL], [16, p.legR]].forEach(([x, l]) => { R(x, 19, 4, 6 - l, pl.b); R(x, 19, 1, 6 - l, pl2.b); R(x - 1, 23 - l, 6, 4, pl.d); R(x - 1, 23 - l, 6, 1, pl2.b); });
  R(7 + lx, 9 + by, 14, 11 - p.sq, pl.b); R(7 + lx, 9 + by, 3, 11 - p.sq, pl2.b); R(18 + lx, 9 + by, 3, 11 - p.sq, pl.d);
  if (front) { R(11 + lx, 11 + by, 6, 6, '#1a0c28'); R(12 + lx, 12 + by, 4, 4, '#4a1a78'); R(13 + lx, 13 + by, 2, 2, '#e0a0ff'); R(10 + lx, 11 + by, 1, 6, gd.d); R(17 + lx, 11 + by, 1, 6, gd.d); }
  else { R(4 + lx, 9 + by, 20, 16, cp.b); R(4 + lx, 9 + by, 3, 16, cp.l); R(21 + lx, 9 + by, 3, 16, cp.d); R(13 + lx, 9 + by, 2, 16, cp.d); [5, 9, 13, 17, 21].forEach((x) => R(x + lx, 24, 2, 2, cp.x)); }
  R(7 + lx, 19 + by - p.sq, 14, 2, gd.d); R(7 + lx, 19 + by - p.sq, 14, 1, gd.b); R(12 + lx, 19 + by - p.sq, 4, 2, gd.l);
  [[1, p.armL], [21, p.armR]].forEach(([x, a]) => { R(x + lx, 12 + by + a, 6, 8, pl.b); R(x + lx, 12 + by + a, 1, 8, pl2.b); R(x + lx, 20 + by + a, 6, 4, pl.d); R(x + lx, 20 + by + a, 6, 1, pl2.b); });
  R(1 + lx, 8 + by, 7, 5, pl2.b); R(20 + lx, 8 + by, 7, 5, pl2.b); R(1 + lx, 12 + by, 7, 1, gd.d); R(20 + lx, 12 + by, 7, 1, gd.d);
  R(2 + lx, 4 + by, 2, 4, '#9a8ab8'); R(24 + lx, 4 + by, 2, 4, '#9a8ab8'); R(3 + lx, 2 + by, 1, 2, '#9a8ab8'); R(24 + lx, 2 + by, 1, 2, '#9a8ab8');
  R(10 + lx, 3 + by, 8, 7, pl.b); R(10 + lx, 3 + by, 2, 7, pl2.b); R(16 + lx, 3 + by, 2, 7, pl.d);
  R(10 + lx, 1 + by, 8, 3, gd.b); R(10 + lx, 1 + by, 8, 1, gd.l); R(10 + lx, 3 + by, 8, 1, gd.d);
  [10, 12, 15, 17].forEach((x) => R(x + lx, 0 + by, 1, 1, gd.l));
  if (front) { R(11 + lx, 5 + by, 6, 2, '#12081a'); R(12 + lx, 5 + by, 1, 2, p.hurt ? '#601010' : '#ff3a3a'); R(15 + lx, 5 + by, 1, 2, p.hurt ? '#601010' : '#ff3a3a'); R(12 + lx, 8 + by, 4, 1, pl.x); }
  else R(13 + lx, 3 + by, 2, 7, pl.d);
}

function initRig() {
  const rb = (o) => (h, p, v, idx) => drawRobe(h, p, v, idx, o);
  defChar('knight', 24, 2, drawKnight);
  defChar('pyro', 24, 2, rb({ robe: '#4a1c18', hood: '#7a2a1c', trim: '#d8b26a', skin: '#e2c9a6', eye: '#ffb347', hat: '#8a2a14', ember: true }));
  defChar('ranger', 24, 2, rb({ robe: '#3a5a34', hood: '#3f6a4a', trim: '#8a6a3a', skin: '#d8bea0', eye: '#a6ffb0', short: true, quiver: true }));
  defChar('necro', 24, 2, rb({ robe: '#1f3a34', hood: '#2a5a4e', trim: '#8ad4b8', skin: '#dcd4bc', eye: '#66ffb4', skull: true, bone: true, chest: '#66ffb4' }));
  defChar('cultist', 24, 2, rb({ robe: '#3a1a4a', hood: '#4a2260', trim: '#a02a6a', skin: '#0d0810', eye: '#d060ff', glow: '#7a2aa0', tall: true, float: true, chest: '#d060ff' }));
  defChar('cultistElite', 24, 2, rb({ robe: '#5a1830', hood: '#8a2040', trim: '#e0a040', skin: '#0d0810', eye: '#ff7040', glow: '#a03020', tall: true, float: true, chest: '#ff7040' }));
  defChar('raven', 24, 2, rb({ robe: '#4a4038', hood: '#6a6a70', trim: '#a08a5a', skin: '#e8dcc8', eye: '#6a8aa0', beard: true, staffStatic: true }));
  defChar('eira', 24, 2, rb({ robe: '#7a8ab8', hood: '#9aaad8', trim: '#dfe8ff', skin: '#e8f0ff', eye: '#b0d0ff', ghost: true, float: true }));
  defChar('skeleton', 24, 2, drawSkeleton);
  defChar('minion', 24, 2, (h, p, v) => drawSkeleton({ R: (x, y, w, hh, c) => h.R(x, y, w, hh, tint(c)) }, p, v));
  defChar('ghoul', 24, 2, drawGhoul);
  defChar('brute', 28, 2, drawBrute);
  defChar('boss', 28, 3, drawBoss);
}
// зелений відтінок для кістяних слуг некроманта
function tint(col) {
  const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(col), n = m ? [+m[1], +m[2], +m[3]] : [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)];
  const l = (n[0] + n[1] + n[2]) / 3; return `rgb(${Math.round(l * 0.55)},${Math.min(255, Math.round(l * 1.15 + 20))},${Math.round(l * 0.85)})`;
}

// ---------- Малювання персонажа у світі ----------
// o: anim, idx, face, scale, flash, alpha, ox, oy, rot, sx, sy, nodir
function drawChar(name, x, y, o = {}) {
  const ch = CH[name], face = o.face || 0, view = Math.sin(face) < -0.45 ? 'b' : 'f', flip = Math.cos(face) < -0.001 && !o.noflip;
  const anim = o.anim || 'idle', n = ANIMS[anim].n, idx = ((o.idx || 0) % n + n) % n | 0;
  const img = frameCanvas(name, anim, idx, view, o.flash), sc = o.scale || ch.scale, w = ch.size * sc, h = (ch.size - 1) * sc;
  ctx.save(); ctx.translate(Math.round(x + (o.ox || 0)), Math.round(y + (o.oy || 0)));
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale((flip ? -1 : 1) * (o.sx || 1), o.sy || 1);
  if (o.cut) { const cut = Math.floor(o.cut * ch.size); ctx.drawImage(img, 0, cut, ch.size, ch.size - cut, -w / 2, -h + cut * sc, w, (ch.size - cut) * sc); }
  else ctx.drawImage(img, -w / 2, -h, w, ch.size * sc);
  ctx.restore();
}
