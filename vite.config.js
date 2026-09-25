import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = (file) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  // Rutas relativas para poder publicarla en GitHub Pages sin tocar nada
  base: './',
  build: {
    // Three.js ocupa bastante por sí solo; no es un problema
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      // Cada página nueva de la web se añade aquí
      input: {
        main: page('./index.html'),
        sabores: page('./sabores.html'),
      },
    },
  },
});
