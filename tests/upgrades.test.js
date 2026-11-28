// V58.8.27 · Progreso: banco de cristales, tienda de mejoras, calificación y reparto protagonista por tramo.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, input } = require('./helpers');
const NS = load();
const UP = NS.Upgrades;
const place = (G, x, footY) => { const P = G.P; P.x = x; P.y = footY - P.h / 2; P.vx = 0; P.vy = 0; P.ground = null; P.airTopFoot = footY; };

test('tienda: comprar requiere cristales, sube de nivel y se detiene en el máximo', () => {
  const save = NS.Game.defaultSave();
  assert.equal(UP.buy(save, 'escudo').reason, 'faltan');
  UP.deposit(save, 520);
  const r = UP.buy(save, 'escudo');
  assert.ok(r.ok); assert.equal(save.bank, 20); assert.equal(UP.level(save, 'escudo'), 1);
  assert.equal(UP.buy(save, 'escudo').reason, 'maxima');
  UP.deposit(save, 2000);
  assert.ok(UP.buy(save, 'vida').ok && UP.buy(save, 'vida').ok);
  assert.equal(UP.level(save, 'vida'), 2); assert.equal(UP.buy(save, 'vida').reason, 'maxima');
  assert.equal(save.bank, 2020 - 300 - 750);
  assert.equal(UP.buy(save, 'inventada').ok, false);
});

test('banco: la parada guarda los cristales; caer antes de la siguiente pierde los que traías', () => {
  let saved = null;
  const G = NS.Game.createGame({ onSave: (s) => { saved = JSON.parse(JSON.stringify(s)); } });
  G.setView(1280, 720);
  G.newRun({ mission: 1, difficulty: 'normal' });
  G.world.foes.length = 0;
  G.run.gems = 40;
  const cp = G.world.checkpoints[1];
  place(G, cp.x, cp.y);
  for (let i = 0; i < 4; i++) G.step(1 / 60, input());
  assert.ok(cp.active, 'se activó la parada');
  assert.equal(G.save.bank, 40); assert.equal(saved.bank, 40);
  assert.ok(G.drainEvents().some((e) => e.type === 'bank' && e.n === 40));
  G.run.gems += 15;   // cristales que no llegaron a la parada
  G.retry();
  assert.equal(G.save.bank, 40, 'los cristales sin depositar se pierden al reintentar');
});

test('mejoras: vidas, escudo de salida, gatas entrenadas e imán se aplican en la partida', () => {
  const save = Object.assign(NS.Game.defaultSave(), { upgrades: { vida: 2, escudo: 1, gatas: 2, iman: 2 }, bank: 0 });
  const G = NS.Game.createGame({ save });
  G.setView(1280, 720);
  G.newRun({ mission: 1, difficulty: 'normal' });
  const d = NS.CONFIG.difficulty.normal;
  assert.equal(G.run.maxLives, d.lives + 2); assert.equal(G.run.lives, d.lives + 2);
  assert.equal(G.P.shield, true);
  assert.equal(G.companions.cmdMax, NS.CONFIG.cats.cooldown - 3);
  const fx = UP.effects(save);
  assert.equal(fx.magnetTime(8), 16); assert.equal(fx.magnetRadius(170), 230);
  G.retry();
  assert.equal(G.P.shield, true, 'el escudo vuelve en cada reintento');
  // La Calzada: moto reforzada y tanque de nitro.
  const S = NS.Chase.createChase({ difficulty: 'normal', upgrades: { chaseHp: 2, chaseNitro: 25 } });
  S.newRun({ section: 0 });
  assert.equal(S.P.maxHp, 6 + 2); assert.equal(S.P.nitro, 30 + 25);
});

test('calificación: S/A/B/C según misiones, opcionales, vidas y caídas; se guarda la mejor', () => {
  assert.equal(UP.rank({ contracts: { total: 4, main: 4, bonus: 4 }, lives: 3, maxLives: 3, deaths: 0 }).rank, 'S');
  assert.equal(UP.rank({ contracts: { total: 4, main: 4, bonus: 2 }, lives: 2, maxLives: 3, deaths: 0 }).rank, 'A');
  assert.equal(UP.rank({ contracts: { total: 4, main: 4, bonus: 0 }, lives: 1, maxLives: 3, deaths: 1 }).rank, 'B');
  assert.equal(UP.rank({ contracts: { total: 4, main: 2, bonus: 0 }, lives: 1, maxLives: 3, deaths: 2 }).rank, 'C');
  const save = NS.Game.defaultSave();
  assert.equal(UP.recordRank(save, 'guadalajara', 'B'), true);
  assert.equal(UP.recordRank(save, 'guadalajara', 'C'), false);
  assert.equal(UP.recordRank(save, 'guadalajara', 'S'), true);
  assert.equal(save.ranks.guadalajara, 'S');
  // La victoria trae su calificación y el depósito al banco.
  const G = NS.Game.createGame({});
  G.setView(390, 844);
  G.newRun({ startTramo: 7, difficulty: 'normal' });
  G.world.foes.length = 0;
  G.run.gems = 12;
  place(G, G.world.goal.x1 - 120, G.world.street.y1 - 60);
  for (let i = 0; i < 400; i++) G.step(1 / 60, input({ right: i < 200 }));
  const v = G.drainEvents().find((e) => e.type === 'victory');
  assert.ok(v && UP.RANKS.includes(v.rank));
  assert.equal(v.rankNew, false, 'empezar a medio recorrido no registra calificación');
  assert.equal(v.banked, 12); assert.equal(G.save.bank, 12);
});

test('reparto protagonista: cada tramo de Guadalajara tiene sus enemigos propios en el modo misiones', () => {
  const M = NS.LEVELS.MISSIONS[1];
  const kinds = (cast) => {
    const W = NS.World.buildWorld({ levels: M.levels, difficulty: 'normal', cast });
    const out = {};
    for (const sc of W.scenes) {
      const k = {};
      W.foes.filter((f) => f.scene === sc.index && !f.isBoss && !f.secret).forEach((f) => { k[f.kind] = (k[f.kind] || 0) + 1; });
      out[sc.id] = k;
    }
    return out;
  };
  const on = kinds(true), off = kinds(false);
  for (const d of M.levels) {
    if (!d.cast) continue;
    const k = on[d.id], total = Object.values(k).reduce((a, b) => a + b, 0);
    const main = d.cast.reduce((n, kind, i) => n + (d.cast.indexOf(kind) === i ? (k[kind] || 0) : 0), 0);
    assert.ok(main / total >= 0.8, d.id + ': protagonistas ' + main + '/' + total);
  }
  assert.notDeepEqual(on.metro, off.metro, 'el metro cambia de reparto');
  // Ningún par de tramos seguidos repite exactamente el mismo reparto.
  const casts = M.levels.map((d) => (d.cast || d.foes).slice().sort().join());
  for (let i = 1; i < casts.length; i++) assert.notEqual(casts[i], casts[i - 1], M.levels[i].id);
});
