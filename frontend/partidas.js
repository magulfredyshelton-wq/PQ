import { lerCodigoPrivado } from "./partida-estado.js";
import { abrirPartida, api, fases, voltarAoLogin } from "./api.js";

const $ = (id) => document.getElementById(id);
const dialogo = $("convites-dialogo");
const aviso = $("aviso-partidas");
const avisoConvites = $("aviso-convites");
const abrirConvites = $("abrir-convites");
const criar = $("criar-partida");
const CHAVE_ANTIGA = "astronautas.missao";
let ocupado = false;
let catalogo;
let anterior;

function el(tag, texto = "", classe = "") {
  const elemento = document.createElement(tag);
  elemento.textContent = texto;
  elemento.className = classe;
  return elemento;
}

function accao(botao, mensagem, tarefa) {
  return async (evento) => {
    evento.preventDefault();
    if (ocupado) return;
    ocupado = true;
    botao.disabled = true;
    mensagem.textContent = "";
    try {
      await tarefa();
    } catch (falha) {
      if (falha.status === 401) voltarAoLogin();
      else mensagem.textContent = falha.message;
    } finally {
      ocupado = false;
      botao.disabled = false;
    }
  };
}

function botao(texto, tarefa, classe = "", mensagem = aviso) {
  const elemento = el("button", texto, "botao " + classe);
  elemento.type = "button";
  elemento.addEventListener("click", accao(elemento, mensagem, tarefa));
  return elemento;
}

async function listarPartidas() {
  const partidas = await api("/partidas");
  const itens = partidas.map((jogo) => {
    const destino = catalogo.destinos[jogo.destino]?.nome ?? "Destino por escolher";
    const item = el("li");
    const descricao = el("div", "", "partida-descricao");
    const resultados = { missao_falhada: "Missão falhada", base_estabilizada: "Base estabilizada",
      retirada_segura: "Retirada em segurança" };
    const estado = resultados[jogo.desfecho] ?? fases[jogo.fase];
    descricao.append(el("strong", destino), el("span", estado + " · " + jogo.codigo));
    item.append(descricao, botao(jogo.desfecho ? "Consultar" : "Continuar", () => abrirPartida(jogo.codigo)));
    return item;
  });
  $("partidas-guardadas").replaceChildren(...itens);
  aviso.textContent = partidas.length ? "" : "Ainda não tens partidas guardadas.";
}

abrirConvites.addEventListener("click", async () => {
  try {
    const conta = await api("/conta");
    mostrarPerfil(conta);
    avisoConvites.textContent = conta.idade < 15 && !conta.consentimento
      ? "Pede primeiro autorização a um responsável." : "";
    dialogo.showModal();
  } catch (falha) {
    aviso.textContent = falha.message;
  }
});

const usar = $("usar-convite");
usar.addEventListener("submit", accao(usar.querySelector("button"), avisoConvites, async () => {
  await api("/convites/usar", lerCodigoPrivado($("codigo-convite").value));
  usar.reset();
  await listarPartidas();
  dialogo.close();
}));

const consentimento = $("pedir-consentimento");
consentimento.addEventListener("submit", accao(consentimento.querySelector("button"), $("aviso-consentimento"), async () => {
  const dados = await api("/conta/consentimento", { email: $("email-responsavel").value });
  consentimento.reset();
  $("aviso-consentimento").textContent = dados.modo_local
    ? "Pedido guardado em backend/emails_demo no servidor." : "Pedido enviado ao responsável.";
}));

criar.addEventListener("click", accao(criar, aviso, async () => {
  const jogo = await api("/partidas", {});
  abrirPartida(jogo.codigo);
}));

function mostrarPerfil(conta) {
  $("perfil-jogador").textContent = conta.nickname ? conta.nome + " · @" + conta.nickname : conta.nome;
  $("perfil-nickname").hidden = Boolean(conta.nickname);
  $("painel-consentimento").hidden = conta.idade >= 15 || conta.consentimento;
}

const formulario = $("definir-nickname");
formulario.addEventListener("submit", accao(formulario.querySelector("button"), $("aviso-nickname"), async () => {
  const conta = await api("/conta/nickname", { nickname: $("nickname-jogador").value });
  mostrarPerfil(conta);
}));

const sair = $("sair-conta");
sair.addEventListener("click", accao(sair, aviso, async () => {
  await api("/conta/sair", {});
  voltarAoLogin();
}));

const associar = $("associar-anterior");
associar.addEventListener("click", accao(associar, aviso, async () => {
  await api("/partidas/" + encodeURIComponent(anterior.codigo) + "/associar", { segredo: anterior.token });
  sessionStorage.removeItem(CHAVE_ANTIGA);
  associar.hidden = true;
  await listarPartidas();
}));

async function iniciar() {
  try {
    const conta = await api("/conta");
    mostrarPerfil(conta);
    sair.hidden = false;
    try { anterior = JSON.parse(sessionStorage.getItem(CHAVE_ANTIGA)); } catch {}
    associar.hidden = !anterior?.token || !anterior.codigo;
    catalogo = await api("/catalogo");
    await listarPartidas();
    const avisoPartida = sessionStorage.getItem("astro-aviso-partida");
    if (avisoPartida) {
      sessionStorage.removeItem("astro-aviso-partida");
      aviso.textContent = avisoPartida;
    }
    criar.disabled = false;
    abrirConvites.disabled = false;
    window.addEventListener("pageshow", (evento) => {
      if (evento.persisted) {
        listarPartidas().catch((falha) => {
          if (falha.status === 401) voltarAoLogin();
          else aviso.textContent = falha.message;
        });
        api("/conta").then(mostrarPerfil).catch(() => {});
      }
    });
  } catch (falha) {
    if (falha.status === 401) voltarAoLogin();
    else aviso.textContent = falha.message;
  }
}

iniciar();
