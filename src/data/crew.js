// Datos de la página Crew. Todo es ficticio (marca de un proyecto académico): eventos, personas y lugares de encuentro.

// Eventos. weekday: 0 domingo … 6 sábado · week: en qué semana a partir de hoy · hour: hora de inicio
export const EVENT_TYPES = [
  { id: 'deporte', label: 'Deporte' },
  { id: 'musica', label: 'Música' },
  { id: 'estudio', label: 'Estudio' },
  { id: 'arte', label: 'Arte' },
];

const EVENTS = [
  {
    id: 'running',
    type: 'deporte',
    title: 'Running club',
    place: 'Carretera de les Aigües',
    text: '10 km llanos con vistas a toda Barcelona. Al llegar, latas a 4 °C.',
    weekday: 6,
    week: 0,
    hour: '09:00',
    duration: 2,
    capacity: 40,
    taken: 31,
  },
  {
    id: 'estudio',
    type: 'estudio',
    title: 'Noche de estudio',
    place: 'La Cocina, Gràcia',
    text: 'Wifi, enchufes, silencio y nevera llena hasta medianoche. Donde empezó todo.',
    weekday: 4,
    week: 0,
    hour: '19:00',
    duration: 5,
    capacity: 30,
    taken: 12,
  },
  {
    id: 'session',
    type: 'musica',
    title: 'Vértigo Session',
    place: 'Nave Vértigo, Poblenou',
    text: 'DJ set al atardecer en la azotea. Cuatro sabores, cuatro sesiones.',
    weekday: 5,
    week: 1,
    hour: '20:00',
    duration: 4,
    capacity: 200,
    taken: 184,
  },
  {
    id: 'bloque',
    type: 'deporte',
    title: 'Escalada en bloque',
    place: 'Sala de bloque, Sants',
    text: 'Para empezar o para mejorar. Pies de gato incluidos.',
    weekday: 2,
    week: 1,
    hour: '18:30',
    duration: 2,
    capacity: 24,
    taken: 24,
  },
  {
    id: 'ilustracion',
    type: 'arte',
    title: 'Diseña tu lata',
    place: 'La Cocina, Gràcia',
    text: 'Taller de ilustración con Aina Soler. La mejor etiqueta se imprime de verdad.',
    weekday: 0,
    week: 1,
    hour: '11:00',
    duration: 3,
    capacity: 20,
    taken: 9,
  },
  {
    id: 'voley',
    type: 'deporte',
    title: 'Vóley playa',
    place: 'Platja del Bogatell',
    text: 'Equipos mezclados cada partido. Nadie se queda en el banquillo.',
    weekday: 6,
    week: 2,
    hour: '18:00',
    duration: 2,
    capacity: 32,
    taken: 20,
  },
  {
    id: 'openmic',
    type: 'musica',
    title: 'Open mic',
    place: 'Nave Vértigo, Poblenou',
    text: 'Cinco minutos de escenario para quien quiera: música, poesía o monólogo.',
    weekday: 3,
    week: 2,
    hour: '20:30',
    duration: 3,
    capacity: 60,
    taken: 41,
  },
];

// Fecha real de cada evento: el próximo día de la semana que toca, a partir de mañana
export function upcomingEvents(today = new Date()) {
  return EVENTS.map((e) => {
    const date = new Date(today);
    date.setDate(date.getDate() + 1);
    while (date.getDay() !== e.weekday) date.setDate(date.getDate() + 1);
    date.setDate(date.getDate() + e.week * 7);
    const [h, m] = e.hour.split(':').map(Number);
    date.setHours(h, m, 0, 0);
    return { ...e, date };
  }).sort((a, b) => a.date - b.date);
}

// Embajadores: fav es el índice del sabor favorito en FLAVORS
export const MEMBERS = [
  { name: 'Lucía Ferrer', role: 'Noches de estudio', fav: 0, since: 2024, events: 61, quote: 'Hice el examen de Física de las 8:00. Aprobé. Lo demás es historia.' },
  { name: 'Marc Vidal', role: 'DJ residente', fav: 3, since: 2025, events: 38, quote: 'Cada Session empieza con la lata abriéndose en el micro.' },
  { name: 'Aina Soler', role: 'Ilustradora', fav: 1, since: 2024, events: 44, quote: 'Dibujé la espiral en una servilleta. Sigue en la nevera.' },
  { name: 'Nerea Pons', role: 'Running club', fav: 2, since: 2025, events: 52, quote: 'Diez kilómetros, cuesta arriba, y la lata más fría de mi vida.' },
  { name: 'Omar Haddad', role: 'Escalada en bloque', fav: 0, since: 2025, events: 29, quote: 'Si no te da vértigo, es que no estás lo bastante arriba.' },
  { name: 'Pau Martí', role: 'Vóley playa', fav: 2, since: 2026, events: 17, quote: 'Llegué por las latas. Me quedé por la gente.' },
];

// Niveles del crew según los eventos a los que se va
export const TIERS = [
  { name: 'Gota', from: 0, perks: ['Acceso a todos los eventos', 'Newsletter con los planes de la semana'] },
  { name: 'Burbuja', from: 3, perks: ['10 % de descuento en la tienda', 'Reserva antes que nadie'] },
  { name: 'Espiral', from: 10, perks: ['Pack degustación gratis cada trimestre', 'Pruebas los sabores antes de salir'] },
  { name: 'Vértigo', from: 25, perks: ['Votas el próximo sabor', 'Merch exclusiva del crew', 'Tu nombre en una edición limitada'] },
];

export const DISTRICTS = [
  'Ciutat Vella',
  'Eixample',
  'Sants-Montjuïc',
  'Les Corts',
  'Sarrià-Sant Gervasi',
  'Gràcia',
  'Horta-Guinardó',
  'Nou Barris',
  'Sant Andreu',
  'Sant Martí',
  'Fuera de Barcelona',
];
