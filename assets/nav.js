/* ---------------------------------------------------------------------------
   Navigation principale, rendue à l'identique sur les trois pages.

   Une seule source pour le menu : les pages ne portent qu'un conteneur vide,
   ce qui rend impossible la dérive d'un menu à l'autre.

   Deux natures de destination :
     - une autre page  → un lien,
     - une vue de l'assistant → sur index.html un bouton data-view, capté par
       app.js pour basculer sans recharger (le parcours en cours serait perdu
       sinon) ; ailleurs, un lien vers index.html?vue=…

   Ce script doit être chargé AVANT app.js : celui-ci recense les [data-view]
   une seule fois, au chargement.
   --------------------------------------------------------------------------- */

(function (global) {
  'use strict';

  const doc = global.document;

  /* Vues internes à index.html, regroupées sous « Documentation » : ce sont
     les contenus que l'on consulte, par opposition aux outils qui produisent
     quelque chose. */
  const DESTINATIONS = [
    { cle: 'assistant', libelle: 'Assistant', vue: 'assistant', apercu: 'Qualifier le sinistre' },
    {
      cle: 'documentation',
      libelle: 'Documentation',
      enfants: [
        { cle: 'fiches', libelle: 'Fiches conventions', vue: 'fiches', apercu: 'IRSI · CIDECOP · CIDEPIEC' },
        { cle: 'guides', libelle: 'Guides métier', vue: 'guides', apercu: 'Assiette, immobilier, pièges' },
        { cle: 'sources', libelle: 'Sources', vue: 'sources', apercu: 'Textes et réserves' },
      ],
    },
    { cle: 'expertise', libelle: 'Expertise', page: 'expertise.html', apercu: 'Capitaux, frais et textes' },
    { cle: 'phrases', libelle: 'Phrases type', page: 'phrases.html', apercu: 'Formules à copier' },
  ];

  const CHEVRON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" aria-hidden="true" class="nav__chevron">' +
    '<path d="M4 6.2 8 10.2 12 6.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function vueCourante() {
    return new global.URLSearchParams(global.location.search).get('vue') || 'assistant';
  }

  /* Une destination interne : bouton sur l'assistant, lien ailleurs.
     L'état actif est posé ici et non laissé à app.js : la barre doit être
     juste dès le premier rendu, même si le reste de la page échoue. */
  function elementVue(dest, surAssistant) {
    if (surAssistant) {
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.dataset.view = dest.vue;
      b.textContent = dest.libelle;
      if (dest.vue === vueCourante()) b.classList.add('is-active');
      return b;
    }
    const a = doc.createElement('a');
    a.className = 'tab';
    a.href = 'index.html?vue=' + dest.vue;
    a.textContent = dest.libelle;
    return a;
  }

  function elementPage(dest, pageCourante) {
    const a = doc.createElement('a');
    a.className = 'tab';
    a.href = dest.page;
    a.textContent = dest.libelle;
    if (dest.page === pageCourante) a.classList.add('is-active');
    return a;
  }

  function construireMenu(dest, surAssistant, pageCourante) {
    const enveloppe = doc.createElement('div');
    enveloppe.className = 'nav__menu';

    const bouton = doc.createElement('button');
    bouton.type = 'button';
    bouton.className = 'tab nav__declencheur';
    bouton.setAttribute('aria-expanded', 'false');
    bouton.setAttribute('aria-haspopup', 'true');
    bouton.appendChild(doc.createTextNode(dest.libelle));
    bouton.insertAdjacentHTML('beforeend', CHEVRON);

    const liste = doc.createElement('ul');
    liste.className = 'nav__liste';
    liste.hidden = true;

    dest.enfants.forEach((enfant) => {
      const li = doc.createElement('li');
      const lien = enfant.vue ? elementVue(enfant, surAssistant) : elementPage(enfant, pageCourante);
      /* .tab est conservé : c'est lui qui remet bouton et lien au même
         niveau, et app.js s'en sert pour marquer la vue ouverte. */
      lien.className = 'tab nav__item' + (lien.classList.contains('is-active') ? ' is-active' : '');
      lien.replaceChildren();
      const titre = doc.createElement('span');
      titre.className = 'nav__item-titre';
      titre.textContent = enfant.libelle;
      lien.appendChild(titre);
      if (enfant.apercu) {
        const apercu = doc.createElement('span');
        apercu.className = 'nav__item-apercu';
        apercu.textContent = enfant.apercu;
        lien.appendChild(apercu);
      }
      if (enfant.vue) lien.dataset.view = enfant.vue;
      li.appendChild(lien);
      liste.appendChild(li);
    });

    function ouvrir() {
      liste.hidden = false;
      bouton.setAttribute('aria-expanded', 'true');
      enveloppe.classList.add('is-open');
    }
    function fermer() {
      liste.hidden = true;
      bouton.setAttribute('aria-expanded', 'false');
      enveloppe.classList.remove('is-open');
    }
    bouton.addEventListener('click', function () {
      if (liste.hidden) ouvrir();
      else fermer();
    });
    liste.addEventListener('click', fermer);
    doc.addEventListener('mousedown', function (ev) {
      if (!enveloppe.contains(ev.target)) fermer();
    });
    doc.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape' || liste.hidden) return;
      fermer();
      bouton.focus();
    });

    enveloppe.appendChild(bouton);
    enveloppe.appendChild(liste);
    return { enveloppe: enveloppe, bouton: bouton };
  }

  function rendre() {
    const hote = doc.getElementById('nav-principal');
    if (!hote) return;

    /* Sur un serveur, index.html est aussi servi à la racine. */
    const fichier = String(global.location.pathname).split('/').pop() || 'index.html';
    const pageCourante = fichier === '' ? 'index.html' : fichier;
    const surAssistant = pageCourante === 'index.html';

    const menus = [];
    hote.replaceChildren();

    DESTINATIONS.forEach((dest) => {
      if (dest.enfants) {
        const menu = construireMenu(dest, surAssistant, pageCourante);
        menus.push({ dest: dest, bouton: menu.bouton });
        hote.appendChild(menu.enveloppe);
        return;
      }
      const el = dest.vue ? elementVue(dest, surAssistant) : elementPage(dest, pageCourante);
      if (dest.apercu) el.title = dest.apercu;
      hote.appendChild(el);
    });

    /* Le déclencheur d'un menu s'allume quand l'une de ses vues est ouverte :
       sinon, sur « Sources », plus rien dans la barre ne serait actif. */
    function majMenus(vue) {
      menus.forEach(function (m) {
        const actif = surAssistant && m.dest.enfants.some((e) => e.vue === vue);
        m.bouton.classList.toggle('is-active', actif);
      });
    }
    majMenus(surAssistant ? vueCourante() : null);
    /* Toute la page, pas seulement la barre : un lien vers les guides écrit
       dans le corps de l'assistant change aussi la vue courante. */
    doc.querySelectorAll('[data-view]').forEach(function (el) {
      el.addEventListener('click', function () {
        majMenus(el.dataset.view);
      });
    });
  }

  /* Rendu immédiat, et non au DOMContentLoaded : les scripts classiques en fin
     de body s'exécutent alors que readyState vaut encore « loading », donc
     attendre reviendrait à rendre la barre APRÈS app.js, qui ne recense les
     [data-view] qu'une fois — les entrées du menu resteraient sans effet.
     Le conteneur est dans l'en-tête, donc déjà là. Le report ne sert que si le
     script était un jour déplacé dans <head>. */
  if (doc.getElementById('nav-principal')) rendre();
  else doc.addEventListener('DOMContentLoaded', rendre);

  global.NAV = { destinations: DESTINATIONS, rendre: rendre };
})(typeof window !== 'undefined' ? window : global);
