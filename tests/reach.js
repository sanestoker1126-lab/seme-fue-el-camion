// Analizador de alcanzabilidad: construye un grafo de superficies simulando, con la física REAL del juego,
// saltos, caídas, BAJAR y dashes desde cada superficie. Así se comprueba el diseño de niveles sin suposiciones.
const { load } = require('./helpers');
const NS = load();

const NONE = { left: false, right: false, jumpPressed: false, jumpHeld: false, dashPressed: false, downPressed: false };

/* V52 · Agua profunda: cada zona es un nodo (Sofía flota en su superficie). Llegar al agua no cuenta como caída. */
function waterNodes(W) {
  if (!W.__waterNodes) {
    W.__waterNodes = (W.waters || []).filter((z) => z.deep).map((z) => ({ kind: 'water', water: z, id: z.id, x1: z.x1, x2: z.x2, y: z.y }));
  }
  return W.__waterNodes;
}
const nodeOfWater = (W, z) => waterNodes(W).find((n) => n.water === z) || null;

function standable(W) {
  const nodes = W.platforms.slice();
  nodes.push(...waterNodes(W));
  for (const s of W.solids) {
    if (s.kind === 'wall' || s.kind === 'gate') continue;
    if (s.kind === 'roomwall' && !W.rooms.some((r) => Math.abs(r.y2 - s.y1) < 0.5 && s.x1 < r.x1 && s.x2 > r.x2)) continue;
    nodes.push(s);
  }
  return nodes;
}
const topY = (n) => (n.solid ? n.y1 : n.y);

function subWorld(W, A) {
  const y = topY(A), x1 = A.x1 - 900, x2 = A.x2 + 900;
  return {
    // Ventana amplia hacia arriba: un toldo rebotador lanza a Nina más de 300 u y los techos deben existir en la simulación.
    platforms: W.platforms.filter((p) => p.y > y - 700 && p.y < y + 1400 && p.x2 > x1 && p.x1 < x2),
    solids: W.solids.filter((s) => s.kind === 'wall' || (s.y2 > y - 720 && s.y1 < y + 1400 && s.x2 > x1 && s.x1 < x2)),
    hazards: W.hazards.filter((h) => h.type === 'puddle'),
    waters: W.waters || [],
    t: 0
  };
}

/* V51 · Sonda de cristales: anota qué cristales toca Sofía durante cada simulación y al caminar sobre cada
   superficie, con la misma regla de recogida que game.js (distancia < 29 desde un punto algo bajo el centro). */
const GEM_REACH = 29;
function makeGemProbe(W) {
  const CELL = 64, cells = new Map(), touched = new Map();
  const key = (cx, cy) => (cx + 4000) * 100000 + (cy + 4000);
  const gems = W.pickups.filter((g) => g.type === 'gem');
  for (const g of gems) {
    const k = key(Math.floor(g.x / CELL), Math.floor(g.y / CELL));
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(g);
  }
  const mark = (g, A) => { let set = touched.get(g); if (!set) touched.set(g, (set = new Set())); set.add(A); };
  return {
    gems, touched,
    visit(P, A) {
      const px = P.x, py = P.y + P.h * 0.12, cx = Math.floor(px / CELL), cy = Math.floor(py / CELL);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const list = cells.get(key(cx + i, cy + j));
        if (list) for (const g of list) if (Math.hypot(px - g.x, py - g.y) < GEM_REACH) mark(g, A);
      }
    },
    stand(A) { // caminando por la superficie (de borde a borde) sin saltar
      if (A.kind === 'water') return;
      const pc = NS.CONFIG.player, py = topY(A) - pc.h / 2 + pc.h * 0.12;
      for (const g of gems) {
        if (Math.abs(g.y - py) >= GEM_REACH) continue;
        const dx = g.x < A.x1 ? A.x1 - g.x : g.x > A.x2 ? g.x - A.x2 : 0;
        if (Math.hypot(dx, g.y - py) < GEM_REACH) mark(g, A);
      }
    }
  };
}

function simulate(W, sub, A, x, vx, policy, probe) {
  const isW = A.kind === 'water', PCh = NS.CONFIG.player.h;
  const P = NS.Physics.createPlayer(x, isW ? NS.Physics.floatYOf(A.water, { h: PCh }) + PCh / 2 : topY(A));
  P.ground = isW ? null : A; P.vx = vx; P.face = Math.sign(vx) || 1;
  let leftWater = false, waterResult = false;
  const crates = sub.solids.filter((s) => s.breakable);
  // Tejas flojas: cada simulación empieza con todas sólidas (el estado no se arrastra entre intentos).
  const crumbles = sub.platforms.filter((p) => p.kind === 'crumble');
  const resetCrumbles = () => { for (const c of crumbles) { c.crState = 'solid'; c.crT = 0; c.gone = false; } };
  resetCrumbles();
  let airborne = false, minFoot = topY(A), steps = 0, result = null, dashed = false, apexSeen = false, airSteps = 0;
  for (; steps < 260; steps++) {
    sub.t += 1 / 60;
    NS.Physics.updatePlatforms(sub, sub.t);
    const inp = Object.assign({}, NONE, policy(steps, P, { airborne, airSteps, apexSeen, dashed }));
    if (inp.dashPressed) dashed = true;
    const prevGround = P.ground;
    NS.Physics.stepPlayer(P, sub, inp, 1 / 60, []);
    if (probe) probe.visit(P, A);
    const foot = P.y + P.h / 2;
    minFoot = Math.min(minFoot, foot);
    if (isW) {
      if (!P.water) leftWater = true;
      else if (leftWater && P.water === A.water) break;          // salió y volvió a caer en la misma agua
    }
    if (P.water && P.waterT > 0.25 && (!isW || P.water !== A.water)) { result = nodeOfWater(W, P.water); waterResult = true; break; }
    if (!P.ground) { airborne = true; airSteps++; if (P.vy >= 0) apexSeen = true; }
    if (P.ground && P.ground !== A && P.ground !== prevGround) { result = P.ground; break; }
    if (P.ground === A && airborne) break;
    if (foot > topY(A) + 1500) break;
  }
  for (const c of crates) c.broken = false;
  resetCrumbles();
  if (!result) return null;
  return { to: result, fall: waterResult ? 0 : topY(result) - minFoot };
}

function policiesFor(A) {
  const out = [];
  const w = A.x2 - A.x1;
  if (A.kind === 'water') {
    // Desde el agua: nadar hasta cada orilla, salir saltando, saltar repetido junto al borde y bucear.
    const n = Math.max(2, Math.min(6, Math.round(w / 50)));
    for (let k = 0; k < n; k++) {
      const st = { x: A.x1 + 18 + (w - 36) * (k / (n - 1)), vx: 0 };
      for (const d of [-1, 1]) {
        out.push([st, () => ({ left: d < 0, right: d > 0 })]);
        out.push([st, (i) => ({ left: d < 0, right: d > 0, jumpPressed: i === 1, jumpHeld: true })]);
        out.push([st, (i) => ({ left: d < 0, right: d > 0, jumpPressed: i % 24 === 12, jumpHeld: true })]);
        out.push([st, (i) => ({ left: d < 0, right: d > 0, downHeld: i < 50 })]);
      }
      out.push([st, (i) => ({ jumpPressed: i === 1, jumpHeld: true })]);
      out.push([st, (i) => ({ downHeld: i < 70 })]);
    }
    return out;
  }
  for (const d of [-1, 1]) {
    const edge = d < 0 ? A.x1 : A.x2, x = edge - d * Math.min(20, w / 2);
    const run = { x, vx: d * NS.CONFIG.phys.move };
    out.push([run, (i, P, s) => ({ left: d < 0, right: d > 0 })]);
    out.push([run, (i, P, s) => (s.airborne ? {} : { left: d < 0, right: d > 0 })]);
    out.push([run, (i, P, s) => (s.airborne ? { left: d > 0, right: d < 0 } : { left: d < 0, right: d > 0 })]);
    out.push([run, (i, P, s) => ({ left: d < 0, right: d > 0, jumpPressed: i === 1, jumpHeld: true })]);
    out.push([run, (i, P, s) => ({ left: d < 0 && !s.apexSeen, right: d > 0 && !s.apexSeen, jumpPressed: i === 1, jumpHeld: true })]);
    out.push([run, (i, P, s) => ({ left: d < 0, right: d > 0, jumpPressed: i === 1, jumpHeld: true, dashPressed: s.apexSeen && !s.dashed })]);
    out.push([run, (i, P, s) => ({ left: d < 0, right: d > 0, dashPressed: s.airSteps === 10 && !s.dashed })]);
  }
  const n = Math.max(1, Math.min(6, Math.round(w / 55)));
  for (let k = 0; k < n; k++) {
    const x = A.x1 + (w * (k + 0.5)) / n;
    const st = { x, vx: 0 };
    for (const d of [-1, 1]) {
      out.push([st, (i, P, s) => ({ jumpPressed: i === 0, jumpHeld: true, left: d < 0 && i > 12, right: d > 0 && i > 12 })]);
      out.push([st, (i, P, s) => ({ jumpPressed: i === 0, jumpHeld: true, left: d < 0, right: d > 0 })]);
      out.push([st, (i, P, s) => ({ jumpPressed: i === 0, jumpHeld: true, left: d < 0, right: d > 0, dashPressed: s.apexSeen && !s.dashed })]);
    }
    if (A.drop) {
      for (const d of [-1, 0, 1]) out.push([st, (i, P, s) => ({ downPressed: i === 1, left: d < 0 && i > 2, right: d > 0 && i > 2 })]);
    }
  }
  return out;
}

/** Grafo de transiciones. `gatesOpen` abre las rejas indicadas para el análisis. */
function buildGraph(W, gatesOpen = new Set(), probe = null) {
  for (const g of W.gates) g.open = gatesOpen.has(g.id);
  const nodes = standable(W);
  const edges = new Map(nodes.map((n) => [n, []]));
  for (const A of nodes) {
    if (A.kind === 'wall') continue;
    const sub = subWorld(W, A);
    const seen = new Map();
    for (const [st, pol] of policiesFor(A)) {
      const r = simulate(W, sub, A, st.x, st.vx, pol, probe);
      if (!r || !edges.has(r.to)) continue;
      const prev = seen.get(r.to);
      if (prev === undefined || r.fall < prev) seen.set(r.to, r.fall);
    }
    for (const [to, fall] of seen) edges.get(A).push({ to, fall });
    if (probe) probe.stand(A);
  }
  // Puertas: de la plataforma de la trampilla a la zona inferior y de la salida al destino.
  const nodeAt = (x, y) => nodes.find((n) => Math.abs(topY(n) - y) < 1 && x >= n.x1 - 1 && x <= n.x2 + 1);
  for (const d of W.doors) {
    const from = d.plat || nodeAt(d.x, d.y), to = nodeAt(d.to.x, d.to.y);
    if (from && to) edges.get(from).push({ to, fall: 0, door: d.id });
  }
  for (const g of W.gates) g.open = false;
  return { nodes, edges, nodeAt };
}

function bfs(graph, starts, maxFall = Infinity) {
  const seen = new Set(starts);
  const q = starts.slice();
  while (q.length) {
    const a = q.shift();
    for (const e of graph.edges.get(a) || []) {
      if (e.fall >= maxFall || seen.has(e.to)) continue;
      seen.add(e.to); q.push(e.to);
    }
  }
  return seen;
}

function supportOf(nodes, x, y) {
  let best = null;
  for (const n of nodes) {
    const t = topY(n);
    if (x >= n.x1 - 12 && x <= n.x2 + 12 && t - y > 0 && t - y <= 90 && (!best || t < topY(best))) best = n;
  }
  return best;
}

/** Analiza un mundo: devuelve un informe con todas las comprobaciones de diseño. */
function analyze(W, { safeFall, gems } = {}) {
  safeFall = safeFall || NS.CONFIG.difficulty[W.difficulty].fallDamage;
  const t0 = Date.now();
  // Pasada 1: rejas cerradas. Las llaves alcanzables abren sus rejas; pasada 2 con esas rejas abiertas.
  const probe = gems ? makeGemProbe(W) : null;
  let graph = buildGraph(W, new Set(), probe);
  const start = W.checkpoints[0].plat;
  let reach = bfs(graph, [start], safeFall);
  const keyFor = (pk) => pk.keyFor;
  const openable = new Set(W.pickups.filter((p) => p.type === 'key' && reach.has(supportOf(graph.nodes, p.x, p.y))).map(keyFor));
  if (openable.size) { graph = buildGraph(W, openable, probe); reach = bfs(graph, [start], safeFall); }
  const street = W.street;
  const report = { ms: 0, nodes: graph.nodes.length, edges: 0, problems: [], checks: {} };
  for (const list of graph.edges.values()) report.edges += list.length;
  report.checks.goalFromStart = reach.has(street);
  if (!reach.has(street)) report.problems.push('La calle de la terminal no es alcanzable sin caídas dañinas desde el inicio');
  report.checks.checkpoints = W.checkpoints.map((cp) => bfs(graph, [cp.plat], safeFall).has(street));
  report.checks.checkpoints.forEach((ok, i) => { if (!ok) report.problems.push(`Desde la parada del tramo ${i + 1} no se llega a la meta sin daño`); });
  const pk = (type) => W.pickups.filter((p) => p.type === type);
  const unreachable = (list) => list.filter((p) => !reach.has(supportOf(graph.nodes, p.x, p.y)));
  const items = unreachable(pk('item')), keys = unreachable(pk('key'));
  const hearts = unreachable(pk('power').filter((p) => p.inAlcove));
  report.checks.items = pk('item').length - items.length;
  report.checks.keys = pk('key').length - keys.length;
  report.checks.alcoves = pk('power').filter((p) => p.inAlcove).length - hearts.length;
  items.forEach((p) => report.problems.push('Objeto inalcanzable: ' + p.itemId));
  keys.forEach((p) => report.problems.push('Llave inalcanzable: ' + p.keyFor));
  hearts.forEach((p) => report.problems.push('Nicho con reja inalcanzable: ' + p.id));
  // Sin trampas: desde todo lo alcanzable (aceptando daño) se puede volver a llegar a la meta.
  const all = bfs(graph, [start]);
  const reverse = new Map(graph.nodes.map((n) => [n, []]));
  for (const [a, list] of graph.edges) for (const e of list) reverse.get(e.to).push(a);
  const canFinish = new Set([street]);
  const q = [street];
  while (q.length) { const b = q.shift(); for (const a of reverse.get(b)) if (!canFinish.has(a)) { canFinish.add(a); q.push(a); } }
  const traps = [...all].filter((n) => !canFinish.has(n));
  report.checks.reachableSurfaces = all.size;
  report.checks.traps = traps.map((n) => n.id);
  traps.forEach((n) => report.problems.push('Trampa sin salida: ' + n.id + ' (y=' + topY(n).toFixed(0) + ')'));
  if (probe) {
    const ok = (set) => (g) => { const t = probe.touched.get(g); return !!t && [...t].some((n) => set.has(n)); };
    const missing = probe.gems.filter((g) => !ok(all)(g));
    report.checks.gems = { total: probe.gems.length, safe: probe.gems.filter(ok(reach)).length, any: probe.gems.length - missing.length, missing: missing.map((g) => g.id) };
    missing.forEach((g) => report.problems.push(`Cristal inalcanzable: ${g.id} (x=${g.x.toFixed(0)}, y=${g.y.toFixed(0)})`));
  }
  report.checks.rooms = W.rooms.map((r) => all.has(graph.nodeAt(r.entry.to.x, r.entry.to.y)));
  report.checks.rooms.forEach((ok, i) => { if (!ok) report.problems.push(`Zona inferior ${i + 1} inaccesible`); });
  report.ms = Date.now() - t0;
  return report;
}

module.exports = { analyze, buildGraph, bfs, supportOf, waterNodes };

if (require.main === module) {
  const diff = process.argv[2] || 'normal';
  const W = NS.World.buildWorld({ difficulty: diff });
  const r = analyze(W);
  console.log(JSON.stringify({ difficulty: diff, ms: r.ms, nodes: r.nodes, edges: r.edges, checks: Object.assign({}, r.checks, { traps: r.checks.traps.length }), problems: r.problems }, null, 1));
}
