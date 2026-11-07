// Pruebas V53: misiones (separar por mundos), niveles nuevos (submarino y espacial) jugables y verificados con la
// física real, agua del submarino, variantes de personajes (gatitas) y precarga sin conexión de lo nuevo.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load } = require('./helpers');
const { analyze } = require('./reach');
const NS = load();
const ROOT = path.join(__dirname, '..');
const LV = NS.LEVELS, C = NS.CONFIG;

test('misiones: 4 mundos; las 1 y 2 reúnen los 16 niveles por tema, las 3 y 4 son nuevas', () => {
  const M = LV.MISSIONS;
  assert.equal(M.length, 4);
  assert.deepEqual(M.map((m) => m.id), ['escuela', 'guadalajara', 'submarino', 'espacial']);
  // Las misiones 1 y 2 reutilizan los MISMOS defs de LEVEL_SEQUENCE (sin duplicar), repartidos por tema.
  const e = M[0].levels, g = M[1].levels;
  assert.ok(e.every((d) => d.theme === 'escuela' && LV.LEVEL_SEQUENCE.includes(d)));
  assert.ok(g.every((d) => d.theme === 'guadalajara' && LV.LEVEL_SEQUENCE.includes(d)));
  assert.equal(e.length + g.length, LV.LEVEL_SEQUENCE.length, 'entre las dos primeras están los 16');
  assert.equal(M[2].levels.length, 1);
  assert.equal(M[3].levels.length, 1);
  assert.equal(M[2].levels[0], LV.SUBMARINO_LEVEL);
  assert.equal(M[3].levels[0], LV.ESPACIAL_LEVEL);
  assert.ok(M[3].levels[0].final, 'la última misión tiene jefe final');
});

test('storyIndex: cada uno de los 16 tramos lleva su posición canónica (historia por nivel, no por posición)', () => {
  LV.LEVEL_SEQUENCE.forEach((d, i) => assert.equal(d.storyIndex, i));
  assert.equal(LV.SUBMARINO_LEVEL.storyIndex, 16);
  assert.equal(LV.ESPACIAL_LEVEL.storyIndex, 17);
  // La misión Guadalajara arranca con el tramo cuyo storyIndex es 1 (su capítulo real, aunque sea local 0).
  const W = NS.World.buildWorld({ levels: LV.MISSIONS[1].levels });
  assert.equal(W.scenes[0].chapter.title, NS.STORY.CHAPTERS[1].title);
});

test('integridad de los mapas nuevos: una parada, una salida, todo dentro y >=10 cristales', () => {
  for (const [name, m] of [['submarino', LV.SUBMARINO_MAP], ['espacial', LV.ESPACIAL_MAP]]) {
    assert.equal(m.surfaces.filter((s) => s.start).length, 1, name + ': una parada');
    const ex = m.surfaces.filter((s) => s.exit);
    assert.equal(ex.length, 1, name + ': una salida');
    assert.ok(m.exitX >= ex[0].x1 + 20 && m.exitX <= ex[0].x2 - 20, name + ': exitX en la salida');
    for (const f of ['surfaces', 'planks', 'movers', 'water']) {
      for (const q of m[f] || []) assert.ok(q.x1 < q.x2 && q.x1 >= -1 && q.x2 <= m.width + 1 && q.y >= 0 && q.y <= m.height, `${name}.${f} fuera: ${JSON.stringify(q)}`);
    }
    assert.ok(m.gems.length >= 10, `${name}: ${m.gems.length} cristales`);
    for (const g of m.gems) assert.ok(g.x >= 0 && g.x <= m.width && g.y >= 0 && g.y <= m.height, name + ': cristal fuera');
  }
});

test('submarino y espacial se juegan: meta alcanzable, todos los cristales y sin trampas (3 dificultades)', () => {
  for (const lvl of [LV.SUBMARINO_LEVEL, LV.ESPACIAL_LEVEL]) {
    for (const diff of ['facil', 'normal', 'dificil']) {
      const W = NS.World.buildWorld({ levels: [lvl], difficulty: diff });
      const r = analyze(W, { gems: true });
      assert.ok(r.checks.goalFromStart, `${lvl.id} ${diff}: meta inalcanzable`);
      assert.equal(r.checks.traps.length, 0, `${lvl.id} ${diff}: trampas`);
      assert.equal(r.checks.gems.missing.length, 0, `${lvl.id} ${diff}: cristales inalcanzables`);
      assert.equal(r.problems.length, 0, `${lvl.id} ${diff}: ${r.problems.join(' | ')}`);
    }
  }
});

test('agua del submarino: profunda, ninguna plataforma dentro y cada orilla con salida', () => {
  const W = NS.World.buildWorld({ levels: [LV.SUBMARINO_LEVEL] });
  const deep = (W.waters || []).filter((z) => z.deep);
  assert.ok(deep.length >= 1, 'hay una poza profunda');
  for (const z of deep) {
    for (const p of W.platforms) {
      const inside = p.y > z.y + 4 && p.y < z.y2 - 4 && p.x2 > z.x1 + 2 && p.x1 < z.x2 - 2;
      assert.ok(!inside, 'plataforma dentro del agua: ' + p.id);
    }
    for (const side of ['left', 'right']) {
      const edge = side === 'left' ? z.x1 : z.x2;
      const ground = W.platforms.some((p) => Math.abs(p.y - z.y) <= C.water.climbUp && (side === 'left' ? p.x2 >= edge - 6 && p.x1 < edge : p.x1 <= edge + 6 && p.x2 > edge));
      assert.ok(z.banks.includes(side) || ground, `orilla ${side}`);
    }
  }
});

test('progreso por misión: completar una desbloquea la siguiente; las paradas se guardan', () => {
  const saved = [];
  const G = NS.Game.createGame({ onSave: (s) => saved.push(JSON.parse(JSON.stringify(s))) });
  G.setView(390, 844);
  assert.equal(G.save.missions.escuela, 1);
  assert.equal(G.save.missions.submarino, 0, 'el submarino arranca bloqueado');
  // Jugar la misión submarino (3) y llegar a la meta desbloquea la espacial (4).
  G.newRun({ mission: 2, startTramo: 0, difficulty: 'normal' });
  assert.equal(G.missionId, 'submarino');
  G.P.x = G.world.goal.x1; G.P.y = G.world.street.y1 - 40; G.P.ground = G.world.street;
  for (let i = 0; i < 300 && G.state === 'playing'; i++) G.step(1 / 60, { left: false, right: true, jumpPressed: false, jumpHeld: false, dashPressed: false, downPressed: false });
  for (let i = 0; i < 200 && G.state !== 'won'; i++) G.step(1 / 60, {});
  assert.equal(G.state, 'won');
  assert.ok(G.save.missions.espacial >= 1, 'completar submarino abre espacial');
});

test('variantes: gatitas submarinas presentes y precargadas (6 idle + 4 walk + hombro por gata)', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  for (const cat of ['luna', 'morita']) {
    for (let i = 1; i <= 6; i++) assert.ok(fs.existsSync(path.join(ROOT, `assets/companions/sub/${cat}_idle_sub_0${i}.png`)), `${cat} idle ${i}`);
    for (let i = 1; i <= 4; i++) assert.ok(fs.existsSync(path.join(ROOT, `assets/companions/sub/${cat}_walk_sub_0${i}.png`)), `${cat} walk ${i}`);
    assert.ok(fs.existsSync(path.join(ROOT, `assets/companions/sub/${cat}_shoulder_sub.png`)), `${cat} hombro`);
  }
  assert.ok(sw.includes('_idle_sub_') && sw.includes('_walk_sub_'), 'el service worker precarga las gatitas submarinas');
});

test('aspecto de Sofía: variantes uniforme y rosa completas (15 frames), mismas dimensiones y precargadas', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const need = ['idle_01', 'run_01', 'run_02', 'run_03', 'run_04', 'air_01', 'land_01', 'dive_01', 'kick_01', 'kick_02', 'kick_03', 'kick_04', 'cheer_01', 'cheer_02', 'cheer_03'];
  const pngSize = (p) => { const b = fs.readFileSync(p); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  const base = pngSize(path.join(ROOT, 'assets/player/sofia/idle_01.png'));
  for (const v of ['uniforme', 'rosa']) {
    for (const f of need) {
      const fp = path.join(ROOT, `assets/player/variants/${v}/${f}.png`);
      assert.ok(fs.existsSync(fp), `falta ${v}/${f}`);
    }
    // Drop-in: mismas dimensiones que el aspecto original (comparten las anclas de NS.ART.SOFIA).
    assert.deepEqual(pngSize(path.join(ROOT, `assets/player/variants/${v}/idle_01.png`)), base, `${v}: dimensiones distintas`);
  }
  assert.ok(sw.includes('assets/player/variants/'), 'el service worker precarga las variantes de aspecto');
});

test('precarga sin conexión: los fondos nuevos están en el service worker y existen', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  for (const f of ['assets/scenes/generated/submarino_fondo.png', 'assets/scenes/generated/espacial_fondo.png']) {
    assert.ok(sw.includes(f), 'sin precargar: ' + f);
    assert.ok(fs.existsSync(path.join(ROOT, f)), 'no existe: ' + f);
  }
});
