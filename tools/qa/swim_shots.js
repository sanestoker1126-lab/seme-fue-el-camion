// QA V52 · Capturas de Sofía en el agua (lago del Parque y pila de la Plaza) con el modo manual.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [base, out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 780 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('camion-cinematic-seen', '1'); localStorage.setItem('camion-opt-cinematics', '0'); } catch (_) {} });
  await page.goto(base + '/Se_Me_Fue_El_Camion.html?qa&manual=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CAMION_QA && !document.getElementById('start').disabled, null, { timeout: 30000 });
  await page.waitForTimeout(1800);
  const shot = async (name, fn, arg) => {
    const info = await page.evaluate(fn, arg);
    await page.evaluate(() => { const Q = window.CAMION_QA; Q.ui.clearOverlays(); Q.draw(); });
    await page.screenshot({ path: `${out}/${name}.png` });
    return info;
  };
  const log = [];
  // Parque (índice 12): Sofía cae al lago desde el puente.
  log.push(await shot('01_cae', () => {
    const Q = window.CAMION_QA, G = Q.G; Q.start(12); Q.step(20);
    const z = G.world.waters.find((w) => w.scene === 12); G.P.invuln = 99;
    G.P.x = (z.x1 + z.x2) / 2 - 30; G.P.y = z.y - 95; G.P.vx = 0; G.P.vy = 420; G.P.ground = null; G.updateCamera(0, true);
    Q.step(5); return { state: G.P.state, water: !!G.P.water };
  }));
  log.push(await shot('02_chapuzon', () => { const Q = window.CAMION_QA, G = Q.G; Q.step(4); return { state: G.P.state, fx: G.waterFx.map((f) => f.kind).join(',') }; }));
  log.push(await shot('03_flota', () => { const Q = window.CAMION_QA, G = Q.G; Q.step(90); return { state: G.P.state, y: G.P.y - G.P.water.y }; }));
  log.push(await shot('04_nada', () => { const Q = window.CAMION_QA, G = Q.G; Q.step(40, { right: true }); return { state: G.P.state }; }));
  log.push(await shot('05_bucea', () => { const Q = window.CAMION_QA, G = Q.G; Q.step(22, { downHeld: true, left: true }); return { state: G.P.state, sub: G.P.submerged }; }));
  log.push(await shot('06_bajo_agua', () => { const Q = window.CAMION_QA, G = Q.G; Q.step(14, { left: true, downHeld: true }); Q.step(6, { left: true }); return { state: G.P.state, sub: G.P.submerged }; }));
  log.push(await shot('07_dash', () => { const Q = window.CAMION_QA, G = Q.G; Q.step(1, { dashPressed: true, right: true }); Q.step(5, { right: true }); return { state: G.P.state }; }));
  log.push(await shot('08_sube', () => { const Q = window.CAMION_QA, G = Q.G; Q.step(40, { left: true }); Q.step(30, { downHeld: true }); Q.step(10, { upHeld: true }); return { state: G.P.state }; }));
  log.push(await shot('09_salta_fuera', () => { const Q = window.CAMION_QA, G = Q.G; Q.step(80); Q.step(1, { jumpPressed: true, jumpHeld: true }); Q.step(8, { jumpHeld: true }); return { state: G.P.state, water: !!G.P.water }; }));
  // Plaza (índice 15): vadear en la pila de la fuente.
  log.push(await shot('10_vadea', () => {
    const Q = window.CAMION_QA, G = Q.G; Q.start(15); Q.step(10); G.P.invuln = 99;
    const z = G.world.waters.find((w) => w.scene === 15);
    const fl = G.world.platforms.find((p) => p.scene === 15 && Math.abs(p.y - z.y2) < 2);
    G.P.x = z.x1 + 20; G.P.y = fl.y - G.P.h / 2; G.P.ground = fl; G.P.vx = 0; G.P.vy = 0; G.updateCamera(0, true);
    Q.step(16, { right: true }); return { state: G.P.state, wade: !!G.P.wade, deep: z.deep, depth: z.y2 - z.y };
  }));
  console.log(JSON.stringify(log), JSON.stringify(errors.slice(0, 5)));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
