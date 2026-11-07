# V41 — Nivel ANCHO en zig-zag (prototipo "SOFEVI")

## Qué se hizo
- Se añadió un **mapa ancho con descenso en serpentina**: bajas cruzando de un
  lado a otro (`SOFEVI_MAP`, 1600×450, aspecto 3.55). Cinco repisas que se
  traslapan en X; al salir por el borde de una, caes sobre la siguiente.
- Fondo **compuesto** de dos imágenes unidas en horizontal
  (`assets/scenes/generated/sofevi_centro_zigzag.png`, 3344×941).
- Como **prototipo**, este mapa reemplaza al **TRAMO 2 · "El Centro de
  Guadalajara"** (antes usaba el mapa vertical). Los otros 11 tramos no se
  tocaron. Convertirlo en un tramo NUEVO (sin reemplazar) es un paso chico.

## Verificación
- **Alcanzabilidad (física real, `tests/reach.js`)** en FÁCIL/NORMAL/DIFÍCIL:
  meta alcanzable desde el inicio, **0 trampas**, los **12 checkpoints** llegan
  a la meta, **0 problemas**. El recorrido en serpentina es transitable.
- 56/56 pruebas unitarias.
- Navegador headless: el tramo carga y se juega (`playing: true`), cero errores.

## Pendientes / notas honestas
- Las 5 repisas están puestas para garantizar un recorrido transitable, pero
  **no están calcadas sobre los tejados pintados** del fondo: se juega bien,
  pero visualmente las repisas no coinciden exactamente con la imagen. Se puede
  afinar la posición de cada repisa para que caiga sobre los techos, o trazar
  la colisión calcada al dibujo.
- Las dos imágenes unidas repiten el grafiti "SOFEVI" en la costura.

## Entrega
- Cache-busting a `v=41.0` y caché offline `camion-v41-gatos-autonomos`; el fondo
  compuesto entró al precache del SW.
