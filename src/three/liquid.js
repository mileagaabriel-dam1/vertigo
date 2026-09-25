import * as THREE from 'three';

const { clamp, smoothstep } = THREE.MathUtils;

// Material de zumo/bebida: brillante y translúcido. Por el efecto Fresnel se ve más denso en los bordes,
// como un líquido de verdad, y los reflejos de luz quedan siempre opacos.
// vertexHook permite añadir movimiento (ondas) en el shader.
export function juiceMaterial(color, { min = 0.4, max = 0.94, glow = 0.25, vertexHook } = {}) {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    emissive: color,
    emissiveIntensity: glow,
    roughness: 0.03,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    ior: 1.34,
    transparent: true,
    depthWrite: false,
    envMapIntensity: 1.6,
  });
  material.userData.uniforms = { uTime: { value: 0 } };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, material.userData.uniforms);
    if (vertexHook) {
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${vertexHook}`);
    }
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `#include <opaque_fragment>
      float fresnel = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.0);
      float highlight = max(0.0, dot(gl_FragColor.rgb, vec3(0.333)) - 0.75);
      // Bordes: más densos y de un color más intenso (el líquido es más grueso visto de canto)
      gl_FragColor.rgb *= mix(1.15, 0.8, fresnel);
      gl_FragColor.a = clamp(mix(${min.toFixed(2)}, ${max.toFixed(2)}, fresnel) + highlight * 2.0, 0.0, 1.0);`,
    );
  };
  // Cada material con su propio programa (el código del shader depende de los parámetros)
  material.customProgramCacheKey = () => `juice-${min}-${max}-${vertexHook ? vertexHook.length : 0}`;
  return material;
}

// Gota con forma de lágrima: esfera estirada y afilada por arriba
export function dropGeometry(radius = 0.08) {
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

// Tubo que sigue una curva, afinado en los extremos y aplastado para parecer una lámina de líquido
export function ribbonGeometry(curve, { segments = 200, radial = 14, radius = 0.07, flatten = 0.45, taper }) {
  const geometry = new THREE.TubeGeometry(curve, segments, radius, radial, false);
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, p);
    const n = geometry.normals[i];
    const b = geometry.binormals[i];
    const s = taper(t);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(p);
      const dn = v.dot(n) * s;
      const db = v.dot(b) * s * flatten;
      pos.setXYZ(idx, p.x + n.x * dn + b.x * db, p.y + n.y * dn + b.y * db, p.z + n.z * dn + b.z * db);
    }
  }
  geometry.computeVertexNormals();
  geometry.userData = { segments, radial };
  return geometry;
}

// Muestra solo un tramo del tubo (de "from" a "to", entre 0 y 1): así el líquido crece y fluye
function setRibbonRange(geometry, from, to) {
  const { segments, radial } = geometry.userData;
  const perSegment = radial * 6;
  const a = Math.floor(clamp(from, 0, 1) * segments);
  const b = Math.floor(clamp(to, 0, 1) * segments);
  geometry.setDrawRange(a * perSegment, Math.max(0, b - a) * perSegment);
}

// Ondas que recorren el líquido a lo largo (uv.x va de un extremo al otro del tubo)
const WAVES = 'transformed += objectNormal * sin(uv.x * 38.0 - uTime * 4.0) * 0.012;';

// Espiral de bebida que envuelve la lata en el hero (la espiral es el símbolo de la marca)
export class LiquidSwirl extends THREE.Mesh {
  constructor(color) {
    const points = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const angle = t * Math.PI * 3.4 - 0.4;
      const r = 0.66 + Math.sin(t * Math.PI * 2) * 0.1;
      points.push(new THREE.Vector3(Math.cos(angle) * r, -1.3 + t * 2.6, Math.sin(angle) * r));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = ribbonGeometry(curve, {
      segments: 360,
      radius: 0.09,
      flatten: 0.36,
      taper: (t) => Math.pow(Math.sin(Math.PI * t), 0.45),
    });
    super(geometry, juiceMaterial(color, { min: 0.3, max: 0.92, vertexHook: WAVES }));
    this.renderOrder = 2;
  }

  setColor(color) {
    this.material.color.set(color);
    this.material.emissive.set(color);
  }

  // p: cuánto de la espiral se ve (0 → 1)
  update(time, p) {
    this.material.userData.uniforms.uTime.value = time;
    setRibbonRange(this.geometry, 0, p);
    this.visible = p > 0.01;
  }
}

// Salpicaduras de la explosión: lenguas de líquido que salen de la lata, crecen y se alejan
export class Splash extends THREE.Group {
  constructor(color, count = 7) {
    super();
    this.material = juiceMaterial(color, { min: 0.32, max: 0.94, vertexHook: WAVES });
    this.dropMaterial = juiceMaterial(color, { min: 0.45, max: 0.96 });
    this.ribbons = [];
    const drop = new THREE.SphereGeometry(1, 20, 14);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dir = new THREE.Vector3(Math.cos(angle), Math.sin(angle) * 0.8 + 0.2, 0.4 + Math.random() * 0.6).normalize();
      const side = new THREE.Vector3(-dir.y, dir.x, 0).normalize().multiplyScalar(0.35 + Math.random() * 0.5);
      const reach = 2.2 + Math.random() * 1.8;
      // Cada chorro nace en un punto distinto de la superficie de la lata
      const start = new THREE.Vector3(Math.cos(angle) * 0.4, (Math.random() - 0.5) * 1.4, Math.sin(angle) * 0.2 + 0.2);
      const curve = new THREE.CatmullRomCurve3([
        start,
        start.clone().add(dir.clone().multiplyScalar(reach * 0.25)).add(side.clone().multiplyScalar(0.6)),
        start.clone().add(dir.clone().multiplyScalar(reach * 0.55)).sub(side.clone().multiplyScalar(0.2)),
        start.clone().add(dir.clone().multiplyScalar(reach * 0.8)).add(side.clone().multiplyScalar(0.5)),
        start.clone().add(dir.clone().multiplyScalar(reach)).add(new THREE.Vector3(0, -0.6, 0)),
      ]);
      const geometry = ribbonGeometry(curve, {
        segments: 160,
        radial: 12,
        radius: 0.07 + Math.random() * 0.05,
        flatten: 0.35 + Math.random() * 0.4,
        taper: (t) => Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.6) * (1 - t * 0.55),
      });
      const mesh = new THREE.Mesh(geometry, this.material);
      mesh.renderOrder = 2;
      mesh.castShadow = true;
      // Gota gorda en la punta de cada lengua
      const tip = new THREE.Mesh(drop, this.dropMaterial);
      tip.scale.setScalar(0.06 + Math.random() * 0.04);
      tip.castShadow = true;
      this.add(mesh, tip);
      this.ribbons.push({ mesh, tip, curve, delay: Math.random() * 0.15 });
    }
    this.visible = false;
  }

  setColor(color) {
    for (const m of [this.material, this.dropMaterial]) {
      m.color.set(color);
      m.emissive.set(color);
    }
  }

  update(time, p) {
    this.visible = p > 0.001 && p < 0.999;
    if (!this.visible) return;
    this.material.userData.uniforms.uTime.value = time;
    for (const r of this.ribbons) {
      const lp = clamp((p - r.delay) / (1 - r.delay), 0, 1);
      const grow = 1 - Math.pow(1 - smoothstep(lp, 0, 0.45), 3);
      const flow = smoothstep(lp, 0.35, 1);
      setRibbonRange(r.mesh.geometry, flow, grow);
      r.tip.visible = grow > 0.02 && flow < 0.98;
      r.curve.getPointAt(Math.min(grow, 0.999), r.tip.position);
    }
  }
}
