// Bot de prueba para la misión LA CALZADA: lee el estado del motor (como lo vería quien juega en pantalla) y decide
// carril, velocidad, nitro, embestida y gatas. No toca el estado interno: solo devuelve entradas.
function chaseBot(S) {
  const P = S.P, T = S.TUNE, L = S.LANES;
  const out = { left: false, right: true, jumpPressed: false, downPressed: false, dashPressed: false, kickPressed: false, catsPressed: false };
  if (P.air) return out;
  const look = Math.max(700, P.v * 1.35);
  const danger = [0, 0, 0];
  const mark = (lane, x, w) => { if (lane >= 0 && lane < L && x > P.x - 140 && x < P.x + look) danger[lane] += w * (1 + (look - (x - P.x)) / look); };
  for (const s of S.course.statics) {
    if (s.x > P.x + look) break;
    if (s.got || s.x < P.x - 200) continue;
    if (s.kind === 'barrier') mark(s.lane, s.x, 6);
    if (s.kind === 'oil') mark(s.lane, s.x, 2);
    if (s.kind === 'cone') mark(s.lane, s.x, 0.4);
    if ((s.kind === 'nitro' || s.kind === 'repair') && s.x > P.x) mark(s.lane, s.x, -0.6);
  }
  // Zanjas: solo sirven los carriles con rampa.
  const gap = S.course.gaps.find((g) => g.x1 > P.x && g.x1 - P.x < look + 600);
  if (gap) {
    const ramps = S.course.statics.filter((s) => s.kind === 'ramp' && !s.used && Math.abs(s.x - (gap.x1 - 150)) < 40 || s.kind === 'ramp' && s.big && !s.used);
    for (let l = 0; l < L; l++) if (!ramps.some((r) => r.lane === l)) danger[l] += 40;
    const need = Math.sqrt((gap.x2 - gap.x1 + 160) / 0.0012) + 40;
    if (P.v < need) { if (P.nitro >= T.boostCost && P.boostT <= 0 && gap.x1 - P.x < 1400) out.dashPressed = true; }
  }
  for (const q of S.projectiles) if (q.x > P.x - 100) mark(q.lane, q.x, 8);
  for (const f of S.foes) {
    if (f.dead) continue;
    if (f.civil) { if (f.x > P.x - 140) mark(Math.round(f.ly), f.x, 5); continue; }
    if (f.state === 'tele' && f.dropLanes) for (const l of f.dropLanes) danger[l] += 9;
    if (f.state === 'tele' && f.dropLane != null) danger[f.dropLane] += 7;
    if (!f.boss && Math.abs(f.x - P.x) < 300) danger[Math.round(f.ly)] += 6;
  }
  // Jefe con puertas abiertas: alinearse y embestir por detrás.
  const boss = S.boss && !S.boss.dead ? S.boss : null;
  let want = null;
  if (boss && boss.state === 'doors' && !(S.projectiles.some((q) => q.lane === boss.lane && q.x > P.x))) {
    want = boss.lane;
    if (P.nitro >= T.boostCost && P.boostT <= 0) out.dashPressed = true;
    if (S.cats.cd <= 0) out.catsPressed = true;
  }
  if (boss && boss.state !== 'doors' && boss.x - P.x < 440) out.right = false, out.left = true;
  if (want == null) {
    let best = P.lane, bestD = Infinity;
    for (let l = 0; l < L; l++) { const d = danger[l] + Math.abs(l - P.lane) * 0.35; if (d < bestD) { bestD = d; best = l; } }
    want = best;
  }
  if (want < P.lane) out.jumpPressed = true; else if (want > P.lane) out.downPressed = true;
  // Patrulla emparejada y avisando: embestirla primero.
  const side = S.foes.find((f) => !f.dead && !f.civil && !f.boss && (f.state === 'tele' || f.state === 'approach') && Math.abs(f.x - P.x) < 150 && Math.abs(f.ly - P.ly) > 0.5 && Math.abs(f.ly - P.ly) < 1.6);
  if (side && P.ramCD <= 0) out.kickPressed = true;
  if (!out.catsPressed && S.cats.cd <= 0 && S.foes.some((f) => !f.dead && !f.civil && !f.boss && Math.abs(f.x - P.x) < 600)) out.catsPressed = true;
  // Tráfico pegado delante en el mismo carril y sin salida: frenar.
  if (danger[P.lane] > 9 && want === P.lane) { out.right = false; out.left = true; }
  return out;
}
/** Juega la misión completa; devuelve el estado final y el registro de eventos. */
function playChase(NS, opts = {}) {
  const S = NS.Chase.createChase({ seed: opts.seed || 6, difficulty: opts.difficulty || 'normal' });
  S.newRun({ section: opts.section || 0 });
  const log = [];
  const dt = 1 / 60, maxSteps = opts.maxSteps || 60 * 60 * 8;
  let retries = 0;
  for (let i = 0; i < maxSteps; i++) {
    S.step(dt, chaseBot(S));
    for (const e of S.drainEvents()) log.push(Object.assign({ i }, e));
    if (S.state === 'won') break;
    if (S.state === 'lost') { if (retries++ >= (opts.retries ?? 3)) break; S.retry(); }
  }
  return { S, log, retries };
}
module.exports = { chaseBot, playChase };
