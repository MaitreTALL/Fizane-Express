import { Timeline } from '../core.js';
import { Overlay } from '../overlay.js';
import { createDoctor } from './doctor.js';
import { buildScenes } from './scenes.js';

const fonts = ['900 20px Montserrat', '800 20px Montserrat', '900 20px Nunito', '800 20px Nunito', '700 20px Nunito'];
await Promise.all(fonts.map((f) => document.fonts.load(f, 'ÉéèàçÀ')));
const tl = new Timeline(await (await fetch('/src/timeline.json')).json());
const vis = await (await fetch('/src/visemes.json')).json();
const logo = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = '/src/logo-sos-medecins-bf.jpg'; });
const svg = document.getElementById('art');
const defs = document.getElementById('defs');
const ui = new Overlay(document.getElementById('ui'), tl, logo);

const doctor = createDoctor(svg, defs, '/src/logo-sos-medecins-bf.jpg');
doctor.setVisemes(vis);
const scenes = buildScenes({ tl, ui, svg, defs, doctor });
const endT = scenes[scenes.length - 1].endT;

let current = null;
window.renderAt = (t) => {
  const s = scenes.find((x) => t >= x.start && t < x.end) || scenes[scenes.length - 1];
  if (s !== current) {
    for (const x of scenes) { x.bg.style.display = x === s ? '' : 'none'; x.art.style.display = x === s ? '' : 'none'; }
    current = s;
  }
  const st = s.update(t);
  doctor.update({ t, ...st });
  ui.update(t);
  ui.subEl.style.top = t >= endT ? '1620px' : '';
};
window.__fps = vis.fps;
window.__duration = tl.data.duration;
window.__cues = ui.cues;
window.renderAt(0);
window.__ready = true;
