const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const NS = require('./helpers').load();
const ROOT = path.join(__dirname, '..');
const mission = NS.LEVELS.MISSIONS.find((m) => m.id === 'parafalls');
const assets = 'assets/scenes/waterfalls/parafalls_v2/';

function webpSize(file) {
  const b = fs.readFileSync(file);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  assert.equal(b.toString('ascii', 8, 12), 'WEBP');
  for (let p = 12; p + 8 <= b.length;) {
    const type = b.toString('ascii', p, p + 4), n = b.readUInt32LE(p + 4), q = p + 8;
    if (type === 'VP8X' && n >= 10) return [b.readUIntLE(q + 4, 3) + 1, b.readUIntLE(q + 7, 3) + 1];
    if (type === 'VP8 ' && n >= 10 && b[q + 3] === 0x9d && b[q + 4] === 1 && b[q + 5] === 0x2a) return [b.readUInt16LE(q + 6) & 0x3fff, b.readUInt16LE(q + 8) & 0x3fff];
    if (type === 'VP8L' && n >= 5) { const bits = b.readUInt32LE(q + 1); return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1]; }
    p = q + n + (n & 1);
  }
  throw new Error(`WebP sin dimensiones reconocibles: ${file}`);
}

test('Parafalls V2: tres escenas y seis capas RGBA existen y las páginas conservan su tamaño fuente', () => {
  assert.ok(mission, 'misión registrada');
  assert.equal(mission.levels.length, 3);
  for (let i = 1; i <= 3; i++) {
    const scene = `${assets}scene_0${i}.webp`;
    assert.deepEqual(webpSize(path.join(ROOT, scene)), [941, 1672]);
    assert.ok(mission.levels[i - 1].map.worldArt.pages.includes(`scene_0${i}.webp`));
    for (const layer of ['atmosphere', 'foreground']) {
      const file = path.join(ROOT, assets, 'depth', `${layer}_0${i}.webp`);
      assert.ok(fs.existsSync(file) && fs.statSync(file).size > 10_000, `${layer} página ${i}`);
      assert.deepEqual(webpSize(file), [941, 1672]);
    }
  }
  const html = fs.readFileSync(path.join(ROOT, 'Se_Me_Fue_El_Camion.html'), 'utf8');
  assert.ok(html.indexOf('js/core/parafalls_data.js') < html.indexOf('js/core/levels.js'), 'datos cargados antes del registro de niveles');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  for (let i = 1; i <= 3; i++) {
    assert.ok(sw.includes(`${assets}scene_0${i}.webp`), `precarga escena ${i}`);
    for (const layer of ['atmosphere', 'foreground']) assert.ok(sw.includes(`${assets}depth/${layer}_0${i}.webp`), `precarga ${layer} ${i}`);
  }
});

test('Parafalls: el prólogo distingue la campaña principal de la misión adicional', () => {
  const ui = fs.readFileSync(path.join(ROOT, 'js/app/ui.js'), 'utf8');
  assert.match(ui, /Parafalls, una misión adicional/);
  assert.match(ui, /todos los demás tramos están disponibles desde el menú/);
  assert.doesNotMatch(ui, /Cruza cuatro misiones/);
});

test('Parafalls V2: trazado y puntos de control están en el arte y con hitboxes no dibujadas', () => {
  assert.ok(mission);
  for (let i = 0; i < 3; i++) {
    const level = mission.levels[i], map = level.map, trace = NS.LEVELS.PARAFALLS_DATA;
    assert.equal(map.worldArt.width, 941);
    assert.equal(map.worldArt.pageH, 1672);
    assert.ok(level.seamlessPainted);
    const starts = map.surfaces.filter((s) => s.start), exits = map.surfaces.filter((s) => s.exit);
    assert.equal(starts.length, 1, `inicio único página ${i + 1}`);
    assert.equal(exits.length, 1, `salida única página ${i + 1}`);
    const declared = trace.platforms.filter((p) => p.page === i + 1);
    assert.equal(map.surfaces.length, declared.length, 'el runtime no duplica las plataformas declaradas');
    assert.ok(map.surfaces.every((s) => s.x1 >= 0 && s.x2 <= map.width && s.x2 > s.x1 && Number.isFinite(s.y)), 'todas las hitboxes quedan dentro de la ilustración');
    assert.ok(map.surfaces.every((s) => !s.gen), 'todas las hitboxes del mapa son geometría fuente revisada');
    assert.ok(declared.length > 10);
    for (const p of declared) {
      const surface = map.surfaces.find((s) => Math.abs(s.x1 - Math.round(p.x * 1.2)) <= 1 && Math.abs(s.y - Math.round((p.y - i * 1672) * 1.2)) <= 1);
      assert.ok(surface, `plataforma ${p.id} transformada exactamente desde la fuente`);
    }
  }
});

test('Parafalls V2: el runtime inicia en cada checkpoint con física real y no genera escaleras entre láminas', () => {
  assert.ok(mission);
  const G = NS.Game.createGame({});
  G.setView(390, 844);
  G.newRun({ mission: NS.LEVELS.MISSIONS.indexOf(mission), difficulty: 'normal', seed: 821 });
  assert.equal(G.world.scenes.length, 3);
  assert.equal(G.world.scenes.map((s) => s.def.id).join(','), 'parafalls_1,parafalls_2,parafalls_3');
  assert.equal(G.world.checkpoints.length, 3);
  assert.ok(!G.world.platforms.some((p) => p.transition), 'no se generan peldaños artificiales entre escenas pintadas');
  for (let i = 0; i < 3; i++) {
    const cp = G.world.checkpoints[i];
    assert.equal(cp.scene, i);
    assert.equal(cp.plat, G.world.scenes[i].startPlatform);
    assert.ok(G.world.scenes[i].surfaces.every((s) => s.hidden && !s.draw), 'las colisiones pintadas permanecen invisibles en gameplay');
    assert.ok(G.world.scenes[i].surfaces.some((s) => s === G.world.scenes[i].exitPlatform && s.exit));
  }
  assert.equal(G.P.ground, G.world.checkpoints[0].plat);
  for (let i = 0; i < 180; i++) G.step(1 / 60, { left: false, right: false, jumpPressed: false, jumpHeld: false, dashPressed: false, downPressed: false });
  assert.equal(G.P.ground, G.world.checkpoints[0].plat, 'Sofía permanece apoyada con el timestep real');
  assert.ok(Number.isFinite(G.P.x) && Number.isFinite(G.P.y));
  assert.ok(G.world.scenes.every((s) => s.def.storyIndex >= 18 && s.def.storyIndex <= 20));
});

test('Parafalls V2: las salidas y los checkpoints son alcanzables con saltos/caídas de la física real', () => {
  assert.ok(mission);
  const G = NS.Game.createGame({}); G.setView(390, 844);
  G.newRun({ mission: NS.LEVELS.MISSIONS.indexOf(mission), difficulty: 'normal', seed: 821 });
  const W = G.world, platforms = W.platforms.filter((p) => p.hidden && p.scene < 3);
  const outgoing = (src) => {
    const found = new Set();
    for (const fraction of [0.2, 0.5, 0.8]) for (const dir of [-1, 0, 1])
      for (const hold of [0, 20, 40, 70, 100]) for (const jump of [false, true]) {
        const P = NS.Physics.createPlayer(src.x1 + (src.x2 - src.x1) * fraction, src.y); P.ground = src;
        for (let t = 0; t < 240; t++) {
          NS.Physics.updatePlatforms(W, W.t + (t + 1) / 60, 1 / 60);
          NS.Physics.stepPlayer(P, W, { left: dir < 0 && t < hold, right: dir > 0 && t < hold,
            jumpPressed: jump && t === 0, jumpHeld: jump && t < 24, downPressed: false, dashPressed: false }, 1 / 60, []);
          if (P.ground && P.ground !== src) { if (platforms.includes(P.ground)) found.add(P.ground); break; }
          if (P.y > src.y + 1200 || P.x < W.bounds.x1 - 100 || P.x > W.bounds.x2 + 100) break;
        }
      }
    return [...found];
  };
  const reached = new Set([W.scenes[0].startPlatform]), queue = [W.scenes[0].startPlatform];
  while (queue.length) for (const next of outgoing(queue.shift())) if (!reached.has(next)) { reached.add(next); queue.push(next); }
  assert.ok(W.scenes.every((scene) => reached.has(scene.exitPlatform)), 'las tres salidas se alcanzan desde el checkpoint inicial');
  assert.ok(W.checkpoints.slice(1).every((checkpoint) => reached.has(checkpoint.plat)), 'la ruta conecta los dos checkpoints siguientes');
});

test('Parafalls V2: el renderer registra un grupo de parallax por página', () => {
  const render = fs.readFileSync(path.join(ROOT, 'js/app/render.js'), 'utf8');
  for (let i = 1; i <= 3; i++) {
    assert.match(render, new RegExp(`cascadas_0${i}:\\s*waterfallDepth\\(${i}\\)`));
    assert.match(render, /depth\/atmosphere_0\$\{page\}\.webp/);
    assert.match(render, /depth\/foreground_0\$\{page\}\.webp/);
  }
});
