import gsap from 'gsap';
import { splitWords, initCounters } from './ui.js';

// Línea de tiempo ligada al scroll. Las posiciones van de 0 a 1 dentro de la sección.
const scrub = (trigger, start = 'top bottom', end = 'bottom bottom') =>
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger, start, end, scrub: true } });

const reveal = (targets, trigger, vars = {}) =>
  gsap.from(targets, {
    y: 60,
    opacity: 0,
    duration: 1,
    ease: 'expo.out',
    stagger: 0.08,
    scrollTrigger: { trigger, start: 'top 80%' },
    ...vars,
  });

export function initSections() {
  // Hero: el título sube y se apaga al empezar a bajar
  scrub('#hero', 'top top', 'bottom top')
    .to('.hero__title', { yPercent: -30, opacity: 0.2 }, 0)
    .to('.hero__bottom', { y: -60, opacity: 0 }, 0);

  // Manifiesto: las palabras se encienden una a una
  const words = splitWords(document.querySelector('.manifesto__text'));
  scrub('#manifiesto', 'top top', 'bottom bottom')
    .fromTo(words, { opacity: 0.12 }, { opacity: 1, duration: 0.05, stagger: 0.7 / words.length }, 0.05)
    .from('.manifesto__side li', { opacity: 0, y: 20, duration: 0.06, stagger: 0.04 }, 0.72)
    .set({}, {}, 1);

  // Explosión: cuenta atrás, estallido (a 0.5) y título
  const explosion = scrub('#explosion')
    .fromTo('.explosion__eyebrow', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.04 }, 0.3)
    .fromTo('.explosion__glow', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.17 }, 0.33);
  document.querySelectorAll('.countdown span').forEach((el, i) => {
    const at = 0.34 + i * 0.055;
    explosion
      .fromTo(el, { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: 0.02 }, at)
      .to(el, { opacity: 0, scale: 0.6, duration: 0.02 }, at + 0.033);
  });
  explosion
    .fromTo(
      '.explosion__title .line',
      { opacity: 0, scale: 1.8, yPercent: 20 },
      { opacity: 1, scale: 1, yPercent: 0, duration: 0.08, stagger: 0.03, ease: 'power2.out' },
      0.51,
    )
    .to('.explosion__glow', { opacity: 0.3, duration: 0.1 }, 0.55)
    .fromTo('.explosion__sub', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.05 }, 0.65)
    .set({}, {}, 1);

  // Sabores: entrada del panel y barra de progreso
  scrub('#sabores')
    .fromTo('.flavors__info', { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.1 }, 0.1)
    .fromTo('.flavors__progress i', { scaleX: 0 }, { scaleX: 1, duration: 0.8 }, 0.2)
    .set({}, {}, 1);

  reveal('.stats > .eyebrow, .stats__title', '.stats');
  reveal('.stat', '.stats__grid', { stagger: 0.1 });
  reveal('.cta__inner > *', '.cta__inner');
  reveal('.footer__brand', '.footer', { yPercent: 30, y: 0, duration: 1.2 });
  initCounters();
}

// Panel de texto de "Sabores". Devuelve la función que cambia de sabor.
export function initFlavorPanel(flavors) {
  const stage = document.querySelector('.flavors__stage');
  const q = (sel) => stage.querySelector(sel);
  const el = {
    index: q('.js-fl-index'),
    total: q('.js-fl-total'),
    name: q('.js-fl-name'),
    tag: q('.js-fl-tag'),
    notes: q('.js-fl-notes'),
    word: q('.flavors__bgword'),
  };

  const dotList = q('.flavors__dots');
  dotList.innerHTML = flavors.map((f) => `<li>${f.name}</li>`).join('');
  const dots = [...dotList.children];
  el.total.textContent = String(flavors.length).padStart(2, '0');

  const parts = [el.index, el.name, el.tag, el.notes];
  let timeline;

  const fill = (i) => {
    const f = flavors[i];
    el.index.textContent = String(i + 1).padStart(2, '0');
    el.name.textContent = f.full;
    el.tag.textContent = f.tagline;
    el.notes.innerHTML = f.notes.map((n) => `<li>${n}</li>`).join('');
    el.word.textContent = f.name;
    dots.forEach((dot, j) => dot.classList.toggle('is-active', j === i));
  };

  fill(0);
  gsap.set(stage, { backgroundColor: flavors[0].bg, color: flavors[0].ink });

  return (i) => {
    const f = flavors[i];
    gsap.to(stage, { backgroundColor: f.bg, color: f.ink, duration: 0.9, ease: 'power2.inOut', overwrite: 'auto' });
    timeline?.kill();
    timeline = gsap
      .timeline()
      .to(parts, { y: -24, opacity: 0, duration: 0.22, stagger: 0.03, ease: 'power2.in' })
      .to(el.word, { opacity: 0, duration: 0.22 }, 0)
      .add(() => fill(i))
      .fromTo(parts, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: 'expo.out' })
      .to(el.word, { opacity: 0.14, duration: 0.6 }, '<');
  };
}
