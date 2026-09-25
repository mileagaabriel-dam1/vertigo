import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { juiceMaterial } from './liquid.js';

const v = (x, y) => new THREE.Vector2(x, y);

// Cristal: casi invisible de frente y con brillo en los bordes (Fresnel), con gotas de condensación
function glassMaterial(condensation) {
  // Color negro: el cristal no tiene color propio, solo los reflejos (se suman encima)
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    roughness: 0.1,
    bumpMap: condensation.bump,
    bumpScale: 1.5,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    transparent: true,
    depthWrite: false,
    envMapIntensity: 2.2,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `#include <opaque_fragment>
      float fresnel = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.5);
      float highlight = max(0.0, dot(gl_FragColor.rgb, vec3(0.333)) - 0.35);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.92, 0.97, 1.0), fresnel * 0.55);
      gl_FragColor.a = clamp(0.04 + fresnel * 0.55 + highlight * 1.5, 0.0, 1.0);`,
    );
  };
  material.customProgramCacheKey = () => 'drink-glass';
  return material;
}

export function iceMaterial() {
  const material = new THREE.MeshPhysicalMaterial({
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
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `#include <opaque_fragment>
      float fresnel = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 1.5);
      float light = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
      gl_FragColor.rgb = mix(vec3(0.72, 0.87, 1.0) * (0.55 + light), vec3(1.0), fresnel * 0.8);
      gl_FragColor.a = mix(0.35, 0.95, fresnel);`,
    );
  };
  material.customProgramCacheKey = () => 'ice';
  return material;
}

export const ICE_GEOMETRY = new RoundedBoxGeometry(0.42, 0.42, 0.42, 4, 0.07);

// Pajita de papel a rayas
function strawMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const g = canvas.getContext('2d');
  g.fillStyle = '#fbf7ea';
  g.fillRect(0, 0, 64, 512);
  g.fillStyle = '#ffd21f';
  for (let y = -64; y < 576; y += 64) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(64, y + 40);
    g.lineTo(64, y + 68);
    g.lineTo(0, y + 28);
    g.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7 });
}

// Burbujas de gas que suben dentro del vaso
class GlassBubbles extends THREE.Points {
  constructor(count, radius, bottom, top) {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = bottom + Math.random() * (top - bottom);
      positions[i * 3 + 2] = Math.sin(a) * r;
      seeds[i] = Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uBottom: { value: bottom },
        uHeight: { value: top - bottom },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uScale: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime, uBottom, uHeight, uPixelRatio, uScale;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.y = uBottom + mod(p.y - uBottom + uTime * (0.15 + aSeed * 0.35), uHeight);
          p.x += sin(uTime * 3.0 + aSeed * 20.0) * 0.01;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (2.0 + aSeed * 5.0) * uPixelRatio * uScale * 7.0 / -mv.z;
          vAlpha = smoothstep(0.0, 0.1, (p.y - uBottom) / uHeight) * (1.0 - smoothstep(0.85, 1.0, (p.y - uBottom) / uHeight));
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float ring = smoothstep(0.5, 0.35, d) * smoothstep(0.1, 0.4, d);
          gl_FragColor = vec4(1.0, 1.0, 0.95, (ring * 0.8 + 0.15) * vAlpha);
        }
      `,
    });
    super(geometry, material);
    this.renderOrder = 3;
  }
}

// Vaso de Vértigo servido: cristal, bebida, hielo, burbujas, pajita y rodaja en el borde
export class DrinkGlass extends THREE.Group {
  constructor({ flavors, kits, condensation }) {
    super();
    this.flavors = flavors;
    this.kits = kits;

    const glass = new THREE.Mesh(
      new THREE.LatheGeometry(
        [v(0, -0.72), v(0.4, -0.72), v(0.425, -0.69), v(0.47, 0.72), v(0.455, 0.725), v(0.412, -0.6), v(0, -0.6)],
        96,
      ),
      glassMaterial(condensation),
    );
    glass.renderOrder = 4;

    this.liquid = juiceMaterial(flavors[0].liquid, { min: 0.78, max: 0.97, glow: 0.3 });
    const drink = new THREE.Mesh(
      new THREE.LatheGeometry([v(0, -0.595), v(0.405, -0.595), v(0.438, 0.34), v(0.43, 0.355), v(0, 0.355)], 96),
      this.liquid,
    );
    drink.renderOrder = 1;

    const ice = iceMaterial();
    const cubes = [
      [0.13, 0.33, 0.08, 0.55],
      [-0.14, 0.3, -0.06, 0.5],
      [0.02, 0.36, -0.2, 0.45],
    ].map(([x, y, z, s]) => {
      const cube = new THREE.Mesh(ICE_GEOMETRY, ice);
      cube.position.set(x, y, z);
      cube.scale.setScalar(s);
      cube.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      cube.renderOrder = 2;
      return cube;
    });
    this.cubes = cubes;

    this.bubbles = new GlassBubbles(90, 0.36, -0.58, 0.33);

    const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.9, 24, 1, true), strawMaterial());
    straw.position.set(-0.16, 0.38, 0.02);
    straw.rotation.z = 0.28;
    straw.castShadow = true;

    this.garnishHolder = new THREE.Group();
    this.garnishHolder.position.set(0.44, 0.66, 0.1);
    this.garnishHolder.rotation.set(0.25, -0.5, 0);

    this.add(drink, ...cubes, this.bubbles, straw, this.garnishHolder, glass);
    this.setFlavor(0);
  }

  setFlavor(index) {
    const flavor = this.flavors[index];
    this.liquid.color.set(flavor.liquid);
    this.liquid.emissive.set(flavor.liquid);
    this.garnishHolder.clear();
    // Rodaja encajada en el borde del vaso (de canto)
    const slice = this.kits.slices[flavor.fruit].create(0.62, 0.07);
    slice.rotation.x = Math.PI / 2;
    this.garnishHolder.add(slice);
    if (flavor.mint) {
      const leaf = this.kits.mint.create(0.5);
      leaf.position.set(-0.4, 0.05, 0.05);
      leaf.rotation.set(-0.6, 0.4, 0.5);
      this.garnishHolder.add(leaf);
    }
  }

  update(time, scale) {
    this.bubbles.material.uniforms.uTime.value = time;
    this.bubbles.material.uniforms.uScale.value = scale;
    this.cubes.forEach((cube, i) => {
      cube.position.y = 0.3 + i * 0.03 + Math.sin(time * 1.5 + i * 2) * 0.012;
      cube.rotation.y += 0.002;
    });
  }
}
