const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 844, height: 390 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto((process.env.BASE || 'http://localhost:8000') + '/Se_Me_Fue_El_Camion.html?qa', { waitUntil: 'load' });
  await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 60000 });
  await page.click('#start');
  await page.waitForTimeout(1200);
  const n = await page.evaluate(() => window.CAMION.ToxiPlayer.count('prologo'));
  for (let i = 0; i < n; i++) {
    await page.waitForTimeout(1300);
    const t = await page.evaluate(() => ({ visible: !document.querySelector('.toxi-overlay').hidden, title: document.querySelector('.toxi-title').textContent, count: document.querySelector('.toxi-count').textContent, next: document.querySelector('.toxi-next').textContent }));
    console.log(i + 1, JSON.stringify(t));
    await page.screenshot({ path: `${out}/prologo_${i + 1}.png` });
    await page.click('.toxi-next');
  }
  await page.waitForTimeout(1500);
  const st = await page.evaluate(() => ({ state: window.CAMION_QA.G.state, mission: window.CAMION_QA.G.missionId, overlay: !document.querySelector('.toxi-overlay').hidden }));
  console.log('tras PRESS START:', JSON.stringify(st));
  await page.screenshot({ path: `${out}/juego_inicio.png` });
  // Epílogo (post-créditos)
  await page.evaluate(() => { window.CAMION_QA.menu(); window.CAMION.ToxiPlayer.play({ set: 'epilogo' }); });
  const m = await page.evaluate(() => window.CAMION.ToxiPlayer.count('epilogo'));
  for (let i = 0; i < m; i++) { await page.waitForTimeout(i === 1 ? 4500 : 1600); await page.screenshot({ path: `${out}/epilogo_${i + 1}.png` }); await page.click('.toxi-next'); }
  console.log(errors.length ? 'ERRORES: ' + JSON.stringify(errors.slice(0, 6)) : 'sin errores de consola');
  await b.close();
})();
