/* ¡Se me fue el camión! — interfaz DOM (menús, historia, HUD, mensajes y resultados).
   Solo presenta información; las acciones del jugador llegan a main.js mediante callbacks. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtTime = (t) => { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };

  function createUI(cb) {
    const ST = NS.STORY, C = NS.CONFIG;
    const panels = ['menu', 'intro', 'cinematic', 'bossCinematic', 'guide', 'pausePanel', 'result', 'optionsPanel'];
    const LV = NS.LEVELS.LEVEL_SEQUENCE, NLV = LV.length;
    const MISSIONS = NS.LEVELS.MISSIONS || [{ id: 'escuela', label: 'MISIÓN 1', levels: LV }];
    const TOTAL_LEVELS = MISSIONS.reduce((n, M) => n + M.levels.length, 0);
    let selMission = 0;
    const missionUnlocked = (save, id) => (save.missions && save.missions[id]) || 0;
    const CINEMATIC = [
      { tag: 'CAPÍTULO 01 · DESPUÉS DE LA POSADA', title: 'EL ÚLTIMO CAMIÓN SE FUE', text: 'Terminó tarde la posada de la escuela. Sofía llegó a la azotea justo para ver cómo la ruta 6 partía sin ella.', bg: 'assets/scenes/escuela_fondo.png' },
      { tag: 'CAPÍTULO 02 · LUNA Y MORITA', title: 'HAY QUE BAJAR', text: 'Sus gatitas la acompañan por techos, patios y túneles. En el camino, seis cosas de su mochila quedaron atrás.', bg: 'assets/scenes/generated/centro_historico_guadalajara.png' },
      { tag: 'CAPÍTULO 03 · TU MISIÓN', title: 'ALCANZA LA TERMINAL', text: 'Cruza cuatro misiones —la escuela, Guadalajara, el fondo del mar y el espacio—, vence a los jefes y llega al camión. Los seis objetos son opcionales y mejoran el final. ¡Empieza a bajar!', bg: 'assets/scenes/generated/terminal_guadalajara_amanecer.png' }
    ];
    const CINEMATIC_SECONDS = 6;
    const BOSS_CINEMATIC_SECONDS = 3.6;
    const BOSS_CINEMATICS = {
      dog: {
        kind: 'dog', stage: 'TRAMO 1 · LA ESCUELA', boss: 'JEFE FINAL · PERRO FURIOSO',
        scenes: [
          { tag: 'UN RUIDO EN LA AZOTEA', word: '¡GUAU!', title: 'EL LADRIDO DETIENE A SOFÍA', text: 'La ruta 6 acaba de irse. Un ladrido retumba sobre la azotea y alguien bloquea la escalera hacia abajo.', cue: 'LUNA Y MORITA SE PONEN EN GUARDIA.' },
          { tag: 'EL GUARDIÁN DEL TECHO', word: 'GRR…', title: 'EL PERRO FURIOSO', text: 'El estruendo de la posada lo alteró: no es malvado, solo está asustado y protege la salida. No corras directo hacia él.', cue: 'CABEZA ABAJO = SEÑAL DE CARGA.' },
          { tag: 'PLAN DE BATALLA', word: '¡SALTA!', title: 'ESQUIVA Y ESPERA SU MAREO', text: 'Cuando se prepare, salta por encima de la embestida. Al quedar mareado, usa PATADA o cae encima. Luego sigue bajando.', cue: 'AVISO → SALTO → CONTRAATAQUE' }
        ]
      },
      kid: {
        kind: 'kid', stage: 'TRAMO 2 · CENTRO DE GUADALAJARA', boss: 'JEFE FINAL · DUEÑO DEL PERRO · 12 AÑOS',
        scenes: [
          { tag: 'HUELLAS ENTRE LAS CALLES', word: '¿EH?', title: 'EL PERRO SE ESCAPÓ', text: 'Al salir de la escuela, Sofía ve al perro cruzar la plaza. Su dueño viene corriendo detrás y cree que ella lo asustó.', cue: 'PASOS APRESURADOS · UN GRITO SE ACERCA.' },
          { tag: 'UN RIVAL MUY MOLESTO', word: '¡EH!', title: 'EL DUEÑO DEL PERRO', text: 'El niño, de 12 años, está preocupado y furioso. Se planta frente a Sofía: «¡No te metas! ¡Yo lo voy a encontrar!»', cue: 'SU POSTURA ANUNCIA UNA CARGA.' },
          { tag: 'PLAN DE BATALLA', word: '¡ESQUIVA!', title: 'DEJA QUE SE AGOTE', text: 'Espera la señal, salta para esquivarlo y contraataca cuando se maree con PATADA o un pisotón. Después, sigue buscando al perro.', cue: 'AVISO → ESQUIVA → CONTRAATAQUE' }
        ]
      }
    };
    let toastT = 0, toastPri = -1, bannerT = 0, bubbleT = 0, cardT = 0, introIndex = 0, introThen = null;
    let cinematicIndex = 0, cinematicThen = null, cinematicT = 0, bossCineData = null, bossCineThen = null, bossCineIndex = 0, bossCineT = 0, activePanel = null;
    const hudCache = {};

    function show(id) {
      activePanel = id || null;
      for (const p of panels) { const el = $(p); if (el) el.hidden = p !== id; }
      if (id) clearOverlays(); // ningún aviso del juego queda encima o detrás de un panel
      document.body.classList.toggle('bossCineOn', id === 'bossCinematic');
      setPlaying(!id);
    }
    const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
    // El banner de tramo y la tarjeta de objeto comparten la franja superior: se muestran de uno en uno.
    const queue = [];
    const busy = () => bannerT > 0 || cardT > 0;
    function enqueue(fn) { if (busy()) { if (queue.length < 3) queue.push(fn); } else fn(); }
    function setPlaying(on) { document.body.classList.toggle('playing', !!on); }

    /* ---------- Mensajes ---------- */
    function toast(text, priority = 1, dur = 2.4) {
      if (toastT > 0 && priority < toastPri) return;
      const el = $('toast'); el.textContent = text; el.style.opacity = '1';
      toastT = dur; toastPri = priority;
    }
    function chapter(index, ch, total, isNew) { enqueue(() => chapterNow(index, ch, total, isNew)); }
    function chapterNow(index, ch, total, isNew) {
      $('bannerTag').textContent = 'TRAMO ' + (index + 1) + ' / ' + total + (isNew ? ' · ¡NIVEL NUEVO!' : '');
      $('bannerTitle').textContent = ch.title;
      $('bannerLine').textContent = ch.line;
      $('bannerDriver').textContent = ch.driver;
      const el = $('banner'); el.hidden = false; el.classList.remove('out'); bannerT = 3.6; document.body.classList.add('bannerOn');
    }
    function sign(text) { const el = $('bubble'); $('bubbleText').textContent = text; el.hidden = false; el.classList.remove('out'); bubbleT = 4.2; }
    function itemCard(item, first, count, total) { enqueue(() => itemCardNow(item, first, count, total)); }
    function itemCardNow(item, first, count, total) {
      $('cardTag').textContent = 'OBJETO RECUPERADO · ' + count + ' / ' + total + (first ? ' · ¡NUEVO!' : '');
      $('cardTitle').textContent = item.name;
      $('cardText').textContent = item.text;
      const el = $('card'); el.hidden = false; el.classList.remove('out'); cardT = 3.4;
    }
    function hurtFlash() { const el = $('flash'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }

    function tick(dt) {
      if (activePanel === 'cinematic') {
        cinematicT -= dt;
        const bar = $('cineProgressBar');
        if (bar) bar.style.width = (Math.max(0, 1 - cinematicT / CINEMATIC_SECONDS) * 100) + '%';
        if (cinematicT <= 0) cinematicNext();
      }
      if (activePanel === 'bossCinematic' && bossCineData) {
        bossCineT -= dt;
        const bar = $('bossCineProgressBar');
        if (bar) bar.style.width = (Math.max(0, 1 - bossCineT / BOSS_CINEMATIC_SECONDS) * 100) + '%';
        if (bossCineT <= 0) bossCinematicNext();
      }
      if (toastT > 0) { toastT -= dt; if (toastT <= 0) { $('toast').style.opacity = '0'; toastPri = -1; } }
      if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0.35) $('banner').classList.add('out'); if (bannerT <= 0) { $('banner').hidden = true; document.body.classList.remove('bannerOn'); } }
      if (bubbleT > 0) { bubbleT -= dt; if (bubbleT <= 0.3) $('bubble').classList.add('out'); if (bubbleT <= 0) $('bubble').hidden = true; }
      if (cardT > 0) { cardT -= dt; if (cardT <= 0.3) $('card').classList.add('out'); if (cardT <= 0) $('card').hidden = true; }
      if (queue.length && !busy()) queue.shift()();
    }
    function clearOverlays() {
      toastT = 0; bannerT = 0; bubbleT = 0; cardT = 0; toastPri = -1; queue.length = 0;
      $('toast').style.opacity = '0'; $('banner').hidden = true; document.body.classList.remove('bannerOn'); $('bubble').hidden = true; $('card').hidden = true;
    }

    /* ---------- HUD ---------- */
    function set(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
    function setHTML(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).innerHTML = v; } }
    function hud(G) {
      if (!G.run) return;
      const r = G.run, P = G.P, total = G.world.scenes.length;
      set('hudTramo', G.room ? (G.room.theme === 'alcantarilla' ? 'ALCANTARILLA' : 'SÓTANO') : 'TRAMO ' + (G.tramo + 1) + '/' + total);
      const boss = G.world.foes.find((f) => f.isBoss && !f.dead && f.scene === G.tramo && f.region === 'main');
      const worldTheme = G.world.scenes[G.tramo] && G.world.scenes[G.tramo].theme;
      const goalLabel = worldTheme === 'submarino' ? 'META: LLEGA A LA ESCOTILLA' : worldTheme === 'espacial' ? 'META: LLEGA AL MÓDULO' : 'META: LLEGA AL CAMIÓN';
      set('objective', boss ? 'JEFE: ' + boss.bossName : G.tramo === total - 1 ? goalLabel : 'META: SIGUE BAJANDO');
      set('hudTime', fmtTime(r.t));
      set('score', String(r.score));
      set('combo', r.combo >= 2 ? '  ×' + G.mult() + ' COMBO ' + r.combo : '');
      set('gems', String(r.gems));
      let life = '';
      for (let i = 0; i < r.maxLives; i++) life += (i < r.lives ? '♥' : '♡') + (i < r.maxLives - 1 ? ' ' : '');
      if (P.shield) life += ' ◈';
      if (P.magnetT > 0) life += ' ✦' + Math.ceil(P.magnetT);
      set('life', life);
      set('items', r.items.length + '/' + G.world.totalItems);
      setHTML('keyBadge', r.keys.size ? '<span class="key">LLAVE</span>' : '');
    }

    /* ---------- Menú principal ---------- */
    function paintMenu(G, opt) {
      const save = G.save, free = !!(opt && opt.freeSelect);
      // Barra de misiones.
      const mbox = $('missions');
      if (mbox) {
        mbox.innerHTML = '';
        MISSIONS.forEach((M, mi) => {
          const open = free || missionUnlocked(save, M.id) >= 1;
          const isNewM = M.levels.some((d) => d.isNew);
          const b = document.createElement('button');
          b.className = 'mission' + (mi === selMission ? ' sel' : '') + (open ? '' : ' locked') + (isNewM ? ' new' : '');
          const short = M.label.replace(/^MISIÓN \d+ · /, '');
          b.innerHTML = (open ? '' : '🔒 ') + 'M' + (mi + 1) + '<small>' + esc(short) + '</small>';
          b.disabled = !open;
          b.setAttribute('aria-label', open ? 'Misión ' + (mi + 1) + ': ' + short : 'Misión ' + (mi + 1) + ' bloqueada');
          b.onclick = () => { selMission = mi; paintMenu(G, opt); };
          mbox.appendChild(b);
        });
      }
      // Si la misión elegida quedó bloqueada, salta a la primera abierta.
      if (!(free || missionUnlocked(save, MISSIONS[selMission].id) >= 1)) {
        const alt = MISSIONS.findIndex((M) => free || missionUnlocked(save, M.id) >= 1);
        selMission = alt < 0 ? 0 : alt;
      }
      const M = MISSIONS[selMission];
      const unlocked = free ? M.levels.length : missionUnlocked(save, M.id);
      const box = $('tramos');
      box.innerHTML = '';
      M.levels.forEach((def, i) => {
        const ok = i < unlocked || free;
        const ch = ST.CHAPTERS[def.storyIndex], title = (ch && ch.title) || def.label;
        const b = document.createElement('button');
        b.className = 'tramo' + (ok ? '' : ' locked') + (def.isNew ? ' new' : '');
        b.textContent = ok ? String(i + 1) : '·';
        b.title = ok ? title + (def.isNew ? ' (NUEVO)' : '') : 'Bloqueado: llega a la parada de este tramo';
        b.setAttribute('aria-label', ok ? 'Empezar en la parada ' + (i + 1) + ': ' + title : 'Parada ' + (i + 1) + ' bloqueada');
        b.disabled = !ok;
        b.onclick = () => cb.start(selMission, i);
        box.appendChild(b);
      });
      const tl = $('tramosLabel');
      if (tl) tl.textContent = M.label + ' · ELIGE UNA PARADA';
      const looks = $('lookPicker');
      if (looks) {
        looks.replaceChildren();
        for (const [key, label] of [['original', 'ORIGINAL'], ['uniforme', 'UNIFORME'], ['rosa', 'ROSA']]) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'lookOption' + (opt.ninaLook === key ? ' selected' : '');
          b.textContent = label;
          b.setAttribute('aria-pressed', String(opt.ninaLook === key));
          b.onclick = () => cb.look(key);
          looks.appendChild(b);
        }
      }
      const col = $('collection');
      col.innerHTML = ST.ITEMS.map((it) => '<span class="it' + (save.items[it.id] ? ' got' : '') + '" title="' + esc(it.name) + '">' + (save.items[it.id] ? esc(it.name) : '???') + '</span>').join('');
      const found = ST.ITEMS.filter((it) => save.items[it.id]).length;
      $('collectionCount').textContent = found + ' / ' + ST.ITEMS.length;
      const rec = [];
      if (save.bestTime) rec.push('Mejor tiempo ' + fmtTime(save.bestTime));
      if (save.bestScore) rec.push('Récord ' + save.bestScore + ' pts');
      if (save.wins) rec.push(save.wins + (save.wins === 1 ? ' llegada' : ' llegadas'));
      $('records').textContent = rec.join(' · ') || 'Sin récords todavía.';
      const nNew = MISSIONS.reduce((n, M) => n + M.levels.filter((d) => d.isNew).length, 0);
      if ($('levelsCount')) $('levelsCount').textContent = String(TOTAL_LEVELS);
      if ($('newLevels')) $('newLevels').textContent = nNew ? nNew + ' niveles nuevos marcados con ★' : '';
      paintOpts(opt);
    }
    const OPT_LABEL = {
      musicVol: (v) => (v ? v + '%' : 'NO'), sfxVol: (v) => (v ? v + '%' : 'NO'),
      vib: (v) => (v ? 'SÍ' : 'NO'), shake: (v) => ({ normal: 'NORMAL', suave: 'SUAVE', no: 'NO' }[v]),
      zoom: (v) => ({ cerca: 'CERCA', normal: 'NORMAL', lejos: 'LEJOS' }[v]), ctlSize: (v) => ({ chico: 'CHICOS', normal: 'NORMALES', grande: 'GRANDES' }[v]),
      lefty: (v) => (v ? 'SÍ' : 'NO'), landingRing: (v) => (v ? 'SÍ' : 'NO'), catsHelp: (v) => (v ? 'SÍ' : 'NO'),
      relaxed: (v) => (v ? 'SÍ' : 'NO'), freeSelect: (v) => (v ? 'SÍ' : 'NO'), cinematics: (v) => (v ? 'VER' : 'SALTAR'), fps: (v) => (v ? 'SÍ' : 'NO'),
      difficulty: (v) => (C.difficulty[v] || C.difficulty.normal).label,
      ninaLook: (v) => ({ original: 'ORIGINAL', uniforme: 'UNIFORME', rosa: 'ROSA' }[v] || 'ORIGINAL')
    };
    function paintOpts(opt) {
      for (const pre of ['', 'p']) {
        const m = $(pre + 'optMusic'), s = $(pre + 'optSfx'), v = $(pre + 'optVib');
        if (m) m.textContent = 'MÚSICA: ' + OPT_LABEL.musicVol(opt.musicVol);
        if (s) s.textContent = 'EFECTOS: ' + OPT_LABEL.sfxVol(opt.sfxVol);
        if (v) v.textContent = 'VIBRACIÓN: ' + OPT_LABEL.vib(opt.vib);
      }
      const d = C.difficulty[opt.difficulty] || C.difficulty.normal;
      $('optDiff').textContent = 'DIFICULTAD: ' + d.label;
      $('diffHelp').textContent = d.lives + ' vidas · enemigos ' + (d.foeDensity < 1 ? 'escasos y lentos' : d.foeDensity > 1 ? 'numerosos y rápidos' : 'normales') + ' · caída dañina desde ' + Math.round(d.fallDamage / 10) + ' m' + (opt.relaxed ? ' · MODO RELAJADO' : '');
      for (const b of document.querySelectorAll('#optionsPanel [data-opt]')) {
        const k = b.dataset.opt, f = OPT_LABEL[k];
        if (f) b.textContent = f(opt[k]);
        b.setAttribute('aria-label', (b.closest('.optRow')?.querySelector('span')?.textContent || k) + ': ' + b.textContent);
      }
    }
    let optReturn = 'menu', resetArmed = 0;
    function showOptions(from) { optReturn = from || 'menu'; resetArmed = 0; $('optReset').textContent = 'BORRAR PROGRESO'; show('optionsPanel'); }

    /* ---------- Historia ---------- */
    function showIntro(then) {
      introIndex = 0; introThen = then || null;
      paintIntro(); show('intro');
    }
    function paintIntro() {
      const c = ST.INTRO[introIndex];
      $('introTag').textContent = c.tag;
      $('introTitle').textContent = c.title;
      $('introText').textContent = c.text;
      $('introNext').textContent = introIndex < ST.INTRO.length - 1 ? 'SIGUIENTE' : (introThen ? '¡A CORRER!' : 'VOLVER');
      $('introDots').innerHTML = ST.INTRO.map((_, i) => '<i class="' + (i === introIndex ? 'on' : '') + '"></i>').join('');
    }
    function introNext() {
      if (introIndex < ST.INTRO.length - 1) { introIndex++; paintIntro(); return; }
      const then = introThen; introThen = null;
      if (then) then(); else cb.menu();
    }
    function introSkip() { const then = introThen; introThen = null; if (then) then(); else cb.menu(); }

    function paintCinematic() {
      const c = CINEMATIC[cinematicIndex];
      $('cineScene').style.backgroundImage = 'url("' + c.bg + '")';
      $('cineTag').textContent = c.tag;
      $('cineTitle').textContent = c.title;
      $('cineText').textContent = c.text;
      $('cineNext').textContent = cinematicIndex < CINEMATIC.length - 1 ? 'SIGUIENTE ESCENA' : '¡EMPEZAR MISIÓN!';
      $('cineDots').innerHTML = CINEMATIC.map((_, i) => '<i class="' + (i === cinematicIndex ? 'on' : '') + '"></i>').join('');
      $('cineProgressBar').style.width = '0%';
      cinematicT = CINEMATIC_SECONDS;
    }
    function showCinematic(then) { cinematicIndex = 0; cinematicThen = then || null; paintCinematic(); show('cinematic'); }
    function cinematicFinish() { const then = cinematicThen; cinematicThen = null; cinematicT = 0; if (then) then(); else cb.menu(); }
    function cinematicNext() {
      if (cinematicIndex < CINEMATIC.length - 1) { cinematicIndex++; paintCinematic(); return; }
      cinematicFinish();
    }

    function paintBossCinematic() {
      const c = bossCineData.scenes[bossCineIndex], word = $('bossCineWord');
      $('bossCinematic').dataset.kind = bossCineData.kind;
      const bg = bossCineData.kind === 'dog' ? 'assets/scenes/generated/escuela_patio_tarde.png' : 'assets/scenes/generated/centro_historico_guadalajara.png';
      const stage = $('bossCineScene');
      stage.style.backgroundImage = 'linear-gradient(180deg,rgba(4,14,26,.48),rgba(4,12,24,.9)),url("' + bg + '")';
      stage.style.backgroundSize = 'cover'; stage.style.backgroundPosition = 'center';
      $('bossCineStage').textContent = bossCineData.stage;
      $('bossCineBoss').textContent = bossCineData.boss;
      $('bossCineTag').textContent = c.tag;
      $('bossCineTitle').textContent = c.title;
      $('bossCineText').textContent = c.text;
      $('bossCineCue').textContent = c.cue;
      $('bossCineStep').textContent = 'SECUENCIA 0' + (bossCineIndex + 1) + ' / 03';
      word.textContent = c.word;
      word.classList.remove('pop'); void word.offsetWidth; word.classList.add('pop');
      $('bossCineDots').innerHTML = bossCineData.scenes.map((_, i) => '<i class="' + (i === bossCineIndex ? 'on' : '') + '"></i>').join('');
      $('bossCineProgressBar').style.width = '0%';
      $('bossCineNext').textContent = bossCineIndex < bossCineData.scenes.length - 1 ? 'SIGUIENTE' : '¡AL COMBATE!';
      bossCineT = BOSS_CINEMATIC_SECONDS;
    }
    function showBossCinematic(foe, then) {
      const data = foe && BOSS_CINEMATICS[foe.kind];
      if (!data) return false;
      bossCineData = data; bossCineIndex = 0; bossCineThen = then || null;
      paintBossCinematic(); show('bossCinematic');
      return true;
    }
    function bossCinematicFinish() {
      const then = bossCineThen; bossCineThen = null; bossCineData = null; bossCineT = 0;
      if (then) then(); else cb.menu();
    }
    function bossCinematicNext() {
      if (!bossCineData) return;
      if (bossCineIndex < bossCineData.scenes.length - 1) { bossCineIndex++; paintBossCinematic(); return; }
      bossCinematicFinish();
    }

    /* ---------- Resultados ---------- */
    function itemsList(found) {
      return '<div class="itemsRow">' + ST.ITEMS.map((it, i) => '<span class="it' + (found.includes(i) ? ' got' : '') + '">' + (found.includes(i) ? esc(it.name) : '???') + '</span>').join('') + '</div>';
    }
    function showGameOver(e, G) {
      const s = e.summary, tr = e.checkpointScene + 1;
      $('resultTag').textContent = 'TE QUEDASTE EN EL TRAMO ' + (s.tramo + 1);
      $('resultTitle').innerHTML = 'SE FUE<br><span>OTRA VEZ…</span>';
      $('resultText').innerHTML = 'Tiempo ' + fmtTime(s.time) + ' · ' + s.score + ' pts' + (e.newScore ? ' (¡récord!)' : '') + ' · ' + plural(s.gems, 'cristal', 'cristales') + ' · ' + s.depth + ' m<br>El camión sigue esperando en la terminal. Reaparecerás en la parada del tramo ' + tr + '.';
      $('resultStars').innerHTML = '';
      $('resultItems').innerHTML = itemsList(s.items);
      $('retry').textContent = 'REINTENTAR DESDE LA PARADA ' + tr;
      $('retry').dataset.mode = 'retry';
      show('result');
    }
    function showVictory(e) {
      const s = e.summary;
      $('resultTag').textContent = 'TERMINAL ARCADAS · RUTA 6';
      $('resultTitle').innerHTML = e.ending.title;
      $('resultText').innerHTML = esc(e.ending.text) + '<br><br>Tiempo ' + fmtTime(s.time) + (e.newTime ? ' (¡mejor tiempo!)' : '') + ' · ' + s.score + ' pts' + (e.newScore ? ' (¡récord!)' : '') + ' · ' + plural(s.gems, 'cristal', 'cristales') + ' · ' + plural(s.kills, 'enemigo', 'enemigos') + ' · jefes ' + (s.bosses || 0) + '/' + (s.totalBosses || NLV) + (s.relaxed ? '<br><small>Modo relajado activo: los récords cuentan igual, pero sin perder vidas.</small>' : '') + (e.fullRun ? '' : '<br><small>Empezaste en un tramo intermedio: el mejor tiempo solo cuenta desde el tramo 1.</small>');
      $('resultStars').innerHTML = '<span class="on">★</span>'.repeat(e.stars) + '<span>★</span>'.repeat(3 - e.stars);
      $('resultItems').innerHTML = itemsList(s.items);
      $('retry').textContent = 'JUGAR OTRA VEZ';
      $('retry').dataset.mode = 'again';
      show('result');
    }

    function setLoading(text, ready) {
      const b = $('start'); b.textContent = text; b.disabled = !ready;
    }

    /* ---------- Cableado de botones ---------- */
    function bind() {
      $('start').onclick = () => cb.start(selMission, 0);
      $('btnStory').onclick = () => { cb.click(); showCinematic(null); };
      $('btnHowto').onclick = () => { cb.click(); show('guide'); };
      $('guideBack').onclick = () => { cb.click(); cb.menu(); };
      $('guidePlay').onclick = () => { cb.click(); cb.start(selMission, 0); };
      $('cineNext').onclick = () => { cb.click(); cinematicNext(); };
      $('cineSkip').onclick = () => { cb.click(); cinematicFinish(); };
      $('bossCineNext').onclick = () => { cb.click(); bossCinematicNext(); };
      $('bossCineSkip').onclick = () => { cb.click(); bossCinematicFinish(); };
      $('introNext').onclick = () => { cb.click(); introNext(); };
      $('introSkip').onclick = () => { cb.click(); introSkip(); };
      // Tocar la pantalla (fuera de los botones) avanza/salta la cinemática.
      const tapAdvance = (panelId, fn) => {
        const el = $(panelId);
        if (!el) return;
        el.addEventListener('pointerdown', (e) => {
          if (e.target.closest('button')) return; // deja que el botón haga lo suyo
          e.preventDefault(); cb.click(); fn();
        });
      };
      tapAdvance('cinematic', cinematicNext);
      tapAdvance('bossCinematic', bossCinematicNext);
      tapAdvance('intro', introNext);
      $('optDiff').onclick = () => cb.option('difficulty');
      // V50: panel de opciones completo (desde el menú y desde la pausa).
      $('btnOptions').onclick = () => { cb.click(); showOptions('menu'); };
      $('poptMore').onclick = () => { cb.click(); showOptions('pausePanel'); };
      $('optBack').onclick = () => { cb.click(); show(optReturn); };
      for (const b of document.querySelectorAll('#optionsPanel [data-opt]')) b.onclick = () => cb.option(b.dataset.opt);
      $('optReset').onclick = () => {
        const now = Date.now();
        if (now - resetArmed < 4000) { resetArmed = 0; $('optReset').textContent = 'BORRAR PROGRESO'; cb.resetProgress(); return; }
        resetArmed = now; $('optReset').textContent = '¿SEGURO? TOCA OTRA VEZ PARA BORRAR';
      };
      for (const pre of ['', 'p']) {
        if ($(pre + 'optMusic')) $(pre + 'optMusic').onclick = () => cb.option('music');
        if ($(pre + 'optSfx')) $(pre + 'optSfx').onclick = () => cb.option('sfx');
        if ($(pre + 'optVib')) $(pre + 'optVib').onclick = () => cb.option('vib');
      }
      $('pause').onclick = () => cb.togglePause();
      $('resumeBtn').onclick = () => cb.togglePause();
      $('restartBtn').onclick = () => cb.retryFromCheckpoint();
      $('quitBtn').onclick = () => cb.menu();
      $('retry').onclick = () => ($('retry').dataset.mode === 'again' ? cb.start(selMission, 0) : cb.retry());
      $('back').onclick = () => cb.menu();
    }
    bind();

    /* V51 · Respaldo de toques. En Chromium/Android, un toque que llega poco después de un arrastre (soltar el
       joystick y tocar PAUSA, o REINTENTAR justo al morir) puede no generar `click`: el detector de gestos lo usa
       para "frenar" el gesto anterior (medido en QA: se perdía hasta ~400 ms después de un deslizamiento).
       Si un botón de la interfaz recibe un toque limpio (pointerdown + pointerup sin moverse) y el click nativo
       no llega en 90 ms, se dispara aquí; un click nativo tardío se descarta para no activar dos veces.
       No interviene si un panel se estaba desplazando (ese toque sirve para frenar el desplazamiento) ni en los
       controles de juego (data-key), que ya actúan en pointerdown. */
    (function installTapFallback() {
      let down = null, lastScroll = -1e9, guardBtn = null, guardUntil = 0;
      const now = () => performance.now();
      document.addEventListener('scroll', () => { lastScroll = now(); }, true);
      document.addEventListener('click', (e) => {
        if (e.isTrusted && guardBtn && now() < guardUntil && guardBtn.contains(e.target)) { e.stopPropagation(); e.preventDefault(); guardBtn = null; }
      }, true);
      document.addEventListener('pointerdown', (e) => {
        guardBtn = null; // un toque nuevo: cualquier click posterior ya es suyo, no un duplicado del anterior
        const b = e.pointerType === 'touch' && e.target.closest ? e.target.closest('button') : null;
        down = b && !b.dataset.key ? { b, id: e.pointerId, x: e.clientX, y: e.clientY, scrolling: now() - lastScroll < 150 } : null;
      }, true);
      document.addEventListener('pointercancel', () => { down = null; }, true);
      document.addEventListener('pointerup', (e) => {
        const d = down; down = null;
        if (!d || e.pointerId !== d.id || d.scrolling || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return;
        let clicked = false;
        const mark = (ev) => { if (d.b.contains(ev.target)) clicked = true; };
        document.addEventListener('click', mark, true);
        setTimeout(() => {
          document.removeEventListener('click', mark, true);
          if (clicked || d.b.disabled || !d.b.isConnected || d.b.offsetParent === null || now() - lastScroll < 150) return;
          guardBtn = d.b; guardUntil = now() + 700;
          d.b.click();
        }, 90);
      }, true);
    })();

    return { show, toast, chapter, sign, itemCard, hurtFlash, tick, clearOverlays, hud, paintMenu, paintOpts, showIntro, showCinematic, showBossCinematic, showOptions, bossCinematicActive: () => activePanel === 'bossCinematic', showGuide: () => show('guide'), showGameOver, showVictory, setLoading, setPlaying, fmtTime };
  }

  NS.UI = { createUI };
})(typeof globalThis !== 'undefined' ? globalThis : window);
