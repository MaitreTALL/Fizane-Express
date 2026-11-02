<?php
/**
 * Calcul des tarifs et des délais (le même calcul est refait en JavaScript dans assets/cargo.js pour le simulateur).
 *
 * Aérien : poids facturé = le plus grand du poids réel et du poids volumétrique (L × l × h en cm ÷ diviseur),
 *          arrondi au demi-kilo supérieur, avec un minimum.
 * Maritime : volume facturé en m³ (L × l × h en cm ÷ 1 000 000), arrondi au centième supérieur, avec un minimum.
 */
if ( ! defined( 'ABSPATH' ) && ! defined( 'CP_TEST' ) ) {
	exit;
}

/**
 * @param array $mode   un mode de transport des réglages (unite, prix, minimum, diviseur, délais)
 * @param array $colis  liste de colis : poids (kg), longueur, largeur, hauteur (cm), nombre
 * @param array $frais  fixe (par envoi), assurance (% de la valeur déclarée)
 * @param float $valeur valeur déclarée de la marchandise (pour l'assurance)
 */
function cp_calcul_tarif( array $mode, array $colis, array $frais = array(), $valeur = 0 ) {
	$poids = 0.0;
	$volume_cm3 = 0.0;
	foreach ( $colis as $c ) {
		$n = max( 1, (int) ( $c['nombre'] ?? 1 ) );
		$poids += max( 0, (float) ( $c['poids'] ?? 0 ) ) * $n;
		$volume_cm3 += max( 0, (float) ( $c['longueur'] ?? 0 ) ) * max( 0, (float) ( $c['largeur'] ?? 0 ) ) * max( 0, (float) ( $c['hauteur'] ?? 0 ) ) * $n;
	}
	$res = array(
		'mode'       => $mode['id'],
		'nom'        => $mode['nom'],
		'unite'      => $mode['unite'],
		'poids'      => round( $poids, 2 ),
		'volume'     => round( $volume_cm3 / 1e6, 3 ),
		'prix_unite' => (float) $mode['prix'],
		'delai_min'  => (int) $mode['delai_min'],
		'delai_max'  => (int) $mode['delai_max'],
	);
	if ( 'm3' === $mode['unite'] ) {
		$q = ceil( $volume_cm3 / 1e6 * 100 - 1e-9 ) / 100;
		$res['volumetrique'] = null;
		$res['facture'] = max( $q, (float) $mode['minimum'] );
	} else {
		$vol = ! empty( $mode['diviseur'] ) ? $volume_cm3 / (float) $mode['diviseur'] : 0;
		$res['volumetrique'] = round( $vol, 2 );
		$q = max( $poids, $vol );
		$q = ceil( $q * 2 - 1e-9 ) / 2;                       // demi-kilo supérieur
		$res['facture'] = max( $q, (float) $mode['minimum'] );
	}
	$res['transport'] = round( $res['facture'] * $res['prix_unite'] );
	$res['frais'] = round( (float) ( $frais['fixe'] ?? 0 ) );
	$res['assurance'] = round( (float) $valeur * (float) ( $frais['assurance'] ?? 0 ) / 100 );
	$res['total'] = $res['transport'] + $res['frais'] + $res['assurance'];
	// second tarif facultatif du même mode (ex. « paiement sur place »)
	if ( ! empty( $mode['prix_alt'] ) ) {
		$res['prix_alt'] = (float) $mode['prix_alt'];
		$res['prix_alt_libelle'] = (string) ( $mode['prix_alt_libelle'] ?? '' );
		$res['total_alt'] = round( $res['facture'] * $res['prix_alt'] ) + $res['frais'] + $res['assurance'];
	}
	return $res;
}

/** Dates d'arrivée estimées à partir d'une date de départ (timestamp). */
function cp_dates_estimees( $mode, $depart = null ) {
	$depart = $depart ? $depart : time();
	return array( $depart + (int) $mode['delai_min'] * DAY_IN_SECONDS_CP, $depart + (int) $mode['delai_max'] * DAY_IN_SECONDS_CP );
}

if ( ! defined( 'DAY_IN_SECONDS_CP' ) ) {
	define( 'DAY_IN_SECONDS_CP', 86400 );
}
