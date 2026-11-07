# V54 · Submarino y Espacio ampliados

## Nivel y física
- Cada mapa nuevo pasa de 760×1024 a 940×3072 unidades.
- Tres secciones continuas construidas reutilizando las superficies probadas V53; un inicio y una salida por mundo.
- 39 cristales principales por mapa; dificultad, colisiones, saltos y nado conservados.
- Alcanzabilidad verificada mediante ejecución del analizador real de tests/reach.js: fácil, normal y difícil, los 39 cristales accesibles, cero trampas y meta alcanzable.

## Parallax
- La imagen disponible por mundo se repite verticalmente con espejo para evitar cortes directos.
- Desplazamiento diferencial de imagen, puntos lejanos y partículas cercanas; se dibuja sobre el ancho total de los sectores, con recorte de cámara.
- Eliminadas las fachadas urbanas en los mundos especiales para respetar la temática.

## Sofía
- Submarino: se reutiliza el atlas complementario existente para movimiento terrestre; bajo el agua se conserva el nado de V52.
- Espacio: casco, escafandra y mochila superpuestos provisionalmente. El atlas auténtico de astronauta está pendiente de incorporarse al repositorio.
- Menú: botones ORIGINAL, UNIFORME, ROSA, BUZO y ASTRONAUTA visibles antes de jugar; selección persistente para Escuela y Guadalajara.

## Presentación y distribución
- Salida visual como escotilla submarina y módulo orbital; se preservan las reglas de meta existentes.
- Versionado 54.0.0 y nueva caché PWA para invalidar recursos V53.
- Pruebas de regresión añadidas: tests/v54.test.js.

## Limitaciones comprobables
- El fondo original de cada mundo ya estaba aplanado: el parallax combina esa imagen con capas de partículas, no recupera capas visuales de origen.
- La representación espacial es provisional, no el atlas espacial completo de Sofía.
- Falta validación visual con navegador y dispositivos físicos Android/PC.
