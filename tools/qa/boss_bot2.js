// Better boss bot: back off during wind-up, jump over the charge, punish when dizzy/patrolling.
const path = require('path');
const root = path.resolve(process.argv[2] || '.');
require(path.join(root, 'tests', 'helpers.js')).load();
const NS = globalThis.CAMION;
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
const verbose = !!process.argv[4];
for (const diff of ['facil', 'normal', 'dificil']) {
  const rows = [];
  for (let sc = 0; sc < NS.LEVELS.LEVEL_SEQUENCE.length; sc++) {
    if (only && !only.includes(sc)) continue;
    const G = NS.Game.createGame({}); G.setView(390, 844); G.newRun({ difficulty: diff, startTramo: sc });
    const W = G.world, boss = W.foes.find((f) => f.isBoss && f.scene === sc); W.foes = [boss];
    W.hazards = W.hazards.filter((h) => h.type === 'puddle');
    const exit = boss.arena || W.scenes[sc].exitPlatform, P = G.P, T = NS.Enemies.TYPES[boss.kind];
    P.x = boss.x < (exit.x1 + exit.x2) / 2 ? exit.x2 - 26 : exit.x1 + 26; P.y = exit.y - P.h / 2; P.ground = exit; P.airTopFoot = exit.y;
    G.updateCamera(0, true);
    G.run.lives = 99; G.run.maxLives = 99;
    let t = 0, hurts = 0, jumpT = 0, jumpDir = 0, log = [];
    while (!boss.dead && t < 90) {
      const inp = { left: false, right: false, jumpPressed: false, jumpHeld: false, kickPressed: false, dashPressed: false, downPressed: false };
      const dx = boss.x - P.x, adx = Math.abs(dx), dir = Math.sign(dx) || 1;
      const by = T.flyer ? boss.y : boss.y - boss.h * 0.5;
      const go = (d) => { inp[d > 0 ? 'right' : 'left'] = true; };
      const footY = P.y + P.h / 2, bossFloor = T.flyer ? exit.y : boss.y;
      if (P.ground && P.ground !== exit && footY < bossFloor - 12 && jumpT <= 0) {
        // Quedó encima de la arena (escalón/cornisa): BAJAR si se puede, si no caminar al borde más cercano.
        // V51: bajar hacia la arena (como haría una persona), no hacia el borde más cercano (que puede llevar al sector lateral).
        if (P.ground.drop) inp.downPressed = true;
        else {
          const g = P.ground, inA = (x) => x > exit.x1 + 16 && x < exit.x2 - 16;
          const edges = [g.x1 - P.w / 2 - 6, g.x2 + P.w / 2 + 6].filter(inA).sort((a, b) => Math.abs(a - P.x) - Math.abs(b - P.x));
          go(edges.length ? Math.sign(edges[0] - P.x) || 1 : Math.sign((exit.x1 + exit.x2) / 2 - P.x) || 1);
        }
        const before = G.run.lives; G.step(1 / 60, inp); t += 1 / 60; if (G.run.lives < before) hurts++;
        if (G.state !== 'playing') { if (G.state === 'paused') G.resume(); else break; }
        continue;
      }
      if (jumpT > 0) {
        jumpT -= 1 / 60; inp.jumpHeld = true;
        const passed = jumpDir && Math.sign(boss.x - P.x) !== jumpDir;          // ya lo pasó por encima
        const nearEdge = P.x < exit.x1 + 30 || P.x > exit.x2 - 30;
        if (jumpDir && !passed) go(jumpDir);
        else if (nearEdge) go(P.x < (exit.x1 + exit.x2) / 2 ? 1 : -1);        // no caerse de la arena
        if (adx < 70) { P.face = dir; inp.kickPressed = true; }
      }
      else if (T.chargeMul && boss.state === 'charge' && adx < 120 && Math.sign(boss.dir) === -dir) { inp.jumpPressed = true; inp.jumpHeld = true; jumpT = 0.55; jumpDir = dir; }
      else if (T.chargeMul && (boss.state === 'windup' || boss.state === 'recoil')) { // gain distance, keep facing
        const away = -dir, edge = away > 0 ? exit.x2 - 22 : exit.x1 + 22;
        if (Math.abs(edge - P.x) > 8 && adx < 150) go(away);
      } else if (boss.kind === 'chile' && W.shots.some((s) => Math.abs(s.x - P.x) < 70 && Math.sign(s.vx) === -dir) && P.ground) { inp.jumpPressed = true; inp.jumpHeld = true; jumpT = 0.4; jumpDir = dir; }
      else if (T.flyer) {
        if (adx > 30) go(dir);
        if (P.ground && adx < 70 && P.y - by > 20) { inp.jumpPressed = true; inp.jumpHeld = true; jumpT = 0.45; jumpDir = 0; }
      } else {
        if (adx > 46) go(dir); else { P.face = dir; inp.kickPressed = true; }
      }
      const before = G.run.lives;
      G.step(1 / 60, inp); t += 1 / 60;
      if (G.run.lives < before) hurts++;
      if (G.state !== 'playing') { if (G.state === 'paused') G.resume(); else break; }
      if (P.y > exit.y + 300) { P.x = (exit.x1 + exit.x2) / 2; P.y = exit.y - P.h / 2; P.vy = 0; P.vx = 0; P.ground = exit; }
      if (verbose && Math.round(t * 60) % 10 === 0) { const hb = NS.Enemies.hitBox(boss); log.push(`${t.toFixed(2)} ${boss.state} hp${boss.hp} dx${dx.toFixed(0)} P${P.ground ? 'g' : 'a'} face${P.face} kT${P.kickT.toFixed(2)} kCD${P.kickCD.toFixed(2)} hitCD${boss.hitCD.toFixed(2)} Py${P.y.toFixed(0)} by${boss.y.toFixed(0)} hb${hb.x1.toFixed(0)}..${hb.x2.toFixed(0)} Px${P.x.toFixed(0)} jumpT${jumpT.toFixed(2)}`); }
    }
    rows.push(`${sc}:${boss.kind}${boss.dead ? '✓' : '✗'}${t.toFixed(0)}s/${hurts}h`);
    if (verbose) console.log(log.slice(0, 40).join('\n'));
  }
  console.log(diff.padEnd(8), rows.join('  '));
}
