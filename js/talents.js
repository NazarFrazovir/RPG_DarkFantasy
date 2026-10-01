'use strict';
// ===== ТАЛАНТИ: дерева класів, підкласи (р.5), вознесіння (р.10), перерахунок статів =====
// Вузол: { id, name, desc, fx(m) } — fx змінює «моди» гравця (P.m). Гачки в бою читають P.m (див. skills.js).
// Тири відкриваються за рівнем гравця: TIER_LEVELS. Очко талантів — за кожен рівень, починаючи з 2-го.

const TIER_LEVELS = [2, 3, 4, 6, 8];
const SUB_LEVEL = 5, ASC_LEVEL = 10;

function defaultMods() {
  return {
    hpMul: 1, hpAdd: 0, dmgMul: 1, asMul: 1, spdMul: 1, crit: 0, critDmg: 0, lifesteal: 0, cdr: 0, dodgeCd: 1, xpMul: 1, magnet: 0,
    potionHeal: 0, potionsMax: 0, taken: 1, lowTaken: 1, thorns: 0, abInv: 0,
    arc: 1, range: 1, rhythm: 0, emberN: 0, exec: 0, burnDmg: 0, frontCut: 0,
    bleed: 0, burnOn: 0, poison: 0, slowOn: 0, markOn: 0, weakOn: 0, ashMark: 0, critMark: 0, backstab: 0, far: 0,
    parry: 0, abShield: 0, abBurn: 0, abWeak: 0, abStun: 0, abZone: 0, abHeal: 0, abCd: 1,
    killHeal: 0, killBoom: 0, killZone: 0, phoenix: 0, immortal: 0, lastStand: 0, lastStandAt: 0.3,
    dodgeNova: 0, blink: 0, invis: 0, dodgeClear: 0, trap: 0, trapN: 2, dodgeZone: 0, dodgeRing: 0, dashStrike: 0, ghostShot: 0,
    aoe: 1, pierce: 0, extraShot: 0, doubleN: 0, bounce: 0, thunderN: 0, volley: 7, meteors: 0, burnSpread: 0, burnLeech: 0, burnSlow: 0, fireSpeed: 0,
    minionHp: 1, minionN: 3, minionLife: 1, minionDmg: 1, minionBoom: 0, minionLeech: 0, autoMinions: 0, souls: 0, soulDmg: 0, soulHeal: 0, soulBlast: 0, soulPierce: 0,
    boneShield: 0, hound: 0, wallBoom: 0, pillarZone: 0, cloudFollow: 0, ashBoom: 0, headhunter: 0,
    sub: '', asc: '',
  };
}

const TALENTS = {
  knight: {
    branches: [
      { id: 'bastion', name: 'Бастіон', icon: '🛡️', nodes: [
        { id: 'kb1', name: 'Загартований', desc: '+15% максимального здоров\'я', fx: (m) => { m.hpMul *= 1.15; } },
        { id: 'kb2', name: 'Парирування', desc: 'Після ухилення перший удар оглушує ворога на 0,7 с', fx: (m) => { m.parry = 0.7; } },
        { id: 'kb3', name: 'Залізна воля', desc: '−12% шкоди; ще −12% при здоров\'ї нижче 30%', fx: (m) => { m.taken *= 0.88; m.lowTaken *= 0.88; } },
        { id: 'kb4', name: 'Щитова стіна', desc: 'Здібність дає щит на 40 шкоди (3 с)', fx: (m) => { m.abShield = 40; } },
        { id: 'kb5', name: 'Непохитний', desc: '−10% шкоди, зілля лікують на 10% більше', fx: (m) => { m.taken *= 0.9; m.potionHeal += 0.1; } },
      ] },
      { id: 'blade', name: 'Клинок', icon: '⚔️', nodes: [
        { id: 'kc1', name: 'Широкий замах', desc: 'Дуга меча +25%', fx: (m) => { m.arc *= 1.25; } },
        { id: 'kc2', name: 'Кровотеча', desc: 'Удари викликають кровотечу (30% шкоди за 3 с)', fx: (m) => { m.bleed = 0.3; } },
        { id: 'kc3', name: 'Ритм бою', desc: 'Кожен 3-й удар завдає +80% шкоди', fx: (m) => { m.rhythm = 3; } },
        { id: 'kc4', name: 'Розкол', desc: 'Дуга +30%, радіус +10%', fx: (m) => { m.arc *= 1.3; m.range *= 1.1; } },
        { id: 'kc5', name: 'Кат', desc: '+100% шкоди по ворогах із менш ніж 25% здоров\'я', fx: (m) => { m.exec = 1; } },
      ] },
      { id: 'ember', name: 'Жар', icon: '🔥', nodes: [
        { id: 'ke1', name: 'Жар у серці', desc: 'Зілля лікують на 12% більше', fx: (m) => { m.potionHeal += 0.12; } },
        { id: 'ke2', name: 'Іскри', desc: 'Вбивство лікує 3% здоров\'я', fx: (m) => { m.killHeal += 0.03; } },
        { id: 'ke3', name: 'Полум\'яний щит', desc: 'Здібність підпалює ворогів', fx: (m) => { m.abBurn = 1; } },
        { id: 'ke4', name: 'Свіча віри', desc: 'Раз за рівень воскресаєш із 30% здоров\'я', fx: (m) => { m.phoenix = Math.max(m.phoenix, 0.3); } },
        { id: 'ke5', name: 'Жар Попелу', desc: 'Кожен 6-й удар запалює меч: 3 удари з вогнем і +35% шкоди', fx: (m) => { m.emberN = 6; } },
      ] },
    ],
    subs: [
      { id: 'k_a', name: 'Вартовий Щита', icon: '🛡️', desc: 'Удари спереду (дуга 120°) завдають на 50% менше. Здібність → «Стіна щитів»: 4 с відбиває снаряди.', fx: (m) => { m.frontCut = 0.5; },
        ascs: [
          { id: 'ka1', name: 'Незламний', desc: 'Раз за рівень смертельний удар лишає 1 здоров\'я й дає 3 с невразливості', fx: (m) => { m.immortal = 1; } },
          { id: 'ka2', name: 'Громовий Страж', desc: 'Відбиті снаряди вибухають і оглушують', fx: (m) => { m.wallBoom = 1; } },
        ] },
      { id: 'k_b', name: 'Палаючий Клинок', icon: '🗡️', desc: 'Кожен удар підпалює; +10% шкоди горючим. Здібність → «Вогняна хвиля» (конус).', fx: (m) => { m.burnOn = 1; m.burnDmg = 0.1; },
        ascs: [
          { id: 'kb1x', name: 'Інквізитор Попелу', desc: 'Горючі вороги вибухають при смерті', fx: (m) => { m.killBoom = 1; } },
          { id: 'kb2x', name: 'Феніксів Лицар', desc: '+35% шкоди при здоров\'ї <50%; ухилення лишає вогняне кільце', fx: (m) => { m.lastStand = 1.35; m.lastStandAt = 0.5; m.dodgeRing = 1; } },
        ] },
    ],
  },
  pyro: {
    branches: [
      { id: 'fire', name: 'Вогонь', icon: '🔥', nodes: [
        { id: 'pf1', name: 'Широкий вибух', desc: 'Вибух кулі +30% радіусу', fx: (m) => { m.aoe *= 1.3; } },
        { id: 'pf2', name: 'Подвійний заряд', desc: 'Кожна 4-та куля летить подвійною', fx: (m) => { m.doubleN = 4; } },
        { id: 'pf3', name: 'Підпал', desc: 'Горіння перекидається на сусідів цілі', fx: (m) => { m.burnSpread = 1; } },
        { id: 'pf4', name: 'Метеори', desc: 'Здібність викликає ще 3 метеори на ворогів', fx: (m) => { m.meteors = 3; } },
        { id: 'pf5', name: 'Серце вулкана', desc: 'Горючі вороги вибухають при смерті', fx: (m) => { m.killBoom = 1; } },
      ] },
      { id: 'ash', name: 'Попіл', icon: '🌫️', nodes: [
        { id: 'pa1', name: 'Попелясті кайдани', desc: 'Горючі вороги рухаються на 20% повільніше', fx: (m) => { m.burnSlow = 0.2; } },
        { id: 'pa2', name: 'Задуха', desc: 'Здібність на 3 с послаблює ворогів (−25% шкоди)', fx: (m) => { m.abWeak = 0.75; } },
        { id: 'pa3', name: 'Попіл до попелу', desc: 'Горючий ворог при смерті лишає зону уповільнення', fx: (m) => { m.killZone = 1; } },
        { id: 'pa4', name: 'Кокон', desc: 'Ухилення знищує ворожі снаряди поблизу', fx: (m) => { m.dodgeClear = 1; } },
        { id: 'pa5', name: 'Ера попелу', desc: 'Здібність оглушує на 1,5 с', fx: (m) => { m.abStun = 1.5; } },
      ] },
      { id: 'heat', name: 'Жар', icon: '☀️', nodes: [
        { id: 'ph1', name: 'Тліючий розум', desc: '−15% перезарядки здібності', fx: (m) => { m.cdr += 0.15; } },
        { id: 'ph2', name: 'Живий вогонь', desc: '+12% швидкості, поки поруч горить ворог', fx: (m) => { m.fireSpeed = 0.12; } },
        { id: 'ph3', name: 'Поглинання', desc: 'Горіння ворогів повільно лікує тебе', fx: (m) => { m.burnLeech = 1; } },
        { id: 'ph4', name: 'Спалах', desc: 'Ухилення завдає шкоди навколо', fx: (m) => { m.dodgeNova = 1.2; } },
        { id: 'ph5', name: 'Саморозпал', desc: 'При здоров\'ї <30% шкода +50%', fx: (m) => { m.lastStand = Math.max(m.lastStand, 1.5); } },
      ] },
    ],
    subs: [
      { id: 'p_a', name: 'Інфернальний маг', icon: '🌋', desc: 'Кулі пробивають ціль і летять далі. Здібність → «Вогняний стовп» у точці курсора.', fx: (m) => { m.pierce += 1; },
        ascs: [
          { id: 'pa1x', name: 'Володар полум\'я', desc: 'Стовп лишає зону вогню на 4 с', fx: (m) => { m.pillarZone = 1; } },
          { id: 'pa2x', name: 'Фенікс', desc: 'Здібність дає 2 с невразливості й лікує 15%', fx: (m) => { m.abHeal = 0.15; m.abInv = 2; } },
        ] },
      { id: 'p_b', name: 'Попелястий чаклун', icon: '🌫️', desc: 'Кулі позначають ворога «Попелом» (+15% шкоди 4 с). Здібність → «Хмара попелу».', fx: (m) => { m.ashMark = 0.15; },
        ascs: [
          { id: 'pb1x', name: 'Повелитель праху', desc: 'Хмара рухається разом із тобою', fx: (m) => { m.cloudFollow = 1; } },
          { id: 'pb2x', name: 'Вісник попелу', desc: 'Позначений «Попелом» ворог при смерті вибухає', fx: (m) => { m.ashBoom = 1; } },
        ] },
    ],
  },
  ranger: {
    branches: [
      { id: 'shadow', name: 'Тінь', icon: '🌑', nodes: [
        { id: 'rs1', name: 'Легка хода', desc: '+10% швидкості руху', fx: (m) => { m.spdMul *= 1.1; } },
        { id: 'rs2', name: 'Крок у тінь', desc: 'Ухилення переносить на 70 пікселів далі', fx: (m) => { m.blink = 70; } },
        { id: 'rs3', name: 'Вразливість', desc: 'Критичні удари позначають ціль (+25% шкоди на 3 с)', fx: (m) => { m.critMark = 0.25; } },
        { id: 'rs4', name: 'Невидимка', desc: 'Після ухилення 2 с невидимий для ворогів', fx: (m) => { m.invis = Math.max(m.invis, 2); } },
        { id: 'rs5', name: 'Удар у спину', desc: '+120% шкоди по ворогах, що не бачать тебе', fx: (m) => { m.backstab = 1.2; } },
      ] },
      { id: 'arrow', name: 'Стріла', icon: '🏹', nodes: [
        { id: 'ra1', name: 'Гостра стріла', desc: '+1 пробиття', fx: (m) => { m.pierce += 1; } },
        { id: 'ra2', name: 'Подвійний постріл', desc: '20% шансу випустити 2 стріли', fx: (m) => { m.extraShot = 0.2; } },
        { id: 'ra3', name: 'Рикошет', desc: 'Стріли відбиваються від стіни один раз', fx: (m) => { m.bounce = 1; } },
        { id: 'ra4', name: 'Злива+', desc: 'Здібність випускає 11 стріл', fx: (m) => { m.volley = 11; } },
        { id: 'ra5', name: 'Громова стріла', desc: 'Кожна 5-та стріла вибухає й оглушує', fx: (m) => { m.thunderN = 5; } },
      ] },
      { id: 'hunt', name: 'Полювання', icon: '🎯', nodes: [
        { id: 'rh1', name: 'Пастка', desc: 'Ухилення лишає пастку (шкода й зупинка), до 2 одночасно', fx: (m) => { m.trap = 1; } },
        { id: 'rh2', name: 'Мітка', desc: 'Перший удар позначає ворога (+20% шкоди 5 с)', fx: (m) => { m.markOn = Math.max(m.markOn, 0.2); } },
        { id: 'rh3', name: 'Отрута', desc: 'Стріли отруюють (35% шкоди за 4 с)', fx: (m) => { m.poison = 0.35; } },
        { id: 'rh4', name: 'Пес-слідопит', desc: 'Вірний пес допомагає в бою', fx: (m) => { m.hound = 1; } },
        { id: 'rh5', name: 'Хижак', desc: 'Вбивство позначеної цілі скорочує перезарядки на 30%', fx: (m) => { m.headhunter = Math.max(m.headhunter, 0.3); } },
      ] },
    ],
    subs: [
      { id: 'r_a', name: 'Тіньовий клинок', icon: '🗡️', desc: 'Ухилення — ривок, що ранить ворогів на шляху. Здібність → «Сальто-вистріл».', fx: (m) => { m.dashStrike = 1; },
        ascs: [
          { id: 'ra1x', name: 'Привид', desc: 'Після ухилення 3 с невидимості, наступний постріл ×3', fx: (m) => { m.invis = Math.max(m.invis, 3); m.ghostShot = 3; } },
          { id: 'ra2x', name: 'Мисливець за головами', desc: 'Удари по елітах/босах накопичують мітки; на 5-й — страта (15% здоров\'я цілі)', fx: (m) => { m.headhunter = Math.max(m.headhunter, 0.3); m.deathMark = 1; } },
        ] },
      { id: 'r_b', name: 'Слідопит', icon: '🌲', desc: 'Стріли отруюють і уповільнюють. Здібність → «Злива ловця» (град стріл у точці).', fx: (m) => { m.poison = Math.max(m.poison, 0.25); m.slowOn = 0.15; },
        ascs: [
          { id: 'rb1x', name: 'Володар лісу', desc: 'Пасток більше (4) і вони б\'ють сильніше', fx: (m) => { m.trapN = 4; m.trap = Math.max(m.trap, 1); } },
          { id: 'rb2x', name: 'Нічний снайпер', desc: '+100% шкоди по ворогах далі 260 пікселів; −30% перезарядки здібності', fx: (m) => { m.far = 1; m.abCd *= 0.7; } },
        ] },
    ],
  },
  necro: {
    branches: [
      { id: 'dead', name: 'Мерці', icon: '🧟', nodes: [
        { id: 'nd1', name: 'Міцні кістки', desc: 'Слуги +40% здоров\'я', fx: (m) => { m.minionHp *= 1.4; } },
        { id: 'nd2', name: 'П\'ятий слуга', desc: 'Здібність викликає 5 слуг', fx: (m) => { m.minionN = Math.max(m.minionN, 5); } },
        { id: 'nd3', name: 'Мстиві', desc: 'Слуга, що гине, вибухає', fx: (m) => { m.minionBoom = 1; } },
        { id: 'nd4', name: 'Вампіри', desc: 'Удари слуг лікують тебе', fx: (m) => { m.minionLeech = 0.02; } },
        { id: 'nd5', name: 'Орда', desc: 'Слуги живуть довше й б\'ють на 30% сильніше', fx: (m) => { m.minionLife *= 1.7; m.minionDmg *= 1.3; } },
      ] },
      { id: 'souls', name: 'Душі', icon: '👻', nodes: [
        { id: 'ns1', name: 'Жнива', desc: 'Вбивства дають заряди душ (до 5)', fx: (m) => { m.souls = 1; } },
        { id: 'ns2', name: 'Вибух душі', desc: 'Здібність витрачає заряди на вибух навколо', fx: (m) => { m.soulBlast = 1; } },
        { id: 'ns3', name: 'Висмоктування', desc: 'Кожна 3-тя душа лікує 6% здоров\'я', fx: (m) => { m.soulHeal = 0.06; } },
        { id: 'ns4', name: 'Прокляття слабкості', desc: 'Кулі послаблюють ворога (−20% шкоди 4 с)', fx: (m) => { m.weakOn = 0.8; } },
        { id: 'ns5', name: 'Бог смерті', desc: 'Кожен заряд душі додає +4% шкоди', fx: (m) => { m.soulDmg = 0.04; } },
      ] },
      { id: 'bones', name: 'Кістки', icon: '🦴', nodes: [
        { id: 'nb1', name: 'Кістяний щит', desc: 'Поглинає 30 шкоди, відновлюється за 12 с', fx: (m) => { m.boneShield = 30; } },
        { id: 'nb2', name: 'Шипи', desc: 'Нападники отримують 12 шкоди', fx: (m) => { m.thorns = 12; } },
        { id: 'nb3', name: 'Кістяний бастіон', desc: 'Ухилення лишає зону, що уповільнює ворогів', fx: (m) => { m.dodgeZone = 1; } },
        { id: 'nb4', name: 'Могильна пара', desc: 'Здібність лишає зону уповільнення', fx: (m) => { m.abZone = 1; } },
        { id: 'nb5', name: 'Спільна смерть', desc: 'Здібність лікує 4% здоров\'я за кожного слугу', fx: (m) => { m.abHeal = Math.max(m.abHeal, 0.04); m.healPerMinion = 1; } },
      ] },
    ],
    subs: [
      { id: 'n_a', name: 'Король мерців', icon: '👑', desc: 'Завжди 2 слуги поруч. Здібність → «Кістяний голем» (великий слуга).', fx: (m) => { m.autoMinions = 2; },
        ascs: [
          { id: 'na1x', name: 'Володар орди', desc: 'Постійно 4 слуги; голем міцніший', fx: (m) => { m.autoMinions = 4; m.minionHp *= 1.25; } },
          { id: 'na2x', name: 'Мавзолей', desc: 'Слуги б\'ють на 50% сильніше й живуть вдвічі довше', fx: (m) => { m.minionDmg *= 1.5; m.minionLife *= 2; } },
        ] },
      { id: 'n_b', name: 'Жнець душ', icon: '⚰️', desc: '+6% викрадення життя. Здібність → «Жнива»: вибух душ, що лікує.', fx: (m) => { m.lifesteal += 0.06; },
        ascs: [
          { id: 'nb1y', name: 'Ліч', desc: 'Заряди душ підсилюють кулі: пробиття росте з зарядами', fx: (m) => { m.soulPierce = 1; m.souls = Math.max(m.souls, 1); } },
          { id: 'nb2y', name: 'Господар кладовища', desc: 'Раз за рівень воскресаєш із 40% здоров\'я', fx: (m) => { m.phoenix = Math.max(m.phoenix, 0.4); } },
        ] },
    ],
  },
};

// плоскі таблиці
const NODE_BY_ID = {}, SUB_BY_ID = {}, ASC_BY_ID = {};
Object.entries(TALENTS).forEach(([cid, t]) => {
  t.branches.forEach((b) => b.nodes.forEach((n, i) => { n.branch = b.id; n.tier = i; n.cls = cid; NODE_BY_ID[n.id] = n; }));
  t.subs.forEach((s) => { s.cls = cid; SUB_BY_ID[s.id] = s; s.ascs.forEach((a) => { a.sub = s.id; ASC_BY_ID[a.id] = a; }); });
});

// ---------- Перерахунок статів гравця ----------
function recalcPlayer() {
  const c = P.cls, m = defaultMods(); P.m = m;
  (P.talents || []).forEach((id) => { const n = NODE_BY_ID[id]; if (n) n.fx(m); });
  const sub = SUB_BY_ID[P.sub]; if (sub) { sub.fx(m); m.sub = sub.id; }
  const asc = ASC_BY_ID[P.asc]; if (asc) { asc.fx(m); m.asc = asc.id; }
  if (typeof applyItems === 'function') applyItems(m);
  const L = P.level - 1, ratio = P.maxHp ? P.hp / P.maxHp : 1;
  P.maxHp = Math.round(c.hp * (1 + 0.05 * L) * m.hpMul + m.hpAdd);
  P.hp = Math.min(P.maxHp, Math.max(1, ratio * P.maxHp));
  P.dmg = c.dmg; P.dmgMul = m.dmgMul * (1 + 0.04 * L); P.asMul = m.asMul; P.spdMul = m.spdMul; P.speed = c.speed;
  P.crit = 0.05 + m.crit; P.lifesteal = m.lifesteal; P.cdr = Math.min(0.6, m.cdr); P.dodgeMul = m.dodgeCd; P.xpMul = m.xpMul; P.magnet = 110 + m.magnet;
  P.potionHeal = 0.4 + m.potionHeal; P.maxPotions = 3 + m.potionsMax; P.potions = Math.min(P.potions, P.maxPotions);
}

// ---------- Очки та доступність ----------
const talentsSpent = () => (P.talents || []).length;
const pointsEarned = () => Math.max(0, P.level - 1);
function nodeState(n) {
  if ((P.talents || []).includes(n.id)) return 'taken';
  const b = TALENTS[P.cls.id].branches.find((x) => x.id === n.branch);
  const prevOk = n.tier === 0 || P.talents.includes(b.nodes[n.tier - 1].id);
  if (P.level < TIER_LEVELS[n.tier]) return 'locked-level';
  if (!prevOk) return 'locked-prev';
  return P.points > 0 ? 'available' : 'nopoints';
}
function buyTalent(id) {
  const n = NODE_BY_ID[id]; if (!n || n.cls !== P.cls.id || nodeState(n) !== 'available') return false;
  P.talents.push(id); P.points--; recalcPlayer(); return true;
}
function respecTalents() { P.talents = []; P.points = pointsEarned(); recalcPlayer(); }
function needSub() { return !P.sub && P.level >= SUB_LEVEL; }
function needAsc() { return P.sub && !P.asc && P.level >= ASC_LEVEL; }
function chooseSub(id) { const s = SUB_BY_ID[id]; if (!s || s.cls !== P.cls.id || !needSub()) return false; P.sub = id; recalcPlayer(); return true; }
function chooseAsc(id) { const a = ASC_BY_ID[id]; if (!a || a.sub !== P.sub || !needAsc()) return false; P.asc = id; recalcPlayer(); return true; }

// ---------- Екран талантів ----------
const talEl = $('#talents');
function lvTxt(n) { return `рів. ${TIER_LEVELS[n.tier]}`; }
function renderTalents() {
  const t = TALENTS[P.cls.id], box = $('#talCols'); box.innerHTML = '';
  $('#talHead').innerHTML = `${P.cls.icon} ${P.cls.name} · рівень ${P.level} · <b>очок: ${P.points}</b>`;
  t.branches.forEach((b) => {
    const col = document.createElement('div'); col.className = 'talCol'; col.innerHTML = `<h4><span>${b.icon}</span>${b.name}</h4>`;
    b.nodes.forEach((n) => {
      const st = nodeState(n), el = document.createElement('button'); el.className = 'talNode ' + st;
      el.innerHTML = `<b>${n.name}</b><small>${n.desc}</small>${st.startsWith('locked') ? `<i>${st === 'locked-level' ? lvTxt(n) : 'потрібен попередній'}</i>` : ''}`;
      el.onclick = () => { if (buyTalent(n.id)) { Sfx.play('level'); saveGame(); renderTalents(); } else Sfx.play('click'); };
      col.appendChild(el);
    });
    box.appendChild(col);
  });
  // підклас / вознесіння
  const sb = $('#talSub'); sb.innerHTML = '';
  const subCard = (o, kind, onPick, state) => { const el = document.createElement('button'); el.className = 'talSub ' + state; el.innerHTML = `<b>${o.icon ? o.icon + ' ' : ''}${o.name}</b><small>${o.desc}</small>`; el.onclick = onPick; return el; };
  if (!P.sub) {
    sb.innerHTML = `<h4>Підклас <i>${P.level >= SUB_LEVEL ? 'обери — вибір незворотний' : 'відкриється на ' + SUB_LEVEL + ' рівні'}</i></h4>`;
    const row = document.createElement('div'); row.className = 'talSubRow';
    t.subs.forEach((s) => row.appendChild(subCard(s, 'sub', () => { if (chooseSub(s.id)) { Sfx.play('level'); saveGame(); renderTalents(); } }, P.level >= SUB_LEVEL ? 'available' : 'locked-level')));
    sb.appendChild(row);
  } else {
    const s = SUB_BY_ID[P.sub];
    sb.innerHTML = `<h4>Підклас: ${s.icon} ${s.name} <i>${P.asc ? 'вознесіння обрано' : P.level >= ASC_LEVEL ? 'обери вознесіння' : 'вознесіння на ' + ASC_LEVEL + ' рівні'}</i></h4>`;
    const row = document.createElement('div'); row.className = 'talSubRow';
    s.ascs.forEach((a) => row.appendChild(subCard(a, 'asc', () => { if (chooseAsc(a.id)) { Sfx.play('level'); saveGame(); renderTalents(); } }, P.asc === a.id ? 'taken' : P.asc ? 'nopoints' : P.level >= ASC_LEVEL ? 'available' : 'locked-level')));
    sb.appendChild(row);
  }
  const canRespec = G.near && G.near.bonfire && talentsSpent() > 0;
  $('#talRespec').disabled = !canRespec; $('#talRespec').title = G.near && G.near.bonfire ? '' : 'Тільки біля вогнища';
}
function openTalents() {
  if (G.state !== 'play' && G.state !== 'dialog') return; if (G.state === 'dialog') return;
  G.talPrev = 'play'; G.state = 'talents'; renderTalents(); talEl.classList.remove('hidden'); Sfx.play('click');
}
function closeTalents() { talEl.classList.add('hidden'); G.state = 'play'; }
$('#talClose').onclick = closeTalents;
$('#talRespec').onclick = () => { if (G.near && G.near.bonfire) { respecTalents(); saveGame(); renderTalents(); Sfx.play('potion'); } };
