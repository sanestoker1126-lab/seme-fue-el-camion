# V58.7 · Zonas secretas del mar y de la Luna, enemigos secretos, el Pulpo del Abismo y El Maestro Enojón

Se integraron los tres paquetes:

| Paquete | Qué trae | Dónde quedó |
|---|---|---|
| ENEMIGOS_SECRETOS_MARINO_ESPACIAL_V1 | pulpo marino, niño buzo, marciano, niño astronauta | zonas secretas del mar y de la Luna |
| ENEMIGOS_MAESTRO_Y_PULPO_ATLAS_V58_2_1 | El Maestro Enojón, El Pulpo del Abismo | jefe de la escuela y jefe de la zona secreta del mar |
| NIVELES_SECRETOS_MARINO_ESPACIAL_V1 | dos fondos panorámicos | «Santuario perdido de Poseidón» y «Estación orbital abandonada» |

Los paquetes traían el arte y propuestas de juego, pero ningún nivel, colisión ni inteligencia: todo eso se hizo aquí.

## Zonas secretas

### Santuario perdido de Poseidón (misión 3, el mar)
- **Entrada**: una grieta escondida en la cornisa del extremo izquierdo de la isla. Apenas brilla y se aviva al
  acercarse. La primera vez que Sofía pasa cerca sale la pista «¿UN BRILLO EN LA ROCA? PÁRATE AHÍ Y PULSA BAJAR».
- **Adentro**: todo el santuario está bajo el agua (un mar cerrado, de pared a pared). Se llega a una losa a flor de
  agua, a la izquierda. La salida es la losa del extremo derecho: se sube de un salto desde el agua y se pulsa BAJAR
  en la puerta.
- **Enemigos**: 2 pulpitos y 2 niños buzos (en FÁCIL, uno de cada uno). El jefe es **el Pulpo del Abismo** (8 golpes).
- **Premio**: 14 cristales, un corazón y 300 puntos por descubrirla.

### Estación orbital abandonada (misión 4, la Luna)
- **Entrada**: una escotilla escondida en la cornisa chica de la derecha, a media bajada.
- **Adentro**: rige la gravedad lunar. Se llega sobre la roca de la izquierda y se sube por los asteroides y la
  estación hasta la cubierta de arriba. La salida es la puerta del suelo, a la derecha.
- **Enemigos**: 2 marcianos y 2 niños astronautas (en FÁCIL, uno de cada uno). El jefe es **el Marciano Comandante**
  (6 golpes). Usa el mismo arte del marciano, más grande: los paquetes no traen un jefe espacial.
- **Premio**: 15 cristales, un corazón en la cubierta y 300 puntos.

### En las dos
- El recorrido está trazado sobre el dibujo: se pisa lo que se ve (rocas, asteroides, pasarela y anillo de la
  estación). En el mar, las losas de las orillas las dibuja el juego (el arte no las trae).
- Al salir se regresa a la misma cornisa, junto a la grieta.
- El descubrimiento queda guardado. El HUD dice «ZONA SECRETA» y el objetivo es su jefe; ya vencido, la salida.
- El resumen de la misión dice si la zona secreta se encontró. El jefe secreto no cuenta como «jefe que faltó»
  (en el mar sigue diciendo «jefes 1/1»).

## Cómo pelean

| Enemigo | Conducta |
|---|---|
| Pulpito | De cerca se encoge (aviso) y suelta un tentazo corto: solo ese golpe lastima. De lejos se infla y escupe tinta. |
| Niño buzo | Nada en su carril y arroja piedras que se hunden poco a poco. Tocarlo no lastima; sus piedras sí. |
| Marciano | Su puño brilla mientras carga y dispara un orbe hacia donde estaba Sofía al empezar la carga: se esquiva moviéndose. |
| Niño astronauta | Como el niño de las piedras: piedra lunar en arco de lejos y embestida de cerca. |
| Marciano Comandante | Como el marciano; a media vida dispara dos orbes en abanico. |
| Pulpo del Abismo | De cerca avisa y embiste con los tentáculos (después queda mareado: ahí entra el DASH). De lejos alterna un abanico de tinta (3 manchas, 5 a media vida) y un chorro de agua. Solo lastima al contacto durante la embestida. |

Todos avisan antes de atacar (signo «!», brillo o pose), igual que los demás enemigos del juego.

## El Maestro Enojón
- Es el nuevo jefe de «Pasillos de la escuela bajo la lluvia» (misión 1, parada 3). Antes ese jefe era el Perro
  Guardián, un perro bravo. Los perros bravos siguen en Guadalajara.
- Levanta la regla (aviso) y embiste corriendo. Al terminar queda mareado: ahí el DASH sí le hace daño. De frente
  bloquea patadas y DASH mientras avisa o embiste, como los demás jefes que embisten.
- De lejos alterna dos lanzamientos: un libro en arco y un borrador recto.
- A media vida grita (aviso largo) y manda dos ondas por el piso, una a cada lado. Se saltan, y se acaban en la orilla
  de su piso.
- Al vencerlo cae y queda noqueado antes de desaparecer.

## Revisión cuadro por cuadro
Se revisaron los 192 cuadros de los 6 personajes, de dos formas:
- con un detector automático (letreros, varias figuras en una celda, cortes rectos);
- uno por uno, con hojas de contacto ampliadas.

Se usaron 118. Los demás se dejaron fuera por estos motivos:

| Personaje | Cuadros | Usados | Fuera y por qué |
|---|---|---|---|
| Pulpo marino | 25 | 16 | daño 16–19 y morir 20: les falta la parte de arriba de la cabeza; tentáculo 13–15 y morir 22: cortados por el borde o con pedazos del cuadro vecino |
| Niño buzo | 25 | 16 | nadar 06 y 09, arrojar 12 y 13, morir 21–24: cortados; arrojar 15: es solo la piedra |
| Marciano | 16 | 15 | disparo 06: el rayo sale cortado por el borde |
| Niño astronauta | 25 | 16 | caminar 06, 08 y 09, arrojar 10, 12, 13 y 15, morir 20 y 24: mochila o casco cortados o borrados |
| Maestro Enojón | 52 | 41 | regla 02–04: la regla y el arco salen cortados y hay otro maestro partido; grito 01–04: cortados o con medio maestro del cuadro vecino; levantarse 00: es un letrero «LEVANTARSE (4 frames)»; levantarse 03: dos medios maestros; borrador 02 y daño 02: dibujados 7–10 % más chicos que sus vecinos («se encoge») |
| Pulpo del Abismo | 49 | 14 | ver abajo |

Del Pulpo del Abismo, del cuadro tentacle_strike_04 en adelante el paquete viene desfasado:
- cada celda trae media figura de un cuadro y media de otro;
- hay letreros dentro de las celdas («RECUPERAR», «KO»);
- se intentó unir las mitades y no casan (salen dos coronas pegadas).

Además vienen cortados en recto del lado derecho el golpe, la tinta, el chorro, dos de reposo y un KO, y los tres de
daño vienen recortados en rectángulo. Por eso su golpe, su tinta, su chorro y su mareo se dibujan con efectos sobre
los 14 cuadros completos (reposo, nado, el aviso del tentáculo y el KO).

Limpieza dentro de los cuadros que sí se usan:
- se quitaron pedazos de cuadros vecinos que se colaban en la celda (tentáculo 12 del pulpo, disparo 07 y morir 12–13
  del marciano);
- se quitó la sombra oscura pegada bajo los tentáculos del pulpo marino;
- el borrador que el maestro lanza se recortó de su propio cuadro.

Todo lo hace `tools/arte/secretos_pack.py`, que también explica cada decisión. Con los paquetes originales, ese script
rehace los atlas.

**Calidad del arte**:
- Es arte generado.
- El niño astronauta es el de menor calidad (bordes blancos dentados; el contorno del casco cambia entre cuadros).
- Al pulpo marino le faltan ~4 px de la punta de la cabeza en reposo y nado: en el juego es ~1,5 u y no se nota.

## Comprobado
- Pruebas: `node --test tests/*.test.js`. Son 12 nuevas en `tests/v58_7_secretos.test.js`:
  - atlas;
  - precarga y modo sin conexión;
  - la IA de los 6 enemigos;
  - la construcción de las zonas;
  - entrar y salir con BAJAR, el guardado y el resumen;
  - el jefe de la escuela;
  - un bot que vence a los dos jefes secretos con la física real.
- Análisis de alcanzabilidad con la física real, en las tres dificultades y en las dos zonas:
  - la meta se sigue alcanzando y no hay trampas;
  - se entra y se sale de cada zona;
  - todos los cristales se alcanzan (14 en el mar, 15 en la Luna; uno está en la cubierta del jefe).
- Bot de jefes:
  - el Maestro, en las tres dificultades: 9–11 s (los otros jefes que caminan, 6–8 s);
  - el Pulpo del Abismo: 14–16 s;
  - el Marciano Comandante: ~5 s.
- En Chromium, con `tools/qa/secretos_shots.js`:
  - se entra por cada grieta con BAJAR, se fotografía cada estado de cada enemigo y jefe, y se sale por la puerta de
    regreso junto a la grieta;
  - se revisó en horizontal y en vertical, sin errores en la página.
- **No comprobado**: en un teléfono real, ni una partida jugada a mano de principio a fin.

## Ajustes hechos durante la revisión
- El techo de la cueva del santuario se subió 46 u: con la superficie del agua pegada al borde del dibujo, Sofía
  (62 u) no cabía de pie en la losa.
- La cámara sube 60 u más en el santuario, para que la puerta de salida y su letrero no queden bajo el HUD.
- La caja del nombre de los jefes se ajusta al nombre («EL MAESTRO ENOJÓN» no cabía).
- Las estrellas del mareo del Pulpo del Abismo son claras: amarillas no se veían sobre su corona.
- Una prueba de V53 exigía que todo «mar» bajara hasta el lecho de la meta. Ahora acepta el mar cerrado del
  santuario, y su salida la comprueba el análisis de alcanzabilidad.

Versión 58.7.0, caché `camion-v58-7-zonas-secretas`.
