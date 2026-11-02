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
			'mentions'   => 'Rapidité • Sécurité • Fiabilité',
		),
		'couleurs'   => array(
			'primaire'   => '#0B3C5D',
			'accent'     => '#F2A900',
			'fond'       => '#F5F7FA',
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
		'services'   => array(
			array( 'titre' => 'Fret aérien', 'texte' => 'Vos colis par avion, au kilo.' ),
			array( 'titre' => 'Fret maritime', 'texte' => 'Vos marchandises par bateau, au mètre cube.' ),
			array( 'titre' => 'Suivi de colis', 'texte' => 'Suivez chaque étape avec votre code d\'envoi.' ),
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
