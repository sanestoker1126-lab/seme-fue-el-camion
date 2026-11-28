# V58.8.21 RC · Edición visual

Base: ZIP V58.8.20 RC. No se cambia el motor, mapas, progresión, IA, colisiones ni atlas de personajes. Se ha aplicado una fase de arte y UI.

## Cambios
- Selector ilustrado de los cinco mundos, miniaturas WebP independientes y vista del mundo seleccionado. 21 paradas accesibles.
- HUD temático: indicador de descenso relativo al tramo, cristales/vida, aviso superior de capítulo, controles de acción diferenciados por color.
- Acabado Canvas: luz ambiente detrás de la geometría, borde de contacto sobre plataformas dibujadas (máximo 48 por cuadro), halos de cristales visibles (máximo 24, omitidos en calidad baja), sombra de contacto de Sofía.
- 22 imágenes WebP existentes con ajuste moderado de color, contraste y nitidez; dimensiones y posiciones exactas conservadas. Los 22 fondos pasan de 11,489,848 a 11,192,684 bytes; 8 miniaturas/figuras UI añaden 417,116 bytes.
- Nueva versión de caché y precarga de las 8 imágenes nuevas. Sin librerías externas, filtros CSS en tiempo real ni nuevas texturas grandes duplicadas.

## Verificado
- `node --test tests/*.test.js`: 122/122 correctas (véase archivo de salida).
- Identidad byte a byte de 12 archivos js/core y 321 archivos de player, enemies, companions y production (sin cambios de física ni atlas).
- Se cargó el código real en Chromium en un harness local en memoria; se inyectaron los archivos locales como data URL para evitar la restricción de navegación URL del entorno. Menú y cinco partidas de inicio renderizados. Vistas 844x390, 390x844 y 1280x720; 21 paradas disponibles en cada vista, sin errores JavaScript ni recursos de imagen dinámicos faltantes en esta muestra. El harness usa el modo QA manual y no prueba el registro real del service worker.
- Los tamaños y SHA-256 de los fondos constan en `reports/visual_assets_v58_8_21.json`; resultados visuales estructurados en `reports/qa_visual_v58_8_21.json`.

## Pendiente
- Android físico, FPS sostenidos, sesión end-to-end por cada tramo, instalación PWA real y revisión completa de cinemáticas. El motor y la historia de V58.8.20 permanecen. No se han creado nuevos frames de personajes ni reconstruido el salón en esta fase. Los ajustes de nitidez no aumentan la resolución nativa.
