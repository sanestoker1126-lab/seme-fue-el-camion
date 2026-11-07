// QA V52 · Partida aleatoria DENTRO del agua: lago del Parque y pila de la Plaza (3 semillas cada uno), con dibujo.
// Si Sofía sale del agua, cada 150 pasos se le vuelve a meter (así se prueban entradas desde distintas alturas).
// Reporta errores de JavaScript, posiciones inválidas, pasos en el agua/sumergida/vadeando y estados vistos.
// Uso: node fuzz_agua.js <baseUrl> [pasos=1200]
const { chromium } = require('playwright');
(async () => {
  const [base, n] = [process.argv[2], +(process.argv[3] || 1200)];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('camion-cinematic-seen', '1'); localStorage.setItem('camion-opt-cinematics', '0'); } catch (_) {} });
  await page.goto(base + '/Se_Me_Fue_El_Camion.html?qa&manual=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CAMION_QA && !document.getElementById('start').disabled, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const res = await page.evaluate((N) => {
    const Q = window.CAMION_QA, G = Q.G, out = [];
    for (const [t, seed0] of [[12, 1], [12, 2], [12, 3], [15, 1], [15, 2], [15, 3]]) {
      let seed = 777 * seed0; const r = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
      Q.start(t);
      const z = G.world.waters.find((w) => w.scene === t);
      G.P.x = z.x1 + (z.x2 - z.x1) * (0.2 + 0.6 * r()); G.P.y = z.y - G.P.h / 2 - 40; G.P.vx = 0; G.P.vy = 0; G.P.ground = null;
      G.updateCamera(0, true);
      const states = new Set(); let ex = null, inWater = 0, sub = 0, fx = 0, maxFx = 0, wade = 0, replaced = 0;
      let held = { left: false, right: false, upHeld: false, downHeld: false };
      try {
        for (let i = 0; i < N; i++) {
          if (i % 20 === 0) { const d = r(), v = r(); held = { left: d < 0.35, right: d > 0.6, upHeld: v < 0.25, downHeld: v > 0.6 }; }
          const inp = Object.assign({}, held, { jumpPressed: r() < 0.025, jumpHeld: r() < 0.3, kickPressed: r() < 0.05, dashPressed: r() < 0.04, downPressed: r() < 0.03 });
          if (G.state === 'gameover' || G.state === 'won') break;
          if (G.state === 'paused') G.resume();
          if (i % 150 === 0 && !G.P.water && !G.P.wade && G.state === 'playing') { // volver a meterla al agua
            G.P.x = z.x1 + (z.x2 - z.x1) * (0.15 + 0.7 * r()); G.P.y = z.y - G.P.h / 2 - 10 - 120 * r(); G.P.vx = 0; G.P.vy = 0; G.P.ground = null; G.P.dashT = 0; G.updateCamera(0, true); replaced++;
          }
          Q.step(1, inp);
          if (i % 10 === 0) Q.draw();
          states.add(G.P.state); if (G.P.water) inWater++; if (G.P.submerged) sub++; if (G.P.wade) wade++;
          maxFx = Math.max(maxFx, (G.waterFx || []).length);
          if (!Number.isFinite(G.P.x) || !Number.isFinite(G.P.y) || !Number.isFinite(G.P.vx) || !Number.isFinite(G.P.vy)) throw new Error('NaN');
        }
      } catch (e) { ex = String(e && e.stack || e).slice(0, 300); }
      out.push({ t, seed: seed0, kind: z.kind, deep: z.deep, state: G.state, inWater, submerged: sub, wade, replaced, maxFx, states: [...states].join(','), ex });
    }
    return out;
  }, n);
  for (const r of res) console.log(JSON.stringify(r));
  console.log(JSON.stringify({ errors: errors.slice(0, 10) }));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
