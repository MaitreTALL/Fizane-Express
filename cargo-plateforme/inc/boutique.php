<?php
/**
 * Boutique (si WooCommerce est installé) : moyen de paiement « Mobile Money » (Orange Money, Moov Money, Wave)
 * avec les numéros de l'entreprise et la référence de transaction saisie par le client ; la commande attend la
 * vérification du paiement. Mention du trajet et du délai sur les fiches produits.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'plugins_loaded', function () {
	if ( ! class_exists( 'WC_Payment_Gateway' ) ) {
		return;
	}

	class CP_Paiement_Mobile_Money extends WC_Payment_Gateway {
		public function __construct() {
			$this->id = 'cp_mobile_money';
			$this->method_title = 'Mobile Money (Cargo Plateforme)';
			$this->method_description = 'Le client paie par Orange Money, Moov Money ou Wave aux numéros de l\'assistant, puis saisit la référence de la transaction. La commande reste « en attente » jusqu\'à votre vérification.';
			$this->has_fields = true;
			$this->init_form_fields();
			$this->init_settings();
			$this->title = $this->get_option( 'title', 'Mobile Money (Orange Money, Moov Money, Wave)' );
			$this->enabled = $this->get_option( 'enabled', 'yes' );
			add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
		}

		public function init_form_fields() {
			$this->form_fields = array(
				'enabled' => array( 'title' => 'Activer', 'type' => 'checkbox', 'label' => 'Paiement par Mobile Money', 'default' => 'yes' ),
				'title'   => array( 'title' => 'Titre', 'type' => 'text', 'default' => 'Mobile Money (Orange Money, Moov Money, Wave)' ),
			);
		}

		public function payment_fields() {
			echo '<p>Envoyez le montant de la commande à l\'un de ces numéros :</p><ul>';
			foreach ( array( 'orange_money' => 'Orange Money', 'moov_money' => 'Moov Money', 'wave' => 'Wave' ) as $k => $nom ) {
				if ( cp_r( 'paiement.' . $k ) ) {
					echo '<li><b>' . esc_html( $nom ) . '</b> : ' . esc_html( cp_r( 'paiement.' . $k ) ) . '</li>';
				}
			}
			echo '</ul><p><label>Moyen utilisé<br><select name="cp_mm_moyen"><option>Orange Money</option><option>Moov Money</option><option>Wave</option></select></label></p>';
			echo '<p><label>Référence de la transaction *<br><input name="cp_mm_ref" type="text" required style="width:100%"></label></p>';
		}

		public function validate_fields() {
			if ( empty( $_POST['cp_mm_ref'] ) ) { // phpcs:ignore
				wc_add_notice( 'Indiquez la référence de la transaction Mobile Money.', 'error' );
				return false;
			}
			return true;
		}

		public function process_payment( $commande_id ) {
			$o = wc_get_order( $commande_id );
			$o->update_meta_data( '_cp_mm_moyen', sanitize_text_field( wp_unslash( $_POST['cp_mm_moyen'] ?? '' ) ) ); // phpcs:ignore
			$o->update_meta_data( '_cp_mm_ref', sanitize_text_field( wp_unslash( $_POST['cp_mm_ref'] ?? '' ) ) ); // phpcs:ignore
			$o->update_status( 'on-hold', 'Paiement Mobile Money à vérifier : ' . $o->get_meta( '_cp_mm_moyen' ) . ' ' . $o->get_meta( '_cp_mm_ref' ) );
			wc_reduce_stock_levels( $commande_id );
			WC()->cart->empty_cart();
			return array( 'result' => 'success', 'redirect' => $this->get_return_url( $o ) );
		}
	}

	add_filter( 'woocommerce_payment_gateways', function ( $g ) {
		$g[] = 'CP_Paiement_Mobile_Money';
		return $g;
	} );
}, 20 );

// référence de paiement visible dans la commande (administration)
add_action( 'woocommerce_admin_order_data_after_billing_address', function ( $o ) {
	if ( $o->get_meta( '_cp_mm_ref' ) ) {
		echo '<p><strong>Mobile Money :</strong> ' . esc_html( $o->get_meta( '_cp_mm_moyen' ) . ' — réf. ' . $o->get_meta( '_cp_mm_ref' ) ) . '</p>';
	}
} );

// trajet et délai sous le prix des produits
add_action( 'woocommerce_single_product_summary', function () {
	$modes = cp_modes_actifs();
	if ( ! $modes ) {
		return;
	}
	echo '<p class="cp-produit-trajet" style="background:var(--cp-fond,#F5F7FA);border-radius:12px;padding:10px 14px;font-weight:600">Expédié de ' . esc_html( cp_r( 'origine.pays' ) ) . ' vers ' . esc_html( cp_r( 'destination.pays' ) ) . ' — ' . esc_html( cp_delai_texte( $modes[0] ) ) . ' (' . esc_html( $modes[0]['nom'] ) . ')</p>';
}, 25 );
