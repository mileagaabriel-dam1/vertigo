// Carrito compartido por todas las páginas. Se guarda en el navegador para que no se pierda al cambiar de página
// (y se sincroniza si la web está abierta en varias pestañas).
// Cada artículo: { id, name, detail, price, qty, colors: ['#hex', ...] }

const KEY = 'vertigo-cart';
const listeners = new Set();

function load() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

let items = load();

function commit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Sin almacenamiento: el carrito funciona igual, pero solo en esta página
  }
  listeners.forEach((fn) => fn(items));
}

window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  items = load();
  listeners.forEach((fn) => fn(items));
});

export const cart = {
  get items() {
    return items;
  },
  get count() {
    return items.reduce((sum, item) => sum + item.qty, 0);
  },
  get subtotal() {
    return Math.round(items.reduce((sum, item) => sum + item.price * item.qty, 0) * 100) / 100;
  },
  add(item, qty = 1) {
    const existing = items.find((i) => i.id === item.id);
    if (existing) existing.qty += qty;
    else items = [...items, { ...item, qty }];
    commit();
  },
  setQty(id, qty) {
    items = qty > 0 ? items.map((i) => (i.id === id ? { ...i, qty } : i)) : items.filter((i) => i.id !== id);
    commit();
  },
  remove(id) {
    this.setQty(id, 0);
  },
  clear() {
    items = [];
    commit();
  },
  onChange(fn) {
    listeners.add(fn);
    fn(items);
  },
};
