import assert from "node:assert/strict";
import { test } from "node:test";
import { mundo } from "./mundo.js";
import { alturaTerreno, celulaValida, custoPouso, paredesDaBase, toqueCirculo } from "./terreno.js";

test("a cratera tem uma depressão transitável e uma borda elevada", () => {
  const crateras = [[0, 0, 3.2, 1.25]];
  assert.equal(alturaTerreno(0, 0, crateras), -1.25);
  assert.ok(alturaTerreno(1.6, 0, crateras) > -1.25);
  assert.ok(alturaTerreno(3.4, 0, crateras) > 0);
  assert.equal(alturaTerreno(4.1, 0, crateras), 0);
});

test("a porta fica livre e a parede desaparece entre salas vizinhas", () => {
  const salas = { radio: { x: 0, z: 0 }, energia: { x: 4, z: 0 } };
  const paredes = paredesDaBase(salas);
  const bate = (x, z) => paredes.some((parede) => toqueCirculo(x, z, 0.42, parede));
  assert.equal(bate(0, 2), false);
  assert.equal(bate(1.6, 2), true);
  assert.equal(bate(2, 0), false);
  assert.equal(bate(0, -2), true);
  assert.equal(celulaValida(salas, 8, 0), true);
  assert.equal(celulaValida(salas, 4, 0), false);
  assert.equal(celulaValida(salas, 8, 4), false);
  assert.equal(custoPouso(-52, 1), 18);
});

test("rochas bloqueiam, o traje abre a saída e a tempestade abranda o astronauta", () => {
  Object.assign(mundo, {
    cena: "operacao", pousou: true, nave: { x: -2, z: -12 },
    salas: { habitat: { x: 0, z: 0 } },
    superficie: { limites: [24, 18], crateras: [], rochas: [[-7, 2, 0.8]] },
  });
  Object.assign(mundo.jogador, { x: 0, z: 1.9, traje: false });
  assert.equal(mundo.bloqueado(0, 2.1), true);
  mundo.jogador.traje = true;
  assert.equal(mundo.bloqueado(0, 2.1), false);
  assert.equal(mundo.bloqueado(-7, 2), true);
  assert.equal(mundo.bloqueado(24, 1), true);
  function distancia(vento) {
    Object.assign(mundo.jogador, { x: 0, z: 4 });
    mundo.tempestade = vento;
    mundo.mover(1, 0, 0.033);
    return Math.hypot(mundo.jogador.x, mundo.jogador.z - 4);
  }
  assert.ok(distancia(true) < distancia(false));
});

