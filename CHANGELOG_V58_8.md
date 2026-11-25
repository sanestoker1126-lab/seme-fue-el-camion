# V58.8 · Todos los niveles desbloqueados y las aulas ocultas de la escuela

## Todo desbloqueado
- Desde el principio se pueden elegir las 4 misiones y todas sus paradas: la escuela (3), Guadalajara (13), el mar
  y la Luna.
- Se quitó la opción «Práctica: todos los tramos», que ya no hace falta.
- El juego sigue guardando el avance y los récords, pero ya no bloquea nada.

## Las aulas ocultas (misión 1, nivel 1)
Se armaron con los dos fondos nuevos: la **sala de cómputo** y, pegado a ella, el **laboratorio de ciencias**.

**Cómo se entra y se sale**
- La entrada es un remolino violeta, apenas visible, en la repisa chica del extremo izquierdo del nivel. Se entra con
  BAJAR.
- Se llega frente al portal de la sala de cómputo.
- La salida es el portal del laboratorio, a la mitad de la zona. Regresa junto a la entrada.

**Qué se puede pisar**: el recorrido está trazado sobre el dibujo. Se pisan:
- las mesas de computadoras y el escritorio;
- los libreros y las repisas;
- las mesas del laboratorio, la tarja y la charola del pizarrón;
- las lámparas del techo.

**Quién está ahí**
- En la sala de cómputo: un niño, una rata y un chile (en FÁCIL, solo el niño).
- En el laboratorio da clase **El Maestro Enojón**. Es el jefe secreto y tiene 5 golpes, uno menos que en los
  pasillos, donde sigue siendo el jefe del nivel 3.

**Premio**: 15 cristales y un corazón sobre una lámpara del laboratorio.

## Comprobado
- 183 de 183 pruebas.
- Las 3 nuevas (`tests/v58_8_aulas.test.js`) revisan:
  - la zona;
  - que un bot vence al Maestro con la física real;
  - el menú desbloqueado.
- Análisis de alcanzabilidad de la misión 1 en las 3 dificultades: meta, sin trampas, la zona accesible y 15/15
  cristales.
- En Chromium: el menú sin candados; entrar con BAJAR; los dos salones, el portal de salida y el Maestro, sin errores.

Versión 58.8.0, caché `camion-v58-8-aulas-ocultas`.
