/* ---------------------------------------------------------------------------
   Moteur de résolution des fiches contrat.

   Entrée : compagnie + type de contrat + numéro + option (+ nature, optionnelle).
   Sortie : libellé calculé, capitaux, frais.

   Sans DOM, donc testable. Le référentiel vit dans data/expertise.json ; les
   fiches contrat vivent dans data/compagnies/<compagnie>.json et arrivent au
   fil du besoin. Tant qu'un fichier de compagnie n'est pas arrivé, ses fiches
   sont représentées par des amorces issues de l'index : elles suffisent à
   proposer le numéro et à deviner la compagnie, et la résolution répond
   « chargement » plutôt que « inconnu ».
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

  /* ---------------------------------------------------------------------------
     Héritage. Un fichier de compagnie ne répète jamais ce que dit son parent :

       compagnie         écrite en tête du fichier, servie à toutes ses fiches
       statut, sourceRef descendent de la fiche vers ses options, puis de
                         l'option vers chacun de ses postes
       libelle           calculé « compagnie - type - numéro » s'il n'est pas
                         écrit

     Un champ écrit l'emporte toujours sur celui du parent.

     N'héritent volontairement PAS : typeContrat et nomContrat. Ils décrivent le
     produit, pas l'assureur ; un même fichier finira par porter une MRH et une
     MRP. Un défaut d'en-tête y serait silencieusement faux, alors qu'un champ
     manquant est refusé par le test. Chaque fiche déclare donc son type.

     Tout se joue ici : la résolution, elle, voit des fiches complètes.
     --------------------------------------------------------------------------- */

  function heriter(objet, defauts) {
    const sortie = Object.assign({}, objet);
    Object.keys(defauts).forEach(function (cle) {
      if (sortie[cle] == null && defauts[cle] != null) sortie[cle] = defauts[cle];
    });
    return sortie;
  }

  function libelleParDefaut(fiche) {
    return [fiche.compagnie, fiche.typeContrat, fiche.numero].filter(Boolean).join(' - ');
  }

  function completerFiche(fiche, entete) {
    const complete = heriter(fiche, { compagnie: entete.compagnie });
    if (!complete.libelle) complete.libelle = libelleParDefaut(complete);

    complete.options = (fiche.options || []).map(function (option) {
      const o = heriter(option, { statut: complete.statut, sourceRef: complete.sourceRef });
      /* Le statut qualifie chaque poste dans l'interface : il descend jusque-là.
         La source, elle, est lue au niveau de l'option par resoudre(). */
      const posteHerite = { statut: o.statut };
      if (option.capitaux) o.capitaux = option.capitaux.map((c) => heriter(c, posteHerite));
      if (option.frais) o.frais = option.frais.map((f) => heriter(f, posteHerite));
      return o;
    });
    return complete;
  }

  /* Fiches d'un fichier de compagnie, complétées. Fonctionne aussi sur le
     référentiel, dont l'en-tête ne porte pas de compagnie : chaque fiche
     déclare alors la sienne. */
  function completerPaquet(paquet) {
    const entete = paquet || {};
    return (entete.contrats || []).map((fiche) => completerFiche(fiche, entete));
  }

  function cleFiche(fiche) {
    return normaliserTexte(fiche.compagnie) + '|' + fiche.typeContrat + '|' + normaliserNumero(fiche.numero);
  }

  /* Amorces : les clés de recherche d'une compagnie dont le fichier n'est pas
     encore arrivé. Elles ne portent aucun régime, seulement de quoi être
     trouvées. */
  function amorces(db) {
    const index = (db && db.fichesParCompagnie) || {};
    const liste = [];
    Object.keys(index).forEach(function (compagnie) {
      (index[compagnie].references || []).forEach(function (ref) {
        liste.push({
          compagnie: compagnie,
          typeContrat: ref.typeContrat,
          numero: ref.numero,
          differe: true,
        });
      });
    });
    return liste;
  }

  /* Base de départ : référentiel + amorces de l'index. Les fiches écrites en
     dur dans le référentiel, s'il y en a, sont conservées. */
  function preparer(referentiel) {
    const base = Object.assign({}, referentiel);
    const propres = completerPaquet(referentiel);
    const vues = new Set(propres.map(cleFiche));
    base.contrats = propres.concat(amorces(base).filter((a) => !vues.has(cleFiche(a))));
    base.sources = Object.assign({}, (referentiel && referentiel.sources) || {});
    return base;
  }

  /* Intègre un fichier de compagnie : ses fiches remplacent les amorces (et
     toute version antérieure) de la même compagnie. Renvoie une nouvelle base,
     l'ancienne n'est pas modifiée. */
  function fusionner(db, paquet) {
    if (!paquet || !paquet.compagnie) return db;
    const cible = normaliserTexte(paquet.compagnie);
    const arrivantes = completerPaquet(paquet);
    const remplacees = new Set(arrivantes.map(cleFiche));

    const contrats = (db.contrats || [])
      .filter(function (fiche) {
        if (normaliserTexte(fiche.compagnie) !== cible) return true;
        /* Une amorce de cette compagnie disparaît ; une fiche écrite en dur
           dans le référentiel ne survit que si le paquet ne la redéfinit pas. */
        return !fiche.differe && !remplacees.has(cleFiche(fiche));
      })
      .concat(arrivantes);

    return Object.assign({}, db, {
      contrats: contrats,
      sources: Object.assign({}, db.sources || {}, paquet.sources || {}),
      compagniesChargees: (db.compagniesChargees || []).concat([paquet.compagnie]),
    });
  }

  function fichierCompagnie(db, compagnie) {
    const index = (db && db.fichesParCompagnie) || {};
    const cible = normaliserTexte(compagnie);
    const nom = Object.keys(index).find((c) => normaliserTexte(c) === cible);
    return nom ? index[nom].fichier || null : null;
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

    if (fiche.differe) {
      return {
        statut: 'chargement',
        motif: 'Fiche contrat en cours de téléchargement…',
        compagnie: fiche.compagnie,
        fichier: fichierCompagnie(db, fiche.compagnie),
      };
    }

    if (!(fiche.options || []).length) {
      return {
        statut: 'documente',
        motif: "Référence identifiée, mais aucun régime d'indemnisation n'est documenté à ce jour.",
        contrat: fiche,
        libelle: fiche.libelle,
        options: [],
        capitaux: [],
        frais: [],
        source: sourcePour(db, fiche.sourceRef),
        remarques: remarquesDe(fiche, null),
        pointsVigilance: fiche.pointsVigilance || [],
        qualite: fiche.statut || '',
      };
    }

    const option = trouverOption(fiche, s.option);
    if (!option) {
      return {
        statut: 'inconnu',
        motif: 'Option non référencée pour cette formule.',
        contrat: fiche,
        options: (fiche.options || []).map((o) => o.libelle || ''),
        source: sourcePour(db, fiche.sourceRef),
        remarques: remarquesDe(fiche, null),
        qualite: fiche.statut || '',
      };
    }

    return {
      statut: 'ok',
      contrat: fiche,
      option: option,
      libelle: fiche.libelle,
      capitaux: option.capitaux || [],
      frais: option.frais || [],
      source: sourcePour(db, option.sourceRef || fiche.sourceRef),
      remarques: remarquesDe(fiche, option),
      pointsVigilance: fiche.pointsVigilance || [],
      qualite: option.statut || fiche.statut || '',
    };
  }

  /* Table sources : une fiche, une option, un capital ou un frais porte une clé
     sourceRef ; les fiches antérieures n'en portent aucune et remontent null. */
  function sourcePour(db, ref) {
    if (!ref) return null;
    const table = (db && db.sources) || {};
    const source = table[ref];
    if (!source) return null;
    return Object.assign({ id: ref }, source);
  }

  function remarquesDe(fiche, option) {
    const liste = [].concat(fiche.remarques || []);
    if (option && option.remarque) liste.push(option.remarque);
    return liste;
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
    sourcePour: sourcePour,
    preparer: preparer,
    fusionner: fusionner,
    fichierCompagnie: fichierCompagnie,
    completerPaquet: completerPaquet,
  };
})(typeof window !== 'undefined' ? window : global);
