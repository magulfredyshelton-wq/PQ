import { rotular } from "./icones.js";
import { api, novaChave, voltarAoLogin } from "./api.js";

const $ = (id) => document.getElementById(id);
const LIMITE_AUDIO = 480 * 1024;
const DURACAO_AUDIO = 20;
const PAGINA = 40;
const TIPOS = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];
const hora = new Intl.DateTimeFormat("pt", { hour: "2-digit", minute: "2-digit" });

function el(tag, texto = "") {
  const elemento = document.createElement(tag);
  elemento.textContent = texto;
  return elemento;
}

function lerBase64(blob) {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(leitor.result.split(",")[1]);
    leitor.onerror = () => rejeitar(new Error("Não foi possível ler a gravação."));
    leitor.readAsDataURL(blob);
  });
}

export function ligarConversa(rota, jogador, frases) {
  const dialogo = $("chat-dialogo");
  const abrir = $("abrir-chat");
  const lista = $("chat-mensagens");
  const antigas = $("chat-antigas");
  const aviso = $("chat-aviso");
  const texto = $("chat-campo");
  const enviar = $("chat-enviar");
  const gravar = $("chat-gravar");
  const parar = $("chat-parar");
  const enviarAudio = $("chat-enviar-audio");
  const descartar = $("chat-descartar");
  const previa = $("chat-previa");
  const rotaMensagens = rota + "/mensagens";
  const enderecos = new Set();
  let consulta;
  let modo = "desligada";
  let geracao = 0;
  let cursor;
  let maisAntiga;
  let porLer = 0;
  let ocupado = false;
  let rascunho;
  let chaveTexto;
  let pedidoMicrofone = false;
  let gravacao;
  let captura = 0;

  function erro(falha) {
    if (falha.status === 401) voltarAoLogin();
    else aviso.textContent = falha.message;
  }

  function urlAudio(blob) {
    const url = URL.createObjectURL(blob);
    enderecos.add(url);
    return url;
  }

  function linhaAudio(id) {
    const botao = el("button", "Ouvir voz");
    botao.className = "botao";
    rotular(botao, "ouvir", "Ouvir mensagem de voz");
    botao.type = "button";
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      aviso.textContent = "";
      try {
        const dados = await api(rota + "/audio/" + id);
        const bytes = Uint8Array.from(atob(dados.audio), (caractere) => caractere.charCodeAt(0));
        const audio = el("audio");
        audio.controls = true;
        audio.setAttribute("aria-label", "Mensagem de voz");
        audio.src = urlAudio(new Blob([bytes], { type: dados.formato }));
        botao.replaceWith(audio);
        if (dialogo.open) {
          audio.focus();
          await audio.play().catch(() => {});
        }
      } catch (falha) {
        erro(falha);
        botao.disabled = false;
      }
    });
    return botao;
  }

  function criarMensagem(mensagem) {
    const item = el("li");
    item.className = mensagem.jogador === jogador ? "mensagem propria" : "mensagem";
    const nickname = mensagem.nickname ? "@" + mensagem.nickname : mensagem.nome;
    const autor = el("strong", mensagem.jogador === jogador ? "Tu" : nickname);
    const momento = new Date(mensagem.enviada_em * 1000);
    const tempo = el("time", hora.format(momento));
    tempo.dateTime = momento.toISOString();
    const cabecalho = el("div");
    cabecalho.append(autor, tempo);
    item.dataset.id = mensagem.id;
    item.dataset.expira = (mensagem.enviada_em + (mensagem.formato ? 86400 : 604800)) * 1000;
    item.append(cabecalho, mensagem.formato ? linhaAudio(mensagem.id) : el("p", mensagem.texto));
    if (mensagem.jogador !== jogador) {
      const denunciar = el("button", "Denunciar mensagem");
      denunciar.type = "button";
      denunciar.className = "botao";
      denunciar.addEventListener("click", async () => {
        try {
          await api(rota + "/denunciar", { motivo: "mensagem", mensagem: mensagem.id });
          denunciar.disabled = true;
          aviso.textContent = "Denúncia registada.";
        } catch (falha) {
          erro(falha);
        }
      });
      item.append(denunciar);
    }
    return item;
  }

  function actualizarBotao() {
    rotular(abrir, "chat", porLer ? "Conversa, " + porLer + " por ler" : "Conversa");
    abrir.dataset.porLer = porLer || "";
  }

  function anexar(mensagens) {
    const actualizacao = cursor !== undefined;
    const novos = mensagens.filter((m) => cursor === undefined || m.id > cursor);
    if (actualizacao && !dialogo.open) porLer += novos.filter((m) => m.jogador !== jogador).length;
    const noFim = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 40;
    lista.append(...novos.map(criarMensagem));
    if (maisAntiga === undefined && novos.length) {
      maisAntiga = novos[0].id;
      antigas.hidden = actualizacao || novos.length < PAGINA;
    }
    cursor = novos.at(-1)?.id ?? cursor ?? 0;
    $("chat-vazio").hidden = Boolean(lista.childElementCount);
    actualizarBotao();
    if (dialogo.open && noFim && novos.length) lista.scrollTop = lista.scrollHeight;
  }

  function sincronizar() {
    if (consulta) return consulta;
    const actual = geracao;
    consulta = api(rotaMensagens + (cursor !== undefined ? "?depois=" + cursor : ""))
      .then((mensagens) => { if (actual === geracao && modo !== "desligada") anexar(mensagens); })
      .finally(() => { consulta = null; });
    return consulta;
  }

  function receber(novoModo, mensagens = []) {
    for (const item of lista.children) {
      if (Number(item.dataset.expira) <= Date.now()) item.hidden = true;
    }
    if (novoModo !== modo) {
      modo = novoModo;
      geracao++;
      lista.replaceChildren();
      cursor = undefined;
      maisAntiga = undefined;
      porLer = 0;
      antigas.hidden = true;
      abrir.disabled = modo === "desligada";
      $("chat-texto").hidden = modo !== "livre";
      $("chat-frases").hidden = modo === "desligada";
      if (modo !== "livre") {
        cancelarCaptura();
        libertarPrevia();
        enderecos.forEach((url) => URL.revokeObjectURL(url));
        enderecos.clear();
      }
      actualizarControlos();
      if (modo === "desligada" && dialogo.open) dialogo.close();
      if (modo !== "desligada") Promise.resolve(consulta).catch(() => {}).then(() => sincronizar()).catch(erro);
      return;
    }
    if (modo !== "desligada" && cursor !== undefined) anexar(mensagens);
  }

  antigas.addEventListener("click", async () => {
    antigas.disabled = true;
    aviso.textContent = "";
    try {
      const actual = geracao;
      const mensagens = await api(rotaMensagens + "?antes=" + maisAntiga);
      if (actual !== geracao) return;
      const altura = lista.scrollHeight;
      lista.prepend(...mensagens.map(criarMensagem));
      lista.scrollTop += lista.scrollHeight - altura;
      maisAntiga = mensagens[0]?.id ?? maisAntiga;
      antigas.hidden = mensagens.length < PAGINA;
    } catch (falha) {
      erro(falha);
    } finally {
      antigas.disabled = false;
    }
  });

  async function publicar(dados) {
    await api(rotaMensagens, dados);
    try {
      await sincronizar();
      lista.scrollTop = lista.scrollHeight;
    } catch (falha) {
      erro(falha);
    }
  }

  function actualizarControlos() {
    gravar.hidden = modo !== "livre" || Boolean(gravacao || rascunho);
    gravar.disabled = pedidoMicrofone;
    parar.hidden = !gravacao;
    parar.disabled = gravacao?.recorder.state === "inactive";
    descartar.hidden = enviarAudio.hidden = previa.hidden = !rascunho;
    descartar.disabled = enviarAudio.disabled = enviar.disabled = ocupado;
  }

  function libertarPrevia() {
    if (!rascunho) return;
    previa.pause();
    previa.removeAttribute("src");
    previa.load();
    URL.revokeObjectURL(rascunho.url);
    enderecos.delete(rascunho.url);
    rascunho = null;
    actualizarControlos();
  }

  function terminarGravacao() {
    if (!gravacao || gravacao.recorder.state === "inactive") return;
    gravacao.recorder.stop();
    parar.disabled = true;
  }

  async function iniciarGravacao() {
    aviso.textContent = "";
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      aviso.textContent = "A gravação de voz precisa de HTTPS ou localhost e de um navegador compatível.";
      return;
    }
    if (pedidoMicrofone || gravacao || rascunho) return;
    const pedido = ++captura;
    pedidoMicrofone = true;
    actualizarControlos();
    let microfone;
    try {
      microfone = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (pedido !== captura || !dialogo.open) {
        microfone.getTracks().forEach((faixa) => faixa.stop());
        return;
      }
      const mimeType = TIPOS.find((tipo) => MediaRecorder.isTypeSupported(tipo));
      const recorder = new MediaRecorder(microfone, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 48000 });
      const blocos = [];
      const sessao = { recorder, microfone, timer: null, cancelada: false };
      gravacao = sessao;
      recorder.ondataavailable = (evento) => {
        if (evento.data.size) blocos.push(evento.data);
      };
      recorder.onerror = () => {
        sessao.cancelada = true;
        aviso.textContent = "A gravação foi interrompida.";
        terminarGravacao();
      };
      recorder.onstop = () => {
        clearTimeout(sessao.timer);
        microfone.getTracks().forEach((faixa) => faixa.stop());
        if (gravacao !== sessao) return;
        gravacao = null;
        if (!sessao.cancelada) {
          const formato = (recorder.mimeType || blocos[0]?.type || "").split(";")[0].toLowerCase();
          const blob = new Blob(blocos, { type: formato });
          if (blob.size && blob.size <= LIMITE_AUDIO && ["audio/webm", "audio/ogg", "audio/mp4"].includes(formato)) {
            rascunho = { blob, formato, chave: novaChave(), url: urlAudio(blob) };
            previa.src = rascunho.url;
            aviso.textContent = "Ouve a gravação antes de enviar.";
          } else {
            aviso.textContent = "Não foi possível preparar o áudio. Tenta gravar novamente.";
          }
        }
        actualizarControlos();
      };
      recorder.start();
      sessao.timer = setTimeout(terminarGravacao, DURACAO_AUDIO * 1000);
      aviso.textContent = "A gravar… até " + DURACAO_AUDIO + " segundos.";
    } catch (falha) {
      microfone?.getTracks().forEach((faixa) => faixa.stop());
      gravacao = null;
      if (pedido === captura) {
        aviso.textContent = falha.name === "NotAllowedError"
          ? "Autoriza o microfone no navegador para gravar voz."
          : "Não foi possível iniciar a gravação. Verifica o microfone.";
      }
    } finally {
      pedidoMicrofone = false;
      actualizarControlos();
    }
  }

  function cancelarCaptura() {
    captura++;
    if (!gravacao) return;
    gravacao.cancelada = true;
    terminarGravacao();
    gravacao.microfone.getTracks().forEach((faixa) => faixa.stop());
    aviso.textContent = "";
  }

  $("chat-texto").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const mensagem = texto.value.trim();
    if (ocupado || !mensagem) return;
    ocupado = true;
    texto.readOnly = true;
    aviso.textContent = "";
    if (chaveTexto?.mensagem !== mensagem) chaveTexto = { mensagem, id: novaChave() };
    actualizarControlos();
    try {
      await publicar({ tipo: "texto", texto: mensagem, chave: chaveTexto.id });
      chaveTexto = null;
      texto.value = "";
    } catch (falha) {
      erro(falha);
    } finally {
      ocupado = false;
      texto.readOnly = false;
      actualizarControlos();
    }
  });

  enviarAudio.addEventListener("click", async () => {
    if (!rascunho || ocupado) return;
    ocupado = true;
    aviso.textContent = "";
    actualizarControlos();
    try {
      const { blob, formato, chave } = rascunho;
      await publicar({ tipo: "audio", formato, chave, audio: await lerBase64(blob) });
      libertarPrevia();
    } catch (falha) {
      erro(falha);
    } finally {
      ocupado = false;
      actualizarControlos();
    }
  });

  abrir.addEventListener("click", () => {
    porLer = 0;
    actualizarBotao();
    dialogo.showModal();
    lista.scrollTop = lista.scrollHeight;
    sincronizar().catch(erro);
  });
  dialogo.addEventListener("close", () => {
    cancelarCaptura();
    dialogo.querySelectorAll("audio").forEach((audio) => audio.pause());
  });
  window.addEventListener("pagehide", (evento) => {
    cancelarCaptura();
    if (!evento.persisted) enderecos.forEach((url) => URL.revokeObjectURL(url));
  });
  gravar.addEventListener("click", iniciarGravacao);
  parar.addEventListener("click", terminarGravacao);
  descartar.addEventListener("click", () => {
    libertarPrevia();
    aviso.textContent = "";
  });

  for (const [id, textoFrase] of Object.entries(frases)) {
    const botao = el("button", textoFrase);
    botao.type = "button";
    botao.className = "botao";
    botao.addEventListener("click", async () => {
      if (ocupado || modo === "desligada") return;
      ocupado = true;
      aviso.textContent = "";
      try {
        await publicar({ tipo: "frase", frase: id, chave: novaChave() });
      } catch (falha) {
        erro(falha);
      } finally {
        ocupado = false;
      }
    });
    $("chat-frases").append(botao);
  }
  abrir.disabled = true;
  return { receber, cursor: () => modo === "desligada" ? undefined : cursor };
}
