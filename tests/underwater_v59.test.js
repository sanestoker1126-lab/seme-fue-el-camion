// Regresiones del rediseño marino: regreso a 3 escenarios (isla, bosque y fosa) y encuentro con Poseidón.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const NS = require('./helpers').load();

const ROOT = path.join(__dirname, '..');
const marineMission = NS.LEVELS.MISSIONS.find((mission) => mission.id === 'submarino');

function builtMarine() {
  assert.ok(marineMission, 'existe la misión submarina');
  return NS.World.buildWorld({ levels: marineMission.levels, seed: 7231 });
}

test('Misión submarina: vuelve a tener 3 escenarios definidos', () => {
  assert.ok(marineMission, 'existe la misión submarina');
  assert.equal(marineMission.levels.length, 3, 'la misión tiene isla, bosque y fosa');
  assert.deepEqual(marineMission.levels.map((level) => level.label), ['ISLA DEL CANAL', 'BOSQUE DE ALGAS', 'FOSA AZUL']);
  assert.deepEqual(marineMission.levels.map((level) => path.basename(level.file)), ['canal_inundado_redisenio.webp', 'bosque_algas.webp', 'fosa_azul.webp']);
});

test('Mapas marinos: primer tramo con isla y último tramo con salida profunda', () => {
  const [isla, bosque, fosa] = marineMission.levels.map((level) => level.map);
  assert.ok(isla.shore, 'el primer tramo vuelve a dibujar la isla superior');
  assert.equal(isla.worldArt.pages[0], 'canal_inundado_redisenio.webp');
  assert.equal(bosque.worldArt.pages[0], 'bosque_algas.webp');
  assert.equal(fosa.worldArt.pages[0], 'fosa_azul.webp');
  assert.ok(isla.surfaces.some((s) => s.start), 'la isla conserva un punto de inicio');
  assert.ok(fosa.surfaces.some((s) => s.exit), 'la fosa conserva la salida al final');
  assert.ok(fosa.water[0].toStreet, 'el agua profunda del último tramo llega al fondo/salida');
});

test('Runtime marino: se generan tres escenas, la isla aparece arriba y Poseidón queda en la fosa', () => {
  const world = builtMarine();
  assert.equal(world.scenes.length, 3, 'el mundo submarino se divide en 3 escenas');
  assert.ok(world.shore, 'el mundo dibuja la isla de llegada');
  const boss = world.foes.find((foe) => foe.kind === 'poseidon' && foe.isBoss);
  assert.ok(boss, 'Poseidón se genera como jefe final');
  assert.equal(boss.scene, 2, 'Poseidón aparece en la tercera escena (fosa)');
  const finalScene = world.scenes[2];
  const exit = finalScene.surfaces.find((surface) => surface.exit);
  assert.ok(exit, 'la escena final conserva una plataforma de salida');
  assert.ok(boss.y < exit.y, 'el jefe aparece antes de la salida');
});

test('UI: el HUD y la cinemática del jefe reflejan isla, bosque, fosa y a Poseidón', () => {
  const ui = fs.readFileSync(path.join(ROOT, 'js/app/ui.js'), 'utf8');
  for (const tag of ['ISLA DEL CANAL', 'BOSQUE DE ALGAS', 'FOSA AZUL', 'POSEIDÓN, REY DEL MAR']) {
    assert.ok(ui.includes(tag), `la UI contiene ${tag}`);
  }
  assert.ok(ui.includes('assets/cinematica/marino/fondo_santuario.webp'), 'la cinemática del jefe usa el fondo marino');
  const main = fs.readFileSync(path.join(ROOT, 'js/app/main.js'), 'utf8');
  assert.match(main, /e\.foe\.kind === 'poseidon'/, 'main.js permite la cinemática de Poseidón');
});

