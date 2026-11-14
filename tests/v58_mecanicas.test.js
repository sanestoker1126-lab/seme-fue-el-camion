// V58 · Mecánicas nuevas con la física real: tirolesas, mar abierto (flotación neutra y desagües) y gravedad
// propia del mundo. Cada prueba simula pasos de 1/60 s igual que el juego.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, miniWorld, input, run } = require('./helpers');
const NS = load();
const PHY = NS.Physics, C = NS.CONFIG;

/* Mundo de prueba: salida a la izquierda, llegada abajo a la derecha y un cable entre ambas. */
function zipWorld(extra = {}) {
  const W = miniWorld({
    platforms: [{ x1: 0, x2: 260, y: 300, id: 'salida' }, { x1: 640, x2: 900, y: 520, id: 'llegada' }],
    solids: extra.solids || []
  });
  W.zips = [PHY.makeZip(200, 205, 700, 430, { id: 'cable' })];
  W.waters = [];
  return W;
}
const stand = (W, x) => { const pl = W.platforms[0], P = PHY.createPlayer(x, pl.y); P.ground = pl; return P; };

test('tirolesa: saltar bajo el cable cuelga a Sofía, baja sola y aterriza sin acumular caída', () => {
  const W = zipWorld(), P = stand(W, 232);
  const ev = run(NS, P, W, 240, (i) => input({ jumpPressed: i === 0, jumpHeld: i < 20 }));
  const grab = ev.find((e) => e.type === 'zipGrab'), end = ev.find((e) => e.type === 'zipEnd');
  assert.ok(grab, 'se colgó del cable');
  assert.ok(end && end.step > grab.step, 'llegó al final del cable');
  assert.equal(P.zip, null);
  assert.equal(P.ground && P.ground.id, 'llegada', 'aterriza en la plataforma de llegada');
  // Bajó 220 u (de y=300 a y=520): sin tirolesa sería una caída larga; colgada no cuenta.
  const lands = ev.filter((e) => e.type === 'land');
  assert.ok(lands.length >= 1);
  assert.ok(lands.every((e) => e.fall < 60), 'caída medida al aterrizar: ' + lands.map((e) => e.fall.toFixed(0)));
});

test('tirolesa: mientras cuelga sigue el cable y siempre avanza hacia el ancla baja', () => {
  const W = zipWorld(), P = stand(W, 232), z = W.zips[0];
  let hung = 0, lastS = -1, maxErr = 0;
  run(NS, P, W, 200, (i) => input({ jumpPressed: i === 0, jumpHeld: i < 20 }), 1 / 60, () => {
    if (!P.zip) return;
    hung++;
    assert.ok(P.zipS > lastS, 'avanza'); lastS = P.zipS;
    assert.ok(P.zipV >= C.zip.min - 1e-9 && P.zipV <= C.zip.max + 1e-9);
    maxErr = Math.max(maxErr, Math.abs((P.y - P.h / 2 - C.zip.hang) - PHY.zipY(z, P.x)));
    assert.equal(P.ground, null);
  });
  assert.ok(hung > 30, 'pasos colgada: ' + hung);
  assert.ok(maxErr < 0.01, 'la mano va sobre el cable (error ' + maxErr + ')');
});

test('tirolesa: SALTAR la suelta hacia arriba conservando el impulso y no se vuelve a colgar al instante', () => {
  const W = zipWorld(), P = stand(W, 232);
  let step = 0, jumpedAt = -1, vxAtJump = 0, regrab = false;
  run(NS, P, W, 120, (i) => {
    const jump = i === 0 || (P.zip && P.zipT > 0.35 && jumpedAt < 0);
    if (jump && i > 0) { jumpedAt = i; vxAtJump = P.vx; }
    return input({ jumpPressed: jump, jumpHeld: true });
  }, 1 / 60, (i, ev) => {
    step = i;
    if (jumpedAt >= 0 && i > jumpedAt && i <= jumpedAt + 20 && ev.some((e) => e.type === 'zipGrab')) regrab = true;
    if (i === jumpedAt) {
      assert.ok(ev.some((e) => e.type === 'zipJump'));
      assert.equal(P.zip, null);
      assert.ok(P.vy < -400, 'sale hacia arriba: ' + P.vy);
      assert.ok(P.vx > vxAtJump * 0.9 && P.vx > 150, 'conserva el impulso: ' + P.vx);
    }
  });
  assert.ok(jumpedAt > 0, 'hubo salto desde el cable');
  assert.equal(regrab, false, 'enfriamiento de re-enganche');
});

test('tirolesa: BAJAR la deja caer y un sólido en el camino la detiene', () => {
  let W = zipWorld(), P = stand(W, 232), dropped = -1;
  run(NS, P, W, 90, (i) => { const d = P.zip && P.zipT > 0.3 && dropped < 0; if (d) dropped = i; return input({ jumpPressed: i === 0, jumpHeld: i < 20, downPressed: d }); },
    1 / 60, (i, ev) => { if (i === dropped) { assert.ok(ev.some((e) => e.type === 'zipDrop')); assert.equal(P.zip, null); assert.ok(P.vy > 0); } });
  assert.ok(dropped > 0);
  // Un muro a mitad del cable: no lo atraviesa.
  W = zipWorld({ solids: [{ x1: 430, x2: 470, y1: 150, y2: 520 }] }); P = stand(W, 232);
  const ev = run(NS, P, W, 200, (i) => input({ jumpPressed: i === 0, jumpHeld: i < 20 }));
  assert.ok(ev.some((e) => e.type === 'zipEnd' && e.blocked), 'el muro corta la tirolesa');
  assert.ok(P.x + P.w / 2 <= 430.01, 'no atravesó el muro: x=' + P.x);
});

test('tirolesa: con los pies en el suelo no engancha; al salir por la orilla bajo el poste se cuelga sola', () => {
  const W = zipWorld(), P = stand(W, 205);
  // El cable pasa a la altura de la mano sobre el borde (x 200–260), pero pisando la plataforma no se cuelga.
  let ev = run(NS, P, W, 6, () => input({ right: true }));
  assert.ok(P.ground && P.ground.id === 'salida' && P.x > 205 && P.x < 258, 'sigue en la plataforma: x=' + P.x.toFixed(1));
  assert.ok(!ev.some((e) => e.type === 'zipGrab'), 'en el suelo no se cuelga');
  // Sigue caminando: al dejar la orilla queda en el aire a la altura del cable y se cuelga sin saltar.
  ev = run(NS, P, W, 30, () => input({ right: true }));
  assert.ok(ev.some((e) => e.type === 'zipGrab'), 'al salir por la orilla se cuelga');
});

test('makeZip ordena las anclas (la alta primero) y rechaza cables verticales', () => {
  const a = PHY.makeZip(700, 430, 200, 205), b = PHY.makeZip(200, 205, 700, 430);
  assert.deepEqual([a.ax, a.ay, a.bx, a.by], [b.ax, b.ay, b.bx, b.by], 'el ancla alta siempre es (ax, ay)');
  assert.ok(a.sin > 0 && Math.abs(Math.hypot(a.ux, a.uy) - 1) < 1e-9);
  assert.throws(() => PHY.makeZip(100, 0, 110, 300), /vertical/);
});

/* ---------- Mar abierto ---------- */
function seaWorld(sea, drains) {
  const W = miniWorld({});
  const z = { id: 'mar', x1: 0, x2: 800, y: 100, y2: 1300, deep: true, sea, drains: drains || [], banks: [] };
  W.waters = [z]; W.zips = [];
  return { W, z };
}
function swimmer(z, x, y) { const P = PHY.createPlayer(x, y + C.player.h / 2); P.y = y; return P; }

test('mar abierto: a profundidad la flotación es neutra; en una poza normal el mismo punto sube a la superficie', () => {
  const sea = seaWorld(true), Ps = swimmer(sea.z, 400, 800);
  run(NS, Ps, sea.W, 180, () => input({}));
  assert.ok(Ps.water === sea.z);
  assert.ok(Math.abs(Ps.y - 800) < 12, 'se queda a su profundidad (y=' + Ps.y.toFixed(1) + ')');
  assert.ok(Math.abs(Ps.vy) < 5);
  const pool = seaWorld(false), Pp = swimmer(pool.z, 400, 250);
  run(NS, Pp, pool.W, 180, () => input({}));
  assert.ok(Pp.y < 130, 'la poza la devuelve a la superficie (y=' + Pp.y.toFixed(1) + ')');
});

test('mar abierto: se nada en las cuatro direcciones y cerca de la superficie flota', () => {
  const { W, z } = seaWorld(true), P = swimmer(z, 400, 700);
  run(NS, P, W, 60, () => input({ downHeld: true }));
  assert.ok(P.y > 800, 'bucea');
  const y1 = P.y;
  run(NS, P, W, 60, () => input({ upHeld: true }));
  assert.ok(P.y < y1 - 100, 'sube');
  const x1 = P.x;
  run(NS, P, W, 60, () => input({ right: true }));
  assert.ok(P.x > x1 + 120, 'avanza');
  // Subiendo hasta arriba queda flotando en la superficie (resorte solo en la franja superior).
  run(NS, P, W, 420, () => input({ upHeld: true }));
  run(NS, P, W, 120, () => input({}));
  const floatY = PHY.floatYOf(z, P);
  assert.ok(Math.abs(P.y - floatY) < 6, 'flota: y=' + P.y.toFixed(1) + ' superficie ' + floatY.toFixed(1));
});

test('desagüe: bucear por el hueco del fondo saca a Sofía por abajo; fuera del hueco el fondo es firme', () => {
  const { W, z } = seaWorld(true, [{ x1: 360, x2: 440 }]);
  W.platforms.push({ id: 'cueva', kind: 'floor', drop: false, x1: 200, x2: 600, y: 1500, prevY: 1500, w: 400, h: 12, dx: 0, dy: 0 });
  let P = swimmer(z, 400, 1200);
  const ev = run(NS, P, W, 240, () => input({ downHeld: true }));
  assert.ok(ev.some((e) => e.type === 'waterExit'), 'salió del agua');
  assert.equal(P.water, null);
  assert.equal(P.ground && P.ground.id, 'cueva', 'cae a la cueva de abajo');
  const land = ev.find((e) => e.type === 'land');
  assert.ok(land.fall <= 1500 - 1300 + 1, 'la caída se mide desde el fondo del agua, no desde la superficie: ' + land.fall);
  P = swimmer(z, 150, 1200);
  run(NS, P, W, 240, () => input({ downHeld: true }));
  assert.ok(P.water === z, 'sigue en el agua');
  assert.ok(P.y + P.h / 2 <= 1300 + 0.01, 'el fondo la detiene');
});

test('gravedad del mundo: con menos gravedad el mismo salto llega más alto', () => {
  const apex = (mul) => {
    const W = miniWorld({ platforms: [{ x1: 0, x2: 400, y: 500 }] });
    W.zips = []; W.waters = []; if (mul) W.gravityMul = mul;
    const P = PHY.createPlayer(200, 500); P.ground = W.platforms[0];
    let top = 500;
    run(NS, P, W, 120, (i) => input({ jumpPressed: i === 0, jumpHeld: true }), 1 / 60, () => { top = Math.min(top, P.y + P.h / 2); });
    return 500 - top;
  };
  const normal = apex(0), orbit = apex(0.72);
  assert.ok(normal > 120 && normal < 150, 'salto normal ≈ 135 u: ' + normal.toFixed(1));
  assert.ok(orbit > normal * 1.25, 'en órbita sube más: ' + orbit.toFixed(1));
});
