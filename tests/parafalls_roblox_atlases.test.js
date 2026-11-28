const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
function pngSize(file) {
  const b = fs.readFileSync(path.join(ROOT, file));
  assert.equal(b.toString('hex', 0, 8), '89504e470d0a1a0a', `${file} tiene firma PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('Parafalls Roblox: atlas fuente completos, referencias dentro de hoja y metadata íntegra', () => {
  const sofia = JSON.parse(read('assets/player/sofia_roblox/sofia_atlas.json'));
  assert.equal(sofia.meta.frameCount, 30);
  assert.deepEqual(pngSize('assets/player/sofia_roblox/sofia_atlas.png'), [sofia.meta.size.w, sofia.meta.size.h]);
  assert.equal(Object.keys(sofia.frames).length, 30);
  for (const [name, frame] of Object.entries(sofia.frames)) {
    const r = frame.frame;
    assert.ok(r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0, `rectángulo Sofía ${name}`);
    assert.ok(r.x + r.w <= sofia.meta.size.w && r.y + r.h <= sofia.meta.size.h, `Sofía ${name} dentro del atlas`);
  }
  // V58.8.33: atlas de la Sofía cúbica oficial (diseño de la hoja de transformación): ciclos completos, ancla en los pies.
  assert.equal(sofia.schema, 'seme-fue-el-camion/sofia-roblox-parafalls-atlas/v2');
  assert.equal(sofia.animations.run.completeness, 'full_cycle');
  assert.equal(sofia.animations.run.frames.length, 6);
  assert.equal(sofia.animations.walk.completeness, 'full_cycle');
  assert.deepEqual(sofia.meta.pivotPixels, { x: 128, y: 240 });
  // Cada estado que pide el juego (render.js: PARAFALLS_ROBLOX_PLAYER_STATE) tiene su animación y cuadros existentes.
  for (const st of ['idle', 'run', 'jump', 'fall', 'land', 'climb', 'glide', 'attack', 'hurt', 'knockdown', 'victory']) {
    const an = sofia.animations[st];
    assert.ok(an && an.frames.length && an.frames.every((f) => sofia.frames[f]), 'animación ' + st);
    assert.equal(an.durationsMs.length, an.frames.length, 'duraciones de ' + st);
  }
  const data = read('assets/player/sofia_roblox/sofia_atlas_data.js');
  assert.ok(data.startsWith('window.SOFIA_ROBLOX_ATLAS={"schema":"seme-fue-el-camion/sofia-roblox-parafalls-atlas/v2"'), 'datos del juego = JSON del atlas');
  assert.match(read('assets/player/sofia_roblox/sofia_parafalls_adapter.js'), /durationsMs/);

  for (const id of ['luna', 'morita']) {
    const dir = `assets/companions/roblox_parafalls/${id}`;
    const meta = JSON.parse(read(`${dir}/atlas.json`));
    assert.equal(meta.frameCount, 44, `${id}: conteo de fuente`);
    assert.deepEqual(pngSize(`${dir}/atlas.png`), [meta.atlas.width, meta.atlas.height]);
    assert.equal(meta.animation.idle.frames.length, 6);
    assert.equal(meta.animation.walk.frames.length, 4);
    for (const clip of ['idle', 'walk']) for (const frameName of meta.animation[clip].frames) {
      const r = meta.frames[frameName].frame;
      assert.ok(r.x + r.w <= meta.atlas.width && r.y + r.h <= meta.atlas.height, `${id}/${frameName} dentro del atlas`);
    }
  }
});

test('Parafalls Roblox: scripts y recursos se cargan solo en la ruta de misión elegida', () => {
  const html = read('Se_Me_Fue_El_Camion.html');
  const ordered = [
    'assets/player/sofia_roblox/sofia_atlas_data.js',
    'assets/player/sofia_roblox/sofia_parafalls_adapter.js',
    'js/app/parafalls_roblox_atlases.js',
    'js/app/render.js'
  ].map((src) => html.indexOf(src));
  assert.ok(ordered.every((n) => n >= 0));
  assert.deepEqual(ordered, [...ordered].sort((a, b) => a - b), 'metadata y adaptador antes del renderer');

  const render = read('js/app/render.js');
  assert.match(render, /G\.missionId === 'parafalls' && !astro/);
  assert.match(render, /G\.missionId === 'parafalls' && !!root\.PARAFALLS_ROBLOX_COMPANIONS/);
  assert.match(render, /PARAFALLS_ROBLOX_PLAYER_STATE/);
  const main = read('js/app/main.js');
  assert.match(main, /R\.preload\(R\.entryArt\(G\)\)/);
  assert.match(render, /G\.missionId === 'parafalls' \? PARAFALLS_ROBLOX_URLS/);

  const sw = read('sw.js');
  for (const asset of [
    'assets/player/sofia_roblox/sofia_atlas_data.js',
    'assets/player/sofia_roblox/sofia_parafalls_adapter.js',
    'js/app/parafalls_roblox_atlases.js',
    'assets/player/sofia_roblox/sofia_atlas.png',
    'assets/companions/roblox_parafalls/luna/atlas.png',
    'assets/companions/roblox_parafalls/morita/atlas.png'
  ]) assert.ok(sw.includes(asset), `Service Worker registra ${asset}`);
});
