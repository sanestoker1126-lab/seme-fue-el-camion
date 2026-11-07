/* ¡Se me fue el camión! — audio (V50).
   La música/ambientes usan archivos locales con fallback WebAudio para móviles que bloqueen audio.
   V50: volumen de música y efectos ajustable, la vibración ya no depende de tener los efectos encendidos,
   y pausar ya no reinicia la canción desde el principio. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};

  function createAudio(opt) {
    let AC = null, timer = null, step = 0, tramo = 0, inRoom = false, playing = false, lastOtherCatAt = -Infinity;
    const lastBossCueAt = Object.create(null);
    const fades = new Set();
    let musicEl = null, ambienceEl = null, theme = 'escuela', musicK = 1, sfxK = 1;
    const MUSIC_VOL = 0.16; // banda sonora de fondo, bajita: deja oír los SFX del juego
    const AMB_VOL = 0.10;
    const AUDIO = {
      music: 'assets/audio/cancion_fondo_v40.mp3',
      school: 'assets/audio/ambiente_escuela_v24.mp3',
      city: 'assets/audio/ambiente_calles_guadalajara_v24.mp3',
      luna: 'assets/audio/luna_maullido_v24.mp3',
      morita: 'assets/audio/morita_maullido_v24.mp3',
      lunaPurr: 'assets/audio/luna_ronroneo_v31.mp3',
      moritaPurr: 'assets/audio/morita_ronroneo_v31.mp3',
      lunaAlert: 'assets/audio/luna_alerta_v31.mp3',
      moritaAlert: 'assets/audio/morita_alerta_v31.mp3',
      motor: 'assets/audio/motor_camion_guadalajara_v25.mp3',
      otroGato: 'assets/audio/sofia_otro_gato_usuario_v38.mp3',
      bossIntro: 'assets/audio/boss_intro_v37.mp3',
      bossWindup: 'assets/audio/boss_windup_v37.mp3',
      bossHit: 'assets/audio/boss_hit_v37.mp3',
      bossDefeat: 'assets/audio/boss_defeat_v37.mp3'
    };
    const ROOTS = [110, 98, 123, 131, 104, 147];

    function ensure() {
      try {
        if (!AC) { const C = root.AudioContext || root.webkitAudioContext; if (C) AC = new C(); }
        if (AC && AC.state === 'suspended') AC.resume();
      } catch (_) { AC = null; }
      return AC;
    }
    function tone(f, d, type = 'square', vol = 0.06, slide = 0, when = 0) {
      if (!AC) return;
      try {
        const t = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
        g.gain.setValueAtTime(Math.max(0.0002, vol * sfxK), t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
      } catch (_) { /* audio no disponible */ }
    }
    // V52 · Ruido filtrado (agua): un búfer de ruido blanco por un pasabanda que barre de f0 a f1.
    let noiseBuf = null;
    function noise(d, vol = 0.06, f0 = 1200, f1 = 400, when = 0, q = 1.2) {
      if (!AC) return;
      try {
        if (!noiseBuf) {
          noiseBuf = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.8), AC.sampleRate);
          const ch = noiseBuf.getChannelData(0);
          for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
        }
        const t = AC.currentTime + when, src = AC.createBufferSource(), bp = AC.createBiquadFilter(), g = AC.createGain();
        src.buffer = noiseBuf; bp.type = 'bandpass'; bp.Q.value = q;
        bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t + d);
        g.gain.setValueAtTime(Math.max(0.0002, vol * sfxK), t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        src.connect(bp); bp.connect(g); g.connect(AC.destination); src.start(t); src.stop(t + d + 0.02);
      } catch (_) { /* audio no disponible */ }
    }
    function vibrate(ms) { if (opt.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (_) {} }
    const VIB = { hurt: 40, hard: 60, clank: 25, bossHit: 30, crumble: 15, splashBig: 25 };

    function localAudio(src, loop = false, volume = 0.18) {
      try {
        const a = new Audio(src); a.preload = 'auto'; a.loop = loop; a.volume = volume;
        return a;
      } catch (_) { return null; }
    }
    function playLocal(src, volume = 0.55) {
      try {
        const a = localAudio(src, false, Math.max(0, Math.min(1, volume * sfxK))); if (!a) return false;
        const p = a.play(); if (p && p.catch) p.catch(() => {}); return true;
      } catch (_) { return false; }
    }
    function fadeElement(a, from, to, duration, done) {
      if (!a) return;
      a.volume = from;
      const started = Date.now();
      const id = setInterval(() => {
        const p = Math.min(1, (Date.now() - started) / duration);
        a.volume = from + (to - from) * p;
        if (p >= 1) { clearInterval(id); fades.delete(id); if (done) done(); }
      }, 40);
      fades.add(id);
    }
    // V50: el ambiente depende del tema del tramo (antes, del índice: al agregar niveles se desfasaba).
    function chooseAmbience() { return theme === 'escuela' ? AUDIO.school : AUDIO.city; }
    function syncTracks() {
      if (!opt.music || !playing) return;
      if (!musicEl) musicEl = localAudio(AUDIO.music, true, MUSIC_VOL * musicK);
      if (!ambienceEl) ambienceEl = localAudio(chooseAmbience(), true, AMB_VOL * musicK);
      if (ambienceEl && !ambienceEl.src.endsWith(chooseAmbience())) {
        const old = ambienceEl, next = localAudio(chooseAmbience(), true, 0);
        ambienceEl = next;
        if (next) {
          const p = next.play(); if (p && p.catch) p.catch(() => {});
          fadeElement(next, 0, AMB_VOL * musicK, 420);
        }
        fadeElement(old, old.volume, 0, 420, () => old.pause());
      }
      for (const a of [musicEl, ambienceEl]) {
        if (!a) continue;
        if (a === musicEl) a.volume = MUSIC_VOL * musicK;
        else if (!fades.size) a.volume = AMB_VOL * musicK;
        const p = a.play(); if (p && p.catch) p.catch(() => {});
      }
    }

    const SFX = {
      jump: () => tone(300, 0.14, 'square', 0.05, 320),
      land: () => tone(110, 0.1, 'triangle', 0.07, -50),
      dash: () => tone(500, 0.16, 'sawtooth', 0.04, -380),
      kick: () => { tone(180, 0.08, 'square', 0.05, -70); tone(460, 0.1, 'triangle', 0.04, 0, 0.04); },
      drop: () => tone(240, 0.1, 'triangle', 0.05, -120),
      bounce: () => { tone(220, 0.12, 'triangle', 0.07, 440); tone(660, 0.1, 'square', 0.03, 0, 0.06); },
      gem: () => { tone(880, 0.07, 'square', 0.04); tone(1320, 0.09, 'square', 0.04, 0, 0.06); },
      hurt: () => tone(220, 0.3, 'sawtooth', 0.07, -150),
      crumble: () => { tone(150, 0.12, 'triangle', 0.05, -60); tone(95, 0.18, 'sawtooth', 0.03, -30, 0.05); },
      power: () => { tone(520, 0.1, 'triangle', 0.06); tone(780, 0.1, 'triangle', 0.06, 0, 0.09); tone(1040, 0.16, 'triangle', 0.06, 0, 0.18); },
      stomp: () => { tone(200, 0.08, 'square', 0.07, -80); tone(420, 0.1, 'square', 0.05, 0, 0.05); },
      shoot: () => tone(340, 0.12, 'sawtooth', 0.035, -200),
      perfect: () => { tone(660, 0.08, 'triangle', 0.06); tone(990, 0.14, 'triangle', 0.06, 0, 0.07); },
      hard: () => tone(70, 0.25, 'sawtooth', 0.09, -30),
      alert: () => tone(980, 0.06, 'square', 0.03, 200),
      potShake: () => tone(160, 0.2, 'triangle', 0.04, 30),
      potBreak: () => { tone(140, 0.12, 'sawtooth', 0.05, -60); tone(90, 0.16, 'triangle', 0.05, 0, 0.04); },
      spark: () => tone(1800, 0.05, 'sawtooth', 0.02, -900),
      clank: () => { tone(160, 0.1, 'square', 0.07); tone(120, 0.14, 'square', 0.05, 0, 0.05); },
      key: () => { [784, 988, 1175].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, 0, i * 0.07)); },
      gate: () => { tone(200, 0.2, 'sawtooth', 0.04, 120); tone(400, 0.2, 'triangle', 0.05, 0, 0.15); },
      item: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'triangle', 0.06, 0, i * 0.08)); },
      door: () => tone(180, 0.3, 'triangle', 0.05, -90),
      checkpoint: () => { tone(660, 0.1, 'square', 0.04); tone(880, 0.16, 'square', 0.04, 0, 0.1); },
      chapter: () => { tone(392, 0.18, 'triangle', 0.05); tone(523, 0.24, 'triangle', 0.05, 0, 0.14); },
      honk: () => { tone(330, 0.32, 'square', 0.05); tone(415, 0.32, 'square', 0.04); },
      win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'square', 0.06, 0, i * 0.14)); },
      lose: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'triangle', 0.07, 0, i * 0.18)); },
      bossIntro: () => { tone(78, 0.32, 'sawtooth', 0.06, -24); tone(660, 0.14, 'triangle', 0.025, 240, 0.12); },
      bossWindup: () => { tone(170, 0.18, 'sawtooth', 0.035, 240); tone(520, 0.1, 'triangle', 0.025, 0, 0.1); },
      bossHit: () => { tone(130, 0.12, 'square', 0.05, -70); tone(420, 0.06, 'triangle', 0.025, -100, 0.03); },
      bossDefeat: () => { [392, 523, 784].forEach((f, i) => tone(f, 0.18, 'triangle', 0.04, 0, i * 0.12)); },
      ui: () => tone(880, 0.05, 'square', 0.03),
      // V52 · Agua.
      splash: () => { noise(0.32, 0.09, 1800, 380); tone(420, 0.08, 'sine', 0.03, -200, 0.02); },
      splashBig: () => { noise(0.5, 0.13, 1400, 220); noise(0.3, 0.06, 3000, 900, 0.06); tone(160, 0.18, 'sine', 0.05, -80); },
      swim: () => { noise(0.16, 0.05, 900, 500); tone(300, 0.06, 'sine', 0.02, 160, 0.02); },
      wade: () => noise(0.12, 0.045, 2400, 900),
      drip: () => { tone(1300, 0.05, 'sine', 0.03, 400); tone(900, 0.06, 'sine', 0.025, 300, 0.07); }
    };
    const FILE_SFX = {
      luna: [AUDIO.luna, 0.56], morita: [AUDIO.morita, 0.56],
      lunaPurr: [AUDIO.lunaPurr, 0.28], moritaPurr: [AUDIO.moritaPurr, 0.30],
      lunaAlert: [AUDIO.lunaAlert, 0.62], moritaAlert: [AUDIO.moritaAlert, 0.64],
      motor: [AUDIO.motor, 0.72], otroGato: [AUDIO.otroGato, 0.92],
      bossIntro: [AUDIO.bossIntro, 0.68], bossWindup: [AUDIO.bossWindup, 0.62],
      bossHit: [AUDIO.bossHit, 0.72], bossDefeat: [AUDIO.bossDefeat, 0.72]
    };
    function sfx(name) {
      if (VIB[name]) vibrate(VIB[name]);
      if (!opt.sfx) return;
      if (name === 'otroGato') {
        const now = Date.now();
        if (now - lastOtherCatAt < 7000) return;
        lastOtherCatAt = now;
      }
      if (FILE_SFX[name]) { playLocal(FILE_SFX[name][0], FILE_SFX[name][1]); return; }
      if (!AC) ensure();
      const f = SFX[name]; if (f) f();
    }

    function bossCue(kind, phase, scene = 0) {
      if (!opt.sfx) return;
      const effect = { intro: 'bossIntro', windup: 'bossWindup', hit: 'bossHit', defeat: 'bossDefeat' }[phase];
      if (!effect) return;
      const cooldown = phase === 'windup' ? 850 : phase === 'hit' ? 210 : 0;
      const now = Date.now();
      if (phase === 'windup' && now - (lastBossCueAt.intro || 0) < 1350) return;
      if (cooldown && now - (lastBossCueAt[phase] || 0) < cooldown) return;
      lastBossCueAt[phase] = now;
      sfx(effect);
      if (!AC) ensure();
      if (!AC) return;
      const profiles = {
        dog: [104, 'sawtooth'], bravo: [76, 'sawtooth'], kid: [245, 'triangle'],
        chile: [430, 'sawtooth'], bat: [515, 'triangle'], pigeon: [640, 'triangle'], rat: [735, 'square']
      };
      const p = profiles[kind] || [220, 'triangle'];
      const semitone = ((Math.abs(Number(scene) || 0) % 5) - 2) / 12;
      const f = p[0] * Math.pow(2, semitone), type = p[1];
      if (phase === 'intro') { tone(f * 0.72, 0.16, type, 0.018, -f * 0.12); tone(f * 1.42, 0.12, 'triangle', 0.022, f * 0.16, 0.13); }
      else if (phase === 'windup') { tone(f, 0.13, type, 0.018, f * 0.65); tone(f * 1.35, 0.09, 'triangle', 0.018, 0, 0.11); }
      else if (phase === 'hit') tone(f * 1.65, 0.065, type, 0.018, -f * 0.7);
      else { [1.25, 1.55, 2.05].forEach((m, i) => tone(f * m, 0.12, 'triangle', 0.016, 0, i * 0.085)); }
    }

    function musicTick() {
      if (!opt.music || !AC || !playing) return;
      if (musicEl && !musicEl.paused) return; // con la canción real sonando, no encimar la melodía de respaldo
      const r = ROOTS[tramo % ROOTS.length] * (inRoom ? 0.5 : 1), sc = [0, 3, 5, 7, 10, 12], n = step++;
      if (n % 4 === 0) tone(r, 0.4, 'triangle', 0.05);
      if (n % 2 === 0) tone(r * 2 * Math.pow(2, sc[(n * 3 + Math.floor(n / 8)) % 6] / 12), 0.18, inRoom ? 'triangle' : 'square', inRoom ? 0.025 : 0.018);
      if (n % 8 === 6) tone(r * 4, 0.1, 'square', 0.012);
    }
    function start() { if (!opt.music) return; ensure(); playing = true; syncTracks(); if (!timer) timer = setInterval(musicTick, 230); }
    function halt(rewind) {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      for (const id of fades) clearInterval(id);
      fades.clear();
      for (const a of [musicEl, ambienceEl]) if (a) { try { a.pause(); if (rewind) a.currentTime = 0; } catch (_) {} }
    }
    const stop = () => halt(true);          // fin de partida / menú: la próxima vez empieza desde el inicio
    const pause = () => halt(false);        // pausa: se retoma donde iba
    const resume = () => start();
    function setTramo(i, room, th) { tramo = i; inRoom = !!room; if (th) theme = th; if (playing) syncTracks(); }
    function setVolumes(m, s) {
      musicK = Math.max(0, Math.min(1, m)); sfxK = Math.max(0, Math.min(1, s));
      if (musicEl) musicEl.volume = MUSIC_VOL * musicK;
      if (ambienceEl && !fades.size) ambienceEl.volume = AMB_VOL * musicK;
    }
    function suspend() { pause(); try { if (AC && AC.state === 'running') AC.suspend(); } catch (_) {} }

    return { ensure, sfx, bossCue, start, stop, pause, resume, setTramo, setVolumes, vibrate, suspend, get context() { return AC; }, assets: AUDIO };
  }

  NS.Audio = { createAudio };
})(typeof globalThis !== 'undefined' ? globalThis : window);
