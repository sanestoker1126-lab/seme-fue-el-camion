// Fast validation of a single map: builds a world with just that level and runs the real-physics analyzer.
// Usage: node level_check.js <projectRoot> <levelIndex|mapName> [difficulties csv]
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
require(path.join(root, 'tests', 'helpers.js')).load();
const { analyze } = require(path.join(root, 'tests', 'reach.js'));
const NS = globalThis.CAMION;
const key = process.argv[3];
const S = NS.LEVELS.LEVEL_SEQUENCE;
let def = /^\d+$/.test(key) ? S[+key] : null;
if (!def) { const m = NS.LEVELS[key]; def = Object.assign({}, S[3], { id: 'test_' + key, map: m, file: null, bg: null, art: undefined, tutorial: false }); }
const diffs = (process.argv[4] || 'facil,normal,dificil').split(',');
for (const d of diffs) {
  const t0 = Date.now();
  const W = NS.World.buildWorld({ difficulty: d, levels: [def] });
  const r = analyze(W);
  const boss = W.foes.find((f) => f.isBoss);
  console.log(JSON.stringify({ level: def.id, map: def.map.id, d, ms: Date.now() - t0, nodes: r.nodes, cps: r.checks.checkpoints.map((x) => (x ? 1 : 0)).join(''),
    goal: r.checks.goalFromStart, rooms: r.checks.rooms.filter(Boolean).length, keys: r.checks.keys, alcoves: r.checks.alcoves, traps: r.checks.traps.length,
    gates: W.gates.length, arena: boss && boss.arena ? Math.round(boss.arena.w) : null, problems: r.problems }));
}
