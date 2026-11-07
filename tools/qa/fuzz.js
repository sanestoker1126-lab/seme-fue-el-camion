// Fuzz play: every tramo, random inputs for N steps with periodic draws; reports errors and states.
const { chromium } = require('playwright');
(async () => {
  const [base, n] = [process.argv[2], +(process.argv[3] || 900)];
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
    let seed = 12345; const r = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
    for (let t = 0; t < G.world.scenes.length; t++) {
      Q.start(t);
      const y0 = G.P.y; let maxY = y0, states = new Set(), hurts = 0, ex = null;
      let held = { left: false, right: false };
      try {
        for (let i = 0; i < N; i++) {
          if (i % 20 === 0) { const d = r(); held = { left: d < 0.35, right: d > 0.55 }; }
          const inp = Object.assign({}, held, { jumpPressed: r() < 0.06, jumpHeld: r() < 0.7, kickPressed: r() < 0.05, dashPressed: r() < 0.03, downPressed: r() < 0.02 });
          if (G.state === 'gameover' || G.state === 'won') break;
          if (G.state === 'paused') G.resume();
          Q.step(1, inp);
          if (i % 15 === 0) Q.draw();
          states.add(G.P.state); maxY = Math.max(maxY, G.P.y);
          if (!Number.isFinite(G.P.x) || !Number.isFinite(G.P.y)) throw new Error('NaN position');
        }
      } catch (e) { ex = String(e && e.stack || e).slice(0, 300); }
      out.push({ t, id: G.world.scenes[t].id, state: G.state, descended: Math.round(maxY - y0), tramoNow: G.tramo, lives: G.run.lives, states: [...states].join(','), ex });
    }
    return out;
  }, n);
  for (const r of res) console.log(JSON.stringify(r));
  console.log(JSON.stringify({ errors: errors.slice(0, 10) }));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
