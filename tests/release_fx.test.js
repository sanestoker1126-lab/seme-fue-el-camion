const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.join(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p));
test('atlas FX comercial: RGBA, 36 celdas, alfa y márgenes reales', () => {
  const m=JSON.parse(read('assets/fx/release_fx_rgba.json'));
  const png=read(m.image);
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  const w=png.readUInt32BE(16), h=png.readUInt32BE(20);
  assert.deepEqual([w,h],m.size);assert.equal(png[24],8);assert.equal(png[25],6);
  const chunks=[];for(let i=8;i<png.length;){const n=png.readUInt32BE(i),type=png.toString('ascii',i+4,i+8);if(type==='IDAT')chunks.push(png.subarray(i+8,i+8+n));i+=n+12;}
  const data=zlib.inflateSync(Buffer.concat(chunks));const stride=w*4+1;
  assert.equal(data.length,stride*h);
  for(let y=0;y<h;y++)assert.equal(data[y*stride],0);
  let count=0;
  for(const anim of Object.values(m.animations))for(const f of anim.frames){
    count++;const [x,y,rw,rh]=f.rect;assert.ok(x>=0&&y>=0&&x+rw<=w&&y+rh<=h);
    assert.deepEqual(f.pivot,[48,48]);let occupied=0;
    for(let j=0;j<rh;j++)for(let i=0;i<rw;i++){const a=data[(y+j)*stride+1+(x+i)*4+3];if(i<8||i>=rw-8||j<8||j>=rh-8)assert.equal(a,0);else if(a)occupied++;}
    assert.ok(occupied>10,'frame no vacío');
  }
  assert.equal(count,36);
});
test('atlas FX conectado al juego y precargado sin alterar simulación',()=>{
  const r=read('js/app/render.js').toString(),g=read('js/core/game.js').toString(),sw=read('sw.js').toString(),html=read('Se_Me_Fue_El_Camion.html').toString();
  const m=JSON.parse(read('assets/fx/release_fx_rgba.json'));
  const rows=JSON.parse(r.match(/const RELEASE_FX_ROWS = (\{[^\n]+\});/)[1]);
  for(const [id,a] of Object.entries(m.animations))assert.deepEqual(rows[id],[a.row,a.draw_size]);
  assert.match(r,/drawReleaseFx\(G, V\);/);assert.match(r,/count >= 24/);assert.match(g,/cue: \{ x, y, life \}/);
  assert.ok(sw.includes(m.image));assert.ok(sw.includes('assets/fx/release_fx_rgba.json'));
  for(const script of ['js/core/game.js?v=58.7.2','js/app/render.js?v=58.7.2']){assert.ok(sw.includes(script));assert.ok(html.includes(script));}
});
