/* ---------------------------------------------------------------------------
   Cartes de phrase copiables.

   Une carte porte le texte et un bouton en haut à droite. Un clic sur le
   bouton ou n'importe où sur la carte copie la phrase ; le bouton passe
   brièvement à la coche verte.

   Le bouton est le vrai contrôle, seul atteignable au clavier : le clic sur la
   carte n'est qu'un raccourci à la souris. On évite ainsi deux arrêts de
   tabulation pour une même action.
   --------------------------------------------------------------------------- */

(function (global) {
  'use strict';

  const SVG = 'http://www.w3.org/2000/svg';
  const DUREE_COCHE = 1400;

  function icone(chemins, titre) {
    const svg = global.document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'copie__icone copie__icone--' + titre);
    chemins.forEach(function (d) {
      const forme = global.document.createElementNS(SVG, d.rect ? 'rect' : 'path');
      Object.keys(d).forEach(function (attr) {
        if (attr !== 'rect') forme.setAttribute(attr, d[attr]);
      });
      svg.appendChild(forme);
    });
    return svg;
  }

  function iconeCopier() {
    return icone(
      [
        { rect: true, x: '9', y: '9', width: '13', height: '13', rx: '2' },
        { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' },
      ],
      'copier'
    );
  }

  function iconeFait() {
    return icone([{ d: 'M20 6 9 17l-5-5' }], 'fait');
  }

  function copier(texte) {
    const presse = global.navigator && global.navigator.clipboard;
    if (!presse || !presse.writeText) return Promise.reject(new Error('presse-papiers indisponible'));
    return presse.writeText(texte);
  }

  /* Une sélection en cours veut dire que l'utilisateur choisit un extrait :
     copier tout le bloc par-dessus lui prendrait sa sélection. */
  function selectionEnCours() {
    const s = global.getSelection && global.getSelection();
    return !!s && String(s).trim() !== '';
  }

  /* Bouton de copie, seul geste de copie de l'application : même icône, même
     coche, même durée partout.

     lireTexte est une fonction et non une chaîne : un champ calculé change de
     contenu sans que le bouton soit reconstruit. `hote`, s'il est fourni, reçoit
     les classes d'état pour teinter tout le bloc. */
  function bouton(lireTexte, options) {
    const opts = options || {};
    const el = global.document.createElement('button');
    el.type = 'button';
    el.className = 'copie__bouton' + (opts.classe ? ' ' + opts.classe : '');
    const libelle = opts.libelle || 'Copier';
    el.setAttribute('aria-label', libelle);
    el.title = 'Copier';
    el.appendChild(iconeCopier());
    el.appendChild(iconeFait());

    const hote = opts.hote || null;
    let minuteur = null;

    function marquer(classe) {
      el.classList.toggle('is-fait', classe === 'is-copie');
      if (hote) {
        hote.classList.toggle('is-copie', classe === 'is-copie');
        hote.classList.toggle('is-echec', classe === 'is-echec');
      }
      el.setAttribute('aria-label', classe === 'is-copie' ? 'Copié' : libelle);
      if (minuteur) global.clearTimeout(minuteur);
      if (!classe) return;
      minuteur = global.setTimeout(function () {
        marquer('');
      }, DUREE_COCHE);
    }

    function lancer() {
      const texte = String(lireTexte() == null ? '' : lireTexte()).trim();
      /* Un champ vide ou à « — » n'a rien à copier. */
      if (texte === '' || texte === '—') return;
      copier(texte).then(
        function () {
          marquer('is-copie');
        },
        function () {
          marquer('is-echec');
        }
      );
    }

    el.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      lancer();
    });
    el.lancerCopie = lancer;
    return el;
  }

  /* Toute la zone copie, pas seulement le bouton : c'est ce qui rend le geste
     évident. Le bouton reste le seul contrôle atteignable au clavier. */
  function rendreCliquable(zone, declencheur) {
    zone.addEventListener('click', function () {
      if (selectionEnCours()) return;
      declencheur.lancerCopie();
    });
  }

  function carte(texte, options) {
    const opts = options || {};
    const bloc = global.document.createElement('div');
    bloc.className = 'copie';

    const corps = global.document.createElement('p');
    corps.className = 'copie__texte';
    corps.textContent = texte;

    const declencheur = bouton(
      function () {
        return texte;
      },
      { libelle: opts.libelle || 'Copier la phrase', hote: bloc }
    );

    rendreCliquable(bloc, declencheur);

    bloc.appendChild(corps);
    bloc.appendChild(declencheur);
    return bloc;
  }

  global.COPIE = { carte: carte, bouton: bouton, rendreCliquable: rendreCliquable, copier: copier };
})(typeof window !== 'undefined' ? window : global);
