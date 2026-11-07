# V42 — Palomas-trampolín y repisas integradas (2.5D) en el nivel ancho

## Palomas-trampolín (en movimiento)
- Nuevo tipo de plataforma **`pigeon`**: palomas que se **mueven** (vuelo con vaivén)
  en las partes **altas** del nivel SOFEVI. Al **caer sobre ellas** te dan **impulso**
  hacia arriba (mismo rebote que el toldo: más alto si mantienes SALTAR).
- Colocadas en el cielo sobre la repisa superior; encima hay **gemas altas** de premio
  que se alcanzan rebotando.
- Motor: `physics.js` mueve e impulsa el tipo `pigeon`; `world.js` las construye desde
  el campo `pigeons` del mapa; `render.js` las dibuja aleteando.

## Repisas integradas a las casas (efecto 2.5D)
- Las repisas del nivel SOFEVI ya **no son barras sueltas ni invisibles**: se dibujan
  como **cornisas** con cara superior iluminada, sombra de profundidad y ménsulas, para
  que se lean como **parte de los edificios**. Se activan con el flag `ledges2d` del tramo,
  así los demás niveles no cambian.

## Verificación
- Alcanzabilidad (física real) en FÁCIL/NORMAL/DIFÍCIL: meta alcanzable, 0 trampas, 0 problemas.
- 56/56 pruebas unitarias.
- Navegador headless: carga y se juega sin errores; se ven las cornisas y las palomas.

## Notas
- Las palomas están en la zona más alta del nivel (sobre la repisa superior). Se pueden
  subir más o agregar más si se quiere.
- Cache-busting a `v=42.0`, caché `camion-v42-gatos-autonomos`.
