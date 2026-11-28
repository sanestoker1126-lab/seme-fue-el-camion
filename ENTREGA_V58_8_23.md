# Entrega V58.8.23 — Santuario de Poseidón

**Estado: compilación importada completa en esta rama.**

Archivo original: `SE_ME_FUE_EL_CAMION_V58_8_23_POSEIDON.zip` (111199369 bytes, 680 entradas).

SHA-256: `1e06b6cbc607c0857f838c99a351d505c0458d7f702e80bb67302ce117f6139f`

La compilación incluye isla, bosque de algas, fosa oscura y santuario de Poseidón.

## Importación

- El ZIP se recibió en 4 partes; cada parte y el ZIP reensamblado coinciden con sus SHA-256 publicados.
- Las 680 entradas se extrajeron con verificación CRC, sin rutas fuera de la carpeta ni enlaces simbólicos.
- El contenido de `Se_Me_Fue_El_Camion_V58_8_23_RC/` se copió tal cual a la raíz. Los archivos del juego de esta rama
  (`assets/`, `js/`, `css/`, `tests/`, HTML, `sw.js`, etc.) son exactamente los 680 de la compilación, byte a byte.
- Se retiraron 78 archivos de la V58.9 que no forman parte de la V58.8.23 (56 de `assets/`, 22 de `tests/`), para no
  mezclar versiones.
- Se conservan los archivos del repositorio que no son parte del juego: `.github/`, `.gitignore`, `README.md`,
  `CHANGELOG_*.md`, `QA_V39.md`, `docs/` y `tools/`. Describen la historia hasta la V58.9 y no se actualizaron.

## Verificación

- `node --check` sobre `js/core/*.js` y `js/app/*.js`: sin errores.
- `node --test tests/*.test.js`: 126/126 aprobadas.

## Pendientes observados (no corregidos, para no alterar la compilación original)

- `js/core/config.js` declara `version: '58.8.20'`; el service worker usa la caché `58.8.23`. El flujo
  «Empaquetar juego completo» nombraría el ZIP `V58.8.20`.
- `README.md` y `tools/empaquetar.sh` siguen describiendo la V58.9.
- No se modificó `main`.
