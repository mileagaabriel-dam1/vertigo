import gsap from 'gsap';
import { cart } from './cart.js';
import { FREE_SHIPPING, SHIPPING, euro } from './data/shop.js';

// Carrito lateral (en todas las páginas): botón con contador en la navegación, panel que entra por la derecha,
// barra de envío gratis que se llena de bebida y pedido de prueba con celebración.

const BAG = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 8h14l-1.2 12H6.2L5 8z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
  </svg>`;

const swatch = (colors) =>
  `<span class="cart-item__cans" aria-hidden="true">${colors
    .slice(0, 4)
    .map((c) => `<i style="--c:${c}"></i>`)
    .join('')}</span>`;

export function initCartDrawer({ lenis, sound }) {
  // Botón del carrito junto al de sonido
  const actions = document.querySelector('.nav__actions');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav__cart';
  button.setAttribute('aria-label', 'Abrir carrito');
  button.innerHTML = `${BAG}<span class="nav__cart-count js-cart-badge">0</span>`;
  actions?.prepend(button);

  const drawer = document.createElement('div');
  drawer.className = 'drawer';
  drawer.innerHTML = `
    <div class="drawer__shade js-cart-close"></div>
    <aside class="drawer__panel" role="dialog" aria-modal="true" aria-label="Carrito">
      <header class="drawer__head">
        <p class="drawer__title">Tu carrito <span class="js-cart-total-count">0</span></p>
        <button type="button" class="drawer__close js-cart-close" aria-label="Cerrar carrito">✕</button>
      </header>
      <div class="drawer__ship">
        <p class="js-ship-text"></p>
        <div class="drawer__ship-bar"><i class="js-ship-bar"></i></div>
      </div>
      <ul class="drawer__items js-cart-items" data-lenis-prevent></ul>
      <div class="drawer__empty">
        <p class="drawer__empty-title">Aquí no hay<br />ni una gota.</p>
        <a href="tienda.html" class="btn">Ir a la tienda <span class="btn__arrow">→</span></a>
      </div>
      <footer class="drawer__foot">
        <dl class="drawer__sums">
          <div><dt>Subtotal</dt><dd class="js-sum-sub"></dd></div>
          <div><dt>Envío</dt><dd class="js-sum-ship"></dd></div>
          <div class="drawer__total"><dt>Total</dt><dd class="js-sum-total"></dd></div>
        </dl>
        <button type="button" class="btn drawer__checkout js-checkout">Hacer el pedido <span class="btn__arrow">→</span></button>
        <p class="drawer__note">Tienda de prueba de un proyecto académico: no se cobra nada ni se envía nada.</p>
      </footer>
    </aside>`;
  document.body.append(drawer);

  const $ = (sel) => drawer.querySelector(sel);
  const list = $('.js-cart-items');
  let isOpen = false;

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    drawer.classList.add('is-open');
    lenis.stop();
    sound.muffle(true);
    gsap.fromTo('.drawer__panel', { xPercent: 100 }, { xPercent: 0, duration: 0.7, ease: 'expo.out' });
    gsap.fromTo('.drawer__shade', { opacity: 0 }, { opacity: 1, duration: 0.5 });
    gsap.from(list.children, { x: 40, opacity: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05, delay: 0.1 });
    $('.drawer__close').focus({ preventScroll: true });
  };
  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    lenis.start();
    sound.muffle(false);
    gsap.to('.drawer__panel', { xPercent: 100, duration: 0.5, ease: 'power3.in' });
    gsap.to('.drawer__shade', { opacity: 0, duration: 0.4, onComplete: () => drawer.classList.remove('is-open') });
  };

  button.addEventListener('click', open);
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('.js-cart-close')) close();
    const row = e.target.closest('[data-id]');
    if (!row) return;
    const item = cart.items.find((i) => i.id === row.dataset.id);
    if (!item) return;
    if (e.target.closest('.js-inc')) cart.setQty(item.id, item.qty + 1);
    if (e.target.closest('.js-dec')) cart.setQty(item.id, item.qty - 1);
    if (e.target.closest('.js-remove')) cart.remove(item.id);
  });
  window.addEventListener('keydown', (e) => e.key === 'Escape' && close());

  let lastCount = cart.count;
  cart.onChange((items) => {
    const count = cart.count;
    const sub = cart.subtotal;
    const free = sub >= FREE_SHIPPING;
    const ship = items.length && !free ? SHIPPING : 0;

    document.querySelectorAll('.js-cart-badge').forEach((badge) => {
      badge.textContent = count;
      badge.classList.toggle('is-empty', count === 0);
    });
    if (count > lastCount) gsap.fromTo('.nav__cart', { scale: 1.35 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.35)' });
    lastCount = count;

    drawer.classList.toggle('is-empty', items.length === 0);
    $('.js-cart-total-count').textContent = count;
    $('.js-ship-text').innerHTML = free
      ? '<b>Envío gratis</b> desbloqueado. Te lo llevamos en 24 h.'
      : `Te faltan <b>${euro(FREE_SHIPPING - sub)}</b> para el envío gratis.`;
    $('.js-ship-bar').style.transform = `scaleX(${Math.min(1, sub / FREE_SHIPPING)})`;
    $('.js-sum-sub').textContent = euro(sub);
    $('.js-sum-ship').textContent = items.length ? (ship ? euro(ship) : 'Gratis') : '—';
    $('.js-sum-total').textContent = euro(sub + ship);

    list.innerHTML = items
      .map(
        (item) => `
          <li class="cart-item" data-id="${item.id}">
            ${swatch(item.colors)}
            <div class="cart-item__info">
              <p class="cart-item__name">${item.name}</p>
              <p class="cart-item__detail">${item.detail}</p>
              <div class="cart-item__qty">
                <button type="button" class="js-dec" aria-label="Quitar uno">−</button>
                <span>${item.qty}</span>
                <button type="button" class="js-inc" aria-label="Añadir uno">+</button>
              </div>
            </div>
            <div class="cart-item__side">
              <p class="cart-item__price">${euro(item.price * item.qty)}</p>
              <button type="button" class="cart-item__remove js-remove">Quitar</button>
            </div>
          </li>`,
      )
      .join('');
  });

  $('.js-checkout').addEventListener('click', () => {
    if (!cart.items.length) return;
    const summary = { count: cart.count, total: cart.subtotal + (cart.subtotal >= FREE_SHIPPING ? 0 : SHIPPING) };
    close();
    celebrate(summary, { lenis, sound });
    cart.clear();
  });

  return { open, close };
}

// ---------- Pedido hecho: la pantalla se llena de bebida ----------

function celebrate({ count, total }, { lenis, sound }) {
  const number = `VTG-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const overlay = document.createElement('div');
  overlay.className = 'order';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Pedido hecho');
  overlay.innerHTML = `
    <div class="order__liquid">
      <svg class="order__wave" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 60 V30 Q 150 0 300 30 T 600 30 T 900 30 T 1200 30 V60 Z" />
      </svg>
    </div>
    <div class="order__bubbles" aria-hidden="true">${Array.from({ length: 36 }, () => '<i></i>').join('')}</div>
    <div class="order__content">
      <p class="order__kicker">Pedido ${number}</p>
      <h2 class="order__title"><span>¡Pedido</span><span>hecho!</span></h2>
      <p class="order__text">${count} ${count === 1 ? 'artículo' : 'artículos'} · ${euro(total)}. Si esto fuera de verdad, mañana llamaríamos a tu puerta con las latas a 4 °C.</p>
      <p class="order__note">Es una tienda de prueba de un proyecto académico: no se ha cobrado nada ni se enviará nada.</p>
      <button type="button" class="btn order__close">Seguir cayendo <span class="btn__arrow">→</span></button>
    </div>`;
  document.body.append(overlay);
  lenis.stop();
  sound.fanfare();

  // Cada burbuja sube a su ritmo
  overlay.querySelectorAll('.order__bubbles i').forEach((b) => {
    const size = gsap.utils.random(6, 26);
    gsap.set(b, { width: size, height: size, left: `${gsap.utils.random(0, 100)}%`, bottom: -40 });
    gsap.to(b, { y: -window.innerHeight - 80, x: gsap.utils.random(-40, 40), duration: gsap.utils.random(2.2, 4.5), delay: gsap.utils.random(0.3, 2), ease: 'power1.in', repeat: -1 });
  });

  const tl = gsap
    .timeline()
    .fromTo('.order__liquid', { yPercent: 100 }, { yPercent: 0, duration: 1.1, ease: 'power3.inOut' })
    .from('.order__title span', { yPercent: 120, rotate: 6, duration: 1, ease: 'expo.out', stagger: 0.1 }, 0.75)
    .from('.order__kicker, .order__text, .order__note, .order__close', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08 }, 1);

  overlay.querySelector('.order__close').addEventListener('click', () => {
    tl.kill();
    gsap
      .timeline({
        onComplete: () => {
          overlay.remove();
          lenis.start();
        },
      })
      .to('.order__content', { opacity: 0, y: -30, duration: 0.4 })
      .to('.order__liquid', { yPercent: -110, duration: 0.9, ease: 'power3.inOut' }, 0.15)
      .to('.order__bubbles', { opacity: 0, duration: 0.4 }, 0.3);
  });
  overlay.querySelector('.order__close').focus({ preventScroll: true });
}
