const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 844, height: 390 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { localStorage.setItem('camion-cinematic-seen', '1'); localStorage.setItem('camion-opt-freeSelect', '1'); } catch (_) {} });
  await page.goto((process.env.BASE || 'http://localhost:8000') + '/Se_Me_Fue_El_Camion.html?qa&manual=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CAMION_QA && !document.getElementById('start').disabled, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  // 1) Tirolesa: Sofía en la fila, a 60 u del borde, corre hacia el cable.
  const zip = await page.evaluate(() => {
    const Q = window.CAMION_QA; Q.start(1, 2); Q.step(2);
    const G = Q.G, P = G.P, W = G.world;
    W.foes.forEach((f) => { f.dead = true; });
    const z = W.zips.find((q) => q.scene === 2);
    const row = W.platforms.filter((p) => p.region === 'main' && Math.abs(p.y - (z.ay + 68)) < 3 && z.ax >= p.x1 - 30 && z.ax <= p.x2 + 30)[0];
    const dir = z.ux > 0 ? 1 : -1;
    P.x = row && dir > 0 ? row.x2 - 70 : row ? row.x1 + 70 : z.ax - dir * 40; P.y = (row ? row.y : z.ay + 68) - P.h / 2; P.ground = row; P.vx = 0; P.vy = 0; P.invuln = 99;
    G.updateCamera(0, true);
    const seen = []; let landed = null, rode = 0, fell = 0;
    for (let i = 0; i < 360; i++) {
      Q.step(1, { right: dir > 0, left: dir < 0 });
      if (P.zip) rode++;
      for (const e of G.events) if (e.type === 'hurt') fell++;
      if (rode && !P.zip && P.ground && !landed) landed = { y: P.ground.y, id: P.ground.id };
      if (i === 40) Q.draw();
    }
    return { found: !!row, rodeFrames: rode, landed, hurts: fell, lives: G.run.lives };
  });
  console.log('tirolesa:', JSON.stringify(zip));
  await page.screenshot({ path: 'bot_zip.png' });
  // 2) Mar: desde la superficie sobre un desagüe, bucear hasta salir por abajo.
  const sea = await page.evaluate(() => {
    const Q = window.CAMION_QA; Q.start(2, 0); Q.step(2);
    const G = Q.G, P = G.P, W = G.world, z = W.waters.find((q) => q.sea), d = z.drains[0];
    W.foes.forEach((f) => { f.dead = true; });
    P.x = (d.x1 + d.x2) / 2; P.y = z.y - P.h / 2 - 40; P.vx = 0; P.vy = 200; P.ground = null; P.invuln = 99;
    let swam = 0, exitAt = -1, land = null;
    for (let i = 0; i < 900; i++) {
      Q.step(1, { downHeld: true });
      if (P.water) swam++;
      if (swam && !P.water && exitAt < 0) exitAt = i;
      if (exitAt >= 0 && P.ground && !land) land = { y: Math.round(P.ground.y), belowSea: P.ground.y > z.y2 };
      if (land) break;
    }
    return { swamFrames: swam, exitAt, land, lives: G.run.lives, cats: Object.values(G.companions.agents).map((a) => Math.round(Math.hypot(a.x - P.x, a.y - (P.y + P.h / 2)))) };
  });
  console.log('mar:', JSON.stringify(sea));
  await page.evaluate(() => { const Q = window.CAMION_QA; Q.ui.clearOverlays(); Q.draw(); });
  await page.screenshot({ path: 'bot_sea.png' });
  console.log(errors.length ? 'ERRORES: ' + JSON.stringify(errors) : 'sin errores');
  await b.close();
})();
