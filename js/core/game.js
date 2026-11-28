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
      missions: { escuela: 1, guadalajara: 0, submarino: 0, espacial: 0 }, secrets: {} };
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
      // V58.8.24 · contracts: false = sin contratos (motor clásico); 'opcional' = contratos, efectos y medallas sin
      // bloquear; true = obligatorios (el juego los activa desde OPCIONES → MISIONES).
      assist: Object.assign({ catsHelp: true, relaxed: false, contracts: false }, opts.assist || {})
    };
    if (!G.save.items) G.save.items = {};
    // Compatibilidad: saves anteriores a V53 no traen progreso por misión.
    G.save.missions = Object.assign({ escuela: 1, guadalajara: 0, submarino: 0, espacial: 0 }, G.save.missions || {});
    if (!(G.save.missions.escuela > 0)) G.save.missions.escuela = 1;

    // La práctica usa una copia privada del progreso durante toda la partida.
    let runSave = G.save;
    const emit = (type, data) => { G.events.push(Object.assign({ type }, data || {})); };
    const persist = () => { if (G.onSave && !G.run.practice) G.onSave(runSave); };
    const diff = () => C.difficulty[G.difficulty] || C.difficulty.normal;
    function message(key, text, cd = 2.5, priority = 1) {
      const now = G.run ? G.run.t : 0;
      if (G.msgCD[key] && now < G.msgCD[key]) return;
      G.msgCD[key] = now + cd;
      emit('message', { text, priority, key });
    }

    /* ---------- V58.8.27 · Progreso: banco de cristales y mejoras (js/core/upgrades.js) ---------- */
    const UP = NS.Upgrades;
    const upFx = () => (UP ? UP.effects(runSave) : null);
    const catsCooldown = () => { const fx = upFx(); return fx ? fx.catsCooldown(C.cats.cooldown) : C.cats.cooldown; };
    /** Deposita en el banco los cristales juntados desde la última parada. */
    function bankGems(announce) {
      if (!UP || !G.run) return 0;
      const n = Math.max(0, (G.run.gems | 0) - (G.run.banked | 0));
      G.run.banked = G.run.gems | 0;
      if (!n) return 0;
      UP.deposit(runSave, n);
      if (announce) message('bank', '+' + n + ' CRISTALES AL BANCO · TOTAL ' + runSave.bank, 2, 1.5);
      emit('bank', { n, total: runSave.bank });
      return n;
    }

    /* ---------- V58.8.24 · Contratos de tramo (js/core/contracts.js) ---------- */
    const CT = NS.Contracts;
    const contractsActive = () => !!CT && !!G.assist.contracts;
    const contractsOn = () => contractsActive() && G.assist.contracts === true;
    function makeContract(i) {
      if (!contractsActive()) return null;
      const W = G.world, sc = W.scenes[i], P = G.P;
      const fromY = P ? P.y : sc.startY, ahead = (yy) => yy > fromY - 60;
      const boss = W.foes.find((f) => f.scene === i && f.isBoss && !f.secret && !f.dead);
      const foes = W.foes.filter((f) => f.scene === i && !f.isBoss && !f.dead && ahead(f.y));
      const gems = W.pickups.filter((p) => p.type === 'gem' && p.scene === i && !p.got && ahead(p.y));
      const item = W.pickups.find((p) => p.type === 'item' && p.scene === i);
      const door = item && W.doors.find((d) => d.region === 'main' && d.to && d.to.region === item.region);
      const c = CT.create({
        scene: i, levelId: sc.id, bossAlive: !!boss, bossName: boss ? boss.bossName : '',
        foesAhead: foes.length, gemsAhead: gems.length, itemIndex: item ? item.itemIndex : null,
        itemReachable: !!(door && door.y > fromY - 40), itemOwned: !!(item && (item.got || G.run.items.includes(item.itemIndex))),
        hasSecret: W.doors.some((d) => d.kind === 'secreto' && d.scene === i),
        startFrac: Math.max(0, Math.min(1, (fromY - sc.startY) / sc.drawH)), difficulty: G.difficulty
      });
      // Lluvia: los pisos del tramo mojan (ver Physics.stepPlayer).
      if (c && c.mod === 'lluvia') for (const pl of W.platforms) if (pl.scene === i) pl.wet = true;
      return c;
    }
    function recordContract(c) {
      if (!c) return;
      if (!runSave.contracts) runSave.contracts = {};
      const r = runSave.contracts[c.levelId] || (runSave.contracts[c.levelId] = {});
      let changed = false;
      if (c.mainDone && !r.main) { r.main = true; changed = true; }
      if (c.bonusDone && !r.bonus) { r.bonus = true; changed = true; }
      if (changed) persist();
    }
    function contractEvent(c, ev) {
      if (!CT || !c || G.state !== 'playing' && G.state !== 'transition') return;
      for (const what of CT.update(c, ev)) {
        if (what === 'main') { emit('contractMain', { contract: c }); message('contractMain', '¡MISIÓN CUMPLIDA! ' + (c.main.type === 'jefe' ? 'EL PASO ESTÁ LIBRE' : 'YA PUEDES SEGUIR BAJANDO'), 3, 4); recordContract(c); }
        else if (what === 'bonus') { emit('contractBonus', { contract: c }); message('contractBonus', '★ OPCIONAL CUMPLIDO', 2, 3); recordContract(c); }
        else if (what === 'fail') { if (contractsOn()) failContract(c); else message('contractLate', 'TIEMPO AGOTADO · MISIÓN NO CUMPLIDA', 3, 3); }
      }
    }
    /** Al pasar al tramo siguiente se cierra el contrato del actual. Devuelve false si la misión falla. */
    function leaveTramo(i) {
      const c = G.run.contracts && G.run.contracts[i];
      if (!CT || !c) return true;
      const r = CT.finish(c);
      recordContract(c);
      if (r.ok) return true;
      if (!contractsOn()) { message('contractSkip', 'MISIÓN NO CUMPLIDA · SIGUES DE TODOS MODOS', 3, 3); return true; }
      failContract(c);
      return false;
    }
    function failContract(c) {
      c.failed = c.failed || 'incompleto';
      const P = G.P;
      P.vx = 0; P.vy = 0;
      G.state = 'gameover';
      emit('contractFail', { contract: c });
      emit('gameover', { summary: summary(), newScore: false, checkpointScene: G.checkpoint ? G.checkpoint.scene : 0,
        contract: { reason: CT.failText(c), goal: CT.briefText(c), why: c.why, level: c.levelId } });
    }

    /* ---------- Vista y cámara ---------- */
    function setView(pxW, pxH) {
      const WC = C.world;
      const minH = pxW > pxH * 1.15 ? (WC.viewMinHLandscape || WC.viewMinH) : WC.viewMinH;
      const vs = G.viewScale || 1; // opción CÁMARA: cerca (<1) / normal / lejos (>1)
      const portrait = pxW < pxH * 0.85;
      const minW = portrait ? 310 : WC.viewMinW;
      const zoom = U.clamp(Math.min(pxW / (minW * vs), pxH / (minH * vs)), WC.zoomMin, WC.zoomMax);
      G.view = { pxW, pxH, zoom, w: pxW / zoom, h: pxH / zoom };
      if (G.P) updateCamera(0, true);
    }

  function cameraBounds() {
    const W = G.world, v = G.view;
    let x1, x2, y1, y2;
    if (G.room) { x1 = G.room.x1 - 60; x2 = G.room.x2 + 60; y1 = G.room.y1 - 70; y2 = G.room.y2 + 70; }
    else if (W.schoolMission && W.scenes && W.scenes[0] && W.scenes[0].map.worldArt) {
      // El arte escolar acaba en los bordes de la lámina; la cámara debe usar sus límites exactos, no el margen de 50 u.
      const S = W.scenes[0], A = S.map.worldArt, k = S.scale * A.px;
      x1 = S.x0 - (A.x0 || 0) * k; x2 = x1 + A.width * k; y1 = W.bounds.y1; y2 = W.bounds.y2;
    } else { x1 = W.bounds.x1 - 50; x2 = W.bounds.x2 + 50; y1 = W.bounds.y1; y2 = W.bounds.y2; }
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
    const bodybox = () => U.bodyRect(G.P, C.player.hurtScaleX, C.player.hurtScaleY, G.P.h * (1 - C.player.hurtScaleY) * 0.5);
    const hurtbox = () => (G.P.water && G.P.submerged && G.P.y - G.P.h / 2 > G.P.water.y + 14) ? NOWHERE : bodybox();

    /* ---------- Partida ---------- */
    function newRun(o = {}) {
      const practice = !!o.practice;
      runSave = practice ? { ...G.save, missions: { ...G.save.missions }, items: { ...G.save.items }, secrets: { ...G.save.secrets } } : G.save;
      if (o.difficulty) G.difficulty = o.difficulty;
      const d = diff();
      const missions = NS.LEVELS.MISSIONS;
      // Sin misión explícita se arma la secuencia completa (fondo del menú y pruebas); con misión, su subconjunto.
      const hasMission = missions && o.mission != null;
      const mi = hasMission ? U.clamp(o.mission | 0, 0, missions.length - 1) : 0;
      G.mission = mi; G.missionId = missions ? missions[mi].id : 'escuela';
      G.runMission = hasMission ? mi : null;   // V58: el reintento reconstruye la MISMA misión (antes armaba la secuencia completa)
      const W = NS.World.buildWorld({ difficulty: G.difficulty, seed: o.seed, preservePopulation: G.assist.relaxed, levels: hasMission ? missions[mi].levels : undefined,
        cast: !!G.assist.contracts });   // V58.8.27: el modo misiones usa el reparto protagonista de cada tramo
      G.world = W;
      const startTramo = U.clamp(o.startTramo | 0, 0, W.scenes.length - 1);
      // V58: reintentar desde una parada intermedia reaparece ahí y no al inicio del nivel.
      const mid = o.startMid ? (W.midpoints || []).find((q) => q.scene === startTramo) : null;
      const cp = (o.startSchoolFinal && W.schoolFinalCheckpoint) || (o.startAbyss && W.abyssBeacons.find(q=>q.id===o.startAbyss)) || mid || W.checkpoints[startTramo];
      G.P = PHY.createPlayer(cp.x, cp.y);
      G.P.ground = cp.plat;
      if(cp.abyss){G.P.water=W.waters.find(z=>z.sea&&z.toStreet&&cp.y>z.y&&cp.y<z.y2);G.P.submerged=!!G.P.water;G.P.state='swimUnder';}
      G.P.invuln = startTramo > 0 || mid || cp.schoolFinal ? 1.2 : 0;
      G.run = {
        practice, t: 0, score: 0, combo: 0, comboT: 0, gems: 0, banked: 0, lives: d.lives + (UP ? upFx().lives : 0), maxLives: d.lives + (UP ? upFx().lives : 0), items: [],
        keys: new Set(), deaths: o.deaths || 0, startTramo, maxDepth: 0, kills: 0, bosses: 0, secretBosses: 0, secrets: 0, seenChapters: new Set(), busSeen: false, contracts: {}, contract: null,
        carriedItems: o.carriedItems ? o.carriedItems.slice() : [], schoolRooms: new Set(W.schoolMission ? (o.schoolRooms || []) : [])
      };
      for (const it of G.run.carriedItems) {
        G.run.items.push(it);
        const pk = W.pickups.find((p) => p.type === 'item' && p.itemIndex === it);
        if (pk) pk.got = true;
      }
      G.region = 'main'; G.room = null; G.tramo = startTramo; G.transition = null;
      G.timers = { dying: 0, victory: 0 }; G.shakeT = 0; G.fx = []; G.waterFx = []; G.bubbleT = 0; G.msgCD = Object.create(null); G.events.length = 0;
      G.companions = { warningT: 0, meowCD: 0, senseCD: 0.8, assistCD: 4.2, warningCat: 'luna', warningKind: '', nextCat: 'luna', action: 'idle', actionT: 0, purrNext: 3.4, agents: createCompanionAgents(G.P),
        cmdCD: 0, cmdMax: catsCooldown(), lastCmd: '' };
      // Mejora ESCUDO DE SALIDA: cada misión (y cada reintento) empieza con escudo.
      if (UP && upFx().shield) G.P.shield = true;
      activateCheckpoint(cp, true);
      updateCamera(0, true);
      G.state = 'playing';
      enterTramo(startTramo);
      emit('runStart', { startTramo });
      return G;
    }

    function retry() {
      const cp = G.checkpoint, cpScene = cp ? cp.scene : 0;
      // Objetos que ya se llevan: los de tramos anteriores a la parada (y, si es intermedia, los del mismo tramo).
      // V58: se compara el tramo donde estaba el objeto, no su índice de historia (en la misión 2 no coinciden).
      const sceneOfItem = (idx) => { const pk = G.world.pickups.find((p) => p.type === 'item' && p.itemIndex === idx); return pk ? pk.scene : Infinity; };
      const carried = G.run ? G.run.items.filter((i) => sceneOfItem(i) < cpScene || (cp && cp.mid && sceneOfItem(i) === cpScene)) : [];
      newRun({ mission: G.runMission, practice: !!G.run?.practice, ...(G.world.schoolMission ? {seed:G.world.seed,schoolRooms:[...G.run.schoolRooms]} : {}), startTramo: cpScene, startMid: !!(cp && cp.mid && !cp.abyss && !cp.schoolFinal), startSchoolFinal: !!cp?.schoolFinal, startAbyss: cp?.abyss?cp.id:null, deaths: G.run ? G.run.deaths : 0, carriedItems: carried });
    }

    function activateCheckpoint(cp, silent) {
      if (!silent) bankGems(true);   // V58.8.27: cada parada guarda los cristales en el banco
      for (const c of G.world.checkpoints) c.active = c === cp;
      for (const c of G.world.midpoints || []) c.active = c === cp;
      for(const c of G.world.abyssBeacons||[])c.active=c===cp;
      if(G.world.schoolFinalCheckpoint)G.world.schoolFinalCheckpoint.active=G.world.schoolFinalCheckpoint===cp;
      G.checkpoint = cp;
      if(cp.schoolFinal){if(!silent){emit('checkpoint',{cp});message('schoolFinal','CONSERJERÍA · PUNTO SEGURO ACTIVADO',5,2);}return;}
      if(cp.abyss){if(!silent){emit('checkpoint',{cp});message('abyssCP','BALIZA '+String(cp.index+1).padStart(2,'0')+' ACTIVADA · PUNTO DE RESCATE',5,2);}return;}
      if (cp.mid) { if (!silent) { emit('checkpoint', { cp }); message('cp', ST.MESSAGES.midCheckpoint, 3); } return; }
      if (!runSave.missions) runSave.missions = {};
      let changed = false;
      if (cp.scene + 1 > (runSave.missions[G.missionId] || 0)) { runSave.missions[G.missionId] = cp.scene + 1; changed = true; }
      if (cp.scene + 1 > runSave.unlocked) { runSave.unlocked = cp.scene + 1; changed = true; } // espejo heredado
      if (changed) persist();
      if (!silent) { emit('checkpoint', { cp }); message('cp', ST.MESSAGES.checkpoint, 3); }
    }

    function enterTramo(i) {
      G.tramo = i;
      if (contractsActive() && !G.run.contracts[i]) G.run.contracts[i] = makeContract(i);
      G.run.contract = G.run.contracts[i] || null;
      if (G.run.seenChapters.has(i)) return;
      G.run.seenChapters.add(i);
      emit('chapter', { index: i, chapter: G.world.scenes[i].chapter, scene: G.world.scenes[i], contract: G.run.contract });
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
      if (agent && agent.mode !== 'assist' && agent.mode !== 'pounce' && agent.mode !== 'fetch') { agent.mode = 'alert'; agent.modeT = 1.65; }
      if (c.meowCD <= 0) {
        c.meowCD = 2.8;
        emit('companionWarning', { cat: c.warningCat, kind: c.warningKind });
      }
    }

    function createCompanionAgents(P) {
      const foot = P.y + P.h / 2;
      return {
        luna: { x: companionAnchorX(P.x - 46, P), y: foot, vx: 0, mode: 'follow', modeT: 0, nextMood: 1.7, moodIndex: 0, phase: 0, face: -1, moving: false, target: null },
        morita: { x: companionAnchorX(P.x + 46, P), y: foot, vx: 0, mode: 'follow', modeT: 0, nextMood: 3.1, moodIndex: 1, phase: 1.8, face: 1, moving: false, target: null }
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

        if (a.mode === 'pounce' && a.pounce) {
          const pz = a.pounce, f = a.target;
          pz.t += dt / 0.36;
          const k = Math.min(1, pz.t), tx = f ? f.x - Math.sign(f.x - pz.x0 || 1) * 6 : pz.x0, ty = f ? f.y - (f.h || 20) * 0.35 : pz.y0;
          a.x = pz.x0 + (tx - pz.x0) * k; a.y = pz.y0 + (ty - pz.y0) * k - Math.sin(k * Math.PI) * 58;
          a.face = tx < pz.x0 ? -1 : 1; a.moving = true; a.vx = 0;
          if (pz.t >= 1 && !pz.hit) { pz.hit = true; catStrike(f); }
          if (pz.t >= 1.55) { a.mode = 'return'; a.pounce = null; a.target = null; }
          continue;
        }
        if (a.mode === 'fetch' && a.fetch) {
          const fz = a.fetch;
          fz.t += dt;
          const goingOut = fz.t < 0.45, k = goingOut ? fz.t / 0.45 : Math.min(1, (fz.t - 0.45) / 0.5);
          const fx0 = goingOut ? fz.x0 : fz.tx, fy0 = goingOut ? fz.y0 : fz.ty, fx1 = goingOut ? fz.tx : P.x + side * 46, fy1 = goingOut ? fz.ty : P.y + P.h / 2;
          a.x = fx0 + (fx1 - fx0) * k; a.y = fy0 + (fy1 - fy0) * k - Math.sin(k * Math.PI) * 26;
          a.face = fx1 < fx0 ? -1 : 1; a.moving = true; a.vx = 0;
          if (fz.t >= 0.95) { a.mode = 'follow'; a.fetch = null; }
          continue;
        }
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

        // V58: en la tirolesa las dos viajan en los hombros de Sofía.
        if ((P.zip || P.rope) && a.mode !== 'assist' && a.mode !== 'pounce') { a.mode = 'shoulder'; a.modeT = 0.35; }
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
        // V52: en tierra las gatitas no nadan: mientras Sofía está en agua profunda la esperan en la orilla.
        // V58: en el mundo marino llevan casco y tanque: bucean a su lado.
        const diving = P.water && P.water.theme === 'submarino';
        if (P.water && a.mode !== 'assist' && diving) {
          const spacing = 43; tx = U.clamp(P.x + side * spacing, P.water.x1+12,P.water.x2-12);
          ty = U.clamp(P.y + (name==='luna'?8:23),P.water.y+17,P.water.y2-4);
        }
        else if (P.water && a.mode !== 'assist') {
          const z = P.water, nearLeft = P.x - z.x1 < z.x2 - P.x;
          tx = nearLeft ? z.x1 - 16 - (side < 0 ? 20 : 0) : z.x2 + 16 + (side > 0 ? 20 : 0);
          ty = z.y - 3;
        }
        if (a.mode === 'shoulder' && (P.zip || P.rope)) { a.x = P.x + side * 12; a.y = foot; a.vx = 0; }

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
        // Al pisar una cornisa el resorte horizontal no lleva las patas más allá de su borde.
        if (grounded && !P.water && a.mode !== 'shoulder' && a.mode !== 'assist') {
          const onLedge = companionAnchorX(a.x, P);
          if (onLedge !== a.x) a.vx = 0;
          a.x = onLedge; a.y = P.ground.y;
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
      if (agent && agent.mode !== 'pounce' && agent.mode !== 'fetch') { agent.mode = 'assist'; agent.modeT = 0.58; agent.target = target; }
      emit('companionAssist', { cat: c.warningCat, foe: target });
    }

    /* ---------- V58 · Orden a las gatitas (botón GATAS) ----------
       Si hay un enemigo cerca, Luna se lanza contra él: los comunes caen y un jefe recibe un golpe (si está
       embistiendo de frente solo se marea). Si no hay enemigos, Morita trae los cristales cercanos.
       Enfriamiento compartido (CONFIG.cats.cooldown). Devuelve qué hizo o null. */
    function catCommand() {
      const c = G.companions, P = G.P, W = G.world, CC = C.cats;
      if (!c || !W || G.state !== 'playing' || P.dead || c.cmdCD > 0) { if (c && c.cmdCD > 0) message('catsCD', ST.MESSAGES.catsTired, 1.4, 0); return null; }
      const near = W.foes.filter((f) => !f.dead && f.region === G.region && onScreen(f.x, f.y, 10) && Math.hypot(f.x - P.x, f.y - P.y) < CC.range)
        .sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y));
      c.cmdCD = catsCooldown(); c.cmdMax = c.cmdCD;
      if (near.length) {
        const f = near[0], agent = c.agents && c.agents.luna;
        // V58.2: Luna salta en arco hasta el enemigo y lo araña al caer (el golpe llega con ella, no antes).
        if (agent) { agent.mode = 'pounce'; agent.modeT = 1.4; agent.target = f; agent.pounce = { t: 0, x0: agent.x, y0: agent.y, hit: false }; }
        else catStrike(f);
        c.warningCat = 'luna'; c.warningKind = 'enemy'; c.action = 'assist'; c.actionT = 0.7; c.lastCmd = 'luna';
        burst(f.x, f.y - 14, 0xfff3c4, 16);
        emit('catCommand', { cat: 'luna', foe: f });
        message('catCmd', ST.MESSAGES.catsAttack, 1.2, 2);
        return 'luna';
      }
      let n = 0;
      for (const g of W.pickups) {
        if (g.got || g.type !== 'gem' || g.region !== G.region) continue;
        if (Math.hypot(g.x - P.x, g.y - P.y) < CC.gemRange) { g.fetchT = 2.2; n++; (W._chasing = W._chasing || new Set()).add(g); }
      }
      const agent = c.agents && c.agents.morita;
      // V58.2: Morita corre hasta donde están los cristales y vuelve con ellos (vuelan detrás de ella hacia Sofía).
      const fetched = W.pickups.filter((g) => g.fetchT > 0 && !g.got);
      if (agent && fetched.length) {
        const far = fetched.reduce((b, g) => (Math.hypot(g.x - P.x, g.y - P.y) > Math.hypot(b.x - P.x, b.y - P.y) ? g : b));
        agent.mode = 'fetch'; agent.modeT = 1.4; agent.fetch = { t: 0, x0: agent.x, y0: agent.y, tx: far.x, ty: far.y + 14 };
      } else if (agent) { agent.mode = 'explore'; agent.modeT = 0.9; }
      c.action = 'excited'; c.actionT = 0.9; c.lastCmd = 'morita';
      emit('catCommand', { cat: 'morita', gems: n });
      message('catCmd', n ? ST.MESSAGES.catsFetch.replace('{n}', n) : ST.MESSAGES.catsNothing, 1.4, 2);
      if (!n) c.cmdCD = Math.min(c.cmdCD, 1.2);   // sin nada que traer, se recupera pronto
      return 'morita';
    }

    /** V58.2: el arañazo de Luna (al llegar su salto). Un jefe que embiste de frente solo queda mareado. */
    function catStrike(f) {
      const P = G.P, ev = [];
      if (!f || f.dead) return;
      if (f.isBoss && EN.bossArmored(f, P)) { f.state = 'dizzy'; f.stateT = 0; }
      else EN.hit(f, 'cat', ev, f.x - (Math.sign(f.x - P.x) || 1) * 20);
      for (const e of ev) handleWorldEvent(e);
      burst(f.x, f.y - 14, 0xfff3c4, 16);
      (G.catFx = G.catFx || []).push({ kind: 'claw', x: f.x, y: f.y - (f.h || 24) * 0.55, t: 0, dir: Math.sign(f.x - P.x) || 1 });
      emit('catScratch', { cat: 'luna', foe: f });
    }

    /* ---------- Daño ---------- */
    function hurt(srcX, srcY, kind) {
      const P = G.P, CB = C.combat;
      if (G.state !== 'playing' || P.invuln > 0 || P.dead || G.godMode) return false;
      if (P.zip) { P.zip = null; P.zipCD = 0.6; }   // V58: un golpe la suelta de la tirolesa
      if (P.rope) { P.ropeLast = P.rope; P.rope = null; P.ropeCD = 0.6; }   // V58.2: y de la cuerda
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
      if (G.run.contract && CT) CT.update(G.run.contract, { type: 'hit' });
      if (G.companions && G.companions.agents && kind !== 'fall') {
        for (const name of COMPANION_NAMES) { const a = G.companions.agents[name]; if (a && a.mode !== 'pounce' && a.mode !== 'fetch') { a.mode = 'alert'; a.modeT = 0.8; } }
        G.companions.hissT = 0.8;
      }
      burst(P.x, P.y - 10, 0xff6b69, 14);
      if (G.run.lives <= 0) die();
      return true;
    }

    function die() {
      const P = G.P;
      P.zip = null; P.rope = null;
      P.dead = true; P.vx = 0; P.vy = P.water ? 40 : -260; P.ground = null; P.noCut = true;   // en el agua se hunde
      G.state = 'dying'; G.timers.dying = 0;
      G.run.deaths++;
      emit('dying');
    }

    function finishGameOver() {
      G.state = 'gameover';
      const depth = Math.floor(G.run.maxDepth / 10);
      if (depth > runSave.bestDepth) runSave.bestDepth = depth;
      const newScore = !G.run.practice && G.run.score > runSave.bestScore;
      if (newScore) runSave.bestScore = G.run.score;
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
      const stars = G.world.schoolMission ? 1 + (items >= 1 ? 1 : 0) + (total > 0 && items >= total ? 1 : 0) : 1 + (items >= 3 ? 1 : 0) + (total > 0 && items >= total ? 1 : 0);
      const fullRun = r.startTramo === 0;
      const newTime = !r.practice && fullRun && (!runSave.bestTime || t < runSave.bestTime);
      if (newTime) runSave.bestTime = t;
      const newScore = !r.practice && r.score > runSave.bestScore;
      if (newScore) runSave.bestScore = r.score;
      runSave.wins = (runSave.wins || 0) + 1;
      runSave.unlocked = Math.max(runSave.unlocked, G.world.scenes.length); // espejo heredado
      // V53 · completar la misión la deja toda abierta y desbloquea la siguiente.
      if (!runSave.missions) runSave.missions = {};
      runSave.missions[G.missionId] = Math.max(runSave.missions[G.missionId] || 0, G.world.scenes.length);
      const missions = NS.LEVELS.MISSIONS, next = missions && missions[G.mission + 1];
      // V58.9 · Entre Guadalajara y el mar va la misión especial LA CALZADA (persecución en el camión, js/core/chase.js):
      // al terminar Guadalajara se abre la Calzada; la Calzada abre el submarino.
      const special = G.missionId === 'guadalajara' ? 'calzada' : null;
      if (special) runSave.missions[special] = Math.max(runSave.missions[special] || 0, 1);
      else if (next) runSave.missions[next.id] = Math.max(runSave.missions[next.id] || 0, 1);
      const depth = Math.floor(r.maxDepth / 10);
      if (depth > runSave.bestDepth) runSave.bestDepth = depth;
      // V58 · Escena post-créditos (nexo con Legend of Presos): al terminar la última misión con las 6 llaves.
      const keys = ST.ITEMS.filter((it) => runSave.items[it.id]).length;
      const lastMission = !missions || G.mission === missions.length - 1;
      const postCredits = !r.practice && lastMission && keys >= ST.ITEMS.length;
      if (postCredits) runSave.epilogue = true;
      // V58.8.38: al final, qué llaves faltan y dónde están (cuarto secreto de qué parada), para cerrar la historia.
      const missingKeys = lastMission && !postCredits ? missingKeysWhere(runSave) : [];
      // V58.8.27: los cristales del último tramo al banco y calificación de la misión (solo cuenta desde la parada 1).
      const banked = bankGems(false);
      const sum = summary();
      const grade = UP ? UP.rank({ contracts: sum.contracts, lives: r.lives, maxLives: r.maxLives, deaths: r.deaths }) : null;
      const rankNew = !!(grade && fullRun && !r.practice && UP.recordRank(runSave, G.missionId, grade.rank));
      persist();
      emit('victory', { summary: sum, stars, newTime, newScore, fullRun, ending: ST.ending(items, total, r.lives, G.missionId),
        postCredits, keys, totalKeys: ST.ITEMS.length, missingKeys, lastMission, mission:G.mission, nextMission: special || (next ? G.mission+1 : null),
        rank: grade && grade.rank, rankPoints: grade && grade.points, rankNew, banked, bank: runSave.bank | 0 });
    }

    /** Llaves USB (objetos) que faltan en el guardado y la parada cuyo cuarto secreto las guarda. */
    function missingKeysWhere(save) {
      const out = [], missions = NS.LEVELS && NS.LEVELS.MISSIONS;
      if (!missions) return out;
      missions.forEach((m, mi) => m.levels.forEach((d, t) => {
        const it = ST.ITEMS[d.storyIndex];
        if (it && !(save.items && save.items[it.id])) out.push({ id: it.id, name: it.name, mission: mi, world: m.label, tramo: t + 1 });
      }));
      return out;
    }

    function summary() {
      const r = G.run;
      return { practice: r.practice, time: r.t, score: r.score, gems: r.gems, lives: r.lives, maxLives: r.maxLives, items: r.items.slice(), totalItems: G.world.totalItems, depth: Math.floor(r.maxDepth / 10), kills: r.kills, bosses: r.bosses, totalBosses: G.world.foes.filter((f) => f.isBoss && !f.secret).length, secrets: r.secrets || 0,
        schoolRooms:G.world.schoolMission?G.run.schoolRooms.size:0, schoolTotalRooms:G.world.schoolMission?G.world.rooms.filter(q=>q.schoolArt).length:0, totalSecrets: G.world.rooms.filter((q) => q.secret).length, secretBosses: r.secretBosses || 0, deaths: r.deaths, tramo: G.tramo, relaxed: !!G.assist.relaxed,
        contracts: Object.values(r.contracts || {}).filter(Boolean).reduce((a, c) => { a.total++; if (c.mainDone) a.main++; if (c.bonusDone) a.bonus++; return a; }, { total: 0, main: 0, bonus: 0 }) };
    }

    /* ---------- Puntuación y efectos ---------- */
    const mult = () => 1 + Math.min(C.scoring.comboMaxMult - 1, Math.floor(G.run.combo / C.scoring.comboStep));
    function addCombo(n) { G.run.combo += n; G.run.comboT = C.scoring.comboTime; }
    function addScore(n) { G.run.score += Math.round(n * mult()); }
    function burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 260;
        const life = 0.25 + Math.random() * 0.45;
        G.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: 0.7, color,
          ...(i === 0 && n >= 6 ? { cue: { x, y, life } } : {}) });
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
        if (d.region === G.region && Math.abs(P.x - d.x) < 30 && Math.abs(foot - d.y) < 8) return d;
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
        // V58.7: la primera vez que se entra a una zona secreta se anuncia y queda guardada.
        if (room && room.secret && !room.visited) {
          G.run.secrets = (G.run.secrets || 0) + 1;
          const first = !(runSave.secrets && runSave.secrets[room.secret]);
          runSave.secrets = Object.assign({}, runSave.secrets, { [room.secret]: true }); persist();
          addScore(C.scoring.secret);
          emit('secretFound', { room, first });
          contractEvent(G.run.contract, { type: 'secret' });
        }
        if (room && !room.visited) { room.visited = true; }
        if (room?.schoolArt) G.run.schoolRooms.add(room.id);
        if (room && room.secret) message('room', '¡ZONA SECRETA! ' + room.label, 3, 2);
        else if (room) message('room', room.schoolName || ST.MESSAGES.roomEnter[room.theme] || 'ZONA ESCONDIDA', 2.5);
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
    /* V58: índice de recogibles por franjas de 200 u de altura (hay ~1400 en la misión 2). Se busca en ±400 u: cubre
       lo que el imán (170 u) o Morita (360 u) acercan desde su franja original. Se rehace si se agregan (cajas rotas). */
    const BAND = 200, REACH_BANDS = 2;
    function pickupBands(W) {
      if (!W._pk || W._pkN !== W.pickups.length) {
        W._pk = new Map();
        for (const pk of W.pickups) { const b = Math.floor(pk.baseY / BAND); if (!W._pk.has(b)) W._pk.set(b, []); W._pk.get(b).push(pk); }
        W._pkN = W.pickups.length;
      }
      return W._pk;
    }
    function updatePickups(dt) {
      const P = G.P, W = G.world, PW = C.powers;
      for (const pk of W.pickups) if (pk.baseY === undefined) { pk.baseX = pk.x; pk.baseY = pk.y; }
      const bands = pickupBands(W), b0 = Math.floor(P.y / BAND);
      const near = [];
      for (let b = b0 - REACH_BANDS; b <= b0 + REACH_BANDS; b++) { const l = bands.get(b); if (l) for (const pk of l) if (!pk.got) near.push(pk); }
      // Los que Morita trae persiguen a Sofía aunque ella ya esté lejos de donde estaban.
      if (W._chasing) for (const g of W._chasing) { if (g.got || !(g.fetchT > 0)) W._chasing.delete(g); else if (Math.abs(Math.floor(g.baseY / BAND) - b0) > REACH_BANDS) near.push(g); }
      if (P.magnetT > 0) {
        for (const g of near) {
          if (g.got || g.type !== 'gem') continue;
          const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy);
          if (d < (UP ? upFx().magnetRadius(PW.magnetRadius) : PW.magnetRadius) && d > 1) { g.x += (dx / d) * PW.magnetSpeed * dt; g.y += (dy / d) * PW.magnetSpeed * dt; }
        }
      }
      // V58: cristales que Morita va trayendo hasta Sofía.
      for (const g of near) {
        if (!(g.fetchT > 0) || g.got) continue;
        g.fetchT -= dt;
        const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy);
        if (d > 1) { const v = Math.min(d, C.cats.fetchSpeed * dt); g.x += (dx / d) * v; g.y += (dy / d) * v; }
      }
      for (const pk of near) {
        if (pk.got) continue;
        if (Math.abs(P.x - pk.x) > 40 || Math.abs(P.y - pk.y) > 60) continue;
        const reach = pk.type === 'gem' ? 29 : 32;
        if (Math.hypot(P.x - pk.x, P.y + P.h * 0.12 - pk.y) >= reach) continue;
        pk.got = true;
        if (pk.type === 'gem') {
          G.run.gems++; addScore(C.scoring.gem);
          emit('gem', { x: pk.x, y: pk.y }); burst(pk.x, pk.y, 0xd9ff65, 12);
          contractEvent(G.run.contracts[pk.scene], { type: 'gem' });
        } else if (pk.type === 'power') {
          if (pk.power === 'shield') { P.shield = true; message('pw', '¡ESCUDO! AGUANTA UN GOLPE', 1.2); }
          else if (pk.power === 'magnet') { const mt = UP ? upFx().magnetTime(PW.magnetTime) : PW.magnetTime; P.magnetT = mt; message('pw', '¡IMÁN DE CRISTALES! ' + mt + ' s', 1.2); }
          else if (G.run.lives < G.run.maxLives) { G.run.lives++; message('pw', '¡+1 CORAZÓN!', 1.2); }
          else { G.run.gems += 5; addScore(C.scoring.gem * 5); message('pw', '¡+5 CRISTALES!', 1.2); }
          emit('power', { power: pk.power }); burst(pk.x, pk.y, 0xffffff, 14);
        } else if (pk.type === 'key') {
          G.run.keys.add(pk.keyFor); addScore(C.scoring.key);
          emit('key', { pickup: pk }); message('key', ST.MESSAGES.keyGot, 3, 2); burst(pk.x, pk.y, 0xffd35a, 18);
        } else if (pk.type === 'item') {
          if (!G.run.items.includes(pk.itemIndex)) G.run.items.push(pk.itemIndex);
          const first = !runSave.items[pk.itemId];
          runSave.items[pk.itemId] = true; persist();
          addScore(C.scoring.item);
          emit('item', { item: ST.ITEMS[pk.itemIndex], index: pk.itemIndex, first, count: G.run.items.length, total: W.totalItems });
          contractEvent(G.run.contracts[pk.scene], { type: 'item', itemIndex: pk.itemIndex });
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
      // V58.7: la primera vez en la partida que Sofía pasa junto a una grieta secreta, una pista (sin decir qué hay).
      if (!G.run.secretHint) {
        for (const d of G.world.doors) {
          if (d.kind !== 'secreto' || d.region !== G.region || Math.abs(P.x - d.x) > 150 || Math.abs(foot - d.y) > 70) continue;
          G.run.secretHint = true;
          message('secretHint', ST.MESSAGES.secretHint, 30, 1);
          emit('secretNear', { door: d });
          break;
        }
      }
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
        G.companions.cmdCD = Math.max(0, (G.companions.cmdCD || 0) - dt);
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

      const ctx = { region: G.region, active, onScreen, hurt, hurtbox, bodybox, jumpHeld: !!inp.jumpHeld, busy: G.state !== 'playing' };

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
        if (G.state === 'playing' && inp.catsPressed) catCommand();
        if (G.state === 'playing' && G.run.contract) {
          const cc = G.run.contract;
          contractEvent(cc, { type: 'time', dt });
          // Viento: ráfagas anunciadas que empujan de lado (no en el agua ni en las zonas interiores).
          if (G.state === 'playing' && cc.mod === 'viento' && cc.scene === G.tramo && !G.room && !P.water && !P.rope && !P.zip) {
            const w = CT.wind(cc, dt, !!P.ground);
            if (w.warn) { emit('windWarn', { dir: cc.gust.dir }); message('wind', cc.gust.dir > 0 ? 'VIENTO · ¡RÁFAGA HACIA LA DERECHA! →' : '← ¡RÁFAGA HACIA LA IZQUIERDA! · VIENTO', 2, 3); }
            if (w.accel && P.dashT <= 0) P.vx += w.accel * dt;
          }
        }
        if (G.state === 'playing') {
          const evs = PHY.stepPlayer(P, W, input, dt, []);
          for (const e of evs) handlePhysicsEvent(e);
          updateRegion();
          if (!G.room) {
            const sc = W.sceneAt(P.y);
            if (sc !== G.tramo && P.y < W.bounds.streetY) {
              // V58.8.24: bajar al tramo siguiente cierra el contrato del actual (si falla, se reintenta el tramo).
              if (sc < G.tramo || leaveTramo(G.tramo)) enterTramo(sc);
              // Misión fallida: se corta el paso aquí (si no, se activaría la parada del tramo siguiente).
              if (G.state !== 'playing') return;
            }
            G.run.maxDepth = Math.max(G.run.maxDepth, P.y - W.checkpoints[0].y + P.h / 2);
          }
          // Paradas: solo hacia adelante. La intermedia de un tramo va después de su parada inicial.
          const ahead = (cp) => !G.checkpoint || cp.scene > G.checkpoint.scene || (cp.scene === G.checkpoint.scene && cp.mid && !G.checkpoint.mid);
          for (const cp of W.checkpoints) {
            if (!cp.active && P.ground === cp.plat && Math.abs(P.x - cp.x) < 70 && ahead(cp)) activateCheckpoint(cp);
          }
          for (const cp of W.midpoints || []) {   // V58: basta pisar la fila de la parada intermedia
            if (!cp.active && P.ground === cp.plat && ahead(cp)) activateCheckpoint(cp);
          }
          if(!G.room&&P.water&&P.water.toStreet){
            for(const cp of W.abyssBeacons||[]){
              if((!G.checkpoint||cp.y>G.checkpoint.y+10)&&Math.hypot(P.x-cp.x,P.y-(cp.y-30))<65)activateCheckpoint(cp);
            }
          }
          const ev2 = [];
          EN.update(W, P, dt, ctx, ev2);
          OB.update(W, P, dt, ctx, ev2);
          for (const e of ev2) handleWorldEvent(e);
          updatePickups(dt);
          updateGates();
          updateSigns();
          if (!G.run.busSeen && !G.room && !W.poseidonArena && P.y > (W.portal ? W.portal.y - 420 : W.bounds.streetY - 520)) { G.run.busSeen = true; emit('busSeen'); }
          // V58.2: en el mar que baja hasta el lecho, la escotilla se alcanza buceando.
          if(!G.room && W.schoolFinalCheckpoint && P.ground===W.street && !W.schoolFinalCheckpoint.active)activateCheckpoint(W.schoolFinalCheckpoint);
          if (W.portal && !G.room && P.ground === W.street) {
            // La corriente inferior devuelve a Sofía a un extremo seguro de la repisa final.
            const ledge = W.portal.plat;
            P.x = ledge.x1 + 35; P.y = ledge.y - P.h / 2; P.vy = P.vx = 0;
            P.prevFoot = P.airTopFoot = ledge.y;
            P.ground = ledge;
            updateCamera(0, true);
          }
          const atGoal = W.poseidonArena ? !!P.water : W.portal ? P.ground === W.portal.plat : P.ground === W.street || (P.water && P.water.toStreet);
          if (!G.room && atGoal && U.overlap(U.bodyRect(P), W.goal)) {
            const guard=W.schoolFinal&&W.foes.find(f=>f.id===W.schoolFinal.bossId&&!f.dead);
            const seaGuard=W.poseidonArena&&W.foes.find(f=>f.id===W.poseidonArena.bossId&&!f.dead);
            if(seaGuard)message('poseidonLocked','ESCOTILLA SELLADA · VENCE A POSEIDÓN',4,3);
            else if(guard)message('schoolBusLocked','EL MAESTRO CUSTODIA EL CAMIÓN · VÉNCELO PARA SUBIR',4,3);
            else {
              // V58.8.24: el último tramo también es una misión: hay que cumplirla antes de subir.
              const lc = G.run.contracts[G.tramo];
              if (lc && CT && contractsOn() && !CT.finish(lc).ok) message('contractGoal', CT.goalText(lc) + ' · ANTES DE TERMINAR', 4, 3);
              else { if (lc && CT) { CT.finish(lc); recordContract(lc); } startVictory(); }
            }
          }
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
      // V58.2: efectos de las gatitas (arañazo) y su bufido al ver a Sofía herida.
      if (G.catFx && G.catFx.length) { for (const f of G.catFx) f.t += dt; G.catFx = G.catFx.filter((f) => f.t < 0.42); }
      if (G.companions && G.companions.hissT > 0) G.companions.hissT = Math.max(0, G.companions.hissT - dt);
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
        // V58 · Tirolesa.
        case 'zipGrab': emit('sfx', { name: 'zip' }); message('zipHint', ST.MESSAGES.zipHint, 40, 1); burst(P.x, P.y - P.h / 2 - 6, 0xcfe8ff, 6); break;
        case 'zipJump': case 'zipDrop': emit('sfx', { name: 'zipOff' }); break;
        case 'zipEnd': if (!e.landed) emit('sfx', { name: 'zipOff' }); break;
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
            // V58.7: el jefe de una zona secreta premia igual, pero se cuenta aparte (no es «un jefe que faltó»).
            if (e.foe.secret) G.run.secretBosses = (G.run.secretBosses || 0) + 1; else G.run.bosses++;
            G.run.gems += 5; addScore(C.scoring.boss || 400);
            if (G.run.lives < G.run.maxLives) { G.run.lives++; message('bossReward', '¡JEFE VENCIDO! +1 ♥ · +5 CRISTALES', 3, 3); }
            else { G.P.shield = true; message('bossReward', '¡JEFE VENCIDO! ESCUDO · +5 CRISTALES', 3, 3); }
          }
          if(G.world.schoolFinal?.bossId===e.foe?.id)message('schoolBusOpen','¡SALIDA LIBRE! SUBE AL CAMIÓN DE LA RUTA 6',7,4);
          emit('foeKilled', { foe: e.foe, how: e.how });
          if (e.foe && !e.foe.secret) contractEvent(G.run.contracts[e.foe.scene], { type: 'kill', how: e.how, boss: !!e.foe.isBoss });
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
        // V58.3 · Corrientes marinas y lluvia de asteroides.
        case 'currentOn':
          emit('sfx', { name: 'current' });
          message('current', '¡CORRIENTE FUERTE! NADA HACIA ARRIBA O ABAJO PARA SALIR, O USA DASH', 90, 1);
          break;
        case 'asteroidWarn':
          emit('sfx', { name: 'meteorWarn' }); companionAlert('falling-pot');
          message('asteroid', '¡ASTEROIDE! QUÍTATE DE LA MIRA ROJA', 90, 1);
          break;
        case 'asteroidImpact':
          emit('sfx', { name: 'meteorImpact' }); burst(e.x, e.y - 6, 0xffa25a, 14);
          if (Math.abs(G.P.x - e.x) < 420 && Math.abs(G.P.y - e.y) < 300) G.shakeT = Math.max(G.shakeT || 0, 0.18);
          break;
        default: break;
      }
    }

    function drainEvents() { const out = G.events.slice(); G.events.length = 0; return out; }

    Object.assign(G, { setView, newRun, retry, pause, resume, step, hurt, drainEvents, mult, onScreen, updateCamera, defaultSave, catCommand });
    return G;
  }

  NS.Game = { createGame, defaultSave };
})(typeof globalThis !== 'undefined' ? globalThis : window);
