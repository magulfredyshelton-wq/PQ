const TAU = 2 * Math.PI;

export function quadroLua(x, z, raio) {
  const lon = x / raio, lat = z / raio;
  const sl = Math.sin(lon), cl = Math.cos(lon), sf = Math.sin(lat), cf = Math.cos(lat);
  return {
    cima: [sl * cf, cl * cf, sf],
    leste: [cl, -sl, 0],
    sul: [-sl * sf, -cl * sf, cf],
  };
}

const produto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function coordenadasLua([x, y, z], raio) {
  return [Math.atan2(x, y) * raio, Math.atan2(z, Math.hypot(x, y)) * raio];
}

export function passoLua(x, z, dx, dz, raio, giro = 0) {
  const { cima, leste, sul } = quadroLua(x, z, raio);
  const comprimento = Math.hypot(dx, dz);
  if (!comprimento) return { x, z, giro };
  const a = comprimento / raio;
  const cos = Math.cos(a), sin = Math.sin(a);
  const orientacao = Math.atan2(dz, dx);
  const rumo = leste.map((e, i) => (dx * e + dz * sul[i]) / comprimento);
  const normal = cima.map((v, i) => cos * v + sin * rumo[i]);
  const tangente = rumo.map((v, i) => cos * v - sin * cima[i]);
  const [nx, nz] = coordenadasLua(normal, raio);
  const depois = quadroLua(nx, nz, raio);
  const curso = Math.atan2(produto(tangente, depois.sul), produto(tangente, depois.leste));
  const rotacao = giro + curso - orientacao;
  return { x: nx, z: nz, giro: Math.atan2(Math.sin(rotacao), Math.cos(rotacao)) };
}

export function direccaoLua(x, z, alvoX, alvoZ, raio) {
  const origem = quadroLua(x, z, raio), alvo = quadroLua(alvoX, alvoZ, raio).cima;
  const dx = produto(alvo, origem.leste), dz = produto(alvo, origem.sul);
  return { dx, dz, distancia: raio * Math.atan2(Math.hypot(dx, dz), produto(alvo, origem.cima)) };
}

export function coordenadasNoGlobo(x, z, pouso, raio) {
  if (!pouso) return null;
  const base = quadroLua(pouso.x, pouso.z, raio);
  const cima = quadroLua(x, z, raio).cima;
  const mundo = quadroLua(pouso.lon * TAU * raio / 360, -pouso.lat * TAU * raio / 360, raio);
  const pesos = [produto(cima, base.cima), produto(cima, base.leste), produto(cima, base.sul)];
  const resultado = mundo.cima.map((v, i) => v * pesos[0] + mundo.leste[i] * pesos[1] + mundo.sul[i] * pesos[2]);
  const [lon, lat] = coordenadasLua(resultado, raio);
  return { lat: -lat * 360 / (TAU * raio), lon: lon * 360 / (TAU * raio) };
}

export function terrenoLunar(raio) {
  let semente = 79039;
  const numero = () => {
    semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0;
    return semente / 2 ** 32;
  };
  const pontos = (total, tamanho, minimo) => Array.from({ length: total }, () => {
    const x = (numero() - 0.5) * TAU * raio;
    const z = Math.asin(2 * numero() - 1) * raio;
    return { x, z, centro: quadroLua(x, z, raio).cima, raio: minimo + tamanho * numero() };
  }).filter((p) => Math.hypot(p.x, p.z) > 48 + p.raio);

  const crateras = pontos(46, 19, 6);
  const rochas = pontos(210, 1.65, 0.65);
  function altura(x, z) {
    const normal = quadroLua(x, z, raio).cima;
    const [a, b, c] = normal;
    const peso = Math.min(1, Math.max(0, (Math.hypot(x, z) - 32) / 28));
    if (!peso) return 0;
    let y = (Math.sin(a * 19 + c * 8) + Math.cos(b * 22 + a * 10)) * 1.5;
    y += Math.sin(c * 34 + b * 20) * Math.cos(a * 21) * 0.65;
    for (const cratera of crateras) {
      const d2 = 2 * raio ** 2 * Math.max(0, 1 - produto(normal, cratera.centro)) / cratera.raio ** 2;
      if (d2 < 1) y -= cratera.raio * 0.21 * (1 - d2) ** 2;
      if (d2 >= 1 && d2 < 1.56) y += Math.sin((d2 - 1) * Math.PI / 0.56) * 0.65;
    }
    return y * peso;
  }
  function bateRocha(x, z, margem) {
    const normal = quadroLua(x, z, raio).cima;
    return rochas.some((p) => (1 - produto(normal, p.centro)) * 2 * raio ** 2 < (p.raio + margem) ** 2);
  }
  return { altura, bateRocha, rochas };
}

