import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Sound } from './audio.js';
import { initCursor, initLinks, initMagnetic, initMarquee, toast } from './ui.js';
import { initCartDrawer } from './cartDrawer.js';

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

  const cartDrawer = initCartDrawer({ lenis, sound });
  const navTheme = initNavTheme();

  initCursor();
  initLinks(lenis);
  initMagnetic();
  if (document.querySelector('.marquee__track')) initMarquee(lenis);

  return { lenis, sound, cartDrawer, navTheme };
}

// El menú se oscurece mientras pasa por encima de una sección clara (data-nav="dark").
// set(clave, activo) permite a una página hacerlo a mano (p. ej. los capítulos de colores de Historia).
function initNavTheme() {
  const nav = document.querySelector('.nav');
  const active = new Set();
  const update = () => nav?.classList.toggle('is-dark', active.size > 0);
  const set = (key, on) => {
    if (on) active.add(key);
    else active.delete(key);
    update();
  };
  document.querySelectorAll('[data-nav="dark"]').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 44px',
      end: 'bottom 44px',
      // Se calcula después de las secciones fijadas (pin) de cada página
      refreshPriority: -1,
      onToggle: (self) => set(section, self.isActive),
    });
  });
  return { set };
}

// Al terminar la pantalla de carga: si la música sonaba en la página anterior, se avisa de cómo seguir
export function resumeHint(sound) {
  if (sound.pending) toast('Toca en cualquier sitio para seguir con la música');
}
