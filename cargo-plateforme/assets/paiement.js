/* Cargo Plateforme — page de paiement de la boutique : copier le numéro, envoyer la capture d'écran du paiement.
   Délégation d'événements : WooCommerce redessine le bloc de paiement quand l'adresse ou la livraison change. */
(function () {
	var C = window.CARGO_PAIEMENT || {};
	var jetons = {};   // capture déjà envoyée, par moyen de paiement (remise en place après chaque mise à jour)

	document.addEventListener('click', function (ev) {
		var b = ev.target.closest('.cp-mm-copier');
		if (!b) return;
		ev.preventDefault();
		var t = b.getAttribute('data-copier');
		var fini = function () { b.textContent = 'Copié ✓'; setTimeout(function () { b.textContent = 'Copier'; }, 1800); };
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(t).then(fini, fini);
		} else {
			var z = document.createElement('textarea'); z.value = t; document.body.appendChild(z); z.select();
			try { document.execCommand('copy'); } catch (e) {}
			document.body.removeChild(z); fini();
		}
	});

	document.addEventListener('change', function (ev) {
		var f = ev.target;
		if (!f.matches || !f.matches('input[data-cp-preuve]') || !f.files || !f.files[0]) return;
		var id = f.getAttribute('data-cp-preuve');
		var etat = f.parentNode.querySelector('.cp-mm-etat');
		var cache = document.getElementById('cp_mm_preuve_' + id);
		if (f.files[0].size > 8 * 1024 * 1024) { etat.textContent = 'Image trop lourde (8 Mo au plus).'; etat.className = 'cp-mm-etat cp-mm-ko'; return; }
		var d = new FormData(); d.append('preuve', f.files[0]);
		etat.textContent = 'Envoi de la capture…'; etat.className = 'cp-mm-etat';
		fetch(C.api, { method: 'POST', body: d, headers: { 'X-WP-Nonce': C.nonce }, credentials: 'same-origin' })
			.then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
			.then(function (r) {
				if (!r.ok || !r.j.jeton) throw new Error((r.j && r.j.message) || 'Envoi impossible.');
				jetons[id] = r.j.jeton;
				if (cache) cache.value = r.j.jeton;
				etat.textContent = 'Capture reçue ✓'; etat.className = 'cp-mm-etat cp-mm-ok';
			})
			.catch(function (e) { etat.textContent = e.message + ' Vous pourrez aussi l\'envoyer après la commande.'; etat.className = 'cp-mm-etat cp-mm-ko'; });
	});

	// après chaque mise à jour du bloc de paiement par WooCommerce
	if (window.jQuery) {
		window.jQuery(document.body).on('updated_checkout', function () {
			Object.keys(jetons).forEach(function (id) {
				var c = document.getElementById('cp_mm_preuve_' + id);
				if (c && !c.value) {
					c.value = jetons[id];
					var e = c.parentNode.querySelector('.cp-mm-etat');
					if (e) { e.textContent = 'Capture reçue ✓'; e.className = 'cp-mm-etat cp-mm-ok'; }
				}
			});
		});
	}
})();
