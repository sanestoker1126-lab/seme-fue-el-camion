'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

function load(files, injected) {
  const sandbox = { CAMION: injected || {} };
  vm.createContext(sandbox);
  for (const file of files) vm.runInContext(read(file), sandbox, { filename: file });
  return sandbox.CAMION;
}

test('V56: estilos para los 18 escenarios, 4 misiones y 7 tipos existentes', () => {
  const NS = load(['js/core/levels.js', 'js/core/toxifamilia_style.js']);
  const levels = NS.LEVELS.MISSIONS.flatMap(m => m.levels);
  assert.equal(NS.LEVELS.MISSIONS.length, 4);
  assert.equal(levels.length, 18);
  const ids = new Set(levels.map(l => l.id));
  assert.equal(ids.size, 18, 'sin perfiles duplicados');
  assert.equal(Object.keys(NS.TOXI_STYLE.profiles).length, 18);
  for (const level of levels) {
    const p = NS.TOXI_STYLE.forScene(level);
    assert.equal(p, NS.TOXI_STYLE.profiles[level.id], 'perfil personalizado de ' + level.id);
    assert.match(p.accent, /^#[0-9a-f]{6}$/i);
    assert.match(p.edge, /^#[0-9a-f]{6}$/i);
    assert.ok(p.intensity >= 0 && p.intensity <= 1);
    assert.ok(p.tag);
  }
  for (const kind of ['rat', 'dog', 'bravo', 'chile', 'bat', 'pigeon', 'kid'])
    assert.ok(NS.TOXI_STYLE.enemies[kind], 'enemy profile: ' + kind);
});

test('V56: el nombre La Toxifamilia no sustituye la historia canónica', () => {
  const style = read('js/core/toxifamilia_style.js');
  assert.match(style, /provisional/i);
  assert.doesNotMatch(read('js/core/story.js'), /LA TOXIFAMILIA/);
  assert.match(read('Se_Me_Fue_El_Camion.html'), /estilo la toxifamilia/i);
});

test('V56: boss phase se dispara una vez al bajar a mitad de vida', () => {
  const NS = load(['js/core/enemies.js'], { CONFIG: { combat: { enemyHitCooldown: .25 } } });
  const boss = { kind: 'dog', isBoss: true, hp: 4, maxHp: 4, spd: 100,
    dead: false, flash: 0, hitCD: 0, state: 'patrol', dir: 1, x: 100 };
  const events = [];
  assert.equal(NS.Enemies.hit(boss, 'kick', events, 90), true);
  assert.equal(boss.hp, 3);
  assert.equal(boss.enraged, undefined);
  boss.hitCD = 0;
  assert.equal(NS.Enemies.hit(boss, 'kick', events, 90), true);
  assert.equal(boss.hp, 2);
  assert.equal(boss.enraged, true);
  assert.ok(Math.abs(boss.spd - 110) < 1e-9, 'segundo estado +10 % velocidad');
  boss.hitCD = 0;
  NS.Enemies.hit(boss, 'kick', events, 90);
  assert.equal(events.filter(e => e.type === 'bossPhase').length, 1);
  assert.equal(boss.hp, 1);
});

test('V56: renderer uses visible world clip and original background sequence', () => {
  const r = read('js/app/render.js');
  assert.match(r, /function drawToxiAtmosphere\(/);
  assert.match(r, /if \(!inView\(V, sc\.x0, sc\.startY, sc\.x0 \+ sc\.drawW, sc\.endY\)\) continue/);
  assert.match(r, /ctx\.clip\(\)/);
  assert.match(r, /function drawToxiThreat\(/);
  assert.match(r, /drawBackdrop\(G, V\); drawScenes\(G, V\); drawNeighborhood\(G, V, T\); drawStreet\(G, V, T\); drawToxiAtmosphere\(G, V, T\)/);
  assert.match(r, /drawRealParallax\(G, V, sc, 4, 5\)/);
});

test('V56: PWA precaches new files and invalidates V55 cache', () => {
  const sw = read('sw.js'), html = read('Se_Me_Fue_El_Camion.html');
  assert.match(sw, /camion-v57-thematic-villains/);
  for (const [asset, v] of [
    ['css/toxifamilia_style.css', '57.0'],
    ['js/core/toxifamilia_style.js', '57.0']
  ]) {
    assert.ok(sw.includes(asset + '?v=' + v), 'PWA prefetch ' + asset);
    assert.ok(html.includes(asset + '?v=' + v), 'HTML link ' + asset);
  }
  for (const js of ['js/core/enemies.js', 'js/app/render.js', 'js/app/main.js']) {
    assert.ok(sw.includes(js + '?v=57.0'), 'SW version ' + js);
    assert.ok(html.includes(js + '?v=57.0'), 'HTML version ' + js);
  }
});

test('V56: imagen fallida y carga estancada no bloquean el arranque', async () => {
  class FailedImage {
    constructor() { this.complete = true; this.naturalWidth = 0; this.naturalHeight = 0; }
    set src(value) { this.path = value; }
    addEventListener() {}
    removeEventListener() {}
  }
  const sandbox = { CAMION: {}, Image: FailedImage };
  vm.createContext(sandbox);
  vm.runInContext(read('js/app/render.js'), sandbox);
  const result = await sandbox.CAMION.Render.preload(['imagen_rota.png']);
  assert.equal(result.length, 1);
  assert.equal(result[0], null, 'asset roto devuelve control a boot');

  class StalledImage {
    constructor() { this.complete = false; this.naturalWidth = 0; }
    set src(value) { this.path = value; }
    addEventListener() {}
    removeEventListener() {}
  }
  const stalled = { CAMION: {}, Image: StalledImage,
    setTimeout: (cb) => setImmediate(cb),
    clearTimeout: (id) => clearImmediate(id) };
  vm.createContext(stalled);
  vm.runInContext(read('js/app/render.js'), stalled);
  const delayed = await stalled.CAMION.Render.preload(['imagen_sin_respuesta.png']);
  assert.equal(delayed.length, 1);
  assert.equal(delayed[0], null, 'watchdog permite continuar');
});
