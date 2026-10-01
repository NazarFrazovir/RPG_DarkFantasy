// Балансний симулятор: проганяє бота за кожен клас і друкує зведення.
// Запуск: node tools/balance-sim.js [--runs 4] [--classes knight,pyro,ranger,necro] [--patch "LEVELS[1].scale=1.4"] [--json out.json]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SKILL = +arg('skill', 0.85), RUNS = +arg('runs', 4), CLASSES = arg('classes', 'knight,pyro,ranger,necro').split(','), PATCH = arg('patch', ''), OUT = arg('json', '');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' }); const all = [];
  for (const cls of CLASSES) {
    for (let r = 0; r < RUNS; r++) {
      const pg = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
      await pg.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await pg.waitForTimeout(300);
      await pg.addScriptTag({ path: path.join(__dirname, 'bot.js') });
      if (PATCH) await pg.evaluate(PATCH);
      const t0 = Date.now();
      const m = await pg.evaluate(([c, s, k]) => runBot(c, s, { skill: k }), [cls, 1000 + r * 17, SKILL]);
      m.wall = Math.round((Date.now() - t0) / 1000); m.errs = errs.length; all.push(m);
      console.log(`${cls.padEnd(7)} #${r} ${m.win ? 'WIN ' : 'FAIL'} ${m.fail || ''} deaths=${m.deaths} lvl=${m.plevel} t=${m.time}s lvT=[${m.levelTimes}] dmg=${Math.round(m.dmg)}[${m.dmgLv.map(Math.round)}] pots=${m.potions} ${m.deathLog.map((d) => `L${d.lvl}:${d.by}`).join(',')} (${m.wall}s wall)${errs.length ? ' ERR ' + errs[0] : ''}`);
      await pg.close();
    }
  }
  console.log('\n=== Зведення ===');
  for (const cls of CLASSES) {
    const rs = all.filter((x) => x.cls === cls), avg = (f) => (rs.reduce((a, x) => a + f(x), 0) / rs.length).toFixed(1);
    console.log(`${cls.padEnd(7)} перемог ${rs.filter((x) => x.win).length}/${rs.length} · смертей ${avg((x) => x.deaths)} · рівень ${avg((x) => x.plevel)} · час ${avg((x) => x.time)}с · шкода ${avg((x) => x.dmgLv[0])}/${avg((x) => x.dmgLv[1])}/${avg((x) => x.dmgLv[2])} (L1/L2/бос) · зілля ${avg((x) => x.potions)} · смерті на босі ${avg((x) => x.deathLog.filter((d) => d.lvl === 2).length)}`);
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(all, null, 1));
  await b.close();
})();
