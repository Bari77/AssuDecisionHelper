/* ---------------------------------------------------------------------------
   Moteur de résolution des fiches contrat.

   Entrée : compagnie + type de contrat + numéro + option (+ nature, optionnelle).
   Sortie : libellé calculé, capitaux, frais.

   Sans DOM, donc testable. La base vit dans data/expertise.json.
   --------------------------------------------------------------------------- */

(function (global) {
  'use strict';

  function normaliserTexte(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function normaliserNumero(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function optionEstVide(s) {
    const n = normaliserTexte(s);
    return !n || n === 'option';
  }

  function compagniesOk(contrat, compagnie) {
    if (!compagnie || !contrat.compagnie) return false;
    return normaliserTexte(contrat.compagnie) === normaliserTexte(compagnie);
  }

  function scoreNumero(saisi, contrat) {
    const a = normaliserNumero(saisi);
    const b = normaliserNumero(contrat.numero);
    if (!a || !b) return 0;
    if (a === b) return 1000 + b.length;
    if (b.startsWith(a) || a.startsWith(b)) return 100 + Math.min(a.length, b.length);
    if (b.includes(a) || a.includes(b)) return 10 + Math.min(a.length, b.length);
    return 0;
  }

  function naturesOk(contrat, nature) {
    if (!contrat.natures || !contrat.natures.length) return true;
    if (!nature) return true;
    return contrat.natures.indexOf(nature) !== -1;
  }

  function trouverOption(fiche, optionSaisie) {
    const options = fiche.options || [];
    if (!options.length) return null;
    if (optionEstVide(optionSaisie)) {
      return options.find((o) => optionEstVide(o.libelle)) || null;
    }
    const cible = normaliserTexte(optionSaisie);
    return options.find((o) => normaliserTexte(o.libelle) === cible) || null;
  }

  function filtrerContrats(db, saisie) {
    const liste = (db && db.contrats) || [];
    return liste.filter((c) => {
      if (saisie.compagnie && !compagniesOk(c, saisie.compagnie)) return false;
      if (saisie.typeContrat && c.typeContrat !== saisie.typeContrat) return false;
      if (!naturesOk(c, saisie.nature)) return false;
      return true;
    });
  }

  function resoudre(db, saisie) {
    const s = saisie || {};
    if (!s.compagnie || !s.typeContrat) {
      return { statut: 'incomplet', motif: 'Choisir la compagnie et le type de contrat.' };
    }

    const vivier = filtrerContrats(db, s);
    if (!vivier.length) {
      return { statut: 'inconnu', motif: 'Aucune fiche pour cette compagnie et ce type de contrat.' };
    }

    if (!normaliserNumero(s.numero)) {
      return {
        statut: 'incomplet',
        motif: 'Saisir le numéro ou la formule du contrat pour calculer les capitaux.',
        numeros: numerosPour(db, s.compagnie, s.typeContrat, s.nature),
      };
    }

    const notes = vivier
      .map((contrat) => ({ contrat, score: scoreNumero(s.numero, contrat) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!notes.length) {
      return {
        statut: 'inconnu',
        motif: 'Numéro de contrat non référencé pour cette compagnie.',
        numeros: numerosPour(db, s.compagnie, s.typeContrat, s.nature),
      };
    }

    if (notes.length > 1 && notes[0].score === notes[1].score) {
      return {
        statut: 'ambigu',
        motif: 'Plusieurs formules correspondent à ce numéro. Préciser le millésime.',
        numeros: notes.filter((n) => n.score === notes[0].score).map((n) => n.contrat.numero),
      };
    }

    const fiche = notes[0].contrat;
    const option = trouverOption(fiche, s.option);
    if (!option) {
      return {
        statut: 'inconnu',
        motif: 'Option non référencée pour cette formule.',
        contrat: fiche,
        options: (fiche.options || []).map((o) => o.libelle || ''),
      };
    }

    return {
      statut: 'ok',
      contrat: fiche,
      option: option,
      libelle: fiche.libelle,
      capitaux: option.capitaux || [],
      frais: option.frais || [],
    };
  }

  function numerosPour(db, compagnie, typeContrat, nature) {
    return filtrerContrats(db, { compagnie, typeContrat, nature }).map((c) => c.numero);
  }

  function optionsPour(db, compagnie, typeContrat, numero, nature) {
    const issue = resoudre(db, { compagnie, typeContrat, numero, nature, option: '' });
    const fiche = issue.contrat || (issue.statut === 'ok' ? issue.contrat : null);
    if (fiche && fiche.options) return fiche.options.map((o) => o.libelle || '');
    const vivier = filtrerContrats(db, { compagnie, typeContrat, nature });
    if (numero) {
      const notes = vivier
        .map((c) => ({ c, score: scoreNumero(numero, c) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);
      if (notes[0] && notes[0].c.options) return notes[0].c.options.map((o) => o.libelle || '');
    }
    const toutes = [];
    vivier.forEach((c) => {
      (c.options || []).forEach((o) => {
        const l = o.libelle || '';
        if (toutes.indexOf(l) === -1) toutes.push(l);
      });
    });
    return toutes;
  }

  function modelePour(db, nature) {
    const modeles = (db && db.modeles) || {};
    return modeles[nature] || modeles._defaut || { causesCirconstances: '', dommages: '' };
  }

  function interpoler(modele, champs) {
    const vars = champs || {};
    return String(modele || '').replace(/\{\{(\w+)\}\}/g, function (_, cle) {
      const v = vars[cle];
      if (v == null || String(v).trim() === '') return '[' + cle + ']';
      return String(v).trim();
    });
  }

  function formaterDate(valeur) {
    if (!valeur) return '';
    const m = String(valeur).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return String(valeur);
    const mois = [
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
    ];
    return parseInt(m[3], 10) + ' ' + mois[parseInt(m[2], 10) - 1] + ' ' + m[1];
  }

  function verificationsPour(db, compagnie) {
    const bloc = (db && db.verificationsRisque) || {};
    if (compagnie && Array.isArray(bloc[compagnie]) && bloc[compagnie].length) {
      return bloc[compagnie].slice();
    }
    return Array.isArray(bloc._defaut) ? bloc._defaut.slice() : [];
  }

  global.EXPERTISE = {
    resoudre: resoudre,
    numerosPour: numerosPour,
    optionsPour: optionsPour,
    modelePour: modelePour,
    interpoler: interpoler,
    formaterDate: formaterDate,
    normaliserNumero: normaliserNumero,
    optionEstVide: optionEstVide,
    verificationsPour: verificationsPour,
  };
})(typeof window !== 'undefined' ? window : global);
