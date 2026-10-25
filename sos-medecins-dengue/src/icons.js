// Flat-shaded SVG pictograms (viewBox 140x140), logo palette.
const R = '#e81e27', G = '#0da255', K = '#232021';

const svg = (body) => `<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const ban = `<circle cx="70" cy="70" r="58" fill="none" stroke="${R}" stroke-width="12"/><line x1="29" y1="29" x2="111" y2="111" stroke="${R}" stroke-width="12" stroke-linecap="round"/>`;

export const ICONS = {
  abdo: svg(`<path d="M44 22 C40 50 38 70 42 118 L98 118 C102 70 100 50 96 22" fill="#f6d2bd" stroke="${K}" stroke-width="5"/>
    <path d="M58 40 Q70 46 82 40" fill="none" stroke="${K}" stroke-width="4" stroke-linecap="round"/>
    <g transform="translate(70 80)"><path d="M0 -26 L7 -9 L25 -12 L12 2 L22 18 L4 11 L-6 27 L-8 9 L-26 6 L-12 -5 L-20 -22 L-4 -12 Z" fill="${R}"/></g>`),
  vomit: svg(`<circle cx="62" cy="58" r="38" fill="#f6d2bd" stroke="${K}" stroke-width="5"/>
    <path d="M44 50 l10 4 M72 54 l10 -4" stroke="${K}" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="66" cy="76" rx="10" ry="7" fill="${K}"/>
    <path d="M72 88 q4 14 -2 22 q-6 8 2 16" fill="none" stroke="#8bbf3f" stroke-width="7" stroke-linecap="round"/>
    <circle cx="92" cy="104" r="6" fill="#8bbf3f"/><circle cx="56" cy="116" r="5" fill="#8bbf3f"/>`),
  bleed: svg(`<path d="M70 16 C70 16 34 62 34 86 a36 36 0 0 0 72 0 C106 62 70 16 70 16 Z" fill="${R}"/>
    <path d="M52 86 a18 18 0 0 0 14 18" fill="none" stroke="#ffb3b3" stroke-width="7" stroke-linecap="round"/>`),
  weak: svg(`<rect x="18" y="44" width="92" height="52" rx="10" fill="#fff" stroke="${K}" stroke-width="7"/><rect x="110" y="58" width="12" height="24" rx="4" fill="${K}"/>
    <rect x="28" y="54" width="18" height="32" rx="4" fill="${R}"/>
    <text x="70" y="36" font-family="Oswald" font-weight="700" font-size="26" fill="${K}">z z</text>`),
  breath: svg(`<path d="M66 24 v40 M74 24 v40" stroke="${K}" stroke-width="6" stroke-linecap="round"/>
    <path d="M62 52 C40 40 24 70 26 102 C28 118 48 120 60 110 C64 96 64 72 62 52 Z" fill="#f5a3a3" stroke="${K}" stroke-width="5"/>
    <path d="M78 52 C100 40 116 70 114 102 C112 118 92 120 80 110 C76 96 76 72 78 52 Z" fill="#f5a3a3" stroke="${K}" stroke-width="5"/>
    <path d="M100 18 l8 -8 M110 30 l10 -2 M104 26 l6 0" stroke="${R}" stroke-width="5" stroke-linecap="round"/>`),
  aspirin: svg(`<circle cx="56" cy="62" r="24" fill="#ffffff" stroke="#b9c2c8" stroke-width="4"/><line x1="56" y1="40" x2="56" y2="84" stroke="#b9c2c8" stroke-width="4"/>
    <circle cx="86" cy="84" r="22" fill="#f4f4f4" stroke="#b9c2c8" stroke-width="4"/><line x1="66" y1="84" x2="106" y2="84" stroke="#b9c2c8" stroke-width="4"/>${ban}`),
  ibuprofen: svg(`<g transform="rotate(-35 70 70)"><rect x="34" y="52" width="72" height="34" rx="17" fill="#ffffff" stroke="#b9c2c8" stroke-width="4"/>
    <path d="M70 52 h19 a17 17 0 0 1 0 34 h-19 z" fill="#3f7fd8"/></g>
    <ellipse cx="88" cy="98" rx="18" ry="11" fill="#ffffff" stroke="#b9c2c8" stroke-width="4"/>${ban}`),
  water: svg(`<path d="M38 22 L102 22 L94 120 Q93 126 86 126 L54 126 Q47 126 46 120 Z" fill="#e8f5ff" stroke="#7fb4d9" stroke-width="5"/>
    <path d="M44 56 L96 56 L91 118 Q90 121 86 121 L54 121 Q50 121 49 118 Z" fill="#4aa8ee"/>
    <path d="M52 64 q-2 22 2 46" stroke="#bfe5ff" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M114 30 c0 0 -10 12 -10 18 a10 10 0 0 0 20 0 c0 -6 -10 -18 -10 -18z" fill="#4aa8ee"/>`),
  staff: svg(`<circle cx="70" cy="56" r="26" fill="#7a4a2e"/>
    <path d="M42 46 Q70 14 98 46 L98 40 Q70 8 42 40 Z" fill="#fff" stroke="#cfd6db" stroke-width="3"/>
    <rect x="64" y="22" width="12" height="20" fill="${G}"/><rect x="60" y="26" width="20" height="12" fill="${G}"/>
    <path d="M26 128 Q30 92 70 88 Q110 92 114 128 Z" fill="#fff" stroke="#cfd6db" stroke-width="4"/>
    <path d="M56 92 q-6 22 10 26 q14 -2 12 -18" fill="none" stroke="${K}" stroke-width="4"/><circle cx="78" cy="100" r="6" fill="#9aa4ab"/>
    <path d="M62 92 L70 108 L78 92" fill="${G}"/>`),
  sun: svg(`<circle cx="70" cy="70" r="28" fill="#ffc21a"/>${Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return `<line x1="${70 + Math.cos(a) * 40}" y1="${70 + Math.sin(a) * 40}" x2="${70 + Math.cos(a) * 56}" y2="${70 + Math.sin(a) * 56}" stroke="#ffc21a" stroke-width="9" stroke-linecap="round"/>`;
  }).join('')}`),
  alert: svg(`<path d="M70 14 L130 120 L10 120 Z" fill="${R}" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
    <rect x="63" y="50" width="14" height="40" rx="6" fill="#fff"/><circle cx="70" cy="104" r="8" fill="#fff"/>`),
  check: svg(`<circle cx="70" cy="70" r="60" fill="${G}" stroke="#fff" stroke-width="8"/><path d="M40 72 L62 94 L102 50" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`),
};

// red/green swooshes for the end card
export const SWOOSH_TOP = `<svg class="sw" style="top:0" viewBox="0 0 1080 520" preserveAspectRatio="none">
  <path d="M0 0 H1080 V180 C820 300 420 120 0 300 Z" fill="#e81e27"/>
  <path d="M0 300 C420 120 820 300 1080 180 V230 C820 350 420 170 0 350 Z" fill="#0da255"/>
  <path d="M0 0 H1080 V120 C820 230 420 60 0 230 Z" fill="#ffffff" opacity=".22"/></svg>`;
export const SWOOSH_BOTTOM = `<svg class="sw" style="bottom:0" viewBox="0 0 1080 560" preserveAspectRatio="none">
  <path d="M0 260 C380 120 760 330 1080 200 V560 H0 Z" fill="#0da255"/>
  <path d="M0 330 C380 190 760 400 1080 270 V320 C760 450 380 240 0 380 Z" fill="#ffffff" opacity=".85"/>
  <path d="M0 400 C380 260 760 470 1080 340 V560 H0 Z" fill="#e81e27"/></svg>`;
