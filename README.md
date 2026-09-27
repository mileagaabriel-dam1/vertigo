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
historia.html           Página de Historia (cronología, proceso y radar de origen)
tienda.html             Tienda (caja 3D para armar tu pack, packs, suscripción y preguntas)
producto.html           Producto (anatomía 3D de la lata, ingredientes, nutrición, cafeína y ficha técnica)
crew.html               Crew (pegatinas, agenda de planes, niveles, caras del crew y carnet de miembro)
contacto.html           Contacto (burbujas, canales, formulario con borrador y mapa ilustrado)
404.html                Página de error: la lata cae por una espiral y se puede rescatar
public/assets/          Modelos 3D, HDRI y fotos de fruta (ver CREDITOS.md)
src/
  main.js               Arranque de la página de inicio
  common.js             Lo que comparten todas las páginas (scroll, sonido, cursor, enlaces)
  pages/sabores.js      Arranque de la página de Sabores
  pages/historia.js     Arranque de la página de Historia
  pages/tienda.js       Arranque de la Tienda
  pages/producto.js     Arranque de la página de Producto
  pages/crew.js         Arranque de la página Crew
  pages/contacto.js     Arranque de la página de Contacto
  pages/notfound.js     Página 404
  cart.js · cartDrawer.js  Carrito compartido por todas las páginas y pedido de prueba
  loader.js             Pantalla de carga (espiral, palabra que se llena, ola de salida)
  story.js              "Director": mueve la escena 3D según el punto del scroll
  sections.js           Animaciones de texto de cada sección
  ui.js                 Cursor, enlaces, efectos magnéticos, cinta de texto y contadores
  audio.js · music.js   Efectos de sonido y canción
  data/flavors.js       Sabores, colores y fruta de cada uno
  data/shop.js          Precios, tamaños de caja y packs de la tienda
  data/crew.js          Planes, caras del crew, niveles y barrios
  three/                Escena 3D: lata, fruta, bebida, vaso, explosión, burbujas y texturas
  styles/main.css       Estilos
```

## Páginas

- [x] Inicio
- [x] Sabores (`sabores.html`)
- [x] Producto (`producto.html`)
- [x] Nuestra historia (`historia.html`)
- [x] Vértigo Crew (`crew.html`)
- [x] Tienda (`tienda.html`, de prueba: no se cobra nada)
- [x] Contacto (`contacto.html`)
- [x] Página 404 (`404.html`)

El historial completo del proyecto está en [BITACORA.md](BITACORA.md), y los créditos de los recursos de terceros, en [CREDITOS.md](CREDITOS.md).
