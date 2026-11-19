/* La Toxifamilia — reproductor de escenas animadas, desacoplado del motor.
   Reproduce el prólogo «ARCHIVO 01» (antes de la primera partida y desde VER CINEMÁTICA) y la escena post-créditos
   (solo cuando está desbloqueada). Efectos por escena: lluvia, monitores (reloj 21:45), HUD arcade, apagón y el
   título final LEGEND OF PRESOS. API: CAMION.ToxiPlayer.play({ set: 'prologo'|'epilogo', onDone(fin) }). */
(function (root) {
  'use strict';
  const NS = root.CAMION;
  if (!NS || !NS.TOXIFAMILIA || !root.document) return;
  const manifest = NS.TOXIFAMILIA;
  const SETS = {};
  try {
    SETS.prologo = manifest.validate(manifest.SCENES);
    SETS.epilogo = manifest.validate(manifest.EPILOGUE || []);
  } catch (err) { console.error('[Toxifamilia] Guion inválido', err); return; }
  if (!SETS.prologo.length) return;

  let overlay = null, scenes = [], index = 0, active = false, elapsed = 0, prev = 0, frame = 0, onDone = null;
  const reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel) => overlay.querySelector(sel);
  const clamp = (v, min, max, fallback) => { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback; };

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('section');
    overlay.className = 'toxi-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Cinemática de La Toxi Familia');
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="toxi-stage"><div class="toxi-fx" aria-hidden="true"></div><div class="toxi-cast" aria-hidden="true"></div>' +
        '<div class="toxi-caption"><div class="toxi-eyebrow"></div><h2 class="toxi-title"></h2><p class="toxi-text"></p></div><div class="toxi-dimmer"></div></div>' +
      '<div class="toxi-footer"><button type="button" class="toxi-skip">SALTAR</button>' +
        '<div class="toxi-meter"><span class="toxi-count"></span><span class="toxi-progress"><i></i></span></div>' +
        '<button type="button" class="toxi-next">SIGUIENTE</button></div>';
    document.body.appendChild(overlay);
    $('.toxi-skip').addEventListener('click', () => close(false));
    $('.toxi-next').addEventListener('click', next);
    overlay.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) next(); });
  }
  function actorElement(a) {
    const wrapper = document.createElement('div');
    wrapper.className = 'toxi-actor ' + (['enter-left', 'enter-right', 'enter-rise'].includes(a.entrance) ? a.entrance : 'enter-rise');
    wrapper.style.left = clamp(a.x, 0, 100, 50) + '%';
    wrapper.style.bottom = clamp(a.bottom, 0, 100, 18) + '%';
    wrapper.style.width = (130 * clamp(a.scale, 0.35, 2.6, 1)) + 'px';
    if (a.sprite && manifest.validAsset(a.sprite)) {
      const img = document.createElement('img');
      img.src = a.sprite; img.alt = ''; img.decoding = 'async'; img.loading = 'eager';
      wrapper.appendChild(img);
    }
    const label = document.createElement('span');
    label.textContent = a.name;
    wrapper.appendChild(label);
    return wrapper;
  }
  function paintFx(s) {
    const fx = $('.toxi-fx');
    fx.className = 'toxi-fx' + (s.fx ? ' fx-' + s.fx : '');
    fx.replaceChildren();
    if (s.fx === 'monitores') {
      const clock = document.createElement('b'); clock.className = 'toxi-clock'; clock.textContent = '21:45 HRS';
      fx.appendChild(clock);
      for (let i = 0; i < 3; i++) { const m = document.createElement('i'); m.className = 'toxi-monitor m' + i; fx.appendChild(m); }
    } else if (s.fx === 'hud') {
      for (const t of ['OBJETIVO: CRUZA LA CIUDAD', 'RECUPERA LAS 6 LLAVES', 'SOBREVIVE']) { const l = document.createElement('b'); l.textContent = t; fx.appendChild(l); }
      const coin = document.createElement('em'); coin.textContent = 'INSERT COIN / PRESS START'; fx.appendChild(coin);
    } else if (s.fx === 'legend') {
      const t = document.createElement('strong'); t.textContent = 'LEGEND OF PRESOS'; fx.appendChild(t);
    }
  }
  function paintScene() {
    const s = scenes[index], stage = $('.toxi-stage');
    stage.classList.remove('toxi-pan');
    stage.style.backgroundImage = s.backgrounds.length
      ? s.backgrounds.map((b) => 'url("' + b + '")').join(',')
      : 'linear-gradient(130deg,#102945,#070e22 60%,#202c46)';
    stage.classList.toggle('toxi-legend', s.fx === 'legend');
    $('.toxi-eyebrow').textContent = s.tag || 'LA TOXI FAMILIA';
    $('.toxi-title').textContent = s.title;
    $('.toxi-text').textContent = s.text;
    $('.toxi-cast').replaceChildren(...s.cast.map(actorElement));
    paintFx(s);
    $('.toxi-count').textContent = 'ESCENA ' + (index + 1) + ' / ' + scenes.length;
    $('.toxi-progress i').style.width = '0%';
    $('.toxi-next').textContent = index === scenes.length - 1 ? (s.nextMission ? 'PRESS START' : 'FINALIZAR') : 'SIGUIENTE';
    if (!reduced) { void stage.offsetWidth; stage.classList.add('toxi-pan'); }
    elapsed = 0;
    prev = performance.now();
  }
  function tick(now) {
    if (!active) return;
    if (document.hidden) prev = now; else elapsed += Math.max(0, Math.min(100, now - prev));
    prev = now;
    const duration = scenes[index].durationMs;
    $('.toxi-progress i').style.width = Math.min(100, 100 * elapsed / duration) + '%';
    if (elapsed >= duration) { next(); if (!active) return; }
    frame = root.requestAnimationFrame(tick);
  }
  function close(finished) {
    if (!active) return;
    active = false;
    root.cancelAnimationFrame(frame);
    overlay.hidden = true;
    document.removeEventListener('keydown', onKey, true);
    const done = onDone; onDone = null;
    if (done) { done(!!finished); return; }
    const last = scenes[scenes.length - 1];
    if (finished && last.nextMission) {
      root.dispatchEvent(new CustomEvent('camion:toxifamilia:start-mission', { detail: { mission: last.nextMission.mission, tramo: last.nextMission.tramo } }));
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
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); next(); }
  }
  /** Reproduce un conjunto de escenas. onDone(terminó) reemplaza al evento de inicio de misión. */
  function play(opts) {
    const o = opts || {}, set = SETS[o.set || 'prologo'];
    if (active || !set || !set.length) return false;
    ensureOverlay();
    scenes = set; index = 0; active = true; onDone = typeof o.onDone === 'function' ? o.onDone : null;
    overlay.hidden = false;
    paintScene();
    document.addEventListener('keydown', onKey, true);
    frame = root.requestAnimationFrame(tick);
    return true;
  }
  /** Botón del epílogo en el menú: aparece solo cuando ya se desbloqueó. */
  function refreshMenu(epilogueUnlocked) {
    const parent = document.querySelector('#menu .menuActions');
    if (!parent) return;
    let b = document.getElementById('btnEpilogo');
    if (epilogueUnlocked && SETS.epilogo.length) {
      if (!b) {
        b = document.createElement('button'); b.id = 'btnEpilogo'; b.className = 'opt';
        b.textContent = 'LEGEND OF PRESOS · ESCENA FINAL';
        b.addEventListener('click', () => play({ set: 'epilogo' }));
        parent.appendChild(b);
      }
    } else if (b) b.remove();
  }
  NS.ToxiPlayer = { play, refreshMenu, get active() { return active; }, count: (set) => (SETS[set || 'prologo'] || []).length };
})(typeof globalThis !== 'undefined' ? globalThis : window);
