// V58.8.35 · Rendimiento: las capas de ambiente difusas usan suavizado ligero (bilineal) y las nítidas conservan el alto.
// Medido en el bucle real del juego: cascadas medias 39–42 → 56–57 cuadros/s; plataforma final 31–43 → 59.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'app', 'render.js'), 'utf8');

test('capas difusas marcadas como suaves (cascadas y canal) y no las nítidas (Luna)', () => {
  for (const layer of ['depth/atmosphere_0${page}.webp', 'depth/foreground_0${page}.webp', 'layers/05_plancton_flotante.png', 'layers/06_burbujas_ligeras.png']) {
    const line = src.split('\n').find((l) => l.includes(layer));
    assert.ok(line, 'falta la capa ' + layer);
    assert.match(line, /soft: true/, layer + ' debe ser suave');
  }
  for (const layer of ['layers/01_estrellas_lejanas.png', 'layers/07_luz_cristales.png']) {
    const line = src.split('\n').find((l) => l.includes(layer));
    assert.ok(line && !/soft: true/.test(line), layer + ' debe conservar el suavizado alto');
  }
  assert.match(src, /tile: g\.tile \|\| 0, soft: !!g\.soft \}/, 'el grupo cacheado conserva la marca soft');
});

test('el suavizado ligero solo se aplica con condición y se restaura', () => {
  const lows = src.match(/imageSmoothingQuality = 'low'/g) || [];
  assert.strictEqual(lows.length, 3, 'tres usos: mosaicos suaves, planos suaves y fondos a escala ≥ 0,8');
  assert.match(src, /if \(g\.soft\) ctx\.imageSmoothingQuality = 'low';\s+\/\/ V58\.8\.35: plancton/);
  assert.match(src, /if \(g\.soft\) ctx\.imageSmoothingQuality = 'low';\s+\/\/ V58\.8\.35: ver SOFT_FX\s+ctx\.drawImage\(g\.canvas[^\n]+\n\s+ctx\.imageSmoothingQuality = q0;/);
  assert.match(src, /\* 1\.08 >= 0\.8\) ctx\.imageSmoothingQuality = 'low';\s+drawBandTiles\([^)]*\);\s+ctx\.imageSmoothingQuality = q0;/);
});
