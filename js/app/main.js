/* ¡Se me fue el camión! — arranque del navegador.
   Bucle: paso fijo de 1/60 s con acumulador (máx. 5 pasos por fotograma, dt real acotado a 0,1 s);
   la simulación no depende de la tasa de refresco. Al ocultar la pestaña se pausa y se suelta toda entrada. */
(function (root) {
  'use strict';
  const NS = root.CAMION;
  const C = NS.CONFIG, ST = NS.STORY, R = NS.Render;
  const DT = C.phys.dt || 1 / 60, MAX_STEPS = 5;
  const params = new URLSearchParams(location.search);
  const QA = params.has('qa'), MANUAL = QA && params.get('manual') === '1';

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
    ninaLook: ['original', 'rosa'],   // V58.6: ropa de calle (Guadalajara y la isla); el uniforme, el buzo y el astronauta van por nivel
    misiones: ['obligatorias', 'opcionales']   // V58.8.24: contratos de tramo (js/core/contracts.js)
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
    ninaLook: readOpt('ninaLook', 'original'),
    misiones: readOpt('misiones', 'obligatorias')
  };
  const contractMode = () => (opt.misiones === 'opcionales' ? 'opcional' : true);
  if (!C.difficulty[opt.difficulty]) opt.difficulty = 'normal';
  Object.defineProperty(opt, 'music', { get: () => opt.musicVol > 0, enumerable: false });
  Object.defineProperty(opt, 'sfx', { get: () => opt.sfxVol > 0, enumerable: false });
  const cinematicSeen = () => !opt.cinematics || store.get('camion-cinematic-seen', '0') === '1';
  // V58.2: la llegada al mar (Sofía asombrada + recuerdo con su papito Estoker) se ve la primera vez que empieza la misión 3.
  const MARINE_CINE_KEY = 'camion-cinematic-marino-seen';
  const GDL_CINE_KEY = 'camion-cinematic-guadalajara-seen';
  const SPACE_CINE_KEY = 'camion-cinematic-espacio-seen';
  const PARAFALLS_CINE_KEY = 'camion-cinematic-parafalls-seen';
  const marineCineSeen = () => store.get(MARINE_CINE_KEY, '0') === '1';
  const guadalajaraCineSeen = () => store.get(GDL_CINE_KEY, '0') === '1';
  const parafallsCineSeen = () => store.get(PARAFALLS_CINE_KEY, '0') === '1';
  const refreshCineMenu = () => { if (NS.ToxiPlayer) NS.ToxiPlayer.refreshMenu(!!G.save.epilogue, marineCineSeen(), guadalajaraCineSeen(), parafallsCineSeen(), store.get(SPACE_CINE_KEY, '0') === '1'); };
  // El reproductor carga después de este archivo: al estar listo recibe el vestuario y pinta los botones del menú.
  root.addEventListener('camion:toxiplayer-ready', () => {
    if (NS.ToxiPlayer.setLook) NS.ToxiPlayer.setLook(opt.ninaLook);
    refreshCineMenu();
  });
  const FOE_TIPS = {
    guardian: 'El guardián levanta el brazo antes de cargar. Salta o espera a que se canse.',
    rat: 'RATA · cae encima, patéala o usa DASH',
    dog: 'PERRO · avisa antes de embestir: salta y contraataca',
    bravo: 'PERRO BRAVO · el DASH rebota: písalo o patéalo cuando se maree',
    chile: 'CHILE · dispara semillas: el DASH las rompe',
    bat: 'MURCIÉLAGO · despierta si te acercas y te persigue',
    pigeon: 'PALOMA · suelta «regalitos» si pasas debajo',
    kid: 'NIÑO · lanza piedras de lejos y embiste de cerca',
    piranha: 'PIRAÑA · vigila el agua y esquiva su carrera',
    shark: 'TIBURÓN · espera a que termine de embestir y golpéalo mareado',
    pulpo: 'PULPO · se infla antes de lanzar tinta: esquívala o rómpela con DASH',
    poseidon: 'POSEIDÓN · embiste con el tridente y lanza olas: golpéalo cuando quede mareado',
    drone: 'DRON · esquiva la marca y destruye su plasma con DASH',
    crab: 'CANGREJO · corre de lado: písalo, patéalo o usa DASH',
    robot: 'ROBOT · embiste tras encender su visor: salta y golpéalo cuando se maree',
    // V58.7 · zonas secretas
    pulpito: 'PULPITO · de cerca se encoge y suelta un tentazo; de lejos escupe tinta: el DASH la rompe',
    buzito: 'NIÑO BUZO · arroja piedras bajo el agua: esquívalas nadando o rómpelas con DASH',
    marciano: 'MARCIANO · su puño brilla antes de disparar: muévete en cuanto lo veas',
    astronino: 'NIÑO ASTRONAUTA · lanza piedras lunares de lejos y embiste de cerca'
  };
  const seenFoeKinds = new Set();
  const bossCinematicSeen = new Set();

  /* ---------- Módulos ---------- */
  const canvas = document.getElementById('game');
  R.init(canvas);
  const audio = NS.Audio.createAudio(opt);
  const G = NS.Game.createGame({ save: loadSave(), difficulty: opt.difficulty, onSave: (s) => store.set(SAVE_KEY, JSON.stringify(s)),
    assist: { catsHelp: opt.catsHelp, relaxed: opt.relaxed, contracts: contractMode() } });
  const input = NS.Input.createInput({ onDebug: () => { const on = R.toggleDebug(); ui.toast(on ? 'DEPURACIÓN: SÓLIDOS ROJOS · SUPERFICIES VERDES · BAJABLES ROSAS' : 'DEPURACIÓN DESACTIVADA', 3); } });
  const ui = NS.UI.createUI({
    start: (mission, tramo) => startRun(mission, tramo),
    retry: () => { audio.ensure(); input.releaseAll(); ui.clearOverlays(); if (chase) { retryChase(); return; } G.retry(); afterStart(); },
    retryFromCheckpoint: () => { audio.ensure(); input.releaseAll(); ui.clearOverlays(); if (chase) { retryChase(); return; } G.retry(); afterStart(); },
    menu: () => toMenu(),
    togglePause: () => togglePause(),
    option: (k) => setOption(k),
    resetProgress: () => resetProgress(),
    story: () => playStory(),
    epilogue: () => playEpilogue(),
    // V58.8.27 · Tienda de mejoras: compra con el banco de cristales y guarda al instante.
    getSave: () => G.save,
    buy: (id) => {
      audio.ensure();
      const r = NS.Upgrades ? NS.Upgrades.buy(G.save, id) : { ok: false };
      if (r.ok) { store.set(SAVE_KEY, JSON.stringify(G.save)); audio.sfx('item'); } else audio.sfx('alert');
      ui.paintMenu(G, opt);
      return r;
    },
    click: () => { audio.ensure(); audio.sfx('ui'); }
  });

  /* V58.8.24 · MISIÓN ESPECIAL · LA CALZADA: persecución en la moto de Doña Tóxica (js/core/chase.js + js/app/chase_render.js).
     Mientras está activa, el bucle simula y dibuja la persecución en lugar del mundo de plataformas. */
  const CR = NS.ChaseRender;
  if (CR) CR.init(canvas);
  let chase = null;
  const CALZADA_CINE_KEY = 'camion-cinematic-calzada-seen';
  const CTL_LABELS = { jump: ['↑', 'CARRIL ↑'], down: ['↓', 'CARRIL ↓'], kick: ['◒', 'PATADA'], dash: ['✦', 'NITRO'], cats: ['🐾', 'GATAS'] };
  const ctlSaved = new Map();
  function relabelControls(on) {
    for (const k of Object.keys(CTL_LABELS)) {
      const b = document.querySelector('.ctl[data-key="' + k + '"]'); if (!b) continue;
      const sm = b.querySelector('small'), sp = b.querySelector('span');
      if (on) { if (!ctlSaved.has(k)) ctlSaved.set(k, [sp && sp.textContent, sm && sm.textContent, b.getAttribute('aria-label')]); if (sp) sp.textContent = CTL_LABELS[k][0]; if (sm) sm.textContent = CTL_LABELS[k][1]; b.setAttribute('aria-label', CTL_LABELS[k][1]); }
      else if (ctlSaved.has(k)) { const [a, c, l] = ctlSaved.get(k); if (sp) sp.textContent = a; if (sm) sm.textContent = c; if (l) b.setAttribute('aria-label', l); }
    }
    const lbl = document.getElementById('stickLabel'); if (lbl) { if (on) { lbl.dataset.prev = lbl.dataset.prev || lbl.textContent; lbl.textContent = 'MANEJAR'; } else if (lbl.dataset.prev) lbl.textContent = lbl.dataset.prev; }
    document.body.classList.toggle('chaseMode', !!on);
  }
  function startChase(section, skipIntro) {
    audio.ensure();
    const practice = !!opt.freeSelect;
    const go = () => {
      input.releaseAll(); ui.clearOverlays();
      chase = NS.Chase.createChase({ difficulty: opt.difficulty, practice, seed: 6, upgrades: NS.Upgrades ? NS.Upgrades.effects(G.save) : null });
      chase.newRun({ section });
      if (G.world) G.state = 'menu';
      relabelControls(true);
      ui.show(null);
      R.preload(CR.urls()).catch(() => {});
      audio.setTramo(0, false, 'guadalajara');
      if (opt.music) audio.start();
      audio.sfx('motor'); audio.sfx('honk');
      acc = 0;
      handleChaseEvents(chase.drainEvents());
    };
    if (!skipIntro && section === 0 && opt.cinematics && store.get(CALZADA_CINE_KEY, '0') !== '1' && NS.ToxiPlayer) {
      const done = () => { if (!practice) store.set(CALZADA_CINE_KEY, '1'); refreshCineMenu(); go(); };
      if (!NS.ToxiPlayer.play({ set: 'calzada', finishLabel: '¡ARRANCA!', onDone: done })) go();
    } else go();
  }
  function exitChase() {
    if (!chase) return;
    chase = null; relabelControls(false);
  }
  function retryChase() { if (!chase) return; chase.retry(); ui.show(null); if (opt.music) audio.start(); audio.sfx('motor'); handleChaseEvents(chase.drainEvents()); }
  function saveNow() { if (!(chase && chase.practice)) store.set(SAVE_KEY, JSON.stringify(G.save)); }
  function handleChaseEvents(list) {
    for (const e of list) {
      switch (e.type) {
        case 'message': ui.toast(e.text, e.priority, 2); break;
        case 'chapter': ui.chapter(e.index, { title: e.section.title, line: e.section.line, driver: e.index === 4 ? 'Al fondo, la barranca. Del otro lado te espera Doña Tóxica.' : 'Sirenas a lo lejos. ¡No te detengas!' }, e.total, true); if (chase.t > 0.5) audio.sfx('chapter'); break;
        case 'checkpoint': audio.sfx('checkpoint'); if (!chase.practice) { NS.Chase.applyCheckpoint(G.save, e.section); saveNow(); } ui.toast('PUNTO DE REAPARICIÓN · TRAMO ' + (e.section + 1), 2, 1.6); break;
        case 'sfx': audio.sfx(e.name); break;
        case 'hurt': audio.sfx('hurt'); ui.hurtFlash(); audio.vibrate && audio.vibrate(40); break;
        case 'boost': audio.vibrate && audio.vibrate(20); break;
        case 'cats': audio.sfx('cats'); audio.sfx('lunaAlert'); break;
        case 'takedown': audio.sfx('otroGato'); break;
        case 'foeWindup': if (e.foe.boss) audio.bossCue('drone', 'windup', 0); else audio.sfx('alert'); break;
        case 'bossIntro': audio.bossCue('drone', 'intro', 0); ui.toast('JEFE: ' + e.foe.name, 4, 2.6); break;
        case 'bossHit': audio.bossCue('drone', 'hit', 0); break;
        case 'bossPhase': audio.bossCue('drone', 'windup', 0); break;
        case 'bossDefeated': audio.bossCue('drone', 'defeat', 0); break;
        case 'finale': ui.clearOverlays(); audio.stop(); audio.sfx('honk'); break;
        case 'splash': audio.vibrate && audio.vibrate([40, 30, 60]); break;
        case 'gameover':
          audio.stop(); audio.sfx('lose');
          ui.showChaseResult({ won: false, stats: e.stats, section: e.section, reason: e.reason });
          break;
        case 'victory': {
          audio.sfx('win'); audio.sfx('luna'); audio.sfx('morita');
          if (!chase.practice) { NS.Chase.applyVictory(G.save, e.stats); saveNow(); }
          const show = () => ui.showChaseResult({ won: true, stats: e.stats, stars: e.stars, best: G.save.chase });
          if (opt.cinematics && NS.ToxiPlayer && NS.ToxiPlayer.play({ set: 'calzada_fin', finishLabel: 'CONTINUAR', onDone: show })) break;
          show();
          break;
        }
        default: break;
      }
    }
  }

  /** Aplica las opciones a cada módulo (se llama al arrancar y tras cada cambio). */
  function applyOptions() {
    G.assist.catsHelp = opt.catsHelp; G.assist.relaxed = opt.relaxed; G.assist.contracts = contractMode();
    R.setOptions({ shake: { normal: 1, suave: 0.45, no: 0 }[opt.shake], landingRing: opt.landingRing, ninaLook: opt.ninaLook });
    if (CR) CR.setOptions({ shake: { normal: 1, suave: 0.45, no: 0 }[opt.shake] });
    if (NS.ToxiPlayer && NS.ToxiPlayer.setLook) NS.ToxiPlayer.setLook(opt.ninaLook);
    const zf = { cerca: 0.86, normal: 1, lejos: 1.2 }[opt.zoom] || 1;
    G.viewScale = zf;
    const body = document.body;
    body.style.setProperty('--ctl-scale', String({ chico: 0.84, normal: 1, grande: 1.2 }[opt.ctlSize] || 1));
    body.classList.toggle('lefty', !!opt.lefty);
    body.classList.toggle('showFps', !!opt.fps);
    audio.setVolumes(opt.musicVol / 100, opt.sfxVol / 100);
    resize();
  }

  // V58.6: los botones rápidos MÚSICA y EFECTOS (pausa) apagan y vuelven a encender el sonido. Antes llamaban a
  // 'music'/'sfx', que no existían en OPTION_SPEC (desde V50 son volúmenes), y tocarlos no hacía nada.
  const lastVol = { musicVol: 100, sfxVol: 100 };
  function setOption(k) {
    audio.ensure();
    if (k === 'music' || k === 'sfx') {
      const key = k + 'Vol';
      if (opt[key] > 0) { lastVol[key] = opt[key]; opt[key] = 0; } else opt[key] = lastVol[key] || 100;
      store.set('camion-opt-' + key, String(opt[key]));
      if (key === 'musicVol') { if (opt.music && (G.state === 'playing' || G.state === 'transition')) audio.start(); else if (!opt.music) audio.stop(); }
      applyOptions(); ui.paintOpts(opt); audio.sfx('ui');
      return;
    }
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

  function resetProgress() {
    for (const key of [SAVE_KEY, 'camion-v35-save', 'camion-v34-save', 'camion-v33-save', 'camion-unlocked', 'camion-best-score', 'camion-descent-best', 'camion-cinematic-seen', MARINE_CINE_KEY, GDL_CINE_KEY, SPACE_CINE_KEY, 'camion-cinematic-calzada-seen', PARAFALLS_CINE_KEY]) {
      try { root.localStorage.removeItem(key); } catch (_) { /* sin almacenamiento */ }
    }
    for (let i = 0; i < 40; i++) { try { root.localStorage.removeItem('camion-boss-cinematic-v38-scene-' + i); } catch (_) { /* nada */ } }
    bossCinematicSeen.clear();
    G.save = NS.Game.defaultSave();
    store.set(SAVE_KEY, JSON.stringify(G.save));
    ui.paintMenu(G, opt);
    refreshCineMenu();
    ui.toast('PROGRESO BORRADO', 2, 2);
  }

  function startRun(mission, tramo, skipIntro) {
    audio.ensure();
    if (mission === 'calzada') { startChase(tramo | 0, skipIntro); return; }
    exitChase();
    mission = mission | 0; tramo = tramo | 0;
    const practice = !!opt.freeSelect; // acceder a cualquier tramo no falsifica el progreso ni fuerza práctica
    const go = () => {
      if (!practice && mission === 0 && tramo === 0) store.set('camion-cinematic-seen', '1');
      input.releaseAll(); ui.clearOverlays();
      if(mission===2){bossCinematicSeen.delete('practice:2');bossCinematicSeen.delete('story:2');}
      G.newRun({ mission, startTramo: tramo, difficulty: opt.difficulty, practice });
      afterStart();
    };
    if (!skipIntro && mission === 0 && tramo === 0 && !cinematicSeen()) {
      if (NS.ToxiPlayer && NS.ToxiPlayer.play({ set: 'prologo', onDone: go })) return;
      ui.showCinematic(go);
    } else if (!skipIntro && mission === 1 && tramo === 0 && opt.cinematics && !guadalajaraCineSeen() && NS.ToxiPlayer) {
      const arrive = () => { if (!practice) store.set(GDL_CINE_KEY, '1'); refreshCineMenu(); go(); };
      if (!NS.ToxiPlayer.play({ set: 'guadalajara', look: 'uniforme', finishLabel: '¡AL CENTRO!', onDone: arrive })) go();
    } else if (!skipIntro && mission === 2 && tramo === 0 && opt.cinematics && !marineCineSeen() && NS.ToxiPlayer) {
      // Terminarla o saltarla cuenta como vista (se repite desde el menú) y en ambos casos empieza la misión.
      const dive = () => { if (!practice) store.set(MARINE_CINE_KEY, '1'); refreshCineMenu(); go(); };
      if (!NS.ToxiPlayer.play({ set: 'marino', look: opt.ninaLook, finishLabel: '¡AL AGUA!', onDone: dive })) go();
    } else if (!skipIntro && mission === 3 && tramo === 0 && opt.cinematics && store.get(SPACE_CINE_KEY, '0') !== '1' && NS.ToxiPlayer) {
      const land = () => { if (!practice) store.set(SPACE_CINE_KEY, '1'); refreshCineMenu(); go(); };
      if (!NS.ToxiPlayer.play({ set: 'espacio', finishLabel: '¡A LA ESTACIÓN!', onDone: land })) go();
    } else if (!skipIntro && mission === 4 && tramo === 0 && opt.cinematics && !parafallsCineSeen()) {
      const enterParafalls = () => { if (!practice) store.set(PARAFALLS_CINE_KEY, '1'); refreshCineMenu(); go(); };
      if (!NS.ToxiPlayer || !NS.ToxiPlayer.play({ set: 'parafalls', finishLabel: '¡AL PARAFALLS!', onDone: enterParafalls })) go();
    } else go();
  }
  function playStory() {
    audio.ensure();
    if (NS.ToxiPlayer && NS.ToxiPlayer.play({ set: 'prologo', onDone: (fin) => { if (fin) startRun(0, 0, true); } })) return true;
    return false;
  }
  function playEpilogue() { audio.ensure(); return !!(NS.ToxiPlayer && NS.ToxiPlayer.play({ set: 'epilogo' })); }
  /* La Toxifamilia: entrega una mision SOLO al completar sus escenas.
     Mantiene intacta la seleccion normal del menu y no repite el intro de Sofía. */
  root.addEventListener('camion:toxifamilia:start-mission', (event) => {
    if (G.state !== 'menu') return;
    const detail = event && event.detail || {};
    const m = detail.mission, tramo = detail.tramo;
    if (Number.isInteger(m) && m >= 0 && m < ((NS.LEVELS && NS.LEVELS.MISSIONS && NS.LEVELS.MISSIONS.length) || 0) &&
        Number.isInteger(tramo) && tramo >= 0 && tramo < LEVEL_COUNT) {
      startRun(m, tramo, true);
    }
  });

  function afterStart() {
    seenFoeKinds.clear();
    ui.show(null);
    acc = 0;
    R.enterWorld(G.missionId);
    R.preload(R.entryArt(G)).catch(() => {});
    // V58.3: primero el tema (para que el mar arranque directo con su banda sonora) y luego la música.
    audio.setTramo(G.tramo, !!G.room, sceneTheme(G.tramo));
    if (opt.music) audio.start();
    handleEvents(G.drainEvents());
  }
  function toMenu() {
    audio.stop(); input.releaseAll(); ui.clearOverlays();
    exitChase();
    if (G.world) { G.state = 'menu'; }
    ui.paintMenu(G, opt); ui.show('menu');
  }
  const sceneTheme = (i) => { const sc = G.world && G.world.scenes[i]; return sc ? (sc.bg === 'metro' ? 'metro' : sc.theme) : 'guadalajara'; };
  function togglePause() {
    if (chase) {
      if (chase.state === 'paused') { chase.state = 'playing'; input.releaseAll(); ui.show(null); audio.resume(); }
      else if (chase.state === 'playing') { chase.state = 'paused'; input.releaseAll(); audio.pause(); ui.show('pausePanel'); }
      return;
    }
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
        case 'chapter': {
          // V58.8.24: el cartel del tramo presenta su misión (por qué, objetivo, efecto y opcional).
          const CTS = NS.Contracts, c = e.contract;
          const ch = c && CTS ? { title: e.chapter.title, line: c.why, driver: CTS.briefText(c) + (c.bonus ? ' · ' + CTS.bonusText(c).replace(/^✓ /, '') : '') } : e.chapter;
          ui.chapter(e.index, ch, G.world.scenes.length, e.scene && e.scene.def && e.scene.def.isNew);
        } audio.setTramo(e.index, false, sceneTheme(e.index)); if (G.run && G.run.t > 0.5) audio.sfx('chapter'); break;
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
        case 'victoryStart': audio.stop(); if (G.mission < 2) { audio.sfx('honk'); audio.sfx('motor'); } audio.sfx('win'); audio.sfx('luna'); audio.sfx('morita'); break;
        case 'victory': ui.showVictory(e); refreshCineMenu(); break;
        case 'gem': audio.sfx('gem'); break;
        case 'power': audio.sfx('power'); break;
        case 'key': audio.sfx('key'); break;
        case 'item': audio.sfx('item'); ui.itemCard(e.item, e.first, e.count, e.total); break;
        case 'gateOpen': audio.sfx('gate'); break;
        case 'doorEnter': audio.sfx('door'); break;
        case 'secretFound': audio.sfx('item'); audio.vibrate && audio.vibrate([30, 40, 30]); break;   // V58.7
        case 'secretNear': audio.sfx('drip'); break;   // V58.7: un goteo apenas audible junto a la grieta
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
        case 'catCommand': audio.sfx('cats'); audio.sfx(e.cat === 'morita' ? 'moritaAlert' : 'lunaAlert'); audio.vibrate && audio.vibrate(25); break;
        case 'catScratch': audio.sfx('stomp'); audio.sfx('luna'); break;   // V58.2: el arañazo de Luna al caer sobre el enemigo
        case 'ropeGrab': audio.sfx('zip'); break;
        case 'ropeJump': case 'ropeDrop': audio.sfx('zipOff'); break;
        case 'crate': audio.sfx('stomp'); break;
        case 'enemyDiscovered':
          // V58.2: el otro gato maúlla al encontrar un enemigo (con su propio enfriamiento en audio.js).
          if (e.foe && !e.foe.dead && (e.foe.scene | 0) >= G.tramo) audio.sfx('otroGato');
          if (e.foe?.isBoss && e.foe.secret) {
            // V58.7: jefe de una zona secreta: aviso propio, sin la cinemática de los jefes de las dos primeras paradas.
            e.foe.bossIntroStart = animT;
            G.shakeT = Math.max(G.shakeT || 0, 0.1);
            audio.bossCue(e.foe.kind, 'intro', e.foe.scene);
            ui.toast('JEFE SECRETO: ' + e.foe.bossName, 4, 2.6);
          } else if (e.foe?.isBoss) {
            if ((e.foe.scene | 0) < G.tramo) break; // jefe de un tramo ya superado que asoma arriba: sin aviso
            e.foe.bossIntroStart = animT;
            const sceneIndex = e.foe.scene | 0;
            const introIndex = ui.bossCinematicIndex(e.foe.kind);
            const seenKey = 'camion-boss-cinematic-v38-scene-' + introIndex;
            const sessionKey = (G.run.practice ? 'practice:' : 'story:') + introIndex;
            const allowCine = sceneIndex < 2 || e.foe.kind === 'poseidon';
            const firstIntro = introIndex != null && opt.cinematics && allowCine &&
              !bossCinematicSeen.has(sessionKey) && (e.foe.kind==='poseidon'||store.get(seenKey, '0') !== '1');
            const showing = firstIntro && ui.showBossCinematic(e.foe, () => {
              if (!G.run.practice) store.set(seenKey, '1');
              input.releaseAll(); ui.show(null); G.resume(); audio.resume();
            });
            if (showing) {
              bossCinematicSeen.add(sessionKey);
              input.releaseAll(); G.shakeT = 0; G.pause(); audio.pause();
            } else {
              G.shakeT = Math.max(G.shakeT || 0, 0.1);
              ui.toast((G.world.scenes[e.foe.scene]?.def?.final ? 'JEFE FINAL: ' : 'JEFE: ') + e.foe.bossName, 4, 2.5);
            }
            audio.bossCue(e.foe.kind, 'intro', sceneIndex);
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
        case 'contractMain': audio.sfx('item'); audio.vibrate && audio.vibrate([30, 40, 30]); break;
        case 'contractBonus': audio.sfx('key'); break;
        case 'contractFail': audio.stop(); audio.sfx('lose'); break;
        case 'windWarn': audio.sfx('alert'); break;
        case 'busSeen': {
          const goals = { submarino: 'LA ESCOTILLA ESTÁ CERCA', espacial: 'EL MÓDULO ESPERA EN LA BASE', parafalls: 'EL PORTAL ESTÁ EN LA REPISA CIRCULAR' };
          ui.toast(goals[G.missionId] || ST.MESSAGES.busWaiting, 3, 3.2);
          if (G.mission < 2) audio.sfx('honk');
          break;
        }
        case 'rescued': ui.toast('VUELVES A LA ÚLTIMA PARADA', 2); break;
        default: break;
      }
    }
  }

  // La toma de llegada se dibuja en el mismo Canvas que la partida. El ensayo de cámara
  // usa un estado de práctica independiente para que un replay nunca altere el guardado.
  let landing = null, lastMenuPaint = -Infinity;
  NS.Arrival = {
    show(mission) {
      if (!Number.isInteger(mission)) { landing = null; return; }
      const shot = NS.Game.createGame({});
      shot.newRun({ mission, practice: true, difficulty: opt.difficulty });
      shot.setView(root.innerWidth, root.innerHeight);
      const cp = shot.checkpoint, floor = cp.plat;
      const direction = cp.x - floor.x1 >= floor.x2 - cp.x ? 1 : -1;
      const origin = NS.util.clamp(cp.x - direction * 85, floor.x1 + 17, floor.x2 - 17);
      landing = { shot, origin, direction, elapsed: 0 };
      R.enterWorld(shot.missionId);
      R.preload(R.entryArt(shot)).catch(() => {});
      paintLanding(0);
    }
  };
  function paintLanding(dt) {
    const { shot, origin, direction } = landing, cp = shot.checkpoint, p = shot.P;
    const floor = cp.plat, t = landing.elapsed += dt;
    const reduced = root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const progress = reduced ? 1 : Math.min(1, t / 1.7);
    const ease = progress * progress * (3 - 2 * progress);
    p.x = origin + (cp.x - origin) * ease; p.y = floor.y - p.h / 2;
    p.face = direction; p.vx = reduced ? 0 : (cp.x - origin) * 6 * progress * (1 - progress) / 1.7;
    p.state = Math.abs(p.vx) > 4 ? 'run' : 'idle'; p.animT = p.stateT = reduced ? 0 : t;
    for (const [name, side] of [['luna', -1], ['morita', 1]]) {
      const cat = shot.companions.agents[name];
      cat.x = NS.util.clamp(p.x + side * 44, floor.x1 + 9, floor.x2 - 9);
      cat.y = floor.y; cat.moving = p.state === 'run'; cat.face = direction;
    }
    const v = shot.view, b = shot.world.bounds;
    shot.cam.x = v.w >= b.x2 - b.x1 ? (b.x1 + b.x2 - v.w) / 2 :
      NS.util.clamp(cp.x - v.w / 2, b.x1, b.x2 - v.w);
    // En retrato se acerca el plano a la superficie para que el mural ocupe la toma.
    const footRatio = v.pxW < v.pxH && !shot.world.shore ? .51 : .64;
    shot.cam.y = cp.y - v.h * footRatio;
    shot.world.t = reduced ? 0 : t;
    R.draw(shot, shot.world.t);
  }

  /* ---------- Bucle ---------- */
  let acc = 0, last = performance.now(), animT = 0, errors = 0, hudT = 0, qAcc = 0, qN = 0, quality = 1;
  function frame(now) {
    const frameElapsed = Math.max(0, (now - last) / 1000);
    const real = Math.min(0.1, frameElapsed);
    last = now;
    try {
      if (NS.ToxiPlayer && NS.ToxiPlayer.active) {
        acc = 0; qAcc = 0; qN = 0;
        if (landing) paintLanding(real);
        root.requestAnimationFrame(frame);
        return;
      }
      if (input.consumePause()) togglePause();
      if (chase) {
        if (!MANUAL) {
          acc += real;
          let n = 0;
          while (acc >= DT && n < MAX_STEPS) { chase.step(DT, input.snapshot()); acc -= DT; n++; }
          if (n === MAX_STEPS) acc = 0;
        }
        animT += real;
        handleChaseEvents(chase.drainEvents());
        ui.tick(real);
        tickFps(real);
        CR.draw(chase, animT);
        root.requestAnimationFrame(frame);
        return;
      }
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
      if (G.state !== 'menu' || now - lastMenuPaint >= 90) {
        R.draw(G, animT); lastMenuPaint = now;
      }
    } catch (err) {
      errors++;
      console.error(err);
      if (errors < 4) ui.toast('Error del juego: ' + (err && err.message ? err.message : err), 9, 5);
    }
    // Resolución adaptativa: si el promedio de fotograma pasa de ~21 ms (menos de ~47 fps) baja la calidad; si va sobrado, la sube.
    if (!MANUAL && G.state === 'playing') {
      qAcc += Math.min(.25, frameElapsed); qN++;
      if (qN >= 36) {
        const avg = qAcc / qN;
        if (avg > 0.021 && quality > 0.55) { quality = Math.max(0.55, quality - 0.10); R.setQuality(quality); } // V51: piso 50 % (antes 60 %)
        else if (avg < 0.0145 && quality < 1) { quality = Math.min(1, quality + 0.04); R.setQuality(quality); }
        qAcc = 0; qN = 0;
      }
    }
    root.requestAnimationFrame(frame);
  }

  function resize() { R.resize(); G.setView(root.innerWidth, root.innerHeight); if (landing) landing.shot.setView(root.innerWidth, root.innerHeight); }
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
      if (chase && chase.state === 'playing') { chase.state = 'paused'; ui.show('pausePanel'); }
      else if (!chase && (G.state === 'playing' || G.state === 'transition')) { G.pause(); ui.show('pausePanel'); }
      audio.suspend();
    } else { last = performance.now(); acc = 0; qAcc = 0; qN = 0; }
  });

  /* ---------- Carga ---------- */
  async function boot() {
    ui.setLoading('CARGANDO ESCENARIOS…', false);
    applyOptions();
    // Fondo del menú: la azotea del tramo 1, congelada.
    G.newRun({ mission: 0, practice: true, startTramo: 0, difficulty: opt.difficulty });
    G.state = 'menu'; G.drainEvents();
    ui.paintMenu(G, opt); ui.show('menu');
    refreshCineMenu();
    root.requestAnimationFrame(frame);
    R.enterWorld(G.missionId);
    const essential = R.entryArt(G);
    let timer;
    const res = await Promise.race([R.preload(essential), new Promise((r) => { timer = setTimeout(() => r(null), 1500); })]);
    clearTimeout(timer);
    ui.setLoading('JUGAR HISTORIA', true);
    prepareOffline();
    if (!res) ui.toast('Algunos gráficos terminarán de cargar durante la partida.', 2, 3);
    else if (res.slice(0, 3).some((ok) => !ok)) ui.toast('No se pudo cargar todo el arte: extrae el ZIP completo con la carpeta assets.', 5, 6);
  }

  root.addEventListener('error', (e) => { if (errors++ < 4) ui.toast('Error: ' + (e.message || 'desconocido'), 9, 5); });
  function prepareOffline() {
    if (!('serviceWorker' in navigator) || !/^https?:/.test(location.protocol) || QA) return;
    const install = () => navigator.serviceWorker.register('sw.js').catch(() => {});
    if (root.requestIdleCallback) root.requestIdleCallback(install, { timeout: 2000 });
    else root.setTimeout(install, 450);
  }

  if (QA) {
    root.CAMION_QA = {
      G, input, R, ui, opt,
      step(n, inp) { for (let i = 0; i < n; i++) G.step(DT, Object.assign({ left: false, right: false, jumpPressed: false, jumpHeld: false, dashPressed: false, downPressed: false, upHeld: false, downHeld: false }, typeof inp === 'function' ? inp(i) : inp || {})); handleEvents(G.drainEvents()); ui.hud(G); },
      draw() { R.draw(G, G.world ? G.world.t : 0); },
      start: startRun, menu: toMenu, togglePause,
      get chase() { return chase; },
      chaseStep(n, inp) { for (let i = 0; i < n; i++) chase.step(DT, Object.assign({}, typeof inp === 'function' ? inp(i) : inp || {})); handleChaseEvents(chase.drainEvents()); },
      chaseDraw(t) { CR.draw(chase, t == null ? chase.t : t); }
    };
  }
  boot().catch((err) => { console.error(err); ui.setLoading('RECARGAR E INTENTAR', true); ui.toast('Error al iniciar: ' + (err.message || err), 9, 8); });
})(typeof globalThis !== 'undefined' ? globalThis : window);
