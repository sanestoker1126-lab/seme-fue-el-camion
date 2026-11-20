// V58.1 · Mundos pintados de una pieza: mar «Marino PRO V4» y Luna «Espacio Luna PRO V5». Cada arte es el único fondo de su misión y el nivel está trazado sobre lo dibujado.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load } = require('./helpers');
const NS = load(), LV = NS.LEVELS, C = NS.CONFIG;
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('el mapa del mar sale del arte V4: medidas del dibujo × px, más del doble que V54', () => {
  const m = LV.SUBMARINO_MAP, A = LV.MARINE_ART;
  assert.equal(m.worldArt, A);
  assert.deepEqual([A.width, A.height, A.pageH, A.pages.length], [971, 2928, 976, 3]);
  assert.equal(m.width, Math.round(A.width * A.px));
  assert.equal(m.height, Math.round(A.height * A.px));
  assert.ok(m.width >= 2 * 940 && m.height >= 2 * 3072, 'más del doble que V54 en ancho y alto');
  assert.equal(LV.SUBMARINO_LEVEL.art, 'painted');
  assert.equal(LV.SUBMARINO_LEVEL.stairsPainted, true);
  assert.ok(m.stairs.length >= 15, 'escaleras de la isla');
  assert.ok(m.planks.length === 3 && m.planks.every((q) => q.painted), 'puente de cuerda pintado');
  assert.ok(m.gems.length >= 150, 'cristales: ' + m.gems.length);
});

test('en el mundo armado, lo trazado sobre el dibujo no se dibuja encima; lo agregado sí', () => {
  const W = NS.World.buildWorld({ levels: [LV.SUBMARINO_LEVEL] });
  const main = W.platforms.filter((p) => p.region === 'main' && !p.transition);
  const floors = main.filter((p) => p.kind === 'floor');
  assert.ok(floors.length >= 45 && floors.every((p) => p.hidden && !p.draw), 'repisas pintadas');
  assert.ok(main.filter((p) => p.kind === 'stair').every((p) => p.hidden), 'escalones pintados');
  assert.ok(main.filter((p) => p.plank).every((p) => p.hidden), 'puente de cuerda pintado');
  // V58.2: bajo la isla todo es mar (se nada): ya no hay trampolines ni vehículos sumergidos. Solo la barca de la
  // superficie, que el dibujo no trae y por eso se dibuja.
  const looks = main.filter((p) => p.look).map((p) => p.look).sort();
  assert.deepEqual(looks, ['bote']);
  // Relieve del mar: sólido y sin dibujar (roca grande, meseta de la casa-piña y sus puentes).
  const rocks = W.solids.filter((s) => s.kind === 'roca');
  assert.ok(rocks.length >= 10 && rocks.every((s) => s.draw === false), 'relieve sólido sin dibujar');
  // Tirolesas de cuerda en la isla (bajo el agua se nada: la cadena del barco ya no es tirolesa).
  assert.ok(W.zips.length >= 2 && W.zips.every((z) => z.look === 'cuerda' && !z.painted), 'tirolesas de cuerda en la isla');
  const sea = W.waters.find((z) => z.sea);
  assert.ok(W.zips.every((z) => Math.max(z.ay, z.by) < sea.y), 'las tirolesas quedan sobre el agua');
});

test('mar completo alineado con el dibujo: superficie en la espuma de la roca y todo lo de abajo es agua', () => {
  const W = NS.World.buildWorld({ levels: [LV.SUBMARINO_LEVEL] });
  const k = C.world.sceneScale * LV.MARINE_ART.px, sea = W.waters.find((z) => z.sea);
  assert.ok(Math.abs(sea.y / k - 1155) < 1, 'superficie en 1155 px');
  // V58.2: «solo la isla se camina»: todo lo que está bajo la superficie es mar, hasta el lecho de la escotilla.
  assert.ok(sea.toStreet && sea.y2 >= W.scenes[0].endY, 'el mar cubre la ciudad hundida y el abismo');
  const dry = W.platforms.filter((p) => p.region === 'main' && !p.transition && !p.underwater);
  assert.ok(dry.every((p) => p.y <= sea.y + 4), 'solo la isla (sobre el agua) tiene suelo seco');
  // Las brechas de los puentes de la meseta son huecos reales: ninguna roca las tapa.
  const blocks = W.solids.filter((s) => s.kind === 'roca');
  assert.equal(W.breaches.length, 2);
  for (const b of W.breaches) assert.ok(blocks.every((r) => r.x2 <= b.x1 + 0.5 || r.x1 >= b.x2 - 0.5 || r.y2 < b.y1 || r.y1 > b.y2), 'ninguna roca tapa una brecha');
  // Los que nadan patrullan carriles libres de roca.
  for (const f of W.foes.filter((q) => q.swimLane !== undefined)) {
    assert.ok(f.waterZone === sea && blocks.every((r) => !(f.y > r.y1 - 10 && f.y < r.y2 + 10 && f.lane.x2 > r.x1 && f.lane.x1 < r.x2)), 'carril libre de roca: ' + f.id);
  }
  assert.equal(W.foes.find((f) => f.isBoss).waterZone, sea, 'Poseidón está en el mar');
  assert.ok(W.foes.filter((f) => f.kind === 'piranha').length <= 6);
  // La parada intermedia es la roca grande, justo antes de entrar al mar.
  assert.ok(W.midpoints.length === 1 && W.midpoints[0].y < sea.y && W.midpoints[0].y > sea.y - 200);
});

test('el arte V4 es el único fondo del mar: archivos, precarga y sin rastros del anterior', () => {
  const r = read('js/app/render.js'), sw = read('sw.js'), main = read('js/app/main.js');
  const dir = 'assets/parallax/marino/depth_v4/';
  const files = [...LV.MARINE_ART.pages.map((p) => dir + 'backgrounds/' + p),
    ...['01_caudales_superficie', '02_neblina_distante', '03_ruinas_lejanas', '04_corales_medios', '05_plancton_flotante', '06_burbujas_ligeras', '07_arrecife_cercano'].map((n) => dir + 'layers/' + n + '.png')];
  for (const f of files) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), 'falta ' + f);
    assert.ok(sw.includes(f), 'sin precargar ' + f);
    if (f.includes('/layers/')) assert.ok(r.includes(f.replace(dir, '')), 'el renderer no usa ' + f);
    else assert.ok(LV.SUBMARINO_MAP.worldArt.pages.some((p) => f.endsWith(p)), 'el mapa no usa ' + f);
  }
  assert.match(r, /function drawDepthArt\(/);
  for (const old of ['panorama_marino', 'arrecife.webp', 'fauna.webp', 'parallax/submarino/', 'submarino_fondo.png']) {
    for (const [name, src] of [['render.js', r], ['sw.js', sw], ['main.js', main]]) assert.ok(!src.includes(old), `${name} aún usa ${old}`);
    assert.ok(!fs.existsSync(path.join(ROOT, 'assets/parallax/marino/' + old)), 'sigue en disco: ' + old);
  }
  assert.ok(!fs.existsSync(path.join(ROOT, 'assets/scenes/generated/submarino_fondo.png')));
});

// ---------- Luna «Espacio Luna Parallax PRO V5» ----------
test('la Luna sale del arte V5: franja nítida × px, más del doble que V54, gravedad 0,72', () => {
  const m = LV.ESPACIAL_MAP, A = LV.LUNAR_ART;
  assert.equal(m.worldArt, A);
  assert.deepEqual([A.width, A.height, A.pageH, A.x0, A.cropW], [1680, 3072, 1024, 315, 1050]);
  assert.equal(m.width, Math.round(A.cropW * A.px));
  assert.equal(m.height, Math.round(A.height * A.px));
  assert.ok(m.width >= 2 * 940 && m.height >= 2 * 3072, 'más del doble que V54');
  assert.equal(LV.ESPACIAL_LEVEL.art, 'painted');
  assert.equal(LV.ESPACIAL_LEVEL.gravity, 0.72);
  assert.ok(m.gems.length >= 150, 'cristales: ' + m.gems.length);
});

test('Luna: lo trazado no se dibuja; la banda de roca es sólida salvo en sus dos grietas', () => {
  const W = NS.World.buildWorld({ levels: [LV.ESPACIAL_LEVEL] });
  const main = W.platforms.filter((p) => p.region === 'main' && !p.transition);
  assert.ok(main.filter((p) => p.kind === 'floor').every((p) => p.hidden && !p.draw), 'repisas pintadas');
  assert.ok(main.filter((p) => p.kind === 'stair').length >= 20 && main.filter((p) => p.kind === 'stair').every((p) => p.hidden), 'escaleras pintadas');
  assert.deepEqual(main.filter((p) => p.look).map((p) => p.look).sort(), ['hongo', 'nave', 'nave']);
  const rocks = W.solids.filter((s) => s.kind === 'roca');
  assert.ok(rocks.length === 5 && rocks.every((s) => s.draw === false));
  assert.equal(W.cracks.length, 2);
  for (const c of W.cracks) {
    assert.ok(rocks.every((b) => b.x2 <= c.x1 + 0.5 || b.x1 >= c.x2 - 0.5), 'la grieta es un pozo libre');
    assert.ok(c.x2 - c.x1 >= C.player.w + 20, 'cabe Sofía');
  }
  assert.equal(W.zips.filter((z) => z.look === 'anclaje').length, 3);
  assert.equal(W.gravityMul, 0.72);
  assert.ok(W.foes.some((f) => f.kind === 'robot') && W.foes.some((f) => f.kind === 'drone' && f.isBoss));
});

test('el arte V5 es el único fondo de la Luna: archivos, precarga y sin el panorama ni la decoración anteriores', () => {
  const r = read('js/app/render.js'), sw = read('sw.js'), main = read('js/app/main.js');
  const dir = 'assets/parallax/espacial/depth_v5/';
  const files = [...LV.LUNAR_ART.pages.map((p) => dir + 'background/' + p),
    ...['01_estrellas_lejanas', '04_naves_satelites', '05_basura_meteoritos', '06_polvo_caverna', '07_luz_cristales'].map((n) => dir + 'layers/' + n + '.png')];
  for (const f of files) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), 'falta ' + f);
    assert.ok(sw.includes(f), 'sin precargar ' + f);
  }
  assert.match(r, /04_naves_satelites\.png', box: \[590, 72, 289, 106\]/, 'el OVNI de la capa de naves es la plataforma nave');
  for (const old of ['espacial/panorama.webp', 'espacial/decoracion.webp', 'espacial_fondo.png', 'SPECIAL_ART']) {
    for (const [name, src] of [['render.js', r], ['sw.js', sw], ['main.js', main]]) assert.ok(!src.includes(old), `${name} aún usa ${old}`);
  }
  for (const f of ['assets/parallax/espacial/panorama.webp', 'assets/parallax/espacial/decoracion.webp', 'assets/scenes/generated/espacial_fondo.png']) {
    assert.ok(!fs.existsSync(path.join(ROOT, f)), 'sigue en disco: ' + f);
  }
});
