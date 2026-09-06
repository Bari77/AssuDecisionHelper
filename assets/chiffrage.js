/* ---------------------------------------------------------------------------
   Page « Chiffrage » : recherche d'ensembles de postes liés, montants copiables.
   --------------------------------------------------------------------------- */

(function () {
  'use strict';

  const C = window.CHIFFRAGE;
  const $ = (id) => document.getElementById(id);

  const adh = window.ADH || { sigle: 'ADH', nom: 'AssuDecisionHelper', version: '0.0.0' };
  const brand = $('brand-version');
  const foot = $('footer-version');
  if (brand) brand.textContent = 'v' + adh.version;
  if (foot) foot.textContent = `${adh.nom} (${adh.sigle}) — version ${adh.version}`;

  let db = null;
  let selection = '';

  function liste(items) {
    const ul = document.createElement('ul');
    ul.className = 'exp-chiffrage__liste';
    (items || []).forEach((ligne) => {
      const li = document.createElement('li');
      li.textContent = ligne;
      ul.appendChild(li);
    });
    return ul;
  }

  function rendreTva(postes) {
    const host = $('chf-tva');
    host.replaceChildren();
    (postes || []).forEach((poste) => {
      const carte = document.createElement('article');
      carte.className = 'exp-tva';
      const taux = document.createElement('div');
      taux.className = 'exp-tva__taux';
      taux.textContent = poste.taux || '';
      carte.appendChild(taux);
      if (poste.titre) {
        const titre = document.createElement('div');
        titre.className = 'exp-tva__titre';
        titre.textContent = poste.titre;
        carte.appendChild(titre);
      }
      if ((poste.lignes || []).length) carte.appendChild(liste(poste.lignes));
      host.appendChild(carte);
    });
  }

  function rendreIndic(lignes) {
    const host = $('chf-indic');
    host.replaceChildren();
    if (!(lignes || []).length) {
      const p = document.createElement('p');
      p.className = 'muted small';
      p.textContent = 'À compléter dans data/chiffrage.json.';
      host.appendChild(p);
      return;
    }
    host.appendChild(liste(lignes));
  }

  function rendreContrat() {
    const ref = $('chf-contrat-ref');
    const corps = $('chf-contrat-corps');
    const actif = window.CONTRAT_ACTIF && window.CONTRAT_ACTIF.lire();

    ref.replaceChildren();
    corps.replaceChildren();

    if (!actif || (!actif.compagnie && !actif.numero)) {
      const p = document.createElement('p');
      p.className = 'muted small';
      p.innerHTML =
        'Aucun contrat choisi dans <a href="expertise.html">Expertise</a>. Sélectionnez compagnie, type et numéro : les indications s’afficheront ici.';
      corps.appendChild(p);
      return;
    }

    const libelle = actif.libelle || [actif.compagnie, actif.typeContrat, actif.numero].filter(Boolean).join(' - ');
    const strong = document.createElement('strong');
    strong.textContent = libelle;
    ref.appendChild(strong);
    if (actif.option) {
      ref.appendChild(document.createTextNode(' · option « ' + actif.option + ' »'));
    }

    if (actif.statut !== 'ok') {
      const p = document.createElement('p');
      p.className = 'muted small chf-contrat__alerte';
      p.textContent =
        actif.statut === 'chargement'
          ? 'Fiche en cours de chargement dans Expertise — revenez dans un instant ou rouvrez cette page.'
          : 'Contrat non résolu dans Expertise (incomplet, inconnu ou en attente). Les indications contrat ne s’appliquent qu’à une fiche valide.';
      corps.appendChild(p);
      return;
    }

    const indic = C.indicationsContratPour(db, actif);
    if (indic.lignes.length) {
      indic.lignes.forEach((ligne) => {
        corps.appendChild(window.COPIE.carte(ligne, { libelle: 'Copier l’indication contrat' }));
      });
      return;
    }

    const p = document.createElement('p');
    p.className = 'muted small';
    p.textContent =
      db.placeholderContrat || 'Aucune indication de chiffrage pour ce contrat au référentiel.';
    corps.appendChild(p);
  }

  function ecouterContrat() {
    const store = window.CONTRAT_ACTIF;
    if (!store) return;
    window.addEventListener('storage', function (ev) {
      if (ev.key === store.CLE) rendreContrat();
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) rendreContrat();
    });
  }

  function resumeEnsemble(ensemble) {
    const principal = ensemble.postes.find((p) => p.principal) || ensemble.postes[0];
    if (!principal) return '';
    let texte = C.ligneMontant(principal);
    if (ensemble.postes.length > 1) {
      texte += ' · +' + (ensemble.postes.length - 1) + ' poste(s) lié(s)';
    }
    return texte;
  }

  function boutonEnsemble(ensemble) {
    const li = document.createElement('li');
    li.className = 'chf-resultat';
    li.setAttribute('role', 'option');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chf-resultat__btn' + (selection === ensemble.id ? ' is-active' : '');
    btn.dataset.ensemble = ensemble.id;

    const titre = document.createElement('span');
    titre.className = 'chf-resultat__titre';
    titre.textContent = ensemble.libelle;

    const montant = document.createElement('span');
    montant.className = 'chf-resultat__montant';
    montant.textContent = resumeEnsemble(ensemble);

    btn.appendChild(titre);
    btn.appendChild(montant);
    btn.addEventListener('click', function () {
      selection = ensemble.id;
      rendreResultats();
      rendreDetail();
    });

    li.appendChild(btn);
    return li;
  }

  function rendreResultats() {
    const query = $('chf-query').value;
    const host = $('chf-resultats');
    const compteur = $('chf-compteur');
    const rows = C.rechercher(db, query);

    host.replaceChildren();
    if (!rows.length) {
      compteur.textContent = query ? 'Aucun poste pour « ' + query.trim() + ' ».' : 'Aucun poste au référentiel.';
      selection = '';
      rendreDetail();
      return;
    }

    compteur.textContent =
      rows.length +
      ' ensemble' +
      (rows.length > 1 ? 's' : '') +
      (query.trim() ? ' pour « ' + query.trim() + ' »' : '');

    rows.forEach((ensemble) => {
      host.appendChild(boutonEnsemble(ensemble));
    });

    if (!selection || !rows.some((e) => e.id === selection)) {
      selection = rows[0].id;
    }
    rendreDetail();
  }

  function cartePoste(poste) {
    const article = document.createElement('article');
    article.className = 'chf-poste' + (poste.principal ? ' chf-poste--principal' : '');

    const entete = document.createElement('div');
    entete.className = 'chf-poste__entete';

    const libelle = document.createElement('h3');
    libelle.className = 'chf-poste__libelle';
    libelle.textContent = poste.libelle;

    const montant = document.createElement('div');
    montant.className = 'chf-poste__montant';
    montant.textContent = C.ligneMontant(poste);

    entete.appendChild(libelle);
    entete.appendChild(montant);

    if (poste.note) {
      const note = document.createElement('p');
      note.className = 'chf-poste__note muted small';
      note.textContent = poste.note;
      article.appendChild(entete);
      article.appendChild(note);
    } else {
      article.appendChild(entete);
    }

    const copie = window.COPIE.carte(C.texteCopiePoste(poste), {
      libelle: 'Copier — ' + poste.libelle,
    });
    copie.classList.add('chf-poste__copie');
    article.appendChild(copie);
    return article;
  }

  function rendreDetail() {
    const section = document.querySelector('.chf-detail');
    const intro = $('chf-detail-intro');
    const host = $('chf-postes');
    const ensemble = selection ? C.ensembleParId(db, selection) : null;

    if (!ensemble) {
      section.hidden = true;
      host.replaceChildren();
      intro.textContent = '';
      return;
    }

    section.hidden = false;
    $('titre-detail').textContent = ensemble.libelle;
    intro.textContent =
      ensemble.postes.length > 1
        ? 'Les postes ci-dessous vont ensemble : chaque ligne est copiable séparément.'
        : 'Montant indicatif — copiez la ligne pour la coller au dossier.';

    host.replaceChildren();
    ensemble.postes.forEach((poste) => {
      host.appendChild(cartePoste(poste));
    });
  }

  function squelettes() {
    $('chf-resultats').replaceChildren();
    $('chf-compteur').textContent = 'Chargement…';
  }

  squelettes();

  fetch('data/chiffrage.json', { cache: 'no-store' })
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((json) => {
      db = C.preparer(json);
      rendreTva(db.tva);
      rendreIndic(db.indicationsGenerales);
      rendreContrat();
      ecouterContrat();
      rendreResultats();
      $('chf-query').addEventListener('input', rendreResultats);
    })
    .catch((err) => {
      const zone = $('chf-erreur');
      zone.hidden = false;
      zone.textContent = 'Impossible de charger le référentiel chiffrage (' + err.message + ').';
      $('chf-compteur').textContent = '';
    });
})();
