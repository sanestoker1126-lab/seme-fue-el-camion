"""Genera js/app/art_data.js con los metadatos de frames y texturas (sin fetch: funciona desde file://).
Uso: python3 gen_art_data.py <sofia_frames.json> <enemies_frames.json> <skins.json> [swim_atlas.json] <salida.js>"""
import json, sys
sofia = json.load(open(sys.argv[1]))
enem = json.load(open(sys.argv[2]))
skins = json.load(open(sys.argv[3]))
swim = json.load(open(sys.argv[4])) if len(sys.argv) > 5 else None
out_path = sys.argv[-1]
S = {n: [f['k'], f['ax'], f['ay']] for n, f in sofia['frames'].items()}
E = {}
for kind, m in enem.items():
    E[kind] = {'states': m['states'], 'frames': {n: [f['ax'], f['ay']] for n, f in m['frames'].items()}}
K = {n: [m['w'], m['h'], m['top']] for n, m in skins.items()}
out = """/* ¡Se me fue el camión! — metadatos de arte (generado con tools/arte/gen_art_data.py; no editar a mano).
   SOFIA[frame]   = [k, ax, ay]: k = tamaño de cabeza relativo a idle_01 (escala de dibujo = base/k);
                   ax/ay = ancla en px (centro del torso, línea de los pies) para que los frames no salten.
   ENEMY[tipo]    = estados → frames completos (sin cuadros recortados) y anclas [ax, ay] por frame.
   SKINS[nombre]  = [ancho, alto, filaSuperior]: la fila superior es la línea pisable del borde.
   SWIM           = V52, atlas de nado (assets/player/sofia/swim_atlas.png): anims[nombre] = {fps, loop, scale,
                    anchor, frames: [[x, y, w, h, ax, ay]]}; fx[nombre] = [x, y, w, h, ax, ay]. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};
  NS.ART = {
    SOFIA: %s,
    ENEMY: %s,
    SKINS: %s,
    SWIM: %s
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
""" % (json.dumps(S), json.dumps(E), json.dumps(K), json.dumps(
    {'sheet': 'assets/player/sofia/' + swim['sheet'], 'anims': {n: {k: a[k] for k in ('fps', 'loop', 'scale', 'anchor', 'frames')} for n, a in swim['anims'].items()}, 'fx': swim['fx']}
    if swim else None))
open(out_path, 'w').write(out); print('ok', len(out))
