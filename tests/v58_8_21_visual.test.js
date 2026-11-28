const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const base=path.join(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(base,p));
const sha=(b)=>crypto.createHash('sha256').update(b).digest('hex');
test('V58.8.21: 22 imágenes originales retocadas, dimensiones declaradas y hashes verificados',()=>{
 const rows=JSON.parse(read('reports/visual_assets_v58_8_21.json'));
 assert.equal(rows.length,22);
 assert.equal(new Set(rows.map(r=>r.world)).size,5);
 for(const r of rows){const b=read(r.path);assert.equal(b.length,r.afterBytes);assert.equal(sha(b),r.afterSHA256);assert.notEqual(r.beforeSHA256,r.afterSHA256);assert.ok(r.size.every(n=>n>0));}
});
test('V58.8.21: recursos de presentación y estilos versionados están en precache',()=>{
 const sw=read('sw.js').toString(),html=read('Se_Me_Fue_El_Camion.html').toString();
 assert.ok(sw.includes("'58.8.28'"));
 for(const [p,v] of [['css/release_visual.css','58.8.27'],['js/app/render.js','58.8.28'],['js/app/ui.js','58.8.27']]){assert.ok(sw.includes(p+'?v='+v));assert.ok(html.includes(p+'?v='+v));}
 for(const id of ['escuela','guadalajara','submarino','espacial','parafalls','sofia','luna','morita']){const f=`assets/ui/worlds_v21/${id}.webp`;assert.ok(sw.includes(f));assert.ok(read(f).length>1000);}
 for(const id of ['worldKicker','worldTitle','worldDesc','hudWorld','routeFill'])assert.ok(html.includes('id="'+id+'"'));
});
