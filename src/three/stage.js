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
import { createRenderer, applyEnvironment, studioLights, shadowWall, precompile } from './studio.js';
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

    this.renderer = createRenderer(canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 0, 7);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  build(assets) {
    const { renderer, scene, flavors, mobile } = this;

    applyEnvironment(scene, renderer, assets.hdr);
    this.rim = studioLights(scene, flavors[0].color, mobile).rim;
    this.shadowWall = shadowWall(scene, flavors[0].ink);

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

    // Compila todos los shaders ya (mientras se ve la pantalla de carga) para que no haya tirones luego
    precompile(renderer, scene, this.camera);
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
