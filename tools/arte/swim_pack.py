"""Arma el atlas de nado del juego a partir de los cuadros extraídos por contorno.
Uso: python3 -I swim_pack.py <frames_dir> <atlas_salida.png> <meta_salida.json> <ref_idle_01.png>

- Cada animación toma cuadros de una sección (opcionalmente reflejados para que miren a la derecha, como el
  resto de los cuadros de Sofía: el juego los voltea según hacia dónde mira).
- Escala por animación: mediana del tamaño de la cara frente a la cara de idle_01 del juego (así Sofía no
  cambia de tamaño al entrar al agua). Dibujo en el juego: SOFIA_BASE × escala.
- Ancla: 'water' = línea del agua pintada (se alinea con la superficie del agua del juego); 'center' = centro
  del cuerpo (se alinea con el centro de Sofía).
- Limpieza final: motas claras sueltas en la orilla del cabello (restos del tablero); los bordes de la blusa y
  las mallas, que son zonas claras grandes, se respetan.
- Empaque en estantes con 2 px de separación."""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from facesize import face_area

# nombre: (sección, índices 1-based, reflejar, ancla, fps, bucle)
ANIMS = {
    'float':     ('b_flotar', [1, 2, 3, 4, 5, 6], False, 'water', 6, True),
    'surf':      ('a_sup_der', [1, 2, 3, 4, 5, 6, 7, 8], False, 'water', 10, True),
    'under':     ('a_bajo_izq', [1, 2, 3, 4, 5, 6], True, 'center', 9, True),
    'down':      ('a_sumergir', [1, 2, 3, 4, 5, 6], False, 'center', 9, False),
    'up':        ('a_impulso', [1, 2, 3], False, 'center', 8, True),
    'upDiag':    ('a_diagonal', [1, 2, 3, 4], False, 'center', 9, True),
    'dash':      ('a_especial', [1, 2], False, 'center', 12, True),
    'hurt':      ('a_golpe', [1, 2, 3, 4], False, 'center', 10, False),
    'dead':      ('a_morir', [1, 2, 3, 4, 5], False, 'center', 6, False),
    'emerge':    ('a_salir', [1], False, 'water', 1, False),
    'leap':      ('b_saltar_agua', [4, 5], False, 'center', 8, False),
    'wade':      ('b_vadear_der', [1, 2, 3, 4, 5, 6], False, 'water', 9, True),
    'wadeRun':   ('b_salpicar_der', [1, 2, 3, 4, 5, 6], False, 'water', 12, True),
    'diveIn':    ('b_caer_agua', [1, 2, 3], False, 'center', 10, False),
}
# La medida de la cara depende del ángulo (de frente se ve más piel que de tres cuartos): flotar es la única
# animación de frente, así que toma la escala de las secciones de perfil de su mismo atlas.
SCALE_FROM = {'float': ['b_vadear_der', 'b_salpicar_der', 'b_saltar_agua']}
# Efectos de agua (sección 18 del atlas B), en orden de aparición.
FX = {'splashS': 1, 'splashM': 2, 'splashL': 3, 'bubbles': 4, 'column': 6, 'ripple': 7, 'whirl': 8, 'drop': 9}

def clean_specks(arr):
    rgb, a = arr[..., :3].astype(int), arr[..., 3] > 0
    lum = (rgb[..., 0] * 299 + rgb[..., 1] * 587 + rgb[..., 2] * 114) / 1000
    sat = rgb.max(2) - rgb.min(2)
    for _ in range(2):
        edge = a & ~ndi.binary_erosion(a, iterations=2)
        light = a & (lum >= 175) & (sat <= 45)
        frac = ndi.uniform_filter(light.astype(float), 7) / np.maximum(ndi.uniform_filter(a.astype(float), 7), 1e-6)
        bad = edge & light & (frac < 0.35)
        a &= ~bad
    lab, n = ndi.label(a)
    if n > 1:
        sz = ndi.sum(a, lab, np.arange(1, n + 1)); ok = np.zeros(n + 1, bool); ok[1:] = sz >= 10
        a = ok[lab]
    out = arr.copy(); out[..., 3] = np.where(a, 255, 0).astype(np.uint8)
    return out

def trim(arr, extra=None):
    ys, xs = np.nonzero(arr[..., 3] > 0)
    x1, y1, x2, y2 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    return arr[y1:y2, x1:x2], (x1, y1)

def main(fdir, out_png, out_json, ref_png):
    man = {m['file']: m for m in json.load(open(os.path.join(fdir, 'manifest.json')))}
    ref = face_area(ref_png)[0]
    items, meta = [], {'sheet': os.path.basename(out_png), 'note': 'frames: [x, y, w, h, ax, ay] en px de la hoja; '
                       'ancla water = línea del agua pintada, center = centro del cuerpo. Escala de dibujo = SOFIA_BASE × scale.',
                       'anims': {}, 'fx': {}}
    for name, (sec, idx, mirror, anchor, fps, loop) in ANIMS.items():
        faces, frames = [], []
        for k in idx:
            fn = '%s_%02d.png' % (sec, k)
            arr = np.array(Image.open(os.path.join(fdir, fn)).convert('RGBA'))
            faces.append(face_area(os.path.join(fdir, fn))[0])
            arr = clean_specks(arr)
            wl = man[fn].get('waterline')
            if mirror: arr = arr[:, ::-1].copy()
            arr, (ox, oy) = trim(arr)
            a = arr[..., 3] > 0
            ys, xs = np.nonzero(a)
            if anchor == 'water' and wl is not None:
                ay = float(wl - oy)
                band = ys < ay
                ax = float(xs[band].mean()) if band.any() else float(xs.mean())
            else:
                ax, ay = float(xs.mean()), float(ys.mean())
            frames.append((arr, round(ax, 1), round(ay, 1)))
        if name in SCALE_FROM:
            fv = [face_area(os.path.join(fdir, m['file']))[0] for m in man.values() if m['section'] in SCALE_FROM[name]]
        fv = [f for f in fv] if name in SCALE_FROM else [f for f in faces if f > 20]
        fv = [f for f in fv if f > 20]
        scale = round(float((ref / np.median(fv)) ** 0.5), 3) if fv else 1.5
        meta['anims'][name] = {'src': sec, 'mirror': mirror, 'anchor': anchor, 'fps': fps, 'loop': loop, 'scale': scale, 'frames': []}
        for arr, ax, ay in frames:
            items.append(('anim', name, arr, ax, ay))
    for name, k in FX.items():
        fn = 'b_fx_%02d.png' % k
        arr = np.array(Image.open(os.path.join(fdir, fn)).convert('RGBA'))
        arr, _ = trim(arr)
        h, w = arr.shape[:2]
        items.append(('fx', name, arr, w / 2.0, float(h)))   # ancla: centro abajo (sale del agua)
    # Empaque en estantes (más altos primero).
    W, pad = 1024, 2
    order = sorted(range(len(items)), key=lambda i: -items[i][2].shape[0])
    x = y = shelf = 0; pos = {}
    for i in order:
        h, w = items[i][2].shape[:2]
        if x + w + pad > W: x, y, shelf = 0, y + shelf + pad, 0
        pos[i] = (x, y); x += w + pad; shelf = max(shelf, h)
    H = y + shelf
    sheet = np.zeros((H, W, 4), np.uint8)
    for i, (kind, name, arr, ax, ay) in enumerate(items):
        px, py = pos[i]; h, w = arr.shape[:2]
        sheet[py:py + h, px:px + w] = arr
        rec = [int(px), int(py), int(w), int(h), ax, ay]
        if kind == 'anim': meta['anims'][name]['frames'].append(rec)
        else: meta['fx'][name] = rec
    Image.fromarray(sheet, 'RGBA').save(out_png, optimize=True)
    json.dump(meta, open(out_json, 'w'), indent=1, ensure_ascii=False)
    print('hoja', W, 'x', H, 'cuadros', sum(len(a['frames']) for a in meta['anims'].values()), 'efectos', len(meta['fx']))
    for n, a in meta['anims'].items(): print('  %-8s %d cuadros  escala %.3f  %s' % (n, len(a['frames']), a['scale'], a['anchor']))

if __name__ == '__main__':
    main(*sys.argv[1:5])
