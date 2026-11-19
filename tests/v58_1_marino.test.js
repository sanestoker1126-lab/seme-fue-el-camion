// V58.1 · Mar trazado sobre el arte «Marino Parallax PRO V4»: único fondo marino, plataformas sobre lo dibujado.
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
  // Barca, manta y pez no están en el dibujo: se dibujan. Los hongos gigantes sí están: solo brillan al rebotar.
  const looks = main.filter((p) => p.look).map((p) => p.look).sort();
  assert.deepEqual(looks, ['bote', 'hongo', 'hongo', 'manta', 'pez']);
  assert.ok(main.filter((p) => p.look === 'hongo').every((p) => p.artPainted && p.kind === 'bounce'));
  // Relieve del mar: sólido y sin dibujar (roca grande, meseta de la casa-piña y sus puentes).
  const rocks = W.solids.filter((s) => s.kind === 'roca');
  assert.ok(rocks.length >= 10 && rocks.every((s) => s.draw === false), 'relieve sólido sin dibujar');
  assert.ok(W.zips.some((z) => z.look === 'cadena' && z.painted), 'la cadena pintada es tirolesa');
  assert.ok(W.zips.some((z) => z.look === 'cuerda' && !z.painted), 'cuerda del mirador');
});

test('mar abierto alineado con el dibujo: superficie en la espuma de la roca, fondo en el camino de la meseta', () => {
  const W = NS.World.buildWorld({ levels: [LV.SUBMARINO_LEVEL] });
  const k = C.world.sceneScale * LV.MARINE_ART.px, sea = W.waters.find((z) => z.sea);
  assert.ok(Math.abs(sea.y / k - 1155) < 1 && Math.abs(sea.y2 / k - 1690) < 1, 'superficie 1155 px, fondo 1690 px');
  assert.ok(sea.breach && sea.drains.length === 2, 'dos brechas en los puentes del fondo');
  const blocks = W.solids.filter((s) => s.kind === 'roca');
  for (const d of sea.drains) assert.ok(blocks.every((b) => b.x2 <= d.x1 + 0.5 || b.x1 >= d.x2 - 0.5 || b.y2 < sea.y2 - 60), 'ninguna roca tapa una brecha');
  assert.equal(W.foes.find((f) => f.isBoss).waterZone, sea, 'el tiburón patrulla el mar');
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
    assert.ok(r.includes(f.replace(dir, '')), 'el renderer no usa ' + f);
  }
  assert.match(r, /function drawDepthArt\(/);
  for (const old of ['panorama_marino', 'arrecife.webp', 'fauna.webp', 'parallax/submarino/', 'submarino_fondo.png']) {
    for (const [name, src] of [['render.js', r], ['sw.js', sw], ['main.js', main]]) assert.ok(!src.includes(old), `${name} aún usa ${old}`);
    assert.ok(!fs.existsSync(path.join(ROOT, 'assets/parallax/marino/' + old)), 'sigue en disco: ' + old);
  }
  assert.ok(!fs.existsSync(path.join(ROOT, 'assets/scenes/generated/submarino_fondo.png')));
});
