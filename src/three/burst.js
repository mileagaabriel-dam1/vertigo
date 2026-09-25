import * as THREE from 'three';
import { juiceMaterial, dropGeometry, Splash } from './liquid.js';
import { iceMaterial, ICE_GEOMETRY } from './glass.js';

const { clamp, smoothstep } = THREE.MathUtils;
const rand = (min, max) => min + Math.random() * (max - min);
const UP = new THREE.Vector3(0, 1, 0);

// Explosión de la lata: rodajas y frutas reales, menta, hielo, gotas y salpicaduras de bebida
// que salen hacia la cámara. update(p) recibe el progreso (0 → 1) que marca el scroll.
export class Burst extends THREE.Group {
  constructor({ kits, juice, mobile = false }) {
    super();
    this.items = [];
    const amount = (n) => Math.max(1, Math.round(n * (mobile ? 0.6 : 1)));

    for (let i = 0; i < amount(9); i++) this.push(kits.slices.lemon.create(rand(0.55, 0.85), 0.07), { dist: rand(4, 10) });
    for (let i = 0; i < amount(4); i++) this.push(kits.slices.lime.create(rand(0.45, 0.65), 0.06), { dist: rand(4, 9) });
    for (let i = 0; i < amount(2); i++) this.push(kits.whole.lemon.create(rand(0.8, 1)), { dist: rand(3, 6), spin: 0.5 });
    for (let i = 0; i < amount(2); i++) this.push(kits.whole.lime.create(rand(0.6, 0.75)), { dist: rand(3, 6), spin: 0.5 });
    for (let i = 0; i < amount(7); i++) this.push(kits.mint.create(rand(0.5, 0.8)), { dist: rand(3, 8) });

    const ice = iceMaterial();
    for (let i = 0; i < amount(10); i++) {
      const cube = new THREE.Mesh(ICE_GEOMETRY, ice);
      cube.scale.setScalar(rand(0.6, 1.15));
      cube.renderOrder = 2;
      const holder = new THREE.Group();
      holder.add(cube);
      this.push(holder, { dist: rand(3.5, 10) });
    }

    this.dropMaterial = juiceMaterial(juice, { min: 0.6, max: 0.98 });
    const drop = dropGeometry();
    for (let i = 0; i < amount(40); i++) {
      const mesh = new THREE.Mesh(drop, this.dropMaterial);
      mesh.scale.setScalar(rand(0.5, 1.5));
      mesh.renderOrder = 2;
      mesh.castShadow = true;
      const holder = new THREE.Group();
      holder.add(mesh);
      this.push(holder, { dist: rand(3, 9), orient: true });
    }

    this.splash = new Splash(juice, mobile ? 5 : 8);
    this.add(this.splash);
    this.visible = false;
  }

  push(object, { dist, orient = false, spin = 1 }) {
    // Dirección hacia fuera y hacia la cámara, sin pasar justo por el centro de la pantalla
    const dir = new THREE.Vector3(rand(-1, 1), rand(-0.75, 0.9), rand(0.15, 1.3));
    if (Math.hypot(dir.x, dir.y) < 0.35) {
      const angle = Math.atan2(dir.y, dir.x);
      dir.x = Math.cos(angle) * 0.35;
      dir.y = Math.sin(angle) * 0.35;
    }
    dir.normalize();

    // La punta de la gota queda detrás, como una estela
    if (orient) object.quaternion.setFromUnitVectors(UP, dir.clone().negate());

    object.scale.setScalar(0.0001);
    this.add(object);
    this.items.push({
      object,
      dir,
      dist,
      orient,
      delay: rand(0, 0.12),
      fall: rand(0.5, 2),
      origin: new THREE.Vector3(rand(-0.25, 0.25), rand(-0.8, 0.8), rand(-0.2, 0.2)),
      rot0: new THREE.Vector3(rand(0, 6.3), rand(0, 6.3), rand(0, 6.3)),
      spin: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(rand(2, 7) * spin),
    });
  }

  setJuice(color) {
    this.dropMaterial.color.set(color);
    this.dropMaterial.emissive.set(color);
    this.splash.setColor(color);
  }

  update(p, time) {
    this.visible = p > 0.0001 && p < 0.999;
    if (!this.visible) return;
    this.splash.update(time, p);

    for (const it of this.items) {
      const lp = clamp((p - it.delay) / (1 - it.delay), 0, 1);
      const eased = 1 - Math.pow(1 - lp, 3);
      const o = it.object;

      o.position.copy(it.dir).multiplyScalar(eased * it.dist).add(it.origin);
      o.position.y -= lp * lp * it.fall;

      const grow = smoothstep(lp, 0, 0.1) * (1 - smoothstep(lp, 0.85, 1));
      o.scale.setScalar(Math.max(grow, 0.0001));

      if (!it.orient) {
        o.rotation.set(
          it.rot0.x + it.spin.x * lp + Math.sin(time + it.rot0.x) * 0.1,
          it.rot0.y + it.spin.y * lp,
          it.rot0.z + it.spin.z * lp,
        );
      }
    }
  }
}
