# V55 · Parallax independiente para Submarino y Espacio

- **Arte añadido:** 10 capas SVG autónomas; cinco para cada mundo (fondo lejano, profundidad, estructuras, elementos y primer plano).
- **Submarino:** luz filtrada, relieve lejano, naufragio y ruinas, vida marina, corales y rocas cercanas.
- **Espacio:** cielo estrellado y nebulosas, planeta anillado, estación espacial, asteroides y cristales del primer plano.
- **Paralaje real:** velocidades relativas 0.10 / 0.22 / 0.40 / 0.68 / 1.00 (de lejos a cerca), con cobertura desde la parte superior hasta el fondo y los bordes laterales.
- **Dibujo eficiente:** recorte al área visible del Canvas; no se deforma un único fondo para simular profundidad.
- **Compatibilidad:** se conserva el respaldo V54 para fallos de carga; la física, la cámara y las colisiones originales permanecen intactas.
- **PWA:** caché camion-v55-parallax-real y precarga de los diez SVG.
- **Control:** pruebas de estructura y referencia a archivos en tests/v55.test.js.

No se ha comprobado aún el rendimiento en teléfono físico; los SVG se mantienen separados y pueden reemplazarse por arte final sin tocar la lógica.
