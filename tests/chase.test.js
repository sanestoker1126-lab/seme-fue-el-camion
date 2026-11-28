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
    const hits = r.log.filter((e) => e.type === 'bossHit' && e.foe.kind === 'truck').length;
    assert.ok(hits >= 3 && hits <= 7, 'golpes al jefe: ' + hits);
    // V58.8.29: antes, el duelo con El Maestro en su moto roja (jefe del tramo 2), vencido antes de las rampas.
    const mbIn = r.log.find((e) => e.type === 'bossIntro' && e.mini), mbOut = r.log.find((e) => e.type === 'bossDefeated' && e.mini);
    assert.ok(mbIn && mbOut && mbOut.i > mbIn.i, difficulty + ': duelo del maestro');
    const ramps = r.log.find((e) => e.type === 'chapter' && e.index === 2);
    assert.ok(ramps.i > mbOut.i, 'las rampas llegan después del duelo');
    assert.ok((mbOut.i - mbIn.i) / 60 > 10, 'el duelo dura: ' + ((mbOut.i - mbIn.i) / 60).toFixed(1) + ' s');
    assert.ok(r.log.filter((e) => e.type === 'takedown').length >= 2, 'hubo derribos (en todos los intentos)');
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

test('Calzada: el niño de las piedras y El Maestro Enojón pegan si no reaccionas', () => {
  // Piedra: marca el carril de Sofía y cae donde ella va si no cambia de carril ni de velocidad.
  const S = CH.createChase({ difficulty: 'normal' });
  S.newRun({ section: 1 });
  S.course.triggers.forEach((t) => { t.done = true; });
  S.foes = []; S.course.statics = [];
  const kid = S.spawn('kid', S.P.x - 70, 0); kid.ly = 0; kid.cd = 0;
  S.P.invT = 0;
  let hurt = null;
  for (let i = 0; i < 60 * 5 && !hurt; i++) { S.step(1 / 60, { right: false }); for (const e of S.drainEvents()) if (e.type === 'hurt') hurt = e; }
  assert.ok(hurt && hurt.reason === 'piedra', 'la piedra pegó: ' + (hurt && hurt.reason));
  // Si Sofía cambia de carril durante el aviso, la piedra cae en el carril vacío.
  const S2 = CH.createChase({ difficulty: 'normal' });
  S2.newRun({ section: 1 });
  S2.course.triggers.forEach((t) => { t.done = true; }); S2.foes = []; S2.course.statics = [];
  const kid2 = S2.spawn('kid', S2.P.x - 70, 0); kid2.ly = 0; kid2.cd = 0;
  let moved = 0, hurt2 = null, wasTele = false;
  for (let i = 0; i < 60 * 5; i++) {
    // En cada aviso, Sofía se cambia de carril (alterna entre el 1 y el 2).
    const tele = kid2.state === 'tele', dodge = tele && !wasTele;
    wasTele = tele;
    if (dodge) moved++;
    // Se cambia a un carril libre: ni el marcado ni el del niño.
    const free = [0, 1, 2].find((l) => Math.abs(l - S2.P.lane) === 1 && l !== kid2.dropLane && l !== kid2.lane);
    S2.step(1 / 60, dodge && free != null ? (free > S2.P.lane ? { downPressed: true } : { jumpPressed: true }) : {});
    for (const e of S2.drainEvents()) if (e.type === 'hurt') hurt2 = e;
  }
  assert.ok(moved >= 2, 'hubo al menos dos lanzamientos: ' + moved);
  assert.equal(hurt2, null, 'cambiar a un carril libre en cada aviso esquiva todas las piedras');
  // Reglazo: alcanza el carril de al lado; una PATADA durante el aviso lo detiene.
  const S3 = CH.createChase({ difficulty: 'normal' });
  S3.newRun({ section: 1 });
  S3.course.triggers.forEach((t) => { t.done = true; }); S3.foes = []; S3.course.statics = [];
  const m = S3.spawn('maestro', S3.P.x + 10, 0); m.ly = 0; m.cd = 0;
  S3.P.invT = 0;
  let hurt3 = null;
  for (let i = 0; i < 60 * 4 && !hurt3; i++) { S3.step(1 / 60, {}); for (const e of S3.drainEvents()) if (e.type === 'hurt') hurt3 = e; }
  assert.ok(hurt3 && hurt3.reason === 'regla', 'el reglazo pegó desde el carril vecino');
  const S4 = CH.createChase({ difficulty: 'normal' });
  S4.newRun({ section: 1 });
  S4.course.triggers.forEach((t) => { t.done = true; }); S4.foes = []; S4.course.statics = [];
  const m2 = S4.spawn('maestro', S4.P.x + 10, 0); m2.ly = 0; m2.cd = 0;
  S4.P.invT = 0;
  let kicked = false, hurt4 = null;
  for (let i = 0; i < 60 * 1.5; i++) {
    const kick = m2.state === 'tele' && !kicked;
    if (kick) kicked = true;
    S4.step(1 / 60, { kickPressed: kick });
    for (const e of S4.drainEvents()) if (e.type === 'hurt') hurt4 = e;
  }
  assert.ok(kicked && !hurt4, 'la PATADA durante el aviso lo detiene');
  assert.equal(m2.hp, m2.maxHp - 1);
});

test('Calzada: El Maestro en moto roja (jefe del tramo 2) avisa sus tres ataques, se cubre y detiene la ruta', () => {
  const S = NS.Chase.createChase({ seed: 6, difficulty: 'normal' });
  S.newRun({ section: 1 });
  S.P.x = 20500; S.course.triggers.forEach((t) => { if (t.x < 20500) t.done = true; }); S.foes = S.foes.filter((f) => f.x > 21500);
  const reasons = {}; let intro = null;
  for (let i = 0; i < 60 * 60 && S.state === 'playing'; i++) {
    S.P.hp = 99; S.step(1 / 60, { right: true });
    if (S.mb && S.mb.hp > 3) S.mb.hp = 3;    // media vida: también el caballito
    for (const e of S.drainEvents()) { if (e.type === 'hurt') reasons[e.reason] = (reasons[e.reason] || 0) + 1; if (e.type === 'bossIntro') intro = e; }
  }
  assert.ok(intro && intro.mini && intro.foe.kind === 'mjefe' && intro.foe.maxHp === 6);
  // Sin reaccionar solo pegan sus ataques avisados (ningún roce ni golpe sin aviso).
  assert.deepEqual(Object.keys(reasons).sort(), ['caballito', 'dash', 'regla']);
  assert.equal(S.section, 1, 'la ruta no avanza mientras dura el duelo');
  assert.ok(S.course.statics.every((s) => s.x < S.P.x + 2000 || s.x > 5e5), 'avenida despejada');
  // Se cubre con la regla fuera de sus ventanas; se le pega al levantarla y cuando frena aturdido.
  const b = S.mb; b.hitCD = 0; b.state = 'ride';
  assert.equal(S.damageFoe(b, 1, 'ram'), false); assert.ok(b.blocked);
  b.hitCD = 0; b.state = 'tele'; b.atk = 'swing';
  assert.equal(S.damageFoe(b, 1, 'ram'), true); assert.equal(b.hp, 2);
  b.hitCD = 0; b.state = 'dizzy';
  assert.equal(S.damageFoe(b, 2, 'boostRam'), true);
  assert.ok(b.dead, 'vencido');
  // Al vencerlo, la ruta vuelve delante a la misma distancia y sigue hacia las rampas.
  const next = S.course.statics.filter((s) => s.x > S.P.x).sort((a, c) => a.x - c.x)[0];
  assert.ok(next && next.x - S.P.x < 3500, 'la ruta regresó');
  const gap = S.course.gaps[0];
  assert.ok(gap.x1 > S.P.x && gap.x1 - S.P.x < 7000, 'la primera zanja quedó adelante');
  assert.ok(S.routeX() < NS.Chase.SECTIONS[2].x, 'progreso consistente');
});
