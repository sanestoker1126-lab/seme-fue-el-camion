const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./helpers');

const NS = load();
require('../js/core/toxifamilia.js');
const ROOT = path.resolve(__dirname, '..');
const T = globalThis.CAMION.TOXIFAMILIA;

function game(mission = 1, difficulty = 'normal') {
  const G = NS.Game.createGame({});
  G.setView(1440, 900);
  G.newRun({ mission, difficulty });
  G.drainEvents();
  return G;
}

test('la transición escuela–Guadalajara valida escenas breves, visuales y sin diálogo atribuido al guion', () => {
  const scenes = T.validate(T.GDL_TRANSITION);
  assert.deepEqual(scenes.map((s) => s.id), ['gdl_salida', 'gdl_camion', 'gdl_llegada', 'gdl_terraza']);
  assert.ok(scenes.every((s) => s.durationMs >= 4000 && s.durationMs <= 5000));
  assert.ok(scenes.every((s) => s.lines === null));
  assert.equal(scenes[0].backgrounds[0], 'assets/scenes/school_pro/school_exit_facade.webp');
  assert.deepEqual(scenes[1].backgrounds, ['assets/scenes/guadalajara_pro_v2/transit_street.webp']);
  assert.equal(scenes[1].cast[0].bottom, 3);
  assert.equal(scenes[1].layout, 'dialogo');
  assert.equal(scenes[1].cast[0].label, false);
  assert.equal(scenes[1].backgroundMotion, 'travel');
  assert.equal(scenes[1].cast[0].frames[0], 'assets/scenes/school_pro/school_bus.png');
  assert.deepEqual(scenes[2].backgrounds, ['assets/scenes/guadalajara_pro_v2/transit_street.webp']);
  assert.equal(scenes[2].cast[0].bottom, 3);
  assert.equal(scenes[2].layout, 'dialogo');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  for (const asset of scenes[1].backgrounds) assert.ok(sw.includes(asset), `Service Worker no precarga ${asset}`);
  for (const asset of ['00_cielo_atardecer.webp', '01_ciudad_lejana.webp']) assert.ok(sw.includes(`assets/parallax/guadalajara_v584/${asset}`), `Service Worker no precarga ${asset}`);
  for (const asset of ['canal_inundado_redisenio.webp', 'bosque_algas.webp', 'fosa_azul.webp']) {
    assert.ok(sw.includes(`assets/scenes/underwater/v59/${asset}`), `Service Worker no precarga el fondo V59 ${asset}`);
  }
  for (const asset of T.assetsOf(scenes)) assert.ok(fs.existsSync(path.join(ROOT, asset)), `falta asset ${asset}`);
  assert.equal(T.SOURCE.status, 'adapted_from_chat_script');
  const render = fs.readFileSync(path.join(ROOT, 'js/app/render.js'), 'utf8');
  assert.match(render, /GDL_V584 = PXD \+ 'guadalajara_v584\/'/);
  assert.match(render, /00_cielo_atardecer\.webp/);
  assert.match(render, /01_ciudad_lejana\.webp/);
  // V58.8.30: el primer Guadalajara usa solo el cielo (no la ciudad lejana) también en su mitad alta pintada.
  assert.match(render, /guadalajara:\s+\{ top: GDL_SKY\('barrios_inferiores'\), bottom: GDL_SKY\('barrios_inferiores'\) \}/);
  assert.match(render, /own && !\(sc\.artPainted && sc\.map\.art && sc\.map\.art\.length\)/);
  const lv = fs.readFileSync(path.join(ROOT, 'js/core/levels.js'), 'utf8');
  assert.match(lv, /guadalajara:\s+\{ keepWidth: true, painted: true, pieces: \[\'plain\', \'zip\', \'bounce\'\] \}/);
});

test('la primera misión urbana carga el mapa panorámico con cinco cornisas pintadas conectadas', () => {
  const G = game(), scene = G.world.scenes[0], map = NS.LEVELS.SOFEVI_MAP;
  assert.equal(scene.id, 'guadalajara');
  assert.equal(map.width, 1600);
  assert.equal(map.height, 450);

  // Las imágenes 1920×540 y el mapa 1600×450 comparten relación 32:9; renderer y colisiones usan la misma escala.
  const png = fs.readFileSync(path.join(ROOT, 'assets/scenes/guadalajara_pro_v2/architecture_guadalajara_pro_v2.png'));
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  const artW = png.readUInt32BE(16), artH = png.readUInt32BE(20);
  assert.equal(artW / artH, map.width / map.height);
  assert.equal(scene.map.art[0].w, map.width);
  assert.equal(scene.map.art[0].h, map.height);

  const landings = map.surfaces.filter((s) => !s.gen);
  assert.deepEqual(landings.map(({ x1, x2, y }) => [x1, x2, y]), [
    [950, 1560, 90], [120, 1120, 170], [480, 1480, 250], [60, 860, 330], [560, 1200, 420]
  ]);
  for (let i = 1; i < landings.length; i++) {
    const prev = landings[i - 1], next = landings[i];
    assert.ok(Math.min(prev.x2, next.x2) - Math.max(prev.x1, next.x1) >= 150,
      `la caída ${i} no comparte una zona segura de aterrizaje`);
    assert.ok(next.y > prev.y && next.y - prev.y <= 90, `salto vertical irregular entre repisas ${i - 1}/${i}`);
  }
  assert.equal(scene.surfaces.filter((p) => p.hidden && !p.gen).length, 5);
  assert.deepEqual(map.stairs.map(({ x1, x2, y }) => [x1, x2, y]), [
    [1000, 1082, 132], [520, 602, 212], [1000, 1060, 292], [600, 682, 375]
  ]);
});

test('la transición se conecta al inicio de la misión 2, respeta el bypass y ofrece replay tras verla', () => {
  const main = fs.readFileSync(path.join(ROOT, 'js/app/main.js'), 'utf8');
  const player = fs.readFileSync(path.join(ROOT, 'js/app/toxifamilia_cinematic.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'css/toxifamilia.css'), 'utf8');
  assert.match(main, /mission === 1 && tramo === 0 && opt\.cinematics && !guadalajaraCineSeen\(\)/);
  assert.match(main, /set: 'guadalajara'.*onDone: arrive/s);
  assert.match(main, /GDL_CINE_KEY/);
  assert.match(player, /SETS\.guadalajara = manifest\.validate\(manifest\.GDL_TRANSITION \|\| \[\]\)/);
  assert.match(player, /classList\.toggle\('toxi-travel', s\.backgroundMotion === 'travel'\)/);
  assert.match(css, /@keyframes toxiTravel\{from\{background-position:32% 50%\}to\{background-position:50% 50%\}\}/);
  assert.match(player, /TRANSICIÓN A GUADALAJARA/);
});
