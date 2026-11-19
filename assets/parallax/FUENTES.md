# Arte de parallax (V58 / V58.1) · procedencia y estado

Todo el arte de esta carpeta lo aportó el autor del juego en cinco paquetes. Aquí se registra de dónde salió
cada archivo, qué se le hizo y qué falta, para no atribuir a un paquete algo que no traía.

| Carpeta | Paquete de origen | Qué se hizo |
|---|---|---|
| `escuela/azotea_superior`, `escuela/escuela_ruinas`, `escuela/patio_salida` | `ESCUELA_PARALLAX_16_9_ASSETS-1.zip` | WebP copiados sin recomprimir |
| `guadalajara/azoteas`, `guadalajara/mercado_parque`, `guadalajara/barrios_inferiores` | `GUADALAJARA_PARALLAX_WEBP_ANDROID.zip` | WebP copiados sin recomprimir |
| `marino/depth_v4/` (3 páginas WebP + 7 capas PNG) | `SE_ME_FUE_EL_CAMION_MARINO_PARALLAX_PRO_V4.zip` (V58.1) | Copiados sin recomprimir; SHA-256 iguales a su manifiesto. **Único fondo del mar**: el de `SOFIA_PARALLAX_MARINO.zip`, las capas SVG de V55 y `submarino_fondo.png` se retiraron |
| `espacial/` (`panorama`, `decoracion`) | `SOFIA_PARALLAX_ESPACIAL.zip` | PNG → WebP (quality 92–93, alfa sin pérdida) |

Todas las capas de escuela y Guadalajara miden 1536 × 864 (16:9). Los panoramas marino y espacial miden
2172 × 724; `decoracion` mide 1774 × 887.

## Lo que llegó incompleto (verificado, no supuesto)

`ESCUELA_PARALLAX_16_9_ASSETS-1.zip` llegó **truncado**: 30 509 002 bytes, sin directorio central. Se recuperaron
32 entradas leyendo las cabeceras locales y comprobando el CRC32 de cada una (`tools/arte/recuperar_zip.py`).

- El manifiesto del paquete declara **5 secciones**; solo llegaron 3: `azotea_superior`, `escuela_ruinas` y
  `patio_salida`. **Faltan por completo `escuela` y `escuela_vecina`** (10 capas).
- De `escuela_ruinas` faltaba `02_vegetacion.webp`: se generó desde su PNG (que sí llegó entero) con los mismos
  ajustes del paquete (quality 88, method 5).
- `escuela_ruinas/00_fondo_distante.png` venía dañado **dentro** del ZIP (su CRC coincide con el guardado, así que
  ya estaba cortado al empaquetarse). No afecta: se usa el WebP, que decodifica completo.

Mientras no lleguen las dos secciones que faltan, el nivel `escuela` usa `azotea_superior` (según las estadísticas
del propio paquete es la misma ilustración) y `escuela_vecina` conserva su fondo pintado anterior
(`assets/scenes/generated/escuela_patio_tarde.png`).

`SOFIA_PARALLAX_ESPACIAL.zip` y `SOFIA_PARALLAX_ESPACIAL-2.zip` son el mismo archivo (mismo SHA-256).

## Cobertura

El paquete de Guadalajara trae 3 escenas para 13 tramos; su propio LEEME avisa que no los cubre todos. Los
tramos sin escena nueva conservan su pintura anterior. Las superficies dibujadas en el arte **no son colisiones**:
las plataformas reales siguen siendo las del motor.

## Rehacer la importación

```bash
python3 -I tools/arte/recuperar_zip.py ESCUELA_PARALLAX_16_9_ASSETS-1.zip subidas/escuela
# (los otros tres ZIP se extraen normal, cada uno en su carpeta: subidas/guadalajara, subidas/marino, subidas/espacial)
python3 -I tools/arte/importar_parallax.py subidas .
python3 -I tools/arte/componentes_atlas.py subidas/espacial/decoracion.png 40 2500   # cajas de los sprites
python3 -I tools/arte/componentes_atlas.py subidas/marino/fauna.png 200 1500
```

## V58.1 · Mar «Marino Parallax PRO V4»

- Una ilustración vertical de 971 × 2928 px en tres páginas (isla → ciudad hundida → abismo) y siete capas de
  ambiente RGBA de 640 × 1536. El nivel del mar se **volvió a trazar sobre el dibujo** (`levels.js` ·
  `MARINE_TRACE`): cada repisa, escalera, el puente de cuerda, la cubierta del barco, capiteles y pisos de cueva son
  colisiones reales y no se dibujan encima.
- Lo que el paquete NO resolvía y no se usó: su `platform_reference.csv` (67 referencias) es de **otro mapa**
  (1976 × 5960 u, secciones repetidas) que no corresponde al mar de V58; su instalador exige una rama
  (`manus/release-candidate-v58.1-fase4`) que no existe en el repositorio. Se integró a mano.
- La ilustración incluye una casa con forma de piña bajo el mar (ya venía en el fondo marino anterior). Para una
  venta comercial conviene revisarla: recuerda mucho a una caricatura conocida.
