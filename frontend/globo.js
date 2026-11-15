import * as T from "./vendor/three.module.js";
import { custoPouso } from "./terreno.js";

function texturaGlobo(marte) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = marte ? "#a65b40" : "#777789";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let semente = 7283;
  const aleatorio = () => {
    semente = (semente * 1664525 + 1013904223) >>> 0;
    return semente / 2 ** 32;
  };
  for (let i = 0; i < 830; i++) {
    const x = aleatorio() * canvas.width;
    const y = aleatorio() * canvas.height;
    const raio = 1 + aleatorio() ** 3 * 36;
    const gradiente = ctx.createRadialGradient(x, y, raio * .15, x, y, raio);
    gradiente.addColorStop(0, i % 2 ? "#fff1d64a" : "#271c355a");
    gradiente.addColorStop(1, "#00000000");
    ctx.fillStyle = gradiente;
    ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2);
  }
  for (let i = 0; i < (marte ? 36 : 88); i++) {
    const x = aleatorio() * canvas.width, y = aleatorio() * canvas.height, r = 2 + aleatorio() ** 2 * 25;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = "#3a293342";
    ctx.fill();
    ctx.strokeStyle = "#f9dccc38";
    ctx.stroke();
  }
  ctx.strokeStyle = "#d3ecff44";
  ctx.lineWidth = .8;
  for (let x = 0; x < canvas.width; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  const textura = new T.CanvasTexture(canvas);
  textura.colorSpace = T.SRGBColorSpace;
  return textura;
}

export function abrirGlobo(destino, nivel, confirmar, seleccionado, jogador) {
  const dialogo = document.getElementById("globo-dialogo");
  const canvas = document.getElementById("globo-canvas");
  const lat = document.getElementById("globo-lat");
  const lon = document.getElementById("globo-lon");
  const detalhe = document.getElementById("globo-detalhe");
  const painelErro = document.getElementById("globo-erro");
  const botao = document.getElementById("globo-confirmar");
  const marte = destino === "marte";
  let renderer, mapa, camera, globo, alvo, marcadorJogador, sol, textura, observador;
  let pressionado, espera = false;
  const apontador = new T.Vector2();
  const raio = new T.Raycaster();
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  if (dialogo.open) return;
  const podeEscolher = typeof confirmar === "function";
  document.getElementById("globo-titulo").textContent = (podeEscolher ? "Seleccionar pouso · " : "Mapa de ") + (marte ? "Marte" : "Lua");
  document.getElementById("globo-controlos").hidden = !podeEscolher;
  document.getElementById("globo-ajuda").textContent = podeEscolher
    ? "Arrasta para rodar e toca para marcar o ponto de pouso."
    : jogador ? "Ciano marca o pouso. Laranja mostra onde estás na Lua."
      : seleccionado ? "Arrasta para rodar. O ponto luminoso marca o local de pouso." : "Arrasta para rodar e explorar o globo.";
  botao.hidden = !podeEscolher;
  lat.value = seleccionado?.lat ?? 0;
  lon.value = seleccionado?.lon ?? 90;
  canvas.hidden = false;
  painelErro.textContent = "";
  botao.disabled = false;
  dialogo.showModal();

  function desenhar() {
    if (!renderer) return;
    const w = canvas.clientWidth || 400, h = canvas.clientHeight || 260;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(mapa, camera);
  }

  function actualizar() {
    const latitude = Number(lat.value);
    const longitude = Math.abs(latitude) === 90 ? 0 : Number(lon.value) === 180 ? -180 : Number(lon.value);
    const custo = custoPouso(latitude, longitude);
    document.getElementById("globo-coord").textContent = (jogador
      ? "A tua posição · " + jogador.lat.toFixed(1) + "° lat. · " + jogador.lon.toFixed(1) + "° long."
      : latitude + "° lat. · " + longitude + "° long.");
    const riscos = [];
    if (Math.abs(latitude) >= 52) riscos.push(marte ? "Nas regiões polares, o frio pode exigir mais energia para aquecer os equipamentos." : "O Sol baixo cria sombras longas e dificulta ver o relevo.");
    if (Math.abs(longitude) >= 125) riscos.push(marte ? "Neste sector da simulação, o relevo irregular exige mais propulsante." : "Neste sector da face afastada, precisas de um retransmissor para comunicar com a Terra.");
    if (!riscos.length) riscos.push(marte ? "A poeira pode reduzir a visibilidade durante a aproximação." : "Rochas, crateras e encostas podem dificultar o pouso.");
    botao.disabled = espera;
    detalhe.hidden = !podeEscolher;
    document.getElementById("globo-coord").hidden = !podeEscolher && !seleccionado && !jogador;
    detalhe.textContent = riscos.join(" ") + (podeEscolher ? " Consumo previsto · " : " Consumo do pouso · ") + custo + " unidades de propulsante."
      + (nivel === "comandante" ? " Compara o consumo previsto com a reserva da nave." : "");
    if (alvo) {
      alvo.visible = podeEscolher || Boolean(seleccionado);
      const phi = T.MathUtils.degToRad(latitude), theta = T.MathUtils.degToRad(longitude);
      alvo.position.set(Math.cos(phi) * Math.cos(theta), Math.sin(phi), Math.cos(phi) * Math.sin(theta)).multiplyScalar(1.025);
      desenhar();
    }
  }

  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    mapa = new T.Scene();
    mapa.background = new T.Color("#080e22");
    camera = new T.PerspectiveCamera(42, 1, .1, 50);
    camera.position.set(0, 0, 3.65);
    globo = new T.Group();
    globo.rotation.order = "XYZ";
    globo.rotation.y = T.MathUtils.degToRad((jogador?.lon ?? Number(lon.value)) - 90);
    globo.rotation.x = T.MathUtils.degToRad(jogador?.lat ?? Number(lat.value));
    mapa.add(globo);
    textura = texturaGlobo(marte);
    sol = new T.Mesh(new T.SphereGeometry(1, 72, 48), new T.MeshStandardMaterial({ map: textura, roughness: .98 }));
    globo.add(sol);
    alvo = new T.Mesh(new T.SphereGeometry(.045, 20, 14), new T.MeshBasicMaterial({ color: "#8cfaff" }));
    globo.add(alvo);
    if (jogador) {
      const phi = T.MathUtils.degToRad(jogador.lat), theta = T.MathUtils.degToRad(jogador.lon);
      marcadorJogador = new T.Mesh(new T.SphereGeometry(0.037, 18, 12), new T.MeshBasicMaterial({ color: "#ffab66" }));
      marcadorJogador.position.set(Math.cos(phi) * Math.cos(theta), Math.sin(phi), Math.cos(phi) * Math.sin(theta)).multiplyScalar(1.065);
      globo.add(marcadorJogador);
    }
    mapa.add(new T.HemisphereLight("#edf6ff", "#696d88", 2.35));
    const luz = new T.DirectionalLight("#ffedce", 2);
    luz.position.set(-3, 4, 4);
    mapa.add(luz);
    observador = new ResizeObserver(desenhar);
    observador.observe(canvas);
  } catch {
    renderer?.dispose();
    renderer = null;
    canvas.hidden = true;
    painelErro.textContent = podeEscolher ? "Usa os controlos de latitude e longitude para escolher." : "As coordenadas do pouso estão abaixo.";
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (!renderer || e.button !== 0) return;
    pressionado = { x: e.clientX, y: e.clientY, arrastou: false };
    canvas.setPointerCapture(e.pointerId);
  }, options);
  canvas.addEventListener("pointermove", (e) => {
    if (!pressionado) return;
    const dx = e.clientX - pressionado.x, dy = e.clientY - pressionado.y;
    if (Math.hypot(dx, dy) < 3 && !pressionado.arrastou) return;
    globo.rotation.y += dx * .01;
    globo.rotation.x = T.MathUtils.clamp(globo.rotation.x + dy * .01, -1.45, 1.45);
    pressionado = { x: e.clientX, y: e.clientY, arrastou: true };
    desenhar();
  }, options);
  canvas.addEventListener("pointerup", (e) => {
    if (!pressionado) return;
    const arrastou = pressionado.arrastou;
    pressionado = null;
    if (arrastou || !podeEscolher) return;
    const box = canvas.getBoundingClientRect();
    apontador.set((e.clientX - box.left) / box.width * 2 - 1, -(e.clientY - box.top) / box.height * 2 + 1);
    raio.setFromCamera(apontador, camera);
    const acerto = raio.intersectObject(sol)[0];
    if (!acerto) return;
    const p = globo.worldToLocal(acerto.point).normalize();
    lat.value = Math.round(T.MathUtils.radToDeg(Math.asin(T.MathUtils.clamp(p.y, -1, 1))));
    lon.value = Math.round(T.MathUtils.radToDeg(Math.atan2(p.z, p.x)));
    actualizar();
  }, options);
  canvas.addEventListener("pointercancel", () => { pressionado = null; }, options);
  for (const campo of [lat, lon]) campo.addEventListener("input", () => {
    if (globo) {
      globo.rotation.y = T.MathUtils.degToRad(Number(lon.value) - 90);
      globo.rotation.x = T.MathUtils.degToRad(Number(lat.value));
    }
    actualizar();
  }, options);
  botao.addEventListener("click", async () => {
    if (espera || !podeEscolher) return;
    espera = true;
    botao.disabled = true;
    try {
      await confirmar({ lat: Number(lat.value), lon: Number(lon.value) });
      if (dialogo.open) dialogo.close();
    } catch (e) {
      painelErro.textContent = e.message;
    } finally {
      espera = false;
      botao.disabled = false;
    }
  }, options);
  dialogo.addEventListener("close", () => {
    listeners.abort();
    observador?.disconnect();
    textura?.dispose();
    sol?.geometry.dispose();
    sol?.material.dispose();
    alvo?.geometry.dispose();
    alvo?.material.dispose();
    marcadorJogador?.geometry.dispose();
    marcadorJogador?.material.dispose();
    renderer?.dispose();
  }, { once: true });
  actualizar();
}
