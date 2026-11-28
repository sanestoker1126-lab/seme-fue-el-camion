// V58.8.24 · CONTRATOS DE TRAMO: cada tramo es una misión con objetivo obligatorio, opcional y efecto propio.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, miniWorld, input, run } = require('./helpers');
const NS = load();
const CT = NS.Contracts;
const MISSIONS = NS.LEVELS.MISSIONS;

const steps = (G, n, inp = input()) => { for (let i = 0; i < n; i++) G.step(1 / 60, typeof inp === 'function' ? inp(i) : inp); };
const place = (G, x, footY) => { const P = G.P; P.x = x; P.y = footY - P.h / 2; P.vx = 0; P.vy = 0; P.ground = null; P.airTopFoot = footY; };
function game(mission, o = {}) {
  const G = NS.Game.createGame({ assist: Object.assign({ contracts: true }, o.assist || {}) });
  G.setView(1280, 720);
  G.newRun({ mission, difficulty: o.difficulty || 'normal', startTramo: o.startTramo || 0, startMid: !!o.startMid, practice: true });
  return G;
}

test('contratos: cada nivel jugable tiene plan, y los tipos son variados', () => {
  const ids = MISSIONS.flatMap((M) => M.levels.map((d) => d.id));
  for (const id of ids) assert.ok(CT.PLAN[id], 'sin contrato: ' + id);
  const types = new Set(Object.values(CT.PLAN).map((p) => p.main.type));
  for (const t of ['jefe', 'caceria', 'cristales', 'objeto', 'contrarreloj']) assert.ok(types.has(t), 'falta el tipo ' + t);
  const mods = new Set(Object.values(CT.PLAN).map((p) => p.mod).filter(Boolean));
  assert.deepEqual([...mods].sort(), ['lluvia', 'noche', 'viento']);
  // En Guadalajara no hay dos tramos seguidos con la misma combinación de objetivo y efecto.
  const gdl = MISSIONS[1].levels.map((d) => CT.PLAN[d.id].main.type + '/' + CT.PLAN[d.id].mod);
  for (let i = 1; i < gdl.length; i++) assert.notEqual(gdl[i], gdl[i - 1], 'tramos ' + i + ' y ' + (i + 1) + ' iguales');
});

test('contratos: siempre se pueden cumplir desde el inicio y desde la parada intermedia', () => {
  for (const [mi, M] of MISSIONS.entries()) {
    for (let t = 0; t < M.levels.length; t++) {
      for (const startMid of [false, true]) {
        const G = game(mi, { startTramo: t, startMid });
        const c = G.run.contracts[t], W = G.world, sc = W.scenes[t], y0 = G.P.y - 60;
        assert.ok(c, M.id + ' ' + t + ' sin contrato');
        const m = c.main, where = M.id + ' tramo ' + (t + 1) + (startMid ? ' (intermedia)' : '');
        if (m.type === 'jefe') assert.ok(W.foes.some((f) => f.scene === t && f.isBoss && !f.secret && !f.dead && f.y > y0 - 200), 'jefe alcanzable: ' + where);
        if (m.type === 'caceria') assert.ok(m.n >= 1 && m.n <= W.foes.filter((f) => f.scene === t && !f.isBoss && f.y > y0).length, 'enemigos suficientes: ' + where);
        if (m.type === 'cristales') assert.ok(m.n >= 1 && m.n <= W.pickups.filter((p) => p.type === 'gem' && p.scene === t && p.y > y0).length, 'cristales suficientes: ' + where);
        if (m.type === 'objeto') {
          const item = W.pickups.find((p) => p.type === 'item' && p.itemIndex === c.itemIndex);
          const door = W.doors.find((d) => d.region === 'main' && d.to && d.to.region === item.region);
          assert.ok(door && door.y > y0 - 40 + 60 - 60, 'entrada a la zona oculta por debajo del punto de salida: ' + where);
        }
        if (m.type === 'contrarreloj') assert.ok(m.t >= 18, 'tiempo razonable: ' + where);
        assert.ok(CT.goalText(c).length > 8 && CT.briefText(c).startsWith('MISIÓN:'));
      }
    }
  }
});

test('contratos: bajar sin cumplir la misión la falla y se reintenta sin perder vidas', () => {
  const G = game(1);   // Guadalajara · tramo 1: vencer al dueño del perro
  const c = G.run.contract;
  assert.equal(c.main.type, 'jefe');
  const lives = G.run.lives;
  const next = G.world.checkpoints[1];
  place(G, next.x, next.y);
  steps(G, 3);
  assert.equal(G.state, 'gameover');
  const over = G.drainEvents().find((e) => e.type === 'gameover');
  assert.ok(over.contract && /dueño del perro|DUEÑO DEL PERRO/i.test(over.contract.reason), over.contract && over.contract.reason);
  assert.equal(G.run.lives, lives, 'fallar la misión no quita vidas');
  G.retry();
  assert.equal(G.state, 'playing'); assert.equal(G.tramo, 0);
  // Con el jefe vencido el paso queda libre.
  CT.update(G.run.contract, { type: 'kill', boss: true });
  assert.equal(G.run.contract.mainDone, true);
  place(G, next.x, next.y);
  steps(G, 3);
  assert.equal(G.state, 'playing'); assert.equal(G.tramo, 1);
  assert.equal(G.run.contract.levelId, 'gdl_noche');
  assert.equal(G.run.contract.mod, 'noche');
});

test('contratos: en modo OPCIONAL se avanza igual y solo se pierde la medalla', () => {
  const G = game(1, { assist: { contracts: 'opcional' } });
  const next = G.world.checkpoints[1];
  place(G, next.x, next.y);
  steps(G, 3);
  assert.equal(G.state, 'playing'); assert.equal(G.tramo, 1);
  assert.ok(G.drainEvents().some((e) => e.type === 'message' && /NO CUMPLIDA/.test(e.text)));
});

test('contratos: los derribos y cristales reales del tramo cuentan (incluidas las gatas)', () => {
  const G = game(1, { startTramo: 3, assist: { relaxed: true } });   // Centro histórico: cacería
  const c = G.run.contract;
  assert.equal(c.main.type, 'caceria');
  const W = G.world, P = G.P;
  const foe = W.foes.find((f) => f.scene === 3 && !f.isBoss && f.region === 'main' && f.hp <= 1 && ['rat', 'pigeon', 'bat', 'dog', 'chile'].includes(f.kind));
  assert.ok(foe, 'hay un enemigo débil en el tramo');
  Object.assign(foe, { x: P.x + 90, y: P.ground.y - (foe.h || 24) / 2, plat: P.ground, state: foe.state, home: P.x + 90 });
  G.catCommand();
  steps(G, 120);
  assert.ok(foe.dead, 'Luna derribó al enemigo');
  assert.equal(c.kills, 1); assert.equal(c.cats, 1);
  const gem = W.pickups.find((p) => p.type === 'gem' && p.scene === 3 && !p.got && p.region === 'main');
  place(G, gem.x, gem.y + 30);
  P.ground = null;
  steps(G, 2);
  assert.ok(gem.got); assert.ok(c.gems >= 1);
});

test('contratos: contrarreloj — si se acaba el tiempo la misión falla', () => {
  const G = game(1, { startTramo: 4, assist: { relaxed: true } });   // Los portales
  const c = G.run.contract;
  assert.equal(c.main.type, 'contrarreloj');
  G.world.foes.length = 0;
  steps(G, Math.ceil((c.main.t + 0.5) * 60));
  assert.equal(G.state, 'gameover');
  const over = G.drainEvents().find((e) => e.type === 'gameover');
  assert.match(over.contract.reason, /tiempo/);
});

test('contratos: el viento empuja en las ráfagas y no cuando está apagado', () => {
  const drift = (contracts) => {
    const G = game(1, { startTramo: 2, assist: { contracts, relaxed: true } });   // Azoteas: viento
    G.world.foes.length = 0;
    const x0 = G.P.x;
    let max = 0;
    for (let i = 0; i < 60 * 9; i++) { G.step(1 / 60, input()); max = Math.max(max, Math.abs(G.P.x - x0)); if (G.state !== 'playing') break; }
    return { max, G };
  };
  const off = drift(false), on = drift(true);
  assert.ok(off.max < 2, 'sin contratos no hay viento: ' + off.max);
  assert.ok(on.max > 8, 'la ráfaga movió a Sofía: ' + on.max);
  assert.ok(on.G.drainEvents().some((e) => e.type === 'windWarn'), 'la ráfaga se anuncia antes');
});

test('contratos: la lluvia moja el piso (más resbaloso que seco, menos que un charco)', () => {
  const slide = (wet) => {
    const W = miniWorld({ platforms: [{ x1: -2000, x2: 2000, y: 0, wet }] });
    const P = NS.Physics.createPlayer(0, -31); P.ground = W.platforms[0];
    run(NS, P, W, 50, input({ right: true }));
    const x = P.x;
    run(NS, P, W, 120, input());
    return P.x - x;
  };
  const dry = slide(false), wet = slide(true);
  assert.ok(wet > dry * 1.5, 'mojado desliza más: ' + dry.toFixed(1) + ' → ' + wet.toFixed(1));
  const W2 = miniWorld({ platforms: [{ x1: -2000, x2: 2000, y: 0 }], hazards: [] });
  W2.hazards.push({ type: 'puddle', plat: W2.platforms[0], x1: -2000, x2: 2000 });
  const P2 = NS.Physics.createPlayer(0, -31); P2.ground = W2.platforms[0];
  run(NS, P2, W2, 50, input({ right: true })); const x2 = P2.x; run(NS, P2, W2, 120, input());
  assert.ok(P2.x - x2 > wet, 'un charco sigue siendo más resbaloso que la lluvia');
  const G = game(0, { startTramo: 2 });   // Pasillos bajo la lluvia
  assert.equal(G.run.contract.mod, 'lluvia');
  assert.ok(G.world.platforms.filter((p) => p.scene === 2).every((p) => p.wet));
  assert.ok(!G.world.platforms.some((p) => p.scene === 1 && p.wet));
});

test('contratos: la meta final exige la misión del último tramo', () => {
  const G = game(1, { startTramo: 12, assist: { relaxed: true } });   // Plaza de las Jacarandas
  const c = G.run.contract;
  assert.equal(c.main.type, 'jefe');
  G.world.foes.length = 0;
  const goal = G.world.goal;
  place(G, goal.x1 - 120, G.world.street.y1 - 60);
  steps(G, 200, input({ right: true }));
  assert.equal(G.state, 'playing', 'sin vencer al guardián no se termina');
  assert.ok(G.drainEvents().some((e) => e.type === 'message' && /ANTES DE TERMINAR/.test(e.text)));
  CT.update(c, { type: 'kill', boss: true });
  place(G, goal.x1 - 120, G.world.street.y1 - 60);
  steps(G, 200, input({ right: true }));
  assert.ok(G.state === 'victory' || G.state === 'won');
  steps(G, 160);
  const v = G.drainEvents().find((e) => e.type === 'victory');
  assert.ok(v && v.summary.contracts.main >= 1);
});

test('contratos: la ruta grabada que baja sin pelear ya no basta en Guadalajara', () => {
  const routes = require('./fixtures/campaign-routes.json');
  const route = routes.guadalajara, G = game(1, { assist: { relaxed: true } });
  const buttons = {};
  for (const name of ['jump', 'kick', 'cats', 'dash', 'down', 'holdJump', 'holdDown']) {
    buttons[name] = new Set();
    for (const ev of route[name] || []) { if (Array.isArray(ev)) for (let i = 0; i < ev[1]; i++) buttons[name].add(ev[0] + i); else buttons[name].add(ev); }
  }
  let frame = 0;
  outer: for (const { direction, frames } of route.directions) {
    for (let i = 0; i < frames; i++, frame++) {
      G.step(1 / 60, input({ left: direction === 'left', right: direction === 'right', jumpPressed: buttons.jump.has(frame), jumpHeld: buttons.jump.has(frame) || buttons.holdJump.has(frame),
        kickPressed: buttons.kick.has(frame), catsPressed: buttons.cats.has(frame), dashPressed: buttons.dash.has(frame), downPressed: buttons.down.has(frame), downHeld: buttons.holdDown.has(frame) }));
      if (G.state === 'gameover') break outer;
    }
  }
  assert.equal(G.state, 'gameover', 'el contrato del primer tramo detiene la bajada directa');
  assert.ok(G.drainEvents().find((e) => e.type === 'gameover').contract);
});
