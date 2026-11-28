const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

require(path.join(ROOT, 'js/core/toxifamilia.js'));
const manifest = globalThis.CAMION.TOXIFAMILIA;

test('Parafalls: transformación y llegada al checkpoint valida solo recursos existentes y poses de atlas activos', () => {
  const scenes = manifest.validate(manifest.PARAFALLS);
  // V58.8.30: escena puente al inicio (de la Luna al bosque de las cascadas, con Papito Estoker).
  assert.deepEqual(scenes.map((s) => s.id), ['pf_regreso', 'pf_luz', 'pf_portal', 'pf_guardianes', 'pf_llegada', 'pf_repisa']);
  const byId = (id) => scenes.find((s) => s.id === id);
  assert.ok(scenes.every((s) => s.tag.includes('ADAPTACIÓN') || s.tag.includes('MISIÓN PARAFALLS') || s.arrival === 4));
  const paths = manifest.assetsOf(scenes);
  assert.ok(paths.length >= 10);
  for (const asset of paths) assert.ok(fs.existsSync(path.join(ROOT, asset)), `recurso ausente: ${asset}`);
  const dialogue = scenes.flatMap((s) => s.lines || []).map((line) => line.text);
  assert.ok(dialogue.includes('¡Papá... mira eso! ¿Qué es esa luz?'));
  assert.ok(dialogue.includes('Parece un portal... ¡Vamos a ver!'));
  assert.ok(dialogue.includes('Al acercarse, una fuerza los absorbió de repente.'));
  assert.equal(new Set(byId('pf_portal').cast.find(a => a.name === 'SOFÍA').frames).size, 12);   // V58.8.28: transformación en 12 cuadros
  assert.equal(byId('pf_repisa').arrival, 4);
  assert.equal(scenes[scenes.length - 1].arrival, 4);
  // V58.8.30: la Sofía Roblox oficial es la de la hoja de transformación (decisión del autor): la llegada la usa.
  const sofia = byId('pf_llegada').cast.find((a) => a.name === 'SOFÍA');
  assert.equal(sofia.sprite, 'assets/cinematica/parafalls/sofia_roblox_12.webp');
  assert.ok(!manifest.assetsOf(scenes).some((u) => /sofia_0[0-2]_/.test(u)), 'sin cuadros del diseño anterior en la cinemática');
  assert.ok(byId('pf_llegada').cast.some((a) => a.name === 'LUNA'));
  assert.ok(byId('pf_llegada').cast.some((a) => a.name === 'MORITA'));
  // El puente: Sofía llega con el traje espacial de la Luna y Papito Estoker le trae la ropa con la que entra al portal.
  const puente = byId('pf_regreso');
  assert.equal(puente.cast.find((a) => a.name === 'SOFÍA').sprite, 'assets/player/astronauta/idle.webp');
  assert.ok(puente.lines.some((l) => l.who === 'PAPITO ESTOKER' && /ropa/.test(l.text)));
  assert.ok(scenes.reduce((sum, s) => sum + s.durationMs, 0) < 45000, 'adaptación breve y omisible');
});

test('Parafalls: primer inicio y replay usan progreso persistente y assets cacheados con nueva versión', () => {
  const main = read('js/app/main.js');
  assert.match(main, /mission === 4 && tramo === 0 && opt\.cinematics && !parafallsCineSeen\(\)/);
  assert.match(main, /PARAFALLS_CINE_KEY, '1'/);
  assert.match(main, /PARAFALLS_CINE_KEY\]\)/);
  const player = read('js/app/toxifamilia_cinematic.js');
  assert.match(player, /SETS\.parafalls = manifest\.validate\(manifest\.PARAFALLS \|\| \[\]\)/);
  assert.match(player, /btnParafalls/);
  const sw = read('sw.js');
  for (const asset of manifest.assetsOf(manifest.validate(manifest.PARAFALLS))) {
    assert.ok(sw.includes(asset), `Service Worker sin ${asset}`);
  }
  const html = read('Se_Me_Fue_El_Camion.html');
  for (const route of ['js/core/toxifamilia.js?v=58.8.38', 'js/app/main.js?v=58.8.32', 'js/app/toxifamilia_cinematic.js?v=58.8.30', 'css/toxifamilia.css?v=58.8.25']) {
    assert.ok(html.includes(route), `HTML no versiona ${route}`);
  }
});
