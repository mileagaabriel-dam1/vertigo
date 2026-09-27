// Precios de la tienda (tienda de prueba: no se cobra nada ni se envía nada).
export const UNIT_PRICE = 1.95;
export const FREE_SHIPPING = 25;
export const SHIPPING = 3.9;
export const SUBSCRIPTION_OFF = 0.15;

// Tamaños de caja: cuantas más latas, más descuento. cols × rows es cómo se colocan en la caja 3D.
export const SIZES = [
  { cans: 6, off: 0, cols: 3, rows: 2 },
  { cans: 12, off: 0.1, cols: 4, rows: 3 },
  { cans: 24, off: 0.2, cols: 6, rows: 4 },
];

const round = (n) => Math.round(n * 100) / 100;

export const listPrice = (cans) => round(cans * UNIT_PRICE);
export const packPrice = (cans) => round(listPrice(cans) * (1 - (SIZES.find((s) => s.cans === cans)?.off || 0)));
export const subscriptionPrice = (cans) => round(packPrice(cans) * (1 - SUBSCRIPTION_OFF));

export const euro = (n) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

// Packs ya montados. mix: cuántas latas de cada sabor (en el orden de FLAVORS)
export const PACKS = [
  {
    id: 'degustacion',
    name: 'Pack Degustación',
    tagline: 'Los cuatro sabores, dos de cada. Para encontrar el tuyo.',
    mix: [2, 2, 2, 2],
    price: 14.9,
    featured: true,
  },
  { id: 'madrugador', name: 'Pack Madrugador', tagline: 'Para los exámenes a las 8:00.', mix: [12, 0, 0, 0] },
  { id: 'estudio', name: 'Pack Estudio', tagline: 'Tardes largas de biblioteca.', mix: [0, 12, 0, 0] },
  { id: 'post-entreno', name: 'Pack Post-entreno', tagline: 'Frescor después del último sprint.', mix: [0, 0, 12, 0] },
  { id: 'noches-largas', name: 'Pack Noches Largas', tagline: 'Para los que no frenan.', mix: [0, 0, 0, 12] },
];
