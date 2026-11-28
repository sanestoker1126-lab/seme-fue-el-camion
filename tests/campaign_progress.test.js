// Partidas y victorias a través de Game.step, con la misma frecuencia que el navegador.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, input } = require('./helpers');
const route = require('./fixtures/parafalls-route.json');
const NS = load();
const dt = NS.CONFIG.sim.fixedDt;

function boardFromDoor(G) {
  // Prueba localizada de la meta, comienza con los pies delante de la puerta.
  const { street, portal, goal } = G.world;
  const support = portal ? portal.plat : street;
  Object.assign(G.P, { x: (goal.x1 + goal.x2) / 2, y: support.y - G.P.h / 2, vx: 0, vy: 0, ground: support });
  for (let frame = 0; frame < 155; frame++) G.step(dt, input());
  assert.equal(G.state, 'won');
  return G.drainEvents().find(event => event.type === 'victory');
}

test('práctica: iniciar por una parada bloqueada, reintentar y ganar conserva la campaña', () => {
  const writes = [];
  const G = NS.Game.createGame({ onSave: s => writes.push(JSON.stringify(s)) });
  const before = structuredClone(G.save);
  G.newRun({ mission: 4, startTramo: 2, practice: true });
  assert.deepEqual(G.save, before);
  G.retry();
  assert.equal(G.tramo, 2);
  assert.equal(G.run.practice, true);
  const win = boardFromDoor(G);
  assert.equal(win.summary.practice, true);
  assert.equal(win.newTime, false);
  assert.equal(win.newScore, false);
  assert.equal(win.postCredits, false);
  assert.deepEqual(G.save, before);
  assert.equal(writes.length, 0);
});

test('práctica: los objetos de la partida se cuentan sin alterar la colección guardada', () => {
  const G = NS.Game.createGame({ onSave: () => assert.fail('escritura durante práctica') });
  G.newRun({ mission: 1, practice: true, seed: 821 });
  const pickup = G.world.pickups.find(p => p.type === 'item');
  G.P.x = pickup.x; G.P.y = pickup.y; G.P.ground = null;
  G.step(dt, input());
  assert.ok(pickup.got);
  assert.ok(G.run.items.includes(pickup.itemIndex));
  assert.equal(G.save.items[pickup.itemId], undefined);
});

test('la meta de Espacio abre Parafalls y la campaña se recupera después de practicar', () => {
  let saved;
  const G = NS.Game.createGame({ save: { missions: { escuela: 3, guadalajara: 13, submarino: 1, espacial: 1 } },
    onSave: s => { saved = JSON.stringify(s); } });
  G.newRun({ mission: 3, practice: true });
  boardFromDoor(G);
  assert.equal(saved, undefined);
  G.newRun({ mission: 3 });
  const win = boardFromDoor(G);
  assert.equal(win.nextMission, 4);
  assert.equal(win.summary.practice, false);
  const recovered = NS.Game.createGame({ save: JSON.parse(saved) });
  assert.equal(recovered.save.missions.parafalls, 1);
  assert.equal(recovered.save.wins, 1);
});

test('Parafalls: recorrido continuo de tres páginas, dos paradas nuevas y victoria desde el inicio', () => {
  let saved;
  const G = NS.Game.createGame({ save: { missions: { parafalls: 1 } }, onSave: s => { saved = JSON.stringify(s); } });
  G.setView(390, 844);
  G.newRun({ mission: 4, difficulty: 'normal', seed: 821 });
  const checkpoints = [G.checkpoint.scene], exits = new Set(), victories = [];
  for (const {direction, frames, jump} of route) {
    for (let i = 0; i < frames; i++) {
      G.step(dt, input({left: direction === 'left', right: direction === 'right', jumpPressed: !!jump && i === 0, jumpHeld: !!jump && i === 0}));
      const scene = G.world.scenes[G.tramo];
      if (G.P.ground === scene.exitPlatform) exits.add(scene.index);
      for (const event of G.drainEvents()) {
        if (event.type === 'checkpoint' && !event.cp.mid) checkpoints.push(event.cp.scene);
        if (event.type === 'victory') victories.push(event);
      }
    }
  }
  assert.deepEqual([...exits], [0, 1, 2]);
  assert.deepEqual(checkpoints, [0, 1, 2]);
  assert.equal(G.state, 'won');
  assert.equal(G.run.deaths, 0);
  assert.equal(G.run.lives, G.run.maxLives);
  assert.equal(victories.length, 1);
  assert.equal(victories[0].summary.totalBosses, 0);
  assert.equal(victories[0].stars, 1);
  const restored = NS.Game.createGame({ save: JSON.parse(saved) });
  assert.equal(restored.save.missions.parafalls, 3);
  assert.equal(restored.save.wins, 1);
});

// Los botones son pulsos a 60 Hz. Cada rango sostenido guarda el primer fotograma y la duración.
function playRoute(G, route) {
  const buttons = {};
  for (const name of ['jump', 'kick', 'cats', 'dash', 'down', 'holdJump', 'holdDown']) {
    buttons[name] = new Set();
    for (const event of route[name] || []) {
      if (Array.isArray(event)) {
        const [start, frames] = event;
        for (let i = 0; i < frames; i++) buttons[name].add(start + i);
      } else buttons[name].add(event);
    }
  }
  let frame = 0;
  for (const { direction, frames } of route.directions) {
    for (let i = 0; i < frames; i++, frame++) {
      G.step(dt, input({
        left: direction === 'left', right: direction === 'right',
        jumpPressed: buttons.jump.has(frame), jumpHeld: buttons.jump.has(frame) || buttons.holdJump.has(frame),
        kickPressed: buttons.kick.has(frame), catsPressed: buttons.cats.has(frame), dashPressed: buttons.dash.has(frame),
        downPressed: buttons.down.has(frame), downHeld: buttons.holdDown.has(frame)
      }));
    }
  }
}

test('campaña: un perfil nuevo completa las cuatro misiones en modo relajado y desbloquea Parafalls', () => {
  const routes = { ...require('./fixtures/campaign-routes.json'), espacial: require('./fixtures/espacio-route.json') };
  let saved;
  for (const [i, mission] of NS.LEVELS.MISSIONS.slice(0, 4).entries()) {
    const G = NS.Game.createGame({ assist: { relaxed: true }, save: saved && JSON.parse(saved),
      onSave: s => { saved = JSON.stringify(s); } });
    const next = NS.LEVELS.MISSIONS[i + 1].id;
    // V58.9: entre Guadalajara y el submarino va la misión especial LA CALZADA.
    const unlocks = mission.id === 'guadalajara' ? 'calzada' : next;
    assert.equal(G.save.missions[mission.id], 1);
    assert.equal(G.save.missions[unlocks] || 0, 0);
    G.setView(1280, 720);
    G.newRun({ mission: i, difficulty: 'normal' });
    if(mission.id==='submarino'){
      const a=G.world.poseidonArena,b=G.world.foes.find(f=>f.id===a.bossId),P=G.P,visited=new Set();
      for(let i=0;i<20000&&G.state==='playing';i++){
        const x=P.water?(P.y<a.entryY?0:b.dead?a.x:b.x-66):400;
        const y=b.dead?a.bottom-50:P.y<a.entryY?a.entryY+100:b.y;
        const dx=x-P.x,dy=y-P.y;
        G.step(dt,input({right:dx>10,left:dx< -10,downHeld:!P.water||dy>12,upHeld:dy< -12,
          kickPressed:!b.dead&&Math.abs(P.x-b.x)<120,dashPressed:!b.dead&&b.state==='dizzy'&&Math.abs(dx)<80&&Math.abs(dy)<55}));
        visited.add(G.tramo);
      }
      assert.deepEqual([...visited],[0,1,2]);assert.ok(b.dead,'combate real antes de llegar a la salida');
    } else playRoute(G, routes[mission.id]);
    assert.equal(G.state, 'victory', mission.id);
    for (let frame = 0; frame < 155; frame++) G.step(dt, input());
    const win = G.drainEvents().find(event => event.type === 'victory');
    assert.equal(G.state, 'won');
    assert.equal(win.summary.practice, false);
    assert.equal(win.summary.relaxed, true);
    assert.equal(win.nextMission, mission.id === 'guadalajara' ? 'calzada' : i + 1);
    assert.equal(G.save.wins, i + 1);
    assert.equal(JSON.parse(saved).missions[unlocks], 1);
    if (mission.id === 'guadalajara') {
      // La Calzada se juega completa (bot) y su victoria abre el submarino.
      assert.equal(JSON.parse(saved).missions.submarino || 0, 0, 'el submarino espera a la Calzada');
      const { playChase } = require('./chase_bot.js');
      const r = playChase(NS, { difficulty: 'normal', retries: 0 });
      assert.equal(r.S.state, 'won');
      saved = JSON.stringify(NS.Chase.applyVictory(JSON.parse(saved), r.S.summary()));
      assert.equal(JSON.parse(saved).missions.submarino, 1);
      assert.equal(JSON.parse(saved).missions.calzada, NS.Chase.SECTIONS.length);
    }
  }
});

// V58.8.38 · Final de la historia: si faltan llaves USB, la victoria de la última misión dice cuáles y en qué parada
// (cuarto secreto) están; con las seis se desbloquea la escena post-créditos y ya no hay lista.
test('final: la última misión lista las llaves que faltan y dónde están', () => {
  const G = NS.Game.createGame({ onSave: () => {} });
  G.save.items = { credencial: true, tarjeta: true, sueter: true };
  G.newRun({ mission: 4, startTramo: 2 });
  const win = boardFromDoor(G);
  assert.equal(win.lastMission, true);
  assert.equal(win.postCredits, false);
  assert.deepEqual(win.missingKeys.map((k) => k.id).sort(), ['audifonos', 'cuaderno', 'llavero']);
  const where = Object.fromEntries(win.missingKeys.map((k) => [k.id, [k.mission, k.tramo]]));
  assert.deepEqual(where, { cuaderno: [0, 2], llavero: [0, 3], audifonos: [1, 2] });
  const G2 = NS.Game.createGame({ onSave: () => {} });
  for (const it of NS.STORY.ITEMS) G2.save.items[it.id] = true;
  G2.newRun({ mission: 4, startTramo: 2 });
  const win2 = boardFromDoor(G2);
  assert.equal(win2.postCredits, true);
  assert.deepEqual(win2.missingKeys, []);
});
