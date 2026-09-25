import * as THREE from 'three';

// Lata "slim" de 250 ml modelada por código: cuerpo con etiqueta + tapa y base metálicas.
const R = 0.42;
const BODY_BOTTOM = -0.89;
const BODY_TOP = 0.86;

const v = (x, y) => new THREE.Vector2(x, y);

function pullTab(material) {
  const w = 0.15;
  const h = 0.3;
  const r = 0.06;
  const x = -w / 2;
  const y = -h / 2;

  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  const hole = new THREE.Path();
  hole.absellipse(0, 0.055, 0.042, 0.05, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 24,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.995, -0.06);
  return mesh;
}

export class Can extends THREE.Group {
  // maps: { condensation: { bump, roughness }, brushed }
  constructor(label, maps) {
    super();
    // Primero gira sobre su eje (Y) y después se inclina (Z)
    this.rotation.order = 'XZY';

    // Etiqueta barnizada con gotas de condensación por encima
    this.labelMaterial = new THREE.MeshPhysicalMaterial({
      map: label,
      metalness: 0.12,
      roughness: 1,
      roughnessMap: maps.condensation.roughness,
      bumpMap: maps.condensation.bump,
      bumpScale: 2.5,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    });
    const metal = new THREE.MeshStandardMaterial({
      color: 0xdadde2,
      metalness: 1,
      roughness: 1,
      roughnessMap: maps.brushed,
      side: THREE.DoubleSide,
    });

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(R, R, BODY_TOP - BODY_BOTTOM, 128, 1, true),
      this.labelMaterial,
    );
    body.position.y = (BODY_TOP + BODY_BOTTOM) / 2;

    const shoulder = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          v(R, BODY_TOP),
          v(R, 0.88),
          v(0.395, 0.95),
          v(0.352, 1.0),
          v(0.355, 1.03),
          v(0.34, 1.05),
          v(0.322, 1.036),
          v(0.314, 1.0),
          v(0.3, 0.99),
          v(0, 0.99),
        ],
        96,
      ),
      metal,
    );

    const base = new THREE.Mesh(
      new THREE.LatheGeometry(
        [v(0, -0.98), v(0.22, -1.0), v(0.33, -1.045), v(0.37, -1.05), v(0.405, -1.02), v(R, -0.95), v(R, BODY_BOTTOM)],
        96,
      ),
      metal,
    );

    const groove = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.006, 8, 96), metal);
    groove.rotation.x = Math.PI / 2;
    groove.position.y = 0.992;

    const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.02, 24), metal);
    rivet.position.set(0, 1.0, 0);

    this.add(body, shoulder, base, groove, pullTab(metal), rivet);
    this.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
  }

  setLabel(texture) {
    this.labelMaterial.map = texture;
  }
}
