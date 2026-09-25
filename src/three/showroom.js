import * as THREE from 'three';
import { Can } from './can.js';
import { Bubbles } from './bubbles.js';
import { FruitCluster } from './cluster.js';
import { createFruitKits } from './fruit.js';
import { loadAssets } from './assets.js';
import { Poke, applyPoke } from './poke.js';
import { createRenderer, applyEnvironment, studioLights, shadowWall, precompile } from './studio.js';
import { labelTexture, condensationTextures, brushedTexture } from './textures.js';

const { lerp, euclideanModulo } = THREE.MathUtils;
// El carrusel es una elipse: estrecha a lo ancho (para no invadir el texto) y profunda hacia el fondo
const RADIUS_X = 1.55;
const RADIUS_Z = 2.6;

// Diferencia entre dos ángulos, entre -π y π
const angleDelta = (a, b) => euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI;

// Showroom de la página de Sabores: las cuatro latas en un carrusel circular.
// La lata elegida pasa al frente, gira sola y se rodea de su fruta; el resto se queda atrás, más oscuro.
export class Showroom {
  static async create(canvas, flavors, onProgress) {
    const showroom = new Showroom(canvas, flavors);
    const assets = await loadAssets(onProgress);
    showroom.build(assets);
    return showroom;
  }

  constructor(canvas, flavors) {
    this.canvas = canvas;
    this.flavors = flavors;
    this.mobile = window.innerWidth < 760;
    this.step = 0; // posición del carrusel sin límite (para girar siempre por el camino corto)
    this.index = 0;
    this.angle = 0;
    this.target = 0;
    this.drag = 0;
    this.listeners = new Set();

    this.renderer = createRenderer(canvas);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 0, 7);

    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
  }

  get stepAngle() {
    return (Math.PI * 2) / this.flavors.length;
  }

  build(assets) {
    const { renderer, scene, flavors, mobile } = this;
    applyEnvironment(scene, renderer, assets.hdr);
    this.rim = studioLights(scene, flavors[0].color, mobile).rim;
    this.wall = shadowWall(scene, flavors[0].ink, -2.4);

    this.bubbles = new Bubbles(mobile ? 70 : 140);
    scene.add(this.bubbles);

    const condensation = condensationTextures(renderer);
    const brushed = brushedTexture(renderer);
    this.ring = new THREE.Group();
    scene.add(this.ring);

    this.cans = flavors.map((flavor, i) => {
      const can = new Can(labelTexture(flavor, renderer), { condensation, brushed });
      can.userData.yaw = -Math.PI / 2 + 0.25;
      const holder = new THREE.Group();
      holder.add(can);
      this.ring.add(holder);
      return can;
    });

    this.cluster = new FruitCluster(flavors, createFruitKits(assets, renderer));
    this.cluster.setFlavor(0, false);
    scene.add(this.cluster);

    // Lo que se toca con el ratón se mueve un poco
    this.poke = new Poke(this.camera, this.canvas);
    this.cans.forEach((can) => this.poke.add(can, 0.5));
    for (const set of this.cluster.sets) for (const item of set.userData.items) this.poke.add(item, 1);

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

  onChange(fn) {
    this.listeners.add(fn);
  }

  // ---------- Elegir sabor ----------

  goTo(step) {
    this.step = step;
    this.target = -step * this.stepAngle;
    const index = euclideanModulo(step, this.flavors.length);
    if (index === this.index) return;
    this.index = index;
    const flavor = this.flavors[index];
    this.rim.color.set(flavor.color);
    this.wall.material.color.set(flavor.ink);
    this.bubbles.material.uniforms.uColor.value.set(flavor.color);
    this.cluster.setFlavor(index);
    this.listeners.forEach((fn) => fn(index));
  }

  next() {
    this.goTo(this.step + 1);
  }

  prev() {
    this.goTo(this.step - 1);
  }

  // Va a un sabor concreto por el camino más corto
  select(index) {
    const n = this.flavors.length;
    let diff = euclideanModulo(index - this.index, n);
    if (diff > n / 2) diff -= n;
    this.goTo(this.step + diff);
  }

  // Arrastrar con el ratón o el dedo
  dragMove(dx) {
    this.drag = dx * 0.006;
  }

  dragEnd() {
    const raw = this.target + this.drag;
    this.drag = 0;
    this.target = raw;
    this.goTo(Math.round(-raw / this.stepAngle));
  }

  // ---------- Cada fotograma ----------

  update(time, dt) {
    this.poke.update(dt);
    const damp = 1 - Math.exp(-dt * 6);
    const mobile = this.mobile;

    this.angle = lerp(this.angle, this.target + this.drag, damp);
    const x = mobile ? 0 : this.halfWidth * 0.36;
    const y = mobile ? -0.95 : -0.05;
    const scale = mobile ? 0.62 : 1;
    this.ring.position.set(x, y, -RADIUS_Z * scale);
    this.ring.scale.setScalar(scale);

    this.cans.forEach((can, i) => {
      // Posición en la elipse: el ángulo 0 queda delante, en el centro
      const a = i * this.stepAngle + this.angle;
      can.parent.position.set(Math.sin(a) * RADIUS_X, 0, Math.cos(a) * RADIUS_Z);
      const facing = (Math.cos(a) + 1) / 2; // 1 = delante, 0 = detrás
      const active = i === this.index;
      // Giro propio: la elegida gira sin parar; el resto enseña el logotipo
      if (active) can.userData.yaw += dt * 0.6;
      else can.userData.yaw += angleDelta(can.userData.yaw, -Math.PI / 2 + 0.25) * damp;

      can.scale.setScalar(0.7 + facing * 0.3);
      can.position.set(0, Math.sin(time * 1.3 + i) * 0.05, 0);
      can.rotation.set(0.1, can.userData.yaw, active ? 0.08 : 0.16);
      can.labelMaterial.color.setScalar(0.35 + 0.65 * facing);
      applyPoke(can);
    });

    // La fruta rodea a la lata que está delante
    this.cluster.position.set(x, y, 0);
    this.cluster.scale.setScalar(scale);
    this.cluster.update(time);

    this.bubbles.update(time, time * 0.05);
    this.renderer.render(this.scene, this.camera);
  }
}
