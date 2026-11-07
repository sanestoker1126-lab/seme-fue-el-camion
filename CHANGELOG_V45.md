# V45 — Ratas y perro con sprites (enemigos integrados)

## Qué se hizo
- Se recortaron de su lámina (fondo cuadriculado quitado con chroma-key; además
  se borraron las **cajas de etiqueta** por ser negras/anchas/bajas, y se
  descartaron cuadros con **dos criaturas pegadas** y los strips de polvo/FX):
  - **Rata** → `assets/enemies/rat/`: caminar (3), alerta (4), golpe (4), morir (1).
  - **Perro negro** → `assets/enemies/dog/`: caminar (4), furia/alerta (3), morir (1).
- El render de enemigos se **generalizó**: una sola tabla (`ESPR`) y
  `drawEnemySprite` dibujan **niño, rata y perro** con sprites, con **respaldos**
  cuando falta un estado (p. ej. el perro usa su pose de furia al recibir golpe)
  y cayendo al dibujo vectorial si los sprites aún no cargan.
- El **perro bravo** (jefe) reutiliza los sprites del perro negro, más grande.

## Verificación
- `render.js` sin errores de sintaxis.
- Prueba de render con la escala/anclaje/volteo reales: niño, rata y perro se
  dibujan completos, anclados al piso y bien escalados.
- Arranque en el juego (headless): mundo con todo el roster
  (rata, perro, bravo, niño, chile, murciélago, paloma) y **0 errores** de consola.

## Entrega
- Paquete **solo del juego** (sin archivos de otros juegos ni arte crudo de
  origen). Cache-busting `v=45.0`, caché `camion-v45-gatos-autonomos`.

## Pendiente opcional
- Afinar frames de golpe del perro y sumar más cuadros de morir si se quiere.
