/* ¡Se me fue el camión! — obstáculos (sin DOM).
   púas     · estáticas; dañan al tocarlas.
   cable    · ciclo apagado → aviso (parpadeo) → corriente; solo dañan con corriente.
   charco   · modifica la fricción de la superficie (lo lee la física); no daña.
   maceta   · cuelga bajo una cornisa; al pasar por debajo tiembla 0,5 s y cae; reaparece al cabo de 6 s fuera de cámara.
   Las cajas rompibles son sólidos (world.solids, kind 'crate'): el dash las rompe.
   V58.3:
   corriente · (mar) franja de agua que alterna calma → aviso → corriente fuerte. Fuerte, arrastra a Sofía de lado
               más rápido de lo que nada (P.flowX lo suma la física al nadar); se sale nadando arriba/abajo o con DASH.
               No daña. Solo cambia la velocidad horizontal: la física sigue chocando con paredes y repisas.
   asteroide · (Luna) sobre una plataforma: con Sofía cerca, una mira roja marca dónde caerá (aviso de 1 s); luego
               la roca baja en diagonal y estalla al tocar el piso. Daña al tocarla (en el aire o en el impacto). */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};
  // Identificador estable por mundo: el contador vive en W, así dos construcciones iguales dan los mismos IDs.
  const nid = (W, scope, type) => { W._hazardSerial = (W._hazardSerial || 0) + 1; return `${scope || 'w'}:${type}:${W._hazardSerial}`; };

  const SPARK = { off: 1.7, warn: 0.6, on: 1.1, height: 26 };
  const POT = { trigger: 64, shake: 0.5, gravity: 1400, respawn: 6, r: 12 };
  // V58.3 · speed: arrastre en u/s con la corriente fuerte (Sofía nada a 215; su DASH, a 440). ramp: s en llegar a toda fuerza.
  const CURRENT = { calm: 2.4, warn: 1.0, strong: 2.8, speed: 290, ramp: 0.35, h: 150 };
  // V58.3 · wait: pausa entre caídas (s, mín–máx); rise/run: de dónde viene la roca respecto al punto de impacto.
  const ASTEROID = { wait: [1.6, 3.4], warn: 1.0, fall: 0.55, rise: 300, run: 200, r: 17, impact: 0.5, nearY: 520, nearX: 760 };

  function addSpikes(W, o) {
    const h = { type: 'spikes', id: nid(W, o.scope, 'puas'), x1: o.x - o.w / 2, x2: o.x + o.w / 2, y: o.y, h: 20, scene: o.scene, region: o.region || 'main', plat: o.plat || null };
    W.hazards.push(h); return h;
  }
  function addSpark(W, o) {
    const h = { type: 'spark', id: nid(W, o.scope, 'cable'), x1: o.x - o.w / 2, x2: o.x + o.w / 2, y: o.y, t: o.phase || 0, state: 'off', scene: o.scene, region: o.region || 'main', plat: o.plat || null };
    W.hazards.push(h); return h;
  }
  function addPuddle(W, o) {
    const h = { type: 'puddle', id: nid(W, o.scope, 'charco'), x1: o.x - o.w / 2, x2: o.x + o.w / 2, y: o.y, scene: o.scene, region: o.region || 'main', plat: o.plat };
    W.hazards.push(h); return h;
  }
  function addPot(W, o) {
    const h = { type: 'pot', id: nid(W, o.scope, 'maceta'), x: o.x, hangY: o.hangY, floorY: o.floorY, y: o.hangY + POT.r, vy: 0, state: 'idle', t: 0, scene: o.scene, region: o.region || 'main', plat: o.plat };
    W.hazards.push(h); return h;
  }

  function addCurrent(W, o) {
    const h = { type: 'current', id: nid(W, o.scope, 'corriente'), x1: o.x1, x2: o.x2, y1: o.y1, y2: o.y2, dir: o.dir < 0 ? -1 : 1,
      speed: o.speed || CURRENT.speed, t: o.phase || 0, state: 'calm', k: 0, scene: o.scene, region: o.region || 'main' };
    h.state = currentState(h.t);
    W.hazards.push(h); return h;
  }
  function addAsteroid(W, o) {
    const pl = o.plat;
    const h = { type: 'asteroid', id: nid(W, o.scope, 'asteroide'), plat: pl, x1: pl.x1 + 24, x2: pl.x2 - 24, y: pl.y, dir: o.dir < 0 ? -1 : 1,
      state: 'idle', t: 0, wait: o.wait != null ? o.wait : ASTEROID.wait[0], seed: o.seed || 0, n: 0, tx: (pl.x1 + pl.x2) / 2, rx: 0, ry: 0,
      scene: o.scene, region: o.region || 'main' };
    W.hazards.push(h); return h;
  }
  function currentState(t) {
    const cycle = CURRENT.calm + CURRENT.warn + CURRENT.strong, ph = ((t % cycle) + cycle) % cycle;
    return ph < CURRENT.calm ? 'calm' : ph < CURRENT.calm + CURRENT.warn ? 'warn' : 'strong';
  }
  const inCurrent = (h, P) => P.x >= h.x1 && P.x <= h.x2 && P.y >= h.y1 && P.y <= h.y2;
  // Pseudoazar determinista (mismo mundo → mismas pausas): fracción de un seno grande.
  const frac = (v) => { const x = Math.sin(v) * 43758.5453; return x - Math.floor(x); };

  function updateCurrent(h, P, dt, ctx, ev) {
    h.t += dt;
    const prev = h.state;
    h.state = currentState(h.t);
    const goal = h.state === 'strong' ? 1 : 0;
    h.k += Math.max(-dt / CURRENT.ramp, Math.min(dt / CURRENT.ramp, goal - h.k));
    if (prev !== h.state && h.state === 'strong' && Math.abs(P.y - (h.y1 + h.y2) / 2) < 320) ev.push({ type: 'currentOn', hazard: h, inside: !!(P.water && inCurrent(h, P)) });
    if (!P.dead && P.water && h.k > 0 && inCurrent(h, P)) P.flowX += h.dir * h.speed * h.k;
  }

  function updateAsteroid(h, P, dt, ctx, ev) {
    const A = ASTEROID;
    h.t += dt;
    if (h.state === 'idle') {
      const near = Math.abs(P.y - h.y) < A.nearY && Math.abs(P.x - (h.x1 + h.x2) / 2) < A.nearX;
      if (h.t >= h.wait && near && !P.dead && !ctx.busy) {
        // Apunta a donde está Sofía si anda por esa plataforma; si no, a un punto de la plataforma.
        const onIt = Math.abs(P.y + P.h / 2 - h.y) < 160 && P.x > h.x1 - 60 && P.x < h.x2 + 60;
        h.tx = onIt ? Math.max(h.x1, Math.min(h.x2, P.x)) : h.x1 + (h.x2 - h.x1) * frac(h.seed * 7.1 + h.n * 3.3);
        h.state = 'warn'; h.t = 0;
        ev.push({ type: 'asteroidWarn', hazard: h });
      }
    } else if (h.state === 'warn') {
      if (h.t >= A.warn) { h.state = 'fall'; h.t = 0; }
    } else if (h.state === 'fall') {
      const p = Math.min(1, h.t / A.fall);
      h.rx = h.tx - h.dir * A.run * (1 - p); h.ry = h.y - 12 - A.rise * (1 - p);
      if (p >= 1) {
        h.state = 'impact'; h.t = 0; h.n++;
        h.wait = A.wait[0] + (A.wait[1] - A.wait[0]) * frac(h.seed * 1.7 + h.n * 2.9);
        ev.push({ type: 'asteroidImpact', hazard: h, x: h.tx, y: h.y });
      }
    } else if (h.state === 'impact') {
      if (h.t >= A.impact) { h.state = 'idle'; h.t = 0; }
    }
  }
  /** Caja de daño del asteroide en su estado actual (null si no daña). */
  function asteroidBox(h) {
    const r = ASTEROID.r;
    if (h.state === 'fall') return { x1: h.rx - r, y1: h.ry - r, x2: h.rx + r, y2: h.ry + r };
    if (h.state === 'impact' && h.t < 0.12) return { x1: h.tx - 30, y1: h.y - 30, x2: h.tx + 30, y2: h.y + 2 };   // la onda del impacto
    return null;
  }

  function sparkState(t) {
    const cycle = SPARK.off + SPARK.warn + SPARK.on, ph = ((t % cycle) + cycle) % cycle;
    return ph < SPARK.off ? 'off' : ph < SPARK.off + SPARK.warn ? 'warn' : 'on';
  }

  /** ctx: { active(x,y), onScreen(x,y,m), hurt(srcX, srcY, kind), hurtbox() } */
  function update(W, P, dt, ctx, ev) {
    const U = NS.util;
    ev = ev || [];
    const hb = ctx.hurtbox();
    P.flowX = 0;   // V58.3: lo vuelven a sumar las corrientes que la arrastren en este paso
    for (const h of W.hazards) {
      if (h.type === 'puddle') continue;
      if (h.type === 'current') { updateCurrent(h, P, dt, ctx, ev); continue; }
      if (h.type === 'asteroid') {
        updateAsteroid(h, P, dt, ctx, ev);
        const box = !P.dead && !ctx.busy && asteroidBox(h);
        if (box && U.overlap(hb, box)) ctx.hurt(h.state === 'fall' ? h.rx : h.tx, h.state === 'fall' ? h.ry : h.y, 'asteroid');
        continue;
      }
      if (h.type === 'spark') {
        h.t += dt;
        const prev = h.state;
        h.state = sparkState(h.t);
        if (prev !== h.state && h.state === 'on' && ctx.onScreen((h.x1 + h.x2) / 2, h.y, 40)) ev.push({ type: 'sparkOn', hazard: h });
      }
      if (h.type === 'pot') updatePot(h, P, dt, ctx, ev);
      if (P.dead || ctx.busy) continue;
      if (h.type === 'spikes') {
        if (U.overlap(hb, { x1: h.x1 + 4, y1: h.y - h.h + 4, x2: h.x2 - 4, y2: h.y + 2 })) ctx.hurt((h.x1 + h.x2) / 2, h.y, 'spikes');
      } else if (h.type === 'spark' && h.state === 'on') {
        if (U.overlap(hb, { x1: h.x1, y1: h.y - SPARK.height, x2: h.x2, y2: h.y + 2 })) ctx.hurt((h.x1 + h.x2) / 2, h.y, 'spark');
      } else if (h.type === 'pot' && h.state === 'fall') {
        if (U.overlap(hb, { x1: h.x - POT.r, y1: h.y - POT.r, x2: h.x + POT.r, y2: h.y + POT.r })) {
          ctx.hurt(h.x, h.y, 'pot');
          h.state = 'broken'; h.t = 0;
          ev.push({ type: 'potBreak', hazard: h });
        }
      }
    }
    return ev;
  }

  function updatePot(h, P, dt, ctx, ev) {
    h.t += dt;
    if (h.state === 'idle') {
      h.y = h.hangY + POT.r;
      const under = P.ground === h.plat && Math.abs(P.x - h.x) < POT.trigger;
      if (under && !P.dead) { h.state = 'shake'; h.t = 0; ev.push({ type: 'potShake', hazard: h }); }
    } else if (h.state === 'shake') {
      if (h.t >= POT.shake) { h.state = 'fall'; h.t = 0; h.vy = 0; }
    } else if (h.state === 'fall') {
      h.vy += POT.gravity * dt;
      h.y += h.vy * dt;
      if (h.y + POT.r >= h.floorY) { h.y = h.floorY - POT.r; h.state = 'broken'; h.t = 0; ev.push({ type: 'potBreak', hazard: h }); }
    } else if (h.state === 'broken') {
      if (h.t >= POT.respawn && !ctx.onScreen(h.x, h.hangY, 60)) { h.state = 'idle'; h.t = 0; h.y = h.hangY + POT.r; }
    }
  }

  NS.Obstacles = { SPARK, POT, CURRENT, ASTEROID, addSpikes, addSpark, addPuddle, addPot, addCurrent, addAsteroid, update, sparkState,
    currentState, asteroidBox };
})(typeof globalThis !== 'undefined' ? globalThis : window);
