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
  assert.deepEqual(scenes.map((s) => s.id), ['pf_luz', 'pf_portal', 'pf_guardianes', 'pf_llegada', 'pf_repisa']);
  assert.ok(scenes.every((s) => s.tag.includes('ADAPTACIÓN') || s.tag.includes('MISIÓN PARAFALLS') || s.arrival === 4));
  const paths = manifest.assetsOf(scenes);
  assert.ok(paths.length >= 10);
  for (const asset of paths) assert.ok(fs.existsSync(path.join(ROOT, asset)), `recurso ausente: ${asset}`);
  const dialogue = scenes.flatMap((s) => s.lines || []).map((line) => line.text);
  assert.ok(dialogue.includes('¡Papá... mira eso! ¿Qué es esa luz?'));
  assert.ok(dialogue.includes('Parece un portal... ¡Vamos a ver!'));
  assert.ok(dialogue.includes('Al acercarse, una fuerza los absorbió de repente.'));
  assert.equal(new Set(scenes[1].cast.find(a => a.name === 'SOFÍA').frames).size, 6);
  assert.equal(scenes[4].arrival,4);
  const sofia = scenes[3].cast.find((a) => a.name === 'SOFÍA');
  assert.equal(sofia.fitWidth, true);
  assert.equal(sofia.frames.length, 3, 'tres cuadros auténticos distintos de Sofía');
  assert.ok(scenes[3].cast.some((a) => a.name === 'LUNA'));
  assert.ok(scenes[3].cast.some((a) => a.name === 'MORITA'));
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
  for (const route of ['js/core/toxifamilia.js?v=58.8.26', 'js/app/main.js?v=58.8.25', 'js/app/toxifamilia_cinematic.js?v=58.8.25', 'css/toxifamilia.css?v=58.8.25']) {
    assert.ok(html.includes(route), `HTML no versiona ${route}`);
  }
});
