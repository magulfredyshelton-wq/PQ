import * as T from "./vendor/three.module.js";

export function montarEquipamento(pai, posto, { forma, grupo, luz, caixa, cilindro, esfera }) {
  const raiz = grupo(pai);
  const quadro = grupo(raiz);
  const estrutura = "#40536a", frente = "#9ab1c6", cabos = "#c9a577";
  const bloco = (cor, x, y, z, a, b, c) => forma(quadro, caixa, cor, x, y, z, a, b, c);
  const tubo = (cor, x, y, z, a, b) => forma(quadro, cilindro, cor, x, y, z, a, b, a);
  const { tipo } = posto;

  if (tipo === "rover") {
    bloco(estrutura, 0, 0.46, 0, 1.3, 0.36, 1.4);
    bloco("#a89f90", 0, 0.7, 0, 0.9, 0.23, 0.88);
    for (const x of [-0.57, 0.57]) {
      for (const z of [-0.49, 0.49]) tubo("#283444", x, 0.25, z, 0.26, 0.21).rotation.z = Math.PI / 2;
    }
  } else {
    bloco(estrutura, 0, 0.28, 0, 0.56, 0.56, 0.53);
    bloco(frente, 0, 0.57, 0, 0.68, 0.12, 0.57);
  }

  const partes = [];
  if (tipo === "antena") {
    tubo(frente, 0, 0.85, 0, 0.07, 0.55);
    const prato = forma(quadro, esfera, "#8aacc4", 0, 1.12, 0, 0.36, 0.09, 0.31);
    prato.rotation.x = 0.55;
    partes.push(prato);
  } else if (tipo === "solar") {
    const placa = bloco("#42689b", 0, 0.88, 0, 0.84, 0.07, 0.6);
    placa.rotation.x = -0.43;
    for (const x of [-0.23, 0, 0.23]) bloco("#7095c9", x, 0.922, 0, 0.024, 0.01, 0.47).rotation.x = -0.43;
    partes.push(placa);
  } else if (tipo === "valvula" || tipo === "filtro") {
    for (const x of [-0.17, 0.17]) {
      tubo(tipo === "valvula" ? cabos : "#759498", x, 0.83, 0, 0.105, 0.46);
      partes.push(tubo("#e69556", x, 1.07, 0, 0.108, 0.085));
    }
  } else if (tipo === "abrigo") {
    bloco("#8192a1", 0, 0.9, -0.12, 0.68, 0.66, 0.22);
    bloco("#574e69", 0, 0.9, 0, 0.38, 0.42, 0.12);
  } else if (tipo === "bateria" || tipo === "bancada") {
    for (const x of [-0.19, 0, 0.19]) bloco(tipo === "bateria" ? "#b69563" : "#a1b6c1", x, 0.75, 0, 0.12, 0.24, 0.29);
  } else {
    bloco("#224258", 0, 0.81, -0.08, 0.58, 0.35, 0.09).rotation.x = -0.18;
    for (const x of [-0.17, 0, 0.17]) bloco("#72a1c6", x, 0.78, -0.027, 0.09, 0.05 + Math.abs(x), 0.025);
  }

  const sinal = luz(quadro, "#6ff0c7", 0.067, 0.23, tipo === "rover" ? 0.82 : 0.67, 0.22);
  const alvo = luz(quadro, "#ffbd78", 0.12, 0, 1.63, 0);
  const anel = new T.Mesh(new T.RingGeometry(0.49, 0.53, 28), new T.MeshBasicMaterial({
    color: "#ffc286", transparent: true, opacity: 0.55, side: T.DoubleSide,
  }));
  anel.rotation.x = -Math.PI / 2;
  anel.position.y = 0.065;
  quadro.add(anel);
  return { raiz, sinal, alvo, anel, partes };
}

export function animarEquipamento(modelo, estado, tempo, reduzido) {
  const { sinal, alvo, anel, partes } = modelo;
  const { falha, teste, efeito } = estado;
  const pulso = reduzido ? 1 : (0.65 + Math.sin(tempo * 7.5) * 0.35);
  const cor = teste ? "#9befff" : (falha || efeito === "risco") ? "#ffa763" : "#70f1c2";
  sinal.material.color.set(cor);
  sinal.scale.setScalar(0.063 * (falha ? 1 + pulso * 0.36 : 1));
  alvo.visible = falha || Boolean(efeito) || teste;
  alvo.material.color.set(cor);
  alvo.scale.setScalar(0.085 + (alvo.visible ? pulso * 0.066 : 0));
  anel.visible = alvo.visible;
  anel.material.color.set(cor);
  anel.material.opacity = 0.28 + pulso * 0.47;
  anel.scale.setScalar(1 + (teste || efeito ? (1 - pulso) * 0.7 : 0));
  for (const parte of partes) {
    parte.rotation.y = reduzido || !alvo.visible ? 0 : Math.sin(tempo * (falha ? 7 : 3)) * 0.46;
  }
}

