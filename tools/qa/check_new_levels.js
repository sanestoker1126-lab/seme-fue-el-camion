// Verifica los niveles nuevos (misiones 3 y 4) con la física real, en las 3 dificultades.
const path = require('path');
require(path.join(__dirname, '..', '..', 'tests', 'helpers')).load();
const NS = globalThis.CAMION;
const { analyze } = require(path.join(__dirname, '..', '..', 'tests', 'reach.js'));
const LV = NS.LEVELS;
let bad = 0;
for (const [name, lvl] of [['SUBMARINO', LV.SUBMARINO_LEVEL], ['ESPACIAL', LV.ESPACIAL_LEVEL]]) {
  for (const diff of ['facil', 'normal', 'dificil']) {
    const W = NS.World.buildWorld({ levels: [lvl], difficulty: diff });
    const r = analyze(W, { gems: true });
    const g = r.checks.gems || {};
    console.log(`${name} ${diff}: problems=${r.problems.length} goal=${r.checks.goalFromStart} gems ${g.any}/${g.total} (seguros ${g.safe}) traps=${r.checks.traps.length}`);
    for (const p of r.problems) { console.log('   - ' + p); bad++; }
  }
}
console.log(bad === 0 ? '\nTODO VERDE' : `\n${bad} PROBLEMAS`);
process.exit(bad === 0 ? 0 : 1);
