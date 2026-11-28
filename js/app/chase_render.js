/* ¡Se me fue el camión! — dibujo de la MISIÓN ESPECIAL · LA CALZADA.
   Vista lateral 2.5D de tres carriles sobre el mismo <canvas> del juego. Sofía va en la moto de su mamá
   (assets/calzada/moto, cuadros aportados); de fondo pasan los panoramas de la Calzada aportados para esta misión
   —Parque Agua Azul, Mi Macro Calzada, Mercado San Juan de Dios y Morelos— (assets/calzada/fondos), con su
   guarnición alineada al borde del camino. Patrullas, camionetas, motos de la banda, el tráiler y los objetos del
   camino se dibujan con primitivas.
   Efectos de película: cámara lenta con franjas de cine, explosiones, chispas, humo, nitro, líneas de velocidad,
   destellos y temblor de cámara (respeta la opción TEMBLOR). */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};
  const MOTO_DIR = 'assets/calzada/moto/';
  const MOTO = { ride: MOTO_DIR + 'moto_12.webp', boost: MOTO_DIR + 'moto_11.webp', air: MOTO_DIR + 'moto_10.webp' };
  const MOTO_BOX = { x: 77, y: 0, w: 277, h: 241 };   // píxeles opacos de Sofía en la moto dentro del cuadro de 354 × 251
  const LUNA = 'assets/companions/luna.png', MORITA = 'assets/companions/morita.png';
  const SOFIA = 'assets/player/sofia/idle_01.png';
  /* Panoramas de 1916 × 821: la guarnición amarilla termina en la fila 624; de ahí para abajo es su propia calle,
     que no se dibuja (la calle es la del juego). Se suceden en este orden y se funden en las uniones. */
  const FONDOS = ['agua_azul', 'macro_calzada', 'mercado_san_juan', 'morelos'].map((n) => 'assets/calzada/fondos/' + n + '.webp');
  const PANO = { w: 1916, curb: 624, overlap: 0.1, parallax: 0.35 };
  /* V58.8.26 · Perseguidores en moto (hojas aportadas, 3 × 4): fila 1 maneja, 2 prepara el ataque, 3 ataca, 4 acelera.
     box: caja del cuadro; moto: x de la llanta trasera y delantera y la fila del piso (para escalar y apoyar). */
  const RIDERS = {
    kid: { name: 'nino', box: { w: 409, h: 261 }, moto: [72, 328], ground: 257 },
    maestro: { name: 'maestro', box: { w: 346, h: 271 }, moto: [22, 308], ground: 262 }
  };
  const riderFrame = (kind, row, col) => 'assets/calzada/enemigos/' + RIDERS[kind].name + '_' + row + col + '.webp';
  const RIDER_URLS = Object.keys(RIDERS).flatMap((kd) => [1, 2, 3, 4].flatMap((r) => [1, 2, 3].map((c) => riderFrame(kd, r, c))));
  /* V58.8.29 · El Maestro Enojón en su moto roja, jefe del tramo 2 (hoja de «RECURSOS_CURADOS_V1», 5 × 4 limpiada):
     maneja, embiste, reglazo, caballito, golpe/mareo y derrota. Cuadros [x, y, w, h, ox, oy]; ox = ancla del cuerpo. */
  const MJEFE = { src: 'assets/calzada/enemigos/maestro_jefe_moto.webp', ride: 199,
    frames: [[0,0,199,257,-104,-128],[203,0,198,264,-104,-136],[405,0,198,254,-102,-126],[607,0,200,251,-103,-122],[811,0,230,245,-131,-116],[1045,0,240,242,-134,-114],[0,268,262,237,-154,-108],[266,268,272,229,-167,-100],[542,268,213,255,-92,-126],[759,268,224,249,-108,-120],[987,268,252,235,-116,-106],[1243,268,258,226,-118,-98],[0,527,225,243,-96,-114],[229,527,230,253,-100,-124],[463,527,233,260,-102,-132],[700,527,247,239,-114,-110],[951,527,219,246,-100,-118],[1174,527,224,236,-106,-108],[0,791,273,179,-130,-50],[277,791,303,132,-144,-4]] };
  /* V58.8.37 · La Señora de la Cuchara en su scooter rosa, jefa del tramo 3 (hoja del mismo paquete, 5 × 4, con el mismo
     orden que la del Maestro: maneja, acelera, cucharazo, salto, golpe/mareo y derrota). Esa hoja venía con fondo gris
     semiopaco: se recortó por su contorno negro. No es Doña Tóxica (aclaración del autor). */
  const SENORA = { src: 'assets/calzada/enemigos/senora_cuchara_scooter.webp', ride: 214,
    frames: [[0,0,214,261,-107,-130],[218,0,212,260,-106,-130],[434,0,213,260,-106,-130],[651,0,213,262,-106,-131],[868,0,238,254,-119,-127],[1110,0,212,252,-106,-126],[0,266,241,250,-120,-125],[245,266,263,246,-132,-123],[512,266,231,262,-116,-131],[747,266,217,262,-108,-131],[968,266,241,234,-120,-117],[1213,266,265,233,-132,-116],[0,532,232,221,-116,-110],[236,532,234,245,-117,-122],[474,532,241,247,-120,-124],[719,532,271,225,-136,-112],[994,532,213,238,-106,-119],[1211,532,221,245,-110,-122],[0,783,214,224,-107,-112],[218,783,310,152,-155,-76]] };
  const urls = () => [MOTO.ride, MOTO.boost, MOTO.air, LUNA, MORITA, SOFIA, ...FONDOS, ...RIDER_URLS, MJEFE.src, SENORA.src];
  /* V58.8.30 · Llantas que giran. [cx, cy, r] de cada llanta (trasera, delantera) en píxeles del cuadro, medidas sobre el
     arte (anillo oscuro con transparencia afuera; ver CHANGELOG). La moto de Sofía tiene rines de rayos: se arma una vez una
     textura limpia del rin con su mitad de abajo (sin escape ni bota) repitiendo el periodo de los rayos (°), y se gira solo
     en esa mitad [a1, a2] (°). Los jinetes y el Maestro tienen rines lisos: giran las marcas de la llanta y un brillo. */
  const MOTO_WHEELS = { [MOTO.ride]: [[132,195,40,25,160,53],[312,193,42,20,162,90]], [MOTO.boost]: [[134,194,40,25,160,54],[313,192,42,20,162,46]], [MOTO.air]: [[139,194,39,55,165,54],[315,193,40,20,162,47]] };
  const RIDER_WHEELS = { nino: {"11":[[115,226,34],[291,224,36]],"12":[[115,226,34],[291,224,36]],"13":[[115,226,34],[291,224,36]],"21":[[119,226,34],[296,224,36]],"22":[[120,226,34],[296,224,36]],"23":[[121,226,34],[297,224,36]],"31":[[107,225,34],[284,223,36]],"32":[[106,225,34],[283,223,36]],"33":[[110,225,34],[289,223,36]],"41":[[129,221,36],[313,222,38]],"42":[[130,219,38],[316,222,38]],"43":[[134,219,39],[326,219,41]]}, maestro: {"11":[[72,221,41],[265,217,43]],"12":[[61,221,41],[254,217,43]],"13":[[51,220,41],[245,217,43]],"21":[[72,219,42],[265,218,44]],"22":[[62,219,42],[255,217,43]],"23":[[52,219,42],[246,218,43]],"31":[[73,221,41],[265,218,43]],"32":[[59,220,41],[255,218,43]],"33":[[50,219,42],[246,218,43]],"41":[[72,221,41],[265,218,43]],"42":[[62,220,42],[256,219,43]],"43":[[51,221,41],[248,219,43]]} };
  const MJEFE_WHEELS = [[[37,225,31],[167,228,29]],[[37,230,31],[167,234,29]],[[37,222,30],[167,225,28]],[[36,218,31],[168,221,29]],[[66,208,29],[190,216,28]],[[66,206,29],[193,212,29]],[[79,200,30],[210,208,29]],[[88,192,29],[222,200,29]],[[48,224,29],[182,226,28]],[[60,219,29],[192,221,28]],[[53,204,29],[183,208,27]],[[43,196,28],[171,199,27]],[[77,213,29],[194,172,30]],[[92,207,29],[200,155,28]],[[94,199,27],[204,151,29]],[[90,209,29],[216,196,29]],[[40,214,30],[167,218,28]],[[36,204,30],[162,208,28]],null,null];
  // V58.8.37: llantas del scooter. La trasera la tapa la carrocería arriba: centro x y borde de abajo medidos, con el radio
  // de la delantera; en el aterrizaje (15) el polvo la cubre (cuarto valor 0: apoya, pero no se dibuja el giro).
  const SENORA_WHEELS = [[[42,237,24],[180,237,24]],[[35,233,24],[178,236,24]],[[37,232,24],[180,236,24]],[[35,234,24],[179,238,24]],[[65,230,24],[202,227,24]],[[47,225,24],[176,228,24]],[[70,219,24],[200,226,24]],[[83,216,24],[218,223,24]],[[54,232,25],[197,237,25]],[[39,232,25],[184,237,25]],[[62,205,25],[207,210,25]],[[28,203,24],[169,209,24]],[[56,194,25],[193,195,25]],[[74,211,25],[205,172,25]],[[83,187,25],[213,158,25]],[[61,201,23,0],[199,201,23]],[[46,211,25],[185,213,25]],[[65,221,24],[189,222,24]],[[34,195,21],[179,196,21]],null];
  const DUEL_ART = { mjefe: { art: MJEFE, wheels: MJEFE_WHEELS }, cuchara: { art: SENORA, wheels: SENORA_WHEELS } };
  const RAD = Math.PI / 180;
  const wheelTex = new Map();
  /** Textura limpia del rin (una vez por llanta y cuadro): la mitad de abajo, repetida por el periodo de los rayos. */
  function wheelTexture(src, im, w) {
    const key = src + '|' + w[0] + ',' + w[1];
    if (wheelTex.has(key)) return wheelTex.get(key);
    if (!ok(im) || typeof document === 'undefined') return null;
    let out = false;
    try {
      const [cx, cy, r, a1, a2, per] = w, R = Math.ceil(r) + 1, N = 2 * R + 1;
      const c = document.createElement('canvas'); c.width = c.height = N;
      const g = c.getContext('2d');
      g.drawImage(im, cx - R, cy - R, N, N, 0, 0, N, N);
      const src0 = g.getImageData(0, 0, N, N).data, dst = g.createImageData(N, N), d = dst.data;
      const span = per ? Math.floor((a2 - a1) / per) * per : a2 - a1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const dx = x - R, dy = y - R, rho = Math.hypot(dx, dy);
        if (rho > r) continue;
        let t = (Math.atan2(dy, dx) / RAD + 360) % 360;
        if (t < a1 || t > a2) t = a1 + (((t - a1) % span) + span) % span;
        const sx = Math.round(R + rho * Math.cos(t * RAD)), sy = Math.round(R + rho * Math.sin(t * RAD));
        if (sx < 0 || sy < 0 || sx >= N || sy >= N) continue;
        const i = (y * N + x) * 4, j = (sy * N + sx) * 4;
        d[i] = src0[j]; d[i + 1] = src0[j + 1]; d[i + 2] = src0[j + 2]; d[i + 3] = src0[j + 3];
      }
      g.putImageData(dst, 0, 0);
      out = { c, R, N, r, a1: a1 * RAD, a2: a2 * RAD, per: (per || 45) * RAD };
    } catch (e) { out = false; }   // p. ej., lienzo bloqueado al abrir el HTML como archivo local: quedan solo las marcas
    wheelTex.set(key, out);
    return out;
  }
  // Ángulo de cada llanta por vehículo. El paso por cuadro se limita a un tercio del periodo de los rayos para que
  // nunca parezca girar hacia atrás (efecto estroboscópico); lo que sobra de velocidad se ve como estela de giro.
  const spin = new Map();
  let frameDt = 0;
  function spinOf(id, speedPx, wheels, s) {
    let st = spin.get(id);
    if (!st) { if (spin.size > 160) spin.clear(); st = { a: [0, 0], blur: [0, 0] }; spin.set(id, st); }
    for (let i = 0; i < 2; i++) {
      const w = wheels[i], per = (w[5] || 40) * RAD, rs = Math.max(3, w[2] * s);
      const omega = Math.abs(speedPx) * frameDt / rs;
      st.a[i] = (st.a[i] + Math.sign(speedPx) * Math.min(omega, per * 0.32)) % (Math.PI * 2);
      st.blur[i] = Math.max(0, Math.min(1, (omega - per * 0.12) / (per * 0.5)));
    }
    return st;
  }
  /** Rin girando (textura) en su mitad limpia, con dos copias tenues detrás cuando va rápido. */
  function spinTexture(tex, X, Y, s, ang, blur) {
    const base = ctx.globalAlpha;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.arc(X, Y, tex.r * s * 0.985, tex.a1, tex.a2); ctx.closePath(); ctx.clip();
    const copies = blur > 0.05 && fxQ >= 0.8 ? 3 : 1;
    for (let j = 0; j < copies; j++) {
      ctx.save();
      ctx.globalAlpha = base * (j === 0 ? 1 : (j === 1 ? 0.42 : 0.22) * blur);
      ctx.translate(X, Y); ctx.rotate(ang - j * tex.per * 0.14);
      ctx.drawImage(tex.c, -tex.R * s, -tex.R * s, tex.N * s, tex.N * s);
      ctx.restore();
    }
    ctx.restore();
  }
  /* ---------- V58.8.30 · Efectos de movimiento (solo dibujo: no tocan la simulación ni su determinismo) ----------
     Polvo de la llanta trasera (azul con nitro), marcas de derrape al cambiar de carril, aro de polvo y golpe de cámara al
     aterrizar o despegar, y estallido radial al encender el nitro. Todo en coordenadas del mundo: se queda atrás solo. */
  const VFX = { S: null, dust: [], skids: [], rings: [], prev: null, punch: 0, burst: 0, acc: 0, seed: 1 };
  const vrand = () => { VFX.seed = (VFX.seed * 16807) % 2147483647; return VFX.seed / 2147483647; };
  function puff(x, ly, boost, big) {
    if (VFX.dust.length > 110) VFX.dust.shift();
    VFX.dust.push({ x, ly: ly + (vrand() - 0.5) * 0.18, z: vrand() * 8, vx: -(20 + vrand() * 55) * (big ? 2.4 : 1), vz: 8 + vrand() * (big ? 110 : 34),
      r0: 5 + vrand() * 4, r1: (big ? 32 : 22) + vrand() * 16, t: 0, life: 0.5 + vrand() * 0.4, boost: !!boost, sq: 0.7 + vrand() * 0.5 });
  }
  function vfxStep(S, dt) {
    const P = S.P, T = NS.Chase.TUNE;
    if (VFX.S !== S || !VFX.prev || P.x < VFX.prev.x - 400) {   // partida nueva o reintento
      Object.assign(VFX, { S, dust: [], skids: [], rings: [], punch: 0, burst: 0, acc: 0, prev: null });
    }
    const pv = VFX.prev || { x: P.x, ly: P.ly, air: P.air, boost: P.boostT > 0, v: P.v };
    const rear = P.x - T.busLen * 0.3;
    if (dt > 0) {
      // Polvo continuo de la llanta trasera según la velocidad (más con nitro).
      if (!P.air && S.state === 'playing') {
        VFX.acc += dt * (Math.max(0, (P.v - 330) / 560) * 15 + (P.boostT > 0 ? 26 : 0)) * (fxQ < 0.8 ? 0.5 : 1);
        while (VFX.acc >= 1) { VFX.acc -= 1; puff(rear - vrand() * 20, P.ly + (vrand() - 0.5) * 0.12, P.boostT > 0); }
      }
      // Los perseguidores en moto también levantan polvo.
      for (const f of S.foes) {
        if (f.dead || f.civil || !(f.kind === 'kid' || f.kind === 'maestro' || DUEL_ART[f.kind] || f.kind === 'moto')) continue;
        if (Math.abs(f.x - P.x) > 1400 || (f.z || 0) > 10 || vrand() > dt * 11) continue;
        puff(f.x - NS.Chase.KIND[f.kind].len * 0.3, f.ly, false);
      }
      // Derrape: al cambiar de carril o frenar fuerte en tierra deja marcas que se desvanecen.
      const lateral = Math.abs(P.ly - pv.ly) / dt, braking = (pv.v - P.v) / dt;
      if (!P.air && (lateral > 1.6 || braking > 900) && S.state === 'playing') {
        if (VFX.skids.length > 70) VFX.skids.shift();
        VFX.skids.push({ x1: pv.x - T.busLen * 0.3, ly1: pv.ly, x2: rear, ly2: P.ly, t: 0, life: 1.6 });
      }
      // Despegue y aterrizaje: aro de polvo, nube y golpe de cámara.
      if (pv.air && !P.air) {
        const big = P.airMax > 140;
        VFX.rings.push({ x: P.x - T.busLen * 0.1, ly: P.ly, t: 0, life: big ? 0.65 : 0.45, r: big ? 150 : 95 });
        for (let i = 0; i < (big ? 14 : 7); i++) puff(rear + (vrand() - 0.3) * 120, P.ly + (vrand() - 0.5) * 0.3, false, true);
        VFX.punch = Math.max(VFX.punch, big ? 0.055 : 0.03);
      } else if (!pv.air && P.air) {
        VFX.punch = Math.max(VFX.punch, 0.025);
        for (let i = 0; i < 6; i++) puff(rear, P.ly, P.boostT > 0, true);
      }
      // Nitro: estallido radial al encenderlo.
      if (!pv.boost && P.boostT > 0) { VFX.burst = 0.5; VFX.punch = Math.max(VFX.punch, 0.035); }
    }
    for (const d of VFX.dust) { d.t += dt; d.x += d.vx * dt; d.z += d.vz * dt; d.vz *= Math.max(0, 1 - dt * 2.5); }
    VFX.dust = VFX.dust.filter((d) => d.t < d.life);
    for (const q of VFX.skids) q.t += dt;
    VFX.skids = VFX.skids.filter((q) => q.t < q.life);
    for (const r of VFX.rings) r.t += dt;
    VFX.rings = VFX.rings.filter((r) => r.t < r.life);
    VFX.punch *= Math.exp(-dt * 8);
    VFX.burst = Math.max(0, VFX.burst - dt);
    VFX.prev = { x: P.x, ly: P.ly, air: P.air, boost: P.boostT > 0, v: P.v };
  }
  const roadY = (L, ly) => L.laneY(ly) + 26 * L.k * L.laneS(ly);
  /** Lo que va sobre el asfalto (bajo los vehículos): derrapes, aros de aterrizaje y polvo. */
  function vfxGround(L) {
    ctx.lineCap = 'round';
    for (const q of VFX.skids) {
      const a = 1 - q.t / q.life;
      ctx.strokeStyle = 'rgba(14,14,18,' + (0.42 * a) + ')'; ctx.lineWidth = 4 * L.k * L.laneS(q.ly2);
      ctx.beginPath(); ctx.moveTo(L.sx(q.x1), roadY(L, q.ly1)); ctx.lineTo(L.sx(q.x2), roadY(L, q.ly2)); ctx.stroke();
    }
    for (const r of VFX.rings) {
      const p = r.t / r.life, k = L.k * L.laneS(r.ly), rad = r.r * k * (0.25 + p);
      ctx.strokeStyle = 'rgba(235,222,200,' + (0.55 * (1 - p)) + ')'; ctx.lineWidth = (6 - 4 * p) * k;
      ctx.beginPath(); ctx.ellipse(L.sx(r.x), roadY(L, r.ly), rad, rad * 0.18, 0, 0, 7); ctx.stroke();
    }
    for (const d of VFX.dust) {
      const p = d.t / d.life, k = L.k * L.laneS(d.ly), rad = (d.r0 + (d.r1 - d.r0) * p) * k;
      const x = L.sx(d.x), y = roadY(L, d.ly) - d.z * L.k * 0.55 - rad * 0.35, a = Math.pow(1 - p, 1.5) * (d.boost ? 0.42 : 0.3);
      // Nube achatada (más ancha que alta) con un núcleo claro: se lee como polvo, no como burbuja.
      ctx.fillStyle = d.boost ? 'rgba(175,225,255,' + a + ')' : 'rgba(205,193,172,' + a + ')';
      ctx.beginPath(); ctx.ellipse(x, y, rad * 1.25, rad * d.sq * 0.75, 0, 0, 7); ctx.fill();
      if (fxQ >= 0.8) { ctx.fillStyle = 'rgba(255,255,255,' + a * 0.3 + ')'; ctx.beginPath(); ctx.ellipse(x - rad * 0.3, y - rad * 0.15, rad * 0.6, rad * 0.4, 0, 0, 7); ctx.fill(); }
    }
  }
  /* V58.8.30 · Cortinilla de jefe: cuando aparece el Maestro en su moto roja o el tráiler, una franja inclinada entra
     deslizándose con su nombre y se desvanece (2 s de reloj real, aunque haya cámara lenta). */
  const CARD = { ref: null, t: 9 };
  function bossCard(S, L, dtReal) {
    const b = S.mb && !S.mb.dead ? S.mb : S.boss && !S.boss.dead ? S.boss : null;
    if (b && b !== CARD.ref) { CARD.ref = b; CARD.t = 0; CARD.name = b.name; CARD.sub = b.miniboss ? 'DUELO EN LA CALZADA' : 'JEFE FINAL DE LA CALZADA'; }
    if (CARD.t > 2.2) return;
    CARD.t += dtReal;
    const t = CARD.t, a = t < 0.22 ? t / 0.22 : t > 1.75 ? Math.max(0, 1 - (t - 1.75) / 0.45) : 1;
    if (a <= 0) return;
    const ease = 1 - Math.pow(1 - Math.min(1, t / 0.35), 3), slide = (1 - ease) * L.W * 0.35;
    const y = L.H * 0.4, h = Math.min(110, L.H * 0.15), sk = 16, W = L.W;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(12,6,22,0.82)';
    ctx.beginPath(); ctx.moveTo(-20, y - h / 2 + sk); ctx.lineTo(W + 20, y - h / 2 - sk); ctx.lineTo(W + 20, y + h / 2 - sk); ctx.lineTo(-20, y + h / 2 + sk); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff3b4b'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-20, y - h / 2 + sk); ctx.lineTo(W + 20, y - h / 2 - sk); ctx.moveTo(-20, y + h / 2 + sk); ctx.lineTo(W + 20, y + h / 2 - sk); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const big = Math.round(Math.min(46, W / (CARD.name.length * 0.62 + 2))), small = Math.round(Math.max(10, big * 0.36));
    ctx.font = '900 ' + small + 'px system-ui,sans-serif'; ctx.fillStyle = '#ffd36a';
    ctx.fillText(CARD.sub.split('').join(' '), W / 2 + slide * 0.6, y - big * 0.62);
    ctx.font = '900 ' + big + 'px system-ui,sans-serif'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#8a0f1c'; ctx.lineWidth = Math.max(4, big * 0.16); ctx.strokeText(CARD.name, W / 2 + slide, y + small * 0.5);
    ctx.fillStyle = '#ffffff'; ctx.fillText(CARD.name, W / 2 + slide, y + small * 0.5);
    ctx.restore();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  /** Estallido de nitro: rayos que salen de la moto. */
  function vfxBurst(S, L) {
    if (VFX.burst <= 0) return;
    const P = S.P, a = VFX.burst / 0.5, cx = L.sx(P.x), cy = roadY(L, P.ly) - P.z * L.k * 0.55 - 40 * L.k;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const ang = i / 22 * Math.PI * 2 + hash('nb' + i) % 100 / 300, r0 = (60 + (1 - a) * 160) * L.k, r1 = r0 + (40 + hash('nl' + i) % 90) * L.k * a;
      ctx.strokeStyle = i % 3 ? 'rgba(160,235,255,' + 0.6 * a + ')' : 'rgba(255,210,120,' + 0.6 * a + ')'; ctx.lineWidth = (2 + (i % 3)) * L.k;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0 * 0.6); ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1 * 0.6); ctx.stroke();
    }
    ctx.restore();
  }
  /** Marcas de la llanta y brillo del rin que giran, solo en la mitad de abajo (arriba están el guardafango y el cuerpo). */
  function spinTread(X, Y, rs, ang, blur, a1, a2) {
    const base = ctx.globalAlpha;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.arc(X, Y, rs, a1, a2); ctx.closePath(); ctx.clip();
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, rs * 0.085);
    for (let i = 0; i < 10; i++) {
      const t = ang + i * Math.PI / 5;
      ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,' + (0.18 + 0.12 * blur) * base + ')' : 'rgba(0,0,0,' + 0.34 * base + ')';
      ctx.beginPath(); ctx.arc(X, Y, rs * 0.87, t, t + 0.15 + 0.4 * blur); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.26 + 0.2 * blur) * base + ')'; ctx.lineWidth = Math.max(1, rs * 0.07);
    for (let i = 0; i < 2; i++) { const t = ang + i * Math.PI; ctx.beginPath(); ctx.arc(X, Y, rs * 0.52, t, t + 0.45 + 0.7 * blur); ctx.stroke(); }
    ctx.restore();
  }


  // V58.8.30: `fxQ` = calidad de efectos (la misma escala 0,55–1 de la resolución adaptativa): por debajo de 0,8 se
  // recortan el polvo, la estela fantasma y la estela de giro de las llantas.
  let canvas = null, ctx = null, shakeMul = 1, camY = 0, lastT = 0, fxQ = 1;
  const R = () => NS.Render;
  const img = (src) => R().image(src);
  const ok = (im) => R().ready(im);
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const CIVIL_COLORS = ['#c23b3b', '#3a6fc4', '#e4e4e4', '#7b4fb3', '#2f8f6a', '#d98a2b', '#6b6f78'];

  function init(el) { canvas = el; ctx = canvas.getContext('2d'); }
  function setOptions(o) { if (o && o.shake != null) shakeMul = o.shake; if (o && Number.isFinite(o.fx)) fxQ = Math.max(0.5, Math.min(1, o.fx)); }

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

  /* ---------- Fondo: panoramas de la Calzada ---------- */
  function backdrop(S, L) {
    const sky = ctx.createLinearGradient(0, -L.H, 0, L.far);
    sky.addColorStop(0, '#2f7fe0'); sky.addColorStop(1, '#8cc8ff');
    ctx.fillStyle = sky; ctx.fillRect(0, -L.H, L.W, L.far + L.H + 30);
    const sc = L.far / PANO.curb, tw = PANO.w * sc, step = tw * (1 - PANO.overlap), ov = tw * PANO.overlap;
    const pos = (S.cam.x + 150) * L.k * PANO.parallax;
    const first = Math.floor(pos / step) - 1;
    for (let n = first; n * step - pos < L.W + tw; n++) {
      const im = img(FONDOS[((n % 4) + 4) % 4]);
      if (!ok(im)) continue;
      const x = n * step - pos;
      if (x + tw < 0) continue;
      // Unión suave: el borde izquierdo de cada panorama entra en franjas con opacidad creciente.
      const slices = 8, sw = ov / slices, srcW = im.naturalWidth * (sw / tw), srcH = PANO.curb * (im.naturalHeight / 821);
      for (let i = 0; i < slices; i++) {
        ctx.globalAlpha = (i + 1) / (slices + 1);
        ctx.drawImage(im, i * srcW, 0, srcW, srcH, x + i * sw, 0, sw + 0.5, L.far);
      }
      ctx.globalAlpha = 1;
      const sx = im.naturalWidth * (ov / tw);
      ctx.drawImage(im, sx, 0, im.naturalWidth - sx, srcH, x + ov, 0, tw - ov + 0.5, L.far);
    }
  }

  /* ---------- Calzada ---------- */
  function road(S, L, T) {
    const { W, H, far, near, k } = L;
    // La banqueta lejana y su guarnición vienen en el panorama; aquí empieza el asfalto.
    const asphalt = ctx.createLinearGradient(0, far, 0, near);
    asphalt.addColorStop(0, '#44434f'); asphalt.addColorStop(1, '#55545f');
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
    // V58.8.30: manchas, parches y grietas del asfalto (fijos en el mundo): se ven pasar con la velocidad.
    for (let x = Math.floor(L.x1 / 150) * 150; x < L.x2; x += 150) {
      const h1 = hash('as' + x);
      if (h1 % 4 === 0) continue;
      const ly = ((h1 >>> 4) % 260) / 100 - 0.05, w = (26 + (h1 >>> 8) % 70) * k * L.laneS(ly), yy = L.laneY(ly) + 26 * k * L.laneS(ly) - (8 + (h1 >>> 12) % 14) * k;
      const sxp = L.sx(x + (h1 >>> 16) % 90);
      if (h1 % 7 === 1) { ctx.strokeStyle = 'rgba(20,20,26,0.35)'; ctx.lineWidth = 1.4 * k; ctx.beginPath(); ctx.moveTo(sxp, yy); ctx.lineTo(sxp + w * 0.4, yy - 3 * k); ctx.lineTo(sxp + w * 0.7, yy + 2 * k); ctx.lineTo(sxp + w, yy - 1 * k); ctx.stroke(); }
      else { ctx.fillStyle = h1 % 5 === 2 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.11)'; ctx.beginPath(); ctx.ellipse(sxp, yy, w, (2 + (h1 >>> 20) % 3) * k, 0, 0, 7); ctx.fill(); }
    }
    // Líneas de carril.
    ctx.fillStyle = 'rgba(240,240,220,0.75)';
    const dash = 90, gapW = 70, per = dash + gapW;
    for (const b of [0.35, 0.65]) {
      const y = far + (near - far) * b;
      const start = Math.floor(L.x1 / per) * per;
      for (let x = start; x < L.x2; x += per) ctx.fillRect(L.sx(x), y - 1.5 * k, dash * k, 3 * k);
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
    if (RIDERS[f.kind]) { rider(f, k, T, S); ctx.restore(); if (!f.dead && f.state === 'stunned') stars(x, ground - K.h * k - 10 * k, k, T); if (!f.dead) telegraph(f, L, T, x, ground - K.h * k - 6 * k, k); return; }
    if (f.kind === 'truck') { truck(f, k, len, h, T, S); ctx.restore(); return; }
    if (DUEL_ART[f.kind]) {
      duelBoss(f, k, T, L); ctx.restore();
      const top = ground - h - (f.z || 0) * L.k * 0.55 - 10 * k;
      if (!f.dead && f.state === 'dizzy') stars(x, top, k, T);
      if (!f.dead) telegraph(f, L, T, x, top, k);
      return;
    }
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
  /** Niño de las piedras o Maestro Enojón en su moto: el cuadro sale del estado (aviso, ataque, persecución). */
  function rider(f, k, T, S) {
    const R = RIDERS[f.kind], len = NS.Chase.KIND[f.kind].len * k;
    const sc = len / (R.moto[1] - R.moto[0]), cx = (R.moto[0] + R.moto[1]) / 2;
    let row = 1, col = 1 + (Math.floor(T * 8 + (f.x % 7)) % 3);
    const dx = S ? f.x - S.P.x : 0;
    if (f.state === 'tele') { row = 2; col = 1 + Math.min(2, Math.floor(3 * (1 - Math.max(0, f.tele) / (f.teleMax || 0.85)))); }
    else if (f.state === 'throw') { row = 3; col = f.throwT > 0.2 ? 1 : f.throwT > 0.08 ? 2 : 3; }
    else if (f.state === 'swing') { row = 3; col = f.swingT > 0.3 ? 1 : f.swingT > 0.15 ? 2 : 3; }
    else if (f.state === 'recover' || (f.state === 'approach' && dx < -260)) { row = 4; col = 1 + (Math.floor(T * 10) % 3); }
    const im = img(riderFrame(f.kind, row, col));
    const bob = f.dead ? 0 : Math.sin(T * 24 + f.x) * 0.8 * k;
    // V58.8.30: cada cuadro se apoya en sus propias llantas (antes la moto se corría hasta 20 px entre cuadros).
    const W = RIDER_WHEELS[R.name] && RIDER_WHEELS[R.name][row + '' + col];
    const ax = W ? (W[0][0] + W[1][0]) / 2 : cx, gy = W ? Math.max(W[0][1] + W[0][2], W[1][1] + W[1][2]) : R.ground;
    if (ok(im)) {
      ctx.drawImage(im, -ax * sc, -gy * sc + bob, R.box.w * sc, R.box.h * sc);
      if (W && !f.dead) {
        const st = spinOf(f.id, (f.v || 0) * k, W, sc);
        for (let i = 0; i < 2; i++) spinTread((W[i][0] - ax) * sc, (W[i][1] - gy) * sc + bob, W[i][2] * sc, st.a[i], st.blur[i], 18 * RAD, 162 * RAD);
      }
    }
    else { ctx.fillStyle = f.kind === 'kid' ? '#2f7d3a' : '#e8e8ee'; rr(-len / 2, -len * 0.6, len, len * 0.5, 6 * k); ctx.fill(); }
    if (f.dead) smoke(0, -len * 0.5, k, T, f.x);
  }

  /** Jefes de duelo (el Maestro y la Señora de la Cuchara): el cuadro sale del estado; en el salto se eleva (z) y su
      sombra queda en el piso. Las dos hojas tienen el mismo orden de cuadros. */
  function duelBoss(f, k, T, L) {
    const D = DUEL_ART[f.kind], A = D.art, im = img(A.src), sc = NS.Chase.KIND[f.kind].len * k / A.ride;
    const pick = (list, p) => list[Math.max(0, Math.min(list.length - 1, Math.floor(p * list.length)))];
    const loop = (list, fps) => list[Math.floor(T * fps + (f.x % 5)) % list.length];
    let i;
    if (f.dead) i = pick([18, 19], (f.deadT || 0) / 0.6);
    else if (f.state === 'hit') i = 16;
    else if (f.state === 'dizzy') i = 17;
    else if (f.state === 'tele') {
      const p = 1 - Math.max(0, f.tele) / (f.teleMax || 1);
      i = f.atk === 'swing' ? pick([8, 9], p) : f.atk === 'dash' ? pick([4, 5], p) : 12;
    } else if (f.state === 'swing') i = pick([10, 11], 1 - f.swingT / 0.42);
    else if (f.state === 'dash') i = loop([6, 7], 14);
    else if (f.state === 'jump') i = pick([13, 14, 15], f.jumpT / 0.85);
    else i = loop([0, 1, 2, 3], 9);
    const fr = A.frames[i], z = (f.z || 0) * L.k * 0.55, W = D.wheels[i];
    // V58.8.30: apoyado en sus llantas (en el caballito, en la trasera); sin llantas visibles (derrota), como antes.
    const wheelie = i >= 12 && i <= 14;
    const ax = W ? (wheelie ? W[0][0] + 65 : (W[0][0] + W[1][0]) / 2) : -fr[4];
    const gy = W ? (wheelie ? W[0][1] + W[0][2] : Math.max(W[0][1] + W[0][2], W[1][1] + W[1][2])) : fr[3];
    if (f.state === 'dash') for (let n = 1; n <= 3; n++) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.45 - n * 0.12) + ')'; ctx.lineWidth = 3 * k;
      ctx.beginPath(); ctx.moveTo(-90 * k - n * 22 * k, -60 * k + n * 18 * k); ctx.lineTo(-150 * k - n * 30 * k, -60 * k + n * 18 * k); ctx.stroke();
    }
    if (ok(im)) {
      ctx.drawImage(im, fr[0], fr[1], fr[2], fr[3], -ax * sc, -gy * sc - z, fr[2] * sc, fr[3] * sc);
      if (W && !f.dead) {
        const st = spinOf(f.id, (f.v || 0) * k, W, sc);
        for (let n = 0; n < 2; n++) if (W[n][3] !== 0) spinTread((W[n][0] - ax) * sc, (W[n][1] - gy) * sc - z, W[n][2] * sc, st.a[n], st.blur[n], 18 * RAD, 162 * RAD);
      }
    } else { ctx.fillStyle = f.kind === 'cuchara' ? '#e8679a' : '#c8202a'; rr(-86 * k, -110 * k - z, 172 * k, 90 * k, 8 * k); ctx.fill(); }
    if (f.dead) smoke(0, -120 * k, k, T, f.x);
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

  function bus(S, L, T) {   // Sofía en la moto de su mamá
    const P = S.P, sc = L.laneS(P.ly), k = L.k * sc;
    const len = NS.Chase.TUNE.busLen * k, im = img(P.air ? MOTO.air : P.boostT > 0 ? MOTO.boost : MOTO.ride);
    const h = len * MOTO_BOX.h / MOTO_BOX.w;
    const x = L.sx(P.x), ground = L.laneY(P.ly) + 26 * L.k * sc;
    const y = ground - P.z * L.k * 0.55;
    shadow(x, ground, len * (0.45 - Math.min(0.22, P.z / 1600)), 8 * k * (1 - Math.min(0.6, P.z / 800)));
    // Nitro: llamarada por el escape trasero y estela.
    if (P.boostT > 0) {
      for (let i = 0; i < 3; i++) {
        const fl = 34 + Math.sin(T * 40 + i) * 10;
        const g = ctx.createLinearGradient(x - len / 2, 0, x - len / 2 - fl * k * 2, 0);
        g.addColorStop(0, 'rgba(120,220,255,0.95)'); g.addColorStop(0.4, 'rgba(255,170,60,0.8)'); g.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x - len * 0.42 - fl * k, y - h * 0.24 - i * 4 * k, fl * k, (7 - i * 2) * k, 0, 0, 7); ctx.fill();
      }
    }
    const blink = P.invT > 0 && Math.floor(T * 14) % 2 === 0;
    ctx.save();
    ctx.translate(x, y);
    const pitch = P.air ? Math.max(-0.3, Math.min(0.32, -P.vz / 2200)) : 0;
    ctx.rotate(pitch + P.tilt * 0.6 - (P.boostT > 0 ? 0.04 : 0));
    const bob = P.air ? 0 : Math.sin(T * 26) * 0.7 * k;
    if (blink) ctx.globalAlpha = 0.45;
    // V58.8.30: con nitro, estela fantasma de la moto (tres copias que se desvanecen hacia atrás).
    if (ok(im) && P.boostT > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = fxQ >= 0.8 ? 3 : 1; i >= 1; i--) { ctx.globalAlpha = (blink ? 0.45 : 1) * [0, 0.2, 0.12, 0.06][i]; ctx.drawImage(im, MOTO_BOX.x, MOTO_BOX.y, MOTO_BOX.w, MOTO_BOX.h, -len / 2 - i * 16 * k * Math.min(1.4, P.v / 900), -h + bob, len, h); }
      ctx.restore();
    }
    // Viento: líneas que salen de la espalda de Sofía a alta velocidad.
    if (P.v > 800) {
      const wa = Math.min(0.55, (P.v - 800) / 700);
      ctx.strokeStyle = 'rgba(255,255,255,' + wa + ')'; ctx.lineWidth = 1.6 * k; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const ph = ((T * 3.1 + i * 0.27) % 1), yy = -h * (0.82 - i * 0.09) + bob, x0 = -len * (0.18 + ph * 0.5);
        ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 - len * (0.18 + 0.1 * (i % 2)), yy); ctx.stroke();
      }
    }
    if (ok(im)) {
      ctx.drawImage(im, MOTO_BOX.x, MOTO_BOX.y, MOTO_BOX.w, MOTO_BOX.h, -len / 2, -h + bob, len, h);
      // V58.8.30: llantas girando con la velocidad (en el aire siguen girando: la moto no frena en el salto).
      const src = P.air ? MOTO.air : P.boostT > 0 ? MOTO.boost : MOTO.ride, WH = MOTO_WHEELS[src], s = len / MOTO_BOX.w;
      const st = spinOf('sofia', P.v * k, WH, s);
      for (let i = 0; i < 2; i++) {
        const w = WH[i], X = -len / 2 + (w[0] - MOTO_BOX.x) * s, Y = -h + bob + (w[1] - MOTO_BOX.y) * s;
        const tex = wheelTexture(src, im, w);
        if (tex) spinTexture(tex, X, Y, s, st.a[i], st.blur[i]);
        spinTread(X, Y, w[2] * s, st.a[i], st.blur[i], w[3] * RAD, w[4] * RAD);
      }
    } else { ctx.fillStyle = '#2140c8'; rr(-len / 2, -h * 0.5, len, h * 0.4, 8 * k); ctx.fill(); }
    // Luna y Morita viajan en el portabultos, sobre la llanta trasera (encima del sprite para que se vean).
    const lu = img(LUNA), mo = img(MORITA), cs = 28 * k;
    if (ok(mo)) ctx.drawImage(mo, -len * 0.56, -h * 0.5 - cs * 0.72 + bob, cs, cs);
    if (ok(lu) && !(S.cats.t > 0)) ctx.drawImage(lu, -len * 0.44, -h * 0.46 - cs * 0.72 + bob, cs, cs);
    ctx.globalAlpha = 1;
    if (P.hurtT > 0) { ctx.fillStyle = 'rgba(255,40,40,' + (P.hurtT * 0.6) + ')'; ctx.beginPath(); ctx.ellipse(0, -h * 0.5, len * 0.5, h * 0.5, 0, 0, 7); ctx.fill(); }
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
      const a = 0.25 + 0.25 * Math.sin(T * 16);
      if (f.kind === 'maestro' || (DUEL_ART[f.kind] && f.atk === 'swing')) {
        // Alcance de la regla (o de la cuchara): su carril y los dos vecinos, a su altura.
        for (const l of [f.lane - 1, f.lane, f.lane + 1]) {
          if (l < 0 || l > 2) continue;
          const y = L.laneY(l) + 26 * L.k * L.laneS(l), hh = 30 * L.k;
          ctx.fillStyle = 'rgba(255,150,40,' + a + ')'; ctx.fillRect(L.sx(f.x - 150), y - hh, 300 * L.k, hh);
        }
        continue;
      }
      const lanes = f.dropLanes || (f.dropLane != null ? [f.dropLane] : null);
      if (!lanes) continue;
      for (const l of lanes) {
        const y = L.laneY(l) + 26 * L.k * L.laneS(l), hh = 30 * L.k;
        // La piedra del niño cae alrededor de donde va Sofía; tachuelas y cajas, delante.
        // V58.8.29: la embestida del maestro barre el carril desde atrás; su caballito cae delante.
        const mj = !!DUEL_ART[f.kind], dash = mj && f.atk === 'dash';
        const x0 = L.sx(dash ? P.x - 420 : mj ? P.x + 40 : f.kind === 'kid' ? P.x - 80 : P.x + 160);
        const x1 = L.sx(dash ? P.x + 520 : mj ? P.x + 460 : f.kind === 'moto' ? P.x + 620 : f.kind === 'kid' ? P.x + 280 : f.x);
        ctx.fillStyle = 'rgba(255,50,50,' + a + ')'; ctx.fillRect(Math.min(x0, x1), y - hh, Math.abs(x1 - x0), hh);
        ctx.fillStyle = 'rgba(255,230,120,' + (0.6 + a) + ')'; ctx.font = '900 ' + Math.round(18 * L.k) + 'px system-ui,sans-serif';
        ctx.fillText('⚠', x0 + 8, y - 8 * L.k);
      }
    }
  }
  function projectile(q, L, T) {
    const sc = L.laneS(q.ly), k = L.k * sc, x = L.sx(q.x), y = L.laneY(q.ly) + 26 * L.k * sc;
    if (q.kind === 'rock') {
      // Sombra en el carril donde va a caer (crece al bajar) y la piedra en arco.
      const gy = L.laneY(q.lane) + 26 * L.k * L.laneS(q.lane), near = Math.max(0, Math.min(1, 1 - q.z / 260));
      ctx.fillStyle = 'rgba(0,0,0,' + (0.2 + 0.35 * near) + ')'; ctx.beginPath(); ctx.ellipse(x, gy, (8 + 10 * near) * k, (3 + 3 * near) * k, 0, 0, 7); ctx.fill();
      const ry = y - q.z * L.k * 0.55;
      ctx.save(); ctx.translate(x, ry); ctx.rotate(q.spin || 0);
      ctx.fillStyle = '#8b8a86'; ctx.beginPath(); ctx.ellipse(0, 0, 11 * k, 9 * k, 0.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#b4b2ac'; ctx.beginPath(); ctx.ellipse(-3 * k, -3 * k, 4 * k, 3 * k, 0, 0, 7); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(220,220,220,0.5)'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.moveTo(x - 30 * k, ry + 2 * k); ctx.lineTo(x - 14 * k, ry); ctx.stroke();
      return;
    }
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
      const len = 60 + (sd >>> 10) % 120, x = L.W - ((T * v * 1.4 + (sd % 977)) % (L.W + 200));
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
    ctx.fillText('MOTO', pad + 54 * k, top + 17 * k);
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
    const prog = Math.max(0, Math.min(1, (S.routeX ? S.routeX() : P.x) / endX));
    ctx.fillStyle = '#ffcf4a'; rr(tx, ty, tw * prog, 5 * k, 3 * k); ctx.fill();
    for (const s of SEC) { ctx.fillStyle = '#fff'; ctx.fillRect(tx + tw * s.x / endX - 1, ty - 3 * k, 2, 11 * k); }
    ctx.fillStyle = '#ffcf4a'; ctx.beginPath(); ctx.arc(tx + tw * prog, ty + 2.5 * k, 5 * k, 0, 7); ctx.fill();
    // Barra del jefe.
    // V58.8.29: también la del Maestro en su moto roja (jefe del tramo 2).
    const b = S.boss && !S.boss.dead ? S.boss : S.mb && !S.mb.dead ? S.mb : null;
    if (b) {
      const bbw = bw, bbx = bx, bby = by + 40 * k;
      ctx.fillStyle = 'rgba(30,8,10,0.85)'; rr(bbx, bby, bbw, 30 * k, 8 * k); ctx.fill();
      ctx.fillStyle = '#ff9a9a'; ctx.font = '900 ' + Math.round(11 * k) + 'px system-ui,sans-serif'; ctx.textAlign = 'center';
      const doors = b.state === 'doors', open = b.miniboss && (b.state === 'dizzy' || (b.state === 'tele' && b.atk === 'swing'));
      ctx.fillText((doors || open) && Math.floor(T * 6) % 2 ? (doors ? '¡PUERTAS ABIERTAS · EMBISTE!' : b.state === 'dizzy' ? '¡ATURDIDO · EMBÍSTELO!' : '¡LEVANTA LA REGLA · PATÉALO!') : b.name, L.W / 2, bby + 12 * k); ctx.textAlign = 'left';
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
    frameDt = dtR * (S.timeScale || 1);   // V58.8.30: en cámara lenta las llantas también van lentas
    camY += (want - camY) * Math.min(1, dtR * 10);
    if (Math.abs(camY) < 0.3 && want === 0) camY = 0;
    ctx.save(); ctx.translate(0, camY * 0.6); backdrop(S, L); ctx.restore();
    vfxStep(S, frameDt);
    ctx.save(); ctx.translate(0, camY);
    // V58.8.30: golpe de cámara (zoom breve hacia la moto) al aterrizar, despegar o encender el nitro.
    if (VFX.punch > 0.002 && shakeMul > 0) {
      const px = L.sx(P.x), py = L.laneY(P.ly), z = 1 + VFX.punch * Math.min(1, shakeMul);
      ctx.translate(px, py); ctx.scale(z, z); ctx.translate(-px, -py);
    }
    road(S, L, T);
    vfxGround(L);
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
    vfxBurst(S, L);
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
    if (S.state === 'playing') bossCard(S, L, dtR);
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

  NS.ChaseRender = { init, draw, setOptions, urls, WHEELS: { MOTO_WHEELS, RIDER_WHEELS, MJEFE_WHEELS, SENORA_WHEELS, MOTO }, SENORA };
})(typeof globalThis !== 'undefined' ? globalThis : window);
