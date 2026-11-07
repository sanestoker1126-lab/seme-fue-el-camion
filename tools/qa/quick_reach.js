// Quick reachability report for the whole world (one difficulty). Usage: node quick_reach.js <projectRoot> [difficulty]
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
process.chdir(root);
const { analyze } = require(path.join(root, 'tests', 'reach.js'));
const NS = globalThis.CAMION;
const d = process.argv[3] || 'normal';
const t0 = Date.now();
const W = NS.World.buildWorld({ difficulty: d });
const r = analyze(W);
console.log(JSON.stringify({ d, ms: Date.now() - t0, scenes: W.scenes.length, nodes: r.nodes, edges: r.edges,
  items: r.checks.items, keys: r.checks.keys, alcoves: r.checks.alcoves, rooms: r.checks.rooms.filter(Boolean).length,
  cps: r.checks.checkpoints.map((x) => (x ? 1 : 0)).join(''), traps: r.checks.traps.length, problems: r.problems.slice(0, 30) }, null, 1));
