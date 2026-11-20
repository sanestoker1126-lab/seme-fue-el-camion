// V58.3 · Peligros propios de cada mundo: corrientes marinas fuertes en el mar y lluvia de asteroides en la Luna.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load } = require('./helpers');
const NS = load();
const OB = NS.Obstacles;
const ROOT = path.join(__dirname, '..');
const NONE = { left: false, right: false, jumpPressed: false, jumpHeld: false, dashPressed: false, downPressed: false, upHeld: false, downHeld: false };
const inp = (o) => Object.assign({}, NONE, o || {});

function game(mission, difficulty = 'normal') {
  const G = NS.Game.createGame({});
  G.setView(844, 390);
  G.newRun({ mission, startTramo: 0, difficulty });
  G.drainEvents();
  return G;
}
const of = (G, type) => G.world.hazards.filter((h) => h.type === type);
/** Pone la corriente en la fase pedida (al inicio de esa fase). */
function phase(h, state) {
  const C = OB.CURRENT;
  h.t = state === 'calm' ? 0.01 : state === 'warn' ? C.calm + 0.01 : C.calm + C.warn + 0.01;
  h.state = OB.currentState(h.t);
  h.k = state === 'strong' ? 1 : 0;
}

test('el mar tiene corrientes en el agua abierta (más en DIFÍCIL); la Luna, asteroides; los demás mundos, ninguno', () => {
  const counts = {};
  for (const d of ['facil', 'normal', 'dificil']) counts[d] = of(game(2, d), 'current').length;
  assert.deepEqual(counts, { facil: 4, normal: 6, dificil: 8 });
  const G = game(2), sea = G.world.waters.find((z) => z.sea && z.deep);
  for (const h of of(G, 'current')) {
    assert.ok(h.y1 >= sea.y + 300, 'deja libre la superficie');
    assert.ok(h.y2 <= sea.y2 - 450, 'deja libre el fondo de la escotilla');
    assert.ok(h.x1 >= sea.x1 && h.x2 <= sea.x2);
  }
  assert.ok(new Set(of(G, 'current').map((h) => h.dir)).size === 2, 'unas arrastran a la derecha y otras a la izquierda');
  assert.equal(of(G, 'asteroid').length, 0, 'en el mar no caen asteroides');

  const L = game(3), ast = of(L, 'asteroid');
  assert.equal(ast.length, 9);
  for (const h of ast) {
    assert.ok(L.world.platforms.includes(h.plat) && h.plat.kind === 'floor', 'sobre una plataforma real');
    assert.ok(h.y > L.world.spawn.y + 200, 'lejos del inicio');
  }
  assert.equal(of(L, 'current').length, 0);
  for (const m of [0, 1]) assert.equal(of(game(m), 'current').length + of(game(m), 'asteroid').length, 0, 'misión ' + (m + 1) + ' sin cambios');
});

test('corriente fuerte: arrastra a Sofía más rápido de lo que nada; en calma no la mueve; se sale nadando abajo', () => {
  const G = game(2), P = G.P, h = of(G, 'current')[2];
  const put = () => { P.x = (h.x1 + h.x2) / 2; P.y = (h.y1 + h.y2) / 2; P.vx = 0; P.vy = 0; P.invuln = 99; P.ground = null; };
  for (const c of of(G, 'current')) if (c !== h) phase(c, 'calm');

  phase(h, 'calm'); put();
  for (let i = 0; i < 30; i++) G.step(1 / 60, inp());
  const calmDx = Math.abs(P.x - (h.x1 + h.x2) / 2);
  assert.ok(P.water, 'está en el mar');
  assert.ok(calmDx < 8, 'en calma no la mueve: ' + calmDx.toFixed(1));

  phase(h, 'strong'); put();
  const x0 = P.x;
  for (let i = 0; i < 60; i++) G.step(1 / 60, inp());
  const drift = (P.x - x0) * h.dir;
  assert.ok(drift > 150, 'sin nadar, en 1 s la corriente se la lleva > 150 u: ' + drift.toFixed(0));

  phase(h, 'strong'); put();
  const x1 = P.x, against = h.dir > 0 ? { left: true } : { right: true };
  for (let i = 0; i < 60; i++) G.step(1 / 60, inp(against));
  assert.ok((P.x - x1) * h.dir > 0, 'aunque nade en contra, la corriente fuerte gana');

  phase(h, 'strong'); put();
  for (let i = 0; i < 90 && P.y <= h.y2 + 20; i++) G.step(1 / 60, inp({ downHeld: true, down: true }));
  assert.ok(P.y > h.y2, 'nadando hacia abajo sale de la franja');
  G.step(1 / 60, inp());
  assert.equal(P.flowX, 0, 'fuera de la corriente ya no la arrastra');
});

test('la corriente avisa antes de soplar (fase de aviso) y suena al empezar cerca de Sofía', () => {
  const C = OB.CURRENT;
  assert.ok(C.warn >= 0.8 && C.calm >= 2, 'aviso y calma suficientes para reaccionar');
  assert.equal(OB.currentState(0.1), 'calm');
  assert.equal(OB.currentState(C.calm + 0.1), 'warn');
  assert.equal(OB.currentState(C.calm + C.warn + 0.1), 'strong');
  const G = game(2), P = G.P, h = of(G, 'current')[1];
  P.x = (h.x1 + h.x2) / 2; P.y = (h.y1 + h.y2) / 2; P.invuln = 99;
  h.t = C.calm + C.warn - 0.05;
  const evs = [];
  for (let i = 0; i < 10; i++) { G.step(1 / 60, inp()); evs.push(...G.drainEvents()); }
  assert.ok(evs.some((e) => e.type === 'sfx' && e.name === 'current'), 'suena la corriente');
  assert.ok(evs.some((e) => e.type === 'message' && /CORRIENTE FUERTE/.test(e.text)), 'explica cómo salir');
});

test('asteroide: mira de aviso de 1 s; si Sofía se queda en la mira la golpea, si se aparta no', () => {
  const A = OB.ASTEROID;
  for (const stay of [true, false]) {
    const G = game(3), P = G.P, h = of(G, 'asteroid')[3];
    for (const o of of(G, 'asteroid')) if (o !== h) { o.state = 'idle'; o.t = 0; o.wait = 999; }
    P.x = (h.x1 + h.x2) / 2; P.y = h.y - P.h / 2 - 1; P.vx = 0; P.vy = 0; P.ground = h.plat; P.invuln = 0;
    P.airTopFoot = P.y + P.h / 2;   // la teletransportación no cuenta como caída
    for (const f of G.world.foes) if (Math.abs(f.y - P.y) < 700) f.dead = true;   // solo el asteroide puede golpearla
    h.t = h.wait;
    const lives = G.run.lives, evs = [];
    G.step(1 / 60, inp()); evs.push(...G.drainEvents());
    assert.equal(h.state, 'warn', 'con Sofía cerca empieza el aviso');
    assert.ok(Math.abs(h.tx - P.x) < 1, 'apunta a donde está Sofía');
    assert.ok(evs.some((e) => e.type === 'message' && /ASTEROIDE/.test(e.text)));
    const n = Math.ceil((A.warn + A.fall + 0.2) * 60);
    const away = h.tx - h.plat.x1 > h.plat.x2 - h.tx ? { left: true } : { right: true };
    for (let i = 0; i < n; i++) { G.step(1 / 60, inp(stay ? {} : away)); evs.push(...G.drainEvents()); }
    assert.ok(evs.some((e) => e.type === 'sfx' && e.name === 'meteorImpact'), 'cae y estalla');
    if (stay) assert.equal(G.run.lives, lives - 1, 'quedarse en la mira cuesta una vida');
    else assert.equal(G.run.lives, lives, 'apartarse durante el aviso la salva');
  }
});

test('el render dibuja corrientes y asteroides, y el audio tiene sus sonidos', () => {
  const r = fs.readFileSync(path.join(ROOT, 'js/app/render.js'), 'utf8');
  assert.match(r, /if \(h\.type === 'current'\) \{ drawCurrent\(h, V, T\); continue; \}/);
  assert.match(r, /if \(h\.type === 'asteroid'\) \{ drawAsteroid\(h, V, T\); continue; \}/);
  const a = fs.readFileSync(path.join(ROOT, 'js/app/audio.js'), 'utf8');
  for (const k of ['current:', 'meteorWarn:', 'meteorImpact:']) assert.ok(a.includes(k), 'sonido ' + k);
});
