<?php
// Test hors WordPress : tarifs et documents PDF de Navilink (php tests/test-pdf.php <dossier de sortie>)
define( 'CP_TEST', true );
require __DIR__ . '/../inc/tarifs.php';
require __DIR__ . '/../inc/pdf.php';
require __DIR__ . '/../inc/documents.php';
$out = $argv[1] ?? sys_get_temp_dir();
$n = json_decode( file_get_contents( __DIR__ . '/../sites/navilink/reglages.json' ), true );
$r = $n + array( 'paiement' => array( 'orange_money' => '+226 54 20 55 46', 'moov_money' => '', 'wave' => '+226 54 20 55 46', 'consignes' => 'Envoyez le montant au numéro indiqué, puis la capture du paiement sur WhatsApp avec votre code d\'envoi.' ) );
$r['frais'] = array( 'fixe' => 0, 'assurance' => 0 );
$r['documents'] = array( 'services' => 'Achat assisté • Logistique • Transfert • Change • Vente & location de véhicules', 'accroche' => 'De la Chine au Burkina Faso en toute sécurité', 'pied' => 'Votre partenaire de confiance pour vos achats en Chine' );
$banniere = file_get_contents( __DIR__ . '/../sites/navilink/banniere-documents.jpg' );
$etapes = array( array( 'id' => 'declare', 'nom' => 'Envoi déclaré' ), array( 'id' => 'recu', 'nom' => 'Reçu à l\'entrepôt' ), array( 'id' => 'expedie', 'nom' => 'Expédié' ),
	array( 'id' => 'transit', 'nom' => 'En transit' ), array( 'id' => 'arrive', 'nom' => 'Arrivé à destination' ), array( 'id' => 'disponible', 'nom' => 'Disponible au retrait' ), array( 'id' => 'livre', 'nom' => 'Livré' ) );
$modes = array_column( $r['modes'], null, 'id' );
// --- tarifs
$colis = array( array( 'description' => 'Pièces auto', 'nombre' => 2, 'poids' => 12.3, 'longueur' => 50, 'largeur' => 40, 'hauteur' => 30 ), array( 'description' => 'Carton vêtements', 'nombre' => 1, 'poids' => 8, 'longueur' => 60, 'largeur' => 40, 'hauteur' => 40 ) );
foreach ( $modes as $id => $m ) {
	$c = cp_calcul_tarif( $m, $colis );
	printf( "%-10s réel %5.2f kg  vol %6.3f m³  volumétrique %s  facturé %s  total %s%s\n", $id, $c['poids'], $c['volume'], var_export( $c['volumetrique'], true ), $c['facture'], number_format( $c['total'], 0, ',', ' ' ), isset( $c['total_alt'] ) ? '  (alt ' . number_format( $c['total_alt'], 0, ',', ' ' ) . ')' : '' );
}
// contrôle à la main : MCO, réel 32,6 kg ; volumétrique (2×60000 + 96000)/6000 = 36 kg → 36 × 8500 = 306 000
$c = cp_calcul_tarif( $modes['mco'], $colis );
assert_eq( 36.0, $c['facture'], 'MCO poids facturé' );
assert_eq( 306000.0, (float) $c['total'], 'MCO total' );
$c = cp_calcul_tarif( $modes['maritime'], $colis );
assert_eq( 0.22, $c['facture'], 'maritime volume facturé (0,216 m³ arrondi au centième supérieur)' );
assert_eq( 47300.0, (float) $c['total'], 'maritime total' );
assert_eq( 42900.0, (float) $c['total_alt'], 'maritime paiement sur place' );
$c = cp_calcul_tarif( $modes['express'], array( array( 'nombre' => 1, 'poids' => 0.3 ) ) );
assert_eq( 1.0, $c['facture'], 'minimum 1 kg' );
function assert_eq( $attendu, $obtenu, $nom ) {
	if ( abs( $attendu - $obtenu ) > 1e-6 ) { fwrite( STDERR, "ÉCHEC $nom : attendu $attendu, obtenu $obtenu\n" ); exit( 1 ); }
	echo "ok  $nom\n";
}
// --- documents
$logo = CP_PDF::vers_jpeg( __DIR__ . '/../sites/navilink/logo.jpg' );
$m = $modes['mco'];
$e = array( 'id' => 42, 'code' => 'NVL-7K3Q9M', 'date' => time(), 'client' => array( 'nom' => 'Issouf Ouédraogo', 'telephone' => '+226 70 00 00 00', 'email' => 'client@example.com', 'ville' => 'Ouagadougou', 'pays' => 'Burkina Faso', 'adresse' => 'Secteur 15, rue 15.32', 'fournisseur' => 'Alibaba — Yiwu Auto Parts Co.' ),
	'destinataire' => array( 'nom' => 'Aminata Traoré', 'telephone' => '+226 76 00 00 00', 'ville' => 'Ouagadougou', 'quartier' => 'Patte d\'Oie', 'adresse' => '', 'agence' => 'Ouagadougou' ), 'delais' => array( 14, 21 ),
	'mode' => 'mco', 'mode_nom' => $m['nom'], 'colis' => $colis, 'contenu' => 'Pièces auto et vêtements', 'valeur' => 0,
	'calcul' => cp_calcul_tarif( $m, $colis ), 'montant' => 306000, 'paiement' => array( 'statut' => 'attente', 'moyen' => '', 'reference' => '', 'date' => 0, 'montant' => 0 ),
	'historique' => array( array( 'etape' => 'declare', 'date' => time() ), array( 'etape' => 'recu', 'date' => time() ) ), 'statut' => 'recu', 'recu' => 'R2026-00001',
	'lien_suivi' => 'https://navilink.visionaryentreprises.com/suivi/?code=NVL-7K3Q9M', 'etapes' => $etapes,
	'entrepot' => array( 'texte' => $r['origine']['entrepot'], 'jpeg' => adresse_en_image( $r['origine']['entrepot'], '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc' ) ) );
/** Simule l'image de l'adresse en chinois que l'assistant crée dans le navigateur. */
function adresse_en_image( $texte, $police ) {
	if ( ! function_exists( 'imagettftext' ) || ! is_file( $police ) ) { return ''; }
	$lignes = explode( "\n", $texte ); $t = 34; $h = count( $lignes ) * 56 + 24;
	$im = imagecreatetruecolor( 1500, $h ); imagefill( $im, 0, 0, imagecolorallocate( $im, 255, 255, 255 ) );
	foreach ( $lignes as $i => $l ) { imagettftext( $im, $t, 0, 10, 50 + $i * 56, imagecolorallocate( $im, 17, 24, 39 ), $police, $l ); }
	ob_start(); imagejpeg( $im, null, 92 ); return ob_get_clean();
}
file_put_contents( "$out/fiche.pdf", cp_pdf_fiche( $e, $r, $logo, $banniere ) );
$e2 = $e; $e2['historique'][] = array( 'etape' => 'expedie', 'date' => time() ); $e2['statut'] = 'expedie'; $e2['mode'] = 'maritime'; $e2['mode_nom'] = $modes['maritime']['nom']; $e2['calcul'] = cp_calcul_tarif( $modes['maritime'], $colis ); $e2['montant'] = $e2['calcul']['total'];
file_put_contents( "$out/fiche-sans-banniere.pdf", cp_pdf_fiche( $e2, $r, $logo, '' ) );
file_put_contents( "$out/etiquettes.pdf", cp_pdf_etiquettes( $e, $r, $logo ) );
$e['paiement'] = array( 'statut' => 'paye', 'moyen' => 'Orange Money', 'reference' => 'MP260102.1234.A12345', 'date' => time(), 'montant' => 306000 );
file_put_contents( "$out/recu.pdf", cp_pdf_recu( $e, $r, $logo, $banniere ) );
foreach ( array( 0, 1, 21, 71, 80, 81, 100, 180, 1000, 2000, 306000, 1250500, 42900 ) as $n ) { echo $n, ' = ', cp_en_lettres( $n ), "\n"; }
echo "PDF écrits dans $out\n";
