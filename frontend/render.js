import { carregarModelo, carregarTextura } from "./modelos.js";
import { PosProcessamento } from "./pos-processamento.js";

const ALTURA_TELA = 0.67;
const INCLINACAO = 0.74;
const PONTOS = [
  [-1,-1,-1], [1,-1,-1], [1,-1,1], [-1,-1,1],
  [-1,1,-1], [1,1,-1], [1,1,1], [-1,1,1]
];
const FACES = [
  [[0,1,2,3], .53], [[4,5,6,7], .98], [[0,3,7,4], .84],
  [[1,2,6,5], .68], [[0,1,5,4], .70], [[3,2,6,7], .81]
];
const TRIANGULOS = [0, 1, 2, 0, 2, 3];
const cores = new Map();

function rgb(cor) {
  if (!cores.has(cor)) cores.set(cor, cor.slice(1).match(/../g).map((par) => parseInt(par, 16) / 255));
  return cores.get(cor);
}

export class RenderHangar {
  constructor(canvas, mundo) {
    this.canvas = canvas;
    this.mundo = mundo;
    this.compacto = matchMedia("(max-width: 720px), (pointer: coarse)").matches;
    this.animar = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.tempo = 0;
    this.pegadas = [];
    this.centro = 0;
    this.gl = canvas.getContext("webgl", {
      alpha: true, premultipliedAlpha: false, antialias: !this.compacto
    });
    if (!this.gl) throw new Error("Abre o hangar num navegador com suporte a WebGL.");

    const gl = this.gl;
    const vertice = this.compilar(gl.VERTEX_SHADER, `
      attribute vec3 posicao;
      attribute vec3 cor;
      attribute vec2 material;
      uniform vec2 escala;
      uniform float centro;
      uniform float rumo;
      varying mediump vec3 corFinal;
      varying mediump vec2 tipo;
      varying mediump vec2 coordenadasPiso;
      void main() {
        float c = cos(rumo);
        float s = sin(rumo);
        float fundo = posicao.x * s + posicao.z * c;
        vec2 tela = vec2(posicao.x * c - posicao.z * s,
                         posicao.y * ${ALTURA_TELA} - fundo * ${INCLINACAO});
        float perto = fundo * ${ALTURA_TELA} + posicao.y * ${INCLINACAO};
        gl_Position = vec4((tela - vec2(centro, 0.0)) / escala, -perto / 35.0, 1.0);
        corFinal = cor;
        tipo = material;
        coordenadasPiso = (posicao.xz + vec2(11.0, 7.0)) / 2.0;
      }
    `);
    const fragmento = this.compilar(gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying mediump vec3 corFinal;
      varying mediump vec2 tipo;
      varying mediump vec2 coordenadasPiso;
      uniform sampler2D albedo;
      uniform sampler2D metal;
      uniform float emissaoNoAlpha;
      void main() {
        vec3 cor = corFinal;
        if (tipo.y > 0.5) {
          vec2 uv = fract(coordenadasPiso);
          vec3 mapa = texture2D(albedo, uv).rgb;
          vec2 propriedades = texture2D(metal, uv).gb;
          float luz = max(0.0, 1.0 - length(coordenadasPiso - vec2(6.8, 4.0)) * 0.26);
          cor *= mapa * 1.09 + luz * (1.0 - propriedades.x) * propriedades.y * 0.44;
          cor += vec3(0.013, 0.029, 0.048) * luz;
        }
        gl_FragColor = vec4(cor, mix(1.0, tipo.x, emissaoNoAlpha));
      }
    `);
    this.programa = gl.createProgram();
    gl.attachShader(this.programa, vertice);
    gl.attachShader(this.programa, fragmento);
    gl.linkProgram(this.programa);
    gl.deleteShader(vertice);
    gl.deleteShader(fragmento);
    if (!gl.getProgramParameter(this.programa, gl.LINK_STATUS)) {
      throw new Error("O navegador não conseguiu carregar o hangar 3D.");
    }

    gl.useProgram(this.programa);
    this.escala = gl.getUniformLocation(this.programa, "escala");
    this.centroUniforme = gl.getUniformLocation(this.programa, "centro");
    this.emissaoNoAlpha = gl.getUniformLocation(this.programa, "emissaoNoAlpha");
    this.posicao = gl.getAttribLocation(this.programa, "posicao");
    this.cor = gl.getAttribLocation(this.programa, "cor");
    this.material = gl.getAttribLocation(this.programa, "material");
    gl.uniform1f(gl.getUniformLocation(this.programa, "rumo"), mundo.anguloCamera);
    gl.uniform1i(gl.getUniformLocation(this.programa, "albedo"), 3);
    gl.uniform1i(gl.getUniformLocation(this.programa, "metal"), 4);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    this.estatico = gl.createBuffer();
    this.dinamico = gl.createBuffer();
    this.pos = new PosProcessamento(gl, this.compilar.bind(this), this.compacto);
  }

  async carregar() {
    const gl = this.gl;
    const [astronauta, nave, terminal, albedo, metal] = await Promise.all([
      carregarModelo(new URL("./assets/astronauta.glb", import.meta.url)),
      carregarModelo(new URL("./assets/nave.glb", import.meta.url)),
      carregarModelo(new URL("./assets/terminal.glb", import.meta.url)),
      carregarTextura(gl, new URL("./assets/metal-albedo.png", import.meta.url)),
      carregarTextura(gl, new URL("./assets/metal-roughness.png", import.meta.url))
    ]);
    this.modelos = { astronauta, nave, terminal };
    this.texturas = [albedo, metal];
    this.actualizarCenario();
  }

  actualizarCenario() {
    const gl = this.gl;
    const cenario = this.criarCenario();
    this.totalEstatico = cenario.length / 8;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.estatico);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cenario), gl.STATIC_DRAW);
  }

  compilar(tipo, codigo) {
    const gl = this.gl;
    const shader = gl.createShader(tipo);
    gl.shaderSource(shader, codigo);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      throw new Error("O navegador não conseguiu desenhar o hangar 3D.");
    }
    return shader;
  }

  caixa(vertices, x, y, z, largura, altura, fundo, cor, emissao = 0, piso = 0) {
    const [r, g, b] = rgb(cor);
    for (const [indices, luz] of FACES) {
      for (const indice of TRIANGULOS) {
        const [dx, dy, dz] = PONTOS[indices[indice]];
        vertices.push(x + dx * largura / 2, y + dy * altura / 2, z + dz * fundo / 2);
        vertices.push(r * luz, g * luz, b * luz, emissao, piso);
      }
    }
  }

  modelo(vertices, partes, x, y, z, rumo = 0, acento = null) {
    const c = Math.cos(rumo);
    const s = Math.sin(rumo);
    for (const { posicoes, normais, cor, emissivo } of partes) {
      const [r, g, b] = acento && emissivo ? rgb(acento) : cor;
      for (let i = 0; i < posicoes.length; i += 3) {
        const px = posicoes[i];
        const pz = posicoes[i + 2];
        const nx = normais[i] * c + normais[i + 2] * s;
        const nz = -normais[i] * s + normais[i + 2] * c;
        const luz = emissivo ? 1 : 0.61 + 0.40 * Math.max(0, nx * -.46 + normais[i + 1] * .82 + nz * .23);
        vertices.push(x + px * c + pz * s, y + posicoes[i + 1], z - px * s + pz * c);
        vertices.push(r * luz, g * luz, b * luz, emissivo * 0.78, 0);
      }
    }
  }

  criarCenario() {
    const vertices = [];
    const caixa = (...args) => this.caixa(vertices, ...args);

    const fase = this.mundo.cena;
    const superficie = ["instalacao", "operacao", "concluida"].includes(fase);
    const viagem = ["viagem", "aproximacao", "retirada"].includes(fase);
    const terreno = this.mundo.destino === "marte" ? "#9D593F" : "#777C87";
    caixa(0, -.69, 0, 22.9, .55, 15.8, superficie ? terreno : "#16263E");
    caixa(0, -.31, 0, 22, .34, 14.7, "#466281");
    caixa(0, -.14, 0, 21.8, .19, 14.2, "#283D56");
    const mosaico = superficie
      ? (this.mundo.destino === "marte" ? ["#905338","#A25D42","#99543D","#A26246"] : ["#747782","#666D79","#7F828B","#656B73"])
      : viagem ? ["#263A58","#2A4161","#2C4769","#345576"] : ["#3F5670","#405B76","#374F6C","#465F79"];
    for (let linha = 0; linha < 7; linha++) {
      for (let coluna = 0; coluna < 11; coluna++) {
        caixa(-10 + coluna * 2, -.04, -6 + linha * 2, 1.98, .08, 1.98,
          mosaico[(linha * 3 + coluna) % mosaico.length], 0, superficie ? 0 : 1);
      }
    }

    caixa(0, .39, -7, 21.7, .84, .34, "#4E6784");
    caixa(0, .85, -7, 21.7, .14, .41, "#7895AE");
    caixa(-10.7, .37, 0, .34, .78, 14.1, "#4F6A83");
    caixa(-10.7, .82, 0, .42, .15, 14.2, "#7895AE");
    caixa(10.7, .09, 0, .30, .26, 14.1, "#68829E");
    caixa(0, .09, 7, 21.8, .26, .30, "#68829E");
    for (let x = -9; x <= 9; x += 3) {
      caixa(x, .65, -7, .26, 1.45, .52, "#90A9BB");
      caixa(x + .64, .55, -6.80, .7, .16, .045, "#54E3EB", .85);
      caixa(x, .065, 6.64, 1.28, .024, .105, "#71E6EB", .68);
    }
    for (const x of [-2.65, 2.65]) {
      for (let z = -4.05; z <= 2.6; z += .62) {
        caixa(x, .048, z, .17, .032, .36, "#F8AC65", .92);
      }
    }

    caixa(0, .025, -.65, 5.27, .047, 6.92, "#24394F");
    caixa(0, .08, -.65, 3.8, .15, 5.78, "#20334A");
    for (const { x, z, cor } of this.mundo.terminais) {
      caixa(x, .03, z, 2.62, .046, 2.05, "#24384D");
      caixa(x, .06, z + .88, 1.72, .030, .095, cor, .76);
      this.modelo(vertices, this.modelos.terminal, x, .04, z, 0, cor);
    }
    if (superficie) {
      for (const [x, z, w, h] of [[-9.9,-5.8,.85,.4],[-6,-6.1,.58,.3],[8.9,-6.0,.78,.49],
        [9.8,2.6,.6,.31],[-10.02,5.3,.67,.30],[9.1,6.45,.52,.29]]) {
        caixa(x, h / 2, z, w, h, w * .83, terreno);
      }
    }
    for (const [x, z] of [[-8.35, 3.1], [-7.14, 3.5], [-4.22, -5.38], [3.8, -5.39]]) {
      caixa(x, .42, z, 1.08, .83, 1.00, "#586F88");
      caixa(x, .88, z, 1.14, .13, 1.07, "#95ACBF");
      caixa(x, .43, z + .512, .66, .12, .039, "#E7AC74", .22);
    }
    return vertices;
  }

  marcarPasso(tempo) {
    if (!this.animar || this.compacto) return;
    const { x, z, rumo } = this.mundo.jogador;
    this.lado = -(this.lado ?? 1);
    this.pegadas.push({
      x: x + Math.cos(rumo) * this.lado * .16,
      z: z - Math.sin(rumo) * this.lado * .16, tempo
    });
  }

  elementosMoveis() {
    const vertices = [];
    const { x, z, rumo, passo } = this.mundo.jogador;
    const tempo = this.animar ? this.tempo : 0;
    this.caixa(vertices, x, .019, z, 1.02, .031, .79, "#21344A");
    this.modelo(vertices, this.modelos.astronauta, x, Math.abs(Math.sin(passo)) * .063, z, rumo);
    const fase = this.mundo.cena;
    if (fase === "preparacao_na_terra") {
      this.modelo(vertices, this.modelos.nave, 0, .21 + Math.sin(tempo * 1.3) * .095, -.6);
    } else if (["viagem", "aproximacao", "retirada"].includes(fase)) {
      this.caixa(vertices, 0, .57, -.6, 4.4, .9, 5.8, "#243C60");
      this.caixa(vertices, 0, 1.22, -1.7, 3.5, .15, 1.3, "#75C8E8", .65);
      this.caixa(vertices, 0, 1.17, .96, 1.1, .12, .34, "#71DDDC", .78);
      this.caixa(vertices, -1.53, 1.12, .58, .62, .65, .78, "#5C7C9B");
      this.caixa(vertices, 1.53, 1.12, .58, .62, .65, .78, "#5C7C9B");
      this.caixa(vertices, -1.53, 1.47, .26, .57, .74, .13, "#778EAD");
      this.caixa(vertices, 1.53, 1.47, .26, .57, .74, .13, "#778EAD");
    } else {
      this.caixa(vertices, 0, .36, -.6, 4.5, .6, 5.6, "#3A4358");
      if (this.mundo.montados.includes("energia")) this.caixa(vertices, -1.25, .90, -.61, .9, .36, 4.6, "#639FDA", .40);
      if (this.mundo.montados.includes("radio")) this.caixa(vertices, 1.5, 1.55, -2.45, .17, 2.6, .17, "#96D3DE", .52);
      if (this.mundo.montados.includes("habitat")) {
        this.caixa(vertices, .57, 1.28, -.5, 2.45, 1.46, 3.5, "#C4CED4");
        this.caixa(vertices, .60, 1.46, 1.27, 1.55, .32, .08, "#4CD3D6", .75);
      }
    }
    const coresEmocao = { SERENO:"#76E1E4", PANICO:"#FF775F", PROTESTO:"#F5B46B",
      ALIVIO:"#8CF0AE", TRISTEZA:"#9C98E9" };
    this.mundo.tripulacao.forEach((npc, i) => {
      const x = -8 + i * 1.05, z = .05 + i * .74;
      const reaccao = coresEmocao[npc.emocao] || "#76E1E4";
      const pulso = .45 + Math.sin(tempo * (2 + npc.intensidade * 4)) * .18;
      this.modelo(vertices, this.modelos.astronauta, x, 0, z, .14 + Math.sin(tempo) * .09, reaccao);
      this.caixa(vertices, x, 1.76, z, .17, .07, .17, reaccao, pulso);
    });
    for (const remoto of this.mundo.remotos) {
      this.modelo(vertices, this.modelos.astronauta, remoto.x, 0, remoto.z, 0, "#AA9AF8");
    }
    this.pegadas = this.pegadas.filter((pegada) => tempo - pegada.tempo < 2.6);
    for (const pegada of this.pegadas) {
      const cor = tempo - pegada.tempo < 1.3 ? "#243A50" : "#354D65";
      this.caixa(vertices, pegada.x, .036, pegada.z, .17, .019, .28, cor);
    }
    const terminal = this.mundo.terminalProximo();
    if (terminal) {
      this.caixa(vertices, terminal.x, 1.61, terminal.z, .29, .095, .20,
        terminal.cor, .62 + Math.sin(tempo * 5.0) * .32);
    }
    if (this.animar) {
      const quantidade = this.compacto ? 7 : 19;
      for (let i = 0; i < quantidade; i++) {
        const px = ((i * 2.43 + tempo * .16) % 20) - 10;
        const pz = ((i * 2.17 + tempo * .07) % 12) - 6;
        const y = .12 + (i % 5) * .24 + Math.sin(tempo + i) * .08;
        this.caixa(vertices, px, y, pz, .047, .047, .047, "#A9C6DC", .14);
      }
    }
    return vertices;
  }

  redimensionar() {
    const canvas = this.canvas;
    const densidade = Math.min(devicePixelRatio || 1, this.compacto ? 1.12 : 1.6);
    const largura = Math.max(1, Math.round(canvas.clientWidth * densidade));
    const altura = Math.max(1, Math.round(canvas.clientHeight * densidade));
    if (canvas.width !== largura || canvas.height !== altura) {
      canvas.width = largura;
      canvas.height = altura;
    }
    const proporcao = largura / altura;
    this.meiaLargura = proporcao < 1.18 ? Math.max(7.1, 7.9 * proporcao) : Math.max(13.8, 7.9 * proporcao);
    this.meiaAltura = this.meiaLargura / proporcao;
    this.pos.ajustar(largura, altura);
  }

  projectar(x, y, z) {
    const c = Math.cos(this.mundo.anguloCamera);
    const s = Math.sin(this.mundo.anguloCamera);
    const telaX = x * c - z * s;
    const telaY = y * ALTURA_TELA - (x * s + z * c) * INCLINACAO;
    return {
      x: ((telaX - this.centro) / this.meiaLargura + 1) * this.canvas.clientWidth / 2,
      y: (1 - telaY / this.meiaAltura) * this.canvas.clientHeight / 2
    };
  }

  desenharBuffer(buffer, quantidade) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [atributo, tamanho, offset] of [[this.posicao, 3, 0], [this.cor, 3, 12], [this.material, 2, 24]]) {
      gl.enableVertexAttribArray(atributo);
      gl.vertexAttribPointer(atributo, tamanho, gl.FLOAT, false, 32, offset);
    }
    gl.drawArrays(gl.TRIANGLES, 0, quantidade);
  }

  desenhar(tempo = this.tempo) {
    const gl = this.gl;
    this.tempo = tempo;
    const post = this.pos.disponivel;
    gl.bindFramebuffer(gl.FRAMEBUFFER, post ? this.pos.cena : null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.programa);
    const { x, z } = this.mundo.jogador;
    const angulo = this.mundo.anguloCamera;
    const desvio = Math.max(0, 13.8 - this.meiaLargura);
    const telaX = x * Math.cos(angulo) - z * Math.sin(angulo);
    this.centro = Math.max(-desvio, Math.min(desvio, telaX));
    gl.uniform1f(this.centroUniforme, this.centro);
    gl.uniform2f(this.escala, this.meiaLargura, this.meiaAltura);
    gl.uniform1f(this.emissaoNoAlpha, post ? 1 : 0);
    for (let i = 0; i < this.texturas.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + 3 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.texturas[i]);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.desenharBuffer(this.estatico, this.totalEstatico);
    const vertices = this.elementosMoveis();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dinamico);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    this.desenharBuffer(this.dinamico, vertices.length / 8);
    if (post) {
      const fundo = x * Math.sin(angulo) + z * Math.cos(angulo);
      this.pos.apresentar(0.5 - (fundo * ALTURA_TELA + .65 * INCLINACAO) / 70);
    }
  }
}
