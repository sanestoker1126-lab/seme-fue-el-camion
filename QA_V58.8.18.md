# ¡Se me fue el camión! · V58.8.18 RC

## Jugar

El ZIP completo contiene el juego, su código, recursos y pruebas. Extráelo y abre una terminal en la carpeta donde veas `Se_Me_Fue_El_Camion.html`. En Windows puedes ejecutar `INICIAR_JUEGO.bat` con Python 3 instalado. En Linux o macOS puedes usar `sh INICIAR_JUEGO.sh`. En Android sirve esa misma carpeta con un servidor HTTP local.

También puedes iniciar el servidor con Python 3.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Abre `http://127.0.0.1:8000/Se_Me_Fue_El_Camion.html`. El modo sin conexión requiere una primera carga completa desde localhost o HTTPS. Mantén el mismo navegador, dirección y puerto al regresar para recuperar tu partida. Para instalar el parche incremental, extrae su contenido dentro de la carpeta que ya reúne las tres partes V58.8.17, junto al HTML principal.

## Cambios de esta candidata

- **Portada y juego sin conexión.** La entrada conserva la consulta y el fragmento del enlace. El Service Worker precarga 492 recursos únicos en grupos de cuatro, espera la descarga completa para activarse y descarta el caché parcial ante un fallo. El HTML de entrada y el módulo de arte de las zonas secretas apuntan a la misma versión que el precache. La carpeta del juego, `index.html` y el HTML principal se pueden volver a abrir con parámetros sin red.
- **Partida y guardado.** Práctica usa una copia del progreso durante la partida y el reintento. El selector recupera una misión disponible al salir de práctica. Las victorias de campaña muestran el botón para continuar al siguiente mundo. Al terminar una misión sin jefes ni objetos locales, los resultados omiten esos dos indicadores vacíos.
- **Cinemáticas.** El prólogo y Parafalls montan y retiran sus actores en el WebEngine probado, incluso al saltar la escena. Un encuentro con un jefe solo pausa la simulación si abre un panel de cinemática. El perro y el niño conservan sus escenas.
- **Arte.** Los 563 archivos bajo `assets/` son idénticos a los recibidos. Los PNG y JSON de Luna y Morita coinciden con los del paquete adicional. Parafalls usa la cinemática integrada de tres escenas. El otro reproductor adjunto y las láminas descartadas de Sofía quedaron fuera de esta entrega. Los ciclos nuevos de caminar y correr de Sofía Roblox siguen pendientes.

## Pruebas sobre los archivos recibidos y la revisión

| Comprobación | Resultado |
|---|---|
| Reconstrucción de la base | Las tres sumas SHA-256 coinciden con el manifiesto adjunto. Se combinaron 628 archivos, sin colisiones de nombre. |
| Suite de la candidata recibida | 82 pruebas aprobadas, 0 fallidas. |
| Suite de esta entrega | 92 pruebas aprobadas, 0 fallidas y 0 omitidas. Incluye recorridos con controles grabados, guardado de campaña y recuperación de descargas interrumpidas. |
| Sintaxis y recursos | 39 archivos JavaScript válidos. Se decodificaron 497 PNG/WebP de juego y 17 MP3 completos. Se analizaron los 7 SVG. |
| Navegador | Qt WebEngine 5.15.2, Chromium 83 en Linux. Se usaron perfiles de prueba independientes. La prueba de PWA se hizo con el modo QA desactivado. |
| PWA | Instalación y activación del Service Worker. Tras apagar el servidor HTTP, una navegación nueva por la carpeta abrió la portada, conservó los parámetros, cargó ocho imágenes representativas y recuperó 193 140 bytes del audio escolar. La Escuela volvió a arrancar. |
| Interfaz | Teclado para mover a Sofía, evento de puntero para saltar, pausa, reanudación y reintento. Selector y canvas medidos en 390×844, 844×390 y 1280×720, con cinco tarjetas, M5 centrada y sin desbordamiento horizontal del documento. |
| Fallos de carga | Cero respuestas HTTP 4xx/5xx en los dos recorridos de navegador de esta revisión y cero excepciones JavaScript sin capturar observadas en sus registros. |

## Recorrido desde una partida nueva

El navegador abrió el HTML del juego con una sola misión disponible y cero victorias. La prueba usó el selector, los botones de continuar y el paso de simulación de 1/60 s con entradas de movimiento y acción. La dificultad base fue normal. Para las cuatro misiones principales se activó el modo relajado del menú. Antes de jugar Parafalls se desactivó esa ayuda. El modo práctica estuvo apagado durante todo este recorrido. Los tiempos son de simulación.

| Misión | Tramos recorridos | Tiempo | Resultado |
|---|---:|---:|---|
| Escuela | 3 de 3 | 3 min 47,75 s | Superó la barda, derrotó a los tres jefes y abrió Guadalajara. |
| Guadalajara | 13 de 13 | 2 min 16,72 s | Llegó a la meta y abrió Submarino. |
| Submarino | 1 de 1 | 26,08 s | Alcanzó la escotilla y abrió Espacio. |
| Espacio | 1 de 1 | 42,85 s | Alcanzó el módulo y abrió Parafalls. |
| Parafalls | 3 de 3 | 23,03 s | Activó las dos paradas posteriores, pisó las tres salidas y llegó al camión con las tres vidas. |

Una recarga posterior mostró cinco victorias y las cinco misiones disponibles. Las paradas abiertas eran 3, 13, 1, 1 y 3 respectivamente. Se verificó por separado que iniciar una parada bloqueada en práctica, reintentar y salir conserva los desbloqueos de campaña.

Para repetir las pruebas de lógica desde la carpeta del juego, ejecuta `node --test` con Node.js. La verificación de entrega usó Node 24.22.3. Las entradas reproducibles están en `tests/fixtures/`. Las observaciones del navegador y los hashes del código están en `reports/qa_web_v58_8_18.json`.

## Alcance

La entrada confirmada fue la maestra V58.8.1 en fase V58.8.17, entregada como archivos sueltos bajo una raíz común. V58.8.18 conserva el estado de candidata web. Quedan por comprobar una partida completa de las primeras cuatro misiones con la ayuda relajada apagada, los finales opcionales, Android físico, instalación desde el sistema del teléfono, actualización de una PWA instalada en el teléfono, audio en altavoz real y rendimiento sostenido de 60 FPS. La distribución corresponde al juego HTML5.
