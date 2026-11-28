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
    const panels = ['menu', 'intro', 'cinematic', 'bossCinematic', 'guide', 'pausePanel', 'result', 'optionsPanel', 'shopPanel'];
    const LV = NS.LEVELS.LEVEL_SEQUENCE;
    const MISSIONS = NS.LEVELS.MISSIONS || [{ id: 'escuela', label: 'MISIÓN 1', levels: LV }];
    const TOTAL_LEVELS = MISSIONS.reduce((n, M) => n + M.levels.length, 0);
    let selMission = 0;
    const missionUnlocked = (save, id) => (save.missions && save.missions[id]) || 0;
    /* V58.8.24 · Misión especial LA CALZADA (persecución en la moto de Doña Tóxica) entre Guadalajara y el submarino.
       En el menú es una tarjeta más; `start` es lo que recibe cb.start (índice de misión o 'calzada'). */
    const CHASE = NS.Chase ? { id: 'calzada', label: 'MISIÓN ESPECIAL · LA CALZADA', special: true,
      levels: NS.Chase.SECTIONS.map((q) => ({ label: q.title, isNew: true, storyIndex: -1 })) } : null;
    const MENU = MISSIONS.map((M, i) => ({ M, start: i, num: 'M' + (i + 1) }));
    if (CHASE) MENU.splice(2, 0, { M: CHASE, start: 'calzada', num: '★' });
    const missionArg = (v) => (v === 'calzada' ? 'calzada' : Number(v));
    const CINEMATIC = [
      { tag: 'CAPÍTULO 01 · DESPUÉS DE LA POSADA', title: 'EL ÚLTIMO CAMIÓN SE FUE', text: 'Terminó tarde la posada de la escuela. Sofía llegó a la azotea justo para ver cómo la ruta 6 partía sin ella.', bg: 'assets/scenes/school_miguel_hidalgo/01_aulas_superiores.webp' },
      { tag: 'CAPÍTULO 02 · LUNA Y MORITA', title: 'HAY QUE BAJAR', text: 'Sus gatitas la acompañan por techos, patios y túneles. En el camino, seis cosas de su mochila quedaron atrás.', bg: 'assets/scenes/guadalajara_pro_v2/bg_centro_historico_pro_v2.webp' },
      { tag: 'CAPÍTULO 03 · TU MISIÓN', title: 'ALCANZA LA TERMINAL', text: 'La historia principal recorre la escuela, Guadalajara, la persecución por la Calzada, el fondo del mar y el espacio. Cada tramo es una misión con su propio objetivo: cúmplela para seguir bajando. Los seis objetos son opcionales y mejoran el final. Parafalls, una misión adicional, y todos los demás tramos están disponibles desde el menú. ¡Empieza a bajar!', bg: 'assets/scenes/generated/terminal_guadalajara_amanecer.png' }
    ];
    const CINEMATIC_SECONDS = 6;
    const BOSS_CINEMATIC_SECONDS = 3.6;
    const BOSS_CINEMATICS = {
      dog: {
        kind: 'dog', saveIndex: 0, stage: 'TRAMO 1 · LA ESCUELA', boss: 'JEFE FINAL · PERRO FURIOSO',
        scenes: [
          { tag: 'UN RUIDO EN LA AZOTEA', word: '¡GUAU!', title: 'EL LADRIDO DETIENE A SOFÍA', text: 'La ruta 6 acaba de irse. Un ladrido retumba sobre la azotea y alguien bloquea la escalera hacia abajo.', cue: 'LUNA Y MORITA SE PONEN EN GUARDIA.' },
          { tag: 'EL GUARDIÁN DEL TECHO', word: 'GRR…', title: 'EL PERRO FURIOSO', text: 'El estruendo de la posada lo alteró: no es malvado, solo está asustado y protege la salida. No corras directo hacia él.', cue: 'CABEZA ABAJO = SEÑAL DE CARGA.' },
          { tag: 'PLAN DE BATALLA', word: '¡SALTA!', title: 'ESQUIVA Y ESPERA SU MAREO', text: 'Cuando se prepare, salta por encima de la embestida. Al quedar mareado, usa PATADA o cae encima. Luego sigue bajando.', cue: 'AVISO → SALTO → CONTRAATAQUE' }
        ]
      },
      kid: {
        kind: 'kid', saveIndex: 1, stage: 'TRAMO 2 · CENTRO DE GUADALAJARA', boss: 'JEFE FINAL · DUEÑO DEL PERRO · 12 AÑOS',
        scenes: [
          { tag: 'HUELLAS ENTRE LAS CALLES', word: '¿EH?', title: 'EL PERRO SE ESCAPÓ', text: 'Al salir de la escuela, Sofía ve al perro cruzar la plaza. Su dueño viene corriendo detrás y cree que ella lo asustó.', cue: 'PASOS APRESURADOS · UN GRITO SE ACERCA.' },
          { tag: 'UN RIVAL MUY MOLESTO', word: '¡EH!', title: 'EL DUEÑO DEL PERRO', text: 'El niño, de 12 años, está preocupado y furioso. Se planta frente a Sofía: «¡No te metas! ¡Yo lo voy a encontrar!»', cue: 'SU POSTURA ANUNCIA UNA CARGA.' },
          { tag: 'PLAN DE BATALLA', word: '¡ESQUIVA!', title: 'DEJA QUE SE AGOTE', text: 'Espera la señal, salta para esquivarlo y contraataca cuando se maree con PATADA o un pisotón. Después, sigue buscando al perro.', cue: 'AVISO → ESQUIVA → CONTRAATAQUE' }
        ]
      },
      poseidon: {
        kind: 'poseidon', saveIndex: 2, stage: 'TRAMO 3 · LA FOSA AZUL', boss: 'JEFE FINAL · POSEIDÓN, REY DEL MAR',
        scenes: [
          { tag: 'UN RESPLANDOR EN LA FOSA', word: '…', title: 'EL MAR SE QUEDA EN SILENCIO', text: 'Tras bajar desde la isla y cruzar el bosque de algas, Sofía llega a la parte más oscura del abismo. El agua empieza a vibrar frente a la escotilla.', cue: 'LAS BURBUJAS GIRAN HACIA EL FONDO.' },
          { tag: 'EL GUARDIÁN DEL ABISMO', word: '¡GLUUM!', title: 'POSEIDÓN APARECE', text: 'Una figura enorme emerge con su tridente y cierra el paso. Poseidón custodia la salida del fondo marino y no piensa dejarla pasar sin luchar.', cue: 'TRIDENTE EN ALTO = ATAQUE IMPULSIVO.' },
          { tag: 'PLAN DE BATALLA', word: '¡ESQUIVA!', title: 'GOLPEA TRAS SU CARGA', text: 'Espera su avance, aléjate del tridente y contraataca cuando termine su embestida. Si lo mareas, aprovecha para seguir golpeando antes de buscar la escotilla.', cue: 'AVISO → ESQUIVA → CONTRAATAQUE' }
        ]
      }
    };
    let toastT = 0, toastPri = -1, bannerT = 0, bubbleT = 0, cardT = 0, introIndex = 0, introThen = null;
    let cinematicIndex = 0, cinematicThen = null, cinematicT = 0, bossCineData = null, bossCineThen = null, bossCineIndex = 0, bossCineT = 0, activePanel = null;
    const hudCache = {};
    const worldNames = {escuela:'LA ESCUELA',guadalajara:'GUADALAJARA',calzada:'LA CALZADA',submarino:'EL SUBMARINO',espacial:'EL ESPACIO',parafalls:'PARAFALLS'};
    const worldDescriptions = {escuela:'La campana sonó. Alcanza la ruta 6.',guadalajara:'Azoteas, barrios y el corazón de la ciudad.',calzada:'Misión especial: Sofía arranca la moto de su mamá en el Parque Agua Azul, esquiva patrullas, vuela en las rampas y derriba el tráiler blindado.',submarino:'Regresa a la isla, cruza el bosque de algas y desciende a la fosa de Poseidón.',espacial:'Salta entre cráteres y pasarelas lunares.',parafalls:'Desciende por las cascadas del cielo.'};

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
      set('hudTramo', G.room ? (G.room.secret ? 'ZONA SECRETA' : G.room.theme === 'alcantarilla' ? 'ALCANTARILLA' : 'SÓTANO') : 'TRAMO ' + (G.tramo + 1) + '/' + total);
      const boss = G.world.foes.find((f) => f.isBoss && !f.dead && f.scene === G.tramo && f.region === 'main');
      // V58.7: en una zona secreta el objetivo es su jefe; ya vencido, la salida (al otro extremo).
      const secretBoss = G.room && G.room.secret ? G.world.foes.find((f) => f.isBoss && !f.dead && f.region === G.room.id) : null;
      const worldTheme = G.world.scenes[G.tramo] && G.world.scenes[G.tramo].theme;
      const theme = worldTheme || 'escuela';
      if (document.body.dataset.world !== theme) document.body.dataset.world = theme;
      set('hudWorld', worldNames[G.missionId] || worldNames.escuela);
      const fill = $('routeFill');
      const sc = G.world.scenes[G.tramo];
      const part = sc && sc.endY > sc.startY ? Math.max(0, Math.min(1, (P.y-sc.startY)/(sc.endY-sc.startY))) : 0;
      const progress = Math.round(100 * (G.tramo + part) / Math.max(1,total));
      if (fill && !G.room && hudCache.routeProgress !== progress) { hudCache.routeProgress=progress; fill.style.width=progress+'%'; }
      const diving = theme === 'submarino' && !!P.water;
      if (document.body.dataset.diving !== String(diving)) {
        document.body.dataset.diving = String(diving);
        const jump = document.querySelector('.ctl.jump small'), down = document.querySelector('.ctl.down small');
        if(jump) jump.textContent = diving ? 'SUBIR' : 'SALTAR';
        if(down) down.textContent = diving ? 'BUCEAR' : 'BAJAR';
      }
      const arena=G.world.poseidonArena, showBoss=arena&&!G.room&&P.y>=arena.entryY-90&&boss?.kind==='poseidon';
      const meter=$('poseidonMeter');document.body.classList.toggle('poseidonFight',!!showBoss);if(meter){meter.hidden=!showBoss;if(showBoss){set('poseidonStatus',boss.state==='dizzy'?'¡CONTRAATACA!':boss.state==='windup'?'¡ESQUIVA EL TRIDENTE!':boss.state==='aim'?'¡ESQUIVA LA OLA!':boss.enraged?'FASE II · FURIA DEL MAR':'POSEIDÓN · REY DEL MAR');set('poseidonHp',boss.hp+' / '+boss.maxHp);$('poseidonFill').style.width=(100*boss.hp/boss.maxHp)+'%';}}
      const itemRow = $('items').closest('.hudItems'); if(itemRow) itemRow.hidden = G.world.totalItems === 0 && !r.keys.size;
      const goalLabel = G.world.portal ? 'META: CRUZA EL PORTAL' : worldTheme === 'submarino' ? 'META: LLEGA A LA ESCOTILLA' : worldTheme === 'espacial' ? 'META: LLEGA AL MÓDULO' : 'META: LLEGA AL CAMIÓN';
      if (G.room && G.room.secret) set('objective', secretBoss ? 'JEFE SECRETO: ' + secretBoss.bossName : 'SALIDA: AL OTRO EXTREMO DE LA ZONA');
      else if(G.room&&G.room.schoolName){set('hudTramo',G.room.schoolName);const idx=G.room.schoolObjective;set('objective',idx===null||G.run.items.includes(idx)?'OBJETIVO RECUPERADO · BUSCA LA SALIDA':'RECUPERA '+(NS.STORY.ITEMS[idx]?.name||'EL OBJETO'));}
      else if(G.room && G.room.theme === 'gruta') { set('hudTramo','GRUTA DE LAS CASCADAS'); set('objective','BUSCA LA SALIDA ENTRE LAS REPISAS'); }
      else if(theme==='submarino'){
        const marineStages = ['ISLA DEL CANAL', 'BOSQUE DE ALGAS', 'FOSA AZUL'];
        const stage = marineStages[Math.max(0, Math.min(marineStages.length - 1, G.tramo))];
        const close=boss&&Math.abs(P.y-boss.y)<G.view.h*.72;
        const onIsland = G.tramo === 0 && !P.water;
        set('hudTramo',(onIsland?'ISLA · ':'MAR · ')+stage);
        if (G.tramo === 0) set('objective', onIsland ? 'BAJA DESDE LA ISLA HACIA EL CANAL' : 'DESCIENDE HASTA EL BOSQUE DE ALGAS');
        else if (G.tramo === 1) set('objective', close ? 'JEFE: '+boss.bossName : 'ATRAVIESA EL BOSQUE DE ALGAS');
        else set('objective', showBoss ? 'VENCE A POSEIDÓN · ESCOTILLA SELLADA' : close ? 'JEFE: '+boss.bossName : boss ? 'ENCUENTRA A POSEIDÓN EN LA FOSA' : 'LOCALIZA LA ESCOTILLA ABIERTA');
      } else if(G.world.schoolMission&&!G.room){
        const sc=G.world.scenes[G.tramo],names=['AZOTEAS Y AULAS','PATIO ESCOLAR','CONSERJERÍA'],atExit=P.y>G.world.bounds.streetY-210;
        set('hudTramo','0'+(G.tramo+1)+' · '+names[G.tramo]);
        const wall=G.world.solids.find(s=>s.kind==='barda'&&s.scene===G.tramo);
        const nearBoss=boss&&Math.abs(P.y-boss.y)<G.view.h*.43;
        const masterHint=boss?.kind==='maestro'?({windup:'¡SALTA! · EMBESTIDA',charge:'ESQUIVA LA REGLA',dizzy:'¡AHORA! · USA DASH',aim:boss.throwKind==='libro'?'ESQUIVA EL LIBRO':'ESQUIVA EL BORRADOR',shout:'¡SALTA! · ONDA EN EL SUELO'}[boss.state]||'VENCE AL MAESTRO · RUTA 6'): 'VENCE AL MAESTRO · RUTA 6';
        set('objective',atExit?(boss?masterHint:'SUBE AL CAMIÓN'):G.tramo===0&&wall&&P.x<wall.x2&&P.y<wall.y2+40?'CRUZA CON EL COLUMPIO':nearBoss?'DESAFÍO: '+boss.bossName:['BAJA POR LOS BALCONES','CRUZA EL PATIO Y LAS CANCHAS','ENCUENTRA EL PORTÓN'][G.tramo]);
      } else set('objective', boss ? 'JEFE: ' + boss.bossName : G.tramo === total - 1 ? goalLabel : 'META: SIGUE BAJANDO');
      // V58.8.24 · Contrato del tramo: mientras no se cumple, su objetivo manda en el HUD (con contador o reloj).
      const cc = r.contract, CTS = NS.Contracts;
      if (cc && CTS && !G.room && !cc.mainDone) set('objective', CTS.goalText(cc));
      else if (cc && CTS && !G.room && cc.bonus && !cc.bonusDone && !(G.world.schoolMission && P.y > G.world.bounds.streetY - 210)) set('objective', CTS.bonusText(cc));
      const urgent = !!(cc && !cc.mainDone && cc.main.type === 'contrarreloj' && cc.main.t - cc.t < 10);
      if ($('objective').classList) $('objective').classList.toggle('urgent', urgent);
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
      // V58 · Recarga de la orden a las gatitas (texto en el HUD y anillo en el botón).
      const cmd = G.companions ? G.companions.cmdCD || 0 : 0, max = (G.companions && G.companions.cmdMax) || 1;
      set('catsHud', cmd > 0 ? 'GATAS EN ' + Math.ceil(cmd) + ' s' : 'GATAS LISTAS');
      const btn = document.querySelector('.ctl.cats');
      if (btn) { const k = (Math.round((cmd / max) * 20) / 20).toFixed(2); if (btn.dataset.cd !== k) { btn.dataset.cd = k; btn.style.setProperty('--cd', k); btn.classList.toggle('ready', cmd <= 0); } }
    }

    /* ---------- Menú principal ---------- */
    function paintMenu(G, opt) {
      const save = G.save, free = true; // V58.8.20: acceso completo; progreso real independiente.
      // Si la misión elegida quedó bloqueada, salta a la primera abierta.
      if (!(free || missionUnlocked(save, MENU[selMission].M.id) >= 1)) {
        const alt = MENU.findIndex((E) => free || missionUnlocked(save, E.M.id) >= 1);
        selMission = alt < 0 ? 0 : alt;
      }
      // Barra de misiones.
      const mbox = $('missions');
      if (mbox) {
        mbox.innerHTML = '';
        MENU.forEach((E, mi) => {
          const M = E.M;
          const open = free || missionUnlocked(save, M.id) >= 1;
          const isNewM = M.levels.some((d) => d.isNew);
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'mission' + (mi === selMission ? ' sel' : '') + (open ? '' : ' locked') + (isNewM ? ' new' : '') + (M.special ? ' special' : '');
          b.dataset.m = M.id;
          const short = missionName(M);
          // V58.6: tarjeta con el arte de su mundo, número, nombre y avance (paradas abiertas / total).
          const meta = open ? (M.special ? 'PERSECUCIÓN · ' + M.levels.length + ' TRAMOS' : M.levels.length + (M.levels.length === 1 ? ' PARADA' : ' PARADAS')) : 'BLOQUEADA';
          const best = save.ranks && save.ranks[M.id];
          b.innerHTML = '<span class="mNum">' + (open ? E.num : '🔒') + '</span><span class="mName">' + esc(short) + '</span><span class="mMeta">' + meta + '</span>' + (best ? '<span class="mRank r' + best + '" title="Mejor calificación">' + best + '</span>' : '');
          b.disabled = !open;
          b.setAttribute('aria-pressed', String(mi === selMission));
          b.setAttribute('aria-label', open ? (M.special ? 'Misión especial' : 'Misión ' + E.num.slice(1)) + ': ' + short + ', ' + meta.toLowerCase() : 'Misión bloqueada');
          b.onclick = () => { selMission = mi; cb.click(); paintMenu(G, opt); };
          mbox.appendChild(b);
        });
      }
      const E = MENU[selMission], M = E.M;
      $('menu').dataset.selection = M.id;
      $('worldKicker').textContent = M.special ? 'MISIÓN ESPECIAL' : 'MUNDO ' + String(E.start + 1).padStart(2, '0') + ' / 05';
      $('worldTitle').textContent = worldNames[M.id] || missionName(M);
      $('worldDesc').textContent = worldDescriptions[M.id] || '';
      const unlocked = free ? M.levels.length : missionUnlocked(save, M.id);
      const box = $('tramos');
      box.innerHTML = '';
      M.levels.forEach((def, i) => {
        const ok = i < unlocked || free;
        const ch = def.storyIndex >= 0 ? ST.CHAPTERS[def.storyIndex] : null, title = (ch && ch.title) || def.label;
        const b = document.createElement('button');
        const medal = (save.contracts && save.contracts[def.id]) || {};
        b.className = 'tramo' + (ok ? '' : ' locked') + (def.isNew ? ' new' : '') + (medal.main ? ' medal' : '') + (medal.bonus ? ' medal2' : '');
        b.textContent = ok ? String(i + 1) : '·';
        b.title = ok ? title + (def.isNew ? ' (NUEVO)' : '') + (medal.main ? ' · misión cumplida' : '') + (medal.bonus ? ' · opcional cumplido' : '') : 'Bloqueado: llega a la parada de este tramo';
        b.setAttribute('aria-label', ok ? 'Empezar en la parada ' + (i + 1) + ': ' + title : 'Parada ' + (i + 1) + ' bloqueada');
        b.disabled = !ok;
        b.onclick = () => cb.start(E.start, i);
        box.appendChild(b);
      });
      const tl = $('tramosLabel');
      if (tl) tl.textContent = 'ELIGE UNA PARADA · ' + M.levels.length + (M.levels.length === 1 ? ' DISPONIBLE' : ' DISPONIBLES');
      // V58.6: los seis objetos como puntos (el nombre aparece al pasar el dedo o el ratón).
      const col = $('collection');
      if (col) col.innerHTML = ST.ITEMS.map((it) => '<i class="pip' + (save.items[it.id] ? ' got' : '') + '" title="' + (save.items[it.id] ? esc(it.name) : 'Objeto sin encontrar') + '"></i>').join('');
      const found = ST.ITEMS.filter((it) => save.items[it.id]).length;
      if ($('collectionCount')) $('collectionCount').textContent = found + ' / ' + ST.ITEMS.length;
      const rec = [];
      if (save.bestTime) rec.push('Mejor tiempo ' + fmtTime(save.bestTime));
      if (save.bestScore) rec.push('Récord ' + save.bestScore + ' pts');
      if (save.wins) rec.push(save.wins + (save.wins === 1 ? ' llegada' : ' llegadas'));
      rec.push('Banco ' + ((save.bank | 0)) + ' ◆');
      if ($('records')) $('records').textContent = rec.join(' · ') || 'Sin récords todavía.';
      paintStart();
      const nNew = MENU.reduce((n, E) => n + E.M.levels.filter((d) => d.isNew).length, 0);
      if ($('levelsCount')) $('levelsCount').textContent = String(TOTAL_LEVELS);
      const mLabel = $('missionsLabel'), avail = mLabel && mLabel.querySelector ? mLabel.querySelector('.worldAvailability') : null;
      if (avail) avail.textContent = TOTAL_LEVELS + ' PARADAS' + (CHASE ? ' + LA CALZADA' : '');
      if ($('newLevels')) $('newLevels').textContent = nNew ? nNew + ' niveles nuevos marcados con ★' : '';
      paintOpts(opt);
    }
    /** Nombre corto de la misión («LA ESCUELA», «EL SUBMARINO»…). */
    function missionName(M) { return M.label.replace(/^MISIÓN (\d+|ESPECIAL) · /, ''); }
    let playable = false;
    /** V58.6: el botón principal dice qué misión empieza (solo cuando el juego ya cargó). */
    function paintStart() {
      const b = $('start');
      if (b && playable) b.textContent = '▶  JUGAR DESDE EL INICIO';
    }
    const OPT_LABEL = {
      musicVol: (v) => (v ? v + '%' : 'NO'), sfxVol: (v) => (v ? v + '%' : 'NO'),
      vib: (v) => (v ? 'SÍ' : 'NO'), shake: (v) => ({ normal: 'NORMAL', suave: 'SUAVE', no: 'NO' }[v]),
      zoom: (v) => ({ cerca: 'CERCA', normal: 'NORMAL', lejos: 'LEJOS' }[v]), ctlSize: (v) => ({ chico: 'CHICOS', normal: 'NORMALES', grande: 'GRANDES' }[v]),
      lefty: (v) => (v ? 'SÍ' : 'NO'), landingRing: (v) => (v ? 'SÍ' : 'NO'), catsHelp: (v) => (v ? 'SÍ' : 'NO'),
      relaxed: (v) => (v ? 'SÍ' : 'NO'), freeSelect: (v) => (v ? 'SÍ' : 'NO'), cinematics: (v) => (v ? 'VER' : 'SALTAR'), fps: (v) => (v ? 'SÍ' : 'NO'),
      difficulty: (v) => (C.difficulty[v] || C.difficulty.normal).label,
      ninaLook: (v) => ({ original: 'ORIGINAL', rosa: 'ROSA' }[v] || 'ORIGINAL'),
      misiones: (v) => (v === 'opcionales' ? 'OPCIONALES' : 'OBLIGATORIAS')
    };
    function paintOpts(opt) {
      for (const pre of ['', 'p']) {
        const m = $(pre + 'optMusic'), s = $(pre + 'optSfx'), v = $(pre + 'optVib');
        if (m) m.textContent = 'MÚSICA: ' + OPT_LABEL.musicVol(opt.musicVol);
        if (s) s.textContent = 'EFECTOS: ' + OPT_LABEL.sfxVol(opt.sfxVol);
        if (v) v.textContent = 'VIBRACIÓN: ' + OPT_LABEL.vib(opt.vib);
      }
      const d = C.difficulty[opt.difficulty] || C.difficulty.normal;
      if ($('optDiff')) { $('optDiff').textContent = 'DIFICULTAD: ' + d.label; $('optDiff').setAttribute('aria-label', 'Dificultad: ' + d.label + '. Toca para cambiarla.'); }
      if ($('diffHelp')) $('diffHelp').textContent = d.lives + ' vidas · enemigos ' + (d.foeDensity < 1 ? 'escasos y lentos' : d.foeDensity > 1 ? 'numerosos y rápidos' : 'normales') + (opt.relaxed ? ' · modo relajado' : '');
      for (const b of document.querySelectorAll('#optionsPanel [data-opt]')) {
        const k = b.dataset.opt, f = OPT_LABEL[k];
        if (f) b.textContent = f(opt[k]);
        b.setAttribute('aria-label', (b.closest('.optRow')?.querySelector('span')?.textContent || k) + ': ' + b.textContent);
      }
    }
    /* ---------- V58.8.27 · Tienda de mejoras ---------- */
    function showShop(msg) {
      const UPG = NS.Upgrades, save = cb.getSave && cb.getSave();   // siempre el guardado vigente
      if (!UPG || !save) return;
      UPG.ensure(save);
      $('shopBank').textContent = String(save.bank | 0);
      const list = $('shopList'); list.innerHTML = '';
      for (const u of UPG.CATALOG) {
        const lvl = UPG.level(save, u.id), cost = UPG.nextCost(save, u.id), max = u.cost.length;
        const row = document.createElement('div'); row.className = 'shopRow' + (cost == null ? ' maxed' : '');
        row.innerHTML = '<span class="shopIcon">' + u.icon + '</span><span class="shopInfo"><b>' + esc(u.name) + '</b><small>' + esc(u.text) + '</small><i>NIVEL ' + lvl + ' / ' + max + '</i></span>';
        const b = document.createElement('button'); b.type = 'button'; b.className = 'opt shopBuy';
        b.textContent = cost == null ? 'MÁXIMO' : cost + ' ◆';
        b.disabled = cost == null || (save.bank | 0) < cost;
        b.setAttribute('aria-label', cost == null ? u.name + ': nivel máximo' : 'Comprar ' + u.name + ' por ' + cost + ' cristales');
        b.onclick = () => { const r = cb.buy && cb.buy(u.id); showShop(r && r.ok ? '¡' + u.name + ' NIVEL ' + r.level + '!' : r && r.reason === 'faltan' ? 'FALTAN ' + r.need + ' CRISTALES' : ''); };
        row.appendChild(b); list.appendChild(row);
      }
      $('shopMsg').textContent = msg || '';
      show('shopPanel');
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
      const bg = bossCineData.kind === 'dog'
        ? 'assets/scenes/school_miguel_hidalgo/02_patio_escolar.webp'
        : bossCineData.kind === 'kid'
          ? 'assets/scenes/guadalajara_pro_v2/bg_centro_historico_pro_v2.webp'
          : 'assets/cinematica/marino/fondo_santuario.webp';
      const stage = $('bossCineScene');
      stage.style.backgroundImage = 'linear-gradient(180deg,rgba(4,14,26,.48),rgba(4,12,24,.9)),url("' + bg + '")';
      stage.style.backgroundSize = 'cover'; stage.style.backgroundPosition = 'center';
      const backdrop=$('poseidonCineBackdrop');if(backdrop){backdrop.hidden=bossCineData.kind!=='poseidon';if(!backdrop.hidden)backdrop.src='assets/backgrounds/secretos/marino_oculto.webp';}
      const portrait=$('poseidonCinePortrait');if(portrait){portrait.hidden=bossCineData.kind!=='poseidon';if(!portrait.hidden)portrait.src='assets/cinematica/marino/poseidon_tridente_0'+[0,2,4][bossCineIndex]+'.webp';}
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
      $('nextSchoolMission').hidden=true;
      if (e.contract) {
        // V58.8.24: misión del tramo sin cumplir. No cuesta vidas: se reintenta desde la última parada.
        $('resultTag').textContent = 'TRAMO ' + (s.tramo + 1) + ' · MISIÓN DEL TRAMO';
        $('resultTitle').innerHTML = 'MISIÓN<br><span>FALLIDA</span>';
        $('resultText').innerHTML = esc(e.contract.reason) + '<br><br><b>' + esc(e.contract.goal) + '</b><br><small>' + esc(e.contract.why) + '</small><br><br>Reintentas desde la última parada sin perder vidas.' +
          (s.practice ? '<br><small>Práctica · el progreso y los récords de campaña se conservan.</small>' : '');
        $('resultStars').innerHTML = ''; $('resultItems').innerHTML = '';
        $('retry').textContent = 'REINTENTAR LA MISIÓN'; $('retry').dataset.mode = 'retry';
        if ($('postCredits')) $('postCredits').hidden = true;
        show('result');
        return;
      }
      $('resultTag').textContent = 'TE QUEDASTE EN EL TRAMO ' + (s.tramo + 1);
      $('resultTitle').innerHTML = 'SE FUE<br><span>OTRA VEZ…</span>';
      $('resultText').innerHTML = 'Tiempo ' + fmtTime(s.time) + ' · ' + s.score + ' pts' + (e.newScore ? ' (¡récord!)' : '') + ' · ' + plural(s.gems, 'cristal', 'cristales') + ' · ' + s.depth + ' m<br>' + (G.checkpoint?.abyss ? 'Reaparecerás en la baliza de rescate ' + (G.checkpoint.index + 1) + '.' : 'La ruta sigue abierta. Reaparecerás en la parada del tramo ' + tr + '.');
      if (s.practice) $('resultText').innerHTML += '<br><small>Práctica · el progreso y los récords de campaña se conservan.</small>';
      $('resultStars').innerHTML = '';
      $('resultItems').innerHTML = s.totalItems > 0 ? itemsList(s.items) : '';
      $('retry').textContent = G.checkpoint?.schoolFinal ? 'REINTENTAR DESDE CONSERJERÍA' : G.checkpoint?.abyss ? 'REINTENTAR DESDE LA BALIZA ' + (G.checkpoint.index + 1) : 'REINTENTAR DESDE LA PARADA ' + tr;
      if ($('postCredits')) $('postCredits').hidden = true;
      $('retry').dataset.mode = 'retry';
      show('result');
    }
    function showVictory(e) {
      const s = e.summary;
      const nextButton = $('nextSchoolMission');
      const next = e.nextMission === 'calzada' ? CHASE : MISSIONS[e.nextMission];
      nextButton.hidden = !next;
      if (next) {
        nextButton.dataset.mission = String(e.nextMission);
        nextButton.textContent = 'CONTINUAR · ' + missionName(next);
      }
      $('retry').dataset.mission=String(e.mission ?? MENU[selMission].start);
      $('resultTag').textContent = e.mission === 0 ? 'ESCUELA BENITO JUÁREZ · RUTA 6' : (MISSIONS[e.mission]?.label || 'TERMINAL ARCADAS · RUTA 6');
      $('resultTitle').innerHTML = e.mission===0?'¡ESCUELA<br><span>SUPERADA!</span>':e.ending.title;
      $('resultText').innerHTML = esc(e.mission===0?'Sofía, Luna y Morita cruzaron el portón y alcanzaron la Ruta 6. El viaje continúa por Guadalajara.':e.ending.text) + '<br><br>Tiempo ' + fmtTime(s.time) + (e.newTime ? ' (¡mejor tiempo!)' : '') + ' · ' + s.score + ' pts' + (e.newScore ? ' (¡récord!)' : '') + ' · ' + plural(s.gems, 'cristal', 'cristales') + ' · ' + plural(s.kills, 'enemigo', 'enemigos') + (s.totalBosses > 0 ? ' · jefes ' + s.bosses + '/' + s.totalBosses : '') + (s.totalSecrets ? ' · zona secreta ' + (s.secrets ? 'encontrada' : 'sin encontrar') : '') + (s.practice ? '<br><small>Práctica · el progreso y los récords de campaña se conservan.</small>' : s.relaxed ? '<br><small>Modo relajado activo: los récords cuentan igual, pero sin perder vidas.</small>' : '') + (e.fullRun ? '' : '<br><small>Empezaste en un tramo intermedio: el mejor tiempo solo cuenta desde el tramo 1.</small>');
      $('resultStars').innerHTML = '<span class="on">★</span>'.repeat(e.stars) + '<span>★</span>'.repeat(3 - e.stars);
      // V58 · Llaves USB (los seis objetos) y escena post-créditos.
      const keysLine = '<br><b>LLAVES USB RECUPERADAS: ' + (e.keys || 0) + ' / ' + (e.totalKeys || 6) + '</b>' +
        (e.postCredits ? ' · ¡ESCENA POST-CRÉDITOS DESBLOQUEADA!' : e.lastMission ? ' · Reúne las seis para ver la escena final.' : '');
      const cs = s.contracts, contractLine = cs && cs.total ? '<br><b>MISIONES CUMPLIDAS: ' + cs.main + ' / ' + cs.total + ' · OPCIONALES: ' + cs.bonus + ' / ' + cs.total + '</b>' : '';
      const rankLine = e.rank ? '<br><span class="rankBadge r' + e.rank + '">' + e.rank + '</span> <b>CALIFICACIÓN ' + e.rank + '</b>' + (e.rankNew ? ' · ¡NUEVO RÉCORD!' : e.fullRun ? '' : ' <small>(solo cuenta desde la parada 1)</small>') : '';
      const bankLine = e.bank != null ? '<br><small>+' + (e.banked | 0) + ' cristales al banco · total ' + e.bank + ' ◆ (gástalos en 🛒 MEJORAS)</small>' : '';
      $('resultText').innerHTML += (e.mission===0?'<br><b>INTERIORES EXPLORADOS: '+s.schoolRooms+'/'+s.schoolTotalRooms+' · OBJETOS: '+s.items.length+'/'+s.totalItems+'</b>':'')+keysLine+contractLine+rankLine+bankLine;
      $('resultItems').innerHTML = s.totalItems > 0 ? itemsList(s.items) : '';
      $('retry').textContent = 'JUGAR OTRA VEZ';
      $('retry').dataset.mode = 'again';
      let pc = $('postCredits');
      if (!pc) { pc = document.createElement('button'); pc.id = 'postCredits'; pc.className = 'primary'; pc.textContent = '▶ ESCENA POST-CRÉDITOS'; $('retry').before(pc); pc.onclick = () => { cb.click(); cb.epilogue && cb.epilogue(); }; }
      pc.hidden = !e.postCredits;
      show('result');
    }

    /** V58.9 · Resultado de LA CALZADA (perder: reintentar desde el tramo; ganar: continuar al submarino). */
    function showChaseResult(e) {
      const s = e.stats || {}, SEC = NS.Chase.SECTIONS;
      const nextButton = $('nextSchoolMission');
      const line = 'Tiempo ' + fmtTime(s.t || 0) + ' · ' + (s.score || 0) + ' pts · ' + plural(s.takedowns || 0, 'derribo', 'derribos') + ' · ' + plural(s.jumps || 0, 'salto', 'saltos') + ' · ' + plural(s.gems || 0, 'cristal', 'cristales');
      if (e.won) {
        nextButton.hidden = false; nextButton.dataset.mission = '2'; nextButton.textContent = 'CONTINUAR · EL SUBMARINO';
        $('resultTag').textContent = 'MISIÓN ESPECIAL · LA CALZADA';
        $('resultTitle').innerHTML = '¡CALZADA<br><span>SUPERADA!</span>';
        $('resultText').innerHTML = esc('El tráiler de Los Zopilotes quedó atrás y la moto de mamá voló sobre la barranca. La corriente de la presa llevó a Sofía, Luna y Morita hasta el mar.') + '<br><br>' + line +
          (e.best && e.best.bestTime ? '<br><small>Mejor tiempo completo ' + fmtTime(e.best.bestTime) + ' · récord ' + (e.best.bestScore || 0) + ' pts</small>' : '') +
          (s.practice ? '<br><small>Práctica · el progreso y los récords de campaña se conservan.</small>' : '');
        $('resultStars').innerHTML = '<span class="on">★</span>'.repeat(e.stars || 1) + '<span>★</span>'.repeat(3 - (e.stars || 1));
        $('retry').textContent = 'JUGAR OTRA VEZ'; $('retry').dataset.mode = 'again'; $('retry').dataset.mission = 'calzada';
        if (e.best && e.best.lastRank) $('resultText').innerHTML += '<br><span class="rankBadge r' + e.best.lastRank + '">' + e.best.lastRank + '</span> <b>CALIFICACIÓN ' + e.best.lastRank + '</b>';
      } else {
        nextButton.hidden = true;
        const why = { traffic: 'Chocaste con el tráfico', barrier: 'Te estrellaste contra una valla', ram: 'Una patrulla te embistió', crash: 'Te cerraron el paso', gap: 'Caíste a la zanja', crate: 'Una caja del tráiler te detuvo', barrel: 'Un barril de Los Zopilotes te detuvo', spikes: 'Las tachuelas te poncharon la llanta', truck: 'Chocaste con el tráiler blindado' }[e.reason] || 'La moto ya no aguanta';
        $('resultTag').textContent = 'LA CALZADA · TRAMO ' + ((s.section | 0) + 1) + ' · ' + (SEC[s.section | 0] ? SEC[s.section | 0].title : '');
        $('resultTitle').innerHTML = '¡TE<br><span>DETUVIERON!</span>';
        $('resultText').innerHTML = esc(why + '.') + '<br><br>' + line + '<br>Reaparecerás al inicio del tramo ' + ((e.section | 0) + 1) + ' con la moto reparada.';
        $('resultStars').innerHTML = '';
        $('retry').textContent = 'REINTENTAR DESDE EL TRAMO ' + ((e.section | 0) + 1); $('retry').dataset.mode = 'retry';
      }
      $('resultItems').innerHTML = '';
      if ($('postCredits')) $('postCredits').hidden = true;
      show('result');
    }

    function setLoading(text, ready) {
      const b = $('start'); b.textContent = text; b.disabled = !ready;
      playable = !!ready && text === 'JUGAR HISTORIA';
      paintStart();
    }

    /* ---------- Cableado de botones ---------- */
    function bind() {
      $('start').onclick = () => cb.start(MENU[selMission].start, 0);
      // V58: VER CINEMÁTICA reproduce el prólogo ARCHIVO 01 (si no está disponible, la cinemática anterior).
      $('btnStory').onclick = () => { cb.click(); if (!(cb.story && cb.story())) showCinematic(null); };
      $('btnHowto').onclick = () => { cb.click(); show('guide'); };
      $('guideBack').onclick = () => { cb.click(); cb.menu(); };
      $('guidePlay').onclick = () => { cb.click(); cb.start(MENU[selMission].start, 0); };
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
      if ($('btnShop')) $('btnShop').onclick = () => { cb.click(); showShop(); };
      if ($('shopBack')) $('shopBack').onclick = () => { cb.click(); cb.menu(); };
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
      $('nextSchoolMission').onclick = () => { cb.click(); cb.start(missionArg($('nextSchoolMission').dataset.mission), 0); };
      $('retry').onclick = () => ($('retry').dataset.mode === 'again' ? cb.start(missionArg($('retry').dataset.mission ?? MENU[selMission].start), 0) : cb.retry());
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

    return { show, toast, chapter, sign, itemCard, hurtFlash, tick, clearOverlays, hud, paintMenu, paintOpts, showIntro, showCinematic, showBossCinematic, bossCinematicIndex: kind => BOSS_CINEMATICS[kind]?.saveIndex, showOptions, bossCinematicActive: () => activePanel === 'bossCinematic', showGuide: () => show('guide'), showGameOver, showVictory, showChaseResult, showShop, setLoading, setPlaying, fmtTime };
  }

  NS.UI = { createUI };
})(typeof globalThis !== 'undefined' ? globalThis : window);
