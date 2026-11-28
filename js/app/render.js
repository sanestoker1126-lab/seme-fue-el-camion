/* ¡Se me fue el camión! — renderizador Canvas 2D en modo inmediato.
   Sustituye al "PIXI de respaldo" de la v21: no crea objetos por fotograma (menos recolección de basura en móviles),
   dibuja solo lo visible y cachea los fondos teñidos. Solo lee el estado del juego; nunca lo modifica. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};

  /* V50 · Sofía: juego de frames revisado (assets/player/sofia). Todos del mismo diseño (diadema de reno),
     misma escala de cabeza y anclados al torso/pies con NS.ART.SOFIA, así no "crece" al correr ni flota al patear.
     Mapeo corregido: salto/caída usan la pose en el aire (antes poses de golpe con los pies en el piso),
     la carrera usa el ciclo nítido de zancada y el dash la pose de clavado. */
  const NINA_DIR = 'assets/player/sofia/';
  // V53 · Aspecto de Sofía (variantes de tierra). Comparten nombres de frame y anclas (NS.ART.SOFIA), así que
  // basta cambiar la carpeta. El nado (atlas SWIM) no cambia con esto.
  const NINA_VARIANT_DIR = { original: NINA_DIR, uniforme: 'assets/player/variants/uniforme/', rosa: 'assets/player/variants/rosa/' };
  const NINA = {
    idle: ['idle_01'],
    run: ['run_01', 'run_02', 'run_03', 'run_04'],
    fastRun: ['run_01', 'run_02', 'run_03', 'run_04'],
    jump: ['air_01'],
    fall: ['air_01'],
    land: ['land_01'],
    climb: ['run_01', 'run_02', 'run_03', 'run_04'],
    dash: ['dive_01'],
    kick: ['kick_01', 'kick_02', 'kick_03', 'kick_04'],
    hurt: ['land_01'],
    dead: ['dive_01'],
    cheer: ['cheer_01', 'cheer_02', 'cheer_03'],
    zip: ['cheer_02'],                // V58: colgada de la tirolesa (puño en alto sobre el cable)
    swing: ['cheer_02'],              // V58.2: colgada de una cuerda
    swimKick: ['kick_01', 'kick_02', 'kick_03', 'kick_04'],
    // V58.3: en el mar, el salto al salir del agua y la caída hacia ella se ven con los cuadros normales.
    waterLeap: ['air_01'],
    diveIn: ['dive_01']
  };
  const COMPANIONS = {
    luna: { name: 'LUNA', src: 'assets/companions/luna.png',
      idle: Array.from({ length: 6 }, (_, i) => `assets/companions/luna_idle_v38_0${i + 1}.png`),
      walk: Array.from({ length: 4 }, (_, i) => `assets/companions/luna_walk_v38_0${i + 1}.png`),
      shoulder: 'assets/companions/luna_shoulder.png', scale: 0.068, tint: '#fffdf4' },
    morita: { name: 'MORITA', src: 'assets/companions/morita.png',
      idle: Array.from({ length: 6 }, (_, i) => `assets/companions/morita_idle_v38_0${i + 1}.png`),
      walk: Array.from({ length: 4 }, (_, i) => `assets/companions/morita_walk_v38_0${i + 1}.png`),
      shoulder: 'assets/companions/morita_shoulder.png', scale: 0.066, tint: '#d7d9df' }
  };
  const PARAFALLS_ROBLOX_SOFIA = 'assets/player/sofia_roblox/sofia_atlas.png';
  const PARAFALLS_ROBLOX_CAT_DIR = 'assets/companions/roblox_parafalls/';
  const PARAFALLS_ROBLOX_PLAYER_STATE = { fastRun: 'run', dash: 'glide', kick: 'attack', swimKick: 'attack', dead: 'knockdown', cheer: 'victory', zip: 'glide', swing: 'glide', waterLeap: 'jump', diveIn: 'jump' };
  const PARAFALLS_ROBLOX_URLS = [PARAFALLS_ROBLOX_SOFIA, ...['luna','morita'].map((id) => PARAFALLS_ROBLOX_CAT_DIR + id + '/atlas.png')];
  // V53 · Variante submarina de las gatitas (casco, tanque): se usa en el mundo submarino. Mismos tamaños (224 px)
  // que los frames de tierra, así que comparten escala. Los frames vienen del kit Luna/Morita submarinas.
  const subFrames = (cat, base, n) => Array.from({ length: n }, (_, i) => `assets/companions/sub/${cat}_${base}_0${i + 1}.png`);
  const COMPANIONS_SUB = {
    luna: { name: 'LUNA', src: 'assets/companions/sub/luna_idle_sub_01.png',
      idle: subFrames('luna', 'idle_sub', 6), walk: subFrames('luna', 'walk_sub', 4),
      shoulder: 'assets/companions/sub/luna_shoulder_sub.png', scale: 0.068, tint: '#e3f6ff' },
    morita: { name: 'MORITA', src: 'assets/companions/sub/morita_idle_sub_01.png',
      idle: subFrames('morita', 'idle_sub', 6), walk: subFrames('morita', 'walk_sub', 4),
      shoulder: 'assets/companions/sub/morita_shoulder_sub.png', scale: 0.066, tint: '#d2e2ec' }
  };
  // V58.1 · Gatitas astronautas (atlas aportado: Luna blanca, Morita gris). Mismo lienzo de 224 px que las de tierra.
  // El paquete trae reposo, dos pasos y salto: el reposo se repite en las poses de alerta/olfateo (no hay otras).
  const spaceCat = (cat, name, scale, tint) => {
    const f = (n) => `assets/companions/space/${cat}_${n}.webp`;
    return { name, src: f('idle'), idle: Array(6).fill(f('idle')), walk: [f('walk_a'), f('walk_b')], shoulder: f('idle'), scale, tint };
  };
  const COMPANIONS_SPACE = { luna: spaceCat('luna', 'LUNA', 0.068, '#fffdf4'), morita: spaceCat('morita', 'MORITA', 0.066, '#d7d9df') };
  /* V58.1 · Sofía astronauta (Luna V5): atlas aportados (falda roja). Lienzo 256 × 240 con los pies en (128, 232), todas
     las poses a la misma escala (igualadas por el ancho del casco). No hay patada propia: se usan las poses de salto con
     la pierna al frente; trepar usa los pasos. */
  const ASTRO_DIR = 'assets/player/astronauta/';
  const ASTRO = {
    idle: ['idle'], run: ['walk_a', 'walk_b'], fastRun: ['walk_a', 'walk_b'], jump: ['rise'], fall: ['fall'], land: ['land'],
    climb: ['walk_a', 'walk_b'], dash: ['dash'], kick: ['kick_1', 'kick_2', 'kick_2', 'kick_1'], hurt: ['hurt'], dead: ['down'],
    cheer: ['victory_1', 'victory_2', 'victory_3'], zip: ['victory_2'], swing: ['victory_2']
  };
  const ASTRO_META = [1, 128, 232];
  const BUS_FRAMES = [1, 2, 3, 4].map((n) => 'assets/vehicles/camion_frame_0' + n + '.png');
  const FRAME_MS = { idle: 180, run: 92, fastRun: 64, jump: 110, fall: 180, land: 75, climb: 125, dash: 50, kick: 58, hurt: 100, dead: 260, cheer: 170 };
  // Escala base: un cuadro con k = 1 mide ≈ 61 u de pie, igual que la caja de colisión (62 u).
  const SOFIA_BASE = 0.33;
  const ninaSrc = (f, look) => (NINA_VARIANT_DIR[look] || NINA_DIR) + f + '.png';
  /* V58.6 · Ropa por nivel: cada vestuario solo en su mundo. Escuela = uniforme; Luna = astronauta; mar = buzo solo
     dentro del agua (drawDiveWater); Guadalajara y la isla del mar = ropa de calle (ORIGINAL o ROSA, opción). */
  const casualLook = () => (ropt.ninaLook === 'rosa' ? 'rosa' : 'original');
  function outfitFor(theme) { return theme === 'espacial' ? 'astronauta' : theme === 'escuela' ? 'uniforme' : casualLook(); }

  const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
  const images = new Map();
  let frameNumber = 0;
  function image(src) {
    if (!images.has(src)) {
      const im = new Image();
      im.decoding = 'async';
      im.loaded = new Promise(resolve => {
        im.addEventListener('load', () => resolve(im.naturalWidth > 0), { once: true });
        im.addEventListener('error', () => resolve(false), { once: true });
      });
      im.scenery = /^assets\/(scenes|parallax|backgrounds)\//.test(src);
      im.src = src;
      images.set(src, im);
    }
    const im = images.get(src);
    if (im.scenery) im.usedAt = frameNumber;
    return im;
  }
  const ready = (im) => !!(im && im.complete && im.naturalWidth > 0);
  function whenLoaded(im) {
    return ready(im) ? Promise.resolve(true) : im.loaded;
  }

  /* Fondo teñido cacheado (una vez por par archivo+tinte). */
  const tinted = new Map();
  /* `maxW`: ancho máximo del lienzo cacheado. V58.1: los fondos PRO de Guadalajara miden 1536 × 2504; reducirlos UNA vez
     al tamaño que el nivel realmente muestra evita reescalarlos cada cuadro (con la CPU frenada ×4 Portales bajó a
     12 fps por eso). */
  function tintedImage(src, tint, maxW = 0) {
    const im = image(src);
    if (!ready(im)) return null;
    const k = maxW && im.naturalWidth > maxW ? maxW / im.naturalWidth : 1;
    if (tint === 0xffffff && k === 1) return im;
    const key = src + '|' + tint + '|' + k.toFixed(4);
    if (tinted.has(key)) {
      const cached = tinted.get(key); tinted.delete(key); tinted.set(key, cached); return cached;
    }
    const c = document.createElement('canvas');
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(im, 0, 0, c.width, c.height);
    if (tint !== 0xffffff) {
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = hex(tint);
      x.fillRect(0, 0, c.width, c.height);
      x.globalCompositeOperation = 'destination-in';
      x.drawImage(im, 0, 0, c.width, c.height);
    }
    if (tinted.size >= 4) tinted.delete(tinted.keys().next().value);
    tinted.set(key, c);
    return c;
  }
  // Ancho al que se cachea el fondo de un tramo: el de su panel en el mundo × 1,6 (nitidez con zoom y pantallas densas).
  const sceneArtW = (sc) => Math.round(Math.max(640, sc.map.width * sc.scale * 1.6 / ((sc.map.art && sc.map.art.length > 1) ? 2 : 1)));

  let canvas, ctx, dpr = 1, cw = 1, ch = 1, debug = false, qScale = 1;
  // V50: opciones visuales (menú OPCIONES).
  const ropt = { shake: 1, landingRing: true, ninaLook: 'original' };
  function setOptions(o) { Object.assign(ropt, o || {}); }

  /* Silueta de color de un sprite (cacheada): destellos de golpe y tintes sin depender de ctx.filter,
     que Safari no soporta. */
  const sils = new Map();
  function silhouette(im, color) {
    if (!ready(im)) return null;
    const key = im.src + '|' + color;
    let c = sils.get(key);
    if (!c) {
      c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const x = c.getContext('2d');
      x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
      if (sils.size > 160) sils.clear();
      sils.set(key, c);
    }
    return c;
  }

  function init(el) {
    canvas = el;
    ctx = canvas.getContext('2d', { alpha: false });
    resize();
  }
  function resize() {
    const touch = (root.navigator.maxTouchPoints || 0) > 0 || root.matchMedia('(pointer: coarse)').matches;
    const pixels = (root.navigator.deviceMemory || 4) > 4 ? 2000000 : 1000000;
    const density = (touch && root.innerWidth && root.innerHeight) ?
      Math.min(2, Math.sqrt(pixels / (root.innerWidth * root.innerHeight))) : 2.5;
    dpr = Math.max(touch ? .65 : 1, Math.min(root.devicePixelRatio || 1, density) * qScale);
    cw = Math.max(1, Math.round(root.innerWidth * dpr));
    ch = Math.max(1, Math.round(root.innerHeight * dpr));
    canvas.width = cw; canvas.height = ch;
    canvas.style.width = '100%'; canvas.style.height = '100%';
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = touch && qScale < .9 ? 'medium' : 'high';
  }
  // Las imágenes se solicitan al dibujarse. Solo se adelantan la primera página y los protagonistas.
  let loadedWorld = null;
  function enterWorld(id) {
    if (loadedWorld === id) return;
    if (loadedWorld !== null) { images.clear(); tinted.clear(); sils.clear(); depthFxCache.clear(); fused.clear(); bgCache.clear(); }
    loadedWorld = id;
  }
  function entryArt(G) {
    const sc = G.world.scenes[G.tramo], art = sc.map.worldArt;
    const first = sc.index === 0 && G.world.shore ? G.world.shore.file : art ? art.dir + art.pages[0] : sc.file;
    const main = G.missionId === 'parafalls' ? PARAFALLS_ROBLOX_URLS :
      G.missionId === 'espacial' ? ['assets/production/sofia_astronauta/atlas.png','assets/production/luna_space/atlas.png','assets/production/morita_space/atlas.png'] :
      [ninaSrc('idle_01', outfitFor(sc.theme)), COMPANIONS.luna.idle[0], COMPANIONS.morita.idle[0]];
    return [...new Set([first, ...main].filter(Boolean))];
  }
  async function preload(srcs) {
    const urls = [...new Set(srcs)], results = [];
    for (let i = 0; i < urls.length; i += 3) {
      const readyBatch = await Promise.all(urls.slice(i, i + 3).map(src => whenLoaded(image(src))));
      results.push(...readyBatch);
    }
    return results;
  }
  // Resolución adaptativa: el bucle baja la calidad si el dispositivo va lento y la sube si va sobrado.
  function setQuality(q) { q = Math.max(0.55, Math.min(1, q)); if (Math.abs(q - qScale) < 0.02) return false; qScale = q; resize(); return true; }

  /* ---------- Primitivas ---------- */
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }
  function fillRR(x, y, w, h, r, color, a = 1) { ctx.globalAlpha = a; ctx.fillStyle = color; rr(x, y, w, h, r); ctx.fill(); ctx.globalAlpha = 1; }
  function fillRect(x, y, w, h, color, a = 1) { ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1; }
  function circle(x, y, r, color, a = 1) { ctx.globalAlpha = a; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  function ellipse(x, y, rx, ry, color, a = 1) { ctx.globalAlpha = a; ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  function ring(x, y, rx, ry, color, a, lw) { ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
  function line(x1, y1, x2, y2, color, a, lw) { ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.globalAlpha = 1; }
  function tri(x1, y1, x2, y2, x3, y3, color, a = 1) { ctx.globalAlpha = a; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
  function text(s, x, y, size, color, align = 'center', weight = 900) {
    ctx.font = `${weight} ${size}px system-ui,-apple-system,Segoe UI,sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(s, x, y);
  }
  const hash = (a, b) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 997;
  const inView = (V, x1, y1, x2, y2) => x2 > V.x1 && x1 < V.x2 && y2 > V.y1 && y1 < V.y2;

  /* ---------- Fondo del mundo ---------- */
  function drawBuildingFacade(sc, side, x1, x2, y1, y2, T) {
    const school = sc.theme === 'escuela';
    const id = sc.id || '';
    const night = sc.shade > 0.1;
    const width = x2 - x1;
    const base = school ? (night ? '#172d39' : '#294b59') : (night ? '#30283a' : '#604b43');
    const trim = school ? '#6b9b9d' : '#b48763';
    const deep = school ? '#10232e' : '#2a2028';
    fillRect(x1, y1, width, y2 - y1, base, 0.98);
    // Cornisa y columnas: hacen que el fondo se lea como edificios, no como bloques planos.
    fillRect(x1, y1 + 9, width, 8, trim, 0.7);
    fillRect(x1, y1 + 18, width, 4, deep, 0.65);
    const colW = id === 'centro_historico' || id === 'zapopan' ? 116 : 140;
    for (let cx = x1 + 8; cx < x2; cx += colW) {
      fillRect(cx, y1, 8, y2 - y1, deep, 0.35);
      if (id === 'centro_historico' || id === 'zapopan') {
        // Arcos de cantera y balcones coloniales.
        fillRR(cx + 18, y1 + 30, colW - 34, 62, 22, '#171a24', 0.82);
        ellipse(cx + colW / 2 - 0, y1 + 93, (colW - 34) / 2, 16, trim, 0.42);
        fillRect(cx + 25, y1 + 91, colW - 50, 5, trim, 0.6);
        line(cx + 15, y1 + 108, cx + colW - 15, y1 + 108, trim, 0.55, 2);
      } else {
        for (let wy = y1 + 34; wy < y2 - 42; wy += 92) {
          const lit = hash(Math.round(cx), Math.round(wy)) % (night ? 3 : 5) === 0;
          fillRR(cx + 22, wy, Math.min(30, colW - 38), 43, 4, deep, 0.92);
          fillRect(cx + 26, wy + 4, Math.min(22, colW - 46), 35, lit ? (school ? '#b9e6d5' : '#f2c87f') : trim, lit ? 0.66 : 0.32);
        }
      }
    }
    if (id === 'escuela' || id === 'escuela_vecina' || id === 'escuela_ruinas') {
      // Letrero y banderines escolares, siempre en la capa de fondo.
      const sx = side < 0 ? x2 - Math.min(150, width * 0.55) : x1 + 20;
      fillRR(sx, y1 + 126, Math.min(132, width * 0.55), 27, 5, '#17333b', 0.92);
      text('ESCUELA', sx + Math.min(132, width * 0.55) / 2, y1 + 140, 10, '#d9ff65');
      for (let k = 0; k < 5; k++) tri(sx + 12 + k * 22, y1 + 163, sx + 23 + k * 22, y1 + 163, sx + 18 + k * 22, y1 + 177, k % 2 ? '#f5c85b' : '#5ed6ca', 0.7);
    } else if (id === 'centro_historico') {
      // Torre colonial estilizada para el Centro Histórico.
      const tx = side < 0 ? x2 - 94 : x1 + 42;
      fillRect(tx, y1 + 18, 54, 128, '#8f6a55', 0.9);
      fillRect(tx - 9, y1 + 10, 72, 12, '#c29a70', 0.85);
      tri(tx - 8, y1 + 10, tx + 62, y1 + 10, tx + 27, y1 - 18, '#b88c67', 0.95);
      circle(tx + 27, y1 - 24, 5, '#ffe7a0', 0.8);
    } else if (id === 'zapopan') {
      // Cúpula y cruz de la basílica al fondo del tramo de Zapopan.
      const dx = side < 0 ? x2 - 100 : x1 + 46;
      ellipse(dx + 30, y1 + 48, 47, 31, '#9a7a6b', 0.92);
      fillRect(dx - 16, y1 + 48, 92, 92, '#69515a', 0.9);
      tri(dx + 16, y1 + 17, dx + 44, y1 + 17, dx + 30, y1 - 14, '#c2a177', 0.95);
      line(dx + 30, y1 - 29, dx + 30, y1 - 8, '#ffe7a0', 0.8, 2);
      line(dx + 22, y1 - 22, dx + 38, y1 - 22, '#ffe7a0', 0.8, 2);
    } else if (id === 'arcadas') {
      const sx = side < 0 ? x2 - 170 : x1 + 20;
      fillRR(sx, y1 + 34, Math.min(158, width * 0.6), 34, 7, '#18313a', 0.94);
      text('TERMINAL', sx + Math.min(158, width * 0.6) / 2, y1 + 51, 11, '#ffcf62');
    }
    // Luces de seguridad y cables que ayudan a leer los huecos laterales en movimiento.
    for (let lx = x1 + 42; lx < x2; lx += 178) {
      circle(lx, y1 + 12, 3.2, night ? '#ffd47a' : '#a8e8d1', 0.7 + 0.2 * Math.sin(T * 2 + lx));
      line(lx, y1 + 16, lx, y1 + 26, trim, 0.45, 1);
    }
  }


  /* Los fondos V53 son imágenes compuestas; V54 las utiliza como capa profunda
     continua, con partículas intermedia y cercana a distinta velocidad. */

  /* ---------- V58 · Fondos del tamaño de todo el nivel ----------
     Cada tramo pinta su fondo de pared a pared del mundo (incluidos los sectores laterales) y en toda su altura.
     Las capas 16:9 aportadas (escuela y Guadalajara) se escalan a la altura de la franja y, si la franja es más ancha,
     se repiten en mosaico espejo (las uniones coinciden). Cada capa se desplaza a su propia velocidad.
     `top` es la mitad alta (trazado original), `bottom` la mitad nueva; null = el fondo propio del nivel. */
  const PXD = 'assets/parallax/';
  // Guadalajara V58.4.1: capas independientes del paquete adaptadas a la escala del renderer vigente.
  // Se usan solo cielo y ciudad lejana; los primeros planos incluyen repisas de otra versión y no coinciden con las colisiones V58.8.1.
  const GDL_V584 = PXD + 'guadalajara_v584/';
  const GDL = () => [[[GDL_V584 + '00_cielo_atardecer.webp'], 0.16], [[GDL_V584 + '01_ciudad_lejana.webp'], 0.08]];
  // El primer Guadalajara ya trae ciudad/plataformas en su arte central; conservar solo el cielo fuera del panel.
  const GDL_SKY = () => [[[GDL_V584 + '00_cielo_atardecer.webp'], 0.16]];
  const BACKDROPS = {
    guadalajara: { bottom: GDL_SKY('barrios_inferiores') },
    gdl_noche: { bottom: GDL('barrios_inferiores') },
    azoteas: { top: GDL('azoteas'), bottom: GDL('azoteas') },
    centro_historico: { bottom: GDL('mercado_parque') },
    portales: { bottom: GDL('mercado_parque') },
    zapopan: { bottom: GDL('barrios_inferiores') },
    mercado_tapatio: { top: GDL('mercado_parque') },
    parque_metropolitano: { bottom: GDL('mercado_parque') },
    anden_tren_ligero: { bottom: GDL('barrios_inferiores') },
    plaza_jacarandas: { bottom: GDL('azoteas') }
  };
  const WATERFALL_DIR = 'assets/scenes/waterfalls/parafalls_v2/';
  const waterfallDepth = (page) => ({
    dir: WATERFALL_DIR,
    // Cada página conserva sus dos planos RGBA originales: atmósfera lenta y vegetación frontal ligeramente cercana.
    fx: [
      { f: 0.18, zone: [0, 1], layers: [[`depth/atmosphere_0${page}.webp`, 0.65]] },
      { f: 1.08, near: true, zone: [0, 1], layers: [[`depth/foreground_0${page}.webp`, 0.82]] }
    ],
    above: '#2684d3', below: '#10384b'
  });
  /* ---------- V59 · Mundo submarino de tres láminas ----------
     Canal inundado, bosque de algas y fosa azul son páginas completas fijas al mundo. La geometría se traza sobre
     el arte; las repisas visibles son la ruta física. Solo se reutilizan partículas transparentes V4, sin arquitectura.
     La geometría (ancho, alto, px por unidad de mapa) viene del mapa (worldArt). */
  const DEPTH_ART = {
    submarino: {
      // Solo ambiente transparente (sin duplicar ruinas/corales ya pintados en V59); ambos efectos se limitan al canal.
      dir: PXD + 'marino/depth_v4/',
      fx: [
        { f: 0.24, zone: [0, 1 / 3], tile: 520, layers: [['layers/05_plancton_flotante.png', 0.5]] },
        { f: 0.76, zone: [0, 1 / 3], tile: 680, layers: [['layers/06_burbujas_ligeras.png', 0.42]] }
      ],
      above: '#438efa', below: '#093d7c'
    },
    // Luna V5: páginas de 1680 px (solo la franja central es nítida y es la que queda dentro del mundo; ver
    // LUNAR_ART.x0). Sus capas miden 1024 × 768 y están hechas para repetirse: van en mosaico y solo en su zona
    // (cielo arriba; polvo y luz de cristales en las cavernas). Planetas y naves no van como capa: el cielo pintado ya
    // los trae; el OVNI de la capa de naves se usa como plataforma (aspecto 'nave').
    espacial: {
      dir: PXD + 'espacial/depth_v5/',
      fx: [
        { f: 0.12, zone: [0, 0.125], tile: 760, layers: [['layers/01_estrellas_lejanas.png', 0.61], ['layers/05_basura_meteoritos.png', 0.42]] },
        { f: 0.4, zone: [0.3, 1], tile: 820, layers: [['layers/06_polvo_caverna.png', 0.45]] },
        { f: 0.62, near: true, zone: [0.33, 1], tile: 1500, layers: [['layers/07_luz_cristales.png', 0.3]] }
      ],
      above: '#1c2141', below: '#32455c'
    },
    cascadas_01: waterfallDepth(1), cascadas_02: waterfallDepth(2), cascadas_03: waterfallDepth(3),
    // Escuela Benito Juárez (misión 1): tres láminas apiladas, sin capas de ambiente (sus capas de árboles
    // translúcidos se encimaban sobre la fachada y no aportaban).
    escuela: { dir: '', fx: [], above: '#2181c7', below: '#353c42' }
  };
  // Sprites recortados de las capas V5 (px de la capa): OVNI de 04_naves_satelites.
  const UFO = { src: PXD + 'espacial/depth_v5/layers/04_naves_satelites.png', box: [590, 72, 289, 106], rim: 0.42 };
  const hexA = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
  const depthCfg = (sc) => (sc && sc.map && sc.map.worldArt && DEPTH_ART[sc.theme]) || null;
  // Páginas de todos los mundos pintados (de los mapas) y capas de ambiente (de DEPTH_ART).
  function depthUrls() {
    const out = new Set(), L = NS.LEVELS || {};
    const maps = [L.SUBMARINO_MAP, L.ESPACIAL_MAP, ...(L.LEVEL_SEQUENCE || []).map((d) => d.map),
      ...(L.MISSIONS || []).flatMap((m) => m.levels.map((d) => d.map))];
    for (const m of maps) if (m && m.worldArt) for (const p of m.worldArt.pages) out.add(m.worldArt.dir + p);
    for (const c of Object.values(DEPTH_ART)) for (const g of c.fx) for (const [src] of g.layers) out.add(c.dir + src);
    return [...out];
  }
  // Planos de ambiente fundidos (por tema). Las capas originales se sueltan al terminar (memoria en Android).
  const depthFxCache = new Map();
  function depthFx(theme, cfg) {
    let st = depthFxCache.get(theme);
    if (st) return st.groups;
    st = { groups: null };
    depthFxCache.set(theme, st);
    if (typeof Image !== 'function' || typeof document === 'undefined') return null;
    const load = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = cfg.dir + src; });
    Promise.all(cfg.fx.map((g) => Promise.all(g.layers.map(([src]) => load(src))))).then((sets) => {
      st.groups = sets.map((ims, gi) => {
        const g = cfg.fx[gi], first = ims.find(Boolean);
        if (!first) return null;
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(first.naturalWidth / 2)); c.height = Math.max(1, Math.round(first.naturalHeight / 2));
        const x = c.getContext('2d');
        ims.forEach((im, i) => { if (im) { x.globalAlpha = g.layers[i][1]; x.drawImage(im, 0, 0, c.width, c.height); } });
        return { canvas: c, f: g.f, near: !!g.near, zone: g.zone || null, tile: g.tile || 0 };
      }).filter(Boolean);
    });
    return null;
  }
  /* Plano de ambiente en mosaico, solo dentro de su zona (fracciones del alto del tramo), con paralaje propio. */
  function drawDepthTiles(g, G, sc, B, xx1, xx2, yy1, yy2) {
    const zy1 = sc.startY + sc.drawH * g.zone[0], zy2 = sc.startY + sc.drawH * g.zone[1];
    const y1 = Math.max(yy1, zy1), y2 = Math.min(yy2, zy2);
    if (y2 <= y1 || xx2 <= xx1) return;
    const tw = g.tile, th = tw * g.canvas.height / g.canvas.width;
    const ox = B.x1 + (G.cam.x - B.x1) * (1 - g.f), oy = zy1 + (G.cam.y - zy1) * (1 - g.f);
    const sx = xx1 - ((((xx1 - ox) % tw) + tw) % tw), sy = y1 - ((((y1 - oy) % th) + th) % th);
    ctx.save(); ctx.beginPath(); ctx.rect(xx1, y1, xx2 - xx1, y2 - y1); ctx.clip();
    for (let y = sy; y < y2; y += th) for (let x = sx; x < xx2; x += tw) ctx.drawImage(g.canvas, x, y, tw + 0.5, th + 0.5);
    ctx.restore();
  }
  /* Grietas en la roca pintada (luna): pozo oscuro con bordes quebrados, brillo de cristal y polvo que cae. */
  function drawCracks(G, V, T) {
    for (const c of G.world.cracks || []) {
      if (c.x2 < V.x1 || c.x1 > V.x2 || c.y2 < V.y1 || c.y1 > V.y2) continue;
      const w = c.x2 - c.x1, h = c.y2 - c.y1, n = 7;
      const edge = (k, side) => (side < 0 ? c.x1 : c.x2) - side * (((k * 7919) % 5) + (k % 2 ? 3 : 0));
      ctx.save(); ctx.beginPath();
      for (let k = 0; k <= n; k++) { const y = c.y1 + (h * k) / n; if (k) ctx.lineTo(edge(k, -1), y); else ctx.moveTo(edge(k, -1), y); }
      for (let k = n; k >= 0; k--) ctx.lineTo(edge(k + 2, 1), c.y1 + (h * k) / n);
      ctx.closePath();
      const g = ctx.createLinearGradient(c.x1, 0, c.x2, 0);
      g.addColorStop(0, 'rgba(10,6,24,0.97)'); g.addColorStop(0.5, 'rgba(26,14,52,0.93)'); g.addColorStop(1, 'rgba(10,6,24,0.97)');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(176,132,255,0.55)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
      // Bordes de roca quebrada a cada lado (no un puente encima) y luz de la ciudad que asoma abajo.
      for (const [ex, dir] of [[c.x1, 1], [c.x2, -1]]) tri(ex - dir * 7, c.y1 - 2, ex + dir * 6, c.y1 - 1, ex - dir * 4, c.y1 + 9, '#a9aec4', 0.9);
      const gl = ctx.createLinearGradient(0, c.y2 - 40, 0, c.y2);
      gl.addColorStop(0, 'rgba(150,110,255,0)'); gl.addColorStop(1, 'rgba(150,110,255,0.45)');
      ctx.fillStyle = gl; ctx.fillRect(c.x1 + 3, c.y2 - 40, w - 6, 40);
      for (let i = 0; i < 4; i++) {
        const k = ((T * 0.6 + i * 0.29) % 1), px = c.x1 + w * (0.2 + i * 0.2);
        circle(px, c.y1 + k * h, 1.6, '#d7c8ff', 0.7 * (1 - k));
      }
    }
  }
  /* Dibuja los tramos pintados de una pieza (mar, Luna, escuela). Devuelve true si TODOS los tramos lo son (entonces
     no hace falta el fondo por franjas); los tramos sin lámina los sigue dibujando drawSceneBands. */
  function drawDepthArt(G, V) {
    const W = G.world, list = W.scenes.filter((sc) => depthCfg(sc));
    if (!list.length) return false;
    const first = W.scenes[0], last = W.scenes[W.scenes.length - 1], B = W.bounds;
    const c0 = depthCfg(first), c1 = depthCfg(last);
    // Arriba y abajo de las láminas: su propio color de borde (la cámara puede asomarse por encima del inicio).
    if (c0 && V.y1 < first.startY) {
      const sky=ctx.createLinearGradient(0,first.startY-350,0,first.startY);sky.addColorStop(0,first.theme==='escuela'?'#22538a':c0.above);sky.addColorStop(1,c0.above);ctx.fillStyle=sky;ctx.fillRect(V.x1,V.y1,V.x2-V.x1,first.startY-V.y1+1);
      if(W.schoolMission){const A=first.map.worldArt,im=image(A.dir+A.pages[0]),k=first.scale*A.px,dx=first.x0-(A.x0||0)*k;if(ready(im))ctx.drawImage(im,0,0,im.naturalWidth,Math.max(1,im.naturalHeight/A.pageH),dx,V.y1,A.width*k,first.startY-V.y1+1);}
    }
    if (c1 && V.y2 > last.endY) fillRect(V.x1, last.endY - 1, V.x2 - V.x1, V.y2 - last.endY + 1, c1.below);
    for (const sc of list) {
      if (sc.endY < V.y1 - 2 || sc.startY > V.y2 + 2) continue;
      const cfg = depthCfg(sc), A = sc.map.worldArt, k = sc.scale * A.px;
      const dhPage = A.pageH * k;
      const pageAt = (y) => Math.max(0, Math.min(A.pages.length - 1, Math.floor((y - sc.startY) / dhPage)));
      const from = pageAt(V.y1), to = pageAt(V.y2), preloadTo = pageAt(V.y2 + 140);
      if (preloadTo > to) image(A.dir + A.pages[preloadTo]);
      sc.missingArt = false;
      if (ropt.depthPages !== false) for (let i = from; i <= to; i++) {
        const im = image(A.dir + A.pages[i]);
        if (!ready(im)) {
          sc.missingArt = true;
          const top = Math.max(V.y1, sc.startY + i * dhPage);
          const bottom = Math.min(V.y2, sc.startY + (i + 1) * dhPage);
          if (bottom > top) fillRect(V.x1, top, V.x2 - V.x1, bottom - top, cfg.above);
          continue;
        }
        const dy = sc.startY + i * A.pageH * k, dh = A.pageH * k, dx = sc.x0 - (A.x0 || 0) * k, dw = A.width * k;
        const x1 = Math.max(V.x1, dx), x2 = Math.min(V.x2, dx + dw), y1 = Math.max(V.y1, dy), y2 = Math.min(V.y2, dy + dh);
        if (x2 <= x1 || y2 <= y1) continue;
        // Medio px de solape con la página siguiente (sin costura por redondeo), sin salirse de la imagen.
        const sy = (y1 - dy) / k, sh = Math.min(A.pageH - sy, (y2 - y1) / k + 0.5);
        const sourceScaleX = im.naturalWidth / A.width, sourceScaleY = im.naturalHeight / A.pageH;
        if (sh > 0) ctx.drawImage(im, (x1 - dx) / k * sourceScaleX, sy * sourceScaleY,
          (x2 - x1) / k * sourceScaleX, sh * sourceScaleY, x1, y1, x2 - x1, sh * k);
      }
      // Fundido del pie de la última lámina hacia su color de borde (sin corte recto sobre la salida).
      if (sc === last && !W.schoolMission && V.y2 > sc.endY - 90) {
        const g = ctx.createLinearGradient(0, sc.endY - 90, 0, sc.endY);
        g.addColorStop(0, hexA(cfg.below, 0)); g.addColorStop(1, hexA(cfg.below, 1));
        ctx.fillStyle = g; ctx.fillRect(V.x1, sc.endY - 90, V.x2 - V.x1, 90);
      }
      const groups = ropt.depthFx === false || !cfg.fx.length ? null : depthFx(sc.theme, cfg);
      if (groups && groups.length && qScale >= 0.78) {   // modo ligero: el arte solo (las capas de ambiente cuestan dibujo)
        const v = G.view, xx1 = Math.max(V.x1, B.x1), xx2 = Math.min(V.x2, B.x2), yy1 = Math.max(V.y1, sc.startY), yy2 = Math.min(V.y2, sc.endY);
        const width = B.x2 - B.x1, vw = Math.min(width, v.w), vh = Math.min(sc.drawH, v.h);
        const xTravel = Math.max(0, width - vw), yTravel = Math.max(0, sc.drawH - vh);
        const xP = Math.max(0, Math.min(xTravel, G.cam.x - B.x1)), yP = Math.max(0, Math.min(yTravel, G.cam.y - sc.startY));
        for (const g of groups) {
          if (g.tile) { drawDepthTiles(g, G, sc, B, xx1, xx2, yy1, yy2); continue; }
          const dw = xTravel * g.f + vw + 220, dh = yTravel * g.f + vh + 180;
          const dx = B.x1 + xP * (1 - g.f) - 110, dy = sc.startY + yP * (1 - g.f) - 90;
          const x1 = Math.max(xx1, dx), y1 = Math.max(yy1, dy), x2 = Math.min(xx2, dx + dw), y2 = Math.min(yy2, dy + dh);
          if (x2 <= x1 || y2 <= y1) continue;
          const iw = g.canvas.width, ih = g.canvas.height;
          ctx.drawImage(g.canvas, (x1 - dx) * iw / dw, (y1 - dy) * ih / dh, (x2 - x1) * iw / dw, (y2 - y1) * ih / dh, x1, y1, x2 - x1, y2 - y1);
        }
      }
    }
    // Unión entre dos láminas apiladas (misión 1): bruma corta del color del cielo de la siguiente, sin corte seco.
    for (let i = 0; i + 1 < W.scenes.length; i++) {
      const a = W.scenes[i], b = W.scenes[i + 1], cb = depthCfg(b);
      if (!depthCfg(a) || !cb || Math.abs(a.endY - b.startY) > 1 || a.endY < V.y1 - 90 || a.endY > V.y2 + 60) continue;
      const g = ctx.createLinearGradient(0, a.endY - 90, 0, a.endY + 50);
      g.addColorStop(0, hexA(cb.above, 0)); g.addColorStop(0.64, hexA(cb.above, 0.62)); g.addColorStop(1, hexA(cb.above, 0));
      ctx.fillStyle = g; ctx.fillRect(V.x1, a.endY - 90, V.x2 - V.x1, 140);
    }
    return list.length === W.scenes.length;
  }
  function backdropUrls() {
    const out = new Set();
    for (const b of Object.values(BACKDROPS)) for (const part of [b.top, b.bottom]) for (const [srcs] of part || []) for (const src of srcs) out.add(src);
    for (const src of depthUrls()) if (!/\/layers\//.test(src)) out.add(src);   // V58.1: páginas de los mundos pintados
    out.add(UFO.src);
    return [...out];
  }

  /* Planos fundidos (cielo + nubes, arquitectura + vegetación): se componen una vez y se guardan (máx. 6). */
  const fused = new Map();
  function planeImage(srcs) {
    if (srcs.length === 1) { const im = image(srcs[0]); return ready(im) ? im : null; }
    const key = srcs.join('|');
    if (fused.has(key)) { const c = fused.get(key); fused.delete(key); fused.set(key, c); return c; }
    const ims = srcs.map(image);
    if (!ims.every(ready)) return ready(ims[0]) ? ims[0] : null;
    const c = document.createElement('canvas');
    c.width = ims[0].naturalWidth; c.height = ims[0].naturalHeight;
    const x = c.getContext('2d');
    for (const im of ims) x.drawImage(im, 0, 0, c.width, c.height);
    fused.set(key, c);
    if (fused.size > 8) fused.delete(fused.keys().next().value);
    return c;
  }

  /** Dibuja la parte visible (clip) de una imagen colocada en (dx, dy, dw, dh); `flip` la refleja en horizontal. */
  function blitCrop(im, dx, dy, dw, dh, flip, clip, sx0 = 0, sy0 = 0, sw0 = 0, sh0 = 0) {
    const x1 = Math.max(dx, clip.x1), y1 = Math.max(dy, clip.y1), x2 = Math.min(dx + dw, clip.x2), y2 = Math.min(dy + dh, clip.y2);
    if (x2 <= x1 || y2 <= y1) return;
    const iw = sw0 || im.naturalWidth || im.width, ih = sh0 || im.naturalHeight || im.height, kx = iw / dw, ky = ih / dh;
    const sy = sy0 + Math.max(0, (y1 - dy) * ky), sh = Math.min(ih - (sy - sy0), (y2 - y1) * ky);
    const sx = flip ? (dx + dw - x2) * kx : (x1 - dx) * kx, sw = Math.min(iw - sx, (x2 - x1) * kx);
    if (sw <= 0 || sh <= 0) return;
    if (!flip) { ctx.drawImage(im, sx0 + Math.max(0, sx), sy, sw, sh, x1, y1, x2 - x1, y2 - y1); return; }
    ctx.save(); ctx.translate(x1 + x2, 0); ctx.scale(-1, 1);
    ctx.drawImage(im, sx0 + Math.max(0, sx), sy, sw, sh, x1, y1, x2 - x1, y2 - y1);
    ctx.restore();
  }

  /** Capa escalada a la altura de la franja (+8 % de margen) con paralaje; mosaico espejo si no cubre el ancho. */
  function drawBandLayer(im, band, speed, camCx, camCy, clip) {
    const bw = band.x2 - band.x1, bh = band.y2 - band.y1;
    const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    if (!iw || !ih) return;
    const s = (bh / ih) * 1.08, tw = iw * s, th = ih * s, k = 1 - speed;
    const oy = Math.max(-0.035 * th, Math.min(0.035 * th, -(camCy - (band.y1 + band.y2) / 2) * k * 0.08));
    const top = band.y1 + (bh - th) / 2 + oy;
    const ox = -(camCx - (band.x1 + band.x2) / 2) * k * 0.3;
    if (tw >= bw) {
      const slack = (tw - bw) / 2;
      blitCrop(im, (band.x1 + band.x2) / 2 - tw / 2 + Math.max(-slack, Math.min(slack, ox)), top, tw, th, false, clip);
      return;
    }
    const period = 2 * tw, start = band.x1 + (((ox % period) + period) % period) - period;
    for (let j = 0, x = start; x < band.x2; j++, x += tw) {
      if (x + tw < clip.x1 || x > clip.x2) continue;
      blitCrop(im, x, top, tw + 0.5, th, j % 2 === 1, clip);
    }
  }

  function drawSceneBands(G, V) {
    const W = G.world, B = W.bounds, v = G.view, camCx = G.cam.x + v.w / 2, camCy = G.cam.y + v.h / 2;
    const n = W.scenes.length;
    for (let i = 0; i < n; i++) {
      const sc = W.scenes[i];
      if (depthCfg(sc)) continue;   // mundo pintado: lo dibuja drawDepthArt
      const y1 = i === 0 ? Math.min(sc.startY, B.y1) - 80 : sc.startY, y2 = i === n - 1 ? B.y2 + 240 : sc.endY;
      if (y2 < V.y1 || y1 > V.y2) continue;
      const split = sc.map.art && sc.map.art.length ? sc.startY + sc.map.art[0].h * sc.scale : sc.endY;
      const bd = BACKDROPS[sc.id] || {};
      const own = sceneSource(sc);
      sc.missingArt = !own;
      for (const [a, b, layers] of [[y1, split, bd.top], [split, y2, bd.bottom]]) {
        if (b <= a || b < V.y1 || a > V.y2) continue;
        const band = { x1: B.x1 - 80, x2: B.x2 + 80, y1: a, y2: b };
        const clip = { x1: Math.max(V.x1, band.x1), y1: Math.max(V.y1, a), x2: Math.min(V.x2, band.x2), y2: Math.min(V.y2, b) };
        if (clip.x2 <= clip.x1 || clip.y2 <= clip.y1) continue;
        // En la mitad pintada el dibujo del nivel tapa el centro: el fondo solo se pinta a los lados (menos sobredibujo).
        const painted = sc.artPainted && own && a < split && sc.map.art;
        const clips = painted
          ? [{ x1: clip.x1, y1: clip.y1, x2: Math.min(clip.x2, sc.x0), y2: clip.y2 }, { x1: Math.max(clip.x1, sc.x0 + sc.drawW), y1: clip.y1, x2: clip.x2, y2: clip.y2 }].filter((c) => c.x2 > c.x1)
          : [clip];
        let drawn = false;
        if (layers) {
          // Modo ligero: si el bucle ya bajó la resolución (equipo lento), todo el fondo es un solo plano fundido.
          const lite = qScale < 0.7 && layers.length > 1;
          const planes = lite ? [[planeImage(layers.flatMap(([srcs]) => srcs)), layers[layers.length - 1][1]]] : layers.map(([srcs, sp]) => [planeImage(srcs), sp]);
          if (planes[0][0]) { for (const [im, sp] of planes) if (im) for (const c of clips) drawBandLayer(im, band, sp, camCx, camCy, c); drawn = true; }
        }
        // Un arte pintado con regiones `map.art` cubre el panel central. Si falla su capa parallax externa, no repetir
        // la ilustración panorámica como arquitectura lateral: se deja el relleno neutro de abajo como respaldo.
        if (!drawn && own && !(sc.artPainted && sc.map.art && sc.map.art.length)) { for (const c of clips) drawBandLayer(own, band, 0.12, camCx, camCy, c); drawn = true; }
        if (!drawn) for (const c of clips) fillRect(c.x1, c.y1, c.x2 - c.x1, c.y2 - c.y1, sc.theme === 'escuela' ? '#233b4a' : '#342f36');
        // Velo del tramo: separa la acción del fondo sin apagar el arte.
        for (const c of clips) fillRect(c.x1, c.y1, c.x2 - c.x1, c.y2 - c.y1, hex(sc.wash), Math.min(0.42, sc.shade * 0.9 + 0.1));
        // Unión suave con la franja de arriba (cambio de arte entre tramos o entre mitades).
        if (a > y1 || i > 0) {
          const fade = Math.min(110, (b - a) * 0.2);
          if (a + fade > V.y1 && a < V.y2) {
            const g = ctx.createLinearGradient(0, a, 0, a + fade);
            g.addColorStop(0, 'rgba(6,10,18,0.6)'); g.addColorStop(1, 'rgba(6,10,18,0)');
            ctx.fillStyle = g; ctx.fillRect(clip.x1, a, clip.x2 - clip.x1, fade);
          }
        }
      }
      // Niveles con arte pintado: la mitad alta muestra el dibujo exacto (y su espejo), porque la colisión se trazó encima.
      if (sc.artPainted && own && sc.map.art) {
        for (const r of sc.map.art) {
          const dx = sc.x0 + r.x * sc.scale, dy = sc.startY + r.y * sc.scale, dw = r.w * sc.scale, dh = r.h * sc.scale;
          if (!inView(V, dx, dy, dx + dw, dy + dh)) continue;
          blitCrop(own, dx, dy, dw, dh, r.flip, V);
          // V58.1 · Capa de cornisas del arte PRO (Guadalajara): pintada en las colisiones reales de este mapa, con el
          // mismo tinte del fondo. Donde el doble de V58 abrió un corte al centro, la cornisa no se pinta (sería piso falso).
          const ov = sc.def.overlay ? tintedImage(sc.def.overlay, sc.tint, sceneArtW(sc)) : null;
          if (ov) {
            const gaps = (sc.map.seamGaps || []).map((g) => ({ x1: sc.x0 + g.x1 * sc.scale, x2: sc.x0 + g.x2 * sc.scale, y: sc.startY + g.y * sc.scale }))
              .filter((g) => g.x2 > dx && g.x1 < dx + dw && g.y > dy && g.y < dy + dh);
            if (gaps.length) {
              ctx.save(); ctx.beginPath(); ctx.rect(dx, dy, dw, dh);
              for (const g of gaps) ctx.rect(g.x2, g.y - 40, g.x1 - g.x2, 80);   // sentido contrario: agujero (regla nonzero)
              ctx.clip();
            }
            blitCrop(ov, dx, dy, dw, dh, r.flip, V);
            if (gaps.length) ctx.restore();
          }
          // Rótulos: en la copia espejo se vuelven a pintar al derecho (si no, se leerían al revés).
          if (r.flip && r.text) {
            // Los rectángulos están en px del arte original (1 px por unidad de mapa); el lienzo puede estar reducido.
            const iw = own.naturalWidth || own.width, k = dw / iw, q = iw / r.w;
            for (const [tx0, ty0, tw0, th0] of r.text) {
              const tx = tx0 * q, ty = ty0 * q, tw = tw0 * q, th = th0 * q;
              blitCrop(own, dx + (iw - tx - tw) * k, dy + ty * k, tw * k, th * k, false, V, tx, ty, tw, th);
            }
          }
          if (sc.shade > 0) fillRect(Math.max(dx, V.x1), Math.max(dy, V.y1), Math.min(dx + dw, V.x2) - Math.max(dx, V.x1), Math.min(dy + dh, V.y2) - Math.max(dy, V.y1), hex(sc.wash), sc.shade);
        }
      }
    }
  }

  /* ---------- V58 · Tirolesas ---------- */
  function poleBase(W, x, y) {
    let best = Infinity;
    for (const p of W.platforms) if (p.region === 'main' && x >= p.x1 - 2 && x <= p.x2 + 2 && p.y > y + 4 && p.y < y + 230 && p.y < best) best = p.y;
    return best === Infinity ? y + 38 : best;
  }
  const ZIP_COLORS = { cable: ['#1d1a17', '#c9d2d8'], tendedero: ['#efe6d2', '#ffffff'], alga: ['#2f8f63', '#8ff0b8'], anclaje: ['#355a7a', '#9ee7ff'],
    cuerda: ['#7a5432', '#d8b98a'] };
  function drawZips(G, V, T) {
    for (const z of G.world.zips || []) {
      const x1 = Math.min(z.ax, z.bx), x2 = Math.max(z.ax, z.bx);
      if (x2 < V.x1 - 30 || x1 > V.x2 + 30 || z.by < V.y1 - 30 || z.ay > V.y2 + 240) continue;
      // V58.1: la cadena del barco ya está pintada (y la cuerda se ata al mirador y a una palmera): sin postes de metal;
      // en la pintada solo se ven las señales de sentido, tenues.
      const painted = !!z.painted, rope = z.look === 'cuerda';
      if (!painted) {
        if (z.poleA === undefined) { z.poleA = poleBase(G.world, z.ax, z.ay); z.poleB = poleBase(G.world, z.bx, z.by); }
        const [c1, c2] = ZIP_COLORS[z.look] || ZIP_COLORS.cable;
        if (rope) for (const [x, y] of [[z.ax, z.ay], [z.bx, z.by]]) { circle(x, y, 4.5, '#5a3b22'); circle(x, y, 2.2, '#c79a5e'); }
        else for (const [x, y, yb] of [[z.ax, z.ay, z.poleA], [z.bx, z.by, z.poleB]]) {
          fillRect(x - 3, y - 8, 6, yb - y + 8, '#2c3138'); fillRect(x - 1, y - 8, 2, yb - y + 8, '#8a929c', 0.55);
          fillRect(x - 9, y - 10, 18, 4, '#2c3138'); circle(x, y, 4.2, '#c9d2d8'); circle(x, y, 1.8, '#2c3138');
        }
        line(z.ax, z.ay, z.bx, z.by, c1, 1, rope ? 3.2 : 2.6);
        line(z.ax, z.ay - 1, z.bx, z.by - 1, c2, 0.55, 1);
        if (rope) for (let s = 8; s < z.len - 6; s += 9) { const px = z.ax + z.ux * s, py = z.ay + z.uy * s; line(px - 2, py - 1.5, px + 2, py + 1.5, '#4a2f1b', 0.6, 1); }
      }
      // Señales de sentido que avanzan por el cable.
      for (let s = ((T * 70) % 80) + 20; s < z.len - 20; s += 80) {
        const px = z.ax + z.ux * s, py = z.ay + z.uy * s;
        tri(px + z.ux * 5, py + z.uy * 5 - 3, px - z.ux * 4, py - z.uy * 4 - 7, px - z.ux * 4, py - z.uy * 4 + 1, '#d9ff65', painted ? 0.32 : 0.55);
      }
      if (z.look === 'tendedero') for (let s = 30, k = 0; s < z.len - 24; s += 34, k++) {
        const px = z.ax + z.ux * s, py = z.ay + z.uy * s;
        fillRect(px - 6, py + 1, 12, 13 + (k % 3) * 3, ['#ff5d8f', '#ffd166', '#06d6a0', '#4cc9f0'][k % 4], 0.85);
      }
      if (z.look === 'alga') for (let s = 26, k = 0; s < z.len - 20; s += 30, k++) {
        const px = z.ax + z.ux * s, py = z.ay + z.uy * s, sw = Math.sin(T * 2 + k) * 3;
        line(px, py, px + sw, py + 12, '#3fae7a', 0.8, 2.2);
      }
    }
  }

  /* ---------- V58.2 · Cuerdas para columpiarse ----------
     columpio: estructura de patio (dos postes en A y travesaño) con llanta; liana: rama y bejuco con hojas;
     cable: viga metálica y cable de acero. Si Sofía cuelga, la cuerda sigue su ángulo; suelta, oscila y se calma. */
  function drawRopes(G, V, T) {
    const P = G.P, R = NS.CONFIG.rope;
    for (const r of G.world.ropes || []) {
      if (r.ax < V.x1 - 220 || r.ax > V.x2 + 220 || r.ay > V.y2 + 20 || r.ay + r.len < V.y1 - 200) continue;
      const held = P.rope === r;
      let a = held ? P.ropeA : Math.sin(T * 1.3 + r.ax * 0.01) * 0.045;
      if (!held && r.relT !== undefined) { const dtR = G.world.t - r.relT; if (dtR < 4) a += r.relA * Math.exp(-1.2 * dtR) * Math.cos(dtR * 3.4); }
      const tipX = r.ax + Math.sin(a) * r.len, tipY = r.ay + Math.cos(a) * r.len;
      if (r.look === 'columpio') {
        const base = r.base || r.ay + 290, half = 150;
        for (const sx of [-1, 1]) { line(r.ax + sx * half, r.ay, r.ax + sx * (half + 26), base, '#2f6fae', 1, 5); line(r.ax + sx * half, r.ay, r.ax + sx * (half - 26), base, '#2f6fae', 1, 5); }
        fillRR(r.ax - half - 8, r.ay - 6, half * 2 + 16, 9, 3, '#e8453c');
        line(r.ax - 8, r.ay, tipX - 8, tipY, '#6b6f78', 1, 1.8); line(r.ax + 8, r.ay, tipX + 8, tipY, '#6b6f78', 1, 1.8);
        ctx.save(); ctx.translate(tipX, tipY + 6); ctx.rotate(-a); fillRR(-15, -3, 30, 9, 4, '#262a30'); fillRR(-11, -1, 22, 4, 2, '#4a5059'); ctx.restore();
      } else if (r.look === 'liana') {
        fillRR(r.ax - 34, r.ay - 9, 68, 12, 6, '#5a3b22'); circle(r.ax - 30, r.ay - 10, 9, '#2f8f3e', 0.9); circle(r.ax + 28, r.ay - 12, 11, '#3fae4f', 0.9); circle(r.ax + 2, r.ay - 15, 10, '#2f8f3e', 0.9);
        line(r.ax, r.ay, tipX, tipY, '#3d7a2a', 1, 4); line(r.ax, r.ay, tipX, tipY, '#7fc95a', 0.7, 1.4);
        for (let k = 0.15; k < 1; k += 0.17) { const lx = r.ax + Math.sin(a) * r.len * k, ly = r.ay + Math.cos(a) * r.len * k; ellipse(lx + 5, ly, 5, 2.6, '#4fb85a', 0.9); }
      } else {
        fillRR(r.ax - 30, r.ay - 8, 60, 10, 3, '#8a96a8'); fillRect(r.ax - 30, r.ay - 8, 60, 2, '#d7e3f2');
        line(r.ax, r.ay, tipX, tipY, '#c9d2d8', 1, 2.4); line(r.ax, r.ay, tipX, tipY, '#4a5664', 0.6, 0.8);
        ring(tipX, tipY + 3, 5, 5, '#9ee7ff', 0.9, 2);
      }
      if (!held && G.state === 'playing' && Math.hypot(P.x - r.ax, P.y - (r.ay + r.len)) < 260) {
        tri(tipX - 6, tipY + 18, tipX + 6, tipY + 18, tipX, tipY + 10, '#d9ff65', 0.45 + 0.35 * Math.sin(T * 6));   // aviso: se puede agarrar
      }
    }
  }

  /* ---------- V58 · Vehículos y trampolines con aspecto ---------- */
  function drawLookPlatform(p, T, G) {
    const x = p.x1, y = p.y, w = p.x2 - p.x1, look = p.look, mv = p.dx || 0;
    if (look === 'camion') {
      const bus = image(BUS_FRAMES[0]);
      if (ready(bus)) {
        const k = w / 490, dw = 512 * k, dh = 341 * k;
        ctx.save();
        if (mv < 0) { ctx.translate(x + w / 2, 0); ctx.scale(-1, 1); ctx.translate(-(x + w / 2), 0); }
        ctx.drawImage(bus, x - 14 * k, y - 70 * k + Math.sin(T * 30) * 0.4, dw, dh);
        ctx.restore();
        fillRect(x + 6, y - 1, w - 12, 3, '#d9ff65', 0.55);
        return;
      }
    }
    if (look === 'nave') {
      // V58.1: el OVNI de la capa de naves de la Luna V5; Sofía pisa el borde del platillo (la cúpula queda detrás).
      const sheet = image(UFO.src);
      if (ready(sheet)) {
        const r = UFO.box, dw = w * 1.18, dh = dw * r[3] / r[2], bob = Math.sin(T * 2.2 + x * 0.01) * 0.8;
        ellipse(x + w / 2, y + dh * 0.62, dw * 0.32, 5, '#b98cff', 0.25 + 0.12 * Math.sin(T * 5 + x));   // haz bajo el platillo
        ctx.drawImage(sheet, r[0], r[1], r[2], r[3], x + w / 2 - dw / 2, y - dh * UFO.rim + bob, dw, dh);
        fillRect(x + 8, y - 1, w - 16, 2, '#c9b5ff', 0.5);
        return;
      }
    }
    if (look === 'pez') {
      // V58.1: pez tropical dibujado (naranja con franjas, como los del arrecife del arte V4); el lomo es la plataforma.
      const bh = Math.max(14, w * 0.34), wag = Math.sin(T * 7 + x * 0.05) * 0.35;
      ctx.save(); ctx.translate(x + w / 2, y + bh * 0.52);
      if (mv < 0) ctx.scale(-1, 1);
      ctx.rotate(Math.sin(T * 3 + x) * 0.04);
      ctx.save(); ctx.translate(-w * 0.46, 0); ctx.rotate(wag);
      ctx.fillStyle = '#e8641f'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-w * 0.24, -bh * 0.55); ctx.quadraticCurveTo(-w * 0.17, 0, -w * 0.24, bh * 0.55); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#f08a2a'; ctx.beginPath(); ctx.moveTo(-w * 0.12, -bh * 0.46); ctx.quadraticCurveTo(w * 0.06, -bh * 0.95, w * 0.2, -bh * 0.44); ctx.closePath(); ctx.fill();
      ellipse(0, 0, w * 0.5, bh * 0.5, '#f58a24');
      ellipse(w * 0.05, -bh * 0.12, w * 0.4, bh * 0.28, '#ffb04a', 0.85);
      for (const sx of [-0.16, 0.18]) { ctx.fillStyle = '#fff6ea'; ctx.beginPath(); ctx.ellipse(w * sx, 0, w * 0.05, bh * 0.47, 0, 0, Math.PI * 2); ctx.fill(); }
      circle(w * 0.36, -bh * 0.1, Math.max(2, bh * 0.12), '#fffdf5'); circle(w * 0.37, -bh * 0.1, Math.max(1.2, bh * 0.07), '#1a1410');
      ctx.restore();
      tri(x + w / 2 - 6, y - 12, x + w / 2 + 6, y - 12, x + w / 2, y - 20, '#ffe27a', 0.45 + 0.3 * Math.sin(T * 6 + x));
      return;
    }
    if (look === 'bote') {
      // V58.1: barca de madera (misma madera que el puente de cuerda del arte) flotando en la superficie.
      const bob = Math.sin(T * 1.6 + x * 0.01) * 1.2;
      ctx.save(); ctx.translate(0, bob);
      ctx.fillStyle = '#6b4226'; ctx.beginPath(); ctx.moveTo(x - 10, y - 2); ctx.lineTo(x + w + 10, y - 2);
      ctx.quadraticCurveTo(x + w + 2, y + 17, x + w - 14, y + 19); ctx.lineTo(x + 14, y + 19); ctx.quadraticCurveTo(x - 2, y + 17, x - 10, y - 2); ctx.fill();
      for (let i = 1; i <= 2; i++) line(x - 6 + i * 2, y + i * 6, x + w + 6 - i * 2, y + i * 6, '#4a2c18', 0.8, 1.2);
      fillRR(x - 10, y - 4, w + 20, 5, 2, '#c79a5e');
      fillRect(x + w * 0.3, y - 2, 4, 6, '#8a5a35'); fillRect(x + w * 0.66, y - 2, 4, 6, '#8a5a35');
      line(x + w * 0.62, y - 10, x + w + 22, y + 20, '#a07448', 0.95, 2.4);   // remo
      ctx.restore();
      return;
    }
    if (look === 'manta') {
      const flap = Math.sin(T * 3 + x * 0.01) * 6;
      ctx.save(); ctx.translate(x + w / 2, y + 7); if (mv < 0) ctx.scale(-1, 1);
      ctx.fillStyle = '#28546f'; ctx.beginPath(); ctx.moveTo(-w / 2, flap); ctx.quadraticCurveTo(-w * 0.2, -6, w * 0.32, -3); ctx.lineTo(w / 2, 2);
      ctx.quadraticCurveTo(w * 0.1, 10, -w / 2, flap); ctx.fill();
      ctx.fillStyle = '#3f7c99'; ctx.beginPath(); ctx.ellipse(w * 0.05, -1, w * 0.3, 5, 0, 0, Math.PI * 2); ctx.fill();
      line(-w / 2, flap, -w / 2 - 26, flap + 8, '#1c3d52', 1, 2);
      circle(w * 0.3, -2, 1.6, '#e8fbff'); ctx.restore();
      fillRect(x + 8, y - 1, w - 16, 2, '#9ff3ff', 0.5);
      return;
    }
    if (look === 'balsa') {
      for (let i = 0; i < 4; i++) { fillRR(x, y + i * 3.2 - 1, w, 6, 3, i % 2 ? '#8a5a35' : '#9b6a40'); }
      line(x + 10, y - 1, x + 10, y + 12, '#e8d7a8', 0.9, 1.5); line(x + w - 10, y - 1, x + w - 10, y + 12, '#e8d7a8', 0.9, 1.5);
      return;
    }
    if (look === 'tren') {
      fillRR(x - 4, y, w + 8, 32, 7, '#c9cfd3'); fillRect(x - 4, y + 22, w + 8, 6, '#7a1f3d');
      for (let wx = x + 8; wx < x + w - 18; wx += 26) { fillRR(wx, y + 6, 18, 12, 2, '#16303d'); fillRect(wx + 2, y + 8, 14, 8, '#ffe6a0', 0.35); }
      circle(x + 14, y + 33, 5, '#101418'); circle(x + w - 14, y + 33, 5, '#101418');
      fillRect(x, y - 1, w, 2.5, '#d9ff65', 0.6);
      return;
    }
    if (look === 'carrito') {
      const c = p.theme === 'escuela' ? '#2f9a6a' : '#d6453b';
      fillRR(x + 2, y, w - 4, 20, 4, c); fillRect(x + 2, y, w - 4, 3, '#f4efe4');
      for (let sx = x + 10; sx < x + w - 10; sx += 18) fillRect(sx, y + 6, 8, 9, '#f6c344', 0.75);
      circle(x + 14, y + 23, 5, '#101418'); circle(x + w - 14, y + 23, 5, '#101418'); circle(x + 14, y + 23, 2, '#8b969c'); circle(x + w - 14, y + 23, 2, '#8b969c');
      return;
    }
    // Sin aspecto propio o sin imagen: la tarima de siempre.
    if (!drawSkinned('hazard', x, x + w, y, SKIN_H.moving)) fillRR(x, y, w, 10, 3, '#8d5639');
  }

  function drawCoral(s, V) {
    const x1 = s.x1, w = s.x2 - s.x1, top = Math.max(s.y1, V.y1 - 10), bot = Math.min(s.y2, V.y2 + 10);
    if (bot <= top) return;
    const g = ctx.createLinearGradient(x1, 0, x1 + w, 0);
    g.addColorStop(0, '#9c3f7a'); g.addColorStop(0.5, '#ff7aa2'); g.addColorStop(1, '#b8487e');
    ctx.fillStyle = g; rr(x1, top, w, bot - top, 10); ctx.fill();
    for (let yy = Math.ceil(top / 26) * 26; yy < bot; yy += 26) {
      circle(x1 + 4, yy + 6, 6, '#ff9ab8', 0.8); circle(x1 + w - 4, yy + 18, 5, '#ffb07a', 0.75); circle(x1 + w / 2, yy + 12, 2.5, '#fff1f4', 0.6);
    }
    if (s.y1 >= V.y1 - 20) for (let i = 0; i < 4; i++) line(x1 + 6 + i * (w - 12) / 3, s.y1, x1 + 2 + i * (w - 8) / 3, s.y1 - 14 - (i % 2) * 6, '#ff9ab8', 0.9, 3);
  }

  function drawCascades(G, V, T) {
    for (const z of G.world.waters || []) {
      for (const d of z.drains || []) {
        if (d.x2 < V.x1 || d.x1 > V.x2 || z.y2 > V.y2) continue;
        // V58.1: bajo una brecha del mar pintado la cascada se deshace en el agua si no hay repisa cerca (sin salpicar el aire).
        if (d.fallTo === undefined) {
          const cx = (d.x1 + d.x2) / 2, pb = poleBase(G.world, cx, z.y2 + 12);
          const near = G.world.platforms.some((p) => p.region === 'main' && p.kind !== 'moving' && cx >= p.x1 - 2 && cx <= p.x2 + 2 && p.y > z.y2 + 16 && p.y < z.y2 + 200);
          d.splash = !z.breach || near; d.fallTo = d.splash ? pb : z.y2 + 240;
        }
        const y1 = z.y2, y2 = Math.min(d.fallTo, V.y2 + 20), w = d.x2 - d.x1;
        if (y2 <= V.y1) continue;
        const g = ctx.createLinearGradient(0, y1, 0, d.splash ? y2 : d.fallTo);
        g.addColorStop(0, 'rgba(120,220,255,0.55)'); g.addColorStop(1, d.splash ? 'rgba(120,220,255,0.12)' : 'rgba(120,220,255,0)');
        ctx.fillStyle = g; ctx.fillRect(d.x1 + 4, y1, w - 8, y2 - y1);
        for (let i = 0; i < 5; i++) {
          const sx = d.x1 + 8 + i * (w - 16) / 4, off = (T * 260 + i * 37) % 60;
          for (let yy = y1 + off; yy < y2; yy += 60) line(sx, yy, sx, Math.min(y2, yy + 22), '#e9fbff', 0.5, 1.6);
        }
        if (d.splash) ellipse((d.x1 + d.x2) / 2, d.fallTo, w * 0.6, 6, '#e9fbff', 0.35 + 0.15 * Math.sin(T * 8));
      }
    }
  }

  function drawBackdrop(G, V) {
    const top = G.world.scenes[0];
    if (top.theme === 'guadalajara' && V.y1 < top.startY) {
      const sky = image('assets/parallax/guadalajara_v584/00_cielo_atardecer.webp');
      const h = top.startY - V.y1;
      if (ready(sky)) ctx.drawImage(sky, V.x1, V.y1, V.x2 - V.x1, h);
    }
    drawSceneBands(G, V);
  }

  /* V56 · Capa de atmósfera urbana. Decoración determinista sin colisiones y
     recortada al área visible; mantiene intactos fondos, parallax y plataformas. */
  function drawToxiAtmosphere(G, V, T) {
    const art = NS.TOXI_STYLE;
    if (!art || G.room) return;
    for (const sc of G.world.scenes) {
      if (!inView(V, sc.x0, sc.startY, sc.x0 + sc.drawW, sc.endY)) continue;
      const p = art.forScene(sc);
      const x1 = Math.max(V.x1, sc.x0), x2 = Math.min(V.x2, sc.x0 + sc.drawW);
      const y1 = Math.max(V.y1, sc.startY), y2 = Math.min(V.y2, sc.endY);
      if (x2 <= x1 || y2 <= y1) continue;
      const iw = x2 - x1, ih = y2 - y1;
      ctx.save();
      ctx.beginPath(); ctx.rect(x1, y1, iw, ih); ctx.clip();
      // Velo muy tenue, sin oscurecer siluetas ni perder contraste del nivel. V58.1: en los mundos pintados de una pieza
      // (mar V4) no hay velo ni motivos: el arte trae su propio ambiente; solo queda el letrero del tramo.
      const paintedWorld = !!depthCfg(sc);
      if (!paintedWorld) fillRect(x1, y1, iw, ih, p.haze, p.intensity * 0.035);
      const left = sc.x0 + 17, right = sc.x0 + sc.drawW - 17;
      const first = Math.max(0, Math.floor((y1 - sc.startY) / 136));
      const last = Math.min(Math.ceil((sc.endY - sc.startY) / 136), Math.ceil((y2 - sc.startY) / 136));
      for (let n = first; n <= (paintedWorld ? first - 1 : last); n += 2) {
        const yy = sc.startY + 52 + n * 136;
        const h = hash(n + 37, (sc.index + 1) * 53) / 997;
        const drift = Math.sin(T * (p.motif === 'bubbles' ? 1.1 : 0.45) + n * 2.4) * (p.motif === 'bubbles' ? 9 : 3);
        const px = left + (right - left) * (0.17 + h * 0.67);
        if (p.motif === 'bubbles') {
          ring(px + drift, yy - (T * 14 % 44), 5 + (n % 3) * 2, 6 + (n % 3) * 2, p.accent, 0.33, 1.5);
          circle(px + 5, yy - 7, 1.5, '#c2faff', 0.65);
        } else if (p.motif === 'stardust') {
          line(px - 6, yy, px + 6, yy, p.accent, 0.34, 1.6);
          line(px, yy - 6, px, yy + 6, p.edge, 0.3, 1.3);
        } else if (p.motif === 'drip') {
          line(px, yy - 19, px, yy + 11 + Math.sin(T + n) * 5, p.accent, 0.32, 2);
          circle(px, yy + 16, 3, p.accent, 0.25);
        } else if (p.motif === 'caution') {
          line(left + 12, yy - 8, left + 37, yy - 8, p.accent, 0.35, 2);
          for (let k = 0; k < 3; k++) line(left + 13 + k * 8, yy - 10, left + 19 + k * 8, yy - 3, p.edge, 0.4, 2);
        } else if (p.motif === 'spores' || p.motif === 'smog') {
          circle(px + drift, yy, 3 + n % 4, p.accent, 0.14 + 0.05 * Math.sin(T + n) ** 2);
          ring(px - 13, yy - 13, 11, 7, p.edge, 0.07, 1);
        } else if (p.motif === 'antenna') {
          line(px, yy - 14, px, yy + 11, p.edge, 0.26, 1.4);
          circle(px, yy - 14, 3 + Math.sin(T * 2 + n) * 1.2, p.accent, 0.38);
        } else {
          line(px - 12, yy + 6, px + 15, yy - 2, p.edge, 0.21, 2);
          line(px - 8, yy - 6, px + 9, yy - 10, p.accent, 0.18, 2);
        }
      }
      // Identidad independiente por tramo: señal que aparece solo cerca del inicio.
      const plaqueY = sc.startY + 57;
      if (plaqueY >= y1 - 32 && plaqueY <= y2 + 32) {
        const x = sc.x0 + 12, w = Math.min(218, sc.drawW - 24);
        fillRR(x, plaqueY - 15, w, 30, 6, '#09111d', 0.64);
        fillRect(x + 2, plaqueY - 11, 3, 22, p.accent, 0.9);
        text(p.tag, x + 12, plaqueY, 9, p.accent, 'left', 850);
        line(x + 12, plaqueY + 9, x + w - 9, plaqueY + 9, p.edge, 0.58, 1);
      }
      ctx.restore();
    }
  }

  /* El indicador de amenaza no cambia hitboxes ni timings de ataque.
     Prioriza leer el amago, dirección de carga y momento de contraatacar. */
  function drawToxiThreat(f, T) {
    if (f.dead || !NS.TOXI_STYLE) return;
    const p = NS.TOXI_STYLE.forEnemy(f.kind);
    const flyer = !!(NS.Enemies.TYPES[f.kind] && NS.Enemies.TYPES[f.kind].flyer);
    const fy = flyer ? f.y : f.y - f.h * 0.55;
    const pulse = 0.5 + 0.5 * Math.sin(T * 10 + f.phase);
    if (f.isBoss && f.enraged) {
      ring(f.x, fy, f.w * 0.78 + pulse * 4, f.h * 0.85 + pulse * 4, p.color, 0.2 + pulse * 0.18, 2.1);
      for (let i = 0; i < 3; i++) {
        const a = T * 1.8 + i * 2.094;
        circle(f.x + Math.cos(a) * (f.w * 0.65), fy + Math.sin(a) * (f.h * 0.6), 2.6, p.color, 0.75);
      }
    }
    if (['windup', 'aim', 'telegraph', 'alert'].includes(f.state)) {
      const tipX = f.x + (f.dir || 1) * Math.max(20, f.w * 0.7);
      ring(f.x, fy, Math.max(18, f.w * 0.63) + 3 * pulse, Math.max(16, f.h * 0.7) + 2 * pulse, p.color, 0.32 + 0.2 * pulse, 2.2);
      line(f.x, fy, tipX, fy - 5, p.color, 0.55 + pulse * 0.26, 2.6);
      tri(tipX, fy - 10, tipX + (f.dir || 1) * 11, fy - 5, tipX, fy, p.color, 0.75);
      if (f.state === 'aim' || f.state === 'telegraph') {
        ring(tipX + (f.dir || 1) * 14, fy - 5, 9, 9, p.color, 0.35 + 0.18 * pulse, 1.6);
      }
    } else if (f.state === 'charge') {
      const d = f.dir || 1;
      for (let i = 0; i < 3; i++) {
        line(f.x - d * (12 + i * 9), fy - 10 + i * 6, f.x - d * (29 + i * 9), fy - 10 + i * 6, p.color, 0.42 - i * 0.11, 2);
      }
    } else if (f.state === 'dizzy') {
      ring(f.x, flyer ? f.y + 12 : f.y + 2, Math.max(16, f.w * 0.55), 6, '#dbff7a', 0.45 + pulse * 0.2, 2.3);
    }
  }

  function drawFallbackScene(sc) {
    const x = sc.x0, y = sc.startY, w = sc.drawW, h = sc.drawH, school = sc.theme === 'escuela';
    fillRect(x, y, w, h, school ? '#233b4a' : '#342f36');
    fillRect(x + w * 0.035, y + h * 0.08, w * 0.43, h * 0.76, school ? '#355567' : '#5d4a43');
    fillRect(x + w * 0.51, y + h * 0.18, w * 0.455, h * 0.67, school ? '#294451' : '#473a39');
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      const wx = x + w * (0.07 + c * 0.078), wy = y + h * (0.14 + r * 0.115);
      fillRR(wx, wy, w * 0.043, h * 0.066, 3, school ? '#0e2536' : '#211f2a', 0.93);
    }
  }

  /* V50 · Fondos.
     - art 'painted' (la colisión se trazó sobre el dibujo): se dibuja exacto, sin paralaje, para que las cornisas
       pintadas coincidan con donde se pisa.
     - Resto: el dibujo COMPLETO se ajusta al panel ("cover", antes se recortaba la esquina superior izquierda de
       los fondos 1080×1920) con un paralaje suave dentro de su franja, y un velo para que las plataformas resalten.
     - Sin archivo: fondo procedural (azoteas, metro, Tlaquepaque) pintado una vez en un lienzo. */
  const bgCache = new Map();
  const vignetteCache = new WeakMap(); // tramo → degradado de la viñeta (se rehace si cambia el mundo)
  function sceneSource(sc) {
    if (sc.file) return tintedImage(sc.file, sc.tint, sceneArtW(sc));
    if (!sc.bg) return null;
    if (bgCache.has(sc.bg)) return bgCache.get(sc.bg);
    const painter = PAINTERS[sc.bg];
    if (!painter) return null;
    const c = document.createElement('canvas');
    c.width = sc.map.width; c.height = sc.map.height;
    const ok = painter(c.getContext('2d'), c.width, c.height);
    if (ok === false) return null; // depende de una imagen que aún no carga: se reintenta
    bgCache.set(sc.bg, c);
    return c;
  }
  function drawScenes(G, V) {
    const v = G.view, camCx = G.cam.x + v.w / 2, camCy = G.cam.y + v.h / 2;
    for (const sc of G.world.scenes) {
      if (sc.theme === 'submarino' || sc.theme === 'espacial') continue; // fondo de ancho total, dibujado antes
      if (!inView(V, sc.x0, sc.startY, sc.x0 + sc.drawW, sc.endY)) continue;
      const im = sceneSource(sc);
      sc.missingArt = !im;
      const y1 = Math.max(sc.startY, V.y1), y2 = Math.min(sc.endY, V.y2);
      if (im) {
        const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
        if (sc.artPainted) {
          // Exacto: recorte de la fuente a la parte visible (menos píxeles que componer en móviles).
          const s = sc.drawH / ih, sy1 = Math.max(0, (V.y1 - sc.startY) / s), sy2 = Math.min(ih, (V.y2 - sc.startY) / s);
          if (sy2 > sy1) ctx.drawImage(im, 0, sy1, iw, sy2 - sy1, sc.x0, sc.startY + sy1 * s, sc.drawW, (sy2 - sy1) * s);
        } else {
          const PAR = 0.07;
          const k = Math.max(sc.drawW / iw, sc.drawH / ih) * (1 + PAR), dw = iw * k, dh = ih * k;
          const px = Math.max(-0.5, Math.min(0.5, (camCx - (sc.x0 + sc.drawW / 2)) / sc.drawW));
          const py = Math.max(-0.5, Math.min(0.5, (camCy - (sc.startY + sc.drawH / 2)) / sc.drawH));
          const dx = sc.x0 + (sc.drawW - dw) / 2 + (dw - sc.drawW) * px, dy = sc.startY + (sc.drawH - dh) / 2 + (dh - sc.drawH) * py;
          // Solo la parte visible del panel: rectángulo destino ∩ vista → rectángulo fuente.
          const vx1 = Math.max(sc.x0, V.x1), vx2 = Math.min(sc.x0 + sc.drawW, V.x2);
          if (vx2 > vx1 && y2 > y1) {
            const sx = (vx1 - dx) / k, sy = (y1 - dy) / k, sw = (vx2 - vx1) / k, sh = (y2 - y1) / k;
            ctx.drawImage(im, sx, sy, sw, sh, vx1, y1, vx2 - vx1, y2 - y1);
          }
        }
      } else drawFallbackScene(sc);
      const veil = sc.artPainted ? sc.shade : sc.shade + 0.1;
      if (veil > 0) fillRect(sc.x0, y1, sc.drawW, y2 - y1, hex(sc.wash), veil);
      if (!sc.artPainted) {
        // Viñeta lateral: separa el panel de los sectores y centra la mirada en el recorrido.
        // V51: el degradado se crea una vez por tramo (coordenadas del mundo) y solo se rellenan las dos franjas
        // donde no es transparente (12 % por lado). Antes se rellenaba el panel entero cada fotograma: en QA con la
        // CPU frenada ×6 era la capa más cara del dibujo (quitarla subía de ~27 a ~39 fps).
        let g = vignetteCache.get(sc);
        if (!g) {
          g = ctx.createLinearGradient(sc.x0, 0, sc.x0 + sc.drawW, 0);
          g.addColorStop(0, 'rgba(5,10,16,0.35)'); g.addColorStop(0.12, 'rgba(5,10,16,0)');
          g.addColorStop(0.88, 'rgba(5,10,16,0)'); g.addColorStop(1, 'rgba(5,10,16,0.35)');
          vignetteCache.set(sc, g);
        }
        const band = sc.drawW * 0.12;
        ctx.fillStyle = g;
        ctx.fillRect(sc.x0, y1, band, y2 - y1);
        ctx.fillRect(sc.x0 + sc.drawW - band, y1, band, y2 - y1);
      }
    }
  }

  /* ---------- Fondos procedurales de los niveles nuevos ---------- */
  function rngOf(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
  function skyGradient(x, w, h, stops) {
    const g = x.createLinearGradient(0, 0, 0, h);
    for (const [o, c] of stops) g.addColorStop(o, c);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }
  function skyline(x, w, base, minH, maxH, color, lit, r, winColor) {
    let px = -10;
    while (px < w + 10) {
      const bw = 26 + r() * 60, bh = minH + r() * (maxH - minH);
      x.fillStyle = color; x.fillRect(px, base - bh, bw, bh + 2);
      if (r() < 0.3) { x.fillRect(px + bw * 0.4, base - bh - 14, 3, 14); } // antena
      if (lit) {
        for (let wy = base - bh + 8; wy < base - 8; wy += 11) for (let wx = px + 5; wx < px + bw - 6; wx += 9) {
          if (r() < lit) { x.fillStyle = winColor; x.fillRect(wx, wy, 4, 5); }
        }
      }
      px += bw + 2 + r() * 8;
    }
  }
  /* V51 · Ayudas para los fondos procedurales (se pintan una sola vez y quedan en caché: no cuestan por fotograma). */
  function glow(x, cx, cy, rad, rgb, a) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  // Grano: motas claras y oscuras de 1–2 px que quitan lo "plano" de los rellenos lisos.
  function grain(x, x0, y0, w, h, r, density, alpha) {
    const n = Math.round(w * h * density);
    for (let i = 0; i < n; i++) {
      x.globalAlpha = alpha * (0.35 + r() * 0.65); x.fillStyle = r() < 0.5 ? '#000000' : '#ffffff';
      x.fillRect(x0 + ((r() * w) | 0), y0 + ((r() * h) | 0), 1 + ((r() * 2) | 0), 1);
    }
    x.globalAlpha = 1;
  }
  // Guirnalda de foquitos: cable colgado (curva) y focos con halo.
  function bulbs(x, x1, y1, x2, y2, sag, step, colors, r) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + sag * 2;
    x.strokeStyle = 'rgba(25,18,24,0.8)'; x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(x1, y1); x.quadraticCurveTo(mx, my, x2, y2); x.stroke();
    const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / step));
    for (let i = 1; i < n; i++) {
      const t = i / n, u = 1 - t;
      const bx = u * u * x1 + 2 * u * t * mx + t * t * x2, by = u * u * y1 + 2 * u * t * my + t * t * y2 + 4;
      const c = colors[(i + ((r() * 3) | 0)) % colors.length];
      glow(x, bx, by, 11, c, 0.35);
      x.fillStyle = `rgb(${c})`; x.beginPath(); x.arc(bx, by, 2.4, 0, Math.PI * 2); x.fill();
    }
  }
  const PAINTERS = {
    /* Azoteas de la colonia al anochecer: cielo, ciudad lejana (capas del atlas de paralaje pixel-art del
       proyecto, sin las tiendas), azoteas vecinas con tinacos y antenas, y tendederos con papel picado. */
    azoteas(x, w, h) {
      const atlas = image('assets/backgrounds/atlas_parallax_city.webp');
      if (!ready(atlas)) return false;
      const r = rngOf(4417);
      skyGradient(x, w, h, [[0, '#14173c'], [0.35, '#3a2c63'], [0.58, '#8c4a6e'], [0.74, '#f08a4b'], [0.86, '#ffb86b'], [1, '#3b2a4a']]);
      for (let i = 0; i < 70; i++) { x.globalAlpha = 0.4 + r() * 0.5; x.fillStyle = '#fff6d8'; x.fillRect(r() * w, r() * h * 0.42, 1.6, 1.6); }
      x.globalAlpha = 1;
      glow(x, w * 0.72, h * 0.13, 70, '255,217,160', 0.16);
      x.fillStyle = '#ffd9a0'; x.beginPath(); x.arc(w * 0.72, h * 0.13, 22, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#14173c'; x.beginPath(); x.arc(w * 0.72 + 9, h * 0.13 - 5, 19, 0, Math.PI * 2); x.fill();
      // Nubes tenues del atardecer.
      for (let i = 0; i < 6; i++) {
        const cx = r() * w, cy = h * (0.16 + r() * 0.16), cw = 60 + r() * 90;
        x.globalAlpha = 0.07 + r() * 0.07; x.fillStyle = '#ffd2c2';
        for (let k = 0; k < 4; k++) { x.beginPath(); x.ellipse(cx + (k - 1.5) * cw * 0.28, cy + Math.sin(k * 1.7) * 5, cw * 0.32, 9 + r() * 6, 0, 0, Math.PI * 2); x.fill(); }
      }
      x.globalAlpha = 1;
      x.imageSmoothingEnabled = false;
      // Capa lejana: nubes y siluetas (franja 300–600 del atlas).
      x.globalAlpha = 0.9; x.drawImage(atlas, 330, 300, w, 300, 0, h * 0.40, w, 300); x.globalAlpha = 1;
      x.imageSmoothingEnabled = true;
      // V51: azoteas vecinas en silueta; los tinacos y antenas se apoyan en ellas (antes flotaban en el cielo).
      const roofs = [];
      for (let rx = -10; rx < w;) { const rw = 46 + r() * 74, top = h * 0.365 - r() * 26; roofs.push({ x1: rx, x2: rx + rw, top }); rx += rw; }
      for (const f of roofs) {
        x.fillStyle = '#141428'; x.fillRect(f.x1, f.top, f.x2 - f.x1, h * 0.405 - f.top);
        x.fillStyle = '#2b2846'; x.fillRect(f.x1, f.top, f.x2 - f.x1, 2);                     // pretil
        if (r() < 0.45) { // cuarto de azotea con ventanita encendida
          const cx = f.x1 + 8 + r() * Math.max(4, f.x2 - f.x1 - 40);
          x.fillStyle = '#141428'; x.fillRect(cx, f.top - 18, 26, 18);
          x.fillStyle = '#ffcf7a'; x.fillRect(cx + 8, f.top - 12, 7, 6); glow(x, cx + 11, f.top - 9, 16, '255,200,110', 0.25);
        }
      }
      // Las azoteas se desvanecen hacia las nubes (sin un borde recto que corte el cielo).
      for (let fy = 0; fy < 24; fy++) { x.globalAlpha = 1 - (fy + 1) / 25; x.fillStyle = '#141428'; x.fillRect(0, h * 0.405 + fy * 2, w, 2); }
      x.globalAlpha = 1;
      for (let i = 0; i < 5; i++) { // tinacos sobre las azoteas
        const f = roofs[1 + Math.floor(r() * (roofs.length - 2))], tx = f.x1 + 14 + r() * Math.max(2, f.x2 - f.x1 - 28), base = f.top;
        x.fillStyle = '#0f1020';
        x.fillRect(tx - 9, base - 12, 3, 12); x.fillRect(tx + 6, base - 12, 3, 12);           // base metálica
        x.beginPath(); x.ellipse(tx, base - 26, 13, 16, 0, 0, Math.PI * 2); x.fill();          // tinaco
        x.fillRect(tx - 7, base - 45, 14, 5);                                                  // tapa
        x.fillStyle = '#25264a'; x.fillRect(tx - 10, base - 32, 2, 12);                        // brillo
      }
      x.strokeStyle = '#0f1020'; x.lineWidth = 1.4;                                            // antenas
      for (let i = 0; i < 6; i++) {
        const f = roofs[Math.floor(r() * roofs.length)], ax = f.x1 + r() * (f.x2 - f.x1), top = f.top - 24 - r() * 22;
        x.beginPath(); x.moveTo(ax, f.top); x.lineTo(ax, top); x.moveTo(ax - 8, top + 6); x.lineTo(ax + 8, top + 6); x.moveTo(ax - 5, top + 12); x.lineTo(ax + 5, top + 12); x.stroke();
      }
      x.imageSmoothingEnabled = false;
      x.drawImage(atlas, 420, 0, w, 300, 0, h * 0.55, w, 300);                                   // capa cercana con postes
      x.drawImage(atlas, 460, 600, w, 258, 0, h - 258, w, 258);                                  // departamentos (sin tiendas)
      x.imageSmoothingEnabled = true;
      const flags = ['#ff5d8f', '#ffd166', '#06d6a0', '#4cc9f0', '#f77f00', '#b5179e'];
      for (let row = 0; row < 3; row++) {
        const y0 = 70 + row * 210 + r() * 30, sag = 18 + r() * 10;
        x.strokeStyle = 'rgba(30,20,30,0.7)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, y0); x.quadraticCurveTo(w / 2, y0 + sag * 2, w, y0); x.stroke();
        for (let fx = 10; fx < w; fx += 22) {
          const t = fx / w, fy = y0 + 4 * sag * t * (1 - t);
          x.globalAlpha = 0.85; x.fillStyle = flags[(fx / 22 + row) % flags.length | 0];
          x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx + 14, fy); x.lineTo(fx + 14, fy + 15); x.lineTo(fx + 7, fy + 19); x.lineTo(fx, fy + 15); x.closePath(); x.fill();
        }
        x.globalAlpha = 1;
      }
      grain(x, 0, 0, w, h * 0.45, r, 0.025, 0.06);
      return true;
    },
    /* Estación subterránea de la Línea 3: azulejo, columnas, letreros colgantes, carteles enmarcados,
       lámparas con halo, reloj y un tren detenido con pasajeros. */
    metro(x, w, h) {
      const r = rngOf(3303);
      skyGradient(x, w, h, [[0, '#0d1b25'], [0.5, '#132a36'], [1, '#0a141b']]);
      for (let ty = 0; ty < h; ty += 16) for (let tx = (ty / 16) % 2 ? -12 : 0; tx < w; tx += 24) {     // azulejo
        const v = 0.05 + r() * 0.07;
        x.fillStyle = `rgba(170,215,220,${v})`; x.fillRect(tx + 1, ty + 1, 22, 14);
      }
      for (const by of [120, 470, 820]) {                                                    // franja de la línea
        x.fillStyle = '#7a1f3d'; x.fillRect(0, by, w, 14); x.fillStyle = '#d9d1c4'; x.fillRect(0, by + 14, w, 3);
        x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, by + 17, w, 6);
      }
      for (let cx = 70; cx < w; cx += 160) {                                                 // columnas
        x.fillStyle = '#26343d'; x.fillRect(cx, 0, 34, h); x.fillStyle = '#31414b'; x.fillRect(cx + 4, 0, 6, h);
        x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(cx + 34, 0, 8, h);
        for (let sy = 0; sy < h; sy += 340) for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? '#111' : '#f2c230'; x.fillRect(cx, sy + 300 + k * 6, 34, 6); }
      }
      for (let ly = 40; ly < h; ly += 175) for (let lx = 30; lx < w; lx += 140) {           // lámparas con halo
        glow(x, lx + 30, ly + 3, 70, '230,250,255', 0.32);
        x.fillStyle = '#e8fbff'; x.fillRect(lx, ly, 60, 5);
      }
      // V51: carteles enmarcados entre columnas (antes rectángulos translúcidos que parecían fallas de dibujo).
      const poster = (px, py, kind) => {
        const pw = 84, ph = 108;
        x.fillStyle = '#0b1218'; x.fillRect(px - 3, py - 3, pw + 6, ph + 6);
        x.fillStyle = '#d8d2c0'; x.fillRect(px, py, pw, ph);
        const ix = px + 5, iy = py + 5, iw = pw - 10, ih = ph - 26;
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '900 10px system-ui,sans-serif';
        if (kind === 'bus') {
          x.fillStyle = '#f6c344'; x.fillRect(ix, iy, iw, ih);
          x.fillStyle = '#2f9a6a'; x.fillRect(ix + 8, iy + 26, iw - 16, 30); x.fillStyle = '#e8453c'; x.fillRect(ix + 8, iy + 48, iw - 16, 6);
          x.fillStyle = '#cfe9f2'; for (let k = 0; k < 4; k++) x.fillRect(ix + 12 + k * 13, iy + 30, 9, 9);
          x.fillStyle = '#101418'; x.beginPath(); x.arc(ix + 20, iy + 58, 5, 0, Math.PI * 2); x.arc(ix + iw - 20, iy + 58, 5, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#1a1a1a'; x.fillText('RUTA 6', px + pw / 2, py + ph - 10);
        } else if (kind === 'cat') {
          x.fillStyle = '#3fb5a3'; x.fillRect(ix, iy, iw, ih);
          x.fillStyle = '#12302c';
          x.beginPath(); x.ellipse(ix + iw / 2, iy + 56, 18, 14, 0, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.arc(ix + iw / 2, iy + 34, 11, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.moveTo(ix + iw / 2 - 10, iy + 30); x.lineTo(ix + iw / 2 - 7, iy + 18); x.lineTo(ix + iw / 2 - 2, iy + 26); x.fill();
          x.beginPath(); x.moveTo(ix + iw / 2 + 10, iy + 30); x.lineTo(ix + iw / 2 + 7, iy + 18); x.lineTo(ix + iw / 2 + 2, iy + 26); x.fill();
          x.lineWidth = 4; x.strokeStyle = '#12302c'; x.beginPath(); x.moveTo(ix + iw / 2 + 16, iy + 62); x.quadraticCurveTo(ix + iw - 6, iy + 60, ix + iw - 10, iy + 40); x.stroke();
          x.fillStyle = '#1a1a1a'; x.fillText('ADOPTA', px + pw / 2, py + ph - 10);
        } else if (kind === 'agave') {
          const g = x.createLinearGradient(0, iy, 0, iy + ih); g.addColorStop(0, '#5a7be0'); g.addColorStop(0.7, '#f7a35c'); g.addColorStop(1, '#e8845c');
          x.fillStyle = g; x.fillRect(ix, iy, iw, ih);
          x.fillStyle = '#6b4c7a'; x.beginPath(); x.moveTo(ix, iy + ih); x.lineTo(ix + iw * 0.35, iy + ih * 0.55); x.lineTo(ix + iw * 0.7, iy + ih * 0.8); x.lineTo(ix + iw, iy + ih * 0.5); x.lineTo(ix + iw, iy + ih); x.fill();
          x.fillStyle = '#2f6b5a';
          for (let k = 0; k < 4; k++) { const ax = ix + 10 + k * 18; for (let l = -2; l <= 2; l++) { x.beginPath(); x.moveTo(ax - 3, iy + ih); x.lineTo(ax + l * 5, iy + ih - 16 + Math.abs(l) * 3); x.lineTo(ax + 3, iy + ih); x.fill(); } }
          x.fillStyle = '#1a1a1a'; x.fillText('JALISCO', px + pw / 2, py + ph - 10);
        } else {
          x.fillStyle = '#e86aa6'; x.fillRect(ix, iy, iw, ih);
          x.fillStyle = '#2a1424'; x.beginPath(); x.ellipse(ix + iw / 2, iy + 46, 32, 9, 0, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.ellipse(ix + iw / 2, iy + 36, 13, 14, 0, Math.PI, 0); x.fill();
          x.fillStyle = '#f6c344'; x.fillRect(ix + iw / 2 - 13, iy + 38, 26, 3);
          x.fillStyle = '#1a1a1a'; x.fillText('MARIACHI', px + pw / 2, py + ph - 10);
        }
        x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(px, py, pw * 0.45, ph);              // reflejo del vidrio
      };
      poster(125, 185, 'bus'); poster(445, 230, 'cat'); poster(285, 270, 'agave'); poster(125, 860, 'mariachi'); poster(445, 870, 'bus');
      // Reloj de andén.
      x.fillStyle = '#0b1218'; x.fillRect(318, 52, 4, 20);
      x.fillStyle = '#f4f1e8'; x.beginPath(); x.arc(320, 86, 17, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#1b2b38'; x.lineWidth = 3; x.stroke();
      x.lineWidth = 2; x.beginPath(); x.moveTo(320, 86); x.lineTo(320, 75); x.moveTo(320, 86); x.lineTo(328, 90); x.stroke();
      // Letreros colgantes: se dibujan DESPUÉS de las columnas (antes las columnas tapaban parte del texto).
      const sign = (sx, sy, sw, txt, bg, fg) => {
        x.strokeStyle = '#0b1218'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(sx + 14, sy - 16); x.lineTo(sx + 14, sy); x.moveTo(sx + sw - 14, sy - 16); x.lineTo(sx + sw - 14, sy); x.stroke();
        x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(sx + 3, sy + 4, sw, 30);
        x.fillStyle = bg; x.fillRect(sx, sy, sw, 30); x.fillStyle = '#ffffff22'; x.fillRect(sx, sy, sw, 3);
        x.fillStyle = fg; x.font = '900 15px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, sx + sw / 2, sy + 16);
      };
      sign(110, 70, 170, 'LÍNEA 3', '#1d4e89', '#ffffff');
      sign(w - 290, 420, 190, '→ ANDÉN CENTRO', '#1b2b38', '#ffcf3a');
      sign(120, 770, 200, 'SALIDA · RUTA 6 ↓', '#1b2b38', '#d9ff65');
      // Tren detenido: vagón con puertas, letrero de destino y pasajeros en las ventanas.
      const trY = 600;
      x.fillStyle = '#0a1118'; x.fillRect(0, trY + 120, w, 8);
      x.fillStyle = '#c9cfd3'; x.fillRect(-20, trY, w + 40, 118); x.fillStyle = '#7a1f3d'; x.fillRect(-20, trY + 86, w + 40, 14);
      x.fillStyle = '#9aa3a9'; x.fillRect(-20, trY, w + 40, 4);
      for (let wx = 10; wx < w; wx += 74) {
        x.fillStyle = '#16303d'; x.fillRect(wx, trY + 18, 56, 52); x.fillStyle = 'rgba(255,230,160,0.28)'; x.fillRect(wx + 3, trY + 21, 50, 46);
        if (r() < 0.6) { // pasajero en silueta
          const px = wx + 12 + r() * 30;
          x.fillStyle = 'rgba(14,26,34,0.75)'; x.beginPath(); x.arc(px, trY + 44, 7, 0, Math.PI * 2); x.fill(); x.fillRect(px - 11, trY + 52, 22, 15);
        }
      }
      for (const dx of [158, 380]) {
        x.fillStyle = '#b4bcc1'; x.fillRect(dx, trY + 10, 44, 94); x.fillStyle = '#16303d'; x.fillRect(dx + 5, trY + 18, 15, 50); x.fillRect(dx + 24, trY + 18, 15, 50);
        x.fillStyle = '#f2c230'; x.fillRect(dx - 3, trY + 10, 3, 94); x.fillRect(dx + 44, trY + 10, 3, 94);
      }
      x.fillStyle = '#0b1218'; x.fillRect(w / 2 - 70, trY + 4, 140, 12);
      x.fillStyle = '#ffb547'; x.font = '900 9px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('L3 → ZAPOPAN', w / 2, trY + 10.5);
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, trY + 104, w, 14);
      grain(x, 0, 0, w, h, r, 0.03, 0.08);
      return true;
    },
    /* Tlaquepaque al atardecer: fachadas coloniales de colores con buganvilias, balcones y faroles, la parroquia
       al fondo, guirnaldas de foquitos, sombrillas colgantes y la banqueta empedrada. */
    tlaquepaque(x, w, h) {
      const r = rngOf(7731);
      skyGradient(x, w, h, [[0, '#2a1c4f'], [0.45, '#b84d6a'], [0.75, '#f7a35c'], [1, '#ffd08a']]);
      for (let i = 0; i < 9; i++) {                                                             // nubes
        const cx = r() * w, cy = h * (0.08 + r() * 0.22), cw = 70 + r() * 120;
        x.globalAlpha = 0.08 + r() * 0.08; x.fillStyle = '#ffe0c8';
        for (let k = 0; k < 4; k++) { x.beginPath(); x.ellipse(cx + (k - 1.5) * cw * 0.27, cy + Math.sin(k * 2.1) * 4, cw * 0.3, 7 + r() * 6, 0, 0, Math.PI * 2); x.fill(); }
      }
      x.globalAlpha = 1;
      const pc = w * 0.62;                                                                    // parroquia de San Pedro
      glow(x, pc, h * 0.3, 190, '255,190,140', 0.18);
      x.fillStyle = 'rgba(70,40,70,0.75)';
      x.fillRect(pc - 90, h * 0.32, 180, h * 0.5); x.fillRect(pc - 110, h * 0.12, 40, h * 0.7); x.fillRect(pc + 70, h * 0.12, 40, h * 0.7);
      for (const tx of [pc - 90, pc + 90]) { x.beginPath(); x.moveTo(tx - 22, h * 0.12); x.lineTo(tx, h * 0.02); x.lineTo(tx + 22, h * 0.12); x.fill(); }
      x.beginPath(); x.arc(pc, h * 0.32, 52, Math.PI, 0); x.fill();
      const cols = ['#e8a0a8', '#f2d06b', '#6cc4b8', '#e98a5c', '#b79ad8', '#f4f0e0', '#e86a6a'];
      const joints = [];
      let fx = -20;
      while (fx < w) {
        const fw = 120 + r() * 110, fh = h * (0.42 + r() * 0.12), c = cols[Math.floor(r() * cols.length)], top = h - fh;
        x.fillStyle = c; x.fillRect(fx, top, fw, fh);
        grain(x, fx, top, fw, fh, r, 0.02, 0.08);
        x.fillStyle = 'rgba(0,0,0,0.16)'; x.fillRect(fx, h - fh * 0.16, fw, fh * 0.16);            // zócalo
        x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(fx, top, fw, 10); x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(fx, top + 10, fw, 3);
        x.fillStyle = 'rgba(0,0,0,0.10)'; x.fillRect(fx + fw - 4, top, 4, fh);                     // junta entre casas
        const door = fw * 0.32;
        x.fillStyle = '#3a2418'; x.beginPath(); x.moveTo(fx + fw / 2 - door / 2, h); x.lineTo(fx + fw / 2 - door / 2, h - fh * 0.42);
        x.arc(fx + fw / 2, h - fh * 0.42, door / 2, Math.PI, 0); x.lineTo(fx + fw / 2 + door / 2, h); x.fill();
        x.strokeStyle = 'rgba(255,220,170,0.25)'; x.lineWidth = 2; x.beginPath(); x.arc(fx + fw / 2, h - fh * 0.42, door / 2 + 3, Math.PI, 0); x.stroke();
        for (const wx of [fx + fw * 0.12, fx + fw * 0.72]) {
          const wy = top + fh * 0.25, ww = fw * 0.16, wh = fh * 0.26;
          glow(x, wx + ww / 2, wy + wh / 2, 36, '255,200,120', 0.22);
          x.fillStyle = '#2b1c16'; x.fillRect(wx, wy, ww, wh);
          x.fillStyle = 'rgba(255,214,140,0.55)'; x.fillRect(wx + 3, wy + 3, ww - 6, wh - 6);
          x.strokeStyle = '#1a1210'; x.lineWidth = 1.4; for (let b = 1; b < 4; b++) { x.beginPath(); x.moveTo(wx + b * fw * 0.04, wy); x.lineTo(wx + b * fw * 0.04, wy + wh); x.stroke(); }
          if (r() < 0.5) { // balcón de herrería
            x.fillStyle = '#1a1210'; x.fillRect(wx - 4, wy + wh, ww + 8, 3);
            for (let b = 0; b <= 5; b++) x.fillRect(wx - 4 + b * (ww + 5) / 5, wy + wh - 10, 1.5, 10);
            x.fillRect(wx - 4, wy + wh - 11, ww + 8, 2);
          }
        }
        if (r() < 0.45) { // buganvilia que cuelga de la cornisa
          const bx = r() < 0.5 ? fx + 4 : fx + fw - fw * 0.38;
          for (let k = 0; k < 70; k++) {
            const px = bx + r() * fw * 0.34, py = top + 6 + Math.pow(r(), 1.6) * fh * 0.42;
            x.fillStyle = k % 5 === 0 ? '#3f7d4a' : ['#d6247a', '#f05aa6', '#b0185f'][k % 3];
            x.beginPath(); x.arc(px, py, 1.6 + r() * 2.2, 0, Math.PI * 2); x.fill();
          }
        }
        joints.push({ x: fx + fw, top });
        fx += fw;
      }
      for (const j of joints) {                                                                // faroles
        if (r() < 0.35) continue;
        const lx = j.x, ly = j.top + 38;
        glow(x, lx, ly, 44, '255,196,110', 0.38);
        x.fillStyle = '#1a1210'; x.fillRect(lx - 1, ly - 14, 2, 8); x.fillRect(lx - 7, ly - 6, 14, 3);
        x.fillStyle = '#ffd98a'; x.fillRect(lx - 5, ly - 3, 10, 12); x.fillStyle = '#1a1210'; x.fillRect(lx - 6, ly + 9, 12, 2);
      }
      const bulbCols = ['255,214,120', '255,140,90', '150,230,255', '255,120,180'];               // guirnaldas
      for (let k = 0; k < 4; k++) bulbs(x, k * w / 4 - 10, h * 0.26, (k + 1) * w / 4 + 10, h * 0.26, 9, 24, bulbCols, r);
      const uc = ['#e8453c', '#f6c344', '#3fb5a3', '#e86aa6', '#5a7be0', '#f08a3c'];             // sombrillas colgantes
      for (let row = 0; row < 2; row++) for (let ux = 20 + row * 40; ux < w; ux += 80) {
        const uy = 22 + row * 34 + Math.sin(ux * 0.05) * 6, rad = 20;
        x.strokeStyle = 'rgba(40,24,30,0.45)'; x.lineWidth = 1; x.beginPath(); x.moveTo(ux, uy - rad - 6); x.lineTo(ux, uy + 7); x.stroke();
        x.globalAlpha = 0.6; x.fillStyle = uc[(ux / 80 + row) % uc.length | 0]; x.beginPath(); x.arc(ux, uy, rad, Math.PI, 0); x.fill();
        x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(ux - rad, uy - 1, rad * 2, 2); x.globalAlpha = 1;
      }
      const pf = ['#ff5d8f', '#ffd166', '#06d6a0', '#4cc9f0', '#f77f00'];                          // papel picado
      for (let fxp = 0; fxp < w; fxp += 18) { const yy = h * 0.47 + Math.sin(fxp / 80) * 8; x.globalAlpha = 0.7; x.fillStyle = pf[(fxp / 18) % pf.length | 0]; x.fillRect(fxp, yy, 13, 12); }
      x.globalAlpha = 1;
      x.fillStyle = '#5a4636'; x.fillRect(0, h - 10, w, 10);                                    // banqueta empedrada
      for (let sx = 0; sx < w; sx += 9) { x.fillStyle = (sx / 9) % 2 ? '#6d5643' : '#7a6150'; x.fillRect(sx + (r() * 2 | 0), h - 9 + (r() * 2 | 0), 7, 3); x.fillRect(sx + 4, h - 5, 7, 3); }
      return true;
    }
  };

  function drawNeighborhood(G, V, T) {
    const band = 48;
    for (const sc of G.world.scenes) {
      if (sc.theme === 'submarino' || sc.theme === 'espacial') continue; // fondo completo, sin fachadas urbanas
      if (!inView(V, sc.x0, sc.startY, sc.x0 + sc.drawW, sc.endY)) continue;
      const school = sc.theme === 'escuela', night = sc.shade > 0.1;
      const wall = school ? (night ? '#172c3b' : '#294754') : (night ? '#282735' : '#483a3d');
      const trim = school ? '#75aeb2' : '#b48a68';
      const glass = school ? '#87bfd0' : '#a9bfd0';
      for (const side of [-1, 1]) {
        const x1 = side < 0 ? sc.x0 + 2 : sc.x0 + sc.drawW - band - 2;
        const y1 = Math.max(sc.startY, V.y1), y2 = Math.min(sc.endY, V.y2);
        if (x1 + band < V.x1 || x1 > V.x2 || y2 <= y1) continue;
        fillRect(x1, y1, band, y2 - y1, wall, 0.78);
        fillRect(x1 + (side < 0 ? band - 4 : 0), y1, 4, y2 - y1, trim, 0.62);
        fillRect(x1, sc.startY + 5, band, 4, trim, 0.78);
        for (let floor = 0, fy = sc.startY + 28; fy < sc.endY - 28; floor++, fy += 92) {
          if (fy + 42 < V.y1 || fy > V.y2) continue;
          for (let col = 0; col < 2; col++) {
            const wx = x1 + 5 + col * 22, lit = hash(Math.round(sc.x0), floor * 7 + col + (side + 1) * 19) % (night ? 3 : 5) === 0;
            fillRR(wx, fy, 17, 25, 2, '#152330', 0.94);
            fillRect(wx + 2, fy + 2, 13, 21, lit ? (night ? '#ffd17a' : '#f3d99a') : glass, lit ? 0.74 : 0.36);
            line(wx + 8.5, fy + 2, wx + 8.5, fy + 23, trim, 0.55, 1);
          }
          fillRect(x1 + 3, fy + 29, band - 6, 3, trim, 0.8);
          for (let post = 10; post < band - 4; post += 13) fillRect(x1 + post, fy + 32, 1.3, 6, trim, 0.66);
          if (floor % 3 === 1) {
            fillRR(x1 + (side < 0 ? 8 : 25), fy + 44, 15, 9, 2, '#172630', 0.78);
            fillRect(x1 + (side < 0 ? 10 : 27), fy + 46, 9, 2, trim, 0.52);
          }
        }
        fillRect(x1 + 3, sc.startY + 4, 2, sc.endY - sc.startY - 8, trim, 0.36);
        const lampX = side < 0 ? x1 + band - 8 : x1 + 8;
        for (let ly = sc.startY + 66; ly < sc.endY; ly += 184) {
          if (ly < V.y1 || ly > V.y2) continue;
          line(lampX, ly, lampX, ly + 10, trim, 0.6, 1.4);
          circle(lampX, ly + 12, 2.4, night ? '#ffd47a' : '#bcebdd', 0.66 + 0.12 * Math.sin(T * 2 + ly));
        }
      }
    }
  }

  const ABYSS_OBJECTS = 'assets/parallax/marino/abyss_v7/marine_objects.png';
  function drawAbyssObject(frame,x,y,size,base=false) {
    const im=image(ABYSS_OBJECTS); if(!ready(im)) return false;
    ctx.drawImage(im,frame*256,0,256,256,x-size/2,y-size*(base?224/256:0.5),size,size);
    return true;
  }
  function seaZone(G){return (G.world.waters||[]).find(z=>z.sea&&z.toStreet&&!G.room);}
  // Navigation beacons are attached to actual mapped ledges, not arbitrary floating arrows.
  function drawAbyssRoute(G,V,T){
    const z=seaZone(G); if(!z)return;
    const sc=G.world.scenes[G.tramo];if(!sc||sc.theme!=='submarino')return;
    for(const b of G.world.abyssBeacons||[]){
      const {x,y,index:i}=b;
      if(x<V.x1-50||x>V.x2+50||y<V.y1-40||y>V.y2+80)continue;
      const pulse=.5+.5*Math.sin(T*2.2+i*.9),size=50;
      const gl=ctx.createRadialGradient(x,y-26,1,x,y-26,28);
      gl.addColorStop(0,`rgba(152,240,219,${.18+.12*pulse})`);gl.addColorStop(1,'rgba(49,183,190,0)');ctx.fillStyle=gl;ctx.fillRect(x-28,y-54,56,56);
      drawAbyssObject(1,x,y,size,true);
      if(Math.hypot(G.P.x-x,G.P.y-y)<120)text(b.active?'RESCATE ACTIVO':'BALIZA '+String(i+1).padStart(2,'0'),x,y-50,9,'#d9f2e8','center',800);
    }
  }
  // Sparse suspended matter travels in world space; no full-screen strip overlay.
  function drawAbyssMatter(G,V,T,front){
    const z=seaZone(G);if(!z)return;
    const x1=Math.max(V.x1,z.x1),x2=Math.min(V.x2,z.x2),y1=Math.max(V.y1,z.y+4),y2=Math.min(V.y2,z.y2);
    if(x1>=x2||y1>=y2)return;
    ctx.save();ctx.beginPath();ctx.rect(x1,y1,x2-x1,y2-y1);ctx.clip();
    const step=front?96:62;
    for(let iy=Math.floor(y1/step)-1;iy<=Math.ceil(y2/step)+1;iy++)for(let ix=Math.floor(x1/step)-1;ix<=Math.ceil(x2/step)+1;ix++){
      const q=(Math.sin(ix*127.1+iy*311.7)*43758.5453)%1,seed=q<0?q+1:q;
      if(seed<(front?.76:.22))continue;
      const x=ix*step+seed*step+Math.sin(T*.47+seed*31)*9,y=iy*step+((seed*step-T*(front?6:3))%step+step)%step;
      if(front){circle(x,y,1.5+seed*1.7,'#85bcca',.09+seed*.08);}else circle(x,y,.6+seed*.7,'#b7dcd9',.15+seed*.12);
    }
    ctx.restore();
  }
  const SCHOOL_FURNITURE = 'assets/scenes/school_pro/school_furniture.png';
  const SCHOOL_FURNITURE_RECTS = {"wood_shelf":[12,112,232,32],"lab_top":[268,112,232,32],"locker_top":[524,112,232,32],"wood_upright":[882,12,28,232],"steel_upright":[114,268,28,232],"hatch":[268,339,232,90],"exit_door":[562,268,156,232],"crate":[792,280,208,208],"archive_books":[12,590,232,100],"lab_bottles":[268,590,232,100],"locker_panel":[524,524,232,232],"supply_boxes":[780,595,232,90]};
  function schoolMaterial(name,x,y,w,h){const im=image(SCHOOL_FURNITURE),r=SCHOOL_FURNITURE_RECTS[name];if(!ready(im)||!r)return false;ctx.drawImage(im,...r,x,y,w,h);return true;}
  const SCHOOL_FURNITURE_LOWER_CACHE = new WeakMap();
  function schoolFurnitureLowerByPlatform(room){
    let lookup=SCHOOL_FURNITURE_LOWER_CACHE.get(room);if(lookup)return lookup;
    const ps=room.schoolFurniture||[];lookup=new Map();
    for(const p of ps){let lower=null;const minOverlap=(p.x2-p.x1)*.45;
      for(const q of ps){if(q.y<=p.y+30)continue;if(Math.min(q.x2,p.x2)-Math.max(q.x1,p.x1)<=minOverlap)continue;if(!lower||q.y<lower.y)lower=q;}
      lookup.set(p,lower);
    }
    SCHOOL_FURNITURE_LOWER_CACHE.set(room,lookup);return lookup;
  }
  function drawSchoolFurniture(room,V){
    const ps=room.schoolFurniture||[];if(!ps.length)return;
    const lowerByPlatform=schoolFurnitureLowerByPlatform(room);
    const wood=room.schoolArt==='archivo', upright=wood?'wood_upright':'steel_upright';
    for(const p of ps){if(!inView(V,p.x1,p.y,p.x2,room.y2))continue;
      // Decorative supports are behind the actors; collision remains the exact existing shelf.
      const h=room.y2-p.y; if(h<12)continue;
      fillRect(p.x1+5,p.y+12,p.x2-p.x1-10,h-12,wood?'#40392e':'#263d40',.22);
      // Decoración de fondo dentro del mueble: no es una superficie ni una caja de colisión.
      const lower=lowerByPlatform.get(p);
      const base=lower?lower.y:room.y2, span=base-p.y-18, inside=p.x2-p.x1-28;
      if(span>35){const label=wood?'archive_books':room.schoolArt==='laboratorio'?'lab_bottles':span>115?'locker_panel':'supply_boxes';const hh=label==='locker_panel'?Math.min(span-6,135):Math.min(span-6,38);if(hh>0)schoolMaterial(label,p.x1+14,base-hh-3,inside,hh);}

      for(const x of [p.x1+3,p.x2-12])schoolMaterial(upright,x,p.y+10,9,h-10);
      if(p.x2-p.x1>140)schoolMaterial(upright,(p.x1+p.x2)/2-3,p.y+10,6,h-10);
      // Single cross-brace below the usable surface, intentionally not a standable ledge.
      line(p.x1+12,p.y+20,p.x2-12,Math.min(room.y2-8,p.y+58),'#293b3b',.38,3);
      line(p.x2-12,p.y+20,p.x1+12,Math.min(room.y2-8,p.y+58),'#293b3b',.38,3);
    }
  }
  const SCHOOL_SIGNS='assets/scenes/school_pro/school_signs.png';
  function schoolSign(i,x,y,size=92){const im=image(SCHOOL_SIGNS);if(!ready(im))return false;ctx.drawImage(im,i%4*256,Math.floor(i/4)*256,256,256,x-size/2,y-size*238/256,size,size);return true;}
  function drawSchoolStreet(G,V,T){
    const W=G.world,y=W.street.y1;
    if(V.y2<y-390||V.y1>y+260)return;
    const sc=W.scenes[2],facade=image('assets/scenes/school_pro/school_exit_facade.webp'),im=image('assets/scenes/school_pro/street_material.webp');
    if(ready(facade))ctx.drawImage(facade,sc.x0,y-390,sc.drawW,390);
    fillRect(V.x1,y-12,V.x2-V.x1,12,'#b2a69b');
    if(ready(im)){for(let x=Math.floor(V.x1/384)*384;x<V.x2;x+=384)ctx.drawImage(im,x,y,384,220);}else fillRect(V.x1,y,V.x2-V.x1,220,'#353c42');
    const bus=W.bus,b=image('assets/scenes/school_pro/school_bus.png'),off=bus.state==='boarding'?Math.max(0,G.timers.victory-1)**2*260:0;
    if(ready(b)){const bw=bus.x2-bus.x1,bh=bw*b.naturalHeight/b.naturalWidth;ellipse(bus.x1+bw/2+off,y+2,bw*.46,7,'#141c22',.42);ctx.drawImage(b,bus.x1+off,y-bh,bw,bh);}else drawBus(G,bus,T);
    if(W.schoolFinal){const lock=W.foes.some(f=>f.id===W.schoolFinal.bossId&&!f.dead);schoolSign(lock?5:4,bus.x2+36,y,98);const cp=W.schoolFinalCheckpoint;if(cp)schoolSign(cp.active?1:0,cp.x,y,98);}
  }
  function drawSchoolAtmosphere(G,V,T){
    if(!G.world.schoolMission||G.room)return;
    const sc=G.world.scenes[G.tramo];if(!sc)return;
    if(sc.index===2){ // light rain, capped budget, not a gameplay hazard
      ctx.save();ctx.strokeStyle='#d6e7fa';ctx.globalAlpha=.22;ctx.lineWidth=.85;ctx.beginPath();
      for(let i=0;i<48;i++){const x=V.x1+((i*93.71+T*36)%(V.x2-V.x1)),y=V.y1+((i*73.41+T*275)%(V.y2-V.y1));ctx.moveTo(x,y);ctx.lineTo(x-5,y+18);}ctx.stroke();ctx.restore();
    }
    // A low-contrast near edge at the exact feet baseline on the currently occupied painted ledge.
    const p=G.P.ground;if(p&&p.hidden&&p.scene===sc.index&&p.kind==='floor'){
      const x1=Math.max(p.x1,V.x1),x2=Math.min(p.x2,V.x2);if(x2>x1){const g=ctx.createLinearGradient(0,p.y,0,p.y+12);g.addColorStop(0,'rgba(45,28,25,.26)');g.addColorStop(1,'rgba(45,28,25,0)');ctx.fillStyle=g;ctx.fillRect(x1,p.y+1,x2-x1,12);}
    }
  }
  function drawStreet(G, V, T) {
    const W = G.world, s = W.street, y = s.y1;
    if (W.portal) {
      const gate = W.portal;
      if (inView(V, gate.x - 75, gate.y - 160, gate.x + 75, gate.y + 10)) {
        const pulse = .55 + .18 * Math.sin(T * 3);
        fillRR(gate.x - 45, gate.y - 105, 90, 104, 15, '#243653', .85);
        fillRR(gate.x - 34, gate.y - 95, 68, 92, 12, '#473b82', .86);
        for (let i = 0; i < 3; i++) ring(gate.x, gate.y - 47, 26 - i * 5, 38 - i * 7, i === 1 ? '#f6b8ff' : '#76f6ff', pulse - i * .09, 2.5);
        fillRect(gate.x - 48, gate.y - 5, 96, 5, '#99f7e8');
      }
      if (V.y2 >= y - 28) {
        fillRect(V.x1, y, V.x2 - V.x1, 200, '#186c7a');
        line(V.x1, y, V.x2, y, '#8effef', .85, 3);
      }
      return;
    }
    if(W.poseidonArena){
      const a=W.poseidonArena,locked=W.foes.some(f=>f.id===a.bossId&&!f.dead),gx=a.x,gy=a.bottom;
      if(inView(V,gx-90,gy-170,gx+90,gy+10)){
        drawAbyssObject(2,gx,gy,154,true);
        const c=locked?'#ffbd75':'#79f5d0',pulse=.65+.2*Math.sin(T*3);
        ring(gx,gy-70,42,42,c,pulse,3);if(locked){line(gx-28,gy-70,gx+28,gy-70,c,.85,4);line(gx,gy-98,gx,gy-42,c,.85,4);}
        text(locked?'ESCOTILLA SELLADA':'ESCOTILLA ABIERTA',gx,gy-146,12,c,'center',900);
      }
      if(V.y2>=y)fillRect(V.x1,y,V.x2-V.x1,Math.max(200,V.y2-y),'#0a1a2b');
      return;
    }
    if(W.schoolMission){drawSchoolStreet(G,V,T);return;}
    if (y > V.y2 || y + 260 < V.y1) return;
    const special = W.scenes.length === 1 ? W.scenes[0].theme : null;
    if (special === 'submarino' || special === 'espacial') {
      const marine = special === 'submarino', gate = W.bus;
      const gx = (gate.doorX1 + gate.doorX2) * 0.5;
      fillRect(V.x1, y, V.x2 - V.x1, 18, marine ? '#41737a' : '#7f899d');
      fillRect(V.x1, y + 18, V.x2 - V.x1, 220, marine ? '#153644' : '#171a37');
      if(marine && drawAbyssObject(2,gx,y,144,true)){text('ESCOTILLA DE RESCATE',gx,y-132,11,'#e1f5ff');return;}
      fillRR(gx - 58, y - 99, 116, 93, 12, marine ? '#174b5d' : '#455371', 0.96);
      fillRR(gx - 41, y - 82, 82, 73, 9, marine ? '#2a808c' : '#263c64');
      fillRR(gx - 27, y - 65, 54, 56, 7, marine ? '#0a2f46' : '#09102b');
      ring(gx, y - 42, 22, 22, marine ? '#80ecf4' : '#a9ddff', 0.85, 3);
      text(marine ? 'ESCOTILLA DE RESCATE' : 'MÓDULO DE REGRESO', gx, y - 112, 12, '#e1f5ff');
      return;
    }
    // Terminal: fachada, banqueta, asfalto y la parada.
    fillRect(V.x1, y - 240, V.x2 - V.x1, 240, '#22303b');
    for (let ax = Math.floor(V.x1 / 120) * 120; ax < V.x2; ax += 120) {
      fillRR(ax + 18, y - 200, 84, 150, 40, '#16222c', 0.9);
      fillRR(ax + 26, y - 192, 68, 138, 34, hash(ax, 5) % 3 ? '#f1c57d' : '#9bd5d1', 0.18);
    }
    text('TERMINAL ARCADAS', W.bus.x1 + 170, y - 222, 14, '#d9ff65');
    fillRect(V.x1, y, V.x2 - V.x1, 16, '#9aa5a8');
    fillRect(V.x1, y + 16, V.x2 - V.x1, 220, '#262b30');
    for (let lx = Math.floor(V.x1 / 90) * 90; lx < V.x2; lx += 90) fillRect(lx, y + 80, 46, 5, '#e8d36a', 0.7);
    drawBus(G, W.bus, T);
  }

  function drawBus(G, bus, T) {
    let off = 0;
    if (bus.state === 'boarding') off = Math.max(0, G.timers.victory - 1.0) ** 2 * 260;
    const x1 = bus.x1 + off, x2 = bus.x2 + off, y1 = bus.y1, y2 = bus.y2 - 14;
    // V50: los 4 "frames" del camión son 4 camiones distintos (otro color/ángulo); ciclarlos a 7 fps hacía
    // parpadear el vehículo. Se usa uno solo y el motor se anima con vibración y humo.
    const busFrame = image(BUS_FRAMES[0]);
    const open = bus.state === 'boarding' || Math.abs(G.P.x - (bus.doorX1 + bus.doorX2) / 2) < 140;
    if (ready(busFrame)) {
      const idle = bus.state === 'waiting' ? Math.sin(T * 38) * 0.6 : 0;
      for (let i = 0; i < 3; i++) {
        const t = (T * 0.9 + i / 3) % 1;
        circle(x1 - 6 - t * 34, y2 - 10 - t * 22, 5 + t * 9, '#c8d0d4', 0.32 * (1 - t));
      }
      ctx.save();
      ctx.globalAlpha = 0.98;
      ctx.drawImage(busFrame, x1, y2 - 142 + idle, x2 - x1, 142);
      ctx.restore();
      if (open && bus.state === 'waiting') ring((bus.doorX1 + bus.doorX2) / 2, bus.y2 - 4, 40, 8, '#d9ff65', 0.6 + 0.3 * Math.sin(T * 6), 2);
      if (bus.state === 'boarding') {
        fillRect(bus.doorX1 + off, y1 + 34, bus.doorX2 - bus.doorX1, y2 - y1 - 38, '#ffe9a8', 0.16);
      }
      return;
    }
    if (G.state === 'playing' || bus.state === 'waiting') {
      for (let i = 0; i < 3; i++) {
        const t = (T * 0.8 + i / 3) % 1;
        circle(x2 + 10 + t * 30, y2 - 8 - t * 26, 6 + t * 10, '#c8d0d4', 0.35 * (1 - t));
      }
    }
    fillRR(x1, y1, x2 - x1, y2 - y1, 18, '#1d8a6b');
    fillRR(x1, y1, x2 - x1, 30, 14, '#f2f0e6');
    fillRect(x1, y2 - 30, x2 - x1, 10, '#f2c230');
    for (let wx = x1 + 96; wx < x2 - 40; wx += 52) fillRR(wx, y1 + 38, 42, 40, 6, '#0d2230', 0.95);
    fillRR(bus.doorX1 + off, y1 + 34, bus.doorX2 - bus.doorX1, y2 - y1 - 38, 6, open ? '#ffe9a8' : '#0d2230', open ? 0.85 : 0.95);
    if (open && bus.state === 'waiting') ring((bus.doorX1 + bus.doorX2) / 2, bus.y2 - 4, 40, 8, '#d9ff65', 0.6 + 0.3 * Math.sin(T * 6), 2);
    fillRR(x2 - 92, y1 + 6, 80, 18, 4, '#0a0f14');
    text('RUTA 6', x2 - 52, y1 + 15, 11, '#ffb547');
    for (const wx of [x1 + 70, x2 - 70]) { circle(wx, y2 + 2, 17, '#101418'); circle(wx, y2 + 2, 7, '#8b969c'); }
  }

  /* V58.7 · Zonas secretas: la ilustración panorámica del paquete, fija a la zona (se pisa lo que se ve). Alrededor,
     el color de su borde para que la cámara nunca muestre un hueco; en el santuario, la roca del techo de la cueva
     (sobre el borde de arriba del dibujo) y burbujas que suben; en la estación, estrellas que titilan. */
  function drawSecretRoom(r, V, T) {
    const bg = NS.ART && NS.ART.SECRET_BG && NS.ART.SECRET_BG[r.art], im = bg && image(bg.src);
    const marine = r.art === 'marino_oculto', school = r.art === 'aula_escolar_oculta', space = r.art === 'espacial_oculto';
    const ay1 = r.artY1 ?? r.y1, ay2 = r.artY2 ?? r.y2, w = r.x2 - r.x1;
    const edge = marine ? '#041b2c' : school ? '#18201f' : '#0b0a24';
    const fallback = marine ? '#0d4a6b' : school ? '#343c36' : '#1b1650';
    fillRect(r.x1 - 900, r.y1 - 900, w + 1800, ay2 - r.y1 + 1800, edge);
    if (ready(im)) ctx.drawImage(im, r.x1, ay1, w, ay2 - ay1);
    else fillRect(r.x1, ay1, w, ay2 - ay1, fallback);
    if (marine) {
      // Techo de la cueva: roca oscura que baja hasta el borde del dibujo (donde ya empieza su propia roca).
      const g = ctx.createLinearGradient(0, ay1 - 220, 0, ay1 + 14);
      g.addColorStop(0, '#010a12'); g.addColorStop(0.8, '#062436'); g.addColorStop(1, 'rgba(6,36,54,0)');
      ctx.fillStyle = g; ctx.fillRect(r.x1 - 60, ay1 - 220, w + 120, 234);
      for (let x = r.x1 + 30; x < r.x2; x += 74) {
        const hgt = 10 + (hash(x | 0, 7) % 22);
        tri(x - 12, ay1 - 2, x + 12, ay1 - 2, x + ((hash(x | 0, 3) % 9) - 4), ay1 + hgt, '#06283b', 0.9);
      }
      for (let k = 0; k < 18; k++) {   // burbujas que suben por el santuario
        const bx = r.x1 + ((k * 211) % 1000) / 1000 * w, span = r.y2 - ay1 - 40;
        const by = r.y2 - ((T * (22 + (k % 5) * 6) + k * 97) % span);
        if (by < V.y1 - 10 || by > V.y2 + 10) continue;
        ring(bx + Math.sin(T * 2 + k) * 4, by, 2.2 + (k % 3), 2.2 + (k % 3), '#c9f6ff', 0.45, 1);
      }
    } else if (space) {
      for (let k = 0; k < 26; k++) {
        const sx = r.x1 + (hash(k, 11) / 997) * w, sy = ay1 + (hash(k, 29) / 997) * (r.y2 - ay1) * 0.8;
        const tw = 0.5 + 0.5 * Math.sin(T * (1.5 + (k % 4) * 0.6) + k);
        circle(sx, sy, 1 + (k % 2) * 0.6, '#ffffff', 0.25 + 0.55 * tw);
      }
    } else if (school) {
      const span = Math.max(1, r.y2 - ay1 - 16);
      for (let k = 0; k < 8; k++) {
        const sx = r.x1 + (hash(k, 41) / 997) * w;
        const sy = ay1 + ((hash(k, 83) / 997 * span + T * (2 + (k % 3))) % span);
        if (sx < V.x1 - 4 || sx > V.x2 + 4 || sy < V.y1 - 4 || sy > V.y2 + 4) continue;
        const tw = 0.5 + 0.5 * Math.sin(T * 0.7 + k);
        circle(sx, sy, 0.8 + (k % 2) * 0.5, '#efe5c3', 0.12 + 0.12 * tw);
      }
    }
  }

  function drawRoomBackground(r, V, T) {
    if (!inView(V, r.x1 - 60, r.y1 - 60, r.x2 + 60, r.y2 + 60)) return;
    if (r.secret) { drawSecretRoom(r, V, T); return; }
    if(r.schoolArt){const im=image('assets/scenes/school_pro/room_'+r.schoolArt+'.webp');if(ready(im)){fillRect(r.x1-60,r.y1-60,r.x2-r.x1+120,r.y2-r.y1+120,'#263039');ctx.drawImage(im,r.x1,r.y1,r.x2-r.x1,r.y2-r.y1);drawSchoolFurniture(r,V);return;}}
    if (r.theme === 'gruta') {
      const im = image('assets/cinematica/llegadas/gruta_cascada.webp');
      fillRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1, '#1d4046');
      if (ready(im)) ctx.drawImage(im, r.x1, r.y1, r.x2-r.x1, r.y2-r.y1);
      fillRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1, '#102b38', .48);
      return;
    }
    const sewer = r.theme === 'alcantarilla';
    fillRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1, sewer ? '#1d2b28' : '#2a2a35');
    for (let by = r.y1 + 6; by < r.y2; by += 22) {
      const row = Math.round((by - r.y1) / 22);
      for (let bx = r.x1 + (row % 2) * 24; bx < r.x2; bx += 48) fillRect(bx + 1, by + 1, 46, 20, sewer ? '#24352f' : '#34333f', 0.7);
    }
    if (sewer) {
      for (let ax = r.x1 + 90; ax < r.x2 - 40; ax += 190) { ellipse(ax, r.y1 + 110, 70, 90, '#101a17', 0.75); }
      fillRect(r.x1, r.y2 - 26, r.x2 - r.x1, 26, '#2f5d55', 0.45);
    } else {
      fillRect(r.x1, r.y1 + 40, r.x2 - r.x1, 10, '#555f68');
      fillRect(r.x1 + 140, r.y1, 10, r.y2 - r.y1, '#4b5560', 0.8);
      for (let lx = r.x1 + 120; lx < r.x2; lx += 260) { circle(lx, r.y1 + 70, 40, '#ffd38a', 0.08); circle(lx, r.y1 + 64, 6, '#ffe7b0', 0.9); }
    }
  }

  /* ---------- Plataformas y sólidos ---------- */
  /* V50 · Plataformas con textura (assets/platforms, recortadas de plataformas_referencia.png).
     Se dibujan en 3 partes (tapa izquierda, centro repetido, tapa derecha) y la fila superior de la
     textura coincide con la línea de colisión: lo que ves es exactamente donde pisas. */
  const SKIN_DIR = 'assets/platforms/';
  const SKIN_H = { floor: 24, side: 20, stair: 11, moving: 17, crumble: 17, room: 22, plank: 13 };
  function drawSkinned(skin, x1, x2, y, H, alpha = 1, yJit = 0) {
    const meta = NS.ART && NS.ART.SKINS[skin], im = image(SKIN_DIR + skin + '.png');
    if (!meta || !ready(im)) return false;
    const sw = meta[0], sh = meta[1], top = meta[2], s = H / sh, w = x2 - x1, dy = y - top * s + yJit;
    ctx.globalAlpha = 0.2 * alpha; ctx.fillStyle = '#000'; ctx.fillRect(x1 + 3, y + 3 + yJit, w, H * 0.72); // sombra de profundidad
    ctx.globalAlpha = alpha;
    const cap = Math.min(18, Math.floor(sw * 0.2)), capW = cap * s;
    if (w <= capW * 2 + 6) { ctx.drawImage(im, 0, 0, sw, sh, x1, dy, w, sh * s); ctx.globalAlpha = 1; return true; }
    ctx.drawImage(im, 0, 0, cap, sh, x1, dy, capW, sh * s);
    ctx.drawImage(im, sw - cap, 0, cap, sh, x2 - capW, dy, capW, sh * s);
    const midSrc = sw - cap * 2, tileW = midSrc * s;
    for (let x = x1 + capW; x < x2 - capW - 0.5; x += tileW) {
      const ww = Math.min(tileW, x2 - capW - x);
      ctx.drawImage(im, cap, 0, midSrc * (ww / tileW), sh, x, dy, ww + 0.6, sh * s);
    }
    ctx.globalAlpha = 1;
    return true;
  }

  function drawStep(p, skin) {
    if (!drawSkinned(skin === 'scaffold' ? 'stone_slim' : skin, p.x1, p.x2, p.y, SKIN_H.stair)) {
      fillRR(p.x1, p.y, p.x2 - p.x1, 7, 2, '#5a4a52'); fillRect(p.x1, p.y, p.x2 - p.x1, 2, '#e7c18c');
    }
  }

  function drawCrumble(p, t) {
    const w = p.x2 - p.x1;
    if (p.gone) {
      // Hueco con contorno punteado: aquí reaparecerá la teja.
      const k = Math.min(1, (p.crT || 0) / NS.CONFIG.crumble.respawn);
      ctx.globalAlpha = 0.18 + 0.3 * k; ctx.strokeStyle = '#ffd3a8'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]);
      ctx.strokeRect(p.x1, p.y - 2, w, 9); ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (k > 0.82) drawSkinned('tiles_b', p.x1, p.x2, p.y, SKIN_H.crumble, (k - 0.82) / 0.18 * 0.8);
      return;
    }
    const shaking = p.crState === 'shake';
    const jit = shaking ? Math.sin(t * 70 + p.x1) * 1.6 : 0;
    if (p.look === 'coral') {
      fillRR(p.x1 + jit, p.y, w, 12, 5, '#d1527f'); fillRect(p.x1 + jit + 3, p.y, w - 6, 3, '#ffb3c8');
      if (shaking) for (let i = 0; i < 3; i++) circle(p.x1 + w * (0.2 + i * 0.3), p.y + 14 + ((t * 60 + i * 7) % 10), 1.6, '#ffd3e0', 0.8);
      return;
    }
    if (!drawSkinned('tiles_b', p.x1 + jit, p.x2 + jit, p.y, SKIN_H.crumble, 1, shaking ? Math.abs(jit) * 0.5 : 0)) {
      fillRR(p.x1 + jit, p.y, w, 9, 2, '#b8613e'); fillRect(p.x1 + jit, p.y, w, 2, '#f0a77a');
    }
    // Grietas: avisan que esta teja no aguanta.
    for (let cx = p.x1 + 10; cx < p.x2 - 6; cx += 22) {
      line(cx + jit, p.y + 1, cx + 5 + jit, p.y + 7, '#3a1a10', shaking ? 0.95 : 0.65, 1.3);
      line(cx + 5 + jit, p.y + 7, cx + 2 + jit, p.y + 12, '#3a1a10', shaking ? 0.95 : 0.55, 1.1);
    }
    if (shaking) for (let i = 0; i < 3; i++) circle(p.x1 + w * (0.2 + i * 0.3), p.y + 12 + ((t * 60 + i * 7) % 10), 1.4, '#c98a64', 0.8);
  }

  function drawBelt(p, t) {
    const x = p.x1, y = p.y, w = p.x2 - p.x1, h = 11, dir = Math.sign(p.belt) || 1;
    fillRR(x + 2, y + 3, w, h, 5, '#000000', 0.25);
    fillRR(x, y, w, h, 5, '#23272d');
    fillRect(x + 4, y + 1, w - 8, 2.4, '#ffcf3a', 0.85);
    // Galones que avanzan en la dirección de la banda.
    ctx.save(); ctx.beginPath(); ctx.rect(x + 6, y + 3, w - 12, h - 4); ctx.clip();
    const off = ((t * p.belt) % 22 + 22) % 22;
    for (let cx = x - 22 + off; cx < x + w + 22; cx += 22) {
      ctx.globalAlpha = 0.85; ctx.strokeStyle = '#9fb3c2'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(cx - dir * 4, y + 4); ctx.lineTo(cx + dir * 3, y + 7); ctx.lineTo(cx - dir * 4, y + 10); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
    for (const rx of [x + 6, x + w - 6]) { circle(rx, y + h / 2 + 1, 6, '#5d6873'); circle(rx, y + h / 2 + 1, 2.2, '#c8d0d4'); }
    fillRect(x + 8, y + h, 4, 10, '#3b434b'); fillRect(x + w - 12, y + h, 4, 10, '#3b434b');
  }

  function drawUmbrella(p, t, G) {
    const cx = (p.x1 + p.x2) / 2, w = p.x2 - p.x1, r = w / 2;
    const since = G.world.t - (p.bounceT ?? -9), squash = since < 0.3 ? Math.sin(since / 0.3 * Math.PI) * 0.35 : 0;
    const colors = ['#e8453c', '#f6c344', '#3fb5a3', '#e86aa6', '#5a7be0', '#f08a3c'];
    const base = Math.floor(p.x1 / 7) % colors.length;
    line(cx, p.y, cx, p.y + 34, '#3b2a20', 1, 2.4);
    ctx.save(); ctx.translate(cx, p.y + 6); ctx.scale(1 + squash * 0.25, 1 - squash);
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI + (i / n) * Math.PI, a1 = Math.PI + ((i + 1) / n) * Math.PI;
      ctx.fillStyle = colors[(base + i) % colors.length]; ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a0, a1); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 0, r, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    for (let i = 0; i <= n; i++) { const a = Math.PI + (i / n) * Math.PI; line(0, 0, Math.cos(a) * r, Math.sin(a) * r, '#ffffff', 0.35, 0.8); }
    circle(0, -r - 2, 2.6, '#3b2a20');
    ctx.restore();
    tri(cx - 6, p.y - r - 12, cx + 6, p.y - r - 12, cx, p.y - r - 20, '#ffe27a', 0.45 + 0.35 * Math.sin(t * 6 + p.x1));
  }

  /* V58.1 · Hongo gigante pintado en el arte: no se redibuja; solo brilla suave (se ve que rebota) y, al rebotar,
     lanza un destello y esporas. */
  function drawPaintedBounce(p, G) {
    const t = G.world.t, cx = (p.x1 + p.x2) / 2, w = p.x2 - p.x1, since = t - (p.bounceT ?? -9);
    ellipse(cx, p.y + 3, w * 0.5, 7, '#9ff8ff', 0.1 + 0.06 * Math.sin(t * 3 + p.x1));
    if (since < 0.45) {
      const k = since / 0.45;
      ring(cx, p.y + 2, w * (0.45 + k * 0.35), 7 + k * 10, '#d8fbff', 0.55 * (1 - k), 2.5);
      for (let i = 0; i < 6; i++) circle(cx + (i - 2.5) * w * 0.14, p.y - k * (26 + (i % 3) * 14), 2.2, '#e8d7ff', 0.7 * (1 - k));
    }
  }

  function drawPlatforms(G, V) {
    const T = G.world.t;
    for (const p of G.world.platforms) {
      if (p.y < V.y1 - 30 || p.y > V.y2 + 30 || p.x2 < V.x1 || p.x1 > V.x2) continue;
      const sc = p.scene >= 0 ? G.world.scenes[p.scene] : null;
      if (debug && (p.painted || p.hidden)) { line(p.x1, p.y, p.x2, p.y, p.drop ? '#ff44ed' : '#45ff9a', 0.95, 2); if (p.hidden) continue; }
      if(G.world.schoolMission && p.hidden && p.scene===2 && p.y>G.world.street.y1-390 && p.region==='main'){if(!drawSkinned('concrete',p.x1,p.x2,p.y,20))fillRect(p.x1,p.y,p.x2-p.x1,15,'#817b73');continue;}
      if (p.shore) {
        if (!drawSkinned('plank', p.x1, p.x2, p.y, 11)) fillRect(p.x1,p.y,p.w,9,'#957147');
        for (let x = p.x1 + 28; x < p.x2; x += 76) {
          fillRect(x, p.y + 9, 7, 32, '#735438'); line(x+3,p.y+30,x+24,p.y+9,'#856a46',.95,4);
        }
        continue;
      }
      if (p.hidden && sc && sc.theme === 'guadalajara' && !sc.missingArt) {
        for (const br of p.brackets || []) {
          if (br.x < V.x1 - 25 || br.x > V.x2) continue;
          fillRect(br.x, p.y + 7, 6, br.low - p.y - 7, '#795f52', .94);
          fillRect(br.x, p.y + 7, 2, br.low - p.y - 7, '#d7b48a', .9);
          line(br.x + 4, Math.min(br.low - 2,p.y + 29), br.x + 24, p.y + 7,'#8c715b',.94,3);
        }
        const tile = sc.id === 'portales' ? 'stone_slim' : 'tiles_a';
        if (!drawSkinned(tile, p.x1, p.x2, p.y, p.kind === 'stair' ? 6 : 10)) fillRect(p.x1,p.y,p.w,7,'#ad7757');
        continue;
      }
      if (p.hidden && !(sc && sc.missingArt)) continue; // cornisa pintada en el propio fondo
      const x = p.x1, y = p.y, w = p.x2 - p.x1, h = p.h || 12;
      if(p.schoolFurniture&&schoolMaterial(p.schoolFurniture==='archivo'?'wood_shelf':p.schoolFurniture==='laboratorio'?'lab_top':'locker_top',x,y,w,p.drop?9:15)){if(p.drop){line(x+3,y+2,x+w-3,y+2,'#f0d8a0',.6,1);}continue;}
      if (p.kind === 'bounce') { if (p.artPainted) drawPaintedBounce(p, G); else if (p.umbrella) drawUmbrella(p, T, G); else drawAwning(p, T); continue; }
      if (p.kind === 'pigeon') { if (p.look) drawLookPlatform(p, T, G); else drawPigeon(p, T); continue; }
      if (p.kind === 'crumble') { drawCrumble(p, T); continue; }
      if (p.kind === 'belt') { drawBelt(p, T); continue; }
      if (p.look === 'losa') { drawLosa(p, T); continue; }   // V58.7: losas a flor de agua del santuario secreto
      if (p.kind === 'thin') {
        // V51: tablón con la misma textura de madera que el resto del arte (tablas de wood_table) + ménsulas.
        line(x + 8, y + 6, x + 18, y + 22, '#3b2a1d', 0.9, 3);
        line(x + w - 8, y + 6, x + w - 18, y + 22, '#3b2a1d', 0.9, 3);
        if (drawSkinned('plank', x, x + w, y, SKIN_H.plank)) continue;
        fillRR(x, y, w, h, 3, '#7a5639');
        fillRect(x, y, w, 3, '#c49a6c');
        for (let tx = x + 22; tx < x + w - 6; tx += 26) line(tx, y + 2, tx, y + h - 1, '#3b2a1d', 0.5, 1);
        continue;
      }
      const room = p.region !== 'main';
      const skin = room ? (p.theme === 'alcantarilla' ? 'stone_moss' : 'concrete') : (p.skin || (sc && sc.skin) || (p.theme === 'escuela' ? 'concrete' : 'stone_rocks'));
      if (p.kind === 'stair') { drawStep(p, skin); continue; }
      if (p.kind === 'moving' && p.look) { drawLookPlatform(p, T, G); continue; }
      if (p.kind === 'moving') {
        if (drawSkinned('hazard', x, x + w, y, SKIN_H.moving)) { line(x + 7, y + SKIN_H.moving + 1, x + w - 7, y + SKIN_H.moving + 1, '#9fffe8', 0.45, 1); continue; }
      } else if (drawSkinned(skin, x, x + w, y, room ? SKIN_H.room : p.sector ? SKIN_H.side : SKIN_H.floor)) continue;
      // Respaldo si la textura aún no carga.
      const school = p.theme === 'escuela' || p.theme === 'sotano';
      const moving = p.kind === 'moving';
      const base = school ? (moving ? '#416d70' : '#466078') : (moving ? '#8d5639' : '#584652');
      const topc = school ? (moving ? '#9ce9b0' : '#d5e5cb') : (moving ? '#ffd38a' : '#e7c18c');
      fillRR(x + 3, y + h * 0.55, w, h * 0.9, 5, '#03080d', 0.42);
      fillRR(x, y, w, h, Math.min(5, h * 0.25), base);
      fillRR(x, y, w, Math.max(3, h * 0.24), 3, topc);
    }
  }

  /* V58.7 · Losa de piedra con musgo a flor de agua (orillas del santuario secreto) y su pilar hundido. */
  function drawLosa(p, t) {
    const x = p.x1, y = p.y, w = p.x2 - p.x1;
    fillRect(x + w * 0.3, y + 10, w * 0.4, 60, '#123a4a', 0.55);
    fillRR(x - 2, y + 2, w + 4, 15, 4, '#02121c', 0.45);
    fillRR(x, y, w, 13, 4, '#5f7d86');
    fillRR(x, y, w, 4, 2, '#a8c7c4');
    for (let k = 0; k < Math.floor(w / 18); k++) {
      const mx = x + 6 + k * 18 + (hash(k, x | 0) % 7);
      fillRR(mx, y - 2, 9, 4, 2, '#5fae5a', 0.9);
      line(mx + 4, y + 2, mx + 4 + Math.sin(t * 2 + k) * 2, y + 9, '#3f8f45', 0.7, 1.4);
    }
    for (let k = 1; k < 4; k++) line(x + w * k / 4, y + 4, x + w * k / 4 + 3, y + 12, '#33505a', 0.7, 1);
  }

  function drawAwning(p, t) {
    const x = p.x1, y = p.y, w = p.x2 - p.x1, n = Math.max(3, Math.round(w / 18)), sw = w / n;
    const gdl = p.theme === 'guadalajara';
    const squash = Math.max(0, Math.sin(t * 3 + p.x1)) * 0;
    line(x + 4, y + 4, x + 4, y + 30, '#2b2f33', 1, 3);
    line(x + w - 4, y + 4, x + w - 4, y + 30, '#2b2f33', 1, 3);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#f4efe4' : gdl ? '#d6453b' : '#2f9a6a';
      ctx.beginPath();
      ctx.moveTo(x + i * sw, y + squash); ctx.lineTo(x + (i + 1) * sw, y + squash);
      ctx.lineTo(x + (i + 1) * sw, y + 12); ctx.quadraticCurveTo(x + (i + 0.5) * sw, y + 18, x + i * sw, y + 12);
      ctx.closePath(); ctx.fill();
    }
    tri(x + w / 2 - 6, y - 10, x + w / 2 + 6, y - 10, x + w / 2, y - 18, '#ffe27a', 0.55 + 0.35 * Math.sin(t * 6));
  }

  /* Paloma-trampolín en movimiento: se dibuja aleteando; al caer sobre ella impulsa hacia arriba. */
  function drawPigeon(p, t) {
    const cx = (p.x1 + p.x2) / 2, cy = p.y, w = p.x2 - p.x1;
    const up = (Math.sin(t * 9 + p.x1) * 0.5 + 0.5) * 12;
    fillRR(p.x1 + 5, cy - 4, w - 10, 3, 2, '#ffffff', 0.22 + 0.16 * Math.sin(t * 6 + p.x1)); // halo de impulso
    tri(cx - 3, cy + 3, cx - w * 0.42, cy - up, cx - 6, cy + 9, '#5f6c84', 0.95);            // ala izquierda
    tri(cx + 3, cy + 3, cx + w * 0.42, cy - up, cx + 6, cy + 9, '#5f6c84', 0.95);            // ala derecha
    tri(cx - w * 0.3, cy + 4, cx - w * 0.5, cy + 2, cx - w * 0.3, cy + 9, '#7e8aa2', 0.95);  // cola
    ellipse(cx, cy + 6, w * 0.3, 8, '#8f9bb0');                                              // cuerpo
    ellipse(cx - w * 0.04, cy + 4, w * 0.26, 6, '#aab5c8');
    circle(cx + w * 0.26, cy + 2, 5, '#9aa6ba');                                             // cabeza
    tri(cx + w * 0.33, cy + 1, cx + w * 0.44, cy + 2.5, cx + w * 0.33, cy + 4, '#e0a24a');   // pico
    circle(cx + w * 0.28, cy + 1, 1.3, '#201a16');                                           // ojo
  }

  function drawSolids(G, V) {
    for (const s of G.world.solids) {
      if (!inView(V, s.x1, s.y1, s.x2, s.y2)) continue;
      const x1 = Math.max(s.x1, V.x1 - 10), x2 = Math.min(s.x2, V.x2 + 10), y1 = Math.max(s.y1, V.y1 - 10), y2 = Math.min(s.y2, V.y2 + 10);
      // `draw: false`: sólido que ya pinta otra capa (orillas de las pozas, roca y meseta del mar pintado).
      if (s.kind === 'street' || s.draw === false) continue;
      if (s.kind === 'wall') {
        fillRect(x1, y1, x2 - x1, y2 - y1, '#0c151d');
        fillRect(s.side < 0 ? s.x2 - 8 : s.x1, y1, 8, y2 - y1, '#22323e');
      } else if (s.kind === 'roomwall') {
        fillRect(x1, y1, x2 - x1, y2 - y1, s.theme === 'alcantarilla' ? '#16211e' : '#1c1b24');
        fillRect(x1, s.y1 === y1 ? y1 : y1, x2 - x1, 3, '#4d5a62', s.y1 >= y1 ? 0.8 : 0);
      } else if (s.kind === 'crate') {
        if (s.broken) continue;
        const w = s.x2 - s.x1, h = s.y2 - s.y1;
        if(G.world.schoolMission&&schoolMaterial('crate',s.x1,s.y1,w,h))continue;
        fillRR(s.x1, s.y1, w, h, 3, '#9b6a3f');
        ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 3; ctx.beginPath(); ctx.rect(s.x1 + 2, s.y1 + 2, w - 4, h - 4);
        ctx.moveTo(s.x1 + 3, s.y1 + 3); ctx.lineTo(s.x2 - 3, s.y2 - 3); ctx.moveTo(s.x2 - 3, s.y1 + 3); ctx.lineTo(s.x1 + 3, s.y2 - 3); ctx.stroke();
        circle((s.x1 + s.x2) / 2, s.y1 + h / 2, 4, '#d9ff65', 0.5 + 0.3 * Math.sin(G.world.t * 5 + s.x1));
      } else if (s.kind === 'coral') {
        drawCoral(s, V);
      } else if (s.kind === 'barda') {
        drawBarda(s, x1, y1, x2, y2);
      } else if (s.kind === 'gate') {
        const h = s.y2 - s.y1, lift = (s.openT || 0) * (h - 6);
        if (s.openT >= 1) continue;
        for (let bx = s.x1 + 2; bx <= s.x2 - 2; bx += 5) line(bx, s.y1, bx, s.y2 - lift, '#8a97a0', 1, 2.2);
        line(s.x1, s.y1 + 8, s.x2, s.y1 + 8, '#5d6a72', 1, 3);
        line(s.x1, s.y2 - lift - 6, s.x2, s.y2 - lift - 6, '#5d6a72', 1, 3);
        if (!s.open) { fillRR((s.x1 + s.x2) / 2 - 7, s.y1 + h * 0.5 - 6, 14, 12, 3, '#ffd35a'); circle((s.x1 + s.x2) / 2, s.y1 + h * 0.5 - 1, 2, '#3a2a0a'); }
      } else {
        const school = s.theme === 'escuela';
        fillRect(x1, y1, x2 - x1, y2 - y1, school ? '#3e5566' : '#5a4650');
        fillRect(x1, s.y1, x2 - x1, Math.min(4, s.y2 - s.y1), school ? '#d5e5cb' : '#e7c18c', s.y1 >= V.y1 - 10 ? 0.85 : 0);
        for (let bx = s.x1 + 28; bx < s.x2; bx += 28) line(bx, y1 + 4, bx, y2, '#101923', 0.3, 1);
      }
    }
  }

  /* V58.6 · Barda de azotea: muro de block aplanado y pintado, con remate de concreto (los vidrios van aparte, en
     drawHazards, porque son el peligro). */
  function drawBarda(s, x1, y1, x2, y2) {
    const w = x2 - x1;
    fillRect(x1, y1, w, y2 - y1, '#d9c7a6');
    fillRect(x1, Math.max(y1, s.y2 - 46), w, s.y2 - Math.max(y1, s.y2 - 46), '#b9554a');   // guardapolvo rojo de la escuela
    fillRect(x1, y1, 4, y2 - y1, '#f1e4cb', 0.75);
    fillRect(x2 - 5, y1, 5, y2 - y1, '#9c8a6c', 0.8);
    for (let by = s.y1 + 22; by < s.y2 - 46; by += 22) line(x1 + 2, by, x2 - 2, by, '#b9a582', 0.45, 1);   // juntas del block
    if (s.y1 >= y1 - 1) { fillRect(s.x1 - 4, s.y1, s.x2 - s.x1 + 8, 7, '#8f8578'); fillRect(s.x1 - 4, s.y1, s.x2 - s.x1 + 8, 2, '#cfc6b8'); }
    for (const [fx, fy, r] of [[0.3, 0.42, 9], [0.62, 0.6, 7], [0.45, 0.25, 6]]) circle(s.x1 + (s.x2 - s.x1) * fx, s.y1 + (s.y2 - s.y1) * fy, r, '#c4ae88', 0.35);   // manchas de humedad
  }

  /* ---------- Elementos del mundo ---------- */
  function drawDoors(G, V, T) {
    for (const d of G.world.doors) {
      if (d.x < V.x1 - 40 || d.x > V.x2 + 40 || d.y < V.y1 - 60 || d.y > V.y2 + 30) continue;
      const pulse = 0.72 + 0.28 * Math.sin(T * 4 + d.phase);
      if (d.kind === 'secreto') { drawSecretDoor(d, G, T); continue; }
      if(G.world.schoolMission&&(d.schoolEntrance||d.kind==='salida'&&G.room?.schoolArt)){
        const near=G.region===d.region&&Math.abs(G.P.x-d.x)<80&&Math.abs(G.P.y+G.P.h/2-d.y)<65;
        if(schoolMaterial(d.schoolEntrance?'hatch':'exit_door',d.x-(d.schoolEntrance?34:29),d.y-(d.schoolEntrance?22:86),d.schoolEntrance?68:58,d.schoolEntrance?25:87)){
          if(near){const y=d.y-(d.schoolEntrance?48:104);fillRR(d.x-42,y-12,84,21,6,'#192b32',.94);text(d.schoolEntrance?'↓ ENTRAR':'↓ SALIR',d.x,y+3,10,'#f5dfac');}continue;
        }
      }
      if (d.kind === 'trampilla') {
        fillRR(d.x - 22, d.y - 5, 44, 7, 2, '#6b4a2e');
        line(d.x - 18, d.y - 2, d.x + 18, d.y - 2, '#3b2a1d', 0.8, 1);
        ring(d.x + 12, d.y - 2, 3, 2, '#c8d0d4', 0.9, 1.4);
      } else if (d.kind === 'alcantarilla') {
        ellipse(d.x, d.y - 1, 24, 5, '#4a5258');
        for (let k = -2; k <= 2; k++) line(d.x + k * 7, d.y - 5, d.x + k * 7, d.y + 3, '#2a3036', 0.9, 1.2);
      } else {
        fillRR(d.x - 20, d.y - 58, 40, 58, 8, '#0a1218', 0.95);
        ring(d.x, d.y - 29, 22, 31, '#69d7d2', 0.5 * pulse, 2);
        text('SALIDA', d.x, d.y - 66, 9, '#69d7d2');
      }
      ellipse(d.x, d.y - 26, 26, 30, '#69d7d2', 0.08 * pulse);
      tri(d.x - 7, d.y - 30 - pulse * 3, d.x + 7, d.y - 30 - pulse * 3, d.x, d.y - 20 - pulse * 3, '#69d7d2', 0.9 * pulse);
    }
  }

  /* V58.7 · Grieta escondida hacia una zona secreta: apenas un brillo tenue en la roca que se aviva cuando Sofía se
     acerca (en el mar, una grieta con burbujas; en la Luna, una escotilla con un símbolo extraño). */
  function drawSecretDoor(d, G, T) {
    const P = G.P, near = P ? Math.max(0, 1 - Math.hypot(P.x - d.x, P.y - d.y) / 200) : 0;
    const k = 0.22 + 0.78 * near, glow = 0.5 + 0.5 * Math.sin(T * 2.4 + d.phase);
    const sea = d.look === 'submarino', col = sea ? '#7ff6ff' : '#c48bff';
    ellipse(d.x, d.y - 2, 26, 6, col, (0.08 + 0.1 * glow) * k);
    if (sea) {
      // Grieta en zigzag con luz de adentro.
      ctx.globalAlpha = (0.45 + 0.45 * glow) * k; ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(d.x - 16, d.y - 1); ctx.lineTo(d.x - 7, d.y - 4); ctx.lineTo(d.x, d.y); ctx.lineTo(d.x + 8, d.y - 4); ctx.lineTo(d.x + 17, d.y - 1); ctx.stroke();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 3; i++) {
        const q = (T * 0.6 + i / 3) % 1;
        ring(d.x - 8 + i * 8 + Math.sin(T * 3 + i) * 2, d.y - 6 - q * 34, 1.6 + i * 0.5, 1.6 + i * 0.5, '#dffcff', (1 - q) * 0.8 * k, 1);
      }
    } else {
      ring(d.x, d.y - 2, 18, 4.5, col, (0.5 + 0.4 * glow) * k, 1.6);
      ctx.globalAlpha = (0.55 + 0.4 * glow) * k; ctx.strokeStyle = '#f0dcff'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(d.x - 5, d.y - 2); ctx.lineTo(d.x, d.y - 5); ctx.lineTo(d.x + 5, d.y - 2); ctx.moveTo(d.x, d.y - 5); ctx.lineTo(d.x, d.y + 1); ctx.stroke();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 2; i++) { const q = (T * 0.9 + i * 0.5) % 1; circle(d.x + (i ? 9 : -9), d.y - 4 - q * 24, 1.6, '#e7c9ff', (1 - q) * k); }
    }
    if (near > 0.55) {   // ya muy cerca: la flecha de BAJAR, como en las demás puertas
      tri(d.x - 6, d.y - 30 - glow * 3, d.x + 6, d.y - 30 - glow * 3, d.x, d.y - 21 - glow * 3, col, 0.85 * (near - 0.55) / 0.45);
    }
  }

  function drawCheckpoints(G, V, T) {
    for (const cp of G.world.checkpoints) {
      const x = cp.x + (G.world.schoolMission?-32:30), y = cp.y;
      if (x < V.x1 - 30 || x > V.x2 + 30 || y < V.y1 - 80 || y > V.y2 + 10) continue;
      if(G.world.schoolMission&&schoolSign(cp.active?1:0,x,y,78))continue;
      line(x, y, x, y - 56, '#9aa5a8', 1, 3);
      const c = cp.active ? '#d9ff65' : '#5d7f8c';
      if (cp.active) circle(x, y - 60, 18, '#d9ff65', 0.15 + 0.1 * Math.sin(T * 4));
      fillRR(x - 13, y - 72, 26, 22, 5, c);
      fillRR(x - 8, y - 68, 16, 10, 2, '#0d2230');
      circle(x - 5, y - 55, 2, '#0d2230'); circle(x + 5, y - 55, 2, '#0d2230');
    }
  }

  function drawMidpoints(G, V, T) {
    for (const cp of G.world.midpoints || []) {
      const x = cp.x, y = cp.y;
      if (x < V.x1 - 30 || x > V.x2 + 30 || y < V.y1 - 90 || y > V.y2 + 10) continue;
      if(G.world.schoolMission&&schoolSign(cp.active?1:0,x,y,96))continue;
      line(x, y, x, y - 62, '#cfd8dc', 1, 3);
      const wave = Math.sin(T * 4 + x) * 3, c = cp.active ? '#69d7d2' : '#5d7f8c';
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x + 1, y - 62); ctx.lineTo(x + 30, y - 55 + wave); ctx.lineTo(x + 1, y - 46); ctx.closePath(); ctx.fill();
      if (cp.active) circle(x, y - 64, 12, '#69d7d2', 0.15 + 0.1 * Math.sin(T * 4));
      text('½', x + 13, y - 54 + wave * 0.5, 8, '#062028');
    }
  }

  function drawSigns(G, V) {
    for (const s of G.world.signs) {
      if (s.x < V.x1 - 30 || s.x > V.x2 + 30 || s.y < V.y1 - 60 || s.y > V.y2 + 10) continue;
      if(G.world.schoolMission && (s.busStop||s.id==='school:final:hint'))continue;
      if(G.world.schoolMission && Number.isInteger(s.schoolSign) && schoolSign(s.schoolSign,s.x,s.y,102))continue;
      if (s.busStop) {
        line(s.x, s.y, s.x, s.y - 90, '#9aa5a8', 1, 4);
        fillRR(s.x - 26, s.y - 118, 52, 32, 6, '#1d8a6b');
        text('RUTA 6', s.x, s.y - 102, 11, '#ffffff');
        continue;
      }
      line(s.x, s.y, s.x, s.y - 26, '#4a3626', 1, 3);
      fillRR(s.x - 14, s.y - 42, 28, 20, 3, s.near ? '#d9b27a' : '#a98352');
      text('!', s.x, s.y - 32, 13, '#2a1a0a');
    }
  }

  /* V58.3 · Corriente marina: en calma casi no se nota; en aviso parpadean flechas en el sentido del arrastre; fuerte,
     estelas blancas veloces y burbujas arrastradas. */
  function drawCurrent(h,V,T){
    const x1=Math.max(h.x1,V.x1),x2=Math.min(h.x2,V.x2),y1=Math.max(h.y1,V.y1),y2=Math.min(h.y2,V.y2);
    if(x2<=x1||y2<=y1)return;
    const k=Math.max(0,h.k||0),warn=h.state==='warn',dir=h.dir||1;
    if(!warn&&k<.06)return;
    ctx.save();ctx.beginPath();ctx.rect(x1,y1,x2-x1,y2-y1);ctx.clip();
    // Advected bubbles at different elevations make the flow direction legible.
    const span=h.x2-h.x1,band=h.y2-h.y1;
    for(let i=0;i<32;i++){
      const seed=(i*.61803398875)%1,offset=(T*(25+(h.speed||0)*k)*dir+i*span/32);
      const x=h.x1+((offset%span)+span)%span,y=h.y1+band*(.12+.76*seed)+Math.sin(T*2+i)*4;
      if(x<x1-15||x>x2+15||y<y1-10||y>y2+10)continue;
      const alpha=(warn?.36:.14+.48*k)*Math.sin(Math.PI*(y-h.y1)/band),r=1.4+seed*2.2;
      ring(x,y,r,r,'#b4edf2',alpha,1);circle(x-r*.35,y-r*.35,.6,'#fff',alpha);
      if(k>.35){const len=7+11*k;line(x-dir*len,y+1,x-dir*4,y,'#a3dfe8',alpha*.5,1);}
    }
    ctx.restore();
    if(warn||k>.65){const cx=Math.max(x1+18,Math.min(x2-18,(h.x1+h.x2)/2)),cy=(h.y1+h.y2)/2;
      if(cy>=y1&&cy<=y2){ctx.save();ctx.globalAlpha=warn?.88:.52;ctx.fillStyle=warn?'#f5d68b':'#c1f3ef';ctx.beginPath();ctx.moveTo(cx+dir*10,cy);ctx.lineTo(cx-dir*5,cy-6);ctx.lineTo(cx-dir*5,cy+6);ctx.closePath();ctx.fill();ctx.restore();}}
  }
  /* V58.3 · Asteroide: mira roja de aviso con su trayectoria, roca encendida que cae en diagonal y polvo al chocar. */
  function drawAsteroid(h, V, T) {
    const A = NS.Obstacles.ASTEROID;
    if (h.state === 'idle') return;
    if (!inView(V, h.tx - A.run - 40, h.y - A.rise - 60, h.tx + A.run + 40, h.y + 20)) return;
    const sx = h.tx - h.dir * A.run, sy = h.y - 12 - A.rise;
    if (h.state === 'warn') {
      const p = h.t / A.warn, pulse = 0.5 + 0.5 * Math.sin(T * 16);
      // Columna roja sobre la mira y «!»: se ve aunque Sofía esté parada encima.
      fillRect(h.tx - 18, h.y - 140, 36, 140, '#ff3b3b', 0.16 + 0.16 * pulse);
      line(h.tx - 18, h.y - 140, h.tx - 18, h.y, '#ff7a6a', 0.7, 2); line(h.tx + 18, h.y - 140, h.tx + 18, h.y, '#ff7a6a', 0.7, 2);
      circle(h.tx, h.y - 112, 13, '#ff3b3b', 0.95); ring(h.tx, h.y - 112, 13, 13, '#ffffff', 0.9, 2); text('!', h.tx, h.y - 106, 17, '#ffffff');
      ellipse(h.tx, h.y, 26 - 8 * p, 6.5 - 2 * p, '#ff3b3b', 0.18 + 0.2 * pulse);
      ring(h.tx, h.y - 1, 26 - 8 * p, 6.5 - 2 * p, '#ff5a4a', 0.75 + 0.25 * pulse, 2);
      line(h.tx - 34, h.y - 1, h.tx - 14, h.y - 1, '#ff5a4a', 0.8, 2); line(h.tx + 14, h.y - 1, h.tx + 34, h.y - 1, '#ff5a4a', 0.8, 2);
      for (let s = 0; s < 9; s++) { const q = s / 9; if (q < p * 1.2) circle(sx + (h.tx - sx) * q, sy + (h.y - 12 - sy) * q, 1.8, '#ffb08a', 0.5); }
      circle(sx, sy, 7 + 3 * pulse, '#ff9a4a', 0.35); circle(sx, sy, 4, '#ffe3b0', 0.9);
      return;
    }
    if (h.state === 'fall') {
      const p = Math.min(1, h.t / A.fall), r = A.r, ang = T * 5 * h.dir;
      ellipse(h.tx, h.y, 10 + 14 * p, 3 + 2.5 * p, '#000000', 0.15 + 0.25 * p);
      ring(h.tx, h.y - 1, 22, 5.5, '#ff5a4a', 0.6, 1.5);
      // Estela encendida detrás de la roca.
      for (let s = 1; s <= 6; s++) {
        const b = s * 0.05;
        circle(h.rx - h.dir * A.run * b, h.ry - A.rise * b, r * (1 - s * 0.12), s < 3 ? '#ffd27a' : '#ff7a3a', 0.42 - s * 0.06);
      }
      ctx.save(); ctx.translate(h.rx, h.ry); ctx.rotate(ang);
      ctx.beginPath();
      for (let s = 0; s < 9; s++) { const a = s / 9 * Math.PI * 2, rr = r * (0.82 + 0.18 * ((s * 37 + h.seed * 13) % 7) / 6); if (s) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.moveTo(rr, 0); }
      ctx.closePath(); ctx.fillStyle = '#7a6a5c'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3a2f28'; ctx.stroke();
      circle(-5, -4, 4, '#5a4c42', 0.9); circle(6, 3, 3, '#5a4c42', 0.9); circle(-1, 7, 2.2, '#5a4c42', 0.9);
      circle(-6, -8, 3, '#c9b49a', 0.6);
      ctx.restore();
      return;
    }
    // Impacto: onda y polvo que se apagan.
    const q = Math.min(1, h.t / A.impact);
    ring(h.tx, h.y - 2, 14 + 46 * q, 4 + 10 * q, '#ffb07a', 0.8 * (1 - q), 3);
    for (let s = 0; s < 6; s++) circle(h.tx + (s - 2.5) * 12 * (0.6 + q), h.y - 6 - 18 * q * ((s % 3) + 1) / 3, 6 + 5 * q, '#b9a58e', 0.45 * (1 - q));
  }

  function drawHazards(G, V, T) {
    for (const h of G.world.hazards) {
      if (h.type === 'current') { drawCurrent(h, V, T); continue; }
      if (h.type === 'asteroid') { drawAsteroid(h, V, T); continue; }
      const x1 = h.type === 'pot' ? h.x - 14 : h.x1, x2 = h.type === 'pot' ? h.x + 14 : h.x2;
      const y1 = h.type === 'pot' ? h.hangY - 10 : h.y - 30, y2 = h.type === 'pot' ? h.floorY + 4 : h.y + 6;
      if (!inView(V, x1, y1, x2, y2)) continue;
      if (h.type === 'spikes' && h.look === 'vidrios') {
        // V58.6 · Vidrios de botella rotos sobre la barda: verdes, ámbar y claros, con brillo que parpadea.
        const n = Math.max(3, Math.round((h.x2 - h.x1) / 5.5));
        const COLORS = ['#58b07a', '#c98a3c', '#cfeffc', '#3f8f5f', '#e0a85a'];
        for (let i = 0; i < n; i++) {
          const k = (i * 37 + 11) % 17, hh = 13 + (k % 5) * 4, bx = h.x1 + 2 + (h.x2 - h.x1 - 4) * (i + 0.5) / n, lean = ((k % 3) - 1) * 4;
          tri(bx - 4.6, h.y + 1, bx + lean, h.y - hh - 1.5, bx + 4.6, h.y + 1, '#0b1a14', 0.55);   // contorno: se lee sobre cielo y sobre muro
          tri(bx - 3.6, h.y + 1, bx + lean, h.y - hh, bx + 3.6, h.y + 1, COLORS[k % COLORS.length], 0.95);
          line(bx - 1.2, h.y - 1, bx + lean * 0.6, h.y - hh + 4, '#ffffff', 0.65, 1.2);
        }
        const tw = (Math.sin(T * 5 + h.x1) + 1) / 2;
        circle(h.x1 + (h.x2 - h.x1) * 0.3, h.y - 10, 2.2 + tw, '#ffffff', 0.35 + 0.4 * tw);
        circle(h.x1 + (h.x2 - h.x1) * 0.72, h.y - 7, 1.6 + (1 - tw), '#ffffff', 0.3 + 0.4 * (1 - tw));
      } else if (h.type === 'spikes') {
        const n = Math.max(2, Math.round((h.x2 - h.x1) / 13));
        const sw = (h.x2 - h.x1) / n;
        ellipse((h.x1 + h.x2) / 2, h.y + 1, (h.x2 - h.x1) / 2 + 4, 4, '#06111b', 0.5);
        for (let i = 0; i < n; i++) tri(h.x1 + i * sw, h.y, h.x1 + (i + 0.5) * sw, h.y - h.h, h.x1 + (i + 1) * sw, h.y, '#ff6b69');
        fillRect(h.x1, h.y - 3, h.x2 - h.x1, 3, '#ffb4a0', 0.7);
      } else if (h.type === 'spark') {
        const on = h.state === 'on', warn = h.state === 'warn';
        // Postes claros, placa de aviso amarilla y cable con contorno: legible sobre el arte oscuro.
        line(h.x1 - 6, h.y - 34, h.x1, h.y - 1, '#8a96a0', 1, 3);
        line(h.x2 + 6, h.y - 34, h.x2, h.y - 1, '#8a96a0', 1, 3);
        tri(h.x1 - 15, h.y - 24, h.x1 + 3, h.y - 24, h.x1 - 6, h.y - 40, '#ffd35a');
        text('!', h.x1 - 6, h.y - 29, 9, '#1a1a1a');
        for (const [c, w] of [['#c8d0d4', 5], ['#20262b', 2.5]]) {
          ctx.globalAlpha = c === '#c8d0d4' ? 0.55 : 1; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(h.x1 - 6, h.y - 32);
          ctx.quadraticCurveTo((h.x1 + h.x2) / 2, h.y + 6, h.x2 + 6, h.y - 32); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (warn && Math.floor(T * 10) % 2 === 0) { circle(h.x1 - 6, h.y - 32, 5, '#ffe14a', 0.9); circle(h.x2 + 6, h.y - 32, 5, '#ffe14a', 0.9); circle((h.x1 + h.x2) / 2, h.y - 7, 4, '#ffe14a', 0.8); }
        if (on) {
          fillRect(h.x1, h.y - 26, h.x2 - h.x1, 26, '#7ad7ff', 0.12 + 0.08 * Math.sin(T * 40));
          ctx.globalAlpha = 0.95; ctx.strokeStyle = '#bff3ff'; ctx.lineWidth = 2; ctx.beginPath();
          for (let i = 0; i <= 8; i++) { const x = h.x1 + ((h.x2 - h.x1) * i) / 8, y = h.y - 4 - ((hash(i, Math.floor(T * 30)) % 20)); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
          ctx.stroke(); ctx.globalAlpha = 1;
        }
      } else if (h.type === 'puddle') {
        ellipse((h.x1 + h.x2) / 2, h.y + 1, (h.x2 - h.x1) / 2, 4.5, '#4f8fb5', 0.55);
        ellipse((h.x1 + h.x2) / 2 - 10, h.y, (h.x2 - h.x1) / 5, 1.5, '#d8f3ff', 0.5 + 0.2 * Math.sin(T * 3 + h.x1));
      } else if (h.type === 'pot') {
        if (h.state === 'broken') {
          if (h.t < 5) for (let i = 0; i < 4; i++) fillRect(h.x - 12 + i * 7, h.floorY - 4, 5, 4, '#b5643f', Math.max(0, 1 - h.t / 5));
          continue;
        }
        const shake = h.state === 'shake' ? Math.sin(h.t * 60) * 2 : 0;
        if (h.state !== 'fall') line(h.x, h.hangY - 4, h.x + shake, h.y - 10, '#2b2f33', 1, 1.5);
        else ellipse(h.x, h.floorY, 10 + (h.y - h.hangY) / 30, 3, '#000000', 0.25);
        if (h.state === 'shake') ellipse(h.x, h.floorY, 14, 3.5, '#ff6b69', 0.45);
        fillRR(h.x - 11 + shake, h.y - 6, 22, 16, 4, '#c0704a');
        fillRect(h.x - 13 + shake, h.y - 8, 26, 4, '#d98a5f');
        circle(h.x - 4 + shake, h.y - 12, 6, '#3f9a4f'); circle(h.x + 5 + shake, h.y - 13, 5, '#56b764');
      }
    }
  }

  const ITEM_COLORS = ['#69d7d2', '#ffb547', '#ff7ad9', '#d9ff65', '#ff6b69', '#ffd35a'];
  const PICKUP_SHEET = 'assets/ui/pickups_pro.png';
  const PICKUP_PRO = {"gem":[0,0,96,96],"shield":[96,0,96,96],"magnet":[192,0,96,96],"heart":[288,0,96,96],"key":[0,96,96,96],"credencial":[96,96,96,96],"bus_card":[192,96,96,96],"notebook":[288,96,96,96],"headphones":[0,192,96,96],"sweater":[96,192,96,96],"keyring":[192,192,96,96]};
  function drawPickupPro(name,x,y,size) {
    const r=PICKUP_PRO[name],im=image(PICKUP_SHEET);if(!r||!ready(im))return false;
    ctx.drawImage(im,...r,x-size/2,y-size/2,size,size);return true;
  }
  function drawItemIcon(i, x, y) {
    if(drawPickupPro(['credencial','bus_card','notebook','headphones','sweater','keyring'][i],x,y,34))return;
    const c = ITEM_COLORS[i % ITEM_COLORS.length];
    if (i === 0 || i === 1) { fillRR(x - 9, y - 6, 18, 12, 2, c); fillRect(x - 6, y - 2, 6, 6, '#0d2230', 0.7); }
    else if (i === 2) { fillRR(x - 7, y - 9, 14, 18, 2, c); line(x - 4, y - 5, x + 4, y - 5, '#0d2230', 0.7, 1.5); }
    else if (i === 3) { ring(x, y - 1, 8, 7, c, 1, 3); fillRect(x - 10, y, 5, 7, c); fillRect(x + 5, y, 5, 7, c); }
    else if (i === 4) { fillRR(x - 10, y - 7, 20, 15, 4, c); fillRect(x - 3, y - 7, 6, 4, '#ffffff', 0.8); }
    else { ring(x - 3, y - 2, 5, 5, c, 1, 2.5); fillRect(x + 1, y - 2, 10, 3, c); fillRect(x + 7, y, 3, 4, c); }
  }

  function drawPickups(G, V, T) {
    for (const p of G.world.pickups) {
      if (p.got || p.x < V.x1 - 30 || p.x > V.x2 + 30 || p.y < V.y1 - 30 || p.y > V.y2 + 30) continue;
      if (p.type === 'gem') {
        const k = 1 + Math.sin(T * 5 + p.phase) * 0.13;
        const marine=G.world.scenes[G.tramo]?.theme==='submarino' && G.world.waters.some(z=>z.sea&&p.y>z.y&&p.y<z.y2&&p.x>=z.x1&&p.x<=z.x2);
        if(marine&&drawAbyssObject(0,p.x,p.y,27*k))continue;
        if(drawPickupPro('gem',p.x,p.y,29*k))continue;
        circle(p.x, p.y, 18 * k, '#d9ff65', 0.12);
        ctx.fillStyle = '#d9ff65'; ctx.strokeStyle = '#f4ffd0'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(p.x, p.y - 11 * k); ctx.lineTo(p.x + 8 * k, p.y); ctx.lineTo(p.x, p.y + 11 * k); ctx.lineTo(p.x - 8 * k, p.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (p.type === 'power') {
        const c = p.power === 'shield' ? '#69d7d2' : p.power === 'magnet' ? '#ff7ad9' : '#ff6b69', bob = Math.sin(T * 3 + p.phase) * 3, y = p.y + bob;
        if(drawPickupPro(p.power==='shield'?'shield':p.power==='magnet'?'magnet':'heart',p.x,y,31))continue;
        circle(p.x, y, 22, c, 0.2); circle(p.x, y, 12, c); ring(p.x, y, 12, 12, '#ffffff', 1, 2);
        if (p.power === 'shield') fillRect(p.x - 4, y - 6, 8, 12, '#ffffff');
        else if (p.power === 'magnet') { fillRect(p.x - 6, y - 5, 4, 10, '#ffffff'); fillRect(p.x + 2, y - 5, 4, 10, '#ffffff'); }
        else { fillRect(p.x - 6, y - 2, 12, 4, '#ffffff'); fillRect(p.x - 2, y - 6, 4, 12, '#ffffff'); }
      } else if (p.type === 'key') {
        const bob = Math.sin(T * 3 + p.x) * 3, y = p.y + bob;
        if(drawPickupPro('key',p.x,y,32))continue;
        circle(p.x, y, 20, '#ffd35a', 0.16);
        ring(p.x - 5, y, 6, 6, '#ffd35a', 1, 3.5);
        fillRect(p.x, y - 2, 13, 4, '#ffd35a'); fillRect(p.x + 8, y + 1, 3, 5, '#ffd35a'); fillRect(p.x + 12, y + 1, 2, 4, '#ffd35a');
      } else if (p.type === 'item') {
        const bob = Math.sin(T * 2.4) * 4, y = p.y + bob;
        circle(p.x, y, 28 + Math.sin(T * 4) * 3, '#ffe27a', 0.14);
        circle(p.x, y, 17, '#0d2230', 0.85); ring(p.x, y, 17, 17, '#ffe27a', 0.95, 2);
        drawItemIcon(p.itemIndex, p.x, y);
        for (let i = 0; i < 3; i++) { const a = T * 2 + i * 2.1; circle(p.x + Math.cos(a) * 24, y + Math.sin(a) * 24, 1.8, '#ffffff', 0.8); }
      }
    }
  }

  function bang(x, y, T) {
    fillRR(x - 4, y - 14, 8, 11, 3, '#ffe14a', 0.85 + 0.15 * Math.sin(T * 20));
    fillRect(x - 3, y - 1, 6, 4, '#ffe14a');
  }

  const BOSS_GLOW = { dog: '#ff984f', kid: '#ff6868', chile: '#ff593f', bat: '#b48cff', pigeon: '#63d9ed', bravo: '#ff625b', rat: '#d9ff65', piranha: '#76ffca', shark: '#6cefff', drone: '#b69bff', pulpo: '#d58bff', poseidon: '#7ff0ff',
    maestro: '#ffd34a', pulpo_abismo: '#ff7ad9', marciano: '#b6ff5a' };   // V58.7
  function drawBossFX(f, T) {
    if (!f.isBoss) return;
    const color = BOSS_GLOW[f.kind] || '#ffd35a', cx = f.x;
    const cy = f.y - (NS.Enemies.TYPES[f.kind]?.flyer ? 0 : f.h * 0.54);
    const pulse = 0.5 + 0.5 * Math.sin(T * 4.5 + f.phase);
    ellipse(cx, f.y + 1, f.w * (0.66 + pulse * 0.12), 4, color, 0.22);
    ring(cx, cy, f.w * (0.56 + pulse * 0.08), f.h * 0.58, color, 0.18 + pulse * 0.1, 1.6);
    for (let i = 0; i < 3; i++) {
      const a = T * (2.2 + i * 0.16) + f.phase + i * Math.PI * 2 / 3;
      const r = f.w * 0.62 + Math.sin(T * 5 + i) * 3;
      circle(cx + Math.cos(a) * r, cy + Math.sin(a) * f.h * 0.62, i === 1 ? 2.5 : 1.8, color, 0.65 + pulse * 0.25);
    }
    const windup = T - (f.bossWindupStart ?? -999);
    if (windup >= 0 && windup < 0.48) {
      const p = windup / 0.48, r = 10 + p * (f.w + 32);
      ring(cx, cy, r, r * 0.72, '#fff1b8', (1 - p) * 0.9, 3 - p * 2);
    }
    if (['windup', 'aim', 'telegraph', 'alert'].includes(f.state)) {
      const q = 0.5 + 0.5 * Math.sin(T * 15 + f.phase);
      ring(cx, cy, f.w * (0.78 + q * 0.36), f.h * (0.78 + q * 0.4), '#ffe69a', 0.35 + q * 0.3, 2.2);
      for (let i = 0; i < 3; i++) line(cx - f.dir * (f.w * 0.55 + i * 7), f.y - f.h * 0.35 - i * 4, cx - f.dir * (f.w * 1.0 + i * 8), f.y - f.h * 0.35 - i * 4, color, 0.45 - i * 0.08, 2);
    }
    const intro = T - (f.bossIntroStart ?? -999);
    if (intro >= 0 && intro < 1.35) {
      const p = intro / 1.35, r = 12 + p * (f.w + 58);
      ring(cx, cy, r, r * 0.72, '#f7fbff', (1 - p) * 0.8, 2.5 - p);
      ring(cx, cy, r * 0.62, r * 0.9, color, (1 - p) * 0.62, 1.8);
      for (let i = 0; i < 7; i++) {
        const a = i * Math.PI * 2 / 7 + intro * 2.5, rr = r * 0.65;
        circle(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.72, 2.6, i % 2 ? '#ffe69a' : color, (1 - p) * 0.9);
      }
    }
    const hit = T - (f.bossHitStart ?? -999);
    if (hit >= 0 && hit < 0.34) {
      const p = hit / 0.34, r = f.w * 0.45 + p * 44;
      drawHdFx('energy_burst', cx, cy, p, Math.min(128, f.w + 70), 1, 0.66 * (1 - p));
      ring(cx, cy, r, r * 0.7, '#fff8c9', 1 - p, 3 - p * 2);
    }
    if (f.dead && f.deadT <= 0.45) {
      const p = Math.max(0, f.deadT / 0.45), r = 16 + p * 88;
      drawHdFx('shockwave', cx, cy, p, Math.min(150, f.w + 100), 1, 0.75 * (1 - p));
      ring(cx, cy, r, r * 0.72, color, 1 - p, 3 - p * 2);
      for (let i = 0; i < 9; i++) {
        const a = i * Math.PI * 2 / 9 + T * 1.8, rr = 12 + p * 56;
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.8;
        tri(px, py - 3, px + 3, py + 2, px - 3, py + 2, i % 2 ? '#fff2a0' : color, 1 - p);
      }
    }
  }

  /* ---- V50 · Enemigos con sprites revisados (assets/enemies/v50) ----
     Solo frames completos (fuera los recortados en el borde y la cola suelta de la rata), anclados por
     frame al centro del cuerpo y a la línea de las patas (NS.ART.ENEMY) para que no "brinquen".
     El perro bravo usa la lámina del perro pero más grande, más oscuro y con aura de armadura
     (que desaparece cuando está mareado = cuando el dash sí le hace daño). */
  const EDIR = 'assets/enemies/v50/';
  const ESPR = {
    kid: { sc: 0.46, scBoss: 0.62 },
    kid_astronauta: { sc: 0.46, scBoss: 0.62, ext: '.webp' },   // V58.1 · atlas aportados del niño gordito
    kid_buzo: { sc: 0.46, scBoss: 0.62, ext: '.webp' },
    rat: { sc: 0.5, scBoss: 0.6 },
    dog: { sc: 0.52, scBoss: 0.66 }
  };
  const enemyFrames = (kind, state) => {
    const E = NS.ART && NS.ART.ENEMY[kind];
    return E && E.states[state] ? E.states[state] : null;
  };
  const espr = (kind) => EDIR + kind + '/';
  function enemyReady(kind) {
    const w = enemyFrames(kind, 'walk');
    return !!(w && ready(image(espr(kind) + w[0] + ((ESPR[kind] && ESPR[kind].ext) || '.png'))));
  }
  // V58.1 · Cuadros del niño con traje (lienzo 280 × 250, pies en 140, 242). Lanza piedra con su propia animación.
  const KID_SUIT = {
    states: { idle: ['idle_01', 'idle_02', 'idle_03', 'idle_04'], walk: ['walk_01', 'walk_02', 'walk_03', 'walk_04', 'walk_05'],
      alert: ['guard', 'throw_prepare'], aim: ['throw_prepare', 'throw_windup', 'throw_release', 'throw_projectile'],
      hurt: ['hurt'], dizzy: ['hurt'], dead: ['hurt', 'jump_air'] },
    frames: {}
  };
  for (const l of Object.values(KID_SUIT.states)) for (const n of l) KID_SUIT.frames[n] = [140, 242];
  if (NS.ART && NS.ART.ENEMY) { NS.ART.ENEMY.kid_astronauta = KID_SUIT; NS.ART.ENEMY.kid_buzo = KID_SUIT; }
  const KID_ROCK = EDIR + 'kid_piedra.webp';
  /** Archivos de los personajes con traje (V58.1), para precarga y caché sin conexión. */
  function castUrls() {
    const out = new Set([KID_ROCK]);
    for (const l of Object.values(ASTRO)) for (const n of l) out.add(ASTRO_DIR + n + '.webp');
    for (const c of Object.values(COMPANIONS_SPACE)) for (const f of [...c.idle, ...c.walk, c.shoulder]) out.add(f);
    for (const k of ['kid_astronauta', 'kid_buzo']) for (const n of Object.keys(KID_SUIT.frames)) out.add(EDIR + k + '/' + n + '.webp');
    return [...out];
  }
  const enemyExt = (kind) => (ESPR[kind] && ESPR[kind].ext) || '.png';
  function drawEnemySprite(f, T, kind) {
    const E = NS.ART.ENEMY[kind], def = ESPR[kind];
    const pick = (...names) => { for (const n of names) { const l = enemyFrames(kind, n); if (l && l.length) return l; } return E.states.walk; };
    let list, idx;
    if (f.dead) { list = pick('dead', 'hurt'); idx = Math.min(list.length - 1, Math.floor(f.deadT * 8)); }
    else if (f.flash > 0) { list = pick('hurt', 'alert'); idx = Math.min(list.length - 1, Math.floor(((0.2 - f.flash) / 0.2) * list.length)); }
    else {
      let fps = 9, nm = 'walk';
      const st = f.state;
      if (st === 'windup') { nm = 'alert'; fps = 7; }
      else if (st === 'aim') { nm = 'aim'; fps = 6; }
      else if (st === 'charge') { nm = 'walk'; fps = 16; }
      else if (st === 'dizzy') { nm = 'dizzy'; fps = 3; }
      else if (st === 'recoil') { nm = 'hurt'; fps = 8; }
      else if (st === 'alert') { nm = 'alert'; fps = 8; }
      else if (st === 'patrol') { nm = 'walk'; fps = 9; }
      else if (st === 'distracted') { nm = 'idle'; fps = 4; }
      else { nm = 'idle'; fps = 5; }
      list = pick(nm, nm === 'aim' ? 'alert' : 'idle', 'walk');
      idx = Math.floor(T * fps + f.x * 0.05) % list.length;
    }
    const name = list[Math.max(0, idx)];
    const img = image(espr(kind) + name + (def.ext || '.png'));
    if (!ready(img)) return;
    const anc = E.frames[name] || [img.naturalWidth / 2, img.naturalHeight];
    const bravo = f.kind === 'bravo';
    const sc = (f.isBoss ? def.scBoss : def.sc) * (bravo ? 1.3 : 1);
    const dx = f.x - anc[0] * sc, dy = f.y - anc[1] * sc, dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
    ellipse(f.x, f.y + 1, Math.min(dw * 0.3, 40), 4, '#06111b', 0.4);
    if (bravo && !f.dead && f.state !== 'dizzy') {
      // Aura de "armadura": el dash rebota mientras se vea.
      const q = 0.5 + 0.5 * Math.sin(T * 5 + f.phase);
      ellipse(f.x, f.y - dh * 0.32, dw * 0.36, dh * 0.34, '#9fd8ff', 0.07 + 0.05 * q);
      ring(f.x, f.y - dh * 0.32, dw * 0.37, dh * 0.35, '#bfe6ff', 0.28 + 0.2 * q, 1.6);
    }
    ctx.save();
    if (f.dir < 0) { ctx.translate(f.x, 0); ctx.scale(-1, 1); ctx.translate(-f.x, 0); }
    // Sacudida corta al retroceder tras un golpe (jefes).
    const jit = f.state === 'recoil' ? Math.sin(T * 60) * 1.5 : 0;
    ctx.drawImage(img, dx + jit, dy, dw, dh);
    if (bravo) {
      const tint = silhouette(img, '#3a0d0a');
      if (tint) { ctx.globalAlpha = 0.34; ctx.drawImage(tint, dx + jit, dy, dw, dh); ctx.globalAlpha = 1; }
    }
    // Destello blanco al recibir un golpe: la silueta del sprite se ilumina un instante.
    if (f.flash > 0 && !f.dead) {
      const sil = silhouette(img, '#ffffff');
      if (sil) { ctx.globalAlpha = Math.min(1, f.flash / 0.2) * 0.75; ctx.drawImage(sil, dx + jit, dy, dw, dh); ctx.globalAlpha = 1; }
    }
    ctx.restore();
    if (f.state === 'dizzy' && !f.dead) {
      const hy = f.y - dh * 0.78;
      for (let i = 0; i < 3; i++) { const an = T * 6 + i * 2.1; circle(f.x + Math.cos(an) * dw * 0.18, hy + Math.sin(an) * 4, 2.4, '#ffe14a'); }
    }
    if ((f.state === 'windup' || f.state === 'aim') && !f.dead) bang(f.x, f.y - dh * 0.86, T);
  }

  /* ---------- V58.2 · Enemigos marinos con atlas (paquete «Sofía · enemigos marinos R1») ----------
     Cuadros recortados: [x, y, w, h, cx, cy] (cx, cy = posición del recorte dentro de su celda, para que no tiemble).
     El arte mira a la derecha. `hurt` es la caja del cuerpo dentro de la celda (guía del paquete) para escalar. */
  const MARINE_DIR = 'assets/enemies/marinos/';
  const MARINE_ART = {"shark":{"src":"tiburon","cell":[321,216],"frames":[[34,28,253,160,34,28],[372,36,218,143,51,36],[694,45,217,125,52,45],[1011,41,224,134,48,41],[1342,38,205,140,58,38],[1656,44,218,128,51,44],[58,261,204,126,58,45],[360,248,242,152,39,32],[691,246,222,156,49,30],[1018,246,211,156,55,30],[1335,242,219,163,51,26],[1659,233,212,182,54,17],[54,441,213,198,54,9],[377,468,209,144,56,36],[674,473,257,134,32,41],[979,474,289,132,16,42],[1296,475,296,130,12,43],[1614,472,303,135,9,40],[20,690,280,131,20,42],[362,686,239,140,41,38],[690,684,224,144,48,36],[1009,681,228,150,46,33],[1336,681,216,150,52,33],[1665,680,201,152,60,32],[63,906,195,132,63,42],[388,899,187,145,67,35],[690,891,224,161,48,27],[1017,890,212,163,54,26],[1336,890,216,164,52,26],[1659,895,213,153,54,31],[49,1112,222,151,49,32],[377,1115,208,146,56,35],[699,1121,206,133,57,41]],"anims":{"swim":[[0,1,2,3,4,5,6],100,1],"bite":[[7,8,9,10,11,12,13],91,0],"dash_bite":[[14,15,16,17,18],77,0],"hurt":[[19,20,21,22,23,24,25],111,0],"death":[[26,27,28,29,30,31,32],143,0]},"fx":[[9,9,137,107]]},"piranha":{"src":"pirana","cell":[289,180],"frames":[[35,11,218,157,35,11],[328,15,210,150,39,15],[619,20,206,140,41,20],[907,17,208,146,40,17],[1196,17,208,145,40,17],[1487,15,205,150,42,15],[42,200,205,140,42,20],[334,204,198,131,45,24],[618,207,209,126,40,27],[904,198,214,144,37,18],[1185,198,231,144,29,18],[1471,200,237,139,26,20],[9,372,271,156,9,12],[327,386,213,127,38,26],[626,380,193,140,48,20],[913,374,197,151,46,14],[1192,377,217,145,36,17],[1478,369,223,162,33,9],[31,551,227,157,31,11],[328,555,211,149,39,15],[622,555,200,150,44,15],[923,563,177,134,56,23],[1217,557,167,145,61,17],[1496,557,186,146,51,17],[59,730,171,160,59,10],[344,731,178,158,55,11],[630,732,184,156,52,12],[923,736,176,147,56,16],[1204,732,192,156,48,12],[1493,734,193,152,48,14],[44,920,201,139,44,20],[344,921,178,138,55,21],[626,923,193,133,48,23],[919,924,184,132,52,24],[1179,923,242,133,23,23]],"anims":{"swim":[[0,1,2,3,4,5,6],83,1],"bite":[[7,8,9,10,11,12,13],77,0],"hurt":[[14,15,16,17,18,19,20],111,0],"stun":[[21,22,23,24,25,26,27],167,1],"death":[[28,29,30,31,32,33,34],143,0]},"fx":[[25,9,199,142],[296,20,154,120],[535,20,175,119],[789,13,164,134],[1037,18,167,123],[61,186,126,108],[258,179,231,121],[521,194,202,92],[787,191,168,97],[1033,189,174,102]]},"pulpo":{"src":"pulpo","cell":[322,196],"frames":[[40,9,242,178,40,9],[368,9,229,177,46,9],[692,12,226,171,48,12],[1007,12,240,172,41,12],[1326,12,245,172,38,12],[1648,12,245,172,38,12],[55,231,212,125,55,35],[370,232,225,123,48,36],[691,233,228,122,47,37],[1006,229,242,129,40,33],[1328,229,242,129,40,33],[1646,231,250,125,36,35],[49,414,224,151,49,22],[366,411,233,157,44,19],[681,409,247,161,37,17],[1003,409,248,162,37,17],[1311,410,275,159,23,18],[1648,418,245,144,38,26],[53,620,215,131,53,32],[374,608,218,155,52,20],[676,608,257,155,32,20],[992,616,269,139,26,28],[1311,624,275,124,23,36],[1636,625,270,122,26,37],[62,807,197,150,62,23],[367,808,231,147,45,24],[690,808,229,147,46,24],[1005,807,244,150,39,23],[1323,807,251,150,35,23],[1619,815,304,134,9,31],[52,999,218,158,52,19],[375,998,215,159,53,18],[698,1001,213,154,54,21],[1020,1007,213,141,54,27],[1339,1010,220,135,51,30],[1663,1022,215,111,53,42],[48,1223,226,102,48,47]],"anims":{"idle":[[0,1,2,3,4,5],143,1],"swim":[[6,7,8,9,10,11],111,1],"bite":[[12,13,14,15,16,17],91,0],"tentacle_slam":[[18,19,20,21,22,23],111,0],"ink_attack":[[24,25,26,27,28,29],125,0],"hurt":[[30,31,32,33],111,0],"death":[[34,35,36],200,0]},"fx":null},"poseidon":{"src":"poseidon","cell":[323,267],"frames":[[34,9,254,249,34,9],[359,18,251,230,36,18],[676,32,263,202,30,32],[998,43,265,180,29,43],[1319,52,269,163,27,52],[1645,65,262,137,30,65],[67,279,188,242,67,12],[388,281,192,238,65,14],[683,286,248,228,37,19],[981,299,298,202,12,32],[1301,310,305,180,9,43],[1631,293,291,215,16,26],[58,547,206,241,58,13],[371,553,226,229,48,19],[682,553,251,229,36,19],[995,561,270,213,26,27],[1304,560,299,214,12,26],[1633,563,286,208,18,29],[56,818,211,232,56,17],[376,826,217,217,53,25],[699,821,216,226,53,20],[1009,845,243,179,40,44],[1330,866,246,137,38,65],[1633,867,287,135,18,66]],"anims":{"idle_swim":[[0,1,2,3,4,5],111,1],"trident_attack":[[6,7,8,9,10,11],100,0],"tidal_attack":[[12,13,14,15,16,17],125,0],"hurt":[[18,19,20],125,0],"death":[[21,22,23],167,0]},"fx":[[35,37,108,97],[187,19,160,133],[377,9,136,153]]}};
  const MARINE_BODY = { shark: 193, piranha: 173, pulpo: 193, poseidon: 194 };
  const marineReady = (kind) => !!MARINE_ART[kind] && ready(image(MARINE_DIR + MARINE_ART[kind].src + '.webp'));
  function marineAnim(f) {
    const k = f.kind, st = f.state;
    if (f.dead) return ['death', f.deadT];
    if (f.flash > 0) return ['hurt', 0.2 - f.flash];
    if (k === 'poseidon') return st === 'windup' || st === 'charge' ? ['trident_attack', f.stateT] : st === 'aim' ? ['tidal_attack', f.stateT] : st === 'dizzy' ? ['hurt', f.stateT % 0.4] : ['idle_swim', null];
    if (k === 'pulpo') return st === 'aim' ? ['ink_attack', f.stateT] : st === 'dizzy' ? ['hurt', f.stateT % 0.45] : [Math.abs(f.dir) ? 'swim' : 'idle', null];
    if (k === 'shark') return st === 'windup' ? ['bite', f.stateT] : st === 'charge' ? ['dash_bite', f.stateT] : st === 'dizzy' ? ['hurt', f.stateT % 0.8] : ['swim', null];
    return st === 'windup' || st === 'charge' ? ['bite', f.stateT] : st === 'dizzy' ? ['stun', null] : ['swim', null];   // piraña
  }
  function productionFrame(id, clipName, t, loop = false, ms = 0, progress = null) {
    const a = NS.ART && NS.ART.PRODUCTION && NS.ART.PRODUCTION[id];
    const c = a && a.clips[clipName];
    if (!c) return null;
    const im = image(a.sheet);
    if (!ready(im)) return null;
    const n = c.frames.length;
    const i = progress === null ? waterFrameIndex(t, ms || c.ms, n, loop) : Math.min(n-1,Math.floor(Math.max(0,Math.min(1,progress))*n));
    const f = c.frames[i];
    if (!f || f[0]+f[2]>im.naturalWidth || f[1]+f[3]>im.naturalHeight) return null;
    return {im, f, ref:a.ref};
  }
  function drawProductionFrame(p, x, y, sc, face, alpha = 1, rot = 0) {
    const [sx,sy,sw,sh,ax,ay,direction] = p.f;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x,y); if(rot)ctx.rotate(rot);
    ctx.scale(((face<0)!==(direction==='left')?-1:1)*sc,sc);
    ctx.drawImage(p.im,sx,sy,sw,sh,-ax,-ay,sw,sh); ctx.restore();
  }
  function drawMarineFoe(f, T) {
    const A = MARINE_ART[f.kind], im = image(MARINE_DIR + A.src + '.webp');
    const [name, t] = marineAnim(f), an = A.anims[name] || A.anims.swim || A.anims.idle_swim;
    if (f.kind==='shark') {
      const clip = name==='swim'?'nadar_lento':name==='death'?'morir':name==='bite'||name==='dash_bite'?'morder':null;
      const q = clip && productionFrame('tiburon_feroz',clip,t===null?T:t,t===null,0,name==='death'?f.deadT/0.45:null);
      if(q){
        // Target body height matches the existing shark's painted swim silhouette.
        const scale=(f.w*1.25)/MARINE_BODY.shark * 143/q.ref;
        drawProductionFrame(q,f.x,f.y+(f.dead?0:Math.sin(T*2.2+f.phase)*1.5),scale,f.dir);
        if(f.state==='windup'&&!f.dead)bang(f.x,f.y-44,T);
        return;
      }
    }
    const [list, ms, loop] = an;
    const i = t === null || loop ? Math.floor((T * 1000 + f.phase * 400) / ms) % list.length : Math.min(list.length - 1, Math.floor(Math.max(0, t) * 1000 / ms));
    const fr = A.frames[list[i]], s = (f.w * 1.25) / MARINE_BODY[f.kind];
    const [cw, ch] = A.cell;
    ctx.save();
    ctx.translate(f.x, f.y + (f.dead ? 0 : Math.sin(T * 2.2 + f.phase) * 1.5));
    if (f.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(im, fr[0], fr[1], fr[2], fr[3], (-cw / 2 + fr[4]) * s, (-ch / 2 + fr[5]) * s, fr[2] * s, fr[3] * s);
    ctx.restore();
    if ((f.state === 'windup' || f.state === 'aim') && !f.dead) bang(f.x, f.y - ch * s * 0.42, T);
  }

  /* ---------- V58.7 · Enemigos secretos y jefes nuevos (NS.ART.ATLAS_FOES, js/app/art_secretos.js) ----------
     Cuadros [x, y, w, h, ox, oy] respecto a un ancla fija por personaje (los pies si camina, el centro si nada): así no
     tiemblan. Se escala por el alto: el cuerpo en reposo (`ref` px) mide f.h × ATLAS_VIS u. Solo se usaron los cuadros
     completos del paquete (ver tools/arte/secretos_pack.py); lo que el arte no trae (el golpe del Pulpo del Abismo, su
     tinta y su chorro, los mareos) se dibuja con efectos encima de esos cuadros. */
  const ATLAS_FOES = () => (NS.ART && NS.ART.ATLAS_FOES) || {};
  const ATLAS_VIS = { pulpito: 1.55, buzito: 1.35, marciano: 1.12, astronino: 1.14, maestro: 1.13, pulpo_abismo: 1.45 };
  const ATLAS_LIFE = { maestro: 1.5, pulpo_abismo: 1.2, marciano: 0.75, astronino: 0.7, pulpito: 0.7, buzito: 0.6 };
  const atlasReady = (kind) => { const A = ATLAS_FOES()[kind]; return !!A && ready(image(A.src)); };
  const atlasLife = (f) => ATLAS_LIFE[f.kind] || 0.45;
  /** Animación del enemigo según su estado: [nombre, tiempo (null = bucle), efectos]. */
  function atlasPick(f) {
    const k = f.kind, st = f.state, T = NS.Enemies.TYPES[k] || {};
    const fx = {};
    if (f.dead) {
      if (k === 'maestro') return f.deadT < 0.42 ? ['fall', f.deadT, fx] : ['ko', f.deadT - 0.42, fx];
      if (k === 'pulpo_abismo') { fx.dy = f.deadT * 30; return ['ko', f.deadT, fx]; }
      if (k === 'buzito' || k === 'pulpito') fx.dy = f.deadT * 26;   // se hunde
      return ['death', f.deadT, fx];
    }
    if (st === 'windup' || st === 'aim' || st === 'shout') fx.bang = true;
    if (st === 'dizzy') fx.stars = true;
    switch (k) {
      case 'pulpito':
        if (st === 'charge') return ['tentacle', f.stateT, fx];
        if (st === 'windup') { fx.shake = 1.4; return ['idle', null, fx]; }
        if (st === 'aim') { fx.scale = 1 + 0.12 * Math.min(1, f.stateT / ((T.windup || 0.5) * 1.1)); return ['idle', null, fx]; }
        return [st === 'dizzy' ? 'idle' : 'swim', null, fx];
      case 'buzito':
        if (st === 'aim') return ['throw', f.stateT, fx];
        if (f.flash > 0 || st === 'dizzy') return ['hurt', f.flash > 0 ? 0.2 - f.flash : f.stateT % 0.4, fx];
        return ['swim', null, fx];
      case 'marciano':
        if (f.flash > 0 || st === 'recoil') return ['hurt', f.flash > 0 ? 0.2 - f.flash : f.stateT, fx];
        if (st === 'aim') { fx.charge = Math.min(1, f.stateT / (T.windup || 0.6)); return ['shoot', Math.min(f.stateT, 0.279), fx]; }
        if (f.shotT > 0) return ['shoot', 0.29, fx];
        if (st === 'dizzy') return ['hurt', f.stateT % 0.4, fx];
        return ['walk', null, fx];
      case 'astronino':
        if (f.flash > 0 || st === 'recoil') return ['hurt', f.flash > 0 ? 0.2 - f.flash : f.stateT, fx];
        if (st === 'aim') return ['throw', f.stateT, fx];
        if (st === 'windup') { fx.shake = 1.2; return ['idle', null, fx]; }
        if (st === 'charge') { fx.fast = 2; fx.lines = true; return ['walk', null, fx]; }
        if (st === 'dizzy') return ['hurt', f.stateT % 0.4, fx];
        return ['walk', null, fx];
      case 'maestro':
        if (f.flash > 0 || st === 'recoil') return ['hurt', f.flash > 0 ? 0.2 - f.flash : f.stateT, fx];
        if (st === 'windup') return ['ruler', f.stateT, fx];
        if (st === 'charge') { fx.swoosh = true; fx.lines = true; return ['run', null, fx]; }
        if (st === 'aim') return [f.throwKind === 'borrador' ? 'eraser' : 'book', f.stateT, fx];
        if (st === 'shout') { fx.shout = Math.min(1, f.stateT / (T.shoutWindup || 0.75)); return ['shout', null, fx]; }
        if (st === 'dizzy') {
          const rec = T.recover || 1.1;
          if (f.stateT > rec - 0.34) { fx.stars = false; return ['getup', f.stateT - (rec - 0.34), fx]; }
          fx.stars = false;   // el cuadro de mareo ya trae sus estrellas
          return ['dizzy', null, fx];
        }
        return ['walk', null, fx];
      case 'pulpo_abismo':
        if (st === 'windup') { fx.shake = 1.6; fx.glow = '#ffd36a'; fx.glowK = Math.min(1, f.stateT / (T.windup || 0.8)); return ['windup', 0, fx]; }
        if (st === 'charge') { fx.lines = true; fx.fast = 2.4; return ['swim', null, fx]; }
        if (st === 'aim') {
          fx.glow = f.shotKind === 'chorro' ? '#8ff3ff' : '#9b4dd6'; fx.glowK = Math.min(1, f.stateT / ((T.windup || 0.8) * 1.1));
          fx.scale = 1 + 0.08 * fx.glowK; return ['idle', null, fx];
        }
        return [st === 'dizzy' ? 'idle' : 'swim', null, fx];
      default: return ['idle', null, fx];
    }
  }
  const PRODUCTION_FOE = {
    pulpito:['pulpo_marino',{idle:'idle',swim:'nadar',tentacle:'tentaculo',death:'morir'}],
    buzito:['nino_marino',{idle:'idle',swim:'nadar',throw:'arrojar_piedra',hurt:'recibir_dano',death:'morir'}],
    marciano:['marciano_espacial',{walk:'caminar',shoot:'disparo',hurt:'recibir_dano',death:'morir'}],
    astronino:['nino_espacial',{idle:'idle',walk:'caminar',throw:'arrojar_piedra',hurt:'recibir_dano',death:'morir'}],
    maestro:['maestro_enojon',{idle:'idle',walk:'walk',run:'run',ruler:'ruler_attack',fall:'fall',getup:'getup',ko:'ko'}],
    pulpo_abismo:['pulpo_abismo',{idle:'idle',swim:'swim',windup:'tentacle_strike',ko:'ko',hurt:'hurt',dizzy:'stunned',strike:'tentacle_strike',recover:'recover'}]
  };
  function drawAtlasFoe(f, T) {
    const A = ATLAS_FOES()[f.kind], im = image(A.src);
    const [name, t, fx] = atlasPick(f);
    const an = A.anims[name] || A.anims.idle || A.anims.swim || A.anims.walk;
    const [list, ms, loop] = an;
    const speed = fx.fast || 1;
    const i = t === null || loop ? Math.floor((T * 1000 * speed + f.phase * 400) / ms) % list.length : Math.min(list.length - 1, Math.floor(Math.max(0, t) * 1000 / ms));
    let fr = A.frames[list[i]], bodyIm = im, bodyRef = A.ref;
    const prod = PRODUCTION_FOE[f.kind];
    if (prod) {
      let clip = prod[1][name], time = t === null ? T*speed + (f.phase||0)*0.4 : t, cycle = t===null || !!loop, progress = null;
      if (f.kind==='pulpo_abismo' && !f.dead) {
        if(f.flash>0){clip='hurt';time=Math.max(0,0.2-f.flash);cycle=false;}
        else if(f.state==='charge'){clip='tentacle_strike';time=f.stateT;cycle=false;}
        else if(f.state==='windup'){clip='tentacle_strike';time=0;cycle=false;}
        else if(f.state==='dizzy'){clip='stunned';time=f.stateT;cycle=true;fx.stars=false;}
      }
      if(f.dead){progress=Math.min(1,f.deadT/Math.max(0.15,atlasLife(f)*0.65));if(f.kind==='maestro')progress=Math.min(1,t/(name==='fall'?0.42:1));}
      const q = clip && productionFrame(prod[0],clip,time,cycle,0,progress);
      if(q){const [x,y,w,h,ax,ay]=q.f;fr=[x,y,w,h,-ax,-ay];bodyIm=q.im;bodyRef=q.ref;}
    }
    const s = f.h * (ATLAS_VIS[f.kind] || 1.2) / bodyRef * (fx.scale || 1);
    const flyer = !!NS.Enemies.TYPES[f.kind].flyer;
    const bob = flyer && !f.dead ? Math.sin(T * 2.2 + f.phase) * 1.5 : 0;
    const jit = fx.shake ? Math.sin(T * 55 + f.phase) * fx.shake : 0;
    const bodyH = bodyRef * s, d = f.dir || 1;
    const cy = flyer ? f.y : f.y - bodyH * 0.5;
    if (!flyer && !f.dead) ellipse(f.x, f.y + 1, Math.min(f.w * 0.8, 42), 4, '#06111b', 0.4);
    if (fx.glow) {   // carga de tinta / chorro / tentáculo: un resplandor que crece frente a la boca
      const gx = f.x + d * f.w * 0.42, k = fx.glowK || 0;
      circle(gx, f.y + 2, 6 + k * 16, fx.glow, 0.12 + 0.2 * k);
      ring(gx, f.y + 2, 5 + k * 13, 5 + k * 13, fx.glow, 0.35 + 0.4 * k, 2);
    }
    if (fx.lines) for (let k = 1; k <= 3; k++) line(f.x - d * (f.w * 0.5 + k * 9), cy - 8 + k * 6, f.x - d * (f.w * 0.5 + 16 + k * 12), cy - 8 + k * 6, '#ffffff', 0.42 - k * 0.1, 1.6);
    ctx.save();
    ctx.translate(f.x + jit, f.y + bob + (fx.dy || 0));
    if (d < 0) ctx.scale(-1, 1);
    ctx.drawImage(bodyIm, fr[0], fr[1], fr[2], fr[3], fr[4] * s, fr[5] * s, fr[2] * s, fr[3] * s);
    if (f.flash > 0 && !f.dead) {
      const sil = silhouette(bodyIm, '#ffffff');
      if (sil) { ctx.globalAlpha = Math.min(1, f.flash / 0.2) * 0.75; ctx.drawImage(sil, fr[0], fr[1], fr[2], fr[3], fr[4] * s, fr[5] * s, fr[2] * s, fr[3] * s); ctx.globalAlpha = 1; }
    }
    if (fx.charge) {   // marciano: el orbe crece en su puño
      const k = fx.charge;
      circle(f.w * 0.75, -f.h * 0.6, 3 + k * 6, '#e9a6ff', 0.35 + 0.4 * k); circle(f.w * 0.75, -f.h * 0.6, 1.5 + k * 3, '#ffffff', 0.8);
    }
    if (fx.swoosh) {   // maestro: la regla barre el aire frente a él
      const a0 = -1.2 + ((T * 9) % 1) * 1.6;
      ctx.globalAlpha = 0.75; ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 4; ctx.beginPath();
      ctx.arc(f.w * 0.35, -f.h * 0.62, f.h * 0.55, a0, a0 + 0.9); ctx.stroke();
      ctx.globalAlpha = 0.35; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(f.w * 0.35, -f.h * 0.62, f.h * 0.55, a0 - 0.25, a0 + 0.6); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (fx.shout) {   // maestro: ondas del grito saliendo de la boca
      for (let k = 0; k < 3; k++) {
        const r = 8 + ((T * 2.2 + k / 3) % 1) * 26 * (0.4 + fx.shout);
        ctx.globalAlpha = 0.55 * (1 - ((T * 2.2 + k / 3) % 1)); ctx.strokeStyle = '#fff2a0'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(f.w * 0.3, -f.h * 0.86, r, -0.7, 0.7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (fx.stars && !f.dead) {
      // Los que nadan: girando abiertas alrededor de la cabeza (arriba va su barra) y claras (el pulpo jefe tiene corona amarilla).
      const hy = flyer ? f.y - bodyH * 0.3 : f.y - bodyH * 1.02, rx = bodyH * (flyer ? 0.42 : 0.22), col = flyer ? '#fffbe0' : '#ffe14a';
      for (let k = 0; k < 3; k++) { const a = T * 6 + k * 2.1; circle(f.x + Math.cos(a) * rx, hy + Math.sin(a) * (flyer ? 7 : 4), flyer ? 3 : 2.4, col); }
    }
    if (fx.bang && !f.dead) bang(f.x, (flyer ? f.y - bodyH * 0.62 : f.y - bodyH * 1.08), T);
  }
  /* Proyectiles con el arte del paquete (orbe, tinta, piedras, borrador): `scale` = alto en u por unidad de radio. */
  const ATLAS_SHOT = { orbe: ['marciano', 2.6, 'vel'], tinta: ['pulpito', 2.7, 'wobble'], piedra_mar: ['buzito', 2.3, 'vel'],
    roca: ['astronino', 2.4, 'vel'], borrador: ['maestro', 2.4, 'spin'] };
  function drawAtlasShot(s, T) {
    const def = ATLAS_SHOT[s.kind], A = def && ATLAS_FOES()[def[0]];
    if (!A || !A.anims.shot || !ready(image(A.src))) return false;
    const [list, ms] = A.anims.shot, fr = A.frames[list[Math.floor((T * 1000 + s.x) / ms) % list.length]];
    const k = (s.r * def[1]) / Math.max(4, fr[3]);
    ctx.save(); ctx.translate(s.x, s.y);
    if (def[2] === 'vel') ctx.rotate(Math.atan2(s.vy, s.vx));
    else if (def[2] === 'spin') ctx.rotate((T * 10 + s.x * 0.05) % (Math.PI * 2));
    else ctx.rotate(Math.sin(T * 6 + s.x * 0.03) * 0.15);
    ctx.drawImage(image(A.src), fr[0], fr[1], fr[2], fr[3], fr[4] * k, fr[5] * k, fr[2] * k, fr[3] * k);
    ctx.restore();
    return true;
  }

  /** V58.7 · Atlas de los enemigos secretos y jefes nuevos y fondos de las zonas secretas (precarga y sin conexión). */
  function secretUrls() {
    const B = (NS.ART && NS.ART.SECRET_BG) || {};
    return [...Object.values(ATLAS_FOES()).map((a) => a.src), ...Object.values(B).map((b) => b.src)];
  }

  function drawSchoolBossWarning(G,V,T){
    if(!G.world.schoolFinal||G.room)return;
    const f=G.world.foes.find(q=>q.id===G.world.schoolFinal.bossId&&!q.dead);
    if(!f||f.y<V.y1||f.y>V.y2+50)return;
    const cfg=NS.Enemies.TYPES.maestro, d=f.dir||1;
    if(f.state==='windup'){
      // Ground marker predicts the actual maximum charge travel, limited by patrol edges.
      const end=Math.max(f.minX,Math.min(f.maxX,f.x+d*f.spd*cfg.chargeMul*cfg.charge));
      const x1=Math.min(f.x,end)-f.w/2,x2=Math.max(f.x,end)+f.w/2;
      const opacity=.28+.35*Math.min(1,f.stateT/(cfg.windup*f.reaction));
      fillRect(x1,f.y+2,x2-x1,5,'#f2aa66',opacity);
      for(let x=x1+9;x<x2-5;x+=16)line(x-4,f.y+7,x+3,f.y+2,'#ffe3aa',opacity,1.4);
    }else if(f.state==='shout'){
      const width=Math.min(145,35+110*f.stateT/(cfg.shoutWindup*f.reaction));
      line(f.x-width,f.y+3,f.x+width,f.y+3,'#f3b47e',.55,3);
    }else if(f.state==='dizzy'){
      const remain=Math.max(0,1-f.stateT/cfg.recover);
      fillRR(f.x-25,f.y+9,50,5,2,'#142927',.9);fillRR(f.x-24,f.y+10,48*remain,3,1,'#a9e3c2',.95);
    }
  }
  // Guardián de bloques. Cada extremidad gira en su articulación y la bota de apoyo queda en y=0.
  function drawGuardian(f, T) {
    const tell = f.state === 'windup', charge = f.state === 'charge', dazed = f.state === 'dizzy';
    const step = (f.state === 'patrol' || charge) && !f.dead ? Math.sin(T * (charge ? 13 : 5) + f.phase) : 0;
    const coat = ['#318e92', '#716ab5', '#3776a5'][f.scene % 3] || '#318e92';
    const skin = '#c98e65', light = '#e5ae87', hair = '#342b36';
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.dir, 1);
    if (f.dead) { ctx.rotate(Math.min(1.4, f.deadT * 5)); ctx.globalAlpha *= Math.max(0, 1 - f.deadT / .45); }
    else if (f.flash > 0) ctx.globalAlpha *= .65;
    ellipse(0, 0, 16, 3, '#182c39', .36);
    function leg(x, swing) {
      const lift = Math.max(0, swing) * 3;
      fillRect(x + swing * 3, -17 - lift, 9, 14, '#3b4765');
      fillRR(x + swing * 3 - 1, -5 - lift, 12, 5, 1, '#273248');
      fillRect(x + swing * 3, -2 - lift, 11, 2, '#eddfbb');
    }
    leg(-10, step); leg(2, -step);
    const lean = charge ? 2 : tell ? -2 : 0;
    ctx.translate(lean, dazed ? 2 : 0);
    fillRR(-12, -34, 25, 18, 2, coat);
    fillRect(-12, -34, 5, 18, '#304b64'); fillRect(-3, -34, 13, 3, '#dfc988');
    fillRect(-2, -30, 3, 11, '#a8ded1'); fillRect(5, -27, 5, 3, '#f1d56d');
    fillRect(-13, -32, 6, 13, coat); fillRR(-13, -21, 7, 7, 1, skin);
    ctx.save(); ctx.translate(11, -31);
    ctx.rotate(tell ? -1.95 : charge ? -1.45 : step * .38);
    fillRect(-3, 0, 7, 10, coat); fillRR(-3, 9, 7, 7, 1, light); ctx.restore();
    fillRR(-9, -52, 22, 18, 2, light);
    fillRect(-9, -49, 5, 14, skin); fillRect(-10,-53,22,5,hair);
    fillRect(-10,-50,5,10,hair); fillRect(4,-50,8,3,hair);
    fillRect(4,-45,3,dazed ? 1 : 3,'#322b38'); fillRect(10,-45,2,dazed ? 1 : 3,'#322b38');
    fillRect(6,-38,4,1.5,'#874e4c');
    if (tell) bang(0,-62,T);
    if (dazed) { for (let i = 0; i < 3; i++) circle(Math.cos(T * 7 + i * 2.1) * 13,-59 + Math.sin(T * 7 + i * 2.1) * 3,2,'#ffe68b'); }
    ctx.restore();
  }

  function drawFoes(G, V, T) {
    const t9 = T * 9;
    for (const f of G.world.foes) {
      if (f.x < V.x1 - 50 || f.x > V.x2 + 50 || f.y < V.y1 - 60 || f.y > V.y2 + 50) continue;
      // V58.7: los del atlas nuevo terminan su animación de derrota (el maestro cae y queda noqueado) antes de esfumarse.
      if (f.region !== G.region) continue;
      if (f.kind === 'guardian') { if (!f.dead || f.deadT <= .45) drawGuardian(f, T); continue; }
      const atlas = atlasReady(f.kind), life = atlas ? atlasLife(f) : 0.45;
      if (f.dead && f.deadT > life) continue;
      const a = f.dead ? (atlas ? Math.min(1, (life - f.deadT) / (life * 0.35)) : 1 - f.deadT / 0.45) : 1;
      // V58.1: en el mar y en la Luna el niño lleva traje de buzo o de astronauta (si sus cuadros cargaron).
      const fTheme = f.kind === 'kid' && f.scene >= 0 && G.world.scenes[f.scene] ? G.world.scenes[f.scene].theme : null;
      const suit = fTheme === 'submarino' && f.plat && f.plat.underwater ? 'kid_buzo' : fTheme === 'espacial' ? 'kid_astronauta' : null;
      const sk = f.kind === 'bravo' ? 'dog' : suit && enemyReady(suit) ? suit : f.kind;
      const useSprite = !atlas && !!ESPR[sk] && enemyReady(sk);
      const marine = !atlas && !useSprite && marineReady(f.kind);   // V58.2: piraña, tiburón, pulpo y Poseidón con su atlas
      drawToxiThreat(f, T);
      drawBossFX(f, T);
      ctx.save();
      if (f.isBoss && f.flash > 0 && !f.dead) {
        const punch = Math.sin(Math.min(1, f.flash / 0.2) * Math.PI) * 0.12;
        ctx.translate(f.x, f.y); ctx.scale(1 + punch, 1 - punch); ctx.translate(-f.x, -f.y);
      }
      if (f.dead && !useSprite && !marine && !atlas) { ctx.globalAlpha = a; ctx.translate(f.x, f.y); ctx.scale(1, -1); ctx.translate(-f.x, -f.y + 18); }
      else if (f.dead) ctx.globalAlpha = a;
      const b = Math.sin(t9 + f.x) * 1.5, d = f.dir, fl = f.flash > 0;
      if (atlas) { drawAtlasFoe(f, T); }
      else if (useSprite) { drawEnemySprite(f, T, sk); }
      else if (marine) { drawMarineFoe(f, T); }
      else if (f.kind === 'piranha' || f.kind === 'shark') {
        // V57: siluetas acuáticas con hitbox próxima al cuerpo; giro horizontal,
        // cola y aletas animadas. No genera ni requiere sprites imaginarios.
        const shark = f.kind === 'shark', w = f.w, h = f.h;
        const tail = Math.sin(T * (shark ? 11 : 18) + f.phase) * h * 0.26;
        const body = fl ? '#ffffff' : shark ? '#4d8cab' : '#37cfa0';
        const dorsal = shark ? '#31556f' : '#178d7b';
        ctx.save();
        ctx.translate(f.x, f.y);
        if (d < 0) ctx.scale(-1, 1);
        // Cola que no sobrepasa más de media anchura total del box visible.
        tri(-w * 0.27, 0, -w * 0.49, -h * 0.38 + tail, -w * 0.49, h * 0.38 + tail, dorsal);
        ellipse(0, 0, w * 0.35, h * 0.4, body);
        tri(-w * 0.15, -h * 0.26, 0, -h * 0.56, w * 0.09, -h * 0.22, dorsal);
        tri(-w * 0.08, h * 0.24, -w * 0.2, h * 0.52, w * 0.1, h * 0.29, dorsal);
        // Hocico, ojo grande, boca reconocible y dientes del tiburón.
        ellipse(w * 0.23, -h * 0.03, w * 0.21, h * 0.22, body);
        line(w * 0.18, h * 0.17, w * 0.45, h * 0.18, '#072e39', 1, shark ? 3 : 1.6);
        if (shark) {
          for (let tooth = 0; tooth < 3; tooth++) {
            const tx = w * (0.23 + tooth * 0.085);
            tri(tx, h * 0.16, tx + w * 0.035, h * 0.3, tx + w * 0.065, h * 0.16, '#e9faff');
          }
        }
        circle(w * 0.22, -h * 0.12, Math.max(2.4, h * 0.09), '#061927');
        circle(w * 0.24, -h * 0.14, Math.max(1, h * 0.03), '#ffffff');
        if (f.state === 'windup') circle(w * 0.21, -h * 0.11, h * 0.16, '#ff6f83', 0.2);
        ctx.restore();
        if (f.state === 'windup') bang(f.x, f.y - h * 0.85, T);
      }
      else if (f.kind === 'drone') {
        // Antena, rotores y núcleo pulsante. Apuntado representado con
        // línea discontinua de advertencia (el disparo llegará después).
        const w = f.w, h = f.h, pulse = 0.55 + 0.45 * Math.sin(T * 9 + f.phase);
        if (f.state === 'aim') {
          const tx = Number.isFinite(f.targetX) ? f.targetX : f.x + d * 50;
          const ty = Number.isFinite(f.targetY) ? f.targetY : f.y;
          ctx.save();
          ctx.setLineDash([7, 7]);
          line(f.x, f.y, tx, ty, '#da9aff', 0.35 + pulse * 0.25, 1.8);
          ctx.setLineDash([]);
          ring(tx, ty, 12 + pulse * 3, 12 + pulse * 3, '#ff9be0', 0.45, 1.8);
          ctx.restore();
        }
        line(f.x - w * 0.35, f.y - h * 0.07, f.x - w * 0.66, f.y - h * 0.28, '#99d3e6', 0.9, 3);
        line(f.x + w * 0.35, f.y - h * 0.07, f.x + w * 0.66, f.y - h * 0.28, '#99d3e6', 0.9, 3);
        ellipse(f.x - w * 0.68, f.y - h * 0.33, w * 0.26, 2, '#d0acff', 0.7);
        ellipse(f.x + w * 0.68, f.y - h * 0.33, w * 0.26, 2, '#d0acff', 0.7);
        fillRR(f.x - w * 0.38, f.y - h * 0.4, w * 0.76, h * 0.79, 5,
          fl ? '#ffffff' : '#59658c', 1);
        fillRR(f.x - w * 0.25, f.y - h * 0.24, w * 0.5, h * 0.43, 4, '#18243d');
        circle(f.x, f.y - h * 0.04, h * 0.16 + pulse, f.state === 'aim' ? '#ff85d9' : '#8bf4f8');
        circle(f.x - 1, f.y - h * 0.09, 1.8, '#ffffff');
        line(f.x, f.y - h * 0.4, f.x, f.y - h * 0.64, '#9acbd1', 0.9, 2);
        circle(f.x, f.y - h * 0.7, 2.5, '#ffc4f0');
      }
      else if (f.kind === 'crab') {
        const walkA = Math.sin(T * 14 + f.x * 0.1), alert = f.state === 'alert', body = fl ? '#ffffff' : alert ? '#ff5a3c' : '#e0472f';
        ellipse(f.x, f.y + 1, 18, 4, '#06111b', 0.45);
        for (let i = -1; i <= 1; i++) for (const sd of [-1, 1]) line(f.x + sd * 9, f.y - 7 + i * 2, f.x + sd * (17 + walkA * 2 * sd), f.y, '#a8321f', 1, 2);
        ellipse(f.x, f.y - 9, 15, 8, body); ellipse(f.x - 3, f.y - 12, 8, 3, '#ff8a6a', 0.6);
        for (const sd of [-1, 1]) {
          line(f.x + sd * 4, f.y - 15, f.x + sd * 5, f.y - 22, '#a8321f', 1, 2); circle(f.x + sd * 5, f.y - 23, 2.6, '#fffdf3'); circle(f.x + sd * 5, f.y - 23, 1.2, '#1a1a1a');
          const cx = f.x + sd * 19, cy = f.y - 13 + (alert ? Math.sin(T * 20) * 2 : 0);
          line(f.x + sd * 12, f.y - 9, cx, cy, '#a8321f', 1, 3); circle(cx, cy, 5, body); tri(cx + sd * 2, cy - 4, cx + sd * 8, cy - 1, cx + sd * 2, cy, '#ffd0c4');
        }
        if (f.state === 'dizzy') for (let i = 0; i < 3; i++) { const an = T * 6 + i * 2.1; circle(f.x + Math.cos(an) * 12, f.y - 30 + Math.sin(an) * 3, 2.2, '#ffe14a'); }
      } else if (f.kind === 'robot') {
        const s = f.isBoss ? 1.25 : 1, wind = f.state === 'windup', chg = f.state === 'charge', dizzy = f.state === 'dizzy';
        ellipse(f.x, f.y + 1, 20 * s, 4, '#06111b', 0.45);
        fillRR(f.x - 17 * s, f.y - 9 * s, 34 * s, 9 * s, 4, '#2c3138');
        for (let i = 0; i < 4; i++) circle(f.x - 12 * s + i * 8 * s, f.y - 4.5 * s, 3 * s, '#5d6873');
        fillRR(f.x - 14 * s, f.y - 34 * s + b, 28 * s, 26 * s, 6, fl ? '#ffffff' : '#9aa6b8');
        fillRect(f.x - 14 * s, f.y - 22 * s + b, 28 * s, 3 * s, '#5d6873');
        fillRR(f.x - 10 * s + d * 2, f.y - 31 * s + b, 20 * s, 8 * s, 3, '#10202c');
        fillRect(f.x - 8 * s + d * 3, f.y - 29 * s + b, 16 * s, 4 * s, wind || chg ? '#ff4a5a' : dizzy ? '#ffe14a' : '#7fe9ff', 0.95);
        line(f.x, f.y - 34 * s + b, f.x, f.y - 42 * s + b, '#c9d2d8', 1, 2); circle(f.x, f.y - 43 * s + b, 2.6, wind ? '#ff4a5a' : '#d9ff65');
        line(f.x - d * 14 * s, f.y - 22 * s + b, f.x - d * 22 * s, f.y - (chg ? 20 : 14) * s + b, '#7a8796', 1, 4);
        line(f.x + d * 14 * s, f.y - 22 * s + b, f.x + d * (chg ? 26 : 21) * s, f.y - (chg ? 24 : 14) * s + b, '#7a8796', 1, 4);
        if (wind) bang(f.x, f.y - 52 * s, T);
        if (chg) for (let i = 1; i <= 3; i++) line(f.x - d * (18 * s + i * 7), f.y - 12 - i * 3, f.x - d * (28 * s + i * 7), f.y - 12 - i * 3, '#9ee7ff', 0.45, 1.5);
        if (dizzy) for (let i = 0; i < 3; i++) { const an = T * 6 + i * 2.1; circle(f.x + Math.cos(an) * 13, f.y - 50 * s + Math.sin(an) * 4, 2.2, '#ffe14a'); }
      } else if (f.kind === 'kid') {
        const s = f.isBoss ? 1.12 : 1, wind = f.state === 'windup', charge = f.state === 'charge', dizzy = f.state === 'dizzy';
        const torsoY = f.y - 30 * s + b;
        ellipse(f.x, f.y + 1, 18 * s, 4, '#06111b', 0.42);
        line(f.x - 7 * s, f.y - 12 * s, f.x - 9 * s, f.y - 1, '#28395a', 1, 5 * s);
        line(f.x + 7 * s, f.y - 12 * s, f.x + 9 * s, f.y - 1, '#28395a', 1, 5 * s);
        fillRR(f.x - 13 * s, torsoY, 26 * s, 23 * s, 7 * s, fl ? '#ffffff' : '#d94a43');
        line(f.x - d * 11 * s, torsoY + 5 * s, f.x - d * (wind ? 24 : 18) * s, torsoY + (wind ? -8 : 13) * s, '#d9a47e', 1, 5 * s);
        line(f.x + d * 11 * s, torsoY + 5 * s, f.x + d * (charge ? 24 : 17) * s, torsoY + (charge ? 1 : 14) * s, '#d9a47e', 1, 5 * s);
        circle(f.x, f.y - 47 * s + b, 12 * s, '#d9a47e');
        ellipse(f.x, f.y - 54 * s + b, 12 * s, 7 * s, '#30252b');
        fillRect(f.x - 10 * s, f.y - 51 * s + b, 20 * s, 4 * s, '#30252b');
        circle(f.x - d * 4 * s, f.y - 46 * s + b, 1.6 * s, '#fffdf3');
        circle(f.x + d * 4 * s, f.y - 46 * s + b, 1.6 * s, '#fffdf3');
        line(f.x - d * 7 * s, f.y - 50 * s + b, f.x - d * 2 * s, f.y - 48 * s + b, '#5a2426', 1, 2 * s);
        line(f.x + d * 2 * s, f.y - 48 * s + b, f.x + d * 7 * s, f.y - 50 * s + b, '#5a2426', 1, 2 * s);
        line(f.x - 3 * s, f.y - 40 * s + b, f.x + 3 * s, f.y - 40 * s + b, '#6d3531', 1, 1.5 * s);
        if (wind) bang(f.x, f.y - 62 * s, T);
        if (dizzy) for (let i = 0; i < 3; i++) { const an = T * 6 + i * 2.1; circle(f.x + Math.cos(an) * 14 * s, f.y - 60 * s + Math.sin(an) * 4, 2, '#ffe14a'); }
      } else if (f.kind === 'bat') {
        const sleeping = f.state === 'sleep';
        const wing = sleeping ? 0 : Math.sin(t9 * 1.6) * 9;
        ellipse(f.x, f.y, 9, 7, fl ? '#ffffff' : '#2b2140');
        if (sleeping) { tri(f.x - 9, f.y - 4, f.x + 9, f.y - 4, f.x, f.y + 9, '#3d2f5c'); }
        else {
          tri(f.x - 4, f.y, f.x - 22, f.y - 8 + wing, f.x - 16, f.y + 5, '#3d2f5c');
          tri(f.x + 4, f.y, f.x + 22, f.y - 8 + wing, f.x + 16, f.y + 5, '#3d2f5c');
        }
        if (!sleeping) { circle(f.x - 3, f.y - 2, 1.6, '#ff4a4a'); circle(f.x + 3, f.y - 2, 1.6, '#ff4a4a'); }
        if (f.state === 'alert') bang(f.x, f.y - 14, T);
      } else if (f.kind === 'pigeon') {
        const wing = Math.sin(t9 * 1.4) * 6;
        ellipse(f.x, f.y, 13, 8, '#8a95a5');
        circle(f.x + d * 11, f.y - 5, 6, '#9aa6b6');
        tri(f.x + d * 16, f.y - 6, f.x + d * 22, f.y - 4, f.x + d * 16, f.y - 2, '#e0a050');
        circle(f.x + d * 13, f.y - 7, 1.4, '#1a1a1a');
        tri(f.x - 6, f.y - 2, f.x + 6, f.y - 2, f.x - d * 4, f.y - 16 + wing, '#6e7888');
        fillRect(f.x - 2, f.y - 1, 9, 2, '#6fbf8f', 0.7);
        if (f.state === 'telegraph') bang(f.x, f.y - 16, T);
      } else if (f.kind === 'chile') {
        const aim = f.state === 'aim', k = aim ? 1.12 : 1;
        ellipse(f.x, f.y + 1, 13, 3.5, '#06111b', 0.45);
        ellipse(f.x, f.y - 14, 10 * k, 15 * k, aim ? '#ff9a6a' : '#d63c2a');
        fillRect(f.x - 3, f.y - 32, 6, 6, '#2f8f3a'); fillRect(f.x - 1, f.y - 36, 3, 5, '#2f8f3a');
        circle(f.x + d * 4, f.y - 17, 5 * (aim ? 1.3 : 1), '#2a0d0a');
        circle(f.x - d * 3, f.y - 19, 2, '#ffffff');
        if (aim) bang(f.x, f.y - 40, T);
      } else {
        const dog = f.kind === 'dog', bravo = f.kind === 'bravo';
        const wind = f.state === 'windup', chg = f.state === 'charge', dizzy = f.state === 'dizzy';
        const sx = bravo ? 1.6 : dog ? 1.25 : 1;
        const col = bravo ? '#3a2a24' : dog ? '#5a3d2e' : '#7a5a4a';
        ellipse(f.x, f.y + 1, 17 * sx, 4, '#06111b', 0.45);
        ellipse(f.x, f.y - 11 * sx + b, 16 * sx, 10 * sx, fl ? '#ffffff' : wind ? '#ff5a4a' : col);
        circle(f.x + d * 13 * sx, f.y - 13 * sx + b, (dog || bravo ? 8 : 7) * (bravo ? 1.25 : 1), bravo ? '#4a362e' : dog ? '#7a5640' : '#93705c');
        circle(f.x + d * 11 * sx, f.y - 21 * sx + b, 4, '#e0a090');
        circle(f.x + d * 16 * sx, f.y - 15 * sx + b, 2.2, chg || wind ? '#ffe14a' : '#ff4a4a');
        line(f.x - d * 15 * sx, f.y - 9 * sx, f.x - d * 27 * sx, f.y - 14 * sx + Math.sin(T * 12) * 4, '#c99a86', 1, 2);
        if (bravo) { for (let i = -2; i <= 2; i++) tri(f.x + d * 6 * sx + i * 4, f.y - 20 * sx, f.x + d * 6 * sx + i * 4 + 2, f.y - 26 * sx, f.x + d * 6 * sx + i * 4 + 4, f.y - 20 * sx, '#c8d0d4'); }
        if (wind) bang(f.x, f.y - 30 * sx - 6, T);
        if (dizzy) for (let i = 0; i < 3; i++) { const an = T * 6 + i * 2.1; circle(f.x + Math.cos(an) * 12, f.y - 26 * sx + Math.sin(an) * 4, 2.2, '#ffe14a'); }
        if (chg) for (let i = 1; i <= 3; i++) line(f.x - d * (14 * sx + i * 7), f.y - 8 - i * 3, f.x - d * (24 * sx + i * 7), f.y - 8 - i * 3, '#ffffff', 0.4, 1.5);
        if (bravo && f.hp < f.maxHp) fillRect(f.x - 10, f.y - 34 * sx, 20 * (f.hp / f.maxHp), 3, '#ff6b69');
      }
      if (f.state === 'dizzy' && !useSprite && !f.dead && (f.kind === 'bat' || f.kind === 'pigeon' || f.kind === 'chile')) {
        for (let i = 0; i < 3; i++) { const an = T * 6 + i * 2.1; circle(f.x + Math.cos(an) * 12, f.y - f.h - 6 + Math.sin(an) * 3, 2.2, '#ffe14a'); }
      }
      if (f.state === 'distracted') {
        for (let i = 0; i < 3; i++) { const a = T * 5 + i * 2.1; circle(f.x + Math.cos(a) * 10, f.y - f.h - 9 + Math.sin(a) * 3, 2.2, '#ffe27a'); }
        text('¿?', f.x, f.y - f.h - 20, 7, '#fff3a8');
      }
      if (f.isBoss) {
        // V58.7: con el atlas nuevo el cuerpo se ve más alto que su caja: la barra va sobre la cabeza que se ve.
        const vis = atlas ? f.h * (ATLAS_VIS[f.kind] || 1.2) : f.h, flyer = !!NS.Enemies.TYPES[f.kind].flyer;
        ctx.font = '900 7px system-ui,-apple-system,Segoe UI,sans-serif';
        const nameW = ctx.measureText(f.bossName).width + 12;   // V58.7: el nombre completo cabe en su caja
        const bw = Math.max(58, Math.min(104, f.w + 18), nameW), by = (atlas ? (flyer ? f.y - vis * 0.5 : f.y - vis) : f.y - f.h) - 7;
        fillRR(f.x - bw / 2, by - 17, bw, 14, 5, '#132330', 0.88);
        text(f.bossName, f.x, by - 10, 7, '#fff0bd');
        fillRR(f.x - bw / 2, by, bw, 5, 2, '#251c24', 0.95);
        fillRR(f.x - bw / 2, by, bw * Math.max(0, f.hp / f.maxHp), 5, 2, '#ff6868', 1);
      }
      ctx.restore();
    }
    for (const s of G.world.shots) {
      if (s.x < V.x1 || s.x > V.x2 || s.y < V.y1 || s.y > V.y2) continue;
      if (s.kind === 'poop') { circle(s.x, s.y, 7, '#ffffff', 0.25); circle(s.x, s.y, 4.5, '#f2f2ea'); }
      // V58.7: orbe del marciano, tinta del pulpito y del Pulpo del Abismo, piedras de los niños y borrador del maestro.
      else if (ATLAS_SHOT[s.kind] && drawAtlasShot(s, T)) { /* dibujado con el arte del paquete */ }
      else if (s.kind === 'libro') {
        // Libro de texto rojo girando (el paquete no lo trae suelto: lo tiene en la mano).
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate((T * 8 + s.x * 0.04) % (Math.PI * 2));
        fillRR(-11, -8, 22, 16, 2, '#b3262e'); fillRect(-9, -6, 18, 3, '#f6ecd2'); fillRect(-11, -8, 4, 16, '#7a1418');
        ctx.restore();
      }
      else if (s.kind === 'grito') {
        // Onda del grito del maestro corriendo por el piso: arcos amarillos (se saltan).
        const dd = Math.sign(s.vx) || 1;
        for (let k = 0; k < 3; k++) {
          ctx.globalAlpha = 0.8 - k * 0.22; ctx.strokeStyle = k ? '#ffe27a' : '#fff6c8'; ctx.lineWidth = 3 - k * 0.6;
          const a0 = dd > 0 ? 0 : Math.PI;   // «)» hacia la derecha, «(» hacia la izquierda
          ctx.beginPath(); ctx.arc(s.x - dd * k * 7, s.y + 4, s.r + k * 2, a0 - 1.1, a0 + 1.1); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      else if (s.kind === 'chorro') {
        // Chorro de agua del Pulpo del Abismo: núcleo blanco y estela de burbujas.
        const dd = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / dd, uy = s.vy / dd;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(uy, ux));
        ellipse(-14, 0, 26, s.r * 0.9, '#58d6ff', 0.45); ellipse(-6, 0, 16, s.r * 0.6, '#bff6ff', 0.8); ellipse(0, 0, 7, s.r * 0.45, '#ffffff', 0.95);
        ctx.restore();
        for (let k = 1; k <= 4; k++) circle(s.x - ux * (16 + k * 9) + Math.sin(T * 9 + k) * 3, s.y - uy * (16 + k * 9), 2.6 - k * 0.4, '#dff9ff', 0.7 - k * 0.12);
      }
      else if (s.kind === 'tinta' || s.kind === 'orbe' || s.kind === 'piedra_mar' || s.kind === 'roca' || s.kind === 'borrador') {
        // Respaldo si el atlas aún no carga.
        const col = { tinta: '#2a0f35', orbe: '#d59bff', piedra_mar: '#5d6d78', roca: '#9a7a52', borrador: '#3f7fd6' }[s.kind];
        circle(s.x, s.y, s.r, col); circle(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.35, '#ffffff', 0.35);
      }
      else if (s.kind === 'ink') {
        // V58.2: tinta del pulpo (mancha morada con gotas que se quedan atrás).
        for (let k = 1; k <= 3; k++) circle(s.x - s.vx * 0.02 * k, s.y - s.vy * 0.02 * k, s.r * (0.7 - k * 0.15), '#3b1747', 0.5 - k * 0.12);
        circle(s.x, s.y, s.r, '#2a0f35'); circle(s.x - s.r * 0.3, s.y - s.r * 0.35, s.r * 0.32, '#8d4fa8', 0.7);
      }
      else if (s.kind === 'tide') {
        // V58.2: ola de Poseidón (remolino del paquete, girando; si no cargó, anillos de agua).
        const fxIm = image(MARINE_DIR + 'poseidon_fx.webp'), fx = MARINE_ART.poseidon.fx;
        if (fx && ready(fxIm)) {
          const r = fx[2] || fx[0], d = s.r * 3.2;
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate((G.world.t * 6) % (Math.PI * 2));
          ctx.drawImage(fxIm, r[0], r[1], r[2], r[3], -d / 2, -d / 2 * r[3] / r[2], d, d * r[3] / r[2]); ctx.restore();
        } else { ring(s.x, s.y, s.r, s.r, '#9ff3ff', 0.85, 3); ring(s.x, s.y, s.r * 0.6, s.r * 0.6, '#e9fbff', 0.7, 2); }
      }
      else if (s.kind === 'plasma') {
        const dd = Math.hypot(s.vx, s.vy) || 1;
        line(s.x - s.vx / dd * 14, s.y - s.vy / dd * 14,
          s.x, s.y, '#be8cff', 0.7, 3);
        circle(s.x, s.y, s.r + 5, '#9e79ff', 0.16);
        circle(s.x, s.y, s.r, '#d59bff', 0.92);
        circle(s.x, s.y, 2.4, '#ffffff');
      }
      else if (s.kind === 'stone' && ready(image(KID_ROCK))) {
        // V58.1: la piedra del atlas del niño (gira mientras vuela).
        const rk = image(KID_ROCK), d = s.r * 2.6;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate((G.world.t * 9 + s.x * 0.05) % (Math.PI * 2));
        ctx.drawImage(rk, -d / 2, -d * rk.naturalHeight / rk.naturalWidth / 2, d, d * rk.naturalHeight / rk.naturalWidth); ctx.restore();
      }
      else if (s.kind === 'stone') {
        circle(s.x, s.y + 1, s.r + 2, '#0a0806', 0.3);          // sombra/contorno
        circle(s.x, s.y, s.r, '#6f655a');                        // piedra
        circle(s.x - s.r * 0.32, s.y - s.r * 0.32, s.r * 0.42, '#9b9084'); // brillo
        circle(s.x + s.r * 0.3, s.y + s.r * 0.25, s.r * 0.2, '#4b433b');    // grano oscuro
      }
      else { circle(s.x, s.y, 11, '#ff7a3a', 0.35); circle(s.x, s.y, 5.5, '#ffd35a'); }
    }
  }

  /* ---------- Sofía, sus gatitas, sombra y anillo de aterrizaje ---------- */
  function landingBelow(G) {
    const P = G.P, foot = P.y + P.h / 2, W = G.world;
    let best = null, top = Infinity;
    const hw = P.w * 0.3;
    for (const pl of W.platforms) {
      if (pl.y < foot - 2 || pl.y >= top || P.x + hw <= pl.x1 || P.x - hw >= pl.x2) continue;
      if (P.dropT > 0 && pl.drop && pl.y < foot + 40) continue;
      best = pl; top = pl.y;
    }
    for (const s of W.solids) {
      if (s.broken || s.open || s.kind === 'wall' || s.y1 < foot - 2 || s.y1 >= top || P.x + hw <= s.x1 || P.x - hw >= s.x2) continue;
      best = s; top = s.y1;
    }
    return best ? top : null;
  }

  // Fila de contacto opaca medida en cada cuadro de tierra. El PNG original conserva su encuadre.
  const ROBLOX_SOLES = {"luna": {"idle_00": 235, "idle_01": 235, "idle_02": 235, "idle_03": 225, "idle_04": 221, "idle_05": 222, "walk_00": 234, "walk_01": 230, "walk_02": 240, "walk_03": 230, "run_00": 237, "run_01": 239, "run_02": 228, "run_03": 229, "crouch_00": 224, "crouch_01": 222, "jump_00": 199, "jump_01": 228, "jump_02": 213, "fall_00": 232, "fall_01": 224, "fall_02": 212, "land_00": 227, "land_01": 225, "climb_00": 224, "climb_01": 216, "climb_02": 228, "glide_00": 214, "glide_01": 220, "glide_02": 232, "hurt_00": 229, "hurt_01": 205, "hurt_02": 232, "ko_00": 206, "ko_01": 212, "ko_02": 214, "getup_00": 245, "getup_01": 226, "getup_02": 230, "celebrate_00": 233, "celebrate_01": 230, "celebrate_02": 234, "interact_00": 222, "interact_01": 233}, "morita": {"idle_00": 239, "idle_01": 240, "idle_02": 239, "idle_03": 231, "idle_04": 233, "idle_05": 228, "walk_00": 245, "walk_01": 222, "walk_02": 245, "walk_03": 228, "run_00": 235, "run_01": 245, "run_02": 234, "run_03": 237, "crouch_00": 235, "crouch_01": 234, "jump_00": 209, "jump_01": 233, "jump_02": 217, "fall_00": 234, "fall_01": 233, "fall_02": 233, "land_00": 236, "land_01": 231, "climb_00": 220, "climb_01": 218, "climb_02": 228, "glide_00": 226, "glide_01": 227, "glide_02": 215, "hurt_00": 234, "hurt_01": 233, "hurt_02": 233, "ko_00": 226, "ko_01": 245, "ko_02": 244, "getup_00": 224, "getup_01": 236, "getup_02": 237, "celebrate_00": 238, "celebrate_01": 236, "celebrate_02": 239, "interact_00": 233, "interact_01": 244}};
  const CAT_SOLES = {"luna_idle_v38_01.png": 211, "luna_idle_v38_02.png": 211, "luna_idle_v38_03.png": 211, "luna_idle_v38_04.png": 196, "luna_idle_v38_05.png": 195, "luna_idle_v38_06.png": 196, "luna_walk_v38_01.png": 214, "luna_walk_v38_02.png": 214, "luna_walk_v38_03.png": 203, "luna_walk_v38_04.png": 204, "morita_idle_v38_01.png": 216, "morita_idle_v38_02.png": 216, "morita_idle_v38_03.png": 216, "morita_idle_v38_04.png": 205, "morita_idle_v38_05.png": 204, "morita_idle_v38_06.png": 204, "morita_walk_v38_01.png": 213, "morita_walk_v38_02.png": 214, "morita_walk_v38_03.png": 212, "morita_walk_v38_04.png": 214};
  function drawParafallsRobloxCat(c, x, foot, T, bob, flip, shoulder, action, phase, moving, behavior, schoolMode, grounded) {
    const id = c.name.toLowerCase(), atlas = root.PARAFALLS_ROBLOX_COMPANIONS && root.PARAFALLS_ROBLOX_COMPANIONS[id];
    if (!atlas) return false;
    const clip = atlas.animation[moving ? 'walk' : 'idle'];
    const frames = clip && clip.frames;
    if (!frames || !frames.length) return false;
    const im = image(PARAFALLS_ROBLOX_CAT_DIR + id + '/atlas.png');
    if (!ready(im)) return false;
    const time = Math.max(0, T + (phase || 0) * 0.18), ix = clip.loop ? Math.floor(time * clip.fps) % frames.length : Math.min(frames.length - 1, Math.floor(time * clip.fps));
    const f = atlas.frames[frames[ix]], r = f && f.frame, s = f && f.spriteSourceSize, p = f && f.pivot;
    if (!f || !r || !s || !p || r.x + r.w > im.naturalWidth || r.y + r.h > im.naturalHeight) return false;
    const breath = shoulder ? Math.sin(T * 4.2 + phase) * 0.025 : Math.sin(T * (moving ? 5 : 2.2) + phase) * 0.01;
    const scale = c.scale * (schoolMode ? 1.45 : 1) * (shoulder ? 0.72 : 1) * (1 + breath);
    const idleBob = grounded ? 0 : moving ? Math.sin(T * 12 + phase) * 1.45 : Math.sin(T * 2.5 + phase) * 0.55;
    const hop = shoulder && (action === 'excited' || action === 'assist') ? -Math.abs(Math.sin(T * 11 + phase)) * (action === 'assist' ? 8 : 4) :
      !shoulder && behavior === 'assist' ? -Math.abs(Math.sin(T * 11 + phase)) * 2.5 : 0;
    ctx.save(); ctx.translate(x, foot + bob + idleBob + (shoulder ? -48 : 0) + hop); ctx.scale((flip ? -1 : 1) * scale, scale); ctx.globalAlpha = 0.98;
    ctx.drawImage(im, r.x, r.y, r.w, r.h, s.x - p.x * f.sourceSize.w, grounded ? -ROBLOX_SOLES[id][frames[ix]] : s.y - p.y * f.sourceSize.h, r.w, r.h);
    ctx.restore();
    if (!shoulder && (action === 'alert' || behavior === 'assist' || behavior === 'pounce')) text(c.name, x, foot - 24 + bob, 7, c.name === 'LUNA' ? '#ffffff' : '#e6e9f0', 'center', 900);
    return true;
  }

  function drawCompanion(c, x, foot, T, bob, flip, shoulder = false, action = 'idle', phase = 0, moving = false, behavior = 'follow', schoolMode=false, robloxMode=false, grounded=false) {
    const catId = c.name.toLowerCase() + (c===COMPANIONS_SUB.luna||c===COMPANIONS_SUB.morita?'_sub':c===COMPANIONS_SPACE.luna||c===COMPANIONS_SPACE.morita?'_space':'');
    if (robloxMode && !catId.includes('_') && drawParafallsRobloxCat(c, x, foot, T, bob, flip, shoulder, action, phase, moving, behavior, schoolMode, grounded)) return;
    if (catId.includes('_')) {
      const sub=catId.endsWith('_sub');
      const clip=shoulder?(sub?'shoulder':'idle'):behavior==='pounce'&&!sub?'jump':moving?'walk':sub&&(behavior==='sniff'||behavior==='groom')?'sniff':sub&&(behavior==='alert'||behavior==='look'||action==='alert')?'alert':'idle';
      const q=productionFrame(catId,clip,T+(phase||0)*0.04,true);
      if(q){
        const hop=behavior==='pounce'?-Math.abs(Math.sin(T*11+phase))*2.5:0;
        const scale = 22 / Math.max(1,q.ref) * (shoulder?0.72:1);
        drawProductionFrame(q,x,foot+bob+(shoulder?-48:0)+hop,scale,flip?-1:1,0.98);
        if(!shoulder && (action==='alert'||behavior==='assist'||behavior==='pounce')) text(c.name,x,foot-29+bob,7,c.tint,'center',900);
        return;
      }
    }
    const frames = moving ? c.walk : c.idle;
    // V50: reposo = poses de pie (01–03); olfatear = cabeza abajo (05); mirar/alerta = cabeza alzada (04, 06).
    // Antes el reposo normal ciclaba también la pose de olfatear y "asearse" mostraba esa misma pose.
    let frameStart = 0, frameCount = moving ? frames.length : 3, fps = moving ? 9.5 : 3.6;
    if (!moving && (behavior === 'sniff' || behavior === 'groom')) { frameStart = 4; frameCount = 1; fps = 1; }
    else if (!moving && (behavior === 'alert' || behavior === 'look')) { frameStart = 3; frameCount = 1; fps = 1; }
    const framePos = (T * fps + phase * 0.42) % frameCount;
    const frameBase = Math.floor(framePos), frameIx = frameStart + frameBase;
    const nextIx = frameStart + (frameBase + 1) % frameCount;
    const frameMix = shoulder || grounded ? 0 : Math.max(0, Math.min(1, (framePos - frameBase - 0.68) / 0.32));
    const im = image(shoulder ? c.shoulder : frames[frameIx]);
    const imNext = image(shoulder ? c.shoulder : frames[nextIx]);
    const breath = shoulder ? Math.sin(T * 4.2 + phase) * 0.025 : Math.sin(T * (moving ? 5 : 2.2) + phase) * 0.01;
    const pulse = 1 + breath;
    const hop = shoulder && (action === 'excited' || action === 'assist') ? -Math.abs(Math.sin(T * 11 + phase)) * (action === 'assist' ? 8 : 4) :
      !shoulder && behavior === 'assist' ? -Math.abs(Math.sin(T * 11 + phase)) * 2.5 : 0;
    const sway = shoulder ? Math.sin(T * 2.7 + phase) * (action === 'alert' || action === 'assist' ? 0.08 : 0.035) :
      Math.sin(T * (moving ? 8 : 1.8) + phase) * (moving ? 0.025 : 0.01);
    const idleBob = grounded ? 0 : moving ? Math.sin(T * 12 + phase) * 1.45 : Math.sin(T * 2.5 + phase) * 0.55;
    ctx.save();
    ctx.translate(x, foot + bob + idleBob + (shoulder ? -48 : 0) + hop);
    ctx.rotate(sway);
    ctx.globalAlpha = 0.98;
    if (ready(im) || ready(imNext)) {
      const base = ready(im) ? im : imNext;
      const scale = (schoolMode?1.45:1)*(shoulder ? c.scale * 0.72 * pulse : c.scale * pulse);
      ctx.scale((flip ? -1 : 1) * scale, scale * (action === 'cuddle' ? 1.04 : 1));
      if (ready(im)) {
        ctx.globalAlpha = 0.98 * (1 - frameMix);
        const sole = grounded && CAT_SOLES[frames[frameIx].split('/').pop()];
        ctx.drawImage(im, -im.naturalWidth / 2, -(sole || im.naturalHeight * .92));
      }
      if (frameMix > 0 && ready(imNext)) {
        ctx.globalAlpha = 0.98 * frameMix;
        ctx.drawImage(imNext, -base.naturalWidth / 2, -base.naturalHeight * 0.92);
      }
    } else {
      ellipse(0, -17, 15, 12, c.tint);
      tri(-12, -24, -5, -40, 0, -25, c.tint); tri(12, -24, 5, -40, 0, -25, c.tint);
      circle(-5, -18, 2, '#26313b'); circle(5, -18, 2, '#26313b');
      ellipse(0, -6, 11, 8, c.tint); line(10, -8, 20, -18, c.tint, 1, 4);
    }
    if (shoulder) {
      const blink = Math.sin(T * 1.7 + phase) > 0.96;
      line(-7, -30, -2, blink ? -30 : -32, c.tint, 0.65, 1.2);
      line(7, -30, 2, blink ? -30 : -32, c.tint, 0.65, 1.2);
      line(-13, -7, -21 - Math.sin(T * 5 + phase) * 3, -10, c.tint, 0.7, 1.5);
      if (action === 'alert') { tri(-15, -42, -9, -51, -4, -42, '#ffe27a', 0.9); tri(15, -42, 9, -51, 4, -42, '#ffe27a', 0.9); }
      if (action === 'excited') { circle(-18, -52, 2.2, '#ffe27a'); circle(18, -56, 1.8, '#d9ff65'); }
      if (action === 'cuddle' || (action === 'idle' && Math.sin(T * 2 + phase) > 0.2)) {
        line(21, -25, 26, -29, '#b9f7e6', 0.65, 1.2); line(25, -25, 30, -29, '#b9f7e6', 0.45, 1.2);
      }
    }
    ctx.restore();
    // Nombre justo encima de la gatita (antes flotaba 58 u arriba, a la altura de la cabeza de Sofía).
    if (!shoulder && (action === 'alert' || behavior === 'assist' || behavior === 'pounce')) text(c.name, x, foot - 24 + bob, 7, c.name === 'LUNA' ? '#ffffff' : '#e6e9f0', 'center', 900);
  }

  function drawCompanions(G, T) {
    const P = G.P, foot = P.y + P.h / 2, state = G.companions || {}, agents = state.agents || {};
    const stride = Math.sin(T * 8) * Math.min(3, Math.abs(P.vx) * 0.012);
    const playerMoving = Math.abs(P.vx) > 35 || !P.ground;
    const luna = agents.luna, morita = agents.morita;
    const lunaShoulder = P.dead ? false : luna ? luna.mode === 'shoulder' : Math.floor(T / 6.5) % 2 === 1;
    const moritaShoulder = P.dead ? false : morita ? morita.mode === 'shoulder' : Math.floor((T + 3.25) / 7.25) % 2 === 1;
    const warning = state.warningT > 0, warningCat = state.warningCat;
    const lunaWarn = warning && warningCat === 'luna', moritaWarn = warning && warningCat === 'morita';
    const action = G.state === 'victory' || G.state === 'won' ? 'cuddle' : (state.action || 'idle');
    const lunaX = lunaShoulder ? P.x - 12 : luna?.x ?? P.x - (playerMoving ? 56 : 46);
    const moritaX = moritaShoulder ? P.x + 12 : morita?.x ?? P.x + (playerMoving ? 56 : 46);
    const lunaY = luna?.y ?? foot, moritaY = morita?.y ?? foot;
    const lunaMoving = luna ? luna.moving : playerMoving, moritaMoving = morita ? morita.moving : playerMoving;
    const scNow = G.world && G.world.scenes[G.tramo], robloxCats = G.missionId === 'parafalls' && !!root.PARAFALLS_ROBLOX_COMPANIONS;
    const SET = scNow && scNow.theme === 'submarino' && (P.water || P.wade) ? COMPANIONS_SUB : scNow && scNow.theme === 'espacial' && ready(image(COMPANIONS_SPACE.luna.src)) ? COMPANIONS_SPACE : COMPANIONS;
    const onFeet = (a, riding) => !!P.ground && !P.water && !riding && !(a && ['pounce','fetch','assist'].includes(a.mode));
    const lunaGround = onFeet(luna, lunaShoulder), moritaGround = onFeet(morita, moritaShoulder);
    drawCompanion(SET.luna, lunaX, lunaY, T, lunaGround ? 0 : -2 + stride, luna ? luna.face < 0 : P.face < 0, lunaShoulder,
      lunaWarn ? 'alert' : action, luna?.phase ?? 0, lunaMoving, luna?.mode ?? 'follow',G.world.schoolMission,robloxCats,lunaGround);
    drawCompanion(SET.morita, moritaX, moritaY, T, moritaGround ? 0 : -1 - stride * 0.7, morita ? morita.face < 0 : P.face > 0, moritaShoulder,
      moritaWarn ? 'alert' : action, morita?.phase ?? 2.4, moritaMoving, morita?.mode ?? 'follow',G.world.schoolMission,robloxCats,moritaGround);
    // V58.2: animaciones de ayuda. Salto de Luna (estela y arañazo) y carrera de Morita por los cristales.
    for (const [a, c] of [[luna, SET.luna], [morita, SET.morita]]) {
      if (!a) continue;
      if (a.mode === 'pounce' && a.pounce && a.pounce.t < 1) {
        for (let i = 1; i <= 4; i++) circle(a.x - a.face * i * 9, a.y - 14 + i * 2, 5 - i, c.tint, 0.32 - i * 0.06);
        line(a.x - a.face * 18, a.y - 22, a.x - a.face * 46, a.y - 10, '#fff3c4', 0.5, 2);
      }
      if (a.mode === 'fetch' && a.fetch) {
        for (let i = 0; i < 3; i++) { const k = (T * 3 + i * 0.33) % 1; circle(a.x - a.face * (10 + k * 26), a.y - 18 - k * 10, 2.4 * (1 - k), '#d9ff65', 0.8 * (1 - k)); }
      }
    }
    for (const fx of G.catFx || []) {
      const k = fx.t / 0.42;
      for (let i = -1; i <= 1; i++) {
        const ox = fx.x + i * 8, oy = fx.y + i * 3;
        line(ox - 14 * fx.dir, oy - 14 + k * 4, ox + 12 * fx.dir, oy + 12 + k * 4, '#ffffff', 0.9 * (1 - k), 3);
        line(ox - 14 * fx.dir, oy - 14 + k * 4, ox + 12 * fx.dir, oy + 12 + k * 4, '#ff7ab8', 0.7 * (1 - k), 1.4);
      }
      if (k < 0.5) text('¡MIAU!', fx.x, fx.y - 34 - k * 14, 9, '#fff3c4', 'center', 900);
    }
    if (state.hissT > 0 && !P.dead) {
      for (const [a, sh] of [[luna, lunaShoulder], [morita, moritaShoulder]]) {
        if (!a) continue;
        const cy = a.y - (sh ? 86 : 52);
        text('¡FSSS!', a.x, cy - Math.sin(T * 20) * 1.5, 7, '#ff9ab8', 'center', 900);
      }
    }
    if (lunaWarn || moritaWarn) {
      const a = lunaWarn ? luna : morita, shoulder = lunaWarn ? lunaShoulder : moritaShoulder;
      const cx = a ? a.x : lunaWarn ? lunaX : moritaX, cy = (a ? a.y : foot) - (shoulder ? 86 : 58);
      bang(cx, cy, T);
      text('¡CUIDADO!', cx, cy - 13, 8, '#ffe27a', 'center', 900);
    }
  }

  /* ---------- V52 · Agua y nado ----------
     El agua se dibuja en dos capas: cuerpo y fondo DETRÁS de Sofía; tinte translúcido y superficie con olas
     DELANTE, para que lo sumergido se vea bajo el agua. Sofía usa el atlas de nado (cuadros extraídos por contorno
     de los atlas originales): las animaciones de superficie alinean la línea del agua pintada con la del juego. */
  const SWIM_STATE = { swimFloat: 'float', swim: 'surf', swimUnder: 'under', swimDown: 'down', swimUp: 'up', swimUpDiag: 'upDiag',
    swimDash: 'dash', swimKick: 'dash', swimHurt: 'hurt', waterLeap: 'leap', wadeIdle: 'wade', wade: 'wade', wadeRun: 'wadeRun', diveIn: 'diveIn' };
  const waterGrad = new WeakMap();
  /* V58.1 · Brecha en el puente pintado del fondo del mar (desagüe): se "rompe" el tramo de puente con un hueco de
     agua honda, bordes de piedra quebrada y escombros que caen. */
  function drawBreach(d, T) {
    const x1 = d.x1, x2 = d.x2, w = x2 - x1, top = d.y1 - 22, bot = d.y2 + 20;
    const yk = (k) => top + (k / 6) * (bot - top), wob = (k) => (k % 2 ? 6 : 0) + Math.sin(k * 2.3) * 3;
    ctx.save();
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) { if (k) ctx.lineTo(x1 + wob(k), yk(k)); else ctx.moveTo(x1 + wob(k), yk(k)); }
    for (let k = 6; k >= 0; k--) ctx.lineTo(x2 - wob(k + 1), yk(k));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, 'rgba(22,110,150,0.82)'); g.addColorStop(1, 'rgba(8,44,92,0.9)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(52,72,70,0.9)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
    // Bordes quebrados: trozos de piedra con musgo encima, a cada lado de la brecha.
    for (const [ex, dir] of [[x1, 1], [x2, -1]]) {
      for (let i = 0; i < 3; i++) {
        const yy = top + 8 + i * 17, ww = 8 + ((i * 5) % 7), hh = 9 + (i % 2) * 4;
        ctx.fillStyle = '#7d8f87'; ctx.beginPath(); ctx.moveTo(ex - dir * 3, yy); ctx.lineTo(ex + dir * ww, yy + 2); ctx.lineTo(ex + dir * (ww - 3), yy + hh); ctx.lineTo(ex - dir * 3, yy + hh - 1); ctx.closePath(); ctx.fill();
        fillRect(Math.min(ex - dir * 3, ex + dir * ww), yy - 1, ww + 3, 2.5, '#86b84c', 0.9);
      }
    }
    for (let i = 0; i < 3; i++) {
      const k = ((T * 0.8 + i * 0.37) % 1), px = x1 + w * (0.25 + i * 0.25) + Math.sin(T * 3 + i) * 3;
      fillRR(px - 3, d.y2 + k * 70, 6, 5, 1.5, '#7d8c84', 0.8 * (1 - k));
    }
  }

  function drawWaters(G, V, front) {
    const W = G.world, T = W.t;
    for (const z of W.waters || []) {
      if (z.x2 + 14 < V.x1 || z.x1 - 14 > V.x2 || z.y2 + 16 < V.y1 || z.y - 10 > V.y2) continue;
      const w = z.x2 - z.x1, h = z.y2 - z.y, fountain = z.kind === 'fuente';
      if (!front && (z.breach || z.painted)) {
        // V58.1 · Mar pintado: el arte ya muestra el agua y el fondo (la meseta y sus puentes). Solo un velo tenue y
        // las brechas de los puentes por donde se baja.
        let g = waterGrad.get(z);
        if (!g) { g = ctx.createLinearGradient(0, z.y, 0, z.y2); g.addColorStop(0, 'rgba(120,225,240,0.05)'); g.addColorStop(1, 'rgba(6,42,74,0.16)'); waterGrad.set(z, g); }
        ctx.fillStyle = g; ctx.fillRect(z.x1, z.y, w, h);
        if (z.painted) continue;   // V58.7: el santuario secreto ya pinta su agua
        for (const d of z.drains || []) drawBreach({ x1: d.x1, x2: d.x2, y1: z.y2 - 30, y2: z.y2 }, T);
        for (const b of G.world.breaches || []) if (b.x2 > V.x1 && b.x1 < V.x2 && b.y2 > V.y1 - 40 && b.y1 < V.y2 + 40) drawBreach(b, T);
        continue;
      }
      if (!front) {
        // Fondo y paredes de la poza (piedra), luego el cuerpo del agua con degradado.
        const stone = fountain ? '#8f7f86' : z.sea ? '#2b5560' : '#3f4a3a', stoneTop = fountain ? '#d9cfd4' : '#6f7d5c';
        if (z.deep) {   // fondo sólido (mismo tamaño que en la física), con los huecos de los desagües
          let fx = z.x1 - 12;
          for (const d of (z.drains || []).slice().sort((a, b) => a.x1 - b.x1)) { if (d.x1 > fx) fillRect(fx, z.y2, d.x1 - fx, 10, stone); fx = d.x2; }
          if (z.x2 + 12 > fx) fillRect(fx, z.y2, z.x2 + 12 - fx, 10, stone);
        }
        for (const side of z.banks) {
          const bx = side === 'left' ? z.x1 - 12 : z.x2;
          fillRect(bx, z.y - 3, 12, h + 17, stone); fillRect(bx, z.y - 3, 12, 3, stoneTop);
        }
        let g = waterGrad.get(z);
        if (!g) {
          g = ctx.createLinearGradient(0, z.y, 0, z.y2);
          g.addColorStop(0, z.sea ? 'rgba(90,210,235,0.16)' : fountain ? 'rgba(96,190,214,0.55)' : 'rgba(58,150,178,0.62)');
          g.addColorStop(1, z.sea ? 'rgba(6,42,74,0.42)' : fountain ? 'rgba(40,110,150,0.78)' : 'rgba(10,46,72,0.9)');
          waterGrad.set(z, g);
        }
        ctx.fillStyle = g; ctx.fillRect(z.x1, z.y, w, h);
        // Destellos que se mueven en el fondo (cáusticas).
        for (let i = 0; i < Math.floor(w / 26); i++) {
          const cx = z.x1 + ((i * 26 + T * 9 * (i % 2 ? 1 : -1)) % w + w) % w, cy = z.y + 10 + ((i * 37) % Math.max(8, h - 16));
          line(cx, cy, cx + 9, cy + 2, '#bff3ff', 0.18, 1.5);
        }
        continue;
      }
      // Delante: tinte translúcido (lo sumergido se ve bajo el agua) y superficie con olas.
      // V58.1: en el mar pintado no hay velo delantero (el arte ya se ve bajo el agua): solo la superficie.
      if (!z.breach && !z.painted) fillRect(z.x1, z.y + 3, w, h - 3, fountain ? '#4fb3d1' : '#1f6f93', fountain ? 0.22 : z.sea ? 0.1 : 0.3);
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#d6f8ff'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = z.x1; x <= z.x2; x += 6) {
        const yy = z.y + Math.sin(x * 0.07 + T * 2.4) * 1.6 + Math.sin(x * 0.023 - T * 1.3) * 1.2;
        if (x === z.x1) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      ctx.globalAlpha = 0.35; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = z.x1; x <= z.x2; x += 6) {
        const yy = z.y + 4 + Math.sin(x * 0.05 - T * 1.8) * 1.4;
        if (x === z.x1) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
  }

  function swimAnimFor(P) {
    const S = NS.ART && NS.ART.SWIM;
    if (!S) return null;
    if (P.dead) return (P.water || P.wade) ? 'dead' : null;
    const a = SWIM_STATE[P.state];
    return a && S.anims[a] ? a : null;
  }

  function drawSwimPlayer(G, T, name, alpha) {
    const S = NS.ART.SWIM, A = S.anims[name], im = image(S.sheet);
    if (!ready(im)) return false;
    const P = G.P, n = A.frames.length;
    let ix;
    if (P.state === 'wadeIdle') ix = 0;
    else if (P.state === 'swimKick') ix = Math.min(n - 1, Math.floor(Math.max(0, 0.22 - P.kickT) / 0.22 * n));
    else ix = waterFrameIndex(name === 'dead' ? G.timers.dying : P.stateT, 1000 / A.fps, n, A.loop);
    const [sx, sy, sw, sh, ax, ay] = A.frames[ix];
    const sc = SOFIA_BASE * A.scale;
    let x = P.x, y = P.y, rot = 0;
    if (A.anchor === 'water') {
      const z = P.water || P.wade;
      y = z ? z.y : P.y;
      if (name === 'float' || name === 'surf') {
        y += Math.sin(T * 3.1 + P.x * 0.02) * 1.3;                        // vaivén
        ellipse(P.x - (P.face || 1) * 6, y + 20, 15, 21, '#06202e', 0.28); // cuerpo bajo el agua
      }
    } else if (name === 'under') rot = Math.max(-0.35, Math.min(0.35, P.vy / 700)) * (P.face || 1);
    if (name === 'dead') y += Math.min(70, G.timers.dying * 55);         // se hunde
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale((P.face < 0 ? -1 : 1) * sc, sc);
    ctx.drawImage(im, sx, sy, sw, sh, -ax, -ay, sw, sh);
    ctx.restore();
    if (name === 'hurt' && P.hurtT > 0.25) ring(P.x, P.y, 26, 30, '#ff4040', 0.55, 2.5);
    return true;
  }

  function drawWaterFx(G, V) {
    const S = NS.ART && NS.ART.SWIM;
    if (!S || !G.waterFx || !G.waterFx.length) return;
    const im = image(S.sheet), ok = ready(im);
    const SIZE = { splashS: 34, splashM: 52, splashL: 74, ripple: 48, drop: 12, bubbles: 22, column: 28, whirl: 50 };
    for (const f of G.waterFx) {
      if (f.x < V.x1 - 60 || f.x > V.x2 + 60 || f.y < V.y1 - 80 || f.y > V.y2 + 40) continue;
      const k = Math.min(1, f.t / f.life);
      const hd = HD_WATER[f.kind];
      if (hd && drawHdFx(hd[0], f.x, f.y, f.kind === 'ripple' ? 0 : k, hd[1] * (f.kind === 'ripple' ? 0.65 + k * 0.7 : 1), 1, 1 - Math.pow(k, 3) * 0.95, f.kind === 'ripple' ? 0.72 : 1)) continue;
      if (f.kind === 'bubble') {
        const bx = f.x + Math.sin(f.t * 9 + f.seed * 6) * 3, r = 2 + f.seed * 1.6;
        circle(bx, f.y, r, '#d8f6ff', 0.55 * (1 - k)); ring(bx, f.y, r + 0.6, r + 0.6, '#ffffff', 0.6 * (1 - k), 0.8);
        continue;
      }
      const rec = S.fx[f.kind];
      if (!rec || !ok) continue;
      const [sx, sy, sw, sh, ax, ay] = rec;
      const grow = f.kind === 'ripple' ? 0.55 + k * 0.9 : 0.7 + k * 0.45;
      const sc = (SIZE[f.kind] || 40) / sw * grow;
      ctx.save();
      ctx.globalAlpha = (1 - k) * (f.kind === 'ripple' ? 0.7 : 0.9);
      ctx.translate(f.x, f.y);
      if (f.kind === 'ripple') { ctx.scale(sc, sc * 0.42); ctx.drawImage(im, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh); }
      else { ctx.scale(sc, sc); ctx.drawImage(im, sx, sy, sw, sh, -ax, -ay, sw, sh); }
      ctx.restore();
    }
  }


  /* Atlas submarino (traje de buzo turquesa y coral). V58.6: solo se usa dentro del agua del mar (drawDiveWater). */
  const DIVE_SHEET = 'assets/player/sofia/sofia_submarina_complementaria.png';
  /* V58.3 · Mundo marino: Sofía usa sus cuadros normales en tierra (la isla, los saltos) y, en el instante en que
     entra al agua (nada o vadea), cambia a los cuadros de buceo de sofia_submarina_complementaria.png; al salir
     vuelve a los normales. Cada estado del agua tiene su animación del atlas (tabla sacada de su JSON: primer
     cuadro, cuántos, ms por cuadro, pivote Y en la celda de 256 y si se repite). La patada nadando usa la de nado
     rápido: el atlas no trae una patada submarina dibujada. */
  const DIVE_WATER = {
    swimFloat: [61, 6, 210, 130, true],  swim: [35, 8, 110, 130, true],   swimUnder: [35, 8, 110, 130, true],
    swimDown: [55, 6, 108, 130, true],   swimUp: [49, 6, 108, 130, true], swimUpDiag: [49, 6, 108, 130, true],
    swimDash: [43, 6, 65, 130, true],    swimKick: [43, 6, 65, 130, true], swimHurt: [77, 4, 90, 130, false],
    wadeIdle: [0, 6, 210, 226, true],    wade: [6, 6, 115, 226, true],    wadeRun: [12, 6, 82, 226, true],
    dead: [85, 5, 145, 130, false],      cheer: [98, 5, 155, 226, false]
  };
  // Coordenadas y pivotes individuales, compilados del JSON original (índice -> [x,y,w,h,ax,ay]).
  // No se recortan ni se reescalan los PNG. El test de mapeo verifica la paridad con el JSON.
  const DIVE_RECTS = [[0,0,256,256,128,226],[256,0,256,256,128,226],[512,0,256,256,128,226],[768,0,256,256,128,226],[1024,0,256,256,128,226],[1280,0,256,256,128,226],[1536,0,256,256,128,226],[1792,0,256,256,128,226],[0,256,256,256,128,226],[256,256,256,256,128,226],[512,256,256,256,128,226],[768,256,256,256,128,226],[1024,256,256,256,128,226],[1280,256,256,256,128,226],[1536,256,256,256,128,226],[1792,256,256,256,128,226],[0,512,256,256,128,226],[256,512,256,256,128,226],[512,512,256,256,128,226],[768,512,256,256,128,226],[1024,512,256,256,128,226],[1280,512,256,256,128,226],[1536,512,256,256,128,226],[1792,512,256,256,128,226],[0,768,256,256,128,226],[256,768,256,256,128,226],[512,768,256,256,128,226],[768,768,256,256,128,130],[1024,768,256,256,128,130],[1280,768,256,256,128,130],[1536,768,256,256,128,130],[1792,768,256,256,128,226],[0,1024,256,256,128,226],[256,1024,256,256,128,226],[512,1024,256,256,128,226],[768,1024,256,256,128,130],[1024,1024,256,256,128,130],[1280,1024,256,256,128,130],[1536,1024,256,256,128,130],[1792,1024,256,256,128,130],[0,1280,256,256,128,130],[256,1280,256,256,128,130],[512,1280,256,256,128,130],[768,1280,256,256,128,130],[1024,1280,256,256,128,130],[1280,1280,256,256,128,130],[1536,1280,256,256,128,130],[1792,1280,256,256,128,130],[0,1536,256,256,128,130],[256,1536,256,256,128,130],[512,1536,256,256,128,130],[768,1536,256,256,128,130],[1024,1536,256,256,128,130],[1280,1536,256,256,128,130],[1536,1536,256,256,128,130],[1792,1536,256,256,128,130],[0,1792,256,256,128,130],[256,1792,256,256,128,130],[512,1792,256,256,128,130],[768,1792,256,256,128,130],[1024,1792,256,256,128,130],[1280,1792,256,256,128,130],[1536,1792,256,256,128,130],[1792,1792,256,256,128,130],[0,2048,256,256,128,130],[256,2048,256,256,128,130],[512,2048,256,256,128,130],[768,2048,256,256,128,130],[1024,2048,256,256,128,130],[1280,2048,256,256,128,130],[1536,2048,256,256,128,130],[1792,2048,256,256,128,130],[0,2304,256,256,128,130],[256,2304,256,256,128,130],[512,2304,256,256,128,130],[768,2304,256,256,128,130],[1024,2304,256,256,128,130],[1280,2304,256,256,128,130],[1536,2304,256,256,128,130],[1792,2304,256,256,128,130],[0,2560,256,256,128,130],[256,2560,256,256,128,130],[512,2560,256,256,128,130],[768,2560,256,256,128,130],[1024,2560,256,256,128,130],[1280,2560,256,256,128,130],[1536,2560,256,256,128,130],[1792,2560,256,256,128,130],[0,2816,256,256,128,130],[256,2816,256,256,128,130],[512,2816,256,256,128,226],[768,2816,256,256,128,226],[1024,2816,256,256,128,226],[1280,2816,256,256,128,226],[1536,2816,256,256,128,226],[1792,2816,256,256,128,226],[0,3072,256,256,128,226],[256,3072,256,256,128,226],[512,3072,256,256,128,226],[768,3072,256,256,128,226],[1024,3072,256,256,128,226],[1280,3072,256,256,128,226],[1536,3072,256,256,128,226]];
  function waterFrameIndex(t, ms, count, loop) {
    const i = Math.floor(Math.max(0, Number.isFinite(t) ? t : 0) * 1000 / ms);
    return loop ? i % count : Math.min(count - 1, i);
  }
  const inSeaWater = (P) => !!(P.water || P.wade);
  function drawProductionDive(G, alpha) {
    const A = NS.ART && NS.ART.PRODUCTION_DIVE, P = G.P;
    if (!A) return false;
    const im = image(A.sheet); if (!ready(im)) return false;
    const state = P.dead ? 'dead' : P.state;
    let name = A.states[state]; if (!name) return false;
    if(state==='swimFloat')name='idle';
    if(state==='swimUnder'&&Math.abs(P.vx)<20&&Math.abs(P.vy)<25)name='estabilizar_agua';
    if (name==='nadar_derecha' && P.face < 0) name = 'nadar_izquierda';
    const clip = A.clips[name]; if (!clip) return false;
    const count = clip.frames.length;
    const t = state === 'dead' ? G.timers.dying : P.stateT;
    const ix = state === 'swimKick' ? Math.min(count-1,Math.floor(Math.max(0,0.22-P.kickT)/0.22*count)) : waterFrameIndex(t,clip.ms,count,clip.loop && state !== 'dead');
    const [sx,sy,sw,sh,ax,ay]=clip.frames[ix];
    if (sx+sw>im.naturalWidth || sy+sh>im.naturalHeight) return false;
    const flip = (P.face<0) !== (clip.direction === 'left');
    const y = clip.anchor === 'feet' ? P.y+P.h/2 : P.y;
    ctx.save(); ctx.globalAlpha=alpha; ctx.translate(P.x,y+(state==='dead'?Math.min(70,G.timers.dying*55):0));
    ctx.scale((flip?-1:1)*A.scale,A.scale);ctx.drawImage(im,sx,sy,sw,sh,-ax,-ay,sw,sh);ctx.restore();
    if (state==='swimHurt' && P.hurtT>0.25) ring(P.x,P.y,26,30,'#ff4040',0.55,2.5);
    if (state==='swimKick') drawHdFx('slash',P.x+P.face*26,P.y,1-P.kickT/0.22,60,P.face,0.7);
    if (state==='swimDash') drawHdFx('propulsion',P.x-P.face*22,P.y,Math.min(0.99,P.stateT/0.28),65,P.face,0.65);
    return true;
  }
  function drawDiveWater(G, alpha) {
    if (drawProductionDive(G, alpha)) return true;
    const P = G.P, im = image(DIVE_SHEET);
    if (!ready(im)) return false;
    const state = P.dead ? 'dead' : DIVE_WATER[P.state] ? P.state : P.wade ? 'wadeIdle' : 'swimFloat';
    const [first, count, ms, pivot, loop] = DIVE_WATER[state];
    const t = state === 'dead' ? G.timers.dying : P.stateT;
    const ix = state === 'swimKick'
      ? Math.min(count - 1, Math.floor(Math.max(0, 0.22 - P.kickT) / 0.22 * count))
      : waterFrameIndex(t, ms, count, loop);
    const [sx, sy, sw, sh, ax, ay] = DIVE_RECTS[first + ix];
    if (sx + sw > im.naturalWidth || sy + sh > im.naturalHeight) return false;
    let rot = 0;
    if (P.state === 'swim' || P.state === 'swimUnder') rot = Math.max(-0.35, Math.min(0.35, P.vy / 700)) * (P.face || 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(P.x, pivot === 130 ? P.y + (P.state === 'dead' ? Math.min(70, G.timers.dying * 55) : 0) : P.y + P.h / 2);
    if (rot) ctx.rotate(rot);
    ctx.scale((P.face < 0 ? -1 : 1) * 0.4, 0.4);
    ctx.drawImage(im, sx, sy, sw, sh, -ax, -ay, sw, sh);
    ctx.restore();
    if (P.state === 'swimHurt' && P.hurtT > 0.25) ring(P.x, P.y, 26, 30, '#ff4040', 0.55, 2.5);
    return true;
  }
  /* Reserva visual para el traje astronauta, sin reemplazar los frames originales:
     cuando se incorpore el atlas espacial la capa se sustituye por frames reales. */
  function drawAstronautGear(P, alpha) {
    const foot = P.y + P.h / 2;
    ctx.save();
    ctx.translate(P.x, foot);
    ctx.scale(P.face < 0 ? -1 : 1, 1);
    fillRR(-16, -46, 32, 28, 8, '#ecf2fa', alpha * 0.87);
    fillRR(-19, -42, 7, 23, 3, '#7597ac', alpha * 0.95);
    fillRR(-10, -39, 20, 16, 4, '#acbed1', alpha * 0.9);
    fillRR(-4, -36, 8, 4, 2, '#4ce7ee', alpha * 0.9);
    circle(0, -56, 16.5, '#e0e8f5', alpha);
    circle(0, -56, 12.8, '#236177', alpha * 0.38);
    ring(0, -56, 13.2, 13.2, '#ffffff', alpha * 0.98, 2.2);
    circle(8, -63, 2.6, '#ffffff', alpha * 0.5);
    ctx.restore();
  }

  function drawPlayer(G, T) {
    const P = G.P, foot = P.y + P.h / 2;
    const top = landingBelow(G);
    if (top !== null && !P.dead && !P.water) {
      const dist = Math.max(0, top - foot), k = Math.max(0.3, Math.min(1, 1 - dist / 520));
      ellipse(P.x, top + 2, 22 * k, 5.5 * k, '#071421', 0.16 + 0.22 * k);
      if (P.ground) ellipse(P.x, top + 1, 13, 2.7, '#071421', .30);
      if (dist > 60 && !P.ground && ropt.landingRing) {
        const fall = top - P.airTopFoot, D = NS.CONFIG.difficulty[G.difficulty] || NS.CONFIG.difficulty.normal;
        const c = fall >= D.fallDamage ? '#ff5a4a' : fall >= NS.CONFIG.fall.hard ? '#ffb547' : '#d9ff65';
        ring(P.x, top + 2, 26 * k, 7 * k, c, 0.55 * k + 0.15, 1.8);
      }
    }
    if (P.shield) ring(P.x, P.y, 38, 40, '#69d7d2', 0.8, 2);
    if (P.magnetT > 0) ring(P.x, P.y, NS.CONFIG.powers.magnetRadius * 0.4 + Math.sin(T * 6) * 4, NS.CONFIG.powers.magnetRadius * 0.4, '#ff7ad9', 0.25, 1.5);
    let alpha = 1;
    if (P.invuln > 0 && !P.cheer && Math.floor(T * 18) % 2 === 0) alpha = 0.45;
    if (G.state === 'victory' || G.state === 'won') alpha = Math.max(0, 1 - Math.max(0, G.timers.victory - 0.7) / 0.3);
    if (alpha <= 0) return;
    const currentScene = G.world && G.world.scenes[G.tramo];
    const suitTheme = currentScene && currentScene.theme;
    const sea = suitTheme === 'submarino';
    // V58.3: en el mar, dentro del agua = cuadros de buceo; fuera del agua = cuadros normales (sin atlas de nado).
    if (sea && inSeaWater(P) && drawDiveWater(G, alpha)) return;
    const swimA = sea ? null : swimAnimFor(P);
    if (swimA && drawSwimPlayer(G, T, swimA, alpha)) return;
    const outfit = outfitFor(suitTheme);
    let yOff = 0;
    if (P.dead) { const t = Math.min(1, G.timers.dying / 0.9); yOff = -Math.sin(t * Math.PI) * 42; }
    const astro = outfit === 'astronauta' && ready(image(ASTRO_DIR + 'idle.webp'));
    const state = P.state, list = (astro ? ASTRO[state] || ASTRO.idle : NINA[state] || NINA.idle);
    let ix;
    // Estados de "una sola pasada" usan el tiempo dentro del estado; los ciclos, el reloj de animación.
    if (state === 'kick') ix = Math.min(list.length - 1, Math.floor((0.22 - P.kickT) / 0.22 * list.length));
    else if (state === 'land' || state === 'hurt' || state === 'dash' || state === 'jump' || state === 'fall' || state === 'zip') ix = 0;
    else if (state === 'dead') ix = 0;
    else ix = Math.floor(P.animT * 1000 / (FRAME_MS[state] || 100)) % list.length;
    const name = list[Math.max(0, Math.min(list.length - 1, ix))];
    const astroClip = {idle:'idle',run:'walk',fastRun:'walk',jump:'jump',fall:'fall',land:'land',climb:'walk',dash:'dash',kick:'kick',hurt:'hurt',dead:'ko',cheer:'victory'}[state];
    const prodAstro = outfit==='astronauta' && astroClip ? productionFrame('sofia_astronauta',astroClip,P.dead?G.timers.dying:P.stateT,['idle','run','fastRun','climb'].includes(state),state==='fastRun'?64:0,state==='kick'?1-P.kickT/0.22:null) : null;
    const im = prodAstro ? prodAstro.im : image(astro ? ASTRO_DIR + name + '.webp' : ninaSrc(name, outfit));
    const meta = astro ? ASTRO_META : (NS.ART && NS.ART.SOFIA[name]) || [1, 96, 218];
    const useRobloxSofia = G.missionId === 'parafalls' && !astro && root.SOFIA_ROBLOX_ATLAS && root.SofiaRobloxAtlas;
    const robloxImg = useRobloxSofia ? image(PARAFALLS_ROBLOX_SOFIA) : null;
    const robloxState = PARAFALLS_ROBLOX_PLAYER_STATE[state] || state;
    const robloxTime = ['idle','run','fastRun','climb','zip','swing'].includes(state) ? P.animT : (P.dead ? G.timers.dying : P.stateT);
    const robloxDrawn = !!(ready(robloxImg) && root.SofiaRobloxAtlas && root.SofiaRobloxAtlas.draw(ctx, robloxImg, root.SOFIA_ROBLOX_ATLAS, robloxState, robloxTime, P.x, foot + yOff, { scale: 0.29, facing: P.face || 1, opacity: alpha }));
    if (!robloxDrawn) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const swingA = state === 'swing' && P.rope ? P.ropeA : null;
      if (swingA !== null) {
        // V58.2: gira alrededor de la mano (en la cuerda): los pies siguen el ángulo del columpio.
        const hang = NS.CONFIG.rope.hang, hy = P.y - P.h / 2 - hang;
        ctx.translate(P.x, hy); ctx.rotate(-swingA); ctx.translate(0, P.h + hang);
      } else ctx.translate(P.x, foot + yOff);
      let rot;
      if (P.dead) rot = (P.face || 1) * Math.min(1.35, G.timers.dying * 1.9);
      else if (state === 'dash') rot = 0;
      else if (state === 'hurt') rot = -(P.face || 1) * 0.22;
      else if (state === 'jump') rot = -(P.face || 1) * 0.06;
      else if (state === 'fall') rot = (P.face || 1) * Math.min(0.12, Math.max(0, P.vy) / 4000);
      else if (state === 'kick') rot = (P.face || 1) * -0.03;
      else if (state === 'zip') rot = Math.sin(T * 3.2) * 0.06 + (P.face || 1) * 0.08;
      else if (state === 'swing') rot = 0;
      else rot = Math.max(-1, Math.min(1, P.vx / NS.CONFIG.phys.move)) * 0.05;
      ctx.rotate(rot);
      if (ready(im)) {
        const sc = SOFIA_BASE / meta[0];
        // Respiración sutil en reposo y aplastado breve al aterrizar.
        const breathe = state === 'idle' ? Math.sin(T * 2.6) * 0.012 : 0;
        const land = state === 'land' ? 0.05 * Math.max(0, 1 - P.stateT / 0.16) : 0;
        ctx.scale((P.face < 0 ? -1 : 1) * sc * (1 + land - breathe * 0.4), sc * (1 - land + breathe));
        if (prodAstro) {const [x,y,w,h,ax,ay]=prodAstro.f;ctx.drawImage(im,x,y,w,h,-ax,-ay,w,h);}
        else ctx.drawImage(im, -meta[1], -meta[2]);
        if (state === 'hurt' && P.hurtT > 0.25) {
          // Destello rojo al recibir daño: solo la silueta de Sofía.
          const sil = silhouette(im, '#ff4040');
          if (sil) { ctx.globalAlpha = alpha * 0.5; if(prodAstro){const [x,y,w,h,ax,ay]=prodAstro.f;ctx.drawImage(sil,x,y,w,h,-ax,-ay,w,h);}else ctx.drawImage(sil, -meta[1], -meta[2]); }
        }
      } else {
        fillRR(-8, -39, 16, 23, 5, '#2aa6ae'); circle(0, -51, 7, '#e9b98d');
        fillRR(-7, -17, 5, 16, 2, '#172432'); fillRR(2, -17, 5, 16, 2, '#172432'); fillRect(-7, -35, 14, 3, '#d9ff65');
      }
      ctx.restore();
    }
    if (outfit === 'astronauta' && !astro && !prodAstro) drawAstronautGear(P, alpha);
    if (P.zip) {
      const hy = P.y - P.h / 2 - NS.CONFIG.zip.hang;
      fillRR(P.x - 8, hy - 10, 16, 8, 3, '#2c3138'); circle(P.x - 3, hy - 1, 2.6, '#c9d2d8'); circle(P.x + 4, hy - 1, 2.6, '#c9d2d8');
      line(P.x, hy - 2, P.x, hy + 6, '#2c3138', 1, 2.2);
      for (let i = 1; i <= 3; i++) line(P.x - P.zip.ux * (10 + i * 8), P.y - 8 + i * 6, P.x - P.zip.ux * (24 + i * 8), P.y - 8 + i * 6, '#cfe8ff', 0.35, 1.5);
    }
    if (P.dashT > 0) for (let i = 1; i <= 3; i++) line(P.x - P.face * (14 + i * 9), P.y - 10 + i * 6, P.x - P.face * (30 + i * 9), P.y - 10 + i * 6, '#4ce7ee', 0.5, 2);
    if (P.kickT > 0 && !drawHdFx('slash', P.x + P.face * 29, P.y - 9, 1 - P.kickT / 0.22, 85, P.face, 0.88)) { const k = P.kickT / 0.22; line(P.x + P.face * 16, P.y - 9, P.x + P.face * 58, P.y - 9, '#ffd35a', 0.35 * k, 3); ring(P.x + P.face * 58, P.y - 9, 9, 9, '#ffe9a8', 0.5 * k, 2); }
  }

  function drawCinematic(G, T) {
    if (G.state !== 'victory') return;
    const p = Math.max(0, Math.min(1, G.timers.victory / 2.4));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    fillRect(0, 0, cw, Math.max(28, ch * 0.09), '#050a10', 0.92);
    fillRect(0, ch - Math.max(28, ch * 0.09), cw, Math.max(28, ch * 0.09), '#050a10', 0.92);
    const phrases = G.world.portal ? ['¡VENGAN, GATAS!', 'EL PORTAL SE ABRE…', 'LAS CASCADAS QUEDAN ATRÁS'] :
      G.missionId === 'submarino' ? ['¡A LA ESCOTILLA!', 'LA CÁMARA SE SELLA…', 'RUMBO A LA SUPERFICIE'] :
      G.missionId === 'espacial' ? ['¡TODAS AL MÓDULO!', 'DESPEGUE LUNAR…', 'REGRESO DE LA ÓRBITA'] :
      ['¡LUNA, MORITA, SUBAN!', 'EL MOTOR ARRANCA…', 'RUTA 6 · A CASA'];
    text(phrases[p < .38 ? 0 : p < .72 ? 1 : 2], cw / 2, ch * 0.14, Math.max(12, Math.min(22, cw * 0.035)), '#ffe9a8');
  }

  // Atlas RGBA original; un destello por evento, nunca un sprite por cada partícula.
  const RELEASE_FX_SHEET = 'assets/fx/release_fx_rgba.png';
  const RELEASE_FX_ROWS = {"impact":[0,62],"damage":[1,58],"collect":[2,52],"dash":[3,66],"dust":[4,52],"boss":[5,86]};
  const RELEASE_FX_COLOR = {
    0xff6b69:'damage',0xff755c:'boss',0xfff3c4:'impact',0xff9a5a:'impact',0xffd35a:'impact',
    0xff7a5a:'impact',0xffb07a:'impact',0xffa25a:'impact',0xffe27a:'collect',0xd9ff65:'collect',
    0xc9ff72:'collect',0x69d7d2:'dash',0x4ce7ee:'dash',0xbfe6ff:'dash',0xcfe8ff:'dash',
    0xc9774f:'dust',0xc89a62:'dust',0xcfd8dc:'dust',0xc0704a:'dust',0xffd38a:'dust'
  };
  // V58.7.3: HD atlases; fixed pivot, no per-frame resize, and original FX fallback.
  const HD_FX = {"impact":["assets/fx/combat_hd.png",0,40,76,120,120],"heavy":["assets/fx/combat_hd.png",1,48,98,120,120],"explosion":["assets/fx/combat_hd.png",2,75,130,120,120],"slash":["assets/fx/combat_hd.png",3,37,100,120,120],"dust":["assets/fx/combat_hd.png",4,65,100,120,187],"shockwave":["assets/fx/combat_hd.png",5,55,130,120,120],"splash_small":["assets/fx/water_energy_hd.png",0,75,78,120,181],"splash_large":["assets/fx/water_energy_hd.png",1,90,112,120,190],"bubbles":["assets/fx/water_energy_hd.png",2,90,64,120,120],"propulsion":["assets/fx/water_energy_hd.png",3,55,100,120,120],"charge":["assets/fx/water_energy_hd.png",4,65,90,120,120],"energy_burst":["assets/fx/water_energy_hd.png",5,65,128,120,120]};
  function drawHdFx(clip, x, y, progress, size, face = 1, opacity = 1, height = 1) {
    const m = HD_FX[clip];
    if (!m || !Number.isFinite(progress)) return false;
    const im = image(m[0]); if (!ready(im)) return false;
    const t = Math.max(0, Math.min(0.999999, progress));
    const k = Math.floor(t * 6), sc = (size || m[3]) / 240;
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    ctx.translate(x, y); ctx.scale(face < 0 ? -1 : 1, height);
    ctx.drawImage(im, k * 240, m[1] * 240, 240, 240, -m[4] * sc, -m[5] * sc, 240 * sc, 240 * sc);
    ctx.restore(); return true;
  }
  const HD_WATER = { splashS:['splash_small',58], splashM:['splash_large',82], splashL:['splash_large',112], ripple:['splash_small',74], bubble:['bubbles',21], bubbles:['bubbles',55], column:['splash_large',88], whirl:['propulsion',82] };
  const HD_EVENT = { impact:'impact', damage:'heavy', collect:'charge', dash:'propulsion', dust:'dust', boss:'explosion' };
  function drawReleaseFx(G, V) {
    const im = image(RELEASE_FX_SHEET);
    let count = 0;
    for (const f of G.fx) {
      const cue = f.cue, kind = RELEASE_FX_COLOR[f.color];
      if (!cue || !kind || count >= 24) continue;
      const age = Math.max(0, cue.life - f.life);
      if (age >= 0.24 || cue.x < V.x1-50 || cue.x > V.x2+50 || cue.y < V.y1-50 || cue.y > V.y2+50) continue;
      const [row, size] = RELEASE_FX_ROWS[kind], frame = Math.min(5, Math.floor(age / 0.04));
      const clip = HD_EVENT[kind];
      if (!drawHdFx(clip, cue.x, cue.y, age / 0.24, size * 1.3, kind === 'dash' ? (G.P.face || 1) : 1, 1 - Math.pow(age / 0.24, 3) * 0.8) && ready(im))
        ctx.drawImage(im, frame*96,row*96,96,96,cue.x-size/2,cue.y-size/2,size,size);
      count++;
    }
  }
  function drawParticles(G, V) {
    drawReleaseFx(G, V);
    for (const f of G.fx) {
      if (f.x < V.x1 || f.x > V.x2 || f.y < V.y1 || f.y > V.y2) continue;
      circle(f.x, f.y, 2.5, hex(f.color), Math.max(0, Math.min(1, f.life / f.max)));
    }
  }

  function drawDebug(G) {
    const P = G.P, U = NS.util, C = NS.CONFIG;
    for (const s of G.world.solids) { if (s.broken || s.open) continue; ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 1; ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1); }
    for (const p of G.world.platforms) line(p.x1, p.y, p.x2, p.y, p.drop ? '#ff44ed' : '#45ff9a', 0.9, 1.5);
    const hb = U.bodyRect(P, C.player.hurtScaleX, C.player.hurtScaleY, P.h * (1 - C.player.hurtScaleY) * 0.5);
    ctx.strokeStyle = '#ffe14a'; ctx.strokeRect(hb.x1, hb.y1, hb.x2 - hb.x1, hb.y2 - hb.y1);
    ctx.strokeStyle = '#4ce7ee'; ctx.strokeRect(P.x - P.w / 2, P.y - P.h / 2, P.w, P.h);
    for (const f of G.world.foes) { if (f.dead) continue; const b = NS.Enemies.box(f); ctx.strokeStyle = '#ff9a5a'; ctx.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1); }
  }

  /** Dibuja un fotograma. T = tiempo de animación (s). */
  // V58.8.21: material identity, collection readability and depth. Pure render; no collision changes.
  const WORLD_FINISH = {
    escuela: ['#ffe7ad','#233b4c','#ffdf9e'], guadalajara: ['#ffd38d','#4f3032','#ffd38d'],
    submarino: ['#75e4e1','#123d52','#8cecff'], espacial: ['#c6cbff','#252946','#d6c5ff'],
    parafalls: ['#aef7c9','#16494c','#c8ffed']
  };
  function finishPalette(G) { return WORLD_FINISH[G.missionId] || WORLD_FINISH.escuela; }
  function drawWorldFinish(G,V) {
    // Single world-space tint, behind all collidable geometry and actors.
    if (G.room) return;
    const a=finishPalette(G), h=V.y2-V.y1, w=V.x2-V.x1;
    if (qScale < .70) return;
    const g=ctx.createLinearGradient(0,V.y1,0,V.y2);
    g.addColorStop(0,a[0]+'10'); g.addColorStop(.5,'#00000000'); g.addColorStop(1,a[1]+'30');
    ctx.fillStyle=g; ctx.fillRect(V.x1,V.y1,w,h);
  }
  function drawPlatformFinish(G,V) {
    // Only surfaces actually rendered, never hidden background ledges or moving/unstable props.
    const a=finishPalette(G); let n=0;
    for(const p of G.world.platforms){
      if(n>=48)break;
      if(p.region!==(G.room?G.room.id:'main')||p.hidden||p.painted||p.artPainted||p.shore||p.schoolFurniture||p.look||!['normal','solid','floor','thin','stair'].includes(p.kind))continue;
      if(p.y<V.y1||p.y>V.y2||p.x2<V.x1||p.x1>V.x2)continue;
      const x=Math.max(p.x1,V.x1), e=Math.min(p.x2,V.x2), w=e-x;
      if(w<12)continue;
      fillRect(x,p.y+1,w,2,a[0],.52);
      if(qScale>=.78)fillRect(x,p.y+5,w,3,a[1],.26);
      n++;
    }
  }
  function drawPickupFinish(G,V,T){
    const a=finishPalette(G); let n=0;
    if(qScale<.75)return;
    for(const p of G.world.pickups){
      if(n>=24)break;
      if(p.got||p.type!=='gem'||p.x<V.x1||p.x>V.x2||p.y<V.y1||p.y>V.y2)continue;
      const pulse=.5+.5*Math.sin(T*3+p.x*.019+p.y*.011);
      const rad=17+pulse*3;
      circle(p.x,p.y,rad,a[2],.10+pulse*.06);
      ring(p.x,p.y,rad,rad,a[2],.30+pulse*.15,1);
      n++;
    }
  }

  function draw(G, T) {
    frameNumber++;
    if (frameNumber % 90 === 0) {
      for (const [src, im] of images) {
        if (im.scenery && im.naturalWidth * im.naturalHeight > 500000 && frameNumber - im.usedAt > 120) images.delete(src);
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#101725';
    ctx.fillRect(0, 0, cw, ch);
    if (!G.world || !G.P) return;
    const v = G.view, k = dpr * v.zoom;
    const shake = G.shakeT > 0 ? Math.sin(G.shakeT * 90) * G.shakeT * 16 * ropt.shake : 0;
    // Redondeo a píxel físico de la cámara: evita el temblor de subpíxel en el fondo pintado.
    const ox = Math.round(-G.cam.x * k), oy = Math.round(-G.cam.y * k + shake * dpr);
    ctx.setTransform(k, 0, 0, k, ox, oy);
    const V = { x1: G.cam.x - 40, x2: G.cam.x + v.w + 40, y1: G.cam.y - 60, y2: G.cam.y + v.h + 60 };
    const W = G.world;
    // V58.1: mar, Luna y escuela son mundos pintados fijos al mundo (DEPTH_ART); el resto, fondos del ancho del mundo.
    const depth = !G.room && drawDepthArt(G, V);
    if (!G.room && W.shore && V.y1 < W.scenes[0].startY) {
      const shore = W.shore, im = image(shore.file);
      if (ready(im)) ctx.drawImage(im, shore.x, shore.top, shore.width, shore.height);
    }
    if (!G.room) { if (depth) drawCracks(G, V, T); else drawBackdrop(G, V); drawStreet(G, V, T); drawToxiAtmosphere(G, V, T); }
    drawWorldFinish(G,V);
    for (const r of W.rooms) drawRoomBackground(r, V, T);
    drawWaters(G, V, false);
    drawAbyssMatter(G,V,T,false);
    drawCascades(G, V, T);
    drawSolids(G, V);
    drawZips(G, V, T);
    drawRopes(G, V, T);
    drawPlatforms(G, V);
    drawPlatformFinish(G,V);
    drawDoors(G, V, T);
    drawCheckpoints(G, V, T);
    drawMidpoints(G, V, T);
    drawSigns(G, V);
    drawHazards(G, V, T);
    drawAbyssRoute(G,V,T);
    drawPickupFinish(G,V,T);
    drawPickups(G, V, T);
    drawSchoolBossWarning(G,V,T);
    const arena=W.poseidonArena,boss=arena&&W.foes.find(f=>f.id===arena.bossId&&!f.dead);
    if(!G.room&&boss&&inView(V,arena.x1,arena.top,arena.x2,arena.bottom)){
      const c=boss.enraged?'#ffd080':'#82edff';
      for(const xx of [arena.x1,arena.x2]){line(xx,arena.top,xx,arena.bottom,c,.13,2);drawAbyssObject(1,xx,arena.bottom,72,true);}
      if(boss.state==='aim'||boss.state==='windup'){
        const tx=boss.targetX??boss.x,ty=boss.targetY??boss.y;
        ctx.save();ctx.setLineDash([8,9]);line(boss.x,boss.y,tx,ty,'#ffc66d',.8,2.5);ctx.restore();ring(tx,ty,16,16,'#ffc66d',.8,2);
      }
    }
    drawFoes(G, V, T);
    drawCompanions(G, T);
    drawPlayer(G, T);
    drawWaters(G, V, true);
    drawWaterFx(G, V);
    drawParticles(G, V);
    drawAbyssMatter(G,V,T,true);
    drawSchoolAtmosphere(G,V,T);
    drawContractFx(G, T, k, ox, oy);
    if (debug) drawDebug(G);
    if (G.transition) {
      const tr = G.transition, a = 1 - Math.abs(tr.t / tr.dur - 0.45) / 0.45;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      fillRect(0, 0, cw, ch, '#050a10', Math.max(0, Math.min(1, a * 1.15)));
    }
    drawCinematic(G, T);
  }

  /* V58.8.24 · Efectos del contrato del tramo (pantalla completa, sobre el mundo):
     noche → oscuridad con la linterna de Sofía; lluvia → gotas diagonales y velo frío;
     viento → rachas de hojas y polvo en la dirección de la ráfaga (y su aviso). */
  function drawContractFx(G, T, k, ox, oy) {
    const c = G.run && G.run.contract;
    if (!c || !c.mod || c.scene !== G.tramo || G.room || G.state === 'menu') return;
    const P = G.P, px = P.x * k + ox, py = (P.y - 10) * k + oy;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (c.mod === 'noche') {
      const r = Math.max(cw, ch) * 0.07 + 150 * k;
      const g = ctx.createRadialGradient(px, py, r * 0.25, px, py, r * 1.55);
      g.addColorStop(0, 'rgba(4,6,18,0)'); g.addColorStop(0.55, 'rgba(4,6,18,0.45)'); g.addColorStop(1, 'rgba(3,4,14,0.88)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
      // Ojos de Luna y Morita brillan en la oscuridad.
      const ag = G.companions && G.companions.agents;
      if (ag) for (const name of ['luna', 'morita']) {
        const a = ag[name]; if (!a) continue;
        const ex = a.x * k + ox, ey = (a.y - 20) * k + oy, blink = Math.sin(T * 1.7 + (name === 'luna' ? 0 : 2)) > -0.95;
        if (!blink) continue;
        ctx.fillStyle = name === 'luna' ? 'rgba(170,255,140,0.9)' : 'rgba(255,220,110,0.9)';
        for (const d of [-3, 3]) { ctx.beginPath(); ctx.arc(ex + d * k, ey, 1.8 * k, 0, 7); ctx.fill(); }
      }
    } else if (c.mod === 'lluvia') {
      ctx.fillStyle = 'rgba(30,50,85,0.24)'; ctx.fillRect(0, 0, cw, ch);
      // Gotas en dos tonos: claras sobre fondos oscuros y azul profundo sobre fondos claros.
      ctx.lineWidth = Math.max(1.2, k * 1.8);
      ctx.strokeStyle = 'rgba(40,70,120,0.45)'; ctx.beginPath();
      for (let i = 0; i < 70; i++) {
        const sx = ((i * 131.9 + T * 160) % (cw + 200)) - 100, sy = ((i * 77.1 + T * 980 * (0.8 + (i % 5) * 0.08)) % (ch + 120)) - 60;
        ctx.moveTo(sx, sy); ctx.lineTo(sx - 7 * k, sy + 26 * k);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(215,235,255,0.6)';
      ctx.beginPath();
      for (let i = 0; i < 90; i++) {
        const sx = ((i * 97.3 + T * 140) % (cw + 200)) - 100, sy = ((i * 53.7 + T * 900 * (0.8 + (i % 5) * 0.08)) % (ch + 120)) - 60;
        ctx.moveTo(sx, sy); ctx.lineTo(sx - 7 * k, sy + 26 * k);
      }
      ctx.stroke();
    } else if (c.mod === 'viento') {
      const g = c.gust || {}, on = g.phase === 'gust', warn = g.phase === 'warn';
      if (on || warn) {
        const dir = g.dir || 1, a = on ? 0.42 : 0.18 + 0.12 * Math.sin(T * 20);
        ctx.strokeStyle = 'rgba(245,248,235,' + Math.min(0.75, a * 1.6) + ')'; ctx.lineWidth = Math.max(1.5, k * 2.2);
        ctx.beginPath();
        for (let i = 0; i < (on ? 34 : 12); i++) {
          const sy = (i * 71.3) % ch, len = (40 + (i % 4) * 22) * k, sp = on ? 1500 : 500;
          const sx = dir > 0 ? ((i * 131 + T * sp) % (cw + 300)) - 150 : cw - (((i * 131 + T * sp) % (cw + 300)) - 150);
          ctx.moveTo(sx, sy); ctx.lineTo(sx - dir * len, sy + 3 * k);
        }
        ctx.stroke();
        // Flechas grandes de dirección: avisan (parpadeando) y marcan la ráfaga.
        const ax = dir > 0 ? cw * 0.86 : cw * 0.14, ay = ch * 0.5, sz = Math.min(cw, ch) * 0.05;   // al borde hacia donde sopla: no tapa a Sofía
        ctx.fillStyle = on ? 'rgba(255,240,200,0.55)' : 'rgba(255,220,120,' + (0.35 + 0.35 * Math.sin(T * 14)) + ')';
        for (let i = -1; i <= 1; i++) {
          const x = ax + i * sz * 1.6 * dir + (on ? ((T * 6) % 1) * sz * dir : 0);
          ctx.beginPath(); ctx.moveTo(x - dir * sz * 0.6, ay - sz); ctx.lineTo(x + dir * sz * 0.5, ay); ctx.lineTo(x - dir * sz * 0.6, ay + sz); ctx.lineTo(x - dir * sz * 0.2, ay); ctx.closePath(); ctx.fill();
        }
        if (on) {
          ctx.fillStyle = 'rgba(190,140,70,0.85)';
          for (let i = 0; i < 10; i++) {
            const sy = (i * 113.7 + Math.sin(T * 3 + i) * 30) % ch, sx = dir > 0 ? ((i * 211 + T * 1100) % (cw + 100)) - 50 : cw - (((i * 211 + T * 1100) % (cw + 100)) - 50);
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(T * 8 + i); ctx.fillRect(-4 * k, -2 * k, 8 * k, 4 * k); ctx.restore();
          }
        }
      }
    }
    ctx.restore();
  }

  NS.Render = { init, resize, draw, preload, entryArt, enterWorld, setQuality, setOptions, image, ready, outfitFor, NINA, NINA_DIR, NINA_VARIANT_DIR, COMPANIONS, COMPANIONS_SUB, PAINTERS,
    BACKDROPS, DEPTH_ART, backdropUrls, depthUrls, castUrls, secretUrls, enemyExt, COMPANIONS_SPACE, parafallsRobloxUrls: () => PARAFALLS_ROBLOX_URLS.slice(), toggleDebug: () => (debug = !debug), get debug() { return debug; } };
})(typeof globalThis !== 'undefined' ? globalThis : window);
