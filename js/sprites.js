'use strict';
// ===== ПІКСЕЛЬ-АРТ: допоміжне, зброя/пропси та текстури тайлів (персонажі — у rig.js) =====

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
function buildSprite(rows, legend, mirror = true) {
  const w = rows[0].length * (mirror ? 2 : 1), h = rows.length;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  rows.forEach((row, y) => {
    const full = mirror ? row + row.split('').reverse().join('') : row;
    for (let i = 0; i < full.length; i++) { const col = legend[full[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } }
  });
  return c;
}
function whiteVersion(src) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  return c;
}
// Автоматичний контур (колір сусіда, затемнений) + світло зверху й тінь знизу/справа
function postProcess(c, outline = true) {
  const g = c.getContext('2d'), w = c.width, h = c.height, src = g.getImageData(0, 0, w, h), d = src.data, out = g.createImageData(w, h), o = out.data;
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
  const mul = (i, f) => { o[i] = Math.min(255, d[i] * f); o[i + 1] = Math.min(255, d[i + 1] * f); o[i + 2] = Math.min(255, d[i + 2] * f); o[i + 3] = d[i + 3]; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d[i + 3] > 40) {
      if (!A(x, y - 1)) mul(i, 1.22); else if (!A(x + 1, y) || !A(x, y + 1)) mul(i, 0.8); else mul(i, 1);
    } else if (outline) {
      const nb = [[0, -1], [-1, 0], [1, 0], [0, 1]].map(([dx, dy]) => [x + dx, y + dy]).find(([nx, ny]) => A(nx, ny) > 40);
      if (nb) { const j = (nb[1] * w + nb[0]) * 4; o[i] = d[j] * 0.22; o[i + 1] = d[j + 1] * 0.2; o[i + 2] = d[j + 2] * 0.25; o[i + 3] = 255; }
    }
  }
  g.putImageData(out, 0, 0); return c;
}

const SWORD = [
  '..g.....................',
  '..g.wwwwwwwwwwwwwwwww...',
  'bbgWWWWWWWWWWWWWWWWWWWw.',
  '..g.wwwwwwwwwwwwwwwww...',
  '..g.....................',
];
const GRAVE = ['..dddd..', '.dssssd.', '.dsSssd.', '.dssssd.', '.dsSSsd.', '.dssssd.', 'dddddddd'];

let SPR = null;
function initSprites() {
  SPR = {};
  SPR.sword = postProcess(buildSprite(SWORD, { g: '#d8b26a', w: '#8a94a8', W: '#dfe6f2', b: '#5a3d24' }, false));
  SPR.grave = buildSprite(GRAVE, { d: '#1a1a20', s: '#5a5a64', S: '#3a3a44' });
  initRig();
}

// --- Текстури тайлів (16×16, малюються 2× → 32) ---
function buildTiles(th, seed) {
  const rng = mulberry32(seed), T = { floor: [], top: [], face: [] };
  const mk = (fn) => { const c = document.createElement('canvas'); c.width = c.height = 16; fn(c.getContext('2d')); return c; };
  const noise = (x, base, amt, dens) => { for (let y = 0; y < 16; y++) for (let i = 0; i < 16; i++) if (rng() < dens) { x.fillStyle = shade(base, 1 + (rng() - 0.5) * amt); x.fillRect(i, y, 1, 1); } };
  th.floor.forEach((base) => {
    for (let v = 0; v < 2; v++) T.floor.push(mk((x) => {
      x.fillStyle = base; x.fillRect(0, 0, 16, 16); noise(x, base, 0.35, 0.5);
      // бруківка
      x.fillStyle = shade(base, 0.62);
      const off = v * 4;
      x.fillRect(0, 0, 16, 1); x.fillRect(0, 8, 16, 1);
      x.fillRect((off + 5) % 16, 1, 1, 7); x.fillRect((off + 12) % 16, 9, 1, 7); x.fillRect((off + 1) % 16, 9, 1, 7);
      x.fillStyle = shade(base, 1.18); x.fillRect(1, 1, 3, 1); x.fillRect(9, 9, 3, 1);
      if (rng() < 0.35) { x.fillStyle = th.accent; x.globalAlpha = 0.5; x.fillRect(Math.floor(rng() * 13), Math.floor(rng() * 14), 2, 1); x.globalAlpha = 1; }
    }));
  });
  for (let v = 0; v < 3; v++) {
    T.top.push(mk((x) => {
      x.fillStyle = th.wall; x.fillRect(0, 0, 16, 16); noise(x, th.wall, 0.6, 0.35);
      x.fillStyle = shade(th.wall, 1.6); for (let i = 0; i < 3; i++) x.fillRect(Math.floor(rng() * 15), Math.floor(rng() * 15), 2, 1);
    }));
    T.face.push(mk((x) => {
      x.fillStyle = th.face; x.fillRect(0, 0, 16, 16); noise(x, th.face, 0.3, 0.5);
      x.fillStyle = shade(th.face, 0.5);
      for (let r = 0; r < 4; r++) { x.fillRect(0, r * 4 + 3, 16, 1); const o = (r % 2 ? 4 : 0) + v * 2; x.fillRect((o + 3) % 16, r * 4, 1, 3); x.fillRect((o + 11) % 16, r * 4, 1, 3); }
      x.fillStyle = shade(th.face, 1.35); for (let r = 0; r < 4; r++) x.fillRect(((r % 2 ? 4 : 0) + v * 2 + 4) % 14, r * 4, 3, 1);
      x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 13, 16, 3);
      x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(0, 0, 16, 1);
    }));
  }
  return T;
}
