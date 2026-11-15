export function criarJoystick(zona, alavanca, actualizar) {
  let ponteiro = null;

  function mover(evento) {
    const caixa = zona.getBoundingClientRect();
    const x = evento.clientX - caixa.left - caixa.width / 2;
    const z = evento.clientY - caixa.top - caixa.height / 2;
    const alcance = (caixa.width - alavanca.offsetWidth) / 2 - 5;
    const escala = Math.max(alcance, Math.hypot(x, z));
    const direccao = { x: x / escala, z: z / escala };
    alavanca.style.transform = `translate(${direccao.x * alcance}px, ${direccao.z * alcance}px)`;
    actualizar(direccao);
  }

  function parar() {
    const anterior = ponteiro;
    ponteiro = null;
    alavanca.style.transform = "";
    actualizar(null);
    if (anterior !== null && zona.hasPointerCapture(anterior)) zona.releasePointerCapture(anterior);
  }

  zona.addEventListener("pointerdown", (evento) => {
    if (ponteiro !== null || evento.button !== 0) return;
    ponteiro = evento.pointerId;
    zona.setPointerCapture(ponteiro);
    mover(evento);
    evento.preventDefault();
  });
  zona.addEventListener("pointermove", (evento) => {
    if (evento.pointerId === ponteiro) mover(evento);
  });
  for (const nome of ["pointerup", "pointercancel", "lostpointercapture"]) {
    zona.addEventListener(nome, (evento) => {
      if (evento.pointerId === ponteiro) parar();
    });
  }

  return { parar };
}

export function animarTerminal(dialogo) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  dialogo.animate([{ opacity: 0, transform: "translateY(9px)" },
    { opacity: 1, transform: "translateY(0)" }], { duration: 180, easing: "ease-out" });
}

export function criarSom(urls) {
  const ambiente = new Audio(urls.ambiente);
  ambiente.loop = true;
  ambiente.volume = 0.18;
  const passo = new Audio(urls.passo);
  passo.volume = 0.18;
  const terminal = new Audio(urls.terminal);
  terminal.volume = 0.23;
  let activo = false;

  function tocar(audio) {
    audio.play().catch(() => {});
  }

  return {
    alternar() {
      activo = !activo;
      if (activo) tocar(ambiente);
      else {
        ambiente.pause();
        passo.pause();
        terminal.pause();
      }
      return activo;
    },
    tocar(nome) {
      if (!activo) return;
      const audio = nome === "passo" ? passo : terminal;
      audio.currentTime = 0;
      tocar(audio);
    }
  };
}
