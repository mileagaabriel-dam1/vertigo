import '../styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

import { setupPage, resumeHint } from '../common.js';
import { Loader } from '../loader.js';
import { FLAVORS } from '../data/flavors.js';
import { EVENT_TYPES, upcomingEvents, MEMBERS, TIERS, DISTRICTS } from '../data/crew.js';
import { drawCitrus } from '../three/textures.js';
import { toast } from '../ui.js';

// Página Crew: pared de pegatinas que se lanzan, agenda de planes, niveles, caras del crew y carnet de miembro.
// Lo que hace cada visitante (planes apuntados y su carnet) se guarda solo en su navegador.

gsap.registerPlugin(Draggable, InertiaPlugin);
const { lenis, sound } = setupPage();

const SPIRAL = 'M6 7a1 1 0 0 1 2 0a2 2 0 0 1-4 0a3 3 0 0 1 6 0a4 4 0 0 1-8 0a5 5 0 0 1 10 0';
const store = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Sin almacenamiento: funciona igual, pero no se recuerda al volver
    }
  },
};

boot();

async function boot() {
  const loader = new Loader({ auto: true });
  const minimum = Loader.minimum(1.4);

  await Promise.allSettled([
    document.fonts.load('400 100px "Anton"'),
    document.fonts.load('500 40px "Space Grotesk"'),
    document.fonts.load('700 40px "Space Grotesk"'),
  ]);
  loader.setProgress(0.6);

  const stickers = buildStickers();
  initStats();
  initAgenda();
  initLevels();
  buildPeople();
  initJoin();
  initReveals();
  loader.setProgress(1);

  ScrollTrigger.refresh();
  await minimum;
  loader.ready();
  await Loader.pause();
  await loader.exit();
  resumeHint(sound);
  intro(stickers);
}

// ---------- 01 · Pared de pegatinas ----------

// Rodaja dibujada en un canvas (el mismo dibujo que las etiquetas de las latas)
const slice = (flavor, size) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size * 2;
  drawCitrus(canvas.getContext('2d'), size, size, size * 0.97, flavor.slice);
  return canvas;
};

const STICKERS = [
  { kind: 'logo', x: 54, y: 80, rot: -12 },
  { kind: 'slice', flavor: 0, size: 150, x: 76, y: 12, rot: 8 },
  { kind: 'text', text: 'Sin frenos', cls: 'st-pill st-dark', x: 60, y: 64, rot: -6 },
  { kind: 'star', text: 'Crew', x: 84, y: 58, rot: 12 },
  { kind: 'slice', flavor: 1, size: 110, x: 64, y: 22, rot: -20 },
  { kind: 'bubble', text: '¿Te atreves?', x: 40, y: 72, rot: 5 },
  { kind: 'text', text: '250 ml', cls: 'st-round st-green', x: 90, y: 34, rot: -8 },
  { kind: 'can', flavor: 3, x: 72, y: 38, rot: 16 },
  { kind: 'text', text: 'Receta nº 47', cls: 'st-note', x: 4, y: 82, rot: -4 },
  { kind: 'slice', flavor: 2, size: 96, x: 26, y: 12, rot: 14 },
  { kind: 'text', text: 'BCN · desde 2024', cls: 'st-ticket', x: 46, y: 8, rot: 3 },
  { kind: 'text', text: '0 % azúcar', cls: 'st-pill st-orange', x: 24, y: 88, rot: 7 },
  { kind: 'slice', flavor: 3, size: 120, x: 88, y: 78, rot: -10 },
  { kind: 'can', flavor: 0, x: 54, y: 40, rot: -14 },
];

function buildStickers() {
  const wall = document.querySelector('.wall');
  const layer = wall.querySelector('.js-stickers');

  // En móvil el título ocupa la parte de arriba: las pegatinas se reparten por la mitad de abajo
  const mobile = window.innerWidth < 760;
  const elements = STICKERS.map((s) => {
    const el = document.createElement('div');
    el.className = `sticker sticker--${s.kind}`;
    el.style.left = `${mobile ? Math.min(s.x, 72) : s.x}%`;
    el.style.top = `${mobile ? 46 + s.y * 0.5 : s.y}%`;
    if (s.kind === 'logo') el.innerHTML = `<svg viewBox="1 1 12 12"><path d="${SPIRAL}" /></svg>`;
    if (s.kind === 'slice') el.append(slice(FLAVORS[s.flavor], s.size));
    if (s.kind === 'text') el.innerHTML = `<span class="${s.cls}">${s.text}</span>`;
    if (s.kind === 'star') el.innerHTML = `<span>${s.text}</span>`;
    if (s.kind === 'bubble') el.innerHTML = `<span>${s.text}</span>`;
    if (s.kind === 'can') el.style.cssText += `--c:${FLAVORS[s.flavor].color};--d:${FLAVORS[s.flavor].deep}`;
    gsap.set(el, { rotation: s.rot });
    layer.append(el);
    return el;
  });

  // La que se coge pasa por encima de las demás; al soltarla sigue deslizándose (inercia) y rebota en los bordes
  let top = elements.length;
  elements.forEach((el) => {
    Draggable.create(el, {
      type: 'x,y',
      bounds: wall,
      inertia: true,
      edgeResistance: 0.7,
      onPress() {
        el.style.zIndex = ++top;
        gsap.to(el, { scale: 1.12, rotation: `+=${gsap.utils.random(-8, 8)}`, duration: 0.25, ease: 'power2.out' });
        wall.classList.add('is-playing');
      },
      onRelease() {
        gsap.to(el, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      },
      onThrowComplete() {
        sound.clink();
      },
    });
  });
  return elements;
}

// ---------- 02 · Qué es: contadores con separador de miles ----------

function initStats() {
  document.querySelectorAll('.crew-about__stats b').forEach((el) => {
    const counter = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () =>
        gsap.to(counter, {
          v: Number(el.dataset.count),
          duration: 1.8,
          ease: 'power3.out',
          onUpdate: () => (el.textContent = Math.round(counter.v).toLocaleString('es-ES', { useGrouping: 'always' })),
        }),
    });
  });
}

// ---------- 03 · Agenda ----------

const two = (n) => String(n).padStart(2, '0');

// Archivo .ics para añadir el plan al calendario del móvil o del ordenador
function downloadIcs(event) {
  const stamp = (d) => `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}T${two(d.getHours())}${two(d.getMinutes())}00`;
  const end = new Date(event.date);
  end.setHours(end.getHours() + event.duration);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vértigo Crew//ES',
    'BEGIN:VEVENT',
    `UID:${event.id}-${stamp(event.date)}@vertigo-crew`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(event.date)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:Vértigo Crew · ${event.title}`,
    `LOCATION:${event.place}, Barcelona`,
    `DESCRIPTION:${event.text} (Plan ficticio de un proyecto académico)`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `vertigo-${event.id}.ics` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function initAgenda() {
  const events = upcomingEvents();
  const list = document.querySelector('.js-agenda');
  const filters = document.querySelector('.js-filters');
  const joined = new Set(store.get('vertigo-crew-events', []));
  const day = new Intl.DateTimeFormat('es-ES', { day: 'numeric' });
  const month = new Intl.DateTimeFormat('es-ES', { month: 'short' });
  const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'long' });
  const typeLabel = (id) => EVENT_TYPES.find((t) => t.id === id).label;

  filters.innerHTML = [{ id: 'all', label: 'Todo' }, ...EVENT_TYPES]
    .map((t, i) => `<button type="button" data-type="${t.id}" class="${i === 0 ? 'is-active' : ''}" aria-pressed="${i === 0}">${t.label}</button>`)
    .join('');

  const row = (e) => {
    const isIn = joined.has(e.id);
    const taken = e.taken + (isIn ? 1 : 0);
    const full = e.taken >= e.capacity;
    const free = Math.max(0, e.capacity - taken);
    const label = full ? (isIn ? 'En lista de espera ✓' : 'Lista de espera') : isIn ? 'Apuntado ✓' : 'Me apunto';
    return `
      <div class="event__date">
        <b>${day.format(e.date)}</b>
        <span>${month.format(e.date).replace('.', '')}</span>
        <small>${weekday.format(e.date)}</small>
      </div>
      <div class="event__main">
        <p class="event__meta">${typeLabel(e.type)} · ${e.hour} h</p>
        <h3 class="event__title">${e.title}</h3>
        <p class="event__place">${e.place}</p>
        <p class="event__text">${e.text}</p>
      </div>
      <div class="event__side">
        <div class="event__spots">
          <div class="event__bar${full ? ' is-full' : ''}"><i style="transform:scaleX(${Math.min(1, taken / e.capacity)})"></i></div>
          <span>${full ? 'Completo' : `${free} ${free === 1 ? 'plaza libre' : 'plazas libres'}`} · ${taken}/${e.capacity}</span>
        </div>
        <div class="event__actions">
          <button type="button" class="event__join js-join-event${isIn ? ' is-in' : ''}">${label}</button>
          <button type="button" class="event__ics js-ics" aria-label="Añadir ${e.title} al calendario">+ Calendario</button>
        </div>
      </div>`;
  };

  list.innerHTML = events.map((e) => `<li class="event" data-id="${e.id}" data-type="${e.type}">${row(e)}</li>`).join('');

  list.addEventListener('click', (ev) => {
    const li = ev.target.closest('.event');
    if (!li) return;
    const e = events.find((x) => x.id === li.dataset.id);
    if (ev.target.closest('.js-ics')) {
      downloadIcs(e);
      toast(`${e.title}: archivo de calendario descargado`);
    }
    if (ev.target.closest('.js-join-event')) {
      const adding = !joined.has(e.id);
      if (adding) joined.add(e.id);
      else joined.delete(e.id);
      store.set('vertigo-crew-events', [...joined]);
      li.innerHTML = row(e);
      if (adding) {
        sound.pop();
        toast(e.taken >= e.capacity ? `Estás en la lista de espera de ${e.title}` : `¡Te vemos en ${e.title}!`);
        gsap.fromTo(li.querySelector('.js-join-event'), { scale: 0.85 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      }
    }
  });

  filters.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    filters.querySelectorAll('button').forEach((x) => {
      x.classList.toggle('is-active', x === b);
      x.setAttribute('aria-pressed', String(x === b));
    });
    const type = b.dataset.type;
    const items = [...list.children];
    const show = items.filter((li) => type === 'all' || li.dataset.type === type);
    const hide = items.filter((li) => !show.includes(li));
    gsap.to(hide, { opacity: 0, y: -10, duration: 0.2, onComplete: () => hide.forEach((li) => (li.hidden = true)) });
    show.forEach((li) => (li.hidden = false));
    gsap.fromTo(show, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05, delay: 0.2 });
    ScrollTrigger.refresh();
  });
}

// ---------- 04 · Niveles ----------

function initLevels() {
  const range = document.querySelector('.js-level-range');
  const count = document.querySelector('.js-level-count');
  const tiersEl = document.querySelector('.js-tiers');
  const perks = document.querySelector('.js-perks');
  const name = document.querySelector('.js-tier-name');
  const max = Number(range.max);

  tiersEl.innerHTML = TIERS.map(
    (t) => `
      <li class="tier">
        <span class="tier__dot"></span>
        <b>${t.name}</b>
        <small>${t.from ? `desde ${t.from}` : 'al unirte'}</small>
      </li>`,
  ).join('');
  const items = [...tiersEl.children];
  let current = -1;

  const render = () => {
    const value = Number(range.value);
    count.textContent = value;
    range.style.setProperty('--fill', `${(value / max) * 100}%`);
    const index = TIERS.reduce((acc, t, i) => (value >= t.from ? i : acc), 0);
    items.forEach((li, i) => li.classList.toggle('is-reached', i <= index));
    if (index === current) return;
    const first = current === -1;
    current = index;
    name.textContent = TIERS[index].name;
    perks.innerHTML = TIERS.slice(0, index + 1)
      .flatMap((t) => t.perks)
      .map((p) => `<li>${p}</li>`)
      .join('');
    if (first) return;
    gsap.from(perks.children, { x: 20, opacity: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out' });
    gsap.fromTo(items[index], { scale: 1.3 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    sound.swap();
    // El nivel más alto: la música sube un momento
    if (index === TIERS.length - 1) sound.swell(1.6, 1);
  };
  range.addEventListener('input', render);
  render();
}

// ---------- 05 · Caras del crew ----------

// Avatar dibujado: círculo del color de su sabor, espiral de la marca y sus iniciales
const avatar = (member) => {
  const f = FLAVORS[member.fav];
  const initials = member.name
    .split(' ')
    .map((w) => w[0])
    .join('');
  return `
    <svg class="person__avatar" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="58" fill="${f.color}" />
      <path d="${SPIRAL}" transform="translate(-8 -12) scale(9.5)" fill="none" stroke="${f.deep}" stroke-width="0.35" opacity="0.5" />
      <text x="60" y="74" text-anchor="middle" fill="${f.ink}">${initials}</text>
    </svg>`;
};

function buildPeople() {
  const grid = document.querySelector('.js-people');
  grid.innerHTML = MEMBERS.map((m) => {
    const f = FLAVORS[m.fav];
    return `
      <article class="person" tabindex="0" style="--c:${f.bg};--c-ink:${f.ink}">
        <div class="person__inner">
          <div class="person__front">
            ${avatar(m)}
            <h3 class="person__name">${m.name}</h3>
            <p class="person__role">${m.role}</p>
            <p class="person__fav"><i style="background:${f.color}"></i>${f.full}</p>
          </div>
          <div class="person__back">
            <p class="person__quote">«${m.quote}»</p>
            <dl class="person__stats">
              <div><dt>Planes</dt><dd>${m.events}</dd></div>
              <div><dt>Desde</dt><dd>${m.since}</dd></div>
            </dl>
          </div>
        </div>
      </article>`;
  }).join('');

  // En pantallas táctiles se gira al tocar
  grid.addEventListener('click', (e) => e.target.closest('.person')?.classList.toggle('is-flipped'));
}

// ---------- 06 · Únete: el carnet se hace mientras escribes ----------

// Número estable a partir de un texto (el mismo nombre da siempre el mismo carnet)
function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

// Cuadrícula tipo código QR (decorativa): tres esquinas fijas y el resto sale del número del carnet
function codeCells(seed) {
  const cells = [];
  let s = seed || 1;
  const rand = () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0), (s % 1000) / 1000);
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < 11; x++) {
      const corner = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
      const center = (x === 1 || x === 9) && (y === 1 || y === 9);
      const on = corner ? !center : rand() > 0.5;
      if (on) cells.push([x, y]);
    }
  }
  return cells;
}

function initJoin() {
  const form = document.querySelector('.js-join');
  const card = document.querySelector('.js-card');
  const error = document.querySelector('.js-join-error');
  const download = document.querySelector('.js-download');
  const q = (sel) => card.querySelector(sel);

  form.querySelector('.js-districts').innerHTML = DISTRICTS.map((d) => `<option>${d}</option>`).join('');
  form.querySelector('.js-interests').innerHTML = EVENT_TYPES.map(
    (t) => `<label class="chip"><input type="checkbox" name="interests" value="${t.label}" /><span>${t.label}</span></label>`,
  ).join('');
  form.querySelector('.js-favs').innerHTML = FLAVORS.map(
    (f, i) =>
      `<label class="chip" style="--c:${f.color}"><input type="radio" name="fav" value="${i}"${i === 0 ? ' checked' : ''} /><span><i></i>${f.name}</span></label>`,
  ).join('');

  const read = () => {
    const data = new FormData(form);
    return {
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      district: data.get('district'),
      interests: data.getAll('interests'),
      fav: Number(data.get('fav') || 0),
    };
  };

  const render = () => {
    const m = read();
    const f = FLAVORS[m.fav];
    const number = `VTG-${String(hash(`${m.name}|${m.email}`) % 100000).padStart(5, '0')}`;
    card.style.setProperty('--card-bg', f.bg);
    card.style.setProperty('--card-ink', f.ink);
    q('.js-card-name').textContent = m.name || 'Tu nombre';
    q('.js-card-number').textContent = number;
    q('.js-card-district').textContent = m.district || '—';
    q('.js-card-flavor').textContent = f.full;
    q('.js-card-tags').textContent = m.interests.length ? m.interests.join(' · ') : 'Elige qué te apetece';
    q('.js-card-code').innerHTML = codeCells(hash(number))
      .map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1" />`)
      .join('');
    return { ...m, number, flavor: f };
  };

  form.addEventListener('input', () => {
    render();
    error.textContent = '';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const m = render();
    const email = form.elements.email;
    if (!m.name) {
      error.textContent = 'Falta tu nombre.';
      form.elements.name.focus();
      return;
    }
    if (!email.checkValidity()) {
      error.textContent = 'Ese email no parece correcto.';
      email.focus();
      return;
    }
    store.set('vertigo-crew-member', { name: m.name, email: m.email, district: m.district, interests: m.interests, fav: m.fav });
    welcome();
  });

  const welcome = (quiet = false) => {
    card.classList.add('is-member');
    download.hidden = false;
    if (quiet) return;
    // En móvil el carnet está debajo del formulario: se baja hasta él para verlo
    if (window.innerWidth < 860) lenis.scrollTo(card, { offset: -100, duration: 1.2 });
    gsap.fromTo(card, { rotationY: -180 }, { rotationY: 0, duration: 1.2, ease: 'expo.out' });
    gsap.fromTo('.member-card__stamp', { scale: 2.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, delay: 0.6, ease: 'back.out(2)' });
    sound.fanfare();
    toast('¡Ya eres del crew! Nos vemos en el próximo plan');
  };

  // Inclinación 3D del carnet siguiendo al ratón
  const wrap = document.querySelector('.join__card-wrap');
  const tiltX = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
  const tiltY = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
  gsap.set(card, { transformPerspective: 900 });
  wrap.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    tiltY(((e.clientX - r.left) / r.width - 0.5) * 16);
    tiltX(-((e.clientY - r.top) / r.height - 0.5) * 16);
  });
  wrap.addEventListener('pointerleave', () => {
    tiltX(0);
    tiltY(0);
  });

  download.addEventListener('click', () => downloadCard(render()));

  // Quien ya se hizo el carnet lo vuelve a ver al entrar
  const saved = store.get('vertigo-crew-member', null);
  if (saved) {
    form.elements.name.value = saved.name;
    form.elements.email.value = saved.email;
    form.elements.district.value = saved.district;
    form.querySelectorAll('[name="interests"]').forEach((i) => (i.checked = saved.interests?.includes(i.value)));
    form.querySelector(`[name="fav"][value="${saved.fav}"]`).checked = true;
    render();
    welcome(true);
  } else {
    render();
  }
}

// El carnet en PNG: se vuelve a dibujar en un canvas a doble resolución
function downloadCard(m) {
  const W = 1000;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const ink = m.flavor.ink;

  g.fillStyle = m.flavor.bg;
  g.beginPath();
  g.roundRect(0, 0, W, H, 48);
  g.fill();

  // Espiral grande de fondo
  g.save();
  g.globalAlpha = 0.12;
  g.strokeStyle = ink;
  g.lineWidth = 18;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i <= 300; i++) {
    const t = i / 300;
    const a = t * Math.PI * 2 * 4;
    g.lineTo(W * 0.78 + Math.cos(a) * t * 300, H * 0.5 + Math.sin(a) * t * 300);
  }
  g.stroke();
  g.restore();

  g.fillStyle = ink;
  g.font = '700 30px "Space Grotesk", sans-serif';
  g.fillText('VÉRTIGO CREW', 60, 88);
  g.textAlign = 'right';
  g.fillText('NIVEL GOTA', W - 60, 88);
  g.textAlign = 'left';

  g.font = '400 110px "Anton", Impact, sans-serif';
  g.fillText(m.name.toUpperCase().slice(0, 18), 60, 280);

  const rows = [
    ['Nº', m.number],
    ['BARRIO', m.district],
    ['SABOR', m.flavor.full],
  ];
  rows.forEach(([k, v], i) => {
    g.font = '600 22px "Space Grotesk", sans-serif';
    g.globalAlpha = 0.65;
    g.fillText(k, 60, 360 + i * 56);
    g.globalAlpha = 1;
    g.font = '700 30px "Space Grotesk", sans-serif';
    g.fillText(v, 200, 360 + i * 56);
  });
  g.font = '600 24px "Space Grotesk", sans-serif';
  g.fillText(m.interests.join(' · '), 60, 560);

  codeCells(hash(m.number)).forEach(([x, y]) => g.fillRect(W - 60 - 176 + x * 16, H - 60 - 176 + y * 16, 16, 16));

  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: 'carnet-vertigo-crew.png' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

// ---------- Animaciones ----------

function intro(stickers) {
  gsap
    .timeline()
    .from('.nav', { yPercent: -100, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.2)
    .from('.wall__heading span', { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.1 }, 0.1)
    .from('.wall .eyebrow, .wall__lead, .wall__hint', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 0.4)
    // Las pegatinas caen desde arriba, una detrás de otra
    .from(
      stickers,
      {
        y: () => -window.innerHeight * 1.1,
        rotation: () => gsap.utils.random(-90, 90),
        duration: 1.1,
        ease: 'back.out(1.2)',
        stagger: 0.06,
      },
      0.3,
    )
    // Unos cuantos golpes de pegatina (no uno por cada una, que sería ruido)
    .add(() => sound.clink(), 0.75)
    .add(() => sound.clink(), 1.05)
    .add(() => sound.clink(), 1.35)
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
  reveal('.crew-about > *', '.crew-about');
  reveal('.agenda__head > *', '.agenda');
  reveal('.event', '.agenda__list', { y: 40, stagger: 0.06 });
  reveal('.levels__head > *, .levels__box', '.levels');
  reveal('.people__head > *', '.people');
  reveal('.person', '.people__grid', { y: 90, stagger: 0.08 });
  reveal('.join__form-wrap > *', '.join', { stagger: 0.06 });
  reveal('.join__card-wrap', '.join', { y: 90, rotation: 6 });
  reveal('.footer__brand', '.footer', { yPercent: 30, y: 0, duration: 1.2 });
}
