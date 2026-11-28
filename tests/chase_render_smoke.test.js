// V58.8.30 · La Calzada se dibuja completa sin errores (contexto falso que, como el navegador, rechaza radios negativos)
// y las tablas de llantas que giran son coherentes con cada cuadro.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers');
const NS = load();
const { chaseBot } = require('./chase_bot');

function fakeCanvas(W, H) {
  const grad = { addColorStop() {} };
  let alpha = 1;
  const calls = { ellipse: 0, arc: 0, drawImage: 0, clip: 0 };
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k === 'calls') return calls;
      if (k === 'globalAlpha') return alpha;
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'measureText') return (s) => ({ width: String(s).length * 7 });
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (k === 'ellipse') return (x, y, rx, ry) => { calls.ellipse++; if (!(rx >= 0 && ry >= 0)) throw new RangeError('IndexSizeError: radio negativo ' + rx + ',' + ry); };
      if (k === 'arc') return (x, y, r) => { calls.arc++; if (!(r >= 0)) throw new RangeError('IndexSizeError: radio negativo ' + r); };
      if (k === 'drawImage' || k === 'clip') return () => { calls[k]++; };
      if (k in t) return t[k];
      return () => {};
    },
    set(t, k, v) { if (k === 'globalAlpha') { alpha = v; if (!(v >= 0 && v <= 1.0001)) throw new RangeError('globalAlpha fuera de rango ' + v); } t[k] = v; return true; }
  });
  return { canvas: { width: W, height: H, clientWidth: W, clientHeight: H, getContext: () => ctx }, ctx };
}

test('La Calzada se dibuja de principio a fin (con jefes, saltos y final) sin errores de dibujo', () => {
  NS.Render = { image: () => ({}), ready: () => false };   // sin arte: se ejercitan caminos, efectos y HUD
  require('../js/app/chase_render.js');
  for (const [W, H] of [[1280, 720], [390, 844]]) {
    const { canvas, ctx } = fakeCanvas(W, H);
    NS.ChaseRender.init(canvas);
    const S = NS.Chase.createChase({ seed: 6, difficulty: 'normal' });
    S.newRun({ section: 0 });
    let T = 0, frames = 0;
    for (let i = 0; i < 60 * 60 * 6 && S.state !== 'won'; i++) {
      S.step(1 / 60, chaseBot(S)); S.drainEvents();
      if (S.state === 'lost') S.retry();
      T += 1 / 60;
      if (i % 2 === 0) { NS.ChaseRender.draw(S, T); frames++; }
    }
    assert.equal(S.state, 'won', 'el bot termina la Calzada');
    assert.ok(frames > 1000 && ctx.calls.ellipse > 1000, 'se dibujaron ' + frames + ' cuadros');
  }
});

test('llantas que giran: datos para cada cuadro, dentro del cuadro y del mismo tamaño en cada moto', () => {
  const { MOTO_WHEELS, RIDER_WHEELS, MJEFE_WHEELS, MOTO } = NS.ChaseRender.WHEELS;
  const pair = (W, name) => {
    assert.equal(W.length, 2, name);
    const [rear, front] = W;
    assert.ok(rear[0] < front[0], name + ': la trasera va a la izquierda');
    assert.ok(Math.abs(rear[2] - front[2]) <= 4, name + ': llantas del mismo tamaño');
    for (const w of W) assert.ok(w[2] >= 24 && w[2] <= 46 && w[0] - w[2] >= -3 && w[1] - w[2] >= 0, name + ': llanta dentro del cuadro');
  };
  for (const src of [MOTO.ride, MOTO.boost, MOTO.air]) {
    const W = MOTO_WHEELS[src]; pair(W, src);
    for (const w of W) {
      const [, , , a1, a2, per] = w;
      assert.ok(a1 >= 0 && a2 <= 180 && a2 - a1 >= per, src + ': la mitad limpia alcanza al menos un periodo de rayos');
      assert.ok(per >= 30 && per <= 95, src + ': periodo de rayos plausible');
    }
  }
  for (const rider of ['nino', 'maestro']) {
    for (const row of '1234') for (const col of '123') pair(RIDER_WHEELS[rider][row + col], rider + row + col);
    // Anclar por las llantas quita el corrimiento entre cuadros: los puntos de apoyo quedan a la misma distancia.
    const bases = Object.values(RIDER_WHEELS[rider]).map((W) => W[1][0] - W[0][0]);
    assert.ok(Math.max(...bases) - Math.min(...bases) <= 16, rider + ': distancia entre ejes estable');
  }
  assert.equal(MJEFE_WHEELS.length, 20);
  MJEFE_WHEELS.forEach((W, i) => { if (i < 18) pair(W, 'maestro jefe ' + i); else assert.equal(W, null); });
});
