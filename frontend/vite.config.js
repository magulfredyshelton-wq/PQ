import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const adaptador = fileURLToPath(new URL("./adaptadores-vite.js", import.meta.url));
export default defineConfig({
  base: "./",
  plugins: [{
    name: "adaptadores-hangar",
    enforce: "pre",
    resolveId(origem, importador) {
      if (origem === "./adaptadores.js" && importador?.endsWith("/jogo.js")) return adaptador;
      return null;
    }
  }],
  server: { proxy: { "/api": "http://127.0.0.1:8000" } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: ["index.html", "partidas.html", "hangar.html"].map(
        (pagina) => fileURLToPath(new URL(pagina, import.meta.url))
      )
    }
  }
});
