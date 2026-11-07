# ¡Se me fue el camión!

Juego de navegador (PWA) de plataformas 2.5D ambientado en Guadalajara, Jalisco. Sofía baja por la ciudad
—y más allá— persiguiendo el camión de la ruta 6, acompañada de las gatitas **Luna** y **Morita**.

## Cómo jugar

Es un sitio estático, sin dependencias. Para jugarlo:

- Abre `Se_Me_Fue_El_Camion.html` desde un servidor local (el service worker y la carga de assets necesitan
  `http://`, no `file://`). Por ejemplo, en la carpeta del proyecto:

  ```bash
  python3 -m http.server 8000
  # luego abre http://localhost:8000/Se_Me_Fue_El_Camion.html
  ```

Controles en pantalla (táctil) y teclado. Se instala como app (PWA) y funciona sin conexión tras la primera carga.

## Misiones (V53)

El juego está separado en cuatro misiones; en el menú eliges misión y después la parada:

1. **La Escuela** — los niveles de tema escolar.
2. **Guadalajara** — el grueso del juego por la ciudad.
3. **El Submarino** — mundo nuevo: ruinas sumergidas, se bucea por los cristales del fondo.
4. **El Espacio** — mundo nuevo: estación en órbita, saltos entre asteroides.

Opciones incluye **Aspecto de Sofía** (original / uniforme / rosa).

## Estructura

- `Se_Me_Fue_El_Camion.html` — punto de entrada.
- `js/core/` — motor (física, mundo, niveles, historia, enemigos, config).
- `js/app/` — render, UI, audio, entrada, datos de arte, arranque.
- `css/` — estilos.
- `assets/` — escenas, personajes, gatitas, plataformas, audio, vehículos.
- `sw.js` — service worker (precarga para jugar sin conexión).
- `tests/` — pruebas con el runner de Node (`node --test tests/*.test.js`).
- `tools/` — utilidades de verificación de niveles.
- `CHANGELOG_V*.md` — historial de versiones.

## Pruebas

```bash
node --test tests/*.test.js
```

Versión actual: **V55** (`js/core/config.js` → 55.0.0).

## V54 · Submarino y Espacio ampliados

Los dos mundos se ampliaron a **940 × 3072 unidades**, con tres sectores de descenso y 39 cristales por mundo.
Los fondos originales se despliegan de forma continua por todo el ancho y el descenso, con desplazamientos
independientes de imagen, partículas lejanas y elementos cercanos; no se ha alterado la física.

Sofía utiliza el atlas submarino existente fuera del agua y el de nado dentro del agua. En el espacio se muestra
con un equipo astronauta superpuesto como solución visual temporal, porque el repositorio aún no incluye el
atlas completo de la versión espacial. Los sprites originales no se reemplazan ni se eliminan.

Antes de pulsar JUGAR se puede elegir ORIGINAL, UNIFORME, ROSA, BUZO o ASTRONAUTA. El ajuste se guarda y se usa en Escuela y
Guadalajara; los mundos especiales imponen su equipamiento correspondiente.

Las salidas de los mundos nuevos se representan como una escotilla y un módulo orbital. Su comportamiento
de meta conserva el sistema del motor existente.


## V55 · Parallax gráfico real en las misiones 3 y 4

Se integraron cinco capas independientes por mundo en `assets/parallax/submarino/` y
`assets/parallax/espacial/`: fondo lejano, profundidad, estructuras, elementos y
primer plano. Son imágenes SVG optimizadas para mantener detalle sin archivos
raster gigantes; las cuatro primeras capas quedan detrás del juego y el primer
plano se dibuja por delante únicamente en los bordes.

La cámara las desplaza con factores 0.10, 0.22, 0.40, 0.68 y 1.00, recorriendo toda
la anchura y profundidad del mapa sin generar espacios vacíos. El renderizador
dibuja solo el recorte visible; en caso de que falten imágenes conserva el fondo
de respaldo V54. La PWA incluye las capas en su precarga para uso sin conexión.

El arte es vectorial y original del proyecto; no recupera fotografías/capas de las
imágenes V53 aplanadas. El nivel y las colisiones no fueron modificados en V55.
