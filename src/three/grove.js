import * as THREE from 'three';
import { Bubbles } from './bubbles.js';
import { createFruitKits } from './fruit.js';
import { loadAssets } from './assets.js';
import { Poke, applyPoke } from './poke.js';
import { createRenderer, adaptiveResolution, applyEnvironment, studioLights, precompile } from './studio.js';

const { lerp, smoothstep } = THREE.MathUtils;

// Composición de la portada de Historia: el limón con el que empezó todo, en el centro,
// rodeado de rodajas, limas y hojas de menta que flotan. Al hacer scroll se separan y se alejan.
// kind: 'whole' | 'slice' | 'mint' · fruit: clave de los kits · pos en unidades 3D alrededor del centro
const LAYOUT = [
  { kind: 'whole', fruit: 'lemon', size: 1.5, pos: [0, 0, 0], rot: [0.3, 0.4, 0.5], hero: true },
  { kind: 'slice', fruit: 'lemon', size: 0.9, pos: [1.25, 0.85, 0.4], rot: [1.1, 0.2, -0.4] },
  { kind: 'slice', fruit: 'lemon', size: 0.62, pos: [-1.2, -0.95, 0.6], rot: [1.7, 0.6, 0.3] },
  { kind: 'slice', fruit: 'lime', size: 0.6, pos: [-1.3, 0.9, -0.3], rot: [0.9, -0.4, 0.7] },
  { kind: 'whole', fruit: 'lime', size: 0.75, pos: [1.35, -0.8, -0.2], rot: [0.2, 1.1, -0.6] },
  { kind: 'slice', fruit: 'grapefruit', size: 0.55, pos: [0.3, 1.5, -0.7], rot: [1.3, 0.8, 0.2] },
  { kind: 'slice', fruit: 'bloodOrange', size: 0.5, pos: [0.25, -1.45, 0.3], rot: [2.1, -0.3, 0.5] },
  { kind: 'mint', size: 0.75, pos: [-0.75, 0.4, 0.9], rot: [-0.3, 0.4, 0.9] },
  { kind: 'mint', size: 0.6, pos: [0.95, 0.1, 0.95], rot: [0.4, -0.7, -1.4] },
  { kind: 'mint', size: 0.55, pos: [-0.2, -0.75, -0.9], rot: [0.2, 0.5, 2.3] },
];

export class Grove {
  static async create(canvas, onProgress) {
    const grove = new Grove(canvas);
    const assets = await loadAssets(onProgress);
    grove.build(assets);
    return grove;
  }

  constructor(canvas) {
    this.canvas = canvas;
    this.mobile = window.innerWidth < 760;
    this.progress = 0; // scroll dentro de la portada (0 → 1)
    this.spread = 0; // versión suavizada del progreso
    this.intro = { k: 0 }; // entrada inicial (la anima la página)
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
    const { renderer, scene, mobile } = this;
    applyEnvironment(scene, renderer, assets.hdr);
    studioLights(scene, '#ffe14d', mobile);

    this.bubbles = new Bubbles(mobile ? 70 : 140);
    scene.add(this.bubbles);

    const kits = createFruitKits(assets, renderer);
    this.group = new THREE.Group();
    scene.add(this.group);

    this.items = LAYOUT.map((item, i) => {
      let object;
      if (item.kind === 'whole') object = kits.whole[item.fruit].create(item.size);
      else if (item.kind === 'slice') object = kits.slices[item.fruit].create(item.size, item.size * 0.1);
      else object = kits.mint.create(item.size);
      object.userData.base = {
        pos: new THREE.Vector3(...item.pos),
        rot: new THREE.Euler(...item.rot),
        phase: i * 1.37,
        // Cada pieza sale en su dirección, un poco hacia la cámara
        out: new THREE.Vector3(...item.pos).add(new THREE.Vector3(0, 0, 1.2)).normalize(),
        hero: Boolean(item.hero),
      };
      this.group.add(object);
      return object;
    });

    this.poke = new Poke(this.camera, this.canvas);
    this.items.forEach((item) => this.poke.add(item, item.userData.base.hero ? 0.5 : 1));

    precompile(renderer, scene, this.camera);
  }

  get halfWidth() {
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.position.z;
    return halfHeight * this.camera.aspect;
  }

  resize() {
    const el = this.canvas.parentElement;
    const width = el.clientWidth;
    const height = el.clientHeight;
    this.mobile = width < 760;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  update(time, dt) {
    this.poke.update(dt);
    const damp = 1 - Math.exp(-dt * 5);
    this.spread = lerp(this.spread, this.progress, damp);
    const s = this.spread;
    const k = this.intro.k;

    // Escritorio: a la derecha del título · móvil: en la mitad de abajo
    const group = this.group;
    const baseX = this.mobile ? 0 : this.halfWidth * 0.42;
    const baseY = this.mobile ? -0.55 : 0;
    group.position.set(baseX, baseY + s * 1.2 + (1 - k) * -3, 0);
    group.scale.setScalar((this.mobile ? 0.55 : 1) * (0.6 + 0.4 * k));
    group.rotation.set(this.pointer.y * 0.12, this.pointer.x * 0.25 + (1 - k) * -1.5, 0);

    for (const item of this.items) {
      const { pos, rot, phase, out, hero } = item.userData.base;
      // Se separan con el scroll (el limón central apenas se mueve)
      const push = hero ? s * 0.6 : smoothstep(s, 0, 1) * 4.5;
      item.position.set(
        pos.x + out.x * push + Math.sin(time * 0.6 + phase) * 0.06,
        pos.y + out.y * push + Math.sin(time * 0.8 + phase) * 0.1,
        pos.z + out.z * push,
      );
      item.rotation.set(
        rot.x + Math.sin(time * 0.5 + phase) * 0.2 + s * 2,
        rot.y + time * (hero ? 0.25 : 0.35) + s * 3,
        rot.z + Math.cos(time * 0.4 + phase) * 0.12,
      );
      applyPoke(item);
    }

    this.bubbles.update(time, time * 0.05 + s * 3);
    this.adaptResolution();
    this.renderer.render(this.scene, this.camera);
  }
}
