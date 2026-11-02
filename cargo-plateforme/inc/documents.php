<?php
/**
 * Mise en page des documents PDF, dans l'esprit d'un bordereau professionnel : bandeau, titre, rubriques numérotées
 * encadrées, cases cochées automatiquement, filigrane du logo, signatures, pied de page aux couleurs de l'entreprise.
 *  - cp_pdf_fiche()      : bordereau d'expédition / livraison
 *  - cp_pdf_etiquettes() : étiquettes à coller sur les cartons (4 par page)
 *  - cp_pdf_recu()       : reçu de paiement
 * Fonctions « pures » : elles reçoivent l'envoi ($e, voir cp_envoi()), les réglages ($r) et les images en JPEG.
 */
if ( ! defined( 'ABSPATH' ) && ! defined( 'CP_TEST' ) ) {
	exit;
}

function cp_pdf_date( $ts, $format = 'd/m/Y' ) {
	return function_exists( 'wp_date' ) ? wp_date( $format, $ts ) : date( $format, $ts );
}

function cp_pdf_prix( $montant, $r, $devise = true ) {
	return number_format( (float) $montant, 0, ',', ' ' ) . ( $devise ? ' ' . ( $r['entreprise']['devise'] ?? 'FCFA' ) : '' );
}

function cp_pdf_nombre( $v, $dec = 2 ) {
	$s = number_format( (float) $v, $dec, ',', ' ' );
	return $dec ? rtrim( rtrim( $s, '0' ), ',' ) : $s;
}

/** La police standard du PDF ne connaît que l'alphabet latin : un texte en chinois doit passer par une image. */
function cp_pdf_affichable( $texte ) {
	$texte = (string) $texte;
	return '' !== trim( $texte ) && substr_count( CP_PDF::cp1252( $texte ), '?' ) === substr_count( $texte, '?' );
}

/** Montant en toutes lettres (reçus). */
function cp_en_lettres( $n ) {
	$n = (int) round( $n );
	if ( 0 === $n ) {
		return 'zéro';
	}
	$u = array( '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf' );
	$d = array( '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt' );
	$moins100 = function ( $x ) use ( $u, $d ) {
		if ( $x < 20 ) {
			return $u[ $x ];
		}
		$di = intdiv( $x, 10 );
		$un = $x % 10;
		if ( 7 === $di || 9 === $di ) {
			$un += 10;
		}
		$s = $d[ $di ];
		if ( 1 === $un && $di < 8 ) {
			return $s . ' et un';
		}
		if ( 11 === $un && 7 === $di ) {
			return $s . ' et onze';
		}
		if ( 0 === $un ) {
			return 8 === $di ? $s . 's' : $s;
		}
		return $s . '-' . $u[ $un ];
	};
	$moins1000 = function ( $x ) use ( $moins100, $u ) {
		$c = intdiv( $x, 100 );
		$r = $x % 100;
		$s = '';
		if ( $c ) {
			$s = ( $c > 1 ? $u[ $c ] . ' ' : '' ) . 'cent' . ( $c > 1 && 0 === $r ? 's' : '' );
		}
		return trim( $s . ( $r ? ' ' . $moins100( $r ) : '' ) );
	};
	$parts = array();
	$milliards = intdiv( $n, 1000000000 );
	$millions = intdiv( $n % 1000000000, 1000000 );
	$milliers = intdiv( $n % 1000000, 1000 );
	$reste = $n % 1000;
	if ( $milliards ) { $parts[] = $moins1000( $milliards ) . ' milliard' . ( $milliards > 1 ? 's' : '' ); }
	if ( $millions ) { $parts[] = $moins1000( $millions ) . ' million' . ( $millions > 1 ? 's' : '' ); }
	if ( $milliers ) { $parts[] = ( 1 === $milliers ? '' : preg_replace( '/cents$/', 'cent', $moins1000( $milliers ) ) . ' ' ) . 'mille'; }
	if ( $reste ) { $parts[] = $moins1000( $reste ); }
	return trim( implode( ' ', $parts ) );
}

/* ================================================================ éléments communs */

function cp_doc_couleurs( $r ) {
	return array(
		'p'     => $r['couleurs']['primaire'] ?? '#0146AF',
		'fonce' => $r['couleurs']['accent'] ?? '#0A0A0A',
		'pale'  => '#EAF1FC',
		'bord'  => '#9DB7E6',
		'texte' => '#111827',
		'gris'  => '#6B7280',
	);
}

/** Bandeau du haut : l'image fournie par l'entreprise, sinon un bandeau composé (logo, services, accroche). Renvoie y. */
function cp_doc_bandeau( CP_PDF $pdf, $r, $logo, $banniere ) {
	$c = cp_doc_couleurs( $r );
	if ( $banniere && ( $info = @getimagesizefromstring( $banniere ) ) ) {
		$h = 210 * $info[1] / $info[0];
		$pdf->jpeg( $banniere, 0, 0, 210, $h );
		return $h + 2;
	}
	$pdf->rect( 0, 0, 210, 38, '#FFFFFF' );
	$pdf->polygone( array( array( 140, 0 ), array( 210, 0 ), array( 210, 38 ), array( 120, 38 ) ), $c['p'] );
	$pdf->polygone( array( array( 133, 0 ), array( 140, 0 ), array( 120, 38 ), array( 113, 38 ) ), $c['fonce'] );
	if ( $logo && ( $info = @getimagesizefromstring( $logo ) ) ) {
		$h = 30; $l = $h * $info[0] / $info[1];
		if ( $l > 58 ) { $l = 58; $h = $l * $info[1] / $info[0]; }
		$pdf->jpeg( $logo, 10, 4 + ( 30 - $h ) / 2, $l, $h );
	} else {
		$pdf->couleur( $c['p'] )->police( true, 18 )->texte( 10, 20, $r['entreprise']['nom'] );
	}
	$services = $r['documents']['services'] ?? '';
	if ( $services ) {
		$pdf->couleur( $c['p'] )->police( true, 7.5 );
		$pdf->paragraphe( 72, 12, 48, mb_strtoupper( $services ), 3.6 );
	}
	$accroche = $r['documents']['accroche'] ?? ( $r['origine']['pays'] . ' → ' . $r['destination']['pays'] );
	$pdf->couleur( '#FFFFFF' )->police( true, 11 );
	$pdf->paragraphe( 150, 15, 54, mb_strtoupper( $accroche ), 5 );
	$pdf->rect( 0, 38, 210, 1.2, $c['p'] );
	return 42;
}

/** Barre de titre + cartouche numéro / date. Renvoie y. */
function cp_doc_titre( CP_PDF $pdf, $r, $y, $titre, $libelle_num, $num, $date ) {
	$c = cp_doc_couleurs( $r );
	$pdf->rect_arrondi( 10, $y, 128, 15, 2.5, $c['p'] );
	$pdf->police( true, 16.5 );
	$taille = 16.5;
	while ( $pdf->largeur( $titre ) > 120 && $taille > 11 ) {
		$taille -= .5;
		$pdf->police( true, $taille );
	}
	$pdf->couleur( '#FFFFFF' )->texte( 15, $y + 10, $titre );
	$pdf->rect_arrondi( 140, $y, 60, 15, 2.5, '#FFFFFF', $c['bord'], .4 );
	$pdf->couleur( $c['texte'] )->police( true, 9 )->texte( 144, $y + 6, $libelle_num . ' : ' )->couleur( $c['p'] )->texte( 144 + $pdf->largeur( $libelle_num . ' : ' ), $y + 6, $num );
	$pdf->couleur( $c['texte'] )->police( true, 9 )->texte( 144, $y + 11.8, 'Date : ' )->police( false, 9 )->texte( 144 + $pdf->police( true, 9 )->largeur( 'Date : ' ), $y + 11.8, $date );
	return $y + 19;
}

/** Petites icônes vectorielles (blanches) dans un carré arrondi de couleur. */
function cp_doc_icone( CP_PDF $pdf, $nom, $x, $y, $t, $fond ) {
	$pdf->rect_arrondi( $x, $y, $t, $t, 1.4, $fond );
	$b = '#FFFFFF';
	$cx = $x + $t / 2; $cy = $y + $t / 2; $s = $t * .3;
	switch ( $nom ) {
		case 'colis':
			$pdf->polygone( array( array( $cx, $cy - $s ), array( $cx + $s, $cy - $s / 2 ), array( $cx + $s, $cy + $s / 2 ), array( $cx, $cy + $s ), array( $cx - $s, $cy + $s / 2 ), array( $cx - $s, $cy - $s / 2 ) ), null, $b, .45 );
			$pdf->polygone( array( array( $cx - $s, $cy - $s / 2 ), array( $cx, $cy ), array( $cx + $s, $cy - $s / 2 ) ), null, $b, .45, false );
			$pdf->trait( $cx, $cy, $cx, $cy + $s, $b, .45 );
			break;
		case 'personne':
			$pdf->cercle( $cx, $cy - $s * .45, $s * .45, $b );
			$pdf->chemin( array( array( 'm', $cx - $s, $cy + $s ), array( 'c', $cx - $s, $cy + $s * .1, $cx + $s, $cy + $s * .1, $cx + $s, $cy + $s ) ), $b );
			break;
		case 'avion':
			$pdf->polygone( array( array( $cx - $s, $cy + $s * .1 ), array( $cx + $s, $cy - $s * .9 ), array( $cx + $s * .35, $cy + $s ), array( $cx - $s * .05, $cy + $s * .35 ) ), $b );
			break;
		case 'bateau':
			$pdf->polygone( array( array( $cx - $s, $cy + $s * .2 ), array( $cx + $s, $cy + $s * .2 ), array( $cx + $s * .6, $cy + $s * .85 ), array( $cx - $s * .6, $cy + $s * .85 ) ), $b );
			$pdf->rect( $cx - $s * .5, $cy - $s * .5, $s, $s * .6, $b );
			break;
		case 'argent':
			$pdf->cercle( $cx, $cy, $s, null, $b, .5 );
			$pdf->police( true, $t * 1.3 )->couleur( $b )->texte( $cx - $s, $cy + $s * .5, 'F', 'c', 2 * $s );
			break;
		case 'repere':
			$pdf->chemin( array( array( 'm', $cx, $cy + $s ), array( 'c', $cx - $s * 1.2, $cy - $s * .1, $cx - $s * .8, $cy - $s, $cx, $cy - $s ), array( 'c', $cx + $s * .8, $cy - $s, $cx + $s * 1.2, $cy - $s * .1, $cx, $cy + $s ) ), $b );
			$pdf->cercle( $cx, $cy - $s * .35, $s * .3, $fond );
			break;
		case 'presse':
			$pdf->rect( $cx - $s * .75, $cy - $s, $s * 1.5, $s * 2, null, $b, .45 );
			foreach ( array( -.35, .1, .55 ) as $k ) {
				$pdf->trait( $cx - $s * .4, $cy + $s * $k, $cx + $s * .4, $cy + $s * $k, $b, .4 );
			}
			break;
		case 'recu':
			$pdf->polygone( array( array( $cx - $s * .7, $cy - $s ), array( $cx + $s * .7, $cy - $s ), array( $cx + $s * .7, $cy + $s ), array( $cx + $s * .35, $cy + $s * .75 ), array( $cx, $cy + $s ), array( $cx - $s * .35, $cy + $s * .75 ), array( $cx - $s * .7, $cy + $s ) ), null, $b, .45 );
			$pdf->trait( $cx - $s * .35, $cy - $s * .4, $cx + $s * .35, $cy - $s * .4, $b, .4 );
			$pdf->trait( $cx - $s * .35, $cy + $s * .1, $cx + $s * .35, $cy + $s * .1, $b, .4 );
			break;
		case 'carte':
			$pdf->rect_arrondi( $cx - $s, $cy - $s * .65, 2 * $s, 1.3 * $s, .5, null, $b, .45 );
			$pdf->rect( $cx - $s, $cy - $s * .3, 2 * $s, $s * .25, $b );
			break;
	}
}

/** Rubrique numérotée encadrée ; renvoie la position y du contenu. */
function cp_doc_rubrique( CP_PDF $pdf, $r, $x, $y, $l, $h, $num, $titre, $icone ) {
	$c = cp_doc_couleurs( $r );
	$pdf->rect_arrondi( $x, $y, $l, $h, 2.5, '#FFFFFF', $c['bord'], .45 );
	$pdf->rect_arrondi( $x + .6, $y + .6, $l - 1.2, 8.8, 2, $c['pale'] );
	$pdf->cercle( $x + 6.2, $y + 5, 4.1, $c['p'] );
	$pdf->couleur( '#FFFFFF' )->police( true, 11 )->texte( $x + 2.1, $y + 6.6, (string) $num, 'c', 8.2 );
	$pdf->couleur( $c['p'] )->police( true, 10 )->texte( $x + 13, $y + 6.6, mb_strtoupper( $titre ) );
	cp_doc_icone( $pdf, $icone, $x + $l - 10.5, $y + 1.2, 7.6, $c['p'] );
	return $y + 15;
}

/** Ligne « libellé : valeur » ; une valeur vide laisse des pointillés pour écrire à la main. */
function cp_doc_ligne( CP_PDF $pdf, $r, $x, $y, $l, $libelle, $valeur ) {
	$c = cp_doc_couleurs( $r );
	$pdf->couleur( $c['texte'] )->police( false, 8.6 )->texte( $x, $y, $libelle . ' :' );
	$lx = $x + $pdf->largeur( $libelle . ' :' ) + 1.5;
	$valeur = trim( (string) $valeur );
	if ( '' === $valeur ) {
		$pdf->trait( $lx, $y + .6, $x + $l, $y + .6, '#9CA3AF', .25, '0.6 1.4' );
		return;
	}
	$pdf->police( true, 8.8 );
	$t = $valeur;
	$max = $x + $l - $lx;
	if ( $pdf->largeur( $t ) > $max ) {
		while ( mb_strlen( $t ) > 2 && $pdf->largeur( $t . '…' ) > $max ) {
			$t = mb_substr( $t, 0, -1 );
		}
		$t = rtrim( $t ) . '…';
	}
	$pdf->couleur( $c['texte'] )->texte( $lx, $y, $t );
}

function cp_doc_case( CP_PDF $pdf, $r, $x, $y, $coche, $libelle ) {
	$c = cp_doc_couleurs( $r );
	$pdf->rect_arrondi( $x, $y - 3.2, 3.6, 3.6, .5, $coche ? $c['p'] : '#FFFFFF', $coche ? $c['p'] : '#374151', .35 );
	if ( $coche ) {
		$pdf->polygone( array( array( $x + .75, $y - 1.4 ), array( $x + 1.55, $y - .55 ), array( $x + 2.9, $y - 2.5 ) ), null, '#FFFFFF', .55, false );
	}
	$pdf->couleur( $c['texte'] )->police( $coche, 8.6 )->texte( $x + 5, $y, $libelle );
	return $x + 5 + $pdf->largeur( $libelle ) + 5;
}

function cp_doc_pastille( CP_PDF $pdf, $r, $x, $y, $texte ) {
	$c = cp_doc_couleurs( $r );
	$pdf->police( true, 9.5 );
	$l = $pdf->largeur( $texte ) + 7;
	$pdf->rect_arrondi( $x, $y - 4.4, $l, 6.2, 1.6, $c['p'] );
	$pdf->couleur( '#FFFFFF' )->texte( $x + 3.5, $y, $texte );
	return $x + $l;
}

/** Pied de page sombre : contacts, accroche, services. */
function cp_doc_pied( CP_PDF $pdf, $r ) {
	$c = cp_doc_couleurs( $r );
	$pdf->rect( 0, 271, 210, 26, '#0B1B3F' );
	$pdf->rect( 0, 271, 210, 1, $c['p'] );
	$tels = array_values( array_filter( array( $r['entreprise']['telephone_chine'] ?? '', $r['entreprise']['telephone'] ?? '' ) ) );
	$pdf->couleur( '#FFFFFF' )->police( true, 12.5 )->texte( 10, 281.5, implode( '  /  ', $tels ) );
	$pied = $r['documents']['pied'] ?? $r['entreprise']['slogan'];
	$pdf->couleur( '#C7D7F5' )->police( false, 7.2 )->texte( 10, 287.5, mb_strtoupper( $pied ) );
	$ids = array_filter( array( $r['entreprise']['email'] ?? '', ! empty( $r['entreprise']['rccm'] ) ? 'RCCM ' . $r['entreprise']['rccm'] : '', ! empty( $r['entreprise']['ifu'] ) ? 'IFU ' . $r['entreprise']['ifu'] : '' ) );
	if ( $ids ) {
		$pdf->texte( 10, 292, implode( '  ·  ', $ids ) );
	}
	$services = array_filter( array_map( 'trim', preg_split( '/[•·|]/u', (string) ( $r['documents']['services'] ?? '' ) ) ) );
	if ( $services ) {
		$services = array_slice( array_values( $services ), 0, 5 );
		$n = count( $services );
		$lx = 104; $pas = ( 200 - $lx ) / $n;
		$pdf->trait( $lx - 3, 275, $lx - 3, 294, '#3B4E7A', .3 );
		foreach ( $services as $i => $s ) {
			$cx = $lx + $pas * $i;
			cp_doc_icone( $pdf, array( 'colis', 'avion', 'argent', 'repere', 'carte' )[ $i % 5 ], $cx + $pas / 2 - 3.5, 274.5, 7, $c['p'] );
			$pdf->couleur( '#FFFFFF' )->police( false, 6.6 );
			$pdf->paragraphe( $cx, 286, $pas - 1, $s, 2.9 );
		}
	}
}

/** Filigrane : le logo très pâle au centre d'une zone. */
function cp_doc_filigrane( CP_PDF $pdf, $logo, $x, $y, $l, $h ) {
	if ( ! $logo || ! ( $info = @getimagesizefromstring( $logo ) ) ) {
		return;
	}
	$lh = $h * .9; $ll = $lh * $info[0] / $info[1];
	if ( $ll > $l * .6 ) { $ll = $l * .6; $lh = $ll * $info[1] / $info[0]; }
	$pdf->jpeg( $logo, $x + ( $l - $ll ) / 2, $y + ( $h - $lh ) / 2, $ll, $lh, .09 );
}

/* ================================================================ bordereau d'expédition / livraison */
function cp_pdf_fiche( array $e, array $r, $logo = '', $banniere = '' ) {
	$c = cp_doc_couleurs( $r );
	$pdf = new CP_PDF();
	$pdf->page();
	$y = cp_doc_bandeau( $pdf, $r, $logo, $banniere );
	$y = cp_doc_titre( $pdf, $r, $y, 'BORDEREAU D\'EXPÉDITION / LIVRAISON', 'N° Bordereau', $e['code'], cp_pdf_date( $e['date'] ) );
	$haut = 297 - 26 - 3;                   // le pied commence à 271 mm
	$dispo = $haut - $y;
	// hauteurs des rangées, ajustées à la place disponible
	$h1 = 44; $h3 = 55; $h4 = 46; $h6 = $dispo - $h1 - $h3 - $h4 - 9;
	$cl = $e['client'];
	$de = $e['destinataire'];

	// 1. expéditeur
	$cy = cp_doc_rubrique( $pdf, $r, 10, $y, 94, $h1, 1, 'Informations sur l\'expéditeur', 'colis' );
	foreach ( array( array( 'Nom et Prénoms', $cl['nom'] ), array( 'Téléphone / WhatsApp', $cl['telephone'] ), array( 'Adresse complète', $cl['adresse'] ?? '' ), array( 'Ville / Pays', trim( ( $cl['ville'] ?? '' ) . ( ! empty( $cl['pays'] ) ? ' / ' . $cl['pays'] : '' ), ' /' ) ), array( 'Fournisseur (site)', $cl['fournisseur'] ?? '' ) ) as $i => $l ) {
		cp_doc_ligne( $pdf, $r, 14, $cy + $i * 5.9, 86, $l[0], $l[1] );
	}
	// 2. destinataire
	$cy = cp_doc_rubrique( $pdf, $r, 106, $y, 94, $h1, 2, 'Informations sur le destinataire', 'personne' );
	$point = trim( ( $de['adresse'] ?? '' ) . ( $de['agence'] ? ( ! empty( $de['adresse'] ) ? ' — ' : '' ) . 'Agence ' . $de['agence'] : '' ) );
	foreach ( array( array( 'Nom et Prénoms', $de['nom'] ? $de['nom'] : $cl['nom'] ), array( 'Téléphone / WhatsApp', $de['telephone'] ? $de['telephone'] : $cl['telephone'] ), array( 'Ville / Quartier', trim( $de['ville'] . ( ! empty( $de['quartier'] ) ? ' / ' . $de['quartier'] : '' ), ' /' ) ), array( 'Adresse / Point de livraison', $point ) ) as $i => $l ) {
		cp_doc_ligne( $pdf, $r, 110, $cy + $i * 5.9, 86, $l[0], $l[1] );
	}
	$y += $h1 + 3;

	// 3. détails du colis
	$cy = cp_doc_rubrique( $pdf, $r, 10, $y, 190, $h3, 3, 'Détails du colis' . ( $e['contenu'] ? ' — ' . $e['contenu'] : '' ), 'colis' );
	$cols = array( array( 'N°', 12, 10, 'c' ), array( 'Description des articles', 22, 66, 'g' ), array( 'Quantité', 88, 22, 'c' ), array( 'Poids (kg)', 110, 24, 'c' ), array( 'Volume (m³)', 134, 26, 'c' ), array( 'Valeur déclarée (' . ( $r['entreprise']['devise'] ?? 'FCFA' ) . ')', 160, 38, 'c' ) );
	$ty = $cy - 3;
	$pdf->rect( 12, $ty, 186, 6.5, $c['p'] );
	$pdf->couleur( '#FFFFFF' )->police( true, 8 );
	foreach ( $cols as $col ) {
		$pdf->texte( $col[1] + ( 'g' === $col[3] ? 2 : 0 ), $ty + 4.5, $col[0], $col[3], $col[2] - ( 'g' === $col[3] ? 2 : 0 ) );
	}
	$lignes = array_values( $e['colis'] );
	$nlig = max( 5, count( $lignes ) );
	$hl = min( 5.6, ( $h3 - 15 - 6.5 - 6.5 ) / $nlig );
	$ly = $ty + 6.5;
	cp_doc_filigrane( $pdf, $logo, 12, $ly, 186, $hl * $nlig );
	$tn = 0; $tp = 0.0; $tv = 0.0;
	$valeur_par = count( $lignes ) ? (float) $e['valeur'] / count( $lignes ) : 0;
	for ( $i = 0; $i < $nlig; $i++ ) {
		$pdf->rect( 12, $ly, 186, $hl, null, '#1F3A75', .25 );
		foreach ( $cols as $col ) {
			if ( $col[1] > 12 ) { $pdf->trait( $col[1], $ly, $col[1], $ly + $hl, '#1F3A75', .25 ); }
		}
		$pdf->couleur( $c['texte'] )->police( true, 8.4 )->texte( 12, $ly + $hl - 1.6, (string) ( $i + 1 ), 'c', 10 );
		if ( isset( $lignes[ $i ] ) ) {
			$col = $lignes[ $i ];
			$nb = max( 1, (int) $col['nombre'] );
			$p = (float) $col['poids'] * $nb;
			$v = (float) $col['longueur'] * (float) $col['largeur'] * (float) $col['hauteur'] * $nb / 1e6;
			$tn += $nb; $tp += $p; $tv += $v;
			$vals = array( '', $col['description'] ? $col['description'] : 'Carton', (string) $nb, $p ? cp_pdf_nombre( $p ) : '', $v ? cp_pdf_nombre( $v, 3 ) : '', $valeur_par ? cp_pdf_prix( $valeur_par, $r, false ) : '' );
			$pdf->police( false, 8.4 );
			foreach ( $cols as $k => $col2 ) {
				if ( $k ) { $pdf->texte( $col2[1] + ( 'g' === $col2[3] ? 2 : 0 ), $ly + $hl - 1.6, $vals[ $k ], $col2[3], $col2[2] - ( 'g' === $col2[3] ? 2 : 0 ) ); }
			}
		}
		$ly += $hl;
	}
	$k = $e['calcul'];
	$pdf->rect( 12, $ly, 186, 6.5, $c['pale'], '#1F3A75', .25 );
	$pdf->couleur( $c['texte'] )->police( true, 8.4 );
	$pdf->texte( 14, $ly + 4.4, 'Nombre total de colis : ' . ( $tn ? $tn : '' ) );
	$pdf->texte( 78, $ly + 4.4, 'Poids total : ' . ( $tp ? cp_pdf_nombre( $tp ) . ' kg' : ( ! empty( $k['poids'] ) ? cp_pdf_nombre( $k['poids'] ) . ' kg' : '' ) ) );
	$pdf->texte( 136, $ly + 4.4, 'Volume total : ' . ( $tv ? cp_pdf_nombre( $tv, 3 ) . ' m³ / CBM' : '' ) );
	$y += $h3 + 3;

	// 4. mode d'expédition
	$cy = cp_doc_rubrique( $pdf, $r, 10, $y, 94, $h4, 4, 'Mode d\'expédition', ! empty( $k['unite'] ) && 'm3' === $k['unite'] ? 'bateau' : 'avion' );
	$mer = ! empty( $k['unite'] ) ? 'm3' === $k['unite'] : false !== stripos( $e['mode_nom'], 'mari' ) || false !== stripos( $e['mode_nom'], 'bateau' );
	$xx = cp_doc_case( $pdf, $r, 14, $cy + 1, $mer, 'Maritime (bateau)' );
	$xx = cp_doc_case( $pdf, $r, $xx, $cy + 1, ! $mer, 'Aérien (avion)' );
	$pdf->couleur( $c['p'] )->police( true, 8.6 )->texte( 14, $cy + 7.5, 'Formule : ' . $e['mode_nom'] );
	$pdf->couleur( $c['texte'] )->police( true, 8 )->texte( 14, $cy + 14.5, 'Départ :' );
	$xx = cp_doc_pastille( $pdf, $r, 14 + $pdf->largeur( 'Départ :' ) + 1.5, $cy + 14.5, mb_strtoupper( $r['origine']['pays'] ) );
	$pdf->polygone( array( array( $xx + 1.5, $cy + 13 ), array( $xx + 5.5, $cy + 13 ), array( $xx + 5.5, $cy + 11.8 ), array( $xx + 8, $cy + 13.5 ), array( $xx + 5.5, $cy + 15.2 ), array( $xx + 5.5, $cy + 14 ), array( $xx + 1.5, $cy + 14 ) ), $c['texte'] );
	$pdf->couleur( $c['texte'] )->police( true, 8 )->texte( $xx + 9.5, $cy + 14.5, 'Destination :' );
	cp_doc_pastille( $pdf, $r, $xx + 9.5 + $pdf->police( true, 8 )->largeur( 'Destination :' ) + 1.5, $cy + 14.5, mb_strtoupper( $r['destination']['pays'] ) );
	$depart = '';
	$prevue = '';
	foreach ( (array) $e['historique'] as $h ) {
		if ( 'expedie' === $h['etape'] ) { $depart = $h['date']; }
	}
	if ( $depart && ! empty( $e['delais'] ) ) {
		$prevue = 'entre le ' . cp_pdf_date( $depart + $e['delais'][0] * 86400, 'd/m' ) . ' et le ' . cp_pdf_date( $depart + $e['delais'][1] * 86400 );
	} elseif ( ! empty( $e['delais'] ) ) {
		$prevue = $e['delais'][0] . ' à ' . $e['delais'][1] . ' jours après l\'expédition';
	}
	cp_doc_ligne( $pdf, $r, 14, $cy + 21.5, 86, 'Date d\'expédition', $depart ? cp_pdf_date( $depart ) : '' );
	cp_doc_ligne( $pdf, $r, 14, $cy + 27.4, 86, 'Date prévue de livraison', $prevue );

	// 5. frais et paiement
	$cy = cp_doc_rubrique( $pdf, $r, 106, $y, 94, $h4, 5, 'Frais & paiement', 'argent' );
	$transport = $k['transport'] ?? 0;
	$autres = ( $k['frais'] ?? 0 ) + ( $k['assurance'] ?? 0 );
	$total = $e['montant'] ? $e['montant'] : ( $k['total'] ?? 0 );
	$ligne_prix = function ( $yy, $lib, $val, $detail = '' ) use ( $pdf, $r, $c ) {
		$pdf->couleur( $c['texte'] )->police( false, 8.6 )->texte( 110, $yy, $lib . ' :' );
		$x0 = 110 + $pdf->largeur( $lib . ' :' ) + 1.5;
		if ( '' === $val ) {
			$pdf->trait( $x0, $yy + .6, 184, $yy + .6, '#9CA3AF', .25, '0.6 1.4' );
		} else {
			$pdf->police( true, 8.8 )->texte( 110, $yy, $val, 'd', 75 );
			if ( $detail ) { $pdf->police( false, 7 )->couleur( $c['gris'] )->texte( $x0, $yy, $detail ); }
		}
		$pdf->couleur( $c['texte'] )->police( true, 8.6 )->texte( 186, $yy, $r['entreprise']['devise'] ?? 'FCFA' );
	};
	$detail = '';
	if ( $k ) {
		$detail = 'm3' === $k['unite'] ? cp_pdf_nombre( $k['facture'] ) . ' m³ × ' . cp_pdf_prix( $k['prix_unite'], $r, false ) : cp_pdf_nombre( $k['facture'], 1 ) . ' kg × ' . cp_pdf_prix( $k['prix_unite'], $r, false );
	}
	$ligne_prix( $cy + 1, 'Frais d\'expédition', $transport ? cp_pdf_prix( $transport, $r, false ) : '', $detail );
	$ligne_prix( $cy + 7, 'Autres frais (douane, manutention…)', $autres ? cp_pdf_prix( $autres, $r, false ) : ( $k ? '0' : '' ) );
	$pdf->rect_arrondi( 108, $cy + 9.8, 90, 7.4, 1.4, '#D9E6FB' );
	$pdf->couleur( $c['p'] )->police( true, 11 )->texte( 111, $cy + 15, 'TOTAL :' );
	$pdf->texte( 110, $cy + 15, $total ? cp_pdf_prix( $total, $r ) : '……………… ' . ( $r['entreprise']['devise'] ?? 'FCFA' ), 'd', 85 );
	$paye = 'paye' === ( $e['paiement']['statut'] ?? '' );
	$xx = cp_doc_case( $pdf, $r, 110, $cy + 23, $paye, 'Payé' );
	$xx = cp_doc_case( $pdf, $r, $xx, $cy + 23, ! $paye && empty( $e['paiement_livraison'] ), 'À payer' );
	cp_doc_case( $pdf, $r, $xx, $cy + 23, ! $paye && ! empty( $e['paiement_livraison'] ), 'Paiement à la livraison' );
	if ( ! empty( $k['total_alt'] ) && ! $paye ) {
		$pdf->couleur( $c['gris'] )->police( false, 7.4 )->texte( 110, $cy + 28.5, ( $k['prix_alt_libelle'] ?: 'Autre tarif' ) . ' : ' . cp_pdf_prix( $k['total_alt'], $r ) );
	}
	$y += $h4 + 3;

	// 6. suivi du colis
	$cy = cp_doc_rubrique( $pdf, $r, 10, $y, 94, $h6, 6, 'Suivi du colis', 'repere' );
	cp_doc_ligne( $pdf, $r, 14, $cy + 1, 86, 'Numéro de suivi', $e['code'] );
	cp_doc_ligne( $pdf, $r, 14, $cy + 7, 86, 'Référence interne', '#' . $e['id'] . ( ! empty( $e['recu'] ) ? ' · reçu ' . $e['recu'] : '' ) );
	$pdf->couleur( $c['texte'] )->police( true, 8.6 )->texte( 14, $cy + 13, 'Statut :' );
	$groupes = array( 'En cours' => array( 'declare', 'recu' ), 'Expédié' => array( 'expedie', 'transit' ), 'Arrivé' => array( 'arrive', 'disponible' ), 'Livré' => array( 'livre' ) );
	$xx = 16;
	foreach ( $groupes as $lib => $ids ) {
		$xx = cp_doc_case( $pdf, $r, $xx, $cy + 18.5, in_array( $e['statut'], $ids, true ), $lib ) - 1;
	}
	$pdf->code128( $e['code'], 12, $cy + 21, 70, min( 11, $h6 - 15 - 23 ) );

	// 7. réception du colis
	$cy = cp_doc_rubrique( $pdf, $r, 106, $y, 94, $h6, 7, 'Réception du colis', 'presse' );
	$pdf->couleur( $c['texte'] )->police( true, 8.6 )->texte( 110, $cy + 1, 'État du colis :' );
	$xx = cp_doc_case( $pdf, $r, 134, $cy + 1, false, 'Bon état' );
	cp_doc_case( $pdf, $r, $xx + 4, $cy + 1, false, 'Sous réserve' );
	cp_doc_ligne( $pdf, $r, 110, $cy + 7.2, 86, 'Observations', '' );
	$pdf->trait( 110, $cy + 13.2, 196, $cy + 13.2, '#9CA3AF', .25, '0.6 1.4' );
	$sh = $h6 - 33;
	$pdf->rect_arrondi( 109, $cy + 16, 43, $sh, 1.6, '#FFFFFF', '#374151', .35 );
	$pdf->rect_arrondi( 154, $cy + 16, 43, $sh, 1.6, '#FFFFFF', '#374151', .35 );
	$pdf->couleur( $c['texte'] )->police( true, 7.8 )->texte( 109, $cy + 20, 'Signature ' . mb_strtoupper( $r['entreprise']['nom'] ), 'c', 43 )->texte( 154, $cy + 20, 'Signature du client', 'c', 43 );

	// adresse de l'entrepôt (rappel, au-dessus du pied) et pied de page
	cp_doc_pied( $pdf, $r );
	// seconde page : adresse de l'entrepôt et consignes, utiles au fournisseur et au client
	if ( ! empty( $e['entrepot'] ) ) {
		cp_doc_page_entrepot( $pdf, $e, $r, $logo, $banniere );
	}
	return $pdf->sortie();
}

/** Page 2 du bordereau : adresse de l'entrepôt de départ (en image si elle est en chinois), consignes, paiement. */
function cp_doc_page_entrepot( CP_PDF $pdf, array $e, array $r, $logo, $banniere ) {
	$c = cp_doc_couleurs( $r );
	$pdf->page();
	$y = cp_doc_bandeau( $pdf, $r, $logo, $banniere );
	$y = cp_doc_titre( $pdf, $r, $y, 'ADRESSE DE LIVRAISON EN ' . mb_strtoupper( $r['origine']['pays'] ), 'N° Bordereau', $e['code'], cp_pdf_date( $e['date'] ) );
	$ent = $e['entrepot'];
	$cy = cp_doc_rubrique( $pdf, $r, 10, $y, 190, 78, 1, 'Entrepôt de départ — ' . $e['mode_nom'], 'repere' );
	$pdf->couleur( $c['texte'] )->police( false, 9 )->texte( 14, $cy + 1, 'À transmettre à votre fournisseur : faites livrer vos colis à cette adresse.' );
	$ay = $cy + 6;
	if ( ! empty( $ent['jpeg'] ) && ( $info = @getimagesizefromstring( $ent['jpeg'] ) ) ) {
		$l = min( 180, $info[0] / 5.5 ); $h = $l * $info[1] / $info[0];
		if ( $h > 30 ) { $h = 30; $l = $h * $info[0] / $info[1]; }
		$pdf->jpeg( $ent['jpeg'], 14, $ay, $l, $h );
		$ay += $h + 3;
	} elseif ( cp_pdf_affichable( $ent['texte'] ) ) {
		$pdf->police( true, 11 );
		$ay = $pdf->paragraphe( 14, $ay + 4, 180, $ent['texte'], 5.2 );
	} else {
		$pdf->police( false, 9.5 )->texte( 14, $ay + 4, 'Adresse en chinois : voir l\'e-mail de confirmation ou la page « Expédier un colis » du site.' );
		$ay += 8;
	}
	if ( ! empty( $r['origine']['contact'] ) ) {
		$pdf->police( true, 9.5 )->texte( 14, $ay + 2, 'Contact entrepôt : ' . $r['origine']['contact'] );
		$ay += 7;
	}
	// marquage des cartons
	$pdf->rect_arrondi( 14, $ay + 2, 182, 24, 2, $c['pale'], $c['bord'], .4 );
	$pdf->couleur( $c['p'] )->police( true, 10.5 )->texte( 19, $ay + 9, $r['consigne_colis'] ?? 'Écrivez votre code sur chaque carton.' );
	$pdf->couleur( $c['texte'] )->police( true, 22 )->texte( 19, $ay + 21, $e['code'] );
	$pdf->police( true, 13 )->couleur( $c['p'] )->texte( 19 + $pdf->police( true, 22 )->largeur( $e['code'] ) + 6, $ay + 21, '+ ' . mb_strtoupper( $e['mode_nom'] ) );
	$y += 81;
	// paiement
	$cy = cp_doc_rubrique( $pdf, $r, 10, $y, 190, 44, 2, 'Comment payer', 'carte' );
	$yy = $cy + 1;
	foreach ( array( 'orange_money' => 'Orange Money', 'moov_money' => 'Moov Money', 'wave' => 'Wave' ) as $cle => $nom ) {
		if ( ! empty( $r['paiement'][ $cle ] ) ) {
			$pdf->couleur( $c['texte'] )->police( true, 10 )->texte( 14, $yy, $nom . ' : ' )->police( false, 10 )->texte( 14 + $pdf->police( true, 10 )->largeur( $nom . ' : ' ), $yy, $r['paiement'][ $cle ] );
			$yy += 6;
		}
	}
	if ( ! empty( $r['paiement']['consignes'] ) ) {
		$pdf->police( false, 9 )->couleur( $c['gris'] );
		$pdf->paragraphe( 14, $yy + 2, 180, $r['paiement']['consignes'], 4.4 );
	}
	$y += 47;
	// étapes du suivi
	$etapes = $e['etapes'] ?? array();
	if ( $etapes ) {
		$cy = cp_doc_rubrique( $pdf, $r, 10, $y, 190, 268 - $y, 3, 'Les étapes de votre envoi', 'repere' );
		$faites = array();
		foreach ( (array) $e['historique'] as $h ) { $faites[ $h['etape'] ] = $h['date']; }
		$n = count( $etapes ); $pas = 182 / $n;
		foreach ( $etapes as $i => $et ) {
			$cx = 14 + $pas * ( $i + .5 );
			$fait = isset( $faites[ $et['id'] ] );
			if ( $i ) { $pdf->trait( $cx - $pas + 4, $cy + 4, $cx - 4, $cy + 4, $fait ? $c['p'] : '#C9D3E6', 1 ); }
			$pdf->cercle( $cx, $cy + 4, 3.6, $fait ? $c['p'] : '#FFFFFF', $fait ? $c['p'] : '#9CA3AF', .5 );
			$pdf->couleur( $fait ? '#FFFFFF' : $c['gris'] )->police( true, 8 )->texte( $cx - 3, $cy + 5.4, (string) ( $i + 1 ), 'c', 6 );
			$pdf->couleur( $fait ? $c['texte'] : $c['gris'] )->police( $et['id'] === $e['statut'], 7.2 );
			$pdf->paragraphe( $cx - $pas / 2 + 1, $cy + 12, $pas - 2, $et['nom'], 3.2 );
			if ( $fait ) { $pdf->police( false, 6.6 )->couleur( $c['p'] )->texte( $cx - $pas / 2, $cy + 20.5, cp_pdf_date( $faites[ $et['id'] ], 'd/m' ), 'c', $pas ); }
		}
		if ( ! empty( $e['lien_suivi'] ) ) {
			$pdf->couleur( $c['texte'] )->police( false, 8.6 )->texte( 14, $cy + 29, 'Suivez votre envoi en ligne à tout moment, avec votre numéro de suivi :' );
			$pdf->couleur( $c['p'] )->police( true, 8.6 )->texte( 14, $cy + 34, $e['lien_suivi'] );
		}
	}
	cp_doc_pied( $pdf, $r );
}

/* ================================================================ étiquettes (4 par page A4) */
function cp_pdf_etiquettes( array $e, array $r, $logo = '' ) {
	$c = cp_doc_couleurs( $r );
	$pdf = new CP_PDF();
	$total = 0;
	foreach ( $e['colis'] as $col ) { $total += max( 1, (int) $col['nombre'] ); }
	$total = max( 1, $total );
	$n = min( 200, $total );
	for ( $i = 0; $i < $n; $i++ ) {
		if ( 0 === $i % 4 ) { $pdf->page(); }
		$x = 0 === $i % 2 ? 9 : 106;
		$y = 0 === intdiv( $i % 4, 2 ) ? 9 : 151;
		$pdf->rect_arrondi( $x, $y, 95, 137, 3, '#FFFFFF', $c['fonce'], .7 );
		$pdf->rect_arrondi( $x + 1.5, $y + 1.5, 92, 24, 2.2, $c['p'] );
		if ( $logo && ( $info = @getimagesizefromstring( $logo ) ) ) {
			$pdf->rect_arrondi( $x + 4, $y + 4, 30, 19, 1.6, '#FFFFFF' );
			$h = 17; $l = $h * $info[0] / $info[1]; if ( $l > 28 ) { $l = 28; $h = $l * $info[1] / $info[0]; }
			$pdf->jpeg( $logo, $x + 4 + ( 30 - $l ) / 2, $y + 4 + ( 19 - $h ) / 2, $l, $h );
		}
		$pdf->couleur( '#FFFFFF' )->police( true, 11 )->texte( $x + 37, $y + 11, $r['entreprise']['nom'] );
		$pdf->police( false, 8.5 )->texte( $x + 37, $y + 17.5, mb_strtoupper( $r['origine']['pays'] . ' → ' . $r['destination']['pays'] ) );
		$pdf->couleur( $c['gris'] )->police( true, 8 )->texte( $x, $y + 33, 'N° DE SUIVI', 'c', 95 );
		$pdf->couleur( $c['texte'] )->police( true, 25 )->texte( $x, $y + 44, $e['code'], 'c', 95 );
		$pdf->code128( $e['code'], $x + 6, $y + 48, 83, 21 );
		$pdf->rect_arrondi( $x + 6, $y + 74, 83, 13, 2, $c['p'] );
		$pdf->couleur( '#FFFFFF' )->police( true, 15 )->texte( $x, $y + 83, mb_strtoupper( $e['mode_nom'] ), 'c', 95 );
		$dest = $e['destinataire']['nom'] ? $e['destinataire']['nom'] : $e['client']['nom'];
		$pdf->couleur( $c['texte'] )->police( true, 11 )->texte( $x + 7, $y + 97, (string) $dest );
		$pdf->police( false, 9.5 )->texte( $x + 7, $y + 103, trim( $e['destinataire']['ville'] . ( $e['destinataire']['agence'] ? ' — agence ' . $e['destinataire']['agence'] : '' ) ) );
		$pdf->texte( $x + 7, $y + 108.5, $e['destinataire']['telephone'] ? $e['destinataire']['telephone'] : $e['client']['telephone'] );
		$pdf->trait( $x + 6, $y + 113, $x + 89, $y + 113, '#D1D5DB', .3 );
		$pdf->police( true, 20 )->texte( $x, $y + 127, 'Colis ' . ( $i + 1 ) . ' / ' . $total, 'c', 95 );
	}
	return $pdf->sortie();
}

/* ================================================================ reçu de paiement */
function cp_pdf_recu( array $e, array $r, $logo = '', $banniere = '' ) {
	$c = cp_doc_couleurs( $r );
	$pdf = new CP_PDF();
	$pdf->page();
	$p = $e['paiement'];
	$date = $p['date'] ? $p['date'] : time();
	$y = cp_doc_bandeau( $pdf, $r, $logo, $banniere );
	$y = cp_doc_titre( $pdf, $r, $y, 'REÇU DE PAIEMENT', 'N° Reçu', $e['recu'], cp_pdf_date( $date ) );
	$cl = $e['client'];
	$k = $e['calcul'];

	// 1. client / 2. envoi
	$cy = cp_doc_rubrique( $pdf, $r, 10, $y, 94, 38, 1, 'Reçu de', 'personne' );
	foreach ( array( array( 'Nom et Prénoms', $cl['nom'] ), array( 'Téléphone / WhatsApp', $cl['telephone'] ), array( 'E-mail', $cl['email'] ), array( 'Ville / Pays', $cl['ville'] ?? '' ) ) as $i => $l ) {
		cp_doc_ligne( $pdf, $r, 14, $cy + $i * 5.9, 86, $l[0], $l[1] );
	}
	$cy = cp_doc_rubrique( $pdf, $r, 106, $y, 94, 38, 2, 'Envoi concerné', 'colis' );
	$nb = 0;
	foreach ( $e['colis'] as $col ) { $nb += max( 1, (int) $col['nombre'] ); }
	$mesure = $k ? ( 'm3' === $k['unite'] ? cp_pdf_nombre( $k['facture'] ) . ' m³' : cp_pdf_nombre( $k['facture'], 1 ) . ' kg' ) : '';
	foreach ( array( array( 'N° de suivi', $e['code'] ), array( 'Mode', $e['mode_nom'] ), array( 'Trajet', $r['origine']['pays'] . ' → ' . $r['destination']['pays'] ), array( 'Colis', trim( ( $nb ? $nb . ' colis' : '' ) . ( $mesure ? ' · ' . $mesure . ' facturés' : '' ), ' ·' ) ) ) as $i => $l ) {
		cp_doc_ligne( $pdf, $r, 110, $cy + $i * 5.9, 86, $l[0], $l[1] );
	}
	$y += 41;

	// 3. détail du paiement
	$lignes = array();
	if ( $k ) {
		$q = 'm3' === $k['unite'] ? cp_pdf_nombre( $k['facture'] ) . ' m³' : cp_pdf_nombre( $k['facture'], 1 ) . ' kg';
		$lignes[] = array( 'Transport ' . $e['mode_nom'] . ( $e['contenu'] ? ' — ' . $e['contenu'] : '' ), $q, cp_pdf_prix( $k['prix_unite'], $r, false ), $k['transport'] );
		if ( $k['frais'] ) { $lignes[] = array( 'Frais de dossier', '1', cp_pdf_prix( $k['frais'], $r, false ), $k['frais'] ); }
		if ( $k['assurance'] ) { $lignes[] = array( 'Assurance', '', '', $k['assurance'] ); }
	}
	$montant = (float) ( $p['montant'] ? $p['montant'] : $e['montant'] );
	$somme = array_sum( array_column( $lignes, 3 ) );
	if ( ! $lignes ) {
		$lignes[] = array( 'Transport ' . $e['mode_nom'], '', '', $montant );
	} elseif ( abs( $montant - $somme ) > 1 ) {
		$lignes[] = array( $montant < $somme ? 'Remise' : 'Ajustement', '', '', $montant - $somme );
	}
	$h3 = 30 + 6.5 * max( 3, count( $lignes ) );
	$cy = cp_doc_rubrique( $pdf, $r, 10, $y, 190, $h3, 3, 'Détail du paiement', 'recu' );
	$cols = array( array( 'Désignation', 12, 96, 'g' ), array( 'Quantité', 108, 26, 'c' ), array( 'Prix unitaire', 134, 30, 'c' ), array( 'Montant (' . ( $r['entreprise']['devise'] ?? 'FCFA' ) . ')', 164, 34, 'c' ) );
	$ty = $cy - 3;
	$pdf->rect( 12, $ty, 186, 6.5, $c['p'] );
	$pdf->couleur( '#FFFFFF' )->police( true, 8.2 );
	foreach ( $cols as $col ) { $pdf->texte( $col[1] + ( 'g' === $col[3] ? 2 : 0 ), $ty + 4.5, $col[0], $col[3], $col[2] - 2 ); }
	$ly = $ty + 6.5;
	$nl = max( 3, count( $lignes ) );
	cp_doc_filigrane( $pdf, $logo, 12, $ly, 186, $nl * 6.5 );
	for ( $i = 0; $i < $nl; $i++ ) {
		$pdf->rect( 12, $ly, 186, 6.5, null, '#1F3A75', .25 );
		foreach ( $cols as $col ) { if ( $col[1] > 12 ) { $pdf->trait( $col[1], $ly, $col[1], $ly + 6.5, '#1F3A75', .25 ); } }
		if ( isset( $lignes[ $i ] ) ) {
			$l = $lignes[ $i ];
			$pdf->couleur( $c['texte'] )->police( false, 8.6 )->texte( 14, $ly + 4.5, $l[0] )->texte( 108, $ly + 4.5, $l[1], 'c', 26 )->texte( 134, $ly + 4.5, $l[2], 'c', 30 )->police( true, 8.6 )->texte( 164, $ly + 4.5, cp_pdf_prix( $l[3], $r, false ), 'd', 32 );
		}
		$ly += 6.5;
	}
	$pdf->rect_arrondi( 108, $ly + 2, 90, 9, 1.6, $c['p'] );
	$pdf->couleur( '#FFFFFF' )->police( true, 11.5 )->texte( 112, $ly + 8.2, 'TOTAL PAYÉ :' )->texte( 112, $ly + 8.2, cp_pdf_prix( $montant, $r ), 'd', 82 );
	$pdf->couleur( $c['texte'] )->police( false, 8.4 );
	$pdf->paragraphe( 14, $ly + 6.5, 92, 'Arrêté le présent reçu à la somme de : ' . cp_en_lettres( $montant ) . ' ' . ( $r['entreprise']['devise'] ?? 'FCFA' ) . '.', 3.9 );
	$y += $h3 + 3;

	// 4. moyen de paiement / 5. validation
	$hb = max( 46, 266 - $y );
	$cy = cp_doc_rubrique( $pdf, $r, 10, $y, 94, $hb, 4, 'Moyen de paiement', 'carte' );
	$moyen = mb_strtolower( (string) $p['moyen'] );
	$options = array( 'Orange Money', 'Moov Money', 'Wave', 'Espèces', 'Virement', 'Autre' );
	$connu = false;
	foreach ( $options as $i => $o ) {
		$coche = mb_strtolower( $o ) === $moyen;
		$connu = $connu || $coche;
		if ( 'Autre' === $o ) { $coche = ! $connu && '' !== $moyen; }
		cp_doc_case( $pdf, $r, 14 + ( $i % 3 ) * 30, $cy + 1 + intdiv( $i, 3 ) * 6.5, $coche, $o );
	}
	cp_doc_ligne( $pdf, $r, 14, $cy + 16, 86, 'Référence de la transaction', $p['reference'] );
	cp_doc_ligne( $pdf, $r, 14, $cy + 22, 86, 'Date du paiement', cp_pdf_date( $date, 'd/m/Y à H:i' ) );
	$cy = cp_doc_rubrique( $pdf, $r, 106, $y, 94, $hb, 5, 'Validation', 'presse' );
	$pdf->rect_arrondi( 112, $cy - 1, 36, 15, 1.6, null, '#0A7D33', 1.1 );
	$pdf->couleur( '#0A7D33' )->police( true, 17 )->texte( 112, $cy + 7.5, 'PAYÉ', 'c', 36 );
	$pdf->police( false, 7 )->texte( 112, $cy + 12, cp_pdf_date( $date ), 'c', 36 );
	$pdf->couleur( $c['texte'] )->police( false, 7.8 );
	$pdf->paragraphe( 151, $cy + 1, 45, 'Conservez ce reçu : il vous sera demandé au retrait de vos colis.', 3.6 );
	$pdf->rect_arrondi( 109, $cy + 17, 43, $hb - 35, 1.6, '#FFFFFF', '#374151', .35 );
	$pdf->rect_arrondi( 154, $cy + 17, 43, $hb - 35, 1.6, '#FFFFFF', '#374151', .35 );
	$pdf->police( true, 7.4 )->texte( 109, $cy + 20.5, 'Signature ' . mb_strtoupper( $r['entreprise']['nom'] ), 'c', 43 )->texte( 154, $cy + 20.5, 'Signature du client', 'c', 43 );
	if ( ! empty( $e['lien_suivi'] ) ) {
		$pdf->couleur( $c['texte'] )->police( false, 8 )->texte( 14, $cy + 30, 'Suivi en ligne :' );
		$pdf->couleur( $c['p'] )->police( true, 7.2 );
		$pdf->paragraphe( 14, $cy + 34.5, 86, $e['lien_suivi'], 3.3 );
	}
	cp_doc_pied( $pdf, $r );
	return $pdf->sortie();
}
