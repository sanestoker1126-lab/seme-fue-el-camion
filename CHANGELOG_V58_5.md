# V58.5 · Revisión completa y entrega

## Qué se revisó (con las herramientas de `tools/qa`, en Chromium)
| Revisión | Resultado |
|---|---|
| Entradas al azar en las 4 misiones (`fuzz_v58.js`) | Sin errores, sin posiciones inválidas. Antes la herramienta **nunca probaba el mar**: la cinemática de la llegada al mar se interponía y seguía jugando la misión anterior. Corregido en las 13 herramientas. |
| Rendimiento en teléfono emulado (`perf_test.js`, CPU ×1 y ×4) | 58–60 FPS. El peor caso es Azoteas con CPU ×4: 51,8 FPS (el lienzo se dibuja por software en Chromium sin pantalla; es una cota pesimista). |
| Menú y opciones (`qa_ui.js`) | Las 15 opciones cambian, se guardan y tienen efecto. |
| Controles táctiles (`touch_test.js`) | 18/18: multitáctil, cancelación, pausa y 24 acomodos de botones. |
| Sin conexión (`offline_test.js`) | Se precargan 401 archivos y se juega sin red. |
| Cinemática «Llegada al mar» (6 escenas, horizontal y vertical) | Sin el magenta ni la franja vacía de las capturas viejas de Drive. Encontrada y corregida la falla de abajo. |

## Correcciones
- **Cinemática del mar, escena 4**: en horizontal el tiburón quedaba detrás del cuadro de diálogo; solo se veía su
  etiqueta. Se bajó y se redujo (`bottom` 60 → 32, `scale` 1,2 → 1,0). Se midió que ya no se enciman en 844×390,
  390×844 y 1024×768.
- **La cinemática avisa de las corrientes** (V58.4): Papito Estoker agrega «Y cuidado con las corrientes: si ves
  flechas en el agua, nada hacia arriba o abajo para salir… o usa tu DASH».
- **Menú**: decía que en el Submarino Sofía se pone el traje automáticamente. Desde la V58.3 solo se lo pone dentro
  del agua; el texto ya lo dice así.
- **Flujo de GitHub que arma el ZIP**: seguía en la V57. Solo se activaba en una rama vieja y verificaba
  `submarino_fondo.png`, que se retiró en la V58.1, así que habría fallado. Ahora usa `tools/empaquetar.sh` y la
  versión del juego.

## Entrega
- `tools/empaquetar.sh` arma `Se_Me_Fue_El_Camion_V<versión>.zip`: 474 archivos, unos 53 MB, con `LEEME.txt`.
- Deja fuera pruebas, herramientas, documentación y 53 assets retirados (`tools/assets_retirados.txt`): audios y
  atlas de versiones viejas y la carpeta `assets/enemies/nino` (el niño ahora vive en `assets/enemies/v50/kid`).
  `tests/v58_4_entrega.test.js` comprueba que el juego no pide ninguno.
- Probado **desde el paquete**: las 18 escenas de las 4 misiones recorridas con la cámara y las 3 cinemáticas, sin
  archivos faltantes y sin errores de JavaScript; y el modo sin conexión completo.

## Sigue pendiente (no se pudo resolver aquí)
- Nadie ha jugado a mano cada nivel completo ni se ha probado en un teléfono real.
- La casa con forma de piña del arte marino recuerda a una caricatura conocida. Conviene cambiarla antes de una
  venta.
- Faltan las secciones `escuela` y `escuela_vecina` del paquete de arte de la escuela, que llegó truncado.

161/161 pruebas. Versión 58.5.0, caché `camion-v58-5-entrega`.
