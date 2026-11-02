<?php
/**
 * Aperçu de la boutique (chargé par apercu.php avec « boutique ») : produits d'EXEMPLE, balisage de WooCommerce
 * (liste, fiche produit, page de paiement) et vrais affichages de l'extension (prix, boutons, moyens de paiement).
 */

// images d'exemple découpées dans les photos Navilink
$src = imagecreatefromjpeg( $SITE . '/photo-vehicules.jpg' );
foreach ( array( 'ex-berline.jpg' => array( 20, 150, 440, 330 ), 'ex-excavatrice.jpg' => array( 880, 70, 451, 338 ) ) as $f => $c ) {
	$i = imagecrop( $src, array( 'x' => $c[0], 'y' => $c[1], 'width' => $c[2], 'height' => $c[3] ) );
	imagejpeg( $i, "$OUT/$f", 86 );
}
copy( $SITE . '/photo-camion.jpg', "$OUT/ex-camion.jpg" );
$GLOBALS['vide'] = 'data:image/svg+xml,' . rawurlencode( '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#EEF3FA"/><g fill="none" stroke="#9DB3D6" stroke-width="6" stroke-linejoin="round" transform="translate(150 100) scale(4.2)"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></g></svg>' );

$GLOBALS['produits'] = array(
	1 => new FauxProduit( array( 'id' => 1, 'nom' => 'Camion tracteur — location', 'prix' => 150000, 'img' => 'ex-camion.jpg', 'meta' => array( '_cp_lieu' => 'local', '_cp_location' => 'yes' ), 'texte' => 'Tracteur routier avec chauffeur ou sans chauffeur, pour vos transports au Burkina Faso.' ) ),
	2 => new FauxProduit( array( 'id' => 2, 'nom' => 'Excavatrice Caterpillar', 'prix' => '', 'img' => 'ex-excavatrice.jpg', 'meta' => array( '_cp_lieu' => 'local' ) ) ),
	3 => new FauxProduit( array( 'id' => 3, 'nom' => 'Berline — importée de Chine', 'prix' => '', 'img' => 'ex-berline.jpg' ) ),
	4 => new FauxProduit( array( 'id' => 4, 'nom' => 'Pneus 315/80 R22.5 (lot de 2)', 'prix' => 180000, 'poids' => 12, 'l' => 50, 'w' => 40, 'h' => 30 ) ),
);
function wc_get_products( $a ) { return array_keys( $GLOBALS['produits'] ); }

function cp_apercu_prix( $p ) {
	$html = '' === (string) $p->get_price() ? apply_filters( 'woocommerce_empty_price_html', '' ) : '<span class="woocommerce-Price-amount amount"><bdi>' . number_format( $p->get_price(), 0, ',', ' ' ) . '&nbsp;<span class="woocommerce-Price-currencySymbol">FCFA</span></bdi></span>';
	return apply_filters( 'woocommerce_get_price_html', $html, $p );
}

function cp_apercu_liste( $ids ) {
	$h = '<ul class="products columns-4">';
	foreach ( $ids as $id ) {
		$p = $GLOBALS['produits'][ $id ];
		$img = $p->d['img'] ?? '' ? $p->d['img'] : $GLOBALS['vide'];
		$h .= '<li class="product type-product"><a href="produit.html" class="woocommerce-LoopProduct-link woocommerce-loop-product__link"><img src="' . esc_url( $img ) . '" class="attachment-woocommerce_thumbnail" alt=""><h2 class="woocommerce-loop-product__title">' . esc_html( $p->get_name() ) . '</h2><span class="price">' . cp_apercu_prix( $p ) . '</span></a>'
			. apply_filters( 'woocommerce_loop_add_to_cart_link', '<a href="#" class="button product_type_simple add_to_cart_button">' . ( cp_est_location( $p ) ? 'Réserver' : 'Ajouter au panier' ) . '</a>', $p ) . '</li>';
	}
	return $h . '</ul>';
}

add_shortcode( 'products', function ( $a ) {
	return '<div class="woocommerce columns-4">' . cp_apercu_liste( array( 1, 2, 3, 4 ) ) . '</div>';
} );

function cp_apercu_pages_boutique() {
	// liste des produits
	cp_apercu_page( 'boutique.html', 'archive post-type-archive-product woocommerce woocommerce-page', '<div class="ct-page-titre"><h1>Boutique</h1></div><div class="ct-page"><nav class="woocommerce-breadcrumb"><a href="index.html">Accueil</a> / Boutique</nav><p class="woocommerce-result-count">4 produits (exemples)</p>' . cp_apercu_liste( array( 1, 2, 3, 4 ) ) . '</div>' );

	// fiche produit (location)
	$GLOBALS['product'] = $GLOBALS['produits'][1];
	$cb = $GLOBALS['hooks']['woocommerce_single_product_summary'];
	ob_start();
	foreach ( array_reverse( $cb ) as $f ) {      // ordre de WooCommerce : infos (25) puis demande de prix (31)
		$f();
	}
	$infos = ob_get_clean();
	ob_start();
	do_action( 'woocommerce_before_add_to_cart_quantity' );
	$jours = ob_get_clean();
	$p = $GLOBALS['product'];
	cp_apercu_page( 'produit.html', 'single single-product woocommerce woocommerce-page', '<div class="ct-page-titre"><h1>Boutique</h1></div><div class="ct-page"><nav class="woocommerce-breadcrumb"><a href="index.html">Accueil</a> / <a href="boutique.html">Boutique</a> / ' . esc_html( $p->get_name() ) . '</nav>'
		. '<div class="product type-product"><div class="woocommerce-product-gallery images"><div class="woocommerce-product-gallery__image"><img src="ex-camion.jpg" alt=""></div></div>'
		. '<div class="summary entry-summary"><h1 class="product_title entry-title">' . esc_html( $p->get_name() ) . '</h1><p class="price">' . cp_apercu_prix( $p ) . '</p><div class="woocommerce-product-details__short-description"><p>' . esc_html( $p->d['texte'] ) . '</p></div>'
		. $infos . '<form class="cart">' . $jours . '<div class="quantity"><input type="number" class="input-text qty text" value="3" min="1"></div><button type="button" class="single_add_to_cart_button button alt">Réserver</button></form><div class="product_meta"><span class="posted_in">Catégorie : <a href="#">Location de véhicules</a></span></div></div>'
		. '<div class="woocommerce-tabs wc-tabs-wrapper"><ul class="tabs wc-tabs"><li class="description_tab active"><a href="#">Description</a></li><li class="additional_information_tab"><a href="#">Informations complémentaires</a></li></ul><div class="woocommerce-Tabs-panel panel"><p>Exemple de description : caractéristiques, conditions de location, caution…</p></div></div>'
		. '<section class="related products"><h2>Produits similaires</h2>' . cp_apercu_liste( array( 2, 3, 4 ) ) . '</section></div></div>' );

	// page de paiement : pneus à faire venir, transport avion MCO, Orange Money
	$GLOBALS['total_panier'] = 564000;
	$moyens = '';
	foreach ( array( 'cp_orange' => true, 'cp_wave' => false ) as $id => $choisi ) {
		$g = new CP_Passerelle_Mobile( $id );
		ob_start();
		$g->payment_fields();
		$moyens .= '<li class="wc_payment_method payment_method_' . $id . '"><input id="payment_method_' . $id . '" type="radio" class="input-radio" name="payment_method"' . ( $choisi ? ' checked' : '' ) . '> <label for="payment_method_' . $id . '">' . esc_html( $g->title ) . ' <img src="' . esc_url( $g->icon ) . '" alt=""></label><div class="payment_box payment_method_' . $id . '"' . ( $choisi ? '' : ' style="display:none"' ) . '>' . ob_get_clean() . '</div></li>';
	}
	$livraison = '';
	foreach ( cp_tarifs_livraison( array( cp_article_produit( $GLOBALS['produits'][4], 2 ) ) ) as $i => $t ) {
		$livraison .= '<li><input type="radio" name="livraison"' . ( 0 === $i ? ' checked' : '' ) . '> <label>' . esc_html( $t['libelle'] ) . ' : <span class="woocommerce-Price-amount amount">' . number_format( $t['cout'], 0, ',', ' ' ) . '&nbsp;FCFA</span></label></li>';
	}
	$champ = function ( $l, $v, $c = 'form-row-wide' ) {
		return '<p class="form-row ' . $c . '"><label>' . $l . ' <abbr class="required">*</abbr></label><span class="woocommerce-input-wrapper"><input class="input-text" value="' . esc_attr( $v ) . '"></span></p>';
	};
	cp_apercu_page( 'paiement.html', 'page woocommerce-checkout woocommerce-page', '<div class="ct-page-titre"><h1>Paiement</h1></div><div class="ct-page"><div class="woocommerce"><form class="checkout woocommerce-checkout">'
		. '<div class="col2-set" id="customer_details"><div class="col-1"><div class="woocommerce-billing-fields"><h3>Vos coordonnées</h3><div class="woocommerce-billing-fields__field-wrapper">'
		. $champ( 'Prénom', 'Awa', 'form-row-first' ) . $champ( 'Nom', 'Sawadogo', 'form-row-last' ) . $champ( 'Pays', 'Burkina Faso' ) . $champ( 'Ville', 'Ouagadougou' ) . $champ( 'Téléphone', '70 11 22 33' ) . $champ( 'E-mail', 'awa@example.com' )
		. '</div></div></div><div class="col-2"></div></div><h3 id="order_review_heading">Votre commande</h3><div id="order_review" class="woocommerce-checkout-review-order">'
		. '<table class="shop_table woocommerce-checkout-review-order-table"><thead><tr><th class="product-name">Produit</th><th class="product-total">Sous-total</th></tr></thead><tbody><tr class="cart_item"><td class="product-name">Pneus 315/80 R22.5 (lot de 2) <strong class="product-quantity">× 2</strong></td><td class="product-total">360 000&nbsp;FCFA</td></tr></tbody>'
		. '<tfoot><tr class="cart-subtotal"><th>Sous-total</th><td>360 000&nbsp;FCFA</td></tr><tr class="woocommerce-shipping-totals shipping"><th>Expédition</th><td><ul id="shipping_method" class="woocommerce-shipping-methods">' . $livraison . '</ul></td></tr><tr class="order-total"><th>Total</th><td><strong>564 000&nbsp;FCFA</strong></td></tr></tfoot></table>'
		. '<div id="payment" class="woocommerce-checkout-payment"><ul class="wc_payment_methods payment_methods methods">' . $moyens . '</ul><div class="form-row place-order"><button type="button" class="button alt" id="place_order">Commander</button></div></div></div></form></div></div>' );
}
