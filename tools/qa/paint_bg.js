// Render the procedural background painters to PNG files (as cached by the game) for review.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [base, out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  await page.goto(base + '/Se_Me_Fue_El_Camion.html?qa&manual=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CAMION_QA && !document.getElementById('start').disabled, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const res = await page.evaluate(() => {
    const NS = window.CAMION, P = NS.Render.PAINTERS, S = NS.LEVELS.LEVEL_SEQUENCE, out = {};
    for (const d of S) {
      if (!d.bg || !P[d.bg]) continue;
      const c = document.createElement('canvas'); c.width = d.map.width; c.height = d.map.height;
      const t = performance.now(); const ok = P[d.bg](c.getContext('2d'), c.width, c.height);
      out[d.bg] = { ok, ms: performance.now() - t, url: c.toDataURL('image/png'), w: c.width, h: c.height };
    }
    return out;
  });
  for (const [k, v] of Object.entries(res)) { fs.writeFileSync(`${out}/${k}.png`, Buffer.from(v.url.split(',')[1], 'base64')); console.log(k, v.ok, v.w + 'x' + v.h, v.ms.toFixed(1) + ' ms'); }
  await browser.close();
})();
