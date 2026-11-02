</main>
<?php
$ct_logo = function_exists( 'cp_logo_url' ) ? cp_logo_url( 'medium' ) : '';
$ct_signature = ct_r( 'site.signature' ) ?: ct_r( 'entreprise.slogan' );
$ct_reseaux = array_filter( (array) ct_r( 'site.reseaux', array() ) );
?>
<footer class="ct-pied" id="contact">
	<div class="ct-in ct-pied-in">
		<div class="ct-pied-marque">
			<?php if ( $ct_logo ) : ?><img src="<?php echo esc_url( $ct_logo ); ?>" alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>"><?php else : ?><h3><?php bloginfo( 'name' ); ?></h3><?php endif; ?>
			<p><?php echo esc_html( ct_r( 'entreprise.slogan' ) ); ?></p>
			<p class="ct-pied-mots"><?php echo esc_html( ct_r( 'entreprise.mentions' ) ); ?></p>
			<?php if ( $ct_reseaux ) : ?>
				<div class="ct-reseaux"><?php foreach ( $ct_reseaux as $k => $u ) : ?><a href="<?php echo esc_url( $u ); ?>" aria-label="<?php echo esc_attr( ucfirst( $k ) ); ?>" target="_blank" rel="noopener"><?php echo ct_icone( $k ); // phpcs:ignore ?></a><?php endforeach; ?></div>
			<?php endif; ?>
		</div>
		<div>
			<h3>Liens rapides</h3>
			<?php foreach ( ct_liens() as $l ) : ?><a href="<?php echo esc_url( $l[1] ); ?>"><?php echo esc_html( $l[0] ); ?></a><?php endforeach; ?>
			<?php if ( function_exists( 'cp_url_page' ) ) : ?><a href="<?php echo esc_url( cp_url_page( 'espace' ) ); ?>">Espace client</a><a href="<?php echo esc_url( cp_url_page( 'declarer' ) ); ?>">Expédier un colis</a><?php endif; ?>
		</div>
		<div>
			<h3>Nos services</h3>
			<?php foreach ( (array) ct_r( 'services', array() ) as $s ) : ?><a href="<?php echo esc_url( function_exists( 'cp_lien_service' ) ? cp_lien_service( $s['lien'] ?? '' ) : home_url( '/' ) ); ?>"><?php echo esc_html( $s['titre'] ); ?></a><?php endforeach; ?>
		</div>
		<div class="ct-pied-contact">
			<h3>Contact</h3>
			<?php foreach ( (array) ct_r( 'destination.agences', array() ) as $a ) : ?>
				<p><?php echo ct_icone( 'suivi' ); // phpcs:ignore ?><span><?php echo esc_html( trim( $a['ville'] . ( $a['adresse'] ? ', ' . $a['adresse'] : '' ) . ', ' . ct_r( 'destination.pays' ), ', ' ) ); ?></span></p>
			<?php endforeach; ?>
			<?php foreach ( array_filter( array( ct_r( 'destination.pays' ) => ct_r( 'entreprise.telephone' ), ct_r( 'origine.pays' ) => ct_r( 'entreprise.telephone_chine' ) ) ) as $pays => $t ) : ?>
				<p><?php echo ct_icone( 'telephone' ); // phpcs:ignore ?><a href="tel:<?php echo esc_attr( preg_replace( '/[^\d+]/', '', $t ) ); ?>"><?php echo esc_html( $t ); ?> <small>(<?php echo esc_html( $pays ); ?>)</small></a></p>
			<?php endforeach; ?>
			<?php if ( ct_r( 'entreprise.email' ) ) : ?><p><?php echo ct_icone( 'email' ); // phpcs:ignore ?><a href="mailto:<?php echo esc_attr( ct_r( 'entreprise.email' ) ); ?>"><?php echo esc_html( ct_r( 'entreprise.email' ) ); ?></a></p><?php endif; ?>
			<?php if ( ct_r( 'site.horaires' ) ) : ?><p><?php echo ct_icone( 'horloge' ); // phpcs:ignore ?><span><?php echo esc_html( ct_r( 'site.horaires' ) ); ?></span></p><?php endif; ?>
		</div>
		<?php if ( $ct_signature ) : ?><p class="ct-pied-signature"><?php echo esc_html( $ct_signature ); ?></p><?php endif; ?>
	</div>
	<div class="ct-pied-bas"><div class="ct-in ct-pied-bas-in"><span>© <?php echo esc_html( gmdate( 'Y' ) . ' ' . get_bloginfo( 'name' ) ); ?><?php echo ct_r( 'entreprise.rccm' ) ? ' · RCCM ' . esc_html( ct_r( 'entreprise.rccm' ) ) : ''; ?><?php echo ct_r( 'entreprise.ifu' ) ? ' · IFU ' . esc_html( ct_r( 'entreprise.ifu' ) ) : ''; ?></span><span><?php echo esc_html( ct_r( 'origine.pays' ) . ' → ' . ct_r( 'destination.pays' ) ); ?></span></div></div>
</footer>
<?php $wa = function_exists( 'cp_whatsapp_lien' ) ? cp_whatsapp_lien( 'Bonjour ' . get_bloginfo( 'name' ) ) : ''; ?>
<?php if ( $wa ) : ?><a class="ct-wa" href="<?php echo esc_url( $wa ); ?>" aria-label="WhatsApp" target="_blank" rel="noopener"><?php echo ct_icone( 'whatsapp' ); // phpcs:ignore ?></a><?php endif; ?>
<?php wp_footer(); ?>
</body>
</html>
