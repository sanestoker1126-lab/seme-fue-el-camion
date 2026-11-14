/* ¡Se me fue el camión! — estado de juego y reglas (sin DOM).
   Estados: 'menu' → 'playing' ⇄ 'paused' · 'playing' → 'transition' (puertas) → 'playing'
            'playing' → 'dying' → 'gameover' · 'playing' → 'victory' → 'won'
   La interfaz solo lee el estado y consume G.events; nunca modifica la simulación directamente. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};
  const COMPANION_NAMES = ['luna', 'morita'];
  const COMPANION_IDLE_MODES = new Set(['look', 'sniff', 'groom', 'explore', 'shoulder']);
  const COMPANION_PLANS = {
    luna: [['look', 0.9], ['explore', 1.5], ['sniff', 1.05], ['shoulder', 1.2], ['groom', 1.2]],
    morita: [['groom', 1.2], ['look', 0.95], ['explore', 1.65], ['sniff', 1.1], ['shoulder', 1.3]]
  };

  function defaultSave() {
    // V53 · progreso por misión: tramos desbloqueados en cada una (0 = misión bloqueada). La 1 empieza abierta.
    return { unlocked: 1, bestTime: 0, bestScore: 0, bestDepth: 0, items: {}, wins: 0,
      missions: { escuela: 1, guadalajara: 0, submarino: 0, espacial: 0 } };
  }

  function createGame(opts = {}) {
    const C = NS.CONFIG, U = NS.util, PHY = NS.Physics, EN = NS.Enemies, OB = NS.Obstacles, ST = NS.STORY;
    const G = {
      state: 'menu', world: null, P: null, events: [], mission: 0, missionId: 'escuela',
      save: Object.assign(defaultSave(), opts.save || {}),
      difficulty: opts.difficulty || 'normal',
      view: { pxW: 390, pxH: 844, zoom: 1, w: 390, h: 844 },
      cam: { x: 0, y: 0 },
      run: null, region: 'main', room: null, tramo: 0, checkpoint: null,
      transition: null, timers: { dying: 0, victory: 0 }, shakeT: 0, fx: [], msgCD: Object.create(null),
      companions: { warningT: 0, meowCD: 0, senseCD: 0.8, assistCD: 4.2, warningCat: 'luna', warningKind: '', nextCat: 'luna', action: 'idle', actionT: 0, purrNext: 3.4, agents: null },
      onSave: opts.onSave || null, godMode: false,
      // V50: asistencias configurables desde el menú de opciones.
      assist: Object.assign({ catsHelp: true, relaxed: false }, opts.assist || {})
    };
    if (!G.save.items) G.save.items = {};
    // Compatibilidad: saves anteriores a V53 no traen progreso por misión.
    G.save.missions = Object.assign({ escuela: 1, guadalajara: 0, submarino: 0, espacial: 0 }, G.save.missions || {});
    if (!(G.save.missions.escuela > 0)) G.save.missions.escuela = 1;

    const emit = (type, data) => { G.events.push(Object.assign({ type }, data || {})); };
    const persist = () => { if (G.onSave) G.onSave(G.save); };
    const diff = () => C.difficulty[G.difficulty] || C.difficulty.normal;
    function message(key, text, cd = 2.5, priority = 1) {
      const now = G.run ? G.run.t : 0;
      if (G.msgCD[key] && now < G.msgCD[key]) return;
      G.msgCD[key] = now + cd;
      emit('message', { text, priority, key });
    }

    /* ---------- Vista y cámara ---------- */
    function setView(pxW, pxH) {
      const WC = C.world;
      const minH = pxW > pxH * 1.15 ? (WC.viewMinHLandscape || WC.viewMinH) : WC.viewMinH;
      const vs = G.viewScale || 1; // opción CÁMARA: cerca (<1) / normal / lejos (>1)
      const zoom = U.clamp(Math.min(pxW / (WC.viewMinW * vs), pxH / (minH * vs)), WC.zoomMin, WC.zoomMax);
      G.view = { pxW, pxH, zoom, w: pxW / zoom, h: pxH / zoom };
      if (G.P) updateCamera(0, true);
    }

    function cameraBounds() {
      const W = G.world, v = G.view;
      let x1, x2, y1, y2;
      if (G.room) { x1 = G.room.x1 - 60; x2 = G.room.x2 + 60; y1 = G.room.y1 - 70; y2 = G.room.y2 + 70; }
      else { x1 = W.bounds.x1 - 50; x2 = W.bounds.x2 + 50; y1 = W.bounds.y1; y2 = W.bounds.y2; }
      const bx = x2 - x1 <= v.w ? [(x1 + x2 - v.w) / 2, (x1 + x2 - v.w) / 2] : [x1, x2 - v.w];
      const by = y2 - y1 <= v.h ? [(y1 + y2 - v.h) / 2, (y1 + y2 - v.h) / 2] : [y1, y2 - v.h];
      return { bx, by };
    }

    function updateCamera(dt, snap) {
      const P = G.P, v = G.view, CC = C.camera;
      const lookX = U.clamp(P.vx * CC.lookAheadVx, -v.w * 0.13, v.w * 0.13) + (P.face || 1) * Math.min(34, v.w * 0.035);
      const tx = P.x + lookX - v.w / 2;
      const lead = U.clamp(P.vy * CC.leadVy, -v.h * 0.075, v.h * 0.11);
      const ty = P.y - v.h * CC.focusY + lead;
      const { bx, by } = cameraBounds();
      if (snap) { G.cam.x = U.clamp(tx, bx[0], bx[1]); G.cam.y = U.clamp(ty, by[0], by[1]); return; }
      const ex = 1 - Math.exp(-dt * CC.easeX), ey = 1 - Math.exp(-dt * CC.easeY);
      G.cam.x = U.clamp(G.cam.x + (tx - G.cam.x) * ex, bx[0], bx[1]);
      G.cam.y = U.clamp(G.cam.y + (ty - G.cam.y) * ey, by[0], by[1]);
      // Nunca dejar a Sofía fuera del encuadre vertical (saltos altos o rebotes).
      const top = P.y - P.h / 2, bottom = P.y + P.h / 2;
      if (top < G.cam.y + v.h * 0.1) G.cam.y = U.clamp(top - v.h * 0.1, by[0], by[1]);
      if (bottom > G.cam.y + v.h * 0.86) G.cam.y = U.clamp(bottom - v.h * 0.86, by[0], by[1]);
    }

    const onScreen = (x, y, m = 0) => x > G.cam.x - m && x < G.cam.x + G.view.w + m && y > G.cam.y - m && y < G.cam.y + G.view.h + m;
    const active = (x, y) => onScreen(x, y, 280);
    // V52: sumergida a más de 14 u (la cabeza bajo el agua) los enemigos no la alcanzan: bucear también es esquivar.
    const NOWHERE = { x1: -1e9, y1: -1e9, x2: -1e9 + 1, y2: -1e9 + 1 };
    const hurtbox = () => (G.P.water && G.P.submerged && G.P.y - G.P.h / 2 > G.P.water.y + 14) ? NOWHERE
      : U.bodyRect(G.P, C.player.hurtScaleX, C.player.hurtScaleY, G.P.h * (1 - C.player.hurtScaleY) * 0.5);

    /* ---------- Partida ---------- */
    function newRun(o = {}) {
      if (o.difficulty) G.difficulty = o.difficulty;
      const d = diff();
      const missions = NS.LEVELS.MISSIONS;
      // Sin misión explícita se arma la secuencia completa (fondo del menú y pruebas); con misión, su subconjunto.
      const hasMission = missions && o.mission != null;
      const mi = hasMission ? U.clamp(o.mission | 0, 0, missions.length - 1) : 0;
      G.mission = mi; G.missionId = missions ? missions[mi].id : 'escuela';
      const W = NS.World.buildWorld({ difficulty: G.difficulty, seed: o.seed, levels: hasMission ? missions[mi].levels : undefined });
      G.world = W;
      const startTramo = U.clamp(o.startTramo | 0, 0, W.scenes.length - 1);
      const cp = W.checkpoints[startTramo];
      G.P = PHY.createPlayer(cp.x, cp.y);
      G.P.ground = cp.plat;
      G.P.invuln = startTramo > 0 ? 1.2 : 0;
      G.run = {
        t: 0, score: 0, combo: 0, comboT: 0, gems: 0, lives: d.lives, maxLives: d.lives, items: [],
        keys: new Set(), deaths: o.deaths || 0, startTramo, maxDepth: 0, kills: 0, bosses: 0, seenChapters: new Set(), busSeen: false,
        carriedItems: o.carriedItems ? o.carriedItems.slice() : []
      };
      for (const it of G.run.carriedItems) {
        G.run.items.push(it);
        const pk = W.pickups.find((p) => p.type === 'item' && p.itemIndex === it);
        if (pk) pk.got = true;
      }
      G.region = 'main'; G.room = null; G.tramo = startTramo; G.transition = null;
      G.timers = { dying: 0, victory: 0 }; G.shakeT = 0; G.fx = []; G.waterFx = []; G.bubbleT = 0; G.msgCD = Object.create(null); G.events.length = 0;
      G.companions = { warningT: 0, meowCD: 0, senseCD: 0.8, assistCD: 4.2, warningCat: 'luna', warningKind: '', nextCat: 'luna', action: 'idle', actionT: 0, purrNext: 3.4, agents: createCompanionAgents(G.P) };
      activateCheckpoint(cp, true);
      updateCamera(0, true);
      G.state = 'playing';
      enterTramo(startTramo);
      emit('runStart', { startTramo });
      return G;
    }

    function retry() {
      const cpScene = G.checkpoint ? G.checkpoint.scene : 0;
      const carried = G.run ? G.run.items.filter((i) => i < cpScene) : [];
      newRun({ startTramo: cpScene, deaths: G.run ? G.run.deaths : 0, carriedItems: carried });
    }

    function activateCheckpoint(cp, silent) {
      for (const c of G.world.checkpoints) c.active = c === cp;
      G.checkpoint = cp;
      if (!G.save.missions) G.save.missions = {};
      let changed = false;
      if (cp.scene + 1 > (G.save.missions[G.missionId] || 0)) { G.save.missions[G.missionId] = cp.scene + 1; changed = true; }
      if (cp.scene + 1 > G.save.unlocked) { G.save.unlocked = cp.scene + 1; changed = true; } // espejo heredado
      if (changed) persist();
      if (!silent) { emit('checkpoint', { cp }); message('cp', ST.MESSAGES.checkpoint, 3); }
    }

    function enterTramo(i) {
      G.tramo = i;
      if (G.run.seenChapters.has(i)) return;
      G.run.seenChapters.add(i);
      emit('chapter', { index: i, chapter: G.world.scenes[i].chapter, scene: G.world.scenes[i] });
    }

    function pause() { if (G.state === 'playing' || G.state === 'transition') { G.prevState = G.state; G.state = 'paused'; emit('paused'); } }
    function resume() { if (G.state === 'paused') { G.state = G.prevState || 'playing'; emit('resumed'); } }

    function companionAlert(kind) {
      if (!G.companions || G.state !== 'playing') return;
      const c = G.companions;
      if (c.warningT > 0) return;
      c.warningT = 1.65;
      c.warningKind = kind || 'danger';
      c.action = 'alert'; c.actionT = 1.65;
      c.warningCat = c.nextCat;
      c.nextCat = c.nextCat === 'luna' ? 'morita' : 'luna';
      const agent = c.agents && c.agents[c.warningCat];
      if (agent && agent.mode !== 'assist') { agent.mode = 'alert'; agent.modeT = 1.65; }
      if (c.meowCD <= 0) {
        c.meowCD = 2.8;
        emit('companionWarning', { cat: c.warningCat, kind: c.warningKind });
      }
    }

    function createCompanionAgents(P) {
      const foot = P.y + P.h / 2;
      return {
        luna: { x: P.x - 46, y: foot, vx: 0, mode: 'follow', modeT: 0, nextMood: 1.7, moodIndex: 0, phase: 0, face: -1, moving: false, target: null },
        morita: { x: P.x + 46, y: foot, vx: 0, mode: 'follow', modeT: 0, nextMood: 3.1, moodIndex: 1, phase: 1.8, face: 1, moving: false, target: null }
      };
    }

    function companionAnchorX(x, P) {
      const support = P.ground;
      if (support && Number.isFinite(support.x1) && Number.isFinite(support.x2)) {
        const pad = Math.min(14, Math.max(0, (support.x2 - support.x1) * 0.3));
        return U.clamp(x, support.x1 + pad, support.x2 - pad);
      }
      const bounds = G.room || G.world.bounds;
      return bounds && Number.isFinite(bounds.x1) ? U.clamp(x, bounds.x1 + 20, bounds.x2 - 20) : x;
    }

    function updateCompanionAgents(dt) {
      const c = G.companions, P = G.P;
      if (!c || !P || !G.world) return;
      if (!c.agents) c.agents = createCompanionAgents(P);
      if (G.state === 'transition') {
        for (const name of COMPANION_NAMES) {
          const a = c.agents[name], side = name === 'luna' ? -1 : 1;
          a.x = companionAnchorX(P.x + side * 46, P); a.y = P.y + P.h / 2; a.vx = 0;
          a.mode = 'follow'; a.modeT = 0; a.target = null; a.moving = false;
        }
        return;
      }
      if (G.state !== 'playing' || P.dead) return;

      const grounded = !!P.ground && Math.abs(P.vy) < 36;
      const playerMoving = Math.abs(P.vx) > 42 || Math.abs(P.vy) > 52 || !grounded;

      for (const name of COMPANION_NAMES) {
        const a = c.agents[name], side = name === 'luna' ? -1 : 1;
        const alerting = c.warningT > 0 && c.warningCat === name;
        a.phase += dt * (a.moving ? 2.8 : 0.9);
        a.modeT = Math.max(0, a.modeT - dt);

        if (a.mode === 'assist' && (!a.target || a.target.dead || a.modeT <= 0)) {
          a.target = null; a.mode = 'return';
        }
        if (alerting && a.mode !== 'assist') { a.mode = 'alert'; a.modeT = Math.max(a.modeT, c.warningT); }
        else if (a.mode === 'alert' && !alerting) { a.mode = 'follow'; a.modeT = 0; }

        if (playerMoving && a.mode !== 'assist' && a.mode !== 'alert') {
          a.nextMood = Math.max(a.nextMood, 2.3 + (name === 'morita' ? 0.8 : 0));
          a.mode = 'follow'; a.modeT = 0;
        } else if (!playerMoving && grounded && a.mode === 'follow' && c.warningT <= 0) {
          a.nextMood -= dt;
          if (a.nextMood <= 0) {
            let [mode, duration] = COMPANION_PLANS[name][a.moodIndex % COMPANION_PLANS[name].length];
            a.moodIndex++;
            const other = c.agents[name === 'luna' ? 'morita' : 'luna'];
            if (mode === 'shoulder' && other.mode === 'shoulder') mode = 'look';
            a.mode = mode; a.modeT = duration;
            a.nextMood = 2.2 + (name === 'morita' ? 0.7 : 0);
          }
        }

        if (COMPANION_IDLE_MODES.has(a.mode) && a.modeT <= 0) a.mode = a.mode === 'explore' ? 'return' : 'follow';
        if (a.mode === 'return') {
          const homeX = companionAnchorX(P.x + side * 48, P);
          if (Math.abs(a.x - homeX) < 8 && Math.abs(a.y - (P.y + P.h / 2)) < 8) a.mode = 'follow';
        }

        const foot = P.y + P.h / 2;
        let tx = companionAnchorX(P.x + side * (playerMoving ? 58 : 48), P), ty = foot;
        if (a.mode === 'explore') tx = companionAnchorX(P.x + side * 88, P);
        if (a.mode === 'shoulder') tx = P.x + side * 12;
        if (a.mode === 'assist' && a.target && !a.target.dead) {
          tx = companionAnchorX(a.target.x - side * 20, P);
          ty = a.target.y + (a.target.h || 30) * 0.5;
        }
        // V52: las gatitas no nadan: mientras Sofía está en agua profunda la esperan en la orilla más cercana.
        if (P.water && a.mode !== 'assist') {
          const z = P.water, nearLeft = P.x - z.x1 < z.x2 - P.x;
          tx = nearLeft ? z.x1 - 16 - (side < 0 ? 20 : 0) : z.x2 + 16 + (side > 0 ? 20 : 0);
          ty = z.y - 3;
        }

        const dx = tx - a.x, dy = ty - a.y;
        if (Math.hypot(dx, dy) > 230) {
          a.x = tx; a.y = ty; a.vx = 0;
        } else {
          // Resorte amortiguado: sigue sin vibrar y recupera posición suavemente.
          const stiffness = 100, damping = 2 * Math.sqrt(stiffness);
          a.vx = U.clamp(a.vx + (dx * stiffness - a.vx * damping) * dt, -480, 480);
          a.x += a.vx * dt;
          a.y += (ty - a.y) * (1 - Math.exp(-13 * dt));
        }
        if (Math.abs(a.vx) > 5) a.face = a.vx < 0 ? -1 : 1;
        a.moving = a.mode === 'explore' || a.mode === 'assist' || a.mode === 'return' || Math.abs(a.vx) > 18 || Math.abs(dx) > 9;
      }
    }

    function scanCompanionThreats(dt) {
      const c = G.companions, P = G.P, W = G.world;
      c.senseCD = Math.max(0, c.senseCD - dt);
      c.assistCD = Math.max(0, c.assistCD - dt);
      if (G.state !== 'playing' || P.dead) return;
      const inScene = (f) => !f.dead && f.scene === G.tramo && f.region === G.region && onScreen(f.x, f.y, 20);
      if (c.senseCD <= 0 && c.warningT <= 0 && W.foes.some((f) => inScene(f) && Math.hypot(f.x - P.x, f.y - P.y) < 260)) {
        c.senseCD = 2.6;
        companionAlert('enemy');
      }
      if (c.assistCD > 0 || !G.assist.catsHelp) return;
      const target = W.foes.filter((f) => inScene(f) && !f.isBoss && Math.abs(f.x - P.x) < 100 && Math.abs(f.y - P.y) < 125)
        .sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
      if (!target || !EN.distract(target, 0.58)) return;
      c.assistCD = 9.2;
      c.warningCat = c.nextCat;
      c.nextCat = c.nextCat === 'luna' ? 'morita' : 'luna';
      c.warningKind = 'enemy';
      c.warningT = Math.max(c.warningT, 0.78);
      c.action = 'assist'; c.actionT = 0.78;
      const agent = c.agents && c.agents[c.warningCat];
      if (agent) { agent.mode = 'assist'; agent.modeT = 0.58; agent.target = target; }
      emit('companionAssist', { cat: c.warningCat, foe: target });
    }

    /* ---------- Daño ---------- */
    function hurt(srcX, srcY, kind) {
      const P = G.P, CB = C.combat;
      if (G.state !== 'playing' || P.invuln > 0 || P.dead || G.godMode) return false;
      const dir = U.sign(P.x - srcX) || -P.face || 1;
      if (P.shield) {
        P.shield = false;
        P.invuln = CB.shieldInvuln;
        P.vx = dir * CB.knockX * 0.6; P.vy = CB.knockY * 0.6; P.noCut = true; P.ground = null; P.dashT = 0;
        emit('shieldBreak', { x: P.x, y: P.y });
        message('shield', ST.MESSAGES.shieldBroken, 1);
        burst(P.x, P.y, 0x69d7d2, 22);
        return true;
      }
      if (!G.assist.relaxed) G.run.lives--; // modo relajado: los golpes empujan pero no quitan vidas
      G.run.combo = 0; G.run.comboT = 0;
      P.invuln = CB.invuln * diff().invulnMul;
      P.hurtT = 0.42;
      P.dashT = 0;
      if (kind !== 'fall') { P.vx = dir * CB.knockX; P.vy = CB.knockY; P.noCut = true; P.ground = null; }
      G.shakeT = Math.max(G.shakeT, 0.3);
      emit('hurt', { kind, lives: G.run.lives, x: P.x, y: P.y });
      burst(P.x, P.y - 10, 0xff6b69, 14);
      if (G.run.lives <= 0) die();
      return true;
    }

    function die() {
      const P = G.P;
      P.dead = true; P.vx = 0; P.vy = P.water ? 40 : -260; P.ground = null; P.noCut = true;   // en el agua se hunde
      G.state = 'dying'; G.timers.dying = 0;
      G.run.deaths++;
      emit('dying');
    }

    function finishGameOver() {
      G.state = 'gameover';
      const depth = Math.floor(G.run.maxDepth / 10);
      if (depth > G.save.bestDepth) G.save.bestDepth = depth;
      const newScore = G.run.score > G.save.bestScore;
      if (newScore) G.save.bestScore = G.run.score;
      persist();
      emit('gameover', { summary: summary(), newScore, checkpointScene: G.checkpoint ? G.checkpoint.scene : 0 });
    }

    function startVictory() {
      const P = G.P;
      G.state = 'victory'; G.timers.victory = 0;
      G.companions.action = 'cuddle'; G.companions.actionT = 2.4;
      P.cheer = true; P.vx = 0; P.invuln = 99;
      G.world.bus.state = 'boarding';
      emit('victoryStart');
      burst(P.x, P.y, 0xd9ff65, 40);
    }

    function finishVictory() {
      G.state = 'won';
      const r = G.run, t = Math.round(r.t);
      const items = r.items.length, total = G.world.totalItems;
      const stars = 1 + (items >= 3 ? 1 : 0) + (items >= total ? 1 : 0);
      const fullRun = r.startTramo === 0;
      const newTime = fullRun && (!G.save.bestTime || t < G.save.bestTime);
      if (newTime) G.save.bestTime = t;
      const newScore = r.score > G.save.bestScore;
      if (newScore) G.save.bestScore = r.score;
      G.save.wins = (G.save.wins || 0) + 1;
      G.save.unlocked = Math.max(G.save.unlocked, G.world.scenes.length); // espejo heredado
      // V53 · completar la misión la deja toda abierta y desbloquea la siguiente.
      if (!G.save.missions) G.save.missions = {};
      G.save.missions[G.missionId] = Math.max(G.save.missions[G.missionId] || 0, G.world.scenes.length);
      const missions = NS.LEVELS.MISSIONS, next = missions && missions[G.mission + 1];
      if (next) G.save.missions[next.id] = Math.max(G.save.missions[next.id] || 0, 1);
      const depth = Math.floor(r.maxDepth / 10);
      if (depth > G.save.bestDepth) G.save.bestDepth = depth;
      persist();
      emit('victory', { summary: summary(), stars, newTime, newScore, fullRun, ending: ST.ending(items, total, r.lives) });
    }

    function summary() {
      const r = G.run;
      return { time: r.t, score: r.score, gems: r.gems, lives: r.lives, maxLives: r.maxLives, items: r.items.slice(), totalItems: G.world.totalItems, depth: Math.floor(r.maxDepth / 10), kills: r.kills, bosses: r.bosses, totalBosses: G.world.foes.filter((f) => f.isBoss).length, deaths: r.deaths, tramo: G.tramo, relaxed: !!G.assist.relaxed };
    }

    /* ---------- Puntuación y efectos ---------- */
    const mult = () => 1 + Math.min(C.scoring.comboMaxMult - 1, Math.floor(G.run.combo / C.scoring.comboStep));
    function addCombo(n) { G.run.combo += n; G.run.comboT = C.scoring.comboTime; }
    function addScore(n) { G.run.score += Math.round(n * mult()); }
    function burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 260;
        G.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25 + Math.random() * 0.45, max: 0.7, color });
      }
      if (G.fx.length > 360) G.fx.splice(0, G.fx.length - 360);
    }

    /* V52 · Efectos de agua (los dibuja el render con los sprites del atlas de nado). */
    function waterFx(kind, x, y) {
      const life = { splashS: 0.45, splashM: 0.55, splashL: 0.7, ripple: 0.9, drop: 0.5, bubble: 1.1, bubbles: 0.8 }[kind] || 0.6;
      G.waterFx.push({ kind, x, y, t: 0, life, seed: Math.random() });
      if (G.waterFx.length > 40) G.waterFx.splice(0, G.waterFx.length - 40);
    }
    function updateWaterFx(dt) {
      const P = G.P;
      for (const f of G.waterFx) { f.t += dt; if (f.kind === 'bubble' || f.kind === 'bubbles') f.y -= 46 * dt; }
      G.waterFx = G.waterFx.filter((f) => f.t < f.life && !(f.kind === 'bubble' && P.water && f.y < P.water.y));
      // Burbujas mientras está sumergida; ondas suaves cuando nada en la superficie.
      if (P.water && !P.dead) {
        G.bubbleT -= dt;
        if (G.bubbleT <= 0) {
          if (P.submerged) { waterFx('bubble', P.x + P.face * 8, P.y - 18); G.bubbleT = 0.35 + Math.random() * 0.25; }
          else if (Math.abs(P.vx) > 60) { waterFx('ripple', P.x - P.face * 10, P.water.y); G.bubbleT = 0.45; }
          else G.bubbleT = 0.3;
        }
      }
    }

    /* ---------- Puertas (zonas inferiores) ---------- */
    function doorAt(P) {
      const foot = P.y + P.h / 2;
      for (const d of G.world.doors) {
        if (Math.abs(P.x - d.x) < 30 && Math.abs(foot - d.y) < 8) return d;
      }
      return null;
    }
    function startTransition(door) {
      G.transition = { door, t: 0, dur: 0.5, swapped: false };
      G.state = 'transition';
      G.P.frozen = true; G.P.vx = 0; G.P.vy = 0;
      emit('doorEnter', { door });
    }
    function stepTransition(dt) {
      const tr = G.transition, P = G.P;
      tr.t += dt;
      if (!tr.swapped && tr.t >= tr.dur * 0.45) {
        tr.swapped = true;
        const to = tr.door.to;
        P.x = to.x; P.y = to.y - P.h / 2; P.vx = 0; P.vy = 0;
        P.ground = G.world.platforms.concat(G.world.solids).find((pl) => Math.abs((pl.y ?? pl.y1) - to.y) < 1 && to.x >= pl.x1 - 1 && to.x <= pl.x2 + 1) || null;
        P.airTopFoot = to.y; P.invuln = Math.max(P.invuln, 0.6); P.dropT = 0; P.dashT = 0;
        updateRegion();
        updateCamera(0, true);
        const room = G.room;
        if (room && !room.visited) { room.visited = true; }
        if (room) message('room', ST.MESSAGES.roomEnter[room.theme] || 'ZONA ESCONDIDA', 2.5);
        else message('roomExit', ST.MESSAGES.roomExit, 2.5);
        emit('doorSwap', { door: tr.door, room });
      }
      if (tr.t >= tr.dur) { G.transition = null; P.frozen = false; G.state = 'playing'; }
    }

    function updateRegion() {
      const P = G.P;
      G.room = null;
      for (const r of G.world.rooms) {
        if (P.x > r.x1 - 30 && P.x < r.x2 + 30 && P.y > r.y1 - 40 && P.y < r.y2 + 40) { G.room = r; break; }
      }
      G.region = G.room ? G.room.id : 'main';
    }

    /* ---------- Recogida ---------- */
    function updatePickups(dt) {
      const P = G.P, W = G.world, PW = C.powers;
      if (P.magnetT > 0) {
        for (const g of W.pickups) {
          if (g.got || g.type !== 'gem') continue;
          const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy);
          if (d < PW.magnetRadius && d > 1) { g.x += (dx / d) * PW.magnetSpeed * dt; g.y += (dy / d) * PW.magnetSpeed * dt; }
        }
      }
      for (const pk of W.pickups) {
        if (pk.got) continue;
        if (Math.abs(P.x - pk.x) > 40 || Math.abs(P.y - pk.y) > 60) continue;
        const reach = pk.type === 'gem' ? 29 : 32;
        if (Math.hypot(P.x - pk.x, P.y + P.h * 0.12 - pk.y) >= reach) continue;
        pk.got = true;
        if (pk.type === 'gem') {
          G.run.gems++; addScore(C.scoring.gem);
          emit('gem', { x: pk.x, y: pk.y }); burst(pk.x, pk.y, 0xd9ff65, 12);
        } else if (pk.type === 'power') {
          if (pk.power === 'shield') { P.shield = true; message('pw', '¡ESCUDO! AGUANTA UN GOLPE', 1.2); }
          else if (pk.power === 'magnet') { P.magnetT = PW.magnetTime; message('pw', '¡IMÁN DE CRISTALES! ' + PW.magnetTime + ' s', 1.2); }
          else if (G.run.lives < G.run.maxLives) { G.run.lives++; message('pw', '¡+1 CORAZÓN!', 1.2); }
          else { G.run.gems += 5; addScore(C.scoring.gem * 5); message('pw', '¡+5 CRISTALES!', 1.2); }
          emit('power', { power: pk.power }); burst(pk.x, pk.y, 0xffffff, 14);
        } else if (pk.type === 'key') {
          G.run.keys.add(pk.keyFor); addScore(C.scoring.key);
          emit('key', { pickup: pk }); message('key', ST.MESSAGES.keyGot, 3, 2); burst(pk.x, pk.y, 0xffd35a, 18);
        } else if (pk.type === 'item') {
          if (!G.run.items.includes(pk.itemIndex)) G.run.items.push(pk.itemIndex);
          const first = !G.save.items[pk.itemId];
          G.save.items[pk.itemId] = true; persist();
          addScore(C.scoring.item);
          emit('item', { item: ST.ITEMS[pk.itemIndex], index: pk.itemIndex, first, count: G.run.items.length, total: W.totalItems });
          burst(pk.x, pk.y, 0xffe27a, 26);
        }
      }
    }

    function updateGates() {
      const P = G.P;
      for (const g of G.world.gates) {
        if (g.open) { g.openT = Math.min(1, g.openT + 1 / 30); continue; }
        const near = P.y + P.h / 2 > g.y1 && P.y - P.h / 2 < g.y2 && P.x + P.w / 2 > g.x1 - 4 && P.x - P.w / 2 < g.x2 + 4;
        if (!near) continue;
        if (G.run.keys.has(g.id)) {
          g.open = true; g.locked = false; G.run.keys.delete(g.id);
          emit('gateOpen', { gate: g }); message('gate', ST.MESSAGES.gateOpen, 2, 2);
          burst((g.x1 + g.x2) / 2, (g.y1 + g.y2) / 2, 0xffd35a, 20);
        } else message('gateLocked', ST.MESSAGES.gateLocked, 4);
      }
    }

    function updateSigns() {
      const P = G.P, foot = P.y + P.h / 2;
      for (const s of G.world.signs) {
        const near = Math.abs(P.x - s.x) < 46 && Math.abs(foot - s.y) < 40;
        if (near && !s.near && G.run.t - s.seenT > 4) { s.seenT = G.run.t; emit('sign', { sign: s }); }
        s.near = near;
      }
    }

    /* ---------- Paso principal ---------- */
    function step(dt, inp) {
      const W = G.world;
      if (!W) return;
      if (G.state === 'paused' || G.state === 'menu' || G.state === 'gameover' || G.state === 'won') return;
      W.t += dt;
      G.run.t += G.state === 'playing' || G.state === 'transition' ? dt : 0;
      const P = G.P;
      P.invuln = Math.max(0, P.invuln - dt);
      P.hurtT = Math.max(0, P.hurtT - dt);
      P.magnetT = Math.max(0, P.magnetT - dt);
      G.shakeT = Math.max(0, G.shakeT - dt);
      G.run.comboT = Math.max(0, G.run.comboT - dt);
      if (G.companions) {
        G.companions.warningT = Math.max(0, G.companions.warningT - dt);
        G.companions.meowCD = Math.max(0, G.companions.meowCD - dt);
        G.companions.actionT = Math.max(0, G.companions.actionT - dt);
        if (G.companions.actionT <= 0 && G.companions.action !== 'idle') G.companions.action = 'idle';
        scanCompanionThreats(dt);
        updateCompanionAgents(dt);
        if (G.state === 'playing' && G.P.ground && !G.P.dead && G.companions.warningT <= 0 && G.run.t >= G.companions.purrNext) {
          const lunaShoulder = Math.floor(G.run.t / 6.5) % 2 === 1;
          const moritaShoulder = Math.floor((G.run.t + 3.25) / 7.25) % 2 === 1;
          const cat = lunaShoulder ? 'luna' : moritaShoulder ? 'morita' : null;
          if (cat) { emit('companionPurr', { cat }); G.companions.purrNext = G.run.t + 5.6; }
          else G.companions.purrNext = G.run.t + 0.45;
        }
      }
      if (G.run.comboT <= 0) G.run.combo = 0;
      PHY.updatePlatforms(W, W.t, dt);

      const ctx = { active, onScreen, hurt, hurtbox, jumpHeld: !!inp.jumpHeld, busy: G.state !== 'playing' };

      if (G.state === 'transition') stepTransition(dt);
      else if (G.state === 'dying') {
        G.timers.dying += dt;
        // La animación de derrota es visual (salto y caída en el render); el cuerpo no atraviesa el suelo.
        if (G.timers.dying >= 1.15) finishGameOver();
      } else if (G.state === 'victory') {
        G.timers.victory += dt;
        W.bus.t += dt;
        if (G.timers.victory >= 2.4) finishVictory();
      } else if (G.state === 'playing') {
        let input = inp;
        if (inp.downPressed && P.ground && P.dashT <= 0) {
          const d = doorAt(P);
          if (d) { startTransition(d); input = Object.assign({}, inp, { downPressed: false }); }
        }
        if (G.state === 'playing') {
          const evs = PHY.stepPlayer(P, W, input, dt, []);
          for (const e of evs) handlePhysicsEvent(e);
          updateRegion();
          if (!G.room) {
            const sc = W.sceneAt(P.y);
            if (sc !== G.tramo && P.y < W.bounds.streetY) enterTramo(sc);
            G.run.maxDepth = Math.max(G.run.maxDepth, P.y - W.checkpoints[0].y + P.h / 2);
          }
          for (const cp of W.checkpoints) {
            if (!cp.active && P.ground === cp.plat && Math.abs(P.x - cp.x) < 70 && cp.scene >= (G.checkpoint ? G.checkpoint.scene : 0)) activateCheckpoint(cp);
          }
          const ev2 = [];
          EN.update(W, P, dt, ctx, ev2);
          OB.update(W, P, dt, ctx, ev2);
          for (const e of ev2) handleWorldEvent(e);
          updatePickups(dt);
          updateGates();
          updateSigns();
          if (!G.run.busSeen && !G.room && P.y > W.bounds.streetY - 520) { G.run.busSeen = true; emit('busSeen'); }
          if (P.ground === W.street && U.overlap(U.bodyRect(P), W.goal)) startVictory();
          // Red de seguridad: posición inválida o fuera de todo volumen jugable.
          const lost = !Number.isFinite(P.x) || !Number.isFinite(P.y) || P.y > W.bounds.y2 + 300 ||
            (!G.room && (P.x < W.bounds.x1 - 200 || P.x > W.bounds.x2 + 200));
          if (lost) rescue();
        }
      }
      PHY.updateState(P, dt);
      if (G.state !== 'transition') updateCamera(dt, false);
      if (G.waterFx) updateWaterFx(dt);
      for (const f of G.fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 220 * dt; f.life -= dt; }
      if (G.fx.length) G.fx = G.fx.filter((f) => f.life > 0);
    }

    function rescue() {
      const cp = G.checkpoint || G.world.checkpoints[0];
      const P = G.P;
      P.x = cp.x; P.y = cp.y - P.h / 2; P.vx = 0; P.vy = 0; P.ground = cp.plat; P.airTopFoot = cp.y;
      updateRegion(); updateCamera(0, true);
      emit('rescued');
      hurt(P.x + P.face, P.y, 'fall');
    }

    function handlePhysicsEvent(e) {
      const P = G.P, F = C.fall, d = diff();
      switch (e.type) {
        case 'jump': emit('sfx', { name: 'jump' }); if (G.companions) { G.companions.action = 'excited'; G.companions.actionT = 0.55; } burst(P.x, P.y + P.h / 2, 0x9aff70, 5); break;
        case 'kick': emit('sfx', { name: 'kick' }); burst(P.x + P.face * 34, P.y - 8, 0xffd35a, 6); break;
        case 'dash': emit('sfx', { name: 'dash' }); burst(P.x, P.y - 10, 0x4ce7ee, 10); break;
        case 'drop': emit('sfx', { name: 'drop' }); break;
        case 'crumble': {
          const pl = e.plat;
          emit('sfx', { name: 'crumble' });
          burst((pl.x1 + pl.x2) / 2, pl.y + 4, 0xc9774f, 8);
          message('crumble', '¡TEJA FLOJA! SALTA ANTES DE QUE SE CAIGA', 6, 0);
          break;
        }
        case 'dropDenied': message('dropDenied', ST.MESSAGES.dropDenied, 6, 0); break;
        // V52 · Agua.
        case 'waterEnter': {
          const z = e.zone, big = e.vy > 520, mid = e.vy > 220;
          waterFx(big ? 'splashL' : mid ? 'splashM' : 'splashS', P.x, z.y);
          waterFx('ripple', P.x, z.y);
          emit('sfx', { name: big ? 'splashBig' : 'splash' });
          if (big) G.shakeT = Math.max(G.shakeT, 0.12);
          message('waterHint', '¡AL AGUA! ↑ SUBE · ↓ BUCEA · SALTAR SALE · DASH IMPULSO', 30, 1);
          break;
        }
        case 'waterJump': waterFx('splashM', e.x, e.zone.y); waterFx('drop', e.x - 10, e.zone.y - 6); emit('sfx', { name: 'splash' }); break;
        case 'waterExit': if (e.climb) { waterFx('drop', e.x, e.zone.y - 8); emit('sfx', { name: 'drip' }); } break;
        case 'stroke': waterFx('bubble', P.x + P.face * 6, P.y - 14); emit('sfx', { name: 'swim' }); break;
        case 'swimDash': waterFx('bubbles', P.x - P.face * 22, P.y); emit('sfx', { name: 'dash' }); break;
        case 'wadeSplash': waterFx('splashS', e.x - P.face * 6, e.zone.y); emit('sfx', { name: 'wade' }); break;
        case 'bounce': emit('sfx', { name: 'bounce' }); addCombo(1); burst(P.x, P.y + P.h / 2, 0xffd38a, 10); if (e.plat) e.plat.bounceT = G.world.t; break;
        case 'crate': {
          const s = e.solid, cx = (s.x1 + s.x2) / 2;
          addScore(C.scoring.crate); emit('crate', { solid: s }); burst(cx, s.y1 + 14, 0xc89a62, 18);
          for (let i = 0; i < (s.gems || 0); i++) {
            G.world.pickups.push({ id: s.id + ':gema:' + i, type: 'gem', x: cx + (i - 0.5) * 22, y: s.y1 + 4, r: 10, got: false, phase: i, region: s.region, scene: s.scene });
          }
          break;
        }
        case 'land': {
          const fall = e.fall;
          // V52: caer en agua poco profunda (la pila de la Plaza) también salpica, no solo correr por ella.
          const wz = fall > 24 ? PHY.waterAt(G.world, P) : null;
          if (wz && !wz.deep) {
            const big = fall > 120;
            waterFx(big ? 'splashM' : 'splashS', P.x, wz.y); waterFx('ripple', P.x, wz.y);
            emit('sfx', { name: big ? 'splash' : 'wade' });
          }
          if (e.plat === G.world.street && fall < F.hard) { /* la calle amortigua las bajadas cortas */ }
          if (fall >= d.fallDamage) {
            P.landT = 0.3; P.stunT = F.hardStun; P.vx *= 0.2; G.shakeT = 0.45;
            emit('sfx', { name: 'hard' });
            message('fallHurt', ST.MESSAGES.fallHurt, 1.5, 2);
            hurt(P.x + P.face, P.y, 'fall');
          } else if (fall >= F.hard) {
            P.landT = 0.24; P.stunT = F.hardStun; P.vx *= 0.3; G.shakeT = 0.32; G.run.combo = 0;
            emit('sfx', { name: 'hard' }); message('hard', ST.MESSAGES.hardLanding, 1.2);
            burst(P.x, P.y + P.h / 2, 0xcfd8dc, 16);
          } else {
            if (fall > 60) { P.landT = 0.16; if (G.companions) { G.companions.action = 'bounce'; G.companions.actionT = 0.42; } emit('sfx', { name: 'land' }); }
            const pl = e.plat, w = (pl.x2 - pl.x1) || 0;
            if (fall > F.perfectMinFall && pl.kind !== 'stair' && pl !== G.lastLandPlat && w <= 150 && e.offset <= Math.max(10, w * 0.14)) {
              addScore(C.scoring.perfect); addCombo(2);
              message('perfect', '¡ATERRIZAJE PERFECTO! ×' + mult(), 0.8, 0);
              emit('sfx', { name: 'perfect' }); burst(P.x, P.y + P.h / 2, 0xffe27a, 14);
            } else if (fall > F.perfectMinFall && pl !== G.lastLandPlat) addCombo(1);
          }
          G.lastLandPlat = e.plat;
          break;
        }
        default: break;
      }
    }

    function handleWorldEvent(e) {
      switch (e.type) {
        case 'bossPhase':
          // V56/V57: llevar el evento real de la IA a la capa de interfaz.
          // Antes lo generaba Enemies.hit() pero Game no lo transmitía.
          if (e.foe && e.foe.isBoss) {
            emit('bossPhase', { foe: e.foe });
            burst(e.foe.x, e.foe.y - e.foe.h * 0.5, 0xc9ff72, 14);
            G.shakeT = Math.max(G.shakeT, 0.16);
          }
          break;
        case 'foeKilled':
          G.run.kills++; G.run.gems++; addCombo(1); addScore(C.scoring.foe);
          if (e.foe && e.foe.isBoss) {
            // V50: vencer al jefe ahora premia: +1 corazón (o escudo si vas completa), 5 cristales y 400 pts.
            G.run.bosses++;
            G.run.gems += 5; addScore(C.scoring.boss || 400);
            if (G.run.lives < G.run.maxLives) { G.run.lives++; message('bossReward', '¡JEFE VENCIDO! +1 ♥ · +5 CRISTALES', 3, 3); }
            else { G.P.shield = true; message('bossReward', '¡JEFE VENCIDO! ESCUDO · +5 CRISTALES', 3, 3); }
          }
          emit('foeKilled', { foe: e.foe, how: e.how });
          burst(e.foe.x, e.foe.y - 10, 0xff9a5a, 16);
          burst(e.foe.x, e.foe.y - 14, 0xffffff, 6);                 // chispa blanca de impacto
          G.shakeT = Math.max(G.shakeT, e.foe?.isBoss ? 0.22 : 0.16); // el golpe se siente
          break;
        case 'foeHit':
          if (e.foe?.isBoss) emit('bossHit', { foe: e.foe, how: e.how });
          else emit('sfx', { name: 'stomp' });
          burst(e.foe.x, e.foe.y - 12, e.foe?.isBoss ? 0xff755c : 0xffd35a, e.foe?.isBoss ? 18 : 10);
          burst(e.foe.x, e.foe.y - 14, 0xffffff, 5);                 // destello de conexión
          G.shakeT = Math.max(G.shakeT, e.foe?.isBoss ? 0.16 : 0.12);
          break;
        case 'clank': emit('sfx', { name: 'clank' }); message('clank', 'EL PERRO BRAVO AGUANTA EL DASH · PÍSALO O ESPERA A QUE SE MAREE', 5); break;
        case 'bossBlock':
          emit('sfx', { name: 'clank' });
          burst(e.foe.x, e.foe.y - 18, 0xbfe6ff, 8);
          message('bossBlock', '¡LO BLOQUEA! ESQUIVA SU EMBESTIDA (SALTA) Y GOLPEA CUANDO SE MAREE', 6, 1);
          break;
        case 'shotBroken': addScore(C.scoring.shotBreak); burst(e.shot.x, e.shot.y, 0xff7a5a, 8); emit('sfx', { name: 'stomp' }); break;
        case 'shotHit': burst(e.shot.x, e.shot.y, 0xffb07a, 5); break;
        case 'shoot': emit('sfx', { name: 'shoot' }); companionAlert('projectile'); break;
        case 'foeSeen': emit('enemyDiscovered', { foe: e.foe }); break;
        case 'foeAlert':
          if (e.foe?.isBoss) emit('bossWindup', { foe: e.foe });
          else emit('sfx', { name: 'alert' });
          companionAlert('enemy');
          break;
        case 'potShake': emit('sfx', { name: 'potShake' }); companionAlert('falling-pot'); break;
        case 'potBreak': emit('sfx', { name: 'potBreak' }); burst(e.hazard.x, e.hazard.y, 0xc0704a, 12); break;
        case 'sparkOn': emit('sfx', { name: 'spark' }); companionAlert('electric'); break;
        default: break;
      }
    }

    function drainEvents() { const out = G.events.slice(); G.events.length = 0; return out; }

    Object.assign(G, { setView, newRun, retry, pause, resume, step, hurt, drainEvents, mult, onScreen, updateCamera, defaultSave });
    return G;
  }

  NS.Game = { createGame, defaultSave };
})(typeof globalThis !== 'undefined' ? globalThis : window);
