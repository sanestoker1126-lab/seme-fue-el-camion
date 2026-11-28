#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
echo "Abre http://localhost:8000/Se_Me_Fue_El_Camion.html en tu navegador."
exec python3 -m http.server 8000 --bind 127.0.0.1
