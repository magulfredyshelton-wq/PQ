import assert from "node:assert/strict";
import { test } from "node:test";
import { coordenadasNoGlobo, direccaoLua, passoLua, quadroLua, terrenoLunar } from "./lua.js";
import { mundo } from "./mundo.js";

const raio = 130;
const perto = (a, b, tolerancia = 1e-7) => assert.ok(Math.abs(a - b) < tolerancia, a + " ≠ " + b);

test("atravessa o meridiano e regressa ao ponto inicial após uma volta completa", () => {
  let pos = { x: 0, z: 0, giro: 0 };
  const distancia = 2 * Math.PI * raio / 1000;
  let passouMeridiano = false;
  for (let i = 0; i < 1000; i++) {
    const proxima = passoLua(pos.x, pos.z, distancia, 0, raio, pos.giro);
    passouMeridiano ||= proxima.x < pos.x;
    pos = proxima;
  }
  assert.ok(passouMeridiano);
  perto(pos.x, 0);
  perto(pos.z, 0);
});

test("passa pelo polo sem inverter a direcção de marcha", () => {
  const polo = Math.PI * raio / 2;
  const cruzou = passoLua(0, polo - 0.4, 0, 0.8, raio);
  perto(Math.abs(cruzou.x), Math.PI * raio);
  perto(cruzou.z, polo - 0.4);
  const continuou = passoLua(cruzou.x, cruzou.z, -Math.sin(cruzou.giro), Math.cos(cruzou.giro), raio, cruzou.giro);
  perto(continuou.z, polo - 1.4);
  const { cima } = quadroLua(continuou.x, continuou.z, raio);
  perto(Math.hypot(...cima), 1);
});

test("o globo apresenta o local exacto da nave e a distância segue a superfície", () => {
  const pouso = { x: -5, z: -12, lat: 46, lon: -78 };
  const actual = coordenadasNoGlobo(pouso.x, pouso.z, pouso, raio);
  perto(actual.lat, pouso.lat);
  perto(actual.lon, pouso.lon);
  perto(direccaoLua(0, 0, Math.PI * raio, 0, raio).distancia, Math.PI * raio);
  const terreno = terrenoLunar(raio);
  const rocha = terreno.rochas[0];
  assert.equal(terreno.bateRocha(rocha.x, rocha.z, 0), true);
  assert.equal(terreno.altura(0, 0), 0);
});

test("a seta aponta para a porta e o rádio só interage de dentro da sala", () => {
  Object.assign(mundo, {
    cena: "operacao", destino: "lua", pousou: true, nave: { x: 4, z: -12 },
    superficie: { raio_lua: 130, crateras: [], rochas: [], sitios: {} },
    salas: { radio: { x: 0, z: 4 } }, postoAlvo: "radio",
    postos: [{ id: "radio", sala: "radio", x: -0.9, z: 3, alcance: 1.72 }],
  });
  mundo.superficie.sitios = { amostra: [-16, -3], cratera: [-15, 8], baliza: [15, 3] };
  Object.assign(mundo.jogador, { x: -2.2, z: 3 });
  assert.equal(mundo.terminalProximo(), null);
  assert.equal(mundo.viaPara(mundo.postos[0]).z, 6.8);
  Object.assign(mundo.jogador, { x: 0, z: 4 });
  assert.equal(mundo.terminalProximo().id, "radio");
});

