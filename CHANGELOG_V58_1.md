# V58.1 · Mundos pintados: escuela, mar y Luna trazados sobre su arte

Versión `58.1.0` (`js/core/config.js`). Rama de trabajo: `ccr-83eefefd-4flatp`. Caché sin conexión nueva:
`camion-v58-1-mundos-pintados` (invalida la de V58).

## La idea

En V58 el fondo era una pintura y las plataformas se dibujaban encima: se notaban como piezas sueltas. En V58.1 la
escuela, el mar y la Luna son **una sola ilustración por nivel**, fija al mundo, y el recorrido **se trazó sobre lo
dibujado**: las repisas, balcones, escaleras, puentes, cubiertas y pisos que se ven son las plataformas, y no se
dibuja nada encima. Lo que el dibujo no trae (barca, manta, pez, OVNI, cuerdas, grietas, brechas) sí lo dibuja el juego.

| Misión | Arte (paquete aportado) | Qué reemplazó |
|---|---|---|
| 1 · La Escuela | Escuela Miguel Hidalgo: aulas superiores → patio → conserjería y entrada (3 láminas) | `escuela_fondo.png`, `escuela_patio_tarde.png`, `escuela_pasillo_lluvia.png` y las capas `parallax/escuela/` del paquete truncado |
| 3 · El Submarino | Marino PRO V4: isla → mar abierto → ciudad hundida → abismo (971 × 2928) | panorama, arrecife y peces de `SOFIA_PARALLAX_MARINO`, capas SVG de V55, `submarino_fondo.png` |
| 4 · El Espacio | Espacio Luna PRO V5: estación → cavernas de cristal → portal → ciudad bajo la Luna | panorama y decoración de `SOFIA_PARALLAX_ESPACIAL`, capas SVG de V55, `espacial_fondo.png` |
| 2 · Guadalajara (3 niveles) | Azoteas PRO V2: fondos de Guadalajara, Los Portales y Centro Histórico + capa de cornisas | `guadalajara_fondo.png`, `sofevi_centro_zigzag.png`, `centro_historico_guadalajara.png` |

## Cómo se trazó cada mundo

- **Mar**: superficie del mar en la espuma de la roca grande; el fondo del mar es el camino de la meseta de la
  casa-piña y sus puentes, con **dos brechas** dibujadas en los puentes por donde se baja buceando. La cadena del
  barco hundido es una tirolesa; los hongos gigantes pintados son trampolines. Barca en la superficie, manta bajo la
  brecha y pez trampolín.
- **Luna**: solo la franja nítida del arte (x 315–1365 px de 1680) queda dentro del mundo (lo demás es relleno
  desenfocado). Cubiertas de la estación, plataforma de aterrizaje, pasarelas con barandal, puentes, el estrado del
  portal y los discos de la ciudad. La banda de roca entre cavernas y ciudad es sólida y se baja por **dos grietas**.
  El OVNI de la capa de naves del paquete es la plataforma móvil. Gravedad 0,72.
- **Escuela**: las alturas de las losas salen de las **cornisas rojas detectadas en el propio arte**. Azotea con el
  letrero, balcones, escaleras, cafetería y banquetas (tablones que se atraviesan con BAJAR, como enseña el
  tutorial), terrazas, andador techado, patio, cancha y la calle frente al **camión escolar**. Los tres niveles miden
  lo mismo de ancho para apilarse sin huecos.
- **Guadalajara**: las superficies del manifiesto de Azoteas PRO V2 son **idénticas** a las de nuestros mapas, así que
  su capa de cornisas cae exactamente sobre las colisiones. Los tres niveles pasan a ser pintados; la capa se refleja
  junto con el fondo y no pinta piso sobre el corte central que abre V58 en el Centro Histórico.

## Personajes

- **Sofía astronauta** en la Luna (reposo, pasos, salto, caída, golpe, daño, derrota y victoria) y **Luna y Morita
  astronautas**, de los atlas aportados. Los cuadros de uno de los paquetes no tenían escala constante: se igualaron
  por el ancho del casco.
- El **niño gordito de las piedras** aparece con traje de **buzo** en el mar y de **astronauta** en la Luna, con su
  piedra. Ya no hay casco dibujado encima de la Sofía de tierra en la Luna.

## Medidas (alto total del mundo, como en el CHANGELOG de V58)

| Misión | V58 | V58.1 |
|---|---|---|
| 1 · La Escuela | 1974 × 5608, 42 enemigos, 315 cristales | 1724 × 9176, 42 enemigos, 336 cristales |
| 3 · El Submarino | 1542 × 5749, 32 enemigos, 187 cristales | 1672 × 5612, 34 enemigos, 208 cristales |
| 4 · El Espacio | 1542 × 5756, 32 enemigos, 223 cristales | 1810 × 5860, 32 enemigos, 266 cristales |

La escuela es más angosta que en V58 porque ya no tiene sectores laterales procedurales (el relleno a los costados):
todo su ancho es dibujo recorrible. Es 1,6 veces más alta.

## Rendimiento (Chromium sin pantalla, dibujo por software: cota pesimista)

| Nivel | CPU normal | CPU frenada ×4 |
|---|---|---|
| Escuela (2 niveles medidos) | 60 fps | 57–58 fps |
| Mar | 59–60 fps | 52–57 fps |
| Luna | 60 fps | 49–58 fps |
| Portales / Centro Histórico (Guadalajara PRO) | — | 35 / 40 fps |

- Portales llegó a caer a **12 fps** con la CPU frenada (sus fondos miden 1536 × 2504 y se reescalaban cada cuadro):
  ahora se cachean una vez reducidos al tamaño que se muestra (dibujo de 54,7 → 4,4 ms).
- Las capas de ambiente del mar se funden en dos planos; en modo ligero (equipo lento) no se dibujan.
- La primera vez que se entra a un nivel con lámina grande hay un tirón mientras se decodifica (medido en Centro
  Histórico: la primera medición dio 15 fps, la segunda 40).

## Validación

- `node --test tests/*.test.js`: **139/139** (prueba nueva `tests/v58_1_mundos_pintados.test.js`; las que verificaban
  el arte anterior ahora verifican el nuevo y que el anterior ya no exista).
- Analizador con la física real en fácil, normal y difícil: meta, paradas, paradas intermedias, zonas inferiores,
  objetos y **todos los cristales** alcanzables y sin trampas: misión 1 completa (336 cristales), mar (208), Luna
  (266) y la secuencia de 16 niveles. El analizador ahora también bucea a cualquier profundidad en mar abierto.
- Navegador real: capturas de cada mundo en varias alturas, bot de tirolesa y buceo por la brecha, partidas con
  entradas aleatorias en las cuatro misiones y la cinemática completa (sin errores de consola). Prueba sin conexión:
  se instala la caché nueva (306 archivos), se corta la red y el juego arranca y se juega.

## Lo que no se usó o no se pudo hacer (y por qué)

- Los **instaladores** de los paquetes exigen una rama (`manus/release-candidate-v58.1-fase4`) que no existe en el
  repositorio y modifican archivos con anclas que ya no coinciden: todo se integró a mano.
- Las **coordenadas de plataformas** de los paquetes de mar, Luna y escuela son de **otra versión de los mapas**
  (p. ej. 1976 × 5960 u): no corresponden al juego. Por eso esos tres mundos se trazaron de nuevo sobre el arte.
- **Nichos con reja** (llave y corazón): viven en los sectores laterales, que la escuela ya no tiene (igual que el
  mar y la Luna desde V58). Los demás niveles los conservan.
- No se usaron: la versión «alineada» de la lámina 01 de la escuela (deformada para otro mapa), sus capas de árboles
  translúcidos (se veían como fantasmas sobre la fachada), la nebulosa y los planetas de la Luna (apagaban o
  duplicaban el cielo pintado), los vestuarios `sofia_cuadros` y `sofia_variacion_roja`, ni las animaciones de
  salto/daño/victoria/derrota de las gatas (el juego no tiene esos estados para ellas).
- El mar incluye una **casa con forma de piña** (ya estaba en el fondo marino anterior). Para venderlo conviene
  revisarla: recuerda mucho a una caricatura conocida.
- En el nivel apaisado de Guadalajara algunas cornisas de la capa PRO cruzan la fachada pintada (lo avisa su propio
  informe).
- No se probó en un teléfono físico ni se jugó a mano cada nivel completo: la validación es automática.
