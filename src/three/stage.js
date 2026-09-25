import * as THREE from 'three';
import { Can } from './can.js';
import { Burst } from './burst.js';
import { Bubbles } from './bubbles.js';
import { LiquidSwirl } from './liquid.js';
import { DrinkGlass } from './glass.js';
import { FruitCluster } from './cluster.js';
import { createFruitKits } from './fruit.js';
import { loadAssets } from './assets.js';
import { Poke } from './poke.js';
import { labelTexture, glowTexture, condensationTextures, brushedTexture } from './textures.js';

// Escena 3D fija por encima del contenido: lata, bebida, fruta, burbujas, sombras y explosión.
// Se crea con Stage.create(), que antes descarga los recursos reales (HDRI, escaneos y fotos).
export class Stage {
  static async create(canvas, flavors, onProgress) {
    const stage = new Stage(canvas, flavors);
    const assets = await loadAssets(onProgress);
    stage.build(assets);
    return stage;
  }

  constructor(canvas, flavors) {
    this.flavors = flavors;
    this.mobile = window.innerWidth < 760;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    // Mapeo de tonos pensado para fotografía de producto: respeta los colores de marca
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 0, 7);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  build(assets) {
    const { renderer, scene, flavors, mobile } = this;

    // Iluminación de un estudio fotográfico real (HDRI): reflejos y luz ambiente
    assets.hdr.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(assets.hdr).texture;
    scene.environmentIntensity = 1.1;
    scene.environmentRotation.set(0, -0.6, 0);
    pmrem.dispose();
    assets.hdr.dispose();

    // Luz principal: arriba a la derecha, es la que proyecta las sombras
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(3, 4, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    Object.assign(key.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: 1, far: 25 });
    key.shadow.radius = 8;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;

    // Contraluz del color del sabor: dibuja el borde de la lata y de la fruta
    this.rim = new THREE.DirectionalLight(flavors[0].color, 3.5);
    this.rim.position.set(-4, 2, -3);
    scene.add(key, this.rim);

    // "Pared" invisible detrás de la lata que solo muestra la sombra
    this.shadowWall = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 30),
      new THREE.ShadowMaterial({ color: flavors[0].ink, opacity: 0.3 }),
    );
    this.shadowWall.position.z = -2.2;
    this.shadowWall.receiveShadow = true;
    scene.add(this.shadowWall);

    this.bubbles = new Bubbles(mobile ? 140 : 240);
    scene.add(this.bubbles);

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
    scene.add(this.aura);

    const condensation = condensationTextures(renderer);
    this.labels = flavors.map((f) => labelTexture(f, renderer));
    this.can = new Can(this.labels[0], { condensation, brushed: brushedTexture(renderer) });
    scene.add(this.can);

    const kits = createFruitKits(assets, renderer);
    this.kits = kits;

    // Espiral de bebida alrededor de la lata (hero)
    this.swirl = new LiquidSwirl(flavors[0].liquid);
    scene.add(this.swirl);

    // Fruta flotando alrededor de la lata (hero y sabores)
    this.cluster = new FruitCluster(flavors, kits);
    this.cluster.setFlavor(0, false);
    scene.add(this.cluster);

    // Vaso servido (sección de la tienda)
    this.glass = new DrinkGlass({ flavors, kits, condensation });
    this.glass.visible = false;
    scene.add(this.glass);

    this.burst = new Burst({ kits, juice: flavors[0].liquid, mobile });
    scene.add(this.burst);

    // Lo que se toca con el ratón se mueve un poco
    this.poke = new Poke(this.camera);
    this.poke.add(this.can, 0.55);
    this.poke.add(this.glass, 0.45);
    for (const set of this.cluster.sets) for (const item of set.userData.items) this.poke.add(item, 1);

    // Compila todos los shaders ya (mientras se ve la pantalla de carga) para que no haya tirones luego.
    // compile() solo recorre lo visible, así que se enseña todo un momento.
    const hidden = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    renderer.compile(scene, this.camera);
    hidden.forEach((o) => (o.visible = false));
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
    this.glass.setFlavor(index);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
