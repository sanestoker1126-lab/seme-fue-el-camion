// V58.6 · El columpio de la escuela tiene un sentido: la azotea del nivel 1 la corta una barda rematada con vidrios
// rotos que no se puede saltar (ni con DASH, ni desde el tinaco, ni desde el techo del letrero); solo columpiándose
// se pasa al otro lado, a la orilla por donde se baja.
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./helpers');
const NS = load();
const PHY = NS.Physics;
const NONE = { left: false, right: false, jumpPressed: false, jumpHeld: false, dashPressed: false, downPressed: false, upHeld: false, downHeld: false, kickPressed: false };
const inp = (o) => Object.assign({}, NONE, o || {});

function schoolGame() {
  const G = NS.Game.createGame({});
  G.setView(844, 390);
  G.newRun({ mission: 0, startTramo: 0, difficulty: 'normal' });
  G.drainEvents();
  for (const f of G.world.foes) f.dead = true;
  const W = G.world;
  const barda = W.solids.find((s) => s.kind === 'barda' && s.scene === 0);
  const rope = W.ropes.find((r) => r.scene === 0);
  const left = W.platforms.find((p) => p.scene === 0 && Math.abs(p.x2 - barda.x1) < 2 && Math.abs(p.y - barda.y2) < 2);
  return { G, W, barda, rope, left };
}
/** Sofía nueva en (x, pies), sobre la plataforma que haya ahí. */
function place(G, x, foot) {
  Object.assign(G.P, PHY.createPlayer(x, foot));
  G.P.ground = G.world.platforms.find((p) => Math.abs(p.y - foot) < 2 && p.x1 <= x && p.x2 >= x) || null;
}

test('la azotea del nivel 1 la corta una barda con vidrios; el columpio cuelga antes de la barda', () => {
  const { W, barda, rope, left } = schoolGame();
  assert.ok(barda, 'hay barda');
  assert.ok(barda.y2 - barda.y1 >= 200, 'alta: ' + (barda.y2 - barda.y1).toFixed(0) + ' u');
  const glass = W.hazards.find((h) => h.type === 'spikes' && h.look === 'vidrios' && h.scene === 0);
  assert.ok(glass && glass.x1 <= barda.x1 && glass.x2 >= barda.x2 && Math.abs(glass.y - barda.y1) < 1, 'vidrios en todo el remate');
  assert.ok(left, 'la azotea termina en la barda (antes era un solo piso)');
  const right = W.platforms.find((p) => p.scene === 0 && Math.abs(p.x1 - barda.x2) < 2 && Math.abs(p.y - barda.y2) < 2);
  assert.ok(right, 'y sigue del otro lado, hasta la orilla');
  assert.ok(rope.arc && rope.look === 'columpio' && rope.ax < barda.x1 && rope.ax > left.x1 && Math.abs(rope.base - left.y) < 2, 'columpio sobre la azotea, antes de la barda');
  assert.ok(W.signs.some((s) => s.scene === 0 && /BARDA CON VIDRIOS/.test(s.text) && s.x < rope.ax), 'un letrero explica cómo cruzar');
});

test('sin el columpio la barda no se pasa: ni corriendo, ni saltando, ni con DASH, ni desde el tinaco o el letrero', () => {
  const { G, W, barda } = schoolGame();
  const saved = W.ropes.slice();
  W.ropes.length = 0;   // sin cuerdas: solo saltos
  const floorY = barda.y2;
  const tinaco = W.platforms.find((p) => p.scene === 0 && p.y < floorY - 100 && p.x2 < barda.x1 && p.x2 > -60);
  const letrero = W.platforms.find((p) => p.scene === 0 && p.y < floorY - 150 && p.x1 < -600);
  assert.ok(tinaco && letrero, 'techos altos a la izquierda');
  const starts = [[tinaco.x1 + 16, tinaco.y], [tinaco.x2 - 70, tinaco.y], [letrero.x2 - 120, letrero.y],
    [barda.x1 - 40, floorY], [barda.x1 - 160, floorY], [barda.x1 - 330, floorY]];
  let tries = 0, best = -Infinity;
  for (const [sx, sy] of starts) for (const jt of [0, 6, 12, 18, 24, 32]) for (const dt of [null, 6, 12, 18, 24, 30, 36, 42, 50]) {
    place(G, sx, sy);
    const P = G.P;
    tries++;
    for (let i = 0; i < 240; i++) {
      W.t += 1 / 60; PHY.updatePlatforms(W, W.t);
      PHY.stepPlayer(P, W, inp({ right: true, jumpPressed: i === jt, jumpHeld: i >= jt && i < jt + 40, dashPressed: dt !== null && i === jt + dt }), 1 / 60, []);
      best = Math.max(best, P.x);
      assert.ok(P.x <= barda.x2 + 1, `cruzó sin columpio (salida x=${sx.toFixed(0)}, salto ${jt}, DASH ${dt})`);
      if (P.ground === barda) assert.fail(`se paró sobre la barda sin columpio (salida x=${sx.toFixed(0)}, salto ${jt}, DASH ${dt})`);
    }
  }
  W.ropes.push(...saved);
  assert.ok(tries >= 300 && best >= barda.x1 - 30, 'se probó de verdad contra la barda: ' + tries + ' intentos, x máx ' + best.toFixed(0));
});

test('con el columpio sí se pasa: correr, saltar a la cuerda, columpiarse y soltar con SALTAR, sin cortarse', () => {
  const { G, barda, rope } = schoolGame();
  let ok = 0, grabs = 0;
  const kList = [14, 20, 26, 32, 40, 50];
  for (const k of kList) {
    place(G, rope.ax - 180, barda.y2);
    const P = G.P;
    let g = -1, rel = false, hurt = false, jumpAt = -1, landed = null;
    for (let i = 0; i < 420; i++) {
      let o;
      if (g < 0 && !P.rope) {
        if (jumpAt < 0 && P.x >= rope.ax - 100) jumpAt = i;
        o = { right: true, jumpPressed: i === jumpAt, jumpHeld: jumpAt >= 0 && i - jumpAt < 16 };
      } else if (P.rope) {
        if (g < 0) { g = i; grabs++; }
        o = { right: true, jumpPressed: i === g + k, jumpHeld: i >= g + k };
        if (i === g + k) rel = true;
      } else o = { right: true, jumpHeld: rel };
      G.step(1 / 60, inp(o));
      for (const e of G.drainEvents()) if (e.type === 'hurt') hurt = true;
      if (rel && !P.rope && P.ground) { landed = P.ground; break; }
    }
    if (landed && P.x > barda.x2 && !hurt) ok++;
  }
  assert.equal(grabs, kList.length, 'siempre alcanza la cuerda saltando desde el piso');
  assert.ok(ok >= 3, 'cruza con varios momentos de soltarse (no solo uno perfecto): ' + ok + ' de ' + kList.length);
});
