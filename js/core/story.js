/* ¡Se me fue el camión! — historia y textos narrativos.
   Todo el texto vive aquí para poder revisarlo, traducirlo o ampliarlo sin tocar la lógica. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};

  const INTRO = [
    {
      tag: 'VIERNES · 6:52 P. M.',
      title: 'LA POSADA SE ALARGÓ',
      text: 'La posada de la escuela terminó tarde. Sofía subió a la azotea por su mochila y, desde arriba, vio la parada vacía. Luna y Morita la esperaban junto a la puerta.'
    },
    {
      tag: 'RUTA 6 · ÚLTIMA SALIDA',
      title: '¡SE ME FUE EL CAMIÓN!',
      text: 'El último camión de la ruta 6 ya dobló la esquina. Cruzará el centro de Guadalajara y esperará cinco minutos en la terminal de las Arcadas.'
    },
    {
      tag: 'EL PLAN',
      title: 'BAJAR POR DONDE SEA',
      text: 'Por la escalera no llega. Tiene que bajar por balcones, techos y callejones, cortar camino por sótanos y alcantarillas, y alcanzar el camión antes de que arranque. Sus dos gatitas conocen cada rincón de la escuela.'
    },
    {
      tag: 'POR EL CAMINO',
      title: 'LO QUE SE LE CAYÓ',
      text: 'En la carrera se le salieron seis cosas de la mochila. Puede recuperarlas en las zonas escondidas... si se atreve a desviarse.'
    }
  ];

  /* Un capítulo por tramo. `line` aparece al entrar; `driver` es lo que se oye del camión a lo lejos. */
  const CHAPTERS = [
    { title: 'LA ESCUELA', line: 'Baja por los balcones antes de que el conserje cierre el portón.', driver: 'A lo lejos: ¡Ruta 6, ya nos vamos!' },
    { title: 'EL CENTRO DE GUADALAJARA', line: 'El camión dobló hacia el centro. Los balcones coloniales son el atajo.', driver: 'Se oye el claxon en la avenida. Todavía hay tiempo.' },
    { title: 'LA SECUNDARIA VECINA', line: 'Un atajo por la secundaria de al lado. Aquí los perros no conocen a Sofía.', driver: 'El camión se detuvo en el semáforo. ¡Más rápido!' },
    { title: 'CALLES BAJAS DE JALISCO', line: 'Ya oscureció. Los cables chispean y las palomas no duermen.', driver: '¡Ahí va! Dobló hacia las Arcadas.' },
    { title: 'AZOTEAS DE LA COLONIA', line: 'Por la calle no llega: cruza de azotea en azotea. Ojo, las tejas viejas se desmoronan.', driver: 'Desde arriba se alcanza a ver el camión en el semáforo.' },
    { title: 'LA ESCUELA ABANDONADA', line: 'La escuela vieja está cerrada desde hace años. Nadie la ha cruzado de noche.', driver: 'Se ve la luz de la terminal al fondo.' },
    { title: 'CENTRO HISTÓRICO', line: 'Las torres de la Catedral aparecen entre las azoteas. Cruza los portales antes del cierre.', driver: 'El camión avanza por la avenida. ¡No pierdas el paso!' },
    { title: 'LOS PORTALES', line: 'Los portales siguen iluminados y el kiosco brilla. Alguien conocido la está esperando…', driver: 'El camión rodea la plaza. ¡Por los portales es más corto!' },
    { title: 'ZAPOPAN · PLAZA DE LAS AMÉRICAS', line: 'La ruta corta por Zapopan. La Basílica está iluminada y las gatitas conocen el camino.', driver: 'El motor espera al otro lado de la plaza.' },
    { title: 'LAS ARCADAS DE CANTERA', line: 'La terminal está abajo. El chofer ya encendió el motor.', driver: '¡Último aviso para la ruta 6!' },
    { title: 'LÍNEA 3 · ESTACIÓN SUBTERRÁNEA', line: 'Atajo bajo tierra. Las bandas eléctricas te llevan… a donde ellas quieren.', driver: 'Arriba retumba la avenida: el camión todavía no arranca.' },
    { title: 'MERCADO TAPATÍO', line: 'El mercado despierta con el amanecer; los puestos ya están abriendo.', driver: '¡La ruta 6 salió de la terminal!' },
    { title: 'PARQUE METROPOLITANO', line: 'Cruza el parque al atardecer: el camión sigue rumbo a casa.', driver: '¡Última vuelta antes del anochecer!' },
    { title: 'TLAQUEPAQUE', line: 'Sombrillas de colores cuelgan sobre el callejón. ¡Rebota en ellas para cruzar!', driver: 'El chofer se detuvo por un café de olla. ¡Aprovecha!' },
    { title: 'ANDÉN DEL TREN LIGERO', line: 'El tren se va; Sofía usa el andén como atajo hacia la ruta 6.', driver: '¡La terminal está muy cerca!' },
    { title: 'PLAZA DE LAS JACARANDAS', line: 'El último guardián espera en la plaza. Después, solo queda llegar a la terminal.', driver: '¡Corre, el camión está por arrancar!' },
    // V53 · Misiones nuevas (16 submarino, 17 espacial).
    { title: 'RUINAS SUMERGIDAS', line: 'El atajo se hundió: cruza las ruinas y bucea por los cristales del fondo.', driver: 'Burbujas y un claxon lejano bajo el agua…' },
    { title: 'ESTACIÓN EN ÓRBITA', line: 'Ni el espacio la detiene: salta entre asteroides hasta el módulo de salida.', driver: 'La estación avisa: último acople de la ruta 6.' }
  ];

  /* Objetos perdidos: uno por tramo, en su zona inferior. */
  const ITEMS = [
    { id: 'credencial', name: 'CREDENCIAL ESCOLAR', text: 'Sin ella no la dejan entrar el lunes.' },
    { id: 'tarjeta', name: 'TARJETA DEL CAMIÓN', text: 'Con saldo para toda la semana. ¡Uf!' },
    { id: 'cuaderno', name: 'CUADERNO DE DIBUJO', text: 'Tiene todos los bocetos del mural de la posada.' },
    { id: 'audifonos', name: 'AUDÍFONOS', text: 'Todavía suena la playlist del camino a casa.' },
    { id: 'sueter', name: 'SUÉTER DE LA POSADA', text: 'Con renos bordados. Lo tejió su abuela.' },
    { id: 'llavero', name: 'LLAVERO DE LA CASA', text: 'Sin esto, llegar a casa tampoco serviría de mucho.' }
  ];

  /* Letreros del mundo. Los del tramo 1 enseñan los controles sin detener la partida. */
  const SIGNS = {
    tutorial: [
      { at: 'start', text: 'MANTÉN SALTAR PARA SALTAR MÁS ALTO; SUÉLTALO PARA UN SALTITO.' },
      { at: 'stairs', text: 'BAJAR ATRAVIESA PELDAÑOS Y TARIMAS. LAS CORNISAS DE PIEDRA NO.' },
      { at: 'mid', text: 'DASH (✦) ROMPE CAJAS Y DERROTA RATAS. TAMBIÉN EN EL AIRE, UNA VEZ POR SALTO.' },
      { at: 'low', text: 'CAER DE MUY ALTO DUELE. SIGUE EL ANILLO VERDE: MARCA DÓNDE VAS A CAER.' },
      { at: 'side', text: 'LAS TRAMPILLAS (↓) LLEVAN A ZONAS ESCONDIDAS. PULSA BAJAR ENCIMA.' }
    ],
    story: [
      'AVISO: EL PORTÓN SE CIERRA A LAS 7:00.',
      'RUTA 6 → ARCADAS DE CANTERA. ÚLTIMA SALIDA 7:15.',
      'SE BUSCA PERRO BLANCO. NO MUERDE (CASI).',
      'PELIGRO: CABLES CON CORRIENTE. ESPERA A QUE SE APAGUEN.',
      'TEJAS FLOJAS: NO TE QUEDES PARADA ENCIMA. SALTA ANTES DE QUE SE CAIGAN.',
      'ESCUELA CLAUSURADA. PROHIBIDO EL PASO (¿Y POR LOS TECHOS?).',
      'CENTRO HISTÓRICO: LOS PORTALES GUARDAN EL ATAJO.',
      'GUADALAJARA, JALISCO: EL KIOSCO MARCA LA MITAD DEL CAMINO.',
      'ZAPOPAN: LA BASÍLICA MARCA EL CAMINO A CASA.',
      'TERMINAL ARCADAS: ¡AQUÍ ESPERA LA RUTA 6!',
      'BANDAS EN MOVIMIENTO: CORRE A FAVOR O SALTA A TIEMPO.',
      'MERCADO: ¡CUIDADO CON LOS PUESTOS Y LOS CARRITOS!',
      'PARQUE: SIGUE EL SENDERO HASTA LA SALIDA.',
      'TLAQUEPAQUE: LAS SOMBRILLAS AGUANTAN (CASI) TODO. ¡REBOTA!',
      'ANDÉN: CRUZA LOS NIVELES PARA ALCANZAR LA SALIDA.',
      'PLAZA FINAL: VENCE AL GUARDIÁN Y SIGUE AL CAMIÓN.',
      'FONDO MARINO: USA ↓ PARA BUCEAR. LAS PIRAÑAS ATACAN SOLO EN AGUA Y AVISAN ANTES.',
      'ESTACIÓN ORBITAL: LOS DRONES MARCAN SU DISPARO; ESQUIVA O ROMPE EL PLASMA CON DASH.'
    ]
  };

  const MESSAGES = {
    keyGot: 'LLAVE DEL CONSERJE: ABRE UNA REJA DE ESTE TRAMO',
    gateLocked: 'REJA CERRADA · LA LLAVE ESTÁ EN LA ZONA ESCONDIDA',
    gateOpen: '¡REJA ABIERTA!',
    checkpoint: 'PARADA ALCANZADA · AQUÍ REAPARECES',
    roomEnter: { sotano: 'SÓTANO DE LA ESCUELA', alcantarilla: 'ALCANTARILLA DEL CENTRO' },
    roomExit: 'SALIDA AL CALLEJÓN',
    dropDenied: 'LA PIEDRA NO SE ATRAVIESA · BUSCA UN BORDE O UN PELDAÑO',
    hardLanding: '¡CAÍDA DURA!',
    fallHurt: '¡AUCH! CAÍDA DEMASIADO ALTA',
    shieldBroken: '¡ESCUDO ROTO!',
    busWaiting: '¡AHÍ ESTÁ EL CAMIÓN! ¡CORRE A LA PUERTA!',
    bossDefeated: '¡JEFE DERROTADO!'
  };

  /** Final según objetos recuperados (0–6) y vidas restantes. */
  function ending(itemsFound, total, livesLeft) {
    if (itemsFound >= total) {
      return {
        title: '¡LLEGASTE<br><span>CON TODO!</span>',
        text: 'Sofía sube al camión con la mochila completa. Luna y Morita se acomodan a sus pies y el chofer sonríe: “Te esperé un minuto más, eh”. La credencial, la tarjeta, el cuaderno, los audífonos, el suéter y las llaves: nada se quedó atrás.'
      };
    }
    if (itemsFound >= Math.ceil(total / 2)) {
      return {
        title: '¡LLEGASTE<br><span>AL CAMIÓN!</span>',
        text: 'Sofía se deja caer en el último asiento, sin aliento. Luna y Morita ronronean junto a ella. Faltan algunas cosas en la mochila, pero mañana puede volver a buscarlas con luz de día.'
      };
    }
    return {
      title: '¡JUSTO<br><span>A TIEMPO!</span>',
      text: livesLeft <= 1
        ? 'Raspada, despeinada y con la mochila casi vacía, Sofía alcanza la puerta en el último segundo. Luna y Morita saltan detrás de ella. Lo importante es que van a casa.'
        : 'La puerta se cierra detrás de Sofía. Luna y Morita se asoman por la ventana. Casi todo lo que se le cayó sigue allá arriba, escondido en sótanos y alcantarillas.'
    };
  }

  NS.STORY = { INTRO, CHAPTERS, ITEMS, SIGNS, MESSAGES, ending };
})(typeof globalThis !== 'undefined' ? globalThis : window);
