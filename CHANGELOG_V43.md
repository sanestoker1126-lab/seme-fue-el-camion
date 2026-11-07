# V43 — El niño (jefe) con sprites reales

## Qué se hizo
- Se recortó la lámina del niño (fondo cuadriculado quitado con chroma-key +
  relleno desde los bordes) y se extrajeron **frames completos y limpios** por
  estado: **idle (6), caminar (6), alerta/preparar (5), recibir golpe (3),
  morir (3)** → `assets/enemies/nino/`.
- `render.js` ahora dibuja al niño con esos **sprites** en vez del muñeco
  vectorial. Mapeo de estados del jefe embestidor:
  patrulla→caminar, windup→alerta, carga→caminar rápido, mareo→idle,
  golpe→recibir golpe, muerte→morir. Voltea según la dirección.
- **Respaldo**: si los sprites aún no cargan, usa el dibujo vectorial de antes
  (no se rompe nada).

## Notas
- El niño en el juego **embiste** (no lanza piedras), por eso no se usaron las
  filas de "lanzar/recoger piedra" de la lámina. Si luego quieres que lance
  piedras, se agregan esos frames y se cambia su IA.
- Faltan por integrar, si quieres: **ratas** y **perro negro** (láminas aparte).

## Verificación
- `render.js` sin errores de sintaxis; el juego carga con **0 errores** en
  navegador headless en todas las corridas.
- Prueba de render con la misma escala/anclaje/volteo reales: los 5 estados se
  dibujan completos, anclados al piso y bien escalados; "morir" queda acostado.
- Cache-busting a `v=43.0`, caché `camion-v43-gatos-autonomos`.
