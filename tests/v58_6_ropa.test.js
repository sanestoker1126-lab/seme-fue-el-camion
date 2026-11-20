// V58.6 · Cada vestuario solo en su mundo: uniforme en la escuela, buzo solo dentro del agua del mar, astronauta en la
// Luna y ropa de calle (ORIGINAL o ROSA, opción) en Guadalajara y en la isla del mar. El menú ya no elige el traje.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { load } = require('./helpers');
const NS = load();
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
if (!globalThis.Image) globalThis.Image = class { constructor() { this.complete = false; } };
require(path.join(ROOT, 'js/core/toxifamilia.js'));
require(path.join(ROOT, 'js/app/art_data.js'));
require(path.join(ROOT, 'js/app/render.js'));
const R = NS.Render;

test('el vestuario lo decide el mundo: escuela uniforme, Luna astronauta, calle e isla con ropa de calle', () => {
  for (const look of ['original', 'rosa']) {
    R.setOptions({ ninaLook: look });
    assert.equal(R.outfitFor('escuela'), 'uniforme', 'escuela con ' + look);
    assert.equal(R.outfitFor('espacial'), 'astronauta', 'Luna con ' + look);
    for (const t of ['guadalajara', 'metro', 'submarino']) assert.equal(R.outfitFor(t), look, t + ' con ' + look);
  }
  // Valores guardados por versiones anteriores (uniforme, buzo, astronauta) ya no se usan fuera de su mundo.
  for (const old of ['uniforme', 'buzo', 'astronauta', undefined]) {
    R.setOptions({ ninaLook: old });
    assert.equal(R.outfitFor('guadalajara'), 'original', 'valor viejo ' + old);
  }
  R.setOptions({ ninaLook: 'original' });
});

test('cada nivel de cada misión usa el traje de su mundo', () => {
  const want = { escuela: 'uniforme', guadalajara: 'original', submarino: 'original', espacial: 'astronauta' };
  for (const M of NS.LEVELS.MISSIONS) {
    const W = NS.World.buildWorld({ levels: M.levels });
    for (const sc of W.scenes) {
      const t = sc.bg === 'metro' ? 'metro' : sc.theme;
      assert.equal(R.outfitFor(t), want[M.id], M.id + ' · ' + sc.id);
    }
  }
});

test('hay cuadros de uniforme y de ropa rosa para cada pose que usa Sofía', () => {
  const names = new Set(Object.values(R.NINA).flat());
  for (const look of ['uniforme', 'rosa']) {
    for (const f of names) assert.ok(fs.existsSync(path.join(ROOT, R.NINA_VARIANT_DIR[look] + f + '.png')), 'falta ' + look + '/' + f);
  }
});

test('el buzo solo dentro del agua: en tierra del mar, ropa de calle; el menú ya no elige traje', () => {
  const r = read('js/app/render.js'), m = read('js/app/main.js'), html = read('Se_Me_Fue_El_Camion.html');
  const body = r.slice(r.indexOf('function drawPlayer('), r.indexOf('function drawCinematic('));
  assert.ok(body.indexOf('drawDiveWater(G, alpha)') < body.indexOf('const outfit = outfitFor(suitTheme);'), 'primero el agua');
  assert.ok(!/drawDiver\(/.test(r), 'ya no hay traje de buzo en tierra');
  assert.match(m, /ninaLook: \['original', 'rosa'\]/);
  assert.ok(!/lookPicker/.test(html), 'sin selector de aspecto en el menú');
  assert.match(html, /data-opt="ninaLook"/, 'la ropa de calle se cambia en Opciones');
  // El prólogo, en la escuela, también la muestra de uniforme.
  const pro = NS.TOXIFAMILIA.SCENES;
  const school = pro.find((s) => /school_miguel_hidalgo/.test(String(s.background)));
  assert.ok(school.cast.some((a) => /variants\/uniforme\//.test(a.sprite || '')), 'prólogo: Sofía de uniforme en la escuela');
});
