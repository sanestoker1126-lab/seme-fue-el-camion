/* La Toxifamilia — reproductor de escenas animadas desacoplado del motor.
   Se activa solo con un guion validado; ?toxifamiliaDemo=1 muestra el INTRO del
   juego actual como demostracion tecnica, NO como contenido del PDF.
*/
(function (root) {
  'use strict';
  const NS = root.CAMION;
  if (!NS || !NS.TOXIFAMILIA || !root.document) return;
  const manifest = NS.TOXIFAMILIA;
  const demoMode = new URLSearchParams(root.location.search).get('toxifamiliaDemo') === '1';

  function demoScenes() {
    const intro = NS.STORY && NS.STORY.INTRO || [];
    return intro.map((entry, i) => ({
      id: 'demo_' + (i + 1),
      tag: 'DEMO DEL MOTOR · ' + entry.tag,
      title: entry.title,
      text: entry.text,
      background: i % 2
        ? 'assets/scenes/generated/centro_historico_guadalajara.png'
        : 'assets/scenes/generated/escuela_patio_tarde.png',
      durationMs: 7500,
      cast: [
        { name: 'SOFÍA', sprite: 'assets/player/sofia/run_01.png', x: 72, bottom: 32, scale: 1.15, entrance: 'enter-right' },
        { name: 'LUNA', sprite: 'assets/companions/luna.png', x: 28, bottom: 31, scale: 0.75, entrance: 'enter-left' },
        { name: 'MORITA', sprite: 'assets/companions/morita.png', x: 43, bottom: 27, scale: 0.75, entrance: 'enter-rise' }
      ]
    }));
  }
  let scenes = [];
  try { scenes = manifest.validate(manifest.ready ? manifest.SCENES : demoMode ? demoScenes() : []); }
  catch (err) { console.error('[Toxifamilia] Guion invalido', err); return; }
  if (!scenes.length) return;
  let overlay = null, index = 0, active = false, elapsed = 0, prev = 0, frame = 0;
  const reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel) => overlay.querySelector(sel);
  const clamp = (v, min, max, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('section');
    overlay.className = 'toxi-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Cinematica de La Toxifamilia');
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="toxi-stage"><div class="toxi-cast" aria-hidden="true"></div>' +
        '<div class="toxi-caption"><div class="toxi-eyebrow"></div><h2 class="toxi-title"></h2><p class="toxi-text"></p></div><div class="toxi-dimmer"></div></div>' +
      '<div class="toxi-footer"><button type="button" class="toxi-skip">SALTAR</button>' +
        '<div class="toxi-meter"><span class="toxi-count"></span><span class="toxi-progress"><i></i></span></div>' +
        '<button type="button" class="toxi-next">SIGUIENTE</button></div>';
    document.body.appendChild(overlay);
    $('.toxi-skip').addEventListener('click', () => close(false));
    $('.toxi-next').addEventListener('click', next);
    overlay.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('button')) next();
    });
  }
  function actorElement(a) {
    const wrapper = document.createElement('div');
    wrapper.className = 'toxi-actor ' + (['enter-left','enter-right','enter-rise'].includes(a.entrance) ? a.entrance : 'enter-rise');
    wrapper.style.left = clamp(a.x, 0, 100, 50) + '%';
    wrapper.style.bottom = clamp(a.bottom, 0, 100, 18) + '%';
    wrapper.style.width = (130 * clamp(a.scale, 0.35, 2.6, 1)) + 'px';
    if (a.sprite && manifest.validAsset(a.sprite)) {
      const img = document.createElement('img');
      img.src = a.sprite;
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'eager';
      wrapper.appendChild(img);
    }
    const label = document.createElement('span');
    label.textContent = a.name;
    wrapper.appendChild(label);
    return wrapper;
  }
  function paintScene() {
    const s = scenes[index];
    const stage = $('.toxi-stage');
    stage.classList.remove('toxi-pan');
    stage.style.backgroundImage = s.background && manifest.validAsset(s.background)
      ? 'url("' + s.background + '")'
      : 'linear-gradient(130deg,#102945,#070e22 60%,#202c46)';
    $('.toxi-eyebrow').textContent = s.tag || 'LA TOXIFAMILIA';
    $('.toxi-title').textContent = s.title;
    $('.toxi-text').textContent = s.text;
    $('.toxi-cast').replaceChildren(...s.cast.map(actorElement));
    $('.toxi-count').textContent = 'ESCENA ' + (index + 1) + ' / ' + scenes.length;
    $('.toxi-progress i').style.width = '0%';
    $('.toxi-next').textContent = index === scenes.length - 1 ? (s.nextMission ? 'EMPEZAR MISIÓN' : 'FINALIZAR') : 'SIGUIENTE';
    if (!reduced) { void stage.offsetWidth; stage.classList.add('toxi-pan'); }
    elapsed = 0;
    prev = performance.now();
  }
  function tick(now) {
    if (!active) return;
    if (document.hidden) prev = now;
    else elapsed += Math.max(0, Math.min(100, now - prev));
    prev = now;
    const duration = scenes[index].durationMs;
    $('.toxi-progress i').style.width = Math.min(100, 100 * elapsed / duration) + '%';
    if (elapsed >= duration) { next(); if (!active) return; }
    frame = root.requestAnimationFrame(tick);
  }
  function close(launchMission) {
    if (!active) return;
    active = false;
    root.cancelAnimationFrame(frame);
    overlay.hidden = true;
    document.removeEventListener('keydown', onKey, true);
    if (launchMission) {
      const last = scenes[scenes.length - 1];
      if (last.nextMission) {
        root.dispatchEvent(new CustomEvent('camion:toxifamilia:start-mission', {
          detail: { mission: last.nextMission.mission, tramo: last.nextMission.tramo }
        }));
      }
    }
  }
  function next() {
    if (!active) return;
    if (index >= scenes.length - 1) { close(true); return; }
    index++;
    paintScene();
  }
  function onKey(e) {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(false); }
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault(); e.stopImmediatePropagation(); next();
    }
  }
  function play() {
    if (active || !scenes.length) return false;
    ensureOverlay();
    index = 0;
    active = true;
    overlay.hidden = false;
    paintScene();
    document.addEventListener('keydown', onKey, true);
    frame = root.requestAnimationFrame(tick);
    return true;
  }
  function mount() {
    const parent = document.querySelector('#menu .menuActions');
    if (!parent || document.getElementById('btnToxifamilia')) return;
    const button = document.createElement('button');
    button.id = 'btnToxifamilia';
    button.className = 'opt';
    button.textContent = manifest.ready ? 'LA TOXIFAMILIA · HISTORIA' : 'PROBAR CINEMÁTICA NUEVA';
    button.addEventListener('click', play);
    parent.appendChild(button);
  }
  mount();
  NS.ToxiPlayer = { play, get count() { return scenes.length; }, get isDemo() { return !manifest.ready; } };
})(typeof globalThis !== 'undefined' ? globalThis : window);
