/* LA TOXIFAMILIA — manifiesto narrativo del modo historia.
   FUENTE (V58): «ARCHIVO 01: LA TOXI FAMILIA · EL PRÓLOGO A LA LEYENDA», guion v3.0 (Director's Cut, conexión de
   universos), entregado por el autor en el chat del proyecto. Se adapta escena por escena sin inventar diálogos:
   las frases entre comillas son las del guion. El PDF «La_Toxifamilia_Historia_Completa.pdf» sigue SIN transcribir
   (su enlace no deja leer las páginas); nada de aquí se le atribuye.
   Cada escena: id, tag, title, text, background (ruta o lista de rutas: varias capas CSS), durationMs, cast[], fx.
   cast: [{name, sprite, x (0-100), bottom (0-100), scale, entrance}]. fx: lluvia | monitores | hud | apagon | legend.
   La última escena del prólogo indica nextMission: {mission, tramo}. EPILOGUE es la escena post-créditos: solo se
   desbloquea al terminar el juego con las seis llaves (ver Game.finishVictory → postCredits). */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};
  const ST = 'assets/player/sofia/', CAT = 'assets/companions/', CINE = 'assets/cinematica/';
  const GDL = 'assets/parallax/guadalajara/';
  const ESTOKER = { name: 'ESTOKER (FELIPE)', sprite: CINE + 'estoker.svg', x: 28, bottom: 14, scale: 1.25, entrance: 'enter-left' };
  const TOXICA = { name: 'DOÑA TÓXICA (VIRIDIANA)', sprite: CINE + 'dona_toxica.svg', x: 74, bottom: 14, scale: 1.25, entrance: 'enter-right' };
  const SOFIA = (o) => Object.assign({ name: 'SOFÍA · LA NIÑA TÓXICA', sprite: ST + 'idle_01.png', x: 50, bottom: 16, scale: 1.2, entrance: 'enter-rise' }, o || {});
  const LUNA = (o) => Object.assign({ name: 'LUNA', sprite: CAT + 'luna.png', x: 22, bottom: 58, scale: 0.6, entrance: 'enter-left' }, o || {});
  const MORITA = (o) => Object.assign({ name: 'MORITA', sprite: CAT + 'morita.png', x: 80, bottom: 60, scale: 0.6, entrance: 'enter-right' }, o || {});

  const SCENES = [
    { id: 'e1_base', tag: 'ARCHIVO 01 · ESCENA 1 · 21:45 HRS', title: 'LA CUENTA REGRESIVA',
      text: 'Guadalajara, bajo ley marcial no oficial. En la base de la Toxi Familia, tres monitores brillan en la oscuridad: uno muestra los túneles de Puente Grande. Estoker carga un dispositivo modificado; Doña Tóxica se ajusta los guantes de pelea mirando la tormenta.',
      background: 'assets/scenes/generated/guadalajara_colonia_noche.png', durationMs: 9000, fx: 'monitores', cast: [ESTOKER, TOXICA] },
    { id: 'e1_estoker', tag: 'ESTOKER · VOZ ÁSPERA, CONCENTRADO', title: 'EL BLOQUE C ESTÁ POR CAER',
      text: '«El bloque C de Puente Grande está a punto de caer, pero si iniciamos el motín sin los códigos de anulación, será una masacre. Los custodios tienen orden de tirar a matar.»',
      background: 'assets/scenes/generated/guadalajara_colonia_noche.png', durationMs: 9500, fx: 'monitores', cast: [ESTOKER, Object.assign({}, TOXICA, { entrance: 'enter-rise' })] },
    { id: 'e1_toxica', tag: 'DOÑA TÓXICA · LO FULMINA CON LA MIRADA', title: 'SE LE FUE LA RUTA 6',
      text: 'DOÑA TÓXICA: «La niña tóxica los trae. Pero se le fue la Ruta 6. La Calzada Olímpica es un hervidero de patrullas y cárteles locales.»\nESTOKER: «Si no llega antes de la medianoche, la leyenda termina antes de empezar.»',
      background: 'assets/scenes/generated/guadalajara_colonia_noche.png', durationMs: 11000, fx: 'monitores', cast: [Object.assign({}, ESTOKER, { entrance: 'enter-rise' }), TOXICA] },
    { id: 'e2_mercado', tag: 'ESCENA 2 · MERCADO SAN JUAN DE DIOS · CALLE ALDAMA', title: 'LA ODISEA URBANA',
      text: 'Lluvia intensa sobre el mercado. Sofía, empapada pero con mirada desafiante, ajusta las correas de su mochila. Siluetas de pandilleros bloquean los callejones. Sobre los tejados, Luna y Morita brillan con un aura sutil: listas para interceptar francotiradores o activar trampas del entorno.',
      background: [GDL + 'mercado_parque/02_arquitectura_anclada.webp', GDL + 'mercado_parque/01_nubes_reales.webp', GDL + 'mercado_parque/00_cielo_degradado.webp'],
      durationMs: 10000, fx: 'lluvia', cast: [SOFIA({ sprite: ST + 'idle_01.png' }), LUNA(), MORITA()] },
    { id: 'e2_voz', tag: 'SOFÍA · VOZ EN OFF', title: 'NO SABEN LO QUE LLEVO',
      text: '«Piensan que solo soy una estudiante que perdió el camión. No saben lo que llevo en la mochila.»',
      background: [GDL + 'mercado_parque/02_arquitectura_anclada.webp', GDL + 'mercado_parque/00_cielo_degradado.webp'],
      durationMs: 8000, fx: 'lluvia', cast: [SOFIA({ sprite: ST + 'land_01.png', scale: 1.35, entrance: 'enter-rise' })] },
    { id: 'e2_usb', tag: 'SOFÍA · CLOSE-UP A LA MOCHILA (ZUMBIDO)', title: 'SEIS LLAVES ENCRIPTADAS',
      text: '«Seis memorias USB. Seis llaves encriptadas. Recuperar los objetos que perdí en la huida no es capricho… es la única forma de abrir las puertas de máxima seguridad.»',
      background: [GDL + 'barrios_inferiores/02_arquitectura_anclada.webp', GDL + 'barrios_inferiores/00_cielo_degradado.webp'],
      durationMs: 11000, fx: 'lluvia', cast: [SOFIA({ sprite: ST + 'run_02.png', x: 46, entrance: 'enter-left' }), LUNA({ bottom: 14, x: 18 }), MORITA({ bottom: 14, x: 78 })] },
    { id: 'e3_start', tag: 'ESCENA 3 · EL FRENTE CONJUNTO', title: 'OBJETIVO: CRUZA LA CIUDAD. RECUPERA LAS 6 LLAVES. SOBREVIVE.',
      text: 'Sofía truena los nudillos. El HUD de combate parpadea y se enciende línea por línea.\n[ INSERT COIN / PRESS START ]',
      background: 'assets/scenes/escuela_fondo.png', durationMs: 9000, fx: 'hud',
      cast: [SOFIA({ sprite: ST + 'kick_01.png', scale: 1.4, x: 50 }), LUNA({ bottom: 14, x: 22 }), MORITA({ bottom: 14, x: 77 })],
      nextMission: { mission: 0, tramo: 0 } }
  ];

  const EPILOGUE = [
    { id: 'pc_reja', tag: 'ESCENA POST-CRÉDITOS · A 500 METROS DEL MURO DE PUENTE GRANDE', title: 'JUSTO A TIEMPO',
      text: 'Sofía llega exhausta, cubierta de rasguños, a la entrada del alcantarillado. Al fondo, Doña Tóxica despacha a dos guardias de élite con un combo devastador. Estoker abre una pesada reja de acero y recibe la mochila.\nESTOKER: «Justo a tiempo, niña tóxica.»',
      background: [GDL + 'barrios_inferiores/02_arquitectura_anclada.webp', GDL + 'barrios_inferiores/00_cielo_degradado.webp'],
      durationMs: 11000, fx: 'lluvia', cast: [ESTOKER, SOFIA({ sprite: ST + 'land_01.png', x: 52 }), TOXICA] },
    { id: 'pc_apagon', tag: 'EL PANEL MAESTRO', title: 'SE ABRIERON LAS JAULAS',
      text: 'Estoker conecta las seis USB en el panel maestro. Un estruendo sordo hace temblar todo. Las luces de emergencia de Puente Grande se apagan a la vez y la fortaleza queda en absoluta oscuridad. Desde adentro, los gritos de victoria de los reclusos.\nDOÑA TÓXICA (sonriendo de medio lado): «Se abrieron las jaulas. Ahora nos toca a nosotros.»',
      background: [GDL + 'barrios_inferiores/02_arquitectura_anclada.webp', GDL + 'barrios_inferiores/00_cielo_degradado.webp'],
      durationMs: 12000, fx: 'apagon', cast: [Object.assign({}, ESTOKER, { entrance: 'enter-rise' }), Object.assign({}, TOXICA, { entrance: 'enter-rise' })] },
    { id: 'pc_legend', tag: '¡SE ME FUE EL CAMIÓN! → …', title: 'LEGEND OF PRESOS',
      text: 'LA VERDADERA BATALLA COMIENZA AHORA…', background: null, durationMs: 9000, fx: 'legend', cast: [] }
  ];

  const SOURCE = Object.freeze({
    title: 'ARCHIVO 01: LA TOXI FAMILIA · El prólogo a la leyenda',
    document: 'Guion v3.0 · Director\'s Cut (Conexión de Universos) — entregado en el chat del proyecto',
    status: 'adapted_from_chat_script',
    adapted: true,
    pdf: { document: 'La_Toxifamilia_Historia_Completa.pdf', url: 'https://us.wps.com/cms/docs/d/cbQa2t5UwooBsaYA', status: 'pending_pdf_text' }
  });
  const assetPattern = /^assets\/[a-zA-Z0-9_./-]+\.(png|webp|jpg|jpeg|svg)$/;
  function validAsset(path) {
    return typeof path === 'string' && assetPattern.test(path) &&
      !path.split('/').includes('..');
  }
  const FX = new Set(['lluvia', 'monitores', 'hud', 'apagon', 'legend']);
  function validate(scenes) {
    if (!Array.isArray(scenes)) throw new TypeError('scenes debe ser un arreglo');
    const ids = new Set();
    return scenes.map((s, i) => {
      if (!s || typeof s !== 'object' || Array.isArray(s)) throw new TypeError('escena invalida: ' + i);
      if (typeof s.id !== 'string' || !/^[a-z0-9_-]+$/i.test(s.id) || ids.has(s.id)) throw new Error('id repetido o invalido: ' + i);
      ids.add(s.id);
      if (typeof s.title !== 'string' || !s.title.trim() || typeof s.text !== 'string') throw new Error('titulo/texto invalido: ' + s.id);
      const bgs = s.background == null ? [] : Array.isArray(s.background) ? s.background : [s.background];
      if (bgs.length > 4 || !bgs.every(validAsset)) throw new Error('fondo invalido: ' + s.id);
      if (s.fx != null && !FX.has(s.fx)) throw new Error('efecto invalido: ' + s.id);
      const durationMs = s.durationMs == null ? 6500 : Number(s.durationMs);
      if (!Number.isFinite(durationMs) || durationMs < 2000 || durationMs > 60000) throw new Error('duracion invalida: ' + s.id);
      const cast = s.cast == null ? [] : s.cast;
      if (!Array.isArray(cast) || cast.length > 12) throw new Error('reparto invalido: ' + s.id);
      cast.forEach((a) => {
        if (!a || typeof a.name !== 'string' || !a.name.trim()) throw new Error('actor sin nombre: ' + s.id);
        if (a.sprite != null && !validAsset(a.sprite)) throw new Error('sprite invalido: ' + a.name);
        for (const k of ['x', 'bottom', 'scale']) {
          if (a[k] != null && !Number.isFinite(Number(a[k]))) throw new Error('coordenada invalida: ' + a.name);
        }
      });
      if (s.nextMission != null &&
          (!Number.isInteger(s.nextMission.mission) || !Number.isInteger(s.nextMission.tramo) ||
           s.nextMission.mission < 0 || s.nextMission.tramo < 0)) throw new Error('mision invalida: ' + s.id);
      return Object.freeze(Object.assign({}, s, { backgrounds: bgs, durationMs, cast: cast.map(a => Object.freeze(Object.assign({}, a))) }));
    });
  }
  NS.TOXIFAMILIA = { SOURCE, SCENES, EPILOGUE, validate, validAsset, get ready() { return SCENES.length > 0; } };
})(typeof globalThis !== 'undefined' ? globalThis : window);
