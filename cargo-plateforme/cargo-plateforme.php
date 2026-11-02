<?php
/**
 * Plugin Name: Cargo Plateforme
 * Description: Plateforme clé en main pour transitaires et vendeurs (Chine → Afrique) : assistant de configuration (logo, couleurs, tarifs, délais, paiements), simulateur de tarif et de délai, suivi de colis, gestion des expéditions, fiche d'expédition et reçu en PDF envoyés automatiquement par e-mail, espace client et boutique (WooCommerce).
 * Version: 2.0.0
 * Author: Visionary Entreprises
 * Text Domain: cargo-plateforme
 * Requires PHP: 7.4
 * Requires at least: 6.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CP_VERSION', '2.0.0' );
define( 'CP_DIR', __DIR__ );
define( 'CP_URL', plugin_dir_url( __FILE__ ) );

require_once CP_DIR . '/inc/reglages.php';
require_once CP_DIR . '/inc/tarifs.php';
require_once CP_DIR . '/inc/pdf.php';
require_once CP_DIR . '/inc/documents.php';
require_once CP_DIR . '/inc/envois.php';
require_once CP_DIR . '/inc/emails.php';
require_once CP_DIR . '/inc/front.php';
require_once CP_DIR . '/inc/assistant.php';
require_once CP_DIR . '/inc/boutique.php';

register_activation_hook( __FILE__, 'cp_activation' );
function cp_activation() {
	cp_enregistrer_types();
	cp_creer_pages();
	if ( ! get_option( 'cp_reglages' ) ) {
		update_option( 'cp_reglages', cp_reglages_defaut() );
		update_option( 'cp_assistant_a_faire', 1 );
	}
	flush_rewrite_rules();
}

register_deactivation_hook( __FILE__, function () {
	flush_rewrite_rules();
} );
