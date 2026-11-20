/* LA TOXIFAMILIA — manifiesto narrativo del modo historia.
   FUENTE (V58): «ARCHIVO 01: LA TOXI FAMILIA · EL PRÓLOGO A LA LEYENDA», guion v3.0 (Director's Cut, conexión de
   universos), entregado por el autor en el chat del proyecto. Se adapta escena por escena sin inventar diálogos:
   las frases entre comillas son las del guion. El PDF «La_Toxifamilia_Historia_Completa.pdf» sigue SIN transcribir
   (su enlace no deja leer las páginas); nada de aquí se le atribuye.
   Cada escena: id, tag, title, text, background (ruta o lista de rutas: varias capas CSS), durationMs, cast[], fx.
   cast: [{name, sprite, x (0-100), bottom (0-100), scale, entrance}]. fx: lluvia | monitores | hud | apagon | legend.
   La última escena del prólogo indica nextMission: {mission, tramo}. EPILOGUE es la escena post-créditos: solo se
   desbloquea al terminar el juego con las seis llaves (ver Game.finishVictory → postCredits).
   V58.2 · MARINO (llegada al mar): escenas con layout 'dialogo' (cuadro de diálogo arriba, líneas una por una con
   quién habla), fx en lista (recuerdo = tono sepia de memoria; burbujas) y reparto animado (ver validActor). */
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
      background: 'assets/scenes/school_miguel_hidalgo/01_aulas_superiores.webp', durationMs: 9000, fx: 'hud',
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

  /* V58.2 · LLEGADA AL MAR: Sofía llega a la isla sorprendida y confundida; un recuerdo la lleva a los paseos con su
     papito Estoker en esa misma playa cuando era más pequeña, y él le platica los peligros del mar. Se ve la primera
     vez que se empieza la misión 3 (y desde el menú, ya vista). Los consejos son los del juego (FOE_TIPS de main.js).
     Arte: paquetes aportados (paseo de la mano, Estoker platicando/explicando, Sofía asombrada en los 3 vestuarios,
     franjas ilustradas de playa, costa, descenso y santuario) + la isla del mar V4 + los atlas de enemigos marinos. */
  const MAR = 'assets/cinematica/marino/';
  const seq = (name, n) => Array.from({ length: n }, (_, i) => MAR + name + '_' + String(i).padStart(2, '0') + '.webp');
  const CAT_WALK = (cat) => [1, 2, 3, 4].map((i) => CAT + cat + '_walk_v38_0' + i + '.png');
  const CAT_IDLE = (cat) => [1, 2, 3, 4, 5, 6].map((i) => CAT + cat + '_idle_v38_0' + i + '.png');
  const KID = 'assets/enemies/v50/kid_buzo/';
  const CHEER = (dir) => ['cheer_01', 'cheer_02', 'cheer_03'].map((f) => dir + f + '.png');
  const SOFIA_HOY = 'SOFÍA', SOFIA_NINA = 'SOFÍA PEQUEÑA', PAPITO = 'PAPITO ESTOKER';
  const ESTOKER_NARRA = { name: PAPITO, frames: seq('estoker_explica', 7), fps: 2.4, x: 13, bottom: 0, scale: 1.4, entrance: 'enter-left' };
  const MARINO = [
    { id: 'm1_isla', tag: 'MISIÓN 3 · EL SUBMARINO · LA ISLA', title: '¿DÓNDE ESTOY?', layout: 'dialogo',
      background: MAR + 'fondo_isla_cima.webp', text: '',
      cast: [
        { name: 'MORITA', frames: [...CAT_WALK('morita'), ...CAT_IDLE('morita')], x: 6, bottom: 4, scale: 0.6, entrance: 'enter-fade',
          anim: [{ f: [0, 1, 2, 3], fps: 9, ms: 2900, to: 64 }, { f: [4, 5, 6, 7, 8, 9], fps: 5, ms: 60000 }] },
        { name: SOFIA_HOY, looks: { original: seq('sofia_original_asombro', 6), uniforme: seq('sofia_uniforme_asombro', 6), rosa: seq('sofia_rosa_asombro', 6) },
          x: 4, bottom: 4, scale: 1.25, entrance: 'enter-fade',
          anim: [{ f: [1, 2, 3, 4, 5], fps: 8, ms: 3100, to: 42 }, { f: [0], ms: 1300 }, { f: [5], ms: 1000, flip: true },
            { f: [0], ms: 700 }, { f: [5], ms: 1000 }, { f: [0], ms: 60000 }] },
        { name: 'LUNA', frames: [...CAT_WALK('luna'), ...CAT_IDLE('luna')], x: 0, bottom: 4, scale: 0.6, entrance: 'enter-fade',
          anim: [{ f: [0, 1, 2, 3], fps: 9, ms: 3200, to: 22 }, { f: [4, 5, 6, 7, 8, 9], fps: 5, ms: 60000 }] }
      ],
      lines: [
        { who: SOFIA_HOY, tone: 'sofia', text: '¿Eh? ¿Dónde estoy? ¡Hay mar por todos lados!' },
        { who: SOFIA_HOY, tone: 'sofia', text: 'Este lugar se me hace conocido… ¿Ya había venido aquí?' }
      ] },
    { id: 'm2_recuerdo', tag: 'RECUERDO · CUANDO SOFÍA ERA MÁS PEQUEÑA', title: 'LOS PASEOS CON PAPITO ESTOKER', layout: 'dialogo',
      background: MAR + 'fondo_playa.webp', fx: 'recuerdo', text: '',
      cast: [{ name: 'PAPITO Y SOFÍA', frames: seq('paseo_mano', 12), x: 10, bottom: 3, scale: 1.75, entrance: 'enter-fade',
        anim: [{ f: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], fps: 8, ms: 14000, to: 62 }, { f: [0], ms: 60000 }] }],
      lines: [
        { who: PAPITO, tone: 'estoker', text: 'Mira, princesa: esta es nuestra isla. Aquí venimos a pasear tú y yo.' },
        { who: SOFIA_NINA, tone: 'sofia', text: '¡Papito! ¿Y qué hay debajo del mar?' },
        { who: PAPITO, tone: 'estoker', text: 'Un reino escondido… pero el camino no es fácil. Escucha bien.' }
      ] },
    { id: 'm3_tiburones', tag: 'RECUERDO · PAPITO ESTOKER LE PLATICA LOS PELIGROS', title: 'LOS TIBURONES', layout: 'dialogo',
      background: MAR + 'fondo_costa.webp', fx: 'recuerdo', text: '',
      cast: [{ name: 'PAPITO Y SOFÍA', frames: seq('estoker_platica', 12), fps: 2.4, x: 50, bottom: 3, scale: 1.6, entrance: 'enter-rise' }],
      lines: [
        { who: PAPITO, tone: 'estoker', text: 'Allá abajo hay tiburones. Cuando uno te embista, esquívalo y espera.' },
        { who: PAPITO, tone: 'estoker', text: 'Al terminar su carrera se queda mareado: ¡ese es el momento de pegarle!' },
        { who: SOFIA_NINA, tone: 'sofia', text: '¿¡Tiburones, papito!? ¡Qué miedo!' },
        { who: PAPITO, tone: 'estoker', text: 'Mantén la calma, princesa. Te enseñaré a esquivarlos.' }
      ] },
    { id: 'm4_criaturas', tag: 'RECUERDO · LO QUE VIVE BAJO EL AGUA', title: 'PIRAÑAS, PULPOS Y CANGREJOS', layout: 'dialogo',
      background: MAR + 'fondo_descenso.webp', fx: ['recuerdo', 'burbujas'], text: '',
      cast: [
        { name: 'TIBURÓN', frames: seq('tiburon_nado', 7), x: 100, bottom: 60, scale: 1.2, float: true, entrance: 'enter-fade', loop: true,
          anim: [{ f: [0, 1, 2, 3, 4, 5, 6], fps: 10, ms: 7500, to: -12, flip: true }, { f: [0, 1, 2, 3, 4, 5, 6], fps: 10, ms: 7500, to: 112 }] },
        { name: 'PIRAÑA', frames: seq('pirana_nado', 7), x: 34, bottom: 34, scale: 0.85, float: true, entrance: 'enter-fade', loop: true,
          anim: [{ f: [0, 1, 2, 3, 4, 5, 6], fps: 12, ms: 1500, to: 54 }, { f: [0, 1, 2, 3, 4, 5, 6], fps: 12, ms: 1700, to: 30, flip: true }] },
        { name: 'PULPO', frames: [...seq('pulpo_flota', 6), ...seq('pulpo_tinta', 6)], x: 76, bottom: 10, scale: 1.3, float: true, entrance: 'enter-rise', loop: true,
          anim: [{ f: [0, 1, 2, 3, 4, 5], fps: 7, ms: 2600, flip: true }, { f: [6, 7, 8, 9, 10, 11], fps: 8, ms: 760, flip: true }, { f: [11], ms: 600, flip: true }] },
        ESTOKER_NARRA
      ],
      lines: [
        { who: PAPITO, tone: 'estoker', text: 'Las pirañas vigilan el agua y se lanzan en carrera: no te quedes quieta.' },
        { who: PAPITO, tone: 'estoker', text: 'El pulpo se infla antes de escupir tinta. Esquívala… o rómpela con tu DASH.' },
        { who: PAPITO, tone: 'estoker', text: 'Y en las rocas hay cangrejos que corren de lado: písalos, patéalos o usa el DASH.' }
      ] },
    { id: 'm5_templo', tag: 'RECUERDO · EL TEMPLO DEL FONDO DEL MAR', title: 'POSEIDÓN, REY DEL MAR', layout: 'dialogo',
      background: MAR + 'fondo_santuario.webp', fx: ['recuerdo', 'burbujas'], text: '',
      cast: [
        { name: 'POSEIDÓN', frames: seq('poseidon_tridente', 6), x: 54, bottom: 8, scale: 1.9, flip: true, float: true, entrance: 'enter-rise', loop: true,
          anim: [{ f: [0], ms: 1600 }, { f: [1, 2], fps: 5, ms: 800 }, { f: [3, 4], fps: 5, ms: 800 }, { f: [5], ms: 700 }] },
        { name: 'NIÑO BUZO', frames: [...['idle_01', 'idle_02', 'idle_03', 'idle_04', 'throw_prepare', 'throw_windup', 'throw_release', 'throw_projectile', 'throw_recovery'].map((n) => KID + n + '.webp')],
          x: 86, bottom: 3, scale: 1.05, flip: true, entrance: 'enter-right', loop: true,
          anim: [{ f: [0, 1, 2, 3], fps: 5, ms: 2400 }, { f: [4, 5, 6, 7, 8], fps: 6, ms: 900 }] },
        ESTOKER_NARRA
      ],
      lines: [
        { who: PAPITO, tone: 'estoker', text: 'En el templo del fondo vive Poseidón. Embiste con su tridente y lanza olas.' },
        { who: PAPITO, tone: 'estoker', text: 'Si te cierra el paso, pégale cuando quede mareado.' },
        { who: PAPITO, tone: 'estoker', text: '¡Ah! Y cuidado con el niño de las piedras: hasta con traje de buzo te las avienta.' },
        { who: SOFIA_NINA, tone: 'sofia', text: '¡Yo no le tengo miedo, papito!' }
      ] },
    { id: 'm6_bucear', tag: 'DE VUELTA AL PRESENTE', title: '¡A BUCEAR!', layout: 'dialogo',
      background: MAR + 'fondo_isla_orilla.webp', text: '',
      cast: [
        { name: 'LUNA', frames: CAT_IDLE('luna'), fps: 5, x: 22, bottom: 4, scale: 0.6, entrance: 'enter-left' },
        { name: SOFIA_HOY, looks: { original: CHEER(ST), uniforme: CHEER('assets/player/variants/uniforme/'), rosa: CHEER('assets/player/variants/rosa/') },
          x: 48, bottom: 4, scale: 1.25, entrance: 'enter-rise', anim: [{ f: [0, 1, 2, 1], fps: 5, ms: 60000 }] },
        { name: 'MORITA', frames: CAT_IDLE('morita'), fps: 5, x: 74, bottom: 4, scale: 0.6, flip: true, entrance: 'enter-right' }
      ],
      lines: [
        { who: SOFIA_HOY, tone: 'sofia', text: '¡Ya me acordé! Papito me traía a pasear aquí y me contó todos los peligros.' },
        { who: SOFIA_HOY, tone: 'sofia', text: 'Tiburones, pirañas, pulpos… y Poseidón. ¡Gracias, papito! Luna, Morita: ¡al agua!' }
      ] }
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
  const FX = new Set(['lluvia', 'monitores', 'hud', 'apagon', 'legend', 'recuerdo', 'burbujas']);
  const LAYOUTS = new Set(['dialogo']);
  const TONES = new Set(['sofia', 'estoker', 'narra']);
  const LOOKS = ['original', 'uniforme', 'rosa'];
  const num = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  /** Tiempo en pantalla de una línea de diálogo: base + lectura (≈18 letras por segundo). */
  const lineMs = (l) => (l.ms != null ? l.ms : Math.round(Math.max(2800, Math.min(7000, 1400 + 55 * l.text.length))));
  function frameList(list, who) {
    if (!Array.isArray(list) || !list.length || list.length > 16 || !list.every(validAsset)) throw new Error('cuadros invalidos: ' + who);
    return Object.freeze(list.slice());
  }
  /** V58.2 · Reparto animado: cuadros (o cuadros por vestuario de Sofía) y una línea de tiempo de pasos
      {f: índices, fps, ms, to: x final, toB: altura final, flip}. Sin `anim`, los cuadros se repiten a `fps`. */
  function validActor(a, sid) {
    if (!a || typeof a.name !== 'string' || !a.name.trim()) throw new Error('actor sin nombre: ' + sid);
    if (a.sprite != null && !validAsset(a.sprite)) throw new Error('sprite invalido: ' + a.name);
    for (const k of ['x', 'bottom', 'scale']) {
      if (a[k] != null && !Number.isFinite(Number(a[k]))) throw new Error('coordenada invalida: ' + a.name);
    }
    const out = Object.assign({}, a);
    let n = 1;
    if (a.frames != null) { out.frames = frameList(a.frames, a.name); n = out.frames.length; }
    if (a.looks != null) {
      if (typeof a.looks !== 'object' || !a.looks.original || Object.keys(a.looks).some((k) => !LOOKS.includes(k))) throw new Error('vestuarios invalidos: ' + a.name);
      const looks = {};
      for (const k of Object.keys(a.looks)) looks[k] = frameList(a.looks[k], a.name);
      n = looks.original.length;
      if (Object.values(looks).some((l) => l.length !== n)) throw new Error('vestuarios con distinto numero de cuadros: ' + a.name);
      out.looks = Object.freeze(looks);
    }
    if (a.fps != null && !num(a.fps, 0.5, 24)) throw new Error('fps invalido: ' + a.name);
    for (const k of ['flip', 'float', 'loop', 'label']) if (a[k] != null && typeof a[k] !== 'boolean') throw new Error(k + ' invalido: ' + a.name);
    if (a.anim != null) {
      if (!Array.isArray(a.anim) || !a.anim.length || a.anim.length > 12) throw new Error('animacion invalida: ' + a.name);
      out.anim = Object.freeze(a.anim.map((st) => {
        if (!st || !Array.isArray(st.f) || !st.f.length || st.f.length > 16 || !st.f.every((i) => Number.isInteger(i) && i >= 0 && i < n)) throw new Error('paso invalido: ' + a.name);
        if (!num(st.ms, 100, 60000) || (st.fps != null && !num(st.fps, 0.5, 24)) || (st.to != null && !num(st.to, -40, 140)) ||
            (st.toB != null && !num(st.toB, -30, 100)) || (st.flip != null && typeof st.flip !== 'boolean')) throw new Error('paso invalido: ' + a.name);
        return Object.freeze(Object.assign({}, st, { f: Object.freeze(st.f.slice()) }));
      }));
    }
    return Object.freeze(out);
  }
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
      const fxs = s.fx == null ? [] : Array.isArray(s.fx) ? s.fx : [s.fx];
      if (fxs.length > 3 || !fxs.every((f) => FX.has(f))) throw new Error('efecto invalido: ' + s.id);
      if (s.layout != null && !LAYOUTS.has(s.layout)) throw new Error('acomodo invalido: ' + s.id);
      let lines = null, text = s.text, durationMs;
      if (s.lines != null) {
        if (!Array.isArray(s.lines) || !s.lines.length || s.lines.length > 8) throw new Error('dialogo invalido: ' + s.id);
        let at = 0;
        lines = Object.freeze(s.lines.map((l) => {
          if (!l || typeof l.who !== 'string' || !l.who.trim() || l.who.length > 32 || !TONES.has(l.tone) ||
              typeof l.text !== 'string' || !l.text.trim() || l.text.length > 200 || (l.ms != null && !num(l.ms, 1500, 12000))) throw new Error('linea invalida: ' + s.id);
          const ms = lineMs(l), line = Object.freeze({ who: l.who, tone: l.tone, text: l.text, at, ms });
          at += ms;
          return line;
        }));
        durationMs = at;
        if (!text) text = lines.map((l) => l.who + ': «' + l.text + '»').join('\n');
      } else durationMs = s.durationMs == null ? 6500 : Number(s.durationMs);
      if (!Number.isFinite(durationMs) || durationMs < 2000 || durationMs > 60000) throw new Error('duracion invalida: ' + s.id);
      const cast = s.cast == null ? [] : s.cast;
      if (!Array.isArray(cast) || cast.length > 12) throw new Error('reparto invalido: ' + s.id);
      const actors = cast.map((a) => validActor(a, s.id));
      if (s.nextMission != null &&
          (!Number.isInteger(s.nextMission.mission) || !Number.isInteger(s.nextMission.tramo) ||
           s.nextMission.mission < 0 || s.nextMission.tramo < 0)) throw new Error('mision invalida: ' + s.id);
      return Object.freeze(Object.assign({}, s, { backgrounds: bgs, fxList: Object.freeze(fxs.slice()), text, lines, durationMs, cast: Object.freeze(actors) }));
    });
  }
  /** Todos los archivos de un conjunto de escenas (fondos y cuadros de todos los vestuarios): para precarga y caché. */
  function assetsOf(scenes) {
    const out = new Set();
    for (const s of scenes) {
      const bgs = s.background == null ? [] : Array.isArray(s.background) ? s.background : [s.background];
      bgs.forEach((b) => out.add(b));
      for (const a of s.cast || []) {
        if (a.sprite) out.add(a.sprite);
        (a.frames || []).forEach((f) => out.add(f));
        if (a.looks) Object.values(a.looks).forEach((l) => l.forEach((f) => out.add(f)));
      }
    }
    return [...out];
  }
  NS.TOXIFAMILIA = { SOURCE, SCENES, EPILOGUE, MARINO, validate, validAsset, assetsOf, lineMs, get ready() { return SCENES.length > 0; } };
})(typeof globalThis !== 'undefined' ? globalThis : window);
