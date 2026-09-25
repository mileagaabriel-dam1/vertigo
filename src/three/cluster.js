import * as THREE from 'three';
import gsap from 'gsap';
import { applyPoke } from './poke.js';

// Posiciones alrededor de la lata (la lata mide unas 2,1 unidades de alto)
// type: 'slice' | 'whole' | 'mint'
const LAYOUT = [
  { type: 'whole', pos: [-0.95, -0.72, 0.35], size: 0.95, rot: [0.4, 0.3, 0.9] },
  { type: 'slice', pos: [0.95, 0.62, 0.45], size: 0.78, rot: [1.2, 0.2, -0.5] },
  { type: 'slice', pos: [-0.85, 0.85, -0.35], size: 0.6, rot: [0.9, -0.4, 0.7] },
  { type: 'slice', pos: [0.8, -0.85, 0.7], size: 0.5, rot: [1.9, 0.5, 0.3] },
  { type: 'mint', pos: [0.55, 1.05, 0.2], size: 0.8, rot: [-0.4, 0.3, -0.7], mintOnly: true },
  { type: 'mint', pos: [-0.5, -1.05, 0.55], size: 0.7, rot: [0.5, -0.6, 2.4], mintOnly: true },
  { type: 'mint', pos: [1.1, -0.1, -0.2], size: 0.6, rot: [0.2, 0.9, -1.6], mintOnly: true },
];

// Frutas que flotan alrededor de la lata, un conjunto por sabor
export class FruitCluster extends THREE.Group {
  constructor(flavors, kits) {
    super();
    this.sets = flavors.map((flavor) => {
      const set = new THREE.Group();
      set.userData.items = LAYOUT.filter((item) => !item.mintOnly || flavor.mint).map((item, i) => {
        let object;
        if (item.type === 'slice') object = kits.slices[flavor.fruit].create(item.size, item.size * 0.1);
        else if (item.type === 'whole') object = kits.whole[flavor.fruit].create(flavor.fruit === 'lime' ? item.size * 0.85 : item.size);
        else object = kits.mint.create(item.size);
        object.position.fromArray(item.pos);
        object.rotation.fromArray(item.rot);
        object.userData.base = { pos: new THREE.Vector3(...item.pos), rot: new THREE.Euler(...item.rot), phase: i * 1.7 };
        set.add(object);
        return object;
      });
      set.scale.setScalar(0.0001);
      set.visible = false;
      this.add(set);
      return set;
    });
    this.current = -1;
  }

  // Sale el conjunto anterior (hacia fuera) y entra el nuevo (desde el centro)
  setFlavor(index, animate = true) {
    if (index === this.current) return;
    const previous = this.sets[this.current];
    const next = this.sets[index];
    this.current = index;

    if (previous) {
      gsap.killTweensOf(previous.scale);
      if (animate) {
        gsap.to(previous.scale, {
          x: 1.8, y: 1.8, z: 1.8, duration: 0.5, ease: 'power2.in',
          onComplete: () => {
            previous.visible = false;
            previous.scale.setScalar(0.0001);
          },
        });
      } else {
        previous.visible = false;
        previous.scale.setScalar(0.0001);
      }
    }

    next.visible = true;
    gsap.killTweensOf(next.scale);
    if (animate) {
      next.scale.setScalar(0.0001);
      gsap.to(next.scale, { x: 1, y: 1, z: 1, duration: 1.1, delay: 0.25, ease: 'back.out(1.6)' });
    } else {
      next.scale.setScalar(1);
    }
  }

  // Flotan despacio, cada pieza con su propio ritmo
  update(time) {
    const set = this.sets[this.current];
    if (!set) return;
    for (const item of set.userData.items) {
      const { pos, rot, phase } = item.userData.base;
      item.position.set(
        pos.x + Math.sin(time * 0.6 + phase) * 0.05,
        pos.y + Math.sin(time * 0.8 + phase) * 0.08,
        pos.z,
      );
      item.rotation.set(rot.x + Math.sin(time * 0.5 + phase) * 0.15, rot.y + time * 0.2, rot.z + Math.cos(time * 0.4 + phase) * 0.1);
      applyPoke(item);
    }
  }
}
