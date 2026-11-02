<?php
/**
 * Boutique de l'entreprise (WooCommerce, un seul vendeur : pas de place de marché).
 * - réglages préparés une fois : franc CFA sans décimales, Burkina Faso, kg / cm, panier et paiement classiques ;
 * - fiche produit : lieu du produit (à faire venir ou déjà sur place), location à la journée, prix sur demande ;
 * - paiement direct Mobile Money : inc/boutique-paiement.php ; transport cargo : inc/boutique-livraison.php.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/boutique-livraison.php';
require_once __DIR__ . '/boutique-paiement.php';

function cp_boutique_active() {
	return class_exists( 'WooCommerce' ) && function_exists( 'wc_get_page_permalink' );
}

/* ---------------------------------------------------------------- réglages de WooCommerce (une fois) */
add_action( 'admin_init', function () {
	if ( cp_boutique_active() && '1' !== get_option( 'cp_boutique_prete' ) && current_user_can( 'manage_woocommerce' ) ) {
		cp_boutique_preparer();
	}
} );

function cp_boutique_preparer() {
	if ( in_array( get_option( 'woocommerce_currency' ), array( '', 'USD', 'EUR', 'GBP' ), true ) ) {
		update_option( 'woocommerce_currency', 'XOF' );
	}
	if ( in_array( get_option( 'woocommerce_default_country' ), array( '', 'US:CA', 'GB', 'FR' ), true ) ) {
		update_option( 'woocommerce_default_country', 'BF' );
	}
	update_option( 'woocommerce_price_num_decimals', 0 );
	update_option( 'woocommerce_price_thousand_sep', ' ' );
	update_option( 'woocommerce_price_decimal_sep', ',' );
	update_option( 'woocommerce_currency_pos', 'right_space' );
	update_option( 'woocommerce_weight_unit', 'kg' );
	update_option( 'woocommerce_dimension_unit', 'cm' );
	if ( 'disabled' === get_option( 'woocommerce_ship_to_countries' ) ) {
		update_option( 'woocommerce_ship_to_countries', '' );
	}
	// panier et paiement « classiques » : les moyens de paiement Mobile Money y affichent leurs étapes et leurs champs
	foreach ( array( 'cart' => '[woocommerce_cart]', 'checkout' => '[woocommerce_checkout]' ) as $page => $code ) {
		$id = wc_get_page_id( $page );
		$p = $id > 0 ? get_post( $id ) : null;
		if ( $p && false !== strpos( (string) $p->post_content, '<!-- wp:woocommerce/' ) ) {
			wp_update_post( array( 'ID' => $id, 'post_content' => $code ) );
		}
	}
	update_option( 'cp_boutique_prete', '1' );
}

// « FCFA » plutôt que « CFA »
add_filter( 'woocommerce_currency_symbol', function ( $s, $devise ) {
	return 'XOF' === $devise ? ( cp_r( 'entreprise.devise' ) ?: 'FCFA' ) : $s;
}, 10, 2 );

/* ---------------------------------------------------------------- fiche produit (administration) */
add_action( 'woocommerce_product_options_pricing', function () {
	woocommerce_wp_checkbox( array( 'id' => '_cp_location', 'label' => 'Location', 'description' => 'Prix par jour : la quantité commandée est le nombre de jours.' ) );
} );

add_action( 'woocommerce_product_options_shipping', function () {
	woocommerce_wp_select( array(
		'id'      => '_cp_lieu',
		'label'   => 'Où est le produit ?',
		'options' => array(
			''      => 'En ' . cp_r( 'origine.pays' ) . ' : expédié par cargo (transport calculé)',
			'local' => 'Déjà ' . cp_au_pays( cp_r( 'destination.pays' ) ) . ' : retrait à l\'agence',
		),
		'desc_tip'    => true,
		'description' => 'Pour calculer le transport, indiquez le poids (kg) et les dimensions (cm) emballé. Sans ces valeurs, le transport est payé à l\'arrivée, après pesée.',
	) );
} );

add_action( 'woocommerce_admin_process_product_object', function ( $p ) {
	$p->update_meta_data( '_cp_lieu', 'local' === ( $_POST['_cp_lieu'] ?? '' ) ? 'local' : '' ); // phpcs:ignore -- nonce vérifié par WooCommerce
	$p->update_meta_data( '_cp_location', isset( $_POST['_cp_location'] ) ? 'yes' : '' ); // phpcs:ignore
} );

/* ---------------------------------------------------------------- affichage */
function cp_est_location( $p ) {
	$p = $p && $p->get_parent_id() ? wc_get_product( $p->get_parent_id() ) : $p;
	return $p && 'yes' === $p->get_meta( '_cp_location' );
}

add_filter( 'woocommerce_get_price_html', function ( $html, $p ) {
	return $html && cp_est_location( $p ) ? $html . ' <small class="cp-par-jour">/ jour</small>' : $html;
}, 10, 2 );

add_filter( 'woocommerce_empty_price_html', function () {
	return '<span class="cp-sur-demande">Prix sur demande</span>';
} );

function cp_lien_demande( $p ) {
	return cp_whatsapp_lien( 'Bonjour ' . cp_r( 'entreprise.nom' ) . ', je voudrais le prix de : ' . $p->get_name() . ' (' . get_permalink( $p->get_id() ) . ')' );
}

// produit sans prix : « Demander le prix » sur WhatsApp au lieu de « Ajouter au panier »
add_filter( 'woocommerce_loop_add_to_cart_link', function ( $html, $p ) {
	if ( '' === (string) $p->get_price() && $p->is_type( 'simple' ) && cp_lien_demande( $p ) ) {
		return '<a class="button cp-demander" href="' . esc_url( cp_lien_demande( $p ) ) . '" target="_blank" rel="noopener">Demander le prix</a>';
	}
	return $html;
}, 10, 2 );

add_action( 'woocommerce_single_product_summary', function () {
	global $product;
	if ( ! $product ) {
		return;
	}
	if ( '' === (string) $product->get_price() && $product->is_type( 'simple' ) && cp_lien_demande( $product ) ) {
		echo '<p><a class="button alt cp-demander" href="' . esc_url( cp_lien_demande( $product ) ) . '" target="_blank" rel="noopener">' . cp_icone( 'whatsapp' ) . ' Demander le prix sur WhatsApp</a></p>'; // phpcs:ignore
	}
}, 31 );

// lieu, délai et moyens de paiement sous le prix
add_action( 'woocommerce_single_product_summary', function () {
	global $product;
	if ( ! $product ) {
		return;
	}
	echo '<ul class="cp-produit-infos">';
	if ( cp_produit_local( $product ) ) {
		echo '<li>' . cp_icone( 'suivi' ) . '<span><b>Disponible ' . esc_html( cp_au_pays( cp_r( 'destination.pays' ) ) ) . '</b> : retrait à l\'agence</span></li>'; // phpcs:ignore
	} else {
		$modes = cp_modes_actifs();
		usort( $modes, function ( $a, $b ) {
			return $a['delai_min'] <=> $b['delai_min'];
		} );
		if ( $modes ) {
			echo '<li>' . cp_icone( 'avion' ) . '<span><b>Expédié ' . esc_html( cp_de_pays( cp_r( 'origine.pays' ) ) ) . '</b> : livraison dès ' . esc_html( cp_delai_court( $modes[0] ) ) . ' (' . esc_html( cp_nom_court( $modes[0] ) ) . '), suivi en ligne</span></li>'; // phpcs:ignore
		}
	}
	$moyens = array();
	foreach ( cp_moyens_mobiles() as $m ) {
		if ( cp_r( 'paiement.' . $m[0] ) ) {
			$moyens[] = '<img src="' . esc_url( CP_URL . 'assets/moyens/' . $m[2] ) . '" alt="' . esc_attr( $m[1] ) . '" title="' . esc_attr( $m[1] ) . '">';
		}
	}
	if ( $moyens ) {
		echo '<li class="cp-produit-moyens">' . cp_icone( 'paiement' ) . '<span><b>Paiement direct</b>' . implode( '', $moyens ) . '</span></li>'; // phpcs:ignore
	}
	echo '</ul>';
}, 25 );

add_action( 'woocommerce_before_add_to_cart_quantity', function () {
	global $product;
	if ( $product && cp_est_location( $product ) ) {
		echo '<span class="cp-jours">Nombre de jours</span>';
	}
} );

add_filter( 'woocommerce_get_item_data', function ( $donnees, $ligne ) {
	if ( ! empty( $ligne['data'] ) && cp_est_location( $ligne['data'] ) ) {
		$donnees[] = array( 'key' => 'Location', 'value' => (int) $ligne['quantity'] . ' jour' . ( $ligne['quantity'] > 1 ? 's' : '' ) );
	}
	return $donnees;
}, 10, 2 );

/* ---------------------------------------------------------------- page d'accueil et espace client */
/** Section « Notre boutique » de la page d'accueil (rien si la boutique est vide). */
function cp_boutique_section() {
	if ( ! cp_boutique_active() || ! wc_get_products( array( 'limit' => 1, 'status' => 'publish', 'return' => 'ids' ) ) ) {
		return '';
	}
	$fleche = cp_icone( 'fleche' );
	return '<section class="cp-a-section cp-a-teinte cp-a-boutique"><div class="cp-a-in"><div class="cp-a-entete cp-anim"><div><p class="cp-a-sur">Notre boutique</p><h2>Achetez en ligne, payez par Mobile Money</h2></div>'
		. '<a class="cp-a-tout" href="' . esc_url( wc_get_page_permalink( 'shop' ) ) . '">Voir toute la boutique' . $fleche . '</a></div>'
		. do_shortcode( '[products limit="4" columns="4" orderby="date" order="DESC"]' ) . '</div></section>';
}

add_filter( 'cp_mon_espace_liens', function ( $h ) {
	if ( cp_boutique_active() ) {
		$h .= '<a class="cp-btn cp-btn-clair cp-btn-petit" href="' . esc_url( wc_get_account_endpoint_url( 'orders' ) ) . '">Mes commandes de la boutique</a>';
	}
	return $h;
} );
