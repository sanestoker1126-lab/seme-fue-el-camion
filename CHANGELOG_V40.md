# V40 — Banda sonora de fondo, arranque más ágil y cinemática saltable

## Audio
- Se agregó la banda sonora `cancion_fondo_v40.mp3` (convertida del `.ogg` original,
  que también se incluye como `princesa_sofia_gameplay_mix_v40.ogg`).
- La música suena **de fondo, bajita** (`MUSIC_VOL = 0.16`) para que se alcancen a
  oír los efectos del juego, que van más fuertes (0.5–0.9).
- Con la canción real sonando, la melodía chiptune de respaldo ya **no se encima**:
  solo entra como fallback si el navegador bloquea el audio del archivo.

## Arranque
- La espera de carga al inicio bajó de **4 s a 1.5 s** (los gráficos que falten
  terminan de cargar durante la partida).
- La cinemática de intro avanza sola en **6 s por escena** (antes 8 s).

## Cinemática
- Se puede **saltar/avanzar tocando la pantalla** (fuera de los botones), tanto en
  la intro, como en la cinemática de jefe y en las pantallas de historia.
  Los botones SALTAR y SIGUIENTE siguen funcionando igual.

## Entrega
- Cache-busting de scripts/estilos a `v=40.0` y caché offline renombrada a
  `camion-v40-gatos-autonomos`; el `.mp3` de música entró al precache del SW.

## Verificación
- 56/56 pruebas (`node --test tests/*.test.js`).
- Prueba en navegador headless: arranca sin errores de consola, botón JUGAR activo,
  y el toque en pantalla avanza la cinemática (escena 0 → 1).
