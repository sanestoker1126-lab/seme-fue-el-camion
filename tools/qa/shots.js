// In-game screenshots per tramo. Usage: node shots.js <baseUrl> <outDir> <w> <h> [tramos csv]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [base, out, w, h, list] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => errors.push('reqfail: ' + r.url()));
  await page.addInitScript(() => { try { localStorage.setItem('camion-cinematic-seen', '1'); for (let i = 0; i < 40; i++) localStorage.setItem('camion-boss-cinematic-v38-scene-' + i, '1'); } catch (_) {} });
  await page.goto(base + '/Se_Me_Fue_El_Camion.html?qa&manual=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CAMION_QA && document.getElementById('start') && !document.getElementById('start').disabled, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const n = await page.evaluate(() => window.CAMION_QA.G.world.scenes.length);
  const tramos = list ? list.split(',').map(Number) : [...Array(n).keys()];
  for (const t of tramos) {
    await page.evaluate((t) => { const Q = window.CAMION_QA; Q.start(t); Q.step(30); }, t);
    // Wait for images used by this scene to finish loading, then draw.
    await page.waitForTimeout(700);
    await page.evaluate(() => { const Q = window.CAMION_QA; Q.step(2); Q.ui.clearOverlays(); Q.draw(); });
    await page.screenshot({ path: `${out}/tramo_${String(t + 1).padStart(2, '0')}.png` });
    // A second shot lower in the level (teleport to mid-panel on a surface)
    await page.evaluate((t) => {
      const Q = window.CAMION_QA, G = Q.G, sc = G.world.scenes[t];
      const mid = sc.surfaces[Math.floor(sc.surfaces.length / 2)];
      G.P.x = (mid.x1 + mid.x2) / 2; G.P.y = mid.y - G.P.h / 2; G.P.vx = 0; G.P.vy = 0; G.P.ground = mid;
      G.updateCamera(0, true); Q.step(20); Q.ui.clearOverlays(); Q.draw();
    }, t);
    await page.waitForTimeout(200);
    await page.evaluate(() => { const Q = window.CAMION_QA; Q.step(1); Q.ui.clearOverlays(); Q.draw(); });
    await page.screenshot({ path: `${out}/tramo_${String(t + 1).padStart(2, '0')}_mid.png` });
  }
  console.log(JSON.stringify({ n, errors: errors.slice(0, 20) }, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
