/* ¡Se me fue el camión! — obstáculos (sin DOM).
   púas     · estáticas; dañan al tocarlas.
   cable    · ciclo apagado → aviso (parpadeo) → corriente; solo dañan con corriente.
   charco   · modifica la fricción de la superficie (lo lee la física); no daña.
   maceta   · cuelga bajo una cornisa; al pasar por debajo tiembla 0,5 s y cae; reaparece al cabo de 6 s fuera de cámara.
   Las cajas rompibles son sólidos (world.solids, kind 'crate'): el dash las rompe. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};
  // Identificador estable por mundo: el contador vive en W, así dos construcciones iguales dan los mismos IDs.
  const nid = (W, scope, type) => { W._hazardSerial = (W._hazardSerial || 0) + 1; return `${scope || 'w'}:${type}:${W._hazardSerial}`; };

  const SPARK = { off: 1.7, warn: 0.6, on: 1.1, height: 26 };
  const POT = { trigger: 64, shake: 0.5, gravity: 1400, respawn: 6, r: 12 };

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

  function sparkState(t) {
    const cycle = SPARK.off + SPARK.warn + SPARK.on, ph = ((t % cycle) + cycle) % cycle;
    return ph < SPARK.off ? 'off' : ph < SPARK.off + SPARK.warn ? 'warn' : 'on';
  }

  /** ctx: { active(x,y), onScreen(x,y,m), hurt(srcX, srcY, kind), hurtbox() } */
  function update(W, P, dt, ctx, ev) {
    const U = NS.util;
    ev = ev || [];
    const hb = ctx.hurtbox();
    for (const h of W.hazards) {
      if (h.type === 'puddle') continue;
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

  NS.Obstacles = { SPARK, POT, addSpikes, addSpark, addPuddle, addPot, update, sparkState };
})(typeof globalThis !== 'undefined' ? globalThis : window);
