# Candidato comercial — inventario de producción V58.7.2
Base comprobada: 645 archivos versionados, cuatro misiones y dos zonas secretas. Esta edición no se declara lista para venta.
## Arte nuevo entregado
- `assets/fx/release_fx_rgba.png`: 576×576 RGBA, 36 frames, celdas 96×96, margen transparente 8 px, pivote central, 6 clips de 240 ms: impacto, daño, recolección, impulso, polvo y jefe. Integrado por evento, máximo 24 destellos visibles; sin cambios en hitboxes ni física.
- `assets/fx/release_fx_rgba.json`: rectángulos, tiempos, pivotes, tamaños y procedencia.
## Bloqueos restantes, por orden de producción
| Área | Evidencia de la rama | Criterio de cierre |
|---|---|---|
| Sofía buceadora | El JSON submarino contiene 103 poses mayormente derivadas mediante rotación/traslación; swimKick usa swim_fast. | Patada auténtica, ascenso, descenso, entrada/salida y recuperación articulados, sin reutilizar una pose como animación final. |
| Sofía en tierra y espacio | render.js usa un cuadro para salto, caída, daño y derrota; balanceo/tirolesa reutilizan victoria. Astronauta tiene dos pasos y dos patadas. | Secuencias específicas, pivotes coherentes, sin cambiar identidad ni colisión. |
| Gatitas | spaceCat repite idle 6 veces y usa dos pasos. | Nado, impulso, alerta, ataque, rescate y reposo reales con sus trajes. |
| Enemigos secretos | CHANGELOG_V58_7: 118 de 192 cuadros aceptados; Pulpo del Abismo 14 de 49. | Nuevos cuadros originales para ataques, daño y KO descartados, sin figuras cortadas ni texto. |
| Jefe espacial | Marciano Comandante reutiliza el marciano ampliado. | Diseño propio aprobado, atlas y anticipación/recuperación legibles. |
| Cinemática | docs/TOXIFAMILIA_INTEGRACION.md: PDF completo no accesible; siluetas de personajes en el prólogo. | Guion autorizado y arte final; no inventar capítulos atribuidos al autor. |
| Música y sonidos | audio.js usa pistas aportadas, incluyendo Chinos de Seda; no se acreditó licencia de comercialización. | Permisos documentados o pistas originales de reemplazo, mezcla y normalización. |
| Producto | PWA y empaquetador existentes; no se comprobó teléfono real ni partida manual completa. | Pruebas manuales de campaña, guardado, offline, táctil, accesibilidad, rendimiento; ficha de tienda, privacidad, clasificación, derechos y paquete firmado si se publica en Android. |
## Puerta de lanzamiento
No publicar ni etiquetar como edición final hasta que estén cerrados los bloqueos de arte, derechos y QA. El manifiesto JSON de este atlas no sustituye la inspección visual ni valida otros atlas.
