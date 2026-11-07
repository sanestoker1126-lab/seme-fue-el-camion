// UI QA: menu, options panel (toggle every option and check persistence/effects), pause → options → back,
// left-handed + big controls, landscape. Usage: node qa_ui.js <baseUrl> <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [base, out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('camion-cinematic-seen', '1'); } catch (_) {} });
  await page.goto(base + '/Se_Me_Fue_El_Camion.html?qa', { waitUntil: 'load' });
  await page.waitForFunction(() => window.CAMION_QA && !document.getElementById('start').disabled, null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/menu.png`, fullPage: false });
  const menuInfo = await page.evaluate(() => ({ tramos: document.querySelectorAll('#tramos .tramo').length, newBadges: document.querySelectorAll('#tramos .tramo.new').length, intro: document.querySelector('.missionIntro').textContent, newLevels: document.getElementById('newLevels').textContent }));
  console.log('menu', JSON.stringify(menuInfo));
  await page.click('#btnOptions');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/options.png` });
  // Cycle every option once and read back labels + storage.
  const keys = await page.$$eval('#optionsPanel [data-opt]', (bs) => bs.map((b) => b.dataset.opt));
  const before = await page.$$eval('#optionsPanel [data-opt]', (bs) => bs.map((b) => b.dataset.opt + '=' + b.textContent));
  for (const k of keys) await page.click(`#optionsPanel [data-opt="${k}"]`);
  const after = await page.$$eval('#optionsPanel [data-opt]', (bs) => bs.map((b) => b.dataset.opt + '=' + b.textContent));
  const stored = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('camion-opt')).map((k) => [k, localStorage.getItem(k)])));
  const effects = await page.evaluate(() => ({
    lefty: document.body.classList.contains('lefty'), ctlScale: document.body.style.getPropertyValue('--ctl-scale'),
    fps: document.body.classList.contains('showFps'), viewScale: window.CAMION_QA.G.viewScale, zoom: window.CAMION_QA.G.view.zoom,
    relaxed: window.CAMION_QA.G.assist.relaxed, cats: window.CAMION_QA.G.assist.catsHelp, freeTramos: document.querySelectorAll('#tramos .tramo:not(.locked)').length
  }));
  console.log('before', before.join(' | '));
  console.log('after ', after.join(' | '));
  console.log('stored', JSON.stringify(stored));
  console.log('effects', JSON.stringify(effects));
  await page.screenshot({ path: `${out}/options_changed.png` });
  await page.click('#optBack');
  // Start a run with lefty + big controls (set above), check layout.
  await page.evaluate(() => window.CAMION_QA.start(4));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/playing_lefty_big.png` });
  const ctlRects = await page.evaluate(() => {
    const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
    return { stick: r('#stickBase'), jump: r('.ctl.jump'), down: r('.ctl.down') };
  });
  console.log('controls', JSON.stringify(ctlRects));
  // Pause → options → back to pause.
  await page.click('#pause');
  await page.waitForTimeout(150);
  await page.click('#poptMore');
  await page.waitForTimeout(150);
  const vis1 = await page.evaluate(() => ({ options: !document.getElementById('optionsPanel').hidden, state: window.CAMION_QA.G.state }));
  await page.click('#optBack');
  await page.waitForTimeout(150);
  const vis2 = await page.evaluate(() => ({ pause: !document.getElementById('pausePanel').hidden, state: window.CAMION_QA.G.state }));
  console.log('pause→options→back', JSON.stringify(vis1), JSON.stringify(vis2));
  await page.click('#resumeBtn');
  await page.waitForTimeout(300);
  // Reset progress requires a double tap.
  await page.evaluate(() => window.CAMION_QA.menu());
  await page.click('#btnOptions');
  await page.click('#optReset');
  const armed = await page.textContent('#optReset');
  await page.click('#optReset');
  const unlockedAfter = await page.evaluate(() => window.CAMION_QA.G.save.unlocked);
  console.log('reset', JSON.stringify({ armed, unlockedAfter }));
  // Landscape check.
  await page.setViewportSize({ width: 844, height: 390 });
  await page.click('#optBack');
  await page.evaluate(() => window.CAMION_QA.start(13));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/landscape_tlaquepaque.png` });
  console.log(JSON.stringify({ errors }));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
