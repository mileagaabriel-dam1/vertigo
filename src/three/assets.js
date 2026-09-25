import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

// Recursos reales (ver créditos en README):
//  - HDRI de estudio y modelos escaneados de limón y lima: Poly Haven (CC0)
//  - Fotos de fruta cortada: Wikimedia Commons (CC BY-SA)
const SLICE_PHOTOS = {
  lemon: 'lemon',
  lime: 'lime',
  grapefruit: 'grapefruit',
  bloodOrange: 'blood-orange',
};

export function loadAssets(onProgress = () => {}) {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => onProgress(loaded / total);

  // Rutas relativas: funcionan igual en local y en GitHub Pages
  const load = (loader, url) =>
    new Promise((resolve, reject) => loader.load(`assets/${url}`, resolve, undefined, reject));

  const gltf = new GLTFLoader(manager);
  const images = new THREE.ImageLoader(manager);
  const photos = Object.entries(SLICE_PHOTOS).map(([id, file]) =>
    load(images, `textures/slices/${file}.jpg`).then((image) => [id, image]),
  );

  return Promise.all([
    load(new HDRLoader(manager), 'hdri/studio_small_09_1k.hdr'),
    load(gltf, 'models/lemon/lemon.gltf'),
    load(gltf, 'models/lime/lime.gltf'),
    Promise.all(photos),
  ]).then(([hdr, lemon, lime, photoList]) => ({
    hdr,
    lemon: lemon.scene,
    lime: lime.scene,
    photos: Object.fromEntries(photoList),
  }));
}
