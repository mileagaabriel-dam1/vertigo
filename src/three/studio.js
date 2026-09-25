import * as THREE from 'three';

// Piezas comunes de las escenas 3D de la web (inicio y sabores):
// renderizador, iluminación de estudio (HDRI), luces y pared de sombras.

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  // Mapeo de tonos pensado para fotografía de producto: respeta los colores de marca
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}

// HDRI de estudio fotográfico como luz ambiente y reflejos
export function applyEnvironment(scene, renderer, hdr) {
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  scene.environmentIntensity = 1.1;
  scene.environmentRotation.set(0, -0.6, 0);
  pmrem.dispose();
  hdr.dispose();
}

// Luz principal con sombras suaves + contraluz del color del sabor
export function studioLights(scene, color, mobile) {
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(3, 4, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: 1, far: 25 });
  key.shadow.radius = 8;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;

  const rim = new THREE.DirectionalLight(color, 3.5);
  rim.position.set(-4, 2, -3);
  scene.add(key, rim);
  return { key, rim };
}

// "Pared" invisible detrás de la escena que solo muestra la sombra
export function shadowWall(scene, color, z = -2.2) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.ShadowMaterial({ color, opacity: 0.3 }));
  wall.position.z = z;
  wall.receiveShadow = true;
  scene.add(wall);
  return wall;
}

// compile() solo recorre lo visible: se enseña todo un momento para compilar todos los shaders
export function precompile(renderer, scene, camera) {
  const hidden = [];
  scene.traverse((o) => {
    if (!o.visible) {
      hidden.push(o);
      o.visible = true;
    }
  });
  renderer.compile(scene, camera);
  hidden.forEach((o) => (o.visible = false));
}
