// QA V51 · Controles táctiles reales en un teléfono emulado (Chromium: isMobile + hasTouch + eventos táctiles CDP,
// que el navegador convierte en Pointer Events "touch" como en Android). Prueba joystick, botones, multitáctil
// (mover + saltar + patear a la vez), cancelación del sistema, pausa, y que la página no se desplace ni haga zoom.
// También revisa el acomodo de los controles (dentro de pantalla, sin encimarse, ≥ 44 px) en vertical/horizontal,
// con tamaño chico/normal/grande y modo zurdo.
// Uso: node touch_test.js <baseUrl>
const { chromium, devices } = require('playwright');

(async () => {
  const base = process.argv[2];
  const browser = await chromium.launch();
  const results = [];
  const check = (name, cond, info) => { results.push({ name, ok: !!cond, info }); };
  const phone = devices['Pixel 7'];

  async function open(viewport, storage) {
    const ctx = await browser.newContext({ ...phone, viewport });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.addInitScript((st) => { try { for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v); } catch (_) {} }, storage);
    await page.goto(base + '/Se_Me_Fue_El_Camion.html?qa', { waitUntil: 'load' });
    await page.waitForFunction(() => window.CAMION_QA && !document.getElementById('start').disabled, null, { timeout: 30000 });
    const cdp = await ctx.newCDPSession(page);
    return { ctx, page, cdp, errors };
  }
  const rect = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }, sel);
  const touch = (cdp, type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: p.id, radiusX: 8, radiusY: 8, force: 1 })) });
  const wait = (page, ms) => page.waitForTimeout(ms);
  const probeReset = (page) => page.evaluate(() => Object.assign(window.__probe, { kick: 0, dash: 0, jumps: 0, downs: 0, air: 0, steps: 0 }));
  const probe = (page) => page.evaluate(() => {
    const G = window.CAMION_QA.G, P = G.P, I = window.CAMION_QA.input;
    return Object.assign({}, window.__probe, { x: P.x, vx: P.vx, vy: P.vy, ground: !!P.ground, state: G.state, held: Object.assign({}, I.held),
      scrollX: window.scrollX, scrollY: window.scrollY, scale: window.visualViewport ? window.visualViewport.scale : 1, sel: String(document.getSelection()) });
  });

  /* ---------- 1) Juego con dedos: vertical ---------- */
  {
    const { ctx, page, cdp, errors } = await open({ width: 412, height: 839 }, { 'camion-cinematic-seen': '1' });
    await page.tap('#start');
    await page.waitForFunction(() => window.CAMION_QA.G.state === 'playing', null, { timeout: 10000 });
    await wait(page, 400);
    await page.evaluate(() => {
      const G = window.CAMION_QA.G, orig = G.step;
      window.__probe = { kick: 0, dash: 0, jumps: 0, downs: 0, air: 0, steps: 0 };
      G.step = function (dt, inp) {
        const r = orig.call(this, dt, inp), P = G.P, pr = window.__probe;
        pr.steps++; pr.last = { left: inp.left, right: inp.right, jumpHeld: inp.jumpHeld }; if (P.kickT > 0) pr.kick++; if (P.dashT > 0) pr.dash++; if (inp.jumpPressed) pr.jumps++; if (inp.downPressed) pr.downs++; if (!P.ground) pr.air++;
        return r;
      };
      G.P.invuln = 99; // la prueba es de controles, no de combate
    });
    const stick = await rect(page, '#stickBase'), jump = await rect(page, '[data-key="jump"]'), kick = await rect(page, '[data-key="kick"]');
    const dash = await rect(page, '[data-key="dash"]'), down = await rect(page, '[data-key="down"]');
    const max = stick.w * 0.31;

    // Joystick a la derecha: Sofía corre.
    let s0 = await probe(page);
    await touch(cdp, 'touchStart', [{ x: stick.cx, y: stick.cy, id: 0 }]);
    await touch(cdp, 'touchMove', [{ x: stick.cx + max * 0.9, y: stick.cy, id: 0 }]);
    await wait(page, 500);
    let s1 = await probe(page);
    check('joystick derecha mueve a Sofía', s1.x - s0.x > 60, `Δx=${(s1.x - s0.x).toFixed(0)}`);
    const knob = await page.evaluate(() => document.getElementById('stickKnob').style.left);
    check('la perilla del joystick sigue al dedo', knob.includes('calc'), knob);

    // Multitáctil: sin soltar el joystick, segundo dedo en SALTAR.
    await probeReset(page);
    await touch(cdp, 'touchStart', [{ x: stick.cx + max * 0.9, y: stick.cy, id: 0 }, { x: jump.cx, y: jump.cy, id: 1 }]);
    await wait(page, 250);
    s0 = await probe(page);
    check('multitáctil: SALTAR mientras se mueve (salto registrado)', s0.jumps >= 1 && s0.air > 0, `jumps=${s0.jumps} air=${s0.air}`);
    await wait(page, 250);
    s1 = await probe(page);
    check('multitáctil: el joystick sigue activo durante el salto', s1.x - s0.x > 25 && s1.held.jump, `Δx=${(s1.x - s0.x).toFixed(0)} jumpHeld=${s1.held.jump}`);
    // Soltar solo SALTAR. En este Chromium, touchEnd levanta exactamente los dedos que lista (vacío = todos);
    // touchMove sin un dedo NO lo levanta (comprobado con un registro de pointerdown/pointerup).
    await touch(cdp, 'touchEnd', [{ x: jump.cx, y: jump.cy, id: 1 }]);
    await wait(page, 150);
    s0 = await probe(page);
    check('soltar SALTAR no suelta el joystick', !s0.held.jump && !s0.last.jumpHeld && s0.last.right && s0.x > s1.x, `jumpHeld=${s0.held.jump} input=${JSON.stringify(s0.last)}`);
    // Tercer dedo: PATEAR + DASH a la vez que se mueve.
    await probeReset(page);
    await touch(cdp, 'touchStart', [{ x: stick.cx + max * 0.9, y: stick.cy, id: 0 }, { x: kick.cx, y: kick.cy, id: 2 }]);
    await touch(cdp, 'touchStart', [{ x: stick.cx + max * 0.9, y: stick.cy, id: 0 }, { x: kick.cx, y: kick.cy, id: 2 }, { x: dash.cx, y: dash.cy, id: 3 }]);
    await wait(page, 200);
    s0 = await probe(page);
    check('tres dedos: patada y dash registrados', s0.kick > 0 && s0.dash > 0, `kick=${s0.kick} dash=${s0.dash}`);
    await touch(cdp, 'touchEnd', [{ x: kick.cx, y: kick.cy, id: 2 }, { x: dash.cx, y: dash.cy, id: 3 }]); // suelta PATEAR y DASH
    await wait(page, 100);
    s0 = await probe(page);
    check('soltar PATEAR y DASH deja el joystick activo', s0.last.right && !s0.held.kick && !s0.held.dash, `input=${JSON.stringify(s0.last)}`);
    await touch(cdp, 'touchEnd', []);
    await wait(page, 150);
    s0 = await probe(page);
    check('al soltar todo, el juego ya no recibe movimiento ni botones', !s0.last.left && !s0.last.right && !s0.last.jumpHeld && !Object.values(s0.held).some(Boolean), `input=${JSON.stringify(s0.last)} held=${JSON.stringify(s0.held)}`);
    await page.waitForFunction(() => { const P = window.CAMION_QA.G.P; return P.ground && Math.abs(P.vx) < 5; }, null, { timeout: 4000 }).then(() => true, () => false)
      .then((stopped) => check('…y Sofía se detiene al tocar suelo', stopped));

    // Joystick arriba = salto; abajo recto = BAJAR; botón BAJAR.
    await probeReset(page);
    await touch(cdp, 'touchStart', [{ x: stick.cx, y: stick.cy, id: 4 }]);
    await touch(cdp, 'touchMove', [{ x: stick.cx, y: stick.cy - max * 0.95, id: 4 }]);
    await wait(page, 120);
    await touch(cdp, 'touchMove', [{ x: stick.cx, y: stick.cy + max * 0.95, id: 4 }]);
    await wait(page, 120);
    await touch(cdp, 'touchEnd', []);
    await page.tap('[data-key="down"]');
    await wait(page, 120);
    s0 = await probe(page);
    check('joystick arriba salta', s0.jumps >= 1, `jumps=${s0.jumps}`);
    check('joystick abajo y botón BAJAR mandan BAJAR', s0.downs >= 2, `downs=${s0.downs}`);

    // Cancelación del sistema (p. ej. gesto de notificaciones): no deja a Sofía corriendo sola.
    await touch(cdp, 'touchStart', [{ x: stick.cx, y: stick.cy, id: 5 }]);
    await touch(cdp, 'touchMove', [{ x: stick.cx - max * 0.9, y: stick.cy, id: 5 }]);
    await wait(page, 200);
    await touch(cdp, 'touchCancel', []);
    await wait(page, 150);
    s0 = await probe(page);
    check('touchcancel suelta el joystick', !s0.last.left && !s0.last.right, `input=${JSON.stringify(s0.last)}`);

    // Pulsación larga en un botón: ni menú contextual ni selección de texto; la página no se mueve ni hace zoom.
    await touch(cdp, 'touchStart', [{ x: jump.cx, y: jump.cy, id: 6 }]);
    await wait(page, 900);
    await touch(cdp, 'touchEnd', []);
    // Arrastre amplio fuera de los controles (sobre el juego): no debe desplazar la página.
    await touch(cdp, 'touchStart', [{ x: 206, y: 300, id: 7 }]);
    for (let k = 1; k <= 8; k++) await touch(cdp, 'touchMove', [{ x: 206, y: 300 + k * 40, id: 7 }]);
    await touch(cdp, 'touchEnd', []);
    await wait(page, 200);
    s0 = await probe(page);
    check('la página no se desplaza, no hace zoom ni selecciona texto', s0.scrollX === 0 && s0.scrollY === 0 && s0.scale === 1 && s0.sel === '', `scroll=${s0.scrollX},${s0.scrollY} scale=${s0.scale} sel="${s0.sel}"`);

    // V51: tocar PAUSA justo después de un gesto. En V50 este toque se perdía 3 de 3 veces
    // (joystick movido de golpe y soltado → toque a los 120 ms; deslizar sobre el juego → toque a los 200 ms).
    const pz = await rect(page, '#pause');
    for (const [label, gesture, delay] of [
      ['joystick', async () => { await touch(cdp, 'touchStart', [{ x: stick.cx, y: stick.cy, id: 8 }]); await touch(cdp, 'touchMove', [{ x: stick.cx + 30, y: stick.cy, id: 8 }]); }, 120],
      ['deslizar sobre el juego', async () => { await touch(cdp, 'touchStart', [{ x: 206, y: 300, id: 8 }]); for (let k = 1; k <= 8; k++) await touch(cdp, 'touchMove', [{ x: 206, y: 300 + k * 40, id: 8 }]); }, 200]]) {
      await gesture();
      await touch(cdp, 'touchEnd', []);
      await wait(page, delay);
      await touch(cdp, 'touchStart', [{ x: pz.cx, y: pz.cy, id: 9 }]);
      await touch(cdp, 'touchEnd', []);
      await wait(page, 250);
      const st = await page.evaluate(() => window.CAMION_QA.G.state);
      check(`PAUSA responde aunque se toque ${delay} ms después de soltar (${label})`, st === 'paused', st);
      if (st === 'paused') { await page.tap('#resumeBtn'); await wait(page, 250); }
    }
    // Pausa y continuar con el dedo.
    await page.tap('#pause');
    await wait(page, 150);
    const paused = await page.evaluate(() => [window.CAMION_QA.G.state, !document.getElementById('pausePanel').hidden]);
    await page.tap('#resumeBtn');
    await wait(page, 150);
    const resumed = await page.evaluate(() => window.CAMION_QA.G.state);
    check('pausa y continuar con toques', paused[0] === 'paused' && paused[1] && resumed === 'playing', JSON.stringify([paused, resumed]));
    check('sin errores de JavaScript (vertical)', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  /* ---------- 2) Acomodo de los controles en cada configuración ---------- */
  const layouts = [];
  for (const [vw, vh] of [[412, 839], [839, 412], [360, 640], [640, 360]]) {
    for (const ctl of ['chico', 'normal', 'grande']) {
      for (const lefty of ['0', '1']) {
        const { ctx, page, errors } = await open({ width: vw, height: vh }, { 'camion-cinematic-seen': '1', 'camion-opt-ctlSize': ctl, 'camion-opt-lefty': lefty });
        await page.tap('#start');
        await page.waitForFunction(() => window.CAMION_QA.G.state === 'playing', null, { timeout: 10000 });
        await wait(page, 300);
        const L = await page.evaluate(() => {
          const els = ['#stickBase', '[data-key="jump"]', '[data-key="kick"]', '[data-key="dash"]', '[data-key="down"]', '#pause'];
          const R = els.map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { s, x1: r.left, y1: r.top, x2: r.right, y2: r.bottom, w: r.width, h: r.height }; });
          const hud = document.querySelector('#hud') ? document.querySelector('#hud').getBoundingClientRect() : null;
          return { R, vw: innerWidth, vh: innerHeight, hud: hud && { y2: hud.bottom } };
        });
        const out = L.R.filter((r) => r.x1 < -0.5 || r.y1 < -0.5 || r.x2 > L.vw + 0.5 || r.y2 > L.vh + 0.5).map((r) => r.s);
        const small = L.R.filter((r) => r.w < 44 || r.h < 44).map((r) => `${r.s} ${r.w.toFixed(0)}x${r.h.toFixed(0)}`);
        const over = [];
        for (let i = 0; i < L.R.length; i++) for (let j = i + 1; j < L.R.length; j++) {
          const a = L.R[i], b = L.R[j];
          if (a.x1 < b.x2 - 1 && a.x2 > b.x1 + 1 && a.y1 < b.y2 - 1 && a.y2 > b.y1 + 1) over.push(a.s + '×' + b.s);
        }
        const stick = L.R[0], jump = L.R[1];
        const sideOk = lefty === '1' ? stick.x1 > jump.x1 : stick.x1 < jump.x1;
        layouts.push({ cfg: `${vw}x${vh} ${ctl}${lefty === '1' ? ' zurdo' : ''}`, out, small, over, sideOk, errors: errors.length });
        await ctx.close();
      }
    }
  }
  const badLayouts = layouts.filter((l) => l.out.length || l.small.length || l.over.length || !l.sideOk || l.errors);
  check(`acomodo de controles: ${layouts.length} configuraciones dentro de pantalla, sin encimarse, ≥44 px y del lado correcto`, badLayouts.length === 0,
    badLayouts.map((l) => `${l.cfg}: fuera=${l.out} chicos=${l.small} encimados=${l.over} lado=${l.sideOk}`).join(' | '));

  await browser.close();
  for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name}${r.info ? ' · ' + r.info : ''}`);
  const fails = results.filter((r) => !r.ok).length;
  console.log(JSON.stringify({ total: results.length, fails }));
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
