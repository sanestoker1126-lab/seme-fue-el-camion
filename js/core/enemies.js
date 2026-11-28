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
    guardian: { walker: true, w: 38, h: 50, hp: 2, speed: 38, chargeMul: 2.55, sight: 205,
      windup: .68, charge: .62, recover: 1.05, stomp: true, dash: 'dizzy', minPlatform: 160,
      hitKW: 1.06, hitKH: 1.06, contactRequiresCharge: true },
    rat:    { walker: true, w: 30, h: 20, hp: 1, speed: 56, alertMul: 1.6, alertRange: 150, stomp: true, dash: true, minPlatform: 90, hitKW: 1.5, hitKH: 1.9 },
    dog:    { walker: true, w: 40, h: 26, hp: 1, speed: 44, chargeMul: 3.6, sight: 230, windup: 0.5, charge: 0.8, recover: 0.75, stomp: true, dash: true, minPlatform: 120, hitKW: 1.8, hitKH: 2.05 },
    bravo:  { walker: true, w: 52, h: 34, hp: 2, speed: 40, chargeMul: 3.8, sight: 280, windup: 0.6, charge: 0.9, recover: 1.1, stomp: true, dash: 'dizzy', minPlatform: 160, hitKW: 1.65, hitKH: 1.95 },
    chile:  { walker: true, stationary: true, w: 22, h: 32, hp: 1, cooldown: 2.6, windup: 0.6, shotSpeed: 200, range: 430, stomp: true, dash: true, minPlatform: 110, hitKW: 1.5, hitKH: 1.35 },
    bat:    { flyer: true, w: 28, h: 20, hp: 1, wake: 175, speed: 155, chase: 2.4, alert: 0.4, stomp: true, dash: true, hitK: 1.4 },
    pigeon: { flyer: true, w: 30, h: 20, hp: 1, speed: 72, dropCD: 2.3, telegraph: 0.32, stomp: true, dash: true, hitK: 1.4 },
    kid:    { walker: true, w: 38, h: 48, hp: 1, speed: 43, chargeMul: 3.2, sight: 250, windup: 0.65, charge: 0.72, recover: 1.0, stomp: true, dash: 'dizzy', minPlatform: 120, hitKW: 1.7, hitKH: 1.5,
              throwNear: 150, throwRange: 380, throwWindup: 0.5, throwCD: 2.0, stoneSpeed: 245 },
    // V57: enemigos propios de submarino/espacio; no reutilizar palomas bajo el agua.
    piranha:{ flyer: true, w: 30, h: 20, hp: 1, speed: 82, sight: 110, contactRequiresCharge: true, windup: 0.46, charge: 0.42, recover: 0.7, chargeMul: 2.15, stomp: true, dash: true, hitK: 1.22 },
    // V58.2: el tiburón ya es enemigo común del mar (Poseidón es el jefe); 3 golpes, vulnerable al dash cuando se marea.
    shark:  { flyer: true, w: 82, h: 36, hp: 3, speed: 78, sight: 220, contactRequiresCharge: true, windup: 0.72, charge: 0.65, recover: 1.0, chargeMul: 2.2, stomp: true, dash: 'dizzy', hitK: 1.12 },
    // V58.2: pulpo (lanza tinta con aviso) y Poseidón, jefe del mar: embiste con el tridente de cerca y lanza olas de lejos.
    pulpo:  { flyer: true, w: 40, h: 34, hp: 2, speed: 40, sight: 300, windup: 0.62, recover: 0.8, shotSpeed: 165, cooldown: 2.6, stomp: true, dash: true, hitK: 1.35 },
    poseidon: { flyer: true, w: 92, h: 110, hp: 8, speed: 76, sight: 500, contactRequiresCharge: true, windup: 0.95, charge: 0.72, recover: 1.65, chargeMul: 2.8,
              shotSpeed: 175, cooldown: 2.2, stomp: true, dash: 'dizzy', hitK: 1.2 },
    drone:  { flyer: true, w: 34, h: 28, hp: 1, speed: 73, sight: 350, windup: 0.64, recover: 0.7, shotSpeed: 205, cooldown: 2.4, stomp: true, dash: true, hitK: 1.9 },
    // V58: cangrejo de las ruinas (patrulla de lado y se apura al verte) y robot de la estación (embiste como el perro).
    crab:   { walker: true, w: 34, h: 20, hp: 1, speed: 62, alertMul: 1.7, alertRange: 170, stomp: true, dash: true, minPlatform: 100, hitKW: 1.45, hitKH: 1.8 },
    robot:  { walker: true, w: 36, h: 40, hp: 2, speed: 46, chargeMul: 3.4, sight: 250, windup: 0.6, charge: 0.75, recover: 0.95, stomp: true, dash: 'dizzy', minPlatform: 130, hitKW: 1.5, hitKH: 1.35 },
    // V58.7 · Enemigos de las zonas secretas (paquete «enemigos secretos»). Todos avisan antes de atacar.
    // Pulpito: de cerca se encoge y lanza un tentetazo corto (solo lastima durante ese golpe); de lejos, tinta.
    pulpito: { flyer: true, w: 34, h: 30, hp: 2, speed: 46, sight: 290, near: 125, windup: 0.55, charge: 0.4, chargeMul: 2.7, recover: 0.85,
               shotSpeed: 150, cooldown: 2.4, contactRequiresCharge: true, stomp: true, dash: true, hitK: 1.45 },
    // Niño buzo: nada en su carril y arroja piedras que se hunden un poco (no embiste: tocarlo no lastima).
    buzito:  { flyer: true, w: 30, h: 36, hp: 1, speed: 52, sight: 330, windup: 0.6, recover: 0.6, shotSpeed: 185, cooldown: 2.3,
               contactRequiresCharge: true, stomp: true, dash: true, hitK: 1.45 },
    // Marciano: camina y dispara un orbe de plasma hacia donde estabas cuando empezó a cargar (se puede esquivar).
    marciano: { walker: true, w: 30, h: 46, hp: 2, speed: 40, range: 390, windup: 0.62, shotSpeed: 205, cooldown: 2.4, stomp: true, dash: true,
                minPlatform: 110, hitKW: 1.6, hitKH: 1.12 },
    // Niño astronauta: la conducta del niño de las piedras (piedra lunar en arco de lejos, embestida de cerca).
    astronino: { walker: true, w: 34, h: 44, hp: 1, speed: 43, chargeMul: 3.0, sight: 240, windup: 0.62, charge: 0.7, recover: 1.0, stomp: true,
                 dash: 'dizzy', minPlatform: 110, hitKW: 1.6, hitKH: 1.2, throwNear: 140, throwRange: 360, throwWindup: 0.55, throwCD: 2.2,
                 stoneSpeed: 235, shot: 'roca' },
    // V58.7 · El Maestro Enojón (jefe de la escuela): levanta la regla y embiste; de lejos lanza libros (en arco) y
    // borradores (rectos); enojado (media vida) grita y manda dos ondas por el piso que se saltan.
    maestro: { walker: true, w: 36, h: 52, hp: 6, speed: 44, chargeMul: 3.1, sight: 300, windup: 0.7, charge: 0.72, recover: 1.15, stomp: true,
               dash: 'dizzy', minPlatform: 160, hitKW: 1.45, hitKH: 1.1, throwNear: 160, throwRange: 440, throwWindup: 0.6, throwCD: 2.0,
               stoneSpeed: 250, shoutWindup: 0.75, shoutSpeed: 230, shoutCD: 6.5 },
    // V58.7 · El Pulpo del Abismo (jefe de la zona secreta del mar): embiste con los tentáculos de cerca y de lejos
    // alterna un abanico de tinta y un chorro de agua. Solo lastima al contacto durante la embestida.
    pulpo_abismo: { flyer: true, w: 54, h: 46, hp: 8, speed: 64, sight: 460, near: 210, windup: 0.8, charge: 0.62, recover: 1.15, chargeMul: 2.5,
                    shotSpeed: 155, jetSpeed: 265, cooldown: 2.1, contactRequiresCharge: true, stomp: true, dash: 'dizzy', hitK: 1.2 }
  };
  // V58: los peces solo existen en su estanque; ahí Sofía sí los alcanza (y ellos a ella) aunque esté buceando.
  const AQUATIC = new Set(['piranha', 'shark', 'pulpo', 'poseidon', 'pulpito', 'buzito', 'pulpo_abismo']);
  // Voladores que patrullan un carril (los demás: el murciélago cuelga de su percha y la paloma tiene su ruta).
  const LANE_FLYERS = new Set(['piranha', 'shark', 'drone', 'pulpo', 'poseidon', 'pulpito', 'buzito', 'pulpo_abismo']);

  // V58.8.28: el marciano usa siempre el arte nuevo (tira aportada de 15 cuadros); conducta sin cambios.
  const DEFAULT_SKIN = { marciano: 'marciano_v2' };
  function create(kind, o) {
    const T = Object.assign({}, TYPES[kind]);
    // V58.8.28 · Arte alterno (paquete «enemigos secretos extra»): misma conducta del tipo base, otro aspecto y algo
    // más de resistencia (`hpBonus`). Ver js/app/art_extra.js.
    if (o.hpBonus) T.hp += o.hpBonus;
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
      spawn: { x: o.x, y: o.y }, skin: o.skin || DEFAULT_SKIN[kind] || null
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
    else if (LANE_FLYERS.has(kind)) {
      f.lane = o.lane || { x1: o.x - 150, x2: o.x + 150 };
      f.baseY = o.y;
      f.waterZone = o.waterZone || null;
      f.state = 'fly';
      // Empieza moviéndose lateralmente; ningún ataque sorpresa al aparecer.
      f.cool = Math.max(0.7, f.cool);
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
      case 'crab':
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
      case 'robot':
      case 'astronino':
      case 'guardian':
      case 'kid': {
        if (f.state === 'patrol') {
          if (walk(f, W, f.spd * 0.7, dt)) f.dir *= -1;
          const sameLv = samePlatform(f, P);
          // El niño (y el niño astronauta, V58.7) lanza PIEDRAS a media distancia; de cerca embiste como el perro.
          const canThrow = !!T.throwRange && sameLv && visible && !P.dead && f.cool <= 0 &&
            adx >= T.throwNear && adx < T.throwRange && clearLine(W, f.x, f.y - f.h * 0.9, P.x, P.y - 10);
          if (canThrow) {
            f.dir = Math.sign(dx) || f.dir; setState(f, 'aim'); ev.push({ type: 'foeAlert', foe: f });
          } else {
            const sees = sameLv && adx < T.sight && visible && !P.dead && f.cool <= 0 && (Math.sign(dx) === f.dir || adx < 90);
            if (sees) { f.dir = Math.sign(dx) || f.dir; setState(f, 'windup'); ev.push({ type: 'foeAlert', foe: f }); }
          }
        } else if (f.state === 'aim') {
          // Solo los niños entran aquí: amagan y arrojan la piedra en arco.
          f.dir = Math.sign(dx) || f.dir;
          if (f.stateT >= (T.throwWindup || 0.5) * f.reaction) {
            const sp = (T.stoneSpeed || 240) * f.shotMul;
            const dyAim = P.y - f.y;
            W.shots.push({ kind: T.shot || 'stone', x: f.x + f.dir * 14, y: f.y - f.h * 0.95,
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
      case 'piranha':
      case 'shark': {
        const z = f.waterZone;
        // No atacan a Sofía desde fuera del agua: solo reaccionan al mismo estanque.
        const swimming = z && P.water === z && !P.dead;
        const safeX1 = z ? z.x1 + f.w * 0.52 + 4 : f.lane.x1;
        const safeX2 = z ? z.x2 - f.w * 0.52 - 4 : f.lane.x2;
        if (f.state === 'fly') {
          f.x += f.dir * f.spd * dt;
          if (f.x <= safeX1) { f.x = safeX1; f.dir = 1; }
          if (f.x >= safeX2) { f.x = safeX2; f.dir = -1; }
          f.y = f.baseY + Math.sin(f.t * 2.5 + f.phase) * 4;
          if (swimming && f.cool <= 0 && visible && adx < T.sight && Math.abs(P.y - f.y) < 100) {
            f.dir = Math.sign(dx) || f.dir;
            setState(f, 'windup'); ev.push({ type: 'foeAlert', foe: f });
          }
        } else if (f.state === 'windup') {
          // Aviso visual completo antes de cualquier embestida.
          if (f.stateT >= T.windup * f.reaction) {
            f.aimY = swimming ? P.y : f.baseY;
            setState(f, 'charge');
            ev.push({ type: 'foeCharge', foe: f });
          }
        } else if (f.state === 'charge') {
          const minY = z ? z.y + f.h / 2 + 8 : f.baseY - 30;
          const maxY = z ? z.y2 - f.h / 2 - 8 : f.baseY + 30;
          f.x = Math.max(safeX1, Math.min(safeX2, f.x + f.dir * f.spd * T.chargeMul * dt));
          f.y += Math.max(-f.spd * dt, Math.min(f.spd * dt, (f.aimY || f.baseY) - f.y));
          f.y = Math.max(minY, Math.min(maxY, f.y));
          if (f.stateT >= T.charge || f.x === safeX1 || f.x === safeX2) {
            f.cool = (f.kind === 'shark' ? 1.8 : 1.5) * f.reaction;
            setState(f, 'dizzy');
          }
        } else if (f.state === 'dizzy') {
          // Ventana de contraataque visible: el tiburón es vulnerable al DASH.
          f.y = f.baseY + Math.sin(f.t * 9) * 2;
          if (f.stateT >= T.recover * f.reaction) setState(f, 'fly');
        }
        break;
      }
      case 'pulpo': {
        // Flota en su carril; si Sofía nada en su mar y la ve, avisa (se infla) y lanza tinta hacia donde estaba.
        const z = f.waterZone, swimming = z && P.water === z && !P.dead;
        if (f.state === 'fly') {
          f.x += f.dir * f.spd * dt;
          if (f.x < f.lane.x1) { f.x = f.lane.x1; f.dir = 1; }
          if (f.x > f.lane.x2) { f.x = f.lane.x2; f.dir = -1; }
          f.y = f.baseY + Math.sin(f.t * 1.7 + f.phase) * 10;
          if (swimming && visible && f.cool <= 0 && adx < T.sight && Math.abs(P.y - f.y) < 220) {
            f.targetX = P.x; f.targetY = P.y; f.dir = Math.sign(dx) || f.dir;
            setState(f, 'aim'); ev.push({ type: 'foeAlert', foe: f });
          }
        } else if (f.state === 'aim') {
          if (f.stateT >= T.windup * f.reaction) {
            const vx = f.targetX - f.x, vy = f.targetY - f.y, dist = Math.hypot(vx, vy) || 1, sp = T.shotSpeed * f.shotMul;
            W.shots.push({ kind: 'ink', x: f.x + f.dir * 12, y: f.y + 4, vx: vx / dist * sp, vy: vy / dist * sp, g: 0, r: 9, life: 2.6, from: f.id, skin: f.skin });
            ev.push({ type: 'shoot', foe: f });
            f.cool = T.cooldown * f.reaction; setState(f, 'fly');
          }
        } else if (f.state === 'dizzy') {
          f.y = f.baseY + Math.sin(f.t * 9) * 2;
          if (f.stateT >= T.recover * f.reaction) setState(f, 'fly');
        }
        break;
      }
      case 'poseidon': {
        // Jefe del mar. Patrulla sobre la arena de salida; de cerca avisa y embiste con el tridente (después queda
        // mareado: momento de contraatacar); de lejos levanta el tridente y lanza una ola. Siempre con aviso.
        const z = f.waterZone, swimming = z && P.water === z && !P.dead;
        const minY = f.arenaBounds?.top ?? (z ? z.y + f.h / 2 + 8 : f.baseY - 60), maxY = f.arenaBounds?.bottom ?? (z ? z.y2 - f.h / 2 - 8 : f.baseY + 60);
        if (f.state === 'fly') {
          f.x += f.dir * f.spd * 0.7 * dt;
          if (f.x < f.lane.x1) { f.x = f.lane.x1; f.dir = 1; }
          if (f.x > f.lane.x2) { f.x = f.lane.x2; f.dir = -1; }
          const targetY=swimming&&visible?Math.max(minY,Math.min(maxY,P.y)):f.baseY;
          f.y += (targetY + Math.sin(f.t * 1.4 + f.phase) * 9 - f.y) * Math.min(1, dt * 0.9);
          f.y=Math.max(minY,Math.min(maxY,f.y));
          if (swimming && visible && f.cool <= 0 && adx < T.sight && Math.abs(P.y - f.y) < 260) {
            f.dir = Math.sign(dx) || f.dir;
            f.targetX = P.x; f.targetY = P.y;
            setState(f, adx < 190 && Math.abs(P.y - f.y) < 110 ? 'windup' : 'aim');
            ev.push({ type: 'foeAlert', foe: f });
          }
        } else if (f.state === 'windup') {
          if (f.stateT >= T.windup * f.reaction) { f.aimY = f.targetY ?? f.baseY; setState(f, 'charge'); ev.push({ type: 'foeCharge', foe: f }); }
        } else if (f.state === 'charge') {
          f.x = Math.max(f.lane.x1, Math.min(f.lane.x2, f.x + f.dir * f.spd * T.chargeMul * dt));
          f.y = Math.max(minY, Math.min(maxY, f.y + Math.max(-f.spd * dt, Math.min(f.spd * dt, (f.aimY || f.baseY) - f.y))));
          if (f.stateT >= T.charge || f.x === f.lane.x1 || f.x === f.lane.x2) { f.cool = 1.6 * f.reaction; setState(f, 'dizzy'); }
        } else if (f.state === 'aim') {
          if (f.stateT >= T.windup * 1.1 * f.reaction) {
            const vx = f.targetX - f.x, vy = f.targetY - f.y, dist = Math.hypot(vx, vy) || 1, sp = T.shotSpeed * f.shotMul;
            W.shots.push({ kind: 'tide', x: f.x + f.dir * 24, y: f.y - 6, vx: vx / dist * sp, vy: vy / dist * sp, g: 0, r: 14, life: 2.8, from: f.id });
            ev.push({ type: 'shoot', foe: f });
            f.cool = T.cooldown * f.reaction; setState(f, 'dizzy');
          }
        } else if (f.state === 'dizzy') {
          f.y = Math.max(minY,Math.min(maxY,f.y + Math.sin(f.t * 9) * 0.4));
          if (f.stateT >= T.recover * f.reaction) setState(f, 'fly');
        }
        break;
      }
      case 'drone': {
        if (f.state === 'fly') {
          f.x += f.dir * f.spd * 0.7 * dt;
          if (f.x < f.lane.x1) { f.x = f.lane.x1; f.dir = 1; }
          if (f.x > f.lane.x2) { f.x = f.lane.x2; f.dir = -1; }
          f.y = f.baseY + Math.sin(f.t * 2 + f.phase) * 8;
          if (!P.dead && visible && f.cool <= 0 && Math.abs(P.x - f.x) < T.sight &&
              Math.abs(P.y - f.y) < 240 && clearLine(W, f.x, f.y, P.x, P.y)) {
            f.targetX = P.x; f.targetY = P.y;
            f.dir = Math.sign(dx) || f.dir;
            setState(f, 'aim'); ev.push({ type: 'foeAlert', foe: f });
          }
        } else if (f.state === 'aim') {
          // Apuntado fijo: el jugador puede esquivar después del aviso.
          if (f.stateT >= T.windup * f.reaction) {
            const vx = f.targetX - f.x, vy = f.targetY - f.y;
            const dist = Math.hypot(vx, vy) || 1;
            const speed = T.shotSpeed * f.shotMul;
            W.shots.push({ kind: 'plasma', skin: f.skin, x: f.x + f.dir * 13, y: f.y,
              vx: vx / dist * speed, vy: vy / dist * speed,
              g: 0, r: 7, life: 2.4, from: f.id });
            ev.push({ type: 'shoot', foe: f });
            f.cool = T.cooldown * f.reaction;
            setState(f, 'fly');
          }
        } else if (f.state === 'dizzy') {
          f.y = f.baseY + Math.sin(f.t * 18) * 3;
          if (f.stateT >= T.recover) { f.cool = Math.max(f.cool, 0.6); setState(f, 'fly'); }
        }
        break;
      }
      /* ---------- V58.7 · Zonas secretas y jefes nuevos ---------- */
      case 'marciano': {
        // Camina; si Sofía está a tiro y a su altura, se detiene a cargar (aviso) y dispara un orbe hacia donde ella
        // estaba al empezar la carga. Jefe enojado: dos orbes en abanico.
        f.shotT = Math.max(0, (f.shotT || 0) - dt);
        if (f.state === 'recoil') { recoil(f, P, dt, ev, 'patrol'); break; }
        if (f.state === 'dizzy') { if (f.stateT >= 0.7 * f.reaction) setState(f, 'patrol'); break; }
        if (f.state === 'patrol') {
          if (walk(f, W, f.spd * 0.6, dt)) f.dir *= -1;
          const eyeY = f.y - f.h * 0.62;
          const inRange = !P.dead && visible && adx < T.range && Math.abs(P.y - eyeY) < 170;
          if (inRange && f.cool <= 0 && clearLine(W, f.x, eyeY, P.x, P.y)) {
            f.dir = Math.sign(dx) || f.dir; f.targetX = P.x; f.targetY = P.y;
            setState(f, 'aim'); ev.push({ type: 'foeAlert', foe: f });
          }
        } else if (f.state === 'aim') {
          if (f.stateT >= T.windup * f.reaction) {
            const sx = f.x + f.dir * f.w * 0.75, sy = f.y - f.h * 0.6;
            const spread = f.isBoss && f.enraged ? [-0.17, 0.17] : [0];
            for (const a of spread) aimedShot(W, f, 'orbe', sx, sy, f.targetX, f.targetY, T.shotSpeed * f.shotMul, 7, a);
            ev.push({ type: 'shoot', foe: f });
            f.shotT = 0.32;
            f.cool = T.cooldown * f.reaction * (f.isBoss ? 0.8 : 1);
            setState(f, 'patrol');
          }
        }
        break;
      }
      case 'pulpito': {
        const z = f.waterZone, swimming = z && P.water === z && !P.dead;
        const minY = z ? z.y + f.h / 2 + 8 : f.baseY - 40, maxY = z ? z.y2 - f.h / 2 - 8 : f.baseY + 40;
        if (f.state === 'fly') {
          laneSwim(f, dt, 1);
          f.y += (f.baseY + Math.sin(f.t * 1.7 + f.phase) * 10 - f.y) * Math.min(1, dt * 3);
          if (swimming && visible && f.cool <= 0 && adx < T.sight && Math.abs(P.y - f.y) < 200) {
            f.dir = Math.sign(dx) || f.dir;
            if (adx < T.near && Math.abs(P.y - f.y) < 80) setState(f, 'windup');
            else { f.targetX = P.x; f.targetY = P.y; setState(f, 'aim'); }
            ev.push({ type: 'foeAlert', foe: f });
          }
        } else if (f.state === 'windup') {
          if (f.stateT >= T.windup * f.reaction) { f.aimY = swimming ? P.y : f.y; setState(f, 'charge'); ev.push({ type: 'foeCharge', foe: f }); }
        } else if (f.state === 'charge') {
          f.x = Math.max(f.lane.x1, Math.min(f.lane.x2, f.x + f.dir * f.spd * T.chargeMul * dt));
          f.y = Math.max(minY, Math.min(maxY, f.y + Math.max(-f.spd * dt, Math.min(f.spd * dt, f.aimY - f.y))));
          if (f.stateT >= T.charge || f.x === f.lane.x1 || f.x === f.lane.x2) { f.cool = 1.5 * f.reaction; setState(f, 'dizzy'); }
        } else if (f.state === 'aim') {
          if (f.stateT >= T.windup * 1.1 * f.reaction) {
            aimedShot(W, f, 'tinta', f.x + f.dir * 12, f.y + 2, f.targetX, f.targetY, T.shotSpeed * f.shotMul, 9, 0);
            ev.push({ type: 'shoot', foe: f });
            f.cool = T.cooldown * f.reaction; setState(f, 'fly');
          }
        } else if (f.state === 'dizzy') {
          f.y += Math.sin(f.t * 9) * 0.4;
          if (f.stateT >= T.recover * f.reaction) setState(f, 'fly');
        }
        break;
      }
      case 'buzito': {
        const z = f.waterZone, swimming = z && P.water === z && !P.dead;
        if (f.state === 'fly') {
          laneSwim(f, dt, 1);
          f.y += (f.baseY + Math.sin(f.t * 2.1 + f.phase) * 8 - f.y) * Math.min(1, dt * 3);
          if (swimming && visible && f.cool <= 0 && adx < T.sight && Math.abs(P.y - f.y) < 220) {
            f.dir = Math.sign(dx) || f.dir; f.targetX = P.x; f.targetY = P.y;
            setState(f, 'aim'); ev.push({ type: 'foeAlert', foe: f });
          }
        } else if (f.state === 'aim') {
          f.dir = Math.sign(f.targetX - f.x) || f.dir;
          if (f.stateT >= T.windup * f.reaction) {
            // Bajo el agua la piedra va casi recta y se hunde poco a poco.
            aimedShot(W, f, 'piedra_mar', f.x + f.dir * 14, f.y - 6, f.targetX, f.targetY, T.shotSpeed * f.shotMul, 7, 0, { g: 70 });
            ev.push({ type: 'shoot', foe: f });
            f.cool = T.cooldown * f.reaction; setState(f, 'fly');
          }
        } else if (f.state === 'dizzy') {
          f.y += Math.sin(f.t * 9) * 0.4;
          if (f.stateT >= T.recover * f.reaction) setState(f, 'fly');
        }
        break;
      }
      case 'maestro': {
        f.shoutCD = Math.max(0, (f.shoutCD || 0) - dt);
        if (f.state === 'recoil') { recoil(f, P, dt, ev, 'windup'); break; }
        if (f.state === 'patrol') {
          if (walk(f, W, f.spd * (f.enraged ? 0.85 : 0.7), dt)) f.dir *= -1;
          const sameLv = samePlatform(f, P), ready = sameLv && visible && !P.dead && f.cool <= 0;
          if (ready && f.enraged && f.shoutCD <= 0 && adx < 380) {
            // Enojado: grita (aviso largo) y manda dos ondas por el piso.
            f.dir = Math.sign(dx) || f.dir; f.shoutCD = T.shoutCD; setState(f, 'shout'); ev.push({ type: 'foeAlert', foe: f });
          } else if (ready && adx >= T.throwNear && adx < T.throwRange && clearLine(W, f.x, f.y - f.h * 0.9, P.x, P.y - 10)) {
            f.dir = Math.sign(dx) || f.dir;
            f.throwKind = f.throwKind === 'libro' ? 'borrador' : 'libro';   // alterna libro y borrador
            setState(f, 'aim'); ev.push({ type: 'foeAlert', foe: f });
          } else if (ready && adx < T.sight && (Math.sign(dx) === f.dir || adx < 90)) {
            f.dir = Math.sign(dx) || f.dir; setState(f, 'windup'); ev.push({ type: 'foeAlert', foe: f });
          }
        } else if (f.state === 'aim') {
          f.dir = Math.sign(dx) || f.dir;
          if (f.stateT >= T.throwWindup * f.reaction) {
            const sp = T.stoneSpeed * f.shotMul, hx = f.x + f.dir * 16, hy = f.y - f.h * 0.82;
            if (f.throwKind === 'borrador') aimedShot(W, f, 'borrador', hx, hy, P.x, P.y - 8, sp * 1.18, 8, 0);
            else W.shots.push({ kind: 'libro', x: hx, y: hy, vx: f.dir * sp, vy: -170 + Math.max(-60, Math.min(60, (P.y - f.y) * 0.18)),
              g: 560, r: 9, life: 3.4, from: f.id });
            ev.push({ type: 'shoot', foe: f });
            f.cool = T.throwCD * f.reaction; setState(f, 'patrol');
          }
        } else if (f.state === 'shout') {
          if (f.stateT >= T.shoutWindup * f.reaction) {
            const pl = f.plat, y = f.y - 13, sp = T.shoutSpeed * f.shotMul;
            for (const d of [-1, 1]) {
              W.shots.push({ kind: 'grito', x: f.x + d * f.w * 0.6, y, vx: d * sp, vy: 0, g: 0, r: 12, life: 2.4, from: f.id,
                minX: pl ? pl.x1 : -Infinity, maxX: pl ? pl.x2 : Infinity });
            }
            ev.push({ type: 'shoot', foe: f });
            f.cool = 1.1 * f.reaction; setState(f, 'patrol');
          }
        } else if (f.state === 'windup') {
          if (f.stateT >= T.windup * f.reaction) { setState(f, 'charge'); ev.push({ type: 'foeCharge', foe: f }); }
        } else if (f.state === 'charge') {
          const hitEdge = walk(f, W, f.spd * T.chargeMul, dt);
          if (hitEdge || f.stateT >= T.charge) { setState(f, 'dizzy'); f.cool = 1.4 * f.reaction; }
        } else if (f.state === 'dizzy') {
          if (f.stateT >= T.recover) { setState(f, 'patrol'); f.dir *= -1; }
        }
        break;
      }
      case 'pulpo_abismo': {
        const z = f.waterZone, swimming = z && P.water === z && !P.dead;
        const minY = z ? z.y + f.h / 2 + 8 : f.baseY - 60, maxY = z ? z.y2 - f.h / 2 - 8 : f.baseY + 60;
        if (f.state === 'fly') {
          laneSwim(f, dt, f.enraged ? 0.95 : 0.75);
          f.y += (f.baseY + Math.sin(f.t * 1.3 + f.phase) * 16 - f.y) * Math.min(1, dt * 2.5);
          if (swimming && visible && f.cool <= 0 && adx < T.sight && Math.abs(P.y - f.y) < 300) {
            f.dir = Math.sign(dx) || f.dir; f.targetX = P.x; f.targetY = P.y;
            if (adx < T.near && Math.abs(P.y - f.y) < 120) setState(f, 'windup');
            else { f.shotKind = f.shotKind === 'tinta' ? 'chorro' : 'tinta'; setState(f, 'aim'); }
            ev.push({ type: 'foeAlert', foe: f });
          }
        } else if (f.state === 'windup') {
          if (f.stateT >= T.windup * f.reaction) { f.aimY = swimming ? P.y : f.baseY; setState(f, 'charge'); ev.push({ type: 'foeCharge', foe: f }); }
        } else if (f.state === 'charge') {
          f.x = Math.max(f.lane.x1, Math.min(f.lane.x2, f.x + f.dir * f.spd * T.chargeMul * dt));
          f.y = Math.max(minY, Math.min(maxY, f.y + Math.max(-f.spd * dt, Math.min(f.spd * dt, f.aimY - f.y))));
          if (f.stateT >= T.charge || f.x === f.lane.x1 || f.x === f.lane.x2) { f.cool = 1.6 * f.reaction; setState(f, 'dizzy'); }
        } else if (f.state === 'aim') {
          if (f.stateT >= T.windup * 1.1 * f.reaction) {
            const sx = f.x + f.dir * f.w * 0.5, sy = f.y;
            if (f.shotKind === 'chorro') aimedShot(W, f, 'chorro', sx, sy, f.targetX, f.targetY, T.jetSpeed * f.shotMul, 11, 0);
            else for (const a of f.enraged ? [-0.42, -0.21, 0, 0.21, 0.42] : [-0.24, 0, 0.24]) aimedShot(W, f, 'tinta', sx, sy, f.targetX, f.targetY, T.shotSpeed * f.shotMul, 10, a);
            ev.push({ type: 'shoot', foe: f });
            f.cool = T.cooldown * f.reaction; setState(f, 'fly');
          }
        } else if (f.state === 'dizzy') {
          f.y += Math.sin(f.t * 9) * 0.4;
          if (f.stateT >= T.recover * f.reaction) setState(f, 'fly');
        }
        break;
      }
      default: break;
    }
  }

  /** V58.7 · Disparo dirigido a (tx, ty) con un giro opcional (abanicos), velocidad `sp` y radio `r`. */
  function aimedShot(W, f, kind, x, y, tx, ty, sp, r, turn = 0, extra = null) {
    const a = Math.atan2((Number.isFinite(ty) ? ty : y) - y, (Number.isFinite(tx) ? tx : x + f.dir * 50) - x) + turn;
    W.shots.push(Object.assign({ kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0, r, life: 2.8, from: f.id }, extra || {}));
  }

  /** V58.7 · Nado de carril: avanza y da la vuelta en los extremos. */
  function laneSwim(f, dt, mul) {
    f.x += f.dir * f.spd * mul * dt;
    if (f.x < f.lane.x1) { f.x = f.lane.x1; f.dir = 1; }
    if (f.x > f.lane.x2) { f.x = f.lane.x2; f.dir = -1; }
  }

  const inZone = (z, x, y) => !!z && x >= z.x1 && x <= z.x2 && y > z.y && y < z.y2;

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
    // V56 · Segunda fase moderada del jefe. No añade ataques invisibles ni
    // altera la ventana de aviso: solo acelera un 10 % el desplazamiento.
    // Se anuncia una sola vez al pasar la mitad de vida.
    if (f.isBoss && f.hp > 0 && !f.enraged && f.hp <= Math.floor(f.maxHp / 2)) {
      f.enraged = true;
      f.spd *= 1.10;
      ev.push({ type: 'bossPhase', foe: f });
    }
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
    const hbAll = ctx.hurtbox();
    const body = ctx.bodybox ? ctx.bodybox() : hbAll;
    for (const f of W.foes) {
      if (f.dead) { f.deadT += dt; continue; }
      if ((ctx.region && ctx.region !== f.region) || !ctx.active(f.x, f.y)) continue;
      updateFoe(f, W, P, dt, ctx, ev);
      if (P.dead || ctx.busy) continue;
      // Sumergida, Sofía queda fuera del alcance de lo que vive en tierra, pero no del pez de su propio estanque.
      // V58.2: ni de quien vive DENTRO de su mismo mar abierto (cangrejos y niños buzos en repisas sumergidas).
      // En pozas y lagos sigue la regla de V52: bucear esquiva a lo que vive en tierra.
      const hb = P.water && ((AQUATIC.has(f.kind) && f.waterZone === P.water) || (P.water.sea && f.plat && f.plat.underwater && inZone(P.water, f.x, f.y - f.h / 2))) ? body : hbAll;
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
      } else if (def && (!TYPES[f.kind].contactRequiresCharge ||
        (f.state === 'charge' && (!AQUATIC.has(f.kind) || P.water === f.waterZone)))) {
        // V57: peces ofensivos SOLO cuando Sofía comparte su estanque
        // y la embestida ya se anunció. Dash y pisotón siguen funcionando.
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
      // V58.7: las ondas del grito del maestro corren por su piso y se acaban en la orilla.
      if (s.minX !== undefined && (s.x < s.minX || s.x > s.maxX)) { s.life = 0; continue; }
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
        const hb = P.water && P.water.sea && inZone(P.water, s.x, s.y) ? body : hbAll;   // V58.2: proyectil dentro de su mismo mar abierto
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
