<?php
/**
 * Site public : pages créées à l'activation, codes courts, API REST du simulateur / du suivi / des déclarations,
 * feuilles de style et script aux couleurs de l'entreprise.
 *
 * [cargo_accueil] [cargo_simulateur] [cargo_suivi] [cargo_declarer] [cargo_mon_espace] [cargo_tarifs]
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function cp_pages_definies() {
	return array(
		'accueil'   => array( 'Accueil', '[cargo_accueil]' ),
		'simulateur' => array( 'Simulateur de tarif', '[cargo_simulateur]' ),
		'suivi'     => array( 'Suivi de colis', '[cargo_suivi]' ),
		'declarer'  => array( 'Expédier un colis', '[cargo_declarer]' ),
		'espace'    => array( 'Mon espace', '[cargo_mon_espace]' ),
		'tarifs'    => array( 'Tarifs et délais', '[cargo_tarifs]' ),
	);
}

function cp_creer_pages() {
	foreach ( cp_pages_definies() as $cle => $p ) {
		$id = (int) get_option( 'cp_page_' . $cle );
		if ( $id && get_post( $id ) ) {
			continue;
		}
		$id = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $p[0], 'post_content' => $p[1] ) );
		if ( $id && ! is_wp_error( $id ) ) {
			update_option( 'cp_page_' . $cle, $id );
		}
	}
	update_option( 'show_on_front', 'page' );
	update_option( 'page_on_front', (int) get_option( 'cp_page_accueil' ) );
}

function cp_url_page( $cle ) {
	$id = (int) get_option( 'cp_page_' . $cle );
	return $id ? get_permalink( $id ) : home_url( '/' );
}

/* ---------------------------------------------------------------- styles et script */
add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_style( 'cargo', CP_URL . 'assets/cargo.css', array(), CP_VERSION );
	wp_add_inline_style( 'cargo', cp_css_couleurs() );
	wp_enqueue_script( 'cargo', CP_URL . 'assets/cargo.js', array(), CP_VERSION, true );
	wp_localize_script( 'cargo', 'CARGO', cp_config_js() );
} );

function cp_css_couleurs() {
	$p = sanitize_hex_color( cp_r( 'couleurs.primaire' ) ) ?: '#0B3C5D';
	$a = sanitize_hex_color( cp_r( 'couleurs.accent' ) ) ?: '#F2A900';
	$f = sanitize_hex_color( cp_r( 'couleurs.fond' ) ) ?: '#F5F7FA';
	$b = sanitize_hex_color( cp_r( 'couleurs.bouton' ) ) ?: $p;
	$n = sanitize_hex_color( cp_r( 'couleurs.fonce' ) );
	$n = $n && ! in_array( strtolower( $n ), array( '#000', '#000000' ), true ) ? $n : "color-mix(in srgb, $p 38%, #030A1C)";
	return ":root{--cp-prim:$p;--cp-accent:$a;--cp-fond:$f;--cp-bouton:$b;--cp-fonce:$n}";
}

function cp_config_js() {
	return array(
		'api'     => esc_url_raw( rest_url( 'cargo/v1/' ) ),
		'nonce'   => wp_create_nonce( 'wp_rest' ),
		'devise'  => cp_r( 'entreprise.devise' ),
		'modes'   => array_map( function ( $m ) {
			return array_intersect_key( $m, array_flip( array( 'id', 'nom', 'unite', 'prix', 'minimum', 'delai_min', 'delai_max', 'diviseur', 'description', 'prix_alt', 'prix_alt_libelle' ) ) );
		}, cp_modes_actifs() ),
		'frais'   => cp_r( 'frais', array() ),
		'pages'   => array( 'declarer' => cp_url_page( 'declarer' ), 'suivi' => cp_url_page( 'suivi' ) ),
		'whatsapp' => cp_whatsapp_lien(),
		'ajax'    => admin_url( 'admin-ajax.php' ),
	);
}

/** Jeton de sécurité frais pour les formulaires : les pages peuvent être servies par un cache (CDN, extension de cache). */
function cp_ajax_jeton() {
	nocache_headers();
	wp_send_json( array( 'nonce' => wp_create_nonce( 'wp_rest' ) ) );
}
add_action( 'wp_ajax_cp_jeton', 'cp_ajax_jeton' );
add_action( 'wp_ajax_nopriv_cp_jeton', 'cp_ajax_jeton' );

/* ---------------------------------------------------------------- API REST */
add_action( 'rest_api_init', function () {
	register_rest_route( 'cargo/v1', '/tarif', array(
		'methods' => 'POST', 'permission_callback' => '__return_true',
		'callback' => function ( WP_REST_Request $q ) {
			$colis = cp_nettoyer_colis( (array) $q->get_param( 'colis' ) );
			$out = array();
			foreach ( cp_modes_actifs() as $m ) {
				$out[] = cp_calcul_tarif( $m, $colis, cp_r( 'frais', array() ), (float) $q->get_param( 'valeur' ) );
			}
			return $out;
		},
	) );
	register_rest_route( 'cargo/v1', '/suivi/(?P<code>[A-Za-z0-9-]{4,30})', array(
		'methods' => 'GET', 'permission_callback' => '__return_true',
		'callback' => function ( WP_REST_Request $q ) {
			$id = cp_envoi_par_code( $q['code'] );
			if ( ! $id ) {
				return new WP_Error( 'introuvable', 'Aucun envoi ne correspond à ce code. Vérifiez-le (lettres et chiffres, avec le tiret).', array( 'status' => 404 ) );
			}
			return cp_suivi_public( $id );
		},
	) );
	register_rest_route( 'cargo/v1', '/declarer', array(
		'methods' => 'POST', 'permission_callback' => '__return_true',
		'callback' => 'cp_rest_declarer',
	) );
} );

/** Ce qu'une personne qui a le code peut voir (aucune donnée personnelle). */
function cp_suivi_public( $id ) {
	$e = cp_envoi( $id );
	$faites = array();
	foreach ( $e['historique'] as $h ) {
		$faites[ $h['etape'] ] = $h;
	}
	$etapes = array();
	foreach ( cp_etapes() as $et ) {
		$h = $faites[ $et['id'] ] ?? null;
		$etapes[] = array( 'id' => $et['id'], 'nom' => $et['nom'], 'texte' => $et['texte'] ?? '', 'fait' => (bool) $h, 'date' => $h ? wp_date( 'd/m/Y H:i', $h['date'] ) : '', 'lieu' => $h['lieu'] ?? '', 'note' => $h['note'] ?? '' );
	}
	$arrivee = '';
	$m = cp_mode( $e['mode'] );
	if ( $m && isset( $faites['expedie'] ) && ! isset( $faites['arrive'] ) ) {
		$d = cp_dates_estimees( $m, $faites['expedie']['date'] );
		$arrivee = 'Arrivée estimée entre le ' . wp_date( 'd/m', $d[0] ) . ' et le ' . wp_date( 'd/m/Y', $d[1] );
	}
	$nb = 0;
	foreach ( $e['colis'] as $c ) {
		$nb += max( 1, (int) $c['nombre'] );
	}
	return array(
		'code'    => $e['code'], 'mode' => $e['mode_nom'], 'statut' => ( cp_etape( $e['statut'] ) ?: array( 'nom' => $e['statut'] ) )['nom'],
		'colis'   => $nb, 'mesure' => $e['calcul'] ? ( 'm3' === $e['calcul']['unite'] ? number_format_i18n( $e['calcul']['facture'], 2 ) . ' m³' : number_format_i18n( $e['calcul']['facture'], 1 ) . ' kg' ) : '',
		'arrivee' => $arrivee, 'etapes' => $etapes, 'date' => wp_date( 'd/m/Y', $e['date'] ),
	);
}

function cp_rest_declarer( WP_REST_Request $q ) {
	if ( ! wp_verify_nonce( (string) $q->get_header( 'X-WP-Nonce' ), 'wp_rest' ) ) {
		return new WP_Error( 'session', 'La page a expiré : rechargez-la puis recommencez.', array( 'status' => 403 ) );
	}
	if ( '' !== (string) $q->get_param( 'site_web' ) ) {     // champ piège anti-robots
		return new WP_Error( 'robot', 'Envoi refusé.', array( 'status' => 400 ) );
	}
	$ip = sanitize_text_field( $_SERVER['REMOTE_ADDR'] ?? '' );
	$cle = 'cp_decl_' . md5( $ip );
	$n = (int) get_transient( $cle );
	if ( $n >= 8 ) {
		return new WP_Error( 'trop', 'Trop de déclarations en peu de temps. Réessayez dans une heure ou écrivez-nous sur WhatsApp.', array( 'status' => 429 ) );
	}
	$client = wp_parse_args( array_map( 'sanitize_text_field', (array) $q->get_param( 'client' ) ), array( 'nom' => '', 'telephone' => '', 'email' => '', 'ville' => '', 'pays' => '', 'adresse' => '', 'fournisseur' => '' ) );
	$client = array_intersect_key( $client, array_flip( array( 'nom', 'telephone', 'email', 'ville', 'pays', 'adresse', 'fournisseur' ) ) );
	$client['email'] = sanitize_email( $client['email'] );
	$dest = wp_parse_args( array_map( 'sanitize_text_field', (array) $q->get_param( 'destinataire' ) ), array( 'nom' => '', 'telephone' => '', 'ville' => '', 'quartier' => '', 'adresse' => '', 'agence' => '' ) );
	$dest = array_intersect_key( $dest, array_flip( array( 'nom', 'telephone', 'ville', 'quartier', 'adresse', 'agence' ) ) );
	$mode = sanitize_key( (string) $q->get_param( 'mode' ) );
	$erreurs = array();
	if ( empty( $client['nom'] ) ) { $erreurs[] = 'votre nom'; }
	if ( empty( $client['telephone'] ) ) { $erreurs[] = 'votre téléphone'; }
	if ( empty( $client['email'] ) || ! is_email( $client['email'] ) ) { $erreurs[] = 'une adresse e-mail valide (pour recevoir la fiche d\'expédition)'; }
	if ( ! cp_mode( $mode ) ) { $erreurs[] = 'le mode d\'envoi'; }
	if ( $erreurs ) {
		return new WP_Error( 'champs', 'Merci d\'indiquer ' . implode( ', ', $erreurs ) . '.', array( 'status' => 400 ) );
	}
	if ( empty( $dest['nom'] ) ) {
		$dest['nom'] = $client['nom'];
		$dest['telephone'] = $dest['telephone'] ?: $client['telephone'];
	}
	$categorie = sanitize_text_field( (string) $q->get_param( 'categorie' ) );
	$contenu = sanitize_textarea_field( (string) $q->get_param( 'contenu' ) );
	$d = array(
		'client' => $client, 'destinataire' => $dest, 'mode' => $mode,
		'contenu' => trim( $categorie . ( $contenu ? ' — ' . $contenu : '' ), ' —' ),
		'valeur' => max( 0, (float) $q->get_param( 'valeur' ) ),
		'colis'  => cp_nettoyer_colis( (array) $q->get_param( 'colis' ) ),
	);
	$id = cp_enregistrer_envoi( $d );
	if ( ! $id ) {
		return new WP_Error( 'erreur', 'L\'envoi n\'a pas pu être enregistré. Réessayez ou écrivez-nous sur WhatsApp.', array( 'status' => 500 ) );
	}
	if ( get_current_user_id() ) {
		update_post_meta( $id, '_cp_user', get_current_user_id() );
	}
	cp_changer_etape( $id, 'declare', '', '', false );
	set_transient( $cle, $n + 1, HOUR_IN_SECONDS );
	cp_mail_declaration( $id );
	$e = cp_envoi( $id );
	$ent = cp_entrepot( $mode );
	return array(
		'code' => $e['code'], 'mode' => $e['mode_nom'], 'entrepot' => $ent['texte'], 'consigne' => cp_r( 'consigne_colis' ),
		'fiche' => cp_lien_pdf( $id, 'fiche' ), 'etiquettes' => cp_lien_pdf( $id, 'etiquettes' ), 'suivi' => cp_lien_suivi( $e['code'] ),
		'whatsapp' => cp_whatsapp_lien( 'Bonjour, je viens de déclarer l\'envoi ' . $e['code'] . ' (' . $e['mode_nom'] . ').' ),
		'email' => $client['email'],
	);
}

/* ---------------------------------------------------------------- codes courts */
function cp_icone( $nom ) {
	$i = array(
		'avion'     => '<path d="M21 4.2c-.7-.7-2-.4-2.9.5l-3.6 3.7-9.2-2.7-1.6 1.6 7.5 4.3-3.1 3.2-2.7-.4-1.3 1.3 3.3 1.6 1.6 3.3 1.3-1.3-.4-2.7 3.2-3.1 4.3 7.5 1.6-1.6-2.7-9.2 3.7-3.6c.9-.9 1.2-2.2.5-2.9z"/>',
		'bateau'    => '<path d="M3 15l2 5h14l2-5z"/><path d="M5 15V9h14v6M9 9V5h6v4"/><path d="M2 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/>',
		'camion'    => '<path d="M2.5 5.5h11v10.5h-11z"/><path d="M13.5 9h4l3.5 3.6V16h-7.5"/><circle cx="6.5" cy="17.5" r="1.9"/><circle cx="17" cy="17.5" r="1.9"/>',
		'voiture'   => '<path d="M4 16v-4l2-5h12l2 5v4z"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/><path d="M4 12h16"/>',
		'engin'     => '<rect x="2.5" y="15" width="10" height="4.5" rx="2.2"/><path d="M4.5 15v-3.5h5.5l2 3.5"/><path d="M10.5 11.5l4.5-6.5 4.5 3-1.5 4.5"/><path d="M17.5 12.5l3 3.5h-5z"/>',
		'colis'     => '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
		'entrepot'  => '<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8M7 17h10"/>',
		'suivi'     => '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
		'loupe'     => '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
		'calcul'    => '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11v6M8 15h2M12 15h2"/>',
		'bouclier'  => '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
		'douane'    => '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 11h7M9 15h7M9 19h4"/>',
		'panier'    => '<path d="M3 4h2.5l2.2 11h10.6L20.5 8H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
		'equipe'    => '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c3 .2 5.5 2.6 5.5 5.8"/>',
		'paiement'  => '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10 18.5h4"/><path d="M14 7.5h-2.8a1.6 1.6 0 0 0 0 3.2h1.6a1.6 1.6 0 0 1 0 3.2H10M12 6v1.5M12 13.9v1.5"/>',
		'globe'     => '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
		'horloge'   => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		'casque'    => '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19c0 1.5-1.5 2.5-4 2.5h-2"/>',
		'engrenage' => '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
		'valise'    => '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V4.5h6V7M4 12h16M9 20v1M15 20v1"/>',
		'puce'      => '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
		'vetement'  => '<path d="M8 3L3 6l2 4 3-1.5V21h8V8.5l3 1.5 2-4-5-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z"/>',
		'fleche'    => '<path d="M5 12h14M13 6l6 6-6 6"/>',
		'telephone' => '<path d="M5 3.5h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.6 6.6l1.4-2.3 4.5 1.8V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
		'email'     => '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6l8.5 7 8.5-7"/>',
		'eclair'    => '<path d="M13 2.5L4.5 14H12l-1 7.5L19.5 10H12z"/>',
		'whatsapp'  => '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.5 2 2 3.6 4 4.5l1.2-1.2 2 .8-.5 1.9c-3.5 0-7.4-3.9-7.4-7.4l1.9-.5.8 2z"/>',
		'facebook'  => '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5c0-.3.2-.5.5-.5z"/>',
		'instagram' => '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.2 6.8v.01"/>',
		'tiktok'    => '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.4 2.8 2.2 4.6 5 5"/>',
		'youtube'   => '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9v6l5-3z"/>',
		'linkedin'  => '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 10.5V16M8 7.5v.01M12 16v-3.2c0-1.4 1-2.3 2.2-2.3s2 .9 2 2.3V16M12 10.5V16"/>',
	);
	return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . ( $i[ $nom ] ?? $i['colis'] ) . '</svg>';
}

/** Icône choisie dans l'assistant, sinon devinée d'après le texte (« Fret aérien » → avion…). */
function cp_icone_auto( $texte, $choix = '' ) {
	if ( $choix ) {
		return $choix;
	}
	$t = strtolower( remove_accents( (string) $texte ) );
	$regles = array(
		'engrenage' => 'piece|moteur|rechange', 'avion' => 'aerien|avion|air|express', 'bateau' => 'maritime|bateau|mer|conteneur|container',
		'voiture' => 'vehicule|voiture|auto|location|vente', 'engin' => 'engin|chantier|caterpillar|machine', 'camion' => 'camion|transport|livraison|routier',
		'suivi' => 'suivi|tracking', 'panier' => 'achat|commande|sourcing|marchandise|commerce', 'douane' => 'douane|dedouan|document',
		'entrepot' => 'entrepot|stockage|magasin', 'valise' => 'personnel|bagage|effet|demenagement', 'puce' => 'electro|telephone|informatique',
		'vetement' => 'vetement|textile|habit|mode', 'paiement' => 'change|transfert|paiement|argent', 'colis' => 'colis',
	);
	foreach ( $regles as $icone => $motif ) {
		if ( preg_match( '/' . $motif . '/', $t ) ) {
			return $icone;
		}
	}
	return 'colis';
}

/** Lien d'un service : page de la plateforme, boutique, WhatsApp ou adresse web. */
function cp_lien_service( $lien ) {
	if ( preg_match( '#^https?://#', (string) $lien ) ) {
		return $lien;
	}
	if ( 'boutique' === $lien ) {
		return function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : ( cp_whatsapp_lien( 'Bonjour ' . cp_r( 'entreprise.nom' ) ) ?: cp_url_page( 'tarifs' ) );
	}
	if ( 'whatsapp' === $lien ) {
		return cp_whatsapp_lien( 'Bonjour ' . cp_r( 'entreprise.nom' ) ) ?: cp_url_page( 'tarifs' );
	}
	return cp_url_page( in_array( $lien, array( 'simulateur', 'suivi', 'declarer', 'espace', 'tarifs' ), true ) ? $lien : 'tarifs' );
}

function cp_icone_mode( $m ) {
	return 'm3' === $m['unite'] ? cp_icone( 'bateau' ) : cp_icone( 'avion' );
}

add_shortcode( 'cargo_tarifs', function () {
	$modes = cp_modes_actifs();
	$rapide = $modes ? min( wp_list_pluck( $modes, 'delai_min' ) ) : 0;
	$kg = array_filter( $modes, function ( $m ) {
		return 'kg' === $m['unite'];
	} );
	$moins_cher = count( $kg ) > 1 ? min( wp_list_pluck( $kg, 'prix' ) ) : -1;
	$h = '<div class="cp-modes">';
	foreach ( $modes as $m ) {
		$badge = (int) $m['delai_min'] === (int) $rapide && count( $modes ) > 1 ? 'Le plus rapide' : ( 'kg' === $m['unite'] && (float) $m['prix'] === (float) $moins_cher ? 'Le moins cher' : '' );
		$h .= '<div class="cp-mode' . ( $badge ? ' cp-mode-vedette' : '' ) . '">' . ( $badge ? '<span class="cp-mode-badge">' . esc_html( $badge ) . '</span>' : '' ) . '<div class="cp-mode-ico">' . cp_icone_mode( $m ) . '</div><h3>' . esc_html( $m['nom'] ) . '</h3>'
			. ( ! empty( $m['description'] ) ? '<p class="cp-mode-desc">' . esc_html( $m['description'] ) . '</p>' : '' )
			. '<p class="cp-mode-prix">' . esc_html( cp_prix( $m['prix'] ) ) . '<small>par ' . ( 'm3' === $m['unite'] ? 'm³ (CBM)' : 'kilo' ) . '</small></p>'
			. ( ! empty( $m['prix_alt'] ) ? '<p class="cp-mode-alt">' . esc_html( ( $m['prix_alt_libelle'] ?: 'Autre tarif' ) . ' : ' . cp_prix( $m['prix_alt'] ) ) . '</p>' : '' )
			. '<p class="cp-mode-delai">' . esc_html( cp_delai_texte( $m ) ) . '</p></div>';
	}
	return $h . '</div>';
} );

function cp_delai_texte( $m ) {
	$a = (int) $m['delai_min'];
	$b = (int) $m['delai_max'];
	if ( $a >= 14 && 0 === $a % 7 && 0 === $b % 7 ) {
		return 'Délai : ' . ( $a / 7 ) . ' à ' . ( $b / 7 ) . ' semaines';
	}
	if ( $a >= 45 ) {
		return 'Délai : environ ' . round( ( $a + $b ) / 60 ) . ' mois';
	}
	return 'Délai : ' . $a . ' à ' . $b . ' jours';
}

add_shortcode( 'cargo_simulateur', function () {
	ob_start();
	?>
	<div class="cp-carte cp-simulateur" data-cp="simulateur">
		<h2><?php echo cp_icone( 'calcul' ); // phpcs:ignore ?> Combien coûte mon envoi ?</h2>
		<p class="cp-aide">Indiquez le poids et les dimensions de vos cartons : le prix est calculé pour chaque mode d'envoi, avec le délai.</p>
		<div class="cp-colis-lignes" data-cp="lignes">
			<div class="cp-colis-ligne">
				<label>Cartons<input type="number" min="1" value="1" data-champ="nombre"></label>
				<label>Poids d'un carton (kg)<input type="number" min="0" step="0.1" placeholder="ex. 12" data-champ="poids"></label>
				<label>Longueur (cm)<input type="number" min="0" placeholder="50" data-champ="longueur"></label>
				<label>Largeur (cm)<input type="number" min="0" placeholder="40" data-champ="largeur"></label>
				<label>Hauteur (cm)<input type="number" min="0" placeholder="30" data-champ="hauteur"></label>
			</div>
		</div>
		<button type="button" class="cp-lien" data-cp="ajouter-ligne">+ Ajouter un autre type de carton</button>
		<div class="cp-resultats" data-cp="resultats" aria-live="polite"></div>
		<p class="cp-note">Avion : le poids facturé est le plus grand du poids réel et du poids volumétrique (L × l × h ÷ 6 000). Bateau : facturé au mètre cube. Prix indicatif, confirmé à la pesée à l'entrepôt.</p>
	</div>
	<?php
	return ob_get_clean();
} );

add_shortcode( 'cargo_suivi', function () {
	$code = isset( $_GET['code'] ) ? sanitize_text_field( wp_unslash( $_GET['code'] ) ) : ''; // phpcs:ignore
	ob_start();
	?>
	<div class="cp-carte cp-suivi" data-cp="suivi">
		<h2><?php echo cp_icone( 'loupe' ); // phpcs:ignore ?> Suivre mon colis</h2>
		<form class="cp-suivi-form" data-cp="suivi-form">
			<input type="text" name="code" value="<?php echo esc_attr( $code ); ?>" placeholder="Votre code d'envoi, ex. <?php echo esc_attr( cp_r( 'code.prefixe' ) ); ?>-7K3Q9M" autocomplete="off" required>
			<button type="submit" class="cp-btn">Suivre</button>
		</form>
		<div class="cp-suivi-resultat" data-cp="suivi-resultat" aria-live="polite"></div>
	</div>
	<?php
	return ob_get_clean();
} );

add_shortcode( 'cargo_declarer', function () {
	$u = wp_get_current_user();
	ob_start();
	?>
	<div class="cp-carte cp-declarer" data-cp="declarer">
		<h2><?php echo cp_icone( 'colis' ); // phpcs:ignore ?> Expédier un colis</h2>
		<p class="cp-aide">Déclarez votre envoi en deux minutes : vous recevez tout de suite votre <b>code d'envoi</b>, la fiche d'expédition et les étiquettes à coller sur vos cartons. Faites ensuite livrer vos colis à notre entrepôt en <?php echo esc_html( cp_r( 'origine.pays' ) ); ?>.</p>
		<form data-cp="declarer-form" novalidate>
			<fieldset><legend>1. Mode d'envoi</legend><div class="cp-choix-modes">
				<?php foreach ( cp_modes_actifs() as $i => $m ) : ?>
					<label class="cp-choix"><input type="radio" name="mode" value="<?php echo esc_attr( $m['id'] ); ?>" <?php checked( 0, $i ); ?>>
						<span><?php echo cp_icone_mode( $m ); // phpcs:ignore ?><b><?php echo esc_html( $m['nom'] ); ?></b><em><?php echo esc_html( cp_prix( $m['prix'] ) . ' / ' . ( 'm3' === $m['unite'] ? 'm³' : 'kg' ) ); ?></em><small><?php echo esc_html( cp_delai_texte( $m ) ); ?></small></span></label>
				<?php endforeach; ?>
			</div></fieldset>
			<fieldset><legend>2. Vous</legend><div class="cp-grille">
				<label>Nom et prénom *<input name="client[nom]" required value="<?php echo esc_attr( $u->exists() ? $u->display_name : '' ); ?>"></label>
				<label>Téléphone / WhatsApp *<input name="client[telephone]" type="tel" required></label>
				<label>E-mail * <small>(pour recevoir la fiche)</small><input name="client[email]" type="email" required value="<?php echo esc_attr( $u->exists() ? $u->user_email : '' ); ?>"></label>
				<label>Ville<input name="client[ville]"></label>
				<label>Adresse<input name="client[adresse]"></label>
				<label>Fournisseur / site d'achat <small>(facultatif)</small><input name="client[fournisseur]" placeholder="ex. Alibaba, 1688, nom du magasin…"></label>
			</div></fieldset>
			<fieldset><legend>3. Destinataire au <?php echo esc_html( cp_r( 'destination.pays' ) ); ?> <small>(laisser vide si c'est vous)</small></legend><div class="cp-grille">
				<label>Nom<input name="destinataire[nom]"></label>
				<label>Téléphone<input name="destinataire[telephone]" type="tel"></label>
				<label>Ville<input name="destinataire[ville]"></label>
				<label>Quartier<input name="destinataire[quartier]"></label>
				<label>Agence de retrait<select name="destinataire[agence]">
					<?php foreach ( (array) cp_r( 'destination.agences', array() ) as $a ) : ?>
						<option><?php echo esc_html( $a['ville'] ); ?></option>
					<?php endforeach; ?>
				</select></label>
			</div></fieldset>
			<fieldset><legend>4. Votre envoi</legend><div class="cp-grille">
				<label>Nature<select name="categorie">
					<?php foreach ( (array) cp_r( 'categories', array() ) as $c ) : ?>
						<option><?php echo esc_html( $c ); ?></option>
					<?php endforeach; ?>
				</select></label>
				<label>Contenu<input name="contenu" placeholder="ex. pièces de moto, vêtements…"></label>
				<label>Nombre de cartons<input name="colis[0][nombre]" type="number" min="1" value="1"></label>
				<label>Poids total estimé (kg)<input name="colis[0][poids]" type="number" min="0" step="0.1"></label>
				<label>Valeur de la marchandise (<?php echo esc_html( cp_r( 'entreprise.devise' ) ); ?>)<input name="valeur" type="number" min="0"></label>
			</div>
			<p class="cp-note">Le poids exact est mesuré à l'entrepôt : vous recevez alors le montant à payer.</p></fieldset>
			<input type="text" name="site_web" class="cp-piege" tabindex="-1" autocomplete="off" aria-hidden="true">
			<p class="cp-erreur" data-cp="erreur" role="alert"></p>
			<button type="submit" class="cp-btn cp-btn-grand">Obtenir mon code d'envoi</button>
		</form>
		<div class="cp-succes" data-cp="succes" hidden></div>
	</div>
	<?php
	return ob_get_clean();
} );

add_shortcode( 'cargo_mon_espace', function () {
	if ( ! is_user_logged_in() ) {
		$h = '<div class="cp-carte"><h2>Mon espace</h2><p>Connectez-vous pour retrouver vos envois, vos fiches d\'expédition et vos reçus.</p>' . wp_login_form( array( 'echo' => false, 'label_username' => 'E-mail ou identifiant', 'label_password' => 'Mot de passe', 'label_remember' => 'Rester connecté', 'label_log_in' => 'Se connecter' ) );
		if ( get_option( 'users_can_register' ) ) {
			$h .= '<p>Pas encore de compte ? <a href="' . esc_url( wp_registration_url() ) . '">Créer un compte</a></p>';
		}
		return $h . '<p>Vous avez seulement un code d\'envoi ? <a href="' . esc_url( cp_url_page( 'suivi' ) ) . '">Suivez votre colis ici</a>.</p></div>';
	}
	$u = wp_get_current_user();
	$ids = get_posts( array( 'post_type' => 'cp_envoi', 'numberposts' => 100, 'fields' => 'ids', 'meta_query' => array( 'relation' => 'OR', array( 'key' => '_cp_user', 'value' => $u->ID ), array( 'key' => '_cp_client', 'value' => '"' . $u->user_email . '"', 'compare' => 'LIKE' ) ) ) );
	$liens = apply_filters( 'cp_mon_espace_liens', '' );
	$h = '<div class="cp-carte"><h2>Mes envois</h2>' . ( $liens ? '<p class="cp-boutons">' . $liens . '</p>' : '' );
	if ( ! $ids ) {
		return $h . '<p>Aucun envoi pour le moment. <a class="cp-btn" href="' . esc_url( cp_url_page( 'declarer' ) ) . '">Expédier un colis</a></p></div>';
	}
	$h .= '<div class="cp-tableau"><table><thead><tr><th>Code</th><th>Mode</th><th>Étape</th><th>Montant</th><th>Paiement</th><th>Documents</th></tr></thead><tbody>';
	foreach ( $ids as $id ) {
		$e = cp_envoi( $id );
		$et = cp_etape( $e['statut'] );
		$docs = '<a href="' . esc_url( cp_lien_pdf( $id, 'fiche' ) ) . '" target="_blank">Fiche</a> · <a href="' . esc_url( cp_lien_pdf( $id, 'etiquettes' ) ) . '" target="_blank">Étiquettes</a>' . ( 'paye' === $e['paiement']['statut'] ? ' · <a href="' . esc_url( cp_lien_pdf( $id, 'recu' ) ) . '" target="_blank">Reçu</a>' : '' );
		$h .= '<tr><td><a href="' . esc_url( cp_lien_suivi( $e['code'] ) ) . '"><b>' . esc_html( $e['code'] ) . '</b></a><br><small>' . esc_html( wp_date( 'd/m/Y', $e['date'] ) ) . '</small></td><td>' . esc_html( $e['mode_nom'] ) . '</td><td>' . esc_html( $et ? $et['nom'] : '' ) . '</td><td>' . ( $e['montant'] ? esc_html( cp_prix( $e['montant'] ) ) : '<small>à la pesée</small>' ) . '</td><td>' . ( 'paye' === $e['paiement']['statut'] ? '<span class="cp-ok">Payé</span>' : '<span class="cp-attente">En attente</span>' ) . '</td><td>' . $docs . '</td></tr>';
	}
	return $h . '</tbody></table></div></div>';
} );

add_shortcode( 'cargo_accueil', function () {
	$o = cp_r( 'origine.pays' );
	$d = cp_r( 'destination.pays' );
	$nom = cp_r( 'entreprise.nom' );
	$modes = cp_modes_actifs();
	$unites = array_unique( wp_list_pluck( $modes, 'unite' ) );
	$wa = cp_whatsapp_lien( 'Bonjour ' . $nom . ', je voudrais expédier un colis.' );
	$fleche = cp_icone( 'fleche' );
	$rapide = $modes ? array_reduce( $modes, function ( $x, $m ) {
		return ! $x || $m['delai_min'] < $x['delai_min'] ? $m : $x;
	} ) : null;
	$entete = function ( $surtitre, $h2, $sous = '' ) {
		echo '<div class="cp-a-entete cp-anim"><p class="cp-a-sur">' . esc_html( $surtitre ) . '</p><h2>' . wp_kses( $h2, array( 'span' => array() ) ) . '</h2>' . ( $sous ? '<p class="cp-a-sous">' . esc_html( $sous ) . '</p>' : '' ) . '</div>';
	};
	$chiffres = cp_chiffres();
	$icones_chiffres = array( 'colis', 'paiement', 'horloge' );
	ob_start();
	?>
	<div class="cp-accueil">
	<?php $diapos = cp_diapos(); $nb = count( $diapos ); ?>
	<section class="cp-a-hero" data-cp="diapos" aria-roledescription="carrousel" aria-label="À la une">
		<div class="cp-a-diapos">
			<?php foreach ( $diapos as $i => $dp ) : $balise = $i ? 'h2' : 'h1'; ?>
				<div class="cp-a-diapo<?php echo 0 === $i ? ' cp-actif' : ''; ?>" role="group" aria-roledescription="diapositive" aria-label="<?php echo esc_attr( ( $i + 1 ) . ' sur ' . $nb ); ?>"<?php echo $i ? ' aria-hidden="true"' : ''; ?>>
					<?php if ( $dp['image'] ) : ?><div class="cp-a-hero-photo"><img src="<?php echo esc_url( $dp['image'] ); ?>" alt=""<?php echo $i ? ' loading="lazy"' : ' fetchpriority="high"'; ?>></div><?php endif; ?>
					<div class="cp-a-in"><div class="cp-a-hero-texte">
						<<?php echo $balise; ?> class="cp-a-titre-diapo"><?php echo esc_html( $dp['titre'] ); ?><?php if ( $dp['titre_fin'] ) : ?> <span><?php echo esc_html( $dp['titre_fin'] ); ?></span><?php endif; ?></<?php echo $balise; ?>>
						<?php if ( $dp['texte'] ) : ?><p class="cp-a-hero-p"><?php echo esc_html( $dp['texte'] ); ?></p><?php endif; ?>
						<div class="cp-a-boutons">
							<a class="cp-btn cp-btn-action" href="<?php echo esc_url( $dp['lien'] ); ?>"<?php echo $i ? ' tabindex="-1"' : ''; ?>><?php echo esc_html( $dp['bouton'] ); ?><?php echo $fleche; // phpcs:ignore ?></a>
							<a class="cp-btn cp-btn-contour-clair" href="#services"<?php echo $i ? ' tabindex="-1"' : ''; ?>>Découvrir nos services</a>
						</div>
					</div></div>
				</div>
			<?php endforeach; ?>
		</div>
		<?php if ( $rapide ) : ?>
			<div class="cp-a-in cp-a-flottante-in">
				<a class="cp-a-flottante" href="<?php echo esc_url( cp_url_page( 'tarifs' ) ); ?>">
					<span class="cp-a-flottante-ico"><?php echo cp_icone( 'eclair' ); // phpcs:ignore ?></span>
					<b><?php echo esc_html( cp_nom_court( $rapide ) . ' : ' . str_replace( 'Délai : ', '', cp_delai_texte( $rapide ) ) ); ?></b>
					<span><?php echo esc_html( 'Vos colis urgents ' . ( 'm3' === $rapide['unite'] ? 'par bateau' : 'par avion' ) . ', suivis jusqu\'à la remise.' ); ?></span>
					<em>Voir les tarifs<?php echo $fleche; // phpcs:ignore ?></em>
				</a>
			</div>
		<?php endif; ?>
		<div class="cp-a-in cp-a-hero-bas">
			<ul class="cp-a-chiffres">
				<?php foreach ( $chiffres as $i => $c ) : ?><li><?php echo cp_icone( $icones_chiffres[ $i ] ?? 'colis' ); // phpcs:ignore ?><span><b><?php echo esc_html( $c['valeur'] ); ?></b><?php echo esc_html( $c['libelle'] ); ?></span></li><?php endforeach; ?>
				<li><?php echo cp_icone( 'suivi' ); // phpcs:ignore ?><span><b>24h/24</b>suivi en ligne</span></li>
			</ul>
			<?php if ( $nb > 1 ) : ?>
				<div class="cp-a-diapos-nav">
					<button type="button" class="cp-a-diapos-prec" aria-label="Diapositive précédente"><?php echo cp_icone( 'fleche' ); // phpcs:ignore ?></button>
					<div class="cp-a-points"><?php for ( $i = 0; $i < $nb; $i++ ) : ?><button type="button" class="<?php echo 0 === $i ? 'cp-actif' : ''; ?>" aria-label="<?php echo esc_attr( 'Diapositive ' . ( $i + 1 ) ); ?>" aria-current="<?php echo 0 === $i ? 'true' : 'false'; ?>"></button><?php endfor; ?></div>
					<button type="button" class="cp-a-diapos-suiv" aria-label="Diapositive suivante"><?php echo cp_icone( 'fleche' ); // phpcs:ignore ?></button>
				</div>
			<?php endif; ?>
		</div>
	</section>

	<div class="cp-a-in cp-a-devis-in">
		<form class="cp-a-devis" data-cp="devis" novalidate>
			<div class="cp-a-devis-tete"><h2>Obtenez votre <span>devis en ligne</span></h2><a href="<?php echo esc_url( cp_url_page( 'suivi' ) ); ?>"><?php echo cp_icone( 'loupe' ); // phpcs:ignore ?>Vous avez un code ? Suivre un colis</a></div>
			<div class="cp-a-devis-champs">
				<label class="cp-a-champ-mode"><span>Mode d'envoi</span><select name="mode"><?php foreach ( $modes as $m ) : ?><option value="<?php echo esc_attr( $m['id'] ); ?>"><?php echo esc_html( $m['nom'] . ' — ' . cp_prix( $m['prix'] ) . ( 'm3' === $m['unite'] ? '/m³' : '/kg' ) ); ?></option><?php endforeach; ?></select></label>
				<label><span>Nombre de colis</span><input name="nombre" type="number" min="1" value="1" inputmode="numeric"></label>
				<label><span>Poids d'un colis (kg)</span><input name="poids" type="number" min="0" step="0.1" placeholder="ex. 12" inputmode="decimal"></label>
				<fieldset><legend>Dimensions d'un colis (cm)</legend><div><input name="longueur" type="number" min="0" placeholder="L" aria-label="Longueur"><input name="largeur" type="number" min="0" placeholder="l" aria-label="Largeur"><input name="hauteur" type="number" min="0" placeholder="h" aria-label="Hauteur"></div></fieldset>
				<button class="cp-btn cp-btn-action" type="submit">Calculer</button>
			</div>
			<div class="cp-a-devis-resultat" data-cp="devis-resultat" aria-live="polite"></div>
		</form>
	</div>

	<section class="cp-a-section" id="services">
		<div class="cp-a-in">
			<?php $entete( 'Nos services', 'Des solutions complètes, <span>' . esc_html( cp_de_pays( $o ) . ' ' . cp_au_pays( $d ) ) . '</span>', 'Achat, transport, paiement et suivi : un seul interlocuteur pour vos marchandises.' ); ?>
			<div class="cp-a-services">
				<?php foreach ( (array) cp_r( 'services', array() ) as $s ) : $img = cp_image_url( $s['image'] ?? 0, 'large' ); ?>
					<a class="cp-a-service cp-anim" href="<?php echo esc_url( cp_lien_service( $s['lien'] ?? '' ) ); ?>">
						<span class="cp-a-service-img<?php echo $img ? '' : ' cp-a-sans-photo'; ?>"><?php if ( $img ) : ?><span class="cp-a-cadre"><img src="<?php echo esc_url( $img ); ?>" alt="" loading="lazy"></span><?php endif; ?><i><?php echo cp_icone( cp_icone_auto( $s['titre'], $s['icone'] ?? '' ) ); // phpcs:ignore ?></i></span>
						<b><?php echo esc_html( $s['titre'] ); ?></b>
						<span class="cp-a-service-p"><?php echo esc_html( $s['texte'] ); ?></span>
						<em>En savoir plus<?php echo $fleche; // phpcs:ignore ?></em>
					</a>
				<?php endforeach; ?>
			</div>
		</div>
	</section>

	<section class="cp-a-section cp-a-blanc">
		<div class="cp-a-in">
			<?php $entete( 'Nos tarifs', 'Des prix clairs, <span>' . ( 1 === count( $unites ) && 'm3' === reset( $unites ) ? 'au mètre cube' : ( 1 === count( $unites ) ? 'au kilo' : 'au kilo ou au mètre cube' ) ) . '</span>', 'Le prix final est confirmé à la pesée, à notre entrepôt ' . cp_au_pays( $o ) . '.' ); ?>
			<div class="cp-anim"><?php echo do_shortcode( '[cargo_tarifs]' ); ?></div>
			<?php if ( cp_r( 'consigne_colis' ) ) : ?><p class="cp-consigne cp-anim"><?php echo cp_icone( 'colis' ); // phpcs:ignore ?> <?php echo esc_html( cp_r( 'consigne_colis' ) ); ?></p><?php endif; ?>
		</div>
	</section>

	<?php echo function_exists( 'cp_boutique_section' ) ? cp_boutique_section() : ''; // phpcs:ignore -- HTML de WooCommerce ?>

	<section class="cp-a-section">
		<div class="cp-a-in">
			<div class="cp-a-pourquoi cp-anim">
				<?php $img = cp_image_url( cp_r( 'site.pourquoi_image' ), 'large' ); ?>
				<div class="cp-a-pourquoi-panneau">
					<?php if ( $img ) : ?><img src="<?php echo esc_url( $img ); ?>" alt="" loading="lazy"><?php endif; ?>
					<div>
						<p class="cp-a-sur">Pourquoi nous choisir ?</p>
						<?php $pt = cp_r( 'site.pourquoi_titre' ); $mots = explode( ' ', $pt ); $der = count( $mots ) > 2 ? array_splice( $mots, -2 ) : array(); ?>
						<h2><?php echo esc_html( implode( ' ', $mots ) ); ?><?php echo $der ? ' <span>' . esc_html( implode( ' ', $der ) ) . '</span>' : ''; ?></h2>
						<p><?php echo esc_html( cp_r( 'site.pourquoi_texte' ) ); ?></p>
						<a class="cp-btn cp-btn-action" href="#comment">Comment ça marche<?php echo $fleche; // phpcs:ignore ?></a>
					</div>
				</div>
				<div class="cp-a-pourquoi-points">
					<?php foreach ( (array) cp_r( 'site.pourquoi_points', array() ) as $pt ) : ?>
						<div class="cp-a-point"><span class="cp-a-point-ico"><?php echo cp_icone( cp_icone_auto( $pt['titre'], $pt['icone'] ?? '' ) ); // phpcs:ignore ?></span><b><?php echo esc_html( $pt['titre'] ); ?></b><span><?php echo esc_html( $pt['texte'] ); ?></span></div>
					<?php endforeach; ?>
				</div>
			</div>
		</div>
	</section>

	<section class="cp-a-section cp-a-blanc" id="comment">
		<div class="cp-a-in">
			<?php $entete( 'Comment ça marche', 'Votre envoi en <span>4 étapes</span>', 'Simple, suivi et sans surprise, de la commande à la remise.' ); ?>
			<ol class="cp-a-etapes">
				<li class="cp-anim"><span class="cp-a-etape-ico"><?php echo cp_icone( 'douane' ); // phpcs:ignore ?></span><b>Déclarez votre envoi</b><span>En ligne : vous recevez votre code, le bordereau d'expédition et les étiquettes.</span></li>
				<li class="cp-anim"><span class="cp-a-etape-ico"><?php echo cp_icone( 'entrepot' ); // phpcs:ignore ?></span><b>Livrez à notre entrepôt</b><span><?php echo esc_html( ucfirst( cp_au_pays( $o ) ) ); ?>, avec votre code et le mode d'envoi sur chaque carton.</span></li>
				<li class="cp-anim"><span class="cp-a-etape-ico"><?php echo cp_icone( 'paiement' ); // phpcs:ignore ?></span><b>Pesée et paiement</b><span>Nous pesons vos colis et vous envoyons le montant exact. Payez par Mobile Money.</span></li>
				<li class="cp-anim"><span class="cp-a-etape-ico"><?php echo cp_icone( 'suivi' ); // phpcs:ignore ?></span><b>Suivi jusqu'à la remise</b><span>Chaque étape vous est envoyée par e-mail, jusqu'au retrait <?php echo esc_html( cp_au_pays( $d ) ); ?>.</span></li>
			</ol>
		</div>
	</section>

	<?php $avis = (array) cp_r( 'site.avis', array() ); if ( $avis ) : ?>
	<section class="cp-a-section">
		<div class="cp-a-in">
			<?php $entete( 'Ils nous font confiance', 'Ce que nos clients <span>disent de nous</span>' ); ?>
			<div class="cp-a-avis">
				<?php foreach ( array_slice( $avis, 0, 6 ) as $a ) : ?>
					<figure class="cp-a-avi cp-anim"><span class="cp-a-etoiles" aria-label="<?php echo (int) $a['note']; ?> sur 5"><?php echo esc_html( str_repeat( '★', (int) $a['note'] ) ); ?></span><blockquote>« <?php echo esc_html( $a['texte'] ); ?> »</blockquote><figcaption><span class="cp-a-initiales"><?php echo esc_html( mb_strtoupper( mb_substr( $a['nom'], 0, 1 ) ) ); ?></span><span><b><?php echo esc_html( $a['nom'] ); ?></b><?php echo $a['role'] ? '<small>' . esc_html( $a['role'] ) . '</small>' : ''; ?></span></figcaption></figure>
				<?php endforeach; ?>
			</div>
		</div>
	</section>
	<?php endif; ?>

	<section class="cp-a-section cp-a-adresses">
		<div class="cp-a-in">
			<?php $entete( 'Nos adresses', 'Où déposer et <span>retirer vos colis</span>' ); ?>
			<div class="cp-a-adresses-grille">
				<?php
				$vus = array();
				foreach ( $modes as $m ) {
					$ent = cp_entrepot( $m['id'] );
					$vus[ $ent['texte'] ][] = cp_nom_court( $m );
				}
				foreach ( $vus as $adresse => $noms ) :
					?>
					<div class="cp-a-adresse cp-anim"><span class="cp-a-point-ico"><?php echo cp_icone( 'entrepot' ); // phpcs:ignore ?></span><div><h3>Entrepôt <?php echo esc_html( cp_au_pays( $o ) ); ?></h3><p class="cp-a-modes-adresse"><?php echo esc_html( implode( ' · ', $noms ) ); ?></p><p class="cp-adresse"><?php echo nl2br( esc_html( $adresse ) ); ?></p><?php if ( cp_r( 'origine.contact' ) ) : ?><p class="cp-a-tel"><?php echo cp_icone( 'telephone' ); // phpcs:ignore ?> <?php echo esc_html( cp_r( 'origine.contact' ) ); ?></p><?php endif; ?></div></div>
				<?php endforeach; ?>
				<?php foreach ( (array) cp_r( 'destination.agences', array() ) as $a ) : ?>
					<div class="cp-a-adresse cp-anim"><span class="cp-a-point-ico"><?php echo cp_icone( 'suivi' ); // phpcs:ignore ?></span><div><h3>Agence de <?php echo esc_html( $a['ville'] ); ?></h3><p class="cp-a-modes-adresse">Retrait des colis</p><?php if ( $a['adresse'] ) : ?><p class="cp-adresse"><?php echo nl2br( esc_html( $a['adresse'] ) ); ?></p><?php endif; ?><?php if ( $a['telephone'] ) : ?><p class="cp-a-tel"><?php echo cp_icone( 'telephone' ); // phpcs:ignore ?> <?php echo esc_html( $a['telephone'] ); ?></p><?php endif; ?></div></div>
				<?php endforeach; ?>
			</div>
		</div>
	</section>

	<section class="cp-a-cta">
		<div class="cp-a-in cp-a-cta-in">
			<div><h2>Prêt à expédier vos marchandises ?</h2><p>Déclarez votre envoi en ligne : vous recevez aussitôt votre code de suivi et votre bordereau.</p></div>
			<div class="cp-a-boutons">
				<a class="cp-btn cp-btn-action" href="<?php echo esc_url( cp_url_page( 'declarer' ) ); ?>">Expédier un colis<?php echo $fleche; // phpcs:ignore ?></a>
				<?php if ( $wa ) : ?><a class="cp-btn cp-btn-contour-clair" href="<?php echo esc_url( $wa ); ?>" target="_blank" rel="noopener"><?php echo cp_icone( 'whatsapp' ); // phpcs:ignore ?> Écrire sur WhatsApp</a><?php endif; ?>
			</div>
		</div>
	</section>
	</div>
	<?php
	return ob_get_clean();
} );
