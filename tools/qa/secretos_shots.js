// V58.7 · Capturas de las zonas secretas, sus enemigos y los jefes nuevos, a la escala real del juego.
// Uso: node secretos_shots.js <url_base> <carpeta_salida>   (p. ej. http://localhost:8765 /tmp/qa)
// Entra a cada zona por su grieta (BAJAR, como un jugador), fuerza cada estado de cada enemigo y guarda una captura;
// al final sale por la puerta de la zona y comprueba que regresa junto a la grieta. Reporta errores de la página.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [base, out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('camion-cinematic-seen', '1'); localStorage.setItem('camion-cinematic-marino-seen', '1'); for (let i = 0; i < 40; i++) localStorage.setItem('camion-boss-cinematic-v38-scene-' + i, '1'); } catch (_) {} });
  await page.goto(base + '/Se_Me_Fue_El_Camion.html?qa&manual=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CAMION_QA && !document.getElementById('start').disabled, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const shot = async (name) => { await page.evaluate(() => { const Q = window.CAMION_QA; Q.ui.clearOverlays(); Q.draw(); }); await page.screenshot({ path: `${out}/${name}.png` }); };
  const log = (...a) => console.log(...a);

  // Coloca a Sofía en (x, y) [pies], de pie si hay piso; deja quieta la cámara en ella.
  const place = (x, y) => page.evaluate(([x, y]) => {
    const Q = window.CAMION_QA, G = Q.G, P = G.P;
    P.x = x; P.y = y - P.h / 2; P.vx = 0; P.vy = 0; P.invuln = 99;
    P.ground = G.world.platforms.concat(G.world.solids).find((p) => Math.abs((p.y ?? p.y1) - y) < 1 && x >= p.x1 && x <= p.x2) || null;
    G.updateCamera(0, true);
  }, [x, y]);
  // Fuerza el estado de un enemigo (y su tiempo dentro del estado) para fotografiarlo.
  const force = (pred, state, stateT, extra) => page.evaluate(([pred, state, stateT, extra]) => {
    const G = window.CAMION_QA.G, f = G.world.foes.find(eval(pred));
    if (!f) return null;
    Object.assign(f, { state, stateT, cool: 99, flash: 0 }, extra || {});
    return { kind: f.kind, x: Math.round(f.x), y: Math.round(f.y), state: f.state };
  }, [pred, state, stateT, extra]);
  const camOn = (x, y) => page.evaluate(([x, y]) => { const G = window.CAMION_QA.G; G.cam.x = x - G.view.w / 2; G.cam.y = y - G.view.h * 0.5; }, [x, y]);

  async function secretRoom(mission, tag) {
    await page.evaluate((m) => { const Q = window.CAMION_QA; Q.start(m, 0, true); Q.step(10); }, mission);
    const d = await page.evaluate(() => { const G = window.CAMION_QA.G, d = G.world.doors.find((q) => q.kind === 'secreto'); return { x: d.x, y: d.y, room: d.room }; });
    await place(d.x - 70, d.y); await page.evaluate(() => window.CAMION_QA.step(30));
    await shot(tag + '_01_grieta_lejos');
    await place(d.x - 10, d.y); await page.evaluate(() => window.CAMION_QA.step(20));
    await shot(tag + '_02_grieta_cerca');
    // Entra como un jugador: BAJAR sobre la grieta.
    await place(d.x, d.y);
    await page.evaluate(() => { const Q = window.CAMION_QA; Q.step(1, { downPressed: true }); Q.step(40); });
    const inside = await page.evaluate(() => { const G = window.CAMION_QA.G; return { region: G.region, secret: G.room && G.room.secret, hud: document.getElementById('hudTramo').textContent, obj: document.getElementById('objective').textContent }; });
    log(tag, 'dentro:', JSON.stringify(inside));
    await shot(tag + '_03_llegada');
    return inside;
  }

  // ---------- Misión 3: santuario ----------
  const sea = await secretRoom(2, 'mar');
  const seaFoes = await page.evaluate(() => { const G = window.CAMION_QA.G; return G.world.foes.filter((f) => f.region === G.room.id).map((f) => ({ k: f.kind, x: f.x, y: f.y, boss: f.isBoss })); });
  for (const f of seaFoes) {
    if (f.k === 'pulpito' && !f.boss) {
      await place(f.x - 90, f.y + 20); await page.evaluate(() => window.CAMION_QA.step(2));
      await camOn(f.x, f.y);
      for (const [st, t] of [['fly', 0], ['windup', 0.3], ['charge', 0.15], ['aim', 0.5], ['dizzy', 0.3]]) { await force(`(q) => q.kind === 'pulpito' && Math.abs(q.x - ${f.x}) < 400`, st, t); await shot(`mar_pulpito_${st}`); }
      break;
    }
  }
  const buz = seaFoes.find((f) => f.k === 'buzito');
  if (buz) { await camOn(buz.x, buz.y); for (const [st, t] of [['fly', 0], ['aim', 0.45], ['dizzy', 0.2]]) { await force(`(q) => q.kind === 'buzito'`, st, t); await shot(`mar_buzito_${st}`); } }
  const boss = seaFoes.find((f) => f.boss);
  if (boss) {
    await camOn(boss.x, boss.y);
    for (const [st, t, ex] of [['fly', 0], ['windup', 0.5], ['charge', 0.2], ['aim', 0.6, { shotKind: 'tinta' }], ['aim', 0.6, { shotKind: 'chorro' }], ['dizzy', 0.4]]) {
      await force(`(q) => q.kind === 'pulpo_abismo'`, st, t, ex); await shot(`mar_jefe_${st}${ex ? '_' + ex.shotKind : ''}`);
    }
    // Disparos reales: deja que dispare tinta y chorro hacia Sofía.
    await place(boss.x - 230, boss.y); await page.evaluate(() => { const Q = window.CAMION_QA, G = Q.G, f = G.world.foes.find((q) => q.kind === 'pulpo_abismo'); f.state = 'fly'; f.cool = 0; f.stateT = 0; f.shotKind = 'chorro'; Q.step(70); });
    await shot('mar_jefe_disparo_tinta');
    await page.evaluate(() => { const Q = window.CAMION_QA, G = Q.G, f = G.world.foes.find((q) => q.kind === 'pulpo_abismo'); G.world.shots.length = 0; f.state = 'fly'; f.cool = 0; f.stateT = 0; f.shotKind = 'tinta'; Q.step(72); });
    await shot('mar_jefe_disparo_chorro');
  }
  // Salida: subir a la losa de la derecha y BAJAR en la puerta.
  const ex = await page.evaluate(() => { const G = window.CAMION_QA.G, d = G.room.exit; return { x: d.x, y: d.y, to: d.to }; });
  await page.evaluate(() => { window.CAMION_QA.G.world.shots.length = 0; });
  await place(ex.x, ex.y); await page.evaluate(() => window.CAMION_QA.step(10));
  await shot('mar_04_salida');
  await page.evaluate(() => { const Q = window.CAMION_QA; Q.step(1, { downPressed: true }); Q.step(40); });
  const back = await page.evaluate(() => { const G = window.CAMION_QA.G; return { region: G.region, x: Math.round(G.P.x), y: Math.round(G.P.y + G.P.h / 2) }; });
  log('mar: salida →', JSON.stringify(back), 'esperado cerca de', Math.round(ex.to.x), Math.round(ex.to.y));
  await shot('mar_05_de_vuelta');

  // ---------- Misión 4: estación ----------
  const moon = await secretRoom(3, 'luna');
  const moonFoes = await page.evaluate(() => { const G = window.CAMION_QA.G; return G.world.foes.filter((f) => f.region === G.room.id).map((f) => ({ k: f.kind, x: f.x, y: f.y, boss: f.isBoss })); });
  const mar = moonFoes.find((f) => f.k === 'marciano' && !f.boss);
  if (mar) { await camOn(mar.x, mar.y - 40); for (const [st, t, ex2] of [['patrol', 0], ['aim', 0.3], ['patrol', 0, { shotT: 0.2 }], ['dizzy', 0.2]]) { await force(`(q) => q.kind === 'marciano' && !q.isBoss`, st, t, ex2); await shot(`luna_marciano_${st}${ex2 ? '_disparo' : ''}`); } }
  const ast = moonFoes.find((f) => f.k === 'astronino');
  if (ast) { await camOn(ast.x, ast.y - 40); for (const [st, t] of [['patrol', 0], ['windup', 0.3], ['charge', 0.2], ['aim', 0.4], ['dizzy', 0.3]]) { await force(`(q) => q.kind === 'astronino'`, st, t); await shot(`luna_astronino_${st}`); } }
  const mb = moonFoes.find((f) => f.boss);
  if (mb) {
    await camOn(mb.x, mb.y - 40);
    for (const [st, t] of [['patrol', 0], ['aim', 0.4]]) { await force(`(q) => q.isBoss && q.kind === 'marciano'`, st, t); await shot(`luna_jefe_${st}`); }
    await place(mb.x - 160, mb.y); await page.evaluate(() => { const Q = window.CAMION_QA, f = Q.G.world.foes.find((q) => q.isBoss && q.kind === 'marciano'); f.enraged = true; f.state = 'patrol'; f.cool = 0; Q.step(45); });
    await shot('luna_jefe_disparo_doble');
  }
  // ---------- Misión 1, parada 3: El Maestro Enojón ----------
  await page.evaluate(() => { const Q = window.CAMION_QA; Q.start(0, 2, true); Q.step(10); });
  const m = await page.evaluate(() => { const G = window.CAMION_QA.G, f = G.world.foes.find((q) => q.kind === 'maestro'); return f && { x: f.x, y: f.y, name: f.bossName, hp: f.hp, arena: [f.arena.x1, f.arena.x2] }; });
  log('maestro:', JSON.stringify(m));
  if (m) {
    await place(m.x - 150, m.y); await page.evaluate(() => window.CAMION_QA.step(2));
    await camOn(m.x - 40, m.y - 60);
    for (const [st, t, ex3] of [['patrol', 0], ['windup', 0.5], ['charge', 0.2], ['aim', 0.3, { throwKind: 'libro' }], ['aim', 0.3, { throwKind: 'borrador' }], ['shout', 0.5], ['dizzy', 0.3], ['dizzy', 1.0], ['recoil', 0.1]]) {
      await force(`(q) => q.kind === 'maestro'`, st, t, ex3); await shot(`maestro_${st}${ex3 ? '_' + ex3.throwKind : ''}${st === 'dizzy' ? '_' + t : ''}`);
    }
    // Ataques reales: libro, borrador y (enojado) las ondas del grito.
    await page.evaluate(() => { const Q = window.CAMION_QA, f = Q.G.world.foes.find((q) => q.kind === 'maestro'); f.state = 'patrol'; f.cool = 0; f.throwKind = 'borrador'; Q.step(40); });
    await shot('maestro_lanza_libro');
    await page.evaluate(() => { const Q = window.CAMION_QA, f = Q.G.world.foes.find((q) => q.kind === 'maestro'); Q.G.world.shots.length = 0; f.state = 'patrol'; f.cool = 0; f.enraged = true; f.shoutCD = 0; Q.step(52); });
    await shot('maestro_grito_ondas');
    await page.evaluate(() => { const Q = window.CAMION_QA, f = Q.G.world.foes.find((q) => q.kind === 'maestro'); f.dead = true; f.deadT = 0.2; });
    await shot('maestro_cae');
    await page.evaluate(() => { const Q = window.CAMION_QA, f = Q.G.world.foes.find((q) => q.kind === 'maestro'); f.deadT = 0.9; });
    await shot('maestro_ko');
  }
  log('errores:', errors.length ? errors.join('\n') : 'ninguno');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
