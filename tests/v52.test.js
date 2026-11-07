// Pruebas V52: nado (física del agua profunda y baja), integración en el juego, datos de los niveles con agua y
// el atlas de nado extraído por contorno de los atlas originales.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load, miniWorld, input, run } = require('./helpers');
const NS = load();
require(path.join(__dirname, '..', 'js', 'app', 'art_data.js'));
const ROOT = path.join(__dirname, '..');
const C = NS.CONFIG, PHY = NS.Physics;

// Poza de 300 u de ancho y 198 de fondo, con suelo a la altura del agua a ambos lados.
function pool({ shores = true } = {}) {
  const plats = [{ x1: -900, x2: 900, y: 420 }];
  if (shores) plats.push({ x1: -400, x2: -150, y: 0 }, { x1: 150, x2: 400, y: 0 });
  const W = miniWorld({ platforms: plats });
  W.waters = [{ id: 'poza', x1: -150, x2: 150, y: 2, y2: 200, deep: true, banks: [] }];
  return W;
}
const player = (x, foot) => PHY.createPlayer(x, foot);
const floatY = (W, P) => PHY.floatYOf(W.waters[0], P);

test('caer al agua profunda: sin aterrizaje (sin daño por caída), chapuzón y flotación en la superficie', () => {
  const W = pool(), P = player(0, -420);
  const ev = run(NS, P, W, 150, input());
  assert.ok(ev.some((e) => e.type === 'waterEnter'), 'evento de entrada al agua');
  assert.ok(!ev.some((e) => e.type === 'land'), 'el agua no cuenta como aterrizaje');
  assert.ok(P.water, 'Sofía está en el agua');
  assert.ok(Math.abs(P.y - floatY(W, P)) < 2, `flota en la superficie (Δ=${(P.y - floatY(W, P)).toFixed(1)})`);
  assert.equal(P.submerged, false);
  assert.equal(PHY.updateState(P, 1 / 60), 'swimFloat');
});

test('bucear con abajo sostenido, nadar bajo el agua y volver solita a la superficie', () => {
  const W = pool(), P = player(0, -10);
  run(NS, P, W, 120, input());
  run(NS, P, W, 40, input({ downHeld: true }));
  assert.ok(P.submerged && P.y > floatY(W, P) + 60, 'se sumerge');
  assert.ok(['swimDown', 'swimUnder'].includes(PHY.updateState(P, 1 / 60)));
  run(NS, P, W, 40, input({ downHeld: true }));
  assert.ok(P.y + P.h / 2 <= W.waters[0].y2 + 0.01, 'no atraviesa el fondo');
  run(NS, P, W, 200, input());
  assert.ok(!P.submerged && Math.abs(P.y - floatY(W, P)) < 3, 'la flotación la regresa a la superficie');
});

test('SALTAR: en la superficie sale del agua de un salto; sumergida es una brazada hacia arriba', () => {
  let W = pool(), P = player(0, -10);
  run(NS, P, W, 120, input());
  let minFoot = Infinity;
  const ev = run(NS, P, W, 1, input({ jumpPressed: true, jumpHeld: true }))
    .concat(run(NS, P, W, 60, input({ jumpHeld: true }), 1 / 60, () => { minFoot = Math.min(minFoot, P.y + P.h / 2); }));
  assert.ok(ev.some((e) => e.type === 'waterJump') && ev.some((e) => e.type === 'waterExit'));
  assert.ok(W.waters[0].y - minFoot >= 95, `sube ${(W.waters[0].y - minFoot).toFixed(0)} u sobre el agua (alcanza una orilla)`);
  W = pool(); P = player(0, -10);
  run(NS, P, W, 120, input()); run(NS, P, W, 40, input({ downHeld: true }));
  const ev2 = run(NS, P, W, 1, input({ jumpPressed: true }));
  assert.ok(ev2.some((e) => e.type === 'stroke'), 'brazada bajo el agua');
  assert.ok(P.vy <= -C.water.stroke + 1 && P.water, 'impulso hacia arriba sin salir del agua');
});

test('nadando contra una orilla a la altura del agua, Sofía sube sola', () => {
  const W = pool(), P = player(0, -10);
  run(NS, P, W, 120, input());
  const ev = run(NS, P, W, 70, input({ right: true }));
  assert.ok(ev.some((e) => e.type === 'waterExit' && e.climb), 'sube a la orilla');
  assert.ok(!P.water);
});

test('sumergida no se sale de lado de la poza; en la superficie sin orilla, tampoco queda atorada', () => {
  const W = pool({ shores: false }), P = player(0, -10);
  run(NS, P, W, 120, input());
  run(NS, P, W, 30, input({ downHeld: true }));
  run(NS, P, W, 120, input({ right: true, downHeld: true }));
  assert.ok(P.water && P.x <= W.waters[0].x2 - P.w / 2 + 0.01, 'la orilla es pared bajo el agua');
});

test('dash bajo el agua (impulso) y la patada no se usa en el agua', () => {
  const W = pool(), P = player(0, -10);
  run(NS, P, W, 120, input()); run(NS, P, W, 30, input({ downHeld: true }));
  const ev = run(NS, P, W, 1, input({ dashPressed: true, right: true }));
  assert.ok(ev.some((e) => e.type === 'swimDash'));
  assert.ok(P.vx > C.water.swimMove * 1.5);
  assert.equal(PHY.updateState(P, 1 / 60), 'swimDash');
  run(NS, P, W, 30, input());
  const ev2 = run(NS, P, W, 1, input({ kickPressed: true }));
  assert.ok(!ev2.some((e) => e.type === 'kick') && P.kickT === 0, 'sin patada en el agua');
});

test('agua baja: se camina más lento salpicando y el salto es un poco más corto', () => {
  const mk = (water) => { const W = miniWorld({ platforms: [{ x1: -900, x2: 900, y: 0 }] }); if (water) W.waters = [{ x1: -900, x2: 900, y: -16, y2: 0, deep: false }]; return W; };
  const W = mk(true), P = player(0, 0); P.ground = W.platforms[0];
  const ev = run(NS, P, W, 90, input({ right: true }));
  const D = mk(false), Q = player(0, 0); Q.ground = D.platforms[0];
  run(NS, Q, D, 90, input({ right: true }));
  assert.ok(P.wade, 'vadea');
  assert.ok(Math.abs(P.vx / Q.vx - C.water.wadeMul) < 0.05, `velocidad ×${(P.vx / Q.vx).toFixed(2)} (esperado ${C.water.wadeMul})`);
  assert.ok(ev.some((e) => e.type === 'wadeSplash'), 'salpica al correr');
  assert.equal(PHY.updateState(P, 1 / 60), 'wadeRun');
});

test('en el juego: chapuzón con efectos y aviso, invulnerable bajo el agua y se hunde al morir en el agua', () => {
  const G = NS.Game.createGame({}); G.setView(390, 844); G.newRun({ difficulty: 'normal', startTramo: 12 });
  const W = G.world, z = W.waters.find((w) => w.scene === 12 && w.deep), P = G.P;
  assert.ok(z, 'el Parque tiene un lago profundo');
  P.x = (z.x1 + z.x2) / 2; P.y = z.y - 45; P.vx = 0; P.vy = 400; P.ground = null; P.invuln = 0;   // bajo el puente de tablas
  const none = { left: false, right: false, jumpPressed: false, jumpHeld: false, dashPressed: false, downPressed: false };
  for (let i = 0; i < 60 && !P.water; i++) G.step(1 / 60, none);
  assert.ok(P.water, 'cayó al lago');
  assert.ok(G.waterFx.some((f) => f.kind.startsWith('splash')), 'salpicadura al entrar');
  for (let i = 0; i < 40; i++) G.step(1 / 60, none);
  const evs = G.drainEvents();
  assert.ok(evs.some((e) => e.type === 'sfx' && /splash/.test(e.name)), 'sonido de chapuzón');
  const lives = G.run.lives;
  for (let i = 0; i < 40; i++) G.step(1 / 60, Object.assign({}, none, { downHeld: true }));
  assert.ok(P.submerged);
  const hb = NS.util.bodyRect(P, C.player.hurtScaleX, C.player.hurtScaleY, 0);
  assert.ok(hb.y1 > z.y, 'la cabeza está bajo el agua');
  assert.equal(G.run.lives, lives, 'no perdió vidas al caer al agua');
  // Morir estando en el agua: se hunde (sin el brinco de derrota).
  G.run.lives = 1; P.invuln = 0;
  for (let i = 0; i < 200; i++) G.step(1 / 60, none);    // vuelve a la superficie (ahí sí la alcanzan)
  G.hurt(P.x + 10, P.y, 'foe');
  assert.equal(G.state, 'dying');
  assert.ok(P.vy >= 0, 'en el agua se hunde');
});

test('datos: el lago del Parque es profundo y la pila de la Plaza es agua baja; zonas dentro de su tramo', () => {
  const W = NS.World.buildWorld({});
  const lake = W.waters.find((z) => z.scene === 12), fountain = W.waters.find((z) => z.scene === 15);
  assert.ok(lake && lake.deep, 'lago profundo');
  assert.ok(fountain && !fountain.deep, 'pila de agua baja');
  for (const z of W.waters) {
    const sc = W.scenes[z.scene];
    assert.ok(z.x1 >= sc.x0 - 0.01 && z.x2 <= sc.x0 + sc.drawW + 0.01 && z.y >= sc.startY && z.y2 <= sc.endY, 'agua dentro de su tramo ' + z.id);
    assert.ok(z.x2 - z.x1 >= 60 && z.y2 > z.y);
    // Ninguna plataforma flota dentro del agua profunda (sería un piso que no se puede pisar nadando).
    if (z.deep) for (const p of W.platforms) {
      const inside = p.y > z.y + 4 && p.y < z.y2 - 4 && p.x2 > z.x1 + 2 && p.x1 < z.x2 - 2;
      assert.ok(!inside, 'plataforma dentro del agua profunda: ' + p.id);
    }
  }
  // Cada lado de un agua profunda tiene pared o suelo a la altura del agua (para poder salir).
  for (const z of W.waters.filter((w) => w.deep)) {
    for (const side of ['left', 'right']) {
      const edge = side === 'left' ? z.x1 : z.x2;
      const ground = W.platforms.some((p) => Math.abs(p.y - z.y) <= C.water.climbUp && (side === 'left' ? p.x2 >= edge - 6 && p.x1 < edge : p.x1 <= edge + 6 && p.x2 > edge));
      assert.ok(z.banks.includes(side) || ground, `orilla ${side} de ${z.id}`);
    }
  }
});

test('atlas de nado: cuadros dentro de la hoja, cada estado de nado tiene animación y la hoja se precarga', () => {
  const S = NS.ART.SWIM;
  assert.ok(S && S.sheet && fs.existsSync(path.join(ROOT, S.sheet)), 'hoja del atlas');
  const buf = fs.readFileSync(path.join(ROOT, S.sheet));
  const SW = buf.readUInt32BE(16), SH = buf.readUInt32BE(20);
  for (const [n, a] of Object.entries(S.anims)) {
    assert.ok(a.frames.length >= 1 && a.fps > 0 && a.scale > 0.8 && a.scale < 2.5, n);
    for (const [x, y, w, h, ax, ay] of a.frames) {
      assert.ok(x >= 0 && y >= 0 && x + w <= SW && y + h <= SH, `${n}: cuadro fuera de la hoja`);
      assert.ok(Number.isFinite(ax) && Number.isFinite(ay) && ay >= 0 && ay <= h + 1, `${n}: ancla`);
    }
  }
  for (const [n, r] of Object.entries(S.fx)) assert.ok(r[0] + r[2] <= SW && r[1] + r[3] <= SH, 'efecto ' + n);
  const render = fs.readFileSync(path.join(ROOT, 'js', 'app', 'render.js'), 'utf8');
  const map = render.match(/const SWIM_STATE = (\{[\s\S]*?\});/)[1];
  for (const anim of [...map.matchAll(/'(\w+)'/g)].map((m) => m[1])) assert.ok(S.anims[anim], 'animación usada por el render: ' + anim);
  const physics = fs.readFileSync(path.join(ROOT, 'js', 'core', 'physics.js'), 'utf8');
  for (const st of ['swimFloat', 'swim', 'swimUnder', 'swimDown', 'swimUp', 'swimUpDiag', 'swimDash', 'swimHurt', 'waterLeap', 'wade', 'wadeRun', 'diveIn']) {
    assert.ok(physics.includes(`'${st}'`) && new RegExp(`\\b${st}:`).test(map), 'estado ' + st + ' (física → render)');
  }
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.ok(sw.includes(S.sheet), 'el service worker precarga el atlas de nado');
});

test('bucear esquiva: un murciélago encima no daña a Sofía sumergida, pero sí en la superficie (control)', () => {
  const trial = (submerge) => {
    const G = NS.Game.createGame({}); G.setView(390, 844); G.newRun({ difficulty: 'normal', startTramo: 12 });
    const W = G.world, z = W.waters.find((w) => w.scene === 12 && w.deep), P = G.P;
    W.foes = W.foes.filter((f) => f.scene !== 12);
    const none = { left: false, right: false, jumpPressed: false, jumpHeld: false, dashPressed: false, downPressed: false };
    P.x = (z.x1 + z.x2) / 2; P.y = z.y + 10; P.vx = 0; P.vy = 0; P.ground = null; P.invuln = 0;
    for (let i = 0; i < 90; i++) G.step(1 / 60, submerge ? Object.assign({}, none, { downHeld: true }) : none);
    P.invuln = 0;
    const lives = G.run.lives;
    const bat = NS.Enemies.create('bat', { x: P.x, y: P.y, scene: 12, region: 'main', diff: C.difficulty.normal, rng: NS.util.makeRng(7) });
    W.foes.push(bat);
    for (let i = 0; i < 90; i++) { bat.x = P.x; bat.y = P.y; G.step(1 / 60, submerge ? Object.assign({}, none, { downHeld: true }) : none); }
    return { lives, after: G.run.lives, sub: P.submerged };
  };
  const under = trial(true), surface = trial(false);
  assert.ok(under.sub, 'Sofía estaba sumergida');
  assert.equal(under.after, under.lives, 'sumergida no recibe daño');
  assert.ok(!surface.sub && surface.after < surface.lives, 'en la superficie el mismo murciélago sí la daña (la prueba distingue)');
});

test('en el juego: caer en la pila de la Plaza (agua baja) salpica y suena; un brinquito dentro no', () => {
  const G = NS.Game.createGame({}); G.setView(390, 844); G.newRun({ difficulty: 'normal', startTramo: 15 });
  const W = G.world, z = W.waters.find((w) => w.scene === 15 && !w.deep), P = G.P;
  assert.ok(z, 'la Plaza tiene una pila de agua baja');
  const none = { left: false, right: false, jumpPressed: false, jumpHeld: false, dashPressed: false, downPressed: false };
  W.foes = W.foes.filter((f) => f.scene !== 15);
  // Sobre el centro de la pila está la fuente-trampolín: se entra bajando desde el borde (el suelo de al lado).
  const rim = W.platforms.find((p) => p.kind === 'floor' && p.scene === 15 && z.y - p.y > 0 && z.y - p.y < 60 && Math.abs(p.x2 - z.x1) < 10);
  assert.ok(rim, 'borde de la pila');
  P.x = rim.x2 - 20; P.y = rim.y - P.h / 2; P.vx = 0; P.vy = 0; P.ground = rim; P.airTopFoot = rim.y; P.invuln = 9;
  G.drainEvents(); G.waterFx.length = 0;
  for (let i = 0; i < 120 && !(P.ground && P.ground !== rim); i++) G.step(1 / 60, Object.assign({}, none, { right: !(P.x > z.x1 + 4) }));
  assert.ok(P.ground && P.ground !== rim && PHY.waterAt(W, P) === z, 'bajó dentro de la pila');
  assert.ok(G.waterFx.some((f) => f.kind === 'splashS' || f.kind === 'splashM'), 'salpica al caer');
  assert.ok(G.drainEvents().some((e) => e.type === 'sfx' && (e.name === 'wade' || e.name === 'splash')), 'suena al caer');
  // Un brinco mínimo (caída de menos de 24 u) no repite la salpicadura.
  for (let i = 0; i < 60; i++) G.step(1 / 60, none);
  G.waterFx.length = 0; G.drainEvents();
  P.y -= 10; P.ground = null; P.vy = 0; P.airTopFoot = P.y + P.h / 2;
  for (let i = 0; i < 30 && !P.ground; i++) G.step(1 / 60, none);
  assert.ok(P.ground, 'volvió a pisar');
  assert.ok(!G.waterFx.some((f) => f.kind.startsWith('splash')), 'sin salpicadura en un brinquito');
});
