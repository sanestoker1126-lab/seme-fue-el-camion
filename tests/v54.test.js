// V54: los mundos ampliados conservan acceso y recursos temáticos.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./helpers');
const NS = load();
const BASE = path.join(__dirname, '..');

test('V54: cada mundo triplica su recorrido vertical y ensancha el mapa sin duplicar inicio/meta', () => {
  for (const m of [NS.LEVELS.SUBMARINO_MAP, NS.LEVELS.ESPACIAL_MAP]) {
    assert.equal(m.width, 940);
    assert.equal(m.height, 3072);
    assert.equal(m.surfaces.filter(p => p.start).length, 1);
    assert.equal(m.surfaces.filter(p => p.exit).length, 1);
    assert.equal(m.gems.length, 39);
    assert.ok(m.surfaces.every(p => p.x1 >= 0 && p.x2 <= m.width && p.y >= 0 && p.y <= m.height));
    assert.ok(m.gems.every(g => g.x >= 0 && g.x <= m.width && g.y >= 0 && g.y <= m.height));
  }
});
test('V54: el fondo cubre toda la anchura; parallax con tres desplazamientos y salida temática', () => {
  const r = fs.readFileSync(path.join(BASE, 'js/app/render.js'), 'utf8');
  assert.match(r, /function drawMissionParallax\(/);
  assert.match(r, /const B = G\.world\.bounds/);
  assert.match(r, /sc\.drawH/);
  assert.match(r, /G\.cam\.y - sc\.startY/);
  assert.match(r, /0\.34/);
  assert.match(r, /ESCOTILLA DE RESCATE/);
  assert.match(r, /MÓDULO DE REGRESO/);
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
