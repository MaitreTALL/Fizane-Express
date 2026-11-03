<?php
/**
 * E-mails automatiques aux couleurs de l'entreprise, avec les PDF en pièces jointes :
 * envoi déclaré (fiche + étiquettes), chaque étape de suivi, colis reçus à l'entrepôt (montant à payer), reçu de paiement.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// e-mails du site signés du nom de l'entreprise (et non « WordPress »)
add_filter( 'wp_mail_from_name', function ( $nom ) {
	return 'WordPress' === $nom && cp_r( 'entreprise.nom' ) ? cp_r( 'entreprise.nom' ) : $nom;
} );

/** Gabarit HTML commun. $blocs : HTML du corps (déjà échappé). */
function cp_mail_gabarit( $titre, $blocs, $bouton = null ) {
	$prim = esc_attr( cp_r( 'couleurs.primaire' ) );
	$logo = cp_logo_url( 'medium' );
	$nom = esc_html( cp_r( 'entreprise.nom' ) );
	$html = '<!doctype html><html><body style="margin:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;color:#111827">'
		. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:24px 0"><tr><td align="center">'
		. '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden">'
		. '<tr><td style="background:' . $prim . ';padding:18px 24px">'
		. ( $logo ? '<img src="' . esc_url( $logo ) . '" alt="' . $nom . '" style="height:54px;background:#fff;border-radius:8px;padding:4px;vertical-align:middle"> ' : '' )
		. '<span style="color:#fff;font-size:20px;font-weight:bold;vertical-align:middle;margin-left:10px">' . $nom . '</span></td></tr>'
		. '<tr><td style="padding:26px 28px"><h1 style="font-size:21px;margin:0 0 14px;color:' . $prim . '">' . esc_html( $titre ) . '</h1>' . $blocs;
	if ( $bouton ) {
		$html .= '<p style="margin:24px 0 6px"><a href="' . esc_url( $bouton[1] ) . '" style="display:inline-block;background:' . $prim . ';color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">' . esc_html( $bouton[0] ) . '</a></p>';
	}
	$wa = cp_whatsapp_lien( 'Bonjour ' . cp_r( 'entreprise.nom' ) );
	$html .= '</td></tr><tr><td style="background:#F9FAFB;padding:16px 28px;font-size:12px;color:#6B7280">'
		. esc_html( cp_r( 'entreprise.nom' ) ) . ' · ' . esc_html( implode( ' · ', array_filter( array( cp_r( 'entreprise.telephone' ), cp_r( 'entreprise.telephone_chine' ), cp_r( 'entreprise.email' ) ) ) ) )
		. ( $wa ? ' · <a href="' . esc_url( $wa ) . '" style="color:' . $prim . '">WhatsApp</a>' : '' )
		. '</td></tr></table></td></tr></table></body></html>';
	return $html;
}

function cp_mail_envoyer( $a, $sujet, $html, $pieces = array() ) {
	if ( ! $a || ! is_email( $a ) ) {
		return false;
	}
	$fichiers = array();
	foreach ( $pieces as $nom => $octets ) {
		if ( ! $octets ) {
			continue;
		}
		$dossier = trailingslashit( get_temp_dir() ) . 'cp-' . wp_generate_password( 8, false );
		wp_mkdir_p( $dossier );
		$f = $dossier . '/' . sanitize_file_name( $nom );
		file_put_contents( $f, $octets ); // phpcs:ignore
		$fichiers[] = $f;
	}
	$entetes = array( 'Content-Type: text/html; charset=UTF-8' );
	$de = cp_r( 'entreprise.email' );
	if ( $de && is_email( $de ) ) {
		$entetes[] = 'Reply-To: ' . cp_r( 'entreprise.nom' ) . ' <' . $de . '>';
	}
	$ok = wp_mail( $a, $sujet, $html, $entetes, $fichiers );
	foreach ( $fichiers as $f ) {
		@unlink( $f ); // phpcs:ignore
		@rmdir( dirname( $f ) ); // phpcs:ignore
	}
	return $ok;
}

function cp_mail_resume( array $e ) {
	$lignes = array(
		'Code d\'envoi' => '<b style="font-size:17px;letter-spacing:.04em">' . esc_html( $e['code'] ) . '</b>',
		'Mode'          => esc_html( $e['mode_nom'] ),
	);
	if ( $e['calcul'] ) {
		$k = $e['calcul'];
		$lignes[ 'm3' === $k['unite'] ? 'Volume facturé' : 'Poids facturé' ] = esc_html( 'm3' === $k['unite'] ? number_format_i18n( $k['facture'], 2 ) . ' m³' : number_format_i18n( $k['facture'], 1 ) . ' kg' );
	}
	if ( $e['montant'] ) {
		$lignes['Montant'] = '<b>' . esc_html( cp_prix( $e['montant'] ) ) . '</b>' . ( ! empty( $e['calcul']['total_alt'] ) ? '<br><span style="color:#6B7280">' . esc_html( ( $e['calcul']['prix_alt_libelle'] ?: 'Autre tarif' ) . ' : ' . cp_prix( $e['calcul']['total_alt'] ) ) . '</span>' : '' );
	}
	$m = cp_mode( $e['mode'] );
	if ( $m ) {
		$lignes['Délai estimé'] = esc_html( $m['delai_min'] . ' à ' . $m['delai_max'] . ' jours' );
	}
	$h = '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:8px 0 14px">';
	foreach ( $lignes as $k => $v ) {
		$h .= '<tr><td style="padding:7px 0;border-bottom:1px solid #E5E7EB;color:#6B7280;width:40%">' . esc_html( $k ) . '</td><td style="padding:7px 0;border-bottom:1px solid #E5E7EB">' . $v . '</td></tr>';
	}
	return $h . '</table>';
}

function cp_mail_entrepot( array $e ) {
	$ent = cp_entrepot( $e['mode'] );
	return '<div style="background:#F3F6FB;border-left:4px solid ' . esc_attr( cp_r( 'couleurs.primaire' ) ) . ';padding:12px 16px;margin:12px 0;border-radius:6px">'
		. '<b>Adresse de notre entrepôt en ' . esc_html( cp_r( 'origine.pays' ) ) . ' (' . esc_html( $e['mode_nom'] ) . ')</b><br>'
		. nl2br( esc_html( $ent['texte'] ) )
		. ( cp_r( 'origine.contact' ) ? '<br>Contact : ' . esc_html( cp_r( 'origine.contact' ) ) : '' )
		. '<br><br><b style="color:' . esc_attr( cp_r( 'couleurs.primaire' ) ) . '">' . esc_html( cp_r( 'consigne_colis' ) ) . '</b> Votre code : <b>' . esc_html( $e['code'] ) . '</b></div>';
}

function cp_mail_paiement() {
	$h = '';
	foreach ( array( 'orange_money' => 'Orange Money', 'moov_money' => 'Moov Money', 'wave' => 'Wave' ) as $cle => $nom ) {
		$num = cp_r( 'paiement.' . $cle );
		if ( $num ) {
			$h .= '<li><b>' . esc_html( $nom ) . '</b> : ' . esc_html( $num ) . '</li>';
		}
	}
	if ( cp_r( 'paiement.autres' ) ) {
		$h .= '<li>' . esc_html( cp_r( 'paiement.autres' ) ) . '</li>';
	}
	return $h ? '<p style="margin:14px 0 4px"><b>Pour payer</b></p><ul style="margin:0 0 6px;padding-left:20px">' . $h . '</ul><p style="color:#374151">' . esc_html( cp_r( 'paiement.consignes' ) ) . '</p>' : '';
}

/** Envoi déclaré : fiche d'expédition et étiquettes au client, alerte à l'entreprise. */
function cp_mail_declaration( $id ) {
	$e = cp_envoi( $id );
	$blocs = '<p>Bonjour ' . esc_html( $e['client']['nom'] ) . ',</p><p>Votre envoi est enregistré. Voici votre <b>code d\'envoi</b> : écrivez-le sur chaque carton avec le mode d\'envoi.</p>'
		. cp_mail_resume( $e ) . cp_mail_entrepot( $e )
		. '<p>Vous trouverez en pièces jointes votre fiche d\'expédition et les étiquettes à imprimer et coller sur vos cartons. Dès que vos colis arrivent à l\'entrepôt, nous les pesons et vous envoyons le montant exact.</p>';
	cp_mail_envoyer( $e['client']['email'], cp_r( 'entreprise.nom' ) . ' — envoi ' . $e['code'] . ' enregistré', cp_mail_gabarit( 'Envoi ' . $e['code'] . ' enregistré', $blocs, array( 'Suivre mon envoi', cp_lien_suivi( $e['code'] ) ) ),
		array( 'fiche-' . $e['code'] . '.pdf' => cp_document( $id, 'fiche' ), 'etiquettes-' . $e['code'] . '.pdf' => cp_document( $id, 'etiquettes' ) ) );
	$admin = cp_r( 'entreprise.email' );
	if ( $admin ) {
		$lien = admin_url( 'post.php?post=' . $id . '&action=edit' );
		cp_mail_envoyer( $admin, 'Nouvel envoi ' . $e['code'] . ' — ' . $e['client']['nom'], cp_mail_gabarit( 'Nouvel envoi déclaré', '<p>' . esc_html( $e['client']['nom'] . ' (' . $e['client']['telephone'] . ')' ) . ' a déclaré un envoi.</p>' . cp_mail_resume( $e ) . '<p>Contenu : ' . esc_html( $e['contenu'] ) . '</p>', array( 'Ouvrir l\'envoi', $lien ) ) );
	}
}

/** Nouvelle étape de suivi. À la réception en Chine : montant exact, consignes de paiement et fiche à jour. */
function cp_mail_etape( $id, $etape, $note = '' ) {
	$e = cp_envoi( $id );
	$et = cp_etape( $etape );
	if ( ! $et || ! $e['client']['email'] ) {
		return;
	}
	$blocs = '<p>Bonjour ' . esc_html( $e['client']['nom'] ) . ',</p><p style="font-size:16px"><b>' . esc_html( $et['nom'] ) . '</b> — ' . esc_html( $et['texte'] ?? '' ) . '</p>'
		. ( $note ? '<p style="background:#FEF3C7;padding:10px 14px;border-radius:6px">' . esc_html( $note ) . '</p>' : '' ) . cp_mail_resume( $e );
	$pieces = array();
	if ( 'recu' === $etape ) {
		if ( 'paye' !== $e['paiement']['statut'] ) {
			$blocs .= cp_mail_paiement();
		}
		$pieces[ 'fiche-' . $e['code'] . '.pdf' ] = cp_document( $id, 'fiche' );
	}
	if ( 'disponible' === $etape ) {
		$agence = $e['destinataire']['agence'];
		foreach ( (array) cp_r( 'destination.agences', array() ) as $a ) {
			if ( $a['ville'] === $agence && ( $a['adresse'] || $a['telephone'] ) ) {
				$blocs .= '<p><b>Agence de ' . esc_html( $a['ville'] ) . '</b><br>' . nl2br( esc_html( $a['adresse'] ) ) . ( $a['telephone'] ? '<br>' . esc_html( $a['telephone'] ) : '' ) . '</p>';
			}
		}
		$blocs .= '<p>Présentez votre code d\'envoi (et votre reçu) au retrait.</p>';
	}
	cp_mail_envoyer( $e['client']['email'], $e['code'] . ' — ' . $et['nom'], cp_mail_gabarit( $et['nom'], $blocs, array( 'Suivre mon envoi', cp_lien_suivi( $e['code'] ) ) ), $pieces );
}

function cp_mail_recu( $id ) {
	$e = cp_envoi( $id );
	$blocs = '<p>Bonjour ' . esc_html( $e['client']['nom'] ) . ',</p><p>Nous avons bien reçu votre paiement de <b>' . esc_html( cp_prix( $e['paiement']['montant'] ? $e['paiement']['montant'] : $e['montant'] ) ) . '</b> pour l\'envoi <b>' . esc_html( $e['code'] ) . '</b>. Votre reçu est en pièce jointe : conservez-le, il vous sera demandé au retrait.</p>' . cp_mail_resume( $e );
	cp_mail_envoyer( $e['client']['email'], 'Reçu ' . $e['recu'] . ' — envoi ' . $e['code'], cp_mail_gabarit( 'Paiement reçu, merci !', $blocs, array( 'Suivre mon envoi', cp_lien_suivi( $e['code'] ) ) ), array( 'recu-' . $e['recu'] . '.pdf' => cp_document( $id, 'recu' ) ) );
}

function cp_mail_fiche( $id ) {
	$e = cp_envoi( $id );
	$blocs = '<p>Bonjour ' . esc_html( $e['client']['nom'] ) . ',</p><p>Voici la fiche d\'expédition à jour de votre envoi.</p>' . cp_mail_resume( $e ) . cp_mail_entrepot( $e );
	cp_mail_envoyer( $e['client']['email'], 'Fiche d\'expédition ' . $e['code'], cp_mail_gabarit( 'Fiche d\'expédition ' . $e['code'], $blocs, array( 'Suivre mon envoi', cp_lien_suivi( $e['code'] ) ) ),
		array( 'fiche-' . $e['code'] . '.pdf' => cp_document( $id, 'fiche' ), 'etiquettes-' . $e['code'] . '.pdf' => cp_document( $id, 'etiquettes' ) ) );
}
