/* ¡Se me fue el camión! — PROGRESO: banco de cristales, mejoras y calificación de misión (V58.8.27).
   Los cristales ya no son solo puntos: se depositan en el banco al llegar a cada parada (y al ganar) y se gastan en
   la TIENDA DE DOÑA TÓXICA en mejoras permanentes. Si Sofía cae antes de la parada, los cristales que traía desde la
   última se pierden: arriesgarse por los cristales tiene sentido.
   Cada misión terminada recibe una calificación S/A/B/C según sus contratos (misión y opcional de cada tramo), las
   vidas que quedaron y si hubo caídas; la mejor queda guardada y se ve en el menú.
   Lógica pura sobre el objeto de guardado (sin DOM). */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};

  /* Catálogo: costo por nivel (la longitud de `cost` es el nivel máximo). */
  const CATALOG = [
    { id: 'vida', name: 'CORAZÓN EXTRA', icon: '♥', cost: [300, 750], text: '+1 vida máxima en cada misión por nivel.' },
    { id: 'gatas', name: 'GATAS ENTRENADAS', icon: '🐾', cost: [200, 450], text: 'Luna y Morita se recuperan 1,5 s antes por nivel.' },
    { id: 'iman', name: 'IMÁN DE LA MOCHILA', icon: '✦', cost: [150, 350], text: 'El imán dura 4 s más por nivel y atrae desde más lejos.' },
    { id: 'escudo', name: 'ESCUDO DE SALIDA', icon: '◈', cost: [500], text: 'Empiezas cada misión (y cada reintento) con escudo.' },
    { id: 'moto', name: 'MOTO REFORZADA', icon: '🏍', cost: [300, 600], text: 'La Calzada: +1 de resistencia de la moto por nivel.' },
    { id: 'nitro', name: 'TANQUE DE NITRO', icon: '⚡', cost: [200], text: 'La Calzada: empiezas con 25 de nitro extra.' }
  ];
  const byId = Object.fromEntries(CATALOG.map((u) => [u.id, u]));

  const ensure = (save) => {
    if (!save.upgrades || typeof save.upgrades !== 'object') save.upgrades = {};
    if (!Number.isFinite(save.bank) || save.bank < 0) save.bank = 0;
    if (!save.ranks || typeof save.ranks !== 'object') save.ranks = {};
    return save;
  };
  const level = (save, id) => Math.max(0, Math.min(byId[id] ? byId[id].cost.length : 0, (save && save.upgrades && save.upgrades[id]) | 0));
  const nextCost = (save, id) => { const u = byId[id]; const l = level(save, id); return u && l < u.cost.length ? u.cost[l] : null; };
  function deposit(save, n) { ensure(save); n = Math.max(0, Math.floor(n || 0)); save.bank += n; return n; }
  /** Compra el siguiente nivel. Devuelve { ok, reason, level, bank }. */
  function buy(save, id) {
    ensure(save);
    const u = byId[id];
    if (!u) return { ok: false, reason: 'desconocida' };
    const cost = nextCost(save, id);
    if (cost == null) return { ok: false, reason: 'maxima', level: level(save, id), bank: save.bank };
    if (save.bank < cost) return { ok: false, reason: 'faltan', need: cost - save.bank, level: level(save, id), bank: save.bank };
    save.bank -= cost; save.upgrades[id] = level(save, id) + 1;
    return { ok: true, level: save.upgrades[id], bank: save.bank, cost };
  }
  /* Efectos (con el guardado de la partida). */
  const effects = (save) => ({
    lives: level(save, 'vida'),
    catsCooldown: (base) => Math.max(2.5, base - 1.5 * level(save, 'gatas')),
    magnetTime: (base) => base + 4 * level(save, 'iman'),
    magnetRadius: (base) => base + (level(save, 'iman') >= 2 ? 60 : 0),
    shield: level(save, 'escudo') > 0,
    chaseHp: level(save, 'moto'),
    chaseNitro: level(save, 'nitro') ? 25 : 0
  });

  /* Calificación. contracts: {total, main, bonus}; lives/maxLives; deaths. Sin contratos cuenta como cumplido. */
  const RANKS = ['C', 'B', 'A', 'S'];
  function rank(o) {
    const c = o.contracts && o.contracts.total ? o.contracts : { total: 1, main: 1, bonus: 0 };
    const pts = 55 * (c.main / c.total) + 25 * (c.bonus / c.total) + 12 * Math.max(0, Math.min(1, (o.lives || 0) / Math.max(1, o.maxLives || 1))) + (o.deaths ? 0 : 8);
    const r = pts >= 90 ? 'S' : pts >= 72 ? 'A' : pts >= 52 ? 'B' : 'C';
    return { rank: r, points: Math.round(pts) };
  }
  /** Guarda la mejor calificación de una misión; devuelve true si mejoró. */
  function recordRank(save, missionId, r) {
    ensure(save);
    const prev = save.ranks[missionId];
    if (prev && RANKS.indexOf(prev) >= RANKS.indexOf(r)) return false;
    save.ranks[missionId] = r; return true;
  }

  NS.Upgrades = { CATALOG, level, nextCost, deposit, buy, effects, rank, recordRank, ensure, RANKS };
})(typeof globalThis !== 'undefined' ? globalThis : window);
