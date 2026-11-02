<?php
/**
 * Boutique — paiement direct par Mobile Money (comme sur Tondraaga) : Orange Money, Moov Money et Wave.
 * Le client suit les étapes (code USSD ou application, numéro et nom du bénéficiaire, montant), puis donne le numéro
 * qui a payé, l'identifiant de la transaction et la capture d'écran. La commande attend la vérification ; quand
 * l'équipe la valide (statut « En cours » ou action « Valider le paiement »), le reçu PDF part par e-mail et les
 * articles à faire venir deviennent un envoi suivi.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Moyens proposés : identifiant WooCommerce => [ clé du numéro dans l'assistant, nom, logo, code USSD, étapes ]. */
function cp_moyens_mobiles() {
	return array(
		'cp_orange' => array( 'orange_money', 'Orange Money', 'orange-money.svg', '*144#', array(
			'Composez <b>*144#</b> ou ouvrez l\'application Orange Money.',
			'Choisissez <b>Transfert d\'argent</b> vers le <b>{numero}</b> ({titulaire}).',
			'Envoyez <b>{montant}</b> et validez avec votre code secret.',
			'Notez l\'<b>ID de la transaction</b> reçu par SMS et faites une capture d\'écran.',
		) ),
		'cp_moov'   => array( 'moov_money', 'Moov Money', 'moov-money.png', '*555#', array(
			'Composez <b>*555#</b> ou ouvrez l\'application Moov Money.',
			'Choisissez <b>Transfert d\'argent</b> vers le <b>{numero}</b> ({titulaire}).',
			'Envoyez <b>{montant}</b> et validez avec votre code secret.',
			'Notez l\'<b>ID de la transaction</b> reçu par SMS et faites une capture d\'écran.',
		) ),
		'cp_wave'   => array( 'wave', 'Wave', 'wave.png', '', array(
			'Ouvrez l\'application <b>Wave</b>.',
			'Envoyez <b>{montant}</b> au <b>{numero}</b> ({titulaire}).',
			'Dans l\'historique, ouvrez le transfert : copiez l\'<b>ID de la transaction</b> et faites une capture d\'écran.',
		) ),
	);
}

add_action( 'plugins_loaded', function () {
	if ( ! class_exists( 'WC_Payment_Gateway' ) || class_exists( 'CP_Passerelle_Mobile' ) ) {
		return;
	}

	class CP_Passerelle_Mobile extends WC_Payment_Gateway {
		public $moyen = array();

		public function __construct( $id = 'cp_orange' ) {
			$this->id = $id;
			$this->moyen = cp_moyens_mobiles()[ $id ];
			$this->method_title = $this->moyen[1] . ' (paiement direct)';
			$this->method_description = 'Le client envoie le montant au numéro indiqué, puis donne le numéro qui a payé, l\'ID de la transaction et la capture d\'écran. La commande reste « En attente » : vérifiez le paiement puis passez-la « En cours » (ou action « Valider le paiement ») : le reçu PDF part automatiquement.';
			$this->icon = CP_URL . 'assets/moyens/' . $this->moyen[2];
			$this->has_fields = true;
			$this->init_form_fields();
			$this->init_settings();
			$this->title = $this->get_option( 'title', $this->moyen[1] );
			$this->enabled = $this->get_option( 'enabled', 'yes' );
			add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
		}

		public function init_form_fields() {
			$this->form_fields = array(
				'enabled'   => array( 'title' => 'Activer', 'type' => 'checkbox', 'label' => 'Proposer ' . $this->moyen[1], 'default' => 'yes' ),
				'title'     => array( 'title' => 'Titre', 'type' => 'text', 'default' => $this->moyen[1] ),
				'numero'    => array( 'title' => 'Numéro qui reçoit les paiements', 'type' => 'text', 'default' => '', 'description' => 'Vide = numéro ' . $this->moyen[1] . ' de l\'assistant Cargo.' ),
				'titulaire' => array( 'title' => 'Nom affiché du titulaire', 'type' => 'text', 'default' => '', 'description' => 'Le nom que le client voit avant de valider le transfert. Vide = nom de l\'entreprise.' ),
				'etapes'    => array( 'title' => 'Étapes', 'type' => 'textarea', 'default' => implode( "\n", $this->moyen[4] ), 'description' => 'Une étape par ligne ; {numero}, {titulaire} et {montant} sont remplacés.', 'css' => 'min-height:120px' ),
				'capture'   => array( 'title' => 'Capture d\'écran', 'type' => 'select', 'default' => 'facultative', 'options' => array( 'facultative' => 'Facultative', 'obligatoire' => 'Obligatoire', 'non' => 'Ne pas demander' ) ),
			);
		}

		public function numero() {
			return trim( (string) ( $this->get_option( 'numero' ) ?: cp_r( 'paiement.' . $this->moyen[0] ) ) );
		}

		public function is_available() {
			return parent::is_available() && '' !== $this->numero();
		}

		/** Valeur postée pour ce moyen (les champs de chaque moyen ont leur propre nom). */
		private function poste( $champ ) {
			$v = $_POST[ 'cp_mm_' . $champ ][ $this->id ] ?? ''; // phpcs:ignore -- vérifié par WooCommerce (nonce du paiement)
			return sanitize_text_field( wp_unslash( (string) $v ) );
		}

		public function payment_fields() {
			$montant = wp_strip_all_tags( wc_price( $this->get_order_total() ) );
			$remplacer = array( '{numero}' => esc_html( $this->numero() ), '{titulaire}' => esc_html( $this->get_option( 'titulaire' ) ?: cp_r( 'entreprise.nom' ) ), '{montant}' => esc_html( $montant ) );
			$id = esc_attr( $this->id );
			echo '<div class="cp-mm" data-cp-mm="' . $id . '">'; // phpcs:ignore
			echo '<p class="cp-mm-montant">Montant à envoyer <b>' . esc_html( $montant ) . '</b></p><ol class="cp-mm-etapes">';
			foreach ( array_filter( array_map( 'trim', explode( "\n", (string) $this->get_option( 'etapes' ) ) ) ) as $l ) {
				echo '<li>' . wp_kses( strtr( $l, $remplacer ), array( 'b' => array(), 'strong' => array(), 'em' => array() ) ) . '</li>';
			}
			echo '</ol><div class="cp-mm-numero"><span>Numéro ' . esc_html( $this->moyen[1] ) . '</span><b>' . esc_html( $this->numero() ) . '</b><button type="button" class="cp-mm-copier" data-copier="' . esc_attr( preg_replace( '/\s+/', '', $this->numero() ) ) . '">Copier</button>';
			if ( $this->moyen[3] ) {
				echo '<a class="cp-mm-ussd" href="tel:' . esc_attr( rawurlencode( $this->moyen[3] ) ) . '">Composer ' . esc_html( $this->moyen[3] ) . '</a>';
			}
			echo '</div>';
			echo '<p class="form-row form-row-wide"><label for="cp_mm_payeur_' . $id . '">Numéro qui a payé <abbr class="required" title="obligatoire">*</abbr></label><input type="tel" class="input-text" id="cp_mm_payeur_' . $id . '" name="cp_mm_payeur[' . $id . ']" autocomplete="tel" placeholder="ex. 70 00 00 00"></p>'; // phpcs:ignore
			echo '<p class="form-row form-row-wide"><label for="cp_mm_transaction_' . $id . '">ID de la transaction <abbr class="required" title="obligatoire">*</abbr></label><input type="text" class="input-text" id="cp_mm_transaction_' . $id . '" name="cp_mm_transaction[' . $id . ']" autocomplete="off" placeholder="Reçu par SMS après le transfert"></p>'; // phpcs:ignore
			if ( 'non' !== $this->get_option( 'capture' ) ) {
				echo '<p class="form-row form-row-wide cp-mm-preuve"><label for="cp_mm_fichier_' . $id . '">Capture d\'écran du paiement' . ( 'obligatoire' === $this->get_option( 'capture' ) ? ' <abbr class="required" title="obligatoire">*</abbr>' : ' <span class="optional">(conseillée)</span>' ) . '</label>'
					. '<input type="file" id="cp_mm_fichier_' . $id . '" accept="image/*" data-cp-preuve="' . $id . '"><input type="hidden" id="cp_mm_preuve_' . $id . '" name="cp_mm_preuve[' . $id . ']" value=""><span class="cp-mm-etat" aria-live="polite"></span></p>'; // phpcs:ignore
			}
			echo '</div>';
		}

		public function validate_fields() {
			$ok = true;
			if ( strlen( preg_replace( '/\D/', '', $this->poste( 'payeur' ) ) ) < 8 ) {
				wc_add_notice( 'Indiquez le numéro qui a effectué le paiement ' . $this->moyen[1] . '.', 'error' );
				$ok = false;
			}
			$tx = $this->poste( 'transaction' );
			if ( strlen( $tx ) < 4 ) {
				wc_add_notice( 'Indiquez l\'ID de la transaction ' . $this->moyen[1] . ' (reçu par SMS).', 'error' );
				$ok = false;
			} elseif ( cp_transaction_deja_utilisee( $this->id, $tx ) ) {
				wc_add_notice( 'Cet ID de transaction a déjà servi pour une autre commande. Vérifiez-le ou écrivez-nous.', 'error' );
				$ok = false;
			}
			if ( 'obligatoire' === $this->get_option( 'capture' ) && ! cp_preuve_en_attente( $this->poste( 'preuve' ) ) ) {
				wc_add_notice( 'Ajoutez la capture d\'écran du paiement.', 'error' );
				$ok = false;
			}
			return $ok;
		}

		public function process_payment( $commande_id ) {
			$o = wc_get_order( $commande_id );
			$tx = $this->poste( 'transaction' );
			$o->update_meta_data( '_cp_mm_payeur', $this->poste( 'payeur' ) );
			$o->update_meta_data( '_cp_mm_transaction', $tx );
			$preuve = cp_preuve_reclamer( $this->poste( 'preuve' ), $commande_id );
			if ( $preuve ) {
				$o->update_meta_data( '_cp_mm_preuve', $preuve );
			}
			$o->set_transaction_id( $tx );
			$o->update_status( 'on-hold', sprintf( 'Paiement %s à vérifier : ID %s, payé depuis le %s%s.', $this->moyen[1], $tx, $this->poste( 'payeur' ), $preuve ? ', capture jointe' : ', sans capture' ) );
			wc_reduce_stock_levels( $commande_id );
			if ( WC()->cart ) {
				WC()->cart->empty_cart();
			}
			return array( 'result' => 'success', 'redirect' => $this->get_return_url( $o ) );
		}
	}

	add_filter( 'woocommerce_payment_gateways', function ( $g ) {
		foreach ( array_keys( cp_moyens_mobiles() ) as $id ) {
			$g[] = new CP_Passerelle_Mobile( $id );
		}
		return $g;
	} );
}, 20 );

/** L'ID de transaction a-t-il déjà servi pour ce moyen (évite qu'une même capture paie deux commandes) ? */
function cp_transaction_deja_utilisee( $moyen, $tx ) {
	if ( ! function_exists( 'wc_get_orders' ) ) {
		return false;
	}
	return (bool) wc_get_orders( array( 'limit' => 1, 'return' => 'ids', 'payment_method' => $moyen, 'status' => array_keys( wc_get_order_statuses() ), 'meta_query' => array( array( 'key' => '_cp_mm_transaction', 'value' => $tx ) ) ) );
}

/* ---------------------------------------------------------------- captures d'écran (preuves de paiement) */
function cp_preuves_dossier() {
	$u = wp_upload_dir();
	$d = trailingslashit( $u['basedir'] ) . 'cargo-preuves';
	if ( ! is_dir( $d . '/attente' ) ) {
		wp_mkdir_p( $d . '/attente' );
		// dossier privé : les captures ne s'ouvrent que par l'administration
		file_put_contents( $d . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n" ); // phpcs:ignore
		file_put_contents( $d . '/index.php', "<?php\n" ); // phpcs:ignore
		file_put_contents( $d . '/attente/index.php', "<?php\n" ); // phpcs:ignore
	}
	return $d;
}

/** Enregistre une image envoyée (réencodée en JPEG, 1600 px max) : renvoie un jeton ou une erreur. */
function cp_preuve_enregistrer( array $f ) {
	if ( ! empty( $f['error'] ) || empty( $f['tmp_name'] ) || ! is_uploaded_file( $f['tmp_name'] ) ) {
		return new WP_Error( 'fichier', 'Le fichier n\'a pas pu être envoyé.' );
	}
	if ( (int) $f['size'] > 8 * MB_IN_BYTES ) {
		return new WP_Error( 'taille', 'Image trop lourde (8 Mo au plus).' );
	}
	$octets = file_get_contents( $f['tmp_name'] ); // phpcs:ignore
	$infos = $octets ? @getimagesizefromstring( $octets ) : false; // phpcs:ignore
	$img = $infos && in_array( $infos[2], array( IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP, IMAGETYPE_GIF ), true ) && $infos[0] * $infos[1] <= 25e6 ? @imagecreatefromstring( $octets ) : false; // phpcs:ignore
	if ( ! $img ) {
		return new WP_Error( 'image', 'Envoyez une image (capture d\'écran JPG ou PNG).' );
	}
	$l = imagesx( $img );
	$h = imagesy( $img );
	$k = min( 1, 1600 / max( $l, $h ) );
	$dest = imagecreatetruecolor( max( 1, (int) round( $l * $k ) ), max( 1, (int) round( $h * $k ) ) );
	imagefill( $dest, 0, 0, imagecolorallocate( $dest, 255, 255, 255 ) );
	imagecopyresampled( $dest, $img, 0, 0, 0, 0, imagesx( $dest ), imagesy( $dest ), $l, $h );
	$jeton = wp_generate_password( 24, false );
	$ok = imagejpeg( $dest, cp_preuves_dossier() . '/attente/' . $jeton . '.jpg', 85 );
	imagedestroy( $img );
	imagedestroy( $dest );
	return $ok ? $jeton : new WP_Error( 'disque', 'Impossible d\'enregistrer l\'image.' );
}

function cp_preuve_en_attente( $jeton ) {
	$jeton = preg_replace( '/[^A-Za-z0-9]/', '', (string) $jeton );
	return 24 === strlen( $jeton ) && is_file( cp_preuves_dossier() . '/attente/' . $jeton . '.jpg' ) ? $jeton : '';
}

/** Rattache une capture en attente à la commande : renvoie le nom du fichier ou ''. */
function cp_preuve_reclamer( $jeton, $commande_id ) {
	$jeton = cp_preuve_en_attente( $jeton );
	if ( ! $jeton ) {
		return '';
	}
	$nom = (int) $commande_id . '-' . wp_generate_password( 12, false ) . '.jpg';
	return rename( cp_preuves_dossier() . '/attente/' . $jeton . '.jpg', cp_preuves_dossier() . '/' . $nom ) ? $nom : '';
}

// envoi de la capture pendant la commande (le formulaire de paiement est envoyé sans fichier par WooCommerce)
add_action( 'rest_api_init', function () {
	register_rest_route( 'cargo/v1', '/preuve', array(
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'callback'            => function ( WP_REST_Request $q ) {
			if ( ! wp_verify_nonce( (string) $q->get_header( 'X-WP-Nonce' ), 'wp_rest' ) ) {
				return new WP_Error( 'session', 'La page a expiré : rechargez-la.', array( 'status' => 403 ) );
			}
			$cle = 'cp_preuve_' . md5( sanitize_text_field( $_SERVER['REMOTE_ADDR'] ?? '' ) );
			$n = (int) get_transient( $cle );
			if ( $n >= 15 ) {
				return new WP_Error( 'trop', 'Trop d\'envois : réessayez dans une heure.', array( 'status' => 429 ) );
			}
			set_transient( $cle, $n + 1, HOUR_IN_SECONDS );
			$r = cp_preuve_enregistrer( (array) ( $q->get_file_params()['preuve'] ?? array() ) );
			return is_wp_error( $r ) ? new WP_Error( $r->get_error_code(), $r->get_error_message(), array( 'status' => 400 ) ) : array( 'jeton' => $r );
		},
	) );
} );

// captures jamais rattachées : effacées après un jour
add_action( 'cp_nettoyer_preuves', function () {
	foreach ( (array) glob( cp_preuves_dossier() . '/attente/*.jpg' ) as $f ) {
		if ( $f && filemtime( $f ) < time() - DAY_IN_SECONDS ) {
			@unlink( $f ); // phpcs:ignore
		}
	}
} );
add_action( 'init', function () {
	if ( function_exists( 'wp_next_scheduled' ) && ! wp_next_scheduled( 'cp_nettoyer_preuves' ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'cp_nettoyer_preuves' );
	}
} );

// script de la page de paiement : copier le numéro, envoyer la capture
add_action( 'wp_enqueue_scripts', function () {
	if ( ! function_exists( 'is_checkout' ) || ! is_checkout() ) {
		return;
	}
	wp_enqueue_script( 'cargo-paiement', CP_URL . 'assets/paiement.js', array(), CP_VERSION, true );
	wp_localize_script( 'cargo-paiement', 'CARGO_PAIEMENT', array( 'api' => esc_url_raw( rest_url( 'cargo/v1/preuve' ) ), 'nonce' => wp_create_nonce( 'wp_rest' ) ) );
} );

/* ---------------------------------------------------------------- après la commande */
add_action( 'woocommerce_thankyou', function ( $commande_id ) {
	$o = wc_get_order( $commande_id );
	if ( ! $o || ! isset( cp_moyens_mobiles()[ $o->get_payment_method() ] ) ) {
		return;
	}
	if ( $o->has_status( 'on-hold' ) ) {
		echo '<div class="cp-mm-merci"><b>Merci ! Votre paiement ' . esc_html( cp_moyens_mobiles()[ $o->get_payment_method() ][1] ) . ' est en cours de vérification.</b> Dès qu\'il est confirmé, vous recevez votre reçu par e-mail' . ( cp_commande_a_faire_venir( $o ) ? ' avec le code de suivi de votre commande' : '' ) . '.</div>';
		if ( ! $o->get_meta( '_cp_mm_preuve' ) ) {
			echo '<form class="cp-mm-merci-preuve" method="post" enctype="multipart/form-data"><p><b>Ajoutez la capture d\'écran du paiement</b> pour une vérification plus rapide.</p>'
				. '<input type="file" name="cp_preuve" accept="image/*" required> <button class="button" type="submit">Envoyer la capture</button>'
				. '<input type="hidden" name="cp_preuve_commande" value="' . (int) $o->get_id() . '"><input type="hidden" name="cp_cle" value="' . esc_attr( $o->get_order_key() ) . '">'
				. wp_nonce_field( 'cp_preuve_' . $o->get_id(), '_cp_nonce', true, false ) . '</form>';
		}
	}
	cp_commande_liens( $o );
}, 5 );

add_action( 'template_redirect', function () {
	if ( empty( $_POST['cp_preuve_commande'] ) ) { // phpcs:ignore
		return;
	}
	$id = absint( $_POST['cp_preuve_commande'] ); // phpcs:ignore
	$o = wc_get_order( $id );
	if ( ! $o || ! hash_equals( $o->get_order_key(), sanitize_text_field( wp_unslash( $_POST['cp_cle'] ?? '' ) ) ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_cp_nonce'] ?? '' ) ), 'cp_preuve_' . $id ) ) { // phpcs:ignore
		wp_die( 'Lien invalide.', 'Paiement', array( 'response' => 403 ) );
	}
	if ( ! $o->get_meta( '_cp_mm_preuve' ) && ! empty( $_FILES['cp_preuve'] ) ) {
		$jeton = cp_preuve_enregistrer( $_FILES['cp_preuve'] ); // phpcs:ignore -- contrôlé et réencodé
		$nom = is_wp_error( $jeton ) ? '' : cp_preuve_reclamer( $jeton, $id );
		if ( $nom ) {
			$o->update_meta_data( '_cp_mm_preuve', $nom );
			$o->add_order_note( 'Capture d\'écran du paiement ajoutée par le client.' );
			$o->save();
		}
	}
	wp_safe_redirect( $o->get_checkout_order_received_url() );
	exit;
} );

/** La commande contient-elle des articles à faire venir (transport cargo) ? */
function cp_commande_a_faire_venir( $o ) {
	foreach ( $o->get_items( 'shipping' ) as $s ) {
		if ( 'cp_cargo' === $s->get_method_id() && $s->get_meta( 'cp_mode' ) ) {
			return true;
		}
	}
	return false;
}

/** Reçu et suivi dans le détail de la commande (page de remerciement, compte client). */
function cp_commande_liens( $o ) {
	$h = '';
	if ( $o->get_meta( '_cp_recu_num' ) ) {
		$h .= '<a class="button" href="' . esc_url( cp_lien_recu_commande( $o ) ) . '" target="_blank">Télécharger le reçu ' . esc_html( $o->get_meta( '_cp_recu_num' ) ) . '</a> ';
	}
	$envoi = (int) $o->get_meta( '_cp_envoi' );
	if ( $envoi ) {
		$code = cp_envoi( $envoi )['code'];
		$h .= '<a class="button" href="' . esc_url( cp_lien_suivi( $code ) ) . '">Suivre ma commande : ' . esc_html( $code ) . '</a>';
	}
	if ( $h ) {
		echo '<p class="cp-commande-liens">' . $h . '</p>'; // phpcs:ignore -- échappé ci-dessus
	}
}
add_action( 'woocommerce_order_details_after_order_table', function ( $o ) {
	if ( ! is_wc_endpoint_url( 'order-received' ) ) {
		cp_commande_liens( $o );
	}
} );

/* ---------------------------------------------------------------- administration de la commande */
add_action( 'woocommerce_admin_order_data_after_billing_address', function ( $o ) {
	if ( ! $o->get_meta( '_cp_mm_transaction' ) ) {
		return;
	}
	echo '<div class="cp-mm-admin" style="background:#F3F6FB;border-left:4px solid #0146AF;padding:10px 12px;margin-top:10px"><p style="margin:0 0 4px"><strong>Paiement ' . esc_html( $o->get_payment_method_title() ) . '</strong></p>'
		. '<p style="margin:0">Payé depuis le <b>' . esc_html( $o->get_meta( '_cp_mm_payeur' ) ) . '</b><br>ID de transaction : <b>' . esc_html( $o->get_meta( '_cp_mm_transaction' ) ) . '</b></p>';
	if ( $o->get_meta( '_cp_mm_preuve' ) ) {
		$url = wp_nonce_url( admin_url( 'admin-post.php?action=cp_voir_preuve&commande=' . $o->get_id() ), 'cp_voir_preuve_' . $o->get_id() );
		echo '<p style="margin:8px 0 0"><a href="' . esc_url( $url ) . '" target="_blank"><img src="' . esc_url( $url ) . '" alt="Capture du paiement" style="max-width:100%;max-height:220px;border:1px solid #ddd;border-radius:6px"></a></p>';
	} else {
		echo '<p style="margin:6px 0 0;color:#B45309">Pas de capture d\'écran.</p>';
	}
	if ( $o->has_status( 'on-hold' ) ) {
		echo '<p style="margin:8px 0 0">Après vérification sur votre téléphone : passez la commande « En cours » (ou action « Valider le paiement ») : le reçu PDF part au client.</p>';
	}
	echo '</div>';
} );

add_action( 'admin_post_cp_voir_preuve', function () {
	$id = absint( $_GET['commande'] ?? 0 ); // phpcs:ignore
	check_admin_referer( 'cp_voir_preuve_' . $id );
	$o = wc_get_order( $id );
	if ( ! $o || ! current_user_can( 'edit_shop_orders' ) ) {
		wp_die( 'Accès refusé.', '', array( 'response' => 403 ) );
	}
	$f = cp_preuves_dossier() . '/' . basename( (string) $o->get_meta( '_cp_mm_preuve' ) );
	if ( ! is_file( $f ) ) {
		wp_die( 'Capture introuvable.', '', array( 'response' => 404 ) );
	}
	nocache_headers();
	header( 'Content-Type: image/jpeg' );
	readfile( $f ); // phpcs:ignore
	exit;
} );

add_filter( 'woocommerce_order_actions', function ( $actions, $o = null ) {
	if ( $o && $o->has_status( array( 'on-hold', 'pending' ) ) ) {
		$actions['cp_valider_paiement'] = 'Valider le paiement (envoie le reçu)';
	}
	return $actions;
}, 10, 2 );
add_action( 'woocommerce_order_action_cp_valider_paiement', function ( $o ) {
	$o->payment_complete( $o->get_transaction_id() );
} );

// paiement confirmé (commande passée « En cours » ou « Terminée ») : reçu, et envoi suivi pour les articles à faire venir
add_action( 'woocommerce_order_status_changed', function ( $id, $avant, $apres, $o ) {
	if ( ! in_array( $apres, array( 'processing', 'completed' ), true ) ) {
		return;
	}
	if ( isset( cp_moyens_mobiles()[ $o->get_payment_method() ] ) ) {
		cp_commande_payee( $o );
	} else {
		cp_envoi_depuis_commande( $o );
	}
}, 10, 4 );

/** Numéro de reçu, envoi suivi et e-mail du reçu (une seule fois par commande). */
function cp_commande_payee( $o ) {
	if ( $o->get_meta( '_cp_recu_num' ) ) {
		return;
	}
	$n = (int) get_option( 'cp_recu_suivant', 1 );
	update_option( 'cp_recu_suivant', $n + 1 );
	$o->update_meta_data( '_cp_recu_num', 'R' . gmdate( 'Y' ) . '-' . str_pad( (string) $n, 5, '0', STR_PAD_LEFT ) );
	$o->save();
	$envoi = cp_envoi_depuis_commande( $o );
	cp_mail_recu_commande( $o, $envoi );
}

/** Données du reçu PDF d'une commande (même gabarit que le reçu des envois). */
function cp_recu_commande_donnees( $o ) {
	$lignes = array();
	$articles = array_values( $o->get_items() );
	foreach ( array_slice( $articles, 0, 8 ) as $it ) {
		$q = max( 1, (int) $it->get_quantity() );
		$tot = (float) $it->get_total();
		$p = $it->get_product();
		$lignes[] = array( mb_strimwidth( $it->get_name(), 0, 56, '…' ), $q . ( $p && 'yes' === $p->get_meta( '_cp_location' ) ? ' j' : '' ), $tot / $q, $tot );
	}
	if ( count( $articles ) > 8 ) {
		$reste = array_slice( $articles, 8 );
		$lignes[] = array( 'Autres articles (' . count( $reste ) . ')', '', '', array_sum( array_map( function ( $it ) { return (float) $it->get_total(); }, $reste ) ) );
	}
	foreach ( $o->get_items( 'shipping' ) as $s ) {
		if ( (float) $s->get_total() > 0 ) {
			$lignes[] = array( 'Transport — ' . mb_strimwidth( $s->get_name(), 0, 48, '…' ), '', '', (float) $s->get_total() );
		}
	}
	foreach ( $o->get_fees() as $f ) {
		$lignes[] = array( $f->get_name(), '', '', (float) $f->get_total() );
	}
	if ( (float) $o->get_total_tax() ) {
		$lignes[] = array( 'Taxes', '', '', (float) $o->get_total_tax() );
	}
	$envoi = (int) $o->get_meta( '_cp_envoi' );
	$code = $envoi ? cp_envoi( $envoi )['code'] : '';
	$livraison = array();
	foreach ( $o->get_items( 'shipping' ) as $s ) {
		$livraison[] = preg_replace( '/\s*\(.*$/u', '', $s->get_name() );
	}
	$paye = $o->get_date_paid() ? $o->get_date_paid()->getTimestamp() : time();
	$moyen = cp_moyens_mobiles()[ $o->get_payment_method() ][1] ?? $o->get_payment_method_title();
	return array(
		'recu' => $o->get_meta( '_cp_recu_num' ), 'code' => $code, 'colis' => array(), 'calcul' => array(), 'mode_nom' => '', 'contenu' => '',
		'montant' => (float) $o->get_total(),
		'client' => array( 'nom' => trim( $o->get_billing_first_name() . ' ' . $o->get_billing_last_name() ), 'telephone' => $o->get_billing_phone(), 'email' => $o->get_billing_email(), 'ville' => trim( $o->get_billing_city() . ', ' . cp_nom_pays( $o->get_billing_country() ), ', ' ) ),
		'paiement' => array( 'statut' => 'paye', 'moyen' => $moyen, 'reference' => $o->get_transaction_id(), 'date' => $paye, 'montant' => (float) $o->get_total() ),
		'objet' => array( 'Commande concernée', array(
			array( 'N° de commande', $o->get_order_number() ),
			array( 'Date', $o->get_date_created() ? $o->get_date_created()->date( 'd/m/Y' ) : '' ),
			array( 'Livraison', implode( ', ', $livraison ) ),
			array( 'N° de suivi', $code ),
		) ),
		'lignes' => $lignes,
		'mention' => $code ? 'Conservez ce reçu. Suivez votre commande avec le code ' . $code . '.' : 'Conservez ce reçu : il vous sera demandé au retrait.',
		'lien_suivi' => $code ? cp_lien_suivi( $code ) : '',
	);
}

function cp_pdf_recu_commande( $o ) {
	if ( ! $o->get_meta( '_cp_recu_num' ) ) {
		return '';
	}
	list( $logo, $banniere ) = cp_doc_images();
	return cp_pdf_recu( cp_recu_commande_donnees( $o ), cp_reglages(), $logo, $banniere );
}

function cp_lien_recu_commande( $o ) {
	return add_query_arg( array( 'cp_recu_commande' => $o->get_id(), 'cle' => $o->get_order_key() ), home_url( '/' ) );
}

add_action( 'template_redirect', function () {
	if ( empty( $_GET['cp_recu_commande'] ) || ! function_exists( 'wc_get_order' ) ) {
		return;
	}
	$o = wc_get_order( absint( $_GET['cp_recu_commande'] ) );
	$ok = $o && ( current_user_can( 'edit_shop_orders' ) || hash_equals( $o->get_order_key(), sanitize_text_field( wp_unslash( $_GET['cle'] ?? '' ) ) ) );
	$pdf = $ok ? cp_pdf_recu_commande( $o ) : '';
	if ( ! $pdf ) {
		wp_die( 'Reçu introuvable.', 'Reçu', array( 'response' => 404 ) );
	}
	nocache_headers();
	header( 'Content-Type: application/pdf' );
	header( 'Content-Disposition: inline; filename="recu-' . $o->get_meta( '_cp_recu_num' ) . '.pdf"' );
	echo $pdf; // phpcs:ignore -- flux PDF
	exit;
} );

function cp_mail_recu_commande( $o, $envoi = 0 ) {
	$code = $envoi ? cp_envoi( $envoi )['code'] : '';
	$pesee = false;
	foreach ( $o->get_items( 'shipping' ) as $s ) {
		$pesee = $pesee || 'oui' === $s->get_meta( 'cp_pesee' );
	}
	$blocs = '<p>Bonjour ' . esc_html( $o->get_billing_first_name() ) . ',</p><p>Nous avons bien reçu votre paiement de <b>' . esc_html( cp_prix( $o->get_total() ) ) . '</b> pour la commande <b>n° ' . esc_html( $o->get_order_number() ) . '</b>. Votre reçu est en pièce jointe.</p>';
	if ( $code ) {
		$blocs .= '<p style="background:#F3F6FB;border-radius:8px;padding:12px 16px">Votre commande est suivie avec le code <b style="font-size:17px;letter-spacing:.04em">' . esc_html( $code ) . '</b> : vous recevrez un e-mail à chaque étape, jusqu\'à la remise ' . esc_html( cp_au_pays( cp_r( 'destination.pays' ) ) ) . '.</p>';
	}
	if ( $pesee ) {
		$blocs .= '<p>Le transport sera calculé à la pesée, à notre entrepôt : nous vous enverrons le montant à payer.</p>';
	}
	if ( ! $code ) {
		$blocs .= '<p>Nous vous prévenons dès que votre commande est prête.</p>';
	}
	$bouton = $code ? array( 'Suivre ma commande', cp_lien_suivi( $code ) ) : array( 'Voir ma commande', $o->get_view_order_url() );
	cp_mail_envoyer( $o->get_billing_email(), 'Reçu ' . $o->get_meta( '_cp_recu_num' ) . ' — commande n° ' . $o->get_order_number(), cp_mail_gabarit( 'Paiement reçu, merci !', $blocs, $bouton ), array( 'recu-' . $o->get_meta( '_cp_recu_num' ) . '.pdf' => cp_pdf_recu_commande( $o ) ) );
}

// e-mail « Nouvelle commande » de l'administrateur : de quoi vérifier le paiement
add_action( 'woocommerce_email_after_order_table', function ( $o, $admin ) {
	if ( $admin && $o->get_meta( '_cp_mm_transaction' ) ) {
		echo '<p style="background:#FEF3C7;padding:10px 14px;border-radius:6px"><b>À vérifier :</b> ' . esc_html( $o->get_payment_method_title() ) . ' — ID ' . esc_html( $o->get_meta( '_cp_mm_transaction' ) ) . ', payé depuis le ' . esc_html( $o->get_meta( '_cp_mm_payeur' ) ) . ( $o->get_meta( '_cp_mm_preuve' ) ? ' (capture jointe à la commande)' : '' ) . '.</p>';
	}
}, 10, 2 );

function cp_nom_pays( $code ) {
	return function_exists( 'WC' ) && WC()->countries ? ( WC()->countries->countries[ $code ] ?? $code ) : $code;
}
