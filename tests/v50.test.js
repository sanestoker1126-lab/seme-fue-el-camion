// Pruebas V50: mecánicas nuevas (tejas flojas, bandas eléctricas, sombrillas), jefes sin congelarse ni
// "encadenarse", patada aérea, asistencias, datos de los 16 niveles y fondos/plataformas visibles.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, miniWorld, input, run } = require('./helpers');
const NS = load();
const EN = NS.Enemies, LV = NS.LEVELS, C = NS.CONFIG;

const player = (x, footY, ground) => { const P = NS.Physics.createPlayer(x, footY); P.ground = ground || null; return P; };
function arena() { const W = miniWorld({ platforms: [{ x1: -600, x2: 600, y: 0 }] }); W.shots = []; return W; }
function ctxFor(P, log) {
  return {
    active: () => true, onScreen: () => true, busy: false, jumpHeld: false,
    hurtbox: () => NS.util.bodyRect(P, 0.72, 0.86, P.h * 0.07),
    hurt: (sx, sy, kind) => { if (P.invuln > 0) return false; P.invuln = 1.2; log.push(kind); return true; }
  };
}

test('teja floja: tiembla al pisarla, se cae a los 0,5 s, Sofía cae y la teja reaparece', () => {
  const W = miniWorld({ platforms: [{ x1: -50, x2: 50, y: 0, kind: 'crumble', drop: true, crState: 'solid', crT: 0 }, { x1: -300, x2: 300, y: 200 }] });
  const cr = W.platforms[0], P = player(0, 0, cr);
  const ev = run(NS, P, W, 1, input());
  assert.ok(ev.some((e) => e.type === 'crumble'), 'emite el aviso al pisarla');
  assert.equal(cr.crState, 'shake');
  run(NS, P, W, Math.ceil(C.crumble.shake * 60) + 2, input());
  assert.equal(cr.gone, true, 'se cayó');
  run(NS, P, W, 60, input());
  assert.equal(P.ground && P.ground.y, 200, 'Sofía aterriza en el techo de abajo');
  run(NS, P, W, Math.ceil(C.crumble.respawn * 60), input());
  assert.equal(cr.gone, false, 'la teja reaparece');
  assert.equal(cr.crState, 'solid');
});

test('teja floja: aun recién caída se puede saltar (coyote time) hacia la siguiente azotea', () => {
  const W = miniWorld({ platforms: [{ x1: -50, x2: 50, y: 0, kind: 'crumble', drop: true, crState: 'solid', crT: 0 }, { x1: 120, x2: 400, y: -20 }] });
  const cr = W.platforms[0], P = player(20, 0, cr);
  let n = 0;
  while (!cr.gone && n++ < 120) run(NS, P, W, 1, input());
  assert.equal(cr.gone, true);
  run(NS, P, W, 2, input());                       // ya está cayendo…
  assert.equal(P.ground, null);
  run(NS, P, W, 1, input({ jumpPressed: true, jumpHeld: true, right: true }));
  assert.ok(P.vy < -500, 'el salto entra por coyote time: vy=' + P.vy.toFixed(0));
  run(NS, P, W, 45, input({ right: true, jumpHeld: true }));
  run(NS, P, W, 40, input());
  assert.ok(P.ground && P.ground.x1 === 120, 'llega a la siguiente azotea');
});

test('banda eléctrica: transporta a quien está quieto y frena a quien corre en contra', () => {
  const mk = () => miniWorld({ platforms: [{ x1: -900, x2: 900, y: 0, kind: 'belt', drop: true, belt: 100 }] });
  let W = mk(), P = player(0, 0, W.platforms[0]);
  run(NS, P, W, 60, input());
  assert.ok(Math.abs(P.x - 100) < 3, 'avanza ~100 u en 1 s sin tocar nada: ' + P.x.toFixed(1));
  W = mk(); P = player(0, 0, W.platforms[0]);
  run(NS, P, W, 60, input({ left: true }));
  const against = -P.x;
  W = miniWorld({ platforms: [{ x1: -900, x2: 900, y: 0 }] }); P = player(0, 0, W.platforms[0]);
  run(NS, P, W, 60, input({ left: true }));
  assert.ok(against < -P.x - 60, `en contra avanza menos (${against.toFixed(0)} < ${(-P.x).toFixed(0)})`);
});

test('sombrilla del mapa: rebota como el toldo', () => {
  const W = miniWorld({ platforms: [{ x1: -40, x2: 40, y: 0, kind: 'bounce', umbrella: true }] });
  const P = player(0, -120);
  const ev = run(NS, P, W, 60, input());
  assert.ok(ev.some((e) => e.type === 'bounce'));
});

test('patada en el aire: ya no frena el salto en seco; en el piso sí frena', () => {
  const W = miniWorld({ platforms: [{ x1: -900, x2: 900, y: 0 }] });
  let P = player(0, -150); P.vx = 300;
  run(NS, P, W, 1, input({ right: true, kickPressed: true }));
  assert.ok(P.vx > 230, 'aire: conserva el impulso ' + P.vx.toFixed(0));
  P = player(0, 0, W.platforms[0]); P.vx = 300;
  run(NS, P, W, 1, input({ right: true, kickPressed: true }));
  assert.ok(P.vx < 200, 'piso: frena ' + P.vx.toFixed(0));
});

test('jefes: chile, murciélago y paloma se recuperan del golpe (antes quedaban congelados)', () => {
  for (const [kind, o, back] of [['chile', { x: 60, y: 0 }, 'idle'], ['bat', { x: 40, y: -60 }, 'return'], ['pigeon', { x: 0, y: -100, lane: { x1: -80, x2: 80 } }, 'fly']]) {
    const W = arena(), P = player(-300, 0, W.platforms[0]);
    const f = EN.create(kind, Object.assign({ plat: W.platforms[0], rng: () => 0.75, isBoss: true, hp: 5 }, o)); W.foes.push(f);
    assert.equal(EN.hit(f, 'kick', [], P.x), true);
    assert.equal(f.state, 'dizzy', kind);
    const ctx = ctxFor(P, []);
    for (let i = 0; i < 70; i++) EN.update(W, P, 1 / 60, ctx, []);
    assert.notEqual(f.state, 'dizzy', kind + ' sale del mareo');
    assert.ok(['idle', 'aim', 'return', 'sleep', 'fly', 'telegraph', back].includes(f.state), kind + ' → ' + f.state);
  }
});

test('jefe que embiste: tras un golpe retrocede y contraataca; no se le puede encadenar', () => {
  const W = arena(), P = player(0, 0, W.platforms[0]);
  const boss = EN.create('dog', { x: 70, y: 0, plat: W.platforms[0], isBoss: true, hp: 4, rng: () => 0.75 }); W.foes.push(boss);
  assert.equal(EN.hit(boss, 'kick', [], P.x), true);
  assert.equal(boss.state, 'recoil');
  assert.equal(EN.hit(boss, 'kick', [], P.x), false, 'invulnerable justo después del golpe');
  const x0 = boss.x, ev = [], ctx = ctxFor(P, []);
  for (let i = 0; i < 30; i++) EN.update(W, P, 1 / 60, ctx, ev);
  assert.ok(boss.x > x0 + 15, 'retrocede alejándose de Sofía');
  assert.equal(boss.state, 'windup', 'avisa el contraataque');
  assert.ok(ev.some((e) => e.type === 'foeAlert'));
  assert.equal(boss.hp, 3);
  // Mientras avisa/embiste bloquea la patada DE FRENTE: hay que esquivar y castigar.
  boss.hitCD = 0; boss.dir = -1; P.x = boss.x - 40; P.face = 1; P.kickT = 0.2;
  const ev2 = [];
  EN.update(W, P, 1 / 60, ctx, ev2);
  assert.ok(ev2.some((e) => e.type === 'bossBlock'), 'bloquea de frente');
  assert.equal(boss.hp, 3, 'sin daño durante el aviso');
  boss.blockCD = 0; boss.state = 'windup'; boss.stateT = 0; boss.dir = 1; P.kickT = 0.2; P.invuln = 2; // ahora le da la espalda
  EN.update(W, P, 1 / 60, ctx, []);
  assert.equal(boss.hp, 2, 'por la espalda sí recibe la patada');
  boss.hitCD = 0; boss.state = 'dizzy'; boss.stateT = 0; boss.dir = -1; P.kickT = 0.2;
  EN.update(W, P, 1 / 60, ctx, []);
  assert.equal(boss.hp, 1, 'mareado recibe la patada aunque lo veas de frente');
});

test('premio por jefe: +1 corazón (o escudo) y cuenta en el resumen; modo relajado no quita vidas', () => {
  const G = NS.Game.createGame({});
  G.setView(390, 844); G.newRun({ difficulty: 'normal' });
  G.run.lives = 2;
  const boss = G.world.foes.find((f) => f.isBoss && f.scene === 0);
  G.P.x = boss.x - 40; G.P.y = boss.y - G.P.h / 2; G.P.ground = boss.plat; G.updateCamera(0, true);
  boss.hp = 1; boss.hitCD = 0; G.P.face = 1; G.P.kickT = 0.2;
  for (let i = 0; i < 3 && !boss.dead; i++) G.step(1 / 60, input());
  assert.equal(boss.dead, true);
  assert.equal(G.run.lives, 3);
  assert.equal(G.run.bosses, 1);
  const G2 = NS.Game.createGame({ assist: { relaxed: true } });
  G2.setView(390, 844); G2.newRun({});
  G2.hurt(G2.P.x + 10, G2.P.y, 'rat');
  assert.equal(G2.run.lives, G2.run.maxLives, 'relajado: el golpe no resta vidas');
  assert.ok(G2.P.invuln > 0, 'pero sí da retroceso e invulnerabilidad');
});

test('niveles: textos, inicio/salida y espejos coherentes para los 16 tramos', () => {
  const S = LV.LEVEL_SEQUENCE;
  assert.ok(NS.STORY.CHAPTERS.length >= S.length); // V53: hay capítulos extra para las misiones nuevas
  assert.ok(NS.STORY.SIGNS.story.length >= S.length);
  assert.ok(S[S.length - 1].final);
  for (const d of S) {
    const m = d.map;
    assert.equal(m.surfaces.filter((q) => q.start).length, 1, d.id + ' un inicio');
    const ex = m.surfaces.filter((q) => q.exit);
    assert.equal(ex.length, 1, d.id + ' una salida');
    assert.ok(m.exitX > ex[0].x1 && m.exitX < ex[0].x2, d.id + ' exitX dentro de la salida');
    for (const q of [...m.surfaces, ...(m.stairs || []), ...(m.crumbles || []), ...(m.belts || []), ...(m.bouncers || [])]) {
      assert.ok(q.x1 >= 0 && q.x2 <= m.width && q.x1 < q.x2 && q.y > 0 && q.y < m.height, d.id + ' geometría dentro del mapa');
    }
    assert.ok(d.file || d.bg, d.id + ' tiene fondo (archivo o procedural)');
  }
  const M = LV.SCHOOL_M, O = LV.SCHOOL_MAP;
  assert.equal(M.surfaces.length, O.surfaces.length);
  O.surfaces.forEach((q, i) => { assert.equal(M.surfaces[i].x1, O.width - q.x2); assert.equal(M.surfaces[i].y, q.y); });
  assert.equal(M.exitX, O.width - O.exitX);
});

test('plataformas visibles: solo se ocultan las que el fondo trae pintadas; jefes voladores sobre la salida', () => {
  const W = NS.World.buildWorld({});
  for (const sc of W.scenes) {
    const surf = W.platforms.filter((p) => p.scene === sc.index && p.painted && p.kind === 'floor');
    if (sc.artPainted) assert.ok(surf.every((p) => p.hidden), sc.id + ': cornisas pintadas en el fondo');
    else assert.ok(surf.every((p) => !p.hidden && p.draw), sc.id + ': cornisas dibujadas por el juego');
  }
  assert.ok(W.scenes.filter((s) => s.artPainted).map((s) => s.id).join() === 'escuela,portales');
  for (const f of W.foes.filter((q) => q.isBoss)) {
    const arena = f.arena;
    assert.ok(arena && arena.w >= 200, f.id + ': arena amplia (' + (arena && arena.w.toFixed(0)) + ' u)');
    if (f.kind === 'bat' || f.kind === 'pigeon') {
      assert.ok(arena.y - f.y >= 80, f.id + ' vuela sobre la arena dejando pasar a Sofía por debajo');
      const lid = W.platforms.find((p) => p.region === 'main' && p.y < arena.y - 20 && p.y > f.y - 4 && p.x1 < f.x + 20 && p.x2 > f.x - 20);
      assert.ok(!lid, f.id + ' no queda encima de otra plataforma');
    }
  }
  const kinds = new Set(W.platforms.map((p) => p.kind));
  for (const k of ['crumble', 'belt', 'bounce']) assert.ok(kinds.has(k), 'el mundo incluye ' + k);
});
