'use strict';
// ===== ДВИЖОК: утиліти, введення, звук =====
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

// --- Налаштування та прив'язка клавіш (зберігаються в localStorage) ---
const SETTINGS_KEY = 'ashtorn.settings.v1';
const DEFAULT_BINDS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  dodge: ['Space', ''], ability: ['KeyQ', ''], potion: ['KeyF', ''], interact: ['KeyE', ''], mute: ['KeyM', ''], fullscreen: ['KeyG', ''],
};
const BIND_NAMES = { up: 'Вгору', down: 'Вниз', left: 'Ліворуч', right: 'Праворуч', dodge: 'Ухилення', ability: 'Здібність класу', potion: 'Зілля', interact: 'Взаємодія', mute: 'Вимк./увімк. звук', fullscreen: 'Повний екран' };
const Settings = {
  v: { master: 0.8, music: 0.8, sfx: 0.9, shake: 1, dmgNums: true, hints: true, diff: 1, muted: false },
  binds: JSON.parse(JSON.stringify(DEFAULT_BINDS)),
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); if (!d) return;
      Object.keys(this.v).forEach((k) => { if (d.v && typeof d.v[k] === typeof this.v[k]) this.v[k] = d.v[k]; });
      Object.keys(DEFAULT_BINDS).forEach((a) => { if (d.binds && Array.isArray(d.binds[a]) && d.binds[a].length === 2) this.binds[a] = d.binds[a].map((c) => (typeof c === 'string' ? c : '')); });
    } catch (e) { /* пошкоджені дані — лишаються типові */ }
  },
  save() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ v: this.v, binds: this.binds })); } catch (e) { /* сховище недоступне */ } },
};
Settings.load();
const KEY_LABELS = { Space: 'Пробіл', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', AltRight: 'Alt', Tab: 'Tab', Enter: 'Enter', Escape: 'Esc', Backquote: '`', Minus: '-', Equal: '=', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\' };
const keyLabel = (c) => (!c ? '—' : KEY_LABELS[c] || c.replace(/^Key|^Digit|^Numpad/, (m) => (m === 'Numpad' ? 'Num ' : '')));
const Binds = {
  matches(a, code) { return Settings.binds[a].includes(code); },
  down(a) { return Settings.binds[a].some((c) => c && Input.keys.has(c)); },
  pressed(a) { return Settings.binds[a].some((c) => c && Input.edge.has(c)); },
  label(a) { return Settings.binds[a].filter(Boolean).map(keyLabel).join(' / ') || '—'; },
  // призначити клавішу: забираємо її в інших дій (обмін), щоб не було конфліктів
  set(a, slot, code) {
    Object.keys(Settings.binds).forEach((o) => Settings.binds[o].forEach((c, i) => { if (c === code && !(o === a && i === slot)) Settings.binds[o][i] = ''; }));
    Settings.binds[a][slot] = code;
    if (!Settings.binds[a].some(Boolean)) Settings.binds[a][0] = DEFAULT_BINDS[a][0];
    Settings.save();
  },
  clear(a, slot) { if (Settings.binds[a].filter(Boolean).length > 1 || !Settings.binds[a][slot]) { Settings.binds[a][slot] = ''; Settings.save(); return true; } return false; },
  reset() { Settings.binds = JSON.parse(JSON.stringify(DEFAULT_BINDS)); Settings.save(); },
};

// --- Введення ---
const Input = {
  keys: new Set(), edge: new Set(),
  mouse: { x: 0, y: 0, down: false, rdown: false, rEdge: false },
  down(c) { return this.keys.has(c); },
  pressed(c) { return this.edge.has(c); },
  endFrame() { this.edge.clear(); this.mouse.rEdge = false; },
};
addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (!e.repeat) Input.edge.add(e.code);
  Input.keys.add(e.code);
});
addEventListener('keyup', (e) => Input.keys.delete(e.code));
addEventListener('blur', () => { Input.keys.clear(); Input.mouse.down = false; Input.mouse.rdown = false; });
addEventListener('mousemove', (e) => { Input.mouse.x = e.clientX; Input.mouse.y = e.clientY; });
addEventListener('mousedown', (e) => {
  Sfx.init();
  if (e.button === 0) Input.mouse.down = true;
  if (e.button === 2) { Input.mouse.rdown = true; Input.mouse.rEdge = true; }
});
addEventListener('mouseup', (e) => {
  if (e.button === 0) Input.mouse.down = false;
  if (e.button === 2) Input.mouse.rdown = false;
});
addEventListener('contextmenu', (e) => e.preventDefault());

// --- Звук (синтез через WebAudio, без файлів) ---
const Sfx = {
  ctx: null, master: null, sfxBus: null, musBus: null, ambient: false,
  get muted() { return Settings.v.muted; },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
      this.musBus = this.ctx.createGain(); this.musBus.connect(this.master);
      this.applyVol();
      this.startAmbient();
      if (typeof Music !== 'undefined') Music.init();
    } catch (e) { this.ctx = null; }
  },
  toggle() {
    Settings.v.muted = !Settings.v.muted; Settings.save(); this.applyVol();
  },
  applyVol() {
    if (!this.master) return; const v = Settings.v;
    this.master.gain.value = v.muted ? 0 : v.master * 0.6; this.musBus.gain.value = v.music; this.sfxBus.gain.value = v.sfx;
  },
  startAmbient() {
    const c = this.ctx;
    [55, 82.4].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      g.gain.value = 0.007;
      l.frequency.value = 0.07 + i * 0.05; lg.gain.value = 0.012;
      l.connect(lg); lg.connect(g.gain);
      const flt = c.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 220;
      o.connect(flt); flt.connect(g); g.connect(this.musBus);
      o.start(); l.start();
    });
  },
  tone(f, dur, type = 'square', vol = 0.15, slide = 0) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + dur);
  },
  noise(dur, vol = 0.15, freq = 1200) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime, n = Math.floor(c.sampleRate * dur);
    const b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.sfxBus); s.start(t);
  },
  play(n) {
    switch (n) {
      case 'swing': this.noise(0.12, 0.18, 1800); break;
      case 'hit': this.tone(140, 0.1, 'square', 0.13, -80); this.noise(0.08, 0.1, 900); break;
      case 'fire': this.noise(0.2, 0.14, 700); this.tone(300, 0.15, 'sawtooth', 0.06, -150); break;
      case 'arrow': this.tone(700, 0.08, 'triangle', 0.08, -400); break;
      case 'magic': this.tone(420, 0.25, 'sine', 0.1, 300); break;
      case 'hurt': this.tone(110, 0.2, 'sawtooth', 0.2, -60); break;
      case 'pickup': this.tone(700, 0.08, 'sine', 0.1, 400); break;
      case 'potion': this.tone(300, 0.25, 'sine', 0.14, 300); break;
      case 'dodge': this.noise(0.15, 0.1, 500); break;
      case 'slam': this.tone(70, 0.4, 'square', 0.25, -40); this.noise(0.3, 0.2, 300); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.12), i * 90)); break;
      case 'die': this.tone(200, 0.9, 'sawtooth', 0.2, -170); break;
      case 'boss': this.tone(55, 1.2, 'sawtooth', 0.22, -20); this.noise(0.8, 0.12, 200); break;
      case 'click': this.tone(500, 0.05, 'square', 0.05); break;
    }
  },
};
