const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
// V55 integró cinco capas SVG por mundo para el mar y la órbita. V58.1 las retiró: por pedido del autor, cada mundo
// usa como ÚNICO fondo su arte pintado nuevo (mar «Marino PRO V4», Luna «Espacio Luna PRO V5"), con el nivel trazado
// encima. Estas pruebas verifican que el reemplazo es completo: sin archivos, referencias ni código muertos.
test('V55→V58.1: las capas SVG del mar y la órbita se retiraron por completo', () => {
  for (const d of ['assets/parallax/submarino', 'assets/parallax/espacial']) {
    const svgs = fs.existsSync(path.join(ROOT, d)) ? fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith('.svg')) : [];
    assert.deepEqual(svgs, [], d + ': sin SVG');
  }
  assert.ok(!fs.existsSync(path.join(ROOT, 'assets/parallax/manifest.json')), 'sin el manifiesto de capas V55');
});
test('V55→V58.1: renderer, precarga y service worker sin rastros de las capas V55', () => {
  const r = read('js/app/render.js'), sw = read('sw.js'), main = read('js/app/main.js');
  for (const dead of [/PARALLAX_LAYERS/, /PARALLAX_SPEED/, /function preparedParallax\(/, /drawRealParallax/, /parallax\/[^'"]*\.svg/]) {
    assert.doesNotMatch(r, dead, 'render.js: ' + dead);
  }
  assert.doesNotMatch(sw, /parallax\/[^'"]*\.svg/, 'sin capas SVG en la caché (las siluetas de la cinemática sí son SVG)');
  assert.doesNotMatch(main, /PARALLAX_LAYERS/);
  assert.match(sw, /camion-v55-parallax-real/, 'la caché de V55 sigue listada para invalidarse');
  assert.match(r, /const DEPTH_ART = \{/);
});
