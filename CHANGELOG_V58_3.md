# V58.3 · Sofía buceando solo en el agua y banda sonora del mar

## Sofía en el mundo marino
- **Fuera del agua** (la isla, saltos, caídas) usa sus **cuadros normales** con el vestuario elegido en el menú.
  Antes llevaba el traje de buzo también en tierra.
- **Dentro del agua** (nadando o vadeando) cambia **en ese mismo instante** a los cuadros de buceo de
  `assets/player/sofia/sofia_submarina_complementaria.png`. Antes nadaba con el atlas de nado de su ropa normal.
  Al salir del agua vuelve a los normales.
- Cada estado del agua usa su animación del atlas. Los cuadros, los ms y el pivote se sacan de su JSON, y una prueba
  los compara contra él:

| Estado del motor | Animación del atlas |
|---|---|
| flotar (`swimFloat`) | `float` |
| nadar en superficie / bajo el agua (`swim`, `swimUnder`) | `swim_horizontal` (con leve inclinación según suba o baje) |
| bajar / subir / subir en diagonal | `swim_down` / `swim_up` / `swim_up` |
| DASH nadando (`swimDash`) | `swim_fast` |
| patada nadando (`swimKick`) | `swim_fast` (**provisional**: el atlas no trae una patada submarina dibujada) |
| daño (`swimHurt`) | `hurt` |
| vadear quieta / caminando / corriendo | `idle` / `walk_floor` / `run_floor` |
| caer derrotada en el agua | `knockout` |
| festejo dentro del agua | `victory` |

- Nota del propio atlas: sus 103 cuadros están marcados como `derived_preview_not_hand_drawn` (poses originales
  reacomodadas, giradas o trasladadas), no como dibujos nuevos.
- Si en el menú se elige el vestuario **BUZO**, Sofía lo lleva también en tierra, porque así se pidió en el menú.

## Banda sonora del mar
- `assets/audio/mar_chinos_de_seda_fondo_v58_3.mp3`: «Chinos de Seda» (aportada por el autor), **solo del 1:30 al
  3:00** (90 s). Se procesó antes para que quede de fondo: paso alto en 45 Hz, paso bajo en 7 kHz, compresión suave
  (2:1), entrada de 2,5 s, salida de 4 s y normalización a **−23 LUFS**. Es unos 3 dB más baja que
  `cancion_fondo_v40` (−19,9 LUFS) y unos 9 dB más baja que ese tramo original (−14,1 LUFS). Suena en bucle, al
  volumen de música del juego.
- Solo suena en el mundo marino. Al entrar o salir hay un fundido corto con la canción de siempre.
- En el mar ya no suena el ambiente de calle de Guadalajara (tráfico bajo el agua).
- Si el juego se detiene a la mitad de un fundido, la pista que salía también se pausa. Antes podía seguir sonando.

## Otro gato
- Ya sonaba en el mar desde la V58.2: maúlla al descubrir un enemigo y al vencerlo, con 7 s de espera entre
  maullidos. Una prueba nueva comprueba con el motor que en el mar se descubren pirañas, tiburones y pulpos, y que
  ese evento hace sonar al otro gato.

## Comprobado
- 154/154 pruebas (`node --test tests/*.test.js`) y `node --check` en todo `js/`.
- En Chromium, misión 3: en la isla Sofía va con su ropa normal; al meterla al mar pasa a `swimUnder` en el primer
  paso y se dibuja con el traje de buceo. En la Luna se ve con el atlas de astronauta. Sin errores en la consola.
- **No comprobado**: cómo se oye en un teléfono real; el rendimiento en Android.

Versión 58.3.0, caché `camion-v58-3-buceo-y-banda-mar`.
