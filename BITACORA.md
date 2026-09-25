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
| **Repositorio** | https://github.com/mileagaabriel-dam1/vertigo |
| **Web publicada** | https://mileagaabriel-dam1.github.io/vertigo/ |
| **Estado** | Página de inicio terminada, con 3D realista (fruta escaneada, fotos reales, bebida), animaciones y sonido |

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

## 25/09/2026 · Sesión 4: realismo (fruta real, bebida e iluminación de estudio)

El proyecto ya estaba en GitHub (`mileagaabriel-dam1/vertigo`) con Git instalado. El objetivo de esta sesión: que la bebida y la fruta se vean lo más realistas posible, usando recursos reales de la web.

### Recursos descargados (guardados en `public/assets/`, ver `CREDITOS.md`)
| Recurso | Origen | Licencia |
|---|---|---|
| Limón escaneado en 3D (modelo + texturas de color, relieve y rugosidad) | Poly Haven | CC0 |
| Lima escaneada en 3D | Poly Haven | CC0 |
| HDRI de estudio fotográfico «Studio Small 09» | Poly Haven | CC0 |
| Fotos de limón, lima, pomelo rosa y naranja sanguina cortados | Wikimedia Commons | CC BY-SA |

Las fotos se recortaron en círculo con un script propio que detecta el borde de la fruta y ajusta una elipse. En el limón, el pomelo y la sanguina el borde se marcó a mano porque su piel pálida engañaba al detector.

### Qué se hizo
| Mejora | Cómo |
|---|---|
| **Iluminación de estudio real** | HDRI como mapa de entorno y mapeo de tonos «Neutral», pensado para fotografía de producto |
| **Rodajas realistas** (`src/three/fruit.js`) | Cara = foto real. De la foto se calculan por código el relieve (mapa de normales) y el brillo del zumo (mapa de rugosidad), con algo de luz propia para imitar la translucidez. El borde usa la piel real del escaneo. |
| **Frutas enteras** | Modelos escaneados. El pomelo y la naranja se hacen tiñendo la textura de la lima. |
| **Hojas de menta** | Dibujadas por código: contorno dentado, nervios, relieve rugoso y brillo aterciopelado. La sombra tiene forma de hoja. |
| **La bebida** (`src/three/liquid.js`) | Material de zumo translúcido con efecto Fresnel: más denso en los bordes y con los reflejos siempre visibles |
| Espiral de bebida en el hero | Tubo con forma de espiral (el símbolo de la marca) alrededor de la lata, con ondas animadas; crece en la intro y se desenrolla al bajar |
| Salpicaduras en la explosión | Chorros de líquido que nacen de la lata, crecen, se separan y vuelan con una gota en la punta |
| **Fruta flotando** (`src/three/cluster.js`) | En el hero y en «Sabores»: rodajas, fruta entera y menta de cada sabor alrededor de la lata, con sombras sobre el fondo. Al cambiar de sabor, la fruta anterior sale y entra la nueva. |
| **Vaso servido** (`src/three/glass.js`) | En la sección de la tienda: vaso de cristal con condensación, bebida del sabor, cubitos, burbujas que suben, pajita de papel y rodaja en el borde |
| Explosión nueva | Rodajas reales, limones y limas enteros, menta, hielo, gotas de zumo y salpicaduras |
| Barra de carga real | Ahora sigue la descarga real de los recursos 3D |
| Créditos | Pie de página y archivo `CREDITOS.md` (lo exige la licencia CC BY-SA de las fotos) |

### Problemas encontrados y soluciones
| Problema | Solución |
|---|---|
| Las texturas de Poly Haven daban error 404 | Las rutas son distintas de las del modelo; se sacaron de la API de Poly Haven |
| Wikimedia bloqueó las descargas por hacer demasiadas peticiones | Una sola petición con todos los archivos y pausas entre descargas |
| El vaso se veía blanco y opaco | El cristal no debe tener color propio: color negro y solo reflejos |
| La espiral y las salpicaduras parecían pintura | Más transparencia en el centro y bordes más densos |
| Todas las salpicaduras salían del mismo punto, como una estrella | Cada chorro nace en un punto distinto de la lata |
| El pomelo entero salía verdoso | Otro tono al teñir la lima |
| En móvil el vaso y la lata tapaban el texto de la tienda | Hueco reservado encima del texto y los objetos suben ahí |

### Peso
La web compilada ocupa unos 7,5 MB, casi todo texturas de fruta y el HDRI.

---

## 25/09/2026 · Sesión 5: canción, pantalla de carga, interacción y publicación

### Canción (`src/music.js`)
- Tema de **house / electro-pop a 120 BPM** generado en tiempo real con Web Audio, sin archivos de audio:
  - batería: bombo a negras, palmas y charles;
  - bajo a contratiempo;
  - acordes con el «bombeo» del sidechain;
  - melodía pegadiza sobre Lam – Fa – Do – Sol, con eco y reverb.
- Intro de 4 compases con el filtro abriéndose; después entra la melodía.
- **Reacciona al scroll:** durante la cuenta atrás la música se apaga con un filtro y sube un ruido (*build-up*). Al explotar la lata entra el *drop* con un platillo.
- A petición, se bajó el volumen de la música y de cada instrumento.

### Pantalla de carga nueva (`src/loader.js`)
- Espiral hipnótica (el símbolo de la marca) que se dibuja a medida que carga.
- La palabra VÉRTIGO se llena de bebida con una ola.
- Burbujas subiendo, mensajes de estado («Exprimiendo limones», «Enfriando latas a 4 °C»...), contador y barra.
- Botón circular con texto giratorio y efecto magnético.
- Al entrar, la cámara se lanza dentro de la espiral y una ola de bebida barre la pantalla.

### Interacción con el ratón
- **Objetos 3D** (`src/three/poke.js`): la lata, las frutas y el vaso reciben un empujón al tocarlos y vuelven con un muelle.
- **Página:** los botones, enlaces y etiquetas son magnéticos, las tarjetas de datos se inclinan en 3D y las letras del título saltan al tocarlas.

### Publicación
- Flujo de GitHub Actions (`.github/workflows/deploy.yml`): en cada subida a `main` compila la web y la publica en GitHub Pages.
- Enlace: https://mileagaabriel-dam1.github.io/vertigo/

### Problemas encontrados y soluciones
| Problema | Solución |
|---|---|
| El programador de la música podía quedarse en bucle si el reloj de audio se adelantaba, y colgaba la página | Como mucho un compás por llamada; si se queda atrás, retoma desde el momento actual |
| La espiral tenía líneas demasiado gruesas y parecía un conjunto de círculos | Líneas más finas y más vueltas |
| El mensaje «Todo listo» chocaba con el botón | Espacio reorganizado; el contador se oculta cuando aparece el botón |

---

## 25/09/2026 · Sesión 6: cabos sueltos y página de Sabores

### Cabos sueltos cerrados
| Pendiente | Qué se hizo |
|---|---|
| La ola de la pantalla de carga llegaba tarde (pasaba por encima de la web ya visible) | El CSS y GSAP sumaban dos desplazamientos; ahora solo lo controla GSAP |
| La escena 3D se dibujaba detrás de la pantalla de carga sin verse | Ya no se dibuja hasta que empieza la salida: la carga va más fluida en ordenadores modestos |
| Transiciones difíciles de revisar | Modo cámara lenta `?slow=0.2` en la dirección (solo en desarrollo) |
| README reducido al título | README completo: instrucciones, estructura y enlace a la web |
| Pantalla de carga en móvil y efectos del ratón sin comprobar | Revisados con capturas (roce con la lata y enlaces magnéticos) |

### Página de Sabores (`sabores.html`)
- **Showroom 3D** (`src/three/showroom.js`):
  - las cuatro latas en un carrusel en forma de elipse;
  - la elegida pasa al frente, gira sola y se rodea de su fruta real; las demás se quedan atrás y más oscuras;
  - se gira con flechas, pestañas, teclado (← →) o **arrastrando** con el ratón o el dedo;
  - el fondo cambia al color del sabor.
- **Ficha del sabor:** descripción, ingredientes, momento ideal y **perfil de sabor** con barras animadas (dulzor, acidez, intensidad, frescor). Botón «Añadir al carrito», que muestra un aviso porque la tienda aún no existe.
- **Enlace directo a un sabor:** `sabores.html#lima` abre directamente la Lima-Menta.
- **Frente a frente:** tarjetas de los cuatro sabores con su perfil, que se inclinan con el ratón; «Verla en 3D» sube y gira el carrusel.
- **Lo que llevan todas:** contadores animados (cafeína, zumo, azúcar y lata reciclable) y llamada a la tienda.

### Reorganización del código
- `src/common.js`: lo que comparten todas las páginas (scroll suave, sonido, cursor, enlaces, efectos magnéticos).
- `src/three/studio.js`: renderizador, HDRI, luces y pared de sombras, comunes al inicio y a Sabores.
- Pantalla de carga con **modo automático** (sin botón) para las páginas interiores.
- **Transición entre páginas:** al pulsar un enlace a otra página, la ola de bebida tapa la pantalla antes de cambiar.
- Vite compila las dos páginas (`vite.config.js`).

### Problemas encontrados y soluciones
| Problema | Solución |
|---|---|
| En el carrusel circular, la lata de la izquierda se cruzaba con el texto | Carrusel en elipse estrecha y desplazado a la derecha |
| Una rodaja tapaba el panel «Perfil de sabor» | El panel sube a la esquina superior derecha |

---

## Pendiente
- [ ] Comprobar en un navegador real (con tarjeta gráfica) cómo se ve todo y cómo suenan los efectos
- [ ] Activar GitHub Pages en el repositorio (Settings → Pages → Source: GitHub Actions)
- [x] Página **Sabores**
- [ ] Página **Tienda**
- [ ] Páginas de la fase 2: Producto, Historia, Crew y Contacto
- [ ] Extras: página 404 con la lata cayendo
