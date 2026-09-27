import '../styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { setupPage, resumeHint } from '../common.js';
import { Loader } from '../loader.js';
import { FLAVORS } from '../data/flavors.js';
import { Anatomy, CALLOUTS } from '../three/anatomy.js';

// Página de Producto: anatomía de la lata en 3D, ingredientes, información nutricional,
// cafeína comparada con una calculadora y ficha técnica.

const { lenis, sound } = setupPage();

// Formato español: coma decimal y sin ceros de más
const num = (n, decimals = 0) => n.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const RECIPE = [
  { name: 'Agua carbonatada', value: 81.5, text: 'Agua mineral del Montseny con burbuja fina.' },
  { name: 'Zumo de cítricos exprimido en frío', value: 15, text: 'Limón, pomelo, lima o sanguina, según el sabor.' },
  { name: 'Jengibre fresco', value: 2, text: 'Rallado y prensado: el golpe que pica justo.' },
  { name: 'Extracto de guaraná', value: 1.2, text: 'De aquí salen los 80 mg de cafeína natural.' },
  { name: 'Estevia', value: 0.3, text: 'Un toque dulce sin azúcar.' },
];

// Información nutricional por 100 ml. decimals: cómo se escribe cada valor; vrn: referencia diaria (para el %)
const FACTS = [
  { label: 'Valor energético', value: 14, unit: 'kcal', extra: (v) => `${num(v * 4.184)} kJ / `, vrn: 2000 },
  { label: 'Grasas', value: 0, unit: 'g', decimals: 1 },
  { label: 'de las cuales saturadas', value: 0, unit: 'g', decimals: 1, sub: true },
  { label: 'Hidratos de carbono', value: 3.2, unit: 'g', decimals: 1 },
  { label: 'de los cuales azúcares', value: 3, unit: 'g', decimals: 1, sub: true, note: 'de la fruta' },
  { label: 'Proteínas', value: 0, unit: 'g', decimals: 1 },
  { label: 'Sal', value: 0.02, unit: 'g', decimals: 2 },
  { label: 'Vitamina C', value: 12, unit: 'mg', vrn: 80 },
  { label: 'Cafeína', value: 32, unit: 'mg', strong: true },
];

// Cafeína por ración habitual (valores orientativos de la EFSA)
const CAFFEINE = [
  { name: 'Café de filtro', serving: 'taza de 200 ml', mg: 90 },
  { name: 'Vértigo', serving: 'lata de 250 ml', mg: 80, brand: true },
  { name: 'Espresso', serving: 'taza de 60 ml', mg: 80 },
  { name: 'Té negro', serving: 'taza de 220 ml', mg: 50 },
  { name: 'Refresco de cola', serving: 'lata de 355 ml', mg: 40 },
  { name: 'Chocolate negro', serving: 'tableta de 50 g', mg: 25 },
];
const DAILY_LIMIT = 400;

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

  const section = document.querySelector('.anatomy');
  const anatomy = await Anatomy.create(section.querySelector('.anatomy__canvas'), FLAVORS, (ratio) =>
    loader.setProgress(0.05 + ratio * 0.9),
  );

  const drawAnatomy = initAnatomy(section, anatomy);
  buildRecipe();
  initNutrition();
  initCaffeine();
  initDose();
  initReveals();

  // Solo se dibuja cuando la anatomía se ve (y no mientras la tapa la pantalla de carga)
  let inView = true;
  let started = false;
  new IntersectionObserver(([entry]) => (inView = entry.isIntersecting)).observe(section);
  let last = 0;
  gsap.ticker.add((time) => {
    const dt = Math.min(0.05, time - last);
    last = time;
    if (started && inView) drawAnatomy(time, dt);
  });

  ScrollTrigger.refresh();
  await minimum;
  loader.ready();
  await Loader.pause();
  started = true;
  await loader.exit();
  resumeHint(sound);
  intro();
}

// ---------- 01 · Anatomía ----------

function initAnatomy(section, anatomy) {
  const list = section.querySelector('.js-callouts');
  list.innerHTML = CALLOUTS.map(
    (c) => `
      <li class="callout" data-id="${c.id}">
        <span class="callout__dot"></span>
        <span class="callout__line"></span>
        <div class="callout__text"><b>${c.title}</b><span>${c.text}</span></div>
      </li>`,
  ).join('');
  const callouts = [...list.children];
  const intro = section.querySelector('.anatomy__intro');
  const phaseItems = [...section.querySelectorAll('.js-phase')];
  const bar = section.querySelector('.js-anatomy-bar');

  // Sabores: cambian la etiqueta, la bebida de dentro y el color de la luz
  const flavorsEl = section.querySelector('.js-flavors');
  flavorsEl.innerHTML = FLAVORS.map(
    (f, i) =>
      `<button type="button" role="radio" aria-checked="${i === 0}" class="${i === 0 ? 'is-active' : ''}" style="--c:${f.color}" data-index="${i}"><i></i>${f.name}</button>`,
  ).join('');
  flavorsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-index]');
    if (!b) return;
    const i = Number(b.dataset.index);
    anatomy.setFlavor(i);
    flavorsEl.querySelectorAll('button').forEach((x) => {
      x.classList.toggle('is-active', x === b);
      x.setAttribute('aria-checked', String(x === b));
    });
    gsap.to(section, { '--glow': FLAVORS[i].color, duration: 0.8 });
    sound.swap();
  });

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      anatomy.progress = self.progress;
      bar.style.transform = `scaleX(${self.progress})`;
    },
  });

  let current = 'intro';
  let filled = false;
  return (time, dt) => {
    anatomy.update(time, dt);
    const phases = anatomy.phases();

    intro.style.opacity = phases.intro.toFixed(3);
    intro.style.transform = `translateY(${(-40 * (1 - phases.intro)).toFixed(1)}px)`;

    anatomy.anchors().forEach((a, i) => {
      const el = callouts[i];
      el.classList.toggle('is-left', a.side < 0);
      el.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px)`;
      el.style.opacity = a.visible.toFixed(3);
      el.style.visibility = a.visible > 0.01 ? 'visible' : 'hidden';
    });

    // Fase activa (la que más pesa ahora mismo) y sonido al cambiar
    const next = phases.outro > 0.5 ? 'outro' : phases.xray > 0.5 ? 'xray' : phases.explode > 0.5 ? 'explode' : 'intro';
    if (next !== current) {
      current = next;
      phaseItems.forEach((li) => li.classList.toggle('is-active', li.dataset.phase === next));
      sound.swap();
    }
    // La lata se acaba de llenar: subidón de la música
    if (!filled && phases.xray > 0.97) {
      filled = true;
      sound.swell(1.5, 1);
    }
    if (phases.xray < 0.5) filled = false;
  };
}

// ---------- 02 · Ingredientes ----------

function buildRecipe() {
  const list = document.querySelector('.js-recipe');
  list.innerHTML = RECIPE.map(
    (r) => `
      <li class="recipe__row">
        <div class="recipe__name"><b>${r.name}</b><span>${r.text}</span></div>
        <div class="recipe__track">
          <i style="--w:${r.value}"></i>
          <span class="recipe__value">${num(r.value, r.value % 1 ? 1 : 0)} %</span>
        </div>
      </li>`,
  ).join('');

  gsap.from(list.querySelectorAll('.recipe__track i'), {
    scaleX: 0,
    duration: 1.4,
    ease: 'expo.out',
    stagger: 0.1,
    scrollTrigger: { trigger: list, start: 'top 75%' },
  });
}

// ---------- 03 · Información nutricional ----------

function initNutrition() {
  const body = document.querySelector('.js-facts');
  const label = document.querySelector('.js-per-label');
  const toggle = document.querySelector('.js-per');
  let per = 250;

  body.innerHTML = FACTS.map(
    (f, i) => `
      <tr class="${f.sub ? 'is-sub' : ''}${f.strong ? ' is-strong' : ''}">
        <th scope="row">${f.label}${f.note ? ` <small>(${f.note})</small>` : ''}</th>
        <td class="js-fact" data-i="${i}"></td>
        <td class="facts__vrn js-vrn" data-i="${i}"></td>
      </tr>`,
  ).join('');
  const cells = [...body.querySelectorAll('.js-fact')];
  const vrns = [...body.querySelectorAll('.js-vrn')];
  const shown = FACTS.map((f) => f.value * 2.5);

  const write = (i, v) => {
    const f = FACTS[i];
    cells[i].textContent = `${f.extra ? f.extra(v) : ''}${num(v, f.decimals || 0)} ${f.unit}`;
    vrns[i].textContent = f.vrn ? `${num(Math.round((v / f.vrn) * 100))} %*` : '';
  };

  const render = (animate) => {
    FACTS.forEach((f, i) => {
      const target = f.value * (per / 100);
      if (!animate) {
        shown[i] = target;
        write(i, target);
        return;
      }
      const counter = { v: shown[i] };
      gsap.to(counter, {
        v: target,
        duration: 0.7,
        ease: 'power3.out',
        onUpdate: () => write(i, counter.v),
        onComplete: () => (shown[i] = target),
      });
    });
    label.textContent = per === 100 ? '100 ml' : 'lata (250 ml)';
  };

  toggle.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    per = Number(b.dataset.per);
    toggle.querySelectorAll('button').forEach((x) => {
      x.classList.toggle('is-active', x === b);
      x.setAttribute('aria-checked', String(x === b));
    });
    render(true);
  });
  render(false);
}

// ---------- 04 · Cafeína: gráfico de barras con tooltip ----------

function initCaffeine() {
  const list = document.querySelector('.js-bars');
  const tip = document.querySelector('.js-tip');
  const max = 100;

  list.innerHTML = CAFFEINE.map(
    (d, i) => `
      <li class="bars__row${d.brand ? ' is-brand' : ''}" data-i="${i}">
        <span class="bars__label">${d.name}</span>
        <span class="bars__track">
          <i style="--w:${(d.mg / max) * 100}"></i>
          <b class="bars__value">${d.mg}</b>
        </span>
      </li>`,
  ).join('');

  gsap.from(list.querySelectorAll('.bars__track i'), {
    scaleX: 0,
    duration: 1.2,
    ease: 'expo.out',
    stagger: 0.08,
    scrollTrigger: { trigger: list, start: 'top 75%' },
  });

  // Tooltip: toda la fila es zona de hover (más grande que la barra)
  const figure = list.closest('.chart');
  list.addEventListener('pointermove', (e) => {
    const row = e.target.closest('.bars__row');
    if (!row) return;
    const d = CAFFEINE[Number(row.dataset.i)];
    tip.innerHTML = `<b>${d.name}</b><span>${d.serving}</span><strong>${d.mg} mg</strong>`;
    const r = figure.getBoundingClientRect();
    tip.style.transform = `translate(${e.clientX - r.left + 16}px, ${e.clientY - r.top + 16}px)`;
    tip.classList.add('is-visible');
    list.querySelectorAll('.bars__row').forEach((x) => x.classList.toggle('is-dim', x !== row));
  });
  list.addEventListener('pointerleave', () => {
    tip.classList.remove('is-visible');
    list.querySelectorAll('.bars__row').forEach((x) => x.classList.remove('is-dim'));
  });
}

// Calculadora: suma lo tomado hoy frente al límite diario
function initDose() {
  const list = document.querySelector('.js-dose');
  const drinks = CAFFEINE.filter((d) => d.name !== 'Chocolate negro');
  const counts = drinks.map((d) => (d.brand ? 1 : 0));
  const total = document.querySelector('.js-dose-total');
  const bar = document.querySelector('.js-dose-bar');
  const status = document.querySelector('.js-dose-status');
  const meter = document.querySelector('.meter');
  const shown = { v: 0 };

  list.innerHTML = drinks
    .map(
      (d, i) => `
        <li class="dose__row">
          <span>${d.name}<small>${d.serving} · ${d.mg} mg</small></span>
          <div class="picker__stepper">
            <button type="button" class="js-less" data-i="${i}" aria-label="Quitar ${d.name}">−</button>
            <output class="js-n">${counts[i]}</output>
            <button type="button" class="js-more" data-i="${i}" aria-label="Añadir ${d.name}">+</button>
          </div>
        </li>`,
    )
    .join('');
  const outputs = [...list.querySelectorAll('.js-n')];

  const render = () => {
    const mg = drinks.reduce((sum, d, i) => sum + d.mg * counts[i], 0);
    gsap.to(shown, { v: mg, duration: 0.6, ease: 'power3.out', onUpdate: () => (total.textContent = num(Math.round(shown.v))) });
    bar.style.transform = `scaleX(${Math.min(1, mg / DAILY_LIMIT)})`;
    const level = mg > DAILY_LIMIT ? 'critical' : mg > DAILY_LIMIT / 2 ? 'warning' : 'good';
    meter.dataset.level = level;
    status.innerHTML = {
      good: '<i aria-hidden="true">✓</i> Vas bien',
      warning: '<i aria-hidden="true">!</i> Cerca del límite: mejor agua a partir de aquí',
      critical: '<i aria-hidden="true">✕</i> Por encima de lo recomendado',
    }[level];
    outputs.forEach((o, i) => (o.textContent = counts[i]));
  };

  list.addEventListener('click', (e) => {
    const more = e.target.closest('.js-more');
    const less = e.target.closest('.js-less');
    if (more) counts[more.dataset.i]++;
    if (less) counts[less.dataset.i] = Math.max(0, counts[less.dataset.i] - 1);
    if (more || less) render();
  });
  render();
}

// ---------- Animaciones ----------

function intro() {
  gsap
    .timeline()
    .from('.nav', { yPercent: -100, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.2)
    .from('.anatomy__intro > *', { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.1)
    .from('.anatomy__phases, .anatomy__flavors', { x: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06 }, 0.4)
    .add(() => lenis.start(), 0.5);
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
  reveal('.inside__head > *', '.inside');
  reveal('.without', '.without');
  reveal('.nutrition__intro > *', '.nutrition');
  reveal('.facts', '.nutrition', { y: 80, rotation: -2 });
  reveal('.caffeine__head > *', '.caffeine');
  reveal('.dose', '.caffeine__body', { y: 80 });
  reveal('.spec__info > *', '.spec');
  reveal('.cta__inner > *', '.cta__inner');
  reveal('.footer__brand', '.footer', { yPercent: 30, y: 0, duration: 1.2 });

  // El plano de la lata se dibuja solo al llegar
  ScrollTrigger.create({
    trigger: '.spec',
    start: 'top 70%',
    once: true,
    onEnter: () => document.querySelector('.js-blueprint').classList.add('is-drawn'),
  });
}
