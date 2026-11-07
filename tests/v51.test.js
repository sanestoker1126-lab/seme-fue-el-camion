// Pruebas V51: un trazado propio para cada nivel, tablones atravesables, integridad de todos los mapas
// y precarga sin conexión completa (cada fondo, textura y frame que usa el juego está en el service worker).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load, miniWorld, input, run } = require('./helpers');
const NS = load();
require(path.join(__dirname, '..', 'js', 'app', 'art_data.js'));
const ROOT = path.join(__dirname, '..');
const LV = NS.LEVELS, SEQ = LV.LEVEL_SEQUENCE;
const MAPS = Object.entries(LV).filter(([, m]) => m && Array.isArray(m.surfaces));

test('cada uno de los 16 niveles tiene su propio trazado (antes 10 repetían 2 mapas)', () => {
  const ids = SEQ.map((d) => d.map.id);
  assert.equal(SEQ.length, 16);
  assert.equal(new Set(ids).size, SEQ.length, 'trazados repetidos: ' + ids.join(','));
  // Los dos niveles con arte pintado conservan el trazado sobre el que se pintó su fondo.
  for (const d of SEQ.filter((q) => q.art === 'painted')) assert.ok(d.map === LV.SCHOOL_MAP || d.map === LV.GDL_MAP, d.id);
});

test('integridad de todos los mapas: una parada, una salida amplia, todo dentro del mapa', () => {
  const FEATURES = ['surfaces', 'stairs', 'movers', 'pigeons', 'bouncers', 'crumbles', 'belts', 'planks'];
  for (const [name, m] of MAPS) {
    const st = m.surfaces.filter((s) => s.start), ex = m.surfaces.filter((s) => s.exit);
    assert.equal(st.length, 1, name + ': una parada');
    assert.equal(ex.length, 1, name + ': una salida');
    assert.ok(st[0].startX >= st[0].x1 && st[0].startX <= st[0].x2, name + ': startX sobre la parada');
    assert.ok(m.exitX >= ex[0].x1 + 20 && m.exitX <= ex[0].x2 - 20, name + ': exitX dentro de la salida');
    for (const f of FEATURES) {
      for (const q of m[f] || []) {
        const ok = q.x1 < q.x2 && q.x1 >= -1 && q.x2 <= m.width + 1 && q.y >= 0 && q.y <= m.height;
        assert.ok(ok, `${name}.${f} fuera del mapa: ${JSON.stringify(q)}`);
      }
    }
    for (const g of m.gems) assert.ok(g.x >= 0 && g.x <= m.width && g.y >= 0 && g.y <= m.height, `${name}: cristal fuera ${JSON.stringify(g)}`);
  }
  // Los niveles con trazado dibujado por el juego reparten al menos 10 cristales en su recorrido.
  for (const d of SEQ.filter((q) => q.art !== 'painted')) assert.ok(d.map.gems.length >= 10, `${d.id}: ${d.map.gems.length} cristales`);
});

test('tablones: se pisan desde arriba, se cruzan saltando desde abajo y BAJAR los atraviesa', () => {
  const W0 = NS.World.buildWorld({ levels: [SEQ.find((d) => d.map === LV.PATIO_MAP)] });
  const built = W0.platforms.find((p) => p.plank);
  assert.ok(built && built.kind === 'thin' && built.drop && built.draw, 'el tablón del mapa es una plataforma delgada atravesable y visible');
  const W = miniWorld({ platforms: [{ x1: -60, x2: 60, y: 0, kind: 'thin', drop: true, h: 9, plank: true }, { x1: -300, x2: 300, y: 120 }] });
  const plank = W.platforms[0], floor = W.platforms[1];
  // 1) Saltando desde el piso de abajo lo atraviesa y aterriza encima.
  let P = NS.Physics.createPlayer(0, 120); P.ground = floor;
  run(NS, P, W, 1, input({ jumpPressed: true, jumpHeld: true }));
  run(NS, P, W, 70, input({ jumpHeld: true }));
  assert.equal(P.ground, plank, 'aterriza sobre el tablón después de cruzarlo desde abajo');
  // 2) BAJAR lo deja caer al piso de abajo.
  run(NS, P, W, 1, input({ downPressed: true }));
  run(NS, P, W, 60, input());
  assert.equal(P.ground, floor, 'BAJAR atraviesa el tablón');
});

test('mirror() refleja también los tablones', () => {
  const m = { id: 'x', width: 500, height: 400, surfaces: [{ x1: 0, x2: 100, y: 50, start: true, startX: 50 }, { x1: 0, x2: 500, y: 390, exit: true }],
    planks: [{ x1: 120, x2: 200, y: 200 }], gems: [], exitX: 250 };
  const r = LV.mirror(m, 'x_m');
  assert.deepEqual(r.planks, [{ x1: 300, x2: 380, y: 200 }]);
});

/* ---------- Precarga sin conexión ---------- */
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const swList = (name) => {
  const m = sw.match(new RegExp('const ' + name + '=(\\[[^\\]]*\\])'));
  assert.ok(m, 'lista ' + name + ' en sw.js');
  return JSON.parse(m[1].replace(/'/g, '"'));
};

test('el service worker precarga todos los fondos, texturas y frames que usa el juego (y existen)', () => {
  const SCENES = swList('SCENES'), ART = swList('ART');
  for (const d of SEQ) if (d.file) assert.ok(SCENES.includes(d.file), 'fondo sin precargar: ' + d.file);
  for (const k of Object.keys(NS.ART.SKINS)) assert.ok(ART.includes('assets/platforms/' + k + '.png'), 'textura sin precargar: ' + k);
  for (const f of Object.keys(NS.ART.SOFIA)) assert.ok(ART.includes('assets/player/sofia/' + f + '.png'), 'frame de Sofía sin precargar: ' + f);
  for (const [kind, e] of Object.entries(NS.ART.ENEMY)) {
    for (const f of Object.keys(e.frames)) assert.ok(ART.includes(`assets/enemies/v50/${kind}/${f}.png`), `frame sin precargar: ${kind}/${f}`);
  }
  for (const f of [...SCENES, ...ART]) assert.ok(fs.existsSync(path.join(ROOT, f)), 'no existe: ' + f);
});

test('las texturas declaradas coinciden con el tamaño real de sus PNG', () => {
  for (const [k, [w, h, top]] of Object.entries(NS.ART.SKINS)) {
    const buf = fs.readFileSync(path.join(ROOT, 'assets', 'platforms', k + '.png'));
    assert.equal(buf.toString('ascii', 12, 16), 'IHDR', k);
    assert.deepEqual([buf.readUInt32BE(16), buf.readUInt32BE(20)], [w, h], 'tamaño de ' + k);
    assert.ok(top >= 0 && top < h, 'fila pisable de ' + k);
  }
});

test('versión coherente: el HTML, el service worker y la configuración usan la misma versión', () => {
  const html = fs.readFileSync(path.join(ROOT, 'Se_Me_Fue_El_Camion.html'), 'utf8');
  const CODE = swList('CODE');
  const v = NS.CONFIG.version.split('.').slice(0, 2).join('.');
  const tags = [...html.matchAll(/(?:src|href)="((?:js|css)\/[^"?]+)\?v=([\d.]+)"/g)];
  assert.ok(tags.length >= 16, 'scripts y estilos versionados en el HTML');
  for (const [, file, ver] of tags) {
    assert.equal(ver, v, 'versión de ' + file);
    assert.ok(CODE.includes(file + '?v=' + ver), 'el service worker precarga ' + file);
  }
  assert.equal(CODE.length, tags.length, 'mismos archivos en el HTML y en el service worker');
  assert.ok(sw.includes("const CACHE='camion-v" + v.split('.')[0]), 'nombre de caché de la versión');
});
