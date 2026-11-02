<?php
/**
 * Expéditions : type de contenu « cp_envoi », code de suivi, colis, tarif, étapes de suivi, paiement,
 * écrans d'administration (liste, fiche d'un envoi) et documents PDF (fiche d'expédition, étiquettes, reçu).
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'init', 'cp_enregistrer_types' );
function cp_enregistrer_types() {
	register_post_type( 'cp_envoi', array(
		'labels'       => array(
			'name' => 'Expéditions', 'singular_name' => 'Expédition', 'add_new' => 'Nouvel envoi', 'add_new_item' => 'Nouvel envoi',
			'edit_item' => 'Envoi', 'search_items' => 'Rechercher un envoi', 'not_found' => 'Aucun envoi', 'all_items' => 'Toutes les expéditions',
			'menu_name' => 'Cargo',
		),
		'public'       => false,
		'show_ui'      => true,
		'show_in_menu' => true,
		'menu_icon'    => 'dashicons-airplane',
		'menu_position' => 26,
		'supports'     => array( 'title' ),
		'capability_type' => 'post',
	) );
}

/* ---------------------------------------------------------------- code de suivi */
function cp_nouveau_code() {
	$prefixe = strtoupper( preg_replace( '/[^A-Za-z0-9]/', '', (string) cp_r( 'code.prefixe', 'CRG' ) ) );
	$alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';    // sans 0, 1, I, O : pas de confusion à la lecture
	do {
		$c = '';
		for ( $i = 0; $i < 6; $i++ ) {
			$c .= $alphabet[ random_int( 0, strlen( $alphabet ) - 1 ) ];
		}
		$code = $prefixe . '-' . $c;
	} while ( cp_envoi_par_code( $code ) );
	return $code;
}

function cp_envoi_par_code( $code ) {
	$code = strtoupper( trim( (string) $code ) );
	if ( '' === $code ) {
		return 0;
	}
	$q = get_posts( array( 'post_type' => 'cp_envoi', 'post_status' => 'any', 'meta_key' => '_cp_code', 'meta_value' => $code, 'fields' => 'ids', 'numberposts' => 1 ) );
	return $q ? (int) $q[0] : 0;
}

/* ---------------------------------------------------------------- données d'un envoi */
function cp_envoi( $id ) {
	$id = (int) $id;
	$g = function ( $cle, $defaut = '' ) use ( $id ) {
		$v = get_post_meta( $id, $cle, true );
		return '' === $v || null === $v ? $defaut : $v;
	};
	$d = array(
		'id'           => $id,
		'code'         => $g( '_cp_code' ),
		'date'         => get_post_time( 'U', true, $id ),
		'client'       => wp_parse_args( (array) $g( '_cp_client', array() ), array( 'nom' => '', 'telephone' => '', 'email' => '', 'ville' => '' ) ),
		'destinataire' => wp_parse_args( (array) $g( '_cp_destinataire', array() ), array( 'nom' => '', 'telephone' => '', 'ville' => '', 'agence' => '' ) ),
		'mode'         => $g( '_cp_mode', 'aerien' ),
		'colis'        => (array) $g( '_cp_colis', array() ),
		'contenu'      => $g( '_cp_contenu' ),
		'valeur'       => (float) $g( '_cp_valeur', 0 ),
		'calcul'       => (array) $g( '_cp_calcul', array() ),
		'montant'      => (float) $g( '_cp_montant', 0 ),
		'paiement'     => wp_parse_args( (array) $g( '_cp_paiement', array() ), array( 'statut' => 'attente', 'moyen' => '', 'reference' => '', 'date' => 0, 'montant' => 0 ) ),
		'historique'   => (array) $g( '_cp_historique', array() ),
		'statut'       => $g( '_cp_statut', 'declare' ),
		'recu'         => $g( '_cp_recu_num' ),
		'cle'          => $g( '_cp_cle' ),
	);
	$m = cp_mode( $d['mode'] );
	$d['mode_nom'] = $m ? $m['nom'] : $d['mode'];
	return $d;
}

/** Enregistre un envoi (création ou mise à jour). $d : mêmes clés que cp_envoi(). Renvoie l'identifiant. */
function cp_enregistrer_envoi( array $d, $id = 0 ) {
	if ( ! $id ) {
		$code = cp_nouveau_code();
		$id = wp_insert_post( array( 'post_type' => 'cp_envoi', 'post_status' => 'publish', 'post_title' => $code ) );
		if ( is_wp_error( $id ) || ! $id ) {
			return 0;
		}
		update_post_meta( $id, '_cp_code', $code );
		update_post_meta( $id, '_cp_cle', wp_generate_password( 20, false ) );   // lien privé vers les documents
	}
	foreach ( array( 'client', 'destinataire', 'mode', 'colis', 'contenu', 'valeur', 'paiement' ) as $k ) {
		if ( array_key_exists( $k, $d ) ) {
			update_post_meta( $id, '_cp_' . $k, $d[ $k ] );
		}
	}
	$e = cp_envoi( $id );
	$mode = cp_mode( $e['mode'] );
	if ( $mode && $e['colis'] ) {
		$calcul = cp_calcul_tarif( $mode, $e['colis'], cp_r( 'frais', array() ), $e['valeur'] );
		update_post_meta( $id, '_cp_calcul', $calcul );
		if ( empty( $d['montant_force'] ) ) {
			update_post_meta( $id, '_cp_montant', $calcul['total'] );
		}
	}
	if ( ! empty( $d['montant_force'] ) ) {
		update_post_meta( $id, '_cp_montant', (float) $d['montant_force'] );
	}
	return $id;
}

/**
 * Passe l'envoi à une étape de suivi (et la note dans l'historique). Envoie le message au client si $prevenir.
 */
function cp_changer_etape( $id, $etape, $note = '', $lieu = '', $prevenir = true ) {
	if ( ! cp_etape( $etape ) ) {
		return false;
	}
	$h = (array) get_post_meta( $id, '_cp_historique', true );
	$h[] = array( 'etape' => $etape, 'date' => time(), 'note' => $note, 'lieu' => $lieu );
	update_post_meta( $id, '_cp_historique', $h );
	update_post_meta( $id, '_cp_statut', $etape );
	if ( $prevenir ) {
		cp_mail_etape( $id, $etape, $note );
	}
	do_action( 'cp_etape_changee', $id, $etape );
	return true;
}

/** Marque l'envoi comme payé, attribue un numéro de reçu et envoie le reçu. */
function cp_marquer_paye( $id, $moyen = '', $reference = '', $montant = null ) {
	$e = cp_envoi( $id );
	$p = array( 'statut' => 'paye', 'moyen' => $moyen, 'reference' => $reference, 'date' => time(), 'montant' => null === $montant ? $e['montant'] : (float) $montant );
	update_post_meta( $id, '_cp_paiement', $p );
	if ( ! $e['recu'] ) {
		$n = (int) get_option( 'cp_recu_suivant', 1 );
		update_option( 'cp_recu_suivant', $n + 1 );
		update_post_meta( $id, '_cp_recu_num', 'R' . gmdate( 'Y' ) . '-' . str_pad( (string) $n, 5, '0', STR_PAD_LEFT ) );
	}
	cp_mail_recu( $id );
	do_action( 'cp_envoi_paye', $id );
}

/* ---------------------------------------------------------------- liste des envois (administration) */
add_filter( 'manage_cp_envoi_posts_columns', function () {
	return array( 'cb' => '<input type="checkbox">', 'title' => 'Code', 'cp_client' => 'Client', 'cp_mode' => 'Mode', 'cp_poids' => 'Poids / volume',
		'cp_total' => 'Montant', 'cp_paiement' => 'Paiement', 'cp_etape' => 'Étape', 'date' => 'Date' );
} );
add_action( 'manage_cp_envoi_posts_custom_column', function ( $col, $id ) {
	$e = cp_envoi( $id );
	switch ( $col ) {
		case 'cp_client':
			echo esc_html( $e['client']['nom'] ) . '<br><small>' . esc_html( $e['client']['telephone'] ) . '</small>';
			break;
		case 'cp_mode':
			echo esc_html( $e['mode_nom'] );
			break;
		case 'cp_poids':
			if ( $e['calcul'] ) {
				echo 'm3' === $e['calcul']['unite'] ? esc_html( $e['calcul']['facture'] . ' m³' ) : esc_html( $e['calcul']['facture'] . ' kg' );
			} else {
				echo '—';
			}
			break;
		case 'cp_total':
			echo $e['montant'] ? esc_html( cp_prix( $e['montant'] ) ) : '—';
			break;
		case 'cp_paiement':
			echo 'paye' === $e['paiement']['statut'] ? '<span style="color:#0a7d33;font-weight:600">Payé</span>' : '<span style="color:#b26a00">En attente</span>';
			break;
		case 'cp_etape':
			$et = cp_etape( $e['statut'] );
			echo esc_html( $et ? $et['nom'] : $e['statut'] );
			break;
	}
}, 10, 2 );

/* ---------------------------------------------------------------- fiche d'un envoi (administration) */
add_action( 'add_meta_boxes_cp_envoi', function () {
	add_meta_box( 'cp_client', 'Client et destinataire', 'cp_boite_client', 'cp_envoi', 'normal', 'high' );
	add_meta_box( 'cp_colis', 'Colis et tarif', 'cp_boite_colis', 'cp_envoi', 'normal', 'high' );
	add_meta_box( 'cp_suivi', 'Suivi', 'cp_boite_suivi', 'cp_envoi', 'normal', 'default' );
	add_meta_box( 'cp_paiement', 'Paiement', 'cp_boite_paiement', 'cp_envoi', 'side', 'high' );
	add_meta_box( 'cp_documents', 'Documents', 'cp_boite_documents', 'cp_envoi', 'side', 'default' );
} );

function cp_champ( $nom, $valeur, $libelle, $type = 'text', $attrs = '' ) {
	printf( '<p><label style="display:block;font-weight:600;margin-bottom:3px">%s</label><input type="%s" name="%s" value="%s" class="widefat" %s></p>',
		esc_html( $libelle ), esc_attr( $type ), esc_attr( $nom ), esc_attr( $valeur ), $attrs ); // phpcs:ignore
}

function cp_boite_client( $post ) {
	$e = cp_envoi( $post->ID );
	wp_nonce_field( 'cp_envoi', 'cp_envoi_nonce' );
	echo '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px"><div><h4>Client (expéditeur)</h4>';
	cp_champ( 'cp[client][nom]', $e['client']['nom'], 'Nom' );
	cp_champ( 'cp[client][telephone]', $e['client']['telephone'], 'Téléphone / WhatsApp' );
	cp_champ( 'cp[client][email]', $e['client']['email'], 'E-mail', 'email' );
	cp_champ( 'cp[client][ville]', $e['client']['ville'], 'Ville' );
	echo '</div><div><h4>Destinataire au ' . esc_html( cp_r( 'destination.pays' ) ) . '</h4>';
	cp_champ( 'cp[destinataire][nom]', $e['destinataire']['nom'], 'Nom' );
	cp_champ( 'cp[destinataire][telephone]', $e['destinataire']['telephone'], 'Téléphone' );
	cp_champ( 'cp[destinataire][ville]', $e['destinataire']['ville'], 'Ville' );
	echo '<p><label style="display:block;font-weight:600;margin-bottom:3px">Agence de retrait</label><select name="cp[destinataire][agence]" class="widefat"><option value="">—</option>';
	foreach ( (array) cp_r( 'destination.agences', array() ) as $a ) {
		printf( '<option %s>%s</option>', selected( $e['destinataire']['agence'], $a['ville'], false ), esc_html( $a['ville'] ) );
	}
	echo '</select></p></div></div>';
}

function cp_boite_colis( $post ) {
	$e = cp_envoi( $post->ID );
	echo '<p><label style="font-weight:600">Mode d\'envoi</label> <select name="cp[mode]">';
	foreach ( (array) cp_r( 'modes', array() ) as $m ) {
		printf( '<option value="%s" %s>%s — %s / %s</option>', esc_attr( $m['id'] ), selected( $e['mode'], $m['id'], false ), esc_html( $m['nom'] ), esc_html( cp_prix( $m['prix'] ) ), 'm3' === $m['unite'] ? 'm³' : 'kg' );
	}
	echo '</select></p><p><label style="font-weight:600;display:block">Contenu (nature de la marchandise)</label><textarea name="cp[contenu]" class="widefat" rows="2">' . esc_textarea( $e['contenu'] ) . '</textarea></p>';
	echo '<table class="widefat striped" id="cp-colis"><thead><tr><th>Description</th><th>Nombre</th><th>Poids (kg)</th><th>Long. (cm)</th><th>Larg. (cm)</th><th>Haut. (cm)</th></tr></thead><tbody>';
	$lignes = $e['colis'] ? $e['colis'] : array( array() );
	$lignes[] = array();
	foreach ( $lignes as $i => $c ) {
		echo '<tr>';
		foreach ( array( 'description' => 'text', 'nombre' => 'number', 'poids' => 'number', 'longueur' => 'number', 'largeur' => 'number', 'hauteur' => 'number' ) as $k => $t ) {
			printf( '<td><input type="%s" step="any" min="0" name="cp[colis][%d][%s]" value="%s" style="width:100%%"></td>', esc_attr( $t ), (int) $i, esc_attr( $k ), esc_attr( $c[ $k ] ?? '' ) );
		}
		echo '</tr>';
	}
	echo '</tbody></table><p class="description">Une ligne par type de carton. Laissez la dernière ligne vide si inutile ; enregistrez pour ajouter une ligne.</p>';
	cp_champ( 'cp[valeur]', $e['valeur'] ? $e['valeur'] : '', 'Valeur déclarée (' . cp_r( 'entreprise.devise' ) . ')', 'number', 'step="any" min="0"' );
	if ( $e['calcul'] ) {
		$c = $e['calcul'];
		echo '<div style="background:#f6f7f7;padding:10px 14px;border-radius:6px">';
		if ( 'm3' === $c['unite'] ) {
			printf( '<p style="margin:4px 0">Volume : <b>%s m³</b> — facturé : <b>%s m³</b> × %s</p>', esc_html( $c['volume'] ), esc_html( $c['facture'] ), esc_html( cp_prix( $c['prix_unite'] ) ) );
		} else {
			printf( '<p style="margin:4px 0">Poids réel : <b>%s kg</b> — volumétrique : %s kg — facturé : <b>%s kg</b> × %s</p>', esc_html( $c['poids'] ), esc_html( $c['volumetrique'] ), esc_html( $c['facture'] ), esc_html( cp_prix( $c['prix_unite'] ) ) );
		}
		printf( '<p style="margin:4px 0">Transport %s%s%s — <b>Total calculé %s</b></p>', esc_html( cp_prix( $c['transport'] ) ), $c['frais'] ? ' + frais ' . esc_html( cp_prix( $c['frais'] ) ) : '', $c['assurance'] ? ' + assurance ' . esc_html( cp_prix( $c['assurance'] ) ) : '', esc_html( cp_prix( $c['total'] ) ) );
		echo '</div>';
	}
	cp_champ( 'cp[montant_force]', '', 'Montant à facturer, si différent du calcul (laisser vide sinon) — actuel : ' . cp_prix( $e['montant'] ), 'number', 'step="any" min="0"' );
}

function cp_boite_suivi( $post ) {
	$e = cp_envoi( $post->ID );
	echo '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end"><p><label style="display:block;font-weight:600">Nouvelle étape</label><select name="cp_etape"><option value="">— ne pas changer —</option>';
	foreach ( cp_etapes() as $et ) {
		printf( '<option value="%s">%s</option>', esc_attr( $et['id'] ), esc_html( $et['nom'] ) );
	}
	echo '</select></p><p><label style="display:block;font-weight:600">Lieu</label><input name="cp_etape_lieu" placeholder="Guangzhou, Ouagadougou…"></p>';
	echo '<p style="flex:1;min-width:220px"><label style="display:block;font-weight:600">Note pour le client (facultatif)</label><input name="cp_etape_note" class="widefat"></p>';
	echo '<p><label><input type="checkbox" name="cp_etape_prevenir" value="1" checked> Prévenir le client par e-mail</label></p></div>';
	echo '<ol style="margin-top:8px">';
	foreach ( array_reverse( $e['historique'] ) as $h ) {
		$et = cp_etape( $h['etape'] );
		printf( '<li><b>%s</b> — %s%s%s</li>', esc_html( $et ? $et['nom'] : $h['etape'] ), esc_html( wp_date( 'd/m/Y H:i', $h['date'] ) ), $h['lieu'] ? ' — ' . esc_html( $h['lieu'] ) : '', $h['note'] ? '<br><small>' . esc_html( $h['note'] ) . '</small>' : '' );
	}
	echo '</ol>';
}

function cp_boite_paiement( $post ) {
	$e = cp_envoi( $post->ID );
	$p = $e['paiement'];
	printf( '<p style="font-size:15px">À payer : <b>%s</b></p>', esc_html( cp_prix( $e['montant'] ) ) );
	if ( 'paye' === $p['statut'] ) {
		printf( '<p style="color:#0a7d33;font-weight:700">Payé le %s</p><p>%s %s<br>Reçu n° %s</p>', esc_html( wp_date( 'd/m/Y', $p['date'] ) ), esc_html( $p['moyen'] ), esc_html( $p['reference'] ), esc_html( $e['recu'] ) );
		echo '<p><label><input type="checkbox" name="cp_annuler_paiement" value="1"> Annuler le paiement</label></p>';
		return;
	}
	echo '<p style="color:#b26a00;font-weight:600">En attente de paiement</p>';
	echo '<p><select name="cp_paiement_moyen" class="widefat"><option value="">Moyen de paiement…</option><option>Orange Money</option><option>Moov Money</option><option>Wave</option><option>Espèces</option><option>Virement</option><option>Autre</option></select></p>';
	echo '<p><input name="cp_paiement_ref" class="widefat" placeholder="Référence de la transaction"></p>';
	echo '<p><label><input type="checkbox" name="cp_marquer_paye" value="1"> Marquer comme payé et envoyer le reçu</label></p>';
}

function cp_boite_documents( $post ) {
	if ( 'auto-draft' === $post->post_status ) {
		echo '<p>Enregistrez l\'envoi pour obtenir ses documents.</p>';
		return;
	}
	$e = cp_envoi( $post->ID );
	echo '<p><a class="button" target="_blank" href="' . esc_url( cp_lien_pdf( $post->ID, 'fiche' ) ) . '">Fiche d\'expédition (PDF)</a></p>';
	echo '<p><a class="button" target="_blank" href="' . esc_url( cp_lien_pdf( $post->ID, 'etiquettes' ) ) . '">Étiquettes cartons (PDF)</a></p>';
	if ( 'paye' === $e['paiement']['statut'] ) {
		echo '<p><a class="button" target="_blank" href="' . esc_url( cp_lien_pdf( $post->ID, 'recu' ) ) . '">Reçu (PDF)</a></p>';
	}
	echo '<p><label><input type="checkbox" name="cp_renvoyer" value="1"> Renvoyer la fiche au client par e-mail</label></p>';
	if ( $e['client']['telephone'] ) {
		$msg = sprintf( "Bonjour %s, votre envoi %s (%s) : %s. Suivi : %s", $e['client']['nom'], $e['code'], $e['mode_nom'], ( cp_etape( $e['statut'] ) ?: array( 'nom' => '' ) )['nom'], cp_lien_suivi( $e['code'] ) );
		echo '<p><a class="button" target="_blank" href="' . esc_url( cp_whatsapp_lien( $msg, $e['client']['telephone'] ) ) . '">Écrire au client sur WhatsApp</a></p>';
	}
	printf( '<p>Code de suivi : <code style="font-size:14px">%s</code></p>', esc_html( $e['code'] ) );
}

add_action( 'save_post_cp_envoi', function ( $id, $post, $update ) {
	if ( ! isset( $_POST['cp_envoi_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['cp_envoi_nonce'] ) ), 'cp_envoi' ) || ! current_user_can( 'edit_post', $id ) || wp_is_post_revision( $id ) ) {
		return;
	}
	remove_action( 'save_post_cp_envoi', __FUNCTION__ );
	$cp = isset( $_POST['cp'] ) ? wp_unslash( $_POST['cp'] ) : array(); // phpcs:ignore -- assaini ci-dessous
	$nouveau = ! get_post_meta( $id, '_cp_code', true );
	if ( $nouveau ) {
		$code = cp_nouveau_code();
		update_post_meta( $id, '_cp_code', $code );
		update_post_meta( $id, '_cp_cle', wp_generate_password( 20, false ) );
		wp_update_post( array( 'ID' => $id, 'post_title' => $code ) );
	}
	$d = array(
		'client'       => array_map( 'sanitize_text_field', (array) ( $cp['client'] ?? array() ) ),
		'destinataire' => array_map( 'sanitize_text_field', (array) ( $cp['destinataire'] ?? array() ) ),
		'mode'         => sanitize_key( $cp['mode'] ?? 'aerien' ),
		'contenu'      => sanitize_textarea_field( $cp['contenu'] ?? '' ),
		'valeur'       => (float) ( $cp['valeur'] ?? 0 ),
		'colis'        => cp_nettoyer_colis( $cp['colis'] ?? array() ),
	);
	if ( isset( $cp['montant_force'] ) && '' !== $cp['montant_force'] ) {
		$d['montant_force'] = (float) $cp['montant_force'];
	}
	$d['client']['email'] = sanitize_email( $d['client']['email'] ?? '' );
	cp_enregistrer_envoi( $d, $id );
	if ( $nouveau && ! get_post_meta( $id, '_cp_statut', true ) ) {
		cp_changer_etape( $id, 'declare', '', '', false );
	}
	if ( ! empty( $_POST['cp_etape'] ) ) {
		cp_changer_etape( $id, sanitize_key( $_POST['cp_etape'] ), sanitize_text_field( wp_unslash( $_POST['cp_etape_note'] ?? '' ) ), sanitize_text_field( wp_unslash( $_POST['cp_etape_lieu'] ?? '' ) ), ! empty( $_POST['cp_etape_prevenir'] ) );
	}
	if ( ! empty( $_POST['cp_marquer_paye'] ) ) {
		cp_marquer_paye( $id, sanitize_text_field( wp_unslash( $_POST['cp_paiement_moyen'] ?? '' ) ), sanitize_text_field( wp_unslash( $_POST['cp_paiement_ref'] ?? '' ) ) );
	}
	if ( ! empty( $_POST['cp_annuler_paiement'] ) ) {
		update_post_meta( $id, '_cp_paiement', array( 'statut' => 'attente' ) );
	}
	if ( ! empty( $_POST['cp_renvoyer'] ) ) {
		cp_mail_fiche( $id );
	}
}, 10, 3 );

function cp_nettoyer_colis( $lignes ) {
	$out = array();
	foreach ( (array) $lignes as $c ) {
		$l = array(
			'description' => sanitize_text_field( $c['description'] ?? '' ),
			'nombre'      => max( 0, (int) ( $c['nombre'] ?? 1 ) ),
			'poids'       => max( 0, (float) str_replace( ',', '.', (string) ( $c['poids'] ?? 0 ) ) ),
			'longueur'    => max( 0, (float) str_replace( ',', '.', (string) ( $c['longueur'] ?? 0 ) ) ),
			'largeur'     => max( 0, (float) str_replace( ',', '.', (string) ( $c['largeur'] ?? 0 ) ) ),
			'hauteur'     => max( 0, (float) str_replace( ',', '.', (string) ( $c['hauteur'] ?? 0 ) ) ),
		);
		if ( '' === $l['description'] && ! $l['poids'] && ! $l['longueur'] ) {
			continue;
		}
		$l['nombre'] = max( 1, $l['nombre'] );
		$out[] = $l;
	}
	return $out;
}

/* ---------------------------------------------------------------- documents PDF */
function cp_lien_pdf( $id, $type ) {
	$e = cp_envoi( $id );
	return add_query_arg( array( 'cp_pdf' => $type, 'code' => $e['code'], 'cle' => $e['cle'] ), home_url( '/' ) );
}

function cp_lien_suivi( $code ) {
	$page = (int) get_option( 'cp_page_suivi' );
	$url = $page ? get_permalink( $page ) : home_url( '/' );
	return add_query_arg( 'code', $code, $url );
}

// les documents s'ouvrent avec le code et la clé privée de l'envoi (envoyés seulement au client), ou par un administrateur
add_action( 'template_redirect', function () {
	if ( empty( $_GET['cp_pdf'] ) ) {
		return;
	}
	$type = sanitize_key( $_GET['cp_pdf'] );
	$id = cp_envoi_par_code( sanitize_text_field( wp_unslash( $_GET['code'] ?? '' ) ) );
	$e = $id ? cp_envoi( $id ) : null;
	$ok = $e && ( current_user_can( 'edit_post', $id ) || ( ! empty( $_GET['cle'] ) && hash_equals( (string) $e['cle'], sanitize_text_field( wp_unslash( $_GET['cle'] ) ) ) ) );
	if ( ! $ok ) {
		wp_die( 'Document introuvable.', 'Document', array( 'response' => 404 ) );
	}
	$pdf = cp_document( $id, $type );
	if ( ! $pdf ) {
		wp_die( 'Document indisponible.', 'Document', array( 'response' => 404 ) );
	}
	nocache_headers();
	header( 'Content-Type: application/pdf' );
	header( 'Content-Disposition: inline; filename="' . $type . '-' . $e['code'] . '.pdf"' );
	echo $pdf; // phpcs:ignore -- flux PDF
	exit;
} );

/** Octets du document PDF (fiche, etiquettes, recu) ou '' si indisponible. */
function cp_document( $id, $type ) {
	$e = cp_envoi( $id );
	$logo = '';
	$logo_id = (int) cp_r( 'entreprise.logo_id' );
	if ( $logo_id ) {
		$fichier = get_attached_file( $logo_id );
		$logo = $fichier ? CP_PDF::vers_jpeg( $fichier ) : '';
	}
	$r = cp_reglages();
	$e['lien_suivi'] = cp_lien_suivi( $e['code'] );
	$e['etapes'] = cp_etapes();
	if ( 'fiche' === $type ) {
		return cp_pdf_fiche( $e, $r, $logo );
	}
	if ( 'etiquettes' === $type ) {
		return cp_pdf_etiquettes( $e, $r, $logo );
	}
	if ( 'recu' === $type && 'paye' === $e['paiement']['statut'] ) {
		return cp_pdf_recu( $e, $r, $logo );
	}
	return '';
}
