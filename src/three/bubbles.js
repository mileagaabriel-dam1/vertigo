import * as THREE from 'three';

// Burbujas de gas que suben por el fondo de toda la página.
// Se dibujan como puntos con un shader: anillo fino + brillo, como una burbuja real.
export class Bubbles extends THREE.Points {
  constructor(count = 260) {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = THREE.MathUtils.randFloat(-9, 9);
      positions[i * 3 + 1] = THREE.MathUtils.randFloat(-6, 6);
      positions[i * 3 + 2] = THREE.MathUtils.randFloat(-7, 2);
      seeds[i * 2] = THREE.MathUtils.randFloat(0.3, 1); // tamaño
      seeds[i * 2 + 1] = THREE.MathUtils.randFloat(0.15, 0.6); // velocidad
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 2));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uColor: { value: new THREE.Color('#ffe14d') },
        uOpacity: { value: 1 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: /* glsl */ `
        attribute vec2 aSeed;
        uniform float uTime;
        uniform float uScroll;
        uniform float uPixelRatio;
        varying float vAlpha;

        void main() {
          vec3 p = position;
          p.y = mod(p.y + 6.0 + uTime * aSeed.y + uScroll * (0.6 + aSeed.y), 12.0) - 6.0;
          p.x += sin(uTime * 0.8 + position.y * 2.0 + aSeed.x * 10.0) * 0.12;

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSeed.x * 260.0 * uPixelRatio / -mv.z;

          // Aparecen abajo y se desvanecen arriba
          vAlpha = smoothstep(-6.0, -4.5, p.y) * (1.0 - smoothstep(4.5, 6.0, p.y));
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;

        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float ring = smoothstep(0.5, 0.42, d) * smoothstep(0.26, 0.46, d);
          float highlight = smoothstep(0.14, 0.0, length(uv - vec2(-0.16, -0.16)));
          float alpha = (ring * 0.6 + highlight * 0.9 + 0.05) * vAlpha * uOpacity;
          gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.5 + highlight * 0.5), alpha);
        }
      `,
    });

    super(geometry, material);
    this.frustumCulled = false;
  }

  update(time, scroll) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uScroll.value = scroll;
  }
}
