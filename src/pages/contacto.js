import '../styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { setupPage, resumeHint } from '../common.js';
import { Loader } from '../loader.js';
import { FLAVORS } from '../data/flavors.js';
import { toast } from '../ui.js';

// Página de Contacto: burbujas que reaccionan al cursor, canales, formulario que «se mete en una lata»
// y mapa ilustrado de Barcelona con los dos locales. No se envía nada: todo se queda en el navegador.

const { lenis, sound } = setupPage();

const CHANNELS = [
  { title: 'Pedidos y tienda', email: 'pedidos@vertigo-drinks.es', text: 'Dudas con tu pedido, los envíos o tu suscripción.', topic: 'Pedido', flavor: 0 },
  { title: 'Prensa', email: 'prensa@vertigo-drinks.es', text: 'Entrevistas, fotos de producto y notas de prensa.', topic: 'Prensa', flavor: 1 },
  { title: 'Crew y eventos', email: 'crew@vertigo-drinks.es', text: 'Propón un plan o apúntate a echar una mano.', topic: 'Crew y eventos', flavor: 2 },
  { title: 'Trabaja con nosotros', email: 'equipo@vertigo-drinks.es', text: 'Siempre buscamos gente que no frene.', topic: 'Trabajo', flavor: 3 },
];
const TOPICS = ['Pedido', 'Prensa', 'Crew y eventos', 'Trabajo', 'Otra cosa'];

// Posiciones en el mapa (coordenadas del SVG de 800 × 520)
const PLACES = [
  {
    id: 'cocina',
    name: 'La Cocina',
    area: 'Gràcia',
    text: 'Donde empezó todo. Noches de estudio, talleres y la nevera más famosa del crew.',
    hours: 'Lunes a viernes, de 17:00 a 00:00',
    x: 352,
    y: 104,
    color: '#ffe14d',
  },
  {
    id: 'nave',
    name: 'Nave Vértigo',
    area: 'Poblenou',
    text: 'Oficina, almacén y la azotea de las Vértigo Sessions.',
    hours: 'Lunes a viernes, de 9:00 a 18:00',
    x: 632,
    y: 286,
    color: '#ff7a45',
  },
];

const DRAFT = 'vertigo-contact-draft';
const store = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(DRAFT)) || null;
    } catch {
      return null;
    }
  },
  set(value) {
    try {
      if (value) localStorage.setItem(DRAFT, JSON.stringify(value));
      else localStorage.removeItem(DRAFT);
    } catch {
      // Sin almacenamiento: no se guarda el borrador
    }
  },
};

boot();

async function boot() {
  const loader = new Loader({ auto: true });
  const minimum = Loader.minimum(1.2);

  await Promise.allSettled([document.fonts.load('400 100px "Anton"'), document.fonts.load('500 40px "Space Grotesk"')]);
  loader.setProgress(0.6);

  const fizz = initFizz();
  buildChannels();
  initMessage();
  buildMap();
  initReveals();
  loader.setProgress(1);

  ScrollTrigger.refresh();
  await minimum;
  loader.ready();
  await Loader.pause();
  await loader.exit();
  resumeHint(sound);
  intro(fizz);
}

// ---------- 01 · Burbujas ----------

function initFizz() {
  const section = document.querySelector('.fizz');
  const canvas = section.querySelector('.js-fizz');
  const g = canvas.getContext('2d');
  const counter = section.querySelector('.js-popped');
  const pointer = { x: -999, y: -999, vx: 0, vy: 0 };
  let W = 0;
  let H = 0;
  let bubbles = [];
  const pops = [];
  let popped = 0;

  const spawn = (anywhere) => {
    const r = 5 + Math.pow(Math.random(), 2.2) * 38;
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + r + Math.random() * 60,
      r,
      vx: 0,
      rise: 18 + r * 0.9 + Math.random() * 20,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.35 + Math.random() * 0.5,
      grow: anywhere ? 1 : 0,
    };
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio, 2);
    W = section.clientWidth;
    H = section.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = W < 700 ? 40 : 80;
    bubbles = Array.from({ length: count }, () => spawn(true));
  };
  resize();
  new ResizeObserver(resize).observe(section);

  section.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    pointer.vx = x - pointer.x;
    pointer.vy = y - pointer.y;
    pointer.x = x;
    pointer.y = y;
  });
  section.addEventListener('pointerleave', () => {
    pointer.x = pointer.y = -999;
  });

  // Clic: explota la burbuja más pequeña que haya debajo del puntero
  section.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const hits = bubbles.filter((b) => Math.hypot(b.x - x, b.y - y) < b.r + 6).sort((a, b) => a.r - b.r);
    const b = hits[0];
    if (!b) return;
    pops.push({ x: b.x, y: b.y, r: b.r, t: 0 });
    Object.assign(b, spawn(false));
    popped++;
    counter.textContent = popped;
    gsap.fromTo(counter, { scale: 1.4 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    sound.bubble(Math.min(1, b.r / 40));
    if (popped % 25 === 0) {
      toast(`¡${popped} burbujas! Esto no tiene fondo`);
      sound.swell(1.4, 0.6);
    }
  });

  const draw = (dt, time) => {
    g.clearRect(0, 0, W, H);
    for (const b of bubbles) {
      // El cursor empuja las burbujas (más a las pequeñas)
      const dx = b.x - pointer.x;
      const dy = b.y - pointer.y;
      const dist = Math.hypot(dx, dy);
      const reach = 110 + b.r;
      if (dist < reach && dist > 0.1) {
        const force = (1 - dist / reach) * (900 / (b.r + 10));
        b.vx += (dx / dist) * force * dt * 60;
        b.y += (dy / dist) * force * dt * 30;
      }
      b.vx *= 0.94;
      b.grow = Math.min(1, b.grow + dt * 2);
      b.x += b.vx * dt + Math.sin(time * 1.3 + b.phase) * 0.25;
      b.y -= b.rise * dt;
      if (b.y < -b.r - 10 || b.x < -80 || b.x > W + 80) Object.assign(b, spawn(false));

      const r = b.r * b.grow;
      g.beginPath();
      g.arc(b.x, b.y, r, 0, Math.PI * 2);
      g.strokeStyle = `rgba(255, 225, 77, ${b.alpha})`;
      g.lineWidth = Math.max(1, r * 0.06);
      g.stroke();
      g.fillStyle = `rgba(255, 225, 77, ${b.alpha * 0.08})`;
      g.fill();
      g.beginPath();
      g.arc(b.x - r * 0.35, b.y - r * 0.35, Math.max(0.8, r * 0.18), 0, Math.PI * 2);
      g.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
      g.fill();
    }

    // Explosiones: un aro que se abre y gotitas que salen disparadas
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.t += dt * 2.6;
      if (p.t >= 1) {
        pops.splice(i, 1);
        continue;
      }
      const a = 1 - p.t;
      g.beginPath();
      g.arc(p.x, p.y, p.r * (1 + p.t * 0.8), 0, Math.PI * 2);
      g.strokeStyle = `rgba(255, 255, 255, ${a * 0.7})`;
      g.lineWidth = 1.5;
      g.stroke();
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        const d = p.r * (0.9 + p.t * 1.6);
        g.beginPath();
        g.arc(p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d, 2 * a + 0.5, 0, Math.PI * 2);
        g.fillStyle = `rgba(255, 225, 77, ${a})`;
        g.fill();
      }
    }
  };

  // Solo se dibuja cuando se ve
  let inView = true;
  new IntersectionObserver(([entry]) => (inView = entry.isIntersecting)).observe(section);
  let last = 0;
  gsap.ticker.add((time) => {
    const dt = Math.min(0.05, time - last);
    last = time;
    if (inView) draw(dt, time);
  });

  return { section };
}

// ---------- 02 · Canales ----------

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Sin permiso para el portapapeles: se selecciona el texto a la antigua
    const area = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

function buildChannels() {
  const grid = document.querySelector('.js-channels');
  grid.innerHTML = CHANNELS.map((c, i) => {
    const f = FLAVORS[c.flavor];
    return `
      <article class="channel" style="--c:${f.bg};--c-ink:${f.ink}">
        <span class="channel__num">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="channel__title">${c.title}</h3>
        <p class="channel__text">${c.text}</p>
        <p class="channel__email">${c.email}</p>
        <div class="channel__actions">
          <button type="button" class="channel__btn js-copy" data-i="${i}">Copiar email</button>
          <button type="button" class="channel__btn channel__btn--solid js-write" data-i="${i}">Escribir aquí ↓</button>
        </div>
      </article>`;
  }).join('');

  grid.addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('.js-copy');
    const write = e.target.closest('.js-write');
    if (copyBtn) {
      const c = CHANNELS[copyBtn.dataset.i];
      if (await copy(c.email)) {
        copyBtn.textContent = 'Copiado ✓';
        sound.pop();
        setTimeout(() => (copyBtn.textContent = 'Copiar email'), 1600);
      }
    }
    if (write) {
      const c = CHANNELS[write.dataset.i];
      const radio = document.querySelector(`.js-topics input[value="${c.topic}"]`);
      if (radio) radio.checked = true;
      lenis.scrollTo('#mensaje', { offset: -40, duration: 1.4 });
      setTimeout(() => document.querySelector('.js-message [name="name"]').focus({ preventScroll: true }), 1400);
    }
  });
}

// ---------- 03 · Formulario: el mensaje se mete en la lata y sale volando ----------

function initMessage() {
  const form = document.querySelector('.js-message');
  const error = document.querySelector('.js-message-error');
  const chars = document.querySelector('.js-chars');
  const sent = document.querySelector('.js-sent');
  const can = document.querySelector('.js-send-can');
  const note = document.querySelector('.js-can-note');

  form.querySelector('.js-topics').innerHTML = TOPICS.map(
    (t, i) => `<label class="chip"><input type="radio" name="topic" value="${t}"${i === 0 ? ' checked' : ''} /><span>${t}</span></label>`,
  ).join('');

  const read = () => {
    const data = new FormData(form);
    return {
      topic: data.get('topic'),
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      text: String(data.get('text') || '').trim(),
    };
  };
  const updateChars = () => (chars.textContent = `${form.elements.text.value.length} / 600`);

  // Borrador: se guarda al escribir y se recupera al volver
  const draft = store.get();
  if (draft) {
    form.elements.name.value = draft.name || '';
    form.elements.email.value = draft.email || '';
    form.elements.text.value = draft.text || '';
    const topic = form.querySelector(`[name="topic"][value="${draft.topic}"]`);
    if (topic) topic.checked = true;
  }
  updateChars();
  form.addEventListener('input', () => {
    updateChars();
    error.textContent = '';
    store.set(read());
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const m = read();
    const fail = (message, field) => {
      error.textContent = message;
      form.elements[field].focus();
      gsap.fromTo(form, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    };
    if (!m.name) return fail('Falta tu nombre.', 'name');
    if (!form.elements.email.checkValidity() || !m.email) return fail('Ese email no parece correcto.', 'email');
    if (m.text.length < 10) return fail('Cuéntanos un poco más (mínimo 10 caracteres).', 'text');

    const channel = CHANNELS.find((c) => c.topic === m.topic) || { email: 'hola@vertigo-drinks.es' };
    const number = `#VTG-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    document.querySelector('.js-sent-number').textContent = `Mensaje ${number}`;
    document.querySelector('.js-sent-text').textContent = `Gracias, ${m.name}. Tu mensaje sobre «${m.topic}» iría a ${channel.email} y te contestaríamos a ${m.email} en menos de 24 h laborables.`;
    note.textContent = m.text.slice(0, 60) + (m.text.length > 60 ? '…' : '');

    // La nota entra en la lata, la lata tiembla y sale disparada hacia arriba
    gsap
      .timeline({
        onComplete: () => {
          form.hidden = true;
          sent.hidden = false;
          gsap.fromTo(sent.children, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.07 });
          store.set(null);
          form.reset();
          updateChars();
        },
      })
      .set(can, { opacity: 1, y: 0, rotation: 0 })
      .fromTo(note, { opacity: 0, y: -60, scale: 1 }, { opacity: 1, y: -20, duration: 0.4, ease: 'power2.out' })
      .to(note, { y: 40, scale: 0.3, opacity: 0, duration: 0.45, ease: 'power2.in' })
      .add(() => sound.pop())
      .to(can, { rotation: 8, duration: 0.06, repeat: 5, yoyo: true })
      .to(can, { y: -window.innerHeight, rotation: 540, duration: 0.9, ease: 'power3.in' })
      .add(() => sound.swell(1.5, 1), '-=0.3')
      .to(form, { opacity: 0, y: 20, duration: 0.4 }, '-=0.6')
      .set(form, { opacity: 1, y: 0 });
  });

  document.querySelector('.js-sent-again').addEventListener('click', () => {
    sent.hidden = true;
    form.hidden = false;
    gsap.fromTo(can, { y: -200, rotation: -30, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: 0.9, ease: 'bounce.out' });
    gsap.from(form.children, { y: 20, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05 });
    ScrollTrigger.refresh();
  });
}

// ---------- 04 · Mapa ilustrado ----------

// Manzana del Eixample: un cuadrado con las esquinas cortadas (el famoso chaflán)
const block = (x, y, s) => {
  const c = s * 0.22;
  return `M${x + c} ${y}H${x + s - c}L${x + s} ${y + c}V${y + s - c}L${x + s - c} ${y + s}H${x + c}L${x} ${y + s - c}V${y + c}Z`;
};

function buildMap() {
  const svg = document.querySelector('.js-map');
  const list = document.querySelector('.js-places');
  const coast = 'M0 430 C 180 440, 330 420, 470 380 S 700 300, 800 250 V520 H0 Z';

  // Rejilla de manzanas girada 45°, recortada por la costa
  let blocks = '';
  const S = 30;
  const GAP = 12;
  for (let r = -14; r < 18; r++) {
    for (let c = -14; c < 22; c++) blocks += block(c * (S + GAP), r * (S + GAP), S);
  }
  const waves = Array.from({ length: 6 }, (_, i) => {
    const y = 455 + i * 14;
    return `<path class="city__wave" d="M${i * 40} ${y} q 20 -6 40 0 t 40 0 t 40 0 t 40 0" transform="rotate(-14 400 460)" />`;
  }).join('');

  svg.innerHTML = `
    <defs>
      <clipPath id="land"><path d="M0 0 H800 V250 C 700 300, 600 340, 470 380 S 180 440, 0 430 Z" /></clipPath>
    </defs>
    <rect class="city__land" width="800" height="520" />
    <path class="city__sea" d="${coast}" />
    ${waves}
    <g clip-path="url(#land)">
      <g class="city__blocks" transform="translate(400 260) rotate(45) translate(-300 -330)"><path d="${blocks}" /></g>
      <path class="city__avenue" d="M40 380 L 760 60" />
      <path class="city__avenue city__avenue--thin" d="M120 60 L 560 470" />
    </g>
    <text class="city__label" x="120" y="300">Eixample</text>
    <text class="city__label" x="300" y="46">Gràcia</text>
    <text class="city__label" x="660" y="220">Poblenou</text>
    <text class="city__label city__label--sea" x="470" y="490">Mar Mediterráneo</text>
    <text class="city__label city__label--small" x="470" y="175" transform="rotate(-24 470 175)">Diagonal</text>
    ${PLACES.map(
      (p) => `
      <g class="pin" data-id="${p.id}" style="--p:${p.color}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="${p.name}, ${p.area}">
        <circle class="pin__pulse" r="12" />
        <path class="pin__shape" d="M0 0 C -14 -16, -14 -34, 0 -38 C 14 -34, 14 -16, 0 0 Z" />
        <circle class="pin__dot" cy="-25" r="5" />
      </g>`,
    ).join('')}`;

  list.innerHTML = PLACES.map(
    (p) => `
      <li class="place" data-id="${p.id}" style="--p:${p.color}" tabindex="0">
        <span class="place__dot"></span>
        <div>
          <p class="place__area">${p.area}</p>
          <h3 class="place__name">${p.name}</h3>
          <p class="place__text">${p.text}</p>
          <p class="place__hours">${p.hours}</p>
        </div>
      </li>`,
  ).join('');

  // Pasar por un sitio en la lista (o por su chincheta) enciende los dos
  const select = (id) => {
    svg.querySelectorAll('.pin').forEach((pin) => pin.classList.toggle('is-active', pin.dataset.id === id));
    list.querySelectorAll('.place').forEach((li) => li.classList.toggle('is-active', li.dataset.id === id));
  };
  const onEnter = (e) => {
    const el = e.target.closest('[data-id]');
    if (el) select(el.dataset.id);
  };
  [svg, list].forEach((el) => {
    el.addEventListener('pointerover', onEnter);
    el.addEventListener('focusin', onEnter);
    el.addEventListener('click', (e) => {
      const target = e.target.closest('[data-id]');
      if (!target) return;
      select(target.dataset.id);
      sound.pop();
    });
  });
  select(PLACES[0].id);

  // Las chinchetas caen al llegar al mapa
  gsap.from(svg.querySelectorAll('.pin__shape, .pin__dot'), {
    y: -80,
    opacity: 0,
    duration: 0.9,
    ease: 'bounce.out',
    stagger: 0.15,
    scrollTrigger: { trigger: svg, start: 'top 70%' },
  });
}

// ---------- Animaciones ----------

function intro() {
  gsap
    .timeline()
    .from('.nav', { yPercent: -100, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.2)
    .from('.fizz__title span', { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.1 }, 0.1)
    .from('.fizz .eyebrow, .fizz__lead, .fizz__score, .fizz__hint', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 0.4)
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
  reveal('.channels__head > *', '.channels');
  reveal('.channel', '.channels__grid', { y: 80, stagger: 0.08 });
  reveal('.message__intro > *', '.message', { stagger: 0.06 });
  reveal('.message__form', '.message', { y: 80 });
  reveal('.places__head > *', '.places');
  reveal('.city, .place', '.places__body', { stagger: 0.1 });
  reveal('.footer__brand', '.footer', { yPercent: 30, y: 0, duration: 1.2 });
}
