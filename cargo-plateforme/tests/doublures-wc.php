<?php
/** Doublures de WooCommerce : passerelles, livraison, produits, commandes (banc d'essai de la boutique et aperçu). */
class WooCommerce {}
trait CP_Reglages_WC {
	public $form_fields = array();
	public $settings = array();
	public function init_settings() {
		foreach ( $this->form_fields as $k => $f ) {
			$this->settings[ $k ] = $GLOBALS['wc_reglages'][ $this->id ][ $k ] ?? ( $f['default'] ?? '' );
		}
	}
	public function get_option( $k, $d = null ) {
		return isset( $this->settings[ $k ] ) && '' !== $this->settings[ $k ] ? $this->settings[ $k ] : $d;
	}
}
class WC_Payment_Gateway {
	use CP_Reglages_WC;
	public $id, $title, $enabled, $icon, $has_fields, $method_title, $method_description;
	public function is_available() { return 'yes' === $this->enabled; }
	public function get_return_url( $o = null ) { return 'https://navilink.test/commande/merci'; }
	protected function get_order_total() { return $GLOBALS['total_panier']; }
}
class WC_Shipping_Method {
	use CP_Reglages_WC;
	public $id, $instance_id, $method_title, $method_description, $supports = array(), $enabled, $title, $tarifs = array();
	public function add_rate( $r ) { $this->tarifs[] = $r; }
}
class FausseDate {
	public $t;
	function __construct( $t ) { $this->t = $t; }
	function getTimestamp() { return $this->t; }
	function date( $f ) { return date( $f, $this->t ); }
}
class FauxProduit {
	public $d;
	function __construct( $d ) { $this->d = $d + array( 'meta' => array(), 'poids' => '', 'l' => '', 'w' => '', 'h' => '', 'prix' => '' ); }
	function get_id() { return $this->d['id']; }
	function get_name() { return $this->d['nom']; }
	function get_price() { return $this->d['prix']; }
	function get_weight() { return $this->d['poids']; }
	function get_length() { return $this->d['l']; }
	function get_width() { return $this->d['w']; }
	function get_height() { return $this->d['h']; }
	function get_meta( $k ) { return $this->d['meta'][ $k ] ?? ''; }
	function get_parent_id() { return 0; }
	function is_type( $t ) { return 'simple' === $t; }
}
class FauxArticle {
	public $p, $q, $total;
	function __construct( $p, $q, $total ) { $this->p = $p; $this->q = $q; $this->total = $total; }
	function get_product() { return $this->p; }
	function get_quantity() { return $this->q; }
	function get_name() { return $this->p->get_name(); }
	function get_total() { return $this->total; }
}
class FausseLivraison {
	public $d;
	function __construct( $d ) { $this->d = $d; }
	function get_method_id() { return 'cp_cargo'; }
	function get_meta( $k ) { return $this->d['meta'][ $k ] ?? ''; }
	function get_total() { return $this->d['cout']; }
	function get_name() { return $this->d['nom']; }
}
class FausseCommande {
	public $meta = array(), $notes = array(), $statut = 'pending', $articles, $livraisons, $id, $paiement = 'cp_orange', $tx = '';
	function __construct( $id, $articles, $livraisons ) { $this->id = $id; $this->articles = $articles; $this->livraisons = $livraisons; }
	function get_id() { return $this->id; }
	function get_order_number() { return (string) $this->id; }
	function get_order_key() { return 'wc_order_cle' . $this->id; }
	function get_meta( $k ) { return $this->meta[ $k ] ?? ''; }
	function update_meta_data( $k, $v ) { $this->meta[ $k ] = $v; }
	function save() {}
	function add_order_note( $n ) { $this->notes[] = $n; }
	function get_items( $t = 'line_item' ) { return 'shipping' === $t ? $this->livraisons : $this->articles; }
	function get_fees() { return array(); }
	function get_billing_first_name() { return 'Awa'; }
	function get_billing_last_name() { return 'Sawadogo'; }
	function get_billing_phone() { return '+226 70 11 22 33'; }
	function get_billing_email() { return 'awa@example.com'; }
	function get_billing_city() { return 'Ouagadougou'; }
	function get_billing_country() { return 'BF'; }
	function get_billing_address_1() { return 'Secteur 15'; }
	function get_shipping_first_name() { return ''; }
	function get_shipping_last_name() { return ''; }
	function get_shipping_city() { return ''; }
	function get_shipping_address_1() { return ''; }
	function get_subtotal() { return array_sum( array_map( function ( $a ) { return $a->get_total(); }, $this->articles ) ); }
	function get_total() { return $this->get_subtotal() + array_sum( array_map( function ( $l ) { return $l->get_total(); }, $this->livraisons ) ); }
	function get_total_tax() { return 0; }
	function get_payment_method() { return $this->paiement; }
	function get_payment_method_title() { return 'Orange Money'; }
	function set_transaction_id( $t ) { $this->tx = $t; }
	function get_transaction_id() { return $this->tx; }
	function get_customer_id() { return 0; }
	function get_date_paid() { return new FausseDate( time() ); }
	function get_date_created() { return new FausseDate( time() ); }
	function get_view_order_url() { return 'https://navilink.test/mon-compte/commande/' . $this->id; }
	function update_status( $s, $note = '' ) { $this->statut = $s; $this->notes[] = $note; }
	function has_status( $s ) { return in_array( $this->statut, (array) $s, true ); }
}
$GLOBALS['wc'] = (object) array( 'cart' => new class { public $vide = false; function empty_cart() { $this->vide = true; } }, 'countries' => (object) array( 'countries' => array( 'BF' => 'Burkina Faso' ) ) );
function WC() { return $GLOBALS['wc']; }
function wc_get_page_permalink( $p ) { return 'https://navilink.test/boutique/'; }
function wc_price( $n ) { return '<span>' . number_format( $n, 0, ',', ' ' ) . '&nbsp;FCFA</span>'; }
function wp_strip_all_tags( $s ) { return html_entity_decode( strip_tags( $s ) ); }
function wc_add_notice( $m, $t ) { $GLOBALS['avis_wc'][] = $m; }
function wc_get_orders( $a ) { return array_keys( array_filter( $GLOBALS['commandes'], function ( $o ) use ( $a ) { return $o->get_meta( '_cp_mm_transaction' ) === $a['meta_query'][0]['value']; } ) ); }
function wc_get_order_statuses() { return array( 'wc-pending' => 'En attente de paiement', 'wc-on-hold' => 'En attente' ); }
function wc_get_order( $id ) { return $GLOBALS['commandes'][ $id ] ?? false; }
function wc_get_product( $id ) { return null; }
function wc_get_weight( $v, $u ) { return $v; }
function wc_get_dimension( $v, $u ) { return $v; }
function wc_reduce_stock_levels( $id ) {}
function wp_upload_dir() { return array( 'basedir' => $GLOBALS['OUT'] . '/uploads' ); }
function wp_next_scheduled() { return true; }

function wc_get_account_endpoint_url( $e ) { return 'https://navilink.test/mon-compte/' . $e . '/'; }
function is_wc_endpoint_url( $e = '' ) { return false; }
function wc_get_page_id( $p ) { return 0; }
