#!/usr/bin/env bash
# Empaqueta el juego jugable: dist/Se_Me_Fue_El_Camion_V<versión>/ y su ZIP en la raíz.
# Lleva solo lo que usa el juego al correr. Deja fuera pruebas, herramientas, documentación, scripts y los assets
# retirados (ninguna línea del código ni del service worker los pide; tests/v58_4_entrega.test.js lo comprueba).
# Uso: bash tools/empaquetar.sh [versión]
set -euo pipefail
cd "$(dirname "$0")/.."
V="${1:-$(node -e "require('./js/core/util.js');require('./js/core/config.js');console.log(globalThis.CAMION.CONFIG.version)")}"
NAME="Se_Me_Fue_El_Camion_V${V}"
OUT="dist/${NAME}"
rm -rf "$OUT" "${NAME}.zip"
mkdir -p "$OUT"
git ls-files \
  | grep -vE '^(tests|tools|docs|\.github)/|\.(md|py)$|^\.gitignore$' \
  | grep -vxF -f tools/assets_retirados.txt \
  | while IFS= read -r f; do mkdir -p "$OUT/$(dirname "$f")"; cp "$f" "$OUT/$f"; done
cat > "$OUT/LEEME.txt" <<EOF
¡SE ME FUE EL CAMIÓN! · versión ${V}

CÓMO JUGAR
- En la computadora: abre una terminal en esta carpeta y escribe
      python3 -m http.server 8000
  luego abre http://localhost:8000/Se_Me_Fue_El_Camion.html en el navegador.
  (Abrir el HTML con doble clic no basta: el navegador bloquea parte del juego fuera de un servidor.)
- En Android: copia la carpeta al teléfono y ábrela con una app de servidor web local
  (por ejemplo «Simple HTTP Server»); luego abre la dirección que te dé en Chrome.
- Una vez abierto con conexión, el juego queda guardado y se puede jugar sin internet.

CONTROLES
- Teclado: flechas o A/D para moverse, ESPACIO, W, K o flecha arriba para saltar (bajo el agua, brazada),
  S o flecha abajo para bajar, SHIFT, J o L para DASH, X o U para patear, C o E para las gatas, P o ESC para pausa.
- Teléfono: joystick a la izquierda y botones a la derecha (se pueden agrandar o poner para zurdos en Opciones).
EOF
( cd dist && zip -q -r -9 "../${NAME}.zip" "${NAME}" )
echo "${NAME}.zip · $(find "$OUT" -type f | wc -l) archivos · $(du -sh "$OUT" | cut -f1)"
