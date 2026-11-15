export class PosProcessamento {
  constructor(gl, compilar, compacto) {
    this.gl = gl;
    this.compacto = compacto;
    this.disponivel = Boolean(gl.getExtension("WEBGL_depth_texture"));
    if (!this.disponivel) return;

    this.quadro = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadro);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const vertice = compilar(gl.VERTEX_SHADER, `
      attribute vec2 vertice;
      varying mediump vec2 uv;
      void main() {
        uv = vertice * 0.5 + 0.5;
        gl_Position = vec4(vertice, 0.0, 1.0);
      }
    `);
    const criar = (fragmento) => {
      const programa = gl.createProgram();
      const shader = compilar(gl.FRAGMENT_SHADER, fragmento);
      gl.attachShader(programa, vertice);
      gl.attachShader(programa, shader);
      gl.linkProgram(programa);
      gl.deleteShader(shader);
      if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) {
        throw new Error("O navegador não conseguiu criar os efeitos de iluminação.");
      }
      return programa;
    };
    this.extrair = criar(`
      precision mediump float;
      varying mediump vec2 uv;
      uniform sampler2D imagem;
      uniform vec2 pixel;
      void main() {
        vec3 halo = vec3(0.0);
        for (int y = -2; y <= 2; y++) {
          for (int x = -2; x <= 2; x++) {
            vec2 deslocamento = vec2(float(x), float(y));
            vec4 amostra = texture2D(imagem, uv + deslocamento * pixel * 3.4);
            float peso = 1.0 / (1.0 + dot(deslocamento, deslocamento));
            halo += amostra.rgb * amostra.a * peso;
          }
        }
        gl_FragColor = vec4(halo * 0.19, 1.0);
      }
    `);
    this.compor = criar(`
      precision mediump float;
      varying mediump vec2 uv;
      uniform sampler2D imagem;
      uniform sampler2D profundidade;
      uniform sampler2D bloom;
      uniform vec2 pixel;
      uniform float compacto;
      uniform float foco;

      float oclusao(vec2 direcao, float centro) {
        float perto = texture2D(profundidade, uv + direcao * pixel * 10.0).r;
        float delta = centro - perto;
        return smoothstep(0.0025, 0.012, delta) * (1.0 - smoothstep(0.024, 0.075, delta));
      }
      void main() {
        float centro = texture2D(profundidade, uv).r;
        vec3 cor = texture2D(imagem, uv).rgb;
        vec3 brilho = texture2D(bloom, uv).rgb * mix(1.22, 0.87, compacto);
        float vinheta = 1.0 - 0.24 * smoothstep(0.36, 1.05, length((uv - 0.5) * 1.85));
        if (centro < 0.999) {
          if (compacto < 0.5) {
            float sombra = oclusao(vec2(1.0,0.0), centro) + oclusao(vec2(-1.0,0.0), centro)
                         + oclusao(vec2(0.0,1.0), centro) + oclusao(vec2(0.0,-1.0), centro)
                         + oclusao(vec2(0.7,0.7), centro) + oclusao(vec2(-0.7,0.7), centro)
                         + oclusao(vec2(0.7,-0.7), centro) + oclusao(vec2(-0.7,-0.7), centro);
            float desfocar = smoothstep(0.02, 0.17, abs(centro-foco)) * 0.28;
            vec3 vizinhos = texture2D(imagem, uv+pixel*vec2(1.0,0.0)).rgb
                          + texture2D(imagem, uv-pixel*vec2(1.0,0.0)).rgb
                          + texture2D(imagem, uv+pixel*vec2(0.0,1.0)).rgb
                          + texture2D(imagem, uv-pixel*vec2(0.0,1.0)).rgb;
            cor = mix(cor, vizinhos * 0.25, desfocar) * (1.0 - sombra * 0.044);
          }
          gl_FragColor = vec4((cor + brilho) * vinheta, 1.0);
        } else {
          float alpha = clamp(max(brilho.r, max(brilho.g, brilho.b)), 0.0, 1.0);
          gl_FragColor = vec4(brilho / max(alpha, 0.0001), alpha * vinheta);
        }
      }
    `);
    gl.deleteShader(vertice);
  }

  textura(largura, altura, formato, tipo, filtro) {
    const gl = this.gl;
    const textura = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textura);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtro);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, formato, largura, altura, 0, formato, tipo, null);
    return textura;
  }

  ajustar(largura, altura) {
    if (!this.disponivel || (largura === this.largura && altura === this.altura)) return;
    const gl = this.gl;
    this.largura = largura;
    this.altura = altura;
    const divisor = this.compacto ? 5 : 3;
    this.larguraBloom = Math.max(1, Math.floor(largura / divisor));
    this.alturaBloom = Math.max(1, Math.floor(altura / divisor));
    for (const textura of [this.cor, this.profundidade, this.bloom]) {
      if (textura) gl.deleteTexture(textura);
    }
    for (const buffer of [this.cena, this.halo]) {
      if (buffer) gl.deleteFramebuffer(buffer);
    }

    this.cor = this.textura(largura, altura, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
    this.profundidade = this.textura(largura, altura, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, gl.NEAREST);
    this.bloom = this.textura(this.larguraBloom, this.alturaBloom, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
    this.cena = gl.createFramebuffer();
    this.halo = gl.createFramebuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.cena);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.cor, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.profundidade, 0);
    const cenaCompleta = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.halo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.bloom, 0);
    this.disponivel = cenaCompleta && gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  preparar(programa, largura, altura) {
    const gl = this.gl;
    gl.useProgram(programa);
    gl.viewport(0, 0, largura, altura);
    const atributo = gl.getAttribLocation(programa, "vertice");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadro);
    gl.enableVertexAttribArray(atributo);
    gl.vertexAttribPointer(atributo, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(gl.getUniformLocation(programa, "pixel"), 1 / this.largura, 1 / this.altura);
  }

  ligar(programa, nome, indice, textura) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + indice);
    gl.bindTexture(gl.TEXTURE_2D, textura);
    gl.uniform1i(gl.getUniformLocation(programa, nome), indice);
  }

  apresentar(foco) {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.halo);
    this.preparar(this.extrair, this.larguraBloom, this.alturaBloom);
    this.ligar(this.extrair, "imagem", 0, this.cor);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.preparar(this.compor, this.largura, this.altura);
    this.ligar(this.compor, "imagem", 0, this.cor);
    this.ligar(this.compor, "profundidade", 1, this.profundidade);
    this.ligar(this.compor, "bloom", 2, this.bloom);
    gl.uniform1f(gl.getUniformLocation(this.compor, "foco"), foco);
    gl.uniform1f(gl.getUniformLocation(this.compor, "compacto"), this.compacto ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
  }
}
