// Procedural canvas textures (no external image assets except the official logo).
import * as THREE from 'three';
import { rand } from './core.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, repeat = [1, 1]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}

function speckle(g, w, h, n, colors, rMin, rMax, alpha, seed) {
  const r = rand(seed);
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * (0.4 + 0.6 * r());
    g.fillStyle = colors[Math.floor(r() * colors.length)];
    const x = r() * w, y = r() * h, rad = rMin + r() * (rMax - rMin);
    g.beginPath();
    g.ellipse(x, y, rad, rad * (0.5 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

const cache = {};
const once = (k, f) => cache[k] || (cache[k] = f());

// red laterite ground of the Sahel, with pebbles
export const laterite = (repeat = [6, 6]) => once('lat' + repeat, () => {
  const [c, g] = canvas(1024, 1024);
  g.fillStyle = '#b8683f'; g.fillRect(0, 0, 1024, 1024);
  speckle(g, 1024, 1024, 900, ['#a95a35', '#c7794b', '#9c5030', '#cf8a5a'], 20, 90, 0.18, 3);
  speckle(g, 1024, 1024, 5000, ['#7d3f22', '#d9a074', '#8e4a2a', '#e2b089'], 1, 4, 0.55, 5);
  speckle(g, 1024, 1024, 300, ['#6e6258', '#8a7d70', '#d8cbb8'], 3, 8, 0.7, 9);
  return tex(c, repeat);
});

// banco (mud brick) plaster
export const banco = (repeat = [1, 1], tone = '#c48e5e') => once('banco' + repeat + tone, () => {
  const [c, g] = canvas(512, 512);
  g.fillStyle = tone; g.fillRect(0, 0, 512, 512);
  speckle(g, 512, 512, 500, ['#b07a4c', '#d3a274', '#a86f43', '#dcae80'], 10, 45, 0.25, 11);
  g.strokeStyle = 'rgba(90,50,25,0.13)'; g.lineWidth = 2;
  for (let y = 40; y < 512; y += 46) {
    g.beginPath(); g.moveTo(0, y + Math.sin(y) * 3); g.lineTo(512, y + Math.cos(y) * 3); g.stroke();
    for (let x = (y / 46) % 2 ? 0 : 50; x < 512; x += 100) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - 46); g.stroke();
    }
  }
  speckle(g, 512, 512, 2500, ['#8f5a33', '#e5bf95'], 0.8, 2.5, 0.5, 13);
  const grad = g.createLinearGradient(0, 380, 0, 512);
  grad.addColorStop(0, 'rgba(80,40,20,0)'); grad.addColorStop(1, 'rgba(80,40,20,0.35)');
  g.fillStyle = grad; g.fillRect(0, 380, 512, 132);
  return tex(c, repeat);
});

// light plaster for painted buildings (multiplied by the material colour)
export const plaster = (repeat = [1, 1]) => once('plaster' + repeat, () => {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 512, 512);
  speckle(g, 512, 512, 600, ['#e2e2e2', '#fafafa', '#dadada'], 8, 40, 0.3, 17);
  speckle(g, 512, 512, 2000, ['#cfcfcf', '#ffffff'], 0.8, 2, 0.5, 19);
  return tex(c, repeat);
});

// corrugated metal roofing
export const tin = (repeat = [1, 1]) => once('tin' + repeat, () => {
  const [c, g] = canvas(256, 256);
  for (let x = 0; x < 256; x++) {
    const v = 150 + 55 * Math.sin((x / 256) * Math.PI * 2 * 8);
    g.fillStyle = `rgb(${v},${v + 4},${v + 8})`; g.fillRect(x, 0, 1, 256);
  }
  speckle(g, 256, 256, 60, ['#8a5a3a', '#a0643c', '#6d4a33'], 4, 18, 0.35, 23);
  return tex(c, repeat);
});

// Faso Dan Fani: woven stripes
export const fasoDanFani = (colors, repeat = [2, 2], seed = 1) => once('fdf' + colors + repeat, () => {
  const [c, g] = canvas(256, 256);
  const r = rand(seed);
  let x = 0;
  while (x < 256) {
    const w = 4 + Math.floor(r() * 18);
    g.fillStyle = colors[Math.floor(r() * colors.length)];
    g.fillRect(x, 0, w, 256);
    x += w;
  }
  g.globalAlpha = 0.12; g.fillStyle = '#000';
  for (let y = 0; y < 256; y += 3) g.fillRect(0, y, 256, 1);
  g.globalAlpha = 1;
  return tex(c, repeat);
});

// wax-print style pagne
export const wax = (bg, fg, accent, repeat = [2, 2]) => once('wax' + bg + fg + repeat, () => {
  const [c, g] = canvas(256, 256);
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const cx = x * 64 + (y % 2) * 32 + 16, cy = y * 64 + 32;
    g.fillStyle = fg; g.beginPath(); g.arc(cx, cy, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = accent; g.beginPath(); g.arc(cx, cy, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
  }
  return tex(c, repeat);
});

// black body with white bands: the Aedes signature
export const aedesBands = (bands = 6, repeat = [1, 1]) => once('aedes' + bands + repeat, () => {
  const [c, g] = canvas(64, 256);
  g.fillStyle = '#141414'; g.fillRect(0, 0, 64, 256);
  g.fillStyle = '#f4f4f4';
  for (let i = 0; i < bands; i++) g.fillRect(0, (i + 0.5) * (256 / bands), 64, 256 / bands * 0.32);
  return tex(c, repeat);
});

export function skyGradient(stops) {
  const [c, g] = canvas(16, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad; g.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const tiles = (repeat = [6, 6]) => once('tiles' + repeat, () => {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#d9d4c7'; g.fillRect(0, 0, 256, 256);
  speckle(g, 256, 256, 400, ['#cfc9bb', '#e4e0d5'], 2, 10, 0.4, 29);
  g.strokeStyle = '#b5ad9c'; g.lineWidth = 4;
  g.strokeRect(0, 0, 128, 128); g.strokeRect(128, 0, 128, 128); g.strokeRect(0, 128, 128, 128); g.strokeRect(128, 128, 128, 128);
  return tex(c, repeat);
});

export const wood = (repeat = [1, 1], tone = '#8a5a35') => once('wood' + repeat + tone, () => {
  const [c, g] = canvas(256, 256);
  g.fillStyle = tone; g.fillRect(0, 0, 256, 256);
  const r = rand(31);
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = `rgba(40,20,5,${0.05 + r() * 0.12})`; g.lineWidth = 1 + r() * 2;
    const y = r() * 256; g.beginPath(); g.moveTo(0, y);
    g.bezierCurveTo(80, y + (r() - 0.5) * 12, 170, y + (r() - 0.5) * 12, 256, y); g.stroke();
  }
  return tex(c, repeat);
});

// health centre sign board (generic, no protected emblem: green cross)
export const healthSign = () => once('sign', () => {
  const [c, g] = canvas(1280, 320);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 1280, 320);
  g.fillStyle = '#0da255'; g.fillRect(0, 0, 1280, 22); g.fillRect(0, 298, 1280, 22);
  g.fillRect(70, 135, 150, 50); g.fillRect(120, 85, 50, 150);
  g.fillStyle = '#1b1b1b'; g.textBaseline = 'middle';
  let size = 120;
  do { g.font = `800 ${size}px Montserrat`; size -= 2; } while (g.measureText('CENTRE DE SANTÉ').width > 1280 - 270 - 50);
  g.fillText('CENTRE DE SANTÉ', 270, 166);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
});

// The doctor's badge carries the untouched official logo (scaled, never redrawn).
export function badge(logoImg) {
  return once('badge', () => {
    const [c, g] = canvas(256, 320);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.roundRect(0, 0, 256, 320, 26); g.fill();
    g.strokeStyle = '#0da255'; g.lineWidth = 10;
    g.beginPath(); g.roundRect(5, 5, 246, 310, 22); g.stroke();
    g.drawImage(logoImg, 18, 18, 220, 220);
    g.fillStyle = '#e81e27'; g.fillRect(20, 252, 216, 50);
    g.fillStyle = '#ffffff'; g.font = '800 34px Montserrat'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('DOCTEUR', 128, 279);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  });
}
