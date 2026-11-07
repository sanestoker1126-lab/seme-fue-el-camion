// Pruebas del mundo: determinismo, contenido, límites y alcanzabilidad con la física real.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers');
const { analyze, buildGraph, bfs, supportOf } = require('./reach');
const NS = load();

const signature = (W) => JSON.stringify([
  W.platforms.map((p) => [p.id, +p.x1.toFixed(3), +p.y.toFixed(3), p.kind]),
  W.solids.map((s) => [s.id, s.x1, s.y1]),
  W.foes.map((f) => [f.id, +f.x.toFixed(3), +f.y.toFixed(3)]),
  W.hazards.map((h) => h.id), W.pickups.map((p) => [p.id, +p.x.toFixed(2), +p.y.toFixed(2)])
]);

test('el mundo es determinista: misma semilla, mismo mundo e identificadores', () => {
  for (const d of ['facil', 'normal', 'dificil']) {
    assert.equal(signature(NS.World.buildWorld({ difficulty: d })), signature(NS.World.buildWorld({ difficulty: d })), d);
  }
});

test('identificadores únicos en todas las colecciones', () => {
  const W = NS.World.buildWorld({});
  const ids = new Set();
  for (const list of [W.platforms, W.solids, W.hazards, W.foes, W.pickups, W.doors, W.checkpoints, W.signs]) {
    for (const o of list) { assert.ok(!ids.has(o.id), 'duplicado ' + o.id); ids.add(o.id); }
  }
});

const NLV = NS.LEVELS.LEVEL_SEQUENCE.length;

test('estructura: 16 niveles (4 nuevos), una zona inferior, una reja con llave y un jefe por nivel, 6 objetos y una meta', () => {
  const W = NS.World.buildWorld({});
  assert.equal(NLV, 16);
  assert.equal(NS.LEVELS.LEVEL_SEQUENCE.filter((d) => d.isNew).length, 4);
  assert.equal(W.scenes.length, NLV);
  assert.equal(W.rooms.length, NLV);
  assert.equal(W.gates.length, NLV);
  assert.equal(W.pickups.filter((p) => p.type === 'key').length, NLV);
  assert.equal(W.pickups.filter((p) => p.type === 'item').length, 6);
  assert.equal(W.checkpoints.length, NLV);
  assert.ok(W.bus && W.goal && W.street);
  for (const g of W.gates) assert.ok(W.pickups.some((p) => p.type === 'key' && p.keyFor === g.id), 'llave para ' + g.id);
  const bosses = W.foes.filter((f) => f.isBoss);
  assert.equal(bosses.length, NLV);
  assert.deepEqual(bosses.slice(0, 2).map((f) => f.kind), ['dog', 'kid']);
  assert.equal(bosses[0].bossName, 'PERRO FURIOSO');
  assert.equal(bosses[1].bossName, 'DUEÑO DEL PERRO · 12 AÑOS');
  for (let i = 0; i < W.scenes.length; i++) assert.ok(bosses.some((f) => f.scene === i && f.region === 'main'), 'jefe del nivel ' + (i + 1));
  // Cada tramo introduce o mezcla amenazas de forma progresiva.
  const kinds = W.scenes.map((sc) => new Set(W.foes.filter((f) => f.scene === sc.index && f.region === 'main' && !f.isBoss).map((f) => f.kind)));
  assert.deepEqual([...kinds[0]], ['rat'], 'el tramo 1 solo tiene ratas (tutorial)');
  assert.ok(kinds[NLV - 1].size >= 3, 'el nivel final mezcla al menos 3 enemigos');
});

test('la dificultad cambia la densidad de enemigos, no la geometría principal', () => {
  const F = NS.World.buildWorld({ difficulty: 'facil' }), N = NS.World.buildWorld({ difficulty: 'normal' }), D = NS.World.buildWorld({ difficulty: 'dificil' });
  assert.ok(F.foes.length < N.foes.length && N.foes.length < D.foes.length, `${F.foes.length} < ${N.foes.length} < ${D.foes.length}`);
  const painted = (W) => JSON.stringify(W.platforms.filter((p) => p.painted).map((p) => [p.x1, p.y]));
  assert.equal(painted(F), painted(D));
  const dog = (W) => W.foes.find((f) => f.kind === 'dog');
  assert.ok(dog(D).spd > dog(N).spd && dog(N).spd > dog(F).spd);
});

test('todo está dentro de los muros exteriores y nada solapa paneles con sectores', () => {
  const W = NS.World.buildWorld({});
  const { x1, x2 } = W.bounds;
  for (const p of W.platforms.filter((q) => q.region === 'main')) assert.ok(p.x1 >= x1 - 0.01 && p.x2 <= x2 + 0.01, p.id);
  for (const f of W.foes.filter((q) => q.region === 'main')) assert.ok(f.x > x1 && f.x < x2, f.id);
  for (const sc of W.scenes) {
    for (const p of [...sc.side[-1], ...sc.side[1]]) {
      assert.ok(p.x2 <= sc.x0 + 0.01 || p.x1 >= sc.x0 + sc.drawW - 0.01, 'sector fuera del panel ' + p.id);
    }
  }
});

test('enemigos caminantes: su patrulla cabe en su plataforma y no empieza dentro de una caja', () => {
  const W = NS.World.buildWorld({ difficulty: 'dificil' });
  for (const f of W.foes.filter((q) => NS.Enemies.TYPES[q.kind].walker)) {
    assert.ok(f.minX <= f.maxX, f.id);
    assert.ok(f.x >= f.minX - 0.01 && f.x <= f.maxX + 0.01, f.id);
    const b = NS.Enemies.box(f);
    const inside = W.solids.some((s) => s.kind === 'crate' && b.x1 < s.x2 && b.x2 > s.x1 && b.y1 < s.y2 - 1 && b.y2 > s.y1 + 1);
    assert.ok(!inside, 'enemigo dentro de una caja ' + f.id);
  }
});

test('la parada de inicio y la salida de cada tramo quedan despejadas', () => {
  const W = NS.World.buildWorld({ difficulty: 'dificil' });
  for (const sc of W.scenes) {
    const st = sc.startPlatform;
    assert.ok(!W.hazards.some((h) => h.plat === st), 'obstáculo en la parada ' + sc.id);
    assert.ok(!W.foes.some((f) => f.plat === st), 'enemigo en la parada ' + sc.id);
  }
});

test('el análisis respeta los sólidos: con la reja cerrada el nicho es inaccesible', () => {
  const W = NS.World.buildWorld({});
  const graph = buildGraph(W);
  const reach = bfs(graph, [W.checkpoints[0].plat]);
  const hearts = W.pickups.filter((p) => p.type === 'power' && p.inAlcove);
  for (const h of hearts) assert.ok(!reach.has(supportOf(graph.nodes, h.x, h.y)), 'nicho accesible sin llave ' + h.id);
});

for (const d of ['facil', 'normal', 'dificil']) {
  test(`alcanzabilidad (${d}): meta, paradas, objetos, llaves, todos los cristales y sin trampas`, () => {
    const r = analyze(NS.World.buildWorld({ difficulty: d }), { gems: true });
    assert.deepEqual(r.problems, []);
    assert.equal(r.checks.gems.any, r.checks.gems.total, 'cristales inalcanzables: ' + r.checks.gems.missing.join(', '));
    assert.equal(r.checks.items, 6);
    assert.equal(r.checks.keys, NLV);
    assert.equal(r.checks.alcoves, NLV);
    assert.ok(r.checks.rooms.every(Boolean));
  });
}
