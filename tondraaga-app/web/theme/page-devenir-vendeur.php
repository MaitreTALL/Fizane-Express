<?php
/**
 * Page « Devenir vendeur » : présentation du programme, des deux formules et formulaire d'inscription Dokan.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
get_header();
$photo = 'https://images.unsplash.com/photo-1687422808289-e721259c9eb4?auto=format&fit=crop&w=1600&h=760&q=72';
$wa    = 'https://wa.me/22675552661?text=' . rawurlencode( 'Bonjour Tondraaga, je souhaite devenir vendeur.' );
$f     = function_exists( 'tdg_am_taux' ) ? tdg_am_taux() : array( 'sans' => 15, 'abonnement' => 8, 'prix' => 15000 );
$pct   = function ( $v ) {
	return rtrim( rtrim( number_format( (float) $v, 2, ',', '' ), '0' ), ',' ) . ' %';
};
$prix  = number_format( (float) $f['prix'], 0, ',', ' ' ) . ' FCFA';
?>
<div class="dv">
	<section class="dv-heros" style="--fond:url('<?php echo esc_url( $photo ); ?>')">
		<div class="dv-heros-texte">
			<p class="dv-surtitre">Programme vendeur · Made in Burkina</p>
			<h1>Vendez vos créations dans le monde entier</h1>
			<p class="dv-chapeau">Artisans, coopératives, producteurs et créateurs : ouvrez votre boutique sur Tondraaga et touchez les clients du Burkina et de la diaspora, en Afrique, en Europe et en Amérique, sans site à gérer.</p>
			<ul class="dv-chiffres">
				<li><b>0 FCFA</b><span>pour ouvrir votre boutique</span></li>
				<li><b><?php echo esc_html( $pct( $f['sans'] ) ); ?></b><span>de commission sans abonnement</span></li>
				<li><b><?php echo esc_html( $pct( $f['abonnement'] ) ); ?></b><span>avec l’abonnement annuel</span></li>
			</ul>
			<a class="dv-bouton dv-bouton-ocre" href="#inscription">Ouvrir ma boutique</a>
			<a class="dv-bouton dv-bouton-clair" href="<?php echo esc_url( $wa ); ?>" target="_blank" rel="noopener">Poser une question</a>
		</div>
	</section>

	<section class="dv-formules" aria-label="Nos deux formules">
		<h2>Deux formules, au choix</h2>
		<div class="dv-formules-grille">
			<div class="dv-formule">
				<h3>Sans abonnement</h3>
				<p class="dv-formule-prix">Gratuit</p>
				<p><b><?php echo esc_html( $pct( $f['sans'] ) ); ?> de commission</b> sur chaque vente.</p>
				<p class="dv-formule-note">Idéal pour commencer : vous ne payez que lorsque vous vendez.</p>
			</div>
			<div class="dv-formule dv-formule-vedette">
				<h3>Abonnement annuel</h3>
				<p class="dv-formule-prix"><?php echo esc_html( $prix ); ?> <small>par an</small></p>
				<p><b><?php echo esc_html( $pct( $f['abonnement'] ) ); ?> de commission</b> seulement sur chaque vente, pendant 1 an.</p>
				<p class="dv-formule-note">Idéal si vous vendez régulièrement. Sans renouvellement, vous repassez automatiquement à la formule sans abonnement.</p>
			</div>
		</div>
		<p class="dv-formules-aide">Vous choisissez votre formule à l’inscription et vous pouvez passer à l’abonnement à tout moment depuis votre espace vendeur. Produits illimités dans les deux formules.</p>
	</section>

	<section class="dv-etapes" aria-label="Comment ça marche">
		<div><span>1</span><h3>Inscription</h3><p>Remplissez le formulaire ci-dessous et choisissez votre formule : sans abonnement ou abonnement annuel.</p></div>
		<div><span>2</span><h3>Validation</h3><p>Notre équipe vérifie votre boutique et la met en ligne, sans paiement préalable.</p></div>
		<div><span>3</span><h3>Produits</h3><p>Ajoutez vos produits et leur catégorie ; nous vérifions chacun avant sa mise en ligne.</p></div>
		<div><span>4</span><h3>Ventes</h3><p>Vous préparez les commandes et suivez vos gains depuis votre téléphone.</p></div>
	</section>

	<section class="dv-grille">
		<div class="dv-infos">
			<h2>Ce que vous obtenez</h2>
			<ul class="dv-avantages">
				<li><b>Votre boutique en ligne</b><span>Une page à votre nom, avec vos produits, votre histoire et vos coordonnées.</span></li>
				<li><b>Un tableau de bord simple</b><span>Ajoutez vos produits, gérez vos stocks et vos commandes, même depuis un téléphone.</span></li>
				<li><b>Des clients dans le monde entier</b><span>Tondraaga s’adresse aux Burkinabè et aux amoureux du Faso, en Afrique, en Europe et en Amérique, qui veulent acheter local.</span></li>
				<li><b>Des paiements encadrés</b><span>Les clients paient Tondraaga ; vos gains (ventes moins la commission de votre formule) vous sont reversés.</span></li>
				<li><b>Le label « Made in Burkina »</b><span>Vos produits sont mis en avant comme fabriqués au Burkina Faso.</span></li>
			</ul>
			<div class="dv-documents">
				<h3>À préparer avant de commencer</h3>
				<ul>
					<li>Votre pièce d’identité</li>
					<li>Votre RCCM ou IFU, si vous en avez un</li>
					<li>De belles photos de vos produits, sur fond clair, et leur poids (pour l’expédition)</li>
					<li>Votre numéro Orange Money ou Wave pour recevoir vos gains</li>
				</ul>
			</div>
		</div>

		<div class="dv-formulaire" id="inscription">
			<h2>Créer ma boutique</h2>
			<?php if ( is_user_logged_in() ) : ?>
				<p class="dv-connecte">Vous êtes connecté avec le compte <strong><?php echo esc_html( wp_get_current_user()->user_email ); ?></strong>.</p>
				<?php if ( function_exists( 'dokan_is_user_seller' ) && dokan_is_user_seller( get_current_user_id() ) ) : ?>
					<a class="dv-bouton dv-bouton-brun" href="<?php echo esc_url( dokan_get_navigation_url() ); ?>">Ouvrir mon espace vendeur</a>
				<?php else : ?>
					<p>Pour créer une boutique, déconnectez-vous puis remplissez ce formulaire avec l’adresse e-mail du vendeur.</p>
					<a class="dv-bouton dv-bouton-brun" href="<?php echo esc_url( wp_logout_url( get_permalink() ) ); ?>">Se déconnecter</a>
				<?php endif; ?>
			<?php else : ?>
				<p class="dv-sous-titre">Deux minutes suffisent. Vous recevrez un e-mail pour choisir votre mot de passe.</p>
				<?php echo do_shortcode( '[dokan-vendor-registration]' ); // phpcs:ignore ?>
				<p class="dv-mention">En créant votre boutique, vous acceptez les <a href="<?php echo esc_url( home_url( '/#/page/cgv' ) ); ?>">conditions générales</a> de Tondraaga.</p>
			<?php endif; ?>
		</div>
	</section>

	<section class="dv-faq">
		<h2>Questions fréquentes</h2>
		<details><summary>Combien coûte l’ouverture d’une boutique ?</summary><p>Rien : l’inscription est gratuite. Ensuite, deux formules au choix. Sans abonnement, Tondraaga prélève <?php echo esc_html( $pct( $f['sans'] ) ); ?> de commission sur chaque vente. Avec l’abonnement annuel de <?php echo esc_html( $prix ); ?>, la commission tombe à <?php echo esc_html( $pct( $f['abonnement'] ) ); ?> pendant 1 an. Il n’y a pas d’autres frais cachés.</p></details>
		<details><summary>Quelle formule choisir ?</summary><p>L’abonnement devient intéressant dès que vos ventes dépassent environ <?php echo esc_html( number_format( (float) $f['prix'] / max( 0.01, ( (float) $f['sans'] - (float) $f['abonnement'] ) / 100 ), 0, ',', ' ' ) ); ?> FCFA sur l’année. En dessous, la formule sans abonnement vous coûte moins cher. Vous pouvez passer à l’abonnement à tout moment.</p></details>
		<details><summary>Comment suis-je payé ?</summary><p>Les clients paient Tondraaga. Vos gains s’accumulent dans votre tableau de bord et vous demandez un retrait vers votre compte Orange Money ou Wave.</p></details>
		<details><summary>Qui livre les commandes ?</summary><p>Vous préparez la commande. Tondraaga organise la livraison à Ouagadougou et l’expédition partout dans le monde : en Afrique, en Europe, en Amérique.</p></details>
		<details><summary>Combien de temps prend la validation ?</summary><p>Nous vérifions chaque boutique dès votre inscription, sans attendre de paiement. Vous êtes prévenu par e-mail et WhatsApp.</p></details>
	</section>

	<section class="dv-contact">
		<div><h2>Besoin d’aide pour vous inscrire ?</h2><p>Notre équipe vous accompagne pas à pas, y compris pour les photos de vos produits.</p></div>
		<a class="dv-bouton dv-bouton-ocre" href="<?php echo esc_url( $wa ); ?>" target="_blank" rel="noopener">WhatsApp +226 75 55 26 61</a>
	</section>
</div>
<?php
get_footer();
