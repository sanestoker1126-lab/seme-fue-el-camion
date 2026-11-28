const test = require('node:test');
const assert = require('node:assert/strict');
const {load} = require('./helpers');
const N = load();
require('../js/core/toxifamilia.js');
test('V58.8.20: menos repetidos, misma geometría, jefes y especies', () => {
 let removed=0;
 for (const m of N.LEVELS.MISSIONS) for (const difficulty of ['facil','normal','dificil']) {
  const o={levels:m.levels,difficulty,seed:821};
  const a=N.World.buildWorld({...o,preservePopulation:true}), b=N.World.buildWorld(o);
  assert.deepEqual(b.platforms.map(p=>[p.id,p.x1,p.x2,p.y]),a.platforms.map(p=>[p.id,p.x1,p.x2,p.y]));
  assert.deepEqual(b.foes.filter(f=>f.isBoss||f.secret).map(f=>f.id),a.foes.filter(f=>f.isBoss||f.secret).map(f=>f.id));
  assert.deepEqual([...new Set(b.foes.map(f=>f.scene+':'+f.kind))].sort(),[...new Set(a.foes.map(f=>f.scene+':'+f.kind))].sort());
  assert.ok(b.foes.length<=a.foes.length); if(difficulty==='dificil')assert.equal(b.foes.length,a.foes.length);removed+=a.foes.length-b.foes.length;
 }
 assert.ok(removed>0);
});
test('apertura escolar: fondo local, actores con pasos y franja de suelo',()=>{
 const m=N.TOXIFAMILIA, s=m.validate(m.SCENES)[0];
 assert.equal(s.id,'esc_aula_inicio');assert.ok(s.cast.every(a=>a.anim&&a.anim.some(step=>step.to!=null)));
 const [w,h,x1,x2,y]=m.CONTACTS[s.id];assert.ok(x1>=0&&x2<=w&&x2>x1&&y>0&&y<h);
});
test('selector DOM: 5 mundos, 23 paradas habilitadas y partidas seleccionables desde guardado nuevo',()=>{
 const nodes=new Map(), calls=[];
 function element(){return {children:[],dataset:{},style:{},set innerHTML(v){this.children=[];this.html=v},get innerHTML(){return this.html},appendChild(x){this.children.push(x)},addEventListener(){},setAttribute(){}}}
 global.document={getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},createElement:element,querySelectorAll(){return []},addEventListener(){}};
 try {
  require('../js/app/ui.js');
  const ui=N.UI.createUI({click(){},start(m,t){calls.push([m,t])}}), G=N.Game.createGame({}), before=structuredClone(G.save);
  ui.paintMenu(G,{freeSelect:false,difficulty:'normal'});
  const counts=[];
  for(let m=0;m<5;m++){
   const button=nodes.get('missions').children[m];assert.equal(button.disabled,false);button.onclick();
   const stops=nodes.get('tramos').children;counts.push(stops.length);
   stops.forEach((s,t)=>{assert.equal(s.disabled,false);s.onclick();assert.deepEqual(calls.at(-1),[m,t]);});
  }
  assert.deepEqual(counts,[3,13,3,1,3]);assert.equal(calls.length,23);assert.deepEqual(G.save,before);
 }finally{delete global.document;}
});
