"""Recupera las entradas completas de un ZIP truncado (sin directorio central).
Uso: python3 -I recuperar_zip.py <zip> <destino>. Verifica CRC32 de cada entrada y rechaza rutas peligrosas."""
import sys, struct, zlib, os, re
src, dst = sys.argv[1], os.path.realpath(sys.argv[2])
b = open(src, 'rb').read()
ok = bad = 0
for m in re.finditer(b'PK\x03\x04', b):
    o = m.start()
    sig, ver, flag, comp, mt, md, crc, cs, us, nl, el = struct.unpack('<IHHHHHIIIHH', b[o:o + 30])
    name = b[o + 30:o + 30 + nl].decode('utf8', 'replace')
    start = o + 30 + nl + el
    if flag & 0x8 or start + cs > len(b):
        print('INCOMPLETA  ', name); bad += 1; continue
    out = os.path.realpath(os.path.join(dst, name))
    if not out.startswith(dst + os.sep) or name.endswith('/'):
        print('RUTA RECHAZADA', name); bad += 1; continue
    raw = b[start:start + cs]
    try:
        data = zlib.decompress(raw, -15) if comp == 8 else raw if comp == 0 else None
    except zlib.error as e:
        print('ERROR INFLATE', name, e); bad += 1; continue
    if data is None or len(data) != us or (zlib.crc32(data) & 0xffffffff) != crc:
        print('CRC/TAMAÑO MAL', name); bad += 1; continue
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'wb').write(data); ok += 1
print('recuperadas', ok, '| descartadas', bad)
