# QA V39

## Resultado

- `node --test tests/*.test.js`: **56 pruebas aprobadas, 0 fallidas**.
- `python3 tools/validate_v12.py`: **VALIDATION PASSED**; entry point, sintaxis, JSON y rutas del manifiesto de animación válidos.
- `node --check` en todos los módulos de `js/core/`, `js/app/` y `sw.js`: **correcto**.
- Comprobación de cache-busting: HTML en `v=39.0`, caché offline `camion-v39-gatos-autonomos`; las rutas de frames V38 que se reutilizan siguen declaradas.

## Navegador

- Chromium con viewport móvil de 390 × 844: HTTP 200, un canvas del juego, cero errores de página y cero solicitudes fallidas.
- Se inició una partida, se omitieron las presentaciones cinematográficas para entrar al juego y se dejó avanzar varios segundos para comprobar el render y el HUD.
- La vista capturada está disponible en `V39_preview_mobile.png` junto al proyecto. Es una emulación de viewport móvil, no una prueba en un teléfono físico.

## Cobertura nueva

- Las pruebas del núcleo verifican que las dos gatas recorren estados autónomos y se mantienen próximas cuando Sofía espera.
- Comprueban seguimiento sin saltos, proximidad durante el movimiento y congelación de estados cuando el juego está en pausa.
- La prueba de apoyo verifica que la gata seleccionada entra en estado `assist` cuando distrae a un enemigo común.
