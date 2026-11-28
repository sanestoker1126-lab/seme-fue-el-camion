# ¡Se me fue el camión! — Revisión jugable V58.8.19

La candidata reúne las cinco misiones en una carpeta que se puede servir por HTTP. Parte de la V58.8.18 consolidada. La suite incluida se ejecuta desde esa carpeta con `node --test tests/*.test.js`.

## Comprobación tramo por tramo

Cada fila corresponde a una entrada independiente en navegador, en dificultad normal. Se cuentan las superficies del mapa y los enemigos de su ruta principal. La última columna mide en unidades del motor la separación vertical entre los pies de Sofía y el punto de apoyo en reposo. La suite repite las comprobaciones de terreno, posición inicial de las gatas y hábitat en fácil, normal y difícil.

| Mundo | Tramo | Escenario | Superficies | Enemigos | Separación al suelo |
| --- | ---: | --- | ---: | ---: | ---: |
| Escuela | 1 | La escuela | 16 | 8 | 0 |
| Escuela | 2 | El patio de la secundaria | 15 | 12 | 0 |
| Escuela | 3 | Pasillos de la escuela bajo la lluvia | 15 | 17 | 0 |
| Guadalajara | 1 | El centro de Guadalajara | 8 | 12 | 0 |
| Guadalajara | 2 | Colonias de Guadalajara de noche | 26 | 17 | 0 |
| Guadalajara | 3 | Azoteas de la colonia | 27 | 17 | 0 |
| Guadalajara | 4 | Centro histórico de Guadalajara | 29 | 19 | 0 |
| Guadalajara | 5 | Guadalajara, Jalisco · los portales | 25 | 19 | 0 |
| Guadalajara | 6 | Zapopan · plaza de las Américas | 28 | 21 | 0 |
| Guadalajara | 7 | Terminal de Guadalajara al amanecer | 23 | 22 | 0 |
| Guadalajara | 8 | Línea 3 · estación subterránea | 26 | 22 | 0 |
| Guadalajara | 9 | Mercado tapatío al amanecer | 21 | 22 | 0 |
| Guadalajara | 10 | Parque metropolitano al atardecer | 22 | 25 | 0 |
| Guadalajara | 11 | Tlaquepaque · callejón de las sombrillas | 12 | 21 | 0 |
| Guadalajara | 12 | Andén del tren ligero | 24 | 25 | 0 |
| Guadalajara | 13 | Plaza de las jacarandas · final | 34 | 27 | 0 |
| Submarino | 1 | Canal · bosque de algas · fosa azul | 18 | 28 | 0 |
| Espacio | 1 | Luna hueca | 56 | 31 | 0 |
| Parafalls | 1 | El descenso inicial | 15 | 2 | 0 |
| Parafalls | 2 | Las cascadas medias | 17 | 2 | 0 |
| Parafalls | 3 | La plataforma final | 15 | 2 | 0 |

## Las cinco llegadas

- **Escuela.** El prólogo desemboca en la azotea jugable. Sofía, Luna y Morita terminan sobre la superficie donde se entrega el control. Los nombres y el diálogo tienen su propio espacio en pantalla.
- **Guadalajara.** El recorrido en camión enlaza con la terraza de entrada. Los sectores urbanos con fondo pintado muestran la cara superior y los soportes de los balcones a la altura de la colisión. Las patrullas aéreas dejan libres los puntos de reaparición.
- **Submarino.** El recuerdo en la isla enlaza con el muelle seco. Sofía puede quedarse ahí, caminar al borde y sumergirse. Al cruzar la superficie se activa el traje de buceo.
- **Espacio.** Una nueva introducción enlaza con la cubierta de Luna Hueca. La última toma usa la cámara, la plataforma y los personajes del escenario jugable.
- **Parafalls.** La transformación de Sofía con Estoker enlaza con la primera cascada. Los seis guardianes patrullan repisas concretas, anuncian su carga, atacan y se recuperan. La meta del tercer tramo es el portal de la repisa circular. La gruta lateral usa los enemigos de este mundo.

## Imagen, memoria y pruebas

- Los siete fondos urbanos convertidos a WebP conservan sus dimensiones de origen. En conjunto pasan de 13.590.523 a 2.361.834 bytes para el navegador. Los PNG de origen se conservan en el paquete de proyecto.
- El menú carga primero el escenario inicial. El renderizador limita la resolución interna según el dispositivo y descarta páginas de mundos anteriores. En una medición local del menú a 390 × 844, sin precarga sin conexión y con una ventana de 3,5 segundos, se completaron 13 solicitudes de imagen frente a 215 en la V58.8.18.
- 117 pruebas de JavaScript aprobadas. Se verificaron las cinco llegadas en Chromium con vistas de 390 × 844, 844 × 390 y 1280 × 720, además de teclado, controles táctiles simulados y cambios de orientación.
- La campaña partió de un perfil nuevo, recorrió los 21 tramos y guardó las cinco victorias. Escuela, Guadalajara, Submarino y Espacio se recorrieron con el modo relajado activado. Parafalls se completó en dificultad normal con el modo relajado desactivado.
- El juego instaló la caché y volvió a abrir la Escuela con el servidor apagado. El ensayo móvil se hizo en Chromium de escritorio con dimensiones y entrada táctil emuladas. Queda pendiente medir memoria y FPS sostenidos en un Android físico.
- Sofía Roblox conserva los ciclos de caminar y correr que ya jugaban en la candidata. Los ciclos nuevos siguen pendientes de animación y limpieza.
