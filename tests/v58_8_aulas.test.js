// V58.8 · Las aulas ocultas de la escuela (sala de cómputo + laboratorio de ciencias) con El Maestro Enojón, y todos
// los niveles desbloqueados en el menú.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load, input } = require('./helpers');
const NS = load();
require('../js/app/art_secretos.js');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const LV = NS.LEVELS;

test('las aulas ocultas: dos salones seguidos, entrada escondida en el nivel 1 y salida por el portal del laboratorio', () => {
  const W = NS.World.buildWorld({ levels: LV.MISSIONS[0].levels, difficulty: 'normal' });
  const r = W.rooms.find((q) => q.secret === 'aulas');
  assert.ok(r, 'existe la zona');
  assert.equal(r.scene, 0, 'está en el nivel 1 (las aulas superiores)');
  assert.deepEqual(r.panels.map((p) => p.art), ['aula_computo', 'aula_ciencias']);
  for (const p of r.panels) assert.ok(NS.ART.SECRET_BG[p.art] && fs.existsSync(path.join(ROOT, NS.ART.SECRET_BG[p.art].src)), p.art);
  assert.ok(Math.abs(r.panels[0].x2 - r.panels[1].x1) < 0.01, 'un salón pegado al otro');
  const d = r.entry, ex = r.exit;
  assert.equal(d.kind, 'secreto'); assert.equal(d.look, 'escuela');
  assert.ok(d.plat && d.plat.kind === 'floor' && !d.plat.start && !d.plat.exit && d.x - 30 >= d.plat.x1 && d.x + 30 <= d.plat.x2);
  // Se llega frente al portal de la sala de cómputo; la salida es el portal del laboratorio (a la mitad de la zona).
  assert.ok(d.to.x > r.x1 && d.to.x < r.panels[0].x1 + 150 && Math.abs(d.to.y - r.y2) < 1);
  assert.equal(ex.kind, 'portal');
  assert.ok(ex.x > r.panels[1].x1 && ex.x < r.panels[1].x1 + 80 && Math.abs(ex.y - r.y2) < 1);
  assert.ok(Math.abs(ex.to.y - d.y) < 1 && Math.abs(ex.to.x - d.x) >= 30 && ex.to.x >= d.plat.x1 && ex.to.x <= d.plat.x2, 'de vuelta junto a la entrada');
  // El maestro da clase en el laboratorio: es el jefe secreto y patrulla solo el frente del laboratorio.
  const foes = W.foes.filter((f) => f.region === r.id), boss = foes.find((f) => f.isBoss);
  assert.equal(boss.kind, 'maestro'); assert.equal(boss.bossName, 'EL MAESTRO ENOJÓN'); assert.equal(boss.secret, 'aulas');
  assert.equal(boss.hp, 5, 'un golpe menos que en los pasillos');
  assert.ok(boss.minX > ex.x + 60, 'no llega al portal de salida');
  assert.ok(boss.maxX < r.x2 && boss.arena.w >= 200);
  assert.ok(foes.some((f) => f.kind === 'kid' && !f.isBoss), 'un niño en la sala de cómputo');
  assert.equal(W.pickups.filter((p) => p.region === r.id && p.type === 'gem').length, 15);
  assert.ok(W.pickups.some((p) => p.region === r.id && p.type === 'power' && p.power === 'heart'));
  // Sobre las lámparas del techo Sofía cabe de pie (el techo de la zona sube sobre el borde del dibujo).
  const ceil = W.solids.find((s) => s.kind === 'roomwall' && s.region === r.id && Math.abs(s.y2 - r.ceilY) < 0.5);
  const lamps = W.platforms.filter((p) => p.region === r.id && Math.abs(p.y - (r.artY1 + 97 * r.scale)) < 0.5);
  assert.equal(lamps.length, 6, 'tres lámparas por salón');
  for (const l of lamps) assert.ok(l.y - ceil.y2 >= NS.CONFIG.player.h + 20, 'cabe de pie en la lámpara');
  // En FÁCIL hay menos enemigos (sin la rata ni el chile), el maestro sigue.
  const F = NS.World.buildWorld({ levels: LV.MISSIONS[0].levels, difficulty: 'facil' });
  const rf = F.rooms.find((q) => q.secret === 'aulas'), ff = F.foes.filter((f) => f.region === rf.id);
  assert.ok(ff.length < foes.length && ff.some((f) => f.kind === 'maestro' && f.isBoss));
  // Los pasillos (nivel 3) conservan su jefe.
  assert.ok(W.foes.some((f) => f.kind === 'maestro' && f.isBoss && f.region === 'main' && f.scene === 2 && f.hp === 6));
});

test('el Maestro de las aulas se puede vencer (bot con la física y la IA reales)', () => {
  const G = NS.Game.createGame({}); G.setView(844, 390); G.newRun({ mission: 0, startTramo: 0, difficulty: 'normal' });
  const W = G.world, room = W.rooms.find((r) => r.secret === 'aulas'), boss = room.boss, P = G.P;
  W.foes = [boss]; G.run.lives = 99; G.run.maxLives = 99;
  const d = room.entry; P.x = d.x; P.y = d.y - P.h / 2; P.ground = d.plat;
  G.step(1 / 60, input({ downPressed: true }));
  for (let i = 0; i < 40; i++) G.step(1 / 60, input());
  assert.equal(G.room, room);
  // Ponerla en el laboratorio, del lado del portal.
  P.x = boss.minX - 40; P.y = room.y2 - P.h / 2; P.vx = P.vy = 0;
  let t = 0, jumpT = 0;
  while (!boss.dead && t < 90 && G.state === 'playing') {
    const inp = input(), dx = boss.x - P.x, dir = Math.sign(dx) || 1, adx = Math.abs(dx);
    if (jumpT > 0) { jumpT -= 1 / 60; inp.jumpHeld = true; inp[dir > 0 ? 'right' : 'left'] = true; if (adx < 70) { P.face = dir; inp.kickPressed = true; } }
    else if (boss.state === 'charge' && adx < 130) { inp.jumpPressed = true; inp.jumpHeld = true; jumpT = 0.5; }
    else if (boss.state === 'windup' || boss.state === 'recoil') { if (adx < 150) inp[dir > 0 ? 'left' : 'right'] = true; }
    else if (W.shots.some((s) => Math.abs(s.x - P.x) < 80 && Math.abs(s.y - P.y) < 50) && P.ground) { inp.jumpPressed = true; inp.jumpHeld = true; jumpT = 0.3; }
    else if (adx > 50) inp[dir > 0 ? 'right' : 'left'] = true;
    else { P.face = dir; inp.kickPressed = true; }
    G.step(1 / 60, inp); t += 1 / 60;
  }
  assert.ok(boss.dead, 'vencido (quedó con ' + boss.hp + ' de vida tras ' + t.toFixed(0) + ' s)');
  assert.equal(G.run.secretBosses, 1);
});

test('todos los niveles desbloqueados: el menú abre las cuatro misiones y todas sus paradas', () => {
  const ui = read('js/app/ui.js'), html = read('Se_Me_Fue_El_Camion.html');
  assert.match(ui, /const save = G\.save, free = true;/);
  assert.ok(!html.includes('data-opt="freeSelect"'), 'ya no hace falta la opción de práctica');
  // El avance guardado se sigue registrando (récords y paradas alcanzadas), pero no bloquea nada.
  assert.equal(NS.Game.defaultSave().missions.escuela, 1);
});
