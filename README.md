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

Versión actual: **V53** (`js/core/config.js` → 53.0.0).
