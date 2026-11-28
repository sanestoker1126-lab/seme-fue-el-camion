# V58.8.24 · La Calzada y misiones por tramo

Base: V58.8.23 · Santuario de Poseidón (importada sin cambios en `45a9047`).

## 1. Misión especial · La Calzada (persecución en vehículo)

Va entre la misión 2 (Guadalajara) y la 3 (el submarino). Ganar Guadalajara abre la Calzada y ganar la Calzada abre
el submarino. En el menú aparece como una tarjeta ★ entre M2 y M3, con sus cinco tramos seleccionables.

- **Historia.** Sofía alcanza la Ruta 6 en la Plaza de las Jacarandas. En el retén de la Calzada Olímpica, que
  Doña Tóxica describe en el prólogo como «un hervidero de patrullas», el chofer huye y Sofía toma el volante.
  Al final el camión salta la barranca y cae a la presa, y la corriente la lleva a la isla donde empieza la
  misión 3 («¿Dónde estoy?»).
- **Juego** (`js/core/chase.js`, determinista):
  - Vista lateral de tres carriles: acelerar y frenar, cambiar de carril, NITRO (rompe vallas y embiste), EMBESTIR
    al vehículo de al lado y GATAS (Luna salta a un perseguidor).
  - Cinco tramos con punto de reaparición:
    1. Arranque (tutorial).
    2. Patrullas que se emparejan, avisan y se cierran sobre el camión.
    3. Rampas de la obra sobre zanjas, con letrero de carriles.
    4. Los Zopilotes: camionetas que lanzan barriles al carril marcado y motos que tiran tachuelas.
    5. El tráiler blindado: ráfagas de cajas en dos carriles marcados. Cuando las cajas ya pasaron, abre las
       puertas y solo entonces se le puede dañar. Al 50 % entra en una segunda fase. Al aparecer, los demás
       perseguidores se retiran.
  - Final: salto en cámara lenta y chapuzón en la presa.
- **Dibujo** (`js/app/chase_render.js`):
  - El camión es el arte real de la Ruta 6. Los fondos son el paralaje nocturno de Guadalajara (tres juegos de
    capas según el tramo).
  - Patrullas, camionetas, motos, el tráiler, rampas, conos, vallas, aceite, nitro y reparación se dibujan con
    primitivas. No se creó arte nuevo.
  - Efectos: explosiones, chispas, restos, llamarada de nitro, líneas de velocidad, franjas de cine en cámara
    lenta, destellos de sirena en los bordes, temblor (respeta la opción) y cámara que sigue al camión en altura.
  - HUD propio: carrocería, nitro, velocidad, gatas, derribos, progreso de la ruta y barra del jefe.
  - En horizontal la calzada va alta para que los botones táctiles no tapen los carriles.
- **Cinemáticas:** entrada en 3 escenas y salida en 2. Usan fondos y sprites ya incluidos y están en la precarga.
- **Sonido:** sirena, derrape, choque, explosión, nitro, rampa y aterrizaje, sintetizados con el sistema de audio
  existente.

## 2. Cada tramo es una misión (contratos)

**Problema medido.** La ruta grabada de las pruebas de campaña cruzaba los 13 tramos de Guadalajara en 2 a 17 s cada
uno, cayendo directo y sin vencer a un solo jefe.

`js/core/contracts.js` define un contrato para cada uno de los 23 tramos jugables:

- **Objetivo obligatorio:** jefe, cacería N, cristales N, objeto de la mochila (zona oculta) o contrarreloj.
  - Bajar al tramo siguiente sin cumplirlo falla la misión. Se reintenta desde la última parada sin perder vidas.
  - La meta final también lo exige.
  - Los números se ajustan a lo que queda delante del punto de salida (70 % de lo disponible), así la misión
    siempre se puede cumplir, también al reaparecer en la parada intermedia.
- **Objetivo opcional (medalla):** sin daño, derribos con GATAS, cristales, rapidez o zona secreta. Se guarda en el
  progreso y se ve en las paradas del menú (✓ / ✓★).
- **Efectos:**
  - NOCHE: linterna alrededor de Sofía; los ojos de las gatas brillan.
  - LLUVIA: piso mojado, con menos agarre que el seco y más que un charco. Cambia `physics.js`.
  - VIENTO: ráfagas con aviso de 1,1 s que empujan de lado. Hay rachas y flechas en el borde de la pantalla.
- **Historia de cada contrato:** Los Zopilotes ofrecen recompensa por «la niña de la mochila» y sus «vigías» aparecen
  en Guadalajara antes de la persecución. Las llaves USB y la Ruta 6 también entran en los motivos.
- **Interfaz:**
  - El cartel de tramo explica el porqué y el objetivo.
  - El HUD muestra el contador o el reloj (en rojo los últimos 10 s).
  - Hay panel MISIÓN FALLIDA y una línea de misiones cumplidas en la victoria.
- **Opción MISIONES:** OBLIGATORIAS (predeterminada) u OPCIONALES. Con OPCIONALES hay efectos y medallas, pero
  no se bloquea el avance.
  - El motor sin esta opción (`createGame` sin `assist.contracts`) conserva el comportamiento anterior. Por eso las
    126 pruebas originales siguen probando lo mismo.

## 3. Historia unida

- **Escena puente mar → Luna:** la escotilla de Poseidón era la puerta de una cápsula de la Toxifamilia.
- **Textos actualizados:** la cinemática de respaldo, la guía «¿Qué hago?» y la pausa ya mencionan las misiones
  por tramo y la Calzada.

## 4. Correcciones

- **Al fallar una misión, el mismo paso activaba la parada del tramo siguiente**, y el reintento empezaba más
  adelante. Encontrado por las pruebas nuevas.
- **Menú:** las reglas CSS por posición (`nth-child`) suponían 5 tarjetas. Ahora el arte, el color y el ancho van por
  misión (`data-m`).
- **Contador del menú:** el fijo «21 PARADAS» era incorrecto (eran 23). Ahora se calcula.
- **Versión:** `CONFIG.version` decía 58.8.20 aunque el service worker era 58.8.23. Ahora todo es 58.8.24 y la
  caché se renueva.
- **Gramática de los jefes:** «vence al Maestro», «a la Paloma Jefa», «a Poseidón».

## QA

- **Node: 143/143.** Las 126 originales más 7 de la Calzada y 10 de contratos.
  - **Calzada.** Un bot que solo lee el estado visible gana en Fácil, Normal y Difícil (4 semillas, sin
    reintentos). También se prueba que:
    - sin manejar se pierde y se reaparece en el tramo alcanzado;
    - el trazado es determinista;
    - ninguna fila de obstáculos cierra los 3 carriles;
    - cada zanja tiene rampa y letrero y se puede saltar a velocidad máxima sin nitro;
    - el blindaje del jefe funciona;
    - el guardado y la precarga son correctos.
  - **Contratos.** Se prueba que:
    - se pueden cumplir en los 23 tramos, desde el inicio y desde la parada intermedia;
    - la misión falla y se reintenta sin perder vidas;
    - el modo opcional deja avanzar;
    - los derribos reales con GATAS y los cristales cuentan;
    - el contrarreloj se agota;
    - el viento empuja solo con contratos;
    - la lluvia queda entre el piso seco y un charco;
    - la meta final se bloquea;
    - la ruta directa grabada ya no basta.
  - **Verificación de las pruebas.** Se rompieron a propósito el blindaje del jefe y una zanja: las pruebas fallaron
    y volvieron a pasar al restaurar.
- **Chromium** (Playwright), 390×844, 844×390 y 1280×720:
  - Menú con la tarjeta especial, opciones con MISIONES y arranque de las 6 misiones: sin errores de JS ni
    archivos faltantes.
  - Persecución completa hasta «¡CALZADA SUPERADA!».
  - Flujo real de la Calzada con teclado: cinemática, carriles, nitro, pausa y menú (las etiquetas de los botones
    se restauran).
  - Contratos: cartel, HUD, noche, lluvia, viento y MISIÓN FALLIDA → reintento.

### No verificado

- **Dispositivo y rendimiento:** no se probó en Android ni iOS físicos y no se midieron FPS sostenidos.
- **Dificultad con personas:** la de la Calzada y la de los contratos se ajustó con un bot que ve todo el estado.
  Hace falta probarla con jugadores reales, sobre todo los contrarrelojes y las cacerías en Difícil.
- **Arte:** no se crearon sprites nuevos. Los vehículos enemigos y los objetos de la Calzada son dibujos de código.
- **Escenas nuevas:** las de la Calzada y el puente mar → Luna no vienen del guion fuente de la Toxifamilia. Son
  adaptaciones de esta versión.

---

# V58.8.25 · La Calzada en la moto de mamá

Arte aportado para esta misión, integrado igual que la cinemática de Parafalls (escenas ilustradas con diálogo):

- **Cinemática «la moto de mi mamá»:** son 9 cuadros, del GIF de 507 × 336, en `assets/calzada/cine/`. La Ruta 6
  queda detenida en el retén de Mi Macro Calzada y Doña Tóxica avisa por radio. Junto al Parque Agua Azul, Sofía
  reconoce «la moto de mi mamá… Doña Tóxica… la Viridiana», se sube con Luna y Morita y gira la llave.
  - Los cuadros se muestran completos (`backgroundFit: 'contain'`, opción nueva del reproductor), sin recorte y
    bajo el cuadro de diálogo.
- **Vehículo:** Sofía maneja la moto de su mamá. Uso los cuadros 10–12 de la hoja de 4 × 3, recortados en
  `assets/calzada/moto/`.
  - La moto mide 170 u (el camión medía 236 u). El botón EMBESTIR pasa a llamarse PATADA.
  - Luna y Morita viajan en el portabultos. Al final la que vuela a la presa es la moto.
- **Fondos:** los 4 panoramas de la Calzada (Parque Agua Azul, Mi Macro Calzada con la Minerva, Mercado San Juan de
  Dios y Morelos) en `assets/calzada/fondos/`.
  - Se suceden en paralaje y se funden en las uniones.
  - Su guarnición (fila 624 de 821) queda alineada con el borde del camino, y la calle del panorama no se dibuja.
  - La persecución pasa a ser de día.
- **Precarga y versión:** todo en la precarga; caché y archivos cambiados en 58.8.25.

## QA 58.8.25

- **Node:** 143/143. El bot gana la persecución con la moto en Fácil, Normal y Difícil.
- **Chromium:**
  - Cinemática completa (11 escenas) con cada cuadro visible entero.
  - Persecución hasta «¡CALZADA SUPERADA!» en 844 × 390 y 390 × 844, y flujo real con teclado.
  - Sin errores de JS ni archivos faltantes.

### Limitaciones del arte

- **Recorte de la moto:** el fondo blanco se quitó por relleno desde los bordes. En los huecos de las llantas queda
  un claro que a tamaño de juego se ve como rin. No se podía quitar sin borrar también la blusa y las medias
  blancas de Sofía.
- **Modelos distintos:** el GIF muestra una moto deportiva y la hoja de cuadros una Italika 150. En la cinemática se
  ve la del GIF y en el juego la de la hoja.
- **Resolución:** los cuadros del GIF son de baja resolución (507 × 336, 256 colores) y en pantallas grandes se
  ven suaves.

---

# V58.8.26 · Los perseguidores en moto

Integro las dos hojas aportadas (3 × 4 cuadros cada una), recortadas y limpias en `assets/calzada/enemigos/`:

- **Limpieza de las hojas:** casi todos los píxeles tenían alfa parcial y había restos tenues. Corté el alfa en 90,
  eliminé las motas de menos de 30 px y recorté todos los cuadros con la misma caja para que no salten.
- **El niño de las piedras** (`kid`, 2 golpes para derribarlo). Llega por detrás a un carril de distancia.
  - Marca el carril de Sofía (franja roja) y levanta la piedra: fila 2 de la hoja.
  - La lanza en arco (fila 3). La piedra cae y se queda en ese carril como obstáculo.
  - Se esquiva cambiando de carril. Si Sofía va por una orilla, el niño lanza desde la orilla contraria, para que
    siempre quede un carril libre. Una prueba encontró ese caso: antes Sofía podía quedar sin salida.
- **El Maestro Enojón** (`maestro`, 3 golpes). Se empareja con Sofía y levanta la regla: fila 2, con una franja
  naranja que marca su alcance.
  - El reglazo (fila 3) alcanza su carril y los dos vecinos.
  - Se esquiva alejándose dos carriles, o dándole una PATADA durante el aviso, que le quita un golpe y lo aturde.
- **Fila 4 de cada hoja:** persecución, cuando el enemigo se queda atrás o se recupera.
- **Dónde aparecen:**
  - Tramo 2: alternan con las patrullas («LAS PATRULLAS Y EL MAESTRO»).
  - Rampas: el niño.
  - Tramo 4 («LOS ZOPILOTES Y EL NIÑO»): sustituye a una de las motos de tachuelas, y el maestro aparece al final
    (no en Fácil).
- **Historia:** en el retén, Doña Tóxica avisa que El Maestro Enojón y el niño de las piedras se unieron a la banda.
- **Versión:** caché y archivos cambiados en 58.8.26.

## QA 58.8.26

- **Node: 144/144.** La prueba nueva confirma que:
  - la piedra pega si Sofía no reacciona;
  - cambiarse a un carril libre en cada aviso esquiva todas las piedras;
  - el reglazo alcanza el carril vecino;
  - la PATADA durante el aviso lo detiene.
  - Verificación: al desactivar el reglazo a propósito, la prueba falla.
- **Bot:** gana en Fácil y Normal con 4 semillas sin reintentos. En Difícil hay a veces 1–2 reintentos, que vienen de
  barriles y choques.
- **Chromium (1280 × 720):** se ven los estados de manejo, aviso, ataque y persecución de los dos enemigos, sin
  errores.

---

# V58.8.27 · Progreso: banco, tienda de mejoras, calificación y enemigos por tramo

Auditoría antes de cambiar (datos de los 23 tramos):
- Los cristales (100+ por tramo) solo daban puntos.
- Guadalajara repetía casi la misma mezcla de enemigos en los 13 tramos.
- Ninguna misión se calificaba.

Cambios (`js/core/upgrades.js`):
- **Banco de cristales:**
  - Los cristales se depositan al llegar a cada parada y al ganar.
  - Si Sofía cae antes de la parada, se pierden los que traía.
- **Tienda de Doña Tóxica** (botón 🛒 MEJORAS del menú). Mejoras permanentes:
  - Corazón extra: hasta +2 vidas.
  - Gatas entrenadas: −1,5 s de recarga por nivel.
  - Imán de la mochila: +4 s y más alcance.
  - Escudo de salida: cada misión y cada reintento empiezan con escudo.
  - Moto reforzada: +1 de resistencia por nivel en La Calzada.
  - Tanque de nitro: +25 de nitro inicial en La Calzada.
  - El costo total de todo es de unos 3.150 cristales, lo que equivale a varias misiones.
- **Calificación S/A/B/C por misión:**
  - Peso de cada parte: misiones del tramo 55 %, opcionales 25 %, vidas 12 % y sin caídas 8 %.
  - Solo cuenta una partida completa desde la parada 1.
  - La mejor nota se guarda y se ve en la tarjeta del menú.
  - La Calzada se califica por resistencia, derribos y caídas.
- **Reparto protagonista por tramo en Guadalajara** (modo misiones, que es el del juego):
  - Colonia de noche: murciélagos y ratas.
  - Azoteas: palomas y chiles.
  - Centro: palomas y perros.
  - Portales: niños y palomas.
  - Zapopan: perros bravos y murciélagos.
  - Arcadas: ratas y chiles.
  - Metro: ratas y murciélagos.
  - Mercado: perros, ratas y niños.
  - Parque: perros bravos y perros.
  - Tlaquepaque: chiles y palomas.
  - Andén: palomas, niños y murciélagos.
  - El motor clásico conserva el reparto anterior. Las rutas grabadas de las pruebas de campaña dependen cuadro a
    cuadro de dónde están los enemigos, y siguen verificando la campaña completa.

QA:
- **Node: 149/149.** 5 pruebas nuevas:
  - compras y nivel máximo;
  - la parada deposita y el reintento pierde lo no depositado;
  - efectos de cada mejora, también en La Calzada;
  - calificación y récord;
  - al menos 80 % de los enemigos de cada tramo son sus protagonistas.
  - Los contratos siguen siendo cumplibles en los 23 tramos con los repartos nuevos.
- **Chromium (390 × 844 y 844 × 390):**
  - Menú con el banco y las calificaciones.
  - Compra real: el banco baja de 820 a 320, se guarda en el teléfono y la partida empieza con escudo.
  - Sin errores.

No verificado:
- El equilibrio de precios y la dificultad con jugadores reales.
- Parafalls sigue siendo el mundo más simple: 3 guardianes por tramo, sin jefe. Necesita arte de enemigos o de jefe
  para crecer.

---

# V58.8.28 · Enemigos secretos extra, marciano nuevo y transformación Roblox

Integro tres archivos aportados.

**1. Paquete «ENEMIGOS_SECRETOS_EXTRA_V2»** (4 enemigos × 16 cuadros)
- **Preparación de los atlas:** traían el alfa sucio. Los limpié (alfa < 90 fuera, motas sueltas fuera), recorté cada
  cuadro a su contenido real con el pivote al centro y los convertí a WebP: 7 MB en PNG quedaron en 0,96 MB.
- **Conducta:** cada uno usa la de un enemigo ya probado, con su arte propio y +1 de resistencia.
  - **Robot centinela:** conducta del dron. Animaciones: flota y dispara un láser rojo.
  - **Murciélago alienígena:** conducta del murciélago. Animaciones: duerme, muerde en alerta y se lanza en picada.
  - **Piraña furiosa:** conducta de la piraña. Animaciones: nada, muerde al avisar y persigue en la embestida.
  - **Medusa eléctrica:** conducta del pulpo. Animaciones: flota, se desplaza y suelta descargas; su disparo sale
    como un orbe eléctrico.
- **Dónde aparecen:** en las zonas secretas a las que corresponden.
  - Estación orbital: robot centinela y murciélago alienígena.
  - Santuario de Poseidón: piraña furiosa y medusa eléctrica.
  - Hay 2 de cada uno, y 1 en Fácil.
- **Lo que no usé:** los GIF y los PNG sueltos del paquete; el juego usa el atlas.

**2. Marciano** (tira de 15 cuadros)
- Separé los cuadros automáticamente por los espacios vacíos entre figuras; descarté la orbe suelta y dos restos.
- El ancla va en los pies. Animaciones: caminar, recibir golpe, cargar y disparar la orbe, mareo y derrota en 3 cuadros.
- Todo marciano lo usa, también el jefe Marciano Comandante. Su conducta no cambia.

**3. Sofía transformándose al estilo Roblox** (hoja de 12 cuadros)
- Escena «El portal» de Parafalls: Sofía camina hacia el portal, toca la luz y se transforma.
- Escena siguiente: ya aparece transformada (último cuadro de la hoja).

## QA

- **Node: 150/150.** La prueba nueva confirma que:
  - cada atlas existe y sus cuadros caen dentro de él;
  - cada enemigo aparece solo en su zona secreta, con su conducta base y su resistencia;
  - en Fácil sale 1 de cada uno y en Normal 2;
  - el marciano usa el arte nuevo.
  - Ajusté a 12 las dos pruebas que fijaban en 6 los cuadros de la transformación anterior.
- **Chromium (1280 × 720):**
  - Dentro de las dos zonas secretas se ve a cada enemigo cambiar de estado (avisa, embiste o pica y dispara).
  - Transformación completa en la cinemática del portal y marciano nuevo en la estación.
  - Sin errores ni archivos faltantes.

## No verificado

- El tamaño en pantalla y el equilibrio de los enemigos nuevos con jugadores reales.
- La medusa usa la conducta del pulpo, no una descarga de área propia.

# V58.8.29 · Jefes nuevos del paquete «RECURSOS_CURADOS_V1»

Integro cuatro de las cinco hojas de jefes del paquete. La de Doña Tóxica en scooter queda guardada para después, como
pediste.

**Preparación de las hojas.** Cada hoja traía el alfa sucio y algunos cuadros pegados entre sí (rayos y chorros que
cruzan de una celda a otra). Hice lo siguiente:
- separé los cuadros por filas y columnas;
- limpié el alfa (menos de 90 fuera) y quité motas sueltas;
- recorté cada cuadro a su contenido;
- los empaqué en atlas WebP.

El ancla de cada cuadro es el centro del cuerpo: se calcula con las columnas más densas, así un rayo o un chorro no
mueven al personaje. Resultado: 4 atlas de 0,3–0,54 MB.

**1. Poseidón** (22 cuadros), arte nuevo con la misma conducta:
- flota;
- se impulsa al avisar la embestida;
- gira el tridente al embestir;
- carga y suelta la ola;
- queda aturdido;
- se derrumba en 4 cuadros.

**2. Pulpo Rey** (20 cuadros) reemplaza el arte del Pulpo del Abismo, jefe del Santuario. Su conducta es la misma.
- Ahora se llama «PULPO REY DEL ABISMO».
- Animaciones: flota (y nada más rápido en segunda fase), prepara y lanza el tentáculo, escupe tinta, se marea y cae
  noqueado.

**3. Emperador Marciano** (25 cuadros) es el nuevo jefe final de la Luna en lugar del Dron Centinela.
- Usa la conducta del dron, pero con su propio tamaño (62 × 72 u) y una altura que deja pasar a Sofía por debajo.
- Su orbe es magenta y más grande. En segunda fase dispara un abanico de tres orbes, siempre después de la misma
  carga avisada.
- La misión de la Luna ahora dice «El Emperador Marciano custodia el módulo de regreso».

**4. El Maestro Enojón en su moto roja** (20 cuadros) es el jefe del tramo 2 de La Calzada.
- **Duelo al final del tramo.** La avenida se despeja: lo que sigue de la ruta se aparta y, al vencerlo, vuelve
  delante a la misma distancia. La ruta no avanza durante el duelo, así que las rampas nunca se mezclan con la pelea.
- **Barra de vida:** 4 en Fácil, 6 en Normal y 7 en Difícil.
- **Ataques, todos avisados:**
  - **Reglazo:** alcanza su carril y los dos vecinos.
  - **Embestida:** marca tu carril y llega desde atrás.
  - **Caballito:** solo con media vida. Salta y cae en el carril marcado.
- **Cuándo se le puede pegar:** se cubre con la regla, salvo mientras la levanta, mientras golpea o cuando frena
  aturdido. Entonces se le patea de lado o se le embiste por detrás. Las gatas siempre le pegan.
- **Contacto:** los roces de lado ya no hieren a Sofía; solo hieren sus ataques avisados.
- **Al vencerlo:** +1 de reparación y nitro.
- Durante los duelos (el del maestro y el del tráiler), los demás perseguidores se retiran y ya no estorban.

## QA

- **Node: 152/152.** Dos pruebas nuevas confirman:
  - las pieles de Poseidón y del Pulpo Rey;
  - que el jefe de la Luna es el Emperador, con su tamaño, su texto y su abanico solo en segunda fase;
  - que en el duelo del maestro, sin reaccionar, solo pegan sus tres ataques avisados;
  - que se cubre fuera de sus ventanas;
  - que la ruta se detiene durante el duelo y regresa delante al vencerlo.
- **Bot en las tres dificultades y tres semillas:** gana siempre.
  - Duración del duelo: 17 s en Fácil, 21 s en Normal y 34 s en Difícil.
  - Ninguno de sus ataques avisados lo alcanza.
- **Ruta grabada de la Luna:** se desviaba unos 60 u porque el Emperador tiene otra caja de golpe que el dron (Sofía
  quedaba en x 306 y la meta está en 166–234). Alargué su último tramo a la izquierda de 81 a 100 fotogramas. Sigue
  ganando sin daño, con el jefe nuevo y con el anterior.
- **Chromium (1280 × 720):**
  - los cuatro jefes cambian de animación según su estado;
  - el Pulpo Rey se ve dentro del Santuario;
  - el Maestro en moto en todos sus estados, incluidos el caballito en el aire con su sombra y la derrota;
  - sin errores ni archivos faltantes.

## No verificado

- El equilibrio de los cuatro jefes con jugadores reales (el bot reacciona perfecto).
- La barra del Maestro durante los primeros segundos: la tarjeta del capítulo la tapa en la captura de QA (en el
  juego esa tarjeta se va sola).
