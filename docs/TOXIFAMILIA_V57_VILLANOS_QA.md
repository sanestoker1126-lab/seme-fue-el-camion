# V57 — Villanos temáticos, lectura de combate y QA

Esta fase continúa el pulido visual de La Toxifamilia sobre V56. El guion original sigue en redacción: las nuevas criaturas son arquetipos de jugabilidad, no personajes canónicos. Su arte es **procedural temporal** en Canvas, no un atlas final.

## Submarino: Ruinas sumergidas (940 × 3072)

- Pirañas dentro de estanques profundos, con máximo dos por estanque. El tiburón guardián es el jefe y está situado dentro de la última poza, no flotando sobre tierra.
- No aparecen palomas ni murciélagos en esta misión. Las ratas restantes patrullan las ruinas en tierra.
- Los peces sólo reaccionan cuando Sofía está en su mismo estanque. Su secuencia es patrulla → aviso → embestida → mareo → patrulla.
- La piraña avisa durante 0.46 segundos y el tiburón 0.72 segundos, antes del modificador de reacción de dificultad.
- El contacto pasivo y el periodo de aviso no causan daño: sólo la embestida activa. El tiburón puede recibir DASH cuando está mareado.
- El jefe cambia de fase una sola vez al 50 % de vida y aumenta su velocidad de movimiento un 10 %, sin aumentar daño.

## Espacio: Estación en órbita (940 × 3072)

- Drones centinela como enemigos y jefe, en lugar de palomas y murciélagos.
- El dron patrulla, apunta durante 0.64 segundos (ajustado por dificultad) y dispara un proyectil de plasma.
- El disparo queda marcado en la posición que tenía Sofía al empezar el apuntado; no sigue el nuevo movimiento del jugador sin avisar.
- El plasma se mueve sin gravedad, choca con sólidos y puede romperse con DASH.

## Archivos modificados

- js/core/enemies.js: IA de piraña, tiburón y dron; reglas de contacto submarino.
- js/core/world.js: aparición determinista y respetuosa con estanques reales.
- js/core/levels.js: distribución de villanos de los mundos especiales sin cambios de geometría.
- js/app/render.js: siluetas provisionales, marcas de apuntado y proyectiles.
- js/core/game.js: el evento bossPhase llega por fin desde la IA hasta la interfaz.
- js/app/main.js y js/core/story.js: consejos y carteles de gameplay.
- js/core/toxifamilia_style.js: diez perfiles cromáticos de enemigos.
- js/core/config.js: versión 57.0.0.
- Se_Me_Fue_El_Camion.html y sw.js: importaciones JS/CSS coherentes en V57 y caché offline invalidada.
- tests/v57_thematic_villains.test.js: controles de aparición, ataque, contacto y rendimientos lógicos.
- .github/workflows/qa-game.yml: CI de Node y validación de las misiones nuevas.

## Pendiente de QA antes de fusionar

Ejecutar node --test tests/*.test.js, validar ambos mapas en todas las dificultades y probar visualmente PC/Android, especialmente pantalla vertical, animación, lecturas de peligro, colisión de proyectiles y FPS. No sustituir los atlas de Sofía, Luna ni Morita ni modificar el motor de plataformas sin una prueba real.