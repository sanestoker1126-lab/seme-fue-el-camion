// QA V52 · Nado con toques reales: joystick en diagonal abajo = bucear, arriba = subir, SALTAR = salir, DASH bajo el agua.
const { chromium, devices } = require('playwright');
(async () => {
  const base = process.argv[2];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'], viewport: { width: 412, height: 839 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('camion-cinematic-seen', '1'); localStorage.setItem('camion-opt-cinematics', '0'); });
  await page.goto(base + '/Se_Me_Fue_El_Camion.html?qa', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CAMION_QA && !document.getElementById('start').disabled);
  await page.tap('#start'); await page.waitForFunction(() => window.CAMION_QA.G.state === 'playing');
  await page.evaluate(() => { const Q = window.CAMION_QA; Q.start(12); });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const G = window.CAMION_QA.G, z = G.world.waters.find((w) => w.scene === 12);
    G.world.foes = G.world.foes.filter((f) => f.scene !== 12);
    G.P.invuln = 99; G.P.x = (z.x1 + z.x2) / 2; G.P.y = z.y + 8; G.P.vx = 0; G.P.vy = 0; G.P.ground = null; G.updateCamera(0, true);
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const G = window.CAMION_QA.G, orig = G.step; window.__dash = []; G.step = function (dt, inp) { const r = orig.call(this, dt, inp); if (inp.dashPressed) window.__dash.push({ dashT: +G.P.dashT.toFixed(3), cd: +G.P.dashCD.toFixed(2), vx: Math.round(G.P.vx), face: G.P.face, x: Math.round(G.P.x) }); return r; }; });
  const cdp = await ctx.newCDPSession(page);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const r = (s) => page.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; }, s);
  const st = () => page.evaluate(() => { const G = window.CAMION_QA.G, P = G.P; return { water: !!P.water, sub: P.submerged, state: P.state, depth: P.water ? Math.round(P.y - P.water.y) : null, x: Math.round(P.x) }; });
  const stick = await r('#stickBase'), jump = await r('[data-key="jump"]'), dash = await r('[data-key="dash"]');
  const max = stick.w * 0.31, out = [];
  out.push(['flota', await st()]);
  // Joystick en diagonal abajo-izquierda (no recto): debe bucear.
  await T('touchStart', [{ x: stick.x, y: stick.y, id: 1 }]);
  await T('touchMove', [{ x: stick.x - max * 0.6, y: stick.y + max * 0.7, id: 1 }]);
  await page.waitForTimeout(700);
  out.push(['diagonal abajo', await st()]);
  // DASH hacia el lado abierto (joystick abajo-derecha): la orilla izquierda es pared y un dash contra un sólido se cancela.
  await T('touchMove', [{ x: stick.x + max * 0.6, y: stick.y + max * 0.7, id: 1 }]);
  await page.waitForTimeout(120);
  await T('touchStart', [{ x: stick.x + max * 0.6, y: stick.y + max * 0.7, id: 1 }, { x: dash.x, y: dash.y, id: 2 }]);
  await page.waitForTimeout(80);
  out.push(['dash bajo el agua', await st()]);
  await T('touchEnd', [{ x: dash.x, y: dash.y, id: 2 }]);
  // Joystick arriba: sube.
  await T('touchMove', [{ x: stick.x, y: stick.y - max * 0.8, id: 1 }]);
  await page.waitForTimeout(500);
  out.push(['joystick arriba', await st()]);
  await T('touchEnd', []);
  await page.waitForTimeout(1200);
  out.push(['suelta todo', await st()]);
  await page.tap('[data-key="jump"]');
  await page.waitForTimeout(250);
  out.push(['SALTAR en la superficie', await st()]);
  for (const [k, v] of out) console.log(k.padEnd(24), JSON.stringify(v));
  console.log('pasos con dashPressed:', JSON.stringify(await page.evaluate(() => window.__dash)));
  console.log('errores', JSON.stringify(errors));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
