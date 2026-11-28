/* ¡Se me fue el camión! — construcción del mundo (sin DOM).
   El mundo usa una escala fija (CONFIG.world.sceneScale). Todo se genera de forma determinista
   a partir de la semilla del mundo: mismo tramo, misma geometría, mismos identificadores. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};

  const ALCOVE_W = 112;   // hueco tras la reja
  const GATE_W = 14;
  const ALCOVE_H = 84;    // Sofía mide 62: cabe de pie

  const AQUA_KINDS = new Set(['piranha', 'shark', 'pulpo']);   // V58.2: nadan en carriles del mar abierto

  function buildWorld(opts = {}) {
    const U = NS.util, C = NS.CONFIG, LV = NS.LEVELS, ST = NS.STORY, EN = NS.Enemies, OB = NS.Obstacles, PHY = NS.Physics;
    const S = C.world.sceneScale;
    const diffKey = C.difficulty[opts.difficulty] ? opts.difficulty : 'normal';
    const diff = C.difficulty[diffKey];
    const seq = opts.levels || LV.LEVEL_SEQUENCE; // opts.levels: subconjunto para validar un nivel suelto (herramientas)
    const seed = opts.seed ?? 20261026;

    const W = {
      version: C.version, difficulty: diffKey, seed,
      scenes: [], platforms: [], solids: [], hazards: [], foes: [], pickups: [], doors: [], rooms: [],
      checkpoints: [], midpoints: [], signs: [], gates: [], shots: [], waters: [], zips: [], ropes: [], cracks: [], breaches: [], bounds: null, bus: null, goal: null, t: 0
    };
    const counters = Object.create(null);
    const nid = (scope, kind) => {
      const k = scope + ':' + kind;
      counters[k] = (counters[k] || 0) + 1;
      return k + ':' + counters[k];
    };

    function addPlatform(p) {
      const pl = Object.assign({
        kind: 'floor', drop: false, draw: true, painted: false, theme: 'escuela', scene: -1,
        region: 'main', h: 12, dx: 0, dy: 0, occupied: []
      }, p);
      pl.id = nid(p.scope || 'w', pl.kind);
      delete pl.scope;
      pl.prevY = pl.y;
      pl.w = pl.x2 - pl.x1;
      W.platforms.push(pl);
      return pl;
    }
    function addSolid(s) {
      const so = Object.assign({ kind: 'block', draw: true, region: 'main', scene: -1, drop: false }, s);
      so.id = nid(s.scope || 'w', so.kind);
      delete so.scope;
      so.y = so.y1;
      so.solid = true;
      W.solids.push(so);
      return so;
    }
    function addPickup(p) {
      const pk = Object.assign({ got: false, region: 'main', scene: -1, r: 10, phase: 0 }, p);
      pk.id = nid(p.scope || 'w', pk.type);
      delete pk.scope;
      pk.baseX = pk.x; pk.baseY = pk.y;
      W.pickups.push(pk);
      return pk;
    }
    const addGem = (x, y, scene, region, rng) => addPickup({ scope: 't' + scene, type: 'gem', x, y, scene, region, phase: rng ? rng() * 6 : 0 });
    const addFoe = (f) => {
      if (!f) return null;
      f.id = nid('t' + f.scene, f.kind);
      W.foes.push(f);
      return f;
    };

    /* Reserva un hueco horizontal en una plataforma para no amontonar objetos. */
    function claim(pl, w, rng, margin = 28) {
      const lo = pl.x1 + margin + w / 2, hi = pl.x2 - margin - w / 2;
      if (hi < lo) return null;
      for (let tries = 0; tries < 10; tries++) {
        const x = lo + (hi - lo) * rng();
        const a = x - w / 2 - 16, b = x + w / 2 + 16;
        if (pl.occupied.every(([o1, o2]) => b <= o1 || a >= o2)) {
          pl.occupied.push([x - w / 2, x + w / 2]);
          return x;
        }
      }
      return null;
    }
    const reserve = (pl, x1, x2) => pl.occupied.push([x1, x2]);

    /* ---------- Paneles pintados ---------- */
    /* V58 · Cada tramo declara su ancho lateral (`sideWidth`; 0 = mundo trazado entero a mano, sin sectores
       procedurales: mar y órbita). Los mundos con sectores tienen un medio ancho mínimo (`minHalf`) para que el
       arte 16:9 del tramo quepa casi completo en su altura. */
    let y = 0, maxHalf = 0, anySides = false;
    seq.forEach((def, i) => {
      const m = def.map, drawW = m.width * S, drawH = m.height * S;
      const sideWidth = def.sideWidth ?? C.world.sideWidth;
      if (sideWidth > 0) anySides = true;
      maxHalf = Math.max(maxHalf, drawW / 2 + sideWidth);
      W.scenes.push({
        index: i, id: def.id, def, label: def.label, file: def.file, tint: def.tint, wash: def.wash, shade: def.shade,
        theme: def.theme, roomTheme: def.room, map: m, scale: S, x0: -drawW / 2, drawW, drawH, startY: y, endY: y + drawH,
        skin: def.skin || (def.theme === 'escuela' ? 'concrete' : 'stone_rocks'), artPainted: def.art === 'painted', bg: def.bg || null,
        sideWidth, parallax: def.parallax || null, gravity: def.gravity || 1,
        storyIndex: def.storyIndex ?? i, chapter: ST.CHAPTERS[def.storyIndex ?? i], surfaces: [], stairs: [], movers: [], crumbles: [], belts: [], bouncers: [],
        zips: [], mids: [], side: { '-1': [], '1': [] }
      });
      y += drawH;
    });
    const B = Math.ceil(anySides ? Math.max(maxHalf, C.world.minHalf || 0) : maxHalf);
    // Gravedad propia: solo en mundos de un tramo (la órbita). En una secuencia de varios tramos rige la normal.
    W.gravityMul = W.scenes.length === 1 ? W.scenes[0].gravity : 1;
    const worldEnd = y, streetY = worldEnd + C.world.streetDrop;
    const T = C.world.wallThickness;
    W.bounds = { x1: -B, x2: B, y1: -240, y2: streetY + C.world.streetDepth, worldEnd, streetY };
    const sceneAt = (yy) => {
      for (const sc of W.scenes) if (yy >= sc.startY && yy < sc.endY) return sc.index;
      return yy < 0 ? 0 : W.scenes.length - 1;
    };
    W.sceneAt = sceneAt;

    for (const sc of W.scenes) {
      const m = sc.map, X = (sx) => sc.x0 + sx * S, Y = (sy) => sc.startY + sy * S, scope = 't' + sc.index;
      const rng = U.makeRng(U.hashSeed(seed, 'panel', sc.index));
      // V58: en los niveles con arte pintado, solo lo trazado sobre el dibujo queda oculto; lo generado se dibuja.
      sc.surfaces = m.surfaces.map((q) => {
        const art = sc.artPainted && !q.gen;
        return addPlatform({
          scope, kind: 'floor', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 10 * S, drop: false, draw: !art, painted: true,
          hidden: art, guardianPost: !!q.guardianPost, skin: sc.skin, gen: !!q.gen, joined: !!q.joined,
          theme: sc.theme, scene: sc.index, start: !!q.start, exit: !!q.exit, mid: !!q.mid,
          startX: q.startX !== undefined ? X(q.startX) : undefined, midX: q.midX !== undefined ? X(q.midX) : undefined,
          touchesLeft: q.x1 <= 1, touchesRight: q.x2 >= m.width - 1
        });
      });
      if (sc.theme === 'guadalajara' && sc.artPainted) {
        for (const ledge of sc.surfaces.filter(p => p.hidden)) {
          ledge.brackets = [];
          for (let x = ledge.x1 + 20; x < ledge.x2 - 10; x += 108) {
            const below = sc.surfaces.filter(q => q.y > ledge.y && q.y < ledge.y + 135 && x >= q.x1 && x <= q.x2);
            const low = below.length ? Math.min(...below.map(p => p.y)) : ledge.y + 41;
            ledge.brackets.push({ x, low });
          }
        }
      }
      sc.stairs = m.stairs.map((q) => addPlatform({
        scope, kind: 'stair', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 8 * S, drop: true, draw: !(sc.artPainted && sc.def.stairsPainted), painted: true,
        hidden: !!(sc.artPainted && sc.def.stairsPainted), skin: sc.skin, theme: sc.theme, scene: sc.index
      }));
      // V58: `look` es solo el aspecto (camión, carrito, tren, balsa, manta, nave…); la física es la de siempre.
      sc.movers = m.movers.map((q) => addPlatform({
        scope, kind: 'moving', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 11 * S, drop: true, draw: true, look: q.look || null,
        theme: sc.theme, scene: sc.index, baseX1: X(q.x1), baseX2: X(q.x2), baseY: Y(q.y),
        range: q.range * S, vrange: q.vertical * S, speed: q.speed || 1.15, phase: rng() * 6
      }));
      sc.pigeons = (m.pigeons || []).map((q) => addPlatform({
        scope, kind: 'pigeon', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 10 * S, drop: false, draw: true, look: q.look || null,
        theme: sc.theme, scene: sc.index, baseX1: X(q.x1), baseX2: X(q.x2), baseY: Y(q.y),
        range: (q.range || 80) * S, vrange: (q.vertical || 7) * S, speed: q.speed || 1.4, phase: rng() * 6
      }));
      // V50: tejas flojas, bandas eléctricas y sombrillas definidas en el mapa.
      sc.crumbles = (m.crumbles || []).map((q) => addPlatform({
        scope, kind: 'crumble', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 10 * S, drop: true, draw: true, painted: true, look: q.look || null,
        theme: sc.theme, scene: sc.index, crState: 'solid', crT: 0, gone: false
      }));
      sc.belts = (m.belts || []).map((q) => addPlatform({
        scope, kind: 'belt', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 12 * S, drop: true, draw: true, painted: true,
        theme: sc.theme, scene: sc.index, belt: q.speed
      }));
      // Tablones de madera (se atraviesan con BAJAR): ramas, andamios, rejillas.
      sc.planks = (m.planks || []).map((q) => addPlatform({
        scope, kind: 'thin', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 9, drop: true, draw: !(sc.artPainted && q.painted), painted: true,
        hidden: !!(sc.artPainted && q.painted), theme: sc.theme, scene: sc.index, plank: true
      }));
      // V58.1: un trampolín `painted` (hongo gigante del arte marino) ya está dibujado: solo se anima el rebote.
      sc.bouncers = (m.bouncers || []).map((q) => addPlatform({
        scope, kind: 'bounce', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 10, drop: false, draw: true, painted: true,
        theme: sc.theme, scene: sc.index, umbrella: true, look: q.look || null, artPainted: !!(sc.artPainted && q.painted)
      }));
      for (const b of sc.bouncers) reserve(b, b.x1, b.x2);
      // V52 · Agua (lagos, pilas): profunda si mide al menos CONFIG.water.shallowDepth (se nada); si no, se vadea.
      // `banks`: lados con pared de orilla (sólido bajo cuyo tope queda 3 u sobre el agua y se sube nadando).
      // Un lado con suelo a la altura del agua no lleva pared: ahí la orilla es ese suelo.
      sc.waters = (m.water || []).map((q) => {
        const z = { id: nid(scope, 'agua'), x1: X(q.x1), x2: X(q.x2), y: Y(q.y), y2: Y(q.y + q.depth), scene: sc.index,
          theme: sc.theme, kind: q.kind || 'lago', banks: q.banks || [], sea: !!q.sea, boss: !!q.boss, breach: !!q.breach,
          toStreet: !!q.toStreet, drains: (q.drains || []).map((d) => ({ x1: X(d.x1), x2: X(d.x2) })) };
        // V58.2: un mar «hasta la calle» llega al lecho marino, donde está la meta (la escotilla de rescate).
        if (z.toStreet) { z.y2 = streetY; z.x1 = Math.min(z.x1, -B); z.x2 = Math.max(z.x2, B); }
        z.deep = z.y2 - z.y >= C.water.shallowDepth;
        (W.waters = W.waters || []).push(z);
        for (const side of z.banks) {
          const bx = side === 'left' ? z.x1 - 12 : z.x2;
          addSolid({ scope, kind: 'bank', x1: bx, x2: bx + 12, y1: z.y - 3, y2: z.y2 + 14, scene: sc.index, theme: sc.theme, draw: false, water: z.id });
        }
        // El fondo del agua profunda es sólido: desde abajo no se entra al agua (es techo para lo que está debajo).
        // V58: los desagües son huecos en ese fondo (por ahí cae el agua en cascada y se sale buceando).
        if (z.deep && !z.toStreet && !(sc.theme==='submarino' && sc.def.seamlessPainted)) {
          let x = z.x1 - 12;
          for (const d of z.drains.slice().sort((a, b) => a.x1 - b.x1)) {
            if (d.x1 - x > 1) addSolid({ scope, kind: 'bank', x1: x, x2: d.x1, y1: z.y2, y2: z.y2 + 10, scene: sc.index, theme: sc.theme, draw: false, water: z.id, bottom: true });
            x = d.x2;
          }
          if (z.x2 + 12 - x > 1) addSolid({ scope, kind: 'bank', x1: x, x2: z.x2 + 12, y1: z.y2, y2: z.y2 + 10, scene: sc.index, theme: sc.theme, draw: false, water: z.id, bottom: true });
        }
        return z;
      });
      // V58 · Tirolesas (cables entre dos anclas) y bloques sólidos dibujados (pilares de coral).
      sc.zips = (m.zips || []).map((q) => {
        const z = PHY.makeZip(X(q.x1), Y(q.y1), X(q.x2), Y(q.y2), { id: nid(scope, 'tirolesa'), scene: sc.index, theme: sc.theme, look: q.look || 'cable', painted: !!(sc.artPainted && q.painted) });
        W.zips.push(z);
        return z;
      });
      // V58.2: cuerdas para columpiarse (ancla y largo) y brechas dibujadas en la roca del mar.
      for (const q of m.ropes || []) W.ropes.push(PHY.makeRope(X(q.x), Y(q.y), q.len * S, { id: nid(scope, 'cuerda'), scene: sc.index, theme: sc.theme, look: q.look || 'cuerda', arc: !!q.arc, base: q.base !== undefined ? Y(q.base) : null }));
      for (const b of m.breaches || []) W.breaches.push({ x1: X(b.x1), x2: X(b.x2), y1: Y(b.y1), y2: Y(b.y2), scene: sc.index });
      sc.swimLanes = (m.swimLanes || []).map((l) => ({ y: Y(l.y), x1: X(l.x1), x2: X(l.x2) }));
      // Repisas dentro de un mar abierto: ahí viven cangrejos y niños buzos; Sofía nada (no se apoya ni usa puertas).
      const seaZones = sc.waters.filter((z) => z.sea && z.deep);
      if (seaZones.length) {
        for (const p of W.platforms) {
          if (p.scene !== sc.index || p.region !== 'main') continue;
          if (seaZones.some((z) => p.y > z.y + 4 && p.y < z.y2 && p.x2 > z.x1 && p.x1 < z.x2)) p.underwater = true;
        }
      }
      // V58.1: grietas en la roca pintada (solo dibujo; por ahí se cae a la caverna de abajo).
      for (const c of m.cracks || []) W.cracks.push({ x1: X(c.x1), x2: X(c.x2), y1: Y(c.y1), y2: Y(c.y2), scene: sc.index });
      // V58.1: `draw: false` = relieve que ya pinta el arte (roca y meseta del mar trazadas sobre el dibujo).
      for (const q of m.blocks || []) addSolid({ scope, kind: q.kind || 'block', x1: X(q.x1), x2: X(q.x2), y1: Y(q.y1), y2: Y(q.y2), scene: sc.index, theme: sc.theme, draw: q.draw !== false });
      // V58.6: barda de azotea rematada con vidrios rotos: muro sólido (se dibuja) y los vidrios de arriba lastiman.
      for (const q of m.bardas || []) {
        const b = addSolid({ scope, kind: 'barda', x1: X(q.x1), x2: X(q.x2), y1: Y(q.y1), y2: Y(q.y2), scene: sc.index, theme: sc.theme });
        const glass = OB.addSpikes(W, { scope, x: (b.x1 + b.x2) / 2, y: b.y1, w: b.x2 - b.x1 + 6, scene: sc.index, plat: null });
        glass.look = 'vidrios';
      }
      // V58.6: letreros propios del nivel (p. ej. cómo usar el columpio para cruzar la barda).
      (m.signs || []).forEach((q, k) => W.signs.push({ id: scope + ':letrero:nivel' + k, x: X(q.x), y: Y(q.y), text: q.text, scene: sc.index, region: 'main', seenT: -99 }));
      m.gems.forEach((q) => addGem(X(q.x), Y(q.y), sc.index, 'main', rng));
      let start = sc.surfaces.find((s) => s.start);
      if (m.shore && sc.index === 0) {
        const cfg = m.shore, k = sc.drawW / cfg.width;
        const sea = sc.waters.find(z => z.sea), floorY = sea.y - cfg.freeboard;
        const top = floorY - cfg.floor * k;
        W.shore = { file: cfg.file, x: sc.x0, top, width: sc.drawW, height: sc.startY - top, floorY };
        W.bounds.y1 = Math.min(W.bounds.y1, top - 65);
        start.start = false;
        start = addPlatform({ scope, scene: sc.index, theme: sc.theme, kind: 'floor',
          x1: sc.x0 + cfg.left * k, x2: sc.x0 + cfg.right * k, y: floorY, startX: sc.x0 + cfg.landing * k,
          start: true, shore: true, draw: false, painted: true });
        sc.surfaces.unshift(start);
      }
      sc.startPlatform = start;
      reserve(start, start.x1, start.x2); // el punto de control queda despejado
      W.checkpoints.push({ id: scope + ':parada', scene: sc.index, x: start.startX, y: start.y, plat: start, active: false });
      const exit = sc.surfaces.find((s) => s.exit);
      sc.exitPlatform = exit;
      const exitX = X(m.exitX);
      reserve(exit, exitX - 44, exitX + 44);
      sc.exitX = exitX;
      // V58 · Parada intermedia (inicio de la mitad nueva del nivel): reapareces ahí si caes después.
      const midS = sc.surfaces.find((s) => s.mid);
      if (midS) {
        const mx = U.clamp(midS.midX ?? midS.x1 + 40, midS.x1 + 24, midS.x2 - 24);
        reserve(midS, mx - 34, mx + 34);
        sc.midPlatform = midS;
        W.midpoints.push({ id: scope + ':parada-media', scene: sc.index, x: mx, y: midS.y, plat: midS, active: false, mid: true });
      }
    }

    /* ---------- Escaleras de transición entre tramos ---------- */
    for (let i = 0; i < W.scenes.length - 1; i++) {
      const from = W.scenes[i], to = W.scenes[i + 1], count = 11, ex = from.exitPlatform;
      if (from.def.seamlessPainted && to.def.seamlessPainted) continue; // las repisas del arte conectan ambos tramos
      const xB = to.startPlatform.startX, yB = to.startPlatform.y, yA = ex.y;
      const stepW = 34 * S;
      // V58: la salida de los niveles nuevos es muy ancha; la escalera arranca justo afuera de su extremo más
      // cercano a la parada siguiente (bajo la plataforma no habría por dónde dejarse caer).
      const xA = from.map.v58 ? (Math.abs(xB - ex.x1) <= Math.abs(xB - ex.x2) ? ex.x1 - stepW * 0.7 : ex.x2 + stepW * 0.7) : from.exitX;
      for (let k = 0; k < count; k++) {
        const t = (k + 1) / (count + 1), cx = xA + (xB - xA) * t, top = yA + (yB - yA) * t;
        addPlatform({ scope: 't' + i, kind: 'stair', x1: cx - stepW / 2, x2: cx + stepW / 2, y: top, h: 9 * S, drop: true, draw: true, theme: from.theme, scene: i, transition: true });
      }
    }

    /* ---------- Límites físicos: muros exteriores y la calle de la terminal ---------- */
    addSolid({ scope: 'mundo', kind: 'wall', x1: -B - T, y1: -600, x2: -B, y2: W.bounds.y2 + 200, side: -1 });
    addSolid({ scope: 'mundo', kind: 'wall', x1: B, y1: -600, x2: B + T, y2: W.bounds.y2 + 200, side: 1 });
    W.street = addSolid({ scope: 'mundo', kind: 'street', x1: -B - T, y1: streetY, x2: B + T, y2: streetY + C.world.streetDepth + 200 });

    /* ---------- Sectores laterales deterministas ---------- */
    const doorSideOf = (i) => (i % 2 === 0 ? -1 : 1);
    const hasSides = (i) => W.scenes[i].sideWidth > 0;   // V58: mar y órbita no tienen sectores laterales
    for (const side of [-1, 1]) {
      const rng = U.makeRng(U.hashSeed(seed, 'side', side));
      const rows = [];
      for (const sc of W.scenes) {
        if (!hasSides(sc.index)) continue;
        for (const pl of sc.surfaces) {
          if ((side < 0 && pl.touchesLeft) || (side > 0 && pl.touchesRight)) rows.push({ y: pl.y, scene: sc.index, bridge: pl });
        }
      }
      rows.sort((a, b) => a.y - b.y);
      const filled = [];
      for (let k = 0; k < rows.length; k++) {
        filled.push(rows[k]);
        const nextY = k + 1 < rows.length ? rows[k + 1].y : streetY;
        const gap = nextY - rows[k].y;
        if (gap > 165) {
          const n = Math.ceil(gap / 150) - 1;
          for (let j = 1; j <= n; j++) {
            const yy = rows[k].y + (gap * j) / (n + 1);
            if (hasSides(sceneAt(yy))) filled.push({ y: yy, scene: sceneAt(yy), bridge: null });
          }
        }
      }
      // Elegir una fila por tramo para el nicho con reja (lado contrario a la zona inferior).
      for (const sc of W.scenes) {
        if (doorSideOf(sc.index) === side || !hasSides(sc.index)) continue;
        // El nicho necesita hueco libre encima (techo + 16 u de margen) y no debe estar al inicio del tramo.
        const cands = filled.map((r, idx) => ({ r, gap: idx > 0 ? r.y - filled[idx - 1].y : 0 }))
          .filter(({ r, gap }) => r.scene === sc.index && gap >= ALCOVE_H + 28 && r.y > sc.startY + sc.drawH * 0.3 && r.y < sc.endY - 40)
          .sort((a, b) => b.gap - a.gap);
        let pick = cands.length ? cands[0].r : null;
        if (!pick) {
          // V50: si el reparto de filas no deja hueco (filas cada ~105 u), se baja una fila de relleno
          // lo justo para que quepan el nicho y su techo, siempre que la fila siguiente siga lejos.
          const need = ALCOVE_H + 30;
          for (let idx = 1; idx < filled.length - 1 && !pick; idx++) {
            const r = filled[idx], gap = r.y - filled[idx - 1].y, next = filled[idx + 1].y - r.y, shift = need - gap;
            if (r.bridge || r.scene !== sc.index || gap < 80 || shift < 0 || next - shift < 70) continue;
            if (r.y + shift <= sc.startY + sc.drawH * 0.3 || r.y + shift >= sc.endY - 40) continue;
            r.y += shift; pick = r;
          }
        }
        if (pick) pick.alcove = true;
      }
      for (const row of filled) {
        const sc = W.scenes[row.scene];
        const inner = side < 0 ? sc.x0 : sc.x0 + sc.drawW, outer = side < 0 ? -B : B;
        let span = Math.abs(outer - inner);
        const limit = row.alcove ? span - ALCOVE_W - GATE_W : span;
        const segs = [];
        let pos;
        if (row.bridge) { const bw = rng.range(100, 150); segs.push([0, bw, true]); pos = bw; }
        else pos = rng.range(45, 120);
        while (pos < limit - 40) {
          if (segs.length) pos += rng.range(58, 100);
          if (pos >= limit - 40) break;
          let w = rng.range(90, 170);
          if (pos + w > limit - 34) w = limit - pos;
          if (w < 60) break;
          segs.push([pos, pos + w, false]);
          pos += w;
        }
        if (row.alcove) {
          const last = segs[segs.length - 1];
          if (last && limit - last[1] < 130) last[1] = limit; else segs.push([limit - 120, limit, false]);
        }
        const toWorld = (a, b) => (side < 0 ? [inner - b, inner - a] : [inner + a, inner + b]);
        row.platforms = segs.map(([a, b, isBridge], k) => {
          const [x1, x2] = toWorld(a, b);
          const thin = !isBridge && !row.alcove && rng() < 0.3;
          const yy = isBridge || (row.alcove && k === segs.length - 1) ? row.y : row.y + rng.range(-10, 10);
          const pl = addPlatform({
            scope: 't' + row.scene, kind: thin ? 'thin' : 'floor', drop: thin, x1, x2, y: yy, h: thin ? 9 : 14,
            theme: sc.theme, scene: row.scene, sector: side, bridge: isBridge, rowAlcove: !!row.alcove, skin: sc.skin
          });
          sc.side[side].push(pl);
          return pl;
        });
        if (row.alcove) {
          // Nicho cerrado: suelo y techo sólidos, muro exterior y una reja que se abre con la llave.
          const scope = 't' + row.scene;
          const ax = side < 0 ? [-B, -B + ALCOVE_W] : [B - ALCOVE_W, B];
          const gx = side < 0 ? [-B + ALCOVE_W, -B + ALCOVE_W + GATE_W] : [B - ALCOVE_W - GATE_W, B - ALCOVE_W];
          const fx1 = Math.min(ax[0], gx[0]), fx2 = Math.max(ax[1], gx[1]);
          addSolid({ scope, kind: 'block', x1: fx1, y1: row.y, x2: fx2, y2: row.y + 18, theme: sc.theme, scene: row.scene });
          addSolid({ scope, kind: 'block', x1: fx1, y1: row.y - ALCOVE_H - 16, x2: fx2, y2: row.y - ALCOVE_H, theme: sc.theme, scene: row.scene });
          const gate = addSolid({ scope, kind: 'gate', x1: gx[0], y1: row.y - ALCOVE_H, x2: gx[1], y2: row.y, locked: true, scene: row.scene, theme: sc.theme, openT: 0 });
          W.gates.push(gate);
          sc.gate = gate;
          const cx = (ax[0] + ax[1]) / 2;
          addPickup({ scope, type: 'power', power: 'heart', x: cx + side * 30, y: row.y - 30, scene: row.scene, phase: rng() * 6, inAlcove: true });
          for (let g = 0; g < 3; g++) addGem(cx - side * (34 - g * 20), row.y - 30, row.scene, 'main', rng);
        }
      }
    }

    /* ---------- Zonas inferiores (sótanos y alcantarillas) ---------- */
    const RW = C.world.roomW, RH = C.world.roomH;
    for (const sc of W.scenes) {
      const i = sc.index, scope = 't' + i, side = doorSideOf(i);
      const rng = U.makeRng(U.hashSeed(seed, 'room', i));
      // V58: sin sectores laterales (mar, órbita) la trampilla y su salida van en cornisas del propio nivel.
      const pool = hasSides(i) ? sc.side[side]
        : sc.surfaces.filter((p) => !p.start && !p.exit && !p.mid && !p.underwater && p.kind === 'floor' && p.w >= 130);
      const segs = pool.filter((p) => !p.bridge && !p.rowAlcove && p.w >= 100 &&
        p.y > sc.startY + sc.drawH * 0.22 && p.y < sc.startY + sc.drawH * 0.72);
      const doorPl = segs.length ? segs[Math.floor(rng() * segs.length)] : pool.find((p) => p.w >= 90);
      if (!doorPl) continue;
      doorPl.kind = 'floor'; doorPl.drop = false; // la trampilla necesita suelo firme
      const doorX = (doorPl.x1 + doorPl.x2) / 2;
      reserve(doorPl, doorX - 30, doorX + 30);
      const allSide = hasSides(i) ? W.scenes.flatMap((s) => s.side[side]) : pool;
      let target = allSide.find((p) => p !== doorPl && !p.rowAlcove && p.w >= 90 && p.y > doorPl.y + 180 && p.y < doorPl.y + 560);
      const targetPoint = target
        ? { x: (target.x1 + target.x2) / 2, y: target.y, plat: target }
        : { x: W.checkpoints[Math.min(i + 1, W.checkpoints.length - 1)].x, y: W.checkpoints[Math.min(i + 1, W.checkpoints.length - 1)].y, plat: null };
      if (target) { target.kind = 'floor'; target.drop = false; reserve(target, targetPoint.x - 36, targetPoint.x + 36); }

      const rx = C.world.roomOriginX + i * C.world.roomSpacing, ry = Math.round(sc.startY + sc.drawH * 0.5 - RH / 2);
      const room = { id: scope + ':zona', index: i, scene: i, theme: sc.roomTheme, x1: rx, y1: ry, x2: rx + RW, y2: ry + RH, visited: false };
      W.rooms.push(room);
      const reg = room.id;
      addSolid({ scope, kind: 'roomwall', x1: rx - 60, y1: ry + RH, x2: rx + RW + 60, y2: ry + RH + 60, region: reg, scene: i, theme: sc.roomTheme });
      addSolid({ scope, kind: 'roomwall', x1: rx - 60, y1: ry - 60, x2: rx + RW + 60, y2: ry, region: reg, scene: i, theme: sc.roomTheme });
      addSolid({ scope, kind: 'roomwall', x1: rx - 60, y1: ry, x2: rx, y2: ry + RH, region: reg, scene: i, theme: sc.roomTheme });
      addSolid({ scope, kind: 'roomwall', x1: rx + RW, y1: ry, x2: rx + RW + 60, y2: ry + RH, region: reg, scene: i, theme: sc.roomTheme });
      const j = () => rng.range(-10, 10);
      const P1 = addPlatform({ scope, kind: 'floor', x1: rx + 30, x2: rx + 210, y: ry + 120, h: 16, theme: sc.roomTheme, scene: i, region: reg });
      const P2 = addPlatform({ scope, kind: 'thin', drop: true, x1: rx + 280 + j(), x2: rx + 440 + j(), y: ry + 232, h: 9, theme: sc.roomTheme, scene: i, region: reg });
      const P3 = addPlatform({ scope, kind: 'floor', x1: rx + 520 + j(), x2: rx + 712, y: ry + 152, h: 16, theme: sc.roomTheme, scene: i, region: reg });
      const P4 = addPlatform({ scope, kind: 'thin', drop: true, x1: rx + 70 + j(), x2: rx + 228, y: ry + 304, h: 9, theme: sc.roomTheme, scene: i, region: reg });
      const floorTop = ry + RH;
      const entryDoor = { id: scope + ':entrada', kind: sc.theme === 'escuela' ? 'trampilla' : 'alcantarilla', x: doorX, y: doorPl.y, plat: doorPl, scene: i, region: 'main', room: room.id, to: { x: rx + 70, y: P1.y, region: reg }, phase: rng() * 6 };
      const exitDoor = { id: scope + ':salida', kind: 'salida', x: rx + RW - 64, y: floorTop, plat: null, scene: i, region: reg, room: room.id, to: { x: targetPoint.x, y: targetPoint.y, region: 'main' }, phase: rng() * 6 };
      W.doors.push(entryDoor, exitDoor);
      room.entry = entryDoor; room.exit = exitDoor;
      const si = sc.storyIndex ?? i, item = ST.ITEMS[si];
      if (item) addPickup({ scope, type: 'item', itemIndex: si, itemId: item.id, x: (P3.x1 + P3.x2) / 2 + 20, y: P3.y - 32, scene: i, region: reg, r: 14 });
      if (sc.gate) addPickup({ scope, type: 'key', keyFor: sc.gate.id, x: (P2.x1 + P2.x2) / 2, y: P2.y - 30, scene: i, region: reg, r: 12 });
      [[P1.x2 - 26, P1.y - 30], [(P4.x1 + P4.x2) / 2, P4.y - 30], [rx + 300, floorTop - 30], [rx + 470, floorTop - 30], [P3.x1 + 30, P3.y - 30]]
        .forEach(([gx, gy]) => addGem(gx, gy, i, reg, rng));
      // Contenido hostil de la zona: una amenaza que escala con el tramo.
      const floorPl = { x1: rx + 20, x2: rx + RW - 120, y: floorTop, occupied: [] }; // tramo de patrulla (no pisa la salida)
      if (i >= 1) OB.addSpikes(W, { scope, x: rx + 380, y: floorTop, w: 40, scene: i, region: reg });
      // V58: en el mar vigila un cangrejo y en la órbita un robot (no una rata de alcantarilla).
      const guardKind = sc.roomTheme === 'gruta' ? 'guardian' : sc.theme === 'submarino' ? 'crab' : sc.theme === 'espacial' ? 'robot' : i >= 3 ? 'bravo' : i >= 1 ? 'dog' : 'rat';
      addFoe(EN.create(guardKind, { x: rx + 230, y: floorTop, plat: floorPl, scene: i, region: reg, diff, rng }));
      if (i >= 2 && sc.roomTheme !== 'gruta') addFoe(EN.create('bat', { x: rx + 470, y: ry + 22, scene: i, region: reg, diff, rng }));
    }

    /* ---------- Jefes (V50) ----------
       Arena: la plataforma de salida si es amplia (≥ 200 u); si no, la cornisa amplia más baja del tramo
       (en los mapas de la escuela la salida medía 123 u y el jefe ocupaba toda la plataforma).
       Voladores: se colocan donde hay más espacio libre arriba, a una altura que deja pasar a Sofía por debajo;
       el murciélago cuelga bajo una cornisa si la hay lo bastante alta. */
    for (const sc of W.scenes) {
      if (!sc.def.boss) continue;
      const bossDef = sc.def.boss, type = EN.TYPES[bossDef.kind], scope = 't' + sc.index;
      const rng = U.makeRng(U.hashSeed(seed, 'jefe', sc.index));
      const exit = sc.exitPlatform, exitX = sc.exitX;
      let arena = exit;
      if (exit.w < 200) {
        const c = sc.surfaces.filter((q) => !q.start && q !== exit && q.w >= 200 && q.y > sc.startY + sc.drawH * 0.55).sort((a, b) => b.y - a.y)[0];
        if (c) arena = c;
      }
      sc.bossArena = arena;
      const half = type.w * 0.75;
      let bossX;
      if (arena === exit) {
        const offset = Math.min(58, (exit.x2 - exit.x1) * 0.2);
        bossX = U.clamp(exitX + (sc.index % 2 === 0 ? offset : -offset), exit.x1 + half, exit.x2 - half);
      } else bossX = U.clamp((arena.x1 + arena.x2) / 2, arena.x1 + half, arena.x2 - half);
      const lidAt = (x) => W.platforms.filter((p) => p.region === 'main' && p.y < arena.y - 20 && p.y > arena.y - 170 && p.x1 < x + 26 && p.x2 > x - 26)
        .sort((a, b) => b.y - a.y)[0];
      const clearance = (x) => { const l = lidAt(x); return l ? arena.y - l.y : 999; };
      if (type.flyer) {
        let best = bossX, bestC = clearance(bossX);
        for (let x = arena.x1 + 30; x <= arena.x2 - 30; x += 12) {
          const c = clearance(x);
          if (c > bestC + 1 || (Math.abs(c - bestC) <= 1 && Math.abs(x - bossX) < Math.abs(best - bossX))) { best = x; bestC = c; }
        }
        bossX = best;
      }
      reserve(arena, bossX - half, bossX + half);
      let flyY = arena.y;
      if (bossDef.kind === 'bat') { const l = lidAt(bossX); flyY = l && arena.y - l.y >= 110 ? l.y + (l.h || 10) + 14 : arena.y - 84; }
      else if (bossDef.kind === 'pigeon' || bossDef.kind === 'drone') flyY = arena.y - 84;
      // Jefe marino: está dentro del último estanque profundo, no levitando
      // en la superficie de salida. Conserva el orden del recorrido.
      const aquaticBoss = bossDef.kind === 'shark' || bossDef.kind === 'poseidon';
      const bossWater = aquaticBoss
        ? (W.waters.find((z) => z.scene === sc.index && z.deep && z.boss) || W.waters.filter((z) => z.scene === sc.index && z.deep).slice(-1)[0]) : null;
      let bossLane = null;
      if (bossWater && bossWater.toStreet) {
        // V58.2: en el mar que baja hasta el lecho, el jefe custodia la salida (la arena), a media altura sobre ella.
        const span = Math.max(260, arena.x2 - arena.x1);
        const cx = (arena.x1 + arena.x2) / 2;
        bossLane = { x1: Math.max(bossWater.x1 + 30, cx - span / 2 - 60), x2: Math.min(bossWater.x2 - 30, cx + span / 2 + 60) };
        bossX = cx; flyY = Math.max(bossWater.y + 80, arena.y - 70);
      } else if (bossWater) {
        bossX = (bossWater.x1 + bossWater.x2) / 2;
        flyY = bossWater.y + (bossWater.y2 - bossWater.y) * 0.52;
        bossLane = { x1: bossWater.x1 + 25, x2: bossWater.x2 - 25 };
      }
      const boss = EN.create(bossDef.kind, {
        id: scope + ':jefe', x: bossX, y: flyY, plat: arena, scene: sc.index,
        region: 'main', diff, rng, isBoss: true, bossName: bossDef.name, hp: bossDef.hp,
        waterZone: bossWater, lane: bossLane || { x1: Math.max(W.bounds.x1 + 30, arena.x1 + 22), x2: Math.min(W.bounds.x2 - 30, arena.x2 - 22) }
      });
      boss.arena = arena;
      addFoe(boss);
    }

    /* ---------- Enemigos, obstáculos y poderes del tramo ---------- */
    for (const sc of W.scenes) {
      const i = sc.index, def = sc.def, scope = 't' + i;
      const rng = U.makeRng(U.hashSeed(seed, 'encuentros', i, diffKey));
      // V50: la plataforma de salida es la arena del jefe; los enemigos comunes ya no la comparten.
      // V58: la fila de la parada intermedia también queda despejada (reaparecer junto a un enemigo no es justo).
      const panel = sc.surfaces.filter((s) => !s.start && !s.exit && !s.mid && s !== sc.bossArena && s.w >= 96);
      const dryPanel = panel.filter((s) => !s.underwater);
      const sides = [...sc.side[-1], ...sc.side[1]].filter((p) => !p.rowAlcove && p.w >= 100 && p.kind !== 'bounce');

      // Letreros (tutorial en el tramo 1, historia en el resto).
      if (def.tutorial) {
        const at = { start: sc.surfaces[0], stairs: sc.surfaces[2], mid: sc.surfaces[5], low: sc.surfaces[7] };
        ST.SIGNS.tutorial.forEach((sg) => {
          let pl = at[sg.at], x = sg.at === 'start' ? pl && pl.x1 + 70 : pl && pl.x1 + 46;
          if (sg.at === 'side') {
            // El letrero de las trampillas va junto a la trampilla del tramo, donde se necesita.
            const d = W.doors.find((q) => q.scene === i && q.region === 'main' && q.kind !== 'salida');
            pl = d && d.plat;
            if (pl) x = d.x - 56 > pl.x1 + 14 ? d.x - 56 : Math.min(pl.x2 - 14, d.x + 56);
            else { pl = sc.surfaces[0]; x = pl.x1 + 22; }
          }
          reserve(pl, x - 20, x + 20);
          W.signs.push({ id: scope + ':letrero:' + sg.at, x, y: pl.y, text: sg.text, scene: i, region: 'main', seenT: -99 });
        });
      } else {
        const pl = sc.startPlatform, x = pl.x1 + 30;
        W.signs.push({ id: scope + ':letrero:historia', x, y: pl.y, text: ST.SIGNS.story[sc.storyIndex ?? i], scene: i, region: 'main', seenT: -99 });
      }
      const mp = W.midpoints.find((q) => q.scene === i);
      if (mp && ST.SIGNS.mid) {
        const sx = U.clamp(mp.x + (mp.x < (mp.plat.x1 + mp.plat.x2) / 2 ? 46 : -46), mp.plat.x1 + 12, mp.plat.x2 - 12);
        reserve(mp.plat, sx - 16, sx + 16);
        W.signs.push({ id: scope + ':letrero:media', x: sx, y: mp.y, text: ST.SIGNS.mid[(sc.storyIndex ?? i) % ST.SIGNS.mid.length], scene: i, region: 'main', seenT: -99 });
      }

      // Enemigos del panel pintado.
      for (const post of panel.filter(p => p.guardianPost)) {
        const doors = W.doors.filter(d => d.plat === post);
        const left = post.x1 + 28, right = post.x2 - 28;
        const middle = (left + right) / 2;
        const end = doors.some(d => d.x < middle) ? right : left;
        const start = doors.length ? (middle + end) / 2 : middle;
        const guard = EN.create('guardian', { x: start, y: post.y, plat: post, scene: i, diff, rng });
        if (doors.length) {
          guard.minX = end === right ? middle + 40 : left;
          guard.maxX = end === right ? right : middle - 40;
        }
        addFoe(guard);
      }
      // V58.8.27: con el modo misiones (opts.cast) cada tramo usa su reparto protagonista (`def.cast`, ver levels.js).
      const foeList = opts.cast && def.cast ? def.cast : def.foes;
      const budget = foeList.length ? Math.max(1, Math.round(def.foeBudget * diff.foeDensity)) : 0;
      let walkersOn = new Set();
      for (let n = 0; n < budget; n++) {
        const kind = foeList[n % foeList.length];
        addFoe(placeFoe(kind, panel, rng, walkersOn, sc, scope, diff));
      }
      // Enemigos de los sectores laterales.
      const sideBudget = def.sideFoes && foeList.length ? Math.max(1, Math.round(def.sideFoes * diff.foeDensity)) : 0;
      walkersOn = new Set();
      for (let n = 0; n < sideBudget; n++) {
        const kind = foeList[(n + 1) % foeList.length];
        addFoe(placeFoe(kind, sides, rng, walkersOn, sc, scope, diff));
      }
      // Obstáculos: panel y sectores.
      const obsBudget = Math.max(1, Math.round(def.obstacleBudget * (0.8 + 0.2 * diff.foeDensity)));
      for (let n = 0; n < obsBudget; n++) {
        const type = def.obstacles[n % def.obstacles.length];
        placeObstacle(type, n % 2 === 0 ? dryPanel : sides, rng, sc, scope, diff);
      }
      if (def.obstacles.includes('spikes') || def.obstacles.includes('spark')) {
        placeObstacle(def.obstacles.includes('spark') && i >= 2 ? 'spark' : 'spikes', sides, rng, sc, scope, diff);
      }
      // V58.3 · Peligros propios de cada mundo, repartidos parejo a lo alto del nivel (más en DIFÍCIL, menos en FÁCIL).
      const many = (base) => Math.max(2, Math.round(base * (diffKey === 'facil' ? 0.67 : diffKey === 'dificil' ? 1.34 : 1)));
      if (sc.theme === 'submarino') {
        // Corrientes: franjas horizontales del mar abierto, con sentido alterno y fases distintas. Dejan libres la
        // superficie (350 u) y el fondo junto a la escotilla (520 u).
        for (const z of (sc.waters || []).filter((q) => q.deep && q.sea)) {
          const top = z.y + 350, bot = z.y2 - 520, n = many(6), H = OB.CURRENT.h;
          if (bot - top < H * 2) continue;
          for (let k = 0; k < n; k++) {
            const cy = top + (bot - top) * (k + 0.5) / n;
            OB.addCurrent(W, { scope, x1: z.x1, x2: z.x2, y1: cy - H / 2, y2: cy + H / 2, dir: (k + i) % 2 ? -1 : 1, phase: k * 1.7, scene: i });
          }
        }
      }
      if (sc.theme === 'espacial') {
        // Asteroides: sobre plataformas secas y anchas (no la de salida, la parada intermedia ni la del jefe), lejos del inicio.
        const startY = sc.surfaces.find((s) => s.start)?.y ?? -Infinity;
        const cands = dryPanel.filter((p) => p.kind === 'floor' && p.w >= 150 && p.y > startY + 250).sort((a, b) => a.y - b.y);
        const n = Math.min(cands.length, many(9));
        for (let k = 0; k < n; k++) {
          const pl = cands[Math.floor((k + 0.5) * cands.length / n)];
          OB.addAsteroid(W, { scope, plat: pl, dir: k % 2 ? -1 : 1, wait: 0.6 + (k % 3) * 0.5, seed: k + 1, scene: i });
        }
      }
      // Toldos rebotadores en los sectores (desde el tramo 2).
      if (i >= 1) {
        const cands = sides.filter((p) => !p.bridge && p.w <= 150 && p.occupied.length === 0);
        const pl = cands.length ? cands[Math.floor(rng() * cands.length)] : null;
        if (pl) {
          pl.kind = 'bounce'; pl.drop = false; pl.h = 10;
          reserve(pl, pl.x1, pl.x2);
          const cx = (pl.x1 + pl.x2) / 2;
          addGem(cx, pl.y - 150, i, 'main', rng);
          addGem(cx, pl.y - 205, i, 'main', rng);
        }
      }
      // Cristales en los sectores.
      for (const pl of sc.side[-1].concat(sc.side[1])) {
        if (pl.rowAlcove || pl.kind === 'bounce' || rng() > 0.42) continue;
        const x = claim(pl, 20, rng, 18);
        if (x !== null) addGem(x, pl.y - 30, i, 'main', rng);
      }
      // Un poder por tramo en el panel.
      const powPl = dryPanel.length ? dryPanel[Math.floor(rng() * dryPanel.length)] : null;
      if (powPl) {
        const x = claim(powPl, 26, rng, 24);
        if (x !== null) addPickup({ scope, type: 'power', power: ['shield', 'magnet', 'heart'][i % 3], x, y: powPl.y - 32, scene: i, phase: rng() * 6 });
      }
    }

    function placeFoe(kind, cands, rng, walkersOn, sc, scope, diff) {
      const T = EN.TYPES[kind];
      if (!T) return null;
      if (AQUA_KINDS.has(kind) && sc.swimLanes && sc.swimLanes.length) {
        // V58.2 · Mar abierto: cada pez, tiburón o pulpo patrulla su propio carril de nado (trazado libre de roca).
        const z = W.waters.find((q) => q.scene === sc.index && q.sea && q.deep);
        const used = W.foes.filter((f) => f.scene === sc.index && f.swimLane !== undefined).map((f) => f.swimLane);
        const cap = { piranha: 6, shark: 2, pulpo: 4 }[kind];
        if (!z || W.foes.filter((f) => f.scene === sc.index && f.kind === kind).length >= cap) return null;
        const order = sc.swimLanes.map((l, i) => i).filter((i) => !used.includes(i));
        if (!order.length) return null;
        const li = order[Math.floor(rng() * order.length)], L = sc.swimLanes[li];
        const x = L.x1 + (L.x2 - L.x1) * (0.25 + 0.5 * rng());
        const f = EN.create(kind, { x, y: L.y, waterZone: z, lane: { x1: L.x1, x2: L.x2 }, scene: sc.index, diff, rng });
        f.swimLane = li;
        return f;
      }
      if (kind === 'piranha') {
        // Solo en pozas profundas; repartir amenazas sin amontonarlas.
        // V58: el mar abierto admite seis repartidas a lo ancho y a distintas profundidades.
        const waters = W.waters.filter(z => z.scene === sc.index && z.deep);
        const available = waters.map(z => ({ z, count: W.foes.filter(f => f.kind === 'piranha' && f.waterZone === z).length }))
          .filter(q => q.count < (q.z.sea ? 6 : 2)).sort((a, b) => a.count - b.count);
        if (!available.length) return null;
        const slot = available[0];
        const z = slot.z;
        const FX = [0.32, 0.68, 0.14, 0.86, 0.5, 0.25], FY = [0.34, 0.67, 0.5, 0.8, 0.25, 0.58];
        const x = z.x1 + (z.x2 - z.x1) * FX[slot.count % FX.length];
        const y = z.y + Math.max(28, (z.y2 - z.y) * FY[slot.count % FY.length]);
        return EN.create(kind, { x, y, waterZone: z,
          lane: { x1: z.x1 + 21, x2: z.x2 - 21 },
          scene: sc.index, diff, rng });
      }
      if (!cands.length) return null;
      for (let tries = 0; tries < 12; tries++) {
        const pl = cands[Math.floor(rng() * cands.length)];
        if (T.walker) {
          if (walkersOn.has(pl) || pl.w < (T.minPlatform || 100)) continue;
          if (kind === 'chile') {
            const end = rng() < 0.5 ? pl.x1 + 22 : pl.x2 - 22;
            const a = end - 18, b = end + 18;
            if (!pl.occupied.every(([o1, o2]) => b <= o1 || a >= o2)) continue;
            pl.occupied.push([a, b]);
            walkersOn.add(pl);
            pl.hasWalker = true;
            return EN.create(kind, { scope, x: end, y: pl.y, plat: pl, scene: sc.index, diff, rng });
          }
          walkersOn.add(pl);
          pl.hasWalker = true;
          const x = pl.x1 + pl.w * (0.3 + 0.4 * rng());
          return EN.create(kind, { scope, x, y: pl.y, plat: pl, scene: sc.index, diff, rng });
        }
        if (kind === 'bat') {
          // Duerme colgado bajo una cornisa: necesita espacio libre debajo.
          const x = pl.x1 + pl.w * (0.25 + 0.5 * rng());
          return EN.create(kind, { scope, x, y: pl.y + (pl.h || 10) + 12, scene: sc.index, diff, rng });
        }
        if (kind === 'pigeon' || kind === 'drone') {
          let x = (pl.x1 + pl.x2) / 2;
          const y = pl.y - 118;
          const safe = [W.checkpoints[sc.index], ...W.midpoints.filter(p => p.scene === sc.index)];
          const lane = { x1: Math.max(W.bounds.x1 + 40, x - 160), x2: Math.min(W.bounds.x2 - 40, x + 160) };
          for (const cp of safe) {
            if (Math.abs(y - cp.y) > 138 || cp.x + 112 < lane.x1 || cp.x - 112 > lane.x2) continue;
            const margin = 135, span = lane.x2 - lane.x1, lo = W.bounds.x1 + 40, hi = W.bounds.x2 - 40;
            const rightSide = x >= cp.x ? hi - cp.x >= margin + 44 : cp.x - lo < margin + 44;
            if (rightSide) { lane.x1 = cp.x + margin; lane.x2 = Math.min(hi, lane.x1 + span); }
            else { lane.x2 = cp.x - margin; lane.x1 = Math.max(lo, lane.x2 - span); }
            x = (lane.x1 + lane.x2) / 2;
          }
          return EN.create(kind, { scope, x, y, lane, scene: sc.index, diff, rng });
        }
      }
      return null;
    }

    function placeObstacle(type, cands, rng, sc, scope, diff) {
      if (!cands.length) return;
      for (let tries = 0; tries < 10; tries++) {
        const pl = cands[Math.floor(rng() * cands.length)];
        if (type === 'spikes' && pl.w >= 110) {
          const x = claim(pl, 38, rng, 30); if (x === null) continue;
          OB.addSpikes(W, { scope, x, y: pl.y, w: 38, scene: sc.index, plat: pl }); return;
        }
        if (type === 'spark' && pl.w >= 140) {
          const x = claim(pl, 66, rng, 30); if (x === null) continue;
          OB.addSpark(W, { scope, x, y: pl.y, w: 66, scene: sc.index, plat: pl, phase: rng() * 3, diff }); return;
        }
        if (type === 'puddle' && pl.w >= 110) {
          const x = claim(pl, 84, rng, 18); if (x === null) continue;
          OB.addPuddle(W, { scope, x, y: pl.y, w: 84, scene: sc.index, plat: pl }); return;
        }
        if (type === 'crate' && pl.w >= 130 && !pl.hasWalker) { // una caja no debe aparecer encima de un enemigo
          const x = claim(pl, 36, rng, 34); if (x === null) continue;
          const cr = addSolid({ scope, kind: 'crate', x1: x - 17, y1: pl.y - 34, x2: x + 17, y2: pl.y, breakable: true, scene: sc.index, theme: sc.theme, gems: 2 });
          cr.plat = pl; return;
        }
        if (type === 'pot') {
          // Maceta colgada bajo la cornisa superior; cae al pasar por debajo.
          const above = W.platforms.filter((q) => q.scene === sc.index && q.kind === 'floor' && q.region === 'main' &&
            q.y < pl.y - 100 && q.y > pl.y - 240 && Math.min(q.x2, pl.x2) - Math.max(q.x1, pl.x1) > 70)
            .sort((a, b) => b.y - a.y)[0];
          if (!above) continue;
          const lo = Math.max(above.x1, pl.x1) + 30, hi = Math.min(above.x2, pl.x2) - 30;
          if (hi <= lo) continue;
          const x = lo + (hi - lo) * rng();
          OB.addPot(W, { scope, x, hangY: above.y + (above.h || 10) + 2, floorY: pl.y, scene: sc.index, plat: pl }); return;
        }
      }
    }

    /* ---------- V58.7 · Zonas secretas (mar y Luna) ----------
       Se arman al final: así ningún reparto anterior (peces del mar abierto, jefe, corrientes, asteroides) toma su agua
       ni sus repisas. Ver LEVELS.SECRET_ROOMS: el recorrido está trazado en px del arte panorámico de cada zona. */
    let secretN = 0;
    for (const sc of W.scenes) {
      const Z = sc.def.secret && LV.SECRET_ROOMS && LV.SECRET_ROOMS[sc.def.secret];
      if (!Z) continue;
      const i = sc.index, scope = 't' + i, rng = U.makeRng(U.hashSeed(seed, 'secreto', i));
      // La grieta va en la cornisa seca más cercana al punto marcado, en un hueco libre (sin obstáculo ni puerta).
      const dist = (p) => Math.hypot(U.clamp(Z.entry.x, p.x1, p.x2) - Z.entry.x, p.y - Z.entry.y);
      const near = W.platforms.filter((p) => p.region === 'main' && p.scene === i && p.kind === 'floor' && !p.underwater &&
        !p.transition && !p.start && !p.exit && !p.mid && p.w >= 90).sort((a, b) => dist(a) - dist(b))[0] || (Z.id==='santuario'&&sc.startPlatform.shore?sc.startPlatform:null);
      if (!near) continue;
      const free = (x) => x - 30 >= near.x1 + 8 && x + 30 <= near.x2 - 8 && near.occupied.every(([o1, o2]) => x + 30 <= o1 || x - 30 >= o2);
      const spots = [];
      for (let x = near.x1 + 38; x <= near.x2 - 38; x += 6) if (free(x)) spots.push(x);
      const doorX = spots.length ? spots.sort((a, b) => Math.abs(a - Z.entry.x) - Math.abs(b - Z.entry.x))[0] : near.shore ? near.x2-40 : (near.x1 + near.x2) / 2;
      reserve(near, doorX - 30, doorX + 30);
      // Al salir se regresa a la misma cornisa, a un paso de la grieta (sin quedar encima de ella).
      const backX = U.clamp(doorX + (doorX + 56 <= near.x2 - 14 ? 56 : -56), near.x1 + 14, near.x2 - 14);
      reserve(near, backX - 18, backX + 18);

      const s = Z.scale, AW = Z.artW * s, AH = Z.artH * s;
      const rx = C.world.roomOriginX + W.scenes.length * C.world.roomSpacing + 300 + secretN * 2400, ry = Math.round(near.y - AH / 2);
      secretN++;
      const X = (px) => rx + px * s, Y = (py) => ry + py * s;
      const floorY = Y(Z.water ? Z.water.floor : Z.floor);
      // En el santuario la superficie del agua queda pegada al borde de arriba del arte: el techo de la cueva sube
      // `ceil` u sobre ese borde para que Sofía (62 u) quepa de pie en las losas (render.js pinta ahí roca de cueva).
      const ceil = Z.water ? 46 : 0, top = ry - ceil;
      // `y1` deja a la cámara subir 60 u sobre el techo: así la losa de salida y su letrero quedan bajo el HUD de arriba.
      const room = { id: scope + ':secreto', index: i, scene: i, theme: 'secreto', secret: Z.id, label: Z.label, art: Z.art,
        x1: rx, y1: top - (Z.water ? 60 : 0), x2: rx + AW, y2: floorY, ceilY: top, artY1: ry, artY2: ry + AH, scale: s, visited: false };
      W.rooms.push(room);
      const reg = room.id, th = sc.theme;
      // Paredes, techo y piso de la zona: invisibles (los pinta el arte).
      addSolid({ scope, kind: 'roomwall', x1: rx - 60, y1: floorY, x2: rx + AW + 60, y2: floorY + 60, region: reg, scene: i, theme: th, draw: false });
      addSolid({ scope, kind: 'roomwall', x1: rx - 60, y1: top - 60, x2: rx + AW + 60, y2: top, region: reg, scene: i, theme: th, draw: false });
      addSolid({ scope, kind: 'roomwall', x1: rx - 60, y1: top, x2: rx, y2: floorY, region: reg, scene: i, theme: th, draw: false });
      addSolid({ scope, kind: 'roomwall', x1: rx + AW, y1: top, x2: rx + AW + 60, y2: floorY, region: reg, scene: i, theme: th, draw: false });
      // Mar cerrado del santuario: de la superficie (pegada al techo de la cueva) hasta las losas del fondo.
      let water = null;
      if (Z.water) {
        water = { id: scope + ':agua-secreta', x1: rx, x2: rx + AW, y: Y(Z.water.y), y2: floorY, scene: i, theme: th, kind: 'mar', banks: [],
          sea: true, deep: true, boss: false, breach: false, toStreet: false, drains: [], painted: true, room: reg };
        W.waters.push(water);
      }
      for (const b of Z.blocks || []) addSolid({ scope, kind: 'block', x1: X(b.x1), x2: X(b.x2), y1: Y(b.y), y2: floorY, region: reg, scene: i, theme: th, draw: false, secret: true });
      // Repisas: en el mar, losas a flor de agua (las dibuja el juego); en la Luna, asteroides y la estación (pintados).
      const ledges = (Z.ledges || []).map((q) => addPlatform({ scope, kind: water || q.floor ? 'floor' : 'thin', drop: !water && !q.floor,
        x1: X(q.x1), x2: X(q.x2), y: water ? water.y - 2 : Y(q.y), h: water ? 14 : 9, theme: th, scene: i, region: reg, secret: true,
        look: water ? 'losa' : null, draw: !!water, hidden: !water, painted: !water, arrive: q.arrive, exitAt: q.exit }));
      const ledgeAt = ([px, py]) => ledges.find((p) => Math.abs(p.y - Y(py)) < 1 && X(px) >= p.x1 - 1 && X(px) <= p.x2 + 1);
      let arrive, exitSpot;
      if (water) {
        const a = ledges.find((p) => p.arrive !== undefined), e = ledges.find((p) => p.exitAt !== undefined);
        arrive = { x: X(a.arrive), y: a.y, plat: a };
        exitSpot = { x: X(e.exitAt), y: e.y, plat: e };
      } else {
        arrive = { x: X(Z.arrive[0]), y: Y(Z.arrive[1]), plat: null };
        exitSpot = { x: X(Z.exit[0]), y: Y(Z.exit[1]), plat: null };
      }
      const entryDoor = { id: scope + ':grieta', kind: 'secreto', x: doorX, y: near.y, plat: near, scene: i, region: 'main', room: reg,
        to: { x: arrive.x, y: arrive.y, region: reg }, phase: rng() * 6, secret: Z.id, look: th };
      const exitDoor = { id: scope + ':salida-secreta', kind: 'salida', x: exitSpot.x, y: exitSpot.y, plat: exitSpot.plat, scene: i, region: reg,
        room: reg, to: { x: backX, y: near.y, region: 'main' }, phase: rng() * 6, look: th };
      W.doors.push(entryDoor, exitDoor);
      room.entry = entryDoor; room.exit = exitDoor;
      // Enemigos del paquete «enemigos secretos» (en FÁCIL, uno de cada tipo) y el jefe de la zona.
      const floorPl = { x1: rx + 16, x2: rx + AW - 16, y: floorY, occupied: [] };
      const platOf = (q) => (q.plat === 'floor' ? { x1: X(q.x1), x2: X(q.x2), y: floorY, occupied: [] } : ledgeAt(q.plat));
      for (const q of Z.foes || []) {
        if (q.extra && diffKey === 'facil') continue;
        if (water) {
          addFoe(EN.create(q.kind, { x: X((q.x1 + q.x2) / 2), y: Y(q.y), waterZone: water, lane: { x1: X(q.x1), x2: X(q.x2) }, scene: i, region: reg, diff, rng }));
        } else {
          const pl = platOf(q);
          if (pl) addFoe(EN.create(q.kind, { x: (pl.x1 + pl.x2) / 2, y: pl.y, plat: pl, scene: i, region: reg, diff, rng }));
        }
      }
      if (Z.boss) {
        const B = Z.boss, pl = water ? null : platOf(B);
        const boss = water
          ? EN.create(B.kind, { x: X((B.x1 + B.x2) / 2), y: Y(B.y), waterZone: water, lane: { x1: X(B.x1), x2: X(B.x2) }, scene: i, region: reg,
            diff, rng, isBoss: true, bossName: B.name, hp: B.hp })
          : EN.create(B.kind, { x: (pl.x1 + pl.x2) / 2, y: pl.y, plat: pl, scene: i, region: reg, diff, rng, isBoss: true, bossName: B.name, hp: B.hp });
        boss.secret = Z.id; boss.arena = pl || floorPl;
        addFoe(boss);
        room.boss = boss;
      }
      for (const [gx, gy] of Z.gems || []) addGem(X(gx), Y(gy), i, reg, rng);
      if (Z.heart) addPickup({ scope, type: 'power', power: 'heart', x: X(Z.heart[0]), y: Y(Z.heart[1]), scene: i, region: reg, phase: rng() * 6, secret: true });
    }

    /* ---------- Meta: la terminal y el camión ---------- */
    const busX1 = 150, busX2 = 500;
    W.bus = { x1: busX1, x2: busX2, y1: streetY - 150, y2: streetY, doorX1: busX1 + 22, doorX2: busX1 + 78, state: 'waiting', t: 0 };
    W.goal = { x1: W.bus.doorX1 - 6, x2: W.bus.doorX2 + 6, y1: streetY - 110, y2: streetY + 1 };
    W.signs.push({ id: 'mundo:letrero:terminal', x: busX1 - 60, y: streetY, text: ST.MESSAGES.busWaiting, scene: W.scenes.length - 1, region: 'main', seenT: -99, busStop: true });

    if (seq.every(d => d.room === 'gruta')) {
      const last = W.scenes[W.scenes.length - 1], plat = last.exitPlatform;
      W.portal = { plat, x: last.exitX, y: plat.y };
      W.goal = { x1: last.exitX - 43, x2: last.exitX + 43, y1: plat.y - 93, y2: plat.y + 1 };
      const sign = W.signs[W.signs.length - 1];
      Object.assign(sign, { x: last.exitX - 105, y: plat.y, text: 'CRUZA EL PORTAL DE LAS CASCADAS', busStop: false });
    }

    // School campaign: a real final confrontation on the street, before boarding Ruta 6.
    W.schoolMission = seq.length===3 && seq.every(d=>d.theme==='escuela');
    if(W.schoolMission){
      W.bus.doorX1=W.bus.x1+155;W.bus.doorX2=W.bus.x1+207;W.goal.x1=W.bus.doorX1-6;W.goal.x2=W.bus.doorX2+6;
      const sc=W.scenes[2], boss=W.foes.find(f=>f.kind==='maestro'&&f.isBoss&&f.scene===2&&!f.secret);
      if(boss){
        const ax=W.bus.doorX1-255, bx=W.bus.doorX2+115;
        // A separate patrol region on the real solid street; not a fake floating platform.
        W.street.w=W.street.x2-W.street.x1;boss.plat=W.street;boss.arena=W.street;sc.bossArena=W.street;boss.y=streetY;boss.x=(ax+bx)/2-50;
        boss.minX=ax+boss.w/2+4;boss.maxX=bx-boss.w/2-4;boss.spawn={x:boss.x,y:boss.y};boss.cool=1.25;
        W.schoolFinal={bossId:boss.id,x1:ax,x2:bx,y:streetY};
        W.schoolFinalCheckpoint={id:'school:salida',scene:2,x:ax-70,y:streetY,plat:W.street,mid:true,schoolFinal:true,active:false};
        W.signs.push({id:'school:final:hint',x:ax-70,y:streetY,scene:2,region:'main',seenT:-99,schoolSign:4,text:'EL MAESTRO BLOQUEA LA SALIDA. ESQUIVA LA EMBESTIDA Y USA DASH CUANDO SE MAREE.'});
      }
      // Signs use actual mapped platforms and mark destinations, not arbitrary floating labels.
      for(const sc of W.scenes){
        const cp=W.checkpoints[sc.index],mid=W.midpoints.find(q=>q.scene===sc.index),ex=sc.exitPlatform;
        const marks=[[cp.plat,cp.x+125,sc.index===0?2:sc.index===1?3:4,['AZOTEA: CRUZA LA BARDA CON EL COLUMPIO.','PATIO: USA LOS DESCANSOS Y LAS TIROLESAS.','CONSERJERÍA: SIGUE HACIA EL PORTÓN.'][sc.index]]];
        if(mid)marks.push([mid.plat,mid.x+125,sc.index===1?6:4,'SIGUE LA RUTA DE BAJADA. EL PUNTO SEGURO QUEDA GUARDADO.']);
        if(ex)marks.push([ex,sc.exitX,4,sc.index===2?'EL CAMIÓN ESTÁ EN LA CALLE.':'SIGUIENTE SECTOR: BAJA POR EL BORDE.']);
        for(const [p,x,icon,text] of marks){if(!p)continue;W.signs.push({id:'school:route:'+sc.index+':'+icon+':'+p.id,x:Math.max(p.x1+18,Math.min(p.x2-18,x)),y:p.y,scene:sc.index,region:'main',seenT:-99,schoolSign:icon,text});}
      }
      for(const room of W.rooms)if(room.theme==='sotano'&&!room.secret){
        room.schoolArt=['archivo','laboratorio','conserjeria'][room.scene];room.schoolName=['ARCHIVO ESCOLAR','LABORATORIO','ALMACÉN'][room.scene];
        room.schoolObjective=W.pickups.find(p=>p.region===room.id&&p.type==='item')?.itemIndex ?? null;
        room.schoolFurniture=W.platforms.filter(p=>p.region===room.id).map(p=>{p.schoolFurniture=room.schoolArt;return p;});
      }
      for(const d of W.doors)if(d.kind==='trampilla')d.schoolEntrance=true;
    }
    // Balizas físicas de referencia: puntos seguros sobre repisas trazadas en el arte.
    W.abyssBeacons=[];
    if(seq.every(d=>d.theme==='submarino') && W.scenes.length===3){
      const zones=W.waters.filter(z=>z.sea&&z.region!=='secret'&& !z.room);
      const shared=zones[0], final=W.scenes[2], a=final.map.poseidonArena;
      if(shared&&a){
        const set=new Set(zones); shared.y2=streetY;shared.toStreet=true;shared.boss=true;
        W.waters=W.waters.filter(z=>!set.has(z)||z===shared);
        for(const sc of W.scenes)sc.waters=[shared];
        for(const f of W.foes)if(set.has(f.waterZone))f.waterZone=shared;
        const X=x=>final.x0+x*S,Y=y=>final.startY+y*S;
        const boss=W.foes.find(f=>f.kind==='poseidon'&&f.isBoss&&f.region==='main');
        W.poseidonArena={bossId:boss.id,x1:X(a.x1),x2:X(a.x2),top:Y(a.top),bottom:Y(a.bottom),entryY:Y(a.entryY),x:final.exitX};
        const arena=W.poseidonArena;
        boss.lane={x1:arena.x1+65,x2:arena.x2-65};boss.x=arena.x+135;boss.y=boss.baseY=arena.bottom-235;boss.cool=1.6;boss.spawn={x:boss.x,y:boss.y};
        boss.arenaBounds={top:arena.top+65,bottom:arena.bottom-65};
        // Keep fight free of currents and incidental opponents.
        W.foes=W.foes.filter(f=>f.region!=='main'||f.isBoss||f.y<arena.entryY-90);
        W.hazards=W.hazards.filter(h=>h.scene!==2||((h.y2??h.y??0)<arena.entryY-80));
        W.goal={x1:arena.x-42,x2:arena.x+42,y1:arena.bottom-105,y2:arena.bottom+2};
        const sign=W.signs.find(s=>s.busStop);if(sign)Object.assign(sign,{x:arena.x,y:arena.bottom,text:'ESCOTILLA SELLADA HASTA VENCER A POSEIDÓN',busStop:false});
        for(const [i,sc] of W.scenes.entries()){
          if(i===0)continue;
          const cp=W.checkpoints[i]; W.abyssBeacons.push({id:'abyss:entry:'+i,x:cp.x,y:cp.y,scene:i,mid:true,abyss:true,index:i-1,plat:null,active:false});
        }
        W.abyssBeacons.push({id:'abyss:poseidon',x:arena.x,y:arena.entryY,scene:2,mid:true,abyss:true,index:2,plat:null,active:false});
        addPickup({scope:'poseidon',type:'power',power:'heart',x:arena.x,y:arena.entryY+35,scene:2,region:'main',phase:0});
      }
    }
    for(const sc of W.scenes){
      if(W.poseidonArena||sc.theme!=='submarino'||!sc.map.worldArt)continue;
      const k=sc.scale*sc.map.worldArt.px;
      const points=[[302,1770],[180,1966],[525,2177],[690,2434],[680,2826]];
      for(let i=0;i<points.length;i++){
        const [px,py]=points[i];const x=sc.x0+px*k,y=sc.startY+py*k;
        // Cuerpo de Sofía libre de cualquier sólido en el punto de reaparición.
        if(W.solids.some(s=>!s.open&&!s.broken&&x+20>s.x1&&x-20<s.x2&&y-66<s.y2&&y>s.y1))continue;
        W.abyssBeacons.push({id:'abyss:'+sc.index+':'+i,x,y,scene:sc.index,mid:true,abyss:true,index:i,plat:null,active:false});
      }
    }
    // Retira repetidos de la ruta principal sin cambiar el RNG del trazado ni los jefes.
    // Se conserva el primer ejemplar de cada especie y cada guardián diseñado a mano.
    if (!opts.preservePopulation && diffKey !== 'dificil') {
      const seen = new Map();
      W.foes = W.foes.filter(f => {
        if (f.isBoss || f.secret || f.region !== 'main' || f.kind === 'guardian') return true;
        const key = f.scene + ':' + f.kind, n = (seen.get(key) || 0) + 1;
        seen.set(key,n);
        return n % (diffKey === 'facil' ? 2 : 3) !== 0;
      });
    }
    W.platforms.sort((a, b) => a.y - b.y);
    // V58: clave de orden fija (la y de origen) para buscar por franjas de altura en la física.
    for (const p of W.platforms) p.sortY = p.y;
    W.platformsSorted = true;
    W.spawn = { x: W.checkpoints[0].x, y: W.checkpoints[0].y };
    W.totalItems = W.pickups.filter((p) => p.type === 'item').length;
    W.totalGems = W.pickups.filter((p) => p.type === 'gem').length;
    return W;
  }

  NS.World = { buildWorld, ALCOVE_W, GATE_W, ALCOVE_H };
})(typeof globalThis !== 'undefined' ? globalThis : window);
