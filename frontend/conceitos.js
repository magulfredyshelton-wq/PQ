const aulas = {
  viagem: [
    ["Uma rota que se curva",
      "O destino está em movimento. Imagina passar uma bola a alguém que está a correr: apontas para onde a pessoa vai estar.",
      "A nave e o destino orbitam. A trajetória encontra o alvo numa posição futura. Nesta demo, o relógio avança em saltos para caber na sessão.",
      "Uma transferência orbital encontra o alvo numa posição futura. A simulação comprime o tempo: a animação representa um trecho, e o painel mostra a duração calculada pelo jogo."],
    ["Distância, velocidade e tempo",
      "Um sinal de rádio é muito rápido, mas o espaço é enorme. Uma mensagem e a sua resposta precisam de fazer duas viagens.",
      "Se um sinal demora 5 minutos a chegar, a resposta leva outros 5. São pelo menos 10 minutos, mesmo que a equipa responda imediatamente.",
      "A luz percorre cerca de 300 000 km/s no vazio. Uma distância de 90 milhões de quilómetros dá 300 segundos por trecho: t = distância ÷ velocidade."],
    ["Porque os astronautas flutuam",
      "A nave e os astronautas caem juntos ao redor de um astro. Dentro da nave, tudo parece flutuar.",
      "Em órbita, a gravidade continua a puxar a nave. Ela tem velocidade lateral suficiente para continuar a cair à volta do astro.",
      "A microgravidade em órbita resulta da queda livre conjunta da nave e dos ocupantes. A aceleração gravitacional altera a direção da velocidade."],
  ],
  pouso: [
    ["Travar antes de tocar o chão", "A nave usa os motores como travões. Uma zona distante gasta mais combustível nesta missão.",
      "O propulsante permite reduzir a velocidade e corrigir a descida. Compara o terreno e a reserva antes de escolher.",
      "Para pousar, a nave precisa de reduzir a velocidade vertical e controlar o movimento lateral. Uma correção adicional requer margem de propulsante."],
  ],
  superficie: [
    ["A gravidade muda os passos", "O teu corpo tem a mesma massa, mas pesa menos aqui. Observa como o astronauta salta e pousa.",
      "O peso muda com a gravidade. Uma mochila de 6 kg mantém a massa de 6 kg na Terra, na Lua e em Marte.",
      "O peso obedece a P = m × g. A gravidade superficial da Lua é cerca de 17% da terrestre e a de Marte, 38%."],
    ["Proteger as reservas", "A energia, o ar e a água mantêm a base a funcionar. Os painéis precisam de luz e os equipamentos precisam de proteção.",
      "A energia guardada sustenta a base quando a produção cai. Poeira, sombra e frio podem reduzir a autonomia.",
      "A autonomia depende da energia armazenada e da potência consumida. Preservar os sistemas essenciais mantém uma margem para imprevistos."],
  ],
};

const niveis = { cadete: 1, piloto: 2, comandante: 3 };

export function aula(tema, numero, nivel) {
  const opcoes = aulas[tema] ?? aulas.superficie;
  const [titulo, ...textos] = opcoes[Math.min(numero, opcoes.length - 1)];
  return { titulo, texto: textos[(niveis[nivel] ?? 1) - 1] };
}

export const locais = [
  { id: "amostra", nome: "Amostra mineral", x: -6.3, z: -2.9, cor: "#e8b583",
    descricao: "Observa a rocha e regista uma amostra com o scanner.",
    detalhes: ["A forma e a cor dão pistas sobre a origem.", "Regista o lugar da recolha para comparar amostras."] },
  { id: "baliza", nome: "Baliza da base", x: 6.4, z: -3.1, cor: "#67e5de",
    descricao: "Activa o sinal para que a equipa encontre o caminho de volta.",
    detalhes: ["O relevo pode bloquear um sinal directo.", "Uma baliza ajuda a marcar uma rota de regresso."] },
  { id: "cratera", nome: "Cratera", x: -7.0, z: 3.1, cor: "#b8a1fd",
    descricao: "Observa a inclinação e desce pela parte menos íngreme.",
    detalhes: ["Impactos podem escavar depressões no terreno.", "Verifica o relevo antes de escolher um caminho."] },
];
