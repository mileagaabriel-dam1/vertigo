import * as THREE from 'three';

// Fruta realista:
//  - Rodajas: la cara es una FOTO REAL de la fruta cortada. De esa foto se calculan por código
//    el relieve (mapa de normales) y el brillo del zumo (mapa de rugosidad). El borde usa la piel de los escaneos 3D.
//  - Frutas enteras: modelos escaneados (Poly Haven). Pomelo y naranja salen de la lima con el color cambiado.
//  - Hojas de menta: dibujadas por código con nervios, relieve y bordes dentados.

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d', { willReadFrequently: true })];
}

function colorTexture(canvas, renderer, flipY = true) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.flipY = flipY;
  return texture;
}

function dataTexture(canvas, renderer, flipY = true) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.flipY = flipY;
  return texture;
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Suavizado 3x3 de un mapa de alturas
function blur(src, w, h) {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let n = 0;
      for (let j = -1; j <= 1; j++) {
        const yy = y + j;
        if (yy < 0 || yy >= h) continue;
        for (let i = -1; i <= 1; i++) {
          const xx = x + i;
          if (xx < 0 || xx >= w) continue;
          sum += src[yy * w + xx];
          n++;
        }
      }
      out[y * w + x] = sum / n;
    }
  }
  return out;
}

// Mapa de alturas → mapa de normales (espacio tangente, convención OpenGL)
function normalFromHeight(height, w, h, strength) {
  const [canvas, g] = makeCanvas(w, h);
  const img = g.createImageData(w, h);
  const at = (x, y) => height[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = -(at(x + 1, y) - at(x - 1, y)) * strength;
      const ny = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * w + x) * 4;
      img.data[i] = (nx / len) * 127.5 + 127.5;
      img.data[i + 1] = (ny / len) * 127.5 + 127.5;
      img.data[i + 2] = (1 / len) * 127.5 + 127.5;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return canvas;
}

// Tiñe un lienzo conservando la luminosidad (los poros de la piel siguen ahí)
function tintCanvas(g, w, h, hex, gain = 1) {
  const [tr, tg, tb] = hexToRgb(hex);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  let total = 0;
  let count = 0;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    if (lum > 0.08) {
      total += lum;
      count++;
    }
  }
  const mean = total / Math.max(1, count);
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    const k = (lum / mean) * gain;
    d[i] = Math.min(255, tr * k * 255);
    d[i + 1] = Math.min(255, tg * k * 255);
    d[i + 2] = Math.min(255, tb * k * 255);
  }
  g.putImageData(img, 0, 0);
}

// ---------- Rodajas ----------

// A partir de la foto de la rodaja: color, relieve y rugosidad
function sliceFaceMaps(photo, renderer, filter) {
  const S = 1024;
  const [color, g] = makeCanvas(S, S);
  if (filter) g.filter = filter;
  g.drawImage(photo, 0, 0, S, S);
  g.filter = 'none';

  const { data } = g.getImageData(0, 0, S, S);
  const height = new Float32Array(S * S);
  const [roughCanvas, rg] = makeCanvas(S, S);
  const rough = rg.createImageData(S, S);

  for (let i = 0; i < S * S; i++) {
    const r = data[i * 4] / 255;
    const gg = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    const max = Math.max(r, gg, b);
    const sat = max ? (max - Math.min(r, gg, b)) / max : 0;
    const lum = 0.299 * r + 0.587 * gg + 0.114 * b;
    height[i] = lum;
    // Pulpa (color saturado) mojada y lisa; parte blanca más mate; los brillos de la foto, lo más liso
    let value = sat > 0.25 ? 0.18 : 0.5;
    if (lum > 0.88) value = 0.06;
    const v = value * 255;
    rough.data[i * 4] = v;
    rough.data[i * 4 + 1] = v;
    rough.data[i * 4 + 2] = v;
    rough.data[i * 4 + 3] = 255;
  }
  rg.putImageData(rough, 0, 0);

  return {
    color: colorTexture(color, renderer),
    normal: dataTexture(normalFromHeight(blur(height, S, S), S, S, 5), renderer),
    roughness: dataTexture(roughCanvas, renderer),
  };
}

// Tira de piel sacada de la textura del escaneo, en espejo para que no haya costura al dar la vuelta
function peelStrip(scanImage, rect, renderer, tint) {
  const W = 1024;
  const H = 96;
  const [canvas, g] = makeCanvas(W, H);
  const sx = rect.x * scanImage.width;
  const sy = rect.y * scanImage.height;
  const sw = rect.w * scanImage.width;
  const sh = rect.h * scanImage.height;
  g.drawImage(scanImage, sx, sy, sw, sh, 0, 0, W / 2, H);
  g.save();
  g.translate(W, 0);
  g.scale(-1, 1);
  g.drawImage(scanImage, sx, sy, sw, sh, 0, 0, W / 2, H);
  g.restore();
  if (tint) tintCanvas(g, W, H, tint, 1.05);
  return colorTexture(canvas, renderer);
}

const FACE_GEOMETRY = new THREE.CircleGeometry(0.5, 72);
const SIDE_GEOMETRY = new THREE.CylinderGeometry(0.5, 0.5, 1, 72, 1, true);

export class SliceKit {
  constructor({ photo, peel, renderer, filter }) {
    const maps = sliceFaceMaps(photo, renderer, filter);
    this.face = new THREE.MeshPhysicalMaterial({
      map: maps.color,
      normalMap: maps.normal,
      normalScale: new THREE.Vector2(0.9, 0.9),
      roughness: 1,
      roughnessMap: maps.roughness,
      // Un poco de luz propia: imita la luz que atraviesa la pulpa (translucidez)
      emissive: 0xffffff,
      emissiveMap: maps.color,
      emissiveIntensity: 0.2,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
    });
    this.side = new THREE.MeshStandardMaterial({
      map: peel,
      bumpMap: peel,
      bumpScale: 3,
      roughness: 0.55,
    });
  }

  // diámetro y grosor en unidades 3D. Devuelve un grupo que se puede escalar libremente.
  create(diameter = 0.7, thickness = 0.08) {
    const body = new THREE.Group();
    const top = new THREE.Mesh(FACE_GEOMETRY, this.face);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.5;
    const bottom = new THREE.Mesh(FACE_GEOMETRY, this.face);
    bottom.rotation.x = Math.PI / 2;
    bottom.position.y = -0.5;
    const side = new THREE.Mesh(SIDE_GEOMETRY, this.side);
    body.add(top, bottom, side);
    body.scale.set(diameter, thickness, diameter);
    body.traverse((m) => {
      if (m.isMesh) m.castShadow = true;
    });

    const slice = new THREE.Group();
    slice.add(body);
    return slice;
  }
}

// ---------- Frutas enteras ----------

function firstMesh(scene) {
  let mesh = null;
  scene.traverse((o) => {
    if (!mesh && o.isMesh) mesh = o;
  });
  return mesh;
}

// Copia del material del escaneo con otro color de piel
function tintedScanMaterial(material, hex, renderer) {
  const source = material.map.image;
  const S = 1024;
  const [canvas, g] = makeCanvas(S, S);
  g.drawImage(source, 0, 0, S, S);
  tintCanvas(g, S, S, hex, 1.1);
  const clone = material.clone();
  // Las texturas de glTF no se voltean
  clone.map = colorTexture(canvas, renderer, false);
  return clone;
}

export class FruitModel {
  // height: altura final en unidades 3D de una fruta de tamaño 1
  constructor(scene, { renderer, tint, height = 1 } = {}) {
    const mesh = firstMesh(scene);
    const geometry = mesh.geometry.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(height / size.y, height / size.y, height / size.y);
    this.geometry = geometry;
    this.material = tint ? tintedScanMaterial(mesh.material, tint, renderer) : mesh.material;
  }

  create(size = 1) {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.scale.setScalar(size);
    mesh.castShadow = true;
    const fruit = new THREE.Group();
    fruit.add(mesh);
    return fruit;
  }
}

// ---------- Hojas de menta ----------

function leafOutline(W, H) {
  const right = [];
  const N = 180;
  for (let i = 0; i <= N; i++) {
    const t = i / N; // 0 = base, 1 = punta
    const y = H * 0.97 - t * H * 0.93;
    let w = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.85) * W * 0.4;
    // Borde dentado: dientes en forma de sierra que apuntan hacia la punta
    const tooth = (t * 13) % 1;
    w *= 1 + 0.07 * tooth * Math.min(1, t * 6) * (1 - t);
    right.push([W / 2 + w, y]);
  }
  const left = right.map(([x, y]) => [W - x, y]).reverse();
  return [...right, ...left];
}

export class MintLeafKit {
  constructor(renderer) {
    const W = 512;
    const H = 768;
    const outline = leafOutline(W, H);
    const pathOf = (g) => {
      g.beginPath();
      outline.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
    };

    // Nervios: central y 7 pares laterales curvados hacia la punta
    const veins = [];
    for (let k = 1; k <= 7; k++) {
      const t = k / 8.5;
      const y0 = H * 0.97 - t * H * 0.93;
      const len = Math.sin(Math.PI * Math.pow(t, 0.75)) * W * 0.34;
      veins.push({ y0, len });
    }
    const drawVeins = (g, width, color) => {
      g.strokeStyle = color;
      g.lineCap = 'round';
      g.lineWidth = width * 1.8;
      g.beginPath();
      g.moveTo(W / 2, H * 0.99);
      g.quadraticCurveTo(W / 2 + 6, H * 0.5, W / 2, H * 0.05);
      g.stroke();
      g.lineWidth = width;
      for (const { y0, len } of veins) {
        for (const side of [-1, 1]) {
          g.beginPath();
          g.moveTo(W / 2, y0);
          g.quadraticCurveTo(W / 2 + side * len * 0.55, y0 - len * 0.12, W / 2 + side * len, y0 - len * 0.55);
          g.stroke();
        }
      }
    };

    // Color
    const [colorCanvas, g] = makeCanvas(W, H);
    pathOf(g);
    g.save();
    g.clip();
    const grad = g.createLinearGradient(0, H, 0, 0);
    grad.addColorStop(0, '#3f9a3a');
    grad.addColorStop(0.6, '#2f8a34');
    grad.addColorStop(1, '#46a844');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // Manchas sutiles de color
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '20,70,25' : '110,190,90'}, ${Math.random() * 0.08})`;
      g.beginPath();
      g.arc(Math.random() * W, Math.random() * H, 4 + Math.random() * 18, 0, Math.PI * 2);
      g.fill();
    }
    drawVeins(g, 3, 'rgba(170, 225, 150, 0.75)');
    // Borde algo más oscuro
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(20, 60, 20, 0.35)';
    pathOf(g);
    g.stroke();
    g.restore();

    // Relieve: la hoja de menta es rugosa, con los nervios hundidos
    const [heightCanvas, hg] = makeCanvas(W, H);
    hg.fillStyle = '#808080';
    hg.fillRect(0, 0, W, H);
    for (let i = 0; i < 1400; i++) {
      const r = 6 + Math.random() * 14;
      const x = Math.random() * W;
      const y = Math.random() * H;
      const bump = hg.createRadialGradient(x, y, 0, x, y, r);
      bump.addColorStop(0, 'rgba(255,255,255,0.35)');
      bump.addColorStop(1, 'rgba(255,255,255,0)');
      hg.fillStyle = bump;
      hg.fillRect(x - r, y - r, r * 2, r * 2);
    }
    drawVeins(hg, 5, 'rgba(0,0,0,0.6)');
    const hd = hg.getImageData(0, 0, W, H).data;
    const height = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) height[i] = hd[i * 4] / 255;

    this.material = new THREE.MeshPhysicalMaterial({
      map: colorTexture(colorCanvas, renderer),
      normalMap: dataTexture(normalFromHeight(blur(height, W, H), W, H, 6), renderer),
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.5,
      sheen: 0.6,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color('#c8ffb0'),
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
    });
    // Para que la sombra tenga forma de hoja y no de rectángulo
    this.depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: this.material.map,
      alphaTest: 0.5,
    });

    // Plano doblado por el nervio central y curvado hacia la punta
    const geometry = new THREE.PlaneGeometry(0.55, 0.82, 10, 16);
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = -Math.pow(Math.abs(x) / 0.275, 1.5) * 0.07 + Math.pow((y + 0.41) / 0.82, 2) * 0.1;
      pos.setZ(i, z);
    }
    geometry.computeVertexNormals();
    this.geometry = geometry;
  }

  create(size = 1) {
    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.customDepthMaterial = this.depthMaterial;
    mesh.castShadow = true;
    mesh.scale.setScalar(size);
    const leaf = new THREE.Group();
    leaf.add(mesh);
    return leaf;
  }
}

// ---------- Todo junto ----------

// Zonas de la textura de cada escaneo donde solo hay piel (se usan para el borde de las rodajas)
const LEMON_PEEL = { x: 0.42, y: 0.5, w: 0.16, h: 0.05 };
const LIME_PEEL = { x: 0.18, y: 0.4, w: 0.16, h: 0.05 };

export function createFruitKits(assets, renderer) {
  const lemonScan = firstMesh(assets.lemon).material.map.image;
  const limeScan = firstMesh(assets.lime).material.map.image;

  const slices = {
    lemon: new SliceKit({
      photo: assets.photos.lemon,
      peel: peelStrip(lemonScan, LEMON_PEEL, renderer),
      renderer,
      filter: 'saturate(1.35) brightness(1.06)',
    }),
    lime: new SliceKit({
      photo: assets.photos.lime,
      peel: peelStrip(limeScan, LIME_PEEL, renderer),
      renderer,
      filter: 'saturate(1.2)',
    }),
    grapefruit: new SliceKit({
      photo: assets.photos.grapefruit,
      peel: peelStrip(lemonScan, LEMON_PEEL, renderer, '#f2b25a'),
      renderer,
      filter: 'saturate(1.1)',
    }),
    bloodOrange: new SliceKit({
      photo: assets.photos.bloodOrange,
      peel: peelStrip(lemonScan, LEMON_PEEL, renderer, '#e8741e'),
      renderer,
      filter: 'saturate(1.1) brightness(1.08)',
    }),
  };

  const whole = {
    lemon: new FruitModel(assets.lemon, { renderer }),
    lime: new FruitModel(assets.lime, { renderer }),
    grapefruit: new FruitModel(assets.lime, { renderer, tint: '#f0a05c' }),
    bloodOrange: new FruitModel(assets.lime, { renderer, tint: '#e9681c' }),
  };

  return { slices, whole, mint: new MintLeafKit(renderer) };
}
