<?php
/**
 * Assistant de configuration (Cargo → Assistant) : le client remplit ses informations et son site est prêt.
 * Onglets : entreprise, couleurs, trajet, tarifs & délais, paiement, documents & services, étapes de suivi, import / export.
 * Les adresses écrites en chinois sont transformées en image par le navigateur (pour les PDF).
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'admin_menu', function () {
	add_submenu_page( 'edit.php?post_type=cp_envoi', 'Assistant de configuration', 'Assistant', 'manage_options', 'cp-assistant', 'cp_page_assistant', 0 );
} );

add_action( 'admin_notices', function () {
	if ( get_option( 'cp_assistant_a_faire' ) && current_user_can( 'manage_options' ) && ( $_GET['page'] ?? '' ) !== 'cp-assistant' ) { // phpcs:ignore
		echo '<div class="notice notice-info"><p><b>Cargo Plateforme</b> : complétez l\'assistant (logo, tarifs, paiements) pour mettre votre site en ligne. <a class="button button-primary" href="' . esc_url( admin_url( 'edit.php?post_type=cp_envoi&page=cp-assistant' ) ) . '">Ouvrir l\'assistant</a></p></div>';
	}
} );

function cp_page_assistant() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	wp_enqueue_media();
	$r = cp_reglages();
	$onglets = array( 'entreprise' => '1. Entreprise', 'couleurs' => '2. Couleurs', 'trajet' => '3. Trajet', 'tarifs' => '4. Tarifs & délais', 'paiement' => '5. Paiement', 'documents' => '6. Documents & services', 'etapes' => '7. Étapes de suivi', 'import' => 'Import / export' );
	$n = function ( $chemin ) {
		$p = explode( '.', $chemin );
		return 'cp[' . implode( '][', $p ) . ']';
	};
	$champ = function ( $chemin, $libelle, $type = 'text', $aide = '' ) use ( $n ) {
		$v = cp_r( $chemin );
		echo '<tr><th><label>' . esc_html( $libelle ) . '</label></th><td>';
		if ( 'textarea' === $type ) {
			echo '<textarea name="' . esc_attr( $n( $chemin ) ) . '" rows="3" class="large-text" data-chemin="' . esc_attr( $chemin ) . '">' . esc_textarea( $v ) . '</textarea>';
		} else {
			echo '<input type="' . esc_attr( $type ) . '" name="' . esc_attr( $n( $chemin ) ) . '" value="' . esc_attr( $v ) . '" class="' . ( 'color' === $type ? '' : 'regular-text' ) . '">';
		}
		if ( $aide ) {
			echo '<p class="description">' . esc_html( $aide ) . '</p>';
		}
		echo '</td></tr>';
	};
	$image = function ( $chemin, $libelle, $aide = '' ) use ( $n ) {
		$id = (int) cp_r( $chemin );
		$url = $id ? wp_get_attachment_image_url( $id, 'medium' ) : '';
		echo '<tr><th>' . esc_html( $libelle ) . '</th><td><div class="cp-media"><img src="' . esc_url( $url ) . '" style="max-height:110px;max-width:360px;display:' . ( $url ? 'block' : 'none' ) . ';margin-bottom:8px;background:#fff;border:1px solid #ddd;padding:4px"><input type="hidden" name="' . esc_attr( $n( $chemin ) ) . '" value="' . esc_attr( $id ) . '"><button type="button" class="button cp-choisir">Choisir une image</button> <button type="button" class="button-link cp-retirer">Retirer</button></div>' . ( $aide ? '<p class="description">' . esc_html( $aide ) . '</p>' : '' ) . '</td></tr>';
	};
	?>
	<div class="wrap cp-assistant">
		<h1>Assistant de configuration — <?php echo esc_html( cp_r( 'entreprise.nom' ) ); ?></h1>
		<?php if ( isset( $_GET['ok'] ) ) : // phpcs:ignore ?><div class="notice notice-success"><p>Réglages enregistrés. Votre site est à jour : <a href="<?php echo esc_url( home_url( '/' ) ); ?>" target="_blank">voir le site</a>.</p></div><?php endif; ?>
		<?php if ( isset( $_GET['erreur'] ) ) : // phpcs:ignore ?><div class="notice notice-error"><p><?php echo esc_html( sanitize_text_field( wp_unslash( $_GET['erreur'] ) ) ); // phpcs:ignore ?></p></div><?php endif; ?>
		<h2 class="nav-tab-wrapper">
			<?php foreach ( $onglets as $k => $t ) : ?><a href="#<?php echo esc_attr( $k ); ?>" class="nav-tab" data-onglet="<?php echo esc_attr( $k ); ?>"><?php echo esc_html( $t ); ?></a><?php endforeach; ?>
		</h2>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" id="cp-form">
			<input type="hidden" name="action" value="cp_assistant">
			<?php wp_nonce_field( 'cp_assistant' ); ?>

			<div class="cp-onglet" id="o-entreprise"><table class="form-table">
				<?php
				$champ( 'entreprise.nom', 'Nom de l\'entreprise' );
				$champ( 'entreprise.slogan', 'Slogan', 'text', 'Grand titre de la page d\'accueil.' );
				$champ( 'entreprise.mentions', 'Mots clés', 'text', 'ex. Rapidité • Sécurité • Fiabilité' );
				$image( 'entreprise.logo_id', 'Logo', 'Sur le site, les e-mails, les bordereaux, les reçus et les étiquettes.' );
				$champ( 'entreprise.telephone', 'Téléphone (destination)' );
				$champ( 'entreprise.telephone_chine', 'Téléphone (origine)' );
				$champ( 'entreprise.whatsapp', 'Numéro WhatsApp', 'text', 'Avec l\'indicatif, ex. +226 54 20 55 46' );
				$champ( 'entreprise.email', 'E-mail', 'email', 'Reçoit les nouvelles déclarations ; les clients y répondent.' );
				$champ( 'entreprise.adresse', 'Adresse (siège)' );
				$champ( 'entreprise.rccm', 'RCCM' );
				$champ( 'entreprise.ifu', 'IFU' );
				$champ( 'entreprise.devise', 'Devise', 'text', 'ex. FCFA' );
				$champ( 'code.prefixe', 'Préfixe des codes d\'envoi', 'text', '2 à 4 lettres, ex. NVL → NVL-7K3Q9M' );
				?>
			</table></div>

			<div class="cp-onglet" id="o-couleurs"><table class="form-table">
				<?php
				$champ( 'couleurs.primaire', 'Couleur principale', 'color', 'Boutons, titres, bandeaux, documents.' );
				$champ( 'couleurs.accent', 'Couleur secondaire', 'color' );
				$champ( 'couleurs.fond', 'Couleur de fond des encadrés', 'color' );
				?>
			</table></div>

			<div class="cp-onglet" id="o-trajet"><table class="form-table">
				<?php
				$champ( 'origine.pays', 'Pays de départ' );
				$champ( 'origine.entrepot', 'Adresse de l\'entrepôt de départ', 'textarea', 'Telle que vos fournisseurs doivent l\'écrire (le chinois est accepté : il est transformé en image pour les PDF).' );
				$champ( 'origine.contact', 'Contact à l\'entrepôt' );
				$champ( 'destination.pays', 'Pays d\'arrivée' );
				?>
				<tr><th>Agences de retrait</th><td><table class="widefat cp-lignes" data-modele="agence"><thead><tr><th>Ville</th><th>Adresse</th><th>Téléphone</th><th></th></tr></thead><tbody>
					<?php foreach ( array_merge( (array) $r['destination']['agences'], array( array( 'ville' => '', 'adresse' => '', 'telephone' => '' ) ) ) as $i => $a ) : ?>
						<tr><td><input name="cp[destination][agences][<?php echo (int) $i; ?>][ville]" value="<?php echo esc_attr( $a['ville'] ); ?>"></td><td><input class="large-text" name="cp[destination][agences][<?php echo (int) $i; ?>][adresse]" value="<?php echo esc_attr( $a['adresse'] ); ?>"></td><td><input name="cp[destination][agences][<?php echo (int) $i; ?>][telephone]" value="<?php echo esc_attr( $a['telephone'] ); ?>"></td><td></td></tr>
					<?php endforeach; ?>
				</tbody></table><p class="description">Laissez la dernière ligne vide si inutile. Enregistrez pour ajouter une autre agence.</p></td></tr>
			</table></div>

			<div class="cp-onglet" id="o-tarifs">
				<p>Un mode par ligne. <b>Unité</b> : kg (avion) ou m³ (bateau). <b>Diviseur</b> : poids volumétrique en avion (L × l × h ÷ 6000). <b>Second tarif</b> : facultatif, ex. « Paiement sur place ». <b>Entrepôt</b> : seulement si ce mode a sa propre adresse.</p>
				<table class="widefat striped cp-modes-table"><thead><tr><th>Actif</th><th>Nom</th><th>Unité</th><th>Prix</th><th>Second tarif</th><th>Minimum</th><th>Délai (jours)</th><th>Diviseur</th><th>Description</th><th>Entrepôt propre à ce mode</th></tr></thead><tbody>
				<?php foreach ( array_merge( (array) $r['modes'], array( array( 'id' => '', 'nom' => '', 'unite' => 'kg', 'prix' => '', 'minimum' => 1, 'delai_min' => '', 'delai_max' => '', 'actif' => 1, 'diviseur' => 6000, 'description' => '', 'entrepot' => '', 'prix_alt' => '', 'prix_alt_libelle' => '' ) ) ) as $i => $m ) : $b = 'cp[modes][' . (int) $i . ']'; ?>
					<tr>
						<td><input type="hidden" name="<?php echo esc_attr( $b ); ?>[id]" value="<?php echo esc_attr( $m['id'] ); ?>"><input type="checkbox" name="<?php echo esc_attr( $b ); ?>[actif]" value="1" <?php checked( ! empty( $m['actif'] ) ); ?>></td>
						<td><input name="<?php echo esc_attr( $b ); ?>[nom]" value="<?php echo esc_attr( $m['nom'] ); ?>" placeholder="ex. Avion — Express" style="width:150px"></td>
						<td><select name="<?php echo esc_attr( $b ); ?>[unite]"><option value="kg" <?php selected( $m['unite'], 'kg' ); ?>>kg</option><option value="m3" <?php selected( $m['unite'], 'm3' ); ?>>m³</option></select></td>
						<td><input type="number" step="any" name="<?php echo esc_attr( $b ); ?>[prix]" value="<?php echo esc_attr( $m['prix'] ); ?>" style="width:100px"></td>
						<td><input type="number" step="any" name="<?php echo esc_attr( $b ); ?>[prix_alt]" value="<?php echo esc_attr( $m['prix_alt'] ?? '' ); ?>" style="width:100px"><br><input name="<?php echo esc_attr( $b ); ?>[prix_alt_libelle]" value="<?php echo esc_attr( $m['prix_alt_libelle'] ?? '' ); ?>" placeholder="Libellé" style="width:100px"></td>
						<td><input type="number" step="any" name="<?php echo esc_attr( $b ); ?>[minimum]" value="<?php echo esc_attr( $m['minimum'] ); ?>" style="width:70px"></td>
						<td><input type="number" name="<?php echo esc_attr( $b ); ?>[delai_min]" value="<?php echo esc_attr( $m['delai_min'] ); ?>" style="width:56px"> à <input type="number" name="<?php echo esc_attr( $b ); ?>[delai_max]" value="<?php echo esc_attr( $m['delai_max'] ); ?>" style="width:56px"></td>
						<td><input type="number" name="<?php echo esc_attr( $b ); ?>[diviseur]" value="<?php echo esc_attr( $m['diviseur'] ); ?>" style="width:70px"></td>
						<td><input name="<?php echo esc_attr( $b ); ?>[description]" value="<?php echo esc_attr( $m['description'] ?? '' ); ?>" style="width:130px"></td>
						<td><textarea name="<?php echo esc_attr( $b ); ?>[entrepot]" rows="2" style="width:220px" data-chemin="modes.<?php echo (int) $i; ?>.entrepot"><?php echo esc_textarea( $m['entrepot'] ?? '' ); ?></textarea></td>
					</tr>
				<?php endforeach; ?>
				</tbody></table>
				<table class="form-table">
					<?php
					$champ( 'frais.fixe', 'Frais de dossier par envoi', 'number' );
					$champ( 'frais.assurance', 'Assurance (% de la valeur déclarée)', 'number', '0 = pas d\'assurance' );
					?>
					<tr><th>Natures de marchandise</th><td><input class="large-text" name="cp[categories]" value="<?php echo esc_attr( implode( ', ', (array) $r['categories'] ) ); ?>"><p class="description">Séparées par des virgules, ex. Colis, Pièces auto, Marchandises, Biens personnels</p></td></tr>
					<?php $champ( 'consigne_colis', 'Consigne de marquage des cartons', 'text' ); ?>
				</table>
			</div>

			<div class="cp-onglet" id="o-paiement"><table class="form-table">
				<?php
				$champ( 'paiement.orange_money', 'Numéro Orange Money' );
				$champ( 'paiement.moov_money', 'Numéro Moov Money' );
				$champ( 'paiement.wave', 'Numéro Wave' );
				$champ( 'paiement.autres', 'Autres moyens', 'text', 'ex. Espèces à l\'agence, virement…' );
				$champ( 'paiement.consignes', 'Consignes de paiement', 'textarea' );
				?>
			</table></div>

			<div class="cp-onglet" id="o-documents"><table class="form-table">
				<?php
				$image( 'documents.banniere', 'Bannière des documents', 'Facultatif : image large (environ 4 × 1) en haut des bordereaux et reçus. Sans bannière, un bandeau est composé avec votre logo et vos couleurs.' );
				$champ( 'documents.services', 'Services (bandeau et pied des documents)', 'text', 'Séparés par •, ex. Achat assisté • Logistique • Transfert • Change • Vente & location de véhicules' );
				$champ( 'documents.accroche', 'Accroche', 'text', 'ex. De la Chine au Burkina Faso en toute sécurité' );
				$champ( 'documents.pied', 'Phrase du pied de page', 'text' );
				?>
				<tr><th>Services (page d'accueil)</th><td><table class="widefat"><thead><tr><th>Titre</th><th>Texte</th></tr></thead><tbody>
					<?php foreach ( array_merge( (array) $r['services'], array( array( 'titre' => '', 'texte' => '' ) ) ) as $i => $s ) : ?>
						<tr><td><input name="cp[services][<?php echo (int) $i; ?>][titre]" value="<?php echo esc_attr( $s['titre'] ); ?>"></td><td><input class="large-text" name="cp[services][<?php echo (int) $i; ?>][texte]" value="<?php echo esc_attr( $s['texte'] ); ?>"></td></tr>
					<?php endforeach; ?>
				</tbody></table></td></tr>
			</table></div>

			<div class="cp-onglet" id="o-etapes"><p>Les étapes que vos clients voient dans le suivi et reçoivent par e-mail. Vous pouvez changer leur nom et leur texte.</p><table class="widefat striped"><thead><tr><th>Étape</th><th>Texte envoyé au client</th></tr></thead><tbody>
				<?php foreach ( cp_etapes() as $i => $et ) : ?>
					<tr><td><input type="hidden" name="cp[etapes][<?php echo (int) $i; ?>][id]" value="<?php echo esc_attr( $et['id'] ); ?>"><input name="cp[etapes][<?php echo (int) $i; ?>][nom]" value="<?php echo esc_attr( $et['nom'] ); ?>"></td><td><input class="large-text" name="cp[etapes][<?php echo (int) $i; ?>][texte]" value="<?php echo esc_attr( $et['texte'] ?? '' ); ?>"></td></tr>
				<?php endforeach; ?>
			</tbody></table></div>

			<div class="cp-onglet" id="o-import"><table class="form-table">
				<tr><th>Exporter</th><td><textarea readonly rows="8" class="large-text code"><?php echo esc_textarea( wp_json_encode( get_option( 'cp_reglages', array() ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) ); ?></textarea><p class="description">Copiez ce texte pour dupliquer la configuration sur un autre site.</p></td></tr>
				<tr><th>Importer</th><td><textarea name="cp_import" rows="8" class="large-text code" placeholder="Collez ici une configuration exportée (JSON)"></textarea><p class="description">Si ce champ est rempli, il remplace tous les réglages à l'enregistrement.</p></td></tr>
			</table></div>

			<div id="cp-images-adresses"></div>
			<p class="submit"><button class="button button-primary button-hero">Enregistrer et mettre le site à jour</button></p>
		</form>
	</div>
	<style>.cp-onglet{display:none;background:#fff;border:1px solid #c3c4c7;border-top:0;padding:10px 20px 20px}.cp-onglet.actif{display:block}.cp-modes-table td{vertical-align:top}</style>
	<script>
	(function () {
		var tabs = document.querySelectorAll('.nav-tab[data-onglet]');
		function ouvrir(k) {
			tabs.forEach(function (t) { t.classList.toggle('nav-tab-active', t.dataset.onglet === k); });
			document.querySelectorAll('.cp-onglet').forEach(function (o) { o.classList.toggle('actif', o.id === 'o-' + k); });
		}
		tabs.forEach(function (t) { t.addEventListener('click', function (e) { e.preventDefault(); ouvrir(t.dataset.onglet); history.replaceState(null, '', '#' + t.dataset.onglet); }); });
		ouvrir((location.hash || '#entreprise').slice(1));
		document.querySelectorAll('.cp-media').forEach(function (m) {
			var img = m.querySelector('img'), inp = m.querySelector('input');
			m.querySelector('.cp-choisir').addEventListener('click', function () {
				var f = wp.media({ title: 'Choisir une image', multiple: false, library: { type: 'image' } });
				f.on('select', function () { var a = f.state().get('selection').first().toJSON(); inp.value = a.id; img.src = (a.sizes && a.sizes.medium ? a.sizes.medium.url : a.url); img.style.display = 'block'; });
				f.open();
			});
			m.querySelector('.cp-retirer').addEventListener('click', function () { inp.value = ''; img.style.display = 'none'; });
		});
		// adresses en écriture non latine (chinois…) : le navigateur les dessine en image pour les PDF
		document.getElementById('cp-form').addEventListener('submit', function () {
			var dest = document.getElementById('cp-images-adresses');
			dest.innerHTML = '';
			document.querySelectorAll('textarea[data-chemin]').forEach(function (t) {
				var v = t.value.trim();
				if (!v || /^[\u0000-ɏ -⁯\s]*$/.test(v)) return;
				var lignes = v.split(/\n/), taille = 44, h = lignes.length * 64 + 30, c = document.createElement('canvas');
				c.width = 1800; c.height = h;
				var x = c.getContext('2d');
				x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, h);
				x.fillStyle = '#111827'; x.textBaseline = 'top';
				x.font = '600 ' + taille + 'px "Noto Sans SC","PingFang SC","Microsoft YaHei","Hiragino Sans GB","Source Han Sans SC",sans-serif';
				var largeur = 0;
				lignes.forEach(function (l, i) { x.fillText(l, 14, 16 + i * 64); largeur = Math.max(largeur, x.measureText(l).width); });
				var c2 = document.createElement('canvas'); c2.width = Math.min(1800, Math.ceil(largeur) + 40); c2.height = h;
				c2.getContext('2d').drawImage(c, 0, 0);
				var i = document.createElement('input'); i.type = 'hidden'; i.name = 'cp_image_adresse[' + t.dataset.chemin + ']'; i.value = c2.toDataURL('image/jpeg', .92);
				dest.appendChild(i);
			});
		});
	})();
	</script>
	<?php
}

add_action( 'admin_post_cp_assistant', function () {
	if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'cp_assistant' ) ) {
		wp_die( 'Action non autorisée.' );
	}
	$retour = admin_url( 'edit.php?post_type=cp_envoi&page=cp-assistant' );
	$import = trim( (string) wp_unslash( $_POST['cp_import'] ?? '' ) ); // phpcs:ignore
	if ( '' !== $import ) {
		$j = json_decode( $import, true );
		if ( ! is_array( $j ) ) {
			wp_safe_redirect( add_query_arg( 'erreur', rawurlencode( 'Configuration importée illisible (JSON attendu).' ), $retour ) );
			exit;
		}
		update_option( 'cp_reglages', cp_nettoyer_reglages( $j ) );
	} else {
		$cp = (array) wp_unslash( $_POST['cp'] ?? array() ); // phpcs:ignore -- assaini dans cp_nettoyer_reglages
		$r = cp_nettoyer_reglages( $cp );
		// images des adresses en chinois, dessinées par le navigateur
		foreach ( (array) ( $_POST['cp_image_adresse'] ?? array() ) as $chemin => $data ) { // phpcs:ignore
			$id = cp_enregistrer_image_dataurl( (string) $data, 'adresse-' . sanitize_title( $chemin ) );
			if ( ! $id ) {
				continue;
			}
			if ( 'origine.entrepot' === $chemin ) {
				$r['origine']['entrepot_image'] = $id;
			} elseif ( preg_match( '/^modes\.(\d+)\.entrepot$/', $chemin, $m ) && isset( $r['modes'][ (int) $m[1] ] ) ) {
				$r['modes'][ (int) $m[1] ]['entrepot_image'] = $id;
			}
		}
		update_option( 'cp_reglages', $r );
	}
	delete_option( 'cp_assistant_a_faire' );
	cp_creer_pages();
	update_option( 'blogname', cp_r_frais( 'entreprise.nom' ) );
	wp_safe_redirect( add_query_arg( 'ok', 1, $retour ) );
	exit;
} );

/** Lit un réglage directement dans l'option (sans le cache de cp_reglages()). */
function cp_r_frais( $chemin ) {
	$v = get_option( 'cp_reglages', array() );
	foreach ( explode( '.', $chemin ) as $k ) {
		$v = is_array( $v ) && isset( $v[ $k ] ) ? $v[ $k ] : '';
	}
	return $v;
}

function cp_enregistrer_image_dataurl( $data, $nom ) {
	if ( ! preg_match( '#^data:image/(jpeg|png);base64,([A-Za-z0-9+/=]+)$#', $data, $m ) ) {
		return 0;
	}
	$octets = base64_decode( $m[2] );
	if ( ! $octets || strlen( $octets ) > 4 * MB_IN_BYTES || ! @getimagesizefromstring( $octets ) ) {
		return 0;
	}
	$f = wp_upload_bits( $nom . '-' . time() . '.' . ( 'png' === $m[1] ? 'png' : 'jpg' ), null, $octets );
	if ( ! empty( $f['error'] ) ) {
		return 0;
	}
	$id = wp_insert_attachment( array( 'post_title' => $nom, 'post_mime_type' => 'image/' . $m[1], 'post_status' => 'inherit' ), $f['file'] );
	return is_wp_error( $id ) ? 0 : (int) $id;
}

/** Assainit tous les réglages reçus (formulaire ou import). */
function cp_nettoyer_reglages( array $cp ) {
	$d = cp_reglages_defaut();
	$t = function ( $v ) {
		return sanitize_text_field( (string) $v );
	};
	$ta = function ( $v ) {
		return sanitize_textarea_field( (string) $v );
	};
	$r = $d;
	foreach ( $d['entreprise'] as $k => $v ) {
		if ( isset( $cp['entreprise'][ $k ] ) ) {
			$r['entreprise'][ $k ] = 'logo_id' === $k ? absint( $cp['entreprise'][ $k ] ) : ( 'email' === $k ? sanitize_email( $cp['entreprise'][ $k ] ) : $t( $cp['entreprise'][ $k ] ) );
		}
	}
	foreach ( array( 'primaire', 'accent', 'fond' ) as $k ) {
		$r['couleurs'][ $k ] = sanitize_hex_color( $cp['couleurs'][ $k ] ?? '' ) ?: $d['couleurs'][ $k ];
	}
	$r['origine'] = array( 'pays' => $t( $cp['origine']['pays'] ?? $d['origine']['pays'] ), 'entrepot' => $ta( $cp['origine']['entrepot'] ?? '' ), 'entrepot_image' => absint( $cp['origine']['entrepot_image'] ?? cp_r( 'origine.entrepot_image', 0 ) ), 'contact' => $t( $cp['origine']['contact'] ?? '' ) );
	$r['destination']['pays'] = $t( $cp['destination']['pays'] ?? $d['destination']['pays'] );
	$r['destination']['agences'] = array();
	foreach ( (array) ( $cp['destination']['agences'] ?? array() ) as $a ) {
		if ( '' !== trim( (string) ( $a['ville'] ?? '' ) ) ) {
			$r['destination']['agences'][] = array( 'ville' => $t( $a['ville'] ), 'adresse' => $t( $a['adresse'] ?? '' ), 'telephone' => $t( $a['telephone'] ?? '' ) );
		}
	}
	$anciens = array();
	foreach ( (array) cp_r( 'modes', array() ) as $m ) {
		$anciens[ $m['id'] ] = $m;
	}
	$r['modes'] = array();
	$ids = array();
	foreach ( (array) ( $cp['modes'] ?? array() ) as $m ) {
		$nom = $t( $m['nom'] ?? '' );
		if ( '' === $nom || '' === (string) ( $m['prix'] ?? '' ) ) {
			continue;
		}
		$id = sanitize_key( $m['id'] ?? '' );
		if ( ! $id ) {
			$id = sanitize_key( remove_accents( $nom ) );
		}
		while ( in_array( $id, $ids, true ) ) {
			$id .= '2';
		}
		$ids[] = $id;
		$entrepot = $ta( $m['entrepot'] ?? '' );
		$r['modes'][] = array(
			'id' => $id, 'nom' => $nom, 'unite' => 'm3' === ( $m['unite'] ?? '' ) ? 'm3' : 'kg', 'prix' => (float) $m['prix'],
			'prix_alt' => (float) ( $m['prix_alt'] ?? 0 ), 'prix_alt_libelle' => $t( $m['prix_alt_libelle'] ?? '' ),
			'minimum' => max( 0, (float) ( $m['minimum'] ?? 0 ) ), 'delai_min' => absint( $m['delai_min'] ?? 0 ), 'delai_max' => absint( $m['delai_max'] ?? 0 ),
			'diviseur' => absint( $m['diviseur'] ?? 0 ), 'actif' => empty( $m['actif'] ) ? 0 : 1, 'description' => $t( $m['description'] ?? '' ),
			'entrepot' => $entrepot,
			'entrepot_image' => absint( $m['entrepot_image'] ?? ( isset( $anciens[ $id ] ) && ( $anciens[ $id ]['entrepot'] ?? '' ) === $entrepot ? ( $anciens[ $id ]['entrepot_image'] ?? 0 ) : 0 ) ),
		);
	}
	if ( ! $r['modes'] ) {
		$r['modes'] = $d['modes'];
	}
	$r['frais'] = array( 'fixe' => max( 0, (float) ( $cp['frais']['fixe'] ?? 0 ) ), 'assurance' => max( 0, (float) ( $cp['frais']['assurance'] ?? 0 ) ) );
	$cats = is_array( $cp['categories'] ?? null ) ? $cp['categories'] : explode( ',', (string) ( $cp['categories'] ?? '' ) );
	$r['categories'] = array_values( array_filter( array_map( $t, $cats ) ) ) ?: $d['categories'];
	$r['consigne_colis'] = $t( $cp['consigne_colis'] ?? $d['consigne_colis'] );
	foreach ( array( 'orange_money', 'moov_money', 'wave', 'autres' ) as $k ) {
		$r['paiement'][ $k ] = $t( $cp['paiement'][ $k ] ?? '' );
	}
	$r['paiement']['consignes'] = $ta( $cp['paiement']['consignes'] ?? $d['paiement']['consignes'] );
	$r['documents'] = array(
		'banniere' => absint( $cp['documents']['banniere'] ?? 0 ),
		'services' => $t( $cp['documents']['services'] ?? '' ),
		'accroche' => $t( $cp['documents']['accroche'] ?? '' ),
		'pied'     => $t( $cp['documents']['pied'] ?? '' ),
	);
	$r['services'] = array();
	foreach ( (array) ( $cp['services'] ?? array() ) as $s ) {
		if ( '' !== trim( (string) ( $s['titre'] ?? '' ) ) ) {
			$r['services'][] = array( 'titre' => $t( $s['titre'] ), 'texte' => $t( $s['texte'] ?? '' ) );
		}
	}
	$etapes = array();
	$ids_etapes = wp_list_pluck( cp_etapes_defaut(), 'id' );
	foreach ( (array) ( $cp['etapes'] ?? array() ) as $e ) {
		$id = sanitize_key( $e['id'] ?? '' );
		if ( in_array( $id, $ids_etapes, true ) && '' !== trim( (string) ( $e['nom'] ?? '' ) ) ) {
			$etapes[] = array( 'id' => $id, 'nom' => $t( $e['nom'] ), 'texte' => $t( $e['texte'] ?? '' ) );
		}
	}
	$r['etapes'] = count( $etapes ) === count( $ids_etapes ) ? $etapes : cp_etapes_defaut();
	$r['code']['prefixe'] = strtoupper( substr( preg_replace( '/[^A-Za-z]/', '', (string) ( $cp['code']['prefixe'] ?? 'CRG' ) ), 0, 4 ) ) ?: 'CRG';
	return $r;
}
