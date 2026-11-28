# Nota histórica de la candidata V58.8.17

La V58.8.19 se entrega en un solo ZIP. Las instrucciones actuales están en `LEEME.txt`. Las siguientes corresponden a la distribución anterior.

**Base:** V58.8.1_master / Se_Me_Fue_El_Camion_V58.8.1. El informe QA más reciente identifica cambios integrados hasta la fase V58.8.17. Esta carpeta no es un checkout Git.

## Cómo reconstruir el juego

Los tres ZIP son partes complementarias del mismo árbol; no son tres juegos separados. Extrae los tres en el mismo destino y conserva/combina la carpeta `Se_Me_Fue_El_Camion_BASE_V58.8.1_FASE_58.8.17_RC` que comparten. El archivo `Se_Me_Fue_El_Camion.html` y sus recursos deben quedar juntos bajo esa carpeta.

- Windows: desde la carpeta extraída, abre una terminal y ejecuta `python -m http.server 8000`; visita `http://localhost:8000/Se_Me_Fue_El_Camion.html`.
- Linux/macOS: ejecuta `python3 -m http.server 8000` en la carpeta y abre la misma URL local.
- Android: extrae las tres partes a la misma carpeta y sírvela con una app de servidor HTTP local; abrir el HTML con doble toque puede impedir la carga de recursos.

## Verificación de esta entrega

- Suite actual: `node --test` — 82 aprobadas, 0 fallidas.
- Sintaxis: `node --check` — 34 archivos JavaScript aprobados.
- Los ZIP incluyen el árbol de código, assets, pruebas, informes y la carpeta `work/generated` con capturas QA existentes.

## Alcance y pendientes conocidos

- La generación reciente de ciclos nuevos de caminar/correr de Sofía **no se integró**: sus láminas no pasaron la inspección de contornos y poses distintas. El juego conserva el atlas y las secuencias que ya estaban activas en la base.
- El informe QA marca pendientes la verificación en Android físico, PWA/offline, rendimiento sostenido de 60 FPS y el recorrido end-to-end con desbloqueo/guardado de Parafalls.
- No se compiló ni verificó APK; esto es un paquete web con código fuente.
- `LEEME.txt` original conserva el rótulo V58.8.1; se mantiene intacto. Esta nota aclara la base y la fase de trabajo representadas.
