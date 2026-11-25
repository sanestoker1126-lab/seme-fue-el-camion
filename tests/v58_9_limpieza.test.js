// V58.9 · Limpieza: menos cristales y enemigos, sin rótulos encimados, repisas visibles donde el dibujo no las tiene y
// fondos sin copias en espejo.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load } = require('./helpers');
const NS = load();
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const LV = NS.LEVELS;

test('cristales del recorrido: ninguno a menos de 200 u de otro (antes había filas de 100 a 270 por nivel)', () => {
  for (const M of LV.MISSIONS) {
    const W = NS.World.buildWorld({ levels: M.levels, difficulty: 'normal' });
    const g = W.pickups.filter((p) => p.type === 'gem' && p.region === 'main');
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      assert.ok(Math.hypot(g[i].x - g[j].x, g[i].y - g[j].y) >= 200, M.id + ': cristales encimados ' + g[i].id + ' / ' + g[j].id);
    }
    for (const sc of W.scenes) {
      const n = g.filter((p) => p.scene === sc.index).length;
      assert.ok(n >= 10 && n <= 100, sc.id + ': ' + n + ' cristales');
    }
  }
});

test('enemigos: sin los multiplicadores de V58, ningún nivel de la ciudad pasa de 18', () => {
  const W = NS.World.buildWorld({ levels: LV.MISSIONS[1].levels, difficulty: 'normal' });
  for (const sc of W.scenes) {
    const n = W.foes.filter((f) => f.scene === sc.index && f.region === 'main').length;
    assert.ok(n <= 18, sc.id + ': ' + n + ' enemigos');
  }
});

test('sin texto encimado sobre el dibujo y fondos sin espejo; Guadalajara dibuja sus repisas', () => {
  const src = read('js/app/render.js');
  assert.ok(!src.includes('text(c.name'), 'sin el nombre bajo cada gata');
  assert.ok(!src.includes("text('¡CUIDADO!'"), 'sin el rótulo ¡CUIDADO! (queda el signo de aviso)');
  assert.ok(!/j % 2 === 1, clip/.test(src), 'el fondo de banda ya no se repite en espejo (letreros al revés)');
  assert.match(src, /sc\.def\.ledgeSkin/);
  assert.equal(LV.LEVEL_SEQUENCE.find((d) => d.id === 'guadalajara').ledgeSkin, true);
});
