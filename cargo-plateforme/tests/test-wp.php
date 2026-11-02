<?php
/**
 * Banc d'essai hors WordPress : de petites doublures des fonctions de WordPress permettent d'exécuter le parcours
 * complet (import de la configuration Navilink, déclaration d'un envoi par l'API, étapes, paiement, e-mails avec
 * PDF, pages publiques). Usage : php tests/test-wp.php <dossier de sortie>
 */
error_reporting( E_ALL );
set_error_handler( function ( $no, $msg, $f, $l ) { fwrite( STDERR, "AVERTISSEMENT PHP : $msg ($f:$l)\n" ); exit( 2 ); } );
$OUT = $argv[1] ?? sys_get_temp_dir();
define( 'ABSPATH', __DIR__ . '/' );
define( 'HOUR_IN_SECONDS', 3600 );
define( 'MB_IN_BYTES', 1048576 );
$GLOBALS['opt'] = array( 'admin_email' => 'admin@navilink.test', 'blogname' => 'Navilink' );
$GLOBALS['meta'] = array();
$GLOBALS['posts'] = array();
$GLOBALS['mails'] = array();
$GLOBALS['hooks'] = array();
$GLOBALS['codes'] = array();
$GLOBALS['routes'] = array();
function add_action( $h, $cb, $p = 10, $n = 1 ) { $GLOBALS['hooks'][ $h ][] = $cb; }
function add_filter( $h, $cb, $p = 10, $n = 1 ) { $GLOBALS['hooks'][ $h ][] = $cb; }
function do_action( $h, ...$a ) { foreach ( $GLOBALS['hooks'][ $h ] ?? array() as $cb ) { $cb( ...$a ); } }
function remove_action() {}
function add_shortcode( $t, $cb ) { $GLOBALS['codes'][ $t ] = $cb; }
function do_shortcode( $s ) { return preg_replace_callback( '/\[(\w+)\]/', function ( $m ) { return isset( $GLOBALS['codes'][ $m[1] ] ) ? $GLOBALS['codes'][ $m[1] ](array()) : $m[0]; }, $s ); }
function register_activation_hook() {} function register_deactivation_hook() {}
function plugin_dir_url( $f ) { return 'https://navilink.test/wp-content/plugins/cargo-plateforme/'; }
function get_option( $k, $d = false ) { return $GLOBALS['opt'][ $k ] ?? $d; }
function update_option( $k, $v ) { $GLOBALS['opt'][ $k ] = $v; return true; }
function delete_option( $k ) { unset( $GLOBALS['opt'][ $k ] ); }
function get_bloginfo( $k = '' ) { return 'name' === $k ? $GLOBALS['opt']['blogname'] : ''; }
function sanitize_text_field( $s ) { return trim( preg_replace( '/\s+/', ' ', strip_tags( (string) $s ) ) ); }
function sanitize_textarea_field( $s ) { return trim( strip_tags( (string) $s ) ); }
function sanitize_email( $s ) { return filter_var( trim( (string) $s ), FILTER_VALIDATE_EMAIL ) ? trim( $s ) : ''; }
function is_email( $s ) { return (bool) filter_var( $s, FILTER_VALIDATE_EMAIL ); }
function sanitize_hex_color( $c ) { return preg_match( '/^#([0-9a-f]{3}){1,2}$/i', (string) $c ) ? $c : null; }
function sanitize_key( $k ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $k ) ); }
function sanitize_title( $s ) { return trim( preg_replace( '/[^a-z0-9]+/', '-', strtolower( remove_accents( $s ) ) ), '-' ); }
function sanitize_file_name( $s ) { return preg_replace( '/[^A-Za-z0-9._-]/', '-', $s ); }
function remove_accents( $s ) { return iconv( 'UTF-8', 'ASCII//TRANSLIT', $s ); }
function absint( $n ) { return abs( (int) $n ); }
function wp_list_pluck( $l, $k ) { return array_column( $l, $k ); }
function wp_parse_args( $a, $d ) { return array_merge( $d, (array) $a ); }
function wp_unslash( $v ) { return $v; }
function esc_html( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
function esc_attr( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
function esc_url( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
function esc_url_raw( $s ) { return (string) $s; }
function esc_textarea( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
function checked( $a, $b = true, $e = true ) { $r = $a == $b ? ' checked' : ''; if ( $e ) { echo $r; } return $r; }
function selected( $a, $b = true, $e = true ) { $r = $a == $b ? ' selected' : ''; if ( $e ) { echo $r; } return $r; }
function wp_date( $f, $t = null ) { return date( $f, $t ?? time() ); }
function number_format_i18n( $n, $d = 0 ) { return number_format( $n, $d, ',', ' ' ); }
function home_url( $p = '' ) { return 'https://navilink.test' . $p; }
function admin_url( $p = '' ) { return 'https://navilink.test/wp-admin/' . $p; }
function rest_url( $p = '' ) { return 'https://navilink.test/wp-json/' . $p; }
function add_query_arg( $a, $u = "", $v = null ) { if ( ! is_array( $a ) ) { $a = array( $a => $u ); $u = (string) $v; } return $u . ( strpos( $u, "?" ) === false ? "?" : "&" ) . http_build_query( $a ); }
function get_permalink( $id ) { return 'https://navilink.test/?page_id=' . $id; }
function wp_create_nonce() { return 'nonce'; }
function wp_verify_nonce() { return true; }
function wp_generate_password( $n = 12, $s = true ) { return substr( bin2hex( random_bytes( $n ) ), 0, $n ); }
function get_temp_dir() { return sys_get_temp_dir() . '/'; }
function wp_mkdir_p( $d ) { return is_dir( $d ) || mkdir( $d, 0777, true ); }
function trailingslashit( $s ) { return rtrim( $s, '/' ) . '/'; }
function wp_mail( $a, $s, $h, $e, $f ) { $p = array(); foreach ( $f as $x ) { $p[ basename( $x ) ] = file_get_contents( $x ); } $GLOBALS['mails'][] = compact( 'a', 's', 'h', 'p' ); return true; }
function get_current_user_id() { return 0; }
function wp_get_current_user() { return new class { function exists() { return false; } public $display_name = ''; public $user_email = ''; }; }
function is_user_logged_in() { return false; }
function wp_login_form() { return '<form>connexion</form>'; }
function wp_registration_url() { return ''; }
function get_transient() { return 0; } function set_transient() {}
function wp_get_attachment_image_url( $id ) { return 'https://navilink.test/logo.jpg'; }
function get_attached_file( $id ) { return $GLOBALS['fichiers'][ $id ] ?? ''; }
function wp_insert_post( $a ) { $id = count( $GLOBALS['posts'] ) + 100; $GLOBALS['posts'][ $id ] = $a + array( 'date' => time() ); return $id; }
function wp_update_post() {}
function get_post( $id ) { return isset( $GLOBALS['posts'][ $id ] ) ? (object) $GLOBALS['posts'][ $id ] : null; }
function get_post_time( $f, $g, $id ) { return $GLOBALS['posts'][ $id ]['date'] ?? time(); }
function is_wp_error( $x ) { return $x instanceof WP_Error; }
function get_post_meta( $id, $k, $s = true ) { return $GLOBALS['meta'][ $id ][ $k ] ?? ''; }
function update_post_meta( $id, $k, $v ) { $GLOBALS['meta'][ $id ][ $k ] = $v; }
function get_posts( $a ) {
	$r = array();
	foreach ( $GLOBALS['meta'] as $id => $m ) {
		if ( isset( $a['meta_key'] ) && ( $m[ $a['meta_key'] ] ?? null ) === $a['meta_value'] ) { $r[] = $id; }
	}
	return $r;
}
function __return_true() { return true; }
function register_post_type() {} function flush_rewrite_rules() {}
class WP_Error { public $m; function __construct( $c, $m, $d = array() ) { $this->m = $m; } }
class WP_REST_Request implements ArrayAccess {
	private $p; private $h;
	function __construct( $p, $h = array() ) { $this->p = $p; $this->h = $h; }
	function get_param( $k ) { return $this->p[ $k ] ?? null; }
	function get_header( $k ) { return $this->h[ $k ] ?? ''; }
	function offsetExists( $k ): bool { return isset( $this->p[ $k ] ); }
	function offsetGet( $k ): mixed { return $this->p[ $k ]; }
	function offsetSet( $k, $v ): void {} function offsetUnset( $k ): void {}
}
function verifier( $cond, $nom ) { if ( ! $cond ) { fwrite( STDERR, "ÉCHEC : $nom\n" ); exit( 1 ); } echo "ok  $nom\n"; }

require __DIR__ . '/../cargo-plateforme.php';

// 1. import de la configuration Navilink (comme dans l'assistant)
$j = json_decode( file_get_contents( __DIR__ . '/../sites/navilink/reglages.json' ), true );
$j['paiement'] = array( 'orange_money' => '+226 54 20 55 46', 'wave' => '+226 54 20 55 46' );
$j['documents'] = array( 'banniere' => 7, 'services' => 'Achat assisté • Logistique • Transfert • Change • Vente & location de véhicules', 'accroche' => 'De la Chine au Burkina Faso en toute sécurité', 'pied' => 'Votre partenaire de confiance pour vos achats en Chine' );
$j['entreprise']['logo_id'] = 5;
$j['entreprise']['email'] = 'contact@navilink.test';
update_option( 'cp_reglages', cp_nettoyer_reglages( $j ) );
$GLOBALS['fichiers'] = array( 5 => __DIR__ . '/../sites/navilink/logo.jpg', 7 => __DIR__ . '/../sites/navilink/banniere-documents.jpg' );
$r = get_option( 'cp_reglages' );
verifier( 4 === count( $r['modes'] ) && 'mco' === $r['modes'][0]['id'] && 195000.0 === $r['modes'][3]['prix_alt'], 'import : 4 modes, second tarif maritime' );
verifier( 'NVL' === $r['code']['prefixe'] && '#0146AF' === $r['couleurs']['primaire'], 'import : préfixe et couleurs' );
cp_creer_pages();
verifier( (int) get_option( 'cp_page_suivi' ) > 0, 'pages créées' );

// 2. déclaration par l'API publique
$q = new WP_REST_Request( array( 'mode' => 'maritime', 'categorie' => 'Pièces auto', 'contenu' => 'amortisseurs',
	'client' => array( 'nom' => 'Issouf Ouédraogo', 'telephone' => '+226 70 00 00 00', 'email' => 'issouf@example.com', 'ville' => 'Ouagadougou', 'fournisseur' => '1688' ),
	'destinataire' => array( 'nom' => '', 'ville' => 'Bobo-Dioulasso', 'agence' => 'Ouagadougou' ),
	'colis' => array( array( 'nombre' => 3, 'poids' => 20, 'longueur' => 60, 'largeur' => 50, 'hauteur' => 40 ) ), 'site_web' => '' ), array( 'X-WP-Nonce' => 'nonce' ) );
$rep = cp_rest_declarer( $q );
verifier( is_array( $rep ) && preg_match( '/^NVL-[2-9A-HJ-NP-Z]{6}$/', $rep['code'] ), 'déclaration : code ' . ( $rep['code'] ?? '?' ) );
$id = cp_envoi_par_code( $rep['code'] );
$e = cp_envoi( $id );
verifier( 0.36 === (float) $e['calcul']['facture'] && 77400.0 === (float) $e['montant'], 'maritime : 3 × 0,12 m³ = 0,36 m³ × 215 000 = 77 400' );
verifier( 70200.0 === (float) $e['calcul']['total_alt'], 'paiement sur place : 70 200' );
verifier( 'Issouf Ouédraogo' === $e['destinataire']['nom'], 'destinataire vide = le client' );
verifier( 2 === count( $GLOBALS['mails'] ) && isset( $GLOBALS['mails'][0]['p'][ 'fiche-' . $rep['code'] . '.pdf' ] ), 'e-mails : client (bordereau + étiquettes) et entreprise' );
verifier( false !== strpos( $GLOBALS['mails'][0]['h'], '诚信大道266号' ), 'e-mail : adresse de l\'entrepôt maritime en chinois' );
file_put_contents( "$OUT/wp-bordereau.pdf", $GLOBALS['mails'][0]['p'][ 'fiche-' . $rep['code'] . '.pdf' ] );
// refus : e-mail manquant
$q2 = new WP_REST_Request( array( 'mode' => 'mco', 'client' => array( 'nom' => 'A', 'telephone' => '1' ) ), array( 'X-WP-Nonce' => 'nonce' ) );
verifier( cp_rest_declarer( $q2 ) instanceof WP_Error, 'déclaration incomplète refusée' );

// 3. étapes, paiement, reçu
cp_changer_etape( $id, 'recu', 'Colis pesés', 'Yiwu' );
cp_changer_etape( $id, 'expedie', '', 'Ningbo' );
cp_marquer_paye( $id, 'Orange Money', 'MP2611.0042' );
$e = cp_envoi( $id );
verifier( 'paye' === $e['paiement']['statut'] && preg_match( '/^R\d{4}-00001$/', $e['recu'] ), 'paiement : reçu ' . $e['recu'] );
$dernier = end( $GLOBALS['mails'] );
verifier( isset( $dernier['p'][ 'recu-' . $e['recu'] . '.pdf' ] ), 'e-mail du reçu avec PDF' );
file_put_contents( "$OUT/wp-recu.pdf", $dernier['p'][ 'recu-' . $e['recu'] . '.pdf' ] );
$s = cp_suivi_public( $id );
verifier( 'Expédié' === $s['statut'] && 3 === $s['colis'] && '' !== $s['arrivee'], 'suivi public : ' . $s['statut'] . ', ' . $s['arrivee'] );
verifier( ! isset( $s['client'] ) && false === strpos( json_encode( $s ), 'Issouf' ), 'suivi public sans données personnelles' );

// 4. pages publiques
foreach ( array( 'cargo_accueil', 'cargo_tarifs', 'cargo_simulateur', 'cargo_suivi', 'cargo_declarer', 'cargo_mon_espace' ) as $c ) {
	$h = $GLOBALS['codes'][ $c ]( array() );
	verifier( strlen( $h ) > 200, "code court [$c] (" . strlen( $h ) . ' caractères)' );
	file_put_contents( "$OUT/$c.html", $h );
}
verifier( false !== strpos( $GLOBALS['codes']['cargo_tarifs']( array() ), 'Paiement sur place' ), 'tarifs : second tarif affiché' );
echo 'e-mails envoyés : ' . count( $GLOBALS['mails'] ) . "\n";
foreach ( $GLOBALS['mails'] as $m ) { echo '  → ' . $m['a'] . ' : ' . $m['s'] . ' [' . implode( ', ', array_keys( $m['p'] ) ) . "]\n"; }
