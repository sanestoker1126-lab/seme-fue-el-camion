const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {load,input}=require('./helpers'),N=load();
function marine(difficulty='normal'){const G=N.Game.createGame({assist:{relaxed:true}});G.setView(844,390);G.newRun({mission:2,difficulty,seed:821});return G;}
test('mar continuo, fosa original, arena propia y ausencia de amenazas secundarias',()=>{
 for(const diff of ['facil','normal','dificil']){
  const G=marine(diff),W=G.world,a=W.poseidonArena,b=W.foes.find(f=>f.id===a.bossId);
  assert.equal(W.scenes.length,3);assert.equal(W.waters.filter(z=>z.sea&&!z.room).length,1);
  assert.deepEqual(W.scenes[2].map.worldArt.pages,['fosa_azul.webp','santuario_poseidon_v23.webp']);
  assert.ok(fs.existsSync('assets/scenes/underwater/v59/santuario_poseidon_v23.webp'));
  assert.ok(!W.solids.some(s=>s.bottom&&s.kind==='bank'&&s.region==='main'));
  assert.equal(b.waterZone,W.waters[0]);assert.ok(b.y>a.top&&b.y<a.bottom);assert.ok(b.w>=92);
  assert.ok(W.foes.every(f=>f.region!=='main'||f.isBoss||f.y<a.entryY-90));
  assert.ok(W.hazards.every(h=>h.scene!==2||(h.y2??h.y??0)<a.entryY-80));
  assert.ok(W.abyssBeacons.some(q=>q.id==='abyss:poseidon'));
 }
});
test('escotilla bloquea victoria antes de vencer a Poseidón y se abre después',()=>{
 const G=marine(),W=G.world,P=G.P,a=W.poseidonArena,b=W.foes.find(f=>f.id===a.bossId);
 Object.assign(P,{x:a.x,y:a.bottom-60,vx:0,vy:0,ground:null,water:W.waters[0],submerged:true});
 G.step(1/60,input());assert.equal(G.state,'playing');assert.ok(!b.dead);
 // prueba localizada del guard: baja vida por golpes del motor, no eliminación directa
 while(!b.dead){b.hitCD=0;N.Enemies.hit(b,'kick',[],P.x);}
 G.step(1/60,input());assert.equal(G.state,'victory');
});
test('el jefe avisa, carga, recupera y permite contraatacar dentro de la arena',()=>{
 const G=marine(),W=G.world,a=W.poseidonArena,b=W.foes.find(f=>f.id===a.bossId),P=G.P;
 const body=()=>({x1:-1,x2:1,y1:-1,y2:1}),ctx={region:'main',active:()=>true,onScreen:()=>true,hurtbox:body,bodybox:body,hurt:()=>{}};
 P.water=b.waterZone;P.y=b.y;P.x=b.x+105;b.cool=0;const ev=[];const w={foes:[b],solids:[],shots:[],platforms:[]};
 for(let i=0;i<230;i++){N.Enemies.update(w,P,1/60,ctx,ev);assert.ok(b.y>=b.arenaBounds.top&&b.y<=b.arenaBounds.bottom);}
 assert.ok(ev.some(e=>e.type==='foeAlert'));assert.ok(ev.some(e=>e.type==='foeCharge'));
 assert.ok(ev.findIndex(e=>e.type==='foeAlert')<ev.findIndex(e=>e.type==='foeCharge'));
 b.x=0;P.x=400;P.y=b.y;b.state='fly';b.cool=0;const events=[];
 for(let i=0;i<110;i++)N.Enemies.update(w,P,1/60,ctx,events);
 assert.ok(events.some(e=>e.type==='shoot'));assert.equal(b.state,'dizzy');assert.ok(N.Enemies.dashable(b));
});
