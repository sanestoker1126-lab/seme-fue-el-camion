# V58.8.24 · La Calzada y misiones por tramo

Base: V58.8.23 · Santuario de Poseidón (importada sin cambios en `90f2db7`).

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

# V58.8.30 · Historia consolidada, Sofía igual que al jugar y llantas que giran en la Calzada

## 1. La historia de principio a fin

Revisé todas las escenas en el orden real del juego: escuela → Guadalajara → Calzada → mar → Luna → Parafalls → epílogo.

**Huecos que llené**
- **De la Luna a Parafalls:** nueva escena puente «EL REGRESO». El módulo de regreso cae en un bosque lleno de cascadas
  y Papito Estoker llega por Sofía. Le trae su ropa rosa, que es la que lleva en el arte del portal. Antes, Sofía
  pasaba de la Luna a caminar con su papá por un bosque sin explicación.
- **Cada misión termina donde empieza la siguiente.** Los textos de victoria del mar, la Luna y Parafalls ahora
  enlazan con la escena que sigue:
  - mar: «la escotilla… una cápsula de la Toxifamilia»;
  - Luna: «el módulo… despegan rumbo a la Tierra»;
  - Parafalls: Papito Estoker espera en la reja de Puente Grande.

  Conservé el título «¡MISIÓN COMPLETADA!», porque esas misiones no tienen objetos de mochila.
- **Guadalajara:** su final decía «lo importante es que van a casa» y «mañana con luz de día». Ahora termina en la
  Ruta 6 y anuncia la Calzada. Antes, además, con 3 de 3 objetos decía que había recuperado los seis.
- **El jefe de la Luna se presenta antes de la misión:** Doña Tóxica avisa por radio que el Emperador Marciano tomó la
  base. Tiene su propia presentación de jefe (como Poseidón) y el capítulo de la Luna lo nombra.

**Contradicciones de hora.** El prólogo dice «antes de la medianoche», pero tres tramos decían «AL AMANECER» o «AL
ATARDECER» («el mercado despierta con el amanecer»). Cambié esos textos por otros sin hora. El arte tiene el sol en el
horizonte y se lee bien como atardecer.

**Jefes en las cinemáticas.** El recuerdo del templo y la presentación de Poseidón todavía mostraban al Poseidón
anterior (humano, con capa). Ahora muestran el mismo Poseidón con el que se pelea. Usé 6 cuadros del arte nuevo, en
lienzo uniforme para que no salten.

**Epílogo**
- La caja de texto tapaba a los tres personajes. Ahora el texto va arriba y los personajes quedan a la vista.
- Estoker sale con su arte real, el mismo Papito Estoker de Parafalls.
- Doña Tóxica sigue en silueta hasta integrar su arte, como pediste.

## 2. Sofía con la misma ropa en la cinemática y al jugar

Así se viste Sofía al jugar: uniforme en la escuela, ropa de calle en Guadalajara y la isla (ORIGINAL o ROSA, la
opción del menú), buzo dentro del mar, astronauta en la Luna y Roblox en Parafalls. Las cinemáticas ahora siguen la
misma regla:
- **Llegada a Guadalajara:** antes Sofía llegaba en uniforme y al tomar el control aparecía con otra ropa. Ahora llega
  con su ropa de calle y la narración lo explica: «en el camión cambió el uniforme por su ropa de calle».
- **Mercado del prólogo y epílogo:** siguen la ropa elegida (antes, siempre la original).
- **Error corregido:** el reproductor de cinemáticas dejaba «pegado» el último vestuario que se le pasaba. Por eso la
  llegada al mar, repetida desde el menú, podía salir en uniforme.

## 3. La Calzada: llantas que giran y efectos en movimiento

**Llantas que giran**
- **Cómo medí las llantas:** en los 50 cuadros de motos que la tienen (Sofía, el niño, el Maestro jinete y el Maestro
  jefe). Busqué el anillo oscuro de la llanta con transparencia afuera y verifiqué cada cuadro a ojo.
- **Moto de Sofía:** tiene rines de rayos. Con la mitad de abajo de cada rin (sin escape ni bota) se arma una vez una
  textura limpia, repitiendo el periodo de los rayos (7 y 8). El juego la gira en esa mitad.
  - Velocidad: gira según la velocidad real, sin pasar de un tercio de rayo por cuadro, para que nunca parezca ir hacia
    atrás.
  - A más velocidad deja una estela de giro.
  - En cámara lenta también gira lento.
- **Jinetes y Maestro jefe:** tienen rines lisos. Giran las marcas de la llanta y un brillo del rin.
- **Temblor corregido:** cada cuadro de los jinetes ahora se ancla a sus propias llantas. Antes la moto se corría hasta
  20 px entre cuadros y temblaba.

**Efectos (solo de dibujo: no cambian la simulación, así que el bot y las pruebas siguen valiendo)**
- polvo de la llanta trasera (azul con nitro), también en los perseguidores;
- marcas de derrape al cambiar de carril o frenar;
- aro y nube de polvo al aterrizar, más un golpe breve de cámara (respeta la opción TEMBLOR);
- estela fantasma y estallido de rayos al encender el nitro;
- viento detrás de Sofía a alta velocidad;
- grietas y manchas del asfalto que pasan con la velocidad.

**Corrección.** Las líneas de velocidad usaban un desplazamiento con signo sobre un número sin signo, y algunas salían
al revés.

## 4. Pulido nivel por nivel

Recorrí en Chromium los 23 tramos y las 5 secciones de la Calzada, con capturas: sin errores de consola ni archivos
faltantes.
- **Centro Histórico, Los Portales y el primer Guadalajara:** a los lados del panel pintado, en la mitad alta, quedaba
  un bloque gris plano. Ahora se ven el cielo y la ciudad lejana del mismo paquete.
- **Rótulos de zona:** isla, bosque de algas, fosa y las tres cascadas mostraban el rótulo de respaldo «RUTA ALTERADA».
  Ahora tienen el suyo: «BOSQUE DE ALGAS», «SANTUARIO DE POSEIDÓN», «CASCADAS DEL CIELO»…
- **Resultado de la Calzada:** menciona al Maestro. Los motivos de derrota «regla», «embestida», «caballito» y
  «piedra» tienen texto propio (antes caían en «La moto ya no aguanta»).

## QA

- **Node: 157/157.** Pruebas nuevas:
  - **Historia consolidada:** vestuario por escena, jefes con el arte con que se pelean, enlaces entre misiones y
    textos sin horas contradictorias.
  - **Calzada dibujada completa:** el bot la juega mientras se dibuja sobre un contexto falso que, como el navegador,
    rechaza radios negativos. Comprobé que atrapa el error que encontré: con el desplazamiento con signo, la prueba
    falla.
  - **Tablas de llantas:** cada cuadro tiene datos, las llantas caen dentro del cuadro, son del mismo tamaño y la
    distancia entre ejes es estable.
- **Pruebas actualizadas:**
  - la de Parafalls, por la escena puente nueva (busca las escenas por id y conserva todas sus comprobaciones);
  - la de Guadalajara, que fijaba el texto exacto del fondo;
  - las que fijan versiones.
- **Chromium:**
  - **Giro de las llantas:** con la simulación congelada y solo el reloj del dibujo avanzando, dentro de las llantas
    cambian 800–1.500 px por cuadro.
  - **Efectos:** los capturé andando, al cambiar de carril, con nitro, en el aire y al aterrizar, en 1280 × 720 y en
    teléfono vertical.
  - **Cinemáticas cambiadas:** las revisé una por una, al igual que las presentaciones del Emperador y de Poseidón.

## Pendiente o no verificado

- **Parafalls tiene dos Sofía Roblox distintas.** La de tu hoja de transformación (pelo rizado, moño azul, ropa rosa)
  y la del atlas de 30 poses con que se juega (cola de caballo, lentes, mochila). Para que coincidan hace falta decidir
  cuál es la oficial. Si es la de la transformación, se necesita su hoja de animaciones: caminar, correr, saltar,
  caer, patada, golpe y celebrar.
- **La Calzada con la ropa ROSA:** el arte de la moto solo existe con la ropa original. Quien elige ROSA juega
  Guadalajara de rosa y la Calzada sale con la original.
- **Arte pendiente:** Doña Tóxica sigue en silueta en el epílogo, y falta la imagen del tráiler blindado.
- **Rendimiento de los efectos:** no lo medí en un teléfono real; en Chromium de escritorio no hubo problemas.

# V58.8.31 · Rendimiento, motor de la moto y presentación de jefes

## Rendimiento (medido en Chromium)

**Coste de los efectos de V58.8.30.** Medí el tiempo real entre cuadros, con un cuadro por `requestAnimationFrame` y
el rasterizado incluido. El navegador de pruebas no tiene GPU.
- **Sin limitar el procesador:** las dos versiones van a 60 fps (16,8–17,2 ms de media). En teléfono, el percentil 95
  sube de 17 a 21 ms.
- **Con el procesador 4 veces más lento:** el dibujo en JavaScript sigue siendo barato (1,2 → 1,7 ms de media). Lo que
  pesa es el rasterizado (61–68 ms por cuadro sin GPU), y los efectos suman alrededor de un 12 %.
- Una primera medición mostraba cuadros de 2 a 5 s, pero era un artefacto de medir sin devolverle el control al
  navegador. Lo comprobé repitiendo la medición cuadro por cuadro.

**Dos errores que encontré**
- **La Calzada nunca adaptaba la resolución.** El ciclo salía antes del ajuste de calidad. Ahora la baja con equipos
  lentos: en la prueba, el lienzo bajó de 680 a 374 px de ancho.
- **En todo el juego, la calidad nunca volvía a subir en pantallas de 60 Hz.** Solo subía con cuadros de menos de
  14,5 ms, y a 60 Hz el navegador entrega uno cada 16,7 ms. Tras cualquier tirón pasajero, el juego quedaba con menos
  resolución toda la sesión.
  - Ahora sube un 5 % tras tres tramos seguidos a 60 fps.
  - Espera 8 s después de cada bajada, para no oscilar.
  - En la prueba volvió de 374 a 680 px.

**Efectos según la calidad.** Por debajo del 80 % de calidad se recortan los efectos de la Calzada: la mitad del
polvo, una sola estela fantasma y sin estela de giro en las llantas.

## Motor de la moto

Sonido continuo sintetizado:
- diente de sierra y cuadrada por un filtro, con pulso de cilindros;
- el tono y el filtro siguen la velocidad, y con nitro suben;
- respeta la opción EFECTOS y su volumen;
- se apaga al pausar, perder, ganar, salir o cuando entra una cinemática;
- en el salto final suena hasta el chapuzón.

En el navegador: con el audio activo, el tono sube de 0,57 a 1,0 al acelerar, se apaga en la pausa y vuelve al
reanudar.

## Presentación de los jefes de la Calzada

Cuando aparecen el Maestro en su moto roja o el tráiler, entra una franja inclinada con su nombre («DUELO EN LA
CALZADA · EL MAESTRO ENOJÓN · MOTO ROJA») y se desvanece en 2 s de tiempo real. Revisada en escritorio y en teléfono.

## Guía

La guía presentaba Parafalls como «una misión adicional», pero en el juego es la continuación directa de la Luna: al
ganarla aparece «CONTINUAR · PARAFALLS», y la escena final exige terminarla. Ahora la guía cuenta la historia completa
hasta Puente Grande, y su título es «LLEGA ANTES DE LA MEDIANOCHE». Actualicé la prueba que fijaba el texto anterior.

## Pulido revisado

Capturé la zona del jefe o la salida de los 23 tramos. No encontré defectos nuevos.

## QA

- Node: 157/157.
- Chromium: 23 tramos y la Calzada sin errores ni archivos faltantes.

## Pendiente

Sigue lo mismo de V58.8.30: la Sofía Roblox oficial de Parafalls, la Calzada con la ropa rosa, el arte de Doña Tóxica y
la imagen del tráiler. Tampoco medí en un teléfono real.

# V58.8.32 · La Sofía Roblox oficial y una promesa que se cumple

**Sofía Roblox oficial.** Decidiste que la oficial es la de tu hoja de transformación: pelo rizado, moño azul y ropa
rosa.
- La cinemática de Parafalls ya la muestra después de transformarse, también en «LA PRIMERA CASCADA». Antes esa escena
  usaba el diseño del atlas jugable (cola de caballo, lentes y mochila).
- Saqué esos tres cuadros del precache, porque ya no se usan. Los archivos siguen en el proyecto.
- **Al jugar** se sigue usando el atlas anterior hasta que llegue la hoja de animaciones del diseño oficial. Tiene que
  traer:
  - reposo (3–4 cuadros);
  - correr (6, en ciclo);
  - saltar (2);
  - caer (2);
  - aterrizar (1–2);
  - patada (3);
  - golpe (1–2);
  - derrota (2);
  - celebrar (3);
  - trepar (2, en ciclo);
  - planear, que sirve para el dash, la tirolesa y el columpio (2).

  Con fondo transparente, mirando a la derecha, a la misma escala y con los pies en la misma línea en todos los
  cuadros.

**Doña Tóxica.** Prometía «Te espero del otro lado de la barranca», pero Sofía cae a la presa y su mamá no vuelve a
aparecer hasta Puente Grande. Ahora dice «Cruza la barranca y sigue hacia Puente Grande: ahí te espero», y lo cumple en
el epílogo. La tarjeta del último tramo de la Calzada ya no repite la promesa. Cuando la moto cae al agua, se oye su
llamada por radio, entrecortada: «¿Sofía…? ¡Sofíaaa…!».

**QA.** Node 157/157. En Chromium: las escenas de Parafalls después de transformarse y los 23 tramos, sin errores ni
archivos faltantes.

# V58.8.33 · La Sofía cúbica oficial ya se juega en Parafalls

Integré el paquete **SOFIA_CUBICA_ATLAS_MAESTRO**: 30 poses del diseño oficial (el de tu hoja de transformación), en un
atlas de 2048 × 1024 con celdas de 256 px, Sofía mirando a la derecha y el ancla fija en los pies (128, 240).

- **Limpieza.** El propio paquete avisaba de bordes de color por el recorte. Quité 24 514 píxeles de halo tenue (alfa
  menor a 90); no había motas sueltas. Las celdas y el ancla quedaron sin cambios.
- **Animaciones por estado del juego:**
  - reposo (4 cuadros);
  - correr (ciclo completo de 6; caminar usa el mismo ciclo, más lento);
  - salto, caída y aterrizaje;
  - trepar;
  - planear, que sirve para el dash, la tirolesa y el columpio;
  - patada (3);
  - derrota (cae y se queda tendida);
  - celebrar.

  El puñetazo del paquete queda disponible, aunque el juego todavía no lo usa.
- **Sin pose de daño.** El paquete entendió «golpe» como dar un puñetazo, no como recibirlo. Para el daño uso el
  agachado del aterrizaje; el juego además hace parpadear a Sofía al recibir daño.
- **Duraciones por cuadro.** El adaptador ahora respeta la duración propia de cada cuadro (por ejemplo, la derrota: 180
  ms y luego 450 ms). Si una animación no las trae, usa su velocidad fija, como antes.
- **Mismos archivos.** El atlas reemplaza al anterior en las mismas rutas. El anterior queda en el historial de git.

Las tres hojas sueltas que mandaste con el paquete son las referencias con las que se generó:
- la del niño y la del Maestro en moto son idénticas, byte por byte, a las ya integradas;
- la de la transformación es el mismo diseño que ya usa la cinemática, pero con un halo de colores más marcado, así que
  dejé la versión limpia que ya estaba.

**QA**
- **Node:** 157/157. La prueba del atlas ahora exige el diseño oficial, el ciclo de correr completo, una animación para
  cada estado del juego y las duraciones.
- **Chromium:** en Parafalls la vi parada, corriendo, saltando, cayendo, pateando, con dash y celebrando. Los 23 tramos
  sin errores ni archivos faltantes.

# V58.8.34 · La transformación a Roblox con tu exportación nueva

En la 58.8.33 traté como solo referencia la hoja de la transformación que mandaste con el atlas, y mantuve los
cuadros anteriores. La revisé a fondo y ahora la uso.
- **Mismo dibujo, más nítido.** Son los mismos 12 dibujos y la misma secuencia (camina, mira el portal, toca la luz y
  se vuelve cúbica): los colores difieren apenas 5–7 de 255 en los píxeles comunes. Esta exportación es un 16 % más
  grande: cada figura mide unos 343 px de alto, contra 296 en la anterior.
- **Recorte.** La hoja es una cuadrícula exacta de 4 × 3 celdas de 362 px. Corté cada cuadro con su celda y luego todos
  con el mismo recuadro (lienzo común de 284 × 355). Así se conserva la posición que les diste y la animación no salta;
  los pies caen en la misma línea.
- **Limpieza.** Quité el halo tenue (alfa menor a 90) y las motas sueltas, y dejé las chispas de la transformación.
- **Mismos archivos.** Reemplacé los archivos en las mismas rutas. Subí la versión de la caché del service worker para
  que el navegador descargue los nuevos.

**QA**
- **Node:** 157/157.
- **Chromium:** revisé la cinemática del portal (caminando, mirando el portal y transformándose) y las dos escenas
  siguientes; sin errores ni archivos faltantes.

# V58.8.35 · Cascadas más fluidas, combo de Sofía y avisos sin taparse

- **Rendimiento real, medido en el bucle del juego.** En las cascadas, las dos capas de ambiente (atmósfera y
  vegetación frontal) se amplían de 3 a 6 veces desde lienzos a media resolución. Se dibujaban con suavizado bicúbico,
  y en un dispositivo sin aceleración eso costaba unos 15 ms por cuadro. Ahora esas capas difusas, igual que el
  plancton y las burbujas del canal, usan suavizado bilineal. Los fondos de Guadalajara que se dibujan casi a 1:1 o
  ampliados también lo usan, así el navegador ya no recalcula sus reducciones en cada cuadro. Las capas nítidas
  (estrellas de la Luna, láminas pintadas y personajes) conservan el suavizado alto. Cuadros por segundo con la
  resolución fija, antes → ahora:
  - Cascadas medias: 39–42 → 56–57 (con CPU ×4: 6–7 → 12–13).
  - Plataforma final: 31–43 → 59 (con CPU ×4: 8,5–10,5 → 13–14,5).
  - Descenso inicial: 44–49 → 51–57; isla del canal con CPU ×4: 10–11 → 13–14,5.
  - Metro de Guadalajara: casi igual (su costo es la linterna de la noche).
  Comparé capturas antes y después a densidad de teléfono: la diferencia p99 es de 2 a 3 niveles de 255, y las únicas
  manchas son las partículas aleatorias.
- **Una medición que descarté.** Probé también reducir por niveles los atlas grandes de las gatitas Roblox. El tiempo
  de JavaScript bajaba de 21 a 0,3 ms, pero solo porque Chrome deja el pintado para el final del cuadro. En el bucle
  real los cuadros por segundo no cambiaban (43–44 en ambos casos), así que no lo incluí.
- **Combo de la Sofía cúbica.** Si encadenas un segundo golpe en menos de 0,8 s después de la patada, sale un puñetazo
  (el atlas ya lo traía). Después de una pausa vuelve la patada. La primera patada de cada nivel siempre es patada,
  aunque el reloj del mundo se reinicie.
- **Daño visible en Parafalls.** Al recibir un golpe, la Sofía cúbica destella en rojo durante la primera parte del
  aturdimiento, como en los demás mundos.
- **Avisos sin taparse.** Con la tarjeta del capítulo a la vista, el aviso se coloca justo debajo de su borde real.
  Antes bajaba a una altura fija, y con títulos de dos líneas (p. ej. «CASCADAS DEL CIELO · TRAMO MEDIO») la tarjeta lo
  tapaba.

**QA**
- **Node:** 159/159. La prueba nueva `rendimiento_capas` fija qué capas son suaves y que el suavizado se restaure;
  comprobé que falla si se quita la marca o la condición.
- **Chromium:** recorrí los 23 tramos sin errores ni archivos faltantes. Verifiqué el combo (patada, puñetazo
  encadenado, patada tras una pausa) y el destello de daño en capturas.
