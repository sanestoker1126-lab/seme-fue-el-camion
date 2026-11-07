// Pruebas de reglas de partida: vidas, escudo, caída, derrota, reintento, puertas, llaves, objetos y victoria.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, input } = require('./helpers');
const NS = load();

function game(o = {}) {
  let saved = null;
  const G = NS.Game.createGame({ onSave: (s) => { saved = JSON.parse(JSON.stringify(s)); }, save: o.save });
  G.setView(390, 844);
  G.newRun({ difficulty: o.difficulty || 'normal', startTramo: o.startTramo || 0 });
  G.getSaved = () => saved;
  return G;
}
const steps = (G, n, inp = input()) => { for (let i = 0; i < n; i++) G.step(1 / 60, typeof inp === 'function' ? inp(i) : inp); };
const place = (G, x, footY) => { const P = G.P; P.x = x; P.y = footY - P.h / 2; P.vx = 0; P.vy = 0; P.ground = null; P.airTopFoot = footY; };
const clearFoes = (G) => { G.world.foes.length = 0; G.world.hazards = G.world.hazards.filter((h) => h.type === 'puddle'); };

test('inicio: Nina aparece en la parada del tramo 1, apoyada y con 3 vidas en Normal', () => {
  const G = game();
  assert.equal(G.state, 'playing');
  assert.equal(G.run.lives, 3);
  assert.equal(G.P.ground, G.world.checkpoints[0].plat);
  steps(G, 30);
  assert.equal(G.P.ground, G.world.checkpoints[0].plat, 'sigue apoyada');
  assert.ok(G.drainEvents().some((e) => e.type === 'chapter' && e.index === 0));
});

test('gatitas: detectan al enemigo cercano y lo distraen sin quitarle vida', () => {
  const G = game(), P = G.P;
  G.world.foes.length = 0;
  const foe = NS.Enemies.create('rat', { x: P.x + 60, y: P.y + P.h / 2, plat: P.ground, scene: G.tramo, region: G.region, rng: () => 0.75 });
  G.world.foes.push(foe);
  G.companions.senseCD = 5; G.companions.assistCD = 0; G.companions.warningT = 0;
  G.step(1 / 60, input());
  const events = G.drainEvents();
  assert.equal(foe.state, 'distracted');
  assert.equal(foe.hp, 1);
  assert.ok(events.some((e) => e.type === 'companionAssist' && e.foe === foe));
  assert.ok(G.companions.assistCD > 9, 'el apoyo tiene tiempo de reutilización');
  assert.equal(G.companions.agents[G.companions.warningCat].mode, 'assist', 'la gata elegida hace el gesto de apoyo');
});

test('gatitas: exploran y alternan conductas propias mientras Sofía espera', () => {
  const G = game(); clearFoes(G); G.world.hazards.length = 0;
  const seen = new Set();
  for (let i = 0; i < 960; i++) {
    G.step(1 / 60, input());
    seen.add(G.companions.agents.luna.mode); seen.add(G.companions.agents.morita.mode);
  }
  assert.ok(seen.has('explore'), 'al menos una gata se desplaza a curiosear');
  assert.ok(['look', 'sniff', 'groom', 'shoulder'].some((mode) => seen.has(mode)), 'aparecen posturas idle autónomas');
  for (const a of Object.values(G.companions.agents)) {
    assert.ok(Math.abs(a.x - G.P.x) < 140, 'la exploración conserva proximidad con Sofía');
    assert.ok(Math.abs(a.y - (G.P.y + G.P.h / 2)) < 80, 'la gata se mantiene cerca de la altura de la ruta');
  }
});

test('gatitas: siguen el movimiento sin saltos y se congelan al pausar', () => {
  const G = game(); clearFoes(G); G.world.hazards.length = 0;
  const startX = G.P.x, last = { luna: G.companions.agents.luna.x, morita: G.companions.agents.morita.x };
  let maxFrameMove = 0;
  for (let i = 0; i < 36; i++) {
    G.step(1 / 60, input({ right: true }));
    for (const name of ['luna', 'morita']) {
      const a = G.companions.agents[name];
      maxFrameMove = Math.max(maxFrameMove, Math.abs(a.x - last[name])); last[name] = a.x;
    }
  }
  assert.ok(G.P.x > startX + 15, 'Sofía avanzó durante la prueba');
  assert.ok(maxFrameMove < 10, 'el seguimiento no da saltos visibles');
  for (const a of Object.values(G.companions.agents)) assert.ok(Math.abs(a.x - G.P.x) < 150, 'ambas permanecen cerca de la jugadora');
  G.pause();
  const paused = Object.fromEntries(Object.entries(G.companions.agents).map(([name, a]) => [name, [a.x, a.y, a.modeT, a.phase]]));
  steps(G, 30, input({ right: true }));
  for (const [name, a] of Object.entries(G.companions.agents)) assert.deepEqual([a.x, a.y, a.modeT, a.phase], paused[name]);
});

test('daño: resta una vida, aplica retroceso desde la fuente e invulnerabilidad', () => {
  const G = game();
  const x0 = G.P.x;
  assert.ok(G.hurt(x0 + 40, G.P.y, 'rat'));
  assert.equal(G.run.lives, 2);
  assert.ok(G.P.vx < 0, 'retroceso hacia la izquierda (la fuente estaba a la derecha)');
  assert.ok(!G.hurt(x0 - 40, G.P.y, 'rat'), 'invulnerable');
  assert.equal(G.run.lives, 2);
});

test('escudo: absorbe un golpe sin perder vidas', () => {
  const G = game();
  G.P.shield = true;
  G.hurt(G.P.x + 10, G.P.y, 'dog');
  assert.equal(G.run.lives, 3);
  assert.equal(G.P.shield, false);
});

test('caída dañina: depende de la dificultad (Fácil perdona más que Difícil)', () => {
  for (const [d, h, hurts] of [['facil', 700, false], ['normal', 700, true], ['dificil', 600, true], ['normal', 600, false]]) {
    const G = game({ difficulty: d });
    clearFoes(G);
    G.world.platforms.length = 0; // columna libre: solo quedan la calle y los muros
    G.world.solids = G.world.solids.filter((so) => so.kind === 'street' || so.kind === 'wall');
    const street = G.world.street;
    place(G, -700, street.y1 - h);
    const lives = G.run.lives;
    steps(G, 150);
    assert.equal(G.P.ground, street, `${d}/${h}: aterriza en la calle`);
    assert.equal(G.run.lives < lives, hurts, `${d}: caída de ${h}`);
  }
});

test('derrota: sin vidas → animación → game over; reintento desde la última parada', () => {
  const G = game();
  const cp2 = G.world.checkpoints[2];
  G.run.items.push(0, 1);
  G.checkpoint = cp2;
  for (let i = 0; i < 3; i++) { G.P.invuln = 0; G.hurt(G.P.x + 5, G.P.y, 'rat'); }
  assert.equal(G.state, 'dying');
  steps(G, 80);
  assert.equal(G.state, 'gameover');
  const go = G.drainEvents().find((e) => e.type === 'gameover');
  assert.equal(go.checkpointScene, 2);
  G.retry();
  assert.equal(G.state, 'playing');
  assert.equal(G.tramo, 2);
  assert.deepEqual(G.run.items.sort(), [0, 1], 'conserva los objetos de tramos ya superados');
  assert.equal(G.run.deaths, 1);
  assert.equal(G.P.ground.id, cp2.plat.id, 'reaparece en la parada del tramo 3');
});

test('pausa: congela la simulación y el cronómetro', () => {
  const G = game();
  steps(G, 10);
  const t = G.run.t, y = G.P.y;
  G.pause();
  steps(G, 120, input({ right: true }));
  assert.equal(G.run.t, t); assert.equal(G.P.y, y);
  G.resume();
  steps(G, 10);
  assert.ok(G.run.t > t);
});

test('puertas: la trampilla lleva a la zona inferior y la salida devuelve más abajo', () => {
  const G = game();
  clearFoes(G);
  const room = G.world.rooms[0], door = room.entry;
  place(G, door.x, door.y); G.P.ground = door.plat;
  steps(G, 1, input({ downPressed: true }));
  assert.equal(G.state, 'transition');
  steps(G, 40);
  assert.equal(G.state, 'playing');
  assert.equal(G.room, room, 'dentro del sótano');
  const ex = room.exit;
  place(G, ex.x, ex.y);
  steps(G, 5);
  steps(G, 1, input({ downPressed: true }));
  steps(G, 40);
  assert.equal(G.room, null, 'de vuelta al mundo');
  assert.ok(G.P.y > door.y, 'la salida está más abajo que la entrada');
});

test('llave y reja: la reja bloquea sin llave y se abre con ella', () => {
  const G = game();
  clearFoes(G);
  const gate = G.world.gates[0];
  const side = gate.x1 < 0 ? 1 : -1; // Nina se acerca desde el lado del panel
  const footY = gate.y2;
  const startX = side > 0 ? gate.x2 + 40 : gate.x1 - 40;
  place(G, startX, footY);
  steps(G, 60, input({ left: side > 0, right: side < 0 }));
  assert.ok(!gate.open, 'cerrada sin llave');
  assert.ok(side > 0 ? G.P.x - G.P.w / 2 >= gate.x2 - 0.01 : G.P.x + G.P.w / 2 <= gate.x1 + 0.01, 'no la atraviesa');
  const key = G.world.pickups.find((p) => p.type === 'key' && p.keyFor === gate.id);
  G.run.keys.add(key.keyFor);
  steps(G, 60, input({ left: side > 0, right: side < 0 }));
  assert.ok(gate.open, 'abierta con la llave');
  assert.ok(G.drainEvents().some((e) => e.type === 'gateOpen'));
});

test('objetos perdidos: se recogen, cuentan para el final y se guardan', () => {
  const G = game();
  clearFoes(G);
  const it = G.world.pickups.find((p) => p.type === 'item' && p.itemIndex === 0);
  place(G, it.x, it.y + 31);
  steps(G, 3);
  assert.ok(it.got);
  assert.deepEqual(G.run.items, [0]);
  assert.ok(G.getSaved().items.credencial);
  assert.ok(G.drainEvents().some((e) => e.type === 'item' && e.first));
});

test('parada: activarla guarda el progreso y desbloquea el tramo', () => {
  const G = game();
  clearFoes(G);
  const cp = G.world.checkpoints[1];
  place(G, cp.x, cp.y); G.P.ground = cp.plat;
  steps(G, 3);
  assert.equal(G.checkpoint, cp);
  assert.equal(G.getSaved().unlocked, 2);
});

test('victoria: llegar a la puerta del camión termina la partida con estrellas y final', () => {
  const G = game({ startTramo: 7 });
  clearFoes(G);
  const goal = G.world.goal;
  place(G, goal.x1 - 120, G.world.street.y1 - 60);
  G.run.items.push(0, 1, 2);
  steps(G, 200, input({ right: true }));
  assert.ok(G.state === 'victory' || G.state === 'won');
  steps(G, 160);
  assert.equal(G.state, 'won');
  const v = G.drainEvents().find((e) => e.type === 'victory');
  assert.equal(v.stars, 2);
  assert.ok(v.ending.title.length > 0);
  assert.equal(v.fullRun, false, 'empezar en el tramo 8 no registra récord de tiempo completo');
});

test('cámara: Nina siempre dentro del encuadre durante una caída larga', () => {
  const G = game();
  clearFoes(G);
  place(G, -700, 200);
  for (let i = 0; i < 400; i++) {
    G.step(1 / 60, input());
    const P = G.P, c = G.cam, v = G.view;
    assert.ok(P.y - P.h / 2 >= c.y - 1 && P.y + P.h / 2 <= c.y + v.h + 1, 'paso ' + i);
  }
});
