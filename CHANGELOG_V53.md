# V53 · El juego se separa en MISIONES y estrena dos mundos: Submarino y Espacial

## Misiones (separar lo que ya existía por mundos)
El juego ya no es una sola lista de 16 niveles: ahora son **cuatro misiones**, y en el menú se elige misión y después
la parada.

| # | Misión | Niveles |
|---|---|---|
| 1 | LA ESCUELA | los 3 niveles de tema escuela |
| 2 | GUADALAJARA | los 13 niveles de tema Guadalajara |
| 3 | EL SUBMARINO | **nuevo** · 1 nivel |
| 4 | EL ESPACIO | **nuevo** · 1 nivel |

- Las misiones 1 y 2 **reúnen los 16 niveles de siempre, sin cambiar su diseño ni su tuning**: se reparten por su
  tema. `buildWorld({ levels })` arma el mundo de cada misión a partir de su subconjunto (el motor ya lo soportaba).
- Cada nivel lleva un `storyIndex` (0–15): su capítulo, letrero y objeto perdido **siguen al nivel**, aunque la misión
  lo juegue en otra posición. Así la misión Guadalajara abre con “EL CENTRO DE GUADALAJARA”, no con el texto del tramo 1.
- Progreso por misión: completar una deja todas sus paradas abiertas y **desbloquea la siguiente**. La opción
  “Práctica: todos los tramos” sigue abriendo todo. (`save.missions`; se conserva `save.unlocked` por compatibilidad.)

## Mundo nuevo · EL SUBMARINO (misión 3)
- **Fondo:** las 7 capas del parallax marino aplanadas en `assets/scenes/generated/submarino_fondo.png` (ruinas,
  corales, fauna, cofre, estatua de Poseidón).
- **Se juega con el nado de V52:** hay una **poza profunda**; se bucea (↓) por dos cristales del fondo y se sale nadando
  a la orilla. El resto es descenso por arrecifes y ruinas, con tablones y una tarima móvil.
- **Gatitas submarinas:** Luna y Morita aparecen con **casco y tanque** en este mundo (variante por tema, del kit
  Luna/Morita submarinas). Como en V52, no nadan: esperan en la orilla mientras Sofía bucea.
- Jefe: GUARDIÁN DEL ARRECIFE.

## Mundo nuevo · EL ESPACIO (misión 4)
- **Fondo:** el parallax lunar (órbita/estación) aplanado en `assets/scenes/generated/espacial_fondo.png` (módulos de
  estación, asteroides, la Tierra y la Luna).
- **Se juega** saltando entre asteroides y pasarelas (tablones) con tarimas a la deriva (plataformas móviles).
- Jefe final: DRON CENTINELA.

## Personajes · variantes
- **Sofía buceando:** en el submarino usa su traje de buceo turquesa (el atlas de nado de V52) de forma automática al
  entrar al agua. Se dejó además, lista en el proyecto, la hoja complementaria de Sofía submarina.
- **Luna y Morita submarinas:** integradas y usadas en la misión 3 (6 cuadros de reposo, 4 de caminar y uno de hombro
  por gata, reescalados a 224 px para compartir la escala de las gatitas de tierra).
- **Aspecto de Sofía (ropa en tierra):** nueva opción en Ajustes → "Aspecto de Sofía": **ORIGINAL / UNIFORME / ROSA**.
  Las variantes `uniforme` y `rosa` del paquete venían con los 15 cuadros que usa el motor, a 192×224 (idénticas al
  original), así que entran como reemplazo directo compartiendo las anclas de `NS.ART.SOFIA`. Se precargan y se guardan
  como el resto de las opciones. (La variante de invierno venía incompleta —otro esquema de nombres, faltan 6 cuadros—,
  queda en reserva.)

## Cómo se verificó (física real, no a ojo)
- **Alcanzabilidad de los dos niveles nuevos en las 3 dificultades** (`tools/qa/check_new_levels.js` y
  `tests/reach.js`): se llega a la meta, se recogen **todos** los cristales (incluidos los del fondo buceando) y no hay
  trampas sin salida. Cristales: Submarino 32/36/30 (fácil/normal/difícil), Espacial 33/33/29.
- **Las 4 misiones** pasan alcanzabilidad completa en normal (meta, todas las paradas, objetos y cristales, sin
  trampas).
- **Agua del submarino:** profunda, ninguna plataforma dentro y cada orilla con salida (mismas reglas que V52).
- `node --test tests/*.test.js`: **93 de 93** — las 85 de V52 intactas (el mundo por defecto sigue siendo la secuencia
  completa de 16, por eso no cambió ninguna) más 8 nuevas en `tests/v53.test.js` (misiones, storyIndex, integridad de
  los mapas nuevos, los dos niveles jugables en 3 dificultades, agua, desbloqueo por misión y precarga).
- Versión coherente HTML / service worker / configuración en **53.0**; caché `camion-v53-mundos`. El service worker
  precarga además los dos fondos nuevos y las gatitas submarinas.
- Humo de la capa DOM del menú (4 misiones, rejilla por misión, el clic arranca la misión y parada correctas).

## Notas honestas
- **Parallax plano, por ahora.** Los fondos nuevos son las capas del parallax **aplanadas** en un PNG (se ven con el
  mismo paralaje suave y velo que los niveles anchos tipo Tlaquepaque). El movimiento por capas de verdad queda para una
  iteración. Los recortes de las capas traían bandas: se notan costuras tenues en el fondo submarino.
- **Meta y música heredadas.** Los dos mundos nuevos terminan en el camión (la meta del motor) y, sin pistas propias,
  usan la ambientación de ciudad. Una meta temática (escotilla / módulo) y música propia quedan pendientes.
- **Invierno pendiente.** La variante de Sofía de invierno no entró: usa otro esquema de nombres y le faltan 6 de los
  15 cuadros (air, dos kicks y los tres de festejo). Habría que mapear/rellenar esos cuadros para añadirla a la opción.
- Sin teléfono físico: todo es emulación, como en V52.
