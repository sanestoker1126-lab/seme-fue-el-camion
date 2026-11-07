# V46 — Optimización de rendimiento (Android)

## Resolución adaptativa
- El juego mide el tiempo de fotograma y **ajusta la resolución de render solo**:
  si el promedio pasa de ~21 ms (menos de ~47 fps) baja la calidad (hasta 0.6×)
  para recuperar fluidez; si el equipo va sobrado, la vuelve a subir hasta 1×.
  Se nota menos "trabado" en gama media sin cambiar la jugabilidad.

## Texturas más livianas (lo que más pesaba en RAM)
Estaban muchísimo más grandes de lo que se ve en pantalla. Reescaladas (solo
runtime, el arte fuente se conserva):
- **Camión**: 2304×1536 → 512 px (se ve a ~140 px). De ~12 MB a ~0.5 MB.
- **Gatos (Luna/Morita)**: 512×512 → 224 px (se ven a ~40 px).
- **Escenas generadas**: 1440×2560 y la de SOFEVI 3344×941 → máx 1920 px.
- En memoria decodificada esto baja la textura de ~160 MB a ~50 MB: **~110 MB
  menos**, que era la causa principal de tirones/GC en Android.

## Menos tirones al aparecer enemigos
- Los sprites (niño/rata/perro) y las escenas se **pre-decodifican** al cargar,
  así no hay un salto la primera vez que aparecen.

## Entrega
- Cache-busting `v=46.0`, caché `camion-v46-gatos-autonomos`. Paquete solo del
  juego, sin arte crudo ni archivos de otros juegos.
