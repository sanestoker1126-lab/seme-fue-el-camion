# Informe QA — ¡Se me fue el camión! V58.8.17

**Fecha:** 27 de noviembre de 2026  
**Base:** `V58.8.1_master/Se_Me_Fue_El_Camion_V58.8.1`  
**Estado del checkout:** carpeta de trabajo sin repositorio Git; se conservaron los cambios previos y se creó respaldo antes del pulido visual.  
**Estado de entrega:** candidata de trabajo (RC), no declarada Release.

## Cambios integrados

- En los resultados de una misión sin objetos de mochila, el juego ya no muestra el mensaje de mochila completa y no concede la estrella de colección por comparar `0/0`. Las misiones con objetivos conservan la lógica existente.
- El prólogo especifica que la historia principal contiene cuatro misiones y que Parafalls es una misión adicional desbloqueada después del espacio; no presenta esa misión como parte del relato principal.
- La quinta tarjeta del selector (M5, Cascadas del Cielo/Parafalls) se centra debajo de las dos columnas existentes, sin cambiar el orden ni el tamaño de las otras tarjetas.
- Se versionaron los módulos JS actualizados en 58.8.16. Para el retoque CSS, la hoja pasó a `?v=58.8.17` y el Service Worker a `camion-v58-8-17-parafalls-results`; HTML, precache y tests están alineados.
- No se sustituyeron ni generaron personajes, atlas, fondos o historia. Se conservaron los recursos del proyecto.

## Archivos modificados en esta fase

`js/core/story.js`, `js/core/game.js`, `js/app/ui.js`, `Se_Me_Fue_El_Camion.html`, `sw.js`, `css/toxifamilia_style.css`, `tests/no_item_results.test.js`, `tests/parafalls_v2.test.js`, `tests/parafalls_cinematic.test.js`, `tests/parafalls_roblox_atlases.test.js` y `tests/guadalajara_transition.test.js`.

Respaldos previos disponibles en `backups/2026-11-27_pre_no-items-ending` y `backups/2026-11-27_pre_menu-card-center`. El segundo contiene un manifiesto `SHA256SUMS`.

## Verificado

| Área | Evidencia y resultado |
|---|---|
| Regresión automatizada | `node --test`: **82 aprobadas, 0 fallidas**, suite completada en aproximadamente 2.7 s. |
| Sintaxis | `node --check` en todos los JavaScript de `js/` y `tests/`: correcto. |
| Higiene y caché | Sin espacios finales en los directorios/archivos comprobados. HTML, CSS, precache SW y clave de caché 58.8.17 coherentes. |
| Selector de misiones | Chromium QA, viewport 1280×1100: 5 tarjetas; CSS `toxifamilia_style.css?v=58.8.17` cargada; M5 centrada con desviación horizontal **0 px** y sin desbordamiento. |
| Prólogo | Chromium QA: el tercer panel se renderiza visible (900×720) y muestra el texto actualizado de las cuatro misiones principales y Parafalls adicional. |
| Parafalls — geometría | Tests verifican tres páginas, superficies colisionables invisibles, checkpoints/salidas únicos y ausencia de peldaños artificiales entre páginas. |
| Parafalls — alcanzabilidad | La prueba recorre posibilidades con la física real a 1/60 s y verifica que las salidas de las tres páginas y los dos checkpoints posteriores sean alcanzables desde el inicio. |

## Pendiente / no verificado

- **Parafalls:** se confirmó que la misión no declara jefe final y que sus tres cámaras laterales son cámaras genéricas de alcantarilla, no salas secretas temáticas. No se inventó un jefe ni se sustituyó el diseño: falta decidir y aprobar contenido/arte antes de una ampliación narrativa.
- La prueba de alcanzabilidad es automatizada sobre la física y las superficies; **no** es una partida end-to-end en navegador que compruebe transición de victoria, desbloqueo y guardado persistente de Parafalls.
- El viewport validado del selector fue escritorio. El comportamiento táctil en un Android físico y la composición móvil no se certifican con esta comprobación.
- Instalación PWA, actualización del Service Worker y funcionamiento offline siguen pendientes. El modo `?qa=1` evita registrar el Service Worker; aquí se verificaron solo sus referencias y versión estáticas.
- No se midió un perfil de rendimiento sostenido de 60 FPS en dispositivos objetivo.
- No se construyó ni verificó APK. Tampoco se generó paquete ZIP en esta fase; por ello este informe no certifica distribución final.

## Dictamen

Los defectos de resultados sin objetos, coherencia del prólogo y alineación de M5 quedan **resueltos con evidencia** en esta candidata. Las pruebas automáticas pasan, pero las verificaciones de Android, PWA/offline, rendimiento objetivo y cierre de Parafalls continúan pendientes; por tanto, **no se declara terminado ni Release**.

**Entrada del juego:** `Se_Me_Fue_El_Camion.html`  
**Versión efectiva de esta fase:** 58.8.17 (con los módulos JS de resultados/historia en 58.8.16).
