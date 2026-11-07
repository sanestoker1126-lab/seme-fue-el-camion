/* ¡Se me fue el camión! — enemigos (sin DOM).
   Cada enemigo tiene estados explícitos y una señal previa antes de atacar.
   Reglas de contacto (en este orden):
     1) Dash contra enemigo vulnerable al dash → el enemigo recibe el golpe.
     2) Pisotón (Sofía cae y su pie venía por encima) → el enemigo recibe el golpe y Sofía rebota (recarga el dash aéreo).
     3) Perro bravo no mareado contra dash → choque sin daño para nadie (Sofía sale despedida).
     4) En otro caso Sofía recibe daño (retroceso desde la posición del enemigo).
   Cada enemigo solo puede recibir un golpe cada 0,25 s, así un contacto prolongado no cuenta varias veces. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};

  /* w/h = caja FÍSICA (movimiento, apoyo, contacto defensivo).
     hitKW/hitKH (caminantes) y hitK (voladores) expanden la caja de COMBATE
     para que patada/dash/pisotón conecten sobre el cuerpo visible del sprite,
     que se dibuja bastante más grande que la caja física. */
  const TYPES = {
    rat:    { walker: true, w: 30, h: 20, hp: 1, speed: 56, alertMul: 1.6, alertRange: 150, stomp: true, dash: true, minPlatform: 90, hitKW: 1.5, hitKH: 1.9 },
    dog:    { walker: true, w: 40, h: 26, hp: 1, speed: 44, chargeMul: 3.6, sight: 230, windup: 0.5, charge: 0.8, recover: 0.75, stomp: true, dash: true, minPlatform: 120, hitKW: 1.8, hitKH: 2.05 },
    bravo:  { walker: true, w: 52, h: 34, hp: 2, speed: 40, chargeMul: 3.8, sight: 280, windup: 0.6, charge: 0.9, recover: 1.1, stomp: true, dash: 'dizzy', minPlatform: 160, hitKW: 1.65, hitKH: 1.95 },
    chile:  { walker: true, stationary: true, w: 22, h: 32, hp: 1, cooldown: 2.6, windup: 0.6, shotSpeed: 200, range: 430, stomp: true, dash: true, minPlatform: 110, hitKW: 1.5, hitKH: 1.35 },
    bat:    { flyer: true, w: 28, h: 20, hp: 1, wake: 175, speed: 155, chase: 2.4, alert: 0.4, stomp: true, dash: true, hitK: 1.4 },
    pigeon: { flyer: true, w: 30, h: 20, hp: 1, speed: 72, dropCD: 2.3, telegraph: 0.32, stomp: true, dash: true, hitK: 1.4 },
    kid:    { walker: true, w: 38, h: 48, hp: 1, speed: 43, chargeMul: 3.2, sight: 250, windup: 0.65, charge: 0.72, recover: 1.0, stomp: true, dash: 'dizzy', minPlatform: 120, hitKW: 1.7, hitKH: 1.5,
              throwNear: 150, throwRange: 380, throwWindup: 0.5, throwCD: 2.0, stoneSpeed: 245 }
  };

  function create(kind, o) {
    const T = Object.assign({}, TYPES[kind]);
    if (o.isBoss) {
      T.w = Math.round(T.w * 1.5); T.h = Math.round(T.h * 1.45);
      T.hp = Math.max(T.hp, o.hp || 4);
      T.minPlatform = Math.min(T.minPlatform || 180, 160);
    }
    const rng = o.rng || Math.random;
    const diff = o.diff || NS.CONFIG.difficulty.normal;
    const f = {
      id: o.id || kind, kind, x: o.x, y: o.y, w: T.w, h: T.h, hp: T.hp, maxHp: T.hp,
      isBoss: !!o.isBoss, bossName: o.bossName || '',
      dir: rng() < 0.5 ? -1 : 1, state: 'patrol', stateT: 0, t: rng() * 6, cool: 0.4 + rng() * 0.8,
      dead: false, deadT: 0, hitCD: 0, flash: 0, seen: false, scene: o.scene ?? -1, region: o.region || 'main',
      spd: (T.speed || 0) * diff.foeSpeed * (o.isBoss ? 1.12 : 1), reaction: diff.reaction, shotMul: diff.shotSpeed, phase: rng() * 6,
      spawn: { x: o.x, y: o.y }
    };
    if (T.walker) {
      f.plat = o.plat;
      f.minX = o.plat.x1 + T.w / 2 + 4;
      f.maxX = o.plat.x2 - T.w / 2 - 4;
      if (f.maxX < f.minX) f.minX = f.maxX = (o.plat.x1 + o.plat.x2) / 2;
      f.x = Math.max(f.minX, Math.min(f.maxX, f.x));
      if (T.stationary) f.state = 'idle';
    } else if (kind === 'bat') {
      f.roostX = o.x; f.roostY = o.y; f.state = 'sleep';
    } else if (kind === 'pigeon') {
      f.lane = o.lane || { x1: o.x - 200, x2: o.x + 200 }; f.baseY = o.y; f.state = 'fly';
    }
    return f;
  }

  /** Caja FÍSICA: caminantes con y = pies; voladores con y = centro. */
  function box(f) {
    if (TYPES[f.kind].walker) return { x1: f.x - f.w / 2, y1: f.y - f.h, x2: f.x + f.w / 2, y2: f.y };
    return { x1: f.x - f.w / 2, y1: f.y - f.h / 2, x2: f.x + f.w / 2, y2: f.y + f.h / 2 };
  }

  /** Caja de COMBATE (mayor): cubre el cuerpo visible del sprite para que
      los golpes de Sofía conecten donde se ve al enemigo. */
  function hitBox(f) {
    const T = TYPES[f.kind];
    if (T.walker) {
      const w = f.w * (T.hitKW || 1.5), top = f.y - f.h * (T.hitKH || 1.8);
      return { x1: f.x - w / 2, y1: top, x2: f.x + w / 2, y2: f.y + 2 };
    }
    const k = T.hitK || 1.35, w = f.w * k, h = f.h * k;
    return { x1: f.x - w / 2, y1: f.y - h / 2, x2: f.x + w / 2, y2: f.y + h / 2 };
  }

  function setState(f, s) { f.state = s; f.stateT = 0; }

  function blockedBySolid(f, W) {
    const b = box(f);
    for (const s of W.solids) {
      if (s.broken || s.open || s.kind === 'wall' || s.kind === 'street' || s.kind === 'roomwall') continue;
      if (b.x1 < s.x2 && b.x2 > s.x1 && b.y1 < s.y2 - 1 && b.y2 > s.y1 + 1) return s;
    }
    return null;
  }

  function walk(f, W, speed, dt) {
    const ox = f.x;
    f.x += f.dir * speed * dt;
    let edge = false;
    if (f.x < f.minX) { f.x = f.minX; edge = true; }
    else if (f.x > f.maxX) { f.x = f.maxX; edge = true; }
    if (blockedBySolid(f, W)) { f.x = ox; edge = true; }
    return edge;
  }

  function samePlatform(f, P) {
    const foot = P.y + P.h / 2;
    return P.ground === f.plat || (Math.abs(foot - f.y) < 30 && P.x > f.plat.x1 - 10 && P.x < f.plat.x2 + 10);
  }

  function updateFoe(f, W, P, dt, ctx, ev) {
    const T = TYPES[f.kind];
    f.t += dt; f.stateT += dt;
    f.cool = Math.max(0, f.cool - dt);
    f.hitCD = Math.max(0, f.hitCD - dt);
    f.blockCD = Math.max(0, (f.blockCD || 0) - dt);
    f.flash = Math.max(0, f.flash - dt);
    const dx = P.x - f.x, adx = Math.abs(dx);
    const visible = ctx.onScreen(f.x, f.y, 30);
    if (visible && !f.seen && !f.dead) { f.seen = true; ev.push({ type: 'foeSeen', foe: f }); }
    if (f.companionT > 0) {
      f.companionT = Math.max(0, f.companionT - dt);
      if (f.companionT > 0) return;
      const resume = f.companionResumeState || (T.stationary ? 'idle' : T.flyer ? (f.kind === 'bat' ? 'return' : 'fly') : 'patrol');
      delete f.companionResumeState;
      setState(f, resume);
    }

      switch (f.kind) {
      case 'rat': {
        if (f.state === 'recoil') { recoil(f, P, dt, ev, 'alert'); break; }
        if (f.state === 'dizzy') { if (f.stateT >= 0.5) setState(f, 'patrol'); break; }
        const alert = samePlatform(f, P) && adx < T.alertRange && !P.dead;
        if (alert && f.state !== 'alert') {
          setState(f, 'alert'); f.dir = Math.sign(dx) || f.dir;
          if (f.isBoss) ev.push({ type: 'foeAlert', foe: f });
        }
        else if (!alert && f.state === 'alert' && f.stateT > 0.6) setState(f, 'patrol');
        if (walk(f, W, f.spd * (f.state === 'alert' ? T.alertMul : 1), dt)) f.dir *= -1;
        break;
      }
      case 'dog':
      case 'bravo':
      case 'kid': {
        if (f.state === 'patrol') {
          if (walk(f, W, f.spd * 0.7, dt)) f.dir *= -1;
          const sameLv = samePlatform(f, P);
          // El niño lanza PIEDRAS a media distancia; de cerca embiste como el perro.
          const canThrow = f.kind === 'kid' && sameLv && visible && !P.dead && f.cool <= 0 &&
            adx >= T.throwNear && adx < T.throwRange && clearLine(W, f.x, f.y - f.h * 0.9, P.x, P.y - 10);
          if (canThrow) {
            f.dir = Math.sign(dx) || f.dir; setState(f, 'aim'); ev.push({ type: 'foeAlert', foe: f });
          } else {
            const sees = sameLv && adx < T.sight && visible && !P.dead && f.cool <= 0 && (Math.sign(dx) === f.dir || adx < 90);
            if (sees) { f.dir = Math.sign(dx) || f.dir; setState(f, 'windup'); ev.push({ type: 'foeAlert', foe: f }); }
          }
        } else if (f.state === 'aim') {
          // Solo el niño entra aquí: amaga y arroja la piedra en arco.
          f.dir = Math.sign(dx) || f.dir;
          if (f.stateT >= (T.throwWindup || 0.5) * f.reaction) {
            const sp = (T.stoneSpeed || 240) * f.shotMul;
            const dyAim = P.y - f.y;
            W.shots.push({ kind: 'stone', x: f.x + f.dir * 14, y: f.y - f.h * 0.95,
              vx: f.dir * sp, vy: -150 + Math.max(-60, Math.min(60, dyAim * 0.18)),
              g: 580, r: 8, life: 3.4, from: f.id, spin: 0 });
            ev.push({ type: 'shoot', foe: f });
            f.cool = (T.throwCD || 2.0) * f.reaction;
            setState(f, 'patrol');
          }
        } else if (f.state === 'windup') {
          if (f.stateT >= T.windup * f.reaction) { setState(f, 'charge'); ev.push({ type: 'foeCharge', foe: f }); }
        } else if (f.state === 'charge') {
          const hitEdge = walk(f, W, f.spd * T.chargeMul, dt);
          if (hitEdge || f.stateT >= T.charge) { setState(f, 'dizzy'); f.cool = 1.4 * f.reaction; }
        } else if (f.state === 'dizzy') {
          if (f.stateT >= T.recover) { setState(f, 'patrol'); f.dir *= -1; }
        } else if (f.state === 'recoil') {
          recoil(f, P, dt, ev, 'windup');
        }
        break;
      }
      case 'chile': {
        if (f.state === 'dizzy') {
          // V50: antes el chile se quedaba congelado para siempre tras el primer golpe.
          if (f.stateT >= 0.9) { setState(f, 'idle'); f.cool = Math.min(f.cool, 0.35); }
          break;
        }
        if (!P.dead) f.dir = Math.sign(dx) || f.dir;
        const inRange = adx < T.range && Math.abs(P.y - (f.y - f.h / 2)) < 170 && visible && !P.dead;
        if (f.state === 'idle') {
          if (inRange && f.cool <= 0 && clearLine(W, f.x, f.y - f.h * 0.55, P.x, P.y)) {
            setState(f, 'aim');
            if (f.isBoss) ev.push({ type: 'foeAlert', foe: f });
          }
        } else if (f.state === 'aim') {
          f.flash = 0.1;
          if (f.stateT >= T.windup * f.reaction) {
            const sp = T.shotSpeed * f.shotMul;
            W.shots.push({ kind: 'seed', x: f.x + f.dir * 12, y: f.y - f.h * 0.55, vx: f.dir * sp, vy: Math.max(-60, Math.min(60, (P.y - f.y) * 0.25)), g: 0, r: 6, life: 3.2, from: f.id });
            ev.push({ type: 'shoot', foe: f });
            f.cool = T.cooldown * f.reaction;
            setState(f, 'idle');
          }
        }
        break;
      }
      case 'bat': {
        const dRoost = Math.hypot(P.x - f.roostX, P.y - f.roostY);
        if (f.state === 'sleep') {
          f.x = f.roostX; f.y = f.roostY;
          if (dRoost < T.wake && f.cool <= 0 && !P.dead) { setState(f, 'alert'); ev.push({ type: 'foeAlert', foe: f }); }
        } else if (f.state === 'alert') {
          f.x = f.roostX + Math.sin(f.t * 40) * 2;
          if (f.stateT >= T.alert * f.reaction) { setState(f, 'swoop'); f.tx = P.x; f.ty = P.y; }
        } else if (f.state === 'swoop') {
          // Persigue con giro limitado: se puede esquivar cambiando de dirección.
          f.tx += (P.x - f.tx) * Math.min(1, dt * 1.6);
          f.ty += (P.y - f.ty) * Math.min(1, dt * 1.6);
          const vx = f.tx - f.x, vy = f.ty - f.y, d = Math.hypot(vx, vy) || 1;
          const sp = f.spd;
          f.x += (vx / d) * sp * dt;
          f.y += (vy / d) * sp * dt + Math.sin(f.t * 9) * 0.6;
          f.dir = Math.sign(vx) || f.dir;
          if (f.stateT >= T.chase || dRoost > 520) setState(f, 'return');
        } else if (f.state === 'dizzy') {
          // Golpeado: retrocede aturdido y vuelve a su percha (antes quedaba congelado en el aire).
          f.y -= 34 * dt; f.x += Math.sin(f.t * 22) * 0.7;
          if (f.stateT >= 0.7) setState(f, 'return');
        } else if (f.state === 'return') {
          const vx = f.roostX - f.x, vy = f.roostY - f.y, d = Math.hypot(vx, vy);
          if (d < 6) { setState(f, 'sleep'); f.cool = 1.6; }
          else { f.x += (vx / d) * f.spd * 0.75 * dt; f.y += (vy / d) * f.spd * 0.75 * dt; f.dir = Math.sign(vx) || f.dir; }
        }
        break;
      }
      case 'pigeon': {
        if (f.state === 'fly') {
          f.x += f.dir * f.spd * dt;
          if (f.x < f.lane.x1) { f.x = f.lane.x1; f.dir = 1; }
          if (f.x > f.lane.x2) { f.x = f.lane.x2; f.dir = -1; }
          f.y = f.baseY + Math.sin(f.t * 2.2 + f.phase) * 8;
          const below = adx < 26 && P.y > f.y && P.y - f.y < 380 && !P.dead && visible;
          if (below && f.cool <= 0) {
            setState(f, 'telegraph');
            if (f.isBoss) ev.push({ type: 'foeAlert', foe: f });
          }
        } else if (f.state === 'dizzy') {
          f.y = f.baseY - 8 * Math.min(1, f.stateT / 0.25) + Math.sin(f.t * 26) * 3;
          if (f.stateT >= 0.7) { setState(f, 'fly'); f.cool = Math.max(f.cool, 0.4); }
        } else if (f.state === 'telegraph') {
          f.y = f.baseY + Math.sin(f.t * 30) * 2;
          if (f.stateT >= T.telegraph * f.reaction) {
            W.shots.push({ kind: 'poop', x: f.x, y: f.y + 8, vx: 0, vy: 40, g: 900, r: 5, life: 2.4, from: f.id });
            ev.push({ type: 'shoot', foe: f });
            f.cool = T.dropCD * f.reaction;
            setState(f, 'fly');
          }
        }
        break;
      }
      default: break;
    }
  }

  /** Línea de tiro: los muros, rejas, cajas y bloques detienen la vista del chile. */
  function clearLine(W, x1, y1, x2, y2) {
    const steps = 8;
    for (const s of W.solids) {
      if (s.broken || s.open) continue;
      for (let i = 1; i < steps; i++) {
        const t = i / steps, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
        if (x > s.x1 && x < s.x2 && y > s.y1 && y < s.y2) return false;
      }
    }
    return true;
  }

  /** Retroceso tras recibir un golpe (jefes que embisten): se aleja de Sofía y contraataca. */
  function recoil(f, P, dt, ev, next) {
    const k = Math.max(0, 1 - f.stateT / 0.38);
    f.x += (f.recoilDir || -f.dir) * 170 * k * dt;
    if (f.minX !== undefined) f.x = Math.max(f.minX, Math.min(f.maxX, f.x));
    if (f.stateT >= 0.38) {
      f.dir = Math.sign(P.x - f.x) || f.dir;
      setState(f, next);
      if (next === 'windup' || next === 'alert') ev.push({ type: 'foeAlert', foe: f });
    }
  }

  function hit(f, how, ev, srcX) {
    if (f.hitCD > 0 || f.dead) return false;
    f.hp -= 1;
    f.hitCD = NS.CONFIG.combat.enemyHitCooldown;
    f.flash = 0.2;
    if (f.hp <= 0) { f.dead = true; f.deadT = 0; ev.push({ type: 'foeKilled', foe: f, how }); }
    else {
      ev.push({ type: 'foeHit', foe: f, how });
      const T = TYPES[f.kind];
      if (f.isBoss && T.walker && !T.stationary) {
        // V50: el jefe ya no se puede "encadenar" a patadas: retrocede, avisa y vuelve a embestir.
        f.recoilDir = srcX !== undefined ? (Math.sign(f.x - srcX) || -f.dir) : -f.dir;
        setState(f, 'recoil');
        f.hitCD = 0.85;
      } else {
        setState(f, 'dizzy');
        f.hitCD = f.isBoss ? 0.8 : 0.5;
      }
    }
    return true;
  }

  /** Jefe que embiste: mientras avisa o embiste bloquea de FRENTE patadas y dash (sin esto se le podía
      encadenar a patadas). Por la espalda (tras saltarlo) o desde arriba sí recibe el golpe. */
  function bossArmored(f, P) {
    const T = TYPES[f.kind];
    if (!(f.isBoss && T.chargeMul && (f.state === 'windup' || f.state === 'charge'))) return false;
    const front = (Math.sign(P.x - f.x) || 1) === (f.dir || 1);
    const above = P.y + P.h / 2 < f.y - f.h * 0.75;
    return front && !above;
  }
  function blockHit(f, P, ev, how) {
    if ((f.blockCD || 0) > 0) return;
    f.blockCD = 0.45;
    const away = -(Math.sign(f.x - P.x) || P.face || 1);
    P.kickT = 0;
    if (how === 'dash') { P.dashT = 0; P.vy = -220; P.noCut = true; }
    P.vx = away * 210;
    ev.push({ type: 'bossBlock', foe: f, how });
  }

  function dashable(f) {
    const d = TYPES[f.kind].dash;
    return d === true || (d === 'dizzy' && f.state === 'dizzy');
  }

  function distract(f, duration = 0.58) {
    if (!f || f.dead || f.isBoss || !TYPES[f.kind] || f.companionT > 0) return false;
    const T = TYPES[f.kind];
    const safe = ['patrol', 'idle', 'sleep', 'fly', 'dizzy', 'return'];
    f.companionResumeState = safe.includes(f.state) ? f.state : (T.stationary ? 'idle' : T.flyer ? (f.kind === 'bat' ? 'return' : 'fly') : 'patrol');
    f.companionT = Math.max(0.12, Math.min(0.9, duration));
    setState(f, 'distracted');
    return true;
  }

  /**
   * Actualiza enemigos y proyectiles activos.
   * ctx: { active(x,y), onScreen(x,y,m), hurt(srcX, srcY, kind) -> bool, hurtbox() -> rect, jumpHeld }
   */
  function update(W, P, dt, ctx, ev) {
    const U = NS.util, CB = NS.CONFIG.combat, PH = NS.CONFIG.phys;
    ev = ev || [];
    const hb = ctx.hurtbox();
    for (const f of W.foes) {
      if (f.dead) { f.deadT += dt; continue; }
      if (!ctx.active(f.x, f.y)) continue;
      updateFoe(f, W, P, dt, ctx, ev);
      if (P.dead || ctx.busy) continue;
      const b = box(f);          // caja física (defensa)
      const hbx = hitBox(f);     // caja de combate (ofensa): cubre el cuerpo visible
      // Patada: alcance algo mayor y contra la caja de combate -> conecta donde se ve.
      const kickBox = P.kickT > 0 ? {
        x1: P.face > 0 ? P.x + P.w * 0.10 : P.x - P.w * 0.10 - 64,
        x2: P.face > 0 ? P.x + P.w * 0.10 + 64 : P.x - P.w * 0.10,
        y1: P.y - 30, y2: P.y + 20
      } : null;
      if (kickBox && U.overlap(hbx, kickBox)) {
        if (bossArmored(f, P)) blockHit(f, P, ev, 'kick');
        else hit(f, 'kick', ev, P.x);
        continue;
      }
      const off = U.overlap(hbx, hb);   // ofensa (dash/pisotón) sobre cuerpo visible
      const def = U.overlap(b, hb);     // contacto defensivo sobre caja física (justo)
      if (!off && !def) continue;
      if (f.hitCD > 0) continue;
      const stomp = off && TYPES[f.kind].stomp && P.vy > 40 && P.prevFoot <= hbx.y1 + CB.stompWindow;
      if (P.dashT > 0 && dashable(f) && off && bossArmored(f, P)) {
        blockHit(f, P, ev, 'dash');
      } else if (P.dashT > 0 && dashable(f) && off) {
        hit(f, 'dash', ev, P.x);
      } else if (stomp) {
        hit(f, 'stomp', ev, P.x);
        P.vy = ctx.jumpHeld ? PH.stompHeldVy : PH.stompVy;
        P.noCut = false;
        P.airDashes = PH.airDashes;
        P.airTopFoot = P.y + P.h / 2;
      } else if (P.dashT > 0 && f.kind === 'bravo' && off) {
        // Choque contra el perro bravo: nadie recibe daño; Sofía sale despedida.
        P.dashT = 0;
        P.vx = -Math.sign(f.x - P.x || P.face) * 260;
        P.vy = -220;
        P.noCut = true;
        f.hitCD = 0.4;
        ev.push({ type: 'clank', foe: f });
      } else if (def) {
        ctx.hurt(f.x, b.y1 + (b.y2 - b.y1) / 2, f.kind);
      }
    }

    // Proyectiles: chocan con sólidos y (si caen) con plataformas; el dash los destruye.
    for (const s of W.shots) {
      const py = s.y;
      s.vy += (s.g || 0) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      for (const so of W.solids) {
        if (so.broken || so.open) continue;
        if (s.x > so.x1 && s.x < so.x2 && s.y > so.y1 && s.y < so.y2) { s.life = 0; ev.push({ type: 'shotHit', shot: s }); break; }
      }
      if (s.life > 0 && s.vy > 0) {
        for (const pl of W.platforms) {
          if (s.x > pl.x1 && s.x < pl.x2 && py <= pl.y && s.y >= pl.y) { s.life = 0; ev.push({ type: 'shotHit', shot: s }); break; }
        }
      }
      if (s.life > 0 && !P.dead && !ctx.busy) {
        const near = s.x + s.r > hb.x1 && s.x - s.r < hb.x2 && s.y + s.r > hb.y1 && s.y - s.r < hb.y2;
        if (near) {
          s.life = 0;
          if (P.dashT > 0) ev.push({ type: 'shotBroken', shot: s });
          else ctx.hurt(s.x - s.vx * 0.05, s.y, s.kind);
        }
      }
    }
    W.shots = W.shots.filter((s) => s.life > 0);
    return ev;
  }

  NS.Enemies = { TYPES, create, update, box, hitBox, hit, dashable, distract, bossArmored };
})(typeof globalThis !== 'undefined' ? globalThis : window);
