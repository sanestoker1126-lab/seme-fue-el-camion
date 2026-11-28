// Regresiones de resultado para mundos que no contienen objetos de mochila.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, input } = require('./helpers');
const NS = load();

test('final neutral: un total de cero no equivale a mochila completa', () => {
  const ending = NS.STORY.ending(0, 0, 3);
  assert.equal(ending.title, '¡MISIÓN<br><span>COMPLETADA!</span>');
  assert.match(ending.text, /se buscan en la historia principal/i);
  assert.match(NS.STORY.ending(6, 6, 3).title, /CON TODO/);
});

test('resultados: las misiones sin objetos no ganan estrellas por comparar cero con cero', () => {
  const emptyMissions = [];
  NS.LEVELS.MISSIONS.forEach((mission, index) => {
    const G = NS.Game.createGame({});
    G.setView(390, 844);
    G.newRun({ mission: index, difficulty: 'normal', seed: 7800 + index });
    if (G.world.totalItems !== 0) return;

    emptyMissions.push(mission.id);
    G.drainEvents();
    G.state = 'victory';
    G.timers.victory = 2.39;
    G.step(1 / 60, input());
    const victory = G.drainEvents().find((event) => event.type === 'victory');
    assert.ok(victory, `${mission.id}: se emitió el resultado de victoria`);
    assert.equal(victory.summary.totalItems, 0, `${mission.id}: no tiene objetivos de mochila`);
    assert.equal(victory.stars, 1, `${mission.id}: solo recibe la estrella de completar la ruta`);
    assert.equal(victory.ending.title, '¡MISIÓN<br><span>COMPLETADA!</span>');
  });
  assert.equal(emptyMissions.length, 3, 'submarino, espacial y Parafalls se mantienen sin coleccionables de mochila');
});
