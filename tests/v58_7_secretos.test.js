// V58.7 · Zonas secretas del mar y de la Luna, sus enemigos (paquete «enemigos secretos»), el Pulpo del Abismo y
// El Maestro Enojón (jefe de los pasillos de la escuela).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load, miniWorld, input } = require('./helpers');
const NS = load();
require('../js/app/art_secretos.js');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const EN = NS.Enemies, LV = NS.LEVELS;

/** Ancho y alto de un WebP leyendo su cabecera (VP8X, VP8L o VP8). */
function webpSize(file) {
  const b = fs.readFileSync(path.join(ROOT, file));
  assert.equal(b.toString('ascii', 0, 4), 'RIFF', file);
  assert.equal(b.toString('ascii', 8, 12), 'WEBP', file);
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}

test('atlas de los enemigos secretos y jefes nuevos: cuadros dentro del atlas y animaciones completas', () => {
  const A = NS.ART.ATLAS_FOES;
  const need = {
    pulpito: ['idle', 'swim', 'tentacle', 'death', 'shot'], buzito: ['idle', 'swim', 'throw', 'hurt', 'death', 'shot'],
    marciano: ['walk', 'shoot', 'hurt', 'death', 'shot'], astronino: ['idle', 'walk', 'throw', 'hurt', 'death', 'shot'],
    maestro: ['idle', 'walk', 'run', 'ruler', 'strike', 'book', 'eraser', 'shout', 'hurt', 'dizzy', 'fall', 'getup', 'ko', 'shot'],
    pulpo_abismo: ['idle', 'swim', 'windup', 'ko']
  };
  assert.deepEqual(Object.keys(A).sort(), Object.keys(need).sort());
  for (const [kind, anims] of Object.entries(need)) {
    const a = A[kind];
    assert.ok(EN.TYPES[kind], 'tipo de enemigo ' + kind);
    const [w, h] = webpSize(a.src);
    for (const [x, y, fw, fh] of a.frames) assert.ok(x >= 0 && y >= 0 && fw > 0 && fh > 0 && x + fw <= w && y + fh <= h, kind + ': cuadro fuera del atlas');
    for (const an of anims) {
      assert.ok(a.anims[an], kind + ' sin animación ' + an);
      const [list, ms, loop] = a.anims[an];
      assert.ok(list.length >= 1 && ms > 0 && (loop === 0 || loop === 1), kind + '.' + an);
      for (const i of list) assert.ok(i >= 0 && i < a.frames.length, kind + '.' + an + ': índice ' + i);
    }
    assert.ok(a.ref > 20 && (a.anchor === 'feet' || a.anchor === 'center'), kind + ': ancla y alto de referencia');
    // Los que caminan se anclan a los pies; los que nadan, al centro.
    assert.equal(a.anchor === 'feet', !!EN.TYPES[kind].walker, kind + ': ancla según cómo se mueve');
  }
  for (const bg of Object.values(NS.ART.SECRET_BG)) { const [w, h] = webpSize(bg.src); assert.ok(w > 1500 && h > 700, bg.src); }
});

test('la página carga los atlas antes del render y el service worker los guarda para jugar sin red', () => {
  const html = read('Se_Me_Fue_El_Camion.html'), sw = read('sw.js');
  const v = NS.CONFIG.version.split('.').slice(0, 2).join('.');
  assert.ok(html.indexOf('js/app/art_secretos.js?v=' + v) > 0 && html.indexOf('js/app/art_secretos.js') < html.indexOf('js/app/render.js'));
  assert.ok(sw.includes('"js/app/art_secretos.js?v=' + v + '"'));
  assert.match(sw, /\.\.\.V587/);
  const urls = [...Object.values(NS.ART.ATLAS_FOES).map((a) => a.src), ...Object.values(NS.ART.SECRET_BG).map((b) => b.src)];
  for (const u of urls) {
    assert.ok(fs.existsSync(path.join(ROOT, u)), u);
    const name = path.basename(u, '.webp');
    assert.ok(sw.includes("'" + name + "'"), 'el service worker precarga ' + u);
  }
});

/* ---------- IA ---------- */
function arena(extra = {}) {
  const W = miniWorld(Object.assign({ platforms: [{ x1: -700, x2: 700, y: 0 }] }, extra));
  W.shots = []; W.waters = [];
  return W;
}
function ctxFor(P, log) {
  return {
    active: () => true, onScreen: () => true, busy: false, jumpHeld: false,
    hurtbox: () => NS.util.bodyRect(P, 0.72, 0.86, P.h * 0.07), bodybox: () => NS.util.bodyRect(P, 0.72, 0.86, P.h * 0.07),
    hurt: (sx, sy, kind) => { if (P.invuln > 0) return false; P.invuln = 1.2; log.push({ sx, kind }); return true; }
  };
}
function stepFoes(W, P, ctx, n, onStep) {
  const ev = [];
  for (let i = 0; i < n; i++) { W.t += 1 / 60; EN.update(W, P, 1 / 60, ctx, ev); if (onStep) onStep(i, ev); }
  return ev;
}
// createPlayer(x, pies): Sofía parada con los pies en `y` (o flotando con su centro 31 u más arriba).
const still = (x, y) => { const P = NS.Physics.createPlayer(x, y); P.invuln = 99; return P; };

test('Maestro Enojón: avisa con la regla antes de embestir y queda mareado (vulnerable al DASH) al terminar', () => {
  const W = arena(), P = still(-110, 0), log = [];
  const f = EN.create('maestro', { x: 0, y: 0, plat: W.platforms[0], isBoss: true, hp: 6, bossName: 'EL MAESTRO ENOJÓN', rng: () => 0.75 });
  f.dir = -1; f.cool = 0; W.foes.push(f);
  const states = [];
  stepFoes(W, P, ctxFor(P, log), 150, () => states.push(f.state));
  const w = states.indexOf('windup'), c = states.indexOf('charge'), d = states.indexOf('dizzy');
  assert.ok(w >= 0 && c > w && d > c, 'regla (aviso) → embestida → mareo: ' + [...new Set(states)].join(','));
  assert.ok((c - w) / 60 >= EN.TYPES.maestro.windup - 0.02, 'el aviso dura lo que dice su tipo');
  assert.equal(EN.dashable(Object.assign({}, f, { state: 'dizzy' })), true, 'mareado, el DASH sí le hace daño');
  assert.equal(EN.dashable(Object.assign({}, f, { state: 'patrol' })), false);
  // De frente, durante el aviso, bloquea patada y dash (como los demás jefes que embisten).
  assert.equal(EN.bossArmored(Object.assign({}, f, { state: 'windup', dir: -1, x: P.x + 80 }), P), true);
  assert.equal(EN.bossArmored(Object.assign({}, f, { state: 'windup', dir: 1, x: P.x + 80 }), P), false, 'por la espalda sí recibe');
});

test('Maestro Enojón: de lejos alterna libro (en arco) y borrador (recto); enojado grita y manda dos ondas por el piso', () => {
  const W = arena(), P = still(-330, 0), log = [];
  const f = EN.create('maestro', { x: 0, y: 0, plat: W.platforms[0], isBoss: true, hp: 6, rng: () => 0.75 });
  f.dir = -1; f.cool = 0; W.foes.push(f);
  const kinds = [];
  stepFoes(W, P, ctxFor(P, log), 400, () => { for (const s of W.shots) if (!s.seen) { s.seen = true; kinds.push(s.kind); } });
  assert.ok(kinds.includes('libro') && kinds.includes('borrador'), 'lanzó libro y borrador: ' + kinds.join(','));
  for (let i = 1; i < kinds.length; i++) assert.notEqual(kinds[i], kinds[i - 1], 'alterna: ' + kinds.join(','));
  assert.ok(!kinds.includes('grito'), 'sin enojo no grita');
  // Enojado (media vida): grita con aviso y salen dos ondas, una a cada lado, que se acaban en la orilla de su piso.
  W.shots.length = 0; f.state = 'patrol'; f.cool = 0; f.enraged = true; f.shoutCD = 0; P.x = f.x - 200;
  const st = [], waves = [];
  stepFoes(W, P, ctxFor(P, log), 70, () => { st.push(f.state); for (const s of W.shots) if (s.kind === 'grito' && !waves.includes(s)) waves.push(s); });
  assert.equal(waves.length, 2, 'dos ondas');
  assert.deepEqual(waves.map((s) => Math.sign(s.vx)).sort(), [-1, 1]);
  assert.ok(st.filter((s) => s === 'shout').length / 60 >= EN.TYPES.maestro.shoutWindup - 0.02, 'el grito se anuncia');
  stepFoes(W, P, ctxFor(P, log), 300);
  assert.equal(W.shots.filter((s) => s.kind === 'grito').length, 0, 'las ondas no salen de su piso');
});

function sea(W) {
  // Mar abierto de prueba: el piso del arena queda muy abajo (dentro del agua no hay repisas donde choquen las piedras).
  for (const p of W.platforms) { p.y = 900; p.prevY = 900; }
  const z = { id: 'mar', x1: -800, x2: 800, y: -400, y2: 400, sea: true, deep: true, banks: [], drains: [] };
  W.waters.push(z);
  return z;
}
function swimmer(x, y, z) { const P = still(x, y); P.water = z; P.submerged = true; return P; }

test('Pulpo del Abismo: embiste solo tras su aviso y solo lastima durante la embestida; de lejos alterna tinta y chorro', () => {
  const W = arena(), z = sea(W), log = [];
  const f = EN.create('pulpo_abismo', { x: 0, y: 0, waterZone: z, lane: { x1: -600, x2: 600 }, isBoss: true, hp: 8, rng: () => 0.75 });
  f.cool = 0; f.dir = -1; W.foes.push(f);
  // Sofía pegada a él pero fuera de la embestida: tocarlo no la lastima.
  const P = swimmer(-60, 0, z);
  const states = [];
  stepFoes(W, P, ctxFor(P, log), 120, () => states.push(f.state));
  const w = states.indexOf('windup'), c = states.indexOf('charge');
  assert.ok(w >= 0 && c > w, 'aviso → embestida: ' + [...new Set(states)].join(','));
  assert.ok((c - w) / 60 >= EN.TYPES.pulpo_abismo.windup - 0.02);
  assert.ok(log.every((h) => h.kind === 'pulpo_abismo'), 'solo la embestida lastima');
  // De lejos: abanico de 3 tintas, luego un chorro (y al revés).
  const W2 = arena(), z2 = sea(W2), log2 = [];
  const g = EN.create('pulpo_abismo', { x: 300, y: 0, waterZone: z2, lane: { x1: -600, x2: 600 }, isBoss: true, hp: 8, rng: () => 0.75 });
  g.cool = 0; g.dir = -1; W2.foes.push(g);
  const P2 = swimmer(-150, 0, z2);
  const volleys = [];
  stepFoes(W2, P2, ctxFor(P2, log2), 420, (i, ev) => { if (ev.length && ev[ev.length - 1].type === 'shoot' && !ev[ev.length - 1].counted) { ev[ev.length - 1].counted = true; volleys.push(W2.shots.slice(-3).map((s) => s.kind).join('+')); } });
  assert.ok(volleys.length >= 2, 'disparó varias veces: ' + volleys.join(' | '));
  assert.ok(volleys.some((v) => v.includes('chorro')) && volleys.some((v) => v === 'tinta+tinta+tinta'), volleys.join(' | '));
});

test('pulpito: de cerca avisa y embiste; de lejos escupe tinta. Niño buzo: arroja piedras que se hunden y tocarlo no lastima', () => {
  const W = arena(), z = sea(W), log = [];
  const p = EN.create('pulpito', { x: 0, y: 0, waterZone: z, lane: { x1: -300, x2: 300 }, rng: () => 0.75 });
  p.cool = 0; p.dir = -1; W.foes.push(p);
  const P = swimmer(-90, 0, z);
  const st = [];
  stepFoes(W, P, ctxFor(P, log), 90, () => st.push(p.state));
  assert.ok(st.indexOf('windup') >= 0 && st.indexOf('charge') > st.indexOf('windup'), [...new Set(st)].join(','));
  const W2 = arena(), z2 = sea(W2), log2 = [];
  const q = EN.create('pulpito', { x: 0, y: 0, waterZone: z2, lane: { x1: -300, x2: 300 }, rng: () => 0.75 });
  q.cool = 0; q.dir = -1; W2.foes.push(q);
  stepFoes(W2, swimmer(-250, 0, z2), ctxFor(swimmer(-250, 0, z2), log2), 90);
  assert.ok(W2.shots.some((s) => s.kind === 'tinta'), 'de lejos, tinta');
  const W3 = arena(), z3 = sea(W3), log3 = [];
  const b = EN.create('buzito', { x: 0, y: 0, waterZone: z3, lane: { x1: -300, x2: 300 }, rng: () => 0.75 });
  b.cool = 0; b.dir = -1; W3.foes.push(b);
  // De lejos arroja una piedra que se hunde poco a poco y que sí lastima.
  const P3 = swimmer(-160, 31, z3); P3.invuln = 0;
  const stones = [];
  stepFoes(W3, P3, ctxFor(P3, log3), 80, () => { for (const s of W3.shots) if (s.kind === 'piedra_mar' && !stones.includes(s)) stones.push(s); });
  assert.ok(stones.length >= 1 && stones.every((s) => s.g > 0 && s.g < 200), 'piedra que se hunde poco a poco');
  assert.ok(log3.length >= 1 && log3.every((h) => h.kind === 'piedra_mar'), 'la piedra lastima: ' + log3.map((h) => h.kind).join(','));
  // Pegada a él (sin que arroje nada): el contacto no lastima.
  const W4 = arena(), z4 = sea(W4), log4 = [];
  const b2 = EN.create('buzito', { x: 0, y: 0, waterZone: z4, lane: { x1: -300, x2: 300 }, rng: () => 0.75 });
  b2.cool = 99; b2.spd = 0; W4.foes.push(b2);
  const P4 = swimmer(0, 31, z4); P4.invuln = 0;
  stepFoes(W4, P4, ctxFor(P4, log4), 60);
  assert.equal(log4.length, 0, 'tocar al niño buzo no lastima (solo sus piedras)');
});

test('marciano: dispara hacia donde estaba Sofía al empezar a cargar (se esquiva); el comandante enojado dispara dos', () => {
  const W = arena(), P = still(-250, 0), log = [];
  const m = EN.create('marciano', { x: 0, y: 0, plat: W.platforms[0], rng: () => 0.75 });
  m.cool = 0; m.dir = -1; W.foes.push(m);
  let aimAt = null, orb = null;
  stepFoes(W, P, ctxFor(P, log), 60, () => { if (m.state === 'aim' && aimAt === null) { aimAt = { x: P.x, y: P.y }; P.x = -120; } if (!orb) orb = W.shots.find((s) => s.kind === 'orbe') || null; });
  assert.ok(aimAt && orb, 'cargó y disparó');
  // La dirección del orbe apunta a la posición del aviso, no a donde Sofía se movió.
  const a = Math.atan2(orb.vy, orb.vx), toOld = Math.atan2(aimAt.y - (0 - m.h * 0.6), aimAt.x - (m.x + m.dir * m.w * 0.75));
  assert.ok(Math.abs(a - toOld) < 0.05, 'apunta a donde estaba');
  const W2 = arena(), P2 = still(-250, 0), log2 = [];
  const boss = EN.create('marciano', { x: 0, y: 0, plat: W2.platforms[0], isBoss: true, hp: 6, rng: () => 0.75 });
  boss.cool = 0; boss.dir = -1; boss.enraged = true; W2.foes.push(boss);
  const orbs = [];
  stepFoes(W2, P2, ctxFor(P2, log2), 60, () => { for (const s of W2.shots) if (s.kind === 'orbe' && !orbs.includes(s)) orbs.push(s); });
  assert.equal(orbs.length, 2, 'abanico de dos orbes');
  assert.ok(Math.abs(Math.atan2(orbs[0].vy, orbs[0].vx) - Math.atan2(orbs[1].vy, orbs[1].vx)) > 0.2, 'en direcciones distintas');
  // El niño astronauta usa la conducta del niño de las piedras, con su piedra lunar.
  const W3 = arena(), P3 = still(-250, 0), log3 = [];
  const k = EN.create('astronino', { x: 0, y: 0, plat: W3.platforms[0], rng: () => 0.75 });
  k.cool = 0; k.dir = -1; W3.foes.push(k);
  const rocks = [], seen = new Set();
  stepFoes(W3, P3, ctxFor(P3, log3), 80, () => { for (const s of W3.shots) if (s.kind === 'roca' && !seen.has(s)) { seen.add(s); rocks.push({ g: s.g, vy: s.vy }); } });
  assert.ok(rocks.length >= 1 && rocks.every((s) => s.g > 0 && s.vy < 0), 'piedra lunar en arco (sale hacia arriba y cae)');
});

/* ---------- Mundo ---------- */
test('cada mundo nuevo tiene una zona secreta: grieta escondida en una cornisa seca, salida de regreso y su jefe', () => {
  for (const [lvl, boss, kinds] of [[LV.SUBMARINO_LEVEL, 'pulpo_abismo', ['pulpito', 'buzito']], [LV.ESPACIAL_LEVEL, 'marciano', ['marciano', 'astronino']]]) {
    const W = NS.World.buildWorld({ levels: [lvl], difficulty: 'normal' });
    const rooms = W.rooms.filter((r) => r.secret);
    assert.equal(rooms.length, 1, lvl.id);
    const r = rooms[0], d = r.entry, ex = r.exit;
    assert.equal(d.kind, 'secreto'); assert.equal(d.region, 'main');
    assert.ok(d.plat && d.plat.kind === 'floor' && !d.plat.underwater && !d.plat.start && !d.plat.exit, 'cornisa seca y firme');
    assert.ok(d.x - 30 >= d.plat.x1 && d.x + 30 <= d.plat.x2, 'la grieta cabe en su cornisa');
    // Las demás puertas y la parada no se enciman con la grieta.
    for (const o of W.doors) if (o !== d && o.region === 'main') assert.ok(Math.abs(o.x - d.x) > 60 || Math.abs(o.y - d.y) > 8, 'puertas separadas');
    // Al salir se vuelve a la misma cornisa, junto a la grieta pero no encima (no se re-entra sin querer).
    assert.equal(ex.to.region, 'main');
    assert.ok(Math.abs(ex.to.y - d.y) < 1 && ex.to.x >= d.plat.x1 && ex.to.x <= d.plat.x2 && Math.abs(ex.to.x - d.x) >= 30);
    // Sus enemigos y su jefe viven en la zona.
    const foes = W.foes.filter((f) => f.region === r.id);
    const bosses = foes.filter((f) => f.isBoss);
    assert.equal(bosses.length, 1); assert.equal(bosses[0].kind, boss); assert.equal(bosses[0].secret, r.secret);
    for (const k of kinds) assert.ok(foes.some((f) => f.kind === k && !f.isBoss), lvl.id + ': ' + k);
    assert.ok(W.pickups.filter((p) => p.region === r.id && p.type === 'gem').length >= 12, 'cristales en la zona');
    assert.ok(W.pickups.some((p) => p.region === r.id && p.type === 'power' && p.power === 'heart'), 'corazón de premio');
    // No se encima con las zonas inferiores ni con el mundo.
    for (const o of W.rooms) if (o !== r) assert.ok(o.x2 + 100 < r.x1 || o.x1 > r.x2 + 100, 'zonas separadas');
    assert.ok(r.x1 > W.bounds.x2 + 500);
  }
  // V58.8: la escuela tiene sus aulas ocultas (tests/v58_8_aulas.test.js); Guadalajara no tiene zona secreta.
  assert.deepEqual(NS.World.buildWorld({ levels: LV.MISSIONS[0].levels }).rooms.filter((r) => r.secret).map((r) => r.secret), ['aulas']);
  assert.equal(NS.World.buildWorld({ levels: LV.MISSIONS[1].levels }).rooms.filter((r) => r.secret).length, 0);
});

test('santuario: mar cerrado de pared a pared, losas a flor de agua y techo con lugar para Sofía de pie', () => {
  const W = NS.World.buildWorld({ levels: [LV.SUBMARINO_LEVEL] });
  const r = W.rooms.find((q) => q.secret), z = W.waters.find((q) => q.room === r.id);
  assert.ok(z && z.sea && z.deep && !z.toStreet && Math.abs(z.x1 - r.x1) < 1 && Math.abs(z.x2 - r.x2) < 1 && Math.abs(z.y2 - r.y2) < 1);
  const arrive = W.platforms.find((p) => Math.abs(p.y - r.entry.to.y) < 1 && r.entry.to.x >= p.x1 && r.entry.to.x <= p.x2);
  assert.ok(arrive && Math.abs(arrive.y - (z.y - 2)) < 0.01, 'se llega a una losa justo sobre el agua');
  assert.ok(r.exit.plat && Math.abs(r.exit.plat.y - (z.y - 2)) < 0.01 && r.exit.plat.x1 > (r.x1 + r.x2) / 2, 'la salida es la losa del otro extremo');
  const ceil = W.solids.find((s) => s.kind === 'roomwall' && s.region === r.id && Math.abs(s.y2 - r.ceilY) < 0.5);
  assert.ok(ceil && arrive.y - ceil.y2 >= NS.CONFIG.player.h + 20, 'Sofía (62 u) cabe de pie bajo el techo de la cueva');
  // Los enemigos del santuario nadan en su mar (no en el mar principal).
  for (const f of W.foes.filter((q) => q.region === r.id)) assert.equal(f.waterZone, z, f.kind);
});

test('entrar a la zona secreta con BAJAR: se anuncia una vez, se guarda y al salir se vuelve junto a la grieta', () => {
  const saved = [];
  const G = NS.Game.createGame({ onSave: (s) => saved.push(JSON.parse(JSON.stringify(s))) });
  G.setView(844, 390);
  G.newRun({ mission: 2, startTramo: 0, difficulty: 'normal' });
  const W = G.world, P = G.P, d = W.doors.find((q) => q.kind === 'secreto');
  W.foes.forEach((f) => { if (f.region === 'main') f.dead = true; });
  P.x = d.x; P.y = d.y - P.h / 2; P.vx = 0; P.vy = 0; P.ground = d.plat;
  const score0 = G.run.score;
  G.step(1 / 60, input({ downPressed: true }));
  for (let i = 0; i < 40; i++) G.step(1 / 60, input());
  assert.equal(G.room && G.room.secret, 'santuario');
  assert.equal(G.run.secrets, 1);
  assert.equal(G.save.secrets.santuario, true);
  assert.ok(saved.some((s) => s.secrets && s.secrets.santuario), 'quedó guardado');
  assert.ok(G.run.score >= score0 + NS.CONFIG.scoring.secret, 'premio por descubrirla');
  const ev = G.drainEvents();
  assert.equal(ev.filter((e) => e.type === 'secretFound').length, 1);
  // Volver a entrar en la misma partida no la cuenta otra vez.
  const r = G.room, ex = r.exit;
  P.x = ex.x; P.y = ex.y - P.h / 2; P.vx = 0; P.vy = 0; P.ground = ex.plat; P.water = null;
  G.step(1 / 60, input({ downPressed: true }));
  for (let i = 0; i < 40; i++) G.step(1 / 60, input());
  assert.equal(G.region, 'main');
  assert.ok(Math.abs(P.x - ex.to.x) < 1 && Math.abs(P.y + P.h / 2 - ex.to.y) < 1, 'de vuelta junto a la grieta');
  P.x = d.x; P.y = d.y - P.h / 2; P.ground = d.plat; P.vx = 0; P.vy = 0;
  G.step(1 / 60, input({ downPressed: true }));
  for (let i = 0; i < 40; i++) G.step(1 / 60, input());
  assert.equal(G.run.secrets, 1, 'se cuenta una vez por partida');
  // El jefe secreto no cuenta como «jefe que faltó» en el resumen de la partida.
  G.drainEvents();
  G.run.lives = 1; P.invuln = 0; G.hurt(P.x + 10, P.y, 'prueba');
  for (let i = 0; i < 120 && G.state !== 'gameover'; i++) G.step(1 / 60, input());
  const over = G.drainEvents().find((e) => e.type === 'gameover');
  assert.ok(over, 'terminó la partida');
  assert.equal(over.summary.totalBosses, W.foes.filter((f) => f.isBoss && !f.secret).length);
  assert.equal(over.summary.totalBosses, 1, 'en el mar: solo Poseidón');
  assert.equal(over.summary.totalSecrets, 1);
  assert.equal(over.summary.secrets, 1);
});

test('El Maestro Enojón es el jefe de los pasillos de la escuela (antes el Perro Guardián)', () => {
  const def = LV.LEVEL_SEQUENCE.find((d) => d.id === 'escuela_ruinas');
  assert.deepEqual(def.boss, { kind: 'maestro', name: 'EL MAESTRO ENOJÓN', hp: 6 });
  const W = NS.World.buildWorld({ levels: LV.MISSIONS[0].levels });
  const m = W.foes.find((f) => f.kind === 'maestro');
  assert.ok(m && m.isBoss && m.region === 'main' && m.scene === 2 && m.arena && m.arena.w >= 200);
  assert.ok(!W.foes.some((f) => f.isBoss && f.kind === 'bravo'), 'ya no hay perro guardián en la misión 1');
});

test('los jefes de las zonas secretas se pueden vencer (bot con la física y la IA reales)', () => {
  const NONE = input();
  for (const mission of [2, 3]) {
    const G = NS.Game.createGame({}); G.setView(844, 390); G.newRun({ mission, startTramo: 0, difficulty: 'normal' });
    const W = G.world, room = W.rooms.find((r) => r.secret), boss = room.boss, P = G.P;
    W.foes = [boss]; G.run.lives = 99; G.run.maxLives = 99;
    const d = room.entry; P.x = d.x; P.y = d.y - P.h / 2; P.ground = d.plat;
    G.step(1 / 60, input({ downPressed: true }));
    for (let i = 0; i < 40; i++) G.step(1 / 60, NONE);
    assert.equal(G.room, room);
    const swim = !!boss.waterZone;
    const toDeck = () => { const pl = boss.plat; P.x = pl.x1 + 30; P.y = pl.y - P.h / 2; P.vx = P.vy = 0; P.ground = pl; };
    if (!swim) toDeck();   // la subida a la cubierta la comprueba el análisis de alcanzabilidad (v53)
    let t = 0;
    while (!boss.dead && t < 90 && G.state === 'playing') {
      const inp = input(), dx = boss.x - P.x, dir = Math.sign(dx) || 1, adx = Math.abs(dx);
      if (swim) {
        const dy = boss.y - P.y;
        if (boss.state === 'dizzy') {
          inp[dir > 0 ? 'right' : 'left'] = true;
          if (dy > 10) inp.downHeld = true; else if (dy < -10) inp.upHeld = true;
          if (adx < 75 && Math.abs(dy) < 45) { P.face = dir; inp.kickPressed = true; }
          else if (adx < 190 && Math.abs(dy) < 45 && P.dashCD <= 0) inp.dashPressed = true;
        } else if (boss.state === 'windup' || boss.state === 'charge') {
          if (dy > 0) inp.upHeld = true; else inp.downHeld = true;
          if (boss.state === 'charge' && adx < 160) inp[dir > 0 ? 'left' : 'right'] = true;
        } else {
          if (adx > 210) inp[dir > 0 ? 'right' : 'left'] = true; else if (adx < 130) inp[dir > 0 ? 'left' : 'right'] = true;
          const near = W.shots.find((s) => Math.hypot(s.x - P.x, s.y - P.y) < 110);
          if (near) { if (near.y > P.y) inp.upHeld = true; else inp.downHeld = true; }
          else if (dy > 20) inp.downHeld = true; else if (dy < -20) inp.upHeld = true;
        }
      } else {
        const near = W.shots.find((s) => Math.abs(s.x - P.x) < 90 && Math.abs(s.y - P.y) < 60);
        if (near && P.ground) { inp.jumpPressed = true; inp.jumpHeld = true; }
        else if (adx > 60) inp[dir > 0 ? 'right' : 'left'] = true;
        else { P.face = dir; inp.kickPressed = true; }
        if (P.y > boss.plat.y + 200) toDeck();
      }
      G.step(1 / 60, inp); t += 1 / 60;
    }
    assert.ok(boss.dead, room.secret + ': ' + boss.kind + ' vencido (quedó con ' + boss.hp + ' de vida tras ' + t.toFixed(0) + ' s)');
    assert.equal(G.run.secretBosses, 1); assert.equal(G.run.bosses, 0, 'cuenta como jefe secreto, no como jefe del nivel');
  }
});
