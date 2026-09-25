# Bitácora del proyecto Vértigo

Registro de todo lo que se ha hecho en la web: decisiones, pasos, problemas y cómo se resolvieron.
Las entradas más recientes van al final.

---

## Resumen rápido

| | |
|---|---|
| **Proyecto** | Web de una marca ficticia de bebida energética de cítricos |
| **Marca** | Vértigo, «Energía cítrica en caída libre» |
| **Tecnologías** | HTML, CSS, JavaScript, Vite, Three.js, GSAP con ScrollTrigger, Lenis y Web Audio API |
| **Carpeta** | `C:\Vértigo` |
| **Estado** | Página de inicio terminada, con 3D, animaciones y sonido |

---

## 25/09/2026 · Sesión 1: idea y planificación

### Idea
- Queríamos una web con diseño 3D, animaciones y efectos de scroll para una empresa imaginaria.
- Se eligió el nombre **Vértigo**, una bebida energética de cítricos. Salió de una conversación anterior en claude.ai.
- Efecto estrella: una lata 3D que gira mientras bajas y que, a mitad de página, **explota** en rodajas de limón, hielo y gotas que vuelan hacia la cámara.

### Páginas planificadas
| # | Página | Efecto principal |
|---|---|---|
| 1 | Inicio | Lata que gira con el scroll y explota |
| 2 | Sabores | Carrusel 3D de latas; el fondo cambia de color con cada sabor |
| 3 | Producto / Ficha | La lata se «desmonta» y enseña los ingredientes |
| 4 | Nuestra historia | Línea de tiempo horizontal con scroll |
| 5 | Vértigo Crew / Eventos | Tarjetas con parallax |
| 6 | Tienda | Lata 3D que se gira con el ratón y un carrito de prueba |
| 7 | Contacto | Burbujas que reaccionan al cursor |

Extras posibles: pantalla de carga, página 404 con la lata cayendo al vacío y cursor personalizado.

**Fase 1:** Inicio, Sabores y Tienda. **Fase 2:** el resto.

### Decisiones
- Se usa **Vite** con HTML, CSS y JavaScript, sin frameworks.
- La lata 3D se modela por código con Three.js, sin archivos 3D externos.
- Se empieza por la **página de inicio**.

---

## 25/09/2026 · Sesión 2: página de inicio

### Preparación del entorno
- **Node.js no estaba instalado.** Se instaló Node.js 24 LTS con `winget install OpenJS.NodeJS.LTS`.
- **Git no está instalado.** Queda pendiente para cuando se suba a GitHub.
- El proyecto se crea en `C:\Vértigo`.
- Dependencias instaladas: `three`, `gsap`, `lenis` y `vite` (esta como dependencia de desarrollo).
- `vite.config.js` usa `base: './'` para que la web funcione en GitHub Pages.
- Se crearon el `.gitignore` (excluye `node_modules` y `dist`) y el `README.md`.

### Estructura de la página de inicio
La página funciona como una historia dividida en capítulos. Un «director» (`src/story.js`) mueve la lata 3D según el punto del scroll:

| Capítulo | Sección | Qué pasa |
|---|---|---|
| 0 | Hero | La lata cae girando delante del título gigante «VÉRTIGO» |
| 1 | Manifiesto | La lata se va a la derecha y las palabras del texto se encienden una a una |
| 2 | Explosión | Cuenta atrás 3·2·1, la lata tiembla, destello y explosión en rodajas, hielo y gotas |
| 3 | Sabores | La lata reaparece; al bajar cambia entre Limón, Pomelo, Lima-Menta y Sanguina (etiqueta y color de fondo) |
| 4 | Datos | Contadores animados: 80 mg de cafeína, 0 g de azúcar, 15 % de zumo y 35 kcal |
| 5 | Tienda | Cinta de texto infinita y botón «Ir a la tienda» |
| 6 | Pie de página | La lata sale volando hacia arriba |

### Otros elementos
- Pantalla de carga con una lata que se llena de 0 a 100 %.
- Scroll suave (Lenis), cursor personalizado y efecto de grano de fondo.
- Menú con fusión «difference», que se adapta al color del fondo.
- Los enlaces a páginas que aún no existen muestran el aviso «página en construcción».

### Cómo se hizo el 3D
- **Lata:** un cilindro para la etiqueta más un perfil de revolución (`LatheGeometry`) para la tapa y la base, con anilla y remache.
- **Etiquetas:** se dibujan con canvas (logotipo vertical, nombre del sabor, datos y sello de 250 ml). Hay una por sabor.
- **Explosión:** rodajas de limón y lima dibujadas con canvas, cubitos de hielo redondeados y gotas con forma de lágrima. Todo se mueve según el progreso del scroll.

### Archivos creados
```
index.html
src/main.js            arranque, carga e intro
src/story.js           director: posición de la lata según el scroll
src/sections.js        animaciones de texto de cada sección
src/ui.js              cursor, enlaces, cinta de texto y contadores
src/data/flavors.js    los 4 sabores y sus colores
src/three/stage.js     escena, cámara y luces
src/three/can.js       modelo de la lata
src/three/burst.js     explosión
src/three/textures.js  texturas dibujadas con canvas
src/styles/main.css    estilos
public/favicon.svg     icono en espiral
```

### Pruebas
La web se comprobó con Edge sin interfaz, controlado por un script (puppeteer-core), haciendo capturas en varios puntos del scroll en escritorio (1440×900) y en móvil (390×844).

### Problemas encontrados y soluciones
| Problema | Solución |
|---|---|
| El aviso de Vite «chunk > 500 kB» | Es por el tamaño de Three.js; se subió el límite del aviso en `vite.config.js` |
| La tilde de la «É» del título se cortaba | Más margen superior en cada letra (`.char`) |
| Las tildes de los títulos grandes chocaban con la línea de arriba | Más interlineado en los títulos |
| En móvil la lata tapaba el texto | En pantallas estrechas la lata baja a la zona libre y se hace más pequeña |
| Los cubitos de hielo se veían grises y opacos | Shader con efecto Fresnel: casi transparentes de frente y brillantes en los bordes |
| Las gotas parecían de nata | Color más amarillo, como el zumo |

---

## 25/09/2026 · Sesión 3: sonido y mejora gráfica

### Sonido (`src/audio.js`)
Todo se sintetiza con la **Web Audio API**, sin archivos de audio.
- Los navegadores no dejan sonar audio sin un clic, así que al terminar la carga aparece el botón **«Abrir la lata»**, o «Entrar sin sonido».
- **Abrir la lata:** clic metálico, «pop», siseo «psssht» y burbujas.
- **Música de fondo:** acorde suave de La menor con un filtro que «respira».
- **Cuenta atrás:** un pitido en cada número (3·2·1).
- **Explosión:** golpe grave, salpicadura y efervescencia.
- **Cambio de sabor:** barrido de aire y «pop».
- **Botón de sonido** en el menú, con barras animadas.
- El audio se pausa al cambiar de pestaña.

### Mejoras gráficas
| Mejora | Cómo se hizo |
|---|---|
| Gotas de condensación en la lata | Mapa de relieve y mapa de rugosidad dibujados con canvas; las gotas brillan más que la pintura |
| Reflejos de estudio fotográfico | Entorno virtual con paneles de luz (`src/three/environment.js`) |
| Aluminio torneado en la tapa y la base | Mapa de rugosidad con anillos finos |
| Sombras reales | Luz con sombras suaves y una «pared» invisible que solo muestra la sombra |
| Relieve en las rodajas | La propia textura se usa como mapa de relieve |
| Burbujas de fondo | Partículas con shader que suben y aceleran con el scroll (`src/three/bubbles.js`) |
| Rayos giratorios | Degradado cónico en CSS detrás del título y en la pantalla de carga |
| Foco de luz en «Sabores» | Degradado radial blanco detrás de la lata y viñeta en los bordes |
| Pantalla de carga nueva | Lata con ola animada, burbujas y un pequeño salto al abrirla |

### Problemas encontrados y soluciones
| Problema | Solución |
|---|---|
| La sombra se veía como una mancha amarilla sobre el fondo oscuro | La sombra usa el color oscuro de cada sabor |
| La etiqueta se veía color mostaza | Se bajó el brillo metálico de la etiqueta |
| Una rodaja se veía blanca y quemada al mirar de frente a la luz | Menos barniz en las rodajas |

---

## Pendiente
- [ ] Comprobar en un navegador real cómo se ven los cubitos de hielo y cómo suenan los efectos
- [ ] Instalar Git y subir el proyecto a GitHub (y publicarlo en GitHub Pages)
- [ ] Página **Sabores**
- [ ] Página **Tienda**
- [ ] Páginas de la fase 2: Producto, Historia, Crew y Contacto
- [ ] Extras: página 404 con la lata cayendo
