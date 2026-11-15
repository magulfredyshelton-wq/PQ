export async function api(rota, corpo) {
  const resposta = await fetch("/api" + rota, {
    ...(corpo === undefined ? {} : { method: "POST", body: JSON.stringify(corpo) }),
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(11000)
  });
  let dados;
  try {
    dados = await resposta.json();
  } catch {
    throw new Error("Não foi possível contactar o servidor do jogo.");
  }
  if (!resposta.ok) {
    const falha = new Error(dados.erro || "O servidor rejeitou o pedido.");
    falha.status = resposta.status;
    throw falha;
  }
  return dados;
}

export const fases = {
  preparacao_na_terra: "Preparação na Terra", viagem: "Viagem", aproximacao: "Aproximação",
  instalacao: "Instalação da base", operacao: "Operação da base", retirada: "Retirada em segurança",
  concluida: "Missão concluída"
};

export function novaChave() {
  return crypto.randomUUID?.() ?? Date.now() + "-" + Math.random().toString(36).slice(2);
}

export function abrirPartida(codigo) {
  location.assign("./hangar.html?partida=" + encodeURIComponent(codigo));
}

export function voltarAoLogin() {
  location.replace("./");
}
