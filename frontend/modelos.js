export async function carregarModelo(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error("Não foi possível carregar um modelo do hangar.");
  const buffer = await resposta.arrayBuffer();
  const dados = new DataView(buffer);
  if (dados.getUint32(0, true) !== 0x46546c67 || dados.getUint32(4, true) !== 2) {
    throw new Error("O modelo do hangar precisa de estar em formato GLB 2.");
  }
  const tamanhoJson = dados.getUint32(12, true);
  const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, tamanhoJson)));
  const inicioBinario = 28 + tamanhoJson;
  const ler = (indice) => {
    const acesso = gltf.accessors[indice];
    const vista = gltf.bufferViews[acesso.bufferView];
    return new Float32Array(buffer, inicioBinario + (vista.byteOffset || 0), acesso.count * 3);
  };

  return gltf.meshes[0].primitives.map((primitiva) => {
    const material = gltf.materials[primitiva.material];
    return {
      posicoes: ler(primitiva.attributes.POSITION),
      normais: ler(primitiva.attributes.NORMAL),
      cor: material.pbrMetallicRoughness.baseColorFactor,
      emissivo: material.emissiveFactor ? 1 : 0
    };
  });
}

export function carregarTextura(gl, url) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => {
      const textura = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, textura);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imagem);
      resolve(textura);
    };
    imagem.onerror = () => reject(new Error("Não foi possível carregar a textura do chão."));
    imagem.src = url;
  });
}
