/* ---------------------------------------------------------------------------
   Formulaire d'expertise : saisie → résolution JSON → champs calculés.
   --------------------------------------------------------------------------- */

(function () {
  'use strict';

  const E = window.EXPERTISE;
  const $ = (id) => document.getElementById(id);

  let db = null;
  let natureDommages = '';
  let verifCie = '';
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
    return {
      civilite: $('exp-civilite').value,
      nom: $('exp-nom').value,
      adresse: $('exp-adresse').value,
      commune: $('exp-commune').value,
      date: E.formaterDate($('exp-date').value) || $('exp-date').value,
      qualite: $('exp-qualite').value,
      typeBien: $('exp-bien').value,
      nature: $('exp-nature').value,
      compagnie: $('exp-compagnie').value,
    };
  }

  function pileVide(host) {
    host.replaceChildren();
    const p = document.createElement('p');
    p.className = 'muted small';
    p.textContent = '—';
    host.appendChild(p);
  }

  function renderPile(host, postes, champs) {
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
      host.appendChild(bloc);
    });
  }

  function renderCopies(host, phrases) {
    host.replaceChildren();
    (phrases || []).forEach((texte) => {
      if (!texte) return;
      const bloc = document.createElement('div');
      bloc.className = 'exp-copie';
      bloc.textContent = texte;
      bloc.title = 'Cliquer pour copier';
      bloc.tabIndex = 0;
      bloc.addEventListener('click', () => copierTexte(texte, bloc));
      bloc.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          copierTexte(texte, bloc);
        }
      });
      host.appendChild(bloc);
    });
  }

  function texteCopiable(s) {
    const t = String(s || '').trim();
    return t !== '' && t !== '—';
  }

  function boutonCopiePour(cible) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'calcule-copy';
    b.setAttribute('aria-label', 'Copier');
    b.title = 'Copier';
    b.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    b.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const t = (cible.textContent || '').trim();
      if (!texteCopiable(t)) return;
      copierTexte(t, b);
    });
    return b;
  }

  function armerCalcule(el) {
    if (!el || el.closest('.calcule-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'calcule-wrap';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    wrap.appendChild(boutonCopiePour(el));
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

  function copierTexte(texte, el) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) return;
    navigator.clipboard.writeText(texte).then(
      () => {
        if (!el) return;
        el.classList.add('is-copied');
        setTimeout(() => el.classList.remove('is-copied'), 1200);
      },
      () => {}
    );
  }

  function renderVerif() {
    const cie = $('exp-compagnie').value;
    const host = $('exp-verif-liste');
    if (!cie) {
      host.replaceChildren();
      verifCie = '';
      return;
    }
    if (cie === verifCie && host.children.length) return;
    verifCie = cie;
    renderCopies(host, E.verificationsPour(db, cie));
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
    const modele = E.modelePour(db, $('exp-nature').value);
    $('exp-causes').textContent = E.interpoler(modele.causesCirconstances, champsTexte());
    syncCopiesCalcule();
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
    $('exp-libelle').textContent = issue.statut === 'ok' ? issue.libelle : '—';

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
      renderPile($('exp-frais'), issue.frais, champsFrais);
    } else {
      renderPile($('exp-capitaux'), [], champsCapitaux);
      renderPile($('exp-frais'), [], champsFrais);
    }

    renderVerif();
    renderDommages();
    renderTextes();
    syncCopiesCalcule();
  }

  ['exp-nom', 'exp-adresse', 'exp-commune', 'exp-date'].forEach((id) => {
    $(id).addEventListener('input', renderTextes);
  });

  function comboVide(libelle) {
    return { value: '', label: libelle };
  }

  fetch('data/expertise.json', { cache: 'no-store' })
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then((json) => {
      db = json;
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
        onChange: render,
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
      combos.nature.setItems(trierAlpha(json.natures));
      combos.compagnie.setItems(trierAlpha(json.compagnies));
      combos.type.setItems(trierAlpha(json.typesContrat));
      combos.civilite.setItems(json.civilites);
      combos.qualite.setItems(json.qualites);
      combos.bien.setItems(json.typesBien);
      render();
    })
    .catch(() => {
      const zone = $('exp-erreur');
      zone.hidden = false;
      zone.textContent = 'Impossible de charger les fiches contrat.';
    });
})();
