import * as THREE from 'three';
import { Can } from './can.js';
import { Burst } from './burst.js';
import { Bubbles } from './bubbles.js';
import { studioEnvironment } from './environment.js';
import { labelTexture, citrusTexture, glowTexture, condensationTextures, brushedTexture } from './textures.js';

// Escena 3D fija por encima del contenido: cámara, luces, lata, halo, burbujas, sombras y explosión.
export class Stage {
  constructor(canvas, flavors) {
    this.flavors = flavors;
    const mobile = window.innerWidth < 760;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.environment = studioEnvironment(renderer);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 0, 7);

    // Luz principal: arriba a la derecha, es la que proyecta las sombras
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 4, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    Object.assign(key.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: 1, far: 25 });
    key.shadow.radius = 8;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;

    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-3, -2, 4);
    // Contraluz del color del sabor: dibuja el borde de la lata
    this.rim = new THREE.DirectionalLight(flavors[0].color, 4);
    this.rim.position.set(-4, 2, -3);
    this.scene.add(key, fill, this.rim);

    // "Pared" invisible detrás de la lata que solo muestra la sombra.
    // Sobre los fondos de color de "Sabores" la sombra queda muy real.
    this.shadowWall = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 30),
      new THREE.ShadowMaterial({ color: flavors[0].ink, opacity: 0.3 }),
    );
    this.shadowWall.position.z = -2.2;
    this.shadowWall.receiveShadow = true;
    this.scene.add(this.shadowWall);

    this.bubbles = new Bubbles(mobile ? 140 : 260);
    this.scene.add(this.bubbles);

    this.aura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: flavors[0].color,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.scene.add(this.aura);

    this.labels = flavors.map((f) => labelTexture(f, renderer));
    this.can = new Can(this.labels[0], {
      condensation: condensationTextures(renderer),
      brushed: brushedTexture(renderer),
    });
    this.scene.add(this.can);

    const lemon = flavors[0].slice;
    const lime = flavors[2].slice;
    this.burst = new Burst({
      lemon: { map: citrusTexture(lemon, renderer), peel: lemon.peel },
      lime: { map: citrusTexture(lime, renderer), peel: lime.peel },
      mobile,
    });
    this.scene.add(this.burst);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  // Mitad del ancho visible en el plano de la lata (z = 0), en unidades 3D
  get halfWidth() {
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.position.z;
    return halfHeight * this.camera.aspect;
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setFlavor(index) {
    const flavor = this.flavors[index];
    this.can.setLabel(this.labels[index]);
    this.aura.material.color.set(flavor.color);
    this.rim.color.set(flavor.color);
    this.shadowWall.material.color.set(flavor.ink);
    this.bubbles.material.uniforms.uColor.value.set(flavor.color);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
