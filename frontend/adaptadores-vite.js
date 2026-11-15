import gsap from "gsap";
import { Howl } from "howler";
import nipplejs from "nipplejs";

export function criarJoystick(zona, _alavanca, actualizar) {
  zona.classList.add("tem-nipple");
  const opcoes = {
    zone: zona, mode: "static", position: { left: "50%", top: "50%" },
    color: "#8ad8e2", size: zona.clientWidth * 0.83, restOpacity: 0.75
  };
  const gestor = nipplejs.create(opcoes);
  let bloqueadoAteSoltar = false;
  gestor.on("move", (_evento, dados) => {
    if (bloqueadoAteSoltar) return;
    const forca = Math.min(1, dados.force);
    const vector = dados.vector ?? {
      x: Math.cos(dados.angle.radian) * forca,
      y: Math.sin(dados.angle.radian) * forca
    };
    actualizar({ x: vector.x, z: -vector.y });
  });
  gestor.on("end", () => {
    bloqueadoAteSoltar = false;
    actualizar(null);
  });
  gestor.on("start", () => {
    bloqueadoAteSoltar = false;
  });
  return {
    parar() {
      bloqueadoAteSoltar = true;
      actualizar(null);
    }
  };
}

export function animarTerminal(dialogo) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.fromTo(dialogo, { opacity: 0, y: 9 }, {
    opacity: 1, y: 0, duration: 0.18, ease: "power2.out", clearProps: "opacity,transform"
  });
}

export function criarSom(urls) {
  const sons = {
    ambiente: new Howl({ src: [urls.ambiente.href], loop: true, volume: 0.18 }),
    passo: new Howl({ src: [urls.passo.href], volume: 0.18 }),
    terminal: new Howl({ src: [urls.terminal.href], volume: 0.23 })
  };
  let activo = false;
  return {
    alternar() {
      activo = !activo;
      if (activo) sons.ambiente.play();
      else Object.values(sons).forEach((som) => som.stop());
      return activo;
    },
    tocar(nome) {
      if (activo) sons[nome].play();
    }
  };
}
