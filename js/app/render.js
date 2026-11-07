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
    cheer: ['cheer_01', 'cheer_02', 'cheer_03']
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
  const BUS_FRAMES = [1, 2, 3, 4].map((n) => 'assets/vehicles/camion_frame_0' + n + '.png');
  const FRAME_MS = { idle: 180, run: 92, fastRun: 64, jump: 110, fall: 180, land: 75, climb: 125, dash: 50, kick: 58, hurt: 100, dead: 260, cheer: 170 };
  // Escala base: un cuadro con k = 1 mide ≈ 61 u de pie, igual que la caja de colisión (62 u).
  const SOFIA_BASE = 0.33;
  const ninaSrc = (f) => (NINA_VARIANT_DIR[ropt.ninaLook] || NINA_DIR) + f + '.png';

  const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
  const images = new Map();
  function image(src) {
    if (!images.has(src)) {
      const im = new Image();
      im.decoding = 'async';
      im.src = src;
      images.set(src, im);
    }
    return images.get(src);
  }
  const ready = (im) => !!(im && im.complete && im.naturalWidth > 0);
  function whenLoaded(im) {
    if (ready(im)) return Promise.resolve(true);
    return new Promise((res) => {
      im.addEventListener('load', () => res(true), { once: true });
      im.addEventListener('error', () => res(false), { once: true });
    });
  }

  /* Fondo teñido cacheado (una vez por par archivo+tinte). */
  const tinted = new Map();
  function tintedImage(src, tint) {
    const im = image(src);
    if (!ready(im)) return null;
    if (tint === 0xffffff) return im;
    const key = src + '|' + tint;
    if (tinted.has(key)) return tinted.get(key);
    const c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = hex(tint);
    x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(im, 0, 0);
    tinted.set(key, c);
    return c;
  }

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
    for (const g of Object.keys(NINA)) for (const f of NINA[g]) for (const dir of Object.values(NINA_VARIANT_DIR)) image(dir + f + '.png');
    for (const c of [...Object.values(COMPANIONS), ...Object.values(COMPANIONS_SUB)]) { image(c.src); for (const s of c.idle) image(s); for (const s of c.walk) image(s); image(c.shoulder); }
    image(BUS_FRAMES[0]);
    image(DIVE_SHEET);
    resize();
  }
  function resize() {
    dpr = Math.min(root.devicePixelRatio || 1, 2) * qScale;
    cw = Math.max(1, Math.round(root.innerWidth * dpr));
    ch = Math.max(1, Math.round(root.innerHeight * dpr));
    canvas.width = cw; canvas.height = ch;
    canvas.style.width = '100%'; canvas.style.height = '100%';
  }
  function preload(srcs) { return Promise.all(srcs.map((s) => { const im = image(s); return whenLoaded(im).then((ok) => (ok && im.decode ? im.decode().catch(() => {}) : null)); })); }
  // Resolución adaptativa: el bucle baja la calidad si el dispositivo va lento y la sube si va sobrado.
  function setQuality(q) { q = Math.max(0.5, Math.min(1, q)); if (Math.abs(q - qScale) < 0.02) return false; qScale = q; resize(); return true; }

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
  function drawMissionParallax(G, V, sc) {
    const B = G.world.bounds;
    const x1 = Math.max(V.x1, B.x1), x2 = Math.min(V.x2, B.x2);
    const y1 = Math.max(V.y1, sc.startY), y2 = Math.min(V.y2, sc.endY);
    if (x2 <= x1 || y2 <= y1) return;
    const marine = sc.theme === 'submarino', span = B.x2 - B.x1;
    ctx.save();
    ctx.beginPath(); ctx.rect(x1, y1, x2 - x1, y2 - y1); ctx.clip();
    fillRect(x1, y1, x2 - x1, y2 - y1, marine ? '#062d40' : '#070c29');
    const im = tintedImage(sc.file, sc.tint);
    sc.missingArt = !im;
    if (im) {
      const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
      const scale = Math.max(span * 1.3 / iw, sc.drawH / (ih * 1.5));
      const tw = iw * scale, th = ih * scale;
      const left = (B.x1 + B.x2 - tw) / 2 - (G.cam.x - (B.x1 + B.x2) / 2) * 0.06;
      const top = sc.startY - th * 0.35 - (G.cam.y - sc.startY) * 0.13;
      const first = Math.floor((y1 - top) / th) - 1;
      const last = Math.ceil((y2 - top) / th);
      ctx.globalAlpha = 0.94;
      for (let row = first; row <= last; row++) {
        const y = top + row * th;
        if (y > y2 || y + th < y1) continue;
        if (Math.abs(row % 2) === 1) {
          ctx.save(); ctx.translate(left, y + th); ctx.scale(1, -1);
          ctx.drawImage(im, 0, 0, iw, ih, 0, 0, tw, th); ctx.restore();
        } else ctx.drawImage(im, left, y, tw, th);
      }
      ctx.globalAlpha = 1;
    }
    const height = sc.drawH;
    // Elementos lejanos: brillo y partículas.
    for (let i = 0; i < 86; i++) {
      const x = B.x1 + ((hash(i, 41) / 997 * span - G.cam.x * 0.075) % span + span) % span;
      const y = sc.startY + ((hash(i, 61) / 997 * height - (G.cam.y - sc.startY) * 0.16) % height + height) % height;
      if (x < x1 - 6 || x > x2 + 6 || y < y1 - 6 || y > y2 + 6) continue;
      circle(x, y, 0.7 + i % 4 * 0.5, marine ? '#c4f6ed' : '#e9efff', marine ? 0.3 : 0.7);
    }
    // Elementos próximos: burbujas y escombros, con otro factor de paralaje.
    for (let i = 0; i < 38; i++) {
      const x = B.x1 + ((hash(i + 120, 13) / 997 * span - G.cam.x * 0.27) % span + span) % span;
      const y = sc.startY + ((hash(i + 120, 57) / 997 * height - (G.cam.y - sc.startY) * 0.34) % height + height) % height;
      if (x < x1 - 20 || x > x2 + 20 || y < y1 - 20 || y > y2 + 20) continue;
      const r = 2 + i % 5 * 1.4;
      if (marine) ring(x, y, r, r, '#d5fbff', 0.34, 0.9);
      else { circle(x, y, r, '#9ca5bd', 0.35); circle(x - 1, y - 1, r * 0.22, '#f0f6ff', 0.42); }
    }
    if (sc.shade) fillRect(x1, y1, x2 - x1, y2 - y1, hex(sc.wash), sc.shade * 0.4);
    ctx.restore();
  }

  function drawBackdrop(G, V) {
    const W = G.world, B = W.bounds;
    // Cielo del atardecer sobre la azotea de la escuela (inicio de la historia).
    if (V.y1 < 0) {
      const g = ctx.createLinearGradient(0, -600, 0, 0);
      g.addColorStop(0, '#0b1830'); g.addColorStop(0.6, '#3a3f66'); g.addColorStop(1, '#c46a4c');
      ctx.fillStyle = g; ctx.fillRect(V.x1, Math.max(V.y1, -900), V.x2 - V.x1, Math.min(0, V.y2) - Math.max(V.y1, -900));
      for (let i = 0; i < 40; i++) {
        const sx = B.x1 + (hash(i, 7) / 997) * (B.x2 - B.x1), sy = -600 + (hash(i, 3) / 997) * 420;
        if (sx > V.x1 && sx < V.x2 && sy > V.y1 && sy < V.y2) circle(sx, sy, 1.2, '#ffffff', 0.5);
      }
    }
    // Barrios laterales: fachadas con ventanas, según el tramo.
    for (const sc of W.scenes) {
      if (sc.endY < V.y1 || sc.startY > V.y2) continue;
      if (sc.theme === 'submarino' || sc.theme === 'espacial') { drawMissionParallax(G, V, sc); continue; }
      const school = sc.theme === 'escuela', night = sc.shade;
      const base = school ? '#1f3442' : '#3a2f35', alt = school ? '#253f4f' : '#45373a';
      for (const side of [-1, 1]) {
        const x1 = side < 0 ? B.x1 : sc.x0 + sc.drawW, x2 = side < 0 ? sc.x0 : B.x2;
        if (x2 < V.x1 || x1 > V.x2) continue;
        const y1 = Math.max(sc.startY, V.y1), y2 = Math.min(sc.endY, V.y2);
        fillRect(Math.max(x1, V.x1), y1, Math.min(x2, V.x2) - Math.max(x1, V.x1), y2 - y1, base);
        drawBuildingFacade(sc, side, x1, x2, y1, y2, W.t);
        // Sombra hacia el muro exterior y velo nocturno del tramo.
        if (night > 0) fillRect(Math.max(x1, V.x1), y1, Math.min(x2, V.x2) - Math.max(x1, V.x1), y2 - y1, hex(sc.wash), night * 1.3);
      }
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
    if (sc.file) return tintedImage(sc.file, sc.tint);
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

  function drawStreet(G, V, T) {
    const W = G.world, s = W.street, y = s.y1;
    if (y > V.y2 || y + 260 < V.y1) return;
    const special = W.scenes.length === 1 ? W.scenes[0].theme : null;
    if (special === 'submarino' || special === 'espacial') {
      const marine = special === 'submarino', gate = W.bus;
      const gx = (gate.doorX1 + gate.doorX2) * 0.5;
      fillRect(V.x1, y, V.x2 - V.x1, 18, marine ? '#41737a' : '#7f899d');
      fillRect(V.x1, y + 18, V.x2 - V.x1, 220, marine ? '#153644' : '#171a37');
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

  function drawRoomBackground(r, V) {
    if (!inView(V, r.x1 - 60, r.y1 - 60, r.x2 + 60, r.y2 + 60)) return;
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

  function drawPlatforms(G, V) {
    const T = G.world.t;
    for (const p of G.world.platforms) {
      if (p.y < V.y1 - 30 || p.y > V.y2 + 30 || p.x2 < V.x1 || p.x1 > V.x2) continue;
      const sc = p.scene >= 0 ? G.world.scenes[p.scene] : null;
      if (debug && (p.painted || p.hidden)) { line(p.x1, p.y, p.x2, p.y, p.drop ? '#ff44ed' : '#45ff9a', 0.95, 2); if (p.hidden) continue; }
      if (p.hidden && !(sc && sc.missingArt)) continue; // cornisa pintada en el propio fondo
      const x = p.x1, y = p.y, w = p.x2 - p.x1, h = p.h || 12;
      if (p.kind === 'bounce') { if (p.umbrella) drawUmbrella(p, T, G); else drawAwning(p, T); continue; }
      if (p.kind === 'pigeon') { drawPigeon(p, T); continue; }
      if (p.kind === 'crumble') { drawCrumble(p, T); continue; }
      if (p.kind === 'belt') { drawBelt(p, T); continue; }
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
      if (s.kind === 'street' || (s.kind === 'wall' && false)) continue;
      if (s.kind === 'wall') {
        fillRect(x1, y1, x2 - x1, y2 - y1, '#0c151d');
        fillRect(s.side < 0 ? s.x2 - 8 : s.x1, y1, 8, y2 - y1, '#22323e');
      } else if (s.kind === 'roomwall') {
        fillRect(x1, y1, x2 - x1, y2 - y1, s.theme === 'alcantarilla' ? '#16211e' : '#1c1b24');
        fillRect(x1, s.y1 === y1 ? y1 : y1, x2 - x1, 3, '#4d5a62', s.y1 >= y1 ? 0.8 : 0);
      } else if (s.kind === 'crate') {
        if (s.broken) continue;
        const w = s.x2 - s.x1, h = s.y2 - s.y1;
        fillRR(s.x1, s.y1, w, h, 3, '#9b6a3f');
        ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 3; ctx.beginPath(); ctx.rect(s.x1 + 2, s.y1 + 2, w - 4, h - 4);
        ctx.moveTo(s.x1 + 3, s.y1 + 3); ctx.lineTo(s.x2 - 3, s.y2 - 3); ctx.moveTo(s.x2 - 3, s.y1 + 3); ctx.lineTo(s.x1 + 3, s.y2 - 3); ctx.stroke();
        circle((s.x1 + s.x2) / 2, s.y1 + h / 2, 4, '#d9ff65', 0.5 + 0.3 * Math.sin(G.world.t * 5 + s.x1));
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

  /* ---------- Elementos del mundo ---------- */
  function drawDoors(G, V, T) {
    for (const d of G.world.doors) {
      if (d.x < V.x1 - 40 || d.x > V.x2 + 40 || d.y < V.y1 - 60 || d.y > V.y2 + 30) continue;
      const pulse = 0.72 + 0.28 * Math.sin(T * 4 + d.phase);
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

  function drawCheckpoints(G, V, T) {
    for (const cp of G.world.checkpoints) {
      const x = cp.x + 30, y = cp.y;
      if (x < V.x1 - 30 || x > V.x2 + 30 || y < V.y1 - 80 || y > V.y2 + 10) continue;
      line(x, y, x, y - 56, '#9aa5a8', 1, 3);
      const c = cp.active ? '#d9ff65' : '#5d7f8c';
      if (cp.active) circle(x, y - 60, 18, '#d9ff65', 0.15 + 0.1 * Math.sin(T * 4));
      fillRR(x - 13, y - 72, 26, 22, 5, c);
      fillRR(x - 8, y - 68, 16, 10, 2, '#0d2230');
      circle(x - 5, y - 55, 2, '#0d2230'); circle(x + 5, y - 55, 2, '#0d2230');
    }
  }

  function drawSigns(G, V) {
    for (const s of G.world.signs) {
      if (s.x < V.x1 - 30 || s.x > V.x2 + 30 || s.y < V.y1 - 60 || s.y > V.y2 + 10) continue;
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

  function drawHazards(G, V, T) {
    for (const h of G.world.hazards) {
      const x1 = h.type === 'pot' ? h.x - 14 : h.x1, x2 = h.type === 'pot' ? h.x + 14 : h.x2;
      const y1 = h.type === 'pot' ? h.hangY - 10 : h.y - 30, y2 = h.type === 'pot' ? h.floorY + 4 : h.y + 6;
      if (!inView(V, x1, y1, x2, y2)) continue;
      if (h.type === 'spikes') {
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
  function drawItemIcon(i, x, y) {
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
        circle(p.x, p.y, 18 * k, '#d9ff65', 0.12);
        ctx.fillStyle = '#d9ff65'; ctx.strokeStyle = '#f4ffd0'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(p.x, p.y - 11 * k); ctx.lineTo(p.x + 8 * k, p.y); ctx.lineTo(p.x, p.y + 11 * k); ctx.lineTo(p.x - 8 * k, p.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (p.type === 'power') {
        const c = p.power === 'shield' ? '#69d7d2' : p.power === 'magnet' ? '#ff7ad9' : '#ff6b69', bob = Math.sin(T * 3 + p.phase) * 3, y = p.y + bob;
        circle(p.x, y, 22, c, 0.2); circle(p.x, y, 12, c); ring(p.x, y, 12, 12, '#ffffff', 1, 2);
        if (p.power === 'shield') fillRect(p.x - 4, y - 6, 8, 12, '#ffffff');
        else if (p.power === 'magnet') { fillRect(p.x - 6, y - 5, 4, 10, '#ffffff'); fillRect(p.x + 2, y - 5, 4, 10, '#ffffff'); }
        else { fillRect(p.x - 6, y - 2, 12, 4, '#ffffff'); fillRect(p.x - 2, y - 6, 4, 12, '#ffffff'); }
      } else if (p.type === 'key') {
        const bob = Math.sin(T * 3 + p.x) * 3, y = p.y + bob;
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

  const BOSS_GLOW = { dog: '#ff984f', kid: '#ff6868', chile: '#ff593f', bat: '#b48cff', pigeon: '#63d9ed', bravo: '#ff625b', rat: '#d9ff65' };
  function drawBossFX(f, T) {
    if (!f.isBoss) return;
    const color = BOSS_GLOW[f.kind] || '#ffd35a', cx = f.x;
    const cy = f.y - (f.kind === 'bat' || f.kind === 'pigeon' ? 0 : f.h * 0.54);
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
      ring(cx, cy, r, r * 0.7, '#fff8c9', 1 - p, 3 - p * 2);
    }
    if (f.dead && f.deadT <= 0.45) {
      const p = Math.max(0, f.deadT / 0.45), r = 16 + p * 88;
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
    rat: { sc: 0.5, scBoss: 0.6 },
    dog: { sc: 0.52, scBoss: 0.66 }
  };
  const enemyFrames = (kind, state) => {
    const E = NS.ART && NS.ART.ENEMY[kind];
    return E && E.states[state] ? E.states[state] : null;
  };
  function enemyReady(kind) {
    const w = enemyFrames(kind, 'walk');
    return !!(w && ready(image(EDIR + kind + '/' + w[0] + '.png')));
  }
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
    const img = image(EDIR + kind + '/' + name + '.png');
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

  function drawFoes(G, V, T) {
    const t9 = T * 9;
    for (const f of G.world.foes) {
      if (f.x < V.x1 - 50 || f.x > V.x2 + 50 || f.y < V.y1 - 60 || f.y > V.y2 + 50) continue;
      if (f.dead && f.deadT > 0.45) continue;
      const a = f.dead ? 1 - f.deadT / 0.45 : 1;
      const sk = f.kind === 'bravo' ? 'dog' : f.kind;
      const useSprite = !!ESPR[sk] && enemyReady(sk);
      drawBossFX(f, T);
      ctx.save();
      if (f.isBoss && f.flash > 0 && !f.dead) {
        const punch = Math.sin(Math.min(1, f.flash / 0.2) * Math.PI) * 0.12;
        ctx.translate(f.x, f.y); ctx.scale(1 + punch, 1 - punch); ctx.translate(-f.x, -f.y);
      }
      if (f.dead && !useSprite) { ctx.globalAlpha = a; ctx.translate(f.x, f.y); ctx.scale(1, -1); ctx.translate(-f.x, -f.y + 18); }
      else if (f.dead) ctx.globalAlpha = a;
      const b = Math.sin(t9 + f.x) * 1.5, d = f.dir, fl = f.flash > 0;
      if (useSprite) { drawEnemySprite(f, T, sk); }
      else if (f.kind === 'kid') {
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
        const bw = Math.max(58, Math.min(104, f.w + 18)), by = f.y - f.h - 7;
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

  function drawCompanion(c, x, foot, T, bob, flip, shoulder = false, action = 'idle', phase = 0, moving = false, behavior = 'follow') {
    const frames = moving ? c.walk : c.idle;
    // V50: reposo = poses de pie (01–03); olfatear = cabeza abajo (05); mirar/alerta = cabeza alzada (04, 06).
    // Antes el reposo normal ciclaba también la pose de olfatear y "asearse" mostraba esa misma pose.
    let frameStart = 0, frameCount = moving ? frames.length : 3, fps = moving ? 9.5 : 3.6;
    if (!moving && (behavior === 'sniff' || behavior === 'groom')) { frameStart = 4; frameCount = 1; fps = 1; }
    else if (!moving && (behavior === 'alert' || behavior === 'look')) { frameStart = 3; frameCount = 1; fps = 1; }
    const framePos = (T * fps + phase * 0.42) % frameCount;
    const frameBase = Math.floor(framePos), frameIx = frameStart + frameBase;
    const nextIx = frameStart + (frameBase + 1) % frameCount;
    const frameMix = shoulder ? 0 : Math.max(0, Math.min(1, (framePos - frameBase - 0.68) / 0.32));
    const im = image(shoulder ? c.shoulder : frames[frameIx]);
    const imNext = image(shoulder ? c.shoulder : frames[nextIx]);
    const breath = shoulder ? Math.sin(T * 4.2 + phase) * 0.025 : Math.sin(T * (moving ? 5 : 2.2) + phase) * 0.01;
    const pulse = 1 + breath;
    const hop = shoulder && (action === 'excited' || action === 'assist') ? -Math.abs(Math.sin(T * 11 + phase)) * (action === 'assist' ? 8 : 4) :
      !shoulder && behavior === 'assist' ? -Math.abs(Math.sin(T * 11 + phase)) * 2.5 : 0;
    const sway = shoulder ? Math.sin(T * 2.7 + phase) * (action === 'alert' || action === 'assist' ? 0.08 : 0.035) :
      Math.sin(T * (moving ? 8 : 1.8) + phase) * (moving ? 0.025 : 0.01);
    const idleBob = moving ? Math.sin(T * 12 + phase) * 1.45 : Math.sin(T * 2.5 + phase) * 0.55;
    ctx.save();
    ctx.translate(x, foot + bob + idleBob + (shoulder ? -48 : 0) + hop);
    ctx.rotate(sway);
    ctx.globalAlpha = 0.98;
    if (ready(im) || ready(imNext)) {
      const base = ready(im) ? im : imNext;
      const scale = shoulder ? c.scale * 0.72 * pulse : c.scale * pulse;
      ctx.scale((flip ? -1 : 1) * scale, scale * (action === 'cuddle' ? 1.04 : 1));
      if (ready(im)) {
        ctx.globalAlpha = 0.98 * (1 - frameMix);
        ctx.drawImage(im, -base.naturalWidth / 2, -base.naturalHeight * 0.92);
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
    if (!shoulder && !moving) text(c.name, x, foot - 24 + bob, 6, c.name === 'LUNA' ? '#ffffff' : '#e6e9f0', 'center', 900);
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
    const scNow = G.world && G.world.scenes[G.tramo];
    const SET = scNow && scNow.theme === 'submarino' ? COMPANIONS_SUB : COMPANIONS;
    drawCompanion(SET.luna, lunaX, lunaY, T, -2 + stride, luna ? luna.face < 0 : P.face < 0, lunaShoulder,
      lunaWarn ? 'alert' : action, luna?.phase ?? 0, lunaMoving, luna?.mode ?? 'follow');
    drawCompanion(SET.morita, moritaX, moritaY, T, -1 - stride * 0.7, morita ? morita.face < 0 : P.face > 0, moritaShoulder,
      moritaWarn ? 'alert' : action, morita?.phase ?? 2.4, moritaMoving, morita?.mode ?? 'follow');
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
    swimDash: 'dash', swimHurt: 'hurt', waterLeap: 'leap', wade: 'wade', wadeRun: 'wadeRun', diveIn: 'diveIn' };
  const waterGrad = new WeakMap();
  function drawWaters(G, V, front) {
    const W = G.world, T = W.t;
    for (const z of W.waters || []) {
      if (z.x2 + 14 < V.x1 || z.x1 - 14 > V.x2 || z.y2 + 16 < V.y1 || z.y - 10 > V.y2) continue;
      const w = z.x2 - z.x1, h = z.y2 - z.y, fountain = z.kind === 'fuente';
      if (!front) {
        // Fondo y paredes de la poza (piedra), luego el cuerpo del agua con degradado.
        const stone = fountain ? '#8f7f86' : '#3f4a3a', stoneTop = fountain ? '#d9cfd4' : '#6f7d5c';
        if (z.deep) fillRect(z.x1 - 12, z.y2, w + 24, 10, stone);   // fondo sólido (mismo tamaño que en la física)
        for (const side of z.banks) {
          const bx = side === 'left' ? z.x1 - 12 : z.x2;
          fillRect(bx, z.y - 3, 12, h + 17, stone); fillRect(bx, z.y - 3, 12, 3, stoneTop);
        }
        let g = waterGrad.get(z);
        if (!g) {
          g = ctx.createLinearGradient(0, z.y, 0, z.y2);
          g.addColorStop(0, fountain ? 'rgba(96,190,214,0.55)' : 'rgba(58,150,178,0.62)');
          g.addColorStop(1, fountain ? 'rgba(40,110,150,0.78)' : 'rgba(10,46,72,0.9)');
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
      fillRect(z.x1, z.y + 3, w, h - 3, fountain ? '#4fb3d1' : '#1f6f93', fountain ? 0.22 : 0.3);
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
    if (P.dead) return P.water ? 'dead' : null;
    const a = SWIM_STATE[P.state];
    return a && S.anims[a] ? a : null;
  }

  function drawSwimPlayer(G, T, name, alpha) {
    const S = NS.ART.SWIM, A = S.anims[name], im = image(S.sheet);
    if (!ready(im)) return false;
    const P = G.P, n = A.frames.length;
    let ix;
    if (A.loop) ix = Math.floor(P.animT * A.fps) % n;
    else ix = Math.min(n - 1, Math.floor((name === 'dead' ? G.timers.dying : P.stateT) * A.fps));
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


  /* V54 · Usa los frames y pivotes del atlas submarino existente; mientras Sofía
     no está dentro del agua, se mantiene su traje también al correr y saltar. */
  const DIVE_SHEET = 'assets/player/sofia/sofia_submarina_complementaria.png';
  const DIVE_STATES = {
    idle: [0, 6, 210, 226], run: [12, 6, 82, 226], fastRun: [12, 6, 82, 226],
    climb: [6, 6, 115, 226], jump: [22, 5, 95, 226], fall: [27, 4, 115, 130],
    land: [31, 4, 88, 226], dash: [67, 5, 100, 130],
    kick: [94, 4, 130, 226], hurt: [77, 4, 90, 130],
    dead: [85, 5, 145, 130], cheer: [98, 5, 155, 226]
  };
  function drawDiver(G, alpha) {
    const P = G.P, im = image(DIVE_SHEET);
    if (!ready(im)) return false;
    const [first, count, ms, pivot] = DIVE_STATES[P.state] || DIVE_STATES.idle;
    const oneShot = ['jump', 'land', 'dash', 'kick', 'hurt', 'dead', 'cheer'].includes(P.state);
    const timer = Math.max(0, oneShot ? P.stateT : P.animT) * 1000;
    const idx = Math.floor(timer / ms);
    const frame = first + (oneShot ? Math.min(count - 1, idx) : idx % count);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(P.x, pivot === 130 ? P.y : P.y + P.h / 2);
    ctx.scale((P.face < 0 ? -1 : 1) * 0.4, 0.4);
    ctx.drawImage(im, (frame % 8) * 256, Math.floor(frame / 8) * 256, 256, 256, -128, -pivot, 256, 256);
    ctx.restore();
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
      ellipse(P.x, top + 2, 20 * k, 5.5 * k, '#000000', 0.12 + 0.18 * k);
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
    const swimA = swimAnimFor(P);
    if (swimA && drawSwimPlayer(G, T, swimA, alpha)) return;
    const currentScene = G.world && G.world.scenes[G.tramo];
    const suitTheme = currentScene && currentScene.theme;
    const outfit = suitTheme === 'submarino' ? 'buzo' : suitTheme === 'espacial' ? 'astronauta' : ropt.ninaLook;
    if (outfit === 'buzo' && drawDiver(G, alpha)) return;
    let yOff = 0;
    if (P.dead) { const t = Math.min(1, G.timers.dying / 0.9); yOff = -Math.sin(t * Math.PI) * 42; }
    const state = P.state, list = NINA[state] || NINA.idle;
    let ix;
    // Estados de "una sola pasada" usan el tiempo dentro del estado; los ciclos, el reloj de animación.
    if (state === 'kick') ix = Math.min(list.length - 1, Math.floor((0.22 - P.kickT) / 0.22 * list.length));
    else if (state === 'land' || state === 'hurt' || state === 'dash' || state === 'jump' || state === 'fall') ix = 0;
    else if (state === 'dead') ix = 0;
    else ix = Math.floor(P.animT * 1000 / (FRAME_MS[state] || 100)) % list.length;
    const name = list[Math.max(0, Math.min(list.length - 1, ix))];
    const im = image(ninaSrc(name));
    const meta = (NS.ART && NS.ART.SOFIA[name]) || [1, 96, 218];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(P.x, foot + yOff);
    let rot;
    if (P.dead) rot = (P.face || 1) * Math.min(1.35, G.timers.dying * 1.9);
    else if (state === 'dash') rot = 0;
    else if (state === 'hurt') rot = -(P.face || 1) * 0.22;
    else if (state === 'jump') rot = -(P.face || 1) * 0.06;
    else if (state === 'fall') rot = (P.face || 1) * Math.min(0.12, Math.max(0, P.vy) / 4000);
    else if (state === 'kick') rot = (P.face || 1) * -0.03;
    else rot = Math.max(-1, Math.min(1, P.vx / NS.CONFIG.phys.move)) * 0.05;
    ctx.rotate(rot);
    if (ready(im)) {
      const sc = SOFIA_BASE / meta[0];
      // Respiración sutil en reposo y aplastado breve al aterrizar.
      const breathe = state === 'idle' ? Math.sin(T * 2.6) * 0.012 : 0;
      const land = state === 'land' ? 0.05 * Math.max(0, 1 - P.stateT / 0.16) : 0;
      ctx.scale((P.face < 0 ? -1 : 1) * sc * (1 + land - breathe * 0.4), sc * (1 - land + breathe));
      ctx.drawImage(im, -meta[1], -meta[2]);
      if (state === 'hurt' && P.hurtT > 0.25) {
        // Destello rojo al recibir daño: solo la silueta de Sofía.
        const sil = silhouette(im, '#ff4040');
        if (sil) { ctx.globalAlpha = alpha * 0.5; ctx.drawImage(sil, -meta[1], -meta[2]); }
      }
    } else {
      fillRR(-8, -39, 16, 23, 5, '#2aa6ae'); circle(0, -51, 7, '#e9b98d');
      fillRR(-7, -17, 5, 16, 2, '#172432'); fillRR(2, -17, 5, 16, 2, '#172432'); fillRect(-7, -35, 14, 3, '#d9ff65');
    }
    ctx.restore();
    if (outfit === 'astronauta') drawAstronautGear(P, alpha);
    if (P.dashT > 0) for (let i = 1; i <= 3; i++) line(P.x - P.face * (14 + i * 9), P.y - 10 + i * 6, P.x - P.face * (30 + i * 9), P.y - 10 + i * 6, '#4ce7ee', 0.5, 2);
    if (P.kickT > 0) { const k = P.kickT / 0.22; line(P.x + P.face * 16, P.y - 9, P.x + P.face * 58, P.y - 9, '#ffd35a', 0.35 * k, 3); ring(P.x + P.face * 58, P.y - 9, 9, 9, '#ffe9a8', 0.5 * k, 2); }
  }

  function drawCinematic(G, T) {
    if (G.state !== 'victory') return;
    const p = Math.max(0, Math.min(1, G.timers.victory / 2.4));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    fillRect(0, 0, cw, Math.max(28, ch * 0.09), '#050a10', 0.92);
    fillRect(0, ch - Math.max(28, ch * 0.09), cw, Math.max(28, ch * 0.09), '#050a10', 0.92);
    text(p < 0.38 ? '¡LUNA, MORITA, SUBAN!' : p < 0.72 ? 'EL MOTOR ARRANCA…' : 'RUTA 6 · A CASA', cw / 2, ch * 0.14, Math.max(12, Math.min(22, cw * 0.035)), '#ffe9a8');
  }

  function drawParticles(G, V) {
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
  function draw(G, T) {
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
    if (!G.room) { drawBackdrop(G, V); drawScenes(G, V); drawNeighborhood(G, V, T); drawStreet(G, V, T); }
    for (const r of W.rooms) drawRoomBackground(r, V);
    drawWaters(G, V, false);
    drawSolids(G, V);
    drawPlatforms(G, V);
    drawDoors(G, V, T);
    drawCheckpoints(G, V, T);
    drawSigns(G, V);
    drawHazards(G, V, T);
    drawPickups(G, V, T);
    drawFoes(G, V, T);
    drawCompanions(G, T);
    drawPlayer(G, T);
    drawWaters(G, V, true);
    drawWaterFx(G, V);
    drawParticles(G, V);
    if (debug) drawDebug(G);
    if (G.transition) {
      const tr = G.transition, a = 1 - Math.abs(tr.t / tr.dur - 0.45) / 0.45;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      fillRect(0, 0, cw, ch, '#050a10', Math.max(0, Math.min(1, a * 1.15)));
    }
    drawCinematic(G, T);
  }

  NS.Render = { init, resize, draw, preload, setQuality, setOptions, image, ready, NINA, NINA_DIR, NINA_VARIANT_DIR, COMPANIONS, COMPANIONS_SUB, PAINTERS, toggleDebug: () => (debug = !debug), get debug() { return debug; } };
})(typeof globalThis !== 'undefined' ? globalThis : window);
