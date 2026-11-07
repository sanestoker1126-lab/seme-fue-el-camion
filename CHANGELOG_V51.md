# V51 · Un trazado propio para cada nivel, controles táctiles revisados y más rendimiento

## Niveles: 10 trazados nuevos
En V50, 10 de los 16 niveles repetían los mapas de la escuela y de Guadalajara (algunos en espejo): cambiaba
el fondo, pero se jugaba igual. Ahora cada nivel tiene su propia geometría:

| Nivel | Antes | Ahora |
|---|---|---|
| 3 · El patio de la secundaria | escuela en espejo | árbol con ramas (tablones), toldo-trampolín como red de seguridad, tarima |
| 4 · Colonias de Guadalajara de noche | mapa de Guadalajara | escalinata desde el mirador, balcones, andamio colgante, tablón de obra |
| 6 · Pasillos bajo la lluvia | mapa de la escuela | pasillos en zigzag con rejillas (tablones) y losetas flojas |
| 7 · Centro histórico | Guadalajara en espejo | dos torres de la Catedral, plataforma móvil entre torres, nave y coro |
| 9 · Zapopan | escuela en espejo | balcón central de la Basílica, tarimas sobre el atrio, paloma |
| 10 · Terminal al amanecer | Guadalajara en espejo | andenes techados, carritos (tarimas largas), banda de maletas |
| 12 · Mercado tapatío | mapa de Guadalajara | techos de lona (tablones) y un toldo-trampolín escondido |
| 13 · Parque Metropolitano | escuela en espejo | ramas, puente de tablas que se rompen sobre la orilla, nenúfar |
| 15 · Andén del Tren Ligero | mapa de la escuela | puente peatonal con escalera, vagón que se desplaza, banda |
| 16 · Plaza de las Jacarandas (final) | Guadalajara en espejo | simétrico: tejas, bandas, fuente-trampolín; la arena de jefe más grande |

- Los niveles 1 y 8 conservan su trazado porque su fondo está **pintado** sobre esa colisión.
- Nueva pieza de mapa `planks` (tablones): se atraviesan desde abajo y con BAJAR. Ahora se dibujan con textura
  de madera (`assets/platforms/plank.png`, derivada de las tablas de `wood_table.png`); antes cualquier
  plataforma delgada era un rectángulo de color plano que no combinaba con el resto del arte.
- Nivel 2 (Guadalajara, horizontal): de 7 a 13 cristales a lo largo de sus recorridos largos.
- Nombres, historia, jefes y enemigos de cada nivel no cambian.

**Cómo se verificó** (con la física real del juego, no a ojo):
- Alcanzabilidad en fácil, normal y difícil: meta desde el inicio y desde cada parada sin daño, llaves,
  nichos con reja, zonas inferiores, objetos y ninguna trampa sin salida.
- Nuevo: **todos los cristales se pueden recoger** (una sonda en el analizador sigue cada salto y caída
  simulados con la misma regla de recogida del juego). Resultado: todos, en las 3 dificultades.
- Bot de jefes: 48 de 48 peleas ganadas (16 jefes × 3 dificultades). El bot de QA tenía dos errores propios
  (se quedaba en una cornisa sobre la arena, oscilando en el borde); se corrigieron en el bot, no en el juego.
- Partida aleatoria (900 pasos por nivel) y capturas de los 16 niveles: 0 errores.

## Controles táctiles (probados con toques reales en un teléfono emulado)
- **Toques perdidos.** Tocar PAUSA, REINTENTAR o cualquier botón de menú poco después de soltar el joystick
  (o de deslizar sobre el juego) no hacía nada: Chromium usa ese toque para "frenar" el gesto anterior y no
  genera `click`. En V50 se perdía 3 de 3 veces (toque a 120 ms de soltar el joystick, o a 200 ms de deslizar).
  Ahora funciona 3 de 3: si un botón recibe un toque limpio y el click nativo no llega en 90 ms, se dispara;
  un click nativo tardío se descarta para no activar dos veces. Comprobado además: tocar rápido una opción 6
  veces la cambia exactamente 6 veces, y deslizar el panel de opciones no cambia la opción bajo el dedo.
- **SALTAR se salía de la pantalla.** El botón de 84 px vivía en una columna de 64 px: en vertical sobresalía
  ~8 px por la derecha y en **modo zurdo se encimaba con PATEAR y DASH**. Las columnas ahora miden lo que sus
  botones.
- Con tamaño «chico» en horizontal, BAJAR medía 40 px; ahora todos los botones miden al menos 44 px.
- `tools/qa/touch_test.js`: 18 comprobaciones (joystick, 3 dedos a la vez, soltar un dedo sin soltar los
  demás, cancelación del sistema, pausa justo después de un gesto, la página no se desplaza, no hace zoom ni
  selecciona texto) y el acomodo de los controles en 24 configuraciones (vertical/horizontal, 2 tamaños de
  pantalla, chico/normal/grande, diestro/zurdo).

## Rendimiento
Con un trazado de Chrome se vio que, con la CPU lenta, casi todo el tiempo se iba en convertir el dibujo del
lienzo en píxeles, no en la lógica del juego. La capa más cara era la viñeta lateral: un degradado del ancho
del panel completo, rellenado cada fotograma aunque solo sus orillas (12 % por lado) se ven. Ahora el degradado
se crea una vez y se rellenan solo esas dos franjas: la imagen es idéntica (comparada píxel a píxel) y, a la
misma resolución, con la CPU ×6 los niveles pesados pasaron de 25–28 fps a 33–37 fps.
Además, la resolución adaptativa puede bajar hasta 50 % (antes 60 %) cuando un teléfono no alcanza.

Mismo script, misma máquina, teléfono emulado (412×839, densidad 2.6), Sofía corriendo y saltando:

| CPU frenada | V50 | V51 |
|---|---|---|
| ×1 | 55–60 fps | 60 fps |
| ×4 | 36–46 fps | 49–54 fps |
| ×6 | 25–43 fps | 33–49 fps |

Intervalo entre fotogramas en el percentil 95 con la CPU ×6: 50–67 ms en V50, 33–50 ms en V51.

Ojo: Chromium sin pantalla dibuja el lienzo **por software**; en un teléfono real lo hace la GPU. Estas cifras
son una cota pesimista útil para comparar versiones, no una medición en un teléfono.

## Fondos procedurales (azoteas, metro, Tlaquepaque)
- **Metro:** los letreros «→ ANDÉN CENTRO» y «SALIDA · RUTA 6» quedaban cortados por las columnas: ahora cuelgan
  delante. Los «carteles» eran rectángulos translúcidos que parecían fallas: ahora son carteles enmarcados
  (RUTA 6, ADOPTA, JALISCO, MARIACHI). Reloj de andén y un tren con puertas, pasajeros y letrero de destino.
- **Azoteas:** los tinacos flotaban en el cielo; ahora están sobre azoteas vecinas con antenas y cuartitos con
  luz, que se desvanecen hacia las nubes. Nubes y halo de la luna.
- **Tlaquepaque:** guirnaldas de foquitos, faroles, buganvilias, balcones de herrería, nubes, banqueta empedrada
  y textura en las fachadas.
- Se pintan una sola vez (7–12 ms) y quedan en caché: no cuestan nada por fotograma.

## Pruebas
- `node --test tests/*.test.js`: **73 de 73** (56 originales + 10 de V50 + 7 nuevas en `tests/v51.test.js`:
  trazado único por nivel, integridad de los 19 mapas, tablones, `mirror()`, precarga completa del service
  worker —cada fondo, textura y frame que usa el juego está en la lista y existe—, tamaño real de cada textura y
  versión coherente entre HTML, service worker y configuración). La prueba de alcanzabilidad ahora exige que
  todos los cristales se puedan recoger.
- Sin conexión: el service worker precarga 145 archivos; con la red cortada el juego carga, arranca y se juega.

## Herramientas nuevas (`tools/`, ver `tools/README.md`)
`niveles/level_check.js` (valida un nivel en menos de un segundo), `niveles/gem_check.js`, `niveles/map_png.py`,
`qa/touch_test.js`, `qa/perf_test.js`, `qa/losttap_matrix.js`, `qa/paint_bg.js`, `arte/plank_skin.py`.

## Notas honestas
- No se probó en un teléfono físico ni en Safari/iOS: todo es emulación de Chromium (toques reales del
  navegador a través de su protocolo de depuración y CPU frenada).
- El respaldo de toques corrige un comportamiento de Chromium/Android; en iOS probablemente no hacía falta,
  pero ahí es inofensivo (solo actúa si el click nativo no llega).
- El jefe murciélago de Tlaquepaque sigue siendo la pelea más difícil (el bot recibe 4–5 golpes); no lo cambié.
