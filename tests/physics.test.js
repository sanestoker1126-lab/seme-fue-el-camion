// Pruebas de física: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, miniWorld, input, run } = require('./helpers');
const NS = load();
const PH = NS.CONFIG.phys;

const floor = (o = {}) => Object.assign({ x1: -400, x2: 400, y: 0 }, o);
const spawn = (x = 0, footY = 0, ground = null) => { const P = NS.Physics.createPlayer(x, footY); P.ground = ground; return P; };

test('gravedad: Nina cae y aterriza exactamente sobre la plataforma', () => {
  const W = miniWorld({ platforms: [floor({ y: 300 })] });
  const P = spawn(0, 0);
  const ev = run(NS, P, W, 120, input());
  assert.equal(P.ground, W.platforms[0]);
  assert.equal(P.y + P.h / 2, 300);
  assert.equal(P.vy, 0);
  const land = ev.find((e) => e.type === 'land');
  assert.ok(land && Math.abs(land.fall - 300) < 0.01, 'el aterrizaje informa la altura de caída');
});

test('velocidad terminal acotada y sin atravesar plataformas delgadas', () => {
  const W = miniWorld({ platforms: [floor({ y: 3000, h: 6 })] });
  const P = spawn(0, 0);
  let maxVy = 0;
  run(NS, P, W, 400, input(), 1 / 60, () => { maxVy = Math.max(maxVy, P.vy); });
  assert.ok(maxVy <= PH.fallMax + 1e-9);
  assert.equal(P.ground, W.platforms[0], 'aterriza tras caer 3000 u a velocidad terminal');
});

test('salto completo ≈ 135 u y salto corto mucho menor (salto variable)', () => {
  const measure = (holdSteps) => {
    const W = miniWorld({ platforms: [floor()] });
    const P = spawn(0, 0, W.platforms[0]);
    let minFoot = 0;
    run(NS, P, W, 90, (i) => input({ jumpPressed: i === 0, jumpHeld: i < holdSteps }), 1 / 60, () => { minFoot = Math.min(minFoot, P.y + P.h / 2); });
    return -minFoot;
  };
  const full = measure(90), tap = measure(2);
  assert.ok(full > 125 && full < 150, 'salto completo = ' + full.toFixed(1));
  assert.ok(tap > 30 && tap < 75, 'salto corto = ' + tap.toFixed(1));
});

test('coyote time: se puede saltar poco después de salir del borde', () => {
  const W = miniWorld({ platforms: [floor({ x1: -400, x2: 0 })] });
  const P = spawn(-20, 0, W.platforms[0]);
  P.vx = PH.move;
  let jumped = false, stepsAir = 0;
  run(NS, P, W, 40, (i) => {
    if (!P.ground) stepsAir++;
    return input({ right: true, jumpPressed: stepsAir === 4 && !jumped, jumpHeld: true });
  }, 1 / 60, (i, ev) => { if (ev.some((e) => e.type === 'jump')) jumped = true; });
  assert.ok(jumped, 'salto aceptado 4 pasos (~67 ms) después de salir del borde');
});

test('buffer de salto: pulsar justo antes de aterrizar salta al tocar suelo', () => {
  const W = miniWorld({ platforms: [floor({ y: 200 })] });
  const P = spawn(0, 0);
  let jumpStep = -1, landStep = -1;
  run(NS, P, W, 120, (i) => {
    const foot = P.y + P.h / 2;
    return input({ jumpPressed: foot > 165 && foot < 200 && jumpStep < 0 && landStep < 0, jumpHeld: true });
  }, 1 / 60, (i, ev) => {
    if (ev.some((e) => e.type === 'land') && landStep < 0) landStep = i;
    if (ev.some((e) => e.type === 'jump') && jumpStep < 0) jumpStep = i;
  });
  assert.ok(landStep >= 0 && jumpStep >= landStep && jumpStep - landStep <= 2, `land=${landStep} jump=${jumpStep}`);
});

test('paso fijo: el resultado no depende de la tasa de refresco', () => {
  // La simulación siempre avanza con dt fijo; simulamos 2 s con 120 pasos (equivale a 60, 90, 120 o 144 Hz de pantalla).
  const sim = () => {
    const W = miniWorld({ platforms: [floor({ y: 400 })] });
    const P = spawn(0, 0);
    run(NS, P, W, 120, (i) => input({ right: i < 60, jumpPressed: i === 70, jumpHeld: true }));
    return [P.x, P.y, P.vx, P.vy];
  };
  assert.deepEqual(sim(), sim());
});

test('muros sólidos: ni caminando ni con dash se atraviesan', () => {
  const W = miniWorld({ platforms: [floor()], solids: [{ x1: 100, y1: -300, x2: 114, y2: 0 }] });
  const P = spawn(0, 0, W.platforms[0]);
  run(NS, P, W, 120, (i) => input({ right: true, dashPressed: i % 40 === 0 }));
  assert.ok(P.x + P.w / 2 <= 100 + 1e-6, 'x=' + P.x);
});

test('techo sólido: el salto se corta sin atravesarlo', () => {
  const W = miniWorld({ platforms: [floor()], solids: [{ x1: -100, y1: -110, x2: 100, y2: -94 }] });
  const P = spawn(0, 0, W.platforms[0]);
  const ev = run(NS, P, W, 60, (i) => input({ jumpPressed: i === 0, jumpHeld: true }));
  assert.ok(ev.some((e) => e.type === 'bonk'));
  let minTop = Infinity;
  const W2 = miniWorld({ platforms: [floor()], solids: [{ x1: -100, y1: -110, x2: 100, y2: -94 }] });
  const P2 = spawn(0, 0, W2.platforms[0]);
  run(NS, P2, W2, 60, (i) => input({ jumpPressed: i === 0, jumpHeld: true }), 1 / 60, () => { minTop = Math.min(minTop, P2.y - P2.h / 2); });
  assert.ok(minTop >= -94 - 1e-6, 'cabeza=' + minTop);
});

test('plataformas de un sentido: se atraviesan desde abajo y se aterriza encima', () => {
  const W = miniWorld({ platforms: [floor(), { x1: -60, x2: 60, y: -100, h: 9, kind: 'thin', drop: true }] });
  const P = spawn(0, 0, W.platforms[0]);
  run(NS, P, W, 90, (i) => input({ jumpPressed: i === 0, jumpHeld: true }));
  assert.equal(P.ground, W.platforms[1]);
});

test('BAJAR atraviesa peldaños y tarimas, pero no la piedra', () => {
  const W = miniWorld({ platforms: [floor({ y: 300 }), { x1: -60, x2: 60, y: 100, kind: 'thin', drop: true }, { x1: -60, x2: 60, y: 0, kind: 'floor', drop: false }] });
  const P = spawn(0, 0, W.platforms[2]);
  let ev = run(NS, P, W, 30, (i) => input({ downPressed: i === 2 }));
  assert.ok(ev.some((e) => e.type === 'dropDenied'));
  assert.equal(P.ground, W.platforms[2], 'sigue sobre la piedra');
  P.x = 0; P.y = 100 - P.h / 2; P.ground = W.platforms[1]; P.vy = 0; P.airTopFoot = 100;
  ev = run(NS, P, W, 90, (i) => input({ downPressed: i === 2 }));
  assert.ok(ev.some((e) => e.type === 'drop'));
  assert.equal(P.ground, W.platforms[0], 'cayó hasta el suelo inferior');
});

test('tarimas móviles: Nina viaja con la tarima sin resbalar ni caer', () => {
  const W = miniWorld({ platforms: [{ x1: -40, x2: 40, y: 0, kind: 'moving', drop: true, baseX1: -40, baseX2: 40, baseY: 0, range: 30, vrange: 6, speed: 1.15, phase: 0 }] });
  const P = spawn(0, 0, W.platforms[0]);
  let off = [];
  run(NS, P, W, 300, input(), 1 / 60, () => { off.push(P.x - (W.platforms[0].x1 + 40)); });
  assert.equal(P.ground, W.platforms[0]);
  const drift = Math.max(...off) - Math.min(...off);
  assert.ok(drift < 0.5, 'deriva relativa=' + drift);
});

test('asistencia de escalón: se baja una escalera caminando', () => {
  const stairs = [];
  for (let k = 0; k < 10; k++) stairs.push({ x1: k * 16, x2: k * 16 + 22, y: k * 12, kind: 'stair', drop: true, h: 7 });
  const W = miniWorld({ platforms: [{ x1: -200, x2: 0, y: 0 }, ...stairs, { x1: 160, x2: 900, y: 120 }] });
  const P = spawn(-30, 0, W.platforms[0]);
  let airSteps = 0;
  run(NS, P, W, 70, input({ right: true }), 1 / 60, () => { if (!P.ground) airSteps++; });
  assert.equal(P.ground, W.platforms[W.platforms.length - 1]);
  assert.ok(airSteps < 12, 'casi todo el descenso con apoyo, pasos en el aire=' + airSteps);
});

test('toldo rebotador: lanza hacia arriba y anula la caída', () => {
  const W = miniWorld({ platforms: [{ x1: -60, x2: 60, y: 400, kind: 'bounce' }, floor({ y: 900 })] });
  const P = spawn(0, 0);
  let bounced = false;
  const ev = run(NS, P, W, 75, input(), 1 / 60, (i, e) => { if (e.some((x) => x.type === 'bounce')) bounced = true; });
  const b = ev.find((e) => e.type === 'bounce');
  assert.ok(b, 'rebota');
  assert.ok(bounced && P.y + P.h / 2 < 400, 'sube por encima del toldo tras el rebote');
  assert.ok(!ev.some((e) => e.type === 'land'), 'no cuenta como aterrizaje (sin daño por caída)');
});

test('charco: reduce la fricción (patina más lejos)', () => {
  const slide = (withPuddle) => {
    const pl = { x1: -500, x2: 900, y: 0 };
    const W = miniWorld({ platforms: [pl] });
    if (withPuddle) W.hazards.push({ type: 'puddle', x1: -500, x2: 900, y: 0, plat: W.platforms[0] });
    const P = spawn(0, 0, W.platforms[0]);
    P.vx = PH.move;
    run(NS, P, W, 60, input());
    return P.x;
  };
  assert.ok(slide(true) > slide(false) + 60);
});

test('dash: un dash aéreo por salto, recarga al aterrizar', () => {
  const W = miniWorld({ platforms: [floor()] });
  const P = spawn(0, 0, W.platforms[0]);
  // Se anula el enfriamiento a mitad del salto para comprobar solo el límite de dashes aéreos.
  const ev = run(NS, P, W, 120, (i) => {
    if (i === 30) { assert.equal(P.ground, null, 'sigue en el aire'); P.dashCD = 0; }
    return input({ jumpPressed: i === 0, jumpHeld: true, dashPressed: i === 10 || i === 31 });
  });
  const dashes = ev.filter((e) => e.type === 'dash');
  assert.equal(dashes.length, 1, 'el segundo dash en el mismo salto se rechaza');
  assert.equal(P.airDashes, PH.airDashes);
});

test('cajas rompibles: el dash las rompe; caminando bloquean', () => {
  const crate = { x1: 60, y1: -34, x2: 94, y2: 0, kind: 'crate', breakable: true };
  const W = miniWorld({ platforms: [floor()], solids: [crate] });
  const P = spawn(0, 0, W.platforms[0]);
  run(NS, P, W, 60, input({ right: true }));
  assert.ok(P.x + P.w / 2 <= 60 + 1e-6, 'caminando la caja bloquea');
  const ev = run(NS, P, W, 20, (i) => input({ right: true, dashPressed: i === 0 }));
  assert.ok(ev.some((e) => e.type === 'crate'));
  assert.ok(W.solids[0].broken);
});

test('estados de animación: un único estado por paso con prioridad', () => {
  const P = NS.Physics.createPlayer(0, 0);
  P.ground = { kind: 'floor' }; P.vx = 0;
  assert.equal(NS.Physics.updateState(P, 1 / 60), 'idle');
  P.vx = 100; assert.equal(NS.Physics.updateState(P, 1 / 60), 'run');
  P.dashT = 0.1; assert.equal(NS.Physics.updateState(P, 1 / 60), 'dash');
  P.hurtT = 0.2; assert.equal(NS.Physics.updateState(P, 1 / 60), 'hurt');
  P.dead = true; assert.equal(NS.Physics.updateState(P, 1 / 60), 'dead');
});
