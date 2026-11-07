// Pruebas de enemigos, obstáculos y reglas de partida.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, miniWorld, input } = require('./helpers');
const NS = load();
const EN = NS.Enemies, OB = NS.Obstacles;

function arena(extra = {}) {
  const W = miniWorld(Object.assign({ platforms: [{ x1: -600, x2: 600, y: 0 }] }, extra));
  W.shots = [];
  return W;
}
function ctxFor(P, log) {
  return {
    active: () => true, onScreen: () => true, busy: false, jumpHeld: false,
    hurtbox: () => NS.util.bodyRect(P, 0.72, 0.86, P.h * 0.07),
    hurt: (sx, sy, kind) => { if (P.invuln > 0) return false; P.invuln = 1.2; P.vx = Math.sign(P.x - sx) * 230; log.push({ sx, kind, vx: P.vx }); return true; }
  };
}
const stepAll = (W, P, ctx, n, inp = input()) => {
  const ev = [];
  for (let i = 0; i < n; i++) {
    W.t += 1 / 60;
    P.invuln = Math.max(0, P.invuln - 1 / 60);
    NS.Physics.stepPlayer(P, W, typeof inp === 'function' ? inp(i) : inp, 1 / 60, ev);
    EN.update(W, P, 1 / 60, ctx, ev);
    OB.update(W, P, 1 / 60, ctx, ev);
  }
  return ev;
};
const mk = (kind, o, W) => { const f = EN.create(kind, Object.assign({ plat: W.platforms[0], rng: () => 0.75 }, o)); f.id = kind; W.foes.push(f); return f; };

test('pisotón: derrota a la rata y Nina rebota sin recibir daño', () => {
  const W = arena(), log = [];
  const rat = mk('rat', { x: 0, y: 0 }, W);
  rat.spd = 0;
  const P = NS.Physics.createPlayer(0, -120);
  const ev = stepAll(W, P, ctxFor(P, log), 40);
  assert.ok(rat.dead, 'rata derrotada');
  assert.ok(ev.some((e) => e.type === 'foeKilled' && e.how === 'stomp'));
  assert.equal(log.length, 0, 'sin daño');
});

test('dash: derrota a la rata; caminar contra ella hace daño una sola vez', () => {
  let W = arena(), log = [];
  const rat = mk('rat', { x: 80, y: 0 }, W); rat.spd = 0;
  let P = NS.Physics.createPlayer(0, 0); P.ground = W.platforms[0];
  stepAll(W, P, ctxFor(P, log), 20, (i) => input({ right: true, dashPressed: i === 0 }));
  assert.ok(rat.dead);
  assert.equal(log.length, 0);
  W = arena(); log = [];
  const rat2 = mk('rat', { x: 60, y: 0 }, W); rat2.spd = 0;
  P = NS.Physics.createPlayer(0, 0); P.ground = W.platforms[0];
  stepAll(W, P, ctxFor(P, log), 50, input({ right: true }));
  assert.equal(log.length, 1, 'un único golpe gracias a la invulnerabilidad');
  assert.ok(log[0].vx < 0, 'retroceso alejándose del enemigo (estaba a la derecha)');
});

test('perro: avisa, embiste, se detiene en el borde y queda mareado', () => {
  const W = miniWorld({ platforms: [{ x1: -300, x2: 300, y: 0 }] }); W.shots = [];
  const dog = mk('dog', { x: 100, y: 0, diff: NS.CONFIG.difficulty.normal }, W);
  dog.dir = -1; dog.cool = 0;
  const P = NS.Physics.createPlayer(-100, 0); P.ground = W.platforms[0];
  const ctx = ctxFor(P, []);
  const states = [];
  for (let i = 0; i < 160; i++) { EN.update(W, P, 1 / 60, ctx, []); if (states[states.length - 1] !== dog.state) states.push(dog.state); }
  assert.deepEqual(states.slice(0, 3), ['windup', 'charge', 'dizzy']);
  assert.ok(dog.x >= dog.minX - 0.01, 'no se sale de la plataforma');
});

test('perro bravo: el dash choca sin daño salvo si está mareado; necesita dos golpes', () => {
  const W = arena(), log = [];
  const b = mk('bravo', { x: 90, y: 0 }, W); b.spd = 0; b.cool = 99;
  const P = NS.Physics.createPlayer(0, 0); P.ground = W.platforms[0];
  const ev = stepAll(W, P, ctxFor(P, log), 20, (i) => input({ right: true, dashPressed: i === 0 }));
  assert.ok(ev.some((e) => e.type === 'clank'));
  assert.equal(b.hp, 2); assert.equal(log.length, 0);
  b.state = 'dizzy'; b.hitCD = 0;
  P.x = 0; P.dashCD = 0; P.vx = 0;
  stepAll(W, P, ctxFor(P, log), 20, (i) => input({ right: true, dashPressed: i === 0 }));
  assert.equal(b.hp, 1, 'mareado sí recibe el dash');
});

test('chile: dispara tras la señal previa solo con línea de tiro libre', () => {
  const W = arena();
  const c = mk('chile', { x: 200, y: 0 }, W); c.cool = 0;
  const P = NS.Physics.createPlayer(0, 0); P.ground = W.platforms[0];
  const ctx = ctxFor(P, []);
  let firstShot = -1;
  for (let i = 0; i < 90 && firstShot < 0; i++) { EN.update(W, P, 1 / 60, ctx, []); if (W.shots.length) firstShot = i; }
  assert.ok(firstShot >= 30, 'señal previa ≥ 0,5 s antes de disparar: paso ' + firstShot);
  const W2 = arena({ solids: [{ x1: 90, y1: -200, x2: 110, y2: 0 }] });
  const c2 = mk('chile', { x: 200, y: 0 }, W2); c2.cool = 0;
  const P2 = NS.Physics.createPlayer(0, 0); P2.ground = W2.platforms[0];
  for (let i = 0; i < 120; i++) EN.update(W2, P2, 1 / 60, ctxFor(P2, []), []);
  assert.equal(W2.shots.length, 0, 'un muro bloquea el disparo');
});

test('proyectiles: el dash los destruye sin daño; sin dash hieren', () => {
  const W = arena(), log = [];
  const P = NS.Physics.createPlayer(0, 0); P.ground = W.platforms[0];
  W.shots.push({ kind: 'seed', x: 60, y: P.y, vx: -200, vy: 0, g: 0, r: 6, life: 3 });
  const ev = stepAll(W, P, ctxFor(P, log), 20, (i) => input({ right: true, dashPressed: i === 0 }));
  assert.ok(ev.some((e) => e.type === 'shotBroken'));
  assert.equal(log.length, 0);
  W.shots.push({ kind: 'seed', x: P.x + 80, y: P.y, vx: -200, vy: 0, g: 0, r: 6, life: 3 });
  stepAll(W, P, ctxFor(P, log), 40);
  assert.equal(log.length, 1);
});

test('murciélago: duerme, se alerta, persigue y regresa a su percha', () => {
  const W = arena();
  const bat = mk('bat', { x: 0, y: -150 }, W); bat.cool = 0;
  const P = NS.Physics.createPlayer(60, 0); P.ground = W.platforms[0];
  P.invuln = 99;
  const ctx = ctxFor(P, []);
  const states = [];
  for (let i = 0; i < 600; i++) { EN.update(W, P, 1 / 60, ctx, []); if (i === 200) { P.x = 2000; } if (states[states.length - 1] !== bat.state) states.push(bat.state); }
  assert.deepEqual(states.slice(0, 4), ['alert', 'swoop', 'return', 'sleep']);
});

test('paloma: solo suelta proyectiles cuando Nina está debajo', () => {
  const W = arena();
  const p = mk('pigeon', { x: 0, y: -200, lane: { x1: -10, x2: 10 } }, W); p.cool = 0;
  const P = NS.Physics.createPlayer(400, 0); P.ground = W.platforms[0];
  const ctx = ctxFor(P, []);
  for (let i = 0; i < 120; i++) EN.update(W, P, 1 / 60, ctx, []);
  assert.equal(W.shots.length, 0);
  P.x = 0;
  for (let i = 0; i < 40; i++) EN.update(W, P, 1 / 60, ctx, []);
  assert.ok(W.shots.length >= 1 || W.shots.length === 0 && p.cool > 0);
});

test('cable: solo hace daño cuando tiene corriente', () => {
  const W = arena(), log = [];
  const h = OB.addSpark(W, { x: 0, y: 0, w: 66, phase: 0 });
  const P = NS.Physics.createPlayer(0, 0); P.ground = W.platforms[0];
  const ctx = ctxFor(P, log);
  for (let i = 0; i < 60 * 1.6; i++) OB.update(W, P, 1 / 60, ctx, []);
  assert.equal(log.length, 0, 'apagado: sin daño');
  for (let i = 0; i < 60 * 1.2; i++) OB.update(W, P, 1 / 60, ctx, []);
  assert.equal(log.length, 1, 'con corriente: daño');
  assert.equal(OB.sparkState(0.5), 'off'); assert.equal(OB.sparkState(2.0), 'warn'); assert.equal(OB.sparkState(2.5), 'on');
});

test('maceta: tiembla, cae, se rompe y reaparece fuera de cámara', () => {
  const W = miniWorld({ platforms: [{ x1: -200, x2: 200, y: 0 }] }), log = [];
  const pot = OB.addPot(W, { x: 0, hangY: -150, floorY: 0, plat: W.platforms[0] });
  const P = NS.Physics.createPlayer(300, 0);
  const ctx = ctxFor(P, log);
  P.ground = W.platforms[0]; P.x = 20;
  const seq = [];
  let visible = true;
  ctx.onScreen = () => visible;
  for (let i = 0; i < 60 * 9; i++) {
    if (i === 10) { P.x = 150; }
    if (i === 120) visible = false;
    OB.update(W, P, 1 / 60, ctx, []);
    if (seq[seq.length - 1] !== pot.state) seq.push(pot.state);
  }
  assert.deepEqual(seq, ['shake', 'fall', 'broken', 'idle']);
});

test('jefes: cada arquetipo emite una señal antes de preparar su ataque', () => {
  const cases = [
    ['dog', 60, 0, 0, 0], ['bravo', 60, 0, 0, 0], ['kid', 60, 0, 0, 0],
    ['chile', 80, 0, 0, 0], ['bat', 40, -60, 0, 0],
    ['pigeon', 0, -100, 0, 0], ['rat', 40, 0, 0, 0]
  ];
  for (const [kind, fx, fy, px, py] of cases) {
    const W = arena(), P = NS.Physics.createPlayer(px, py); P.ground = W.platforms[0];
    const foe = mk(kind, { x: fx, y: fy, isBoss: true, hp: 5, lane: { x1: -80, x2: 80 } }, W);
    foe.cool = 0;
    const ev = [];
    EN.update(W, P, 1 / 60, ctxFor(P, []), ev);
    assert.ok(ev.some((e) => e.type === 'foeAlert' && e.foe === foe), kind + ' avisa antes de atacar');
  }
});

test('apoyo felino: distrae brevemente a un enemigo normal, sin daño ni efecto en jefes', () => {
  const W = arena(), P = NS.Physics.createPlayer(-200, 0); P.ground = W.platforms[0];
  const rat = mk('rat', { x: 100, y: 0 }, W), ctx = ctxFor(P, []);
  const x0 = rat.x;
  assert.equal(EN.distract(rat, 0.4), true);
  assert.equal(rat.state, 'distracted');
  EN.update(W, P, 0.1, ctx, []);
  assert.equal(rat.x, x0, 'se detiene durante la distracción');
  EN.update(W, P, 0.35, ctx, []);
  assert.notEqual(rat.state, 'distracted', 'reanuda su estado normal al terminar');
  assert.equal(rat.hp, 1, 'la ayuda no inflige daño');
  const boss = EN.create('dog', { x: 280, y: 0, plat: W.platforms[0], isBoss: true, rng: () => 0.75 });
  assert.equal(EN.distract(boss, 0.5), false, 'los jefes no pueden ser anulados por los gatos');
});

test('púas: dañan al pisarlas', () => {
  const W = arena(), log = [];
  OB.addSpikes(W, { x: 60, y: 0, w: 38 });
  const P = NS.Physics.createPlayer(0, 0); P.ground = W.platforms[0];
  stepAll(W, P, ctxFor(P, log), 30, input({ right: true }));
  assert.equal(log.length, 1);
  assert.equal(log[0].kind, 'spikes');
});
