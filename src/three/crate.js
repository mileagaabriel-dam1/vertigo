import * as THREE from 'three';
import gsap from 'gsap';
import { Can } from './can.js';
import { loadEnvironment } from './assets.js';
import { createRenderer, adaptiveResolution, applyEnvironment, studioLights, precompile } from './studio.js';
import { labelTexture, condensationTextures, brushedTexture } from './textures.js';

// Caja de cartón de la tienda: se elige el tamaño (6, 12 o 24) y cada lata que se añade cae dentro con un rebote.
// Haciendo clic en una lata de la caja se saca. La composición vive aquí; la página escucha los cambios con onChange().

const SPACING = 0.98;
const WALL = 0.06;
const FLOOR = 0.04;
const BOX_HEIGHT = 1.05;
const CAN_Y = FLOOR + 1.05; // la lata mide unas 2,1 unidades y está centrada en su origen
const DROP_Y = 5;
const MAX_CANS = 24;
const INK = '#4a2c12';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')];
}

// Cartón kraft: color base, motas y fibras
function kraft(g, w, h) {
  g.fillStyle = '#c69c66';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h * 0.004; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(90, 55, 20, 0.12)' : 'rgba(255, 235, 200, 0.12)';
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  g.strokeStyle = 'rgba(110, 70, 30, 0.08)';
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * h;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y + (Math.random() - 0.5) * 12);
    g.stroke();
  }
}

function kraftTexture(renderer) {
  const [canvas, g] = makeCanvas(512, 512);
  kraft(g, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

// Cara delantera impresa: logo con la espiral, lema y los símbolos de "frágil" y "este lado arriba"
function printTexture(renderer, width, height, cans) {
  const S = 256;
  const W = Math.round(width * S);
  const H = Math.round(height * S);
  const [canvas, g] = makeCanvas(W, H);
  kraft(g, W, H);
  g.fillStyle = INK;
  g.strokeStyle = INK;
  g.globalAlpha = 0.85;

  // Espiral de la marca
  const cx = H * 0.5;
  const cy = H * 0.5;
  g.lineWidth = H * 0.035;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const a = t * Math.PI * 2 * 3;
    const r = t * H * 0.3;
    g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.stroke();

  g.textBaseline = 'middle';
  g.font = `400 ${Math.round(H * 0.36)}px "Anton", Impact, sans-serif`;
  g.fillText('VÉRTIGO', H * 0.92, H * 0.44);
  g.font = `700 ${Math.round(H * 0.1)}px "Space Grotesk", Arial, sans-serif`;
  g.fillText(`ENERGÍA CÍTRICA · ${cans} × 250 ML`, H * 0.95, H * 0.76);

  // Flechas "este lado arriba" en la esquina derecha
  const ax = W - H * 0.55;
  g.lineWidth = H * 0.03;
  for (const dx of [0, H * 0.2]) {
    g.beginPath();
    g.moveTo(ax + dx, H * 0.78);
    g.lineTo(ax + dx, H * 0.26);
    g.moveTo(ax + dx - H * 0.07, H * 0.36);
    g.lineTo(ax + dx, H * 0.24);
    g.lineTo(ax + dx + H * 0.07, H * 0.36);
    g.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

export class Crate {
  static async create(canvas, flavors, onProgress) {
    const crate = new Crate(canvas, flavors);
    const assets = await loadEnvironment(onProgress);
    crate.build(assets);
    return crate;
  }

  constructor(canvas, flavors) {
    this.canvas = canvas;
    this.flavors = flavors;
    this.mobile = window.innerWidth < 760;
    this.size = null;
    this.slots = [];
    this.listeners = new Set();
    this.pointer = new THREE.Vector2();
    this.distance = 8;

    this.renderer = createRenderer(canvas);
    this.adaptResolution = adaptiveResolution(this.renderer);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    window.addEventListener('pointermove', (e) => {
      this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    });
  }

  build(assets) {
    const { renderer, scene, flavors } = this;
    applyEnvironment(scene, renderer, assets.hdr);
    studioLights(scene, flavors[0].color, this.mobile);

    // Suelo invisible que solo muestra la sombra de la caja
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ color: INK, opacity: 0.28 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    this.group = new THREE.Group();
    scene.add(this.group);
    this.box = new THREE.Group();
    this.group.add(this.box);
    this.kraft = new THREE.MeshStandardMaterial({ map: kraftTexture(renderer), roughness: 0.92 });

    // Todas las latas se crean al principio (así no hay tirones al añadir) y se enseñan cuando hacen falta
    const condensation = condensationTextures(renderer);
    const brushed = brushedTexture(renderer);
    this.labels = flavors.map((f) => labelTexture(f, renderer));
    this.pool = Array.from({ length: MAX_CANS }, () => {
      const can = new Can(this.labels[0], { condensation, brushed });
      can.visible = false;
      can.traverse((o) => o.isMesh && (o.receiveShadow = true));
      this.group.add(can);
      return can;
    });

    this.raycaster = new THREE.Raycaster();
    this.canvas.addEventListener('click', (e) => this.pick(e));

    precompile(renderer, scene, this.camera);
  }

  onChange(fn) {
    this.listeners.add(fn);
  }

  emit() {
    const counts = this.counts();
    this.listeners.forEach((fn) => fn(counts));
  }

  counts() {
    const counts = this.flavors.map(() => 0);
    for (const slot of this.slots) if (slot) counts[slot.flavor]++;
    return counts;
  }

  get filled() {
    return this.slots.filter(Boolean).length;
  }

  // Posición de cada hueco: se llena de atrás hacia delante
  slotPosition(i) {
    const { cols, rows } = this.size;
    const c = i % cols;
    const r = Math.floor(i / cols);
    return new THREE.Vector3((c - (cols - 1) / 2) * SPACING, CAN_Y, (r - (rows - 1) / 2) * SPACING);
  }

  // ---------- Caja ----------

  buildBox() {
    const { cols, rows, cans } = this.size;
    const w = cols * SPACING;
    const d = rows * SPACING;
    // Se tira la caja anterior (geometrías y la cara impresa, que depende del tamaño)
    this.box.traverse((o) => o.isMesh && o.geometry.dispose());
    this.print?.map.dispose();
    this.print?.dispose();
    this.box.clear();

    const part = (geometry, x, y, z, material = this.kraft) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.box.add(mesh);
      return mesh;
    };

    this.print = new THREE.MeshStandardMaterial({ map: printTexture(this.renderer, w + WALL * 2, BOX_HEIGHT, cans), roughness: 0.9 });
    const frontMaterials = [this.kraft, this.kraft, this.kraft, this.kraft, this.print, this.kraft];

    part(new THREE.BoxGeometry(w + WALL * 2, FLOOR, d + WALL * 2), 0, FLOOR / 2, 0);
    part(new THREE.BoxGeometry(w + WALL * 2, BOX_HEIGHT, WALL), 0, BOX_HEIGHT / 2, d / 2 + WALL / 2, frontMaterials);
    part(new THREE.BoxGeometry(w + WALL * 2, BOX_HEIGHT, WALL), 0, BOX_HEIGHT / 2, -d / 2 - WALL / 2);
    part(new THREE.BoxGeometry(WALL, BOX_HEIGHT, d), w / 2 + WALL / 2, BOX_HEIGHT / 2, 0);
    part(new THREE.BoxGeometry(WALL, BOX_HEIGHT, d), -w / 2 - WALL / 2, BOX_HEIGHT / 2, 0);

    // Separadores de cartón entre las latas
    const h = BOX_HEIGHT * 0.78;
    for (let c = 1; c < cols; c++) part(new THREE.BoxGeometry(0.016, h, d), (c - cols / 2) * SPACING, h / 2, 0);
    for (let r = 1; r < rows; r++) part(new THREE.BoxGeometry(w, h, 0.016), 0, h / 2, (r - rows / 2) * SPACING);

    // La cámara se aleja o se acerca para que la caja entre siempre
    const distance = 3.4 + Math.max(w, d * 1.5) * 1.3 * (this.mobile ? 1.6 : 1);
    gsap.to(this, { distance, duration: 1.1, ease: 'expo.inOut' });
  }

  setSize(size, animate = true) {
    if (this.size?.cans === size.cans) return;
    const kept = this.slots.filter(Boolean);
    this.size = size;
    this.buildBox();
    if (animate) gsap.fromTo(this.box.scale, { x: 0.92, y: 0.5, z: 0.92 }, { x: 1, y: 1, z: 1, duration: 1.1, ease: 'elastic.out(1, 0.45)' });

    // Las latas que caben se recolocan en los huecos nuevos; las que sobran salen volando
    this.slots = Array.from({ length: size.cans }, () => null);
    kept.forEach((slot, i) => {
      if (i < size.cans) {
        this.slots[i] = slot;
        const p = this.slotPosition(i);
        gsap.to(slot.can.position, { x: p.x, y: p.y, z: p.z, duration: animate ? 0.9 : 0, ease: 'expo.inOut', delay: i * 0.015 });
      } else {
        this.lift(slot.can);
      }
    });
    this.emit();
  }

  // ---------- Latas ----------

  add(flavor) {
    const index = this.slots.indexOf(null);
    if (index === -1) return false;
    const can = this.pool.find((c) => !c.visible && !c.userData.busy);
    if (!can) return false;
    const p = this.slotPosition(index);
    can.setLabel(this.labels[flavor]);
    can.visible = true;
    can.scale.setScalar(1);
    can.position.set(p.x, DROP_Y, p.z);
    can.rotation.set(0, Math.random() * Math.PI * 2, 0);
    gsap.killTweensOf(can.position);
    gsap.to(can.position, { y: p.y, duration: 0.8, ease: 'bounce.out' });
    gsap.from(can.rotation, { x: gsap.utils.random(-0.5, 0.5), z: gsap.utils.random(-0.5, 0.5), duration: 0.8, ease: 'power2.out' });
    // Primer golpe contra el fondo de la caja
    gsap.delayedCall(0.29, () => this.onLand?.());
    this.slots[index] = { flavor, can };
    this.emit();
    return true;
  }

  lift(can) {
    can.userData.busy = true;
    gsap.killTweensOf(can.position);
    gsap.to(can.position, { y: DROP_Y, duration: 0.5, ease: 'power2.in' });
    gsap.to(can.scale, {
      x: 0.2,
      y: 0.2,
      z: 0.2,
      duration: 0.5,
      ease: 'power2.in',
      onComplete: () => {
        can.visible = false;
        can.userData.busy = false;
      },
    });
  }

  removeSlot(index) {
    const slot = this.slots[index];
    if (!slot) return;
    this.slots[index] = null;
    this.lift(slot.can);
    this.emit();
  }

  // Quita la última lata que se puso de ese sabor
  removeFlavor(flavor) {
    for (let i = this.slots.length - 1; i >= 0; i--) {
      if (this.slots[i]?.flavor === flavor) return this.removeSlot(i);
    }
  }

  clear() {
    this.slots.forEach((slot, i) => slot && gsap.delayedCall(i * 0.02, () => this.removeSlot(i)));
  }

  // Llena los huecos libres con sabores al azar, una lata detrás de otra
  shuffle() {
    const free = this.slots.filter((s) => !s).length;
    for (let i = 0; i < free; i++) gsap.delayedCall(i * 0.09, () => this.add(Math.floor(Math.random() * this.flavors.length)));
  }

  pick(e) {
    const r = this.canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(pointer, this.camera);
    const cans = this.slots.filter(Boolean).map((s) => s.can);
    const [hit] = this.raycaster.intersectObjects(cans, true);
    if (!hit) return;
    let o = hit.object;
    while (o && !cans.includes(o)) o = o.parent;
    const index = this.slots.findIndex((s) => s?.can === o);
    if (index !== -1) {
      this.removeSlot(index);
      this.onPick?.();
    }
  }

  // ---------- Dibujo ----------

  resize() {
    const el = this.canvas.parentElement;
    const width = el.clientWidth;
    const height = el.clientHeight;
    this.mobile = width < 760;
    this.camera.aspect = width / height;
    // En escritorio el panel ocupa la derecha: la imagen se desplaza para centrar la caja en el hueco libre
    if (this.mobile) this.camera.clearViewOffset();
    else this.camera.setViewOffset(width, height, width * 0.2, 0, width, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  update(time) {
    const { camera, group } = this;
    const elevation = 0.62;
    camera.position.set(0, 0.9 + Math.sin(elevation) * this.distance, Math.cos(elevation) * this.distance);
    camera.lookAt(0, 0.7, 0);

    const target = this.pointer.x * 0.35 + Math.sin(time * 0.3) * 0.12;
    group.rotation.y += (target - group.rotation.y) * 0.05;
    group.rotation.x += (this.pointer.y * 0.06 - group.rotation.x) * 0.05;

    this.adaptResolution();
    this.renderer.render(this.scene, camera);
  }
}
