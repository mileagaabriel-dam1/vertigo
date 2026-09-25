import '../styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { setupPage } from '../common.js';
import { Loader } from '../loader.js';
import { FLAVORS } from '../data/flavors.js';
import { Showroom } from '../three/showroom.js';
import { toast, initCounters } from '../ui.js';

// Página de Sabores: showroom 3D con las cuatro latas + comparativa + ingredientes.

const { lenis, sound } = setupPage();

const PROFILE = [
  ['dulzor', 'Dulzor'],
  ['acidez', 'Acidez'],
  ['intensidad', 'Intensidad'],
  ['frescor', 'Frescor'],
];

const pad = (n) => String(n).padStart(2, '0');

// Filas de perfil de sabor (barras de 0 a 5)
function profileRows(flavor) {
  return PROFILE.map(
    ([key, label]) => `
      <div class="profile__row">
        <dt>${label}</dt>
        <dd><span class="profile__track"><i style="width:${(flavor.profile[key] / 5) * 100}%"></i></span><b>${flavor.profile[key]}</b></dd>
      </div>`,
  ).join('');
}

boot();

async function boot() {
  const loader = new Loader({ auto: true });
  const minimum = gsap.delayedCall(1.2, () => {});

  await Promise.allSettled([
    document.fonts.load('400 100px "Anton"'),
    document.fonts.load('500 40px "Space Grotesk"'),
    document.fonts.load('700 40px "Space Grotesk"'),
  ]);
  loader.setProgress(0.05);

  const section = document.querySelector('.showroom');
  const showroom = await Showroom.create(section.querySelector('.showroom__canvas'), FLAVORS, (ratio) =>
    loader.setProgress(0.05 + ratio * 0.9),
  );

  const panel = initPanel(section, showroom);
  initControls(section, showroom);
  buildCompare(showroom);
  initReveals();

  // Enlace directo a un sabor: sabores.html#lima
  const fromHash = FLAVORS.findIndex((f) => `#${f.id}` === window.location.hash);
  if (fromHash > 0) {
    showroom.select(fromHash);
    showroom.angle = showroom.target;
  }
  panel.render(showroom.index, false);

  // Solo se dibuja cuando el showroom se ve (y no mientras la tapa la pantalla de carga)
  let inView = true;
  let started = false;
  new IntersectionObserver(([entry]) => (inView = entry.isIntersecting)).observe(section);
  let last = 0;
  gsap.ticker.add((time) => {
    const dt = Math.min(0.05, time - last);
    last = time;
    if (started && inView) showroom.update(time, dt);
  });

  ScrollTrigger.refresh();
  await minimum;
  loader.ready();
  await new Promise((r) => setTimeout(r, 500));
  started = true;
  await loader.exit();
  intro();
}

// ---------- Ficha del sabor ----------

function initPanel(section, showroom) {
  const q = (sel) => section.querySelector(sel);
  const el = {
    index: q('.js-sr-index'),
    total: q('.js-sr-total'),
    name: q('.js-sr-name'),
    tag: q('.js-sr-tag'),
    desc: q('.js-sr-desc'),
    notes: q('.js-sr-notes'),
    moment: q('.js-sr-moment'),
    word: q('.js-sr-word'),
    profile: q('.js-sr-profile'),
    tabs: q('.js-sr-tabs'),
  };
  el.total.textContent = pad(FLAVORS.length);
  el.tabs.innerHTML = FLAVORS.map(
    (f, i) => `<button type="button" role="tab" class="showroom__tab" data-index="${i}">${f.name}</button>`,
  ).join('');
  const tabs = [...el.tabs.children];
  const parts = [el.name, el.tag, el.desc, el.notes];
  let timeline;

  const fill = (i) => {
    const f = FLAVORS[i];
    el.index.textContent = pad(i + 1);
    el.name.textContent = f.full;
    el.tag.textContent = f.tagline;
    el.desc.textContent = f.description;
    el.notes.innerHTML = f.notes.map((n) => `<li>${n}</li>`).join('');
    el.moment.textContent = f.moment;
    el.word.textContent = f.name;
    tabs.forEach((t, j) => {
      t.classList.toggle('is-active', i === j);
      t.setAttribute('aria-selected', String(i === j));
    });
  };

  const render = (i, animate = true) => {
    const f = FLAVORS[i];
    gsap.to(section, { '--sr-bg': f.bg, '--sr-ink': f.ink, duration: animate ? 0.9 : 0, ease: 'power2.inOut' });
    // Las barras del perfil se animan solas con la transición de CSS
    if (!el.profile.children.length) el.profile.innerHTML = profileRows(f);
    else {
      el.profile.querySelectorAll('.profile__row').forEach((row, k) => {
        const value = f.profile[PROFILE[k][0]];
        row.querySelector('i').style.width = `${(value / 5) * 100}%`;
        row.querySelector('b').textContent = value;
      });
    }
    history.replaceState(null, '', `#${f.id}`);

    if (!animate) {
      fill(i);
      return;
    }
    timeline?.kill();
    timeline = gsap
      .timeline()
      .to(parts, { y: -24, opacity: 0, duration: 0.22, stagger: 0.03, ease: 'power2.in' })
      .to(el.word, { opacity: 0, scale: 0.9, duration: 0.25 }, 0)
      .add(() => fill(i))
      .fromTo(parts, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: 'expo.out' })
      .fromTo(el.word, { opacity: 0, scale: 1.1 }, { opacity: 0.14, scale: 1, duration: 0.8, ease: 'expo.out' }, '<');
  };

  showroom.onChange((i) => {
    render(i);
    sound.swap();
  });

  section.querySelector('.js-sr-add').addEventListener('click', () => {
    toast(`${FLAVORS[showroom.index].full} añadido al carrito · la tienda llega pronto`);
  });

  return { render };
}

// ---------- Controles: flechas, pestañas, teclado y arrastre ----------

function initControls(section, showroom) {
  section.querySelector('.js-sr-prev').addEventListener('click', () => showroom.prev());
  section.querySelector('.js-sr-next').addEventListener('click', () => showroom.next());
  section.querySelector('.js-sr-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-index]');
    if (tab) showroom.select(Number(tab.dataset.index));
  });

  document.addEventListener('keydown', (e) => {
    if (window.scrollY > section.offsetHeight * 0.5) return;
    if (e.key === 'ArrowRight') showroom.next();
    if (e.key === 'ArrowLeft') showroom.prev();
  });

  // Arrastrar la escena para girar el carrusel (en móvil, el scroll vertical sigue funcionando)
  let start = null;
  section.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, a')) return;
    start = e.clientX;
    section.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', (e) => {
    if (start !== null) showroom.dragMove(e.clientX - start);
  });
  const end = () => {
    if (start === null) return;
    start = null;
    section.classList.remove('is-dragging');
    showroom.dragEnd();
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
}

// ---------- Comparativa ----------

function buildCompare(showroom) {
  const grid = document.querySelector('.js-compare');
  grid.innerHTML = FLAVORS.map(
    (f, i) => `
      <article class="compare__card" style="--c:${f.bg};--c-ink:${f.ink}">
        <div class="compare__top">
          <span class="compare__num">${pad(i + 1)}</span>
          <h3>${f.full}</h3>
          <p>${f.tagline}</p>
        </div>
        <dl class="profile profile--mini">${profileRows(f)}</dl>
        <p class="compare__moment">Ideal para: <b>${f.moment}</b></p>
        <button type="button" class="compare__see" data-index="${i}">Verla en 3D <span>↑</span></button>
      </article>`,
  ).join('');

  grid.addEventListener('click', (e) => {
    const button = e.target.closest('.compare__see');
    if (!button) return;
    showroom.select(Number(button.dataset.index));
    lenis.scrollTo(0, { duration: 1.6 });
  });
}

// ---------- Animaciones ----------

function initReveals() {
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
  reveal('.compare > .eyebrow, .compare__title', '.compare');
  reveal('.compare__card', '.compare__grid', { stagger: 0.1, y: 90 });
  reveal('.stats > .eyebrow, .stats__title', '.stats');
  reveal('.stat', '.stats__grid', { stagger: 0.1 });
  reveal('.cta__inner > *', '.cta__inner');
  reveal('.footer__brand', '.footer', { yPercent: 30, y: 0, duration: 1.2 });
  initCounters();
}

function intro() {
  gsap
    .timeline()
    .from('.nav', { yPercent: -100, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.2)
    .from('.showroom__info > *', { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07 }, 0.1)
    .from('.showroom__profile, .showroom__controls, .showroom__hint', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 0.4)
    .from('.showroom__bgword', { scale: 1.3, opacity: 0, duration: 1.6, ease: 'expo.out' }, 0)
    .add(() => lenis.start(), 0.5);
}
