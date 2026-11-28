/* ¡Se me fue el camión! — dibujo de la MISIÓN ESPECIAL · LA CALZADA.
   Vista lateral 2.5D de tres carriles sobre el mismo <canvas> del juego. El camión es el arte real de la Ruta 6
   (assets/vehicles); los fondos, las capas nocturnas de Guadalajara (assets/parallax/guadalajara). Patrullas,
   camionetas, motos, el tráiler y los objetos del camino se dibujan con primitivas: no dependen de arte nuevo.
   Efectos de película: cámara lenta con franjas de cine, explosiones, chispas, humo, nitro, líneas de velocidad,
   destellos y temblor de cámara (respeta la opción TEMBLOR). */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};
  const BUS = 'assets/vehicles/camion_frame_02.png';
  const BUS_BOX = { x: 44, y: 72, w: 458, h: 194 };   // píxeles opacos del camión (sin la nube de escape ni la sombra suave)
  const LUNA = 'assets/companions/luna.png', MORITA = 'assets/companions/morita.png';
  const SOFIA = 'assets/player/sofia/idle_01.png';
  const PAR = 'assets/parallax/guadalajara/';
  const SETS = { barrios: 'barrios_inferiores', mercado: 'mercado_parque', azoteas: 'azoteas' };
  const LAYERS = [['00_cielo_degradado', 0.02], ['01_nubes_reales', 0.05], ['02_arquitectura_anclada', 0.16], ['03_reflejos_luces', 0.22], ['04_bruma_frontal', 0.34]];
  const SECTION_SET = ['barrios', 'barrios', 'mercado', 'azoteas', 'azoteas'];
  const urls = () => {
    const out = [BUS, LUNA, MORITA, SOFIA];
    for (const k of Object.values(SETS)) for (const [f] of LAYERS) out.push(PAR + k + '/' + f + '.webp');
    return out;
  };

  let canvas = null, ctx = null, shakeMul = 1, camY = 0, lastT = 0;
  const R = () => NS.Render;
  const img = (src) => R().image(src);
  const ok = (im) => R().ready(im);
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const CIVIL_COLORS = ['#c23b3b', '#3a6fc4', '#e4e4e4', '#7b4fb3', '#2f8f6a', '#d98a2b', '#6b6f78'];

  function init(el) { canvas = el; ctx = canvas.getContext('2d'); }
  function setOptions(o) { if (o && o.shake != null) shakeMul = o.shake; }

  /* ---------- Geometría de pantalla ---------- */
  function layout(S) {
    const W = canvas.clientWidth || root.innerWidth, H = canvas.clientHeight || root.innerHeight;
    const dpr = canvas.width / Math.max(1, W);
    const portrait = W < H * 0.9;
    // En horizontal la calzada va alta para que los botones táctiles (abajo a la derecha) no tapen lo que viene.
    const k = W / (portrait ? 640 : 1250);
    const far = H * (portrait ? 0.36 : 0.34), near = H * (portrait ? 0.64 : 0.70);
    const laneY = (ly) => far + (near - far) * (0.2 + 0.3 * ly);
    const laneS = (ly) => 0.84 + 0.08 * ly;
    const anchor = W * (portrait ? 0.24 : 0.22);
    const sx = (x) => anchor + (x - (S.cam.x + 150)) * k;
    return { W, H, dpr, portrait, k, far, near, laneY, laneS, sx, x1: S.cam.x + 150 - anchor / k - 300, x2: S.cam.x + 150 + (W - anchor) / k + 300 };
  }

  /* ---------- Fondo ---------- */
  function drawLayerSet(set, L, camx, alpha) {
    if (alpha <= 0.01) return;
    const hB = L.far + 24;
    ctx.globalAlpha = alpha;
    for (const [f, par] of LAYERS) {
      const im = img(PAR + SETS[set] + '/' + f + '.webp');
      if (!ok(im)) continue;
      const sc = hB / im.naturalHeight, tw = im.naturalWidth * sc;
      let off = -((camx * L.k * par) % tw); if (off > 0) off -= tw;
      for (let x = off; x < L.W; x += tw) ctx.drawImage(im, x, 0, tw + 1, hB);
    }
    ctx.globalAlpha = 1;
  }
  function backdrop(S, L) {
    const g = ctx.createLinearGradient(0, 0, 0, L.far);
    g.addColorStop(0, '#0b1230'); g.addColorStop(1, '#3a2346');
    ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, L.far + 30);
    const sec = S.section, SEC = NS.Chase.SECTIONS;
    const cur = SECTION_SET[sec], prev = SECTION_SET[Math.max(0, sec - 1)];
    const into = sec > 0 ? (S.P.x - SEC[sec].x) / 900 : 1;
    if (prev !== cur && into < 1) drawLayerSet(prev, L, S.cam.x, 1);
    drawLayerSet(cur, L, S.cam.x, prev !== cur ? Math.max(0, Math.min(1, into)) : 1);
    // Velo nocturno para que el camino y los vehículos resalten.
    ctx.fillStyle = 'rgba(8,10,28,0.28)'; ctx.fillRect(0, 0, L.W, L.far + 30);
  }

  /* ---------- Calzada ---------- */
  function road(S, L, T) {
    const { W, H, far, near, k } = L;
    // Banqueta lejana con barda baja y postes de luz.
    ctx.fillStyle = '#4a4a56'; ctx.fillRect(0, far - 16 * k, W, 16 * k);
    ctx.fillStyle = '#6d6d7a'; ctx.fillRect(0, far - 3 * k, W, 3 * k);
    const asphalt = ctx.createLinearGradient(0, far, 0, near);
    asphalt.addColorStop(0, '#23242c'); asphalt.addColorStop(1, '#30313b');
    ctx.fillStyle = asphalt; ctx.fillRect(0, far, W, near - far);
    // Banqueta cercana y lo que queda de pantalla abajo.
    ctx.fillStyle = '#5b5b66'; ctx.fillRect(0, near, W, 14 * k);
    ctx.fillStyle = '#7c7c88'; ctx.fillRect(0, near, W, 3 * k);
    // Primer plano: terreno y barrera de contención con postes que pasan más rápido que el camino (profundidad).
    // Nada del primer plano sube sobre los carriles: no tapa el juego.
    const fg = ctx.createLinearGradient(0, near + 14 * k, 0, H);
    fg.addColorStop(0, '#1b1c25'); fg.addColorStop(1, '#0c0d12');
    ctx.fillStyle = fg; ctx.fillRect(0, near + 14 * k, W, H * 2);
    const rail = near + 34 * k;
    ctx.fillStyle = '#8b95a3'; ctx.fillRect(0, rail, W, 7 * k);
    ctx.fillStyle = '#5d6672'; ctx.fillRect(0, rail + 7 * k, W, 3 * k);
    const par = 1.3, step = 240, base = (S.cam.x + 150) * par;
    for (let x = Math.floor((L.x1 * par) / step) * step; x < L.x2 * par + step; x += step) {
      const sxp = (W * (L.portrait ? 0.24 : 0.22)) + (x - base) * k;
      if (sxp < -20 || sxp > W + 20) continue;
      ctx.fillStyle = '#3c424b'; ctx.fillRect(sxp - 3 * k, rail - 4 * k, 6 * k, 30 * k);
    }
    // Líneas de carril.
    ctx.fillStyle = 'rgba(240,240,220,0.75)';
    const dash = 90, gapW = 70, per = dash + gapW;
    for (const b of [0.35, 0.65]) {
      const y = far + (near - far) * b;
      const start = Math.floor(L.x1 / per) * per;
      for (let x = start; x < L.x2; x += per) ctx.fillRect(L.sx(x), y - 1.5 * k, dash * k, 3 * k);
    }
    // Postes de luz con su cono.
    const pole = 620, s0 = Math.floor(L.x1 / pole) * pole;
    for (let x = s0; x < L.x2; x += pole) {
      const px = L.sx(x), top = far - 150 * k;
      ctx.fillStyle = '#2c2c36'; ctx.fillRect(px - 2.5 * k, top, 5 * k, 150 * k);
      ctx.fillRect(px, top, 26 * k, 4 * k);
      const cone = ctx.createRadialGradient(px + 24 * k, top + 6 * k, 2, px + 24 * k, far + 40 * k, 120 * k);
      cone.addColorStop(0, 'rgba(255,214,140,0.42)'); cone.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(px + 18 * k, top + 6 * k); ctx.lineTo(px + 30 * k, top + 6 * k); ctx.lineTo(px + 110 * k, near); ctx.lineTo(px - 60 * k, near); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffe3a8'; ctx.beginPath(); ctx.arc(px + 24 * k, top + 6 * k, 4 * k, 0, 7); ctx.fill();
    }
    // Zanjas de la obra y la barranca final.
    for (const g of S.course.gaps) {
      if (g.x2 < L.x1 || g.x1 > L.x2) continue;
      const a = L.sx(g.x1), b = L.sx(g.x2);
      if (g.finale) {
        // Barranca: paredes de roca y, abajo, el agua de la presa (a WATER_Z bajo la calzada).
        const wy = L.laneY(2) + 26 * k + (-S.WATER_Z) * k * 0.55;
        const sky = ctx.createLinearGradient(0, far - 16 * k, 0, wy);
        sky.addColorStop(0, '#1b2140'); sky.addColorStop(0.6, '#13203a'); sky.addColorStop(1, '#0c2a3e');
        ctx.fillStyle = sky; ctx.fillRect(a, far - 16 * k, Math.max(0, b - a + W), wy - far + 16 * k);
        ctx.fillStyle = '#2a2230'; ctx.beginPath(); ctx.moveTo(a, far); ctx.lineTo(a + 60 * k, wy); ctx.lineTo(a, wy); ctx.closePath(); ctx.fill();
        const wg = ctx.createLinearGradient(0, wy, 0, wy + H);
        wg.addColorStop(0, '#1f6f8c'); wg.addColorStop(0.2, '#0f4a63'); wg.addColorStop(1, '#06202c');
        ctx.fillStyle = wg; ctx.fillRect(a, wy, Math.max(0, b - a + W), H * 2);
        ctx.strokeStyle = 'rgba(170,230,255,0.35)'; ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) { const yy = wy + 8 + i * 9 * k, sh = (T * 40 + i * 37) % 140; ctx.beginPath(); ctx.moveTo(a + sh, yy); ctx.lineTo(a + sh + 50 * k, yy); ctx.stroke(); }
        // Borde del puente roto.
        ctx.fillStyle = '#3b3b46'; ctx.fillRect(a - 10 * k, far - 16 * k, 10 * k, near - far + 30 * k);
        ctx.fillStyle = '#b8873a'; for (let i = 0; i < 6; i++) ctx.fillRect(a - 4 * k, far + i * (near - far) / 6, 18 * k, 3 * k);
        continue;
      }
      const trench = ctx.createLinearGradient(0, far, 0, near + 14 * k);
      trench.addColorStop(0, '#0d0a08'); trench.addColorStop(1, '#2a1b10');
      ctx.fillStyle = trench; ctx.fillRect(a, far - 2, b - a, near - far + 16 * k);
      // Varilla y cinta de precaución en los bordes.
      ctx.strokeStyle = '#7d5a3a'; ctx.lineWidth = 2 * k;
      for (let x = a + 12 * k; x < b - 6; x += 22 * k) { ctx.beginPath(); ctx.moveTo(x, near + 10 * k); ctx.lineTo(x + 6 * k, far + 20 * k); ctx.stroke(); }
      for (const e of [a, b]) stripes(e - 4 * k, far - 18 * k, 8 * k, near - far + 34 * k);
    }
  }
  function stripes(x, y, w, h) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#f2c230'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#1a1a1a';
    for (let yy = y - w; yy < y + h; yy += w * 2) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy + w); ctx.lineTo(x + w, yy + 2 * w); ctx.lineTo(x, yy + w); ctx.fill(); }
    ctx.restore();
  }

  /* ---------- Objetos del camino ---------- */
  function drawStatic(s, L, T) {
    if (s.kind === 'sign') {
      const x = L.sx(s.x), y = L.far - 16 * L.k, k = L.k;
      ctx.fillStyle = '#2c2c36'; ctx.fillRect(x - 3 * k, y - 120 * k, 6 * k, 120 * k);
      ctx.fillStyle = '#f2c230'; ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3 * k;
      rr(x - 70 * k, y - 150 * k, 140 * k, 62 * k, 6 * k); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1a1a'; ctx.font = '900 ' + Math.round(13 * k) + 'px system-ui,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('OBRA · RAMPA', x, y - 130 * k);
      ctx.font = '900 ' + Math.round(16 * k) + 'px system-ui,sans-serif';
      ctx.fillText(s.ramps.map((l) => ['↑ ARRIBA', '→ CENTRO', '↓ ABAJO'][l]).join('  '), x, y - 106 * k);
      ctx.textAlign = 'left';
      return;
    }
    if (s.got && s.kind !== 'cone' && s.kind !== 'barrier') return;
    if (s.got) return;
    const sc = L.laneS(s.lane), k = L.k * sc, x = L.sx(s.x), y = L.laneY(s.lane) + 26 * L.k * sc - (s.z || 0) * L.k * 0.55;
    switch (s.kind) {
      case 'ramp': {
        const len = (s.big ? 190 : 130) * k, hh = (s.big ? 46 : 30) * k;
        ctx.fillStyle = '#1b1b1b';
        ctx.beginPath(); ctx.moveTo(x - len / 2, y); ctx.lineTo(x + len / 2, y - hh); ctx.lineTo(x + len / 2, y); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.moveTo(x - len / 2, y); ctx.lineTo(x + len / 2, y - hh); ctx.lineTo(x + len / 2, y - hh + 8 * k); ctx.lineTo(x - len / 2 + 14 * k, y); ctx.closePath(); ctx.clip();
        ctx.fillStyle = '#f2c230'; ctx.fillRect(x - len / 2, y - hh, len, hh);
        ctx.fillStyle = '#1a1a1a'; for (let i = -2; i < 10; i++) ctx.fillRect(x - len / 2 + i * 22 * k, y - hh, 10 * k, hh);
        ctx.restore();
        // Flechas que invitan a subir.
        const pulse = 0.5 + 0.5 * Math.sin(T * 8);
        ctx.fillStyle = 'rgba(255,240,140,' + (0.45 + pulse * 0.45) + ')';
        for (let i = 0; i < 3; i++) { const ax = x - len / 2 - (40 + i * 26) * k; chevron(ax, y - 6 * k, 9 * k); }
        break;
      }
      case 'cone':
        ctx.fillStyle = '#ff7a2f'; ctx.beginPath(); ctx.moveTo(x - 9 * k, y); ctx.lineTo(x, y - 28 * k); ctx.lineTo(x + 9 * k, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 5 * k, y - 16 * k, 10 * k, 4 * k);
        ctx.fillStyle = '#c0581e'; ctx.fillRect(x - 12 * k, y - 3 * k, 24 * k, 3 * k);
        break;
      case 'barrier':
        ctx.fillStyle = '#2b2b2b'; ctx.fillRect(x - 30 * k, y - 10 * k, 4 * k, 10 * k); ctx.fillRect(x + 26 * k, y - 10 * k, 4 * k, 10 * k);
        stripes(x - 34 * k, y - 34 * k, 68 * k, 22 * k);
        ctx.fillStyle = (Math.floor(T * 3) % 2) ? '#ffb02e' : '#7a4a10'; ctx.beginPath(); ctx.arc(x, y - 40 * k, 5 * k, 0, 7); ctx.fill();
        break;
      case 'oil': {
        const g = ctx.createRadialGradient(x, y - 3 * k, 2, x, y - 3 * k, 46 * k);
        g.addColorStop(0, 'rgba(70,40,120,0.9)'); g.addColorStop(0.5, 'rgba(20,60,70,0.85)'); g.addColorStop(1, 'rgba(5,5,10,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - 3 * k, 52 * k, 10 * k, 0, 0, 7); ctx.fill();
        break;
      }
      case 'nitro': {
        const bob = Math.sin(T * 5 + s.x) * 4 * k;
        glow(x, y - 30 * k + bob, 30 * k, 'rgba(90,220,255,0.55)');
        ctx.fillStyle = '#1f7fd6'; rr(x - 10 * k, y - 46 * k + bob, 20 * k, 32 * k, 4 * k); ctx.fill();
        ctx.fillStyle = '#bff4ff'; ctx.font = '900 ' + Math.round(18 * k) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⚡', x, y - 23 * k + bob); ctx.textAlign = 'left';
        break;
      }
      case 'repair': {
        const bob = Math.sin(T * 5 + s.x) * 4 * k;
        glow(x, y - 30 * k + bob, 30 * k, 'rgba(120,255,140,0.5)');
        ctx.fillStyle = '#2f9f4a'; ctx.beginPath(); ctx.arc(x, y - 30 * k + bob, 15 * k, 0, 7); ctx.fill();
        ctx.fillStyle = '#eaffef'; ctx.fillRect(x - 3 * k, y - 40 * k + bob, 6 * k, 20 * k); ctx.fillRect(x - 10 * k, y - 33 * k + bob, 20 * k, 6 * k);
        break;
      }
      case 'gem': {
        const bob = Math.sin(T * 6 + s.x) * 4 * k, gy = y - 30 * k + bob;
        glow(x, gy, 24 * k, 'rgba(255,120,220,0.5)');
        ctx.fillStyle = '#ff6fd2'; ctx.beginPath(); ctx.moveTo(x, gy - 12 * k); ctx.lineTo(x + 9 * k, gy); ctx.lineTo(x, gy + 12 * k); ctx.lineTo(x - 9 * k, gy); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd6f4'; ctx.fillRect(x - 2 * k, gy - 8 * k, 3 * k, 6 * k);
        break;
      }
      default: break;
    }
  }
  function chevron(x, y, s) { ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s * 0.4, y); ctx.lineTo(x - s, y + s); ctx.lineTo(x - s * 0.4, y); ctx.closePath(); ctx.fill(); }
  function glow(x, y, r, c) { const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
  function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }

  /* ---------- Vehículos ---------- */
  function wheel(x, y, r, T, v) {
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#8b8f98'; ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3b3e45'; ctx.lineWidth = Math.max(1, r * 0.14);
    const a = (T * v / Math.max(8, r * 6)) % (Math.PI * 2);
    for (let i = 0; i < 3; i++) { const q = a + i * 2.094; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(q) * r * 0.55, y + Math.sin(q) * r * 0.55); ctx.stroke(); }
  }
  function car(f, L, T, S) {
    const K = NS.Chase.KIND[f.kind], sc = L.laneS(f.ly), k = L.k * sc;
    const len = K.len * k, h = K.h * k;
    const x = L.sx(f.x), ground = L.laneY(f.ly) + 26 * L.k * sc;
    shadow(x, ground, len * 0.55, 8 * k);
    ctx.save();
    ctx.translate(x, ground);
    if (f.dead) { ctx.rotate(Math.sin(f.spin) * 0.35); }
    if (f.kind === 'moto') { moto(f, k, T); ctx.restore(); return; }
    if (f.kind === 'truck') { truck(f, k, len, h, T, S); ctx.restore(); return; }
    const civilColor = CIVIL_COLORS[hash(String(f.id)) % CIVIL_COLORS.length];
    const body = f.kind === 'patrol' ? '#f1f3f7' : f.kind === 'suv' ? '#15161b' : f.kind === 'taxi' ? '#f4d23a' : f.kind === 'vocho' ? '#7fc243' : civilColor;
    const low = f.kind === 'patrol' ? '#1b2b5e' : f.kind === 'suv' ? '#0a0b0e' : shade(body, -0.25);
    const wr = 12 * k * (f.kind === 'suv' ? 1.2 : 1);
    // Carrocería baja y cabina.
    ctx.fillStyle = low; rr(-len / 2, -h * 0.55, len, h * 0.42, 6 * k); ctx.fill();
    ctx.fillStyle = body; rr(-len / 2, -h * 0.62, len, h * 0.3, 7 * k); ctx.fill();
    const cab = f.kind === 'vocho' ? [-len * 0.3, len * 0.55] : f.kind === 'suv' ? [-len * 0.42, len * 0.72] : [-len * 0.28, len * 0.56];
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(cab[0], -h * 0.6); ctx.lineTo(cab[0] + len * 0.08, -h); ctx.lineTo(cab[0] + cab[1] - len * 0.12, -h); ctx.lineTo(cab[0] + cab[1], -h * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = f.kind === 'suv' ? '#2a3a3a' : '#9fd0ef';
    ctx.beginPath(); ctx.moveTo(cab[0] + len * 0.05, -h * 0.64); ctx.lineTo(cab[0] + len * 0.11, -h * 0.94); ctx.lineTo(cab[0] + cab[1] - len * 0.14, -h * 0.94); ctx.lineTo(cab[0] + cab[1] - len * 0.05, -h * 0.64); ctx.closePath(); ctx.fill();
    ctx.fillStyle = body; ctx.fillRect(cab[0] + cab[1] * 0.48, -h * 0.98, 4 * k, h * 0.36);
    // Faros y calaveras.
    ctx.fillStyle = '#fff6c8'; ctx.fillRect(len / 2 - 6 * k, -h * 0.5, 6 * k, 5 * k);
    ctx.fillStyle = '#e0262c'; ctx.fillRect(-len / 2, -h * 0.5, 5 * k, 5 * k);
    glow(len / 2 + 20 * k, -h * 0.46, 40 * k, 'rgba(255,240,190,0.25)');
    if (f.kind === 'patrol') {
      ctx.fillStyle = '#1b2b5e'; ctx.font = '900 ' + Math.round(11 * k) + 'px system-ui,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('PATRULLA', 0, -h * 0.38); ctx.textAlign = 'left';
      const on = Math.floor(T * 8) % 2;
      ctx.fillStyle = on ? '#ff2b3b' : '#2b6bff'; ctx.fillRect(-14 * k, -h - 6 * k, 12 * k, 6 * k);
      ctx.fillStyle = on ? '#2b6bff' : '#ff2b3b'; ctx.fillRect(2 * k, -h - 6 * k, 12 * k, 6 * k);
      glow(-8 * k, -h - 3 * k, 46 * k, on ? 'rgba(255,40,60,0.5)' : 'rgba(40,100,255,0.5)');
      glow(8 * k, -h - 3 * k, 46 * k, on ? 'rgba(40,100,255,0.5)' : 'rgba(255,40,60,0.5)');
    }
    if (f.kind === 'suv') {
      ctx.fillStyle = '#7dff6a'; ctx.font = '900 ' + Math.round(16 * k) + 'px system-ui,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Z', -len * 0.05, -h * 0.34); ctx.textAlign = 'left';
      if (f.state === 'tele') { ctx.fillStyle = '#a66a3a'; ctx.beginPath(); ctx.ellipse(-len / 2 - 8 * k, -h * 0.75, 10 * k, 12 * k, 0, 0, 7); ctx.fill(); }
    }
    if (f.kind === 'taxi') { ctx.fillStyle = '#111'; ctx.fillRect(-8 * k, -h - 6 * k, 16 * k, 6 * k); }
    wheel(-len * 0.3, -wr * 0.95, wr, T, f.v); wheel(len * 0.3, -wr * 0.95, wr, T, f.v);
    if (f.dead) smoke(0, -h, k, T, f.x);
    ctx.restore();
    if (!f.dead && !f.civil) telegraph(f, L, T, x, ground - h - 10 * k, k);
    if (!f.dead && f.state === 'stunned') stars(x, ground - h - 14 * k, k, T);
  }
  function moto(f, k, T) {
    wheel(-24 * k, -11 * k, 11 * k, T, f.v); wheel(24 * k, -11 * k, 11 * k, T, f.v);
    ctx.fillStyle = '#2d2d33'; ctx.beginPath(); ctx.moveTo(-26 * k, -14 * k); ctx.lineTo(20 * k, -14 * k); ctx.lineTo(28 * k, -26 * k); ctx.lineTo(-10 * k, -26 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7dff6a'; ctx.fillRect(-6 * k, -26 * k, 18 * k, 4 * k);
    // Motociclista de Los Zopilotes.
    ctx.fillStyle = '#18181c'; rr(-12 * k, -52 * k, 16 * k, 28 * k, 5 * k); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-2 * k, -58 * k, 9 * k, 0, 7); ctx.fill();
    ctx.fillStyle = '#7dff6a'; ctx.fillRect(1 * k, -61 * k, 8 * k, 4 * k);
    ctx.strokeStyle = '#18181c'; ctx.lineWidth = 4 * k; ctx.beginPath(); ctx.moveTo(2 * k, -44 * k); ctx.lineTo(20 * k, -32 * k); ctx.stroke();
    if (f.dead) smoke(0, -30 * k, k, T, f.x);
  }
  function truck(b, k, len, h, T, S) {
    // Tractocamión a la derecha, caja blindada a la izquierda con puertas traseras que se abren.
    const cabW = 80 * k, boxW = len - cabW - 6 * k;
    const boxX = -len / 2, cabX = len / 2 - cabW;
    ctx.fillStyle = '#1d2a20'; rr(boxX, -h, boxW, h * 0.86, 5 * k); ctx.fill();
    ctx.fillStyle = '#2b3d2f'; for (let i = 0; i < 6; i++) ctx.fillRect(boxX + 8 * k + i * boxW / 6, -h + 6 * k, boxW / 6 - 10 * k, h * 0.74);
    ctx.fillStyle = '#7dff6a'; ctx.font = '900 ' + Math.round(20 * k) + 'px system-ui,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('LOS ZOPILOTES', boxX + boxW / 2, -h * 0.55);
    ctx.font = '800 ' + Math.round(10 * k) + 'px system-ui,sans-serif'; ctx.fillStyle = '#b9f7ae';
    ctx.fillText('TRANSPORTES BLINDADOS', boxX + boxW / 2, -h * 0.4); ctx.textAlign = 'left';
    // Puertas traseras (izquierda).
    const open = b.doors || 0;
    ctx.fillStyle = '#0a0d0a'; ctx.fillRect(boxX, -h + 4 * k, 6 * k + open * 20 * k, h * 0.78);
    if (open > 0.05) {
      ctx.fillStyle = '#8a5a2b'; for (let i = 0; i < 3; i++) ctx.fillRect(boxX + 6 * k, -h * 0.3 - i * 22 * k, 20 * k * open, 18 * k);
      ctx.fillStyle = '#3e5a40';
      ctx.save(); ctx.translate(boxX, -h + 4 * k); ctx.scale(1 - open * 0.85, 1); ctx.fillRect(-24 * k, 0, 24 * k, h * 0.78); ctx.restore();
      const pulse = 0.5 + 0.5 * Math.sin(T * 12);
      glow(boxX, -h * 0.5, 70 * k, 'rgba(255,220,80,' + (0.25 + pulse * 0.35) + ')');
    }
    // Cabina.
    ctx.fillStyle = '#2b2f36'; rr(cabX, -h * 0.92, cabW, h * 0.78, 8 * k); ctx.fill();
    ctx.fillStyle = '#3b4a5a'; ctx.fillRect(cabX + cabW * 0.45, -h * 0.84, cabW * 0.45, h * 0.26);
    ctx.fillStyle = '#5a5e66'; ctx.fillRect(cabX + 6 * k, -h * 1.12, 6 * k, h * 0.3);
    ctx.fillStyle = '#fff6c8'; ctx.fillRect(cabX + cabW - 6 * k, -h * 0.34, 6 * k, 8 * k);
    for (const wx of [boxX + 30 * k, boxX + 70 * k, boxX + boxW - 60 * k, cabX + 20 * k, cabX + cabW - 18 * k]) wheel(wx, -15 * k, 15 * k, T, b.v);
    // Humo negro y fuego cuando le queda poca vida.
    if (b.hp <= b.maxHp / 2 || b.dead) smoke(boxX + boxW * 0.3, -h, k * 1.4, T, b.x);
    if (b.dead) { glow(0, -h * 0.5, 160 * k, 'rgba(255,140,40,0.55)'); }
    if (S && !b.dead) telegraph(b, null, T, 0, -h - 18 * k, k, true);
  }
  function smoke(x, y, k, T, seed) {
    for (let i = 0; i < 5; i++) {
      const p = ((T * 0.9 + i * 0.2 + (seed % 7) * 0.05) % 1);
      ctx.fillStyle = 'rgba(40,40,44,' + (0.5 * (1 - p)) + ')';
      ctx.beginPath(); ctx.arc(x - p * 60 * k, y - p * 70 * k, (8 + p * 22) * k, 0, 7); ctx.fill();
    }
  }
  function stars(x, y, k, T) {
    ctx.fillStyle = '#ffe36b'; ctx.font = Math.round(14 * k) + 'px system-ui,sans-serif'; ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) { const a = T * 6 + i * 2.1; ctx.fillText('★', x + Math.cos(a) * 18 * k, y + Math.sin(a) * 5 * k); }
    ctx.textAlign = 'left';
  }
  function telegraph(f, L, T, x, y, k, inTruck) {
    if (f.state !== 'tele' && f.state !== 'ram') return;
    const on = Math.floor(T * 10) % 2;
    ctx.save();
    if (inTruck) ctx.setTransform(ctx.getTransform());
    ctx.fillStyle = on ? '#ff3b3b' : '#ffd23a';
    ctx.font = '900 ' + Math.round(26 * k) + 'px system-ui,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('!', x, y);
    ctx.restore();
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r * (1 + amt)))); g = Math.max(0, Math.min(255, Math.round(g * (1 + amt)))); b = Math.max(0, Math.min(255, Math.round(b * (1 + amt))));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  function shadow(x, y, rx, ry) { ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }

  function bus(S, L, T) {
    const P = S.P, sc = L.laneS(P.ly), k = L.k * sc;
    const len = NS.Chase.TUNE.busLen * k, im = img(BUS);
    const h = len * BUS_BOX.h / BUS_BOX.w;
    const x = L.sx(P.x), ground = L.laneY(P.ly) + 26 * L.k * sc;
    const y = ground - P.z * L.k * 0.55;
    shadow(x, ground, len * (0.5 - Math.min(0.25, P.z / 1600)), 10 * k * (1 - Math.min(0.6, P.z / 800)));
    // Nitro: llamarada por el escape trasero y estela.
    if (P.boostT > 0) {
      for (let i = 0; i < 3; i++) {
        const fl = 40 + Math.sin(T * 40 + i) * 12;
        const g = ctx.createLinearGradient(x - len / 2, 0, x - len / 2 - fl * k * 2, 0);
        g.addColorStop(0, 'rgba(120,220,255,0.95)'); g.addColorStop(0.4, 'rgba(255,170,60,0.8)'); g.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x - len / 2 - fl * k, y - h * 0.2 - i * 6 * k, fl * k, (9 - i * 2) * k, 0, 0, 7); ctx.fill();
      }
    }
    const blink = P.invT > 0 && Math.floor(T * 14) % 2 === 0;
    ctx.save();
    ctx.translate(x, y);
    const pitch = P.air ? Math.max(-0.22, Math.min(0.28, -P.vz / 2600)) : 0;
    ctx.rotate(pitch + P.tilt * 0.5);
    const bob = P.air ? 0 : Math.sin(T * 22) * 0.8 * k;
    if (blink) ctx.globalAlpha = 0.45;
    if (ok(im)) ctx.drawImage(im, BUS_BOX.x, BUS_BOX.y, BUS_BOX.w, BUS_BOX.h, -len / 2, -h + bob, len, h);
    else { ctx.fillStyle = '#f2b51f'; rr(-len / 2, -h, len, h * 0.9, 10 * k); ctx.fill(); }
    // Luna y Morita asomadas por las ventanas.
    const lu = img(LUNA), mo = img(MORITA);
    // Luna y Morita van sentadas en el techo, agarradas del portaequipaje.
    const cs = 38 * k;
    if (ok(lu) && !(S.cats.t > 0)) ctx.drawImage(lu, -len * 0.08, -h - cs * 0.86 + bob, cs, cs);
    if (ok(mo)) ctx.drawImage(mo, -len * 0.3, -h - cs * 0.86 + bob, cs, cs);
    ctx.globalAlpha = 1;
    if (P.hurtT > 0) { ctx.fillStyle = 'rgba(255,40,40,' + (P.hurtT * 0.8) + ')'; rr(-len / 2, -h, len, h * 0.92, 8 * k); ctx.fill(); }
    ctx.restore();
    // Embestida: ondas de choque al costado.
    if (P.ramT > 0) {
      const a = P.ramT / NS.Chase.TUNE.ramTime;
      ctx.strokeStyle = 'rgba(255,230,140,' + a + ')'; ctx.lineWidth = 3 * k;
      const yy = y - h * 0.4 + P.ramDir * 30 * k;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, yy, (30 + i * 16 + (1 - a) * 30) * k, P.ramDir > 0 ? 0.3 : 3.4, P.ramDir > 0 ? 2.8 : 6.0); ctx.stroke(); }
    }
    // Gatas al ataque: Luna vuela en arco hasta el objetivo.
    if (S.cats.t > 0 && S.cats.target && ok(lu)) {
      const tg = S.cats.target, p = 1 - S.cats.t / 0.55;
      const x0 = x, y0 = y - h * 0.8, x1 = L.sx(tg.x), y1 = L.laneY(tg.ly) - 40 * L.k;
      const cx = x0 + (x1 - x0) * p, cy = y0 + (y1 - y0) * p - Math.sin(p * Math.PI) * 120 * L.k;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(p * 6.28); ctx.drawImage(lu, -cs * 0.7, -cs * 0.7, cs * 1.4, cs * 1.4); ctx.restore();
    }
  }

  /* ---------- Proyectiles y avisos de carril ---------- */
  function laneWarnings(S, L, T) {
    const P = S.P;
    for (const f of S.foes) {
      if (f.dead || f.state !== 'tele') continue;
      const lanes = f.dropLanes || (f.dropLane != null ? [f.dropLane] : null);
      if (!lanes) continue;
      const a = 0.25 + 0.25 * Math.sin(T * 16);
      for (const l of lanes) {
        const y = L.laneY(l) + 26 * L.k * L.laneS(l), hh = 30 * L.k;
        const x0 = L.sx(P.x + 160), x1 = L.sx(f.kind === 'moto' ? P.x + 620 : f.x);
        ctx.fillStyle = 'rgba(255,50,50,' + a + ')'; ctx.fillRect(Math.min(x0, x1), y - hh, Math.abs(x1 - x0), hh);
        ctx.fillStyle = 'rgba(255,230,120,' + (0.6 + a) + ')'; ctx.font = '900 ' + Math.round(18 * L.k) + 'px system-ui,sans-serif';
        ctx.fillText('⚠', x0 + 8, y - 8 * L.k);
      }
    }
  }
  function projectile(q, L, T) {
    const sc = L.laneS(q.ly), k = L.k * sc, x = L.sx(q.x), y = L.laneY(q.ly) + 26 * L.k * sc;
    if (q.kind === 'spikes') {
      ctx.fillStyle = '#3a3d44'; ctx.fillRect(x - 45 * k, y - 4 * k, 90 * k, 4 * k);
      ctx.fillStyle = '#c9ced8'; for (let i = 0; i < 9; i++) { const sx = x - 42 * k + i * 10 * k; ctx.beginPath(); ctx.moveTo(sx, y - 4 * k); ctx.lineTo(sx + 4 * k, y - 13 * k); ctx.lineTo(sx + 8 * k, y - 4 * k); ctx.fill(); }
      return;
    }
    shadow(x, y, 26 * k, 6 * k);
    ctx.save(); ctx.translate(x, y - 22 * k); ctx.rotate(-(q.spin || 0));
    if (q.kind === 'barrel') {
      ctx.fillStyle = '#8a2b1e'; ctx.beginPath(); ctx.arc(0, 0, 22 * k, 0, 7); ctx.fill();
      ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 4 * k; ctx.beginPath(); ctx.arc(0, 0, 15 * k, 0, 7); ctx.stroke();
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-3 * k, -22 * k, 6 * k, 44 * k);
    } else {
      ctx.fillStyle = '#9a6a35'; ctx.fillRect(-22 * k, -22 * k, 44 * k, 44 * k);
      ctx.strokeStyle = '#5c3b17'; ctx.lineWidth = 3 * k; ctx.strokeRect(-22 * k, -22 * k, 44 * k, 44 * k);
      ctx.beginPath(); ctx.moveTo(-22 * k, -22 * k); ctx.lineTo(22 * k, 22 * k); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- Partículas ---------- */
  function particles(S, L) {
    for (const p of S.fx) {
      const y = L.laneY(p.ly) + 26 * L.k * L.laneS(p.ly), x = L.sx(p.x), a = 1 - p.t / p.life;
      if (p.kind === 'spark') {
        ctx.strokeStyle = p.color; ctx.globalAlpha = a; ctx.lineWidth = 2 * L.k;
        const yy = y - p.z * L.k * 0.55; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x - p.vx * 0.02 * L.k, yy + p.vz * 0.02 * L.k); ctx.stroke(); ctx.globalAlpha = 1;
      } else if (p.kind === 'drop') {
        ctx.fillStyle = 'rgba(200,240,255,' + a + ')'; ctx.beginPath(); ctx.arc(x, y - p.z * L.k * 0.55, 3 * L.k, 0, 7); ctx.fill();
      } else if (p.kind === 'splash') {
        const yy = y - p.z * L.k * 0.55, r = p.r * L.k * (0.3 + p.t / p.life);
        ctx.strokeStyle = 'rgba(220,250,255,' + a + ')'; ctx.lineWidth = 4 * L.k;
        ctx.beginPath(); ctx.ellipse(x, yy, r, r * 0.22, 0, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(200,240,255,' + a * 0.8 + ')';
        ctx.beginPath(); ctx.moveTo(x - r * 0.5, yy); ctx.quadraticCurveTo(x, yy - r * 1.4 * (1 - p.t / p.life), x + r * 0.5, yy); ctx.closePath(); ctx.fill();
      } else if (p.kind === 'boom') {
        const r = p.r * L.k * (0.35 + 0.9 * (p.t / p.life));
        const g = ctx.createRadialGradient(x, y - r * 0.4, 1, x, y - r * 0.4, r);
        g.addColorStop(0, 'rgba(255,255,220,' + a + ')'); g.addColorStop(0.3, 'rgba(255,190,60,' + a + ')'); g.addColorStop(0.7, 'rgba(230,70,20,' + a * 0.8 + ')'); g.addColorStop(1, 'rgba(60,20,10,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - r * 0.4, r, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,240,200,' + a * 0.7 + ')'; ctx.lineWidth = 3 * L.k; ctx.beginPath(); ctx.arc(x, y - r * 0.3, r * 1.25, 0, 7); ctx.stroke();
      }
    }
    for (const d of S.debris) {
      const y = L.laneY(d.ly) + 26 * L.k * L.laneS(d.ly) - d.z * L.k * 0.55, x = L.sx(d.x);
      ctx.save(); ctx.translate(x, y); ctx.rotate(d.rot); ctx.globalAlpha = 1 - d.t / d.life;
      ctx.fillStyle = d.color || '#3a3a40'; ctx.fillRect(-d.s * L.k / 2, -d.s * L.k / 2, d.s * L.k, d.s * L.k * 0.6);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function speedLines(S, L, T) {
    const P = S.P, v = P.v;
    if (v < 700 && P.boostT <= 0 && S.state !== 'finale') return;
    const n = P.boostT > 0 ? 26 : 12;
    ctx.strokeStyle = P.boostT > 0 ? 'rgba(160,235,255,0.55)' : 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const sd = hash('sl' + i), y = (sd % 1000) / 1000 * L.H;
      const len = 60 + (sd >> 10) % 120, x = L.W - ((T * v * 1.4 + (sd % 977)) % (L.W + 200));
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    }
  }

  /* ---------- HUD de la misión ---------- */
  function hud(S, L, T) {
    const P = S.P, k = Math.max(0.8, Math.min(1.25, L.W / 900));
    const pad = 12 * k, top = 10 * k;
    ctx.save();
    // Panel izquierdo: carrocería, nitro y gatas.
    const pw = 188 * k, ph = 88 * k;
    ctx.fillStyle = 'rgba(12,20,34,0.82)'; rr(pad, top, pw, ph, 10 * k); ctx.fill();
    ctx.strokeStyle = 'rgba(170,200,230,0.3)'; ctx.lineWidth = 1; ctx.stroke();
    const so = img(SOFIA);
    if (ok(so)) { ctx.save(); rr(pad + 6 * k, top + 6 * k, 40 * k, 40 * k, 8 * k); ctx.clip(); ctx.fillStyle = '#284a5e'; ctx.fillRect(pad + 6 * k, top + 6 * k, 40 * k, 40 * k); ctx.drawImage(so, 50, 14, 92, 92, pad + 6 * k, top + 6 * k, 40 * k, 40 * k); ctx.restore(); }
    ctx.fillStyle = '#ffe0a3'; ctx.font = '900 ' + Math.round(10 * k) + 'px system-ui,sans-serif';
    ctx.fillText('CARROCERÍA', pad + 54 * k, top + 17 * k);
    for (let i = 0; i < P.maxHp; i++) {
      ctx.fillStyle = i < P.hp ? (P.hp <= 2 ? '#ff5a5a' : '#ffcf4a') : 'rgba(255,255,255,0.15)';
      rr(pad + 54 * k + i * (124 * k / P.maxHp), top + 22 * k, 124 * k / P.maxHp - 3 * k, 10 * k, 3 * k); ctx.fill();
    }
    ctx.fillStyle = '#9fe8ff'; ctx.fillText('NITRO', pad + 54 * k, top + 46 * k);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(pad + 54 * k, top + 51 * k, 124 * k, 9 * k, 4 * k); ctx.fill();
    const nf = P.nitro / NS.Chase.TUNE.nitroMax;
    ctx.fillStyle = P.boostT > 0 ? '#ffffff' : nf >= NS.Chase.TUNE.boostCost / 100 ? '#45d4ff' : '#2a7fa6'; rr(pad + 54 * k, top + 51 * k, 124 * k * nf, 9 * k, 4 * k); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = '800 ' + Math.round(10 * k) + 'px system-ui,sans-serif';
    const kmh = Math.round(P.v * 0.16);
    ctx.fillText(kmh + ' KM/H', pad + 8 * k, top + 64 * k);
    ctx.fillStyle = S.cats.cd > 0 ? '#9aa6b5' : '#b6ff8a';
    ctx.fillText(S.cats.cd > 0 ? 'GATAS ' + Math.ceil(S.cats.cd) + ' s' : 'GATAS LISTAS 🐾', pad + 8 * k, top + 80 * k);
    ctx.fillStyle = '#ffe0a3'; ctx.textAlign = 'right';
    ctx.fillText('DERRIBOS ' + S.stats.takedowns, pad + pw - 8 * k, top + 80 * k);
    ctx.fillText(S.stats.score + ' PTS', pad + pw - 8 * k, top + 64 * k);
    ctx.textAlign = 'left';
    // Progreso de la ruta (centro arriba).
    const SEC = NS.Chase.SECTIONS, endX = NS.Chase.BOSS_X;
    const bx = L.portrait ? pad : pad * 2 + pw, bw = L.portrait ? L.W - pad * 2 - 56 * k : Math.min(420 * k, L.W - bx - 80 * k);
    const by = L.portrait ? top + ph + 8 * k : top + 4 * k;
    ctx.fillStyle = 'rgba(12,20,34,0.82)'; rr(bx, by, bw, 34 * k, 9 * k); ctx.fill();
    ctx.fillStyle = '#ffe0a3'; ctx.font = '900 ' + Math.round(10 * k) + 'px system-ui,sans-serif';
    ctx.fillText('LA CALZADA · ' + SEC[S.section].title, bx + 10 * k, by + 13 * k);
    const tx = bx + 10 * k, tw = bw - 20 * k, ty = by + 22 * k;
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(tx, ty, tw, 5 * k, 3 * k); ctx.fill();
    const prog = Math.max(0, Math.min(1, P.x / endX));
    ctx.fillStyle = '#ffcf4a'; rr(tx, ty, tw * prog, 5 * k, 3 * k); ctx.fill();
    for (const s of SEC) { ctx.fillStyle = '#fff'; ctx.fillRect(tx + tw * s.x / endX - 1, ty - 3 * k, 2, 11 * k); }
    ctx.fillStyle = '#ffcf4a'; ctx.beginPath(); ctx.arc(tx + tw * prog, ty + 2.5 * k, 5 * k, 0, 7); ctx.fill();
    // Barra del jefe.
    const b = S.boss;
    if (b && !b.dead) {
      const bbw = bw, bbx = bx, bby = by + 40 * k;
      ctx.fillStyle = 'rgba(30,8,10,0.85)'; rr(bbx, bby, bbw, 30 * k, 8 * k); ctx.fill();
      ctx.fillStyle = '#ff9a9a'; ctx.font = '900 ' + Math.round(11 * k) + 'px system-ui,sans-serif'; ctx.textAlign = 'center';
      const doors = b.state === 'doors';
      ctx.fillText(doors && Math.floor(T * 6) % 2 ? '¡PUERTAS ABIERTAS · EMBISTE!' : b.name, L.W / 2, bby + 12 * k); ctx.textAlign = 'left';
      for (let i = 0; i < b.maxHp; i++) {
        ctx.fillStyle = i < b.hp ? '#ff4a4a' : 'rgba(255,255,255,0.15)';
        rr(bbx + 10 * k + i * ((bbw - 20 * k) / b.maxHp), bby + 18 * k, (bbw - 20 * k) / b.maxHp - 3 * k, 7 * k, 3 * k); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ---------- Cuadro completo ---------- */
  function draw(S, T) {
    if (!ctx || !S || !S.P) return;
    const L = layout(S);
    // El contexto es compartido con el render de plataformas: se fija el estado de texto en cada cuadro.
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0f1c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sh = S.shakeT > 0 ? S.shakeT * 14 * shakeMul : 0;
    const ox = sh ? Math.sin(T * 97) * sh : 0, oy = sh ? Math.cos(T * 83) * sh : 0;
    ctx.setTransform(L.dpr, 0, 0, L.dpr, ox * L.dpr, oy * L.dpr);
    // Cámara vertical: sigue al camión cuando vuela alto o cae a la barranca (el fondo lejano se mueve menos).
    const P = S.P, busY = L.laneY(P.ly) + 26 * L.k * L.laneS(P.ly) - P.z * L.k * 0.55 - 60 * L.k;
    const lo = L.H * 0.26, hi = L.H * 0.6;
    const want = busY < lo ? lo - busY : busY > hi ? hi - busY : 0;
    const dtR = Math.max(0, Math.min(0.1, T - lastT)); lastT = T;
    camY += (want - camY) * Math.min(1, dtR * 10);
    if (Math.abs(camY) < 0.3 && want === 0) camY = 0;
    ctx.save(); ctx.translate(0, camY * 0.6); backdrop(S, L); ctx.restore();
    ctx.save(); ctx.translate(0, camY);
    road(S, L, T);
    // Letreros de obra (en la banqueta lejana) y objetos por carril, de lejos a cerca.
    const statics = S.course.statics.filter((s) => s.x > L.x1 && s.x < L.x2);
    for (const s of statics) if (s.kind === 'sign') drawStatic(s, L, T);
    laneWarnings(S, L, T);
    const drawables = [];
    for (const s of statics) if (s.kind !== 'sign' && !s.got) drawables.push({ ly: s.lane - 0.01, z: 0, fn: () => drawStatic(s, L, T) });
    for (const f of S.foes) if (f.x > L.x1 - 300 && f.x < L.x2 + 300) drawables.push({ ly: f.ly, z: 0, fn: () => car(f, L, T, S) });
    for (const q of S.projectiles) if (q.x > L.x1 && q.x < L.x2) drawables.push({ ly: q.ly + 0.01, z: 0, fn: () => projectile(q, L, T) });
    drawables.push({ ly: S.P.ly + (S.P.air ? 0.4 : 0.005), z: S.P.z, fn: () => bus(S, L, T) });
    drawables.sort((a, b) => a.ly - b.ly);
    for (const d of drawables) d.fn();
    particles(S, L);
    ctx.restore();
    speedLines(S, L, T);
    // Cámara lenta: franjas de cine y un velo frío.
    const slow = Math.max(0, Math.min(1, (1 - S.timeScale) / (1 - NS.Chase.TUNE.slowmo)));
    if (slow > 0.02) {
      const bar = L.H * 0.085 * slow;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, L.W, bar); ctx.fillRect(0, L.H - bar, L.W, bar);
      ctx.fillStyle = 'rgba(60,120,200,' + 0.12 * slow + ')'; ctx.fillRect(0, 0, L.W, L.H);
    }
    // Sirenas: cuando una patrulla está cerca, los bordes de la pantalla destellan rojo/azul.
    const near = S.foes.some((f) => !f.dead && f.kind === 'patrol' && Math.abs(f.x - S.P.x) < 700);
    if (near) {
      const on = Math.floor(T * 6) % 2;
      const g = ctx.createLinearGradient(0, 0, L.W, 0);
      g.addColorStop(0, on ? 'rgba(255,40,60,0.22)' : 'rgba(40,90,255,0.22)'); g.addColorStop(0.15, 'rgba(0,0,0,0)');
      g.addColorStop(0.85, 'rgba(0,0,0,0)'); g.addColorStop(1, on ? 'rgba(40,90,255,0.22)' : 'rgba(255,40,60,0.22)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, L.H);
    }
    if (S.state !== 'finale' || (S.finale && S.finale.t < 1)) hud(S, L, T);
    // Final: la imagen se funde a blanco mientras el camión cae hacia la presa.
    if (S.state === 'finale' || S.state === 'won') {
      const F = S.finale || {}, t = F.t || 9, after = F.splash ? t - F.splashT : -1;
      if (!F.splash && t > 0.3) {
        const ty = L.H * (L.portrait ? 0.16 : 0.14) + 8;
        ctx.fillStyle = 'rgba(255,240,200,0.92)'; ctx.font = '900 ' + Math.round(Math.min(38, L.W / 16)) + 'px system-ui,sans-serif'; ctx.textAlign = 'center';
        ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 6; ctx.strokeText('¡SALTO A LA BARRANCA!', L.W / 2, ty); ctx.fillText('¡SALTO A LA BARRANCA!', L.W / 2, ty); ctx.textAlign = 'left';
      }
      const w = after < 0 ? 0 : Math.max(0, Math.min(1, (after - 0.5) / 0.9));
      if (w > 0) { ctx.fillStyle = 'rgba(255,255,255,' + w + ')'; ctx.fillRect(0, 0, L.W, L.H); }
    }
    if (S.flashT > 0) { ctx.fillStyle = 'rgba(255,250,235,' + Math.min(0.6, S.flashT * 2.4) + ')'; ctx.fillRect(0, 0, L.W, L.H); }
  }

  NS.ChaseRender = { init, draw, setOptions, urls };
})(typeof globalThis !== 'undefined' ? globalThis : window);
