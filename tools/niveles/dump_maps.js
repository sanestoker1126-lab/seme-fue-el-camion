const path = require('path'), fs = require('fs');
const root = path.resolve(process.argv[2] || '.');
for (const m of ['util', 'config', 'levels']) require(path.join(root, 'js', 'core', m + '.js'));
const L = globalThis.CAMION.LEVELS, out = {};
for (const [k, v] of Object.entries(L)) if (v && v.surfaces) out[k] = v;
fs.writeFileSync(process.argv[3], JSON.stringify(out)); console.log(Object.keys(out).join(' '));
