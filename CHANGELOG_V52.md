# V52 · Sofía nada: atlas de nado extraído por contorno, agua en el Parque y en la Plaza

## Atlas de nado (por contorno, sin cortar cuadrículas)
Fuentes: los dos atlas «SOFÍA - ATLAS NADANDO (2.5D)», de 1536×1024 cada uno (copias en
`tools/arte/fuentes_nado/`). No son transparentes. El «fondo transparente» es un tablero de ajedrez pintado, cada
tira de cuadros está sobre un panel de agua y hay títulos y números encima. Los cuadros tampoco caen en una rejilla
fija. Por eso cortar por cuadrícula habría dejado tablero, agua y números pegados a Sofía.

Cómo se sacó cada cuadro (`tools/arte/swim_extract.py`):
1. **Tablero.** Se quita con un relleno desde el borde que tiene barrera, para no comerse la ropa blanca de Sofía.
   Los huecos encerrados se quitan solo si tienen textura de tablero.
2. **Cada Sofía por separado.** Se encuentra por sus propios colores: cabello oscuro, piel, falda roja y astas
   doradas. Cada figura crece desde esos colores sin invadir a la vecina.
3. **Agua pintada.** Se separa del cuerpo con GrabCut y con una regla de color de agua medida en muestras del atlas.
4. **Limpieza.** Se quitan números, orillas claras y motas.
5. **Cuadros de superficie.** Se cortan en la línea donde el agua toca el cuerpo, medida cuadro por cuadro, porque
   el agua está dibujada en perspectiva.

Resultado:
- **158 cuadros en 31 secciones** (61 del atlas A y 97 del B). La hoja de revisión marca en verde el contorno de cada
  uno.
- **`assets/player/sofia/swim_atlas.png`** (1024×441) tiene 62 cuadros en 14 animaciones, más 8 efectos:
  - salpicadura chica, mediana y grande;
  - burbujas, columna de agua, onda, remolino y gota.
- Los otros cuadros son versiones alternativas del mismo movimiento o el mismo movimiento hacia el otro lado. El juego
  refleja el dibujo según hacia dónde mira Sofía.
- **Escala.** Se midió por el tamaño de la cara frente a `idle_01`, para que Sofía nadando mida lo mismo que en tierra.
- **Reproducible.** Repetir la extracción y el empaque con los mismos atlas da exactamente la misma hoja (comparada
  píxel a píxel). Los pasos están en `tools/README.md`.

## Nadar
| Control | En agua profunda |
|---|---|
| ↓ (joystick, flecha/S o BAJAR) | bucea; con el joystick también en diagonal |
| ↑ o SALTAR sostenido | sube |
| soltar todo | flota y vuelve sola a la superficie |
| SALTAR en la superficie | sale del agua de un salto (misma altura que un salto normal) |
| SALTAR bajo el agua | brazada hacia arriba |
| DASH | impulso bajo el agua hacia donde apunta el joystick |
| nadar contra una orilla al ras del agua | Sofía se sube sola |

- **Caer al agua** no hace daño por caída, desde ninguna altura. Hay salpicadura chica, mediana o grande según la
  velocidad, además de onda y sonido. Al caer hacia agua profunda, Sofía pone pose de clavado.
- **Con la cabeza bajo el agua**, enemigos y obstáculos no la alcanzan (bucear también es esquivar). En la superficie
  sí la alcanzan.
- **No se patea en agua profunda.** Sumergida no se sale por los lados de la poza, y el fondo es sólido.
- **Efectos:** burbujas al bucear y ondas al nadar en la superficie. Los sonidos (chapuzón, chapuzón grande, brazada,
  chapoteo, goteo) los genera el motor de audio; no hay archivos de audio nuevos.
- **Las gatitas no nadan:** mientras Sofía está en agua profunda, la esperan en la orilla más cercana.
- **Aviso.** Al entrar al agua aparece «¡AL AGUA! ↑ SUBE · ↓ BUCEA · SALTAR SALE · DASH IMPULSO», como mucho una vez
  cada 30 s. La guía del menú también lo explica.
- **Agua baja** (la pila de la Plaza): se vadea.
  - Sofía acelera más lento (×0.68) y salta un poco menos (×0.92).
  - Salpica al correr y al caer dentro. La salpicadura al caer se agregó en esta revisión, con su prueba.

## Agua en dos niveles
- **Nivel 13 · Parque Metropolitano.** Lago profundo bajo el puente de tablas que se rompen; antes ahí había una
  plataforma.
  - La orilla izquierda tiene pared. La derecha queda al ras del agua y se sube nadando.
  - Hay dos cristales nuevos en el fondo del lago (se toman buceando).
  - El fondo del lago es sólido: un salto desde abajo no se mete al agua.
- **Nivel 16 · Plaza de las Jacarandas.** La pila de la fuente es agua baja y tiene un cristal nuevo dentro.

## Cómo se verificó
- `node --test tests/*.test.js`: **85 de 85**. Son las 73 de V51 más 12 nuevas en `tests/v52.test.js`:
  - física del agua profunda y baja;
  - integración en el juego;
  - datos de los niveles con agua;
  - el atlas y su precarga;
  - bucear para esquivar;
  - la salpicadura al caer en la pila.
- **Alcanzabilidad con la física real (Parque y Plaza, 3 dificultades).** Se llega a la meta, no hay trampas sin
  salida y se pueden recoger todos los cristales:
  - Parque: 31, 29 y 28 cristales (fácil, normal y difícil).
  - Plaza: 26, 23 y 26.
  - Al analizador se le agregó el agua: nadar a cada orilla, salir de un salto y bucear.
- **Bot de jefes:** 48 de 48 peleas ganadas, igual que en V51. Solo cambió el jefe del Parque en fácil: tardó 34 s en
  vez de 10. El bot se cayó por un hueco a la derecha de la arena, bajó al tramo siguiente y tardó en volver. Ese
  hueco es parte de un sector lateral que cambió (ver «Efecto secundario»); en V51 también había uno ahí.
- **Toques reales en un teléfono emulado** (`tools/qa/swim_touch.js`), en este orden:
  1. joystick en diagonal abajo: bucea;
  2. DASH bajo el agua: impulso (velocidad 430; nadando normal, 215);
  3. joystick arriba: sube a la superficie;
  4. soltar: flota;
  5. SALTAR: sale del agua.

  `touch_test.js`: 18 de 18.
- **Partida aleatoria.** En los 16 niveles: 0 errores. Dentro del lago y de la pila (`fuzz_agua.js`, 3 semillas cada
  uno, 3000 pasos): 0 errores. Ahí se vieron todos los estados de nado y de vadeo.
- **Sin conexión:** el service worker precarga 146 archivos (V51: 145, más `swim_atlas.png`). Con la red cortada, el
  juego carga y se juega.

### Rendimiento
Medido con `perf_agua.js`, con Sofía nadando en el lago o vadeando en la pila. Se comparó la misma versión con y sin
el dibujo del agua (3 corridas de cada una, teléfono emulado):

| CPU frenada | Lugar | con agua | sin dibujar el agua |
|---|---|---|---|
| ×4 | lago | 26–40 fps (promedio 33) | 28–33 (31) |
| ×4 | pila | 39–49 (43) | 43–48 (45) |
| ×6 | lago | 26–29 (28) | 30–31 (30) |
| ×6 | pila | 22–32 (28) | 31–33 (32) |

Con la CPU sin frenar (×1) se mantuvo en 60 fps con el agua en pantalla. No encontré un costo claro: con ×4 no
hay diferencia consistente. Con ×6, el promedio con agua sale 2–4 fps
más bajo, pero entre corridas idénticas en esta máquina los fps variaron hasta 13. Chromium sin pantalla dibuja por
software: esto sirve para comparar, no es la medida de un teléfono real.

## Efecto secundario
Los sectores laterales (fuera del mapa pintado) se generan en orden a partir de las superficies que tocan la orilla
del mapa. La plataforma del Parque que tocaba la orilla derecha cambió de altura: ahora es la orilla del lago. Por eso
algunas partes de los niveles 13 a 16 salieron distintas que en V51:
- los sectores laterales **derechos**;
- en difícil, cuál tarima lateral del nivel 15 es trampolín.

El lado izquierdo y los niveles 1 a 12 no cambiaron. Esos niveles pasan las mismas comprobaciones: alcanzabilidad
completa, cristales y jefes.

## Notas honestas
- **Sin teléfono físico.** No se probó en un teléfono físico ni en Safari/iOS; todo es emulación de Chromium.
- **Cuadros de nado más suaves.** Los atlas son ilustraciones con poca resolución por cuadro: Sofía viene más chica
  que en sus cuadros de tierra. Por eso los cuadros de nado se dibujan ampliados 1.4–1.7× y se ven más suaves.
- **Bajo el agua se ve oscura.** Los cuadros bajo el agua son más oscuros y azulados porque así están pintados: el
  agua va encima del cuerpo.
- **Piernas en «nadar bajo el agua» del atlas A.** Las piernas, oscuras, casi no se distinguen del agua pintada. En
  los cuadros hacia la derecha la extracción no pudo separarlas, así que el juego usa los de la izquierda reflejados.
- **Agua solo en 2 niveles.** El lago del Parque (profundo) y la pila de la Plaza (baja).
- **Sin medidor de aire.** Sofía puede quedarse bajo el agua sin límite, y ahí no la alcanzan los enemigos. En estos
  dos niveles no rompe ninguna pelea: las arenas de jefe están ~250–300 u de mapa más abajo que el agua, y en la pila
  (agua baja) no se sumerge. Un nivel futuro con agua junto a enemigos lo tendría que considerar.
