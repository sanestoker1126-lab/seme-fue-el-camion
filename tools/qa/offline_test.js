// Offline: registers the service worker (no ?qa), waits for the precache, cuts the network, reloads and plays.
const { chromium, devices } = require('playwright');
(async () => {
  const base = process.argv[2];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'], viewport: { width: 412, height: 839 } });
  const page = await ctx.newPage();
  const errors = [], failed = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => failed.push(r.url()));
  await page.addInitScript(() => { try { localStorage.setItem('camion-cinematic-seen', '1'); } catch (_) {} });
  await page.goto(base + '/Se_Me_Fue_El_Camion.html', { waitUntil: 'load' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  const t0 = Date.now();
  let info;
  for (;;) {
    info = await page.evaluate(async () => { const names = await caches.keys(); const c = names.length ? await caches.open(names[0]) : null; return { names, n: c ? (await c.keys()).length : 0, active: !!(navigator.serviceWorker.controller || (await navigator.serviceWorker.getRegistration())?.active) }; });
    if ((info.active && info.n > 0) || Date.now() - t0 > 60000) break;
    await page.waitForTimeout(500);
  }
  console.log('caché:', JSON.stringify(info));
  await ctx.setOffline(true);
  failed.length = 0;
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('start') && !document.getElementById('start').disabled, null, { timeout: 30000 });
  await page.tap('#start');
  await page.waitForFunction(() => document.body.classList.contains('playing'), null, { timeout: 10000 });
  await page.waitForTimeout(1500);
  const px = await page.evaluate(() => { const c = document.querySelector('canvas'), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++; return { lit, total: Math.floor(d.length / (4 * 97)) }; });
  await page.screenshot({ path: '/tmp/offline_play.png' });
  console.log('sin red → juega:', JSON.stringify({ controlled: await page.evaluate(() => !!navigator.serviceWorker.controller), px, failedLocal: failed.filter((u) => u.startsWith(base)).slice(0, 5), errors: errors.slice(0, 3) }));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
