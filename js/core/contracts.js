/* ¡Se me fue el camión! — CONTRATOS DE TRAMO (V58.8.24).
   Cada tramo es una misión: un objetivo PRINCIPAL (obligatorio: sin cumplirlo, el tramo no se supera), un objetivo
   OPCIONAL (medalla) y, en varios tramos, un EFECTO que cambia la forma de jugar:
     noche   → solo se ve alrededor de Sofía (linterna).
     lluvia  → el piso moja: arrancar y frenar cuesta más.
     viento  → ráfagas anunciadas empujan a Sofía de lado.
   Tipos de objetivo:
     jefe        vence al jefe del tramo.
     caceria     derrota N enemigos del tramo.
     cristales   junta N cristales del tramo.
     objeto      recupera el objeto de la mochila escondido en la zona oculta del tramo.
     contrarreloj llega a la parada siguiente antes de que se acabe el tiempo.
   Opcionales: intacto (sin recibir daño), gatas (N derribos con el botón GATAS), cristales N, rapido (antes de T s),
   secreto (encuentra la zona secreta).
   La historia de cada contrato (`why`) une los tramos: Sofía lleva las seis llaves USB que Estoker necesita, Los
   Zopilotes —la banda que luego la persigue en la Calzada— ofrecen recompensa por «la niña de la mochila» y la
   Ruta 6 sigue avanzando delante de ella.
   Lógica pura y sin DOM: Game crea el contrato al entrar a un tramo y le pasa los sucesos (derribos, cristales,
   objeto, daño, tiempo). Los números N se ajustan a lo que queda delante del punto de salida, así un reintento desde
   la parada intermedia siempre puede cumplirse. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};

  const PLAN = {
    // MISIÓN 1 · LA ESCUELA
    escuela: { main: { type: 'jefe' }, bonus: { type: 'gatas', n: 1 }, mod: null,
      why: 'El perro de la azotea está asustado por la posada y no deja bajar a nadie. Cálmalo para abrir la escalera.' },
    escuela_vecina: { main: { type: 'jefe' }, bonus: { type: 'intacto' }, mod: null,
      why: 'El Chile de la secundaria vigila el patio. Mientras no lo venzas, el portón de la cancha sigue cerrado.' },
    escuela_ruinas: { main: { type: 'jefe' }, bonus: { type: 'cristales', n: 40 }, mod: 'lluvia',
      why: 'Llueve y el piso de los pasillos moja. El Maestro Enojón no te deja subir al camión sin pelear.' },
    // MISIÓN 2 · GUADALAJARA
    guadalajara: { main: { type: 'jefe' }, bonus: { type: 'intacto' }, mod: null,
      why: 'El dueño del perro cree que tú lo asustaste. Vence su reto y te dirá por dónde se fue la Ruta 6.' },
    gdl_noche: { main: { type: 'objeto' }, bonus: { type: 'cristales', n: 30 }, mod: 'noche',
      why: 'Se fue la luz en la colonia. Tus audífonos —con la llave USB 4— cayeron a la alcantarilla: bájate por ellos.' },
    azoteas: { main: { type: 'objeto' }, bonus: { type: 'intacto' }, mod: 'viento',
      why: 'El viento sopla fuerte entre los tinacos. El suéter de la posada, con la llave USB 5, quedó en la alcantarilla.' },
    centro_historico: { main: { type: 'caceria', n: 6 }, bonus: { type: 'gatas', n: 2 }, mod: null,
      why: 'Los Zopilotes soltaron a sus «vigías» por el centro. Ahuyenta a seis para que no le avisen a la banda.' },
    portales: { main: { type: 'contrarreloj', t: 55 }, bonus: { type: 'cristales', n: 25 }, mod: null,
      why: 'La Ruta 6 está rodeando la plaza. Si cruzas los portales a tiempo, la alcanzas en la siguiente esquina.' },
    zapopan: { main: { type: 'jefe' }, bonus: { type: 'intacto' }, mod: 'noche',
      why: 'Noche cerrada en Zapopan. El Perro Bravo cuida la plaza de la Basílica: sin vencerlo no hay paso.' },
    arcadas: { main: { type: 'caceria', n: 8 }, bonus: { type: 'rapido', t: 70 }, mod: null,
      why: 'En la terminal hay un retén de Los Zopilotes. Despeja las arcadas para que el chofer se anime a esperarte.' },
    metro: { main: { type: 'contrarreloj', t: 50 }, bonus: { type: 'gatas', n: 1 }, mod: 'noche',
      why: 'El túnel de la Línea 3 está a oscuras y el último tren sale en menos de un minuto. ¡Corre!' },
    mercado_tapatio: { main: { type: 'cristales', n: 40 }, bonus: { type: 'intacto' }, mod: null,
      why: 'Los puestos del mercado tiraron cristales por todos lados. Doña Tóxica los necesita para pagar el aventón.' },
    parque_metropolitano: { main: { type: 'caceria', n: 8 }, bonus: { type: 'cristales', n: 30 }, mod: 'viento',
      why: 'Hace viento en el parque y los perros de la banda andan sueltos. Derrota a ocho antes de cruzar.' },
    tlaquepaque: { main: { type: 'contrarreloj', t: 40 }, bonus: { type: 'intacto' }, mod: 'lluvia',
      why: 'Empieza a llover sobre las sombrillas. El chofer se detuvo por un café de olla: tienes cuarenta segundos.' },
    anden_tren_ligero: { main: { type: 'jefe' }, bonus: { type: 'rapido', t: 80 }, mod: 'viento',
      why: 'El tren ligero levanta ráfagas en el andén. La Paloma del Andén no deja pasar a nadie.' },
    plaza_jacarandas: { main: { type: 'jefe' }, bonus: { type: 'intacto' }, mod: 'noche',
      why: 'La Ruta 6 espera en la Plaza de las Jacarandas. Solo falta el Guardián… y las patrullas ya vienen.' },
    // MISIÓN 3 · EL SUBMARINO
    submarino_isla: { main: { type: 'cristales', n: 15 }, bonus: { type: 'secreto' }, mod: null,
      why: 'La corriente te dejó en la isla. Junta cristales para encender las balizas del canal y bajar al mar.' },
    submarino_bosque: { main: { type: 'caceria', n: 4 }, bonus: { type: 'intacto' }, mod: null,
      why: 'Las pirañas del bosque de algas no dejan pasar. Ahuyenta a cuatro para abrir el camino a la fosa.' },
    submarino_fosa: { main: { type: 'jefe' }, bonus: { type: 'intacto' }, mod: null,
      why: 'Poseidón guarda la escotilla de rescate. Vence al rey del mar para salir.' },
    // MISIÓN 4 · EL ESPACIO
    espacial: { main: { type: 'jefe' }, bonus: { type: 'secreto' }, mod: null,
      why: 'El Emperador Marciano custodia el módulo de regreso. Derríbalo para volver a la Tierra.' },
    // MISIÓN 5 · CASCADAS DEL CIELO
    parafalls_1: { main: { type: 'cristales', n: 30 }, bonus: { type: 'intacto' }, mod: null,
      why: 'Los niños guardianes dejaron cristales en las repisas. Junta treinta para abrir el primer paso.' },
    parafalls_2: { main: { type: 'contrarreloj', t: 75 }, bonus: { type: 'cristales', n: 30 }, mod: 'viento',
      why: 'El viento de las cascadas empuja. Baja al punto seguro antes de que la neblina lo cubra.' },
    parafalls_3: { main: { type: 'cristales', n: 25 }, bonus: { type: 'intacto' }, mod: null,
      why: 'La plataforma final se enciende con cristales. Junta veinticinco para activar el portal.' }
  };

  const DIFF_TIME = { facil: 1.4, normal: 1, dificil: 0.82 };
  const MOD_LABEL = { noche: 'NOCHE · LINTERNA', lluvia: 'LLUVIA · PISO MOJADO', viento: 'VIENTO · RÁFAGAS' };

  /** Crea el contrato del tramo. `ctx` describe lo que hay delante del punto de salida:
      { scene, levelId, bossAlive, bossName, foesAhead, gemsAhead, itemIndex, itemReachable, itemOwned, hasSecret,
        startFrac (0 = inicio del tramo, 0.5 = parada intermedia), difficulty } */
  function create(ctx) {
    const plan = PLAN[ctx.levelId];
    if (!plan) return null;
    const main = Object.assign({}, plan.main), bonus = plan.bonus ? Object.assign({}, plan.bonus) : null;
    // Ajustes para que el objetivo siempre se pueda cumplir desde el punto de salida.
    if (main.type === 'jefe' && !ctx.bossAlive) { main.type = ctx.foesAhead >= 3 ? 'caceria' : 'cristales'; main.n = 3; main.adjusted = true; }
    if (main.type === 'objeto' && (ctx.itemIndex == null || !ctx.itemReachable || ctx.itemOwned)) {
      if (ctx.itemOwned) main.done = true;
      else { main.type = ctx.bossAlive ? 'jefe' : 'cristales'; main.n = 10; main.adjusted = true; }
    }
    if (main.type === 'caceria') main.n = Math.max(1, Math.min(main.n, Math.floor(ctx.foesAhead * 0.7)));
    if (main.type === 'cristales') main.n = Math.max(1, Math.min(main.n, Math.floor(ctx.gemsAhead * 0.7)));
    if (main.type === 'contrarreloj') main.t = Math.round(main.t * (DIFF_TIME[ctx.difficulty] || 1) * Math.max(0.45, 1 - (ctx.startFrac || 0)));
    if (bonus) {
      if (bonus.type === 'cristales') bonus.n = Math.max(1, Math.min(bonus.n, Math.floor(ctx.gemsAhead * 0.8)));
      if (bonus.type === 'gatas') bonus.n = Math.max(1, Math.min(bonus.n, Math.floor(ctx.foesAhead * 0.4)) || 1);
      if (bonus.type === 'secreto' && !ctx.hasSecret) { bonus.type = 'intacto'; }
      if (bonus.type === 'rapido') bonus.t = Math.round(bonus.t * (DIFF_TIME[ctx.difficulty] || 1) * Math.max(0.45, 1 - (ctx.startFrac || 0)));
    }
    return {
      levelId: ctx.levelId, scene: ctx.scene, why: plan.why, mod: plan.mod || null, modLabel: MOD_LABEL[plan.mod] || '',
      bossName: ctx.bossName || '', itemIndex: ctx.itemIndex, main, bonus,
      kills: 0, gems: 0, cats: 0, hits: 0, t: 0, bossDown: false, item: false, secret: false,
      mainDone: !!main.done, bonusDone: false, failed: null, gust: { t: 0, dir: 1, phase: 'calm' }
    };
  }

  /** Actualiza el estado tras un suceso; devuelve los cambios ('main', 'bonus', 'fail'). */
  function update(c, ev) {
    if (!c) return [];
    switch (ev.type) {
      case 'kill': c.kills++; if (ev.how === 'cat') c.cats++; if (ev.boss) c.bossDown = true; break;
      case 'gem': c.gems++; break;
      case 'item': if (ev.itemIndex === c.itemIndex) c.item = true; break;
      case 'hit': c.hits++; break;
      case 'secret': c.secret = true; break;
      case 'time': c.t += ev.dt; break;
      default: break;
    }
    const out = [];
    if (!c.mainDone && !c.failed && mainMet(c)) { c.mainDone = true; out.push('main'); }
    if (!c.mainDone && !c.failed && c.main.type === 'contrarreloj' && c.t >= c.main.t) { c.failed = 'tiempo'; out.push('fail'); }
    if (c.bonus && !c.bonusDone && bonusMet(c, false)) { c.bonusDone = true; out.push('bonus'); }
    return out;
  }
  function mainMet(c) {
    const m = c.main;
    switch (m.type) {
      case 'jefe': return c.bossDown;
      case 'caceria': return c.kills - (c.bossDown ? 1 : 0) >= m.n;
      case 'cristales': return c.gems >= m.n;
      case 'objeto': return c.item;
      case 'contrarreloj': return false;   // se cumple al llegar a la parada siguiente (ver finish)
      default: return true;
    }
  }
  /** `atExit`: los opcionales «intacto» y «rapido» solo se confirman al terminar el tramo. */
  function bonusMet(c, atExit) {
    const b = c.bonus;
    if (!b) return false;
    switch (b.type) {
      case 'intacto': return atExit && c.hits === 0;
      case 'rapido': return atExit && c.t <= b.t;
      case 'gatas': return c.cats >= b.n;
      case 'cristales': return c.gems >= b.n;
      case 'secreto': return c.secret;
      default: return false;
    }
  }
  /** Al llegar al final del tramo: el contrarreloj se cumple si queda tiempo; se cierran los opcionales. */
  function finish(c) {
    if (!c) return { ok: true };
    if (!c.mainDone && !c.failed && c.main.type === 'contrarreloj' && c.t < c.main.t) c.mainDone = true;
    if (c.bonus && !c.bonusDone && bonusMet(c, true)) c.bonusDone = true;
    return { ok: c.mainDone, bonus: c.bonusDone };
  }

  /** Texto corto para el HUD y el aviso. */
  function goalText(c) {
    if (!c) return '';
    const m = c.main;
    if (c.mainDone) return 'MISIÓN CUMPLIDA · SIGUE A LA PARADA';
    switch (m.type) {
      case 'jefe': return 'MISIÓN: VENCE ' + toName(c.bossName, true);
      case 'caceria': return 'MISIÓN: DERROTA ENEMIGOS ' + Math.min(m.n, Math.max(0, c.kills - (c.bossDown ? 1 : 0))) + '/' + m.n;
      case 'cristales': return 'MISIÓN: CRISTALES ' + Math.min(m.n, c.gems) + '/' + m.n;
      case 'objeto': return 'MISIÓN: RECUPERA ' + (itemName(c.itemIndex) || 'EL OBJETO') + ' (ZONA OCULTA ↓)';
      case 'contrarreloj': { const left = Math.max(0, Math.ceil(m.t - c.t)); return 'MISIÓN: LLEGA A LA PARADA · ⏱ ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); }
      default: return '';
    }
  }
  function bonusText(c) {
    const b = c && c.bonus;
    if (!b) return '';
    const mark = c.bonusDone ? '✓ ' : '';
    switch (b.type) {
      case 'intacto': return mark + 'OPCIONAL: SIN RECIBIR DAÑO';
      case 'rapido': return mark + 'OPCIONAL: EN MENOS DE ' + b.t + ' s';
      case 'gatas': return mark + 'OPCIONAL: ' + b.n + ' DERRIBO' + (b.n > 1 ? 'S' : '') + ' CON GATAS (' + Math.min(b.n, c.cats) + '/' + b.n + ')';
      case 'cristales': return mark + 'OPCIONAL: ' + Math.min(b.n, c.gems) + '/' + b.n + ' CRISTALES';
      case 'secreto': return mark + 'OPCIONAL: ENCUENTRA LA ZONA SECRETA';
      default: return '';
    }
  }
  function briefText(c) {
    if (!c) return '';
    const head = goalText(Object.assign({}, c, { mainDone: false })).replace(/^MISIÓN: /, '');
    return 'MISIÓN: ' + head + (c.modLabel ? ' · ' + c.modLabel : '');
  }
  function failText(c) {
    if (!c) return '';
    if (c.failed === 'tiempo') return 'Se acabó el tiempo: la Ruta 6 siguió de largo.';
    switch (c.main.type) {
      case 'jefe': return 'Bajaste sin vencer ' + toName(c.bossName, false) + ': te cerró el paso.';
      case 'caceria': return 'Los vigías siguen sueltos: derrotaste ' + Math.max(0, c.kills - (c.bossDown ? 1 : 0)) + ' de ' + c.main.n + '.';
      case 'cristales': return 'Te faltaron cristales: juntaste ' + c.gems + ' de ' + c.main.n + '.';
      case 'objeto': return 'Dejaste atrás ' + (itemName(c.itemIndex) || 'el objeto') + ': sin esa llave USB no se abre la siguiente puerta.';
      default: return 'La misión del tramo quedó sin cumplir.';
    }
  }
  /** «vence al Maestro», «vence a la Paloma Jefa», «vence a Poseidón». */
  function toName(name, upper) {
    const n = name || (upper ? 'EL JEFE' : 'el jefe');
    if (/^EL /i.test(n)) return (upper ? 'AL ' : 'al ') + n.slice(3);
    if (/^(PALOMA|RATA)/i.test(n)) return (upper ? 'A LA ' : 'a la ') + n;
    if (/^POSEID/i.test(n)) return (upper ? 'A ' : 'a ') + n;
    return (upper ? 'AL ' : 'al ') + n;
  }
  function itemName(i) { const it = NS.STORY && NS.STORY.ITEMS && NS.STORY.ITEMS[i]; return it ? it.name : ''; }

  /* Viento: ciclos de calma → aviso (1,1 s) → ráfaga (2,2 s). Dirección alterna; devuelve la aceleración lateral. */
  const WIND = { calm: 4.2, warn: 1.1, gust: 2.2, groundAccel: 300, airAccel: 360 };
  function wind(c, dt, grounded) {
    const g = c.gust;
    g.t += dt;
    if (g.phase === 'calm' && g.t >= WIND.calm) { g.phase = 'warn'; g.t = 0; g.dir = -g.dir; return { accel: 0, warn: true }; }
    if (g.phase === 'warn' && g.t >= WIND.warn) { g.phase = 'gust'; g.t = 0; }
    if (g.phase === 'gust') {
      if (g.t >= WIND.gust) { g.phase = 'calm'; g.t = 0; return { accel: 0 }; }
      return { accel: g.dir * (grounded ? WIND.groundAccel : WIND.airAccel) };
    }
    return { accel: 0 };
  }

  NS.Contracts = { PLAN, create, update, finish, goalText, bonusText, briefText, failText, wind, WIND, MOD_LABEL };
})(typeof globalThis !== 'undefined' ? globalThis : window);
