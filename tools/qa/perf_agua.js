// QA V52 · Rendimiento con el AGUA en pantalla: como perf_test.js, pero pone a Sofía en el lago del Parque
// (tramo 13) y en la pila de la Plaza (tramo 16) y la mueve ahí (nadando: lado a lado, bucea y sube). Con una
// versión sin agua (V51) pone a Sofía en las mismas coordenadas, así se compara el dibujo de la misma zona.
// OJO: Chromium sin pantalla dibuja el lienzo por software (sin la GPU del teléfono): es una cota pesimista,
// útil para comparar versiones y detectar regresiones, no una medición de un teléfono real.
// Uso: node perf_agua.js <baseUrl> [rates csv=1,4,6] [segundos=6]
const { chromium, devices } = require('playwright');

(async () => {
  const [base, ratesArg, secsArg] = process.argv.slice(2);
  const rates = (ratesArg || '1,4,6').split(',').map(Number);
  // Coordenadas del mapa (las del agua de V52) para el lago del Parque y la pila de la Plaza.
  const spots = [{ lv: 12, map: 'parque', x: 330, y: 600 }, { lv: 15, map: 'plaza', x: 290, y: 640 }];
  const levels = spots.map((s) => s.lv);
  const secs = +(secsArg || 6);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'], viewport: { width: 412, height: 839 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('camion-cinematic-seen', '1'); localStorage.setItem('camion-opt-cinematics', '0'); } catch (_) {} });
  await page.goto(base + '/Se_Me_Fue_El_Camion.html?qa', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CAMION_QA && !document.getElementById('start').disabled, null, { timeout: 30000 });
  await page.waitForTimeout(1500); // que terminen de cargar las imágenes
  const cdp = await ctx.newCDPSession(page);
  await page.evaluate(() => {
    const Q = window.CAMION_QA, G = Q.G, R = Q.R;
    const M = window.__perf = { frames: [], step: 0, draw: 0, steps: 0, draws: 0, on: false };
    const os = G.step, od = R.draw;
    G.step = function (...a) { const t = performance.now(); const r = os.apply(this, a); if (M.on) { M.step += performance.now() - t; M.steps++; } return r; };
    R.draw = function (...a) { const t = performance.now(); const r = od.apply(this, a); if (M.on) { M.draw += performance.now() - t; M.draws++; } return r; };
    const tick = (now) => { if (M.on) M.frames.push(now); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const rows = [];
  for (const rate of rates) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    for (const lv of levels) {
      const spot = spots.find((s) => s.lv === lv);
      await page.evaluate((spot) => {
        const Q = window.CAMION_QA, G = Q.G; Q.start(spot.lv); G.P.invuln = 999; G.run.lives = 99;
        const sc = G.world.scenes[spot.lv], S = window.CAMION.CONFIG.world.sceneScale;
        const put = () => { G.P.x = sc.x0 + spot.x * S; G.P.y = sc.startY + spot.y * S; G.P.vx = 0; G.P.vy = 0; G.P.ground = null; };
        put(); G.updateCamera(0, true);
        // Se queda en la zona del agua: lado a lado, abajo y arriba; si se sale de la zona, vuelve.
        let k = 0;
        clearInterval(window.__drive);
        window.__drive = setInterval(() => {
          k++;
          const right = Math.floor(k / 10) % 2 === 0, down = Math.floor(k / 7) % 3 === 1;
          const M = window.__perf; if (M.on) { M.samp++; if (G.P.water || G.P.wade) M.wet++; }
          if (Math.abs(G.P.x - (sc.x0 + spot.x * S)) > 140 || Math.abs(G.P.y - (sc.startY + spot.y * S)) > 160) put();
          Q.input.inject({ held: { right, left: !right, down, up: !down && k % 5 < 2 }, edge: { dash: k % 23 === 0 } });
        }, 100);
      }, spot);
      await page.waitForTimeout(2000); // estabiliza la calidad adaptativa
      await page.evaluate(() => Object.assign(window.__perf, { frames: [], step: 0, draw: 0, steps: 0, draws: 0, samp: 0, wet: 0, on: true }));
      await page.waitForTimeout(secs * 1000);
      const r = await page.evaluate(() => {
        const M = window.__perf; M.on = false;
        const f = M.frames, iv = [];
        for (let i = 1; i < f.length; i++) iv.push(f[i] - f[i - 1]);
        iv.sort((a, b) => a - b);
        const cv = document.querySelector('canvas'), dpr = Math.min(devicePixelRatio || 1, 2);
        return {
          fps: (f.length - 1) / ((f[f.length - 1] - f[0]) / 1000), p95: iv[Math.floor(iv.length * 0.95)] || 0,
          stepMs: M.step / Math.max(1, M.draws), drawMs: M.draw / Math.max(1, M.draws),
          quality: cv.width / Math.round(innerWidth * dpr), state: window.CAMION_QA.G.state, id: window.CAMION_QA.G.world.scenes[window.CAMION_QA.G.tramo].id, wet: M.samp ? M.wet / M.samp : 0
        };
      });
      rows.push(Object.assign({ rate, lv }, r));
      console.log(`CPU×${rate}  nivel ${String(lv + 1).padStart(2)} ${r.id.padEnd(20)} ${r.fps.toFixed(1).padStart(5)} fps  p95 ${r.p95.toFixed(1).padStart(5)} ms  sim ${r.stepMs.toFixed(2)} ms  dibujo ${r.drawMs.toFixed(2)} ms  calidad ${(r.quality * 100).toFixed(0)}%  en el agua ${(r.wet * 100).toFixed(0)}%  (${r.state})`);
    }
  }
  await page.evaluate(() => clearInterval(window.__drive));
  await browser.close();
  console.log(JSON.stringify({ errors: errors.slice(0, 5) }));
})().catch((e) => { console.error(e); process.exit(1); });
