/* ---------------------------------------------------------------------------
   Page « Phrases type » : les sections de data/expertise.json → phrasesType,
   rendues en cartes copiables.
   --------------------------------------------------------------------------- */

(function () {
  'use strict';

  const E = window.EXPERTISE;
  const $ = (id) => document.getElementById(id);

  const adh = window.ADH || { sigle: 'ADH', nom: 'AssuDecisionHelper', version: '0.0.0' };
  const brand = $('brand-version');
  const foot = $('footer-version');
  if (brand) brand.textContent = 'v' + adh.version;
  if (foot) foot.textContent = `${adh.nom} (${adh.sigle}) — version ${adh.version}`;

  function squelettes() {
    const host = $('phr-sections');
    host.setAttribute('aria-busy', 'true');
    const blocs = [];
    for (let i = 0; i < 4; i++) {
      const carte = document.createElement('section');
      carte.className = 'exp-card';
      const titre = document.createElement('span');
      titre.className = 'skel skel--label';
      titre.style.width = '38%';
      carte.appendChild(titre);
      for (let j = 0; j < 2; j++) {
        const bloc = document.createElement('span');
        bloc.className = 'skel skel--bloc';
        carte.appendChild(bloc);
      }
      blocs.push(carte);
    }
    host.replaceChildren(...blocs);
  }

  function render(sections) {
    const host = $('phr-sections');
    host.removeAttribute('aria-busy');
    host.replaceChildren();

    if (!sections.length) {
      const vide = document.createElement('p');
      vide.className = 'muted small';
      vide.textContent = 'Aucune phrase type au référentiel.';
      host.appendChild(vide);
      return;
    }

    sections.forEach((section, rang) => {
      const carte = document.createElement('section');
      carte.className = 'exp-card';

      const idTitre = 'phr-titre-' + rang;
      const titre = document.createElement('h2');
      titre.id = idTitre;
      titre.textContent = section.titre;
      carte.setAttribute('aria-labelledby', idTitre);
      carte.appendChild(titre);

      if (!section.phrases.length) {
        const vide = document.createElement('p');
        vide.className = 'muted small';
        vide.textContent = 'Section à compléter dans data/expertise.json.';
        carte.appendChild(vide);
      }

      const pile = document.createElement('div');
      pile.className = 'phrases-pile';
      section.phrases.forEach((phrase) => {
        pile.appendChild(window.COPIE.carte(phrase, { libelle: 'Copier la phrase — ' + section.titre }));
      });
      carte.appendChild(pile);
      host.appendChild(carte);
    });
  }

  squelettes();

  fetch('data/expertise.json', { cache: 'no-store' })
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((json) => {
      render(E.phrasesTypePour(json));
    })
    .catch((err) => {
      const host = $('phr-sections');
      host.removeAttribute('aria-busy');
      host.replaceChildren();
      const zone = $('phr-erreur');
      zone.hidden = false;
      zone.textContent = 'Impossible de charger les phrases type (' + err.message + ').';
    });
})();
