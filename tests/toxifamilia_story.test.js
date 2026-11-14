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

test('La Toxifamilia no finge que el PDF ya esta transcrito', () => {
  const manifest = loadManifest();
  assert.equal(manifest.SOURCE.adapted, false);
  assert.equal(manifest.SOURCE.status, 'pending_pdf_text');
  assert.equal(manifest.SCENES.length, 0);
  assert.equal(manifest.ready, false);
});

test('admite escenas validas sin alterar el orden original', () => {
  const manifest = loadManifest();
  const scenes = manifest.validate([
    { id: 'escena_01', tag: 'APERTURA', title: 'Escena de prueba', text: 'Texto de prueba',
      background: 'assets/scenes/generated/escuela_patio_tarde.png',
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
