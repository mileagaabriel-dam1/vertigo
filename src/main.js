import './styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { setupPage } from './common.js';
import { Loader } from './loader.js';
import { FLAVORS } from './data/flavors.js';
import { Stage } from './three/stage.js';
import { createDirector } from './story.js';
import { initSections, initFlavorPanel } from './sections.js';
import { splitChars } from './ui.js';

// Las letras del título se separan antes de activar los efectos del ratón (saltan al tocarlas)
splitChars(document.querySelector('.hero__title'));
const { lenis, sound } = setupPage();

boot();

async function boot() {
  const loader = new Loader();
  // Mínimo de tiempo en pantalla para que se luzca la animación de carga
  const minimum = gsap.delayedCall(2.2, () => {});

  // Las etiquetas de la lata se dibujan con estas fuentes, así que esperamos a que carguen
  await Promise.allSettled([
    document.fonts.load('400 100px "Anton"'),
    document.fonts.load('500 40px "Space Grotesk"'),
    document.fonts.load('700 40px "Space Grotesk"'),
  ]);
  loader.setProgress(0.05);

  // La barra sigue la descarga real de los recursos 3D
  const stage = await Stage.create(document.querySelector('.webgl'), FLAVORS, (ratio) =>
    loader.setProgress(0.05 + ratio * 0.9),
  );
  const director = createDirector({
    stage,
    flavors: FLAVORS,
    onFlavor: initFlavorPanel(FLAVORS),
    flash: document.querySelector('.flash'),
    sound,
  });
  initSections();

  ScrollTrigger.addEventListener('refresh', director.measure);
  ScrollTrigger.refresh();

  // La escena 3D no se dibuja mientras la tapa la pantalla de carga (así la carga va fluida)
  let sceneVisible = false;
  gsap.ticker.add((time) => {
    director.update(time);
    if (sceneVisible) stage.render();
  });

  await minimum;
  loader.ready();

  // Los navegadores solo permiten sonido tras un clic: por eso se entra con un botón
  const withSound = await loader.waitForChoice();
  if (withSound) {
    sound.start();
    sound.canOpen();
  }
  sceneVisible = true;
  await loader.exit();
  intro(director);
}

function intro(director) {
  gsap
    .timeline()
    .from('.hero__title .char > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.05 }, 0.1)
    .to(director.intro, { y: 0, spin: 0, sc: 1, duration: 2, ease: 'expo.out' }, 0)
    .to(director.intro, { swirl: 1, duration: 2.4, ease: 'power2.inOut' }, 0.4)
    .from('.hero__rays', { opacity: 0, scale: 0.6, duration: 2, ease: 'expo.out' }, 0)
    .from('.nav', { yPercent: -100, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.45)
    .from(
      '.hero__lead, .hero__badges > span, .hero__scroll',
      { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07 },
      0.55,
    )
    .add(() => lenis.start(), 0.6);
}
