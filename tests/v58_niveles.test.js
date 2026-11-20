// V58 · Niveles al doble, misiones completas y reglas nuevas, con la física y el bucle de juego reales.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers');
const { analyze } = require('./reach');
const NS = load(), LV = NS.LEVELS, C = NS.CONFIG;
const DT = 1 / 60;
const NONE = { left: false, right: false, jumpPressed: false, jumpHeld: false, dashPressed: false, downPressed: false, upHeld: false, downHeld: false };
const inp = (o) => Object.assign({}, NONE, o || {});

test('cada nivel crece al doble: los verticales en ancho y alto; los apaisados en alto', () => {
  for (const d of LV.LEVEL_SEQUENCE) {
    const b = d.baseMap, m = d.map;
    // V58.1: la escuela se trazó sobre su lámina (Escuela Miguel Hidalgo): más del doble en ancho y alto.
    if (m.worldArt) { assert.ok(m.width >= b.width * 2 && m.height >= b.height * 2, d.id); }
    else if (b.width >= 1200) { assert.equal(m.width, b.width, d.id); assert.equal(m.height, b.height * 2, d.id); }
    else { assert.equal(m.width, b.width * 2, d.id); assert.equal(m.height, b.height * 2, d.id); }
    assert.equal(m.surfaces.filter((s) => s.start).length, 1, d.id + ': una parada');
    assert.equal(m.surfaces.filter((s) => s.exit).length, 1, d.id + ': una meta');
    assert.equal(m.surfaces.filter((s) => s.mid).length, 1, d.id + ': una parada intermedia');
    assert.ok(m.zips.length >= 1, d.id + ': al menos una tirolesa');
    const exit = m.surfaces.find((s) => s.exit);
    assert.ok((exit.x2 - exit.x1) * C.world.sceneScale >= 600, d.id + ': la meta es una arena amplia');
    // Plataformas largas para correr: la sección nueva tiene filas de al menos 300 u de mundo.
    assert.ok(m.surfaces.some((s) => (s.gen || m.worldArt) && (s.x2 - s.x1) * C.world.sceneScale >= 300), d.id + ': filas largas');
  }
});

test('mar completo y órbita: mundo de borde a borde, mar hasta el lecho con Poseidón, gravedad menor en órbita', () => {
  const sea = NS.World.buildWorld({ levels: [LV.SUBMARINO_LEVEL] });
  const z = sea.waters.find((q) => q.sea);
  // V58.2: bajo la isla todo es mar: llega hasta el lecho, donde está la escotilla (meta). Se baja nadando.
  assert.ok(z && z.deep && z.toStreet && z.drains.length === 0);
  assert.ok(Math.abs(z.y2 - sea.bounds.streetY) < 1, 'el mar llega al lecho');
  assert.ok(sea.goal.y1 < z.y2 && sea.goal.y2 > z.y2 - 1 && sea.goal.x1 > z.x1 && sea.goal.x2 < z.x2, 'la escotilla está en el lecho del mar');
  assert.ok(Math.abs(z.x1 - sea.bounds.x1) < 2 && Math.abs(z.x2 - sea.bounds.x2) < 2, 'el mar va de pared a pared');
  assert.ok(sea.breaches.length === 2, 'dos brechas en los puentes de la meseta');
  const shark = sea.foes.find((f) => f.isBoss);
  assert.equal(shark.kind, 'poseidon'); assert.equal(shark.waterZone, z, 'Poseidón está en el mar, sobre la salida');
  assert.ok(sea.foes.some((f) => f.kind === 'crab'), 'cangrejos en las ruinas');
  const orbit = NS.World.buildWorld({ levels: [LV.ESPACIAL_LEVEL] });
  assert.equal(orbit.gravityMul, 0.72);
  assert.ok(orbit.foes.some((f) => f.kind === 'robot'), 'robots en la estación');
  assert.equal(NS.World.buildWorld({ levels: LV.MISSIONS[1].levels }).gravityMul, 1, 'en la ciudad la gravedad es la normal');
});

for (const mi of [0, 1]) {
  test(`misión ${mi + 1} completa (transiciones entre niveles): meta, paradas y paradas intermedias sin trampas`, () => {
    const W = NS.World.buildWorld({ levels: LV.MISSIONS[mi].levels, difficulty: 'normal' });
    const r = analyze(W);
    assert.deepEqual(r.problems, []);
    assert.equal(r.checks.midpoints.length, W.scenes.length);
    assert.ok(r.checks.midpoints.every(Boolean));
  });
}

function game(mission) {
  const G = NS.Game.createGame({});
  G.setView(844, 390);
  G.newRun({ mission, startTramo: 0, difficulty: 'normal' });
  return G;
}

test('bajo el agua: el pez de su estanque sí alcanza a Sofía y el dash la deja contraatacar', () => {
  const G = game(2), W = G.world, P = G.P;
  const shark = W.foes.find((f) => f.kind === 'shark');
  const z = shark.waterZone;
  // Sofía buceando junto al tiburón mientras embiste: recibe daño (antes era intocable bajo el agua).
  W.foes.forEach((f) => { if (f !== shark) f.dead = true; });
  let hurt = 0;
  for (let i = 0; i < 360 && !hurt; i++) {
    P.x = shark.x - 8; P.y = shark.y; P.vx = 0; P.vy = 0; P.invuln = 0;
    if (shark.state === 'fly') { shark.cool = 0; }
    G.step(DT, inp({ downHeld: true }));
    hurt += G.drainEvents().filter((e) => e.type === 'hurt').length;
  }
  assert.ok(P.water === z && P.submerged, 'buceando');
  assert.ok(hurt >= 1, 'la embestida bajo el agua hace daño');
  // Mareado, el dash bajo el agua sí lo golpea.
  G.run.lives = 3; let hits = 0;
  for (let i = 0; i < 240 && !hits; i++) {
    shark.state = 'dizzy'; shark.stateT = 0; shark.hitCD = 0;
    P.x = shark.x - 46; P.y = shark.y; P.dashCD = 0; P.invuln = 2;
    G.step(DT, inp({ right: true, dashPressed: i % 20 === 0, downHeld: true }));
    hits += G.drainEvents().filter((e) => e.type === 'bossHit' || e.type === 'foeKilled').length;
  }
  assert.ok(hits >= 1, 'el dash conecta bajo el agua');
});

test('GATAS: Luna derrota al enemigo cercano; sin enemigos, Morita trae los cristales; hay enfriamiento', () => {
  const G = game(0), W = G.world, P = G.P;
  for (let i = 0; i < 30; i++) G.step(DT, inp());
  const rat = W.foes.find((f) => f.kind === 'rat' && !f.isBoss && f.region === 'main');
  W.foes.forEach((f) => { if (f !== rat) f.dead = true; });
  P.x = rat.x - 90; P.y = rat.plat.y - P.h / 2; P.ground = rat.plat; G.updateCamera(0, true);
  G.drainEvents();
  G.step(DT, inp({ catsPressed: true }));
  // V58.2: Luna salta en arco hasta la rata y la araña al caer (≈ 0,36 s): el golpe llega con ella.
  const ev1 = G.drainEvents();
  assert.ok(ev1.some((e) => e.type === 'catCommand' && e.cat === 'luna'));
  assert.ok(!rat.dead && G.companions.agents.luna.mode === 'pounce', 'Luna va en el aire');
  let scratched = false;
  for (let i = 0; i < 30 && !scratched; i++) { G.step(DT, inp()); scratched = G.drainEvents().some((e) => e.type === 'catScratch'); }
  assert.ok(scratched && rat.dead, 'Luna derribó a la rata al caer sobre ella');
  assert.ok(G.companions.cmdCD > 0, 'enfriamiento');
  G.step(DT, inp({ catsPressed: true }));
  assert.ok(!G.drainEvents().some((e) => e.type === 'catCommand'), 'no se repite durante el enfriamiento');
  // Morita: cristales cercanos vuelan hacia Sofía y se recogen.
  G.companions.cmdCD = 0;
  const gems0 = G.run.gems;
  const near = W.pickups.filter((g) => g.type === 'gem' && !g.got && Math.hypot(g.x - P.x, g.y - P.y) < C.cats.gemRange);
  assert.ok(near.length >= 1, 'hay cristales cerca para la prueba');
  G.step(DT, inp({ catsPressed: true }));
  assert.equal(G.companions.lastCmd, 'morita');
  for (let i = 0; i < 150; i++) G.step(DT, inp());
  assert.ok(G.run.gems >= gems0 + near.length, `cristales traídos: ${G.run.gems - gems0} de ${near.length}`);
});

test('parada intermedia: se activa al pisar su fila y el reintento reaparece ahí, en la misma misión', () => {
  const G = game(1), W = G.world;
  const mp = W.midpoints.find((q) => q.scene === 0);
  G.P.x = mp.x; G.P.y = mp.y - G.P.h / 2 - 30; G.P.vy = 0; G.P.ground = null;
  for (let i = 0; i < 40; i++) G.step(DT, inp());
  assert.equal(G.checkpoint, mp, 'activa la parada intermedia');
  assert.ok(G.drainEvents().some((e) => e.type === 'checkpoint'));
  for (let i = 0; i < 3; i++) { G.P.invuln = 0; G.hurt(G.P.x + 5, G.P.y, 'rat'); }
  for (let i = 0; i < 90 && G.state !== 'gameover'; i++) G.step(DT, inp());
  assert.equal(G.state, 'gameover');
  G.retry();
  assert.equal(G.missionId, 'guadalajara', 'reintenta la misma misión');
  assert.equal(G.world.scenes.length, LV.MISSIONS[1].levels.length);
  assert.ok(G.checkpoint && G.checkpoint.mid, 'sigue en la parada intermedia');
  assert.ok(Math.abs(G.P.x - mp.x) < 1 && Math.abs(G.P.y + G.P.h / 2 - mp.y) < 1, 'reaparece sobre ella');
});

test('escena post-créditos: solo al terminar la última misión con las seis llaves', () => {
  const win = (mission, allKeys) => {
    const G = NS.Game.createGame({});
    G.setView(844, 390);
    if (allKeys) for (const it of NS.STORY.ITEMS) G.save.items[it.id] = true;
    G.newRun({ mission, startTramo: 0 });
    G.P.x = G.world.goal.x1 + 10; G.P.y = G.world.street.y1 - G.P.h / 2; G.P.ground = G.world.street;
    for (let i = 0; i < 400 && G.state !== 'won'; i++) G.step(DT, inp());
    return G.drainEvents().find((e) => e.type === 'victory');
  };
  const last = LV.MISSIONS.length - 1;
  assert.equal(win(last, true).postCredits, true);
  assert.equal(win(last, false).postCredits, false, 'sin las seis llaves no se desbloquea');
  assert.equal(win(0, true).postCredits, false, 'no en una misión intermedia');
});
