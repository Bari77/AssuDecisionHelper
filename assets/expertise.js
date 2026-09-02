/* ---------------------------------------------------------------------------
   Formulaire d'expertise : saisie → résolution JSON → champs calculés.
   --------------------------------------------------------------------------- */

(function () {
  'use strict';

  const E = window.EXPERTISE;
  const $ = (id) => document.getElementById(id);

  let db = null;
  let natureDommages = '';
  const combos = {};

  const adh = window.ADH || { sigle: 'ADH', nom: 'AssuDecisionHelper', version: '0.0.0' };
  const brand = $('brand-version');
  const foot = $('footer-version');
  if (brand) brand.textContent = 'v' + adh.version;
  if (foot) foot.textContent = `${adh.nom} (${adh.sigle}) — version ${adh.version}`;

  function normaliser(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function itemsDepuis(valeurs) {
    return (valeurs || [])
      .map((v) => {
        if (v == null || v === '') return null;
        if (typeof v === 'string') return { value: v, label: v };
        return { value: v.code || v.value, label: v.libelle || v.label || v.value };
      })
      .filter(Boolean);
  }

  function trierAlpha(valeurs) {
    return (valeurs || []).slice().sort(function (a, b) {
      const la = typeof a === 'string' ? a : a.libelle || a.code || '';
      const lb = typeof b === 'string' ? b : b.libelle || b.code || '';
      return la.localeCompare(lb, 'fr', { sensitivity: 'base' });
    });
  }

  function creerCombo(conteneur, options) {
    const opts = options || {};
    const hidden = opts.hidden;
    let items = [];
    let valeur = '';
    let ouvert = false;
    let index = -1;

    const wrap = document.createElement('div');
    wrap.className = 'combo';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'field__input saisie combo__input';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = opts.placeholder || 'Rechercher…';

    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'combo__chevron';
    bouton.setAttribute('aria-label', 'Ouvrir la liste');
    bouton.tabIndex = -1;
    bouton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6.2 8 10.2 12 6.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const list = document.createElement('ul');
    list.className = 'combo__list';
    list.setAttribute('role', 'listbox');
    list.hidden = true;

    wrap.appendChild(input);
    wrap.appendChild(bouton);
    wrap.appendChild(list);
    conteneur.replaceChildren(wrap);

    function ecrireCache() {
      if (hidden) hidden.value = valeur;
    }

    function libelleDe(val) {
      const it = items.find((x) => x.value === val);
      return it ? it.label : '';
    }

    function fermer() {
      ouvert = false;
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      wrap.classList.remove('is-open');
      index = -1;
    }

    function visibles() {
      const q = normaliser(input.value);
      const actuel = libelleDe(valeur);
      if (!q || normaliser(actuel) === q) return items.slice();
      return items.filter(function (it) {
        if (normaliser(it.label).indexOf(q) !== -1 || normaliser(it.value).indexOf(q) !== -1) return true;
        return (it.aliases || []).some((a) => normaliser(a).indexOf(q) !== -1);
      });
    }

    function dessiner() {
      const rows = visibles();
      list.replaceChildren();
      if (!items.length) {
        const li = document.createElement('li');
        li.className = 'combo__vide';
        li.textContent = 'Aucune fiche pour ce filtre';
        list.appendChild(li);
        return rows;
      }
      if (!rows.length) {
        const li = document.createElement('li');
        li.className = 'combo__vide';
        li.textContent = 'Aucun résultat';
        list.appendChild(li);
        return rows;
      }
      rows.forEach((it, i) => {
        const li = document.createElement('li');
        li.className = 'combo__item' + (it.value === valeur ? ' is-selected' : '') + (i === index ? ' is-active' : '');
        li.setAttribute('role', 'option');
        li.textContent = it.label;
        li.addEventListener('mousedown', (ev) => {
          ev.preventDefault();
          choisir(it);
        });
        list.appendChild(li);
      });
      return rows;
    }

    function selectionnerTout() {
      if (!input.value) return;
      input.select();
    }

    function ouvrir() {
      ouvert = true;
      wrap.classList.add('is-open');
      input.setAttribute('aria-expanded', 'true');
      list.hidden = false;
      index = Math.max(
        0,
        visibles().findIndex((it) => it.value === valeur)
      );
      dessiner();
    }

    function choisir(it) {
      if (!it && opts.vide) it = opts.vide;
      valeur = it ? it.value : '';
      input.value = it ? it.label : '';
      ecrireCache();
      fermer();
      if (opts.onChange) opts.onChange(valeur);
    }

    function validerTexte() {
      const q = normaliser(input.value);
      if (!q) {
        choisir(null);
        return;
      }
      const rows = visibles();
      const exact = items.find((it) => normaliser(it.label) === q || normaliser(it.value) === q);
      if (exact) choisir(exact);
      else if (rows.length === 1) choisir(rows[0]);
      else {
        input.value = libelleDe(valeur);
        fermer();
      }
    }

    let garderSelection = false;

    input.addEventListener('focus', () => {
      garderSelection = true;
      ouvrir();
      selectionnerTout();
    });
    input.addEventListener('mouseup', (ev) => {
      if (!garderSelection) return;
      ev.preventDefault();
      selectionnerTout();
      garderSelection = false;
    });
    input.addEventListener('input', ouvrir);
    input.addEventListener('keydown', (ev) => {
      const rows = visibles();
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (!ouvert) ouvrir();
        index = Math.min(rows.length - 1, index + 1);
        dessiner();
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        index = Math.max(0, index - 1);
        dessiner();
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        if (ouvert && rows[index]) choisir(rows[index]);
        else validerTexte();
      } else if (ev.key === 'Escape') {
        input.value = libelleDe(valeur);
        fermer();
      }
    });
    input.addEventListener('blur', () => {
      setTimeout(validerTexte, 120);
    });
    bouton.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      if (ouvert) fermer();
      else {
        input.focus();
        ouvrir();
      }
    });
    document.addEventListener('mousedown', (ev) => {
      if (!wrap.contains(ev.target)) fermer();
    });

    return {
      setItems: function (valeurs) {
        const base = itemsDepuis(valeurs);
        items = opts.vide ? [opts.vide].concat(base) : base;
        if (valeur && !items.some((it) => it.value === valeur)) {
          valeur = opts.vide ? opts.vide.value : '';
          input.value = opts.vide ? opts.vide.label : '';
          ecrireCache();
        } else {
          input.value = libelleDe(valeur);
        }
      },
      setValue: function (val) {
        if (val && !items.some((it) => it.value === val)) return;
        valeur = val || '';
        input.value = libelleDe(valeur);
        ecrireCache();
      },
      getValue: function () {
        return valeur;
      },
    };
  }

  function saisie() {
    return {
      nature: $('exp-nature').value,
      compagnie: $('exp-compagnie').value,
      typeContrat: $('exp-type').value,
      numero: $('exp-numero').value,
      option: $('exp-option').value,
    };
  }

  function champsTexte() {
    const qualite = $('exp-qualite').value;
    const typeBien = $('exp-bien').value;
    const debut = $('exp-sinistre-debut').value;
    return Object.assign(
      {
        civilite: $('exp-civilite').value,
        nom: $('exp-nom').value,
        adresse: $('exp-adresse').value,
        commune: $('exp-commune').value,
        date: E.formaterDate($('exp-date').value) || $('exp-date').value,
        qualite: qualite,
        typeBien: typeBien,
        nature: $('exp-nature').value,
        compagnie: $('exp-compagnie').value,
        dateSinistre: E.formaterDate(debut) || debut,
        periode: E.periodeSinistre(debut, $('exp-sinistre-fin').value),
        tempete: $('exp-tempete').value,
        vitesseVent: $('exp-vent').value,
        alentour: $('exp-alentour').value,
      },
      E.accordDuBien(db, qualite, typeBien)
    );
  }

  /* Les champs marqués data-champ-modele ne s'affichent que si le modèle actif
     cite l'une de leurs variables. Un nouveau modèle fait donc apparaître ses
     champs sans toucher au HTML. */
  function ajusterChampsModele(modele) {
    const utilisees = E.variablesDe(modele.causesCirconstances);
    document.querySelectorAll('[data-champ-modele]').forEach((champ) => {
      const cles = champ.getAttribute('data-champ-modele').split(/\s+/);
      champ.hidden = !cles.some((cle) => utilisees.indexOf(cle) !== -1);
    });
  }

  /* ---------------------------------------------------------------------------
     Squelettes d'attente. Deux portées : au démarrage tout le formulaire est en
     attente du référentiel ; ensuite seuls les panneaux liés au contrat
     attendent le fichier de la compagnie.
     --------------------------------------------------------------------------- */

  const CHAMPS_COMBO = [
    'combo-nature',
    'combo-compagnie',
    'combo-type',
    'combo-numero',
    'combo-option',
    'combo-civilite',
    'combo-qualite',
    'combo-bien',
    'combo-alentour',
  ];

  function squelette(variante, largeur) {
    const el = document.createElement('span');
    el.className = 'skel' + (variante ? ' skel--' + variante : '');
    if (largeur) el.style.width = largeur;
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  function squelettePoste(lignes) {
    const bloc = document.createElement('div');
    bloc.className = 'exp-poste';
    const largeurs = ['62%', '84%', '48%'];
    for (let i = 0; i < lignes; i++) {
      const ligne = document.createElement('div');
      ligne.className = 'exp-poste__ligne';
      ligne.appendChild(squelette('label', '30%'));
      ligne.appendChild(squelette('champ', largeurs[i % largeurs.length]));
      bloc.appendChild(ligne);
    }
    return bloc;
  }

  function attendre(host, ...contenu) {
    if (!host) return;
    host.setAttribute('aria-busy', 'true');
    host.replaceChildren(...contenu);
  }

  function libere(host) {
    if (host) host.removeAttribute('aria-busy');
  }

  /* Panneaux dépendant de la fiche contrat : rejoués à chaque téléchargement
     de compagnie. */
  function squelettesContrat() {
    attendre($('exp-libelle'), squelette('champ', '70%'));
    attendre($('exp-capitaux'), squelettePoste(3), squelettePoste(3));
    attendre($('exp-frais'), squelettePoste(2));
    attendre($('exp-source'), squelette('label', '26%'), squelette('texte', '80%'));
    libere($('exp-vigilance'));
    $('exp-vigilance').replaceChildren();
  }

  function squelettesInitiaux() {
    CHAMPS_COMBO.forEach((id) => attendre($(id), squelette('champ')));
    squelettesContrat();
    attendre($('exp-dommages'), squelette('bloc'));
    attendre($('exp-causes'), squelette('texte', '96%'), squelette('texte', '88%'), squelette('texte', '54%'));
  }

  function pileVide(host) {
    host.replaceChildren();
    const p = document.createElement('p');
    p.className = 'muted small';
    p.textContent = '—';
    host.appendChild(p);
  }

  /* Vocabulaire de qualité des données (data/expertise.json → statutsQualite). */
  const LIBELLES_STATUT = {
    verifie: 'vérifié',
    source_secondaire: 'source secondaire',
    deduit: 'déduit',
    a_verifier: 'à vérifier',
  };

  /* Champs facultatifs de capital.details, dans l'ordre d'affichage. */
  const DETAIL_CAPITAL = [
    ['base', 'Base d’évaluation'],
    ['premierReglement', 'Premier règlement'],
    ['complement', 'Complément'],
    ['plafond', 'Plafond'],
    ['versement', 'Versement'],
    ['delaiReconstruction', 'Délai'],
    ['conditions', 'Conditions'],
    ['surJustificatifs', 'Sur justificatifs'],
  ];

  /* Champs facultatifs portés directement par un frais. */
  const DETAIL_FRAIS = [
    ['base', 'Base de calcul'],
    ['pourcentage', 'Pourcentage'],
    ['plafond', 'Plafond'],
    ['minimum', 'Minimum'],
    ['maximum', 'Maximum'],
    ['conditions', 'Conditions'],
    ['observations', 'Observations'],
  ];

  function valeurLisible(v) {
    if (v === true) return 'oui';
    if (v === false) return 'non';
    if (typeof v === 'number') return String(v);
    const t = String(v == null ? '' : v).trim();
    return t;
  }

  function badgeStatut(statut) {
    const libelle = LIBELLES_STATUT[statut];
    if (!libelle) return null;
    const el = document.createElement('span');
    el.className = 'exp-statut exp-statut--' + statut;
    el.textContent = libelle;
    return el;
  }

  function blocDetail(source, champs) {
    const lignes = champs
      .map(([cle, etiquette]) => [etiquette, valeurLisible(source[cle])])
      .filter(([, valeur]) => valeur !== '');
    if (!lignes.length) return null;

    const pli = document.createElement('details');
    pli.className = 'exp-detail';
    const titre = document.createElement('summary');
    titre.textContent = 'Détail contractuel';
    pli.appendChild(titre);

    const dl = document.createElement('dl');
    dl.className = 'exp-detail__liste';
    lignes.forEach(([etiquette, valeur]) => {
      const dt = document.createElement('dt');
      dt.textContent = etiquette;
      const dd = document.createElement('dd');
      dd.textContent = valeur;
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    pli.appendChild(dl);
    return pli;
  }

  function renderPile(host, postes, champs, detailsFrais) {
    libere(host);
    host.replaceChildren();
    if (!postes || !postes.length) {
      pileVide(host);
      return;
    }
    postes.forEach((poste) => {
      const bloc = document.createElement('div');
      bloc.className = 'exp-poste';
      champs.forEach(([cle, etiquette]) => {
        const ligne = document.createElement('div');
        ligne.className = 'exp-poste__ligne';
        const dt = document.createElement('span');
        dt.className = 'exp-poste__label';
        dt.textContent = etiquette;
        const dd = document.createElement('output');
        dd.className = 'field__input calcule';
        dd.textContent = poste[cle] || '—';
        ligne.appendChild(dt);
        ligne.appendChild(dd);
        bloc.appendChild(ligne);
      });

      const badge = badgeStatut(poste.statut);
      if (badge) bloc.appendChild(badge);

      const detail = detailsFrais
        ? blocDetail(poste, DETAIL_FRAIS)
        : poste.details && blocDetail(poste.details, DETAIL_CAPITAL);
      if (detail) bloc.appendChild(detail);

      if (poste.remarque) {
        const note = document.createElement('p');
        note.className = 'exp-poste__note';
        note.textContent = poste.remarque;
        bloc.appendChild(note);
      }

      host.appendChild(bloc);
    });
  }

  function renderMotif(issue) {
    const host = $('exp-motif');
    const motif = issue.statut === 'ok' ? '' : issue.motif || '';
    host.textContent = motif;
    host.hidden = !motif;
  }

  function renderSource(issue) {
    const host = $('exp-source');
    libere(host);
    host.replaceChildren();

    const fiche = issue.contrat;
    if (!fiche) return;

    const entete = document.createElement('div');
    entete.className = 'exp-source__entete';
    const titre = document.createElement('span');
    titre.className = 'exp-poste__label';
    titre.textContent = 'Source contractuelle';
    entete.appendChild(titre);
    const badge = badgeStatut(issue.qualite);
    if (badge) entete.appendChild(badge);
    host.appendChild(entete);

    const src = issue.source;
    const corps = document.createElement('p');
    corps.className = 'exp-source__corps';
    if (src) {
      const parts = [src.document, src.reference, src.edition ? 'éd. ' + src.edition : ''].filter(Boolean);
      corps.textContent = parts.join(' — ');
      if (src.url) {
        const lien = document.createElement('a');
        lien.href = src.url;
        lien.target = '_blank';
        lien.rel = 'noopener noreferrer';
        lien.textContent = src.hote || 'document';
        corps.appendChild(document.createTextNode(' · '));
        corps.appendChild(lien);
      }
      if (src.verifieLe) {
        const meta = document.createElement('span');
        meta.className = 'exp-source__meta';
        meta.textContent = ' · vérifié le ' + E.formaterDate(src.verifieLe);
        corps.appendChild(meta);
      }
    } else {
      corps.textContent = 'Aucune source consignée pour cette fiche.';
      corps.classList.add('exp-source__corps--absente');
    }
    host.appendChild(corps);

    (issue.remarques || []).forEach((texte) => {
      const note = document.createElement('p');
      note.className = 'exp-source__remarque';
      note.textContent = texte;
      host.appendChild(note);
    });
  }

  function renderVigilance(issue) {
    const host = $('exp-vigilance');
    host.replaceChildren();
    const points = issue.pointsVigilance || [];
    if (!points.length) return;

    const titre = document.createElement('p');
    titre.className = 'exp-poste__label';
    titre.textContent = 'Points de vigilance';
    host.appendChild(titre);

    const ul = document.createElement('ul');
    ul.className = 'exp-vigilance__liste';
    points.forEach((point) => {
      const li = document.createElement('li');
      li.textContent = typeof point === 'string' ? point : point.texte || '';
      if (point && point.page) {
        const meta = document.createElement('span');
        meta.className = 'exp-source__meta';
        meta.textContent = ' (p. ' + point.page + ')';
        li.appendChild(meta);
      }
      ul.appendChild(li);
    });
    host.appendChild(ul);
  }

  /* Phrases copiables : les mêmes cartes que la page Phrases type. */
  function renderCopies(host, phrases) {
    libere(host);
    host.replaceChildren();
    (phrases || []).forEach((texte) => {
      if (!texte) return;
      host.appendChild(window.COPIE.carte(texte));
    });
  }

  function texteCopiable(s) {
    const t = String(s || '').trim();
    return t !== '' && t !== '—';
  }

  /* Champs calculés : mêmes bouton, coche et clic sur toute la surface que les
     cartes de la page Phrases type. Le texte est relu à chaque clic, le champ
     changeant de contenu au fil de la saisie. */
  function armerCalcule(el) {
    if (!el || el.closest('.calcule-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'calcule-wrap';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    const declencheur = window.COPIE.bouton(() => el.textContent, {
      classe: 'calcule-copy',
      libelle: 'Copier le champ',
      hote: wrap,
    });
    wrap.appendChild(declencheur);
    window.COPIE.rendreCliquable(wrap, declencheur);
  }

  function syncCopiesCalcule() {
    document.querySelectorAll('.page-expertise .calcule').forEach((el) => {
      armerCalcule(el);
      const wrap = el.closest('.calcule-wrap');
      if (!wrap) return;
      const ok = texteCopiable(el.textContent);
      wrap.classList.toggle('has-texte', ok);
      const btn = wrap.querySelector('.calcule-copy');
      if (btn) btn.tabIndex = ok ? 0 : -1;
    });
  }

  function renderDommages() {
    const nature = $('exp-nature').value;
    const host = $('exp-dommages');
    if (!nature) {
      host.replaceChildren();
      natureDommages = '';
      return;
    }
    if (nature === natureDommages && host.children.length) return;
    natureDommages = nature;
    const modele = E.modelePour(db, nature);
    const texte = typeof modele.dommages === 'string' ? modele.dommages : '';
    renderCopies(host, texte ? [texte] : []);
  }

  function renderTextes() {
    if (!db) return;
    libere($('exp-causes'));
    const modele = E.modelePour(db, $('exp-nature').value);
    ajusterChampsModele(modele);
    $('exp-causes').textContent = E.interpoler(modele.causesCirconstances, champsTexte());
    syncCopiesCalcule();
  }

  /* ---------------------------------------------------------------------------
     Chargement paresseux : une compagnie, un fichier. La promesse mémorisée
     sert à la fois de cache et de dédoublonnage des appels concurrents.
     --------------------------------------------------------------------------- */

  const BASE_DONNEES = 'data/';
  const paquets = new Map();
  const echoues = new Set();

  function chargerJson(chemin) {
    return fetch(BASE_DONNEES + chemin, { cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function signaler(message) {
    const zone = $('exp-erreur');
    zone.hidden = !message;
    zone.textContent = message || '';
  }

  function chargerCompagnie(compagnie) {
    if (!compagnie || echoues.has(compagnie)) return Promise.resolve(false);
    if (paquets.has(compagnie)) return paquets.get(compagnie);

    const fichier = E.fichierCompagnie(db, compagnie);
    /* Compagnie du référentiel sans fiche : rien à télécharger, et il ne faut
       pas retenter à chaque rendu. */
    if (!fichier) {
      const rien = Promise.resolve(false);
      paquets.set(compagnie, rien);
      return rien;
    }

    const attente = chargerJson(fichier).then(
      (paquet) => {
        db = E.fusionner(db, paquet);
        signaler('');
        return true;
      },
      (err) => {
        echoues.add(compagnie);
        /* Un paquet vide retire les amorces de l'index : la résolution répond
           alors « numéro non référencé » au lieu de rester en chargement. */
        db = E.fusionner(db, { compagnie: compagnie, contrats: [] });
        signaler('Impossible de charger les fiches ' + compagnie + ' (' + err.message + ').');
        return false;
      }
    );
    paquets.set(compagnie, attente);
    return attente;
  }

  /* Relance un rendu quand la compagnie est arrivée — ou quand elle a échoué,
     ses amorces ayant alors disparu. Dans les deux cas la branche
     « chargement » n'est plus atteinte : pas de boucle. */
  function demanderCompagnie(compagnie) {
    chargerCompagnie(compagnie).then(render);
  }

  function render() {
    if (!db || !E) return;
    if (combos.numero) {
      combos.numero.setItems(E.numerosPour(db, $('exp-compagnie').value, $('exp-type').value, $('exp-nature').value));
    }
    const s = saisie();
    if (combos.option) {
      combos.option.setItems(E.optionsPour(db, s.compagnie, s.typeContrat, s.numero, s.nature));
    }

    const issue = E.resoudre(db, s);

    /* La fiche existe à l'index mais son fichier n'est pas là : on affiche des
       squelettes plutôt qu'un « numéro non référencé » mensonger. */
    if (issue.statut === 'chargement') {
      squelettesContrat();
      renderMotif(issue);
      renderDommages();
      renderTextes();
      demanderCompagnie(issue.compagnie);
      return;
    }

    /* « documente » : la référence est identifiée, seul le régime manque. */
    const identifie = issue.statut === 'ok' || issue.statut === 'documente';
    libere($('exp-libelle'));
    $('exp-libelle').textContent = identifie ? issue.libelle : '—';

    const champsCapitaux = [
      ['nature', 'Nature'],
      ['capital', 'Capital'],
      ['modalite', 'Modalité'],
    ];
    const champsFrais = [
      ['type', 'Type de frais'],
      ['limitation', 'Limitation'],
    ];

    if (issue.statut === 'ok') {
      renderPile($('exp-capitaux'), issue.capitaux, champsCapitaux);
      renderPile($('exp-frais'), issue.frais, champsFrais, true);
    } else {
      renderPile($('exp-capitaux'), [], champsCapitaux);
      renderPile($('exp-frais'), [], champsFrais, true);
    }

    renderMotif(issue);
    renderSource(issue);
    renderVigilance(issue);
    renderDommages();
    renderTextes();
    syncCopiesCalcule();
  }

  ['exp-nom', 'exp-adresse', 'exp-commune', 'exp-date', 'exp-sinistre-debut', 'exp-sinistre-fin', 'exp-tempete', 'exp-vent'].forEach(
    (id) => {
      $(id).addEventListener('input', renderTextes);
    }
  );

  function comboVide(libelle) {
    return { value: '', label: libelle };
  }

  squelettesInitiaux();

  chargerJson('expertise.json')
    .then((json) => {
      db = E.preparer(json);
      const choisir = comboVide('Choisir…');
      combos.nature = creerCombo($('combo-nature'), {
        hidden: $('exp-nature'),
        vide: choisir,
        placeholder: 'Choisir…',
        onChange: render,
      });
      combos.compagnie = creerCombo($('combo-compagnie'), {
        hidden: $('exp-compagnie'),
        vide: choisir,
        placeholder: 'Choisir…',
        /* Le fichier de la compagnie est demandé dès son choix, sans attendre
           qu'un numéro soit saisi. */
        onChange: function (compagnie) {
          render();
          chargerCompagnie(compagnie).then(render);
        },
      });
      combos.type = creerCombo($('combo-type'), {
        hidden: $('exp-type'),
        vide: choisir,
        placeholder: 'Choisir…',
        onChange: render,
      });
      combos.numero = creerCombo($('combo-numero'), {
        hidden: $('exp-numero'),
        placeholder: 'Rechercher…',
        onChange: function () {
          const numero = $('exp-numero').value;
          if (numero && db) {
            const hits = (db.contrats || []).filter((c) => c.numero === numero);
            if (hits.length === 1) {
              if (!$('exp-compagnie').value) combos.compagnie.setValue(hits[0].compagnie);
              if (!$('exp-type').value) combos.type.setValue(hits[0].typeContrat);
            }
          }
          render();
        },
      });
      combos.option = creerCombo($('combo-option'), {
        hidden: $('exp-option'),
        vide: comboVide('—'),
        placeholder: '—',
        onChange: render,
      });
      combos.civilite = creerCombo($('combo-civilite'), {
        hidden: $('exp-civilite'),
        vide: choisir,
        placeholder: 'Choisir…',
        onChange: renderTextes,
      });
      combos.qualite = creerCombo($('combo-qualite'), {
        hidden: $('exp-qualite'),
        vide: choisir,
        placeholder: 'Choisir…',
        onChange: renderTextes,
      });
      combos.bien = creerCombo($('combo-bien'), {
        hidden: $('exp-bien'),
        vide: choisir,
        placeholder: 'Choisir…',
        onChange: renderTextes,
      });
      combos.alentour = creerCombo($('combo-alentour'), {
        hidden: $('exp-alentour'),
        vide: choisir,
        placeholder: 'Choisir…',
        onChange: renderTextes,
      });
      combos.nature.setItems(trierAlpha(json.natures));
      combos.compagnie.setItems(trierAlpha(json.compagnies));
      combos.type.setItems(trierAlpha(json.typesContrat));
      combos.civilite.setItems(json.civilites);
      combos.qualite.setItems(json.qualites);
      combos.bien.setItems(json.typesBien);
      combos.alentour.setItems(['oui', 'non']);
      /* La tempête en cours est préremplie depuis le référentiel : à mettre à
         jour dans data/expertise.json à chaque nouvel épisode nommé. */
      const defauts = json.valeursParDefaut || {};
      if (defauts.tempete) $('exp-tempete').value = defauts.tempete;
      render();
    })
    .catch((err) => {
      CHAMPS_COMBO.forEach((id) => {
        libere($(id));
        $(id).replaceChildren();
      });
      ['exp-libelle', 'exp-capitaux', 'exp-frais', 'exp-source', 'exp-dommages', 'exp-causes'].forEach(
        (id) => {
          libere($(id));
          $(id).replaceChildren();
        }
      );
      signaler('Impossible de charger le référentiel des contrats (' + err.message + ').');
    });
})();
