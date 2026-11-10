/* LA TOXIFAMILIA — manifiesto narrativo del modo historia.
   IMPORTANTE: el PDF de WPS no expone su contenido en el enlace compartido.
   No se inventan episodios ni diálogos: SCENES permanece vacio hasta obtener el guion.
   Cada escena usa: id, tag, title, text, background, durationMs, cast[].
   cast: [{name, sprite, x (0-100), bottom (0-100), scale, entrance}].
   La ultima escena puede indicar nextMission: {mission, tramo}.
*/
(function (root) {
  'use strict';
  const NS = root.CAMION = root.CAMION || {};
  const SCENES = [];
  const SOURCE = Object.freeze({
    title: 'La Toxifamilia: Historia Completa',
    document: 'La_Toxifamilia_Historia_Completa.pdf',
    url: 'https://us.wps.com/cms/docs/d/cbQa2t5UwooBsaYA',
    status: 'pending_pdf_text',
    adapted: false
  });
  const assetPattern = /^assets\/[a-zA-Z0-9_./-]+\.(png|webp|jpg|jpeg|svg)$/;
  function validAsset(path) {
    return typeof path === 'string' && assetPattern.test(path) &&
      !path.split('/').includes('..');
  }
  function validate(scenes) {
    if (!Array.isArray(scenes)) throw new TypeError('scenes debe ser un arreglo');
    const ids = new Set();
    return scenes.map((s, i) => {
      if (!s || typeof s !== 'object' || Array.isArray(s)) throw new TypeError('escena invalida: ' + i);
      if (typeof s.id !== 'string' || !/^[a-z0-9_-]+$/i.test(s.id) || ids.has(s.id)) throw new Error('id repetido o invalido: ' + i);
      ids.add(s.id);
      if (typeof s.title !== 'string' || !s.title.trim() || typeof s.text !== 'string') throw new Error('titulo/texto invalido: ' + s.id);
      if (s.background != null && !validAsset(s.background)) throw new Error('fondo invalido: ' + s.id);
      const durationMs = s.durationMs == null ? 6500 : Number(s.durationMs);
      if (!Number.isFinite(durationMs) || durationMs < 2000 || durationMs > 60000) throw new Error('duracion invalida: ' + s.id);
      const cast = s.cast == null ? [] : s.cast;
      if (!Array.isArray(cast) || cast.length > 12) throw new Error('reparto invalido: ' + s.id);
      cast.forEach((a) => {
        if (!a || typeof a.name !== 'string' || !a.name.trim()) throw new Error('actor sin nombre: ' + s.id);
        if (a.sprite != null && !validAsset(a.sprite)) throw new Error('sprite invalido: ' + a.name);
        for (const k of ['x', 'bottom', 'scale']) {
          if (a[k] != null && !Number.isFinite(Number(a[k]))) throw new Error('coordenada invalida: ' + a.name);
        }
      });
      if (s.nextMission != null &&
          (!Number.isInteger(s.nextMission.mission) || !Number.isInteger(s.nextMission.tramo) ||
           s.nextMission.mission < 0 || s.nextMission.tramo < 0)) throw new Error('mision invalida: ' + s.id);
      return Object.freeze(Object.assign({}, s, { durationMs, cast: cast.map(a => Object.freeze(Object.assign({}, a))) }));
    });
  }
  NS.TOXIFAMILIA = { SOURCE, SCENES, validate, validAsset, get ready() { return SCENES.length > 0; } };
})(typeof globalThis !== 'undefined' ? globalThis : window);
