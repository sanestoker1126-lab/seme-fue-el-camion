// V58.5 · Entrega: el paquete (tools/empaquetar.sh) deja fuera los assets retirados; ninguno debe pedirlo el juego.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

test('ningún asset retirado lo pide el código, el HTML ni el service worker', () => {
  const retired = read('tools/assets_retirados.txt').split('\n').map((s) => s.trim()).filter(Boolean);
  assert.ok(retired.length > 0);
  const code = [...walk('js'), ...walk('css'), 'Se_Me_Fue_El_Camion.html', 'index.html', 'sw.js', 'manifest.webmanifest']
    .filter((f) => /\.(js|css|html|webmanifest)$/.test(f)).map(read).join('\n');
  for (const f of retired) {
    assert.ok(fs.existsSync(path.join(ROOT, f)), 'la lista nombra un archivo que existe: ' + f);
    assert.ok(!code.includes(f), 'el juego todavía pide ' + f);
    // Rutas armadas por carpeta (p. ej. EDIR + tipo + cuadro): la carpeta del asset retirado tampoco debe aparecer
    // como prefijo, salvo las que comparten carpeta con assets vivos.
  }
  assert.ok(!/['"`]assets\/enemies\/nino\//.test(code), 'la carpeta del niño viejo no se usa (el niño vive en v50/kid)');
});

test('el empaquetador existe y el flujo de GitHub lo usa con la versión del juego', () => {
  const sh = read('tools/empaquetar.sh'), wf = read('.github/workflows/build-game-zip.yml');
  assert.match(sh, /grep -vxF -f tools\/assets_retirados\.txt/);
  assert.match(sh, /LEEME\.txt/);
  assert.match(wf, /bash tools\/empaquetar\.sh/);
  assert.ok(!wf.includes('submarino_fondo.png'), 'no verifica un fondo retirado en V58.1');
});
