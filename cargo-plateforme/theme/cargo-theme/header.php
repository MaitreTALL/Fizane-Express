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
<header class="ct-entete"><div class="ct-entete-in">
	<a class="ct-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>">
		<?php $logo = function_exists( 'cp_logo_url' ) ? cp_logo_url( 'medium' ) : ''; ?>
		<?php if ( $logo ) : ?><img src="<?php echo esc_url( $logo ); ?>" alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"><?php else : ?><span><?php bloginfo( 'name' ); ?></span><?php endif; ?>
	</a>
	<button class="ct-burger" aria-label="Menu" onclick="document.querySelector('.ct-menu').classList.toggle('ct-ouvert')"><span></span><span></span><span></span></button>
	<nav class="ct-menu">
		<?php
		if ( has_nav_menu( 'principal' ) ) {
			wp_nav_menu( array( 'theme_location' => 'principal', 'container' => false, 'items_wrap' => '%3$s', 'depth' => 1, 'fallback_cb' => false ) );
		} else {
			$ici = home_url( add_query_arg( array() ) );
			foreach ( ct_liens() as $l ) {
				printf( '<a href="%s" class="%s">%s</a>', esc_url( $l[1] ), esc_attr( trim( ( $l[2] ?? '' ) . ( untrailingslashit( $l[1] ) === untrailingslashit( strtok( $ici, '?' ) ) ? ' ct-actif' : '' ) ) ), esc_html( $l[0] ) );
			}
		}
		?>
	</nav>
</div></header>
<main class="ct-contenu">
