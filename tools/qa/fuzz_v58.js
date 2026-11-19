// Juega cada misión con entradas aleatorias (paso fijo, dibujando) y reporta errores, estados vistos y avance.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 844, height: 390 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('camion-cinematic-seen', '1'); localStorage.setItem('camion-opt-freeSelect', '1'); for (let i = 0; i < 40; i++) localStorage.setItem('camion-boss-cinematic-v38-scene-' + i, '1'); } catch (_) {} });
  await page.goto((process.env.BASE || 'http://localhost:8000') + '/Se_Me_Fue_El_Camion.html?qa&manual=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CAMION_QA && !document.getElementById('start').disabled, null, { timeout: 60000 });
  await page.waitForTimeout(2000);
  for (const [m, t] of [[0, 0], [0, 2], [1, 0], [1, 2], [1, 7], [1, 12], [2, 0], [3, 0]]) {
    const r = await page.evaluate(([m, t]) => {
      const Q = window.CAMION_QA; Q.start(m, t);
      const G = Q.G, states = new Set(), evs = new Set();
      let seed = 12345 + m * 97 + t; const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
      let held = { right: true }, maxDepth = 0, bad = 0;
      for (let i = 0; i < 2400 && G.state !== 'won'; i++) {
        if (i % 25 === 0) held = { left: rnd() < 0.3, right: rnd() < 0.65, jumpHeld: rnd() < 0.5, downHeld: rnd() < 0.2, upHeld: rnd() < 0.2 };
        const inp = Object.assign({}, held, { jumpPressed: rnd() < 0.07, dashPressed: rnd() < 0.03, kickPressed: rnd() < 0.05, downPressed: rnd() < 0.02, catsPressed: rnd() < 0.01 });
        if (G.state === 'gameover') { G.retry(); }
        if (G.state === 'paused') G.resume();
        Q.step(1, inp);
        if (i % 6 === 0) Q.draw();
        states.add(G.P.state);
        for (const e of G.events) evs.add(e.type);
        if (!Number.isFinite(G.P.x) || !Number.isFinite(G.P.y)) bad++;
        maxDepth = Math.max(maxDepth, G.P.y);
      }
      return { m, t, state: G.state, tramo: G.tramo, bad, zips: states.has('zip'), swim: [...states].filter((s) => s.startsWith('swim')).length, states: [...states].length };
    }, [m, t]);
    console.log(JSON.stringify(r));
  }
  console.log(errors.length ? 'ERRORES: ' + JSON.stringify(errors.slice(0, 8)) : 'sin errores de consola');
  await b.close();
})();
