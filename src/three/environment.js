import * as THREE from 'three';

// Estudio fotográfico virtual: una sala oscura con "softboxes" (paneles de luz).
// Se usa como mapa de entorno, así el metal y el barniz de la lata reflejan tiras de luz como en una foto de producto.
export function studioEnvironment(renderer) {
  const scene = new THREE.Scene();

  const room = new THREE.Mesh(
    new THREE.SphereGeometry(20, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x0d0d10, side: THREE.BackSide }),
  );
  scene.add(room);

  const panel = (width, height, color, intensity, position) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };

  panel(10, 4, '#ffffff', 3.2, [0, 9, 2]); // cenital
  panel(2.2, 14, '#fff1c2', 4, [-8, 0, 3]); // tira cálida a la izquierda
  panel(1.6, 14, '#ffffff', 3, [8, 1, 1]); // tira fría a la derecha
  panel(8, 8, '#ffd21f', 1.1, [0, -1, -10]); // rebote amarillo detrás
  panel(12, 5, '#ffffff', 0.6, [0, 0, 12]); // relleno frontal suave
  panel(10, 3, '#ffffff', 1.2, [0, -8, 3]); // rebote del suelo

  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  return texture;
}
