// Cargador común: ejecuta los módulos de js/core en el ámbito global de Node, igual que en el navegador.
const path = require('path');
const ORDER = ['util', 'config', 'levels', 'story', 'physics', 'enemies', 'obstacles', 'world', 'game'];
let loaded = false;
function load() {
  if (!loaded) {
    for (const m of ORDER) require(path.join(__dirname, '..', 'js', 'core', m + '.js'));
    loaded = true;
  }
  return globalThis.CAMION;
}

/** Mundo mínimo para pruebas de física: plataformas y sólidos explícitos. */
function miniWorld({ platforms = [], solids = [], hazards = [] } = {}) {
  const W = { platforms: [], solids: [], hazards, foes: [], shots: [], pickups: [], t: 0 };
  for (const p of platforms) W.platforms.push(Object.assign({ kind: 'floor', drop: false, h: 12, dx: 0, dy: 0, occupied: [] }, p, { prevY: p.y, w: p.x2 - p.x1 }));
  for (const s of solids) W.solids.push(Object.assign({ kind: 'block', solid: true, drop: false }, s, { y: s.y1 }));
  return W;
}

const NONE = Object.freeze({ left: false, right: false, jumpPressed: false, jumpHeld: false, dashPressed: false, downPressed: false });
const input = (o = {}) => Object.assign({}, NONE, o);

/** Simula n pasos con una función de entrada por paso. */
function run(NS, P, W, n, inpFn, dt = 1 / 60, onStep) {
  const events = [];
  for (let i = 0; i < n; i++) {
    W.t += dt;
    NS.Physics.updatePlatforms(W, W.t);
    const ev = NS.Physics.stepPlayer(P, W, typeof inpFn === 'function' ? inpFn(i) : (inpFn || NONE), dt, []);
    for (const e of ev) events.push(Object.assign({ step: i }, e));
    if (onStep) onStep(i, ev);
  }
  return events;
}

module.exports = { load, miniWorld, input, run, NONE };
