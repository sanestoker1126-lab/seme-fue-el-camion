# V58.4 · Corrientes marinas y lluvia de asteroides

## Mar: corrientes marinas fuertes
- Franjas horizontales del mar abierto, de 150 u de alto, repartidas parejo entre la superficie y la escotilla.
  Dejan libres los primeros 350 u bajo la superficie y los últimos 520 u del fondo.
  Hay **6 en NORMAL, 4 en FÁCIL y 8 en DIFÍCIL**. El sentido se alterna y cada una va desfasada de las demás.
- Ciclo: **calma 2,4 s → aviso 1,0 s** (flechas amarillas que parpadean) **→ fuerte 2,8 s** (estelas blancas y
  flechas que corren). La fuerza sube y baja en 0,35 s.
- Fuerte, arrastra a Sofía a **290 u/s**. Ella nada a 215, así que aunque nade en contra se la lleva. Para salir:
  nadar hacia arriba o abajo, o usar DASH (440). No quita vidas.
- Solo cambia la velocidad con la que nada. La física sigue chocando con paredes y repisas: la corriente no la
  mete dentro de las rocas.
- La primera vez (y luego cada 90 s como máximo) aparece: «¡CORRIENTE FUERTE! NADA HACIA ARRIBA O ABAJO PARA
  SALIR, O USA DASH». Tiene su propio sonido, un rumor grave de agua.

## Luna: lluvia de asteroides
- **9 en NORMAL, 6 en FÁCIL y 12 en DIFÍCIL**, sobre plataformas secas de al menos 150 u de ancho. Quedan fuera
  la de salida, la parada intermedia, la arena del jefe y los primeros 250 u del inicio.
- Solo se activan con Sofía cerca. Primero, **1 s de aviso**: mira roja en el piso, columna roja con «!» y la
  trayectoria punteada. Apuntan a donde está Sofía si anda por esa plataforma. Luego la roca baja en diagonal
  (0,55 s) con estela encendida y estalla en polvo.
- Quita una vida si la toca en el aire o justo en el impacto. Apartarse durante el aviso basta: la prueba lo
  comprueba en las dos situaciones.
- Entre una caída y otra pasan de 1,6 a 3,4 s. Son siempre los mismos tiempos para el mismo mundo, sin azar real.
- Mensaje: «¡ASTEROIDE! QUÍTATE DE LA MIRA ROJA». Tiene sonido de aviso (silbido) y de golpe, y la pantalla
  tiembla si cae cerca.

## Sin cambios
- Las misiones 1 y 2 no tienen ninguno de los dos peligros (hay prueba de eso).

## Comprobado
- 159/159 pruebas y `node --check` en todo `js/`. 5 pruebas nuevas, con el motor:
  - En calma, la corriente no mueve a Sofía.
  - Fuerte, se la lleva más de 150 u en 1 s, aunque nade en contra.
  - Nadando hacia abajo sale de la franja.
  - El asteroide golpea si Sofía se queda en la mira y no la golpea si se aparta.
- En Chromium se ven la corriente fuerte, el aviso del asteroide y su caída. Sin errores en la consola.
- **No comprobado**:
  - Que alguien termine los dos niveles completos jugando con los peligros. Las pruebas de alcance (`reach.js`)
    usan solo la física y no los incluyen.
  - Cómo se sienten en un teléfono real.

Versión 58.4.0, caché `camion-v58-4-corrientes-asteroides`.
