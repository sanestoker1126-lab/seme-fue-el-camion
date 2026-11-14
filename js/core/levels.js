/* ¡Se me fue el camión! — mapas y secuencia de tramos.
   Coordenadas de los mapas en "unidades de mapa" (= píxeles de la ilustración cuando el arte se trazó a mano;
   ver assets/scenes/collision_maps_v8.json). El mundo las multiplica por CONFIG.world.sceneScale.
   `surfaces`  cornisas/techos (suelo firme: no se atraviesan con BAJAR).
   `stairs`    peldaños (sí se atraviesan con BAJAR).      `movers`   tarimas móviles.
   `pigeons`   palomas-trampolín en vuelo.                 `bouncers` sombrillas/toldos que rebotan.
   `crumbles`  tejas flojas: aguantan medio segundo y se caen (reaparecen).
   `belts`     bandas eléctricas: transportan a quien esté encima (speed en u/s, + = derecha).
   `planks`    tablones de madera (ramas, andamios): se atraviesan con BAJAR.
   `water`     V52: lagos y pilas {x1, x2, y (superficie), depth, kind, banks: ['left'|'right']}. Profunda (≥ 70 u
               de mundo): se nada; baja: se camina salpicando. Un lado sin pared necesita suelo a la altura del agua.
   V50: las plataformas ya NO dependen del fondo. Si el arte del nivel no coincide con la colisión
   (todos menos `art: 'painted'`), el juego dibuja las plataformas con texturas (`skin`). Para crear un nivel
   nuevo basta un mapa + cualquier fondo (o un fondo procedural `bg`).
   V51: cada uno de los 16 niveles tiene su propio trazado (antes 10 niveles repetían 2 mapas). SCHOOL_MAP y
   GDL_MAP solo los usan los dos niveles con arte pintado; SCHOOL_M, GDL_M, CENTRO_MAP y ZAPOPAN_MAP se conservan
   como ejemplos de mirror(). Para validar un trazado con la física real (3 dificultades, cristales incluidos):
     node tools/niveles/level_check.js . <índice>      node tools/niveles/gem_check.js . <índice> */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};

  const SCHOOL_MAP = {
    id: 'school', width: 500, height: 1024,
    surfaces: [
      { x1: 0, x2: 182, y: 202, start: true, startX: 148 },
      { x1: 352, x2: 500, y: 277 },
      { x1: 0, x2: 190, y: 371 },
      { x1: 118, x2: 282, y: 412 },
      { x1: 352, x2: 500, y: 478 },
      { x1: 0, x2: 229, y: 555 },
      { x1: 286, x2: 438, y: 687 },
      { x1: 0, x2: 281, y: 731 },
      { x1: 359, x2: 500, y: 840 },
      { x1: 0, x2: 279, y: 928 },
      { x1: 350, x2: 500, y: 990, exit: true }
    ],
    stairs: [
      { x1: 226, x2: 251, y: 302 }, { x1: 235, x2: 260, y: 310 }, { x1: 244, x2: 269, y: 318 }, { x1: 253, x2: 278, y: 326 },
      { x1: 262, x2: 287, y: 334 }, { x1: 271, x2: 296, y: 342 }, { x1: 280, x2: 305, y: 350 }, { x1: 289, x2: 314, y: 358 },
      { x1: 111, x2: 132, y: 377 }, { x1: 124, x2: 145, y: 384 }, { x1: 137, x2: 158, y: 391 }, { x1: 150, x2: 171, y: 398 }, { x1: 163, x2: 184, y: 405 },
      { x1: 267, x2: 287, y: 703 }, { x1: 280, x2: 300, y: 716 }, { x1: 293, x2: 313, y: 729 }, { x1: 306, x2: 326, y: 742 },
      { x1: 319, x2: 339, y: 755 }, { x1: 332, x2: 352, y: 768 }, { x1: 345, x2: 365, y: 781 }, { x1: 358, x2: 378, y: 794 },
      { x1: 371, x2: 391, y: 807 }, { x1: 384, x2: 404, y: 820 }, { x1: 397, x2: 417, y: 833 }
    ],
    movers: [{ x1: 203, x2: 273, y: 455, range: 19, vertical: 4 }, { x1: 229, x2: 293, y: 607, range: 17, vertical: 5 }],
    gems: [{ x: 143, y: 165 }, { x: 322, y: 451 }, { x: 300, y: 650 }, { x: 405, y: 805 }, { x: 225, y: 900 }],
    exitX: 420
  };

  const GDL_MAP = {
    id: 'guadalajara', width: 628, height: 1024,
    surfaces: [
      { x1: 0, x2: 143, y: 164, start: true, startX: 116 },
      { x1: 0, x2: 292, y: 323 },
      { x1: 442, x2: 628, y: 356 },
      { x1: 0, x2: 291, y: 523 },
      { x1: 438, x2: 628, y: 615 },
      { x1: 0, x2: 341, y: 775 },
      { x1: 436, x2: 628, y: 862 },
      { x1: 0, x2: 344, y: 991, exit: true }
    ],
    stairs: [
      { x1: 286, x2: 312, y: 329 }, { x1: 311, x2: 337, y: 334 }, { x1: 336, x2: 362, y: 339 },
      { x1: 361, x2: 387, y: 344 }, { x1: 386, x2: 412, y: 350 }, { x1: 411, x2: 441, y: 355 },
      { x1: 291, x2: 316, y: 538 }, { x1: 316, x2: 341, y: 553 }, { x1: 341, x2: 366, y: 568 },
      { x1: 366, x2: 391, y: 583 }, { x1: 391, x2: 416, y: 598 }, { x1: 416, x2: 441, y: 613 },
      { x1: 338, x2: 360, y: 789 }, { x1: 358, x2: 380, y: 803 }, { x1: 378, x2: 400, y: 817 }, { x1: 398, x2: 420, y: 831 }, { x1: 418, x2: 440, y: 845 },
      { x1: 408, x2: 430, y: 875 }, { x1: 386, x2: 408, y: 890 }, { x1: 364, x2: 386, y: 905 }, { x1: 342, x2: 364, y: 920 },
      { x1: 320, x2: 342, y: 935 }, { x1: 298, x2: 320, y: 950 }, { x1: 276, x2: 298, y: 965 }, { x1: 254, x2: 276, y: 980 }
    ],
    movers: [{ x1: 298, x2: 365, y: 442, range: 23, vertical: 4 }, { x1: 307, x2: 371, y: 705, range: 21, vertical: 6 }],
    gems: [{ x: 113, y: 283 }, { x: 330, y: 485 }, { x: 490, y: 580 }, { x: 302, y: 727 }, { x: 505, y: 825 }, { x: 210, y: 953 }],
    exitX: 300
  };


  /* Espejo horizontal de un mapa: misma física (validada), recorrido invertido. */
  function mirror(map, id) {
    const W = map.width, flip = (q) => Object.assign({}, q, { x1: W - q.x2, x2: W - q.x1 });
    const out = { id, width: map.width, height: map.height, mirrorOf: map.id };
    out.surfaces = map.surfaces.map((q) => {
      const o = flip(q);
      if (q.startX !== undefined) o.startX = W - q.startX;
      return o;
    });
    for (const k of ['stairs', 'movers', 'pigeons', 'bouncers', 'crumbles', 'planks']) out[k] = (map[k] || []).map(flip);
    out.belts = (map.belts || []).map((q) => Object.assign(flip(q), { speed: -q.speed }));
    out.gems = map.gems.map((g) => ({ x: W - g.x, y: g.y }));
    out.exitX = W - map.exitX;
    return out;
  }
  const SCHOOL_M = mirror(SCHOOL_MAP, 'school_m');
  const GDL_M = mirror(GDL_MAP, 'gdl_m');
  // Compatibilidad con código anterior.
  const CENTRO_MAP = GDL_M;
  const ZAPOPAN_MAP = SCHOOL_M;

  /* Mapa ANCHO en zig-zag (serpentina): se baja cruzando de un lado a otro.
     Cinco repisas que se traslapan en X; al salir por el borde de una se cae sobre la siguiente.
     Fondo compuesto (SOFEVI + otra), aspecto 1600:450 ≈ 3.55 para no deformar la imagen. */
  const SOFEVI_MAP = {
    id: 'sofevi', width: 1600, height: 450,
    surfaces: [
      { x1: 950, x2: 1560, y: 90, start: true, startX: 1080 }, // A arriba-derecha (inicio)
      { x1: 120, x2: 1120, y: 170 },                            // B
      { x1: 480, x2: 1480, y: 250 },                            // C
      { x1: 60,  x2: 860, y: 330 },                             // D (V50: más corta → la arena del jefe en E queda a cielo abierto)
      { x1: 560, x2: 1200, y: 420, exit: true }                 // E abajo (salida)
    ],
    stairs: [
      { x1: 1000, x2: 1082, y: 132 }, { x1: 520, x2: 602, y: 212 },
      { x1: 1000, x2: 1060, y: 292 }, { x1: 600, x2: 682, y: 375 }
    ],
    movers: [],
    // Palomas-trampolín en movimiento en lo más alto (cielo): caes sobre ellas y te impulsan hacia arriba.
    pigeons: [
      { x1: 700, x2: 790, y: 55, range: 130, vertical: 9, speed: 1.4 },
      { x1: 1300, x2: 1390, y: 60, range: 90, vertical: 8, speed: 1.2 }
    ],
    gems: [{ x: 1320, y: 62 }, { x: 300, y: 142 }, { x: 1240, y: 222 }, { x: 200, y: 302 }, { x: 900, y: 392 }, { x: 745, y: 16 }, { x: 1345, y: 18 },
      // V51: más cristales a lo largo de los recorridos largos (el tramo horizontal tenía 7)
      { x: 560, y: 142 }, { x: 880, y: 142 }, { x: 760, y: 222 }, { x: 1450, y: 222 }, { x: 420, y: 302 }, { x: 1120, y: 392 }],
    exitX: 1030
  };

  /* NUEVO · Azoteas: techos de teja unidos por TEJAS FLOJAS (crumbles) que se caen al pisarlas.
     Debajo de cada teja floja hay siempre un techo a una caída segura. */
  const AZOTEAS_MAP = {
    id: 'azoteas', width: 560, height: 1024,
    surfaces: [
      { x1: 0, x2: 200, y: 150, start: true, startX: 110 },
      { x1: 350, x2: 560, y: 236 },
      { x1: 180, x2: 380, y: 340 },
      { x1: 0, x2: 150, y: 430 },
      { x1: 400, x2: 560, y: 540 },
      { x1: 110, x2: 360, y: 640 },
      { x1: 380, x2: 560, y: 742 },
      { x1: 0, x2: 350, y: 834 },
      { x1: 300, x2: 560, y: 984, exit: true }
    ],
    crumbles: [
      { x1: 222, x2: 330, y: 192 }, { x1: 178, x2: 262, y: 476 }, { x1: 292, x2: 376, y: 506 },
      { x1: 24, x2: 96, y: 716 }, { x1: 392, x2: 466, y: 890 }
    ],
    stairs: [], movers: [],
    gems: [{ x: 110, y: 110 }, { x: 276, y: 160 }, { x: 470, y: 200 }, { x: 280, y: 300 }, { x: 60, y: 395 }, { x: 220, y: 440 },
      { x: 334, y: 470 }, { x: 480, y: 505 }, { x: 235, y: 600 }, { x: 60, y: 680 }, { x: 470, y: 705 }, { x: 180, y: 800 }, { x: 430, y: 855 }],
    exitX: 440
  };

  /* NUEVO · Estación subterránea de la Línea 3: BANDAS ELÉCTRICAS (belts) que llevan en distinta
     dirección y una escalera de andén. Correr a favor acelera; en contra cuesta. */
  const METRO_MAP = {
    id: 'metro', width: 600, height: 1024,
    surfaces: [
      { x1: 0, x2: 220, y: 140, start: true, startX: 110 },
      { x1: 430, x2: 600, y: 300 },
      { x1: 60, x2: 262, y: 430 },
      { x1: 470, x2: 600, y: 566 },
      { x1: 0, x2: 186, y: 648 },
      { x1: 430, x2: 600, y: 822 },
      { x1: 0, x2: 250, y: 902 },
      { x1: 270, x2: 600, y: 990, exit: true }
    ],
    belts: [
      { x1: 244, x2: 556, y: 200, speed: 95 },
      { x1: 122, x2: 448, y: 540, speed: -100 },
      { x1: 206, x2: 520, y: 724, speed: 110 }
    ],
    stairs: [0, 1, 2, 3, 4, 5].map((i) => ({ x1: 404 - 26 * i, x2: 430 - 26 * i, y: 318 + 22 * i })),
    movers: [{ x1: 200, x2: 286, y: 860, range: 56, vertical: 4 }],
    gems: [{ x: 110, y: 105 }, { x: 330, y: 168 }, { x: 490, y: 168 }, { x: 520, y: 265 }, { x: 340, y: 330 }, { x: 160, y: 395 },
      { x: 290, y: 505 }, { x: 540, y: 530 }, { x: 90, y: 612 }, { x: 360, y: 690 }, { x: 520, y: 788 }, { x: 243, y: 826 }, { x: 110, y: 866 }],
    exitX: 440
  };

  /* NUEVO · Tlaquepaque: mapa ANCHO con SOMBRILLAS rebotadoras sobre los huecos del callejón.
     Ida hacia la derecha, vuelta hacia la izquierda; la paloma-trampolín lleva a los cristales altos. */
  const TLAQUE_MAP = {
    id: 'tlaquepaque', width: 1600, height: 450,
    surfaces: [
      { x1: 40, x2: 300, y: 84, start: true, startX: 150 },
      { x1: 470, x2: 760, y: 122 },
      { x1: 800, x2: 1100, y: 160 },
      { x1: 1250, x2: 1560, y: 204 },
      { x1: 880, x2: 1210, y: 268 },
      { x1: 470, x2: 840, y: 316 },
      { x1: 110, x2: 440, y: 356 },
      { x1: 40, x2: 1040, y: 432, exit: true }   // salida larga: a la derecha queda la arena del jefe a cielo abierto
    ],
    bouncers: [{ x1: 330, x2: 420, y: 152 }, { x1: 1124, x2: 1214, y: 232 }],
    stairs: [], movers: [],
    pigeons: [{ x1: 1350, x2: 1440, y: 84, range: 90, vertical: 8, speed: 1.3 }],
    gems: [{ x: 170, y: 50 }, { x: 375, y: 40 }, { x: 375, y: 2 }, { x: 615, y: 90 }, { x: 950, y: 128 }, { x: 1169, y: 110 }, { x: 1169, y: 70 },
      { x: 1400, y: 170 }, { x: 1395, y: 28 }, { x: 1045, y: 236 }, { x: 655, y: 284 }, { x: 831, y: 262 }, { x: 275, y: 324 }, { x: 560, y: 400 }],
    exitX: 960
  };

  /* ================= V51 · Trazados propios para los niveles que repetían mapa =================
     Antes 10 niveles compartían 2 trazados (escuela y Guadalajara). Cada uno tiene ahora su geometría,
     validada con la física real (tests/reach.js) en las tres dificultades. */

  /* Patio de la secundaria: árbol central con ramas (tablones), toldo de la cooperativa como red de seguridad. */
  const PATIO_MAP = {
    id: 'patio', width: 500, height: 1024,
    surfaces: [
      { x1: 0, x2: 200, y: 160, start: true, startX: 90 },
      { x1: 320, x2: 500, y: 200 },
      { x1: 0, x2: 150, y: 380 },
      { x1: 400, x2: 500, y: 610 },
      { x1: 0, x2: 330, y: 720 },
      { x1: 380, x2: 500, y: 860 },
      { x1: 120, x2: 500, y: 990, exit: true }
    ],
    planks: [{ x1: 170, x2: 330, y: 330 }, { x1: 120, x2: 260, y: 450 }, { x1: 240, x2: 390, y: 560 }],
    bouncers: [{ x1: 225, x2: 300, y: 262 }],
    stairs: [],
    movers: [{ x1: 300, x2: 370, y: 790, range: 50, vertical: 4 }],
    gems: [{ x: 90, y: 120 }, { x: 262, y: 120 }, { x: 262, y: 60 }, { x: 410, y: 165 }, { x: 250, y: 295 }, { x: 75, y: 345 },
      { x: 190, y: 415 }, { x: 315, y: 525 }, { x: 450, y: 575 }, { x: 150, y: 685 }, { x: 335, y: 755 }, { x: 440, y: 825 }, { x: 300, y: 955 }],
    exitX: 440
  };

  /* Pasillos bajo la lluvia: corredores en zigzag con rejillas (tablones) y losetas flojas de la escuela abandonada. */
  const PASILLOS_MAP = {
    id: 'pasillos', width: 520, height: 1024,
    surfaces: [
      { x1: 0, x2: 360, y: 150, start: true, startX: 80 },
      { x1: 130, x2: 300, y: 290 }, { x1: 380, x2: 520, y: 290 },
      { x1: 0, x2: 150, y: 430 }, { x1: 230, x2: 390, y: 430 },
      { x1: 130, x2: 280, y: 570 }, { x1: 360, x2: 520, y: 570 },
      { x1: 0, x2: 390, y: 710 },
      { x1: 130, x2: 250, y: 850 }, { x1: 330, x2: 520, y: 850 },
      { x1: 0, x2: 520, y: 990, exit: true }
    ],
    planks: [{ x1: 300, x2: 380, y: 290 }, { x1: 280, x2: 360, y: 570 }],
    crumbles: [{ x1: 150, x2: 230, y: 430 }, { x1: 250, x2: 330, y: 850 }],
    stairs: [],
    movers: [{ x1: 420, x2: 490, y: 650, range: 26, vertical: 4 }],
    gems: [{ x: 80, y: 110 }, { x: 250, y: 115 }, { x: 340, y: 255 }, { x: 460, y: 250 }, { x: 190, y: 395 }, { x: 60, y: 395 },
      { x: 320, y: 535 }, { x: 455, y: 610 }, { x: 440, y: 535 }, { x: 200, y: 675 }, { x: 290, y: 815 }, { x: 430, y: 815 }, { x: 260, y: 955 }],
    exitX: 260
  };

  /* Catedral (Centro Histórico): dos torres, techo de la nave, coro y dos bajadas que se juntan;
     una plataforma móvil cruza entre las torres hacia los cristales de la torre derecha. */
  const CATEDRAL_MAP = {
    id: 'catedral', width: 628, height: 1024,
    surfaces: [
      { x1: 0, x2: 170, y: 140, start: true, startX: 80 },
      { x1: 458, x2: 628, y: 140 },
      { x1: 170, x2: 458, y: 300 },
      { x1: 0, x2: 140, y: 380 }, { x1: 488, x2: 628, y: 460 },
      { x1: 170, x2: 430, y: 520 },
      { x1: 0, x2: 160, y: 600 }, { x1: 468, x2: 628, y: 650 },
      { x1: 130, x2: 498, y: 790 },
      { x1: 0, x2: 628, y: 990, exit: true }
    ],
    stairs: [],
    movers: [{ x1: 230, x2: 330, y: 180, range: 70, vertical: 6 }],
    gems: [{ x: 80, y: 100 }, { x: 540, y: 100 }, { x: 590, y: 100 }, { x: 280, y: 145 }, { x: 314, y: 265 }, { x: 60, y: 345 },
      { x: 560, y: 425 }, { x: 300, y: 485 }, { x: 70, y: 565 }, { x: 550, y: 615 }, { x: 314, y: 755 }, { x: 160, y: 950 }, { x: 470, y: 950 }],
    exitX: 314
  };

  /* Basílica de Zapopan: balcón central, dos bajadas por los costados, tarimas que cruzan el atrio
     y una paloma-trampolín sobre la plaza. */
  const BASILICA_MAP = {
    id: 'basilica', width: 600, height: 1024,
    surfaces: [
      { x1: 200, x2: 400, y: 150, start: true, startX: 300 },
      { x1: 0, x2: 140, y: 310 }, { x1: 460, x2: 600, y: 310 },
      { x1: 0, x2: 170, y: 520 },
      { x1: 210, x2: 390, y: 580 },
      { x1: 430, x2: 600, y: 640 },
      { x1: 40, x2: 250, y: 760 }, { x1: 350, x2: 560, y: 760 },
      { x1: 0, x2: 600, y: 990, exit: true }
    ],
    stairs: [],
    movers: [{ x1: 180, x2: 260, y: 400, range: 60, vertical: 6 }, { x1: 340, x2: 420, y: 470, range: 60, vertical: 6 }],
    pigeons: [{ x1: 260, x2: 340, y: 70, range: 120, vertical: 8, speed: 1.2 }],
    gems: [{ x: 300, y: 110 }, { x: 300, y: 25 }, { x: 180, y: 30 }, { x: 70, y: 275 }, { x: 530, y: 275 }, { x: 220, y: 360 },
      { x: 380, y: 430 }, { x: 85, y: 485 }, { x: 300, y: 545 }, { x: 515, y: 605 }, { x: 145, y: 725 }, { x: 455, y: 725 }, { x: 300, y: 955 }],
    exitX: 470
  };

  /* Terminal al amanecer: andenes techados, carritos de equipaje (tarimas largas) y la banda de maletas. */
  const TERMINAL_MAP = {
    id: 'terminal', width: 628, height: 1024,
    surfaces: [
      { x1: 0, x2: 220, y: 150, start: true, startX: 90 },
      { x1: 300, x2: 628, y: 230 },
      { x1: 0, x2: 260, y: 420 },
      { x1: 420, x2: 628, y: 600 },
      { x1: 0, x2: 300, y: 780 },
      { x1: 180, x2: 628, y: 990, exit: true }
    ],
    belts: [{ x1: 280, x2: 560, y: 500, speed: 90 }],
    stairs: [],
    movers: [{ x1: 150, x2: 240, y: 330, range: 90, vertical: 0 }, { x1: 260, x2: 340, y: 700, range: 100, vertical: 0 }],
    gems: [{ x: 90, y: 110 }, { x: 260, y: 150 }, { x: 460, y: 195 }, { x: 580, y: 195 }, { x: 195, y: 295 }, { x: 130, y: 385 },
      { x: 420, y: 465 }, { x: 520, y: 565 }, { x: 300, y: 665 }, { x: 150, y: 745 }, { x: 400, y: 950 }, { x: 560, y: 950 }],
    exitX: 420
  };

  /* Mercado: puestos con techos de lona (tablones), un toldo-trampolín escondido bajo el puesto de la izquierda. */
  const MERCADO_MAP = {
    id: 'mercado', width: 628, height: 1024,
    surfaces: [
      { x1: 0, x2: 200, y: 140, start: true, startX: 80 },
      { x1: 450, x2: 628, y: 330 },
      { x1: 470, x2: 628, y: 720 },
      { x1: 0, x2: 180, y: 900 },
      { x1: 150, x2: 628, y: 990, exit: true }
    ],
    planks: [{ x1: 220, x2: 420, y: 230 }, { x1: 230, x2: 430, y: 430 }, { x1: 0, x2: 200, y: 520 }, { x1: 230, x2: 450, y: 620 }, { x1: 200, x2: 440, y: 820 }],
    bouncers: [{ x1: 40, x2: 120, y: 700 }],
    stairs: [],
    movers: [],
    gems: [{ x: 80, y: 100 }, { x: 320, y: 195 }, { x: 540, y: 295 }, { x: 330, y: 395 }, { x: 100, y: 485 }, { x: 80, y: 600 },
      { x: 80, y: 540 }, { x: 340, y: 585 }, { x: 550, y: 685 }, { x: 320, y: 785 }, { x: 90, y: 865 }, { x: 400, y: 955 }],
    exitX: 470
  };

  /* Parque Metropolitano: ramas (tablones), puente de tablas viejas que se rompen sobre la orilla
     y un nenúfar que se mece. */
  const PARQUE_MAP = {
    id: 'parque', width: 560, height: 1024,
    surfaces: [
      { x1: 0, x2: 180, y: 150, start: true, startX: 80 },
      { x1: 360, x2: 560, y: 300 },
      { x1: 0, x2: 170, y: 450 },
      { x1: 470, x2: 560, y: 635 },
      { x1: 0, x2: 166, y: 790 },
      { x1: 60, x2: 560, y: 990, exit: true }
    ],
    planks: [{ x1: 200, x2: 330, y: 220 }, { x1: 120, x2: 260, y: 340 }, { x1: 380, x2: 520, y: 420 }],
    crumbles: [{ x1: 200, x2: 270, y: 560 }, { x1: 290, x2: 360, y: 560 }, { x1: 380, x2: 450, y: 560 }],
    // V52: el lago del parque bajo el puente de tablas. Caer en él no hace daño; la orilla derecha está a la
    // altura del agua (se sube nadando) y hay dos cristales en el fondo.
    water: [{ x1: 185, x2: 470, y: 640, depth: 100, kind: 'lago', banks: ['left'] }],
    stairs: [],
    movers: [{ x1: 50, x2: 120, y: 630, range: 30, vertical: 6 }],
    gems: [{ x: 80, y: 110 }, { x: 265, y: 185 }, { x: 460, y: 265 }, { x: 190, y: 305 }, { x: 450, y: 385 }, { x: 85, y: 415 },
      { x: 235, y: 525 }, { x: 325, y: 525 }, { x: 415, y: 525 }, { x: 85, y: 595 }, { x: 360, y: 605 }, { x: 100, y: 755 }, { x: 310, y: 955 },
      { x: 255, y: 710 }, { x: 405, y: 720 }],
    exitX: 460
  };

  /* Andén del Tren Ligero: puente peatonal con escalera, un vagón que se desplaza, banda y andenes. */
  const ANDEN_MAP = {
    id: 'anden', width: 560, height: 1024,
    surfaces: [
      { x1: 0, x2: 200, y: 150, start: true, startX: 90 },
      { x1: 240, x2: 560, y: 220 },
      { x1: 0, x2: 240, y: 370 },
      { x1: 440, x2: 560, y: 560 },
      { x1: 0, x2: 140, y: 720 },
      { x1: 320, x2: 560, y: 860 },
      { x1: 0, x2: 560, y: 990, exit: true }
    ],
    stairs: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ x1: 236 - 20 * i, x2: 260 - 20 * i, y: 238 + 19 * i })),
    belts: [{ x1: 130, x2: 400, y: 640, speed: -85 }],
    movers: [{ x1: 260, x2: 420, y: 470, range: 50, vertical: 0 }, { x1: 190, x2: 260, y: 810, range: 60, vertical: 4 }],
    gems: [{ x: 90, y: 110 }, { x: 400, y: 185 }, { x: 520, y: 185 }, { x: 190, y: 245 }, { x: 80, y: 335 }, { x: 340, y: 435 },
      { x: 500, y: 525 }, { x: 260, y: 605 }, { x: 70, y: 685 }, { x: 225, y: 775 }, { x: 440, y: 825 }, { x: 280, y: 955 }],
    exitX: 280
  };

  /* Guadalajara de noche: escalinata que baja desde el mirador, balcones a los dos lados, un andamio
     colgante que va y viene y un tablón de obra; la calle de abajo es amplia para el murciélago. */
  const NOCHE_MAP = {
    id: 'noche', width: 600, height: 1024,
    surfaces: [
      { x1: 0, x2: 190, y: 150, start: true, startX: 80 },
      { x1: 340, x2: 600, y: 300 },
      { x1: 0, x2: 220, y: 420 },
      { x1: 380, x2: 600, y: 560 },
      { x1: 150, x2: 450, y: 760 },
      { x1: 0, x2: 140, y: 860 }, { x1: 460, x2: 600, y: 880 },
      { x1: 0, x2: 600, y: 990, exit: true }
    ],
    stairs: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ x1: 196 + 22 * i, x2: 220 + 22 * i, y: 168 + 20 * i })),
    planks: [{ x1: 200, x2: 330, y: 610 }],
    movers: [{ x1: 250, x2: 330, y: 470, range: 60, vertical: 0 }],
    gems: [{ x: 80, y: 110 }, { x: 250, y: 160 }, { x: 330, y: 220 }, { x: 470, y: 265 }, { x: 560, y: 265 }, { x: 110, y: 385 },
      { x: 290, y: 425 }, { x: 490, y: 525 }, { x: 265, y: 575 }, { x: 300, y: 725 }, { x: 70, y: 825 }, { x: 530, y: 845 }, { x: 300, y: 955 }],
    exitX: 300
  };

  /* Plaza de las Jacarandas · final: dos bajadas simétricas que mezclan todo lo aprendido (tejas flojas,
     bandas, tarimas) y la fuente-trampolín al centro; termina en la arena más grande del juego. */
  const PLAZA_MAP = {
    id: 'plaza', width: 640, height: 1024,
    surfaces: [
      { x1: 240, x2: 400, y: 130, start: true, startX: 320 },
      { x1: 60, x2: 220, y: 230 }, { x1: 420, x2: 580, y: 230 },
      { x1: 120, x2: 280, y: 400 }, { x1: 360, x2: 520, y: 400 },
      { x1: 60, x2: 250, y: 640 }, { x1: 390, x2: 580, y: 640 },
      { x1: 255, x2: 385, y: 690 },
      { x1: 0, x2: 200, y: 850 }, { x1: 440, x2: 640, y: 850 },
      { x1: 40, x2: 600, y: 990, exit: true }
    ],
    // V52: pila de la fuente bajo la fuente-trampolín: agua a las espinillas (como en los cuadros de vadear).
    water: [{ x1: 255, x2: 385, y: 670, depth: 20, kind: 'fuente', banks: ['left', 'right'] }],
    crumbles: [{ x1: 0, x2: 90, y: 330 }, { x1: 550, x2: 640, y: 330 }],
    belts: [{ x1: 0, x2: 200, y: 510, speed: 80 }, { x1: 440, x2: 640, y: 510, speed: -80 }],
    bouncers: [{ x1: 290, x2: 350, y: 600 }],
    stairs: [],
    movers: [{ x1: 200, x2: 270, y: 760, range: 40, vertical: 4 }, { x1: 370, x2: 440, y: 760, range: 40, vertical: 4 }],
    gems: [{ x: 320, y: 90 }, { x: 140, y: 195 }, { x: 500, y: 195 }, { x: 45, y: 295 }, { x: 595, y: 295 }, { x: 200, y: 365 },
      { x: 440, y: 365 }, { x: 320, y: 470 }, { x: 320, y: 400 }, { x: 150, y: 605 }, { x: 490, y: 605 }, { x: 235, y: 725 },
      { x: 405, y: 725 }, { x: 100, y: 815 }, { x: 540, y: 815 }, { x: 320, y: 955 }, { x: 320, y: 662 }],
    exitX: 320
  };

  /* ================= V53 · Mundos nuevos (misiones 3 y 4) =================
     Submarino y Espacial. Sus fondos son los parallax aplanados (assets/scenes/generated). No son 'painted':
     el juego dibuja las plataformas con textura. Geometría validada con la física real (tools/niveles/level_check.js
     y tests/reach.js) en las tres dificultades, igual que el resto. */

  /* Submarino: descenso por ruinas y arrecifes con una poza profunda (se bucea por los cristales del fondo).
     Reusa el nado de V52. Ningún arrecife flota dentro del agua profunda; cada lado del agua tiene orilla. */
  const SUBMARINO_BASE_MAP = {
    id: 'submarino', width: 760, height: 1024,
    surfaces: [
      { x1: 0, x2: 250, y: 150, start: true, startX: 110 },
      { x1: 470, x2: 760, y: 250 },
      { x1: 0, x2: 210, y: 410 },
      { x1: 300, x2: 540, y: 470 },
      { x1: 590, x2: 760, y: 560 },
      { x1: 0, x2: 250, y: 740 },
      { x1: 470, x2: 700, y: 820 },
      { x1: 60, x2: 760, y: 990, exit: true }
    ],
    // Poza profunda bajo la cornisa del centro (y470): se cae desde ahí, se bucea por dos cristales del fondo
    // y se sale por cualquiera de las dos orillas (paredes de roca).
    water: [{ x1: 300, x2: 540, y: 610, depth: 130, kind: 'lago', banks: ['left', 'right'] }],
    planks: [{ x1: 250, x2: 400, y: 320 }, { x1: 560, x2: 700, y: 690 }],
    stairs: [],
    movers: [{ x1: 120, x2: 200, y: 560, range: 40, vertical: 5 }],
    gems: [{ x: 110, y: 110 }, { x: 330, y: 210 }, { x: 600, y: 210 }, { x: 170, y: 370 }, { x: 410, y: 430 },
      { x: 330, y: 560 }, { x: 420, y: 700 }, { x: 420, y: 560 }, { x: 650, y: 520 }, { x: 110, y: 700 },
      { x: 600, y: 780 }, { x: 300, y: 955 }, { x: 560, y: 955 }],
    exitX: 400
  };

  /* Espacial: estación en órbita; se baja saltando entre asteroides y módulos flotantes (gravedad normal).
     Plataformas móviles = rocas a la deriva; tablones = pasarelas de la estación. */
  const ESPACIAL_BASE_MAP = {
    id: 'espacial', width: 760, height: 1024,
    surfaces: [
      { x1: 0, x2: 220, y: 150, start: true, startX: 100 },
      { x1: 420, x2: 640, y: 230 },
      { x1: 140, x2: 360, y: 380 },
      { x1: 560, x2: 760, y: 470 },
      { x1: 0, x2: 230, y: 560 },
      { x1: 330, x2: 560, y: 690 },
      { x1: 0, x2: 180, y: 810 },
      { x1: 150, x2: 760, y: 990, exit: true }
    ],
    planks: [{ x1: 250, x2: 400, y: 300 }, { x1: 400, x2: 540, y: 560 }, { x1: 200, x2: 340, y: 890 }],
    stairs: [],
    movers: [{ x1: 620, x2: 720, y: 620, range: 70, vertical: 0 }, { x1: 240, x2: 340, y: 720, range: 50, vertical: 6 }],
    gems: [{ x: 100, y: 110 }, { x: 520, y: 190 }, { x: 250, y: 340 }, { x: 660, y: 430 }, { x: 110, y: 520 },
      { x: 330, y: 250 }, { x: 450, y: 650 }, { x: 680, y: 600 }, { x: 90, y: 770 }, { x: 270, y: 850 },
      { x: 450, y: 955 }, { x: 620, y: 955 }, { x: 300, y: 640 }],
    exitX: 450
  };


  /* Ampliación: tres secciones recorribles conservando el diseño y la física de V53.
     No se duplican puntos de inicio ni de meta. */
  function extendMissionMap(base) {
    const count = 3, margin = 90;
    const shift = (s, section) => {
      const q = { ...s, x1: s.x1 + margin, x2: s.x2 + margin, y: s.y + section * base.height };
      if (s.start) {
        if (section === 0) q.startX = s.startX + margin;
        else { delete q.start; delete q.startX; }
      }
      if (s.exit && section !== count - 1) delete q.exit;
      return q;
    };
    const repeat = (name) => Array.from({ length: count }, (_, i) => (base[name] || []).map(s => shift(s, i))).flat();
    return {
      ...base, width: base.width + 2 * margin, height: base.height * count,
      surfaces: repeat('surfaces'), planks: repeat('planks'), stairs: repeat('stairs'),
      movers: repeat('movers'), water: repeat('water'),
      gems: Array.from({ length: count }, (_, i) => base.gems.map(g => ({ ...g, x: g.x + margin, y: g.y + i * base.height }))).flat(),
      exitX: base.exitX + margin
    };
  }
  const SUBMARINO_MAP = extendMissionMap(SUBMARINO_BASE_MAP);
  const ESPACIAL_MAP = extendMissionMap(ESPACIAL_BASE_MAP);

  /* Cada tramo declara qué enemigos y obstáculos puede usar y con qué intensidad.
     La colocación concreta es determinista (semilla por tramo) y se valida con pruebas de alcanzabilidad.
     art: 'painted' → el fondo trae pintadas las cornisas (no se dibujan encima).
     skin: textura de las plataformas (assets/platforms/<skin>.png).  bg: fondo procedural cuando no hay archivo. */
  const LEVEL_SEQUENCE = [
    {
      id: 'escuela', label: 'LA ESCUELA', file: 'assets/scenes/escuela_fondo.png', map: SCHOOL_MAP, art: 'painted', stairsPainted: true, skin: 'concrete',
      tint: 0xffffff, wash: 0x244a4b, shade: 0.035, theme: 'escuela', room: 'sotano',
      foes: ['rat'], obstacles: ['crate', 'spikes'], foeBudget: 3, obstacleBudget: 2, sideFoes: 1,
      boss: { kind: 'dog', name: 'PERRO FURIOSO', hp: 4 },
      tutorial: true, music: 0
    },
    {
      id: 'guadalajara', label: 'EL CENTRO DE GUADALAJARA', file: 'assets/scenes/generated/sofevi_centro_zigzag.png', map: SOFEVI_MAP, ledges2d: true, skin: 'stone_long',
      tint: 0xffffff, wash: 0x805633, shade: 0.045, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['rat', 'dog', 'pigeon'], obstacles: ['pot', 'puddle', 'crate'], foeBudget: 5, obstacleBudget: 3, sideFoes: 2,
      boss: { kind: 'kid', name: 'DUEÑO DEL PERRO · 12 AÑOS', hp: 4 }, music: 1
    },
    {
      id: 'escuela_vecina', label: 'EL PATIO DE LA SECUNDARIA', file: 'assets/scenes/generated/escuela_patio_tarde.png', map: PATIO_MAP, skin: 'concrete',
      tint: 0xcdd8db, wash: 0x52664d, shade: 0.075, theme: 'escuela', room: 'sotano',
      foes: ['rat', 'dog', 'chile'], obstacles: ['spark', 'spikes', 'crate', 'pot'], foeBudget: 6, obstacleBudget: 4, sideFoes: 2,
      boss: { kind: 'chile', name: 'CHILE DE LA SECUNDARIA', hp: 4 }, music: 2
    },
    {
      id: 'gdl_noche', label: 'COLONIAS DE GUADALAJARA DE NOCHE', file: 'assets/scenes/generated/guadalajara_colonia_noche.png', map: NOCHE_MAP, skin: 'brick',
      tint: 0xb1b7d2, wash: 0x142349, shade: 0.2, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['bat', 'pigeon', 'dog', 'rat'], obstacles: ['spark', 'pot', 'puddle'], foeBudget: 7, obstacleBudget: 4, sideFoes: 3,
      boss: { kind: 'bat', name: 'MURCIÉLAGO CAPITÁN', hp: 4 }, music: 3
    },
    {
      id: 'azoteas', label: 'AZOTEAS DE LA COLONIA', file: null, bg: 'azoteas', map: AZOTEAS_MAP, skin: 'tiles_a', isNew: true,
      tint: 0xffffff, wash: 0x2b2148, shade: 0.06, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['pigeon', 'rat', 'chile', 'bat'], obstacles: ['pot', 'spark', 'crate'], foeBudget: 7, obstacleBudget: 4, sideFoes: 3,
      boss: { kind: 'chile', name: 'CHILE DEL TENDEDERO', hp: 5 }, music: 4
    },
    {
      id: 'escuela_ruinas', label: 'PASILLOS DE LA ESCUELA BAJO LA LLUVIA', file: 'assets/scenes/generated/escuela_pasillo_lluvia.png', map: PASILLOS_MAP, skin: 'concrete',
      tint: 0xaabda6, wash: 0x304b36, shade: 0.19, theme: 'escuela', room: 'sotano',
      foes: ['bat', 'chile', 'dog', 'rat'], obstacles: ['spikes', 'spark', 'crate', 'puddle'], foeBudget: 7, obstacleBudget: 5, sideFoes: 3,
      boss: { kind: 'bravo', name: 'PERRO GUARDIÁN', hp: 5 }, music: 5
    },
    {
      id: 'centro_historico', label: 'CENTRO HISTÓRICO DE GUADALAJARA', file: 'assets/scenes/generated/centro_historico_guadalajara.png', map: CATEDRAL_MAP, skin: 'stone_rocks',
      tint: 0xc1a98d, wash: 0x513b2f, shade: 0.12, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['dog', 'pigeon', 'bat', 'chile'], obstacles: ['pot', 'spark', 'crate', 'puddle'], foeBudget: 8, obstacleBudget: 5, sideFoes: 3,
      boss: { kind: 'pigeon', name: 'PALOMA JEFA', hp: 4 }, music: 6
    },
    {
      id: 'portales', label: 'GUADALAJARA, JALISCO · LOS PORTALES', file: 'assets/scenes/guadalajara_fondo.png', map: GDL_MAP, art: 'painted', skin: 'stone_moss', isNew: true,
      tint: 0xffffff, wash: 0x5a3828, shade: 0.06, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['pigeon', 'dog', 'kid', 'bat'], obstacles: ['pot', 'puddle', 'spark', 'crate'], foeBudget: 8, obstacleBudget: 5, sideFoes: 3,
      boss: { kind: 'kid', name: 'EL DUEÑO DEL PERRO · REVANCHA', hp: 5 }, music: 7
    },
    {
      id: 'zapopan', label: 'ZAPOPAN · PLAZA DE LAS AMÉRICAS', file: 'assets/scenes/generated/zapopan_basilica_noche.png', map: BASILICA_MAP, skin: 'stone_slim',
      tint: 0xb7b5c8, wash: 0x2e324f, shade: 0.17, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['bat', 'dog', 'pigeon', 'bravo'], obstacles: ['spark', 'spikes', 'puddle', 'pot'], foeBudget: 9, obstacleBudget: 6, sideFoes: 4,
      boss: { kind: 'bravo', name: 'PERRO BRAVO DE ZAPOPAN', hp: 5 }, music: 8
    },
    {
      id: 'arcadas', label: 'TERMINAL DE GUADALAJARA AL AMANECER', file: 'assets/scenes/generated/terminal_guadalajara_amanecer.png', map: TERMINAL_MAP, skin: 'stone_long',
      tint: 0xa7b0a8, wash: 0x344448, shade: 0.2, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['dog', 'chile', 'bat', 'pigeon'], obstacles: ['spark', 'spikes', 'pot', 'puddle'], foeBudget: 9, obstacleBudget: 6, sideFoes: 4,
      boss: { kind: 'rat', name: 'RATA DE LAS ARCADAS', hp: 5 }, music: 9
    },
    {
      id: 'metro', label: 'LÍNEA 3 · ESTACIÓN SUBTERRÁNEA', file: null, bg: 'metro', map: METRO_MAP, skin: 'scaffold', isNew: true,
      tint: 0xffffff, wash: 0x10202c, shade: 0.04, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['rat', 'bat', 'chile', 'kid'], obstacles: ['spark', 'puddle', 'spikes', 'crate'], foeBudget: 9, obstacleBudget: 6, sideFoes: 4,
      boss: { kind: 'rat', name: 'RATA DEL TÚNEL', hp: 6 }, music: 10
    },
    {
      id: 'mercado_tapatio', label: 'MERCADO TAPATÍO AL AMANECER', file: 'assets/scenes/generated/mercado_tapatio_amanecer.png', map: MERCADO_MAP, skin: 'wood_table',
      tint: 0xffe2bd, wash: 0x905b36, shade: 0.06, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['rat', 'dog', 'pigeon', 'kid'], obstacles: ['pot', 'puddle', 'crate', 'spark'], foeBudget: 9, obstacleBudget: 6, sideFoes: 4,
      boss: { kind: 'dog', name: 'PERRO DEL MERCADO', hp: 5 }, music: 11
    },
    {
      id: 'parque_metropolitano', label: 'PARQUE METROPOLITANO AL ATARDECER', file: 'assets/scenes/generated/parque_metropolitano_atardecer.png', map: PARQUE_MAP, skin: 'stone_moss',
      tint: 0xf3d6c9, wash: 0x465f53, shade: 0.11, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['bat', 'dog', 'pigeon', 'kid', 'bravo'], obstacles: ['spark', 'puddle', 'spikes', 'crate'], foeBudget: 10, obstacleBudget: 7, sideFoes: 5,
      boss: { kind: 'bravo', name: 'GUARDIÁN DEL PARQUE', hp: 6 }, music: 12
    },
    {
      id: 'tlaquepaque', label: 'TLAQUEPAQUE · CALLEJÓN DE LAS SOMBRILLAS', file: null, bg: 'tlaquepaque', map: TLAQUE_MAP, skin: 'tiles_b', isNew: true,
      tint: 0xffffff, wash: 0x5b2f3a, shade: 0.04, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['pigeon', 'dog', 'chile', 'kid', 'bravo'], obstacles: ['pot', 'crate', 'spark', 'puddle'], foeBudget: 10, obstacleBudget: 7, sideFoes: 5,
      boss: { kind: 'bat', name: 'MURCIÉLAGO DEL CALLEJÓN', hp: 6 }, music: 13
    },
    {
      id: 'anden_tren_ligero', label: 'ANDÉN DEL TREN LIGERO', file: 'assets/scenes/generated/anden_tren_ligero_guadalajara.png', map: ANDEN_MAP, skin: 'scaffold',
      tint: 0xc8b6e8, wash: 0x28264b, shade: 0.13, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['pigeon', 'bat', 'dog', 'rat', 'kid'], obstacles: ['spark', 'pot', 'puddle', 'crate'], foeBudget: 10, obstacleBudget: 7, sideFoes: 5,
      boss: { kind: 'pigeon', name: 'PALOMA DEL ANDÉN', hp: 6 }, music: 14
    },
    {
      id: 'plaza_jacarandas', label: 'PLAZA DE LAS JACARANDAS · FINAL', file: 'assets/scenes/generated/plaza_jacarandas_noche.png', map: PLAZA_MAP, skin: 'stone_rocks',
      tint: 0xd1bddf, wash: 0x26234a, shade: 0.18, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['bravo', 'bat', 'pigeon', 'chile', 'kid'], obstacles: ['spark', 'spikes', 'pot', 'puddle', 'crate'], foeBudget: 11, obstacleBudget: 8, sideFoes: 5,
      boss: { kind: 'bravo', name: 'GUARDIÁN DE LAS JACARANDAS', hp: 7 }, final: true, music: 15
    }
  ];

  /* storyIndex: posición canónica de cada tramo (0..15) para que capítulos, letreros y objetos sigan al nivel
     aunque una misión lo juegue en otra posición (world.js y game.js usan def.storyIndex, no el índice local). */
  LEVEL_SEQUENCE.forEach((d, i) => { d.storyIndex = i; });

  /* Niveles nuevos (misiones 3 y 4). storyIndex 16/17: su capítulo y letrero están en story.js. */
  const SUBMARINO_LEVEL = {
    id: 'submarino', label: 'RUINAS SUMERGIDAS', file: 'assets/scenes/generated/submarino_fondo.png', map: SUBMARINO_MAP, skin: 'stone_moss', isNew: true,
    tint: 0x9fd8e6, wash: 0x0a2e48, shade: 0.17, theme: 'submarino', room: 'alcantarilla', storyIndex: 16,
    // Pirañas solo en pozas reales; ratas en cornisas secas de las ruinas.
    foes: ['piranha', 'rat'], obstacles: ['spark', 'crate'], foeBudget: 8, obstacleBudget: 3, sideFoes: 3,
    boss: { kind: 'shark', name: 'TIBURÓN GUARDIÁN DEL ARRECIFE', hp: 6 }, music: 12
  };
  const ESPACIAL_LEVEL = {
    id: 'espacial', label: 'ESTACIÓN EN ÓRBITA', file: 'assets/scenes/generated/espacial_fondo.png', map: ESPACIAL_MAP, skin: 'scaffold', isNew: true,
    tint: 0xc3c9ee, wash: 0x0b0a28, shade: 0.1, theme: 'espacial', room: 'alcantarilla', storyIndex: 17,
    // Drones centinela de disparo anunciado; resto del nivel conserva sus trampas.
    foes: ['drone', 'chile'], obstacles: ['spark', 'crate'], foeBudget: 8, obstacleBudget: 3, sideFoes: 3,
    boss: { kind: 'drone', name: 'DRON CENTINELA', hp: 6 }, final: true, music: 15
  };

  /* Misiones: separan el juego por mundos. Las 1 y 2 reúnen los 16 niveles existentes por su tema (sin cambiar su
     diseño); las 3 y 4 son los mundos nuevos. buildWorld({ levels }) arma el mundo de cada misión. */
  const byTheme = (t) => LEVEL_SEQUENCE.filter((d) => d.theme === t);
  const MISSIONS = [
    { id: 'escuela', label: 'MISIÓN 1 · LA ESCUELA', theme: 'escuela', levels: byTheme('escuela') },
    { id: 'guadalajara', label: 'MISIÓN 2 · GUADALAJARA', theme: 'guadalajara', levels: byTheme('guadalajara') },
    { id: 'submarino', label: 'MISIÓN 3 · EL SUBMARINO', theme: 'submarino', levels: [SUBMARINO_LEVEL] },
    { id: 'espacial', label: 'MISIÓN 4 · EL ESPACIO', theme: 'espacial', levels: [ESPACIAL_LEVEL] }
  ];

  NS.LEVELS = { SCHOOL_MAP, GDL_MAP, SCHOOL_M, GDL_M, CENTRO_MAP, ZAPOPAN_MAP, SOFEVI_MAP, AZOTEAS_MAP, METRO_MAP, TLAQUE_MAP,
    PATIO_MAP, PASILLOS_MAP, NOCHE_MAP, CATEDRAL_MAP, BASILICA_MAP, TERMINAL_MAP, MERCADO_MAP, PARQUE_MAP, ANDEN_MAP, PLAZA_MAP,
    SUBMARINO_MAP, ESPACIAL_MAP, SUBMARINO_LEVEL, ESPACIAL_LEVEL, MISSIONS, LEVEL_SEQUENCE, mirror };
})(typeof globalThis !== 'undefined' ? globalThis : window);
