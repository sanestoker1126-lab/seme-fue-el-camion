# V58.9 · Limpieza: menos amontonado y sin caminar sobre el aire

Respuesta a «se ve amontonado, parece que camina sobre el aire». Se revisaron con capturas reales:
- las 18 paradas, en 3 alturas cada una;
- las repisas invisibles (las que pisa el dibujo): todas las de la Luna (64) y una muestra de la escuela, Guadalajara y
  el mar.

## Menos amontonado

| | Antes | Ahora |
|---|---|---|
| Cristales por nivel (recorrido) | 100–270 | 15–95, separados al menos 200 u |
| Enemigos por nivel (ciudad) | 13–27 | 8–17 |
| Rótulos encimados | nombre bajo cada gata y «¡CUIDADO!» | ninguno (queda el signo de aviso) |

- **Cristales**: antes había filas a cada paso que tapaban el dibujo. Ahora quedan menos, pero siguen marcando el
  camino. Los cristales de las zonas inferiores y secretas son premio y se quedan todos.
- **Enemigos**: se quitaron los multiplicadores de la V58 (×1,7 enemigos, ×1,6 obstáculos), que se pusieron cuando
  los niveles se hicieron del doble de tamaño.

## Sin caminar sobre el aire
- **Guadalajara, parada 1**: la capa de cornisas del arte tiene vigas de 2–7 u de grueso, que no se ven sobre el cielo
  de la panorámica, y Sofía parecía caminar en el aire. Ahora el juego dibuja esas repisas de piedra.
- **La Luna**: de 64 repisas, 3 no coincidían con el dibujo. Se trazaron de nuevo sobre el arte:
  - una quedaba dentro de la pared de roca: se quitó y la roca quedó sólida;
  - las otras dos estaban hundidas en las rocas: ahora están en la cima.
- **La escuela y el mar**: en la muestra revisada, Sofía siempre pisa algo dibujado.

## Fondos sin espejo
- Cuando el dibujo de fondo era más angosto que el nivel, se repetía y cada segunda copia salía en espejo: el grafiti
  «GUADALAJARA» se leía al revés.
- Ahora es una sola copia que cubre todo el ancho.

## Comprobado
- 189 de 189 pruebas, incluidas 3 nuevas en `tests/v58_9_limpieza.test.js`:
  - separación de cristales;
  - tope de enemigos;
  - sin rótulos ni espejo.
- Análisis de alcanzabilidad de la Luna con las repisas nuevas, en las 3 dificultades: meta, paradas y zonas, sin
  trampas, todos los cristales.
- Capturas antes y después en Chromium.

**Lo que no se arregló**: queda la sensación de que el juego mezcla demasiadas cosas (la historia de la Toxi Familia,
el camión, el mar, la Luna, las zonas secretas). Eso es diseño de la historia, no un error del código.

Versión 58.9.0, caché `camion-v58-9-limpieza`.
