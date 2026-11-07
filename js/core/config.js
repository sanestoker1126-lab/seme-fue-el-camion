/* ¡Se me fue el camión! — parámetros de juego centralizados.
   Unidades: 1 unidad de mundo ≈ 1 px CSS con zoom 1. Velocidades en u/s, aceleraciones en u/s²,
   tiempos en segundos. Las alturas útiles se documentan para que el diseño de niveles sea verificable. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};

  NS.CONFIG = {
    version: '53.0.0',
    build: 'v53-mundos',

    sim: {
      fixedDt: 1 / 60,      // paso fijo de simulación (60 Hz), independiente de la tasa de refresco
      maxSteps: 5,          // pasos máximos por fotograma; evita la "espiral de la muerte" tras un tirón
      maxFrameDt: 0.1       // un fotograma más largo (pestaña dormida, GC) se recorta
    },

    world: {
      sceneScale: 0.82,     // escala fija de los fondos pintados: misma física en retrato y paisaje
      sideWidth: 560,       // ancho de cada sector lateral junto al panel pintado
      wallThickness: 80,    // grosor de los muros exteriores del mundo
      streetDrop: 110,      // distancia desde el final del tramo 8 hasta la calle de la terminal
      streetDepth: 220,     // profundidad visible bajo la calle
      viewMinW: 360,        // la cámara siempre muestra al menos este ancho de mundo...
      viewMinH: 600,        // ...y este alto, para ver lo que hay debajo durante el descenso
      viewMinHLandscape: 470, // en paisaje (alto de pantalla escaso) se acepta ver algo menos de alto para que Sofía no se vea diminuta
      zoomMin: 0.5,
      zoomMax: 2.2,
      roomW: 760,
      roomH: 400,
      roomOriginX: 2600,    // las zonas inferiores viven lejos del mundo principal
      roomSpacing: 1000
    },

    player: {
      w: 32, h: 62,         // caja de colisión (pushbox); el sprite mide ~64 u de alto
      hurtScaleX: 0.72,     // hurtbox algo más estrecha que la pushbox: los roces no castigan
      hurtScaleY: 0.86,
      footFactor: 0.42      // fracción del ancho que debe pisar la plataforma para apoyarse
    },

    phys: {
      gravity: 1480,        // caída ligeramente más firme para evitar flotación en los nuevos tramos
      apexBand: 110,        // |vy| por debajo de este valor = cerca del vértice del salto
      apexGravityMul: 0.63, // vértice suave pero con respuesta rápida al soltar SALTAR
      fallGravityMul: 1.34, // caída más rápida que la subida, sin suspender a Sofía
      jumpCutMul: 2.4,      // soltar SALTAR mientras sube corta el salto (salto variable)
      fallMax: 980,         // velocidad terminal (16,3 u por paso: menor que cualquier grosor sólido)
      move: 365,             // velocidad lateral ajustada para cruzar ocho tramos en móvil
      groundAccel: 4.5,     // multiplicadores de move por segundo
      airAccel: 3.4,
      turnBoost: 1.6,       // girar en sentido contrario frena antes
      groundFriction: 0.001,// retención de velocidad por segundo sin entrada (en suelo)
      airFriction: 0.12,
      slipFriction: 0.35,   // charco: casi no frena
      slipAccel: 0.38,      // charco: cuesta arrancar y girar
      jump: -620,           // salto completo ≈ 135 u, toque corto ≈ 55 u
      coyote: 0.11,
      jumpBuffer: 0.13,
      dashSpeed: 740,
      dashTime: 0.16,       // ≈ 115 u de recorrido
      dashCooldown: 0.6,
      airDashes: 1,         // un dash por salto; se recarga al aterrizar
      dropTime: 0.2,        // ventana en la que se ignoran peldaños y tarimas tras pulsar BAJAR
      dropKick: 120,
      stepMax: 18,          // altura máxima que la asistencia de escalón sube o baja caminando
      bounceVy: -820,       // toldo rebotador
      bounceHeldVy: -960,
      stompVy: -380,
      stompHeldVy: -540
    },

    fall: {
      hard: 400,            // caída dura: aturde 0,28 s y rompe el combo
      hardStun: 0.28,
      damage: 640,          // caída peligrosa: quita un corazón (≈ 4,5 pisos)
      perfectMinFall: 90
    },

    combat: {
      invuln: 1.2,
      shieldInvuln: 0.9,
      knockX: 230,          // el retroceso se calcula desde la FUENTE del daño, no desde la mirada
      knockY: -300,
      stompWindow: 12,      // tolerancia vertical para considerar un pisotón
      enemyHitCooldown: 0.25,
      dashKillWindow: true
    },

    scoring: {
      gem: 10, foe: 50, boss: 400, perfect: 25, item: 200, key: 50, crate: 15, shotBreak: 10,
      comboTime: 3.4, comboStep: 3, comboMaxMult: 5
    },

    powers: { magnetTime: 8, magnetRadius: 170, magnetSpeed: 260 },

    crumble: { shake: 0.5, respawn: 2.8 },   // teja floja: tiempo de aviso y de reaparición (s)
    // V52 · Agua. Profunda (≥ shallowDepth): se nada; baja: se camina más lento salpicando.
    water: {
      shallowDepth: 70,     // u de profundidad: menos que esto es agua baja (Sofía mide 62)
      swimMove: 215,        // velocidad horizontal nadando
      swimAccel: 950,
      floatOffset: 0.08,    // al flotar, el centro de Sofía queda 8 % de su altura bajo la superficie (cabeza y hombros fuera)
      buoyK: 30,            // resorte de flotación hacia la superficie
      buoyDamp: 5,
      diveAccel: 950, diveMax: 240,
      riseAccel: 1000, riseMax: 270,
      stroke: 300,          // brazada (SALTAR bajo el agua)
      strokeCD: 0.3,
      exitJump: 1.0,        // SALTAR en la superficie: salto completo para salir
      dashV: 440, dashT: 0.28,
      entryDamp: 0.3,       // al caer al agua la velocidad vertical se amortigua (no hay daño por caída)
      climbUp: 30,          // altura de orilla que se sube sola nadando hacia ella
      wadeMul: 0.68,        // agua baja: velocidad de carrera
      wadeJump: 0.92
    },

    difficulty: {
      facil:   { label: 'FÁCIL',   lives: 4, foeSpeed: 0.8,  foeDensity: 0.7,  shotSpeed: 0.8,  reaction: 1.35, fallDamage: 820, invulnMul: 1.25 },
      normal:  { label: 'NORMAL',  lives: 3, foeSpeed: 1.0,  foeDensity: 1.0,  shotSpeed: 1.0,  reaction: 1.0,  fallDamage: 640, invulnMul: 1.0 },
      dificil: { label: 'DIFÍCIL', lives: 2, foeSpeed: 1.25, foeDensity: 1.35, shotSpeed: 1.2,  reaction: 0.8,  fallDamage: 560, invulnMul: 0.85 }
    },

    camera: { easeX: 4.6, easeY: 3.35, lookAheadVx: 0.24, focusY: 0.42, leadVy: 0.105 }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
