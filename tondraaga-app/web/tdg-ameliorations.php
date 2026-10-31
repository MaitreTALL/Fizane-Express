<?php
/**
 * Plugin Name: Tondraaga — améliorations
 * Description: Traductions françaises de Dokan et WooCommerce, inscription des vendeurs sans paiement préalable (abonnement à régler ensuite), protection des données des vendeurs, logos des moyens de paiement, corrections d'affichage sur téléphone et fiches produits (titre et description pour Google).
 * Version: 1.0.1
 * Author: Tondraaga
 *
 * Extension « obligatoire » (mu-plugin) : elle reste active même si l'extension Tondraaga Core ou le thème
 * sont mis à jour. Ses fichiers sont dans wp-content/mu-plugins/tdg-ameliorations/.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'TDG_AM_VERSION', '1.0.1' );
define( 'TDG_AM_DIR', __DIR__ . '/tdg-ameliorations' );
define( 'TDG_AM_URL', content_url( 'mu-plugins/tdg-ameliorations' ) );

/* -------------------------------------------------------------------------
 * 1. Traductions
 * ---------------------------------------------------------------------- */
function tdg_am_traductions() {
	static $t = null;
	if ( null === $t ) {
		$t = is_readable( TDG_AM_DIR . '/traductions.php' ) ? (array) include TDG_AM_DIR . '/traductions.php' : array();
	}
	return $t;
}

/** Dokan : on remplace toujours (sa traduction est incomplète, parfois fautive). WooCommerce : seulement les textes restés en anglais. */
function tdg_am_traduire( $traduction, $cle, $source, $domaine ) {
	if ( 'dokan' !== $domaine && 'dokan-lite' !== $domaine && ( 'woocommerce' !== $domaine || $traduction !== $source ) ) {
		return $traduction;
	}
	$t = tdg_am_traductions();
	return isset( $t[ $cle ] ) && is_string( $t[ $cle ] ) ? $t[ $cle ] : $traduction;
}

add_filter( 'gettext', function ( $traduction, $texte, $domaine ) {
	return tdg_am_traduire( $traduction, $texte, $texte, $domaine );
}, 20, 3 );

add_filter( 'gettext_with_context', function ( $traduction, $texte, $contexte, $domaine ) {
	return tdg_am_traduire( $traduction, $contexte . "\x04" . $texte, $texte, $domaine );
}, 20, 4 );

add_filter( 'ngettext', function ( $traduction, $singulier, $pluriel, $nombre, $domaine ) {
	if ( 'dokan' !== $domaine && 'dokan-lite' !== $domaine ) {
		return $traduction;
	}
	$t = tdg_am_traductions();
	$c = $singulier . "\x00" . $pluriel;
	if ( isset( $t[ $c ] ) && is_array( $t[ $c ] ) ) {
		return $nombre > 1 ? $t[ $c ][1] : $t[ $c ][0];
	}
	return $traduction;
}, 20, 5 );

/* Textes affichés par les scripts de Dokan (questions sur les produits, etc.) : ils n'ont pas de fichier de traduction. */
add_filter( 'pre_load_script_translations', function ( $traductions, $fichier, $script, $domaine ) {
	if ( null !== $traductions || ( 'dokan' !== $domaine && 'dokan-lite' !== $domaine ) || 0 !== strpos( determine_locale(), 'fr' ) ) {
		return $traductions;
	}
	$messages = array( '' => array( 'domain' => 'messages', 'lang' => 'fr_FR', 'plural-forms' => 'nplurals=2; plural=n > 1;' ) );
	foreach ( tdg_am_traductions() as $cle => $valeur ) {
		if ( is_array( $valeur ) ) {
			$messages[ strtok( $cle, "\x00" ) ] = $valeur;
		} else {
			$messages[ $cle ] = array( $valeur );
		}
	}
	return wp_json_encode( array( 'domain' => 'messages', 'locale_data' => array( 'messages' => $messages ) ) );
}, 10, 4 );

/* -------------------------------------------------------------------------
 * 2. Inscription vendeur sans paiement préalable
 *    L'équipe valide la boutique ; le vendeur dispose alors de l'abonnement pendant un délai
 *    (30 jours par défaut, option « tdg_delai_abonnement ») pour le régler depuis son espace.
 *    Sans paiement à l'échéance, Dokan retire ses produits de la vente jusqu'au paiement.
 * ---------------------------------------------------------------------- */
function tdg_am_pack_abonnement() {
	if ( ! function_exists( 'wc_get_products' ) ) {
		return 0;
	}
	$ids = wc_get_products( array( 'type' => 'product_pack', 'status' => 'publish', 'limit' => 1, 'orderby' => 'ID', 'order' => 'ASC', 'return' => 'ids' ) );
	return $ids ? (int) $ids[0] : 0;
}

function tdg_am_delai_jours() {
	return max( 1, (int) get_option( 'tdg_delai_abonnement', 30 ) );
}

add_action( 'dokan_vendor_enabled', function ( $vendeur_id ) {
	$vendeur_id = (int) $vendeur_id;
	$pack       = tdg_am_pack_abonnement();
	if ( ! $vendeur_id || ! $pack || ! function_exists( 'dokan_current_datetime' ) ) {
		return;
	}
	$fin = (string) get_user_meta( $vendeur_id, 'product_pack_enddate', true );
	if ( get_user_meta( $vendeur_id, 'product_package_id', true ) && ( 'unlimited' === $fin || strtotime( $fin ) > time() ) ) {
		return; // abonnement déjà en cours (payé ou délai déjà accordé)
	}
	$maintenant = dokan_current_datetime();
	update_user_meta( $vendeur_id, 'can_post_product', '1' );
	update_user_meta( $vendeur_id, 'product_package_id', $pack );
	update_user_meta( $vendeur_id, 'product_no_with_pack', get_post_meta( $pack, '_no_of_product', true ) );
	update_user_meta( $vendeur_id, 'product_pack_startdate', $maintenant->format( 'Y-m-d H:i:s' ) );
	update_user_meta( $vendeur_id, 'product_pack_enddate', $maintenant->modify( '+' . tdg_am_delai_jours() . ' days' )->format( 'Y-m-d H:i:s' ) );
	update_user_meta( $vendeur_id, 'product_order_id', '' );
	update_user_meta( $vendeur_id, '_customer_recurring_subscription', '' );
	update_user_meta( $vendeur_id, 'tdg_abonnement_a_regler', 1 );
}, 20 );

// abonnement payé : plus de rappel
add_action( 'dokan_vendor_purchased_subscription', function ( $vendeur_id ) {
	delete_user_meta( (int) $vendeur_id, 'tdg_abonnement_a_regler' );
} );

// rappel dans l'espace vendeur, avec le bouton de paiement
add_action( 'dokan_dashboard_content_inside_before', function () {
	$id = get_current_user_id();
	if ( ! $id || ! get_user_meta( $id, 'tdg_abonnement_a_regler', true ) ) {
		return;
	}
	$pack = tdg_am_pack_abonnement();
	$fin  = strtotime( (string) get_user_meta( $id, 'product_pack_enddate', true ) );
	if ( ! $pack || ! $fin ) {
		return;
	}
	$produit = wc_get_product( $pack );
	$prix    = $produit ? wp_strip_all_tags( wc_price( $produit->get_price() ) ) : '';
	$lien    = add_query_arg( 'add-to-cart', $pack, wc_get_checkout_url() );
	echo '<div class="tdg-am-abonnement"><p><b>Votre boutique est en ligne.</b> Réglez votre abonnement annuel'
		. ( $prix ? ' (' . esc_html( $prix ) . ')' : '' ) . ' avant le <b>' . esc_html( date_i18n( 'j F Y', $fin ) )
		. '</b> pour que vos produits restent en vente.</p><a class="dokan-btn dokan-btn-theme" href="' . esc_url( $lien ) . '">Régler mon abonnement</a></div>';
} );

/* -------------------------------------------------------------------------
 * 3. Sécurité et données personnelles
 * ---------------------------------------------------------------------- */

// Les coordonnées personnelles des vendeurs (téléphone, e-mail, adresse, nom) ne sont pas publiques :
// les clients passent par Tondraaga.
add_filter( 'dokan_rest_store_restricted_fields_for_view', function ( $champs, $boutique = null, $requete = null ) {
	$id = is_object( $boutique ) && method_exists( $boutique, 'get_id' ) ? (int) $boutique->get_id() : 0;
	if ( current_user_can( 'manage_woocommerce' ) || ( $id && get_current_user_id() === $id ) ) {
		return $champs;
	}
	return array_values( array_unique( array_merge( (array) $champs, array( 'email', 'phone', 'address', 'first_name', 'last_name', 'location' ) ) ) );
}, 20, 3 );

// Liste publique des boutiques : seulement les boutiques validées, et pas de recherche par e-mail ou identifiant.
add_filter( 'dokan_rest_get_stores_args', function ( $args ) {
	if ( current_user_can( 'manage_woocommerce' ) ) {
		return $args;
	}
	$args['status'] = 'approved';
	if ( ! empty( $args['search'] ) ) {
		$args['search_columns'] = array( 'display_name', 'user_nicename' );
	}
	return $args;
}, 99 );

// Mots de passe d'application (accès à distance) réservés aux administrateurs.
add_filter( 'wp_is_application_passwords_available_for_user', function ( $disponible, $utilisateur ) {
	return $disponible && user_can( $utilisateur, 'manage_options' );
}, 10, 2 );

// En-têtes complémentaires : pas d'objets intégrés, pas de détournement de l'adresse de base, pas d'affichage dans un cadre d'un autre site.
add_action( 'send_headers', function () {
	if ( ! headers_sent() ) {
		header( "Content-Security-Policy: object-src 'none'; base-uri 'self'; frame-ancestors 'self'", false );
	}
} );

/* -------------------------------------------------------------------------
 * 4. Moyens de paiement : vrais logos (Orange Money, Wave) et logo Moov Money dans le pied de page
 * ---------------------------------------------------------------------- */
add_filter( 'woocommerce_gateway_icon', function ( $icone, $id ) {
	$logos = array( 'tdg_orange' => array( 'orange-money.svg', 'Orange Money' ), 'tdg_wave' => array( 'wave.png', 'Wave' ) );
	if ( isset( $logos[ $id ] ) ) {
		$icone = '<img class="tdg-am-icone-moyen" src="' . esc_url( TDG_AM_URL . '/moyens/' . $logos[ $id ][0] ) . '" alt="' . esc_attr( $logos[ $id ][1] ) . '" width="32" height="32">';
	}
	return $icone;
}, 10, 2 );

/* -------------------------------------------------------------------------
 * 5. Feuille de style des corrections (après celles du thème) et petit script
 * ---------------------------------------------------------------------- */
add_action( 'wp_enqueue_scripts', function () {
	$dep = wp_style_is( 'tdg-v9', 'registered' ) ? array( 'tdg-v9' ) : array();
	wp_enqueue_style( 'tdg-ameliorations', TDG_AM_URL . '/ameliorations.css', $dep, TDG_AM_VERSION );
	wp_add_inline_style( 'tdg-ameliorations', ':root{--tdg-logo-om:url("' . esc_url( TDG_AM_URL . '/moyens/orange-money.svg' ) . '");--tdg-logo-wave:url("' . esc_url( TDG_AM_URL . '/moyens/wave.png' ) . '");--tdg-logo-moov:url("' . esc_url( TDG_AM_URL . '/moyens/moov-money.png' ) . '")}' );
	if ( wp_script_is( 'tdg-app', 'registered' ) ) {
		// le pied de page est dessiné par l'application : on y ajoute le logo Moov Money
		wp_add_inline_script( 'tdg-app', '(function(){function a(){document.querySelectorAll(".pied10-paiement").forEach(function(p){if(p.querySelector(".logo-moyen.moov"))return;var s=document.createElement("span");s.className="pied10-moyen";s.title="Moov Money";s.innerHTML=\'<span class="logo-moyen moov" role="img" aria-label="Moov Money"></span>\';p.appendChild(s);});}a();new MutationObserver(a).observe(document.body,{childList:true,subtree:true});})();' );
	}
}, 100 );

/* -------------------------------------------------------------------------
 * 6. Fiches produits : titre et description pour les moteurs de recherche
 *    (champs personnalisés « _tdg_titre_seo » et « _tdg_meta_description »)
 * ---------------------------------------------------------------------- */
add_filter( 'document_title_parts', function ( $parties ) {
	if ( is_singular( 'product' ) ) {
		$titre = get_post_meta( get_queried_object_id(), '_tdg_titre_seo', true );
		if ( $titre ) {
			$parties['title'] = $titre;
		}
	}
	return $parties;
} );

add_action( 'wp_head', function () {
	if ( is_singular( 'product' ) ) {
		$d = get_post_meta( get_queried_object_id(), '_tdg_meta_description', true );
		if ( $d ) {
			echo '<meta name="description" content="' . esc_attr( wp_strip_all_tags( $d ) ) . '">' . "\n";
		}
	}
}, 2 );
