/* ¡Se me fue el camión! — utilidades compartidas (sin DOM).
   Todos los módulos de js/core se registran en el espacio de nombres global CAMION
   para funcionar con <script> clásico (también desde file://) y con Node en las pruebas. */
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

  /** Generador congruencial lineal reproducible. Cada sector/tramo usa su propia semilla. */
  function makeRng(seed) {
    let s = (seed >>> 0) || 1;
    const r = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
    r.range = (a, b) => a + (b - a) * r();
    r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
    r.pick = (arr) => arr[Math.floor(r() * arr.length) % arr.length];
    r.chance = (p) => r() < p;
    r.state = () => s;
    return r;
  }

  /** Hash FNV-1a para derivar semillas estables a partir de identificadores. */
  function hashSeed(...parts) {
    let h = 2166136261;
    for (const p of parts) {
      const str = String(p);
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      h ^= 0x9e37;
    }
    return h >>> 0;
  }

  /** Rectángulo {x1,y1,x2,y2}. */
  const rect = (x1, y1, x2, y2) => ({ x1, y1, x2, y2 });
  const overlap = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

  /** Caja de un cuerpo con centro (x,y) y tamaño (w,h), escalable para hurtboxes. */
  function bodyRect(b, sx = 1, sy = 1, oy = 0) {
    const hw = b.w * 0.5 * sx, hh = b.h * 0.5 * sy;
    return { x1: b.x - hw, y1: b.y - hh + oy, x2: b.x + hw, y2: b.y + hh + oy };
  }

  /** Solapamiento horizontal entre un cuerpo y una plataforma usando un factor de ancho del pie. */
  function overlapsX(body, pl, footFactor) {
    const hw = body.w * footFactor;
    return body.x + hw > pl.x1 && body.x - hw < pl.x2;
  }

  NS.util = { clamp, lerp, sign, makeRng, hashSeed, rect, overlap, bodyRect, overlapsX };
})(typeof globalThis !== 'undefined' ? globalThis : window);
