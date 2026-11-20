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
  const SUBMARINO_V54_MAP = extendMissionMap(SUBMARINO_BASE_MAP);
  const ESPACIAL_V54_MAP = extendMissionMap(ESPACIAL_BASE_MAP);

  /* ================= V58 · Niveles al doble de tamaño =================
     Cada nivel crece hacia los lados y hacia abajo:
     · Mitad alta: el trazado original (ya validado) y su espejo a la derecha. Las cornisas que tocaban el borde
       derecho se unen con su reflejo y quedan plataformas largas para correr, pelear y saltar sobre enemigos.
       Los niveles con arte pintado dibujan su arte reflejado: la colisión del espejo coincide con el dibujo.
     · Mitad baja: sección nueva, determinista, en serpentina (cada fila se recorre casi entera) con piezas por
       tema: tirolesas, vehículos que cruzan huecos, sombrillas, tejas flojas y bandas. Su primera fila es una
       parada intermedia y la meta es la fila más ancha del nivel (arena del jefe).
     Los mapas apaisados (1600 × 450) ya son el doble de anchos: solo crecen hacia abajo.
     Todo se valida con la física real en las tres dificultades (tests/reach.js, tests/v58_*.test.js). */
  // Se puede cargar sin config.js (herramientas y pruebas aisladas): los valores por defecto son los de CONFIG.
  const CV = NS.CONFIG || { player: { h: 62 }, zip: { hang: 6 }, world: { sceneScale: 0.82 } };
  const HAND = (CV.player.h + CV.zip.hang) / CV.world.sceneScale;   // ≈ 83 u de mapa: de los pies a la mano colgada
  const rnd = (v) => Math.round(v);
  const mirrorX = (q, W) => Object.assign({}, q, { x1: W - q.x2, x2: W - q.x1 });

  function emptyMap(id, width, height) {
    return { id, width, height, v58: true, art: [], surfaces: [], stairs: [], movers: [], pigeons: [], bouncers: [], crumbles: [],
      belts: [], planks: [], water: [], gems: [], zips: [], blocks: [] };
  }

  /** Mitad alta: original + espejo unido por el centro (o solo el original si `wide` es falso). */
  function doubleTop(base, wide, painted) {
    const w = base.width, h = base.height, W = wide ? 2 * w : w;
    const o = emptyMap(base.id + '_v58', W, h);
    o.baseId = base.id;
    o.art = wide ? [{ x: 0, y: 0, w, h, flip: false }, { x: w, y: 0, w, h, flip: true }] : [{ x: 0, y: 0, w, h, flip: false }];
    for (const k of ['stairs', 'movers', 'pigeons', 'bouncers', 'crumbles', 'planks']) {
      for (const q of base[k] || []) { o[k].push(Object.assign({}, q)); if (wide) o[k].push(mirrorX(q, W)); }
    }
    for (const q of base.belts || []) { o.belts.push(Object.assign({}, q)); if (wide) o.belts.push(Object.assign(mirrorX(q, W), { speed: -q.speed })); }
    for (const q of base.water || []) {
      o.water.push(Object.assign({}, q, { banks: (q.banks || []).slice() }));
      if (wide) o.water.push(Object.assign(mirrorX(q, W), { banks: (q.banks || []).map((b) => (b === 'left' ? 'right' : 'left')) }));
    }
    for (const g of base.gems) { o.gems.push({ x: g.x, y: g.y }); if (wide) o.gems.push({ x: W - g.x, y: g.y }); }
    // La meta baja a la sección nueva: las salidas originales quedan como cornisas normales; el espejo no tiene parada.
    const L = base.surfaces.map((q) => { const s = Object.assign({}, q); delete s.exit; return s; });
    const R = wide ? base.surfaces.map((q) => { const s = mirrorX(q, W); delete s.exit; delete s.start; delete s.startX; return s; }) : [];
    const used = new Set();
    for (const a of L) {
      const b = wide && a.x2 >= w - 1 ? R.find((r) => !used.has(r) && r.x1 <= w + 1 && Math.abs(r.y - a.y) < 0.5) : null;
      if (!b) { o.surfaces.push(a); continue; }
      used.add(b);
      const m = Object.assign({}, a, { x2: b.x2, joined: true });
      if (!painted && !m.start && m.y > h * 0.85) {
        // Cornisa baja que cruza el centro: se abre al medio para bajar a la sección nueva sin rodear.
        (o.seamGaps = o.seamGaps || []).push({ x1: w - 60, x2: w + 60, y: m.y });
        if (w - 60 - m.x1 >= 50) o.surfaces.push(Object.assign({}, m, { x2: w - 60 }));
        if (m.x2 - (w + 60) >= 50) o.surfaces.push(Object.assign({}, m, { x1: w + 60 }));
      } else o.surfaces.push(m);
    }
    for (const b of R) if (!used.has(b)) o.surfaces.push(b);
    return o;
  }

  /** Filas en serpentina entre yFirst y yExit (la fila de meta o la siguiente sección). dir > 0: se corre a la
      derecha y se baja por el extremo derecho. Cada pieza conserva sólido el extremo de entrada de su fila. */
  function genRows(o, yFirst, yExit, cfg, dir, markMid) {
    const W = o.width, n = Math.max(1, rnd((yExit - yFirst) / 128)), gap = (yExit - yFirst) / n;
    const pieces = cfg.pieces || ['plain'];
    const span = (d) => (d > 0 ? [0, 0.85 * W] : [0.15 * W, W]);
    for (let k = 0; k < n; k++) {
      const yk = rnd(yFirst + k * gap), yn = rnd(yFirst + (k + 1) * gap), last = k === n - 1;
      const [lo, hi] = span(dir), next = last ? [0.06 * W, 0.94 * W] : span(-dir);
      const at = (f) => (dir > 0 ? lo + (hi - lo) * f : hi - (hi - lo) * f);   // fracción del recorrido desde la entrada
      const before = o.surfaces.length;
      const S = (x1, x2, extra) => { const a = Math.min(x1, x2), b = Math.max(x1, x2); if (b - a >= 40) o.surfaces.push(Object.assign({ x1: rnd(a), x2: rnd(b), y: yk, gen: true }, extra || {})); };
      const gem = (x, y) => o.gems.push({ x: rnd(x), y: rnd(y) });
      const walk = (x1, x2, m) => { const a = Math.min(x1, x2) + 30, b = Math.max(x1, x2) - 30; for (let i = 0; i < m; i++) gem(a + (b - a) * (i + 0.5) / m, yk - 36); };
      const piece = pieces[(k + (cfg.offset || 0)) % pieces.length];
      if (piece === 'zip') {
        // Fila más corta; al salir por su extremo Sofía se cuelga sola del cable y baja hasta la entrada de la siguiente.
        const xe = at(0.72);
        S(dir > 0 ? lo : xe, dir > 0 ? xe : hi); walk(dir > 0 ? lo : xe, dir > 0 ? xe : hi, 3);
        const hx = xe - dir * 18, hy = yk - HAND - 3;
        const lx = dir > 0 ? next[1] - 36 : next[0] + 36, ly = yn - HAND + 14;
        o.zips.push({ x1: rnd(hx), y1: rnd(hy), x2: rnd(lx), y2: rnd(ly), look: cfg.zipLook || 'cable' });
        for (const f of [0.3, 0.55, 0.8]) gem(hx + (lx - hx) * f, hy + (ly - hy) * f + 45);
      } else if (piece === 'vehicle') {
        // Hueco que cruza un vehículo en vaivén (también se salta con carrera; si cae, llega a la fila de abajo).
        const gl = Math.min(0.26 * W, 260), c = at(0.45), mw = gl * 0.68, range = gl * 0.26;
        S(dir > 0 ? lo : c + gl / 2, dir > 0 ? c - gl / 2 : hi);
        S(dir > 0 ? c + gl / 2 : lo, dir > 0 ? hi : c - gl / 2);
        o.movers.push({ x1: rnd(c - mw / 2), x2: rnd(c + mw / 2), y: yk, range: rnd(range), vertical: 0, look: cfg.vehicle || 'carrito', speed: 0.95, gen: true });
        walk(lo, c - gl / 2, 2); walk(c + gl / 2, hi, 2); gem(c, yk - 80);
      } else if (piece === 'bounce') {
        // Hueco con sombrilla (o pez/nave en vaivén) un poco más abajo: al caer en ella, Sofía sale disparada.
        const gl = Math.min(0.2 * W, 200), c = at(0.5), bw = gl * 0.55;
        S(dir > 0 ? lo : c + gl / 2, dir > 0 ? c - gl / 2 : hi);
        S(dir > 0 ? c + gl / 2 : lo, dir > 0 ? hi : c - gl / 2);
        const b = { x1: rnd(c - bw / 2), x2: rnd(c + bw / 2), y: yk + 30, look: cfg.bouncer || null, gen: true };
        if (cfg.bounceMoving) o.pigeons.push(Object.assign(b, { range: rnd(gl * 0.12), vertical: 6, speed: 1.1 }));
        else o.bouncers.push(b);
        walk(lo, c - gl / 2, 2); walk(c + gl / 2, hi, 2);
        gem(c, yk - 70); gem(c, yk - 125); gem(c - dir * gl * 0.3, yk - 95);
      } else if (piece === 'crumble' || piece === 'belt') {
        const a = at(0.3), b = at(0.7), m1 = Math.min(a, b), m2 = Math.max(a, b);
        S(lo, m1); S(m2, hi);
        if (piece === 'crumble') {
          const tiles = Math.max(2, Math.floor((m2 - m1 + 8) / 78)), tw = (m2 - m1 - 8 * (tiles - 1)) / tiles;
          for (let i = 0; i < tiles; i++) o.crumbles.push({ x1: rnd(m1 + i * (tw + 8)), x2: rnd(m1 + i * (tw + 8) + tw), y: yk, look: cfg.crumbleLook || null, gen: true });
        } else o.belts.push({ x1: rnd(m1), x2: rnd(m2), y: yk, speed: (k % 2 ? 1 : -1) * dir * 90, gen: true });
        walk(lo, m1, 2); walk(m2, hi, 2); gem((m1 + m2) / 2, yk - 36);
      } else {
        S(lo, hi); walk(lo, hi, 4);
      }
      if (markMid && k === 0) {
        // Parada intermedia en la fila de entrada de la sección nueva.
        const ex = dir > 0 ? lo + 40 : hi - 40;
        const s = o.surfaces.slice(before).find((q) => q.x1 <= ex && q.x2 >= ex);
        if (s) { s.mid = true; s.midX = rnd(ex + dir * 50); }
      }
      dir = -dir;
    }
    return dir;
  }

  /** Mar abierto: agua de lado a lado (flotación neutra), balsas, peces trampolín, pilares de coral y dos desagües
      en el fondo por los que se baja en cascada a la sección siguiente. Devuelve la y bajo el fondo sólido. */
  function genSea(o, y, cfg) {
    const W = o.width, surf = y + 150, depth = cfg.depth || 900, bottom = surf + depth;
    const d1 = 0.25 * W, d2 = 0.75 * W, dw = 46;
    o.water.push({ x1: 0, x2: W, y: surf, depth, kind: 'mar', banks: [], sea: true, boss: !!cfg.boss,
      drains: [{ x1: rnd(d1 - dw), x2: rnd(d1 + dw) }, { x1: rnd(d2 - dw), x2: rnd(d2 + dw) }] });
    o.movers.push({ x1: rnd(0.08 * W), x2: rnd(0.2 * W), y: surf - 3, range: rnd(0.05 * W), vertical: 2, look: 'balsa', speed: 0.7, gen: true });
    o.movers.push({ x1: rnd(0.6 * W), x2: rnd(0.72 * W), y: surf - 3, range: rnd(0.05 * W), vertical: 2, look: 'balsa', speed: 0.8, gen: true });
    o.pigeons.push({ x1: rnd(0.4 * W), x2: rnd(0.47 * W), y: surf - 60, range: 80, vertical: 14, speed: 1.1, look: 'pez', gen: true });
    o.pigeons.push({ x1: rnd(0.86 * W), x2: rnd(0.93 * W), y: surf - 60, range: 50, vertical: 14, speed: 1.3, look: 'pez', gen: true });
    for (const f of [0.1, 0.5, 0.9]) o.blocks.push({ x1: rnd(f * W - 20), x2: rnd(f * W + 20), y1: rnd(bottom - depth * 0.45), y2: bottom, kind: 'coral' });
    for (const dx of [d1, d2]) for (const dd of [0.2, 0.45, 0.7, 0.92]) o.gems.push({ x: rnd(dx), y: rnd(surf + depth * dd) });
    o.gems.push({ x: rnd(0.435 * W), y: rnd(surf - 150) }, { x: rnd(0.895 * W), y: rnd(surf - 150) },
      { x: rnd(0.14 * W), y: rnd(surf - 40) }, { x: rnd(0.66 * W), y: rnd(surf - 40) });
    return bottom + 10;
  }

  /** Fila de meta: la más ancha del nivel (arena del jefe). */
  function finishMap(o, yExit) {
    const W = o.width;
    o.surfaces.push({ x1: rnd(0.06 * W), x2: rnd(0.94 * W), y: rnd(yExit), exit: true, gen: true });
    for (let i = 0; i < 5; i++) o.gems.push({ x: rnd(W * (0.15 + 0.175 * i)), y: rnd(yExit - 36) });
    o.exitX = rnd(W / 2);
    o.height = rnd(yExit + 34);
  }

  function buildV58(base, cfg) {
    const o = doubleTop(base, !cfg.keepWidth, !!cfg.painted);
    if (cfg.text && o.art[1]) o.art[1].text = cfg.text.map((t) => t.slice());
    let yFirst = base.height + 118;
    if (cfg.sea) yFirst = genSea(o, base.height, cfg.sea) + 150;
    const yExit = yFirst + (cfg.rowsHeight || base.height - 152);
    genRows(o, yFirst, yExit, cfg, cfg.startDir || 1, true);
    finishMap(o, yExit);
    return o;
  }

  /* Piezas y aspecto por nivel (vehicle/bouncer/crumbleLook/zipLook son solo arte: la física es la misma). */
  const V58_CFG = {
    // `text`: rótulos del arte pintado (px de la imagen) que se vuelven a dibujar sin reflejar en la copia espejo.
    escuela:              { painted: true, pieces: ['zip', 'plain', 'bounce', 'vehicle'], vehicle: 'carrito', text: [[75, 5, 350, 88], [228, 212, 124, 25], [365, 545, 113, 78]] },
    guadalajara:          { keepWidth: true, pieces: ['vehicle', 'zip', 'bounce'], vehicle: 'camion' },
    escuela_vecina:       { pieces: ['zip', 'crumble', 'vehicle', 'bounce'], vehicle: 'carrito' },
    gdl_noche:            { pieces: ['vehicle', 'zip', 'bounce', 'crumble'], vehicle: 'camion', zipLook: 'cable' },
    azoteas:              { pieces: ['crumble', 'zip', 'bounce', 'zip'], vehicle: 'carrito', zipLook: 'tendedero' },
    escuela_ruinas:       { pieces: ['crumble', 'zip', 'vehicle', 'belt'], vehicle: 'carrito' },
    centro_historico:     { pieces: ['vehicle', 'zip', 'bounce', 'crumble'], vehicle: 'camion' },
    portales:             { painted: true, pieces: ['vehicle', 'zip', 'bounce', 'belt'], vehicle: 'camion' },
    zapopan:              { pieces: ['zip', 'vehicle', 'crumble', 'bounce'], vehicle: 'camion' },
    arcadas:              { pieces: ['belt', 'vehicle', 'zip', 'bounce'], vehicle: 'camion' },
    metro:                { pieces: ['belt', 'vehicle', 'zip', 'belt'], vehicle: 'tren' },
    mercado_tapatio:      { pieces: ['vehicle', 'bounce', 'zip', 'crumble'], vehicle: 'carrito' },
    parque_metropolitano: { pieces: ['zip', 'vehicle', 'bounce', 'zip'], vehicle: 'carrito' },
    tlaquepaque:          { keepWidth: true, pieces: ['bounce', 'zip', 'vehicle'], vehicle: 'carrito' },
    anden_tren_ligero:    { pieces: ['vehicle', 'belt', 'zip', 'bounce'], vehicle: 'tren' },
    plaza_jacarandas:     { pieces: ['zip', 'crumble', 'belt', 'vehicle', 'bounce'], vehicle: 'camion' }
  };
  /* ============ V58.1 · Mar trazado sobre el arte «Marino Parallax PRO V4» ============
     El fondo del mar es una sola ilustración vertical de 971 × 2928 px (isla → mar abierto → ciudad hundida →
     abismo), fija al mundo. Cada plataforma está trazada sobre lo que el dibujo ya muestra (repisas de roca, puente
     de cuerda, cubierta y techo del barco, capiteles, piso de las cuevas, hongos gigantes) y no se dibuja encima;
     lo que no está en el dibujo (barca, manta, pez, cuerda de la tirolesa, brechas) sí se dibuja.
     · Isla (aire): de la cima al mirador, escaleras, puente de cuerda y peldaños hasta la roca grande.
     · Mar abierto: superficie en la línea de espuma de la roca grande; el fondo es el camino de la meseta de la
       casa-piña y sus puentes. Las dos brechas de esos puentes son los desagües por los que se baja.
     · Ciudad hundida y abismo (aire, como el templo de V58): Poseidón, columnas, el barco con su cadena (tirolesa),
       cuevas y arrecifes hasta la salida.
     Coordenadas en px del arte; y = línea de los pies. El mapa usa MARINE_PX unidades por px (× 0,82 en el mundo):
     1,72 u de mundo por px, así mide más del doble que V54 (940 × 3072) a lo ancho y a lo alto. */
  const MARINE_PX = 2.1;
  const MARINE_ART = Object.freeze({
    dir: 'assets/parallax/marino/depth_v4/backgrounds/', width: 971, height: 2928, px: MARINE_PX,
    pages: ['01_marino_base_isla.webp', '02_marino_base_ciudad.webp', '03_marino_base_abismo.webp'], pageH: 976
  });
  const MARINE_TRACE = {
    // [x1, x2, y, opciones]
    surfaces: [
      [135, 600, 270, { start: true, startX: 215 }],   // sendero de la cima y mirador
      [0, 135, 292],      // sendero izquierdo
      [255, 448, 440],    // repisa al pie de la escalera
      [452, 722, 497],    // repisa derecha alta
      [0, 105, 500],      // repisa de las flores
      [182, 482, 638],    // repisa media (entrada del puente de cuerda)
      [706, 950, 668],    // repisa de las palmeras
      [448, 690, 712],    // repisa sobre la cueva
      [112, 212, 718],    // roca de la cascada
      [100, 200, 795],    // repisa baja de la cascada
      [280, 480, 808],    // repisa baja izquierda
      [550, 722, 896],    // peldaños de roca hacia el mar
      [685, 808, 958],
      [770, 932, 1012],
      [616, 696, 1045],   // roca del hongo naranja
      [700, 900, 1073, { mid: true, midX: 760 }],      // roca grande: parada intermedia antes del mar
      [45, 100, 1004],    // rocas de la orilla, junto a la cascada
      [140, 215, 999],
      // Ciudad hundida (bajo el fondo del mar)
      [250, 372, 1770],   // repisa bajo la meseta
      [88, 200, 1800],    // arco en ruinas
      [40, 82, 1845],     // columna rota
      [0, 100, 1962],     // repisa de los peces
      [125, 258, 1966],   // hombro de Poseidón
      [110, 216, 2045],   // pedestal del tridente
      [410, 470, 2050],   // capitel
      [688, 758, 2032],   // proa del barco
      [758, 845, 2055],   // cubierta del barco
      [862, 971, 2022],   // techo de la cabina
      [800, 971, 2136],   // repisa bajo el barco
      [0, 200, 2165],     // repisa alta izquierda
      [200, 300, 2188],   // sendero de piedra
      [300, 420, 2218],
      [470, 570, 2177],   // repisa de la columna
      [592, 760, 2181],   // roca flotante central
      [470, 700, 2310],   // repisa larga
      [228, 296, 2264],   // capitel de la cueva
      [0, 470, 2392],     // piso de la cueva izquierda
      [830, 971, 2334],   // repisa de los corales
      [680, 830, 2386],   // fin de la cadena
      [640, 760, 2434],   // repisa pequeña
      [620, 800, 2515],   // repisa derecha baja
      [800, 971, 2500],   // repisa de los hongos
      [0, 400, 2628],     // repisa del barco hundido
      [400, 500, 2650],   // repisa del cofre
      [298, 490, 2688],   // escalones del arrecife
      [115, 332, 2758],
      [520, 630, 2750],   // roca media
      [722, 900, 2766],   // piso de la cueva derecha
      [540, 792, 2826, { exit: true }],                // arrecife del fondo: salida
      [470, 540, 2848]
    ],
    // Escaleras de piedra de la isla (peldaños: se bajan caminando).
    stairs: [
      [210, 240, 333], [211, 262, 347], [215, 280, 363], [231, 296, 377], [244, 311, 392], [260, 327, 406], [270, 342, 421],
      [427, 485, 727], [411, 470, 742], [399, 460, 756], [389, 450, 769], [376, 442, 782],
      [470, 514, 822], [485, 532, 836], [500, 551, 852], [520, 570, 866], [539, 589, 879]
    ],
    planks: [[482, 545, 650], [545, 655, 664], [655, 708, 656]],   // puente de cuerda (se baja con BAJAR)
    // V58.2 · El mar es TODO lo que queda bajo la isla: del agua junto a la roca grande hasta el lecho marino, donde
    // está la escotilla de rescate (la salida). Solo la isla se camina; lo demás se nada.
    sea: { y: 1155, toStreet: true },
    // Brechas dibujadas en los puentes de la meseta (se bucea a través de ellas).
    breaches: [[262, 312, 1636, 1690], [632, 688, 1664, 1690]],
    // Carriles de nado de peces, tiburones y pulpos: [y, x1, x2] (libres de roca).
    swimLanes: [[1230, 20, 620], [1360, 20, 540], [1470, 220, 560], [1580, 20, 560], [1760, 380, 960], [1900, 280, 680],
      [2060, 480, 960], [2240, 20, 460], [2440, 300, 800], [2560, 20, 620], [2700, 620, 960], [2870, 20, 520]],
    // V58.2: liana para columpiarse en la isla (de la repisa de las flores hacia abajo).
    ropes: [{ x: 131.8, y: 347.9, len: 75.5, look: 'liana' }],
    // Relieve sólido del mar (no se dibuja: es la roca y la meseta pintadas).
    blocks: [
      [700, 900, 1080, 1160], [640, 971, 1160, 1300], [560, 880, 1300, 1440],   // roca grande y su base sumergida
      [0, 205, 1503, 1532],                                                       // repisa del arco
      [200, 262, 1636, 1690], [312, 560, 1636, 1690],                             // meseta de la casa-piña
      [560, 632, 1664, 1690], [688, 760, 1668, 1690],                             // puente de arco (brecha al medio)
      [750, 870, 1668, 1690], [840, 971, 1614, 1640], [870, 971, 1664, 1690]       // repisa del caracol y de los hongos
    ],
    movers: [
      { x1: 300, x2: 382, y: 1152, range: 120, vertical: 2, speed: 0.7, look: 'bote' }      // barca en la superficie
    ],
    zips: [
      { x1: 600, y1: 229, x2: 905, y2: 636, look: 'cuerda' },     // del mirador a las palmeras
      { x1: 472, y1: 767, x2: 720, y2: 1040, look: 'cuerda' }     // de la repisa baja a la roca grande
    ],
    // Estelas de cristales en el mar abierto: puntos de paso y cuántos cristales se reparten a lo largo.
    seaTrails: [
      [[[610, 1190], [520, 1262], [420, 1360], [330, 1480], [287, 1600]], 10],   // de la roca grande a la brecha izquierda
      [[[940, 1470], [860, 1520], [760, 1560], [660, 1625]], 7],                  // bajo la roca, hacia la brecha del puente
      [[[40, 1240], [180, 1290], [320, 1250], [470, 1300], [600, 1262]], 9],      // ola bajo la cascada
      [[[215, 1590], [300, 1500], [385, 1468], [470, 1500], [555, 1590]], 7],     // arco sobre la casa-piña
      [[[30, 1478], [180, 1478]], 3],                                             // sobre la repisa del arco
      [[[70, 1572], [130, 1572]], 2]                                              // dentro del arco
    ],
    exitX: 666
  };
  /** Puntos repartidos a lo largo de una polilínea (por longitud). */
  function alongPath(pts, n) {
    const seg = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
    const out = [];
    for (let k = 0; k < n; k++) {
      let d = n === 1 ? total / 2 : (total * k) / (n - 1), i = 0;
      while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
      const t = seg[i] ? Math.min(1, d / seg[i]) : 0;
      out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
    }
    return out;
  }

  /** Escalones de una escalera pintada: n peldaños de (x1, y1) a (x2, y2) en px del arte, alto ≤ 8 px por peldaño
      (≈ 14 u de mundo: se suben y bajan caminando). */
  function stairRun(x1, y1, x2, y2) {
    const n = Math.max(2, Math.ceil(Math.abs(y2 - y1) / 8)), w = (x2 - x1) / n, out = [];
    for (let i = 0; i < n; i++) {
      const a = x1 + w * i, b = a + w;
      out.push([Math.min(a, b) - 2, Math.max(a, b) + 2, y1 + ((y2 - y1) * (i + 0.5)) / n]);
    }
    return out;
  }

  /** Mundo pintado de una pieza (mar V4, luna V5): el mapa se arma en px del arte (x desde `A.x0`) × `A.px`. */
  function buildPaintedMap(id, T, A) {
    const K = A.px, x0 = A.x0 || 0, cropW = A.cropW || A.width;
    const o = emptyMap(id, rnd(cropW * K), rnd(A.height * K));
    o.worldArt = A;   // el renderer dibuja esta lámina fija al mundo (ver render.js · DEPTH_ART)
    const X = (v) => rnd((v - x0) * K), Y = (v) => rnd(v * K);
    const surf = (q) => Object.assign({ x1: X(q[0]), x2: X(q[1]), y: Y(q[2]) }, q[3] || {});
    o.surfaces = T.surfaces.map((q) => {
      const s = surf(q);
      if (s.startX !== undefined) s.startX = X(s.startX);
      if (s.midX !== undefined) s.midX = X(s.midX);
      return s;
    });
    const stairs = (T.stairs || []).concat(...(T.stairRuns || []).map((r) => stairRun(...r)));
    o.stairs = stairs.map(surf);
    o.planks = (T.planks || []).map((q) => Object.assign(surf(q), { painted: true }));   // pasarelas pintadas
    o.blocks = (T.blocks || []).map((b) => ({ x1: X(b[0]), x2: X(b[1]), y1: Y(b[2]), y2: Y(b[3]), kind: 'roca', draw: false }));
    if (T.sea) {
      // toStreet: el mar baja hasta el lecho (la calle de la meta); world.js fija su fondo ahí. Sin desagües.
      const y2 = T.sea.toStreet ? A.height : T.sea.y2;
      o.water.push({ x1: 0, x2: o.width, y: Y(T.sea.y), depth: Y(y2) - Y(T.sea.y), kind: 'mar', banks: [], sea: true, boss: true,
        drains: (T.sea.drains || []).map((d) => ({ x1: X(d[0]), x2: X(d[1]) })), breach: true, toStreet: !!T.sea.toStreet });
    }
    o.breaches = (T.breaches || []).map((b) => ({ x1: X(b[0]), x2: X(b[1]), y1: Y(b[2]), y2: Y(b[3]) }));
    o.swimLanes = (T.swimLanes || []).map((l) => ({ y: Y(l[0]), x1: X(l[1]), x2: X(l[2]) }));
    // V58.2: cuerdas para columpiarse { x, y (ancla), len } en px del arte.
    o.ropes = (T.ropes || []).map((r) => ({ x: X(r.x), y: Y(r.y), len: rnd(r.len * K), look: r.look || 'cuerda', arc: !!r.arc, base: r.base !== undefined ? Y(r.base) : undefined }));
    const mv = (q) => ({ x1: X(q.x1), x2: X(q.x2), y: Y(q.y), range: rnd(q.range * K), vertical: q.vertical, speed: q.speed, look: q.look });
    o.movers = (T.movers || []).map(mv);
    o.pigeons = (T.pigeons || []).map(mv);
    o.bouncers = (T.bouncers || []).map((q) => ({ x1: X(q[0]), x2: X(q[1]), y: Y(q[2]), look: q[3], painted: true }));
    // Una cadena pintada en el arte (curva) es tirolesa: el cable físico es su recta de mejor ajuste y no se dibuja encima.
    o.zips = (T.zips || []).map((z) => ({ x1: X(z.x1), y1: Y(z.y1), x2: X(z.x2), y2: Y(z.y2), look: z.look, painted: z.look === 'cadena' }));
    // Grietas en la roca pintada (solo dibujo): por ahí se baja de una caverna a la de abajo.
    o.cracks = (T.cracks || []).map((c) => ({ x1: X(c[0]), x2: X(c[1]), y1: Y(c[2]), y2: Y(c[3]) }));
    o.exitX = X(T.exitX);
    // Cristales (px del arte): sobre cada repisa, en el mar abierto, a lo largo de las tirolesas, en brechas y grietas.
    const gems = [];
    const inBlock = (x, y, m) => (T.blocks || []).some((b) => x > b[0] - m && x < b[1] + m && y > b[2] - m && y < b[3] + m);
    for (const q of T.surfaces) {
      const w = q[1] - q[0], n = Math.max(1, Math.min(8, Math.floor(w / 45)));   // un rastro de cristales guía el recorrido
      for (let i = 0; i < n; i++) gems.push([q[0] + (w * (i + 0.5)) / n, q[2] - 22]);
    }
    for (const [pts, n] of T.seaTrails || []) for (const p of alongPath(pts, n)) if (!inBlock(p[0], p[1], 14)) gems.push(p);
    for (const z of T.zips || []) for (const f of [0.25, 0.45, 0.65]) gems.push([z.x1 + (z.x2 - z.x1) * f, z.y1 + (z.y2 - z.y1) * f + 21]);
    if (T.sea) for (const d of T.sea.drains || []) for (const dy of [40, 95]) gems.push([(d[0] + d[1]) / 2, T.sea.y2 + dy]);
    for (const b of T.breaches || []) for (const dy of [-30, 30, 90]) gems.push([(b[0] + b[1]) / 2, b[3] + dy]);
    for (const r of T.ropes || []) {
      // El cuerpo cuelga ~38 u de mundo bajo la mano (≈ 38 / (0,82·px) px) y la mano queda a 0,62 del largo.
      const d = r.len * 0.62, body = 38 / (0.82 * K);
      const angs = r.arc ? [-60, -35, 35, 60] : [0];
      for (const a of angs) { const t = a * Math.PI / 180; gems.push([r.x + d * Math.sin(t), r.y + d * Math.cos(t) + body]); }
    }
    for (const c of T.cracks || []) for (const f of [0.3, 0.7]) gems.push([(c[0] + c[1]) / 2, c[2] + (c[3] - c[2]) * f]);
    for (const q of (T.movers || []).concat(T.pigeons || [])) gems.push([(q.x1 + q.x2) / 2, q.y - 34]);
    for (const g of T.extraGems || []) gems.push(g);
    o.gems = gems.map(([x, y]) => ({ x: X(x), y: Y(y) }));
    return o;
  }
  const SUBMARINO_MAP = buildPaintedMap('submarino', MARINE_TRACE, MARINE_ART);
  const buildMarineMap = () => buildPaintedMap('submarino', MARINE_TRACE, MARINE_ART);

  /* ============ V58.1 · Luna trazada sobre el arte «Espacio Luna Parallax PRO V5» ============
     Ilustración vertical de 1680 × 3072 px en tres páginas (estación y superficie lunar → cavernas de cristal →
     salón del portal → ciudad bajo la Luna). Solo la franja central (x 315–1365 px) es dibujo nítido: los costados
     son extensión desenfocada y quedan fuera del mundo. El nivel se trazó sobre lo dibujado: cubiertas de la estación,
     plataforma de aterrizaje, pasarelas con barandal, repisas de roca, puentes, el estrado del portal y los discos de
     la ciudad. La banda de roca que separa las cavernas de la ciudad se cruza por dos grietas. Gravedad 0,72.
     Coordenadas en px del arte (x de la página completa); y = línea de los pies. */
  const LUNAR_ART = Object.freeze({
    dir: 'assets/parallax/espacial/depth_v5/background/', width: 1680, height: 3072, px: 2.1, x0: 315, cropW: 1050,
    pages: ['page_01.webp', 'page_02.webp', 'page_03.webp'], pageH: 1024
  });
  const LUNAR_TRACE = {
    surfaces: [
      // Estación y superficie lunar
      [330, 515, 160, { start: true, startX: 385 }],   // cubierta alta de la estación
      [315, 640, 300],     // cubierta baja (cajas)
      [600, 705, 325],     // terraza de la antena
      [330, 735, 451],     // cima del acantilado y plataforma con franjas
      [830, 1365, 492],    // plataforma de aterrizaje y base lunar
      [315, 610, 580],     // repisa con barandal
      [600, 960, 645],     // pasarela de los faroles y estandartes
      [1010, 1365, 662],   // suelo bajo los arcos
      [315, 770, 748],     // puerta de la caverna y barrera
      // Entrada de la caverna
      [690, 905, 815],     // puente metálico con franjas
      [950, 1180, 865],    // repisa derecha (escalera)
      [315, 640, 925],     // repisa bajo el tubo
      [315, 600, 1075],    // repisa de las cajas
      [620, 750, 1105],    // pasarela sobre la torre
      [1130, 1365, 1120],  // repisa de los cristales
      [760, 900, 1165],    // puente de la caverna
      // Cavernas de cristal
      [500, 720, 1240],    // repisa de cristales
      [700, 830, 1290],    // roca flotante
      [930, 1100, 1228],   // pasarela de madera
      [1080, 1200, 1255],  // plataforma metálica
      [800, 960, 1315],    // isla flotante
      [1130, 1365, 1340],  // repisa derecha
      [880, 1110, 1405],   // acueducto
      [315, 610, 1490],    // repisa del monolito
      [610, 810, 1500],    // piso de la torre en ruinas
      [820, 960, 1480],    // losa central
      [1240, 1310, 1505],  // casa de la escalera
      // Salón del portal
      [380, 600, 1690],    // repisa de los hongos
      [690, 760, 1765],    // descanso de la escalera
      [315, 500, 1825],    // cristales gigantes
      [700, 860, 1815],    // camino al portal
      [860, 1010, 1800, { mid: true, midX: 900 }],   // estrado del portal: parada intermedia
      [1080, 1300, 1845],  // templo
      [455, 585, 1906],    // balcón dorado
      [840, 1000, 1905],   // pasarelas bajas
      [950, 1150, 1925],
      [1000, 1365, 1960],  // repisa de roca
      // Banda de roca (sólida; dos grietas la cruzan hacia la ciudad)
      [315, 380, 2030],
      [425, 600, 2030],
      [600, 950, 2088],
      [950, 1100, 2045],
      [1150, 1365, 2045],
      // Ciudad bajo la Luna
      [1100, 1240, 2300],  // balcón de la ciudad
      [315, 450, 2310],    // repisa izquierda
      [470, 620, 2420],    // balcón alto
      [315, 500, 2475],    // balcón del barandal
      [860, 1120, 2535],   // gran disco
      [500, 780, 2595],    // plataforma de las cúpulas
      [760, 1130, 2632],   // discos de los arcos
      [1170, 1365, 2650],  // repisa de cristales
      [440, 730, 2700],    // terraza izquierda
      [950, 1270, 2778],   // cúpula baja
      [500, 710, 2845],    // muelle izquierdo
      [315, 470, 2905],    // roca de los cristales
      [960, 1170, 2995],   // borde dorado derecho
      [560, 760, 3025, { exit: true }]                 // borde dorado izquierdo: salida (arena del dron)
    ],
    stairRuns: [
      [940, 1565, 1240, 1505],   // puente inclinado de los hongos
      [600, 1690, 720, 1765],    // escalera del salón
      [1150, 862, 1250, 805]     // escalera de la repisa derecha
    ],
    movers: [
      { x1: 975, x2: 1065, y: 1330, range: 55, vertical: 6, speed: 0.8, look: 'nave' },    // OVNI entre la isla y la repisa
      { x1: 640, x2: 730, y: 2490, range: 70, vertical: 8, speed: 0.75, look: 'nave' }     // OVNI en la ciudad
    ],
    bouncers: [[492, 560, 1642, 'hongo']],   // hongo luminoso pintado del salón
    zips: [
      { x1: 696, y1: 284, x2: 1000, y2: 459, look: 'anclaje' },   // de la estación a la plataforma de aterrizaje
      { x1: 1138, y1: 1300, x2: 905, y2: 1372, look: 'anclaje' }, // de la repisa derecha al acueducto
      { x1: 1180, y1: 2610, x2: 985, y2: 2745, look: 'anclaje' }  // en la ciudad, a la cúpula baja
    ],
    // La banda de roca es sólida (no se dibuja: es el arte) salvo en sus dos grietas, que son pozos hacia la ciudad.
    blocks: [[315, 380, 2032, 2178], [425, 600, 2032, 2178], [600, 950, 2090, 2182], [950, 1100, 2047, 2182], [1150, 1365, 2047, 2178]],
    cracks: [[380, 425, 2030, 2180], [1100, 1150, 2045, 2182]],
    // V58.2: cables para columpiarse (entre repisas) y uno de arco en la superficie lunar (base = piso, px).
    ropes: [
      { x: 890.5, y: 2842.6, len: 75.5, look: 'cable' }, { x: 832.5, y: 2382.7, len: 75.5, look: 'cable' },
      { x: 1034.5, y: 1647.5, len: 75.5, look: 'cable' }, { x: 1114.8, y: 324.6, len: 87.1, look: 'cable', arc: true, base: 491.9 }
    ],
    exitX: 660
  };
  const ESPACIAL_MAP = buildPaintedMap('espacial', LUNAR_TRACE, LUNAR_ART);

  /* ============ V58.1 · Escuela Miguel Hidalgo (paquete «Plataformas alineadas V3») ============
     Tres ilustraciones verticales de la escuela (aulas superiores → patio → conserjería y entrada), una por nivel de la
     misión 1, apiladas. Cada nivel se trazó sobre su dibujo: azotea, balcones de los salones, escaleras, cafetería,
     terrazas, andador techado, patio, banqueta y cancha; la entrada termina en la calle frente al camión escolar.
     Las alturas de las losas salen de las cornisas rojas detectadas en el propio arte. La cafetería y las banquetas
     son tablones (se atraviesan con BAJAR). Los tres miden 2101 u de mapa de ancho (px distinto por lámina) para que
     se apilen sin huecos. Coordenadas en px del arte; y = línea de los pies. */
  const SCHOOL_DIR = 'assets/scenes/school_miguel_hidalgo/';
  const schoolArt = (file, width) => Object.freeze({ dir: SCHOOL_DIR, pages: [file], width, height: 2496, pageH: 2496, px: 2101 / width });
  const SCHOOL_ART = [schoolArt('01_aulas_superiores.webp', 1501), schoolArt('02_patio_escolar.webp', 1476), schoolArt('03_conserjeria_entrada.webp', 1521)];
  const SCHOOL_TRACE = [
    { // 01 · Aulas superiores (tutorial): [0] parada, [2] escaleras, [5] mitad, [7] parte baja (letreros del tutorial).
      surfaces: [
        [605, 745, 194, { start: true, startX: 660 }],   // azotea: techo del cuarto del tinaco
        [0, 450, 142],       // techo del letrero ESCUELA MIGUEL HIDALGO
        [0, 165, 712],       // descanso arriba de la escalera izquierda
        [0, 1380, 334],      // azotea (se baja por la orilla derecha)
        [150, 1501, 525],    // balcón del tercer piso
        [0, 1130, 1205, { mid: true, midX: 200 }],   // terraza frente a los salones
        [300, 1501, 712],    // balcón del segundo piso
        [0, 1350, 2135],     // banqueta de la planta baja
        [150, 1500, 1011],   // techo del bloque de salones
        [1265, 1501, 1365],  // descanso de la escalera derecha
        [0, 1265, 1445],     // andador techado (bancas)
        [900, 1350, 1548],   // techo del edificio junto al domo
        [1270, 1501, 1800],  // muro de piedra con árbol
        [0, 1130, 1905],     // patio bajo el domo
        [120, 1501, 2250, { exit: true }]   // cancha de básquetbol: salida (arena del jefe)
      ],
      planks: [[470, 1501, 925]],   // cafetería
      ropes: [{ x: 914.8, y: 83.6, len: 130.7, look: 'columpio', arc: true, base: 334.6 }],   // V58.2: columpio en la azotea
      stairRuns: [[165, 712, 470, 925], [1130, 1205, 1265, 1365], [1135, 1815, 1315, 2105]],
      zips: [{ x1: 918, y1: 1486, x2: 300, y2: 1860, look: 'tendedero' }],
      exitX: 800
    },
    { // 02 · Patio escolar
      surfaces: [
        [0, 580, 302, { start: true, startX: 140 }],   // azotea (lado izquierdo)
        [585, 760, 202],     // techo del tinaco
        [0, 130, 700],       // descanso arriba de la escalera izquierda
        [580, 1350, 335],    // azotea (lado derecho)
        [150, 760, 513],     // balcón del tercer piso (izquierda)
        [760, 1476, 530],    // balcón del tercer piso (derecha)
        [380, 1476, 704],    // balcón del segundo piso
        [0, 1260, 1000],     // techo del bloque de salones
        [1380, 1476, 1170],  // descanso de la escalera derecha
        [40, 1380, 1268, { mid: true, midX: 200 }],   // andador techado
        [0, 1300, 1470],     // patio de juegos (rayuela, resbaladilla)
        [1250, 1476, 1650],  // descanso junto al domo
        [0, 1310, 1976],     // patio bajo el domo
        [0, 1400, 2255],     // banqueta de la planta baja
        [150, 1476, 2390, { exit: true }]   // cancha: salida
      ],
      planks: [[390, 1476, 885]],   // cafetería
      ropes: [{ x: 931.5, y: 88.2, len: 128.5, look: 'columpio', arc: true, base: 335 },        // V58.2: columpios del patio
        { x: 322.8, y: 1021.2, len: 128.5, look: 'columpio', arc: true, base: 1268 }, { x: 282.7, y: 2008.2, len: 128.5, look: 'columpio', arc: true, base: 2254.9 }],
      stairRuns: [[130, 700, 390, 885], [1260, 1000, 1400, 1165]],
      zips: [{ x1: 1268, y1: 1588, x2: 300, y2: 1927, look: 'tendedero' }],
      exitX: 800
    },
    { // 03 · Conserjería y entrada (la misión termina en la calle frente al camión escolar)
      surfaces: [
        [0, 1400, 283, { start: true, startX: 100 }],   // azotea
        [150, 450, 129],     // techo del letrero
        [600, 750, 171],     // techo del tinaco
        [130, 1521, 435],    // balcón del tercer piso
        [0, 150, 572],       // descanso arriba de la escalera izquierda
        [0, 1030, 930, { mid: true, midX: 120 }],   // terraza frente a los salones
        [380, 1400, 572],    // balcón del segundo piso
        [150, 1350, 807],    // techo del bloque de salones
        [1150, 1521, 1050],  // descanso de la escalera derecha
        [150, 1150, 1100],   // andador techado
        [900, 1350, 1199],   // jardineras de la derecha
        [0, 900, 1345],      // patio bajo el domo
        [0, 1400, 1700],     // cancha
        [900, 1450, 1898],   // techo de la conserjería
        [0, 1400, 2400, { exit: true }]   // calle frente a la escuela y el camión escolar: salida
      ],
      planks: [[450, 1400, 720], [0, 1100, 1610], [0, 1521, 2190]],   // cafetería, banqueta y acera de la entrada
      stairRuns: [[150, 572, 450, 720], [1030, 930, 1150, 1050]],
      zips: [{ x1: 882, y1: 1836, x2: 100, y2: 2351, look: 'tendedero' }],
      exitX: 700
    }
  ];
  const SCHOOL_MAPS = SCHOOL_TRACE.map((T, i) => buildPaintedMap(['escuela', 'escuela_vecina', 'escuela_ruinas'][i] + '_mh', T, SCHOOL_ART[i]));

  /* Cada tramo declara qué enemigos y obstáculos puede usar y con qué intensidad.
     La colocación concreta es determinista (semilla por tramo) y se valida con pruebas de alcanzabilidad.
     art: 'painted' → el fondo trae pintadas las cornisas (no se dibujan encima).
     skin: textura de las plataformas (assets/platforms/<skin>.png).  bg: fondo procedural cuando no hay archivo. */
  const LEVEL_SEQUENCE = [
    {
      id: 'escuela', label: 'LA ESCUELA', file: 'assets/scenes/school_miguel_hidalgo/01_aulas_superiores.webp', map: SCHOOL_MAP, art: 'painted', stairsPainted: true, skin: 'concrete',
      tint: 0xffffff, wash: 0x244a4b, shade: 0.035, theme: 'escuela', room: 'sotano',
      foes: ['rat'], obstacles: ['crate', 'spikes'], foeBudget: 3, obstacleBudget: 2, sideFoes: 1,
      boss: { kind: 'dog', name: 'PERRO FURIOSO', hp: 4 },
      tutorial: true, music: 0
    },
    {
      // V58.1 · «Guadalajara Azoteas PRO V2»: fondo nuevo + capa de cornisas dibujadas EXACTAMENTE en las colisiones de este mapa.
      id: 'guadalajara', label: 'EL CENTRO DE GUADALAJARA', file: 'assets/scenes/guadalajara_pro_v2/bg_guadalajara_pro_v2.webp', overlay: 'assets/scenes/guadalajara_pro_v2/architecture_guadalajara_pro_v2.png',
      map: SOFEVI_MAP, art: 'painted', stairsPainted: true, ledges2d: true, skin: 'stone_long',
      tint: 0xffffff, wash: 0x805633, shade: 0.045, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['rat', 'dog', 'pigeon'], obstacles: ['pot', 'puddle', 'crate'], foeBudget: 5, obstacleBudget: 3, sideFoes: 2,
      boss: { kind: 'kid', name: 'DUEÑO DEL PERRO · 12 AÑOS', hp: 4 }, music: 1
    },
    {
      id: 'escuela_vecina', label: 'EL PATIO DE LA SECUNDARIA', file: 'assets/scenes/school_miguel_hidalgo/02_patio_escolar.webp', map: PATIO_MAP, skin: 'concrete',
      tint: 0xcdd8db, wash: 0x52664d, shade: 0.075, theme: 'escuela', room: 'sotano',
      foes: ['rat', 'kid', 'dog', 'chile'], obstacles: ['spark', 'spikes', 'crate', 'pot'], foeBudget: 6, obstacleBudget: 4, sideFoes: 2,   // V58.2: + el niño de las piedras
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
      id: 'escuela_ruinas', label: 'PASILLOS DE LA ESCUELA BAJO LA LLUVIA', file: 'assets/scenes/school_miguel_hidalgo/03_conserjeria_entrada.webp', map: PASILLOS_MAP, skin: 'concrete',
      tint: 0xaabda6, wash: 0x304b36, shade: 0.19, theme: 'escuela', room: 'sotano',
      foes: ['bat', 'kid', 'chile', 'dog', 'rat'], obstacles: ['spikes', 'spark', 'crate', 'puddle'], foeBudget: 7, obstacleBudget: 5, sideFoes: 3,   // V58.2: + el niño
      boss: { kind: 'bravo', name: 'PERRO GUARDIÁN', hp: 5 }, music: 5
    },
    {
      id: 'centro_historico', label: 'CENTRO HISTÓRICO DE GUADALAJARA', file: 'assets/scenes/guadalajara_pro_v2/bg_centro_historico_pro_v2.webp', overlay: 'assets/scenes/guadalajara_pro_v2/architecture_centro_historico_pro_v2.png',
      map: CATEDRAL_MAP, art: 'painted', stairsPainted: true, skin: 'stone_rocks',
      tint: 0xc1a98d, wash: 0x513b2f, shade: 0.12, theme: 'guadalajara', room: 'alcantarilla',
      foes: ['dog', 'pigeon', 'bat', 'chile'], obstacles: ['pot', 'spark', 'crate', 'puddle'], foeBudget: 8, obstacleBudget: 5, sideFoes: 3,
      boss: { kind: 'pigeon', name: 'PALOMA JEFA', hp: 4 }, music: 6
    },
    {
      id: 'portales', label: 'GUADALAJARA, JALISCO · LOS PORTALES', file: 'assets/scenes/guadalajara_pro_v2/bg_portales_pro_v2.webp', overlay: 'assets/scenes/guadalajara_pro_v2/architecture_portales_pro_v2.png',
      map: GDL_MAP, art: 'painted', skin: 'stone_moss', isNew: true,
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

  /* V58 · Cada nivel de las misiones 1 y 2 usa su versión al doble. El mapa original queda en `baseMap`.
     Con el cuádruple de área se reparten más enemigos y obstáculos (la colocación sigue siendo determinista). */
  LEVEL_SEQUENCE.forEach((d) => {
    const cfg = V58_CFG[d.id];
    if (!cfg) throw new Error('nivel sin configuración V58: ' + d.id);
    d.baseMap = d.map;
    const school = ['escuela', 'escuela_vecina', 'escuela_ruinas'].indexOf(d.id);
    if (school >= 0) {
      // V58.1: trazados sobre el arte de la Escuela Miguel Hidalgo (ver SCHOOL_TRACE).
      d.map = SCHOOL_MAPS[school]; d.file = SCHOOL_DIR + SCHOOL_ART[school].pages[0];
      d.art = 'painted'; d.stairsPainted = true; d.sideWidth = 0;
      // Sin sectores laterales: sus enemigos pasan al recorrido del nivel (si no, la misión quedaría con menos).
      d.foeBudget += d.sideFoes; d.sideFoes = 0;
    } else d.map = buildV58(d.map, cfg);
    d.foeBudget = Math.round(d.foeBudget * 1.7);
    d.obstacleBudget = Math.round(d.obstacleBudget * 1.6);
    d.sideFoes = Math.round(d.sideFoes * 1.4);
  });

  /* Niveles nuevos (misiones 3 y 4). storyIndex 16/17: su capítulo y letrero están en story.js. */
  /* V58 · Mar y órbita son mundos completos trazados de borde a borde (sideWidth 0: sin sectores procedurales).
     En el mar el tiburón patrulla el mar abierto; en órbita la gravedad es menor (saltos más largos y altos). */
  // V58.1: `art: 'painted'` — las repisas, escaleras y hongos están dibujados en el arte marino V4 (no se dibujan encima).
  const SUBMARINO_LEVEL = {
    id: 'submarino', label: 'RUINAS SUMERGIDAS', file: 'assets/parallax/marino/depth_v4/backgrounds/01_marino_base_isla.webp', map: SUBMARINO_MAP, skin: 'stone_moss', isNew: true,
    art: 'painted', stairsPainted: true,
    tint: 0x9fd8e6, wash: 0x0a2e48, shade: 0.12, theme: 'submarino', room: 'alcantarilla', storyIndex: 16, sideWidth: 0,
    // Pirañas solo en el agua; cangrejos en las cornisas secas de las ruinas.
    // V58.1: el niño gordito de las piedras, con traje de buzo (atlas aportado), en las repisas secas.
    // V58.2: mar completo. Pirañas, tiburones y pulpos nadan en sus carriles (topes 6/2/4); cangrejos y niños buzos
    // en las repisas (secas o sumergidas). El jefe es Poseidón, que custodia la escotilla del lecho marino.
    foes: ['crab', 'piranha', 'kid', 'pulpo', 'shark', 'crab', 'piranha', 'kid', 'pulpo', 'piranha'], obstacles: ['spark', 'crate'], foeBudget: 40, obstacleBudget: 8, sideFoes: 0,
    boss: { kind: 'poseidon', name: 'POSEIDÓN, REY DEL MAR', hp: 8 }, music: 12
  };
  const ESPACIAL_LEVEL = {
    id: 'espacial', label: 'LUNA HUECA', file: 'assets/parallax/espacial/depth_v5/background/page_01.webp', map: ESPACIAL_MAP, skin: 'scaffold', isNew: true,
    art: 'painted', stairsPainted: true,
    tint: 0xc3c9ee, wash: 0x0b0a28, shade: 0.08, theme: 'espacial', room: 'alcantarilla', storyIndex: 17, sideWidth: 0, gravity: 0.72,
    // Drones de disparo anunciado y robots que embisten.
    // V58.1: el niño gordito de las piedras, con traje de astronauta (atlas aportado).
    foes: ['drone', 'robot', 'kid', 'drone', 'robot'], obstacles: ['spark', 'crate'], foeBudget: 30, obstacleBudget: 10, sideFoes: 0,
    boss: { kind: 'drone', name: 'DRON CENTINELA', hp: 7 }, final: true, music: 15
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
    SUBMARINO_MAP, ESPACIAL_MAP, SUBMARINO_V54_MAP, ESPACIAL_V54_MAP, SUBMARINO_BASE_MAP, ESPACIAL_BASE_MAP,
    SUBMARINO_LEVEL, ESPACIAL_LEVEL, MISSIONS, LEVEL_SEQUENCE, mirror, buildV58, V58_CFG, HAND,
    MARINE_ART, MARINE_PX, buildMarineMap, LUNAR_ART, buildPaintedMap, SCHOOL_ART, SCHOOL_MAPS };
})(typeof globalThis !== 'undefined' ? globalThis : window);
