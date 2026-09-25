import * as THREE from 'three';

// Todas las texturas se dibujan con canvas: no hace falta cargar imágenes externas.

const DISPLAY = '"Anton", Impact, sans-serif';
const BODY = '"Space Grotesk", Arial, sans-serif';

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d')];
}

function toTexture(canvas, renderer) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (renderer) texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

// Reduce el tamaño de letra hasta que el texto quepa en maxWidth
function fitFont(g, text, weight, family, maxWidth, maxSize) {
  g.font = `${weight} ${maxSize}px ${family}`;
  const width = g.measureText(text).width;
  if (width > maxWidth) g.font = `${weight} ${Math.floor((maxSize * maxWidth) / width)}px ${family}`;
}

// Repite un texto a lo ancho sin que se note la costura al dar la vuelta a la lata
function repeatText(g, text, y, width) {
  const w = g.measureText(text).width;
  const n = Math.max(1, Math.round(width / w));
  g.save();
  g.scale(width / (n * w), 1);
  for (let i = 0; i < n; i++) g.fillText(text, i * w, y);
  g.restore();
}

function spiral(g, cx, cy, radius, turns, lineWidth) {
  const steps = 240;
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2;
    const x = cx + Math.cos(angle) * t * radius;
    const y = cy + Math.sin(angle) * t * radius;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.lineWidth = lineWidth;
  g.lineCap = 'round';
  g.stroke();
}

// Rodaja de cítrico vista de frente: piel, parte blanca y gajos
export function drawCitrus(g, cx, cy, r, palette, { segments = 10, detail = true } = {}) {
  g.save();
  g.fillStyle = palette.peel;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = palette.pith;
  g.beginPath();
  g.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
  g.fill();

  const gap = 0.045;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2 + gap;
    const a1 = ((i + 1) / segments) * Math.PI * 2 - gap;

    const pulp = g.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 0.84);
    pulp.addColorStop(0, palette.pulp);
    pulp.addColorStop(1, palette.pulpDeep);
    g.fillStyle = pulp;
    g.beginPath();
    g.arc(cx, cy, r * 0.84, a0, a1);
    g.arc(cx, cy, r * 0.13, a1, a0, true);
    g.closePath();
    g.fill();

    if (detail) {
      // Vesículas de zumo dentro del gajo
      g.save();
      g.clip();
      g.fillStyle = 'rgba(255, 255, 255, 0.28)';
      for (let k = 0; k < 40; k++) {
        const a = a0 + Math.random() * (a1 - a0);
        const rr = r * (0.18 + Math.random() * 0.64);
        g.beginPath();
        g.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, r * 0.04, r * 0.012, a, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
  }

  g.fillStyle = palette.pith;
  g.beginPath();
  g.arc(cx, cy, r * 0.1, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// Una "cara" de la etiqueta: logotipo vertical y columna de información
function drawFace(g, flavor, cx, top, bottom) {
  g.save();
  g.translate(cx - 150, (top + bottom) / 2);
  g.rotate(-Math.PI / 2);
  g.transform(1, 0, -0.16, 1, 0, 0);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  fitFont(g, 'VÉRTIGO', 400, DISPLAY, bottom - top - 90, 340);
  g.fillStyle = flavor.deep;
  g.fillText('VÉRTIGO', 8, 10);
  g.fillStyle = flavor.ink;
  g.fillText('VÉRTIGO', 0, 0);
  g.restore();

  const x0 = cx + 10;
  const colWidth = 400;
  g.fillStyle = flavor.ink;
  g.strokeStyle = flavor.ink;
  spiral(g, x0 + 90, 230, 80, 3, 11);

  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  fitFont(g, flavor.name.toUpperCase(), 400, DISPLAY, colWidth, 130);
  g.fillText(flavor.name.toUpperCase(), x0, 480);
  g.font = `700 38px ${BODY}`;
  g.fillText('ENERGÍA CÍTRICA', x0, 540);
  g.fillRect(x0, 572, colWidth, 6);
  g.font = `500 30px ${BODY}`;
  ['80 MG CAFEÍNA NATURAL', '0% AZÚCAR AÑADIDO', 'ZUMO REAL DE CÍTRICOS'].forEach((line, i) =>
    g.fillText(line, x0, 632 + i * 46),
  );

  // Sello de 250 ml y rodaja del sabor
  g.beginPath();
  g.arc(x0 + 80, 930, 78, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = flavor.color;
  g.textAlign = 'center';
  g.font = `400 62px ${DISPLAY}`;
  g.fillText('250', x0 + 80, 935);
  g.font = `700 26px ${BODY}`;
  g.fillText('ML', x0 + 80, 972);
  drawCitrus(g, x0 + 280, 930, 82, flavor.slice, { detail: false });
}

// Etiqueta completa de la lata (se envuelve alrededor del cilindro)
export function labelTexture(flavor, renderer) {
  const W = 2048;
  const H = 1344;
  const [canvas, g] = createCanvas(W, H);

  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, flavor.color);
  bg.addColorStop(1, flavor.deep);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  // Franjas diagonales de "velocidad"
  const period = W / 22;
  g.save();
  g.globalAlpha = 0.09;
  g.fillStyle = flavor.ink;
  for (let x = -H; x < W + H; x += period) {
    g.beginPath();
    g.moveTo(x, H);
    g.lineTo(x + period * 0.36, H);
    g.lineTo(x + period * 0.36 + H * 0.45, 0);
    g.lineTo(x + H * 0.45, 0);
    g.closePath();
    g.fill();
  }
  g.restore();

  const top = 64;
  const bottom = H - 116;
  g.fillStyle = flavor.ink;
  g.fillRect(0, 0, W, top);
  g.fillRect(0, bottom, W, H - bottom);

  g.fillStyle = flavor.color;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.font = `700 30px ${BODY}`;
  repeatText(g, 'ENERGÍA CÍTRICA   •   250 ML   •   EXPRIMIDO EN FRÍO   •   ', top / 2 + 1, W);
  g.font = `400 62px ${DISPLAY}`;
  repeatText(g, 'VÉRTIGO ENERGY  —  ', (bottom + H) / 2 + 2, W);

  for (const cx of [W * 0.25, W * 0.75]) drawFace(g, flavor, cx, top, bottom);

  return toTexture(canvas, renderer);
}

export function citrusTexture(palette, renderer) {
  const [canvas, g] = createCanvas(512, 512);
  drawCitrus(g, 256, 256, 256, palette);
  return toTexture(canvas, renderer);
}

// Texturas de datos (relieve, rugosidad): no llevan espacio de color
function toDataTexture(canvas, renderer) {
  const texture = new THREE.CanvasTexture(canvas);
  if (renderer) texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

// Gotas de condensación sobre la etiqueta: un mapa de relieve (bump) y uno de rugosidad.
// En la rugosidad, las gotas son casi negras: el agua es lisa y brilla más que la pintura.
export function condensationTextures(renderer, labelRoughness = 0.32) {
  const W = 1024;
  const H = 672;
  const [bumpCanvas, bump] = createCanvas(W, H);
  const [roughCanvas, rough] = createCanvas(W, H);

  bump.fillStyle = '#000';
  bump.fillRect(0, 0, W, H);
  const base = Math.round(labelRoughness * 255);
  rough.fillStyle = `rgb(${base}, ${base}, ${base})`;
  rough.fillRect(0, 0, W, H);

  const drop = (x, y, rx, ry) => {
    // Se dibuja también desplazada un ancho a cada lado para que no haya costura al envolver la lata
    for (const offset of [-W, 0, W]) {
      const cx = x + offset;
      if (cx + rx < 0 || cx - rx > W) continue;

      bump.save();
      bump.translate(cx, y);
      bump.scale(1, ry / rx);
      const dome = bump.createRadialGradient(0, 0, 0, 0, 0, rx);
      dome.addColorStop(0, 'rgba(255, 255, 255, 1)');
      dome.addColorStop(0.65, 'rgba(190, 190, 190, 1)');
      dome.addColorStop(1, 'rgba(0, 0, 0, 0)');
      bump.fillStyle = dome;
      bump.beginPath();
      bump.arc(0, 0, rx, 0, Math.PI * 2);
      bump.fill();
      bump.restore();

      rough.save();
      rough.translate(cx, y);
      rough.scale(1, ry / rx);
      rough.fillStyle = 'rgb(14, 14, 14)';
      rough.beginPath();
      rough.arc(0, 0, rx * 0.85, 0, Math.PI * 2);
      rough.fill();
      rough.restore();
    }
  };

  const randomDrop = (minR, maxR) => {
    const r = minR + Math.random() * (maxR - minR);
    drop(Math.random() * W, Math.random() * H, r, r * (1 + Math.random() * 0.35));
  };

  for (let i = 0; i < 1400; i++) randomDrop(0.8, 2.2); // vaho fino
  for (let i = 0; i < 380; i++) randomDrop(2.5, 5);
  for (let i = 0; i < 70; i++) randomDrop(5, 9);

  // Algunas gotas grandes que han resbalado dejando un rastro
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * W;
    const y = H * (0.3 + Math.random() * 0.65);
    const r = 5 + Math.random() * 4;
    const trail = 40 + Math.random() * 140;
    for (let k = 0; k < trail; k += 3) drop(x + Math.sin(k * 0.05) * 1.5, y - k, r * 0.35, r * 0.5);
    drop(x, y, r, r * 1.3);
  }

  return {
    bump: toDataTexture(bumpCanvas, renderer),
    roughness: toDataTexture(roughCanvas, renderer),
  };
}

// Aluminio torneado: anillos finos de distinta rugosidad a lo largo del perfil de la tapa y la base
export function brushedTexture(renderer) {
  const [canvas, g] = createCanvas(8, 512);
  for (let y = 0; y < 512; y++) {
    const v = Math.round((0.16 + Math.random() * 0.16) * 255);
    g.fillStyle = `rgb(${v}, ${v}, ${v})`;
    g.fillRect(0, y, 8, 1);
  }
  return toDataTexture(canvas, renderer);
}

export function glowTexture() {
  const [canvas, g] = createCanvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.35)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return toTexture(canvas);
}
