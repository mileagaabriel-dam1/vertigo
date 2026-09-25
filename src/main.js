import './styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { Sound } from './audio.js';
import { FLAVORS } from './data/flavors.js';
import { Stage } from './three/stage.js';
import { createDirector } from './story.js';
import { initSections, initFlavorPanel } from './sections.js';
import { initCursor, initLinks, initMarquee, splitChars } from './ui.js';

gsap.registerPlugin(ScrollTrigger);

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Scroll suave sincronizado con GSAP
const lenis = new Lenis({ lerp: reduceMotion ? 1 : 0.085, wheelMultiplier: 0.9 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();

const sound = new Sound();
const soundButton = document.querySelector('.js-sound');
soundButton.addEventListener('click', () => sound.toggle());
sound.onChange((on) => {
  soundButton.classList.toggle('is-on', on);
  soundButton.setAttribute('aria-pressed', String(on));
  soundButton.setAttribute('aria-label', on ? 'Silenciar' : 'Activar sonido');
});

splitChars(document.querySelector('.hero__title'));
initCursor();
initLinks(lenis);
initMarquee(lenis);

boot();

async function boot() {
  const count = document.querySelector('.js-loader-count');
  const fill = document.querySelector('.loader__fill');
  const progress = { v: 0 };
  const paint = () => {
    count.textContent = Math.round(progress.v);
    fill.style.height = `${progress.v}%`;
  };
  const minimum = gsap.to(progress, { v: 85, duration: 1.4, ease: 'power2.out', onUpdate: paint });

  // Las etiquetas de la lata se dibujan con estas fuentes, así que esperamos a que carguen
  await Promise.allSettled([
    document.fonts.load('400 100px "Anton"'),
    document.fonts.load('500 40px "Space Grotesk"'),
    document.fonts.load('700 40px "Space Grotesk"'),
  ]);

  const stage = new Stage(document.querySelector('.webgl'), FLAVORS);
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

  gsap.ticker.add((time) => {
    director.update(time);
    stage.render();
  });

  await minimum;
  await gsap.to(progress, { v: 100, duration: 0.35, ease: 'power1.in', onUpdate: paint });

  // Los navegadores solo permiten sonido tras un clic: por eso se entra con un botón
  await waitForEnter();
  intro(director);
}

function waitForEnter() {
  const enter = document.querySelector('.loader__enter');
  gsap.to('.loader__count', { opacity: 0, y: -10, duration: 0.4 });
  gsap.fromTo(
    enter.children,
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.1, onStart: () => enter.classList.add('is-visible') },
  );
  document.querySelector('.js-enter-sound').focus({ preventScroll: true });

  return new Promise((resolve) => {
    const go = (withSound) => {
      if (withSound) {
        sound.start();
        sound.canOpen();
      }
      resolve();
    };
    document.querySelector('.js-enter-sound').addEventListener('click', () => go(true), { once: true });
    document.querySelector('.js-enter-mute').addEventListener('click', () => go(false), { once: true });
  });
}

function intro(director) {
  gsap
    .timeline()
    // Pequeño "salto" de la lata del loader, como al abrirla
    .to('.loader__can', { y: -12, scaleY: 1.06, duration: 0.12, ease: 'power2.out' })
    .to('.loader__can', { y: 0, scaleY: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' })
    .to('.loader', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, 0.35)
    .set('.loader', { display: 'none' })
    .from('.hero__title .char > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.05 }, 0.95)
    .to(director.intro, { y: 0, spin: 0, sc: 1, duration: 2, ease: 'expo.out' }, 0.9)
    .from('.hero__rays', { opacity: 0, scale: 0.6, duration: 2, ease: 'expo.out' }, 0.9)
    .from('.nav', { yPercent: -100, opacity: 0, duration: 0.9, ease: 'power3.out' }, 1.35)
    .from(
      '.hero__lead, .hero__badges > span, .hero__scroll',
      { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07 },
      1.45,
    )
    .add(() => lenis.start(), 1.55);
}
