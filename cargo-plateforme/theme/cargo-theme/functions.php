<?php
/**
 * Cargo Thème : réglages d'affichage. Le contenu (logo, couleurs, coordonnées) vient de l'extension Cargo Plateforme.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'after_setup_theme', function () {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
	add_theme_support( 'woocommerce' );
	add_theme_support( 'wc-product-gallery-zoom' );
	add_theme_support( 'wc-product-gallery-lightbox' );
	register_nav_menus( array( 'principal' => 'Menu principal' ) );
} );

// après les styles de WooCommerce (priorité 10), que le thème remplace
add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_style( 'cargo-theme-police', 'https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Poppins:wght@400;500;600;700;800&display=swap', array(), null );
	wp_enqueue_style( 'cargo-theme', get_stylesheet_uri(), array(), '2.0.0' );
	if ( function_exists( 'cp_css_couleurs' ) ) {
		wp_add_inline_style( 'cargo-theme', cp_css_couleurs() );
	}
}, 20 );

function ct_r( $chemin, $defaut = '' ) {
	return function_exists( 'cp_r' ) ? cp_r( $chemin, $defaut ) : $defaut;
}

function ct_icone( $nom ) {
	return function_exists( 'cp_icone' ) ? cp_icone( $nom ) : '';
}

/** Menu par défaut (si aucun menu n'est défini dans Apparence → Menus). */
function ct_liens() {
	$l = array();
	if ( function_exists( 'cp_url_page' ) ) {
		$l[] = array( 'Accueil', home_url( '/' ) );
		$l[] = array( 'Services', home_url( '/#services' ) );
		$l[] = array( 'Tarifs', cp_url_page( 'tarifs' ) );
		$l[] = array( 'Simulateur', cp_url_page( 'simulateur' ) );
		$l[] = array( 'Suivi', cp_url_page( 'suivi' ) );
		if ( function_exists( 'wc_get_page_permalink' ) ) {
			$l[] = array( 'Boutique', wc_get_page_permalink( 'shop' ) );
		}
		$l[] = array( 'Contact', '#contact' );
	}
	return $l;
}
