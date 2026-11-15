export function custoPouso(lat, lon) {
  return Math.abs(lat) >= 52 || Math.abs(lon) >= 125 ? 18 : 12;
}

export function alturaTerreno(x, z, crateras) {
  let altura = 0;
  for (const [cx, cz, raio, profundidade] of crateras) {
    const d = Math.hypot(x - cx, z - cz) / raio;
    if (d < 1) altura -= profundidade * (1 - d * d) ** 2;
    if (d > 0.82 && d < 1.25) altura += 0.20 * Math.sin(Math.PI * (d - 0.82) / 0.43);
  }
  return altura;
}

export function salaEm(salas, x, z, meia = 2) {
  return Object.keys(salas).find((id) => Math.abs(x - salas[id].x) <= meia && Math.abs(z - salas[id].z) <= meia);
}

export function paredesDaBase(salas, meia = 2) {
  const paredes = [];
  for (const { x, z } of Object.values(salas)) {
    for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const vizinha = Object.values(salas).some((p) => p.x === x + dx * meia * 2 && p.z === z + dz * meia * 2);
      if (vizinha) continue;
      const meioX = x + dx * meia, meioZ = z + dz * meia;
      const segmentos = dz === 1 ? [[-1.47, 1.06], [1.47, 1.06]] : [[0, 4]];
      for (const [offset, comprimento] of segmentos) paredes.push({
        x: meioX + (dz ? offset : 0), z: meioZ + (dx ? offset : 0),
        meiaX: dz ? comprimento / 2 : 0.13, meiaZ: dx ? comprimento / 2 : 0.13,
      });
    }
  }
  return paredes;
}

export function celulaValida(salas, x, z) {
  const usadas = Object.values(salas);
  return !usadas.some((p) => p.x === x && p.z === z) &&
    (!usadas.length || usadas.some((p) => Math.abs(p.x - x) + Math.abs(p.z - z) === 4));
}

export function toqueCirculo(x, z, raio, objeto) {
  const dx = Math.max(0, Math.abs(x - objeto.x) - objeto.meiaX);
  const dz = Math.max(0, Math.abs(z - objeto.z) - objeto.meiaZ);
  return dx * dx + dz * dz < raio * raio;
}
