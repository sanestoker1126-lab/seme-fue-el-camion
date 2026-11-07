const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = path => fs.readFileSync(require('node:path').join(ROOT, path),'utf8');
const names=['00_fondo_lejano','01_profundidad','02_estructuras','03_elementos','04_primer_plano'];
test('V55: 10 SVG de parallax originales, cinco por misión, sin scripts ni referencias externas',()=>{
 for(const theme of ['submarino','espacial']){
  for(const filename of names){
   const p='assets/parallax/'+theme+'/'+filename+'.svg';
   const src=read(p);
   assert.ok(src.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'),p+' encabezado');
   assert.match(src, /viewBox="0 0 1920 2600"/);
   assert.ok(src.endsWith('</svg>'));
   assert.doesNotMatch(src, /<(?:script|foreignObject|image)\b/i);
   assert.doesNotMatch(src, /(?:https?:|data:)\/\//i);
  }
 }
});
test('V55: manifiesto de cinco capas y factores de paralaje por misión',()=>{
 const m=JSON.parse(read('assets/parallax/manifest.json'));
 assert.deepEqual(m.speeds,[.1,.22,.4,.68,1]);
 for(const theme of ['submarino','espacial']){
  assert.equal(m.themes[theme].length,5);
  for(const layer of m.themes[theme])assert.ok(fs.existsSync(path.join(ROOT,layer.src)));
  assert.ok(m.themes[theme][4].front);
 }
});
test('V55: el renderizado usa recorte visible, y el service worker incluye los SVG',()=>{
 const r=read('js/app/render.js'),sw=read('sw.js'),main=read('js/app/main.js');
 assert.match(r,/function drawRealParallax\(/);
 assert.match(r,/PARALLAX_SPEED = Object\.freeze\(\[0\.10, 0\.22, 0\.40, 0\.68, 1\.00\]\)/);
 assert.match(r,/const sx = \(x1 - dx\) \* iw \/ dw/);
 assert.match(r,/drawRealParallax\(G, V, sc, 4, 5\)/);
 assert.match(sw,/\.\.\.NINA_VARIANTS,\.\.\.PARALLAX/);
 assert.match(sw,/camion-v55-parallax-real/);
 assert.match(main,/R\.PARALLAX_LAYERS/);
});
