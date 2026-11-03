<?php
/**
 * Aperçu hors WordPress : exécute le vrai thème (en-tête, pied de page) et le code court [cargo_accueil] avec la
 * configuration Navilink et ses photos, puis écrit des pages HTML autonomes.
 * Avec « boutique » : produits d'EXEMPLE (aperçu seulement) et pages boutique, fiche produit et paiement.
 * Usage : php tests/apercu.php <dossier de sortie> [boutique]
 */
$OUT = rtrim( $argv[1] ?? sys_get_temp_dir() . '/apercu', '/' );
$BOUTIQUE = in_array( 'boutique', $argv, true );
@mkdir( $OUT, 0777, true );
require __DIR__ . '/doublures.php';
if ( $BOUTIQUE ) {
	require __DIR__ . '/doublures-wc.php';
}
require __DIR__ . '/../cargo-plateforme.php';
if ( $BOUTIQUE ) {
	do_action( 'plugins_loaded' );
	do_action( 'woocommerce_shipping_init' );
}
$THEME = __DIR__ . '/../theme/cargo-theme';
require $THEME . '/functions.php';

// photos de la médiathèque simulée
$SITE = __DIR__ . '/../sites/navilink';
$img = json_decode( file_get_contents( "$SITE/images.json" ), true );
$id = function ( $f ) use ( $SITE, $OUT ) {               // médiathèque simulée : un identifiant par fichier
	static $ids = array();
	if ( ! $f ) {
		return 0;
	}
	if ( ! isset( $ids[ $f ] ) ) {
		$ids[ $f ] = 100 + count( $ids );
		copy( file_exists( "$SITE/$f" ) ? "$SITE/$f" : getenv( 'APERCU_IMAGES' ) . "/$f", "$OUT/$f" );   // photos HD : dossier APERCU_IMAGES
		$GLOBALS['urls'][ $ids[ $f ] ] = $f;
	}
	return $ids[ $f ];
};
$j = json_decode( file_get_contents( "$SITE/reglages.json" ), true );
$j['entreprise']['logo_id'] = $id( $img['entreprise.logo_id'] );
$j['entreprise']['logo_clair_id'] = $id( $img['entreprise.logo_clair_id'] ?? '' );
$j['site']['hero_images'] = array_map( $id, $img['site.hero_images'] );
$j['site']['pourquoi_image'] = $id( $img['site.pourquoi_image'] );
foreach ( (array) ( $img['site.diapos'] ?? array() ) as $k => $f ) {   // photos du diaporama (textes dans reglages.json)
	$j['site']['diapos'][ $k ]['image'] = $id( $f );
}
foreach ( $j['services'] as $i => $s ) {
	$j['services'][ $i ]['image'] = $id( $img['services'][ $i ] ?? '' );
}
if ( $BOUTIQUE ) {      // numéros d'EXEMPLE (WhatsApp) tant que les numéros Mobile Money ne sont pas connus
	$j['paiement'] = array( 'orange_money' => '+226 54 20 55 46', 'wave' => '+226 54 20 55 46' );
	is_dir( "$OUT/moyens" ) || mkdir( "$OUT/moyens" );
	foreach ( glob( __DIR__ . '/../assets/moyens/*' ) as $f ) {
		copy( $f, "$OUT/moyens/" . basename( $f ) );
	}
}
update_option( 'cp_reglages', cp_nettoyer_reglages( $j ) );
cp_creer_pages();

// doublures du thème
function language_attributes() { echo 'lang="fr-FR"'; }
function bloginfo( $k = '' ) { echo 'charset' === $k ? 'UTF-8' : esc_html( get_bloginfo( 'name' ) ); }
function body_class() { echo 'class="' . esc_attr( $GLOBALS['classes_body'] ?? 'home page' ) . '"'; }
function wp_body_open() {}
function has_nav_menu() { return false; }
function untrailingslashit( $s ) { return rtrim( $s, '/' ); }
function wp_head() {
	echo '<title>' . esc_html( cp_r( 'entreprise.nom' ) ) . '</title>';
	echo '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">';
	echo '<style>' . file_get_contents( $GLOBALS['THEME'] . '/style.css' ) . "\n" . file_get_contents( __DIR__ . '/../assets/cargo.css' ) . "\n" . cp_css_couleurs() . '</style>';
}
function wp_footer() {
	echo '<script>var CARGO = ' . json_encode( cp_config_js(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . ';</script>';
	echo '<script>' . file_get_contents( __DIR__ . '/../assets/cargo.js' ) . '</script>';
}
function wp_json_encode( $v, $o = 0 ) { return json_encode( $v, $o ); }

if ( $BOUTIQUE ) {
	require __DIR__ . '/apercu-boutique.php';
}
function cp_apercu_page( $fichier, $classes, $contenu ) {
	$GLOBALS['classes_body'] = $classes;
	ob_start();
	require $GLOBALS['THEME'] . '/header.php';
	echo $contenu; // phpcs:ignore
	require $GLOBALS['THEME'] . '/footer.php';
	file_put_contents( $GLOBALS['OUT'] . '/' . $fichier, str_replace( CP_URL . 'assets/moyens/', 'moyens/', ob_get_clean() ) );
	echo $GLOBALS['OUT'] . '/' . $fichier . "\n";
}
cp_apercu_page( 'index.html', 'home page', do_shortcode( '[cargo_accueil]' ) );
if ( $BOUTIQUE ) {
	cp_apercu_pages_boutique();
}
