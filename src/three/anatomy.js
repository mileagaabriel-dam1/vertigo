import * as THREE from 'three';
import { Can } from './can.js';
import { juiceMaterial } from './liquid.js';
import { GlassBubbles } from './glass.js';
import { loadEnvironment } from './assets.js';
import { createRenderer, adaptiveResolution, applyEnvironment, studioLights, precompile } from './studio.js';
import { labelTexture, condensationTextures, brushedTexture } from './textures.js';

const { smoothstep, lerp } = THREE.MathUtils;

// Anatomía de la lata (página de Producto). Con el scroll pasa por cuatro fases:
//   1 · la lata entera girando, 2 · se separa en piezas, 3 · rayos X: la etiqueta se vuelve transparente
//   y la lata se llena de bebida con burbujas, 4 · vuelve a estar cerrada.
// La página coloca las etiquetas HTML (callouts) en los puntos que devuelve anchors().

// Piezas de la lata (en el orden en que las crea Can) y cuánto suben o bajan al separarse
const BODY = 0;
const EXPLODE = [0, 0.5, -0.45, 0.7, 1.0, 0.85]; // cuerpo, hombro, base, ranura, anilla, remache

// Puntos de las etiquetas: pieza de la que cuelgan, posición (radio y altura) y fase en la que salen
export const CALLOUTS = [
  { id: 'anilla', part: 4, x: 0.08, y: 1.0, phase: 'explode', title: 'Anilla', text: 'Se queda pegada a la lata: ni una pieza al suelo.' },
  { id: 'tapa', part: 1, x: -0.36, y: 0.97, phase: 'explode', title: 'Tapa', text: 'Aluminio de 0,2 mm con cierre hermético. Nada entra, nada sale.' },
  { id: 'etiqueta', part: BODY, x: 0.42, y: 0.1, phase: 'explode', title: 'Etiqueta', text: 'Impresa sobre el metal y barnizada. Cero plástico.' },
  { id: 'base', part: 2, x: -0.38, y: -1.0, phase: 'explode', title: 'Base cóncava', text: 'Su forma de cúpula aguanta la presión del gas.' },
  { id: 'nivel', part: BODY, x: 0.4, y: 0.72, phase: 'xray', title: '250 ml', text: 'Llena hasta aquí. El hueco de arriba es para las burbujas.' },
  { id: 'gas', part: BODY, x: -0.3, y: 0.2, phase: 'xray', title: '3 vol de CO₂', text: 'Carbonatado lento y en frío: burbuja fina que dura.' },
  { id: 'zumo', part: BODY, x: 0.35, y: -0.55, phase: 'xray', title: '15 % zumo', text: 'Cítricos exprimidos en frío, a 4 °C.' },
];

const LIQUID_BOTTOM = -0.87;
const LIQUID_TOP = 0.72;

export class Anatomy {
  static async create(canvas, flavors, onProgress) {
    const anatomy = new Anatomy(canvas, flavors);
    const assets = await loadEnvironment(onProgress);
    anatomy.build(assets);
    return anatomy;
  }

  constructor(canvas, flavors) {
    this.canvas = canvas;
    this.flavors = flavors;
    this.mobile = window.innerWidth < 760;
    this.progress = 0; // scroll dentro de la sección (0 → 1)
    this.smooth = 0;
    this.pointer = new THREE.Vector2();

    this.renderer = createRenderer(canvas);
    this.adaptResolution = adaptiveResolution(this.renderer);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 0, 8);

    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    window.addEventListener('pointermove', (e) => {
      this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    });
  }

  build(assets) {
    const { renderer, scene, flavors } = this;
    applyEnvironment(scene, renderer, assets.hdr);
    this.rim = studioLights(scene, flavors[0].color, this.mobile).rim;

    // holder no gira: así las etiquetas quedan siempre en el borde de la silueta aunque la lata dé vueltas
    this.holder = new THREE.Group();
    scene.add(this.holder);

    this.labels = flavors.map((f) => labelTexture(f, renderer));
    this.can = new Can(this.labels[0], { condensation: condensationTextures(renderer), brushed: brushedTexture(renderer) });
    this.holder.add(this.can);
    this.parts = [...this.can.children];

    // Rayos X: la etiqueta se vuelve translúcida y se dibuja por encima del líquido
    const label = this.can.labelMaterial;
    label.transparent = true;
    this.parts[BODY].renderOrder = 3;

    // Bebida: un cilindro que crece desde el fondo (se "llena")
    const height = LIQUID_TOP - LIQUID_BOTTOM;
    const geometry = new THREE.CylinderGeometry(0.405, 0.405, height, 64);
    geometry.translate(0, height / 2, 0);
    this.liquid = new THREE.Mesh(geometry, juiceMaterial(flavors[0].liquid, { min: 0.55, max: 0.92, glow: 0.35 }));
    this.liquid.position.y = LIQUID_BOTTOM;
    this.liquid.renderOrder = 1;
    this.can.add(this.liquid);

    this.bubbles = new GlassBubbles(120, 0.36, LIQUID_BOTTOM + 0.02, LIQUID_TOP - 0.02);
    this.bubbles.renderOrder = 2;
    this.can.add(this.bubbles);

    precompile(renderer, scene, this.camera);
    this.setXray(0);
  }

  setFlavor(index) {
    const flavor = this.flavors[index];
    this.can.setLabel(this.labels[index]);
    this.rim.color.set(flavor.color);
    this.liquid.material.color.set(flavor.liquid);
    this.liquid.material.emissive.set(flavor.liquid);
  }

  // Fases a partir del progreso del scroll (las usa también la página para los textos)
  phases(p = this.smooth) {
    return {
      intro: 1 - smoothstep(p, 0.06, 0.18),
      explode: smoothstep(p, 0.16, 0.34) * (1 - smoothstep(p, 0.46, 0.56)),
      xray: smoothstep(p, 0.54, 0.72) * (1 - smoothstep(p, 0.88, 0.97)),
      outro: smoothstep(p, 0.9, 1),
    };
  }

  setXray(x) {
    const label = this.can.labelMaterial;
    label.opacity = lerp(1, 0.14, x);
    label.depthWrite = x < 0.02;
    this.liquid.visible = x > 0.01;
    this.bubbles.visible = x > 0.3;
    // La lata se llena de abajo arriba
    this.liquid.scale.y = Math.max(0.001, smoothstep(x, 0, 0.85));
  }

  // Posición en pantalla (px) de cada etiqueta y si se ve en la fase actual
  anchors() {
    const { width, height } = this.size;
    const phases = this.phases();
    const v = new THREE.Vector3();
    return CALLOUTS.map((c) => {
      const part = this.parts[c.part];
      // Solo cuenta lo que la pieza se ha movido al separarse (su altura propia ya va en c.y)
      const x = this.mobile ? Math.abs(c.x) : c.x;
      v.set(x, c.y + part.position.y - (part.userData.baseY ?? part.position.y), 0);
      this.holder.localToWorld(v);
      v.project(this.camera);
      return {
        id: c.id,
        x: (v.x * 0.5 + 0.5) * width,
        y: (-v.y * 0.5 + 0.5) * height,
        side: this.mobile || c.x >= 0 ? 1 : -1,
        visible: phases[c.phase],
      };
    });
  }

  get halfWidth() {
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.position.z;
    return halfHeight * this.camera.aspect;
  }

  resize() {
    const el = this.canvas.parentElement;
    const width = el.clientWidth;
    const height = el.clientHeight;
    this.size = { width, height };
    this.mobile = width < 760;
    this.camera.aspect = width / height;
    this.camera.position.z = this.mobile ? 10.5 : 8;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  update(time, dt) {
    this.smooth = lerp(this.smooth, this.progress, 1 - Math.exp(-dt * 6));
    const { intro, explode, xray } = this.phases();

    // En la intro la lata queda a la derecha del título; después, en el centro
    const holder = this.holder;
    // Móvil: la lata se aparta a la izquierda para dejar sitio a las etiquetas (salen todas por la derecha)
    const side = this.mobile ? -this.halfWidth * 0.35 * (1 - intro) : this.halfWidth * 0.3 * intro;
    holder.position.set(side, (this.mobile ? -0.5 : -0.25) + explode * 0.15, 0);
    holder.rotation.set(0.1 + this.pointer.y * 0.08, 0, (0.16 * intro) + this.pointer.x * 0.04);
    holder.scale.setScalar(1 + xray * 0.12);

    // Gira sola; más despacio mientras se leen las etiquetas
    const speed = 0.5 - 0.35 * Math.max(explode, xray);
    this.can.rotation.y += speed * dt;

    this.parts.forEach((part, i) => {
      part.userData.baseY ??= part.position.y;
      part.position.y = part.userData.baseY + EXPLODE[i] * explode;
    });
    // La anilla se levanta un poco al separarse, como al abrirla
    this.parts[4].rotation.x = -Math.PI / 2 + explode * 0.5;

    this.setXray(xray);
    this.bubbles.material.uniforms.uTime.value = time;
    this.liquid.material.userData.uniforms.uTime.value = time;

    this.adaptResolution();
    this.renderer.render(this.scene, this.camera);
  }
}
