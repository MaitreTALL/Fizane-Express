"""Illustrations du rayon « Électroménager & électronique » de Tondraaga (SVG, couleurs du logo).
Usage : python3 tools/electro_illustrations.py <dossier de sortie>"""
import os
import sys

B, BR, O, OL, C, C2, W, G, G2, NUIT = '#3B281F', '#4D3529', '#C87817', '#F2B661', '#F7EBDB', '#EAD7BE', '#FFFFFF', '#DDD6CE', '#B9AFA6', '#2B1D16'
T = f'stroke="{B}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"'

PARTS = {
    'moto': f'''
<g {T}>
<circle cx="44" cy="110" r="17" fill="{B}"/><circle cx="118" cy="110" r="17" fill="{B}"/>
</g>
<circle cx="44" cy="110" r="8" fill="{G}"/><circle cx="118" cy="110" r="8" fill="{G}"/>
<circle cx="44" cy="110" r="3" fill="{B}"/><circle cx="118" cy="110" r="3" fill="{B}"/>
<path d="M118 110 L111 74" stroke="{B}" stroke-width="5" stroke-linecap="round"/>
<path d="M22 100 C22 82 38 72 58 73 L86 75 C91 76 92 81 89 85 L80 100 Z" fill="{O}" {T}/>
<path d="M72 101 H104" stroke="{B}" stroke-width="7" stroke-linecap="round"/>
<path d="M98 104 L106 66 C107 59 114 56 118 60 L122 66 L112 104 Z" fill="{O}" {T}/>
<path d="M36 72 C44 61 70 60 84 66 L82 75 L38 77 Z" fill="{BR}" {T}/>
<path d="M103 52 L127 47" stroke="{B}" stroke-width="5" stroke-linecap="round"/>
<path d="M112 52 L114 60" stroke="{B}" stroke-width="4" stroke-linecap="round"/>
<circle cx="121" cy="66" r="5" fill="{OL}" stroke="{B}" stroke-width="2.5"/>
<path d="M50 80 L43 91 H49 L46 98 L55 86 H49 Z" fill="{OL}"/>
<path d="M8 84 H20 M4 92 H18 M10 100 H20" stroke="{O}" stroke-width="3" stroke-linecap="round"/>''',
    'mixeur': f'''
<path d="M106 52 C124 52 126 62 121 86 L101 88" fill="none" stroke="{B}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M53 44 H107 L99 108 H61 Z" fill="{W}" {T}/>
<path d="M57.5 70 C66 66 74 74 82 70 C90 66 96 72 102.5 70 L99 108 H61 Z" fill="{O}"/>
<circle cx="72" cy="88" r="4" fill="{OL}"/><circle cx="86" cy="96" r="3" fill="{OL}"/><circle cx="90" cy="82" r="3.5" fill="{OL}"/>
<path d="M53 44 H107 L99 108 H61 Z" fill="none" {T}/>
<path d="M63 52 L60 74" stroke="{G}" stroke-width="3" stroke-linecap="round"/>
<path d="M72 104 H88" stroke="{B}" stroke-width="3" stroke-linecap="round"/>
<rect x="49" y="34" width="62" height="12" rx="4" fill="{BR}" {T}/>
<rect x="72" y="25" width="16" height="10" rx="3" fill="{BR}" {T}/>
<path d="M50 108 H110 L104 134 H56 Z" fill="{BR}" {T}/>
<circle cx="70" cy="121" r="3.5" fill="{OL}"/><circle cx="80" cy="121" r="3.5" fill="{OL}"/><circle cx="90" cy="121" r="3.5" fill="{W}"/>''',
    'moulin': f'''
<path d="M42 100 L38 132 M118 100 L122 132" stroke="{B}" stroke-width="5" stroke-linecap="round"/>
<rect x="34" y="94" width="92" height="10" rx="3" fill="{BR}" {T}/>
<rect x="88" y="64" width="38" height="28" rx="8" fill="{BR}" {T}/>
<path d="M96 70 V86 M103 70 V86 M110 70 V86" stroke="{G2}" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="126" cy="78" r="6" fill="{G}" {T}/>
<rect x="50" y="62" width="40" height="32" rx="6" fill="{O}" {T}/>
<path d="M40 24 H100 L84 62 H56 Z" fill="{G}" {T}/>
<ellipse cx="70" cy="30" rx="26" ry="5" fill="{OL}"/>
<circle cx="58" cy="29" r="2" fill="{O}"/><circle cx="68" cy="31" r="2" fill="{O}"/><circle cx="80" cy="28" r="2" fill="{O}"/><circle cx="88" cy="31" r="2" fill="{O}"/>
<path d="M54 84 L40 96 L46 102 L60 90 Z" fill="{G}" {T}/>
<circle cx="70" cy="78" r="6" fill="{OL}" {T}/>
<path d="M22 112 H66 C64 126 54 132 44 132 C34 132 24 126 22 112 Z" fill="{BR}" {T}/>
<path d="M28 112 C32 102 40 98 44 98 C48 98 56 102 60 112 Z" fill="{W}" {T}/>
<circle cx="40" cy="104" r="1.6" fill="{W}"/><circle cx="36" cy="100" r="1.4" fill="{W}"/>''',
    'popcorn': f'''
<path d="M38 30 H122 L114 44 H46 Z" fill="{BR}" {T}/>
<rect x="46" y="44" width="68" height="12" fill="{O}" {T}/>
<circle cx="62" cy="50" r="2" fill="{W}"/><circle cx="80" cy="50" r="2" fill="{W}"/><circle cx="98" cy="50" r="2" fill="{W}"/>
<rect x="46" y="56" width="68" height="50" fill="#FFF6E9" {T}/>
<path d="M68 60 H92 V68 C92 72 89 74 86 74 H74 C71 74 68 72 68 68 Z" fill="{G}" stroke="{B}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M80 56 V60" stroke="{B}" stroke-width="2.5"/>
<g fill="{W}" stroke="{OL}" stroke-width="2">
<circle cx="56" cy="100" r="5"/><circle cx="64" cy="98" r="5"/><circle cx="72" cy="100" r="5"/><circle cx="80" cy="97" r="5"/><circle cx="88" cy="100" r="5"/><circle cx="96" cy="98" r="5"/><circle cx="104" cy="100" r="5"/>
<circle cx="60" cy="91" r="5"/><circle cx="69" cy="90" r="5"/><circle cx="78" cy="89" r="5"/><circle cx="87" cy="90" r="5"/><circle cx="96" cy="91" r="5"/><circle cx="74" cy="82" r="4.5"/><circle cx="84" cy="82" r="4.5"/>
<circle cx="76" cy="78" r="3"/><circle cx="90" cy="76" r="3"/>
</g>
<rect x="46" y="56" width="68" height="50" fill="none" {T}/>
<path d="M80 56 V106" stroke="{B}" stroke-width="2" opacity=".35"/>
<rect x="44" y="106" width="72" height="20" rx="3" fill="{BR}" {T}/>
<rect x="56" y="111" width="22" height="10" rx="2" fill="none" stroke="{OL}" stroke-width="2"/>
<circle cx="56" cy="130" r="6" fill="{B}"/><circle cx="104" cy="130" r="6" fill="{B}"/>
<g fill="{W}" stroke="{OL}" stroke-width="2"><circle cx="30" cy="40" r="4"/><circle cx="35" cy="36" r="3.5"/><circle cx="132" cy="62" r="4"/><circle cx="127" cy="58" r="3"/></g>''',
    'frigo': f'''
<rect x="30" y="24" width="58" height="106" rx="8" fill="{W}" {T}/>
<path d="M30 62 H88" stroke="{B}" stroke-width="3"/>
<rect x="76" y="34" width="5" height="18" rx="2.5" fill="{G2}"/><rect x="76" y="72" width="5" height="24" rx="2.5" fill="{G2}"/>
<rect x="40" y="72" width="18" height="9" rx="2" fill="{OL}" stroke="{B}" stroke-width="2"/>
<path d="M38 30 V44" stroke="{G}" stroke-width="3" stroke-linecap="round"/>
<path d="M36 130 V134 M82 130 V134" stroke="{B}" stroke-width="4" stroke-linecap="round"/>
<g stroke="{O}" stroke-width="2.5" stroke-linecap="round"><path d="M50 40 V52 M44 46 H56 M45.8 41.8 L54.2 50.2 M54.2 41.8 L45.8 50.2"/></g>''',
    'ventilo': f'''
<ellipse cx="120" cy="130" rx="16" ry="5" fill="{BR}" {T}/>
<path d="M120 128 V96" stroke="{B}" stroke-width="5" stroke-linecap="round"/>
<circle cx="120" cy="76" r="23" fill="#FFF6E9" {T}/>
<g fill="{O}" stroke="{B}" stroke-width="2"><ellipse cx="120" cy="64" rx="6" ry="11"/><ellipse cx="120" cy="64" rx="6" ry="11" transform="rotate(120 120 76)"/><ellipse cx="120" cy="64" rx="6" ry="11" transform="rotate(240 120 76)"/></g>
<circle cx="120" cy="76" r="5" fill="{BR}" stroke="{B}" stroke-width="2"/>''',
    'bouilloire': f'''
<path d="M48 62 C48 38 74 38 74 62" fill="none" stroke="{B}" stroke-width="6" stroke-linecap="round"/>
<path d="M42 72 L26 60 L29 55 L45 64 Z" fill="{O}" {T}/>
<path d="M38 120 L43 70 C44 60 79 60 80 70 L85 120 Z" fill="{O}" {T}/>
<ellipse cx="61" cy="66" rx="16" ry="4" fill="{BR}" stroke="{B}" stroke-width="2.5"/>
<path d="M74 80 V108" stroke="{OL}" stroke-width="4" stroke-linecap="round"/>
<rect x="33" y="118" width="56" height="10" rx="4" fill="{BR}" {T}/>
<path d="M22 50 C16 44 24 40 18 34 M30 46 C24 40 32 36 26 30" fill="none" stroke="{G2}" stroke-width="2.5" stroke-linecap="round"/>''',
    'fer': f'''
<path d="M104 92 C106 78 128 78 134 92" fill="none" stroke="{B}" stroke-width="6" stroke-linecap="round"/>
<path d="M92 120 C92 102 104 92 134 92 L142 120 Z" fill="{W}" {T}/>
<rect x="88" y="118" width="56" height="7" rx="3" fill="{G2}" {T}/>
<circle cx="116" cy="106" r="5" fill="{OL}" stroke="{B}" stroke-width="2"/>''',
    'tele': f'''
<path d="M66 94 L60 108 M88 94 L94 108" stroke="{B}" stroke-width="4" stroke-linecap="round"/>
<rect x="54" y="106" width="46" height="5" rx="2.5" fill="{B}"/>
<rect x="22" y="26" width="110" height="70" rx="6" fill="{BR}" {T}/>
<rect x="29" y="33" width="96" height="56" rx="3" fill="{NUIT}"/>
<circle cx="98" cy="50" r="8" fill="{OL}"/>
<path d="M29 89 L54 62 L72 78 L86 68 L125 89 Z" fill="{O}"/>
<path d="M29 89 L48 76 L62 89 Z" fill="#9C5B0E"/>''',
    'telephone': f'''
<rect x="112" y="68" width="30" height="54" rx="6" fill="{B}" {T}/>
<rect x="116" y="74" width="22" height="40" rx="2" fill="{OL}"/>
<circle cx="127" cy="118" r="1.8" fill="{G}"/>
<path d="M120 84 H134 M120 92 H130 M120 100 H134" stroke="{O}" stroke-width="2.5" stroke-linecap="round"/>''',
    'enceinte': f'''
<rect x="12" y="84" width="30" height="44" rx="6" fill="{BR}" {T}/>
<circle cx="27" cy="112" r="9" fill="{B}" stroke="{G2}" stroke-width="2"/>
<circle cx="27" cy="112" r="3" fill="{G2}"/>
<circle cx="27" cy="94" r="3.5" fill="{B}" stroke="{G2}" stroke-width="1.5"/>''',
    'soleil': f'''
<circle cx="38" cy="38" r="13" fill="{OL}" stroke="{O}" stroke-width="3"/>
<g stroke="{O}" stroke-width="3" stroke-linecap="round"><path d="M38 14 V19 M38 57 V62 M14 38 H19 M57 38 H62 M21 21 L25 25 M51 51 L55 55 M55 21 L51 25 M25 51 L21 55"/></g>''',
    'panneau': f'''
<path d="M72 106 L74 130 M120 96 L118 130" stroke="{B}" stroke-width="4" stroke-linecap="round"/>
<path d="M44 72 L124 60 L138 98 L58 110 Z" fill="{BR}" {T}/>
<g stroke="{OL}" stroke-width="1.8" opacity=".9">
<path d="M48.7 84.7 L128.7 72.7 M53.3 97.3 L133.3 85.3"/>
<path d="M64 69 L78 107 M84 66 L98 104 M104 63 L118 101"/>
</g>
<path d="M44 72 L124 60 L138 98 L58 110 Z" fill="none" {T}/>''',
    'batterie': f'''
<path d="M96 104 C92 114 98 118 104 118" fill="none" stroke="{B}" stroke-width="2.5"/>
<rect x="100" y="108" width="40" height="26" rx="4" fill="{O}" {T}/>
<rect x="106" y="103" width="8" height="6" rx="1.5" fill="{B}"/><rect x="126" y="103" width="8" height="6" rx="1.5" fill="{B}"/>
<path d="M122 112 L114 123 H120 L117 131 L126 119 H120 Z" fill="{W}"/>''',
}

ICONES = {
    'mobilite': ['moto'],
    'mixeur': ['mixeur'],
    'moulin': ['moulin'],
    'popcorn': ['popcorn'],
    'froid': ['frigo', 'ventilo'],
    'maison': ['bouilloire', 'fer'],
    'tv': ['tele', 'enceinte', 'telephone'],
    'solaire': ['soleil', 'panneau', 'batterie'],
}


def icone(nom):
    corps = ''.join(PARTS[p] for p in ICONES[nom])
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">'
            f'<rect width="160" height="160" fill="{C}"/><ellipse cx="80" cy="136" rx="62" ry="6" fill="{C2}"/>{corps}</svg>\n')


def place(parts, x, y, s):
    return f'<g transform="translate({x} {y}) scale({s})">{"".join(PARTS[p] for p in parts)}</g>'


def heros():
    # composition sur fond transparent, posée sur la bannière brune
    sol = 392
    g = [
        f'<circle cx="330" cy="220" r="190" fill="{C}" opacity=".07"/>',
        f'<circle cx="330" cy="220" r="130" fill="{C}" opacity=".06"/>',
        f'<ellipse cx="320" cy="{sol}" rx="270" ry="18" fill="#000" opacity=".22"/>',
        place(['soleil'], 470, 6, 1.3),
        place(['frigo'], -30, sol - 134 * 1.9, 1.9),
        place(['popcorn'], 300, sol - 136 * 1.75, 1.75),
        place(['moto'], 110, sol - 127 * 1.8, 1.8),
        place(['mixeur'], 440, sol - 134 * 1.2, 1.2),
    ]
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" width="640" height="420">{"".join(g)}</svg>\n'


if __name__ == '__main__':
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for n in ICONES:
        open(os.path.join(out, n + '.svg'), 'w').write(icone(n))
    open(os.path.join(out, 'heros.svg'), 'w').write(heros())
    print('ok', len(ICONES) + 1, 'fichiers')
