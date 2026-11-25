/* La Toxifamilia — reproductor de escenas animadas, desacoplado del motor.
   Reproduce el prólogo «ARCHIVO 01» (antes de la primera partida y desde VER CINEMÁTICA), la escena post-créditos
   (solo cuando está desbloqueada) y, desde V58.2, la LLEGADA AL MAR (primera vez que se empieza la misión 3).
   Efectos por escena: lluvia, monitores (reloj 21:45), HUD arcade, apagón, título LEGEND OF PRESOS, recuerdo (tono de
   memoria) y burbujas. V58.2: personajes animados por cuadros con su propia línea de tiempo (caminar, voltear, nadar)
   y diálogos línea por línea con quién habla (layout 'dialogo').
   API: CAMION.ToxiPlayer.play({ set: 'prologo'|'epilogo'|'marino', look, finishLabel, onDone(fin) }). */
(function (root) {
  'use strict';
  const NS = root.CAMION;
  if (!NS || !NS.TOXIFAMILIA || !root.document) return;
  const manifest = NS.TOXIFAMILIA;
  const SETS = {};
  try {
    SETS.prologo = manifest.validate(manifest.SCENES);
    SETS.epilogo = manifest.validate(manifest.EPILOGUE || []);
    SETS.marino = manifest.validate(manifest.MARINO || []);
  } catch (err) { console.error('[Toxifamilia] Guion inválido', err); return; }
  if (!SETS.prologo.length) return;

  let overlay = null, scenes = [], index = 0, active = false, elapsed = 0, prev = 0, frame = 0, onDone = null;
  let look = 'original', finishLabel = null, actors = [], lineIndex = -1;
  const preloaded = new Map();
  const reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel) => overlay.querySelector(sel);
  const clamp = (v, min, max, fallback) => { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback; };
  const ENTRANCES = ['enter-left', 'enter-right', 'enter-rise', 'enter-fade'];

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('section');
    overlay.className = 'toxi-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Cinemática de La Toxi Familia');
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="toxi-stage"><div class="toxi-tint" aria-hidden="true"></div><div class="toxi-fx" aria-hidden="true"></div><div class="toxi-cast" aria-hidden="true"></div>' +
        '<div class="toxi-caption" aria-live="polite"><div class="toxi-eyebrow"></div><h2 class="toxi-title"></h2><div class="toxi-who"></div><p class="toxi-text"></p></div><div class="toxi-dimmer"></div></div>' +
      '<div class="toxi-footer"><button type="button" class="toxi-skip">SALTAR</button>' +
        '<div class="toxi-meter"><span class="toxi-count"></span><span class="toxi-progress"><i></i></span></div>' +
        '<button type="button" class="toxi-next">SIGUIENTE</button></div>';
    document.body.appendChild(overlay);
    $('.toxi-skip').addEventListener('click', () => close(false));
    $('.toxi-next').addEventListener('click', next);
    overlay.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) next(); });
  }

  /* ---------- Reparto ---------- */
  /** Cuadros del actor; los de Sofía siguen el vestuario elegido en el menú. */
  function framesOf(a) {
    const list = a.looks ? (a.looks[look] || a.looks.original) : (a.frames || (a.sprite ? [a.sprite] : []));
    return list.filter(manifest.validAsset);
  }
  /** Precarga (fondos y cuadros) de una escena: así el cambio de cuadro no parpadea. */
  function preloadScene(s) {
    if (!s) return;
    const urls = [...s.backgrounds];
    for (const a of s.cast) urls.push(...framesOf(a));
    for (const url of urls) {
      if (preloaded.has(url)) continue;
      const im = new Image();
      im.decoding = 'async';
      im.src = url;
      preloaded.set(url, im);
    }
  }
  const stepFps = (s, step) => step.fps || s.a.fps || 8;
  /** Avanza la línea de tiempo de un actor dt ms y lo dibuja (cuadro, posición, volteo). */
  function stepActor(s, dt) {
    let step = s.steps[s.si];
    s.t += dt;
    while (s.t >= step.ms && (s.loop || s.si < s.steps.length - 1)) {
      s.t -= step.ms;
      if (step.to != null) s.x0 = step.to;
      if (step.toB != null) s.b0 = step.toB;
      s.si = (s.si + 1) % s.steps.length;
      step = s.steps[s.si];
    }
    const k = Math.min(1, s.t / step.ms);
    const x = step.to != null ? s.x0 + (step.to - s.x0) * k : s.x0;
    const b = step.toB != null ? s.b0 + (step.toB - s.b0) * k : s.b0;
    const fi = step.f[Math.floor(s.t * stepFps(s, step) / 1000) % step.f.length];
    paintActor(s, fi, x, b, !!s.a.flip !== !!step.flip);
  }
  function paintActor(s, fi, x, b, flip) {
    if (fi !== s.cur) {
      const url = s.frames[fi], pre = preloaded.get(url);
      if (!pre || pre.complete) { s.img.src = url; s.cur = fi; }
    }
    const left = x.toFixed(2) + '%', bottom = b.toFixed(2) + '%';
    if (left !== s.left) { s.wrapper.style.left = left; s.left = left; }
    if (bottom !== s.bottom) { s.wrapper.style.bottom = bottom; s.bottom = bottom; }
    if (flip !== s.flip) { s.flip = flip; s.wrapper.classList.toggle('flip', flip); }
  }
  /** Movimiento reducido: el actor aparece quieto donde termina su recorrido. */
  function settle(s) {
    let x = s.x0, b = s.b0;
    if (!s.loop) for (const st of s.steps) { if (st.to != null) x = st.to; if (st.toB != null) b = st.toB; }
    const last = s.loop ? s.steps[0] : s.steps[s.steps.length - 1];
    paintActor(s, last.f[0], x, b, !!s.a.flip !== !!last.flip);
  }
  function actorElement(a) {
    const wrapper = document.createElement('div');
    wrapper.className = 'toxi-actor ' + (ENTRANCES.includes(a.entrance) ? a.entrance : 'enter-rise') + (a.float ? ' float' : '');
    const x = clamp(a.x, 0, 100, 50), b = clamp(a.bottom, 0, 100, 18);
    wrapper.dataset.voice = a.voice || a.name;   // V58.6: se ilumina cuando habla (ver paintLine)
    wrapper.style.left = x + '%';
    wrapper.style.bottom = b + '%';
    wrapper.style.width = (130 * clamp(a.scale, 0.35, 2.6, 1)) + 'px';
    const bob = document.createElement('div');
    bob.className = 'toxi-bob';
    wrapper.appendChild(bob);
    const frames = framesOf(a);
    let img = null;
    if (frames.length) {
      img = document.createElement('img');
      img.src = frames[0]; img.alt = ''; img.decoding = 'async'; img.loading = 'eager';
      bob.appendChild(img);
    }
    if (a.label !== false) {
      const label = document.createElement('span');
      label.textContent = a.name;
      wrapper.appendChild(label);
    }
    if (img && (frames.length > 1 || a.anim)) {
      const steps = a.anim || [{ f: frames.map((_, i) => i), ms: 60000 }];
      const s = { a, wrapper, img, frames, steps, si: 0, t: 0, x0: x, b0: b, cur: 0, flip: null, left: null, bottom: null, loop: !!a.loop };
      if (reduced) settle(s); else { actors.push(s); stepActor(s, 0); }
    } else if (a.flip) wrapper.classList.add('flip');
    return wrapper;
  }

  /* ---------- Efectos ---------- */
  function paintFx(s) {
    const fx = $('.toxi-fx'), has = (f) => s.fxList.includes(f);
    fx.className = 'toxi-fx' + s.fxList.map((f) => ' fx-' + f).join('');
    fx.replaceChildren();
    if (has('monitores')) {
      const clock = document.createElement('b'); clock.className = 'toxi-clock'; clock.textContent = '21:45 HRS';
      fx.appendChild(clock);
      for (let i = 0; i < 3; i++) { const m = document.createElement('i'); m.className = 'toxi-monitor m' + i; fx.appendChild(m); }
    } else if (has('hud')) {
      for (const t of ['OBJETIVO: CRUZA LA CIUDAD', 'RECUPERA LAS 6 LLAVES', 'SOBREVIVE']) { const l = document.createElement('b'); l.textContent = t; fx.appendChild(l); }
      const coin = document.createElement('em'); coin.textContent = 'INSERT COIN / PRESS START'; fx.appendChild(coin);
    } else if (has('legend')) {
      const t = document.createElement('strong'); t.textContent = 'LEGEND OF PRESOS'; fx.appendChild(t);
    }
    // V58.6 · Penumbra: lugar y hora escritos arriba, y una luz que parpadea sobre los personajes.
    if (s.layout === 'sombras') {
      const place = document.createElement('div'); place.className = 'toxi-place'; place.textContent = s.tag || '';
      const lamp = document.createElement('i'); lamp.className = 'toxi-lamp';
      fx.append(lamp, place);
    }
    if (has('burbujas')) {
      for (let i = 0; i < 16; i++) {
        const bub = document.createElement('i'), size = 6 + ((i * 7) % 15);
        bub.className = 'toxi-bubble';
        bub.style.left = ((i * 37 + 11) % 97) + '%';
        bub.style.width = bub.style.height = size + 'px';
        bub.style.animationDuration = (5 + ((i * 13) % 7)) + 's';
        bub.style.animationDelay = (-((i * 0.83) % 6)).toFixed(2) + 's';
        fx.appendChild(bub);
      }
    }
    // Recuerdo: tono de memoria en fondo y reparto, y la insignia RECUERDO en el cuadro de diálogo (nunca tapa a nadie).
    $('.toxi-stage').classList.toggle('toxi-memoria', has('recuerdo'));
    $('.toxi-caption').classList.toggle('toxi-recuerdo', has('recuerdo'));
  }

  /* ---------- Diálogo ---------- */
  function paintLine(i) {
    const l = scenes[index].lines[i];
    lineIndex = i;
    const who = $('.toxi-who');
    who.textContent = l.who;
    who.className = 'toxi-who tone-' + l.tone;
    $('.toxi-text').textContent = l.text;
    const cap = $('.toxi-caption');
    cap.classList.remove('toxi-wait');
    cap.classList.remove('toxi-line-in');
    if (!reduced) { void cap.offsetWidth; cap.classList.add('toxi-line-in'); }
    // V58.6: quien habla se ilumina; los demás quedan en sombra.
    for (const el of overlay.querySelectorAll('.toxi-actor[data-voice]')) {
      const sp = el.dataset.voice === l.who;
      el.classList.toggle('speaking', sp);
      el.classList.toggle('listening', !sp);
    }
    paintNextLabel();
  }
  function lastStep() {
    const s = scenes[index];
    return index === scenes.length - 1 && (!s.lines || lineIndex >= s.lines.length - 1);
  }
  function paintNextLabel() {
    const s = scenes[index];
    $('.toxi-next').textContent = lastStep() ? (finishLabel || (s.nextMission ? 'PRESS START' : 'FINALIZAR')) : 'SIGUIENTE';
  }

  /* ---------- Escenas ---------- */
  function paintScene() {
    const s = scenes[index], stage = $('.toxi-stage');
    stage.classList.remove('toxi-pan');
    stage.style.backgroundImage = s.backgrounds.length
      ? s.backgrounds.map((b) => 'url("' + b + '")').join(',')
      : 'linear-gradient(130deg,#102945,#070e22 60%,#202c46)';
    stage.classList.toggle('toxi-legend', s.fxList.includes('legend'));
    stage.classList.toggle('toxi-dialogo', s.layout === 'dialogo');
    stage.classList.toggle('toxi-sombras', s.layout === 'sombras');
    stage.style.animationDuration = s.layout === 'dialogo' ? (s.durationMs + 600) + 'ms' : '';
    $('.toxi-eyebrow').textContent = s.tag || 'LA TOXI FAMILIA';
    $('.toxi-title').textContent = s.title;
    actors = [];
    preloadScene(s);
    preloadScene(scenes[index + 1]);
    $('.toxi-cast').replaceChildren(...s.cast.map(actorElement));
    paintFx(s);
    $('.toxi-count').textContent = 'ESCENA ' + (index + 1) + ' / ' + scenes.length;
    $('.toxi-progress i').style.width = '0%';
    lineIndex = -1;
    $('.toxi-caption').classList.remove('toxi-wait');
    if (s.lines && s.lines[0].at > 0) {
      // V58.6: apertura en silencio; la primera línea llega con el tiempo (o al tocar SIGUIENTE).
      const who = $('.toxi-who'); who.textContent = ''; who.className = 'toxi-who';
      $('.toxi-text').textContent = '';
      $('.toxi-caption').classList.add('toxi-wait');
      paintNextLabel();
    } else if (s.lines) paintLine(0);
    else {
      const who = $('.toxi-who'); who.textContent = ''; who.className = 'toxi-who';
      $('.toxi-text').textContent = s.text;
      paintNextLabel();
    }
    if (!reduced) { void stage.offsetWidth; stage.classList.add('toxi-pan'); }
    elapsed = 0;
    prev = performance.now();
  }
  function tick(now) {
    if (!active) return;
    let dt = 0;
    if (!document.hidden) dt = Math.max(0, Math.min(100, now - prev));
    prev = now;
    elapsed += dt;
    const s = scenes[index], duration = s.durationMs;
    for (const a of actors) stepActor(a, dt);
    if (s.lines) {
      let li = lineIndex;
      while (li < s.lines.length - 1 && elapsed >= s.lines[li + 1].at) li++;
      if (li !== lineIndex) paintLine(li);
    }
    $('.toxi-progress i').style.width = Math.min(100, 100 * elapsed / duration) + '%';
    if (elapsed >= duration) { advanceScene(); if (!active) return; }
    frame = root.requestAnimationFrame(tick);
  }
  function close(finished) {
    if (!active) return;
    active = false;
    root.cancelAnimationFrame(frame);
    overlay.hidden = true;
    actors = [];
    preloaded.clear();
    $('.toxi-cast').replaceChildren();
    document.removeEventListener('keydown', onKey, true);
    const done = onDone; onDone = null;
    if (done) { done(!!finished); return; }
    const last = scenes[scenes.length - 1];
    if (finished && last.nextMission) {
      root.dispatchEvent(new CustomEvent('camion:toxifamilia:start-mission', { detail: { mission: last.nextMission.mission, tramo: last.nextMission.tramo } }));
    }
  }
  function advanceScene() {
    if (!active) return;
    if (index >= scenes.length - 1) { close(true); return; }
    index++;
    paintScene();
  }
  /** SIGUIENTE / tocar: primero la siguiente línea del diálogo; al final, la siguiente escena. */
  function next() {
    if (!active) return;
    const s = scenes[index];
    if (s.lines && lineIndex < s.lines.length - 1) {
      elapsed = s.lines[lineIndex + 1].at;
      paintLine(lineIndex + 1);
      return;
    }
    advanceScene();
  }
  function onKey(e) {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(false); }
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); next(); }
  }
  /** Reproduce un conjunto de escenas. onDone(terminó) reemplaza al evento de inicio de misión.
      look: vestuario de Sofía ('original' | 'uniforme' | 'rosa'; otro valor usa el original). */
  function play(opts) {
    const o = opts || {}, set = SETS[o.set || 'prologo'];
    if (active || !set || !set.length) return false;
    ensureOverlay();
    look = typeof o.look === 'string' ? o.look : look;
    finishLabel = typeof o.finishLabel === 'string' && o.finishLabel.trim() ? o.finishLabel : null;
    scenes = set; index = 0; active = true; onDone = typeof o.onDone === 'function' ? o.onDone : null;
    overlay.hidden = false;
    paintScene();
    document.addEventListener('keydown', onKey, true);
    frame = root.requestAnimationFrame(tick);
    return true;
  }
  function menuButton(id, label, show, onClick) {
    const parent = document.querySelector('#menu .menuActions');
    if (!parent) return;
    let b = document.getElementById(id);
    if (show) {
      if (!b) {
        b = document.createElement('button'); b.id = id; b.className = 'opt ghost'; b.type = 'button';
        b.textContent = label;
        b.addEventListener('click', onClick);
        parent.appendChild(b);
      }
    } else if (b) b.remove();
  }
  /** Botones del menú: el epílogo aparece solo cuando ya se desbloqueó; la llegada al mar, cuando ya se vio. */
  function refreshMenu(epilogueUnlocked, marineSeen) {
    // V58.6: etiquetas cortas (van en la franja de opciones del menú compacto).
    menuButton('btnEpilogo', '▶ ESCENA FINAL', !!epilogueUnlocked && SETS.epilogo.length > 0, () => play({ set: 'epilogo' }));
    menuButton('btnMarino', '▶ LLEGADA AL MAR', !!marineSeen && SETS.marino.length > 0, () => play({ set: 'marino' }));
  }
  /** El menú avisa el vestuario elegido (lo usa la llegada al mar al repetirse desde el menú). */
  function setLook(value) { if (typeof value === 'string') look = value; }
  NS.ToxiPlayer = { play, refreshMenu, setLook, get active() { return active; }, count: (set) => (SETS[set || 'prologo'] || []).length };
  // Este archivo carga después de main.js: avisa que ya está listo para que el menú pinte sus botones.
  root.dispatchEvent(new CustomEvent('camion:toxiplayer-ready'));
})(typeof globalThis !== 'undefined' ? globalThis : window);
