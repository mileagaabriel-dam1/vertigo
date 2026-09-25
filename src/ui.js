import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Envuelve cada letra en dos spans para poder animarla desde abajo con una máscara
export function splitChars(el) {
  const text = el.textContent.trim();
  el.textContent = '';
  for (const ch of text) {
    const outer = document.createElement('span');
    outer.className = 'char';
    outer.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span');
    inner.textContent = ch;
    outer.append(inner);
    el.append(outer);
  }
}

// Envuelve cada palabra en un span, respetando etiquetas internas como <em>
export function splitWords(root) {
  const words = [];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            fragment.append(' ');
            return;
          }
          const span = document.createElement('span');
          span.className = 'w';
          span.textContent = part;
          fragment.append(span);
          words.push(span);
        });
        child.replaceWith(fragment);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(root);
  return words;
}

let toastTimer;
export function toast(message) {
  const el = document.querySelector('.toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

// Enlaces internos con scroll suave y aviso en las páginas que aún no existen
export function initLinks(lenis) {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    if (link.dataset.soon) {
      e.preventDefault();
      toast(`${link.dataset.soon}: página en construcción`);
      return;
    }
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      lenis.scrollTo(href === '#top' ? 0 : href, { duration: 2.4 });
    }
  });
}

export function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  document.documentElement.classList.add('has-cursor');

  const dot = document.querySelector('.cursor');
  const ring = document.querySelector('.cursor-ring');
  gsap.set([dot, ring], { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const dotX = gsap.quickTo(dot, 'x', { duration: 0.08 });
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.08 });
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });

  window.addEventListener('pointermove', (e) => {
    dotX(e.clientX);
    dotY(e.clientY);
    ringX(e.clientX);
    ringY(e.clientY);
  });
  document.addEventListener('pointerover', (e) => {
    ring.classList.toggle('is-hover', Boolean(e.target.closest('a, button')));
  });
}

// Cinta de texto infinita que acelera con la velocidad del scroll
export function initMarquee(lenis) {
  const track = document.querySelector('.marquee__track');
  track.innerHTML += track.innerHTML;
  const loop = gsap.to(track, { xPercent: -50, duration: 22, ease: 'none', repeat: -1 });
  let speed = 1;
  gsap.ticker.add(() => {
    const target = 1 + Math.min(Math.abs(lenis.velocity) * 0.25, 6);
    speed += (target - speed) * 0.1;
    loop.timeScale(speed);
  });
}

// Números que cuentan desde 0 al aparecer
export function initCounters() {
  document.querySelectorAll('[data-count]').forEach((el) => {
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
          onUpdate: () => {
            el.textContent = Math.round(counter.v);
          },
        }),
    });
  });
}
