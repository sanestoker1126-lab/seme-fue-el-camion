'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadManifest() {
  const source = fs.readFileSync(path.join(__dirname, '../js/core/toxifamilia.js'), 'utf8');
  const sandbox = {};
  vm.runInNewContext(source, sandbox, { filename: 'toxifamilia.js' });
  return sandbox.CAMION.TOXIFAMILIA;
}

test('ARCHIVO 01: el guion del chat está adaptado; el PDF sigue sin transcribir y no se le atribuye nada', () => {
  const manifest = loadManifest();
  assert.equal(manifest.SOURCE.adapted, true);
  assert.equal(manifest.SOURCE.status, 'adapted_from_chat_script');
  assert.equal(manifest.SOURCE.pdf.status, 'pending_pdf_text', 'el PDF no se ha leído');
  assert.equal(manifest.ready, true);
  const pro = manifest.validate(manifest.SCENES), epi = manifest.validate(manifest.EPILOGUE);
  assert.ok(pro.length >= 3 && epi.length >= 2);
  // Diálogos clave del guion, tal cual.
  const all = [...pro, ...epi].map((s) => s.text).join('\n');
  for (const frase of ['Los custodios tienen orden de tirar a matar.', 'Pero se le fue la Ruta 6.', 'Seis memorias USB. Seis llaves encriptadas.',
    'Justo a tiempo, niña tóxica.', 'Se abrieron las jaulas. Ahora nos toca a nosotros.']) assert.ok(all.includes(frase), frase);
  assert.ok(pro.some((s) => /INSERT COIN \/ PRESS START/.test(s.text)), 'PRESS START');
  const nm = pro[pro.length - 1].nextMission;   // (objeto de otro contexto vm: se comparan los campos)
  assert.ok(nm && nm.mission === 0 && nm.tramo === 0, 'el prólogo termina empezando la misión 1');
  assert.equal(epi[epi.length - 1].title, 'LEGEND OF PRESOS');
  // Todos los recursos que usa existen en el repositorio.
  const fs = require('node:fs');
  for (const s of [...pro, ...epi]) for (const p of [...s.backgrounds, ...s.cast.map((a) => a.sprite).filter(Boolean)]) assert.ok(fs.existsSync(path.join(__dirname, '..', p)), 'falta ' + p);
});

test('admite escenas validas sin alterar el orden original', () => {
  const manifest = loadManifest();
  const scenes = manifest.validate([
    { id: 'escena_01', tag: 'APERTURA', title: 'Escena de prueba', text: 'Texto de prueba',
      background: 'assets/scenes/school_miguel_hidalgo/02_patio_escolar.webp',
      cast: [{ name: 'Actor de prueba', sprite: 'assets/player/sofia/run_01.png', x: 35, bottom: 20 }],
      durationMs: 4000 },
    { id: 'escena_02', title: 'Desenlace', text: 'Texto de prueba', nextMission: { mission: 0, tramo: 0 } }
  ]);
  assert.equal(scenes.length, 2);
  assert.equal(scenes[0].durationMs, 4000);
  assert.equal(scenes[1].durationMs, 6500);
  assert.equal(scenes[1].nextMission.tramo, 0);
});

test('rechaza IDs duplicados, rutas externas, travesias y duracion imposible', () => {
  const manifest = loadManifest();
  const scene = { id: 'a', title: 'Prueba', text: 'Guion' };
  assert.throws(() => manifest.validate([scene, scene]), /id repetido/i);
  assert.throws(() => manifest.validate([{ ...scene, background: 'https://otro-sitio/imagen.png' }]), /fondo invalido/i);
  assert.throws(() => manifest.validate([{ ...scene, background: 'assets/../privado.png' }]), /fondo invalido/i);
  assert.throws(() => manifest.validate([{ ...scene, durationMs: -50 }]), /duracion invalida/i);
  assert.throws(() => manifest.validate([{ ...scene, cast: [{ name: 'Actor', sprite: '../otro.png' }] }]), /sprite invalido/i);
});
