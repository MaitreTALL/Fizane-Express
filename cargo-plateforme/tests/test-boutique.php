<?php
/**
 * Banc d'essai de la boutique hors WordPress : doublures de WooCommerce (produits, panier, commandes) pour vérifier
 * le transport cargo, le paiement direct Mobile Money, la validation, le reçu PDF et la création de l'envoi suivi.
 * Usage : php tests/test-boutique.php <dossier de sortie>
 */
$OUT = rtrim( $argv[1] ?? sys_get_temp_dir(), '/' );
require __DIR__ . '/doublures.php';

require __DIR__ . '/doublures-wc.php';
require __DIR__ . '/../cargo-plateforme.php';
do_action( 'plugins_loaded' );
do_action( 'woocommerce_shipping_init' );

$j = json_decode( file_get_contents( __DIR__ . '/../sites/navilink/reglages.json' ), true );
$j['paiement'] = array( 'orange_money' => '+226 54 20 55 46', 'moov_money' => '', 'wave' => '+226 54 20 55 46' );
$j['entreprise']['logo_id'] = 5;
$j['documents']['banniere'] = 7;
update_option( 'cp_reglages', cp_nettoyer_reglages( $j ) );
$GLOBALS['fichiers'] = array( 5 => __DIR__ . '/../sites/navilink/logo.jpg', 7 => __DIR__ . '/../sites/navilink/banniere-documents.jpg' );
cp_creer_pages();
$GLOBALS['commandes'] = array();

/* ---------------------------------------------------------------- 1. transport cargo */
$pneus = new FauxProduit( array( 'id' => 1, 'nom' => 'Pneus 315/80 R22.5 (lot de 2)', 'prix' => 180000, 'poids' => 12, 'l' => 50, 'w' => 40, 'h' => 30 ) );
$t = cp_tarifs_livraison( array( cp_article_produit( $pneus, 2 ) ) );
$par = array_column( $t, 'cout', 'id' );
verifier( 4 === count( $t ) && 204000.0 === $par['mco'] && 252000.0 === $par['lta'] && 276000.0 === $par['express'], 'transport avion : 2 × 12 kg (volumétrique 10 kg) = 24 kg × 8 500 = 204 000' );
verifier( 25800.0 === $par['maritime'], 'transport bateau : 2 × 0,06 m³ = 0,12 m³ × 215 000 = 25 800' );
verifier( 'Avion — Express (3 à 7 jours)' === $t[2]['libelle'] && 'Bateau — Maritime (≈ 2 mois)' === $t[3]['libelle'], 'libellés avec délais' );
$sans_dims = new FauxProduit( array( 'id' => 2, 'nom' => 'Phares LED', 'prix' => 35000, 'poids' => 3 ) );
$t = array_column( cp_tarifs_livraison( array( cp_article_produit( $sans_dims, 1 ) ) ), null, 'id' );
verifier( 25500.0 === $t['mco']['cout'] && $t['maritime']['pesee'] && 0 === $t['maritime']['cout'], 'sans dimensions : avion au poids, bateau payé après pesée' );
$sur_place = new FauxProduit( array( 'id' => 3, 'nom' => 'Camion benne (location)', 'prix' => 150000, 'meta' => array( '_cp_lieu' => 'local', '_cp_location' => 'yes' ) ) );
$t = cp_tarifs_livraison( array( cp_article_produit( $sur_place, 3 ) ) );
verifier( 1 === count( $t ) && 'Retrait à l\'agence de Ouagadougou' === $t[0]['libelle'] && 0 === $t[0]['cout'], 'produit déjà sur place : retrait à l\'agence' );
$m = new CP_Livraison_Cargo();
$m->calculate_shipping( array( 'contents' => array( array( 'data' => $pneus, 'quantity' => 2 ), array( 'data' => $sur_place, 'quantity' => 1 ) ) ) );
verifier( 4 === count( $m->tarifs ) && 'cp_cargo:mco' === $m->tarifs[0]['id'] && 204000.0 === $m->tarifs[0]['cost'] && 'mco' === $m->tarifs[0]['meta_data']['cp_mode'], 'méthode de livraison : articles sur place exclus du transport' );

/* ---------------------------------------------------------------- 2. paiement direct */
$GLOBALS['total_panier'] = 564000;
$g = new CP_Passerelle_Mobile( 'cp_orange' );
ob_start();
$g->payment_fields();
$h = ob_get_clean();
verifier( false !== strpos( $h, '564 000' ) && false !== strpos( $h, '*144#' ) && false !== strpos( $h, '+226 54 20 55 46' ) && false !== strpos( $h, 'Navilink Cargo' ) && false !== strpos( $h, 'name="cp_mm_transaction[cp_orange]"' ), 'Orange Money : montant, code *144#, numéro, titulaire et champs' );
verifier( $g->is_available() && ! ( new CP_Passerelle_Mobile( 'cp_moov' ) )->is_available() && ( new CP_Passerelle_Mobile( 'cp_wave' ) )->is_available(), 'moyens proposés seulement avec un numéro (Moov non renseigné)' );
$_POST = array();
$GLOBALS['avis_wc'] = array();
verifier( false === $g->validate_fields() && 2 === count( $GLOBALS['avis_wc'] ), 'champs vides refusés (numéro payeur, ID de transaction)' );
$_POST = array( 'cp_mm_payeur' => array( 'cp_orange' => '70 11 22 33' ), 'cp_mm_transaction' => array( 'cp_orange' => 'PP251102.1530.A12345' ), 'cp_mm_preuve' => array( 'cp_orange' => '' ) );
verifier( true === $g->validate_fields(), 'champs remplis acceptés' );

// capture d'écran envoyée pendant la commande (fichier déjà enregistré par l'API)
$dossier = cp_preuves_dossier();
verifier( is_file( "$dossier/.htaccess" ) && false !== strpos( file_get_contents( "$dossier/.htaccess" ), 'Require all denied' ), 'dossier des captures fermé au public' );
$jeton = str_repeat( 'a', 12 ) . 'B3c4D5e6F7g8';
file_put_contents( "$dossier/attente/$jeton.jpg", 'jpeg' );
$_POST['cp_mm_preuve']['cp_orange'] = $jeton;
verifier( '' === cp_preuve_en_attente( '../../wp-config' ) && $jeton === cp_preuve_en_attente( $jeton ), 'jeton de capture contrôlé' );

$o = new FausseCommande( 501, array( new FauxArticle( $pneus, 2, 360000 ) ), array( new FausseLivraison( array( 'cout' => 204000, 'nom' => 'Avion — MCO (2 à 3 semaines)', 'meta' => array( 'cp_mode' => 'mco' ) ) ) ) );
$GLOBALS['commandes'][501] = $o;
$r = $g->process_payment( 501 );
verifier( 'success' === $r['result'] && 'on-hold' === $o->statut && 'PP251102.1530.A12345' === $o->get_transaction_id() && '70 11 22 33' === $o->get_meta( '_cp_mm_payeur' ) && WC()->cart->vide, 'commande en attente de vérification, panier vidé' );
verifier( preg_match( '/^501-\w{12}\.jpg$/', $o->get_meta( '_cp_mm_preuve' ) ) && is_file( "$dossier/" . $o->get_meta( '_cp_mm_preuve' ) ) && ! is_file( "$dossier/attente/$jeton.jpg" ), 'capture rattachée à la commande' );
$GLOBALS['avis_wc'] = array();
verifier( false === $g->validate_fields() && false !== strpos( $GLOBALS['avis_wc'][0], 'déjà servi' ), 'même ID de transaction refusé pour une autre commande' );

/* ---------------------------------------------------------------- 3. validation : reçu et envoi suivi */
$GLOBALS['mails'] = array();
$o->statut = 'processing';
do_action( 'woocommerce_order_status_changed', 501, 'on-hold', 'processing', $o );
$recu = $o->get_meta( '_cp_recu_num' );
$eid = (int) $o->get_meta( '_cp_envoi' );
$e = cp_envoi( $eid );
verifier( preg_match( '/^R\d{4}-\d{5}$/', $recu ) && preg_match( '/^NVL-/', $e['code'] ), 'paiement validé : reçu ' . $recu . ', envoi ' . $e['code'] );
verifier( 'mco' === $e['mode'] && 204000.0 === $e['montant'] && 'paye' === $e['paiement']['statut'] && 'Awa Sawadogo' === $e['client']['nom'] && 'Burkina Faso' === $e['client']['pays'] && 24.0 === (float) $e['calcul']['facture'], 'envoi : mode, transport payé, client, 24 kg' );
verifier( 'declare' === $e['statut'] && false !== strpos( $e['historique'][0]['note'], 'Commande n° 501' ) && $recu === $e['recu'], 'envoi : étape et numéro de reçu partagés' );
$m0 = $GLOBALS['mails'][0];
verifier( 1 === count( $GLOBALS['mails'] ) && 'awa@example.com' === $m0['a'] && false !== strpos( $m0['h'], $e['code'] ) && isset( $m0['p'][ "recu-$recu.pdf" ] ) && 0 === strpos( $m0['p'][ "recu-$recu.pdf" ], '%PDF' ), 'e-mail du reçu avec le PDF et le code de suivi' );
file_put_contents( "$OUT/recu-commande.pdf", $m0['p'][ "recu-$recu.pdf" ] );
do_action( 'woocommerce_order_status_changed', 501, 'processing', 'completed', $o );
verifier( 1 === count( $GLOBALS['mails'] ) && $recu === $o->get_meta( '_cp_recu_num' ), 'une seule fois (commande terminée ensuite)' );

// transport à payer après pesée
$o2 = new FausseCommande( 502, array( new FauxArticle( $sans_dims, 1, 35000 ) ), array( new FausseLivraison( array( 'cout' => 0, 'nom' => 'Bateau — Maritime', 'meta' => array( 'cp_mode' => 'maritime', 'cp_pesee' => 'oui' ) ) ) ) );
$GLOBALS['commandes'][502] = $o2;
cp_commande_payee( $o2 );
$e2 = cp_envoi( (int) $o2->get_meta( '_cp_envoi' ) );
verifier( 'attente' === $e2['paiement']['statut'] && false !== strpos( end( $GLOBALS['mails'] )['h'], 'pesée' ), 'transport après pesée : envoi à payer, client prévenu' );

// articles sur place : reçu sans envoi
$o3 = new FausseCommande( 503, array( new FauxArticle( $sur_place, 3, 450000 ) ), array( new FausseLivraison( array( 'cout' => 0, 'nom' => 'Retrait à l\'agence de Ouagadougou', 'meta' => array( 'cp_mode' => '' ) ) ) ) );
$GLOBALS['commandes'][503] = $o3;
cp_commande_payee( $o3 );
$d3 = cp_recu_commande_donnees( $o3 );
verifier( ! $o3->get_meta( '_cp_envoi' ) && '3 j' === $d3['lignes'][0][1] && 150000.0 === (float) $d3['lignes'][0][2], 'location sur place : pas d\'envoi, 3 jours × 150 000 sur le reçu' );
file_put_contents( "$OUT/recu-location.pdf", cp_pdf_recu_commande( $o3 ) );

/* ---------------------------------------------------------------- 4. affichage */
$f = $GLOBALS['hooks']['woocommerce_get_price_html'][0];
verifier( false !== strpos( $f( '150 000 FCFA', $sur_place ), '/ jour' ) && false === strpos( $f( '180 000 FCFA', $pneus ), '/ jour' ), 'location : « / jour » après le prix' );
$f = $GLOBALS['hooks']['woocommerce_loop_add_to_cart_link'][0];
$sans_prix = new FauxProduit( array( 'id' => 4, 'nom' => 'Excavatrice Caterpillar 320' ) );
verifier( false !== strpos( $f( '<a>Ajouter</a>', $sans_prix ), 'Demander le prix' ) && false !== strpos( $f( '<a>Ajouter</a>', $sans_prix ), 'wa.me/22654205546' ) && '<a>Ajouter</a>' === $f( '<a>Ajouter</a>', $pneus ), 'sans prix : « Demander le prix » sur WhatsApp' );
echo "PDF : $OUT/recu-commande.pdf, $OUT/recu-location.pdf\n";
