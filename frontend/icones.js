const caminhos = {
  equipa: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2M16 5a3 3 0 0 1 0 6m5 9v-2a5 5 0 0 0-4-5"/>',
  ouvir: '<path d="M3 9h4l5-4v14l-5-4H3zM16 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/>',
  som: '<path d="M3 9h4l5-4v14l-5-4H3zM17 9l4 6m0-6l-4 6"/>',
  chat: '<path d="M4 5h16v12h-9l-5 4v-4H4zM8 10h8m-8 3h5"/>',
  sair: '<path d="M11 4H4v16h7m3-13l5 5-5 5m-5-5h10"/>',
  expandir: '<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>',
  alerta: '<path d="M12 3l10 17H2zM12 9v4m0 3h.01"/>',
  rota: '<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h7a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h7"/>',
  fechar: '<path d="m6 6 12 12M18 6 6 18"/>',
  analisar: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 12h8m-4-4v8"/>',
  avancar: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  escudo: '<path d="M12 2l8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6z"/>',
  globo: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  bandeira: '<path d="M5 22V3m0 1c6-5 8 4 14 0v10c-6 4-8-5-14 0"/>',
  livro: '<path d="M12 6c-3-3-6-3-10-2v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-4-1-7-1-10 2zm0 0v15"/>',
};

export function icone(nome) {
  return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + caminhos[nome] + '</svg>';
}

export function rotular(elemento, nome, legenda) {
  elemento.innerHTML = icone(nome);
  elemento.setAttribute("aria-label", legenda);
  elemento.title = legenda;
  elemento.classList.add("controlo-icone");
  return elemento;
}
