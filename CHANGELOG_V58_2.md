# V58.2 · La llegada al mar: mar submarino, cuerdas, niño en cada mundo y la cinemática con papito Estoker

Versión `58.2.0` (`js/core/config.js`). Rama de trabajo: `ccr-83eefefd-4flatp`. Caché sin conexión nueva:
`camion-v58-2-llegada-al-mar` (400 archivos; invalida la de V58.1).

## Lo que pidió el autor y cómo quedó

| Pedido | Qué se hizo |
|---|---|
| El mundo marino debe ser completamente marino; solo en la isla se camina normal | Bajo la isla **todo es mar abierto**, de pared a pared y hasta el lecho, donde está la salida (la escotilla), a la que se llega **nadando**. Toda repisa bajo la superficie está sumergida: ahí se nada y se patea nadando, no se camina en seco. Se quitaron la manta, el pez trampolín, los hongos trampolín y la cadena-tirolesa del fondo (eran cosas para caminar sobre el agua). |
| Cinemática: Sofía llega al mar sorprendida y confundida; recuerdo de su papito Estoker paseándola ahí de pequeña; Estoker le platica los peligros | **Llegada al mar**: 6 escenas (≈ 86 s, se adelanta línea por línea o se salta). Ver abajo. |
| El niño de las piedras como enemigo en cada mundo | Está en los **cuatro mundos**: escuela (7, en 2 de sus 3 niveles), Guadalajara (29, en 8 de 13 niveles), mar (8, con traje de buzo) y Luna (6, con traje de astronauta). |
| Tirolesas y cuerdas para columpiarse | **Cuerdas nuevas** (mecánica nueva): escuela 4 columpios, mar 1 liana, Luna 4 cables. Tirolesas: escuela 3, Guadalajara 26, mar 2 (una nueva), Luna 3. |
| Sonido del otro gato al encontrar enemigos | Al descubrir un tipo de enemigo nuevo maúlla «el otro gato» (con 7 s de espera para no repetirlo). |
| Animaciones de las gatas ayudando a Sofía | Luna **salta en arco** sobre el enemigo y lo araña al caer («¡MIAU!» con zarpazo); Morita **va por los cristales** con destellos; las dos **bufan** («¡FSSS!») cuando lastiman a Sofía; en tirolesas y cuerdas viajan en sus hombros. |

## Cinemática «Llegada al mar» (`js/core/toxifamilia.js` · `MARINO`)

1. **¿Dónde estoy?** (presente, cima de la isla): Sofía entra caminando, mirando a todos lados, se detiene y voltea a
   un lado y al otro; Luna y Morita la siguen. «¿Eh? ¿Dónde estoy? ¡Hay mar por todos lados!… Este lugar se me hace
   conocido… ¿Ya había venido aquí?»
2. **Recuerdo · Los paseos con papito Estoker** (tono sepia de memoria): Sofía pequeña y su papito caminan **de la
   mano** por esa misma playa.
3. **Recuerdo · Los tiburones**: Estoker le explica cómo esquivarlos y cuándo pegarles.
4. **Recuerdo · Pirañas, pulpos y cangrejos** (visión bajo el agua): el tiburón, la piraña y el pulpo animados.
5. **Recuerdo · Poseidón, rey del mar**: Poseidón con su tridente y el niño buzo lanzando su piedra.
6. **De vuelta al presente · ¡A bucear!**: «Tiburones, pirañas, pulpos… y Poseidón. ¡Gracias, papito! Luna,
   Morita: ¡al agua!»

- Los consejos de Estoker son **los mismos que da el juego** (tiburón: esquivar y pegarle mareado; pulpo: esquivar la
  tinta o romperla con DASH; cangrejos: pisar, patear o DASH; Poseidón: pegarle mareado; niño: lanza piedras).
- Sofía sale con el **vestuario elegido en el menú** (original, uniforme o rosa: el paquete traía esos tres).
- Se ve **la primera vez que se empieza la misión 3** (si la opción de cinemáticas está en VER). Terminarla o
  saltarla la marca como vista y en los dos casos empieza la misión. Después se repite desde el menú con
  **LLEGADA AL MAR · CINEMÁTICA**. BORRAR PROGRESO la vuelve a mostrar.
- El reproductor ahora tiene: personajes animados por cuadros con su propia línea de tiempo (caminar, detenerse,
  voltear, nadar de ida y vuelta), cuadro de diálogo arriba con quién habla (Sofía en rosa, Estoker en dorado), efecto
  de recuerdo (sepia, viñeta e insignia RECUERDO) y burbujas. Con «reducir movimiento» del sistema, los personajes
  aparecen quietos en su lugar final.

## Enemigos marinos con los atlas aportados

- Tiburón (ahora enemigo normal, 3 golpes), piraña, **pulpo** (nuevo: se infla y lanza tinta; el DASH la rompe) y
  **Poseidón, rey del mar** (nuevo jefe del mar, 8 golpes: embiste con el tridente de cerca, lanza olas de lejos y
  queda mareado). Los atlas pasaron de 7,75 MB (PNG) a 1,84 MB (WebP).
- **Error corregido antes de publicar**: al integrar los atlas se usó `sourceCrop` (posición en la hoja original del
  generador) como posición del cuadro dentro de su celda. La correcta es `origin` (la que usa el visor de QA del
  propio paquete). Con el valor equivocado los 129 cuadros se dibujaban corridos hasta cientos de unidades y el
  enemigo «brincaba» de lado entre cuadros. Hay una prueba que lo vigila.

## Otros arreglos

- Los botones de cinemáticas del menú (escena final y llegada al mar) no aparecían al recargar la página hasta la
  siguiente victoria: el reproductor carga después de `main.js`. Ahora avisa cuando está listo (error anterior a
  V58.2).

## Archivos nuevos

- `assets/enemies/marinos/` (7 WebP: 4 atlas y 3 de efectos).
- `assets/cinematica/marino/` (87 WebP, 2,0 MB): 6 fondos, Sofía asombrada en 3 vestuarios (6 cuadros c/u), paseo
  de la mano (12), Estoker platicando con Sofía (12), Estoker explicando (7) y cuadros del tiburón, la piraña, el
  pulpo y Poseidón tomados de los atlas del juego. Procedencia y qué se limpió: `assets/parallax/FUENTES.md`.

## Validación

- `node --test tests/*.test.js`: **149/149** (prueba nueva `tests/v58_2_mar.test.js`, 10 casos: cuerda que cruza un
  hueco de 340 u con la física real, mar submarino, cuerdas y tirolesas por mundo, niño en los cuatro mundos, tinta
  del pulpo rota con DASH, atlas dentro de su celda, guion de la cinemática, su disparo y el validador).
- Analizador con la física real (incluye nado, cuerdas y tirolesas): en el mar, meta (la escotilla, nadando), parada
  intermedia, zona inferior y **209 de 209 cristales** alcanzables en fácil, normal y difícil; misiones 1 y 2
  completas sin trampas (dentro de la suite).
- Navegador real (Chromium): la cinemática completa en teléfono horizontal, PC y teléfono vertical con los tres
  vestuarios, sin errores de consola ni imágenes rotas; al terminar empieza la misión del mar y aparece el botón para
  repetirla. Los cuatro enemigos marinos se ven bien colocados en el nivel.
- Sin conexión: se instala la caché nueva (400 archivos), se corta la red y el juego arranca y se juega.

## Lo que no se usó o no se pudo hacer (y por qué)

- **Paquete de invierno (Assets V56)**: no se integró. Sus escenas y su lógica son para «escenas celestes» y niveles
  de baja gravedad que este juego no tiene; meterlo exigiría un mundo nuevo.
- **Corrientes marinas**: el paquete de la cinemática las menciona, pero el juego no tiene corrientes; se quitaron del
  diálogo para no prometer algo que no existe.
- **Cuerdas en Guadalajara y en el tercer nivel de la escuela**: sus filas generadas están a unos 105 u de distancia;
  no cabe el arco de un columpio sin chocar con la fila de arriba. Ahí siguen las tirolesas.
- Del paquete de la cinemática no se usaron su reproductor HTML, el video y los GIF, ni sus capas de cielo y palmeras
  (relleno vectorial): de cada escenario solo se usó la franja ilustrada, con el cielo o el agua extendidos.
- Del paquete de Estoker no se usaron «caminar_estoker» ni «caminar_con_sofia» (la mitad de sus cuadros camina solo y
  la otra mitad está parado junto a Sofía: no forman una caminata). De Sofía asombrada no se usaron los 6 cuadros a la
  izquierda: son espejos de los de la derecha y se voltean en pantalla.
- La cinemática no tiene voces ni música (el paquete tampoco las traía), igual que el prólogo.
- No se volvió a medir el rendimiento con la CPU frenada en V58.2 ni se probó en un teléfono físico; la validación es
  automática. Sigue pendiente revisar la casa con forma de piña del arte marino (recuerda a una caricatura conocida).
