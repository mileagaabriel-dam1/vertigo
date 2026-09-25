# Vértigo

Web de **Vértigo**, una bebida energética de cítricos (marca ficticia, proyecto académico).
Tiene escenas 3D realistas, animaciones ligadas al scroll, música generada en tiempo real y scroll suave.

**Web publicada:** https://mileagaabriel-dam1.github.io/vertigo/

## Tecnologías

- [Vite](https://vite.dev/): servidor de desarrollo y empaquetado
- [Three.js](https://threejs.org/): lata, fruta escaneada, bebida y explosión en 3D
- [GSAP + ScrollTrigger](https://gsap.com/): animaciones y scroll
- [Lenis](https://lenis.darkroom.engineering/): scroll suave
- Web Audio API: música y efectos de sonido sintetizados, sin archivos de audio

## Cómo arrancarla

Necesitas [Node.js](https://nodejs.org/) 20 o superior.

```bash
npm install      # instala las dependencias (solo la primera vez)
npm run dev      # servidor de desarrollo en http://localhost:5173
npm run build    # genera la versión final en /dist
npm run preview  # prueba la versión final
```

Al subir cambios a la rama `main`, GitHub Actions compila la web y la publica sola en GitHub Pages (`.github/workflows/deploy.yml`).

## Estructura

```
index.html              Página de inicio
sabores.html            Página de Sabores (showroom 3D)
public/assets/          Modelos 3D, HDRI y fotos de fruta (ver CREDITOS.md)
src/
  main.js               Arranque de la página de inicio
  common.js             Lo que comparten todas las páginas (scroll, sonido, cursor, enlaces)
  pages/sabores.js      Arranque de la página de Sabores
  loader.js             Pantalla de carga (espiral, palabra que se llena, ola de salida)
  story.js              "Director": mueve la escena 3D según el punto del scroll
  sections.js           Animaciones de texto de cada sección
  ui.js                 Cursor, enlaces, efectos magnéticos, cinta de texto y contadores
  audio.js · music.js   Efectos de sonido y canción
  data/flavors.js       Sabores, colores y fruta de cada uno
  three/                Escena 3D: lata, fruta, bebida, vaso, explosión, burbujas y texturas
  styles/main.css       Estilos
```

## Páginas

- [x] Inicio
- [x] Sabores (`sabores.html`)
- [ ] Producto / ficha
- [ ] Nuestra historia
- [ ] Vértigo Crew / eventos
- [ ] Tienda
- [ ] Contacto

El historial completo del proyecto está en [BITACORA.md](BITACORA.md), y los créditos de los recursos de terceros, en [CREDITOS.md](CREDITOS.md).
