<?php
/**
 * Import des produits d'usine dans la boutique Tondraaga (copié temporairement à la racine du site, protégé par un jeton,
 * supprimé à la fin de l'import). Chaque appel importe des produits pendant « budget » secondes, puis rend la main ;
 * un produit déjà importé (méta _tdg_source) n'est jamais recréé.
 * Données : ../tdg-import/liste.json (web/produits/import-usines.json) et photos-choisies.json.
 */
if ( ! isset( $_SERVER['HTTP_X_TDG_JETON'] ) || ! hash_equals( '__JETON__', (string) $_SERVER['HTTP_X_TDG_JETON'] ) ) {
	http_response_code( 404 );
	exit;
}
@set_time_limit( 120 );
define( 'WP_USE_THEMES', false );
require __DIR__ . '/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
header( 'Content-Type: application/json; charset=utf-8' );

$admins = get_users( array( 'role' => 'administrator', 'number' => 1, 'orderby' => 'ID', 'fields' => 'ID' ) );
wp_set_current_user( (int) $admins[0] );
$dir    = dirname( __DIR__ ) . '/tdg-import/';
$liste  = json_decode( file_get_contents( $dir . 'liste.json' ), true );
$photos = json_decode( file_get_contents( $dir . 'photos-choisies.json' ), true );
$exclus = (array) $photos['_exclus'];
$budget = min( 50, max( 5, (float) ( $_GET['budget'] ?? 40 ) ) );
$debut  = microtime( true );

// catégories des deux rayons
$cat = function ( $slug, $nom, $parent = 0 ) {
	$t = get_term_by( 'slug', $slug, 'product_cat' );
	if ( $t ) {
		return (int) $t->term_id;
	}
	$r = wp_insert_term( $nom, 'product_cat', array( 'slug' => $slug, 'parent' => $parent ) );
	return is_wp_error( $r ) ? 0 : (int) $r['term_id'];
};
$parents = array( 'electromenager' => $cat( 'electromenager', 'Électroménager & électronique' ), 'vehicules' => $cat( 'vehicules', 'Véhicules & engins' ) );
$noms = array( 'vehicules-motos' => 'Motos & scooters électriques', 'vehicules-tricycles' => 'Tricycles', 'vehicules-voitures' => 'Voiturettes & voitures électriques', 'vehicules-utilitaires' => 'Utilitaires & dumpers', 'vehicules-engins' => 'Engins & tracteurs', 'vehicules-pieces' => 'Pièces & équipements' );
foreach ( $noms as $s => $n ) {
	$cat( $s, $n, $parents['vehicules'] );
}

// photo du fabricant : réduite à 1 000 px, fond blanc, JPEG, dans la médiathèque
$image = function ( $url, $titre ) {
	$r = wp_remote_get( $url, array( 'timeout' => 30, 'headers' => array( 'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0', 'Referer' => 'https://fr.aliexpress.com/' ) ) );
	if ( is_wp_error( $r ) || 200 !== (int) wp_remote_retrieve_response_code( $r ) ) {
		return 0;
	}
	$s = @imagecreatefromstring( wp_remote_retrieve_body( $r ) );
	if ( ! $s ) {
		return 0;
	}
	$w = imagesx( $s );
	$h = imagesy( $s );
	$k = min( 1, 1000 / max( $w, $h ) );
	$d = imagecreatetruecolor( max( 1, (int) round( $w * $k ) ), max( 1, (int) round( $h * $k ) ) );
	imagefill( $d, 0, 0, imagecolorallocate( $d, 255, 255, 255 ) );
	imagecopyresampled( $d, $s, 0, 0, 0, 0, imagesx( $d ), imagesy( $d ), $w, $h );
	$tmp = wp_tempnam( 'tdg' );
	imagejpeg( $d, $tmp, 84 );
	imagedestroy( $s );
	imagedestroy( $d );
	$id = media_handle_sideload( array( 'name' => sanitize_title( $titre ) . '.jpg', 'tmp_name' => $tmp ), 0, $titre );
	if ( is_wp_error( $id ) ) {
		@unlink( $tmp );
		return 0;
	}
	return (int) $id;
};

$premier = array();
foreach ( $liste as $i => $p ) {
	if ( ! in_array( $i, $exclus, true ) && ! isset( $premier[ $p['sous'] ] ) ) {
		$premier[ $p['sous'] ] = $i;
	}
}
$coef = function_exists( 'tdg_us_coef' ) ? tdg_us_coef() : 1.8;
$faits = array();
$erreurs = array();
foreach ( $liste as $i => $p ) {
	if ( in_array( $i, $exclus, true ) ) {
		continue;
	}
	if ( microtime( true ) - $debut > $budget ) {
		break;
	}
	$deja = get_posts( array( 'post_type' => 'product', 'post_status' => 'any', 'meta_key' => '_tdg_source', 'meta_value' => (string) $p['source'], 'fields' => 'ids', 'numberposts' => 1 ) );
	if ( $deja ) {
		continue;
	}
	$choix = $photos[ (string) $i ] ?? array( 'principale' => $p['image'], 'galerie' => array() );
	$img = $image( $choix['principale'], $p['nom'] );
	if ( ! $img ) {
		$erreurs[] = $i . ' : photo';
		continue;
	}
	$galerie = array();
	foreach ( (array) $choix['galerie'] as $k => $u ) {
		$g = $image( $u, $p['nom'] . ' — ' . ( $k + 2 ) );
		if ( $g ) {
			$galerie[] = $g;
		}
	}
	$sous = $cat( $p['sous'], $p['sous'], $parents[ $p['rayon'] ] );
	$prod = new WC_Product_Simple();
	$prod->set_name( $p['nom'] );
	$prod->set_status( 'publish' );
	$prod->set_catalog_visibility( 'visible' );
	$prod->set_short_description( $p['texte'] );
	$prod->set_description( '<p>' . esc_html( $p['texte'] ) . '</p><p>' . ( $p['devis']
		? 'Importé directement de l’usine, sur devis : prix rendu Ouagadougou (transport et dédouanement compris) et délai communiqués sur WhatsApp. Acompte à la commande, solde à la livraison.'
		: 'Produit commandé directement à l’usine pour vous, puis transporté jusqu’à Ouagadougou : environ 3 à 8 semaines selon le mode de transport (avion ou bateau). Paiement par Orange Money ou Wave.' )
		. '</p><p>Photos du fabricant : la couleur et certains détails peuvent varier selon le modèle livré.</p>' );
	$prod->set_category_ids( array_filter( array( $parents[ $p['rayon'] ], $sous ) ) );
	if ( ! $p['devis'] && function_exists( 'tdg_us_prix' ) ) {
		$prod->set_regular_price( (string) tdg_us_prix( $p['prix_eur'], $coef ) );
	}
	$prod->set_stock_status( 'instock' );
	$prod->set_featured( $premier[ $p['sous'] ] === $i );
	$prod->set_image_id( $img );
	$prod->set_gallery_image_ids( $galerie );
	$prod->update_meta_data( '_tdg_source', (string) $p['source'] );
	$prod->update_meta_data( '_tdg_source_lien', $p['lien'] );
	$prod->update_meta_data( '_tdg_prix_fournisseur_eur', (float) $p['prix_eur'] );
	$prod->update_meta_data( '_tdg_titre_fournisseur', $p['fournisseur'] );
	$prod->update_meta_data( '_tdg_devis', $p['devis'] ? '1' : '' );
	$prod->update_meta_data( '_tdg_prix_auto', $p['devis'] ? '' : '1' );
	$id = $prod->save();
	$faits[] = $i . ' → ' . $id;
}
$importes = count( get_posts( array( 'post_type' => 'product', 'post_status' => 'any', 'meta_key' => '_tdg_source', 'fields' => 'ids', 'numberposts' => -1 ) ) );
delete_transient( 'tdg_catalogue_v2' );
delete_transient( 'tdg_am_sous_cats' );
echo wp_json_encode( array( 'faits' => $faits, 'erreurs' => $erreurs, 'importes' => $importes, 'total' => count( $liste ) - count( $exclus ), 'duree' => round( microtime( true ) - $debut, 1 ) ), JSON_UNESCAPED_UNICODE );
