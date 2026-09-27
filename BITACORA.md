# Bitácora del proyecto Vértigo

Registro de todo lo que se ha hecho en la web: decisiones, pasos, problemas y cómo se resolvieron.
Las entradas más recientes van al final.

---

## Resumen rápido

| | |
|---|---|
| **Proyecto** | Web de una marca ficticia de bebida energética de cítricos |
| **Marca** | Vértigo, «Energía cítrica en caída libre» |
| **Tecnologías** | HTML, CSS, JavaScript, Vite, Three.js, GSAP (ScrollTrigger, Draggable e InertiaPlugin), Lenis y Web Audio API |
| **Carpeta** | `C:\Vértigo` (Windows, sesiones 1-6) · `~/vertigo` (Mac, desde la sesión 7) |
| **Repositorio** | https://github.com/mileagaabriel-dam1/vertigo |
| **Web publicada** | https://mileagaabriel-dam1.github.io/vertigo/ |
| **Estado** | Seis páginas terminadas: Inicio, Sabores, Historia, Tienda, Producto y Crew. Faltan Contacto y la 404 |

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

## 26/09/2026 · Sesión 7: rendimiento, música nueva y página de Historia

### Rendimiento
- Texturas de los escaneos de limón y lima reducidas de 2048 a 1024 px: de 2,8 MB a 0,9 MB (la fruta se ve pequeña, no se nota).
- **Resolución adaptativa** del 3D (`adaptiveResolution` en `src/three/studio.js`): si el ordenador no llega a unos 50 fps, baja la resolución poco a poco hasta 1x. Las burbujas ajustan su tamaño a la resolución de cada momento.
- El destello de la explosión ya no toca el estilo en cada fotograma, solo cuando cambia.

### Canción nueva (`src/music.js`)
- La canción house de 120 BPM era demasiado fuerte. Ahora es un tema **tropical suave** a 100 BPM en Re mayor: marimba, acordes de piano eléctrico a contratiempo, shaker, bombo suave, clic de madera y bajo redondo.
- Volumen de la música más bajo (de 0,22 a 0,13). La reacción al scroll se mantiene: se apaga en la cuenta atrás y vuelve suave tras la explosión.

### Página de Historia (`historia.html`)
- **Portada 3D** (`src/three/grove.js`): el limón escaneado en el centro, rodeado de rodajas, limas y menta que flotan, se pueden empujar con el ratón y se separan al hacer scroll.
- **El porqué:** texto que se enciende palabra a palabra y contadores (3 amigos, 1 cocina, 47 recetas, 0 inversores).
- **Cronología horizontal:** la sección se fija y seis capítulos de colores pasan de lado con el scroll (de marzo de 2024 a hoy). Cada uno tiene su dibujo animado: rodaja de limón, los 47 intentos que se tachan hasta dar con la receta, 4 °C con ondas de frío, la primera lata que se dibuja sola, los cuatro sabores y la espiral de la marca. Año grande, barra de progreso y sonido al cambiar de capítulo.
- **Del árbol a la lata:** cinco pasos (cosecha, exprimido en frío, mezcla, burbujas, lata); el número grande cambia y un tubo se llena de bebida.
- **Radar de origen:** cada ingrediente está en su dirección real desde Barcelona y a una distancia en escala logarítmica. Las distancias y rumbos se calculan con la fórmula del haversine a partir de las coordenadas. Al pasar el ratón por un ingrediente se ilumina su ruta.
- **Compromisos**, la regla de oro («Si algún día deja de saber a fruta, cerramos») que se llena de amarillo al leerla, y llamada a la página de Sabores.
- Revisada con capturas en escritorio (1440×900) y móvil (390×844).
- Los enlaces «Historia» del menú y del pie ya llevan a la página nueva.

### Problemas encontrados y soluciones
| Problema | Solución |
|---|---|
| En el radar, el ingrediente más cercano (hierbabuena, a 9 km) tapaba el nombre de Barcelona | La etiqueta de Barcelona sube por encima del centro |
| Las burbujas del tubo del proceso se veían también en la parte vacía | El tubo se recorta con `clip-path` en vez de escalarse, y las burbujas van dentro del líquido |
| En móvil, la fruta de la portada quedaba debajo del texto | Se sube y se hace un poco más pequeña |

---

## 26/09/2026 · Sesión 8: Tienda, carrito y música entre páginas

### Música continua y subidones
- La misma canción en todas las páginas, **sin empezar de cero**: se guarda si sonaba y por qué compás iba (`sessionStorage`). En la página nueva sigue desde ahí en cuanto se toca la pantalla o una tecla (los navegadores no dejan sonar nada antes), con un aviso para saberlo. Quien entra «sin sonido» no la oye volver sola.
- **Subidones de volumen** (`swell()` en `src/music.js`): la música sube un momento y vuelve sola a su nivel. Suenan en la explosión del inicio, al cambiar de sabor, al llegar al capítulo «Hoy» y al terminar de leer la regla de oro en Historia, al llenar la caja de la tienda, al añadir al carrito y, el más fuerte, al hacer el pedido.
- Efectos nuevos: lata cayendo en la caja (golpe de cartón + tintineo), añadir al carrito (burbuja + chispa) y fanfarria de marimba al hacer el pedido.

### Página de Tienda (`tienda.html`)
- **Arma tu pack en 3D** (`src/three/crate.js`): caja de cartón kraft con el logo impreso y separadores. Se elige 6, 12 o 24 latas (−10 % y −20 %); cada lata que se añade cae dentro con un rebote y suena al tocar el fondo. Haciendo clic en una lata de la caja se saca. Botones para rellenar al azar y vaciar. La cámara se aleja o acerca según el tamaño.
- **Packs listos:** degustación (2 de cada) y un pack de 12 de cada sabor, con latas dibujadas en CSS que saltan al pasar el ratón.
- **Suscripción:** caja de 12 o 24, cada 2 o 4 semanas, con un 15 % extra; calcula el ahorro al año y las fechas de las tres próximas entregas.
- **Envíos y devoluciones** con contadores y **preguntas frecuentes** que se abren con animación.
- Todo el texto deja claro que es una tienda de prueba: no se piden datos de pago, no se cobra nada y no se envía nada.

### Carrito en todas las páginas (`src/cart.js`, `src/cartDrawer.js`)
- Botón con contador en la navegación y panel lateral: cantidades, quitar, subtotal, envío (gratis desde 25 €, con una barra que se llena) y total.
- Se guarda en el navegador: no se pierde al cambiar de página y se sincroniza entre pestañas.
- «Hacer el pedido» llena la pantalla de bebida con burbujas y muestra un número de pedido de prueba.
- En Sabores, «Añadir al carrito» ya añade un pack de 6 del sabor elegido.
- Todos los botones «Comprar» e «Ir a la tienda» llevan a la tienda.

### Problemas encontrados y soluciones
| Problema | Solución |
|---|---|
| En móvil la caja 3D se salía por la izquierda | En pantallas estrechas la cámara se aleja más |

---

## 27/09/2026 · Sesión 9: página de Producto

### Página de Producto (`producto.html`)
- **Anatomía de la lata en 3D** (`src/three/anatomy.js`): la sección se queda fija y, con el scroll, la lata pasa por cuatro fases:
  1. entera, girando junto al título;
  2. **por piezas**: anilla, remache, ranura, tapa y base se separan y cada una tiene su etiqueta, que sigue a la pieza en pantalla;
  3. **rayos X**: la etiqueta se vuelve transparente y la lata se llena de bebida desde abajo, con burbujas subiendo y etiquetas de 250 ml, gas y zumo (subidón de música al llenarse);
  4. se cierra otra vez.
  Indicador de fases a la derecha, barra de progreso y botones para cambiar de sabor (cambian la etiqueta, la bebida de dentro y la luz).
- **Lo que hay dentro:** gráfico de barras con los cinco ingredientes en % de la lata y lo que no lleva (tachado).
- **Información nutricional** con estilo de etiqueta real: se cambia entre 100 ml y la lata entera y los números cuentan hasta el nuevo valor. Los azúcares se aclaran como «de la fruta».
- **Cafeína:** gráfico comparando la lata con café, espresso, té, cola y chocolate (valores orientativos de la EFSA), con la barra de Vértigo en amarillo y el resto en gris, tooltip al pasar el ratón. Al lado, calculadora «¿Cuánta llevas hoy?» contra el límite de 400 mg de la EFSA, con barra de colores de estado (bien / cerca del límite / por encima), siempre con icono y texto.
- **Ficha técnica:** plano azul de la lata con cotas que se dibuja solo al llegar y tabla de especificaciones.
- Los colores de los gráficos se comprobaron con el validador de paletas: el amarillo frente al gris pasa el contraste y la separación para daltonismo.
- Todos los enlaces «Producto» del menú y del pie llevan a la página nueva.

### Problemas encontrados y soluciones
| Problema | Solución |
|---|---|
| Las barras de los gráficos no se veían | La variable CSS del ancho llevaba `%` y rompía el `calc()`; ahora es un número |
| La etiqueta de la anilla salía fuera de la pantalla | Se sumaba dos veces la altura de la pieza; ahora solo cuenta lo que se separa |
| La lista de fases no se veía | La animación de entrada dejaba una opacidad fija en cada línea; ahora se anima la lista entera |
| En móvil las etiquetas tapaban la lata y se pisaban | La lata se aparta a la izquierda, todas las etiquetas salen por la derecha y solo se ve el título |

---

## 27/09/2026 · Sesión 10: página Crew

### Página Crew (`crew.html`)
- **Pared de pegatinas:** 14 pegatinas troqueladas (logo, rodajas dibujadas, latas, «Sin frenos», estrella, bocadillo, ticket…) caen al entrar y se pueden **arrastrar y lanzar** con inercia (GSAP Draggable + InertiaPlugin, gratis desde GSAP 3.13); rebotan en los bordes y suenan al pararse.
- **Qué es:** texto y contadores (personas, planes, barrios, 0 € de cuota).
- **Agenda:** siete planes (running, noche de estudio, DJ set, escalada, taller de ilustración, vóley y open mic). Las fechas se calculan a partir de hoy, así que siempre salen próximas. Filtros por tipo, barra de plazas, «Me apunto» (o lista de espera si está completo) que se recuerda en el navegador y botón **+ Calendario** que descarga un archivo `.ics` para añadirlo al móvil u ordenador.
- **Niveles:** barra deslizante «¿a cuántos planes irías en un año?» que enciende los niveles Gota, Burbuja, Espiral y Vértigo y enseña sus ventajas (subidón de música al llegar al último).
- **Caras del crew:** seis personajes ficticios con avatar dibujado (iniciales, espiral y color de su sabor); la tarjeta se gira al pasar el ratón o al tocarla y enseña su frase y sus planes.
- **Únete:** formulario (nombre, email, barrio, intereses y sabor) que dibuja el **carnet de miembro en directo**: color del sabor, número, barrio y un código decorativo que sale del número. Al enviarlo se gira, aparece el sello «Ya eres del crew», suena la fanfarria y se puede **descargar en PNG**. No se envía nada: se guarda solo en el navegador y al volver sigue ahí.
- Crew añadido al menú y al pie de todas las páginas.

### Problemas encontrados y soluciones
| Problema | Solución |
|---|---|
| Dos pegatinas tapaban el título | Se recolocaron; en móvil se reparten por la mitad de abajo |
| Los niveles Gota y Burbuja quedaban pegados | Se reparten en cuatro columnas iguales en vez de en proporción |
| En móvil el carnet salía antes del título de la sección | Va después del formulario y, al hacerte el carnet, la página baja hasta él |

---

## 27/09/2026 · Sesión 11: repaso general (colores, música y cargas)

### Colores
- El menú ya no usa `mix-blend-mode: difference`, que sobre los fondos amarillos y de colores lo volvía **azul o morado** (fuera de la marca). Ahora tiene dos tintas: crema sobre fondo oscuro y negro de la marca sobre las secciones claras (marcadas con `data-nav="dark"`: sabores del inicio, showroom, caja de la tienda y pared de pegatinas). Cambia con una transición suave (`initNavTheme` en `src/common.js`).
- En la cronología de Historia, el año grande, la barra de progreso y el menú toman la tinta de cada capítulo (en el último, amarillo sobre negro).

### Música (`src/music.js`)
- La canción ya no repite los mismos 4 compases: ahora tiene **estructura** que se repite cada 32 compases: estrofa → estribillo (arpegios de campanitas, bombo extra, bajo con saltos de octava y acordes más fuertes) → **puente** con otros acordes (Mim7 – La7 – Fa#m7 – Sim7) y melodía nueva → **bajada** sin batería con colchón de acordes → vuelta con redoble de madera. Platillo suave al empezar cada parte.
- La intro era casi inaudible (18 dB por debajo de la estrofa): ahora lleva colchón y el bajo entra en su segunda mitad.
- Con el carrito abierto la música suena **amortiguada**, como detrás de una puerta, y vuelve al cerrarlo.
- Comprobado renderizando la canción entera sin sonido (OfflineAudioContext) y midiendo el volumen de cada parte: sin errores ni saturación (pico −22 dBFS antes del compresor) y con la bajada unos 6 dB por debajo de la estrofa.

### Pantallas de carga
- La primera carga mantiene su animación completa; en las siguientes páginas de la misma visita el tiempo mínimo baja de 1,2 s a 0,35 s (`Loader.minimum()` y `Loader.pause()`).
- Se quitaron los avisos «Invalid property» que salían en la consola de todas las páginas interiores.

---

## 26-27/09/2026 · Entorno de trabajo en el Mac y subida a GitHub

### Entorno
- El proyecto pasó a un Mac que no tenía Node.js ni Homebrew. Se instaló **Node.js 24 (LTS)** en la carpeta del usuario (`~/.local/node`, sin permisos de administrador), comprobando la descarga con su suma SHA-256, y se añadió al `PATH` en `~/.zshrc`. Con eso funcionan `npm run dev` (http://localhost:5173) y `npm run build`.
- Git y Python llegaron con las herramientas de desarrollo de Apple (Xcode Command Line Tools).
- Para revisar el trabajo sin un navegador delante se usó **Playwright** (Chromium sin ventana), instalado en una carpeta temporal, fuera del proyecto: capturas de cada página en escritorio (1440×900) y móvil (390×844), pruebas de las interacciones (tienda, carrito, crew) y la canción renderizada sin sonido para medir su volumen. El 3D ahí se dibuja sin tarjeta gráfica, así que los tiempos de carga de esas pruebas no son los reales.

### Música: cómo se llegó a la canción actual
- Sesión 7: la canción house de 120 BPM era demasiado fuerte. Primero se probó una versión chill / lo-fi a 92 BPM con la misma melodía, pero no convenció, y se sustituyó por una canción nueva: el tema **tropical suave** en Re mayor que suena ahora (ver sesiones 8 y 11).

### Subida a GitHub
- La carpeta del Mac no era un repositorio: se conectó a `mileagaabriel-dam1/vertigo` conservando su historial (el último commit subido era el de la página de Sabores).
- Nombre y email de Git configurados solo para este proyecto.
- Commit `8001bdb` «Páginas de Historia, Tienda, Producto y Crew, carrito y mejoras generales» con los 45 cambios de las sesiones 7 a 11 (las 4 texturas de 2048 px aparecen como borradas porque se sustituyeron por las de 1024 px).
- **El `git push` no se pudo hacer desde el asistente**: GitHub pide iniciar sesión y hay que hacerlo a mano con un token personal (ver pendientes).

---

## Pendiente
- [ ] **Subir el commit a GitHub**: `git push origin main` desde la carpeta del proyecto. Usuario `mileagaabriel-dam1` y, como contraseña, un token (GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic), con los permisos `repo` y `workflow`)
- [ ] Activar GitHub Pages en el repositorio (Settings → Pages → Source: GitHub Actions) y comprobar que la web publicada responde
- [ ] Comprobar en un navegador real (con tarjeta gráfica) cómo se ve todo y cómo suenan la música y los efectos
- [ ] Revisar los datos de la página de Producto: ingredientes, nutrición y ficha técnica son inventados; la cafeína de otras bebidas y el límite de 400 mg son valores orientativos de la EFSA puestos de memoria y hay que confirmarlos con la fuente
- [x] Página **Sabores**
- [x] Página **Historia**
- [x] Página **Tienda**
- [x] Página **Producto**
- [x] Página **Crew**
- [ ] Página **Contacto**
- [ ] Extras: página 404 con la lata cayendo
- [ ] Accesibilidad: respetar «reducir movimiento» en las animaciones grandes (ahora solo se respeta en parte: scroll suave y algunas animaciones CSS)
- [ ] Decidir qué hacer con los enlaces a Instagram, TikTok y YouTube del pie (ahora dicen «en construcción»; la marca es ficticia)
