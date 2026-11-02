<?php
/**
 * Aperçu de la page d'accueil hors WordPress : exécute le vrai thème (en-tête, pied de page) et le code court
 * [cargo_accueil] avec la configuration Navilink et ses photos, puis écrit une page HTML autonome.
 * Usage : php tests/apercu.php <dossier de sortie>
 */
$OUT = rtrim( $argv[1] ?? sys_get_temp_dir() . '/apercu', '/' );
@mkdir( $OUT, 0777, true );
require __DIR__ . '/doublures.php';
require __DIR__ . '/../cargo-plateforme.php';
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
		copy( "$SITE/$f", "$OUT/$f" );
		$GLOBALS['urls'][ $ids[ $f ] ] = $f;
	}
	return $ids[ $f ];
};
$j = json_decode( file_get_contents( "$SITE/reglages.json" ), true );
$j['entreprise']['logo_id'] = $id( $img['entreprise.logo_id'] );
$j['site']['hero_images'] = array_map( $id, $img['site.hero_images'] );
$j['site']['pourquoi_image'] = $id( $img['site.pourquoi_image'] );
foreach ( $j['services'] as $i => $s ) {
	$j['services'][ $i ]['image'] = $id( $img['services'][ $i ] ?? '' );
}
update_option( 'cp_reglages', cp_nettoyer_reglages( $j ) );
cp_creer_pages();

// doublures du thème
function language_attributes() { echo 'lang="fr-FR"'; }
function bloginfo( $k = '' ) { echo 'charset' === $k ? 'UTF-8' : esc_html( get_bloginfo( 'name' ) ); }
function body_class() { echo 'class="home page"'; }
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

ob_start();
require $THEME . '/header.php';
echo do_shortcode( '[cargo_accueil]' );
require $THEME . '/footer.php';
file_put_contents( "$OUT/index.html", ob_get_clean() );
echo "$OUT/index.html\n";
