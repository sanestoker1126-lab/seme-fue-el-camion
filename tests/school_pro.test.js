const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {load,input}=require('./helpers');const NS=load();
const step=(G,n=1,inp=input())=>{for(let i=0;i<n;i++)G.step(1/60,inp);};
function game(m=0,d='normal',extra={}){const G=NS.Game.createGame({});G.setView(390,844);G.newRun({mission:m,difficulty:d,...extra});G.drainEvents();return G;}
function place(G,x,foot,ground){const P=G.P;Object.assign(P,NS.Physics.createPlayer(x,foot),{ground,invuln:10});G.updateCamera(0,true);}
test('school victory label uses the official name Benito Juárez',()=>{
 const ui=fs.readFileSync(require.resolve('../js/app/ui.js'),'utf8');
 assert.match(ui,/ESCUELA BENITO JUÁREZ · RUTA 6/);
 assert.doesNotMatch(ui,/ESCUELA MIGUEL HIDALGO · RUTA 6/);
});
test('school campaign: three stages, named rooms, aligned route markers, final boss on real solid street',()=>{
 for(const d of ['facil','normal','dificil']){const G=game(0,d),W=G.world;assert.equal(W.scenes.length,3);assert.equal(W.schoolMission,true);assert.equal(W.rooms.filter(r=>r.schoolArt).length,3);assert.equal(W.schoolFinal.y,W.street.y1);const boss=W.foes.find(f=>f.id===W.schoolFinal.bossId);assert.equal(boss.plat,W.street);assert.ok(boss.minX<boss.x&&boss.x<boss.maxX);for(const s of W.signs.filter(s=>s.id.startsWith('school:route:')))assert.ok(W.platforms.some(p=>p.scene===s.scene&&p.y===s.y&&s.x>=p.x1&&s.x<=p.x2));}
});
test('school camera stays inside the painted art at both ends of stages 2 and 3',()=>{
 for(const startTramo of [1,2]){
  const G=NS.Game.createGame({});G.setView(1080,677);G.newRun({mission:0,startTramo,difficulty:'normal'});
  const S=G.world.scenes[startTramo],A=S.map.worldArt,left=S.x0-(A.x0||0)*S.scale*A.px,right=left+A.width*S.scale*A.px;
  G.updateCamera(0,true);assert.ok(G.cam.x>=left-.01,`left gutter on stage ${startTramo+1}: ${G.cam.x} < ${left}`);
  G.P.x=right;G.P.vx=0;G.updateCamera(0,true);assert.ok(G.cam.x+G.view.w<=right+.01,`right gutter on stage ${startTramo+1}`);
 }
});
test('the bus cannot be boarded before the teacher is defeated; opens afterwards and unlocks Guadalajara',()=>{
 const G=game(0,'normal',{startTramo:2}),W=G.world,boss=W.foes.find(f=>f.id===W.schoolFinal.bossId);place(G,(W.goal.x1+W.goal.x2)/2,W.street.y1,W.street);step(G,2);assert.equal(G.state,'playing');assert.equal(W.schoolFinalCheckpoint.active,true);assert.equal(G.save.missions.guadalajara,0);boss.dead=true;step(G,1);assert.equal(G.state,'victory');step(G,240);assert.equal(G.state,'won');assert.ok(G.save.missions.guadalajara>=1);
});
test('final checkpoint retry returns to street before the boss, with active new fight',()=>{
 const G=game(0,'normal',{startTramo:2}),W=G.world,cp=W.schoolFinalCheckpoint;place(G,cp.x,cp.y,W.street);step(G);assert.equal(G.checkpoint.id,cp.id);G.retry();assert.equal(G.checkpoint.id,cp.id);assert.equal(G.P.ground,G.world.street);assert.equal(G.tramo,2);assert.ok(G.world.foes.find(f=>f.id===G.world.schoolFinal.bossId&&!f.dead));
});
test('school rooms have functional entry, exit and school-specific art',()=>{
 const G=game();for(const r of G.world.rooms.filter(r=>!r.secret)){assert.ok(r.schoolArt);const d=r.entry;place(G,d.x,d.y,d.plat);step(G,1,input({downPressed:true}));step(G,35);assert.equal(G.room?.id,r.id);const x=r.exit;place(G,x.x,x.y,G.world.solids.find(s=>s.region===r.id&&s.y1===r.y2&&x.x>=s.x1&&x.x<=s.x2));step(G,1,input({downPressed:true}));step(G,35);assert.equal(G.room,null);}
});
test('hidden school archive has its own art, a real stone-throwing kid, and leaves the teacher as final boss',()=>{
 const G=game(),W=G.world,room=W.rooms.find(r=>r.secret==='aula_escolar');assert.ok(room);assert.equal(room.art,'aula_escolar_oculta');assert.equal(W.rooms.filter(r=>r.secret==='aula_escolar').length,1);
 const kid=W.foes.find(f=>f.kind==='kid'&&f.region===room.id&&!f.dead);assert.ok(kid);assert.ok(NS.Enemies.TYPES.kid.throwRange>0);
 const teacher=W.foes.find(f=>f.kind==='maestro'&&f.isBoss&&!f.secret);assert.ok(teacher);assert.equal(teacher.id,W.schoolFinal.bossId);
 assert.ok(fs.existsSync(require('node:path').resolve(__dirname,'../assets/backgrounds/secretos/aula_escolar_oculta.webp')));
 const sw=fs.readFileSync(require.resolve('../sw.js'),'utf8');assert.ok(sw.includes('assets/backgrounds/secretos/aula_escolar_oculta.webp'));
 const d=room.entry;place(G,d.x,d.y,d.plat);step(G,1,input({downPressed:true}));step(G,35);assert.equal(G.room?.id,room.id);
 const floor=W.platforms.find(p=>p.region===room.id&&p.kind==='floor'&&Math.abs(p.y-room.y2)<.01);assert.ok(floor);const x=room.exit;place(G,x.x,x.y,floor);step(G,1,input({downPressed:true}));step(G,35);assert.equal(G.room,null);
});
test('other campaigns do not acquire school gate or school final checkpoint',()=>{for(const m of [1,2,3]){const W=game(m).world;assert.equal(W.schoolMission,false);assert.equal(W.schoolFinal,undefined);assert.equal(W.schoolFinalCheckpoint,undefined);}});
// End-to-end real enemy AI and collision on street; no forced HP changes.
test('teacher is beatable in real fight with timed attacks and then boarding',()=>{
 const G=game(0,'normal',{startTramo:2}),W=G.world,boss=W.foes.find(f=>f.id===W.schoolFinal.bossId);W.foes=W.foes.filter(f=>f===boss);place(G,W.schoolFinalCheckpoint.x,W.street.y1,W.street);G.P.invuln=0;
 for(let i=0;i<3600&&!boss.dead&&G.state==='playing';i++){
   const P=G.P,dx=boss.x-P.x,dir=Math.sign(dx)||1,dist=Math.abs(dx),o={};
   if(boss.state==='windup'||boss.state==='charge'||boss.state==='shout'){if(dist<145){o.jumpPressed=!!P.ground;o.jumpHeld=true;}if(boss.state==='charge'&&dist<105)o[dir>0?'left':'right']=true;}
   else if(boss.state==='dizzy'){if(dist>32)o[dir>0?'right':'left']=true;if(dist<130&&P.dashCD<=0)o.dashPressed=true;else if(dist<50&&P.kickCD<=0)o.kickPressed=true;}
   else {if(dist>110)o[dir>0?'right':'left']=true;if(dist<48&&P.kickCD<=0)o.kickPressed=true;if(boss.state==='aim'&&dist<150){o.jumpPressed=!!P.ground;o.jumpHeld=true;}}
   G.step(1/60,input(o));
 }
 assert.ok(boss.dead,'teacher defeated by player actions, remaining HP '+boss.hp);assert.ok(G.run.bosses>=1);place(G,(W.goal.x1+W.goal.x2)/2,W.street.y1,W.street);step(G,2);assert.equal(G.state,'victory');
});
test('school furniture is mapped to all twelve real room platforms, with no added collision geometry',()=>{
 for(const difficulty of ['facil','normal','dificil']){const G=game(0,difficulty);assert.equal(G.world.rooms.filter(r=>!r.secret).length,3);let n=0;for(const r of G.world.rooms.filter(r=>!r.secret)){assert.ok(Number.isInteger(r.schoolObjective));assert.equal(r.schoolFurniture.length,4);for(const p of r.schoolFurniture){assert.ok(G.world.platforms.includes(p));assert.equal(p.region,r.id);assert.equal(p.schoolFurniture,r.schoolArt);assert.ok(p.y<r.y2);n++;}}assert.equal(n,12);}
});
test('school furniture lower-shelf lookup is cached per room, not filtered and sorted each frame',()=>{
 const render=fs.readFileSync(require.resolve('../js/app/render.js'),'utf8');
 const draw=render.match(/function drawSchoolFurniture\(room,V\)\{([\s\S]*?)\n  \}/);
 assert.ok(draw,'school furniture renderer exists');
 const helper=render.match(/const SCHOOL_FURNITURE_LOWER_CACHE = new WeakMap\(\);[\s\S]*?function schoolFurnitureLowerByPlatform\(room\)\{[\s\S]*?\n  \}/);
 assert.ok(helper,'per-room furniture lookup cache exists');
 assert.match(draw[1],/schoolFurnitureLowerByPlatform\(room\)/);
 assert.match(draw[1],/lowerByPlatform\.get\(p\)/);
 assert.doesNotMatch(draw[1],/\.filter\(|\.sort\(/);
 const lookupFor=require('node:vm').runInNewContext(`(()=>{${helper[0]};return schoolFurnitureLowerByPlatform})()`);
 const rooms=game().world.rooms.filter(r=>!r.secret);let previous=null;
 for(const room of rooms){const lookup=lookupFor(room);assert.strictEqual(lookupFor(room),lookup);if(previous)assert.notStrictEqual(lookup,previous);previous=lookup;
  for(const p of room.schoolFurniture){const expected=room.schoolFurniture.filter(q=>q.y>p.y+30&&Math.min(q.x2,p.x2)-Math.max(q.x1,p.x1)>(p.x2-p.x1)*.45).sort((a,b)=>a.y-b.y)[0]||null;assert.strictEqual(lookup.get(p),expected);}
 }
});
test('school discovery and recovered object survive retry; room objective is not duplicated',()=>{
 const G=game(),r=G.world.rooms[0],d=r.entry;place(G,d.x,d.y,d.plat);step(G,1,input({downPressed:true}));step(G,35);assert.equal(G.room.id,r.id);assert.ok(G.run.schoolRooms.has(r.id));
 const pk=G.world.pickups.find(p=>p.itemIndex===r.schoolObjective&&p.region===r.id&&p.type==='item');const pl=r.schoolFurniture.find(p=>pk.x>=p.x1&&pk.x<=p.x2&&Math.abs(pk.y-p.y+32)<2);place(G,pk.x,pl.y,pl);step(G,1);assert.ok(G.run.items.includes(r.schoolObjective));assert.equal(pk.got,true);
 // Activate mid checkpoint with normal movement collision before retry.
 const mid=G.world.midpoints.find(q=>q.scene===0);place(G,mid.x,mid.y,mid.plat);step(G,1);assert.equal(G.checkpoint.id,mid.id);G.retry();assert.equal(G.checkpoint.id,mid.id);assert.ok(G.run.schoolRooms.has(r.id));assert.deepEqual(G.run.items,[r.schoolObjective]);assert.equal(G.world.pickups.find(p=>p.itemIndex===r.schoolObjective&&p.type==='item').got,true);
});
test('school victory event includes next mission and school exploration statistics',()=>{
 const G=game(0,'normal',{startTramo:2}),W=G.world;W.foes.find(f=>f.id===W.schoolFinal.bossId).dead=true;G.run.schoolRooms.add(W.rooms[0].id);G.run.items.push(W.rooms[0].schoolObjective);place(G,(W.goal.x1+W.goal.x2)/2,W.street.y1,W.street);step(G,1);step(G,240);const e=G.drainEvents().find(e=>e.type==='victory');assert.equal(e.mission,0);assert.equal(e.nextMission,1);assert.equal(e.stars,2);assert.equal(e.summary.schoolRooms,1);assert.equal(e.summary.schoolTotalRooms,3);assert.ok(G.save.missions.guadalajara>=1);
});
test('other missions have no school furniture and their difficulty settings are untouched',()=>{for(const m of [1,2,3]){const G=game(m,'dificil');assert.equal(G.run.maxLives,2);assert.equal(G.world.platforms.filter(p=>p.schoolFurniture).length,0);}});
