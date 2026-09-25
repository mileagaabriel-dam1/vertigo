import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Sound } from './audio.js';
import { initCursor, initLinks, initMagnetic, initMarquee } from './ui.js';

// Lo que comparten todas las páginas: scroll suave, sonido, cursor, enlaces y efectos del ratón.
export function setupPage() {
  gsap.registerPlugin(ScrollTrigger);

  if (import.meta.env.DEV) {
    // Solo en desarrollo: GSAP en la consola y ?slow=0.2 para ver las animaciones a cámara lenta
    window.gsap = gsap;
    const slow = Number(new URLSearchParams(location.search).get('slow'));
    if (slow) gsap.globalTimeline.timeScale(slow);
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  // Scroll suave sincronizado con GSAP (parado hasta que termina la pantalla de carga)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lenis = new Lenis({ lerp: reduceMotion ? 1 : 0.085, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  const sound = new Sound();
  const soundButton = document.querySelector('.js-sound');
  soundButton?.addEventListener('click', () => sound.toggle());
  sound.onChange((on) => {
    if (!soundButton) return;
    soundButton.classList.toggle('is-on', on);
    soundButton.setAttribute('aria-pressed', String(on));
    soundButton.setAttribute('aria-label', on ? 'Silenciar' : 'Activar sonido');
  });

  initCursor();
  initLinks(lenis);
  initMagnetic();
  if (document.querySelector('.marquee__track')) initMarquee(lenis);

  return { lenis, sound };
}
