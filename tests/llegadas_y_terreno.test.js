const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load, input } = require('./helpers');
const N = load();
require('../js/core/toxifamilia.js');
const root = path.join(__dirname, '..');
const M = N.TOXIFAMILIA;

for (const [missionIndex, mission] of N.LEVELS.MISSIONS.entries()) {
  for (const [sector, def] of mission.levels.entries()) {
    test(mission.id + ' / ' + def.id + ' · apoyo, distribución y hábitats', () => {
      for (const difficulty of ['facil','normal','dificil']) {
        const G = N.Game.createGame({});
        G.newRun({ mission: missionIndex, startTramo: sector, difficulty, seed: 821, practice: true });
        const W = G.world, scene = W.scenes[sector], cp = G.checkpoint, surface = cp.plat;
        assert.equal(G.P.ground, scene.startPlatform);
        assert.equal(G.P.y + G.P.h / 2, surface.y);
        assert.ok(cp.x >= surface.x1 && cp.x <= surface.x2);
        for (const cat of Object.values(G.companions.agents)) assert.ok(cat.x >= surface.x1 && cat.x <= surface.x2 && cat.y === cp.y);
        assert.ok(scene.exitPlatform.w >= G.P.w);
        assert.ok(scene.exitPlatform.y > cp.y);
        for (const p of scene.surfaces) {
          assert.ok([p.x1,p.x2,p.y].every(Number.isFinite));
          assert.ok(p.x2 > p.x1 && p.x1 >= W.bounds.x1 - 1 && p.x2 <= W.bounds.x2 + 1);
        }
        const foes = W.foes.filter(f => f.region === 'main' && f.scene === sector);
        assert.ok(foes.length > 0);
        for (const f of foes) {
          const type = N.Enemies.TYPES[f.kind];
          assert.ok(type && Number.isFinite(f.x) && Number.isFinite(f.y));
          if (type.walker) {
            assert.ok(f.plat && f.x >= f.minX && f.x <= f.maxX);
            assert.ok(Math.abs(f.plat.y - f.y) < .001);
          }
          if (f.waterZone) {
            assert.ok(f.x >= f.waterZone.x1 && f.x <= f.waterZone.x2);
            assert.ok(f.y >= f.waterZone.y && f.y <= f.waterZone.y2);
          }
          if (['pigeon','drone'].includes(f.kind) && !f.isBoss && Math.abs(f.y-cp.y) <= 138) {
            assert.ok(f.lane.x2 < cp.x - 105 || f.lane.x1 > cp.x + 105);
          }
          if (mission.id === 'parafalls') assert.ok(f.kind === 'guardian' && f.plat.guardianPost && !f.plat.start && !f.plat.exit);
        }
        for (let tick = 0; tick < 36; tick++) G.step(1/60,input());
        if(mission.id==='submarino'&&sector>0){assert.ok(G.P.water&&G.P.submerged);assert.equal(G.P.ground,null);}else assert.equal(G.P.ground,surface);
      }
    });
  }
}

test('cinco cinemáticas terminan en el checkpoint de su propia misión y usan archivos locales', () => {
  const sets=[M.SCENES,M.GDL_TRANSITION,M.MARINO,M.ESPACIO,M.PARAFALLS];
  for (const [i,set] of sets.entries()) {
    const scenes=M.validate(set);
    assert.equal(scenes.filter(s=>s.arrival!=null).length,1);
    assert.equal(scenes[scenes.length-1].arrival,i);
    for(const url of M.assetsOf(scenes)) assert.ok(fs.statSync(path.join(root,url)).isFile());
  }
  assert.equal(M.PARAFALLS.find(s=>s.id==='pf_portal').cast[1].frames.length,12);   // V58.8.28: hoja de transformación de 12 cuadros
});

test('Submarino empieza en seco, permite caminar al borde y equipa el buceo al entrar al mar', () => {
  const G=N.Game.createGame({});
  G.newRun({mission:2});
  const W=G.world, p=G.P, cp=G.checkpoint, z=W.waters.find(w=>w.sea);
  assert.ok(cp.plat.shore && !p.water && cp.plat.y < z.y);
  for(let n=0;n<120;n++)G.step(1/60,input());
  assert.equal(p.ground,cp.plat);assert.ok(!p.water);
  for(let n=0;n<300 && !p.submerged;n++)G.step(1/60,input({right:true,downHeld:true}));
  assert.equal(p.water,z);assert.ok(p.submerged);assert.ok(p.x > cp.plat.x2 - 12);
});

test('el guardián de bloques patrulla, avisa y solo causa contacto al cargar en su propia sala', () => {
  const plat={x1:0,x2:280,y:100}, W={solids:[],shots:[],foes:[]};
  const guard=N.Enemies.create('guardian',{x:120,y:100,plat,rng:()=>.6,region:'gruta'});
  W.foes.push(guard);guard.dir=1;guard.cool=0;
  const p=N.Physics.createPlayer(130,100);p.ground=plat;
  const states=new Set(), events=[], impacts=[];
  const body=()=>({x1:0,x2:280,y1:30,y2:100});
  const ctx={region:'main',active:()=>true,onScreen:()=>true,hurtbox:body,bodybox:body,hurt:()=>impacts.push(guard.state)};
  for(let n=0;n<60;n++)N.Enemies.update(W,p,1/60,ctx,events);
  assert.equal(guard.x,120);assert.equal(guard.state,'patrol');assert.equal(impacts.length,0);
  ctx.region='gruta';
  for(let n=0;n<240;n++){
    N.Enemies.update(W,p,1/60,ctx,events);states.add(guard.state);
    assert.ok(guard.x>=guard.minX && guard.x<=guard.maxX && guard.y===plat.y);
  }
  for(const s of ['windup','charge','dizzy','patrol'])assert.ok(states.has(s),s);
  assert.ok(events.findIndex(e=>e.type==='foeAlert')<events.findIndex(e=>e.type==='foeCharge'));
  assert.ok(impacts.length && impacts.every(s=>s==='charge'));
});

test('Parafalls sitúa la meta en la repisa circular y recupera una caída por debajo', () => {
  const G=N.Game.createGame({});G.newRun({mission:4,startTramo:2});
  const w=G.world,p=G.P,gate=w.portal;
  assert.equal(gate.plat,w.scenes[2].exitPlatform);assert.ok(w.goal.y2< w.street.y1);
  p.x=gate.x+120;p.y=w.street.y1-p.h/2;p.ground=w.street;p.vy=0;
  G.step(1/60,input());
  assert.equal(p.ground,gate.plat);assert.equal(G.state,'playing');
  for(let n=0;n<240 && G.state==='playing';n++)G.step(1/60,input({right:true}));
  assert.equal(G.state,'victory');
});
