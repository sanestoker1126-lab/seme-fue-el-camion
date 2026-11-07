"""Quita el tablero de ajedrez pintado ("PNG transparente" falso) de un atlas.
Uso: python3 -I bgmask.py <atlas.png> <salida_prefijo>
- Candidato a fondo: píxel neutro (max-min ≤ 28) y claro (luminancia ≥ 160).
- Barrera: lo que claramente es Sofía (oscuro o con color) se engruesa 2 px para cerrar los huecos de su
  contorno; el fondo exterior se rellena desde el borde de la imagen sin cruzar la barrera y después recupera
  solo 3 px de orilla. Así la blusa y las mallas blancas no se pierden aunque su contorno tenga huecos.
- Huecos encerrados (entre brazo y cuerpo, entre piernas): son fondo solo si muestran la mezcla bimodal del
  tablero (cuadros blancos y grises neutros) y textura alta; lo blanco de la ropa es casi todo de un tono.
- Motas sueltas (< 25 px) lejos de todo: fondo."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return (x * x + y * y) <= r * r

def background_mask(rgb, barrier_r=2, regrow=3):
    f = rgb.astype(np.int32)
    mx, mn = f.max(2), f.min(2)
    sat = mx - mn
    lum = (f[..., 0] * 299 + f[..., 1] * 587 + f[..., 2] * 114) / 1000.0
    cand = (sat <= 28) & (lum >= 160)
    barrier = ndi.binary_dilation(~cand, structure=disk(barrier_r))
    free = cand & ~barrier
    lab, n = ndi.label(free)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    outer = np.isin(lab, border[border > 0])
    # Huecos encerrados con textura de tablero.
    m = ndi.uniform_filter(lum, 7); m2 = ndi.uniform_filter(lum * lum, 7)
    std = np.sqrt(np.maximum(0, m2 - m * m))
    ids = np.arange(1, n + 1)
    if n:
        size = ndi.sum(free, lab, ids)
        grayish = ndi.mean(((lum >= 178) & (lum <= 226) & (sat <= 7)).astype(float), lab, ids)
        whitish = ndi.mean((lum >= 238).astype(float), lab, ids)
        tex = ndi.mean(std, lab, ids)
        holes = (~np.isin(ids, border)) & (size >= 6) & (grayish >= 0.22) & (whitish >= 0.18) & (tex >= 13)
        keep = np.zeros(n + 1, bool); keep[1:] = holes
        outer |= keep[lab]
    bg = outer.copy()
    for _ in range(regrow):
        bg = (ndi.binary_dilation(bg) & cand) | bg
    # Motas sueltas: componentes de primer plano diminutos.
    fl, fn = ndi.label(~bg)
    if fn:
        fs = ndi.sum(~bg, fl, np.arange(1, fn + 1))
        tiny = np.zeros(fn + 1, bool); tiny[1:] = fs < 25
        bg |= tiny[fl]
    return bg

if __name__ == '__main__':
    src, pre = sys.argv[1], sys.argv[2]
    rgb = np.array(Image.open(src).convert('RGB'))
    bg = background_mask(rgb)
    np.save(pre + '_bg.npy', bg)
    vis = rgb.copy(); vis[bg] = (vis[bg] * 0.25 + np.array([255, 0, 255]) * 0.75).astype(np.uint8)
    Image.fromarray(vis).save(pre + '_bgvis.png')
    lab, n = ndi.label(~bg)
    sizes = ndi.sum(~bg, lab, np.arange(1, n + 1))
    print(src, 'fondo %.1f%%' % (bg.mean() * 100), 'componentes', n, 'grandes(>400px)', int((sizes > 400).sum()))
