# QA — Cinemática Parafalls Roblox

**Base:** `V58.8.1_master/Se_Me_Fue_El_Camion_V58.8.1` (HTML5/Canvas). La carpeta no es un checkout Git; se conservaron los archivos existentes y se hizo una copia temporal previa de los módulos editados. No se creó ZIP/APK ni se publicó.

## Integración

Se añadió `PARAFALLS` al manifiesto y al reproductor existente: apertura entre cascadas, revelación del portal y llegada al mundo Roblox. Se conectó al primer inicio del tramo 0 de la misión de índice 4; al terminar o saltar se guarda `camion-cinematic-parafalls-seen`. Tras verla aparece **PORTAL DE PARAFALLS** para replay. La opción global de cinemáticas y los controles de omitir/avanzar siguen vigentes.

La secuencia está rotulada **ADAPTACIÓN DEL ARTE CONCEPTUAL**. Usa los beats compatibles de los storyboards, sin declarar una escena inventada como canon. La hoja de Sofía con artefactos (37164) se dejó fuera del runtime. Sofía, Luna y Morita usan recortes exactos de sus atlas Roblox activos; Papito usa una nueva pose con transparencia, preparada a partir del material conceptual disponible. Los PNG originales de los fondos y de Papito se conservan como masters; el runtime usa WebP. No se reutilizan duplicados para simular poses: Sofía tiene tres cuadros fuente distintos y las gatas dos cuadros idle cada una.

## QA ejecutado

- `node --test`: **79/79 pruebas aprobadas** (suite completa).
- `node --check`: manifiesto, reproductor, `main.js`, Service Worker y prueba añadida, sin errores de sintaxis.
- Prueba focalizada de cinemática y regresiones de transición/atlas: **7/7**.
- Validador del manifiesto: **10 rutas runtime presentes, 0 ausentes**.
- Chromium con el entry point real: selección de Parafalls desde menú en un perfil de prueba aislado; abrió la primera escena al iniciar la misión y no registró errores JavaScript. Reproducción directa: las tres escenas cargaron sus cuadros y el cierre ofrece el rótulo de inicio.
- Revisión visual de Chromium en escritorio `1280×720` y viewport estrecho `390×844`; la composición, el cuadro de diálogo y los controles se muestran. Evidencia: [primera escena en Chromium](parafalls_cinematic_first_scene.png).
- Service Worker actualizado a `camion-v58-8-15-parafalls-cinematic`; sus diez recursos cinematográficos están en precache. Las pruebas de rutas/versiones coinciden.

## Límites

No se probó un teléfono Android físico, instalación PWA ni arranque offline. El viewport móvil es una comprobación de navegador de escritorio, no certificación de dispositivo. El juego completo y otras misiones quedan fuera de esta fase; tampoco se compiló APK.
