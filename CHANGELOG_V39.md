# V39 — Gatos aliados autónomos y animación fluida

## Comportamiento

- Luna y Morita tienen estados independientes y ciclos escalonados: seguir a Sofía, curiosear/explorar un radio pequeño, observar, olfatear, asearse, subir brevemente al hombro, alertar de peligros y asistir contra un enemigo común.
- El seguimiento usa un resorte amortiguado con límites de velocidad y corrección de posición al cambiar de tramo. No altera las cajas de colisión ni la física de Sofía.
- La detección de amenazas y la distracción breve conservan sus límites previos: la asistencia es no letal, tiene enfriamiento y excluye a los jefes.
- Las rutinas son deterministas, funcionan con los pasos del juego, se congelan al pausar y se restablecen al atravesar una transición.

## Animación

- Se interpolan brevemente los frames existentes de espera y caminata para disimular los saltos entre poses.
- Se añadieron oscilación vertical sutil, respiración y balanceo para que los ciclos tengan continuidad.
- Las conductas de olfatear, asearse, observar, explorar y alertar seleccionan ciclos/poses dedicados de los sprites V38; no se agregaron dependencias ni archivos de imagen nuevos.

## Entrega

- Se actualizó el cache-busting de los scripts y estilos a V39 y se cambió el nombre de la caché offline.
- Se conserva el audio reparado y todos los contenidos previos de V38.