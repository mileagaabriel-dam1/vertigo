import '../styles/main.css';
import gsap from 'gsap';

import { setupPage, resumeHint } from '../common.js';
import { FLAVORS } from '../data/flavors.js';
import { toast } from '../ui.js';

// Página 404: una lata cae por un túnel en espiral sin fondo. Con un clic (o Enter) se rescata;
// cada rescate hace que la siguiente caiga más deprisa. El récord se guarda en el navegador.
// No hay pantalla de carga: tiene que salir al momento.

const { lenis, sound } = setupPage();
const BEST = 'vertigo-404-best';

const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST)) || 0;
  } catch {
    return 0;
  }
};
const saveBest = (n) => {
  try {
    localStorage.setItem(BEST, String(n));
  } catch {
    // Sin almacenamiento: el récord dura lo que la visita
  }
};

initTunnel();
initGame();
intro();

// ---------- Túnel: espiral de la marca girando y anillos que vienen hacia ti ----------

function initTunnel() {
  const canvas = document.querySelector('.js-tunnel');
  const g = canvas.getContext('2d');
  let W = 0;
  let H = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  gsap.ticker.add((time) => {
    const cx = W / 2;
    const cy = H / 2;
    const max = Math.hypot(W, H) / 2;
    g.clearRect(0, 0, W, H);

    // Anillos: nacen en el centro y crecen hacia fuera (sensación de caer)
    for (let i = 0; i < 14; i++) {
      const k = ((i + time * 0.45) % 14) / 14;
      const r = Math.pow(k, 2.2) * max;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.strokeStyle = `rgba(255, 225, 77, ${0.05 + k * 0.18})`;
      g.lineWidth = 1 + k * 3;
      g.stroke();
    }

    // Tres brazos de espiral que giran
    for (let arm = 0; arm < 3; arm++) {
      g.beginPath();
      for (let i = 0; i <= 160; i++) {
        const t = i / 160;
        const a = t * Math.PI * 6 + arm * ((Math.PI * 2) / 3) - time * 0.8;
        const r = Math.pow(t, 1.6) * max;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.strokeStyle = 'rgba(255, 225, 77, 0.22)';
      g.lineWidth = 2;
      g.stroke();
    }

    // Centro oscuro: el vacío
    const hole = g.createRadialGradient(cx, cy, 0, cx, cy, max * 0.35);
    hole.addColorStop(0, 'rgba(11, 11, 13, 1)');
    hole.addColorStop(1, 'rgba(11, 11, 13, 0)');
    g.fillStyle = hole;
    g.fillRect(0, 0, W, H);
  });
}

// ---------- Minijuego: rescatar la lata antes de que llegue al fondo ----------

function initGame() {
  const can = document.querySelector('.js-can');
  const savedEl = document.querySelector('.js-saved');
  const bestEl = document.querySelector('.js-best');
  let saved = 0;
  let best = readBest();
  let duration = 3;
  let fall = null;
  bestEl.textContent = best;

  const paint = () => {
    const f = FLAVORS[Math.floor(Math.random() * FLAVORS.length)];
    can.style.setProperty('--c', f.color);
    can.style.setProperty('--d', f.deep);
  };

  // Cae desde arriba hasta el centro, girando y haciéndose pequeña
  const drop = () => {
    paint();
    can.disabled = false;
    fall = gsap.fromTo(
      can,
      { xPercent: -50, yPercent: -50, y: () => -window.innerHeight * 0.6, x: () => gsap.utils.random(-120, 120), scale: 1.3, rotation: gsap.utils.random(-60, 60), opacity: 1 },
      {
        y: 0,
        x: 0,
        scale: 0.02,
        rotation: `+=${gsap.utils.random(540, 900)}`,
        duration,
        ease: 'power2.in',
        onComplete: () => {
          // Se ha caído: vuelve a empezar al ritmo inicial
          if (saved > 0) toast('Esa se ha perdido en el vacío');
          duration = 3;
          gsap.delayedCall(0.4, drop);
        },
      },
    );
  };

  const rescue = () => {
    if (!fall || can.disabled) return;
    fall.kill();
    can.disabled = true;
    saved++;
    savedEl.textContent = saved;
    gsap.fromTo(savedEl, { scale: 1.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
    if (saved > best) {
      best = saved;
      saveBest(best);
      bestEl.textContent = best;
    }
    sound.clink();
    sound.pop();
    if (saved % 5 === 0) {
      sound.swell(1.6, 1);
      toast(`¡${saved} latas rescatadas!`);
    }
    // Sale disparada hacia arriba y la siguiente cae un poco más deprisa
    duration = Math.max(1.1, duration * 0.9);
    gsap.to(can, {
      y: () => -window.innerHeight,
      scale: 1.4,
      rotation: '+=360',
      duration: 0.6,
      ease: 'power3.out',
      onComplete: () => gsap.delayedCall(0.25, drop),
    });
  };

  // Zona de clic generosa: vale tocar cerca de la lata, aunque ya sea pequeñita
  document.querySelector('.void').addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button:not(.js-can)')) return;
    const r = can.getBoundingClientRect();
    const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    if (dist < Math.max(70, Math.max(r.width, r.height) * 0.75)) rescue();
  });
  can.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      rescue();
    }
  });
  drop();
}

function intro() {
  lenis.start();
  gsap
    .timeline({ delay: 0.1 })
    .from('.nav', { yPercent: -100, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0)
    .from('.void__code', { scale: 0.4, opacity: 0, duration: 1.4, ease: 'expo.out' }, 0)
    .from('.void__title, .void__text, .void__actions, .void__score', { y: 30, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08 }, 0.2);
  resumeHint(sound);
}
