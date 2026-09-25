import * as THREE from 'three';

// "Tocar" objetos 3D con el ratón: al pasar por encima reciben un empujón en la dirección del movimiento
// y vuelven a su sitio con un muelle amortiguado (rebotan un poco).
// Cada objeto registrado guarda su desplazamiento extra en object.userData.poke,
// y quien lo anima lo suma a su posición y rotación normales (ver applyPoke).

const STIFFNESS = 55;
const DAMPING = 7;

function visibleDeep(object) {
  for (let o = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

export function applyPoke(object) {
  const poke = object.userData.poke;
  if (!poke) return;
  object.position.add(poke.offset);
  object.rotation.x += poke.spin.x;
  object.rotation.y += poke.spin.y;
  object.rotation.z += poke.spin.z;
}

export class Poke {
  constructor(camera) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(10, 10);
    this.move = new THREE.Vector2();
    this.moved = false;
    this.targets = [];

    window.addEventListener('pointermove', (e) => {
      this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      this.move.set(e.movementX || 0, -(e.movementY || 0));
      this.moved = true;
    });
  }

  add(object, strength = 1) {
    object.userData.poke = {
      strength,
      offset: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      spinVelocity: new THREE.Vector3(),
      cooldown: 0,
    };
    this.targets.push(object);
  }

  hit() {
    const candidates = this.targets.filter(visibleDeep);
    if (!candidates.length) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const [first] = this.raycaster.intersectObjects(candidates, true);
    if (!first) return null;
    // Sube hasta el objeto registrado
    let o = first.object;
    while (o && !o.userData.poke) o = o.parent;
    return o;
  }

  update(dt) {
    if (this.moved) {
      this.moved = false;
      const target = this.hit();
      const speed = this.move.length();
      if (target && speed > 0.5 && target.userData.poke.cooldown <= 0) {
        const p = target.userData.poke;
        const force = Math.min(speed, 40) / 40;
        const dir = this.move.clone().normalize();
        p.velocity.x += dir.x * force * 1.3 * p.strength;
        p.velocity.y += dir.y * force * 1.3 * p.strength;
        p.velocity.z += force * 0.4 * p.strength;
        // Giro según hacia dónde se "rozó"
        p.spinVelocity.y += dir.x * force * 5 * p.strength;
        p.spinVelocity.x -= dir.y * force * 4 * p.strength;
        p.spinVelocity.z -= dir.x * force * 2 * p.strength;
        p.cooldown = 0.12;
      }
    }

    // Muelles: cada desplazamiento vuelve a cero rebotando un poco
    for (const target of this.targets) {
      const p = target.userData.poke;
      p.cooldown -= dt;
      p.velocity.addScaledVector(p.offset, -STIFFNESS * dt).multiplyScalar(Math.max(0, 1 - DAMPING * dt));
      p.offset.addScaledVector(p.velocity, dt);
      p.spinVelocity.addScaledVector(p.spin, -STIFFNESS * dt).multiplyScalar(Math.max(0, 1 - DAMPING * dt));
      p.spin.addScaledVector(p.spinVelocity, dt);
    }
  }
}
