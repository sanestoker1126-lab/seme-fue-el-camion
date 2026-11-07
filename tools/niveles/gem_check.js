// Gem reachability per level (single-level worlds) using the real-physics analyzer probe.
// Usage: node gem_check.js <projectRoot> [levels csv] [difficulty]
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
require(path.join(root, 'tests', 'helpers.js')).load();
const { analyze } = require(path.join(root, 'tests', 'reach.js'));
const NS = globalThis.CAMION, S = NS.LEVELS.LEVEL_SEQUENCE;
const list = process.argv[3] ? process.argv[3].split(',').map(Number) : S.map((_, i) => i);
const d = process.argv[4] || 'normal';
for (const i of list) {
  const W = NS.World.buildWorld({ difficulty: d, levels: [S[i]] });
  const r = analyze(W, { gems: true });
  const g = r.checks.gems;
  const miss = g.missing.map((id) => { const p = W.pickups.find((q) => q.id === id); return `${id}@(${p.x.toFixed(0)},${p.y.toFixed(0)})`; });
  console.log(`${String(i).padStart(2)} ${S[i].id.padEnd(22)} gems ${g.any}/${g.total} (sin daño ${g.safe}) ${miss.join(' ')}`);
}
