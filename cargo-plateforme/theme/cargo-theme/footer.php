</main>
<footer class="ct-pied">
	<div class="ct-pied-in">
		<div>
			<?php $logo = function_exists( 'cp_logo_url' ) ? cp_logo_url( 'medium' ) : ''; ?>
			<?php if ( $logo ) : ?><img src="<?php echo esc_url( $logo ); ?>" alt=""><?php endif; ?>
			<h3><?php bloginfo( 'name' ); ?></h3>
			<p><?php echo esc_html( ct_r( 'entreprise.slogan' ) ); ?></p>
			<p><?php echo esc_html( ct_r( 'origine.pays' ) . ' → ' . ct_r( 'destination.pays' ) ); ?></p>
		</div>
		<div>
			<h3>Services</h3>
			<?php foreach ( ct_liens() as $l ) : ?><a href="<?php echo esc_url( $l[1] ); ?>"><?php echo esc_html( $l[0] ); ?></a><?php endforeach; ?>
		</div>
		<div>
			<h3>Contact</h3>
			<?php foreach ( array_filter( array( ct_r( 'entreprise.telephone' ), ct_r( 'entreprise.telephone_chine' ) ) ) as $t ) : ?><a href="tel:<?php echo esc_attr( preg_replace( '/[^\d+]/', '', $t ) ); ?>"><?php echo esc_html( $t ); ?></a><?php endforeach; ?>
			<?php if ( ct_r( 'entreprise.email' ) ) : ?><a href="mailto:<?php echo esc_attr( ct_r( 'entreprise.email' ) ); ?>"><?php echo esc_html( ct_r( 'entreprise.email' ) ); ?></a><?php endif; ?>
			<?php if ( ct_r( 'entreprise.adresse' ) ) : ?><p><?php echo esc_html( ct_r( 'entreprise.adresse' ) ); ?></p><?php endif; ?>
		</div>
	</div>
	<div class="ct-pied-bas"><span>© <?php echo esc_html( gmdate( 'Y' ) . ' ' . get_bloginfo( 'name' ) ); ?><?php echo ct_r( 'entreprise.rccm' ) ? ' · RCCM ' . esc_html( ct_r( 'entreprise.rccm' ) ) : ''; ?><?php echo ct_r( 'entreprise.ifu' ) ? ' · IFU ' . esc_html( ct_r( 'entreprise.ifu' ) ) : ''; ?></span><span><?php echo esc_html( ct_r( 'entreprise.mentions' ) ); ?></span></div>
</footer>
<?php $wa = function_exists( 'cp_whatsapp_lien' ) ? cp_whatsapp_lien( 'Bonjour ' . get_bloginfo( 'name' ) ) : ''; ?>
<?php if ( $wa ) : ?><a class="ct-wa" href="<?php echo esc_url( $wa ); ?>" aria-label="WhatsApp" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.5 2 2 3.6 4 4.5l1.2-1.2 2 .8-.5 1.9c-3.5 0-7.4-3.9-7.4-7.4l1.9-.5.8 2z"/></svg></a><?php endif; ?>
<?php wp_footer(); ?>
</body>
</html>
