import gsap from 'gsap';

// Pantalla de carga:
//  - una espiral (el símbolo de la marca) que se dibuja a medida que carga,
//  - la palabra VÉRTIGO llenándose de bebida con una ola,
//  - burbujas subiendo por el fondo y mensajes de lo que "está haciendo",
//  - un botón magnético para abrir la lata. Al entrar, la cámara se lanza dentro de la espiral
//    y una ola de bebida barre la pantalla.

const STATUS = [
  [0, 'Exprimiendo limones'],
  [0.18, 'Enfriando latas a 4 °C'],
  [0.4, 'Escaneando la fruta en 3D'],
  [0.62, 'Llenando de burbujas'],
  [0.82, 'Encendiendo las luces del estudio'],
];

// Espiral de Arquímedes centrada en (0, 0)
function spiralPath(turns = 9, radius = 98, steps = 1400) {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2;
    const x = Math.cos(angle) * t * radius;
    const y = Math.sin(angle) * t * radius;
    d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

export class Loader {
  constructor() {
    const el = document.querySelector('.loader');
    this.el = el;
    this.fill = el.querySelector('.loader__word-fill');
    this.count = el.querySelector('.js-loader-count');
    this.bar = el.querySelector('.js-loader-bar');
    this.status = el.querySelector('.js-loader-status');
    this.spiral = el.querySelector('.loader__spiral');
    this.enter = el.querySelector('.loader__enter');
    this.openButton = el.querySelector('.js-enter-sound');
    this.muteButton = el.querySelector('.js-enter-mute');

    const d = spiralPath();
    el.querySelector('.loader__spiral-track').setAttribute('d', d);
    this.line = el.querySelector('.loader__spiral-line');
    this.line.setAttribute('d', d);
    this.length = this.line.getTotalLength();
    this.line.style.strokeDasharray = `${this.length}`;

    gsap.set('.wipe', { yPercent: 110, visibility: 'visible' });

    this.value = 0; // progreso mostrado (0 → 1)
    this.speed = 1; // velocidad de las burbujas
    this.isReady = false;
    this.lastTime = performance.now();

    this.initBubbles();
    this.measure();
    window.addEventListener('resize', () => this.measure());
    // La altura de la palabra cambia cuando llega la fuente Anton
    document.fonts.ready.then(() => this.measure());

    this.running = true;
    const loop = (time) => {
      if (!this.running) return;
      this.paint(time);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // Entrada de los elementos
    gsap.from('.loader__word', { yPercent: 30, opacity: 0, duration: 1.4, ease: 'expo.out', delay: 0.1 });
    gsap.from('.loader__kicker, .loader__status', { y: 16, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.3 });
    gsap.from('.loader__top, .loader__bottom', { opacity: 0, duration: 1, delay: 0.4 });
    gsap.from(this.spiral, { scale: 0.6, opacity: 0, duration: 2, ease: 'expo.out' });
  }

  measure() {
    this.fillHeight = this.fill.offsetHeight;
    const canvas = this.canvas;
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    canvas.width = this.W * dpr;
    canvas.height = this.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------- Burbujas ----------

  initBubbles() {
    this.canvas = this.el.querySelector('.loader__bubbles');
    this.ctx = this.canvas.getContext('2d');
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.particles = Array.from({ length: window.innerWidth < 600 ? 50 : 100 }, () => this.spawn(true));
  }

  spawn(anywhere) {
    return {
      x: Math.random() * this.W,
      y: anywhere ? Math.random() * this.H : this.H + 20,
      r: 1 + Math.pow(Math.random(), 2.2) * 10,
      v: 25 + Math.random() * 70,
      phase: Math.random() * Math.PI * 2,
      sway: 6 + Math.random() * 22,
      a: 0.15 + Math.random() * 0.45,
    };
  }

  drawBubbles(dt, time) {
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    const boost = this.speed * (0.6 + this.value * 0.9);
    for (const p of this.particles) {
      p.y -= p.v * dt * boost;
      if (p.y < -30) Object.assign(p, this.spawn(false));
      const x = p.x + Math.sin(time * 0.0015 + p.phase) * p.sway;
      ctx.beginPath();
      ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 225, 77, ${p.a})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - p.r * 0.35, p.y - p.r * 0.35, Math.max(0.6, p.r * 0.22), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.a})`;
      ctx.fill();
    }
  }

  // ---------- Dibujo de cada fotograma ----------

  paint(time) {
    const dt = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    const p = this.value;

    this.count.textContent = String(Math.round(p * 100)).padStart(3, '0');
    this.bar.style.transform = `scaleX(${p})`;
    this.line.style.strokeDashoffset = `${this.length * (1 - p)}`;

    // Nivel del líquido dentro de la palabra (con una ola que se desplaza)
    const h = this.fillHeight;
    const top = 0;
    const bottom = h * 0.92;
    const level = top + (bottom - top) * (1 - p);
    const waveX = (time * 0.09) % 220;
    this.fill.style.backgroundPosition = `${waveX}px ${level - 26}px, 0 ${level}px`;
    this.fill.style.backgroundSize = `220px 28px, 100% ${Math.max(0, h - level)}px`;

    if (!this.isReady) {
      let message = STATUS[0][1];
      for (const [at, text] of STATUS) if (p >= at) message = text;
      const dots = '.'.repeat(Math.floor(time / 350) % 4);
      this.status.textContent = message + dots;
    }

    this.drawBubbles(dt, time);
  }

  setProgress(ratio) {
    gsap.to(this, { value: Math.max(this.value, ratio), duration: 0.6, ease: 'power2.out', overwrite: 'auto' });
  }

  // ---------- Carga terminada: aparece el botón ----------

  ready() {
    this.isReady = true;
    gsap.to(this, { value: 1, duration: 0.4, overwrite: 'auto' });
    this.el.classList.add('is-ready');
    this.status.textContent = 'Todo listo. Agárrate.';
    gsap.fromTo(this.status, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 });

    gsap.to('.loader__count', { opacity: 0, y: 10, duration: 0.5 });
    this.enter.classList.add('is-visible');
    gsap.fromTo(
      this.enter.children,
      { y: 30, opacity: 0, scale: 0.8 },
      { y: 0, opacity: 1, scale: 1, duration: 1, ease: 'back.out(1.8)', stagger: 0.12 },
    );
    this.openButton.focus({ preventScroll: true });

    // Botón magnético: se acerca al puntero cuando pasa cerca
    const open = this.openButton;
    const toX = gsap.quickTo(open, 'x', { duration: 0.5, ease: 'power3' });
    const toY = gsap.quickTo(open, 'y', { duration: 0.5, ease: 'power3' });
    this.onMove = (e) => {
      const r = open.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const near = Math.hypot(dx, dy) < 180;
      toX(near ? dx * 0.3 : 0);
      toY(near ? dy * 0.3 : 0);
    };
    window.addEventListener('pointermove', this.onMove);
  }

  // Devuelve true si se entra con sonido
  waitForChoice() {
    return new Promise((resolve) => {
      this.openButton.addEventListener('click', () => resolve(true), { once: true });
      this.muteButton.addEventListener('click', () => resolve(false), { once: true });
    });
  }

  // ---------- Salida: zambullida en la espiral y ola de bebida ----------

  exit() {
    window.removeEventListener('pointermove', this.onMove);
    return new Promise((resolve) => {
      gsap
        .timeline()
        .to(this.enter, { scale: 0.6, opacity: 0, duration: 0.45, ease: 'back.in(2)' }, 0)
        .to('.loader__top, .loader__bottom, .loader__bar', { opacity: 0, duration: 0.4 }, 0)
        .to(this, { speed: 9, duration: 1.1, ease: 'power2.in' }, 0)
        .to('.loader__center', { scale: 1.3, opacity: 0, filter: 'blur(14px)', duration: 0.9, ease: 'power3.in' }, 0.05)
        .to(this.spiral, { scale: 9, rotation: 540, duration: 1.5, ease: 'expo.in' }, 0)
        .to(this.spiral, { opacity: 0, duration: 0.35 }, 1.15)
        .to('.wipe', { yPercent: 0, duration: 0.7, ease: 'power3.in' }, 0.75)
        .add(() => {
          this.running = false;
          this.el.style.display = 'none';
          resolve();
        }, 1.45)
        .to('.wipe', { yPercent: -115, duration: 1.05, ease: 'power3.inOut' }, 1.5)
        .set('.wipe', { display: 'none' });
    });
  }
}
