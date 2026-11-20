// V58.2 · El mar completamente submarino (solo la isla en seco), cuerdas para columpiarse, el niño de las piedras en
// los cuatro mundos, pulpo y Poseidón con los atlas aportados y la cinemática de la llegada al mar (Sofía asombrada +
// recuerdo con su papito Estoker + los peligros del nivel).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load, miniWorld, input, run } = require('./helpers');
const NS = load(), LV = NS.LEVELS, C = NS.CONFIG;
require('../js/core/toxifamilia.js');
const T = NS.TOXIFAMILIA;
const DT = 1 / 60;
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const NONE = { left: false, right: false, jumpPressed: false, jumpHeld: false, dashPressed: false, downPressed: false, upHeld: false, downHeld: false };
const inp = (o) => Object.assign({}, NONE, o || {});
function game(mission) {
  const G = NS.Game.createGame({});
  G.setView(844, 390);
  G.newRun({ mission, startTramo: 0, difficulty: 'normal' });
  return G;
}
/** Listas de precarga del service worker (sin ejecutar sus manejadores). */
function swAssets() {
  const src = read('sw.js').replace(/self\.addEventListener[\s\S]*$/, '');
  const L = new Function(src + '; return {CODE,SHELL,SCENES,ART,CAT_FRAMES,SUB_FRAMES,NINA_VARIANTS,V58_ART,DEPTH_ART,CAST,V582,CACHE};')();
  const all = [...L.CODE, ...L.SHELL, ...L.SCENES, ...L.ART, ...L.CAT_FRAMES, ...L.SUB_FRAMES, ...L.NINA_VARIANTS, ...L.V58_ART, ...L.DEPTH_ART, ...L.CAST, ...L.V582];
  return { cache: L.CACHE, files: new Set(all.map((u) => u.split('?')[0])) };
}

test('cuerda: se agarra en el aire, se columpia y al soltarla con SALTAR cruza un hueco de 340 u', () => {
  const G = 340, L = 160, R = C.rope;
  const W = miniWorld({ platforms: [{ x1: -300, x2: 60, y: 0 }, { x1: 60 + G, x2: 460 + G, y: 0 }, { x1: -600, x2: 1600, y: 300 }] });
  const ay = 0 - C.player.h - R.hang - 110 - 0.65 * L;   // regla de colocación de las cuerdas del juego
  W.ropes = [NS.Physics.makeRope(60 + G / 2, ay, L, { id: 'r' })]; W.zips = [];
  let crossings = 0, grabbedEver = false, hurtWhileHanging = false;
  for (let k = 5; k <= 90; k += 3) {
    const P = NS.Physics.createPlayer(40, 0); P.ground = W.platforms[0];
    let grabbed = -1, landed = null;
    run(NS, P, W, 240, (i) => input({ right: true, jumpPressed: i === 4 || (grabbed >= 0 && i === grabbed + k),
      jumpHeld: (i >= 4 && i < 20) || (grabbed >= 0 && i >= grabbed + k && i < grabbed + k + 15) }), DT, (i, ev) => {
      for (const e of ev) {
        if (e.type === 'ropeGrab' && grabbed < 0) grabbed = i;
        if (e.type === 'land' && !landed) landed = e.plat;
        if (e.type === 'hurt' && P.rope) hurtWhileHanging = true;
      }
    });
    if (grabbed >= 0) grabbedEver = true;
    if (landed === W.platforms[1]) crossings++;
  }
  assert.ok(grabbedEver, 'la mano agarra la cuerda en el aire');
  assert.ok(crossings >= 3, 'cruza al soltarse en varios momentos del columpio: ' + crossings);
  assert.ok(!hurtWhileHanging, 'colgada no se acumula daño de caída');
});

test('el mar es completamente submarino: solo la isla está en seco y a la salida se llega nadando', () => {
  const G = game(2), W = G.world, P = G.P;
  const sea = W.waters.find((z) => z.sea && z.toStreet);
  assert.ok(sea, 'hay mar abierto que llega hasta la calle (la salida)');
  assert.ok(P.y + P.h / 2 < sea.y, 'Sofía empieza en la isla, sobre el mar');
  const under = W.platforms.filter((p) => p.y > sea.y + 40 && p.x1 >= sea.x1 && p.x2 <= sea.x2 && p !== W.street);
  assert.ok(under.length >= 10, 'hay repisas bajo el agua: ' + under.length);
  assert.ok(under.every((p) => p.underwater), 'toda repisa bajo la superficie está sumergida (no se camina en seco)');
  const g = W.goal;
  assert.ok(g.x1 < sea.x2 && g.x2 > sea.x1 && g.y2 > sea.y, 'la salida está dentro del mar');
  assert.ok(W.ropes.length >= 1, 'el mar tiene su liana');
});

test('cuerdas para columpiarse en el mar, la Luna y la escuela; tirolesas en los cuatro mundos', () => {
  const ropes = {}, zips = {};
  for (let m = 0; m < 4; m++) { const W = game(m).world; ropes[m] = W.ropes.length; zips[m] = W.zips.length; }
  assert.ok(ropes[0] >= 4, 'escuela: columpios ' + ropes[0]);
  assert.ok(ropes[2] >= 1, 'mar: liana ' + ropes[2]);
  assert.ok(ropes[3] >= 4, 'Luna: cables ' + ropes[3]);
  for (let m = 0; m < 4; m++) assert.ok(zips[m] >= 1, 'tirolesas en la misión ' + (m + 1) + ': ' + zips[m]);
});

test('el niño de las piedras está en los cuatro mundos (de buzo en el mar, de astronauta en la Luna)', () => {
  for (let m = 0; m < 4; m++) {
    const kids = game(m).world.foes.filter((f) => f.kind === 'kid' && !f.dead);
    assert.ok(kids.length >= 1, 'misión ' + (m + 1) + ': niños ' + kids.length);
  }
  assert.ok(LV.SUBMARINO_LEVEL.foes.includes('kid'));
  const r = read('js/app/render.js');
  assert.ok(r.includes("fTheme === 'submarino' ? 'kid_buzo'") && r.includes("'kid_astronauta'"), 'traje según el mundo');
});

test('el pulpo infla y lanza tinta a Sofía cuando nada en su mar; el DASH la rompe; Poseidón es el jefe', () => {
  const G = game(2), W = G.world, P = G.P;
  const boss = W.foes.find((f) => f.isBoss);
  assert.equal(boss.kind, 'poseidon');
  assert.equal(LV.SUBMARINO_LEVEL.boss.hp, 8);
  const pulpo = W.foes.find((f) => f.kind === 'pulpo' && f.waterZone);
  W.foes.forEach((f) => { if (f !== pulpo) f.dead = true; });
  pulpo.cool = 0;
  P.x = pulpo.x + 110; P.y = pulpo.y; P.vx = 0; P.vy = 0; P.ground = null; P.invuln = 99;
  G.updateCamera(0, true); G.drainEvents();
  let ink = null;
  for (let i = 0; i < 180 && !ink; i++) {
    P.x = pulpo.x + 110; P.y = pulpo.y; P.vy = 0;
    G.step(DT, inp());
    ink = W.shots.find((s) => s.kind === 'ink' && s.from === pulpo.id);
  }
  assert.ok(ink, 'el pulpo lanzó tinta');
  // La tinta llega a Sofía mientras hace DASH: se rompe y no la lastima.
  P.invuln = 0; P.dashT = 0.2; ink.x = P.x; ink.y = P.y; ink.vx = 0; ink.vy = 0;
  const hp0 = P.hp, score0 = G.run.score;
  G.drainEvents();
  G.step(DT, inp());
  const ev = G.drainEvents();
  assert.ok(!W.shots.includes(ink), 'la tinta desapareció');
  assert.ok(!ev.some((e) => e.type === 'hurt') && P.hp === hp0, 'no la lastimó');
  assert.equal(G.run.score - score0 >= C.scoring.shotBreak, true, 'puntos por romperla con el DASH');
});

test('atlas marinos: cada cuadro recortado se coloca dentro de su celda en su `origin` (no en `sourceCrop`)', () => {
  const r = read('js/app/render.js');
  const A = JSON.parse(r.match(/const MARINE_ART = (\{.*\});/)[1]);
  for (const [kind, art] of Object.entries(A)) {
    const [cw, ch] = art.cell;
    for (const [x, y, w, h, ox, oy] of art.frames) {
      assert.ok(ox >= 0 && oy >= 0 && ox + w <= cw && oy + h <= ch, kind + ': cuadro fuera de su celda');
      assert.equal(ox, x % cw, kind + ': posición en la celda'); assert.equal(oy, y % ch, kind + ': posición en la celda');
    }
    assert.ok(fs.existsSync(path.join(ROOT, 'assets/enemies/marinos', art.src + '.webp')));
  }
  assert.deepEqual(A.shark.frames[1].slice(4), [51, 36]);
});

test('cinemática de la llegada al mar: presente en la isla, recuerdo con Estoker y los peligros del nivel', () => {
  const S = T.validate(T.MARINO);
  assert.equal(S.length, 6);
  const [llegada, ...resto] = S, regreso = S[S.length - 1];
  // Presente: Sofía llega sorprendida y confundida; su vestuario sigue el del menú.
  assert.match(llegada.background, /fondo_isla_cima/);
  assert.ok(!llegada.fxList.includes('recuerdo') && !regreso.fxList.includes('recuerdo'), 'llegada y regreso son el presente');
  const sofia = llegada.cast.find((a) => a.name === 'SOFÍA');
  assert.deepEqual(Object.keys(sofia.looks).sort(), ['original', 'rosa', 'uniforme']);
  assert.ok(llegada.lines.some((l) => /dónde estoy/i.test(l.text)), 'confundida');
  assert.ok(llegada.lines.some((l) => /conocido/i.test(l.text)), 'el lugar se le hace conocido');
  // Recuerdo: los paseos con su papito Estoker cuando era más pequeña, en esa misma playa.
  const recuerdo = resto.slice(0, 4);
  assert.ok(recuerdo.every((s) => s.fxList.includes('recuerdo')), 'las escenas del recuerdo llevan el tono de memoria');
  assert.match(recuerdo[0].tag, /MÁS PEQUEÑA/);
  assert.ok(recuerdo[0].cast[0].frames.every((f) => /paseo_mano/.test(f)), 'caminan de la mano');
  const dichos = recuerdo.flatMap((s) => s.lines).filter((l) => l.who === 'PAPITO ESTOKER').map((l) => l.text).join(' ');
  for (const peligro of [/tiburones/i, /pirañas/i, /pulpo/i, /cangrejos/i, /Poseidón/, /niño de las piedras/i]) assert.match(dichos, peligro);
  // Consejos iguales a los del juego.
  assert.match(dichos, /mareado/); assert.match(dichos, /DASH/);
  assert.ok(regreso.lines.some((l) => /gracias, papito/i.test(l.text)));
  // Archivos: existen y el service worker los precarga (se ve sin conexión).
  const files = T.assetsOf(T.MARINO), sw = swAssets();
  assert.ok(files.length >= 100);
  for (const f of files) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), 'falta ' + f);
    assert.ok(sw.files.has(f), 'sin precarga ' + f);
  }
  assert.equal(sw.cache, 'camion-v58-2-llegada-al-mar');
});

test('la llegada al mar se ve la primera vez que empieza la misión 3 y se repite desde el menú', () => {
  const m = read('js/app/main.js');
  assert.match(m, /mission === 2 && tramo === 0 && opt\.cinematics && !marineCineSeen\(\)/, 'solo la primera vez y si las cinemáticas están activas');
  assert.match(m, /play\(\{ set: 'marino', look: opt\.ninaLook/, 'usa el vestuario elegido');
  assert.match(m, /'camion-cinematic-seen', MARINE_CINE_KEY\]/, 'BORRAR PROGRESO la vuelve a mostrar');
  assert.match(m, /camion:toxiplayer-ready/, 'el menú se entera cuando el reproductor ya cargó');
  const p = read('js/app/toxifamilia_cinematic.js');
  assert.match(p, /SETS\.marino = manifest\.validate\(manifest\.MARINO/);
  assert.match(p, /menuButton\('btnMarino'/);
  assert.match(p, /dispatchEvent\(new CustomEvent\('camion:toxiplayer-ready'\)\)/);
});

test('el validador del guion rechaza reparto y diálogos inválidos', () => {
  const base = () => ({ id: 'x', title: 'X', text: '', layout: 'dialogo', lines: [{ who: 'SOFÍA', tone: 'sofia', text: 'Hola' }],
    cast: [{ name: 'A', frames: ['assets/cinematica/marino/paseo_mano_00.webp', 'assets/cinematica/marino/paseo_mano_01.webp'], anim: [{ f: [0, 1], ms: 1000 }] }] });
  assert.doesNotThrow(() => T.validate([base()]));
  const bad = (fn) => { const s = base(); fn(s); return () => T.validate([s]); };
  assert.throws(bad((s) => { s.cast[0].anim[0].f = [2]; }), /paso invalido/);
  assert.throws(bad((s) => { s.cast[0].frames = ['../fuera.png']; }), /cuadros invalidos/);
  assert.throws(bad((s) => { s.lines[0].tone = 'gritos'; }), /linea invalida/);
  assert.throws(bad((s) => { s.fx = ['recuerdo', 'fuego']; }), /efecto invalido/);
  assert.throws(bad((s) => { s.layout = 'otro'; }), /acomodo invalido/);
  assert.throws(bad((s) => { s.cast[0].looks = { original: s.cast[0].frames, morado: s.cast[0].frames }; }), /vestuarios invalidos/);
  // La duración de una escena de diálogo sale de sus líneas.
  const ok = T.validate([base()])[0];
  assert.equal(ok.durationMs, T.lineMs({ text: 'Hola' }));
});

test('al encontrar un enemigo nuevo maúlla el otro gato; las gatas ayudan con animación propia', () => {
  const m = read('js/app/main.js'), a = read('js/app/audio.js'), r = read('js/app/render.js'), g = read('js/core/game.js');
  assert.match(m, /case 'enemyDiscovered':[\s\S]{0,400}audio\.sfx\('otroGato'\)/);
  assert.ok(a.includes('otroGato'));
  assert.ok(g.includes("mode = 'pounce'") && g.includes("'fetch'") && g.includes('catStrike'), 'Luna salta sobre el enemigo y Morita va por los cristales');
  assert.ok(r.includes('MIAU') && r.includes('FSSS'), 'zarpazo y bufido dibujados');
});
