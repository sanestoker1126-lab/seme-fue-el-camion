/* ¡Se me fue el camión! — MISIÓN ESPECIAL · LA CALZADA (persecución en vehículo).
   Sofía arranca la moto de su mamá (Doña Tóxica) junto al Parque Agua Azul y cruza la Calzada Olímpica perseguida
   por patrullas y por la banda
   de Los Zopilotes. Tres carriles vistos de lado; el camino avanza en x (unidades de mundo ≈ px con zoom 1).
   Lógica pura y determinista (sin DOM): la misma semilla y las mismas entradas dan la misma partida, por lo que
   las pruebas de Node pueden recorrerla completa con un bot.

   CONTROLES (mismo snapshot de entrada que el resto del juego)
     right / left        acelerar / frenar
     jumpPressed         carril de arriba (más lejano)     · flecha ↑, W, ESPACIO, stick arriba, botón ↑
     downPressed         carril de abajo (más cercano)     · flecha ↓, S, stick abajo, botón ↓
     upHeld / downHeld   también cambian de carril (stick en diagonal)
     dashPressed         NITRO (gasta 35 de la barra; rompe vallas y embiste con fuerza)
     kickPressed         PATADA lateral de Sofía contra el vehículo que va junto a la moto
     catsPressed         GATAS: Luna salta al enemigo más cercano (en el jefe, solo con las puertas abiertas)

   TRAMOS (cada uno es un punto de reaparición):
     0 ARRANQUE · 1 LAS PATRULLAS · 2 LAS RAMPAS DE LA OBRA · 3 LOS ZOPILOTES · 4 EL TRÁILER BLINDADO */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};

  const LANES = 3;
  const TUNE = Object.freeze({
    cruise: 560, vMin: 250, vMax: 800, vBoost: 1120,
    accel: 520, brake: 900, drift: 260,
    laneSpeed: 6.5,           // carriles por segundo al cambiar
    gravity: 1500, rampLift: 0.9, rampMaxVz: 980,
    boostCost: 35, boostTime: 1.6, nitroMax: 100,
    ramTime: 0.32, ramCooldown: 0.75, ramReach: 150,
    catsCooldown: 7, catsRange: 1100,
    invuln: 1.25, slowmo: 0.42,
    busLen: 170, busH: 110   // V58.8.24: la moto de Doña Tóxica (antes, el camión de 236 u)
  });
  const KIND = Object.freeze({
    sedan: { len: 128, h: 52, hp: 0 }, taxi: { len: 128, h: 52, hp: 0 }, vocho: { len: 104, h: 50, hp: 0 },
    patrol: { len: 136, h: 54, hp: 2 }, suv: { len: 150, h: 66, hp: 2 }, moto: { len: 70, h: 52, hp: 1 },
    // V58.8.26 · Perseguidores en moto (arte aportado): el niño de las piedras y El Maestro Enojón.
    kid: { len: 150, h: 120, hp: 2 }, maestro: { len: 160, h: 128, hp: 3 },
    // V58.8.29 · El Maestro Enojón en su moto roja (hoja de «RECURSOS_CURADOS_V1»): jefe del tramo 2.
    mjefe: { len: 172, h: 140, hp: 5 },
    truck: { len: 330, h: 128, hp: 6 }
  });
  const SECTIONS = Object.freeze([
    { id: 'arranque', x: 0, title: 'ARRANQUE · AVENIDA ALCALDE',
      line: 'Sofía arranca la moto de su mamá. Esquiva el tráfico, junta nitro y llega a la Calzada.' },
    { id: 'patrullas', x: 9000, title: 'LAS PATRULLAS Y EL MAESTRO',
      line: 'Patrullas y El Maestro Enojón en moto. Al final, el duelo con su moto roja: patéalo cuando levante la regla y embístelo cuando frene.' },
    { id: 'rampas', x: 24000, title: 'LAS RAMPAS DE LA OBRA',
      line: 'El puente está a medio construir: toma las rampas con velocidad para volar sobre las zanjas.' },
    { id: 'zopilotes', x: 38500, title: 'LOS ZOPILOTES Y EL NIÑO',
      line: 'Los Zopilotes lanzan barriles y el niño de las piedras te apunta desde su moto. Mira el carril marcado y cámbiate.' },
    { id: 'trailer', x: 53000, title: 'EL TRÁILER BLINDADO',
      line: 'El tráiler de Los Zopilotes bloquea la Calzada. Cuando abra las puertas, embístelo por detrás.' }
  ]);
  const BOSS_X = 55500;            // donde aparece el tráiler (el tramo 4 sigue hasta vencerlo)
  const FINALE_GAP = 1500;         // distancia del jefe vencido al puente roto de la barranca

  /* PRNG determinista (mulberry32). */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sectionAt = (x) => { let i = 0; for (let k = 0; k < SECTIONS.length; k++) if (x >= SECTIONS[k].x) i = k; return i; };

  /* ---------- Trazado de la Calzada ----------
     Los obstáculos fijos se colocan por «filas» (misma x): una fila bloquea como mucho dos carriles, así siempre hay
     un hueco. Las zanjas cruzan los tres carriles y llevan rampa en al menos uno, con margen para alinearse. */
  function buildCourse(seed, diffKey) {
    const R = rng(seed || 6);
    const hard = diffKey === 'dificil', easy = diffKey === 'facil';
    const statics = [], traffic = [], triggers = [], gaps = [];
    let id = 0;
    const add = (o) => { o.id = ++id; statics.push(o); return o; };
    const row = (x, kind, lanes) => lanes.forEach((l) => add({ kind, x: x + Math.round((R() - 0.5) * 30), lane: l }));
    const twoLanes = () => { const free = Math.floor(R() * LANES); return [0, 1, 2].filter((l) => l !== free); };
    const oneLane = () => [Math.floor(R() * LANES)];
    const civilian = () => ['sedan', 'taxi', 'vocho'][Math.floor(R() * 3)];

    // Tramo 0 · tutorial: conos, tráfico lento y las primeras latas de nitro.
    for (let x = 1400; x < 8600; x += 900 + Math.round(R() * 300)) {
      const k = (x / 900) | 0;
      if (k % 3 === 0) row(x, 'cone', oneLane());
      else if (k % 3 === 1) traffic.push({ kind: civilian(), x, lane: Math.floor(R() * LANES), v: 300 + R() * 60 });
      else add({ kind: 'nitro', x, lane: Math.floor(R() * LANES) });
    }
    add({ kind: 'repair', x: 7600, lane: 1 });

    // Tramo 1 · patrullas: tres oleadas que salen por detrás + tráfico que estorba.
    // Tramo 1: patrullas y El Maestro Enojón se alternan (el maestro llega después de la primera patrulla).
    const waves = hard ? [[9800, 'patrol', 1], [12400, 'maestro', 1], [15200, 'patrol', 2], [18000, 'maestro', 1], [20600, 'patrol', 2]]
      : easy ? [[10400, 'patrol', 1], [14200, 'maestro', 1], [18400, 'patrol', 1]]
      : [[9800, 'patrol', 1], [12600, 'maestro', 1], [16000, 'patrol', 2], [19600, 'maestro', 1]];
    waves.forEach(([x, kind, count]) => triggers.push({ x, kind, count, done: false }));
    for (let x = 9600; x < 23400; x += 1100 + Math.round(R() * 400)) {
      if (R() < 0.55) traffic.push({ kind: civilian(), x, lane: Math.floor(R() * LANES), v: 280 + R() * 90 });
      else if (R() < 0.5) row(x, 'cone', oneLane());
      else row(x, 'barrier', oneLane());
    }
    [11600, 17200, 22000].forEach((x) => add({ kind: 'nitro', x, lane: Math.floor(R() * LANES) }));
    add({ kind: 'repair', x: 21500, lane: 0 });
    // V58.8.29: al final del tramo, el duelo con El Maestro Enojón en su moto roja (la avenida se despeja).
    triggers.push({ x: hard ? 22000 : easy ? 20200 : 21000, kind: 'mjefe', count: 1, done: false });

    // Tramo 2 · rampas: zanjas de la obra con rampas, cada vez más largas.
    const gapSpecs = [[26400, 260, [0, 1, 2]], [29200, 320, [1, 2]], [32000, 380, [0, 2]], [34900, 440, [1]]];
    gapSpecs.forEach(([x, len, rampLanes]) => {
      gaps.push({ x1: x, x2: x + len });
      rampLanes.forEach((l) => add({ kind: 'ramp', x: x - 150, lane: l }));
      // Letrero de obra 900 u antes: marca en qué carriles está la rampa (el render lo dibuja).
      add({ kind: 'sign', x: x - 900, lane: -1, ramps: rampLanes.slice(), gapLen: len });
      add({ kind: 'nitro', x: x - 900, lane: rampLanes[0] });
      add({ kind: 'gem', x: x + len / 2, lane: rampLanes[0], z: 130 });
    });
    add({ kind: 'oil', x: 27900, lane: 1 }); add({ kind: 'oil', x: 33500, lane: 0 });
    add({ kind: 'repair', x: 36500, lane: 2 });
    triggers.push({ x: 30400, kind: 'kid', count: 1, done: false });   // el niño de las piedras entre las rampas

    // Tramo 3 · Los Zopilotes: camionetas que lanzan barriles y motos que tiran tachuelas.
    triggers.push({ x: 39200, kind: 'suv', count: 1, done: false });
    triggers.push({ x: 43600, kind: 'kid', count: 1, done: false });
    triggers.push({ x: 47200, kind: 'suv', count: easy ? 1 : 2, done: false });
    triggers.push({ x: 50200, kind: 'moto', count: 1, done: false });
    triggers.push({ x: 51200, kind: 'maestro', count: easy ? 0 : 1, done: false });
    for (let x = 39000; x < 52500; x += 1300 + Math.round(R() * 400)) {
      if (R() < 0.45) traffic.push({ kind: civilian(), x, lane: Math.floor(R() * LANES), v: 300 + R() * 80 });
      else row(x, R() < 0.5 ? 'barrier' : 'cone', R() < 0.35 ? twoLanes() : oneLane());
    }
    [41000, 45800, 51500].forEach((x) => add({ kind: 'nitro', x, lane: Math.floor(R() * LANES) }));
    add({ kind: 'repair', x: 52200, lane: 1 });
    // Tramo 4 · el tráiler aparece más adelante (ver spawnBoss).
    triggers.push({ x: BOSS_X - 900, kind: 'boss', count: 1, done: false });

    // Cristales sueltos por toda la ruta (puntos).
    for (let x = 2000; x < 52000; x += 1500 + Math.round(R() * 700)) {
      if (!gaps.some((g) => x > g.x1 - 600 && x < g.x2 + 300)) add({ kind: 'gem', x, lane: Math.floor(R() * LANES) });
    }
    statics.sort((a, b) => a.x - b.x);
    traffic.sort((a, b) => a.x - b.x);
    return { statics, traffic, triggers, gaps, length: BOSS_X + 6000 };
  }

  function createChase(opts = {}) {
    const C = NS.CONFIG || {};
    const DIFF = { facil: { hp: 8, aggr: 0.8, boss: 5, mb: 4 }, normal: { hp: 6, aggr: 1, boss: 6, mb: 6 }, dificil: { hp: 4, aggr: 1.25, boss: 7, mb: 7 } };
    const S = {
      state: 'idle', t: 0, seed: opts.seed || 6, difficulty: DIFF[opts.difficulty] ? opts.difficulty : 'normal',
      practice: !!opts.practice, events: [], P: null, course: null, foes: [], fx: [], debris: [], projectiles: [],
      section: 0, checkpoint: 0, deaths: opts.deaths || 0, timeScale: 1, slowT: 0, shakeT: 0, flashT: 0,
      boss: null, mb: null, shift: 0, finale: null, cam: { x: 0 }, stats: null, cats: { cd: 0, t: 0, target: null }, TUNE, SECTIONS, LANES
    };
    const D = () => DIFF[S.difficulty];
    let rnd = rng((S.seed * 7919) ^ 0x5eed);
    const emit = (type, data) => { S.events.push(Object.assign({ type }, data || {})); };
    const msgCD = Object.create(null);
    const message = (key, text, priority = 2, cd = 2.4) => {
      if (msgCD[key] && S.t < msgCD[key]) return;
      msgCD[key] = S.t + cd; emit('message', { text, priority });
    };

    function newRun(o = {}) {
      if (o.difficulty && DIFF[o.difficulty]) S.difficulty = o.difficulty;
      if (o.practice != null) S.practice = !!o.practice;
      const start = clamp(o.section | 0, 0, SECTIONS.length - 1);
      S.course = buildCourse(S.seed, S.difficulty);
      rnd = rng((S.seed * 7919) ^ (start + 1) * 0x9e37);
      const x0 = SECTIONS[start].x + 200;
      // Los objetos fijos y el tráfico detrás del punto de salida ya no estorban.
      S.course.statics = S.course.statics.filter((s) => s.x > x0 + 500);
      S.course.traffic = S.course.traffic.filter((c) => c.x > x0 + 900);
      S.course.triggers.forEach((tr) => { tr.done = tr.x < x0; });
      S.foes = S.course.traffic.map((c, i) => ({ id: 'tr' + i, kind: c.kind, civil: true, x: c.x, lane: c.lane, ly: c.lane, v: c.v, hp: 0, state: 'drive', t: 0 }));
      S.projectiles = []; S.fx = []; S.debris = [];
      S.P = {
        x: x0, v: TUNE.cruise * 0.8, lane: 1, ly: 1, z: 0, vz: 0, air: false, airT: 0, airMax: 0, overGap: false,
        // V58.8.27: mejoras de la tienda (MOTO REFORZADA, TANQUE DE NITRO).
        hp: D().hp + ((opts.upgrades && opts.upgrades.chaseHp) | 0), maxHp: D().hp + ((opts.upgrades && opts.upgrades.chaseHp) | 0),
        nitro: Math.min(TUNE.nitroMax, (start === 0 ? 30 : 60) + ((opts.upgrades && opts.upgrades.chaseNitro) | 0)), boostT: 0, invT: 1.2, ramCD: 0, ramT: 0, ramDir: 0,
        wobbleT: 0, wobbleDir: 1, hurtT: 0, tilt: 0, laneCD: 0
      };
      S.section = start; S.checkpoint = start; S.boss = null; S.finale = null; S.mb = null; S.shift = 0;
      S.timeScale = 1; S.slowT = 0; S.shakeT = 0; S.flashT = 0;
      S.cats = { cd: 0, t: 0, target: null };
      S.stats = Object.assign({ score: 0, takedowns: 0, nearMiss: 0, jumps: 0, gems: 0, startSection: start, t: 0 }, o.carry || {});
      S.cam.x = S.P.x - 160;
      S.t = 0; S.state = 'playing'; S.events.length = 0;
      emit('chapter', { index: start, section: SECTIONS[start], total: SECTIONS.length });
      return S;
    }
    function retry() { newRun({ section: S.checkpoint, carry: { score: Math.round(S.stats.score * 0.5) } }); S.deaths++; }

    /* ---------- Utilidades de colisión ---------- */
    const laneOverlap = (a, b, tol = 0.55) => Math.abs(a - b) < tol;
    const xOverlap = (ax, alen, bx, blen) => Math.abs(ax - bx) < (alen + blen) / 2;
    function hurt(reason, push) {
      const P = S.P;
      if (P.invT > 0 || S.state !== 'playing') return false;
      P.hp -= 1; P.invT = TUNE.invuln; P.hurtT = 0.45; S.shakeT = 0.4; S.flashT = 0.18;
      P.v = Math.max(TUNE.vMin, P.v * 0.72);
      if (push) { P.ly = clamp(P.ly + push * 0.35, 0, LANES - 1); }
      emit('hurt', { reason, hp: P.hp });
      sparks(P.x + TUNE.busLen * 0.3, P.ly, 14, '#ffd27a');
      if (P.hp <= 0) lose(reason);
      return true;
    }
    function lose(reason) {
      S.state = 'lost'; S.P.v = 0;
      emit('gameover', { reason, section: S.checkpoint, stats: summary() });
    }
    function sparks(x, ly, n, color) { for (let i = 0; i < n; i++) S.fx.push({ kind: 'spark', x, ly, z: 20 + rnd() * 40, vx: (rnd() - 0.3) * 420, vz: 120 + rnd() * 300, t: 0, life: 0.45 + rnd() * 0.3, color }); }
    function explode(x, ly, big) {
      S.fx.push({ kind: 'boom', x, ly, t: 0, life: big ? 1.1 : 0.75, r: big ? 220 : 120 });
      for (let i = 0; i < (big ? 26 : 14); i++) S.debris.push({ x, ly, z: 30, vx: (rnd() - 0.5) * 700, vz: 250 + rnd() * 500, rot: rnd() * 6, vr: (rnd() - 0.5) * 14, t: 0, life: 1.4, s: 6 + rnd() * 12 });
      S.shakeT = Math.max(S.shakeT, big ? 0.8 : 0.45); S.flashT = Math.max(S.flashT, big ? 0.3 : 0.12);
      emit('sfx', { name: big ? 'explosionBig' : 'explosion' });
    }
    function slowmo(sec, why) { S.slowT = Math.max(S.slowT, sec); if (why) emit('slowmo', { why }); }

    /* ---------- Enemigos ---------- */
    function spawn(kind, x, lane, extra) {
      const k = KIND[kind];
      const f = Object.assign({ id: kind + (S.foes.length + 1) + '_' + Math.round(x), kind, x, lane, ly: lane, v: S.P.v, hp: k.hp, maxHp: k.hp,
        state: 'approach', t: 0, cd: 1.2 + rnd() * 0.6, tele: 0, targetLane: lane, dead: false, spin: 0 }, extra || {});
      S.foes.push(f);
      emit('foeSpawn', { foe: f });
      return f;
    }
    function fireTrigger(tr) {
      const P = S.P;
      if (tr.kind === 'boss') { spawnBoss(); return; }
      if (tr.kind === 'mjefe') { spawnMaestroBoss(); return; }
      for (let i = 0; i < tr.count; i++) {
        const lanes = [0, 1, 2].filter((l) => l !== P.lane);
        const lane = lanes[(i + (tr.x / 100 | 0)) % lanes.length];
        if (tr.kind === 'patrol') spawn('patrol', P.x - 700 - i * 260, lane);
        else if (tr.kind === 'suv') spawn('suv', P.x + 900 + i * 380, lane, { state: 'lead' });
        else if (tr.kind === 'moto') spawn('moto', P.x - 500 - i * 200, lane);
        else if (tr.kind === 'kid' || tr.kind === 'maestro') spawn(tr.kind, P.x - 650 - i * 300, lane);
      }
      if (!tr.count) return;
      const say = { patrol: '¡PATRULLAS! NO DEJES QUE SE TE EMPAREJEN', suv: '¡LOS ZOPILOTES! VIGILA LOS BARRILES', moto: '¡MOTOS! TIRAN TACHUELAS EN EL CARRIL MARCADO',
        kid: '¡EL NIÑO DE LAS PIEDRAS! CUANDO MARQUE TU CARRIL, CÁMBIATE', maestro: '¡EL MAESTRO ENOJÓN! SI LEVANTA LA REGLA, ALÉJATE UN CARRIL O PATÉALO' };
      message('spawn' + tr.kind, say[tr.kind], 3, 6);
      emit('sfx', { name: tr.kind === 'patrol' ? 'siren' : 'alert' });
    }
    function spawnBoss() {
      const P = S.P;
      const b = spawn('truck', P.x + 1000, 1, { boss: true, hp: D().boss, maxHp: D().boss, state: 'enter', pattern: 0, doors: 0, dropN: 0, name: 'EL TRÁILER BLINDADO' });
      S.boss = b;
      // El tráiler pelea solo: los perseguidores que quedaban se retiran (frenan y salen de cuadro).
      for (const f of S.foes) if (!f.civil && !f.dead && f !== b) { f.state = 'leave'; f.targetLane = f.lane; }
      S.projectiles = S.projectiles.filter((q) => q.x < P.x);
      emit('bossIntro', { foe: b });
      slowmo(1.2, 'boss');
    }

    /* V58.8.29 · Duelo con El Maestro Enojón en su moto roja (fin del tramo 2). Mientras dura, lo que sigue de la
       ruta (tráfico, obstáculos, zanjas y disparadores) se aparta y la avenida queda despejada; al vencerlo vuelve a
       colocarse delante, a la misma distancia de antes. Tres ataques, todos avisados: el reglazo (su carril y los
       vecinos: patéalo durante el aviso), la embestida por tu carril (cámbiate; luego frena delante y se le puede
       embestir por detrás) y, con media vida, el caballito que cae sobre el carril marcado. */
    const MB_HOLD = 1e6;
    const mbActive = () => !!(S.mb && !S.mb.dead);
    function spawnMaestroBoss() {
      const P = S.P, pivot = P.x + 700;
      for (const f of S.foes) if (!f.civil && !f.dead) { f.state = 'leave'; f.targetLane = f.lane; }
      S.foes = S.foes.filter((f) => !(f.civil && f.x > pivot - 300));
      const hold = (o) => { if (o.x > pivot) { o.x += MB_HOLD; o.held = true; } };
      S.course.statics.forEach(hold);
      S.course.triggers.forEach((tr) => { if (!tr.done) hold(tr); });
      S.course.gaps.forEach((g) => { if (g.x1 > pivot) { g.x1 += MB_HOLD; g.x2 += MB_HOLD; g.held = true; } });
      S.projectiles = S.projectiles.filter((q) => q.x < P.x);
      const lane = P.lane === 1 ? 0 : 1;
      const b = spawn('mjefe', P.x - 700, lane, { miniboss: true, hp: D().mb, maxHp: D().mb, state: 'enter', pattern: 0, hitCD: 0, z: 0,
        name: 'EL MAESTRO ENOJÓN · MOTO ROJA' });
      S.mb = b; S.mbPivot = pivot;
      emit('bossIntro', { foe: b, mini: true });
      slowmo(1.0, 'boss');
      message('mb', '¡EL MAESTRO EN SU MOTO ROJA! PATÉALO CUANDO LEVANTE LA REGLA Y ESQUIVA SUS EMBESTIDAS', 5, 6);
    }
    function releaseCourse() {
      const P = S.P, delta = P.x + 900 - S.mbPivot;
      const back = (o) => { if (o.held) { o.x += delta - MB_HOLD; o.held = false; } };
      S.course.statics.forEach(back); S.course.triggers.forEach(back);
      S.course.gaps.forEach((g) => { if (g.held) { g.x1 += delta - MB_HOLD; g.x2 += delta - MB_HOLD; g.held = false; } });
      S.shift += delta;
    }
    function mbDown(f) {
      const P = S.P;
      f.dead = true; f.deadT = 0; f.z = 0; S.stats.takedowns++; S.stats.score += 2500;
      explode(f.x, f.ly, false);
      slowmo(1.6, 'bossDown');
      emit('bossDefeated', { foe: f, mini: true });
      emit('takedown', { foe: f, total: S.stats.takedowns });
      message('mbDown', '¡EL MAESTRO SE QUEDÓ SIN MOTO! +1 REPARACIÓN · ADELANTE, LAS RAMPAS DE LA OBRA', 5, 5);
      P.hp = Math.min(P.maxHp, P.hp + 1); P_nitro(40);
      releaseCourse();
    }
    function mbAI(f, dt) {
      const P = S.P, aggr = D().aggr, enraged = f.hp <= f.maxHp / 2, dx = f.x - P.x;
      f.cd -= dt; f.hitCD = Math.max(0, f.hitCD - dt);
      const pace = (want, lim = 300) => { f.v = P.v + clamp((want - dx) * 1.6, -lim, lim + 120); };
      // Carril de al lado de Sofía; no cruza a través de ella (si tendría que hacerlo, se espera atrás).
      const side = () => {
        const want = P.lane === 1 ? (f.lane === 2 ? 2 : 0) : 1;
        if (Math.abs(dx) < 240 && (f.ly - P.ly) * (want - P.ly) < 0) return f.lane;
        return want;
      };
      if (enraged && !f.phase2) { f.phase2 = true; emit('bossPhase', { foe: f }); message('mbPhase', '¡EL MAESTRO SE ENFURECE! AHORA TAMBIÉN SALTA EN CABALLITO', 4, 3); }
      if (f.state === 'enter') {
        pace(-260); f.targetLane = side();
        if (Math.abs(dx + 260) < 90) { f.state = 'ride'; f.cd = 1.0; }
      } else if (f.state === 'ride') {
        pace(0); f.targetLane = side();
        if (f.cd <= 0 && Math.abs(dx) < 120) {
          const atk = ['swing', 'dash', 'wheelie'][f.pattern++ % (enraged ? 3 : 2)];
          f.atk = atk; f.state = 'tele';
          f.tele = (atk === 'swing' ? (enraged ? 0.75 : 0.9) : 1.0) / aggr; f.teleMax = f.tele;
          f.dropLane = atk === 'swing' ? null : P.lane;
          emit('foeWindup', { foe: f });
          if (atk === 'dash') message('mbDash', '¡VA A EMBESTIR POR TU CARRIL! CÁMBIATE', 3, 2);
          if (atk === 'wheelie') message('mbJump', '¡CABALLITO! VA A CAER EN EL CARRIL MARCADO', 3, 2);
        }
      } else if (f.state === 'tele') {
        f.tele -= dt;
        if (f.atk === 'swing') pace(0);
        else if (f.atk === 'dash') { pace(-420, 380); if (dx < -200) f.targetLane = f.dropLane; }
        else pace(-30);
        if (f.tele <= 0) {
          if (f.atk === 'swing') { f.state = 'swing'; f.swingT = 0.42; f.swingHit = false; emit('sfx', { name: 'kick' }); }
          else if (f.atk === 'dash') { f.state = 'dash'; f.dashT = 1.6; f.lane = f.targetLane = f.dropLane; emit('sfx', { name: 'nitro' }); }
          else { f.state = 'jump'; f.jumpT = 0; f.fromLane = f.lane; f.targetLane = f.dropLane; emit('sfx', { name: 'ramp' }); }
        }
      } else if (f.state === 'swing') {
        pace(0); f.swingT -= dt;
        if (!f.swingHit && Math.abs(f.ly - P.ly) < 1.3 && Math.abs(f.x - P.x) < 150 && P.z < 60) {
          f.swingHit = true;
          if (hurt('regla', Math.sign(P.ly - f.ly) || 1)) message('regla', '¡REGLAZO! PATÉALO MIENTRAS LEVANTA LA REGLA', 3, 2);
        }
        if (f.swingT <= 0) { f.state = 'ride'; f.cd = (enraged ? 1.4 : 2.0) / aggr; }
      } else if (f.state === 'dash') {
        f.dashT -= dt; f.v = P.v + 820;
        if (dx > 520 || f.dashT <= 0) { f.state = 'dizzy'; f.dizzyT = enraged ? 1.5 : 1.9; emit('sfx', { name: 'skid' }); }
      } else if (f.state === 'jump') {
        const dur = 0.85; f.jumpT += dt; f.v = P.v + 330;
        f.z = Math.sin(Math.min(1, f.jumpT / dur) * Math.PI) * 130;
        if (f.jumpT >= dur) {
          f.z = 0; f.state = 'dizzy'; f.dizzyT = 1.3;
          S.fx.push({ kind: 'boom', x: f.x, ly: f.lane, t: 0, life: 0.45, r: 80 }); S.shakeT = Math.max(S.shakeT, 0.3);
          emit('sfx', { name: 'stomp' });
          if (laneOverlap(f.lane, P.ly, 0.5) && Math.abs(f.x - P.x) < 300 && P.z < 60) hurt('caballito');
        }
      } else if (f.state === 'dizzy') {
        // Frena delante de Sofía: es el momento de embestirlo por detrás (o de patearlo si va al lado).
        f.dizzyT -= dt; f.v = P.v - 90;
        if (f.dizzyT <= 0) { f.state = 'ride'; f.cd = 1.2 / aggr; }
      } else if (f.state === 'hit') {
        f.hitT -= dt; f.v = P.v - 200;
        if (f.hitT <= 0) { f.state = 'ride'; f.cd = Math.max(f.cd, 0.9); }
      }
      // Al volver a emparejarse desde adelante, toma el carril de al lado antes de alcanzar a Sofía.
      if ((f.state === 'ride' || f.state === 'hit') && dx > 120) {
        f.targetLane = side();
        if (Math.abs(f.ly - P.ly) < 0.75) f.v = Math.max(f.v, P.v + 60);   // no frena encima de Sofía: primero se aparta
      }
    }

    function foeAI(f, dt) {
      const P = S.P, aggr = D().aggr;
      f.t += dt;
      if (f.dead) {
        f.spin += dt * 9; f.v = Math.max(0, f.v - 900 * dt); f.x += f.v * dt;
        f.deadT = (f.deadT || 0) + dt;
        return;
      }
      if (f.civil) {
        // Tráfico: avanza en su carril; frena un poco si la moto lo alcanza (no cambia de carril).
        f.x += f.v * dt;
        if (f.bumpT > 0) { f.bumpT -= dt; f.ly += (f.bumpLane - f.ly) * Math.min(1, dt * 6); } else f.ly += (f.lane - f.ly) * Math.min(1, dt * 6);
        return;
      }
      const dx = f.x - P.x;
      // Durante un duelo de jefe los demás perseguidores se retiran aunque los hayan golpeado.
      if (!f.boss && !f.miniboss && f.state !== 'leave' && (mbActive() || (S.boss && !S.boss.dead))) { f.state = 'leave'; f.targetLane = f.lane; }
      if (f.state === 'leave') {
        f.v = Math.max(0, P.v - 480); f.x += f.v * dt;
        f.ly += (f.lane - f.ly) * Math.min(1, dt * 3);
        if (dx < -1200) { f.dead = true; f.gone = true; }
        return;
      }
      if (f.kind === 'patrol' || f.kind === 'moto' || f.kind === 'kid' || f.kind === 'maestro') {
        // Alcanzar a la moto por un carril vecino, avisar (sirena/luces) y cerrarse sobre él.
        f.cd -= dt;
        const side = P.lane === 0 ? 1 : P.lane === 2 ? 1 * -1 : (f.lane < P.lane ? -1 : 1);
        if (f.state === 'approach') {
          const want = f.kind === 'moto' ? 120 : f.kind === 'kid' ? -70 : 10;
          f.v = P.v + clamp((want - dx) * 1.6, -260, 420 * aggr);
          // El niño lanza desde lejos: si Sofía va por una orilla, él va por la otra, para que siempre le quede un
          // carril libre al lado (si no, la piedra la dejaría sin salida).
          const want2 = f.kind === 'kid' && P.lane !== 1 ? 2 - P.lane : clamp(P.lane + side, 0, LANES - 1);
          // No cruza a través de la moto: si para llegar a su carril tendría que atravesarlo, se queda atrás.
          if (Math.abs(dx) < 260 && (f.ly - P.ly) * (want2 - P.ly) < 0) f.v = P.v - 220;
          else f.targetLane = want2;
          if (Math.abs(dx - want) < 90 && f.cd <= 0) {
            f.state = 'tele'; f.tele = (f.kind === 'kid' || f.kind === 'maestro' ? 0.85 : 0.75) / aggr; f.teleMax = f.tele;
            if (f.kind === 'moto' || f.kind === 'kid') f.dropLane = P.lane;
            emit('foeWindup', { foe: f });
          }
        } else if (f.state === 'tele') {
          f.v = P.v + clamp(((f.kind === 'kid' ? -70 : 10) - dx) * 1.6, -200, 300);
          f.tele -= dt;
          if (f.tele <= 0) {
            if (f.kind === 'kid') {
              // Lanza la piedra en arco hacia el carril marcado: cae justo donde va a estar Sofía si no se mueve.
              S.projectiles.push({ kind: 'rock', x: f.x + 50, lane: f.dropLane, ly: f.dropLane, fromLy: f.ly, v: P.v + 140, z: 60, vz: 420, t: 0 });
              f.state = 'throw'; f.throwT = 0.4;
              emit('sfx', { name: 'dash' });
            } else if (f.kind === 'maestro') {
              f.state = 'swing'; f.swingT = 0.42; f.swingHit = false;
              emit('sfx', { name: 'kick' });
            } else if (f.kind === 'moto') {
              // La moto de Los Zopilotes suelta tachuelas en el carril marcado, delante de Sofía.
              S.projectiles.push({ kind: 'spikes', x: P.x + 520, lane: f.dropLane, ly: f.dropLane, v: 0, t: 0 });
              f.state = 'recover'; f.cd = 2.6 / aggr; f.targetLane = (f.lane + 1) % LANES;
            } else { f.state = 'ram'; f.ramT = 0.38; f.targetLane = P.lane; }
          }
        } else if (f.state === 'throw') {
          f.v = P.v + clamp((-70 - dx) * 1.6, -200, 300);
          f.throwT -= dt;
          if (f.throwT <= 0) { f.state = 'recover'; f.cd = 2.6 / aggr; }
        } else if (f.state === 'swing') {
          // El reglazo alcanza el carril de al lado (no solo el suyo).
          f.v = P.v + clamp((10 - dx) * 1.6, -200, 300);
          f.swingT -= dt;
          if (!f.swingHit && Math.abs(f.ly - P.ly) < 1.3 && Math.abs(f.x - P.x) < 150 && P.z < 60) {
            f.swingHit = true;
            if (hurt('regla', Math.sign(P.ly - f.ly) || 1)) message('regla', '¡REGLAZO! ALÉJATE UN CARRIL CUANDO LEVANTE LA REGLA', 3, 2);
          }
          if (f.swingT <= 0) { f.state = 'recover'; f.cd = 2.0 / aggr; }
        } else if (f.state === 'ram') {
          f.v = P.v + clamp((10 - dx) * 2, -200, 300);
          f.ramT -= dt;
          if (f.ramT <= 0) { f.state = 'recover'; f.cd = 1.8 / aggr; f.targetLane = clamp(f.lane, 0, LANES - 1); }
        } else if (f.state === 'recover') {
          f.v = P.v - 140;
          if (f.cd < 1.0) f.state = 'approach';
        } else if (f.state === 'stunned') {
          f.v = Math.max(120, P.v - 360); f.stunT -= dt;
          if (f.stunT <= 0) { f.state = 'recover'; f.cd = 1.6; }
        }
        // Una patrulla que queda muy atrás se rinde y sale de escena.
        if (dx < -1500) { f.dead = true; f.gone = true; }
      } else if (f.kind === 'suv') {
        // Va delante de la moto y lanza barriles hacia atrás por un carril marcado.
        f.cd -= dt;
        const want = 560;
        f.v = P.v + clamp((want - dx) * 1.2, -300, 300);
        if (f.state === 'lead' && f.cd <= 0) { f.state = 'tele'; f.tele = 0.9 / aggr; f.dropLane = P.lane; emit('foeWindup', { foe: f }); }
        else if (f.state === 'tele') {
          f.tele -= dt;
          if (f.tele <= 0) {
            S.projectiles.push({ kind: 'barrel', x: f.x - 90, lane: f.dropLane, ly: f.dropLane, v: P.v - 420, t: 0, spin: 0 });
            f.state = 'lead'; f.cd = (2.4 + rnd() * 0.8) / aggr;
            if (rnd() < 0.5) f.targetLane = [0, 1, 2].filter((l) => l !== f.lane)[Math.floor(rnd() * 2)];
          }
        } else if (f.state === 'stunned') { f.stunT -= dt; f.v = P.v - 200; if (f.stunT <= 0) { f.state = 'lead'; f.cd = 1.5; } }
      } else if (f.kind === 'mjefe') mbAI(f, dt);
      else if (f.kind === 'truck') bossAI(f, dt);
      f.x += f.v * dt;
      if (f.targetLane != null) { f.lane = f.targetLane; f.ly += (f.targetLane - f.ly) * Math.min(1, dt * (f.state === 'ram' ? 7 : 3.2)); }
    }

    /* El tráiler: entra, alterna ráfagas de cajas (dos carriles marcados) con ventanas de puertas abiertas en las que
       se le puede embestir por detrás. Al 50 % de vida acelera las ráfagas y zigzaguea. */
    function bossAI(b, dt) {
      const P = S.P, aggr = D().aggr, enraged = b.hp <= b.maxHp / 2;
      const dx = b.x - P.x;
      b.cd -= dt;
      if (b.state === 'enter') {
        b.v = P.v + clamp((600 - dx) * 1.4, -300, 300);
        if (Math.abs(dx - 600) < 120) { b.state = 'drive'; b.cd = 1.2; }
      } else if (b.state === 'drive') {
        b.v = P.v + clamp((540 - dx) * 1.3, -300, 300);
        if (b.cd <= 0) {
          b.state = 'tele'; b.tele = (enraged ? 0.75 : 0.95) / aggr;
          const free = Math.floor(rnd() * LANES);
          b.dropLanes = [0, 1, 2].filter((l) => l !== free);
          emit('foeWindup', { foe: b });
        }
      } else if (b.state === 'tele') {
        b.v = P.v + clamp((540 - dx) * 1.3, -300, 300);
        b.tele -= dt;
        if (b.tele <= 0) {
          for (const l of b.dropLanes) S.projectiles.push({ kind: 'crate', x: b.x - TUNE.busLen * 0.6, lane: l, ly: l, v: P.v - (enraged ? 520 : 430), t: 0, spin: 0 });
          b.dropN++;
          emit('sfx', { name: 'clank' });
          // Tras la última ráfaga espera a que las cajas pasen a la moto antes de abrir: nunca hay que alinearse
          // con el tráiler mientras sus cajas siguen cayendo en ese carril.
          if (b.dropN >= (enraged ? 3 : 2)) { b.state = 'cool'; b.coolT = 1.5; b.dropN = 0; }
          else { b.state = 'drive'; b.cd = (enraged ? 0.9 : 1.3) / aggr; }
        }
      } else if (b.state === 'cool') {
        b.v = P.v + clamp((540 - dx) * 1.3, -300, 300);
        b.coolT -= dt;
        if (b.coolT <= 0 && !S.projectiles.some((q) => q.x > P.x - 80)) {
          b.state = 'doors'; b.doorsT = enraged ? 2.8 : 3.6;
          message('doors', '¡PUERTAS ABIERTAS! EMBÍSTELO POR DETRÁS (NITRO = DOBLE)', 4, 3); emit('sfx', { name: 'alert' });
        }
      } else if (b.state === 'doors') {
        // Frena para que la moto lo alcance.
        b.doors = Math.min(1, b.doors + dt * 3);
        b.v = P.v - 120;
        b.doorsT -= dt;
        if (dx < TUNE.busLen * 0.5 + 200) b.v = P.v + 40;
        if (b.doorsT <= 0) { b.state = 'drive'; b.cd = 1.4; }
      } else if (b.state === 'hit') {
        b.hitT -= dt; b.v = P.v + 380;
        if (b.hitT <= 0) { b.state = 'drive'; b.cd = 1.1; }
      }
      if (b.state !== 'doors') b.doors = Math.max(0, b.doors - dt * 2.5);
      if (enraged && b.state === 'drive' && !b.phase2) { b.phase2 = true; emit('bossPhase', { foe: b }); message('phase', '¡SEGUNDA FASE! EL TRÁILER ACELERA Y ZIGZAGUEA', 4, 3); }
      if (enraged && (b.state === 'drive') && Math.floor(S.t * 0.7) % 2 !== (b.zig || 0)) { b.zig = Math.floor(S.t * 0.7) % 2; b.targetLane = b.zig ? 0 : 2; }
      else if (!enraged && b.state === 'drive') b.targetLane = 1;
    }
    function damageFoe(f, n, why) {
      if (f.dead || f.civil) return false;
      if (f.miniboss) {
        f.blocked = false;
        if (f.hitCD > 0 || f.state === 'jump' || f.state === 'enter') return false;
        // Se cubre con la regla salvo mientras la levanta, mientras golpea o cuando frena aturdido (las gatas sí pasan).
        const open = (f.state === 'tele' && f.atk === 'swing') || f.state === 'swing' || f.state === 'dizzy';
        if (!open && why !== 'cats') {
          f.hitCD = 0.3; f.blocked = true; emit('sfx', { name: 'clank' }); sparks(f.x, f.ly, 6, '#cfd8e6');
          message('mbBlock', '¡SE CUBRE CON LA REGLA! PATÉALO CUANDO LA LEVANTE O EMBÍSTELO CUANDO FRENE', 3, 3);
          return false;
        }
        f.hp -= n; f.hitCD = 0.55;
        emit('bossHit', { foe: f, hp: f.hp });
        sparks(f.x, f.ly, 16, '#ffe08a');
        S.shakeT = Math.max(S.shakeT, 0.3);
        if (f.hp <= 0) mbDown(f); else { f.state = 'hit'; f.hitT = 0.5; f.swingHit = true; }
        return true;
      }
      if (f.boss) {
        if (f.state !== 'doors' && why !== 'boost') { message('armor', '¡ESTÁ BLINDADO! ESPERA A QUE ABRA LAS PUERTAS', 3, 2); emit('sfx', { name: 'clank' }); return false; }
        f.hp -= n; f.state = 'hit'; f.hitT = 0.8; f.doors = 0;
        emit('bossHit', { foe: f, hp: f.hp });
        sparks(f.x - KIND.truck.len / 2, f.ly, 22, '#ffe08a');
        S.shakeT = Math.max(S.shakeT, 0.35);
        if (f.hp <= 0) bossDown(f);
        return true;
      }
      f.hp -= n;
      sparks(f.x, f.ly, 10, '#ffd27a');
      emit('foeHit', { foe: f });
      if (f.hp <= 0) {
        f.dead = true; f.deadT = 0; S.stats.takedowns++; S.stats.score += f.kind === 'suv' ? 900 : 600;
        explode(f.x, f.ly, false);
        emit('takedown', { foe: f, total: S.stats.takedowns });
        message('td', '¡DERRIBO! ' + ({ patrol: 'PATRULLA', suv: 'CAMIONETA', moto: 'MOTO', kid: 'EL NIÑO DE LAS PIEDRAS', maestro: 'EL MAESTRO ENOJÓN' }[f.kind] || '') + ' FUERA', 3, 0.6);
        P_nitro(15);
      } else { f.state = 'stunned'; f.stunT = 1.1; }
      return true;
    }
    function bossDown(b) {
      b.dead = true; b.deadT = 0; S.stats.takedowns++; S.stats.score += 5000;
      explode(b.x, b.ly, true); explode(b.x - 140, b.ly, true);
      slowmo(2.2, 'bossDown');
      emit('bossDefeated', { foe: b });
      message('bossDown', '¡TRÁILER DERRIBADO! EL PUENTE DE LA BARRANCA ESTÁ ADELANTE: ¡A FONDO!', 5, 5);
      S.finale = { x1: S.P.x + FINALE_GAP, x2: S.P.x + FINALE_GAP + 2400, started: false, t: 0 };
      // La rampa final cubre los tres carriles: la película termina volando sobre la barranca.
      for (let l = 0; l < LANES; l++) S.course.statics.push({ id: 'finale' + l, kind: 'ramp', x: S.finale.x1 - 160, lane: l, big: true });
      S.course.gaps.push({ x1: S.finale.x1, x2: S.finale.x2, finale: true });
      // Sin más proyectiles ni enemigos en la recta final.
      S.projectiles.length = 0;
      for (const f of S.foes) if (!f.civil && !f.dead) { f.dead = true; f.deadT = 0; }
    }
    const P_nitro = (n) => { S.P.nitro = Math.min(TUNE.nitroMax, S.P.nitro + n); };

    /* ---------- Paso de simulación ---------- */
    let prevUp = false, prevDown = false;
    function step(dtReal, inp) {
      if (S.state !== 'playing' && S.state !== 'finale') return;
      inp = inp || {};
      // Cámara lenta: el tiempo de juego corre más despacio, la entrada no.
      if (S.slowT > 0) { S.slowT -= dtReal; S.timeScale += (TUNE.slowmo - S.timeScale) * Math.min(1, dtReal * 10); }
      else S.timeScale += (1 - S.timeScale) * Math.min(1, dtReal * 5);
      const dt = dtReal * S.timeScale;
      S.t += dt; S.stats.t += dtReal;
      const P = S.P;
      if (S.state === 'finale') { finaleStep(dt); return; }

      // Velocidad.
      const vTop = P.boostT > 0 ? TUNE.vBoost : TUNE.vMax;
      if (!P.air) {
        if (inp.right) P.v = Math.min(vTop, P.v + TUNE.accel * dt);
        else if (inp.left) P.v = Math.max(TUNE.vMin, P.v - TUNE.brake * dt);
        else P.v += clamp(TUNE.cruise - P.v, -TUNE.drift * dt, TUNE.drift * dt);
        if (P.boostT > 0) P.v = Math.min(TUNE.vBoost, P.v + 1400 * dt);
      }
      P.v = clamp(P.v, 0, TUNE.vBoost);
      // Carriles (flancos de arriba/abajo).
      const upEdge = !!inp.jumpPressed || (!!inp.upHeld && !prevUp);
      const downEdge = !!inp.downPressed || (!!inp.downHeld && !prevDown);
      prevUp = !!inp.upHeld; prevDown = !!inp.downHeld;
      if (!P.air) {
        if (upEdge && P.lane > 0) { P.lane--; emit('sfx', { name: 'skid' }); }
        if (downEdge && P.lane < LANES - 1) { P.lane++; emit('sfx', { name: 'skid' }); }
      }
      let targetLy = P.lane;
      if (P.wobbleT > 0) { P.wobbleT -= dt; targetLy += Math.sin(P.wobbleT * 18) * 0.35 * P.wobbleDir; }
      if (P.ramT > 0) { P.ramT -= dt; targetLy += P.ramDir * 0.45 * Math.sin((1 - P.ramT / TUNE.ramTime) * Math.PI); }
      const prevLy = P.ly;
      P.ly += clamp(targetLy - P.ly, -TUNE.laneSpeed * dt, TUNE.laneSpeed * dt);
      P.tilt = clamp((P.ly - prevLy) / Math.max(dt, 1e-4) * 0.05, -0.12, 0.12);
      // Nitro.
      if (inp.dashPressed) {
        if (P.nitro >= TUNE.boostCost && P.boostT <= 0) { P.nitro -= TUNE.boostCost; P.boostT = TUNE.boostTime; emit('boost'); emit('sfx', { name: 'nitro' }); }
        else if (P.boostT <= 0) message('noNitro', 'SIN NITRO · JUNTA LATAS ⚡ O HAZ ACROBACIAS', 1, 2);
      }
      if (P.boostT > 0) P.boostT -= dt;
      // Embestida lateral.
      P.ramCD -= dt;
      if (inp.kickPressed && P.ramCD <= 0 && !P.air) {
        const alongside = S.foes.filter((f) => !f.dead && !f.civil && Math.abs(f.ly - P.ly) > 0.5 && Math.abs(f.ly - P.ly) < 1.6 && Math.abs(f.x - P.x) < TUNE.busLen / 2 + KIND[f.kind].len / 2 + 40);
        alongside.sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x));
        const tgt = alongside[0];
        P.ramDir = tgt ? Math.sign(tgt.ly - P.ly) : (P.lane === 0 ? 1 : P.lane === 2 ? -1 : 1);
        P.ramT = TUNE.ramTime; P.ramCD = TUNE.ramCooldown;
        emit('sfx', { name: 'skid' });
        if (tgt) {
          damageFoe(tgt, P.boostT > 0 ? 2 : 1, 'ram');
          if (!tgt.dead && !tgt.boss) { tgt.targetLane = clamp(tgt.lane + P.ramDir, 0, LANES - 1); tgt.ly += P.ramDir * 0.4; }
          S.shakeT = Math.max(S.shakeT, 0.25);
          emit('sfx', { name: 'crash' });
        }
      }
      // Gatas.
      S.cats.cd = Math.max(0, S.cats.cd - dt);
      if (S.cats.t > 0) {
        S.cats.t -= dt;
        if (S.cats.t <= 0 && S.cats.target) { const tg = S.cats.target; S.cats.target = null; if (!tg.dead) { damageFoe(tg, 1, 'cats'); if (!tg.boss && !tg.miniboss && !tg.dead) { tg.state = 'stunned'; tg.stunT = 1.6; } } }
      }
      if (inp.catsPressed) {
        if (S.cats.cd > 0) message('catsCd', 'LAS GATITAS RECUPERAN EL ALIENTO…', 1, 1.5);
        else {
          const cands = S.foes.filter((f) => !f.dead && !f.civil && Math.abs(f.x - P.x) < TUNE.catsRange);
          cands.sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x));
          if (cands[0]) { S.cats.target = cands[0]; S.cats.t = 0.55; S.cats.cd = TUNE.catsCooldown; S.cats.from = { x: P.x, ly: P.ly }; emit('cats', { target: cands[0] }); message('cats', '¡LUNA AL ATAQUE!', 2, 1); }
          else message('catsNone', 'NO HAY PERSEGUIDORES CERCA', 1, 1.5);
        }
      }

      // Avance y saltos.
      const x0 = P.x;
      P.x += P.v * dt;
      if (P.air) {
        P.vz -= TUNE.gravity * dt; P.z += P.vz * dt; P.airT += dt;
        P.airMax = Math.max(P.airMax, P.z);
        if (P.z <= 0) land();
      }
      // Rampas.
      for (const s of S.course.statics) {
        if (s.kind !== 'ramp' || s.used) continue;
        if (s.x > P.x + 40) break;
        if (s.x + 60 >= x0 && s.x + 60 <= P.x + 1 && laneOverlap(s.lane, P.ly, 0.5) && !P.air) {
          s.used = true;
          P.air = true; P.z = 1; P.airT = 0; P.airMax = 0;
          P.vz = Math.min(TUNE.rampMaxVz * (s.big ? 1.35 : 1), Math.max(260, P.v * TUNE.rampLift * (s.big ? 1.25 : 1)));
          emit('ramp', { big: !!s.big }); emit('sfx', { name: 'ramp' });
          const g = S.course.gaps.find((q) => q.x1 > P.x && q.x1 - P.x < 400);
          if (g && g.finale) startFinale();
          else if (g || P.vz > 560) slowmo(Math.min(1.3, 2 * P.vz / TUNE.gravity * 0.7), 'jump');
        }
      }
      if (S.state === 'finale') return;
      // Zanjas: si se pasa por encima sin estar en el aire, se cae.
      const gap = S.course.gaps.find((g) => P.x > g.x1 + 30 && P.x < g.x2);
      if (gap && !P.air) fallInGap(gap);

      collide(dt);
      // Enemigos, proyectiles y disparadores.
      for (const tr of S.course.triggers) if (!tr.done && P.x >= tr.x) { tr.done = true; fireTrigger(tr); }
      for (const f of S.foes) foeAI(f, dt);
      S.foes = S.foes.filter((f) => !(f.dead && ((f.deadT || 0) > 2.5 || f.gone)) && f.x > P.x - 2600 && f.x < P.x + 9000);
      for (const q of S.projectiles) {
        q.x += q.v * dt; q.t += dt; q.spin = (q.spin || 0) + dt * 8;
        if (q.kind === 'rock' && !q.hit) {
          q.z += q.vz * dt; q.vz -= 1200 * dt;
          q.ly += (q.lane - q.ly) * Math.min(1, dt * 4);
          if (q.z <= 0) {
            // Cae en el carril marcado y se queda ahí como obstáculo: o cae encima de Sofía o ella choca con
            // ella después si no se cambia de carril.
            q.z = 0; q.vz = 0; q.v = 0; q.landed = true; q.ly = q.lane;
            emit('sfx', { name: 'stomp' });
            if (laneOverlap(q.lane, P.ly, 0.45) && xOverlap(P.x, TUNE.busLen * 0.9, q.x, 50) && P.z < 60) {
              q.hit = true;
              S.fx.push({ kind: 'boom', x: q.x, ly: q.lane, t: 0, life: 0.4, r: 50 });
              if (P.boostT > 0) S.stats.score += 100; else hurt('piedra');
            }
          }
        }
      }
      S.projectiles = S.projectiles.filter((q) => q.x > P.x - 600 && !q.hit && q.t < 12);
      // Tramos y puntos de reaparición (durante el duelo con el maestro la ruta está en pausa).
      const sec = mbActive() ? S.section : sectionAt(P.x - S.shift);
      if (sec > S.section) {
        S.section = sec;
        if (sec > S.checkpoint) { S.checkpoint = sec; emit('checkpoint', { section: sec }); }
        emit('chapter', { index: sec, section: SECTIONS[sec], total: SECTIONS.length });
      }
      // Puntuación por distancia y efectos.
      S.stats.score += Math.round(P.v * dt * 0.05);
      P.invT = Math.max(0, P.invT - dt); P.hurtT = Math.max(0, P.hurtT - dt);
      S.shakeT = Math.max(0, S.shakeT - dtReal); S.flashT = Math.max(0, S.flashT - dtReal);
      tickFx(dt);
      S.cam.x += ((P.x - 150 - (P.v - TUNE.cruise) * 0.25) - S.cam.x) * Math.min(1, dtReal * 6);
    }
    function land() {
      const P = S.P;
      P.air = false; P.z = 0; P.vz = 0;
      S.stats.jumps++;
      const big = P.airMax > 140;
      const bonus = Math.round(P.airT * 600);
      S.stats.score += bonus;
      P_nitro(big ? 25 : 12);
      S.shakeT = Math.max(S.shakeT, big ? 0.35 : 0.18);
      sparks(P.x - 60, P.ly, big ? 18 : 8, '#ffcf7a');
      emit('land', { air: P.airT, big, bonus }); emit('sfx', { name: 'landing' });
      if (big) message('stunt', '¡ACROBACIA! +' + bonus + ' · NITRO', 2, 1);
    }
    function fallInGap(g) {
      const P = S.P;
      emit('sfx', { name: 'hard' });
      message('gap', '¡A LA ZANJA! TOMA LA RAMPA CON VELOCIDAD', 3, 1.5);
      P.invT = 0; hurt('gap');
      if (S.state !== 'playing') return;
      // La moto reaparece del otro lado (la grúa de la obra lo saca), más lento.
      P.x = g.x2 + 120; P.v = TUNE.cruise * 0.7; P.invT = TUNE.invuln * 1.4;
      S.cam.x = P.x - 160;
    }
    function collide(dt) {
      const P = S.P, busLen = TUNE.busLen;
      // Fijos.
      for (const s of S.course.statics) {
        if (s.x > P.x + 400) break;
        if (s.got || s.kind === 'ramp' || s.x < P.x - 400) continue;
        if (!xOverlap(P.x, busLen * 0.9, s.x, 40) || !laneOverlap(s.lane, P.ly)) continue;
        const zok = (s.z || 0) === 0 ? P.z < 40 : Math.abs(P.z - s.z) < 90;
        if (!zok) continue;
        if (s.kind === 'nitro') { s.got = true; P_nitro(30); S.stats.score += 100; emit('sfx', { name: 'power' }); message('nitro', '+NITRO ⚡', 1, 0.6); }
        else if (s.kind === 'repair') { s.got = true; P.hp = Math.min(P.maxHp, P.hp + 1); emit('sfx', { name: 'item' }); message('repair', '¡REPARACIÓN! +1 A LA MOTO', 2, 0.6); }
        else if (s.kind === 'gem') { s.got = true; S.stats.gems++; S.stats.score += 150; emit('sfx', { name: 'gem' }); }
        else if (s.kind === 'cone') { s.got = true; s.flyT = 0; S.stats.score += 25; P.v *= 0.95; emit('sfx', { name: 'stomp' }); debrisAt(s, '#ff7a2f', 5); }
        else if (s.kind === 'oil') { s.got = true; P.wobbleT = 0.9; P.wobbleDir = P.lane === 2 ? -1 : 1; message('oil', '¡ACEITE! SUELTA EL ACELERADOR', 2, 1.5); emit('sfx', { name: 'skid' }); }
        else if (s.kind === 'barrier') {
          s.got = true; debrisAt(s, '#ffd23a', 9);
          if (P.boostT > 0) { S.stats.score += 200; emit('sfx', { name: 'crash' }); S.shakeT = Math.max(S.shakeT, 0.2); }
          else hurt('barrier');
        }
      }
      // Proyectiles.
      for (const q of S.projectiles) {
        if (q.hit || (q.kind === 'rock' && !q.landed) || !laneOverlap(q.lane, P.ly, 0.42) || P.z > 60) continue;
        const len = q.kind === 'spikes' ? 90 : 60;
        if (!xOverlap(P.x, busLen * 0.9, q.x, len)) continue;
        q.hit = true;
        if (q.kind === 'spikes') { if (P.boostT > 0) { S.stats.score += 100; } else { hurt('spikes'); P.wobbleT = 0.6; } }
        else { explodeSmall(q); if (P.boostT > 0 && (q.kind === 'barrel' || q.kind === 'rock')) S.stats.score += 150; else hurt(q.kind === 'rock' ? 'piedra' : q.kind); }
      }
      // Vehículos.
      for (const f of S.foes) {
        if (f.dead || f.boss && f.state === 'enter' || f.state === 'leave') continue;   // los que se retiran ya no estorban
        const k = KIND[f.kind];
        if (!xOverlap(P.x, busLen * 0.92, f.x, k.len * 0.92) || !laneOverlap(f.ly, P.ly, 0.62) || P.z > k.h * 0.8) {
          // Rozón: pasar muy cerca de un vehículo da nitro (una vez por vehículo).
          if (!f.nearDone && !P.air && Math.abs(f.ly - P.ly) < 1.15 && Math.abs(f.ly - P.ly) > 0.62 && Math.abs(f.x - P.x) < 30 && P.v > 650) {
            f.nearDone = true; S.stats.nearMiss++; P_nitro(6); S.stats.score += 75;
            message('near', '¡ROZÓN! +NITRO', 1, 1.2);
          }
          continue;
        }
        const behind = f.x > P.x;   // el vehículo va delante: lo golpeamos con el frente de la moto
        if (f.civil) {
          if (P.boostT > 0 && behind) { f.bumpT = 0.6; f.bumpLane = f.lane === 0 ? -0.6 : f.lane === 2 ? 2.6 : (f.lane + (rnd() < 0.5 ? -1 : 1) * 0.8); f.x += 60; f.v += 300; S.stats.score += 120; emit('sfx', { name: 'crash' }); S.shakeT = Math.max(S.shakeT, 0.15); }
          else if (hurt('traffic')) { if (behind) { f.x = P.x + busLen / 2 + k.len / 2 + 8; f.v = Math.max(f.v, P.v + 60); } }
          continue;
        }
        if (f.miniboss) {
          if (f.state === 'jump' && f.z > 40) continue;
          if (f.state === 'dash') { hurt('dash', Math.sign(P.ly - f.ly) || 1); continue; }
          if (behind && f.x - P.x > (busLen + k.len) * 0.3) {   // embestida por detrás (no un roce de lado)
            if (!damageFoe(f, P.boostT > 0 ? 2 : 1, P.boostT > 0 ? 'boostRam' : 'ram') && f.blocked) hurt('crash');   // lo para con la regla
            P.v = Math.max(TUNE.vMin, f.v - 160); P.x = f.x - busLen / 2 - k.len / 2 - 6;
          } else if (!behind) { f.v = P.v - 260; f.x = Math.min(f.x, P.x - busLen / 2 - k.len / 2 - 4); }   // roce: solo lo frena
          else f.targetLane = clamp(f.lane + (Math.sign(f.ly - P.ly) || 1), 0, LANES - 1);
          continue;
        }
        if (f.boss) {
          if (behind) {
            const ok = damageFoe(f, P.boostT > 0 ? 2 : 1, P.boostT > 0 ? 'boostRam' : 'ram');
            if (!ok && P.boostT <= 0) hurt('truck');
            P.v = Math.max(TUNE.vMin, f.v - 160);
            P.x = f.x - busLen / 2 - k.len / 2 - 6;
          }
          continue;
        }
        if (behind && P.boostT > 0) { damageFoe(f, 2, 'boost'); P.x -= 10; continue; }
        // Patrulla o moto de la banda encima de Sofía: la embestida de ellos (o un choque frontal) quita carrocería.
        if (hurt(f.kind === 'patrol' && f.state === 'ram' ? 'ram' : 'crash', Math.sign(P.ly - f.ly) || 1)) {
          if (!f.dead) { f.state = 'recover'; f.cd = 1.6; f.targetLane = clamp(f.lane + (Math.sign(f.ly - P.ly) || 1), 0, LANES - 1); }
          if (behind) { f.x = P.x + busLen / 2 + k.len / 2 + 10; }
        }
      }
    }
    function debrisAt(s, color, n) { for (let i = 0; i < n; i++) S.debris.push({ x: s.x, ly: s.lane, z: 10, vx: 200 + rnd() * 500, vz: 200 + rnd() * 350, rot: rnd() * 6, vr: (rnd() - 0.5) * 16, t: 0, life: 1, s: 5 + rnd() * 7, color }); }
    function explodeSmall(q) { S.fx.push({ kind: 'boom', x: q.x, ly: q.ly, t: 0, life: 0.5, r: 70 }); emit('sfx', { name: 'explosion' }); }
    function tickFx(dt) {
      for (const p of S.fx) { p.t += dt; if (p.kind === 'spark' || p.kind === 'drop') { p.x += p.vx * dt; p.vz -= (p.kind === 'drop' ? 1400 : 900) * dt; p.z += p.vz * dt; } }
      S.fx = S.fx.filter((p) => p.t < p.life);
      for (const d of S.debris) { d.t += dt; d.x += d.vx * dt; d.vz -= 1300 * dt; d.z = Math.max(0, d.z + d.vz * dt); d.rot += d.vr * dt; }
      S.debris = S.debris.filter((d) => d.t < d.life);
    }

    /* ---------- Final de película ---------- */
    function startFinale() {
      const P = S.P;
      S.state = 'finale'; S.finale.started = true; S.finale.t = 0; S.finale.splash = false;
      P.vz = 760; P.v = Math.max(P.v, 900); P.air = true;
      S.slowT = 0; S.timeScale = 1;
      emit('finale'); emit('sfx', { name: 'ramp' });
    }
    /* La moto vuela sobre la barranca en cámara lenta y cae al agua de la presa (WATER_Z bajo la calzada). */
    const WATER_Z = -260;
    function finaleStep(dt) {
      const P = S.P, F = S.finale;
      F.t += dt;
      S.timeScale = F.t > 0.35 && F.t < 1.55 ? TUNE.slowmo * 0.9 : 1;
      if (!F.splash) {
        P.x += P.v * dt; P.vz -= TUNE.gravity * 0.6 * dt; P.z += P.vz * dt;
        if (P.z <= WATER_Z) {
          F.splash = true; F.splashT = F.t; P.z = WATER_Z; P.vz = -60; P.v *= 0.25;
          S.fx.push({ kind: 'splash', x: P.x, ly: P.ly, z: WATER_Z, t: 0, life: 1.6, r: 260 });
          for (let i = 0; i < 40; i++) S.fx.push({ kind: 'drop', x: P.x + (rnd() - 0.5) * 200, ly: P.ly, z: WATER_Z, vx: (rnd() - 0.5) * 500, vz: 300 + rnd() * 700, t: 0, life: 1.2 + rnd() * 0.5 });
          S.shakeT = 0.6; S.flashT = 0.25;
          emit('splash'); emit('sfx', { name: 'splashBig' });
        }
      } else {
        P.x += P.v * dt; P.v *= Math.max(0, 1 - dt * 1.5); P.z += P.vz * dt; P.vz = Math.max(-140, P.vz - 80 * dt);
      }
      S.cam.x += ((P.x - 200) - S.cam.x) * Math.min(1, dt * 4);
      tickFx(dt);
      if (F.splash && F.t - F.splashT > 1.4 && !F.done) {
        F.done = true; S.state = 'won';
        S.stats.score += 3000;
        emit('victory', { stats: summary(), stars: stars() });
      }
    }
    function stars() { return 1 + (S.deaths === 0 && S.stats.startSection === 0 ? 1 : 0) + (S.stats.takedowns >= 6 ? 1 : 0); }
    function summary() { return Object.assign({}, S.stats, { hp: S.P.hp, maxHp: S.P.maxHp, deaths: S.deaths, section: S.section, practice: S.practice }); }
    function drainEvents() { const e = S.events.slice(); S.events.length = 0; return e; }

    /** Posición en el trazado original (para la barra de progreso): el duelo del maestro no avanza la ruta. */
    const routeX = () => (mbActive() ? S.mbPivot - 700 : S.P.x - S.shift);
    Object.assign(S, { routeX, newRun, retry, step, drainEvents, summary, stars, hurt, spawn, damageFoe, WATER_Z });
    return S;
  }

  /* Progreso: llegar a un tramo lo deja abierto en el menú; ganar abre la misión 3 (el submarino). */
  function applyCheckpoint(save, section) {
    if (!save.missions) save.missions = {};
    save.missions.calzada = Math.max(save.missions.calzada || 0, (section | 0) + 1);
    return save;
  }
  function applyVictory(save, stats) {
    applyCheckpoint(save, SECTIONS.length - 1);
    save.missions.submarino = Math.max(save.missions.submarino || 0, 1);
    save.chase = save.chase || {};
    if (stats) {
      save.chase.bestScore = Math.max(save.chase.bestScore || 0, stats.score | 0);
      save.chase.bestTakedowns = Math.max(save.chase.bestTakedowns || 0, stats.takedowns | 0);
      if (stats.startSection === 0 && (!save.chase.bestTime || stats.t < save.chase.bestTime)) save.chase.bestTime = Math.round(stats.t);
    }
    save.chase.wins = (save.chase.wins || 0) + 1;
    // V58.8.27: cristales al banco y calificación (resistencia que quedó, derribos y caídas).
    const UP = NS.Upgrades;
    if (UP && stats) {
      UP.deposit(save, stats.gems | 0);
      if (stats.startSection === 0) {
        const g = UP.rank({ contracts: { total: 1, main: 1, bonus: (stats.takedowns | 0) >= 6 ? 1 : 0 }, lives: stats.hp, maxLives: stats.maxHp, deaths: stats.deaths });
        save.chase.lastRank = g.rank; UP.recordRank(save, 'calzada', g.rank);
      }
    }
    return save;
  }

  NS.Chase = { createChase, buildCourse, applyCheckpoint, applyVictory, SECTIONS, TUNE, KIND, LANES, BOSS_X, sectionAt };
})(typeof globalThis !== 'undefined' ? globalThis : window);
