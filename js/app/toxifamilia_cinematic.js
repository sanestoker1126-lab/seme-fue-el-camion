/* La Toxifamilia — reproductor de escenas animadas, desacoplado del motor.
   Reproduce el prólogo «ARCHIVO 01» (antes de la primera partida y desde VER CINEMÁTICA), la escena post-créditos
   (solo cuando está desbloqueada) y, desde V58.2, la LLEGADA AL MAR (primera vez que se empieza la misión 3).
   Efectos por escena: lluvia, monitores (reloj 21:45), HUD arcade, apagón, título LEGEND OF PRESOS, recuerdo (tono de
   memoria) y burbujas. V58.2: personajes animados por cuadros con su propia línea de tiempo (caminar, voltear, nadar)
   y diálogos línea por línea con quién habla (layout 'dialogo').
   API: CAMION.ToxiPlayer.play({ set: 'prologo'|'epilogo'|'marino'|'guadalajara', look, finishLabel, onDone(fin) }). */
(function (root) {
  'use strict';
  const NS = root.CAMION;
  if (!NS || !NS.TOXIFAMILIA || !root.document) return;
  const manifest = NS.TOXIFAMILIA;
  const SETS = {};
  try {
    SETS.prologo = manifest.validate(manifest.SCENES);
    SETS.epilogo = manifest.validate(manifest.EPILOGUE || []);
    SETS.espacio = manifest.validate(manifest.ESPACIO || []);
    SETS.marino = manifest.validate(manifest.MARINO || []);
    SETS.guadalajara = manifest.validate(manifest.GDL_TRANSITION || []);
    SETS.parafalls = manifest.validate(manifest.PARAFALLS || []);
  } catch (err) { console.error('[Toxifamilia] Guion inválido', err); return; }
  if (!SETS.prologo.length) return;

  let overlay = null, scenes = [], index = 0, active = false, elapsed = 0, prev = 0, frame = 0, onDone = null;
  let look = 'original', finishLabel = null, actors = [], lineIndex = -1;
  const preloaded = new Map();
  // Porcentaje transparente bajo el último píxel opaco de los pies. Se mide al empaquetar.
  const sole = {
  "assets/player/sofia/idle_01.png": 2.68,
  "assets/companions/luna.png": 3.57,
  "assets/companions/morita.png": 2.23,
  "assets/player/sofia/land_01.png": 2.68,
  "assets/player/sofia/run_02.png": 2.68,
  "assets/player/variants/uniforme/kick_01.png": 4.02,
  "assets/player/variants/uniforme/run_01.png": 4.02,
  "assets/player/variants/uniforme/run_02.png": 4.02,
  "assets/player/variants/uniforme/run_03.png": 4.02,
  "assets/player/variants/uniforme/run_04.png": 4.02,
  "assets/player/variants/uniforme/idle_01.png": 2.68,
  "assets/companions/morita_walk_v38_01.png": 4.91,
  "assets/companions/morita_walk_v38_02.png": 4.46,
  "assets/companions/morita_walk_v38_03.png": 5.36,
  "assets/companions/morita_walk_v38_04.png": 4.46,
  "assets/companions/morita_idle_v38_01.png": 3.57,
  "assets/companions/morita_idle_v38_02.png": 3.57,
  "assets/companions/morita_idle_v38_03.png": 3.57,
  "assets/companions/morita_idle_v38_04.png": 8.48,
  "assets/companions/morita_idle_v38_05.png": 8.93,
  "assets/companions/morita_idle_v38_06.png": 8.93,
  "assets/cinematica/marino/sofia_original_asombro_00.webp": 2.02,
  "assets/cinematica/marino/sofia_original_asombro_01.webp": 2.02,
  "assets/cinematica/marino/sofia_original_asombro_02.webp": 2.02,
  "assets/cinematica/marino/sofia_original_asombro_03.webp": 2.36,
  "assets/cinematica/marino/sofia_original_asombro_04.webp": 2.02,
  "assets/cinematica/marino/sofia_original_asombro_05.webp": 2.36,
  "assets/cinematica/marino/sofia_uniforme_asombro_00.webp": 2.06,
  "assets/cinematica/marino/sofia_uniforme_asombro_01.webp": 2.06,
  "assets/cinematica/marino/sofia_uniforme_asombro_02.webp": 2.06,
  "assets/cinematica/marino/sofia_uniforme_asombro_03.webp": 2.06,
  "assets/cinematica/marino/sofia_uniforme_asombro_04.webp": 2.06,
  "assets/cinematica/marino/sofia_uniforme_asombro_05.webp": 2.06,
  "assets/cinematica/marino/sofia_rosa_asombro_00.webp": 2.41,
  "assets/cinematica/marino/sofia_rosa_asombro_01.webp": 2.41,
  "assets/cinematica/marino/sofia_rosa_asombro_02.webp": 2.07,
  "assets/cinematica/marino/sofia_rosa_asombro_03.webp": 2.07,
  "assets/cinematica/marino/sofia_rosa_asombro_04.webp": 2.07,
  "assets/cinematica/marino/sofia_rosa_asombro_05.webp": 2.07,
  "assets/companions/luna_walk_v38_01.png": 4.46,
  "assets/companions/luna_walk_v38_02.png": 4.46,
  "assets/companions/luna_walk_v38_03.png": 9.38,
  "assets/companions/luna_walk_v38_04.png": 8.93,
  "assets/companions/luna_idle_v38_01.png": 5.8,
  "assets/companions/luna_idle_v38_02.png": 5.8,
  "assets/companions/luna_idle_v38_03.png": 5.8,
  "assets/companions/luna_idle_v38_04.png": 12.5,
  "assets/companions/luna_idle_v38_05.png": 12.95,
  "assets/companions/luna_idle_v38_06.png": 12.5,
  "assets/cinematica/marino/paseo_mano_00.webp": 2.97,
  "assets/cinematica/marino/paseo_mano_01.webp": 2.97,
  "assets/cinematica/marino/paseo_mano_02.webp": 2.97,
  "assets/cinematica/marino/paseo_mano_03.webp": 2.67,
  "assets/cinematica/marino/paseo_mano_04.webp": 2.37,
  "assets/cinematica/marino/paseo_mano_05.webp": 2.67,
  "assets/cinematica/marino/paseo_mano_06.webp": 2.08,
  "assets/cinematica/marino/paseo_mano_07.webp": 2.37,
  "assets/cinematica/marino/paseo_mano_08.webp": 2.08,
  "assets/cinematica/marino/paseo_mano_09.webp": 1.48,
  "assets/cinematica/marino/paseo_mano_10.webp": 1.48,
  "assets/cinematica/marino/paseo_mano_11.webp": 1.19,
  "assets/cinematica/marino/estoker_platica_00.webp": 3.24,
  "assets/cinematica/marino/estoker_platica_01.webp": 2.06,
  "assets/cinematica/marino/estoker_platica_02.webp": 2.65,
  "assets/cinematica/marino/estoker_platica_03.webp": 2.35,
  "assets/cinematica/marino/estoker_platica_04.webp": 2.35,
  "assets/cinematica/marino/estoker_platica_05.webp": 2.06,
  "assets/cinematica/marino/estoker_platica_06.webp": 2.35,
  "assets/cinematica/marino/estoker_platica_07.webp": 2.35,
  "assets/cinematica/marino/estoker_platica_08.webp": 0.88,
  "assets/cinematica/marino/estoker_platica_09.webp": 0.88,
  "assets/cinematica/marino/estoker_platica_10.webp": 0.88,
  "assets/cinematica/marino/estoker_platica_11.webp": 0.88,
  "assets/cinematica/marino/tiburon_nado_00.webp": 2.29,
  "assets/cinematica/marino/tiburon_nado_01.webp": 7.63,
  "assets/cinematica/marino/tiburon_nado_02.webp": 12.98,
  "assets/cinematica/marino/tiburon_nado_03.webp": 9.92,
  "assets/cinematica/marino/tiburon_nado_04.webp": 8.4,
  "assets/cinematica/marino/tiburon_nado_05.webp": 12.21,
  "assets/cinematica/marino/tiburon_nado_06.webp": 12.21,
  "assets/cinematica/marino/pirana_nado_00.webp": 2.33,
  "assets/cinematica/marino/pirana_nado_01.webp": 3.88,
  "assets/cinematica/marino/pirana_nado_02.webp": 6.98,
  "assets/cinematica/marino/pirana_nado_03.webp": 5.43,
  "assets/cinematica/marino/pirana_nado_04.webp": 6.2,
  "assets/cinematica/marino/pirana_nado_05.webp": 3.88,
  "assets/cinematica/marino/pirana_nado_06.webp": 6.98,
  "assets/cinematica/marino/pulpo_flota_00.webp": 2.05,
  "assets/cinematica/marino/pulpo_flota_01.webp": 2.74,
  "assets/cinematica/marino/pulpo_flota_02.webp": 4.11,
  "assets/cinematica/marino/pulpo_flota_03.webp": 3.42,
  "assets/cinematica/marino/pulpo_flota_04.webp": 3.42,
  "assets/cinematica/marino/pulpo_flota_05.webp": 3.42,
  "assets/cinematica/marino/pulpo_tinta_00.webp": 2.44,
  "assets/cinematica/marino/pulpo_tinta_01.webp": 3.25,
  "assets/cinematica/marino/pulpo_tinta_02.webp": 3.25,
  "assets/cinematica/marino/pulpo_tinta_03.webp": 2.44,
  "assets/cinematica/marino/pulpo_tinta_04.webp": 2.44,
  "assets/cinematica/marino/pulpo_tinta_05.webp": 7.32,
  "assets/cinematica/marino/estoker_explica_01.webp": 0.74,
  "assets/cinematica/marino/estoker_explica_02.webp": 1.11,
  "assets/cinematica/marino/estoker_explica_03.webp": 0.74,
  "assets/cinematica/marino/estoker_explica_04.webp": 0.74,
  "assets/cinematica/marino/estoker_explica_05.webp": 0.74,
  "assets/cinematica/marino/estoker_explica_06.webp": 0.74,
  "assets/cinematica/marino/poseidon_tridente_00.webp": 1.52,
  "assets/cinematica/marino/poseidon_tridente_01.webp": 2.02,
  "assets/cinematica/marino/poseidon_tridente_02.webp": 4.04,
  "assets/cinematica/marino/poseidon_tridente_03.webp": 9.6,
  "assets/cinematica/marino/poseidon_tridente_04.webp": 14.14,
  "assets/cinematica/marino/poseidon_tridente_05.webp": 6.57,
  "assets/enemies/v50/kid_buzo/idle_01.webp": 3.2,
  "assets/enemies/v50/kid_buzo/idle_02.webp": 3.2,
  "assets/enemies/v50/kid_buzo/idle_03.webp": 3.2,
  "assets/enemies/v50/kid_buzo/idle_04.webp": 3.2,
  "assets/enemies/v50/kid_buzo/throw_prepare.webp": 3.2,
  "assets/enemies/v50/kid_buzo/throw_windup.webp": 3.2,
  "assets/enemies/v50/kid_buzo/throw_release.webp": 3.2,
  "assets/enemies/v50/kid_buzo/throw_projectile.webp": 3.2,
  "assets/enemies/v50/kid_buzo/throw_recovery.webp": 3.6,
  "assets/player/sofia/cheer_01.png": 2.68,
  "assets/player/sofia/cheer_02.png": 2.68,
  "assets/player/sofia/cheer_03.png": 2.68,
  "assets/player/variants/uniforme/cheer_01.png": 2.68,
  "assets/player/variants/uniforme/cheer_02.png": 2.68,
  "assets/player/variants/uniforme/cheer_03.png": 2.68,
  "assets/player/variants/rosa/cheer_01.png": 2.68,
  "assets/player/variants/rosa/cheer_02.png": 2.68,
  "assets/player/variants/rosa/cheer_03.png": 2.68,
  "assets/cinematica/parafalls/luna_idle_00.png": 8.2,
  "assets/cinematica/parafalls/luna_idle_01.png": 8.2,
  "assets/cinematica/parafalls/morita_idle_00.png": 6.64,
  "assets/cinematica/parafalls/morita_idle_01.png": 6.25
};
  function setSprite(img, url) {
    img.src = url;
    img.style.setProperty('--sole', (sole[url] || 0) + '%');
  }

  function fitContact() {
    if (!active || !overlay) return;
    const stage = $('.toxi-stage'), cast = $('.toxi-cast'), scene = scenes[index];
    const floor = manifest.CONTACTS[scene.id];
    stage.classList.toggle('toxi-contact', !!floor);
    if (!floor) {
      for (const prop of ['left','right','width','bottom']) cast.style.removeProperty(prop);
      stage.style.removeProperty('background-size'); stage.style.removeProperty('background-position');
      return;
    }
    const [width,height,x1,x2,soleY] = floor, w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    const cover = Math.max(w / width, h / height);
    const scale = Math.min(cover, w / Math.max(1, Math.min(width, (x2 - x1) * .60)));
    const ox = width * scale < w ? (w - width * scale) / 2 : Math.max(w - width * scale, Math.min(0, w / 2 - (x1 + x2) / 2 * scale));
    const oy = height * scale < h ? h * .83 - soleY * scale : Math.max(h - height * scale, Math.min(0, h * .83 - soleY * scale));
    stage.style.backgroundSize = width * scale + 'px ' + height * scale + 'px';
    stage.style.backgroundPosition = ox + 'px ' + oy + 'px';
    const lo = Math.max(0, ox + x1 * scale), hi = Math.min(w, ox + x2 * scale);
    const inset = Math.min(38, Math.max(0, (hi - lo) * .12));
    const left = lo + inset, right = Math.max(left + 1, hi - inset);
    cast.style.left = left + 'px'; cast.style.right = 'auto'; cast.style.width = (right - left) + 'px';
    cast.style.bottom = (h - (oy + soleY * scale)) + 'px';
  }
  root.addEventListener('resize', fitContact);
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
      if (!pre || (pre.complete && pre.naturalWidth)) { setSprite(s.img, url); s.cur = fi; }
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
    wrapper.className = 'toxi-actor ' + (ENTRANCES.includes(a.entrance) ? a.entrance : 'enter-rise') + (a.float ? ' float' : '') + (a.fitWidth ? ' fit-width' : '');
    const x = clamp(a.x, 0, 100, 50), b = clamp(a.bottom, 0, 100, 18);
    if (a.portrait) wrapper.classList.add('toxi-portrait');
    if (a.perch) wrapper.classList.add('toxi-perched');
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
      setSprite(img, frames[0]); img.alt = ''; img.decoding = 'async'; img.loading = 'eager';
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
    fx.textContent = '';
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
    stage.dataset.scene = s.id;
    if (NS.Arrival) NS.Arrival.show(s.arrival);
    const live = Number.isInteger(s.arrival);
    stage.classList.toggle('toxi-live', live);
    overlay.classList.toggle('toxi-live-overlay', live);
    document.body.classList.toggle('world-arrival', live);
    stage.classList.toggle('toxi-travel', s.backgroundMotion === 'travel');
    stage.style.backgroundImage = s.backgrounds.length
      ? s.backgrounds.map((b) => 'url("' + b + '")').join(',')
      : 'linear-gradient(130deg,#102945,#070e22 60%,#202c46)';
    stage.classList.toggle('toxi-legend', s.fxList.includes('legend'));
    stage.classList.toggle('toxi-dialogo', s.layout === 'dialogo');
    stage.classList.toggle('toxi-sombras', s.layout === 'sombras');
    stage.style.animationDuration = s.backgroundMotion === 'travel' ? s.durationMs + 'ms' :
      s.layout === 'dialogo' ? (s.durationMs + 600) + 'ms' : '';
    $('.toxi-eyebrow').textContent = s.tag || 'LA TOXI FAMILIA';
    $('.toxi-title').textContent = s.title;
    actors = [];
    // Conserva decodificadas solo la toma actual y la siguiente.
    const keep = new Set([s, scenes[index + 1]].filter(Boolean).flatMap(scene =>
      [...scene.backgrounds, ...scene.cast.flatMap(framesOf)]));
    for (const key of preloaded.keys()) if (!keep.has(key)) preloaded.delete(key);
    preloadScene(s);
    preloadScene(scenes[index + 1]);
    const cast = $('.toxi-cast');
    cast.textContent = '';
    for (const a of s.cast.filter(a => a.perch)) {
      const stall = document.createElement('i');
      stall.className = 'toxi-market-stall'; stall.style.left = a.x + '%';
      cast.appendChild(stall);
    }
    cast.append(...s.cast.map(actorElement));
    fitContact();
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
    if (NS.Arrival) NS.Arrival.show(null);
    document.body.classList.remove('world-arrival');
    root.cancelAnimationFrame(frame);
    overlay.hidden = true;
    actors = [];
    preloaded.clear();
    $('.toxi-cast').textContent = '';
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
  /** Botones del menú: epílogo, llegada al mar y transición urbana aparecen solo cuando ya se desbloquearon. */
  function refreshMenu(epilogueUnlocked, marineSeen, guadalajaraSeen, parafallsSeen, espacioSeen) {
    // V58.6: etiquetas cortas (van en la franja de opciones del menú compacto).
    menuButton('btnEpilogo', '▶ ESCENA FINAL', !!epilogueUnlocked && SETS.epilogo.length > 0, () => play({ set: 'epilogo' }));
    menuButton('btnMarino', '▶ LLEGADA AL MAR', !!marineSeen && SETS.marino.length > 0, () => play({ set: 'marino' }));
    menuButton('btnGuadalajara', '▶ TRANSICIÓN A GUADALAJARA', !!guadalajaraSeen && SETS.guadalajara.length > 0,
      () => play({ set: 'guadalajara', look }));
    menuButton('btnEspacio', '▶ LLEGADA A LA LUNA', !!espacioSeen && SETS.espacio.length > 0, () => play({ set: 'espacio' }));
    menuButton('btnParafalls', '▶ PORTAL DE PARAFALLS', !!parafallsSeen && SETS.parafalls.length > 0,
      () => play({ set: 'parafalls', finishLabel: '¡AL PARAFALLS!' }));
  }
  /** El menú avisa el vestuario elegido (lo usa la llegada al mar al repetirse desde el menú). */
  function setLook(value) { if (typeof value === 'string') look = value; }
  NS.ToxiPlayer = { play, refreshMenu, setLook, get active() { return active; }, count: (set) => (SETS[set || 'prologo'] || []).length };
  // Este archivo carga después de main.js: avisa que ya está listo para que el menú pinte sus botones.
  root.dispatchEvent(new CustomEvent('camion:toxiplayer-ready'));
})(typeof globalThis !== 'undefined' ? globalThis : window);
