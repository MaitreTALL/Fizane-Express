/* Cargo Plateforme — simulateur de tarif, suivi de colis, déclaration d'envoi (sans dépendance). */
(function () {
  'use strict';
  var C = window.CARGO || { modes: [], devise: 'FCFA', frais: {} };
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var prix = function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + C.devise; };
  var nb = function (n, d) { return (+n).toLocaleString('fr-FR', { maximumFractionDigits: d === undefined ? 2 : d }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var delai = function (m) {
    var a = +m.delai_min, b = +m.delai_max;
    if (a >= 14 && a % 7 === 0 && b % 7 === 0) return a / 7 + ' à ' + b / 7 + ' semaines';
    if (a >= 45) return 'environ ' + Math.round((a + b) / 60) + ' mois';
    return a + ' à ' + b + ' jours';
  };

  /* jeton de sécurité frais : la page peut venir d'un cache (CDN) avec un jeton périmé */
  function jeton() {
    if (!C.ajax || !window.fetch) return Promise.resolve(C.nonce);
    return fetch(C.ajax + '?action=cp_jeton', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) { return j && j.nonce ? j.nonce : C.nonce; }, function () { return C.nonce; });
  }

  /* -------------------------------------------------- calcul (identique à inc/tarifs.php) */
  function calcul(m, colis, valeur) {
    var poids = 0, vol = 0;
    colis.forEach(function (c) {
      var n = Math.max(1, parseInt(c.nombre, 10) || 1);
      poids += Math.max(0, +c.poids || 0) * n;
      vol += Math.max(0, +c.longueur || 0) * Math.max(0, +c.largeur || 0) * Math.max(0, +c.hauteur || 0) * n;
    });
    var r = { m: m, poids: poids, volume: vol / 1e6 }, q;
    if (m.unite === 'm3') {
      q = Math.ceil(vol / 1e6 * 100 - 1e-9) / 100;
      r.facture = Math.max(q, +m.minimum);
    } else {
      var v = +m.diviseur ? vol / +m.diviseur : 0;
      r.volumetrique = v;
      q = Math.ceil(Math.max(poids, v) * 2 - 1e-9) / 2;
      r.facture = Math.max(q, +m.minimum);
    }
    var frais = Math.round(+(C.frais && C.frais.fixe) || 0), ass = Math.round((+valeur || 0) * (+(C.frais && C.frais.assurance) || 0) / 100);
    r.total = Math.round(r.facture * +m.prix) + frais + ass;
    if (+m.prix_alt) r.total_alt = Math.round(r.facture * +m.prix_alt) + frais + ass;
    return r;
  }

  /* -------------------------------------------------- simulateur */
  $$('[data-cp="simulateur"]').forEach(function (box) {
    var lignes = $('[data-cp="lignes"]', box), res = $('[data-cp="resultats"]', box);
    function lire() {
      return $$('.cp-colis-ligne', lignes).map(function (l) {
        var o = {}; $$('input', l).forEach(function (i) { o[i.dataset.champ] = i.value.replace(',', '.'); }); return o;
      });
    }
    function afficher() {
      var colis = lire();
      var vide = !colis.some(function (c) { return +c.poids || (+c.longueur && +c.largeur && +c.hauteur); });
      if (vide) { res.innerHTML = '<p class="cp-aide">Le prix s\'affiche dès que vous saisissez un poids ou des dimensions.</p>'; return; }
      var meilleur = null;
      var cartes = C.modes.map(function (m) {
        var r = calcul(m, colis, 0);
        if (!meilleur || r.total < meilleur) meilleur = r.total;
        var detail = m.unite === 'm3' ? nb(r.facture) + ' m³ facturé' + (r.facture > 1 ? 's' : '') + ' (' + nb(r.volume, 3) + ' m³ mesurés)'
          : nb(r.facture, 1) + ' kg facturés' + (r.volumetrique > r.poids ? ' (poids volumétrique)' : '');
        return '<div class="cp-res" data-total="' + r.total + '"><div class="cp-res-ico">' + (m.unite === 'm3' ? '⛴' : '✈') + '</div><div class="cp-res-txt"><b>' + esc(m.nom) + '</b><small>' + esc(detail) + '</small><small>Délai : ' + esc(delai(m)) + '</small></div>'
          + '<div class="cp-res-prix">' + prix(r.total) + (r.total_alt ? '<small>' + esc(m.prix_alt_libelle || 'Autre tarif') + ' : ' + prix(r.total_alt) + '</small>' : '') + '</div>'
          + '<a class="cp-btn cp-btn-petit" href="' + esc(C.pages.declarer) + '?mode=' + encodeURIComponent(m.id) + '">Expédier</a></div>';
      });
      res.innerHTML = cartes.join('');
      $$('.cp-res', res).forEach(function (el) { if (+el.dataset.total === meilleur) el.classList.add('cp-res-meilleur'); });
    }
    box.addEventListener('input', afficher);
    $('[data-cp="ajouter-ligne"]', box).addEventListener('click', function () {
      var l = $('.cp-colis-ligne', lignes).cloneNode(true);
      $$('input', l).forEach(function (i) { i.value = i.dataset.champ === 'nombre' ? 1 : ''; });
      lignes.appendChild(l); afficher();
    });
    afficher();
  });

  /* -------------------------------------------------- suivi */
  $$('[data-cp="suivi"]').forEach(function (box) {
    var f = $('[data-cp="suivi-form"]', box), out = $('[data-cp="suivi-resultat"]', box);
    function chercher(code) {
      code = (code || '').trim().toUpperCase();
      if (!code) return;
      out.innerHTML = '<p class="cp-aide">Recherche…</p>';
      fetch(C.api + 'suivi/' + encodeURIComponent(code)).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (x) {
        if (!x.ok) { out.innerHTML = '<p class="cp-erreur">' + esc(x.j.message || 'Envoi introuvable.') + '</p>'; return; }
        var d = x.j, h = '<div class="cp-suivi-tete"><div><span class="cp-sur">' + esc(d.mode) + '</span><h3>' + esc(d.code) + '</h3><p>' + esc(d.statut) + '</p></div><div class="cp-suivi-info">'
          + (d.colis ? '<span>' + d.colis + ' colis</span>' : '') + (d.mesure ? '<span>' + esc(d.mesure) + '</span>' : '') + '<span>Déclaré le ' + esc(d.date) + '</span></div></div>';
        if (d.arrivee) h += '<p class="cp-arrivee">' + esc(d.arrivee) + '</p>';
        h += '<ol class="cp-chrono">' + d.etapes.map(function (e) {
          return '<li class="' + (e.fait ? 'cp-fait' : '') + '"><b>' + esc(e.nom) + '</b>' + (e.date ? '<time>' + esc(e.date) + (e.lieu ? ' — ' + esc(e.lieu) : '') + '</time>' : '') + (e.fait && e.texte ? '<span>' + esc(e.texte) + '</span>' : '') + (e.note ? '<em>' + esc(e.note) + '</em>' : '') + '</li>';
        }).join('') + '</ol>';
        out.innerHTML = h;
      }).catch(function () { out.innerHTML = '<p class="cp-erreur">Connexion impossible. Réessayez.</p>'; });
    }
    f.addEventListener('submit', function (ev) { ev.preventDefault(); var c = f.code.value; chercher(c); history.replaceState(null, '', '?code=' + encodeURIComponent(c.trim().toUpperCase())); });
    if (f.code.value) chercher(f.code.value);
  });

  /* -------------------------------------------------- déclaration d'un envoi */
  $$('[data-cp="declarer"]').forEach(function (box) {
    var f = $('[data-cp="declarer-form"]', box), err = $('[data-cp="erreur"]', box), ok = $('[data-cp="succes"]', box);
    var m = new URLSearchParams(location.search).get('mode');
    if (m) { var r = $('input[name="mode"][value="' + m.replace(/[^a-z0-9_-]/gi, '') + '"]', f); if (r) r.checked = true; }
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      err.textContent = '';
      var fd = new FormData(f), data = {};
      fd.forEach(function (v, k) {
        var parts = k.replace(/\]/g, '').split('['), o = data;
        parts.forEach(function (p, i) { if (i === parts.length - 1) o[p] = v; else o = o[p] = o[p] || {}; });
      });
      if (data.colis) data.colis = Object.keys(data.colis).map(function (k) { return data.colis[k]; });
      var bouton = $('button[type="submit"]', f); bouton.disabled = true; bouton.textContent = 'Enregistrement…';
      jeton().then(function (n) { return fetch(C.api + 'declarer', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': n }, body: JSON.stringify(data) }); })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          bouton.disabled = false; bouton.textContent = 'Obtenir mon code d\'envoi';
          if (!x.ok) { err.textContent = x.j.message || 'Erreur.'; err.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
          var d = x.j;
          f.hidden = true; ok.hidden = false;
          ok.innerHTML = '<div class="cp-succes-code"><span>Votre code d\'envoi</span><b>' + esc(d.code) + '</b><em>' + esc(d.mode) + '</em></div>'
            + '<p>' + esc(d.consigne) + '</p>'
            + '<div class="cp-adresse-bloc"><b>Faites livrer vos colis à notre entrepôt :</b><p class="cp-adresse">' + esc(d.entrepot).replace(/\n/g, '<br>') + '</p><button type="button" class="cp-lien" data-copier>Copier l\'adresse</button></div>'
            + '<div class="cp-boutons"><a class="cp-btn" target="_blank" href="' + esc(d.fiche) + '">Bordereau (PDF)</a><a class="cp-btn cp-btn-clair" target="_blank" href="' + esc(d.etiquettes) + '">Étiquettes cartons (PDF)</a>'
            + (d.whatsapp ? '<a class="cp-btn cp-btn-wa" target="_blank" href="' + esc(d.whatsapp) + '">Prévenir sur WhatsApp</a>' : '') + '<a class="cp-btn cp-btn-clair" href="' + esc(d.suivi) + '">Suivre mon envoi</a></div>'
            + '<p class="cp-note">Le bordereau et les étiquettes vous ont aussi été envoyés à ' + esc(d.email) + '.</p>';
          var c = $('[data-copier]', ok);
          if (c) c.addEventListener('click', function () { navigator.clipboard && navigator.clipboard.writeText(d.entrepot).then(function () { c.textContent = 'Adresse copiée ✓'; }); });
          ok.scrollIntoView({ behavior: 'smooth', block: 'start' });
        })
        .catch(function () { bouton.disabled = false; bouton.textContent = 'Obtenir mon code d\'envoi'; err.textContent = 'Connexion impossible. Réessayez.'; });
    });
  });
  /* -------------------------------------------------- accueil : devis en ligne */
  $$('[data-cp="devis"]').forEach(function (f) {
    var out = $('[data-cp="devis-resultat"]', f);
    function calculer(ev) {
      if (ev) ev.preventDefault();
      var v = function (n) { return String(f.elements[n].value || '').replace(',', '.'); };
      var m = C.modes.filter(function (x) { return x.id === f.elements.mode.value; })[0];
      if (!m) return;
      var colis = [{ nombre: v('nombre') || 1, poids: v('poids'), longueur: v('longueur'), largeur: v('largeur'), hauteur: v('hauteur') }];
      var dims = +colis[0].longueur && +colis[0].largeur && +colis[0].hauteur;
      if (m.unite === 'm3' ? !dims : !(+colis[0].poids || dims)) {
        out.innerHTML = '<p class="cp-a-devis-erreur">' + (m.unite === 'm3' ? 'Par bateau, le prix dépend du volume : indiquez les dimensions (L × l × h) d\'un colis.' : 'Indiquez le poids ou les dimensions d\'un colis.') + '</p>';
        return;
      }
      var r = calcul(m, colis, 0);
      var q = m.unite === 'm3' ? nb(r.facture) + ' m³ facturé' + (r.facture > 1 ? 's' : '') : nb(r.facture, 1) + ' kg facturés' + (r.volumetrique > r.poids ? ' (poids volumétrique)' : '');
      out.innerHTML = '<div class="cp-a-devis-prix">' + prix(r.total) + '<small>' + esc(m.nom) + ' · ' + esc(q) + ' · délai ' + esc(delai(m)) + (r.total_alt ? ' · ' + esc(m.prix_alt_libelle || 'Autre tarif') + ' : ' + prix(r.total_alt) : '') + '</small></div>'
        + '<a class="cp-btn cp-btn-action" href="' + esc(C.pages.declarer) + '?mode=' + encodeURIComponent(m.id) + '">Expédier ce colis</a>';
    }
    f.addEventListener('submit', calculer);
    f.addEventListener('change', function () { if (out.innerHTML) calculer(); });
  });

  var anims = $$('.cp-anim');
  if (anims.length && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('cp-js');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('cp-vu'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    anims.forEach(function (el) {
      var i = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.transitionDelay = Math.min(i, 6) * 70 + 'ms';
      io.observe(el);
    });
  }
})();
