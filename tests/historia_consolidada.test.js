// V58.8.30 · Historia consolidada de principio a fin: Sofía viste en cada cinemática lo mismo que al jugar ese mundo,
// los jefes de las cinemáticas son los mismos con los que se pelea y no hay saltos de hora ni de lugar sin explicar.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./helpers');
const NS = load();
require('../js/core/toxifamilia.js');
const M = NS.TOXIFAMILIA;
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const scene = (set, id) => M.validate(M[set]).find((s) => s.id === id);
const sofia = (s) => s.cast.find((a) => /SOF[IÍ]A/.test(a.name));

test('ropa de calle: en Guadalajara, el mercado y el epílogo sigue la opción del menú, igual que al jugar', () => {
  for (const [set, id] of [['SCENES', 'e2_mercado'], ['SCENES', 'e2_voz'], ['SCENES', 'e2_usb'], ['GDL_TRANSITION', 'gdl_llegada'], ['EPILOGUE', 'pc_reja']]) {
    const a = sofia(scene(set, id));
    assert.ok(a.looks && a.looks.original && a.looks.rosa, id + ': sigue la ropa elegida');
    assert.match(a.looks.original[0], /^assets\/player\/sofia\//, id);
    assert.match(a.looks.rosa[0], /^assets\/player\/variants\/rosa\//, id);
    assert.equal(path.basename(a.looks.original[0]), path.basename(a.looks.rosa[0]), id + ': misma pose en las dos ropas');
  }
  // La escuela, en uniforme (como al jugar la escuela).
  for (const id of ['esc_aula_inicio', 'e3_start']) assert.ok(sofia(scene('SCENES', id)).frames || sofia(scene('SCENES', id)).sprite);
  assert.match((sofia(scene('SCENES', 'e3_start')).sprite || ''), /variants\/uniforme\//);
  assert.match(sofia(scene('GDL_TRANSITION', 'gdl_salida')).frames[0], /variants\/uniforme\//);
  // El cambio de ropa se cuenta en la llegada al centro (narración, sin diálogo atribuido al guion).
  const llegada = scene('GDL_TRANSITION', 'gdl_llegada');
  assert.equal(llegada.lines, null); assert.match(llegada.text, /uniforme/);
  // Así juega Sofía cada mundo (render.js): escuela = uniforme, Luna = astronauta, el resto = ropa de calle.
  const render = read('js/app/render.js');
  assert.match(render, /theme === 'espacial' \? 'astronauta' : theme === 'escuela' \? 'uniforme' : casualLook\(\)/);
  // La transición a Guadalajara se reproduce con la ropa del menú y el reproductor ya no deja pegado un vestuario.
  assert.match(read('js/app/main.js'), /set: 'guadalajara', look: opt\.ninaLook/);
  const player = read('js/app/toxifamilia_cinematic.js');
  assert.match(player, /look = typeof o\.look === 'string' \? o\.look : menuLook;/);
  assert.doesNotMatch(player, /play\(\{ set: 'guadalajara', look \}\)/);
});

test('jefes: las cinemáticas muestran el mismo arte con el que se pelea', () => {
  const templo = scene('MARINO', 'm5_templo').cast.find((a) => a.name === 'POSEIDÓN');
  assert.ok(templo.frames.every((f) => /poseidon_rey_0[0-5]\.webp$/.test(f)));
  for (const f of templo.frames) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  const ui = read('js/app/ui.js');
  assert.match(ui, /poseidon_rey_0/); assert.doesNotMatch(ui, /poseidon_tridente_0/);
  assert.match(ui, /drone: \{\s*kind: 'drone', saveIndex: 3/);
  for (let i = 0; i < 3; i++) assert.ok(fs.existsSync(path.join(ROOT, 'assets/cinematica/espacio/emperador_0' + i + '.webp')));
  // El Emperador se anuncia antes de la Luna (por radio) y es el jefe que custodia el módulo.
  const orbita = scene('ESPACIO', 'orbita_estacion');
  assert.ok(orbita.lines.some((l) => /Emperador Marciano/.test(l.text)));
  assert.match(NS.STORY.CHAPTERS[17].line, /Emperador Marciano/);
  const espacial = NS.LEVELS.MISSIONS.find((m) => m.id === 'espacial').levels[0];
  assert.equal(espacial.boss.name, 'EMPERADOR MARCIANO');
  // Todo lo que muestran las cinemáticas está en el precache.
  const sw = read('sw.js');
  assert.match(sw, /marSeq\('poseidon_rey',6\)/); assert.match(sw, /cinematica\/espacio\/emperador_0/);
});

test('hilo de la historia: cada misión termina donde empieza la siguiente', () => {
  const end = (id) => {
    const G = NS.Game.createGame({}); G.setView(1280, 720);
    G.newRun({ mission: NS.LEVELS.MISSIONS.findIndex((m) => m.id === id), difficulty: 'normal' });
    return NS.STORY.ending(0, G.world.totalItems, 3, id);
  };
  assert.match(end('submarino').text, /escotilla/);           // → la cápsula (esp_capsula)
  assert.match(scene('ESPACIO', 'esp_capsula').lines[0].text, /escotilla/);
  assert.match(end('espacial').text, /Tierra/);              // → el regreso (pf_regreso)
  assert.match(scene('PARAFALLS', 'pf_regreso').lines[0].text, /módulo de regreso/);
  assert.match(end('parafalls').text, /Puente Grande/);      // → el epílogo en Puente Grande
  assert.match(scene('EPILOGUE', 'pc_reja').tag, /PUENTE GRANDE/);
  // Doña Tóxica promete esperar a Sofía donde de verdad aparece (Puente Grande), no «del otro lado de la barranca».
  const promesas = [...M.validate(M.CALZADA), ...M.validate(M.CALZADA_FIN)].flatMap((sc) => sc.lines || []).filter((l) => l.who === 'DOÑA TÓXICA').map((l) => l.text);
  assert.ok(promesas.some((t) => /Puente Grande: ahí te espero/.test(t)));
  assert.ok(promesas.every((t) => !/otro lado de la barranca/.test(t)));
  assert.doesNotMatch(read('js/app/main.js'), /te espera Doña Tóxica/);
  // Parafalls con la Sofía Roblox oficial (la de la hoja de transformación) después de transformarse.
  for (const id of ['pf_guardianes', 'pf_llegada']) assert.match(sofia(scene('PARAFALLS', id)).sprite, /sofia_roblox_12\.webp$/);
  // Guadalajara termina en la Ruta 6 y anuncia la Calzada (ya no «van a casa»).
  for (const n of [0, 2, 3]) {
    const e = NS.STORY.ending(n, 3, 3, 'guadalajara');
    assert.match(e.text, /Calzada/); assert.doesNotMatch(e.text, /a casa|luz de día/);
  }
  // Sin horas que contradigan la historia (todo pasa esa noche, antes de la medianoche).
  const labels = NS.LEVELS.MISSIONS.flatMap((m) => m.levels.map((d) => d.label || ''));
  const chapters = NS.STORY.CHAPTERS.map((c) => c.line + ' ' + c.driver);
  for (const t of [...labels, ...chapters]) assert.doesNotMatch(t, /amanecer|atardecer/i, t);
});
