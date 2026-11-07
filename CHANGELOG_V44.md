# V44 — Controles mejorados (jugabilidad)

## Qué cambió en los controles táctiles
- **Zona muerta del joystick más chica** (0.28 → 0.20 del radio): el movimiento
  responde antes, se siente menos "pegajoso".
- **Empujar el stick hacia ARRIBA ahora salta** (flanco), y si lo mantienes
  arriba el salto es completo (salto variable). Así puedes **mover y saltar con
  el mismo pulgar**, sin depender solo del botón.
- **"Bajar" en el stick** ahora solo se activa con un empuje **recto y
  deliberado** hacia abajo (antes se disparaba en diagonal y te hacía **caer por
  las plataformas sin querer** mientras corrías).
- **Botón de SALTAR más grande** (74 → 84 px) para acertarle más fácil.
- Guía actualizada: "empuja el joystick hacia arriba para saltar".

## Verificación (prueba headless)
- Empujar arriba → `jumpPressed` y `jumpHeld` = true (salto completo). ✓
- Empuje diagonal-abajo → NO activa bajar (ya no caes por accidente). ✓
- Empuje recto-abajo → sí activa bajar. ✓
- Izquierda/derecha → mueven. ✓  · 0 errores de consola.

## Pendiente
- **Ratas y perro con sprites**: su lámina es más difícil de cortar que la del
  niño (las etiquetas van DEBAJO de los sprites, hay FX rojo de ataque que pega
  los cuadros, y los frames del perro se traslapan). Para no meter arte con
  texto/artefactos encima, quedó pendiente un corte afinado a mano. El niño (V43)
  sí quedó con sprites.

## Entrega
- Cache-busting `v=44.0`, caché `camion-v44-gatos-autonomos`.
