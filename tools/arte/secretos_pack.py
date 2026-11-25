# V58.7 · Empaca los enemigos secretos y los jefes nuevos (paquetes «ENEMIGOS_SECRETOS_MARINO_ESPACIAL_V1»
# y «ENEMIGOS_MAESTRO_Y_PULPO_ATLAS_V58_2_1») y los dos fondos de «NIVELES_SECRETOS_MARINO_ESPACIAL_V1».
#
# Uso (Python 3 + Pillow + NumPy; sin SciPy):
#   python3 -I secretos_pack.py <dir_enemigos_secretos> <dir_jefes> <dir_niveles_secretos> <raíz_del_juego> [dir_revision]
#
# Qué hace con cada cuadro:
#   1. Lo recorta de su celda y separa sus manchas (componentes conexos, 8 vecinos, alfa > 24).
#   2. Se queda con el cuerpo (la mancha mayor) y con lo que está pegado a él (chispas de golpe, estrellas, antenas).
#      Tira los pedazos de cuadros vecinos que se colaron en la celda (lejos del cuerpo o tocando el borde) y la
#      sombra oscura que algunos cuadros traen bajo los pies (un pulpo que nada no proyecta sombra en el piso).
#   3. Lo recorta al contenido, lo escala y lo empaca en un atlas WebP. Guarda el desplazamiento respecto a un ancla
#      FIJA por personaje (los pies para los que caminan; el centro del cuerpo para los que nadan): así los cuadros
#      no tiemblan entre sí.
# Los cuadros que NO se usan (cortados por el borde, partidos a la mitad, letreros dentro de la celda) están en la
# tabla CHARS con el motivo. Se revisaron uno por uno en hojas de contacto antes de elegirlos.
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

SEC, MAE, NIV, ROOT = sys.argv[1:5]
REV = sys.argv[5] if len(sys.argv) > 5 else None

# Animaciones: (cuadros, ms por cuadro, bucle). Los nombres de cuadro son los del paquete.
CHARS = {
    # Pulpo marino (zona secreta del mar). Fuera: recibir_dano_16–19 y morir_20 (les falta la parte de arriba de la
    # cabeza: corte recto de ~100 px), tentaculo_13–15 (tentáculo cortado por el borde y pedazos del cuadro vecino)
    # y morir_22 (cortado a la derecha). Al golpe se usa el destello blanco sobre el cuadro de nado.
    # En reposo y nado falta la punta de la cúpula (~4 px del original, ~1,5 u en el juego: no se nota).
    # Todos los cuadros traen una sombra oscura bajo los tentáculos, pegada al cuerpo por el halo: se quitan las
    # filas desde la 209 (salvo al morir, cuando ya está sobre el fondo). tentaculo_12 se corta en x = 266 (ahí
    # empieza un pedazo del cuadro vecino; el puño termina en x = 264).
    'pulpito': dict(pack='sec', src='pulpo_marino', scale=0.6, anchor='center', dest='secretos',
                    anims={'idle': ([0, 1, 2, 3], 230, 1), 'swim': ([4, 5, 6, 7, 8, 9], 130, 1),
                           'tentacle': ([10, 11, 12], 110, 0), 'death': ([21, 23, 24], 170, 0)},
                    clip_below=209, clip_skip=[21, 23, 24], xclip={12: (266, 384)},
                    shot=('ink', [0, 1, 2], 'centro')),
    # Niño buzo. Fuera: nadar_06 y arrojar_12/13 (cara cortada a la derecha), nadar_09 (tanque cortado a la
    # izquierda), arrojar_15 (solo la piedra), morir_21–24 (cortados a la derecha).
    'buzito': dict(pack='sec', src='nino_marino', scale=0.6, anchor='center', dest='secretos',
                   anims={'idle': ([0, 1, 2, 3], 230, 1), 'swim': ([4, 5, 7, 8], 140, 1),
                          'throw': ([10, 11, 14], 120, 0), 'hurt': ([16, 17, 18, 19], 100, 0),
                          'death': ([20], 400, 0)},
                   shot=('stone', [0], 'cabeza')),
    # Marciano. Fuera: disparo_06 (el rayo sale cortado por el borde). disparo_07 se corta en x = 76 (a la izquierda
    # hay una punta de rayo del cuadro anterior, columnas 49–68) y morir_12/13 pierden un pedazo y una sombra sueltos.
    'marciano': dict(pack='sec', src='marciano_espacial', scale=0.62, anchor='feet', dest='secretos',
                     anims={'walk': ([0, 1, 2, 3], 170, 1), 'shoot': ([4, 5, 7], 140, 0),
                            'hurt': ([8, 9, 10, 11], 100, 0), 'death': ([12, 13, 14, 15], 150, 0)},
                     xclip={7: (0, 76)},
                     shot=('orb', [0, 1, 2], 'centro')),
    # Niño astronauta. Fuera: caminar_06 (mochila cortada), caminar_08/09, arrojar_10/12/13/15 y morir_20/24
    # (casco borrado o cortado). Es el personaje de menor calidad del paquete.
    'astronino': dict(pack='sec', src='nino_espacial', scale=0.6, anchor='feet', dest='secretos',
                      anims={'idle': ([0, 1, 2, 3], 230, 1), 'walk': ([4, 5, 7], 150, 1),
                             'throw': ([11, 14], 160, 0), 'hurt': ([16, 17, 18, 19], 100, 0),
                             'death': ([21, 22, 23], 170, 0)},
                      shot=('rock', [0], 'cabeza')),
    # El Maestro Enojón (jefe de la escuela). Fuera: ruler_attack_02 (regla cortada por el borde), 03/04 (arco
    # cortado y otro maestro partido), angry_shout_01–04 (cortados o con medio maestro del cuadro vecino),
    # getup_00 (es un letrero «LEVANTARSE (4 frames)», no un dibujo), getup_03 (dos medios maestros) y
    # eraser_throw_02 / hurt_02 (el maestro está dibujado 7–10 % más chico que en los cuadros vecinos: «se encoge»).
    # El borrador en el aire de eraser_throw_02 es el proyectil.
    'maestro': dict(pack='mae', src='maestro_enojon', scale=0.75, anchor='feet', dest='jefes',
                    anims={'idle': (['idle_%02d' % i for i in range(7)], 150, 1),
                           'walk': (['walk_%02d' % i for i in range(6)], 120, 1),
                           'run': (['run_%02d' % i for i in range(6)], 80, 1),
                           'ruler': (['ruler_attack_00', 'ruler_attack_01'], 180, 0),
                           'strike': (['ruler_attack_05'], 300, 0),
                           'book': (['book_throw_%02d' % i for i in range(5)], 110, 0),
                           'eraser': (['eraser_throw_00', 'eraser_throw_01'], 160, 0),
                           'shout': (['angry_shout_00'], 300, 0),
                           'hurt': (['hurt_00', 'hurt_01'], 120, 0),
                           'dizzy': (['hurt_03'], 300, 1),
                           'fall': (['fall_00', 'fall_01', 'fall_02'], 140, 0),
                           'getup': (['getup_01', 'getup_02'], 170, 0),
                           'ko': (['ko_00', 'ko_01', 'ko_02'], 200, 0)},
                    extract=('eraser', 'eraser_throw_02')),
    # El Pulpo del Abismo (jefe secreto del mar). Del cuadro tentacle_strike_04 en adelante el paquete viene
    # desfasado: cada celda trae media figura de un cuadro y media de otro (y letreros «RECUPERAR», «KO»). Se
    # comprobó que las mitades no se pueden reunir (no casan: salen dos coronas pegadas). Además traen el lado
    # derecho cortado en recto tentacle_strike_01–03, ink_blast_00/01, water_jet_01, idle_05/06 y ko_02, y los tres
    # hurt vienen recortados en rectángulo. Quedan 15 de 49 cuadros: reposo, nado, el aviso del tentáculo y el KO.
    # La embestida, la tinta, el chorro y el daño se dibujan con efectos sobre esos cuadros (render.js).
    'pulpo_abismo': dict(pack='mae', src='pulpo_abismo', scale=0.75, anchor='center', dest='jefes',
                         anims={'idle': (['idle_%02d' % i for i in range(5)], 150, 1),
                                'swim': (['swim_%02d' % i for i in range(6)], 110, 1),
                                'windup': (['tentacle_strike_00'], 300, 0),
                                'ko': (['ko_00', 'ko_01'], 260, 0)}),
}


def label_cc(mask):
    """Componentes conexos (8 vecinos) con unión-búsqueda, sin SciPy."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    parent = [0]

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        a, b = find(a), find(b)
        if a != b:
            parent[max(a, b)] = min(a, b)
    nxt = 1
    for y in range(h):
        row = mask[y]
        for x in np.nonzero(row)[0]:
            ns = []
            if x and row[x - 1]:
                ns.append(lab[y, x - 1])
            if y:
                for dx in (-1, 0, 1):
                    xx = x + dx
                    if 0 <= xx < w and mask[y - 1, xx]:
                        ns.append(lab[y - 1, xx])
            if ns:
                m = min(find(n) for n in ns)
                lab[y, x] = m
                for n in ns:
                    union(n, m)
            else:
                parent.append(nxt)
                lab[y, x] = nxt
                nxt += 1
    roots = np.array([find(i) for i in range(len(parent))], np.int32)
    return roots[lab]


def bbox_of(m):
    ys, xs = np.nonzero(m)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def gap(a, b):
    """Distancia entre dos cajas (0 si se tocan o se enciman)."""
    dx = max(0, max(a[0], b[0]) - min(a[2], b[2]))
    dy = max(0, max(a[1], b[1]) - min(a[3], b[3]))
    return max(dx, dy)


def clean(cell, only_main=False, near=16):
    """Deja el cuerpo y lo que está pegado a él. Devuelve (rgba limpio, notas)."""
    a = cell[..., 3]
    mask = a > 24
    if not mask.any():
        return cell, ['vacío']
    lab = label_cc(mask)
    ids, cnt = np.unique(lab[lab > 0], return_counts=True)
    main = int(ids[cnt.argmax()])
    mb = bbox_of(lab == main)
    h, w = mask.shape
    keep = np.zeros_like(mask)
    notes = []
    for i, n in zip(ids, cnt):
        m = lab == i
        if i == main:
            keep |= m
            continue
        b = bbox_of(m)
        border = b[0] <= 1 or b[1] <= 1 or b[2] >= w - 1 or b[3] >= h - 1
        rgb = cell[..., :3][m].astype(float)
        dark = rgb.mean() < 52
        below = b[1] >= mb[1] + (mb[3] - mb[1]) * 0.86     # bajo los pies
        if only_main and n > 30:
            notes.append('fuera: mancha de %d px' % n)
            continue
        if border or gap(b, mb) > near or (dark and below):
            if n > 30:
                notes.append('fuera: %s de %d px' % ('sombra' if dark and below else 'pedazo', n))
            continue
        keep |= m
    # Dilata 2 px lo que se queda (para no perder el borde suavizado) y borra lo demás.
    k = keep.copy()
    for _ in range(2):
        k2 = k.copy()
        k2[1:] |= k[:-1]; k2[:-1] |= k[1:]; k2[:, 1:] |= k[:, :-1]; k2[:, :-1] |= k[:, 1:]
        k = k2
    out = cell.copy()
    out[..., 3] = np.where(k, out[..., 3], 0)
    out[out[..., 3] <= 8] = 0
    return out, notes


def frames_of(spec):
    """(atlas RGBA, {nombre: (x, y, w, h)}, tamaño de celda) del personaje."""
    if spec['pack'] == 'sec':
        d = json.load(open(os.path.join(SEC, 'assets/enemies', spec['src'], spec['src'] + '.json')))
        im = Image.open(os.path.join(SEC, 'assets/enemies', spec['src'], d['atlas'])).convert('RGBA')
        fr = {f['index']: tuple(f['rect']) for f in d['frames']}
        return im, fr, tuple(d['cell_size'])
    d = json.load(open(os.path.join(MAE, 'assets/enemies/bosses', spec['src'], 'atlas.json')))
    im = Image.open(os.path.join(MAE, 'assets/enemies/bosses', spec['src'], 'atlas.png')).convert('RGBA')
    fr = {k: (v['frame']['x'], v['frame']['y'], v['frame']['w'], v['frame']['h']) for k, v in d['frames'].items()}
    return im, fr, (192, 192)


def fade_trail(rgba, side='left', frac=0.45):
    """Desvanece la estela de un proyectil del lado contrario al avance (la del paquete termina en corte recto)."""
    a = rgba[..., 3].astype(float)
    xs = np.nonzero(a.max(axis=0) > 0)[0]
    if not len(xs):
        return rgba
    x0, x1 = xs.min(), xs.max() + 1
    L = max(1, int((x1 - x0) * frac))
    ramp = np.ones(rgba.shape[1])
    if side == 'left':
        ramp[x0:x0 + L] = np.linspace(0.0, 1.0, L)
    out = rgba.copy()
    out[..., 3] = (a * ramp[None, :]).astype(np.uint8)
    return out


def shelf_pack(items, maxw=2048, pad=2):
    """Empaque por repisas (de mayor a menor alto). items: [(clave, imagen)]. Devuelve posiciones y tamaño."""
    order = sorted(items, key=lambda t: -t[1].size[1])
    x = y = rowh = 0
    pos = {}
    W = 0
    for key, im in order:
        w, h = im.size
        if x + w + pad > maxw:
            x = 0; y += rowh + pad; rowh = 0
        pos[key] = (x, y)
        x += w + pad
        rowh = max(rowh, h)
        W = max(W, x)
    return pos, (W, y + rowh)


def build(name, spec, report):
    atlas, rects, (cw, ch) = frames_of(spec)
    src_arr = np.asarray(atlas)
    used = []
    for lst, _, _ in spec['anims'].values():
        for f in lst:
            if f not in used:
                used.append(f)
    cleaned = {}
    for f in used:
        x, y, w, h = rects[f]
        cell = src_arr[y:y + h, x:x + w].copy()
        if spec.get('clip_below') and f not in spec.get('clip_skip', []):
            cell[spec['clip_below']:, :, 3] = 0          # sombra pegada bajo los tentáculos
        if f in spec.get('xclip', {}):
            x0c, x1c = spec['xclip'][f]
            cell[:, x0c:x1c, 3] = 0                       # pedazo del cuadro vecino
        out, notes = clean(cell, only_main=f in spec.get('only_main', []))
        cleaned[f] = out
        if notes:
            report.append('%s %s: %s' % (name, f, '; '.join(notes)))
    # Ancla fija por personaje (coordenadas de celda): pies = mediana del borde inferior de idle/caminar;
    # centro = mediana del centro de idle/nadar.
    base = spec['anims'].get('idle', spec['anims'].get('walk'))[0]
    bbs = [bbox_of(cleaned[f][..., 3] > 0) for f in base]
    ax = cw / 2
    if spec['anchor'] == 'feet':
        ay = float(np.median([b[3] for b in bbs]))
    else:
        ay = float(np.median([(b[1] + b[3]) / 2 for b in bbs]))
    ref = float(np.median([b[3] - b[1] for b in bbs])) * spec['scale']
    sc = spec['scale']
    pieces, meta = [], {}
    for f in used:
        a = cleaned[f]
        b = bbox_of(a[..., 3] > 0)
        x0, y0, x1, y1 = max(0, b[0] - 1), max(0, b[1] - 1), min(cw, b[2] + 1), min(ch, b[3] + 1)
        crop = Image.fromarray(a[y0:y1, x0:x1])
        tw, th = max(1, round((x1 - x0) * sc)), max(1, round((y1 - y0) * sc))
        crop = crop.resize((tw, th), Image.LANCZOS)
        pieces.append((f, crop))
        meta[f] = (round((x0 - ax) * sc), round((y0 - ay) * sc))
    # Proyectiles.
    shots = []
    if spec.get('shot'):
        kind, idxs, anchor = spec['shot']
        for i in idxs:
            p = os.path.join(SEC, 'assets/enemies', spec['src'], 'proyectil_%02d.png' % i)
            arr = np.asarray(Image.open(p).convert('RGBA')).copy()
            arr, _ = clean(arr, near=30)
            if anchor == 'cabeza':
                arr = fade_trail(arr, 'left', 0.5)
            b = bbox_of(arr[..., 3] > 0)
            crop = Image.fromarray(arr[b[1]:b[3], b[0]:b[2]])
            s2 = 0.5
            crop = crop.resize((max(1, round(crop.size[0] * s2)), max(1, round(crop.size[1] * s2))), Image.LANCZOS)
            w2, h2 = crop.size
            # Ancla: centro (orbe, tinta) o la cabeza de la piedra (lado derecho; la estela va atrás).
            axp = w2 - h2 / 2 if anchor == 'cabeza' else w2 / 2
            key = 'shot_%s_%d' % (kind, i)
            pieces.append((key, crop))
            meta[key] = (round(-axp), round(-h2 / 2))
            shots.append(key)
    if spec.get('extract'):
        kind, f = spec['extract']
        x, y, w, h = rects[f]
        cell = src_arr[y:y + h, x:x + w].copy()
        lab = label_cc(cell[..., 3] > 24)
        ids, cnt = np.unique(lab[lab > 0], return_counts=True)
        order = ids[np.argsort(-cnt)]
        m = lab == order[1]                     # la segunda mancha: el borrador en el aire
        b = bbox_of(m)
        arr = cell.copy(); arr[..., 3] = np.where(m, arr[..., 3], 0)
        crop = Image.fromarray(arr[b[1]:b[3], b[0]:b[2]])
        crop = crop.resize((max(1, round(crop.size[0] * 0.6)), max(1, round(crop.size[1] * 0.6))), Image.LANCZOS)
        key = 'shot_%s_0' % kind
        pieces.append((key, crop)); meta[key] = (round(-crop.size[0] / 2), round(-crop.size[1] / 2)); shots.append(key)
    if spec.get('cell_shot'):
        kind, f = spec['cell_shot']
        x, y, w, h = rects[f]
        arr, _ = clean(src_arr[y:y + h, x:x + w].copy(), near=30)
        b = bbox_of(arr[..., 3] > 0)
        crop = Image.fromarray(arr[b[1]:b[3], b[0]:b[2]])
        crop = crop.resize((max(1, round(crop.size[0] * 0.6)), max(1, round(crop.size[1] * 0.6))), Image.LANCZOS)
        key = 'shot_%s_0' % kind
        pieces.append((key, crop)); meta[key] = (round(-crop.size[0] / 2), round(-crop.size[1] / 2)); shots.append(key)
    pos, (AW, AH) = shelf_pack(pieces)
    sheet = Image.new('RGBA', (AW, AH), (0, 0, 0, 0))
    index = {}
    frames = []
    for key, im in pieces:
        x, y = pos[key]
        sheet.paste(im, (x, y))
        index[key] = len(frames)
        frames.append([x, y, im.size[0], im.size[1], meta[key][0], meta[key][1]])
    rel = 'assets/enemies/%s/%s.webp' % (spec['dest'], name)
    os.makedirs(os.path.join(ROOT, os.path.dirname(rel)), exist_ok=True)
    sheet.save(os.path.join(ROOT, rel), 'WEBP', quality=90, method=6)
    anims = {k: [[index[f] for f in lst], ms, loop] for k, (lst, ms, loop) in spec['anims'].items()}
    if shots:
        anims['shot'] = [[index[k] for k in shots], 90, 1]
    data = {'src': rel, 'anchor': spec['anchor'], 'ref': round(ref, 1), 'frames': frames, 'anims': anims}
    size = os.path.getsize(os.path.join(ROOT, rel))
    report.append('%s: %d cuadros + %d proyectiles, atlas %dx%d, %d KB, alto de referencia %.0f px' % (
        name, len(used), len(shots), AW, AH, size // 1024, ref))
    return data, sheet, pieces, pos, meta


def contact(name, data, sheet, out):
    """Hoja de revisión: cada animación en fila, todos los cuadros alineados a su ancla (línea roja)."""
    rows = list(data['anims'].items())
    cellw = max(f[2] for f in data['frames']) + 20
    cellh = max(f[3] for f in data['frames']) + 30
    W = cellw * max(len(a[0]) for _, a in rows) + 90
    H = cellh * len(rows)
    img = Image.new('RGBA', (W, H), (40, 46, 60, 255))
    d = ImageDraw.Draw(img)
    minox = min(f[4] for f in data['frames']); minoy = min(f[5] for f in data['frames'])
    for r, (an, (idx, ms, loop)) in enumerate(rows):
        d.text((4, r * cellh + 4), an, fill=(255, 255, 255, 255))
        for c, i in enumerate(idx):
            x, y, w, h, ox, oy = data['frames'][i]
            px, py = 90 + c * cellw - minox + 6, r * cellh - minoy + 18
            img.alpha_composite(sheet.crop((x, y, x + w, y + h)), (px + ox, py + oy))
            d.line([(px - 6, py), (px + 6, py)], fill=(255, 60, 60, 255))
            d.line([(px, py - 6), (px, py + 6)], fill=(255, 60, 60, 255))
    img.save(os.path.join(out, 'revision_%s.png' % name))


def backgrounds(report):
    out = {}
    for key, title in [('marino_oculto', 'Santuario perdido de Poseidón'), ('espacial_oculto', 'Estación orbital abandonada')]:
        im = Image.open(os.path.join(NIV, 'assets/backgrounds', key, key + '_bg.png')).convert('RGB')
        rel = 'assets/backgrounds/secretos/%s.webp' % key
        os.makedirs(os.path.join(ROOT, os.path.dirname(rel)), exist_ok=True)
        im.save(os.path.join(ROOT, rel), 'WEBP', quality=84, method=6)
        out[key] = {'src': rel, 'w': im.size[0], 'h': im.size[1], 'title': title}
        report.append('%s: %dx%d, %d KB' % (rel, im.size[0], im.size[1], os.path.getsize(os.path.join(ROOT, rel)) // 1024))
    return out


def main():
    report = []
    data = {}
    for name, spec in CHARS.items():
        d, sheet, pieces, pos, meta = build(name, spec, report)
        data[name] = d
        if REV:
            os.makedirs(REV, exist_ok=True)
            contact(name, d, sheet, REV)
    bgs = backgrounds(report)
    js = ('/* V58.7 · Enemigos secretos y jefes nuevos: atlas empacados por tools/arte/secretos_pack.py (no editar a mano).\n'
          '   frames: [x, y, w, h, ox, oy] en el atlas; (ox, oy) = esquina del recorte respecto al ancla del personaje\n'
          '   (los pies si camina, el centro del cuerpo si nada). anims: [cuadros, ms por cuadro, bucle].\n'
          '   ref = alto del cuerpo en reposo (px del atlas), para escalar al alto del enemigo en el juego. */\n'
          '(function (root) {\n'
          "  'use strict';\n"
          '  const NS = root.CAMION = root.CAMION || {};\n'
          '  NS.ART = NS.ART || {};\n'
          '  NS.ART.ATLAS_FOES = ' + json.dumps(data, separators=(',', ':')) + ';\n'
          '  NS.ART.SECRET_BG = ' + json.dumps(bgs, ensure_ascii=False, separators=(',', ':')) + ';\n'
          "})(typeof globalThis !== 'undefined' ? globalThis : window);\n")
    with open(os.path.join(ROOT, 'js/app/art_secretos.js'), 'w', encoding='utf-8') as fh:
        fh.write(js)
    print('\n'.join(report))


main()
