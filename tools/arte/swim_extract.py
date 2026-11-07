"""Extrae los cuadros de Sofía nadando de los dos atlas por CONTORNO (sin cortar cuadrículas).
Uso: python3 -I swim_extract.py <atlas_a.png> <atlas_b.png> <salida/>

Para cada sección (ubicada por su etiqueta en el atlas):
 1. Fondo: el tablero pintado se quita con bgmask.background_mask (relleno con barrera + huecos con textura).
 2. Instancias: contornos de los píxeles que no son fondo ni agua (cabello, piel, falda, blusa, botas, astas),
    unidos con una dilatación pequeña; se descartan los números de cuadro (cuadros oscuros rodeados de agua)
    y los restos chicos.
 3. Recorte fino por instancia con GrabCut: núcleo seguro de Sofía como frente; tablero y agua muy azul como
    fondo; lo ambiguo (ropa blanca contra tablero, piernas teñidas bajo el agua) lo decide el corte de grafos.
 4. Limpieza: se conserva el contorno principal (y piezas cercanas como las astas), se quitan las orillas
    claras y neutras que deja el tablero, y se recorta al contenido.
Las secciones de efectos (salpicaduras, burbujas…) se extraen como contornos del agua misma."""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bgmask import background_mask

# Secciones: nombre → (x1, y1, x2, y2) del contenido bajo su etiqueta, en píxeles del atlas.
SECTIONS = {
    'a': {
        'a_entrar':        (0, 360, 585, 474),
        'a_sup_der':       (585, 368, 1536, 474),
        'a_sup_izq':       (0, 505, 985, 604),
        'a_flotar':        (985, 500, 1536, 604),
        'a_sumergir':      (0, 632, 515, 738),
        'a_bajo_der':      (515, 632, 1110, 740),
        'a_impulso':       (1110, 632, 1350, 865),
        'a_salir':         (1350, 632, 1536, 765),
        'a_bajo_izq':      (0, 762, 735, 866),
        'a_diagonal':      (735, 742, 1110, 866),
        'a_golpe':         (0, 893, 455, 1024),
        'a_morir':         (455, 893, 1030, 1024),
        'a_especial':      (1030, 893, 1536, 1024),
    },
    'b': {
        'b_flotar':        (0, 74, 585, 200),
        'b_vadear_der':    (585, 74, 1068, 200),
        'b_vadear_izq':    (1068, 74, 1536, 200),
        'b_salpicar_der':  (0, 233, 535, 362),
        'b_salpicar_izq':  (535, 233, 1030, 362),
        'b_saltar_agua':   (1030, 196, 1536, 362),
        'b_caer_agua':     (0, 394, 780, 528),
        'b_clavado':       (780, 394, 1536, 528),
        'b_sumergir':      (0, 558, 442, 683),
        'b_bajo_der':      (442, 558, 982, 683),
        'b_bajo_izq':      (982, 558, 1536, 683),
        'b_impulso':       (0, 712, 365, 846),
        'b_salir':         (365, 712, 735, 846),
        'b_sup_der':       (735, 712, 1205, 846),
        'b_sup_izq':       (1205, 712, 1536, 846),
        'b_golpe':         (0, 876, 352, 1024),
        'b_morir':         (352, 876, 895, 1024),
        'b_fx':            (895, 876, 1536, 1024),
    },
}
FX_SECTIONS = {'b_fx'}
# Superficie: el juego dibuja su propia agua, así que estos cuadros se cortan en la línea del agua pintada
# (lo sumergido sale teñido y con rayas de oleaje) y guardan esa altura para alinearla con el agua del juego.
SURFACE = {'a_sup_der', 'a_sup_izq', 'a_flotar', 'b_flotar', 'b_sup_der', 'b_sup_izq', 'b_vadear_der', 'b_vadear_izq',
           'b_salpicar_der', 'b_salpicar_izq', 'b_saltar_agua', 'a_salir'}

def channels(rgb):
    f = rgb.astype(np.int32)
    R, G, B = f[..., 0], f[..., 1], f[..., 2]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV_FULL).astype(np.int32)
    S, V = hsv[..., 1], hsv[..., 2]
    lum = (R * 299 + G * 587 + B * 114) / 1000.0
    sat = f.max(2) - f.min(2)
    blue = B - np.maximum(R, G)
    m = ndi.uniform_filter(lum, 7); m2 = ndi.uniform_filter(lum * lum, 7)
    std = np.sqrt(np.maximum(0, m2 - m * m))
    Hh = hsv[..., 0] * 360 // 256
    d = dict(R=R, G=G, B=B, S=S, V=V, lum=lum, sat=sat, blue=blue, std=std)
    d['_dark'] = (V <= 78) & (blue < 26)
    d['_skin'] = (Hh >= 5) & (Hh <= 45) & (S >= 40) & (S <= 185) & (V >= 140)
    d['_red'] = ((Hh >= 290) | (Hh <= 15)) & (S >= 100) & (V >= 90)
    d['_gold'] = (Hh >= 20) & (Hh <= 60) & (S >= 100) & (V >= 140)
    return d

def water_mask(c):
    # Agua (medido en el atlas): saturación alta y mucho más azul que rojo — cuerpo del agua, burbujas,
    # reflejos. La ropa blanca teñida bajo el agua es pálida (S ≤ 60) y su rojo sigue alto (B−R ≤ 50): no es agua.
    return ((c['S'] >= 90) & (c['B'] - c['R'] >= 60) & (c['blue'] >= 20)) | ((c['S'] >= 150) & (c['blue'] >= 25))

def foam_mask(c):
    # Espuma pálida sobre el agua (solo en secciones de superficie; bajo el agua ese color es la ropa teñida).
    return (c['B'] - c['R'] >= 35) & (c['V'] >= 190) & (c['S'] >= 20)

def badge_mask(c, notsof):
    """Números de cuadro: manchas muy oscuras (con su dígito claro) rodeadas casi solo de agua/fondo."""
    dark = c['V'] <= 60
    lab, n = ndi.label(ndi.binary_closing(dark, structure=np.ones((3, 3), bool)))
    out = np.zeros_like(dark)
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if not (10 <= h <= 34 and 10 <= w <= 34 and 0.6 <= w / max(h, 1) <= 1.7):
            continue
        y1, y2, x1, x2 = max(0, sl[0].start - 4), sl[0].stop + 4, max(0, sl[1].start - 4), sl[1].stop + 4
        ring = notsof[y1:y2, x1:x2].copy()
        inner = np.zeros_like(ring); inner[4:4 + h, 4:4 + w] = True
        ringvals = ring[~inner]
        if ringvals.size and ringvals.mean() >= 0.7:
            out[y1:y2, x1:x2] = True
    return out

def seed_kinds(c):
    H = None
    return [c['_dark'], c['_skin'], c['_red'], c['_gold']]

def seed_mask(c):
    return c['_dark'] | c['_skin'] | c['_red'] | c['_gold']

def checkerish(c):
    return (c['sat'] <= 8) & (c['lum'] >= 178) & (c['std'] >= 15)

def refine_instance(rgb, c, bg, water, badge, inst_mask, box, seeds=None):
    x1, y1, x2, y2 = box
    roi = rgb[y1:y2, x1:x2]
    im = inst_mask[y1:y2, x1:x2]
    bgr = cv2.cvtColor(np.ascontiguousarray(roi), cv2.COLOR_RGB2BGR)
    sub = lambda a: a[y1:y2, x1:x2]
    dist = ndi.distance_transform_edt(~im)
    mask = np.full(im.shape, cv2.GC_PR_BGD, np.uint8)
    mask[im] = cv2.GC_PR_FGD
    core = ndi.binary_erosion(im, iterations=1) & ~sub(checkerish(c))
    if seeds is not None:
        core = ndi.binary_erosion(sub(seeds), iterations=1)
    mask[core] = cv2.GC_FGD
    mask[(sub(bg) & (dist > 2))] = cv2.GC_BGD
    mask[(sub(water) & (dist > 1))] = cv2.GC_BGD
    mask[sub(badge)] = cv2.GC_BGD
    mask[im & sub(checkerish(c))] = cv2.GC_PR_BGD
    if (mask == cv2.GC_FGD).sum() < 20 or (mask == cv2.GC_BGD).sum() < 20:
        fg = im
    else:
        bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
        cv2.grabCut(bgr, mask, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
        fg = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    # Componentes: el principal y las piezas que estén a ≤ 3 px de él (astas, mechones).
    lab, n = ndi.label(fg)
    if n > 1:
        sizes = ndi.sum(fg, lab, np.arange(1, n + 1))
        main = lab == (int(np.argmax(sizes)) + 1)
        near = ndi.binary_dilation(main, iterations=3)
        keep = main.copy()
        for i in range(1, n + 1):
            comp = lab == i
            if sizes[i - 1] >= 12 and (comp & near).any():
                keep |= comp
        fg = keep
    # Huecos internos pequeños que no son tablero: se rellenan (brillos de la blusa).
    holes = ndi.binary_fill_holes(fg) & ~fg
    hl, hn = ndi.label(holes)
    if hn:
        hs = ndi.sum(holes, hl, np.arange(1, hn + 1))
        ck = ndi.mean(sub(checkerish(c)).astype(float), hl, np.arange(1, hn + 1))
        fillok = np.zeros(hn + 1, bool); fillok[1:] = (hs <= 40) & (ck < 0.3)
        fg |= fillok[hl]
    # Orillas: píxeles del borde claros y neutros (mezcla con el tablero) fuera.
    for _ in range(2):
        edge = fg & ~ndi.binary_erosion(fg)
        bad = edge & (sub(c['lum']) >= 200) & (sub(c['sat']) <= 18)
        fg &= ~bad
    return fg

def extract(atlas_path, key, outdir, manifest):
    rgb = np.array(Image.open(atlas_path).convert('RGB'))
    c = channels(rgb)
    bg = background_mask(rgb)
    water = water_mask(c)
    notsof = bg | water
    badge = badge_mask(c, notsof)
    H, W = bg.shape
    for name, (sx1, sy1, sx2, sy2) in SECTIONS[key].items():
        region = np.zeros_like(bg); region[sy1:sy2, sx1:sx2] = True
        frames = []
        wl = None
        if name in FX_SECTIONS:
            # Efectos: contornos del propio agua (sin tablero ni etiquetas oscuras).
            # Agua de los efectos: píxeles con tinte azul/cian (la espuma blanca casi siempre lo tiene) o muy
            # brillantes pegados a ellos; el tablero es gris neutro y los letreros son blanco sobre negro.
            tint = (c['B'] - c['R'] >= 14) & (c['V'] > 60)
            # Brillos de espuma: muy claros, pegados al agua y con un leve tinte azul (el blanco del tablero es
            # neutro puro: B−R ≈ 0); lo gris neutro nunca es efecto.
            bright = (c['lum'] >= 225) & (c['B'] - c['R'] >= 6) & ndi.binary_dilation(tint, iterations=2)
            fxm = region & ~bg & (tint | bright) & (c['sat'] > 8)
            fxm = ndi.binary_opening(fxm, iterations=1)
            lab, n = ndi.label(ndi.binary_dilation(fxm, iterations=2))
            for i, sl in enumerate(ndi.find_objects(lab), 1):
                comp = (lab == i) & fxm
                if comp.sum() < 150 or ((c['B'] - c['R'])[comp]).mean() < 25:
                    continue
                ys, xs = np.nonzero(comp)
                frames.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, comp))
        else:
            # Línea del agua de la sección: primera fila donde la mayoría de la franja es agua.
            wl = None
            if name in SURFACE:
                rows = water[sy1:sy2, sx1:sx2].mean(axis=1)
                hit = np.nonzero(rows >= 0.45)[0]
                wl = int(sy1 + hit[0]) if len(hit) else None
            # Semillas propias de Sofía (nunca están en el agua): oscuro no azul (cabello, botas, contorno),
            # piel, falda roja/magenta y astas doradas. Lo blanco (blusa/espuma) lo decide GrabCut después.
            seeds = region & ~bg & ~badge & seed_mask(c)
            seeds = ndi.binary_opening(seeds, structure=np.ones((2, 2), bool))
            sl_, sn_ = ndi.label(seeds)
            if sn_:
                ss = ndi.sum(seeds, sl_, np.arange(1, sn_ + 1)); okk = np.zeros(sn_ + 1, bool); okk[1:] = ss >= 12
                seeds = okk[sl_]
            waterX = water | (foam_mask(c) if name in SURFACE else False)
            M = region & ~bg & ~badge & ~waterX
            # Instancias por semillas (cuenta correcta de cuadros); cada una crece después por lo que no es agua
            # ni fondo, hasta 20 px de SUS semillas y sin entrar en las del vecino (piernas teñidas incluidas).
            lab, n = ndi.label(ndi.binary_dilation(seeds, iterations=4))
            comps = []
            for i, sl in enumerate(ndi.find_objects(lab), 1):
                comp = (lab == i) & seeds
                ys, xs = np.nonzero(comp)
                if len(xs) < 40:
                    continue
                comps.append([comp, (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)])
            allseeds = np.zeros_like(bg)
            for comp, _ in comps: allseeds |= comp
            grown_list = []
            for comp, (bx1, by1, bx2, by2) in comps:
                y1g, y2g, x1g, x2g = max(0, by1 - 24), min(H, by2 + 24), max(0, bx1 - 24), min(W, bx2 + 24)
                d = ndi.distance_transform_edt(~comp[y1g:y2g, x1g:x2g])
                others = ndi.binary_dilation(allseeds & ~comp, iterations=3)[y1g:y2g, x1g:x2g]
                Ml = M[y1g:y2g, x1g:x2g] & (d <= 20) & ~others
                g = ndi.binary_propagation(comp[y1g:y2g, x1g:x2g], mask=Ml | comp[y1g:y2g, x1g:x2g])
                full = np.zeros_like(bg); full[y1g:y2g, x1g:x2g] = g
                grown_list.append(full)
            # Piezas chicas (p. ej. la falda separada por el agua) se unen al cuadro cuyo crecimiento las alcanza.
            areas = [int(c_[0].sum()) for c_ in comps]
            order = sorted(range(len(comps)), key=lambda k: -areas[k])
            owner = list(range(len(comps)))
            for j in order[::-1]:
                if areas[j] >= 0.35 * max(areas):
                    continue
                for i in order:
                    if i == j or areas[i] < areas[j]:
                        continue
                    if (ndi.binary_dilation(grown_list[i], iterations=2) & comps[j][0]).any():
                        owner[j] = i; break
            groups = {}
            for k in range(len(comps)):
                r = k
                while owner[r] != r: r = owner[r]
                groups.setdefault(r, []).append(k)
            merged_comps = []
            for r, ks in groups.items():
                comp = np.zeros_like(bg); compg = np.zeros_like(bg)
                for k in ks: comp |= comps[k][0]; compg |= grown_list[k] | comps[k][0]
                ys, xs = np.nonzero(comp)
                if len(xs) < 120 or ys.max() - ys.min() < 15 or xs.max() - xs.min() < 12:
                    continue
                if sum(int((comp & kk).sum() >= 8) for kk in seed_kinds(c)) < 2:
                    continue
                gy, gx = np.nonzero(compg)
                merged_comps.append((comp, None, compg, (gx.min(), gy.min(), gx.max() + 1, gy.max() + 1)))
            comps = merged_comps
            merged = True
            while merged:
                merged = False
                for i in range(len(comps)):
                    for j in range(i + 1, len(comps)):
                        (ci, _, gi, (ax1, ay1, ax2, ay2)), (cj, _, gj, (bx1_, by1_, bx2_, by2_)) = comps[i], comps[j]
                        ov = min(ax2, bx2_) - max(ax1, bx1_)
                        if ov >= 0.4 * min(ax2 - ax1, bx2_ - bx1_):
                            gb = (min(ax1, bx1_), min(ay1, by1_), max(ax2, bx2_), max(ay2, by2_))
                            comps[i] = (ci | cj, gb, gi | gj, gb)
                            del comps[j]; merged = True; break
                    if merged: break
            allgrown = np.zeros_like(bg)
            for _, _, g, _ in comps: allgrown |= g
            for comp, _, compg, (bx1, by1, bx2, by2) in comps:
                m = 10
                box = (max(0, bx1 - m), max(0, by1 - m), min(W, bx2 + m), min(H, by2 + m))
                others = ndi.binary_dilation(allgrown & ~compg, iterations=2)
                fg_roi = refine_instance(rgb, c, bg, waterX | others, badge, compg & ~others, box, seeds=comp)
                full = np.zeros_like(bg); full[box[1]:box[3], box[0]:box[2]] = fg_roi
                fwl = wl
                if name in SURFACE and wl is not None:
                    # Línea de CONTACTO de este cuadro: el agua pintada está en perspectiva (su borde lejano queda
                    # detrás de la cabeza), así que se busca, bajo la cabeza, la primera fila donde el agua cubre la
                    # mayor parte de la columna central del cuerpo.
                    sx1_, sy1_, sx2_, sy2_ = bx1, by1, bx2, by2
                    cw = sx2_ - sx1_
                    c1, c2 = int(sx1_ + 0.25 * cw), int(sx2_ - 0.25 * cw)
                    ystart = int(sy1_ + 0.3 * (sy2_ - sy1_))
                    for yy in range(ystart, min(H, sy2 + 1)):
                        if waterX[yy, c1:c2].mean() >= 0.5:
                            fwl = yy; break
                    full[fwl + 3:, :] = False
                else:
                    for _ in range(2):  # resplandor del agua pegado al contorno
                        edge = full & ~ndi.binary_erosion(full)
                        full &= ~(edge & (c['blue'] >= 18))
                lab2, n2 = ndi.label(full)
                if n2 > 1:
                    sz = ndi.sum(full, lab2, np.arange(1, n2 + 1)); okc = np.zeros(n2 + 1, bool); okc[1:] = sz >= 15
                    full = okc[lab2]
                ys, xs = np.nonzero(full)
                if len(xs) < 150:
                    continue
                frames.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, full, fwl))
        frames = [f if len(f) == 6 else f + (wl,) for f in frames]
        frames.sort(key=lambda f: (f[0] + f[2]) / 2)
        for k, (fx1, fy1, fx2, fy2, m, fwl) in enumerate(frames, 1):
            p = 2
            X1, Y1, X2, Y2 = max(0, fx1 - p), max(0, fy1 - p), min(W, fx2 + p), min(H, fy2 + p)
            crop = rgb[Y1:Y2, X1:X2]
            alpha = (m[Y1:Y2, X1:X2] * 255).astype(np.uint8)
            rgba = np.dstack([crop, alpha])
            fn = '%s_%02d.png' % (name, k)
            Image.fromarray(rgba, 'RGBA').save(os.path.join(outdir, fn))
            item = dict(file=fn, section=name, index=k, src=key, box=[int(X1), int(Y1), int(X2), int(Y2)], px=int(m.sum()))
            if name in SURFACE and not name in FX_SECTIONS and fwl is not None:
                item['waterline'] = int(fwl - Y1)   # fila (en el cuadro) donde el agua toca el cuerpo
            manifest.append(item)
        print('%-16s %2d cuadros' % (name, len(frames)) + (('  línea del agua y=%s' % wl) if name in SURFACE else ''))

if __name__ == '__main__':
    a, b, outdir = sys.argv[1:4]
    os.makedirs(outdir, exist_ok=True)
    manifest = []
    extract(a, 'a', outdir, manifest)
    extract(b, 'b', outdir, manifest)
    json.dump(manifest, open(os.path.join(outdir, 'manifest.json'), 'w'), indent=1)
    print('total', len(manifest))
