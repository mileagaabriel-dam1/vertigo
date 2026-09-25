import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const { clamp, smoothstep } = THREE.MathUtils;
const rand = (min, max) => min + Math.random() * (max - min);
const UP = new THREE.Vector3(0, 1, 0);

// Gota con forma de lágrima: una esfera estirada y afilada por arriba
function dropGeometry() {
  const radius = 0.08;
  const geometry = new THREE.SphereGeometry(radius, 24, 16);
  const pos = geometry.attributes.position;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    if (p.y > 0) {
      const k = p.y / radius;
      p.x *= 1 - k * 0.8;
      p.z *= 1 - k * 0.8;
      p.y *= 1.9;
    }
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function sliceMaterials({ map, peel }) {
  // La propia textura sirve de relieve: los gajos sobresalen y las membranas quedan hundidas
  const face = new THREE.MeshPhysicalMaterial({
    map,
    bumpMap: map,
    bumpScale: 1.5,
    roughness: 0.45,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
  });
  // [lateral, tapa superior, tapa inferior]
  return [new THREE.MeshStandardMaterial({ color: peel, roughness: 0.55 }), face, face];
}

// Explosión de la lata: rodajas de limón y lima, cubitos de hielo y gotas que salen hacia la cámara.
// update(p) recibe el progreso (0 → 1) que marca el scroll.
export class Burst extends THREE.Group {
  constructor({ lemon, lime, mobile = false }) {
    super();
    this.items = [];
    const amount = (n) => Math.round(n * (mobile ? 0.6 : 1));

    const sliceGeometry = new THREE.CylinderGeometry(0.36, 0.36, 0.08, 48);
    const lemonMaterials = sliceMaterials(lemon);
    const limeMaterials = sliceMaterials(lime);
    for (let i = 0; i < amount(12); i++) {
      this.push(new THREE.Mesh(sliceGeometry, lemonMaterials), { size: rand(0.8, 1.25), dist: rand(4, 11) });
    }
    for (let i = 0; i < amount(5); i++) {
      this.push(new THREE.Mesh(sliceGeometry, limeMaterials), { size: rand(0.6, 1), dist: rand(4, 10) });
    }

    const iceGeometry = new RoundedBoxGeometry(0.42, 0.42, 0.42, 4, 0.07);
    const iceMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xeaf8ff,
      roughness: 0.04,
      transparent: true,
      depthWrite: false,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      ior: 1.31,
      envMapIntensity: 3,
    });
    // Efecto cristal (Fresnel): casi transparente de frente y brillante en los bordes
    iceMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        float fresnel = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 1.5);
        float light = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
        gl_FragColor.rgb = mix(vec3(0.72, 0.87, 1.0) * (0.55 + light), vec3(1.0), fresnel * 0.8);
        gl_FragColor.a = mix(0.35, 0.95, fresnel);`,
      );
    };
    for (let i = 0; i < amount(12); i++) {
      this.push(new THREE.Mesh(iceGeometry, iceMaterial), { size: rand(0.6, 1.2), dist: rand(3.5, 10), shadow: false });
    }

    const drop = dropGeometry();
    const dropMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffd93b,
      emissive: 0xffb800,
      emissiveIntensity: 0.25,
      roughness: 0.02,
      transparent: true,
      opacity: 0.75,
      clearcoat: 1,
      envMapIntensity: 2.5,
    });
    for (let i = 0; i < amount(40); i++) {
      this.push(new THREE.Mesh(drop, dropMaterial), { size: rand(0.5, 1.5), dist: rand(3, 9), orient: true });
    }

    this.visible = false;
  }

  push(mesh, { size, dist, orient = false, shadow = true }) {
    mesh.castShadow = shadow;
    // Dirección hacia fuera y hacia la cámara, sin pasar justo por el centro de la pantalla
    const dir = new THREE.Vector3(rand(-1, 1), rand(-0.75, 0.9), rand(0.15, 1.3));
    if (Math.hypot(dir.x, dir.y) < 0.35) {
      const angle = Math.atan2(dir.y, dir.x);
      dir.x = Math.cos(angle) * 0.35;
      dir.y = Math.sin(angle) * 0.35;
    }
    dir.normalize();

    // La punta de la gota queda detrás, como una estela
    if (orient) mesh.quaternion.setFromUnitVectors(UP, dir.clone().negate());

    mesh.scale.setScalar(0);
    this.add(mesh);
    this.items.push({
      mesh,
      dir,
      dist,
      size,
      orient,
      delay: rand(0, 0.12),
      fall: rand(0.5, 2),
      origin: new THREE.Vector3(rand(-0.25, 0.25), rand(-0.8, 0.8), rand(-0.2, 0.2)),
      rot0: new THREE.Vector3(rand(0, 6.3), rand(0, 6.3), rand(0, 6.3)),
      spin: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(rand(2, 7)),
    });
  }

  update(p, time) {
    this.visible = p > 0.0001 && p < 0.999;
    if (!this.visible) return;

    for (const it of this.items) {
      const lp = clamp((p - it.delay) / (1 - it.delay), 0, 1);
      const eased = 1 - Math.pow(1 - lp, 3);
      const m = it.mesh;

      m.position.copy(it.dir).multiplyScalar(eased * it.dist).add(it.origin);
      m.position.y -= lp * lp * it.fall;

      const grow = smoothstep(lp, 0, 0.1) * (1 - smoothstep(lp, 0.85, 1));
      m.scale.setScalar(Math.max(it.size * grow, 0.0001));

      if (!it.orient) {
        m.rotation.set(
          it.rot0.x + it.spin.x * lp + Math.sin(time + it.rot0.x) * 0.1,
          it.rot0.y + it.spin.y * lp,
          it.rot0.z + it.spin.z * lp,
        );
      }
    }
  }
}
