'use strict';
// ===== МУЗИКА: процедурний dark-ambient саундтрек (WebAudio, без файлів) =====
// Кожна тема — акорди + патерни; барабани вмикаються, коли поруч бій (Music.target).

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const TRACKS = {
  menu: {
    bpm: 60, chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]], padVol: 0.05, choir: 0.03,
    bass: [0], arp: [0, 3, 6, 8, 11, 14], arpVol: 0.06, scale: [62, 64, 65, 67, 69, 70, 72, 74], mel: [0, 8], melP: 0.55, bell: 0.07,
  },
  lvl1: {
    bpm: 72, chords: [[45, 48, 52], [41, 45, 48], [48, 52, 55], [40, 43, 47]], padVol: 0.05, choir: 0.02,
    bass: [0, 8], arp: [0, 4, 7, 10, 12], arpVol: 0.05, scale: [69, 72, 74, 76, 79, 81], mel: [0, 6, 10], melP: 0.4, bell: 0.06,
    kick: [0, 10], tom: [4, 12, 14], hat: [], snare: [],
  },
  lvl2: {
    bpm: 54, chords: [[40, 43, 47], [41, 45, 48], [40, 43, 47], [38, 41, 45]], padVol: 0.055, choir: 0.03, whisper: true,
    bass: [0], arp: [], arpVol: 0, scale: [64, 65, 67, 69, 71, 72, 74, 76], mel: [0, 3, 8, 11], melP: 0.32, bell: 0.07,
    kick: [0, 8], tom: [6, 14], hat: [], snare: [],
  },
  lvl3: {
    bpm: 60, chords: [[45, 48, 52], [43, 47, 50], [41, 45, 48], [43, 47, 50]], padVol: 0.055, choir: 0.05, whisper: true,
    bass: [0, 8], arp: [0, 5, 9], arpVol: 0.03, scale: [69, 72, 74, 76, 79, 81], mel: [0, 4, 10], melP: 0.4, bell: 0.09,
    kick: [0, 10], tom: [6, 14], hat: [], snare: [],
  },
  lvl4: {
    bpm: 66, chords: [[38, 41, 45], [36, 40, 43], [34, 38, 41], [36, 40, 43]], padVol: 0.05, choir: 0.03,
    bass: [0], arp: [0, 3, 7, 10, 14], arpVol: 0.05, scale: [74, 76, 77, 79, 81, 84], mel: [0, 6, 12], melP: 0.45, bell: 0.1,
    kick: [0, 8], tom: [4, 12, 15], hat: [2, 6, 10, 14], snare: [],
  },
  village: {
    bpm: 82, chords: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 43, 47]], padVol: 0.04, choir: 0.015,
    bass: [0, 8], arp: [0, 3, 6, 8, 11, 14], arpVol: 0.055, scale: [69, 72, 74, 76, 79, 81], mel: [0, 4, 8, 10, 14], melP: 0.5, bell: 0.07,
  },
  tavern: {
    bpm: 98, chords: [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]], padVol: 0.035, choir: 0,
    bass: [0, 4, 8, 12], arp: [0, 2, 4, 6, 8, 10, 12, 14], arpVol: 0.05, scale: [67, 69, 72, 74, 76, 79], mel: [0, 3, 6, 8, 11, 14], melP: 0.6, bell: 0.05,
  },
  boss: {
    bpm: 108, chords: [[40, 43, 47], [36, 40, 43], [38, 42, 45], [35, 39, 42]], padVol: 0.05, choir: 0.05, bassOff: 12,
    bass: [0, 2, 4, 6, 8, 10, 12, 14], arp: [1, 3, 5, 7, 9, 11, 13, 15], arpVol: 0.035, scale: [64, 67, 69, 71, 72, 74, 76, 79], mel: [0, 6, 12], melP: 0.6, bell: 0.06,
    kick: [0, 8, 10], tom: [14, 15], hat: [0, 2, 4, 6, 8, 10, 12, 14], snare: [4, 12], stab: [0, 3, 10], stabVol: 0.05, alwaysDrums: false,
  },
  cine: {
    bpm: 54, chords: [[38, 41, 45], [34, 38, 41], [31, 34, 38], [33, 37, 40]], padVol: 0.065, choir: 0.05, whisper: true,
    bass: [0], arp: [], arpVol: 0, scale: [62, 64, 65, 67, 69, 70, 72, 74], mel: [0, 8], melP: 0.6, bell: 0.08,
    kick: [0], tom: [8, 14], hat: [], snare: [],
  },
  end_good: {
    bpm: 66, chords: [[50, 54, 57], [45, 49, 52], [47, 50, 54], [43, 47, 50]], padVol: 0.05, choir: 0.04,
    bass: [0], arp: [0, 2, 4, 6, 8, 10, 12, 14], arpVol: 0.06, scale: [62, 64, 66, 69, 71, 74, 76, 78], mel: [0, 4, 8, 12], melP: 0.7, bell: 0.08,
  },
  end_dark: {
    bpm: 50, chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]], padVol: 0.06, choir: 0.06, whisper: true,
    bass: [0], arp: [], arpVol: 0, scale: [50, 53, 55, 57, 60, 62], mel: [0, 8], melP: 0.5, bell: 0.08,
  },
};

const Music = {
  ctx: null, cur: null, want: null, step: 0, nextT: 0, timer: null, intensity: 0, target: 0, phase2: false, md: 3, vol: 0.9, noiseBuf: null,
  init() {
    if (this.ctx || !Sfx.ctx) return;
    const c = this.ctx = Sfx.ctx;
    this.out = c.createGain(); this.out.gain.value = this.vol; this.out.connect(Sfx.musBus);
    this.fade = c.createGain(); this.fade.gain.value = 0; this.fade.connect(this.out);
    this.dryIn = c.createGain(); this.dryIn.connect(this.fade);
    const len = Math.floor(c.sampleRate * 2.8), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.rev = c.createConvolver(); this.rev.buffer = buf; this.revIn = c.createGain(); this.revIn.connect(this.rev);
    this.wet = c.createGain(); this.wet.gain.value = 0.7; this.rev.connect(this.wet); this.wet.connect(this.fade);
    const nl = c.sampleRate * 2, nb = c.createBuffer(1, nl, c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    this.timer = setInterval(() => this.tick(), 60);
    if (this.want) { const w = this.want; this.want = null; this.play(w); }
  },
  play(name) {
    if (!this.ctx) { this.want = name; return; }
    if (this.name === name) return;
    this.name = name; const c = this.ctx;
    this.fade.gain.cancelScheduledValues(c.currentTime);
    this.fade.gain.setTargetAtTime(0, c.currentTime, 0.25);
    clearTimeout(this.swT);
    this.swT = setTimeout(() => {
      this.cur = TRACKS[name]; this.step = 0; this.nextT = c.currentTime + 0.1; this.md = 3; this.phase2 = false;
      this.fade.gain.cancelScheduledValues(c.currentTime); this.fade.gain.setTargetAtTime(1, c.currentTime, 0.8);
    }, 900);
  },
  tick() {
    if (!this.cur) return;
    const c = this.ctx; this.intensity += (this.target - this.intensity) * 0.06;
    if (this.nextT < c.currentTime - 0.5) this.nextT = c.currentTime + 0.05;
    const s16 = 60 / this.cur.bpm / 4;
    while (this.nextT < c.currentTime + 0.25) { this.sched(this.step, this.nextT, s16); this.nextT += s16; this.step++; }
  },
  sched(step, t, s16) {
    const T = this.cur, bar = Math.floor(step / 16), s = step % 16, ch = T.chords[bar % T.chords.length], barLen = s16 * 16;
    if (s === 0) {
      this.pad(ch, t, barLen * 1.05, T.padVol);
      if (T.choir) this.choir([ch[0] + 12, ch[2] + 12], t, barLen * 1.05, T.choir);
      if (T.whisper && bar % 2 === 0) this.whisper(t, barLen * 2);
    }
    if (T.bass && T.bass.includes(s)) this.bass(mtof(ch[0] - (T.bassOff === undefined ? 12 : 12 - T.bassOff) ), t, s16 * (T.bass.length > 4 ? 1.6 : 6), T.bass.length > 4 ? 0.13 : 0.16);
    if (T.arp && T.arp.includes(s)) {
      const idx = T.arp.indexOf(s), tone = ch[idx % 3] + 12 * (1 + Math.floor(idx / 3) % 2);
      this.pluck(mtof(tone), t, T.arpVol);
    }
    if (T.mel && T.mel.includes(s) && Math.random() < T.melP) {
      this.md = Math.max(0, Math.min(T.scale.length - 1, this.md + Math.floor(Math.random() * 5) - 2));
      this.bell(mtof(T.scale[this.md]), t, T.bell);
    }
    const I = this.intensity;
    if (T.kick && I > 0.35) {
      const v = Math.min(1, I);
      if (T.kick.includes(s)) this.kick(t, 0.5 * v);
      if (T.tom.includes(s)) this.tom(t, s % 2 ? 110 : 85, 0.32 * v);
      if (T.snare && T.snare.includes(s)) this.snare(t, 0.16 * v);
      if (T.hat && (T.hat.includes(s) || (this.phase2 && s % 2))) this.hat(t, 0.05 * v);
      if (T.stab && T.stab.includes(s)) this.stab(ch.map((n) => n + 12), t, T.stabVol * v);
    }
  },
  // --- голоси ---
  send(node, dry, wet) { const g1 = this.ctx.createGain(), g2 = this.ctx.createGain(); g1.gain.value = dry; g2.gain.value = wet; node.connect(g1); node.connect(g2); g1.connect(this.dryIn); g2.connect(this.revIn); },
  pad(notes, t, dur, vol) {
    const c = this.ctx;
    notes.forEach((n) => [-7, 7].forEach((det) => {
      const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = det; f.type = 'lowpass'; f.frequency.value = 700;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol / 2, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
      o.connect(f); f.connect(g); this.send(g, 0.5, 0.8); o.start(t); o.stop(t + dur + 0.7);
    }));
  },
  choir(notes, t, dur, vol) {
    const c = this.ctx;
    notes.forEach((n) => {
      const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), f = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = mtof(n); lfo.frequency.value = 5 + Math.random(); lg.gain.value = 6; lfo.connect(lg); lg.connect(o.detune);
      f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 3; f2.type = 'lowpass'; f2.frequency.value = 1400;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.5);
      o.connect(f); f.connect(f2); f2.connect(g); this.send(g, 0.3, 1); o.start(t); lfo.start(t); o.stop(t + dur + 0.6); lfo.stop(t + dur + 0.6);
    });
  },
  pluck(f, t, vol) {
    const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2;
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(3200, t); fl.frequency.exponentialRampToValueAtTime(500, t + 0.6);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 1.1);
    o.connect(fl); o2.connect(fl); fl.connect(g); this.send(g, 0.5, 0.9); o.start(t); o2.start(t); o.stop(t + 1.2); o2.stop(t + 1.2);
  },
  bell(f, t, vol) {
    const c = this.ctx;
    [[1, 1], [2.76, 0.35], [5.4, 0.18]].forEach(([m, a]) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(vol * a, t); g.gain.exponentialRampToValueAtTime(0.0003, t + 3.2 / m + 0.4);
      o.connect(g); this.send(g, 0.3, 1); o.start(t); o.stop(t + 3.8);
    });
  },
  bass(f, t, dur, vol) {
    const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f / 2;
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(420, t); fl.frequency.exponentialRampToValueAtTime(140, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(fl); o2.connect(g); fl.connect(g); this.send(g, 1, 0.1); o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  },
  kick(t, v) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.16);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); this.send(g, 1, 0.25); o.start(t); o.stop(t + 0.4);
  },
  tom(t, f, v) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.3);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g); this.send(g, 0.7, 0.7); o.start(t); o.stop(t + 0.5);
  },
  noiseHit(t, dur, freq, type, v, wet) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f); f.connect(g); this.send(g, 1, wet); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  snare(t, v) { this.noiseHit(t, 0.2, 1800, 'bandpass', v, 0.6); },
  hat(t, v) { this.noiseHit(t, 0.05, 8000, 'highpass', v, 0.1); },
  stab(notes, t, v) {
    const c = this.ctx;
    notes.forEach((n) => {
      const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = mtof(n); f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.08); f.frequency.exponentialRampToValueAtTime(600, t + 0.5);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      o.connect(f); f.connect(g); this.send(g, 0.8, 0.5); o.start(t); o.stop(t + 0.6);
    });
  },
  whisper(t, dur) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 900; f.Q.value = 8;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.02, t + dur * 0.6); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); this.send(g, 0.3, 1); s.start(t); s.stop(t + dur + 0.1);
  },
};
