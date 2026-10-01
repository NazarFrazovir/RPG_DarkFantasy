'use strict';
// ===== НАВЧАННЯ: покрокові підказки на першому рівні + контекстні поради =====
// Стан G.tut = { on, done, step, moved, hits, dodged, ability, rested, goalT, okT, tips:{} } — зберігається разом із грою.

const kb = (a) => `<kbd>${keyLabel(Settings.binds[a][0] || Settings.binds[a][1])}</kbd>`;
const TUT_STEPS = [
  { id: 'move', title: 'Рух', html: () => `Рухайся: ${kb('up')} ${kb('left')} ${kb('down')} ${kb('right')}`, ok: (t) => t.moved >= 150 },
  { id: 'attack', title: 'Атака', html: (t) => `Утримуй <kbd>ЛКМ</kbd> і цілься мишею — вдар опудало <em>${Math.min(3, t.hits || 0)}/3</em>`, ok: (t) => (t.hits || 0) >= 3 },
  { id: 'dodge', title: 'Ухилення', html: () => `Натисни ${kb('dodge')} — кувирок робить тебе невразливим на мить`, ok: (t) => t.dodged },
  { id: 'ability', title: 'Здібність', html: () => `<b>${abilityName()}</b> — <kbd>ПКМ</kbd> або ${kb('ability')}. Перезаряджається ${Math.round(abilityCd())} с`, ok: (t) => t.ability },
  { id: 'rest', title: 'Вогнище', html: () => `Підійди до вогнища й натисни ${kb('interact')}: воно лікує, поповнює зілля (${kb('potion')}) і <b>зберігає гру</b>`, ok: (t) => t.rested },
  { id: 'goal', title: 'Мета', html: () => `Знайди й здолай <b>${LEVELS[0].elite.name}</b> — тоді відкриється портал. Мінікарта справа покаже, де ти був. Червоний сектор перед ворогом — замах: ухиляйся!`, ok: (t) => t.goalT >= 10 },
];
const TUT_TIPS = {
  points: () => `Є очко талантів! Відкрий дерево — ${kb('talents')}`,
  lowhp: () => `Мало здоров'я! Випий зілля — ${kb('potion')}`,
  telegraph: () => 'Червоний сектор перед ворогом — це замах. Ухились або відступи!',
  elite: () => 'Елітний ворог: міцніший і б\'є сильніше. Тримай дистанцію та вимірюй час ухилень.',
};
const tutEl = $('#tut'), tipEl = $('#tip');
let tutHtml = '', tutDoneT = 0, tipT = 0;

function newTut() { return { on: Settings.v.hints, done: !Settings.v.hints, step: 0, moved: 0, hits: 0, dodged: false, ability: false, rested: false, goalT: 0, okT: 0, tips: {} }; }
function tutEvent(name) { if (G.tut) G.tut[name] = true; }
function tutRemoveDummy() { enemies = enemies.filter((e) => !e.dummy); }
function tutActive() { return G.tut && G.tut.on && !G.tut.done && Settings.v.hints; }

function tutUpdate(dt) {
  const t = G.tut;
  if (!tutActive()) { if (tutHtml) { tutEl.classList.add('hidden'); tutHtml = ''; } }
  else {
    const s = TUT_STEPS[t.step];
    if (s.id === 'goal') t.goalT += dt;
    const ok = s.ok(t);
    if (ok && !t.okT) { t.okT = 0.001; Sfx.play('pickup'); }
    if (t.okT) { t.okT += dt; if (t.okT > 1.0) { t.step++; t.okT = 0; if (t.step >= TUT_STEPS.length) { t.done = true; tutRemoveDummy(); saveGame(); } } }
    if (!t.done) {
      const cur = TUT_STEPS[t.step];
      const dots = TUT_STEPS.map((x, i) => `<i class="${i < t.step || (i === t.step && t.okT) ? 'on' : i === t.step ? 'cur' : ''}"></i>`).join('');
      const html = `<div class="tutHead"><b>${cur.title}</b><span class="dots">${dots}</span></div><div class="tutText ${t.okT ? 'ok' : ''}">${t.okT ? '✔ ' : ''}${cur.html(t)}</div>`;
      if (html !== tutHtml) { tutHtml = html; $('#tutBody').innerHTML = html; }
      tutEl.classList.remove('hidden');
    } else { tutEl.classList.add('hidden'); tutHtml = ''; }
  }
  // контекстні поради
  if (G.tut && Settings.v.hints) {
    const tips = G.tut.tips;
    if (tipT > 0) { tipT -= dt; if (tipT <= 0) tipEl.classList.add('hidden'); }
    if (tipT <= 0) {
      let id = null;
      if (!tips.points && P.points > 0 && P.level >= 2) id = 'points';
      else if (!tips.lowhp && P.hp < P.maxHp * 0.35 && P.potions > 0) id = 'lowhp';
      else if (!tips.telegraph && enemies.some((e) => e.atk && e.ai === 'melee' && dist(e, P) < 150)) id = 'telegraph';
      else if (!tips.elite && enemies.some((e) => e.elite && e.aggro)) id = 'elite';
      if (id) { tips[id] = true; tipEl.innerHTML = TUT_TIPS[id](); tipEl.classList.remove('hidden'); tipT = 6; Sfx.tone(700, 0.08, 'triangle', 0.05); }
    }
  }
}
function tutHide() { tutEl.classList.add('hidden'); tipEl.classList.add('hidden'); tutHtml = ''; tipT = 0; }
$('#tutSkip').onclick = () => { if (G.tut) { G.tut.done = true; tutRemoveDummy(); saveGame(); } tutEl.classList.add('hidden'); tutHtml = ''; Sfx.play('click'); };
