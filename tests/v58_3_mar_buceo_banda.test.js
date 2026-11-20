// V58.3 · En el mar Sofía usa sus cuadros normales fuera del agua y los de buceo dentro (cambio inmediato),
// cada estado del agua con su animación real del atlas; el otro gato maúlla también en el mar; y el mundo marino
// tiene su banda sonora de fondo (Chinos de Seda, 1:30–3:00) sin el ambiente de calle.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load } = require('./helpers');
const NS = load();
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const NONE = { left: false, right: false, jumpPressed: false, jumpHeld: false, dashPressed: false, downPressed: false, upHeld: false, downHeld: false };

/** Tabla DIVE_WATER de render.js, evaluada tal cual. */
function diveTable() {
  const src = read('js/app/render.js');
  const m = src.match(/const DIVE_WATER = (\{[\s\S]*?\n {2}\});/);
  assert.ok(m, 'render.js define DIVE_WATER');
  return new Function('return ' + m[1])();
}

test('en el mar: dentro del agua, cuadros de buceo; fuera, los normales (sin atlas de nado ni traje en tierra)', () => {
  const r = read('js/app/render.js');
  const body = r.slice(r.indexOf('function drawPlayer('), r.indexOf('function drawCinematic('));
  const iDive = body.indexOf('if (sea && inSeaWater(P) && drawDiveWater(G, alpha)) return;');
  const iSwim = body.indexOf('const swimA = sea ? null : swimAnimFor(P);');
  assert.ok(iDive > 0 && iSwim > iDive, 'primero el buceo dentro del agua; el atlas de nado no se usa en el mar');
  assert.match(body, /const outfit = suitTheme === 'espacial' \? 'astronauta' : ropt\.ninaLook;/, 'en tierra del mar, vestuario normal del menú');
  assert.match(r, /const inSeaWater = \(P\) => !!\(P\.water \|\| P\.wade\);/, 'nadar o vadear = estar en el agua');
  assert.match(r, /waterLeap: \['air_01'\]/); assert.match(r, /diveIn: \['dive_01'\]/);
});

test('cada estado del agua tiene su animación del atlas de buceo, con los cuadros y pivotes de su JSON', () => {
  const J = JSON.parse(read('assets/player/sofia/sofia_submarina_complementaria.json'));
  const T = diveTable();
  const expect = {
    swimFloat: 'float', swim: 'swim_horizontal', swimUnder: 'swim_horizontal', swimDown: 'swim_down', swimUp: 'swim_up',
    swimUpDiag: 'swim_up', swimDash: 'swim_fast', swimKick: 'swim_fast', swimHurt: 'hurt', wadeIdle: 'idle', wade: 'walk_floor',
    wadeRun: 'run_floor', dead: 'knockout', cheer: 'victory'
  };
  // Todos los estados que physics.updateState puede dar dentro del agua o vadeando.
  const phys = read('js/core/physics.js');
  for (const s of ['swimHurt', 'swimKick', 'swimDash', 'swimDown', 'swimUpDiag', 'swimUp', 'swimUnder', 'swim', 'swimFloat', 'wadeRun', 'wade', 'wadeIdle']) {
    assert.ok(phys.includes("'" + s + "'"), 'physics produce ' + s);
    assert.ok(T[s], 'falta animación de buceo para ' + s);
  }
  for (const [state, anim] of Object.entries(expect)) {
    const a = J.animations[anim], [first, count, ms, pivot] = T[state];
    const idx = a.frames.map((n) => J.frames[n].index);
    assert.equal(first, idx[0], state + ': primer cuadro de ' + anim);
    assert.equal(count, idx.length, state + ': cuántos cuadros de ' + anim);
    assert.deepEqual(idx, Array.from({ length: count }, (_, i) => first + i), anim + ' es consecutiva en el atlas');
    assert.equal(ms, a.duration_ms, state + ': ms por cuadro');
    for (const n of a.frames) assert.equal(J.frames[n].pivot.y, pivot, state + ': pivote de ' + n);
  }
});

test('el cambio es inmediato: al entrar al agua el estado ya es de agua y al salir deja de serlo', () => {
  const G = NS.Game.createGame({});
  G.setView(844, 390);
  G.newRun({ mission: 2, startTramo: 0, difficulty: 'normal' });
  const P = G.P, sea = G.world.scenes[0];
  assert.equal(sea.theme, 'submarino');
  P.invuln = 99;
  // Arranca en la isla, en seco: estado normal (no de agua).
  for (let i = 0; i < 30; i++) G.step(1 / 60, NONE);
  assert.ok(!P.water && !P.wade, 'en la isla está en seco');
  assert.ok(!diveTable()[P.state] || P.state === 'cheer', 'en seco usa sus cuadros normales (' + P.state + ')');
  const zone = (G.world.waters || []).find((w) => w.deep && w.scene === sea.index && w.y2 - w.y > 300);
  assert.ok(zone, 'el mar tiene agua honda');
  P.x = (zone.x1 + zone.x2) / 2; P.y = zone.y + 160; P.vx = 0; P.vy = 0;
  G.step(1 / 60, NONE);
  assert.ok(P.water, 'dentro del agua');
  assert.ok(/^swim/.test(P.state), 'en el primer paso dentro del agua ya está nadando (' + P.state + ')');
  assert.ok(diveTable()[P.state], 'su estado (' + P.state + ') se dibuja con el atlas de buceo');
});

test('el otro gato también maúlla en el mar: los enemigos marinos se descubren y main.js lo hace sonar', () => {
  const G = NS.Game.createGame({});
  G.setView(844, 390);
  G.newRun({ mission: 2, startTramo: 0, difficulty: 'normal' });
  G.drainEvents();
  const kinds = new Set();
  for (const f of G.world.foes.filter((x) => !x.dead && ['piranha', 'shark', 'pulpo'].includes(x.kind)).slice(0, 8)) {
    G.P.x = f.x - 150; G.P.y = f.y; G.P.vx = 0; G.P.vy = 0; G.P.invuln = 99;
    for (let i = 0; i < 10; i++) G.step(1 / 60, NONE);
    for (const e of G.drainEvents()) if (e.type === 'enemyDiscovered' && e.foe) kinds.add(e.foe.kind);
  }
  assert.ok(['piranha', 'shark', 'pulpo'].some((k) => kinds.has(k)), 'se descubren enemigos marinos: ' + [...kinds]);
  assert.match(read('js/app/main.js'), /case 'enemyDiscovered':[\s\S]{0,400}audio\.sfx\('otroGato'\)/);
});

test('banda sonora del mar: archivo procesado (1:30–3:00), suena solo en el mar y sin ambiente de calle', () => {
  const file = 'assets/audio/mar_chinos_de_seda_fondo_v58_3.mp3';
  const buf = fs.readFileSync(path.join(ROOT, file));
  // MP3 CBR 128 kb/s: ≈ 16 000 B/s → 90 s ≈ 1,44 MB (la canción completa de 3:12 pesaría más del doble).
  assert.ok(buf.length > 1.30e6 && buf.length < 1.60e6, 'dura ≈ 90 s: ' + buf.length + ' B');
  assert.ok(buf[0] === 0xff || buf.slice(0, 3).toString() === 'ID3', 'es MP3');
  const sw = read('sw.js');
  assert.ok(sw.includes("'" + file + "'"), 'se precarga para jugar sin conexión');

  // Audio falso: registra qué pistas suenan.
  const made = [];
  class FakeAudio {
    constructor(src) { this.src = 'http://x/' + src; this.paused = true; this.volume = 1; this.currentTime = 0; made.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const prev = globalThis.Audio; globalThis.Audio = FakeAudio;
  try {
    require(path.join(ROOT, 'js/app/audio.js'));
    const a = NS.Audio.createAudio({ music: true, sfx: true });
    a.setTramo(0, false, 'submarino');
    a.start();
    const playing = () => made.filter((x) => !x.paused).map((x) => x.src.replace('http://x/', ''));
    assert.deepEqual(playing(), [file], 'en el mar solo su banda sonora');
    assert.ok(made.find((x) => x.src.endsWith(file)).volume <= 0.16 + 1e-9, 'de fondo: volumen de música bajito');
    a.setTramo(0, false, 'escuela');
    const now = playing();
    assert.ok(now.includes('assets/audio/cancion_fondo_v40.mp3'), 'fuera del mar vuelve la canción de siempre');
    assert.ok(now.includes('assets/audio/ambiente_escuela_v24.mp3'));
    a.stop();
    assert.deepEqual(playing(), [], 'al detener se callan también las que se estaban desvaneciendo');
  } finally { globalThis.Audio = prev; }
});
