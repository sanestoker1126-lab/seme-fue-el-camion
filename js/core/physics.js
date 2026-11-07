/* ¡Se me fue el camión! — física y colisiones (sin DOM).
   Orden de un paso fijo (1/60 s):
     1) transporte de la tarima móvil sobre la que se estaba   2) entrada horizontal y fricción por superficie
     3) dash   4) BAJAR (solo superficies atravesables)   5) salto con buffer y coyote time
     6) gravedad (vértice suave, caída rápida, salto variable)   7) mover X y resolver sólidos
     8) mover Y, resolver sólidos (suelo/techo), asistencia de escalón y aterrizaje en plataformas de un sentido
   Los cuerpos usan centro (x,y) y tamaño (w,h). Las plataformas de un sentido usan {x1,x2,y}; los sólidos {x1,y1,x2,y2}.
   Velocidad terminal (980 u/s ≈ 16 u/paso) < grosor mínimo de los sólidos (14 u), y el aterrizaje compara el pie
   anterior con la superficie, así que no hay túnel aunque se caiga a máxima velocidad. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};

  function createPlayer(x, footY) {
    const PC = NS.CONFIG.player, PH = NS.CONFIG.phys;
    return {
      x, y: footY - PC.h / 2, w: PC.w, h: PC.h, vx: 0, vy: 0, face: 1,
      ground: null, coyote: 0, jumpBuffer: 0, dashT: 0, dashCD: 0, airDashes: PH.airDashes,
      dropT: 0, stunT: 0, landT: 0, hurtT: 0, invuln: 0, noCut: false,
      kickT: 0, kickCD: 0,
      airTopFoot: footY, prevFoot: footY, state: 'idle', stateT: 0, animT: 0,
      shield: false, magnetT: 0, dead: false, cheer: false, onSlip: false, frozen: false,
      water: null, submerged: false, waterT: 0, swimCD: 0, leapT: 0, wade: null, wadeT: 0, waterBelow: null   // V52: agua
    };
  }

  /** Mueve las tarimas móviles y guarda su desplazamiento del paso (dx, dy) para transportar a quien esté encima.
      V50: las bandas eléctricas transportan sin moverse (dx = velocidad·dt) y las tejas flojas avanzan su ciclo
      sólida → tiembla → se cae → reaparece. dt opcional (por defecto el paso fijo). */
  function updatePlatforms(W, t, dt) {
    dt = dt || NS.CONFIG.sim.fixedDt;
    const CR = NS.CONFIG.crumble;
    for (const pl of W.platforms) {
      pl.prevY = pl.y;
      if (pl.kind === 'belt') { pl.dx = pl.belt * dt; pl.dy = 0; continue; }
      if (pl.kind === 'crumble') {
        if (pl.crState === 'shake') { pl.crT += dt; if (pl.crT >= CR.shake) { pl.crState = 'gone'; pl.crT = 0; pl.gone = true; } }
        else if (pl.crState === 'gone') { pl.crT += dt; if (pl.crT >= CR.respawn) { pl.crState = 'solid'; pl.crT = 0; pl.gone = false; } }
        continue;
      }
      if (pl.kind !== 'moving' && pl.kind !== 'pigeon') continue;
      const ox = pl.x1, oy = pl.y;
      const off = Math.sin(t * pl.speed + pl.phase) * pl.range;
      pl.x1 = pl.baseX1 + off;
      pl.x2 = pl.baseX2 + off;
      pl.y = pl.baseY + Math.sin(t * pl.speed * 0.7 + pl.phase) * pl.vrange;
      pl.dx = pl.x1 - ox;
      pl.dy = pl.y - oy;
    }
  }

  function isSlippery(P, W) {
    const g = P.ground;
    if (!g) return false;
    for (const h of W.hazards) if (h.type === 'puddle' && h.plat === g && P.x > h.x1 && P.x < h.x2) return true;
    return false;
  }

  const solidActive = (s) => !s.broken && !s.open;

  function resolveX(P, W, prevX, ev) {
    const hw = P.w / 2, top = P.y - P.h / 2 + 0.5, bot = P.y + P.h / 2 - 0.5;
    for (const s of W.solids) {
      if (!solidActive(s)) continue;
      if (bot <= s.y1 || top >= s.y2) continue;
      if (P.x + hw <= s.x1 || P.x - hw >= s.x2) continue;
      if (s.breakable && P.dashT > 0) { s.broken = true; ev.push({ type: 'crate', solid: s }); continue; }
      const fromLeft = prevX + hw <= s.x1 + 0.01, fromRight = prevX - hw >= s.x2 - 0.01;
      if (fromLeft) P.x = s.x1 - hw;
      else if (fromRight) P.x = s.x2 + hw;
      else if (P.x + hw - s.x1 < s.x2 - (P.x - hw)) P.x = s.x1 - hw;
      else P.x = s.x2 + hw;
      if (P.dashT > 0) { P.dashT = 0; ev.push({ type: 'dashBlocked', solid: s }); }
      P.vx = 0;
      ev.push({ type: 'wall', solid: s });
    }
  }

  function resolveY(P, W, prevY, ev) {
    const hw = P.w / 2 - 0.5;
    for (const s of W.solids) {
      if (!solidActive(s)) continue;
      if (P.x + hw <= s.x1 || P.x - hw >= s.x2) continue;
      const top = P.y - P.h / 2, bot = P.y + P.h / 2;
      if (bot <= s.y1 || top >= s.y2) continue;
      const prevTop = prevY - P.h / 2, prevBot = prevY + P.h / 2;
      if (prevBot <= s.y1 + 0.75) {
        P.y = s.y1 - P.h / 2;
        if (P.vy > 0) P.vy = 0;
        P.ground = s;
      } else if (prevTop >= s.y2 - 0.75) {
        P.y = s.y2 + P.h / 2;
        if (P.vy < 0) { P.vy = 0; ev.push({ type: 'bonk', solid: s }); }
      } else {
        const up = bot - s.y1, down = s.y2 - top;
        if (up <= down) { P.y -= up; P.vy = Math.min(P.vy, 0); P.ground = s; }
        else { P.y += down; P.vy = Math.max(P.vy, 0); }
      }
    }
  }

  function findOneWayLanding(P, W, prevFoot) {
    const U = NS.util, ff = NS.CONFIG.player.footFactor, foot = P.y + P.h / 2;
    let best = null;
    for (const pl of W.platforms) {
      if (pl.gone || (P.dropT > 0 && pl.drop)) continue;
      if (pl.y > foot + 0.5 || pl.y < prevFoot - 40) continue;
      if (!U.overlapsX(P, pl, ff)) continue;
      if (prevFoot <= Math.max(pl.prevY, pl.y) + 0.75 && foot >= pl.y && (!best || pl.y < best.y)) best = pl;
    }
    return best;
  }

  /** Asistencia de escalón: al caminar por peldaños, se sube o baja a un peldaño cercano sin saltar. */
  function stepAssist(P, W, prevGround, prevFoot, inp) {
    const U = NS.util, PH = NS.CONFIG.phys;
    if (!prevGround || prevGround.solid || prevGround.gone || inp.downPressed || P.dashT > 0 || P.vy < 0 || Math.abs(P.vx) <= 22 || P.jumpBuffer > 0) return null;
    if (Math.abs(prevFoot - prevGround.y) > PH.stepMax) return null;
    let target = null, dist = Infinity;
    for (const pl of W.platforms) {
      if (pl.gone || !(pl.kind === 'stair' || prevGround.kind === 'stair')) continue;
      if (!U.overlapsX(P, pl, 0.38)) continue;
      const dy = pl.y - prevFoot;
      if (Math.abs(dy) > PH.stepMax) continue;
      const d = Math.abs(dy) + (pl === prevGround ? -0.1 : 0);
      if (d < dist) { target = pl; dist = d; }
    }
    return target;
  }

  /* ---------- V52 · Agua ----------
     Zonas {x1, x2, y (superficie), y2 (fondo), deep}. Profunda: se nada (flotación, buceo, brazadas, dash bajo el
     agua, salto para salir, orilla que se sube sola). Baja: se camina más lento salpicando. */
  function waterAt(W, P) {
    if (!W.waters) return null;
    const foot = P.y + P.h / 2, top = P.y - P.h / 2;
    for (const z of W.waters) if (P.x >= z.x1 && P.x <= z.x2 && foot > z.y && top < z.y2) return z;
    return null;
  }
  const floatYOf = (z, P) => z.y + P.h * NS.CONFIG.water.floatOffset;

  /** Orilla: nadando en la superficie contra el borde de la poza, si hay suelo a la altura del agua, Sofía sube. */
  function shoreClimb(P, W, z, dir) {
    const WT = NS.CONFIG.water, hw = P.w / 2;
    const edge = dir > 0 ? z.x2 : z.x1;
    if (Math.abs(P.x - edge) > hw + 8) return null;
    let best = null;
    const tops = [];
    for (const pl of W.platforms) if (!pl.gone) tops.push([pl, pl.y, pl.x1, pl.x2]);
    for (const s of W.solids) if (!s.broken && !s.open && s.kind !== 'wall') tops.push([s, s.y1, s.x1, s.x2]);
    for (const [obj, top, x1, x2] of tops) {
      if (top < z.y - WT.climbUp || top > z.y + 6) continue;
      const reach = dir > 0 ? (x1 <= edge + 6 && x2 >= edge + hw) : (x2 >= edge - 6 && x1 <= edge - hw);
      if (reach && (!best || top < best[1])) best = [obj, top];
    }
    if (!best) return null;
    P.y = best[1] - P.h / 2; P.vy = 0; P.x = dir > 0 ? Math.max(P.x, edge + hw * 0.6) : Math.min(P.x, edge - hw * 0.6);
    P.ground = best[0];
    return best[0];
  }

  function swimStep(P, W, inp, dt, ev, z) {
    const PH = NS.CONFIG.phys, WT = NS.CONFIG.water;
    if (P.water !== z) {
      ev.push({ type: 'waterEnter', zone: z, vy: P.vy, x: P.x });
      if (P.vy > 0) P.vy *= WT.entryDamp;
      P.kickT = 0; P.coyote = 0; P.jumpBuffer = 0; P.airDashes = PH.airDashes; P.dropT = 0;
      if (P.dashT > 0) P.dashT = Math.min(P.dashT, 0.06);
      P.water = z; P.waterT = 0;
    }
    P.ground = null; P.wade = null;
    P.waterT += dt;
    P.swimCD = Math.max(0, P.swimCD - dt);
    const floatY = floatYOf(z, P);
    const stunned = P.stunT > 0;
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const up = !!(inp.upHeld || inp.jumpHeld), down = !!(inp.downHeld || inp.downPressed);
    const atSurface = P.y <= floatY + 9;
    let impulse = false;
    // Dash bajo el agua: ráfaga en la dirección del joystick (con la diagonal si se sostiene arriba/abajo).
    if (inp.dashPressed && P.dashCD <= 0 && !stunned) {
      if (dir) P.face = dir;
      P.dashT = WT.dashT; P.dashCD = PH.dashCooldown;
      P.vx = P.face * WT.dashV;
      P.vy = up ? -WT.dashV * 0.55 : down ? WT.dashV * 0.55 : P.vy * 0.3;
      ev.push({ type: 'swimDash' }); impulse = true;
    }
    // SALTAR: en la superficie sale del agua de un salto; sumergida es una brazada hacia arriba.
    if (inp.jumpPressed && !stunned && P.dashT <= 0) {
      if (atSurface) {
        P.vy = PH.jump * WT.exitJump; P.noCut = false; P.leapT = 0.45;
        ev.push({ type: 'waterJump', zone: z, x: P.x });
        impulse = true;
      } else if (P.swimCD <= 0) {
        P.vy = Math.min(P.vy, -WT.stroke); P.swimCD = WT.strokeCD;
        ev.push({ type: 'stroke' }); impulse = true;
      }
    }
    // Horizontal.
    if (P.dashT > 0) P.vx = P.face * Math.max(Math.abs(P.vx) * Math.pow(0.25, dt), WT.swimMove);
    else {
      const target = dir * WT.swimMove * (stunned ? 0.4 : 1);
      const dv = target - P.vx, stepv = WT.swimAccel * dt;
      P.vx += Math.abs(dv) <= stepv ? dv : Math.sign(dv) * stepv;
      if (dir && !stunned) P.face = dir;
    }
    // Vertical: buceo, subida o flotación (resorte suave hacia la superficie).
    if (!impulse && P.dashT <= 0) {
      if (down) P.vy = Math.min(WT.diveMax, P.vy + WT.diveAccel * dt);
      else if (up && !atSurface) P.vy = Math.max(-WT.riseMax, P.vy - WT.riseAccel * dt);
      else {
        P.vy += (floatY - P.y) * WT.buoyK * dt;
        P.vy *= Math.max(0, 1 - WT.buoyDamp * dt);
      }
    } else if (P.dashT > 0) P.vy *= Math.pow(0.2, dt);
    const prevX = P.x, prevY = P.y;
    P.prevFoot = prevY + P.h / 2;
    P.x += P.vx * dt;
    resolveX(P, W, prevX, ev);
    // Sumergida no sale de lado: las orillas de la poza son paredes bajo la superficie.
    if (P.y - P.h / 2 > z.y - 2) P.x = Math.max(z.x1 + P.w / 2, Math.min(z.x2 - P.w / 2, P.x));
    P.y += P.vy * dt;
    resolveY(P, W, prevY, ev);
    if (P.ground) P.ground = null;            // en agua profunda no se pisa: se nada
    if (P.y + P.h / 2 > z.y2) { P.y = z.y2 - P.h / 2; if (P.vy > 0) P.vy = 0; }
    if (P.leapT <= 0 && P.y < floatY - 7) { P.y = floatY - 7; if (P.vy < 0) P.vy *= 0.3; }
    P.submerged = P.y - P.h / 2 > z.y + 3;
    // Orilla a la altura del agua: nadar contra ella la sube.
    if (dir && atSurface && !P.submerged && P.dashT <= 0 && !impulse) {
      const pl = shoreClimb(P, W, z, dir);
      if (pl) { P.water = null; P.submerged = false; ev.push({ type: 'waterExit', zone: z, x: P.x, climb: true }); }
    }
    P.airTopFoot = P.y + P.h / 2;              // el agua corta la caída: no hay daño al salir
    return ev;
  }

  /**
   * Avanza al jugador un paso fijo.
   * inp: {left,right,jumpPressed,jumpHeld,dashPressed,downPressed}
   * Devuelve la lista de eventos físicos (jump, dash, drop, dropDenied, land, bounce, wall, bonk, crate...).
   */
  function stepPlayer(P, W, inp, dt, ev) {
    const PH = NS.CONFIG.phys;
    ev = ev || [];
    if (P.frozen) return ev;
    P.coyote = Math.max(0, P.coyote - dt);
    P.jumpBuffer = Math.max(0, P.jumpBuffer - dt);
    P.dashCD = Math.max(0, P.dashCD - dt);
    P.dropT = Math.max(0, P.dropT - dt);
    P.stunT = Math.max(0, P.stunT - dt);
    P.landT = Math.max(0, P.landT - dt);
    P.kickT = Math.max(0, P.kickT - dt);
    P.kickCD = Math.max(0, P.kickCD - dt);
    if (P.dashT > 0) { P.dashT = Math.max(0, P.dashT - dt); if (P.dashT === 0) ev.push({ type: 'dashEnd' }); }
    P.leapT = Math.max(0, P.leapT - dt);

    // 0) V52 · Agua profunda: se nada (mientras sale de un salto, la zona se ignora hasta que deja el agua).
    let zone = waterAt(W, P);
    if (zone && P.leapT > 0 && P.vy < 0) zone = null;
    if (zone && zone.deep) return swimStep(P, W, inp, dt, ev, zone);
    if (P.water) {
      ev.push({ type: 'waterExit', zone: P.water, x: P.x });
      P.water = null; P.submerged = false; P.airTopFoot = P.y + P.h / 2;
    }
    P.wade = zone && !zone.deep ? zone : null;
    P.wadeT = P.wade ? P.wadeT + dt : 0;

    // 1) Transporte: quien está sobre una tarima móvil viaja con ella.
    const prevGround = P.ground;
    if (prevGround && (prevGround.dx || prevGround.dy)) { P.x += prevGround.dx; P.y += prevGround.dy; }
    const onGround = !!prevGround;
    if (onGround) { P.coyote = PH.coyote; P.airDashes = PH.airDashes; }
    const slip = onGround && isSlippery(P, W);
    P.onSlip = slip;
    const stunned = P.stunT > 0;
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (inp.jumpPressed) P.jumpBuffer = PH.jumpBuffer;

    // 2) Movimiento horizontal.
    if (P.dashT <= 0) {
      if (dir !== 0) {
        let accel = PH.move * (onGround ? PH.groundAccel : PH.airAccel);
        if (slip) accel *= PH.slipAccel;
        if (P.wade) accel *= NS.CONFIG.water.wadeMul;   // V52: el tope de velocidad es blando; frena la aceleración
        if (stunned) accel *= 0.3;
        const turning = Math.sign(P.vx) === -dir && Math.abs(P.vx) > 40;
        P.vx += dir * accel * (turning ? PH.turnBoost : 1) * dt;
        if (!stunned) P.face = dir;
      } else {
        P.vx *= Math.pow(onGround ? (slip ? PH.slipFriction : PH.groundFriction) : PH.airFriction, dt);
        if (Math.abs(P.vx) < 2) P.vx = 0;
      }
      const cap = PH.move * (stunned ? 0.4 : 1) * (P.wade ? NS.CONFIG.water.wadeMul : 1);
      if (Math.abs(P.vx) > cap) P.vx = Math.sign(P.vx) * Math.max(cap, Math.abs(P.vx) * Math.pow(0.02, dt));
    }

    // 3) Patada: ataque corto con ventana activa independiente del dash.
    if (inp.kickPressed && P.kickCD <= 0 && !stunned && P.dashT <= 0) {
      if (dir) P.face = dir;
      P.kickT = 0.22;
      P.kickCD = 0.45;
      P.vx *= onGround ? 0.35 : 0.85; // en el aire la patada ya no frena el salto en seco
      ev.push({ type: 'kick' });
    }

    // 4) Dash: ráfaga horizontal sin gravedad; uno en el aire por salto.
    if (inp.dashPressed && P.dashCD <= 0 && !stunned && (onGround || P.airDashes > 0)) {
      if (dir) P.face = dir;
      P.dashT = PH.dashTime;
      P.dashCD = PH.dashCooldown;
      if (!onGround) P.airDashes--;
      P.vx = P.face * PH.dashSpeed;
      P.vy = 0;
      P.noCut = false;
      ev.push({ type: 'dash', air: !onGround });
    }

    // 4) BAJAR: solo peldaños, tarimas y andamios delgados. La piedra pintada no se atraviesa.
    if (inp.downPressed && P.ground && P.dashT <= 0) {
      if (P.ground.drop) {
        P.dropT = PH.dropTime;
        P.ground = null;
        P.vy = Math.max(P.vy, PH.dropKick);
        P.coyote = 0;
        ev.push({ type: 'drop' });
      } else ev.push({ type: 'dropDenied' });
    }

    // 5) Salto con buffer y coyote time. Saltar durante el dash lo cancela y conserva el impulso.
    if (P.jumpBuffer > 0 && (P.ground || P.coyote > 0) && P.stunT <= 0.1 && P.dropT <= 0) {
      P.vy = PH.jump * (P.wade ? NS.CONFIG.water.wadeJump : 1);
      P.jumpBuffer = 0;
      P.coyote = 0;
      P.ground = null;
      P.landT = 0;
      P.noCut = false;
      if (P.dashT > 0) { P.dashT = 0; ev.push({ type: 'dashJump' }); }
      ev.push({ type: 'jump' });
    }

    // 6) Gravedad.
    if (P.dashT > 0) {
      P.vx = P.face * PH.dashSpeed;
      P.vy = 0;
    } else {
      let g = PH.gravity;
      if (P.vy < 0 && !inp.jumpHeld && !P.noCut) g *= PH.jumpCutMul;
      else if (Math.abs(P.vy) < PH.apexBand) g *= PH.apexGravityMul;
      else if (P.vy > 0) g *= PH.fallGravityMul;
      P.vy = Math.min(PH.fallMax, P.vy + g * dt);
      if (P.vy >= 0) P.noCut = false;
    }

    // 7) Eje X.
    const prevX = P.x, prevY = P.y, prevFoot = prevY + P.h / 2;
    P.prevFoot = prevFoot;
    P.x += P.vx * dt;
    resolveX(P, W, prevX, ev);

    // 8) Eje Y.
    P.y += P.vy * dt;
    const jumpedNow = P.ground === null && prevGround !== null && P.vy < 0;
    P.ground = null;
    resolveY(P, W, prevY, ev);
    if (!P.ground && !jumpedNow) {
      const step = stepAssist(P, W, prevGround, prevFoot, inp);
      if (step) { P.y = step.y - P.h / 2; P.vy = 0; P.ground = step; }
    }
    if (P.vy >= 0) {
      const pl = findOneWayLanding(P, W, prevFoot);
      if (pl && (!P.ground || pl.y < (P.ground.y ?? Infinity))) { P.y = pl.y - P.h / 2; P.vy = Math.min(P.vy, 0); P.ground = pl; }
    }

    const foot = P.y + P.h / 2;
    if (P.ground && !prevGround) {
      const fall = foot - P.airTopFoot;
      if (P.ground.kind === 'bounce' || P.ground.kind === 'pigeon') {
        P.vy = inp.jumpHeld ? PH.bounceHeldVy : PH.bounceVy;
        P.noCut = true;
        P.airDashes = PH.airDashes;
        ev.push({ type: 'bounce', plat: P.ground, fall });
        P.ground = null;
        P.airTopFoot = foot;
      } else {
        ev.push({ type: 'land', fall, plat: P.ground, offset: Math.abs(P.x - ((P.ground.x1 + P.ground.x2) / 2)) });
      }
    }
    if (P.ground) P.airTopFoot = foot;
    else P.airTopFoot = Math.min(P.airTopFoot, foot);
    // V52 · Agua profunda justo debajo mientras cae (para la pose de clavado) y salpicaduras al vadear.
    P.waterBelow = null;
    if (!P.ground && P.vy > 280 && W.waters) {
      for (const z of W.waters) if (z.deep && P.x >= z.x1 && P.x <= z.x2 && z.y - foot >= 0 && z.y - foot < 95) { P.waterBelow = z; break; }
    }
    if (P.wade && P.ground && Math.abs(P.vx) > 110 && Math.floor(P.wadeT * 4) !== Math.floor((P.wadeT - dt) * 4)) ev.push({ type: 'wadeSplash', zone: P.wade, x: P.x });
    // Teja floja: pisarla la hace temblar; medio segundo después se cae (el juego avisa con un evento).
    if (P.ground && P.ground.kind === 'crumble' && P.ground.crState === 'solid') {
      P.ground.crState = 'shake'; P.ground.crT = 0;
      ev.push({ type: 'crumble', plat: P.ground });
    }
    return ev;
  }

  /** Máquina de estados de animación: un único estado por paso, con prioridad explícita. */
  function updateState(P, dt) {
    let s;
    if (P.dead) s = 'dead';
    else if (P.cheer) s = 'cheer';
    else if (P.water) {
      const fy = P.water.y + P.h * NS.CONFIG.water.floatOffset;
      if (P.hurtT > 0) s = 'swimHurt';
      else if (P.dashT > 0) s = 'swimDash';
      else if (P.submerged || P.y > fy + 12) s = P.vy > 70 ? 'swimDown' : P.vy < -70 ? (Math.abs(P.vx) > 60 ? 'swimUpDiag' : 'swimUp') : 'swimUnder';
      else s = Math.abs(P.vx) > 40 ? 'swim' : 'swimFloat';
    }
    else if (P.leapT > 0 && !P.ground && P.vy < 0 && P.hurtT <= 0) s = 'waterLeap';
    else if (P.hurtT > 0) s = 'hurt';
    else if (P.kickT > 0) s = 'kick';
    else if (P.dashT > 0) s = 'dash';
    else if (P.landT > 0 && P.ground) s = 'land';
    else if (!P.ground) s = P.vy < 0 ? 'jump' : P.waterBelow ? 'diveIn' : 'fall';
    else if (P.wade) s = Math.abs(P.vx) > 160 ? 'wadeRun' : Math.abs(P.vx) > 30 ? 'wade' : 'wadeIdle';
    else if (P.ground.kind === 'stair' && Math.abs(P.vx) > 28) s = 'climb';
    else if (Math.abs(P.vx) > 220) s = 'fastRun';
    else if (Math.abs(P.vx) > 45) s = 'run';
    else s = 'idle';
    if (s !== P.state) { P.state = s; P.stateT = 0; } else P.stateT += dt;
    P.animT += dt;
    return s;
  }

  NS.Physics = { createPlayer, updatePlatforms, stepPlayer, updateState, isSlippery, waterAt, floatYOf };
})(typeof globalThis !== 'undefined' ? globalThis : window);
