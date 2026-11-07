/* ¡Se me fue el camión! — construcción del mundo (sin DOM).
   El mundo usa una escala fija (CONFIG.world.sceneScale). Todo se genera de forma determinista
   a partir de la semilla del mundo: mismo tramo, misma geometría, mismos identificadores. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};

  const ALCOVE_W = 112;   // hueco tras la reja
  const GATE_W = 14;
  const ALCOVE_H = 84;    // Sofía mide 62: cabe de pie

  function buildWorld(opts = {}) {
    const U = NS.util, C = NS.CONFIG, LV = NS.LEVELS, ST = NS.STORY, EN = NS.Enemies, OB = NS.Obstacles;
    const S = C.world.sceneScale;
    const diffKey = C.difficulty[opts.difficulty] ? opts.difficulty : 'normal';
    const diff = C.difficulty[diffKey];
    const seq = opts.levels || LV.LEVEL_SEQUENCE; // opts.levels: subconjunto para validar un nivel suelto (herramientas)
    const seed = opts.seed ?? 20261026;

    const W = {
      version: C.version, difficulty: diffKey, seed,
      scenes: [], platforms: [], solids: [], hazards: [], foes: [], pickups: [], doors: [], rooms: [],
      checkpoints: [], signs: [], gates: [], shots: [], waters: [], bounds: null, bus: null, goal: null, t: 0
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
    let y = 0, maxHalf = 0;
    seq.forEach((def, i) => {
      const m = def.map, drawW = m.width * S, drawH = m.height * S;
      maxHalf = Math.max(maxHalf, drawW / 2);
      W.scenes.push({
        index: i, id: def.id, def, label: def.label, file: def.file, tint: def.tint, wash: def.wash, shade: def.shade,
        theme: def.theme, roomTheme: def.room, map: m, scale: S, x0: -drawW / 2, drawW, drawH, startY: y, endY: y + drawH,
        skin: def.skin || (def.theme === 'escuela' ? 'concrete' : 'stone_rocks'), artPainted: def.art === 'painted', bg: def.bg || null,
        storyIndex: def.storyIndex ?? i, chapter: ST.CHAPTERS[def.storyIndex ?? i], surfaces: [], stairs: [], movers: [], crumbles: [], belts: [], bouncers: [], side: { '-1': [], '1': [] }
      });
      y += drawH;
    });
    const B = Math.ceil(maxHalf + C.world.sideWidth);
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
      sc.surfaces = m.surfaces.map((q) => addPlatform({
        scope, kind: 'floor', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 10 * S, drop: false, draw: !sc.artPainted, painted: true,
        hidden: sc.artPainted, skin: sc.skin,
        theme: sc.theme, scene: sc.index, start: !!q.start, exit: !!q.exit,
        startX: q.startX !== undefined ? X(q.startX) : undefined,
        touchesLeft: q.x1 <= 1, touchesRight: q.x2 >= m.width - 1
      }));
      sc.stairs = m.stairs.map((q) => addPlatform({
        scope, kind: 'stair', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 8 * S, drop: true, draw: !(sc.artPainted && sc.def.stairsPainted), painted: true,
        hidden: !!(sc.artPainted && sc.def.stairsPainted), skin: sc.skin, theme: sc.theme, scene: sc.index
      }));
      sc.movers = m.movers.map((q) => addPlatform({
        scope, kind: 'moving', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 11 * S, drop: true, draw: true,
        theme: sc.theme, scene: sc.index, baseX1: X(q.x1), baseX2: X(q.x2), baseY: Y(q.y),
        range: q.range * S, vrange: q.vertical * S, speed: 1.15, phase: rng() * 6
      }));
      sc.pigeons = (m.pigeons || []).map((q) => addPlatform({
        scope, kind: 'pigeon', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 10 * S, drop: false, draw: true,
        theme: sc.theme, scene: sc.index, baseX1: X(q.x1), baseX2: X(q.x2), baseY: Y(q.y),
        range: (q.range || 80) * S, vrange: (q.vertical || 7) * S, speed: q.speed || 1.4, phase: rng() * 6
      }));
      // V50: tejas flojas, bandas eléctricas y sombrillas definidas en el mapa.
      sc.crumbles = (m.crumbles || []).map((q) => addPlatform({
        scope, kind: 'crumble', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 10 * S, drop: true, draw: true, painted: true,
        theme: sc.theme, scene: sc.index, crState: 'solid', crT: 0, gone: false
      }));
      sc.belts = (m.belts || []).map((q) => addPlatform({
        scope, kind: 'belt', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 12 * S, drop: true, draw: true, painted: true,
        theme: sc.theme, scene: sc.index, belt: q.speed
      }));
      // Tablones de madera (se atraviesan con BAJAR): ramas, andamios, rejillas.
      sc.planks = (m.planks || []).map((q) => addPlatform({
        scope, kind: 'thin', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 9, drop: true, draw: true, painted: true,
        theme: sc.theme, scene: sc.index, plank: true
      }));
      sc.bouncers = (m.bouncers || []).map((q) => addPlatform({
        scope, kind: 'bounce', x1: X(q.x1), x2: X(q.x2), y: Y(q.y), h: 10, drop: false, draw: true, painted: true,
        theme: sc.theme, scene: sc.index, umbrella: true
      }));
      for (const b of sc.bouncers) reserve(b, b.x1, b.x2);
      // V52 · Agua (lagos, pilas): profunda si mide al menos CONFIG.water.shallowDepth (se nada); si no, se vadea.
      // `banks`: lados con pared de orilla (sólido bajo cuyo tope queda 3 u sobre el agua y se sube nadando).
      // Un lado con suelo a la altura del agua no lleva pared: ahí la orilla es ese suelo.
      sc.waters = (m.water || []).map((q) => {
        const z = { id: nid(scope, 'agua'), x1: X(q.x1), x2: X(q.x2), y: Y(q.y), y2: Y(q.y + q.depth), scene: sc.index,
          theme: sc.theme, kind: q.kind || 'lago', banks: q.banks || [] };
        z.deep = z.y2 - z.y >= C.water.shallowDepth;
        (W.waters = W.waters || []).push(z);
        for (const side of z.banks) {
          const bx = side === 'left' ? z.x1 - 12 : z.x2;
          addSolid({ scope, kind: 'bank', x1: bx, x2: bx + 12, y1: z.y - 3, y2: z.y2 + 14, scene: sc.index, theme: sc.theme, draw: false, water: z.id });
        }
        // El fondo del agua profunda es sólido: desde abajo no se entra al agua (es techo para lo que está debajo).
        if (z.deep) addSolid({ scope, kind: 'bank', x1: z.x1 - 12, x2: z.x2 + 12, y1: z.y2, y2: z.y2 + 10, scene: sc.index, theme: sc.theme, draw: false, water: z.id, bottom: true });
        return z;
      });
      m.gems.forEach((q) => addGem(X(q.x), Y(q.y), sc.index, 'main', rng));
      const start = sc.surfaces.find((s) => s.start);
      sc.startPlatform = start;
      reserve(start, start.x1, start.x2); // el punto de control queda despejado
      W.checkpoints.push({ id: scope + ':parada', scene: sc.index, x: start.startX, y: start.y, plat: start, active: false });
      const exit = sc.surfaces.find((s) => s.exit);
      sc.exitPlatform = exit;
      const exitX = X(m.exitX);
      reserve(exit, exitX - 44, exitX + 44);
      sc.exitX = exitX;
    }

    /* ---------- Escaleras de transición entre tramos ---------- */
    for (let i = 0; i < W.scenes.length - 1; i++) {
      const from = W.scenes[i], to = W.scenes[i + 1], count = 11;
      const xA = from.exitX, yA = from.exitPlatform.y;
      const xB = to.startPlatform.startX, yB = to.startPlatform.y;
      const stepW = 34 * S;
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
    for (const side of [-1, 1]) {
      const rng = U.makeRng(U.hashSeed(seed, 'side', side));
      const rows = [];
      for (const sc of W.scenes) {
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
            filled.push({ y: yy, scene: sceneAt(yy), bridge: null });
          }
        }
      }
      // Elegir una fila por tramo para el nicho con reja (lado contrario a la zona inferior).
      for (const sc of W.scenes) {
        if (doorSideOf(sc.index) === side) continue;
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
      const segs = sc.side[side].filter((p) => !p.bridge && !p.rowAlcove && p.w >= 100 &&
        p.y > sc.startY + sc.drawH * 0.22 && p.y < sc.startY + sc.drawH * 0.72);
      const doorPl = segs.length ? segs[Math.floor(rng() * segs.length)] : sc.side[side].find((p) => p.w >= 90);
      if (!doorPl) continue;
      doorPl.kind = 'floor'; doorPl.drop = false; // la trampilla necesita suelo firme
      const doorX = (doorPl.x1 + doorPl.x2) / 2;
      reserve(doorPl, doorX - 30, doorX + 30);
      const allSide = W.scenes.flatMap((s) => s.side[side]);
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
      const guardKind = i >= 3 ? 'bravo' : i >= 1 ? 'dog' : 'rat';
      addFoe(EN.create(guardKind, { x: rx + 230, y: floorTop, plat: floorPl, scene: i, region: reg, diff, rng }));
      if (i >= 2) addFoe(EN.create('bat', { x: rx + 470, y: ry + 22, scene: i, region: reg, diff, rng }));
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
      else if (bossDef.kind === 'pigeon') flyY = arena.y - 84;
      const boss = EN.create(bossDef.kind, {
        id: scope + ':jefe', x: bossX, y: flyY, plat: arena, scene: sc.index,
        lane: { x1: arena.x1 + 26, x2: arena.x2 - 26 },
        region: 'main', diff, rng, isBoss: true, bossName: bossDef.name, hp: bossDef.hp
      });
      boss.arena = arena;
      addFoe(boss);
    }

    /* ---------- Enemigos, obstáculos y poderes del tramo ---------- */
    for (const sc of W.scenes) {
      const i = sc.index, def = sc.def, scope = 't' + i;
      const rng = U.makeRng(U.hashSeed(seed, 'encuentros', i, diffKey));
      // V50: la plataforma de salida es la arena del jefe; los enemigos comunes ya no la comparten.
      const panel = sc.surfaces.filter((s) => !s.start && !s.exit && s !== sc.bossArena && s.w >= 96);
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

      // Enemigos del panel pintado.
      const budget = Math.max(1, Math.round(def.foeBudget * diff.foeDensity));
      let walkersOn = new Set();
      for (let n = 0; n < budget; n++) {
        const kind = def.foes[n % def.foes.length];
        addFoe(placeFoe(kind, panel, rng, walkersOn, sc, scope, diff));
      }
      // Enemigos de los sectores laterales.
      const sideBudget = Math.max(1, Math.round(def.sideFoes * diff.foeDensity));
      walkersOn = new Set();
      for (let n = 0; n < sideBudget; n++) {
        const kind = def.foes[(n + 1) % def.foes.length];
        addFoe(placeFoe(kind, sides, rng, walkersOn, sc, scope, diff));
      }
      // Obstáculos: panel y sectores.
      const obsBudget = Math.max(1, Math.round(def.obstacleBudget * (0.8 + 0.2 * diff.foeDensity)));
      for (let n = 0; n < obsBudget; n++) {
        const type = def.obstacles[n % def.obstacles.length];
        placeObstacle(type, n % 2 === 0 ? panel : sides, rng, sc, scope, diff);
      }
      if (def.obstacles.includes('spikes') || def.obstacles.includes('spark')) {
        placeObstacle(def.obstacles.includes('spark') && i >= 2 ? 'spark' : 'spikes', sides, rng, sc, scope, diff);
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
      const powPl = panel.length ? panel[Math.floor(rng() * panel.length)] : null;
      if (powPl) {
        const x = claim(powPl, 26, rng, 24);
        if (x !== null) addPickup({ scope, type: 'power', power: ['shield', 'magnet', 'heart'][i % 3], x, y: powPl.y - 32, scene: i, phase: rng() * 6 });
      }
    }

    function placeFoe(kind, cands, rng, walkersOn, sc, scope, diff) {
      const T = EN.TYPES[kind];
      if (!T || !cands.length) return null;
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
        if (kind === 'pigeon') {
          const x = (pl.x1 + pl.x2) / 2;
          const lane = { x1: Math.max(W.bounds.x1 + 40, x - 220), x2: Math.min(W.bounds.x2 - 40, x + 220) };
          return EN.create(kind, { scope, x, y: pl.y - 118, lane, scene: sc.index, diff, rng });
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

    /* ---------- Meta: la terminal y el camión ---------- */
    const busX1 = 150, busX2 = 500;
    W.bus = { x1: busX1, x2: busX2, y1: streetY - 150, y2: streetY, doorX1: busX1 + 22, doorX2: busX1 + 78, state: 'waiting', t: 0 };
    W.goal = { x1: W.bus.doorX1 - 6, x2: W.bus.doorX2 + 6, y1: streetY - 110, y2: streetY + 1 };
    W.signs.push({ id: 'mundo:letrero:terminal', x: busX1 - 60, y: streetY, text: ST.MESSAGES.busWaiting, scene: W.scenes.length - 1, region: 'main', seenT: -99, busStop: true });

    W.platforms.sort((a, b) => a.y - b.y);
    W.spawn = { x: W.checkpoints[0].x, y: W.checkpoints[0].y };
    W.totalItems = W.pickups.filter((p) => p.type === 'item').length;
    W.totalGems = W.pickups.filter((p) => p.type === 'gem').length;
    return W;
  }

  NS.World = { buildWorld, ALCOVE_W, GATE_W, ALCOVE_H };
})(typeof globalThis !== 'undefined' ? globalThis : window);
