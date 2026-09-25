import gsap from 'gsap';
import { MathUtils } from 'three';

const { clamp, lerp, smoothstep } = MathUtils;

/*
  La página es una historia dividida en capítulos. "s" dice en qué punto estamos:
    0 hero · 1 manifiesto · 2 explosión · 3 sabores · 4 datos · 5 tienda · 6 pie de página
  Cada capítulo va de 0 a 1, así que s = 2.5 es la mitad de la explosión.
  La lata se coloca interpolando entre estos puntos clave.
  x se mide como fracción de la mitad del ancho visible (0 = centro, 0.5 = a tres cuartos de pantalla).
*/
const KEYS = [
  { s: 0, x: 0, y: -0.1, rz: 0.2, sc: 1 },
  { s: 0.9, x: 0.5, y: 0, rz: -0.28, sc: 0.92 },
  { s: 2.0, x: 0.52, y: 0.1, rz: -0.12, sc: 0.92 },
  { s: 2.33, x: 0, y: 0, rz: 0, sc: 1.05 },
  { s: 3.0, x: 0.3, y: 0, rz: 0.12, sc: 1 },
  { s: 4.0, x: 0.3, y: 0, rz: 0.12, sc: 1 },
  { s: 4.75, x: 0.52, y: -0.1, rz: -0.22, sc: 0.85 },
  { s: 5.1, x: 0.52, y: -0.1, rz: -0.22, sc: 0.85 },
  { s: 5.85, x: 0.45, y: 0.05, rz: 0.28, sc: 1 },
  { s: 6.0, x: 0.45, y: 0.05, rz: 0.28, sc: 1 },
  { s: 7.0, x: 0.45, y: 3.6, rz: 0.7, sc: 0.9 },
];

// Secciones cuyo final marca el final de cada capítulo
const CHAPTERS = ['#manifiesto', '#explosion', '#sabores', '#datos', '#cta', '.footer'];

// Momentos clave de la explosión
const SHAKE_START = 2.3;
const BURST = 2.5;
const REAPPEAR = 3.03;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);

function sample(s) {
  if (s <= KEYS[0].s) return KEYS[0];
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (s <= b.s) {
      const t = easeInOut((s - a.s) / (b.s - a.s));
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), rz: lerp(a.rz, b.rz, t), sc: lerp(a.sc, b.sc, t) };
    }
  }
  return KEYS[KEYS.length - 1];
}

// Escala de la lata: se hincha, revienta, desaparece y vuelve con un rebote en "Sabores"
function visibility(s) {
  if (s < 2.42) return 1;
  if (s < BURST) return 1 + 0.18 * smoothstep(s, 2.42, BURST);
  if (s < BURST + 0.02) return 1.18 * (1 - (s - BURST) / 0.02);
  if (s < REAPPEAR) return 0;
  return backOut(clamp((s - REAPPEAR) / 0.17, 0, 1));
}

// En móvil el texto ocupa todo el ancho: la lata baja a la parte libre de la pantalla,
// menos en el hero y en la explosión, donde es la protagonista
function mobileDrop(s) {
  const low = -1.25;
  if (s < 0.9) return low * smoothstep(s, 0.2, 0.9);
  if (s < 2.0) return low;
  if (s < 2.33) return low * (1 - smoothstep(s, 2.0, 2.33));
  if (s < 3.0) return 0;
  return low;
}

// Momentos de la cuenta atrás (coinciden con los números 3 · 2 · 1 de sections.js)
const TICKS = [2.34, 2.395, 2.45];

export function createDirector({ stage, flavors, onFlavor, flash, sound }) {
  let stops = [0, 1];
  let lastTime = 0;
  let lastS = 0;
  let flavorIndex = 0;

  const current = { x: 0, y: 0, rz: 0, mx: 0, my: 0 };
  const pointer = { x: 0, y: 0 };
  const spin = { v: 0 };
  // Valores de entrada: la lata cae desde arriba girando (los anima main.js)
  const intro = { y: 4, spin: -Math.PI * 3, sc: 0.5 };

  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function measure() {
    const vh = window.innerHeight;
    const y = window.scrollY;
    const rect = (sel) => document.querySelector(sel).getBoundingClientRect();
    stops = [0, rect('#manifiesto').top + y, ...CHAPTERS.map((sel) => rect(sel).bottom + y - vh)];
  }

  function storyAt(y) {
    for (let i = 0; i < stops.length - 1; i++) {
      if (y < stops[i + 1]) return i + Math.max(0, (y - stops[i]) / Math.max(1, stops[i + 1] - stops[i]));
    }
    return stops.length - 1;
  }

  function switchFlavor(index) {
    const direction = index > flavorIndex ? 1 : -1;
    flavorIndex = index;
    // Vuelta completa y, a mitad de giro, cambio de etiqueta
    gsap.to(spin, { v: `+=${Math.PI * 2 * direction}`, duration: 1.2, ease: 'power3.inOut', overwrite: 'auto' });
    gsap.delayedCall(0.45, () => stage.setFlavor(flavorIndex));
    onFlavor(index);
    sound.swap();
  }

  // Sonidos al cruzar momentos clave (solo bajando)
  function cues(s) {
    if (s <= lastS) return;
    TICKS.forEach((at, i) => {
      if (lastS < at && s >= at) sound.tick(i);
    });
    if (lastS < BURST && s >= BURST) sound.burst();
  }

  function update(time) {
    const dt = Math.min(0.05, time - lastTime);
    lastTime = time;

    const s = storyAt(window.scrollY);
    cues(s);
    lastS = s;
    const mobile = stage.camera.aspect < 0.85;
    const key = sample(s);
    const damp = 1 - Math.exp(-dt * 7);

    current.x = lerp(current.x, key.x * stage.halfWidth * (mobile ? 0.7 : 1), damp);
    current.y = lerp(current.y, key.y + (mobile ? mobileDrop(s) : 0), damp);
    current.rz = lerp(current.rz, key.rz, damp);
    current.mx = lerp(current.mx, pointer.x, damp * 0.5);
    current.my = lerp(current.my, pointer.y, damp * 0.5);

    const shake = s > SHAKE_START && s < BURST ? smoothstep(s, SHAKE_START, BURST) : 0;
    const rise = s > 3 && s < 3.2 ? 1 - smoothstep(s, REAPPEAR, 3.2) : 0;
    const scale = key.sc * visibility(s) * intro.sc * (mobile ? 0.58 : 1);

    const can = stage.can;
    can.visible = scale > 0.001;
    can.scale.setScalar(Math.max(scale, 0.0001));
    can.position.set(
      current.x + Math.sin(time * 71) * 0.035 * shake,
      current.y + intro.y - rise * 1.5 + Math.sin(time * 1.4) * 0.05,
      0,
    );
    // Gira sola, gira más al hacer scroll y se inclina un poco hacia el ratón
    can.rotation.set(
      0.12 + current.my * 0.18,
      time * 0.35 + s * Math.PI * 1.25 + spin.v + intro.spin + current.mx * 0.5,
      current.rz + Math.sin(time * 53) * 0.07 * shake,
    );

    const aura = stage.aura;
    aura.position.set(can.position.x, can.position.y, -1.2);
    aura.scale.setScalar(5.2 * scale);
    const inFlavors = s > 3.05 && s < 4.1;
    aura.material.opacity = lerp(aura.material.opacity, inFlavors ? 0.2 : 0.55, damp);

    stage.burst.update(clamp((s - BURST) / 0.5, 0, 1), time);
    stage.bubbles.update(time, s * 1.2);
    stage.bubbles.material.uniforms.uOpacity.value = lerp(stage.bubbles.material.uniforms.uOpacity.value, inFlavors ? 0.7 : 1, damp);
    flash.style.opacity = Math.max(0, 1 - Math.abs(s - BURST - 0.01) / 0.03).toFixed(3);

    // Sabores: tras la entrada (0.2 del capítulo), cada sabor ocupa otro 0.2
    const f = s - 3;
    const index = f < 0.2 ? 0 : Math.min(flavors.length - 1, Math.floor((f - 0.2) / 0.2));
    if (index !== flavorIndex) switchFlavor(index);
  }

  return { update, measure, intro };
}
