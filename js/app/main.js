/* ¡Se me fue el camión! — arranque del navegador.
   Bucle: paso fijo de 1/60 s con acumulador (máx. 5 pasos por fotograma, dt real acotado a 0,1 s);
   la simulación no depende de la tasa de refresco. Al ocultar la pestaña se pausa y se suelta toda entrada. */
(function (root) {
  'use strict';
  const NS = root.CAMION;
  const C = NS.CONFIG, ST = NS.STORY, R = NS.Render;
  const DT = C.phys.dt || 1 / 60, MAX_STEPS = 5;
  const params = new URLSearchParams(location.search);
  const QA = params.has('qa'), MANUAL = params.get('manual') === '1';

  /* ---------- Almacenamiento (opcional: algunos visores lo bloquean) ---------- */
  const store = {
    get(k, d) { try { const v = root.localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } },
    set(k, v) { try { root.localStorage.setItem(k, String(v)); } catch (_) { /* sin almacenamiento */ } }
  };
  const SAVE_KEY = 'camion-v36-save';
  const LEVEL_COUNT = NS.LEVELS.LEVEL_SEQUENCE.length;
  function loadSave() {
    let s = null;
    for (const key of [SAVE_KEY, 'camion-v35-save', 'camion-v34-save', 'camion-v33-save']) {
      try { s = JSON.parse(store.get(key, 'null')); } catch (_) { s = null; }
      if (s && typeof s === 'object') break;
    }
    if (!s || typeof s !== 'object') {
      // Migración desde la v21: tramos desbloqueados y récords.
      s = NS.Game.defaultSave();
      s.unlocked = Math.max(1, Math.min(LEVEL_COUNT, +store.get('camion-unlocked', '1') || 1));
      s.bestScore = +store.get('camion-best-score', '0') || 0;
      s.bestDepth = +store.get('camion-descent-best', '0') || 0;
    }
    s.unlocked = Math.max(1, Math.min(LEVEL_COUNT, +s.unlocked || 1));
    return s;
  }
  /* V50 · Opciones. Cada una se guarda en localStorage como camion-opt-<nombre>.
     Las de música/efectos pasaron de SÍ/NO a volumen (se migra el valor anterior). */
  const OPTION_SPEC = {
    difficulty: ['facil', 'normal', 'dificil'],
    musicVol: [0, 25, 50, 75, 100], sfxVol: [0, 25, 50, 75, 100],
    vib: [true, false], shake: ['normal', 'suave', 'no'], zoom: ['cerca', 'normal', 'lejos'],
    ctlSize: ['chico', 'normal', 'grande'], lefty: [false, true], landingRing: [true, false],
    catsHelp: [true, false], relaxed: [false, true], freeSelect: [false, true], cinematics: [true, false], fps: [false, true],
    ninaLook: ['original', 'uniforme', 'rosa', 'buzo', 'astronauta']
  };
  const readOpt = (k, def) => {
    const raw = store.get('camion-opt-' + k, null);
    if (raw === null) return def;
    const list = OPTION_SPEC[k];
    if (typeof def === 'boolean') return raw === '1';
    if (typeof def === 'number') { const n = +raw; return list.includes(n) ? n : def; }
    return list.includes(raw) ? raw : def;
  };
  const opt = {
    difficulty: store.get('camion-opt-diff', store.get('camion-opt-hard', '0') === '1' ? 'dificil' : 'normal'),
    musicVol: readOpt('musicVol', store.get('camion-opt-music', '1') === '1' ? 100 : 0),
    sfxVol: readOpt('sfxVol', store.get('camion-opt-sfx', '1') === '1' ? 100 : 0),
    vib: readOpt('vib', true), shake: readOpt('shake', 'normal'), zoom: readOpt('zoom', 'normal'),
    ctlSize: readOpt('ctlSize', 'normal'), lefty: readOpt('lefty', false), landingRing: readOpt('landingRing', true),
    catsHelp: readOpt('catsHelp', true), relaxed: readOpt('relaxed', false), freeSelect: readOpt('freeSelect', false),
    cinematics: readOpt('cinematics', true), fps: readOpt('fps', false),
    ninaLook: readOpt('ninaLook', 'original')
  };
  if (!C.difficulty[opt.difficulty]) opt.difficulty = 'normal';
  Object.defineProperty(opt, 'music', { get: () => opt.musicVol > 0, enumerable: false });
  Object.defineProperty(opt, 'sfx', { get: () => opt.sfxVol > 0, enumerable: false });
  const cinematicSeen = () => !opt.cinematics || store.get('camion-cinematic-seen', '0') === '1';
  const FOE_TIPS = {
    rat: 'RATA · cae encima, patéala o usa DASH',
    dog: 'PERRO · avisa antes de embestir: salta y contraataca',
    bravo: 'PERRO BRAVO · el DASH rebota: písalo o patéalo cuando se maree',
    chile: 'CHILE · dispara semillas: el DASH las rompe',
    bat: 'MURCIÉLAGO · despierta si te acercas y te persigue',
    pigeon: 'PALOMA · suelta «regalitos» si pasas debajo',
    kid: 'NIÑO · lanza piedras de lejos y embiste de cerca',
    piranha: 'PIRAÑA · vigila el agua y esquiva su carrera',
    shark: 'TIBURÓN · espera a que termine de embestir',
    drone: 'DRON · esquiva la marca y destruye su plasma con DASH'
  };
  const seenFoeKinds = new Set();
  const bossCinematicSeen = new Set();

  /* ---------- Módulos ---------- */
  const canvas = document.getElementById('game');
  R.init(canvas);
  const audio = NS.Audio.createAudio(opt);
  const G = NS.Game.createGame({ save: loadSave(), difficulty: opt.difficulty, onSave: (s) => store.set(SAVE_KEY, JSON.stringify(s)),
    assist: { catsHelp: opt.catsHelp, relaxed: opt.relaxed } });
  const input = NS.Input.createInput({ onDebug: () => { const on = R.toggleDebug(); ui.toast(on ? 'DEPURACIÓN: SÓLIDOS ROJOS · SUPERFICIES VERDES · BAJABLES ROSAS' : 'DEPURACIÓN DESACTIVADA', 3); } });
  const ui = NS.UI.createUI({
    start: (mission, tramo) => startRun(mission, tramo),
    retry: () => { audio.ensure(); input.releaseAll(); ui.clearOverlays(); G.retry(); afterStart(); },
    retryFromCheckpoint: () => { audio.ensure(); input.releaseAll(); ui.clearOverlays(); G.retry(); afterStart(); },
    menu: () => toMenu(),
    togglePause: () => togglePause(),
    option: (k) => setOption(k),
    look: (value) => chooseLook(value),
    resetProgress: () => resetProgress(),
    click: () => { audio.ensure(); audio.sfx('ui'); }
  });

  /** Aplica las opciones a cada módulo (se llama al arrancar y tras cada cambio). */
  function applyOptions() {
    G.assist.catsHelp = opt.catsHelp; G.assist.relaxed = opt.relaxed;
    R.setOptions({ shake: { normal: 1, suave: 0.45, no: 0 }[opt.shake], landingRing: opt.landingRing, ninaLook: opt.ninaLook });
    const zf = { cerca: 0.86, normal: 1, lejos: 1.2 }[opt.zoom] || 1;
    G.viewScale = zf;
    const body = document.body;
    body.style.setProperty('--ctl-scale', String({ chico: 0.84, normal: 1, grande: 1.2 }[opt.ctlSize] || 1));
    body.classList.toggle('lefty', !!opt.lefty);
    body.classList.toggle('showFps', !!opt.fps);
    audio.setVolumes(opt.musicVol / 100, opt.sfxVol / 100);
    resize();
  }

  function setOption(k) {
    audio.ensure();
    const list = OPTION_SPEC[k];
    if (!list) return;
    const cur = opt[k], i = list.indexOf(cur);
    const next = list[(i + 1) % list.length];
    opt[k] = next;
    if (k === 'difficulty') { store.set('camion-opt-diff', next); G.difficulty = next; }
    else store.set('camion-opt-' + k, typeof next === 'boolean' ? (next ? '1' : '0') : String(next));
    if (k === 'musicVol') { if (opt.music && (G.state === 'playing' || G.state === 'transition')) audio.start(); else if (!opt.music) audio.stop(); }
    applyOptions();
    ui.paintOpts(opt);
    if (k === 'freeSelect') ui.paintMenu(G, opt);
    audio.sfx('ui');
    if (k === 'vib' && opt.vib) audio.vibrate(30);
  }

  function chooseLook(value) {
    if (!OPTION_SPEC.ninaLook.includes(value) || opt.ninaLook === value) return;
    opt.ninaLook = value;
    store.set('camion-opt-ninaLook', value);
    applyOptions();
    ui.paintMenu(G, opt);
    audio.ensure();
    audio.sfx('ui');
  }

  function resetProgress() {
    for (const key of [SAVE_KEY, 'camion-v35-save', 'camion-v34-save', 'camion-v33-save', 'camion-unlocked', 'camion-best-score', 'camion-descent-best', 'camion-cinematic-seen']) {
      try { root.localStorage.removeItem(key); } catch (_) { /* sin almacenamiento */ }
    }
    for (let i = 0; i < 40; i++) { try { root.localStorage.removeItem('camion-boss-cinematic-v38-scene-' + i); } catch (_) { /* nada */ } }
    bossCinematicSeen.clear();
    G.save = NS.Game.defaultSave();
    store.set(SAVE_KEY, JSON.stringify(G.save));
    ui.paintMenu(G, opt);
    ui.toast('PROGRESO BORRADO', 2, 2);
  }

  function startRun(mission, tramo, skipIntro) {
    audio.ensure();
    mission = mission | 0; tramo = tramo | 0;
    const go = () => {
      store.set('camion-cinematic-seen', '1');
      input.releaseAll(); ui.clearOverlays();
      G.newRun({ mission, startTramo: tramo, difficulty: opt.difficulty });
      afterStart();
    };
    if (!skipIntro && mission === 0 && tramo === 0 && !cinematicSeen()) ui.showCinematic(go); else go();
  }
  /* La Toxifamilia: entrega una mision SOLO al completar sus escenas.
     Mantiene intacta la seleccion normal del menu y no repite el intro de Sofía. */
  root.addEventListener('camion:toxifamilia:start-mission', (event) => {
    if (G.state !== 'menu') return;
    const detail = event && event.detail || {};
    const m = detail.mission, tramo = detail.tramo;
    if (Number.isInteger(m) && m >= 0 && m < 4 &&
        Number.isInteger(tramo) && tramo >= 0 && tramo < LEVEL_COUNT) {
      startRun(m, tramo, true);
    }
  });

  function afterStart() {
    seenFoeKinds.clear();
    ui.show(null);
    acc = 0;
    if (opt.music) audio.start();
    audio.setTramo(G.tramo, !!G.room, sceneTheme(G.tramo));
    handleEvents(G.drainEvents());
  }
  function toMenu() {
    audio.stop(); input.releaseAll(); ui.clearOverlays();
    if (G.world) { G.state = 'menu'; }
    ui.paintMenu(G, opt); ui.show('menu');
  }
  const sceneTheme = (i) => { const sc = G.world && G.world.scenes[i]; return sc ? (sc.bg === 'metro' ? 'metro' : sc.theme) : 'guadalajara'; };
  function togglePause() {
    if (G.state === 'paused') { G.resume(); input.releaseAll(); ui.show(null); audio.resume(); }
    else if (G.state === 'playing' || G.state === 'transition') { G.pause(); input.releaseAll(); audio.pause(); ui.show('pausePanel'); }
  }

  // Avisos de combate útiles, limitados para no llenar la pantalla en móviles.
  let combatHintT = -999;
  function combatHint(message, priority = 3) {
    const now = G.run ? G.run.t : (G.world ? G.world.t : 0);
    if (now - combatHintT < 1.7) return;
    combatHintT = now;
    ui.toast(message, priority, 1.6);
  }

  /* ---------- Eventos del juego → interfaz y audio ---------- */
  function handleEvents(list) {
    for (const e of list) {
      switch (e.type) {
        case 'message': ui.toast(e.text, e.priority); break;
        case 'chapter': ui.chapter(e.index, e.chapter, G.world.scenes.length, e.scene && e.scene.def && e.scene.def.isNew); audio.setTramo(e.index, false, sceneTheme(e.index)); if (G.run && G.run.t > 0.5) audio.sfx('chapter'); break;
        case 'sfx': audio.sfx(e.name); break;
        case 'bossWindup':
          e.foe.bossWindupStart = animT;
          audio.bossCue(e.foe.kind, 'windup', e.foe.scene);
          break;
        case 'bossHit':
          e.foe.bossHitStart = animT;
          G.shakeT = Math.max(G.shakeT || 0, 0.18);
          audio.bossCue(e.foe.kind, 'hit', e.foe.scene);
          break;
        case 'bossPhase':
          // El cambio de fase tiene un único disparo por jefe al 50 % de vida.
          if (e.foe) {
            audio.bossCue(e.foe.kind, 'windup', e.foe.scene);
            ui.toast('¡SEGUNDA FASE! ' + (e.foe.bossName || 'EL JEFE') + ' SE ACELERA', 4, 3);
          }
          break;
        case 'bossBlock':
          combatHint('EL JEFE BLOQUEA DE FRENTE · ESQUIVA Y ATACA POR DETRÁS', 3);
          audio.sfx('alert'); break;
        case 'clank':
          combatHint('ARMADURA ACTIVA · ESPERA A QUE EL PERRO SE MAREE', 3);
          audio.sfx('alert'); break;
        case 'foeHit':
          audio.sfx('stomp');
          break;
        case 'hurt': audio.sfx(e.kind === 'fall' ? 'hard' : 'hurt'); ui.hurtFlash(); break;
        case 'shieldBreak': audio.sfx('hurt'); break;
        case 'dying': audio.stop(); audio.sfx('lose'); break;
        case 'gameover': ui.showGameOver(e, G); break;
        case 'victoryStart': audio.stop(); audio.sfx('honk'); audio.sfx('motor'); audio.sfx('win'); audio.sfx('luna'); audio.sfx('morita'); break;
        case 'victory': ui.showVictory(e); break;
        case 'gem': audio.sfx('gem'); break;
        case 'power': audio.sfx('power'); break;
        case 'key': audio.sfx('key'); break;
        case 'item': audio.sfx('item'); ui.itemCard(e.item, e.first, e.count, e.total); break;
        case 'gateOpen': audio.sfx('gate'); break;
        case 'doorEnter': audio.sfx('door'); break;
        case 'doorSwap': audio.setTramo(G.tramo, !!e.room, sceneTheme(G.tramo)); break;
        case 'checkpoint': audio.sfx('checkpoint'); audio.sfx(((e.cp?.scene ?? G.tramo) % 2) ? 'morita' : 'luna'); break;
        case 'companionWarning':
          audio.sfx(e.cat === 'morita' ? 'moritaAlert' : 'lunaAlert');
          ui.toast((e.cat === 'morita' ? 'MORITA' : 'LUNA') + ': ¡CUIDADO!', 2, 0.9);
          break;
        case 'companionAssist':
          audio.sfx(e.cat === 'morita' ? 'moritaAlert' : 'lunaAlert');
          ui.toast((e.cat === 'morita' ? 'MORITA' : 'LUNA') + ' distrajo al enemigo', 2, 1.1);
          break;
        case 'companionPurr': audio.sfx(e.cat === 'morita' ? 'moritaPurr' : 'lunaPurr'); break;
        case 'crate': audio.sfx('stomp'); break;
        case 'enemyDiscovered':
          if (e.foe?.isBoss) {
            if ((e.foe.scene | 0) < G.tramo) break; // jefe de un tramo ya superado que asoma arriba: sin aviso
            e.foe.bossIntroStart = animT;
            const sceneIndex = e.foe.scene | 0;
            const seenKey = 'camion-boss-cinematic-v38-scene-' + sceneIndex;
            const firstTwo = opt.cinematics && sceneIndex < 2 && !bossCinematicSeen.has(sceneIndex) && store.get(seenKey, '0') !== '1';
            if (firstTwo) {
              bossCinematicSeen.add(sceneIndex);
              input.releaseAll(); G.shakeT = 0; G.pause(); audio.pause();
              audio.bossCue(e.foe.kind, 'intro', sceneIndex);
              ui.showBossCinematic(e.foe, () => {
                store.set(seenKey, '1'); input.releaseAll(); ui.show(null); G.resume();
                audio.resume();
              });
            } else {
              bossCinematicSeen.add(sceneIndex);
              G.shakeT = Math.max(G.shakeT || 0, 0.1);
              audio.bossCue(e.foe.kind, 'intro', sceneIndex);
              ui.toast((G.world.scenes[e.foe.scene]?.def?.final ? 'JEFE FINAL: ' : 'JEFE: ') + e.foe.bossName, 4, 2.5);
            }
          } else if (e.foe && !seenFoeKinds.has(e.foe.kind)) {
            // V50: la primera vez que aparece cada tipo de enemigo se explica cómo vencerlo (antes, cada
            // enemigo nuevo mostraba "¡CUIDADO, ENEMIGO!" y sonaba como si hubieras tomado un cristal).
            seenFoeKinds.add(e.foe.kind);
            audio.sfx('alert');
            ui.toast(FOE_TIPS[e.foe.kind] || '¡CUIDADO, ENEMIGO!', 3, 3.2);
          }
          break;
        case 'foeKilled':
          if (e.foe?.isBoss) {
            e.foe.bossDefeatStart = animT;
            G.shakeT = Math.max(G.shakeT || 0, 0.22);
            audio.bossCue(e.foe.kind, 'defeat', e.foe.scene);
            setTimeout(() => audio.sfx('otroGato'), 1450);
            ui.toast(ST.MESSAGES.bossDefeated + ': ' + e.foe.bossName, 4, 2.2);
          } else { audio.sfx('stomp'); audio.sfx('otroGato'); }
          break;
        case 'sign': ui.sign(e.sign.text); break;
        case 'busSeen': ui.toast(ST.MESSAGES.busWaiting, 3, 3.2); audio.sfx('honk'); break;
        case 'rescued': ui.toast('VUELVES A LA ÚLTIMA PARADA', 2); break;
        default: break;
      }
    }
  }

  /* ---------- Bucle ---------- */
  let acc = 0, last = performance.now(), animT = 0, errors = 0, hudT = 0, qAcc = 0, qN = 0, quality = 1;
  function frame(now) {
    const real = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    try {
      if (input.consumePause()) togglePause();
      if (!MANUAL) {
        acc += real;
        let n = 0;
        while (acc >= DT && n < MAX_STEPS) { G.step(DT, input.snapshot()); acc -= DT; n++; }
        if (n === MAX_STEPS) acc = 0;
      }
      animT = G.world ? G.world.t : animT + real;
      handleEvents(G.drainEvents());
      ui.tick(real);
      tickFps(real);
      hudT -= real;
      if (hudT <= 0) { ui.hud(G); hudT = 0.1; }
      R.draw(G, animT);
    } catch (err) {
      errors++;
      console.error(err);
      if (errors < 4) ui.toast('Error del juego: ' + (err && err.message ? err.message : err), 9, 5);
    }
    // Resolución adaptativa: si el promedio de fotograma pasa de ~21 ms (menos de ~47 fps) baja la calidad; si va sobrado, la sube.
    if (!MANUAL && G.state === 'playing') {
      qAcc += real; qN++;
      if (qN >= 36) {
        const avg = qAcc / qN;
        if (avg > 0.021 && quality > 0.5) { quality = Math.max(0.5, quality - 0.12); R.setQuality(quality); } // V51: piso 50 % (antes 60 %)
        else if (avg < 0.0145 && quality < 1) { quality = Math.min(1, quality + 0.08); R.setQuality(quality); }
        qAcc = 0; qN = 0;
      }
    }
    root.requestAnimationFrame(frame);
  }

  function resize() { R.resize(); G.setView(root.innerWidth, root.innerHeight); }
  let fpsT = 0, fpsN = 0;
  function tickFps(real) {
    if (!opt.fps) return;
    fpsT += real; fpsN++;
    if (fpsT >= 0.5) { const el = document.getElementById('fpsMeter'); if (el) el.textContent = Math.round(fpsN / fpsT) + ' FPS · ' + Math.round(G.view.zoom * 100) + '%'; fpsT = 0; fpsN = 0; }
  }
  root.addEventListener('resize', resize);
  root.addEventListener('orientationchange', () => setTimeout(resize, 120));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      input.releaseAll();
      if (G.state === 'playing' || G.state === 'transition') { G.pause(); ui.show('pausePanel'); }
      audio.suspend();
    } else last = performance.now();
  });

  /* ---------- Carga ---------- */
  async function boot() {
    ui.setLoading('CARGANDO ESCENARIOS…', false);
    applyOptions();
    // Fondo del menú: la azotea del tramo 1, congelada.
    G.newRun({ startTramo: 0, difficulty: opt.difficulty });
    G.state = 'menu'; G.drainEvents();
    ui.paintMenu(G, opt); ui.show('menu');
    root.requestAnimationFrame(frame);
    const S = NS.LEVELS.LEVEL_SEQUENCE;
    const essential = [
      ...S.map((d) => d.file).filter(Boolean), 'assets/backgrounds/atlas_parallax_city.webp',
      'assets/companions/luna.png', 'assets/companions/morita.png', 'assets/companions/luna_shoulder.png', 'assets/companions/morita_shoulder.png',
      ...Object.values(R.COMPANIONS).flatMap((c) => [...c.idle, ...c.walk]),
      'assets/vehicles/camion_frame_01.png', 'assets/vehicles/camion_frame_02.png', 'assets/vehicles/camion_frame_03.png', 'assets/vehicles/camion_frame_04.png', 'assets/audio/motor_camion_guadalajara_v25.mp3', 'assets/audio/luna_ronroneo_v31.mp3', 'assets/audio/morita_ronroneo_v31.mp3', 'assets/audio/luna_alerta_v31.mp3', 'assets/audio/morita_alerta_v31.mp3', 'assets/audio/sofia_otro_gato_usuario_v38.mp3',
      // V50: Sofía revisada, enemigos limpios y texturas de plataformas.
      ...Object.values(R.NINA_VARIANT_DIR || { d: R.NINA_DIR }).flatMap((dir) => [...new Set(Object.values(R.NINA).flat())].map((f) => dir + f + '.png')),
      ...Object.keys(NS.ART.SKINS).map((k) => 'assets/platforms/' + k + '.png'),
      ...(NS.ART.SWIM ? [NS.ART.SWIM.sheet] : []),   // V52: atlas de nado
      // V53: fondos de los mundos nuevos y gatitas submarinas.
      'assets/scenes/generated/submarino_fondo.png', 'assets/scenes/generated/espacial_fondo.png',
      'assets/player/sofia/sofia_submarina_complementaria.png',
      ...Object.values(R.PARALLAX_LAYERS || {}).flat(),
      ...Object.values(R.COMPANIONS_SUB || {}).flatMap((c) => [...c.idle, ...c.walk, c.shoulder])];
    for (const [kind, E] of Object.entries(NS.ART.ENEMY)) for (const f of Object.keys(E.frames)) essential.push('assets/enemies/v50/' + kind + '/' + f + '.png');
    let timer;
    const res = await Promise.race([R.preload(essential), new Promise((r) => { timer = setTimeout(() => r(null), 1500); })]);
    clearTimeout(timer);
    ui.setLoading('JUGAR HISTORIA', true);
    if (!res) ui.toast('Algunos gráficos terminarán de cargar durante la partida.', 2, 3);
    else if (res.slice(0, 3).some((ok) => !ok)) ui.toast('No se pudo cargar todo el arte: extrae el ZIP completo con la carpeta assets.', 5, 6);
  }

  root.addEventListener('error', (e) => { if (errors++ < 4) ui.toast('Error: ' + (e.message || 'desconocido'), 9, 5); });
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) && !QA) navigator.serviceWorker.register('sw.js').catch(() => {});

  if (QA) {
    root.CAMION_QA = {
      G, input, R, ui, opt,
      step(n, inp) { for (let i = 0; i < n; i++) G.step(DT, Object.assign({ left: false, right: false, jumpPressed: false, jumpHeld: false, dashPressed: false, downPressed: false, upHeld: false, downHeld: false }, typeof inp === 'function' ? inp(i) : inp || {})); handleEvents(G.drainEvents()); ui.hud(G); },
      draw() { R.draw(G, G.world ? G.world.t : 0); },
      start: startRun, menu: toMenu, togglePause
    };
  }
  boot().catch((err) => { console.error(err); ui.setLoading('RECARGAR E INTENTAR', true); ui.toast('Error al iniciar: ' + (err.message || err), 9, 8); });
})(typeof globalThis !== 'undefined' ? globalThis : window);
