<?php
/**
 * Boutique — transport des articles achetés : le prix de la livraison est calculé avec les tarifs de la plateforme
 * (poids et dimensions des fiches produits), pour chaque mode actif ; les articles déjà sur place se retirent à
 * l'agence. Une commande payée devient un envoi suivi (code de suivi, étapes, e-mails), comme un colis déclaré.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Colis d'une liste d'articles, pour un mode : null si une donnée manque (poids ou dimensions), le transport sera
 * alors calculé à la pesée. $articles : [ nom, quantite, poids (kg), longueur, largeur, hauteur (cm), local ].
 */
function cp_colis_articles( array $articles, $unite = 'kg' ) {
	$colis = array();
	foreach ( $articles as $a ) {
		$dims = (float) $a['longueur'] > 0 && (float) $a['largeur'] > 0 && (float) $a['hauteur'] > 0;
		if ( 'm3' === $unite ? ! $dims : ( ! $dims && (float) $a['poids'] <= 0 ) ) {
			return null;
		}
		$colis[] = array( 'nombre' => max( 1, (int) $a['quantite'] ), 'poids' => (float) $a['poids'], 'longueur' => (float) $a['longueur'], 'largeur' => (float) $a['largeur'], 'hauteur' => (float) $a['hauteur'] );
	}
	return $colis;
}

/**
 * Tarifs de livraison proposés pour des articles : un par mode actif (articles à faire venir), ou le retrait à
 * l'agence (articles déjà sur place). Renvoie [ id, libelle, cout, mode, pesee ].
 */
function cp_tarifs_livraison( array $articles ) {
	$importes = array_values( array_filter( $articles, function ( $a ) {
		return empty( $a['local'] );
	} ) );
	$tarifs = array();
	if ( ! $importes ) {
		foreach ( (array) cp_r( 'destination.agences', array() ) as $i => $ag ) {
			$tarifs[] = array( 'id' => 'agence-' . $i, 'libelle' => 'Retrait à l\'agence de ' . $ag['ville'], 'cout' => 0, 'mode' => '', 'pesee' => false );
		}
		return $tarifs ? $tarifs : array( array( 'id' => 'agence', 'libelle' => 'Retrait à notre agence', 'cout' => 0, 'mode' => '', 'pesee' => false ) );
	}
	foreach ( cp_modes_actifs() as $m ) {
		$libelle = $m['nom'] . ' (' . str_replace( array( 'Délai : ', 'environ' ), array( '', '≈' ), cp_delai_texte( $m ) ) . ')';
		$colis = cp_colis_articles( $importes, $m['unite'] );
		if ( null === $colis ) {
			$tarifs[] = array( 'id' => $m['id'], 'libelle' => $libelle . ' — transport payé à l\'arrivée, après pesée', 'cout' => 0, 'mode' => $m['id'], 'pesee' => true );
		} else {
			$c = cp_calcul_tarif( $m, $colis );
			$tarifs[] = array( 'id' => $m['id'], 'libelle' => $libelle, 'cout' => (float) $c['total'], 'mode' => $m['id'], 'pesee' => false );
		}
	}
	return $tarifs;
}

/** Un produit est « déjà sur place » (retrait à l'agence, pas de transport cargo). */
function cp_produit_local( $produit ) {
	$p = $produit && $produit->get_parent_id() ? wc_get_product( $produit->get_parent_id() ) : $produit;
	return $p && 'local' === $p->get_meta( '_cp_lieu' );
}

/** Article au format de cp_tarifs_livraison() à partir d'un produit WooCommerce. */
function cp_article_produit( $produit, $quantite ) {
	$kg = function ( $v ) {
		return function_exists( 'wc_get_weight' ) ? (float) wc_get_weight( (float) $v, 'kg' ) : (float) $v;
	};
	$cm = function ( $v ) {
		return function_exists( 'wc_get_dimension' ) ? (float) wc_get_dimension( (float) $v, 'cm' ) : (float) $v;
	};
	return array(
		'nom' => $produit->get_name(), 'quantite' => (int) $quantite, 'poids' => $kg( $produit->get_weight() ),
		'longueur' => $cm( $produit->get_length() ), 'largeur' => $cm( $produit->get_width() ), 'hauteur' => $cm( $produit->get_height() ),
		'local' => cp_produit_local( $produit ),
	);
}

add_action( 'woocommerce_shipping_init', function () {
	if ( class_exists( 'CP_Livraison_Cargo' ) ) {
		return;
	}
	/** Méthode de livraison sans zone : proposée pour toutes les adresses. */
	class CP_Livraison_Cargo extends WC_Shipping_Method {
		public function __construct( $instance_id = 0 ) {
			$this->id = 'cp_cargo';
			$this->instance_id = absint( $instance_id );
			$this->method_title = 'Transport cargo (Cargo Plateforme)';
			$this->method_description = 'Prix calculé avec vos tarifs (Cargo → Assistant) d\'après le poids et les dimensions des produits, pour chaque mode actif. Produits « déjà sur place » : retrait à l\'agence.';
			$this->supports = array( 'settings' );
			$this->init_form_fields();
			$this->init_settings();
			$this->enabled = $this->get_option( 'enabled', 'yes' );
			$this->title = 'Transport cargo';
			add_action( 'woocommerce_update_options_shipping_' . $this->id, array( $this, 'process_admin_options' ) );
		}

		public function init_form_fields() {
			$this->form_fields = array( 'enabled' => array( 'title' => 'Activer', 'type' => 'checkbox', 'label' => 'Proposer le transport cargo et le retrait à l\'agence', 'default' => 'yes' ) );
		}

		public function calculate_shipping( $package = array() ) {
			$articles = array();
			foreach ( (array) ( $package['contents'] ?? array() ) as $ligne ) {
				if ( ! empty( $ligne['data'] ) ) {
					$articles[] = cp_article_produit( $ligne['data'], $ligne['quantity'] ?? 1 );
				}
			}
			foreach ( cp_tarifs_livraison( $articles ) as $t ) {
				$this->add_rate( array(
					'id'        => $this->id . ':' . $t['id'],
					'label'     => $t['libelle'],
					'cost'      => $t['cout'],
					'meta_data' => array( 'cp_mode' => $t['mode'], 'cp_pesee' => $t['pesee'] ? 'oui' : '' ),
					'package'   => $package,
				) );
			}
		}
	}
} );

add_filter( 'woocommerce_shipping_methods', function ( $m ) {
	$m['cp_cargo'] = 'CP_Livraison_Cargo';
	return $m;
} );

// les informations internes du tarif ne s'affichent pas au client
add_filter( 'woocommerce_order_item_get_formatted_meta_data', function ( $meta ) {
	foreach ( $meta as $k => $m ) {
		if ( in_array( $m->key, array( 'cp_mode', 'cp_pesee' ), true ) ) {
			unset( $meta[ $k ] );
		}
	}
	return $meta;
} );

/**
 * Commande payée → envoi suivi (une seule fois) pour les articles à faire venir. Renvoie l'identifiant de l'envoi
 * ou 0 (retrait d'articles déjà sur place, autre mode de livraison).
 */
function cp_envoi_depuis_commande( $o ) {
	$existant = (int) $o->get_meta( '_cp_envoi' );
	if ( $existant ) {
		return $existant;
	}
	$mode = '';
	$pesee = false;
	$port = 0.0;
	foreach ( $o->get_items( 'shipping' ) as $s ) {
		if ( 'cp_cargo' === $s->get_method_id() ) {
			$mode = (string) $s->get_meta( 'cp_mode' );
			$pesee = 'oui' === $s->get_meta( 'cp_pesee' );
			$port += (float) $s->get_total();
		}
	}
	if ( ! $mode || ! cp_mode( $mode ) ) {
		return 0;
	}
	$articles = array();
	$noms = array();
	foreach ( $o->get_items() as $it ) {
		$p = $it->get_product();
		if ( ! $p || cp_produit_local( $p ) ) {
			continue;
		}
		$articles[] = cp_article_produit( $p, $it->get_quantity() );
		$noms[] = $it->get_name() . ' × ' . $it->get_quantity();
	}
	if ( ! $articles ) {
		return 0;
	}
	$m = cp_mode( $mode );
	$nom = trim( $o->get_billing_first_name() . ' ' . $o->get_billing_last_name() );
	$pays = cp_nom_pays( $o->get_billing_country() );
	$agences = (array) cp_r( 'destination.agences', array() );
	$d = array(
		'client'       => array( 'nom' => $nom, 'telephone' => $o->get_billing_phone(), 'email' => $o->get_billing_email(), 'ville' => $o->get_billing_city(), 'pays' => $pays, 'adresse' => $o->get_billing_address_1(), 'fournisseur' => 'Boutique ' . cp_r( 'entreprise.nom' ) ),
		'destinataire' => array(
			'nom' => trim( $o->get_shipping_first_name() . ' ' . $o->get_shipping_last_name() ) ?: $nom,
			'telephone' => ( method_exists( $o, 'get_shipping_phone' ) ? $o->get_shipping_phone() : '' ) ?: $o->get_billing_phone(),
			'ville' => $o->get_shipping_city() ?: $o->get_billing_city(), 'quartier' => '', 'adresse' => $o->get_shipping_address_1() ?: $o->get_billing_address_1(),
			'agence' => $agences ? $agences[0]['ville'] : '',
		),
		'mode'         => $mode,
		'colis'        => cp_colis_articles( $articles, $m['unite'] ) ?? array(),
		'contenu'      => 'Commande n° ' . $o->get_order_number() . ' : ' . implode( ', ', $noms ),
		'valeur'       => (float) $o->get_subtotal(),
	);
	if ( ! $pesee ) {
		$d['montant_force'] = $port;     // transport déjà payé avec la commande
		$d['paiement'] = array( 'statut' => 'paye', 'moyen' => $o->get_payment_method_title(), 'reference' => $o->get_transaction_id(), 'date' => time(), 'montant' => $port );
	}
	$id = cp_enregistrer_envoi( $d );
	if ( ! $id ) {
		return 0;
	}
	update_post_meta( $id, '_cp_commande', $o->get_id() );
	if ( $o->get_customer_id() ) {
		update_post_meta( $id, '_cp_user', $o->get_customer_id() );
	}
	if ( ! $pesee && $o->get_meta( '_cp_recu_num' ) ) {
		update_post_meta( $id, '_cp_recu_num', $o->get_meta( '_cp_recu_num' ) );
	}
	cp_changer_etape( $id, 'declare', 'Commande n° ' . $o->get_order_number() . ' : nous préparons votre commande en ' . cp_r( 'origine.pays' ) . '.', '', false );
	$o->update_meta_data( '_cp_envoi', $id );
	$o->add_order_note( 'Envoi suivi créé : ' . cp_envoi( $id )['code'] . ( $pesee ? ' (transport à payer après pesée).' : '.' ) );
	$o->save();
	return $id;
}
