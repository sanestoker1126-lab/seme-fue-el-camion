/* V56 · Dirección de arte provisional: La Toxifamilia.
   Únicamente estética; los personajes y la historia del PDF siguen sin definirse.
   Perfil explícito para cada uno de los 18 niveles y para los siete enemigos existentes.
   No agrega colisiones, peligros invisibles ni altera mapas. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};
  const P = {
    escuela:              { tag:'PATIO CONTAMINADO', accent:'#b7f560', edge:'#ff77bd', haze:'#17352c', motif:'graffiti', intensity:0.63 },
    guadalajara:          { tag:'RUTA ALTERADA', accent:'#ffbd63', edge:'#8ad9ed', haze:'#2a2736', motif:'poster', intensity:0.52 },
    escuela_vecina:       { tag:'ZONA EN CUARENTENA', accent:'#b9ed68', edge:'#f58fb9', haze:'#283626', motif:'caution', intensity:0.65 },
    gdl_noche:           { tag:'NOCHES TÓXICAS', accent:'#ae88ff', edge:'#56eac8', haze:'#19183e', motif:'smog', intensity:0.78 },
    azoteas:             { tag:'ALTURA PELIGROSA', accent:'#ff7dba', edge:'#baf26f', haze:'#211b3a', motif:'antenna', intensity:0.57 },
    escuela_ruinas:      { tag:'PASILLOS OLVIDADOS', accent:'#9bff85', edge:'#a889ed', haze:'#1b312c', motif:'drip', intensity:0.77 },
    centro_historico:    { tag:'ECOS DEL CENTRO', accent:'#ffd58c', edge:'#d48aff', haze:'#322432', motif:'poster', intensity:0.43 },
    portales:            { tag:'LOS PORTALES', accent:'#ffd66d', edge:'#ff7baa', haze:'#2c252d', motif:'graffiti', intensity:0.5 },
    zapopan:             { tag:'NIEBLA EN LA PLAZA', accent:'#d7a0ff', edge:'#a8d2f6', haze:'#25213c', motif:'smog', intensity:0.7 },
    arcadas:             { tag:'ÚLTIMA PARADA', accent:'#fdcd6a', edge:'#8cf6e4', haze:'#2b2f31', motif:'caution', intensity:0.75 },
    metro:               { tag:'VÍA RESTRINGIDA', accent:'#78edeb', edge:'#e7fa78', haze:'#172a39', motif:'caution', intensity:0.76 },
    mercado_tapatio:     { tag:'MERCADO MUTANTE', accent:'#e5fb80', edge:'#fa8c8c', haze:'#3b3020', motif:'graffiti', intensity:0.55 },
    parque_metropolitano:{ tag:'NATURALEZA EXTRAÑA', accent:'#aeef71', edge:'#ffb889', haze:'#263628', motif:'spores', intensity:0.69 },
    tlaquepaque:         { tag:'CALLEJÓN NEÓN', accent:'#ff8ad6', edge:'#fcda86', haze:'#352137', motif:'poster', intensity:0.59 },
    anden_tren_ligero:   { tag:'ANDÉN PROHIBIDO', accent:'#88f7f0', edge:'#b1a1ff', haze:'#1d203c', motif:'caution', intensity:0.76 },
    plaza_jacarandas:    { tag:'JACARANDAS OSCURAS', accent:'#d59eff', edge:'#ff80c0', haze:'#271a42', motif:'spores', intensity:0.87 },
    submarino:           { tag:'ABISMO BIOLUMINISCENTE', accent:'#77f3da', edge:'#b0b3ff', haze:'#052e3a', motif:'bubbles', intensity:0.68 },
    espacial:            { tag:'ÓRBITA ANÓMALA', accent:'#b49cff', edge:'#85f6ed', haze:'#151532', motif:'stardust', intensity:0.68 }
  };
  const ENEMIES = {
    rat: { color:'#adff63', warning:'RATA · SALTA / DASH', emblem:'◆' },
    dog: { color:'#ff9c7a', warning:'PERRO · ESQUIVA LA EMBESTIDA', emblem:'!' },
    bravo: { color:'#fa649b', warning:'PERRO BRAVO · ESPERA EL MAREO', emblem:'!' },
    chile: { color:'#ff9d56', warning:'CHILE · CUIDADO CON SEMILLAS', emblem:'✦' },
    bat: { color:'#b695fa', warning:'MURCIÉLAGO · CAMBIA DE ALTURA', emblem:'✦' },
    pigeon: { color:'#80e5eb', warning:'PALOMA · NO PASES DEBAJO', emblem:'◆' },
    kid: { color:'#f5d071', warning:'RIVAL · ESQUIVA / CONTRAATACA', emblem:'!' }
  };
  const FALLBACK = Object.freeze({ tag:'RUTA ALTERADA', accent:'#b7f560', edge:'#ff77bd', haze:'#1a2731', motif:'poster', intensity:0.5 });
  const PROFILES = Object.freeze(Object.fromEntries(Object.entries(P).map(([id, p])=>[id,Object.freeze(p)])));
  const ENEMY_PROFILES = Object.freeze(Object.fromEntries(Object.entries(ENEMIES).map(([id,p])=>[id,Object.freeze(p)])));
  function forScene(scene) {
    const id = typeof scene === 'string' ? scene : scene && (scene.def && scene.def.id || scene.id);
    return PROFILES[id] || FALLBACK;
  }
  function forEnemy(kind) { return ENEMY_PROFILES[kind] || ENEMY_PROFILES.rat; }
  NS.TOXI_STYLE = Object.freeze({ version:'56.0', name:'LA TOXIFAMILIA · ESTILO PROVISIONAL',
    profiles:PROFILES, enemies:ENEMY_PROFILES, forScene, forEnemy });
})(typeof globalThis !== 'undefined' ? globalThis : window);
