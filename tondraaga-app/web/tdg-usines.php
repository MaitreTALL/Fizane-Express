<?php
/**
 * Plugin Name: Tondraaga — produits d'usine
 * Description: Produits importés des usines (rayons Électroménager et Véhicules) : prix de vente calculés à partir du prix
 *              fournisseur, recalcul en un clic, lien vers la fiche du fournisseur dans l'administration.
 *
 * Prix de vente = prix fournisseur (€) × 655,957 × coefficient, arrondi aux 500 FCFA supérieurs. Le coefficient couvre le
 * transport, le dédouanement et la marge ; il se règle dans Produits › Produits d'usine. Les véhicules sont « sur devis »
 * (sans prix). Un prix saisi à la main n'est plus recalculé (case « Prix calculé automatiquement » décochée).
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TDG_US_EURO = 655.957;

function tdg_us_coef() {
	$c = (float) get_option( 'tdg_usines_coef', 1.8 );
	return $c >= 1 ? $c : 1.8;
}

function tdg_us_prix( $eur, $coef = null ) {
	$v = (float) $eur * TDG_US_EURO * ( null === $coef ? tdg_us_coef() : (float) $coef );
	return $v > 0 ? (int) ( ceil( $v / 500 ) * 500 ) : 0;
}

function tdg_us_ids() {
	return get_posts( array( 'post_type' => 'product', 'post_status' => array( 'publish', 'draft', 'pending', 'private' ), 'numberposts' => -1, 'fields' => 'ids', 'meta_key' => '_tdg_source' ) );
}

/** Recalcule les prix automatiques ; renvoie le nombre de produits modifiés. */
function tdg_us_recalculer() {
	$n = 0;
	foreach ( tdg_us_ids() as $id ) {
		$p = wc_get_product( $id );
		if ( ! $p || '1' !== $p->get_meta( '_tdg_prix_auto' ) || '1' === $p->get_meta( '_tdg_devis' ) ) {
			continue;
		}
		$prix = tdg_us_prix( $p->get_meta( '_tdg_prix_fournisseur_eur' ) );
		if ( $prix && (string) $prix !== (string) $p->get_regular_price() ) {
			$p->set_regular_price( $prix );
			$p->save();
			$n++;
		}
	}
	return $n;
}

/* ---------------------------------------------------------------- page Produits › Produits d'usine */
add_action( 'admin_menu', function () {
	add_submenu_page( 'edit.php?post_type=product', 'Produits d’usine', 'Produits d’usine', 'manage_woocommerce', 'tdg-usines', 'tdg_us_page' );
} );

function tdg_us_page() {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}
	$msg = '';
	if ( isset( $_POST['tdg_us_coef'] ) && check_admin_referer( 'tdg_us' ) ) {
		$c = (float) str_replace( ',', '.', sanitize_text_field( wp_unslash( $_POST['tdg_us_coef'] ) ) );
		if ( $c >= 1 && $c <= 10 ) {
			update_option( 'tdg_usines_coef', $c );
			$msg = 'Coefficient enregistré : ' . number_format_i18n( $c, 2 ) . '. Prix recalculés : ' . tdg_us_recalculer() . ' produit(s).';
		} else {
			$msg = 'Le coefficient doit être compris entre 1 et 10.';
		}
	}
	$ids = tdg_us_ids();
	echo '<div class="wrap"><h1>Produits d’usine</h1>';
	if ( $msg ) {
		echo '<div class="notice notice-success"><p>' . esc_html( $msg ) . '</p></div>';
	}
	echo '<p>Produits importés des fabricants pour les rayons <b>Électroménager & électronique</b> et <b>Véhicules & engins</b>. Le prix de vente est le prix fournisseur (en euros) × 655,957 × le coefficient, arrondi aux 500 FCFA supérieurs : le coefficient doit couvrir le transport, le dédouanement et votre marge. Les véhicules sont « sur devis » : le client vous écrit sur WhatsApp.</p>';
	echo '<form method="post" style="margin:16px 0">';
	wp_nonce_field( 'tdg_us' );
	echo '<label><b>Coefficient</b> <input name="tdg_us_coef" value="' . esc_attr( tdg_us_coef() ) . '" size="5"></label> ';
	submit_button( 'Enregistrer et recalculer les prix', 'primary', 'submit', false );
	echo '<p class="description">Exemple : un mixeur à 36 € chez le fournisseur coûte ' . esc_html( number_format_i18n( tdg_us_prix( 36 ) ) ) . ' FCFA avec le coefficient actuel. Les prix saisis à la main ne sont pas modifiés.</p></form>';
	echo '<table class="widefat striped"><thead><tr><th>Produit</th><th>Rayon</th><th>Prix fournisseur</th><th>Prix de vente</th><th>Mode</th><th>Fournisseur</th></tr></thead><tbody>';
	foreach ( $ids as $id ) {
		$p = wc_get_product( $id );
		if ( ! $p ) {
			continue;
		}
		$cats = wp_get_post_terms( $id, 'product_cat', array( 'fields' => 'names' ) );
		$devis = '1' === $p->get_meta( '_tdg_devis' );
		echo '<tr><td><a href="' . esc_url( get_edit_post_link( $id ) ) . '">' . esc_html( $p->get_name() ) . '</a></td><td>' . esc_html( implode( ', ', $cats ) ) . '</td>'
			. '<td>' . esc_html( number_format_i18n( (float) $p->get_meta( '_tdg_prix_fournisseur_eur' ), 2 ) ) . ' €</td>'
			. '<td>' . ( $devis && ! $p->get_price() ? 'Sur devis' : esc_html( number_format_i18n( (float) $p->get_price() ) ) . ' FCFA' ) . '</td>'
			. '<td>' . ( $devis ? 'Devis' : ( '1' === $p->get_meta( '_tdg_prix_auto' ) ? 'Automatique' : 'Manuel' ) ) . '</td>'
			. '<td><a href="' . esc_url( $p->get_meta( '_tdg_source_lien' ) ) . '" target="_blank" rel="noopener noreferrer">Voir chez le fournisseur</a></td></tr>';
	}
	echo '</tbody></table></div>';
}

/* ---------------------------------------------------------------- fiche produit (administration) */
add_action( 'add_meta_boxes_product', function ( $post ) {
	if ( ! get_post_meta( $post->ID, '_tdg_source', true ) ) {
		return;
	}
	add_meta_box( 'tdg-usine', 'Produit d’usine', function ( $post ) {
		$auto = '1' === get_post_meta( $post->ID, '_tdg_prix_auto', true );
		$devis = '1' === get_post_meta( $post->ID, '_tdg_devis', true );
		$eur = (float) get_post_meta( $post->ID, '_tdg_prix_fournisseur_eur', true );
		wp_nonce_field( 'tdg_us_fiche', 'tdg_us_fiche' );
		echo '<p><a href="' . esc_url( get_post_meta( $post->ID, '_tdg_source_lien', true ) ) . '" target="_blank" rel="noopener noreferrer">Voir la fiche du fournisseur</a></p>';
		echo '<p>Prix fournisseur : <b>' . esc_html( number_format_i18n( $eur, 2 ) ) . ' €</b>' . ( $eur ? ' (prix calculé : ' . esc_html( number_format_i18n( tdg_us_prix( $eur ) ) ) . ' FCFA)' : '' ) . '</p>';
		echo '<p class="description">' . esc_html( get_post_meta( $post->ID, '_tdg_titre_fournisseur', true ) ) . '</p>';
		echo '<p><label><input type="checkbox" name="tdg_us_devis" value="1" ' . checked( $devis, true, false ) . '> Sur devis (pas de prix, bouton « Demander un devis »)</label></p>';
		echo '<p><label><input type="checkbox" name="tdg_us_auto" value="1" ' . checked( $auto, true, false ) . '> Prix calculé automatiquement</label></p>';
	}, 'product', 'side' );
} );

add_action( 'woocommerce_admin_process_product_object', function ( $p ) {
	if ( ! $p->get_meta( '_tdg_source' ) || ! isset( $_POST['tdg_us_fiche'] ) || ! wp_verify_nonce( sanitize_key( $_POST['tdg_us_fiche'] ), 'tdg_us_fiche' ) ) {
		return;
	}
	$p->update_meta_data( '_tdg_devis', empty( $_POST['tdg_us_devis'] ) ? '' : '1' );
	$p->update_meta_data( '_tdg_prix_auto', empty( $_POST['tdg_us_auto'] ) ? '' : '1' );
} );
