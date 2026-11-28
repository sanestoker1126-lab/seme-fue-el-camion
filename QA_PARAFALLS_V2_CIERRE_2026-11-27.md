# QA de integración — Parafalls PRO V2

**Fecha de verificación:** 27 de noviembre de 2026 (UTC)  
**Base:** V58.8.1 escuela, carpeta `V58.8.1_master/Se_Me_Fue_El_Camion_V58.8.1`  
**Alcance:** cierre de duplicación de superficies, regresión de geometría y comprobación de runtime de la nueva misión. Esta carpeta no es un checkout Git; se conservó el respaldo previo existente.

## Corrección

En `js/core/levels.js`, `waterfallTrace()` agregaba otra vez los islotes `P01_ISLAND_*` que ya forman parte de `PARAFALLS_DATA.platforms`. Se retiró esa segunda inserción. En `tests/parafalls_v2.test.js`, la prueba ahora exige que la cantidad de superficies de cada tramo sea exactamente igual a la cantidad de plataformas declaradas, además de comprobar que cada declaración se transforma a una superficie runtime.

## Verificación

- `node --test`: **75 aprobadas, 0 fallidas, 0 omitidas** (2.724 s). Incluye trazado, duplicación, checkpoints y alcanzabilidad simulada con la física del motor.
- `node --check`: correcto para `levels.js`, `parafalls_data.js`, `render.js`, `main.js`, `world.js` y `story.js`.
- Revisión determinista de trailing whitespace: correcta en `levels.js` y `tests/parafalls_v2.test.js`.
- Chromium sandbox, entry point real con `?qa=1`: se inició la misión por API QA; runtime mostró escenas `parafalls_1`, `parafalls_2`, `parafalls_3` y 15 superficies en el primer tramo. No se observaron errores en el log de consola consultado.
- Captura representativa actual: `/home/ubuntu/screenshots/8765-ixcj3bg8dki45jp_2026-11-27_03-16-10_6865.webp`. El perfil sandbox de prueba se restauró después del desbloqueo temporal de la misión.

## Estado

**VERIFICADO:** defecto de superficies duplicadas corregido; suite y sintaxis aprobadas; misión cargada y renderizada en Chromium sandbox.  
**PENDIENTE:** activación y precarga del Service Worker en un contexto limpio (el smoke test usó `?qa=1`, que omite deliberadamente su registro); prueba en Android físico. No se creó ZIP ni APK, y no se declara el juego como lanzamiento final.
