// Extra flat pictograms (viewBox 140x140) for the motion-design version.
const R = '#e81e27', G = '#0da255', K = '#1f2a2e', S = '#7a4a30', SD = '#653b25';
const svg = (b) => `<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">${b}</svg>`;
const face = (extra = '') => `<circle cx="70" cy="74" r="44" fill="${S}"/><path d="M28,66 C26,30 114,30 112,66 C100,46 40,46 28,66 Z" fill="#1b1310"/>${extra}`;

export const ICO = {
  fever: svg(`<rect x="58" y="14" width="24" height="84" rx="12" fill="#fff" stroke="${K}" stroke-width="5"/>
    <rect x="64" y="40" width="12" height="60" rx="6" fill="${R}"/><circle cx="70" cy="106" r="20" fill="${R}" stroke="${K}" stroke-width="5"/>
    <path d="M100,30 q10,10 0,20 q-10,10 0,20 M114,40 q8,8 0,16" fill="none" stroke="#ff8a3d" stroke-width="5" stroke-linecap="round"/>`),
  head: svg(face(`<ellipse cx="54" cy="78" rx="6" ry="4" fill="#1b1310"/><ellipse cx="86" cy="78" rx="6" ry="4" fill="#1b1310"/>
    <path d="M56,100 Q70,92 84,100" fill="none" stroke="#3a1a14" stroke-width="5" stroke-linecap="round"/>
    <path d="M14,30 l10,10 M10,52 l14,2 M126,30 l-10,10 M130,52 l-14,2 M70,6 l0,14" stroke="${R}" stroke-width="6" stroke-linecap="round"/>`)),
  joint: svg(`<path d="M30,120 L56,70 L96,40" fill="none" stroke="${S}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="56" cy="70" r="20" fill="${R}" opacity=".85"/><path d="M56,40 l0,-14 M80,58 l12,-8 M30,58 l-12,-8" stroke="${R}" stroke-width="6" stroke-linecap="round"/>`),
  nausea: svg(face(`<path d="M48,76 l12,4 M92,76 l-12,4" stroke="#1b1310" stroke-width="5" stroke-linecap="round"/>
    <path d="M54,100 q8,-8 16,0 q8,8 16,0" fill="none" stroke="#3a1a14" stroke-width="5" stroke-linecap="round"/>
    <circle cx="70" cy="74" r="44" fill="#8bbf3f" opacity=".22"/>`)),
  rash: svg(`<path d="M10,96 C40,60 90,40 130,44 L130,100 C90,100 50,110 10,124 Z" fill="${S}"/>
    ${[[50, 86], [70, 74], [90, 70], [108, 62], [62, 98], [84, 90], [104, 84], [40, 104]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${R}" opacity=".85"/>`).join('')}`),
  pills: svg(`<rect x="34" y="40" width="72" height="84" rx="12" fill="#fff" stroke="${K}" stroke-width="5"/><rect x="40" y="20" width="60" height="24" rx="6" fill="${R}"/>
    <rect x="48" y="66" width="44" height="30" rx="6" fill="#e7f6ee"/><path d="M70,70 v22 M59,81 h22" stroke="${G}" stroke-width="6"/>
    <circle cx="70" cy="70" r="62" fill="none" stroke="${R}" stroke-width="10"/><line x1="26" y1="26" x2="114" y2="114" stroke="${R}" stroke-width="10" stroke-linecap="round"/>`),
  shirt: svg(`<path d="M44,22 L20,40 L8,96 L28,100 L38,60 L38,124 L102,124 L102,60 L112,100 L132,96 L120,40 L96,22 C90,34 50,34 44,22 Z" fill="${G}"/>
    <path d="M44,22 C50,34 90,34 96,22" fill="none" stroke="#087a3f" stroke-width="5"/>`),
  spray: svg(`<rect x="44" y="50" width="52" height="76" rx="12" fill="${G}"/><rect x="54" y="30" width="32" height="22" rx="4" fill="#cfd8dc"/>
    <rect x="58" y="16" width="30" height="16" rx="4" fill="${K}"/><path d="M96,22 l18,-8 M96,26 l22,2 M96,30 l18,10" stroke="#8fc7e8" stroke-width="5" stroke-linecap="round"/>
    <rect x="52" y="72" width="36" height="30" rx="6" fill="#fff"/>`),
  net: svg(`<path d="M70,10 L24,118 L116,118 Z" fill="#e8f3f8" stroke="#9fc3d6" stroke-width="4"/>
    ${[40, 55, 70, 85, 100].map((x) => `<line x1="70" y1="10" x2="${x * 0.92 + 5}" y2="118" stroke="#9fc3d6" stroke-width="2"/>`).join('')}
    <rect x="16" y="112" width="108" height="16" rx="6" fill="#7a4d2b"/>`),
  hospital: svg(`<rect x="20" y="40" width="100" height="84" rx="8" fill="#fff" stroke="${K}" stroke-width="5"/><rect x="58" y="88" width="24" height="36" fill="${G}"/>
    <rect x="56" y="50" width="28" height="10" fill="${G}"/><rect x="65" y="41" width="10" height="28" fill="${G}"/>`),
  shield: svg(`<path d="M70,10 L118,28 C118,80 98,112 70,128 C42,112 22,80 22,28 Z" fill="${G}"/><path d="M46,70 L64,88 L96,52" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`),
  family: svg(`${[[38, 60, 24], [102, 60, 24], [70, 82, 18]].map(([x, y, r]) => `<circle cx="${x}" cy="${y - 26}" r="${r * 0.7}" fill="${S}"/><path d="M${x - r},${y + 50} L${x - r},${y + 10} C${x - r},${y - 8} ${x + r},${y - 8} ${x + r},${y + 10} L${x + r},${y + 50} Z" fill="${G}"/>`).join('')}`),
  rain: svg(`<path d="M28,70 C10,70 10,44 30,42 C32,20 62,14 74,32 C86,18 116,26 112,50 C128,54 126,74 110,74 Z" fill="#9fb3c0"/>
    ${[[40, 88], [64, 96], [88, 88], [52, 112], [78, 116]].map(([x, y]) => `<line x1="${x}" y1="${y}" x2="${x - 6}" y2="${y + 14}" stroke="#2f7fd8" stroke-width="6" stroke-linecap="round"/>`).join('')}`),
  drop: svg(`<path d="M70,14 C70,14 32,62 32,88 a38,38 0 0 0 76,0 C108,62 70,14 70,14 Z" fill="#4aa8ee"/><path d="M52,90 a18,18 0 0 0 14,18" fill="none" stroke="#bfe5ff" stroke-width="7" stroke-linecap="round"/>`),
};
