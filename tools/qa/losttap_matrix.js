// Reproduce el toque perdido tras un arrastre: compara dos versiones servidas en dos URLs.
// Uso: node losttap_matrix.js <urlA> <urlB>
const { chromium, devices } = require('playwright');
(async () => {
  const urls = process.argv.slice(2, 4);
  const browser = await chromium.launch();
  const variants = [['stick30', 200], ['stick30', 120], ['stickSwipe', 150], ['canvasSwipe', 200]];
  for (const base of urls) {
    const row = [];
    for (const [v, delay] of variants) {
      let ok = 0;
      for (let rep = 0; rep < 3; rep++) {
        const ctx = await browser.newContext({ ...devices['Pixel 7'], viewport: { width: 412, height: 839 } });
        const page = await ctx.newPage();
        await page.addInitScript(() => { localStorage.setItem('camion-cinematic-seen', '1'); });
        await page.goto(base + '/Se_Me_Fue_El_Camion.html?qa', { waitUntil: 'load' });
        await page.waitForFunction(() => window.CAMION_QA && !document.getElementById('start').disabled);
        await page.tap('#start'); await page.waitForFunction(() => window.CAMION_QA.G.state === 'playing'); await page.waitForTimeout(300);
        const cdp = await ctx.newCDPSession(page);
        const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
        const r = (s) => page.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, s);
        const s = await r('#stickBase'), p = await r('#pause');
        if (v === 'stick30') { await T('touchStart', [{ x: s.x, y: s.y, id: 0 }]); await T('touchMove', [{ x: s.x + 30, y: s.y, id: 0 }]); await T('touchEnd', []); }
        if (v === 'stickSwipe') { await T('touchStart', [{ x: s.x - 40, y: s.y, id: 0 }]); for (let k = 1; k <= 6; k++) await T('touchMove', [{ x: s.x - 40 + k * 15, y: s.y, id: 0 }]); await T('touchEnd', []); }
        if (v === 'canvasSwipe') { await T('touchStart', [{ x: 206, y: 300, id: 0 }]); for (let k = 1; k <= 8; k++) await T('touchMove', [{ x: 206, y: 300 + k * 40, id: 0 }]); await T('touchEnd', []); }
        await page.waitForTimeout(delay);
        await T('touchStart', [{ x: p.x, y: p.y, id: 9 }]); await T('touchEnd', []);
        await page.waitForTimeout(250);
        if ((await page.evaluate(() => window.CAMION_QA.G.state)) === 'paused') ok++;
        await ctx.close();
      }
      row.push(`${v}@${delay}ms ${ok}/3`);
    }
    console.log(base, row.join('  '));
  }
  await browser.close();
})();
