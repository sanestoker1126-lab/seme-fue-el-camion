# Arte de parallax (V58 / V58.1) · procedencia y estado

Todo el arte de esta carpeta lo aportó el autor del juego en cinco paquetes. Aquí se registra de dónde salió
cada archivo, qué se le hizo y qué falta, para no atribuir a un paquete algo que no traía.

| Carpeta | Paquete de origen | Qué se hizo |
|---|---|---|
| ~~`escuela/…`~~ (retirado en V58.1) | `ESCUELA_PARALLAX_16_9_ASSETS-1.zip` (llegó truncado) | Sustituido por la Escuela Miguel Hidalgo (abajo) |
| `guadalajara/azoteas`, `guadalajara/mercado_parque`, `guadalajara/barrios_inferiores` | `GUADALAJARA_PARALLAX_WEBP_ANDROID.zip` | WebP copiados sin recomprimir |
| `marino/depth_v4/` (3 páginas WebP + 7 capas PNG) | `SE_ME_FUE_EL_CAMION_MARINO_PARALLAX_PRO_V4.zip` (V58.1) | Copiados sin recomprimir; SHA-256 iguales a su manifiesto. **Único fondo del mar**: el de `SOFIA_PARALLAX_MARINO.zip`, las capas SVG de V55 y `submarino_fondo.png` se retiraron |
| `espacial/depth_v5/` (3 páginas WebP + 5 de sus 7 capas PNG) | `SE_ME_FUE_EL_CAMION_ESPACIO_LUNA_PARALLAX_PRO_V5-1.zip` (V58.1) | Copiados sin recomprimir; SHA-256 iguales a su manifiesto. **Único fondo de la Luna**: el de `SOFIA_PARALLAX_ESPACIAL.zip`, las capas SVG de V55 y `espacial_fondo.png` se retiraron |

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

## V58.1 · Luna «Espacio Luna Parallax PRO V5»

- Tres páginas de 1680 × 1024 (estación y superficie lunar → cavernas de cristal → salón del portal → ciudad bajo la
  Luna). Solo la franja x 315–1365 px es dibujo nítido (lo demás es extensión desenfocada): el mundo usa esa franja.
  El nivel se trazó sobre el dibujo (`levels.js` · `LUNAR_TRACE`); la banda de roca entre las cavernas y la ciudad es
  sólida y se cruza por dos grietas dibujadas por el juego.
- Capas usadas: estrellas y escombros (cielo), polvo de caverna y luz de cristales (cavernas), en mosaico y con
  paralaje. El OVNI de `04_naves_satelites` es la plataforma «nave». **No se usaron** `02_nebula_galactica` (un velo
  casi opaco que apagaba el cielo pintado) ni `03_planetas_ordenados` (el cielo pintado ya trae planetas y quedaban
  encimados sobre el suelo lunar).
- Su `space_platform_locations.csv` (79 referencias) es de otro mapa (1976 × 5960 u), igual que el del mar: no se usó.
- Los dos ZIP `…PRO_V5-1.zip` recibidos son idénticos (mismo SHA-256).

## V58.1 · Guadalajara «Azoteas PRO V2» (`assets/scenes/guadalajara_pro_v2/`)

- Tres fondos (Guadalajara 1920 × 540, Portales y Centro Histórico 1536 × 2504) y sus capas de cornisas RGBA. Se
  comprobó que las superficies de su manifiesto son **idénticas** a las de `SOFEVI_MAP`, `GDL_MAP` y `CATEDRAL_MAP`
  (8, 10 y 5 superficies): las cornisas caen sobre las colisiones reales. Los tres niveles pasan a ser pintados (la
  capa de cornisas es la plataforma visible; en el espejo de V58 se refleja junto con el fondo y no se pinta sobre el
  corte central que V58 abre en la cornisa baja del Centro Histórico).
- Se retiraron `guadalajara_fondo.png`, `generated/sofevi_centro_zigzag.png` y `generated/centro_historico_guadalajara.png`
  (las dos escenas de cinemática que usaban la última ahora usan el fondo nuevo del Centro Histórico).
- Límite (lo dice su propio informe): las cornisas siguen las colisiones, pero no todos los balcones del dibujo son
  pisables; en el nivel apaisado algunas cornisas cruzan la fachada pintada.

## V58.1 · Personajes (atlas aportados, marcados por su autor como preliminares)

| Uso en el juego | Origen | Qué se hizo |
|---|---|---|
| Sofía astronauta (Luna): reposo, pasos, salto, caída, aterrizaje, golpe, daño, derrota, victoria | `ATLAS_ESPACIAL_V58_1_PERSONAJES_4_ATLAS_RGBA` (sofia_roja) + `…SALTO_DANO_VICTORIA_DERROTA_PRELIMINAR` (sofia_falda_roja) | Recorte, escala igualada por el ancho del casco (los cuadros del segundo paquete no tienen escala constante), lienzo 256 × 240 con pies en (128, 232), WebP |
| Luna y Morita astronautas (Luna) | mismo paquete (gato_blanco = Luna, gato_gris = Morita, por el color de las gatas del juego) | Lienzo 224 × 224 como las de tierra, WebP |
| Niño gordito de las piedras: buzo (mar) y astronauta (Luna), con su piedra | `NINO_GORDITO_ASTRONAUTA_BUZO_ATLAS_RGBA_JSON_V58_1_COMPLETO` | Lienzo 280 × 250 con el pivote del atlas en los pies, WebP |

No se usaron: `sofia_cuadros` y `sofia_variacion_roja` (otro vestuario que no corresponde a Sofía en el resto del juego),
las animaciones de salto/daño/victoria/derrota de las gatas (el juego no tiene esos estados para ellas) ni las hojas
fuente generadas.

## V58.1 · Escuela Miguel Hidalgo (`assets/scenes/school_miguel_hidalgo/`)

- Del paquete `ESCUELA_MIGUEL_HIDALGO_PLATAFORMAS_ALINEADAS_V3`: las tres láminas `01_aulas_superiores` (1501 × 2496),
  `02_patio_escolar` (1476 × 2496) y `03_conserjeria_entrada` (1521 × 2496), sin recomprimir (SHA-256 iguales a su
  manifiesto). Se usó la versión original de la lámina 01: la `_aligned` está deformada para otro mapa.
- Su «alineación» y su `platform_coordinates_v3.csv` son de otra versión de los mapas (1096 × 1812): no corresponden a
  la escuela del juego. Por eso los tres niveles de la misión 1 **se volvieron a trazar sobre las láminas**
  (`levels.js` · `SCHOOL_TRACE`); las alturas de las losas salen de las cornisas rojas detectadas en el propio arte.
- No se usaron sus tres capas de árboles translúcidos (1776 × 2368, 6,9 MB): encimadas sobre la fachada se veían como
  fantasmas. Tampoco su módulo de «arquitectura bajo las plataformas»: con el trazado sobre el arte ya no hace falta.
- Se retiraron el fondo anterior de la escuela (`escuela_fondo.png`, `generated/escuela_patio_tarde.png`,
  `generated/escuela_pasillo_lluvia.png`) y las capas `escuela/` del paquete truncado. Las escenas de cinemática que
  los usaban ahora usan las láminas nuevas.

## V58.2 · Enemigos marinos (`assets/enemies/marinos/`)

- Del paquete `SOFIA_ENEMIGOS_MARINOS_ATLASES_R1`: atlas del tiburón, la piraña, el pulpo y Poseidón, y los efectos
  del tiburón, la piraña y Poseidón. Convertidos a WebP (7,75 MB → 1,84 MB) sin cambiar el dibujo. Los rectángulos de
  cada cuadro y su posición en la celda (`origin`) se copiaron a `render.js` (`MARINE_ART`); `sourceCrop` es la
  posición en la hoja fuente del generador y no se usa.
- Sus cajas de colisión y valores de daño son guías del propio paquete: el juego usa las suyas.

## V58.2 · Cinemática «Llegada al mar» (`assets/cinematica/marino/`)

| Archivos | Origen | Qué se hizo |
|---|---|---|
| `fondo_playa`, `fondo_costa`, `fondo_descenso`, `fondo_santuario` | `CINEMATICA_SOFIA_ESTOKER_DIALOGOS_Y_ANIMACIONES` · `fondos/*/capa_1.png` | Solo la franja ilustrada; el cielo (o el agua) se extendió hacia arriba con un degradado de sus propios colores. Sus capas 0 y 2 (cielo y palmeras vectoriales) no se usan. 1600 × 667 WebP |
| `fondo_isla_cima`, `fondo_isla_orilla` | Lámina 01 del mar «Marino PRO V4» (ya en el juego) | Dos recortes: la cima (donde empieza el nivel) y la orilla con el puente y la cueva |
| `paseo_mano_00…11` | mismo paquete · `sprites/estoker_sofia_mano_*` | Halo invisible quitado (alfa < 8), mismo recorte para los 12 |
| `estoker_platica_00…11`, `estoker_explica_00…06` | `ESTOKER_CAMINANDO_Y_CONTANDO_A_SOFIA_32_FRAMES` · `conversacion_con_sofia`, `explicar_estoker` | Se quitaron pedazos de cuadros vecinos que traían los recortes (cabezas y manos sueltas en los bordes) |
| `sofia_{original,uniforme,rosa}_asombro_00…05` | `SOFIA_3_VERSIONES_CAMINANDO_ASOMBRADA_FRAMES` (reno rojo, escolar roja, rosa morada = los tres vestuarios del juego) | Halo rojo invisible quitado, mismo recorte por vestuario; solo los cuadros a la derecha (los de la izquierda eran espejos) |
| `tiburon_nado`, `pirana_nado`, `pulpo_flota`, `pulpo_tinta`, `poseidon_tridente` | Atlas marinos de arriba | Cuadros compuestos en su celda (mismo pivote), al 80 % |

No se usaron: el reproductor HTML, el video, los GIF y los subtítulos del paquete de la cinemática (su guion era otro:
Sofía y Estoker van juntos a una misión; el autor pidió que Sofía llegue sola y lo recuerde); «caminar_estoker» y
«caminar_con_sofia» (no forman una caminata continua).

## V58.2 · Paquete de invierno (`Assets_V56_Invierno`): no integrado

Sus fondos, enemigos árticos y la Sofía de invierno están pensados para «escenas celestes» y niveles de baja gravedad
que este juego no tiene. Queda fuera hasta que exista un mundo de invierno.
