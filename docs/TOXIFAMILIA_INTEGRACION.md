# La Toxifamilia — integración cinematográfica (rama de trabajo)

## Estado verificado

- Repositorio base: `sanestoker1126-lab/seme-fue-el-camion` (V55).
- Documento aportado: `La_Toxifamilia_Historia_Completa.pdf`, enlace WPS:
  https://us.wps.com/cms/docs/d/cbQa2t5UwooBsaYA
- El enlace público muestra el nombre del PDF, pero **no permite acceder a sus páginas desde las herramientas consultadas**. No se ha atribuido ningún diálogo o episodio a ese documento.
- Por tanto, **no se ha producido todavía la adaptación del texto real, ni una animación final de La Toxifamilia**.
- Esta rama incorpora exclusivamente el motor opcional y la conexión con el juego. La campaña base, los niveles y la física permanecen sin cambios.

## Lo que ya está implementado

1. `js/core/toxifamilia.js`: fuente, esquema de escenas y validación de recursos, duración, IDs y misión de salida.
2. `js/app/toxifamilia_cinematic.js`: reproductor con movimiento de sprites, transición de cámara, textos, avance automático, salto, teclado y controles táctiles.
3. `css/toxifamilia.css`: presentación adaptable a Android y PC, con compatibilidad para movimiento reducido.
4. `js/app/main.js`: evento `camion:toxifamilia:start-mission` para lanzar una misión tras el desenlace, sin reproducir dos intros consecutivas.
5. `Se_Me_Fue_El_Camion.html`: carga no destructiva de los nuevos módulos.
6. `tests/toxifamilia_story.test.js`: pruebas del manifiesto.

Cuando el guion real se incorpore a `SCENES`, aparecerá automáticamente la opción **LA TOXIFAMILIA · HISTORIA** en el menú. Con `SCENES=[]`, la opción **no aparece**, evitando presentar una obra inexistente.

## Prueba técnica con el material YA existente en el juego

Para visualizar el funcionamiento del reproductor sin atribuir contenido falso al PDF:

```sh
python3 -m http.server 8000
# Abrir:
# http://localhost:8000/Se_Me_Fue_El_Camion.html?toxifamiliaDemo=1
```

El menú mostrará **PROBAR CINEMÁTICA NUEVA**. Sus cuatro escenas de demostración usan exclusivamente el texto introductorio original del juego, con Sofía, Luna y Morita. **No son escenas de La Toxifamilia.**

## Guion pendiente: ejemplo de formato (NO corresponde al PDF)

```js
const SCENES = [
  {
    id: 'escena_001',
    tag: 'CAPÍTULO 01',
    title: 'TÍTULO DEL GUION',
    text: 'DIÁLOGO O NARRACIÓN TRANSCRITA DEL DOCUMENTO ORIGINAL',
    background: 'assets/scenes/generated/escuela_patio_tarde.png',
    durationMs: 8000,
    cast: [
      { name: 'PERSONAJE REAL DEL GUION', sprite: 'assets/player/sofia/run_01.png',
        x: 50, bottom: 18, scale: 1, entrance: 'enter-left' }
    ]
  }
];
```

Los nombres y el sprite del ejemplo son **marcadores técnicos**, no una propuesta de reparto. Para completar la campaña se necesita adjuntar el PDF original o una transcripción íntegra, identificar sus escenas y asociar a cada personaje su arte autorizado.

Una vez transcrito el guion, se pueden añadir escenas por misiones sin modificar el núcleo de física: `nextMission: {mission: 0, tramo: 0}` en la última escena despacha el lanzamiento de la misión elegida. Los números de misión deberán cotejarse con el mapa de niveles real antes de publicar.

## QA antes de mezclar con main

```sh
node --test tests/*.test.js
```

Revisar además en navegador: arranque sin escena (juego base intacto); demo con `?toxifamiliaDemo=1`; pantalla vertical y horizontal; avance automático y manual; botón Saltar; Escape/Enter; `prefers-reduced-motion`; continuidad del audio, la pausa y la selección de misión. No habilitar una campaña hasta contar con texto y assets verificados.
