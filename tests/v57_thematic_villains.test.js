'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load, miniWorld } = require('./helpers');
const NS = load(), EN = NS.Enemies, LV = NS.LEVELS;
const DT = 1 / 60;

function context() {
  return {
    active: () => true, onScreen: () => true, busy: false, jumpHeld: false,
    hurtbox: () => ({ x1: 99999, x2: 100000, y1: 99999, y2: 100000 }),
    hurt: () => false
  };
}
function world() {
  const W = miniWorld();
  W.shots = []; W.foes = []; W.waters = [];
  return W;
}
function player(x,y) {
  const P = NS.Physics.createPlayer(x, y + NS.CONFIG.player.h / 2);
  P.y = y; return P;
}

test('V57: dos misiones especiales usan enemigos propios, sin palomas submarinas', () => {
  const sub = NS.World.buildWorld({ levels: [LV.SUBMARINO_LEVEL] });
  const space = NS.World.buildWorld({ levels: [LV.ESPACIAL_LEVEL] });
  const shark = sub.foes.find(f => f.kind === 'shark' && f.isBoss);
  assert.ok(shark, 'tiburón guardián submarino');
  assert.ok(shark.waterZone && shark.waterZone.deep, 'jefe dentro de agua profunda');
  assert.ok(shark.y > shark.waterZone.y && shark.y < shark.waterZone.y2, 'jefe no flota fuera del agua');
  assert.ok(sub.foes.some(f => f.kind === 'piranha' && !f.isBoss), 'pirañas en el mundo submarino');
  assert.ok(sub.foes.every(f => f.kind !== 'pigeon' && f.kind !== 'bat'), 'no palomas ni murciélagos en mundo marino');
  const seen = new Map();
  for (const f of sub.foes.filter(f => f.kind === 'piranha')) {
    assert.ok(f.waterZone && f.waterZone.deep, 'piraña con estanque');
    assert.ok(f.x > f.waterZone.x1 && f.x < f.waterZone.x2);
    assert.ok(f.y > f.waterZone.y && f.y < f.waterZone.y2);
    seen.set(f.waterZone.id, (seen.get(f.waterZone.id) || 0) + 1);
  }
  assert.ok([...seen.values()].every(n => n <= 2), 'máximo dos pirañas por estanque');
  assert.ok(space.foes.some(f => f.kind === 'drone' && !f.isBoss), 'drones comunes en órbita');
  assert.ok(space.foes.some(f => f.kind === 'drone' && f.isBoss), 'dron centinela como jefe');
  assert.ok(space.foes.every(f => f.kind !== 'pigeon' && f.kind !== 'bat'), 'sin palomas/murciélagos en espacio');
});

test('V57: piraña permanece patrullando si Sofía no está en su estanque y avisa antes de cargar', () => {
  const W = world(), z = { id: 'agua-test', x1: 0, x2: 240, y: 0, y2: 160, deep: true };
  W.waters = [z];
  const f = EN.create('piranha', { x: 90, y: 80, waterZone: z, lane: { x1: 20, x2: 220 },
    rng: () => 0.75, diff: NS.CONFIG.difficulty.normal });
  f.cool = 0; W.foes.push(f);
  const P = player(155, 90), ctx = context(), events = [];
  for (let i = 0; i < 45; i++) EN.update(W, P, DT, ctx, events);
  assert.equal(f.state, 'fly', 'sin ataque desde tierra');
  assert.equal(events.filter(e => e.type === 'foeAlert').length, 0);
  P.water = z; P.submerged = true; f.cool = 0;
  let triggered = false;
  for (let i = 0; i < 120; i++) {
    EN.update(W, P, DT, ctx, events);
    if (events.some(e => e.type === 'foeAlert')) { triggered = true; break; }
  }
  assert.ok(triggered, 'ataca al entrar en agua');
  assert.equal(f.state, 'windup', 'aviso previo visible');
  const noticeAt = f.stateT;
  for (let i = 0; i < 15; i++) EN.update(W, P, DT, ctx, events);
  assert.equal(f.state, 'windup', 'sin embestida instantánea');
  for (let i = 0; i < 30; i++) EN.update(W, P, DT, ctx, events);
  assert.ok(events.some(e => e.type === 'foeCharge'), 'carga tras aviso');
  assert.ok(f.x >= z.x1 + f.w * .52 && f.x <= z.x2 - f.w * .52, 'no sale del estanque');
  assert.ok(noticeAt <= DT * 1.1);
});

test('V57: el pez solo hace daño durante la embestida anunciada, no por contacto pasivo', () => {
  const W = world(), z = { id: 'test-lago', x1: 0, x2: 240, y: 0, y2: 160, deep: true };
  W.waters = [z];
  const f = EN.create('piranha', { x: 100, y: 80, waterZone: z, lane: { x1: 20, x2: 220 },
    rng: () => 0.75, diff: NS.CONFIG.difficulty.normal });
  f.cool = 99; f.dir = 1;
  W.foes.push(f);
  const P = player(100, 80); P.vy = 0; P.dashT = 0; P.kickT = 0;
  let hurt = 0;
  const ctx = { ...context(),
    hurtbox: () => NS.util.bodyRect(P, 0.72, 0.86, P.h * 0.07),
    hurt: () => { hurt++; return true; } };
  EN.update(W, P, DT, ctx, []);
  assert.equal(hurt, 0, 'patrulla sin contacto ofensivo');
  f.state = 'windup'; f.stateT = 0;
  EN.update(W, P, DT, ctx, []);
  assert.equal(hurt, 0, 'aviso de ataque sin daño');
  f.state = 'charge'; f.stateT = 0;
  EN.update(W, P, DT, ctx, []);
  assert.equal(hurt, 1, 'contacto durante la carga sí hace daño');
});

test('V57: el dron espera antes de disparar, marca un objetivo fijo y su plasma es finito', () => {
  const W = world();
  const f = EN.create('drone', { x: 0, y: -70, lane: { x1: -45, x2: 45 },
    rng: () => 0.75, diff: NS.CONFIG.difficulty.normal });
  f.cool = 0; W.foes.push(f);
  const P = player(155, -30), ctx = context(), events = [];
  EN.update(W, P, DT, ctx, events);
  assert.equal(f.state, 'aim');
  assert.ok(events.some(e => e.type === 'foeAlert'));
  const targetX = f.targetX, targetY = f.targetY;
  P.x = 210; P.y = -60; // Sofía puede esquivar el punto marcado.
  for (let i = 0; i < 25; i++) EN.update(W, P, DT, ctx, events);
  assert.equal(W.shots.length, 0, 'no dispara durante el aviso');
  assert.equal(f.targetX, targetX, 'no reorienta el objetivo sin avisar');
  assert.equal(f.targetY, targetY);
  for (let i = 0; i < 30; i++) EN.update(W, P, DT, ctx, events);
  const s = W.shots.find(q => q.kind === 'plasma');
  assert.ok(s, 'proyectil plasma emitido');
  assert.ok([s.x, s.y, s.vx, s.vy, s.life].every(Number.isFinite), 'sin NaN');
  assert.equal(s.g, 0, 'plasma sin gravedad en estación orbital');
});

test('V57: la segunda fase del tiburón conserva aviso y desbloquea dash solo cuando está mareado', () => {
  const z = { id: 'agua-boss', x1: -200, x2: 200, y: 0, y2: 200 };
  const f = EN.create('shark', { x: 0, y: 100, waterZone: z, isBoss: true, hp: 6,
    lane: { x1: -150, x2: 150 }, rng: () => 0.75, diff: NS.CONFIG.difficulty.normal });
  const P = player(80, 100);
  f.dir = 1;
  f.state = 'windup';
  assert.equal(EN.bossArmored(f, P), true, 'frente protegido durante aviso');
  f.state = 'dizzy';
  assert.equal(EN.dashable(f), true, 'dash funciona tras mareo');
  const events = [];
  f.hitCD = 0; EN.hit(f, 'kick', events, 90);
  f.hitCD = 0; EN.hit(f, 'kick', events, 90);
  f.hitCD = 0; EN.hit(f, 'kick', events, 90);
  assert.equal(f.hp, 3);
  assert.equal(events.filter(e => e.type === 'bossPhase').length, 1, 'un solo cambio de fase al 50 %');
});

test('V57: la cadena de evento y arte es consistente sin cambiar la geometría', () => {
  const ROOT = path.join(__dirname, '..');
  const read = name => fs.readFileSync(path.join(ROOT, name), 'utf8');
  const game = read('js/core/game.js'), main = read('js/app/main.js'), render = read('js/app/render.js');
  assert.match(game, /case 'bossPhase':/);
  assert.match(game, /emit\('bossPhase', \{ foe: e\.foe \}\)/);
  assert.match(main, /case 'bossPhase':/);
  assert.match(render, /f\.kind === 'piranha' \|\| f\.kind === 'shark'/);
  assert.match(render, /f\.kind === 'drone'/);
  assert.match(render, /s\.kind === 'plasma'/);
  assert.match(read('sw.js'), /camion-v57-thematic-villains/);
  assert.equal(LV.SUBMARINO_MAP.width, 940);
  assert.equal(LV.SUBMARINO_MAP.height, 3072);
  assert.equal(LV.ESPACIAL_MAP.width, 940);
  assert.equal(LV.ESPACIAL_MAP.height, 3072);
});
