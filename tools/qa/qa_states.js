// Visual QA of Sofía's states and the new mechanics at real game scale. Usage: node qa_states.js <baseUrl> <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [base, out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('camion-cinematic-seen', '1'); for (let i = 0; i < 40; i++) localStorage.setItem('camion-boss-cinematic-v38-scene-' + i, '1'); } catch (_) {} });
  await page.goto(base + '/Se_Me_Fue_El_Camion.html?qa&manual=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CAMION_QA && !document.getElementById('start').disabled, null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  const shot = async (name, clip) => { await page.evaluate(() => { const Q = window.CAMION_QA; Q.ui.clearOverlays(); Q.draw(); }); await page.screenshot({ path: `${out}/${name}.png`, clip }); };
  // Clip around Sofía in CSS px.
  const sofiaClip = async (w = 170, h = 200) => page.evaluate(([w, h]) => {
    const G = window.CAMION_QA.G, z = G.view.zoom, x = (G.P.x - G.cam.x) * z, y = (G.P.y - G.cam.y) * z;
    return { x: Math.max(0, x - w / 2), y: Math.max(0, y - h * 0.62), width: w, height: h };
  }, [w, h]);
  // --- States on the first level (wide floor) ---
  await page.evaluate(() => { const Q = window.CAMION_QA; Q.start(0); Q.step(20); Q.G.world.foes.length = 0; });
  const states = [
    ['idle', () => ({})],
    ['run', (i) => ({ right: true })],
    ['jump', (i) => ({ jumpPressed: i === 0, jumpHeld: true })],
    ['kick', (i) => ({ kickPressed: i === 0 })],
  ];
  for (const [name, f] of states) {
    const n = name === 'run' ? 14 : name === 'jump' ? 9 : name === 'kick' ? 5 : 30;
    await page.evaluate(([n, src]) => { const Q = window.CAMION_QA; const fn = eval(src); Q.step(n, (i) => fn(i)); }, [n, f.toString()]);
    await shot('sofia_' + name, await sofiaClip());
    const st = await page.evaluate(() => window.CAMION_QA.G.P.state);
    console.log(name, '→ state', st);
    await page.evaluate(() => { const Q = window.CAMION_QA; Q.step(60); });
  }
  // dash
  await page.evaluate(() => { const Q = window.CAMION_QA; Q.step(3, (i) => ({ dashPressed: i === 0, right: true })); });
  await shot('sofia_dash', await sofiaClip(220, 200));
  console.log('dash → state', await page.evaluate(() => window.CAMION_QA.G.P.state));
  // hurt
  await page.evaluate(() => { const Q = window.CAMION_QA; Q.step(60); Q.G.hurt(Q.G.P.x + 20, Q.G.P.y, 'rat'); Q.step(4); });
  await shot('sofia_hurt', await sofiaClip());
  console.log('hurt → state', await page.evaluate(() => window.CAMION_QA.G.P.state));
  // --- Crumbles (azoteas = tramo index 4) ---
  await page.evaluate(() => {
    const Q = window.CAMION_QA; Q.start(4); Q.step(10);
    const G = Q.G, cr = G.world.platforms.find((p) => p.kind === 'crumble' && p.scene === 4);
    G.world.foes.length = 0;
    G.P.x = (cr.x1 + cr.x2) / 2; G.P.y = cr.y - G.P.h / 2; G.P.vy = 0; G.P.ground = cr; G.updateCamera(0, true); Q.step(12);
  });
  await shot('crumble_shake', await sofiaClip(260, 220));
  await page.evaluate(() => window.CAMION_QA.step(40));
  await shot('crumble_gone', await sofiaClip(260, 300));
  // --- Belt (metro = 10) ---
  const beltLog = await page.evaluate(() => {
    const Q = window.CAMION_QA; Q.start(10); Q.step(10);
    const G = Q.G, b = G.world.platforms.find((p) => p.kind === 'belt' && p.scene === 10);
    G.world.foes.length = 0;
    G.P.x = b.x1 + 40; G.P.y = b.y - G.P.h / 2; G.P.vy = 0; G.P.ground = b; G.updateCamera(0, true);
    const x0 = G.P.x; Q.step(30); return { moved: G.P.x - x0, belt: b.belt };
  });
  console.log('belt', JSON.stringify(beltLog));
  await shot('belt', await sofiaClip(300, 220));
  // --- Umbrella (tlaquepaque = 13) ---
  const umb = await page.evaluate(() => {
    const Q = window.CAMION_QA; Q.start(13); Q.step(10);
    const G = Q.G, u = G.world.platforms.find((p) => p.kind === 'bounce' && p.umbrella && p.scene === 13);
    G.world.foes.length = 0;
    G.P.x = (u.x1 + u.x2) / 2; G.P.y = u.y - 140; G.P.vy = 0; G.P.ground = null; G.updateCamera(0, true);
    let minY = Infinity, bounced = false;
    for (let i = 0; i < 40; i++) { Q.step(1); minY = Math.min(minY, G.P.y); if (G.P.vy < -600) bounced = true; }
    return { bounced, rise: u.y - 140 - minY };
  });
  console.log('umbrella', JSON.stringify(umb));
  await shot('umbrella', await sofiaClip(300, 300));
  // --- Boss recoil (tramo 0 dog boss) ---
  const boss = await page.evaluate(() => {
    const Q = window.CAMION_QA; Q.start(0); Q.step(5);
    const G = Q.G, b = G.world.foes.find((f) => f.isBoss && f.scene === 0);
    G.world.foes = [b];
    G.P.x = b.x - 45; G.P.y = b.plat.y - G.P.h / 2; G.P.ground = b.plat; G.P.face = 1; G.P.invuln = 5; G.updateCamera(0, true);
    b.state = 'dizzy'; b.stateT = 0; Q.step(1, () => ({ kickPressed: true, right: true })); Q.step(6);
    return { state: b.state, hp: b.hp, max: b.maxHp };
  });
  console.log('boss', JSON.stringify(boss));
  await shot('boss_recoil', await sofiaClip(320, 240));
  console.log(JSON.stringify({ errors }));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
