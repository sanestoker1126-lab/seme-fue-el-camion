# V56 (propuesta) — Pulido visual y mecánico La Toxifamilia

## Alcance real

Se construyó la **primera pasada de dirección de arte**, no una sustitución definitiva de todas las ilustraciones. El usuario está escribiendo el guion `La_Toxifamilia_Historia_Completa.pdf`. Hasta recibir personajes, vestuario y diseño aprobados, se mantiene a Sofía, Luna y Morita y no se asignan nuevas identidades ficticias a los villanos.

**Rama**: `feature/toxifamilia-v56-art-gameplay`, desde `main` V55. No depende del PR de cinemáticas y no debe fusionarse sin QA.

## Cambios implementados

- `js/core/toxifamilia_style.js`: perfil cromático, atmósfera, cartel y motivo específicos para **cada uno de los 18 niveles**, sin alterar mapas o colisiones.
- `js/app/render.js`: niebla leve, neones, partículas/estrellas/burbujas dependientes del nivel; dibujo recortado al área visible para limitar coste en móviles. Señales anticipatorias de dirección y tipo de ataque para **7 clases de enemigos**. El fondo gráfico original sigue renderizándose igual.
- `js/core/enemies.js`: jefe entra en segunda fase exactamente una vez al caer al 50 % o menos de vida, con +10 % a la velocidad de patrulla/carga. No gana ataques ocultos y conserva tiempos originales de aviso, cajas de colisión y daño.
- `js/app/main.js`: mensajes de bloqueo frontal, armadura, cambios de fase y golpes confirmados; mensajes informativos limitados para evitar spam.
- `css/toxifamilia_style.css`: UI, HUD, menú, selector de misiones, botones táctiles y contraste de colores negros, violetas, verdes y rosas.
- `js/app/render.js`: robustez de carga; una imagen que terminó fallida ya no deja bloqueada su promesa, y las cargas atascadas agotan el tiempo a los 9 s para no inmovilizar el arranque.
- `Se_Me_Fue_El_Camion.html`: habilita explícitamente la hoja y el módulo visual sin cambiar las entradas al juego.
- `sw.js`: caché V56, precarga de ambos ficheros nuevos y versiones actualizadas de render, IA y arranque para uso offline.
- `tests/v56_toxifamilia_polish.test.js`: cobertura de perfiles, jefes, integración y caché.

## Matriz de estilo — 18 niveles

| Nivel | Identidad visual añadida | Estado |
| --- | --- | --- |
| 01 La Escuela | Verde ácido y fucsia, grafiti | Pasada de iluminación |
| 02 Centro de Guadalajara | Naranja nocturno, cartelería | Pasada de iluminación |
| 03 Escuela vecina | Verde de cuarentena, franjas de alerta | Pasada de iluminación |
| 04 Colonias de noche | Violeta y cian, bruma | Pasada de iluminación |
| 05 Azoteas | Rosa eléctrico y antenas | Pasada de iluminación |
| 06 Escuela en ruinas | Verde húmedo, gotas | Pasada de iluminación |
| 07 Centro Histórico | Oro y violeta, carteles | Pasada de iluminación |
| 08 Portales | Oro y rosa, grafiti | Pasada de iluminación |
| 09 Zapopan | Violeta y azul, bruma | Pasada de iluminación |
| 10 Terminal de las Arcadas | Oro y turquesa, advertencias | Pasada de iluminación |
| 11 Metro | Cian y verde, franjas | Pasada de iluminación |
| 12 Mercado Tapatío | Verde lima y coral | Pasada de iluminación |
| 13 Parque Metropolitano | Verde y ámbar, esporas | Pasada de iluminación |
| 14 Tlaquepaque | Rosa y dorado, carteles | Pasada de iluminación |
| 15 Andén | Cian y lila, señalización | Pasada de iluminación |
| 16 Plaza Jacarandas | Morado y rosa, esporas | Pasada de iluminación |
| 17 Submarino | Turquesa y azul, burbujas | Pasada de iluminación |
| 18 Espacio | Lila y cian, estrellas | Pasada de iluminación |

**Importante**: todas estas escenas **conservan los fondos y mapas V55**. Los gráficos de fondo no se han reilustrado todavía; la personalización es una capa visual procedural ligera.

## Enemigos y jefes

| Clase | Telegráfica | Estrategia conservada |
| --- | --- | --- |
| Rata | Contorno verde | Pisotón / dash |
| Perro | Ataque naranja direccional | Esquivar embestida |
| Perro bravo | Rosa, armadura y aviso | Esperar mareo |
| Chile | Proyectil naranja | Romper semilla / esquivar |
| Murciélago | Contorno violeta | Cambiar altura |
| Paloma | Azul, aviso del ataque | Evitar ruta inferior |
| Niño | Amarillo, aviso de apuntado/carga | Esquiva / contraataque |

La segunda fase aplica únicamente a jefes y **no** inventa su identidad narrativa.

## Verificación

- JS: validación sintáctica en la herramienta de desarrollo para `levels.js`, `toxifamilia_style.js`, `enemies.js`, `render.js`, `main.js` y `sw.js`.
- Validación de ejecución de perfiles: 18 niveles de cuatro misiones y 18 perfiles únicos.
- Simulación aislada del golpe al jefe: evento de segunda fase una sola vez al reducir de 4 a 2 HP y velocidad +10 %.
- Verificación cruzada de caché y enlaces HTML.
- **Pendiente**: suite de Node íntegra, comprobación en navegadores reales, FPS en Motorola/Android, pruebas de pantalla vertical/horizontal, saltos, agua, cargas incompletas y enfrentamientos con jefes.

Comandos QA:

```bash
node --test tests/*.test.js
python3 -m http.server 8000
# http://localhost:8000/Se_Me_Fue_El_Camion.html
```

## Próximo pase de producción

1. Ejecutar la suite completa y corregir errores del motor sin cambiar la dificultad inadvertidamente.
2. Revisar cada escenario a 360×800 y 1920×1080: contraste, cobertura de fondo, puntos de aterrizaje, visibilidad de los jefes y colisiones.
3. Hacer una lista de sprites verdaderamente faltantes/deteriorados por personaje y sustituir **solo** los aprobados.
4. Incluir tras el guion oficiales a La Toxifamilia como narrativa y personajes canónicos (en PR independiente).
