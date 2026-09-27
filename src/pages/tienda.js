import '../styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { setupPage, resumeHint } from '../common.js';
import { Loader } from '../loader.js';
import { FLAVORS } from '../data/flavors.js';
import { SIZES, PACKS, listPrice, packPrice, subscriptionPrice, euro } from '../data/shop.js';
import { cart } from '../cart.js';
import { Crate } from '../three/crate.js';
import { toast, initCounters } from '../ui.js';

// Página de la Tienda: caja 3D para armar tu pack, packs listos, suscripción, envíos y preguntas.
// El carrito es el mismo en todas las páginas (src/cart.js y src/cartDrawer.js).

const { lenis, sound, cartDrawer } = setupPage();

boot();

async function boot() {
  const loader = new Loader({ auto: true });
  const minimum = Loader.minimum(1.2);

  await Promise.allSettled([
    document.fonts.load('400 100px "Anton"'),
    document.fonts.load('500 40px "Space Grotesk"'),
    document.fonts.load('700 40px "Space Grotesk"'),
  ]);
  loader.setProgress(0.05);

  const section = document.querySelector('.builder');
  const crate = await Crate.create(section.querySelector('.builder__canvas'), FLAVORS, (ratio) =>
    loader.setProgress(0.05 + ratio * 0.9),
  );

  initBuilder(section, crate);
  buildPacks();
  initSubscription();
  initFaq();
  initReveals();

  // Solo se dibuja cuando la caja se ve (y no mientras la tapa la pantalla de carga)
  let inView = true;
  let started = false;
  new IntersectionObserver(([entry]) => (inView = entry.isIntersecting)).observe(section);
  gsap.ticker.add((time) => {
    if (started && inView) crate.update(time);
  });

  ScrollTrigger.refresh();
  await minimum;
  loader.ready();
  await Loader.pause();
  started = true;
  await loader.exit();
  resumeHint(sound);
  intro(crate);
}

// Artículo del carrito a partir de una mezcla de sabores
function mixItem(id, name, mix, price) {
  const detail = mix
    .map((n, i) => (n ? `${n} ${FLAVORS[i].name}` : ''))
    .filter(Boolean)
    .join(' · ');
  const colors = mix.flatMap((n, i) => (n ? [FLAVORS[i].color] : []));
  return { id, name, detail, price, colors };
}

function addToCart(item) {
  cart.add(item);
  sound.pop();
  toast(`${item.name} añadido al carrito`);
}

// ---------- 01 · Arma tu pack ----------

function initBuilder(section, crate) {
  const q = (sel) => section.querySelector(sel);
  const sizesEl = q('.js-sizes');
  const picker = q('.js-picker');
  const addButton = q('.js-add-pack');
  let size = SIZES[1];

  sizesEl.innerHTML = SIZES.map(
    (s) => `
      <button type="button" class="size" role="radio" data-cans="${s.cans}">
        <b>${s.cans}</b>
        <span>latas</span>
        <small>${s.off ? `−${Math.round(s.off * 100)} %` : 'Precio base'}</small>
      </button>`,
  ).join('');

  picker.innerHTML = FLAVORS.map(
    (f, i) => `
      <li class="picker__row" style="--c:${f.color}">
        <span class="picker__can" aria-hidden="true"></span>
        <span class="picker__name">${f.full}<small>${f.notes.join(' · ')}</small></span>
        <div class="picker__stepper">
          <button type="button" class="js-minus" data-flavor="${i}" aria-label="Quitar una lata de ${f.full}">−</button>
          <output class="js-count">0</output>
          <button type="button" class="js-plus" data-flavor="${i}" aria-label="Añadir una lata de ${f.full}">+</button>
        </div>
      </li>`,
  ).join('');

  const setSize = (cans, animate = true) => {
    size = SIZES.find((s) => s.cans === cans);
    sizesEl.querySelectorAll('.size').forEach((b) => {
      const on = Number(b.dataset.cans) === cans;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', String(on));
    });
    crate.setSize(size, animate);
  };

  sizesEl.addEventListener('click', (e) => {
    const b = e.target.closest('.size');
    if (!b) return;
    setSize(Number(b.dataset.cans));
    sound.swap();
  });

  picker.addEventListener('click', (e) => {
    const plus = e.target.closest('.js-plus');
    const minus = e.target.closest('.js-minus');
    if (plus && !crate.add(Number(plus.dataset.flavor))) {
      toast('La caja está llena: elige una más grande o saca alguna lata');
      gsap.fromTo(section.querySelector('.builder__bar'), { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    }
    if (minus) crate.removeFlavor(Number(minus.dataset.flavor));
  });

  q('.js-shuffle').addEventListener('click', () => crate.shuffle());
  q('.js-clear').addEventListener('click', () => crate.clear());
  crate.onLand = () => sound.clink();
  crate.onPick = () => sound.swap();

  let wasFull = false;
  crate.onChange((counts) => {
    const filled = counts.reduce((a, b) => a + b, 0);
    const full = filled === size.cans;
    picker.querySelectorAll('.js-count').forEach((out, i) => {
      if (out.textContent !== String(counts[i])) gsap.fromTo(out, { scale: 1.5 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
      out.textContent = counts[i];
    });
    q('.js-filled').textContent = filled;
    q('.js-capacity').textContent = size.cans;
    q('.js-fill-bar').style.transform = `scaleX(${filled / size.cans})`;
    section.classList.toggle('is-full', full);

    const price = packPrice(size.cans);
    q('.js-old').textContent = size.off ? euro(listPrice(size.cans)) : '';
    q('.js-price').textContent = euro(price);
    q('.js-per').textContent = `${euro(price / size.cans)} / lata`;

    addButton.disabled = !full;
    addButton.innerHTML = full
      ? `Añadir al carrito <span class="btn__arrow">+</span>`
      : `Faltan ${size.cans - filled} ${size.cans - filled === 1 ? 'lata' : 'latas'}`;
    // Caja llena: un pequeño subidón de la música
    if (full && !wasFull) sound.swell(1.4, 0.8);
    wasFull = full;
  });

  addButton.addEventListener('click', () => {
    const counts = crate.counts();
    addToCart(mixItem(`pack-${size.cans}-${counts.join('-')}`, `Tu pack de ${size.cans}`, counts, packPrice(size.cans)));
    gsap.fromTo(addButton, { scale: 0.94 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    cartDrawer.open();
  });

  setSize(size.cans, false);
  return { crate };
}

// ---------- 02 · Packs listos ----------

// Latas dibujadas con CSS: un degradado del color del sabor con brillo metálico
const miniCans = (mix) =>
  mix
    .flatMap((n, i) => Array.from({ length: Math.min(n, 3) }, () => `<i style="--c:${FLAVORS[i].color};--d:${FLAVORS[i].deep}"></i>`))
    .slice(0, 8)
    .join('');

function buildPacks() {
  const grid = document.querySelector('.js-packs');
  grid.innerHTML = PACKS.map((pack) => {
    const cans = pack.mix.reduce((a, b) => a + b, 0);
    const main = FLAVORS[pack.mix.findIndex((n) => n === Math.max(...pack.mix))];
    const price = pack.price ?? packPrice(cans);
    const bg = pack.featured ? '#f4f1e8' : main.bg;
    const ink = pack.featured ? '#0b0b0d' : main.ink;
    return `
      <article class="pack${pack.featured ? ' pack--featured' : ''}" style="--c:${bg};--c-ink:${ink}">
        <div class="pack__cans" aria-hidden="true">${miniCans(pack.mix)}</div>
        <div class="pack__body">
          <p class="pack__meta">${cans} latas${pack.featured ? ' · 2 de cada sabor' : ` · ${main.full}`}</p>
          <h3 class="pack__name">${pack.name}</h3>
          <p class="pack__tag">${pack.tagline}</p>
        </div>
        <div class="pack__foot">
          <p class="pack__price">${euro(price)}${listPrice(cans) > price ? `<s>${euro(listPrice(cans))}</s>` : ''}</p>
          <button type="button" class="pack__add" data-id="${pack.id}">Añadir <span>+</span></button>
        </div>
      </article>`;
  }).join('');

  grid.addEventListener('click', (e) => {
    const button = e.target.closest('.pack__add');
    if (!button) return;
    const pack = PACKS.find((p) => p.id === button.dataset.id);
    const cans = pack.mix.reduce((a, b) => a + b, 0);
    addToCart(mixItem(`ready-${pack.id}`, pack.name, pack.mix, pack.price ?? packPrice(cans)));
    button.classList.add('is-added');
    button.innerHTML = 'Añadido <span>✓</span>';
    setTimeout(() => {
      button.classList.remove('is-added');
      button.innerHTML = 'Añadir <span>+</span>';
    }, 1600);
  });
}

// ---------- 03 · Suscripción ----------

function initSubscription() {
  const section = document.querySelector('.sub');
  const q = (sel) => section.querySelector(sel);
  const state = { cans: 12, weeks: 4 };
  const dateFormat = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

  const render = () => {
    const price = subscriptionPrice(state.cans);
    const perYear = Math.round(52 / state.weeks);
    const saving = (packPrice(state.cans) - price) * perYear;
    const priceEl = q('.js-sub-price');
    const counter = { v: parseFloat(priceEl.dataset.v || price) };
    priceEl.dataset.v = price;
    gsap.to(counter, { v: price, duration: 0.6, ease: 'power3.out', onUpdate: () => (priceEl.textContent = euro(counter.v)) });
    q('.js-sub-save').innerHTML = `Ahorras <b>${euro(saving)}</b> al año frente a comprar las cajas sueltas.`;

    // Las tres próximas entregas: la primera, en dos días
    const today = new Date();
    q('.js-sub-dates').innerHTML = [0, 1, 2]
      .map((k) => {
        const d = new Date(today);
        d.setDate(d.getDate() + 2 + k * state.weeks * 7);
        return `<li><span>${String(k + 1).padStart(2, '0')}</span>${dateFormat.format(d)}</li>`;
      })
      .join('');
    gsap.from(q('.js-sub-dates').children, { x: 20, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' });
  };

  const toggle = (group, key) =>
    group.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      state[key] = Number(b.dataset[key]);
      group.querySelectorAll('button').forEach((x) => {
        x.classList.toggle('is-active', x === b);
        x.setAttribute('aria-checked', String(x === b));
      });
      render();
    });
  toggle(q('.js-sub-size'), 'cans');
  toggle(q('.js-sub-freq'), 'weeks');

  q('.js-sub-add').addEventListener('click', () => {
    const each = state.cans / FLAVORS.length;
    addToCart({
      ...mixItem(`sub-${state.cans}-${state.weeks}`, `Suscripción · ${state.cans} latas`, FLAVORS.map(() => each), subscriptionPrice(state.cans)),
      detail: `Cada ${state.weeks} semanas · los 4 sabores`,
    });
    cartDrawer.open();
  });

  render();
}

// ---------- 05 · Preguntas: se abren con una animación ----------

function initFaq() {
  document.querySelectorAll('.faq__item').forEach((item) => {
    const summary = item.querySelector('summary');
    const answer = item.querySelector('.faq__answer');
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (item.open) {
        gsap.to(answer, { height: 0, opacity: 0, duration: 0.4, ease: 'power3.inOut', onComplete: () => (item.open = false) });
      } else {
        item.open = true;
        gsap.fromTo(answer, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.5, ease: 'power3.out' });
      }
      item.classList.toggle('is-open', !item.classList.contains('is-open'));
    });
  });
}

// ---------- Animaciones ----------

function intro(crate) {
  gsap
    .timeline()
    .from('.nav', { yPercent: -100, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.2)
    .from('.builder__panel > *', { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.06 }, 0.1)
    .from('.builder__hint', { opacity: 0, duration: 1 }, 1)
    .add(() => lenis.start(), 0.5)
    // Unas latas de bienvenida para que la caja no esté vacía
    .add(() => [0, 1, 2, 3].forEach((f, i) => gsap.delayedCall(i * 0.16, () => crate.add(f))), 0.6);
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
  reveal('.packs > .eyebrow, .packs__title', '.packs');
  reveal('.pack', '.packs__grid', { y: 90, stagger: 0.1 });
  reveal('.sub__card', '.sub', { y: 80, scale: 0.96 });
  reveal('.stats > .eyebrow, .stats__title', '.stats');
  reveal('.stat', '.stats__grid', { stagger: 0.1 });
  reveal('.faq__head > *, .faq__item', '.faq', { stagger: 0.06 });
  reveal('.cta__inner > *', '.cta__inner');
  reveal('.footer__brand', '.footer', { yPercent: 30, y: 0, duration: 1.2 });
  initCounters();
}
