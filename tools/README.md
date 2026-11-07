# Herramientas (V52)

No las necesita el juego para correr; sirven para repetir o ampliar el trabajo.
`<raíz>` es la carpeta del juego (la que tiene `Se_Me_Fue_El_Camion.html`); con la terminal ahí, usa `.`.

## niveles/ (Node 18+, sin dependencias)
- `level_check.js <raíz> <índice|NOMBRE_DEL_MAPA> [facil,normal,dificil]` — arma un mundo con ese único nivel
  y corre el analizador de alcanzabilidad con la física real (meta, paradas, llave, nicho, zona inferior,
  trampas y ancho de la arena del jefe). Tarda menos de un segundo por dificultad.
- `gem_check.js <raíz> [índices] [dificultad]` — comprueba que cada cristal se pueda recoger (sonda que sigue
  los saltos y caídas simulados con la regla de recogida del juego).
- `dump_maps.js <raíz> mapas.json` + `map_png.py mapas.json NOMBRE_DEL_MAPA salida.png` — dibuja un mapa
  (superficies, escaleras, tablones, tejas, bandas, sombrillas, tarimas, cristales, inicio y salida).

## arte/ · atlas de nado (V52; Python 3 + Pillow + NumPy + SciPy + OpenCV)
Los atlas originales están en `arte/fuentes_nado/`. Son RGB con un tablero de ajedrez PINTADO como "fondo
transparente", cuadros sobre paneles de agua y números encima: por eso no se cortan por cuadrícula.
1. `python3 -I swim_extract.py fuentes_nado/atlas_nado_a.png fuentes_nado/atlas_nado_b.png cuadros/` — extrae cada
   cuadro por su CONTORNO: quita el tablero (`bgmask.py`: relleno con barrera para no comerse la ropa blanca, y
   huecos con textura de tablero), encuentra a cada Sofía por sus colores propios (cabello, piel, falda, astas),
   la recorta del agua con GrabCut, quita los números y las orillas claras, y en los cuadros de superficie corta en
   la línea donde el agua toca el cuerpo (guardada en `manifest.json`).
2. `python3 -I swim_contact.py cuadros/ hoja.png [secciones]` — hoja de contacto para revisar.
3. `python3 -I swim_pack.py cuadros/ swim_atlas.png swim_atlas.json ../../assets/player/sofia/idle_01.png` — elige
   los cuadros de cada animación (tabla `ANIMS`), refleja los que miran a la izquierda, mide la escala por el tamaño
   de la cara frente a `idle_01` (`facesize.py`), calcula anclas y empaca la hoja.
4. `python3 -I gen_art_data.py sofia_frames.json enemies_frames.json skins.json swim_atlas.json ../../js/app/art_data.js`.
Repetir 1 y 3 con los mismos atlas da exactamente el mismo `swim_atlas.png` (comprobado).

## arte/ (Python 3 + Pillow + NumPy)
- `cut_skins.py <plataformas_referencia.png> <salida/> <preview.png>` — recorta las texturas de plataforma
  (quita el fondo oscuro por relleno desde el borde) y calcula la fila pisable de cada una (`skins.json`).
- `plank_skin.py <wood_table.png> <plank.png>` — V51: deriva la textura del tablón (las tablas de la mesa).
- `sofia_antlers.py` / `sofia_build.py <nina_frames/> antlers.png antler_params.json <salida/>` — arma el juego
  de frames de Sofía: recolorea la falda verde de `kick_01`, pone las astas en los frames que no las tenían
  (posiciones en `antler_params.json`), limpia motas sueltas y mide escala de cabeza y anclas (`sofia_frames.json`).
- `enemy_build.py <assets/enemies/> <salida/>` — elige los frames completos de niño/rata/perro, limpia la
  cola suelta de la rata y las manchas del perro, y calcula anclas (`enemies_frames.json`).
- `gen_art_data.py sofia_frames.json enemies_frames.json skins.json js/app/art_data.js` — vuelca esos
  metadatos al juego (no edites `art_data.js` a mano).
- `frame_stats.py <carpeta>` y `contact.py` — estadísticas y hojas de contacto para revisar frames.

## qa/ (Node 18+; los de navegador necesitan `npm i playwright`)
Sirve el juego con cualquier servidor estático (p. ej. `python3 -m http.server 8000`) y pasa la URL de la carpeta
(`http://localhost:8000`, sin `Se_Me_Fue_El_Camion.html`).
- `swim_shots.js <url> <salida/>` — V52: capturas de cada estado de nado (lago del Parque, pila de la Plaza).
- `swim_touch.js <url>` — V52: nadar con toques reales (bucear en diagonal, subir, DASH bajo el agua, salir).
- `fuzz_agua.js <url> [pasos]` — V52: partida aleatoria dentro del lago y de la pila (errores, estados de nado vistos).
- `perf_agua.js <url> [1,4,6] [segundos]` — V52: como `perf_test.js`, pero con Sofía nadando en el lago del Parque y
  vadeando en la pila de la Plaza (para medir el costo de dibujar el agua, compara contra una copia sin `drawWaters`).
- `offline_test.js <url>` — registra el service worker, corta la red y comprueba que el juego carga y se juega.
- `touch_test.js <url>` — V51: teléfono emulado con toques reales (joystick, botones, 3 dedos a la vez,
  cancelación del sistema, pausa justo después de un gesto, página sin desplazamiento ni zoom) y acomodo de
  los controles en 24 configuraciones (vertical/horizontal, chico/normal/grande, zurdo).
- `perf_test.js <url> [1,4,6] [niveles] [segundos]` — V51: FPS con la CPU frenada ×N, intervalo p95, ms de
  simulación y dibujo, y calidad adaptativa. Chromium sin pantalla dibuja por software: es una cota pesimista.
- `losttap_matrix.js` — reproduce el toque perdido después de un arrastre (compara dos servidores).
- `paint_bg.js <url> <salida/>` — exporta los fondos procedurales (azoteas, metro, Tlaquepaque) a PNG.
- `quick_reach.js <raíz> [facil|normal|dificil]` — informe rápido de alcanzabilidad de los 16 niveles.
- `boss_bot2.js <raíz> [índices]` — bot que pelea contra los jefes en las 3 dificultades.
- `shots.js`, `qa_states.js`, `qa_ui.js`, `fuzz.js` — capturas por tramo, estados de Sofía y mecánicas,
  menú de opciones y partida aleatoria; uso: `node shots.js http://localhost:8000 salida 390 844`.

## Crear un nivel nuevo
1. Agrega un mapa en `js/core/levels.js` (superficies con un `start` y un `exit` amplio, `exitX`, al menos
   10 cristales y, si quieres, `stairs`, `planks`, `movers`, `crumbles`, `belts`, `bouncers`, `pigeons` y
   `water`: agua profunda ≥ 86 u de mapa para nadar, con pared (`banks`) o suelo a la altura del agua en cada lado;
   su fondo es sólido, así que deja espacio de salto si hay una arena debajo).
2. Agrégalo a `LEVEL_SEQUENCE` con `file:` (cualquier fondo) o `bg:` (procedural) y un `skin`.
3. Agrega su capítulo y letrero en `js/core/story.js` (mismo índice).
4. `node tools/niveles/level_check.js . <índice>` mientras lo diseñas (rápido) y al final
   `node --test tests/*.test.js` (mundo completo: alcanzabilidad, cristales, integridad de mapas y precarga).
