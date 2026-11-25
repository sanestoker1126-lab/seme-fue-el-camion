"""Quita el halo blanco que rodea a los peces de la lámina de fauna (V58).
El halo es casi opaco, así que no basta un umbral de alfa: se eliminan los píxeles claros y poco saturados que
están CONECTADOS al fondo transparente (relleno desde afuera), y así se conservan los brillos internos de cada pez.
Uso: python3 -I limpiar_halo.py <fauna.png original> <salida.webp>"""
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = np.array(Image.open(src).convert('RGBA')).astype(np.float32)
rgb, a = im[:, :, :3] / 255.0, im[:, :, 3].copy()
mx, mn = rgb.max(2), rgb.min(2)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
halo = ((sat < 0.24) & (mx > 0.5)) | (a < 150)          # candidato a halo: claro y gris, o casi transparente
reach = a < 8                                          # semilla: el fondo transparente
for _ in range(200):                                   # relleno por dilatación limitada a los candidatos
    grown = reach.copy()
    grown[1:, :] |= reach[:-1, :]; grown[:-1, :] |= reach[1:, :]
    grown[:, 1:] |= reach[:, :-1]; grown[:, :-1] |= reach[:, 1:]
    grown &= halo
    grown |= reach
    if (grown == reach).all():
        break
    reach = grown
alpha = np.where(reach, 0, a)
# Borde suave de 1 px para que no quede dentado.
edge = np.zeros_like(reach)
edge[1:, :] |= reach[:-1, :]; edge[:-1, :] |= reach[1:, :]; edge[:, 1:] |= reach[:, :-1]; edge[:, :-1] |= reach[:, 1:]
alpha = np.where(edge & ~reach, alpha * 0.55, alpha)
im[:, :, 3] = alpha
Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(out, 'WEBP', quality=92, method=6, alpha_quality=100, use_sharp_yuv=True)
print('opacos antes %.3f  después %.3f' % ((a > 0).mean(), (alpha > 0).mean()))
