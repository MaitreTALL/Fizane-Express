<?php
/**
 * Plugin Name: Tondraaga — améliorations
 * Description: Traductions françaises de Dokan et WooCommerce, deux formules vendeur (sans abonnement 15 % / abonnement annuel 8 %), expédition internationale au kilo, sous-catégories de la boutique, protection des données des vendeurs, logos des moyens de paiement, corrections d'affichage sur téléphone et fiches produits (titre et description pour Google).
 * Version: 1.1.0
 * Author: Tondraaga
 *
 * Extension « obligatoire » (mu-plugin) : elle reste active même si l'extension Tondraaga Core ou le thème
 * sont mis à jour. Ses fichiers sont dans wp-content/mu-plugins/tdg-ameliorations/.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'TDG_AM_VERSION', '1.1.0' );
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
 * 2. Formules vendeur
 *    - Sans abonnement (par défaut) : inscription gratuite, commission de 15 % sur chaque vente
 *      (commission générale de Dokan). Pack Dokan privé « Sans abonnement » (option tdg_pack_gratuit).
 *    - Abonnement annuel : 15 000 FCFA, commission réduite à 8 % pendant 12 mois (pack Dokan publié).
 *    À l'échéance, la boutique repasse en formule sans abonnement, sans retrait des produits.
 * ---------------------------------------------------------------------- */
function tdg_am_pack_abonnement() {
	if ( ! function_exists( 'wc_get_products' ) ) {
		return 0;
	}
	$ids = wc_get_products( array( 'type' => 'product_pack', 'status' => 'publish', 'limit' => 1, 'orderby' => 'ID', 'order' => 'ASC', 'return' => 'ids' ) );
	return $ids ? (int) $ids[0] : 0;
}

function tdg_am_pack_gratuit() {
	return (int) get_option( 'tdg_pack_gratuit', 0 );
}

function tdg_am_taux_abonnement() {
	$pack = tdg_am_pack_abonnement();
	$taux = $pack ? get_post_meta( $pack, '_subscription_product_admin_commission', true ) : '';
	return '' !== $taux && null !== $taux ? (float) $taux : 8;
}

/** Commissions et prix des deux formules : sans abonnement, abonnement, prix de l'abonnement. */
function tdg_am_taux() {
	$sel  = (array) get_option( 'dokan_selling', array() );
	$pack = tdg_am_pack_abonnement();
	$prod = $pack && function_exists( 'wc_get_product' ) ? wc_get_product( $pack ) : null;
	return array(
		'sans'       => isset( $sel['admin_percentage'] ) && '' !== $sel['admin_percentage'] ? (float) $sel['admin_percentage'] : 15,
		'abonnement' => tdg_am_taux_abonnement(),
		'prix'       => $prod && '' !== $prod->get_price() ? (float) $prod->get_price() : 15000,
	);
}

function tdg_am_pct( $v ) {
	return rtrim( rtrim( number_format( (float) $v, 2, ',', '' ), '0' ), ',' ) . ' %';
}

/** « abonnement » si l'abonnement annuel est en cours, sinon « sans ». */
function tdg_am_formule( $vendeur_id ) {
	$pack = (int) get_user_meta( $vendeur_id, 'product_package_id', true );
	if ( ! $pack || tdg_am_pack_abonnement() !== $pack ) {
		return 'sans';
	}
	return tdg_am_abonnement_echu( $vendeur_id ) ? 'sans' : 'abonnement';
}

function tdg_am_abonnement_echu( $vendeur_id ) {
	$fin = (string) get_user_meta( $vendeur_id, 'product_pack_enddate', true );
	if ( 'unlimited' === $fin ) {
		return false;
	}
	if ( ! $fin || ! strtotime( $fin ) || ! function_exists( 'dokan_current_datetime' ) ) {
		return true;
	}
	$maintenant = dokan_current_datetime();
	$echeance   = $maintenant->modify( $fin );
	return $echeance && $maintenant > $echeance;
}

/** Passe un vendeur en formule sans abonnement : produits illimités, sans échéance, commission générale. */
function tdg_am_passer_sans_abonnement( $vendeur_id ) {
	$vendeur_id = (int) $vendeur_id;
	$gratuit    = tdg_am_pack_gratuit();
	if ( ! $vendeur_id || ! $gratuit || ! function_exists( 'dokan_current_datetime' ) ) {
		return;
	}
	update_user_meta( $vendeur_id, 'can_post_product', '1' );
	update_user_meta( $vendeur_id, 'product_package_id', $gratuit );
	update_user_meta( $vendeur_id, 'product_no_with_pack', '-1' );
	update_user_meta( $vendeur_id, 'product_pack_startdate', dokan_current_datetime()->format( 'Y-m-d H:i:s' ) );
	update_user_meta( $vendeur_id, 'product_pack_enddate', 'unlimited' );
	update_user_meta( $vendeur_id, 'product_order_id', '' );
	update_user_meta( $vendeur_id, '_customer_recurring_subscription', '' );
	update_user_meta( $vendeur_id, 'dokan_has_active_cancelled_subscrption', false );
	delete_user_meta( $vendeur_id, 'tdg_abonnement_a_regler' );
	// plus de commission propre au vendeur : la commission générale (15 %) s'applique
	if ( class_exists( '\WeDevs\Dokan\Commission\Settings\Vendor' ) ) {
		( new \WeDevs\Dokan\Commission\Settings\Vendor( $vendeur_id ) )->delete();
	}
}

/** Vendeur sans formule en cours (nouveau, ou abonnement arrivé à échéance) : formule sans abonnement. */
function tdg_am_verifier_formule( $vendeur_id ) {
	$pack = (int) get_user_meta( $vendeur_id, 'product_package_id', true );
	if ( $pack && tdg_am_pack_gratuit() === $pack ) {
		return;
	}
	if ( 'abonnement' !== tdg_am_formule( $vendeur_id ) ) {
		tdg_am_passer_sans_abonnement( $vendeur_id );
	}
}

add_action( 'dokan_new_seller_created', function ( $vendeur_id ) {
	$choix = isset( $_POST['tdg_formule'] ) ? sanitize_key( wp_unslash( $_POST['tdg_formule'] ) ) : 'sans'; // phpcs:ignore WordPress.Security.NonceVerification
	update_user_meta( $vendeur_id, 'tdg_formule_choisie', 'abonnement' === $choix ? 'abonnement' : 'sans' );
	tdg_am_verifier_formule( $vendeur_id );
}, 5 );

add_action( 'dokan_vendor_enabled', 'tdg_am_verifier_formule', 20 );

// échéance de l'abonnement : on repasse en formule sans abonnement AVANT le contrôle de Dokan (même tâche, priorité 1),
// sinon Dokan retirerait les produits de la vente.
function tdg_am_echeances() {
	$abo = tdg_am_pack_abonnement();
	if ( ! $abo ) {
		return;
	}
	$ids = get_users( array( 'role__in' => array( 'seller', 'administrator' ), 'meta_key' => 'product_package_id', 'meta_value' => $abo, 'fields' => 'ID' ) ); // phpcs:ignore WordPress.DB.SlowDBQuery
	foreach ( $ids as $vendeur_id ) {
		if ( ! tdg_am_abonnement_echu( $vendeur_id ) ) {
			continue;
		}
		tdg_am_passer_sans_abonnement( $vendeur_id );
		$u = get_userdata( $vendeur_id );
		if ( $u && is_email( $u->user_email ) ) {
			$t     = tdg_am_taux();
			$lien  = add_query_arg( 'add-to-cart', $abo, wc_get_checkout_url() );
			$texte = '<p>Bonjour,</p><p>Votre abonnement annuel Tondraaga est arrivé à échéance. <b>Votre boutique reste ouverte</b> : elle passe en formule sans abonnement, avec une commission de ' . esc_html( tdg_am_pct( $t['sans'] ) ) . ' sur chaque vente.</p>'
				. '<p>Pour retrouver la commission de ' . esc_html( tdg_am_pct( $t['abonnement'] ) ) . ', renouvelez votre abonnement (' . esc_html( number_format( $t['prix'], 0, ',', ' ' ) ) . ' FCFA par an) : <a href="' . esc_url( $lien ) . '">renouveler mon abonnement</a>.</p>';
			if ( function_exists( 'tdg_envoyer_mail' ) ) {
				tdg_envoyer_mail( $u->user_email, 'Votre abonnement Tondraaga est arrivé à échéance', 'Votre boutique reste ouverte', $texte, array( 'contexte' => 'abonnement-echeance:' . $vendeur_id ) );
			} else {
				wp_mail( $u->user_email, 'Votre abonnement Tondraaga est arrivé à échéance', $texte, array( 'Content-Type: text/html; charset=UTF-8' ) );
			}
		}
	}
}
add_action( 'dps_schedule_pack_update', 'tdg_am_echeances', 1 );
add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'tdg_am_echeances' ) ) {
		wp_schedule_event( time() + 600, 'hourly', 'tdg_am_echeances' );
	}
} );
add_action( 'tdg_am_echeances', 'tdg_am_echeances' );

// abonnement payé : plus de formule « sans abonnement » enregistrée par erreur
add_action( 'dokan_vendor_purchased_subscription', function ( $vendeur_id ) {
	delete_user_meta( (int) $vendeur_id, 'tdg_abonnement_a_regler' );
	update_user_meta( (int) $vendeur_id, 'tdg_formule_choisie', 'abonnement' );
} );

// inscription : choix de la formule, avant la case du contrat
add_action( 'dokan_seller_registration_field_after', function () {
	$t     = tdg_am_taux();
	$choix = isset( $_POST['tdg_formule'] ) && 'abonnement' === $_POST['tdg_formule'] ? 'abonnement' : 'sans'; // phpcs:ignore WordPress.Security.NonceVerification
	echo '<fieldset class="tdg-am-formules"><legend>Choisissez votre formule <span class="required">*</span></legend>'
		. '<label class="tdg-am-formule"><input type="radio" name="tdg_formule" value="sans"' . checked( 'sans', $choix, false ) . '><span><b>Sans abonnement</b> — gratuit<br><small>Commission de ' . esc_html( tdg_am_pct( $t['sans'] ) ) . ' sur chaque vente</small></span></label>'
		. '<label class="tdg-am-formule"><input type="radio" name="tdg_formule" value="abonnement"' . checked( 'abonnement', $choix, false ) . '><span><b>Abonnement annuel</b> — ' . esc_html( number_format( $t['prix'], 0, ',', ' ' ) ) . ' FCFA par an<br><small>Commission réduite à ' . esc_html( tdg_am_pct( $t['abonnement'] ) ) . ' sur chaque vente pendant 1 an</small></span></label>'
		. '<p class="tdg-am-formules-aide">Votre boutique est validée par notre équipe dans les deux cas. Vous pourrez passer à l’abonnement à tout moment depuis votre espace vendeur.</p></fieldset>';
}, 5 );

// abonnement choisi à l'inscription : on propose le paiement juste après
add_filter( 'woocommerce_registration_redirect', function ( $url ) {
	$id  = get_current_user_id();
	$abo = tdg_am_pack_abonnement();
	if ( $id && $abo && 'abonnement' === get_user_meta( $id, 'tdg_formule_choisie', true ) && 'abonnement' !== tdg_am_formule( $id ) ) {
		return add_query_arg( 'add-to-cart', $abo, wc_get_checkout_url() );
	}
	return $url;
}, 999 );

// espace vendeur : formule en cours et passage à l'abonnement
add_action( 'dokan_dashboard_content_inside_before', function () {
	$id  = get_current_user_id();
	$abo = tdg_am_pack_abonnement();
	if ( ! $id || ! $abo || ! function_exists( 'dokan_is_user_seller' ) || ! dokan_is_user_seller( $id ) ) {
		return;
	}
	$t    = tdg_am_taux();
	$lien = add_query_arg( 'add-to-cart', $abo, wc_get_checkout_url() );
	if ( 'abonnement' === tdg_am_formule( $id ) ) {
		$fin    = strtotime( (string) get_user_meta( $id, 'product_pack_enddate', true ) );
		$bientot = $fin && $fin - time() < 30 * DAY_IN_SECONDS;
		echo '<div class="tdg-am-abonnement tdg-am-abonnement-ok"><p><b>Votre formule : abonnement annuel.</b> Commission de ' . esc_html( tdg_am_pct( $t['abonnement'] ) ) . ' sur vos ventes'
			. ( $fin ? ' jusqu’au <b>' . esc_html( date_i18n( 'j F Y', $fin ) ) . '</b>' : '' ) . '.</p>'
			. ( $bientot ? '<a class="dokan-btn dokan-btn-theme" href="' . esc_url( $lien ) . '">Renouveler mon abonnement</a>' : '' ) . '</div>';
		return;
	}
	$attente = 'abonnement' === get_user_meta( $id, 'tdg_formule_choisie', true );
	echo '<div class="tdg-am-abonnement"><p><b>Votre formule : sans abonnement.</b> Commission de ' . esc_html( tdg_am_pct( $t['sans'] ) ) . ' sur chaque vente. '
		. ( $attente ? 'Vous avez choisi l’abonnement annuel : réglez-le pour bénéficier de la commission de ' . esc_html( tdg_am_pct( $t['abonnement'] ) ) . '.' : 'Avec l’abonnement annuel (' . esc_html( number_format( $t['prix'], 0, ',', ' ' ) ) . ' FCFA), la commission passe à ' . esc_html( tdg_am_pct( $t['abonnement'] ) ) . ' pendant 1 an.' )
		. '</p><a class="dokan-btn dokan-btn-theme" href="' . esc_url( $lien ) . '">' . ( $attente ? 'Régler mon abonnement' : 'Passer à l’abonnement' ) . '</a></div>';
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

/* -------------------------------------------------------------------------
 * 7. Expédition internationale de la boutique, au kilo
 *    Afrique 5 000 FCFA/kg, Europe, Amérique et reste du monde 10 000 FCFA/kg (réglable par zone
 *    dans WooCommerce › Réglages › Expédition). Poids facturé : poids des produits, arrondi au demi-kilo
 *    supérieur, 1 kg minimum ; un produit sans poids compte pour 1 kg.
 * ---------------------------------------------------------------------- */
add_action( 'woocommerce_shipping_init', function () {
	if ( class_exists( 'TDG_AM_Expedition' ) ) {
		return;
	}
	class TDG_AM_Expedition extends WC_Shipping_Method {
		public function __construct( $instance_id = 0 ) {
			$this->id                   = 'tdg_expedition';
			$this->instance_id          = absint( $instance_id );
			$this->method_title         = 'Expédition internationale Tondraaga';
			$this->method_description   = 'Frais calculés au poids de la commande (arrondi au demi-kilo, 1 kg minimum).';
			$this->supports             = array( 'shipping-zones', 'instance-settings' );
			$this->instance_form_fields = array(
				'title'        => array( 'title' => 'Titre', 'type' => 'text', 'default' => 'Expédition internationale' ),
				'prix_kg'      => array( 'title' => 'Prix au kilo (FCFA)', 'type' => 'number', 'default' => '10000' ),
				'min_kg'       => array( 'title' => 'Poids minimum facturé (kg)', 'type' => 'number', 'default' => '1' ),
				'poids_defaut' => array( 'title' => 'Poids d’un produit sans poids renseigné (kg)', 'type' => 'number', 'default' => '1' ),
				'delai'        => array( 'title' => 'Délai affiché', 'type' => 'text', 'default' => '' ),
			);
			$this->init_settings();
			$this->title   = $this->get_option( 'title', 'Expédition internationale' );
			$this->enabled = 'yes';
			add_action( 'woocommerce_update_options_shipping_' . $this->id, array( $this, 'process_admin_options' ) );
		}

		public function calculate_shipping( $package = array() ) {
			$principal = ! isset( $package['tdg_principal'] ) || $package['tdg_principal'];
			if ( ! $principal ) {
				$this->add_rate( array( 'id' => $this->get_rate_id( 'groupe' ), 'label' => 'Expédiée avec le reste de votre commande', 'cost' => 0, 'package' => $package ) );
				return;
			}
			$defaut  = max( 0, (float) $this->get_option( 'poids_defaut', 1 ) );
			$lignes  = ( function_exists( 'WC' ) && WC()->cart ) ? WC()->cart->get_cart() : (array) ( $package['contents'] ?? array() );
			$kg      = 0;
			foreach ( $lignes as $l ) {
				$p = $l['data'] ?? null;
				if ( ! $p || ! is_object( $p ) || ( method_exists( $p, 'is_virtual' ) && $p->is_virtual() ) ) {
					continue;
				}
				$w   = '' !== (string) $p->get_weight() ? wc_get_weight( (float) $p->get_weight(), 'kg' ) : $defaut;
				$kg += $w * (int) ( $l['quantity'] ?? 1 );
			}
			$kg   = ceil( max( $kg, (float) $this->get_option( 'min_kg', 1 ) ) * 2 ) / 2;
			$prix = (float) $this->get_option( 'prix_kg', 10000 );
			$d    = trim( (string) $this->get_option( 'delai', '' ) );
			$this->add_rate( array(
				'id'      => $this->get_rate_id( 'kilo' ),
				'label'   => $this->title . ' — ' . str_replace( '.', ',', (string) $kg ) . ' kg × ' . number_format( $prix, 0, ',', ' ' ) . ' FCFA' . ( $d ? ' (' . $d . ')' : '' ),
				'cost'    => round( $kg * $prix ),
				'package' => $package,
			) );
		}
	}
} );
add_filter( 'woocommerce_shipping_methods', function ( $m ) {
	$m['tdg_expedition'] = 'TDG_AM_Expedition';
	return $m;
} );

/* -------------------------------------------------------------------------
 * 8. Sous-catégories de la boutique (Épices, Textiles…) dans le catalogue de l'application
 *    Le catalogue « tondraaga/v1/catalogue » reçoit, pour chaque produit, sa catégorie principale,
 *    sa sous-catégorie et des mots-clés de recherche, et la liste des sous-catégories.
 * ---------------------------------------------------------------------- */
function tdg_am_categories_boutique() {
	return array( 'artisanat', 'mode', 'local', 'karite', 'bijoux', 'cadeaux', 'culture' );
}

function tdg_am_sous_categories() {
	$cache = get_transient( 'tdg_am_sous_cats' );
	if ( is_array( $cache ) ) {
		return $cache;
	}
	$res = array();
	foreach ( tdg_am_categories_boutique() as $slug ) {
		$parent = get_term_by( 'slug', $slug, 'product_cat' );
		if ( ! $parent ) {
			continue;
		}
		$enfants = get_terms( array( 'taxonomy' => 'product_cat', 'parent' => $parent->term_id, 'hide_empty' => false, 'orderby' => 'name' ) );
		foreach ( is_wp_error( $enfants ) ? array() : $enfants as $e ) {
			$res[ $slug ][] = array( 'id' => $e->slug, 'nom' => html_entity_decode( $e->name, ENT_QUOTES ), 'nb' => (int) $e->count );
		}
	}
	set_transient( 'tdg_am_sous_cats', $res, HOUR_IN_SECONDS );
	return $res;
}
foreach ( array( 'created_product_cat', 'edited_product_cat', 'delete_product_cat' ) as $tdg_crochet ) {
	add_action( $tdg_crochet, function () {
		delete_transient( 'tdg_am_sous_cats' );
		delete_transient( 'tdg_catalogue_v2' );
	} );
}

add_filter( 'rest_post_dispatch', function ( $reponse, $serveur, $requete ) {
	if ( '/tondraaga/v1/catalogue' !== $requete->get_route() || ! $reponse instanceof WP_REST_Response ) {
		return $reponse;
	}
	$d = $reponse->get_data();
	if ( ! is_array( $d ) || empty( $d['produits'] ) ) {
		return $reponse;
	}
	$nos  = tdg_am_categories_boutique();
	$sous = tdg_am_sous_categories();
	$noms = array();
	foreach ( $sous as $parent => $liste ) {
		foreach ( $liste as $s ) {
			$noms[ $s['id'] ] = array( $parent, $s['nom'] );
		}
	}
	foreach ( $d['produits'] as &$p ) {
		if ( empty( $p['wcid'] ) ) {
			continue;
		}
		$slugs = (array) wp_get_post_terms( (int) $p['wcid'], 'product_cat', array( 'fields' => 'slugs' ) );
		$mots  = array();
		foreach ( $slugs as $s ) {
			if ( isset( $noms[ $s ] ) ) {
				$p['sous']    = $s;
				$p['sousNom'] = $noms[ $s ][1];
				$p['cat']     = $noms[ $s ][0];
				$mots[]       = $noms[ $s ][1];
			} elseif ( in_array( $s, $nos, true ) && empty( $p['sous'] ) ) {
				$p['cat'] = $s;
			}
		}
		$tags = (array) wp_get_post_terms( (int) $p['wcid'], 'product_tag', array( 'fields' => 'names' ) );
		$p['motsCles'] = implode( ' ', array_merge( $mots, $tags ) );
	}
	unset( $p );
	$visibles = array();
	foreach ( $sous as $parent => $liste ) {
		$visibles[ $parent ] = array_values( array_map( function ( $s ) {
			return array( 'id' => $s['id'], 'nom' => $s['nom'] );
		}, array_filter( $liste, function ( $s ) {
			return $s['nb'] > 0;
		} ) ) );
	}
	$d['sousCategories'] = array_filter( $visibles );
	$reponse->set_data( $d );
	return $reponse;
}, 10, 3 );
