import { quadroLua, coordenadasLua } from "./lua.js";
import { montarEquipamento, animarEquipamento } from "./equipamento-3d.js";
import * as T from "./vendor/three.module.js";
import { paredesDaBase } from "./terreno.js";

const cores = {
  lua: { chao: "#696579", relevo: "#958fa2", ceu: "#0c1327", luz: "#c4d4ff", poeira: "#ded0ee" },
  marte: { chao: "#8e503a", relevo: "#b46a48", ceu: "#452e4b", luz: "#ffcf9b", poeira: "#ffbd82" },
};
const caixa = new T.BoxGeometry(1, 1, 1);
const esfera = new T.SphereGeometry(1, 22, 14);
const cilindro = new T.CylinderGeometry(1, 1, 1, 24);
const triangulo = new T.DodecahedronGeometry(1, 0);
const materiais = new Map();
const limite = T.MathUtils.clamp;

function material(cor) {
  if (!materiais.has(cor)) materiais.set(cor, new T.MeshStandardMaterial({ color: cor, roughness: 0.79 }));
  return materiais.get(cor);
}

function forma(pai, geometria, cor, x, y, z, a, b, c) {
  const objeto = new T.Mesh(geometria, material(cor));
  objeto.position.set(x, y, z);
  objeto.scale.set(a, b, c);
  pai.add(objeto);
  return objeto;
}

function grupo(pai, x = 0, y = 0, z = 0) {
  const objeto = new T.Group();
  objeto.position.set(x, y, z);
  pai.add(objeto);
  return objeto;
}

function luz(pai, cor, raio, x, y, z) {
  const objeto = new T.Mesh(esfera, new T.MeshBasicMaterial({ color: cor }));
  objeto.position.set(x, y, z);
  objeto.scale.setScalar(raio);
  pai.add(objeto);
  return objeto;
}

function estrelas(pai) {
  const dados = [];
  for (let i = 1; i <= 1100; i++) {
    const x = Math.sin(i * 249.1) * 1e4 % 1;
    const y = Math.sin(i * 97.7) * 1e4 % 1;
    const z = Math.sin(i * 317.8) * 1e4 % 1;
    dados.push(x * 150, y * 100, z * 145);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(dados, 3));
  const campo = new T.Points(geo, new T.PointsMaterial({ color: 0xd9eaff, size: 0.15, transparent: true, opacity: 0.75 }));
  pai.add(campo);
  return campo;
}

function nave(pai) {
  const corpo = grupo(pai);
  forma(corpo, cilindro, "#ced9e8", 0, 0.72, 0, 0.77, 1.37, 0.77);
  forma(corpo, esfera, "#eff5ff", 0, 1.4, 0, 0.79, 0.62, 0.79);
  forma(corpo, esfera, "#234772", 0, 1.18, 0.66, 0.43, 0.33, 0.19);
  forma(corpo, cilindro, "#415677", 0, 0.05, 0, 0.61, 0.23, 0.61);
  for (const s of [-1, 1]) {
    forma(corpo, caixa, "#53607e", s * 0.89, 0.37, 0, 0.36, 0.3, 0.98);
    forma(corpo, cilindro, "#e7b87c", s * 0.83, 0.15, 0.49, 0.14, 0.35, 0.14).rotation.z = s * 0.35;
    luz(corpo, "#60edff", 0.09, s * 0.94, 0.44, 0.5);
  }
  const chama = luz(corpo, "#77e8ff", 0.4, 0, -0.31, 0);
  chama.scale.y = 0.85;
  return { corpo, chama };
}

function astronauta(pai, cor) {
  const corpo = grupo(pai);
  const uniforme = forma(corpo, esfera, cor, 0, 0.69, 0, 0.31, 0.43, 0.24);
  const traje = grupo(corpo);
  forma(traje, caixa, "#465d79", 0, 0.73, -0.24, 0.42, 0.49, 0.23);
  forma(traje, esfera, "#f3f6fc", 0, 1.17, 0, 0.32, 0.32, 0.29);
  forma(traje, esfera, "#2c6388", 0, 1.18, 0.22, 0.27, 0.20, 0.16);
  luz(traje, "#74f3ed", 0.05, 0.13, 0.83, 0.24);
  const rosto = grupo(corpo);
  forma(rosto, esfera, "#bc856d", 0, 1.14, 0, 0.21, 0.23, 0.21);
  forma(rosto, esfera, "#373043", 0, 1.26, -0.03, 0.21, 0.14, 0.20);
  for (const x of [-0.075, 0.075]) forma(rosto, esfera, "#202936", x, 1.15, 0.19, 0.024, 0.026, 0.02);
  const pernas = [];
  for (const s of [-1, 1]) {
    const perna = grupo(corpo, s * 0.15, 0.49, 0);
    forma(perna, esfera, cor, 0, -0.2, 0, 0.12, 0.23, 0.13);
    forma(perna, caixa, "#4f607a", 0, -0.38, 0.04, 0.24, 0.15, 0.28);
    pernas.push(perna);
    forma(corpo, esfera, cor, s * 0.33, 0.67, 0, 0.13, 0.27, 0.13);
  }
  const sombra = forma(pai, cilindro, "#172033", 0, 0.017, 0, 0.46, 0.013, 0.35);
  return { corpo, pernas, sombra, traje, rosto, uniforme, cor };
}

function planeta(pai, cor, raio, x, y, z) {
  const astro = forma(pai, esfera, cor, x, y, z, raio, raio, raio);
  const anel = new T.Mesh(new T.SphereGeometry(1, 32, 20), new T.MeshBasicMaterial({
    color: cor, transparent: true, opacity: 0.14, side: T.BackSide,
  }));
  anel.scale.setScalar(1.1);
  astro.add(anel);
  const mancha = cor === "#387baf" ? "#4b9b74" : cor === "#b76e50" ? "#935341" : "#a7a0b4";
  for (let i = 1; i < 26; i++) {
    const y = 1 - 2 * i / 26;
    const angulo = i * 2.39996;
    const r = Math.sqrt(1 - y * y);
    forma(astro, esfera, i % 3 ? mancha : "#bab7c6", r * Math.cos(angulo), y,
      r * Math.sin(angulo), 0.14 + (i % 4) * 0.02, 0.065 + (i % 3) * 0.028, 0.12);
  }
  return astro;
}

const coresSalas = { energia: "#f6be72", radio: "#73dfef", habitat: "#95e3ae" };

function letreiro(pai, texto, cor) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#112036";
  ctx.fillRect(0, 8, 512, 80);
  ctx.fillStyle = cor;
  ctx.fillRect(0, 8, 8, 80);
  ctx.font = "600 33px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, 256, 48, 472);
  const textura = new T.CanvasTexture(canvas);
  textura.colorSpace = T.SRGBColorSpace;
  const etiqueta = new T.Sprite(new T.SpriteMaterial({ map: textura, transparent: true }));
  etiqueta.position.set(0, 2.18, 0);
  etiqueta.scale.set(3.35, 0.62, 1);
  pai.add(etiqueta);
}

function descartar(o) {
  if (o.geometry && ![caixa, esfera, cilindro, triangulo].includes(o.geometry)) o.geometry.dispose();
  if (o.material && ![...materiais.values()].includes(o.material)) {
    o.material.map?.dispose();
    o.material.dispose();
  }
}

export class Cena3D {
  constructor(canvas, mundo) {
    this.mundo = mundo;
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.36;
    this.cena = new T.Scene();
    this.camera = new T.PerspectiveCamera(45, 1, 0.08, 700);
    this.cena.add(new T.HemisphereLight(0xe2edff, 0x725a88, 2.1));
    this.sol = new T.DirectionalLight(0xfef0d2, 3.2);
    this.sol.position.set(-8, 12, 5);
    this.cena.add(this.sol);
    this.alvo = new T.Vector3();
    this.projectado = new T.Vector3();
    this.posicao = new T.Vector3();
    this.eixoX = new T.Vector3();
    this.eixoY = new T.Vector3();
    this.eixoZ = new T.Vector3();
    this.matriz = new T.Matrix4();
    this.vista = "";
    this.movimentoReduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  redimensionar() {
    const canvas = this.renderer.domElement;
    const largura = Math.max(1, canvas.clientWidth);
    const altura = Math.max(1, canvas.clientHeight);
    this.renderer.setSize(largura, altura, false);
    this.camera.aspect = largura / altura;
    this.camera.updateProjectionMatrix();
  }

  ponto(x, y, z, alvo = new T.Vector3()) {
    const raio = this.mundo.raioLua();
    if (!raio || !this.emLua) return alvo.set(x, y, z);
    return alvo.fromArray(quadroLua(x, z, raio).cima).multiplyScalar(raio + y);
  }

  orientar(objecto, x, y, z, giro = 0) {
    this.ponto(x, y, z, objecto.position);
    if (!this.emLua) {
      objecto.rotation.set(0, giro, 0);
      return;
    }
    const { leste, cima, sul } = quadroLua(x, z, this.mundo.raioLua());
    this.matriz.makeBasis(this.eixoX.fromArray(leste), this.eixoY.fromArray(cima), this.eixoZ.fromArray(sul));
    objecto.quaternion.setFromRotationMatrix(this.matriz);
    objecto.rotateY(giro);
  }

  apontarCamera(x, z, altura, afastamento, lateral, giro = 0) {
    const raio = this.emLua && this.mundo.raioLua();
    if (!raio) {
      this.camera.up.set(0, 1, 0);
      this.alvo.set(x + lateral, altura, z + afastamento);
      return;
    }
    const { cima, leste, sul } = quadroLua(x, z, raio);
    this.camera.up.fromArray(cima);
    const cos = Math.cos(giro), sin = Math.sin(giro);
    this.alvo.fromArray(cima).multiplyScalar(raio + altura)
      .addScaledVector(this.eixoX.fromArray(leste), lateral * cos - afastamento * sin)
      .addScaledVector(this.eixoZ.fromArray(sul), lateral * sin + afastamento * cos);
  }

  trocar(vista, destino) {
    const chave = vista + ":" + destino + ":" + Boolean(this.mundo.nave);
    if (chave === this.vista) return;
    this.vista = chave;
    if (this.mapa) {
      this.cena.remove(this.mapa);
      this.mapa.traverse(descartar);
    }
    this.mapa = grupo(this.cena);
    this.emLua = (vista === "pouso" || vista === "superficie") && Boolean(this.mundo.raioLua());
    this.camera.up.set(0, 1, 0);
    this.sol.position.set(-8, 12, 5);
    this.equipamentos = null;
    this.assinaturaEquipamentos = "";
    this.poeira = null;
    this.vento = null;
    this.base = null;
    this.planta = null;
    this.layout = null;
    this.portas = [];
    this.cena.fog = null;
    this.avatares = new Map();
    const terreno = cores[destino] ?? cores.lua;
    this.cena.background = new T.Color(vista === "voo" ? "#060a19" : vista === "hangar" ? "#10192f" : terreno.ceu);
    this.sol.color.set(vista === "hangar" ? "#b5d2ff" : terreno.luz);
    this.campo = estrelas(this.mapa);
    this.veiculo = nave(this.mapa);
    this.astro = null;
    this.terra = null;
    if (vista === "voo") {
      this.terra = planeta(this.mapa, "#387baf", 4.7, -9, 1.8, -12);
      this.astro = planeta(this.mapa, destino === "marte" ? "#b76e50" : "#837c9a", 5.1, 9, 1.5, -17);
      return;
    }
    if (vista === "cabine") {
      this.veiculo.corpo.visible = false;
      this.cabine();
    } else if (vista === "hangar" || vista === "lancamento") this.hangar();
    else this.superficie(terreno);
    if (["hangar", "cabine", "superficie"].includes(vista)) this.avatares.set("eu", astronauta(this.mapa, "#eef4fe"));
  }

  cabine() {
    forma(this.mapa, caixa, "#22364e", 0, -0.19, 0, 14.8, 0.35, 11.2);
    forma(this.mapa, caixa, "#6d8199", 0, 0.5, -5.5, 14.8, 1.3, 0.3);
    for (const x of [-7.3, 7.3]) forma(this.mapa, caixa, "#526d87", x, 0.5, 0, 0.29, 1.25, 10.8);
    for (let z = -4; z <= 5; z += 1) forma(this.mapa, caixa, "#365674", 0, 0.003, z, 14.3, 0.016, 0.035);
    for (const x of [-5.6, 5.6]) {
      forma(this.mapa, caixa, "#64b6d9", x, 0.015, 0, 0.055, 0.029, 9.8);
      for (const z of [-4, 0, 4]) luz(this.mapa, "#91e1ff", 0.09, x, 0.11, z);
    }
    this.astro = planeta(this.mapa, this.mundo.destino === "marte" ? "#b76e50" : "#837c9a", 3.8, -6, 5, -24);
  }

  hangar() {
    forma(this.mapa, caixa, "#26354f", 0, -0.22, 0, 22, 0.4, 15);
    forma(this.mapa, caixa, "#3b5376", 0, 0.01, -0.6, 5.1, 0.03, 6.1);
    forma(this.mapa, caixa, "#415878", 0, 0.4, -7.5, 22, 0.8, 0.32);
    for (let i = -10; i <= 10; i++) {
      forma(this.mapa, caixa, "#42516c", i, 0, 0, 0.017, 0.019, 14.8);
    }
    for (const z of [-5, 0, 5]) {
      forma(this.mapa, caixa, "#536780", 0, 0.01, z, 22, 0.025, 0.035);
      for (const x of [-10.3, 10.3]) luz(this.mapa, "#70efff", 0.085, x, 0.1, z);
    }
    for (const terminal of this.mundo.terminais) {
      forma(this.mapa, caixa, "#72829c", terminal.x, 0.44, terminal.z, 1.35, 0.9, 0.75);
      forma(this.mapa, caixa, terminal.cor, terminal.x, 0.96, terminal.z, 1.12, 0.15, 0.71).rotation.x = -0.2;
      luz(this.mapa, terminal.cor, 0.095, terminal.x, 1.18, terminal.z);
    }
  }

  superficie(coresPlaneta) {
    const moderno = Boolean(this.mundo.nave);
    const lunar = this.mundo.destino !== "marte";
    this.astro = planeta(this.mapa, lunar ? "#387baf" : "#837c9a", lunar ? 2.4 : 0.62, -28, 11, -38);
    if (this.emLua) this.globoLunar(coresPlaneta);
    const relevo = new T.PlaneGeometry(64, 53, 128, 106);
    relevo.rotateX(-Math.PI / 2);
    const vertices = relevo.attributes.position;
    const cor = new T.Color();
    const pigmentos = [];
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), z = vertices.getZ(i);
      const y = this.mundo.altura(x, z);
      if (this.emLua) {
        this.ponto(x, y + 0.026, z, this.posicao);
        vertices.setXYZ(i, this.posicao.x, this.posicao.y, this.posicao.z);
      } else vertices.setY(i, y - 0.015);
      cor.set(coresPlaneta.chao).multiplyScalar(0.88 + Math.sin(x * 0.7 + z * 0.31) * 0.09 + Math.cos(z * 1.7) * 0.05 + y * 0.12);
      pigmentos.push(cor.r, cor.g, cor.b);
    }
    relevo.setAttribute("color", new T.Float32BufferAttribute(pigmentos, 3));
    relevo.computeVertexNormals();
    this.mapa.add(new T.Mesh(relevo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));

    for (const [i, [x, z, tamanho]] of ((moderno || this.emLua) ? this.mundo.superficie.rochas : [[-7, 3.1, 0.88], [6.4, -3.1, 0.36]]).entries()) {
      const rocha = forma(this.mapa, triangulo, coresPlaneta.relevo, 0, 0, 0,
        tamanho * 1.18, tamanho * (0.6 + i % 4 * 0.18), tamanho * 1.05);
      this.orientar(rocha, x, this.mundo.altura(x, z) + tamanho * 0.43, z, i);
    }
    for (let i = 1; i <= 82; i++) {
      const x = (Math.sin(i * 24.17) * 1e4 % 1) * 31;
      const z = (Math.sin(i * 75.91) * 1e4 % 1) * 25;
      if (Math.abs(x) < 11 && z > -3 && z < 11) continue;
      const nave = this.mundo.nave;
      if (nave && Math.hypot(x - nave.x, z - nave.z) < 3) continue;
      const fora = !this.emLua && (Math.abs(x) > 24 || Math.abs(z) > 18);
      const tamanho = fora ? 0.6 + i % 7 * 0.35 : 0.05 + i % 6 * 0.035;
      const pedra = forma(this.mapa, triangulo, coresPlaneta.relevo, 0, 0, 0, tamanho, tamanho * 0.57, tamanho * 0.7);
      this.orientar(pedra, x, this.mundo.altura(x, z) + tamanho * 0.13, z, i);
    }
    for (const local of this.mundo.locaisDaSuperficie()) {
      const posto = grupo(this.mapa);
      this.orientar(posto, local.x, this.mundo.altura(local.x, local.z) + 0.06, local.z);
      if (local.id === "amostra") forma(posto, triangulo, "#d2a36e", 0, 0.2, 0, 0.45, 0.34, 0.48);
      if (local.id === "baliza") {
        forma(posto, cilindro, "#a9b8d0", 0, 0.54, 0, 0.09, 1.14, 0.09);
        luz(posto, "#67e5de", 0.16, 0, 1.2, 0);
      }
      const anel = new T.Mesh(new T.RingGeometry(0.72, 0.79, 40), new T.MeshBasicMaterial({
        color: local.cor, transparent: true, opacity: 0.67, side: T.DoubleSide,
      }));
      anel.rotation.x = -Math.PI / 2;
      posto.add(anel);
    }

    this.planta = grupo(this.mapa);
    const { colunas, linhas } = this.mundo.superficie;
    for (const x of [...colunas.map((c) => c - 2), colunas.at(-1) + 2]) {
      const linha = forma(this.planta, caixa, "#6ab7bf", 0, 0, 0, 0.038, 0.026, 12);
      this.orientar(linha, x, 0.035, 4);
    }
    for (const z of [...linhas.map((l) => l - 2), linhas.at(-1) + 2]) {
      const linha = forma(this.planta, caixa, "#6ab7bf", 0, 0, 0, 20, 0.026, 0.038);
      this.orientar(linha, 0, 0.035, z);
    }

    const criarPoeira = (quantidade, tamanho, opacidade) => {
      const dados = new T.BufferGeometry();
      dados.setAttribute("position", new T.BufferAttribute(new Float32Array(quantidade * 3), 3));
      const pontos = new T.Points(dados, new T.PointsMaterial({
        color: coresPlaneta.poeira, size: tamanho, transparent: true, opacity: opacidade, depthWrite: false,
      }));
      pontos.frustumCulled = false;
      this.mapa.add(pontos);
      return pontos;
    };
    this.poeira = criarPoeira(150, 0.18, 0.75);
    if (!lunar) this.vento = criarPoeira(640, 0.19, 0.58);
  }

  globoLunar(coresPlaneta) {
    const raio = this.mundo.raioLua();
    const geo = new T.SphereGeometry(1, 224, 128);
    const pos = geo.attributes.position;
    const cores = [];
    const cor = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const [x, z] = coordenadasLua([pos.getX(i), pos.getY(i), pos.getZ(i)], raio);
      const altura = this.mundo.altura(x, z);
      const distancia = raio + altura - 0.04;
      pos.setXYZ(i, pos.getX(i) * distancia, pos.getY(i) * distancia, pos.getZ(i) * distancia);
      cor.set(coresPlaneta.chao).multiplyScalar(T.MathUtils.clamp(0.92 + altura * 0.11 + Math.cos(x * 0.12 + z * 0.13) * 0.07, 0.54, 1.22));
      cores.push(cor.r, cor.g, cor.b);
    }
    geo.setAttribute("color", new T.Float32BufferAttribute(cores, 3));
    geo.computeVertexNormals();
    this.mapa.add(new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
    for (const { x, z, raio: escala } of this.mundo.geologia().rochas) {
      const rocha = forma(this.mapa, triangulo, coresPlaneta.relevo, 0, 0, 0, escala * 1.12, escala * 0.57, escala);
      this.orientar(rocha, x, this.mundo.altura(x, z) + escala * 0.39, z, x);
    }
  }

  actualizarEquipamentos(tempo) {
    const postos = this.mundo.postos;
    const chave = postos.map((p) => [p.id, p.x, p.z].join(":")).join(",");
    if (chave !== this.assinaturaEquipamentos) {
      this.assinaturaEquipamentos = chave;
      if (this.equipamentos) {
        this.mapa.remove(this.equipamentos);
        this.equipamentos.traverse(descartar);
      }
      this.equipamentos = grupo(this.mapa);
      this.modelos = new Map();
      for (const p of postos) {
        const modelo = montarEquipamento(this.equipamentos, p, { forma, grupo, luz, caixa, cilindro, esfera });
        this.orientar(modelo.raiz, p.x, this.mundo.altura(p.x, p.z) + 0.062, p.z);
        this.modelos.set(p.id, modelo);
      }
    }
    for (const [id, modelo] of this.modelos ?? []) {
      const efeito = this.mundo.feedbackPosto;
      animarEquipamento(modelo, {
        falha: id === this.mundo.postoAlvo,
        teste: id === this.mundo.postoTeste,
        efeito: id === efeito?.posto && performance.now() - efeito.instante < 4800 ? efeito.tipo : null,
      }, tempo, this.movimentoReduzido);
    }
  }

  actualizarBase() {
    const salas = this.mundo.salas;
    const chave = JSON.stringify(salas);
    if (this.layout === chave) return;
    this.layout = chave;
    if (this.base) {
      this.mapa.remove(this.base);
      this.base.traverse(descartar);
    }
    this.base = grupo(this.mapa);
    this.portas = [];
    for (const { x, z, meiaX, meiaZ } of paredesDaBase(salas)) {
      const parede = grupo(this.base);
      this.orientar(parede, x, 0.047, z);
      forma(parede, caixa, "#879ab2", 0, 0.58, 0, meiaX * 2, 1.16, meiaZ * 2);
      forma(parede, caixa, "#ccd7e3", 0, 1.20, 0, meiaX * 2, 0.12, meiaZ * 2);
    }
    for (const [id, { x, z }] of Object.entries(salas)) {
      const sala = grupo(this.base);
      this.orientar(sala, x, 0.047, z);
      const cor = coresSalas[id];
      forma(sala, caixa, "#334e65", 0, 0.015, 0, 3.98, 0.055, 3.98);
      forma(sala, caixa, cor, 0, 0.049, -1.72, 3.68, 0.024, 0.065);
      for (const lado of [-1, 1]) {
        forma(sala, caixa, "#273c55", lado * 1.81, 0.061, 0, 0.12, 0.052, 3.35);
        for (const posicao of [-1.4, 1.4]) luz(sala, cor, 0.038, lado * 1.78, 0.09, posicao);
      }
      if (!Object.values(salas).some((p) => p.x === x && p.z === z + 4)) {
        for (const lado of [-1, 1]) forma(sala, caixa, cor, lado * 1.0, 0.65, 2, 0.12, 1.3, 0.24);
        forma(sala, caixa, cor, 0, 1.82, 2, 2.12, 0.12, 0.25);
        forma(sala, caixa, "#516d83", 0, 0.024, 2, 1.76, 0.065, 0.39);
        const folha = forma(sala, caixa, "#395b75", 0, 0.87, 2, 1.71, 1.66, 0.12);
        const aviso = luz(sala, "#76f1bd", 0.09, 0.83, 1.52, 2.16);
        this.portas.push({ x, z: z + 2, folha, aviso });
      }
      letreiro(sala, this.mundo.superficie.salas[id], cor);
    }
  }

  actualizarPortas() {
    const { jogador, remotos } = this.mundo;
    for (const { x, z, folha, aviso } of this.portas) {
      const proximos = [jogador, ...remotos].filter((j) => Math.hypot(j.x - x, j.z - z) < 2.55);
      const abre = proximos.some((j) => j.traje !== false);
      const acessoNegado = proximos.length && !abre;
      folha.scale.y = this.movimentoReduzido ? (abre ? 0.08 : 1.66)
        : T.MathUtils.lerp(folha.scale.y, abre ? 0.08 : 1.66, 0.25);
      folha.position.y = 1.7 - folha.scale.y / 2;
      aviso.material.color.set(acessoNegado ? "#ff7c60" : "#76f1bd");
    }
  }

  actualizarVento(tempo) {
    if (!this.vento) return;
    const fora = !this.mundo.dentro();
    this.vento.visible = this.mundo.tempestade;
    this.cena.fog = this.mundo.tempestade && fora ? this.nevoa ??= new T.FogExp2("#bb744c", 0.074) : null;
    if (!this.vento.visible) return;
    const pos = this.vento.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = ((i * 7.772 + tempo * (6 + i % 7)) % 60) - 30;
      const z = ((i * 11.173 + tempo * 1.7) % 45) - 22.5;
      if (this.mundo.dentro(x, z)) pos.setXYZ(i, x, -4, z);
      else pos.setXYZ(i, x, this.mundo.altura(x, z) + 0.12 + (i % 17) * 0.16, z);
    }
    pos.needsUpdate = true;
  }

  actualizarAvatares(segundos, destino, salto) {
    const viajantes = [{ ...this.mundo.jogador, id: "eu", salto }, ...this.mundo.remotos];
    for (const [id, avatar] of this.avatares) {
      if (!viajantes.some((jogador) => jogador.id === id)) {
        this.mapa.remove(avatar.corpo, avatar.sombra);
        avatar.corpo.traverse(descartar);
        this.avatares.delete(id);
      }
    }
    for (const j of viajantes) {
      if (!this.avatares.has(j.id)) this.avatares.set(j.id, astronauta(this.mapa, "#a8d7ff"));
      const a = this.avatares.get(j.id);
      const distancia = a.x === undefined ? 0 : this.mundo.direccao(a.x, a.z, j.x, j.z).distancia;
      a.x = j.x;
      a.z = j.z;
      const passo = j.id === "eu" ? j.passo : distancia > 0.012 ? segundos * 9 : 0;
      const oscilacao = passo && !this.movimentoReduzido ? Math.sin(passo) : 0;
      const chao = this.mundo.altura(j.x, j.z) + (this.mundo.dentro(j.x, j.z) ? 0.055 : 0);
      a.traje.visible = j.traje !== false;
      a.rosto.visible = !a.traje.visible;
      a.uniforme.material = material(a.traje.visible ? a.cor : "#408681");
      if (j.rumo !== undefined) a.rumo = j.rumo;
      else if (distancia > 0.012) a.rumo = Math.atan2(j.alvoX - j.x, j.alvoZ - j.z);
      const rumo = a.rumo ?? 0;
      this.orientar(a.corpo, j.x, chao + (j.salto || 0) + Math.abs(oscilacao) * (destino === "lua" ? 0.17 : 0.09), j.z, rumo);
      this.orientar(a.sombra, j.x, chao + 0.034, j.z);
      a.pernas[0].rotation.x = oscilacao * 0.62;
      a.pernas[1].rotation.x = -oscilacao * 0.62;
    }
  }

  desenhar({ tempo, vista, destino, progresso, transicao, salto, alerta, sinal }) {
    this.trocar(vista, destino);
    const nave = this.veiculo.corpo;
    const t = this.movimentoReduzido ? 0 : tempo;
    const local = this.mundo.nave ?? { x: 0, z: 0 };
    const chaoNave = this.mundo.altura(local.x, local.z);
    this.veiculo.chama.visible = vista === "voo" || vista === "lancamento" || (vista === "pouso" && transicao < 0.94);
    this.veiculo.chama.scale.set(0.36, 0.7 + Math.sin(t * 38) * 0.15, 0.36);
    if (vista === "voo") {
      this.camera.position.set(0, 4.3, this.camera.aspect < 1 ? 24 : 15);
      this.camera.lookAt(0, 0.9, 0);
      this.campo.position.z = (t * 3) % 30;
      this.terra.position.x = -6 - progresso * 11;
      this.astro.position.x = 9 - progresso * 5;
      this.astro.position.z = -24 + progresso * 8;
      this.terra.rotation.y = t * 0.09;
      this.astro.rotation.y = t * 0.16;
      nave.position.set(-3 + progresso * 5, Math.sin(t * 1.6) * 0.13, 2);
      nave.rotation.set(0.16, 0.78, -0.88 + Math.sin(t * 1.1) * 0.07 + sinal * 0.12);
    } else if (vista === "lancamento") {
      const altura = transicao ** 2 * 17;
      nave.position.set(0, altura + 0.16, -0.6);
      this.camera.position.set(8.5, 4 + altura * 0.75, 12);
      this.camera.lookAt(0, 0.8 + altura, -0.6);
    } else if (vista === "pouso") {
      const p = T.MathUtils.smoothstep(transicao, 0, 1);
      this.orientar(nave, local.x - 2 * (1 - p), chaoNave + 12 * (1 - p) + 0.12, local.z);
      nave.rotateZ((1 - p) * -0.31 + Math.sin(t * 14) * (1 - p) * 0.035);
      this.apontarCamera(local.x, local.z, chaoNave + 5.8 + (1 - p) * 3, 11.5, 8);
      this.camera.position.copy(this.alvo);
      this.camera.lookAt(this.ponto(local.x, chaoNave + 1 + (1 - p) * 5, local.z, this.posicao));
    } else {
      if (vista !== "cabine") this.orientar(nave, local.x, chaoNave + 0.12, vista === "hangar" ? -0.6 : local.z);
      const j = this.mundo.jogador;
      const distancia = this.camera.aspect < 0.9 ? 13 : 10.5;
      const altura = this.mundo.altura(j.x, j.z);
      this.apontarCamera(j.x, j.z, altura + distancia, distancia, 3.2, j.giro);
      if (this.ultimaVista !== vista || this.movimentoReduzido) this.camera.position.copy(this.alvo);
      else this.camera.position.lerp(this.alvo, 0.11);
      this.camera.lookAt(this.ponto(j.x, altura + 0.35, this.emLua ? j.z : j.z - 0.8, this.posicao));
      if (this.emLua) this.sol.position.copy(this.camera.up).multiplyScalar(12).addScaledVector(this.eixoX, -8);
      this.actualizarAvatares(t, vista === "superficie" ? destino : null, salto);
      if (vista !== "hangar") this.actualizarEquipamentos(t);
    }
    if (this.planta) {
      this.planta.visible = this.mundo.cena === "instalacao";
      this.actualizarBase();
      this.actualizarPortas();
      this.actualizarVento(t);
    }
    if (this.poeira) {
      const intensidade = vista === "pouso" ? limite((transicao - 0.55) * 2.8, 0, 1) : Math.max(sinal, alerta ? 0.22 : 0);
      this.poeira.visible = intensidade > 0.02;
      this.orientar(this.poeira, local.x, chaoNave, local.z);
      if (this.poeira.visible) {
        const pos = this.poeira.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const fase = (t * (0.67 + i % 7 * 0.08) + i / pos.count) % 1;
          const angulo = i * 2.39996;
          const raio = fase * (2 + (i % 5) * 0.4) * intensidade;
          pos.setXYZ(i, Math.cos(angulo) * raio, 0.09 + Math.sin(fase * Math.PI) * intensidade * 0.64, Math.sin(angulo) * raio);
        }
        pos.needsUpdate = true;
      }
    }
    this.ultimaVista = vista;
    this.renderer.render(this.cena, this.camera);
  }

  projectar(x, y, z) {
    const pos = this.ponto(x, y, z, this.projectado).project(this.camera);
    const canvas = this.renderer.domElement;
    return { x: (pos.x + 1) * canvas.clientWidth / 2, y: (1 - pos.y) * canvas.clientHeight / 2,
      visivel: pos.z >= -1 && pos.z <= 1 && Math.abs(pos.x) < 0.98 && Math.abs(pos.y) < 0.94 };
  }
}
