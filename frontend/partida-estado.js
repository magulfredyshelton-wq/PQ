export function lerCodigoPrivado(texto) {
  const partes = texto.trim().split("/");
  if (partes.length !== 2 || !/^[0-9a-f]{12}$/i.test(partes[0]) || !/^[a-z0-9_-]{24}$/i.test(partes[1])) {
    throw new Error("Cola o código completo que recebeste.");
  }
  return { codigo: partes[0].toUpperCase(), convite: partes[1] };
}

export function estadoVotacao(votos, ligados) {
  const escolhas = ligados.filter((jogador) => votos[jogador.id]);
  if (new Set(escolhas.map((jogador) => votos[jogador.id])).size > 1) return "divergencia";
  return escolhas.length ? "aguarda" : "sem_votos";
}

export function interpolar(actual, alvo, segundos) {
  return actual + (alvo - actual) * (1 - Math.exp(-4 * segundos));
}
