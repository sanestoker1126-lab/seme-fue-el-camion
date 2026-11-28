// V58.8.24 · MISIÓN ESPECIAL · LA CALZADA (persecución en el camión de la Ruta 6).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./helpers');
const { playChase, chaseBot } = require('./chase_bot');
const NS = load();
const CH = NS.Chase;
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('Calzada: trazado determinista y siempre transitable', () => {
  for (const diff of ['facil', 'normal', 'dificil']) {
    const a = CH.buildCourse(6, diff), b = CH.buildCourse(6, diff);
    assert.deepEqual(JSON.stringify(a), JSON.stringify(b), 'misma semilla, mismo trazado');
    // Ninguna «fila» de obstáculos fijos cierra los tres carriles.
    const blockers = a.statics.filter((s) => s.kind === 'barrier' || s.kind === 'cone');
    for (const s of blockers) {
      const lanes = new Set(blockers.filter((o) => Math.abs(o.x - s.x) < 160).map((o) => o.lane));
      assert.ok(lanes.size < CH.LANES, 'fila cerrada en x=' + s.x);
    }
    // Cada zanja tiene rampa en al menos un carril y un letrero que lo anuncia; nada fijo cae dentro de una zanja.
    for (const g of a.gaps) {
      const ramps = a.statics.filter((s) => s.kind === 'ramp' && s.x < g.x1 && g.x1 - s.x < 220);
      assert.ok(ramps.length >= 1, 'zanja sin rampa en ' + g.x1);
      const sign = a.statics.find((s) => s.kind === 'sign' && s.x < g.x1 && g.x1 - s.x < 1200);
      assert.ok(sign && sign.ramps.every((l) => ramps.some((r) => r.lane === l)), 'el letrero indica los carriles con rampa');
      assert.ok(!a.statics.some((s) => s.kind !== 'gem' && s.x > g.x1 && s.x < g.x2), 'obstáculo dentro de la zanja');
      // Con la velocidad máxima sin nitro el salto alcanza a cruzarla (despegue 90 u antes del borde).
      const v = CH.TUNE.vMax, vz = Math.min(CH.TUNE.rampMaxVz, v * CH.TUNE.rampLift), dist = v * 2 * vz / CH.TUNE.gravity;
      assert.ok(dist > g.x2 - g.x1 + 90 + 60, 'zanja demasiado larga para vMax: ' + (g.x2 - g.x1));
    }
    assert.ok(a.gaps.length >= 4);
    assert.deepEqual(CH.SECTIONS.map((s) => s.id), ['arranque', 'patrullas', 'rampas', 'zopilotes', 'trailer']);
  }
});

test('Calzada: el bot completa la misión en las tres dificultades (jefe, salto final y chapuzón)', () => {
  for (const difficulty of ['facil', 'normal', 'dificil']) {
    const r = playChase(NS, { difficulty, retries: 2 });
    assert.equal(r.S.state, 'won', difficulty);
    const kinds = new Set(r.log.map((e) => e.type));
    for (const k of ['chapter', 'checkpoint', 'ramp', 'land', 'bossIntro', 'bossHit', 'bossDefeated', 'finale', 'splash', 'victory']) assert.ok(kinds.has(k), difficulty + ' sin ' + k);
    const chapters = r.log.filter((e) => e.type === 'chapter').map((e) => e.index);
    assert.deepEqual([...new Set(chapters)], [0, 1, 2, 3, 4]);
    const hits = r.log.filter((e) => e.type === 'bossHit').length;
    assert.ok(hits >= 3 && hits <= 7, 'golpes al jefe: ' + hits);
    assert.ok(r.S.stats.takedowns >= 2, 'hubo derribos');
    assert.ok(r.S.stats.t > 60 && r.S.stats.t < 240, 'duración razonable: ' + r.S.stats.t);
  }
});

test('Calzada: sin manejar no se gana (las patrullas y el tráfico detienen el camión)', () => {
  const S = CH.createChase({ difficulty: 'normal' });
  S.newRun({ section: 1 });
  let over = null;
  for (let i = 0; i < 60 * 120 && S.state === 'playing'; i++) { S.step(1 / 60, {}); for (const e of S.drainEvents()) if (e.type === 'gameover') over = e; }
  assert.equal(S.state, 'lost');
  assert.ok(over && over.section === 1, 'reaparece en el tramo alcanzado');
  S.retry();
  assert.equal(S.state, 'playing'); assert.equal(S.P.hp, S.P.maxHp); assert.equal(S.deaths, 1);
  assert.ok(S.P.x >= CH.SECTIONS[1].x && S.P.x < CH.SECTIONS[2].x);
});

test('Calzada: el tráiler solo recibe daño con las puertas abiertas y pelea solo', () => {
  const S = CH.createChase({ difficulty: 'normal' });
  S.newRun({ section: 3 });
  S.spawn('suv', S.P.x + 600, 0, { state: 'lead' });
  S.P.x = CH.BOSS_X - 800;
  for (let i = 0; i < 30; i++) { S.P.invT = 9; S.step(1 / 60, { right: true }); }
  const b = S.boss;
  assert.ok(b, 'el tráiler aparece al llegar a su tramo');
  assert.ok(S.foes.filter((f) => !f.civil && !f.boss && !f.dead).every((f) => f.state === 'leave'), 'los demás perseguidores se retiran');
  const hp = b.hp;
  b.state = 'drive';
  assert.equal(S.damageFoe(b, 1, 'ram'), false); assert.equal(b.hp, hp);
  b.state = 'doors';
  assert.equal(S.damageFoe(b, 2, 'boostRam'), true); assert.equal(b.hp, hp - 2);
});

test('Calzada: rampa, nitro, embestida y gatas actúan sobre el estado', () => {
  const S = CH.createChase({ difficulty: 'normal' });
  S.newRun({ section: 2 });
  const ramp = S.course.statics.find((s) => s.kind === 'ramp' && s.lane === 1);
  Object.assign(S.P, { x: ramp.x - 200, lane: 1, ly: 1, v: 800 });
  for (let i = 0; i < 30 && !S.P.air; i++) S.step(1 / 60, { right: true });
  assert.ok(S.P.air && S.P.vz > 0, 'la rampa lanza al camión');
  const S2 = CH.createChase({ difficulty: 'normal' });
  S2.newRun({ section: 1 });
  S2.P.nitro = 100;
  S2.step(1 / 60, { dashPressed: true });
  assert.ok(S2.P.boostT > 0 && S2.P.nitro === 100 - CH.TUNE.boostCost);
  const p = S2.spawn('patrol', S2.P.x, 2); p.ly = 2; S2.P.lane = 1; S2.P.ly = 1; p.state = 'tele'; p.tele = 5;
  S2.step(1 / 60, { kickPressed: true });
  assert.equal(p.hp, p.maxHp - 2, 'embestir con nitro quita 2');
  const p2 = S2.spawn('patrol', S2.P.x + 400, 0);
  S2.step(1 / 60, { catsPressed: true });
  assert.ok(S2.cats.cd > 0 && S2.cats.target);
  for (let i = 0; i < 60; i++) S2.step(1 / 60, {});
  assert.ok(p2.hp < p2.maxHp || p.dead, 'Luna alcanzó a un perseguidor');
});

test('Calzada: progreso guardado (tramos y apertura del submarino)', () => {
  const save = NS.Game.defaultSave();
  CH.applyCheckpoint(save, 2);
  assert.equal(save.missions.calzada, 3);
  assert.equal(save.missions.submarino, 0);
  CH.applyVictory(save, { score: 9000, takedowns: 9, startSection: 0, t: 130 });
  assert.equal(save.missions.calzada, CH.SECTIONS.length);
  assert.equal(save.missions.submarino, 1);
  assert.equal(save.chase.bestTime, 130); assert.equal(save.chase.wins, 1);
});

test('Calzada: cinemáticas válidas, archivos presentes, en precache y conectadas en main/ui', () => {
  require('../js/core/toxifamilia.js');
  const T = NS.TOXIFAMILIA, sw = read('sw.js'), html = read('Se_Me_Fue_El_Camion.html');
  for (const set of ['CALZADA', 'CALZADA_FIN']) {
    const scenes = T.validate(T[set]);
    assert.ok(scenes.length >= 2);
    for (const f of T.assetsOf(T[set])) { assert.ok(fs.existsSync(path.join(root, f)), 'falta ' + f); assert.ok(sw.includes(f.split('/').pop().replace('.webp', '')), 'sin precache ' + f); }
  }
  assert.match(read('js/app/toxifamilia_cinematic.js'), /SETS\.calzada = manifest\.validate\(manifest\.CALZADA/);
  for (const f of ['js/core/chase.js', 'js/app/chase_render.js']) {
    const tag = html.match(new RegExp(f.replace(/[.]/g, '\\.') + '\\?v=[0-9.]+'));
    assert.ok(tag, f + ' en el HTML'); assert.ok(sw.includes(tag[0]), f + ' en precache con la misma versión');
  }
  const main = read('js/app/main.js');
  assert.match(main, /if \(mission === 'calzada'\) \{ startChase/);
  assert.match(main, /set: 'calzada_fin'/);
  for (const f of NS.ChaseRender ? [] : ['assets/vehicles/camion_frame_02.png', 'assets/companions/luna.png']) assert.ok(sw.includes(f));
});
