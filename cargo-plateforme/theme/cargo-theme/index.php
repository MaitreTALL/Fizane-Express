<?php get_header(); ?>
<?php if ( ! is_front_page() ) : ?><div class="ct-page-titre"><h1><?php echo is_singular() ? esc_html( get_the_title() ) : esc_html( wp_strip_all_tags( get_the_archive_title() ) ); ?></h1></div><?php endif; ?>
<div class="<?php echo is_front_page() ? '' : 'ct-page'; ?>">
	<?php
	while ( have_posts() ) {
		the_post();
		if ( ! is_singular() ) {
			echo '<h2><a href="' . esc_url( get_permalink() ) . '">' . esc_html( get_the_title() ) . '</a></h2>';
			the_excerpt();
		} else {
			the_content();
		}
	}
	?>
</div>
<?php get_footer(); ?>
