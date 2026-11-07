/* ¡Se me fue el camión! — entrada unificada (teclado + joystick virtual + botones táctiles).
   Los flancos (pulsar SALTAR, DASH, BAJAR) se retienen hasta que un paso de simulación los consume,
   así no se pierden aunque un fotograma no ejecute ningún paso (pantallas de 120/144 Hz). */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};

  function createInput(opts = {}) {
    const held = { left: false, right: false, up: false, down: false, jump: false, dash: false, kick: false };
    const stick = { left: false, right: false, up: false, down: false, upSoft: false, downSoft: false };
    const edge = { jump: false, dash: false, kick: false, down: false, pause: false };
    const listeners = [];
    const on = (el, type, fn, o) => { el.addEventListener(type, fn, o); listeners.push([el, type, fn, o]); };
    const $ = (id) => document.getElementById(id);

    const KEYMAP = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyK: 'jump',
      ArrowDown: 'down', KeyS: 'down', ShiftLeft: 'dash', ShiftRight: 'dash', KeyJ: 'dash', KeyL: 'dash', KeyX: 'kick', KeyU: 'kick'
    };
    on(window, 'keydown', (e) => {
      if (e.code === 'F2') { e.preventDefault(); if (opts.onDebug) opts.onDebug(); return; }
      if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); if (!e.repeat) edge.pause = true; return; }
      const k = KEYMAP[e.code];
      if (!k) return;
      e.preventDefault();
      if (!held[k] && !e.repeat) { if (k === 'jump') edge.jump = true; if (k === 'dash') edge.dash = true; if (k === 'kick') edge.kick = true; if (k === 'down') edge.down = true; }
      held[k] = true;
      if (opts.onActivity) opts.onActivity();
    });
    on(window, 'keyup', (e) => { const k = KEYMAP[e.code]; if (k) held[k] = false; });

    // Botones táctiles: captura de puntero y multitáctil.
    const buttons = Array.from(document.querySelectorAll('[data-key]'));
    for (const b of buttons) {
      const k = b.dataset.key;
      const press = (e) => {
        e.preventDefault();
        try { b.setPointerCapture(e.pointerId); } catch (_) { /* sin captura en algunos visores */ }
        if (!held[k]) { if (k === 'jump') edge.jump = true; if (k === 'dash') edge.dash = true; if (k === 'kick') edge.kick = true; if (k === 'down') edge.down = true; }
        held[k] = true;
        b.classList.add('pressed'); b.setAttribute('aria-pressed', 'true');
        if (opts.onActivity) opts.onActivity();
      };
      const release = (e) => { if (e) e.preventDefault(); held[k] = false; b.classList.remove('pressed'); b.setAttribute('aria-pressed', 'false'); };
      on(b, 'pointerdown', press);
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) on(b, t, release);
      on(b, 'contextmenu', (e) => e.preventDefault());
    }

    // Joystick: izquierda/derecha para mover, abajo para BAJAR (flanco), arriba no salta (evita saltos accidentales).
    const base = $('stickBase'), knob = $('stickKnob');
    let pointer = null;
    function releaseStick() {
      pointer = null; stick.left = stick.right = stick.up = stick.down = stick.upSoft = stick.downSoft = false;
      if (knob) { knob.style.left = '50%'; knob.style.top = '50%'; }
      if (base) base.classList.remove('pressed');
    }
    function moveStick(e) {
      const r = base.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const max = r.width * 0.31, dx = e.clientX - cx, dy = e.clientY - cy, len = Math.hypot(dx, dy), k = len > max ? max / len : 1;
      const nx = dx * k, ny = dy * k, th = max * 0.20;         // zona muerta más chica: responde antes
      knob.style.left = `calc(50% + ${nx}px)`; knob.style.top = `calc(50% + ${ny}px)`;
      stick.left = nx < -th; stick.right = nx > th;
      // Empujar el stick hacia ARRIBA salta (flanco): permite mover y saltar con el mismo pulgar.
      const up = ny < -max * 0.6;
      if (up && !stick.up) edge.jump = true;
      stick.up = up;
      // BAJAR en el stick: solo empuje recto y deliberado, para no caer por las plataformas al correr.
      const down = ny > max * 0.74 && Math.abs(nx) < max * 0.4;
      if (down && !stick.down) edge.down = true;
      stick.down = down;
      // V52 · Nadar: arriba/abajo sostenidos en cualquier ángulo (bucear en diagonal es natural).
      stick.upSoft = ny < -max * 0.45;
      stick.downSoft = ny > max * 0.45;
    }
    if (base) {
      on(base, 'pointerdown', (e) => { e.preventDefault(); pointer = e.pointerId; try { base.setPointerCapture(e.pointerId); } catch (_) {} base.classList.add('pressed'); moveStick(e); if (opts.onActivity) opts.onActivity(); });
      on(base, 'pointermove', (e) => { if (e.pointerId === pointer) { e.preventDefault(); moveStick(e); } });
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) on(base, t, (e) => { if (e.pointerId === pointer) releaseStick(); });
    }

    function releaseAll() {
      for (const k in held) held[k] = false;
      for (const k in edge) edge[k] = false;
      releaseStick();
      for (const b of buttons) { b.classList.remove('pressed'); b.setAttribute('aria-pressed', 'false'); }
    }
    on(window, 'blur', releaseAll);

    /** Estado para un paso de simulación; consume los flancos. */
    function snapshot() {
      const s = {
        left: held.left || stick.left, right: held.right || stick.right,
        jumpPressed: edge.jump, jumpHeld: held.jump || stick.up, dashPressed: edge.dash, kickPressed: edge.kick, downPressed: edge.down,
        upHeld: held.up || stick.upSoft, downHeld: held.down || stick.downSoft   // V52: nadar
      };
      if (s.left && s.right) { s.left = false; s.right = false; }
      edge.jump = edge.dash = edge.kick = edge.down = false;
      return s;
    }
    function consumePause() { const p = edge.pause; edge.pause = false; return p; }
    function destroy() { for (const [el, t, fn, o] of listeners) el.removeEventListener(t, fn, o); listeners.length = 0; }
    /** Para QA: inyectar estados sin eventos del DOM. */
    function inject(o) { Object.assign(held, o.held || {}); Object.assign(edge, o.edge || {}); }

    return { snapshot, consumePause, releaseAll, destroy, inject, held, edge };
  }

  NS.Input = { createInput };
})(typeof globalThis !== 'undefined' ? globalThis : window);
