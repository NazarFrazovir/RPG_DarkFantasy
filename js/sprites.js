'use strict';
// ===== ПІКСЕЛЬ-АРТ: спрайти з текстових карт + процедурні текстури тайлів =====
// Кожен спрайт задається лівою половиною (8 колонок), права дзеркалиться. Легенда — палітра символів.

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
    for (let i = 0; i < full.length; i++) {
      const col = legend[full[i]];
      if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); }
    }
  });
  return c;
}
function whiteVersion(src) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  return c;
}
// спрайт із двома кадрами ходьби: тіло + ноги A/B
function makeChar(body, legsA, legsB, legend, mirror = true) {
  const s = { a: buildSprite([...body, ...legsA], legend, mirror), b: buildSprite([...body, ...legsB], legend, mirror) };
  s.fa = whiteVersion(s.a); s.fb = whiteVersion(s.b); s.w = s.a.width; s.h = s.a.height;
  return s;
}

// --- Тіла ---
const ROBE = [
  '........',
  '.....ddd',
  '....dooO',
  '...dooOO',
  '...dooss',
  '...doses',
  '...dosss',
  '....dsss',
  '..dbbbbb',
  '.dbBbggb',
  '.dbBbbbb',
  '.dbbbbbb',
  '.dbbbbbb',
];
const ROBE_A = ['..dbbbbb', '..dbbBbb', '..ddbbdd'];
const ROBE_B = ['..dbbbbb', '...dbbbb', '..ddbddd'];

const KNIGHT = [
  '.......r',
  '......rr',
  '....dddd',
  '...dhhhh',
  '...dhhhh',
  '...dhvvv',
  '...dhvev',
  '...dhhhh',
  '..ddddgg',
  '.dhhhHgh',
  'dhhhHhhh',
  'dhHdHhhh',
  'dHd.dccc',
];
const KNIGHT_A = ['...dHHd.', '...dHHd.', '..ddHHd.'];
const KNIGHT_B = ['....dHHd', '....dHHd', '...ddHHd'];

const SKELETON = [
  '........',
  '....dddd',
  '...dbbbb',
  '..dbbbbb',
  '..dbkkbb',
  '..dbkekb',
  '..dbbbbb',
  '...dbdbd',
  '....dddd',
  '..dbbBbb',
  '..dbdbdb',
  '..dbbBbb',
  '...dbdbd',
];
const SKEL_A = ['...dbd..', '...dbd..', '..ddbd..'];
const SKEL_B = ['....dbbd', '....dbbd', '...ddbbd'];

const GHOUL = [
  '........',
  '........',
  '....dddd',
  '...dggGG',
  '..dggggg',
  '..dggrgg',
  '..dgggmm',
  '...dgggg',
  '.ddGggGg',
  'dgggGgGg',
  'dgggdgGg',
  'dg.dgGgg',
  'd..dGgg.',
];
const GHOUL_A = ['...dgGd.', '...dgd..', '..ddgd..'];
const GHOUL_B = ['....dgGd', '....dgd.', '...ddgd.'];

const BRUTE = [
  '...ddddd',
  '..dhhhhh',
  '..dhkhkh',
  '..dhhhhh',
  '..dhmmmm',
  '.ddhhhhh',
  'dhhhhHhh',
  'dhhsHhhH',
  'dhshHhsh',
  'dhhhHhhH',
  'dHhhhHhh',
  'dHHd.dhH',
  '.dd.ddhh',
];
const BRUTE_A = ['...dHHd.', '...dHHd.', '..dddHd.'];
const BRUTE_B = ['....dHHd', '....dHHd', '...dddHd'];

const BOSS = [
  '..g..g.g',
  '..gggggg',
  '...dpppp',
  '..dpppPP',
  '..dppepp',
  '..dppppp',
  '...dpddd',
  '.ddpppPP',
  'dpPPpppp',
  'dpPppppv',
  'dpPppppv',
  'dppPpppp',
  '.dpppppp',
  '..dpprrr',
];
const BOSS_A = ['..dppRRd', '..dppRR.', '.ddpp...'];
const BOSS_B = ['...dpRRd', '...dpRR.', '..ddp...'];

const SWORD = [
  '..g.............',
  '..g.wwwwwwwwwww.',
  'bbgWWWWWWWWWWWWw',
  '..g.wwwwwwwwwww.',
  '..g.............',
];

const GRAVE = ['..dddd..', '.dssssd.', '.dsSssd.', '.dssssd.', '.dsSSsd.', '.dssssd.', 'dddddddd'];

let SPR = null;
function initSprites() {
  const rob = (o, O, s, e, b, B, g) => ({ d: '#120c10', o, O, s, e, b, B, g });
  const eyes = (l) => l; // (лише для читабельності)
  SPR = {
    knight: makeChar(KNIGHT, KNIGHT_A, KNIGHT_B, { d: '#15161c', h: '#aab4c6', H: '#5b6577', v: '#0d0d12', e: '#ff9a3a', r: '#b03030', g: '#d8b26a', c: '#3a2b2b' }),
    pyro: makeChar(ROBE, ROBE_A, ROBE_B, rob('#7a2a16', '#b84a24', '#e2c9a6', '#ffb347', '#3a1a18', '#6a2a20', '#d8b26a')),
    ranger: makeChar(ROBE, ROBE_A, ROBE_B, rob('#2f5a3a', '#4f8a5a', '#d8bea0', '#a6ffb0', '#3a4a2a', '#5a6a3a', '#8a6a3a')),
    necro: makeChar(ROBE, ROBE_A, ROBE_B, rob('#1f3a34', '#3a6a5a', '#dcdccc', '#66ffb4', '#1a2a28', '#2f4a44', '#8ad4b8')),
    cultist: makeChar(ROBE, ROBE_A, ROBE_B, rob('#3a1a4a', '#5a2a70', '#0d0810', '#d060ff', '#2a1238', '#45205a', '#a02a6a')),
    cultistElite: makeChar(ROBE, ROBE_A, ROBE_B, rob('#6a1a3a', '#a02a5a', '#0d0810', '#ff7040', '#3a1028', '#6a2040', '#e0a040')),
    raven: makeChar(ROBE, ROBE_A, ROBE_B, rob('#4a4a4e', '#6a6a70', '#e8dcc8', '#6a8aa0', '#3a3028', '#5a4a38', '#a08a5a')),
    eira: makeChar(ROBE, ROBE_A, ROBE_B, rob('#6a7aa8', '#9aaad8', '#e8f0ff', '#b0d0ff', '#5a6a98', '#8a9ac8', '#dfe8ff')),
    skeleton: makeChar(SKELETON, SKEL_A, SKEL_B, { d: '#1a1612', b: '#d8d0b8', B: '#9a927c', k: '#0a0808', e: '#d03030' }),
    minion: makeChar(SKELETON, SKEL_A, SKEL_B, { d: '#0a2a1a', b: '#9affd0', B: '#4aaa80', k: '#04140c', e: '#e0fff0' }),
    ghoul: makeChar(GHOUL, GHOUL_A, GHOUL_B, { d: '#1a2214', g: '#7a8a6a', G: '#55654a', r: '#ff3030', m: '#3a0a0a' }),
    brute: makeChar(BRUTE, BRUTE_A, BRUTE_B, { d: '#2a1614', h: '#a87a6a', H: '#7a5248', k: '#ffdd44', m: '#3a1a1a', s: '#d8d0c0' }),
    boss: makeChar(BOSS, BOSS_A, BOSS_B, { d: '#0a0510', g: '#e0b040', p: '#2b2233', P: '#4a3a55', e: '#ff3a3a', v: '#c03aff', r: '#8a1a24', R: '#5a1018' }),
  };
  SPR.sword = buildSprite(SWORD, { g: '#d8b26a', w: '#8a94a8', W: '#dfe6f2', b: '#5a3d24' }, false);
  SPR.grave = buildSprite(GRAVE, { d: '#1a1a20', s: '#5a5a64', S: '#3a3a44' });
  SPR.tiles = null;
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
