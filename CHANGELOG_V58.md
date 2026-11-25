# V58 · Mundos al doble, tirolesas, mar abierto, gatas protagonistas y ARCHIVO 01

Versión `58.0.0` (`js/core/config.js`). Rama de trabajo: `ccr-83eefefd-4flatp`.

## Consolidación de ramas

| Rama | Qué aportó | Cómo entró |
|---|---|---|
| `feature/toxifamilia-v57-villains-qa` | Enemigos temáticos (piraña, tiburón, dron), CI | avance rápido (sin conflictos) |
| `feature/toxifamilia-cinematic-bridge` | Reproductor de escenas, manifiesto, evento de inicio de misión | fusión; conflicto del HTML resuelto a mano |
| PR #6 (`upgraded-funicular`) | Precarga de los archivos de la cinemática en el service worker | fusión |
| `work/expediciones-parallax`, `work/parallax-real-v55`, `v53-mundos` | — | revisadas línea por línea: solo tenían versiones anteriores de líneas que V56/V57 ya reemplazaron |

## Niveles al doble de tamaño

Medidas reales del mundo construido (unidades de mundo):

| Misión | V57 | V58 |
|---|---|---|
| 1 · La Escuela | 1548 × 3089, 27 enemigos, 98 cristales | 1974 × 5608, 42 enemigos, 315 cristales |
| 2 · Guadalajara | 2432 × 10544, 180 enemigos, 540 cristales | 2432 × 20519, 294 enemigos, 1393 cristales |
| 3 · El Submarino | 1892 × 3089 (panel de 770), 10 enemigos | 1542 × 5749 (panel de 1542), 32 enemigos, 187 cristales |
| 4 · El Espacio | 1892 × 3089 (panel de 770), 9 enemigos | 1542 × 5756 (panel de 1542), 32 enemigos, 223 cristales |

- **14 niveles verticales**: el doble de ancho y de alto. Mitad alta = trazado original + su espejo, unidos por el
  centro (las cornisas que tocaban el borde forman plataformas largas para correr y pelear). Mitad baja = sección
  nueva en serpentina: cada fila se recorre casi entera y tiene una pieza (tirolesa, vehículo, sombrilla, tejas
  flojas o banda). La meta es la fila más ancha: arena amplia para el jefe.
- **2 niveles apaisados** (Centro de Guadalajara, Tlaquepaque; ya medían 1600 de ancho): el doble de alto.
- **Mar y órbita**: el área diseñada mide el doble de ancho y de alto que en V54/V57. Se quitaron sus sectores
  laterales procedurales (el relleno a los costados), así que el mundo total es más angosto que en V57 aunque lo
  jugable sea el doble: ahora el mar va de pared a pared.
- **Parada intermedia** en cada nivel (banderín ½): se activa al pisar su fila y el reintento reaparece ahí.

## Mecánicas nuevas (física real, con pruebas)

- **Tirolesas**: Sofía se cuelga al tocar el cable en el aire (o al salir por la orilla bajo el poste), baja
  acelerando con la pendiente, SALTAR la suelta con impulso, BAJAR la deja caer, un sólido la detiene y colgada no
  acumula altura de caída. Luna y Morita viajan en sus hombros.
- **Vehículos y trampolines con aspecto**: camión (sprite del juego), carrito, tren, balsa, manta y nave cruzan
  huecos; peces y naves sirven de trampolín. Es solo arte: la física es la de las tarimas y palomas de siempre.
- **Mar abierto**: flotación neutra bajo la franja de superficie (se bucea a cualquier profundidad), pilares de
  coral, balsas, peces trampolín, seis pirañas y el tiburón jefe patrullando el mar. Se baja por **desagües** del
  fondo en cascada al templo hundido.
- **Órbita**: gravedad 0,72 (saltos más altos y largos), cables de anclaje, naves y asteroides.
- **Botón GATAS** (C / E, botón 🐾): con un enemigo cerca, Luna se lanza contra él (los comunes caen; el jefe recibe
  un golpe o se marea si embiste de frente). Sin enemigos, Morita trae los cristales cercanos. Recarga de 7 s,
  visible en el HUD y en el botón. En el mar las gatitas bucean con Sofía (casco y tanque).
- Enemigos nuevos: **cangrejo** (ruinas) y **robot** (estación).

## Fondos del tamaño del nivel

- Cada tramo pinta su arte de pared a pared del mundo y en toda su altura (también detrás de los sectores
  laterales), en dos planos con paralaje (lejano y arquitectura) y mosaico espejo si la franja es más ancha.
- Se usan las capas 16:9 aportadas (escuela: azotea, pasillos y patio; Guadalajara: azoteas, mercado/parque y
  barrios). Los niveles sin capa nueva repiten su propia pintura a lo ancho. Ver `assets/parallax/FUENTES.md`.
- Escuela y Portales (colisión trazada sobre el dibujo): arte exacto en la mitad alta y su espejo; los rótulos
  se vuelven a pintar al derecho para que no se lean al revés.
- Mar y órbita: panorama nuevo en pantalla que recorre la lámina según el avance; arrecife y bancos de peces, o
  estrellas, asteroides, satélites y estaciones a media velocidad. Se quitó el halo blanco de la lámina de peces.

## Historia: ARCHIVO 01

- Prólogo adaptado del guion v3.0 entregado en el chat (las frases entre comillas son las del guion): la cuenta
  regresiva (21:45 HRS, monitores), la odisea urbana bajo la lluvia en el Mercado San Juan de Dios y el frente
  conjunto con el HUD arcade y **PRESS START**, que arranca la misión 1. Se ve antes de la primera partida y en
  **VER CINEMÁTICA**.
- Los seis objetos esconden las **seis llaves USB**. Al terminar la última misión con las seis se desbloquea la
  **escena post-créditos** (la reja, el panel maestro, el apagón de Puente Grande y **LEGEND OF PRESOS**), con botón
  en la pantalla de victoria y en el menú.
- Estoker y Doña Tóxica aparecen como **siluetas originales** (`assets/cinematica/`): no hay arte de esos
  personajes en el repositorio.

## Errores corregidos al probar

- Bajo el agua los peces no hacían daño ni recibían golpes: la caja de Sofía sumergida era «ningún lado» también
  para ellos (verificado con el bucle real antes y después).
- Reintentar tras perder armaba la secuencia completa de 16 niveles en vez de la misión que se jugaba, y conservaba
  los objetos comparando su índice de historia con el número de tramo.
- `tools/qa/perf_test.js` usaba la API anterior a las misiones (`Q.start(n)` tomaba n como misión).

## Rendimiento

- Simulación (Node, misión 2, mismo recorrido): V57 0,16 ms por paso → V58 0,11 ms, con 1,8× plataformas y 2,5×
  recogibles (índices por altura para plataformas y recogibles).
- Navegador con la CPU frenada ×4 (Chromium sin pantalla dibuja por software: cota pesimista): escuela ≈ 37 fps
  (V57 ≈ 39), ciudad 38–42 fps (V57 29–49, medición ruidosa), mar ≈ 36 fps (V57 ≈ 23) y órbita ≈ 45 fps
  (V57 ≈ 26), ya con el mar y la órbita al doble. Con la CPU normal, 58–60 fps en todos.
- Si el juego baja la resolución por lentitud, el fondo pasa a un solo plano fundido.

## Validación

- `node --test tests/*.test.js`: todas las pruebas pasan (incluidas 18 nuevas en `v58_mecanicas.test.js` y
  `v58_niveles.test.js`).
- Analizador de alcanzabilidad con la física real: los 18 niveles en fácil, normal y difícil (meta sin daño,
  parada intermedia, todos los cristales, llaves, objetos y sin trampas) y las misiones 1 y 2 completas con sus
  transiciones.
- Navegador real (Chromium): capturas en horizontal y vertical, recorrido de la cinemática completa, partida con
  entradas aleatorias en las cuatro misiones y bot que baja en tirolesa y bucea por un desagüe; sin errores de
  consola.

## Pendiente (no se hizo o no se pudo verificar)

- El ZIP de la escuela llegó truncado: faltan las secciones `escuela` y `escuela_vecina` del paquete.
- Guadalajara trae 3 escenas para 13 tramos: el resto usa su pintura anterior.
- El PDF «La_Toxifamilia_Historia_Completa.pdf» sigue sin poder leerse; no se le atribuye nada.
- No hay arte de Estoker ni de Doña Tóxica (se usan siluetas).
- No se probó en un teléfono físico ni se jugó a mano cada nivel completo: la validación es automática.
