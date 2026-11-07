# CHANGELOG V50 — "¡Se me fue el camión!"

Revisión completa de jugabilidad y de los frames de cada personaje, **4 niveles nuevos** (16 en total)
y un **menú de opciones** completo. Todo lo de abajo se verificó con pruebas (ver al final).

## 1. Problemas encontrados en V49 (y corregidos)

### Jugabilidad
- **Plataformas invisibles en 10 de 12 niveles.** La colisión se reutilizaba de 2 mapas (escuela y
  Guadalajara) pero los fondos nuevos no tienen esas cornisas pintadas: Sofía caminaba sobre el aire.
  Solo el nivel 1 coincidía con su dibujo.
  → Ahora el juego **dibuja todas las plataformas** con texturas recortadas de tu
  `plataformas_referencia.png` (piedra, cantera con musgo, concreto, ladrillo, teja, madera, andamio,
  franjas de peligro para las móviles). La línea superior de la textura es exactamente donde se pisa.
  Los niveles cuyo fondo sí trae las cornisas pintadas (escuela y Portales) siguen usando el dibujo.
- **Fondos recortados.** Los de 1080×1920 (niveles 3, 4, 5 y 8) se dibujaban solo en su esquina
  superior izquierda. → Se ajustan completos al panel, con un paralaje suave y un velo para que las
  plataformas resalten.
- **Jefes congelados.** Chile, murciélago y paloma no tenían estado "mareado": tras el primer golpe se
  quedaban quietos para siempre (el chile ya no volvía a disparar). → Se recuperan y siguen peleando.
- **Jefes "encadenables".** Se les podía dar patada tras patada sin que respondieran.
  → Los jefes que embisten retroceden tras cada golpe y contraatacan; mientras avisan o embisten
  **bloquean de frente** (por la espalda, tras saltarlos, o desde arriba sí reciben el golpe).
- **Arenas de jefe diminutas.** En los mapas de la escuela la salida mide 123 u y el jefe la llenaba.
  → El jefe pelea en la cornisa amplia más baja (≥ 200 u). Murciélago y paloma vuelan donde hay espacio
  libre arriba y dejan pasar a Sofía por debajo (antes "dormían" sobre el piso).
- **Vencer a un jefe ahora premia**: +1 corazón (o escudo si vas completa), 5 cristales y 400 pts;
  el resumen final muestra "jefes X/16".
- Patear en el aire ya no frena el salto en seco.
- Los enemigos comunes ya no comparten la arena del jefe.
- La primera vez que aparece cada tipo de enemigo se explica cómo vencerlo (antes salía
  "¡CUIDADO, ENEMIGO!" con el sonido de recoger cristal).
- Mapa ancho del Centro: la cornisa D se acortó para que la arena del jefe quede a cielo abierto.
- Pausar ya no reinicia la canción; la vibración ya no depende de tener los efectos encendidos.
- El ambiente sonoro se elige por el tema del tramo (antes por número de tramo).
- HUD: un nombre de jefe largo ya no parte los corazones en dos líneas.
- Cache-busting del HTML seguía en `v=46.0` aunque el SW decía v49 → ahora todo es `v=50.0`.

### Frames
- **Sofía** (nuevo juego en `assets/player/sofia/`, los originales quedan intactos):
  - `kick_01` tenía **falda y diadema verdes** → recoloreadas al rojo del resto.
  - La patada flotaba ~4 u sobre el piso → cada frame se ancla a su pie de apoyo.
  - Escalas mezcladas entre láminas: al correr crecía ~57% y al aterrizar ~50%. Se normalizó el tamaño
    de cabeza de cada frame (medido) y Sofía mide ≈ 61 u, como su caja de colisión (62).
  - Las **astas de reno** aparecían y desaparecían según el estado → ahora están en todos los frames.
  - Mapeo de estados corregido: el "salto" usaba poses de golpe con los dos pies en el piso y la
    "caída" usaba frames de correr. Ahora: carrera = ciclo nítido de zancada, salto/caída = pose en el
    aire, dash = clavado, daño = agachada con destello rojo, derrota = cae de bruces.
  - Respiración sutil en reposo y aplastado breve al aterrizar.
- **Enemigos** (`assets/enemies/v50/`): fuera los frames recortados en el borde (2 de los 3 de muerte
  del niño, `alert_03` de la rata, `walk_01` y `alert_01` del perro), quitada la **cola suelta** que
  flotaba frente a la rata, limpiadas las manchas rojas de las patas del perro, y cada frame anclado al
  cuerpo y a las patas (ya no "brincan"). El niño usa su pose de apuntar al lanzar piedras.
- **Perro bravo**: antes era idéntico al perro común (y uno aguanta el dash y el otro no). Ahora es más
  grande, más oscuro y tiene un aura de armadura que desaparece cuando está mareado.
- **Gatitas**: el reposo ya no cicla la pose de olfatear; nombres justo encima de cada una.
- **Camión**: los 4 "frames" eran 4 camiones distintos (otro color y ángulo) y parpadeaban a 7 fps.
  Se usa uno solo con vibración de motor y humo.

## 2. Niveles nuevos (4) — 16 tramos en total
| Tramo | Nivel | Mecánica nueva | Jefe |
|---|---|---|---|
| 5 | Azoteas de la Colonia | **Tejas flojas**: tiemblan al pisarlas y se caen a los 0,5 s (reaparecen) | Chile del Tendedero |
| 8 | Guadalajara, Jalisco · Los Portales | Usa tu fondo original `guadalajara_fondo.png` (estaba sin usar), con sus cornisas pintadas | El dueño del perro · Revancha |
| 11 | Línea 3 · Estación Subterránea | **Bandas eléctricas** que arrastran en distinta dirección + escalera de andén | Rata del Túnel |
| 14 | Tlaquepaque · Callejón de las Sombrillas | Mapa ancho con **sombrillas rebotadoras** | Murciélago del Callejón |

- Fondos de Azoteas, Línea 3 y Tlaquepaque: procedurales (Azoteas usa las capas pixel-art de tu
  `atlas_parallax_city.webp`, sin la fila de tiendas). Si después generas fondos propios, basta poner
  `file:` en `js/core/levels.js`: las plataformas ya no dependen del dibujo.
- Variedad: los niveles que repetían el mismo mapa ahora alternan con su **versión espejo**
  (antes un mismo mapa se repetía 6 veces y otro 5).
- Cada nivel nuevo tiene capítulo, letrero, zona inferior con llave y reja, y aparece marcado con ★.

## 3. Opciones (⚙ TODAS LAS OPCIONES en el menú y en la pausa; se guardan en el dispositivo)
Dificultad · Modo relajado (los golpes empujan pero no quitan vidas) · Gatitas distraen enemigos ·
Anillo de aterrizaje · Práctica con todos los tramos · Cinemáticas ver/saltar · Volumen de música y de
efectos (0–100 %) · Vibración · Cámara cerca/normal/lejos · Sacudida de pantalla normal/suave/no ·
Tamaño de botones · Controles para zurdos · Mostrar FPS · Borrar progreso (pide confirmación).

## Pruebas ejecutadas
- `node --test tests/*.test.js`: **66/66** (las 56 anteriores, adaptadas de 12 a 16 niveles, + 10 nuevas en
  `tests/v50.test.js`: tejas flojas y coyote time, bandas, sombrillas, patada aérea, jefes que se recuperan,
  contraataque y bloqueo de frente, premio por jefe y modo relajado, datos de los 16 tramos, plataformas
  visibles y arenas de jefe).
- **Alcanzabilidad con la física real** (`tests/reach.js`) en Fácil, Normal y Difícil: meta alcanzable
  sin daño desde el inicio y desde las 16 paradas, 6 objetos, 16 llaves, 16 nichos, 16 zonas inferiores,
  0 trampas.
- Bot de combate en los 16 jefes × 3 dificultades (salta la embestida y castiga el mareo): los jefes se
  vencen en 3–30 s; los casos que no cerró el bot fueron por caer de la arena, no por jefes imposibles.
- Navegador headless (Chromium, 390×844 y 844×390): 0 errores de consola; partida aleatoria de 900
  pasos en cada uno de los 16 tramos con todos los estados de Sofía; menú de opciones probado opción
  por opción (cambia, persiste y se aplica).
- No probado en un teléfono físico.

## Notas honestas
- Los fondos de Azoteas, Línea 3 y Tlaquepaque son procedurales: se ven bien detrás de las plataformas,
  pero son más sencillos que tus ilustraciones. Si generas fondos para ellos, solo cambia `bg:` por `file:`.
- Los 12 niveles anteriores siguen usando 2 trazados base (ahora alternados con su espejo); los 4 nuevos
  tienen geometría propia. Se puede seguir variando con la guía de `tools/README.md`.
- Se conservaron los frames y fondos originales; lo nuevo está en `assets/player/sofia/`,
  `assets/enemies/v50/` y `assets/platforms/`.
- Archivos sin uso que ya venían en el paquete y no se borraron: `assets/player/atlas_player.webp`
  (personaje de otro juego) y `assets/backgrounds/atlas_parallax_gdl.webp` / `atlas_parallax_calle.webp`.
- Las herramientas usadas (recorte de texturas, frames, bots y pruebas de navegador) están en `tools/`.
