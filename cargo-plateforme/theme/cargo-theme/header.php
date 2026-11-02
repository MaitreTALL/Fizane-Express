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
$ct_tel_o = ct_r( 'entreprise.telephone_chine' );
$ct_logo_clair = function_exists( 'cp_logo_clair_url' ) ? cp_logo_clair_url( 'medium' ) : '';
$ct_logo = $ct_logo_clair ? $ct_logo_clair : ( function_exists( 'cp_logo_url' ) ? cp_logo_url( 'medium' ) : '' );
$ct_bandeau = ct_r( 'site.bandeau' ) ?: ct_r( 'entreprise.mentions' );
?>
<div class="ct-barre"><div class="ct-in ct-barre-in">
	<span class="ct-barre-texte"><?php echo esc_html( $ct_bandeau ); ?></span>
	<nav class="ct-barre-liens" aria-label="Accès rapide">
		<?php if ( function_exists( 'cp_url_page' ) ) : ?>
			<a href="<?php echo esc_url( cp_url_page( 'suivi' ) ); ?>"><?php echo ct_icone( 'loupe' ); // phpcs:ignore ?>Suivre un colis</a>
			<a href="<?php echo esc_url( cp_url_page( 'espace' ) ); ?>"><?php echo ct_icone( 'equipe' ); // phpcs:ignore ?>Espace client</a>
		<?php endif; ?>
		<?php if ( $ct_tel_o ) : ?><a class="ct-barre-tel" href="tel:<?php echo esc_attr( preg_replace( '/[^\d+]/', '', $ct_tel_o ) ); ?>"><?php echo ct_icone( 'telephone' ); // phpcs:ignore ?><?php echo esc_html( ct_r( 'origine.pays' ) . ' : ' . $ct_tel_o ); ?></a><?php endif; ?>
	</nav>
</div></div>
<header class="ct-entete"><div class="ct-in ct-entete-in">
	<a class="ct-logo<?php echo $ct_logo && ! $ct_logo_clair ? ' ct-logo-pastille' : ''; ?>" href="<?php echo esc_url( home_url( '/' ) ); ?>">
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
	<?php if ( $ct_tel ) : ?>
		<a class="ct-appel" href="tel:<?php echo esc_attr( preg_replace( '/[^\d+]/', '', $ct_tel ) ); ?>"><span class="ct-appel-ico"><?php echo ct_icone( 'telephone' ); // phpcs:ignore ?></span><span><b><?php echo esc_html( $ct_tel ); ?></b><small><?php echo esc_html( ct_r( 'site.horaires' ) ?: 'Appel ou WhatsApp' ); ?></small></span></a>
	<?php endif; ?>
	<?php if ( function_exists( 'cp_url_page' ) ) : ?><a class="ct-cta" href="<?php echo esc_url( cp_url_page( 'declarer' ) ); ?>">Expédier un colis <?php echo ct_icone( 'fleche' ); // phpcs:ignore ?></a><?php endif; ?>
	<button class="ct-burger" aria-label="Menu" aria-controls="ct-menu" aria-expanded="false" onclick="var m=document.getElementById('ct-menu');this.setAttribute('aria-expanded',m.classList.toggle('ct-ouvert'))"><span></span><span></span><span></span></button>
</div></header>
<main class="ct-contenu">
