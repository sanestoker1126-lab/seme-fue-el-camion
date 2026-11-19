// V54: los mundos ampliados conservan acceso y recursos temáticos.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./helpers');
const NS = load();
const BASE = path.join(__dirname, '..');

test('V54→V58: cada mundo especial mide el doble de ancho y de alto que en V54, sin duplicar inicio/meta', () => {
  // V54 los triplicó (940 × 3072); V58 parte de esa versión, la refleja a lo ancho y le agrega la mitad nueva debajo.
  for (const [m, old] of [[NS.LEVELS.SUBMARINO_MAP, NS.LEVELS.SUBMARINO_V54_MAP], [NS.LEVELS.ESPACIAL_MAP, NS.LEVELS.ESPACIAL_V54_MAP]]) {
    assert.equal(old.width, 940); assert.equal(old.height, 3072);
    assert.ok(m.width >= old.width * 2, m.id + ' ancho ' + m.width);   // V58.1: el mar, trazado sobre el arte V4, mide 2039
    assert.ok(m.height >= old.height * 2, m.id + ' alto ' + m.height);
    assert.equal(m.surfaces.filter(p => p.start).length, 1);
    assert.equal(m.surfaces.filter(p => p.exit).length, 1);
    assert.ok(m.gems.length >= old.gems.length * 4, m.id + ' cristales ' + m.gems.length);
    assert.ok(m.surfaces.every(p => p.x1 >= 0 && p.x2 <= m.width && p.y >= 0 && p.y <= m.height));
    assert.ok(m.gems.every(g => g.x >= 0 && g.x <= m.width && g.y >= 0 && g.y <= m.height));
  }
});
// V58.1: el panorama/parallax de V54 se reemplazó por mundos pintados de una pieza (mar V4, Luna V5): la lámina queda
// fija al mundo (el nivel está trazado sobre ella), cubre todo el ancho jugable y sus capas de ambiente tienen paralaje.
test('V54→V58.1: el fondo de mar y Luna cubre el mundo entero, con paralaje en el ambiente y salida temática', () => {
  const r = fs.readFileSync(path.join(BASE, 'js/app/render.js'), 'utf8');
  assert.match(r, /function drawDepthArt\(/);
  assert.match(r, /const cfg = depthCfg\(sc\), A = sc\.map\.worldArt, k = sc\.scale \* A\.px;/);
  assert.match(r, /dx = sc\.x0 - \(A\.x0 \|\| 0\) \* k, dw = A\.width \* k/);
  assert.match(r, /G\.cam\.y - sc\.startY/);
  assert.doesNotMatch(r, /function drawMissionParallax\(|function drawRealParallax\(|function drawSpecialScreen\(/);
  assert.match(r, /ESCOTILLA DE RESCATE/);
  assert.match(r, /MÓDULO DE REGRESO/);
  for (const lvl of [NS.LEVELS.SUBMARINO_LEVEL, NS.LEVELS.ESPACIAL_LEVEL]) {
    const W = NS.World.buildWorld({ levels: [lvl] }), sc = W.scenes[0], A = sc.map.worldArt, k = sc.scale * A.px;
    const artX1 = sc.x0 - (A.x0 || 0) * k, artX2 = artX1 + A.width * k;
    assert.ok(artX1 <= W.bounds.x1 + 0.5 && artX2 >= W.bounds.x2 - 0.5, lvl.id + ': la lámina cubre todo el ancho');
    assert.ok(Math.abs(A.height * k - sc.drawH) < 2, lvl.id + ': y todo el alto');
  }
});
test('V54: traje submarino real, capa espacial y selección de apariencias al empezar', () => {
  const r = fs.readFileSync(path.join(BASE, 'js/app/render.js'), 'utf8');
  const html = fs.readFileSync(path.join(BASE, 'Se_Me_Fue_El_Camion.html'), 'utf8');
  const ui = fs.readFileSync(path.join(BASE, 'js/app/ui.js'), 'utf8');
  const sw = fs.readFileSync(path.join(BASE, 'sw.js'), 'utf8');
  assert.match(r, /function drawDiver\(/);
  assert.match(r, /function drawAstronautGear\(/);
  assert.match(ui, /cb\.look\(key\)/);
  assert.match(ui, /\['buzo', 'BUZO'\]/);
  assert.match(ui, /\['astronauta', 'ASTRONAUTA'\]/);
  assert.match(html, /id="lookPicker"/);
  assert.match(sw, /sofia_submarina_complementaria\.png/);
  assert.ok(fs.existsSync(path.join(BASE, 'assets/player/sofia/sofia_submarina_complementaria.png')));
});
