<?php
/**
 * Réglages de la plateforme : identité de l'entreprise, couleurs, tarifs, délais, paiements, étapes de suivi.
 * Tout est stocké dans l'option « cp_reglages » et se modifie depuis l'assistant (Cargo → Assistant).
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function cp_reglages_defaut() {
	return array(
		'entreprise' => array(
			'nom'        => get_bloginfo( 'name' ) ?: 'Ma société cargo',
			'slogan'     => 'De la Chine à votre porte',
			'logo_id'    => 0,
			'telephone'  => '',
			'telephone_chine' => '',
			'whatsapp'   => '',
			'email'      => get_option( 'admin_email' ),
			'adresse'    => '',
			'rccm'       => '',
			'ifu'        => '',
			'devise'     => 'FCFA',
			'devise_courte' => 'F',
			'mentions'   => 'Rapidité • Sécurité • Fiabilité',
		),
		'couleurs'   => array(
			'primaire'   => '#0B3C5D',
			'accent'     => '#F2A900',
			'fond'       => '#F5F7FA',
			'bouton'     => '#F47B20',   // boutons d'action (Expédier, Demander un devis)
			'fonce'      => '',          // bandeaux sombres ; vide = calculé depuis la couleur principale
		),
		'origine'    => array(
			'pays'      => 'Chine',
			'entrepot'  => "Entrepôt de Guangzhou\n(adresse complète à renseigner)",
			'entrepot_image' => 0,   // image de l'adresse (écrite en chinois), créée par l'assistant pour les PDF
			'contact'   => '',
		),
		'destination' => array(
			'pays'     => 'Burkina Faso',
			'agences'  => array(
				array( 'ville' => 'Ouagadougou', 'adresse' => '', 'telephone' => '' ),
			),
		),
		// prix par unité (kg ou m³) ; minimum = quantité minimale facturée ; délais en jours ; diviseur volumétrique (aérien) ;
		// prix_alt : second tarif facultatif (ex. « paiement sur place ») ; entrepot : adresse propre à ce mode (sinon celle de l'origine)
		'modes'      => array(
			array( 'id' => 'aerien', 'nom' => 'Aérien', 'unite' => 'kg', 'prix' => 9000, 'minimum' => 1, 'delai_min' => 7, 'delai_max' => 14, 'actif' => 1, 'diviseur' => 6000, 'description' => '', 'entrepot' => '', 'entrepot_image' => 0, 'prix_alt' => 0, 'prix_alt_libelle' => '' ),
			array( 'id' => 'express', 'nom' => 'Aérien express', 'unite' => 'kg', 'prix' => 12000, 'minimum' => 1, 'delai_min' => 4, 'delai_max' => 7, 'actif' => 1, 'diviseur' => 6000, 'description' => '', 'entrepot' => '', 'entrepot_image' => 0, 'prix_alt' => 0, 'prix_alt_libelle' => '' ),
			array( 'id' => 'maritime', 'nom' => 'Maritime', 'unite' => 'm3', 'prix' => 250000, 'minimum' => 0.1, 'delai_min' => 45, 'delai_max' => 60, 'actif' => 1, 'diviseur' => 0, 'description' => '', 'entrepot' => '', 'entrepot_image' => 0, 'prix_alt' => 0, 'prix_alt_libelle' => '' ),
		),
		'categories' => array( 'Colis', 'Marchandises', 'Biens personnels' ),
		'consigne_colis' => 'Écrivez votre code d\'envoi et le mode d\'envoi sur chaque carton.',
		// image : identifiant de la médiathèque ou adresse web ; lien : page (tarifs, simulateur, suivi, declarer, boutique,
		// whatsapp) ou adresse web ; icone : voir cp_icone()
		'services'   => array(
			array( 'titre' => 'Fret aérien', 'texte' => 'Vos colis par avion, au kilo.', 'icone' => 'avion', 'image' => 0, 'lien' => 'tarifs' ),
			array( 'titre' => 'Fret maritime', 'texte' => 'Vos marchandises par bateau, au mètre cube.', 'icone' => 'bateau', 'image' => 0, 'lien' => 'tarifs' ),
			array( 'titre' => 'Suivi de colis', 'texte' => 'Suivez chaque étape avec votre code d\'envoi.', 'icone' => 'suivi', 'image' => 0, 'lien' => 'suivi' ),
		),
		// page d'accueil : textes vides = textes calculés depuis le trajet et les tarifs
		'site'       => array(
			'bandeau'        => '',
			'horaires'       => '',              // ex. Lun – Sam, 8 h – 18 h
			'hero_surtitre'  => '',
			'hero_titre'     => '',
			'hero_titre_fin' => '',
			'hero_texte'     => '',
			'hero_images'    => array(),     // 1 à 3 photos (la première en grand)
			'signature'      => '',          // phrase manuscrite sur la photo
			'chiffres'       => array(),     // [ valeur, libelle ] × 3 ; vide = calculés depuis les tarifs
			'pourquoi_titre' => 'Un partenaire logistique de confiance',
			'pourquoi_texte' => 'Une équipe au départ et à l\'arrivée, des prix clairs et un suivi de chaque colis : vous savez toujours où en est votre envoi.',
			'pourquoi_image' => 0,
			'pourquoi_points' => array(
				array( 'icone' => 'suivi', 'titre' => 'Suivi à chaque étape', 'texte' => 'Un code par envoi et un e-mail à chaque étape.' ),
				array( 'icone' => 'bouclier', 'titre' => 'Colis en sécurité', 'texte' => 'Pesés, étiquetés et suivis jusqu\'à la remise.' ),
				array( 'icone' => 'equipe', 'titre' => 'Une équipe des deux côtés', 'texte' => 'À l\'entrepôt de départ comme à l\'agence d\'arrivée.' ),
				array( 'icone' => 'paiement', 'titre' => 'Paiement simple', 'texte' => 'Mobile Money ou sur place, avec un reçu à chaque paiement.' ),
			),
			'avis'           => array(),     // [ nom, role, texte, note ] : seulement de vrais avis de clients
			'reseaux'        => array( 'facebook' => '', 'instagram' => '', 'tiktok' => '', 'youtube' => '', 'linkedin' => '' ),
		),
		'frais'      => array(
			'fixe'       => 0,     // frais de dossier par envoi
			'assurance'  => 0,     // % de la valeur déclarée (0 = pas d'assurance)
		),
		'paiement'   => array(
			'orange_money' => '',
			'moov_money'   => '',
			'wave'         => '',
			'autres'       => '',
			'consignes'    => 'Envoyez le montant au numéro indiqué, puis envoyez la capture du paiement sur WhatsApp avec votre code d\'envoi.',
		),
		'documents'  => array( 'banniere' => 0, 'services' => '', 'accroche' => '', 'pied' => '' ),
		'etapes'     => cp_etapes_defaut(),
		'code'       => array( 'prefixe' => 'CRG' ),
	);
}

/** Étapes de suivi d'un envoi, dans l'ordre. */
function cp_etapes_defaut() {
	return array(
		array( 'id' => 'declare', 'nom' => 'Envoi déclaré', 'texte' => 'Votre envoi est enregistré. Faites livrer vos colis à notre entrepôt en Chine avec votre code sur chaque carton.' ),
		array( 'id' => 'recu', 'nom' => 'Reçu à l\'entrepôt', 'texte' => 'Vos colis sont arrivés à notre entrepôt : ils ont été pesés et mesurés.' ),
		array( 'id' => 'expedie', 'nom' => 'Expédié', 'texte' => 'Vos colis ont quitté la Chine.' ),
		array( 'id' => 'transit', 'nom' => 'En transit', 'texte' => 'Vos colis sont en route.' ),
		array( 'id' => 'arrive', 'nom' => 'Arrivé à destination', 'texte' => 'Vos colis sont arrivés et passent le dédouanement.' ),
		array( 'id' => 'disponible', 'nom' => 'Disponible au retrait', 'texte' => 'Vos colis vous attendent à l\'agence.' ),
		array( 'id' => 'livre', 'nom' => 'Livré', 'texte' => 'Vos colis ont été remis. Merci de votre confiance !' ),
	);
}

/** Réglages fusionnés avec les valeurs par défaut (les clés manquantes sont complétées). */
function cp_reglages() {
	static $source = null, $r = null;
	$o = get_option( 'cp_reglages', array() );
	if ( null === $r || $o !== $source ) {      // relu si l'option a changé pendant la requête (import, assistant)
		$source = $o;
		$r = cp_fusion( cp_reglages_defaut(), (array) $o );
	}
	return $r;
}

function cp_fusion( $defaut, $valeurs ) {
	foreach ( $valeurs as $k => $v ) {
		if ( is_array( $v ) && isset( $defaut[ $k ] ) && is_array( $defaut[ $k ] ) && ! array_is_list_cp( $defaut[ $k ] ) ) {
			$defaut[ $k ] = cp_fusion( $defaut[ $k ], $v );
		} else {
			$defaut[ $k ] = $v;
		}
	}
	return $defaut;
}

function array_is_list_cp( $a ) {
	return array_keys( $a ) === range( 0, count( $a ) - 1 );
}

function cp_r( $chemin, $defaut = '' ) {
	$v = cp_reglages();
	foreach ( explode( '.', $chemin ) as $k ) {
		if ( ! is_array( $v ) || ! array_key_exists( $k, $v ) ) {
			return $defaut;
		}
		$v = $v[ $k ];
	}
	return $v;
}

function cp_modes_actifs() {
	return array_values( array_filter( (array) cp_r( 'modes', array() ), function ( $m ) {
		return ! empty( $m['actif'] );
	} ) );
}

function cp_mode( $id ) {
	foreach ( (array) cp_r( 'modes', array() ) as $m ) {
		if ( $m['id'] === $id ) {
			return $m;
		}
	}
	return null;
}

function cp_etapes() {
	$e = cp_r( 'etapes', array() );
	return $e ? $e : cp_etapes_defaut();
}

function cp_etape( $id ) {
	foreach ( cp_etapes() as $e ) {
		if ( $e['id'] === $id ) {
			return $e;
		}
	}
	return null;
}

/** Adresse de l'entrepôt de départ pour un mode (celle du mode si elle existe, sinon celle de l'origine). */
function cp_entrepot( $mode_id ) {
	$m = cp_mode( $mode_id );
	if ( $m && ! empty( $m['entrepot'] ) ) {
		return array( 'texte' => $m['entrepot'], 'image' => (int) ( $m['entrepot_image'] ?? 0 ) );
	}
	return array( 'texte' => cp_r( 'origine.entrepot' ), 'image' => (int) cp_r( 'origine.entrepot_image', 0 ) );
}

function cp_logo_url( $taille = 'medium' ) {
	$id = (int) cp_r( 'entreprise.logo_id' );
	return $id ? wp_get_attachment_image_url( $id, $taille ) : '';
}

function cp_prix( $montant ) {
	return number_format( (float) $montant, 0, ',', "\u{202F}" ) . "\u{00A0}" . cp_r( 'entreprise.devise', 'FCFA' );
}

function cp_whatsapp_lien( $message = '', $numero = '' ) {
	$numero = preg_replace( '/\D+/', '', $numero ? $numero : cp_r( 'entreprise.whatsapp' ) );
	return $numero ? 'https://wa.me/' . $numero . ( $message ? '?text=' . rawurlencode( $message ) : '' ) : '';
}

/** Adresse d'une image réglée par identifiant de la médiathèque ou par adresse web. */
function cp_image_url( $v, $taille = 'large' ) {
	if ( is_numeric( $v ) && (int) $v > 0 ) {
		return (string) wp_get_attachment_image_url( (int) $v, $taille );
	}
	return is_string( $v ) && preg_match( '#^(https?:)?//#', $v ) ? $v : '';
}

/** « au Burkina Faso », « en Côte d'Ivoire », « aux Comores ». */
function cp_au_pays( $pays ) {
	$pays = trim( (string) $pays );
	$sans = strtolower( remove_accents( $pays ) );
	if ( preg_match( '/^(etats|emirats|comores|pays-bas|philippines|seychelles)/', $sans ) ) {
		return 'aux ' . $pays;
	}
	$masculins = array( 'mexique', 'cambodge', 'mozambique', 'zimbabwe', 'belize' );
	if ( preg_match( '/^[aeiouy]/', $sans ) || ( 'e' === substr( strtok( $sans, ' ' ), -1 ) && ! in_array( strtok( $sans, ' ' ), $masculins, true ) ) ) {
		return 'en ' . $pays;
	}
	return 'au ' . $pays;
}

/** « de Chine », « du Burkina Faso », « d'Inde », « des États-Unis ». */
function cp_de_pays( $pays ) {
	$a = cp_au_pays( $pays );
	if ( 0 === strpos( $a, 'aux ' ) ) {
		return 'des ' . $pays;
	}
	if ( 0 === strpos( $a, 'au ' ) ) {
		return 'du ' . $pays;
	}
	return preg_match( '/^[aeiouy]/', strtolower( remove_accents( $pays ) ) ) ? "d'" . $pays : 'de ' . $pays;
}

/** Délai court : « 3–7 j », « 2–3 sem. », « ≈ 2 mois ». */
function cp_delai_court( $m ) {
	$a = (int) $m['delai_min'];
	$b = (int) $m['delai_max'];
	if ( $a >= 45 ) {
		return '≈ ' . round( ( $a + $b ) / 60 ) . ' mois';
	}
	if ( $a >= 14 && 0 === $a % 7 && 0 === $b % 7 ) {
		return ( $a / 7 ) . '–' . ( $b / 7 ) . ' sem.';
	}
	return $a === $b ? $a . ' j' : $a . '–' . $b . ' j';
}

/** Nom court d'un mode : « Avion — Express » → « Express ». */
function cp_nom_court( $m ) {
	$p = preg_split( '/\s+[—–-]\s+/u', $m['nom'] );
	return trim( end( $p ) );
}

/** Chiffres de la page d'accueil : ceux de l'assistant, sinon calculés depuis les tarifs (aucun chiffre inventé). */
function cp_chiffres() {
	$c = array_values( array_filter( (array) cp_r( 'site.chiffres', array() ), function ( $x ) {
		return '' !== trim( (string) ( $x['valeur'] ?? '' ) );
	} ) );
	if ( $c ) {
		return array_slice( $c, 0, 3 );
	}
	$modes = cp_modes_actifs();
	if ( ! $modes ) {
		return array();
	}
	$c = array( array( 'valeur' => (string) count( $modes ), 'libelle' => count( $modes ) > 1 ? 'modes d\'envoi' : 'mode d\'envoi' ) );
	$kg = array_filter( $modes, function ( $m ) {
		return 'kg' === $m['unite'];
	} );
	$base = $kg ? $kg : $modes;
	usort( $base, function ( $x, $y ) {
		return $x['prix'] <=> $y['prix'];
	} );
	$c[] = array( 'valeur' => number_format( (float) $base[0]['prix'], 0, ',', "\u{202F}" ) . ' ' . cp_r( 'entreprise.devise_courte', 'F' ), 'libelle' => ( $kg ? 'le kilo en ' : 'le m³ en ' ) . cp_nom_court( $base[0] ) );
	usort( $modes, function ( $x, $y ) {
		return $x['delai_min'] <=> $y['delai_min'];
	} );
	$c[] = array( 'valeur' => cp_delai_court( $modes[0] ), 'libelle' => 'en ' . cp_nom_court( $modes[0] ) );
	return $c;
}

/** Délais regroupés : [ « 3–7 j », « Express » ], [ « 2–3 sem. », « MCO · LTA » ]… */
function cp_delais_groupes() {
	$g = array();
	$modes = cp_modes_actifs();
	usort( $modes, function ( $x, $y ) {
		return $x['delai_min'] <=> $y['delai_min'];
	} );
	foreach ( $modes as $m ) {
		$g[ cp_delai_court( $m ) ][] = cp_nom_court( $m );
	}
	$r = array();
	foreach ( $g as $d => $noms ) {
		$r[] = array( 'valeur' => $d, 'libelle' => implode( ' · ', $noms ) );
	}
	return array_slice( $r, 0, 3 );
}
