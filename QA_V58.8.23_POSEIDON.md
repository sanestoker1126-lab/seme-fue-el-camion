# V58.8.23 — Arena de Poseidón
Base: V58.8.22. Tres escenarios marinos: isla, bosque, fosa. La tercera escena contiene la página original fosa_azul.webp sin cambios y una página adicional de santuario; no se añadió una cuarta parada.

- Arena ilustrada con composición de recursos originales: fosa_azul.webp y marino_oculto.webp; WebP 1536×2304, escala de mapa 768×1152, línea del piso y escotilla coordinadas.
- Poseidón de mayor tamaño, rango de nado acotado, embestida y ola anunciadas, recuperación de 1.65 s base, segunda fase, 8 puntos de vida en normal. Escotilla bloqueada hasta que muere.
- Agua continua entre las tres escenas, sin fondos invisibles en las uniones. Balizas, corazón y acceso al santuario secreto en la isla. Arena sin enemigos secundarios ni corrientes.
- Cinemática en tres secuencias con sprites originales y fondo del santuario; barra de vida de jefe y avisos de ataque. Se repite al descubrirlo en nueva partida si las cinemáticas están habilitadas.
- PWA: caché versionada y recurso nuevo incluido en precache.

## QA
126/126 pruebas Node aprobadas. Prueba de campaña: se recorren los tres tramos por simulación de entradas, se combate y vence a Poseidón y se alcanza la escotilla. Pruebas adicionales: bloqueo antes de victoria, anuncios previos, ola, recuperación, límites del jefe, agua sin barreras, recursos y ausencia de amenazas secundarias. Navegador Chromium: presentación de encuentro y arena en 844×390 y 390×844, sin errores JS ni imágenes faltantes en el harness local. Las capturas se toman situando a Sofía cerca de la arena para la prueba visual; no sustituyen la prueba de recorrido. No se probó en dispositivo Android físico ni se midieron FPS sostenidos. No se crearon sprites originales nuevos; se reutilizaron los existentes.
