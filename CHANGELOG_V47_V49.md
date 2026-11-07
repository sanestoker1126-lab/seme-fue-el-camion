# CHANGELOG V47–V49 — "¡Se me fue el camión!"

Consolidación de las tres entregas posteriores a V46. El código de ambas copias
(master PNG y distribuible WebP) quedó idéntico; solo cambia el formato de assets.

## V47 — Peso de descarga
- Conversión de 143 texturas PNG → WebP en el paquete distribuible.
- Paquete de ~50 MB a **12 MB**. 0 referencias rotas verificadas.
- Carpetas `source/` excluidas del distribuible.

## V48 — Gatas al doble de tamaño
- `COMPANIONS.scale`: Luna `0.034 → 0.068`, Morita `0.033 → 0.066`.
- Verificado que el tamaño en pantalla = `ancho_imagen (224px) × scale`, sin otro
  multiplicador oculto, y que el anclaje a las patas se conserva.

## V49 — Sprites pulidos y combate
### Sprites (perro, rata, niño)
- Pulido de contorno y matte: quitadas las teselas de cuadrícula blanca sobrante
  (sueltas y pegadas al borde), despecado, defringe y anti-alias del contorno.
- Criterio por **cercanía**: se conservan partes grandes legítimas pegadas al
  cuerpo (perro tumbado, segunda rata) y se descarta basura flotante lejana
  (franja roja sobre `dog/dead_01`).
- **No** se rellenan los huecos entre las patas (error corregido en la 1ª pasada).

### Colisión
- Nueva caja de **combate** `hitBox(f)` (`hitKW`/`hitKH` por tipo) que cubre el
  cuerpo visible del sprite: la usan patada, dash y pisotón.
- El contacto **defensivo** sigue usando la caja física, para no volverlo injusto.
- Patada: alcance 58 → 64 px y evaluada contra la caja de combate.

### Ataque nuevo: piedras del niño
- El jefe `kid` lanza piedras en arco a media distancia (`throwNear` 150,
  `throwRange` 380, `throwWindup` 0.5 s, `stoneSpeed` 245, gravedad 580).
- Reutiliza el sistema de proyectiles: colisionan con sólidos, plataformas y
  Sofía, y se rompen con el dash. De cerca el niño sigue embistiendo.

### Feedback de impacto
- Destello blanco de la silueta del sprite al recibir golpe.
- Chispa blanca extra + screen-shake al conectar y al derrotar.

## Pruebas ejecutadas
- Unitarias con código real: la patada conecta y mata al perro; sin patear y a
  distancia **no** hay golpe falso; el niño lanza la piedra (~0.5 s) con
  velocidad/gravedad correctas y cae en arco.
- 6 s de juego simulado con movimiento, salto, patada y dash: estable.
- 0 errores de consola en todas las corridas.
