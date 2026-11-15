import { coordenadasNoGlobo } from "./lua.js";
import { abrirGlobo } from "./globo.js";
import { celulaValida } from "./terreno.js";
import { aula, locais } from "./conceitos.js";
import { rotular } from "./icones.js";
import { estadoVotacao } from "./partida-estado.js";
import { mundo } from "./mundo.js";

import { api, fases, novaChave, voltarAoLogin } from "./api.js";
import { ligarConversa } from "./chat.js";
import { ligarVoz, narrarEstado, narrarProposta, narrarTerminal, ouvir, pararVoz } from "./voz.js";

const $ = (id) => document.getElementById(id);
const numero = new Intl.NumberFormat("pt");
const nomes = { energia:"Energia", agua:"Água", comida:"Comida", oxigenio:"Oxigénio",
  propulsante:"Propulsante", exposicao:"Exposição", margem:"Margem", mobilidade:"Mobilidade" };

let conversa;
let acesso = null;
let intervalo;
let catalogo, vista, assinatura, ultimoTerminal, ocupado = false, sincronizacao = null;
let ultimoConceito, chaveDesafio, aguardandoDesafio, ultimaFase, ultimoPouso, ultimoFeedback;
let fimCinematica = 0;
let temporizador;
let salaEscolhida;
let ocultarResultado;
const prefereReduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const estadoUI = $("partida-status");
const painel = $("painel-missao");
const dialogo = $("terminal-dialogo");
const conteudo = $("terminal-jogo");
const conviteDialogo = $("convite-hangar");

function el(tag, texto = "", classe = "") {
  const item = document.createElement(tag);
  item.textContent = texto;
  if (classe) item.className = classe;
  return item;
}

function botao(texto, aoClicar, classe = "", desactivado = false) {
  const item = el("button", texto, "botao " + classe);
  item.type = "button";
  item.disabled = desactivado;
  item.addEventListener("click", () => accao(aoClicar));
  return item;
}

function botaoIcone(icone, titulo, executar, classe = "", desactivado = false) {
  return rotular(botao(titulo, executar, classe, desactivado), icone, titulo);
}

function alternarPainel(aberto) {
  $("tarefa").hidden = !aberto;
  $("alternar-missao").setAttribute("aria-expanded", String(aberto));
}

function conceito(tema, indice, nivel) {
  const dados = aula(tema, indice, nivel);
  const chave = tema + ":" + indice;
  if (ultimoConceito === chave) return;
  ultimoConceito = chave;
  $("aula").hidden = false;
  $("alternar-aula").disabled = false;
  $("alternar-aula").setAttribute("aria-expanded", "true");
  $("aula-tipo").textContent = tema === "viagem" ? "Ciência em voo" : tema === "pouso" ? "Ciência do pouso" : "Ciência na superfície";
  $("aula-titulo").textContent = dados.titulo;
  $("aula-texto").textContent = dados.texto;
  narrarTerminal(dados.titulo + ". " + dados.texto);
}

function actualizarCena(estado, anterior) {
  const fase = estado.fase;
  const agora = performance.now();
  const transicaoVoo = anterior?.fase === "preparacao_na_terra" && fase === "viagem";
  const transicaoPouso = anterior && anterior.pouso === null && estado.pouso !== null && !estado.desfecho;
  if (transicaoVoo || transicaoPouso) {
    fimCinematica = agora + (prefereReduzido ? 250 : transicaoPouso ? 4000 : 2850);
    alternarPainel(false);
  }
  if (transicaoPouso || transicaoVoo) {
    mundo.jogador.giro = 0;
    const avatar = vista.jogadores.find((j) => j.id === vista.eu);
    mundo.jogador.x = avatar.x;
    mundo.jogador.z = avatar.z;
  }
  const feedback = estado.historico?.at(-1);
  if (anterior && feedback?.mensagem !== ultimoFeedback &&
      (anterior.recuperacao !== estado.recuperacao || anterior.desafio?.id !== estado.desafio?.id || estado.desfecho)) {
    mundo.instanteEfeito = agora;
    $("efeito-missao").dataset.tipo = estado.recuperacao || estado.desfecho === "missao_falhada" ? "risco" : "estavel";
    $("efeito-missao").classList.remove("mostrar");
    requestAnimationFrame(() => $("efeito-missao").classList.add("mostrar"));
  }
  ultimoFeedback = feedback?.mensagem;
  mundo.pouso = estado.pouso;
  mundo.pousou = estado.pouso !== null;
  mundo.alerta = Boolean(estado.desafio);
  mundo.progresso = Math.min(1, (estado.horas_rota || 0) / (estado.duracao_horas || 1));
  if (fase === "viagem") {
    const indice = mundo.progresso >= 0.65 ? 2 : mundo.progresso > 0.10 ? 1 : 0;
    conceito("viagem", indice, vista.nivel);
  } else if (fase === "aproximacao" && estado.pouso === null) {
    conceito("pouso", 0, vista.nivel);
  } else if (mundo.pousou) {
    conceito("superficie", fase === "operacao" ? 1 : 0, vista.nivel);
  }
  const chave = estado.desafio ? estado.desafio.id + ":" + estado.desafio.recuperacao : null;
  if (chave !== chaveDesafio || fase !== ultimaFase || estado.pouso !== ultimoPouso) {
    chaveDesafio = chave;
    ultimaFase = fase;
    ultimoPouso = estado.pouso;
    clearTimeout(temporizador);
    aguardandoDesafio = Boolean(chave) && !estado.desafio.recuperacao;
    alternarPainel(false);
    const atraso = Math.max(fimCinematica - agora, aguardandoDesafio ? (prefereReduzido ? 250 : 2350) : 0);
    temporizador = setTimeout(() => {
      aguardandoDesafio = false;
      renderPainel();
      if (estado.desafio || estado.desfecho || ["viagem", "aproximacao", "instalacao"].includes(fase)) {
        alternarPainel(true);
      }
    }, atraso);
  }
  rotular($("alternar-missao"), chave ? "alerta" : "rota", chave ? "Alerta · " + estado.desafio.titulo : "Objectivo da missão");
  $("alternar-missao").classList.toggle("alerta-activo", Boolean(chave));
  if (chave && (anterior?.desafio?.id !== estado.desafio.id || anterior?.desafio?.recuperacao !== estado.desafio.recuperacao)) {
    const posto = mundo.postos.find((item) => item.id === estado.desafio.posto);
    if (posto) narrarTerminal("Alerta. " + estado.desafio.titulo + ". Vai a " + posto.divisao + ". " + posto.nome + ".");
  }
}

function erro(mensagem = "") { $("aviso-missao").textContent = mensagem; }

async function accao(fn) {
  if (ocupado) return;
  ocupado = true;
  erro();
  try { await fn(); }
  catch (falha) {
    erro(falha.message);
    if (dialogo.open) {
      const aviso = el("p", falha.message, "erro-missao");
      aviso.id = "erro-terminal";
      aviso.setAttribute("role", "alert");
      conteudo.querySelector("#erro-terminal")?.remove();
      conteudo.prepend(aviso);
    }
    if (falha.status === 409 && acesso) await sincronizar();
    if (falha.status === 401) voltarAoLogin();
  } finally { ocupado = false; }
}

const partida = (sub = "") => "/partidas/" + encodeURIComponent(acesso.codigo) + sub;
async function comando(acao, valor = null, revisao = vista.revisao) {
  const codigo = acesso.codigo;
  const rota = partida("/comandos");
  const dados = { id: novaChave(),
    revisao, acao, valor };
  let confirmado;
  try { confirmado = await api(rota, dados); }
  catch (falha) {
    if (falha.status) throw falha;
    confirmado = await api(rota, dados);
  }
  if (acesso?.codigo === codigo) receber(confirmado);
}

function receber(nova) {
  if (acesso?.codigo !== nova.codigo || (vista && nova.revisao < vista.revisao)) return;
  const chave = nova.revisao + ":" + nova.jogadores.map((j) => [j.id, j.ligado, j.nickname].join(":")).join(",");
  const anterior = vista?.estado;
  vista = nova;
  mundo.cena = vista.estado.fase;
  document.body.classList.toggle("em-missao", mundo.cena !== "preparacao_na_terra");
  $("palco").dataset.cena = mundo.cena;
  mundo.destino = vista.estado.destino;
  mundo.salas = vista.estado.salas ?? {};
  mundo.postos = vista.estado.postos ?? [];
  mundo.postoAlvo = vista.estado.desafio?.posto ?? null;
  const efeito = vista.estado.feedback_posto;
  if (efeito && mundo.feedbackPosto?.revisao !== efeito.revisao) {
    mundo.feedbackPosto = { ...efeito, instante: anterior ? performance.now() : -Infinity };
    if (anterior) {
      const faixa = $("resultado-posto");
      faixa.textContent = efeito.mensagem;
      faixa.dataset.tipo = efeito.tipo;
      faixa.hidden = false;
      clearTimeout(ocultarResultado);
      ocultarResultado = setTimeout(() => { faixa.hidden = true; }, 5500);
      narrarTerminal(efeito.mensagem);
    }
  }
  mundo.nave = vista.estado.pouso_local ? vista.estado.nave_local : null;
  mundo.pressurizada = Boolean(vista.estado.pressurizada);
  mundo.tempestade = Boolean(vista.estado.tempestade);
  const avatar = nova.jogadores.find((j) => j.id === nova.eu);
  mundo.jogador.traje = avatar?.traje ?? true;
  if (avatar && !mundo.jogador.traje && !mundo.dentro()) {
    mundo.jogador.x = avatar.x;
    mundo.jogador.z = avatar.z;
  }
  $("mapa-planeta").hidden = !vista.estado.destino || (vista.estado.pouso === null && mundo.cena !== "aproximacao");
  mundo.tripulacao = vista.estado.tripulacao;
  const mudouZona = anterior && (anterior.pouso !== nova.estado.pouso ||
    anterior.fase === "preparacao_na_terra" && nova.estado.fase === "viagem");
  mundo.remotos = nova.jogadores.filter((j) => j.id !== nova.eu && j.ligado).map((j) => {
    const anterior = !mudouZona && mundo.remotos.find((remoto) => remoto.id === j.id);
    return { ...j, x: anterior?.x ?? j.x, z: anterior?.z ?? j.z, alvoX: j.x, alvoZ: j.z };
  });
  if (nova.conversa !== undefined) conversa?.receber(nova.conversa, nova.mensagens);
  if (chave !== assinatura) {
    assinatura = chave;
    if (!podeConvidar() && conviteDialogo.open) conviteDialogo.close();
    actualizarCena(vista.estado, anterior);
    renderPainel();
    if (!vista.estado.desafio && !["viagem", "aproximacao", "instalacao", "operacao"].includes(vista.estado.fase)) {
      narrarEstado(vista);
    }
    if (dialogo.open && ultimoTerminal) {
      const anteriorDesafio = anterior?.desafio;
      const novoDesafio = vista.estado.desafio;
      const mudouIncidente = anteriorDesafio?.posto !== novoDesafio?.posto ||
        anteriorDesafio?.recuperacao !== novoDesafio?.recuperacao ||
        anterior?.feedback_posto?.revisao !== vista.estado.feedback_posto?.revisao;
      if (mudouIncidente || !conteudo.querySelector("input:focus, textarea:focus")) renderTerminal(ultimoTerminal);
    }
  }
}

function sincronizar() {
  if (sincronizacao || !acesso) return sincronizacao;
  sincronizacao = enviarPresenca().finally(() => { sincronizacao = null; });
  return sincronizacao;
}

async function enviarPresenca() {
  const codigo = acesso.codigo;
  try {
    const nova = await api(partida("/presenca"), {
      x: mundo.jogador.x, z: mundo.jogador.z, pousou: mundo.pousou, mensagens_depois: conversa?.cursor(),
    });
    if (acesso?.codigo !== codigo) return;
    receber(nova);
    estadoUI.classList.add("ligado");
    estadoUI.textContent = "Partida " + codigo;
  } catch (falha) {
    if (acesso?.codigo !== codigo) return;
    estadoUI.classList.remove("ligado");
    estadoUI.textContent = "Ligação interrompida";
    if (falha.status === 401) voltarAoLogin();
    else if ([403, 404].includes(falha.status)) {
      sessionStorage.setItem("astro-aviso-partida", falha.message);
      location.replace("./partidas.html");
    }
  }
}

function podeConvidar() {
  return vista?.estado.fase === "preparacao_na_terra" && vista.anfitriao && vista.jogadores.length < 2;
}

function ligarConvites() {
  const formulario = $("enviar-convite");
  const aviso = $("aviso-convite");
  const enviar = formulario.querySelector("button");

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (enviar.disabled || !podeConvidar()) return;
    enviar.disabled = true;
    aviso.textContent = "";
    try {
      const dados = await api(partida("/convites"), {});
      $("codigo-gerado-rotulo").hidden = false;
      const campo = $("codigo-gerado");
      campo.value = acesso.codigo + "/" + dados.convite;
      campo.focus();
      campo.select();
      aviso.textContent = "Código pronto para partilhar.";
    } catch (falha) {
      if (falha.status === 401) voltarAoLogin();
      else aviso.textContent = falha.message;
    } finally {
      enviar.disabled = false;
    }
  });
}

async function sairPartida() {
  if (!acesso) return;
  const rota = partida("/ausente");
  acesso = null;
  clearInterval(intervalo);
  pararVoz();
  await sincronizacao;
  try {
    await api(rota, {});
  } finally {
    location.assign("./partidas.html");
  }
}

function duracao(horas) {
  if (horas < 24) return numero.format(horas) + " h";
  return Math.floor(horas / 24) + " d" + (horas % 24 ? " " + horas % 24 + " h" : "");
}

function mapas(alvo) {
  const conjunto = el("div", "", "mapas");
  for (const [id, perfil] of Object.entries(catalogo.destinos)) {
    const figura = el("figure", "", "mapa");
    const legenda = el("figcaption");
    legenda.append(el("strong", perfil.nome + " · " + duracao(perfil.horas)),
      el("p", perfil.rota), el("p", perfil.referencia));
    figura.append(legenda, botaoIcone("globo", "Ver o globo de " + perfil.nome, () => abrirGlobo(id, vista.nivel)),
      botao("Escolher " + perfil.nome,
      () => comando("destino", id), vista.estado.destino === id ? "primario" : "", !vista.anfitriao));
    conjunto.append(figura);
  }
  alvo.append(conjunto);
}

function manifesto(alvo) {
  const estado = vista.estado;
  if (!estado.destino) { alvo.append(el("p", "Escolhe primeiro Lua ou Marte.")); return; }
  const perfil = catalogo.destinos[estado.destino];
  const tabela = el("table", "", "manifesto");
  const cabecalho = tabela.createTHead().insertRow();
  for (const t of ["Recurso", "kg/un.", "L/un.", "Mín.", "Carga"]) cabecalho.append(el("th", t));
  const corpo = tabela.createTBody(), campos = new Map();
  for (const [id, item] of Object.entries(catalogo.carga)) {
    const linha = corpo.insertRow();
    for (const t of [item.nome, item.kg, item.litros, perfil.minimo[id] || 0]) linha.append(el("td", t));
    const campo = el("input", "", "campo");
    campo.type = "number"; campo.min = 0; campo.max = 10000; campo.step = 1;
    campo.value = estado.carga[id] || 0; campo.disabled = !vista.anfitriao;
    campo.setAttribute("aria-label", item.nome);
    campos.set(id, campo);
    linha.insertCell().append(campo);
  }
  const total = el("p");
  function ler() { return Object.fromEntries([...campos].map(([id, campo]) => [id, Number(campo.value)])); }
  function actualizar() {
    let kg = 0, litros = 0;
    for (const [id, q] of Object.entries(ler())) {
      kg += q * catalogo.carga[id].kg; litros += q * catalogo.carga[id].litros;
    }
    total.textContent = numero.format(kg) + " / " + perfil.limite_kg + " kg · " +
      numero.format(litros) + " / " + perfil.limite_l + " L";
    total.classList.toggle("erro-missao", kg > perfil.limite_kg || litros > perfil.limite_l);
  }
  tabela.addEventListener("input", actualizar);
  actualizar();
  alvo.append(el("p", perfil.nave + " · " + perfil.nome), tabela, total,
    el("p", "Mínimo de lançamento. Planeia água, oxigénio, energia e peças extra para avarias, respeitando os limites da nave."),
    botao("Guardar carga", () => comando("carga", ler()), "primario", !vista.anfitriao));
}

function mostrarEquipamento(posto, estado) {
  const d = estado.desafio;
  const activo = d?.posto === posto.id;
  const feedback = estado.feedback_posto?.posto === posto.id ? estado.feedback_posto : null;
  const visor = el("div", "", "visor-equipamento");
  visor.dataset.estado = activo ? "alerta" : "estavel";
  const estadoVisor = activo ? (d.recuperacao ? "Recuperação necessária" : "Anomalia detectada") : "Sistema disponível";
  visor.append(el("strong", estadoVisor), el("span", posto.teste));
  const sinais = el("span", "", "sinais-equipamento");
  sinais.dataset.modo = posto.tipo;
  sinais.setAttribute("aria-hidden", "true");
  for (const altura of [0.32, 0.53, 0.88, 0.46, 0.73, 0.38, 0.67, 0.97, 0.54, 0.62, 0.84, 0.40]) {
    const barra = el("i");
    barra.style.setProperty("--altura", String(altura));
    sinais.append(barra);
  }
  visor.append(sinais);
  if (feedback) {
    const leitura = el("p", feedback.mensagem, "leitura-equipamento");
    leitura.dataset.tipo = feedback.tipo;
    visor.append(leitura);
  }
  conteudo.append(visor);
  if (activo && d.diagnosticado) {
    mostrarDesafio(conteudo, d);
  } else {
    const botaoTeste = botao(activo ? "Executar diagnóstico" : "Testar equipamento", async () => {
      mundo.postoTeste = posto.id;
      visor.dataset.estado = "teste";
      visor.querySelector("strong").textContent = "A testar o equipamento…";
      try {
        await new Promise((resolve) => setTimeout(resolve, prefereReduzido ? 0 : 480));
        if (!dialogo.open || ultimoTerminal !== posto.id) return;
        if (activo) {
          await sincronizacao;
          await sincronizar();
          if (vista.estado.desafio?.posto === posto.id) await comando("diagnosticar", posto.id);
        } else {
          visor.dataset.estado = "teste";
          visor.querySelector("strong").textContent = "Teste concluído";
          visor.querySelector("span").textContent = posto.teste;
          narrarTerminal(posto.teste);
        }
      } finally {
        setTimeout(() => {
          if (mundo.postoTeste === posto.id) mundo.postoTeste = null;
        }, 520);
      }
    }, "primario");
    conteudo.append(botaoTeste);
  }
  if (posto.id === "navegador" && estado.fase === "viagem" && !d) {
    const piloto = vista.jogadores.find((j) => j.id === estado.piloto && j.ligado);
    if (!piloto) conteudo.append(botao("Assumir posto de pilotagem", () => comando("assumir_posto")));
    else if (piloto.id === vista.eu) {
      conteudo.append(el("p", "Ajuste actual · " + estado.ajuste_rota + " · 4 unidades de propulsante por manobra."),
        botao("Corrigir para a esquerda", () => comando("ajustar_rota", -1), "", estado.ajuste_rota <= -2),
        botao("Corrigir para a direita", () => comando("ajustar_rota", 1), "", estado.ajuste_rota >= 2),
        botao("Devolver ao modo automático", () => comando("libertar_posto")));
    } else conteudo.append(el("p", piloto.nome + " está a pilotar."));
  }
}

function renderTerminal(id) {
  conteudo.replaceChildren();
  if (!vista) { conteudo.append(el("p", "Cria uma partida para começar.")); return; }
  const e = vista.estado;
  const posto = mundo.postos.find((p) => p.id === id);
  if (posto) {
    mostrarEquipamento(posto, e);
    return;
  }
  if (locais.some((local) => local.id === id)) {
    const feito = e.descobertas?.includes(id);
    const disponivel = ["instalacao", "operacao"].includes(e.fase);
    conteudo.append(el("p", feito ? "Descoberta guardada no diário da equipa." :
      disponivel ? "Usa o scanner para registar este local." : "Podes observar este local."),
      botaoIcone("analisar", "Registar descoberta", async () => {
        await sincronizar();
        await comando("explorar", id);
        dialogo.close();
      }, "primario", feito || !disponivel));
    return;
  }
  if (e.fase !== "preparacao_na_terra") {
    conteudo.append(el("p", e.mensagem));
    return;
  }
  if (id === "navegacao") mapas(conteudo);
  else if (id === "armazem") manifesto(conteudo);
  else {
    const faltas = Object.entries(e.carga_resumo.faltas);
    conteudo.append(el("p", e.destino ? "Destino: " + catalogo.destinos[e.destino].nome : "Escolhe um destino."));
    for (const [k, q] of faltas) conteudo.append(el("p", "Falta " + q + " × " + catalogo.carga[k].nome));
    if (vista.jogadores.length > 1) {
      conteudo.append(el("p", e.prontos.length + " de " + vista.jogadores.length + " astronautas prontos."),
        botao("Confirmar prontidão", () => comando("pronto"), "", !e.destino || faltas.length > 0 || e.prontos.includes(vista.eu)));
    }
    conteudo.append(botao("Confirmar lançamento", async () => { await comando("lancar"); dialogo.close(); },
      "primario", !vista.anfitriao || !e.destino || faltas.length > 0 ||
      (vista.jogadores.length > 1 && vista.jogadores.some((j) => !j.ligado || !e.prontos.includes(j.id)))));
  }
}

function mostrarDesafio(alvo, d) {
  alvo.append(el("h2", (d.recuperacao ? "Recuperação · " : "") + d.titulo), el("p", d.sinal),
    botaoIcone("ouvir", "Ouvir desafio", () => ouvir(d.titulo + ". " + d.sinal)));
  const ligados = vista.jogadores.filter((jogador) => jogador.ligado);
  if (ligados.length > 1) {
    const votos = vista.estado.votos_desafio ?? {};
    const escolhas = ligados.filter((jogador) => votos[jogador.id]);
    if (!escolhas.length) {
      alvo.append(el("p", "Escolham a mesma resposta para aplicar a decisão."));
    } else {
      const lista = el("ul");
      for (const jogador of escolhas) {
        lista.append(el("li", jogador.nome + " escolheu: " + d.opcoes[votos[jogador.id]]));
      }
      const aviso = el("p", estadoVotacao(votos, ligados) === "divergencia"
        ? "As respostas são diferentes. Combinem uma decisão e voltem a escolher."
        : "Resposta registada. Aguarda a escolha do outro astronauta.");
      aviso.setAttribute("role", "status");
      alvo.append(aviso, lista);
    }
  }
  const opcoes = el("div", "", "escolhas");
  for (const id of d.ordem ?? Object.keys(d.opcoes)) {
    const escolha = botao(d.opcoes[id], () => responderNoPosto(id, d), "escolha-acao");
    escolha.insertAdjacentHTML("afterbegin", '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>');
    opcoes.append(escolha);
  }
  alvo.append(opcoes);
  if (d.modo === "resposta_aberta") {
    const consola = el("details", "", "comando-opcional");
    const plano = el("input", "", "campo");
    plano.maxLength = 500;
    plano.placeholder = "Descreve a acção que queres executar";
    plano.setAttribute("aria-label", "Manobra personalizada");
    const resultado = el("div");
    consola.append(el("summary", "Manobra personalizada"), plano,
      botaoIcone("analisar", "Interpretar manobra", async () => {
        await sincronizacao;
        await sincronizar();
        const revisao = vista.revisao;
        const dados = await api(partida("/interpretar"), { texto: plano.value, revisao });
        if (vista.revisao !== revisao) {
          resultado.replaceChildren(el("p", "A partida mudou. Volta a interpretar a manobra."));
          return;
        }
        resultado.replaceChildren(el("p", dados.opcao ? dados.rotulo : "Escolhe uma das acções apresentadas."));
        if (dados.opcao) {
          narrarProposta(dados.rotulo);
          resultado.append(botaoIcone("avancar", "Executar " + dados.rotulo,
            () => responderNoPosto(dados.opcao, d)));
        }
      }), resultado);
    alvo.append(consola);
  }
  if (d.recuperacao) alvo.append(el("p", "Adiamentos disponíveis: " + d.adiamentos_restantes));
  if (d.recuperacao && vista.anfitriao) alvo.append(botao("Retirada em segurança",
    async () => {
      await comando("retirada");
      dialogo.close();
    }, "secundario"));
}

async function responderNoPosto(opcao, d) {
  await sincronizacao;
  await sincronizar();
  const actual = vista.estado.desafio;
  if (actual?.id !== d.id || actual?.recuperacao !== d.recuperacao) return;
  await comando("responder", opcao);
}

function mostrarGlobo() {
  const e = vista.estado;
  const podeEscolher = e.fase === "aproximacao" && e.pouso === null && !e.desafio && vista.anfitriao;
  abrirGlobo(e.destino, vista.nivel, podeEscolher ? async (local) => {
    try {
      await comando("pousar", local);
    } catch (falha) {
      if (falha.status === 409) await sincronizar();
      if (falha.status === 401) voltarAoLogin();
      throw falha;
    }
  } : null, e.nave_local, mundo.raioLua() ? coordenadasNoGlobo(
    mundo.jogador.x, mundo.jogador.z, { ...e.nave_local, ...(mundo.nave ?? { x: 0, z: 0 }) }, mundo.raioLua(),
  ) : null);
}

function mostrarPlanta(alvo) {
  const config = mundo.superficie;
  const salas = mundo.salas;
  const disponiveis = Object.keys(config.salas).filter((id) => !salas[id]);
  if (!disponiveis.length) return;
  if (!disponiveis.includes(salaEscolhida)) [salaEscolhida] = disponiveis;
  const selector = el("select", "", "campo");
  selector.setAttribute("aria-label", "Sala a montar");
  for (const id of disponiveis) {
    const opcao = el("option", config.salas[id]);
    opcao.value = id;
    selector.append(opcao);
  }
  selector.value = salaEscolhida;
  selector.addEventListener("change", () => { salaEscolhida = selector.value; });
  const planta = el("div", "", "planta-base");
  for (const z of config.linhas) {
    for (const x of config.colunas) {
      const sala = Object.keys(salas).find((id) => salas[id].x === x && salas[id].z === z);
      const nave = !mundo.nave && x === 0 && z === 0;
      const disponivel = !nave && celulaValida(salas, x, z);
      const celula = botao(sala ? config.salas[sala] : nave ? "Nave" : disponivel ? "+" : "·",
        async () => {
          await comando("instalar", { sala: selector.value, x, z });
          const novoPainel = document.querySelector("#tarefa select");
          novoPainel?.focus({ preventScroll: true });
        }, "celula-base", !disponivel);
      celula.dataset.montada = String(Boolean(sala));
      celula.setAttribute("aria-label", (sala ? config.salas[sala] : nave ? "Nave" : "Célula") + " · " + x + ", " + z + " m");
      planta.append(celula);
    }
  }
  alvo.append(el("p", "Escolhe uma sala e o quadrado onde a queres montar. Liga as salas lado a lado. Cada quadrado mede 4 m."),
    selector, planta);
}

function renderPainel() {
  if (!vista) return;
  painel.hidden = false;
  const e = vista.estado;
  const tarefa = $("tarefa");
  tarefa.replaceChildren(el("h2", fases[e.fase]), el("p", e.mensagem));
  if (e.progresso_a_solo?.length) {
    const progresso = el("details");
    const registo = el("ol");
    for (const evento of e.progresso_a_solo.slice().reverse()) {
      registo.append(el("li", duracao(evento.horas) + " · " + evento.mensagem));
    }
    progresso.append(el("summary", "Progresso com um jogador desligado"), registo);
    tarefa.append(progresso);
  }
  if (e.destino) {
    const rota = el("div", "", "rota");
    const barra = el("progress");
    barra.max = e.duracao_horas || 1; barra.value = Math.min(e.horas_rota, barra.max);
    barra.setAttribute("aria-label", "Progresso da viagem");
    const trajectoria = el("div", "", "trajectoria");
    trajectoria.append(barra);
    const nave = el("span", "◆", "nave-rota");
    nave.setAttribute("aria-hidden", "true");
    nave.style.left = (100 * barra.value / barra.max) + "%";
    nave.style.marginTop = (e.ajuste_rota * 3) + "px";
    trajectoria.append(nave);
    rota.append(el("span", "Terra"), trajectoria, el("span", catalogo.destinos[e.destino].nome));
    tarefa.append(rota, el("p", duracao(e.horas_rota) + " / " + duracao(e.duracao_horas) + " de trajecto · " + duracao(e.horas) + " de missão"));
  }
  if (e.avisos_seguranca?.length) {
    const avisos = el("ul", "", "avisos-seguranca");
    avisos.setAttribute("aria-label", "Avisos de segurança da missão");
    avisos.append(...e.avisos_seguranca.map((aviso) => el("li", aviso)));
    tarefa.append(avisos);
  }
  if (vista.nivel !== "cadete" && e.fase !== "preparacao_na_terra") {
    const dados = el("div", "", "grelha-dados");
    for (const [id, valor] of Object.entries(e.recursos)) {
      const bloco = el("div", nomes[id] || id, "dado");
      bloco.append(el("strong", numero.format(valor)));
      dados.append(bloco);
    }
    tarefa.append(dados);
  }
  const piloto = vista.jogadores.find((j) => j.id === e.piloto && j.ligado);
  if (piloto && !e.desafio) tarefa.append(el("p", piloto.nome + " controla a nave. O modo automático permite avançar."));
  const emTransicao = performance.now() < fimCinematica;
  if (emTransicao && !e.desfecho) {
    tarefa.append(el("p", "Acompanha a manobra."));
  } else if (e.desafio && aguardandoDesafio) {
    tarefa.append(el("p", "Alerta recebido. Segue o marcador até ao equipamento."));
  } else if (e.desafio) {
    const posto = mundo.postos.find((p) => p.id === e.desafio.posto);
    if (posto) {
      tarefa.append(el("h2", e.desafio.titulo), el("p", e.desafio.sinal),
        el("p", posto.divisao + " · " + posto.nome, "alvo-missao"),
        el("p", "Segue o marcador e usa o equipamento para diagnosticar e agir."));
    }
  }
  else if (e.fase === "viagem" || e.fase === "operacao") {
    const texto = e.fase === "viagem" ? "Avançar no trajecto" : "Continuar operações";
    tarefa.append(botaoIcone("avancar", e.votos.includes(vista.eu) ? "Confirmar avanço" : texto,
      () => comando("avancar"), "primario", Boolean(piloto) || emTransicao));
  } else if (e.fase === "aproximacao") {
    tarefa.append(botaoIcone("globo", vista.anfitriao ? "Seleccionar ponto de pouso" : "Consultar o globo", mostrarGlobo, "primario"),
      el("p", vista.anfitriao ? "Abre o globo e marca o ponto de pouso." : "O anfitrião escolhe o ponto de pouso."));
  } else if (e.fase === "instalacao") {
    if (!e.descarregada) {
      tarefa.append(botao("Descarregar e conferir os módulos", () => comando("descarregar"), "primario"));
    } else {
      mostrarPlanta(tarefa);
    }
  }
  if (e.desfecho) {
    const titulos = { base_estabilizada: "Base estabilizada", retirada_segura: "Retirada em segurança",
      missao_falhada: "Missão falhada" };
    tarefa.append(el("h2", titulos[e.desfecho]));
    const relatorio = e.relatorio;
    if (relatorio?.pontos != null) {
      const d = relatorio.decisoes;
      tarefa.append(el("p", relatorio.pontos + " / 100 pontos · " + relatorio.estrelas + " / 3 estrelas"),
        el("p", d.seguras + " decisões seguras · " + d.riscos + " arriscadas · " + d.recuperadas + " recuperações · " + d.adiamentos + " adiamentos"));
    }
    tarefa.append(botao("Ver as minhas partidas", sairPartida));
  }
  if (e.descobertas?.length) {
    const nomesLocais = locais.filter((local) => e.descobertas.includes(local.id)).map((local) => local.nome);
    tarefa.append(el("p", "Descobertas da equipa · " + nomesLocais.join(", ")));
  }
  if (e.historico.length) {
    const registo = el("details");
    const lista = el("ol");
    e.historico.slice(-7).reverse().forEach((item) => lista.append(el("li", duracao(item.horas) + " · " + item.mensagem + (item.a_solo ? " · a solo" : ""))));
    registo.append(el("summary", "Diário de bordo"), lista); tarefa.append(registo);
  }

  const equipa = $("equipa");
  equipa.replaceChildren();
  const lista = el("ul", "", "lista-tripulacao");
  for (const j of vista.jogadores) {
    const nome = j.nickname ? "@" + j.nickname : j.nome;
    lista.append(el("li", nome + (j.id === vista.eu ? " · tu" : "") + (j.ligado ? "" : " · desligado")));
  }
  for (const npc of e.tripulacao) {
    const li = el("li", npc.nome + " ");
    li.append(el("span", "· " + npc.emocao.toLowerCase()), el("p", npc.fala));
    li.title = npc.papel;
    li.append(botaoIcone("ouvir", "Ouvir " + npc.nome, () => ouvir(npc.fala, npc.id)));
    lista.append(li);
  }
  equipa.append(lista);
  if (vista.jogadores.length > 1) {
    equipa.append(botao("Denunciar colega", async () => {
      await api(partida("/denunciar"), { motivo: "conduta" });
      erro("Denúncia registada para revisão.");
    }), botao("Bloquear colega", async () => {
      if (!confirm("Bloquear a conversa com este colega?")) return;
      await api(partida("/bloquear"), {});
      conversa?.receber("desligada");
      erro("Conversa bloqueada.");
    }));
  }
  if (podeConvidar()) {
    equipa.append(botao("Convidar astronauta", () => {
      $("aviso-convite").textContent = "";
      conviteDialogo.showModal();
    }));
  }
}

export function abrirTerminalMissao(id) {
  ultimoTerminal = id;
  renderTerminal(id);
  const terminal = [...mundo.terminais, ...locais].find((item) => item.id === id);
  if (terminal) narrarTerminal(terminal.nome + ". " + terminal.descricao);
  const posto = mundo.postos.find((item) => item.id === id);
  if (posto) narrarTerminal(posto.nome + ". " + posto.teste);
}

$("mapa-planeta").addEventListener("click", () => accao(mostrarGlobo));
$("traje").addEventListener("click", () => accao(async () => {
  if (!mundo.naSuperficie()) return;
  const vestir = !mundo.jogador.traje;
  if (!vestir && (!mundo.pressurizada || !mundo.dentro())) {
    throw new Error("Entra numa sala pressurizada para retirar o traje.");
  }
  if (!vestir) {
    await sincronizacao;
    await sincronizar();
  }
  await comando("traje", vestir);
}));
$("alternar-missao").addEventListener("click", () => alternarPainel($("tarefa").hidden));
$("abrir-equipa").addEventListener("click", () => {
  if (vista) $("equipa-dialogo").showModal();
});
$("fechar-equipa").addEventListener("click", () => $("equipa-dialogo").close());
$("alternar-aula").addEventListener("click", () => {
  $("aula").hidden = !$("aula").hidden;
  $("alternar-aula").setAttribute("aria-expanded", String(!$("aula").hidden));
});
$("aula-ouvir").addEventListener("click", () => ouvir($("aula-titulo").textContent + ". " + $("aula-texto").textContent));

export async function iniciarMissao() {
  const codigo = new URLSearchParams(location.search).get("partida")?.toUpperCase();
  if (!codigo || !/^[A-F0-9]{12}$/.test(codigo)) {
    location.replace("./partidas.html");
    return false;
  }

  try {
    const [estado, dadosCatalogo] = await Promise.all([
      api("/partidas/" + encodeURIComponent(codigo)), api("/catalogo")
    ]);
    catalogo = dadosCatalogo;
    mundo.superficie = catalogo.superficie;
    acesso = { codigo, jogador: estado.eu };
    const avatar = estado.jogadores.find((jogador) => jogador.id === estado.eu);
    if (avatar) {
      mundo.jogador.x = avatar.x;
      mundo.jogador.z = avatar.z;
    }
    ligarVoz($("voz"), () => vista);
    ligarConvites();
    conversa = ligarConversa(partida(), estado.eu, dadosCatalogo.frases);
    receber(estado);
    $("jogo").hidden = false;
    estadoUI.classList.add("ligado");
    estadoUI.textContent = "Partida " + codigo;
    $("ver-partidas").addEventListener("click", (evento) => {
      if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
      evento.preventDefault();
      sairPartida().catch(() => {});
    });
    intervalo = setInterval(() => {
      if (!document.hidden) sincronizar();
    }, 2500);
    return true;
  } catch (falha) {
    if (falha.status === 401) voltarAoLogin();
    else if ([403, 404].includes(falha.status)) {
      sessionStorage.setItem("astro-aviso-partida", falha.message);
      location.replace("./partidas.html");
    }
    else {
      estadoUI.textContent = "Ligação interrompida";
      erro(falha.message);
      $("jogo").hidden = false;
      $("palco").hidden = true;
    }
    return false;
  }
}
