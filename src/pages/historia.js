import '../styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { setupPage, resumeHint } from '../common.js';
import { Loader } from '../loader.js';
import { FLAVORS } from '../data/flavors.js';
import { Grove } from '../three/grove.js';
import { drawCitrus } from '../three/textures.js';
import { splitWords, initCounters } from '../ui.js';

// Página de Historia: portada 3D con la fruta, el porqué, cronología horizontal,
// el proceso del árbol a la lata, el radar de origen de los ingredientes y la regla de oro.

const { lenis, sound, navTheme } = setupPage();
const pad = (n) => String(n).padStart(2, '0');

boot();

async function boot() {
  const loader = new Loader({ auto: true });
  const minimum = Loader.minimum(1.2);

  await Promise.allSettled([document.fonts.load('400 100px "Anton"'), document.fonts.load('500 40px "Space Grotesk"')]);
  loader.setProgress(0.05);

  const hero = document.querySelector('.origin-hero');
  const grove = await Grove.create(hero.querySelector('.origin-hero__canvas'), (ratio) =>
    loader.setProgress(0.05 + ratio * 0.9),
  );

  drawSlices();
  buildTries();
  buildRadar();

  initHero(hero, grove);
  initWhy();
  initChrono();
  initProcess();
  initOrigins();
  initPledge();
  initReveals();

  // Solo se dibuja cuando la portada se ve (y no mientras la tapa la pantalla de carga)
  let inView = true;
  let started = false;
  new IntersectionObserver(([entry]) => (inView = entry.isIntersecting)).observe(hero);
  let last = 0;
  gsap.ticker.add((time) => {
    const dt = Math.min(0.05, time - last);
    last = time;
    if (started && inView) grove.update(time, dt);
  });

  ScrollTrigger.refresh();
  await minimum;
  loader.ready();
  await Loader.pause();
  started = true;
  await loader.exit();
  resumeHint(sound);
  intro(grove);
}

// ---------- Dibujos ----------

// Rodajas de los capítulos, con el mismo dibujo que las etiquetas de las latas
function drawSlices() {
  document.querySelectorAll('.chapter__slice').forEach((canvas) => {
    const g = canvas.getContext('2d');
    const r = canvas.width / 2;
    drawCitrus(g, r, r, r * 0.96, FLAVORS[Number(canvas.dataset.flavor)].slice);
  });
}

// Receta nº 47: 46 intentos tachados y el bueno
function buildTries() {
  const grid = document.querySelector('.js-tries');
  grid.innerHTML = Array.from({ length: 47 }, (_, i) => `<span class="tries__cell${i === 46 ? ' is-win' : ''}">${i + 1}</span>`).join('');
}

// ---------- Radar de origen ----------

const HOME = { lat: 41.3874, lon: 2.1686 }; // Barcelona
const ORIGINS = [
  { name: 'Hierbabuena', place: 'El Prat de Llobregat', lat: 41.3246, lon: 2.0953, color: '#9be37a', flavor: 'Lima & Menta' },
  { name: 'Pomelo rosa', place: 'Murcia', lat: 37.9922, lon: -1.1307, color: '#ff7a93', flavor: 'Pomelo Rosa' },
  { name: 'Lima', place: 'Vélez-Málaga', lat: 36.7802, lon: -4.1003, color: '#6ee69a', flavor: 'Lima & Menta' },
  { name: 'Limón', place: 'Siracusa, Sicilia', lat: 37.0755, lon: 15.2866, color: '#ffe14d', flavor: 'Limón Eléctrico' },
  { name: 'Naranja sanguina', place: 'Catania, Sicilia', lat: 37.5079, lon: 15.083, color: '#ff7a45', flavor: 'Naranja Sanguina' },
  { name: 'Guaraná', place: 'Maués, Amazonas (Brasil)', lat: -3.3836, lon: -57.7186, color: '#e8452c', flavor: 'Los cuatro' },
  { name: 'Jengibre', place: 'Satipo (Perú)', lat: -11.2522, lon: -74.6386, color: '#f2b25a', flavor: 'Los cuatro' },
];

const RAD = Math.PI / 180;

// Distancia en km (fórmula del haversine) y rumbo inicial en radianes desde Barcelona
function distanceKm(a, b) {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function bearing(a, b) {
  const dLon = (b.lon - a.lon) * RAD;
  const y = Math.sin(dLon) * Math.cos(b.lat * RAD);
  const x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos(dLon);
  return Math.atan2(y, x);
}

// Escala logarítmica: 10 km, 100 km, 1.000 km y 10.000 km quedan a la misma distancia entre sí
const radius = (km) => 50 + (Math.log10(Math.max(km, 10)) - 1) * 80;
const coord = (value, pos, neg) => `${Math.abs(value).toFixed(2).replace('.', ',')}° ${value >= 0 ? pos : neg}`;

function buildRadar() {
  const svg = document.querySelector('.js-radar');
  const list = document.querySelector('.js-origins');

  const rings = [10, 100, 1000, 10000]
    .map(
      (km) => `
        <circle class="radar__ring" r="${radius(km)}" />
        <text class="radar__ring-label" x="6" y="${-radius(km) - 6}">${km.toLocaleString('es-ES')} km</text>`,
    )
    .join('');
  const axes = `
    <line class="radar__axis" x1="-300" y1="0" x2="300" y2="0" />
    <line class="radar__axis" x1="0" y1="-300" x2="0" y2="300" />
    <text class="radar__cardinal" x="0" y="-302">N</text>
    <text class="radar__cardinal" x="306" y="4">E</text>
    <text class="radar__cardinal" x="0" y="314">S</text>
    <text class="radar__cardinal" x="-306" y="4">O</text>`;

  const points = ORIGINS.map((o, i) => {
    o.km = distanceKm(HOME, o);
    const r = radius(o.km);
    const b = bearing(HOME, o);
    const x = Math.sin(b) * r;
    const y = -Math.cos(b) * r;
    // Etiqueta hacia fuera del centro; las que caen muy juntas (Sicilia) se separan arriba y abajo
    const side = x >= 0 ? 1 : -1;
    const dy = i % 2 ? 16 : -10;
    return `
      <g class="radar__point" data-i="${i}" style="--p:${o.color};--i:${i}">
        <line class="radar__route" x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" pathLength="1" />
        <circle class="radar__pulse" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" />
        <circle class="radar__dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" />
        <text class="radar__label" x="${(x + side * 14).toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${side > 0 ? 'start' : 'end'}">${pad(i + 1)}</text>
      </g>`;
  }).join('');

  svg.innerHTML = `${rings}${axes}${points}
    <circle class="radar__home" r="9" />
    <text class="radar__home-label" y="-20">Barcelona</text>`;

  list.innerHTML = ORIGINS.map(
    (o, i) => `
      <li class="origin" data-i="${i}" style="--p:${o.color}">
        <span class="origin__num">${pad(i + 1)}</span>
        <div class="origin__main">
          <h3>${o.name}</h3>
          <p>${o.place}</p>
        </div>
        <div class="origin__meta">
          <b><span class="js-km" data-km="${Math.round(o.km)}">0</span> km</b>
          <small>${coord(o.lat, 'N', 'S')} · ${coord(o.lon, 'E', 'O')}</small>
        </div>
        <span class="origin__flavor">${o.flavor}</span>
      </li>`,
  ).join('');

  // Al pasar por un ingrediente se ilumina su punto en el radar
  const highlight = (i) => svg.querySelectorAll('.radar__point').forEach((p) => p.classList.toggle('is-active', p.dataset.i === i));
  list.addEventListener('pointerover', (e) => {
    const item = e.target.closest('.origin');
    if (item) highlight(item.dataset.i);
  });
  list.addEventListener('pointerleave', () => highlight(null));
}

// ---------- Animaciones por sección ----------

function intro(grove) {
  gsap
    .timeline()
    .from('.nav', { yPercent: -100, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.2)
    .from('.origin-hero__title .line > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.1 }, 0.05)
    .from('.origin-hero .eyebrow, .origin-hero__bottom > *, .origin-hero__hint', { y: 30, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08 }, 0.5)
    .to(grove.intro, { k: 1, duration: 2.2, ease: 'expo.out' }, 0)
    .add(() => lenis.start(), 0.5);
}

function initHero(hero, grove) {
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom top',
    onUpdate: (self) => (grove.progress = self.progress),
  });
  gsap
    .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
    .to('.origin-hero__content', { yPercent: -35, opacity: 0.15 }, 0)
    .to('.origin-hero__bottom, .origin-hero__hint', { y: -60, opacity: 0 }, 0);
}

function initWhy() {
  const words = splitWords(document.querySelector('.why__text'));
  gsap
    .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.why', start: 'top top', end: 'bottom bottom', scrub: true } })
    .fromTo(words, { opacity: 0.12 }, { opacity: 1, duration: 0.05, stagger: 0.7 / words.length }, 0.05)
    .from('.why__facts li', { opacity: 0, y: 24, duration: 0.06, stagger: 0.04 }, 0.72)
    .set({}, {}, 1);
}

// Cronología: la sección se fija y los capítulos pasan en horizontal con el scroll vertical
function initChrono() {
  const section = document.querySelector('.chrono');
  const track = section.querySelector('.chrono__track');
  const chapters = [...track.children];
  const year = section.querySelector('.js-chrono-year');
  const bar = section.querySelector('.js-chrono-bar');
  const ticks = [...section.querySelectorAll('.chrono__progress li')];
  const YEARS = ['2024', '2024', '2025', '2025', '2026', 'Hoy'];
  const distance = () => track.scrollWidth - window.innerWidth;
  let current = -1;
  let pinned = false;
  // Cada capítulo tiene su tinta (--c-ink): el año, la barra y el menú la toman al llegar
  const inks = chapters.map((c) => getComputedStyle(c).getPropertyValue('--c-ink').trim());
  const lastIndex = chapters.length - 1;
  const paintNav = () => navTheme.set('chrono', pinned && current < lastIndex);

  const setChapter = (i) => {
    if (i === current) return;
    const first = current === -1;
    current = i;
    ticks.forEach((t, j) => t.classList.toggle('is-active', j <= i));
    gsap.to(section.querySelectorAll('.chrono__head, .chrono__progress'), { color: inks[i], duration: first ? 0 : 0.5 });
    paintNav();
    if (year.textContent !== YEARS[i]) {
      gsap.fromTo(year, { yPercent: first ? 0 : 60, opacity: first ? 1 : 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
      year.textContent = YEARS[i];
    }
    if (!first) sound.swap();
    // Último capítulo («Hoy»): la música sube un momento
    if (i === chapters.length - 1) sound.swell(1.5, 1.2);
  };
  setChapter(0);

  const move = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onToggle: (self) => {
        pinned = self.isActive;
        paintNav();
      },
      onUpdate: (self) => {
        bar.style.transform = `scaleX(${self.progress})`;
        setChapter(Math.min(chapters.length - 1, Math.round(self.progress * (chapters.length - 1))));
      },
    },
  });

  // Dentro de cada capítulo: el texto entra desde la derecha y el dibujo va más despacio (paralaje)
  chapters.forEach((chapter, i) => {
    const art = chapter.querySelector('.chapter__art');
    gsap.fromTo(art, { xPercent: 18 }, {
      xPercent: -18,
      ease: 'none',
      scrollTrigger: { containerAnimation: move, trigger: chapter, start: 'left right', end: 'right left', scrub: true },
    });
    if (i === 0) return; // el primero ya está a la vista al llegar
    gsap.from(chapter.querySelectorAll('.chapter__text > *'), {
      x: 90,
      opacity: 0,
      duration: 1,
      ease: 'expo.out',
      stagger: 0.07,
      scrollTrigger: { containerAnimation: move, trigger: chapter, start: 'left 65%' },
    });
  });

  // Animaciones propias de cada dibujo, al llegar a su capítulo
  const onArrive = (index, fn) =>
    ScrollTrigger.create({ containerAnimation: move, trigger: chapters[index], start: 'left 55%', once: true, onEnter: fn });

  gsap.set('.chapter__slice', { rotation: -40, scale: 0.85 });
  gsap.to(chapters[0].querySelector('.chapter__slice'), {
    rotation: 0,
    scale: 1,
    duration: 1.6,
    ease: 'expo.out',
    scrollTrigger: { trigger: section, start: 'top 70%' },
  });

  onArrive(1, () => {
    const cells = chapters[1].querySelectorAll('.tries__cell');
    gsap
      .timeline()
      .to([...cells].slice(0, 46), {
        opacity: 0.55,
        duration: 0.2,
        stagger: {
          each: 0.028,
          onStart() {
            this.targets()[0].classList.add('is-crossed');
          },
        },
      })
      .fromTo(cells[46], { scale: 0.4 }, { scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.4)', onStart: () => cells[46].classList.add('is-on') });
  });

  onArrive(3, () => {
    chapters[3].querySelector('.first-can').classList.add('is-drawn');
    const count = chapters[3].querySelector('.js-cans');
    const counter = { v: 0 };
    gsap.to(counter, { v: 500, duration: 2, ease: 'power3.out', onUpdate: () => (count.textContent = Math.round(counter.v)) });
  });

  onArrive(4, () =>
    gsap.to(chapters[4].querySelectorAll('.chapter__slice'), { rotation: 0, scale: 1, duration: 1.2, ease: 'back.out(1.6)', stagger: 0.12 }),
  );

  onArrive(5, () => chapters[5].querySelector('.next-spiral').classList.add('is-drawn'));
}

// Del árbol a la lata: el paso que está en el centro de la pantalla se enciende y el tubo se llena
function initProcess() {
  const steps = [...document.querySelectorAll('.step')];
  const num = document.querySelector('.js-process-num');
  const fill = document.querySelector('.js-process-fill');

  const activate = (i) => {
    steps.forEach((s, j) => s.classList.toggle('is-active', i === j));
    const next = pad(i + 1);
    if (num.textContent === next) return;
    gsap
      .timeline()
      .to(num, { yPercent: -40, opacity: 0, duration: 0.18, ease: 'power2.in' })
      .add(() => (num.textContent = next))
      .fromTo(num, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
  };
  activate(0);

  steps.forEach((step, i) => {
    ScrollTrigger.create({
      trigger: step,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => self.isActive && activate(i),
    });
  });

  // Se recorta en lugar de escalar, para que las burbujas de dentro no se deformen
  gsap.fromTo(fill, { clipPath: 'inset(0% 100% 0% 0%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)',
    ease: 'none',
    scrollTrigger: { trigger: '.process__steps', start: 'top 55%', end: 'bottom 55%', scrub: true },
  });
}

function initOrigins() {
  gsap.from('.radar', {
    scale: 0.85,
    opacity: 0,
    duration: 1.4,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.origins__body', start: 'top 75%' },
  });
  gsap.from('.radar__point', {
    opacity: 0,
    duration: 0.8,
    stagger: 0.12,
    ease: 'power2.out',
    delay: 0.3,
    scrollTrigger: {
      trigger: '.origins__body',
      start: 'top 75%',
      onEnter: () => document.querySelector('.radar').classList.add('is-live'),
    },
  });
  gsap.from('.origin', {
    x: 60,
    opacity: 0,
    duration: 1,
    ease: 'expo.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '.origins__list', start: 'top 80%' },
  });

  // Kilómetros contando desde 0, con separador de miles
  document.querySelectorAll('.js-km').forEach((el) => {
    const counter = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () =>
        gsap.to(counter, {
          v: Number(el.dataset.km),
          duration: 2,
          ease: 'power3.out',
          onUpdate: () => (el.textContent = Math.round(counter.v).toLocaleString('es-ES', { useGrouping: 'always' })),
        }),
    });
  });
}

// La regla de oro se "llena" de amarillo mientras se lee
function initPledge() {
  gsap.fromTo('.js-pledge', { backgroundPositionX: '100%' }, {
    backgroundPositionX: '0%',
    ease: 'none',
    scrollTrigger: {
      trigger: '.pledge',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      // Cuando la frase termina de llenarse, subidón de la música
      onLeave: () => sound.swell(1.7, 1.5),
    },
  });
  gsap.from('.pledge__quote footer', {
    opacity: 0,
    y: 20,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.pledge', start: '60% bottom' },
  });
}

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
  reveal('.origins__head > *', '.origins');
  reveal('.stats > .eyebrow, .stats__title', '.stats');
  reveal('.stat', '.stats__grid', { stagger: 0.1 });
  reveal('.cta__inner > *', '.cta__inner');
  reveal('.footer__brand', '.footer', { yPercent: 30, y: 0, duration: 1.2 });
  initCounters();
}
