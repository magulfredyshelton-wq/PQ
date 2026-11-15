import assert from "node:assert/strict";
import { test } from "node:test";
import { estadoVotacao, interpolar, lerCodigoPrivado } from "./partida-estado.js";

test("aceita o código privado completo e rejeita nicknames", () => {
  const convite = "1xvD1Iq_Neb-09XxXi1xvD1I";
  assert.deepEqual(lerCodigoPrivado("012345abcdef/" + convite), { codigo: "012345ABCDEF", convite });
  assert.throws(() => lerCodigoPrivado("@cosmos"));
  assert.throws(() => lerCodigoPrivado("012345abcdef/" + convite + "/extra"));
});

test("expõe espera e divergência apenas entre os jogadores ligados", () => {
  const ligados = [{ id: "a" }, { id: "b" }];
  assert.equal(estadoVotacao({ a: "segura" }, ligados), "aguarda");
  assert.equal(estadoVotacao({ a: "segura", b: "risco" }, ligados), "divergencia");
  assert.equal(estadoVotacao({ a: "segura", c: "risco" }, ligados), "aguarda");
});

test("interpola o avatar até à última posição sem ultrapassar o alvo", () => {
  assert.equal(interpolar(1, 5, 0), 1);
  assert.ok(interpolar(1, 5, 0.25) > 1 && interpolar(1, 5, 0.25) < 5);
  assert.ok(interpolar(5, 1, 0.25) > 1 && interpolar(5, 1, 0.25) < 5);
});
