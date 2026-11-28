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
