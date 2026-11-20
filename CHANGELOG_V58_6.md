# V58.6 · Menú compacto, apertura en penumbra, ropa por nivel y el columpio con sentido

## Menú principal
- **Antes**: una columna larga. Medía 1144 px de alto en un teléfono vertical y 912 px en horizontal, donde solo se
  veían 343: había que desplazarse casi tres pantallas.
- **Ahora**: cabe completo sin desplazarse. Mide 567 px en vertical, 298 px en horizontal y 422 px en PC.
  - Cabecera con el título y los objetos recuperados (6 puntos).
  - Cuatro **tarjetas de misión** con el arte de su mundo, número, nombre y avance (`1 / 3 PARADAS`, `BLOQUEADA`).
  - Paradas de la misión elegida y un botón que dice qué empieza: `▶ JUGAR · MISIÓN 1`.
  - Dificultad y récords en una línea.
  - Abajo, una franja con CINEMÁTICA, CÓMO JUGAR y OPCIONES. Ahí también aparecen ▶ LLEGADA AL MAR y ▶ ESCENA FINAL
    cuando se desbloquean.
- En horizontal y en PC va en dos columnas.
- Se quitaron del menú el párrafo largo de introducción, el selector de 5 aspectos (ver «Ropa por nivel») y los
  botones de música, efectos y vibración, que siguen en Opciones y en la Pausa.
- Con un panel abierto, los avisos salen abajo. Antes, «Algunos gráficos terminarán de cargar…» quedaba medio tapado
  detrás del menú en vertical.
- **Falla corregida**: los botones rápidos MÚSICA y EFECTOS (pausa) no hacían nada. Llamaban a las opciones
  `music`/`sfx`, que no existían desde la V50 (son volúmenes). Ahora apagan el sonido y lo regresan al volumen que
  tenía.

## Cinemática del inicio (ARCHIVO 01): apertura en penumbra
- Las tres primeras escenas (texto largo con las siluetas recortadas arriba) son ahora **una sola escena oscura**:
  - Al empezar, 3,2 s de silencio en los que **solo se ven las dos figuras**, Estoker y Doña Tóxica, saliendo de la
    oscuridad a contraluz de los tres monitores que se encienden.
  - Hay niebla, una luz que parpadea, el reloj 21:45 y el lugar escrito arriba.
  - Luego hablan con **subtítulos abajo**. **Quien habla se ilumina** (Estoker en cian, Doña Tóxica en rosa) y la otra
    figura queda en sombra.
- Las frases son las del guion, partidas por oraciones, sin diálogos nuevos.
- SIGUIENTE (o tocar) adelanta la siguiente línea; SALTAR cierra.
- El prólogo pasa de 7 a 5 escenas. En la escena de la escuela, Sofía ahora sale de uniforme.

## Ropa por nivel
Cada vestuario se usa solo en su mundo:

| Mundo | Ropa |
|---|---|
| La escuela | **uniforme** |
| Guadalajara | ropa de calle |
| El mar | ropa de calle en la isla; **buzo solo dentro del agua** (V58.3) |
| La Luna | **astronauta** |

- «Ropa de calle» se elige en Opciones: ORIGINAL o ROSA.
- Los valores guardados por versiones anteriores (uniforme, buzo, astronauta) se toman como ORIGINAL fuera de su mundo.
- En las pozas de Guadalajara, Sofía nada con el atlas de nado de siempre, que es la ropa ORIGINAL. Con ROSA
  elegida, al nadar ahí se ve la original: no hay cuadros de nado con la ropa rosa.

## El columpio de la escuela ya sirve para algo
- En la azotea del nivel 1, una **barda rematada con vidrios rotos** (220 u de alto) corta el paso hacia la orilla por
  donde se baja. Los vidrios lastiman.
- El columpio se movió y se alargó para que, al soltarse, Sofía pase por encima. Un letrero explica cómo: «salta a la
  cuerda, balancéate con ← → y suéltala con SALTAR».
- **Por qué esa altura**: se midió con la física real la altura máxima que alcanza Sofía en cada punto.
  - Sin cuerda, sobre la barda llega a unas 137 u.
  - Saltando del columpio pasa a unas 290 u.
  - Por eso la barda mide 220 u: así ningún salto la libra y el columpio sí.
  - Antes de la barda se probó con vidrios en el piso, pero desde el tinaco un salto con DASH llegaba más lejos que el
    columpio. Con vidrios en el piso, el columpio no habría sido necesario.
- `tests/v58_6_columpio.test.js` comprueba:
  - 324 intentos sin cuerda (correr, saltar y DASH en distintos momentos, desde el piso, el tinaco y el techo del
    letrero): ninguno cruza ni se para en la barda.
  - Con el columpio se cruza sin cortarse soltándose en varios momentos distintos, no solo en uno perfecto.
- El análisis de alcance de la misión 1 encuentra el camino por el columpio. La azotea se partió en dos pisos para que
  el análisis no lo dé por hecho.
- Se probó en Chromium: Sofía corre, salta a la cuerda, se columpia, pasa sobre la barda y aterriza del otro lado.
- Los otros tres columpios (nivel 2) siguen como antes: opcionales, con cristales en su arco.

## Comprobado
- 168/168 pruebas y `node --check` en todo `js/`.
- Revisiones automáticas (QA) en Chromium:
  - Las 15 opciones funcionan, incluida la ropa de calle.
  - Controles táctiles: 18/18.
  - Controles al azar en las 4 misiones, sin errores.
  - Sin conexión: se precargan 401 archivos.
  - Las capturas del menú (vertical, horizontal y PC) y de la cinemática (tres tamaños) se revisaron una por una.
- **No comprobado**: en un teléfono real; que alguien juegue a mano los niveles completos.

Versión 58.6.0, caché `camion-v58-6-menu-columpio`.
