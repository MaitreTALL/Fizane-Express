<?php
/**
 * Navilink : contournement provisoire du cache du CDN de Hostinger (extension « must-use »).
 *
 * Le CDN garde jusqu'au 9 novembre 2026 (22 h 03 UTC) une ancienne copie de la page d'accueil /navilink/, mise en
 * cache pendant l'installation. Il ne sert pas ses copies aux visiteurs qui ont un cookie « comment_author_… » :
 * chaque page servie par le serveur pose donc ce cookie technique (valeur « 1 », aucune donnée personnelle) pour que
 * la page d'accueil suivante vienne, elle aussi, du serveur. Lien à partager d'ici là : /navilink/?bienvenue, qui
 * n'est jamais en cache ; le paramètre est ensuite retiré de la barre d'adresse.
 *
 * Ne fait plus rien à partir du 10 novembre 2026 : le fichier peut alors être supprimé.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const NVL_CDN_FIN = 1794268800; // 10 novembre 2026, 0 h UTC

if ( time() < NVL_CDN_FIN ) {
	add_action( 'init', function () {
		if ( headers_sent() || isset( $_COOKIE['comment_author_navilink'] ) ) {
			return;
		}
		setcookie( 'comment_author_navilink', '1', array(
			'expires'  => NVL_CDN_FIN,
			'path'     => COOKIEPATH ? COOKIEPATH : '/',
			'secure'   => is_ssl(),
			'httponly' => true,
			'samesite' => 'Lax',
		) );
	}, 1 );

	add_action( 'wp_head', function () {
		if ( isset( $_GET['bienvenue'] ) ) { // phpcs:ignore -- simple marqueur d'adresse
			echo "<script>history.replaceState&&history.replaceState(null,'',location.pathname+location.hash)</script>\n";
		}
	}, 1 );
}
