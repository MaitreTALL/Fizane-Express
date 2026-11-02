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
	return ":root{--cp-prim:$p;--cp-accent:$a;--cp-fond:$f}";
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
	);
}

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
	$client = array_map( 'sanitize_text_field', (array) $q->get_param( 'client' ) );
	$client['email'] = sanitize_email( $client['email'] ?? '' );
	$dest = array_map( 'sanitize_text_field', (array) $q->get_param( 'destinataire' ) );
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
		'avion'   => '<path d="M2.5 13.5l19-8-5.5 15-3.5-6.5z"/><path d="M12.5 14l9-8.5"/>',
		'bateau'  => '<path d="M3 15l2 5h14l2-5z"/><path d="M5 15V9h14v6M9 9V5h6v4"/><path d="M2 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/>',
		'colis'   => '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
		'suivi'   => '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
		'calcul'  => '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11v6M8 15h2M12 15h2"/>',
		'voiture' => '<path d="M4 16v-4l2-5h12l2 5v4z"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/><path d="M4 12h16"/>',
		'whatsapp' => '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.5 2 2 3.6 4 4.5l1.2-1.2 2 .8-.5 1.9c-3.5 0-7.4-3.9-7.4-7.4l1.9-.5.8 2z"/>',
		'bouclier' => '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
	);
	return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . ( $i[ $nom ] ?? $i['colis'] ) . '</svg>';
}

function cp_icone_mode( $m ) {
	return 'm3' === $m['unite'] ? cp_icone( 'bateau' ) : cp_icone( 'avion' );
}

add_shortcode( 'cargo_tarifs', function () {
	$h = '<div class="cp-modes">';
	foreach ( cp_modes_actifs() as $m ) {
		$h .= '<div class="cp-mode"><div class="cp-mode-ico">' . cp_icone_mode( $m ) . '</div><h3>' . esc_html( $m['nom'] ) . '</h3>'
			. ( ! empty( $m['description'] ) ? '<p class="cp-mode-desc">' . esc_html( $m['description'] ) . '</p>' : '' )
			. '<p class="cp-mode-prix">' . esc_html( cp_prix( $m['prix'] ) ) . '<small> / ' . ( 'm3' === $m['unite'] ? 'm³' : 'kg' ) . '</small></p>'
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
		<h2><?php echo cp_icone( 'suivi' ); // phpcs:ignore ?> Suivre mon colis</h2>
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
			</div></fieldset>
			<fieldset><legend>3. Destinataire au <?php echo esc_html( cp_r( 'destination.pays' ) ); ?> <small>(laisser vide si c'est vous)</small></legend><div class="cp-grille">
				<label>Nom<input name="destinataire[nom]"></label>
				<label>Téléphone<input name="destinataire[telephone]" type="tel"></label>
				<label>Ville<input name="destinataire[ville]"></label>
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
	$h = '<div class="cp-carte"><h2>Mes envois</h2>';
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
	$logo = cp_logo_url( 'large' );
	$wa = cp_whatsapp_lien( 'Bonjour ' . cp_r( 'entreprise.nom' ) . ', je voudrais expédier un colis.' );
	ob_start();
	?>
	<section class="cp-hero">
		<div class="cp-hero-texte">
			<?php if ( $logo ) : ?><img class="cp-hero-logo" src="<?php echo esc_url( $logo ); ?>" alt="<?php echo esc_attr( cp_r( 'entreprise.nom' ) ); ?>"><?php endif; ?>
			<p class="cp-sur"><?php echo esc_html( cp_r( 'origine.pays' ) . ' → ' . cp_r( 'destination.pays' ) ); ?></p>
			<h1><?php echo esc_html( cp_r( 'entreprise.slogan' ) ); ?></h1>
			<p class="cp-hero-mentions"><?php echo esc_html( cp_r( 'entreprise.mentions' ) ); ?></p>
			<div class="cp-hero-boutons">
				<a class="cp-btn cp-btn-grand" href="<?php echo esc_url( cp_url_page( 'declarer' ) ); ?>">Expédier un colis</a>
				<a class="cp-btn cp-btn-clair cp-btn-grand" href="<?php echo esc_url( cp_url_page( 'simulateur' ) ); ?>">Simuler un tarif</a>
			</div>
			<form class="cp-hero-suivi" action="<?php echo esc_url( cp_url_page( 'suivi' ) ); ?>" method="get">
				<?php echo cp_icone( 'suivi' ); // phpcs:ignore ?><input name="code" placeholder="Suivre un colis : votre code d'envoi" required><button class="cp-btn">Suivre</button>
			</form>
		</div>
	</section>
	<section class="cp-section"><h2 class="cp-titre-section">Nos tarifs</h2><?php echo do_shortcode( '[cargo_tarifs]' ); ?>
		<p class="cp-consigne"><?php echo cp_icone( 'colis' ); // phpcs:ignore ?> <?php echo esc_html( cp_r( 'consigne_colis' ) ); ?></p></section>
	<section class="cp-section cp-etapes-accueil"><h2 class="cp-titre-section">Comment ça marche ?</h2><ol>
		<li><b>Déclarez votre envoi</b><span>En ligne : vous recevez votre code, la fiche d'expédition et les étiquettes.</span></li>
		<li><b>Livrez à notre entrepôt</b><span>En <?php echo esc_html( cp_r( 'origine.pays' ) ); ?>, avec votre code et le mode d'envoi sur chaque carton.</span></li>
		<li><b>Pesée et paiement</b><span>Nous pesons vos colis et vous envoyons le montant exact. Payez par Mobile Money.</span></li>
		<li><b>Suivi jusqu'à la remise</b><span>Chaque étape vous est envoyée par e-mail, jusqu'au retrait au <?php echo esc_html( cp_r( 'destination.pays' ) ); ?>.</span></li>
	</ol></section>
	<section class="cp-section"><h2 class="cp-titre-section">Nos services</h2><div class="cp-services">
		<?php foreach ( (array) cp_r( 'services', array() ) as $i => $s ) : ?>
			<div class="cp-service"><div class="cp-service-ico"><?php echo cp_icone( array( 'avion', 'bateau', 'voiture', 'suivi', 'bouclier', 'colis' )[ $i % 6 ] ); // phpcs:ignore ?></div><h3><?php echo esc_html( $s['titre'] ); ?></h3><p><?php echo esc_html( $s['texte'] ); ?></p></div>
		<?php endforeach; ?>
	</div></section>
	<section class="cp-section"><h2 class="cp-titre-section">Simulez votre envoi</h2><?php echo do_shortcode( '[cargo_simulateur]' ); ?></section>
	<section class="cp-section cp-adresses"><h2 class="cp-titre-section">Nos adresses</h2><div class="cp-services">
		<?php
		$vus = array();
		foreach ( cp_modes_actifs() as $m ) {
			$ent = cp_entrepot( $m['id'] );
			$vus[ $ent['texte'] ][] = $m['nom'];
		}
		foreach ( $vus as $adresse => $noms ) :
			?>
			<div class="cp-service"><h3>Entrepôt en <?php echo esc_html( cp_r( 'origine.pays' ) ); ?></h3><p class="cp-petit"><?php echo esc_html( implode( ' · ', $noms ) ); ?></p><p class="cp-adresse"><?php echo nl2br( esc_html( $adresse ) ); ?></p><?php if ( cp_r( 'origine.contact' ) ) : ?><p><?php echo esc_html( cp_r( 'origine.contact' ) ); ?></p><?php endif; ?></div>
		<?php endforeach; ?>
		<?php foreach ( (array) cp_r( 'destination.agences', array() ) as $a ) : ?>
			<div class="cp-service"><h3>Agence de <?php echo esc_html( $a['ville'] ); ?></h3><p class="cp-adresse"><?php echo nl2br( esc_html( $a['adresse'] ) ); ?></p><?php if ( $a['telephone'] ) : ?><p><?php echo esc_html( $a['telephone'] ); ?></p><?php endif; ?></div>
		<?php endforeach; ?>
	</div></section>
	<?php if ( $wa ) : ?>
		<section class="cp-section cp-contact"><h2>Une question ?</h2><p>Notre équipe vous accompagne de A à Z.</p><a class="cp-btn cp-btn-grand cp-btn-wa" href="<?php echo esc_url( $wa ); ?>"><?php echo cp_icone( 'whatsapp' ); // phpcs:ignore ?> Écrire sur WhatsApp</a></section>
	<?php endif; ?>
	<?php
	return ob_get_clean();
} );
