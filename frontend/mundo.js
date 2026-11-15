import { passoLua, direccaoLua, terrenoLunar } from "./lua.js";
import { locais } from "./conceitos.js";
import { alturaTerreno, paredesDaBase, salaEm, toqueCirculo } from "./terreno.js";

export const mundo = (() => {
  const limite = { x: 10.4, z: 6.8 };
  const jogador = { x: 0, z: 4.6, raio: 0.42, velocidade: 4.9, rumo: 0, passo: 0, traje: true, giro: 0 };
  const anguloCamera = 0.31;
  const terminais = [
    {
      id: "navegacao", nome: "Navegação", x: -7.3, z: -3.9, cor: "#5EE1E7",
      resumo: "Destino e trajectória",
      descricao: "Compara as rotas e escolhe o destino da missão.",
      detalhes: ["Lua: rota cislunar.", "Marte: rota interplanetária."]
    },
    {
      id: "armazem", nome: "Armazém", x: 7.2, z: -3.8, cor: "#F8AD73",
      resumo: "Mantimentos e equipamento",
      descricao: "Prepara a carga que a tripulação vai usar em viagem e na superfície.",
      detalhes: ["Reservas: água, comida e oxigénio.", "Equipamento: ferramentas, peças e módulos da base."]
    },
    {
      id: "controlo", nome: "Controlo", x: 7.0, z: 4.0, cor: "#B5A3FA",
      resumo: "Revisão da partida",
      descricao: "Revê o plano da missão antes de confirmar o lançamento.",
      detalhes: ["Destino e nave escolhidos.", "Mantimentos, material e espaço disponível."]
    }
  ];

  const obstaculos = [
    { x: 0, z: -0.6, meiaX: 2.3, meiaZ: 3.0 },
    { x: -7.7, z: 3.3, meiaX: 1.3, meiaZ: 1.0 },
    { x: -3.8, z: -5.4, meiaX: 1.1, meiaZ: 0.64 },
    { x: 3.8, z: -5.4, meiaX: 1.1, meiaZ: 0.64 },
    ...terminais.map(({ x, z }) => ({ x, z, meiaX: 0.95, meiaZ: 0.57 }))
  ];

  const obstaculosSuperficie = [
    { x: 0, z: 0, meiaX: 0.95, meiaZ: 1 },
    { x: -7, z: 3.1, meiaX: 0.88, meiaZ: 0.58 },
    { x: 6.4, z: -3.1, meiaX: 0.35, meiaZ: 0.34 },
  ];

  function naSuperficie() {
    return ["aproximacao", "instalacao", "operacao", "concluida", "retirada"].includes(mundo.cena) && mundo.pousou;
  }

  function raioLua() {
    return mundo.destino === "lua" && mundo.pousou ? mundo.superficie?.raio_lua ?? 0 : 0;
  }

  let relevo;
  function geologia() {
    const raio = raioLua();
    if (!raio) return null;
    relevo ??= terrenoLunar(raio);
    return relevo;
  }

  function altura(x, z) {
    const local = mundo.nave || raioLua() ? alturaTerreno(x, z, mundo.superficie.crateras) : 0;
    return local + (geologia()?.altura(x, z) ?? 0);
  }

  function direccao(x, z, alvoX, alvoZ) {
    const raio = raioLua();
    return raio ? direccaoLua(x, z, alvoX, alvoZ, raio)
      : { dx: alvoX - x, dz: alvoZ - z, distancia: Math.hypot(alvoX - x, alvoZ - z) };
  }

  function dentro(x = jogador.x, z = jogador.z) {
    return salaEm(mundo.salas, x, z);
  }

  function locaisDaSuperficie() {
    if (!mundo.nave && !raioLua()) return locais;
    return locais.map((local) => {
      const [x, z] = mundo.superficie.sitios[local.id];
      return { ...local, x, z };
    });
  }

  let salasAnteriores;
  let paredes = [];
  function bloqueado(x, z) {
    const raio = jogador.raio;
    const superficie = naSuperficie();
    const raioPlaneta = raioLua();
    const cabine = !mundo.pousou && ["viagem", "aproximacao"].includes(mundo.cena);
    const [lx, lz] = cabine ? [7.2, 5.3] : superficie ? mundo.superficie?.limites ?? [24, 18] : [limite.x, limite.z];
    if (!raioPlaneta && (Math.abs(x) > lx - raio || Math.abs(z) > lz - raio)) return true;
    if (!superficie && !cabine) return obstaculos.some((objecto) => toqueCirculo(x, z, raio, objecto));
    if (mundo.postos.some((p) => toqueCirculo(x, z, raio, { ...p, meiaX: p.tipo === "rover" ? 0.64 : 0.31, meiaZ: p.tipo === "rover" ? 0.66 : 0.29 }))) return true;
    if (cabine) return false;
    if (!jogador.traje && !dentro(x, z)) return true;
    if (geologia()?.bateRocha(x, z, raio)) return true;
    if (salasAnteriores !== mundo.salas) {
      salasAnteriores = mundo.salas;
      paredes = paredesDaBase(mundo.salas);
    }
    if (paredes.some((parede) => toqueCirculo(x, z, raio, parede))) return true;
    if (!mundo.nave && !raioPlaneta) return obstaculosSuperficie.some((objecto) => toqueCirculo(x, z, raio, objecto));
    const { x: nx, z: nz } = mundo.nave ?? { x: 0, z: 0 };
    if (toqueCirculo(x, z, raio, { x: nx, z: nz, meiaX: 1.05, meiaZ: 0.85 })) return true;
    return mundo.superficie.rochas.some(([rx, rz, rr]) => Math.hypot(x - rx, z - rz) < rr + raio);
  }

  function mover(eixoX, eixoZ, segundos) {
    const magnitude = Math.hypot(eixoX, eixoZ);
    if (magnitude < 0.025) {
      jogador.passo = 0;
      return false;
    }
    const escala = Math.min(1, magnitude) / magnitude;
    const raio = raioLua();
    const angulo = anguloCamera - (raio ? jogador.giro : 0);
    const cos = Math.cos(angulo), sin = Math.sin(angulo);
    const dx = (eixoX * cos + eixoZ * sin) * escala;
    const dz = (-eixoX * sin + eixoZ * cos) * escala;
    const anteriorX = jogador.x, anteriorZ = jogador.z;
    const frente = raio ? passoLua(anteriorX, anteriorZ, dx * 0.65, dz * 0.65, raio)
      : { x: anteriorX + dx * 0.65, z: anteriorZ + dz * 0.65 };
    const desnivel = Math.abs(altura(frente.x, frente.z) - altura(anteriorX, anteriorZ));
    const vento = mundo.tempestade && !dentro() ? 0.53 : 1;
    const velocidade = raio && !dentro() && Math.hypot(anteriorX, anteriorZ) > 40 ? 6.8 : jogador.velocidade;
    const distancia = velocidade * Math.min(Math.max(segundos, 0), 0.033) * vento / (1 + desnivel * 2.4);
    const moverPasso = (px, pz) => {
      const proximo = raio ? passoLua(jogador.x, jogador.z, px, pz, raio, jogador.giro)
        : { x: jogador.x + px, z: jogador.z + pz, giro: 0 };
      if (bloqueado(proximo.x, proximo.z)) return false;
      Object.assign(jogador, proximo);
      return true;
    };

    const giroAnterior = jogador.giro;
    if (!moverPasso(dx * distancia, dz * distancia)) {
      moverPasso(dx * distancia, 0);
      moverPasso(0, dz * distancia);
    }
    const andou = jogador.x !== anteriorX || jogador.z !== anteriorZ;
    if (andou) jogador.rumo = Math.atan2(dx, dz) - (jogador.giro - giroAnterior);
    jogador.passo = andou ? jogador.passo + segundos * 10 : 0;
    return andou;
  }

  function alvosActivos() {
    if (naSuperficie()) return [...mundo.postos, ...locaisDaSuperficie()];
    return mundo.cena === "preparacao_na_terra" ? terminais : mundo.postos;
  }

  function viaPara(posto) {
    const salas = mundo.salas;
    const inicio = dentro() ?? null;
    const destino = salas[posto.sala] ? posto.sala : null;
    if (inicio === destino) return posto;
    const portas = Object.entries(salas)
      .filter(([, p]) => !Object.values(salas).some((s) => s.x === p.x && s.z === p.z + 4))
      .map(([id, p]) => ({ id, x: p.x, z: p.z + 2.8 }));
    if (!portas.length) return posto;
    const salaEntrada = portas.reduce((a, b) => {
      const distancia = (p) => direccao(jogador.x, jogador.z, p.x, p.z).distancia +
        direccao(p.x, p.z, posto.x, posto.z).distancia;
      return distancia(a) < distancia(b) ? a : b;
    });
    if (!inicio) {
      return direccao(jogador.x, jogador.z, salaEntrada.x, salaEntrada.z).distancia > 0.68
        ? salaEntrada : { x: salaEntrada.x, z: salaEntrada.z - 2 };
    }
    const objectivo = destino ?? salaEntrada.id;
    if (inicio === objectivo) return salaEntrada;
    const visitar = [[inicio, null]];
    const vistas = new Set([inicio]);
    for (const [id, primeiro] of visitar) {
      const p = salas[id];
      for (const [vizinha, q] of Object.entries(salas)) {
        if (vistas.has(vizinha) || Math.abs(q.x - p.x) + Math.abs(q.z - p.z) !== 4) continue;
        const proximo = primeiro ?? q;
        if (vizinha === objectivo) return proximo;
        vistas.add(vizinha);
        visitar.push([vizinha, proximo]);
      }
    }
    return posto;
  }

  function terminalProximo() {
    let proximo = null;
    let distancia = Infinity;
    for (const terminal of alvosActivos()) {
      const medida = direccao(jogador.x, jogador.z, terminal.x, terminal.z).distancia;
      if (medida > (terminal.alcance ? terminal.alcance - 0.04 : 2.25)) continue;
      if (mundo.salas[terminal.sala] && dentro() !== terminal.sala) continue;
      if (terminal.id === mundo.postoAlvo) return terminal;
      if (medida < distancia) {
        proximo = terminal;
        distancia = medida;
      }
    }
    return proximo;
  }

  return { jogador, terminais, cena: "preparacao_na_terra", destino: null, pouso: null, pousou: false, progresso: 0, remotos: [], montados: [], tripulacao: [], obstaculos, anguloCamera, mover, bloqueado, terminalProximo, naSuperficie, altura, dentro, locaisDaSuperficie,
    superficie: null, nave: null, salas: {}, pressurizada: false, tempestade: false,
    postos: [], postoAlvo: null, alvosActivos, raioLua, geologia, direccao, viaPara };
})();
