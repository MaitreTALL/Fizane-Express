<!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="<?php echo esc_attr( ct_r( 'couleurs.primaire', '#0B3C5D' ) ); ?>">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<?php
$ct_tel = ct_r( 'entreprise.telephone' );
$ct_logo = function_exists( 'cp_logo_url' ) ? cp_logo_url( 'medium' ) : '';
$ct_o = ct_r( 'origine.pays' );
$ct_d = ct_r( 'destination.pays' );
?>
<div class="ct-barre"><div class="ct-in ct-barre-in">
	<ul class="ct-barre-atouts">
		<li><?php echo ct_icone( 'globe' ); // phpcs:ignore ?><?php echo esc_html( ct_r( 'site.bandeau' ) ?: 'Fret aérien & maritime ' . $ct_o . ' → ' . $ct_d ); ?></li>
		<li><?php echo ct_icone( 'suivi' ); // phpcs:ignore ?>Suivi en ligne 24h/24</li>
		<li><?php echo ct_icone( 'casque' ); // phpcs:ignore ?>Assistance dédiée</li>
	</ul>
	<div class="ct-barre-liens">
		<?php if ( function_exists( 'cp_url_page' ) ) : ?><a href="<?php echo esc_url( cp_url_page( 'espace' ) ); ?>"><?php echo ct_icone( 'equipe' ); // phpcs:ignore ?>Espace client</a><?php endif; ?>
		<?php if ( $ct_tel ) : ?><a href="tel:<?php echo esc_attr( preg_replace( '/[^\d+]/', '', $ct_tel ) ); ?>"><?php echo ct_icone( 'telephone' ); // phpcs:ignore ?>Appelez-nous : <?php echo esc_html( $ct_tel ); ?></a><?php endif; ?>
	</div>
</div></div>
<header class="ct-entete"><div class="ct-in ct-entete-in">
	<a class="ct-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>">
		<?php if ( $ct_logo ) : ?><img src="<?php echo esc_url( $ct_logo ); ?>" alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"><?php else : ?><span><?php bloginfo( 'name' ); ?></span><?php endif; ?>
	</a>
	<nav class="ct-menu" id="ct-menu">
		<?php
		if ( has_nav_menu( 'principal' ) ) {
			wp_nav_menu( array( 'theme_location' => 'principal', 'container' => false, 'items_wrap' => '%3$s', 'depth' => 1, 'fallback_cb' => false ) );
		} else {
			$ici = untrailingslashit( strtok( home_url( add_query_arg( array() ) ), '?' ) );
			foreach ( ct_liens() as $l ) {
				printf( '<a href="%s"%s>%s</a>', esc_url( $l[1] ), untrailingslashit( $l[1] ) === $ici ? ' class="ct-actif"' : '', esc_html( $l[0] ) );
			}
		}
		?>
		<?php if ( function_exists( 'cp_url_page' ) ) : ?><a class="ct-menu-cta" href="<?php echo esc_url( cp_url_page( 'declarer' ) ); ?>">Expédier un colis</a><?php endif; ?>
	</nav>
	<?php if ( function_exists( 'cp_url_page' ) ) : ?>
		<a class="ct-suivre" href="<?php echo esc_url( cp_url_page( 'suivi' ) ); ?>" aria-label="Suivre un colis" title="Suivre un colis"><?php echo ct_icone( 'loupe' ); // phpcs:ignore ?></a>
		<a class="ct-cta" href="<?php echo esc_url( cp_url_page( 'declarer' ) ); ?>">Expédier un colis</a>
	<?php endif; ?>
	<button class="ct-burger" aria-label="Menu" aria-controls="ct-menu" aria-expanded="false" onclick="var m=document.getElementById('ct-menu');this.setAttribute('aria-expanded',m.classList.toggle('ct-ouvert'))"><span></span><span></span><span></span></button>
</div></header>
<main class="ct-contenu">
