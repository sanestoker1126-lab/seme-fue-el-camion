"""Importa al repo el arte de parallax aportado por el usuario.
Uso: python3 -I importar_arte.py <dirSubidas> <raizRepo>
- Escuela y Guadalajara: se copian los WebP tal cual (sin recomprimir). La única capa que faltaba en WebP
  (escuela_ruinas/02_vegetacion) se convierte desde su PNG con los mismos ajustes del paquete (quality 88, method 5).
- Marino y espacial: los PNG se convierten a WebP (quality 92, alfa sin pérdida) para la PWA."""
import sys, os, shutil
import numpy as np
from PIL import Image
up, repo = sys.argv[1], sys.argv[2]
dst = os.path.join(repo, 'assets', 'parallax')
def psnr(a, b):
    a = np.asarray(a.convert('RGBA'), np.float64); b = np.asarray(b.convert('RGBA'), np.float64)
    w = (a[:, :, 3:4] / 255.0)  # el color solo importa donde hay alfa
    mse = (((a[:, :, :3] - b[:, :, :3]) ** 2) * w).sum() / max(1.0, w.sum() * 3)
    amse = ((a[:, :, 3] - b[:, :, 3]) ** 2).mean()
    f = lambda m: 99.0 if m == 0 else 10 * np.log10(255 * 255 / m)
    return round(f(mse), 1), round(f(amse), 1)
def copy(src, rel):
    out = os.path.join(dst, rel); os.makedirs(os.path.dirname(out), exist_ok=True)
    im = Image.open(src); im.load()  # decodifica entera: si está dañada, falla aquí
    shutil.copyfile(src, out); print('copiada   ', rel, im.size, os.path.getsize(out))
def conv(src, rel, q):
    out = os.path.join(dst, rel); os.makedirs(os.path.dirname(out), exist_ok=True)
    im = Image.open(src); im.load()
    im.save(out, 'WEBP', quality=q, method=6, alpha_quality=100, exact=False)
    back = Image.open(out); back.load()
    assert back.size == im.size
    print('convertida', rel, im.size, im.mode, os.path.getsize(src), '→', os.path.getsize(out), 'PSNR color/alfa', psnr(im, back))
E = os.path.join(up, 'escuela', 'assets', 'parallax', 'escuela')
for sec in ('azotea_superior', 'escuela_ruinas', 'patio_salida'):
    for layer in ('00_fondo_distante', '01_arquitectura', '02_vegetacion', '03_ambiente', '04_primer_plano'):
        w = os.path.join(E, sec, layer + '.webp'); p = os.path.join(E, sec, layer + '.png')
        if os.path.exists(w): copy(w, f'escuela/{sec}/{layer}.webp')
        else:
            out = os.path.join(dst, f'escuela/{sec}/{layer}.webp'); os.makedirs(os.path.dirname(out), exist_ok=True)
            im = Image.open(p); im.load(); im.save(out, 'WEBP', quality=88, method=5)
            back = Image.open(out); back.load()
            print('convertida', f'escuela/{sec}/{layer}.webp', 'desde PNG (faltaba el WebP)', os.path.getsize(out), 'PSNR', psnr(im, back))
Gd = os.path.join(up, 'guadalajara', 'assets', 'parallax', 'guadalajara')
for sec in ('azoteas', 'mercado_parque', 'barrios_inferiores'):
    for layer in ('00_cielo_degradado', '01_nubes_reales', '02_arquitectura_anclada', '03_reflejos_luces', '04_bruma_frontal'):
        copy(os.path.join(Gd, sec, layer + '.webp'), f'guadalajara/{sec}/{layer}.webp')
conv(os.path.join(up, 'marino', 'panorama_marino.png'), 'marino/panorama_marino.webp', 92)
conv(os.path.join(up, 'marino', 'arrecife.png'), 'marino/arrecife.webp', 92)
conv(os.path.join(up, 'marino', 'fauna.png'), 'marino/fauna.webp', 92)
conv(os.path.join(up, 'espacial', 'panorama.png'), 'espacial/panorama.webp', 92)
conv(os.path.join(up, 'espacial', 'decoracion.png'), 'espacial/decoracion.webp', 92)
