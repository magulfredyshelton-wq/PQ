import { api } from "./api.js";

const $ = (id) => document.getElementById(id);

async function configurarConta() {
  let ocupado = false;
  const login = $("login");
  const registo = $("registo");
  const confirmar = $("confirmacao");
  const aviso = $("aviso-conta");
  const parametros = new URLSearchParams(location.hash.slice(1));
  const chave = parametros.get("confirmar");
  const autorizacao = $("autorizacao");
  const codigoAutorizacao = parametros.get("autorizar");

  function escrever(texto) {
    aviso.textContent = texto;
  }

  function mostrar(modo) {
    login.hidden = modo !== "login";
    registo.hidden = modo !== "registo";
    confirmar.hidden = modo !== "confirmar";
    autorizacao.hidden = modo !== "autorizar";
    $("conta-titulo").textContent = { login: "Entrar", registo: "Criar conta", confirmar: "Confirmar email", autorizar: "Autorização do responsável" }[modo];
    escrever("");
  }

  function tratar(formulario, tarefa) {
    formulario.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      if (ocupado) return;
      ocupado = true;
      const botao = formulario.querySelector("button");
      botao.disabled = true;
      escrever("");
      try {
        await tarefa();
      } catch (falha) {
        escrever(falha.message);
      } finally {
        ocupado = false;
        botao.disabled = false;
      }
    });
  }

  $("abrir-registo").addEventListener("click", async () => {
    try {
      const politica = await api("/conta/politica");
      $("registo-idade").min = politica.idade_minima;
      mostrar("registo");
    } catch (falha) {
      escrever(falha.message);
    }
  });
  $("voltar-login").addEventListener("click", () => mostrar("login"));
  $("cancelar-confirmacao").addEventListener("click", () => {
    history.replaceState(null, "", location.pathname + location.search);
    mostrar("login");
  });
  tratar(login, async () => {
    await api("/conta/entrar", {
      email: $("login-email").value, senha: $("login-senha").value
    });
    login.reset();
    location.replace("./partidas.html");
  });

  tratar(registo, async () => {
    const dados = await api("/conta/pedir-confirmacao", { email: $("registo-email").value, idade: $("registo-idade").valueAsNumber });
    escrever(dados.modo_local
      ? dados.mensagem + " Na demo local, abre o ficheiro mais recente em backend/emails_demo no servidor."
      : dados.mensagem + " Consulta a caixa de entrada e o spam.");
  });

  tratar(confirmar, async () => {
    await api("/conta/confirmar", {
      codigo: chave, nome: $("conta-nome").value, idade: $("conta-idade").valueAsNumber,
      senha: $("conta-senha").value, nickname: $("conta-nickname").value
    });
    history.replaceState(null, "", location.pathname + location.search);
    confirmar.reset();
    mostrar("login");
    escrever("Email confirmado. Entra com o teu email e a palavra-passe.");
  });

  tratar(autorizacao, async () => {
    await api("/conta/autorizar", { codigo: codigoAutorizacao, aceite: $("autorizar-aceite").checked });
    history.replaceState(null, "", location.pathname + location.search);
    mostrar("login");
    escrever("Autorização registada. A criança já pode usar um código privado para jogar em equipa.");
  });
  if (codigoAutorizacao) {
    mostrar("autorizar");
    return;
  }
  if (chave) {
    mostrar("confirmar");
    return;
  }
  try {
    await api("/conta");
    location.replace("./partidas.html");
  } catch (falha) {
    if (falha.status !== 401) escrever(falha.message);
  }
}

configurarConta();
