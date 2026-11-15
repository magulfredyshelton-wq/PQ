import { rotular } from "./icones.js";

const sintese = globalThis.speechSynthesis;
const disponivel = Boolean(sintese && globalThis.SpeechSynthesisUtterance);
const ritmos = { comando: [0.94, 1], engenharia: [1.02, 1.13], cadete: [0.98, 1.25] };
let activa = false;
let ultimo = "";
let vozes = [];

if (disponivel) {
  const actualizar = () => { vozes = sintese.getVoices(); };
  actualizar();
  sintese.addEventListener("voiceschanged", actualizar);
}

function dizer(texto, papel, interromper = true) {
  if (!activa || !texto || document.hidden) return;
  if (interromper) sintese.cancel();
  const leitura = new SpeechSynthesisUtterance(texto);
  const portugues = vozes.filter((voz) => /^pt\b/i.test(voz.lang));
  const preferidas = portugues.filter((voz) => /^pt[-_]mz$/i.test(voz.lang));
  const alternativas = portugues.filter((voz) => /^pt[-_]pt$/i.test(voz.lang));
  const lista = preferidas.length ? preferidas : alternativas.length ? alternativas : portugues;
  const i = Object.keys(ritmos).indexOf(papel);
  leitura.voice = lista.length ? lista[Math.max(0, i) % lista.length] : null;
  leitura.lang = leitura.voice?.lang ?? "pt-PT";
  [leitura.rate, leitura.pitch] = ritmos[papel] ?? [0.96, 1];
  sintese.speak(leitura);
}

export function ligarVoz(botao, estadoActual = () => null) {
  if (!disponivel) {
    botao.disabled = true;
    botao.title = "A narração depende das vozes disponíveis no navegador.";
    return;
  }
  botao.addEventListener("click", () => {
    activa = !activa;
    rotular(botao, activa ? "ouvir" : "som", activa ? "Silenciar narração" : "Activar narração");
    botao.setAttribute("aria-pressed", String(activa));
    if (activa) {
      ultimo = "";
      const vista = estadoActual();
      if (vista) {
        const aula = document.getElementById("aula");
        if (aula && !aula.hidden) dizer(document.getElementById("aula-texto").textContent, "comando");
        else narrarEstado(vista);
      }
      else dizer("Narração activada.");
    } else {
      sintese.cancel();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) sintese.cancel();
  });
}

export function narrarEstado(vista) {
  if (!activa || document.hidden || ["viagem", "aproximacao"].includes(vista.estado.fase)) return;
  const estado = vista.estado;
  const chave = [vista.codigo, estado.fase, estado.mensagem, estado.desafio?.id,
    estado.desafio?.recuperacao].join("|");
  if (chave === ultimo) return;
  ultimo = chave;
  const mensagem = estado.desafio ? estado.desafio.titulo + ". " + estado.desafio.sinal : estado.mensagem;
  dizer(mensagem, "comando");
  const npc = estado.tripulacao.reduce((a, b) => !a || b.intensidade > a.intensidade ? b : a, null);
  if (npc?.fala && npc.intensidade > 0.15) dizer(npc.fala, npc.id, false);
}

export function narrarTerminal(texto) {
  dizer(texto, "comando");
}

export function narrarProposta(rotulo) {
  dizer("Percebi: " + rotulo + ". Queres confirmar?", "engenharia");
}

export function ouvir(texto, papel = "comando") {
  if (!disponivel) return;
  if (!activa) document.getElementById("voz").click();
  dizer(texto, papel);
}

export function pararVoz() {
  ultimo = "";
  if (disponivel) sintese.cancel();
}
