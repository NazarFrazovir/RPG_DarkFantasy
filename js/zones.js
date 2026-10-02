'use strict';
// ===== ЗОНИ: рукотворні локації (село, інтер'єри): тайли, будівлі, мешканці, тварини =====
// Зона = { name, w, h, base, theme:{ambient,tint}, music, interior, build(B) }. B — конструктор карти (ZB).
// map.t: 0 — прохідно, 1 — стіна (інтер'єр), 2 — перешкода (дерево, будинок, вода...). map.g — вид підлоги/землі.

const ZONES = {};
const GK = { GRASS: 0, DIRT: 1, COBBLE: 2, WHEAT: 3, WATER: 4, WOOD: 5, STONE: 6, CABBAGE: 7, PUMPKIN: 8, DGRASS: 9, RUG: 10, SAND: 11, WALL: 12, MARBLE: 13, DAIS: 14, CARPET: 15, STEP: 16, SOOT: 17 };
let zobjs = [], zlights = [], npcs = [], critters = [], chimneys = [], ZT = null;
const zrand = (a, b) => a + Math.random() * (b - a);

// ---------- Малювання спрайтів ----------
const SPC = {};
function spr(key, w, h, fn) {
  if (SPC[key]) return SPC[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  fn((a, b, cw, ch, col) => { x.fillStyle = col; x.fillRect(a, b, cw, ch); }, x);
  return (SPC[key] = c);
}
function blit(c, x, y, s = 2) { ctx.drawImage(c, Math.round(x), Math.round(y), c.width * s, c.height * s); }
function disc(R, cx, cy, r, col) { for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + 0.5)); R(cx - w, cy + y, w * 2 + 1, 1, col); } }
const zsh = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };

// ---------- Текстури землі ----------
function buildZoneTiles() {
  const rng = mulberry32(777), T = {};
  const mk = (fn, v) => { const c = document.createElement('canvas'); c.width = c.height = 16; fn(c.getContext('2d'), v); return c; };
  const noise = (x, base, amt, dens) => { for (let y = 0; y < 16; y++) for (let i = 0; i < 16; i++) if (rng() < dens) { x.fillStyle = zsh(base, 1 + (rng() - 0.5) * amt); x.fillRect(i, y, 1, 1); } };
  const px = (x, a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  const kinds = {
    [GK.GRASS]: (x) => { px(x, 0, 0, 16, 16, '#3f5c2b'); noise(x, '#3f5c2b', 0.3, 0.55); for (let i = 0; i < 5; i++) { const a = Math.floor(rng() * 14), b = Math.floor(rng() * 13); px(x, a, b + 1, 1, 2, '#5a7a38'); px(x, a, b, 1, 1, '#6c8c44'); } },
    [GK.DGRASS]: (x) => { px(x, 0, 0, 16, 16, '#2c4422'); noise(x, '#2c4422', 0.35, 0.55); for (let i = 0; i < 4; i++) { const a = Math.floor(rng() * 14), b = Math.floor(rng() * 13); px(x, a, b + 1, 1, 2, '#3c5a2c'); } },
    [GK.DIRT]: (x) => { px(x, 0, 0, 16, 16, '#6d5535'); noise(x, '#6d5535', 0.4, 0.6); for (let i = 0; i < 3; i++) { const a = Math.floor(rng() * 13), b = Math.floor(rng() * 14); px(x, a, b, 2, 1, '#8a7048'); px(x, a + 1, b + 1, 1, 1, '#4a3a22'); } },
    [GK.SAND]: (x) => { px(x, 0, 0, 16, 16, '#8a7a56'); noise(x, '#8a7a56', 0.3, 0.55); },
    [GK.COBBLE]: (x, v) => {
      px(x, 0, 0, 16, 16, '#4a4a54'); noise(x, '#4a4a54', 0.25, 0.4);
      for (let r = 0; r < 4; r++) { const off = (r % 2 ? 4 : 0) + v * 2; for (let c = -1; c < 3; c++) { const bx = ((off + c * 8) % 16 + 16) % 16, by = r * 4; px(x, bx, by, 7, 3, zsh('#6a6a76', 0.85 + rng() * 0.3)); px(x, bx, by, 7, 1, zsh('#8a8a96', 0.9 + rng() * 0.2)); } }
    },
    [GK.STONE]: (x, v) => { px(x, 0, 0, 16, 16, '#4c4a52'); noise(x, '#4c4a52', 0.2, 0.35); px(x, 0, 0, 16, 1, '#2a2830'); px(x, 0, 8, 16, 1, '#2a2830'); px(x, (v * 5 + 4) % 16, 1, 1, 7, '#2a2830'); px(x, (v * 5 + 11) % 16, 9, 1, 7, '#2a2830'); px(x, 1, 1, 3, 1, '#6a6872'); },
    [GK.WOOD]: (x, v) => { px(x, 0, 0, 16, 16, '#6b4a2c'); for (let i = 0; i < 4; i++) { px(x, i * 4, 0, 1, 16, '#3c2a18'); px(x, i * 4 + 1, 0, 2, 16, zsh('#7a5632', 0.9 + ((i + v) % 3) * 0.08)); } noise(x, '#6b4a2c', 0.25, 0.3); px(x, (v * 3) % 12 + 1, (v * 7) % 12 + 2, 1, 1, '#2a1c10'); },
    [GK.RUG]: (x) => { px(x, 0, 0, 16, 16, '#7a2430'); noise(x, '#7a2430', 0.2, 0.4); px(x, 0, 0, 16, 1, '#c9a35a'); px(x, 0, 15, 16, 1, '#c9a35a'); px(x, 7, 7, 2, 2, '#c9a35a'); },
    [GK.WHEAT]: (x, v) => { px(x, 0, 0, 16, 16, '#5a4528'); noise(x, '#5a4528', 0.3, 0.5); for (let i = 0; i < 4; i++) { const a = i * 4 + 1; px(x, a, 2, 2, 14, '#8a6a34'); for (let k = 0; k < 4; k++) { const h = 3 + ((i * 3 + k * 5 + v * 2) % 4); px(x, a, 14 - k * 3 - h + 3, 2, h, k % 2 ? '#d8b44c' : '#e8c860'); } px(x, a, 1, 2, 2, '#f0d878'); } },
    [GK.CABBAGE]: (x, v) => { px(x, 0, 0, 16, 16, '#4e3c24'); noise(x, '#4e3c24', 0.3, 0.5); [[3, 3], [11, 3], [7, 10], [1, 11], [13, 11]].forEach(([a, b], i) => { if ((i + v) % 5 === 4) return; disc((c1, c2, c3, c4, col) => px(x, c1, c2, c3, c4, col), a + 1, b + 1, 3, '#2f6a2c'); px(x, a - 1, b - 1, 3, 2, '#5aa048'); px(x, a, b, 2, 2, '#8ac864'); }); },
    [GK.PUMPKIN]: (x, v) => { px(x, 0, 0, 16, 16, '#4e3c24'); noise(x, '#4e3c24', 0.3, 0.5); [[2, 3], [10, 2], [6, 9], [12, 10], [1, 11]].forEach(([a, b], i) => { if ((i + v) % 4 === 3) return; px(x, a, b, 5, 4, '#c8601c'); px(x, a, b, 5, 1, '#e8841c'); px(x, a + 1, b + 3, 4, 1, '#8a3c10'); px(x, a + 2, b - 1, 1, 1, '#3a6a24'); px(x, a + 2, b, 1, 4, '#a0480e'); }); },
    [GK.WALL]: (x, v) => { px(x, 0, 0, 16, 16, '#5a5a66'); noise(x, '#5a5a66', 0.2, 0.4); for (let r = 0; r < 4; r++) { px(x, 0, r * 4 + 3, 16, 1, '#2a2a34'); const o = (r % 2 ? 4 : 0) + v * 2; px(x, (o + 3) % 16, r * 4, 1, 3, '#2a2a34'); px(x, (o + 11) % 16, r * 4, 1, 3, '#2a2a34'); px(x, (o + 5) % 16, r * 4, 3, 1, '#7a7a88'); } },
    [GK.MARBLE]: (x, v) => { px(x, 0, 0, 16, 16, '#4a4858'); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { px(x, i * 8, j * 8, 8, 8, (i + j) % 2 ? '#54526a' : '#403e50'); px(x, i * 8, j * 8, 8, 1, 'rgba(255,255,255,.08)'); } px(x, 0, 7, 16, 1, '#2a2834'); px(x, 7, 0, 1, 16, '#2a2834'); noise(x, '#4a4858', 0.15, 0.25); if (v === 1) { px(x, 2, 3, 5, 1, 'rgba(255,255,255,.12)'); px(x, 3, 4, 3, 1, 'rgba(255,255,255,.08)'); } },
    [GK.DAIS]: (x, v) => { px(x, 0, 0, 16, 16, '#6e6c80'); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) px(x, i * 8, j * 8, 8, 8, (i + j) % 2 ? '#7a788e' : '#66647a'); px(x, 0, 7, 16, 1, '#3a384a'); px(x, 7, 0, 1, 16, '#3a384a'); noise(x, '#6e6c80', 0.15, 0.25); px(x, 1, 1 + v, 4, 1, 'rgba(255,255,255,.18)'); },
    [GK.CARPET]: (x, v) => { px(x, 0, 0, 16, 16, '#7a1e2c'); noise(x, '#7a1e2c', 0.2, 0.35); px(x, 0, 0, 1, 16, '#2a0a10'); px(x, 15, 0, 1, 16, '#2a0a10'); px(x, 1, 0, 2, 16, '#c9a35a'); px(x, 13, 0, 2, 16, '#c9a35a'); px(x, 3, 0, 1, 16, '#5a1220'); px(x, 12, 0, 1, 16, '#5a1220'); const o = (v % 2) * 8; px(x, 7, 2 + o, 2, 4, '#c9a35a'); px(x, 6, 4 + o, 4, 1, '#c9a35a'); px(x, 7, 0 + o, 2, 1, '#e8c878'); },
    [GK.SOOT]: (x, v) => { px(x, 0, 0, 16, 16, '#38332f'); noise(x, '#38332f', 0.35, 0.6); for (let i = 0; i < 4; i++) px(x, (i * 5 + v * 3) % 15, (i * 7 + v) % 15, 2, 1, '#1e1a18'); px(x, 0, 0, 16, 1, '#2a2624'); px(x, 3 + v, 7, 4, 1, '#52483f'); },
    [GK.STEP]: (x) => { px(x, 0, 0, 16, 16, '#8a8898'); px(x, 0, 0, 16, 4, '#a8a6b8'); px(x, 0, 4, 16, 1, '#c8c6d8'); px(x, 0, 11, 16, 5, '#3a384a'); px(x, 0, 11, 16, 1, '#5a586a'); noise(x, '#8a8898', 0.15, 0.25); },
    [GK.WATER]: (x) => { px(x, 0, 0, 16, 16, '#264a68'); noise(x, '#264a68', 0.25, 0.4); px(x, 2, 4, 5, 1, '#4a7a9a'); px(x, 9, 10, 5, 1, '#4a7a9a'); },
  };
  Object.keys(kinds).forEach((k) => { T[k] = [0, 1, 2].map((v) => mk(kinds[k], v)); });
  return T;
}
const PATHLIKE = (k) => k === GK.DIRT || k === GK.COBBLE || k === GK.SAND;
const GRASSLIKE = (k) => k === GK.GRASS || k === GK.DGRASS;

let ZGC = null;
function paintZoneGround(c2, t, x0, y0, x1, y1, ripples) {
  const gAt = (x, y) => (x < 0 || y < 0 || x >= map.w || y >= map.h ? -1 : map.g[y * map.w + x]);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * map.w + x, px = x * TS, py = y * TS, h = hash2(x, y);
    if (map.interior && map.t[i] === 1) { c2.drawImage((!(y + 1 < map.h && map.t[i + map.w] === 1) ? TILES.face : TILES.top)[Math.floor(h * 3)], px, py, TS, TS); continue; }
    const k = map.g[i];
    c2.drawImage(ZT[k][Math.floor(h * 3)], px, py, TS, TS);
    if (k === GK.WATER) {
      [[0, -1, px, py, TS, 3], [0, 1, px, py + TS - 3, TS, 3], [-1, 0, px, py, 3, TS], [1, 0, px + TS - 3, py, 3, TS]].forEach(([dx, dy, a, b, c, d]) => { if (gAt(x + dx, y + dy) !== GK.WATER) { c2.fillStyle = 'rgba(20,30,20,.5)'; c2.fillRect(a, b, c, d); } });
    } else if (PATHLIKE(k)) {
      [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy], si) => {
        if (!GRASSLIKE(gAt(x + dx, y + dy))) return;
        for (let n = 0; n < 8; n++) {
          const hh = hash2(x * 8 + n + si * 3, y * 8 + si), d = 2 + Math.floor(hh * 3), a = n * 4;
          c2.fillStyle = hh > 0.5 ? '#4a6a30' : '#3a5a28';
          if (dy) c2.fillRect(px + a, dy < 0 ? py : py + TS - d, 4, d); else c2.fillRect(dx < 0 ? px : px + TS - d, py + a, d, 4);
        }
      });
    } else if (k === GK.GRASS) {
      if (h > 0.955) { c2.fillStyle = '#2a4a1c'; c2.fillRect(px + 10, py + 14, 4, 3); c2.fillStyle = ['#e8d048', '#e86a8a', '#f0f0f0', '#a08af0'][Math.floor(hash2(y, x) * 4)]; c2.fillRect(px + 12, py + 10, 4, 4); c2.fillStyle = '#fff6b0'; c2.fillRect(px + 13, py + 11, 2, 2); }
      else if (h < 0.06) { c2.fillStyle = '#85a85a'; c2.fillRect(px + 8, py + 8, 2, 8); c2.fillRect(px + 12, py + 12, 2, 6); c2.fillRect(px + 4, py + 14, 2, 4); }
    }
  }
}
function drawZoneTiles(t) {
  if (!ZT) ZT = buildZoneTiles();
  if (!ZGC || ZGC.map !== map) { // статичну землю малюємо один раз на зону
    const c = document.createElement('canvas'); c.width = map.w * TS; c.height = map.h * TS; paintZoneGround(c.getContext('2d'), 0, 0, 0, map.w - 1, map.h - 1); ZGC = { map, c };
  }
  const sx = Math.max(0, Math.floor(cam.x - W / 2) - 2), sy = Math.max(0, Math.floor(cam.y - H / 2) - 2), ex = Math.min(map.w * TS, Math.ceil(cam.x + W / 2) + 2), ey = Math.min(map.h * TS, Math.ceil(cam.y + H / 2) + 2);
  if (ex > sx && ey > sy) ctx.drawImage(ZGC.c, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
  const x0 = Math.max(0, Math.floor(sx / TS)), x1 = Math.min(map.w - 1, Math.floor(ex / TS)), y0 = Math.max(0, Math.floor(sy / TS)), y1 = Math.min(map.h - 1, Math.floor(ey / TS));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (map.g[y * map.w + x] === GK.WATER && !(map.interior && map.t[y * map.w + x] === 1)) {
    const h = hash2(x, y), w = Math.sin(t * 1.4 + x * 0.9 + y * 0.6); ctx.fillStyle = `rgba(160,200,230,${0.1 + 0.08 * w})`; ctx.fillRect(x * TS + 4 + Math.round(w * 4), y * TS + 8 + (h > 0.5 ? 8 : -2), 12, 2);
  }
}

// ---------- Конструктор карти ----------
class ZB {
  constructor(w, h, base, interior) {
    this.w = w; this.h = h; this.interior = interior;
    this.g = new Uint8Array(w * h).fill(base); this.t = new Uint8Array(w * h);
    this.objs = []; this.lights = []; this.npcs = []; this.foes = []; this.noTree = new Uint8Array(w * h); this.crit = []; this.inter = []; this.props = []; this.spawns = {}; this.chim = []; this.bonfire = null;
  }
  fill(k, x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < this.w && j < this.h) this.g[j * this.w + i] = k; }
  block(x, y, w = 1, h = 1, v = 2) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < this.w && j < this.h) this.t[j * this.w + i] = v; }
  free(x, y, w = 1, h = 1) { this.block(x, y, w, h, 0); }
  ellipse(k, cx, cy, rx, ry, solidV) {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++)
      if (((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 <= 1 && i >= 0 && j >= 0 && i < this.w && j < this.h) { this.g[j * this.w + i] = k; if (solidV) this.t[j * this.w + i] = solidV; }
  }
  line(k, pts, wd) { // товстий ламаний шлях; pts — центри у тайлах
    for (let s = 0; s < pts.length - 1; s++) {
      const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
      for (let i = 0; i <= n; i++) this.fill(k, Math.round(ax + ((bx - ax) * i) / n - (wd - 1) / 2), Math.round(ay + ((by - ay) * i) / n - (wd - 1) / 2), wd, wd);
    }
  }
  walls(x, y, w, h) { // стіни кімнати по периметру + підлога всередині
    this.block(x, y, w, 1, 1); this.block(x, y + h - 1, w, 1, 1); this.block(x, y, 1, h, 1); this.block(x + w - 1, y, 1, h, 1);
  }
  obj(o) { this.objs.push(o); return o; }
  light(x, y, r, a = 0.9) { this.lights.push({ x, y, r, a, ph: Math.random() * 6 }); }
  spawn(name, tx, ty) { this.spawns[name] = { x: (tx + 0.5) * TS, y: (ty + 0.5) * TS }; }
  door(x, y, r, label, act) { this.inter.push({ x, y, r, label, act }); }
  npc(d) { this.npcs.push(d); }
  foe(type, x, y, o = {}) { this.foes.push(Object.assign({ type, x, y }, o)); }
  clear(cx, cy, rx, ry) { for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) if (((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 <= 1 && i >= 0 && j >= 0 && i < this.w && j < this.h) this.noTree[j * this.w + i] = 1; }
  animal(d) { this.crit.push(d); }
}

// ---------- Будівлі ----------
const WALLS = { plaster: ['#c9b48a', '#a8946a', '#8a7650'], stone: ['#8a8a92', '#6a6a74', '#4a4a54'], log: ['#7a5632', '#5a3e22', '#3e2a16'], white: ['#e0d8c4', '#bcb29a', '#8c8268'] };
const ROOFS = { red: ['#9a4030', '#7a2e22', '#b85a44'], slate: ['#5a5a6c', '#44445a', '#7a7a90'], thatch: ['#b09a58', '#8a7640', '#cfba74'], moss: ['#4a6a4a', '#365236', '#6a8a5a'], blue: ['#3e5a7a', '#2c4460', '#5a7a9a'] };
function houseSprite(w, h, st) {
  const key = ['house', w, h, st.wall, st.roof, st.door, st.sign || '', st.blank ? 1 : 0].join('|');
  return spr(key, w * 16, h * 16, (R) => {
    const W2 = w * 16, H2 = h * 16, fh = 24, ry = H2 - fh, wl = WALLS[st.wall], rf = ROOFS[st.roof], dx = (st.door !== undefined ? st.door : Math.floor(w / 2)) * 16 + 4;
    // дах
    R(0, 0, W2, ry + 4, rf[0]);
    for (let y = 0; y < ry + 4; y += 4) {
      R(0, y + 3, W2, 1, rf[1]);
      for (let x = (y / 4) % 2 ? 3 : 0; x < W2; x += 6) { R(x, y, 1, 3, rf[1]); if ((x + y) % 5 === 0) R(x + 1, y, 3, 1, rf[2]); }
    }
    if (st.roof === 'thatch') for (let i = 0; i < W2 * 2; i++) { const a = (i * 7) % W2, b = (i * 13) % (ry + 2); R(a, b, 1, 2, i % 3 ? rf[1] : rf[2]); }
    R(0, 0, W2, 2, rf[2]); R(0, 0, 2, ry + 4, rf[2]); R(W2 - 2, 0, 2, ry + 4, rf[1]);
    R(0, Math.floor(ry / 2), W2, 1, rf[2]); R(0, Math.floor(ry / 2) + 1, W2, 1, rf[1]);
    R(0, ry + 2, W2, 2, '#2a1a14'); R(0, ry + 4, W2, 3, 'rgba(0,0,0,.35)');
    // фасад
    R(0, ry + 4, W2, fh - 4, wl[0]);
    for (let y = ry + 4; y < H2; y += 4) R(0, y, W2, 1, wl[1]);
    if (st.wall === 'stone') for (let y = ry + 4; y < H2; y += 6) for (let x = ((y - ry) / 6) % 2 ? 4 : 0; x < W2; x += 9) R(x, y, 1, 6, wl[2]);
    if (st.wall === 'log') for (let y = ry + 5; y < H2; y += 5) { R(0, y, W2, 1, wl[2]); R(0, y + 1, W2, 1, wl[0]); }
    if (st.wall === 'plaster' || st.wall === 'white') { R(0, ry + 4, 3, fh - 4, '#3e2a18'); R(W2 - 3, ry + 4, 3, fh - 4, '#3e2a18'); R(0, ry + 4, W2, 2, '#3e2a18'); R(0, H2 - 4, W2, 4, '#555560'); }
    else R(0, H2 - 3, W2, 3, wl[2]);
    if (st.blank) return;
    // двері
    R(dx - 1, H2 - 15, 10, 15, '#2a1a10'); R(dx, H2 - 14, 8, 14, '#5a3a20'); R(dx, H2 - 14, 8, 2, '#6a4a2a'); R(dx + 3, H2 - 14, 1, 14, '#3e2814'); R(dx + 6, H2 - 7, 1, 2, '#e0c060'); R(dx - 2, H2 - 1, 12, 1, '#6a6a74');
    // вікна
    const nWin = Math.max(1, Math.floor((W2 - 24) / 30));
    for (let i = 0; i < w; i++) {
      const wx = i * 16 + 5; if (Math.abs(wx - dx) < 14) continue; if (nWin < 1) continue;
      if ((i % 2) === 0 && i !== Math.floor(w / 2) || w <= 4) { if (wx < 4 || wx > W2 - 12) continue; R(wx - 1, ry + 7, 8, 9, '#2a1a10'); R(wx, ry + 8, 6, 7, '#ffcf6a'); R(wx, ry + 12, 6, 3, '#e89a3c'); R(wx + 3, ry + 8, 1, 7, '#2a1a10'); R(wx, ry + 11, 6, 1, '#2a1a10'); R(wx - 1, ry + 16, 8, 1, '#5a3a20'); }
    }
    // димар
    if (st.chimney !== false && w >= 4) { const cx = W2 - 14 - ((w * 3) % 5); R(cx, 2, 6, 10, '#6a6a74'); R(cx, 2, 6, 2, '#8a8a96'); R(cx + 5, 4, 1, 8, '#4a4a54'); R(cx + 1, 6, 2, 1, '#4a4a54'); }
    // вивіска
    if (st.sign) {
      const sx = dx + 14, sy = H2 - 20; R(sx - 2, sy - 2, 2, 2, '#3e2a18'); R(sx - 2, sy - 2, 12, 1, '#3e2a18'); R(sx, sy, 9, 9, '#3e2a18'); R(sx + 1, sy + 1, 7, 7, '#d8c08a');
      const g = { mug: () => { R(sx + 2, sy + 2, 4, 5, '#8a5a1a'); R(sx + 2, sy + 2, 4, 1, '#f0e0a0'); R(sx + 6, sy + 3, 1, 3, '#8a5a1a'); }, anvil: () => { R(sx + 2, sy + 3, 5, 2, '#444'); R(sx + 3, sy + 5, 3, 1, '#444'); R(sx + 2, sy + 6, 5, 1, '#444'); }, bread: () => { R(sx + 2, sy + 3, 5, 3, '#c8883a'); R(sx + 3, sy + 3, 1, 1, '#e8b860'); R(sx + 5, sy + 4, 1, 1, '#e8b860'); }, cross: () => { R(sx + 4, sy + 2, 1, 5, '#555'); R(sx + 2, sy + 4, 5, 1, '#555'); }, herb: () => { R(sx + 4, sy + 3, 1, 4, '#2a6a2c'); R(sx + 2, sy + 3, 2, 2, '#4a9a40'); R(sx + 5, sy + 4, 2, 2, '#4a9a40'); }, coin: () => { disc(R, sx + 4, sy + 4, 2, '#c9a020'); R(sx + 4, sy + 3, 1, 3, '#7a5a10'); } };
      (g[st.sign] || g.coin)();
    }
  });
}
ZB.prototype.house = function (x, y, w, h, o = {}) {
  const st = { wall: o.wall || 'plaster', roof: o.roof || 'red', door: o.door, sign: o.sign, chimney: o.chimney, blank: o.blank };
  const spriteC = houseSprite(w, h, st), dtx = x + (o.door !== undefined ? o.door : Math.floor(w / 2));
  this.block(x, y, w, h, 2);
  this.obj({ x0: x * TS, y0: y * TS, x1: (x + w) * TS, y1: (y + h) * TS, y: (y + h) * TS, draw: () => blit(spriteC, x * TS, y * TS) });
  if (o.blank) return { dtx, doorX: 0, doorY: 0 };
  const doorY = (y + h) * TS, doorX = (dtx + 0.5) * TS;
  for (let i = 0; i < w; i++) { if (Math.abs(i - (dtx - x)) < 1) continue; if (i % 2 === 0 && i > 0 && i < w - 1) this.light((x + i + 0.7) * TS, (y + h - 0.7) * TS, 62, 0.8); }
  this.light(doorX, doorY - 6, 56, 0.7);
  if (st.chimney !== false && w >= 4) this.chim.push({ x: (x + w) * TS - 14 * 2 / 2 * 1 - 4, y: y * TS + 6 });
  if (o.spawn) this.spawn(o.spawn, dtx, y + h + 1);
  if (o.enter) this.door(doorX, doorY + 12, 40, 'Увійти: ' + (o.name || ''), () => zoneGo(o.enter, o.enterSpawn || 'door'));
  return { dtx, doorX, doorY };
};

// ---------- Рослини, паркани, дрібниці ----------
function treeSprite(kind, v) {
  return spr('tree' + kind + v, 36, 46, (R) => {
    const rn = mulberry32(v * 31 + kind.length);
    if (kind === 'pine') {
      R(16, 34, 4, 10, '#3c2a1a'); R(16, 34, 1, 10, '#5a3e24');
      const c = ['#1e3a26', '#2a4e34', '#3a6a44'];
      for (let i = 0; i < 4; i++) { const wd = 24 - i * 5, y = 30 - i * 8; for (let r = 0; r < 9; r++) { const w2 = Math.round(wd * (r + 1) / 9); R(18 - Math.floor(w2 / 2), y - 8 + r, w2, 1, c[0]); R(18 - Math.floor(w2 / 2), y - 8 + r, Math.max(1, Math.floor(w2 / 3)), 1, c[2]); R(18 - Math.floor(w2 / 2) + Math.floor(w2 * 0.66), y - 8 + r, Math.ceil(w2 / 3), 1, c[1]); } }
    } else {
      R(16, 28, 4, 16, kind === 'dead' ? '#2e2a26' : '#4a3320'); R(16, 28, 1, 16, kind === 'dead' ? '#46403a' : '#6a4a2c'); R(14, 42, 8, 2, kind === 'dead' ? '#26221e' : '#3a2818');
      if (kind === 'dead') { R(10, 20, 6, 2, '#2e2a26'); R(8, 16, 2, 6, '#2e2a26'); R(20, 16, 7, 2, '#2e2a26'); R(26, 10, 2, 8, '#2e2a26'); R(17, 6, 2, 22, '#2e2a26'); R(13, 8, 2, 6, '#2e2a26'); return; }
      const cols = kind === 'autumn' ? ['#6a2e14', '#9a4a1c', '#c87828', '#e8a448'] : ['#22421e', '#2c5426', '#3a6c30', '#54904a'];
      disc(R, 18, 17, 16, cols[0]); disc(R, 16, 15, 13, cols[1]); disc(R, 14, 12, 8, cols[2]);
      for (let i = 0; i < 14; i++) R(8 + Math.floor(rn() * 18), 6 + Math.floor(rn() * 20), 2, 1, cols[3]);
      R(11, 9, 5, 2, cols[3]);
    }
  });
}
ZB.prototype.tree = function (tx, ty, kind = 'oak') {
  const v = Math.floor(hash2(tx, ty) * 3), c = treeSprite(kind, v); this.block(tx, ty, 1, 1, 2);
  const x = (tx + 0.5) * TS - 36, y = (ty + 1) * TS - 90;
  this.obj({ x0: x, y0: y, x1: x + 72, y1: y + 92, y: (ty + 1) * TS, draw: () => blit(c, x, y) });
};
ZB.prototype.deco = function (tx, ty, w, h, key, cw, ch, fn, o = {}) {
  const c = spr(key, cw, ch, fn); if (o.solid !== false) this.block(tx, ty, w, h, 2);
  const x = tx * TS + (o.ox || 0), y = (ty + h) * TS - ch * 2 + (o.oy || 0);
  const ob = this.obj({ x0: x, y0: y, x1: x + cw * 2, y1: y + ch * 2, y: (ty + h) * TS + (o.sort || 0), draw: () => blit(c, x, y) });
  if (o.light) this.light(x + cw, y + ch, o.light[0], o.light[1]);
  return ob;
};
ZB.prototype.cust = function (x0, y0, x1, y1, sortY, draw) { return this.obj({ x0, y0, x1, y1, y: sortY, draw }); };
ZB.prototype.bush = function (tx, ty) { this.deco(tx, ty, 1, 1, 'bush' + Math.floor(hash2(tx, ty) * 3), 16, 12, (R) => { disc(R, 8, 7, 6, '#26441e'); disc(R, 7, 6, 5, '#34602a'); R(5, 3, 3, 1, '#5a9248'); R(9, 5, 2, 1, '#5a9248'); }, { solid: false }); };
ZB.prototype.rock = function (tx, ty) { this.deco(tx, ty, 1, 1, 'rock', 16, 12, (R) => { disc(R, 8, 7, 6, '#4a4a54'); disc(R, 7, 6, 5, '#6a6a76'); R(4, 3, 4, 1, '#9a9aa6'); R(10, 9, 3, 1, '#3a3a44'); }); };
ZB.prototype.flowers = function (tx, ty, col) { this.deco(tx, ty, 1, 1, 'fl' + col, 16, 12, (R) => { for (let i = 0; i < 6; i++) { const a = 1 + ((i * 5) % 13), b = 2 + ((i * 7) % 8); R(a, b + 3, 1, 3, '#2a5a24'); R(a - 1, b, 3, 3, col); R(a, b + 1, 1, 1, '#fff2a0'); } }, { solid: false }); };
ZB.prototype.fence = function (x0, y0, x1, y1, gaps = []) {
  const horiz = y0 === y1, n = horiz ? x1 - x0 : y1 - y0;
  for (let i = 0; i <= n; i++) {
    const tx = horiz ? x0 + i : x0, ty = horiz ? y0 : y0 + i;
    if (gaps.includes(i)) continue;
    const c = spr('fence' + (horiz ? 'h' : 'v'), 16, 16, (R) => {
      if (horiz) { R(0, 7, 16, 2, '#5a3e24'); R(0, 7, 16, 1, '#7a5a34'); R(0, 11, 16, 2, '#5a3e24'); R(0, 11, 16, 1, '#7a5a34'); R(1, 4, 3, 12, '#4a3220'); R(1, 4, 1, 12, '#6a4a2c'); R(13, 4, 3, 12, '#4a3220'); }
      else { R(6, 0, 4, 16, '#4a3220'); R(6, 0, 1, 16, '#6a4a2c'); R(6, 4, 4, 1, '#7a5a34'); R(4, 6, 8, 2, '#5a3e24'); }
    });
    this.block(tx, ty, 1, 1, 2);
    this.obj({ x0: tx * TS, y0: ty * TS, x1: tx * TS + TS, y1: (ty + 1) * TS, y: (ty + 1) * TS - (horiz ? 0 : 0), draw: () => blit(c, tx * TS, ty * TS) });
  }
};
ZB.prototype.lamp = function (tx, ty) {
  this.deco(tx, ty, 1, 1, 'lamp', 10, 30, (R) => { R(4, 8, 2, 22, '#2a2a30'); R(3, 28, 4, 2, '#3a3a42'); R(2, 2, 6, 7, '#3a3a42'); R(3, 3, 4, 5, '#ffd06a'); R(4, 4, 2, 3, '#fff4c0'); R(1, 1, 8, 1, '#4a4a54'); }, { ox: 6, light: [150, 0.95] });
};
ZB.prototype.barrel = function (tx, ty) { this.deco(tx, ty, 1, 1, 'barrel', 12, 14, (R) => { R(1, 2, 10, 11, '#6a4424'); R(1, 2, 2, 11, '#8a5e30'); R(9, 2, 2, 11, '#4a2e16'); R(1, 5, 10, 1, '#3a3a40'); R(1, 10, 10, 1, '#3a3a40'); R(2, 1, 8, 2, '#8a5e30'); }, { ox: 4 }); };
ZB.prototype.crate = function (tx, ty) { this.deco(tx, ty, 1, 1, 'crate', 14, 14, (R) => { R(0, 1, 14, 13, '#7a5a30'); R(0, 1, 14, 2, '#9a7a44'); R(0, 12, 14, 2, '#5a3e1c'); R(0, 1, 2, 13, '#5a3e1c'); R(12, 1, 2, 13, '#5a3e1c'); R(2, 3, 10, 9, '#6a4a26'); for (let i = 0; i < 9; i++) R(2 + i, 3 + i, 1, 1, '#4a3216'); }, { ox: 2 }); };
ZB.prototype.hay = function (tx, ty) { this.deco(tx, ty, 2, 1, 'hay', 32, 24, (R) => { disc(R, 16, 14, 12, '#a88a38'); disc(R, 15, 13, 10, '#c8aa4a'); for (let i = 0; i < 14; i++) R(6 + (i * 7) % 20, 6 + (i * 5) % 14, 3, 1, i % 2 ? '#8a6e28' : '#e0c868'); R(6, 20, 20, 3, '#7a5e20'); }); };
ZB.prototype.well = function (tx, ty) { this.deco(tx, ty, 2, 2, 'well', 32, 40, (R) => { R(2, 18, 28, 20, '#6a6a76'); R(2, 18, 28, 3, '#9a9aa8'); for (let y = 21; y < 38; y += 4) { R(2, y, 28, 1, '#4a4a56'); for (let x = (y % 8 ? 4 : 0); x < 28; x += 8) R(2 + x, y, 1, 4, '#4a4a56'); } R(8, 22, 16, 8, '#1a2a3a'); R(8, 22, 16, 1, '#2a3a4a'); R(3, 4, 3, 22, '#5a3e24'); R(26, 4, 3, 22, '#5a3e24'); R(1, 2, 30, 4, '#7a2e22'); R(1, 2, 30, 1, '#b85a44'); R(1, 6, 30, 1, '#4a1e16'); R(15, 6, 1, 8, '#ccc'); R(13, 13, 5, 4, '#7a5a30'); }); };
ZB.prototype.sign = function (tx, ty, text) {
  const ob = this.deco(tx, ty, 1, 1, 'signpost', 16, 24, (R) => { R(7, 8, 2, 16, '#4a3220'); R(1, 2, 14, 9, '#6a4a28'); R(1, 2, 14, 1, '#8a6a3c'); R(2, 4, 11, 1, '#c9a35a'); R(2, 7, 8, 1, '#c9a35a'); }, { ox: 8 });
  if (text) this.door((tx + 0.5) * TS, (ty + 0.8) * TS, 42, 'Прочитати табличку', () => showDialog(text.map((l) => ({ who: '', text: l }))));
  return ob;
};
ZB.prototype.stall = function (tx, ty, w, o = {}) {
  const aw = o.awning || '#a03a2a', aw2 = o.awning2 || '#e8e0c8', goods = o.goods || 'fruit', cw = w * 16;
  this.deco(tx, ty, w, 1, 'stall' + [w, aw, goods].join(''), cw, 44, (R) => {
    R(1, 10, 2, 30, '#4a3220'); R(cw - 3, 10, 2, 30, '#4a3220');
    for (let i = 0; i < cw; i += 4) { R(i, 0, 4, 9, (i / 4) % 2 ? aw2 : aw); R(i, 9, 4, 3, (i / 4) % 2 ? zsh(aw2, 0.8) : zsh(aw, 0.8)); }
    R(0, 0, cw, 1, 'rgba(255,255,255,.3)'); R(0, 12, cw, 3, 'rgba(0,0,0,.35)');
    R(0, 24, cw, 14, '#6a4a28'); R(0, 24, cw, 3, '#8a6a3c'); R(0, 36, cw, 2, '#3a2814');
    for (let i = 0; i < w * 3; i++) {
      const gx = 3 + i * 5, gy = 21;
      if (goods === 'fruit') { disc(R, gx + 1, gy + 1, 2, i % 3 ? '#c83a2a' : '#78b838'); R(gx, gy - 1, 1, 1, '#fff'); }
      else if (goods === 'potion') { R(gx, gy - 3, 3, 6, ['#d0304e', '#4ac8e0', '#6ad84a'][i % 3]); R(gx + 1, gy - 5, 1, 2, '#ddd'); R(gx, gy - 3, 1, 5, 'rgba(255,255,255,.4)'); }
      else if (goods === 'weapon') { R(gx, gy - 6, 1, 8, '#b0b8c8'); R(gx - 1, gy + 1, 3, 1, '#c9a35a'); }
      else if (goods === 'cloth') { R(gx - 1, gy - 2, 5, 4, ['#7a3a6a', '#3a5a8a', '#8a6a2a'][i % 3]); R(gx - 1, gy - 2, 5, 1, 'rgba(255,255,255,.3)'); }
      else { R(gx, gy - 2, 4, 3, '#c8883a'); R(gx + 1, gy - 2, 1, 1, '#e8b860'); }
    }
  }, { light: o.light === false ? null : [90, 0.7] });
};

// ---------- Мешканці ----------
function makeNpc(d) {
  const n = Object.assign({ mode: 'static', radius: 0, speed: 36, face: 1.2, r: 10, wait: zrand(0.5, 3), anim: 0, busy: false, talked: 0, moving: false, stuck: 0, rpi: 0 }, d);
  n.x = (d.x + 0.5) * TS; n.y = (d.y + 0.5) * TS; n.hx = n.x; n.hy = n.y; n.tx = n.x; n.ty = n.y;
  n.it = { x: n.x, y: n.y, r: d.ir || 46, npc: n, label: (n.vendor ? 'Торгувати: ' : 'Поговорити: ') + n.name, act: () => talkNpc(n) };
  return n;
}
function talkNpc(n) {
  if (n.busy || G.state !== 'play') return;
  n.busy = true; n.face = angTo(n, P); n.moving = false;
  const sets = n.talks || [], pick = n.talked === 0 || sets.length < 2 ? sets[0] : sets[1 + Math.floor(Math.random() * (sets.length - 1))];
  const lines = (pick || [['Гм?']]).map((l) => ({ who: n.name, text: l }));
  n.talked++;
  showDialog(lines, () => { n.busy = false; if (n.onTalk) n.onTalk(n); if (n.vendor) openShop(n.vendor); });
}
function npcMove(n, tx, ty, dt, sp) {
  const d = Math.hypot(tx - n.x, ty - n.y); if (d < 3) return true;
  const a = Math.atan2(ty - n.y, tx - n.x), ox = n.x, oy = n.y; n.face = a; moveEntity(n, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
  if (Math.hypot(n.x - ox, n.y - oy) < sp * dt * 0.3) n.stuck += dt; else n.stuck = 0;
  n.moving = true; return false;
}
function updateNpcs(dt) {
  npcs.forEach((n) => {
    n.anim += dt; const dp = dist(n, P);
    if (n.busy) { n.moving = false; n.face = angTo(n, P); }
    else if (n.mode === 'wander') {
      if (n.wait > 0) { n.wait -= dt; n.moving = false; if (dp < 90 && dp > 0) n.face = angTo(n, P); }
      else if (npcMove(n, n.tx, n.ty, dt, n.speed) || n.stuck > 0.6) {
        n.wait = zrand(1.5, 5); n.stuck = 0; n.moving = false;
        for (let k = 0; k < 12; k++) { const a = Math.random() * 6.283, r = Math.random() * n.radius * TS, x = n.hx + Math.cos(a) * r, y = n.hy + Math.sin(a) * r; if (!hitsWall(x, y, 12) && los(n, { x, y })) { n.tx = x; n.ty = y; break; } }
      }
    } else if (n.mode === 'route') {
      const w = n.route[n.rpi % n.route.length], tx = (w[0] + 0.5) * TS, ty = (w[1] + 0.5) * TS;
      if (n.wait > 0) { n.wait -= dt; n.moving = false; }
      else if (npcMove(n, tx, ty, dt, n.speed) || n.stuck > 1.2) { n.rpi++; n.wait = zrand(1, 4); n.stuck = 0; n.moving = false; }
    } else { n.moving = false; if (dp < 110) n.face = angTo(n, P); else if (n.look0 !== undefined) n.face = n.look0; }
    n.it.x = n.x; n.it.y = n.y;
  });
  critters.forEach((c) => {
    c.anim += dt;
    if (c.wait > 0) { c.wait -= dt; c.moving = false; if (c.kind === 'chicken' && Math.sin(c.anim * 7) > 0.97) c.peck = 0.25; }
    else if (npcMove(c, c.tx, c.ty, dt, c.speed) || c.stuck > 0.5) {
      c.wait = zrand(0.8, 4); c.stuck = 0; c.moving = false;
      for (let k = 0; k < 10; k++) { const a = Math.random() * 6.283, r = Math.random() * c.radius * TS, x = c.hx + Math.cos(a) * r, y = c.hy + Math.sin(a) * r; if (!hitsWall(x, y, 8) && los(c, { x, y })) { c.tx = x; c.ty = y; break; } }
    }
    if (c.peck > 0) c.peck -= dt;
  });
}
function makeCritter(d) {
  const c = Object.assign({ radius: 3, speed: 20, wait: zrand(0, 3), anim: Math.random() * 5, r: 7, face: 0, stuck: 0, moving: false }, d);
  c.x = (d.x + 0.5) * TS; c.y = (d.y + 0.5) * TS; c.hx = c.x; c.hy = c.y; c.tx = c.x; c.ty = c.y; return c;
}
function drawNpc(n, t) {
  ctx.save(); ctx.translate(Math.round(n.x), Math.round(n.y));
  shadow(0, 0, n.scale ? 8 : 11);
  drawChar(n.look, 0, 9, { anim: n.moving ? 'walk' : 'idle', idx: Math.floor(n.anim * (n.moving ? 8 : 2.2) + n.x) % (n.moving ? 6 : 4), face: n.face, scale: n.scale, oy: n.scale ? 1 : 0 });
  if (!n.noMark && !n.busy) { ctx.fillStyle = n.vendor ? '#f0c040' : '#e8c04a'; ctx.font = 'bold 16px Georgia'; ctx.textAlign = 'center'; ctx.fillText(n.vendor ? '◆' : '!', 0, -44 + Math.sin(t * 4 + n.x) * 2); }
  ctx.restore();
}
function drawCritter(c, t) {
  ctx.save(); ctx.translate(Math.round(c.x), Math.round(c.y)); const fl = Math.cos(c.face) < 0 ? -1 : 1; ctx.scale(fl, 1);
  const bob = c.moving ? Math.round(Math.sin(c.anim * 14)) : 0, R = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(a, b, w, h); };
  if (c.kind === 'chicken') {
    R(-7, 5, 14, 3, 'rgba(0,0,0,.3)'); const pk = c.peck > 0 ? 3 : 0;
    R(-6, -4 + bob, 12, 8, c.col || '#f0ece0'); R(-6, -4 + bob, 12, 2, '#fff'); R(-8, -6 + bob, 4, 4, c.col || '#f0ece0'); R(4, -8 + bob + pk, 6, 6, c.col || '#f0ece0'); R(10, -6 + bob + pk, 4, 2, '#e8a030'); R(6, -10 + bob + pk, 3, 2, '#c83a2a'); R(7, -7 + bob + pk, 2, 2, '#222'); R(-2, 4, 2, 4, '#e8a030'); R(3, 4, 2, 4 - (c.moving && bob ? 2 : 0), '#e8a030');
  } else if (c.kind === 'cow') {
    R(-16, 10, 32, 5, 'rgba(0,0,0,.3)'); R(-14, -8 + bob, 28, 16, c.col || '#eee8dc'); R(-14, -8 + bob, 28, 3, '#fff'); R(-9, -6 + bob, 8, 7, '#2a2420'); R(4, -2 + bob, 7, 7, '#2a2420'); R(12, -12 + bob, 10, 10, c.col || '#eee8dc'); R(18, -6 + bob, 5, 5, '#e8b0a0'); R(14, -9 + bob, 2, 2, '#222'); R(12, -15 + bob, 2, 4, '#e8e0c0'); R(20, -15 + bob, 2, 4, '#e8e0c0');
    [[-11, 0], [-6, 1], [5, 1], [10, 0]].forEach(([a, b]) => R(a, 8 + bob * 0, 3, 5 - (c.moving && (Math.floor(c.anim * 6) + b) % 2 ? 1 : 0), '#4a3a2a')); R(-16, -6 + bob, 3, 8, '#3a2a20');
  } else if (c.kind === 'dog') {
    R(-9, 5, 18, 3, 'rgba(0,0,0,.3)'); R(-8, -3 + bob, 14, 8, c.col || '#8a6a42'); R(-8, -3 + bob, 14, 2, zsh(c.col || '#8a6a42', 1.2)); R(4, -8 + bob, 7, 7, c.col || '#8a6a42'); R(10, -5 + bob, 3, 3, '#3a2a1a'); R(6, -10 + bob, 2, 3, '#4a3220'); R(8, -7 + bob, 1, 1, '#111'); R(-11, -6 + bob + (c.moving ? Math.round(Math.sin(c.anim * 18)) : 0), 4, 2, c.col || '#8a6a42');
    [[-6, 0], [3, 1]].forEach(([a, b]) => R(a, 5, 3, 4 - (c.moving && (Math.floor(c.anim * 8) + b) % 2 ? 2 : 0), '#6a4a2a'));
  } else if (c.kind === 'cat') {
    R(-7, 4, 14, 3, 'rgba(0,0,0,.3)'); R(-6, -2 + bob, 11, 6, c.col || '#2a2a30'); R(3, -7 + bob, 6, 6, c.col || '#2a2a30'); R(3, -10 + bob, 2, 3, c.col || '#2a2a30'); R(7, -10 + bob, 2, 3, c.col || '#2a2a30'); R(5, -5 + bob, 1, 1, '#a0ff80'); R(8, -5 + bob, 1, 1, '#a0ff80'); R(-10, -6 + bob, 2, 6, c.col || '#2a2a30');
  }
  ctx.restore();
}

// ---------- Запуск зони, перехід, камера ----------
function zoneGo(id, spawn) { if (G.fading) return; Sfx.play('click'); fade(() => startZone(id, spawn), { out: 350, hold: 90, inn: 450 }); }
function startZone(id, spawn, pos) {
  const Z = ZONES[id] || ZONES.village, B = new ZB(Z.w, Z.h, Z.base === undefined ? GK.GRASS : Z.base, !!Z.interior); Z.build(B);
  const fromDungeon = !G.zone; G.zone = ZONES[id] ? id : 'village';
  if (fromDungeon) G.shops = {};
  map = { w: Z.w, h: Z.h, t: B.t, g: B.g, rooms: [], zone: G.zone, interior: !!Z.interior };
  if (Z.interior) TILES = buildTiles(Z.theme.tiles, 12);
  enemies = []; projs = []; parts = []; pickups = []; texts = []; allies = []; effects = []; corpses = []; zones = []; traps = []; G.lethal = {}; G.boomDepth = 0; G.timers = []; G.stop = 0; G.pcorpse = null; P.castT = 0;
  G.boss = null; G.portalOpen = false; G.shake = 0; flow = null; flowT = 0; G.shop = null;
  if (B.bonfire && B.cookSpot) B.cookSpot((B.bonfire.x + 0.5) * TS + 36, (B.bonfire.y + 0.5) * TS + 10);
  props = B.props.slice(); zobjs = B.objs; zlights = B.lights; chimneys = B.chim; npcs = B.npcs.map(makeNpc); critters = B.crit.map(makeCritter);
  inter = B.inter.slice(); npcs.forEach((n) => inter.push(n.it));
  const spot = (x, y, r) => { if (!hitsWall(x, y, r)) return { x, y }; for (let k = 1; k <= 6; k++) for (let a = 0; a < 12; a++) { const nx = x + Math.cos(a * 0.5236) * k * TS * 0.7, ny = y + Math.sin(a * 0.5236) * k * TS * 0.7; if (!hitsWall(nx, ny, r)) return { x: nx, y: ny }; } return { x, y }; };
  if (Z.cfg) enemies = B.foes.map((f) => { const p = spot((f.x + 0.5) * TS, (f.y + 0.5) * TS, 12), e = makeEnemy(f.type, p.x, p.y, !!f.elite, Z.cfg); if (f.name) e.name = f.name; e.face = Math.random() * 6.283; return e; });
  explored = new Uint8Array(Z.w * Z.h).fill(1);
  if (B.bonfire) { const bx = (B.bonfire.x + 0.5) * TS, by = (B.bonfire.y + 0.5) * TS; props.push({ type: 'bonfire', x: bx, y: by, ph: 0 }); G.bonfire = { x: bx, y: by };
    inter.push({ x: bx, y: by, r: 44, bonfire: true, label: 'Спочити біля вогнища (зберегти)', act: () => { P.hp = P.maxHp; P.potions = P.maxPotions; float(P.x, P.y - 24, 'Жар відновлює сили', '#ffb347'); Sfx.play('potion'); burst(bx, by, '#ffb347', 20, 90, 3); checkpoint(); } }); }
  else G.bonfire = G.bonfire || { x: 0, y: 0 };
  if (!G.dead) G.dead = new Set(); if (!G.loreTaken) G.loreTaken = [];
  if (!G.cp) G.cp = { level: G.level || 0, dead: [], lore: [], portal: false, x: 0, y: 0, explored: [] };
  const sp = pos || B.spawns[spawn || 'default'] || { x: (Z.w / 2) * TS, y: (Z.h / 2) * TS };
  P.x = sp.x; P.y = sp.y; P.hp = Math.max(P.hp, 1); P.shield = 0; P.invisT = 0; P.wallT = 0; P.inv = 0.5; P.dodgeT = 0;
  cam.x = P.x; cam.y = P.y; zoneCam();
  Music.play(Z.music || 'village'); Music.target = 0; Music.phase2 = false;
  G.zspawn = spawn; G.titleT = Z.interior ? 0 : 3.5; G.state = 'play';
  if (!Z.interior) G.zcp = G.zcp || null;
  if (Z.onEnter) Z.onEnter(G.zone);
}
function zoneCam() {
  if (!G.zone || !map) return;
  const mw = map.w * TS, mh = map.h * TS;
  cam.x = mw <= W ? mw / 2 : Math.max(W / 2, Math.min(mw - W / 2, cam.x));
  cam.y = mh <= H ? mh / 2 : Math.max(H / 2, Math.min(mh - H / 2, cam.y));
}
function updateZone(dt) {
  updateNpcs(dt); if (ZONES[G.zone].fx) ZONES[G.zone].fx(dt);
  chimneys.forEach((c) => { if (Math.random() < dt * 1.4) parts.push({ x: c.x + 6, y: c.y, vx: zrand(2, 12), vy: -zrand(14, 24), life: 2, max: 2, size: 6, color: 'rgba(190,190,200,.28)' }); });
  if (!map.interior && Math.random() < dt * 6) parts.push({ x: cam.x + zrand(-W / 2, W / 2), y: cam.y + zrand(-H / 2, H / 2), vx: zrand(-8, 8), vy: zrand(-10, 2), life: 3, max: 3, size: 2, color: 'rgba(255,230,120,.8)' });
}
function zoneDrawList(t) {
  const L = [], mx = 150, x0 = cam.x - W / 2 - mx, x1 = cam.x + W / 2 + mx, y0 = cam.y - H / 2 - mx, y1 = cam.y + H / 2 + mx + 90;
  zobjs.forEach((o) => { if (o.x1 < x0 || o.x0 > x1 || o.y1 < y0 || o.y0 > y1) return; L.push({ y: o.y, f: o.draw }); });
  npcs.forEach((n) => L.push({ y: n.y, f: () => drawNpc(n, t) }));
  critters.forEach((c) => L.push({ y: c.y, f: () => drawCritter(c, t) }));
  return L;
}
function drawNpcNames() {
  ctx.font = '13px Georgia'; ctx.textAlign = 'center';
  npcs.forEach((n) => { const d = dist(n, P); if (d > 150 || n.noName) return; ctx.globalAlpha = Math.min(1, (150 - d) / 60); const w = ctx.measureText(n.name).width + 12; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(Math.round(n.x - w / 2), Math.round(n.y - 72), w, 18); ctx.fillStyle = n.vendor ? '#f0c040' : '#e8dcc0'; ctx.fillText(n.name, Math.round(n.x), Math.round(n.y - 59)); });
  ctx.globalAlpha = 1;
}
let ZMM = null;
function drawZoneMinimap(vw) {
  const s = map.interior ? 6 : 2, mw = map.w * s, mh = map.h * s, mx = vw - mw - 16, my = 16;
  if (!ZMM || ZMM.id !== G.zone) {
    const c = document.createElement('canvas'); c.width = map.w; c.height = map.h; const x = c.getContext('2d'), col = { 0: '#3a5a2c', 1: '#7a6a44', 2: '#6a6a76', 3: '#b8964a', 4: '#2a5a8a', 5: '#6a4a2c', 6: '#5a5a62', 7: '#3a6a30', 8: '#b8641c', 9: '#2c4422', 10: '#7a2430', 11: '#8a7a56' };
    for (let j = 0; j < map.h; j++) for (let i = 0; i < map.w; i++) { const k = j * map.w + i; x.fillStyle = map.t[k] === 1 ? '#222' : map.t[k] === 2 ? '#1c2a1a' : col[map.g[k]] || '#444'; x.fillRect(i, j, 1, 1); }
    ZMM = { id: G.zone, c };
  }
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4); ctx.imageSmoothingEnabled = false; ctx.drawImage(ZMM.c, mx, my, mw, mh);
  npcs.forEach((n) => { ctx.fillStyle = n.vendor ? '#f0c040' : '#e8e0a0'; ctx.fillRect(mx + (n.x / TS) * s - 1, my + (n.y / TS) * s - 1, 2, 2); });
  ctx.fillStyle = '#ff5a3a'; ctx.fillRect(mx + (P.x / TS) * s - 2, my + (P.y / TS) * s - 2, 4, 4);
}
