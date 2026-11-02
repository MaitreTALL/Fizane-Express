<?php
/**
 * Banc d'essai hors WordPress : de petites doublures des fonctions de WordPress permettent d'exécuter le parcours
 * complet (import de la configuration Navilink, déclaration d'un envoi par l'API, étapes, paiement, e-mails avec
 * PDF, pages publiques). Usage : php tests/test-wp.php <dossier de sortie>
 */
$OUT = $argv[1] ?? sys_get_temp_dir();
require __DIR__ . '/doublures.php';
require __DIR__ . '/../cargo-plateforme.php';

// 1. import de la configuration Navilink (comme dans l'assistant)
$j = json_decode( file_get_contents( __DIR__ . '/../sites/navilink/reglages.json' ), true );
$j['paiement'] = array( 'orange_money' => '+226 54 20 55 46', 'wave' => '+226 54 20 55 46' );
$j['documents'] = array( 'banniere' => 7, 'services' => 'Achat assisté • Logistique • Transfert • Change • Vente & location de véhicules', 'accroche' => 'De la Chine au Burkina Faso en toute sécurité', 'pied' => 'Votre partenaire de confiance pour vos achats en Chine' );
$j['entreprise']['logo_id'] = 5;
$j['entreprise']['email'] = 'contact@navilink.test';
update_option( 'cp_reglages', cp_nettoyer_reglages( $j ) );
$GLOBALS['fichiers'] = array( 5 => __DIR__ . '/../sites/navilink/logo.jpg', 7 => __DIR__ . '/../sites/navilink/banniere-documents.jpg' );
$r = get_option( 'cp_reglages' );
verifier( 4 === count( $r['modes'] ) && 'mco' === $r['modes'][0]['id'] && 195000.0 === $r['modes'][3]['prix_alt'], 'import : 4 modes, second tarif maritime' );
verifier( 'NVL' === $r['code']['prefixe'] && '#0146AF' === $r['couleurs']['primaire'], 'import : préfixe et couleurs' );
cp_creer_pages();
verifier( (int) get_option( 'cp_page_suivi' ) > 0, 'pages créées' );

// 2. déclaration par l'API publique
$q = new WP_REST_Request( array( 'mode' => 'maritime', 'categorie' => 'Pièces auto', 'contenu' => 'amortisseurs',
	'client' => array( 'nom' => 'Issouf Ouédraogo', 'telephone' => '+226 70 00 00 00', 'email' => 'issouf@example.com', 'ville' => 'Ouagadougou', 'fournisseur' => '1688' ),
	'destinataire' => array( 'nom' => '', 'ville' => 'Bobo-Dioulasso', 'agence' => 'Ouagadougou' ),
	'colis' => array( array( 'nombre' => 3, 'poids' => 20, 'longueur' => 60, 'largeur' => 50, 'hauteur' => 40 ) ), 'site_web' => '' ), array( 'X-WP-Nonce' => 'nonce' ) );
$rep = cp_rest_declarer( $q );
verifier( is_array( $rep ) && preg_match( '/^NVL-[2-9A-HJ-NP-Z]{6}$/', $rep['code'] ), 'déclaration : code ' . ( $rep['code'] ?? '?' ) );
$id = cp_envoi_par_code( $rep['code'] );
$e = cp_envoi( $id );
verifier( 0.36 === (float) $e['calcul']['facture'] && 77400.0 === (float) $e['montant'], 'maritime : 3 × 0,12 m³ = 0,36 m³ × 215 000 = 77 400' );
verifier( 70200.0 === (float) $e['calcul']['total_alt'], 'paiement sur place : 70 200' );
verifier( 'Issouf Ouédraogo' === $e['destinataire']['nom'], 'destinataire vide = le client' );
verifier( 2 === count( $GLOBALS['mails'] ) && isset( $GLOBALS['mails'][0]['p'][ 'fiche-' . $rep['code'] . '.pdf' ] ), 'e-mails : client (bordereau + étiquettes) et entreprise' );
verifier( false !== strpos( $GLOBALS['mails'][0]['h'], '诚信大道266号' ), 'e-mail : adresse de l\'entrepôt maritime en chinois' );
file_put_contents( "$OUT/wp-bordereau.pdf", $GLOBALS['mails'][0]['p'][ 'fiche-' . $rep['code'] . '.pdf' ] );
// refus : e-mail manquant
$q2 = new WP_REST_Request( array( 'mode' => 'mco', 'client' => array( 'nom' => 'A', 'telephone' => '1' ) ), array( 'X-WP-Nonce' => 'nonce' ) );
verifier( cp_rest_declarer( $q2 ) instanceof WP_Error, 'déclaration incomplète refusée' );

// 3. étapes, paiement, reçu
cp_changer_etape( $id, 'recu', 'Colis pesés', 'Yiwu' );
cp_changer_etape( $id, 'expedie', '', 'Ningbo' );
cp_marquer_paye( $id, 'Orange Money', 'MP2611.0042' );
$e = cp_envoi( $id );
verifier( 'paye' === $e['paiement']['statut'] && preg_match( '/^R\d{4}-00001$/', $e['recu'] ), 'paiement : reçu ' . $e['recu'] );
$dernier = end( $GLOBALS['mails'] );
verifier( isset( $dernier['p'][ 'recu-' . $e['recu'] . '.pdf' ] ), 'e-mail du reçu avec PDF' );
file_put_contents( "$OUT/wp-recu.pdf", $dernier['p'][ 'recu-' . $e['recu'] . '.pdf' ] );
$s = cp_suivi_public( $id );
verifier( 'Expédié' === $s['statut'] && 3 === $s['colis'] && '' !== $s['arrivee'], 'suivi public : ' . $s['statut'] . ', ' . $s['arrivee'] );
verifier( ! isset( $s['client'] ) && false === strpos( json_encode( $s ), 'Issouf' ), 'suivi public sans données personnelles' );

// 4. pages publiques
foreach ( array( 'cargo_accueil', 'cargo_tarifs', 'cargo_simulateur', 'cargo_suivi', 'cargo_declarer', 'cargo_mon_espace' ) as $c ) {
	$h = $GLOBALS['codes'][ $c ]( array() );
	verifier( strlen( $h ) > 200, "code court [$c] (" . strlen( $h ) . ' caractères)' );
	file_put_contents( "$OUT/$c.html", $h );
}
verifier( false !== strpos( $GLOBALS['codes']['cargo_tarifs']( array() ), 'Paiement sur place' ), 'tarifs : second tarif affiché' );
$acc = $GLOBALS['codes']['cargo_accueil']( array() );
verifier( false !== strpos( $acc, 'Vos achats de Chine, <span>livrés au Burkina Faso.</span>' ), 'accueil : titre calculé depuis le trajet' );
verifier( false !== strpos( $acc, "8\u{202F}500 F</b>le kilo en MCO" ) && false !== strpos( $acc, '3–7 j</b>en Express' ), 'accueil : chiffres calculés depuis les tarifs' );
verifier( false !== strpos( $acc, 'Express : 3 à 7 jours' ) && false !== strpos( $acc, 'data-cp="devis"' ) && 4 === substr_count( $acc, '<option value=' ), 'accueil : carte express et devis en ligne (4 modes)' );
verifier( 6 === substr_count( $acc, 'class="cp-a-service cp-anim"' ) && false !== strpos( $acc, 'https://wa.me/22654205546' ), 'accueil : 6 services, liens WhatsApp' );
verifier( false === strpos( $acc, 'Ils nous font confiance' ), 'accueil : pas d\'avis tant qu\'aucun vrai avis n\'est saisi' );
verifier( 'au Burkina Faso' === cp_au_pays( 'Burkina Faso' ) && 'en Côte d\'Ivoire' === cp_au_pays( 'Côte d\'Ivoire' ) && 'de Chine' === cp_de_pays( 'Chine' ) && 'aux Émirats arabes unis' === cp_au_pays( 'Émirats arabes unis' ), 'accueil : prépositions des pays' );
$o = get_option( 'cp_reglages' );
$o['site']['avis'] = array( array( 'nom' => 'A', 'role' => '', 'texte' => 'Bien', 'note' => 9 ) );
update_option( 'cp_reglages', cp_nettoyer_reglages( $o ) );
verifier( 5 === cp_r( 'site.avis.0.note' ) && false !== strpos( $GLOBALS['codes']['cargo_accueil']( array() ), 'Ils nous font confiance' ), 'accueil : avis affichés une fois saisis (note ramenée à 5)' );
$o['site']['hero_images'] = array( 'javascript:alert(1)', 'https://exemple.test/a.jpg', 12 );
$o['services'][0]['lien'] = 'javascript:alert(1)';
$n = cp_nettoyer_reglages( $o );
verifier( array( 'https://exemple.test/a.jpg', 12 ) === $n['site']['hero_images'] && '' === $n['services'][0]['lien'], 'accueil : images et liens assainis' );
echo 'e-mails envoyés : ' . count( $GLOBALS['mails'] ) . "\n";
foreach ( $GLOBALS['mails'] as $m ) { echo '  → ' . $m['a'] . ' : ' . $m['s'] . ' [' . implode( ', ', array_keys( $m['p'] ) ) . "]\n"; }
