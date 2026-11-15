import { passoLua } from "./lua.js";
import { interpolar } from "./partida-estado.js";
import { mundo } from "./mundo.js";
import { Cena3D } from "./cena-3d.js";
import { abrirTerminalMissao, iniciarMissao } from "./missao.js";
import { animarTerminal, criarJoystick, criarSom } from "./adaptadores.js";
import { rotular } from "./icones.js";

const $ = (id) => document.getElementById(id);
const canvas = $("hangar");
const dialogo = $("terminal-dialogo");
const interagir = $("interagir");
const erro = $("erro");
const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const som = criarSom({
  ambiente: new URL("./assets/ambiente.wav", import.meta.url),
  passo: new URL("./assets/passo.wav", import.meta.url),
  terminal: new URL("./assets/terminal.wav", import.meta.url),
});

for (const [id, icone, titulo] of [
  ["ver-cabine", "rota", "Entrar na cabine"], ["mapa-planeta", "globo", "Globo do destino"], ["traje", "escudo", "Traje espacial"], ["globo-fechar", "fechar", "Fechar globo"],
  ["alternar-aula", "livro", "Ciência de bordo"], ["abrir-equipa", "equipa", "Tripulação"], ["abrir-chat", "chat", "Conversa"],
  ["voz", "som", "Activar narração"], ["som", "som", "Activar som ambiente"],
  ["expandir", "expandir", "Alternar ecrã inteiro"], ["ver-partidas", "sair", "As minhas partidas"],
  ["alternar-missao", "rota", "Objectivo da missão"], ["aula-ouvir", "ouvir", "Ouvir conceito"],
  ["fechar-equipa", "fechar", "Fechar tripulação"], ["fechar", "fechar", "Fechar terminal"],
  ["interagir", "analisar", "Interagir · E"], ["saltar", "avancar", "Saltar · Espaço"],
]) rotular($(id), icone, titulo);

$("som").addEventListener("click", () => {
  const activo = som.alternar();
  $("som").setAttribute("aria-pressed", String(activo));
  rotular($("som"), activo ? "ouvir" : "som", activo ? "Silenciar som ambiente" : "Activar som ambiente");
});
$("expandir").hidden = !document.fullscreenEnabled;
$("expandir").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    $("aviso-missao").textContent = "O navegador bloqueou o modo de ecrã inteiro.";
  }
});

const sinais = new Map();
function marcadorPara(alvo) {
  if (!sinais.has(alvo.id)) {
    const marcador = document.createElement("span");
    marcador.className = "marcador";
    $("marcadores").append(marcador);
    sinais.set(alvo.id, marcador);
  }
  return sinais.get(alvo.id);
}

const direccoes = new Map([
  ["KeyW", [0, -1]], ["ArrowUp", [0, -1]], ["KeyS", [0, 1]], ["ArrowDown", [0, 1]],
  ["KeyA", [-1, 0]], ["ArrowLeft", [-1, 0]], ["KeyD", [1, 0]], ["ArrowRight", [1, 0]],
]);

function iniciarCena() {
  const cena = new Cena3D(canvas, mundo);
  const teclas = new Set();
  let movimento;
  let ultimo = performance.now();
  let perto;
  let ultimoPasso = 0;
  let saltoDesde = null;
  let progresso = mundo.progresso || 0;
  let pouso = null;
  let lancamento = null;
  let ultimoLocal;
  let ultimaCena;
  let faseAnterior;
  let prefereCabine = false;
  let alertaAnterior = false;
  let emMovimento = true;
  let estadoTraje;
  let ultimoAlerta;
  const joystick = criarJoystick($("joystick"), $("alavanca"), (valor) => { movimento = valor; });
  const estadoModal = () => Boolean(document.querySelector("dialog[open]"));

  function parar() {
    teclas.clear();
    joystick.parar();
  }

  function accaoLocal() {
    if (!perto || estadoModal() || !emMovimento) return;
    parar();
    $("terminal-cor").style.setProperty("--cor", perto.cor ?? "#93e6fc");
    $("terminal-titulo").textContent = perto.nome;
    $("terminal-descricao").textContent = perto.descricao ?? perto.divisao;
    $("terminal-detalhes").replaceChildren(...(perto.detalhes ?? []).map((detalhe) => {
      const linha = document.createElement("li");
      linha.textContent = detalhe;
      return linha;
    }));
    abrirTerminalMissao(perto.id);
    dialogo.showModal();
    animarTerminal(dialogo);
    som.tocar("terminal");
  }

  function saltar() {
    if ($("saltar").hidden || saltoDesde !== null || estadoModal()) return;
    saltoDesde = performance.now();
  }

  $("ver-cabine").addEventListener("click", () => {
    prefereCabine = !prefereCabine;
  });

  function desenhar(agora) {
    const dt = Math.min((agora - ultimo) / 1000, 0.05);
    ultimo = agora;
    const fase = mundo.cena;
    const emSolo = mundo.naSuperficie();
    if (faseAnterior === "preparacao_na_terra" && fase === "viagem" && !reduzido) lancamento = agora;
    if (mundo.pouso !== null && ultimoLocal === null && faseAnterior === "aproximacao" && fase !== "concluida") {
      pouso = agora;
      if (!reduzido) som.tocar("terminal");
    }
    ultimoLocal = mundo.pouso;
    const transicao = pouso === null ? 1 : Math.min(1, (agora - pouso) / (reduzido ? 220 : 3900));
    const aterrando = transicao < 1;
    const subida = lancamento === null ? 1 : Math.min(1, (agora - lancamento) / 2550);
    const decolando = subida < 1;
    const emVoo = ["viagem", "aproximacao"].includes(fase) && mundo.pouso === null;
    const alertaCabine = Boolean(mundo.postoAlvo && emVoo);
    const efeitoCabine = emVoo && mundo.feedbackPosto && agora - mundo.feedbackPosto.instante < 5000;
    const usaCabine = emVoo && (alertaCabine || prefereCabine || efeitoCabine || (ultimaCena === "cabine" && dialogo.open));
    const modo = decolando ? "lancamento" : aterrando ? "pouso" : emSolo ? "superficie"
      : fase === "preparacao_na_terra" ? "hangar" : usaCabine ? "cabine" : "voo";
    const verCabine = $("ver-cabine");
    verCabine.hidden = !emVoo || decolando;
    verCabine.disabled = alertaCabine || Boolean(efeitoCabine);
    if (ultimaCena !== modo || alertaAnterior !== alertaCabine) {
      rotular(verCabine, "rota", alertaCabine ? "A tripulação está a responder ao alerta"
        : modo === "cabine" ? "Ver a nave de fora" : "Entrar na cabine");
      verCabine.setAttribute("aria-pressed", String(modo === "cabine"));
    }
    alertaAnterior = alertaCabine;
    if (faseAnterior !== fase || ultimaCena !== modo) {
      const destino = mundo.destino === "marte" ? "Marte" : "Lua";
      $("cena-titulo").textContent = modo === "cabine" ? "Cabine · A caminho de " + destino
        : { preparacao_na_terra: "Hangar da Terra", viagem: "Em viagem para " + destino,
          aproximacao: "Aproximação · " + destino, instalacao: "Superfície · " + destino,
          operacao: "Base · " + destino, concluida: "Fim da missão", retirada: "Retirada em segurança" }[fase] ?? "Pequenos Astronautas";
      faseAnterior = fase;
      ultimaCena = modo;
    }
    document.body.dataset.modo = aterrando ? "pouso" : modo;
    emMovimento = (modo === "hangar" || modo === "cabine" || emSolo) && !aterrando;
    $("joystick").hidden = !emMovimento;
    const sala = emSolo && mundo.dentro();
    $("saltar").hidden = !emSolo || aterrando || Boolean(sala);
    if (sala) saltoDesde = null;
    $("traje").hidden = !emSolo || aterrando;
    const vestido = mundo.jogador.traje;
    if (estadoTraje !== vestido) {
      estadoTraje = vestido;
      $("traje").setAttribute("aria-pressed", String(vestido));
      rotular($("traje"), "escudo", vestido ? "Retirar o traje na base" : "Vestir o traje espacial");
    }
    const ambiente = $("ambiente-superficie");
    ambiente.hidden = !emSolo || aterrando;
    ambiente.classList.toggle("tempestade", mundo.tempestade && !sala);
    const aviso = sala ? (mundo.pressurizada ? "Base pressurizada" : "Base sem pressão")
      : mundo.tempestade ? "Alerta · Tempestade de poeira" : "Exterior · Área de exploração 48 × 36 m";
    const leitura = (mundo.raioLua() && !sala ? "Lua · Exploração lunar" : aviso) + (vestido ? " · Traje vestido" : " · Veste o traje para sair");
    if (ambiente.textContent !== leitura) ambiente.textContent = leitura;
    if (estadoModal() || !emMovimento) parar();

    let x = 0, z = 0;
    for (const tecla of teclas) {
      const [dx, dz] = direccoes.get(tecla);
      x += dx;
      z += dz;
    }
    if (emMovimento && !estadoModal() && mundo.mover(movimento?.x ?? x, movimento?.z ?? z, dt) && agora - ultimoPasso > 320) {
      som.tocar("passo");
      ultimoPasso = agora;
    }
    for (const remoto of mundo.remotos) {
      const raio = mundo.raioLua();
      if (raio) {
        const alvo = mundo.direccao(remoto.x, remoto.z, remoto.alvoX, remoto.alvoZ);
        if (alvo.distancia > 35 || alvo.distancia < 0.04) {
          remoto.x = remoto.alvoX;
          remoto.z = remoto.alvoZ;
        } else {
          const escala = (1 - Math.exp(-dt * 7)) * alvo.distancia / Math.hypot(alvo.dx, alvo.dz);
          const pos = passoLua(remoto.x, remoto.z, alvo.dx * escala, alvo.dz * escala, raio);
          remoto.x = pos.x;
          remoto.z = pos.z;
          remoto.rumo = Math.atan2(alvo.dx, alvo.dz);
        }
      } else {
        remoto.x = interpolar(remoto.x, remoto.alvoX, dt);
        remoto.z = interpolar(remoto.z, remoto.alvoZ, dt);
      }
    }
    const duracaoSalto = mundo.destino === "lua" ? 950 : 660;
    const saltoP = saltoDesde === null ? 0 : (agora - saltoDesde) / duracaoSalto;
    const altura = reduzido ? 0 : Math.max(0, Math.sin(Math.min(1, saltoP) * Math.PI)) * 0.88;
    if (saltoP >= 1) saltoDesde = null;
    progresso = reduzido ? mundo.progresso : interpolar(progresso, mundo.progresso, dt * 0.38);
    const sinal = Math.max(0, 1 - (agora - (mundo.instanteEfeito || -10000)) / 4800);
    cena.desenhar({ tempo: agora / 1000, vista: modo, destino: mundo.destino, progresso,
      transicao: decolando ? subida : transicao, salto: altura, alerta: mundo.alerta, sinal });
    const proximo = emMovimento ? mundo.terminalProximo() : null;
    if (perto?.id !== proximo?.id) {
      perto = proximo;
      interagir.disabled = !perto;
      rotular(interagir, "analisar", perto ? "Interagir com " + perto.nome + " · E" : "Interagir · E");
    }
    perto = proximo;
    interagir.hidden = !emMovimento;
    const texto = perto ? perto.nome + " · E para interagir" : decolando ? "Lançamento em curso" : aterrando ? "Descida em curso"
      : modo === "cabine" ? "Aproxima-te do equipamento" : emVoo ? "Trajectória em curso" : emSolo ? (sala ? mundo.superficie.salas[sala] : "Explora a superfície · Espaço para saltar")
      : modo === "hangar" ? "Aproxima-te de um terminal · WASD / setas" : "Acompanha o objectivo da missão";
    if ($("proximidade").textContent !== texto) $("proximidade").textContent = texto;
    const visiveis = new Set();
    const alvos = emMovimento ? mundo.alvosActivos() : [];
    const alvoActivo = alvos.find((p) => p.id === mundo.postoAlvo);
    for (const alvo of alvos) {
      const d = mundo.direccao(mundo.jogador.x, mundo.jogador.z, alvo.x, alvo.z);
      if (d.distancia > 32) continue;
      const marcador = marcadorPara(alvo);
      const posicao = cena.projectar(alvo.x, mundo.altura(alvo.x, alvo.z) + 1.68, alvo.z);
      if (!posicao.visivel) continue;
      visiveis.add(alvo.id);
      marcador.hidden = false;
      marcador.classList.toggle("alvo-activo", alvo === alvoActivo);
      marcador.classList.toggle("ativo", alvo.id === perto?.id);
      marcador.style.setProperty("--cor", alvo === alvoActivo ? "#ffbb7e" : alvo.cor ?? "#8ae2f4");
      if (marcador.textContent !== alvo.nome) marcador.textContent = alvo.nome;
      marcador.style.left = posicao.x + "px";
      marcador.style.top = posicao.y + "px";
    }
    for (const [id, marcador] of sinais) {
      if (!visiveis.has(id)) marcador.hidden = true;
    }
    if (alvoActivo?.id !== ultimoAlerta) {
      if (alvoActivo) som.tocar("terminal");
      ultimoAlerta = alvoActivo?.id;
    }
    const regresso = mundo.raioLua() && emSolo && Math.hypot(mundo.jogador.x, mundo.jogador.z) > 34
      ? { x: 0, z: 4, nome: "Zona da base" } : null;
    const destinoSeta = alvoActivo ?? regresso;
    const direccao = $("direccao-posto");
    direccao.hidden = !destinoSeta;
    direccao.classList.toggle("regresso", !alvoActivo);
    if (destinoSeta) {
      const passo = alvoActivo ? mundo.viaPara(alvoActivo) : destinoSeta;
      const rumo = mundo.direccao(mundo.jogador.x, mundo.jogador.z, passo.x, passo.z);
      const distancia = mundo.direccao(mundo.jogador.x, mundo.jogador.z, destinoSeta.x, destinoSeta.z).distancia;
      const angulo = Math.atan2(rumo.dx, -rumo.dz) + mundo.anguloCamera - mundo.jogador.giro;
      direccao.children[0].style.transform = "rotate(" + angulo + "rad)";
      const indicacao = destinoSeta.nome + " · " + Math.round(distancia) + " m";
      if (direccao.children[1].textContent !== indicacao) direccao.children[1].textContent = indicacao;
    }
    requestAnimationFrame(desenhar);
  }

  document.addEventListener("keydown", (evento) => {
    if (estadoModal() || evento.altKey || evento.ctrlKey || evento.metaKey ||
        evento.target?.closest?.("input, select, textarea, button, a, [contenteditable]")) return;
    if (direccoes.has(evento.code)) {
      teclas.add(evento.code);
      evento.preventDefault();
    } else if (evento.code === "KeyE" && !evento.repeat) accaoLocal();
    else if (evento.code === "Space" && !evento.repeat && !$("saltar").hidden) {
      evento.preventDefault();
      saltar();
    }
  });
  document.addEventListener("keyup", (evento) => teclas.delete(evento.code));
  window.addEventListener("blur", parar);
  document.addEventListener("visibilitychange", () => { if (document.hidden) parar(); });
  interagir.addEventListener("click", accaoLocal);
  $("saltar").addEventListener("click", saltar);
  $("fechar").addEventListener("click", () => dialogo.close());
  canvas.addEventListener("webglcontextlost", () => {
    erro.textContent = "A cena 3D perdeu a ligação gráfica. Recarrega a página para retomar.";
    erro.hidden = false;
  });
  new ResizeObserver(() => cena.redimensionar()).observe(canvas);
  cena.redimensionar();
  requestAnimationFrame(desenhar);
}

iniciarMissao().then((ligado) => {
  if (ligado) iniciarCena();
}).catch((falha) => {
  console.error(falha);
  erro.textContent = "O mundo 3D precisa de WebGL 2 e aceleração gráfica activa. A missão continua acessível no painel.";
  erro.hidden = false;
});
